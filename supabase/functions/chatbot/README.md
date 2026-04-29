# `chatbot` edge function

**Purpose** : public-facing AI assistant powered by Anthropic Claude Haiku 4.5. Handles conversational questions about Terrassea products, materials, and the sourcing process. Called by `ChatbotWidget.tsx` on the front-end (lazy-loaded).

**`verify_jwt`** : `false` (anonymous visitors must be able to chat).

**Required edge secrets**
- `ANTHROPIC_API_KEY` — Anthropic API key (mandatory ; function fails-closed if missing).
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — for upsert/select on `chatbot_*` and `notifications` tables.

**Tables touched**
- `platform_settings` (read flags `chatbot_enabled`, `chatbot_max_messages_per_day`, `chatbot_monthly_budget_limit`, `chatbot_alert_threshold_percent`)
- `chatbot_conversations` (insert/update)
- `chatbot_messages` (insert)
- `chatbot_usage` (upsert + RPC `increment_chatbot_usage`)
- `user_profiles` (select admin list for budget alerts)
- `notifications` (insert when monthly budget threshold hit)

**Guardrails in code** : feature flag `chatbot_enabled`, monthly budget cap, daily usage tracking, automatic admin alert at threshold.

**Known follow-ups (from Phase 1 audit, P2)** : add per-session/IP rate limiting ; tighten CORS from `*` to `ALLOWED_ORIGIN` if business permits ; ensure RPC `public.increment_chatbot_usage` is migration-versioned.

**History** : repatriated to repo on 2026-04-29 after audit revealed code/prod drift (function ACTIVE in prod since 2026-03-19 but missing from `supabase/functions/`).
