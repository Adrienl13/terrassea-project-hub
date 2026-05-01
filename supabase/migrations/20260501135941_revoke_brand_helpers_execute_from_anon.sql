-- Phase 1 Modèle B variants — Correction ÉTAPE 5
-- Réf : docs/chantiers/2026-05/PLAN_MODELE_B_VARIANTS.md
-- Création 2026-05-01.
--
-- CONTEXTE
-- Investigation post-ÉTAPE 5 : les helpers SECURITY DEFINER is_brand_member
-- et is_brand_owner sont flaggés par les advisors anon_security_definer_function_executable
-- malgré le REVOKE ALL FROM PUBLIC + GRANT TO authenticated, service_role
-- présent dans la migration 20260501131806.
--
-- ROOT CAUSE
-- Supabase a un default privilege actif :
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public
--   GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
--
-- Cette default privilege grant explicitement EXECUTE à anon au moment de la
-- création de la fonction. Mon REVOKE FROM PUBLIC ne touche pas les explicit
-- grants — seul un REVOKE FROM anon explicite peut le retirer.
--
-- CORRECTION
-- REVOKE EXECUTE FROM anon sur les 2 helpers. anon n'a pas besoin d'appeler
-- ces helpers (auth.uid() est NULL pour anon → is_brand_member retourne
-- toujours false de toute façon). Defense in depth.

REVOKE EXECUTE ON FUNCTION public.is_brand_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_brand_owner(uuid, uuid) FROM anon;

-- Validation post-REVOKE : les helpers ne sont plus exécutables par anon
DO $$
DECLARE
  is_member_anon_can_execute boolean;
  is_owner_anon_can_execute boolean;
BEGIN
  SELECT has_function_privilege('anon', 'public.is_brand_member(uuid, uuid)', 'EXECUTE')
    INTO is_member_anon_can_execute;
  SELECT has_function_privilege('anon', 'public.is_brand_owner(uuid, uuid)', 'EXECUTE')
    INTO is_owner_anon_can_execute;

  IF is_member_anon_can_execute THEN
    RAISE EXCEPTION 'anon still has EXECUTE on is_brand_member after REVOKE';
  END IF;
  IF is_owner_anon_can_execute THEN
    RAISE EXCEPTION 'anon still has EXECUTE on is_brand_owner after REVOKE';
  END IF;

  RAISE NOTICE 'EXECUTE successfully revoked from anon for is_brand_member and is_brand_owner';
END $$;
