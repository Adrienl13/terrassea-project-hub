-- ============================================================================
-- Create product_certifications table — product-level certifications with PV
-- ÉTAPE 8d-4 Migration C (2026-05-05).
--
-- REASON
-- Product-level certifications (M1 Fire Class, EN 16139, EN 581, OEKO-TEX,
-- Cradle-to-Cradle when product-tested) require a unique procès-verbal (PV)
-- per individual product, with optional pv_number, lab_name, valid_until,
-- and pv_document_url metadata.
--
-- RLS PATTERN (cohérent avec Dette 10 — inline EXISTS, no helper functions)
-- - SELECT : public (certifications are public-facing)
-- - INSERT/UPDATE : brand_member of products.owner_brand_id OR admin
-- - DELETE : brand_owner of products.owner_brand_id only OR admin (stricter)
-- ============================================================================

CREATE TABLE public.product_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  certification_id uuid NOT NULL REFERENCES public.certifications(id),
  pv_number text,
  lab_name text,
  issued_at date,
  valid_until date,
  pv_document_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, certification_id)
);

-- ── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX idx_product_certifications_product
  ON public.product_certifications(product_id);
CREATE INDEX idx_product_certifications_certification
  ON public.product_certifications(certification_id);

-- ── Trigger updated_at ─────────────────────────────────────────────────────
CREATE TRIGGER tr_product_certifications_updated_at
  BEFORE UPDATE ON public.product_certifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── Enable RLS ─────────────────────────────────────────────────────────────
ALTER TABLE public.product_certifications ENABLE ROW LEVEL SECURITY;

-- ── RLS policies (inline EXISTS via products.owner_brand_id) ───────────────

CREATE POLICY product_certifications_select_public ON public.product_certifications
  AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY product_certifications_insert ON public.product_certifications
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_certifications.product_id
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

CREATE POLICY product_certifications_update ON public.product_certifications
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_certifications.product_id
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
      WHERE p.id = product_certifications.product_id
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

CREATE POLICY product_certifications_delete ON public.product_certifications
  AS PERMISSIVE FOR DELETE TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_certifications.product_id
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

-- ── Comments ───────────────────────────────────────────────────────────────
COMMENT ON TABLE public.product_certifications IS
  'Product-level certifications with unique PV/test report (e.g., M1 Fire Class, EN 16139). Each entry typically has a unique pv_number issued by an accredited laboratory.';
COMMENT ON COLUMN public.product_certifications.pv_number IS
  'Procès-verbal (test report) reference number from accredited laboratory.';
COMMENT ON COLUMN public.product_certifications.lab_name IS
  'Name of the accredited laboratory that issued the test report (e.g., LNE, FCBA, CSTB).';
COMMENT ON COLUMN public.product_certifications.valid_until IS
  'PV expiration date. Critical for safety commission validation.';

-- ── Validation embarquée ───────────────────────────────────────────────────

DO $$
DECLARE
  table_exists boolean;
  index_count integer;
  policy_count integer;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'product_certifications' AND schemaname = 'public'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'Table product_certifications was not created';
  END IF;

  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'product_certifications' AND schemaname = 'public';

  IF index_count < 4 THEN
    RAISE EXCEPTION 'Expected at least 4 indexes (PK + 2 named + UNIQUE) on product_certifications, got %', index_count;
  END IF;

  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'product_certifications' AND schemaname = 'public';

  IF policy_count <> 4 THEN
    RAISE EXCEPTION 'Expected 4 RLS policies on product_certifications, got %', policy_count;
  END IF;

  RAISE NOTICE 'OK: product_certifications created with % indexes and % RLS policies', index_count, policy_count;
END $$;
