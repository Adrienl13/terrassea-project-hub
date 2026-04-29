# CLAUDE.md

> Reference for any agent (Claude Code, sub-agents, future devs) working on the codebase.
> **Read this BEFORE editing.** Last updated 2026-04-29 after a full RECON of the codebase.
> Companion docs: `docs/audit/2026-04/RECON.md`, `docs/audit/2026-04/STRATEGIC_DECISIONS.md`.

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
- **Migrations** : new SQL goes to `supabase/migrations/` with `YYYYMMDDHHMMSS_descriptive_snake.sql` naming. **Never edit existing migrations.** Apply via `mcp__supabase__apply_migration` for atomicity + traceability.
- **Edge functions** : every edge function deployed to production MUST be versioned in `supabase/functions/<slug>/index.ts` BEFORE deployment. **No direct Studio deploy.** Each function has its own `README.md` documenting purpose, required secrets, tables touched, and re-enable procedure if guarded. The 2026-04-29 audit found 4 functions ACTIVE in prod missing from the repo — this rule exists to prevent that drift from recurring.
- **RLS** : every new table must have RLS enabled and a deliberate policy set. The 2026-04-29 hotfix exists because three CRM tables were missed. Use `public.is_admin()` for admin-only access.
- **Server-side validation** : never trust the client. Edge functions and RPCs validate inputs.
- **Stripe** : payment-related code lives in `stripe-checkout` and `stripe-webhook` edge functions. Never trust client-side Stripe events. Always verify webhook signatures server-side. Never log raw card data or full Stripe customer secrets.
- **Mobile-first** : Tailwind breakpoints, no desktop-only assumptions.
- **No `any`** unless justified inline. ESLint rule is currently disabled — treat that as tech debt, not as license.

---

## Known tech debt (snapshot 2026-04-29)

To be expanded by ÉTAPE 2 of the audit. Current visible items:

1. TypeScript `strict: false` everywhere — gradual tightening planned.
2. Three lockfiles co-exist: `bun.lock`, `bun.lockb`, `package-lock.json`. CI uses `bun install --frozen-lockfile`.
3. `playwright.config.ts` references an external lib; no actual E2E tests in repo.
4. Duplicate `use-toast`: `src/hooks/use-toast.ts` AND `src/components/ui/use-toast.ts`.
5. Supabase advisors WARN remaining (post-hotfix): `function_search_path_mutable` on `update_product_review_timestamp`, `materialized_view_in_api` on `product_review_stats`, `rls_policy_always_true` on `concept_events`.
6. Pricing details (monthly fees, commission tiers) are partially in `partnerConstants.ts` and partially in `platform_settings` (58 rows) — to be unified.

See `docs/audit/2026-04/RECON.md` §17 for the full list of open questions.
