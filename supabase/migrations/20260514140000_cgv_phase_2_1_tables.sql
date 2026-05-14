-- ============================================================================
-- CGV Phase 2.1 — Schema DB pour gestion versionnée Terrassea Terms,
-- Partner CGV, et journal d'acceptations immuable.
--
-- Date : 2026-05-14
-- Compagnon : docs/strategy/CGV_STRATEGY.md §5 Phase 2
-- Draft reviewable : docs/chantiers/2026-05/PHASE_2_CGV_MIGRATION_DRAFT.md
-- Décisions founder : 7/7 Q ouvertes validées (cf. session journal 2026-05-14)
-- Pré-requis : Dette 101 (partners.deleted_at) appliquée juste avant.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------
-- TABLE 1 : terrassea_terms
-- Métadonnées versioning du cadre maître Terrassea. Fichiers FR + EN
-- vivent dans legal/ (git-tracked, source of truth via git_commit_sha).
-- ---------------------------------------------------------------
CREATE TABLE public.terrassea_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version int NOT NULL,
  title text NOT NULL,
  legal_review_status text NOT NULL CHECK (legal_review_status IN ('draft','self_validated','lawyer_validated','deprecated')),
  git_commit_sha text NOT NULL CHECK (char_length(git_commit_sha) = 40),
  fr_source_path text NOT NULL,
  en_source_path text,
  fr_sha256 text NOT NULL CHECK (char_length(fr_sha256) = 64),
  en_sha256 text CHECK (en_sha256 IS NULL OR char_length(en_sha256) = 64),
  published_at timestamptz NOT NULL,
  supersedes_version int,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,

  CONSTRAINT terrassea_terms_version_unique UNIQUE (version),
  CONSTRAINT terrassea_terms_supersedes_valid CHECK (supersedes_version IS NULL OR supersedes_version < version),
  CONSTRAINT terrassea_terms_en_consistency CHECK (
    (en_source_path IS NULL AND en_sha256 IS NULL)
    OR (en_source_path IS NOT NULL AND en_sha256 IS NOT NULL)
  )
);

CREATE INDEX idx_terrassea_terms_published
  ON public.terrassea_terms(published_at DESC)
  WHERE legal_review_status IN ('self_validated','lawyer_validated');

COMMENT ON TABLE public.terrassea_terms IS
  'Métadonnées versioning du cadre maître Terrassea (master Terms). FR = autoritaire, EN = informationnel. Source of truth = git (legal/, identifié par git_commit_sha). DB stocke uniquement métadonnées + sha256 pour vérification d''intégrité. Pattern Q1 founder validé 2026-05-14.';

-- ---------------------------------------------------------------
-- TABLE 2 : partner_cgv
-- Historique versionné des CGV de chaque marque. PDF only en MVP (Dette 100).
-- Fichiers stockés dans bucket Storage 'partner-cgv'.
-- ---------------------------------------------------------------
CREATE TABLE public.partner_cgv (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  version int NOT NULL,
  title text NOT NULL,
  storage_path text NOT NULL,
  mime_type text NOT NULL DEFAULT 'application/pdf' CHECK (mime_type = 'application/pdf'),
  sha256 text NOT NULL CHECK (char_length(sha256) = 64),
  byte_size int NOT NULL CHECK (byte_size > 0 AND byte_size <= 25 * 1024 * 1024),
  status text NOT NULL CHECK (status IN ('draft','active','archived')),
  effective_date date NOT NULL,
  archived_at timestamptz,
  archived_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  archive_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,

  CONSTRAINT partner_cgv_version_unique UNIQUE (partner_id, version),
  CONSTRAINT partner_cgv_archive_consistency CHECK (
    (status = 'archived' AND archived_at IS NOT NULL)
    OR (status <> 'archived' AND archived_at IS NULL)
  )
);

-- Un seul 'active' à la fois par partner (contrainte métier)
CREATE UNIQUE INDEX idx_partner_cgv_one_active_per_partner
  ON public.partner_cgv(partner_id)
  WHERE status = 'active';

CREATE INDEX idx_partner_cgv_partner_status
  ON public.partner_cgv(partner_id, status);

