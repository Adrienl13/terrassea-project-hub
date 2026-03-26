import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const ADMIN_EMAIL    = Deno.env.get("ADMIN_EMAIL")    || "";
const FROM_EMAIL     = "Terrassea <noreply@terrassea.com>";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

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
  return `
  <div style="font-family:'Helvetica Neue',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#FAFAF8;border:1px solid #E8E4DF;border-radius:8px">
    <p style="font-size:10px;letter-spacing:3px;color:#999;margin:0 0 24px">TERRASSEA</p>
    <div style="background:white;border:1px solid #E8E4DF;border-radius:6px;padding:24px">
      <h2 style="font-size:16px;color:#1a1a1a;margin:0 0 12px">Quote request received</h2>
      <p style="font-size:13px;color:#666;line-height:1.6;margin:0 0 16px">Hello ${r.first_name || r.contact_name || ""},<br>We received your quote request for <strong>${r.product_name || "your selection"}</strong>. Our team will reply within <strong>48 hours</strong>.</p>
      <div style="background:#F5F3F0;border-radius:6px;padding:12px 16px;margin-bottom:16px">
        ${r.product_name ? `<p style="font-size:12px;color:#333;margin:4px 0"><strong>Product:</strong> ${r.product_name}</p>` : ""}
        ${r.quantity ? `<p style="font-size:12px;color:#333;margin:4px 0"><strong>Quantity:</strong> ${r.quantity} units</p>` : ""}
        ${r.total_price ? `<p style="font-size:12px;color:#333;margin:4px 0"><strong>Indicative total:</strong> €${Number(r.total_price).toLocaleString("fr-FR")}</p>` : ""}
      </div>
      <a href="https://terrassea.com/products" style="display:inline-block;background:#1a1a1a;color:white;text-decoration:none;font-size:12px;font-weight:600;padding:10px 24px;border-radius:20px">Continue browsing →</a>
    </div>
    <p style="font-size:10px;color:#999;text-align:center;margin:16px 0 0">Terrassea — The outdoor hospitality sourcing platform</p>
  </div>`;
}

function quoteAlertAdmin(r: any): string {
  return `
  <div style="font-family:'Helvetica Neue',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#FAFAF8;border:1px solid #E8E4DF;border-radius:8px">
    <p style="font-size:10px;letter-spacing:3px;color:#999;margin:0 0 24px">🔔 NEW QUOTE REQUEST</p>
    <div style="background:white;border:1px solid #E8E4DF;border-radius:6px;padding:24px">
      <h2 style="font-size:16px;color:#1a1a1a;margin:0 0 12px">${r.product_name || "Quote request"}</h2>
      <table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:16px">
        ${[["Name", r.first_name ? `${r.first_name} ${r.last_name||""}` : r.contact_name],["Email",r.email],["Company",r.company],["SIREN",r.siren],["Product",r.product_name],["Qty",r.quantity],["Total",r.total_price?`€${Number(r.total_price).toLocaleString("fr-FR")}`:null],["Message",r.message]].filter(([,v])=>v).map(([k,v])=>`<tr><td style="padding:6px 8px;color:#999;border-bottom:1px solid #f0f0f0">${k}</td><td style="padding:6px 8px;color:#333;border-bottom:1px solid #f0f0f0">${v}</td></tr>`).join("")}
      </table>
      <a href="https://terrassea.com/admin" style="display:inline-block;background:#1a1a1a;color:white;text-decoration:none;font-size:12px;font-weight:600;padding:10px 24px;border-radius:20px">View in Admin →</a>
    </div>
  </div>`;
}

