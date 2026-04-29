# Drift code/prod — 4 edge functions ACTIVE en prod absentes du repo

**Date :** 2026-04-29
**Sévérité :** Élevée (pas Critique car code récupérable via MCP)
**Statut :** Étape A investigation terminée — en attente décision founder par fonction

**Contexte** : `mcp__supabase__list_edge_functions` (Phase 1 audit, Thème 1) a révélé que **15 edge functions sont ACTIVE en production**, alors que `supabase/functions/` n'en contient que 13 (dossier `chatbot/` vide compté comme absent). 4 fonctions tournent en prod sans être versionnées dans Git.

---

## Synthèse opérationnelle

| Fonction | verify_jwt | Status | Decision proposée |
|---|---|---|---|
| `Terrassea-Production` | true | ACTIVE v6 | **Supprimer en prod sans rapatrier** (hello world template) |
| `analyze-terrace` | true | ACTIVE v5 | **Rapatrier + garder en prod** (utile, durcissement mineur) |
| `check-abandoned-carts` | false | ACTIVE v5 | **Rapatrier + marquer pour refactoring** (sécurité auth manquante) |
| `chatbot` | false | ACTIVE v3 | **Rapatrier + marquer pour refactoring** (CORS `*`, durcir caller) |

---

## 1. `Terrassea-Production`

### Identité
- **Nom :** `Terrassea-Production`
- **Slug :** `Terrassea-Production` (ID `0e74c5ba-23b8-47a5-b49e-1bad31133e6e`)
- **Statut :** ACTIVE, v6
- **Créée :** 2026-03-15 16:48 UTC
- **Dernier deploy :** identique (`updated_at = created_at`)
- **`verify_jwt`** : true

### Résumé (≤5 lignes)
**Template "Hello World" Supabase par défaut.** Reçoit `{ name }`, retourne `{ message: "Hello \${name}!" }`. 18 lignes au total. Probablement créée automatiquement par Lovable au bootstrap du projet ou via un click "Create function" jamais nettoyé. Aucune utilité métier.

### Secrets utilisés
**Aucun.**

### Tables Supabase touchées
**Aucune.**

### Évaluation
- **Code utile à conserver ?** Non.
- **Risque actif ?** Très faible (`verify_jwt: true` requiert un JWT valide ; pollue uniquement la liste de fonctions Studio).
- **Drift signifie quoi ici ?** Trace d'un test initial jamais nettoyé. À éliminer.

### Décision proposée founder
**Supprimer en prod sans rapatrier.**

---

## 2. `analyze-terrace`

### Identité
- **Nom :** `analyze-terrace`
- **Slug :** `analyze-terrace` (ID `0b10cc45-94a7-4495-8400-7f3d2f298913`)
- **Statut :** ACTIVE, v5
- **Créée :** 2026-03-18 17:47 UTC
- **Dernier deploy :** identique
- **`verify_jwt`** : true

### Résumé (≤5 lignes)
**Vision LLM** (Claude Sonnet 4 `claude-sonnet-4-20250514`, 1024 max_tokens) sur une photo de terrasse uploadée en base64. Renvoie un JSON structurant : `is_outdoor`, `venue_type`, `style_tags`, `ambience_tags`, `palette_tags`, `material_tags`, `use_case_tags`, `estimated_capacity`, `space_characteristics`, `furniture_categories_needed`, `design_summary`, `color_mood`. Vraisemblablement utilisé par `src/components/mood-board/MoodBoardAnalyzer.tsx`. Sœur de `analyze-product-image` mais pour les espaces, pas les produits.

### Secrets utilisés
- `ANTHROPIC_API_KEY` (mandatory, fail-closed si absente)

### Tables Supabase touchées
**Aucune** (juste appel HTTP Anthropic + retour de réponse, pas de persistence DB).

### Évaluation
- **Code utile à conserver ?** Oui — composant central du flow MoodBoard / ProjectBuilder.
- **Sécurité actuelle :** `verify_jwt: true` au niveau Supabase → un JWT valide (anon ou user) est requis pour appeler. Mais pas de check `user_type` ni de rate limiting → un user authentifié peut appeler en boucle (coût Anthropic).
- **CORS `*`** sans `ALLOWED_ORIGIN` (pattern divergent du reste des edge functions du repo).

