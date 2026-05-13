-- ============================================================
-- Security hardening — explicit search_path on SECURITY DEFINER RPCs
-- Date : 2026-05-13
--
-- Origin : audit triggered after Dette 59 Lot A discovered that
-- `SET search_path = 'public, vault, pg_temp'` (single-quoted form)
-- is interpreted by PostgreSQL as a single literal schema name
-- 'public, vault, pg_temp', NOT as a comma-separated list.
-- The fully-qualified internal calls (e.g. public.is_admin) keep
-- working, but any unqualified function call inside these RPCs
-- silently resolves against the caller's search_path (or fails).
--
-- 12 RPCs in production had this latent bug, captured in
-- proconfig as `search_path="public, pg_temp"` or
-- `search_path="public, vault, pg_temp"` with surrounding quotes.
--
-- This migration rewrites the configuration to the proper
-- comma-separated, unquoted form on all 12 affected functions.
-- ============================================================

ALTER FUNCTION public.approve_product_submission_as_new(uuid, jsonb, jsonb, jsonb)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.create_admin_notification(uuid, text, text, text, text)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.create_order_notification_to_client(uuid, text, text, text, text)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.create_partner_notification_to_admins(uuid, text, text, text, text)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.create_quote_notification_to_admins(uuid, text, text, text, text)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.create_quote_notification_to_client(uuid, text, text, text, text)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.create_quote_notification_to_partner(uuid, text, text, text, text)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.create_self_notification(text, text, text, text)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.notify_admins_on_partner_review_ready()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.update_order_as_partner(uuid, text, text, text, text)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.update_own_profile(text, text, text, text, text, text, text)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.verify_partner_as_admin(uuid, text, text, text, text, text)
  SET search_path = public, vault, pg_temp;

-- Validation : reload pg_proc and confirm none of the 12 still has the
-- quoted form in proconfig.
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace
    AND prosecdef = true
    AND proconfig::text ~ 'search_path="';
  IF v_count > 0 THEN
    RAISE EXCEPTION 'still % SECURITY DEFINER fn(s) with quoted search_path', v_count;
  END IF;
  RAISE NOTICE 'OK security search_path hardening complete';
END $$;
