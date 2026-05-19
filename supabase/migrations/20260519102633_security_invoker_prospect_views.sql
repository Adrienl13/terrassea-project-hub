-- Flip the four prospect reporting views to security_invoker so that RLS on
-- the underlying CRM tables (brand_prospects, architect_prospects,
-- distributor_prospects) is enforced against the querying user instead of
-- the view owner (postgres). Resolves Supabase advisor "Security Definer View"
-- on all four entities. The 2026-04-29 hotfix enabled RLS on the source
-- tables via public.is_admin(); without this change the views silently
-- bypass those policies.

ALTER VIEW public.prospects_activity_summary  SET (security_invoker = true);
ALTER VIEW public.prospects_actions_this_week SET (security_invoker = true);
ALTER VIEW public.prospects_awaiting_reply    SET (security_invoker = true);
ALTER VIEW public.prospects_45d_summary       SET (security_invoker = true);
