
-- Add columns for application review workflow
ALTER TABLE public.partner_applications
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Allow updating applications (for admin status changes)
CREATE POLICY "Allow updating applications"
  ON public.partner_applications
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
