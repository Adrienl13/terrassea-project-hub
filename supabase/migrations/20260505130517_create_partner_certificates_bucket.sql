-- ============================================================================
-- Storage bucket for partner certificates (PDFs)
-- ÉTAPE 8e-1 (2026-05-05).
--
-- MODEL: B2B freemium (authenticated access only).
--
-- Public meta-data (cert name, validity dates, lab) is exposed to anon
-- visitors via product detail pages, but PDF documents require an
-- authenticated account to download. This protects partners' certificates
-- against scraping by competitors and enables qualified lead collection.
--
-- NAMING CONVENTION
-- {partner_id}/{certification_slug}_{timestamp}.pdf
-- Path structure enables RLS policies to verify that the uploader/modifier
-- is a brand_member of the partner referenced in the path's first segment.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'partner-certificates',
  'partner-certificates',
  false,                     -- private bucket (auth required to access)
  10485760,                  -- 10 MB max per file
  ARRAY['application/pdf']   -- PDF only
)
ON CONFLICT (id) DO NOTHING;

-- ── RLS policies on storage.objects for this bucket ────────────────────────

-- SELECT: authenticated only (NOT public)
CREATE POLICY "partner_certs_select_authenticated" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'partner-certificates');

-- INSERT: brand_member of the partner referenced in path
-- Path format: {partner_id}/{filename}.pdf
CREATE POLICY "partner_certs_insert_brand_member" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'partner-certificates'
    AND EXISTS (
      SELECT 1 FROM public.brand_users
      WHERE brand_id = (regexp_split_to_array(name, '/'))[1]::uuid
        AND user_id = auth.uid()
        AND role IN ('owner', 'editor')
    )
  );

-- UPDATE: same condition as INSERT (USING + WITH CHECK)
CREATE POLICY "partner_certs_update_brand_member" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'partner-certificates'
    AND EXISTS (
      SELECT 1 FROM public.brand_users
      WHERE brand_id = (regexp_split_to_array(name, '/'))[1]::uuid
        AND user_id = auth.uid()
        AND role IN ('owner', 'editor')
    )
  )
  WITH CHECK (
    bucket_id = 'partner-certificates'
    AND EXISTS (
      SELECT 1 FROM public.brand_users
      WHERE brand_id = (regexp_split_to_array(name, '/'))[1]::uuid
        AND user_id = auth.uid()
        AND role IN ('owner', 'editor')
    )
  );

-- DELETE: brand_owner only (Pattern B - more restrictive)
CREATE POLICY "partner_certs_delete_brand_owner" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'partner-certificates'
    AND EXISTS (
      SELECT 1 FROM public.brand_users
      WHERE brand_id = (regexp_split_to_array(name, '/'))[1]::uuid
        AND user_id = auth.uid()
        AND role = 'owner'
    )
  );

-- ── Validation embarquée ───────────────────────────────────────────────────

DO $$
DECLARE
  bucket_exists boolean;
  policy_count integer;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'partner-certificates'
  ) INTO bucket_exists;

  IF NOT bucket_exists THEN
    RAISE EXCEPTION 'Bucket partner-certificates was not created';
  END IF;

  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE 'partner_certs_%';

  IF policy_count <> 4 THEN
    RAISE EXCEPTION 'Expected 4 RLS policies for partner_certs, got %', policy_count;
  END IF;

  RAISE NOTICE 'OK: partner-certificates bucket created with 4 RLS policies';
END $$;
