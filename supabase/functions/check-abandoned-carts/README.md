# `check-abandoned-carts` edge function

**Purpose** : cron-triggered reactivation of abandoned `saved_carts`. Finds carts not submitted, last synced before cutoff, under max reminders, with items > 0 ; inserts a `notifications` row per user and increments their `reminder_count`. Batch of 50 per run.

**`verify_jwt`** : `false` (intentional — auth handled in code via dedicated `CRON_SECRET`).

**Status (2026-04-29) : DISABLED BY DEFAULT.**
Both the feature flag and the cron secret must be configured before this function does anything. Default state returns HTTP 503 to all callers.

**Required edge secrets to ENABLE**

| Secret | Purpose |
|---|---|
| `ENABLE_ABANDONED_CARTS_CRON` | Feature flag. Must equal exactly `"true"` to lift the 503 guard. |
| `CRON_SECRET` | Random 32+ char string. Required in `Authorization: Bearer <CRON_SECRET>` header. |
| `SUPABASE_URL` | DB API URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses RLS to read/write the tables below. |
| `ALLOWED_ORIGIN` (optional) | CORS origin override. Defaults to `https://terrassea.com`. |

**Re-enable procedure**
1. Generate a long random `CRON_SECRET` (e.g. `openssl rand -hex 32`).
2. In Supabase Studio → Edge Functions → `check-abandoned-carts` → Secrets : set `CRON_SECRET` and `ENABLE_ABANDONED_CARTS_CRON=true`.
3. Update the pg_cron job (`SELECT * FROM cron.job WHERE jobname='check-abandoned-carts'`) to pass the secret in `Authorization`. Recommended pattern : store the secret in `vault.secrets`, then `cron.schedule` with `headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||vault.read_secret('cron_secret'))`.
4. Validate with one manual `SELECT net.http_post(...)` and inspect `net._http_response`. Expected : status 200 + processed count.

**Tables touched**
- `platform_settings` (read flags `abandoned_cart_enabled`, `abandoned_cart_delay_hours`, `abandoned_cart_max_reminders`)
- `saved_carts` (select + update)
- `user_profiles` (select)
- `notifications` (insert)

**Caller** : pg_cron job `jobname='check-abandoned-carts'`, schedule `0 */6 * * *` (every 6 h).

**History** : repatriated + refactored on 2026-04-29 after audit revealed code/prod drift AND a security gap (function used to accept anonymous POST). Phase 1 audit, hotfix #2.
