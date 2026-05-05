-- ============================================================================
-- DETTE 10 — Inline brand helpers in RLS policies
-- Date: 2026-05-05
--
-- REASON
-- Helpers is_brand_member / is_brand_owner caused prod incident 2026-05-01
-- (REVOKE EXECUTE FROM anon → 401 on products/variants/media). Hotfix
-- 12790b6 restored EXECUTE as patch. This migration eliminates the helper
-- dependency by inlining the EXISTS logic directly in 12 RLS policies
-- (4 CRUD × 3 tables : products, product_variants, product_media).
--
-- Helper functions are KEPT for now (DROP planned in 1-2 weeks after
-- prod stability observation, per founder decision).
--
-- ROLLBACK
-- docs/incidents/2026-05-05-rls-refactor-rollback.sql
--
-- PATTERNS
-- - Pattern A : is_brand_member(b, u) →
--     EXISTS (SELECT 1 FROM brand_users
--             WHERE brand_id = b AND user_id = u
--               AND role IN ('owner', 'editor'))
-- - Pattern B : is_brand_owner(b, u) →
--     EXISTS (SELECT 1 FROM brand_users
--             WHERE brand_id = b AND user_id = u
--               AND role = 'owner')
--
-- All policies are PERMISSIVE TO public (anon + authenticated) — preserved
-- exactly as before the refactor.
-- ============================================================================

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ TABLE products (4 policies)                                              │
-- └──────────────────────────────────────────────────────────────────────────┘

DROP POLICY IF EXISTS products_select_combined ON public.products;
CREATE POLICY products_select_combined ON public.products
AS PERMISSIVE FOR SELECT TO public
USING (
  ((publish_status = 'published'::text) AND (COALESCE(availability_type, ''::text) <> 'discontinued'::text))
  OR (
    (owner_brand_id IS NOT NULL)
    AND EXISTS (
      SELECT 1 FROM public.brand_users
      WHERE brand_id = products.owner_brand_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'editor')
    )
  )
  OR is_admin()
);

DROP POLICY IF EXISTS products_insert_combined ON public.products;
CREATE POLICY products_insert_combined ON public.products
AS PERMISSIVE FOR INSERT TO public
WITH CHECK (
  (
    (owner_brand_id IS NOT NULL)
    AND EXISTS (
      SELECT 1 FROM public.brand_users
      WHERE brand_id = products.owner_brand_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'editor')
    )
  )
  OR is_admin()
);

DROP POLICY IF EXISTS products_update_combined ON public.products;
CREATE POLICY products_update_combined ON public.products
AS PERMISSIVE FOR UPDATE TO public
USING (
  (
    (owner_brand_id IS NOT NULL)
    AND EXISTS (
      SELECT 1 FROM public.brand_users
      WHERE brand_id = products.owner_brand_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'editor')
    )
  )
  OR is_admin()
)
WITH CHECK (
  (
    (owner_brand_id IS NOT NULL)
    AND EXISTS (
      SELECT 1 FROM public.brand_users
      WHERE brand_id = products.owner_brand_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'editor')
    )
  )
  OR is_admin()
);

DROP POLICY IF EXISTS products_delete_combined ON public.products;
CREATE POLICY products_delete_combined ON public.products
AS PERMISSIVE FOR DELETE TO public
USING (
  (
    (owner_brand_id IS NOT NULL)
    AND EXISTS (
      SELECT 1 FROM public.brand_users
      WHERE brand_id = products.owner_brand_id
        AND user_id = (SELECT auth.uid())
        AND role = 'owner'
    )
  )
  OR is_admin()
);

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ TABLE product_variants (4 policies)                                      │
-- │ Policies join products via EXISTS, then check brand membership inline    │
-- └──────────────────────────────────────────────────────────────────────────┘

DROP POLICY IF EXISTS variants_select_combined ON public.product_variants;
CREATE POLICY variants_select_combined ON public.product_variants
AS PERMISSIVE FOR SELECT TO public
USING (
  (is_published = true)
  OR EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_variants.product_id
      AND p.publish_status = 'published'::text
      AND COALESCE(p.availability_type, ''::text) <> 'discontinued'::text
  )
  OR EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_variants.product_id
      AND p.owner_brand_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.brand_users
        WHERE brand_id = p.owner_brand_id
          AND user_id = (SELECT auth.uid())
          AND role IN ('owner', 'editor')
      )
  )
  OR is_admin()
);

