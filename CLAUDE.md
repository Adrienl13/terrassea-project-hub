# CLAUDE.md

> Reference for any agent (Claude Code, sub-agents, future devs) working on the codebase.
> **Read this BEFORE editing.** Last updated 2026-04-30 after the chantier vocabulaire 2026.
> Companion docs: `docs/audit/2026-04/RECON.md`, `docs/audit/2026-04/STRATEGIC_DECISIONS.md`, `docs/chantiers/2026-05/PLAN_VOCAB_FIELDS.md`, `docs/chantiers/2026-05/CHANGELOG.md`.

---

## Commands

```bash
bun run dev          # Vite dev server (port 8080)
bun run build        # Production build
bun run lint         # ESLint
bun run test         # Vitest, single run
bun run test:watch   # Vitest, watch mode

bunx vitest run src/path/to/file.test.ts   # Single test file
bunx tsc --noEmit                          # Type check (used by CI)
```

CI (`.github/workflows/ci.yml`) runs lint + tsc --noEmit + test + build on push/PR to `main`. **Failing CI blocks merges.**

---

## Stack

- **Frontend** : React 18.3 + TypeScript 5.8 + Vite 5.4 (SWC plugin), Tailwind 3.4, shadcn/ui (49 primitives over Radix), framer-motion, react-hook-form + zod, @tanstack/react-query (staleTime 2 min, no refetch on focus), sonner toasts, recharts.
- **Routing** : react-router-dom 7 with `lazy()` per page.
- **i18n** : i18next + react-i18next, **4 locales** (`en`/`fr`/`es`/`it`). Detection: localStorage → navigator. **Not 6 — DE/NL not implemented.**
- **Backend** : Supabase (PostgreSQL + Auth + Storage + Edge Functions). **One project only**: `gwgcfgeouropcighpztj`.
- **Payments** : Stripe (via `stripe-checkout` and `stripe-webhook` edge functions).
- **AI** : Anthropic Claude via edge functions (`chatbot`, `analyze-product-image`, `analyze-csv-products`, `enrich-products`, `merge-descriptions`).
- **Hosting** : Vercel (front + 4 serverless functions in `api/`).
- **Tests** : Vitest + jsdom (7 unit test files in `src/test/`, focused on engines). Playwright config exists but references external lib `lovable-agent-playwright-config` — **no local E2E tests**.
- **Tooling** : ESLint 9 (flat) with `typescript-eslint` and `react-hooks` rules. **Note**: `@typescript-eslint/no-explicit-any: off`, and `tsconfig.app.json` has `strict: false`, `noImplicitAny: false`, `strictNullChecks: false`.

---

## Repo layout (source of truth)

```
src/
├── App.tsx              Routes + Providers (Query, Auth, Cart, Compare, Favourites)
├── main.tsx             createRoot
├── components/          16 thematic subfolders + 22 root components + 49 shadcn primitives in ui/
├── contexts/            AuthContext, ProjectCartContext, CompareContext, FavouritesContext
├── engine/              10 modules — client-side business logic (NOT in src/lib/engine/)
├── hooks/               24 custom hooks
├── i18n/                index.ts + locales/{en,fr,es,it}.json
├── integrations/supabase/  Supabase client + auto-generated DB types
├── lib/                 19 utility modules (products, productOffers, partnerConstants, etc.)
├── pages/               26 pages (Index, Products, ProjectBuilder, Admin, Auth, Messages, MoodBoard, …)
└── test/                7 Vitest files (engines, BOM, palette, multiZone, compliance, search-categories)

supabase/
├── config.toml          project_id MUST match prod (gwgcfgeouropcighpztj)
├── functions/           13 edge functions (Deno)
└── migrations/          47 versioned migrations (2026-03-13 → 2026-04-29)

api/                     4 Vercel serverless functions: cron-reminders, geo, prerender, sitemap
public/                  Static assets + robots/sitemap/llms.txt
```

**Path alias**: `@/` → `src/`.

---

## The engine (`src/engine/`)

| Module | Role |
|---|---|
| `types.ts` | Shared types: `ProjectParameters`, `LayoutRequirement`, `BOMSlot`, `ProjectConcept`, `ConceptBOM`, `BOMSlotRole`, etc. |
| `layoutEngine.ts` | Seating layout + spatial metrics from project parameters |
| `spatialEngine.ts` | Density / surface calculations |
| `projectEngine.ts` | Generates `ProjectConcept[]` from parameters + product catalogue |
| `supplierEngine.ts` | MOQ-aware scoring/ranking of supplier offers per product |
| `multiZoneEngine.ts` | Multi-zone projects (added Chantier 3) |
| `complianceEngine.ts` | Compliance checks (added Chantier 3) |
| `compatibilityEngine.ts` | Cross-product compatibility |
| `similarityEngine.ts` | Product similarity scoring |
| `intentDetector.ts` | NL → structured filters for search |

