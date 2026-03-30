-- ============================================================================
-- Migration: Brand Distributor Enhancements
-- Date: 2026-03-29
-- Purpose: Extend brand_distributors with revenue-share & collection fields,
--          add offer-sync triggers so brand offers automatically propagate to
--          distributors, make auto_route_brief collection-aware, and expose
--          effective commissions via a view.
-- ============================================================================

-- ============================================================================
-- A. NEW COLUMNS ON brand_distributors
-- ============================================================================

ALTER TABLE public.brand_distributors
  ADD COLUMN IF NOT EXISTS allow_price_override boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS commission_override numeric(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS revenue_share_brand numeric(5,2) DEFAULT 30,
  ADD COLUMN IF NOT EXISTS revenue_share_distributor numeric(5,2) DEFAULT 70,
  ADD COLUMN IF NOT EXISTS collections text[] DEFAULT '{}';

ALTER TABLE public.brand_distributors
  ADD CONSTRAINT chk_revenue_share_sum
  CHECK (revenue_share_brand + revenue_share_distributor = 100);

CREATE INDEX IF NOT EXISTS idx_brand_distributors_collections
  ON public.brand_distributors USING GIN (collections);

-- ============================================================================
-- B. NEW COLUMN ON product_offers
-- ============================================================================

ALTER TABLE public.product_offers
  ADD COLUMN IF NOT EXISTS source_offer_id uuid DEFAULT NULL
    REFERENCES public.product_offers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_product_offers_source
  ON public.product_offers (source_offer_id) WHERE source_offer_id IS NOT NULL;

-- ============================================================================
-- C. TRIGGER: sync_brand_offer_to_distributors()
--    Fires AFTER INSERT OR UPDATE on product_offers.
--    Propagates brand offers to every active distributor.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_brand_offer_to_distributors()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _brand_plan text;
  _dist record;
BEGIN
  -- Guard 1: skip inherited offers to prevent recursion
  IF NEW.source_offer_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Guard 2: only act for brand_network partners
  SELECT plan INTO _brand_plan
    FROM public.partners
   WHERE id = NEW.partner_id;

  IF _brand_plan IS DISTINCT FROM 'brand_network' THEN
    RETURN NEW;
  END IF;

  -- Propagate to every active distributor for this brand
  FOR _dist IN
    SELECT distributor_id
      FROM public.brand_distributors
     WHERE brand_id = NEW.partner_id
       AND is_active = true
  LOOP
    INSERT INTO public.product_offers (
      product_id, partner_id, price, currency, stock_status, stock_quantity,
      delivery_delay_days, minimum_order, purchase_type, notes,
      collection_name, pricing_mode, is_active, source_offer_id,
      partner_color_name, partner_ref
    )
    VALUES (
      NEW.product_id, _dist.distributor_id, NEW.price, NEW.currency,
      NEW.stock_status, NEW.stock_quantity, NEW.delivery_delay_days,
      NEW.minimum_order, NEW.purchase_type, NEW.notes,
      NEW.collection_name, NEW.pricing_mode, NEW.is_active, NEW.id,
      NEW.partner_color_name, NEW.partner_ref
    )
    ON CONFLICT (product_id, partner_id) DO UPDATE SET
      price              = CASE WHEN product_offers.source_offer_id IS NOT NULL THEN EXCLUDED.price              ELSE product_offers.price END,
      currency           = CASE WHEN product_offers.source_offer_id IS NOT NULL THEN EXCLUDED.currency           ELSE product_offers.currency END,
      stock_status       = CASE WHEN product_offers.source_offer_id IS NOT NULL THEN EXCLUDED.stock_status       ELSE product_offers.stock_status END,
      stock_quantity     = CASE WHEN product_offers.source_offer_id IS NOT NULL THEN EXCLUDED.stock_quantity     ELSE product_offers.stock_quantity END,
      delivery_delay_days= CASE WHEN product_offers.source_offer_id IS NOT NULL THEN EXCLUDED.delivery_delay_days ELSE product_offers.delivery_delay_days END,
      minimum_order      = CASE WHEN product_offers.source_offer_id IS NOT NULL THEN EXCLUDED.minimum_order      ELSE product_offers.minimum_order END,
      purchase_type      = CASE WHEN product_offers.source_offer_id IS NOT NULL THEN EXCLUDED.purchase_type      ELSE product_offers.purchase_type END,
      notes              = CASE WHEN product_offers.source_offer_id IS NOT NULL THEN EXCLUDED.notes              ELSE product_offers.notes END,
      collection_name    = CASE WHEN product_offers.source_offer_id IS NOT NULL THEN EXCLUDED.collection_name    ELSE product_offers.collection_name END,
      pricing_mode       = CASE WHEN product_offers.source_offer_id IS NOT NULL THEN EXCLUDED.pricing_mode       ELSE product_offers.pricing_mode END,
      is_active          = CASE WHEN product_offers.source_offer_id IS NOT NULL THEN EXCLUDED.is_active          ELSE product_offers.is_active END,
      source_offer_id    = CASE WHEN product_offers.source_offer_id IS NOT NULL THEN EXCLUDED.source_offer_id    ELSE product_offers.source_offer_id END,
      partner_color_name = CASE WHEN product_offers.source_offer_id IS NOT NULL THEN EXCLUDED.partner_color_name ELSE product_offers.partner_color_name END,
      partner_ref        = CASE WHEN product_offers.source_offer_id IS NOT NULL THEN EXCLUDED.partner_ref        ELSE product_offers.partner_ref END,
      updated_at         = now()
    WHERE product_offers.source_offer_id IS NOT NULL;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_brand_offer_to_distributors ON public.product_offers;
CREATE TRIGGER trg_sync_brand_offer_to_distributors
  AFTER INSERT OR UPDATE ON public.product_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_brand_offer_to_distributors();

-- ============================================================================
-- D. TRIGGER: sync_existing_offers_to_new_distributor()
--    Fires AFTER INSERT on brand_distributors.
--    Copies all active brand offers to a newly-added distributor.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_existing_offers_to_new_distributor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _brand_plan text;
BEGIN
  -- Guard 1: only act for active distributor assignments
  IF NEW.is_active IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;

  -- Guard 2: only act for brand_network partners
  SELECT plan INTO _brand_plan
    FROM public.partners
   WHERE id = NEW.brand_id;

  IF _brand_plan IS DISTINCT FROM 'brand_network' THEN
    RETURN NEW;
  END IF;

  -- Copy all active, non-inherited brand offers to the new distributor
  INSERT INTO public.product_offers (
    product_id, partner_id, price, currency, stock_status, stock_quantity,
    delivery_delay_days, minimum_order, purchase_type, notes,
    collection_name, pricing_mode, is_active, source_offer_id,
    partner_color_name, partner_ref
  )
  SELECT
    po.product_id, NEW.distributor_id, po.price, po.currency,
    po.stock_status, po.stock_quantity, po.delivery_delay_days,
    po.minimum_order, po.purchase_type, po.notes,
    po.collection_name, po.pricing_mode, po.is_active, po.id,
    po.partner_color_name, po.partner_ref
  FROM public.product_offers po
  WHERE po.partner_id = NEW.brand_id
    AND po.source_offer_id IS NULL
    AND po.is_active = true
  ON CONFLICT (product_id, partner_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_existing_offers_to_new_distributor ON public.brand_distributors;
CREATE TRIGGER trg_sync_existing_offers_to_new_distributor
  AFTER INSERT ON public.brand_distributors
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_existing_offers_to_new_distributor();

-- ============================================================================
-- E. REPLACE auto_route_brief() — collection-aware routing
--    Adds a collection-overlap score so distributors whose collections match
--    the brief's collections_interest are preferred.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_route_brief()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _brand_plan text;
  _best_distributor_id uuid;
BEGIN
  -- 1. Check if the brand partner uses brand_network plan
  SELECT plan INTO _brand_plan
    FROM public.partners
   WHERE id = NEW.brand_partner_id;

  IF _brand_plan IS DISTINCT FROM 'brand_network' THEN
    RETURN NEW;
  END IF;

  -- 2. Skip if no country on the brief (can't match)
  IF NEW.country IS NULL OR NEW.country = '' THEN
    RETURN NEW;
  END IF;

  -- 3. Find best matching active distributor for this brand + country
  --    Now includes collection-overlap scoring
  SELECT bd.distributor_id INTO _best_distributor_id
    FROM public.brand_distributors bd
   WHERE bd.brand_id = NEW.brand_partner_id
     AND bd.country_code = NEW.country
     AND bd.is_active = true
   ORDER BY
     CASE
       WHEN NEW.collections_interest IS NOT NULL
            AND array_length(NEW.collections_interest, 1) > 0
            AND array_length(bd.collections, 1) > 0
       THEN
         -1 * (SELECT count(*) FROM unnest(bd.collections) c WHERE c = ANY(NEW.collections_interest))
       WHEN array_length(bd.collections, 1) IS NULL OR array_length(bd.collections, 1) = 0
       THEN 0
       ELSE 1
     END,
     bd.is_exclusive DESC NULLS LAST,
     bd.priority ASC NULLS LAST
   LIMIT 1;

  -- 4. If a distributor was found, route the brief
  IF _best_distributor_id IS NOT NULL THEN
    UPDATE public.project_briefs
       SET routed_to_partner_id = _best_distributor_id,
           status = 'routed',
           is_auto_routed = true
     WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- F. VIEW: v_effective_commissions
--    Resolves the effective commission rate per brand-distributor relationship:
--    uses commission_override when set, otherwise falls back to the
--    distributor's plan commission_rate from partner_subscriptions.
-- ============================================================================

CREATE OR REPLACE VIEW public.v_effective_commissions AS
SELECT
  bd.id                AS brand_distributor_id,
  bd.brand_id,
  bd.distributor_id,
  bd.country_code,
  bd.commission_override,
  bd.revenue_share_brand,
  bd.revenue_share_distributor,
  ps.commission_rate   AS plan_commission_rate,
  COALESCE(bd.commission_override, ps.commission_rate) AS effective_commission_rate
FROM public.brand_distributors bd
LEFT JOIN public.partner_subscriptions ps
  ON ps.partner_id = bd.distributor_id
WHERE bd.is_active = true;
