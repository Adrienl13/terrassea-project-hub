import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

async function verifyStripeSignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  try {
    const parts = sigHeader.split(",").reduce((acc: Record<string, string>, part) => {
      const [key, value] = part.split("=");
      acc[key.trim()] = value;
      return acc;
    }, {});
    const timestamp = parts["t"];
    const signature = parts["v1"];
    if (!timestamp || !signature) return false;

    const signedPayload = `${timestamp}.${payload}`;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
    const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
    return expected === signature;
  } catch {
    return false;
  }
}

async function notifyUser(supabase: any, email: string, title: string, body: string, link: string) {
  const { data: profile } = await supabase
    .from("user_profiles").select("id").eq("email", email).maybeSingle();
  if (profile) {
    await supabase.from("notifications").insert({
      user_id: profile.id, title, body, type: "order_update", link,
    });
  }
}

async function notifyAdmins(supabase: any, title: string, body: string, link: string) {
  const { data: admins } = await supabase
    .from("user_profiles").select("id").eq("user_type", "admin");
  for (const admin of admins || []) {
    await supabase.from("notifications").insert({
      user_id: admin.id, title, body, type: "order_update", link,
    });
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // STRIPE_WEBHOOK_SECRET is mandatory — fail if not configured
  if (!STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.text();

    // Verify Stripe signature (mandatory)
    const sigHeader = req.headers.get("stripe-signature") || "";
    const valid = await verifyStripeSignature(body, sigHeader, STRIPE_WEBHOOK_SECRET);
    if (!valid) {
      console.error("Invalid Stripe signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const event = JSON.parse(body);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const orderId = session.metadata?.order_id;
      const paymentIntent = session.payment_intent;

      if (!orderId) {
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const { data: order } = await supabase
        .from("orders")
        .select("deposit_paid_at, deposit_amount, balance_amount, total_amount, client_email, status, stripe_payment_id, stripe_balance_payment_id")
        .eq("id", orderId)
        .single();

      if (!order) {
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      // IDEMPOTENCY: skip if this payment_intent was already processed
      if (order.stripe_payment_id === paymentIntent || order.stripe_balance_payment_id === paymentIntent) {
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const amountPaid = (session.amount_total || 0) / 100;
      const isDeposit = !order.deposit_paid_at;
      const orderRef = orderId.slice(0, 8);

      if (isDeposit) {
        await supabase.from("orders").update({
          deposit_paid_at: new Date().toISOString(),
          status: "deposit_paid",
          stripe_payment_id: paymentIntent,
        }).eq("id", orderId);

        await supabase.from("order_events").insert({
          order_id: orderId,
          event_type: "deposit_paid",
          description: `Acompte de \u20ac${amountPaid.toFixed(2)} recu via Stripe`,
          actor: "stripe",
          metadata: { payment_intent: paymentIntent, amount: amountPaid },
        });

        if (order.client_email) {
          await notifyUser(supabase, order.client_email,
            "Acompte confirme",
            `Votre acompte de \u20ac${amountPaid.toFixed(2)} a ete recu. Votre commande est lancee.`,
            "/account?section=orders");
        }
        await notifyAdmins(supabase,
          "Paiement acompte recu",
          `Acompte \u20ac${amountPaid.toFixed(2)} recu pour commande ${orderRef}`,
          "/admin?tab=orders");

      } else {
        await supabase.from("orders").update({
          balance_paid_at: new Date().toISOString(),
          status: "completed",
          stripe_balance_payment_id: paymentIntent,
        }).eq("id", orderId);

        await supabase.from("order_events").insert({
          order_id: orderId,
          event_type: "balance_paid",
          description: `Solde de \u20ac${amountPaid.toFixed(2)} recu via Stripe`,
          actor: "stripe",
          metadata: { payment_intent: paymentIntent, amount: amountPaid },
        });

        if (order.client_email) {
          await notifyUser(supabase, order.client_email,
            "Paiement complet",
            `Votre solde de \u20ac${amountPaid.toFixed(2)} a ete recu. Commande totalement payee.`,
            "/account?section=orders");
        }
        await notifyAdmins(supabase,
          "Paiement solde recu",
          `Solde \u20ac${amountPaid.toFixed(2)} recu \u2014 commande ${orderRef} completee`,
          "/admin?tab=orders");
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
