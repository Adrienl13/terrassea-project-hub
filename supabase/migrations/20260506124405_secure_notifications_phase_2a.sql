-- ============================================================================
-- Dette 19 Phase 2A — Secure notifications cross-user inserts
-- Date : 2026-05-06
--
-- Closes the cross-user phishing vector for the P1 (auto-notif) and P2
-- (admin → user) patterns. Two new RPC SECURITY DEFINER functions are
-- created and an audit column added.
--
-- ⚠️ IMPORTANT : the RLS INSERT policy is NOT tightened in this migration.
-- The 16 P3 callsites (cross-user via business relation) still depend on
-- the permissive "Authenticated users send notifications" policy until
-- Phase 2B delivers per-feature P3 RPCs. The RLS tightening is reported to
-- Phase 2A.2 as a separate migration applied after Phase 2B is complete.
--
-- Phase 2A scope :
-- - ALTER TABLE add sender_user_id (audit logging)
-- - CREATE FUNCTION create_self_notification (P1 future-proof, no current
--   frontend caller; reserved for upcoming use cases like profile-completion
--   reminders, stock alerts, etc.)
-- - CREATE FUNCTION create_admin_notification (P2 admin → user)
-- - 13 frontend P2 callsites refactored in same commit (14 callsites total ;
--   2 of them broadcast to multiple admins/users via loop)
--
-- Phase 2B scope (future sessions) :
-- - 16 P3 callsites (quote, order, brief, partner-application, financing,
--   product-approval, cart, ClientSections quote-related)
-- - Final RLS tightening (DROP permissive INSERT policy)
-- ============================================================================

-- ===== Step 0 : capture baseline =====

DO $$
DECLARE
  baseline_count    integer;
  rls_baseline      text;
BEGIN
  SELECT count(*) INTO baseline_count FROM public.notifications;
  RAISE NOTICE 'Baseline: % notifications rows', baseline_count;

  SELECT with_check INTO rls_baseline
  FROM pg_policies
  WHERE tablename = 'notifications'
    AND schemaname = 'public'
    AND cmd = 'INSERT'
  LIMIT 1;

  RAISE NOTICE 'Baseline INSERT with_check: %', COALESCE(rls_baseline, '<none>');
END $$;

-- ===== Step 1 : Add sender_user_id column (audit logging) =====

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS sender_user_id uuid
    REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.notifications.sender_user_id IS
  'User who triggered the notification (NULL for system/cron). Added 2026-05-06 for audit logging — Dette 19 Phase 2A.';

-- ===== Step 2 : Create RPC create_self_notification (P1, future-proof) =====

CREATE OR REPLACE FUNCTION public.create_self_notification(
  p_type  text,
  p_title text,
  p_body  text DEFAULT NULL,
  p_link  text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
DECLARE
  v_uid uuid;
  v_id  uuid;
BEGIN
  v_uid := auth.uid();

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'create_self_notification requires authenticated user';
  END IF;

  INSERT INTO public.notifications (
    user_id, sender_user_id, type, title, body, link
  ) VALUES (
    v_uid, v_uid, p_type, p_title, p_body, p_link
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_self_notification(text, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_self_notification(text, text, text, text)
  TO authenticated;

COMMENT ON FUNCTION public.create_self_notification IS
  'P1 pattern (auto-notification). User creates a notification for themselves. Reserved for upcoming use cases (profile completion reminders, stock alerts, certification expiration, etc.). Added Dette 19 Phase 2A.';

-- ===== Step 3 : Create RPC create_admin_notification (P2) =====

CREATE OR REPLACE FUNCTION public.create_admin_notification(
  p_user_id uuid,
  p_type    text,
  p_title   text,
  p_body    text DEFAULT NULL,
  p_link    text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
DECLARE
  v_admin_uid uuid;
  v_id        uuid;
BEGIN
  v_admin_uid := auth.uid();

  IF v_admin_uid IS NULL THEN
    RAISE EXCEPTION 'create_admin_notification requires authenticated user';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'create_admin_notification requires admin privileges';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Target user does not exist: %', p_user_id;
  END IF;

  INSERT INTO public.notifications (
    user_id, sender_user_id, type, title, body, link
  ) VALUES (
    p_user_id, v_admin_uid, p_type, p_title, p_body, p_link
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_admin_notification(uuid, text, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_admin_notification(uuid, text, text, text, text)
  TO authenticated;

COMMENT ON FUNCTION public.create_admin_notification IS
  'P2 pattern (admin → user). Admin sends notification to any specific user. Verifies caller is admin via is_admin() before insert. Logs sender_user_id for audit. Added Dette 19 Phase 2A.';

-- ===== Step 4 : Embedded validation =====

DO $$
DECLARE
  has_sender_col      boolean;
  has_self_fn         boolean;
  has_admin_fn        boolean;
  anon_can_self       boolean;
  anon_can_admin      boolean;
  auth_can_self       boolean;
  auth_can_admin      boolean;
BEGIN
  -- sender_user_id column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='notifications' AND column_name='sender_user_id'
  ) INTO has_sender_col;
  IF NOT has_sender_col THEN
    RAISE EXCEPTION 'sender_user_id column not added';
  END IF;

  -- functions exist
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname='create_self_notification'
  ) INTO has_self_fn;
  IF NOT has_self_fn THEN
    RAISE EXCEPTION 'create_self_notification not created';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname='create_admin_notification'
  ) INTO has_admin_fn;
  IF NOT has_admin_fn THEN
    RAISE EXCEPTION 'create_admin_notification not created';
  END IF;

  -- permissions: anon must NOT have EXECUTE, authenticated MUST have EXECUTE
  SELECT has_function_privilege('anon',
    'public.create_self_notification(text, text, text, text)', 'EXECUTE') INTO anon_can_self;
  SELECT has_function_privilege('anon',
    'public.create_admin_notification(uuid, text, text, text, text)', 'EXECUTE') INTO anon_can_admin;
  SELECT has_function_privilege('authenticated',
    'public.create_self_notification(text, text, text, text)', 'EXECUTE') INTO auth_can_self;
  SELECT has_function_privilege('authenticated',
    'public.create_admin_notification(uuid, text, text, text, text)', 'EXECUTE') INTO auth_can_admin;

  IF anon_can_self OR anon_can_admin THEN
    RAISE EXCEPTION 'anon should NOT have EXECUTE on the new RPCs (self=%, admin=%)',
      anon_can_self, anon_can_admin;
  END IF;

  IF NOT auth_can_self OR NOT auth_can_admin THEN
    RAISE EXCEPTION 'authenticated SHOULD have EXECUTE on the new RPCs (self=%, admin=%)',
      auth_can_self, auth_can_admin;
  END IF;

  RAISE NOTICE 'OK: Phase 2A migration validated — sender_user_id added, 2 RPCs created with proper EXECUTE perms';
END $$;
