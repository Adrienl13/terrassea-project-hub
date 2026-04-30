-- ============================================================================
-- CHANTIER VOCAB 2026 — Tables specs (7 nouvelles colonnes)
-- Date     : 2026-04-30
-- Catégorie : Tables (6 produits existants)
-- Ref      : docs/chantiers/2026-05/PLAN_VOCAB_FIELDS.md §3.1
--
-- Champs ajoutés (tous nullable, défauts sensés) :
--   - built_in_umbrella_hole          boolean  default false
--   - umbrella_hole_diameter_mm       integer  null  (requis si built_in_umbrella_hole=true)
--   - top_thickness_cm                numeric  null
--   - is_tippable                     boolean  default false
--   - extension_capability            boolean  default false
--   - extension_max_length_cm         integer  null  (requis si extension_capability=true)
--   - outdoor_anchor_compatible       boolean  default false
--
-- Cohérence : aucune CHECK constraint cross-field (validation app-side via zod)
--             pour permettre la flexibilité du backfill manuel ultérieur.
-- ============================================================================

ALTER TABLE public.products
  ADD COLUMN built_in_umbrella_hole       boolean DEFAULT false,
  ADD COLUMN umbrella_hole_diameter_mm    integer,
  ADD COLUMN top_thickness_cm             numeric(4,1),
  ADD COLUMN is_tippable                  boolean DEFAULT false,
  ADD COLUMN extension_capability         boolean DEFAULT false,
  ADD COLUMN extension_max_length_cm      integer,
  ADD COLUMN outdoor_anchor_compatible    boolean DEFAULT false;

-- Range CHECK on numeric fields (defensive ; matches zod ranges in PLAN_VOCAB_FIELDS §3.1)
ALTER TABLE public.products
  ADD CONSTRAINT products_umbrella_hole_diameter_range
    CHECK (umbrella_hole_diameter_mm IS NULL OR umbrella_hole_diameter_mm BETWEEN 20 AND 80),
  ADD CONSTRAINT products_top_thickness_range
    CHECK (top_thickness_cm IS NULL OR top_thickness_cm BETWEEN 0.5 AND 15),
  ADD CONSTRAINT products_extension_max_length_range
    CHECK (extension_max_length_cm IS NULL OR extension_max_length_cm BETWEEN 80 AND 400);

COMMENT ON COLUMN public.products.built_in_umbrella_hole IS
  'Trou intégré pour parasol. Si true, umbrella_hole_diameter_mm devrait être renseigné (app-side).';
COMMENT ON COLUMN public.products.is_tippable IS
  'Plateau rabattable pour stockage hivernal.';
COMMENT ON COLUMN public.products.extension_capability IS
  'Possibilité de rallonge. Si true, extension_max_length_cm devrait être renseigné (app-side).';
COMMENT ON COLUMN public.products.outdoor_anchor_compatible IS
  'Compatible ancrage au sol (vissage, plot, lestage).';
