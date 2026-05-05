-- ============================================================================
-- Add scope column to certifications referential
-- ÉTAPE 8d-3 (2026-05-05).
--
-- REASON
-- Certifications operate at 3 levels of granularity (brand / product_family /
-- product_unit). The scope column enables proper UI partitioning between
-- partner-level forms (brand) and product-level forms (product_family,
-- product_unit), and proper grouping in product detail pages for architects
-- / public buyers.
--
-- MAPPING (validated by founder, based on industry research)
-- - brand (8): organization-level certifications
--     iso-9001, iso-14001, fsc, pefc, reach,
--     made-in-france, made-in-italy, made-in-eu
-- - product_family (2): product range certifications
--     ecolabel-eu, en-581
-- - product_unit (7): individual product certifications with unique PV/test
--     oeko-tex-100, greenguard, greenguard-gold, cradle-to-cradle,
--     en-1335, fr-fire-class-m1, fire-class-m2
-- ============================================================================

-- ── Step 1: Add column nullable first (so we can seed) ──────────────────────
ALTER TABLE public.certifications
  ADD COLUMN scope text
  CHECK (scope IN ('brand', 'product_family', 'product_unit'));

-- ── Step 2: Seed scope per certification ────────────────────────────────────
UPDATE public.certifications SET scope = 'brand' WHERE slug IN (
  'iso-9001', 'iso-14001', 'fsc', 'pefc', 'reach',
  'made-in-france', 'made-in-italy', 'made-in-eu'
);

UPDATE public.certifications SET scope = 'product_family' WHERE slug IN (
  'ecolabel-eu', 'en-581'
);

UPDATE public.certifications SET scope = 'product_unit' WHERE slug IN (
  'oeko-tex-100', 'greenguard', 'greenguard-gold',
  'cradle-to-cradle', 'en-1335', 'fr-fire-class-m1',
  'fire-class-m2'
);

-- ── Step 3: Validation embarquée AVANT NOT NULL ─────────────────────────────
DO $$
DECLARE
  unscored_count integer;
  total_count integer;
  brand_count integer;
  family_count integer;
  unit_count integer;
BEGIN
  SELECT COUNT(*) INTO unscored_count
    FROM public.certifications WHERE scope IS NULL;
  SELECT COUNT(*) INTO total_count
    FROM public.certifications;

  IF unscored_count > 0 THEN
    RAISE EXCEPTION
      'Migration aborted: % certifications still have NULL scope (out of %). Investigate before forcing NOT NULL.',
      unscored_count, total_count;
  END IF;

  SELECT COUNT(*) INTO brand_count FROM public.certifications WHERE scope = 'brand';
  SELECT COUNT(*) INTO family_count FROM public.certifications WHERE scope = 'product_family';
  SELECT COUNT(*) INTO unit_count FROM public.certifications WHERE scope = 'product_unit';

  IF brand_count <> 8 OR family_count <> 2 OR unit_count <> 7 THEN
    RAISE EXCEPTION
      'Migration aborted: distribution mismatch. Got brand=%, product_family=%, product_unit=% (expected 8/2/7).',
      brand_count, family_count, unit_count;
  END IF;

  RAISE NOTICE 'OK: % certifications all have scope assigned (8/2/7 distribution validated)', total_count;
END $$;

-- ── Step 4: Make NOT NULL once seed is complete ─────────────────────────────
ALTER TABLE public.certifications ALTER COLUMN scope SET NOT NULL;

-- ── Step 5: Add index for filter queries ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_certifications_scope
  ON public.certifications(scope);

-- ── Step 6: Comment for future devs ─────────────────────────────────────────
COMMENT ON COLUMN public.certifications.scope IS
  'Granularity level: brand (org-wide cert) / product_family (cert per range) / product_unit (cert per individual product with unique PV). Drives UI partitioning between partner_certifications form and product_certifications form. Added in migration 20260505121902 (ÉTAPE 8d-3).';
