import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "https://terrassea.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-api-key, x-webhook-secret, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * Stock Sync Webhook
 *
 * Partners push stock updates to this endpoint.
 * Authentication via X-Api-Key header (terrassea_api_key from partner_api_connections).
 *
 * Expected payload:
 * {
 *   "products": [
 *     {
 *       "sku": "RIV-001",           // matches partner_ref in product_offers
 *       "quantity": 150,             // stock quantity
 *       "price": 140.00,            // optional: update price
 *       "status": "in_stock",       // optional: in_stock | out_of_stock | low_stock | discontinued
 *       "delivery_days": 5          // optional: update delivery delay
 *     }
 *   ]
 * }
 *
 * Alternative flat format (single product):
 * {
 *   "sku": "RIV-001",
 *   "quantity": 150,
 *   "price": 140.00
 * }
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // ── Authenticate via API key ──
    const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");
    if (!apiKey) {
      return jsonResponse(401, { error: "Missing X-Api-Key header" });
    }

    // Look up the connection
    const { data: connection, error: connErr } = await supabase
      .from("partner_api_connections")
      .select("id, partner_id, is_active, field_mapping, webhook_secret")
      .eq("terrassea_api_key", apiKey)
      .single();

    if (connErr || !connection) {
      return jsonResponse(401, { error: "Invalid API key" });
    }

    if (!connection.is_active) {
      return jsonResponse(403, { error: "API connection is not active. Enable it in your dashboard." });
    }

    // Optional: verify webhook secret if provided
    const webhookSecret = req.headers.get("x-webhook-secret");
    if (connection.webhook_secret && webhookSecret && webhookSecret !== connection.webhook_secret) {
      return jsonResponse(401, { error: "Invalid webhook secret" });
    }

    // ── Parse payload ──
    const body = await req.json();
    const mapping = connection.field_mapping || {
      sku_field: "sku",
      stock_field: "quantity",
      price_field: "price",
      status_field: "status",
    };

    // Support single product or array
    let items: any[];
    if (body.products && Array.isArray(body.products)) {
      items = body.products;
    } else if (body[mapping.sku_field] || body.sku) {
      items = [body];
    } else {
      return jsonResponse(400, {
        error: "Invalid payload. Expected { products: [...] } or a single product object.",
        expected_format: {
          products: [
            { [mapping.sku_field]: "SKU-001", [mapping.stock_field]: 100, [mapping.price_field]: 140, [mapping.status_field]: "in_stock" },
          ],
        },
      });
    }

    if (items.length === 0) {
      return jsonResponse(400, { error: "No products in payload" });
    }

    if (items.length > 1000) {
      return jsonResponse(400, { error: "Maximum 1000 products per request" });
    }

    // ── Process updates ──
    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const item of items) {
      const sku = item[mapping.sku_field] || item.sku;
      if (!sku) {
        failed++;
        errors.push(`Missing SKU field (${mapping.sku_field})`);
        continue;
      }

      const stockQty = item[mapping.stock_field] ?? item.quantity;
      const price = item[mapping.price_field] ?? item.price;
      const status = item[mapping.status_field] ?? item.status;
      const deliveryDays = item.delivery_days ?? item.delivery_delay_days;

      // Build update object
      const updateData: Record<string, any> = {};
      if (stockQty !== undefined && stockQty !== null) {
        updateData.stock_quantity = Number(stockQty);
        // Auto-determine stock status if not explicitly provided
        if (!status) {
          if (Number(stockQty) <= 0) updateData.stock_status = "out_of_stock";
          else if (Number(stockQty) < 10) updateData.stock_status = "low_stock";
          else updateData.stock_status = "in_stock";
        }
      }
      if (price !== undefined && price !== null) {
        updateData.price = Number(price);
      }
      if (status) {
        updateData.stock_status = status;
      }
      if (deliveryDays !== undefined && deliveryDays !== null) {
        updateData.delivery_delay_days = Number(deliveryDays);
      }

      if (Object.keys(updateData).length === 0) {
        failed++;
        errors.push(`No updateable fields for SKU ${sku}`);
        continue;
      }

      // Update product_offers by partner_ref (SKU) and partner_id
      const { error: updateErr, count } = await supabase
        .from("product_offers")
        .update(updateData)
        .eq("partner_id", connection.partner_id)
        .eq("partner_ref", sku);

      if (updateErr) {
        failed++;
        errors.push(`Error updating ${sku}: ${updateErr.message}`);
      } else if (count === 0) {
        // Try matching by product name as fallback
        failed++;
        errors.push(`No offer found for SKU ${sku}`);
      } else {
        updated++;
      }
    }

    const duration = Date.now() - startTime;
    const status = failed === 0 ? "success" : updated === 0 ? "error" : "partial";

    // ── Log the sync ──
    await supabase.from("stock_sync_logs").insert({
      connection_id: connection.id,
      partner_id: connection.partner_id,
      sync_mode: "push",
      status,
      products_updated: updated,
      products_failed: failed,
      error_message: errors.length > 0 ? errors.slice(0, 10).join("; ") : null,
      request_payload: { count: items.length },
      duration_ms: duration,
    });

    // ── Update connection status ──
    await supabase
      .from("partner_api_connections")
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: status,
        last_sync_message: errors.length > 0 ? errors[0] : `${updated} products updated`,
        last_sync_products_count: updated,
        total_syncs: (connection as any).total_syncs + 1,
        consecutive_errors: status === "error" ? (connection as any).consecutive_errors + 1 : 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);

    return jsonResponse(200, {
      success: true,
      updated,
      failed,
      total: items.length,
      errors: errors.slice(0, 10),
      duration_ms: duration,
    });
  } catch (err: any) {
    return jsonResponse(500, { error: err.message });
  }
});

function jsonResponse(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
