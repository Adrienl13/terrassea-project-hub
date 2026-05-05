-- ============================================================================
-- ROLLBACK FILE for RLS refactor migration (Dette 10)
-- Generated 2026-05-05 from production DB state (project gwgcfgeouropcighpztj)
--
-- USAGE
-- If the inline-helpers refactor introduces a bug in production, execute this
-- entire file via Supabase SQL editor or psql to restore the previous state.
--
-- STEPS
-- 1. (Re)CREATE the 2 helper functions (idempotent CREATE OR REPLACE)
-- 2. DROP all 12 refactored policies (the inline ones)
-- 3. CREATE the original 12 policies (calling helpers)
--
-- Order matters: functions FIRST so policies can reference them.
-- ============================================================================

-- ============================================================================
-- STEP 1: Original helper functions (CREATE OR REPLACE = safe replay)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_brand_member(check_brand_id uuid, check_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.brand_users
    WHERE brand_id = check_brand_id
      AND user_id = check_user_id
      AND role IN ('owner', 'editor')
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_brand_owner(check_brand_id uuid, check_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.brand_users
    WHERE brand_id = check_brand_id
      AND user_id = check_user_id
      AND role = 'owner'
  );
$function$;

-- Permissions (anon EXECUTE was restored by hotfix 12790b6)
GRANT EXECUTE ON FUNCTION public.is_brand_member(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_brand_owner(uuid, uuid) TO anon;

-- ============================================================================
-- STEP 2: DROP refactored policies (the ones added by the inline migration)
-- ============================================================================

DROP POLICY IF EXISTS products_select_combined ON public.products;
DROP POLICY IF EXISTS products_insert_combined ON public.products;
DROP POLICY IF EXISTS products_update_combined ON public.products;
DROP POLICY IF EXISTS products_delete_combined ON public.products;

DROP POLICY IF EXISTS variants_select_combined ON public.product_variants;
DROP POLICY IF EXISTS variants_insert_combined ON public.product_variants;
DROP POLICY IF EXISTS variants_update_combined ON public.product_variants;
DROP POLICY IF EXISTS variants_delete_combined ON public.product_variants;

DROP POLICY IF EXISTS product_media_select_combined ON public.product_media;
DROP POLICY IF EXISTS product_media_insert_combined ON public.product_media;
DROP POLICY IF EXISTS product_media_update_combined ON public.product_media;
DROP POLICY IF EXISTS product_media_delete_combined ON public.product_media;

-- ============================================================================
-- STEP 3: Restore original 12 policies (calling helpers)
-- ============================================================================

-- ── products (4 policies) ──────────────────────────────────────────────────

CREATE POLICY products_select_combined ON public.products
AS PERMISSIVE FOR SELECT TO public
USING (
  ((publish_status = 'published'::text) AND (COALESCE(availability_type, ''::text) <> 'discontinued'::text))
  OR ((owner_brand_id IS NOT NULL) AND is_brand_member(owner_brand_id, (SELECT auth.uid() AS uid)))
  OR is_admin()
);

CREATE POLICY products_insert_combined ON public.products
AS PERMISSIVE FOR INSERT TO public
WITH CHECK (
  (((owner_brand_id IS NOT NULL) AND is_brand_member(owner_brand_id, (SELECT auth.uid() AS uid))) OR is_admin())
);

CREATE POLICY products_update_combined ON public.products
AS PERMISSIVE FOR UPDATE TO public
USING (
  (((owner_brand_id IS NOT NULL) AND is_brand_member(owner_brand_id, (SELECT auth.uid() AS uid))) OR is_admin())
)
WITH CHECK (
  (((owner_brand_id IS NOT NULL) AND is_brand_member(owner_brand_id, (SELECT auth.uid() AS uid))) OR is_admin())
);

CREATE POLICY products_delete_combined ON public.products
AS PERMISSIVE FOR DELETE TO public
USING (
  (((owner_brand_id IS NOT NULL) AND is_brand_owner(owner_brand_id, (SELECT auth.uid() AS uid))) OR is_admin())
);

-- ── product_variants (4 policies) ──────────────────────────────────────────

CREATE POLICY variants_select_combined ON public.product_variants
AS PERMISSIVE FOR SELECT TO public
USING (
  (is_published = true)
  OR (EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = product_variants.product_id
      AND p.publish_status = 'published'::text
      AND COALESCE(p.availability_type, ''::text) <> 'discontinued'::text
  ))
  OR (EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = product_variants.product_id
      AND p.owner_brand_id IS NOT NULL
      AND is_brand_member(p.owner_brand_id, (SELECT auth.uid() AS uid))
  ))
  OR is_admin()
);

CREATE POLICY variants_insert_combined ON public.product_variants
AS PERMISSIVE FOR INSERT TO public
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = product_variants.product_id
      AND p.owner_brand_id IS NOT NULL
      AND is_brand_member(p.owner_brand_id, (SELECT auth.uid() AS uid))
  ))
  OR is_admin()
);

