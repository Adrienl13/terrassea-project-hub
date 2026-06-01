-- ============================================================
-- Pro Service — allow a partner to RESPOND to their own matches
-- Date : 2026-06-01
--
-- Context : pro_service_matches had only SELECT for partners
-- ("Partners can read own service matches"), plus admin ALL and
-- architect SELECT. There was no INSERT/UPDATE path for a partner,
-- so the partner hub's accept/decline buttons could not persist.
--
-- This adds an UPDATE policy so a partner can respond to a match
-- that belongs to them (status, partner_response, partner_responded_at).
-- Match CREATION stays admin-only (admin proposes a partner to a
-- request) via the pre-existing "Admins manage all service matches".
--
-- Column-level restriction is not enforced here (RLS is row-level);
-- a partner can only ever touch rows where partner_id maps to their
-- own partners.user_id = auth.uid(). Hardening to specific columns
-- can be added later via a trigger if needed.
-- ============================================================

DROP POLICY IF EXISTS "Partners respond to own service matches" ON public.pro_service_matches;

CREATE POLICY "Partners respond to own service matches"
  ON public.pro_service_matches
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.partners
      WHERE partners.id = pro_service_matches.partner_id
        AND partners.user_id = (SELECT auth.uid())
        AND partners.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.partners
      WHERE partners.id = pro_service_matches.partner_id
        AND partners.user_id = (SELECT auth.uid())
        AND partners.deleted_at IS NULL
    )
  );

-- Validation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pro_service_matches'
      AND policyname = 'Partners respond to own service matches'
  ) THEN
    RAISE EXCEPTION 'pro_service partner respond policy missing';
  END IF;
  RAISE NOTICE 'OK pro_service partner UPDATE policy in place';
END $$;
