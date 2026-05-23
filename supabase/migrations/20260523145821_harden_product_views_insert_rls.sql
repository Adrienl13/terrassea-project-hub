-- ============================================================================
-- Harden product_views INSERT RLS
-- Date: 2026-05-23
--
-- The original policy "Anyone can insert product views" used WITH CHECK (true),
-- which allowed any caller (incl. anon) to forge `user_id` to impersonate
-- another user in analytics. Replace with a check that constrains user_id to
-- either NULL (anonymous view) or the caller's own auth.uid().
--
-- partner_id is not constrained here because it's derived from the viewed
-- product, not from the caller. Server-side / client-side code is expected
-- to set it correctly; abuse here only pollutes analytics, not security.
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can insert product views" ON public.product_views;

CREATE POLICY "Anyone can insert product views"
  ON public.product_views FOR INSERT
  WITH CHECK (
    user_id IS NULL OR user_id = (SELECT auth.uid())
  );

COMMENT ON POLICY "Anyone can insert product views" ON public.product_views IS
  'Anonymous (user_id NULL) or authenticated (user_id=auth.uid()) inserts only. Prevents user_id impersonation in analytics.';
