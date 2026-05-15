-- ============================================================================
-- Dette 104 (partial) — RPC delete_partner_cgv (smart delete)
-- Date : 2026-05-15
--
-- Smart delete sémantique :
--   - 0 acceptances liées : HARD DELETE (row partner_cgv)
--   - >=1 acceptances     : ARCHIVE (status='archived', preserve audit trail)
--
-- Le storage cleanup côté fichier PDF se fait best-effort côté client après
-- retour de la RPC (action='deleted' + storage_path). Si le cleanup échoue,
-- on a un fichier orphelin acceptable — il ne fuite pas (bucket privé +
-- policies owner/admin only).
--
-- Permissions :
--   - admin (public.is_admin()) : peut delete n'importe quelle CGV
--   - partner owner : peut delete uniquement ses propres CGV
--     (partners.user_id = auth.uid() AND partners.deleted_at IS NULL)
--
-- Trigger sync_partner_cgv_metadata gère automatiquement la cohérence
-- du cache partner_cgv_metadata après l'UPDATE ou le DELETE.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.delete_partner_cgv(
  p_cgv_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
  v_partner_id uuid;
  v_storage_path text;
  v_status text;
  v_acceptances_count int;
  v_action text;
  v_authorized boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT public.is_admin() INTO v_is_admin;

  -- Fetch CGV row
  SELECT partner_id, storage_path, status
  INTO v_partner_id, v_storage_path, v_status
  FROM public.partner_cgv
  WHERE id = p_cgv_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CGV not found: %', p_cgv_id;
  END IF;

  -- Permission check : admin OR owner partner (non soft-deleted)
  IF v_is_admin THEN
    v_authorized := true;
  ELSE
    IF EXISTS (
      SELECT 1 FROM public.partners
      WHERE id = v_partner_id
        AND user_id = v_user_id
        AND deleted_at IS NULL
    ) THEN
      v_authorized := true;
    END IF;
  END IF;

  IF NOT v_authorized THEN
    RAISE EXCEPTION 'Forbidden: not owner and not admin';
  END IF;

  -- Count acceptances liées
  SELECT count(*) INTO v_acceptances_count
  FROM public.cgv_acceptances
  WHERE partner_cgv_id = p_cgv_id;

  IF v_acceptances_count > 0 THEN
    -- Archive (preserve audit trail). Le trigger sync_partner_cgv_metadata
    -- déclenche sur UPDATE OF status et met à jour metadata.
    UPDATE public.partner_cgv
    SET status = 'archived',
        archived_at = COALESCE(archived_at, now()),
        archive_reason = COALESCE(archive_reason, 'Supprimée par utilisateur — preserved car acceptances existantes (' || v_acceptances_count || ')')
    WHERE id = p_cgv_id;

    v_action := 'archived';
  ELSE
    -- Hard delete (no acceptances = safe to remove). Le trigger
    -- sync_partner_cgv_metadata déclenche sur DELETE et met à jour metadata.
    DELETE FROM public.partner_cgv
    WHERE id = p_cgv_id;

    v_action := 'deleted';
  END IF;

  RETURN jsonb_build_object(
    'action', v_action,
    'cgv_id', p_cgv_id,
    'partner_id', v_partner_id,
    'storage_path', v_storage_path,
    'previous_status', v_status,
    'acceptances_count', v_acceptances_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_partner_cgv(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_partner_cgv(uuid) TO authenticated;

COMMENT ON FUNCTION public.delete_partner_cgv IS
  'Smart delete partner CGV : hard si 0 acceptances, archive sinon. SECURITY DEFINER + search_path hardened. Admin override OK ; sinon owner check via partners.user_id + deleted_at IS NULL. Storage cleanup côté client après retour action=deleted.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname='delete_partner_cgv'
  ) THEN
    RAISE EXCEPTION 'delete_partner_cgv missing';
  END IF;
  RAISE NOTICE 'OK Dette 104 — delete_partner_cgv RPC in place';
END $$;

COMMIT;
