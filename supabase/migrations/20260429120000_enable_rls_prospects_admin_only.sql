-- ============================================================================
-- HOTFIX RLS — Lockdown admin-only sur les 3 tables *_prospects
-- Date     : 2026-04-29
-- Sévérité : CRITIQUE (advisor Supabase ERROR : rls_disabled_in_public)
-- Contexte : voir docs/audit/2026-04/HOTFIX_RLS_PROSPECTS.md
--
-- Tables visées : architect_prospects, distributor_prospects, brand_prospects
-- Stratégie    : RLS activée + FORCE + policies admin-only via public.is_admin()
-- Bypass légitime : service_role (BYPASSRLS) — agent CRM externe inchangé
-- ============================================================================

-- ── 1. ENABLE + FORCE RLS sur les 3 tables ──────────────────────────────────

ALTER TABLE public.architect_prospects   ENABLE  ROW LEVEL SECURITY;
ALTER TABLE public.architect_prospects   FORCE   ROW LEVEL SECURITY;

ALTER TABLE public.distributor_prospects ENABLE  ROW LEVEL SECURITY;
ALTER TABLE public.distributor_prospects FORCE   ROW LEVEL SECURITY;

ALTER TABLE public.brand_prospects       ENABLE  ROW LEVEL SECURITY;
ALTER TABLE public.brand_prospects       FORCE   ROW LEVEL SECURITY;

-- ── 2. Policies admin-only sur architect_prospects ──────────────────────────

CREATE POLICY "Admins can read architect_prospects" ON public.architect_prospects
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can insert architect_prospects" ON public.architect_prospects
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update architect_prospects" ON public.architect_prospects
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete architect_prospects" ON public.architect_prospects
  FOR DELETE USING (public.is_admin());

-- ── 3. Policies admin-only sur distributor_prospects ────────────────────────

CREATE POLICY "Admins can read distributor_prospects" ON public.distributor_prospects
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can insert distributor_prospects" ON public.distributor_prospects
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update distributor_prospects" ON public.distributor_prospects
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete distributor_prospects" ON public.distributor_prospects
  FOR DELETE USING (public.is_admin());

-- ── 4. Policies admin-only sur brand_prospects ──────────────────────────────

CREATE POLICY "Admins can read brand_prospects" ON public.brand_prospects
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can insert brand_prospects" ON public.brand_prospects
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update brand_prospects" ON public.brand_prospects
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete brand_prospects" ON public.brand_prospects
  FOR DELETE USING (public.is_admin());

-- ============================================================================
-- FIN. Vérifier ensuite via mcp__supabase__get_advisors que les 3 entrées
-- "rls_disabled_in_public" ont disparu.
-- ============================================================================
