-- ============================================================================
-- Migration: Add admin RLS policy for product_submissions
-- Date: 2026-03-31
-- Purpose: Admins could not read or update product_submissions — only partner
--          policies existed. This blocked approval, rejection, and feedback.
-- ============================================================================

CREATE POLICY "Admins full access to submissions"
  ON public.product_submissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.user_type = 'admin'
    )
  );
