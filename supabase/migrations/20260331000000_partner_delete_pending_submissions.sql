-- ============================================================================
-- Migration: Allow partners to delete their own pending submissions
-- Date: 2026-03-31
-- Purpose: The deduplication logic in submitProduct() needs to delete
--          existing pending_review submissions before creating a new one.
--          Without this policy, the DELETE was silently blocked by RLS.
-- ============================================================================

CREATE POLICY "Partners delete own pending submissions"
  ON public.product_submissions
  FOR DELETE
  USING (
    status = 'pending_review'
    AND EXISTS (
      SELECT 1 FROM partners
      WHERE partners.id = product_submissions.partner_id
        AND partners.user_id = auth.uid()
    )
  );
