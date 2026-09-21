-- Migration de domaine terrassea.com → terrasseahub.fr (2026-09-21)
-- Réécrit les CTA links des 6 fonctions emails transactionnels
-- (_email_quote_created_client, _email_quote_replied_client,
--  _email_quote_assigned_partner, _email_order_quote_accepted_partner,
--  _email_order_payment_instructions_client, _email_order_delivered_client)
-- en remplaçant https://terrassea.com/... par https://terrasseahub.fr/...
-- NOTE : les adresses email (mailto:support@terrassea.com dans
-- render_transactional_email, noreply@terrassea.com) sont volontairement
-- conservées — bascule en phase 2 après vérification du domaine dans Resend.
DO $$
DECLARE
  r record;
  v_def text;
BEGIN
  FOR r IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosrc LIKE '%https://terrassea.com/%'
  LOOP
    v_def := pg_get_functiondef(r.oid);
    v_def := replace(v_def, 'https://terrassea.com/', 'https://terrasseahub.fr/');
    EXECUTE v_def;
  END LOOP;
END $$;
