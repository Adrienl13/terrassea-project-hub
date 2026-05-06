-- ============================================================================
-- Dette 33 — PartnerOrders RPCs (partner-side order management)
-- Date : 2026-05-06
--
-- Top BLOQUANT identified by USER_TOOLS_AUDIT (commit 06a9150). Partners
-- couldn't view/manage orders generated from accepted quotes despite paying
-- for the platform. Catalogue → quote → ORDER → delivery loop was broken
-- partner-side.
--
-- Two RPCs created :
--
-- 1. update_order_as_partner : restricts partner edits to a 6-column
--    whitelist (status, tracking_*, shipped_at, delivered_at). Validates
--    business workflow status transitions strictly. Auto-sets timestamps
--    on transitions. Inserts an order_events audit row (actor='partner').
--
-- 2. create_order_notification_to_client : P3.O1 sub-pattern, anticipates
--    Phase 2B.2 of Dette 19 roadmap (eliminates 1 future P3 callsite).
--    Validates partner-owner of the order (or admin) before notification.
--
-- Status workflow (aligned with existing system, AdminOrderTracking.tsx
-- STEP_ORDER) :
--   pending_deposit → deposit_paid (admin-set)
--   deposit_paid → in_production (partner-set via this RPC)
--   in_production → shipped (partner, tracking_number required)
--   shipped → delivered (partner, OR auto via AfterShip)
--   completed / cancelled / disputed / refunded (admin-only)
--
-- Mono-partner architecture confirmed : 1 order = 1 partner_id, no
-- multi-partner items.
-- ============================================================================

-- ===== Step 0 : capture baseline =====

DO $$
DECLARE
  v_rpc1_exists boolean;
  v_rpc2_exists boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='update_order_as_partner') INTO v_rpc1_exists;
  SELECT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='create_order_notification_to_client') INTO v_rpc2_exists;
  RAISE NOTICE 'Baseline : update_order_as_partner=%, create_order_notification_to_client=%',
               v_rpc1_exists, v_rpc2_exists;
END $$;

