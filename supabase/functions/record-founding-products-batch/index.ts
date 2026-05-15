// ============================================================================
// record-founding-products-batch — Edge Function (Dette 108 Session 2)
//
// Récompense l'action 'first_5_products' (200 pts one-shot) quand un partner
// atteint le seuil de 5 produits publiés. Appelée depuis le frontend partner
// quand un produit vient d'être créé.
//
// Body: { partner_id: uuid }
// Returns: { recorded: boolean, products_count: number, action_id?: string }
//
// Auth required (Bearer). Le caller doit être :
//   - admin (via is_admin RPC)
//   - OU owner du partner (partners.user_id = auth.uid)
//
// Permission check + dédup garantis par la RPC record_founding_action côté DB.
// L'Edge fait juste le count + appel propre.
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

const PRODUCTS_THRESHOLD = 5;

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

  let body: { partner_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const partnerId = body.partner_id;
  if (!partnerId || typeof partnerId !== "string") {
    return json({ error: "partner_id required" }, 400);
  }

  // User-auth client pour validation caller
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json({ error: "Invalid auth" }, 401);
  const userId = userData.user.id;

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Permission check : admin OR owner partner
  let authorized = false;
  try {
    const { data: isAdminResult } = await userClient.rpc("is_admin");
    if (isAdminResult === true) authorized = true;
  } catch (e) {
    console.warn("[record-founding-products-batch] is_admin failed", e);
  }
  if (!authorized) {
    const { data: ownerRow } = await adminClient
      .from("partners")
      .select("id")
      .eq("id", partnerId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (ownerRow?.id) authorized = true;
  }
  if (!authorized) return json({ error: "Forbidden" }, 403);

  // Count des produits du partner
  const { count, error: countErr } = await adminClient
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("partner_id", partnerId);

  if (countErr) {
    console.error("[record-founding-products-batch] count error", countErr);
    return json({ error: "Count failed" }, 500);
  }

  const productsCount = count ?? 0;
  if (productsCount < PRODUCTS_THRESHOLD) {
    return json({ recorded: false, products_count: productsCount, threshold: PRODUCTS_THRESHOLD });
  }

  // Appel RPC (récompense + anti-fraude one-shot intégrés)
  const { data: actionId, error: rpcErr } = await adminClient.rpc("record_founding_action", {
    p_partner_id: partnerId,
    p_action_type: "first_5_products",
    p_reference_id: null,
    p_meta: { products_count: productsCount },
  });

  if (rpcErr) {
    console.error("[record-founding-products-batch] rpc error", rpcErr);
    return json({ error: "Recording failed: " + rpcErr.message }, 500);
  }

  return json({
    recorded: actionId !== null,
    products_count: productsCount,
    action_id: actionId,
  });
});
