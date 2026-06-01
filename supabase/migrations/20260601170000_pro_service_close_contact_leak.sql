-- ============================================================
-- Pro Service — close the contact leak (R2)
-- Date : 2026-06-01
--
-- Until now a matched partner could read client_email/phone via the
-- "Partners read matched pro_service_requests" policy (anonymization
-- was UI-only). We recreate pro_service_partner_feed as SECURITY
-- DEFINER with an internal owner filter (auth.uid() → partner), then
-- DROP the partners' raw SELECT on pro_service_requests. Partners now
-- read ONLY the sanitized feed (contact hidden until connected).
--
-- Prereq: the frontend store already reads the feed (deployed) — so
-- dropping the raw policy does not blank the partner hub.
-- ============================================================

DROP VIEW IF EXISTS public.pro_service_partner_feed;

CREATE VIEW public.pro_service_partner_feed
WITH (security_invoker = false) AS
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
  CASE WHEN m.status IN ('client_connected', 'completed') THEN r.client_name    END AS client_name,
  CASE WHEN m.status IN ('client_connected', 'completed') THEN r.client_company END AS client_company,
  CASE WHEN m.status IN ('client_connected', 'completed') THEN r.client_email   END AS client_email,
  CASE WHEN m.status IN ('client_connected', 'completed') THEN r.client_phone   END AS client_phone
FROM public.pro_service_matches m
JOIN public.pro_service_requests r ON r.id = m.request_id
WHERE m.partner_id IN (
  SELECT p.id FROM public.partners p
  WHERE p.user_id = (SELECT auth.uid()) AND p.deleted_at IS NULL
);

GRANT SELECT ON public.pro_service_partner_feed TO authenticated;

-- Close the leak: partners no longer read raw requests (with contact).
DROP POLICY IF EXISTS "Partners read matched pro_service_requests" ON public.pro_service_requests;