CREATE POLICY variants_update_combined ON public.product_variants
AS PERMISSIVE FOR UPDATE TO public
USING (
  (EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = product_variants.product_id
      AND p.owner_brand_id IS NOT NULL
      AND is_brand_member(p.owner_brand_id, (SELECT auth.uid() AS uid))
  ))
  OR is_admin()
)
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = product_variants.product_id
      AND p.owner_brand_id IS NOT NULL
      AND is_brand_member(p.owner_brand_id, (SELECT auth.uid() AS uid))
  ))
  OR is_admin()
);

CREATE POLICY variants_delete_combined ON public.product_variants
AS PERMISSIVE FOR DELETE TO public
USING (
  (EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = product_variants.product_id
      AND p.owner_brand_id IS NOT NULL
      AND is_brand_owner(p.owner_brand_id, (SELECT auth.uid() AS uid))
  ))
  OR is_admin()
);

-- ── product_media (4 policies) ─────────────────────────────────────────────

CREATE POLICY product_media_select_combined ON public.product_media
AS PERMISSIVE FOR SELECT TO public
USING (
  ((product_id IS NOT NULL) AND (EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = product_media.product_id
      AND p.publish_status = 'published'::text
      AND COALESCE(p.availability_type, ''::text) <> 'discontinued'::text
  )))
  OR ((variant_id IS NOT NULL) AND (EXISTS (
    SELECT 1 FROM product_variants v JOIN products p ON p.id = v.product_id
    WHERE v.id = product_media.variant_id
      AND (v.is_published = true OR p.publish_status = 'published'::text)
      AND COALESCE(p.availability_type, ''::text) <> 'discontinued'::text
  )))
  OR ((product_id IS NOT NULL) AND (EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = product_media.product_id
      AND p.owner_brand_id IS NOT NULL
      AND is_brand_member(p.owner_brand_id, (SELECT auth.uid() AS uid))
  )))
  OR ((variant_id IS NOT NULL) AND (EXISTS (
    SELECT 1 FROM product_variants v JOIN products p ON p.id = v.product_id
    WHERE v.id = product_media.variant_id
      AND p.owner_brand_id IS NOT NULL
      AND is_brand_member(p.owner_brand_id, (SELECT auth.uid() AS uid))
  )))
  OR is_admin()
);

CREATE POLICY product_media_insert_combined ON public.product_media
AS PERMISSIVE FOR INSERT TO public
WITH CHECK (
  ((product_id IS NOT NULL) AND (EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = product_media.product_id
      AND p.owner_brand_id IS NOT NULL
      AND is_brand_member(p.owner_brand_id, (SELECT auth.uid() AS uid))
  )))
  OR ((variant_id IS NOT NULL) AND (EXISTS (
    SELECT 1 FROM product_variants v JOIN products p ON p.id = v.product_id
    WHERE v.id = product_media.variant_id
      AND p.owner_brand_id IS NOT NULL
      AND is_brand_member(p.owner_brand_id, (SELECT auth.uid() AS uid))
  )))
  OR is_admin()
);

CREATE POLICY product_media_update_combined ON public.product_media
AS PERMISSIVE FOR UPDATE TO public
USING (
  ((product_id IS NOT NULL) AND (EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = product_media.product_id
      AND p.owner_brand_id IS NOT NULL
      AND is_brand_member(p.owner_brand_id, (SELECT auth.uid() AS uid))
  )))
  OR ((variant_id IS NOT NULL) AND (EXISTS (
    SELECT 1 FROM product_variants v JOIN products p ON p.id = v.product_id
    WHERE v.id = product_media.variant_id
      AND p.owner_brand_id IS NOT NULL
      AND is_brand_member(p.owner_brand_id, (SELECT auth.uid() AS uid))
  )))
  OR is_admin()
)
WITH CHECK (
  ((product_id IS NOT NULL) AND (EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = product_media.product_id
      AND p.owner_brand_id IS NOT NULL
      AND is_brand_member(p.owner_brand_id, (SELECT auth.uid() AS uid))
  )))
  OR ((variant_id IS NOT NULL) AND (EXISTS (
    SELECT 1 FROM product_variants v JOIN products p ON p.id = v.product_id
    WHERE v.id = product_media.variant_id
      AND p.owner_brand_id IS NOT NULL
      AND is_brand_member(p.owner_brand_id, (SELECT auth.uid() AS uid))
  )))
  OR is_admin()
);

CREATE POLICY product_media_delete_combined ON public.product_media
AS PERMISSIVE FOR DELETE TO public
USING (
  ((product_id IS NOT NULL) AND (EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = product_media.product_id
      AND p.owner_brand_id IS NOT NULL
      AND is_brand_owner(p.owner_brand_id, (SELECT auth.uid() AS uid))
  )))
  OR ((variant_id IS NOT NULL) AND (EXISTS (
    SELECT 1 FROM product_variants v JOIN products p ON p.id = v.product_id
    WHERE v.id = product_media.variant_id
      AND p.owner_brand_id IS NOT NULL
      AND is_brand_owner(p.owner_brand_id, (SELECT auth.uid() AS uid))
  )))
  OR is_admin()
);

-- ============================================================================
-- END ROLLBACK FILE
-- ============================================================================
