-- Phase 1 Modèle B variants — Migration 8 plan / ÉTAPE 5.3 chantier
-- Remplacement des RLS de transition (basées sur products.partner_id) par des
-- RLS multi-tenant propres basées sur products.owner_brand_id + brand_users
-- via les helpers SECURITY DEFINER is_brand_member / is_brand_owner.
--
-- Réf : docs/strategy/PRODUCT_DATA_VISION.md §8.6 (D-PV-7)
--      docs/chantiers/2026-05/PLAN_MODELE_B_VARIANTS.md §2 Migration 8
--      docs/chantiers/2026-05/PLAN_MODELE_B_VARIANTS.md §3 décisions
-- Création 2026-05-01.
--
-- STRATÉGIE
-- DROP+CREATE dans la même migration → transaction Postgres atomique → 0 fenêtre
-- d'accès non protégé.
--
-- DESIGN PATTERN "COMBINED OR" : 1 policy par commande × table, combinant
-- (public read si applicable) OR (brand member) OR (admin) via expressions OR
-- internes plutôt que multiples policies permissives empilées. Réduit le
-- compteur multiple_permissive_policies de l'advisor (cf. CLAUDE.md §7).
--
-- BEHAVIORAL CHANGE (signalé)
-- La policy legacy "Authenticated users can read products" laissait voir les
-- drafts à n'importe quel authenticated user. Le nouveau modèle restreint les
-- drafts aux brand members + admins uniquement (cohérence multi-tenant).
--
-- DELETE STRICT
-- Seul role='owner' peut DELETE sur products/variants/media (pas 'editor').
-- Utilise is_brand_owner() au lieu de is_brand_member().

-- ════════════════════════════════════════════════════════════════════════
-- 1. PRODUCTS — drop des 8 legacy policies + create 4 combined policies
-- ════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Admins manage all products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Partners can insert own products" ON public.products;
DROP POLICY IF EXISTS "Partners can read own products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can read products" ON public.products;
DROP POLICY IF EXISTS "Public can read published products" ON public.products;

-- SELECT : public (publié non discontinué) OU brand member OU admin
CREATE POLICY products_select_combined ON public.products
  FOR SELECT USING (
    (publish_status = 'published' AND COALESCE(availability_type, '') <> 'discontinued')
    OR (owner_brand_id IS NOT NULL AND public.is_brand_member(owner_brand_id, (SELECT auth.uid())))
    OR public.is_admin()
  );

-- INSERT : brand member OU admin
CREATE POLICY products_insert_combined ON public.products
  FOR INSERT WITH CHECK (
    (owner_brand_id IS NOT NULL AND public.is_brand_member(owner_brand_id, (SELECT auth.uid())))
    OR public.is_admin()
  );

-- UPDATE : brand member OU admin (USING + WITH CHECK même expression)
CREATE POLICY products_update_combined ON public.products
  FOR UPDATE
  USING (
    (owner_brand_id IS NOT NULL AND public.is_brand_member(owner_brand_id, (SELECT auth.uid())))
    OR public.is_admin()
  )
  WITH CHECK (
    (owner_brand_id IS NOT NULL AND public.is_brand_member(owner_brand_id, (SELECT auth.uid())))
    OR public.is_admin()
  );

-- DELETE strict : brand OWNER (pas editor) OU admin
CREATE POLICY products_delete_combined ON public.products
  FOR DELETE USING (
    (owner_brand_id IS NOT NULL AND public.is_brand_owner(owner_brand_id, (SELECT auth.uid())))
    OR public.is_admin()
  );

-- ════════════════════════════════════════════════════════════════════════
-- 2. PRODUCT_VARIANTS — drop des 5 legacy policies + create 4 combined
-- ════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS variants_write_admin ON public.product_variants;
DROP POLICY IF EXISTS variants_write_owner ON public.product_variants;
DROP POLICY IF EXISTS variants_select_admin ON public.product_variants;
DROP POLICY IF EXISTS variants_select_owner ON public.product_variants;
DROP POLICY IF EXISTS variants_select_self_or_parent_published ON public.product_variants;

-- SELECT : variant publiée OU parent product publié OU brand member OU admin
CREATE POLICY variants_select_combined ON public.product_variants
  FOR SELECT USING (
    (is_published = true)
    OR EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_variants.product_id
        AND p.publish_status = 'published'
        AND COALESCE(p.availability_type, '') <> 'discontinued'
    )
    OR EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_variants.product_id
        AND p.owner_brand_id IS NOT NULL
        AND public.is_brand_member(p.owner_brand_id, (SELECT auth.uid()))
    )
    OR public.is_admin()
  );

-- INSERT : brand member du parent product OU admin
CREATE POLICY variants_insert_combined ON public.product_variants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_variants.product_id
        AND p.owner_brand_id IS NOT NULL
        AND public.is_brand_member(p.owner_brand_id, (SELECT auth.uid()))
    )
    OR public.is_admin()
  );

-- UPDATE : brand member du parent product OU admin
CREATE POLICY variants_update_combined ON public.product_variants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_variants.product_id
        AND p.owner_brand_id IS NOT NULL
        AND public.is_brand_member(p.owner_brand_id, (SELECT auth.uid()))
    )
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_variants.product_id
        AND p.owner_brand_id IS NOT NULL
        AND public.is_brand_member(p.owner_brand_id, (SELECT auth.uid()))
    )
    OR public.is_admin()
  );

-- DELETE strict : brand OWNER du parent product OU admin
CREATE POLICY variants_delete_combined ON public.product_variants
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_variants.product_id
        AND p.owner_brand_id IS NOT NULL
        AND public.is_brand_owner(p.owner_brand_id, (SELECT auth.uid()))
    )
    OR public.is_admin()
  );

