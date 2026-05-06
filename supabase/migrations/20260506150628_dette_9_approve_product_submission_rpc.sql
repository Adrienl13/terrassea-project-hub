-- ============================================================================
-- Dette 9 — approve_product_submission_as_new RPC (atomic approval)
-- Date : 2026-05-06
--
-- Replaces the non-transactional steps 8-12 of the approveAsNew frontend hook
-- (src/hooks/useProductSubmissions.ts) with a single SECURITY DEFINER RPC
-- using PostgreSQL's implicit transaction. If any step fails, ROLLBACK
-- automatically restores DB state.
--
-- Eliminates 3 known issues :
-- 1. CRITICAL — crash between offers INSERT and submission UPDATE caused
--    product duplication on admin retry (race-check passed because
--    submission still pending_review)
-- 2. SILENT-FAIL — offers INSERT errors were console.warn only, products
--    were published without offers
-- 3. FRAGILE CLEANUP — applicative DELETE products on variants failure
--    could itself fail, leaving orphans (logged as CRITICAL)
--
-- Frontend keeps :
--   - Storage uploads (image_url, gallery_urls, environment_urls)
--   - Race-check (UX feedback) + name/category validation
--   - Slug generation (read existing slugs)
--   - Variants validation (assertExactlyOneDefault)
--
-- RPC handles atomically (steps 8-12) :
--   - INSERT products (id pre-generated to satisfy NOT NULL)
--   - INSERT product_variants[] (batch via jsonb_array_elements)
--   - INSERT product_offers[] (batch, errors raised — no silent fail)
--   - UPDATE product_submissions (status, approved_product_id, reviewed_by)
--
-- Out of scope :
--   - Storage orphans if RPC fails after uploads (cron cleaner future)
--   - approveEdit similar non-transactional pattern → Dette 23 separate
--
-- Implementation note :
-- Uses jsonb_populate_record(NULL::table_row, jsonb) for schema-resilient
-- field mapping. New columns added to products/variants/offers will be
-- automatically picked up if present in the JSONB payload — no RPC update
-- needed. Missing columns produce NULL and are accepted by nullable cols
-- or default-cols (id pre-set, timestamps overridden to now()).
-- ============================================================================

-- ===== Step 0 : capture baseline =====

DO $$
DECLARE
  rpc_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'approve_product_submission_as_new'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) INTO rpc_exists;

  IF rpc_exists THEN
    RAISE NOTICE 'RPC already exists, will replace via CREATE OR REPLACE';
  ELSE
    RAISE NOTICE 'RPC creating fresh';
  END IF;
END $$;

-- ===== Step 1 : Create RPC =====

