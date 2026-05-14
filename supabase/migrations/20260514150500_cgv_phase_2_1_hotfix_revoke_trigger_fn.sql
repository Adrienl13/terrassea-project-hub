-- ============================================================================
-- CGV Phase 2.1 hotfix — revoke EXECUTE on trigger function
-- Date : 2026-05-14
--
-- sync_partner_cgv_metadata() est une fonction trigger SECURITY DEFINER ;
-- elle ne doit pas être invocable directement via /rest/v1/rpc par anon
-- ou authenticated. Advisor anon_security_definer_function_executable WARN
-- post Phase 2.1 → REVOKE explicite.
--
-- Les deux autres SECURITY DEFINER (delete_partner_cascade,
-- record_cgv_acceptance) ont leurs admin/auth guards internes et leur
-- GRANT to authenticated est intentionnel (pattern Supabase RPC).
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.sync_partner_cgv_metadata() FROM PUBLIC, anon, authenticated;
