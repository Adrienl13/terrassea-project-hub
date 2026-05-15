-- ============================================================================
-- Dette 108 hotfix — Security advisor cleanups Session 1
-- Date : 2026-05-15
--
-- 1. ERROR security_definer_view : view founding_partner_scores créée avec
--    SECURITY DEFINER par défaut → ALTER pour passer en security_invoker=true.
--    Le view inherit alors la RLS depuis founding_actions (partner read own +
--    admin all) comme conçu.
-- 2. WARN anon/authenticated_security_definer_function_executable sur les 4
--    trigger functions : REVOKE EXECUTE explicite. Ces fonctions sont
--    invoquées UNIQUEMENT par les triggers DB internes, jamais via /rpc.
--    REVOKE bloque toute tentative d'invocation directe par anon/authenticated.
--
-- get_partner_founding_tier(uuid) conserve son GRANT to anon, authenticated
-- (intentionnel : wrapper public-safe pour badges FoundingBadge Session 2).
-- record_founding_action(...) reste REVOKED (admin/service-role only via triggers).
-- ============================================================================

ALTER VIEW public.founding_partner_scores SET (security_invoker = true);

REVOKE EXECUTE ON FUNCTION public.auto_mark_founding_partner() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_founding_profile_completed() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_founding_cgv_uploaded() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_founding_first_order() FROM PUBLIC, anon, authenticated;