CREATE INDEX idx_partner_cgv_effective_date
  ON public.partner_cgv(partner_id, effective_date DESC);

COMMENT ON TABLE public.partner_cgv IS
  'Historique versionné des CGV par marque. PDF only en MVP (Dette 100 = conversion DOCX→PDF différée). Chemin Storage dans bucket partner-cgv, format {partner_id}/v{N}.pdf. sha256 immuabilise les snapshots.';

-- ---------------------------------------------------------------
-- TABLE 3 : partner_cgv_metadata
-- Cache dénormalisé de l'état courant par partner. Maintenu via trigger.
-- ---------------------------------------------------------------
CREATE TABLE public.partner_cgv_metadata (
  partner_id uuid PRIMARY KEY REFERENCES public.partners(id) ON DELETE CASCADE,
  current_cgv_id uuid REFERENCES public.partner_cgv(id) ON DELETE RESTRICT,
  current_version int,
  needs_renewal boolean NOT NULL DEFAULT false,
  renewal_reason text,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  admin_reviewed_at timestamptz,
  admin_reviewed_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,

  CONSTRAINT partner_cgv_metadata_current_consistency CHECK (
    (current_cgv_id IS NULL AND current_version IS NULL)
    OR (current_cgv_id IS NOT NULL AND current_version IS NOT NULL)
  )
);

CREATE INDEX idx_partner_cgv_metadata_needs_renewal
  ON public.partner_cgv_metadata(partner_id)
  WHERE needs_renewal = true;

COMMENT ON TABLE public.partner_cgv_metadata IS
  'Cache dénormalisé de la CGV active courante par partner. Maintenu automatiquement par trigger sync_partner_cgv_metadata. Mutations directes interdites côté client (RLS).';

-- ---------------------------------------------------------------
-- TABLE 4 : cgv_acceptances
-- Journal d'audit immuable. UPDATE/DELETE révoqués. IP + UA captés serveur.
-- ---------------------------------------------------------------
CREATE TABLE public.cgv_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  acceptance_type text NOT NULL CHECK (acceptance_type IN ('terrassea_terms','partner_cgv')),
  terrassea_terms_id uuid REFERENCES public.terrassea_terms(id) ON DELETE RESTRICT,
  partner_cgv_id uuid REFERENCES public.partner_cgv(id) ON DELETE RESTRICT,
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  ip_address inet NOT NULL,
  user_agent text NOT NULL,
  context text NOT NULL CHECK (context IN ('signup','quote_signature','order_placement','partner_onboarding','manual')),
  context_reference_id uuid,
  accepted_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT cgv_acceptances_target_consistency CHECK (
    (acceptance_type = 'terrassea_terms' AND terrassea_terms_id IS NOT NULL AND partner_cgv_id IS NULL)
    OR
    (acceptance_type = 'partner_cgv' AND partner_cgv_id IS NOT NULL AND terrassea_terms_id IS NULL)
  )
);

