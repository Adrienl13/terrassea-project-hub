# Audit BACKEND — Supabase, Edge Functions, API Vercel, drift prod
*Périmètre : `supabase/migrations/` (150 fichiers), `supabase/functions/` (19 fonctions), `api/` (4 fonctions Vercel), `supabase/config.toml`, état prod live (`gwgcfgeouropcighpztj`) via MCP lecture seule — 2026-07-29.*

## Synthèse

Le socle sécurité est réellement solide : **85/85 tables RLS-enabled, 257 policies**, fixes red-team visibles dans le code (signature Stripe avec fenêtre de tolérance + comparaison constant-time, idempotence paiements, escapeHtml systématique dans les emails, anti-open-redirect sur checkout). En revanche, l'audit révèle deux problèmes structurels majeurs **non documentés ou sous-estimés** : (1) **toute la chaîne asynchrone quote→assignation→relances→reviews est morte en silence** — les 4 callsites frontend d'`auto-workflow` tombent en 401, les 2 crons pg_cron cassés depuis mai (503/401 confirmés dans les logs d'aujourd'hui), et le cron Vercel appelle une edge function **jamais déployée** (404) ; (2) **le versionnement des migrations est structurellement cassé** : 228 migrations en prod vs 150 fichiers repo, avec ~108 migrations prod (toute la fondation de mars 2026 : orders, messaging, platform_settings, payment flow) sans **aucun** fichier repo, et 113 fichiers repo absents de `schema_migrations` — le repo ne peut pas reconstruire la prod. S'y ajoutent plusieurs bugs applicatifs neufs (colonnes inexistantes, compteurs NaN, budget IA inopérant).

## Forces

