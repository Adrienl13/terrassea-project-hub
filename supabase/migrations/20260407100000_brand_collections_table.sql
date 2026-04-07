-- Brand Collections: metadata table for brand collection management
-- Collections link to product_offers via collection_name (string), not FK

CREATE TABLE IF NOT EXISTS public.brand_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  cover_image_url text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (partner_id, name)
);

CREATE INDEX IF NOT EXISTS idx_brand_collections_partner
  ON public.brand_collections (partner_id) WHERE is_active = true;

-- Auto-update timestamp
CREATE TRIGGER trg_brand_collections_updated_at
  BEFORE UPDATE ON public.brand_collections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.brand_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners manage own collections"
  ON public.brand_collections FOR ALL
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()))
  WITH CHECK (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

CREATE POLICY "Admins full access brand_collections"
  ON public.brand_collections FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Public read active brand_collections"
  ON public.brand_collections FOR SELECT
  USING (is_active = true);
