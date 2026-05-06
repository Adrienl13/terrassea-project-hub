-- ============================================================================
-- Dette 37 — Lowercase canonical alignment for partners.product_categories
-- Date : 2026-05-06
--
-- Aligns existing partners.product_categories array values to lowercase-kebab
-- convention used by the partner UI (BecomePartner, PartnerProfileForm) after
-- Dette 37 fix. Without this migration, partners with CamelCase or
-- camelCase values would silently lose their selections (UI checkbox state
-- would not match anymore).
--
-- Pre-check 2026-05-06 : 1 partner affected (Pros Import) with values
-- ["Chairs","Tables","Parasols","Loungers"]. The migration is idempotent
-- (re-running produces no change after the first apply).
-- ============================================================================

-- Step 1 : capture baseline
DO $$
DECLARE
  affected_count integer;
BEGIN
  SELECT count(*) INTO affected_count
  FROM partners
  WHERE product_categories::text ~ '[A-Z ]'
    AND product_categories IS NOT NULL;

  RAISE NOTICE 'Migrating % partners with non-canonical categories', affected_count;
END $$;

-- Step 2 : migrate (lowercase + replace spaces with kebab dashes)
UPDATE partners
SET product_categories = ARRAY(
  SELECT lower(replace(unnest, ' ', '-'))
  FROM unnest(product_categories)
)
WHERE product_categories::text ~ '[A-Z ]'
  AND product_categories IS NOT NULL;

-- Step 3 : validation
DO $$
DECLARE
  remaining integer;
BEGIN
  SELECT count(*) INTO remaining
  FROM partners
  WHERE product_categories::text ~ '[A-Z ]'
    AND product_categories IS NOT NULL;

  IF remaining > 0 THEN
    RAISE EXCEPTION 'Migration incomplete: % partners still have non-canonical categories', remaining;
  END IF;

  RAISE NOTICE 'OK: All partner product_categories aligned to lowercase-kebab';
END $$;
