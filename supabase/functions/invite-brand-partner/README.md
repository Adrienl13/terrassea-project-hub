# invite-brand-partner

Admin-only edge function that completes the post-creation invitation of a brand partner.

## Purpose

After an admin creates a brand row in the `partners` table (via the
"Créer une marque" shortcut in `/admin` → tab Marques), this function:

1. Validates that the caller is an admin user (`user_profiles.user_type = 'admin'`).
2. Loads the partner, checks it's a brand, has a `contact_email`, isn't deleted, and isn't already linked to a `user_id`.
3. Calls `supabase.auth.admin.createUser({ email, email_confirm: true, user_metadata: { user_type: 'partner', first_name, last_name, company, ... } })` — creates the auth user **without** sending any email. The metadata seeds `user_profiles` via the `handle_new_user` trigger (so the row lands with `user_type='partner'` directly — a post-hoc UPDATE would be blocked by `trg_prevent_user_type_change`). Idempotent : if the email is already in `auth.users`, the existing user is reused and their `user_profiles` row is left untouched.
4. Sets `partners.user_id = <new_user_id>` (only if still NULL, to guard against races).
5. Inserts `brand_users { brand_id, user_id, role='owner', granted_by=admin_id }` if not already present.
6. Generates a `type: 'recovery'` action link via `supabase.auth.admin.generateLink(...)` with `redirectTo = SITE_URL/reset-password` (**no Supabase email sent**), then POSTs a **branded** welcome email to `send-notification-email` (service-role bearer). The CTA lands on `/reset-password`, where `RecoveryGuard` (`src/App.tsx`) + `Auth.tsx` let the brand owner **set their own password** (`supabase.auth.updateUser({ password })`). The brand-creation step itself sends nothing — email goes out only on this explicit invite call.

## Required secrets

| Secret | Purpose |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | For the user-auth client that validates the caller's JWT and admin status |
| `SUPABASE_SERVICE_ROLE_KEY` | For the auth admin API (createUser, listUsers, generateLink), the bearer used to call send-notification-email, and RLS-bypassing inserts on user_profiles / partners / brand_users |
| `ALLOWED_ORIGIN` | CORS origin allow-list. Defaults to `https://terrassea.com` |
| `SITE_URL` *(optional)* | Base URL for the reset-password redirect. Defaults to `https://terrassea.com`. The `<SITE_URL>/reset-password` path should be in the project's Auth → Redirect URLs allowlist (RecoveryGuard self-heals a Site-URL fallback otherwise). |

> The branded email's delivery (provider, `RESEND_API_KEY`, from-address) is owned by **`send-notification-email`** + `platform_settings` — this function only builds the HTML/text and hands it over.

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
| 200 | `{ ok: true, user_id, email, invitation_sent, email_detail, message }` | Success — `invitation_sent` reflects whether the branded email send was confirmed; the user is created/linked regardless |
| 200 | `{ ok: true, already_invited: true, user_id }` | Partner already had user_id set |
| 400 | `{ error: "..." }` | Invalid body, missing email, archived partner, non-brand partner |
| 401 | `{ error: "Authentication required" }` | No / invalid bearer token |
| 403 | `{ error: "Admin access required" }` | Caller is not admin |
| 404 | `{ error: "Partner not found" }` | partner_id doesn't exist |
| 500 | `{ error: "..." }` | DB / Auth failure (message included) |

## Tables touched

- `partners` — UPDATE `user_id` (only on rows where it was NULL)
- `brand_users` — INSERT (skipped if already present)
- `auth.users` — INSERT via `createUser` (Supabase Auth admin API; no email sent)
- `user_profiles` — populated indirectly by the `handle_new_user` trigger from the invite metadata. **Not** touched by this function for already-existing users.

## Re-enable procedure

If revoked or paused, re-deploy via :

```bash
supabase functions deploy invite-brand-partner --project-ref gwgcfgeouropcighpztj
```

Secrets must be set in the project's Edge Functions dashboard (or via `supabase secrets set`).

## Related

- Front-end caller : `src/components/admin/AdminBrandEditor.tsx` (button "Inviter cette marque")
- Email delivery : `supabase/functions/send-notification-email` (provider config in `platform_settings`)
- Password-setup landing : `src/App.tsx` (`RecoveryGuard`) → `/reset-password` → `src/pages/Auth.tsx`
- Companion DB policies : `admin_policy_brand_distributors` and all `is_admin()` policies on partners/brand_users/etc.
- Memory : `feedback_rls_helper_execute_grants` — note that `is_admin()` execute grant is required for any RLS path the service-role inserts trigger.
