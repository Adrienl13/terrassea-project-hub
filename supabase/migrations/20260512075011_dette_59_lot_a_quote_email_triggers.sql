-- ============================================================
-- Dette 59 Lot A — Quote lifecycle email triggers
-- Date : 2026-05-12
--
-- Moves the 3 quote-related emails from frontend
-- `supabase.functions.invoke("send-notification-email")`
-- (currently 401-silent because the JS client cannot provide
--  Bearer SERVICE_ROLE_KEY in this Supabase 2026 project) to
-- server-side DB triggers that call pg_net with the
-- X-Trigger-Secret pattern validated by Bug #1 / Lot 0.
--
-- Scenarios covered :
--   X1 — Client INSERTs a quote_request           → confirmation to client
--   X2 — Partner UPDATE quote.status='replied'    → notify client
--   X3 — partner_id transitions NULL → not-null   → notify partner
--          (whether on INSERT (auto-assign at create) or
--           UPDATE (admin manual assign / auto-workflow))
--
-- Locale derivation : infer_email_locale(country_code).
-- HTML wrapper      : render_transactional_email(...).
-- pg_net helper     : send_transactional_email(...).
--
-- Existing in-app notification logic in notify_quote_status_changed
-- is PRESERVED INTACT (lines that INSERT into notifications).
-- ============================================================