Engines are **client-side and deterministic**. They do not call Supabase directly.

---

## Edge functions (`supabase/functions/`)

13 total (Deno):

| Function | Purpose |
|---|---|
| `analyze-product-image` | Vision LLM analysis of product images |
| `analyze-csv-products` | CSV ingestion + AI parse |
| `enrich-products` | Bulk product enrichment |
| `merge-descriptions` | Description cleanup/dedup |
| `auto-workflow` | Internal workflow orchestration |
| `chatbot` | Anthropic-backed chatbot endpoint |
| `run-scheduled-tasks` | Internal cron-style runner |
| `send-notification-email` | Generic notification mail |
| `send-quote-notification` | Quote-flow specific mail |
| `send-review-request` | Post-delivery review prompt |
| `stock-sync-webhook` | Partner stock sync inbound |
| `stripe-checkout` | Stripe Checkout session creation |
| `stripe-webhook` | Stripe webhooks (payment confirmed, etc.) |

---

## Database — table naming reality

66 tables in `public`. The 2026-04-29 hotfix enabled RLS on 3 CRM tables (`architect_prospects`, `distributor_prospects`, `brand_prospects`). RLS status of the other 63 tables is to be verified during ÉTAPE 2 Thème 1 of the audit and is NOT yet guaranteed.

Important real names that differ from older briefs:

- ❌ `brands` does not exist. Brand identity is carried by `partners` rows with `partner_type='brand'` and `partner_mode='brand_member' | 'brand_network'`. Adjacent tables: `brand_collections`, `brand_distributors`, `brand_references`, `brand_prospects` (CRM).
- ❌ `loyalty_balance` does not exist. Use `partner_loyalty` + `partner_points_history`.
- CRM tables (admin-only, fed by external agent via service_role): `architect_prospects`, `distributor_prospects`, `brand_prospects`. **Never queried from the app.**
- Analytics: `concept_events` (insert-open) + `scoring_snapshots` (immutable feedback loop).
- Other modules with backing tables: `chatbot_conversations`/`chatbot_messages`/`chatbot_usage`, `financing_requests`, `material_boards`/`board_items`, `pro_service_*` (4 tables), `supplier_calls` (4 tables), `salone_2026_visits`.

Helper function for admin-only RLS: `public.is_admin()` (SECURITY DEFINER, defined in migration `20260408200000`). Use it in policies — do not duplicate the `user_type='admin'` check inline.

**Products schema — vocabulary 2026 (chantier 2026-04-30) :** `public.products` was extended with **27 critical-spec columns** across 5 priority categories — Tables (7), Parasols (6), Sun Loungers (5), Sofas/Lounge Seating (4 incl. 1 jsonb `available_modules`), Bar Stools & High Tables (5 incl. 1 shared `subdivision`). All columns have CHECK constraints + sane defaults ; jsonb arrays validated app-side via zod schemas in `src/components/products/specs/shared/types.ts`. The `auto_derive_product_tags` trigger derives 8 new technical_tags (`premium-fabric`, `high-wind`, `heating-compat`, `modular`, `pool-resistant`, `beach-resistant`, `acoustic`, `repairable`).

**Categories normalized 2026-04-30 (chantier vocab) :** product category is now lowercase-kebab. Canonical slugs : `chairs` / `armchairs` / `bar-stools` / `tables` / `parasols` / `loungers` / `sofas` / `accessories`. The slug `seating` is intentionally conserved as semantic concept in 2 distinct contexts: architect need briefs (ArchitectSections) and Resources page topic — NOT as a product category slug. Helper `src/lib/categoryNormalizer.ts` resolves legacy AI/CSV inputs (incl. heuristic for ambiguous `seating` → `chairs` / `armchairs` / `bar-stools` by name keyword).

---

## Partner plans (source of truth: `src/lib/partnerConstants.ts`)

