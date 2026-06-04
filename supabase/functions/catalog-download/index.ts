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
    .select("id, documents")
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

  return json({
    url: signed.signedUrl,
    filename: catalog.filename ?? "catalogue.pdf",
    title: catalog.title ?? "Catalogue",
    expires_at: new Date(Date.now() + TTL_SECONDS * 1000).toISOString(),
  });
});
