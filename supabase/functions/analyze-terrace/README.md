# `analyze-terrace` edge function

**Purpose** : vision LLM analysis of an uploaded terrace/hospitality-space photo. Extracts structured tags (`venue_type`, `style_tags`, `palette_tags`, `material_tags`, `estimated_capacity`, `furniture_categories_needed`, etc.) used by the matching engine. Sister function of `analyze-product-image` but for spaces, not products.

**`verify_jwt`** : `true` (Supabase rejects calls without a valid JWT — anon or authenticated).

**Caller** : `src/hooks/useMoodBoard.ts:245` (via `supabase.functions.invoke("analyze-terrace", ...)` from MoodBoard flow).

**Required edge secrets**
- `ANTHROPIC_API_KEY` — Anthropic API key (mandatory ; function fails-closed if missing).

**Tables touched**
- **None.** Pure HTTP wrapper around Anthropic Vision API. No DB persistence in this function.

**Inputs / Outputs**
- Body : `{ image_base64: string, media_type: string }`
- Returns : `{ analysis: { is_outdoor, venue_type, style_tags, ..., color_mood } }` (parsed JSON from Claude Sonnet 4)

**Known follow-ups (from Phase 1 audit, P3)** : tighten CORS from `*` to `ALLOWED_ORIGIN` ; add usage logging (similar to `chatbot_usage`) for cost tracking ; consider adding rate limiting per `auth.uid()`.

**History** : repatriated to repo on 2026-04-29 after audit revealed code/prod drift (function ACTIVE in prod since 2026-03-18 but missing from `supabase/functions/`).
