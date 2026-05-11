-- ============================================================================
-- Dette 52 — DROP redundant partner_applications approval trigger
-- Date : 2026-05-07
--
-- Audit pg_trigger révélait 2 triggers s'exécutant sur
-- partner_applications UPDATE quand status passe à 'approved' :
--
--   1. trg_auto_create_partner (BEFORE UPDATE) → auto_create_partner_on_approval()
--      = CANONIQUE. Idempotent (skip si created_partner_id != NULL).
--      Crée partner avec 17 champs complets (incl. contact_email, vat_number,
--      application_id, country_code dérivé). Crée aussi partner_subscriptions.
--      Sets NEW.created_partner_id qui persiste avec l'UPDATE.
--
--   2. trg_create_partner_on_approval (AFTER UPDATE) → create_partner_on_approval()
--      = LEGACY. NON-idempotent. Crée partner avec 8 champs MINIMAUX
--      (manque contact_email/contact_name/contact_phone/vat_number/application_id).
--      Pas de partner_subscriptions. Sauvé du doublon par ON CONFLICT (slug)
--      DO NOTHING dans les cas usuels.
--
-- RISQUE concret du LEGACY : si generate_partner_slug() collide avec un
-- partner existant et appose un suffixe `-1`, le legacy n'a pas de
-- collision check et INSERT son propre partner avec le slug original. Cela
-- crée un row partners INCOMPLET (sans contact_email donc partner ne peut
-- pas se loginer en lookup email-based). Bug latent prêt à exploser au 1er
-- vrai signup avec collision de nom.
--
-- Décision : DROP le legacy avant le 1er vrai onboarding partner réel
-- (campagne email 15 marques lancée 2026-05-07). Aucune référence au
-- legacy dans le code TS (vérifié grep).
-- ============================================================================

DROP TRIGGER IF EXISTS trg_create_partner_on_approval ON public.partner_applications;
DROP FUNCTION IF EXISTS public.create_partner_on_approval();

-- DO block validation : exactement 1 trigger restant côté partner creation
DO $$
DECLARE
  remaining_triggers integer;
  remaining_functions integer;
BEGIN
  SELECT count(*) INTO remaining_triggers
  FROM information_schema.triggers
  WHERE event_object_schema = 'public'
    AND event_object_table  = 'partner_applications'
    AND trigger_name LIKE '%partner%';

  IF remaining_triggers != 1 THEN
    RAISE EXCEPTION 'Expected exactly 1 partner trigger remaining on partner_applications, got %', remaining_triggers;
  END IF;

  SELECT count(*) INTO remaining_functions
  FROM pg_proc
  WHERE proname = 'create_partner_on_approval';

  IF remaining_functions != 0 THEN
    RAISE EXCEPTION 'Legacy function create_partner_on_approval still present after DROP';
  END IF;

  RAISE NOTICE 'OK : legacy trigger + function dropped, canonical trg_auto_create_partner remains.';
END $$;
