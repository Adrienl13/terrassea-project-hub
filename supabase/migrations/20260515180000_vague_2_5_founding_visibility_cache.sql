-- ============================================================================
-- Vague 2.5 — Founding Visibility Boost (Dette 114)
-- Date : 2026-05-15
--
-- Cache de tier + rank + total_points DIRECTEMENT sur partners pour permettre
-- des ORDER BY natifs côté PostgREST/JS, sans JOIN à founding_partner_scores
-- à chaque listing public.
--
-- Trigger AFTER INSERT/UPDATE/DELETE sur founding_actions recompute le cache
-- automatiquement. Cohérent avec sync_partner_cgv_metadata pattern.
--
-- Tier rank mapping (utilisé pour ORDER BY DESC) :
--   platinum = 4, gold = 3, silver = 2, founder = 1, non-founding = NULL
-- ============================================================================

BEGIN;

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS founding_tier text,
  ADD COLUMN IF NOT EXISTS founding_tier_rank int,
  ADD COLUMN IF NOT EXISTS founding_total_points int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_partners_founding_tier_rank
  ON public.partners(founding_tier_rank DESC NULLS LAST)
  WHERE is_founding = true;

COMMENT ON COLUMN public.partners.founding_tier IS
  'Cache du tier Founding (Vague 2.5). Maintenu par trigger sync_partner_founding_cache sur founding_actions. NULL si !is_founding.';
COMMENT ON COLUMN public.partners.founding_tier_rank IS
  'Cache du rank numérique (1-4) pour ORDER BY DESC sur les listings publics. Pattern : platinum=4, gold=3, silver=2, founder=1.';
COMMENT ON COLUMN public.partners.founding_total_points IS
  'Cache du total cumulé de points Founding. 0 par défaut.';

-- Helper IMMUTABLE pour mapping tier → rank
CREATE OR REPLACE FUNCTION public.founding_tier_to_rank(p_tier text)
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_tier
    WHEN 'platinum' THEN 4
    WHEN 'gold' THEN 3
    WHEN 'silver' THEN 2
    WHEN 'founder' THEN 1
    ELSE 0
  END;
$$;

GRANT EXECUTE ON FUNCTION public.founding_tier_to_rank(text) TO anon, authenticated;

-- Trigger AFTER founding_actions : sync cache sur partners
CREATE OR REPLACE FUNCTION public.sync_partner_founding_cache()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_partner_id uuid;
  v_total int;
  v_tier text;
  v_is_founding boolean;
BEGIN
  v_partner_id := COALESCE(NEW.partner_id, OLD.partner_id);

  SELECT is_founding INTO v_is_founding
  FROM public.partners WHERE id = v_partner_id;

  IF NOT FOUND OR NOT COALESCE(v_is_founding, false) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(SUM(points), 0)::int INTO v_total
  FROM public.founding_actions
  WHERE partner_id = v_partner_id;

  v_tier := CASE
    WHEN v_total >= 8000 THEN 'platinum'
    WHEN v_total >= 3000 THEN 'gold'
    WHEN v_total >= 1000 THEN 'silver'
    ELSE 'founder'
  END;

  UPDATE public.partners
  SET founding_tier = v_tier,
      founding_tier_rank = public.founding_tier_to_rank(v_tier),
      founding_total_points = v_total
  WHERE id = v_partner_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_partner_founding_cache() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_partner_founding_cache ON public.founding_actions;
CREATE TRIGGER trg_sync_partner_founding_cache
  AFTER INSERT OR UPDATE OR DELETE ON public.founding_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_partner_founding_cache();

-- Étendre auto_mark_founding_partner pour init le cache au moment du marquage
CREATE OR REPLACE FUNCTION public.auto_mark_founding_partner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_mode text;
BEGIN
  SELECT value::text INTO v_mode
  FROM public.platform_settings
  WHERE key = 'pricing_visibility_mode'
  LIMIT 1;

  v_mode := TRIM(BOTH '"' FROM COALESCE(v_mode, ''));

  IF v_mode = 'launch' AND NEW.is_founding IS DISTINCT FROM true THEN
    NEW.is_founding := true;
    NEW.founding_joined_at := COALESCE(NEW.founding_joined_at, now());
    -- Initial cache : 0 actions → tier='founder', rank=1
    NEW.founding_tier := 'founder';
    NEW.founding_tier_rank := 1;
    NEW.founding_total_points := 0;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.auto_mark_founding_partner() FROM PUBLIC, anon, authenticated;

-- Backfill cohorte existante depuis founding_partner_scores
UPDATE public.partners p
SET founding_total_points = COALESCE(s.total_points, 0)::int,
    founding_tier = CASE WHEN p.is_founding THEN COALESCE(s.tier, 'founder') ELSE NULL END,
    founding_tier_rank = CASE
      WHEN p.is_founding THEN public.founding_tier_to_rank(COALESCE(s.tier, 'founder'))
      ELSE NULL
    END
FROM public.founding_partner_scores s
WHERE s.partner_id = p.id;

-- Cas is_founding=true SANS row dans la view (0 actions) → set tier='founder'
UPDATE public.partners
SET founding_tier = 'founder',
    founding_tier_rank = 1,
    founding_total_points = 0
WHERE is_founding = true
  AND founding_tier IS NULL;

COMMIT;
