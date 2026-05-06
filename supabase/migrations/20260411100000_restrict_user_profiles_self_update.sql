-- SECURITY FIX: Restrict user_profiles self-update to safe columns only.
--
-- The original policy "Users can update own profile" (auth.uid() = id) allows
-- users to modify ANY column on their own row, including email, siren,
-- country, country_code. Only user_type was protected by a trigger.
--
-- This migration:
--   1) Drops the overly-permissive "Users can update own profile" policy
--   2) Creates a SECURITY DEFINER RPC that only writes safe columns
--   3) Keeps the admin update policy intact (admins can still update all columns)

-- 1. Drop the overly-permissive self-update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

-- 2. Create a restricted RPC for self-update (only safe fields)
CREATE OR REPLACE FUNCTION public.update_own_profile(
  p_first_name text DEFAULT NULL,
  p_last_name  text DEFAULT NULL,
  p_company    text DEFAULT NULL,
  p_phone      text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_profiles
  SET
    first_name = COALESCE(p_first_name, first_name),
    last_name  = COALESCE(p_last_name,  last_name),
    company    = COALESCE(p_company,    company),
    phone      = COALESCE(p_phone,      phone)
  WHERE id = auth.uid();
END;
$$;

-- 3. Restrict EXECUTE to authenticated only (anon should never call this).
-- Aligned with Dette 18 Sprint 2 security baseline (commit 48fcd70).
REVOKE EXECUTE ON FUNCTION public.update_own_profile(text, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_own_profile(text, text, text, text)
  TO authenticated;
