# AUDIT — Audit thématique du codebase Terrassea Hub

**Date début :** 2026-04-29
**Auditeur :** Claude Code (Opus 4.7, 1M context)
**Branche :** `main`
**Statut :** ÉTAPE 2 en cours — au fil de l'eau, écriture in-place
**Companion docs :** `RECON.md`, `STRATEGIC_DECISIONS.md`, `HOTFIX_RLS_PROSPECTS.md`

---

## Conventions de cet audit

- **Sévérités** : Critique (faille active, fuite possible) / Élevée (dette qui ralentit Phase 1, performance dégradée) / Moyenne (maintenabilité, bugs latents) / Basse (cosmétique).
- **Format** : pour chaque thème — État observé / Problèmes (table sévérité avec `fichier:lignes`) / Points forts / Recommandations priorisées.
- **À confirmer founder** : marqué `[?]` quand ambiguïté entre intentionnel et oubli.

---

## Corrections appliquées AVANT le début de l'audit thématique

| Date | Fix | Migration / commit |
|---|---|---|
| 2026-04-29 | Hotfix RLS sur 3 tables `*_prospects` (admin-only) | `20260429120000_enable_rls_prospects_admin_only.sql` / `a9ca964` |
| 2026-04-29 | Alignment `supabase/config.toml` sur le bon `project_id` prod | `605f106` |

---

## 1. Sécurité

### État observé

- **66 tables `public`** (65 tables physiques + 1 vue matérialisée `product_review_stats`). **Toutes les 65 tables physiques ont RLS activée** (`pg_class.relrowsecurity = true`). 203 policies sur 65 tables (≈ 3 policies/table).
- **23 fonctions SECURITY DEFINER** dans le schéma `public`, **toutes ont `search_path=public` configuré** (durci correctement).
- **1 fonction INVOKER** sans `search_path` : `update_product_review_timestamp` — déclenchée par l'advisor `function_search_path_mutable`.
- **4 storage buckets** : `mood-images` (private), `product-images` (PUBLIC), `quote-documents` (private, 10 MB, PDF only), `quotedocuments` (private, doublon avec `quote-documents`).
- **`auth` config (`src/integrations/supabase/client.ts`)** : `localStorage` storage, `persistSession: true`, `autoRefreshToken: true` — défaut Supabase.
- **`AuthContext`** (`src/contexts/AuthContext.tsx`) : gestion propre PASSWORD_RECOVERY/SIGNED_OUT, fetch profile post-auth, double-effect bootstrap puis subscription.
- **Password policy `Auth.tsx:125-132`** : ≥ 8 caractères, regex `(?=.*[a-z])(?=.*[A-Z])(?=.*\d)` (1 minuscule + 1 majuscule + 1 chiffre exigés).
- **Open redirect protection `Auth.tsx:16-17`** : `isSafeRedirect(path)` vérifie `path.startsWith("/") && !path.startsWith("//") && !path.includes(":")`.
- **SIREN validation côté client `Auth.tsx:77-93`** via `recherche-entreprises.api.gouv.fr` (validation soft, bypassable mais c'est juste UX — vraie validation impossible côté client de toute façon).
- **Edge functions** : 13 fonctions Deno. Toutes utilisent `Deno.env.get()` pour les secrets. Patterns observés :
  - `stripe-webhook` (exemplaire) : vérification HMAC SHA-256 mandatory, idempotency `stripe_payment_id`, atomic update via `is null`, CORS `ALLOWED_ORIGIN`, fail-closed si `STRIPE_WEBHOOK_SECRET` manquant.
  - `analyze-product-image` (exemplaire) : `requireAdmin()` strict (JWT verification + `user_type=admin`), CORS contrôlé, AbortSignal timeout 120 s.
  - `run-scheduled-tasks` (correct) : auth `service_role` only, tâches gardées par feature flags `platform_settings`.
  - `auto-workflow` : patterns OK, n'a pas été lu en intégralité — à approfondir.
- **Git history** : `git log -S` sur `sk_live_|sk_test_|whsec_|service_role|ANTHROPIC_API_KEY` → **0 secret committé**. Le `.env` historiquement committé en `f1bab66` ne contenait que la clé anon publique (par design exposable côté client).
- **CORS** : pattern `ALLOWED_ORIGIN || "https://terrassea.com"` cohérent dans toutes les edge functions.
- **`Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Permissions-Policy`, `Referrer-Policy`** : tous configurés globalement dans `vercel.json`.

### Problèmes identifiés

| Sévérité | Problème | Fichier(s) concerné(s) | Impact |
|---|---|---|---|
| **Critique** [?] | Edge function `send-quote-notification` : fallback hardcodé `TRIGGER_SECRET = "terrassea-trigger-secret-change-me"`. Si la variable d'environnement `TRIGGER_SECRET` n'est **pas configurée** côté Supabase prod, n'importe qui connaissant ce string peut bypass l'auth et déclencher des emails (DB webhook trigger spoofing). À VÉRIFIER founder : la var est-elle bien set en prod ? | `supabase/functions/send-quote-notification/index.ts:7` (et la check `:107`) | Spoofing possible : faux events `INSERT` `quote_requests` ou `partner_applications`, déclenche emails légitimes ou spam vers admin. |
| **Critique** [?] | Edge function `chatbot/` : **dossier VIDE** (pas de fichier `index.ts`). La fonction est listée dans `supabase/functions/` mais sans code source. Soit déployée hors-repo (drift critique repo↔prod), soit cassée (404 silencieux côté chatbot). À VÉRIFIER founder. | `supabase/functions/chatbot/` | Drift code/prod ou feature cassée silencieusement. |
| **Élevée** | Table `salone_2026_visits` : RLS active mais policy `Allow all anon FOR ALL USING (true) WITH CHECK (true)` — équivalent à RLS désactivée. Schéma contient PII : `prenom`, `nom`, `mail`, `poste`, `notes`. Table actuellement vide (0 rows) → risque RGPD futur, pas actuel. | `pg_policies` `salone_2026_visits` | Tout visiteur peut SELECT/INSERT/UPDATE/DELETE anonymement sur cette table dès que des données y seront inscrites. |
| **Élevée** | Storage bucket `product-images` : policies INSERT/UPDATE/DELETE conditionnées juste sur `auth.uid() IS NOT NULL`, sans scoping `owner`/`partner_id`. Tout user authentifié peut **écraser ou supprimer les images d'un autre partenaire**. | `pg_policies` storage.objects (3 policies "Authenticated users can …") | User cross-tenant abuse : un partenaire malveillant peut delete les images du partenaire concurrent. |
| **Élevée** | Storage bucket `mood-images` : SELECT et INSERT sur `auth.uid() IS NOT NULL` sans scoping owner. Tout user authentifié peut lire les mood images d'un autre user. | `pg_policies` storage.objects ("Users can view their own mood images" — le nom contredit la qual qui n'enforce PAS le owner) | Fuite croisée entre comptes utilisateurs. |
| **Moyenne** | Advisor WARN `function_search_path_mutable` : `public.update_product_review_timestamp` (INVOKER, no search_path). Vulnerable au search_path hijacking si appelée dans un context avec un search_path malveillant — risque réel faible (trigger sur table products contrôlée) mais à fix par cohérence. | `pg_proc` `update_product_review_timestamp`, advisor 0011 | Théorique : exécution de code injecté via search_path manipulation. |
| **Moyenne** | Advisor WARN `materialized_view_in_api` : `public.product_review_stats` accessible par les rôles `anon`/`authenticated` via PostgREST. Aucune RLS possible sur les vues matérialisées. À évaluer : data agrégat publiable ou à protéger. | `product_review_stats` view, advisor 0016 | Si la vue contient des données sensibles agrégées (par produit, par partner), exposition non contrôlable via RLS. |
| **Moyenne** | Advisor WARN `rls_policy_always_true` : `concept_events` policy `Anyone can insert concept events` `WITH CHECK true`. Vraisemblablement intentionnel pour analytics anonymes du funnel "concepts". À CONFIRMER founder. Aucune validation de payload ni rate limiting → risque de pollution analytics. | `pg_policies` `concept_events`, advisor 0009 | Spam analytics, distorsion des métriques produit. |
| **Moyenne** | Plusieurs policies INSERT publiques (`WITH CHECK true`) sur tables non-prospects, **toutes légitimes mais sans rate limiting** : `notifications` (TO authenticated), `partner_contact_requests`, `pro_service_requests`, `project_briefs`, `scoring_snapshots`. | `pg_policies` ci-dessus | Pas de fuite — mais possibilité de submit en boucle pour saturer admin notifications, faire DOS soft sur le funnel commercial. |
| **Moyenne** | Bucket `quotedocuments` doublon de `quote-documents`. Pas de policy listée → bloqué par défaut, mais c'est de la confusion. | `storage.buckets` | Confusion code (quel bucket utiliser ?). |
| **Moyenne** | Auth Supabase stocke session dans `localStorage` → **lecture par tout script JS injecté** (XSS). Défaut Supabase, mais pour un B2B avec données partner/quote sensibles, mérite d'évaluer migration vers `cookieStorage` (httpOnly, SameSite=Strict). | `src/integrations/supabase/client.ts:13` | Si XSS via dépendance compromise ou injection user-content non sanitizée → exfiltration token. |
| **Moyenne** | Pas de 2FA / MFA pour les comptes admin. Le founder est seul admin (1 ligne `user_type=admin`). | `Auth.tsx`, `user_profiles` | Compromission du compte founder = compromission complète. |
| **Moyenne** | Pas de captcha (hCaptcha/Turnstile) sur signup, login, ni sur les forms publics (pro_service, project_briefs). | `Auth.tsx`, `BecomePartner.tsx`, etc. | Bot abuse possible : création comptes en masse, spam quote_requests. |
| **Moyenne** | Edge functions avec `|| ""` fallback sur SUPABASE_URL/SERVICE_ROLE_KEY/RESEND_API_KEY (`auto-workflow`, `send-notification-email`, `send-quote-notification`, `send-review-request`) : si env var absent, la fonction démarre quand même puis échoue silencieusement plus loin. Préférable : `throw` au boot. | Multiples `supabase/functions/*/index.ts` | Mauvais signal d'erreur en cas de mauvais déploiement. |
| **Basse** | `recherche-entreprises.api.gouv.fr` appelé côté client sans cache ni timeout (Auth.tsx). | `src/pages/Auth.tsx:80-92` | Si l'API est lente/down → blocage UX 30 s+. Mais validation soft (bypassable de toute façon). |
| **Basse** | `emailRedirectTo: window.location.origin` lors du signup. Supabase Auth a une URL allow-list configurable côté project — si la liste est trop large, possibilité de redirect post-confirmation vers un domaine attaquant. À VÉRIFIER founder côté Supabase Studio. | `src/pages/Auth.tsx:139` | Open redirect post-confirmation email. |

### Points forts

