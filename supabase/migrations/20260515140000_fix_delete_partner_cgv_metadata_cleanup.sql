-- ============================================================================
-- Fix Dette 104b — delete_partner_cgv FK violation on hard delete
-- Date : 2026-05-15
--
-- Bug reporté founder lors smoke test partner : "Je ne peux pas supprimer".
--
-- Root cause :
--   partner_cgv_metadata.current_cgv_id → partner_cgv.id ON DELETE RESTRICT.
--   Le trigger sync_partner_cgv_metadata est AFTER DELETE et n'a pas le temps
--   de rafraîchir le cache avant la vérif FK. Le DELETE échoue avec :
--
--     ERROR 23503: update or delete on table "partner_cgv" violates foreign
--     key constraint "partner_cgv_metadata_current_cgv_id_fkey"
--
-- Fix retenu (Option A) :
--   Le RPC est le seul endroit autorisé à supprimer une CGV. On garde la FK
--   RESTRICT comme garde-fou (defense in depth contre suppressions silencieuses
--   ailleurs) et on rend explicite la responsabilité de cleanup dans le RPC :
--   UPDATE metadata SET current_cgv_id=NULL, current_version=NULL avant DELETE.
--
--   Respecte ainsi la CHECK partner_cgv_metadata_current_consistency (les deux
--   colonnes nullifiées ensemble).
--
-- Pas d'alternative SET NULL FK : violerait la CHECK constraint qui requiert
-- current_cgv_id et current_version cohérents (tous deux NULL ou tous deux
-- non-NULL).
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

  SELECT partner_id, storage_path, status
  INTO v_partner_id, v_storage_path, v_status
  FROM public.partner_cgv
  WHERE id = p_cgv_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CGV not found: %', p_cgv_id;
  END IF;

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

  SELECT count(*) INTO v_acceptances_count
  FROM public.cgv_acceptances
  WHERE partner_cgv_id = p_cgv_id;

  IF v_acceptances_count > 0 THEN
    UPDATE public.partner_cgv
    SET status = 'archived',
        archived_at = COALESCE(archived_at, now()),
        archive_reason = COALESCE(archive_reason, 'Supprimée par utilisateur — preserved car acceptances existantes (' || v_acceptances_count || ')')
    WHERE id = p_cgv_id;

    v_action := 'archived';
  ELSE
    -- Nullifier explicitement le metadata avant le hard delete pour respecter
    -- la FK RESTRICT (defense in depth) + la CHECK constraint
    -- partner_cgv_metadata_current_consistency (current_cgv_id + current_version
    -- nullifiés ensemble).
    UPDATE public.partner_cgv_metadata
    SET current_cgv_id = NULL,
        current_version = NULL,
        last_updated_at = now()
    WHERE current_cgv_id = p_cgv_id;

    DELETE FROM public.partner_cgv
    WHERE id = p_cgv_id;

    -- Le trigger sync_partner_cgv_metadata AFTER DELETE va potentiellement
    -- repeupler current_cgv_id si une autre CGV active existe pour ce partner
    -- (cas rare mais légitime : si on supprime une 'archived', l'active reste).

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
  'Smart delete partner CGV : hard si 0 acceptances, archive sinon. SECURITY DEFINER + search_path hardened. Admin OR owner check. Fix 2026-05-15 : nullify metadata avant hard delete pour respecter FK RESTRICT.';

COMMIT;
