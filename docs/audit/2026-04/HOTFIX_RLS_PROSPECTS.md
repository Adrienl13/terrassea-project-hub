# HOTFIX — Activation RLS sur les 3 tables `*_prospects`

**Date :** 2026-04-29
**Sévérité :** CRITIQUE (RGPD + exposition publique données personnelles B2B)
**Statut :** Étape B rédigée — en attente de validation du SQL avant Étape C (création migration)

---

## 1. Contexte

Détecté lors de l'ÉTAPE 1 de l'audit (RECON) via `mcp__supabase__get_advisors` :

> Niveau Supabase Advisor : **ERROR**
> Tables `public.architect_prospects`, `public.distributor_prospects`, `public.brand_prospects` exposées via PostgREST sans RLS.

Confirmé par `pg_class.relrowsecurity = false` sur les trois tables et `pg_policies` retourne `[]` (aucune policy existante).

| Table | Lignes | RLS activée | Policies |
|---|---|---|---|
| `architect_prospects` | 36 | ❌ | aucune |
| `distributor_prospects` | 26 | ❌ | aucune |
| `brand_prospects` | 52 | ❌ | aucune |

**Total : 114 lignes potentiellement exfiltrables** par tout visiteur du site (clé anon publique dans le bundle client).

---

## 2. Schéma réel des 3 tables

### 2.1 Champs communs aux 3 tables (CRM B2B)

| Catégorie | Colonnes |
|---|---|
| **Identité** | `id` (uuid PK), `company_id` (text UNIQUE NOT NULL), `company_name` (text NOT NULL) |
| **Contacts (PII)** | `contacts` (jsonb NOT NULL, default `'[]'`), `generic_email`, `current_contact_name`, `current_contact_email` |
| **Présence web** | `website`, `instagram`, `city`, `country`, `language` |
| **Statut commercial** | `status` (default `'new'`), `first_contact_date`, `last_contact_date`, `next_action_date`, `next_action_type` |
| **Tracking emails (PII)** | `emails_sent`, `total_contacts_tried`, `last_gmail_message_id`, `last_subject_line`, `has_replied`, `reply_date`, `reply_sentiment`, `reply_summary`, `reply_from` |
| **Conversion** | `converted` (bool), `conversion_type`, `conversion_date`, `hooks_reserved` (jsonb) |
| **IA / Scoring (interne)** | `scout_score`, `analyst_score`, `analyst_profile` (jsonb), `competitive_intel`, `notes` |
| **Audit** | `created_at`, `updated_at` |

### 2.2 Champs spécifiques

**`architect_prospects`** : `profile_type`, `segment`, `project_scale`, `outdoor_status`, `digital_maturity`, `furniture_brands` (text[]).

**`brand_prospects`** : `brand_type`, `product_categories` (text[]), `signature_materials` (text[]), `price_segment`, `has_chr_focus`, `has_outdoor`, `met_at_event`, `target_plan`, `last_gmail_thread_id`.

**`distributor_prospects`** : `distributor_type`, `brands_carried` (text[]), `product_categories` (text[]), `geographic_coverage` (text[]), `has_showroom`, `showroom_locations`, `segment`, `estimated_size`, `has_ecommerce`, `digital_maturity`, `targets_chr`.

### 2.3 Contraintes & relations

- **PK** : `id` (uuid, default `gen_random_uuid()`).
- **UNIQUE** : `company_id` sur les 3 tables.
- **NOT NULL** : `id`, `company_id`, `company_name`, `contacts`.
- ❌ Aucune FK vers `auth.users` ou `public.user_profiles`.
- ❌ Aucun champ `created_by` / `owner_id` → pas de propriétaire individuel.
- ❌ Aucun trigger.
- Indexes présents (`hasindexes=true`) — PK + UNIQUE confirmés.

---

## 3. Données personnelles & sensibilité (RGPD)

Colonnes constituant des **données personnelles** au sens RGPD :

- `generic_email`, `current_contact_email`, `current_contact_name`, `reply_from`
- `contacts` (jsonb : noms, emails, rôles, téléphones)
- `reply_summary`, `reply_sentiment` → **profilage IA** d'individus
- `analyst_profile` (jsonb), `scout_score`, `analyst_score` → scoring algorithmique (Article 22 RGPD)
- `last_gmail_message_id`, `last_gmail_thread_id` → preuves de correspondance email externe stockées
- `notes`, `competitive_intel` → texte libre potentiellement sensible

