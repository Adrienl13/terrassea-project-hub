-- ============================================================================
-- ÉTAPE 9b-2a (2026-05-04) — Backfill owner_brand_id on Demo Modèle B product
--
-- Context: when ÉTAPE 7 admin matérialisation processed the Demo Modèle B
-- submission, it set partner_id (the submitting partner) but did NOT set
-- owner_brand_id (which references the brand-owning partner). The 52 legacy
-- products imported in ÉTAPE 4b have owner_brand_id = same partner.id by
-- convention (Pros Import is partner_type='reseller' but used as the catch-all
-- owner_brand for Phase 1).
--
-- 9b-2a routing /products/[brand-slug]/[product-slug] requires every product
-- to have an owner_brand resolvable to a partners.slug. This migration:
--   - sets owner_brand_id = partner_id for the 1 demo row currently NULL
--   - validates 0 NULL owner_brand_id remain on published products
--
-- After this, the partial unique index products_owner_brand_slug_unique now
-- effectively covers ALL published products.
-- ============================================================================

-- ── 1. Backfill the 1 row ──────────────────────────────────────────────────
UPDATE public.products
SET owner_brand_id = partner_id
WHERE name LIKE 'Demo Modèle B%'
  AND owner_brand_id IS NULL
  AND partner_id IS NOT NULL;

-- ── 2. Validation: all published products have owner_brand_id ──────────────
DO $$
DECLARE
  null_count int;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM public.products
  WHERE publish_status = 'published'
    AND owner_brand_id IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Backfill incomplete: % published products still have NULL owner_brand_id', null_count;
  END IF;
END
$$;
