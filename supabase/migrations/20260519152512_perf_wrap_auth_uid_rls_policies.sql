-- Wrap bare auth.uid() calls inside (SELECT auth.uid()) on 9 RLS
-- policies so Postgres evaluates the function once per query (initplan
-- cached) instead of once per scanned row. Semantically identical —
-- only the planner sees a difference.
--
-- Closes 9 advisor entries on `auth_rls_initplan`, which regressed
-- from 0 → 9 after the recent CGV / founding / chr_clients chantiers.
-- Pattern matches the existing wrap already used elsewhere in the
-- codebase (see e.g. products_select_combined).
--
-- Tables touched, all per-user-scoped : cgv_acceptances (×2),
-- cgv_url_grants (×2), chr_clients (×1), founding_actions (×1),
-- partner_cgv (×3).

-- cgv_acceptances ------------------------------------------------------
DROP POLICY IF EXISTS cgv_acceptances_user_read_own    ON public.cgv_acceptances;
CREATE POLICY cgv_acceptances_user_read_own
ON public.cgv_acceptances
FOR SELECT
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS cgv_acceptances_partner_read_own ON public.cgv_acceptances;
CREATE POLICY cgv_acceptances_partner_read_own
ON public.cgv_acceptances
FOR SELECT
USING (
  partner_id IN (
    SELECT partners.id FROM public.partners
    WHERE partners.user_id = (SELECT auth.uid())
  )
);

-- cgv_url_grants -------------------------------------------------------
DROP POLICY IF EXISTS cgv_url_grants_user_read_own    ON public.cgv_url_grants;
CREATE POLICY cgv_url_grants_user_read_own
ON public.cgv_url_grants
FOR SELECT
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS cgv_url_grants_partner_read_own ON public.cgv_url_grants;
CREATE POLICY cgv_url_grants_partner_read_own
ON public.cgv_url_grants
FOR SELECT
USING (
  partner_id IN (
    SELECT partners.id FROM public.partners
    WHERE partners.user_id = (SELECT auth.uid())
  )
);

-- chr_clients ----------------------------------------------------------
DROP POLICY IF EXISTS chr_clients_admin_all ON public.chr_clients;
CREATE POLICY chr_clients_admin_all
ON public.chr_clients
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.user_type = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.user_type = 'admin'
  )
);

-- founding_actions -----------------------------------------------------
DROP POLICY IF EXISTS founding_actions_partner_read_own ON public.founding_actions;
CREATE POLICY founding_actions_partner_read_own
ON public.founding_actions
FOR SELECT
USING (
  partner_id IN (
    SELECT partners.id FROM public.partners
    WHERE partners.user_id = (SELECT auth.uid())
  )
);

-- partner_cgv ----------------------------------------------------------
DROP POLICY IF EXISTS partner_cgv_owner_read_all_own ON public.partner_cgv;
CREATE POLICY partner_cgv_owner_read_all_own
ON public.partner_cgv
FOR SELECT
USING (
  partner_id IN (
    SELECT partners.id FROM public.partners
    WHERE partners.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS partner_cgv_owner_insert_own ON public.partner_cgv;
CREATE POLICY partner_cgv_owner_insert_own
ON public.partner_cgv
FOR INSERT
WITH CHECK (
  partner_id IN (
    SELECT partners.id FROM public.partners
    WHERE partners.user_id = (SELECT auth.uid())
      AND partners.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS partner_cgv_owner_update_own ON public.partner_cgv;
CREATE POLICY partner_cgv_owner_update_own
ON public.partner_cgv
FOR UPDATE
USING (
  partner_id IN (
    SELECT partners.id FROM public.partners
    WHERE partners.user_id = (SELECT auth.uid())
      AND partners.deleted_at IS NULL
  )
)
WITH CHECK (
  partner_id IN (
    SELECT partners.id FROM public.partners
    WHERE partners.user_id = (SELECT auth.uid())
      AND partners.deleted_at IS NULL
  )
);
