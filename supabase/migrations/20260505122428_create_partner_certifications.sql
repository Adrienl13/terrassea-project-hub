-- ============================================================================
-- Create partner_certifications table — brand-level certifications
-- ÉTAPE 8d-4 Migration B (2026-05-05).
--
-- REASON
-- Brand-level certifications (ISO, FSC, REACH, Made-in-*) are held by the
-- partner/manufacturer and inherited by all their products at display time.
-- Stored in a dedicated table with optional certificate_number / valid_until /
-- certificate_url metadata.
--
-- SCHEMA NOTE
-- partner.id IS the brand_id in this codebase (no separate `brands` table —
-- cf. CLAUDE.md). brand_users.brand_id references partners.id directly.
-- RLS policies use partner_certifications.partner_id as the brand_id key.
--
-- RLS PATTERN (cohérent avec Dette 10 — inline EXISTS, no helper functions)
-- - SELECT : public (certifications are public-facing)
-- - INSERT/UPDATE : brand_member (owner OR editor) OR admin
-- - DELETE : brand_owner only OR admin (stricter)
-- ============================================================================

CREATE TABLE public.partner_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  certification_id uuid NOT NULL REFERENCES public.certifications(id),
  certificate_number text,
  issued_at date,
  valid_until date,
  certificate_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_id, certification_id)
);

-- ── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX idx_partner_certifications_partner
  ON public.partner_certifications(partner_id);
CREATE INDEX idx_partner_certifications_certification
  ON public.partner_certifications(certification_id);

-- ── Trigger updated_at ─────────────────────────────────────────────────────
CREATE TRIGGER tr_partner_certifications_updated_at
  BEFORE UPDATE ON public.partner_certifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── Enable RLS ─────────────────────────────────────────────────────────────
ALTER TABLE public.partner_certifications ENABLE ROW LEVEL SECURITY;

-- ── RLS policies (inline EXISTS, cohérent avec Dette 10) ───────────────────

CREATE POLICY partner_certifications_select_public ON public.partner_certifications
  AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY partner_certifications_insert ON public.partner_certifications
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.brand_users
      WHERE brand_id = partner_certifications.partner_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'editor')
    )
    OR is_admin()
  );

CREATE POLICY partner_certifications_update ON public.partner_certifications
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.brand_users
      WHERE brand_id = partner_certifications.partner_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'editor')
    )
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.brand_users
      WHERE brand_id = partner_certifications.partner_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'editor')
    )
    OR is_admin()
  );

CREATE POLICY partner_certifications_delete ON public.partner_certifications
  AS PERMISSIVE FOR DELETE TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.brand_users
      WHERE brand_id = partner_certifications.partner_id
        AND user_id = (SELECT auth.uid())
        AND role = 'owner'
    )
    OR is_admin()
  );

-- ── Comments ───────────────────────────────────────────────────────────────
COMMENT ON TABLE public.partner_certifications IS
  'Brand-level certifications held by a partner (e.g., ISO 9001, FSC). Inherited by all the partner''s products at display time.';
COMMENT ON COLUMN public.partner_certifications.certificate_number IS
  'Certificate reference number issued by the certification body.';
COMMENT ON COLUMN public.partner_certifications.valid_until IS
  'Certificate expiration date. NULL means permanent or unknown.';

-- ── Validation embarquée ───────────────────────────────────────────────────

DO $$
DECLARE
  table_exists boolean;
  index_count integer;
  policy_count integer;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'partner_certifications' AND schemaname = 'public'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'Table partner_certifications was not created';
  END IF;

  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'partner_certifications' AND schemaname = 'public';

  IF index_count < 4 THEN
    RAISE EXCEPTION 'Expected at least 4 indexes (PK + 2 named + UNIQUE) on partner_certifications, got %', index_count;
  END IF;

  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'partner_certifications' AND schemaname = 'public';

  IF policy_count <> 4 THEN
    RAISE EXCEPTION 'Expected 4 RLS policies on partner_certifications, got %', policy_count;
  END IF;

  RAISE NOTICE 'OK: partner_certifications created with % indexes and % RLS policies', index_count, policy_count;
END $$;
