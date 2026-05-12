-- ============================================================
-- Dette 59 Lot C — Admin info request RPC
-- Date : 2026-05-12
--
-- Admin can request additional information from a partner
-- applicant before approving/rejecting. The frontend previously
-- called supabase.functions.invoke('send-notification-email')
-- (401-silent) AND read selected.contact_email which doesn't
-- exist on partner_applications (real column is `email`) — so
-- the email path was double-broken.
--
-- Lot C consolidates the flow into one RPC :
--   request_partner_application_info(p_application_id, p_admin_message)
--   - is_admin() guard
--   - UPDATE partner_applications.status = 'info_requested',
--     admin_notes = message, reviewed_at, reviewed_by
--   - pg_net call to send-notification-email via the shared
--     send_transactional_email helper (Lot A)
--   - Returns jsonb status payload
--
-- Email render : public._email_application_info_requested
--   - 4 locales (FR/EN/ES/IT) in formal voice (post-quality-pass)
--   - admin message HTML-escaped + line-break preserved
--   - styled blockquote highlight
--   - no primary CTA (applicants have no logged-in dashboard ;
--     reply path = help block of the wrapper, already pointing
--     to adrienlaniez1@gmail.com)
--
-- Locale derivation : partner_applications.country is a free-form
-- text column (full name OR 2-letter code) — inline mapping
-- handles both shapes ; defaults to 'fr' when blank, 'en' when
-- unrecognized.
-- ============================================================

-- Add the column the frontend has been (silently) referencing for
-- months. The previous code at AdminApplications.tsx:135-139 issued
-- UPDATE partner_applications SET admin_notes = ... but the column
-- never existed → the UPDATE errored, the catch swallowed the error,
-- and the in-app toast pretended success. Triple-broken before Lot C.
ALTER TABLE public.partner_applications
  ADD COLUMN IF NOT EXISTS admin_notes text;

COMMENT ON COLUMN public.partner_applications.admin_notes IS
  'Free-form admin notes — used by request_partner_application_info RPC '
  'to store the info-request message sent to applicant.';

-- The status CHECK constraint previously listed only pending/approved/
-- rejected/suspended — but the frontend's APP_STATUS_CONFIG map AND the
-- updateStatus() / sendInfoRequest() flows have always referenced
-- 'info_requested'. UPDATEs setting that value were silently failing
-- against the CHECK and being swallowed by a generic catch block.
ALTER TABLE public.partner_applications
  DROP CONSTRAINT IF EXISTS partner_applications_status_check;

ALTER TABLE public.partner_applications
  ADD CONSTRAINT partner_applications_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'info_requested'::text, 'approved'::text, 'rejected'::text, 'suspended'::text]));

