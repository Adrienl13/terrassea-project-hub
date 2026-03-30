-- ============================================================================
-- Migration: Enforce allow_price_override
-- Date: 2026-03-30
-- Purpose: Server-side enforcement of the allow_price_override flag on
--          brand_distributors. When false, distributors cannot modify the
--          price on inherited offers — the trigger silently reverts the
--          price to its previous value. Other fields (stock, delivery_delay,
--          is_active, etc.) remain editable.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_price_override()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _allow_override boolean;
  _brand_id uuid;
BEGIN
  -- Only for inherited offers
  IF NEW.source_offer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only when price is being changed
  IF NEW.price IS NOT DISTINCT FROM OLD.price THEN
    RETURN NEW;
  END IF;

  -- Find the brand that owns the source offer
  SELECT po.partner_id INTO _brand_id
    FROM public.product_offers po
   WHERE po.id = NEW.source_offer_id;

  IF _brand_id IS NULL THEN
    RETURN NEW; -- source offer deleted (SET NULL), no restriction
  END IF;

  -- Check allow_price_override on the brand_distributors record
  SELECT bd.allow_price_override INTO _allow_override
    FROM public.brand_distributors bd
   WHERE bd.brand_id = _brand_id
     AND bd.distributor_id = NEW.partner_id
     AND bd.is_active = true
   LIMIT 1;

  -- If override not allowed, revert price to old value
  IF _allow_override = false THEN
    NEW.price := OLD.price;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_price_override ON public.product_offers;
CREATE TRIGGER trg_enforce_price_override
  BEFORE UPDATE ON public.product_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_price_override();
