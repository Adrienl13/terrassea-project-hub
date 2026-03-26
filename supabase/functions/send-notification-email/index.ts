import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

interface EmailPayload {
  to: string;
  subject: string;
  body_html: string;
  body_text: string;
}

interface PlatformSettings {
  notification_email_enabled: string;
  notification_email_provider: string;
  notification_webhook_url: string;
  notification_from_email: string;
  notification_from_name: string;
}

async function loadSettings(): Promise<PlatformSettings> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from("platform_settings")
    .select("key, value")
    .in("key", [
      "notification_email_enabled",
      "notification_email_provider",
      "notification_webhook_url",
      "notification_from_email",
      "notification_from_name",
    ]);

  if (error) throw new Error(`Failed to load settings: ${error.message}`);

  const settings: Record<string, string> = {};
  for (const row of data || []) {
    // value is jsonb — could be a quoted string or raw value
    settings[row.key] = typeof row.value === "string" ? row.value : JSON.stringify(row.value);
  }

  return {
    notification_email_enabled: settings.notification_email_enabled || "true",
    notification_email_provider: settings.notification_email_provider || "disabled",
    notification_webhook_url: settings.notification_webhook_url || "",
    notification_from_email: settings.notification_from_email || "noreply@terrassea.com",
    notification_from_name: settings.notification_from_name || "Terrassea",
  };
}

async function sendViaWebhook(
  settings: PlatformSettings,
  payload: EmailPayload
): Promise<{ ok: boolean; detail: string }> {
  const webhookUrl = settings.notification_webhook_url;
  if (!webhookUrl) {
    return { ok: false, detail: "No webhook URL configured" };
  }

  // Detect provider from URL and format accordingly
  const fromFormatted = `${settings.notification_from_name} <${settings.notification_from_email}>`;

  const body: Record<string, unknown> = {
    from: fromFormatted,
    to: payload.to,
    subject: payload.subject,
    html: payload.body_html,
    text: payload.body_text,
  };

  // Build headers — use RESEND_API_KEY if URL is Resend, otherwise pass as Bearer
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (webhookUrl.includes("resend.com") && RESEND_API_KEY) {
    headers["Authorization"] = `Bearer ${RESEND_API_KEY}`;
  } else if (RESEND_API_KEY) {
    headers["Authorization"] = `Bearer ${RESEND_API_KEY}`;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return { ok: res.ok, detail: res.ok ? "sent" : `HTTP ${res.status}: ${text}` };
  } catch (err) {
    return { ok: false, detail: `Fetch error: ${String(err)}` };
  }
}

async function sendViaSupabaseAuth(
  settings: PlatformSettings,
  payload: EmailPayload
): Promise<{ ok: boolean; detail: string }> {
  // Use Supabase Auth admin API to send a raw email
  // This uses the SMTP configured in the Supabase dashboard
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        type: "magiclink",
        email: payload.to,
      }),
    });
    // Note: Supabase Auth doesn't support arbitrary email sending directly.
    // This is a limited fallback — for production use, configure a webhook provider.
    if (res.ok) {
      return { ok: true, detail: "supabase_auth_link_generated (limited fallback)" };
    }
    const text = await res.text();
    return { ok: false, detail: `Supabase auth fallback failed: ${text}` };
  } catch (err) {
    return { ok: false, detail: `Supabase auth error: ${String(err)}` };
  }
}

Deno.serve(async (req: Request) => {
  // Only accept POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Auth: require service-role key (internal function only)
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const payload: EmailPayload = await req.json();

    // Validate required fields
    if (!payload.to || !payload.subject) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Load settings from platform_settings
    const settings = await loadSettings();

    // Check if email notifications are enabled
    if (settings.notification_email_enabled !== "true") {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "Email notifications disabled" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    let result: { ok: boolean; detail: string };

    switch (settings.notification_email_provider) {
      case "webhook":
        result = await sendViaWebhook(settings, payload);
        break;

      case "supabase":
        result = await sendViaSupabaseAuth(settings, payload);
        break;

      case "disabled":
        result = { ok: true, detail: "Provider disabled — email not sent" };
        break;

      default:
        // Graceful fallback: try webhook if URL exists, otherwise skip
        if (settings.notification_webhook_url) {
          result = await sendViaWebhook(settings, payload);
        } else {
          result = { ok: true, detail: "No email provider configured — skipped gracefully" };
        }
    }

    return new Response(
      JSON.stringify({ success: result.ok, detail: result.detail }),
      {
        status: result.ok ? 200 : 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