-- ── Helper: locale from country_code ─────────────────────────
CREATE OR REPLACE FUNCTION public.infer_email_locale(p_country_code text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE upper(coalesce(p_country_code, ''))
    WHEN 'FR' THEN 'fr'
    WHEN 'BE' THEN 'fr'
    WHEN 'CH' THEN 'fr'
    WHEN 'LU' THEN 'fr'
    WHEN 'MC' THEN 'fr'
    WHEN 'IT' THEN 'it'
    WHEN 'ES' THEN 'es'
    ELSE 'en'
  END;
$$;

-- ── Helper: render the transactional HTML wrapper ────────────
CREATE OR REPLACE FUNCTION public.render_transactional_email(
  p_locale  text,
  p_title   text,
  p_body    text,
  p_cta_text text DEFAULT NULL,
  p_cta_url  text DEFAULT NULL
) RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_cta_html text := '';
  v_footer_tagline text;
  v_disclaimer text;
BEGIN
  IF p_cta_text IS NOT NULL AND p_cta_url IS NOT NULL THEN
    v_cta_html := '<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:24px auto 0;"><tr><td style="background-color:#1a1a1a;"><a href="'
      || p_cta_url
      || '" target="_blank" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;">'
      || p_cta_text
      || '</a></td></tr></table>';
  END IF;

  v_disclaimer := CASE p_locale
    WHEN 'fr' THEN 'Notification automatique Terrassea Hub.'
    WHEN 'es' THEN 'Notificación automática Terrassea Hub.'
    WHEN 'it' THEN 'Notifica automatica Terrassea Hub.'
    ELSE 'Automated Terrassea Hub notification.'
  END;

  v_footer_tagline := 'AI marketplace for hospitality projects';

  RETURN
    '<!doctype html><html lang="' || p_locale || '"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>'
    || '<body style="margin:0;padding:0;background-color:#f5f3f0;font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;color:#1a1a1a;">'
    || '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f5f3f0;"><tr><td align="center" style="padding:24px 12px;">'
    || '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:#ffffff;">'
    || '<tr><td style="background-color:#1a1a1a;padding:32px 40px;text-align:center;">'
    || '<h1 style="color:#ffffff;font-size:22px;letter-spacing:5px;font-weight:600;margin:0;line-height:1.2;">TERRASSEA <span style="color:#d4603a;">HUB</span></h1>'
    || '</td></tr>'
    || '<tr><td style="padding:40px 40px 16px;">'
    || '<h2 style="color:#1a1a1a;font-size:20px;font-weight:600;margin:0 0 16px;line-height:1.35;">' || p_title || '</h2>'
    || '<p style="color:#333333;font-size:15px;line-height:1.7;margin:0;">' || p_body || '</p>'
    || '</td></tr>'
    || CASE WHEN v_cta_html <> '' THEN '<tr><td style="padding:0 40px 32px;">' || v_cta_html || '</td></tr>' ELSE '' END
    || '<tr><td style="background-color:#1a1a1a;padding:18px 40px;text-align:center;">'
    || '<p style="color:#a3a3a3;font-size:10px;margin:0;letter-spacing:2px;">TERRASSEA HUB</p>'
    || '<p style="color:#666666;font-size:10px;margin:6px 0 0;line-height:1.5;">' || v_footer_tagline || '<br/>' || v_disclaimer || '</p>'
    || '</td></tr>'
    || '</table></td></tr></table></body></html>';
END;
$$;

-- ── Helper: pg_net.http_post to send-notification-email ──────
CREATE OR REPLACE FUNCTION public.send_transactional_email(
  p_to        text,
  p_subject   text,
  p_body_html text,
  p_body_text text
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, pg_temp
AS $$
DECLARE
  v_secret text;
  v_request_id bigint;
BEGIN
  IF p_to IS NULL OR p_to = '' THEN RETURN NULL; END IF;

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'EDGE_TRIGGER_SECRET'
  LIMIT 1;

  IF v_secret IS NULL THEN RETURN NULL; END IF;

  -- 15s timeout to absorb Edge Function cold starts (pg_net default 5s is too tight,
  -- proven by Lot A smoke test 2026-05-12 where the first INSERT timed out at 5019ms).
  SELECT net.http_post(
    url := 'https://gwgcfgeouropcighpztj.supabase.co/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'X-Trigger-Secret', v_secret,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'to', p_to,
      'subject', p_subject,
      'body_html', p_body_html,
      'body_text', p_body_text
    ),
    timeout_milliseconds := 15000
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_transactional_email(text, text, text, text)
  FROM anon, PUBLIC;

-- ── Internal helpers: per-scenario email render ──────────────

CREATE OR REPLACE FUNCTION public._email_quote_created_client(
  p_locale text, p_name text, p_product_name text
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE v_subject text; v_title text; v_body text; v_cta_text text;
BEGIN
  CASE p_locale
    WHEN 'fr' THEN
      v_subject := 'Votre demande de devis a été enregistrée — Terrassea';
      v_title   := 'Demande enregistrée';
      v_body    := 'Bonjour ' || coalesce(p_name, '') || ', votre demande de devis pour <strong>'
                || coalesce(p_product_name, 'votre projet')
                || '</strong> a bien été reçue. Notre équipe vous met en relation avec un partenaire qualifié sous peu.';
      v_cta_text := 'Suivre ma demande';
    WHEN 'es' THEN
      v_subject := 'Tu solicitud de presupuesto ha sido registrada — Terrassea';
      v_title   := 'Solicitud registrada';
      v_body    := 'Hola ' || coalesce(p_name, '') || ', tu solicitud de presupuesto para <strong>'
                || coalesce(p_product_name, 'tu proyecto')
                || '</strong> ha sido recibida. Nuestro equipo te conectará con un socio cualificado en breve.';
      v_cta_text := 'Seguir mi solicitud';
    WHEN 'it' THEN
      v_subject := 'La tua richiesta di preventivo è stata registrata — Terrassea';
      v_title   := 'Richiesta registrata';
      v_body    := 'Ciao ' || coalesce(p_name, '') || ', la tua richiesta di preventivo per <strong>'
                || coalesce(p_product_name, 'il tuo progetto')
                || '</strong> è stata ricevuta. Il nostro team ti metterà in contatto con un partner qualificato a breve.';
      v_cta_text := 'Seguire la mia richiesta';
    ELSE
      v_subject := 'Your quote request has been registered — Terrassea';
      v_title   := 'Request registered';
      v_body    := 'Hello ' || coalesce(p_name, '') || ', your quote request for <strong>'
                || coalesce(p_product_name, 'your project')
                || '</strong> has been received. Our team will connect you with a qualified partner shortly.';
      v_cta_text := 'Track my request';
  END CASE;

  RETURN jsonb_build_object(
    'subject',   v_subject,
    'body_html', render_transactional_email(p_locale, v_title, v_body, v_cta_text, 'https://terrassea.com/account'),
    'body_text', regexp_replace(v_body, '<[^>]+>', '', 'g')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public._email_quote_assigned_partner(
  p_locale text, p_partner_name text, p_product_name text
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE v_subject text; v_title text; v_body text; v_cta_text text;
BEGIN
  CASE p_locale
    WHEN 'fr' THEN
      v_subject := 'Nouvelle demande de devis — Terrassea';
      v_title   := 'Nouvelle demande de devis';
      v_body    := 'Bonjour ' || coalesce(p_partner_name, '') || ', une demande de devis vient de vous être attribuée pour <strong>'
                || coalesce(p_product_name, 'un produit')
                || '</strong>. Connectez-vous à votre espace partenaire pour répondre sous 48h.';
      v_cta_text := 'Consulter la demande';
    WHEN 'es' THEN
      v_subject := 'Nueva solicitud de presupuesto — Terrassea';
      v_title   := 'Nueva solicitud de presupuesto';
      v_body    := 'Hola ' || coalesce(p_partner_name, '') || ', se te acaba de asignar una solicitud de presupuesto para <strong>'
                || coalesce(p_product_name, 'un producto')
                || '</strong>. Conéctate a tu espacio socio para responder en 48h.';
      v_cta_text := 'Consultar la solicitud';
    WHEN 'it' THEN
      v_subject := 'Nuova richiesta di preventivo — Terrassea';
      v_title   := 'Nuova richiesta di preventivo';
      v_body    := 'Ciao ' || coalesce(p_partner_name, '') || ', ti è appena stata assegnata una richiesta di preventivo per <strong>'
                || coalesce(p_product_name, 'un prodotto')
                || '</strong>. Accedi al tuo spazio partner per rispondere entro 48h.';
      v_cta_text := 'Consulta la richiesta';
    ELSE
      v_subject := 'New quote request — Terrassea';
      v_title   := 'New quote request';
      v_body    := 'Hello ' || coalesce(p_partner_name, '') || ', a quote request has just been assigned to you for <strong>'
                || coalesce(p_product_name, 'a product')
                || '</strong>. Sign in to your partner space to reply within 48h.';
      v_cta_text := 'Open the request';
  END CASE;

  RETURN jsonb_build_object(
    'subject',   v_subject,
    'body_html', render_transactional_email(p_locale, v_title, v_body, v_cta_text, 'https://terrassea.com/account'),
    'body_text', regexp_replace(v_body, '<[^>]+>', '', 'g')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public._email_quote_replied_client(
  p_locale text, p_name text, p_product_name text
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE v_subject text; v_title text; v_body text; v_cta_text text;
BEGIN
  CASE p_locale
    WHEN 'fr' THEN
      v_subject := 'Un partenaire a répondu à votre devis — Terrassea';
      v_title   := 'Réponse reçue';
      v_body    := 'Bonjour ' || coalesce(p_name, '') || ', un partenaire a répondu à votre demande de devis pour <strong>'
                || coalesce(p_product_name, 'votre demande')
                || '</strong>. Consultez l''offre dès maintenant dans votre espace.';
      v_cta_text := 'Voir le devis';
    WHEN 'es' THEN
      v_subject := 'Un socio ha respondido a tu presupuesto — Terrassea';
      v_title   := 'Respuesta recibida';
      v_body    := 'Hola ' || coalesce(p_name, '') || ', un socio ha respondido a tu solicitud de presupuesto para <strong>'
                || coalesce(p_product_name, 'tu solicitud')
                || '</strong>. Consulta la oferta ahora en tu espacio.';
      v_cta_text := 'Ver el presupuesto';
    WHEN 'it' THEN
      v_subject := 'Un partner ha risposto al tuo preventivo — Terrassea';
      v_title   := 'Risposta ricevuta';
      v_body    := 'Ciao ' || coalesce(p_name, '') || ', un partner ha risposto alla tua richiesta di preventivo per <strong>'
                || coalesce(p_product_name, 'la tua richiesta')
                || '</strong>. Consulta l''offerta ora nel tuo spazio.';
      v_cta_text := 'Visualizza il preventivo';
    ELSE
      v_subject := 'A partner replied to your quote request — Terrassea';
      v_title   := 'Reply received';
      v_body    := 'Hello ' || coalesce(p_name, '') || ', a partner has replied to your quote request for <strong>'
                || coalesce(p_product_name, 'your request')
                || '</strong>. Check the offer now in your space.';
      v_cta_text := 'View quote';
  END CASE;

  RETURN jsonb_build_object(
    'subject',   v_subject,
    'body_html', render_transactional_email(p_locale, v_title, v_body, v_cta_text, 'https://terrassea.com/account'),
    'body_text', regexp_replace(v_body, '<[^>]+>', '', 'g')
  );
END;
$$;

-- ── Trigger fn: AFTER INSERT on quote_requests (X1 + X3-INSERT)
CREATE OR REPLACE FUNCTION public.notify_quote_request_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, pg_temp
AS $$
DECLARE
  v_locale         text;
  v_partner_locale text;
  v_partner_email  text;
  v_partner_name   text;
  v_partner_country text;
  v_payload        jsonb;
BEGIN
  -- X1: confirmation to client
  IF NEW.email IS NOT NULL THEN
    v_locale := public.infer_email_locale(NEW.client_country_code);
    v_payload := public._email_quote_created_client(v_locale, NEW.client_first_name, NEW.product_name);
    PERFORM public.send_transactional_email(
      NEW.email,
      v_payload->>'subject',
      v_payload->>'body_html',
      v_payload->>'body_text'
    );
  END IF;

  -- X3 (INSERT path): if partner_id already set at create time (auto-assign on insert
  -- when product has 1 active offer, or when frontend pre-assigns), notify the partner.
  IF NEW.partner_id IS NOT NULL THEN
    SELECT contact_email, name, country_code
    INTO v_partner_email, v_partner_name, v_partner_country
    FROM public.partners WHERE id = NEW.partner_id;

    IF v_partner_email IS NOT NULL THEN
      v_partner_locale := public.infer_email_locale(v_partner_country);
      v_payload := public._email_quote_assigned_partner(v_partner_locale, v_partner_name, NEW.product_name);
      PERFORM public.send_transactional_email(
        v_partner_email,
        v_payload->>'subject',
        v_payload->>'body_html',
        v_payload->>'body_text'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_quote_request_created ON public.quote_requests;
CREATE TRIGGER trg_notify_quote_request_created
AFTER INSERT ON public.quote_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_quote_request_created();

-- ── Extend notify_quote_status_changed: keep in-app notif + add email ───
-- Preserves the existing in-app `notifications` insert (X2 client side)
-- and adds : pg_net email to client on status='replied', pg_net email
-- to partner on partner_id transition NULL -> not-null.
CREATE OR REPLACE FUNCTION public.notify_quote_status_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, pg_temp
AS $$
DECLARE
  client_uid UUID;
  status_label TEXT;
  v_locale text;
  v_payload jsonb;
  v_partner_email text;
  v_partner_name text;
  v_partner_country text;
  v_partner_locale text;
BEGIN
  -- X3 UPDATE: partner_id transition NULL -> not-null (admin assigns / auto-workflow)
  IF (OLD.partner_id IS NULL OR OLD.partner_id IS DISTINCT FROM NEW.partner_id)
     AND NEW.partner_id IS NOT NULL
     AND OLD.partner_id IS NULL
  THEN
    SELECT contact_email, name, country_code
    INTO v_partner_email, v_partner_name, v_partner_country
    FROM public.partners WHERE id = NEW.partner_id;

    IF v_partner_email IS NOT NULL THEN
      v_partner_locale := public.infer_email_locale(v_partner_country);
      v_payload := public._email_quote_assigned_partner(v_partner_locale, v_partner_name, NEW.product_name);
      PERFORM public.send_transactional_email(
        v_partner_email,
        v_payload->>'subject',
        v_payload->>'body_html',
        v_payload->>'body_text'
      );
    END IF;
  END IF;

  -- Only fire on actual status change for the rest
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- ── PRESERVED: in-app notification ────────────────────────
  SELECT up.id INTO client_uid
  FROM public.user_profiles up
  WHERE up.email = NEW.email;

  IF NEW.status = 'replied' THEN
    status_label := 'Devis reçu';
  ELSIF NEW.status = 'accepted' OR NEW.status = 'signed' THEN
    status_label := 'Devis signé';
  ELSIF NEW.status = 'expired' THEN
    status_label := 'Devis expiré';
  ELSE
    RETURN NEW;
  END IF;

  IF client_uid IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      client_uid,
      'quote_status',
      status_label || ' — ' || COALESCE(NEW.product_name, 'Votre demande'),
      CASE NEW.status
        WHEN 'replied' THEN 'Un fournisseur a répondu à votre demande de devis pour "' || COALESCE(NEW.product_name, '') || '". Consultez le devis dans votre espace.'
        WHEN 'signed' THEN 'Votre devis pour "' || COALESCE(NEW.product_name, '') || '" a été signé avec succès. La commande va être créée automatiquement.'
        WHEN 'expired' THEN 'Le devis pour "' || COALESCE(NEW.product_name, '') || '" a expiré. Vous pouvez en demander un nouveau.'
        ELSE 'Statut de votre devis mis à jour.'
      END,
      '/account'
    );
  END IF;

  -- ── NEW: X2 client email on status='replied' ──────────────
  IF NEW.status = 'replied' AND NEW.email IS NOT NULL THEN
    v_locale := public.infer_email_locale(NEW.client_country_code);
    v_payload := public._email_quote_replied_client(v_locale, NEW.client_first_name, NEW.product_name);
    PERFORM public.send_transactional_email(
      NEW.email,
      v_payload->>'subject',
      v_payload->>'body_html',
      v_payload->>'body_text'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ── Validation ──
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'infer_email_locale' AND pronamespace='public'::regnamespace) THEN
    RAISE EXCEPTION 'infer_email_locale missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'render_transactional_email' AND pronamespace='public'::regnamespace) THEN
    RAISE EXCEPTION 'render_transactional_email missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'send_transactional_email' AND pronamespace='public'::regnamespace) THEN
    RAISE EXCEPTION 'send_transactional_email missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'notify_quote_request_created' AND pronamespace='public'::regnamespace) THEN
    RAISE EXCEPTION 'notify_quote_request_created missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname='trg_notify_quote_request_created'
      AND tgrelid='public.quote_requests'::regclass
  ) THEN
    RAISE EXCEPTION 'trg_notify_quote_request_created missing';
  END IF;
  RAISE NOTICE 'OK Dette 59 Lot A — quote email triggers in place';
END $$;
