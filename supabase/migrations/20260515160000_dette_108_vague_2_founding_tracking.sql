-- ============================================================================
-- Dette 108 — Vague 2 Founding Partner Tracking (Session 1 foundations)
-- Date : 2026-05-15
--
-- Décisions founder (cf. docs/strategy/VAGUE_2_FOUNDING_TRACKING_AUDIT.md §11) :
--   - Option A : système Founding DISTINCT du Loyalty
--   - Cutoff bascule launch : 2026-05-11
--   - Tiers basés sur somme de points (Founder 0+ / Silver 1000+ / Gold 3000+ /
--     Platinum 8000+)
--   - Phasage MVP : 3 triggers DB natifs Session 1 (profile_completed,
--     cgv_uploaded, first_order_received). 4ème action first_5_products
--     reportée Session 2 (Edge function batch products).
--   - Anti-fraude : dédup via UNIQUE (partner_id, action_type, COALESCE(reference_id, ''))
--
-- Périmètre Session 1 :
--   1. Colonnes partners.is_founding + founding_joined_at + index
--   2. Trigger BEFORE INSERT partners pour auto-marquage si pricing_visibility_mode='launch'
--   3. Table founding_actions + indexes + RLS + UNIQUE constraint anti-fraude
--   4. View founding_partner_scores avec tier dérivé
--   5. Setting platform_settings.founding_tiers_config (jsonb)
--   6. RPC record_founding_action (SECURITY DEFINER + search_path hardened)
--   7. Fonction publique get_partner_founding_tier (badges)
--   8. 3 trigger functions DB-natives (profile_completed, cgv_uploaded, first_order_received)
--   9. Backfill is_founding pour partners pré-2026-05-11
--  10. Backfill rétroactif des actions déjà complétées (équité cohorte existante)
--
-- Différé Session 2 :
--   - Hook React useFoundingScore, Component FoundingBadge, dashboards
--   - Edge function record-founding-products-batch (action first_5_products)
--   - Cacher Loyalty existant (commit séparé Session 2)
-- ============================================================================

BEGIN;

-- ========================================================================
-- 1. Colonnes partners.is_founding + founding_joined_at
-- ========================================================================

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS is_founding boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS founding_joined_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_partners_is_founding
  ON public.partners(is_founding)
  WHERE is_founding = true;

COMMENT ON COLUMN public.partners.is_founding IS
  'Marqueur statut Founding Partner (Vague 2). Set auto via trigger BEFORE INSERT si pricing_visibility_mode=launch. Backfill cohorte pré-2026-05-11 inclus dans la migration de création.';

COMMENT ON COLUMN public.partners.founding_joined_at IS
  'Date d''entrée dans la cohorte Founding (= founding_joined_at). Pour cohorte pré-2026-05-11 backfillée, vaut profile_reviewed_at ou created_at.';

-- ========================================================================
-- 2. Trigger BEFORE INSERT : auto-marquage pendant mode launch
-- ========================================================================

CREATE OR REPLACE FUNCTION public.auto_mark_founding_partner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_mode text;
BEGIN
  -- Lookup le mode actuel
  SELECT value::text INTO v_mode
  FROM public.platform_settings
  WHERE key = 'pricing_visibility_mode'
  LIMIT 1;

  -- platform_settings.value est jsonb. Si stocké comme "launch", le ::text donne '"launch"'
  v_mode := TRIM(BOTH '"' FROM COALESCE(v_mode, ''));

  IF v_mode = 'launch' AND NEW.is_founding IS DISTINCT FROM true THEN
    NEW.is_founding := true;
    NEW.founding_joined_at := COALESCE(NEW.founding_joined_at, now());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_mark_founding_partner ON public.partners;
CREATE TRIGGER trg_auto_mark_founding_partner
  BEFORE INSERT ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_mark_founding_partner();

COMMENT ON FUNCTION public.auto_mark_founding_partner IS
  'Trigger BEFORE INSERT partners : auto-marque is_founding=true si pricing_visibility_mode=launch. Pattern SECURITY DEFINER + search_path hardened. Si bascule full, nouveaux partners ne sont plus marqués (intentionnel).';

-- ========================================================================
-- 3. Backfill is_founding pour cohorte pré-2026-05-11
-- ========================================================================