DROP POLICY IF EXISTS variants_insert_combined ON public.product_variants;
CREATE POLICY variants_insert_combined ON public.product_variants
AS PERMISSIVE FOR INSERT TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_variants.product_id
      AND p.owner_brand_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.brand_users
        WHERE brand_id = p.owner_brand_id
          AND user_id = (SELECT auth.uid())
          AND role IN ('owner', 'editor')
      )
  )
  OR is_admin()
);

DROP POLICY IF EXISTS variants_update_combined ON public.product_variants;
CREATE POLICY variants_update_combined ON public.product_variants
AS PERMISSIVE FOR UPDATE TO public
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_variants.product_id
      AND p.owner_brand_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.brand_users
        WHERE brand_id = p.owner_brand_id
          AND user_id = (SELECT auth.uid())
          AND role IN ('owner', 'editor')
      )
  )
  OR is_admin()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_variants.product_id
      AND p.owner_brand_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.brand_users
        WHERE brand_id = p.owner_brand_id
          AND user_id = (SELECT auth.uid())
          AND role IN ('owner', 'editor')
      )
  )
  OR is_admin()
);

DROP POLICY IF EXISTS variants_delete_combined ON public.product_variants;
CREATE POLICY variants_delete_combined ON public.product_variants
AS PERMISSIVE FOR DELETE TO public
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_variants.product_id
      AND p.owner_brand_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.brand_users
        WHERE brand_id = p.owner_brand_id
          AND user_id = (SELECT auth.uid())
          AND role = 'owner'
      )
  )
  OR is_admin()
);

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ TABLE product_media (4 policies)                                         │
-- │ Each policy has 2 paths: via product_id OR via variant_id (which JOINs   │
-- │ products through product_variants). Brand check inlined in both paths.   │
-- └──────────────────────────────────────────────────────────────────────────┘

DROP POLICY IF EXISTS product_media_select_combined ON public.product_media;
CREATE POLICY product_media_select_combined ON public.product_media
AS PERMISSIVE FOR SELECT TO public
USING (
  -- Branch 1: published via product
  (
    (product_id IS NOT NULL)
    AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_media.product_id
        AND p.publish_status = 'published'::text
        AND COALESCE(p.availability_type, ''::text) <> 'discontinued'::text
    )
  )
  -- Branch 2: published via variant
  OR (
    (variant_id IS NOT NULL)
    AND EXISTS (
      SELECT 1
      FROM public.product_variants v
      JOIN public.products p ON p.id = v.product_id
      WHERE v.id = product_media.variant_id
        AND (v.is_published = true OR p.publish_status = 'published'::text)
        AND COALESCE(p.availability_type, ''::text) <> 'discontinued'::text
    )
  )
  -- Branch 3: brand_member via product (Pattern A inline)
  OR (
    (product_id IS NOT NULL)
    AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_media.product_id
        AND p.owner_brand_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.brand_users
          WHERE brand_id = p.owner_brand_id
            AND user_id = (SELECT auth.uid())
            AND role IN ('owner', 'editor')
        )
    )
  )
  -- Branch 4: brand_member via variant (Pattern A inline)
  OR (
    (variant_id IS NOT NULL)
    AND EXISTS (
      SELECT 1
      FROM public.product_variants v
      JOIN public.products p ON p.id = v.product_id
      WHERE v.id = product_media.variant_id
        AND p.owner_brand_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.brand_users
          WHERE brand_id = p.owner_brand_id
            AND user_id = (SELECT auth.uid())
            AND role IN ('owner', 'editor')
        )
    )
  )
  -- Branch 5: admin
  OR is_admin()
);

DROP POLICY IF EXISTS product_media_insert_combined ON public.product_media;
CREATE POLICY product_media_insert_combined ON public.product_media
AS PERMISSIVE FOR INSERT TO public
WITH CHECK (
  -- Branch 1: brand_member via product (Pattern A inline)
  (
    (product_id IS NOT NULL)
    AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_media.product_id
        AND p.owner_brand_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.brand_users
          WHERE brand_id = p.owner_brand_id
            AND user_id = (SELECT auth.uid())
            AND role IN ('owner', 'editor')
        )
    )
  )
  -- Branch 2: brand_member via variant (Pattern A inline)
  OR (
    (variant_id IS NOT NULL)
    AND EXISTS (
      SELECT 1
      FROM public.product_variants v
      JOIN public.products p ON p.id = v.product_id
      WHERE v.id = product_media.variant_id
        AND p.owner_brand_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.brand_users
          WHERE brand_id = p.owner_brand_id
            AND user_id = (SELECT auth.uid())
            AND role IN ('owner', 'editor')
        )
    )
  )
  -- Branch 3: admin
  OR is_admin()
);

