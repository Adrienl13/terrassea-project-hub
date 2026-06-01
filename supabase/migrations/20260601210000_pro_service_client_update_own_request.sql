-- ============================================================
-- Pro Service — clients can edit their own request
-- Date : 2026-06-01
--
-- Clients had SELECT on their own request but no UPDATE, so they
-- could neither review-then-fix nor complete a request after sending
-- it. This adds an UPDATE policy (own request, not completed/cancelled;
-- ownership cannot be reassigned via WITH CHECK).
-- ============================================================

DROP POLICY IF EXISTS "Clients update own pro_service_requests" ON public.pro_service_requests;
CREATE POLICY "Clients update own pro_service_requests"
  ON public.pro_service_requests
  FOR UPDATE
  USING (
    client_user_id = (SELECT auth.uid())
    AND status NOT IN ('completed', 'cancelled')
  )
  WITH CHECK (
    client_user_id = (SELECT auth.uid())
  );
