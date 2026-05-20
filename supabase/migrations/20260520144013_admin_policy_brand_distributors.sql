-- Add the missing admin policy on brand_distributors so the admin can
-- manage distributors on behalf of brand partners during the early
-- onboarding phase (founder doing 80% of the work for the first 15
-- brands). Mirrors the existing pattern used on brand_collections and
-- brand_references ("Admins full access ...").
--
-- The two existing policies "Brand owners can manage own distributors"
-- and "brand can manage own distributors" stay untouched : brand
-- owners keep their own write path. Admins gain a parallel one via
-- is_admin().

CREATE POLICY "Admins full access brand_distributors"
ON public.brand_distributors
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());