DROP POLICY IF EXISTS product_media_update_combined ON public.product_media;
CREATE POLICY product_media_update_combined ON public.product_media
AS PERMISSIVE FOR UPDATE TO public
USING (
  (
    (product_id IS NOT NULL)
    AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_media.product_id
        AND p.owner_brand_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.brand_users
          WHERE brand_id = p.owner_brand_id
            AND user_id = (SELECT auth.uid())
            AND role IN ('owner', 'editor')
        )
    )
  )
  OR (
    (variant_id IS NOT NULL)
    AND EXISTS (
      SELECT 1
      FROM public.product_variants v
      JOIN public.products p ON p.id = v.product_id
      WHERE v.id = product_media.variant_id
        AND p.owner_brand_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.brand_users
          WHERE brand_id = p.owner_brand_id
            AND user_id = (SELECT auth.uid())
            AND role IN ('owner', 'editor')
        )
    )
  )
  OR is_admin()
)
WITH CHECK (
  (
    (product_id IS NOT NULL)
    AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_media.product_id
        AND p.owner_brand_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.brand_users
          WHERE brand_id = p.owner_brand_id
            AND user_id = (SELECT auth.uid())
            AND role IN ('owner', 'editor')
        )
    )
  )
  OR (
    (variant_id IS NOT NULL)
    AND EXISTS (
      SELECT 1
      FROM public.product_variants v
      JOIN public.products p ON p.id = v.product_id
      WHERE v.id = product_media.variant_id
        AND p.owner_brand_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.brand_users
          WHERE brand_id = p.owner_brand_id
            AND user_id = (SELECT auth.uid())
            AND role IN ('owner', 'editor')
        )
    )
  )
  OR is_admin()
);

DROP POLICY IF EXISTS product_media_delete_combined ON public.product_media;
CREATE POLICY product_media_delete_combined ON public.product_media
AS PERMISSIVE FOR DELETE TO public
USING (
  (
    (product_id IS NOT NULL)
    AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_media.product_id
        AND p.owner_brand_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.brand_users
          WHERE brand_id = p.owner_brand_id
            AND user_id = (SELECT auth.uid())
            AND role = 'owner'
        )
    )
  )
  OR (
    (variant_id IS NOT NULL)
    AND EXISTS (
      SELECT 1
      FROM public.product_variants v
      JOIN public.products p ON p.id = v.product_id
      WHERE v.id = product_media.variant_id
        AND p.owner_brand_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.brand_users
          WHERE brand_id = p.owner_brand_id
            AND user_id = (SELECT auth.uid())
            AND role = 'owner'
        )
    )
  )
  OR is_admin()
);

-- ============================================================================
-- VALIDATION EMBARQUÉE
-- ============================================================================

DO $$
DECLARE
  policy_count integer;
  expected_count integer := 12;
  remaining_helper_refs integer;
BEGIN
  -- Vérification 1 : 12 policies sur les 3 tables
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename IN ('products', 'product_variants', 'product_media');

  IF policy_count <> expected_count THEN
    RAISE EXCEPTION 'Expected % policies on (products, product_variants, product_media) after refactor, got %',
      expected_count, policy_count;
  END IF;

  -- Vérification 2 : aucune policy ne référence les helpers
  SELECT COUNT(*) INTO remaining_helper_refs
  FROM pg_policies
  WHERE tablename IN ('products', 'product_variants', 'product_media')
    AND (
      qual LIKE '%is_brand_member%'
      OR qual LIKE '%is_brand_owner%'
      OR with_check LIKE '%is_brand_member%'
      OR with_check LIKE '%is_brand_owner%'
    );

  IF remaining_helper_refs > 0 THEN
    RAISE EXCEPTION 'Refactor incomplete: % policies still reference is_brand_member/is_brand_owner',
      remaining_helper_refs;
  END IF;

  RAISE NOTICE 'OK: % policies refactored inline, no helper references remain', policy_count;
END $$;

-- ============================================================================
-- NOTE: helper functions is_brand_member and is_brand_owner are
-- INTENTIONALLY KEPT for now. They will be dropped in a follow-up migration
-- after 1-2 weeks of prod stability observation.
-- ============================================================================
