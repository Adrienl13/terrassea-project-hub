-- ============================================================================
-- partners.documents — colonne jsonb pour les documents attachés au partenaire
--
-- Date : 2026-06-04
-- Contexte : la feature "catalogues PDF téléchargeables" (Phase 1,
-- 20260604120000) stocke les métadonnées des catalogues dans
-- partners.documents : [{ id, kind:'catalog', title, path, filename, size,
-- uploaded_at }]. Un audit de schéma au moment du test E2E a révélé que la
-- colonne `documents` N'EXISTAIT PAS sur `partners` (elle n'existe que sur
-- `products`) — l'hypothèse initiale était erronée. Cette migration la crée.
--
-- jsonb tableau, défaut '[]', NOT NULL pour simplifier la lecture côté app et
-- edge function (toujours un tableau, jamais null).
-- ============================================================================

BEGIN;

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS documents jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.partners.documents IS
  'Documents attachés à la fiche partenaire (jsonb array). Aujourd''hui : catalogues PDF { id, kind:''catalog'', title, path, filename, size, uploaded_at }. Le PDF vit dans le bucket privé partner-catalogs ; seul le path est stocké ici (inerte sans signed URL). Public-read via la policy SELECT de partners.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='partners' AND column_name='documents'
  ) THEN
    RAISE EXCEPTION 'partners.documents column was not created';
  END IF;
  RAISE NOTICE 'OK partners.documents jsonb column in place';
END $$;

COMMIT;
