-- Red-team H2 (2026-05-16): user_profiles.email IDOR.
-- The policy "Admins manage all profiles" (polcmd=w, USING ((auth.uid()=id)
-- OR is_admin()), no WITH CHECK) let any authenticated user self-UPDATE
-- their own user_profiles row including the email column. The orders
-- SELECT policy uses `client_email = (SELECT email FROM user_profiles
-- WHERE id = auth.uid())`, so an attacker who set their email to a
-- victim's address could read every order with that client_email
-- (PII, addresses, amounts, stripe_session_id).
--
-- The legitimate self-edit path is the SECURITY DEFINER RPC
-- update_own_profile (whitelists first_name, last_name, company, phone,
-- siren, country, country_code -- explicitly excludes email). Auditing
-- src/ confirmed no frontend code performs a direct self-UPDATE on
-- user_profiles; the only direct UPDATE is AdminUsers.tsx:78 which
-- runs as admin and doesn't touch email.
--
-- Fix:
--  1. Drop the broad self-update policy. Admin policy "Admins can update
--     all profiles" (admin-only) remains, so admin edits via AdminUsers
--     continue to work. Self-edits route through update_own_profile RPC.
--  2. Defense-in-depth: trigger that blocks email/id changes for non-
--     admin / non-service_role callers, so even if a future migration
--     re-adds a self-update policy the email column stays locked.

DROP POLICY "Admins manage all profiles" ON public.user_profiles;

CREATE OR REPLACE FUNCTION public.prevent_user_profile_protected_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_jwt_role text := auth.role();
BEGIN
  -- Admin + service_role bypass. Direct DB access (postgres role) goes
  -- through ALTER TABLE ... DISABLE TRIGGER pattern, mirroring the
  -- partners trigger from H1.
  IF public.is_admin() OR v_jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'user_profiles.email can only be modified by an admin'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'user_profiles.id cannot be changed'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prevent_user_profile_protected_changes() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_prevent_user_profile_protected_changes ON public.user_profiles;
CREATE TRIGGER trg_prevent_user_profile_protected_changes
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_user_profile_protected_changes();

COMMENT ON FUNCTION public.prevent_user_profile_protected_changes IS
  'Blocks non-admin / non-service_role callers from changing user_profiles.email or .id. Closes red-team H2 (2026-05-16).';
