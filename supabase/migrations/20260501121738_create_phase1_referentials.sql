-- Phase 1 Modèle B variants — Migration 1 : 5 tables référentielles canoniques
-- Réf : docs/strategy/PRODUCT_DATA_VISION.md §4.6 (D-PV-9, D-PV-13, D-PV-14)
--      docs/chantiers/2026-05/PLAN_MODELE_B_VARIANTS.md §2 Migration 1
-- Création 2026-05-01.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. material_brands : marques transversales (tissus, bois, métaux, composites)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE public.material_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('fabric', 'wood', 'metal', 'composite', 'other')),
  parent_company text,
  description_i18n jsonb,
  logo_url text,
  official_website text,
  is_premium boolean NOT NULL DEFAULT false,
  is_proprietary boolean NOT NULL DEFAULT false,
  parent_brand_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT material_brands_proprietary_has_parent
    CHECK (is_proprietary = false OR parent_brand_id IS NOT NULL)
);

CREATE INDEX idx_material_brands_category ON public.material_brands(category);
CREATE INDEX idx_material_brands_parent_brand_id
  ON public.material_brands(parent_brand_id) WHERE parent_brand_id IS NOT NULL;

CREATE TRIGGER material_brands_set_updated_at
  BEFORE UPDATE ON public.material_brands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- 2. certifications : labels environnementaux/qualité/sécurité/origine
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE public.certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('environmental', 'quality', 'safety', 'origin', 'other')),
  description_i18n jsonb,
  logo_url text,
  official_website text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_certifications_category ON public.certifications(category);

CREATE TRIGGER certifications_set_updated_at
  BEFORE UPDATE ON public.certifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- 3. material_brand_certifications : table N-N (Q2 reco A validée)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE public.material_brand_certifications (
  material_brand_id uuid NOT NULL REFERENCES public.material_brands(id) ON DELETE CASCADE,
  certification_id uuid NOT NULL REFERENCES public.certifications(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (material_brand_id, certification_id)
);

CREATE INDEX idx_material_brand_certifications_cert
  ON public.material_brand_certifications(certification_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. colors_canonical : ~50 couleurs avec hex + i18n
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE public.colors_canonical (
  slug text PRIMARY KEY,
  label_i18n jsonb NOT NULL,
  hex text NOT NULL CHECK (hex ~ '^#[0-9A-Fa-f]{6}$'),
  family text CHECK (family IN ('neutral', 'warm', 'cool', 'earth', 'jewel', 'pastel', 'metallic', 'wood', 'other')),
  display_order int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_colors_canonical_family ON public.colors_canonical(family) WHERE is_active = true;
CREATE INDEX idx_colors_canonical_display_order ON public.colors_canonical(display_order) WHERE is_active = true;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. finishes_canonical : ~30 finitions par matière
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE public.finishes_canonical (
  slug text PRIMARY KEY,
  label_i18n jsonb NOT NULL,
  category text CHECK (category IN ('wood', 'metal', 'fabric', 'composite', 'other')),
  display_order int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_finishes_canonical_category ON public.finishes_canonical(category) WHERE is_active = true;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. markets : 8 marchés Phase 1 (EU + 6 pays + US)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE public.markets (
  code text PRIMARY KEY,
  label_i18n jsonb NOT NULL,
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  is_active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- RLS : pattern uniforme — SELECT public, INSERT/UPDATE/DELETE admin only
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.material_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_brand_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colors_canonical ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finishes_canonical ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;

-- material_brands
CREATE POLICY material_brands_select_public ON public.material_brands
  FOR SELECT USING (true);
CREATE POLICY material_brands_admin_write ON public.material_brands
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- certifications
CREATE POLICY certifications_select_public ON public.certifications
  FOR SELECT USING (true);
CREATE POLICY certifications_admin_write ON public.certifications
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- material_brand_certifications
CREATE POLICY material_brand_certifications_select_public ON public.material_brand_certifications
  FOR SELECT USING (true);
CREATE POLICY material_brand_certifications_admin_write ON public.material_brand_certifications
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- colors_canonical
CREATE POLICY colors_canonical_select_public ON public.colors_canonical
  FOR SELECT USING (true);
CREATE POLICY colors_canonical_admin_write ON public.colors_canonical
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- finishes_canonical
CREATE POLICY finishes_canonical_select_public ON public.finishes_canonical
  FOR SELECT USING (true);
CREATE POLICY finishes_canonical_admin_write ON public.finishes_canonical
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- markets
CREATE POLICY markets_select_public ON public.markets
  FOR SELECT USING (true);
CREATE POLICY markets_admin_write ON public.markets
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- Commentaires de documentation
-- ─────────────────────────────────────────────────────────────────────────
COMMENT ON TABLE public.material_brands IS
  'Marques transversales aux fabricants structures (tissus Sunbrella/Solaris/etc., bois FSC, métaux). Pattern entités partagées D-PV-13.';
COMMENT ON TABLE public.certifications IS
  'Labels environnementaux/qualité/sécurité/origine appliqués aux marques de matériaux ou aux produits.';
COMMENT ON TABLE public.material_brand_certifications IS
  'Lien N-N material_brands ↔ certifications. Q2 reco A validée (vs uuid[] dans la spec vision).';
COMMENT ON TABLE public.colors_canonical IS
  'Référentiel canonique de ~50 couleurs (hex + i18n + family). Source pour fabric_color_slug et frame_finish_slug indirectement.';
COMMENT ON TABLE public.finishes_canonical IS
  'Référentiel canonique de ~30 finitions par catégorie de matière.';
COMMENT ON TABLE public.markets IS
  'Marchés cibles Phase 1 (EU + 6 pays + US). Sert de référentiel pour available_in_markets[] sur product_variants.';
COMMENT ON COLUMN public.material_brands.parent_brand_id IS
  'Référence partners(id) si is_proprietary=true (ex: Tribùcord → partner Tribù). NULL pour marques généralistes.';