### Recommandations refactoring (à intégrer post-rapatriement)
1. Aligner CORS sur `Deno.env.get("ALLOWED_ORIGIN") || "https://terrassea.com"`.
2. Ajouter rate limiting (par `auth.uid()` ou IP) — N analyses/h max.
3. Logger les usages dans une table dédiée (similaire à `chatbot_usage`) pour suivi coût.
4. Optionnel : ajouter `requireAuthenticated()` ou `requireAdmin()` selon use case (l'analyse est-elle réservée aux admin ou ouverte à tout user ?).

### Décision proposée founder
**Rapatrier dans le repo + garder en prod.** Refactoring sécurité à programmer dans les recommandations P1 de l'audit Thème 1 (déjà couvertes par "rate limiting forms publics").

---

## 3. `check-abandoned-carts`

### Identité
- **Nom :** `check-abandoned-carts`
- **Slug :** `check-abandoned-carts` (ID `80573ca8-0628-43d8-9081-308ce3a5b56a`)
- **Statut :** ACTIVE, v5
- **Créée :** 2026-03-18 18:11 UTC
- **Dernier deploy :** identique
- **`verify_jwt`** : **false** ⚠

### Résumé (≤5 lignes)
**Cron-style task de réactivation paniers abandonnés.** Lit `platform_settings` (`abandoned_cart_enabled`, `abandoned_cart_delay_hours`, `abandoned_cart_max_reminders`). Cherche les `saved_carts` non submitted depuis N heures avec items > 0 et `reminder_count < max`, batch de 50. Pour chaque cart : récupère le `user_profile`, insère une `notification` ("cart_reminder"), incrémente `reminder_count`. Retourne le nombre traité.

### Secrets utilisés
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (utilisée pour bypass RLS sur lecture/écriture des tables)

### Tables Supabase touchées
- `platform_settings` (SELECT)
- `saved_carts` (SELECT, UPDATE)
- `user_profiles` (SELECT)
- `notifications` (INSERT)

### Évaluation
- **Code utile à conserver ?** Oui — conversion / re-engagement utilisateur.
- **Sécurité actuelle : ⚠ FAILLE.** `verify_jwt: false` + **aucun check d'auth dans le code** + CORS `*` → l'URL de la function est publique. **N'importe qui sur internet connaissant l'URL peut déclencher la fonction et générer des notifications spam** vers les users.
- **Caller attendu :** vraisemblablement le cron Vercel `api/cron-reminders.ts` (à 9h00 quotidien) — mais pas de check d'auth pour autant.
- **Pattern divergent** : les autres functions cron (`run-scheduled-tasks`) exigent `Authorization: Bearer ${SERVICE_ROLE_KEY}` au début. Celle-ci ne le fait pas.

### Recommandations refactoring (à intégrer post-rapatriement)
1. **P0 dans son propre périmètre** : ajouter au début du handler la check d'auth identique à `run-scheduled-tasks` :
   ```ts
   const authHeader = req.headers.get("Authorization");
   if (!authHeader || authHeader !== `Bearer ${supabaseKey}`) {
     return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, ... });
   }
   ```
2. Aligner CORS sur `ALLOWED_ORIGIN` (au lieu de `*`).
3. Vérifier que `api/cron-reminders.ts` Vercel passe bien le SERVICE_ROLE_KEY dans le header `Authorization` lors de l'appel.

### Décision proposée founder
**Rapatrier dans le repo + marquer pour refactoring (P0 sécurité).** L'URL est probablement non-discoverable mais la faille existe. Fix simple, à grouper avec les recommandations Thème 1.

---

## 4. `chatbot`

### Identité
- **Nom :** `chatbot`
- **Slug :** `chatbot` (ID `888ccb13-9f7d-4cd6-ad2a-002f95e8b825`)
- **Statut :** ACTIVE, v3
- **Créée :** 2026-03-19 14:48 UTC
- **Dernier deploy :** identique
- **`verify_jwt`** : **false** ⚠

### Résumé (≤5 lignes)
**Endpoint chatbot Anthropic** (Claude Haiku 4.5 `claude-haiku-4-5-20251001`, 500 max_tokens). Reçoit `{ message, conversationId, sessionId, userId, productContext }`. Lit `platform_settings` (`chatbot_enabled`, `chatbot_max_messages_per_day`, `chatbot_monthly_budget_limit`, `chatbot_alert_threshold_percent`). Vérifie limite budget mensuel via SUM `chatbot_usage.messages_count`. Crée/charge conversation, charge 20 derniers messages, appelle Claude, persiste user/assistant messages, met à jour usage daily, alerte admin si seuil atteint. Appelée par `ChatbotWidget.tsx` côté front (lazy-loaded).

### Secrets utilisés
- `ANTHROPIC_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Tables Supabase touchées
- `platform_settings` (SELECT)
- `chatbot_conversations` (INSERT, UPDATE)
- `chatbot_messages` (INSERT)
- `chatbot_usage` (SELECT, UPSERT)
- `user_profiles` (SELECT, pour admins lors d'alerte)
- `notifications` (INSERT, pour alerte admin)
- RPC `increment_chatbot_usage(p_date, p_msgs, p_cost, p_convs)` (à confirmer existence côté DB)

### Évaluation
- **Code utile à conserver ?** Oui — feature chatbot active sur le site (`ChatbotWidget` lazy-loaded dans `App.tsx`).
- **Sécurité actuelle :** `verify_jwt: false` (volontaire car le chatbot doit être accessible par les visiteurs anonymes). **Garde-fous existants** : feature flag `chatbot_enabled`, budget mensuel `chatbot_monthly_budget_limit` (default 5000 messages/mois), alerte à `chatbot_alert_threshold_percent` (default 80%). **Pas de rate limit per IP/sessionId** — si un attaquant veut épuiser le budget mensuel, il peut le faire en quelques minutes et désactiver la feature.
- **CORS `*`** : volontaire pour que le widget marche depuis d'autres domaines ? À confirmer.
- **RPC `increment_chatbot_usage`** : doit exister côté DB (l'audit DB Thème 2 ne l'a pas vu dans les SECURITY DEFINER ; vraisemblablement INVOKER classique).

### Recommandations refactoring (à intégrer post-rapatriement)
1. **Rate limiting per `sessionId` ou IP** (effort : 0.5 j). Table `chatbot_rate_limits` ou usage de `pg_net`/Cloudflare.
2. Aligner CORS sur `ALLOWED_ORIGIN` (sauf si décision business explicite de garder `*`).
3. Vérifier l'existence du RPC `increment_chatbot_usage` côté DB et ajouter sa migration au repo si manquante.
4. Considérer ajouter un captcha (Turnstile) côté `ChatbotWidget` avant la première interaction.

### Décision proposée founder
**Rapatrier dans le repo + marquer pour refactoring** (rate limit P2, CORS à clarifier).

---

## Récap

| # | Fonction | Décision proposée | Effort rapatriement | Refactoring follow-up |
|---|---|---|---|---|
| 1 | `Terrassea-Production` | Supprimer en prod | N/A | — |
| 2 | `analyze-terrace` | Rapatrier + garder | 5 min + README | Rate limit + CORS (P1) |
| 3 | `check-abandoned-carts` | Rapatrier + refactor P0 | 5 min + README | Auth header check (P0) |
| 4 | `chatbot` | Rapatrier + refactor P2 | 5 min + README | Rate limit + CORS (P2) |

**Effort total Étape C** (rapatriement + READMEs + commit) : 30-40 min après ton GO.

**Action collatérale** (non couverte ici) : ajouter dans `CLAUDE.md` une règle "Toute edge function doit être versionnée dans `supabase/functions/<slug>/index.ts` avant déploiement. Pas de déploiement direct via Studio."

---

---

## Résolution (2026-04-29 après-midi)

### Décisions founder

| # | Fonction | Décision finale |
|---|---|---|
| 1 | `Terrassea-Production` | **Supprimer en prod sans rapatrier** (validé) |
| 2 | `analyze-terrace` | **Rapatrier + garder en prod** (refactor P3 différé) |
| 3 | `check-abandoned-carts` | **Désactiver immédiatement + rapatrier en mode désactivé + refactor dans le commit** (modification de la décision proposée) |
| 4 | `chatbot` | **Rapatrier + garder en prod** (refactor P2 différé) |

### Étape A.1 — Vérifications annexes

| Vérification | Résultat |
|---|---|
| Grep `Terrassea-Production` dans tout le repo | **0 occurrence** dans `src/`, `api/`, `vercel.json`. Suppression sûre. |
| Grep `analyze-terrace` dans `src/` | **1 occurrence** : `src/hooks/useMoodBoard.ts:245`. Function utilisée, pas du code mort. |
| `chatbot_usage` 30 derniers jours | **0 row** total. Le chatbot n'a **jamais** été utilisé. Aucun abuse possible. |
| `chatbot_conversations` lifetime | **0 row** total. Idem. |

### Étape A.2 — Investigation logs `check-abandoned-carts`

`mcp__supabase__get_logs(service="edge-function")` 24 dernières heures :

| Timestamp | Status | Durée | Source identifiée |
|---|---|---|---|
| 2026-04-29 12:00:03 UTC | 200 | 3.3 s | pg_cron `0 */6 * * *` |
| 2026-04-29 06:00:12 UTC | 200 | 12.3 s | pg_cron `0 */6 * * *` |
| 2026-04-29 00:00:04 UTC | 200 | 4.5 s | pg_cron `0 */6 * * *` |
| 2026-04-28 18:00:07 UTC | 200 | 6.7 s | pg_cron `0 */6 * * *` |

**Caller identifié** via `cron.job` : `jobid=2 jobname='check-abandoned-carts'` schedule `0 */6 * * *`, qui appelle la function **sans `Authorization` header** (configuration legacy). Cron actif depuis création.

**Verdict abuse** : aucun. 4 appels en 24h, tous 200, tous depuis l'infra interne Supabase (pg_cron + pg_net). Pas d'IP externe suspecte.

**Découverte collatérale** : le `jobid=1 jobname='send-review-requests'` est dans la même configuration (call sans auth header). Logs montrent qu'il fait actuellement 401 → la function `send-review-request` exige une auth → cron déjà cassé en silence. À investiguer dans Thème 2 P2 ou Thème 8 (observability).

### Étape B — Désactivation immédiate de `check-abandoned-carts`

**Approche** : déploiement direct d'une nouvelle version refactorisée (v6) qui combine désactivation par défaut + check d'auth dédié. Pas besoin d'une "version intermédiaire désactivée brute" — la nouvelle version EST désactivée par défaut tant que `ENABLE_ABANDONED_CARTS_CRON !== "true"`.

**Action** : `mcp__supabase__deploy_edge_function(name="check-abandoned-carts", verify_jwt=false, files=[...])` → version 6 ACTIVE à 2026-04-29 14:38:52 UTC.

**Test de validation** (via `pg_net.http_post` direct) :

```sql
SELECT net.http_post(
  url := 'https://gwgcfgeouropcighpztj.supabase.co/functions/v1/check-abandoned-carts',
  headers := '{"Content-Type": "application/json"}'::jsonb,
  body := '{}'::jsonb
);
-- → request_id 141

SELECT id, status_code, content::jsonb AS body FROM net._http_response WHERE id = 141;
-- → status_code: 503
-- → body: {"error":"Service disabled","reason":"ENABLE_ABANDONED_CARTS_CRON not set to 'true'"}
```

✅ **Désactivation effective confirmée empiriquement.**

**Impact attendu sur le pg_cron job 2** : à partir du prochain run (à 18:00 UTC ou 00:00 UTC selon timezone Postgres), le job recevra 503 au lieu de 200. C'est le comportement voulu jusqu'à reconfiguration manuelle par le founder.

### Étape C — Rapatriement effectif

Fichiers créés dans le repo :

| Path | Source |
|---|---|
| `supabase/functions/chatbot/index.ts` | Code prod v3 récupéré tel quel |
| `supabase/functions/chatbot/README.md` | Documentation : purpose, secrets, tables, follow-ups |
| `supabase/functions/analyze-terrace/index.ts` | Code prod v5 récupéré tel quel |
| `supabase/functions/analyze-terrace/README.md` | Idem |
| `supabase/functions/check-abandoned-carts/index.ts` | **Version refactorisée v6 (= ce qui tourne en prod depuis 14:38 UTC)** |
| `supabase/functions/check-abandoned-carts/README.md` | Procédure de réactivation détaillée + tables touchées |

**Non rapatrié** : `Terrassea-Production`. Hello world template, sans utilité. Le MCP Supabase n'a pas d'outil `delete_edge_function` exposé. **Suppression founder requise via Studio** : Dashboard → Edge Functions → `Terrassea-Production` → Delete.

### Décision documentaire collatérale

Ajout dans `CLAUDE.md` (section Conventions) de la règle :

> **Edge functions** : tout code edge déployé en prod doit être versionné dans `supabase/functions/<slug>/index.ts` AVANT déploiement. Pas de déploiement direct via Studio. Le rapatriement de 2026-04-29 (4 fonctions trouvées en prod absentes du repo) sert d'exemple de la dette que cette règle évite.

---

## Statut final

✅ **Drift code/prod résolu** sur 3 fonctions (chatbot, analyze-terrace, check-abandoned-carts).
⏳ **`Terrassea-Production`** : suppression à la charge founder via Studio (5 secondes de manip).
✅ **Faille auth `check-abandoned-carts`** : fermée. Function désactivée par défaut, prête à être réactivée après config secrets.
📋 **Test post-désactivation** : status 503 confirmé empiriquement.

Le commit groupé suit. Push différé fin de journée.
