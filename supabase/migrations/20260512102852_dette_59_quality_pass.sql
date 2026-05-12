-- ============================================================
-- Dette 59 — Quality pass (audit 2026-05-12)
--
-- One-shot rewrite of all transactional-email helpers from Lot A
-- and Lot B to reach international-platform quality :
--
--   • Formal voice across all 4 locales :
--     FR  → "vous / votre"
--     EN  → "Hello [name], …" with polite tone
--     ES  → "usted" treatment (su / le / acceda)
--     IT  → "Lei" treatment (capital Lei/La/Suo, Buongiorno)
--
--   • New help block in the wrapper : every transactional email
--     surfaces a "Besoin d'aide / Contact support" link below the
--     primary CTA, mailto:support@terrassea.com.
--
--   • Locale-aware currency : € prefix for EN, suffix elsewhere,
--     thousands/decimal separators per locale.
--
--   • Locale-aware date : DD/MM/YYYY for FR/ES/IT, "DD Mon YYYY"
--     for EN.
--
--   • Bugs fixed :
--       B1  Y3 CTA pointe vers /account?tab=orders (consistent),
--           "Laisser un avis" → "Voir ma commande" (review URL
--           sera adressée plus tard, le help block absorbe pour
--           l'instant les besoins post-livraison)
--       B2  Null-name guard : 'Bonjour ,' → 'Bonjour,' si nom null
--       B3  Typography colons ES/IT : pas d'espace avant ":"
--       B4  Y1 paramètres morts utilisés (order_short + total)
--
--   • Quality :
--       Q2  "pcs/uds/pz" → mots pleins (unités / units / unidades / unità)
--       Q4  Subjects nettoyés (drop "— Terrassea" trailing)
--       Q6  CTAs alignés
--       Q7  Référence order short visible dans Y1/Y2/Y3
--       Q8  Échéance paiement visible dans Y1
--
-- Lot A helpers signature unchanged. Lot B helper Y1 (payment
-- instructions) gains p_deposit_due_date parameter — trigger
-- notify_order_created updated to pass NEW.deposit_due_date.
-- ============================================================

-- ── New helper : locale-aware currency ──────────────────────
CREATE OR REPLACE FUNCTION public.format_currency_locale(p_amount numeric, p_locale text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_amt      numeric;
  v_int_part text;
  v_dec_part text;
  v_grouped  text;
BEGIN
  v_amt := round(coalesce(p_amount, 0), 2);
  v_int_part := split_part(to_char(v_amt, 'FM9999999999990.00'), '.', 1);
  v_dec_part := split_part(to_char(v_amt, 'FM9999999999990.00'), '.', 2);
  IF v_dec_part = '' OR v_dec_part IS NULL THEN v_dec_part := '00'; END IF;
  IF v_int_part = '' OR v_int_part IS NULL THEN v_int_part := '0'; END IF;

  CASE p_locale
    WHEN 'en' THEN
      v_grouped := reverse(regexp_replace(reverse(v_int_part), '(\d{3})(?=\d)', '\1,', 'g'));
      RETURN '€' || v_grouped || '.' || v_dec_part;
    WHEN 'fr' THEN
      v_grouped := reverse(regexp_replace(reverse(v_int_part), '(\d{3})(?=\d)', '\1 ', 'g'));
      RETURN v_grouped || ',' || v_dec_part || ' €';
    WHEN 'es' THEN
      v_grouped := reverse(regexp_replace(reverse(v_int_part), '(\d{3})(?=\d)', '\1.', 'g'));
      RETURN v_grouped || ',' || v_dec_part || ' €';
    WHEN 'it' THEN
      v_grouped := reverse(regexp_replace(reverse(v_int_part), '(\d{3})(?=\d)', '\1.', 'g'));
      RETURN v_grouped || ',' || v_dec_part || ' €';
    ELSE
      RETURN '€' || v_int_part || '.' || v_dec_part;
  END CASE;
END;
$$;

-- ── New helper : locale-aware date ──────────────────────────
CREATE OR REPLACE FUNCTION public.format_date_locale(p_date timestamptz, p_locale text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_locale
    WHEN 'en' THEN to_char(p_date AT TIME ZONE 'Europe/Paris', 'DD Mon YYYY')
    WHEN 'fr' THEN to_char(p_date AT TIME ZONE 'Europe/Paris', 'DD/MM/YYYY')
    WHEN 'es' THEN to_char(p_date AT TIME ZONE 'Europe/Paris', 'DD/MM/YYYY')
    WHEN 'it' THEN to_char(p_date AT TIME ZONE 'Europe/Paris', 'DD/MM/YYYY')
    ELSE             to_char(p_date AT TIME ZONE 'Europe/Paris', 'DD/MM/YYYY')
  END;
$$;

-- ── REPLACE wrapper : adds help block ───────────────────────
CREATE OR REPLACE FUNCTION public.render_transactional_email(
  p_locale   text,
  p_title    text,
  p_body     text,
  p_cta_text text DEFAULT NULL,
  p_cta_url  text DEFAULT NULL
) RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_cta_html       text := '';
  v_help_text      text;
  v_help_cta       text;
  v_footer_tagline text;
  v_disclaimer     text;
BEGIN
  IF p_cta_text IS NOT NULL AND p_cta_url IS NOT NULL THEN
    v_cta_html := '<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:24px auto 0;"><tr><td style="background-color:#1a1a1a;"><a href="'
      || p_cta_url
      || '" target="_blank" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;">'
      || p_cta_text
      || '</a></td></tr></table>';
  END IF;

  v_help_text := CASE p_locale
    WHEN 'fr' THEN 'Une question ou une modification à signaler ? Notre équipe vous répond rapidement.'
    WHEN 'es' THEN '¿Tiene alguna pregunta o necesita modificar algo? Nuestro equipo le responde con rapidez.'
    WHEN 'it' THEN 'Ha una domanda o desidera modificare qualcosa ? Il nostro team Le risponde rapidamente.'
    ELSE          'Have a question or need to amend something? Our team is here to help.'
  END;

  v_help_cta := CASE p_locale
    WHEN 'fr' THEN 'Contacter le support'
    WHEN 'es' THEN 'Contactar al soporte'
    WHEN 'it' THEN 'Contattare il supporto'
    ELSE          'Contact support'
  END;

  v_disclaimer := CASE p_locale
    WHEN 'fr' THEN 'Notification automatique Terrassea Hub.'
    WHEN 'es' THEN 'Notificación automática Terrassea Hub.'
    WHEN 'it' THEN 'Notifica automatica Terrassea Hub.'
    ELSE          'Automated Terrassea Hub notification.'
  END;

  v_footer_tagline := 'AI marketplace for hospitality projects';

  RETURN
    '<!doctype html><html lang="' || p_locale || '"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>'
    || '<body style="margin:0;padding:0;background-color:#f5f3f0;font-family:''Helvetica Neue'',Helvetica,Arial,sans-serif;color:#1a1a1a;">'
    || '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f5f3f0;"><tr><td align="center" style="padding:24px 12px;">'
    || '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:#ffffff;">'
    -- Header
    || '<tr><td style="background-color:#1a1a1a;padding:32px 40px;text-align:center;">'
    || '<h1 style="color:#ffffff;font-size:22px;letter-spacing:5px;font-weight:600;margin:0;line-height:1.2;">TERRASSEA <span style="color:#d4603a;">HUB</span></h1>'
    || '</td></tr>'
    -- Title + body
    || '<tr><td style="padding:40px 40px 16px;">'
    || '<h2 style="color:#1a1a1a;font-size:20px;font-weight:600;margin:0 0 16px;line-height:1.35;">' || p_title || '</h2>'
    || '<p style="color:#333333;font-size:15px;line-height:1.7;margin:0;">' || p_body || '</p>'
    || '</td></tr>'
    -- Primary CTA
    || CASE WHEN v_cta_html <> '' THEN '<tr><td style="padding:0 40px 16px;">' || v_cta_html || '</td></tr>' ELSE '' END
    -- Help block
    || '<tr><td style="padding:24px 40px 32px;border-top:1px solid #ebe8e3;">'
    || '<p style="margin:0 0 10px;color:#666666;font-size:13px;line-height:1.6;">' || v_help_text || '</p>'
    || '<a href="mailto:support@terrassea.com" style="display:inline-block;color:#d4603a;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.4px;">'
    || v_help_cta || ' &rarr;</a>'
    || '</td></tr>'
    -- Footer
    || '<tr><td style="background-color:#1a1a1a;padding:18px 40px;text-align:center;">'
    || '<p style="color:#a3a3a3;font-size:10px;margin:0;letter-spacing:2px;">TERRASSEA HUB</p>'
    || '<p style="color:#666666;font-size:10px;margin:6px 0 0;line-height:1.5;">' || v_footer_tagline || '<br/>' || v_disclaimer || '</p>'
    || '</td></tr>'
    || '</table></td></tr></table></body></html>';
END;
$$;

-- ============================================================
-- LOT A helpers — rewritten in formal voice
-- ============================================================

CREATE OR REPLACE FUNCTION public._email_quote_created_client(
  p_locale text, p_name text, p_product_name text
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE v_subject text; v_title text; v_body text; v_cta_text text; v_greet text;
BEGIN
  v_greet := COALESCE(' ' || NULLIF(p_name, ''), '');
  CASE p_locale
    WHEN 'fr' THEN
      v_subject := 'Votre demande de devis a été enregistrée';
      v_title   := 'Demande enregistrée';
      v_body    := 'Bonjour' || v_greet || ', votre demande de devis pour <strong>'
                || coalesce(p_product_name, 'votre projet')
                || '</strong> a bien été reçue. Notre équipe vous met en relation avec un partenaire qualifié sous 24 à 48 heures.';
      v_cta_text := 'Suivre ma demande';
    WHEN 'es' THEN
      v_subject := 'Su solicitud de presupuesto ha sido registrada';
      v_title   := 'Solicitud registrada';
      v_body    := 'Hola' || v_greet || ', su solicitud de presupuesto para <strong>'
                || coalesce(p_product_name, 'su proyecto')
                || '</strong> ha sido recibida. Nuestro equipo le pondrá en contacto con un socio cualificado en un plazo de 24 a 48 horas.';
      v_cta_text := 'Seguir mi solicitud';
    WHEN 'it' THEN
      v_subject := 'La Sua richiesta di preventivo è stata registrata';
      v_title   := 'Richiesta registrata';
      v_body    := 'Buongiorno' || v_greet || ', la Sua richiesta di preventivo per <strong>'
                || coalesce(p_product_name, 'il Suo progetto')
                || '</strong> è stata ricevuta. Il nostro team La metterà in contatto con un partner qualificato entro 24-48 ore.';
      v_cta_text := 'Seguire la mia richiesta';
    ELSE
      v_subject := 'Your quote request has been registered';
      v_title   := 'Request registered';
      v_body    := 'Hello' || v_greet || ', your quote request for <strong>'
                || coalesce(p_product_name, 'your project')
                || '</strong> has been received. Our team will connect you with a qualified partner within 24 to 48 hours.';
      v_cta_text := 'Track my request';
  END CASE;
  RETURN jsonb_build_object(
    'subject',   v_subject,
    'body_html', public.render_transactional_email(p_locale, v_title, v_body, v_cta_text, 'https://terrassea.com/account'),
    'body_text', regexp_replace(v_body, '<[^>]+>', '', 'g')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public._email_quote_assigned_partner(
  p_locale text, p_partner_name text, p_product_name text
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE v_subject text; v_title text; v_body text; v_cta_text text; v_greet text;
BEGIN
  v_greet := COALESCE(' ' || NULLIF(p_partner_name, ''), '');
  CASE p_locale
    WHEN 'fr' THEN
      v_subject := 'Nouvelle demande de devis';
      v_title   := 'Nouvelle demande de devis';
      v_body    := 'Bonjour' || v_greet || ', une demande de devis vient de vous être attribuée pour <strong>'
                || coalesce(p_product_name, 'un produit')
                || '</strong>. Connectez-vous à votre espace partenaire pour y répondre sous 48 heures.';
      v_cta_text := 'Consulter la demande';
    WHEN 'es' THEN
      v_subject := 'Nueva solicitud de presupuesto';
      v_title   := 'Nueva solicitud de presupuesto';
      v_body    := 'Hola' || v_greet || ', se le acaba de asignar una solicitud de presupuesto para <strong>'
                || coalesce(p_product_name, 'un producto')
                || '</strong>. Acceda a su espacio socio para responder en un plazo de 48 horas.';
      v_cta_text := 'Consultar la solicitud';
    WHEN 'it' THEN
      v_subject := 'Nuova richiesta di preventivo';
      v_title   := 'Nuova richiesta di preventivo';
      v_body    := 'Buongiorno' || v_greet || ', Le è appena stata assegnata una richiesta di preventivo per <strong>'
                || coalesce(p_product_name, 'un prodotto')
                || '</strong>. Acceda al Suo spazio partner per rispondere entro 48 ore.';
      v_cta_text := 'Consultare la richiesta';
    ELSE
      v_subject := 'New quote request';
      v_title   := 'New quote request';
      v_body    := 'Hello' || v_greet || ', a quote request has just been assigned to you for <strong>'
                || coalesce(p_product_name, 'a product')
                || '</strong>. Sign in to your partner space to reply within 48 hours.';
      v_cta_text := 'Open the request';
  END CASE;
  RETURN jsonb_build_object(
    'subject',   v_subject,
    'body_html', public.render_transactional_email(p_locale, v_title, v_body, v_cta_text, 'https://terrassea.com/account'),
    'body_text', regexp_replace(v_body, '<[^>]+>', '', 'g')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public._email_quote_replied_client(
  p_locale text, p_name text, p_product_name text
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE v_subject text; v_title text; v_body text; v_cta_text text; v_greet text;
BEGIN
  v_greet := COALESCE(' ' || NULLIF(p_name, ''), '');
  CASE p_locale
    WHEN 'fr' THEN
      v_subject := 'Un partenaire a répondu à votre devis';
      v_title   := 'Réponse reçue';
      v_body    := 'Bonjour' || v_greet || ', un partenaire a répondu à votre demande de devis pour <strong>'
                || coalesce(p_product_name, 'votre demande')
                || '</strong>. Consultez l''offre dès maintenant dans votre espace.';
      v_cta_text := 'Voir le devis';
    WHEN 'es' THEN
      v_subject := 'Un socio ha respondido a su presupuesto';
      v_title   := 'Respuesta recibida';
      v_body    := 'Hola' || v_greet || ', un socio ha respondido a su solicitud de presupuesto para <strong>'
                || coalesce(p_product_name, 'su solicitud')
                || '</strong>. Consulte la oferta ahora en su espacio.';
      v_cta_text := 'Ver el presupuesto';
    WHEN 'it' THEN
      v_subject := 'Un partner ha risposto al Suo preventivo';
      v_title   := 'Risposta ricevuta';
      v_body    := 'Buongiorno' || v_greet || ', un partner ha risposto alla Sua richiesta di preventivo per <strong>'
                || coalesce(p_product_name, 'la Sua richiesta')
                || '</strong>. Consulti l''offerta ora nel Suo spazio.';
      v_cta_text := 'Visualizzare il preventivo';
    ELSE
      v_subject := 'A partner replied to your quote request';
      v_title   := 'Reply received';
      v_body    := 'Hello' || v_greet || ', a partner has replied to your quote request for <strong>'
                || coalesce(p_product_name, 'your request')
                || '</strong>. Review the offer now in your space.';
      v_cta_text := 'View the quote';
  END CASE;
  RETURN jsonb_build_object(
    'subject',   v_subject,
    'body_html', public.render_transactional_email(p_locale, v_title, v_body, v_cta_text, 'https://terrassea.com/account'),
    'body_text', regexp_replace(v_body, '<[^>]+>', '', 'g')
  );
END;
$$;

-- ============================================================
-- LOT B helpers — rewritten in formal voice + all fixes
-- ============================================================

-- Y1 — signature changes : adds p_deposit_due_date
CREATE OR REPLACE FUNCTION public._email_order_payment_instructions_client(
  p_locale            text,
  p_client_name       text,
  p_product_name      text,
  p_order_short       text,
  p_deposit_amount    numeric,
  p_total_amount      numeric,
  p_payment_reference text,
  p_beneficiary       text,
  p_iban              text,
  p_bic               text,
  p_bank_name         text,
  p_deposit_due_date  timestamptz DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_subject  text;
  v_title    text;
  v_body     text;
  v_cta_text text;
  v_greet    text;
  v_deposit  text;
  v_total    text;
  v_due_line text := '';
BEGIN
  v_greet   := COALESCE(' ' || NULLIF(p_client_name, ''), '');
  v_deposit := public.format_currency_locale(p_deposit_amount, p_locale);
  v_total   := public.format_currency_locale(p_total_amount, p_locale);

  CASE p_locale
    WHEN 'fr' THEN
      IF p_deposit_due_date IS NOT NULL THEN
        v_due_line := '<strong>Échéance :</strong> ' || public.format_date_locale(p_deposit_due_date, 'fr') || '<br/>';
      END IF;
      v_subject := 'Instructions de paiement — votre commande est confirmée';
      v_title   := 'Votre commande est confirmée';
      v_body    := 'Bonjour' || v_greet || ', nous vous remercions d''avoir signé votre devis. Votre commande <strong>#'
                || coalesce(p_order_short, '') || '</strong> pour <strong>'
                || coalesce(p_product_name, 'votre projet') || '</strong> est confirmée.<br/><br/>'
                || 'Veuillez trouver ci-dessous les informations pour régler l''acompte de <strong>' || v_deposit
                || '</strong> par virement bancaire :<br/><br/>'
                || '<strong>Bénéficiaire :</strong> ' || coalesce(p_beneficiary, '—') || '<br/>'
                || '<strong>IBAN :</strong> ' || coalesce(p_iban, '—') || '<br/>'
                || '<strong>BIC :</strong> ' || coalesce(p_bic, '—') || '<br/>'
                || '<strong>Banque :</strong> ' || coalesce(p_bank_name, '—') || '<br/>'
                || '<strong>Référence à indiquer :</strong> ' || coalesce(p_payment_reference, '—') || '<br/>'
                || v_due_line
                || '<br/>'
                || 'Montant total de la commande : <strong>' || v_total || '</strong> (acompte 30 %, solde dû à la livraison).<br/><br/>'
                || 'Dès réception du virement, votre commande est transmise à notre partenaire pour préparation.';
      v_cta_text := 'Voir ma commande';
    WHEN 'es' THEN
      IF p_deposit_due_date IS NOT NULL THEN
        v_due_line := '<strong>Vencimiento:</strong> ' || public.format_date_locale(p_deposit_due_date, 'es') || '<br/>';
      END IF;
      v_subject := 'Instrucciones de pago — su pedido está confirmado';
      v_title   := 'Su pedido está confirmado';
      v_body    := 'Hola' || v_greet || ', le agradecemos haber firmado su presupuesto. Su pedido <strong>#'
                || coalesce(p_order_short, '') || '</strong> para <strong>'
                || coalesce(p_product_name, 'su proyecto') || '</strong> está confirmado.<br/><br/>'
                || 'A continuación encontrará los datos para abonar el anticipo de <strong>' || v_deposit
                || '</strong> por transferencia bancaria:<br/><br/>'
                || '<strong>Beneficiario:</strong> ' || coalesce(p_beneficiary, '—') || '<br/>'
                || '<strong>IBAN:</strong> ' || coalesce(p_iban, '—') || '<br/>'
                || '<strong>BIC:</strong> ' || coalesce(p_bic, '—') || '<br/>'
                || '<strong>Banco:</strong> ' || coalesce(p_bank_name, '—') || '<br/>'
                || '<strong>Referencia a indicar:</strong> ' || coalesce(p_payment_reference, '—') || '<br/>'
                || v_due_line
                || '<br/>'
                || 'Importe total del pedido: <strong>' || v_total || '</strong> (anticipo del 30 %, saldo a la entrega).<br/><br/>'
                || 'Una vez recibida la transferencia, su pedido se transmite a nuestro socio para su preparación.';
      v_cta_text := 'Ver mi pedido';
    WHEN 'it' THEN
      IF p_deposit_due_date IS NOT NULL THEN
        v_due_line := '<strong>Scadenza:</strong> ' || public.format_date_locale(p_deposit_due_date, 'it') || '<br/>';
      END IF;
      v_subject := 'Istruzioni di pagamento — il Suo ordine è confermato';
      v_title   := 'Il Suo ordine è confermato';
      v_body    := 'Buongiorno' || v_greet || ', La ringraziamo per aver firmato il Suo preventivo. Il Suo ordine <strong>#'
                || coalesce(p_order_short, '') || '</strong> per <strong>'
                || coalesce(p_product_name, 'il Suo progetto') || '</strong> è confermato.<br/><br/>'
                || 'Di seguito trova i dati per saldare l''acconto di <strong>' || v_deposit
                || '</strong> tramite bonifico bancario:<br/><br/>'
                || '<strong>Beneficiario:</strong> ' || coalesce(p_beneficiary, '—') || '<br/>'
                || '<strong>IBAN:</strong> ' || coalesce(p_iban, '—') || '<br/>'
                || '<strong>BIC:</strong> ' || coalesce(p_bic, '—') || '<br/>'
                || '<strong>Banca:</strong> ' || coalesce(p_bank_name, '—') || '<br/>'
                || '<strong>Riferimento da indicare:</strong> ' || coalesce(p_payment_reference, '—') || '<br/>'
                || v_due_line
                || '<br/>'
                || 'Importo totale dell''ordine: <strong>' || v_total || '</strong> (acconto 30 %, saldo alla consegna).<br/><br/>'
                || 'Alla ricezione del bonifico, il Suo ordine viene trasmesso al nostro partner per la preparazione.';
      v_cta_text := 'Vedere il mio ordine';
    ELSE
      IF p_deposit_due_date IS NOT NULL THEN
        v_due_line := '<strong>Due date:</strong> ' || public.format_date_locale(p_deposit_due_date, 'en') || '<br/>';
      END IF;
      v_subject := 'Payment instructions — your order is confirmed';
      v_title   := 'Your order is confirmed';
      v_body    := 'Hello' || v_greet || ', thank you for signing your quote. Your order <strong>#'
                || coalesce(p_order_short, '') || '</strong> for <strong>'
                || coalesce(p_product_name, 'your project') || '</strong> is confirmed.<br/><br/>'
                || 'Please find below the details to settle the deposit of <strong>' || v_deposit
                || '</strong> by bank transfer:<br/><br/>'
                || '<strong>Beneficiary:</strong> ' || coalesce(p_beneficiary, '—') || '<br/>'
                || '<strong>IBAN:</strong> ' || coalesce(p_iban, '—') || '<br/>'
                || '<strong>BIC:</strong> ' || coalesce(p_bic, '—') || '<br/>'
                || '<strong>Bank:</strong> ' || coalesce(p_bank_name, '—') || '<br/>'
                || '<strong>Reference to include:</strong> ' || coalesce(p_payment_reference, '—') || '<br/>'
                || v_due_line
                || '<br/>'
                || 'Total order amount: <strong>' || v_total || '</strong> (deposit 30 %, balance due on delivery).<br/><br/>'
                || 'Upon receipt of the transfer, your order is forwarded to our partner for preparation.';
      v_cta_text := 'View my order';
  END CASE;

  RETURN jsonb_build_object(
    'subject',   v_subject,
    'body_html', public.render_transactional_email(p_locale, v_title, v_body, v_cta_text, 'https://terrassea.com/account?tab=orders'),
    'body_text', regexp_replace(v_body, '<[^>]+>', '', 'g')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public._email_order_quote_accepted_partner(
  p_locale       text,
  p_partner_name text,
  p_product_name text,
  p_order_short  text,
  p_quantity     integer,
  p_total_amount numeric
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_subject text;
  v_title   text;
  v_body    text;
  v_cta     text;
  v_greet   text;
  v_amount  text;
  v_qty     integer;
  v_units   text;
BEGIN
  v_greet  := COALESCE(' ' || NULLIF(p_partner_name, ''), '');
  v_amount := public.format_currency_locale(p_total_amount, p_locale);
  v_qty    := coalesce(p_quantity, 1);

  v_units := CASE p_locale
    WHEN 'fr' THEN CASE WHEN v_qty > 1 THEN ' unités' ELSE ' unité' END
    WHEN 'es' THEN CASE WHEN v_qty > 1 THEN ' unidades' ELSE ' unidad' END
    WHEN 'it' THEN CASE WHEN v_qty > 1 THEN ' unità' ELSE ' unità' END
    ELSE          CASE WHEN v_qty > 1 THEN ' units' ELSE ' unit' END
  END;

  CASE p_locale
    WHEN 'fr' THEN
      v_subject := 'Devis accepté — commande créée';
      v_title   := 'Votre devis a été accepté';
      v_body    := 'Bonjour' || v_greet || ', le client a accepté votre devis pour <strong>'
                || coalesce(p_product_name, 'un produit') || '</strong> (commande <strong>#'
                || coalesce(p_order_short, '') || '</strong>, ' || v_qty || v_units || ' · ' || v_amount
                || '). Une commande a été créée. Dès réception du paiement client (sous 7 à 10 jours), '
                || 'vous serez notifié pour préparer la commande.';
      v_cta := 'Voir la commande';
    WHEN 'es' THEN
      v_subject := 'Presupuesto aceptado — pedido creado';
      v_title   := 'Su presupuesto ha sido aceptado';
      v_body    := 'Hola' || v_greet || ', el cliente ha aceptado su presupuesto para <strong>'
                || coalesce(p_product_name, 'un producto') || '</strong> (pedido <strong>#'
                || coalesce(p_order_short, '') || '</strong>, ' || v_qty || v_units || ' · ' || v_amount
                || '). Se ha creado un pedido. Tras recibir el pago del cliente (en 7 a 10 días), '
                || 'le notificaremos para iniciar la preparación.';
      v_cta := 'Ver el pedido';
    WHEN 'it' THEN
      v_subject := 'Preventivo accettato — ordine creato';
      v_title   := 'Il Suo preventivo è stato accettato';
      v_body    := 'Buongiorno' || v_greet || ', il cliente ha accettato il Suo preventivo per <strong>'
                || coalesce(p_product_name, 'un prodotto') || '</strong> (ordine <strong>#'
                || coalesce(p_order_short, '') || '</strong>, ' || v_qty || v_units || ' · ' || v_amount
                || '). È stato creato un ordine. Alla ricezione del pagamento del cliente (entro 7-10 giorni), '
                || 'sarà avvisato per avviare la preparazione.';
      v_cta := 'Vedere l''ordine';
    ELSE
      v_subject := 'Quote accepted — order created';
      v_title   := 'Your quote has been accepted';
      v_body    := 'Hello' || v_greet || ', the client has accepted your quote for <strong>'
                || coalesce(p_product_name, 'a product') || '</strong> (order <strong>#'
                || coalesce(p_order_short, '') || '</strong>, ' || v_qty || v_units || ' · ' || v_amount
                || '). An order has been created. Once the client''s payment is received (within 7 to 10 days), '
                || 'you will be notified to begin preparation.';
      v_cta := 'View the order';
  END CASE;

  RETURN jsonb_build_object(
    'subject',   v_subject,
    'body_html', public.render_transactional_email(p_locale, v_title, v_body, v_cta, 'https://terrassea.com/account?tab=orders'),
    'body_text', regexp_replace(v_body, '<[^>]+>', '', 'g')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public._email_order_delivered_client(
  p_locale       text,
  p_client_name  text,
  p_product_name text,
  p_order_short  text
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_subject text;
  v_title   text;
  v_body    text;
  v_cta     text;
  v_greet   text;
BEGIN
  v_greet := COALESCE(' ' || NULLIF(p_client_name, ''), '');
  CASE p_locale
    WHEN 'fr' THEN
      v_subject := 'Votre commande a été livrée';
      v_title   := 'Commande livrée';
      v_body    := 'Bonjour' || v_greet || ', votre commande <strong>#' || coalesce(p_order_short, '')
                || '</strong> pour <strong>' || coalesce(p_product_name, 'votre projet')
                || '</strong> a bien été livrée. Nous serions ravis de connaître votre retour d''expérience '
                || 'depuis votre espace.';
      v_cta := 'Voir ma commande';
    WHEN 'es' THEN
      v_subject := 'Su pedido ha sido entregado';
      v_title   := 'Pedido entregado';
      v_body    := 'Hola' || v_greet || ', su pedido <strong>#' || coalesce(p_order_short, '')
                || '</strong> para <strong>' || coalesce(p_product_name, 'su proyecto')
                || '</strong> ha sido entregado. Nos encantaría conocer su opinión desde su espacio.';
      v_cta := 'Ver mi pedido';
    WHEN 'it' THEN
      v_subject := 'Il Suo ordine è stato consegnato';
      v_title   := 'Ordine consegnato';
      v_body    := 'Buongiorno' || v_greet || ', il Suo ordine <strong>#' || coalesce(p_order_short, '')
                || '</strong> per <strong>' || coalesce(p_product_name, 'il Suo progetto')
                || '</strong> è stato consegnato. Ci farebbe piacere conoscere la Sua esperienza dal Suo spazio.';
      v_cta := 'Vedere il mio ordine';
    ELSE
      v_subject := 'Your order has been delivered';
      v_title   := 'Order delivered';
      v_body    := 'Hello' || v_greet || ', your order <strong>#' || coalesce(p_order_short, '')
                || '</strong> for <strong>' || coalesce(p_product_name, 'your project')
                || '</strong> has been delivered. We''d love to hear about your experience from your space.';
      v_cta := 'View my order';
  END CASE;

  RETURN jsonb_build_object(
    'subject',   v_subject,
    'body_html', public.render_transactional_email(p_locale, v_title, v_body, v_cta, 'https://terrassea.com/account?tab=orders'),
    'body_text', regexp_replace(v_body, '<[^>]+>', '', 'g')
  );
END;
$$;

-- ============================================================
-- Update notify_order_created to pass new params (deposit_due_date, order_short)
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_order_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, pg_temp
AS $$
DECLARE
  v_client_first_name  text;
  v_client_country     text;
  v_client_locale      text;
  v_partner_email      text;
  v_partner_name       text;
  v_partner_country    text;
  v_partner_locale     text;
  v_iban               text;
  v_bic                text;
  v_bank_name          text;
  v_beneficiary        text;
  v_order_short        text;
  v_payload            jsonb;
BEGIN
  IF NEW.quote_request_id IS NOT NULL THEN
    SELECT client_first_name, client_country_code
      INTO v_client_first_name, v_client_country
    FROM public.quote_requests
    WHERE id = NEW.quote_request_id;
  END IF;

  IF v_client_first_name IS NULL THEN
    SELECT first_name INTO v_client_first_name
    FROM public.user_profiles
    WHERE id = NEW.client_user_id OR email = NEW.client_email
    LIMIT 1;
  END IF;

  v_client_locale := public.infer_email_locale(v_client_country);

  SELECT value::text INTO v_iban
    FROM public.platform_settings WHERE key = 'payment_iban' LIMIT 1;
  SELECT value::text INTO v_bic
    FROM public.platform_settings WHERE key = 'payment_bic' LIMIT 1;
  SELECT value::text INTO v_bank_name
    FROM public.platform_settings WHERE key = 'payment_bank_name' LIMIT 1;
  SELECT value::text INTO v_beneficiary
    FROM public.platform_settings WHERE key = 'payment_beneficiary' LIMIT 1;

  v_iban         := trim(both '"' from coalesce(v_iban, '""'));
  v_bic          := trim(both '"' from coalesce(v_bic, '""'));
  v_bank_name    := trim(both '"' from coalesce(v_bank_name, '""'));
  v_beneficiary  := trim(both '"' from coalesce(v_beneficiary, '""'));

  v_order_short := upper(substring(NEW.id::text from 1 for 8));

  IF NEW.client_email IS NOT NULL THEN
    v_payload := public._email_order_payment_instructions_client(
      v_client_locale,
      v_client_first_name,
      NEW.product_name,
      v_order_short,
      NEW.deposit_amount,
      NEW.total_amount,
      NEW.payment_reference,
      v_beneficiary,
      v_iban,
      v_bic,
      v_bank_name,
      NEW.deposit_due_date
    );
    PERFORM public.send_transactional_email(
      NEW.client_email,
      v_payload->>'subject',
      v_payload->>'body_html',
      v_payload->>'body_text'
    );
  END IF;

  IF NEW.partner_id IS NOT NULL THEN
    SELECT contact_email, name, country_code
      INTO v_partner_email, v_partner_name, v_partner_country
    FROM public.partners
    WHERE id = NEW.partner_id;

    IF v_partner_email IS NOT NULL THEN
      v_partner_locale := public.infer_email_locale(v_partner_country);
      v_payload := public._email_order_quote_accepted_partner(
        v_partner_locale,
        v_partner_name,
        NEW.product_name,
        v_order_short,
        NEW.quantity,
        NEW.total_amount
      );
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

-- ============================================================
-- Update notify_order_status_changed: pass order_short to Y3 helper
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_order_status_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, pg_temp
AS $$
DECLARE
  client_uid  UUID;
  status_label TEXT;
  notif_body  TEXT;
  v_client_first_name text;
  v_client_country    text;
  v_client_locale     text;
  v_order_short       text;
  v_payload           jsonb;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT up.id INTO client_uid
  FROM public.user_profiles up
  WHERE up.email = NEW.client_email;

  status_label := CASE NEW.status
    WHEN 'pending_deposit' THEN 'En attente d''acompte'
    WHEN 'deposit_paid' THEN 'Acompte reçu'
    WHEN 'in_production' THEN 'En production'
    WHEN 'shipped' THEN 'Expédiée'
    WHEN 'delivered' THEN 'Livrée'
    WHEN 'completed' THEN 'Terminée'
    WHEN 'disputed' THEN 'Litige ouvert'
    WHEN 'cancelled' THEN 'Annulée'
    WHEN 'refunded' THEN 'Remboursée'
    ELSE NEW.status
  END;

  notif_body := 'Votre commande "' || COALESCE(NEW.product_name, '') || '" est maintenant : ' || status_label || '.';

  IF NEW.status = 'shipped' AND NEW.tracking_number IS NOT NULL THEN
    notif_body := notif_body || ' N° suivi : ' || NEW.tracking_number;
    IF NEW.shipping_carrier IS NOT NULL THEN
      notif_body := notif_body || ' (' || NEW.shipping_carrier || ')';
    END IF;
    notif_body := notif_body || '.';
  END IF;

  IF NEW.status = 'delivered' AND NEW.balance_due_date IS NOT NULL THEN
    notif_body := notif_body || ' Le solde de €' || ROUND(COALESCE(NEW.balance_amount, 0)::numeric, 2)
               || ' est dû avant le ' || to_char(NEW.balance_due_date, 'DD/MM/YYYY') || '.';
  END IF;

  IF client_uid IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      client_uid,
      'order_status',
      'Commande mise à jour — ' || status_label,
      notif_body,
      '/account'
    );
  END IF;

  IF NEW.status = 'delivered'
     AND OLD.status IS DISTINCT FROM 'delivered'
     AND NEW.client_email IS NOT NULL
  THEN
    IF NEW.quote_request_id IS NOT NULL THEN
      SELECT client_first_name, client_country_code
        INTO v_client_first_name, v_client_country
      FROM public.quote_requests
      WHERE id = NEW.quote_request_id;
    END IF;
    v_client_locale := public.infer_email_locale(v_client_country);
    v_order_short := upper(substring(NEW.id::text from 1 for 8));

    v_payload := public._email_order_delivered_client(
      v_client_locale,
      v_client_first_name,
      NEW.product_name,
      v_order_short
    );
    PERFORM public.send_transactional_email(
      NEW.client_email,
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
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'format_currency_locale' AND pronamespace='public'::regnamespace) THEN
    RAISE EXCEPTION 'format_currency_locale missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'format_date_locale' AND pronamespace='public'::regnamespace) THEN
    RAISE EXCEPTION 'format_date_locale missing';
  END IF;
  RAISE NOTICE 'OK Dette 59 quality pass — all helpers rewritten in formal voice + help block in wrapper';
END $$;
