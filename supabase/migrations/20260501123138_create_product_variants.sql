-- Phase 1 Modèle B variants — Migration 4 : product_variants (D-PV-1)
-- Réf : docs/strategy/PRODUCT_DATA_VISION.md §4.2
--      docs/chantiers/2026-05/PLAN_MODELE_B_VARIANTS.md §2 Migration 3
-- Création 2026-05-01.
--
-- Cœur du chantier Modèle B : table product_variants représentant les
-- déclinaisons commercialisables d'un modèle. ~30 colonnes structurelles
-- + tracabilité IA (preparation Phase 2 ingestion).
--
-- En fin de migration : ALTER TABLE product_media pour ajouter la FK
-- variant_id → product_variants(id).

CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,

  -- Identifiants commerciaux
  sku text,
  variant_name text,

  -- Dimensions
  width_cm numeric(6,1),
  depth_cm numeric(6,1),
  height_cm numeric(6,1),
  diameter_cm numeric(6,1),
  shape text CHECK (shape IS NULL OR shape IN ('round', 'square', 'rectangle', 'oval', 'asymmetric', 'modular')),
  weight_kg numeric(6,2),

  -- Tissu / matériau (FK vers material_brands seedée en migration 2)
  material_brand_id uuid REFERENCES public.material_brands(id) ON DELETE SET NULL,
  fabric_color_slug text REFERENCES public.colors_canonical(slug) ON DELETE SET NULL,
  fabric_color_label_i18n jsonb,
  fabric_color_hex text CHECK (fabric_color_hex IS NULL OR fabric_color_hex ~ '^#[0-9A-Fa-f]{6}$'),

  -- Structure / finition cadre
  frame_finish_slug text REFERENCES public.finishes_canonical(slug) ON DELETE SET NULL,
  frame_finish_label_i18n jsonb,

  -- Configuration spécifique
  configuration_module text,
  subdivision text CHECK (subdivision IS NULL OR subdivision IN ('counter', 'bar', 'tall', 'unknown')),

  -- Options et features (overrides du modèle parent, NULL = hérite)
  has_armrests boolean,
  has_wheels boolean DEFAULT false,
  has_cushion boolean DEFAULT false,
  is_stackable boolean DEFAULT false,

  -- Pricing & disponibilité
  price_eur numeric(10,2) CHECK (price_eur IS NULL OR price_eur >= 0),
  price_currency text NOT NULL DEFAULT 'EUR' REFERENCES public.markets(code) ON DELETE SET DEFAULT,
  in_stock boolean NOT NULL DEFAULT false,
  stock_quantity int CHECK (stock_quantity IS NULL OR stock_quantity >= 0),
  delivery_weeks_min int CHECK (delivery_weeks_min IS NULL OR delivery_weeks_min >= 0),
  delivery_weeks_max int CHECK (delivery_weeks_max IS NULL OR (delivery_weeks_min IS NULL OR delivery_weeks_max >= delivery_weeks_min)),
  is_made_to_order boolean NOT NULL DEFAULT false,

  -- Disponibilité géographique (validation app-side via markets.code Phase 1)
  available_in_markets text[],

  -- Médias (FK vers product_media créée en migration 3)
  primary_media_id uuid REFERENCES public.product_media(id) ON DELETE SET NULL,

  -- Traçabilité (data lineage — préparation Phase 2 ingestion IA)
  source_type text CHECK (source_type IS NULL OR source_type IN ('pim', 'pdf-extraction', 'web-scraping', 'csv-import', 'manual')),
  source_url text,
  extracted_at timestamptz,
  validated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  validated_at timestamptz,
  confidence_score numeric(3,2) CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),

  -- Méta
  is_published boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  discontinued_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Une seule variante "default" par product (cf. migration 7 backfill)
CREATE UNIQUE INDEX product_variants_one_default_per_product
  ON public.product_variants(product_id) WHERE is_default = true;

-- SKU unique per product (un même SKU peut exister chez des marques différentes,
-- mais pas en double sur le même modèle) — relaxé en Phase 2 si besoin
CREATE UNIQUE INDEX product_variants_sku_per_product
  ON public.product_variants(product_id, sku) WHERE sku IS NOT NULL;

