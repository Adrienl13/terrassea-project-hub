// invite-brand-partner — Admin-only edge function that invites a brand
// partner to the platform after their row was created via the admin
// shortcut. Creates the auth user (or reuses one if email exists),
// links partners.user_id, and inserts the brand_users (owner) join.
// Instead of Supabase's built-in invitation email, it generates a
// password-setup (recovery) action link WITHOUT sending Supabase's
// default email, then delivers a BRANDED welcome email via the
// send-notification-email function. The CTA lands on /reset-password
// where the brand owner sets their own password (existing recovery
// flow — see RecoveryGuard in src/App.tsx + Auth.tsx).
//
// User resolution avoids the admin listUsers endpoint on purpose:
// generateLink(type:'recovery', email) returns BOTH the action link and
// the user record in one call, so we never page through /admin/users —
// which 500s ("Scan error ... email_change: converting NULL to string")
// when any legacy auth.users row has a NULL email/phone change column.
//
// user_profiles is NOT touched here. For new auth users, the
// public.handle_new_user trigger on auth.users seeds the user_profiles
// row from raw_user_meta_data, which is why we pass user_type +
// first_name + last_name + company in the createUser user_metadata
// payload. A post-hoc UPDATE that flipped user_type would be rejected
// by the trg_prevent_user_type_change trigger (auth.uid() is NULL
// under service role, so the trigger's admin check fails closed).
// For existing users, their profile stays as-is — we only attach
// them to the brand via partners.user_id and brand_users.
//
// Idempotency : safe to call multiple times. If partner.user_id is
// already set, returns ok with `already_invited: true`. If the email
// already maps to an existing auth user, that user is reused (no
// duplicate auth account created).
//
// Required secrets : SUPABASE_URL, SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY, ALLOWED_ORIGIN. Optional : SITE_URL
// (defaults to https://terrassea.com) — base for the reset-password
// redirect. The branded email itself is delivered by
// send-notification-email (which owns RESEND_API_KEY / provider config).
//
// Auth model : caller's JWT must belong to a user_profiles row with
// user_type='admin'. Service-role JWTs do not pass the admin gate —
// they have no `sub` claim, so auth.getUser() fails and the function
// returns 401. verify_jwt is disabled at the gateway because this
// function performs its own admin authentication (requireAdmin).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// CORS origin allow-list. The Access-Control-Allow-Origin header MUST echo the
// caller's exact Origin — a single fixed value (e.g. https://terrassea.com)
// breaks www / Vercel / preview domains : the browser blocks the request and
// supabase-js throws "Failed to send a request to the Edge Function" (the
// OPTIONS preflight logs 204 but the POST never leaves the browser). We reflect
// the Origin only when it matches a trusted host. Auth is by Bearer JWT (not
// cookies), so reflecting the origin is not a credential-leak vector.
const FALLBACK_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "https://terrassea.com";

function resolveCorsOrigin(origin: string | null): string {
  if (!origin) return FALLBACK_ORIGIN;
  try {
    const { hostname, protocol } = new URL(origin);
    const protoOk = protocol === "https:" || protocol === "http:";
    const trusted =
      hostname === "terrassea.com" ||
      hostname.endsWith(".terrassea.com") ||
      hostname.endsWith(".vercel.app") ||
      hostname.endsWith(".lovable.app") ||
      hostname.endsWith(".lovableproject.com") ||
      hostname === "localhost" ||
      hostname === "127.0.0.1";
    if (protoOk && trusted) return origin;
  } catch {
    // malformed Origin header → fall through to the fallback
  }
  return FALLBACK_ORIGIN;
}

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": resolveCorsOrigin(origin),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function requireAdmin(req: Request, cors: Record<string, string>): Promise<string | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Authentication required" }, 401, cors);
  }
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) {
    return json({ error: "Invalid or expired token" }, 401, cors);
  }
  const { data: profile } = await userClient
    .from("user_profiles").select("user_type").eq("id", user.id).maybeSingle();
  if (profile?.user_type !== "admin") {
    return json({ error: "Admin access required" }, 403, cors);
  }
  return user.id;
}