- **RLS exhaustif et mûri** : 0 table sans RLS, helper `is_admin()` généralisé, verrouillages red-team H1-H6/M1-M6 traçables dans les migrations et les commentaires de code.
- **stripe-webhook / stripe-checkout** : signature vérifiée serveur avec tolérance 300 s et compare constant-time, idempotence par `payment_intent` + update conditionnel `.is(..., null)` (anti-race), montants lus en DB jamais du client, allowlist de redirect URLs.
- **Trigger DB `auto_create_order_on_signature`** (Dette 74) : le chemin critique signature→order est transactionnel côté DB, complet (payment_reference, invoice_number, échéances), smoke-testé en prod.
- **Emails transactionnels via triggers DB + vault `EDGE_TRIGGER_SECRET`** (Dette 59) : pattern robuste, timeout pg_net monté à 15 s pour les cold starts.
- **Fonctions IA admin/partner-gated** (`analyze-product-image`, `analyze-csv-products`, `enrich-products`, `merge-descriptions`) : auth JWT + check `user_type` appliqués.
- **`invite-brand-partner`, `get-signed-cgv-url`, `record-founding-products-batch`** : gardes admin correctes, CORS allow-list echo, commentaires d'architecture sécurité de qualité.
- **Culture de documentation exceptionnelle** (DETTE_TECHNIQUE_AUDIT 2 599 lignes, PERF_IO_AUDIT mesuré à l'EXPLAIN ANALYZE) — le problème n'est pas la détection mais l'exécution des fixes documentés.

## Faiblesses / problèmes détectés

### CRITIQUE

1. **`auto-workflow` est inaccessible depuis le frontend → auto-assignation des devis jamais exécutée.** La fonction exige `Bearer SERVICE_ROLE_KEY` ou `X-Trigger-Secret` (`supabase/functions/auto-workflow/index.ts:470-482`), mais les 4 callsites utilisent `supabase.functions.invoke()` avec le JWT user → **401 systématique, avalé par `.catch(console.error)`** :
   - `src/pages/ProjectCart.tsx:406` et `src/components/products/QuoteRequestModal.tsx:186` (`auto_assign_partner`) → les quotes créés sans partner pré-assigné **ne sont jamais routés** (aucun trigger DB de remplacement — vérifié en prod : seuls `auto_create_order_on_signature` & co existent) ; le partner ne reçoit jamais l'email "nouvelle demande".
   - `src/components/admin/AdminOrderTracking.tsx:309` (`notify_order_shipped`) → **l'email d'expédition client n'est jamais envoyé**.
   - `ClientSections.tsx:1029` / `ArchitectSections.tsx:1258` (`auto_create_order` à l'acceptation) → 401 ; partiellement mitigé par le trigger à la *signature*, mais le flow "accepted sans signature" ne crée jamais d'order.
   Dette 59 a fixé les callsites `send-notification-email` mais **pas ceux d'`auto-workflow`** — bug identique, non documenté.

2. **Drift migrations repo ↔ prod systémique — le repo n'est plus la source de vérité du schéma.** Comparaison `supabase/migrations/` (150 fichiers) vs `list_migrations` prod (228 versions) : **113 fichiers repo absents de prod** (timestamps divergents car `apply_migration` ré-horodate à l'apply — la règle CLAUDE.md "même timestamp AVANT commit" est violée en masse depuis début mai) et **~108 migrations prod sans aucun fichier repo de même nom**, dont toute la fondation 2026-03-19→03-25 (`create_orders_and_payments_tracking`, `create_messaging_and_notifications`, `create_platform_settings`, `create_payment_flow_system_v2`, `setup_pg_cron_scheduled_reminders`, `create_chr_clients_table`, `create_prospects_activity_view`…). Pire : les 17 migrations UUID de mars présentes dans le repo référencent **un autre projet Supabase** (`cguffqiewducpbofdvff`, `20260318121239_...sql:14`). Conséquences : `supabase db reset`/`db push` inutilisables, staging (Dette 56) irréalisable sans réconciliation, dérive du type Dette 46 indétectable par revue de fichiers.

3. **Toute la couche cron/relances est morte — vérifiée live aujourd'hui (logs 24 h)** :
   - pg_cron job 1 `send-review-requests` (10:00) → **401 quotidien** (header Authorization absent — Dette 58, fix estimé 30 min, documenté le 2026-05-10, **toujours cassé 2,5 mois après**) → zéro review collectée depuis le lancement.
   - pg_cron job 2 `check-abandoned-carts` (*/6 h) → **503 à chaque exécution** (flag `ENABLE_ABANDONED_CARTS_CRON`/`CRON_SECRET` jamais posés — Dette 57).
   - Cron Vercel `/api/cron-reminders` (9:00, `vercel.json`) → appelle `run-scheduled-tasks`… **qui n'est pas déployée en prod** (absente de `list_edge_functions`) → 404 quotidien. Dette 61 la classait "hygiène Niveau 3", mais c'est **le seul porteur** des relances email partner 48 h / client 7 j / expiry 3 j **et de `expire_overdue_quotes`** → les devis n'expirent jamais (`validity_expires_at` non appliqué), sévérité largement sous-estimée.
   - Job 3 `daily-reminders` (`run_reminder_notifications`) fonctionne, mais son `INSERT INTO notifications ... ON CONFLICT DO NOTHING` n'a **aucune contrainte unique cible** → un partner avec un devis pending reçoit la **même notification in-app dupliquée chaque jour**.

### HAUTE

4. **Garde-fou budget chatbot inopérant** (`supabase/functions/chatbot/index.ts:214-221`) : le RPC `increment_chatbot_usage` **n'existe pas en prod** (vérifié `pg_proc`) et l'échec est avalé (`.catch(() => {})`) ; l'upsert `onConflict: "usage_date"` **écrase** `messages_count` à 1 à chaque message → le plafond mensuel (somme des `messages_count`) ne compte quasi rien → coût Anthropic non plafonné. En prime : `chatbot_max_messages_per_day` est fetché (l.116) mais **jamais appliqué**, et `chatbot_alert_threshold_percent` est utilisé (l.224) mais **jamais fetché** (toujours 80 par défaut).
5. **`check-abandoned-carts` insère dans `notifications` des colonnes inexistantes** — `message`, `action_url`, `is_read` (`index.ts:134-143`) alors que le schéma réel est `body`/`link`/`read_at` (vérifié en prod). Même une fois le cron ré-activé (Dette 57), **100 % des relances échoueront**. Non documenté.
6. **`analyze-terrace` = robinet à coûts Anthropic ouvert** : aucun auth applicatif, CORS `*`, aucune limite de taille sur `image_base64`, aucun quota/logging ; `verify_jwt=true` accepte l'**anon key publique** → n'importe qui peut invoquer Claude Sonnet vision en boucle. Les recommandations du 2026-04-29 (`DRIFT_PROD_FUNCTIONS.md`) n'ont jamais été implémentées alors que la fonction est passée v5→**v13** en prod.
7. **`stock-sync-webhook` : deux bugs de comptage silencieux** (`index.ts:193-239`) : (a) `count` est lu sur un `.update()` **sans** `{ count: "exact" }` → toujours `null` → un SKU inconnu passe dans la branche `else` et est **compté comme "updated"** (faux succès renvoyé au partenaire) ; (b) `total_syncs`/`consecutive_errors` ne sont pas dans le `select` initial → `undefined + 1 = NaN` → compteurs de monitoring écrasés. En outre les `terrassea_api_key` sont stockées **en clair** dans `partner_api_connections`.
8. **Advisors sécurité non résorbés / non re-documentés** : 2 **ERROR** `security_definer_view` sur `pro_service_partner_feed`/`pro_service_client_feed` (vérifiées : bien scopées `auth.uid()`, donc acceptables — mais absentes de la liste "faux positifs acceptés" du DETTE doc, antérieure à juin) ; **14** `function_search_path_mutable` (les helpers email Dette 59 : `render_transactional_email`, `_email_*`, `format_*_locale`… — la migration `security_search_path_hardening` ne les a pas couverts) vs 1 seul documenté ; `auth_leaked_password_protection` toujours off.

### MOYENNE

9. **`multiple_permissive_policies` : 682 entrées / 67 tables** (advisor du jour) vs 623/53 documentées — la dette **croît** à chaque nouveau module (pro_service, catalog_downloads, locations…).
10. **192 `unused_index`** ; le nettoyage d'index promis "~1 semaine après le 8 juin" (PERF_IO_AUDIT §4) n'a **pas été fait 7 semaines plus tard**, sur le même compute Nano dont le sur-indexage a causé la saturation IO du 6-8 juin. 347 index pour ~5 Mo de données.
11. **`verify_jwt` non versionné** : `supabase/config.toml` ne contient que `project_id` (1 ligne). L'état prod est hétérogène (true : `analyze-terrace`, `record-founding-products-batch` ; false : les 16 autres). Un redeploy CLI appliquerait les défauts → casserait `stripe-webhook` (doit rester false) ou désarmerait `analyze-terrace` (sa seule protection). Aucun `[functions.*]` déclaré.
12. **Nommage des secrets incohérent** : `TRIGGER_SECRET` (`send-quote-notification/index.ts:9`) vs `EDGE_TRIGGER_SECRET` (`send-notification-email`, `auto-workflow`) vs `CRON_SECRET` (`check-abandoned-carts`, `api/cron-reminders.ts`) — exactement le terreau des 4 mismatches du Bug #1 (Dette 72).
13. **`send-notification-email` fuite potentielle de clé** (`index.ts:82-87`) : la `RESEND_API_KEY` est envoyée en `Bearer` à **n'importe quelle** `notification_webhook_url` configurée, même non-Resend (le `else if` duplique la branche Resend).
14. **`catalog-download` sans rate-limit** : lead-spam illimité (`catalog_leads` + email au partner avec `reply_to` contrôlé par l'attaquant), énumération de `partner_id`. La recommandation "rate limiting" des RLS always-true acceptées n'est appliquée nulle part (aucune fonction n'a de rate limiting).
15. **`api/sitemap.ts:28` : slug légacy `sun-loungers`** (canonique 2026 = `loungers`) et catégorie `armchairs` absente ; le frontend (`Header.tsx:60`, `engine/types.ts:13`) vit encore en `sun-loungers` — la taxonomie vocab 2026 n'est alignée qu'en DB (le pendant du §8 CLAUDE.md, non tracké côté sitemap/SEO).
16. **CLAUDE.md périmé sur les faits backend** : "13 edge functions" (19 repo / 18 prod), "47 migrations" (150), "66 tables" (85), "9 produits actifs" (53 produits en DB). Pour un projet où les agents lisent CLAUDE.md avant d'agir, c'est un vecteur d'erreurs.

### BASSE

17. **Chatbot** : `productContext` client injecté tel quel dans le system prompt (injection/gonflage de coût), pas de limite de longueur sur `message` ; hijack possible d'une conversation anonyme par un user authentifié (l.100-109) ; fallback notifications `upsert onConflict:"id"` avec `.catch` non-awaité (l.228-243).
18. `run-scheduled-tasks` utilise encore le vieux pattern `serve` de `deno.land/std@0.168.0` (le reste est sur `Deno.serve`/jsr) — signe qu'elle n'a pas été touchée depuis avril.
19. `public_bucket_allows_listing` sur `partner-assets` et `product-images` (listing des objets par clients authentifiés).

## Risques

- **Risque business n°1 (année d'acquisition)** : un prospect/partner early-adopter vit une plateforme **muette** — devis non routés, aucune relance, aucun email d'expédition, aucune demande de review. Chaque échec est silencieux (`.catch(() => {})`), donc invisible jusqu'à la plainte d'un humain. C'est le pattern Dette 43/75 ("3 semaines de prod cassée sans détection") reproduit à l'échelle de tout le workflow post-devis.
- **Risque coût IA** : `analyze-terrace` ouvert + compteur chatbot cassé = exposition Anthropic non bornée, sur un projet solo-founder.
- **Risque infra** : compute Nano avec pause auto 7 jours et saturation IO déjà vécue (6-8 juin) ; l'upgrade Pro (Dette 99, "P0 escaladée" le 15 mai) n'apparaît toujours pas actée.
- **Risque de reconstruction** : en cas d'incident majeur DB, le repo ne permet **pas** de recréer le schéma (108 migrations prod sans fichier) ; la seule vérité est la prod elle-même + backups (quotidiens seulement si plan Pro).
- **Risque de régression au deploy** : `verify_jwt` et secrets non versionnés → tout redeploy "propre" (CLI, nouvelle machine) peut désarmer ou casser des fonctions sans qu'aucun test ne le détecte.

## Opportunités / améliorations proposées

| # | Action | Effort | Impact |
|---|---|---|---|
| 1 | **Chantier "réanimation async"** : trigger DB `AFTER INSERT ON quote_requests` pour l'auto-assign (pattern pg_net + vault déjà validé Dette 59) ; fix des 2 crons pg_cron (headers auth via vault — 2 migrations de 30 min) ; décision Dette 61 : déployer `run-scheduled-tasks` **ou** porter relances+expiration en SQL/pg_cron ; supprimer/corriger les 4 callsites frontend 401 | 1,5-2 j | Majeur — ressuscite tout le workflow quote→order→delivery→review |
| 2 | **Réconciliation migrations** : `supabase db pull` → migration baseline unique horodatée + archivage des 150 fichiers actuels dans `migrations/_archive/` ; puis discipline stricte "timestamp prod = nom de fichier" ; ajouter un check CI (script comparant `ls migrations/` à `list_migrations`, déjà proposé Dette 43 §2) | 1-2 j | Majeur — restaure le repo comme source de vérité, débloque staging (Dette 56) |
| 3 | **Fix bugs silencieux edge** : colonnes `notifications` dans check-abandoned-carts ; `{count:"exact"}` + select complet dans stock-sync-webhook ; créer `increment_chatbot_usage` + retirer l'upsert écraseur ; dédup `run_reminder_notifications` (colonne `last_reminder_sent_at` ou contrainte unique partielle) | 0,5-1 j | Fort — fiabilise monitoring partners + budget IA + UX notifications |
| 4 | **Plafonner l'IA** : auth user + table `analysis_usage` + limite N/jour sur `analyze-terrace` (recommandations d'avril déjà écrites) ; limites de taille body sur les 4 fonctions IA | 0,5 j | Fort — borne le risque de coût |
| 5 | **Versionner la config runtime** : `[functions.*] verify_jwt` dans `config.toml` + README par fonction listant secrets requis (règle CLAUDE.md déjà énoncée, partiellement appliquée) ; unifier `TRIGGER_SECRET` → `EDGE_TRIGGER_SECRET` | 0,5 j | Moyen — supprime une classe entière de drift |
| 6 | **Observabilité minimale** : table `cron_run_log` alimentée par chaque job + tuile admin "santé des crons" (vert/rouge dernière exécution) ; c'est le fix générique du pattern "cassé 3 mois sans le savoir" | 1 j | Fort/durable |
| 7 | Exécuter les actions perf documentées en retard : upgrade Pro/Micro, cleanup des 192 index, lot P2 `multiple_permissive_policies` (35 groupes) | 1-2 j | Moyen — stabilité + latence planning |

## Top 5 recommandations priorisées

1. **Réparer la chaîne asynchrone quote→assignation→relances→reviews** (faiblesses 1 & 3) — c'est du chiffre d'affaires et de la crédibilité partenaire perdus en silence, en pleine année d'acquisition post-Salone ; la moitié du fix est déjà spécifiée dans les dettes 57/58/61, l'autre moitié (auto-assign 401) est nouvelle et doit passer par un trigger DB.
2. **Réconcilier les migrations repo/prod via une baseline** + check CI anti-drift — sans cela, chaque semaine aggrave l'écart (113 vs 191 versions divergentes aujourd'hui) et aucun environnement de staging n'est possible.
3. **Corriger les 3 bugs applicatifs neufs** (colonnes `notifications` fantômes, comptage stock-sync `count:null`/NaN, budget chatbot inopérant) — petits fixes, gros effet sur la fiabilité perçue et le contrôle des coûts.
4. **Borner les coûts IA** : verrouiller `analyze-terrace` (auth + quota) et restaurer le plafond chatbot — exposition financière directe d'un solo founder.
5. **Mettre en place l'observabilité cron + versionner `verify_jwt`/secrets** — le méta-problème de ce backend n'est pas la qualité du code (bonne) mais l'absence de boucle de détection : chaque incident trouvé aujourd'hui était un échec silencieux que des logs consultés automatiquement auraient remonté en 24 h.