-- Indexes recommandés (vision §4.2)
CREATE INDEX idx_variants_product_id ON public.product_variants(product_id);
CREATE INDEX idx_variants_dimension ON public.product_variants(width_cm, depth_cm) WHERE width_cm IS NOT NULL;
CREATE INDEX idx_variants_material_brand ON public.product_variants(material_brand_id) WHERE material_brand_id IS NOT NULL;
CREATE INDEX idx_variants_fabric_color ON public.product_variants(fabric_color_slug) WHERE fabric_color_slug IS NOT NULL;
CREATE INDEX idx_variants_finish ON public.product_variants(frame_finish_slug) WHERE frame_finish_slug IS NOT NULL;
CREATE INDEX idx_variants_price ON public.product_variants(price_eur) WHERE price_eur IS NOT NULL;
CREATE INDEX idx_variants_published ON public.product_variants(is_published) WHERE is_published = true;
CREATE INDEX idx_variants_in_stock ON public.product_variants(in_stock) WHERE in_stock = true;
CREATE INDEX idx_variants_currency ON public.product_variants(price_currency);
CREATE INDEX idx_variants_primary_media ON public.product_variants(primary_media_id) WHERE primary_media_id IS NOT NULL;
CREATE INDEX idx_variants_validated_by ON public.product_variants(validated_by) WHERE validated_by IS NOT NULL;

CREATE TRIGGER product_variants_set_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- RLS multi-tenant — héritage du parent products.partner_id en attendant
-- l'introduction d'owner_brand_id (ÉTAPE 6 du chantier).
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- SELECT : variant publiée OU parent publié OU propriétaire OU admin
CREATE POLICY variants_select_self_or_parent_published ON public.product_variants
  FOR SELECT USING (
    is_published = true
    OR EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_variants.product_id
        AND p.publish_status = 'published'
    )
  );

CREATE POLICY variants_select_owner ON public.product_variants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.partners pa ON pa.id = p.partner_id
      WHERE p.id = product_variants.product_id
        AND pa.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY variants_select_admin ON public.product_variants
  FOR SELECT USING (public.is_admin());

-- INSERT/UPDATE/DELETE : propriétaire OU admin
CREATE POLICY variants_write_owner ON public.product_variants
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.partners pa ON pa.id = p.partner_id
      WHERE p.id = product_variants.product_id
        AND pa.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.partners pa ON pa.id = p.partner_id
      WHERE p.id = product_variants.product_id
        AND pa.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY variants_write_admin ON public.product_variants
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- ALTER product_media : ajout de la FK variant_id (migration 3 → 4)
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.product_media
  ADD CONSTRAINT product_media_variant_id_fkey
  FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;

-- Policies product_media pour les médias rattachés à une variante
-- Pattern aligné avec product_variants policies ci-dessus
CREATE POLICY product_media_select_variant_parent_published ON public.product_media
  FOR SELECT USING (
    variant_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.product_variants v
      JOIN public.products p ON p.id = v.product_id
      WHERE v.id = product_media.variant_id
        AND (v.is_published = true OR p.publish_status = 'published')
    )
  );

CREATE POLICY product_media_select_variant_owner ON public.product_media
  FOR SELECT USING (
    variant_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.product_variants v
      JOIN public.products p ON p.id = v.product_id
      JOIN public.partners pa ON pa.id = p.partner_id
      WHERE v.id = product_media.variant_id
        AND pa.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY product_media_write_variant_owner ON public.product_media
  FOR ALL
  USING (
    variant_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.product_variants v
      JOIN public.products p ON p.id = v.product_id
      JOIN public.partners pa ON pa.id = p.partner_id
      WHERE v.id = product_media.variant_id
        AND pa.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    variant_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.product_variants v
      JOIN public.products p ON p.id = v.product_id
      JOIN public.partners pa ON pa.id = p.partner_id
      WHERE v.id = product_media.variant_id
        AND pa.user_id = (SELECT auth.uid())
    )
  );

COMMENT ON TABLE public.product_variants IS
  'Déclinaisons commercialisables d''un modèle (product). 1 product = N variants. D-PV-1, vision §4.2.';
COMMENT ON COLUMN public.product_variants.is_default IS
  'TRUE pour la variante affichée par défaut sur la fiche publique. Une seule par product (unique partial index).';
COMMENT ON COLUMN public.product_variants.weight_kg IS
  'Override variant. NULL = hérite du products.weight_kg parent.';
COMMENT ON COLUMN public.product_variants.has_armrests IS
  'Override variant. NULL = hérite du products.has_armrests parent (ajouté en ÉTAPE 5).';
COMMENT ON COLUMN public.product_variants.available_in_markets IS
  'Codes marchés depuis markets.code (validation app-side Phase 1).';