function applicationConfirmationClient(r: any): string {
  return `
  <div style="font-family:'Helvetica Neue',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#FAFAF8;border:1px solid #E8E4DF;border-radius:8px">
    <p style="font-size:10px;letter-spacing:3px;color:#999;margin:0 0 24px">TERRASSEA</p>
    <div style="background:white;border:1px solid #E8E4DF;border-radius:6px;padding:24px">
      <h2 style="font-size:16px;color:#1a1a1a;margin:0 0 12px">Application received</h2>
      <p style="font-size:13px;color:#666;line-height:1.6;margin:0 0 16px">Hello ${r.contact_name},<br>Thank you for applying to the Terrassea Partner Programme. We review every application manually and will reply within <strong>48–72 hours</strong>.</p>
      <div style="background:#F5F3F0;border-radius:6px;padding:12px 16px;margin-bottom:16px">
        <p style="font-size:12px;color:#333;margin:4px 0"><strong>${r.company_name}</strong> · ${r.partner_type}</p>
        <p style="font-size:11px;color:#666;margin:4px 0">${r.country} · ${(r.product_categories||[]).join(", ")}</p>
      </div>
      <p style="font-size:11px;color:#999;line-height:1.5">If approved, you start on <strong>Starter</strong> — free until your 3rd confirmed order. Growth (€199/month) activates automatically.</p>
    </div>
    <p style="font-size:10px;color:#999;text-align:center;margin:16px 0 0">Terrassea · terrassea.com</p>
  </div>`;
}

function applicationAlertAdmin(r: any): string {
  return `
  <div style="font-family:'Helvetica Neue',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#FAFAF8;border:1px solid #E8E4DF;border-radius:8px">
    <p style="font-size:10px;letter-spacing:3px;color:#999;margin:0 0 24px">🤝 NEW PARTNER APPLICATION</p>
    <div style="background:white;border:1px solid #E8E4DF;border-radius:6px;padding:24px">
      <h2 style="font-size:16px;color:#1a1a1a;margin:0 0 12px">${r.company_name}</h2>
      <table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:16px">
        ${[["Contact",r.contact_name],["Email",r.email],["Country",r.country],["Type",r.partner_type],["Categories",(r.product_categories||[]).join(", ")],["Volume",r.estimated_annual_volume],["Website",r.website]].filter(([,v])=>v).map(([k,v])=>`<tr><td style="padding:6px 8px;color:#999;border-bottom:1px solid #f0f0f0">${k}</td><td style="padding:6px 8px;color:#333;border-bottom:1px solid #f0f0f0">${v}</td></tr>`).join("")}
      </table>
      ${r.message?`<p style="font-size:12px;color:#666;background:#F5F3F0;border-radius:6px;padding:12px;margin-bottom:16px;font-style:italic">"${r.message}"</p>`:""}
      <a href="https://terrassea.com/admin" style="display:inline-block;background:#1a1a1a;color:white;text-decoration:none;font-size:12px;font-weight:600;padding:10px 24px;border-radius:20px">Review in Admin →</a>
    </div>
  </div>`;
}

function partnerApprovedEmail(r: any): string {
  return `
  <div style="font-family:'Helvetica Neue',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#FAFAF8;border:1px solid #E8E4DF;border-radius:8px">
    <p style="font-size:10px;letter-spacing:3px;color:#999;margin:0 0 24px">✓ APPLICATION APPROVED</p>
    <div style="background:white;border:1px solid #E8E4DF;border-radius:6px;padding:24px">
      <h2 style="font-size:16px;color:#1a1a1a;margin:0 0 12px">Welcome to Terrassea, ${r.contact_name}!</h2>
      <p style="font-size:13px;color:#666;line-height:1.6;margin:0 0 16px">${r.company_name} is now a Terrassea partner. You start on <strong>Starter</strong> — free until your 3rd confirmed order.</p>
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
  // Auth: require service-role key (called by DB webhook)
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
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
      await Promise.all([
        record.contact_email && sendEmail(record.contact_email, "Application received — Terrassea Partner Programme", applicationConfirmationClient(record)),
        sendEmail(ADMIN_EMAIL, `🤝 New partner application — ${record.company_name} (${record.country})`, applicationAlertAdmin(record)),
      ]);
    }

    if (table === "partner_applications" && type === "UPDATE" && record.status === "approved") {
      record.contact_email && await sendEmail(record.contact_email, "🎉 Your Terrassea partner application is approved", partnerApprovedEmail(record));
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
