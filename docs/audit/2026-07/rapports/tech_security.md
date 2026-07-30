Analysis complete. Compiling the security audit report.

# Audit SÉCURITÉ — Terrassea Hub (2026-07-29)

## Synthèse

L'assiette sécurité est globalement solide et montre une vraie maturité : RLS activée sur **100 % des tables** (`public`, vérifié en prod — 0 table sans RLS), Stripe avec vérification de signature HMAC + fenêtre de fraîcheur + comparaison constant-time + idempotence atomique, montants toujours recalculés côté serveur, série de correctifs "red-team" 2026-05-16 bien conçus (M3/M4/M5/H1-H7), et helpers `is_admin()` centralisés. Aucune clé secrète hardcodée dans le repo, `.env` non commité.

En revanche, trois angles **non couverts par la dette documentée** sortent de l'analyse : (1) l'edge function `analyze-terrace` est un endpoint LLM **public, sans auth, CORS `*`, sans rate limit** ; (2) le chatbot n'applique **jamais** sa limite journalière ni aucun throttle par session/IP → drain budgétaire Anthropic possible par un anonyme ; (3) `platform_settings` est lisible par **tout utilisateur authentifié** et contient IBAN/BIC/bénéficiaire, `admin_email`, `notification_webhook_url` et la grille de commissions complète. S'y ajoutent une dérive de source-of-truth (config `verify_jwt` non versionnée) et une clé de tracking exposée dans le bundle client.

## Forces

- **RLS exhaustive** : 0 table sans RLS en prod ; policies admin via `is_admin()` SECURITY DEFINER (pattern discipliné, pas de check inline).
- **Stripe robuste** (`stripe-webhook/index.ts:31-62`, `stripe-checkout/index.ts:85-121`) : signature obligatoire, fenêtre 300 s, constant-time compare, idempotence par UPDATE conditionnel atomique (`.is("stripe_payment_id", null)`), montant lu depuis la DB, ownership vérifié, open-redirect bloqué par allowlist d'hôtes.
- **Correctifs red-team traçables** : replay Stripe (M6), price-poisoning stock-sync borné (M4, `stock-sync-webhook/index.ts:158-166`), bypass double-facteur webhook secret (M3), attribution chatbot cross-user (M5), privilege columns lockés (H1), notifications self-only (H6), stored-HTML-injection emails échappé (H7, `send-quote-notification/index.ts:14-29`).
- **Validation server-side** systématique dans les webhooks/RPC ; secrets via `Deno.env`, jamais logs de données carte.
- **Feeds pro_service** SECURITY DEFINER mais auto-filtrés par `auth.uid()` dans la vue, avec masquage conditionnel des contacts client tant que `status NOT IN (client_connected, completed)`.

## Faiblesses / problèmes détectés

### HAUTE — `analyze-terrace` : endpoint LLM public sans auth ni rate limit
`supabase/functions/analyze-terrace/index.ts:1-13` — CORS `Access-Control-Allow-Origin: *`, **aucun** `requireAdmin`/`getUser`/Bearer (confirmé par grep : "NO AUTH CHECK FOUND"), aucun compteur d'usage. La fonction relaie directement vers l'API Anthropic (vision). Le gating `mood_board_enabled` + crédits n'existe qu'au niveau UI (`useMoodBoard.ts:245`) et est trivialement contournable en appelant l'edge function en direct.
**Scénario** : un attaquant script `POST /functions/v1/analyze-terrace` avec des images en boucle → consomme le quota/budget `ANTHROPIC_API_KEY` (modèle vision, coûteux) sans plafond, jusqu'à épuisement financier ou throttling du compte Anthropic pour toute la plateforme.

### HAUTE — Chatbot : limite journalière jamais appliquée, aucun throttle par session/IP
`supabase/functions/chatbot/index.ts:116,134-139` — `chatbot_max_messages_per_day` est **chargé mais jamais évalué** (dead config) ; seule la borne mensuelle globale (`chatbot_monthly_budget_limit`, défaut 5000) est vérifiée. CORS `*` (ligne 9), accessible en anonyme via `sessionId`. Grep confirme : aucun `rate`/`ip_address`/`per-session`.
**Scénario** : un anonyme boucle sur `/functions/v1/chatbot` avec des `sessionId` aléatoires → épuise le budget mensuel global partagé (déni de service pour tous les utilisateurs légitimes) et génère jusqu'à 5000 appels Haiku facturés. Le plafond journalier censé limiter cet abus est inopérant.

