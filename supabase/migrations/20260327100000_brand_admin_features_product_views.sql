-- ============================================================================
-- BRAND ADMIN: Feature toggles + Product views tracking
-- Date: 2026-03-27
-- Purpose: Add brand_features JSONB to partners, create product_views table
-- ============================================================================

-- ============================================================================
-- A. ADD brand_features JSONB column to partners
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

-- ============================================================================
-- B. CREATE product_views TABLE for per-product engagement tracking
-- ============================================================================

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

-- RLS
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a view (anonymous tracking)
CREATE POLICY "Anyone can insert product views"
  ON public.product_views FOR INSERT
  WITH CHECK (true);

-- Partners can read views on their own products
CREATE POLICY "Partners can read own product views"
  ON public.product_views FOR SELECT
  USING (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

-- Admins full access
CREATE POLICY "Admins full access to product_views"
  ON public.product_views FOR ALL
  USING (public.is_admin());
