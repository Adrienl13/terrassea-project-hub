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

-- ============================================================================
-- D. UPDATE partner_subscriptions CHECK constraint for brand plans
-- ============================================================================

ALTER TABLE public.partner_subscriptions
  DROP CONSTRAINT IF EXISTS partner_subscriptions_plan_check;

ALTER TABLE public.partner_subscriptions
  ADD CONSTRAINT partner_subscriptions_plan_check
  CHECK (plan = ANY (ARRAY['starter','growth','elite','brand_member','brand_network']));

-- ============================================================================
-- E. UPDATE plan-sync trigger to handle brand plans
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_partner_subscription_on_plan_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.plan IS DISTINCT FROM OLD.plan THEN
    INSERT INTO public.partner_subscriptions (partner_id, plan, status, commission_rate, max_products, updated_at)
    VALUES (
      NEW.id,
      NEW.plan,
      'active',
      CASE NEW.plan
        WHEN 'elite' THEN 3.5
        WHEN 'growth' THEN 5
        WHEN 'brand_member' THEN 2
        WHEN 'brand_network' THEN 1.5
        ELSE 8
      END,
      CASE NEW.plan
        WHEN 'elite' THEN 150
        WHEN 'growth' THEN 50
        WHEN 'brand_member' THEN 999
        WHEN 'brand_network' THEN 999
        ELSE 30
      END,
      now()
    )
    ON CONFLICT (partner_id) DO UPDATE SET
      plan = EXCLUDED.plan,
      commission_rate = EXCLUDED.commission_rate,
      max_products = EXCLUDED.max_products,
      updated_at = now();

    NEW.visibility_level := CASE NEW.plan
      WHEN 'elite' THEN 'featured'
      WHEN 'growth' THEN 'standard'
      WHEN 'brand_member' THEN 'standard'
      WHEN 'brand_network' THEN 'featured'
      ELSE 'anonymous'
    END;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach the trigger (BEFORE UPDATE so it can set NEW.visibility_level)
DROP TRIGGER IF EXISTS trg_sync_partner_subscription_on_plan_change ON public.partners;
CREATE TRIGGER trg_sync_partner_subscription_on_plan_change
  BEFORE UPDATE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_partner_subscription_on_plan_change();
