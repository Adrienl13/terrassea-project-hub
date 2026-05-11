-- ============================================================
-- Dette 54 — Email approval partner via RPC + pg_net
-- Date : 2026-05-10 (auth pattern updated 2026-05-11)
--
-- Closes Bug #1 (email approval partner not sent). Existing
-- AdminPartners.tsx mutations did direct UPDATE on partners
-- with in-app notification only — no email channel. The
-- send-notification-email Edge Function rejects frontend
-- invocations (requires Bearer SERVICE_ROLE_KEY which the JS
-- client cannot provide), so the email-send must happen
-- server-side. This RPC orchestrates the UPDATE + the
-- pg_net.http_post to the Edge Function.
--
-- Vocabulary alignment (matches AdminPartners.tsx today):
--   approve         → profile_status='approved' + is_public=true + profile_completed=true
--   reject          → profile_status='rejected' + profile_completed=false
--   request_changes → profile_status='changes_requested' + profile_completed=false + profile_submitted=false
--
-- Email is sent ONLY on 'approve' (Bug #1 scope). Reject /
-- request_changes keep in-app notification only (existing
-- create_admin_notification path in AdminPartners.tsx
-- remains).
--
-- Authentication 2026-05-11 :
--   The 2026-05-10 first cut used a Bearer service-role JWT
--   read from vault.secrets ('service_role_key'). Production
--   tests returned 401 because the SUPABASE_SERVICE_ROLE_KEY
--   auto-injected into Edge Functions did not match the JWT
--   the founder stored in vault (likely a side-effect of the
--   2026 Supabase "Publishable / Secret Keys" rotation model).
--   Switched to the X-Trigger-Secret pattern used by
--   send-quote-notification : a shared secret that the founder
--   controls end-to-end.
--
-- Pre-requisite (founder action, Dashboard):
--   - Vault secret 'EDGE_TRIGGER_SECRET' (uppercase, matches
--     the Edge Function env var naming convention) must
--     contain the same random string as the Edge Function
--     env var of the same name. Both sides must match
--     byte-for-byte.
--   - RESEND_API_KEY is already present in vault and used by
--     the Edge Function itself to call Resend.
-- ============================================================

CREATE OR REPLACE FUNCTION public.verify_partner_as_admin(
  p_partner_id   uuid,
  p_action       text,
  p_review_notes text DEFAULT NULL,
  p_email_subject text DEFAULT NULL,
  p_email_html    text DEFAULT NULL,
  p_email_text    text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, vault, pg_temp'
AS $$
DECLARE
  v_new_status         text;
  v_is_public          boolean;
  v_profile_completed  boolean;
  v_profile_submitted  boolean;
  v_partner            public.partners%ROWTYPE;
  v_trigger_secret     text;
  v_request_id         bigint;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authenticated user required';
  END IF;
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'only admins can verify partners';
  END IF;

  CASE p_action
    WHEN 'approve' THEN
      v_new_status        := 'approved';
      v_is_public         := true;
      v_profile_completed := true;
      v_profile_submitted := NULL;
    WHEN 'reject' THEN
      v_new_status        := 'rejected';
      v_is_public         := NULL;
      v_profile_completed := false;
      v_profile_submitted := NULL;
    WHEN 'request_changes' THEN
      v_new_status        := 'changes_requested';
      v_is_public         := NULL;
      v_profile_completed := false;
      v_profile_submitted := false;
    ELSE
      RAISE EXCEPTION 'invalid action: %', p_action;
  END CASE;

  UPDATE public.partners
  SET
    profile_status       = v_new_status,
    profile_reviewed_at  = now(),
    profile_reviewed_by  = auth.uid(),
    profile_review_notes = COALESCE(p_review_notes, profile_review_notes),
    is_public            = COALESCE(v_is_public, is_public),
    profile_completed    = COALESCE(v_profile_completed, profile_completed),
    profile_submitted    = COALESCE(v_profile_submitted, profile_submitted)
  WHERE id = p_partner_id
  RETURNING * INTO v_partner;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'partner not found: %', p_partner_id;
  END IF;

  IF p_action = 'approve'
     AND v_partner.contact_email IS NOT NULL
     AND p_email_subject IS NOT NULL
     AND (p_email_html IS NOT NULL OR p_email_text IS NOT NULL)
  THEN
    SELECT decrypted_secret INTO v_trigger_secret
    FROM vault.decrypted_secrets
    WHERE name = 'EDGE_TRIGGER_SECRET'
    LIMIT 1;

    IF v_trigger_secret IS NOT NULL THEN
      SELECT net.http_post(
        url := 'https://gwgcfgeouropcighpztj.supabase.co/functions/v1/send-notification-email',
        headers := jsonb_build_object(
          'X-Trigger-Secret', v_trigger_secret,
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'to', v_partner.contact_email,
          'subject', p_email_subject,
          'body_html', COALESCE(p_email_html, ''),
          'body_text', COALESCE(p_email_text, '')
        )
      ) INTO v_request_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'partner_id', v_partner.id,
    'new_status', v_new_status,
    'email_request_id', v_request_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_partner_as_admin(uuid, text, text, text, text, text)
  FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_partner_as_admin(uuid, text, text, text, text, text)
  TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'verify_partner_as_admin'
  ) THEN
    RAISE EXCEPTION 'RPC verify_partner_as_admin missing post-apply';
  END IF;
  RAISE NOTICE 'OK verify_partner_as_admin created';
END $$;
