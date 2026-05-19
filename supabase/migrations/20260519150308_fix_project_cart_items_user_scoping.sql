-- Fix project_cart_items cross-user leak.
--
-- Old policies :
--   "Authenticated users can read cart items"   USING  (auth.uid() IS NOT NULL)
--   "Authenticated users can insert cart items" CHECK  (auth.uid() IS NOT NULL)
-- → every signed-in user could read AND write every cart on the
-- platform. Audit found 4 cart items leaking.
--
-- The table has no direct user_id column ; ownership is carried by the
-- parent project_requests row via project_request_id (FK). The fix
-- scopes every CRUD operation through that parent join, mirroring the
-- existing project_requests RLS pattern (user_id strict for writes,
-- user_id-or-contact_email for reads to preserve the legacy email-only
-- flow).
--
-- Also adds proper UPDATE / DELETE policies for the owner — the old
-- setup had none, so users could insert cart items but could never
-- modify or remove them (admin-only). This is part of the fix : a
-- working cart needs the user to mutate it.
--
-- Admin policies stay untouched.

DROP POLICY IF EXISTS "Authenticated users can read cart items"   ON public.project_cart_items;
DROP POLICY IF EXISTS "Authenticated users can insert cart items" ON public.project_cart_items;

CREATE POLICY "Users read own cart items"
ON public.project_cart_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_requests pr
    WHERE pr.id = project_cart_items.project_request_id
      AND (
        pr.user_id = (SELECT auth.uid())
        OR pr.contact_email = (
          SELECT email FROM public.user_profiles WHERE id = (SELECT auth.uid())
        )
      )
  )
);

CREATE POLICY "Users insert own cart items"
ON public.project_cart_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_requests pr
    WHERE pr.id = project_cart_items.project_request_id
      AND pr.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users update own cart items"
ON public.project_cart_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.project_requests pr
    WHERE pr.id = project_cart_items.project_request_id
      AND pr.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_requests pr
    WHERE pr.id = project_cart_items.project_request_id
      AND pr.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users delete own cart items"
ON public.project_cart_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.project_requests pr
    WHERE pr.id = project_cart_items.project_request_id
      AND pr.user_id = (SELECT auth.uid())
  )
);
