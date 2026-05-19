-- Revoke EXECUTE on SECURITY DEFINER functions that have no business being
-- callable via PostgREST /rest/v1/rpc/. Two buckets :
--
-- Bucket A — Trigger functions (return trigger). Fired by table triggers,
-- never called as RPC. Exposing them to anon lets unauthenticated callers
-- invoke side-effect logic (order creation, notifications) or guard
-- triggers out of their intended context.
--
-- Bucket B — RLS policy helpers (return boolean). RLS evaluates them as
-- part of policy expression checking, not via EXECUTE on the role calling
-- the query, so revoking EXECUTE does NOT break RLS. Direct RPC exposure
-- to anon would let unauthenticated callers probe brand membership /
-- ownership for arbitrary (brand_id, user_id) pairs — an oracle.
--
-- Same pattern as 20260515160500_dette_108_hotfix_security_invoker_revoke_triggers.sql,
-- which closed the 4 founding-related trigger functions. Codebase grep
-- confirms zero supabase.rpc() calls to any of the 10 functions below.
-- Clears 10 of 12 anon_security_definer_function_executable advisor
-- entries (the remaining 2 — fuzzy_search_products, get_partner_founding_tier
-- — are intentional public RPCs, kept).

-- Bucket A — trigger functions
REVOKE EXECUTE ON FUNCTION public.auto_create_order_on_signature()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admins_on_partner_review_ready()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_order_created()                        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_pro_service_request_created()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_quote_request_created()                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_partner_privilege_changes()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_user_profile_protected_changes()      FROM PUBLIC, anon, authenticated;

-- Bucket B — RLS helpers
REVOKE EXECUTE ON FUNCTION public.is_admin()                                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_brand_member(uuid, uuid)                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_brand_owner(uuid, uuid)                    FROM PUBLIC, anon, authenticated;
