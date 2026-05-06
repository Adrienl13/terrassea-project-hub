-- ============================================================================
-- Dette 38 — Extend update_own_profile RPC to include siren, country, country_code
-- Date : 2026-05-06
--
-- Builds on the historical migration 20260411100000 (just applied to close the
-- drift discovered during Dette 38 recon). Extends the RPC to allow client-side
-- editing of siren, country, and country_code (3 additional fields).
--
-- Frontend impact : ClientSettingsSection extended to show 3 additional
-- editable fields with country dropdown sourced from new lib/countries.ts.
--
-- Implementation note : PostgreSQL identifies functions by (name, arg types).
-- The 4-param version from the historical migration would coexist with the new
-- 7-param version unless explicitly dropped. We DROP it first to keep a single
-- canonical RPC (frontend always calls with 7 params after this migration).
--
-- Drift incident note : the historical migration was created on 2026-04-11 but
-- never applied to the DB. The frontend already called update_own_profile,
-- causing silent failures (caught by silent try/catch in ClientSections.tsx).
-- This drift incident is captured as Dette 43 for process improvement.
-- ============================================================================

-- Step 0 : capture baseline
DO $$
DECLARE
  v_4param_exists boolean;
  v_7param_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'update_own_profile'
      AND p.pronargs = 4
  ) INTO v_4param_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'update_own_profile'
      AND p.pronargs = 7
  ) INTO v_7param_exists;

  RAISE NOTICE 'Baseline : 4-param exists=%, 7-param exists=%', v_4param_exists, v_7param_exists;
END $$;

-- Step 1 : drop the 4-param version (superseded)
DROP FUNCTION IF EXISTS public.update_own_profile(text, text, text, text);

-- Step 2 : create the 7-param version
CREATE OR REPLACE FUNCTION public.update_own_profile(
  p_first_name   text DEFAULT NULL,
  p_last_name    text DEFAULT NULL,
  p_company      text DEFAULT NULL,
  p_phone        text DEFAULT NULL,
  p_siren        text DEFAULT NULL,
  p_country      text DEFAULT NULL,
  p_country_code text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := auth.uid();

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'update_own_profile requires authenticated user';
  END IF;

  UPDATE public.user_profiles
  SET
    first_name   = COALESCE(p_first_name,   first_name),
    last_name    = COALESCE(p_last_name,    last_name),
    company      = COALESCE(p_company,      company),
    phone        = COALESCE(p_phone,        phone),
    siren        = COALESCE(p_siren,        siren),
    country      = COALESCE(p_country,      country),
    country_code = COALESCE(p_country_code, country_code)
  WHERE id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user: %', v_uid;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_own_profile(text, text, text, text, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_own_profile(text, text, text, text, text, text, text)
  TO authenticated;

COMMENT ON FUNCTION public.update_own_profile IS
  'Self-service profile update for authenticated users. COALESCE pattern allows partial updates (only changed fields need to be passed). Restricts editable fields to identity/contact (no user_type, email, id manipulation). Extended 2026-05-06 with siren, country, country_code (Dette 38).';

-- Step 3 : embedded validation
DO $$
DECLARE
  v_param_count integer;
  v_anon_can_call boolean;
  v_auth_can_call boolean;
BEGIN
  SELECT pronargs INTO v_param_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'update_own_profile';

  IF v_param_count IS NULL OR v_param_count <> 7 THEN
    RAISE EXCEPTION 'update_own_profile should have 7 params, got %', v_param_count;
  END IF;

  SELECT has_function_privilege(
    'anon',
    'public.update_own_profile(text, text, text, text, text, text, text)',
    'EXECUTE'
  ) INTO v_anon_can_call;

  SELECT has_function_privilege(
    'authenticated',
    'public.update_own_profile(text, text, text, text, text, text, text)',
    'EXECUTE'
  ) INTO v_auth_can_call;

  IF v_anon_can_call THEN
    RAISE EXCEPTION 'anon should NOT have EXECUTE on update_own_profile';
  END IF;
  IF NOT v_auth_can_call THEN
    RAISE EXCEPTION 'authenticated SHOULD have EXECUTE on update_own_profile';
  END IF;

  RAISE NOTICE 'OK: update_own_profile extended to 7 params with proper EXECUTE permissions';
END $$;