interface InvitePayload {
  partner_id: string;
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, cors);
  }

  const adminCheck = await requireAdmin(req, cors);
  if (adminCheck instanceof Response) return adminCheck;
  const adminId = adminCheck;

  let payload: InvitePayload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400, cors);
  }
  if (!payload.partner_id || typeof payload.partner_id !== "string") {
    return json({ error: "partner_id is required (uuid)" }, 400, cors);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Load + validate partner
  const { data: partner, error: partnerErr } = await admin
    .from("partners")
    .select("id, name, partner_type, contact_email, contact_name, user_id, deleted_at")
    .eq("id", payload.partner_id)
    .maybeSingle();

  if (partnerErr) return json({ error: "Failed to load partner: " + partnerErr.message }, 500, cors);
  if (!partner) return json({ error: "Partner not found" }, 404, cors);
  if (partner.deleted_at) return json({ error: "Partner is archived" }, 400, cors);
  if (partner.partner_type !== "brand") {
    return json({ error: "This endpoint only invites brand partners" }, 400, cors);
  }
  if (partner.user_id) {
    return json({ ok: true, already_invited: true, user_id: partner.user_id }, 200, cors);
  }
  const email = (partner.contact_email || "").trim().toLowerCase();
  if (!email) {
    return json({ error: "Partner has no contact_email set. Add one before inviting." }, 400, cors);
  }

  const firstNameGuess = (partner.contact_name || partner.name || "").split(" ")[0] || "";
  const lastNameGuess  = (partner.contact_name || "").split(" ").slice(1).join(" ") || "";

  // 2. Create the auth user WITHOUT sending Supabase's default email. If the
  //    email already maps to a user, that's fine — generateLink (step 3)
  //    resolves the existing user id. We never call listUsers.
  const { data: createData, error: createErr } = await admin.auth.admin.createUser({
    email,
    // Admin vouches for the address (invitation flow) — mark confirmed so the
    // recovery link in step 3 lands straight on password setup.
    email_confirm: true,
    user_metadata: {
      // Consumed by public.handle_new_user (trigger on auth.users INSERT) to
      // seed the user_profiles row with the correct user_type from the start.
      // Setting user_type via a follow-up UPDATE would be rejected by
      // trg_prevent_user_type_change since auth.uid() is NULL under service role.
      user_type: "partner",
      first_name: firstNameGuess,
      last_name: lastNameGuess,
      company: partner.name,
      partner_id: partner.id,
      partner_name: partner.name,
      role: "brand-owner",
    },
  });

  const createdUserId: string | null = createData?.user?.id ?? null;
  if (!createdUserId && createErr) {
    const msg = (createErr.message || "").toLowerCase();
    const looksLikeExisting = msg.includes("already") || msg.includes("registered") || msg.includes("exists");
    if (!looksLikeExisting) {
      return json({ error: "Failed to create user: " + createErr.message }, 500, cors);
    }
    // Existing user — id resolved from generateLink below.
  }

  // 3. Generate a password-setup (recovery) action link WITHOUT sending
  //    Supabase's default email. This call also returns the user record, so it
  //    doubles as our existing-user lookup (avoids the buggy listUsers endpoint).
  const SITE_URL = (Deno.env.get("SITE_URL") || "https://terrassea.com").replace(/\/+$/, "");
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${SITE_URL}/reset-password` },
  });
  const actionLink = linkData?.properties?.action_link ?? null;
  const inviteUserId = createdUserId ?? linkData?.user?.id ?? null;
  if (linkErr || !actionLink || !inviteUserId) {
    return json({
      error: "Failed to generate password-setup link or resolve user: " + (linkErr?.message || "no link/user returned"),
    }, 500, cors);
  }

  // 4. Link partners.user_id (only if still NULL — guard against race).
  //    user_profiles is intentionally NOT modified here :
  //    - New users : handle_new_user already seeded the row from the metadata above.
  //    - Existing users : their profile is theirs ; we don't clobber names/company.
  const { error: partnerUpdateErr } = await admin
    .from("partners")
    .update({ user_id: inviteUserId } as any)
    .eq("id", partner.id)
    .is("user_id", null);

  if (partnerUpdateErr) {
    return json({ error: "Failed to link partners.user_id: " + partnerUpdateErr.message }, 500, cors);
  }

  // 5. Insert brand_users (owner) join — idempotent via existence check
  const { data: existingMembership } = await admin
    .from("brand_users")
    .select("id")
    .eq("brand_id", partner.id)
    .eq("user_id", inviteUserId)
    .maybeSingle();

  if (!existingMembership) {
    const { error: bmErr } = await admin
      .from("brand_users")
      .insert({
        brand_id: partner.id,
        user_id: inviteUserId,
        role: "owner",
        granted_by: adminId,
      } as any);
    if (bmErr) {
      return json({ error: "Failed to create brand_users membership: " + bmErr.message }, 500, cors);
    }
  }

  // 6. Deliver the branded welcome email (FR — primary market) via
  //    send-notification-email, which owns the provider/Resend config.
  const greetName = firstNameGuess || partner.name;
  const subject = `Bienvenue sur Terrassea — activez l'espace de ${partner.name}`;
  // Email-safe HTML : table layout + inline styles + preheader + responsive.
  // Brand palette : ink #1A1A1A, cream #F5F3EF, terracotta accent #C9623C.
  const bodyHtml = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>Bienvenue sur Terrassea</title>
<!--[if mso]><style type="text/css">body,table,td,a{font-family:Helvetica,Arial,sans-serif !important;}</style><![endif]-->
<style>
  @media only screen and (max-width:600px){
    .container{width:100% !important;}
    .px{padding-left:24px !important;padding-right:24px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background:#F5F3EF;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#F5F3EF;">Dernière étape : définissez votre mot de passe pour accéder à l'espace marque ${partner.name}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F3EF;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
      <tr><td class="px" style="padding:6px 40px 22px;">
        <span style="font-family:'Manrope',Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:3px;color:#1A1A1A;">TERRASSEA</span>
      </td></tr>
      <tr><td>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border:1px solid #ECE7DF;border-radius:16px;">
          <tr><td style="height:4px;line-height:4px;font-size:0;background:#C9623C;border-radius:16px 16px 0 0;">&nbsp;</td></tr>
          <tr><td class="px" style="padding:40px 44px 0;">
            <h1 style="margin:0;font-family:'Manrope',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.25;font-weight:800;color:#1A1A1A;">Bienvenue, ${greetName}</h1>
            <p style="margin:14px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#4A4A4A;">Votre espace marque <strong style="color:#1A1A1A;">${partner.name}</strong> est prêt sur Terrassea. Dernière étape : définissez votre mot de passe pour y accéder.</p>
          </td></tr>
          <tr><td class="px" align="left" style="padding:30px 44px 6px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              <td align="center" bgcolor="#C9623C" style="border-radius:999px;">
                <a href="${actionLink}" target="_blank" style="display:inline-block;padding:15px 36px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;background:#C9623C;border:1px solid #C9623C;border-radius:999px;">Définir mon mot de passe</a>
              </td>
            </tr></table>
          </td></tr>
          <tr><td class="px" style="padding:18px 44px 0;">
            <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#8A8A8A;">Ce lien est personnel et expire après un court délai. Si le bouton ne fonctionne pas, copiez-collez ce lien :</p>
            <p style="margin:6px 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;word-break:break-all;"><a href="${actionLink}" target="_blank" style="color:#C9623C;text-decoration:underline;">${actionLink}</a></p>
          </td></tr>
          <tr><td class="px" style="padding:28px 44px 40px;">
            <div style="border-top:1px solid #ECE7DF;padding-top:20px;">
              <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#4A4A4A;">À très vite,<br /><strong style="color:#1A1A1A;">L'équipe Terrassea</strong></p>
            </div>
          </td></tr>
        </table>
      </td></tr>
      <tr><td class="px" style="padding:22px 40px 8px;">
        <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#A09A90;">Terrassea — AI marketplace for hospitality projects.<br />Vous recevez cet email car ${partner.name} a été invitée à rejoindre la plateforme.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
  const bodyText = `Bienvenue, ${greetName}

Votre espace marque ${partner.name} est prêt sur Terrassea.
Dernière étape : définissez votre mot de passe pour y accéder.

Définir mon mot de passe :
${actionLink}

Ce lien est personnel et expire après un court délai.

À très vite,
L'équipe Terrassea

—
Terrassea — AI marketplace for hospitality projects.`;

  let emailSent = false;
  let emailDetail = "";
  try {
    const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-notification-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ to: email, subject, body_html: bodyHtml, body_text: bodyText }),
    });
    const emailJson = await emailRes.json().catch(() => ({}));
    emailSent = emailRes.ok && emailJson?.success !== false;
    emailDetail = emailJson?.detail ?? `HTTP ${emailRes.status}`;
  } catch (err) {
    emailDetail = `fetch error: ${String(err)}`;
  }

  return json({
    ok: true,
    user_id: inviteUserId,
    email,
    invitation_sent: emailSent,
    email_detail: emailDetail,
    message: emailSent
      ? "Brand partner created and branded password-setup email sent."
      : "Brand partner created and linked, but the welcome email could not be confirmed (check send-notification-email config).",
  }, 200, cors);
});
