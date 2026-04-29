import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ============================================================================
// check-abandoned-carts — cron-triggered reactivation of abandoned saved carts
//
// SECURITY (added 2026-04-29 during Phase 1 audit):
//   This function used to accept anonymous POST. It is now gated by:
//   1. Feature flag  ENABLE_ABANDONED_CARTS_CRON = "true"   (default OFF)
//   2. Custom secret CRON_SECRET                            (Authorization: Bearer)
//
//   Both must be set as edge function secrets to enable. The pg_cron job calling
//   this function must pass the CRON_SECRET in the Authorization header.
//
//   Default state = disabled (returns 503). Re-enable steps:
//     1. Set CRON_SECRET as edge secret (random 32+ chars)
//     2. Set ENABLE_ABANDONED_CARTS_CRON = "true" as edge secret
//     3. Update pg_cron job 2 to include `"Authorization": "Bearer <secret>"`
//        in its headers JSON (use Vault for the secret value)
// ============================================================================

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "https://terrassea.com";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENABLE_ABANDONED_CARTS_CRON = Deno.env.get("ENABLE_ABANDONED_CARTS_CRON") === "true";
const CRON_SECRET = Deno.env.get("CRON_SECRET");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Guard 1: feature flag (default disabled — fail-closed)
  if (!ENABLE_ABANDONED_CARTS_CRON) {
    return new Response(
      JSON.stringify({
        error: "Service disabled",
        reason: "ENABLE_ABANDONED_CARTS_CRON not set to 'true'",
      }),
      { status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  // Guard 2: dedicated cron secret (not service_role, to limit blast radius)
  const authHeader = req.headers.get("Authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Read settings
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", ["abandoned_cart_enabled", "abandoned_cart_delay_hours", "abandoned_cart_max_reminders"]);

    const settingsMap: Record<string, string> = {};
    (settings || []).forEach((s: any) => { settingsMap[s.key] = s.value; });

    const enabled = settingsMap.abandoned_cart_enabled !== "false";
    if (!enabled) {
      return new Response(JSON.stringify({ message: "Abandoned cart reminders disabled" }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const delayHours = parseInt(settingsMap.abandoned_cart_delay_hours || "24");
    const maxReminders = parseInt(settingsMap.abandoned_cart_max_reminders || "2");
    const cutoff = new Date(Date.now() - delayHours * 3600000).toISOString();

    // Find abandoned carts: not submitted, last synced before cutoff, under max reminders, has items
    const { data: abandonedCarts, error: fetchError } = await supabase
      .from("saved_carts")
      .select("id, user_id, item_count, total_estimated, reminder_count, last_synced_at")
      .is("submitted_at", null)
      .lt("last_synced_at", cutoff)
      .lt("reminder_count", maxReminders)
      .gt("item_count", 0)
      .limit(50);

    if (fetchError) {
      console.error("Failed to fetch abandoned carts:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (!abandonedCarts || abandonedCarts.length === 0) {
      return new Response(JSON.stringify({ message: "No abandoned carts found", processed: 0 }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    let processed = 0;

    for (const cart of abandonedCarts) {
      // Get user profile for notification
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("first_name, email")
        .eq("id", cart.user_id)
        .single();

      if (!profile) continue;

      const firstName = profile.first_name || "there";
      const itemText = cart.item_count === 1 ? "1 product" : `${cart.item_count} products`;
      const budgetText = cart.total_estimated > 0
        ? ` (estimated ~\u20ac${Math.round(cart.total_estimated).toLocaleString()})`
        : "";

      const isFirstReminder = cart.reminder_count === 0;

      const title = isFirstReminder
        ? `Hi ${firstName}, your project is waiting!`
        : `${firstName}, don't miss out on your selection`;

      const message = isFirstReminder
        ? `You have ${itemText}${budgetText} in your sourcing cart. Complete your request to get supplier quotes.`
        : `Your cart with ${itemText}${budgetText} is still available. Finalize your project to secure the best rates.`;

      // Insert notification
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: cart.user_id,
          title,
          message,
          type: "cart_reminder",
          action_url: "/project-cart",
          is_read: false,
        });

      if (notifError) {
        console.error(`Failed to notify user ${cart.user_id}:`, notifError);
        continue;
      }

      // Update cart reminder tracking
      await supabase
        .from("saved_carts")
        .update({
          reminder_sent_at: new Date().toISOString(),
          reminder_count: cart.reminder_count + 1,
        })
        .eq("id", cart.id);

      processed++;
    }

    return new Response(JSON.stringify({
      message: `Processed ${processed} abandoned cart reminders`,
      processed,
      total_found: abandonedCarts.length,
    }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Abandoned cart check error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