CREATE OR REPLACE FUNCTION public.approve_product_submission_as_new(
  p_submission_id uuid,
  p_product       jsonb,
  p_variants      jsonb,
  p_offers        jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
DECLARE
  v_caller_uid    uuid;
  v_status        text;
  v_product_id    uuid;
  v_variant_ids   uuid[] := ARRAY[]::uuid[];
  v_offer_ids     uuid[] := ARRAY[]::uuid[];
  v_now           timestamptz := now();
BEGIN
  -- Auth + admin check
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'approve_product_submission_as_new requires authenticated user';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'approve_product_submission_as_new requires admin privileges';
  END IF;

  -- Race-check + lock the submission row to prevent concurrent admin retries
  SELECT status INTO v_status
    FROM public.product_submissions
   WHERE id = p_submission_id
   FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Submission not found: %', p_submission_id;
  END IF;

  IF v_status NOT IN ('pending_review', 'changes_requested') THEN
    RAISE EXCEPTION 'Submission % not in approvable state (current status: %)',
      p_submission_id, v_status;
  END IF;

  -- INSERT product (pre-generate id to satisfy NOT NULL ; override timestamps)
  v_product_id := gen_random_uuid();

  INSERT INTO public.products
  SELECT (jsonb_populate_record(
    NULL::public.products,
    p_product
      || jsonb_build_object(
           'id',         v_product_id,
           'created_at', v_now,
           'updated_at', v_now
         )
  )).*;

  -- INSERT product_variants[] — batch, override product_id and timestamps
  IF jsonb_array_length(p_variants) > 0 THEN
    WITH inserted AS (
      INSERT INTO public.product_variants
      SELECT (jsonb_populate_record(
        NULL::public.product_variants,
        v
          || jsonb_build_object(
               'id',         gen_random_uuid(),
               'product_id', v_product_id,
               'created_at', v_now,
               'updated_at', v_now
             )
      )).*
      FROM jsonb_array_elements(p_variants) AS v
      RETURNING id
    )
    SELECT array_agg(id) INTO v_variant_ids FROM inserted;
  END IF;

  -- INSERT product_offers[] — batch, override product_id and timestamps.
  -- Errors propagate (no silent-fail like the previous frontend implementation).
  IF jsonb_array_length(p_offers) > 0 THEN
    WITH inserted AS (
      INSERT INTO public.product_offers
      SELECT (jsonb_populate_record(
        NULL::public.product_offers,
        o
          || jsonb_build_object(
               'id',         gen_random_uuid(),
               'product_id', v_product_id,
               'created_at', v_now,
               'updated_at', v_now
             )
      )).*
      FROM jsonb_array_elements(p_offers) AS o
      RETURNING id
    )
    SELECT array_agg(id) INTO v_offer_ids FROM inserted;
  END IF;

  -- UPDATE submission status — final step closes the atomic flow
  UPDATE public.product_submissions
     SET status              = 'approved',
         approved_product_id = v_product_id,
         reviewed_at         = v_now,
         reviewed_by         = v_caller_uid,
         updated_at          = v_now
   WHERE id = p_submission_id;

  RETURN jsonb_build_object(
    'product_id',  v_product_id,
    'variant_ids', v_variant_ids,
    'offer_ids',   v_offer_ids
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.approve_product_submission_as_new(uuid, jsonb, jsonb, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_product_submission_as_new(uuid, jsonb, jsonb, jsonb)
  TO authenticated;

COMMENT ON FUNCTION public.approve_product_submission_as_new IS
  'Atomically approves a product submission as a new product (Dette 9 fix). Replaces non-transactional approveAsNew frontend hook. Verifies admin via is_admin(). PG ROLLBACK on any failure ensures atomicity. Uses jsonb_populate_record for schema-resilient field mapping.';

-- ===== Step 2 : Embedded validation =====

DO $$
DECLARE
  rpc_created       boolean;
  rpc_security_def  boolean;
  anon_can_execute  boolean;
  auth_can_execute  boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'approve_product_submission_as_new'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) INTO rpc_created;

  IF NOT rpc_created THEN
    RAISE EXCEPTION 'RPC approve_product_submission_as_new not created';
  END IF;

  SELECT prosecdef INTO rpc_security_def
    FROM pg_proc
   WHERE proname = 'approve_product_submission_as_new'
     AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

  IF NOT rpc_security_def THEN
    RAISE EXCEPTION 'RPC must be SECURITY DEFINER';
  END IF;

  SELECT has_function_privilege(
    'anon',
    'public.approve_product_submission_as_new(uuid, jsonb, jsonb, jsonb)',
    'EXECUTE'
  ) INTO anon_can_execute;

  SELECT has_function_privilege(
    'authenticated',
    'public.approve_product_submission_as_new(uuid, jsonb, jsonb, jsonb)',
    'EXECUTE'
  ) INTO auth_can_execute;

  IF anon_can_execute THEN
    RAISE EXCEPTION 'anon should NOT have EXECUTE on approve_product_submission_as_new';
  END IF;

  IF NOT auth_can_execute THEN
    RAISE EXCEPTION 'authenticated SHOULD have EXECUTE on approve_product_submission_as_new';
  END IF;

  RAISE NOTICE 'OK: approve_product_submission_as_new created, SECURITY DEFINER, anon revoked, authenticated granted';
END $$;
