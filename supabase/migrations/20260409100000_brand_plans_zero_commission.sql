-- ============================================================================
-- Brand plans: set commission to 0%
-- ============================================================================

-- A. Update existing brand subscriptions
UPDATE public.partner_subscriptions
SET commission_rate = 0, updated_at = now()
WHERE plan IN ('brand_member', 'brand_network');

-- B. Update the sync trigger so future plan changes also get 0%
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
        WHEN 'brand_member' THEN 0
        WHEN 'brand_network' THEN 0
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