-- ============================================================================
-- RPC 1 : update_order_as_partner
-- Whitelisted columns + strict transition validation + auto-timestamps + audit
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_order_as_partner(
  p_order_id         uuid,
  p_status           text DEFAULT NULL,
  p_tracking_number  text DEFAULT NULL,
  p_tracking_url     text DEFAULT NULL,
  p_shipping_carrier text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
DECLARE
  v_caller_uid    uuid;
  v_order         RECORD;
  v_is_owner      boolean;
  v_now           timestamptz := now();
  v_new_shipped   timestamptz;
  v_new_delivered timestamptz;
  v_new_prod      timestamptz;
  v_event_desc    text;
BEGIN
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'update_order_as_partner requires authenticated user';
  END IF;

  -- Fetch order (lock to prevent concurrent updates)
  SELECT id, partner_id, status, tracking_number, shipped_at
    INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Verify caller is the partner-owner of this order
  SELECT EXISTS (
    SELECT 1 FROM public.partners
    WHERE id = v_order.partner_id
      AND user_id = v_caller_uid
  ) INTO v_is_owner;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'Not authorized: not the partner of this order';
  END IF;

  -- Status transition validation
  IF p_status IS NOT NULL THEN
    -- Partner can only set 3 statuses
    IF p_status NOT IN ('in_production', 'shipped', 'delivered') THEN
      RAISE EXCEPTION 'Status % not allowed for partner (allowed: in_production, shipped, delivered)', p_status;
    END IF;

    -- Strict transition rules
    IF p_status = 'in_production' AND v_order.status NOT IN ('deposit_paid') THEN
      RAISE EXCEPTION 'Cannot transition to in_production from status %; required: deposit_paid', v_order.status;
    END IF;

    IF p_status = 'shipped' AND v_order.status NOT IN ('in_production') THEN
      RAISE EXCEPTION 'Cannot transition to shipped from status %; required: in_production', v_order.status;
    END IF;

    IF p_status = 'delivered' AND v_order.status NOT IN ('shipped') THEN
      RAISE EXCEPTION 'Cannot transition to delivered from status %; required: shipped', v_order.status;
    END IF;

    -- shipped requires tracking_number (either being set now or already set)
    IF p_status = 'shipped'
       AND p_tracking_number IS NULL
       AND v_order.tracking_number IS NULL THEN
      RAISE EXCEPTION 'tracking_number required when transitioning to shipped';
    END IF;
  END IF;

  -- Compute auto-timestamps
  v_new_prod      := CASE WHEN p_status = 'in_production' THEN v_now ELSE NULL END;
  v_new_shipped   := CASE WHEN p_status = 'shipped'       THEN v_now ELSE NULL END;
  v_new_delivered := CASE WHEN p_status = 'delivered'     THEN v_now ELSE NULL END;

  -- Whitelisted UPDATE (6 columns + 3 auto-timestamps)
  UPDATE public.orders
     SET status                  = COALESCE(p_status, status),
         tracking_number         = COALESCE(p_tracking_number, tracking_number),
         tracking_url            = COALESCE(p_tracking_url, tracking_url),
         shipping_carrier        = COALESCE(p_shipping_carrier, shipping_carrier),
         production_confirmed_at = COALESCE(v_new_prod, production_confirmed_at),
         shipped_at              = COALESCE(v_new_shipped, shipped_at),
         delivered_at            = COALESCE(v_new_delivered, delivered_at),
         updated_at              = v_now
   WHERE id = p_order_id;

  -- Audit trail
  v_event_desc := format(
    'Partner update: status=%s, tracking=%s, carrier=%s',
    COALESCE(p_status, '<unchanged>'),
    COALESCE(p_tracking_number, '<unchanged>'),
    COALESCE(p_shipping_carrier, '<unchanged>')
  );

  INSERT INTO public.order_events (order_id, event_type, description, actor, metadata)
  VALUES (
    p_order_id,
    COALESCE(p_status, 'partner_update'),
    v_event_desc,
    'partner',
    jsonb_build_object(
      'partner_user_id', v_caller_uid,
      'new_status',      p_status,
      'tracking_number', p_tracking_number,
      'tracking_url',    p_tracking_url,
      'shipping_carrier', p_shipping_carrier
    )
  );

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'status',   COALESCE(p_status, v_order.status),
    'updated',  true
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_order_as_partner(uuid, text, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_order_as_partner(uuid, text, text, text, text)
  TO authenticated;

COMMENT ON FUNCTION public.update_order_as_partner IS
  'Partner-side order update (Dette 33). Whitelist 6 columns, strict status transition validation, auto-timestamps, audit trail. SECURITY DEFINER. authenticated only.';

-- ============================================================================
-- RPC 2 : create_order_notification_to_client
-- P3.O1 sub-pattern (anticipates Phase 2B.2 of Dette 19)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_order_notification_to_client(
  p_order_id uuid,
  p_type     text,
  p_title    text,
  p_body     text DEFAULT NULL,
  p_link     text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
DECLARE
  v_caller_uid    uuid;
  v_order         RECORD;
  v_is_owner      boolean;
  v_inserted_id   uuid;
BEGIN
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'create_order_notification_to_client requires authenticated user';
  END IF;

  SELECT id, partner_id, client_user_id, client_email
    INTO v_order
  FROM public.orders
  WHERE id = p_order_id;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Verify caller is partner-owner OR admin
  SELECT EXISTS (
    SELECT 1 FROM public.partners
    WHERE id = v_order.partner_id
      AND user_id = v_caller_uid
  ) INTO v_is_owner;

  IF NOT v_is_owner AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized to notify client of this order';
  END IF;

  -- Resolve client user_id (or fallback to email lookup)
  IF v_order.client_user_id IS NULL THEN
    SELECT id INTO v_order.client_user_id
    FROM public.user_profiles
    WHERE email = v_order.client_email
    LIMIT 1;
  END IF;

  -- If no client user account, silently skip (anon-submitted order)
  IF v_order.client_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (
    user_id, sender_user_id, type, title, body, link
  ) VALUES (
    v_order.client_user_id,
    v_caller_uid,
    p_type,
    p_title,
    p_body,
    p_link
  )
  RETURNING id INTO v_inserted_id;

  RETURN v_inserted_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_order_notification_to_client(uuid, text, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order_notification_to_client(uuid, text, text, text, text)
  TO authenticated;

COMMENT ON FUNCTION public.create_order_notification_to_client IS
  'P3.O1 sub-pattern : Partner → Client notification for order events. Anticipates Phase 2B.2 of Dette 19 roadmap. SECURITY DEFINER. authenticated only. Validates partner-owner of order or admin.';

-- ============================================================================
-- Step 3 : Embedded validation
-- ============================================================================

DO $$
DECLARE
  v_rpc1_exists boolean;
  v_rpc2_exists boolean;
  v_anon1 boolean;
  v_anon2 boolean;
  v_auth1 boolean;
  v_auth2 boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='update_order_as_partner') INTO v_rpc1_exists;
  SELECT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='create_order_notification_to_client') INTO v_rpc2_exists;

  IF NOT v_rpc1_exists THEN RAISE EXCEPTION 'update_order_as_partner not created'; END IF;
  IF NOT v_rpc2_exists THEN RAISE EXCEPTION 'create_order_notification_to_client not created'; END IF;

  SELECT has_function_privilege('anon',
    'public.update_order_as_partner(uuid, text, text, text, text)', 'EXECUTE') INTO v_anon1;
  SELECT has_function_privilege('anon',
    'public.create_order_notification_to_client(uuid, text, text, text, text)', 'EXECUTE') INTO v_anon2;
  SELECT has_function_privilege('authenticated',
    'public.update_order_as_partner(uuid, text, text, text, text)', 'EXECUTE') INTO v_auth1;
  SELECT has_function_privilege('authenticated',
    'public.create_order_notification_to_client(uuid, text, text, text, text)', 'EXECUTE') INTO v_auth2;

  IF v_anon1 OR v_anon2 THEN
    RAISE EXCEPTION 'anon should NOT have EXECUTE (anon1=%, anon2=%)', v_anon1, v_anon2;
  END IF;
  IF NOT v_auth1 OR NOT v_auth2 THEN
    RAISE EXCEPTION 'authenticated SHOULD have EXECUTE (auth1=%, auth2=%)', v_auth1, v_auth2;
  END IF;

  RAISE NOTICE 'OK: 2 RPCs created with proper EXECUTE permissions';
END $$;