CREATE INDEX idx_cgv_acceptances_user
  ON public.cgv_acceptances(user_id, accepted_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX idx_cgv_acceptances_partner
  ON public.cgv_acceptances(partner_id, accepted_at DESC)
  WHERE partner_id IS NOT NULL;

CREATE INDEX idx_cgv_acceptances_terrassea_terms
  ON public.cgv_acceptances(terrassea_terms_id)
  WHERE terrassea_terms_id IS NOT NULL;

CREATE INDEX idx_cgv_acceptances_partner_cgv
  ON public.cgv_acceptances(partner_cgv_id)
  WHERE partner_cgv_id IS NOT NULL;

CREATE INDEX idx_cgv_acceptances_context_ref
  ON public.cgv_acceptances(context, context_reference_id)
  WHERE context_reference_id IS NOT NULL;

COMMENT ON TABLE public.cgv_acceptances IS
  'Journal d''audit immuable des acceptations CGV. UPDATE/DELETE révoqués (REVOKE plus bas). IP + user_agent captés serveur via RPC record_cgv_acceptance (SECURITY DEFINER + search_path hardened) pour bloquer le spoofing client. user_id en SET NULL pour conformité RGPD droit à l''oubli — acceptance preserved as anonymized audit trail (obligation L.123-22 Code commerce + DSA). Décision Q4 founder 2026-05-14. Mécanisme anonymisation fine = Dette 102 si >100 demandes/an.';

-- ---------------------------------------------------------------
-- TRIGGER : sync_partner_cgv_metadata
-- Pattern hardened : SECURITY DEFINER + search_path unquoted.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_partner_cgv_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_partner_id uuid;
  v_active_id uuid;
  v_active_version int;
BEGIN
  v_partner_id := COALESCE(NEW.partner_id, OLD.partner_id);

  -- Au plus une 'active' par partner (contrainte unique partielle garantit)
  SELECT id, version
  INTO v_active_id, v_active_version
  FROM public.partner_cgv
  WHERE partner_id = v_partner_id AND status = 'active'
  LIMIT 1;

  INSERT INTO public.partner_cgv_metadata (
    partner_id, current_cgv_id, current_version, last_updated_at
  )
  VALUES (
    v_partner_id, v_active_id, v_active_version, now()
  )
  ON CONFLICT (partner_id) DO UPDATE
    SET current_cgv_id = EXCLUDED.current_cgv_id,
        current_version = EXCLUDED.current_version,
        last_updated_at = now();

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_partner_cgv_sync_metadata
  AFTER INSERT OR UPDATE OF status OR DELETE
  ON public.partner_cgv
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_partner_cgv_metadata();

COMMENT ON FUNCTION public.sync_partner_cgv_metadata IS
  'Trigger SECURITY DEFINER maintenant partner_cgv_metadata. Pattern search_path hardened (Bug #1 / Dette 75 / Dette 74).';

-- ---------------------------------------------------------------
-- RPC : record_cgv_acceptance — SEULE voie d'INSERT
-- Pattern hardened : SECURITY DEFINER + search_path unquoted.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_cgv_acceptance(
  p_acceptance_type text,
  p_context text,
  p_terrassea_terms_id uuid DEFAULT NULL,
  p_partner_cgv_id uuid DEFAULT NULL,
  p_context_reference_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_ip inet;
  v_ua text;
  v_partner_id uuid;
  v_id uuid;
  v_headers jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to record CGV acceptance';
  END IF;

  -- Extraction IP + UA via PostgREST request.headers
  BEGIN
    v_headers := current_setting('request.headers', true)::jsonb;
  EXCEPTION WHEN OTHERS THEN
    v_headers := '{}'::jsonb;
  END;

  -- x-forwarded-for peut contenir une liste séparée par virgule — prendre la première
  v_ip := COALESCE(
    NULLIF(split_part(v_headers ->> 'x-forwarded-for', ',', 1), '')::inet,
    inet '0.0.0.0'
  );
  v_ua := COALESCE(NULLIF(v_headers ->> 'user-agent', ''), 'unknown');

  -- Dérive partner_id depuis partner_cgv si pertinent
  IF p_partner_cgv_id IS NOT NULL THEN
    SELECT partner_id INTO v_partner_id
    FROM public.partner_cgv
    WHERE id = p_partner_cgv_id;

    IF v_partner_id IS NULL THEN
      RAISE EXCEPTION 'partner_cgv_id % not found', p_partner_cgv_id;
    END IF;
  END IF;

  INSERT INTO public.cgv_acceptances (
    user_id, acceptance_type,
    terrassea_terms_id, partner_cgv_id, partner_id,
    ip_address, user_agent,
    context, context_reference_id
  ) VALUES (
    v_user_id, p_acceptance_type,
    p_terrassea_terms_id, p_partner_cgv_id, v_partner_id,
    v_ip, v_ua,
    p_context, p_context_reference_id
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_cgv_acceptance(text, text, uuid, uuid, uuid) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.record_cgv_acceptance(text, text, uuid, uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.record_cgv_acceptance IS
  'Point d''entrée unique pour enregistrer une acceptation CGV. Capte IP + UA serveur via request.headers PostgREST (anti-spoof client). Pattern SECURITY DEFINER + search_path hardened.';

-- ---------------------------------------------------------------
-- RLS — enable + policies
-- ---------------------------------------------------------------
ALTER TABLE public.terrassea_terms      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_cgv          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_cgv_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cgv_acceptances      ENABLE ROW LEVEL SECURITY;

-- ----- terrassea_terms -----
CREATE POLICY "terrassea_terms_public_read_validated"
  ON public.terrassea_terms FOR SELECT
  TO anon, authenticated
  USING (legal_review_status IN ('self_validated','lawyer_validated'));

CREATE POLICY "terrassea_terms_admin_all"
  ON public.terrassea_terms FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----- partner_cgv -----
CREATE POLICY "partner_cgv_public_read_active"
  ON public.partner_cgv FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

CREATE POLICY "partner_cgv_owner_read_all_own"
  ON public.partner_cgv FOR SELECT
  TO authenticated
  USING (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

CREATE POLICY "partner_cgv_owner_insert_own"
  ON public.partner_cgv FOR INSERT
  TO authenticated
  WITH CHECK (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid() AND deleted_at IS NULL)
  );

CREATE POLICY "partner_cgv_owner_update_own"
  ON public.partner_cgv FOR UPDATE
  TO authenticated
  USING (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid() AND deleted_at IS NULL)
  )
  WITH CHECK (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid() AND deleted_at IS NULL)
  );

CREATE POLICY "partner_cgv_admin_all"
  ON public.partner_cgv FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----- partner_cgv_metadata -----
CREATE POLICY "partner_cgv_metadata_public_read"
  ON public.partner_cgv_metadata FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "partner_cgv_metadata_admin_all"
  ON public.partner_cgv_metadata FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----- cgv_acceptances -----
-- SELECT-only policies. INSERT/UPDATE/DELETE révoqués → seul le RPC peut écrire.
CREATE POLICY "cgv_acceptances_user_read_own"
  ON public.cgv_acceptances FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "cgv_acceptances_partner_read_own"
  ON public.cgv_acceptances FOR SELECT
  TO authenticated
  USING (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

CREATE POLICY "cgv_acceptances_admin_read_all"
  ON public.cgv_acceptances FOR SELECT
  TO authenticated
  USING (public.is_admin());

REVOKE INSERT, UPDATE, DELETE ON public.cgv_acceptances FROM anon, authenticated;

-- ---------------------------------------------------------------
-- STORAGE — bucket partner-cgv (private, PDF only, 25 MB max)
-- ---------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'partner-cgv',
  'partner-cgv',
  false,
  25 * 1024 * 1024,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
  SET file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types,
      public = EXCLUDED.public;

-- Storage policies : owner peut upload + lire ses propres fichiers (subfolder = partner_id).
-- Buyer access = via signed URL générée par Edge Function (Phase 3, Dette 103 = audit).

CREATE POLICY "partner_cgv_storage_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'partner-cgv'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.partners WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "partner_cgv_storage_owner_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'partner-cgv'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.partners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "partner_cgv_storage_admin_all"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'partner-cgv' AND public.is_admin())
  WITH CHECK (bucket_id = 'partner-cgv' AND public.is_admin());

-- ---------------------------------------------------------------
-- Validation
-- ---------------------------------------------------------------
DO $$
DECLARE
  v_tables_count int;
  v_rls_count int;
BEGIN
  SELECT count(*) INTO v_tables_count
  FROM information_schema.tables
  WHERE table_schema='public'
    AND table_name IN ('terrassea_terms','partner_cgv','partner_cgv_metadata','cgv_acceptances');

  IF v_tables_count <> 4 THEN
    RAISE EXCEPTION 'CGV Phase 2.1 — expected 4 tables, found %', v_tables_count;
  END IF;

  SELECT count(*) INTO v_rls_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public'
    AND c.relname IN ('terrassea_terms','partner_cgv','partner_cgv_metadata','cgv_acceptances')
    AND c.relrowsecurity = true;

  IF v_rls_count <> 4 THEN
    RAISE EXCEPTION 'CGV Phase 2.1 — expected 4 tables with RLS enabled, found %', v_rls_count;
  END IF;

  RAISE NOTICE 'OK CGV Phase 2.1 — 4 tables + RLS + RPC + trigger + storage bucket in place';
END $$;

COMMIT;