CREATE OR REPLACE FUNCTION public._email_application_info_requested(
  p_locale         text,
  p_contact_name   text,
  p_company_name   text,
  p_app_short      text,
  p_admin_message  text
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_subject       text;
  v_title         text;
  v_body          text;
  v_greet         text;
  v_msg_safe      text;
  v_msg_block     text;
BEGIN
  v_greet := COALESCE(' ' || NULLIF(p_contact_name, ''), '');

  -- HTML-escape the free-form admin message + preserve line breaks
  v_msg_safe := replace(
                  replace(
                    replace(coalesce(p_admin_message, ''), '&', '&amp;'),
                  '<', '&lt;'),
                '>', '&gt;');
  v_msg_safe := replace(v_msg_safe, E'\n', '<br/>');

  v_msg_block := '<em style="display:block;border-left:3px solid #d4603a;'
              || 'padding:14px 18px;margin:12px 0;background:#faf7f3;color:#1a1a1a;'
              || 'font-style:normal;font-size:15px;line-height:1.6;">'
              || v_msg_safe
              || '</em>';

  CASE p_locale
    WHEN 'fr' THEN
      v_subject := 'Informations complémentaires requises pour votre candidature';
      v_title   := 'Informations complémentaires';
      v_body    := 'Bonjour' || v_greet || ', nous avons étudié avec attention votre candidature pour <strong>'
                || coalesce(p_company_name, 'votre entreprise')
                || '</strong> (dossier <strong>#' || coalesce(p_app_short, '') || '</strong>) '
                || 'et avons besoin de quelques précisions pour la finaliser. '
                || 'Voici les informations qui nous manquent :'
                || v_msg_block
                || 'Merci de nous adresser ces éléments directement en réponse à cet email. '
                || 'Notre équipe les traite dans les meilleurs délais et reviendra vers vous '
                || 'dès qu''ils seront enregistrés.';
    WHEN 'es' THEN
      v_subject := 'Información adicional necesaria para su solicitud';
      v_title   := 'Información adicional';
      v_body    := 'Hola' || v_greet || ', hemos estudiado con atención su solicitud para <strong>'
                || coalesce(p_company_name, 'su empresa')
                || '</strong> (expediente <strong>#' || coalesce(p_app_short, '') || '</strong>) '
                || 'y necesitamos algunas aclaraciones para finalizarla. '
                || 'A continuación, la información que nos falta:'
                || v_msg_block
                || 'Le agradecemos que nos envíe estos datos directamente en respuesta a este correo. '
                || 'Nuestro equipo los tratará lo antes posible y volverá a contactarle '
                || 'en cuanto estén registrados.';
    WHEN 'it' THEN
      v_subject := 'Informazioni aggiuntive richieste per la Sua candidatura';
      v_title   := 'Informazioni aggiuntive';
      v_body    := 'Buongiorno' || v_greet || ', abbiamo esaminato con attenzione la Sua candidatura per <strong>'
                || coalesce(p_company_name, 'la Sua azienda')
                || '</strong> (pratica <strong>#' || coalesce(p_app_short, '') || '</strong>) '
                || 'e abbiamo bisogno di alcuni chiarimenti per finalizzarla. '
                || 'Di seguito, le informazioni che ci mancano:'
                || v_msg_block
                || 'La preghiamo di inviarci questi elementi direttamente in risposta a questa email. '
                || 'Il nostro team li elaborerà nel più breve tempo possibile e La ricontatterà '
                || 'non appena saranno registrati.';
    ELSE
      v_subject := 'Additional information required for your application';
      v_title   := 'Additional information';
      v_body    := 'Hello' || v_greet || ', we have carefully reviewed your application for <strong>'
                || coalesce(p_company_name, 'your company')
                || '</strong> (file <strong>#' || coalesce(p_app_short, '') || '</strong>) '
                || 'and need a few clarifications to finalize it. '
                || 'Here is the information we are missing:'
                || v_msg_block
                || 'Please send us these elements directly by replying to this email. '
                || 'Our team will process them as soon as possible and get back to you '
                || 'once they have been recorded.';
  END CASE;

  RETURN jsonb_build_object(
    'subject',   v_subject,
    'body_html', public.render_transactional_email(p_locale, v_title, v_body),
    'body_text', regexp_replace(v_body, '<[^>]+>', '', 'g')
  );
END;
$$;

-- ── RPC : admin-only, SECURITY DEFINER ─────────────────────
CREATE OR REPLACE FUNCTION public.request_partner_application_info(
  p_application_id uuid,
  p_admin_message  text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, pg_temp
AS $$
DECLARE
  v_app         RECORD;
  v_locale      text;
  v_app_short   text;
  v_payload     jsonb;
  v_admin_uid   uuid;
BEGIN
  -- Admin guard
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized: admin only';
  END IF;

  -- Validate message
  IF p_admin_message IS NULL OR length(trim(p_admin_message)) = 0 THEN
    RAISE EXCEPTION 'admin_message cannot be empty';
  END IF;

  -- Read application
  SELECT id, company_name, contact_name, email, country, status
    INTO v_app
  FROM public.partner_applications
  WHERE id = p_application_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'application not found: %', p_application_id;
  END IF;

  v_admin_uid := auth.uid();
  v_app_short := upper(substring(v_app.id::text from 1 for 8));

  -- Update application
  UPDATE public.partner_applications
  SET status      = 'info_requested',
      admin_notes = p_admin_message,
      reviewed_at = now(),
      reviewed_by = COALESCE(v_admin_uid::text, 'system')
  WHERE id = p_application_id;

  -- Derive locale from free-form country (full name or 2-letter code)
  v_locale := CASE
    WHEN v_app.country IS NULL OR btrim(v_app.country) = '' THEN 'fr'
    WHEN upper(left(btrim(v_app.country), 2)) IN ('FR', 'BE', 'CH', 'LU', 'MC') THEN 'fr'
    WHEN upper(left(btrim(v_app.country), 2)) = 'IT' THEN 'it'
    WHEN upper(left(btrim(v_app.country), 2)) = 'ES' THEN 'es'
    WHEN upper(left(btrim(v_app.country), 2)) IN ('GB', 'UK', 'IE', 'US', 'AU') THEN 'en'
    WHEN lower(v_app.country) LIKE 'fran%' OR lower(v_app.country) LIKE 'belg%'
      OR lower(v_app.country) LIKE 'suis%' OR lower(v_app.country) LIKE 'swit%'
      OR lower(v_app.country) LIKE 'luxem%' OR lower(v_app.country) LIKE 'mona%' THEN 'fr'
    WHEN lower(v_app.country) LIKE 'ital%' THEN 'it'
    WHEN lower(v_app.country) LIKE 'span%' OR lower(v_app.country) LIKE 'espa%' THEN 'es'
    ELSE 'en'
  END;

  -- Render + send
  v_payload := public._email_application_info_requested(
    v_locale,
    v_app.contact_name,
    v_app.company_name,
    v_app_short,
    p_admin_message
  );

  PERFORM public.send_transactional_email(
    v_app.email,
    v_payload->>'subject',
    v_payload->>'body_html',
    v_payload->>'body_text'
  );

  RETURN jsonb_build_object(
    'success',        true,
    'application_id', p_application_id,
    'status',         'info_requested',
    'locale',         v_locale,
    'sent_to',        v_app.email
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_partner_application_info(uuid, text) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.request_partner_application_info(uuid, text) TO authenticated;

-- ── Validation ──
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = '_email_application_info_requested' AND pronamespace='public'::regnamespace) THEN
    RAISE EXCEPTION '_email_application_info_requested missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'request_partner_application_info' AND pronamespace='public'::regnamespace) THEN
    RAISE EXCEPTION 'request_partner_application_info missing';
  END IF;
  RAISE NOTICE 'OK Dette 59 Lot C — admin info request RPC in place';
END $$;
