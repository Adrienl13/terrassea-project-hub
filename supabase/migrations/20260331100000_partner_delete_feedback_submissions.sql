-- ============================================================================
-- Migration: Extend partner submission delete to include feedback_sent
-- Date: 2026-03-31
-- Purpose: Partners need to delete feedback_sent submissions when they
--          correct and re-submit after admin feedback. The existing policy
--          only covers pending_review.
-- ============================================================================

-- Drop the old narrow policy and replace with one covering both statuses
DROP POLICY IF EXISTS "Partners delete own pending submissions" ON public.product_submissions;

CREATE POLICY "Partners delete own pending or feedback submissions"
  ON public.product_submissions
  FOR DELETE
  USING (
    status IN ('draft', 'pending_review', 'feedback_sent')
    AND EXISTS (
      SELECT 1 FROM partners
      WHERE partners.id = product_submissions.partner_id
        AND partners.user_id = auth.uid()
    )
  );
