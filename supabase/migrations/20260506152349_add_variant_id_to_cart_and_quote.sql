-- ============================================================================
-- Dettes 2 + 3 — variant_id persistence in cart and quote
-- Date : 2026-05-06
--
-- Adds variant_id column to project_cart_items and quote_requests to persist
-- the user's variant selection through the relational submission flow.
--
-- Background : the cart already tracks variant_id in jsonb
-- (saved_carts.cart_data.selectedModelBVariantId) since chantier 9a-fix-2.
-- However, when the user submits the cart (creating project_cart_items rows)
-- or requests a quote (creating quote_requests rows), the variant_id was
-- dropped. This left partners and admins unable to identify which variant
-- was selected.
--
-- ON DELETE SET NULL : preserves historical cart/quote rows even if a variant
-- is later deleted (variant_id becomes NULL but the row stays). Cohérent
-- avec le pattern existant des FK soft (product_id, offer_id, partner_id sur
-- les 2 tables utilisent déjà SET NULL).
--
-- Frontend refactor (in same commit) :
-- - ProjectCart.tsx : 2 inserts (project_cart_items + quote_requests loop)
--   propagate variant_id
-- - QuoteRequestModal.tsx : receives selectedVariantId prop, uses in INSERT
-- - ProductDetail.tsx : passes selectedVariantId to QuoteRequestModal
--
-- Out of scope :
-- - Admin UI changes for variant display (feature add, not fix)
-- - selected_dimension_tag legacy column (kept for backward compat with 51
--   legacy products, deprecation tracked in Dette 5)
-- ============================================================================

-- ===== Step 0 : capture baseline =====

DO $$
DECLARE
  cart_has_variant  boolean;
  quote_has_variant boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='project_cart_items'
      AND column_name='variant_id'
  ) INTO cart_has_variant;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='quote_requests'
      AND column_name='variant_id'
  ) INTO quote_has_variant;

  IF cart_has_variant THEN
    RAISE NOTICE 'project_cart_items.variant_id already exists - migration may be idempotent';
  END IF;
  IF quote_has_variant THEN
    RAISE NOTICE 'quote_requests.variant_id already exists - migration may be idempotent';
  END IF;
END $$;

-- ===== Step 1 : Add variant_id to project_cart_items =====

ALTER TABLE public.project_cart_items
  ADD COLUMN IF NOT EXISTS variant_id uuid
    REFERENCES public.product_variants(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.project_cart_items.variant_id IS
  'Reference to product_variants. NULL if user did not select a variant or if variant was later deleted (ON DELETE SET NULL preserves cart history). Added 2026-05-06 (Dette 2).';

-- ===== Step 2 : Add variant_id to quote_requests =====

ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS variant_id uuid
    REFERENCES public.product_variants(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.quote_requests.variant_id IS
  'Reference to product_variants. NULL if user did not select a variant or if variant was later deleted (ON DELETE SET NULL preserves quote history). Added 2026-05-06 (Dette 3).';

-- ===== Step 3 : Embedded validation =====

DO $$
DECLARE
  cart_has_variant     boolean;
  quote_has_variant    boolean;
  cart_fk_def          text;
  quote_fk_def         text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='project_cart_items'
      AND column_name='variant_id'
  ) INTO cart_has_variant;
  IF NOT cart_has_variant THEN
    RAISE EXCEPTION 'project_cart_items.variant_id column not added';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='quote_requests'
      AND column_name='variant_id'
  ) INTO quote_has_variant;
  IF NOT quote_has_variant THEN
    RAISE EXCEPTION 'quote_requests.variant_id column not added';
  END IF;

  -- Check FK constraints have ON DELETE SET NULL
  SELECT pg_get_constraintdef(c.oid) INTO cart_fk_def
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
  WHERE c.conrelid = 'public.project_cart_items'::regclass
    AND c.contype = 'f'
    AND a.attname = 'variant_id';

  IF cart_fk_def IS NULL THEN
    RAISE EXCEPTION 'FK on project_cart_items.variant_id not created';
  END IF;
  IF cart_fk_def NOT ILIKE '%ON DELETE SET NULL%' THEN
    RAISE EXCEPTION 'FK on project_cart_items.variant_id should be ON DELETE SET NULL, got: %', cart_fk_def;
  END IF;

  SELECT pg_get_constraintdef(c.oid) INTO quote_fk_def
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
  WHERE c.conrelid = 'public.quote_requests'::regclass
    AND c.contype = 'f'
    AND a.attname = 'variant_id';

  IF quote_fk_def IS NULL THEN
    RAISE EXCEPTION 'FK on quote_requests.variant_id not created';
  END IF;
  IF quote_fk_def NOT ILIKE '%ON DELETE SET NULL%' THEN
    RAISE EXCEPTION 'FK on quote_requests.variant_id should be ON DELETE SET NULL, got: %', quote_fk_def;
  END IF;

  RAISE NOTICE 'OK: variant_id added to both tables with FK ON DELETE SET NULL';
END $$;
