-- ============================================================================
-- Catalog downloads Phase 1 — Catalogues PDF téléchargeables (lead-gated)
--
-- Date : 2026-06-04
-- Demande founder : chaque partenaire/marque peut attacher PLUSIEURS catalogues
-- PDF à sa page publique (/partners/:slug, /brands/:slug). Les visiteurs
-- intéressés laissent leur contact (lead) avant d'accéder au fichier.
--
-- Architecture :
--   - Bucket privé 'partner-catalogs' (PDF only, 25 Mo). Chemin :
--     {partner_id}/{catalog_id}.pdf. Aucune lecture publique → l'accès se fait
--     uniquement via signed URL générée par l'Edge Function catalog-download
--     (service_role), après enregistrement du lead.
--   - Métadonnées des catalogues stockées dans partners.documents (jsonb,
--     déjà existante) : [{ id, kind:'catalog', title, path, filename, size,
--     uploaded_at }]. partners est public-read → les pages publiques savent
--     qu'un catalogue existe sans exposer le fichier (le path seul est inerte
--     sans signed URL).
--   - Table catalog_leads : journal des contacts intéressés. INSERT réservé au
--     service_role (Edge Function) ; SELECT admin + partner propriétaire.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------
-- TABLE : catalog_leads
-- Contacts ayant demandé le téléchargement d'un catalogue partner.
-- ---------------------------------------------------------------
CREATE TABLE public.catalog_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  catalog_id text NOT NULL,
  catalog_title text,
  name text,
  email text NOT NULL CHECK (position('@' IN email) > 1),
  company text,
  locale text,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_catalog_leads_partner
  ON public.catalog_leads(partner_id, created_at DESC);

CREATE INDEX idx_catalog_leads_email
  ON public.catalog_leads(email);

COMMENT ON TABLE public.catalog_leads IS
  'Leads de téléchargement de catalogue PDF (lead-gated). INSERT réservé au service_role via Edge Function catalog-download (anti-spam + capture IP/UA serveur). SELECT admin + partner propriétaire. catalog_id référence l''entrée correspondante dans partners.documents.';

-- ---------------------------------------------------------------
-- RLS — catalog_leads
-- ---------------------------------------------------------------
ALTER TABLE public.catalog_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catalog_leads_admin_read_all"
  ON public.catalog_leads FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "catalog_leads_partner_read_own"
  ON public.catalog_leads FOR SELECT
  TO authenticated
  USING (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

-- INSERT/UPDATE/DELETE révoqués → seul le service_role (Edge Function) écrit.
REVOKE INSERT, UPDATE, DELETE ON public.catalog_leads FROM anon, authenticated;

-- ---------------------------------------------------------------
-- STORAGE — bucket partner-catalogs (private, PDF only, 25 Mo max)
-- ---------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'partner-catalogs',
  'partner-catalogs',
  false,
  25 * 1024 * 1024,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
  SET file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types,
      public = EXCLUDED.public;

-- Owner (partner propriétaire) : upload / remplacement / suppression de SES
-- fichiers (subfolder = partner_id). Lecture visiteur = signed URL Edge Function.
CREATE POLICY "partner_catalogs_storage_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'partner-catalogs'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.partners WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "partner_catalogs_storage_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'partner-catalogs'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.partners WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  )
  WITH CHECK (
    bucket_id = 'partner-catalogs'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.partners WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "partner_catalogs_storage_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'partner-catalogs'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.partners WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "partner_catalogs_storage_owner_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'partner-catalogs'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.partners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "partner_catalogs_storage_admin_all"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'partner-catalogs' AND public.is_admin())
  WITH CHECK (bucket_id = 'partner-catalogs' AND public.is_admin());

-- ---------------------------------------------------------------
-- Validation
-- ---------------------------------------------------------------
DO $$
DECLARE
  v_rls boolean;
  v_bucket int;
BEGIN
  SELECT c.relrowsecurity INTO v_rls
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname='catalog_leads';

  IF v_rls IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'catalog_leads — RLS not enabled';
  END IF;

  SELECT count(*) INTO v_bucket FROM storage.buckets WHERE id='partner-catalogs';
  IF v_bucket <> 1 THEN
    RAISE EXCEPTION 'partner-catalogs bucket missing';
  END IF;

  RAISE NOTICE 'OK Catalog downloads Phase 1 — table + RLS + private bucket in place';
END $$;

COMMIT;