- **65/65 tables RLS-enabled** dès maintenant (post-hotfix matin). Aucune table critique non protégée.
- **23 SECURITY DEFINER, toutes `search_path=public`** explicitement → recommandation Supabase respectée à 100% sur ce périmètre.
- **`stripe-webhook`** : implémentation **exemplaire** (HMAC verification, idempotency, atomic updates, CORS, fail-closed sans secret).
- **`requireAdmin()`** dans `analyze-product-image` : pattern réutilisable, JWT + DB verification — solide.
- **Open redirect protection `isSafeRedirect()`** : `Auth.tsx:16-17` — pattern défensif simple et efficace.
- **Password policy** présente et raisonnable (8 chars, mixed case, digit).
- **Vercel security headers** (`X-Frame-Options`, `STS`, `Permissions-Policy`, `Referrer-Policy`, `X-Content-Type-Options`) configurés globalement.
- **Helper `public.is_admin()`** SECURITY DEFINER + `search_path` fixé → utilisé dans la majorité des policies admin, élimine la duplication et le risque RLS-recursive.
- **Migrations RLS récentes** (`20260326180000_security_rls_lockdown`, `20260408300000_enable_rls_all_tables`, `20260411100000_restrict_user_profiles_self_update`) montrent une trajectoire de durcissement constant.
- **Aucun secret committé historiquement** (vérifié `git log -S` sur 5 patterns).
- **Trigger `prevent_user_type_change`** (`20260326180000`) bloque l'escalation de privilège user→admin via update self.
- **`handle_new_user`** force `safe_user_type ∈ {client, partner, architect}` au signup (pas d'admin via signup).

### Recommandations priorisées

1. **P0 — Audit empirique `TRIGGER_SECRET` prod** (effort : 5 min). Founder vérifie que l'env var est bien set côté Supabase Studio Functions Secrets. Si oui → rien à faire (fallback inactif). Si non → set la var et durcir le code pour fail-closed (`throw` au boot si vide). À faire **avant tout déploiement** de quote workflow.
2. **P0 — Investigation `chatbot/` edge function** (effort : 30 min). Founder vérifie côté Supabase Studio si la fonction est déployée + son code. Si elle existe en prod : rapatrier le code dans le repo. Si elle n'existe pas : retirer le hook côté client (`ChatbotWidget.tsx`) et la mention dans `CLAUDE.md`.
3. **P0 — Lockdown `salone_2026_visits`** (effort : 30 min). Migration similaire au hotfix prospects : DROP la policy `Allow all anon`, CREATE policies admin-only via `is_admin()`. Tâche bookable maintenant car la table est encore vide → zéro risque opérationnel.
4. **P1 — Storage `product-images` scoping** (effort : 2 h). Réécrire les 3 policies INSERT/UPDATE/DELETE pour conditionner sur `partner_id` (chemin du fichier ou metadata). Pattern : `storage.foldername(name)[1] = partner_id::text`.
5. **P1 — Storage `mood-images` scoping** (effort : 1 h). Conditionner SELECT/INSERT sur `(storage.foldername(name))[1] = auth.uid()::text`.
6. **P1 — Fix `update_product_review_timestamp`** (effort : 5 min). Migration `ALTER FUNCTION ... SET search_path = public`. Élimine l'advisor WARN.
7. **P1 — Audit `product_review_stats` matérialized view** (effort : 30 min). Lire son SELECT. Si data sensible → re-créer en table régulière + REFRESH planifié + RLS. Si data publique (counts agrégés) → laisser, documenter.
8. **P1 — Décision `concept_events` policy** (effort : 1 h). Garder INSERT public si tracking funnel anonyme volontaire ; sinon ajouter `WITH CHECK (auth.uid() IS NOT NULL)`. Documenter dans `STRATEGIC_DECISIONS.md`.
9. **P2 — Rate limiting** (effort : 1-2 j). Edge function reverse proxy ou `pg_net` based. Sur les forms publics (`partner_contact_requests`, `pro_service_requests`, `project_briefs`, `notifications`, `concept_events`, `scoring_snapshots`). Utiliser Cloudflare/Vercel rate limiting au niveau edge si dispo.
10. **P2 — Captcha sur signup/login + forms publics** (effort : 0.5 j). Turnstile ou hCaptcha (gratuits). Augmente la friction marginale, élimine 99% du bot abuse.
11. **P2 — 2FA admin** (effort : 0.5 j). Supabase Auth supporte TOTP — l'activer pour le compte admin. Rappel : admin = founder, donc 1 seul compte à protéger. ROI direct.
12. **P2 — Cleanup bucket `quotedocuments`** (effort : 5 min). Si vraiment doublon orphelin → DELETE. Sinon documenter pourquoi 2 buckets.
13. **P3 — Migration `localStorage` → `cookieStorage`** (effort : 0.5-1 j). Pattern Supabase documenté. À planifier seulement si XSS surface se densifie (user-generated content croissant).
14. **P3 — Standardiser `Deno.env.get()` fail-closed** (effort : 1 h). Helper `requireEnv(key)` qui throw si vide. Remplacer les `|| ""` fallbacks. Cohérence opérationnelle.
15. **P3 — Vérifier Supabase Auth `Site URL` + `Redirect URLs`** côté Studio (effort : 5 min). S'assurer que l'allow-list contient juste `https://terrassea.com` et `http://localhost:8080`.

### Note finale Thème 1 — Vérifications conditionnels Critique (2026-04-29 post-bloc 1)

**TRIGGER_SECRET (vérification 1) — STATUS : VÉRIFICATION FOUNDER REQUISE**
Le MCP Supabase ne donne pas accès en lecture aux secrets configurés sur les edge functions (sécurité par design). Le founder doit vérifier manuellement via Supabase Studio → Edge Functions → `send-quote-notification` → Secrets si la variable `TRIGGER_SECRET` est définie. Si présente : sévérité requalifiée **Moyenne** (le fallback reste un mauvais pattern mais inactif). Si absente : sévérité **Critique** maintenue, à fix immédiatement.

**chatbot/ + drift code/prod (vérification 2) — STATUS : DRIFT RÉSOLU 2026-04-29 après-midi**

`mcp__supabase__list_edge_functions` avait révélé **15 edge functions ACTIVE en prod**, dont **4 absentes du repo**. Décisions founder + actions effectuées :

| Fonction prod | Décision | Action |
|---|---|---|
| `chatbot` v3 | Rapatrier + garder | ✅ `supabase/functions/chatbot/index.ts` + README. Refactor P2 différé (rate limit + CORS). |
| `analyze-terrace` v5 | Rapatrier + garder | ✅ `supabase/functions/analyze-terrace/index.ts` + README. Refactor P3 différé. Confirmé utilisé par `useMoodBoard.ts:245`. |
| `check-abandoned-carts` v5 | **Désactiver immédiatement + rapatrier en mode refactorisé** | ✅ Déploiement v6 avec guards `ENABLE_ABANDONED_CARTS_CRON` + `CRON_SECRET`. Test 503 confirmé via pg_net. README documente la procédure de réactivation. |
| `Terrassea-Production` v6 | Supprimer en prod | ⏳ Suppression founder requise via Studio (MCP n'expose pas `delete_edge_function`). Hello world template, pas dans le repo, 0 occurrence dans `src/`/`api/`/`vercel.json`. |

**Découverte collatérale critique** : le `jobid=2 jobname='check-abandoned-carts'` du `cron.job` Postgres appelait l'edge function **sans `Authorization` header** (cron caller legacy). Faille auth fermée par le déploiement de la v6. Le `jobid=1 jobname='send-review-requests'` est dans la même config et fait actuellement 401 silencieusement → à investiguer Thème 8 (Observability).

Détails complets : `docs/audit/2026-04/DRIFT_PROD_FUNCTIONS.md`. Commit dédié sur le repo (suite).

---

## 2. Backend Supabase

### État observé

**Schéma**
- **65 tables physiques + 1 vue matérialisée** dans `public`. Toutes les 65 tables ont une **PRIMARY KEY définie** (✅ aucune table sans PK).
- **47 migrations versionnées** (du 2026-03-13 au 2026-04-29), pattern `YYYYMMDDHHMMSS_descriptive_snake.sql`. Migrations récentes utilisent `DROP POLICY IF EXISTS`, `CREATE OR REPLACE FUNCTION` (idempotentes).
- **26 triggers** actifs sur 14 tables. Patterns : `*_updated_at` (moddatetime, 7×), notifications (5×), workflows (`trg_auto_create_partner`, `trg_auto_create_order`, `trg_partner_upgrade`, `trg_auto_route_brief`, `trg_auto_derive_product_tags`), guards (`trg_prevent_user_type_change`, `protect_signed_quotes`), refresh matérialized view (`trg_refresh_product_review_stats`).
- **23 fonctions SECURITY DEFINER**, toutes avec `search_path` configuré (vu Thème 1).
- **4 storage buckets** (vu Thème 1) — `mood-images` private, `product-images` public, `quote-documents` private+typé, `quotedocuments` doublon orphelin.

**Performance advisors** (`mcp__supabase__get_advisors(performance)`)

| Advisor | Niveau | Count | Note |
|---|---|---|---|
| `multiple_permissive_policies` | WARN | **619** | Tables avec ≥ 2 policies overlapping pour la même action × role. Pattern admin + owner courant. |
| `unused_index` | INFO | **106** | Indexes pas encore utilisés. Normal sur DB jeune (53 produits, peu de queries variées). |
| `auth_rls_initplan` | WARN | **7** | Policies utilisant `auth.uid()` directement (re-évaluation par row) au lieu de `(SELECT auth.uid())` (init-plan). |
| `unindexed_foreign_keys` | INFO | **3** | FK sans index supportant. |
| **0 ERROR** | — | — | Aucun bloqueur perf. |

### Problèmes identifiés

| Sévérité | Problème | Fichier(s) concerné(s) | Impact |
|---|---|---|---|
| **Élevée** | **7 policies `auth_rls_initplan`** : `auth.uid()` ré-évalué par row → coût RLS qui scale linéairement avec le résultat. À fix par `(SELECT auth.uid())`. Tables : `products` (1), `quote_documents` (2), `product_reviews` (4). | `pg_policies` ci-dessus | Sur queries returning 1000+ lignes (catalogue products), latence X10. À fix au plus tôt sur `products`. |
| **Élevée** | **7 FK uuid manquantes** vers tables référentielles : `board_items.product_id`, `concept_events.product_id`, `orders.product_id`, `partner_arrival_items.product_id`, `preorders.product_id`, `pro_service_events.actor_id`, `project_zone_products.product_id`. Aucune contrainte référentielle DB → orphelins possibles, suppression non cascadée. | `information_schema.columns` (vs `key_column_usage` FK) | Risque de pointer vers un product/user supprimé. Pas de garantie d'intégrité. |
| **Moyenne** | **3 FK `unindexed_foreign_keys`** : `concept_events_user_id_fkey`, `product_reviews_order_id_fkey`, `product_reviews_quote_request_id_fkey`. JOIN ou DELETE CASCADE → table scan. | advisor 0001 | Pas critique tant que volume reviews/concept_events < 10k. |
| **Moyenne** | **619 `multiple_permissive_policies`** : pattern admin + owner-policy → 2 policies pour la même action. Consolidable via une seule policy `USING (is_admin() OR <owner_check>)` pour réduire l'overhead. | nombreuses tables | Latence cumulée au-delà de plusieurs centaines de policies. Sur ce volume actuel (203 policies, 53 produits), impact perceptible négligeable. |
| **Moyenne** | **`trg_refresh_product_review_stats`** sur `product_reviews` se déclenche AFTER chaque INSERT/UPDATE/DELETE → refresh complet d'une matérialized view. À volume croissant (>100 reviews/jour), goulot. | `product_reviews` triggers | Refresh O(n) à chaque review, alors qu'un refresh planifié (cron quotidien ou par batch) suffirait. |
| **Moyenne** | **2 triggers `trg_partner_upgrade`** sur `partner_commissions` (un INSERT, un UPDATE) — vérifier qu'ils ne se chevauchent pas. À examiner `check_partner_upgrade()`. | `partner_commissions` triggers | Si bug logique, double-trigger d'upgrade. |
| **Basse** | **106 `unused_index`** (INFO). À ré-évaluer dans 6 mois quand le volume aura monté — certains seront utilisés, d'autres seront vraiment morts. | advisor 0005 | Coût stockage/écriture marginal. |
| **Basse** | **`bun.lock` + `bun.lockb` + `package-lock.json`** co-existent dans le repo (déjà noté en RECON §17, traité en Thème 3). | racine | Confusion package manager. |
| **Basse** | Le `supabase/config.toml` minimal (1 ligne `project_id`) ne configure pas les autres options (auth, db, api). Les valeurs par défaut Supabase Cloud s'appliquent. À documenter explicitement. | `supabase/config.toml` | Si quelqu'un lance `supabase init` puis `supabase start` localement, la stack locale risque de diverger de la prod. |

### Points forts

- **100 % des tables ont une PK** définie. Aucun risque de duplicates non-détectables.
- **Pattern migrations** propre : timestamp 14 chiffres + snake_case, idempotence (`IF EXISTS` partout dans les migrations récentes).
- **Triggers défensifs** (`protect_signed_quotes`, `trg_prevent_user_type_change`) en BEFORE UPDATE → empêchent des modifications interdites au niveau DB, pas juste application.
- **Workflow chains** explicites dans les triggers (`trg_auto_create_partner` → `trg_create_partner_on_approval`, `trg_auto_create_order`) → audit trail clair.
- **`reserve_preorder()` RPC SECURITY DEFINER** (vue dans `20260326180000`) atomique pour prévenir race condition de réservation.
- **`fuzzy_search_products()` RPC** : extraction de la logique fuzzy/trigram en fonction Postgres → côté client juste un `rpc()` call.
- **0 ERROR perf** ; **0 ERROR security** post-hotfix. La DB est globalement saine.
- **Helper `next_invoice_number()` / `next_payment_reference()`** : centralise la génération de séquences, évite les race-condition du `MAX(...)+1` côté app.

### Recommandations priorisées

1. **P1 — Fix 7 policies `auth_rls_initplan`** (effort : 1 h). Migration `DROP POLICY ... CREATE POLICY ... USING ((SELECT auth.uid()) = ...)`. Cible prioritaire : `products` (catalogue, query la plus fréquente). ROI immédiat sur latence.
2. **P1 — Ajouter les 7 FK manquantes** (effort : 2 h). Migration `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE …`. Décider per case `RESTRICT`/`SET NULL`/`CASCADE`. Bénéfice : intégrité référentielle + index automatique sur la FK (résout aussi advisor `unindexed_foreign_keys`).
3. **P1 — Indexer les 3 FK signalées** (effort : 15 min). `CREATE INDEX CONCURRENTLY` sur `concept_events.user_id`, `product_reviews.order_id`, `product_reviews.quote_request_id`.
4. **P2 — Audit `trg_refresh_product_review_stats`** (effort : 2 h). Remplacer par un refresh asynchrone (ex. `pg_net` HTTP call à `run-scheduled-tasks` toutes les N minutes, ou sur cron `pg_cron` natif Postgres). Avant que volume reviews monte.
5. **P2 — Consolider les `multiple_permissive_policies`** (effort : 0.5-1 j). Tables avec 5+ policies à examiner en priorité (lister via `SELECT tablename, COUNT(*) FROM pg_policies GROUP BY tablename HAVING COUNT(*) >= 5`). Pattern de simplification : `USING (is_admin() OR owner_check OR participant_check)`. ROI faible aujourd'hui mais préventif.
6. **P2 — Vérifier `trg_partner_upgrade` double-trigger** (effort : 30 min). Lire `check_partner_upgrade()`. Si comportement intentionnel (INSERT + UPDATE), documenter ; sinon simplifier en un seul trigger BEFORE INSERT OR UPDATE.
7. **P3 — Re-runner advisors performance dans 3 et 6 mois** (effort : 5 min/check). Quand le volume aura X10 (vente live), beaucoup de `unused_index` deviendront utilisés ou inversement. Décision « DROP INDEX si toujours unused après 6 mois » est saine.
8. **P3 — Compléter `supabase/config.toml`** (effort : 30 min). Aligner explicitement la config locale avec les paramètres Auth/DB/API du projet prod, pour faciliter `supabase start` futur.

---

## 3. Configuration & Tooling

### État observé

**TypeScript**
- `tsconfig.json` (root) : références split → `tsconfig.app.json` (code source) + `tsconfig.node.json` (config files).
- `tsconfig.app.json` : **`strict: false`**, `noImplicitAny: false`, `strictNullChecks: false`, `noUnusedLocals: false`, `noUnusedParameters: false`.
- `tsconfig.node.json` : **`strict: true`** ✅ (mais ne couvre que `vite.config.ts`).
- **442 occurrences** de `: any | as any | <any>` dans **83 fichiers** sur 273 (~ 30 % de la codebase a au moins un `any` explicite).
- **0 occurrence** de `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck` ✅ — aucun bypass brut du compilateur.

**ESLint**
- Flat config (`eslint.config.js`), ESLint 9 + `typescript-eslint` 8 + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`.
- `@typescript-eslint/no-explicit-any: off` ⚠ (rule désactivée).
- `@typescript-eslint/no-unused-vars: warn` (warn, pas error).
- `react-refresh/only-export-components: warn` avec `allowConstantExport`.
- `ignores: ["dist"]`.
- **Pas de Prettier explicite** ; pas de `.prettierrc`. Formatting ESLint-only.

**Bundler (Vite)**
- Vite 5.4 + plugin SWC (`@vitejs/plugin-react-swc`) → compile rapide sans Babel.
- Port dev `8080`, host `::` (IPv6 fallback IPv4), `hmr.overlay: false`.
- `manualChunks` bien split : `vendor-react`, `vendor-supabase`, `vendor-ui`, `vendor-motion`, `vendor-query`, `vendor-i18n`, `vendor-recharts`, `vendor-pdf`.
- `lovable-tagger` plugin actif uniquement en `mode === "development"`.

**Tests**
- `vitest.config.ts` : jsdom, globals true, setup `src/test/setup.ts`, include `src/**/*.{test,spec}.{ts,tsx}`.
- `playwright.config.ts` réfère `lovable-agent-playwright-config/config` — config externalisée. Pas de `*.spec.ts` E2E dans le repo.

**Vercel**
- `vercel.json` : 1 cron `/api/cron-reminders` à `0 9 * * *`, prerender pour bots IA/SEO via header user-agent regex, security headers globaux (HSTS, X-Frame, X-Content-Type, Permissions-Policy, Referrer-Policy).

**CI**
- `.github/workflows/ci.yml` : trigger `push` + `pull_request` sur `main`, steps `checkout` → `setup-node@20` → `setup-bun` → `bun install --frozen-lockfile` → `bun run lint` → `bunx tsc --noEmit` → `bun run test` → `bun run build`. Tous bloquants.
- **Pas de pre-commit hooks** (Husky, simple-git-hooks, lefthook). Lint/type-check uniquement à la PR.

**.gitignore**
- Couvre `node_modules`, `dist`, `dist-ssr`, `*.local`, `.env`, `.env.*` (sauf `.example`), `.vscode/*` (sauf `extensions.json`), `.idea`, `.DS_Store`, `.claude/`, `.mcp.json`. Cohérent.

**Lockfiles**
- **3 lockfiles versionnés simultanément** : `bun.lock` (text JSON, 154 KB), `bun.lockb` (binary, 246 KB), `package-lock.json` (309 KB).
- CI utilise `bun install --frozen-lockfile` → utilise `bun.lock` ou `bun.lockb` (Bun choisit).
- `package-lock.json` est obsolète (~ migration npm → bun, jamais nettoyé).

**Dossiers résiduels**
- `dist/` : présent localement, **NON versionné** ✅ (couvert par gitignore).
- `brief-brand-system.md/` : dossier vide à la racine, **NON versionné** ✅. Inutile.
- `supabase/.temp/` : présent local, NON versionné ✅.

### Problèmes identifiés

| Sévérité | Problème | Fichier(s) concerné(s) | Impact |
|---|---|---|---|
| **Élevée** | TypeScript **strict mode désactivé** sur le code source (`tsconfig.app.json: strict: false, noImplicitAny: false, strictNullChecks: false`). 442 `any` explicites dans 83 fichiers (~ 30 %). Le code applicatif n'a pratiquement aucun bénéfice du type system. | `tsconfig.app.json:13`, et 83 fichiers `src/**/*.{ts,tsx}` | Bugs latents : null pointer, mauvais types passés en props, regressions silencieuses lors de refactors. Bénéfice "TypeScript" partiel. |
| **Élevée** | ESLint rule `@typescript-eslint/no-explicit-any: "off"` → `any` autorisé sans warning. Combiné avec `strict: false`, le compilateur n'a aucune barrière pour empêcher la prolifération. | `eslint.config.js:24` | La dette `any` ne sera jamais détectée automatiquement, elle ne peut que croître. |
| **Moyenne** | **3 lockfiles versionnés simultanément** : `bun.lock`, `bun.lockb`, `package-lock.json`. Chaque tool peut produire un install différent. Risque de drift. | Racine | Si quelqu'un utilise `npm install`, il reconstruit `package-lock.json` qui ne reflète plus la prod. Si Bun change son format, drift entre `lock` et `lockb`. |
| **Moyenne** | **`tsconfig.node.json` couvre seulement `vite.config.ts`** — les fichiers `api/*.ts` (Vercel functions) et `playwright-fixture.ts` (root) ne sont couverts par aucun tsconfig explicite (probablement vérifiés via tsconfig.app.json par défaut, mais à clarifier). | `tsconfig.node.json:21`, `api/*.ts` | Ambiguïté sur le scope de type-check pour les Vercel functions. |
| **Moyenne** | **Pas de pre-commit hook** : lint/type/test ne tournent pas avant push. Risque de pousser un commit qui casse CI. | (absence de `.husky/`, pas de `simple-git-hooks` dans package.json) | Cycle de feedback CI : ~ 2-5 min vs < 10 s en pre-commit. |
| **Moyenne** | **Pas de Prettier explicite** : formatting laissé à ESLint. Cohérent tant qu'un seul dev (founder + Claude Code), mais devient un problème à l'arrivée d'un 2e contributeur. | racine | Diffs polluables par re-formattings divergents. |
| **Moyenne** | `playwright.config.ts` réfère `lovable-agent-playwright-config` → **config externe que tu ne contrôles pas** (lib third-party). Pas de tests E2E locaux. CI ne lance pas Playwright. | `playwright.config.ts` | Si Lovable change ou retire le package, tu perds ta config. Aucun E2E ne tourne aujourd'hui. |
| **Basse** | Dossier vide `brief-brand-system.md/` à la racine (résidu nommage erroné — devait être un fichier `.md`, finit comme dossier vide). | Racine | Encombrement visuel, confusion. |
| **Basse** | `supabase/.temp/` non gitignored explicitement. Couvert par défaut tant que rien n'y est, mais à ajouter au `.gitignore` pour clarté. | `.gitignore` | Cosmétique. |
| **Basse** | `eslint.config.js` n'inclut pas les fichiers `api/*.ts` et `supabase/functions/**/*.ts` dans le `files` glob (`["**/*.{ts,tsx}"]` les couvre théoriquement, mais le globals est `globals.browser` — pas `globals.node` ni `globals.deno`). | `eslint.config.js:11-15` | Faux positifs/négatifs ESLint sur les Edge Functions. |

### Points forts

- **CI bloquant** sur lint + type-check + test + build → pas de régression silencieuse à merge.
- **`bun install --frozen-lockfile`** garantit reproducibilité des builds CI.
- **`manualChunks` Vite** bien split (8 vendors) → loading parallélisable, cache HTTP par bundle stable.
- **`vercel.json` security headers** complet et professionnel (HSTS preload, Permissions-Policy granulaire).
- **0 `@ts-ignore`** ✅ — la dette `any` est explicite dans le code, pas masquée par des bypasses.
- **`.gitignore` solide** (couvre `.env*`, `.claude/`, `.mcp.json`, `dist/`, etc.).
- **Crons Vercel** pour les rappels — pas besoin d'un service externe (Resque, Sidekiq, etc.).

### Recommandations priorisées

1. **P1 — Activer `strict: true` progressivement** (effort : 0.5-1 j initial + 1 j cleanup). Étapes : (a) `strictNullChecks: true` d'abord (gain le plus immédiat), (b) `noImplicitAny: true` ensuite, (c) `strict: true` final. Chaque étape génère des erreurs TS — fixer dossier par dossier (engine/ d'abord, lib/, hooks/, components/admin/, etc.). Passer en CI bloquant à chaque étape franchie.
2. **P1 — Activer `@typescript-eslint/no-explicit-any: "warn"`** puis `"error"` (effort : aligné avec P1 ci-dessus). Empêche la prolifération future.
3. **P2 — Cleanup lockfiles** (effort : 15 min). Décider quel lockfile fait foi (recommandation : garder `bun.lock` text-only, supprimer `bun.lockb` binaire et `package-lock.json`). Vérifier que `bun install --frozen-lockfile` lit bien `bun.lock`. Documenter dans `CLAUDE.md`.
4. **P2 — Ajouter pre-commit hook** (effort : 30 min). `simple-git-hooks` (léger) ou `lefthook` ; lance `bun run lint` + `bunx tsc --noEmit` sur fichiers staged. Évite les CI rouges sur typo.
5. **P2 — Ajouter Prettier** (effort : 30 min). `.prettierrc` minimal + script `bun run format`. Optionnellement intégrer dans pre-commit.
6. **P2 — Décider sort de Playwright** (effort : 1 h). Soit (a) écrire les premiers tests E2E (smoke test login + project flow + checkout) et lancer dans CI, soit (b) supprimer `playwright.config.ts` et retirer la dépendance. Statut actuel = entre-deux pas utile.
7. **P3 — Inclure `api/` et `supabase/functions/` dans tsconfig + ESLint** (effort : 1 h). Créer un `tsconfig.deno.json` pour les edge functions ou des overrides ESLint avec `globals: globals.node` / Deno globals.
8. **P3 — Cleanup résidus** (effort : 5 min). `rm -r brief-brand-system.md/` (le dossier vide), ajouter `supabase/.temp/` à `.gitignore` explicitement.

---

## 4. Architecture & structure

### État observé

**Top fichiers par taille** (hors `ui/` shadcn, hors `types.ts` auto-généré 4755 lignes) :

| Fichier | Lignes | Note |
|---|---|---|
| `src/components/architect-dashboard/ArchitectSections.tsx` | **2 743** | God component dashboard architecte |
| `src/pages/Admin.tsx` | **2 347** | Dispatcher admin gérant 20+ tabs en switch |
| `src/components/pro-service/ProServiceClientHub.tsx` | **2 118** | God hub pro-service côté client |
| `src/components/client-dashboard/ClientSections.tsx` | **2 072** | Dashboard client multi-sections |
| `src/engine/projectEngine.ts` | 1 966 | Dense mais cohérent (engine logic) |
| `src/components/partner-dashboard/ExcelImportModal.tsx` | **1 553** | Modal d'import XLSX (logique métier dans UI) |
| `src/components/partner-dashboard/AddProductForm.tsx` | **1 307** | Form de création produit |
| `src/components/pro-service/ProServiceArchitectHub.tsx` | **1 265** | God hub côté architecte |
| `src/components/admin/AdminBrandManagement.tsx` | **1 216** | Admin brand management |
| `src/engine/intentDetector.ts` | 1 093 | Engine NL parsing (dense, OK) |
| `src/pages/Account.tsx` | **1 033** | Page Account multi-sections |

**Séparation des responsabilités**
- `src/engine/` : excellent. Pure logique métier client-side, **0 import Supabase, 6 `any` total** sur 10 fichiers.
- `src/lib/` : bonne séparation. Wrappers Supabase + utils. 19 modules.
- `src/hooks/` : bon pattern react-query, mais certains hooks deviennent gros (`useArchitectProjects` 925 lignes, **49 `.from()` calls**) → mélangent fetch et logique.
- `src/contexts/` : 4 contexts, périmètre clair. AuthContext : double effect (bootstrap + subscription) bien orchestré.
- `src/pages/` : pages = orchestration + layout. Plusieurs débordent (Admin 2347 lignes, Account 1033). Logique métier fuit dans les pages.
- `src/components/` : 16 sous-dossiers thématiques + 22 racine. Granularité fine. **MAIS** plusieurs sections-composants deviennent god components (ArchitectSections, ClientSections, ExcelImportModal).

**Doublons**
- **`use-toast.ts`** : `src/hooks/use-toast.ts` ET `src/components/ui/use-toast.ts` (déjà noté RECON §17).
- **`tsconfig.app.json`** vs **`tsconfig.node.json`** vs **`tsconfig.json`** : OK, structure split légitime.

### Problèmes identifiés

| Sévérité | Problème | Fichier(s) concerné(s) | Impact |
|---|---|---|---|
| **Élevée** | **9 god components > 1000 lignes** (hors engines/auto-gen). `ArchitectSections.tsx` (2743), `Admin.tsx` (2347), `ProServiceClientHub.tsx` (2118), `ClientSections.tsx` (2072), `ExcelImportModal.tsx` (1553), `AddProductForm.tsx` (1307), `ProServiceArchitectHub.tsx` (1265), `AdminBrandManagement.tsx` (1216), `Account.tsx` (1033). Ces fichiers concentrent UI + state + queries + business rules. Test difficile, refactor risqué. | Listés ci-dessus | Dette principale du repo. Toute évolution dans ces zones devient lente et risquée. Bloqueur Phase 1 si chantiers touchent ces zones. |
| **Élevée** | **Logique métier dans les pages**. `Admin.tsx` switch entre 20+ tabs avec une partie de la logique de chacun in-line. `Account.tsx` idem (sections client/partner/architect en if/else). Devrait être délégué à des sous-composants ou un router secondaire. | `src/pages/Admin.tsx`, `src/pages/Account.tsx` | Toute modification d'un sous-tab impacte le god component → CI relance tout, code reviews difficiles. |
| **Élevée** | **Hooks "data + logique"** mélangés : `useArchitectProjects.ts` (925 lignes, 49 `.from()`, 11 `any`), `useProductSubmissions.ts` (830 lignes, 25 `.from()`), `usePaymentFlow.ts` (19 `.from()`). Les hooks devraient être des thin wrappers query/mutation, pas des gros stores. | Hooks listés | Re-renders de tout le composant parent dès qu'une portion change. Difficile à mocker en test. |
| **Moyenne** | Doublon `use-toast.ts` dans `hooks/` ET `components/ui/`. Vraisemblable résidu d'un upgrade shadcn. | `src/hooks/use-toast.ts`, `src/components/ui/use-toast.ts` | Confusion d'imports, divergences possibles. |
| **Moyenne** | Pas de couche `services/` ou `domain/` claire. Logique business dispersée entre `engine/`, `lib/`, `hooks/`, et inline dans pages/components. | (architecture globale) | Pas de single source of truth pour des règles cross-cutting (ex. règles d'éligibilité plan). |
| **Basse** | Pas de tests d'intégration entre engine ↔ lib ↔ contexts. Tests engines isolés OK, mais le glue code n'est pas couvert. | `src/test/` | Bugs d'intégration peuvent passer (ex. mauvais mapping côté hook → engine). |

### Points forts

- **`src/engine/`** : pattern exemplaire. 10 fichiers, logique pure, 6 `any` total, testable, extensible (Chantier 3 a ajouté `multiZoneEngine` et `complianceEngine` proprement).
- **`src/integrations/supabase/`** : auto-généré, types stricts, séparé de l'app code.
- **Granularité dossiers `components/`** : 16 sous-dossiers thématiques (admin, architect-dashboard, client-dashboard, partner-dashboard, partners, products, project, project-builder, quotes, mood-board, pro-service, payments, financing, resources, ui). Très lisible quand on cherche un composant.
- **`shadcn/ui`** : 49 primitives Radix, isolation parfaite dans `ui/`.
- **`AuthContext`** : ~ 150 lignes, focus, lisible. Bonne référence du pattern context dans ce repo.
- **Path alias `@/`** : utilisé partout, jamais d'import relatif `../../../`.

### Recommandations priorisées

1. **P1 — Refactor `Admin.tsx`** (effort : 2-3 j). Découper les 20+ tabs en composants `AdminUsersTab.tsx`, `AdminProductsTab.tsx`, etc. (peut-être déjà partiel via `AdminUsers.tsx`, etc.). Réduire `Admin.tsx` à ~ 200 lignes (router + layout + tab dispatcher).
2. **P1 — Refactor `ArchitectSections.tsx` + `ClientSections.tsx` + `ProServiceClientHub.tsx`** (effort : 5-7 j cumulés). Découper par sous-section (Projects, Quotes, Messages, Settings). Patterns "container/presentational" ou des sous-routes React.
3. **P1 — Splitter `useArchitectProjects.ts` + `useProductSubmissions.ts`** (effort : 2-3 j cumulés). Un hook par operation : `useArchitectProjectsList`, `useArchitectProjectMutations`, etc. ROI : tests unitaires, reuse cross-page.
4. **P2 — Cleanup doublon `use-toast.ts`** (effort : 15 min). Garder `src/hooks/use-toast.ts` (canonique shadcn), supprimer celui dans `ui/`.
5. **P2 — Introduire `src/services/`** (effort : 1-2 j). Couche thin entre `lib/` (data) et `hooks/` (state) pour les règles cross-cutting (`partnerEligibility.ts`, `quoteWorkflow.ts`). Préparer Chantier suivant.
6. **P2 — Découper `ExcelImportModal.tsx` (1553 lignes)** et **`AddProductForm.tsx` (1307 lignes)** (effort : 2 j cumulés). Logique XLSX/parsing à sortir du modal vers `lib/excelImporter.ts`.
7. **P3 — `madge` pour vérifier circular imports** (effort : 30 min). À lancer une fois en local (pas dans CI).
8. **P3 — Ajouter tests d'intégration** (effort : 1-2 j) sur les flows critiques (signup → project → quote → checkout).

---

## 5. Frontend React/TypeScript

### État observé

**Distribution des `any`** (442 total dans 83 fichiers)

| Zone | Occurrences | Note |
|---|---|---|
| `src/components/admin/` | **174 / 20 fichiers** | `AdminDashboard` (46), `AdminSubscriptions` (13), `AdminAnalytics` (12), `AdminOrderTracking` (12), `AdminBrandManagement` (11), `AdminPartners` (11), `AdminMessages/QuoteWorkflow` (10) |
| `src/hooks/` | **83 / 13 fichiers** | `useAdminAnalytics` (22), `useProductSubmissions` (14), `useArchitectProjects` (11), `useOrders` (8) |
| `src/components/architect-dashboard/` | ~ 40 (ArchitectSections 35) | God component admin-architecte |
| `src/components/client-dashboard/` | ~ 14 (ClientSections 12) | |
| `src/components/partner-dashboard/` | ~ 60 (cumulés) | AddProductForm 6, PartnerCatalogueSection 9, PartnerProfileForm 8, AdminAIScanner 7, etc. |
| `src/components/pro-service/` | ~ 13 | useProServiceStore 5, ProServiceClientHub 4, etc. |
| `src/pages/` | ~ 50 | Admin 22, ProjectCart 5, Auth 4 |
| `src/engine/` | **6 / 2 fichiers** ✅ | `projectEngine` 1, `intentDetector` 5 |
| `src/lib/` | ~ 15 | productOffers 2, productQualityScore 3, paymentUtils 2 |

**Verdict** : `any` concentrés dans **admin + hooks data + dashboards lourds**. Le **cœur métier (engine) est presque entièrement typé** (6/4755 lignes engine ≈ 0.1 % de `any`). C'est le bon ratio.

**Hooks customs** : 24 hooks. Pattern react-query majoritaire (`useQuery`/`useMutation`). Quelques hooks sont gros (`useArchitectProjects` 925 lignes 49 `.from()`, `useProductSubmissions` 830 lignes), agissant comme stores plutôt que comme thin wrappers (cf. Thème 4).

**Composants morts** : non vérifié exhaustivement (require `ts-prune`/`unimport`). Pas d'évidence visible de god component non importé.

**État global**
- 4 contexts : Auth, ProjectCart, Compare, Favourites. Périmètre raisonnable.
- Pas de Redux/Zustand. Tout passe par contexts + react-query. Cohérent.
- **`useProServiceStore.ts`** : ressemble à un store local custom (5 `any`). À examiner si pattern aligné avec le reste.

**Patterns React**
- **176 occurrences** `useMemo`/`useCallback` dans **46 fichiers**. Distribution raisonnable. Pas signe de optimisation prématurée généralisée.
- **`Suspense` + `lazy()`** : utilisé pour 21 pages dans `App.tsx` ✅ excellent.
- **`ErrorBoundary`** : présent au niveau racine. Pas de boundaries locales par section.

### Problèmes identifiés

| Sévérité | Problème | Fichier(s) concerné(s) | Impact |
|---|---|---|---|
| **Élevée** | **174 `any` dans `components/admin/`** = ~ 1.7 % du dossier admin (estimation). Couplé à TS strict false → couche admin entièrement non typée pour les payloads Supabase et response shapes. | `src/components/admin/*.tsx` | Refactor admin = jeu de devinette sur les props/state shapes. |
| **Élevée** | **83 `any` dans `src/hooks/`** dont `useAdminAnalytics` (22) et `useProductSubmissions` (14) → tous les payloads admin/submissions remontent en `any`. | `src/hooks/useAdminAnalytics.ts`, `useProductSubmissions.ts`, `useArchitectProjects.ts`, `useOrders.ts` | Le typage stricte côté DB (`Database` types auto-générés) est gâché par des `any` côté consommation. |
| **Moyenne** | **`useProServiceStore.ts`** : pattern store local custom, en marge des patterns react-query/context du repo. À examiner pour cohérence. | `src/components/pro-service/useProServiceStore.ts` | Inconsistance d'architecture, surface de bug supplémentaire. |
| **Moyenne** | **Pas d'`ErrorBoundary` local par page/section**. Une seule au niveau racine `App.tsx`. Une erreur dans `Admin` → blank page totale. | `src/App.tsx` | Mauvais UX en cas de crash partiel. |
| **Moyenne** | **Composants potentiellement morts** non vérifiés (need `ts-prune`). Vu en RECON : aucune importation observée pour `MoodBoardAnalyzer.tsx` (pourtant 4 `any` !) au-delà de la page MoodBoard. À vérifier ÉTAPE 2 stricte. | `src/components/mood-board/MoodBoardAnalyzer.tsx` ? | Code mort = bundle alourdi inutilement. |
| **Basse** | **`react-day-picker` 8.10** vs **react** 18 : day-picker 8.x est vieux (9.x dispo). Pas critique, à monter en même temps que React 19. | `package.json:53` | Cosmétique. |

### Points forts

- **Engine quasi-zéro `any`** (6/1966+1093+ lignes ≈ 0.1 %).
- **Lazy loading complet sur 21 pages** dans `App.tsx`.
- **0 `@ts-ignore` / `@ts-expect-error`** dans tout le codebase ✅ — la dette est explicite (`any`), pas masquée.
- **Pattern react-query stable** : staleTime 2 min, no refetch on focus → cohérent partout.
- **shadcn/ui primitives** : isolation parfaite, pas modifiées manuellement.
- **`AuthContext`** : référence solide (race condition recovery handling, séparation bootstrap/subscription).
- **`176 useMemo/useCallback` répartis sur 46 fichiers** : pas de over-engineering, présence là où on s'y attend (contexts, large lists).

### Recommandations priorisées

1. **P1 — Typer les hooks admin** (effort : 1-2 j). `useAdminAnalytics`, `useProductSubmissions`, `useOrders`, `useArchitectProjects` : remplacer les `any` par les types issus de `Database['public']['Tables'][...]`. Bénéfice immédiat sur autocomplétion + détection d'erreurs.
2. **P1 — Typer `components/admin/`** (effort : 2-3 j en parallèle de Thème 3 P1 strict). Avec `strictNullChecks: true` activé, le typage admin devient mécaniquement plus rigoureux.
3. **P2 — Aligner `useProServiceStore`** (effort : 0.5-1 j). Soit supprimer pour passer à Context, soit documenter comme pattern accepté pour ce module.
4. **P2 — `ErrorBoundary` par section** (effort : 1 j). Wrapper `<ErrorBoundary>` autour de `<Routes>` puis around chaque tab admin/dashboard. Évite le blank page total.
5. **P3 — `ts-prune`** (effort : 30 min). Détecte les exports non utilisés. Supprime le code mort.
6. **P3 — `react-day-picker` upgrade** (effort : 2 h). Sans urgence.

---

## 6. Performance

### État observé

**Bundle size build production** (analyse de `dist/assets/`) :

| Chunk | Taille | Note |
|---|---|---|
| `index-V6QYQ68M.js` | **828 KB** | ⚠ Chunk principal — entry point + Header/Footer/CookieBanner/ChatbotWidget probablement bundlés. Gros LCP killer. |
| `Account-DCCAxq4A.js` | **520 KB** | Page Account 1033 lignes + ses imports (probablement client/partner/architect dashboards lazy-imports tous embarqués) |
| `vendor-pdf-9iQSpO5Y.js` | 420 KB | `pdf-lib` pour quote PDFs |
| `Admin-B0KXVnCO.js` | **404 KB** | Page Admin 2347 lignes + sections |
| `xlsx-Dz-Ru64S.js` | 328 KB | Excel import (`ExcelImportModal`) |
| `vendor-react-CCmtA-Q4.js` | 176 KB | React + ReactDOM + react-router |
| `vendor-supabase-DXZ9vlVs.js` | 172 KB | @supabase/supabase-js |
| `ProService-BE-7uBTl.js` | 156 KB | Page ProService |
| `vendor-motion-Dj1W6E6H.js` | 128 KB | framer-motion |
| `vendor-ui-CqP8qUxn.js` | 108 KB | Radix + shadcn primitives |
| `vendor-i18n-B--WKZMl.js` | 52 KB | i18next |

**Total approx.** : ~ 3 MB minifié sur le top 10 chunks. **`index.js` à 828 KB est anormal pour un chunk d'entrée** quand toutes les pages sont déjà lazy.

**Queries Supabase** : 548 `.from()` dans 93 fichiers. Top concentration :
- `useArchitectProjects.ts` : 49
- `Admin.tsx` : 27 (in-line)
- `useProductSubmissions.ts` : 25
- `usePaymentFlow.ts` : 19
- `AdminPartners.tsx` : 18
- `useSupplierCalls.ts` : 14
- `lib/quoteDocuments.ts` : 15

Les top 7 fichiers concentrent **167 / 548 ≈ 30 %** des appels Supabase. Risque de N+1 ou multi-roundtrip dans ces zones.

**Patterns N+1 potentiels** : 8 fichiers utilisent `Promise.all` ou `.map(async`. Le pattern `Promise.all` parallélise → bon. Mais dans Admin.tsx, useArchitectProjects : à examiner si chaque iteration fait un nouveau fetch.

**Lazy loading** : 21 pages lazy-loaded ✅ excellent. CookieBanner/ChatbotWidget aussi lazy.

**Images** : non vérifié exhaustivement. `product-images` storage bucket public + image_analyses table laisse penser optimisation Supabase Image Transform pas systématique. À auditer à part.

### Problèmes identifiés

| Sévérité | Problème | Fichier(s) concerné(s) | Impact |
|---|---|---|---|
| **Élevée** | **`index.js` 828 KB** : chunk d'entrée trop gros pour une SPA avec 21 routes lazy. Probable cause : Header, Footer, ChatbotWidget, CookieBanner, AuthContext, ProjectCartContext + leurs hooks tirent tout l'arbre i18n + utilities + Supabase types au boot. **LCP estimé > 2.5 s sur 4G.** | `dist/assets/index.js` build | LCP dégradé, Lighthouse score perf < 70 estimé. Mauvais SEO Core Web Vitals. |
| **Élevée** | **`Account-DCCAxq4A.js` 520 KB et `Admin-B0KXVnCO.js` 404 KB** : pages individuelles trop lourdes. Sont déjà lazy-loaded (good), mais le download time post-click reste perceptible. À découper en sub-routes (chaque tab Admin lazy à son tour). | `src/pages/Account.tsx`, `src/pages/Admin.tsx` | Latence entre clic et affichage de tab, mauvaise UX dashboard. |
| **Élevée** | **49 `.from()` calls dans `useArchitectProjects.ts`** sur 925 lignes. Très probable hot-path N+1 (un fetch par projet × un sous-fetch par zone × …). À analyser ligne par ligne. | `src/hooks/useArchitectProjects.ts` | Latence dashboard architecte multipliée par le nombre de projets. |
| **Moyenne** | **`xlsx` 328 KB** chargé via `ExcelImportModal.tsx`. Heureusement la modal est lazy. À vérifier qu'elle n'est pas dans le chunk parent. | `src/components/partner-dashboard/ExcelImportModal.tsx` | Si bundlée avec Account/Admin → ajoute 328 KB inutiles aux dashboards. |
| **Moyenne** | **`pdf-lib` 420 KB** chargé pour les quote PDFs. `vendor-pdf` chunk → utilisé seulement à la génération. À vérifier que c'est lazy-on-demand. | `src/lib/cartPdfExport.ts`, `src/lib/pdfCoverPage.ts` | Si chargé au boot → 420 KB inutiles pour les users qui ne génèrent pas de PDFs. |
| **Moyenne** | **Pas de virtualization** sur les listes longues (catalogue, admin users, admin products, architect projects). À volume X10, listes de 500+ items vont saturer le DOM. | `Products.tsx`, `Admin*.tsx` | Latence scroll, freezes sur mobile. |
| **Moyenne** | **Images** : pas de pattern `srcset`/`<picture>` ni de Supabase Image Transform observé. Pas de lazy load `<img loading="lazy">` systématique. | composants Image divers | Bandwidth gaspillée, LCP dégradé sur catalogue. |
| **Moyenne** | **27 `.from()` calls in-line dans `Admin.tsx`** : duplication des patterns d'appel dans le god component plutôt que centralisée dans des hooks. | `src/pages/Admin.tsx` | Cache `react-query` partiellement effectif (clés divergentes). |
| **Basse** | `vendor-motion` 128 KB pour framer-motion : un peu lourd, à voir si toutes les animations sont nécessaires. Alternative `motion-one` (~ 20 KB). | `package.json:50` | Optimisation marginale. |

### Points forts

- **`manualChunks` Vite** bien split (8 vendors). Cache HTTP par bundle stable, invalidation contrôlée.
- **Lazy loading 21 pages + CookieBanner/ChatbotWidget** ✅ pattern exemplaire.
- **`react-query` staleTime 2 min, no refetch on focus** : évite les refetchs intempestifs.
- **Vite + SWC** : compile rapide, builds rapides.
- **`Promise.all` utilisé dans 8 fichiers** : bon pattern de parallélisation.

### Recommandations priorisées

1. **P1 — Analyse `index.js` 828 KB** (effort : 1 h). `npx vite-bundle-visualizer` pour voir ce qui pollue. Probable : sortir Footer, ChatbotWidget, CookieBanner du chunk d'entrée + lazy-importer i18n locales par langue détectée.
2. **P1 — Analyse N+1 dans `useArchitectProjects.ts`** (effort : 0.5-1 j). Tracer les 49 `.from()`, identifier les patterns boucle×fetch, batcher en JOIN ou RPC. Aligner avec refactor Thème 4 P1.3.
3. **P1 — Sub-routing Admin et Account** (effort : 1-2 j). Chaque tab lazy via `<Route>` enfant ou `<Suspense>` interne. Réduit Admin de 404 KB → < 100 KB initial.
4. **P2 — Vérifier lazy de `pdf-lib` et `xlsx`** (effort : 30 min). Inspect `dist/assets/Admin*.js` et `Account*.js` pour confirmer absence des deux libs. Si présentes, dynamic `import()` à la mutation.
5. **P2 — Virtualization listes longues** (effort : 1-2 j). `@tanstack/react-virtual` (peer de react-query) ou native `react-window`. Cible : admin tables, catalogue, architect projects.
6. **P2 — Optimisation images** (effort : 0.5-1 j). Activer Supabase Image Transform via URL params (resize, format webp). Ajouter `loading="lazy"` systématique sur `<img>` hors first viewport.
7. **P2 — Centraliser les `.from()` du `Admin.tsx`** (effort : aligné refactor Thème 4 P1.1). Migrer dans hooks dédiés `useAdmin*`. Bénéfice cache react-query partagé.
8. **P3 — Lighthouse audit** (effort : 30 min). Mesurer LCP/INP/CLS réels en prod. Confirmer ou infirmer les estimations P1.
9. **P3 — Considérer `motion-one` au lieu de `framer-motion`** (effort : 1 j cleanup) si on a besoin du gain bundle. Pas urgent.

---

## 7. Tests

### État observé

**Vitest** (`bun run test`)
- **6 fichiers** : `engines.test.ts`, `bom-validation.test.ts`, `multiZone.test.ts`, `compliance.test.ts`, `palette-validation.test.ts`, `search-categories.test.ts` + `setup.ts`.
- **153 tests, tous passent** (run du 2026-04-29 16:22, durée 985 ms).
- Setup minimal : juste un mock `matchMedia` pour jsdom (`src/test/setup.ts`).
- Tous les tests ciblent l'engine (`projectEngine`, `intentDetector`, `multiZoneEngine`, `complianceEngine`, BOM/palette/categories).

**Couverture qualitative observée**
- ✅ **Engine** : couverture forte. 49 tests dans `engines.test.ts` seul, mock factory pour `DBProduct` riche, scénarios divers (project parsing, missing fields, applyAnswer, generateProjectConcepts).
- ❌ **Composants UI** : 0 test.
- ❌ **Hooks** : 0 test (incluant les hooks "data + logique" gros comme `useArchitectProjects` 925 lignes).
- ❌ **Pages** : 0 test.
- ❌ **Contexts** : 0 test.
- ❌ **`src/lib/`** : 0 test (utils, paymentUtils, productOffers, etc.).
- ❌ **Edge functions** : 0 test Deno.

**Tests E2E**
- `playwright.config.ts` réfère un package externe `lovable-agent-playwright-config`. Aucun fichier `*.spec.ts` E2E dans le repo. CI ne lance pas Playwright.
- Statut effectif : **aucun test E2E**.

**Coverage automatique**
- Pas de `--coverage` configuré dans les scripts npm. Aucun rapport HTML/JSON généré ni dans CI ni en local. **Coverage globale inconnue**, estimation manuelle ~ 5-10 % du codebase (engine = quelques % du LOC total mais bien testé ; tout le reste = 0).

### Problèmes identifiés

| Sévérité | Problème | Fichier(s) concerné(s) | Impact |
|---|---|---|---|
| **Élevée** | **Aucun test E2E** sur les flows critiques (signup → project → quote → checkout, login admin → action utilisateur, partner submit → admin approve). Toute régression UI/data passe silencieusement. | absence | Phase 1 chantiers (Pricing, Concierge, Engine 2.0) vont impacter ces flows — sans E2E, chaque déploiement est un saut dans le vide. |
| **Élevée** | **0 test sur les hooks "data + logique" gros** (`useArchitectProjects`, `useProductSubmissions`, `usePaymentFlow`). Ces hooks contiennent la logique métier critique côté client. | `src/hooks/use*.ts` | Refactor risqué (cf. Thème 4 P1.3). Bug régression non détectable. |
| **Moyenne** | **0 test sur `src/lib/`** (`partnerConstants`, `productOffers`, `paymentUtils`, `searchNormalizer`, `quoteDocuments`, etc.). | `src/lib/*.ts` | Logique transverse non protégée. Modification → risque silencieux. |
| **Moyenne** | **Pas de coverage report** (`vitest --coverage`). Pas de visibilité sur ce qui est testé vs non testé. | `vitest.config.ts`, `package.json` scripts | Aveugle sur où la dette de tests est. |
| **Moyenne** | **0 test sur les edge functions Deno**. Logique critique (`stripe-webhook`, `auto-workflow`, `chatbot`) non testée. Une régression peut casser le paiement ou les notifications en silence. | `supabase/functions/*/index.ts` | Le `stripe-webhook` notamment est central — toute modification doit être testée. |
| **Moyenne** | **Pas de test d'intégration** entre engine ↔ lib ↔ contexts. Les engines sont testés isolément, mais le glue code (transformer un payload Supabase en `ProjectParameters` puis en `ProjectConcept`) ne l'est pas. | absence | Bug d'intégration possible (mauvais mapping). |
| **Basse** | **`setup.ts`** très minimaliste (juste matchMedia). Pas de `cleanup()` entre tests, pas de mock global Supabase. Les tests engines marchent car ils n'appellent jamais Supabase, mais si un test composant est ajouté sans setup propre → flaky. | `src/test/setup.ts` | Préventif. |
| **Basse** | Le test `engines.test.ts` recrée un `mockProduct` factory (49 lignes de boilerplate) **dupliqué dans `multiZone.test.ts`**. À factoriser. | `src/test/engines.test.ts:16-50`, `src/test/multiZone.test.ts:13-45` | Cosmétique, mais maintenance fragmentée. |

### Points forts

- **6 fichiers de tests, 153 tests, tous verts** : le harness Vitest fonctionne, le pipeline CI les exécute, on a une base saine.
- **Tests engines variés** : not just happy path. `bom-validation.test.ts` vérifie l'absence de duplicates, `multiZone.test.ts` couvre 15 cas multi-zone, `palette-validation.test.ts` valide les contraintes de cohérence couleurs.
- **CI bloquante** sur les tests : pas de merge avec test rouge.
- **Vitest 3.2 + jsdom + testing-library/react** : stack moderne, pourrait supporter des tests composants sans réinstall.
- **Pattern mockProduct factory** : déjà présent, réutilisable pour de futurs tests intégration.

### Recommandations priorisées

1. **P1 — Activer coverage** (effort : 30 min). Ajouter `bun run test:coverage` qui lance `vitest --coverage`, baseline initial, target gradient (engine 90 % en 1 mois, lib 60 % en 3 mois). Configurer `c8` ou `v8` provider.
2. **P1 — 5 smoke tests E2E Playwright** (effort : 1-2 j). (1) signup client → project → quote, (2) login admin → approve partner, (3) login partner → upload product, (4) checkout Stripe success path, (5) chatbot anonymous chat. Ces 5 sentinelles couvrent 80 % du risque régression. Lancer dans CI sur PR.
3. **P2 — Tests hooks critiques** (effort : 2-3 j). Cible : `useArchitectProjects`, `useProductSubmissions`, `usePaymentFlow`. Mock Supabase via MSW (mock service worker) ou `@supabase/ssr` test helpers.
4. **P2 — Tests `src/lib/`** (effort : 1-2 j). `partnerConstants`, `searchNormalizer`, `productQualityScore`. Pure functions → tests rapides à écrire.
5. **P2 — Factoriser `mockProduct`** (effort : 30 min). `src/test/factories/product.ts` exporté, importé partout. Aligné avec recommandation Thème 5.
6. **P3 — Tests edge functions Deno** (effort : 2-3 j cumulés). Stack : `deno test`. Rentable seulement quand Phase 1 modifiera ces functions.
7. **P3 — Test d'intégration engine↔Supabase** (effort : 1-2 j). Avec une DB de test (branch Supabase ou Docker compose), faire 5 scénarios end-to-end DB.

---

## 8. Dépendances

### État observé

**Production deps** (50) — versions toutes récentes :
- React 18.3.1 (React 19 dispo, pas urgent)
- @tanstack/react-query 5.83.0 (récent)
- @supabase/supabase-js 2.99.1 (récent)
- react-router-dom 7.13.2 (récent, v7)
- i18next 25.8.19 + react-i18next 16.5.8 (récent)
- 27 packages `@radix-ui/*` (cohérent shadcn)
- framer-motion 12.36.0 (récent)
- pdf-lib 1.17.1, xlsx 0.18.5 (stables)
- zod 3.25.76 (récent), react-hook-form 7.61.1 (récent)
- recharts 2.15.4 (récent), sonner 1.7.4, cmdk 1.1.1
- lucide-react 0.462.0 (un peu en arrière, dernière 0.5xx)
- react-day-picker 8.10.1 (v9 dispo, pas urgent)
- vaul 0.9.9, embla-carousel-react 8.6.0, input-otp 1.4.2
- class-variance-authority 0.7.1, clsx 2.1.1, tailwind-merge 2.6.0

**Dev deps** (18)
- TypeScript 5.8.3, vite 5.4.19, vitest 3.2.4 (récents)
- ESLint 9.32.0 + typescript-eslint 8.38.0 (récents)
- @vitejs/plugin-react-swc 3.11.0
- @playwright/test 1.57.0 (récent)
- @types/react 18.3.23, @types/node 22.16.5
- jsdom 20.0.3 (un peu en arrière, jsdom 27 dispo) ⚠
- tailwindcss 3.4.17 (Tailwind 4 dispo, breaking change major)
- **`lovable-tagger 1.1.13`** : dev only, marqueur Lovable
- **`@playwright/test`** vs config externe `lovable-agent-playwright-config` (vu Thème 3)

**Heuristique de fraîcheur** : aucun package n'a > 12 mois de retard évident. Pas de packages "abandonware" identifiables visuellement (pas de `momentjs`, pas de `request`, etc.). `npm audit` non lancé (pas d'install autorisé).

**Doublons fonctionnels potentiels**
- Aucun doublon de routing, state mgmt, forms, animations.
- `pdf-lib` (génération) + pas de doublon parser PDF.
- `xlsx` SheetJS uniquement — pas de doublon csv-parser.

**Lockfiles** (cf. Thème 3) : 3 lockfiles co-existent (`bun.lock` + `bun.lockb` + `package-lock.json`). Confusion package manager.

### Problèmes identifiés

| Sévérité | Problème | Fichier(s) concerné(s) | Impact |
|---|---|---|---|
| **Moyenne** | **`npm audit` non lancé** dans cet audit (read-only, pas d'install possible). Risque de CVE non détecté. | absence | Faille tierce non visible. |
| **Moyenne** | **`lovable-tagger 1.1.13`** : dev dependency Lovable. Si Lovable change ou retire le package, build dev casse. À évaluer : nécessaire ? | `package.json:87`, `vite.config.ts:4` | Dépendance externe non contrôlée. |
| **Moyenne** | **`lovable-agent-playwright-config`** : config Playwright externalisée chez Lovable. Idem couplage. | `playwright.config.ts:1` | Mêmes risques. |
| **Moyenne** | **3 lockfiles** (`bun.lock`, `bun.lockb`, `package-lock.json`) — vu Thème 3. | racine | Drift install, audit ambigu. |
| **Basse** | **`jsdom 20.0.3`** : jsdom 27 dispo (bonds majors). Tests passent → pas urgent, mais à monter en même temps que vitest 4 si dispo. | `package.json:86` | Cosmétique. |
| **Basse** | **`react-day-picker 8.10`** : v9 dispo. Simple upgrade. | `package.json:57` | Cosmétique. |
| **Basse** | **`tailwindcss 3.4`** : v4 dispo (rewrite Rust, breaking changes). Ne pas migrer en Phase 1, mais à planifier 2027. | `package.json:89` | Bénéfice perf marginal aujourd'hui. |
| **Basse** | **`react 18.3.1`** : React 19 stable. Migration majeur, pas critique tant que React 18 supporté. | `package.json:56` | Décision Phase 2-3. |
| **Basse** | **`framer-motion 12.36`** : 128 KB chunk (cf. Thème 6). Alternative `motion-one` (~ 20 KB) si optimisation perf. | `package.json:50` | Optimisation marginale. |

### Points forts

- **Stack quasi-entièrement à jour**. Pas de package "vieux" dangereux.
- **shadcn/ui via Radix** : 27 packages cohérents, tous récents.
- **Pas de Moment.js, lodash entier, jquery, request** : codebase aligné sur les standards modernes.
- **Pas de doublons fonctionnels** : un router, un state mgmt, un form lib, une animation lib.
- **TypeScript / Vite / Vitest / ESLint** sur leurs versions courantes.
- **Bun comme package manager** : install rapide, lockfile compact.
- **`bun install --frozen-lockfile`** dans CI : reproducibility garantie.

### Recommandations priorisées

1. **P1 — `npm audit` / `bun audit`** (effort : 5 min). Lancer en local manuellement, traiter les `high`/`critical` immédiatement. À répéter trimestriellement.
2. **P1 — Cleanup lockfiles** (effort : 15 min, déjà recommandé Thème 3 P2). Garder `bun.lock` ou `bun.lockb` (pas les deux), supprimer `package-lock.json`.
3. **P2 — Décider Lovable couplage** (effort : 1-2 h). Supprimer `lovable-tagger` et `lovable-agent-playwright-config` si plus utilisés. Sinon documenter dans `CLAUDE.md` qu'ils sont nécessaires (et pourquoi).
4. **P2 — Renovate ou Dependabot** (effort : 30 min). GitHub config minimale pour PR auto sur upgrades majeurs. Réduit la dette à terme sans effort manuel.
5. **P3 — Plan migration Tailwind 4 / React 19** (effort : 5-10 j cumulés, 2027). Ne pas faire en Phase 1.
6. **P3 — Évaluer `motion-one` vs `framer-motion`** (effort : 1 j) si bundle size devient un sujet vraiment serré.

---

## 9. Observabilité & Ops

### État observé

**Outils d'observabilité produit / erreur**
- ❌ **Aucun** : pas de Sentry, PostHog, Plausible, Mixpanel, Amplitude, Datadog, GTM, gtag, etc. Vérifié par `grep` exhaustif sur `src/` → 0 fichier match.
- ❌ **Pas d'integration GA/GTM** dans `index.html`.
- ❌ **Pas de tracking custom** vers une autre URL (autre que les logs Supabase Edge functions).

**Logging**
- **`console.log/error/warn`** : 107 occurrences dans 39 fichiers de `src/`, 27 occurrences dans 11 fichiers de `supabase/functions/`. **Pas de logger structuré.**
- Fichiers les plus loggés : `src/lib/quoteDocuments.ts` (11), `src/hooks/useArchitectProjects.ts` (7), `src/hooks/useFavouritesDB.ts` (5), `src/lib/trackingService.ts` (5), `src/components/architect-dashboard/ArchitectSections.tsx` (5).
- Edge functions : `run-scheduled-tasks` (5), `stripe-webhook` (3), `check-abandoned-carts` (3) — tous via `console.error`.

**Monitoring infra**
- Supabase Studio expose des logs Edge Functions (vu via `mcp__supabase__get_logs`).
- Vercel expose des logs serverless via leur dashboard (non vérifié).
- Pas de **uptime monitoring** externe (Pingdom, UptimeRobot, BetterStack) identifié.
- Pas d'alerting configuré.

**Notifications utilisateur** : table `notifications` + edge functions `send-notification-email`, `send-quote-notification`, `send-review-request`. Bien outillé pour les notifs métier.

**Crons** : Vercel cron `/api/cron-reminders` 9h, pg_cron 3 jobs (`send-review-requests` 10h, `check-abandoned-carts` 6h, `daily-reminders` 9h). Pas de monitoring "did the cron run successfully?".

**Erreurs côté front** : `ErrorBoundary` racine présent (`src/components/ErrorBoundary.tsx`). Si une page crashe → blank page mais pas de remontée. Pas d'`window.onerror` global, pas de `unhandledrejection` handler.

**`tracking_service.ts`** observé via grep — c'est probablement un wrapper d'envoi de tracking côté shipment (pas analytics produit). À confirmer.

### Problèmes identifiés

| Sévérité | Problème | Fichier(s) concerné(s) | Impact |
|---|---|---|---|
| **Élevée** | **Aucun outil d'observabilité produit** (Sentry, PostHog, etc.). Si un user a une erreur en prod, le founder ne le sait pas. Pas de funnel analytics, pas d'erreur agrégation, pas de session replay. | absence | Bugs prod invisibles. Pas de data pour décisions produit. Critique en Phase 1 où plein de nouvelles features arrivent. |
| **Élevée** | **`send-review-requests` pg_cron job 1 fait actuellement 401** (vu logs Thème 1) sans alerte. Le founder ne le sait probablement pas. C'est un exemple typique de cron broken silencieusement → pas d'observabilité. | `cron.job` jobid=1, `supabase/functions/send-review-request/index.ts` | Reviews jamais demandées. Conversion data perdue. Bug invisible. |
| **Élevée** | **107 + 27 `console.log/error/warn`** sans logger structuré ni transport externe. En prod : la majorité des logs front-end sont perdus (browser console fermée). Edge functions logs visibles seulement via Supabase Studio. | 50 fichiers cumulés | Debug post-mortem impossible. Pas de search/filter sur les erreurs. |
| **Moyenne** | **Pas d'`window.onerror` ni `unhandledrejection` handler** côté front. Erreurs JS non capturées passent inaperçues. | `src/main.tsx`, `src/App.tsx` | Crash silencieux. |
| **Moyenne** | **Pas d'uptime monitoring**. Si terrassea.com est down, le founder le découvre par accident. | absence | Downtime invisible. |
| **Moyenne** | **Pas d'alerting cron**. Si `daily-reminders` échoue silencieusement, personne n'est notifié. | `cron.job` (3 jobs) | Régression silencieuse. |
| **Moyenne** | **`ErrorBoundary` racine seulement**. Une erreur dans `Admin` provoque blank page complète plutôt que blank section. (Déjà noté Thème 5.) | `src/App.tsx` | Mauvais UX. |
| **Basse** | `console.error` utilisés à la place d'un logger qui pourrait préfixer (`[Auth]`, `[Stripe]`, etc.). Quelques fichiers le font (`AuthContext.tsx` : `[Auth] Failed to fetch ...`), pas systématique. | divers | Cosmétique mais aide debug. |

### Points forts

- **`ErrorBoundary` racine** présent (mieux que rien).
- **Supabase Edge logs** accessibles via MCP — utiles pour debug.
- **Vercel deploy logs** intégrés au dashboard.
- **`AuthContext.tsx`** utilise un préfixe `[Auth]` cohérent → bonne pratique à généraliser.
- **`vercel.json` security headers** + `Strict-Transport-Security` → couche défensive solide.
- **`stripe-webhook`** logge `console.error` aux bons endroits (signature invalid, erreurs DB) → trace claire.

### Recommandations priorisées

1. **P0 — Sentry** (effort : 2 h). `@sentry/react` côté front + `@sentry/deno` côté edge functions. Free tier suffit jusqu'à 5k events/mois. ROI gigantesque : tout crash prod remonte avec stack trace, breadcrumbs, browser context. **Sans cet outil, la Phase 1 sera aveugle.**
2. **P0 — Investiguer `send-review-requests` 401** (effort : 30 min). Vu dans logs Thème 1. Soit fix la function pour accepter l'auth, soit fix le cron pour passer un secret. À décider en même temps que le pattern `check-abandoned-carts`.
3. **P1 — PostHog ou Plausible** (effort : 2 h). Analytics produit basique : pageviews, conversion funnel signup→quote→checkout. Plausible si privacy-first (RGPD-friendly). PostHog si feature flags + session replay voulus. Décision business à arbitrer founder.
4. **P1 — Logger structuré** (effort : 1 j). Wrapper `src/lib/logger.ts` avec preset `[Module] message {context}`. Remplacer les 107 `console.*` côté front. Côté edge functions : pareil. Bénéfice : grep facile, prefix cohérent, futur transport vers Sentry.
5. **P1 — `window.addEventListener('error')` + `unhandledrejection`** (effort : 30 min). Catcher global → forwarder vers Sentry. Réduit les crashes silencieux.
6. **P1 — `ErrorBoundary` par section** (déjà recommandé Thème 5 P2). Rappel.
7. **P2 — Uptime monitoring externe** (effort : 30 min). UptimeRobot free tier sur `https://terrassea.com/api/health` (à créer). Alerte SMS / email si down 5 min.
8. **P2 — Alerting cron** (effort : 2-3 h). Wrapper qui ping un endpoint healthcheck (BetterStack Heartbeats, Cronitor) à chaque run. Si pas de ping en N minutes → alerte.
9. **P3 — Dashboard `/admin?tab=health`** (effort : 1 j). Pour le founder : statut Stripe, Supabase, edge functions, last cron runs. Quick visibility.

---

## 10. Documentation & Maintenabilité

### État observé

**`README.md`** (racine)
- **74 lignes, contenu Lovable boilerplate.** Mentions `https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID` (URL templated jamais remplacée), `npm i / npm run dev` (alors que le projet utilise `bun`), instructions GitHub Codespaces et "Use Lovable" comme première option.
- **Aucune référence** à : Terrassea, B2B furniture, architecture, stack réelle, contributing, déploiement Vercel, env vars requises, comment lancer Supabase local.
- **Inutile pour un dev arrivant**, et factuellement faux (npm vs bun).

**`CLAUDE.md`** (racine)
- ✅ **Refait correctement le 2026-04-29** (199 lignes, index version actuelle = `d1de4be`+`6e5e9c5`). Documente stack, repo layout, engine, edge functions, tables, partner plans, architects, routing, conventions, tech debt connu.

**`docs/audit/2026-04/`** (créé pendant cet audit)
- `RECON.md` (557 lignes) : reconnaissance complète.
- `STRATEGIC_DECISIONS.md` (36 lignes) : log append-only.
- `HOTFIX_RLS_PROSPECTS.md` (417 lignes) : doc complète du hotfix RLS.
- `DRIFT_PROD_FUNCTIONS.md` (~ 280 lignes) : doc complète du drift code/prod.
- `AUDIT.md` (en cours) : audit thématique.

**Documentation per-feature**
- 3 `README.md` créés aujourd'hui dans `supabase/functions/<chatbot|analyze-terrace|check-abandoned-carts>/` (purpose, secrets, tables, follow-ups). **Premier exemple de docs per-edge-function du repo.**
- Aucun autre `README.md` dans `supabase/functions/` (10 functions sans doc).
- Aucune doc dans `src/engine/` malgré sa centralité (10 modules de logique métier).
- Aucun `ARCHITECTURE.md` ou diagramme.

**Commentaires dans le code**
- `src/integrations/supabase/client.ts:8-9` : 2 lignes utiles ("Import the supabase client like this:").
- `src/contexts/AuthContext.tsx:68-78` : commentaire utile expliquant le pourquoi du `detectedRecovery` synchronous.
- Migrations SQL : très bien documentées (entête de chaque migration commente le contexte, ex. `20260411100000_restrict_user_profiles_self_update.sql`).
- Edge functions : commentaires utiles dans `stripe-webhook` (idempotency comments), `is_admin()` migration.
- Engines : pas beaucoup de commentaires inline ; tests servent de doc.

**Commits**
- `git log` montre des messages descriptifs (cf. `Fix quote system: 39 issues across 3 phases`, `Full platform audit: security, performance, ...`). Pattern emergent mais pas conventionnel commits ou similar.

**Conventions documentées**
- Naming files : pas de doc explicite mais cohérent (PascalCase pour composants, camelCase pour hooks/lib, snake_case pour SQL).
- Path alias `@/` : documenté dans `CLAUDE.md`.
- Pas de `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`.

**`.github/`**
- Juste `workflows/ci.yml`. Pas de templates issue/PR.

### Problèmes identifiés

| Sévérité | Problème | Fichier(s) concerné(s) | Impact |
|---|---|---|---|
| **Élevée** | **`README.md` racine = template Lovable jamais customisé.** Mentions de `npm i` (faux), URL `REPLACE_WITH_PROJECT_ID` littérale, "Use Lovable" comme première option. Aucune info sur le projet, la stack, le déploiement, les env vars. Le README est vu en premier sur GitHub. | `README.md` | Mauvaise impression première (recruteurs/contributeurs/investisseurs). Pas un guide démarrage utile. |
| **Moyenne** | **0 doc dans `supabase/functions/`** sauf les 3 créées aujourd'hui. 10 autres edge functions sans README — purpose, secrets, tables touchées, callers tous implicites. | `supabase/functions/{analyze-csv-products, analyze-product-image, auto-workflow, enrich-products, merge-descriptions, run-scheduled-tasks, send-notification-email, send-quote-notification, send-review-request, stock-sync-webhook, stripe-checkout, stripe-webhook}/` | Onboarding edge functions opaque. Maintenance plus lente. |
| **Moyenne** | **0 doc dans `src/engine/`** (10 modules, ~ 6000 lignes de logique métier). Pas d'`ARCHITECTURE.md`, pas de diagramme du flow `intentDetector → projectEngine → supplierEngine`. | `src/engine/` | Le cœur métier est compréhensible seulement via lecture du code. |
| **Moyenne** | **Pas de `CONTRIBUTING.md` / `SECURITY.md`**. Inutile en mode solo founder mais devient bloquant à l'arrivée d'un 2e contributeur. | `.github/`, racine | Onboarding futur. |
| **Moyenne** | **Pas de templates issue / PR** dans `.github/`. | `.github/` | Discipline review/issue moins forte. |
| **Basse** | Commentaires inline rares dans engines. Le test sert de doc mais un futur dev devra lire 1966 lignes de `projectEngine.ts` pour comprendre la séquence. | `src/engine/projectEngine.ts` | Apprentissage lent. |
| **Basse** | Pas de convention de commit explicite (Conventional Commits). Messages quand même descriptifs. | git | Nice-to-have. |

### Points forts

- **`CLAUDE.md` actuel** : excellent niveau de détail, à jour, source unique de vérité.
- **Migrations SQL extrêmement bien commentées** (entêtes contextualisés).
- **`src/contexts/AuthContext.tsx`** : commentaires pédagogiques sur les race conditions PASSWORD_RECOVERY.
- **`stripe-webhook/index.ts`** : commentaires "IDEMPOTENCY", "Atomic update" → bonne hygiène défensive.
- **3 READMEs edge functions créés aujourd'hui** : pattern à généraliser.
- **`docs/audit/2026-04/`** : 4 docs (RECON, STRATEGIC, HOTFIX, DRIFT, AUDIT) créés en parallèle, traçabilité parfaite.
- **Messages de commits descriptifs** : facile à reconstruire l'historique.
- **`is_admin()` migration documente le pourquoi du `SECURITY DEFINER`** (évite circular RLS).

### Recommandations priorisées

1. **P0 — Réécrire `README.md`** (effort : 1-2 h). Sections : 1-line pitch (B2B outdoor furniture sourcing for hospitality), stack résumée, quickstart `bun install` / `bun run dev`, env vars (`.env.example` reference), structure repo (renvoi `CLAUDE.md`), déploiement Vercel/Supabase, lien `docs/audit/2026-04/`. Supprimer toutes les mentions Lovable périmées.
2. **P1 — Étendre le pattern README aux 10 autres edge functions** (effort : 2-3 h). Format aligné sur les 3 d'aujourd'hui. Priorité aux critiques (`stripe-webhook`, `auto-workflow`).
3. **P1 — `ARCHITECTURE.md` 1 page** (effort : 1-2 h). Diagramme ASCII ou Mermaid : front (React) → Supabase (DB + Edge + Auth + Storage) → Vercel (cron + serverless) → Stripe / Anthropic. Flux key : project_builder → projectEngine → BOM → suppliers → quote_request → notifications → stripe-checkout. Aide tout futur agent ou contributeur.
4. **P2 — `SECURITY.md`** (effort : 30 min). Politique de divulgation responsable (email contact), périmètre, scope (in vs out). Pré-requis pour bug bounty futur ou audit externe.
5. **P2 — Templates issue / PR** (effort : 30 min). `.github/ISSUE_TEMPLATE/bug_report.md`, `.github/PULL_REQUEST_TEMPLATE.md`. Discipline review + lien CLAUDE.md/AUDIT/etc.
6. **P3 — Conventional Commits** (effort : 0). Adopter manuellement (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`). Le commit `chore(supabase): align config.toml ...` d'aujourd'hui suit déjà ce pattern.
7. **P3 — Commentaires inline `src/engine/`** (effort : 0.5-1 j). Headers de section dans les 10 modules engine. Pas de micro-comments par fonction (les noms parlent), mais 1 paragraphe doc en haut du fichier.

---

## Note sur `TRIGGER_SECRET` (vérification 1 du Thème 1)

Au moment de boucler le bloc 3, le founder n'a pas encore renvoyé son verdict sur la présence de `TRIGGER_SECRET` côté Supabase Studio Edge Functions Secrets. La sévérité finale du fallback hardcodé `"terrassea-trigger-secret-change-me"` (`send-quote-notification:7`) reste **conditionnelle à confirmer** :
- Si var configurée prod → **Moyenne** (fallback inactif, mais mauvais pattern à corriger).
- Si var non configurée → **Critique** (spoofing possible, à fix urgent).

À mettre à jour dans la synthèse Étape 3.
