-- ============================================================================
-- Migration: Brand Collections & Project Briefs
-- Adds missing columns for brand partner mode, collections, and briefs system
-- ============================================================================

-- ── 1. Partners: add brand-related columns ──────────────────────────────────

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS partner_mode text DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS hero_image_url text,
  ADD COLUMN IF NOT EXISTS certifications text[],
  ADD COLUMN IF NOT EXISTS specialties text[];

COMMENT ON COLUMN public.partners.partner_mode IS 'standard | brand_member | brand_network';

-- ── 2. Product Offers: add collection & pricing columns ─────────────────────

ALTER TABLE public.product_offers
  ADD COLUMN IF NOT EXISTS collection_name text,
  ADD COLUMN IF NOT EXISTS pricing_mode text DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

COMMENT ON COLUMN public.product_offers.pricing_mode IS 'public | on_request';
COMMENT ON COLUMN public.product_offers.collection_name IS 'Brand collection grouping name';

-- Index for fast collection lookups
CREATE INDEX IF NOT EXISTS idx_product_offers_collection
  ON public.product_offers (partner_id, collection_name)
  WHERE collection_name IS NOT NULL AND is_active = true;

-- ── 3. Project Briefs table ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.project_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  client_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  routed_to_partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,

  -- Step 1: Establishment
  establishment_type text,
  stars_or_class text,
  capacity integer,
  country text,

  -- Step 2: Project
  collections_interest text[],
  quantity_estimate integer,
  budget_range text,
  timeline text,
  project_type text,

  -- Step 3: Contact
  first_name text,
  last_name text,
  email text,
  company text,
  siren text,
  message text,

  -- Qualification
  qualification_score integer DEFAULT 0,
  status text DEFAULT 'pending_review',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.project_briefs IS 'Qualified project briefs submitted to brand partners';
COMMENT ON COLUMN public.project_briefs.status IS 'pending_review | qualified | accepted | declined | rejected | routed';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_briefs_brand
  ON public.project_briefs (brand_partner_id, status);

CREATE INDEX IF NOT EXISTS idx_project_briefs_routed
  ON public.project_briefs (routed_to_partner_id)
  WHERE routed_to_partner_id IS NOT NULL;

-- ── 4. RLS for project_briefs ───────────────────────────────────────────────

ALTER TABLE public.project_briefs ENABLE ROW LEVEL SECURITY;

-- Brand partners can read their own briefs
CREATE POLICY "Brand partners can read own briefs"
  ON public.project_briefs FOR SELECT
  USING (
    brand_partner_id IN (
      SELECT id FROM public.partners WHERE user_id = auth.uid()
    )
    OR
    routed_to_partner_id IN (
      SELECT id FROM public.partners WHERE user_id = auth.uid()
    )
  );

-- Brand partners can update status of their own briefs
CREATE POLICY "Brand partners can update own briefs"
  ON public.project_briefs FOR UPDATE
  USING (
    brand_partner_id IN (
      SELECT id FROM public.partners WHERE user_id = auth.uid()
    )
  );

-- Authenticated users can submit briefs
CREATE POLICY "Authenticated users can insert briefs"
  ON public.project_briefs FOR INSERT
  WITH CHECK (true);

-- Admins can do everything
CREATE POLICY "Admins full access to briefs"
  ON public.project_briefs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- ── 5. Auto-update updated_at trigger ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_project_briefs_updated_at
  BEFORE UPDATE ON public.project_briefs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_product_offers_updated_at
  BEFORE UPDATE ON public.product_offers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
