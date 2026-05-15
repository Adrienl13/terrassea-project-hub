# Vague 2 Founding Partner Tracking — Audit existant

> **Date** : 2026-05-15
> **Contexte** : Founder veut implémenter Vague 2 (tracking + points + explainer + dashboards) AVANT les premières intégrations marques (3-5 en cours post-Salone). Signal explicite : "Je crois qu'il y avait déjà quelque chose de comparable".
> **Output** : cartographie de l'existant + recommandation build vs réutilisation. **PAS d'implémentation dans cette session.**
> **Compagnons** : `FOUNDING_PROGRAM_ROADMAP.md` (spec de référence), `DETTE_TECHNIQUE_AUDIT.md` (Dettes 65–70).

---

## 1. TL;DR

Le founder avait raison : **un système de loyalty existe déjà** (`partner_loyalty` + `partner_points_history` + UI dashboard + hook + settings). Mais il a une **sémantique différente** de ce que la roadmap décrit pour Vague 2 :
- **Existant** = système de fidélité **récurrent** lié aux plans business payants (tiers = `starter / growth / elite / brand_member / brand_network`)
- **Roadmap Vague 2** = statut **"à vie"** Founding Partner avec tiers distincts (`silver / gold / platinum`)

Le système Loyalty existant est **actuellement désactivé** (`platform_settings.partner_loyalty_enabled = false`), **0 row** dans les 2 tables, mais l'UI est complète et plug-and-play dans le dashboard partner (route `loyalty`).

**3 options stratégiques** émergent (cf. §6). Recommandation : **Option A — Founding système distinct**, mais le founder doit trancher avant la build.

---

## 2. Existant DB

### Tables existantes liées

| Table | Colonnes | Rows | RLS | Statut |
|---|---|---|---|---|
| `partner_loyalty` | `id, partner_id, points_balance int, lifetime_points int, tier text default 'growth', tier_locked_until timestamptz, created_at, updated_at` | **0** | ✅ activé | structurée, mais désactivée fonctionnellement |
| `partner_points_history` | `id, partner_id, action text, points int, description text, reference_id text, created_at` | **0** | ✅ activé | event log append-only prêt |

### Settings `platform_settings` existants

| Key | Value | Effet |
|---|---|---|
| `partner_loyalty_enabled` | **false** | Désactive tout le système |
| `partner_loyalty_elite_threshold` | 1000 | Seuil points pour passer Elite |
| `partner_loyalty_elite_prestige_threshold` | 5000 | Seuil prestige (deuxième palier elite ?) |
| `partner_loyalty_points_per_order` | 100 | Récompense order confirmé |
| `partner_loyalty_points_per_quote` | 10 | Récompense quote sent |

**Note** : ces clés ont la sémantique "loyalty récurrent" (orders + quotes = events business courants), PAS la sémantique "Founding" (actions one-shot historiques type "catalogue complete", "first order confirmed").

### Colonnes `partners` actuelles (extrait pertinent)

Existantes : `plan text` (= business plan starter/growth/elite/etc.), `visibility_level text`, `founded_year integer` (= année de fondation de la société partenaire, pas "founding Terrassea").

**Manquant pour Vague 2 Founding** :
- ❌ `is_founding boolean` — marqueur statut "à vie"
- ❌ `founding_joined_at timestamptz` — date d'entrée dans la cohorte

### RPCs liées

Aucune RPC `points*`, `loyalty*`, `founding*` ou `reward*` n'existe. Le système Loyalty actuel n'a pas de point d'écriture serveur — il devait probablement être alimenté via inserts directs frontend ou via triggers business, mais aucun trigger n'est en place sur les tables points actuelles.

### Triggers liés

Aucun trigger `*_loyalty_*` ou `*_points_*` ou `*_founding_*` actif. Le système est inerte côté DB.

### Migrations

Recherche `CREATE TABLE partner_loyalty` / `partner_points_history` dans `supabase/migrations/` : 0 match direct. Les tables ont probablement été créées via une migration ancienne renommée ou via Studio. La référence indirecte se trouve dans `20260513164000_dette_75_lot_2_delete_partner_cascade.sql` qui inclut ces tables dans la liste des CASCADE FK lors de la suppression partner.