Volume estimé : 114 entreprises × ~1-3 contacts ≈ **150-350 personnes concernées**.

---

## 4. Évaluation du risque RGPD (validée founder 2026-04-29)

| Critère | Évaluation |
|---|---|
| **Type de données** | Contacts professionnels B2B — **pas de données sensibles** au sens art. 9 RGPD (santé, opinions, etc.) |
| **Volume** | 114 lignes (entreprises) ; ~150-350 personnes physiques |
| **Exposition côté front** | **Zéro** : noms de tables non leakés dans le bundle client (vérifié par `grep` sur `src/` → 1 seule occurrence dans types auto-générés, jamais importée par un composant) |
| **Exploitabilité réelle** | Théorique : tout visiteur connaissant les noms exacts `architect_prospects` etc. + ayant la clé anon (publique par design) pouvait lancer une requête PostgREST. **Probabilité de découverte fortuite : très faible** (noms non discoverable côté front, pas d'introspection GraphQL exposée) |
| **Probabilité de fuite effective** | Très faible. À confirmer par le founder via inspection des logs API Supabase 30 derniers jours |
| **Décision notification CNIL** | **Pas de notification active**. Justification : risque pour les personnes faible (B2B, pas de données sensibles), exposition front nulle, probabilité quasi-nulle |
| **Action complémentaire founder** | Vérification logs API Supabase 30 derniers jours (côté Studio Supabase). Si requêtes anonymes externes détectées sur ces tables → réévaluation et notification CNIL si nécessaire |
| **Documentation interne** | Cet incident est documenté dans ce fichier + sera mentionné dans `AUDIT.md` section "Corrections appliquées avant audit complet" |

---

## 5. Usages dans le code

### 5.1 Codebase application

Recherche `architect_prospects | distributor_prospects | brand_prospects` :

| Zone | Occurrences | Détail |
|---|---|---|
| `src/` (frontend) | **1 fichier** | `src/integrations/supabase/types.ts` — types auto-générés uniquement, aucun import |
| `supabase/functions/` (edge) | **0 fichier** | |
| `api/` (Vercel functions) | **0 fichier** | |
| `supabase/migrations/` | **0 fichier** | Tables NON créées via migration versionnée |

**Conclusion** : tables jamais lues ni écrites par l'application Terrassea elle-même.

### 5.2 Système externe (confirmé 90% par founder, à valider empiriquement après fix)

Indicateurs convergents : colonnes Gmail, scoring IA en deux passes (scout/analyst), `hooks_reserved`, dossier `.agents/` à la racine, MCP servers Gmail/Calendar/Drive/Supabase déclarés dans `.mcp.json`.

**Hypothèse retenue** : agent CRM externe utilisant la **service_role key** Supabase. Validation empirique post-fix : **si l'agent continue d'écrire après activation RLS, hypothèse confirmée** ; sinon il faudra adapter les policies pour couvrir une autre clé.

---

## 6. Historique RLS

- **Aucun commit de création** des 3 tables dans le repo (`git log --diff-filter=A`).
- Tables créées hors-repo (Studio Supabase ou script externe).
- Migration `20260408300000_enable_rls_all_tables.sql` n'a pas couvert ces tables (créées probablement après ou hors radar).
- **Verdict : RLS jamais activée depuis création. Oubli pur.**

---

## 7. Étape B — Plan SQL des policies (à valider AVANT création de la migration)

### 7.1 Stratégie

**RLS activée + FORCE + policies ADMIN-ONLY** sur les 3 tables, via `public.is_admin()` (déjà défini en `20260408200000`).

- `ENABLE ROW LEVEL SECURITY` → active la RLS sur la table.
- `FORCE ROW LEVEL SECURITY` → la RLS s'applique aussi au propriétaire de la table (le rôle `postgres`). Rappel important : **le rôle `service_role` de Supabase a l'attribut `BYPASSRLS`**, donc il continue de bypass même avec FORCE — c'est la garantie que l'agent externe restera fonctionnel.
- 4 policies par table (SELECT / INSERT / UPDATE / DELETE), toutes gardées par `public.is_admin()`.

### 7.2 Nom du fichier de migration proposé

```
supabase/migrations/20260429120000_enable_rls_prospects_admin_only.sql
```

Pattern aligné sur les migrations existantes (timestamp 14 chiffres + libellé snake_case).

### 7.3 SQL complet à valider

```sql
-- ============================================================================
-- HOTFIX RLS — Lockdown admin-only sur les 3 tables *_prospects
-- Date     : 2026-04-29
-- Sévérité : CRITIQUE (advisor Supabase ERROR : rls_disabled_in_public)
-- Contexte : voir docs/audit/2026-04/HOTFIX_RLS_PROSPECTS.md
--
-- Tables visées : architect_prospects, distributor_prospects, brand_prospects
-- Stratégie    : RLS activée + FORCE + policies admin-only via public.is_admin()
-- Bypass légitime : service_role (BYPASSRLS) — agent CRM externe inchangé
-- ============================================================================

-- ── 1. ENABLE + FORCE RLS sur les 3 tables ──────────────────────────────────

ALTER TABLE public.architect_prospects   ENABLE  ROW LEVEL SECURITY;
ALTER TABLE public.architect_prospects   FORCE   ROW LEVEL SECURITY;

ALTER TABLE public.distributor_prospects ENABLE  ROW LEVEL SECURITY;
ALTER TABLE public.distributor_prospects FORCE   ROW LEVEL SECURITY;

ALTER TABLE public.brand_prospects       ENABLE  ROW LEVEL SECURITY;
ALTER TABLE public.brand_prospects       FORCE   ROW LEVEL SECURITY;

-- ── 2. Policies admin-only sur architect_prospects ──────────────────────────

CREATE POLICY "Admins can read architect_prospects" ON public.architect_prospects
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can insert architect_prospects" ON public.architect_prospects
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update architect_prospects" ON public.architect_prospects
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete architect_prospects" ON public.architect_prospects
  FOR DELETE USING (public.is_admin());

-- ── 3. Policies admin-only sur distributor_prospects ────────────────────────

CREATE POLICY "Admins can read distributor_prospects" ON public.distributor_prospects
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can insert distributor_prospects" ON public.distributor_prospects
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update distributor_prospects" ON public.distributor_prospects
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete distributor_prospects" ON public.distributor_prospects
  FOR DELETE USING (public.is_admin());

-- ── 4. Policies admin-only sur brand_prospects ──────────────────────────────

CREATE POLICY "Admins can read brand_prospects" ON public.brand_prospects
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can insert brand_prospects" ON public.brand_prospects
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update brand_prospects" ON public.brand_prospects
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete brand_prospects" ON public.brand_prospects
  FOR DELETE USING (public.is_admin());

-- ============================================================================
-- FIN. Vérifier ensuite via mcp__supabase__get_advisors que les 3 entrées
-- "rls_disabled_in_public" ont disparu.
-- ============================================================================
```

### 7.4 Détail des choix techniques

| Choix | Justification |
|---|---|
| `FORCE ROW LEVEL SECURITY` | Demandé par founder. Garantit que même `postgres` (owner) est soumis aux policies. `service_role` reste exempt via `BYPASSRLS`. |
| `public.is_admin()` | Helper SECURITY DEFINER existant (`20260408200000`). Évite les self-references RLS sur `user_profiles`. |
| 4 policies distinctes (SELECT/INSERT/UPDATE/DELETE) | Pattern utilisé partout dans le repo (cf. `20260326180000_security_rls_lockdown.sql`). Plus lisible qu'une policy `FOR ALL` et permet d'auditer/modifier finement. |
| `WITH CHECK` sur INSERT et UPDATE | Standard pour les opérations qui produisent une nouvelle ligne ou modifient ses valeurs. |
| Pas de `DROP POLICY IF EXISTS` | Inutile — confirmé par `SELECT * FROM pg_policies` que **0 policy** existe sur ces tables. Un DROP préalable produirait juste du bruit. |
| Pas de policy "anyone can INSERT" | Cas d'usage public confirmé inexistant. L'agent passe par service_role. |
| Pas d'index supplémentaire | Hors scope hotfix. Optimisations à programmer dans l'audit complet. |

---

## 8. Plan de tests post-deployment

### 8.1 Tests automatisables côté DB (via `mcp__supabase__execute_sql`)

```sql
-- Test 1 — Anon (utilisateur non authentifié) : SELECT doit renvoyer 0 ligne.
-- Note : Postgres ne renvoie PAS d'erreur 401 ; PostgREST applique simplement
-- les policies. Une policy absente = lecture vide silencieuse.
BEGIN;
  SET LOCAL ROLE anon;
  SELECT COUNT(*) AS architect_count   FROM public.architect_prospects;   -- attendu : 0
  SELECT COUNT(*) AS distributor_count FROM public.distributor_prospects; -- attendu : 0
  SELECT COUNT(*) AS brand_count       FROM public.brand_prospects;       -- attendu : 0
ROLLBACK;
```

```sql
-- Test 2 — Authenticated non-admin : SELECT doit renvoyer 0 ligne.
-- Simule un user authentifié SANS user_type='admin'.
-- ATTENTION : nécessite de fabriquer un JWT claim ; pas trivial via execute_sql.
-- Recommandation : test depuis le client Supabase après login d'un user 'client',
-- en exécutant : await supabase.from('architect_prospects').select('*')
-- → attendu : data = [], pas d'erreur réseau.
```

```sql
-- Test 3 — Authenticated admin : SELECT doit renvoyer 36 / 26 / 52 lignes.
-- Idem Test 2, à exécuter depuis le client Supabase après login admin.
-- → attendu : data.length = 36 (ou 26, ou 52)
```

```sql
-- Test 4 — service_role : INSERT puis DELETE d'une ligne factice.
-- À exécuter UNIQUEMENT après ton GO explicite.
INSERT INTO public.architect_prospects (company_id, company_name, contacts)
VALUES ('hotfix-test-row', 'HOTFIX TEST', '[]'::jsonb)
RETURNING id;
-- Si succès → service_role bypass confirmé. Note l'ID renvoyé.

DELETE FROM public.architect_prospects WHERE company_id = 'hotfix-test-row';
-- Vérifier qu'aucune trace ne subsiste.
```

### 8.2 Validation empirique de l'agent externe

**Critère de succès** : dans les 24h post-déploiement, l'agent doit continuer à écrire ou modifier des lignes (vérifiable via `MAX(updated_at)` sur les 3 tables avant/après).

```sql
-- À exécuter avant déploiement
SELECT MAX(updated_at) AS last_update_before FROM public.architect_prospects
UNION ALL SELECT MAX(updated_at) FROM public.distributor_prospects
UNION ALL SELECT MAX(updated_at) FROM public.brand_prospects;

-- À ré-exécuter 24h après déploiement
-- Si MAX(updated_at) a avancé → agent fonctionne (service_role confirmé)
-- Si MAX(updated_at) inchangé → soupçon de blocage, investiguer la clé utilisée par l'agent
```

### 8.3 Vérification advisor post-fix

```
mcp__supabase__get_advisors(type="security")
→ Vérifier que les 3 entrées suivantes ont disparu :
  - rls_disabled_in_public_public_architect_prospects
  - rls_disabled_in_public_public_distributor_prospects
  - rls_disabled_in_public_public_brand_prospects
```

Si une entrée subsiste : la migration a échoué silencieusement, à investiguer immédiatement.

---

## 9. Plan de rollback (NON commité, usage humain d'urgence)

Si après déploiement un cas d'usage légitime casse (ex. agent qui s'avère utiliser une autre clé), exécuter manuellement :

