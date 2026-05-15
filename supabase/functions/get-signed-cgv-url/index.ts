// ============================================================================
// get-signed-cgv-url — Edge Function
//
// Génère une signed URL Supabase Storage (TTL court) pour consulter le PDF
// d'une CGV partner. Auth requise + permission check (admin OR owner partner).
//
// Phase 3 viewer + Dette 105 (resolves).
//
// Body: { partner_cgv_id: uuid, ttl_seconds?: number }
// Returns: { url: string, expires_at: string }
//
// Permissions :
//   - admin (RPC public.is_admin() via user-auth client)
//   - owner partner (partners.user_id = auth.uid() AND deleted_at IS NULL,
//     via service-role lookup pour bypass RLS partage)
//
// Statut autorisé : 'active' OU 'archived' (la CGV archivée reste consultable
// pour preuves d'acceptations passées).
//
// TTL : default 60s (pattern Stripe), max 3600s.
//
// Audit cgv_url_grants (Dette 103) : non implémenté dans ce MVP ; capture
// déjà existante. À ajouter avant Vague 2 transactionnelle.
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_TTL = 60;
const MAX_TTL = 3600;
const VIEWABLE_STATUSES = new Set(["active", "archived"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Auth required" }, 401);

  let body: { partner_cgv_id?: string; ttl_seconds?: number };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const partnerCgvId = body.partner_cgv_id;
  if (!partnerCgvId || typeof partnerCgvId !== "string") {
    return json({ error: "partner_cgv_id required" }, 400);
  }

  const ttl = Math.min(
    Math.max(Math.floor(body.ttl_seconds ?? DEFAULT_TTL), 30),
    MAX_TTL,
  );

  // Client user-auth pour identifier l'appelant + appeler is_admin()
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json({ error: "Invalid auth" }, 401);
  }
  const userId = userData.user.id;

  // Service-role client pour bypass RLS (récup row + sign URL)
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: cgvRow, error: cgvErr } = await adminClient
    .from("partner_cgv")
    .select("id, partner_id, storage_path, status")
    .eq("id", partnerCgvId)
    .maybeSingle();

  if (cgvErr) {
    console.error("[get-signed-cgv-url] cgv fetch error", cgvErr);
    return json({ error: "Lookup failed" }, 500);
  }
  if (!cgvRow) return json({ error: "CGV not found" }, 404);

  if (!VIEWABLE_STATUSES.has(cgvRow.status)) {
    return json({ error: "CGV not viewable in current status" }, 403);
  }

  // Permission check : admin via RPC OR owner partner via service-role lookup
  let authorized = false;

  try {
    const { data: isAdminResult } = await userClient.rpc("is_admin");
    if (isAdminResult === true) authorized = true;
  } catch (e) {
    console.warn("[get-signed-cgv-url] is_admin rpc failed", e);
  }

  if (!authorized) {
    const { data: partnerRow } = await adminClient
      .from("partners")
      .select("id")
      .eq("id", cgvRow.partner_id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (partnerRow?.id) authorized = true;
  }

  if (!authorized) {
    return json({ error: "Forbidden" }, 403);
  }

  // Signed URL
  const { data: signed, error: signedErr } = await adminClient.storage
    .from("partner-cgv")
    .createSignedUrl(cgvRow.storage_path, ttl);

  if (signedErr || !signed?.signedUrl) {
    console.error("[get-signed-cgv-url] sign error", signedErr);
    return json({ error: "Failed to generate URL" }, 500);
  }

  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

  return json({ url: signed.signedUrl, expires_at: expiresAt, ttl_seconds: ttl });
});
