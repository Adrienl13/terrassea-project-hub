-- ============================================================
-- Dette 74 — Enrich auto_create_order_on_signature trigger
-- Date : 2026-05-13
--
-- The previous trigger (Lot B Day 11) created orders with 10+
-- critical NULL fields : payment_reference, invoice_number,
-- deposit_due_date, balance_due_date, tva_rate, delivery_*,
-- payment_conditions, partner_conditions, estimated_delivery_date,
-- client_user_id, unit_price, payment_method.
--
-- Consequence : the Y1 client payment-instructions email (Lot B)
-- rendered "Référence : —" because payment_reference was NULL,
-- making the bank transfer unidentifiable.
--
-- This migration replaces the trigger body to populate ALL fields
-- equivalent to `usePaymentFlow.createOrderFromQuote` (audit
-- DOUBLE_ORDER_AUDIT.md §4). The frontend code becomes redundant
-- and will be removed in the same commit.
--
-- Sources :
--   - public.next_payment_reference() — existing sequence (TRS-YYYY-NNNNNN)
--   - public.next_invoice_number()    — existing sequence (INV-YYYYMM-NNNNN)
--   - public.platform_settings keys : deposit_percent, deposit_due_days, balance_due_days
--   - public.partner_subscriptions.commission_rate (per-partner)
--   - public.partners.plan (fallback hardcoded mapping)
--   - public.user_profiles.email → id lookup for client_user_id
--
-- Note : the frontend code referenced `v_effective_commissions`
-- (brand-distributor effective rate) via an `as any` cast. The view
-- does not actually exist in the DB → the frontend always fell
-- through to the partner_subscriptions fallback. We do NOT reproduce
-- this lookup in the trigger. Captured as Dette 86.
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_create_order_on_signature()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_new_order_id uuid;
  v_total       numeric;
  v_quantity    integer;
  v_unit_price  numeric;
  v_deposit_percent  int;
  v_deposit_due_days int;
  v_balance_due_days int;
  v_deposit_amount   numeric;
  v_balance_amount   numeric;
  v_commission_rate  numeric;
  v_commission_amount numeric;
  v_payment_reference text;
  v_invoice_number    text;
  v_client_user_id    uuid;
  v_partner_plan      text;
  v_signed_at         timestamptz;
  v_deposit_due_date  timestamptz;
  v_balance_due_date  timestamptz;
  v_estimated_delivery_date date;
