// invite-brand-partner — Admin-only edge function that invites a brand
// partner to the platform after their row was created via the admin
// shortcut. Creates the auth user (or reuses one if email exists),
// links partners.user_id, and inserts the brand_users (owner) join.
// Supabase Auth's built-in invitation email is sent automatically by
// inviteUserByEmail.
//
// user_profiles is NOT touched here. For new auth users, the
// public.handle_new_user trigger on auth.users seeds the user_profiles
// row from raw_user_meta_data, which is why we pass user_type +
// first_name + last_name + company in the inviteUserByEmail data
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
// SUPABASE_SERVICE_ROLE_KEY, ALLOWED_ORIGIN.
//
// Auth model : caller's JWT must belong to a user_profiles row with
// user_type='admin'. Service-role JWTs do not pass the admin gate —
// they have no `sub` claim, so auth.getUser() fails and the function
// returns 401.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "https://terrassea.com";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function requireAdmin(req: Request): Promise<string | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Authentication required" }, 401);
  }
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) {
    return json({ error: "Invalid or expired token" }, 401);
  }
  const { data: profile } = await userClient
    .from("user_profiles").select("user_type").eq("id", user.id).maybeSingle();
  if (profile?.user_type !== "admin") {
    return json({ error: "Admin access required" }, 403);
  }
  return user.id;
}

interface InvitePayload {
  partner_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const adminCheck = await requireAdmin(req);
  if (adminCheck instanceof Response) return adminCheck;
  const adminId = adminCheck;

  let payload: InvitePayload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!payload.partner_id || typeof payload.partner_id !== "string") {
    return json({ error: "partner_id is required (uuid)" }, 400);
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

  if (partnerErr) return json({ error: "Failed to load partner: " + partnerErr.message }, 500);
  if (!partner) return json({ error: "Partner not found" }, 404);
  if (partner.deleted_at) return json({ error: "Partner is archived" }, 400);
  if (partner.partner_type !== "brand") {
    return json({ error: "This endpoint only invites brand partners" }, 400);
  }
  if (partner.user_id) {
    return json({ ok: true, already_invited: true, user_id: partner.user_id }, 200);
  }
  const email = (partner.contact_email || "").trim().toLowerCase();
  if (!email) {
    return json({ error: "Partner has no contact_email set. Add one before inviting." }, 400);
  }

  // 2. Invite or reuse existing auth user
  let inviteUserId: string | null = null;

  const firstNameGuess = (partner.contact_name || partner.name || "").split(" ")[0] || "";
  const lastNameGuess  = (partner.contact_name || "").split(" ").slice(1).join(" ") || "";

  const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    email,
    {
      data: {
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
    },
  );

  if (inviteData?.user) {
    inviteUserId = inviteData.user.id;
  } else if (inviteErr) {
    // Common case : auth user already exists. List users to find the existing one.
    const msg = (inviteErr.message || "").toLowerCase();
    const looksLikeExisting = msg.includes("already") || msg.includes("registered") || msg.includes("exists");
    if (!looksLikeExisting) {
      return json({ error: "Failed to invite user: " + inviteErr.message }, 500);
    }
    // listUsers is paginated ; we filter manually because there's no email param on the admin SDK.
    let page = 1;
    while (page <= 20 && !inviteUserId) {
      const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (listErr) return json({ error: "Could not look up existing user: " + listErr.message }, 500);
      const match = list?.users?.find((u: { email?: string | null }) => (u.email || "").toLowerCase() === email);
      if (match) inviteUserId = match.id;
      if (!list?.users?.length || list.users.length < 1000) break;
      page += 1;
    }
    if (!inviteUserId) {
      return json({ error: "Auth user exists but could not be located via listUsers" }, 500);
    }
  } else {
    return json({ error: "Invitation returned no user and no error" }, 500);
  }

  // 3. Link partners.user_id (only if still NULL — guard against race).
  //    user_profiles is intentionally NOT modified here :
  //    - New users : handle_new_user already seeded the row from the metadata above.
  //    - Existing users : their profile is theirs ; we don't clobber names/company.
  //      They keep their original user_type and are added as brand_users below.
  const { error: partnerUpdateErr } = await admin
    .from("partners")
    .update({ user_id: inviteUserId } as any)
    .eq("id", partner.id)
    .is("user_id", null);

  if (partnerUpdateErr) {
    return json({ error: "Failed to link partners.user_id: " + partnerUpdateErr.message }, 500);
  }

  // 4. Insert brand_users (owner) join — idempotent via existence check
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
      return json({ error: "Failed to create brand_users membership: " + bmErr.message }, 500);
    }
  }

  return json({
    ok: true,
    user_id: inviteUserId,
    email,
    invitation_sent: true,
    message: "Brand partner invited. They will receive a magic-link email from Supabase Auth.",
  });
});
