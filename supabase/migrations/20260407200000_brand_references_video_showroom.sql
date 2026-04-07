-- Brand references (project portfolio) + video_url and showroom_address on partners

-- A. New columns on partners
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS showroom_address text;

-- B. Brand references table
CREATE TABLE IF NOT EXISTS public.brand_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  title text NOT NULL,
  location text,
  description text,
  photos text[] DEFAULT '{}',
  product_ids uuid[] DEFAULT '{}',
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_references_partner
  ON public.brand_references (partner_id) WHERE is_active = true;

CREATE TRIGGER trg_brand_references_updated_at
  BEFORE UPDATE ON public.brand_references
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- C. RLS
ALTER TABLE public.brand_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners manage own references"
  ON public.brand_references FOR ALL
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()))
  WITH CHECK (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

CREATE POLICY "Admins full access brand_references"
  ON public.brand_references FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Public read active brand_references"
  ON public.brand_references FOR SELECT
  USING (is_active = true);
