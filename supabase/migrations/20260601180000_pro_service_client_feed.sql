-- ============================================================
-- Pro Service — client feed (Lot 2B)
-- Date : 2026-06-01
--
-- Clients have no SELECT on pro_service_matches, so they cannot see
-- which brands responded to their request. This SECURITY DEFINER view,
-- filtered to the caller's own requests (client_user_id = auth.uid()),
-- exposes the interested brands' identity (name/slug/logo) + match
-- status so the client can choose to connect.
-- Additive / non-breaking.
-- ============================================================

CREATE OR REPLACE VIEW public.pro_service_client_feed
WITH (security_invoker = false) AS
SELECT
  m.id                   AS match_id,
  m.request_id,
  m.status               AS match_status,
  m.score_total,
  m.partner_responded_at,
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