⚠️ **Drift potentiel** : les tables existent en prod mais leur création n'est pas tracée dans `supabase/migrations/`. À investiguer si on veut une migration consolidée pour la documentation Vague 2.

---

## 3. Existant frontend

### Components

| Fichier | Lignes | Rôle |
|---|---|---|
| `src/components/partner-dashboard/PartnerLoyaltyProgram.tsx` | 475 | UI complète : tier progression bar, points history, action icons (quote_sent / order_confirmed / five_star_review / profile_complete), comparison table tiers, locked benefits. Utilise `TIER_CONFIG` (plans business). |
| `src/pages/BecomePartnerLaunch.tsx` | 15.5 KB | Page publique `/become-partner` mode launch. 6 bénéfices narratifs (badge, priority, featured, commission, beta, network) sans système de points ni tier Founding visible. |

### Hooks

`src/hooks/usePartnerAnalytics.ts` exporte :
- `usePartnerLoyalty(partnerId)` — query `partner_loyalty` + `partner_points_history` + `platform_settings.partner_loyalty_*`, dérive `currentTier`, `nextTier`, `pointsToNextTier`, `tierProgress`.
- `usePartnerTierConfig(partnerId)` — combine loyalty tier + subscription plan, retourne le `effectiveTier` = max(loyalty, plan).
- `TIER_CONFIG` Record<PartnerTier, TierConfig> — config détaillée pour starter/growth/elite/brand_member/brand_network (prix, commission, max produits, features, etc.).
- `PartnerTier` type = `"starter" | "growth" | "elite" | "brand_member" | "brand_network"` — **PAS** silver/gold/platinum.

### Routing

`src/pages/Account.tsx:175` : `{ id: "loyalty", icon: Award, labelKey: "account.loyalty" }` dans `NAV_PARTNER_BASE`. Route active sur le dashboard partner sous l'onglet "Loyalty". Plug-and-play vers `PartnerLoyaltyProgram`.

### Types Supabase

`src/integrations/supabase/types.ts` inclut `partner_loyalty` et `partner_points_history` Row/Insert/Update — typés et utilisables sans cast.

---

## 4. Existant docs

### `docs/strategy/FOUNDING_PROGRAM_ROADMAP.md` (161 lignes, MAJ 2026-05-11)

Document de référence très détaillé :
- Vague 1 ✅ livrée (bascule UI launch + commission unique 5% + désactivation trigger auto-upgrade plan + page `/become-partner` dédiée + dashboard masque CTAs upgrade).
- Vague 2 🟡 planifiée avec **spec complète** :
  - Migration `partners.is_founding` + `founding_joined_at` + trigger BEFORE INSERT auto-marquage pendant `pricing_visibility_mode='launch'`
  - Table `founding_actions` (event log append-only avec `action_type`, `points`, `meta jsonb`)
  - View matérialisée `founding_partner_scores` avec tier silver/gold/platinum dérivé via `platform_settings.founding_tiers_config`
  - Affichage tiers sur `BecomePartnerLaunch.tsx`
  - `<FoundingBadge tier="gold" />` dashboard + fiche publique partner
  - Catalogue d'actions détaillé (8 actions avec points + anti-fraude rules)
- Vague 3 🔵 conceptuel (bascule pricing full + boost ranking algorithmique + bénéfices "à vie")

### `docs/strategy/DETTE_TECHNIQUE_AUDIT.md` — Dettes liées

- Dette 62 : Réindexer SEO après bascule pricing_visibility_mode='full'
- Dette 63 : Badge "Mode launch actif" admin
- Dette 64 : Trigger `trg_sync_partner_plan` à réactiver
- **Dette 65 : Vague 2 livraison** — tracking MVP (cette session)
- Dette 66 : Vague 3 full gamification
- Dette 67 : Extension multi-rôles (Founding Architect / Client)
- Dette 68 : Anti-fraude points (rate-limit, dédup invitations, modération Q&A)
- Dette 69 : Algorithm boost ranking ordering en Vague 3
- Dette 70 : Migration légère `partners.is_founding` + `founding_joined_at`

