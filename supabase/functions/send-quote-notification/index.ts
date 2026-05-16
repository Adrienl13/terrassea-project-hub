import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const ADMIN_EMAIL    = Deno.env.get("ADMIN_EMAIL")    || "";
const FROM_EMAIL     = "Terrassea <noreply@terrassea.com>";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
// Fail-closed: empty fallback so the auth check below ("!== ''") refuses
// unauthenticated callers when the env is unset. Red-team H7 (2026-05-16).
const TRIGGER_SECRET = Deno.env.get("TRIGGER_SECRET") || "";

// HTML-escape a value before interpolating into email templates. Closes
// red-team H7 stored-HTML-injection in admin/client/partner emails (any
// unauthenticated visitor inserts a quote_requests row with crafted
// product_name/message and the DB trigger fires this function, sending
// the attacker payload to ADMIN_EMAIL under the brand from-address).
function escapeHtml(s: unknown): string {
  if (s === null || s === undefined) return "";
  return String(s).replace(/[&<>"']/g, (c) => (
    c === "&" ? "&amp;" :
    c === "<" ? "&lt;" :
    c === ">" ? "&gt;" :
    c === '"' ? "&quot;" : "&#39;"
  ));
}

function escapeList(arr: unknown): string {
  if (!Array.isArray(arr)) return "";
  return arr.map(escapeHtml).join(", ");
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  return res.ok;
}

function quoteConfirmationClient(r: any): string {
  const greeting = escapeHtml(r.first_name || r.contact_name || "");
  const productName = escapeHtml(r.product_name || "your selection");
  const productNameRaw = r.product_name ? escapeHtml(r.product_name) : "";
  const quantity = r.quantity ? escapeHtml(r.quantity) : "";
  const total = r.total_price ? `€${Number(r.total_price).toLocaleString("fr-FR")}` : "";
  return `
  <div style="font-family:'Helvetica Neue',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#FAFAF8;border:1px solid #E8E4DF;border-radius:8px">
    <p style="font-size:10px;letter-spacing:3px;color:#999;margin:0 0 24px">TERRASSEA</p>
    <div style="background:white;border:1px solid #E8E4DF;border-radius:6px;padding:24px">
      <h2 style="font-size:16px;color:#1a1a1a;margin:0 0 12px">Quote request received</h2>
      <p style="font-size:13px;color:#666;line-height:1.6;margin:0 0 16px">Hello ${greeting},<br>We received your quote request for <strong>${productName}</strong>. Our team will reply within <strong>48 hours</strong>.</p>
      <div style="background:#F5F3F0;border-radius:6px;padding:12px 16px;margin-bottom:16px">
        ${productNameRaw ? `<p style="font-size:12px;color:#333;margin:4px 0"><strong>Product:</strong> ${productNameRaw}</p>` : ""}
        ${quantity ? `<p style="font-size:12px;color:#333;margin:4px 0"><strong>Quantity:</strong> ${quantity} units</p>` : ""}
        ${total ? `<p style="font-size:12px;color:#333;margin:4px 0"><strong>Indicative total:</strong> ${total}</p>` : ""}
      </div>
      <a href="https://terrassea.com/products" style="display:inline-block;background:#1a1a1a;color:white;text-decoration:none;font-size:12px;font-weight:600;padding:10px 24px;border-radius:20px">Continue browsing →</a>
    </div>
    <p style="font-size:10px;color:#999;text-align:center;margin:16px 0 0">Terrassea — The outdoor hospitality sourcing platform</p>
  </div>`;
}

