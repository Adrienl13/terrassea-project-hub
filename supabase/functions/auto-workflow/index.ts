import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── Helpers ─────────────────────────────────────────────────────────────────

async function getSetting(key: string): Promise<string | null> {
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", key)
    .single();
  if (!data) return null;
  return typeof data.value === "string" ? data.value : JSON.stringify(data.value);
}

async function sendEmail(to: string, subject: string, bodyHtml: string, bodyText: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-notification-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ to, subject, body_html: bodyHtml, body_text: bodyText }),
  });
  return res.ok;
}

// ── Actions ─────────────────────────────────────────────────────────────────

/**
 * Auto-assign the best partner to a new quote request.
 * Finds the partner with the best offer for the product and assigns them.
 */
async function autoAssignPartner(quoteRequestId: string) {
  const enabled = await getSetting("auto_assign_enabled");
  if (enabled !== "true") return { skipped: true, reason: "auto_assign_enabled is off" };

  // Fetch the quote request
  const { data: quote, error: qErr } = await supabase
    .from("quote_requests")
    .select("id, product_id, partner_id, client_email")
    .eq("id", quoteRequestId)
    .single();
  if (qErr || !quote) return { error: "Quote request not found" };
  if (quote.partner_id) return { skipped: true, reason: "Already assigned" };

  // Find best offer for this product
  const { data: offers } = await supabase
    .from("product_offers")
    .select("id, partner_id, price, delivery_delay_days, stock_status, partner:partner_id(name, contact_email)")
    .eq("product_id", quote.product_id)
    .eq("is_active", true)
    .order("price", { ascending: true })
    .limit(1);

  if (!offers || offers.length === 0) return { skipped: true, reason: "No active offers" };

  const bestOffer = offers[0] as any;

  // Assign partner to quote
  const { error: upErr } = await supabase
    .from("quote_requests")
    .update({ partner_id: bestOffer.partner_id })
    .eq("id", quoteRequestId);

  if (upErr) return { error: upErr.message };

  // Notify partner
  if (bestOffer.partner?.contact_email) {
    await sendEmail(
      bestOffer.partner.contact_email,
      "Terrassea — Nouvelle demande de devis",
      `<p>Bonjour ${bestOffer.partner.name},</p><p>Une nouvelle demande de devis vous a été attribuée sur Terrassea. Connectez-vous à votre espace partenaire pour répondre.</p><p>Cordialement,<br/>L'équipe Terrassea</p>`,
      `Bonjour ${bestOffer.partner.name}, une nouvelle demande de devis vous a été attribuée sur Terrassea. Connectez-vous à votre espace partenaire pour répondre.`
    );
  }

  return { success: true, partnerId: bestOffer.partner_id };
}

/**
 * Auto-create an order when a quote is accepted by the client.
 */
