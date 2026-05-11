-- ============================================================
-- Vague 1 — Public read RLS for pricing visibility flags
-- Date : 2026-05-11
--
-- Fixes régression : la page /become-partner (publique /
-- anonyme) ne pouvait pas lire pricing_visibility_mode parce
-- que platform_settings.RLS n'avait de policy SELECT que pour
-- `authenticated`. Pour un visiteur anon, la query retournait
-- 0 rows, le hook usePricingMode fallback à 'full', le routing
-- rendait l'ancienne BecomePartner.tsx avec les prix payants.
--
-- Whitelist explicite des clés publiques uniquement pour
-- éviter d'exposer les autres settings (notification_webhook_url,
-- notification_reply_to, admin_email, etc.).
--
-- Réversibilité :
--   DROP POLICY "Public read pricing flags"
--     ON public.platform_settings;
-- ============================================================

CREATE POLICY "Public read pricing flags"
ON public.platform_settings
FOR SELECT
TO anon, authenticated
USING (
  key IN (
    'pricing_visibility_mode',
    'launch_commission_rate'
  )
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.platform_settings'::regclass
      AND polname = 'Public read pricing flags'
  ) THEN
    RAISE EXCEPTION 'Policy "Public read pricing flags" missing post-apply';
  END IF;
  RAISE NOTICE 'OK : Public pricing flags RLS policy created';
END $$;
