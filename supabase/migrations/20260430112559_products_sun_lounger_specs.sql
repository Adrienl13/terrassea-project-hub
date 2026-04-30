-- ============================================================================
-- CHANTIER VOCAB 2026 — Sun Loungers specs (5 nouvelles colonnes)
-- Date     : 2026-04-30
-- Catégorie : Sun Loungers (0 produit existant en DB ; pré-création schéma)
-- Ref      : docs/chantiers/2026-05/PLAN_VOCAB_FIELDS.md §3.3
--
-- Champs ajoutés :
--   - cushion_quick_dry      boolean default false  (coussin séchage rapide)
--   - salt_water_resistance  boolean default false  (résistance eau salée — plage)
--   - chlorine_resistance    boolean default false  (résistance chlore — piscine)
--   - sand_drainage          boolean default false  (perforations évacuation sable)
--   - nesting_capacity       integer null           (max unités empilables, 1-50 ou null)
--
-- Cohérence avec is_stackable existant : si nesting_capacity > 0,
-- is_stackable devrait être true (validation app-side, pas DB pour
-- garder la flexibilité du backfill manuel).
--
-- Vérification pré-migration : aucun champ existant équivalent
-- (cushion_*, *_resistance, drainage_*, nesting_*, sand_*, salt_*, chlorine_*
-- tous absents). is_stackable existant est conservé tel quel.
-- ============================================================================

ALTER TABLE public.products
  ADD COLUMN cushion_quick_dry     boolean DEFAULT false,
  ADD COLUMN salt_water_resistance boolean DEFAULT false,
  ADD COLUMN chlorine_resistance   boolean DEFAULT false,
  ADD COLUMN sand_drainage         boolean DEFAULT false,
  ADD COLUMN nesting_capacity      integer;

ALTER TABLE public.products
  ADD CONSTRAINT products_nesting_capacity_range
    CHECK (nesting_capacity IS NULL OR nesting_capacity BETWEEN 1 AND 50);

COMMENT ON COLUMN public.products.cushion_quick_dry IS
  'Coussin avec mousse à séchage rapide (drainage interne + tissu déperlant).';
COMMENT ON COLUMN public.products.salt_water_resistance IS
  'Matériaux et finitions résistant à l''eau salée (usage plage / front de mer).';
COMMENT ON COLUMN public.products.chlorine_resistance IS
  'Matériaux résistant au chlore (usage piscine).';
COMMENT ON COLUMN public.products.sand_drainage IS
  'Perforations ou design permettant l''évacuation naturelle du sable.';
COMMENT ON COLUMN public.products.nesting_capacity IS
  'Nombre maximum d''unités empilables pour stockage hivernal. Null = non empilable ou non documenté.';