---

## 5. Gap analysis

| Composant | Existe ? | État actuel | Vague 2 cible | Action |
|---|---|---|---|---|
| `partners.is_founding` (bool) | ❌ | absent | requis | **créer** |
| `partners.founding_joined_at` | ❌ | absent | requis | **créer** |
| Table event log points | ✅ | `partner_points_history` 0 rows | nouvelle `founding_actions` OU réutilisation | **décision** |
| Aggregation points par partner | ✅ | `partner_loyalty.points_balance/lifetime_points` | view matérialisée `founding_partner_scores` | **décision** |
| Système de tiers | ✅ partial | starter/growth/elite/brand_member/brand_network (plans) | silver/gold/platinum (Founding) | **étendre OU séparer** |
| RPC enregistrement action | ❌ | aucune | `record_founding_action(p_partner_id, p_action_type, p_points, p_reference_id, p_meta)` | **créer** |
| Anti-fraude (dédup, rate-limit) | ❌ | aucune | Dette 68 capturée | **différer / partiel MVP** |
| Trigger BEFORE INSERT partners | ❌ | aucun | auto-marquer `is_founding=true` pendant `launch` | **créer** |
| Hook React | ✅ partial | `usePartnerLoyalty` (tiers plans) | `useFoundingScore` (tiers silver/gold/platinum) | **dédupliquer ou adapter** |
| UI dashboard partner | ✅ partial | `PartnerLoyaltyProgram` (475 lignes, tiers plans) | section Founding distincte ou refonte | **décision** |
| `<FoundingBadge tier>` | ❌ | aucun | requis dashboard + fiche publique | **créer** |
| Page explainer `/become-partner` | ✅ | `BecomePartnerLaunch.tsx` qualitative, sans tiers | ajouter section seuils + mécaniques | **étendre** |
| Settings `platform_settings` | ✅ partial | `partner_loyalty_*` (seuils plan) | `founding_tiers_config jsonb` (seuils silver/gold/platinum) | **ajouter** |
| Dashboard admin tracking founding | ❌ | aucun | requis (cohorte visible, actions par partner) | **créer** |

---

## 6. Recommandation — 3 options stratégiques

### Option A — Founding système DISTINCT du Loyalty (recommandée)

**Modélisation** :
- Nouvelle table `founding_actions` (event log) distincte de `partner_points_history`
- Nouvelle view `founding_partner_scores` distincte de `partner_loyalty`
- Nouvelles colonnes `partners.is_founding` + `founding_joined_at`
- Nouveau tier system `silver | gold | platinum` indépendant de `PartnerTier` (starter/growth/elite/etc.)
- Nouveau hook `useFoundingScore(partnerId)` distinct de `usePartnerLoyalty`
- Nouveau component `FoundingProgramSection` dans le dashboard partner (à côté de `PartnerLoyaltyProgram` qui reste désactivé pour usage Vague 3)

**Pros** :
- Sémantique propre : Founding = historique "à vie", Loyalty = récurrent business
- Future-proof : à Vague 3, on peut activer Loyalty SANS toucher Founding
- Suit exactement la roadmap `FOUNDING_PROGRAM_ROADMAP.md`
- Évite la confusion long-terme

