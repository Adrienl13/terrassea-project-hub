# invite-brand-partner

Admin-only edge function that completes the post-creation invitation of a brand partner.

## Purpose

After an admin creates a brand row in the `partners` table (via the
"Créer une marque" shortcut in `/admin` → tab Marques), this function:

1. Validates that the caller is an admin user (`user_profiles.user_type = 'admin'`).
2. Loads the partner, checks it's a brand, has a `contact_email`, isn't deleted, and isn't already linked to a `user_id`.
3. Calls `supabase.auth.admin.inviteUserByEmail(email)` — Supabase Auth creates the auth user and sends the built-in invitation email containing a magic link. Idempotent : if the email is already in `auth.users`, the existing user is reused.
4. Upserts a `user_profiles` row with `user_type='partner'`, best-guess first/last name from `partner.contact_name`, company set to `partner.name`.
5. Sets `partners.user_id = <new_user_id>` (only if still NULL, to guard against races).
6. Inserts `brand_users { brand_id, user_id, role='owner', granted_by=admin_id }` if not already present.

## Required secrets

| Secret | Purpose |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | For the user-auth client that validates the caller's JWT and admin status |
| `SUPABASE_SERVICE_ROLE_KEY` | For the auth admin API (inviteUserByEmail, listUsers) and RLS-bypassing inserts on user_profiles / partners / brand_users |
| `ALLOWED_ORIGIN` | CORS origin allow-list. Defaults to `https://terrassea.com` |

## Auth gate

The caller's bearer token must belong to a user with `user_profiles.user_type='admin'`. Returns 401 if no token, 403 if not admin. Calls to the auth admin API use the service role client (different from the validation client) so they bypass RLS without leaking the service key client-side.

## Request

```
POST /functions/v1/invite-brand-partner
Authorization: Bearer <admin user JWT>
Content-Type: application/json

{ "partner_id": "<uuid>" }
```

## Responses

| Status | Body shape | When |
|---|---|---|
| 200 | `{ ok: true, user_id, email, invitation_sent: true, message }` | Success — Supabase Auth email queued |
| 200 | `{ ok: true, already_invited: true, user_id }` | Partner already had user_id set |
| 400 | `{ error: "..." }` | Invalid body, missing email, archived partner, non-brand partner |
| 401 | `{ error: "Authentication required" }` | No / invalid bearer token |
| 403 | `{ error: "Admin access required" }` | Caller is not admin |
| 404 | `{ error: "Partner not found" }` | partner_id doesn't exist |
| 500 | `{ error: "..." }` | DB / Auth failure (message included) |

## Tables touched

- `partners` — UPDATE `user_id` (only on rows where it was NULL)
- `user_profiles` — UPSERT
- `brand_users` — INSERT (skipped if already present)
- `auth.users` — INSERT via Supabase Auth admin API (handled by Supabase, not directly)

## Re-enable procedure

If revoked or paused, re-deploy via :

```bash
supabase functions deploy invite-brand-partner --project-ref gwgcfgeouropcighpztj
```

Secrets must be set in the project's Edge Functions dashboard (or via `supabase secrets set`).

## Related

- Front-end caller : `src/components/admin/AdminBrandEditor.tsx` (button "Inviter cette marque")
- Companion DB policies : `admin_policy_brand_distributors` and all `is_admin()` policies on partners/brand_users/etc.
- Memory : `feedback_rls_helper_execute_grants` — note that `is_admin()` execute grant is required for any RLS path the service-role inserts trigger.