### HAUTE — `platform_settings` : données sensibles lisibles par tout authentifié
Policy prod `Authenticated read platform_settings` = `SELECT … USING (true)` pour le rôle `authenticated`. La table contient (58 clés vérifiées) : `iban`, `bic`, `bank_name`, `beneficiary`, `payment_iban`, `payment_bic`, `payment_beneficiary`, `admin_email`, `support_email`, `notification_webhook_url`, `notification_reply_to`, et **toute la grille de commissions** (`default_/starter_/growth_/elite_/launch_commission_rate`).
La Dette 71 ne traite que l'hygiène de la whitelist **publique/anon** — l'exposition à **tout compte authentifié** (un simple client fraîchement inscrit) n'est pas reconnue. Or `COMMISSION_VISIBILITY_AUDIT.md` pose l'intention métier « commission 100 % cachée au client » : un client peut ici lire `SELECT key,value FROM platform_settings` et récupérer la structure de marge complète, l'email admin (phishing ciblé) et l'URL de webhook interne.
**Scénario** : inscription cliente standard → un appel supabase-js `from('platform_settings').select('*')` retourne IBAN, `admin_email` et grille de commissions, en contradiction directe avec le modèle de confidentialité voulu.

### MOYENNE — Config `verify_jwt` par fonction non versionnée (drift source-of-truth)
`supabase/config.toml` ne contient **que** `project_id` (0 bloc `[functions.*]`, 0 `verify_jwt`). La distinction "fonction publique vs JWT-obligatoire" (stripe-webhook, stock-sync-webhook, catalog-download, analyze-terrace = `verify_jwt=false` ; les autres censées être protégées) vit uniquement en configuration Dashboard, non trackée. Cela viole la règle CLAUDE.md « le repo est la source de vérité ». Un `supabase db/functions` re-déployé depuis le repo, ou un reset, peut soit casser les webhooks, soit — pire — exposer une fonction censée exiger un JWT.
**Scénario** : re-provisioning depuis le repo → `verify_jwt` repart sur le défaut, un webhook légitime tombe en 401 ou une fonction interne devient ouverte, sans trace en revue de code.

### MOYENNE — `VITE_TRACKING_API_KEY` exposée dans le bundle client
`src/lib/trackingService.ts:15` lit `import.meta.env.VITE_TRACKING_API_KEY` — toute variable `VITE_*` est **inlinée dans le JS servi au navigateur**. Si le suivi AfterShip/Ship24 est activé, la clé API du provider est world-readable.
**Scénario** : activation du tracking auto → n'importe quel visiteur extrait la clé depuis le bundle et consomme/abuse le quota AfterShip du compte Terrassea. L'appel provider devrait passer par une edge function server-side, pas depuis le client.

### MOYENNE — Notifications cross-user : durcissement RLS final toujours non livré (Dette 19)
Documentée mais **non résolue** : la phase 2B.final (DROP de la policy INSERT permissive + `WITH CHECK (user_id = auth.uid() OR is_admin())`) reste ouverte, et de nombreux chemins d'insertion `notifications` passent par service_role (stripe-webhook `:68`, catalog-download `:96`, chatbot `:228`). Le risque phishing interne inter-utilisateur subsiste tant que la policy restrictive n'est pas posée. À requalifier au-dessus de "priorité basse" maintenant que le volume utilisateurs vise la croissance 2026.

### BASSE — CORS incohérent (`*`) sur endpoints sensibles
`chatbot`, `analyze-terrace`, `get-signed-cgv-url`, `record-founding-products-batch`, `catalog-download` renvoient `Access-Control-Allow-Origin: *`, alors que stripe/enrich/csv/stock-sync reflètent un origin de confiance. Pour les endpoints Bearer c'est un risque faible, mais la posture devrait être unifiée (reflet d'allowlist comme `invite-brand-partner/index.ts:61-79`, qui est le bon modèle).

### BASSE — Vues SECURITY DEFINER sans backstop RLS (ERROR advisor)
`pro_service_client_feed` / `pro_service_partner_feed` (`WITH (security_invoker = false)`) contournent la RLS des tables sous-jacentes ; la seule barrière est le `WHERE … = auth.uid()` interne à la vue. Fonctionnellement correct aujourd'hui, mais une régression future du prédicat leakerait toutes les lignes. Passer en `security_invoker = true` (avec RLS adéquate sur les tables) supprimerait l'ERROR advisor et ajouterait une défense en profondeur.

