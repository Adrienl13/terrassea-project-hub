-- ============================================================
-- Dette 59 Lot B — Order lifecycle email triggers
-- Date : 2026-05-12
--
-- Continues the work started in Lot A : moves 3 order-related
-- emails from frontend `supabase.functions.invoke("send-notification-email")`
-- (401-silent in this Supabase 2026 project) to server-side DB
-- triggers that call pg_net with the X-Trigger-Secret pattern.
--
-- Scenarios covered :
--   Y1 — INSERT orders                              → client payment instructions
--   Y2 — INSERT orders                              → partner "quote accepted"
--   Y3 — UPDATE orders.status='delivered'           → client "delivered"
--
-- Y1+Y2 fire on AFTER INSERT on `orders` (any path : frontend
-- createOrderFromQuote OR DB trigger auto_create_order_on_signature),
-- not on auto_create_order_on_signature itself (which is NOT
-- SECURITY DEFINER and would need both paths split otherwise).
--
-- Y3 extends notify_order_status_changed (already SECURITY DEFINER)
-- preserving the existing in-app notification insert intact.
--
-- IBAN/BIC sourced from public.platform_settings :
--   payment_iban / payment_bic / payment_bank_name / payment_beneficiary
--   (category='orders' — real production values, not the placeholder
--   'iban'/'bic' keys in category='payment').
--
-- Reuses Lot A helpers : infer_email_locale, render_transactional_email,
-- send_transactional_email (with 15s pg_net timeout).
-- ============================================================

