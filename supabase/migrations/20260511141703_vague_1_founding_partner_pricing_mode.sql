-- ============================================================
-- Vague 1 — Pricing visibility mode (Founding Partner Program)
-- Date : 2026-05-11
--
-- Adds two platform_settings entries that drive the launch
-- mode of the SaaS pricing layer :
--
--   pricing_visibility_mode := 'launch' | 'full'
--     - 'launch'  → public + dashboard hide paid plans, replace
--                   with the Founding Partner Program pitch.
--     - 'full'    → standard paid pricing (€249 / €499 / etc.)
--                   becomes visible again. Reversible with a
--                   single UPDATE.
--
--   launch_commission_rate := '5'
--     - Effective commission % during launch mode, supersedes
--     - plan-specific rates for new orders (enforcement happens
--       app-side ; not backfilled to historical orders).
--
-- Also DISABLES the trg_sync_partner_plan trigger on
-- public.partners so the auto-upgrade ladder
-- (starter → growth at N orders) is paused during launch.
-- partners.plan values are LEFT UNTOUCHED to preserve data
-- integrity for a clean rollback to mode='full'. The launch
-- mode supersedes per-plan affordances at the UI level.
--
-- Roll-back:
--   UPDATE public.platform_settings SET value='"full"'::jsonb
--     WHERE key='pricing_visibility_mode';
--   ALTER TABLE public.partners ENABLE TRIGGER trg_sync_partner_plan;
-- ============================================================

INSERT INTO public.platform_settings (key, value, label, category)
VALUES (
  'pricing_visibility_mode',
  '"launch"'::jsonb,
  'Display mode for SaaS pricing (launch | full). See FOUNDING_PROGRAM_ROADMAP.md.',
  'pricing'
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  label = EXCLUDED.label,
  category = EXCLUDED.category,
  updated_at = now();

INSERT INTO public.platform_settings (key, value, label, category)
VALUES (
  'launch_commission_rate',
  '5'::jsonb,
  'Effective commission % during pricing_visibility_mode=launch (overrides plan-specific rates).',
  'pricing'
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  label = EXCLUDED.label,
  category = EXCLUDED.category,
  updated_at = now();

ALTER TABLE public.partners DISABLE TRIGGER trg_sync_partner_plan;

DO $$
DECLARE
  v_trigger_state char;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.platform_settings WHERE key = 'pricing_visibility_mode') THEN
    RAISE EXCEPTION 'pricing_visibility_mode setting missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.platform_settings WHERE key = 'launch_commission_rate') THEN
    RAISE EXCEPTION 'launch_commission_rate setting missing';
  END IF;
  SELECT tgenabled INTO v_trigger_state
  FROM pg_trigger
  WHERE tgname = 'trg_sync_partner_plan'
    AND tgrelid = 'public.partners'::regclass;
  IF v_trigger_state IS DISTINCT FROM 'D' THEN
    RAISE EXCEPTION 'trg_sync_partner_plan must be DISABLED (got %)', COALESCE(v_trigger_state::text, 'NULL');
  END IF;
  RAISE NOTICE 'OK : Vague 1 launch mode setup complete';
END $$;
