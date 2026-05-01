-- Phase 1 Modèle B variants — Migration 7 plan / ÉTAPE 4b chantier
-- Création de 1 default variant par product existant (52 → 52).
-- Réf : docs/strategy/PRODUCT_DATA_VISION.md §4 Risque 3
--      docs/chantiers/2026-05/PLAN_MODELE_B_VARIANTS.md §4
--      docs/chantiers/2026-05/snapshot_products_pre_migration.csv (audit)
-- Création 2026-05-01.
--
-- STRATÉGIE
-- 1 product → 1 product (inchangé) + 1 product_variants ligne avec is_default=true
-- Backward compat : les colonnes legacy sur products NE SONT PAS supprimées
-- (Q5 reco A validée — deprecate Phase 2).
--
-- MAPPING fabric_certification (CamelCase enum) → material_brand_id (uuid)
-- Aligné avec src/lib/materialBrandsMapping.ts. Tous les 52 produits actuels
-- ont fabric_certification='Unknown' → tous mappent vers material_brands.slug='unknown'.
-- La CTE ci-dessous reste exhaustive pour résister aux migrations futures.
--
-- MAPPING dimensions
-- products.dimensions_length_cm → product_variants.width_cm
-- products.dimensions_width_cm  → product_variants.depth_cm
-- products.dimensions_height_cm → product_variants.height_cm
-- (mapping symétrique 1:1, le UI public Phase 1 lit toujours depuis products)

-- Étape 1 : insert via JOIN avec mapping fabric_certification
WITH fabric_to_brand AS (
  SELECT 'Sunbrella'         AS legacy, mb.id AS new_id FROM public.material_brands mb WHERE mb.slug = 'sunbrella'
  UNION ALL SELECT 'Solaris',           id FROM public.material_brands WHERE slug = 'solaris'
  UNION ALL SELECT 'Dickson_Orchestra', id FROM public.material_brands WHERE slug = 'dickson-orchestra'
  UNION ALL SELECT 'Dickson_Saphir',    id FROM public.material_brands WHERE slug = 'dickson-saphir'
  UNION ALL SELECT 'Serge_Ferrari',     id FROM public.material_brands WHERE slug = 'serge-ferrari'
  UNION ALL SELECT 'Other',             id FROM public.material_brands WHERE slug = 'other-fabric'
  UNION ALL SELECT 'Unknown',           id FROM public.material_brands WHERE slug = 'unknown'
)
INSERT INTO public.product_variants (
  product_id,
  variant_name,
  width_cm, depth_cm, height_cm,
  weight_kg,
  material_brand_id,
  fabric_color_slug,
  is_stackable,
  has_armrests,
  price_eur,
  price_currency,
  in_stock,
  stock_quantity,
  delivery_weeks_min,
  delivery_weeks_max,
  is_made_to_order,
  is_published,
  is_default,
  source_type
)
SELECT
  p.id,
  COALESCE(p.name, 'Unnamed') || ' (default)' AS variant_name,
  -- Mapping dimensions L/W/H → W/D/H (1:1 par convention Phase 1)
  p.dimensions_length_cm,
  p.dimensions_width_cm,
  p.dimensions_height_cm,
  p.weight_kg,
  -- Mapping fabric_certification → material_brand_id (fallback unknown)
  COALESCE(fb.new_id, (SELECT id FROM public.material_brands WHERE slug = 'unknown')),
  -- main_color seulement si présent dans colors_canonical
  CASE WHEN EXISTS (SELECT 1 FROM public.colors_canonical c WHERE c.slug = p.main_color)
       THEN p.main_color ELSE NULL END,
  COALESCE(p.is_stackable, false),
  -- has_armrests : NULL pour l'instant, hérité du parent products (qui est aussi NULL)
  p.has_armrests,
  -- Pricing : on copie price_min comme prix de base (peut être null)
  p.price_min,
  'EUR',
  -- in_stock = available si stock_status='in_stock' ET availability_type non made-to-order
  COALESCE(p.stock_status = 'in_stock' AND
           (p.availability_type IS NULL OR p.availability_type NOT IN ('on-order', 'made_to_order')), false),
  p.stock_quantity,
  -- Delivery weeks : ceil(estimated_delivery_days / 7)
  CASE WHEN p.estimated_delivery_days IS NOT NULL
       THEN GREATEST(1, CEIL(p.estimated_delivery_days::numeric / 7))::int
       ELSE NULL END,
  CASE WHEN p.estimated_delivery_days IS NOT NULL
       THEN GREATEST(1, CEIL(p.estimated_delivery_days::numeric / 7))::int
       ELSE NULL END,
  COALESCE(p.availability_type IN ('on-order', 'made_to_order') OR p.stock_status = 'on_order', false),
  COALESCE(p.publish_status = 'published', false),
  true,                                -- is_default = TRUE (1 par produit)
  'manual'                              -- source_type = saisie manuelle existante
FROM public.products p
LEFT JOIN fabric_to_brand fb ON p.fabric_certification = fb.legacy;

-- ─────────────────────────────────────────────────────────────────────────
-- Validation post-INSERT : 52 = 52 = 52
-- ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  products_count int;
  variants_count int;
  default_variants_count int;
  orphan_products int;
  variants_with_brand int;
BEGIN
  SELECT COUNT(*) INTO products_count FROM public.products;
  SELECT COUNT(*) INTO variants_count FROM public.product_variants;
  SELECT COUNT(*) INTO default_variants_count FROM public.product_variants WHERE is_default = true;

  -- Produits sans default variant
  SELECT COUNT(*) INTO orphan_products FROM public.products p
  WHERE NOT EXISTS (
    SELECT 1 FROM public.product_variants v WHERE v.product_id = p.id AND v.is_default = true
  );

  -- Variantes avec material_brand_id
  SELECT COUNT(*) INTO variants_with_brand FROM public.product_variants WHERE material_brand_id IS NOT NULL;

  IF products_count != 52 THEN
    RAISE EXCEPTION 'Expected 52 products, got %', products_count;
  END IF;
  IF variants_count != 52 THEN
    RAISE EXCEPTION 'Expected 52 variants after INSERT, got %', variants_count;
  END IF;
  IF default_variants_count != 52 THEN
    RAISE EXCEPTION 'Expected 52 default variants, got %', default_variants_count;
  END IF;
  IF orphan_products != 0 THEN
    RAISE EXCEPTION 'Found % products without a default variant', orphan_products;
  END IF;
  IF variants_with_brand != 52 THEN
    RAISE EXCEPTION 'Expected all 52 variants to have material_brand_id (fallback unknown), got %', variants_with_brand;
  END IF;

  RAISE NOTICE 'Migration 52→52 OK: products=%, variants=%, default_variants=%, all linked to material_brand', products_count, variants_count, default_variants_count;
END $$;
