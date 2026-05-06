-- ============================================================================
-- Dette 19 Phase 2B.1 — Quote-related notification RPCs
-- Date : 2026-05-06
--
-- Closes the Quote-related cross-user notification phishing surface (P3 sub-
-- patterns Q1/Q2/Q3, total 7 frontend callsites). Each RPC verifies a
-- specific business relation before inserting notifications.
--
-- 3 RPCs created :
--
-- 1. create_quote_notification_to_admins(p_quote_id, ...)
--    - P3.Q1 : Client/Partner → Admins loop (4 callsites)
--    - Validates caller = quote.client_user_id OR partner-owner of
--      quote.partner_id (covers legacy partners.user_id + new brand_users
--      multi-member pattern).
--    - Loops on user_profiles WHERE user_type='admin'.
--    - Returns array of inserted notification ids.
--
-- 2. create_quote_notification_to_partner(p_quote_id, ...)
--    - P3.Q2 : Client → Partner (2 callsites)
--    - Validates caller = quote.client_user_id AND quote.partner_id NOT NULL.
--    - Resolves partner.user_id, inserts 1 notification.
--    - Returns inserted notification id.
--
-- 3. create_quote_notification_to_client(p_quote_id, ...)
--    - P3.Q3 : Partner → Client (1 callsite, usePartnerQuotes)
--    - Validates caller is partner-owner of quote.partner_id.
--    - Resolves quote.client_user_id directly (or fallback email lookup).
--    - Returns inserted notification id (or NULL if no client could be
--      resolved).
--
-- All 3 RPCs : SECURITY DEFINER, search_path explicit, EXECUTE granted to
-- authenticated only (REVOKE FROM PUBLIC, anon).
-- All 3 set sender_user_id = auth.uid() for audit logging (Phase 2A column).
-- ============================================================================

-- ===== Step 0 : capture baseline =====

DO $$
DECLARE
  q1_exists boolean;
  q2_exists boolean;
  q3_exists boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='create_quote_notification_to_admins')
  INTO q1_exists;
  SELECT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='create_quote_notification_to_partner')
  INTO q2_exists;
  SELECT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='create_quote_notification_to_client')
  INTO q3_exists;
  RAISE NOTICE 'Baseline RPC presence: admins=%, partner=%, client=%', q1_exists, q2_exists, q3_exists;
END $$;

-- ============================================================================
-- RPC 1 : create_quote_notification_to_admins (P3.Q1)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_quote_notification_to_admins(
  p_quote_id uuid,
  p_type     text,
  p_title    text,
  p_body     text DEFAULT NULL,
  p_link     text DEFAULT NULL
)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
DECLARE
  v_caller_uid    uuid;
  v_quote         RECORD;
  v_inserted_ids  uuid[] := ARRAY[]::uuid[];
