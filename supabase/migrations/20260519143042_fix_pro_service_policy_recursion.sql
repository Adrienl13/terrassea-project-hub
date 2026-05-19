-- Fix infinite recursion (42P17) between RLS policies on
-- pro_service_requests and pro_service_matches.
--
-- Cycle :
--   pro_service_matches."Architects can read related matches"
--     → SELECT pro_service_requests
--   pro_service_requests."Partners read matched pro_service_requests"
--     → SELECT pro_service_matches
--   → re-enters "Architects can read related matches" → ∞
--
-- Symptom : any authenticated SELECT on either table fails outright,
-- so the pro-service feature is effectively dead for signed-in users.
--
-- Fix : move the cross-table predicates into two SECURITY DEFINER
-- helpers. Inside a DEFINER body, the inner SELECT bypasses RLS on the
-- target table, which breaks the recursion. The helpers themselves
-- enforce auth.uid() so the privilege escalation is none.
--
-- EXECUTE is granted only to authenticated (pro-service is signed-in
-- only) — anon stays revoked. Functions are STABLE + locked search_path.
-- Both helpers must be EXECUTE-granted for the calling role because
-- RLS policy evaluation runs with the caller's privileges
-- (lesson from 20260519135003 — see feedback memory).

-- ---------------------------------------------------------------------
-- Helper 1 : does the calling partner have a match on this request ?
-- Used by pro_service_requests."Partners read matched ..."
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.partner_matches_request(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pro_service_matches m
    JOIN public.partners p ON p.id = m.partner_id
    WHERE m.request_id = p_request_id
      AND p.user_id = (SELECT auth.uid())
  );
$$;

REVOKE EXECUTE ON FUNCTION public.partner_matches_request(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.partner_matches_request(uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- Helper 2 : does the calling architect own this request ?
-- Used by pro_service_matches."Architects can read related matches"
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.architect_owns_request(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pro_service_requests
    WHERE id = p_request_id
      AND architect_id = (SELECT auth.uid())
  );
$$;

REVOKE EXECUTE ON FUNCTION public.architect_owns_request(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.architect_owns_request(uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- Replace the two recursive policies
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Partners read matched pro_service_requests" ON public.pro_service_requests;
CREATE POLICY "Partners read matched pro_service_requests"
ON public.pro_service_requests
FOR SELECT
USING (public.partner_matches_request(id));

DROP POLICY IF EXISTS "Architects can read related matches" ON public.pro_service_matches;
CREATE POLICY "Architects can read related matches"
ON public.pro_service_matches
FOR SELECT
USING (public.architect_owns_request(request_id));
