-- ============================================================
-- Brand collections — enrich + real product link
-- Date : 2026-06-02
--
-- brand_collections gains designer / year / gallery (product photos)
-- / environment photos. Products get a real FK relation to a
-- collection (collection_id) so existing products can be linked
-- without duplication (replaces the fragile text-name matching that
-- also left metadata-only collections invisible on the brand page).
-- ============================================================

ALTER TABLE public.brand_collections
  ADD COLUMN IF NOT EXISTS designer text,
  ADD COLUMN IF NOT EXISTS year integer,
  ADD COLUMN IF NOT EXISTS gallery_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS environment_urls text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.brand_collections
  DROP CONSTRAINT IF EXISTS brand_collections_year_check;
ALTER TABLE public.brand_collections
  ADD CONSTRAINT brand_collections_year_check CHECK (year IS NULL OR (year >= 1900 AND year <= 2100));

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS collection_id uuid REFERENCES public.brand_collections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_collection_id ON public.products(collection_id);
