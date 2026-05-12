-- ============================================================
-- Patch — Support email recipient
-- Date : 2026-05-12
--
-- The "Contact support" help block in render_transactional_email
-- pointed to mailto:support@terrassea.com. Founder decision :
-- route all transactional-email support replies to
-- adrienlaniez1@gmail.com while we don't yet operate a dedicated
-- support inbox.
--
-- Single helper REPLACE — no signature change.
-- ============================================================

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
    || '<tr><td style="background-color:#1a1a1a;padding:32px 40px;text-align:center;">'
    || '<h1 style="color:#ffffff;font-size:22px;letter-spacing:5px;font-weight:600;margin:0;line-height:1.2;">TERRASSEA <span style="color:#d4603a;">HUB</span></h1>'
    || '</td></tr>'
    || '<tr><td style="padding:40px 40px 16px;">'
    || '<h2 style="color:#1a1a1a;font-size:20px;font-weight:600;margin:0 0 16px;line-height:1.35;">' || p_title || '</h2>'
    || '<p style="color:#333333;font-size:15px;line-height:1.7;margin:0;">' || p_body || '</p>'
    || '</td></tr>'
    || CASE WHEN v_cta_html <> '' THEN '<tr><td style="padding:0 40px 16px;">' || v_cta_html || '</td></tr>' ELSE '' END
    || '<tr><td style="padding:24px 40px 32px;border-top:1px solid #ebe8e3;">'
    || '<p style="margin:0 0 10px;color:#666666;font-size:13px;line-height:1.6;">' || v_help_text || '</p>'
    || '<a href="mailto:adrienlaniez1@gmail.com" style="display:inline-block;color:#d4603a;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.4px;">'
    || v_help_cta || ' &rarr;</a>'
    || '</td></tr>'
    || '<tr><td style="background-color:#1a1a1a;padding:18px 40px;text-align:center;">'
    || '<p style="color:#a3a3a3;font-size:10px;margin:0;letter-spacing:2px;">TERRASSEA HUB</p>'
    || '<p style="color:#666666;font-size:10px;margin:6px 0 0;line-height:1.5;">' || v_footer_tagline || '<br/>' || v_disclaimer || '</p>'
    || '</td></tr>'
    || '</table></td></tr></table></body></html>';
END;
$$;