```sql
-- ROLLBACK D'URGENCE — à coller dans le Studio Supabase, NE PAS COMMITER
-- Annule complètement le hotfix. À utiliser UNIQUEMENT en cas de blocage critique
-- de l'agent externe ou d'un workflow non identifié.

DROP POLICY IF EXISTS "Admins can read architect_prospects"   ON public.architect_prospects;
DROP POLICY IF EXISTS "Admins can insert architect_prospects" ON public.architect_prospects;
DROP POLICY IF EXISTS "Admins can update architect_prospects" ON public.architect_prospects;
DROP POLICY IF EXISTS "Admins can delete architect_prospects" ON public.architect_prospects;

DROP POLICY IF EXISTS "Admins can read distributor_prospects"   ON public.distributor_prospects;
DROP POLICY IF EXISTS "Admins can insert distributor_prospects" ON public.distributor_prospects;
DROP POLICY IF EXISTS "Admins can update distributor_prospects" ON public.distributor_prospects;
DROP POLICY IF EXISTS "Admins can delete distributor_prospects" ON public.distributor_prospects;

DROP POLICY IF EXISTS "Admins can read brand_prospects"   ON public.brand_prospects;
DROP POLICY IF EXISTS "Admins can insert brand_prospects" ON public.brand_prospects;
DROP POLICY IF EXISTS "Admins can update brand_prospects" ON public.brand_prospects;
DROP POLICY IF EXISTS "Admins can delete brand_prospects" ON public.brand_prospects;

ALTER TABLE public.architect_prospects   NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.architect_prospects   DISABLE  ROW LEVEL SECURITY;

ALTER TABLE public.distributor_prospects NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_prospects DISABLE  ROW LEVEL SECURITY;

ALTER TABLE public.brand_prospects       NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.brand_prospects       DISABLE  ROW LEVEL SECURITY;
```

