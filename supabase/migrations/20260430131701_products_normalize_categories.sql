-- ============================================================================
-- CHANTIER VOCAB 2026 — Normalisation des catégories products
-- Date     : 2026-04-30
-- Ref      : docs/chantiers/2026-05/PLAN_VOCAB_FIELDS.md (ÉTAPE 7.0/7.1)
--
-- Objectif : aligner category sur les slugs frontend canoniques
--   (lowercase + kebab-case), préservation du sens métier
--
-- 4 mismatches identifiés couvrant 53/53 produits actuels :
--   Tables      → tables       (6 produits)
--   Bar Stools  → bar-stools   (3 produits)
--   Chairs      → chairs       (34 produits)
--   Armchairs   → armchairs    (10 produits)
--
-- Décisions founder :
--   - Q1 : Option B (slugs distincts chairs/armchairs)
--   - Q2 : suppression slug `seating` legacy de CATEGORIES (frontend, separé)
--   - Q3 : confirmé sur Tables / Bar Stools
--   - Q4 : réordonner CATEGORIES par volume/priorité (frontend, separé)
--
-- Validation pré-migration : count = 53 produits, 4 categories distinctes
-- Validation post-migration : count = 53, 4 categories en lowercase canoniques
-- ============================================================================

UPDATE public.products SET category = 'tables'     WHERE category = 'Tables';
UPDATE public.products SET category = 'bar-stools' WHERE category = 'Bar Stools';
UPDATE public.products SET category = 'chairs'     WHERE category = 'Chairs';
UPDATE public.products SET category = 'armchairs'  WHERE category = 'Armchairs';
