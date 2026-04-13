-- ============================================================================
-- Phase 2: Security & Data Integrity
-- ============================================================================

-- ── 1. BEFORE UPDATE trigger: block modification of signed quotes ───────────
-- Prevents partners or anyone from changing financial fields after signing

CREATE OR REPLACE FUNCTION public.protect_signed_quote_requests()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the quote was previously signed, block changes to financial/contractual fields
  IF OLD.signed_at IS NOT NULL THEN
    -- Allow status changes by admins (e.g., to cancelled) and signed_pdf_path updates
    -- But block financial field modifications
    IF NEW.unit_price IS DISTINCT FROM OLD.unit_price
       OR NEW.total_price IS DISTINCT FROM OLD.total_price
       OR NEW.quantity IS DISTINCT FROM OLD.quantity
       OR NEW.tva_rate IS DISTINCT FROM OLD.tva_rate
       OR NEW.delivery_delay_days IS DISTINCT FROM OLD.delivery_delay_days
       OR NEW.delivery_conditions IS DISTINCT FROM OLD.delivery_conditions
       OR NEW.payment_conditions IS DISTINCT FROM OLD.payment_conditions
       OR NEW.partner_conditions IS DISTINCT FROM OLD.partner_conditions
       OR NEW.validity_days IS DISTINCT FROM OLD.validity_days
       OR NEW.validity_expires_at IS DISTINCT FROM OLD.validity_expires_at
    THEN
      -- Check if the current user is an admin
      IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Cannot modify financial fields of a signed quote request';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_signed_quotes
  BEFORE UPDATE ON public.quote_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_signed_quote_requests();

-- ── 2. Fix FK: partner_commissions.quote_request_id → quote_requests ───────
-- The FK currently points to project_requests (wrong table)

ALTER TABLE public.partner_commissions
  DROP CONSTRAINT IF EXISTS partner_commissions_quote_request_id_fkey;

ALTER TABLE public.partner_commissions
  ADD CONSTRAINT partner_commissions_quote_request_id_fkey
  FOREIGN KEY (quote_request_id) REFERENCES public.quote_requests(id)
  ON DELETE SET NULL;

-- ── 3. UNIQUE constraint on orders.quote_request_id ────────────────────────
-- Prevents duplicate orders from concurrent requests (race condition fix)
-- Use a partial unique index to allow multiple NULL values

CREATE UNIQUE INDEX IF NOT EXISTS orders_quote_request_id_unique
  ON public.orders (quote_request_id)
  WHERE quote_request_id IS NOT NULL;

-- ── 4. Sequential invoice numbers via DB sequence ──────────────────────────
-- French accounting requires sequential, continuous invoice numbers

CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq
  START WITH 1
  INCREMENT BY 1
  NO CYCLE;

-- Helper function to generate the next invoice number
CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _seq bigint;
  _year text;
  _month text;
BEGIN
  _seq := nextval('public.invoice_number_seq');
  _year := to_char(now(), 'YYYY');
  _month := to_char(now(), 'MM');
  RETURN 'INV-' || _year || _month || '-' || lpad(_seq::text, 5, '0');
END;
$$;

-- ── 5. Sequential payment references via DB sequence ───────────────────────

CREATE SEQUENCE IF NOT EXISTS public.payment_ref_seq
  START WITH 1
  INCREMENT BY 1
  NO CYCLE;

CREATE OR REPLACE FUNCTION public.next_payment_reference()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _seq bigint;
  _year text;
BEGIN
  _seq := nextval('public.payment_ref_seq');
  _year := to_char(now(), 'YYYY');
  RETURN 'TRS-' || _year || '-' || lpad(_seq::text, 6, '0');
END;
$$;

-- ── 6. Storage bucket policies for quote-documents ─────────────────────────
-- Note: The bucket must exist (created via dashboard or supabase CLI)
-- These policies control access via the storage.objects RLS

-- Allow partners to upload documents for their assigned quotes
CREATE POLICY "Partners can upload quote documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'quote-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.quote_requests
      WHERE partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
    )
  );

-- Allow partners to read documents for their assigned quotes
CREATE POLICY "Partners can read quote documents storage"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'quote-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.quote_requests
      WHERE partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
    )
  );

-- Allow clients to read documents for their own signed quotes
CREATE POLICY "Clients can read own signed quote documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'quote-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.quote_requests
      WHERE (client_user_id = auth.uid()
        OR email = (SELECT email FROM public.user_profiles WHERE id = auth.uid()))
        AND signed_at IS NOT NULL
    )
  );

-- Allow admins full access to quote documents storage
CREATE POLICY "Admins full access quote documents storage"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'quote-documents'
    AND public.is_admin()
  );

-- ── 7. Automatic quote expiration ──────────────────────────────────────────
-- Mark quotes as expired when validity_expires_at has passed
-- This can be called by run-scheduled-tasks or a pg_cron job

CREATE OR REPLACE FUNCTION public.expire_overdue_quotes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
BEGIN
  UPDATE public.quote_requests
  SET status = 'expired'
  WHERE status = 'replied'
    AND validity_expires_at IS NOT NULL
    AND validity_expires_at < now()
    AND signed_at IS NULL;

  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

-- ── 8. Add reminder tracking to prevent duplicate emails ───────────────────
ALTER TABLE public.quote_requests ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz;

-- ── 9. Clean up duplicate deposit columns ──────────────────────────────────
-- orders has both deposit_percent and deposit_percentage (duplicate)
-- Keep deposit_percent (used by usePaymentFlow), drop deposit_percentage if unused

-- First check if deposit_percentage has any non-null data
DO $$
BEGIN
  -- Only drop if the column exists and has no data
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'deposit_percentage'
  ) THEN
    -- Check if any row has data in deposit_percentage but not deposit_percent
    IF NOT EXISTS (
      SELECT 1 FROM public.orders
      WHERE deposit_percentage IS NOT NULL AND deposit_percent IS NULL
    ) THEN
      ALTER TABLE public.orders DROP COLUMN IF EXISTS deposit_percentage;
    END IF;
  END IF;
END;
$$;
