-- ============================================================================
-- Migration: Brand Network plan downgrade cleanup
-- Date: 2026-03-29
-- Purpose: When a brand downgrades from brand_network to another plan,
--          clean up inherited offers, brand_distributors, and routed briefs.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_brand_network_downgrade()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only fire when plan changes FROM brand_network to something else
  IF OLD.plan = 'brand_network' AND NEW.plan IS DISTINCT FROM 'brand_network' THEN

    -- 1. Reset routed briefs to pending_review
    UPDATE public.project_briefs
       SET routed_to_partner_id = NULL,
           status = 'pending_review',
           is_auto_routed = false
     WHERE brand_partner_id = NEW.id
       AND status = 'routed';

    -- 2. Deactivate all inherited offers from this brand's distributors
    UPDATE public.product_offers
       SET is_active = false, updated_at = now()
     WHERE source_offer_id IN (
       SELECT id FROM public.product_offers
        WHERE partner_id = NEW.id
          AND source_offer_id IS NULL
     );

    -- 3. Deactivate all brand_distributors for this brand
    UPDATE public.brand_distributors
       SET is_active = false
     WHERE brand_id = NEW.id;

  END IF;

  RETURN NEW;
END;
$$;

-- ── Trigger ─────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_brand_network_downgrade ON public.partners;
CREATE TRIGGER trg_brand_network_downgrade
  AFTER UPDATE OF plan ON public.partners
  FOR EACH ROW
  WHEN (OLD.plan = 'brand_network' AND NEW.plan IS DISTINCT FROM 'brand_network')
  EXECUTE FUNCTION public.handle_brand_network_downgrade();
