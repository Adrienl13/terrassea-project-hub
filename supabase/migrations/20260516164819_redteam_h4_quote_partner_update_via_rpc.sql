-- Red-team H4 (2026-05-16): quote_requests partner UPDATE -> order forgery.
-- The "Partners can update own quote requests" policy let an assigned partner
-- UPDATE any column on a quote it owned, including client_user_id, email,
-- partner_id, signed_at, signed_pdf_path. Setting signed_at = now() triggered
-- auto_create_order_on_signature which INSERTed an orders row with the
-- partner-tampered values -- full order forgery in any victim's name with any
-- amount. The protect_signed_quote_requests trigger only fired post-signature
-- and only on financial fields, so pre-signature identity tampering was wide
-- open.
--
-- Fix:
--  1. Drop the broad partner UPDATE policy. Partner edits route exclusively
--     through the new SECURITY DEFINER RPC update_quote_as_partner with a
--     strict column whitelist (status in {pending, replied}, unit_price,
--     total_price, tva_rate, delivery_*, payment_conditions,
--     partner_conditions, validity_days). client_user_id, email,
--     partner_id, signed_at, signed_pdf_path are never written by partners.
--  2. Extend protect_signed_quote_requests to lock identity/signature
--     fields (partner_id, client_user_id, email, signed_at, signed_by,
--     signed_pdf_path) for non-admin/non-service_role at all times, not
--     just post-signature. Admin force-sign via AdminQuoteWorkflow.tsx
--     continues to work via is_admin() bypass.
--
-- Frontend caller usePartnerQuotes.ts:112 migrated in the same PR.

DROP POLICY "Partners can update own quote requests" ON public.quote_requests;

CREATE OR REPLACE FUNCTION public.protect_signed_quote_requests()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_jwt_role text := auth.role();
BEGIN
  IF public.is_admin() OR v_jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Identity + signature fields locked for non-admin/non-service_role at
  -- all times. Partners must use update_quote_as_partner RPC for replies;
  -- client signing flows must use a dedicated sign RPC (TBD).
  IF NEW.partner_id IS DISTINCT FROM OLD.partner_id THEN
    RAISE EXCEPTION 'quote_requests.partner_id locked'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NEW.client_user_id IS DISTINCT FROM OLD.client_user_id THEN
    RAISE EXCEPTION 'quote_requests.client_user_id locked'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'quote_requests.email locked'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NEW.signed_at IS DISTINCT FROM OLD.signed_at THEN
    RAISE EXCEPTION 'quote_requests.signed_at locked (use sign_quote_request flow)'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NEW.signed_by IS DISTINCT FROM OLD.signed_by THEN
    RAISE EXCEPTION 'quote_requests.signed_by locked'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NEW.signed_pdf_path IS DISTINCT FROM OLD.signed_pdf_path THEN
    RAISE EXCEPTION 'quote_requests.signed_pdf_path locked'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Original post-signature financial lock (kept identical to prior trigger)
  IF OLD.signed_at IS NOT NULL THEN
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
      RAISE EXCEPTION 'Cannot modify financial fields of a signed quote request'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_quote_as_partner(
  p_quote_id uuid,
  p_status text DEFAULT NULL,
  p_unit_price numeric DEFAULT NULL,
  p_total_price numeric DEFAULT NULL,
  p_tva_rate numeric DEFAULT NULL,
  p_delivery_delay_days int DEFAULT NULL,
  p_delivery_conditions text DEFAULT NULL,
  p_payment_conditions text DEFAULT NULL,
  p_partner_conditions text DEFAULT NULL,
  p_validity_days int DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_uid uuid := auth.uid();
  v_quote RECORD;
  v_is_owner boolean;
  v_validity_expires timestamptz;
  v_replied_at timestamptz;
BEGIN
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'update_quote_as_partner requires authenticated user'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT id, partner_id, signed_at, status INTO v_quote
  FROM public.quote_requests WHERE id = p_quote_id FOR UPDATE;
  IF v_quote.id IS NULL THEN
    RAISE EXCEPTION 'Quote request not found: %', p_quote_id;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.partners
    WHERE id = v_quote.partner_id AND user_id = v_caller_uid
  ) INTO v_is_owner;
  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'Not authorized: not the partner of this quote'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_quote.signed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot modify a signed quote request';
  END IF;

  IF p_status IS NOT NULL AND p_status NOT IN ('pending', 'replied') THEN
    RAISE EXCEPTION 'Status % not allowed for partner (allowed: pending, replied)', p_status;
  END IF;

  v_replied_at := CASE WHEN p_status = 'replied' THEN now() ELSE NULL END;
  v_validity_expires := CASE
    WHEN p_validity_days IS NOT NULL THEN now() + (p_validity_days || ' days')::interval
    ELSE NULL
  END;

  UPDATE public.quote_requests SET
    status = COALESCE(p_status, status),
    unit_price = COALESCE(p_unit_price, unit_price),
    total_price = COALESCE(p_total_price, total_price),
    tva_rate = COALESCE(p_tva_rate, tva_rate),
    delivery_delay_days = COALESCE(p_delivery_delay_days, delivery_delay_days),
    delivery_conditions = COALESCE(p_delivery_conditions, delivery_conditions),
    payment_conditions = COALESCE(p_payment_conditions, payment_conditions),
    partner_conditions = COALESCE(p_partner_conditions, partner_conditions),
    validity_days = COALESCE(p_validity_days, validity_days),
    validity_expires_at = COALESCE(v_validity_expires, validity_expires_at),
    replied_at = COALESCE(v_replied_at, replied_at)
  WHERE id = p_quote_id;

  RETURN jsonb_build_object(
    'quote_id', p_quote_id,
    'status', COALESCE(p_status, v_quote.status),
    'updated', true
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_quote_as_partner(uuid, text, numeric, numeric, numeric, int, text, text, text, int)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_quote_as_partner(uuid, text, numeric, numeric, numeric, int, text, text, text, int)
  TO authenticated;

COMMENT ON FUNCTION public.update_quote_as_partner IS
  'Partner-side quote reply with column whitelist. Closes red-team H4 (2026-05-16): replaces the broad partner UPDATE policy that allowed identity/signature/financial tampering.';
