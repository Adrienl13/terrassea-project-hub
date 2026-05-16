-- Red-team audit finding H1 (2026-05-16): Partner self-upgrade via UPDATE.
-- The pre-existing policy "Partners manage own profile" was polcmd='*' (ALL
-- commands) with no WITH CHECK clause, letting any authenticated partner
-- update their own row's privileged columns -- plan, partner_mode,
-- is_founding, visibility_level, profile_status, etc. -- and grant themselves
-- brand_network plan (0% commission, 999 products, "founder" badge) without
-- payment or admin review.
--
-- Fix:
--  1. Replace the broad "*" policy with explicit SELECT/INSERT/UPDATE
--     policies scoped via WITH CHECK to (user_id = auth.uid()).
--  2. Add a BEFORE INSERT OR UPDATE trigger that blocks non-admin / non-
--     service_role callers from setting or modifying privileged columns.
--
-- The Account.tsx self-create flow (brand auto-onboarding) still works:
-- the INSERT path allows plan in (starter, brand_member, brand_network)
-- only when partner_type='brand'. The PartnerProfileForm.tsx submit flow
-- continues to work: partner_type/country_code are not "changed" (NEW
-- matches OLD) on resubmit, profile_status transitions from
-- draft|changes_requested -> pending_review remain permitted.
--
-- DELETE remains admin-only (existing "Admins can delete partners" policy).

-- 1. Drop the over-permissive ALL-command policy.
DROP POLICY IF EXISTS "Partners manage own profile" ON public.partners;

-- 2. Re-add narrowly-scoped SELECT/INSERT/UPDATE policies for the partner.
-- SELECT is already covered by "Partner users can read own partner".
CREATE POLICY "Partner can update own profile"
  ON public.partners
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Partner can insert own profile"
  ON public.partners
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

