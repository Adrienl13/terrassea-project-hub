# AUDIT — Plan d'action 3 buckets

**Date :** 2026-04-29
**Cadrage stratégique** :
- Salone fini 27 avril 2026, 50 contacts à relancer mi-juin.
- Chantiers produits **5 mai → 8 juin** (5 semaines) sur 5 catégories prioritaires : Tables, Parasols, Sun Loungers, Sofas, Bar Stools. Deux chantiers en parallèle : (a) champs critiques + vocabulaire 2026, (b) engine par catégorie.
- Architectes gratuits jusqu'à fin 2026 (cf. `STRATEGIC_DECISIONS.md`).
- Runway 3-6 mois ; fundraising en parallèle. Tout ce qui ne contribue pas à signer des marques d'ici juillet OU au dossier fundraising est reporté.

**Companion docs** : `AUDIT.md`, `AUDIT_SYNTHESE.md`.

---

## 🔴 BUCKET 1 — PRÉ-CHANTIERS PRODUITS (à finir avant le 5 mai)

**Règle** : maximum 5 items, chacun ≤ 1 jour. Critère d'inclusion : sécurité active OU bloquant onboarding marques OU pré-requis technique aux chantiers produits OU bloquant fundraising materials.

**Note founder 2026-04-29** : item observabilité (Sentry + Plausible + Better Uptime) initialement B1.4 a été reclassé en **B2 semaine 1** (5-11 mai). Décalage de quelques jours acceptable, pas critique. Bucket 1 passe donc à **4 items**.

### B1.1 — Vérifier `TRIGGER_SECRET` en prod (sécurité)

| | |
|---|---|
| **Sévérité** | Critique conditionnelle |
| **Effort** | 5 min vérif + 30 min fix si nécessaire |
| **Pourquoi B1** | Le code de `send-quote-notification:7` contient un fallback hardcodé `"terrassea-trigger-secret-change-me"`. Si la var d'env n'est pas set en prod, ce string est actif → spoofing possible. Le quote workflow est sur le chemin commercial direct. À résoudre avant relance Salone. |
| **Action concrète** | **DÉCISION FOUNDER REQUISE** : aller dans Supabase Studio → Edge Functions → `send-quote-notification` → Secrets. Si `TRIGGER_SECRET` est présente : durcir le code (`throw` au boot si vide) en P3. Si absente : générer `openssl rand -hex 32`, set comme secret. Mettre à jour le pg_cron caller en conséquence si applicable. |
| **Critère de succès** | `TRIGGER_SECRET` présente comme secret edge function ; test manuel de spoofing avec l'ancien fallback string échoue (401). |

### B1.2 — Supprimer `Terrassea-Production` edge function (drift résiduel)

