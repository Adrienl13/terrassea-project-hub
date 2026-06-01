-- ============================================================
-- Pro Service — Response loop foundation (Lot 0)
-- Date : 2026-06-01
--
-- Additive + non-breaking : adds a column, a sanitized partner
-- view, and two SECURITY DEFINER RPCs. Nothing in the frontend
-- calls these yet, so deploying this alone changes no behavior.
-- The frontend wiring + policy tightening land in the next lot.
--
-- Addresses risks:
--  R3 atomic transitions + cross-user notifications via RPC
--  R4 match <-> conversation link (conversation_id column)
--  R8 request status sync handled inside connect RPC
--  R2 sanitized read mechanism (view; enforcement = next lot)
-- ============================================================

-- R4 — link a match to the conversation it spawned (idempotency + deep-link)
ALTER TABLE public.pro_service_matches
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- R2 — sanitized feed for partners : project details WITHOUT
-- client contact, except once the match is connected/completed.
-- security_invoker => underlying RLS still applies (a partner
-- only sees their own matches + matched requests).
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.pro_service_partner_feed
WITH (security_invoker = true) AS
SELECT
  m.id                AS match_id,
  m.partner_id,
  m.status            AS match_status,
  m.score_total,
  m.partner_responded_at,
  m.conversation_id,
  m.created_at        AS match_created_at,
  r.id                AS request_id,
  r.project_title,
  r.project_type,
  r.project_city,
  r.project_country,
  r.categories_needed,
  r.style_preferences,
  r.materials_preferred,
  r.colors_preferred,
  r.budget_range,
  r.quantity_estimate,
  r.surface_area,
  r.timeline,
  r.outdoor_required,
  r.description,
  r.special_requirements,
  r.constraints_text,
  r.project_nature,
  r.status            AS request_status,
  -- Contact revealed ONLY once connected
  CASE WHEN m.status IN ('client_connected', 'completed') THEN r.client_name    END AS client_name,
  CASE WHEN m.status IN ('client_connected', 'completed') THEN r.client_company END AS client_company,
  CASE WHEN m.status IN ('client_connected', 'completed') THEN r.client_email   END AS client_email,
  CASE WHEN m.status IN ('client_connected', 'completed') THEN r.client_phone   END AS client_phone
FROM public.pro_service_matches m
JOIN public.pro_service_requests r ON r.id = m.request_id;

GRANT SELECT ON public.pro_service_partner_feed TO authenticated;

-- ------------------------------------------------------------
-- RPC : partner responds to a proposed match (interested / declined).
-- Runs the transition + (cross-user) client notification atomically.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.respond_to_pro_service_match(
  p_match_id uuid,
  p_interested boolean
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_partner_id uuid;
  v_request_id uuid;
  v_cur_status text;
  v_client_user uuid;
  v_project_title text;
  v_new_status text;
BEGIN
  SELECT m.partner_id, m.request_id, m.status
    INTO v_partner_id, v_request_id, v_cur_status
  FROM public.pro_service_matches m
  WHERE m.id = p_match_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'match not found: %', p_match_id; END IF;

  -- Caller must be the partner that owns the match (or admin)
  IF NOT (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.partners p
      WHERE p.id = v_partner_id AND p.user_id = (SELECT auth.uid()) AND p.deleted_at IS NULL
    )
  ) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Only respond to a still-open proposal
  IF v_cur_status NOT IN ('suggested', 'admin_approved', 'sent_to_partner') THEN
    RAISE EXCEPTION 'match already responded to (status=%)', v_cur_status;
  END IF;

  v_new_status := CASE WHEN p_interested THEN 'partner_interested' ELSE 'partner_declined' END;

  UPDATE public.pro_service_matches
     SET status = v_new_status, partner_responded_at = now(), updated_at = now()
   WHERE id = p_match_id;

  -- Notify the client (in-app) when a brand shows interest
  IF p_interested THEN
    SELECT r.client_user_id, r.project_title INTO v_client_user, v_project_title
    FROM public.pro_service_requests r WHERE r.id = v_request_id;

    IF v_client_user IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        v_client_user, 'info',
        'Une marque a répondu à votre projet',
        'Une marque qualifiée s''intéresse à « ' || COALESCE(v_project_title, 'votre projet') || ' ». Mettez-vous en relation pour échanger.',
        '/pro-service'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'match_id', p_match_id, 'status', v_new_status, 'client_notified', (p_interested AND v_client_user IS NOT NULL));
END;
$$;

-- ------------------------------------------------------------
-- RPC : client (or admin) connects with an interested partner.
-- Creates the conversation + participants + first message,
-- reveals contact, syncs statuses, notifies the partner.
-- Idempotent : re-calling returns the existing conversation.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.connect_pro_service_match(
  p_match_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_partner_id uuid;
  v_request_id uuid;
  v_cur_status text;
  v_conv uuid;
  v_partner_user uuid;
  v_client_user uuid;
  v_project_title text;
BEGIN
  SELECT m.partner_id, m.request_id, m.status, m.conversation_id
    INTO v_partner_id, v_request_id, v_cur_status, v_conv
  FROM public.pro_service_matches m
  WHERE m.id = p_match_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'match not found: %', p_match_id; END IF;

  SELECT r.client_user_id, r.project_title INTO v_client_user, v_project_title
  FROM public.pro_service_requests r WHERE r.id = v_request_id;

  -- Caller must be the request's client or an admin
  IF NOT (public.is_admin() OR v_client_user = (SELECT auth.uid())) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Idempotent
  IF v_conv IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'conversation_id', v_conv, 'already_connected', true);
  END IF;

  IF v_cur_status <> 'partner_interested' THEN
    RAISE EXCEPTION 'match is not awaiting connection (status=%)', v_cur_status;
  END IF;

  SELECT p.user_id INTO v_partner_user FROM public.partners p WHERE p.id = v_partner_id;
  IF v_partner_user IS NULL THEN RAISE EXCEPTION 'partner has no linked account'; END IF;
  IF v_client_user IS NULL THEN RAISE EXCEPTION 'client has no account (use email path)'; END IF;

  INSERT INTO public.conversations (subject, created_by, project_name, project_ref)
  VALUES ('Pro Service — ' || COALESCE(v_project_title, 'Projet'), (SELECT auth.uid()), v_project_title, v_request_id::text)
  RETURNING id INTO v_conv;

  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (v_conv, v_client_user), (v_conv, v_partner_user);

  INSERT INTO public.messages (conversation_id, sender_id, body)
  VALUES (v_conv, NULL, 'Mise en relation Terrassea — échangez ici autour du projet « ' || COALESCE(v_project_title, 'projet') || ' ».');

  UPDATE public.pro_service_matches
     SET status = 'client_connected', conversation_id = v_conv, updated_at = now()
   WHERE id = p_match_id;

  UPDATE public.pro_service_requests
     SET status = 'in_progress', matched_at = COALESCE(matched_at, now()), updated_at = now()
   WHERE id = v_request_id AND status NOT IN ('completed', 'cancelled');

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    v_partner_user, 'info',
    'Mise en relation confirmée',
    'Le porteur du projet « ' || COALESCE(v_project_title, 'projet') || ' » souhaite échanger avec vous.',
    '/messages'
  );

  RETURN jsonb_build_object('success', true, 'conversation_id', v_conv, 'already_connected', false);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.respond_to_pro_service_match(uuid, boolean) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.connect_pro_service_match(uuid) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.respond_to_pro_service_match(uuid, boolean) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.connect_pro_service_match(uuid) TO authenticated;