function quoteAlertAdmin(r: any): string {
  const title = escapeHtml(r.product_name || "Quote request");
  const fullName = r.first_name
    ? `${escapeHtml(r.first_name)} ${escapeHtml(r.last_name || "")}`.trim()
    : escapeHtml(r.contact_name);
  const total = r.total_price ? `€${Number(r.total_price).toLocaleString("fr-FR")}` : null;
  const rows: Array<[string, string | null]> = [
    ["Name",    fullName || null],
    ["Email",   escapeHtml(r.email) || null],
    ["Company", escapeHtml(r.company) || null],
    ["SIREN",   escapeHtml(r.siren) || null],
    ["Product", escapeHtml(r.product_name) || null],
    ["Qty",     r.quantity ? escapeHtml(r.quantity) : null],
    ["Total",   total],
    ["Message", escapeHtml(r.message) || null],
  ];
  return `
  <div style="font-family:'Helvetica Neue',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#FAFAF8;border:1px solid #E8E4DF;border-radius:8px">
    <p style="font-size:10px;letter-spacing:3px;color:#999;margin:0 0 24px">🔔 NEW QUOTE REQUEST</p>
    <div style="background:white;border:1px solid #E8E4DF;border-radius:6px;padding:24px">
      <h2 style="font-size:16px;color:#1a1a1a;margin:0 0 12px">${title}</h2>
      <table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:16px">
        ${rows.filter(([, v]) => v).map(([k, v]) => `<tr><td style="padding:6px 8px;color:#999;border-bottom:1px solid #f0f0f0">${k}</td><td style="padding:6px 8px;color:#333;border-bottom:1px solid #f0f0f0">${v}</td></tr>`).join("")}
      </table>
      <a href="https://terrassea.com/admin" style="display:inline-block;background:#1a1a1a;color:white;text-decoration:none;font-size:12px;font-weight:600;padding:10px 24px;border-radius:20px">View in Admin →</a>
    </div>
  </div>`;
}

function applicationConfirmationClient(r: any): string {
  const contactName = escapeHtml(r.contact_name);
  const companyName = escapeHtml(r.company_name);
  const partnerType = escapeHtml(r.partner_type);
  const country = escapeHtml(r.country);
  const categories = escapeList(r.product_categories);
  return `
  <div style="font-family:'Helvetica Neue',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#FAFAF8;border:1px solid #E8E4DF;border-radius:8px">
    <p style="font-size:10px;letter-spacing:3px;color:#999;margin:0 0 24px">TERRASSEA</p>
    <div style="background:white;border:1px solid #E8E4DF;border-radius:6px;padding:24px">
      <h2 style="font-size:16px;color:#1a1a1a;margin:0 0 12px">Application received</h2>
      <p style="font-size:13px;color:#666;line-height:1.6;margin:0 0 16px">Hello ${contactName},<br>Thank you for applying to the Terrassea Partner Programme. We review every application manually and will reply within <strong>48–72 hours</strong>.</p>
      <div style="background:#F5F3F0;border-radius:6px;padding:12px 16px;margin-bottom:16px">
        <p style="font-size:12px;color:#333;margin:4px 0"><strong>${companyName}</strong> · ${partnerType}</p>
        <p style="font-size:11px;color:#666;margin:4px 0">${country} · ${categories}</p>
      </div>
      <p style="font-size:11px;color:#999;line-height:1.5">If approved, you start on <strong>Starter</strong> — free until your 3rd confirmed order. Growth (€199/month) activates automatically.</p>
    </div>
    <p style="font-size:10px;color:#999;text-align:center;margin:16px 0 0">Terrassea · terrassea.com</p>
  </div>`;
}

function applicationAlertAdmin(r: any): string {
  const company = escapeHtml(r.company_name);
  const rows: Array<[string, string | null]> = [
    ["Contact",    escapeHtml(r.contact_name) || null],
    ["Email",      escapeHtml(r.email) || null],
    ["Country",    escapeHtml(r.country) || null],
    ["Type",       escapeHtml(r.partner_type) || null],
    ["Categories", escapeList(r.product_categories) || null],
    ["Volume",     escapeHtml(r.estimated_annual_volume) || null],
    ["Website",    escapeHtml(r.website) || null],
  ];
  const messageBlock = r.message
    ? `<p style="font-size:12px;color:#666;background:#F5F3F0;border-radius:6px;padding:12px;margin-bottom:16px;font-style:italic">"${escapeHtml(r.message)}"</p>`
    : "";
  return `
  <div style="font-family:'Helvetica Neue',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#FAFAF8;border:1px solid #E8E4DF;border-radius:8px">
    <p style="font-size:10px;letter-spacing:3px;color:#999;margin:0 0 24px">🤝 NEW PARTNER APPLICATION</p>
    <div style="background:white;border:1px solid #E8E4DF;border-radius:6px;padding:24px">
      <h2 style="font-size:16px;color:#1a1a1a;margin:0 0 12px">${company}</h2>
      <table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:16px">
        ${rows.filter(([, v]) => v).map(([k, v]) => `<tr><td style="padding:6px 8px;color:#999;border-bottom:1px solid #f0f0f0">${k}</td><td style="padding:6px 8px;color:#333;border-bottom:1px solid #f0f0f0">${v}</td></tr>`).join("")}
      </table>
      ${messageBlock}
      <a href="https://terrassea.com/admin" style="display:inline-block;background:#1a1a1a;color:white;text-decoration:none;font-size:12px;font-weight:600;padding:10px 24px;border-radius:20px">Review in Admin →</a>
    </div>
  </div>`;
}

