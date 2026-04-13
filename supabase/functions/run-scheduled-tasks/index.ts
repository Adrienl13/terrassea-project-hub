import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "https://terrassea.com";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // SECURITY: Require service role key to invoke this function
  const authHeader = req.headers.get("Authorization");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Check which tasks are enabled
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", [
        "reminder_partner_48h",
        "reminder_client_7d",
        "reminder_expiry_3d",
        "auto_create_order",
        "auto_expire_quotes",
      ]);

    const flags: Record<string, boolean> = {};
    (settings || []).forEach((s: any) => {
      // Handle both boolean true and string "true" from JSONB
      flags[s.key] = s.value === true || s.value === "true";
    });

    const results: Record<string, any> = {};

    // ── 1. Reminder: Partner 48h (pending quotes without response) ──
    if (flags.reminder_partner_48h) {
      const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
      // Only send if no reminder was sent in the last 24h (deduplication)
      const reminderCutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { data: staleQuotes } = await supabase
        .from("quote_requests")
        .select("id, product_name, partner_id, partners!quote_requests_partner_id_fkey(contact_email, name)")
        .eq("status", "pending")
        .lt("created_at", cutoff)
        .not("partner_id", "is", null)
        .or(`last_reminder_sent_at.is.null,last_reminder_sent_at.lt.${reminderCutoff}`);

      let sent = 0;
      for (const q of staleQuotes || []) {
        const partner = (q as any).partners;
        if (!partner?.contact_email) continue;
        try {
          await supabase.functions.invoke("send-notification-email", {
            body: {
              to: partner.contact_email,
              subject: "Terrassea — Demande de devis en attente",
              body_html: `<p>Bonjour ${partner.name},</p><p>Vous avez une demande de devis en attente pour <strong>${q.product_name}</strong> depuis plus de 48 heures.</p><p>Merci de vous connecter à votre espace partenaire pour y répondre.</p><p>L'équipe Terrassea</p>`,
              body_text: `Bonjour ${partner.name}, vous avez une demande de devis en attente pour ${q.product_name} depuis plus de 48h. Connectez-vous à votre espace partenaire pour y répondre.`,
            },
          });
          // Mark reminder sent
          await supabase.from("quote_requests").update({ last_reminder_sent_at: new Date().toISOString() }).eq("id", q.id);
          sent++;
        } catch (e) { console.error("[scheduled-task] Error:", e); }
      }
      results.reminder_partner_48h = { checked: (staleQuotes || []).length, sent };
    }

    // ── 2. Reminder: Client 7d (replied quotes not accepted) ──
    if (flags.reminder_client_7d) {
      const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const { data: staleReplied } = await supabase
        .from("quote_requests")
        .select("id, product_name, email, client_first_name")
        .eq("status", "replied")
        .is("signed_at", null)
        .lt("replied_at", cutoff);

      let sent = 0;
      for (const q of staleReplied || []) {
        if (!q.email) continue;
        try {
          await supabase.functions.invoke("send-notification-email", {
            body: {
              to: q.email,
              subject: "Terrassea — Votre devis attend votre validation",
              body_html: `<p>Bonjour${q.client_first_name ? ` ${q.client_first_name}` : ""},</p><p>Votre devis pour <strong>${q.product_name}</strong> est en attente de validation depuis 7 jours.</p><p>Connectez-vous à votre espace pour le consulter et le valider.</p><p>L'équipe Terrassea</p>`,
              body_text: `Bonjour, votre devis pour ${q.product_name} est en attente de validation depuis 7 jours. Connectez-vous pour le consulter.`,
            },
          });
          sent++;
        } catch (e) { console.error("[scheduled-task] Error:", e); }
      }
      results.reminder_client_7d = { checked: (staleReplied || []).length, sent };
    }

    // ── 3. Reminder: Expiry 3d (quotes expiring soon) ──
    if (flags.reminder_expiry_3d) {
      const now = new Date().toISOString();
      const in3Days = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
      const { data: expiring } = await supabase
        .from("quote_requests")
        .select("id, product_name, email, client_first_name, validity_expires_at")
        .eq("status", "replied")
        .is("signed_at", null)
        .gt("validity_expires_at", now)
        .lt("validity_expires_at", in3Days);

      let sent = 0;
      for (const q of expiring || []) {
        if (!q.email) continue;
        const expiryDate = new Date(q.validity_expires_at).toLocaleDateString("fr-FR", {
          day: "numeric", month: "long", year: "numeric",
        });
        try {
          await supabase.functions.invoke("send-notification-email", {
            body: {
              to: q.email,
              subject: "Terrassea — Votre devis expire bientôt",
              body_html: `<p>Bonjour${q.client_first_name ? ` ${q.client_first_name}` : ""},</p><p>Votre devis pour <strong>${q.product_name}</strong> expire le <strong>${expiryDate}</strong>.</p><p>Pensez à le valider avant cette date.</p><p>L'équipe Terrassea</p>`,
              body_text: `Bonjour, votre devis pour ${q.product_name} expire le ${expiryDate}. Pensez à le valider.`,
            },
          });
          sent++;
        } catch (e) { console.error("[scheduled-task] Error:", e); }
      }
      results.reminder_expiry_3d = { checked: (expiring || []).length, sent };
    }

    // ── 4. Auto-expire overdue quotes ──
    if (flags.auto_expire_quotes !== false) {
      // Always run expiration unless explicitly disabled
      try {
        const { data: expiredCount } = await supabase.rpc("expire_overdue_quotes");
        results.auto_expire_quotes = { expired: expiredCount ?? 0 };
      } catch (e) {
        console.error("[scheduled-task] expire_overdue_quotes error:", e);
        results.auto_expire_quotes = { error: String(e) };
      }
    }

    // ── 5. Auto-create orders for accepted/signed quotes without orders ──
    if (flags.auto_create_order) {
      const { data: accepted } = await supabase
        .from("quote_requests")
        .select("id, total_price")
        .in("status", ["accepted", "signed"]);

      let created = 0;
      for (const q of accepted || []) {
        // Check if order already exists for this quote
        const { data: existingOrder } = await supabase
          .from("orders")
          .select("id")
          .eq("quote_request_id", q.id)
          .maybeSingle();

        if (!existingOrder && q.total_price) {
          try {
            await supabase.functions.invoke("auto-workflow", {
              body: { action: "auto_create_order", quoteRequestId: q.id },
            });
            created++;
          } catch (e) { console.error("[scheduled-task] Error:", e); }
        }
      }
      results.auto_create_order = { created };
    }

    return new Response(
      JSON.stringify({ success: true, timestamp: new Date().toISOString(), results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
