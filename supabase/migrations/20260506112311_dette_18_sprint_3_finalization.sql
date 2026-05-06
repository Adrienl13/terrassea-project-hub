-- ============================================================================
-- Dette 18 Sprint 3 — Finalization (DB-versionable part)
-- Date : 2026-05-06
--
-- Closes the matview ACL portion of the remaining advisor warnings.
--
-- Step 1 : tighten product_review_stats ACL
--   The matview is intentionally exposed publicly for catalog review aggregates
--   display (count, avg rating, distribution). However ACL was overly permissive :
--   anon/authenticated had FULL privileges (a/r/w/d/D/x/t/m). Reduced to
--   SELECT-only. service_role retains its existing grants (untouched by REVOKE).
--
-- The materialized_view_in_api advisor warning will persist after this
-- migration (matview in public schema = exposed to API by design Postgres).
-- Documented as accepted false positive in DETTE_TECHNIQUE_AUDIT.md, optional
-- refactor tracked as Dette 22.
--
-- Manual actions required by founder via Supabase Dashboard SQL Editor :
--
-- (a) Restrict product-images bucket listing to authenticated.
--     storage.objects is owned by supabase_storage_admin, MCP postgres role
--     cannot DROP/CREATE policies on it. Run in Dashboard SQL Editor :
--
--     DROP POLICY "Public read access to product images" ON storage.objects;
--     CREATE POLICY "Authenticated read access to product images" ON storage.objects
--       FOR SELECT TO authenticated
--       USING (bucket_id = 'product-images');
--
-- (b) Enable "leaked password protection" :
--     Authentication → Providers → Email → Password security →
--     toggle "Prevent the use of leaked passwords".
--
-- See DETTE_TECHNIQUE_AUDIT.md → "Actions manuelles requises (Dashboard)".
-- ============================================================================

-- ===== Step 0 : capture baseline =====
-- NOTE : matviews don't appear in information_schema.role_table_grants.
-- Use has_table_privilege() and pg_class.relacl instead.

DO $$
DECLARE
  matview_acl text;
BEGIN
  SELECT relacl::text INTO matview_acl
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'product_review_stats';

  RAISE NOTICE 'Baseline ACL on product_review_stats: %', matview_acl;
  RAISE NOTICE 'Baseline anon privileges: select=% insert=% update=% delete=%',
    has_table_privilege('anon', 'public.product_review_stats', 'SELECT'),
    has_table_privilege('anon', 'public.product_review_stats', 'INSERT'),
    has_table_privilege('anon', 'public.product_review_stats', 'UPDATE'),
    has_table_privilege('anon', 'public.product_review_stats', 'DELETE');
END $$;

-- ===== Step 1 : tighten product_review_stats ACL =====

REVOKE ALL ON public.product_review_stats FROM anon, authenticated, PUBLIC;

GRANT SELECT ON public.product_review_stats TO anon, authenticated, service_role;

COMMENT ON MATERIALIZED VIEW public.product_review_stats IS
  'Public aggregated review statistics for product catalog display. SELECT-only access for anon/authenticated. Refreshed via trigger trg_refresh_product_review_stats on product_reviews.';

-- ===== Step 2 : embedded validation =====

DO $$
BEGIN
  -- anon should have ONLY SELECT
  IF NOT has_table_privilege('anon', 'public.product_review_stats', 'SELECT') THEN
    RAISE EXCEPTION 'anon does not have SELECT on product_review_stats after GRANT';
  END IF;

  IF has_table_privilege('anon', 'public.product_review_stats', 'INSERT')
     OR has_table_privilege('anon', 'public.product_review_stats', 'UPDATE')
     OR has_table_privilege('anon', 'public.product_review_stats', 'DELETE')
     OR has_table_privilege('anon', 'public.product_review_stats', 'TRUNCATE') THEN
    RAISE EXCEPTION 'anon still has write privileges on product_review_stats after REVOKE';
  END IF;

  -- authenticated should have ONLY SELECT
  IF NOT has_table_privilege('authenticated', 'public.product_review_stats', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated does not have SELECT on product_review_stats after GRANT';
  END IF;

  IF has_table_privilege('authenticated', 'public.product_review_stats', 'INSERT')
     OR has_table_privilege('authenticated', 'public.product_review_stats', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.product_review_stats', 'DELETE') THEN
    RAISE EXCEPTION 'authenticated still has write privileges on product_review_stats after REVOKE';
  END IF;

  -- service_role still has SELECT (untouched by REVOKE)
  IF NOT has_table_privilege('service_role', 'public.product_review_stats', 'SELECT') THEN
    RAISE EXCEPTION 'service_role lost SELECT on product_review_stats - unexpected';
  END IF;

  RAISE NOTICE 'OK: matview ACL reduced to SELECT-only for anon/authenticated, service_role retained';
END $$;