function partnerApprovedEmail(r: any): string {
  const contactName = escapeHtml(r.contact_name);
  const companyName = escapeHtml(r.company_name);
  return `
  <div style="font-family:'Helvetica Neue',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#FAFAF8;border:1px solid #E8E4DF;border-radius:8px">
    <p style="font-size:10px;letter-spacing:3px;color:#999;margin:0 0 24px">✓ APPLICATION APPROVED</p>
    <div style="background:white;border:1px solid #E8E4DF;border-radius:6px;padding:24px">
      <h2 style="font-size:16px;color:#1a1a1a;margin:0 0 12px">Welcome to Terrassea, ${contactName}!</h2>
      <p style="font-size:13px;color:#666;line-height:1.6;margin:0 0 16px">${companyName} is now a Terrassea partner. You start on <strong>Starter</strong> — free until your 3rd confirmed order.</p>
      <div style="background:#E1F5EE;border:1px solid #B8E6D4;border-radius:6px;padding:16px;margin-bottom:16px">
        <p style="font-size:12px;color:#085041;font-weight:600;margin:0 0 8px">Your next steps</p>
        <p style="font-size:12px;color:#085041;line-height:1.8;margin:0">1. Set up your partner profile<br>2. Upload your catalogue (up to 30 products)<br>3. Respond to quote requests within 48h<br>4. 3rd confirmed order → automatic Growth upgrade (€199/month, 5% commission)</p>
      </div>
      <a href="https://terrassea.com/account" style="display:inline-block;background:#1a1a1a;color:white;text-decoration:none;font-size:12px;font-weight:600;padding:10px 24px;border-radius:20px">Access your partner dashboard →</a>
    </div>
    <p style="font-size:10px;color:#999;text-align:center;margin:16px 0 0">Terrassea · terrassea.com</p>
  </div>`;
}

Deno.serve(async (req) => {
  // Auth: accept service-role key OR trigger secret (from DB webhooks via vault)
  const authHeader = req.headers.get("Authorization");
  const triggerSecret = req.headers.get("X-Trigger-Secret");
  const isServiceRole = authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
  const isTrigger = TRIGGER_SECRET !== "" && triggerSecret === TRIGGER_SECRET;
  if (!isServiceRole && !isTrigger) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json();
    const { type, table, record } = payload;

    if (type !== "INSERT" && type !== "UPDATE") {
      return new Response("OK", { status: 200 });
    }

    if (table === "quote_requests" && type === "INSERT") {
      await Promise.all([
        record.email && sendEmail(record.email, `Quote request received — ${record.product_name || "Terrassea"}`, quoteConfirmationClient(record)),
        sendEmail(ADMIN_EMAIL, `🔔 New quote — ${record.product_name || "product"} × ${record.quantity || 1}`, quoteAlertAdmin(record)),
      ]);
    }

    if (table === "partner_applications" && type === "INSERT") {
      const applicantEmail = record.email || record.contact_email;
      await Promise.all([
        applicantEmail && sendEmail(applicantEmail, "Application received — Terrassea Partner Programme", applicationConfirmationClient(record)),
        sendEmail(ADMIN_EMAIL, `🤝 New partner application — ${record.company_name} (${record.country})`, applicationAlertAdmin(record)),
      ]);
    }

    if (table === "partner_applications" && type === "UPDATE" && record.status === "approved") {
      const applicantEmail = record.email || record.contact_email;
      if (applicantEmail) await sendEmail(applicantEmail, "🎉 Your Terrassea partner application is approved", partnerApprovedEmail(record));
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
