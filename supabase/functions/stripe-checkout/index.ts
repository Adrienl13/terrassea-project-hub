import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function stripeRequest(endpoint: string, body: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
  });
  return res.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (!STRIPE_SECRET_KEY) {
    return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY not configured" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const { orderId, amount, currency, customerEmail, description, successUrl, cancelUrl } = await req.json();

    if (!orderId || !amount || !customerEmail) {
      return new Response(JSON.stringify({ error: "Missing required fields: orderId, amount, customerEmail" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const session = await stripeRequest("/checkout/sessions", {
      "mode": "payment",
      "payment_method_types[0]": "card",
      "payment_method_types[1]": "sepa_debit",
      "line_items[0][price_data][currency]": currency || "eur",
      "line_items[0][price_data][unit_amount]": String(Math.round(amount * 100)),
      "line_items[0][price_data][product_data][name]": description || "Commande Terrassea",
      "line_items[0][quantity]": "1",
      "customer_email": customerEmail,
      "metadata[order_id]": orderId,
      "metadata[platform]": "terrassea",
      "success_url": successUrl || "https://terrassea.com/account?section=orders&payment=success",
      "cancel_url": cancelUrl || "https://terrassea.com/account?section=orders&payment=cancelled",
    });

    if (session.error) {
      console.error("Stripe error:", session.error);
      return new Response(JSON.stringify({ error: session.error.message }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await supabase.from("orders").update({
      stripe_session_id: session.id,
      payment_method: "stripe",
    }).eq("id", orderId);

    return new Response(JSON.stringify({ sessionId: session.id, url: session.url }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Checkout error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
