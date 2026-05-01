-- Phase 1 Modèle B variants — Migration 3 : product_media (D-PV-8)
-- Réf : docs/strategy/PRODUCT_DATA_VISION.md §4.5
--      docs/chantiers/2026-05/PLAN_MODELE_B_VARIANTS.md §2 Migration 4
-- Création 2026-05-01.
--
-- product_media porte les images/vidéos/3D/documents d'un MODÈLE
-- (product_id) OU d'une VARIANTE (variant_id), pas les deux à la fois.
-- variant_id reste sans FK constraint dans cette migration : la FK est
-- ajoutée en migration 4 (create_product_variants) quand la table cible
-- existe. C'est la stratégie la plus propre pour rompre la dépendance
-- circulaire product_variants ↔ product_media.

CREATE TABLE public.product_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid,  -- FK contrainte ajoutée en migration 4

  -- XOR : exactement une des deux références doit être non-null
  CONSTRAINT product_media_one_owner CHECK (
    (product_id IS NOT NULL AND variant_id IS NULL) OR
    (product_id IS NULL AND variant_id IS NOT NULL)
  ),

  kind text NOT NULL CHECK (kind IN ('image', 'video', 'model-3d', 'document')),
  url text NOT NULL,
  alt_text_i18n jsonb,
  width_px int CHECK (width_px IS NULL OR width_px > 0),
  height_px int CHECK (height_px IS NULL OR height_px > 0),
  bytes int CHECK (bytes IS NULL OR bytes >= 0),
  display_order int NOT NULL DEFAULT 100,
  is_primary boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_product_id ON public.product_media(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_media_variant_id ON public.product_media(variant_id) WHERE variant_id IS NOT NULL;
CREATE INDEX idx_media_primary ON public.product_media(is_primary) WHERE is_primary = true;
CREATE INDEX idx_media_kind ON public.product_media(kind);

CREATE TRIGGER product_media_set_updated_at
  BEFORE UPDATE ON public.product_media
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- RLS multi-tenant — héritage du parent products.partner_id en attendant
-- l'introduction d'owner_brand_id (ÉTAPE 6).
-- Pattern : SELECT public si parent publié, write par propriétaire ou admin.
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;

-- SELECT : parent publié OU propriétaire OU admin
CREATE POLICY product_media_select_parent_published ON public.product_media
  FOR SELECT USING (
    product_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_media.product_id
        AND p.publish_status = 'published'
    )
  );

CREATE POLICY product_media_select_owner ON public.product_media
  FOR SELECT USING (
    product_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.partners pa ON pa.id = p.partner_id
      WHERE p.id = product_media.product_id
        AND pa.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY product_media_select_admin ON public.product_media
  FOR SELECT USING (public.is_admin());

-- INSERT/UPDATE/DELETE : propriétaire OU admin
CREATE POLICY product_media_write_owner ON public.product_media
  FOR ALL
  USING (
    product_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.partners pa ON pa.id = p.partner_id
      WHERE p.id = product_media.product_id
        AND pa.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    product_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.partners pa ON pa.id = p.partner_id
      WHERE p.id = product_media.product_id
        AND pa.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY product_media_write_admin ON public.product_media
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Note : les policies pour variant_id (médias rattachés à une variante)
-- seront ajoutées en migration 4 quand product_variants existe.

COMMENT ON TABLE public.product_media IS
  'Images/vidéos/3D/documents pour un MODÈLE (product_id) ou une VARIANTE (variant_id, exclusif). D-PV-8.';
COMMENT ON COLUMN public.product_media.variant_id IS
  'FK vers product_variants(id) — contrainte ajoutée en migration 20260501_create_product_variants.';
