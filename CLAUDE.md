# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev          # Start dev server (Vite)
bun run build        # Production build
bun run lint         # ESLint
bun run test         # Run unit tests (Vitest, single run)
bun run test:watch   # Run unit tests in watch mode
```

To run a single test file:
```bash
bunx vitest run src/path/to/file.test.ts
```

## Architecture Overview

**Terrassea** is a B2B outdoor furniture sourcing platform for hospitality professionals (hotels, restaurants, beach clubs). Built with React 18 + TypeScript + Vite, using shadcn/ui components over Radix UI, Tailwind CSS, and Supabase as the backend.

### Routing & Pages (`src/pages/`)
All routes are defined in [src/App.tsx](src/App.tsx). Key pages:
- `/` — Homepage with hero search
- `/products` — Product catalog with filters and compare
- `/projects/new` — Multi-step ProjectBuilder wizard
- `/project-cart` — Sourcing cart with supplier selection
- `/partners` — Partner/supplier directory
- `/admin` — Protected admin panel (`requireAdmin`)
- `/account` — Protected user account (`ProtectedRoute`)

### Global State (React Contexts in `src/contexts/`)
- **AuthContext** — Supabase auth session + `user_profiles` table (user types: `client | partner | architect | admin`)
- **ProjectCartContext** — In-memory cart of `CartItem[]`; tracks selected suppliers per product and computes `QuotationStatus`
- **CompareContext** — Up to 3 products for side-by-side comparison
- **FavouritesContext** — User's saved products

### The Engine (`src/engine/`)
Core business logic, entirely client-side:
- **`types.ts`** — All shared types: `ProjectParameters`, `LayoutRequirement`, `BOMSlot`, `ProjectConcept`, `ConceptBOM`, etc.
- **`layoutEngine.ts`** — Computes seating layout and spatial metrics from project parameters
- **`spatialEngine.ts`** — Space/density calculations for a terrace
- **`projectEngine.ts`** — Generates `ProjectConcept[]` (concepts with BOM) from parameters + product catalog
- **`supplierEngine.ts`** — Scores and ranks supplier offers per product
- **`intentDetector.ts`** — Parses natural language search queries into structured filters

### Data Layer (`src/lib/`, `src/integrations/`)
- **`src/lib/products.ts`** — `DBProduct` type + Supabase queries for products
- **`src/lib/productOffers.ts`** — Supplier offer queries
- **`src/integrations/supabase/`** — Auto-generated Supabase client and full DB types

### Internationalisation
Four locales: `en`, `fr`, `es`, `it` in `src/i18n/locales/`. Configured in `src/i18n/index.ts` with browser language auto-detection (stored in `localStorage`). Use `useTranslation()` from `react-i18next` in components.

### Component Organisation
- `src/components/ui/` — Raw shadcn/ui primitives (do not edit manually; use `bunx shadcn@latest add`)
- `src/components/project-builder/` — Steps and sub-components for the ProjectBuilder wizard
- `src/components/project/` — Project cart / sourcing detail components
- `src/components/products/` — Product listing filters, compare bar, quote modal
- `src/components/partners/` — Partner cards and dialogs

### Path Alias
`@/` maps to `src/` throughout the codebase.