| | |
|---|---|
| **Sévérité** | Basse (mais résiduelle) |
| **Effort** | 30 secondes |
| **Pourquoi B1** | Drift code/prod restant. MCP Supabase n'expose pas `delete_edge_function`. Le founder seul peut le faire via Studio. Cosmétique mais clôture le drift à 100 %. |
| **Action concrète** | **DÉCISION FOUNDER REQUISE** : Supabase Studio → Edge Functions → `Terrassea-Production` → Delete. Aucun risque (vérifié : 0 occurrence dans `src/`, `api/`, `vercel.json`, c'est le hello world template). |
| **Critère de succès** | `mcp__supabase__list_edge_functions` retourne 14 fonctions au lieu de 15. |

### B1.3 — RLS lockdown `salone_2026_visits` (sécurité PRÉVENTIVE avant alimentation)

| | |
|---|---|
| **Sévérité** | Élevée |
| **Effort** | 30 min |
| **Pourquoi B1** | Table actuellement vide MAIS le founder s'apprête à y inscrire les **50 contacts post-Salone** dans les jours qui viennent. Policy actuelle : `Allow all anon FOR ALL USING (true) WITH CHECK (true)` → SELECT/INSERT/UPDATE/DELETE ouverts à tous anonymement. Schéma contient PII : `prenom`, `nom`, `mail`, `poste`, `notes`. **Si on insère les 50 contacts avant fix → fuite RGPD active.** |
| **Action concrète** | Migration `supabase/migrations/2026050X..._lockdown_salone_2026_visits.sql` : DROP policy `Allow all anon`, CREATE 4 policies admin-only via `public.is_admin()` (pattern identique au hotfix prospects du 2026-04-29). Tester via `pg_net` post-déploiement. |
| **Critère de succès** | Test `SET LOCAL ROLE anon; SELECT count(*) FROM salone_2026_visits;` retourne 0. `mcp__supabase__get_advisors` ne signale plus d'`rls_policy_always_true` sur cette table. |

### B1.4 — Réécrire `README.md` (fundraising / onboarding externe)

| | |
|---|---|
| **Sévérité** | Moyenne (mais bloquante pour fundraising) |
| **Effort** | 1-2 h |
| **Pourquoi B1** | Vu en premier sur GitHub par recruteurs / VCs / contributeurs potentiels. Actuellement = template Lovable jamais customisé (URL `REPLACE_WITH_PROJECT_ID`, mention `npm i` au lieu de bun, "Use Lovable" comme première option). Mauvaise impression directe. Bloquant pour transmettre le repo au due diligence d'un VC. |
| **Action concrète** | Réécrire avec : 1-line pitch (B2B outdoor furniture sourcing), stack résumée, quickstart `bun install` / `bun run dev`, env vars (`.env.example`), structure repo (renvoi `CLAUDE.md`), déploiement Vercel/Supabase, lien `docs/audit/2026-04/`. Supprimer mentions Lovable. |
| **Critère de succès** | Ouverture du repo sur GitHub → visiteur comprend en 30 secondes ce qu'est Terrassea, comment le lancer en local, où sont les docs principales. |

**Effort cumulé Bucket 1 : ~ 0.5-1 jour** (B1.1 + B1.2 = quelques minutes ; B1.3 = 30 min ; B1.4 = 1-2 h).

---

## 🟡 BUCKET 2 — INTÉGRÉ OU PARALLÈLE AUX CHANTIERS PRODUITS (5 mai → 8 juin)

**Règle** : max 10 items + 1 reclassé du Bucket 1 (observabilité). Critère : sert directement la qualité de la démo commerciale OU touche au schéma produits / Engine / taxonomie OU consolide les Bucket 1.

### B2.0 — Installer 3 outils observabilité (Sentry + Plausible + Better Uptime) — RECLASSÉ DEPUIS B1

| Quand | Action | Critère |
|---|---|---|
| **Semaine 1 (5-11 mai)**, parallèle au démarrage chantiers produits | `bun add @sentry/react @sentry/vite-plugin` + Sentry init dans `main.tsx`. Plausible : `<script>` dans `index.html`. Better Uptime : créer endpoint `/api/health` 5 lignes + monitor sur URL prod. Détails dans section "Quick wins observabilité" plus bas. | (a) Throw test apparaît dans Sentry. (b) Visite `/products` dans Plausible. (c) Better Uptime ping `/api/health` toutes les 5 min UP. |

### B2.1 — Fix `send-review-requests` cron 401 silencieux

| Quand | Action | Critère |
|---|---|---|
| Semaine 1 (5-11 mai), au passage du chantier 1 | Lire `supabase/functions/send-review-request/index.ts`, identifier l'auth attendue, mettre à jour le pg_cron `jobid=1` pour passer le bon header (cf. pattern recommandé pour `check-abandoned-carts`). | `mcp__supabase__get_logs(edge-function)` montre POST 200 sur `send-review-request` après next run 10:00 UTC. |

### B2.2 — Ajouter les 7 FK uuid manquantes vers `products` / `user_profiles`

| Quand | Action | Critère |
|---|---|---|
| Pendant chantier 1 (champs critiques produits) | Migration unique `2026050X..._add_missing_fk_to_products.sql` ajoutant FK avec `ON DELETE` adapté (`SET NULL` ou `RESTRICT` selon table) sur `board_items.product_id`, `concept_events.product_id`, `orders.product_id`, `partner_arrival_items.product_id`, `preorders.product_id`, `project_zone_products.product_id`, `pro_service_events.actor_id`. | `mcp__supabase__get_advisors(performance)` ne signale plus `unindexed_foreign_keys` sur ces colonnes (FK auto-indexée). |

### B2.3 — Fix les 7 policies `auth_rls_initplan`

| Quand | Action | Critère |
|---|---|---|
| Pendant chantier 2 (engine catégories) | Migration `2026050X..._fix_auth_rls_initplan.sql` : DROP + CREATE des 7 policies impactées sur `products`, `quote_documents` (×2), `product_reviews` (×4) en remplaçant `auth.uid() = ...` par `(SELECT auth.uid()) = ...`. | Advisors performance : 0 occurrence `auth_rls_initplan`. Latence query catalogue produits réduite (mesure avant/après si possible). |

### B2.4 — Storage `product-images` scoping par `partner_id`

| Quand | Action | Critère |
|---|---|---|
| Pendant chantier 1 si nouveaux uploads | Réécrire les 3 policies storage.objects pour conditionner sur `(storage.foldername(name))[1] = partner_id::text`. Tester avec 2 partenaires factices. | Test : un partner authentifié ne peut PAS écraser/delete les images d'un autre partner. |

### B2.5 — Logger structuré `src/lib/logger.ts` + `window.onerror` + `unhandledrejection` → Sentry

| Quand | Action | Critère |
|---|---|---|
| Semaine 1 après B1.4 Sentry installé | Helper `logger.info/warn/error/debug` avec préfixe `[Module]`. Forwarding auto vers Sentry sur `error`. Remplacer les 107 `console.*` en `src/` par `logger.*` (en deux passes : 50 fichiers en semaine 1, le reste en semaine 4). | 0 `console.*` direct dans `src/` (sauf cas justifiés ESLint-disabled). Sentry capture les erreurs unhandled JavaScript. |

### B2.6 — 5 smoke tests E2E Playwright (sentinelles avant démo)

| Quand | Action | Critère |
|---|---|---|
| Semaine 4-5, avant relance commerciale | (a) signup client → project → quote, (b) login admin → approve partner_application, (c) login partner → upload product, (d) checkout Stripe success path, (e) chatbot anon. Lancer dans CI sur PR. Désouscrire `lovable-agent-playwright-config` si pas utilisable, partir d'une config Playwright minimale interne. | Les 5 specs passent en CI. Échec d'un test fait fail le merge. |

### B2.7 — Quick wins sécurité × 2 (`update_product_review_timestamp` search_path + cleanup 3 lockfiles)

| Quand | Action | Critère |
|---|---|---|
| À tout moment (15 min combiné) | (a) `ALTER FUNCTION public.update_product_review_timestamp() SET search_path = public;` via migration. (b) Supprimer `bun.lockb` et `package-lock.json`, garder `bun.lock`. Documenter dans `CLAUDE.md`. | (a) Advisor `function_search_path_mutable` disparu. (b) `git ls-files` ne liste plus que `bun.lock`. |

### B2.8 — Refactor amorce `useArchitectProjects` (préparer chantiers architectes futurs)

| Quand | Action | Critère |
|---|---|---|
| Semaine 5 (post-chantiers prioritaires) | Splitter en 3 hooks plus petits : `useArchitectProjectsList`, `useArchitectProjectMutations`, `useArchitectProjectDetails`. Réduire de 925 lignes à 3 × ~ 300. Pas de changement de comportement. | Tests existants passent toujours (153/153). Le god component disparaît. |

### B2.9 — README pour les 10 edge functions restantes

| Quand | Action | Critère |
|---|---|---|
| Semaine 4-5 (en parallèle de B2.6 tests E2E) | Pattern aligné sur les 3 READMEs créés le 2026-04-29 : purpose, secrets, tables touchées, callers, follow-ups. Priorité : `stripe-webhook`, `auto-workflow`, `analyze-product-image`, `enrich-products`. | 13/13 edge functions ont leur `README.md`. |

### B2.10 — Activer `vitest --coverage` + baseline coverage

| Quand | Action | Critère |
|---|---|---|
| Semaine 1 ou 2 (quick win) | Ajouter script `bun run test:coverage` qui lance `vitest --coverage` (provider `v8`), baseline initial inscrit dans `AUDIT_ACTIONS.md` ou un nouveau fichier. | Coverage rapport HTML/JSON généré, baseline numérique connu pour `src/engine/`, `src/lib/`, `src/hooks/`. |

**Effort cumulé Bucket 2 : ~ 8-12 jours sur 5 semaines, soit ~ 2 j/semaine en parallèle des chantiers produits. Réaliste si certains items (B2.2, B2.3, B2.4) sont **intégrés** aux chantiers plutôt que faits "à côté".**

---

## 🟢 BUCKET 3 — POST-RELANCE SALONE (juillet 2026 et après)

À programmer une fois les premières marques signées et runway étendu (fundraising réussi ou cash variable généré). Aucun item bloquant les chantiers ni la relance.

### Tableau récapitulatif par catégorie

| Catégorie | Items |
|---|---|
| **Sécurité** | Storage `mood-images` scoping owner • Captcha (Turnstile) sur signup/login + forms publics • 2FA admin (TOTP Supabase) • `localStorage` → `cookieStorage` migration • Vérifier Supabase Auth Site URL + Redirect URLs allowlist • Rate limiting forms publics (`partner_contact_requests`, `pro_service_requests`, `project_briefs`, etc.) • Cleanup bucket `quotedocuments` doublon • Standardiser `Deno.env.get()` fail-closed (`requireEnv()` helper) |
| **Backend Supabase** | Consolider 619 `multiple_permissive_policies` (pattern `is_admin() OR owner_check`) • `trg_refresh_product_review_stats` → asynchrone (cron à la place de trigger AFTER) • Audit 106 `unused_index` à 6 mois • Compléter `supabase/config.toml` (auth/db/api options) • Vérifier `trg_partner_upgrade` double-trigger (INSERT + UPDATE) |
| **Frontend & Architecture** | Refactor god components (Admin.tsx 2347 lignes, ArchitectSections.tsx 2743, ClientSections.tsx 2072, ProServiceClientHub.tsx 2118, ExcelImportModal.tsx 1553, AddProductForm.tsx 1307, ProServiceArchitectHub.tsx 1265, AdminBrandManagement.tsx 1216, Account.tsx 1033) • Cleanup doublon `use-toast.ts` • Aligner `useProServiceStore` sur le pattern repo • `ErrorBoundary` par section (pas juste racine) • Introduire `src/services/` pour règles cross-cutting • Splitter `ExcelImportModal` (logique vers `src/lib/excelImporter.ts`) • `ts-prune` pour code mort • `madge` pour circular imports |
| **Tests** | Tests hooks critiques (`usePaymentFlow`, `useProductSubmissions`, `useOrders`) • Tests `src/lib/` (`partnerConstants`, `searchNormalizer`, `productQualityScore`) • Tests edge functions Deno (`deno test`) • Tests intégration engine ↔ Supabase (DB de test) • Factoriser `mockProduct` factory |
| **Performance** | Analyse `index.js` 828 KB via `vite-bundle-visualizer` • Sub-routing Admin et Account (chaque tab lazy) • Audit N+1 dans `useArchitectProjects` (49 `.from()`) • Vérifier lazy de `pdf-lib` et `xlsx` • Virtualization listes longues (`@tanstack/react-virtual`) • Optimisation images (Supabase Image Transform + `loading="lazy"`) • Centraliser `.from()` du `Admin.tsx` dans hooks dédiés • Lighthouse audit (LCP/INP/CLS réels) • Évaluer `motion-one` vs `framer-motion` |
| **Observabilité avancée** | PostHog ou Plausible+ (selon décision business) • Alerting cron (BetterStack Heartbeats / Cronitor sur les 3 pg_cron jobs + Vercel cron) • Dashboard `/admin?tab=health` (statut Stripe, Supabase, edge fns, last cron runs) |
| **Documentation** | `ARCHITECTURE.md` 1 page (diagramme front ↔ Supabase ↔ Vercel ↔ Stripe/Anthropic) • `SECURITY.md` (politique de divulgation responsable) • Templates issue / PR `.github/` • Commentaires inline `src/engine/` (headers de section) • Adopter Conventional Commits explicitement |
| **Dépendances** | `bun audit` trimestriel • Renovate ou Dependabot config • Décision Lovable couplage (`lovable-tagger`, `lovable-agent-playwright-config`) • Plan migration Tailwind 4 / React 19 (2027) • Cleanup `react-day-picker` v8 → v9 |
| **Configuration & tooling** | TS strict progressif (`strictNullChecks: true` → `noImplicitAny: true` → `strict: true`) • ESLint `@typescript-eslint/no-explicit-any: warn` puis `error` • Pre-commit hook (`simple-git-hooks` ou `lefthook`) • Prettier explicite (`.prettierrc`) • Décider sort de Playwright (config interne ou suppression) • Inclure `api/` et `supabase/functions/` dans tsconfig + ESLint avec globals appropriés • Cleanup résidus (`brief-brand-system.md/`, `supabase/.temp/`) |
| **Ops** | Migration tests Stripe (bascule test → live mode si pas déjà fait) • Backup DB plan • RGPD audit base légale 114 lignes prospects (chantier séparé déjà décidé founder) |

**Total Bucket 3** : ~ 60 items, 30-40 j cumulés, à étaler sur 6-12 mois. **Aucun ne bloque la relance commerciale ni les chantiers produits.**

---

## ⭐ Quick wins observabilité (B1.4 détaillé)

3 outils gratuits / cheap à installer en moins de 2h chacun avant le 5 mai. Sans ces outils, Phase 1 démarre aveugle.

### Outil 1 — Sentry (error tracking)

| | |
|---|---|
| **Plan** | Free tier (5 000 errors/month, suffisant en early stage) |
| **Setup** | `bun add @sentry/react @sentry/vite-plugin`. Ajouter `Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN })` dans `src/main.tsx`. Wrapper `<Sentry.ErrorBoundary>` autour de `<App />`. Ajouter VITE_SENTRY_DSN à `.env.example`. |
| **Test** | Throw `new Error("Sentry test")` depuis un bouton dev → apparaît dans Sentry dashboard. |
| **Bonus** | Ajouter `@sentry/deno` côté edge functions critiques (`stripe-webhook`, `auto-workflow`) pour tracker les erreurs serveur aussi. |
| **Effort** | 1.5 h front + 1 h edge = 2.5 h |

### Outil 2 — Plausible (analytics privacy-first)

| | |
|---|---|
| **Plan** | €9/mois pour 1 site (ou self-host gratuit sur Vercel). RGPD-friendly, pas de cookie. |
| **Setup** | `<script defer data-domain="terrassea.com" src="https://plausible.io/js/script.js"></script>` dans `index.html`. Pas de SDK, pas de wrapper React. |
| **Test** | Visite manuelle de `/products` → apparaît dans Plausible dashboard 5 min plus tard. |
| **Bonus** | Custom events via `plausible('Quote Submitted', { props: { plan: 'starter' } })` pour le funnel. |
| **Effort** | 30 min |

### Outil 3 — Better Uptime / UptimeRobot (monitoring)

| | |
|---|---|
| **Plan** | UptimeRobot free (50 monitors, check toutes les 5 min, email alerts). Better Uptime free 10 monitors. |
| **Setup** | Créer endpoint `/api/health` (Vercel function 5 lignes : retourne 200 si Supabase répond, 500 sinon). Configurer monitor sur l'URL prod + alerte SMS/email founder. |
| **Test** | Couper temporairement `/api/health` → alerte reçue en < 10 min. |
| **Bonus** | Ajouter heartbeats sur les 3 pg_cron jobs (Bucket 3, mais peut être amorcé maintenant). |
| **Effort** | 1 h |

---

## 💼 Pour le dossier fundraising (3-5 arguments tech positifs)

Éléments du codebase utilisables comme preuves de discipline tech dans un pitch ou data room VC.

1. **Engine déterministe quasi-zéro `any`** (6/4759+ lignes ≈ 0.1 %) avec **153 tests automatisés tous verts**. Cœur métier (génération de concepts produit, BOM, multi-zone, compliance) testable et maintenable. Différenciateur vs marketplaces concurrentes "PHP + jQuery".

2. **Sécurité DB rigoureuse**. **66 tables protégées par RLS** post-hotfix 2026-04-29 (audit doc traçable). Helper `public.is_admin()` SECURITY DEFINER avec `search_path` durci. **47 migrations versionnées** dans Git pour reproducibilité. Trigger anti-escalation de privilège user→admin.

3. **Paiements Stripe production-grade**. `stripe-webhook` implémente HMAC SHA-256, idempotency, atomic updates avec `is null` checks (voir `supabase/functions/stripe-webhook/index.ts`). Code reviewable par due diligence VC.

4. **Pipeline CI/CD bloquante**. GitHub Actions sur push/PR `main` : lint + `tsc --noEmit` + 153 tests + build. Vercel + Supabase Edge runtime. Bundles split (8 vendors chunks).

5. **Audit complet documenté**. `docs/audit/2026-04/` (RECON, AUDIT thématique 10 sujets, plan 3 buckets, hotfix RLS, drift résolu, décisions stratégiques) — ~ 2700 lignes de documentation structurée. Signal de discipline opérationnelle utilisable directement en data room.

---

## 🎬 Risques persistants à divulguer en démo (transparence préventive)

Défauts qui pourraient apparaître pendant une démo live et qu'il vaut mieux mentionner en proactif plutôt que se faire surprendre.

| Risque | Quoi mentionner |
|---|---|
| **5 catégories couvertes en v2 (Tables, Parasols, Sun Loungers, Sofas, Bar Stools)** | "Notre engine 2026 couvre ces 5 catégories en profondeur — vocabulaire, champs critiques, scoring. Les autres catégories (Pergolas, Heating, Cocoon, etc.) sont encore en v1 et seront upgradées en Phase 2 post-juillet." |
| **Performance bundle** | Si la démo se fait sur 4G ou wifi médiocre : LCP estimé > 2.5 s sur la home (chunk `index.js` 828 KB). Tester sur ton hardware réel avant la démo. Sub-routing Admin/Account améliore en interne. |
| **Tests E2E absents (jusqu'au B2.6)** | Si une démarche d'audit tech vient d'un prospect technique : "Tests unitaires solides sur le moteur métier (153 tests engine), tests E2E en cours d'implémentation pour les flows critiques." Ne pas mentir : ne pas dire "tests E2E complets". |
| **Observabilité fraîche (Sentry installé semaine d'avant)** | Si on demande "comment vous suivez la santé en prod" : "Sentry pour les erreurs, Plausible pour l'analytics, Better Uptime pour la disponibilité, déployés en avril 2026." OK et sincère. |
| **Architectes en accès gratuit** | À mentionner si pertinent : "Notre tier architecte est volontairement gratuit en 2026 pour constituer le volume critique (cf. notre log de décisions stratégiques). Monétisation prévue 2027 sur 3 critères mesurables." Sincère + structuré. |
| **Chatbot expérimental** | Le chatbot (Anthropic Haiku) est déployé mais 0 usage à date. Si démo : montrer en conditions contrôlées (1 session connue). Ne pas vanter "des centaines d'utilisateurs". |
| **`useArchitectProjects` 925 lignes** | Si le prospect explore le repo : "Hook gros à refactor, planifié post-relance." Ne pas mentir sur la dette. |

---

## ✅ Statut audit — fin Phase 1

| Étape | Statut | Doc |
|---|---|---|
| ÉTAPE 1 — RECON | ✅ | `RECON.md` (561 lignes) |
| ÉTAPE 2 — AUDIT thématique | ✅ | `AUDIT.md` (760 lignes) |
| Hotfix RLS prospects | ✅ Déployé + committé | `HOTFIX_RLS_PROSPECTS.md` |
| Drift code/prod | ✅ Résolu (3 fonctions rapatriées + 1 à supprimer) | `DRIFT_PROD_FUNCTIONS.md` |
| ÉTAPE 3 — Synthèse transverse | ✅ | `AUDIT_SYNTHESE.md` |
| ÉTAPE 4 — Plan d'action | ✅ (ce doc) | `AUDIT_ACTIONS.md` |

**5 items Bucket 1 à finir avant 5 mai. 10 items Bucket 2 à intégrer aux chantiers 5 mai → 8 juin. ~ 60 items Bucket 3 à programmer post-relance.**

Audit clos sur ce plan d'action. Push à faire en fin de journée d'audit (rappel founder).
