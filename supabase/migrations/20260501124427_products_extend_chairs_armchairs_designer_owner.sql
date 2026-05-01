-- Phase 1 Modèle B variants — Migration 5 chantier (ex-Migration 5 plan)
-- ÉTAPE 4a — extension de products avec :
--   * 4 nouvelles colonnes Chairs / Armchairs (D-PV-6)
--   * primary_designer text Phase 1 (D-PV-15)
--   * owner_brand_id uuid pour multi-tenant (D-PV-7)
-- Réf : docs/strategy/PRODUCT_DATA_VISION.md §4.3
--      docs/chantiers/2026-05/PLAN_MODELE_B_VARIANTS.md §2 Migration 5
-- Création 2026-05-01.
--
-- Note : weight_kg, nesting_capacity, seat_depth_cm,
-- cushion_replacement_available existent DÉJÀ sur products
-- (chantier vocab 2026-04-30) — pas de doublon.

ALTER TABLE public.products
  -- Chairs (D-PV-6)
  ADD COLUMN has_armrests boolean,
  ADD COLUMN chair_structure_type text
    CHECK (chair_structure_type IS NULL OR chair_structure_type IN
      ('cantilever', 'four-leg', 'sled', 'swivel', 'wheels', 'other')),
  ADD COLUMN outdoor_classification text
    CHECK (outdoor_classification IS NULL OR outdoor_classification IN
      ('indoor-only', 'covered-outdoor', 'fully-outdoor', 'marine-grade')),

  -- Armchairs (D-PV-6) — has_armrests partagée avec Chairs (déjà ajoutée)
  ADD COLUMN usage_mode text
    CHECK (usage_mode IS NULL OR usage_mode IN ('dining', 'lounge', 'flex')),

  -- Designer Phase 1 (D-PV-15)
  ADD COLUMN primary_designer text,

  -- Multi-tenant Phase 1 (D-PV-7)
  -- ON DELETE RESTRICT : impose la migration explicite des produits
  -- avant suppression d'un partner. Cohérent avec products_partner_id_fkey
  -- (NO ACTION = même comportement effectif).
  ADD COLUMN owner_brand_id uuid REFERENCES public.partners(id) ON DELETE RESTRICT;

-- Index FK pour multi-tenant (utilisé par RLS variants_select_owner et siblings)
CREATE INDEX idx_products_owner_brand_id
  ON public.products(owner_brand_id) WHERE owner_brand_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────
-- Backfill owner_brand_id : reprise du partner_id existant
-- Pas de filtre par partner_type — tous les produits ayant un partner_id
-- legacy reçoivent owner_brand_id pour préserver l'accès partenaire.
-- Les corrections sémantiques (non-brand → brand) seront gérées en admin.
-- ─────────────────────────────────────────────────────────────────────────
UPDATE public.products
SET owner_brand_id = partner_id
WHERE partner_id IS NOT NULL
  AND owner_brand_id IS NULL;  -- idempotent : ne réécrit pas si déjà rempli

-- ─────────────────────────────────────────────────────────────────────────
-- Validation post-migration
-- ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  total_products int;
  with_partner int;
  with_owner int;
BEGIN
  SELECT COUNT(*) INTO total_products FROM public.products;
  SELECT COUNT(*) INTO with_partner FROM public.products WHERE partner_id IS NOT NULL;
  SELECT COUNT(*) INTO with_owner FROM public.products WHERE owner_brand_id IS NOT NULL;

  IF with_owner != with_partner THEN
    RAISE EXCEPTION 'Backfill mismatch: % products with partner_id but % with owner_brand_id', with_partner, with_owner;
  END IF;

  RAISE NOTICE 'products columns extended: total=%, with_partner=%, owner_brand_id backfilled on %', total_products, with_partner, with_owner;
END $$;

COMMENT ON COLUMN public.products.has_armrests IS
  'Caractéristique partagée Chairs / Armchairs / Sofas. NULL = inconnu.';
COMMENT ON COLUMN public.products.chair_structure_type IS
  'Typologie de structure pour Chairs (D-PV-6). cantilever / four-leg / sled / swivel / wheels / other.';
COMMENT ON COLUMN public.products.outdoor_classification IS
  'Niveau de résistance extérieur. indoor-only / covered-outdoor / fully-outdoor / marine-grade.';
COMMENT ON COLUMN public.products.usage_mode IS
  'Mode d''usage Armchair (D-PV-6). dining / lounge / flex.';
COMMENT ON COLUMN public.products.primary_designer IS
  'Nom du designer principal (texte Phase 1, table designers Phase 3 — D-PV-15).';
COMMENT ON COLUMN public.products.owner_brand_id IS
  'FK partners(id) — propriétaire multi-tenant. Phase 1 : backfill depuis partner_id. ÉTAPE 6 du chantier remplacera les RLS pour utiliser cette colonne (D-PV-7).';