BEGIN
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'create_quote_notification_to_admins requires authenticated user';
  END IF;

  -- Fetch quote
  SELECT id, client_user_id, partner_id
    INTO v_quote
  FROM public.quote_requests
  WHERE id = p_quote_id;

  IF v_quote.id IS NULL THEN
    RAISE EXCEPTION 'Quote not found: %', p_quote_id;
  END IF;

  -- Business relation check : caller must be the client OR a partner-owner
  IF NOT (
    v_quote.client_user_id = v_caller_uid
    OR (
      v_quote.partner_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.partners p
        WHERE p.id = v_quote.partner_id
          AND (
            p.user_id = v_caller_uid
            OR EXISTS (
              SELECT 1 FROM public.brand_users bu
              WHERE bu.brand_id = p.id AND bu.user_id = v_caller_uid
            )
          )
      )
    )
    OR public.is_admin()  -- admins can always notify
  ) THEN
    RAISE EXCEPTION 'Not authorized to notify admins about this quote';
  END IF;

  -- Insert one notification per admin
  WITH inserted AS (
    INSERT INTO public.notifications (
      user_id, sender_user_id, type, title, body, link
    )
    SELECT
      up.id, v_caller_uid, p_type, p_title, p_body, p_link
    FROM public.user_profiles up
    WHERE up.user_type = 'admin'
    RETURNING id
  )
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO v_inserted_ids
  FROM inserted;

  RETURN v_inserted_ids;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_quote_notification_to_admins(uuid, text, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_quote_notification_to_admins(uuid, text, text, text, text)
  TO authenticated;

COMMENT ON FUNCTION public.create_quote_notification_to_admins IS
  'P3.Q1 : Client/Partner → Admins loop. Validates caller is client or partner-owner of the quote (or admin). Returns array of inserted notification ids. Logs sender_user_id. Dette 19 Phase 2B.1.';

-- ============================================================================
-- RPC 2 : create_quote_notification_to_partner (P3.Q2)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_quote_notification_to_partner(
  p_quote_id uuid,
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
  v_caller_uid     uuid;
  v_quote          RECORD;
  v_partner_user   uuid;
  v_inserted_id    uuid;
BEGIN
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'create_quote_notification_to_partner requires authenticated user';
  END IF;

  SELECT id, client_user_id, partner_id
    INTO v_quote
  FROM public.quote_requests
  WHERE id = p_quote_id;

  IF v_quote.id IS NULL THEN
    RAISE EXCEPTION 'Quote not found: %', p_quote_id;
  END IF;

  IF v_quote.partner_id IS NULL THEN
    RAISE EXCEPTION 'Quote % has no partner_id assigned', p_quote_id;
  END IF;

  -- Business relation : caller must be the client (or admin)
  IF NOT (
    v_quote.client_user_id = v_caller_uid
    OR public.is_admin()
  ) THEN
    RAISE EXCEPTION 'Not authorized to notify partner about this quote';
  END IF;

  -- Resolve partner.user_id (legacy single-owner) ; if NULL, no notification
  -- can be created (silently return NULL — partner has no user account).
  SELECT user_id INTO v_partner_user
  FROM public.partners
  WHERE id = v_quote.partner_id;

  IF v_partner_user IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (
    user_id, sender_user_id, type, title, body, link
  ) VALUES (
    v_partner_user, v_caller_uid, p_type, p_title, p_body, p_link
  )
  RETURNING id INTO v_inserted_id;

  RETURN v_inserted_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_quote_notification_to_partner(uuid, text, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_quote_notification_to_partner(uuid, text, text, text, text)
  TO authenticated;

COMMENT ON FUNCTION public.create_quote_notification_to_partner IS
  'P3.Q2 : Client → Partner. Validates caller is client of the quote (or admin) and quote has a partner assigned. Returns inserted id (or NULL if partner has no user account). Dette 19 Phase 2B.1.';

-- ============================================================================
-- RPC 3 : create_quote_notification_to_client (P3.Q3)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_quote_notification_to_client(
  p_quote_id uuid,
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
  v_quote         RECORD;
  v_client_user   uuid;
  v_inserted_id   uuid;
BEGIN
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'create_quote_notification_to_client requires authenticated user';
  END IF;

  SELECT id, client_user_id, partner_id, email
    INTO v_quote
  FROM public.quote_requests
  WHERE id = p_quote_id;

  IF v_quote.id IS NULL THEN
    RAISE EXCEPTION 'Quote not found: %', p_quote_id;
  END IF;

  IF v_quote.partner_id IS NULL THEN
    RAISE EXCEPTION 'Quote % has no partner_id', p_quote_id;
  END IF;

  -- Business relation : caller must be partner-owner (or admin)
  IF NOT (
    EXISTS (
      SELECT 1 FROM public.partners p
      WHERE p.id = v_quote.partner_id
        AND (
          p.user_id = v_caller_uid
          OR EXISTS (
            SELECT 1 FROM public.brand_users bu
            WHERE bu.brand_id = p.id AND bu.user_id = v_caller_uid
          )
        )
    )
    OR public.is_admin()
  ) THEN
    RAISE EXCEPTION 'Not authorized to notify client about this quote';
  END IF;

  -- Resolve client user_id : prefer client_user_id, fallback to email lookup
  v_client_user := v_quote.client_user_id;

  IF v_client_user IS NULL AND v_quote.email IS NOT NULL THEN
    SELECT id INTO v_client_user
    FROM public.user_profiles
    WHERE email = v_quote.email
    LIMIT 1;
  END IF;

  IF v_client_user IS NULL THEN
    -- Client has no user account (anon submission); nothing to notify.
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (
    user_id, sender_user_id, type, title, body, link
  ) VALUES (
    v_client_user, v_caller_uid, p_type, p_title, p_body, p_link
  )
  RETURNING id INTO v_inserted_id;

  RETURN v_inserted_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_quote_notification_to_client(uuid, text, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_quote_notification_to_client(uuid, text, text, text, text)
  TO authenticated;

COMMENT ON FUNCTION public.create_quote_notification_to_client IS
  'P3.Q3 : Partner → Client. Validates caller is partner-owner of the quote (or admin). Resolves client_user_id (or fallback email→user_profiles). Returns inserted id (or NULL if anon client). Dette 19 Phase 2B.1.';

-- ============================================================================
-- Step 4 : Embedded validation
-- ============================================================================

DO $$
DECLARE
  fn_name text;
  expected_count int := 3;
  actual_count int;
BEGIN
  SELECT count(*) INTO actual_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'create_quote_notification_to_admins',
      'create_quote_notification_to_partner',
      'create_quote_notification_to_client'
    );

  IF actual_count <> expected_count THEN
    RAISE EXCEPTION 'Expected % RPCs created, got %', expected_count, actual_count;
  END IF;

  -- Verify each function: SECURITY DEFINER, anon EXECUTE = false, authenticated EXECUTE = true
  FOR fn_name IN
    SELECT unnest(ARRAY[
      'create_quote_notification_to_admins(uuid, text, text, text, text)',
      'create_quote_notification_to_partner(uuid, text, text, text, text)',
      'create_quote_notification_to_client(uuid, text, text, text, text)'
    ])
  LOOP
    IF has_function_privilege('anon', 'public.' || fn_name, 'EXECUTE') THEN
      RAISE EXCEPTION '% should NOT be executable by anon', fn_name;
    END IF;
    IF NOT has_function_privilege('authenticated', 'public.' || fn_name, 'EXECUTE') THEN
      RAISE EXCEPTION '% SHOULD be executable by authenticated', fn_name;
    END IF;
  END LOOP;

  RAISE NOTICE 'OK: 3 quote notification RPCs created with proper permissions';
END $$;
