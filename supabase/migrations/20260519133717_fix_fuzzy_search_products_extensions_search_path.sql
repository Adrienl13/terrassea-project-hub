-- Fix-forward for 20260519132034 : the SECURITY INVOKER recreation set
-- search_path = 'public' only, which excludes the `extensions` schema where
-- pg_trgm lives. The function calls similarity() ~10 times and broke with
-- "function similarity(text, text) does not exist".
--
-- Resolution : extend the function's search_path to include `extensions`.
-- This is the standard Supabase pattern for functions that use pg_trgm
-- (and remains safe — `extensions` is on the protected schema set).
--
-- Why the previous SECURITY DEFINER version "worked" with the same
-- search_path = 'public' : DEFINER chains can resolve similarity() via the
-- function owner's role-default search_path search in some Postgres
-- configurations, but that behaviour is unreliable and definitely does
-- not survive the move to INVOKER. Explicit is better.

ALTER FUNCTION public.fuzzy_search_products(text, text, text, integer)
  SET search_path = 'public', 'extensions';
