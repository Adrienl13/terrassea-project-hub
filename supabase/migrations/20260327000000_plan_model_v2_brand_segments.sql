-- ============================================================================
-- PLAN MODEL v2: 2-Segment Architecture (Catalogue + Brand)
-- Date: 2026-03-27
-- Purpose: Remove elite_pro plan, create brand_distributors table,
--          fix briefs admin policy to use is_admin()
-- ============================================================================

-- ============================================================================
-- A. CREATE brand_distributors TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.brand_distributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  distributor_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  country_code text NOT NULL,
  is_exclusive boolean DEFAULT false,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, distributor_id, country_code)
);

CREATE INDEX IF NOT EXISTS idx_brand_distributors_brand
  ON public.brand_distributors (brand_id);

CREATE INDEX IF NOT EXISTS idx_brand_distributors_distributor
  ON public.brand_distributors (distributor_id);

-- RLS
ALTER TABLE public.brand_distributors ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full access to brand_distributors"
  ON public.brand_distributors FOR ALL
  USING (public.is_admin());

-- Brand owners can manage their own distributor rows
CREATE POLICY "Brand owners can manage own distributors"
  ON public.brand_distributors FOR ALL
  USING (
    brand_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  )
  WITH CHECK (
    brand_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

-- Distributors can read rows that reference them
CREATE POLICY "Distributors can read own assignments"
  ON public.brand_distributors FOR SELECT
  USING (
    distributor_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

-- ============================================================================
-- B. MIGRATE elite_pro → elite
-- ============================================================================

UPDATE public.partners
  SET plan = 'elite'
  WHERE plan = 'elite_pro';

UPDATE public.partner_subscriptions
  SET plan = 'elite'
  WHERE plan = 'elite_pro';

-- ============================================================================
-- C. FIX briefs admin policy (was using EXISTS subquery instead of is_admin())
-- ============================================================================

DROP POLICY IF EXISTS "Admins full access to briefs" ON public.project_briefs;

CREATE POLICY "Admins full access to briefs"
  ON public.project_briefs FOR ALL
  USING (public.is_admin());