**Si rollback exécuté** : l'incident initial est rouvert (RLS désactivée). Il faut alors :
1. Identifier précisément la clé / le rôle utilisé par le workflow cassé.
2. Adapter les policies pour couvrir ce rôle (ou créer une policy `FOR ALL TO <role> USING (true)` ciblée).
3. Relancer un déploiement corrigé.

---

## 10. Advisors restants à traiter (hors hotfix)

Issus du même scan `mcp__supabase__get_advisors(type="security")` mais **hors scope** de ce hotfix :

| Advisor | Niveau | Cible | Plan |
|---|---|---|---|
| `function_search_path_mutable` | WARN | `public.update_product_review_timestamp` | À traiter pendant l'audit thématique (Thème 4 — Sécurité ou Thème 3 — Backend Supabase) |
| Autres warnings/errors | À détailler | (sortie tronquée à 645 KB ; à explorer en sous-agent pendant l'audit) | Idem, audit thématique |

L'output complet de `get_advisors(type="security")` est persisté dans `/Users/adrien/.claude/projects/.../tool-results/mcp-supabase-get_advisors-1777463928949.txt` (645 KB). Un sous-agent fera l'extraction complète pendant l'ÉTAPE 2.

---

## 11. Questions / réponses founder (validées 2026-04-29)

| # | Question | Réponse founder |
|---|---|---|
| Q1 | Confirmation service_role pour l'agent externe | 90 % confiance, validation empirique post-fix via Test 4 + section 8.2 |
| Q2 | Cas d'usage caché lecture/écriture côté app | Aucun. Consultation hors-app (Google Sheet ou similaire) |
| Q3 | Conservation des 114 lignes | Option (a) — sécuriser sans toucher aux données. Audit RGPD base légale = chantier séparé cette semaine |
| Q4 | Notification CNIL | Pas de notification active. Vérification logs Supabase 30j par founder. Réévaluation si requêtes anonymes suspectes détectées |

---

## 12. Prochaines étapes

- [x] **Étape A** — Investigation ciblée + diagnostic
- [x] **Étape B** — Plan SQL + tests + rollback (ce document)
- [ ] **STOP validation founder** — relire le SQL section 7.3 et donner GO Étape C
- [ ] **Étape C** — Création de `supabase/migrations/20260429120000_enable_rls_prospects_admin_only.sql` puis application en prod après GO explicite
- [ ] **Étape C bis** — Exécution Tests 1 (anon, via execute_sql) puis Test 4 (service_role INSERT/DELETE, après GO) et Test advisor
- [ ] **Étape C ter** — Tests 2 et 3 (user authentifié non-admin et admin) côté client par le founder
- [ ] **Étape D** — Mise à jour AUDIT.md (sera créé à l'ÉTAPE 2 de l'audit) + RECON.md + reprise de la RECON là où on l'avait laissée

---

## Annexe — Commandes SQL d'investigation utilisées (Étape A)

```sql
-- Schéma
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('architect_prospects', 'distributor_prospects', 'brand_prospects');

-- Contraintes
SELECT tc.table_name, tc.constraint_name, tc.constraint_type, kcu.column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu USING (constraint_name, table_schema)
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('architect_prospects', 'distributor_prospects', 'brand_prospects');

-- État RLS
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname IN ('architect_prospects', 'distributor_prospects', 'brand_prospects');

-- Policies existantes
SELECT * FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('architect_prospects', 'distributor_prospects', 'brand_prospects');
-- → []

-- Triggers
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('architect_prospects', 'distributor_prospects', 'brand_prospects');
-- → []

-- Fonction is_admin
SELECT routine_definition FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'is_admin';
-- → SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND user_type = 'admin'
```