-- ── Helper: render Y1 — client payment instructions ─────────────
CREATE OR REPLACE FUNCTION public._email_order_payment_instructions_client(
  p_locale           text,
  p_client_name      text,
  p_product_name     text,
  p_order_short      text,
  p_deposit_amount   numeric,
  p_total_amount     numeric,
  p_payment_reference text,
  p_beneficiary      text,
  p_iban             text,
  p_bic              text,
  p_bank_name        text
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_subject text;
  v_title   text;
  v_body    text;
  v_cta     text;
  v_amount  text;
BEGIN
  v_amount := to_char(coalesce(p_deposit_amount, 0), 'FM999G999G990D00') || ' €';

  CASE p_locale
    WHEN 'fr' THEN
      v_subject := 'Votre devis a été signé — Instructions de paiement Terrassea';
      v_title   := 'Votre commande est confirmée';
      v_body    := 'Bonjour ' || coalesce(p_client_name, '') || ', merci d''avoir signé votre devis pour <strong>'
                || coalesce(p_product_name, 'votre projet')
                || '</strong>. Voici les coordonnées pour régler l''acompte de <strong>' || v_amount || '</strong> par virement bancaire :<br/><br/>'
                || '<strong>Bénéficiaire :</strong> ' || coalesce(p_beneficiary, '') || '<br/>'
                || '<strong>IBAN :</strong> ' || coalesce(p_iban, '') || '<br/>'
                || '<strong>BIC :</strong> ' || coalesce(p_bic, '') || '<br/>'
                || '<strong>Banque :</strong> ' || coalesce(p_bank_name, '') || '<br/>'
                || '<strong>Référence à indiquer :</strong> ' || coalesce(p_payment_reference, '') || '<br/><br/>'
                || 'Dès réception, votre commande est transmise au partenaire pour préparation.';
      v_cta := 'Voir ma commande';
    WHEN 'es' THEN
      v_subject := 'Tu presupuesto ha sido firmado — Instrucciones de pago Terrassea';
      v_title   := 'Tu pedido está confirmado';
      v_body    := 'Hola ' || coalesce(p_client_name, '') || ', gracias por firmar tu presupuesto para <strong>'
                || coalesce(p_product_name, 'tu proyecto')
                || '</strong>. Estos son los datos para abonar el anticipo de <strong>' || v_amount || '</strong> por transferencia bancaria :<br/><br/>'
                || '<strong>Beneficiario :</strong> ' || coalesce(p_beneficiary, '') || '<br/>'
                || '<strong>IBAN :</strong> ' || coalesce(p_iban, '') || '<br/>'
                || '<strong>BIC :</strong> ' || coalesce(p_bic, '') || '<br/>'
                || '<strong>Banco :</strong> ' || coalesce(p_bank_name, '') || '<br/>'
                || '<strong>Referencia a indicar :</strong> ' || coalesce(p_payment_reference, '') || '<br/><br/>'
                || 'Una vez recibido, tu pedido se transmite al socio para preparación.';
      v_cta := 'Ver mi pedido';
    WHEN 'it' THEN
      v_subject := 'Il tuo preventivo è stato firmato — Istruzioni di pagamento Terrassea';
      v_title   := 'Il tuo ordine è confermato';
      v_body    := 'Ciao ' || coalesce(p_client_name, '') || ', grazie per aver firmato il preventivo per <strong>'
                || coalesce(p_product_name, 'il tuo progetto')
                || '</strong>. Ecco i dati per saldare l''acconto di <strong>' || v_amount || '</strong> tramite bonifico bancario :<br/><br/>'
                || '<strong>Beneficiario :</strong> ' || coalesce(p_beneficiary, '') || '<br/>'
                || '<strong>IBAN :</strong> ' || coalesce(p_iban, '') || '<br/>'
                || '<strong>BIC :</strong> ' || coalesce(p_bic, '') || '<br/>'
                || '<strong>Banca :</strong> ' || coalesce(p_bank_name, '') || '<br/>'
                || '<strong>Riferimento da indicare :</strong> ' || coalesce(p_payment_reference, '') || '<br/><br/>'
                || 'Alla ricezione, il tuo ordine viene trasmesso al partner per la preparazione.';
      v_cta := 'Vedi il mio ordine';
    ELSE
      v_subject := 'Your quote has been signed — Payment instructions — Terrassea';
      v_title   := 'Your order is confirmed';
      v_body    := 'Hello ' || coalesce(p_client_name, '') || ', thank you for signing your quote for <strong>'
                || coalesce(p_product_name, 'your project')
                || '</strong>. Here are the details to settle the deposit of <strong>' || v_amount || '</strong> by bank transfer :<br/><br/>'
                || '<strong>Beneficiary:</strong> ' || coalesce(p_beneficiary, '') || '<br/>'
                || '<strong>IBAN:</strong> ' || coalesce(p_iban, '') || '<br/>'
                || '<strong>BIC:</strong> ' || coalesce(p_bic, '') || '<br/>'
                || '<strong>Bank:</strong> ' || coalesce(p_bank_name, '') || '<br/>'
                || '<strong>Reference to include:</strong> ' || coalesce(p_payment_reference, '') || '<br/><br/>'
                || 'Upon receipt, your order is forwarded to the partner for preparation.';
      v_cta := 'View my order';
  END CASE;

  RETURN jsonb_build_object(
    'subject',   v_subject,
    'body_html', public.render_transactional_email(p_locale, v_title, v_body, v_cta, 'https://terrassea.com/account?tab=orders'),
    'body_text', regexp_replace(v_body, '<[^>]+>', '', 'g')
  );
END;
$$;

-- ── Helper: render Y2 — partner quote accepted ──────────────────
CREATE OR REPLACE FUNCTION public._email_order_quote_accepted_partner(
  p_locale       text,
  p_partner_name text,
  p_product_name text,
  p_quantity     integer,
  p_total_amount numeric
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_subject text;
  v_title   text;
  v_body    text;
  v_cta     text;
  v_amount  text;
BEGIN
  v_amount := to_char(coalesce(p_total_amount, 0), 'FM999G999G990D00') || ' €';

  CASE p_locale
    WHEN 'fr' THEN
      v_subject := 'Devis accepté — Terrassea';
      v_title   := 'Votre devis a été accepté';
      v_body    := 'Bonjour ' || coalesce(p_partner_name, '') || ', le client a accepté votre devis pour <strong>'
                || coalesce(p_product_name, 'un produit') || '</strong> (' || coalesce(p_quantity, 1)
                || ' pcs · ' || v_amount || '). Une commande a été créée. '
                || 'Dès réception du paiement client (sous 7-10 jours), vous serez notifié pour préparer la commande.';
      v_cta := 'Voir la commande';
    WHEN 'es' THEN
      v_subject := 'Presupuesto aceptado — Terrassea';
      v_title   := 'Tu presupuesto ha sido aceptado';
      v_body    := 'Hola ' || coalesce(p_partner_name, '') || ', el cliente ha aceptado tu presupuesto para <strong>'
                || coalesce(p_product_name, 'un producto') || '</strong> (' || coalesce(p_quantity, 1)
                || ' uds · ' || v_amount || '). Se ha creado un pedido. '
                || 'Tras recibir el pago del cliente (en 7-10 días), te notificaremos para preparar el pedido.';
      v_cta := 'Ver el pedido';
    WHEN 'it' THEN
      v_subject := 'Preventivo accettato — Terrassea';
      v_title   := 'Il tuo preventivo è stato accettato';
      v_body    := 'Ciao ' || coalesce(p_partner_name, '') || ', il cliente ha accettato il tuo preventivo per <strong>'
                || coalesce(p_product_name, 'un prodotto') || '</strong> (' || coalesce(p_quantity, 1)
                || ' pz · ' || v_amount || '). È stato creato un ordine. '
                || 'Alla ricezione del pagamento del cliente (entro 7-10 giorni), sarai avvisato per preparare l''ordine.';
      v_cta := 'Vedi l''ordine';
    ELSE
      v_subject := 'Quote accepted — Terrassea';
      v_title   := 'Your quote has been accepted';
      v_body    := 'Hello ' || coalesce(p_partner_name, '') || ', the client has accepted your quote for <strong>'
                || coalesce(p_product_name, 'a product') || '</strong> (' || coalesce(p_quantity, 1)
                || ' pcs · ' || v_amount || '). An order has been created. '
                || 'Upon receipt of the client''s payment (within 7-10 days), you will be notified to prepare the order.';
      v_cta := 'View the order';
  END CASE;

  RETURN jsonb_build_object(
    'subject',   v_subject,
    'body_html', public.render_transactional_email(p_locale, v_title, v_body, v_cta, 'https://terrassea.com/account?tab=orders'),
    'body_text', regexp_replace(v_body, '<[^>]+>', '', 'g')
  );
END;
$$;

-- ── Helper: render Y3 — client delivered ─────────────────────────
CREATE OR REPLACE FUNCTION public._email_order_delivered_client(
  p_locale       text,
  p_client_name  text,
  p_product_name text
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_subject text;
  v_title   text;
  v_body    text;
  v_cta     text;
BEGIN
  CASE p_locale
    WHEN 'fr' THEN
      v_subject := 'Votre commande a été livrée — Terrassea';
      v_title   := 'Commande livrée';
      v_body    := 'Bonjour ' || coalesce(p_client_name, '') || ', votre commande pour <strong>'
                || coalesce(p_product_name, 'votre projet')
                || '</strong> a bien été livrée. Nous serions ravis de connaître votre retour d''expérience.';
      v_cta := 'Laisser un avis';
    WHEN 'es' THEN
      v_subject := 'Tu pedido ha sido entregado — Terrassea';
      v_title   := 'Pedido entregado';
      v_body    := 'Hola ' || coalesce(p_client_name, '') || ', tu pedido para <strong>'
                || coalesce(p_product_name, 'tu proyecto')
                || '</strong> ha sido entregado. Nos encantaría conocer tu opinión.';
      v_cta := 'Dejar una opinión';
    WHEN 'it' THEN
      v_subject := 'Il tuo ordine è stato consegnato — Terrassea';
      v_title   := 'Ordine consegnato';
      v_body    := 'Ciao ' || coalesce(p_client_name, '') || ', il tuo ordine per <strong>'
                || coalesce(p_product_name, 'il tuo progetto')
                || '</strong> è stato consegnato. Ci farebbe piacere conoscere la tua esperienza.';
      v_cta := 'Lascia una recensione';
    ELSE
      v_subject := 'Your order has been delivered — Terrassea';
      v_title   := 'Order delivered';
      v_body    := 'Hello ' || coalesce(p_client_name, '') || ', your order for <strong>'
                || coalesce(p_product_name, 'your project')
                || '</strong> has been delivered. We''d love to hear about your experience.';
      v_cta := 'Leave a review';
  END CASE;

  RETURN jsonb_build_object(
    'subject',   v_subject,
    'body_html', public.render_transactional_email(p_locale, v_title, v_body, v_cta, 'https://terrassea.com/account?tab=orders'),
    'body_text', regexp_replace(v_body, '<[^>]+>', '', 'g')
  );
END;
$$;

-- ── Trigger fn : AFTER INSERT on orders → Y1 + Y2 ────────────────
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
  -- Resolve client locale (from linked quote_request)
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

  -- Bank coordinates from platform_settings (real values live under payment_* keys)
  SELECT value::text INTO v_iban
    FROM public.platform_settings WHERE key = 'payment_iban' LIMIT 1;
  SELECT value::text INTO v_bic
    FROM public.platform_settings WHERE key = 'payment_bic' LIMIT 1;
  SELECT value::text INTO v_bank_name
    FROM public.platform_settings WHERE key = 'payment_bank_name' LIMIT 1;
  SELECT value::text INTO v_beneficiary
    FROM public.platform_settings WHERE key = 'payment_beneficiary' LIMIT 1;

  -- Strip JSON quoting from text-typed jsonb values
  v_iban         := trim(both '"' from coalesce(v_iban, '""'));
  v_bic          := trim(both '"' from coalesce(v_bic, '""'));
  v_bank_name    := trim(both '"' from coalesce(v_bank_name, '""'));
  v_beneficiary  := trim(both '"' from coalesce(v_beneficiary, '""'));

  v_order_short := substring(NEW.id::text from 1 for 8);

  -- Y1 client payment instructions
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
      v_bank_name
    );
    PERFORM public.send_transactional_email(
      NEW.client_email,
      v_payload->>'subject',
      v_payload->>'body_html',
      v_payload->>'body_text'
    );
  END IF;

  -- Y2 partner quote accepted
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

DROP TRIGGER IF EXISTS trg_notify_order_created ON public.orders;
CREATE TRIGGER trg_notify_order_created
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_order_created();

-- ── Extend notify_order_status_changed : preserve in-app + add Y3 email
-- Preserves the existing in-app `notifications` insert intact.
-- Adds : pg_net email to client on transition into 'delivered'.
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
  v_payload           jsonb;
BEGIN
  -- Only fire on actual status change
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- Find client user_id (preserved)
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

  -- ── NEW : Y3 client email on transition into 'delivered' ───────
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

    v_payload := public._email_order_delivered_client(
      v_client_locale,
      v_client_first_name,
      NEW.product_name
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
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = '_email_order_payment_instructions_client' AND pronamespace='public'::regnamespace) THEN
    RAISE EXCEPTION '_email_order_payment_instructions_client missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = '_email_order_quote_accepted_partner' AND pronamespace='public'::regnamespace) THEN
    RAISE EXCEPTION '_email_order_quote_accepted_partner missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = '_email_order_delivered_client' AND pronamespace='public'::regnamespace) THEN
    RAISE EXCEPTION '_email_order_delivered_client missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'notify_order_created' AND pronamespace='public'::regnamespace) THEN
    RAISE EXCEPTION 'notify_order_created missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname='trg_notify_order_created'
      AND tgrelid='public.orders'::regclass
  ) THEN
    RAISE EXCEPTION 'trg_notify_order_created missing';
  END IF;
  RAISE NOTICE 'OK Dette 59 Lot B — order email triggers in place';
END $$;