UPDATE public.partners
SET is_founding = true,
    founding_joined_at = COALESCE(profile_reviewed_at, created_at)
WHERE profile_status = 'approved'
  AND COALESCE(profile_reviewed_at, created_at) <= '2026-05-11 23:59:59+00'
  AND deleted_at IS NULL
  AND is_founding = false;

-- ========================================================================
-- 4. Table founding_actions
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.founding_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type ~ '^[a-z_][a-z0-9_]*$'),
  points int NOT NULL CHECK (points >= 0),
  reference_id text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Anti-fraude : un seul row par (partner_id, action_type, reference_id).
-- COALESCE traite NULL comme '' pour les one-shot actions (profile, cgv, first_order)
-- qui n'ont pas de reference_id distinct.
CREATE UNIQUE INDEX IF NOT EXISTS idx_founding_actions_dedup
  ON public.founding_actions (partner_id, action_type, COALESCE(reference_id, ''));

CREATE INDEX IF NOT EXISTS idx_founding_actions_partner_created
  ON public.founding_actions (partner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_founding_actions_action_type
  ON public.founding_actions (action_type, created_at DESC);

COMMENT ON TABLE public.founding_actions IS
  'Event log immuable des actions Founding qui rapportent des points. Append-only via RPC record_founding_action. Anti-fraude dédup via UNIQUE (partner_id, action_type, COALESCE(reference_id, '''')). One-shot actions (profile_completed, cgv_uploaded, first_order_received) ont reference_id NULL. Actions futures avec dédup (invitations) auront reference_id = email/uuid de l''invité.';

-- ========================================================================
-- 5. RLS founding_actions
-- ========================================================================

ALTER TABLE public.founding_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founding_actions_partner_read_own"
  ON public.founding_actions FOR SELECT
  TO authenticated
  USING (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

CREATE POLICY "founding_actions_admin_read_all"
  ON public.founding_actions FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- INSERT/UPDATE/DELETE révoqués → seule la RPC SECURITY DEFINER écrit.
REVOKE INSERT, UPDATE, DELETE ON public.founding_actions FROM anon, authenticated;

-- ========================================================================
-- 6. Platform setting : catalogue + seuils
-- ========================================================================

INSERT INTO public.platform_settings (key, value, category, label)
VALUES (
  'founding_tiers_config',
  jsonb_build_object(
    'thresholds', jsonb_build_object(
      'founder', 0,
      'silver', 1000,
      'gold', 3000,
      'platinum', 8000
    ),
    'actions', jsonb_build_object(
      'profile_completed',          jsonb_build_object('points', 100,  'category', 'onboarding',   'one_shot', true,  'active', true),
      'cgv_uploaded',               jsonb_build_object('points', 100,  'category', 'onboarding',   'one_shot', true,  'active', true),
      'first_5_products',           jsonb_build_object('points', 200,  'category', 'onboarding',   'one_shot', true,  'active', false, 'deferred_to', 'session_2_edge_function'),
      'first_order_received',       jsonb_build_object('points', 500,  'category', 'transaction',  'one_shot', true,  'active', true),
      'partner_invited_signup',     jsonb_build_object('points', 100,  'category', 'invitation',   'one_shot', false, 'active', false, 'deferred_to', 'dette_110a_after_dette_111'),
      'partner_invited_approved',   jsonb_build_object('points', 500,  'category', 'invitation',   'one_shot', false, 'active', false, 'deferred_to', 'dette_110a_after_dette_111'),
      'architect_invited_signup',   jsonb_build_object('points', 100,  'category', 'invitation',   'one_shot', false, 'active', false, 'deferred_to', 'dette_110a_after_dette_111_dette_112'),
      'architect_invited_active',   jsonb_build_object('points', 300,  'category', 'invitation',   'one_shot', false, 'active', false, 'deferred_to', 'dette_110a_after_dette_111_dette_112'),
      'client_invited_signup',      jsonb_build_object('points', 50,   'category', 'invitation',   'one_shot', false, 'active', false, 'deferred_to', 'dette_110a_after_dette_111'),
      'client_invited_first_order', jsonb_build_object('points', 300,  'category', 'invitation',   'one_shot', false, 'active', false, 'deferred_to', 'dette_110a_after_dette_111'),
      'feedback_submitted',         jsonb_build_object('points', 50,   'category', 'co_dev',       'one_shot', false, 'active', false, 'deferred_to', 'dette_110b'),
      'feedback_adopted',           jsonb_build_object('points', 200,  'category', 'co_dev',       'one_shot', false, 'active', false, 'deferred_to', 'dette_110b'),
      'suggestion_implemented',     jsonb_build_object('points', 500,  'category', 'co_dev',       'one_shot', false, 'active', false, 'deferred_to', 'dette_110b'),
      'ten_orders_milestone',       jsonb_build_object('points', 1000, 'category', 'milestone',    'one_shot', true,  'active', false, 'deferred_to', 'vague_3'),
      'fifty_orders_milestone',     jsonb_build_object('points', 2500, 'category', 'milestone',    'one_shot', true,  'active', false, 'deferred_to', 'vague_3')
    )
  ),
  'founding',
  'Catalogue actions Founding Partner + seuils tiers. Décisions founder Vague 2 2026-05-15.'
)
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      category = EXCLUDED.category,
      label = EXCLUDED.label,
      updated_at = now();

-- ========================================================================
-- 7. RPC record_founding_action — SEULE voie d'INSERT
-- ========================================================================

CREATE OR REPLACE FUNCTION public.record_founding_action(
  p_partner_id uuid,
  p_action_type text,
  p_reference_id text DEFAULT NULL,
  p_meta jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_config jsonb;
  v_action_config jsonb;
  v_points int;
  v_one_shot boolean;
  v_active boolean;
  v_is_founding boolean;
  v_id uuid;
BEGIN
  -- 1. Vérifie que le partner est Founding (non-Founding → silent skip)
  SELECT is_founding INTO v_is_founding
  FROM public.partners
  WHERE id = p_partner_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'partner not found or deleted: %', p_partner_id;
  END IF;

  IF NOT v_is_founding THEN
    -- Non-Founding partners ne reçoivent pas de points (silent return)
    RETURN NULL;
  END IF;

  -- 2. Lookup catalogue depuis platform_settings
  SELECT value INTO v_config
  FROM public.platform_settings
  WHERE key = 'founding_tiers_config';

  IF v_config IS NULL THEN
    RAISE EXCEPTION 'founding_tiers_config setting not found';
  END IF;

  v_action_config := v_config -> 'actions' -> p_action_type;

  IF v_action_config IS NULL THEN
    RAISE EXCEPTION 'unknown founding action_type: %', p_action_type;
  END IF;

  v_active := COALESCE((v_action_config ->> 'active')::boolean, false);

  IF NOT v_active THEN
    RAISE EXCEPTION 'founding action % not yet active (deferred: %)',
      p_action_type, COALESCE(v_action_config ->> 'deferred_to', 'unknown');
  END IF;

  v_points := (v_action_config ->> 'points')::int;
  v_one_shot := COALESCE((v_action_config ->> 'one_shot')::boolean, true);

  -- 3. INSERT avec dédup via UNIQUE constraint. Silent skip si déjà existant.
  INSERT INTO public.founding_actions (partner_id, action_type, points, reference_id, meta)
  VALUES (p_partner_id, p_action_type, v_points, p_reference_id, COALESCE(p_meta, '{}'::jsonb))
  ON CONFLICT (partner_id, action_type, COALESCE(reference_id, ''))
  DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- REVOKE ALL → seuls service_role + triggers DB peuvent appeler.
-- Authenticated ne peut PAS spammer cette RPC depuis le frontend.
REVOKE EXECUTE ON FUNCTION public.record_founding_action(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.record_founding_action IS
  'Point d''entrée unique pour record actions Founding. SECURITY DEFINER + search_path hardened. Lookup points depuis platform_settings.founding_tiers_config.actions.{action_type}. Anti-fraude via UNIQUE constraint (ON CONFLICT DO NOTHING). REVOKE pour bloquer appel direct frontend — seuls triggers DB internes et Edge functions service-role peuvent invoquer.';

-- ========================================================================
-- 8. View founding_partner_scores
-- ========================================================================

CREATE OR REPLACE VIEW public.founding_partner_scores AS
SELECT
  p.id AS partner_id,
  p.name AS partner_name,
  p.slug,
  p.is_founding,
  p.founding_joined_at,
  COALESCE(SUM(fa.points), 0)::int AS total_points,
  COUNT(fa.id)::int AS actions_count,
  CASE
    WHEN COALESCE(SUM(fa.points), 0) >= 8000 THEN 'platinum'
    WHEN COALESCE(SUM(fa.points), 0) >= 3000 THEN 'gold'
    WHEN COALESCE(SUM(fa.points), 0) >= 1000 THEN 'silver'
    ELSE 'founder'
  END AS tier
FROM public.partners p
LEFT JOIN public.founding_actions fa ON fa.partner_id = p.id
WHERE p.is_founding = true AND p.deleted_at IS NULL
GROUP BY p.id, p.name, p.slug, p.is_founding, p.founding_joined_at;

COMMENT ON VIEW public.founding_partner_scores IS
  'Agrégation Founding scores par partner. Tier dérivé via seuils 0/1000/3000/8000 (cohérent avec founding_tiers_config.thresholds). View inherit RLS depuis founding_actions (partner read own + admin all). Pour exposer publiquement le tier d''un partner (badges), passer par get_partner_founding_tier().';

-- ========================================================================
-- 9. Fonction publique get_partner_founding_tier (badges)
-- ========================================================================

CREATE OR REPLACE FUNCTION public.get_partner_founding_tier(p_partner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
  v_is_founding boolean;
  v_total int;
  v_tier text;
  v_joined_at timestamptz;
BEGIN
  SELECT is_founding, founding_joined_at
  INTO v_is_founding, v_joined_at
  FROM public.partners
  WHERE id = p_partner_id AND deleted_at IS NULL AND is_public = true;

  IF NOT FOUND OR NOT COALESCE(v_is_founding, false) THEN
    -- Partner non-public ou non-Founding ou inexistant → null
    RETURN NULL;
  END IF;

  SELECT COALESCE(SUM(points), 0)::int INTO v_total
  FROM public.founding_actions
  WHERE partner_id = p_partner_id;

  v_tier := CASE
    WHEN v_total >= 8000 THEN 'platinum'
    WHEN v_total >= 3000 THEN 'gold'
    WHEN v_total >= 1000 THEN 'silver'
    ELSE 'founder'
  END;

  RETURN jsonb_build_object(
    'tier', v_tier,
    'is_founding', true,
    'founding_joined_at', v_joined_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_partner_founding_tier(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.get_partner_founding_tier IS
  'Public-safe : retourne uniquement tier + is_founding + founding_joined_at. Pas de total_points exposé. Filtré sur partners.is_public=true. Pattern SECURITY DEFINER + search_path hardened. Usage : FoundingBadge component Session 2.';

-- ========================================================================
-- 10. Trigger DB 1 : profile_completed (AFTER UPDATE partners)
-- ========================================================================

CREATE OR REPLACE FUNCTION public.trg_founding_profile_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.profile_status = 'approved'
     AND COALESCE(OLD.profile_status, '') IS DISTINCT FROM 'approved'
     AND NEW.is_founding = true
     AND NEW.deleted_at IS NULL
  THEN
    PERFORM public.record_founding_action(NEW.id, 'profile_completed', NULL, '{}'::jsonb);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_founding_profile_completed ON public.partners;
CREATE TRIGGER trg_founding_profile_completed
  AFTER UPDATE OF profile_status ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_founding_profile_completed();

-- ========================================================================
-- 11. Trigger DB 2 : cgv_uploaded (AFTER INSERT partner_cgv WHERE status='active')
-- ========================================================================

CREATE OR REPLACE FUNCTION public.trg_founding_cgv_uploaded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_founding boolean;
BEGIN
  IF NEW.status = 'active' THEN
    SELECT is_founding INTO v_is_founding
    FROM public.partners
    WHERE id = NEW.partner_id AND deleted_at IS NULL;

    IF COALESCE(v_is_founding, false) THEN
      PERFORM public.record_founding_action(NEW.partner_id, 'cgv_uploaded', NULL, '{}'::jsonb);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_founding_cgv_uploaded ON public.partner_cgv;
CREATE TRIGGER trg_founding_cgv_uploaded
  AFTER INSERT ON public.partner_cgv
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_founding_cgv_uploaded();

-- ========================================================================
-- 12. Trigger DB 3 : first_order_received (AFTER UPDATE orders.status='confirmed')
-- ========================================================================

CREATE OR REPLACE FUNCTION public.trg_founding_first_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_founding boolean;
BEGIN
  IF NEW.status = 'confirmed'
     AND COALESCE(OLD.status, '') IS DISTINCT FROM 'confirmed'
     AND NEW.partner_id IS NOT NULL
  THEN
    SELECT is_founding INTO v_is_founding
    FROM public.partners
    WHERE id = NEW.partner_id AND deleted_at IS NULL;

    IF COALESCE(v_is_founding, false) THEN
      PERFORM public.record_founding_action(NEW.partner_id, 'first_order_received', NULL, '{}'::jsonb);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_founding_first_order ON public.orders;
CREATE TRIGGER trg_founding_first_order
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_founding_first_order();

-- ========================================================================
-- 13. Backfill rétroactif des actions déjà complétées par la cohorte existante
-- ========================================================================

-- profile_completed : tous les is_founding=true avec profile_status='approved'
INSERT INTO public.founding_actions (partner_id, action_type, points)
SELECT id, 'profile_completed', 100
FROM public.partners
WHERE is_founding = true
  AND profile_status = 'approved'
  AND deleted_at IS NULL
ON CONFLICT (partner_id, action_type, COALESCE(reference_id, '')) DO NOTHING;

-- cgv_uploaded : tous les is_founding=true avec au moins 1 CGV active
INSERT INTO public.founding_actions (partner_id, action_type, points)
SELECT DISTINCT pc.partner_id, 'cgv_uploaded', 100
FROM public.partner_cgv pc
JOIN public.partners p ON p.id = pc.partner_id
WHERE pc.status = 'active'
  AND p.is_founding = true
  AND p.deleted_at IS NULL
ON CONFLICT (partner_id, action_type, COALESCE(reference_id, '')) DO NOTHING;

-- first_order_received : tous les is_founding=true avec au moins 1 order confirmed
INSERT INTO public.founding_actions (partner_id, action_type, points)
SELECT DISTINCT o.partner_id, 'first_order_received', 500
FROM public.orders o
JOIN public.partners p ON p.id = o.partner_id
WHERE o.status = 'confirmed'
  AND p.is_founding = true
  AND p.deleted_at IS NULL
ON CONFLICT (partner_id, action_type, COALESCE(reference_id, '')) DO NOTHING;

-- ========================================================================
-- 14. Validation
-- ========================================================================

DO $$
DECLARE
  v_table_exists boolean;
  v_rls_count int;
  v_rpc_count int;
  v_setting_exists boolean;
  v_founding_count int;
  v_actions_count int;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='founding_actions'
  ) INTO v_table_exists;
  IF NOT v_table_exists THEN RAISE EXCEPTION 'founding_actions table missing'; END IF;

  SELECT count(*) INTO v_rls_count
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname='founding_actions' AND c.relrowsecurity = true;
  IF v_rls_count <> 1 THEN RAISE EXCEPTION 'founding_actions RLS not enabled'; END IF;

  SELECT count(*) INTO v_rpc_count
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname='public' AND p.proname IN ('record_founding_action','get_partner_founding_tier','auto_mark_founding_partner','trg_founding_profile_completed','trg_founding_cgv_uploaded','trg_founding_first_order');
  IF v_rpc_count <> 6 THEN RAISE EXCEPTION 'expected 6 founding functions, found %', v_rpc_count; END IF;

  SELECT EXISTS (SELECT 1 FROM public.platform_settings WHERE key='founding_tiers_config') INTO v_setting_exists;
  IF NOT v_setting_exists THEN RAISE EXCEPTION 'founding_tiers_config setting missing'; END IF;

  SELECT count(*) INTO v_founding_count FROM public.partners WHERE is_founding = true;
  SELECT count(*) INTO v_actions_count FROM public.founding_actions;

  RAISE NOTICE 'OK Dette 108 Session 1 — % partners is_founding=true, % founding_actions inserted', v_founding_count, v_actions_count;
END $$;

COMMIT;
