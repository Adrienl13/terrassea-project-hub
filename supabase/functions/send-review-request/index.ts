import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface EligibleOrder {
  id: string;
  client_user_id: string;
  client_email: string;
  partner_id: string;
  product_name: string;
  delivered_at: string;
}

function buildReviewEmailHtml(order: EligibleOrder, clientName: string): string {
  return `
  <div style="font-family:'Helvetica Neue',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#FAFAF8;border:1px solid #E8E4DF;border-radius:8px">
    <p style="font-size:10px;letter-spacing:3px;color:#999;margin:0 0 24px">TERRASSEA</p>
    <div style="background:white;border:1px solid #E8E4DF;border-radius:6px;padding:24px">
      <h2 style="font-size:16px;color:#1a1a1a;margin:0 0 12px">How was your experience?</h2>
      <p style="font-size:13px;color:#666;line-height:1.6;margin:0 0 16px">
        Hello ${clientName},<br>
        Your order for <strong>${order.product_name}</strong> was delivered on
        <strong>${new Date(order.delivered_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</strong>.
        We'd love to hear how it went!
      </p>
      <div style="background:#F5F3F0;border-radius:6px;padding:12px 16px;margin-bottom:16px">
        <p style="font-size:12px;color:#333;margin:4px 0">Your feedback helps other hospitality professionals make better sourcing decisions and helps our partners improve their service.</p>
      </div>
      <a href="https://terrassea.com/account?tab=orders&review=${order.id}" style="display:inline-block;background:#1a1a1a;color:white;text-decoration:none;font-size:12px;font-weight:600;padding:10px 24px;border-radius:20px">Leave a review</a>
    </div>
    <p style="font-size:10px;color:#999;text-align:center;margin:16px 0 0">Terrassea - The outdoor hospitality sourcing platform</p>
  </div>`;
}

function buildReviewEmailText(order: EligibleOrder, clientName: string): string {
  return `Hello ${clientName},\n\nYour order for ${order.product_name} was delivered on ${new Date(order.delivered_at).toLocaleDateString("en-GB")}. We'd love to hear how it went!\n\nLeave a review: https://terrassea.com/account?tab=orders&review=${order.id}\n\nTerrassea - The outdoor hospitality sourcing platform`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Auth: require service-role key (internal function only)
  const reqAuthHeader = req.headers.get("Authorization");
  if (reqAuthHeader !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Find orders delivered > 7 days ago, not yet review-requested,
    // and without an existing partner_rating for that user+partner+order combo
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffISO = sevenDaysAgo.toISOString();

    const { data: eligibleOrders, error: ordersError } = await supabase
      .from("orders")
      .select("id, client_user_id, client_email, partner_id, product_name, delivered_at")
      .eq("status", "delivered")
      .lt("delivered_at", cutoffISO)
      .is("review_requested_at", null)
      .not("client_user_id", "is", null);

    if (ordersError) {
      throw new Error(`Failed to query orders: ${ordersError.message}`);
    }

    if (!eligibleOrders || eligibleOrders.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No eligible orders found" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const results: Array<{ order_id: string; status: string }> = [];

    for (const order of eligibleOrders as EligibleOrder[]) {
      // Double-check: no existing rating for this order
      const { data: existingRating } = await supabase
        .from("partner_ratings")
        .select("id")
        .eq("user_id", order.client_user_id)
        .eq("partner_id", order.partner_id)
        .eq("order_id", order.id)
        .maybeSingle();

      if (existingRating) {
        // Already reviewed — mark so we don't reprocess
        await supabase
          .from("orders")
          .update({ review_requested_at: new Date().toISOString() })
          .eq("id", order.id);
        results.push({ order_id: order.id, status: "already_reviewed" });
        continue;
      }

      // Also check by user+partner without order_id (legacy ratings)
      const { data: legacyRating } = await supabase
        .from("partner_ratings")
        .select("id")
        .eq("user_id", order.client_user_id)
        .eq("partner_id", order.partner_id)
        .is("order_id", null)
        .maybeSingle();

      if (legacyRating) {
        await supabase
          .from("orders")
          .update({ review_requested_at: new Date().toISOString() })
          .eq("id", order.id);
        results.push({ order_id: order.id, status: "legacy_review_exists" });
        continue;
      }

      // Look up client name
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("first_name, last_name, email")
        .eq("id", order.client_user_id)
        .maybeSingle();

      const clientName = profile?.first_name || "there";
      const clientEmail = profile?.email || order.client_email;

      // Send email via the send-notification-email function
      const emailPayload = {
        to: clientEmail,
        subject: `How was your ${order.product_name}? Leave a review`,
        body_html: buildReviewEmailHtml(order, clientName),
        body_text: buildReviewEmailText(order, clientName),
      };

      try {
        const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-notification-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify(emailPayload),
        });

        const emailResult = await emailRes.json();
        if (!emailRes.ok && !emailResult.skipped) {
          results.push({ order_id: order.id, status: `email_failed: ${emailResult.detail || emailResult.error}` });
          // Continue processing other orders even if one email fails
          continue;
        }
      } catch (emailErr) {
        // Email sending failed but we still insert the notification
        console.error(`Email send failed for order ${order.id}: ${String(emailErr)}`);
      }

      // Insert in-app notification
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: order.client_user_id,
        type: "review_request",
        title: "How was your order?",
        body: `Your ${order.product_name} was delivered over a week ago. Share your experience to help other professionals.`,
        link: `/account?tab=orders&review=${order.id}`,
      });

      if (notifError) {
        console.error(`Notification insert failed for order ${order.id}: ${notifError.message}`);
      }

      // Mark the order so it doesn't get re-processed
      const { error: updateError } = await supabase
        .from("orders")
        .update({ review_requested_at: new Date().toISOString() })
        .eq("id", order.id);

      if (updateError) {
        console.error(`Order update failed for ${order.id}: ${updateError.message}`);
      }

      results.push({ order_id: order.id, status: "sent" });
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