async function autoCreateOrder(quoteRequestId: string) {
  const enabled = await getSetting("auto_create_order");
  if (enabled !== "true") return { skipped: true, reason: "auto_create_order is off" };

  const { data: quote, error: qErr } = await supabase
    .from("quote_requests")
    .select("id, product_name, product_id, quantity, unit_price, total_price, partner_id, client_email, client_first_name, tva_rate, delivery_delay_days, project_request_id")
    .eq("id", quoteRequestId)
    .single();
  if (qErr || !quote) return { error: "Quote not found" };

  // Check if order already exists for this quote
  const { data: existing } = await supabase
    .from("orders")
    .select("id")
    .eq("quote_request_id", quoteRequestId)
    .limit(1);
  if (existing && existing.length > 0) return { skipped: true, reason: "Order already exists" };

  const totalAmount = Number(quote.total_price || 0);

  // Dynamic deposit percent from platform_settings (default 30)
  const depositPercentSetting = await getSetting("deposit_percent");
  const depositPercent = depositPercentSetting ? Number(depositPercentSetting) : 30;
  const depositAmount = Math.round(totalAmount * depositPercent) / 100;

  // Dynamic commission from partner's plan
  const COMMISSION_BY_PLAN: Record<string, number> = { starter: 8, growth: 5, elite: 3.5, elite_pro: 2.5 };
  let commissionRate = 8; // default starter
  if (quote.partner_id) {
    const { data: partner } = await supabase
      .from("partners")
      .select("plan")
      .eq("id", quote.partner_id)
      .single();
    if (partner?.plan && COMMISSION_BY_PLAN[partner.plan] !== undefined) {
      commissionRate = COMMISSION_BY_PLAN[partner.plan];
    }
  }
  const commissionAmount = Math.round(totalAmount * commissionRate) / 100;

  const { data: order, error: oErr } = await supabase
    .from("orders")
    .insert({
      quote_request_id: quoteRequestId,
      project_request_id: quote.project_request_id,
      partner_id: quote.partner_id,
      product_name: quote.product_name,
      product_id: quote.product_id,
      quantity: quote.quantity,
      unit_price: quote.unit_price,
      total_amount: totalAmount,
      client_email: quote.client_email,
      client_name: quote.client_first_name || "",
      status: "pending_deposit",
      deposit_percent: depositPercent,
      deposit_amount: depositAmount,
      balance_amount: totalAmount - depositAmount,
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
    })
    .select("id")
    .single();

  if (oErr) return { error: oErr.message };

  // Notify client
  if (quote.client_email) {
    await sendEmail(
      quote.client_email,
      "Terrassea — Votre commande a été créée",
      `<p>Bonjour${quote.client_first_name ? ` ${quote.client_first_name}` : ""},</p><p>Suite à l'acceptation de votre devis, votre commande a été créée. Un acompte de ${depositPercent}% (€${depositAmount.toLocaleString()}) est attendu pour lancer la production.</p><p>Cordialement,<br/>L'équipe Terrassea</p>`,
      `Bonjour, suite à l'acceptation de votre devis, votre commande a été créée. Un acompte de ${depositPercent}% (€${depositAmount}) est attendu pour lancer la production.`
    );
  }

  return { success: true, orderId: order.id };
}

/**
 * Send reminder to partners who haven't responded within 48h.
 */
async function reminderPartner48h() {
  const enabled = await getSetting("reminder_partner_48h");
  if (enabled !== "true") return { skipped: true, reason: "reminder_partner_48h is off" };

  const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString();

  const { data: quotes } = await supabase
    .from("quote_requests")
    .select("id, partner_id, product_name, partner:partner_id(name, contact_email)")
    .eq("status", "pending")
    .lt("created_at", cutoff);

  if (!quotes || quotes.length === 0) return { count: 0 };

  let sent = 0;
  for (const q of quotes as any[]) {
    if (q.partner?.contact_email) {
      await sendEmail(
        q.partner.contact_email,
        "Terrassea — Rappel : demande de devis en attente",
        `<p>Bonjour ${q.partner.name},</p><p>Vous avez une demande de devis en attente pour <strong>${q.product_name}</strong> depuis plus de 48 heures. Merci de vous connecter à votre espace partenaire pour y répondre.</p><p>Cordialement,<br/>L'équipe Terrassea</p>`,
        `Bonjour ${q.partner.name}, vous avez une demande de devis en attente pour ${q.product_name} depuis plus de 48h. Merci de vous connecter pour y répondre.`
      );
      sent++;
    }
  }

  return { success: true, count: sent };
}

/**
 * Remind clients who haven't signed a quote after 7 days.
 */
