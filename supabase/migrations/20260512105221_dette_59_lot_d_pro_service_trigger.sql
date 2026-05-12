-- ============================================================
-- Dette 59 Lot D — Pro Service request confirmation trigger
-- Date : 2026-05-12
--
-- Closes the 8th and final direct callsite of Dette 59.
-- Moves the Pro Service "request received" email from
-- ProServiceClientHub.tsx:1591 (frontend) to a server-side
-- AFTER INSERT trigger on pro_service_requests.
--
-- Latent bug noted (5th of the chantier) : the frontend invoke
-- payload used `html` as field name, but the send-notification-email
-- Edge Function expects `body_html` (cf. Lot A v21+ contract).
-- The email body was therefore empty / undefined even before
-- the 401-silent — the user would have received subject only,
-- if anything.
--
-- Scenario covered :
--   Z1 — Client submits Pro Service request → confirmation email
--
-- Locale derivation : pro_service_requests.project_country is
-- a free-form text column (full name OR 2-letter code). Same
-- mapping as Lot C admin-info-request.
--
-- Reuses : infer_email_locale (Lot A), render_transactional_email
-- (post-quality-pass), send_transactional_email (Lot A, 15s
-- timeout).
-- ============================================================

CREATE OR REPLACE FUNCTION public._email_pro_service_request_created(
  p_locale            text,
  p_client_name       text,
  p_request_short     text,
  p_establishment     text,
  p_project_type      text
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_subject text;
  v_title   text;
  v_body    text;
  v_greet   text;
  v_project text;
BEGIN
  v_greet   := COALESCE(' ' || NULLIF(p_client_name, ''), '');
  v_project := COALESCE(NULLIF(p_establishment, ''), 'votre projet');

  CASE p_locale
    WHEN 'fr' THEN
      v_subject := 'Votre demande Pro Service a été enregistrée';
      v_title   := 'Demande reçue';
      v_body    := 'Bonjour' || v_greet || ', nous vous remercions d''avoir confié votre projet à Terrassea. '
                || 'Votre demande Pro Service pour <strong>' || v_project || '</strong> '
                || '(dossier <strong>#' || coalesce(p_request_short, '') || '</strong>) '
                || 'a bien été enregistrée. '
                || 'Notre équipe étudie chaque dossier avec attention et reviendra vers vous sous 24 à 48 heures '
                || 'pour vous accompagner dans la suite — sourcing des partenaires, devis, et suivi de projet.';
    WHEN 'es' THEN
      v_subject := 'Su solicitud Pro Service ha sido registrada';
      v_title   := 'Solicitud recibida';
      v_body    := 'Hola' || v_greet || ', le agradecemos haber confiado su proyecto a Terrassea. '
                || 'Su solicitud Pro Service para <strong>' || COALESCE(NULLIF(p_establishment, ''), 'su proyecto') || '</strong> '
                || '(expediente <strong>#' || coalesce(p_request_short, '') || '</strong>) '
                || 'ha sido registrada. '
                || 'Nuestro equipo estudia cada expediente con atención y volverá a contactarle '
                || 'en un plazo de 24 a 48 horas para acompañarle en los siguientes pasos — '
                || 'búsqueda de socios, presupuestos y seguimiento del proyecto.';
    WHEN 'it' THEN
      v_subject := 'La Sua richiesta Pro Service è stata registrata';
      v_title   := 'Richiesta ricevuta';
      v_body    := 'Buongiorno' || v_greet || ', La ringraziamo per aver affidato il Suo progetto a Terrassea. '
                || 'La Sua richiesta Pro Service per <strong>' || COALESCE(NULLIF(p_establishment, ''), 'il Suo progetto') || '</strong> '
                || '(pratica <strong>#' || coalesce(p_request_short, '') || '</strong>) '
                || 'è stata registrata. '
                || 'Il nostro team esamina ogni pratica con cura e La ricontatterà entro 24-48 ore '
                || 'per accompagnarLa nei prossimi passi — ricerca di partner, preventivi e gestione del progetto.';
    ELSE
      v_subject := 'Your Pro Service request has been received';
      v_title   := 'Request received';
      v_body    := 'Hello' || v_greet || ', thank you for entrusting your project to Terrassea. '
                || 'Your Pro Service request for <strong>' || COALESCE(NULLIF(p_establishment, ''), 'your project') || '</strong> '
                || '(file <strong>#' || coalesce(p_request_short, '') || '</strong>) '
                || 'has been received. '
                || 'Our team reviews each file carefully and will get back to you within 24 to 48 hours '
                || 'to support the next steps — partner sourcing, quotes, and project follow-up.';
  END CASE;

  RETURN jsonb_build_object(
    'subject',   v_subject,
    'body_html', public.render_transactional_email(p_locale, v_title, v_body),
    'body_text', regexp_replace(v_body, '<[^>]+>', '', 'g')
  );
END;
$$;

-- ── Trigger function : AFTER INSERT → Z1 client confirmation
CREATE OR REPLACE FUNCTION public.notify_pro_service_request_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, pg_temp
AS $$
DECLARE
  v_locale         text;
  v_request_short  text;
  v_payload        jsonb;
BEGIN
  IF NEW.client_email IS NULL OR NEW.client_email = '' THEN
    RETURN NEW;
  END IF;

  v_request_short := upper(substring(NEW.id::text from 1 for 8));

  -- Locale derivation from project_country (free-form text)
  v_locale := CASE
    WHEN NEW.project_country IS NULL OR btrim(NEW.project_country) = '' THEN 'fr'
    WHEN upper(left(btrim(NEW.project_country), 2)) IN ('FR', 'BE', 'CH', 'LU', 'MC') THEN 'fr'
    WHEN upper(left(btrim(NEW.project_country), 2)) = 'IT' THEN 'it'
    WHEN upper(left(btrim(NEW.project_country), 2)) = 'ES' THEN 'es'
    WHEN upper(left(btrim(NEW.project_country), 2)) IN ('GB', 'UK', 'IE', 'US', 'AU') THEN 'en'
    WHEN lower(NEW.project_country) LIKE 'fran%' OR lower(NEW.project_country) LIKE 'belg%'
      OR lower(NEW.project_country) LIKE 'suis%' OR lower(NEW.project_country) LIKE 'swit%'
      OR lower(NEW.project_country) LIKE 'luxem%' OR lower(NEW.project_country) LIKE 'mona%' THEN 'fr'
    WHEN lower(NEW.project_country) LIKE 'ital%' THEN 'it'
    WHEN lower(NEW.project_country) LIKE 'span%' OR lower(NEW.project_country) LIKE 'espa%' THEN 'es'
    ELSE 'en'
  END;

  v_payload := public._email_pro_service_request_created(
    v_locale,
    NEW.client_name,
    v_request_short,
    NEW.establishment_name,
    NEW.project_type
  );

  PERFORM public.send_transactional_email(
    NEW.client_email,
    v_payload->>'subject',
    v_payload->>'body_html',
    v_payload->>'body_text'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_pro_service_request_created ON public.pro_service_requests;
CREATE TRIGGER trg_notify_pro_service_request_created
AFTER INSERT ON public.pro_service_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_pro_service_request_created();

-- ── Validation ──
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = '_email_pro_service_request_created' AND pronamespace='public'::regnamespace) THEN
    RAISE EXCEPTION '_email_pro_service_request_created missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'notify_pro_service_request_created' AND pronamespace='public'::regnamespace) THEN
    RAISE EXCEPTION 'notify_pro_service_request_created missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname='trg_notify_pro_service_request_created'
      AND tgrelid='public.pro_service_requests'::regclass
  ) THEN
    RAISE EXCEPTION 'trg_notify_pro_service_request_created missing';
  END IF;
  RAISE NOTICE 'OK Dette 59 Lot D — Pro Service confirmation trigger in place';
END $$;
