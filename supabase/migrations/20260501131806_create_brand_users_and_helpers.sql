-- Phase 1 Modèle B variants — Migration 9 plan / ÉTAPE 5.2 chantier
-- Création table brand_users + helpers SECURITY DEFINER + backfill initial.
-- Réf : docs/strategy/PRODUCT_DATA_VISION.md §8.6 (D-PV-7)
--      docs/chantiers/2026-05/PLAN_MODELE_B_VARIANTS.md §2 Migration 6
-- Création 2026-05-01.
--
-- CONTEXTE
-- Multi-tenant Phase 1 : un user peut être membre d'un ou plusieurs brands
-- (partners, sémantiquement "brand owner"). La table brand_users porte les
-- rôles owner/editor/viewer.
--
-- Backfill initial : 1 ligne pour le partner "Pros Import" (52 produits)
-- avec role='owner' (le seul partner détectable Phase 5.1).

-- ─────────────────────────────────────────────────────────────────────────
-- Table brand_users
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE public.brand_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (brand_id, user_id)
);

CREATE INDEX idx_brand_users_brand_id ON public.brand_users(brand_id);
CREATE INDEX idx_brand_users_user_id ON public.brand_users(user_id);
CREATE INDEX idx_brand_users_granted_by ON public.brand_users(granted_by) WHERE granted_by IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────
-- RLS sur brand_users
-- - SELECT self : user voit ses propres rows
-- - SELECT admin : admin voit tout
-- - INSERT/UPDATE/DELETE : admin only Phase 1
--   (auto-onboarding self-service prévu Phase 3)
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.brand_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY brand_users_select_self ON public.brand_users
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY brand_users_select_admin ON public.brand_users
  FOR SELECT USING (public.is_admin());

CREATE POLICY brand_users_admin_write ON public.brand_users
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- Helper SECURITY DEFINER : is_brand_member
-- Returns true si l'user a role 'owner' OU 'editor' sur le brand.
-- Utilisé par les policies de products / product_variants / product_media
-- pour SELECT (drafts) / INSERT / UPDATE.
--
-- SECURITY DEFINER : bypass RLS interne pour éviter récursion infinie
-- (les policies de products utilisent ce helper, qui sinon devrait passer
-- par les policies de brand_users → boucle).
--
-- SET search_path explicite : évite l'advisor function_search_path_mutable.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_brand_member(check_brand_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.brand_users
    WHERE brand_id = check_brand_id
      AND user_id = check_user_id
      AND role IN ('owner', 'editor')
  );
$$;

REVOKE ALL ON FUNCTION public.is_brand_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_brand_member(uuid, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.is_brand_member(uuid, uuid) IS
  'TRUE si user a role owner/editor sur brand. SECURITY DEFINER pour éviter récursion RLS. Utilisé par RLS products/variants/media.';

-- ─────────────────────────────────────────────────────────────────────────
-- Helper SECURITY DEFINER : is_brand_owner
-- Returns true UNIQUEMENT si role='owner' (DELETE / actions sensibles).
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_brand_owner(check_brand_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.brand_users
    WHERE brand_id = check_brand_id
      AND user_id = check_user_id
      AND role = 'owner'
  );
$$;

REVOKE ALL ON FUNCTION public.is_brand_owner(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_brand_owner(uuid, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.is_brand_owner(uuid, uuid) IS
  'TRUE si user a role owner sur brand (strict). Utilisé par DELETE policies.';

-- ─────────────────────────────────────────────────────────────────────────
-- Backfill brand_users : 1 ligne par partner ayant des produits + user_id
-- granted_by NULL (système, pas un admin spécifique)
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO public.brand_users (brand_id, user_id, role, granted_at, granted_by)
SELECT
  pa.id AS brand_id,
  pa.user_id,
  'owner' AS role,
  COALESCE(pa.created_at, now()),
  NULL  -- backfill système
FROM public.partners pa
WHERE pa.user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.products WHERE owner_brand_id = pa.id)
ON CONFLICT (brand_id, user_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────
-- Validation post-INSERT
-- ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  total_brand_users int;
  partners_with_products int;
  partners_with_products_and_user int;
BEGIN
  SELECT COUNT(*) INTO total_brand_users FROM public.brand_users;
  SELECT COUNT(DISTINCT pa.id) INTO partners_with_products
    FROM public.partners pa
    WHERE EXISTS (SELECT 1 FROM public.products WHERE owner_brand_id = pa.id);
  SELECT COUNT(DISTINCT pa.id) INTO partners_with_products_and_user
    FROM public.partners pa
    WHERE pa.user_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.products WHERE owner_brand_id = pa.id);

  IF total_brand_users != partners_with_products_and_user THEN
    RAISE EXCEPTION 'Expected % brand_users (1 per partner+user), got %', partners_with_products_and_user, total_brand_users;
  END IF;

  RAISE NOTICE 'brand_users created: %, partners with products: %, partners w/ user_id: %', total_brand_users, partners_with_products, partners_with_products_and_user;
END $$;