async function reminderClient7d() {
  const enabled = await getSetting("reminder_client_7d");
  if (enabled !== "true") return { skipped: true, reason: "reminder_client_7d is off" };

  const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  const { data: quotes } = await supabase
    .from("quote_requests")
    .select("id, product_name, client_email, client_first_name, replied_at")
    .eq("status", "replied")
    .lt("replied_at", cutoff)
    .is("signed_at", null);

  if (!quotes || quotes.length === 0) return { count: 0 };

  let sent = 0;
  for (const q of quotes) {
    if (q.client_email) {
      await sendEmail(
        q.client_email,
        "Terrassea — Votre devis attend votre validation",
        `<p>Bonjour${q.client_first_name ? ` ${q.client_first_name}` : ""},</p><p>Votre devis pour <strong>${q.product_name}</strong> est en attente de validation depuis 7 jours. N'hésitez pas à vous connecter pour le consulter et le valider.</p><p>Cordialement,<br/>L'équipe Terrassea</p>`,
        `Bonjour, votre devis pour ${q.product_name} est en attente de validation depuis 7 jours. Connectez-vous pour le consulter.`
      );
      sent++;
    }
  }

  return { success: true, count: sent };
}

/**
 * Alert clients 3 days before their quote expires.
 */
async function reminderExpiry3d() {
  const enabled = await getSetting("reminder_expiry_3d");
  if (enabled !== "true") return { skipped: true, reason: "reminder_expiry_3d is off" };

  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 3600 * 1000).toISOString();

  const { data: quotes } = await supabase
    .from("quote_requests")
    .select("id, product_name, client_email, client_first_name, validity_expires_at")
    .eq("status", "replied")
    .is("signed_at", null)
    .gt("validity_expires_at", now.toISOString())
    .lt("validity_expires_at", threeDaysFromNow);

  if (!quotes || quotes.length === 0) return { count: 0 };

  let sent = 0;
  for (const q of quotes) {
    if (q.client_email) {
      const expiryDate = new Date(q.validity_expires_at!).toLocaleDateString("fr-FR");
      await sendEmail(
        q.client_email,
        "Terrassea — Votre devis expire bientôt",
        `<p>Bonjour${q.client_first_name ? ` ${q.client_first_name}` : ""},</p><p>Votre devis pour <strong>${q.product_name}</strong> expire le <strong>${expiryDate}</strong>. Pensez à le valider avant cette date.</p><p>Cordialement,<br/>L'équipe Terrassea</p>`,
        `Bonjour, votre devis pour ${q.product_name} expire le ${expiryDate}. Pensez à le valider avant cette date.`
      );
      sent++;
    }
  }

  return { success: true, count: sent };
}

/**
 * Notify client that their order has been shipped.
 */
async function notifyOrderShipped(orderId: string) {
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, product_name, client_email, client_name, tracking_number, shipping_carrier")
    .eq("id", orderId)
    .single();

  if (error || !order) return { error: "Order not found" };
  if (!order.client_email) return { skipped: true, reason: "No client email" };

  const trackingInfo = order.tracking_number
    ? `<p>Numéro de suivi : <strong>${order.tracking_number}</strong>${order.shipping_carrier ? ` (${order.shipping_carrier})` : ""}</p>`
    : "";
  const trackingText = order.tracking_number
    ? `Numéro de suivi : ${order.tracking_number}${order.shipping_carrier ? ` (${order.shipping_carrier})` : ""}`
    : "";

  await sendEmail(
    order.client_email,
    "Terrassea — Votre commande a été expédiée",
    `<p>Bonjour${order.client_name ? ` ${order.client_name}` : ""},</p><p>Votre commande pour <strong>${order.product_name}</strong> a été expédiée.</p>${trackingInfo}<p>Cordialement,<br/>L'équipe Terrassea</p>`,
    `Bonjour, votre commande pour ${order.product_name} a été expédiée. ${trackingText}`
  );

  return { success: true };
}

// ── Router ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { action, ...params } = await req.json();

    let result: Record<string, unknown>;

    switch (action) {
      case "auto_assign_partner":
        result = await autoAssignPartner(params.quoteRequestId);
        break;

      case "auto_create_order":
        result = await autoCreateOrder(params.quoteRequestId);
        break;

      case "reminder_partner_48h":
        result = await reminderPartner48h();
        break;

      case "reminder_client_7d":
        result = await reminderClient7d();
        break;

      case "reminder_expiry_3d":
        result = await reminderExpiry3d();
        break;

      case "notify_order_shipped":
        result = await notifyOrderShipped(params.orderId);
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