**Cons** :
- Duplication apparente de structure (2 tables event log + 2 vues d'agrégation)
- Effort marginal supérieur (~+1h)

**Effort estimé** : 4-6h (1 migration DB + 1 RPC + 1 view + 1 component + 1 hook + intégration dashboards + capture Dette 68 anti-fraude)

---

### Option B — Réutiliser Loyalty pour Founding

**Modélisation** :
- Activer `partner_loyalty_enabled = true`
- Adapter `tier` values dans `partner_loyalty` pour accepter silver/gold/platinum en plus de starter/growth/elite
- Étendre `partner_points_history.action` avec les actions Founding (`quote_response_under_24h`, `catalogue_complete`, `architect_invited`, etc.)
- Ajouter `partners.is_founding` + `founding_joined_at` quand même (statut)
- Refactor `usePartnerLoyalty` pour gérer 2 systèmes de tiers simultanément
- Adapter `PartnerLoyaltyProgram.tsx`

**Pros** :
- Réutilise UI existante 475 lignes
- Une seule table event log, pas de duplication structurelle
- Effort marginal inférieur

**Cons** :
- Casse la sémantique actuelle (tiers loyalty = plans payants)
- Risque de confusion future si on veut activer Loyalty séparément
- Refactor de `TIER_CONFIG` à 5 entrées vers double-référentiel
- L'UI actuelle compare des tiers business → ne convient pas pour communiquer "tu es Founding Platinum"

**Effort estimé** : 3-4h (pas de nouvelle table mais refactor hook + UI conséquent)

---

### Option C — Hybride : tables partagées + colonne `program`

**Modélisation** :
- Ajouter colonne `program text default 'loyalty'` sur `partner_loyalty` et `partner_points_history`
- Système Founding écrit avec `program='founding'`
- Views distinctes filtrées par `program`
- UI distincte mais sous-jacent même tables

**Pros** :
- Pas de duplication structure
- Conserve sémantique propre via flag
- Migration légère

**Cons** :
- Couple 2 concepts différents dans la même table (anti-pattern)
- Toute query doit filtrer `program=` correctement (risque de bug subtil long-terme)
- Tier values mélangées dans la même colonne (silver, gold, platinum, starter, growth, elite, etc.)

**Effort estimé** : 3-4h

---

### Recommandation

**Option A — Founding système distinct.**

Raisons :
1. La roadmap `FOUNDING_PROGRAM_ROADMAP.md` décrit explicitement un système séparé. Suivre la spec évite la dette de retravail.
2. Les sémantiques sont conceptuellement différentes (historique vs récurrent). Les coupler crée de la dette long-terme.
3. L'effort marginal (+1h vs Option B) est modeste face au gain de clarté.
4. Le système Loyalty existant reste **prêt à activer** quand Vague 3 arrivera, sans avoir besoin de défaire un mélange Option B.
5. Le `PartnerLoyaltyProgram.tsx` actuel n'est de toute façon **pas activé** (`loyalty_enabled = false`) — il ne fonctionne pas en prod, donc ne pas chercher à le "réutiliser" à toute force.

---

## 7. Plan d'implémentation Vague 2 — Option A (si validée)

### Phase 1 — Schema DB (1.5h)
1. Migration `partners.is_founding boolean NOT NULL DEFAULT false` + `founding_joined_at timestamptz`
2. Trigger BEFORE INSERT sur `partners` : si `platform_settings.pricing_visibility_mode = 'launch'`, set `is_founding=true` + `founding_joined_at=now()`
3. Backfill : `UPDATE partners SET is_founding=true, founding_joined_at=created_at WHERE created_at >= '<date-bascule-launch>'` (à valider via founder)
4. Table `founding_actions` (id, partner_id FK CASCADE, action_type text CHECK, points int CHECK, reference_id text, meta jsonb, created_at)
5. Index `(partner_id, created_at DESC)`, partial `(action_type)` pour anti-fraude
6. View `founding_partner_scores` agrégeant (`partner_id, total_points, action_count, tier dérivé`)
7. RLS : partner read own, admin read all

### Phase 2 — Logic backend (1.5h)
8. Setting `founding_tiers_config jsonb` dans `platform_settings` (seuils silver/gold/platinum + catalogue actions valides)
9. RPC `record_founding_action(p_partner_id, p_action_type, p_reference_id, p_meta)` — SECURITY DEFINER + search_path hardened. Lookup points depuis `founding_tiers_config`, INSERT dans `founding_actions`, anti-fraude basique (dédup `reference_id` par action_type)
10. Triggers business optionnels : auto-call de la RPC sur events Supabase (e.g. order_confirmed)

### Phase 3 — Frontend (1.5h)
11. Hook `useFoundingScore(partnerId)` — query view + history + tiers config
12. Component `FoundingBadge` (silver/gold/platinum)
13. Component `FoundingProgramSection` dashboard partner (équivalent visuel à PartnerLoyaltyProgram mais sémantique Founding)
14. Nav entry `founding` dans `Account.tsx` (avant ou à la place de `loyalty` ?)
15. Section seuils + mécaniques dans `BecomePartnerLaunch.tsx`

### Phase 4 — Admin + tests (1h)
16. `AdminFoundingOverview` — cohorte visible + actions par partner + filtre tier
17. Smoke tests (DB + RPC + UI)
18. Capture Dette 68 anti-fraude avancée (rate-limit, modération Q&A)

**Total estimé** : 4.5-6h. Compatible avec la durée 1 chantier majeur (CLAUDE.md).

---

## 8. Risques identifiés

1. **Drift migrations** : `partner_loyalty` et `partner_points_history` existent en prod mais pas dans `supabase/migrations/`. Capture en dette mineure si on veut documenter (pas bloquant Vague 2).
2. **Dette 68 anti-fraude** : la roadmap mentionne dédup invitations + rate-limit + modération Q&A. Pour MVP Vague 2, version simple suffit (dédup `reference_id` unique par `(partner_id, action_type)`). Version avancée différée.
3. **Backfill `is_founding`** : tous les partners créés depuis la bascule `launch` (commit `20260511...`) doivent être marqués `is_founding=true`. Date exacte à confirmer founder.
4. **Loyalty mort-vivant** : `PartnerLoyaltyProgram.tsx` reste accessible dans le dashboard partner (`/account` → loyalty) mais inerte (loyalty_enabled=false). Capture dette à clarifier : cacher l'onglet, ou laisser comme "Coming soon" ?
5. **Trigger BEFORE INSERT** : si la bascule retour `full` arrive (Vague 3), nouveaux partners ne sont plus auto-marqués. C'est intentionnel. Vérifier que c'est bien le comportement souhaité.

---

## 9. Questions ouvertes pour validation founder

1. **Option A / B / C** — laquelle valide-t-on ?
2. **Date bascule launch** pour backfill `is_founding=true` — à confirmer (probable `2026-05-11`).
3. **Tiers thresholds Founding** (silver / gold / platinum) — la roadmap mentionne "5 actions → Silver, 15 → Gold, 30 → Platinum" mais le tableau actions montre des **points** par event (jusqu'à 30 pour "10 commandes confirmées"). Discordance à clarifier :
   - Tiers basés sur **count d'actions distinctes** ? ou
   - Tiers basés sur **somme de points** ?
4. **Loyalty existant** — laisser actif côté UI (Coming Soon) ou cacher tant que désactivé ?
5. **Catalogue actions Vague 2 MVP** — implémenter les 8 actions de la roadmap dès le départ, ou commencer avec 3-4 prioritaires (e.g. quote_response_under_24h, catalogue_complete, first_order_confirmed) et ajouter le reste après ?
6. **Auto-tracking via triggers business** — la RPC `record_founding_action` est-elle appelée :
   - (a) automatiquement via DB triggers sur events (orders.status=confirmed → +15)
   - (b) manuellement via edge functions / frontend callbacks
   - (c) hybride (auto pour core, manuel admin pour Q&A) ?

---

## 10. Dette 108 capturée

**Dette 108 : Vague 2 Founding Partner Tracking — implémentation Phase 2** (post-audit)

- Statut : Phase 1 audit done 2026-05-15, Phase 2 build pending validation founder (questions §9)
- Effort estimé selon Option A retenue : 4.5-6h sur 1-2 sessions
- Pré-requis : décisions founder sur §9 questions
- Trigger : démarchage actif marques (3-5 en cours post-Salone) — implémenter AVANT premières intégrations pour capter le tracking dès l'onboarding
- Dépendances : Dette 65 (déjà capturée) couvre cette mission ; Dette 108 est l'audit + détail d'implémentation
