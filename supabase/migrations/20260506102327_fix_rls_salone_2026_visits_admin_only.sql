-- ============================================================================
-- Fix RLS salone_2026_visits — admin-only access
-- Date : 2026-05-06
--
-- Reason : Detected by Supabase Advisor (rls_policy_always_true).
-- The "Allow all anon" policy with cmd=ALL qual=true allowed anon role to
-- SELECT/INSERT/UPDATE/DELETE on a table containing PII (prenom, nom, poste,
-- mail, notes). Volume currently 0 but design is admin-only (consumed via
-- Supabase Studio or external CRM agent — no frontend reference in src/).
--
-- Pattern jumeau du hotfix CRM 2026-04-29 (3 prospects tables ayant le même
-- problème). Aligned with public.is_admin() helper (SECURITY DEFINER, EXECUTE
-- granted to all roles).
--
-- Rollback : capture of existing policy before refactor :
--
--   CREATE POLICY "Allow all anon" ON salone_2026_visits
--     AS PERMISSIVE FOR ALL TO anon
--     USING (true) WITH CHECK (true);
-- ============================================================================

-- ===== Phase 1 : capture baseline =====

DO $$
DECLARE
  baseline_count integer;
BEGIN
  SELECT count(*) INTO baseline_count FROM salone_2026_visits;
  RAISE NOTICE 'Baseline row count before fix: %', baseline_count;
END $$;

-- ===== Phase 2 : DROP existing policy + CREATE proper =====

DROP POLICY IF EXISTS "Allow all anon" ON public.salone_2026_visits;

CREATE POLICY salone_2026_visits_admin_only ON public.salone_2026_visits
  AS PERMISSIVE FOR ALL TO public
  USING (is_admin())
  WITH CHECK (is_admin());

COMMENT ON POLICY salone_2026_visits_admin_only ON public.salone_2026_visits IS
  'Admin-only access. Table consumed via Supabase Studio or external CRM agent only. No frontend integration. Fixed 2026-05-06 from "Allow all anon" which exposed PII to anon role.';

-- ===== Phase 3 : embedded validation =====

DO $$
DECLARE
  policy_count integer;
BEGIN
  -- Vérifier qu'il y a exactement 1 policy
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'salone_2026_visits';

  IF policy_count <> 1 THEN
    RAISE EXCEPTION 'Expected 1 policy on salone_2026_visits, got %', policy_count;
  END IF;

  -- Vérifier que la nouvelle policy référence is_admin()
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'salone_2026_visits'
      AND qual LIKE '%is_admin()%'
      AND with_check LIKE '%is_admin()%'
  ) THEN
    RAISE EXCEPTION 'New policy does not reference is_admin() in both qual and with_check - fix incomplete';
  END IF;

  RAISE NOTICE 'OK: salone_2026_visits policy now admin-only';
END $$;
