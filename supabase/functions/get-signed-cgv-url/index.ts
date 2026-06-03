// ============================================================================
// get-signed-cgv-url — Edge Function
//
// Génère une signed URL Supabase Storage (TTL court) pour consulter le PDF
// d'une CGV partner.
//   - statut 'active'   : PUBLIC (un acheteur doit pouvoir lire les CGV d'une
//                         marque avant de s'engager) — aucune auth requise.
//   - statut 'archived' : restreint (admin OU partner propriétaire).
//
// Phase 3 viewer + Dette 105 + Dette 103 (resolves both).
//
// Body: { partner_cgv_id: uuid, ttl_seconds?: number }
// Returns: { url: string, expires_at: string, ttl_seconds: number }
//
// TTL : default 60s (pattern Stripe), min 30s, max 3600s.
//
// Audit cgv_url_grants (Dette 103) : journalisé uniquement pour un appelant
// identifié (les consultations publiques anonymes d'une CGV 'active' ne sont
// pas journalisées par utilisateur). L'échec d'insert audit n'invalide pas le
// grant (log warning, return URL quand même).
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

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function extractIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0].trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");

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

  // Identify the caller IF a token is provided (optional for public 'active' CGV).
  let userId: string | null = null;
  let isAdmin = false;
  if (authHeader) {
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (userData?.user) {
      userId = userData.user.id;
      try {
        const { data: isAdminResult } = await userClient.rpc("is_admin");
        if (isAdminResult === true) isAdmin = true;
      } catch (e) {
        console.warn("[get-signed-cgv-url] is_admin rpc failed", e);
      }
    }
  }

  // Authorization :
  //   - 'active' CGV (published terms) = PUBLIC : a buyer must be able to read a
  //     brand's sales terms before engaging, so no auth is required.
  //   - 'archived' CGV = restricted to admin OR the owner partner (kept only as
  //     proof of past acceptances, not for public browsing).
  let authorized = cgvRow.status === "active";

  if (!authorized) {
    if (!userId) return json({ error: "Auth required" }, 401);
    if (isAdmin) {
      authorized = true;
    } else {
      const { data: partnerRow } = await adminClient
        .from("partners")
        .select("id")
        .eq("id", cgvRow.partner_id)
        .eq("user_id", userId)
        .is("deleted_at", null)
        .maybeSingle();
      if (partnerRow?.id) authorized = true;
    }
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

  // Dette 103 — journal d'audit immuable, uniquement pour un appelant identifié.
  if (userId) try {
    const signedUrlHash = await sha256Hex(signed.signedUrl);
    const ipAddress = extractIp(req);
    const userAgent = req.headers.get("user-agent") ?? null;

    const { error: auditErr } = await adminClient.from("cgv_url_grants").insert({
      user_id: userId,
      partner_cgv_id: cgvRow.id,
      partner_id: cgvRow.partner_id,
      signed_url_hash: signedUrlHash,
      ip_address: ipAddress,
      user_agent: userAgent,
      ttl_seconds: ttl,
      expires_at: expiresAt,
    });
    if (auditErr) {
      console.warn("[get-signed-cgv-url] audit log insert failed", auditErr);
    }
  } catch (e) {
    console.warn("[get-signed-cgv-url] audit log unexpected error", e);
  }

  return json({ url: signed.signedUrl, expires_at: expiresAt, ttl_seconds: ttl });
});
