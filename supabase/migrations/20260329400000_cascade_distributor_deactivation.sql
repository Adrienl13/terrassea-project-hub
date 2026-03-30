-- ============================================================================
-- Migration: Cascade distributor deactivation
-- Date: 2026-03-29
-- Purpose: When a distributor is removed (is_active=false) from a brand network,
--          deactivate their inherited offers and reset routed briefs.
--          When reactivated, re-enable inherited offers.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cascade_distributor_deactivation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- ── Deactivation: true → false ────────────────────────────────────────
  IF OLD.is_active = true AND NEW.is_active = false THEN

    -- Deactivate inherited offers for this distributor from this brand
    UPDATE public.product_offers
       SET is_active = false, updated_at = now()
     WHERE partner_id = OLD.distributor_id
       AND source_offer_id IN (
         SELECT id FROM public.product_offers
          WHERE partner_id = OLD.brand_id
            AND source_offer_id IS NULL
       );

    -- Reset routed briefs back to pending_review
    UPDATE public.project_briefs
       SET routed_to_partner_id = NULL,
           status = 'pending_review',
           is_auto_routed = false
     WHERE brand_partner_id = OLD.brand_id
       AND routed_to_partner_id = OLD.distributor_id
       AND status = 'routed';

  END IF;

  -- ── Reactivation: false → true ────────────────────────────────────────
  IF OLD.is_active = false AND NEW.is_active = true THEN

    -- Re-activate inherited offers where the brand's source offer is still active
    UPDATE public.product_offers
       SET is_active = true, updated_at = now()
     WHERE partner_id = NEW.distributor_id
       AND source_offer_id IN (
         SELECT id FROM public.product_offers
          WHERE partner_id = NEW.brand_id
            AND source_offer_id IS NULL
            AND is_active = true
       );

  END IF;

  RETURN NEW;
END;
$$;

-- ── Trigger ─────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_cascade_distributor_deactivation ON public.brand_distributors;
CREATE TRIGGER trg_cascade_distributor_deactivation
  AFTER UPDATE ON public.brand_distributors
  FOR EACH ROW
  EXECUTE FUNCTION public.cascade_distributor_deactivation();
