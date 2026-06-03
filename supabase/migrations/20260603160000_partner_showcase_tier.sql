-- ============================================================
-- Partner showcase tier — editorial curation level
-- Date : 2026-06-03
--
-- Decouples a partner's PUBLIC prestige presentation from its commercial
-- role (partner_type) and its quote-routing membership (partner_mode):
--   - 'signature'   → "Maison signature" : established design houses, full
--                     editorial treatment, top of the /collections page.
--   - 'manufacture' → "Manufacture partenaire" : manufacturers / emerging
--                     houses, curated, product-led, shown below the maisons.
--
-- 100% manual curation: the founder sets this per partner in the admin.
-- A partner is in the showcase iff partner_mode is a brand mode (unchanged);
-- showcase_tier only drives how it is PRESENTED, never whether it appears.
-- ============================================================

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS showcase_tier text NOT NULL DEFAULT 'manufacture';

ALTER TABLE public.partners
  DROP CONSTRAINT IF EXISTS partners_showcase_tier_check;
ALTER TABLE public.partners
  ADD CONSTRAINT partners_showcase_tier_check
  CHECK (showcase_tier IN ('signature', 'manufacture'));

-- Seed: the existing showcased brand(s) (Isimar) is a recognised maison.
UPDATE public.partners
SET showcase_tier = 'signature'
WHERE partner_mode IN ('brand_member', 'brand_network');