| Plan | Monthly fee | Commission | Max products | Notes |
|---|---|---|---|---|
| `starter` | Free | 8 % (post 3 commandes) | 30 | Auto-upgrade vers Growth après volume seuil |
| `growth` | €249 | 5 % | 50 | |
| `elite` | €499 | 3.5 % | 150 | **Sur invitation** |
| `brand_member` | €799 | 0 % | 999 | Vente directe |
| `brand_network` | €1 299 | 0 % | 999 | Réseau distributeurs |

**No `Elite Pro` plan exists** despite mentions in older briefs.

`partner_type` enum: `manufacturer | brand | reseller | distributor | designer`.
`partner_mode` enum (only meaningful when `partner_type='brand'`): `standard | brand_member | brand_network`.

---

## Architects

User type `architect` exists in `user_profiles`. **No paid SaaS tier in 2026** — architects are free until volume threshold is met. Reassessment scheduled for 2027 (cf. `docs/audit/2026-04/STRATEGIC_DECISIONS.md`).

**Tiers `Studio / Atelier / Maison` are not implemented** in the codebase.

---

## Strategic context (2026)

- **Solo founder, no team.** Claude Code is the sole developer. Sustainable pace : roughly 1 major chantier every 2-3 weeks well done. Velocity ≠ throughput.
- **2026 is acquisition year, not monetization year for architects.** Architect SaaS pricing is intentionally absent. Focus is on building volume, delivered projects, and community proof.
- **Geographic focus : Europe + UK only in 2026.** Multi-currency / multi-language infrastructure to be built in for optionality, but operational focus stays European.
- **Tech debt is acceptable in 2026** as long as it's documented (this file). What's not acceptable : security gaps (RLS, secrets, validation) and silent breaking changes.

See `docs/audit/2026-04/STRATEGIC_DECISIONS.md` for the full append-only log of strategic decisions.

---

## Routing

Defined in `src/App.tsx`. Public vs protected:

- **Public** : `/`, `/products`, `/products/compare`, `/products/:id`, `/inspirations`, `/resources`, `/pro-service`, `/partners`, `/become-partner`, `/partners/:slug`, `/brands/:slug`, `/collections`, `/login`/`/auth`/`/reset-password`, `/boards/shared/:token`, `/mentions-legales`, `/cgv`, `/cgu`, `/confidentialite`, `*` (NotFound).
- **Auth required** (`ProtectedRoute`) : `/project-cart`, `/projects/new`, `/messages`, `/messages/:conversationId`, `/mood-board`, `/account`.
- **Admin only** (`ProtectedRoute requireAdmin`) : `/admin`.

User types in `user_profiles.user_type`: `client | partner | architect | admin`.

---

## Conventions

- **No new files unless asked.** Prefer editing existing files.
- **shadcn/ui primitives** in `src/components/ui/` — do not edit manually. Use `bunx shadcn@latest add <name>` to add new ones.
- **i18n** : every user-facing string goes through `useTranslation()` and the 4 locale JSONs (en/fr/es/it). Adding new locales is allowed but not currently planned for 2026 — focus is content quality on existing locales, not expansion to DE/NL/PT.
- **Migrations** : new SQL goes to `supabase/migrations/` with `YYYYMMDDHHMMSS_descriptive_snake.sql` naming. **Never edit existing migrations.** Apply via `mcp__supabase__apply_migration` for atomicity + traceability. **CRITICAL — drift prevention :** when applying a migration via `mcp__supabase__apply_migration` (or any Supabase MCP migration tool), the matching SQL file MUST also be created in `supabase/migrations/` with the same timestamp BEFORE commit. Otherwise the repo is no longer the source of truth and `supabase db reset` will diverge from production. Lesson learned 2026-04-30 chantier vocab : 11 migrations were applied prod-only and had to be back-extracted via `supabase_migrations.schema_migrations` before push.
- **Edge functions** : every edge function deployed to production MUST be versioned in `supabase/functions/<slug>/index.ts` BEFORE deployment. **No direct Studio deploy.** Each function has its own `README.md` documenting purpose, required secrets, tables touched, and re-enable procedure if guarded. The 2026-04-29 audit found 4 functions ACTIVE in prod missing from the repo — this rule exists to prevent that drift from recurring.
- **RLS** : every new table must have RLS enabled and a deliberate policy set. The 2026-04-29 hotfix exists because three CRM tables were missed. Use `public.is_admin()` for admin-only access.
- **Server-side validation** : never trust the client. Edge functions and RPCs validate inputs.
- **Stripe** : payment-related code lives in `stripe-checkout` and `stripe-webhook` edge functions. Never trust client-side Stripe events. Always verify webhook signatures server-side. Never log raw card data or full Stripe customer secrets.
- **Vocabulary 2026 dictionaries** : product specs use canonical dictionaries — `src/engine/dictionaries/fabricBrands.ts` (FABRIC_BRAND_SLUGS, TERM_TO_FABRIC_BRAND_SLUG, PREMIUM_FABRIC_BRANDS) ; `src/engine/intentDetector.ts` exports `TERM_TO_TREND_TAG` (~14 design-trend slugs : resimercial, soft-modern, biophilic, layered-maximalism, cocooning, material-honesty, linger-worthy, quiet/social/vip-zone, acoustic-comfort, repairable, reconfigurable, replacement-parts-available). Per-category UI sub-components live in `src/components/products/specs/` (TableSpecsSection / ParasolSpecsSection / SunLoungerSpecsSection / SofaSpecsSection / BarStoolSpecsSection / HighTableSpecsSection). Their zod schemas + types are centralized in `specs/shared/types.ts`. **Reuse these dictionaries — do not redefine fabric brands or trend slugs inline.**
- **Mobile-first** : Tailwind breakpoints, no desktop-only assumptions.
- **No `any`** unless justified inline. ESLint rule is currently disabled — treat that as tech debt, not as license.

