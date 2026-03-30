-- ============================================================================
-- Migration: Auto-route briefs for Brand Network partners
-- Date: 2026-03-29
-- Purpose: Automatically set routed_to_partner_id when a brief is inserted
--          for a brand_network partner, based on country match + distributor
--          exclusivity + priority ranking.
-- ============================================================================

-- ── Column: is_auto_routed flag ─────────────────────────────────────────────
-- Tracks whether a brief was auto-routed by the trigger vs manually assigned.

ALTER TABLE public.project_briefs
  ADD COLUMN IF NOT EXISTS is_auto_routed boolean DEFAULT false;

-- ── Function: auto_route_brief() ────────────────────────────────────────────
-- Triggered AFTER INSERT on project_briefs.
-- Only acts when the brand has plan = 'brand_network'.
-- Finds the best matching distributor:
--   1. Match by country (brief.country = brand_distributors.country_code)
--   2. Prefer is_exclusive = true
--   3. Then by priority ASC (lowest number = highest priority)
--   4. Only is_active = true distributors
-- Sets routed_to_partner_id and status = 'routed'.
-- If no matching distributor found, leaves the brief as-is (status = 'pending_review').

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
  SELECT bd.distributor_id INTO _best_distributor_id
    FROM public.brand_distributors bd
   WHERE bd.brand_id = NEW.brand_partner_id
     AND bd.country_code = NEW.country
     AND bd.is_active = true
   ORDER BY
     bd.is_exclusive DESC NULLS LAST,   -- exclusive first
     bd.priority ASC NULLS LAST         -- lowest priority number wins
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

-- ── Trigger: fire after insert on project_briefs ────────────────────────────

DROP TRIGGER IF EXISTS trg_auto_route_brief ON public.project_briefs;
CREATE TRIGGER trg_auto_route_brief
  AFTER INSERT ON public.project_briefs
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_route_brief();
