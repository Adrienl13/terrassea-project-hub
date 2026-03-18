
-- New columns on products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS archetype_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archetype_confidence numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS data_quality_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS color_variants jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS product_type_tags jsonb DEFAULT '{}'::jsonb;

-- Tag definitions table
CREATE TABLE IF NOT EXISTS public.tag_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_type text NOT NULL,
  slug text NOT NULL,
  label_en text NOT NULL,
  label_fr text DEFAULT NULL,
  label_it text DEFAULT NULL,
  label_es text DEFAULT NULL,
  label_de text DEFAULT NULL,
  label_nl text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tag_type, slug)
);

ALTER TABLE public.tag_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tag definitions are publicly readable"
  ON public.tag_definitions FOR SELECT
  TO public
  USING (true);
