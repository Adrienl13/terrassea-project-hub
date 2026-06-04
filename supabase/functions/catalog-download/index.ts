// ============================================================================
// catalog-download — Edge Function
//
// Lead-gated download d'un catalogue PDF partner. Le visiteur (anonyme) laisse
// son contact ; on enregistre le lead puis on renvoie une signed URL (TTL court)
// vers le PDF stocké dans le bucket privé 'partner-catalogs'.
//
// Body : { partner_id: uuid, catalog_id: string, name?, email, company?, locale? }
// Returns : { url: string, filename: string, title: string, expires_at: string }
//
// verify_jwt = false : les visiteurs publics ne sont pas authentifiés. La
// sécurité repose sur : (1) validation serveur des champs, (2) le path du PDF
// n'est jamais exposé côté client (résolu ici depuis partners.documents via
// service_role), (3) signed URL éphémère (5 min).
//
// Companion : supabase/migrations/20260604120000_catalog_downloads_phase_1.sql
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TTL_SECONDS = 300; // 5 min
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface CatalogDoc {
  id: string;
  kind: string;
  title?: string;
  path: string;
  filename?: string;
  size?: number;
  uploaded_at?: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function extractIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0].trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip");
}

function clean(v: unknown, max = 200): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t.length ? t : null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// deno-lint-ignore no-explicit-any
type Admin = any;

interface NotifyArgs {
  partnerId: string;
  userId: string | null;
  partnerName: string | null;
  contactEmail: string | null;
  catalogTitle: string | null;
  leadName: string | null;
  leadEmail: string;
  leadCompany: string | null;
}

// Best-effort notification to the partner (in-app + email). Never throws into
// the request path — a failed notification must not block the visitor's download.
async function notifyPartner(admin: Admin, p: NotifyArgs): Promise<void> {
  const who = p.leadName || p.leadEmail;
  const what = p.catalogTitle || "votre catalogue";

  // 1. In-app notification for the partner owner.
  if (p.userId) {
    await admin.from("notifications").insert({
      user_id: p.userId,
      title: "Nouveau lead catalogue",
      body: `${who} a téléchargé « ${what} ».`,
      type: "info",
      link: "/account",
    });
  }

  // 2. Email — prefer the partner's public contact email, fall back to the
  //    owner's account email.
  let to = p.contactEmail;
  if (!to && p.userId) {
    try {
      const { data } = await admin.auth.admin.getUserById(p.userId);
      to = data?.user?.email ?? null;
    } catch { /* ignore */ }
  }
  if (!to) return;

  const rows: string[] = [
    `Nom : ${p.leadName || "—"}`,
    `Email : ${p.leadEmail}`,
    ...(p.leadCompany ? [`Société : ${p.leadCompany}`] : []),
    `Catalogue : ${p.catalogTitle || "—"}`,
  ];
  const subject = `Nouveau lead — ${what}`;
  const body_text =
    `Bonne nouvelle ! Un visiteur vient de télécharger ${what} sur votre page Terrassea.\n\n` +
    `${rows.join("\n")}\n\n` +
    `Répondez directement à cet email pour assurer le suivi du prospect.`;
  const body_html =
    `<p>Bonne nouvelle ! Un visiteur vient de télécharger « ${escapeHtml(what)} » sur votre page Terrassea.</p>` +
    `<ul>${rows.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>` +
    `<p>Répondez directement à cet email pour assurer le suivi du prospect.</p>`;

  await fetch(`${SUPABASE_URL}/functions/v1/send-notification-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ to, subject, body_html, body_text, reply_to: p.leadEmail }),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const partnerId = clean(body.partner_id, 64);
  const catalogId = clean(body.catalog_id, 64);
  const email = clean(body.email, 254);
  const name = clean(body.name);
  const company = clean(body.company);
  const locale = clean(body.locale, 8);

  if (!partnerId || !catalogId) return json({ error: "partner_id and catalog_id required" }, 400);
  if (!email || !EMAIL_RE.test(email)) return json({ error: "A valid email is required" }, 400);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Resolve the catalog entry from partners.documents (path never trusted client-side).
  const { data: partner, error: partnerErr } = await admin
    .from("partners")
    .select("id, name, contact_email, user_id, documents")
    .eq("id", partnerId)
    .maybeSingle();

  if (partnerErr) {
    console.error("[catalog-download] partner fetch error", partnerErr);
    return json({ error: "Lookup failed" }, 500);
  }
  if (!partner) return json({ error: "Partner not found" }, 404);

  const docs: CatalogDoc[] = Array.isArray(partner.documents) ? partner.documents : [];
  const catalog = docs.find((d) => d && d.kind === "catalog" && d.id === catalogId);

  if (!catalog || !catalog.path) return json({ error: "Catalog not found" }, 404);

  // Record the lead (service_role — only allowed writer per RLS).
  const { error: leadErr } = await admin.from("catalog_leads").insert({
    partner_id: partnerId,
    catalog_id: catalogId,
    catalog_title: catalog.title ?? null,
    name,
    email,
    company,
    locale,
    ip_address: extractIp(req),
    user_agent: req.headers.get("user-agent") ?? null,
  });

  if (leadErr) {
    // A failed lead insert must not silently grant access — surface it.
    console.error("[catalog-download] lead insert error", leadErr);
    return json({ error: "Could not register your request" }, 500);
  }

  // Signed URL (private bucket). forceDownload sets a download disposition.
  const { data: signed, error: signErr } = await admin.storage
    .from("partner-catalogs")
    .createSignedUrl(catalog.path, TTL_SECONDS, {
      download: catalog.filename || true,
    });

  if (signErr || !signed?.signedUrl) {
    console.error("[catalog-download] sign error", signErr);
    return json({ error: "Failed to generate download link" }, 500);
  }

  // Notify the partner of the new lead — best effort, never blocks the download.
  try {
    await notifyPartner(admin, {
      partnerId,
      userId: partner.user_id ?? null,
      partnerName: partner.name ?? null,
      contactEmail: partner.contact_email ?? null,
      catalogTitle: catalog.title ?? null,
      leadName: name,
      leadEmail: email,
      leadCompany: company,
    });
  } catch (e) {
    console.warn("[catalog-download] partner notification failed", e);
  }

  return json({
    url: signed.signedUrl,
    filename: catalog.filename ?? "catalogue.pdf",
    title: catalog.title ?? "Catalogue",
    expires_at: new Date(Date.now() + TTL_SECONDS * 1000).toISOString(),
  });
});
