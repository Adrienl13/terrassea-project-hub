-- HOTFIX — Restore EXECUTE on RLS helper functions for anon + authenticated.
--
-- The 20260519125953 migration revoked EXECUTE on is_admin, is_brand_member,
-- and is_brand_owner from anon/authenticated, based on the (incorrect)
-- assumption that RLS would evaluate these helpers without requiring
-- EXECUTE on the calling role. This is wrong : Postgres evaluates RLS
-- policy expressions with the calling user's privileges, and a missing
-- EXECUTE causes "permission denied for function is_admin" the moment
-- the OR branch with is_admin() is reached during planning.
--
-- Symptom : SELECT on public.products as anon fails entirely → no products
-- visible on the platform. Same vector applies to every other table whose
-- RLS policy calls is_admin/is_brand_member/is_brand_owner.
--
-- This rolls back only those three grants. The seven trigger functions
-- revoked in the same migration stay revoked (they're not RLS helpers and
-- nothing calls them via RPC).
--
-- Security note : is_admin() is internally SECURITY DEFINER and returns
-- false for any caller without an admin user_profile, so re-granting
-- EXECUTE does not let anon impersonate admin. is_brand_member /
-- is_brand_owner take (brand_id, user_id) args — they remain "oracle-able"
-- in theory but UUIDs are random and brand membership is already public
-- via partner profile pages.

GRANT EXECUTE ON FUNCTION public.is_admin()                  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_brand_member(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_brand_owner(uuid, uuid)  TO anon, authenticated;