### BASSE — Injection de prompt indirecte dans les pipelines IA
`chatbot/index.ts:169-171` concatène `productContext` fourni par le client au system prompt ; `analyze-csv-products` / `enrich-products` ingèrent du contenu fournisseur non fiable dont la sortie JSON alimente la DB produit. Auth-gated (partner/admin) et suggestions revues humainement → impact limité, mais un fournisseur malveillant pourrait biaiser des `suggested_value`/tags. Défense : cloisonner strictement les données non fiables dans des blocs utilisateur balisés (déjà le cas pour csv/enrich), ne jamais les mettre en system.

## Risques

- **Financier / disponibilité** : `analyze-terrace` + chatbot non throttlés = drain du budget Anthropic et throttling global du compte (les deux endpoints sont publics). C'est le risque le plus actionnable et le moins coûteux à exploiter.
- **Confidentialité métier** : fuite de la grille de commissions et des coordonnées bancaires/admin vers tout compte authentifié, en contradiction avec l'intention validée par le founder.
- **Intégrité opérationnelle** : la config `verify_jwt` hors repo peut, lors d'un redeploy, ouvrir une fonction interne ou casser un webhook de paiement silencieusement.
- **Réputation** : email admin exposé → phishing ciblé ; clé tracking exposée → abus de quota tiers.

## Opportunités / améliorations proposées

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 1 | `analyze-terrace` : ajouter `requireAuth` (client/architecte connecté) + compteur d'usage type `mood_board_max_analyses` par user/jour + CORS reflété | 0.5 j | Élevé (stoppe drain LLM public) |
| 2 | Chatbot : implémenter réellement `chatbot_max_messages_per_day` + throttle par `session_id`/IP (fenêtre glissante en table `chatbot_usage`) | 0.5-1 j | Élevé (anti-DoS budgétaire) |
| 3 | `platform_settings` : policy `is_public` (Dette 71 option 2) OU restreindre le SELECT authenticated à une whitelist de clés non sensibles ; router IBAN/BIC vers une RPC dédiée délivrée uniquement dans le contexte d'une commande du user | 0.5-1 j | Élevé (ferme fuite commission/bancaire) |
| 4 | Versionner `[functions.*] verify_jwt` dans `config.toml` pour les 20 fonctions ; documenter public vs protégé | 0.5 j | Moyen (drift prevention, conforme CLAUDE.md) |
| 5 | Déplacer l'appel tracking provider dans une edge function server-side ; supprimer `VITE_TRACKING_API_KEY` du client | 0.5 j | Moyen (secret hors bundle) |
| 6 | Livrer Dette 19 phase 2B.final (policy INSERT restrictive sur `notifications`) | 0.5 j | Moyen (anti-phishing interne) |
| 7 | Basculer les 2 vues `pro_service_*_feed` en `security_invoker=true` + RLS ; unifier CORS sur reflet d'allowlist | 0.5 j | Faible-Moyen (defense-in-depth, 2 ERROR advisors résolus) |
| 8 | Activer `auth_leaked_password_protection` au prochain upgrade plan Supabase (déjà tracké) | 5 min | Faible |

## Top 5 recommandations priorisées

1. **Authentifier + plafonner `analyze-terrace`** (`supabase/functions/analyze-terrace/index.ts`) — endpoint LLM public sans aucune barrière : drain budgétaire Anthropic exploitable immédiatement par un anonyme. 0.5 j.
2. **Rendre effective la limite chatbot journalière + throttle par session/IP** (`chatbot/index.ts:134-139`) — la config `chatbot_max_messages_per_day` est chargée mais jamais appliquée ; un anonyme peut vider le budget mensuel global partagé. 0.5-1 j.
3. **Restreindre `platform_settings` en lecture authenticated** — IBAN/BIC/bénéficiaire, `admin_email`, `notification_webhook_url` et grille de commissions complète sont lisibles par tout compte inscrit, en contradiction avec l'intention « commission cachée au client ». Introduire `is_public` ou une RPC scoped. 0.5-1 j.
4. **Versionner `verify_jwt` par fonction dans `config.toml`** — la frontière public/protégé n'existe qu'en Dashboard, violant la règle source-of-truth et exposant à une ouverture accidentelle au redeploy. 0.5 j.
5. **Sortir `VITE_TRACKING_API_KEY` du bundle client** (`src/lib/trackingService.ts:15`) et **livrer le durcissement RLS `notifications` (Dette 19 2B.final)** — deux fuites/risques concrets, faible effort combiné. 0.5-1 j.

Note : les items déjà FIXED (3 tables CRM RLS, Dette 34 signature, red-team M/H) et les faux positifs advisor documentés (`is_admin` executable anon, `materialized_view_in_api`, RLS always-true analytics) n'ont pas été re-signalés. `auth_leaked_password_protection` reste désactivée (gated Pro plan, déjà tracké).