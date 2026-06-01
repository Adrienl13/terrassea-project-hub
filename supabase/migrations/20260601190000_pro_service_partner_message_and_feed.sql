-- ============================================================
-- Pro Service — partner response message + enriched client feed
-- Date : 2026-06-01
--
-- So the client can evaluate a brand BEFORE connecting (esp. when
-- several brands respond to a large project):
--  - the partner can attach an optional message when showing interest
--    (stored in pro_service_matches.partner_response)
--  - the client feed exposes that message + the partner slug (for a
--    clickable link to the brand page).
-- ============================================================

DROP VIEW IF EXISTS public.pro_service_client_feed;

CREATE VIEW public.pro_service_client_feed
WITH (security_invoker = false) AS
SELECT
  m.id                   AS match_id,
  m.request_id,
  m.status               AS match_status,
  m.score_total,
  m.partner_responded_at,
  m.partner_response,
  m.conversation_id,
  p.id                   AS partner_id,
  p.name                 AS partner_name,
  p.slug                 AS partner_slug,
  p.logo_url             AS partner_logo
FROM public.pro_service_matches m
JOIN public.partners p ON p.id = m.partner_id
JOIN public.pro_service_requests r ON r.id = m.request_id
WHERE r.client_user_id = (SELECT auth.uid());

GRANT SELECT ON public.pro_service_client_feed TO authenticated;

-- respond RPC now accepts an optional message (replaces the 2-arg version).
DROP FUNCTION IF EXISTS public.respond_to_pro_service_match(uuid, boolean);

CREATE OR REPLACE FUNCTION public.respond_to_pro_service_match(
  p_match_id uuid,
  p_interested boolean,
  p_message text DEFAULT NULL
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
  FROM public.pro_service_matches m WHERE m.id = p_match_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'match not found: %', p_match_id; END IF;

  IF NOT (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.partners p
      WHERE p.id = v_partner_id AND p.user_id = (SELECT auth.uid()) AND p.deleted_at IS NULL
    )
  ) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_cur_status NOT IN ('suggested', 'admin_approved', 'sent_to_partner') THEN
    RAISE EXCEPTION 'match already responded to (status=%)', v_cur_status;
  END IF;

  v_new_status := CASE WHEN p_interested THEN 'partner_interested' ELSE 'partner_declined' END;

  UPDATE public.pro_service_matches
     SET status = v_new_status,
         partner_responded_at = now(),
         partner_response = NULLIF(btrim(COALESCE(p_message, '')), ''),
         updated_at = now()
   WHERE id = p_match_id;

  IF p_interested THEN
    SELECT r.client_user_id, r.project_title INTO v_client_user, v_project_title
    FROM public.pro_service_requests r WHERE r.id = v_request_id;

    IF v_client_user IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        v_client_user, 'info',
        'Une marque a répondu à votre projet',
        'Une marque qualifiée s''intéresse à « ' || COALESCE(v_project_title, 'votre projet') || ' ». Découvrez sa réponse et mettez-vous en relation.',
        '/pro-service'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'match_id', p_match_id, 'status', v_new_status);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.respond_to_pro_service_match(uuid, boolean, text) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.respond_to_pro_service_match(uuid, boolean, text) TO authenticated;
