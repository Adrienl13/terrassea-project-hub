-- ============================================================
-- Add multi-location support to partners
-- Date : 2026-06-03
--
-- A brand can have several locations (e.g. Isimar: head office +
-- showrooms in different cities/countries). The single
-- country/city/showroom_address columns stay as the primary HQ;
-- `locations` holds the full list for display on the brand page.
--
-- Shape (validated app-side via zod): array of
--   { "label": text, "address": text, "city": text, "country": text }
-- ============================================================

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS locations jsonb NOT NULL DEFAULT '[]'::jsonb;
