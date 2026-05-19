-- Revoke EXECUTE on two SECURITY DEFINER functions that were left callable
-- as PostgREST RPCs but have no legitimate client-side use case :
--
-- 1. send_transactional_email(text, text, text, text)
--    Lets the caller send arbitrary HTML emails to arbitrary recipients.
--    Real callers (notify_order_created, notify_order_status_changed,
--    notify_pro_service_request_created, notify_quote_request_created,
--    notify_quote_status_changed, request_partner_application_info) are
--    all SECURITY DEFINER themselves and invoke this function as their
--    owner (postgres), so they bypass the EXECUTE check on the calling
--    role. Revoking from anon/authenticated closes a phishing/spam
--    primitive without breaking any internal trigger or RPC chain.
--
-- 2. create_self_notification(text, text, text, text)
--    Zero callers in the codebase (src/, api/, supabase/functions/) and
--    zero internal callers in pg_proc bodies. Dead RPC surface. Lock it
--    until a legitimate use case appears.
--
-- Clears 2 authenticated_security_definer_function_executable advisor
-- entries (and 0 anon entries since both were already revoked from anon
-- via the prior 20260519125953 migration's PUBLIC revoke chain — wait,
-- they were not in that list. The advisor lists them as authenticated-only
-- because anon EXECUTE was not previously granted. Verified via
-- has_function_privilege before applying.).

REVOKE EXECUTE ON FUNCTION public.send_transactional_email(text, text, text, text)
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.create_self_notification(text, text, text, text)
  FROM PUBLIC, anon, authenticated;