-- 3. Trigger function: block privileged-column writes by non-admin callers.
CREATE OR REPLACE FUNCTION public.prevent_partner_privilege_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_jwt_role text := auth.role();
BEGIN
  -- Admins (via JWT claim 'sub' resolving to user_type='admin') and the
  -- service_role JWT bypass all restrictions. Direct DB access (SQL Editor,
  -- migration runner via postgres role) needs to use
  --   ALTER TABLE partners DISABLE TRIGGER trg_prevent_partner_privilege_changes;
  --   ... DML ...;
  --   ALTER TABLE partners ENABLE TRIGGER trg_prevent_partner_privilege_changes;
  -- if it legitimately needs to bypass these column-level checks. This is by
  -- design: admin-level DML should be auditable and explicit.
  IF public.is_admin() OR v_jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Force user_id binding so a non-admin cannot insert a row owned by
    -- another user.
    IF NEW.user_id IS DISTINCT FROM (SELECT auth.uid()) THEN
      RAISE EXCEPTION 'partners.user_id must match the authenticated user'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- plan: starter is always allowed; brand_member / brand_network require
    -- partner_type='brand' (mirrors src/pages/Account.tsx auto-create logic).
    IF NEW.plan IS NOT NULL AND NEW.plan NOT IN ('starter', 'brand_member', 'brand_network') THEN
      RAISE EXCEPTION 'partners.plan can only be set to starter/brand_member/brand_network by non-admin (got %)', NEW.plan
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.plan IN ('brand_member', 'brand_network')
       AND COALESCE(NEW.partner_type, '') <> 'brand' THEN
      RAISE EXCEPTION 'brand plans require partner_type=brand'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Founding badge: admin-only.
    IF COALESCE(NEW.is_founding, false) IS DISTINCT FROM false THEN
      RAISE EXCEPTION 'partners.is_founding can only be set by an admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.founding_tier IS NOT NULL
       OR NEW.founding_joined_at IS NOT NULL
       OR NEW.founding_tier_rank IS NOT NULL
       OR COALESCE(NEW.founding_total_points, 0) <> 0 THEN
      RAISE EXCEPTION 'partners.founding_* fields can only be set by an admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Visibility / curation: admin-only.
    IF NEW.visibility_level IS NOT NULL AND NEW.visibility_level <> 'standard' THEN
      RAISE EXCEPTION 'partners.visibility_level can only be set by an admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF COALESCE(NEW.admin_visibility_override, false) IS DISTINCT FROM false
       OR NEW.admin_notes IS NOT NULL THEN
      RAISE EXCEPTION 'partners.admin_* fields can only be set by an admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.priority_order IS NOT NULL AND NEW.priority_order <> 0 THEN
      RAISE EXCEPTION 'partners.priority_order can only be set by an admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Profile review pipeline: admin-only fields.
    IF NEW.profile_status IS NOT NULL AND NEW.profile_status NOT IN ('draft', 'pending_review') THEN
      RAISE EXCEPTION 'partners.profile_status on insert must be draft or pending_review (got %)', NEW.profile_status
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.profile_reviewed_at IS NOT NULL
       OR NEW.profile_reviewed_by IS NOT NULL
       OR NEW.profile_review_notes IS NOT NULL THEN
      RAISE EXCEPTION 'partners.profile_reviewed_* fields can only be set by an admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Application link & soft-delete: admin-only.
    IF NEW.application_id IS NOT NULL THEN
      RAISE EXCEPTION 'partners.application_id can only be set by an admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.deleted_at IS NOT NULL THEN
      RAISE EXCEPTION 'partners.deleted_at can only be set by an admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- is_active / is_public defaults are 'true' for active and 'true' for
    -- is_public per column defaults; Account.tsx auto-create sets is_public
    -- to false. We allow either (admin will gate via approval pipeline).

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Lock columns that affect billing, commission, visibility, identity.
    IF NEW.plan IS DISTINCT FROM OLD.plan THEN
      RAISE EXCEPTION 'partners.plan can only be modified by an admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.partner_type IS DISTINCT FROM OLD.partner_type THEN
      RAISE EXCEPTION 'partners.partner_type can only be modified by an admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.partner_mode IS DISTINCT FROM OLD.partner_mode THEN
      RAISE EXCEPTION 'partners.partner_mode can only be modified by an admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      RAISE EXCEPTION 'partners.is_active can only be modified by an admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.is_public IS DISTINCT FROM OLD.is_public THEN
      RAISE EXCEPTION 'partners.is_public can only be modified by an admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.priority_order IS DISTINCT FROM OLD.priority_order THEN
      RAISE EXCEPTION 'partners.priority_order can only be modified by an admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.visibility_level IS DISTINCT FROM OLD.visibility_level THEN
      RAISE EXCEPTION 'partners.visibility_level can only be modified by an admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.admin_visibility_override IS DISTINCT FROM OLD.admin_visibility_override THEN
      RAISE EXCEPTION 'partners.admin_visibility_override can only be modified by an admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.admin_notes IS DISTINCT FROM OLD.admin_notes THEN
      RAISE EXCEPTION 'partners.admin_notes can only be modified by an admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'partners.user_id can only be modified by an admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.application_id IS DISTINCT FROM OLD.application_id THEN
      RAISE EXCEPTION 'partners.application_id can only be modified by an admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
      RAISE EXCEPTION 'partners.deleted_at can only be modified by an admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.profile_reviewed_at IS DISTINCT FROM OLD.profile_reviewed_at THEN
      RAISE EXCEPTION 'partners.profile_reviewed_at can only be modified by an admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.profile_reviewed_by IS DISTINCT FROM OLD.profile_reviewed_by THEN
      RAISE EXCEPTION 'partners.profile_reviewed_by can only be modified by an admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.profile_review_notes IS DISTINCT FROM OLD.profile_review_notes THEN
      RAISE EXCEPTION 'partners.profile_review_notes can only be modified by an admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.is_founding IS DISTINCT FROM OLD.is_founding THEN
      RAISE EXCEPTION 'partners.is_founding can only be modified by an admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.founding_joined_at IS DISTINCT FROM OLD.founding_joined_at THEN
      RAISE EXCEPTION 'partners.founding_joined_at can only be modified by an admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.founding_tier IS DISTINCT FROM OLD.founding_tier THEN
      RAISE EXCEPTION 'partners.founding_tier can only be modified by an admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.founding_tier_rank IS DISTINCT FROM OLD.founding_tier_rank THEN
      RAISE EXCEPTION 'partners.founding_tier_rank can only be modified by an admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.founding_total_points IS DISTINCT FROM OLD.founding_total_points THEN
      RAISE EXCEPTION 'partners.founding_total_points can only be modified by an admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.slug IS DISTINCT FROM OLD.slug THEN
      RAISE EXCEPTION 'partners.slug can only be modified by an admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- country_code: lock only after first set. Partners with NULL/empty
    -- country_code (newly created via Account.tsx auto-insert) can set it
    -- via PartnerProfileForm. Once set, only admin can change it.
    IF NEW.country_code IS DISTINCT FROM OLD.country_code THEN
      IF OLD.country_code IS NOT NULL AND OLD.country_code <> '' THEN
        RAISE EXCEPTION 'partners.country_code can only be modified by an admin once set'
          USING ERRCODE = 'insufficient_privilege';
      END IF;
    END IF;

    -- profile_status: partner can only transition draft|changes_requested
    -- -> pending_review. All other transitions are admin-only.
    IF NEW.profile_status IS DISTINCT FROM OLD.profile_status THEN
      IF NOT (
        COALESCE(OLD.profile_status, 'draft') IN ('draft', 'changes_requested')
        AND NEW.profile_status = 'pending_review'
      ) THEN
        RAISE EXCEPTION 'partners.profile_status transition % -> % is not allowed for non-admin',
          COALESCE(OLD.profile_status, 'NULL'), COALESCE(NEW.profile_status, 'NULL')
          USING ERRCODE = 'insufficient_privilege';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prevent_partner_privilege_changes() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_prevent_partner_privilege_changes ON public.partners;
CREATE TRIGGER trg_prevent_partner_privilege_changes
  BEFORE INSERT OR UPDATE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_partner_privilege_changes();

COMMENT ON FUNCTION public.prevent_partner_privilege_changes IS
  'Blocks non-admin / non-service_role callers from setting or modifying privileged partners columns (plan, billing, founding, visibility, identity, review pipeline). Closes red-team finding H1 (2026-05-16).';
