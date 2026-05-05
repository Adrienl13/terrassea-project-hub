-- ============================================================================
-- HOTFIX 2026-05-05 — Restore EXECUTE on brand helpers for anon role
--
-- ROOT CAUSE
-- Migration 20260501135941_revoke_brand_helpers_execute_from_anon assumed
-- that anon does not need EXECUTE on is_brand_member / is_brand_owner
-- because auth.uid() is NULL for anon → the helpers would return false
-- anyway. This is incorrect: PostgreSQL checks function EXECUTE
-- permissions at QUERY PLANNING time (not at runtime), so any query whose
-- RLS policy QUAL references these helpers fails for the anon role with
--   ERROR 42501: permission denied for function is_brand_member
-- BEFORE any row is evaluated. PostgREST translates this to HTTP 401.
--
-- AFFECTED TABLES (RLS policies that reference is_brand_member / is_brand_owner)
--   - products (products_select_combined)
--   - product_variants (variants_select_combined)
--   - product_media (product_media_select_combined)
--
-- PRODUCTION IMPACT
-- terrassea.com served 0 products + console 401 errors since the migration
-- was applied 2026-05-01. localhost worked because the dev session is
-- typically authenticated, hitting the `authenticated` role which retained
-- EXECUTE.
--
-- FIX
-- GRANT EXECUTE back to anon. The functions still perform proper internal
-- security checks (auth.uid() returns NULL for anon → SELECT EXISTS with
-- user_id = NULL returns false → no privilege escalation possible). The
-- Supabase advisor warning `anon_security_definer_function_executable`
-- will return — this is acceptable for Phase 1, refactor in Phase 2 if
-- needed (inline the check as a sub-EXISTS clause in each RLS policy).
--
-- VALIDATION
-- DO block at the end asserts has_function_privilege('anon', ...) returns
-- true after the GRANT. Migration aborts on failure.
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.is_brand_member(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_brand_owner(uuid, uuid) TO anon;

DO $$
DECLARE
  can_execute_member boolean;
  can_execute_owner boolean;
BEGIN
  SELECT has_function_privilege('anon', 'public.is_brand_member(uuid, uuid)', 'EXECUTE')
  INTO can_execute_member;
  SELECT has_function_privilege('anon', 'public.is_brand_owner(uuid, uuid)', 'EXECUTE')
  INTO can_execute_owner;

  IF NOT can_execute_member THEN
    RAISE EXCEPTION 'Failed to grant EXECUTE on is_brand_member to anon';
  END IF;
  IF NOT can_execute_owner THEN
    RAISE EXCEPTION 'Failed to grant EXECUTE on is_brand_owner to anon';
  END IF;

  RAISE NOTICE 'OK: anon now has EXECUTE on both brand helpers';
END $$;