BEGIN
  -- Only fire on first transition signed_at NULL -> not-null
  IF NEW.signed_at IS NULL OR OLD.signed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_signed_at  := NEW.signed_at;
  v_total      := COALESCE(NEW.total_price, 0);
  v_quantity   := COALESCE(NEW.quantity, 1);
  v_unit_price := COALESCE(NEW.unit_price, 0);

  -- Pull payment/billing config from platform_settings (with safe fallbacks)
  SELECT (value::text)::int INTO v_deposit_percent
    FROM public.platform_settings WHERE key = 'deposit_percent' LIMIT 1;
  IF v_deposit_percent IS NULL THEN v_deposit_percent := 30; END IF;

  SELECT (value::text)::int INTO v_deposit_due_days
    FROM public.platform_settings WHERE key = 'deposit_due_days' LIMIT 1;
  IF v_deposit_due_days IS NULL THEN v_deposit_due_days := 7; END IF;

  SELECT (value::text)::int INTO v_balance_due_days
    FROM public.platform_settings WHERE key = 'balance_due_days' LIMIT 1;
  IF v_balance_due_days IS NULL THEN v_balance_due_days := 30; END IF;

  v_deposit_amount := ROUND(v_total * v_deposit_percent / 100.0, 2);
  v_balance_amount := v_total - v_deposit_amount;

  -- Commission resolution :
  --   1. partner_subscriptions.commission_rate (per-partner override)
  --   2. partners.plan → hardcoded fallback
  --   3. 8 % default (matches frontend COMMISSION_BY_PLAN['starter'])
  v_commission_rate := NULL;
  IF NEW.partner_id IS NOT NULL THEN
    SELECT commission_rate INTO v_commission_rate
      FROM public.partner_subscriptions
      WHERE partner_id = NEW.partner_id
      LIMIT 1;

    IF v_commission_rate IS NULL THEN
      SELECT plan INTO v_partner_plan
        FROM public.partners WHERE id = NEW.partner_id LIMIT 1;
      v_commission_rate := CASE v_partner_plan
        WHEN 'starter'        THEN 8
        WHEN 'growth'         THEN 5
        WHEN 'elite'          THEN 3.5
        WHEN 'brand_member'   THEN 0
        WHEN 'brand_network'  THEN 0
        ELSE 8
      END;
    END IF;
  END IF;
  IF v_commission_rate IS NULL THEN v_commission_rate := 8; END IF;

  v_commission_amount := ROUND(v_total * v_commission_rate / 100.0, 2);

  -- Resolve client_user_id : prefer the quote's explicit user, else lookup by email.
  v_client_user_id := NEW.client_user_id;
  IF v_client_user_id IS NULL AND NEW.email IS NOT NULL THEN
    SELECT id INTO v_client_user_id
      FROM public.user_profiles
      WHERE email = NEW.email
      LIMIT 1;
  END IF;

  -- Generate sequential references via existing helpers.
  v_payment_reference := public.next_payment_reference();
  v_invoice_number    := public.next_invoice_number();

  -- Due dates (absolute timestamps).
  v_deposit_due_date := v_signed_at + (v_deposit_due_days || ' days')::interval;
  v_balance_due_date := v_signed_at + (v_balance_due_days || ' days')::interval;

  -- Estimated delivery date from partner's quoted delay (if provided).
  v_estimated_delivery_date := CASE
    WHEN NEW.delivery_delay_days IS NOT NULL THEN
      (v_signed_at + (NEW.delivery_delay_days || ' days')::interval)::date
    ELSE NULL
  END;

  -- Insert enriched order. The AFTER INSERT trigger notify_order_created
  -- (Lot B) fires next, sending Y1 client payment instructions email
  -- with a real payment_reference and Y2 partner quote accepted email.
  INSERT INTO public.orders (
    quote_request_id,
    project_request_id,
    partner_id,
    client_email,
    client_user_id,
    product_name,
    product_id,
    quantity,
    unit_price,
    total_amount,
    commission_rate,
    commission_amount,
    deposit_percent,
    deposit_amount,
    deposit_due_date,
    balance_amount,
    balance_due_date,
    payment_reference,
    invoice_number,
    tva_rate,
    delivery_delay_days,
    estimated_delivery_date,
    delivery_conditions,
    payment_conditions,
    partner_conditions,
    payment_method,
    status
  ) VALUES (
    NEW.id,
    NEW.project_request_id,
    NEW.partner_id,
    NEW.email,
    v_client_user_id,
    NEW.product_name,
    NEW.product_id,
    v_quantity,
    v_unit_price,
    v_total,
    v_commission_rate,
    v_commission_amount,
    v_deposit_percent,
    v_deposit_amount,
    v_deposit_due_date,
    v_balance_amount,
    v_balance_due_date,
    v_payment_reference,
    v_invoice_number,
    NEW.tva_rate,
    NEW.delivery_delay_days,
    v_estimated_delivery_date,
    NEW.delivery_conditions,
    NEW.payment_conditions,
    NEW.partner_conditions,
    'bank_transfer',
    'pending_deposit'
  ) RETURNING id INTO v_new_order_id;

  -- Audit log
  INSERT INTO public.order_events (order_id, event_type, description, actor)
  VALUES (
    v_new_order_id,
    'created',
    'Commande créée suite à la signature du devis. Référence : ' || v_payment_reference,
    'system'
  );

  RETURN NEW;
END;
$$;

-- Validation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'auto_create_order_on_signature'
      AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'auto_create_order_on_signature missing after rewrite';
  END IF;
  RAISE NOTICE 'OK Dette 74 — auto_create_order_on_signature enriched';
END $$;
