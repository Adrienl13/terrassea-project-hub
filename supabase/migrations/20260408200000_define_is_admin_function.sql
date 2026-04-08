-- Version-control the is_admin() helper used by all admin RLS policies.
-- Previously created only via Supabase dashboard — not reproducible from migrations.
-- SECURITY DEFINER bypasses RLS to avoid circular reference on user_profiles.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
      AND user_type = 'admin'
  );
END;
$$;