-- ════════════════════════════════════════════════════════════════════════
-- 3. PRODUCT_MEDIA — drop des 8 legacy policies + create 4 combined
-- Le XOR product_id/variant_id est traité dans chaque policy via OR interne.
-- ════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS product_media_write_admin ON public.product_media;
DROP POLICY IF EXISTS product_media_write_owner ON public.product_media;
DROP POLICY IF EXISTS product_media_write_variant_owner ON public.product_media;
DROP POLICY IF EXISTS product_media_select_admin ON public.product_media;
DROP POLICY IF EXISTS product_media_select_owner ON public.product_media;
DROP POLICY IF EXISTS product_media_select_parent_published ON public.product_media;
DROP POLICY IF EXISTS product_media_select_variant_owner ON public.product_media;
DROP POLICY IF EXISTS product_media_select_variant_parent_published ON public.product_media;

-- SELECT : (parent product/variant publié) OU brand member OU admin
CREATE POLICY product_media_select_combined ON public.product_media
  FOR SELECT USING (
    -- Médias modèle : parent product publié
    (product_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_media.product_id
        AND p.publish_status = 'published'
        AND COALESCE(p.availability_type, '') <> 'discontinued'
    ))
    -- Médias variante : variant ou parent product publié
    OR (variant_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.product_variants v
      JOIN public.products p ON p.id = v.product_id
      WHERE v.id = product_media.variant_id
        AND (v.is_published = true OR p.publish_status = 'published')
        AND COALESCE(p.availability_type, '') <> 'discontinued'
    ))
    -- Brand member (médias modèle)
    OR (product_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_media.product_id
        AND p.owner_brand_id IS NOT NULL
        AND public.is_brand_member(p.owner_brand_id, (SELECT auth.uid()))
    ))
    -- Brand member (médias variante)
    OR (variant_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.product_variants v
      JOIN public.products p ON p.id = v.product_id
      WHERE v.id = product_media.variant_id
        AND p.owner_brand_id IS NOT NULL
        AND public.is_brand_member(p.owner_brand_id, (SELECT auth.uid()))
    ))
    OR public.is_admin()
  );

-- INSERT : brand member (modèle ou variant) OU admin
CREATE POLICY product_media_insert_combined ON public.product_media
  FOR INSERT WITH CHECK (
    (product_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_media.product_id
        AND p.owner_brand_id IS NOT NULL
        AND public.is_brand_member(p.owner_brand_id, (SELECT auth.uid()))
    ))
    OR (variant_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.product_variants v
      JOIN public.products p ON p.id = v.product_id
      WHERE v.id = product_media.variant_id
        AND p.owner_brand_id IS NOT NULL
        AND public.is_brand_member(p.owner_brand_id, (SELECT auth.uid()))
    ))
    OR public.is_admin()
  );

-- UPDATE : brand member (modèle ou variant) OU admin
CREATE POLICY product_media_update_combined ON public.product_media
  FOR UPDATE
  USING (
    (product_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_media.product_id
        AND p.owner_brand_id IS NOT NULL
        AND public.is_brand_member(p.owner_brand_id, (SELECT auth.uid()))
    ))
    OR (variant_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.product_variants v
      JOIN public.products p ON p.id = v.product_id
      WHERE v.id = product_media.variant_id
        AND p.owner_brand_id IS NOT NULL
        AND public.is_brand_member(p.owner_brand_id, (SELECT auth.uid()))
    ))
    OR public.is_admin()
  )
  WITH CHECK (
    (product_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_media.product_id
        AND p.owner_brand_id IS NOT NULL
        AND public.is_brand_member(p.owner_brand_id, (SELECT auth.uid()))
    ))
    OR (variant_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.product_variants v
      JOIN public.products p ON p.id = v.product_id
      WHERE v.id = product_media.variant_id
        AND p.owner_brand_id IS NOT NULL
        AND public.is_brand_member(p.owner_brand_id, (SELECT auth.uid()))
    ))
    OR public.is_admin()
  );

-- DELETE strict : brand OWNER (modèle ou variant) OU admin
CREATE POLICY product_media_delete_combined ON public.product_media
  FOR DELETE USING (
    (product_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_media.product_id
        AND p.owner_brand_id IS NOT NULL
        AND public.is_brand_owner(p.owner_brand_id, (SELECT auth.uid()))
    ))
    OR (variant_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.product_variants v
      JOIN public.products p ON p.id = v.product_id
      WHERE v.id = product_media.variant_id
        AND p.owner_brand_id IS NOT NULL
        AND public.is_brand_owner(p.owner_brand_id, (SELECT auth.uid()))
    ))
    OR public.is_admin()
  );

-- ════════════════════════════════════════════════════════════════════════
-- Validation post-replacement
-- ════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  products_policies int;
  variants_policies int;
  media_policies int;
BEGIN
  SELECT COUNT(*) INTO products_policies FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'products';
  SELECT COUNT(*) INTO variants_policies FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'product_variants';
  SELECT COUNT(*) INTO media_policies FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'product_media';

  IF products_policies != 4 THEN
    RAISE EXCEPTION 'Expected 4 policies on products, got %', products_policies;
  END IF;
  IF variants_policies != 4 THEN
    RAISE EXCEPTION 'Expected 4 policies on product_variants, got %', variants_policies;
  END IF;
  IF media_policies != 4 THEN
    RAISE EXCEPTION 'Expected 4 policies on product_media, got %', media_policies;
  END IF;

  RAISE NOTICE 'RLS replaced: products=% variants=% media=% (12 total combined policies)', products_policies, variants_policies, media_policies;
END $$;
