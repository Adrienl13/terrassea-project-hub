-- ============================================================================
-- CHANTIER VOCAB 2026 — Bar Stools & High Tables specs (4 nouvelles colonnes)
-- Date     : 2026-04-30
-- Catégories : "Bar Stools" (3 produits) + Tables avec subcategory '%high%' (0)
-- Ref      : docs/chantiers/2026-05/PLAN_VOCAB_FIELDS.md §3.5
--
-- NOTE — seat_height_cm n'est PAS recréé : déjà migré integer → numeric(5,1)
-- en ÉTAPE 2 (migration products_base_fk_initplan_seatheight, D1 du PLAN).
--
-- Champs ajoutés :
--   - table_top_height_cm  numeric(5,1) null  (hauteur plateau, high tables only — 60-130)
--   - subdivision          text default 'unknown'  (counter/bar/tall/unknown)
--   - footrest             boolean default false   (présent sur bar stools)
--   - swivel               boolean default false   (assise pivotante, bar stools)
--
-- Cross-validation seat_height_cm ↔ table_top_height_cm : volontairement
-- non enforced en DB. Recommandation app-side (alerte soft UI) :
--   counter : seat ~65 / table top ~95
--   bar     : seat ~75 / table top ~105
--   tall    : seat ~85 / table top ~115
-- ============================================================================

ALTER TABLE public.products
  ADD COLUMN table_top_height_cm numeric(5,1),
  ADD COLUMN subdivision         text    DEFAULT 'unknown',
  ADD COLUMN footrest            boolean DEFAULT false,
  ADD COLUMN swivel              boolean DEFAULT false;

ALTER TABLE public.products
  ADD CONSTRAINT products_table_top_height_range
    CHECK (table_top_height_cm IS NULL OR table_top_height_cm BETWEEN 60 AND 130),
  ADD CONSTRAINT products_subdivision_enum
    CHECK (subdivision IN ('counter', 'bar', 'tall', 'unknown'));

COMMENT ON COLUMN public.products.table_top_height_cm IS
  'Hauteur du plateau (cm), high tables uniquement. Typiquement 25-30cm plus haute que le seat_height correspondant.';
COMMENT ON COLUMN public.products.subdivision IS
  'Sous-catégorie usage : counter (~65cm), bar (~75cm), tall (~85cm), unknown. S''applique aux bar stools et aux high tables.';
COMMENT ON COLUMN public.products.footrest IS
  'Présence d''un repose-pied intégré (bar stools — confort prolongé).';
COMMENT ON COLUMN public.products.swivel IS
  'Assise pivotante 360° ou partielle (bar stools).';