---

## Known tech debt (snapshot 2026-04-30)

To be expanded by ÉTAPE 2 of the audit. Current visible items:

1. TypeScript `strict: false` everywhere — gradual tightening planned. New sub-components (`products/specs/*`) are already strict-conformant.
2. Three lockfiles co-exist: `bun.lock`, `bun.lockb`, `package-lock.json`. CI uses `bun install --frozen-lockfile`.
3. `playwright.config.ts` references an external lib; no actual E2E tests in repo.
4. Duplicate `use-toast`: `src/hooks/use-toast.ts` AND `src/components/ui/use-toast.ts`.
5. Supabase advisors WARN remaining (post-hotfix + chantier vocab) : `function_search_path_mutable` on `update_product_review_timestamp`, `materialized_view_in_api` on `product_review_stats`, `rls_policy_always_true` on `concept_events`. **`auth_rls_initplan` resolved 7 → 0** in chantier vocab. **`unindexed_foreign_keys` reduced 8 → 3** (3 residuals on `concept_events.user_id`, `product_reviews.order_id`, `product_reviews.quote_request_id` — pre-existing, out of vocab scope).
6. Pricing details (monthly fees, commission tiers) are partially in `partnerConstants.ts` and partially in `platform_settings` (58 rows) — to be unified.
7. **`multiple_permissive_policies` : 623 advisor entries** across 53 tables (verified 2026-04-30 via `get_advisors`). Pattern admin + owner-policy generates 2 policies per (action × role), and Postgres evaluates both at every query. Reported to Bucket 3 backlog (`docs/chantiers/2026-05/BACKLOG_POST_VOCAB.md` §5) — Q3 2026, 1-2 days estimated, target < 100. **Out of scope for vocab chantier** (touches 53 tables incl. critical flows : auth, payments, conversations).
8. **Edge function prompts mismatch the new lowercase-kebab category taxonomy.** `enrich-products`, `analyze-csv-products`, `analyze-terrace`, `analyze-product-image` still return capitalized/mixed labels (`"Chairs"`, `"Bar Stools"`, `"Lounge Seating"`). Workaround : `src/lib/categoryNormalizer.ts` absorbs the divergence client-side. Proper fix tracked in `BACKLOG_POST_VOCAB.md` §6 (Q3 2026, ~1-2h).
9. **`AdminAIScanner` : the AI re-tag flow doesn't yet propose values for the 27 new critical-spec columns** (extension_capability, fabric_certification, etc.). The form fields render via the new sub-components (chantier ÉTAPE 2.5/3.5/4.5/5.5/6.5 admin integration), but bulk AI suggestions on those fields are pending. Tracked in `BACKLOG_POST_VOCAB.md` §3 (Q3 2026).
10. **Demo catalogue thin** : only **9 products active in DB** as of 2026-04-30. The new category UIs + dictionaries are validated by tests but not exercised by production data. Tracked in `BACKLOG_POST_VOCAB.md` §1 (semaine 5-6, target 30-50 products before Salone relaunch mid-June 2026).

See `docs/audit/2026-04/RECON.md` §17 for the full list of open questions and `docs/chantiers/2026-05/CHANGELOG.md` for the chantier vocab synthesis.
