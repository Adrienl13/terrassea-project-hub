-- ============================================================================
-- Dette 101 — partners soft-delete refactor
-- Date : 2026-05-14
--
-- Origine : Décision founder Phase 2 CGV (Q5). Le RPC delete_partner_cascade
-- (Dette 75 Lot 2, 2026-05-13) faisait un hard-delete avec 9 FK cleanups.
--
-- Le passage en soft-delete est imposé par Phase 2 CGV :
-- cgv_acceptances.partner_cgv_id → partner_cgv.id ON DELETE RESTRICT
-- partner_cgv.partner_id           → partners.id     ON DELETE CASCADE
-- Une fois Phase 2 appliquée, hard-delete d'un partner avec acceptances
-- échouera (CASCADE supprime ses partner_cgv → RESTRICT bloque car
-- cgv_acceptances existent). Pattern industrie marketplace (Stripe, Etsy,
-- Vinted) = soft-delete pour préserver l'intégrité du journal d'audit légal.
--
-- Changements :
--   1. partners.deleted_at timestamptz (nullable, default NULL)
--   2. RLS "Public partners are readable" filtre deleted_at IS NULL
--   3. delete_partner_cascade refactoré → UPDATE deleted_at = now()
--      Plus de FK cleanup nécessaire : les rows en aval restent valides
--      puisque le partner row existe toujours, juste soft-deleted.
--   4. Le payload de retour change : { success, partner_id, partner_name,
--      soft_deleted_at, mode: 'soft_delete' }. Frontend AdminPartners.tsx
--      mis à jour dans le même commit.
-- ============================================================================

BEGIN;

-- 1. Ajout colonne deleted_at
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_partners_active_only
  ON public.partners(id)
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.partners.deleted_at IS
  'Soft-delete timestamp. NULL = actif. Non-null = archivé (Dette 101, 2026-05-14). Lectures publiques filtrent automatiquement via RLS.';

-- 2. RLS — Public partners filtrent deleted_at IS NULL
DROP POLICY IF EXISTS "Public partners are readable" ON public.partners;

CREATE POLICY "Public partners are readable"
  ON public.partners FOR SELECT
  TO anon, authenticated
  USING (is_public = true AND deleted_at IS NULL);

-- "Partner users can read own partner" reste tel quel : l'owner peut voir
-- son propre partner même soft-deleted (pour transparence + recovery éventuel).

-- Admin policies (Admins can {insert,update,delete} partners) restent tel quel :
-- admin voit tout (deleted ou non) via is_admin().

-- 3. Refactor delete_partner_cascade → soft-delete
CREATE OR REPLACE FUNCTION public.delete_partner_cascade(
  p_partner_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_partner_name text;
  v_already_deleted boolean;
  v_now timestamptz := now();
BEGIN
  -- Admin guard
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized: admin only';
  END IF;

  -- Verify partner exists + capture state
  SELECT name, deleted_at IS NOT NULL
  INTO v_partner_name, v_already_deleted
  FROM public.partners
  WHERE id = p_partner_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'partner not found: %', p_partner_id;
  END IF;

  IF v_already_deleted THEN
    RAISE EXCEPTION 'partner already soft-deleted: %', p_partner_id;
  END IF;

  -- Soft-delete : single UPDATE. No FK cleanup needed — toutes les FK en aval
  -- restent valides puisque le partner row existe toujours.
  UPDATE public.partners
  SET deleted_at = v_now,
      updated_at = v_now
  WHERE id = p_partner_id;

  RETURN jsonb_build_object(
    'success',         true,
    'partner_id',      p_partner_id,
    'partner_name',    v_partner_name,
    'soft_deleted_at', v_now,
    'mode',            'soft_delete'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_partner_cascade(uuid) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.delete_partner_cascade(uuid) TO authenticated;

COMMENT ON FUNCTION public.delete_partner_cascade IS
  'Soft-delete d''un partner (Dette 101). Pattern SECURITY DEFINER + search_path hardened. Retourne mode=soft_delete + soft_deleted_at. Pour hard-delete (cas RGPD légal exceptionnel), créer une RPC séparée hard_delete_partner_cascade avec admin guard + check no-acceptances (non implémenté v1).';

-- 4. Validation
DO $$
DECLARE
  v_deleted_at_exists boolean;
  v_policy_count int;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='partners' AND column_name='deleted_at'
  ) INTO v_deleted_at_exists;

  IF NOT v_deleted_at_exists THEN
    RAISE EXCEPTION 'partners.deleted_at column missing';
  END IF;

  SELECT count(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname='public' AND tablename='partners' AND policyname='Public partners are readable';

  IF v_policy_count <> 1 THEN
    RAISE EXCEPTION 'Public partners RLS policy missing or duplicated';
  END IF;

  RAISE NOTICE 'OK Dette 101 — partners soft-delete in place';
END $$;

COMMIT;
