-- ============================================================================
-- BRAND ADMIN: Feature toggles + Product views tracking
-- Backfilled from supabase/migrations/20260327100000_*.sql (drift recovery 2026-05-23).
--
-- HISTORY: original migration 20260327100000 was in the repo but never applied
-- to prod, causing AdminBrandManagement.tsx feature-toggle UPDATEs to fail
-- silently for ~6 weeks. Detected during the founding-program admin work on
-- 2026-05-23. Re-applied with the perf-friendly (SELECT auth.uid()) pattern.
-- The follow-up 20260523145821 hardens the product_views INSERT RLS.
-- ============================================================================

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS brand_features jsonb DEFAULT '{
    "brand_page_enabled": true,
    "brief_inbox_enabled": true,
    "collection_manager_enabled": true,
    "network_dashboard_enabled": true,
    "api_sync_enabled": false,
    "featured_products_enabled": false,
    "analytics_export_enabled": false
  }'::jsonb;

COMMENT ON COLUMN public.partners.brand_features IS
  'Feature toggles for brand partners. Admin can enable/disable capabilities per brand.';

CREATE TABLE IF NOT EXISTS public.product_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  source text DEFAULT 'catalog',
  country_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_views_product
  ON public.product_views (product_id);

CREATE INDEX IF NOT EXISTS idx_product_views_partner
  ON public.product_views (partner_id);

CREATE INDEX IF NOT EXISTS idx_product_views_created
  ON public.product_views (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_views_product_date
  ON public.product_views (product_id, created_at DESC);

COMMENT ON TABLE public.product_views IS
  'Tracks individual product page views for brand analytics. Each row = one view event.';

ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert product views"
  ON public.product_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Partners can read own product views"
  ON public.product_views FOR SELECT
  USING (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = (SELECT auth.uid()))
  );

CREATE POLICY "Admins full access to product_views"
  ON public.product_views FOR ALL
  USING (public.is_admin());
