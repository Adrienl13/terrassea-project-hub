-- ============================================================
-- Partner admin notifications RPC + review-ready trigger
-- Date: 2026-05-07
--
-- Closes the silent gap discovered during onboarding audit
-- Phase A: self-serve partner signups (Account.tsx auto-create)
-- and partner "Submit for review" actions (PartnerProfileForm)
-- did not notify admins, while BecomePartner.tsx had inline
-- notification code (loop on user_profiles user_type='admin').
--
-- This migration:
--  1) Creates a SECURITY DEFINER RPC to centralize admin
--     notification logic (factorizes BecomePartner.tsx:283-302).
--  2) Adds an AFTER UPDATE trigger on partners that notifies
--     admins on transition into profile_status='pending_review'.
--
-- Vocabulary: reuses existing 'approved' status (see
-- AdminPartners.tsx review workflow + ProServiceGate.tsx
-- isValidated check). No data migration. No new columns.
-- ============================================================

-- ── 1) RPC: create_partner_notification_to_admins ──
CREATE OR REPLACE FUNCTION public.create_partner_notification_to_admins(
  p_partner_id uuid,
  p_event_type text,
  p_title text,
  p_body text DEFAULT NULL,
  p_link text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
DECLARE
  v_caller_uid  uuid;
  v_admin_count integer := 0;
  v_admin_record RECORD;
BEGIN
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'create_partner_notification_to_admins requires authenticated caller';
  END IF;

  FOR v_admin_record IN
    SELECT id AS user_id
    FROM public.user_profiles
    WHERE user_type = 'admin'
  LOOP
    INSERT INTO public.notifications (
      user_id, sender_user_id, type, title, body, link
    ) VALUES (
      v_admin_record.user_id,
      v_caller_uid,
      p_event_type,
      p_title,
      p_body,
      p_link
    );
    v_admin_count := v_admin_count + 1;
  END LOOP;

  RETURN v_admin_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_partner_notification_to_admins(uuid, text, text, text, text)
  FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_partner_notification_to_admins(uuid, text, text, text, text)
  TO authenticated;

-- ── 2) Trigger: notify_admins_on_partner_review_ready ──
CREATE OR REPLACE FUNCTION public.notify_admins_on_partner_review_ready()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
DECLARE
  v_admin_record RECORD;
BEGIN
  -- Defensive: trigger WHEN clause already enforces the transition,
  -- but we re-check here in case the trigger is re-created without WHEN.
  IF NEW.profile_status = 'pending_review'
     AND (OLD.profile_status IS NULL OR OLD.profile_status <> 'pending_review')
  THEN
    FOR v_admin_record IN
      SELECT id AS user_id
      FROM public.user_profiles
      WHERE user_type = 'admin'
    LOOP
      INSERT INTO public.notifications (
        user_id, type, title, body, link
      ) VALUES (
        v_admin_record.user_id,
        'partner_review_ready',
        'Profil partenaire prêt à valider',
        format('%s a soumis son profil pour validation.',
               COALESCE(NULLIF(NEW.name, ''), 'Un partenaire')),
        format('/admin?partner=%s', NEW.id)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS partners_notify_review_ready ON public.partners;
CREATE TRIGGER partners_notify_review_ready
  AFTER UPDATE ON public.partners
  FOR EACH ROW
  WHEN (NEW.profile_status = 'pending_review'
        AND (OLD.profile_status IS NULL
             OR OLD.profile_status <> 'pending_review'))
  EXECUTE FUNCTION public.notify_admins_on_partner_review_ready();

-- ── 3) Validation ──
DO $$
DECLARE
  v_rpc_exists     boolean;
  v_trigger_exists boolean;
  v_func_exists    boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'create_partner_notification_to_admins'
  ) INTO v_rpc_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'notify_admins_on_partner_review_ready'
  ) INTO v_func_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'partners_notify_review_ready'
      AND tgrelid = 'public.partners'::regclass
  ) INTO v_trigger_exists;

  IF NOT v_rpc_exists THEN
    RAISE EXCEPTION 'RPC create_partner_notification_to_admins missing';
  END IF;
  IF NOT v_func_exists THEN
    RAISE EXCEPTION 'Function notify_admins_on_partner_review_ready missing';
  END IF;
  IF NOT v_trigger_exists THEN
    RAISE EXCEPTION 'Trigger partners_notify_review_ready missing';
  END IF;

  RAISE NOTICE 'OK partner admin notifications: RPC + trigger present';
END $$;
