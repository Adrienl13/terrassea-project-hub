# RECON — Reconnaissance initiale du codebase Terrassea Hub

**Date :** 2026-04-29
**Auditeur :** Claude Code (Opus 4.7, 1M context)
**Branche :** `main` @ commit `a9ca964` (post-hotfix RLS prospects)
**Statut :** ÉTAPE 1 terminée — en attente validation founder pour ÉTAPE 2 (audit thématique)

---

## 0. Résumé exécutif

Le codebase Terrassea Hub est une application **React 18 + TypeScript + Vite** mono-repo, avec backend Supabase (PostgreSQL + Auth + Edge Functions). Il contient **273 fichiers TS/TSX (~90 842 LOC)**, **47 migrations versionnées**, **13 edge functions Supabase**, et **4 fonctions serverless Vercel**. Routing client-side via React Router 7, i18n sur **4 langues** (`en`/`fr`/`es`/`it`).

**Maturité globale** : codebase actif, well-structured, mais avec plusieurs zones de friction visibles dès la RECON (TypeScript laxiste, advisors Supabase WARN restants, divergences brief vs réel sur les plans tarifaires et les tiers architectes). Détail à creuser à l'ÉTAPE 2.

**Hotfix appliqué pendant la RECON** : RLS activée sur `architect_prospects`, `distributor_prospects`, `brand_prospects` (voir §15 et `HOTFIX_RLS_PROSPECTS.md`).

---

## 1. Volume codebase

| Métrique | Valeur |
|---|---|
| Fichiers `.ts` + `.tsx` dans `src/` | **273** |
| Lignes de code dans `src/` | **90 842** |
| Migrations Supabase versionnées | **47** (du 2026-03-13 au 2026-04-20) |
| Edge functions Supabase | **13** |
| Fonctions serverless Vercel (`api/`) | **4** |
| Pages React | **26** (dans `src/pages/`) |
| Sous-dossiers `src/components/` | **16** (hors `ui/`) |
| Composants UI shadcn primitives | **49** (dans `src/components/ui/`) |
| Hooks custom | **24** (dans `src/hooks/`) |
| Modules lib | **19** (dans `src/lib/`) |
| Modules engine | **10** (dans `src/engine/`) |
| Fichiers de test | **7** (dans `src/test/`) |
| Locales i18n | **4** (`en`, `fr`, `es`, `it`) |
| Tables `public` Supabase | **66** (incluant `architect_prospects`, `distributor_prospects`, `brand_prospects` désormais sécurisées) |

---

## 2. Stack technique observée

### 2.1 Frontend

| Catégorie | Technologie / version |
|---|---|
| Framework | React **18.3.1** |
| Routing | react-router-dom **7.13.2** |
| Build tool | Vite **5.4.19** + plugin React SWC |
| Langage | TypeScript **5.8.3** |
| UI primitives | shadcn/ui (49 composants) sur Radix UI |
| Styling | Tailwind CSS **3.4.17** + `class-variance-authority`, `tailwind-merge`, `tailwindcss-animate`, `@tailwindcss/typography` |
| Animations | framer-motion **12.36.0** |
| Forms | react-hook-form **7.61.1** + `@hookform/resolvers` + `zod` **3.25.76** |
| Data fetching | `@tanstack/react-query` **5.83.0** |
| Toasts | sonner **1.7.4** |
| Charts | recharts **2.15.4** |
| i18n | i18next **25.8.19** + react-i18next **16.5.8** + browser-languagedetector |
| PDF | pdf-lib **1.17.1** |
| Spreadsheets | xlsx **0.18.5** |
| Calendar | react-day-picker **8.10.1** |
| Misc | `embla-carousel-react`, `cmdk`, `vaul`, `input-otp`, `react-resizable-panels` |

### 2.2 Backend

| Catégorie | Technologie |
|---|---|
| BaaS | Supabase (`@supabase/supabase-js` **2.99.1`) |
| DB | PostgreSQL (`vector`, `postgis`, `pg_trgm` extensions installées sur le projet, voir `mcp__supabase__list_extensions`) |
| Auth | Supabase Auth (mail+password + Google d'après les Resources/UI) |
| Edge functions | Deno (Supabase) — 13 fonctions |
| Serverless | Vercel functions Node (4 fichiers `api/*.ts`) |

### 2.3 Outillage

| Catégorie | Outil |
|---|---|
| Package manager | **bun** (présence de `bun.lock`, `bun.lockb`) |
| Linter | ESLint **9.32.0** + `typescript-eslint` **8.38.0** + `eslint-plugin-react-hooks` |
| Tests unitaires | Vitest **3.2.4** + jsdom + `@testing-library/react` + `@testing-library/jest-dom` |
| Tests E2E | Playwright **1.57.0** (présence de `playwright.config.ts` mais avec `lovable-agent-playwright-config` — config externalisée) |
| Compilation TS | `tsc --noEmit` (CI), pas de génération de bundle TS |
| Bundle UI | Vite avec `manualChunks` (vendor-react, vendor-supabase, vendor-ui, vendor-motion, vendor-query, vendor-i18n, vendor-recharts, vendor-pdf) |

---

## 3. Cartographie `src/`

```
src/
├── App.tsx                  Routing React Router (lazy-loaded), Providers (Auth, Query, Cart, Compare, Favourites)
├── main.tsx                 Entrée React DOM, import "./i18n"
├── index.css                Styles globaux Tailwind
├── App.css                  Styles legacy ?
├── vite-env.d.ts            Types Vite
├── assets/                  Assets statiques
├── components/              UI components (16 sous-dossiers thématiques + 22 composants racine)
├── contexts/                4 contexts React (AuthContext, ProjectCartContext, CompareContext, FavouritesContext)
├── data/                    Données statiques (1 fichier : products.ts — fallback ?)
├── engine/                  10 modules de logique métier client-side (voir §3.4)
├── hooks/                   24 hooks custom (voir §3.5)
├── i18n/                    Configuration i18next + 4 locales
├── integrations/supabase/   Client Supabase + types DB auto-générés
├── lib/                     19 modules utilitaires (voir §3.6)
├── pages/                   26 pages React (voir §3.2)
└── test/                    7 fichiers de tests Vitest (engines, BOM, palette, multiZone, compliance, search-categories)
```

### 3.1 `src/components/` — 16 sous-dossiers

| Sous-dossier | Rôle apparent |
|---|---|
| `admin/` | 25 composants — back-office (AdminDashboard, AdminUsers, AdminPartners, AdminBrandManagement, AdminQuoteWorkflow, AdminAIScanner, AdminSubscriptions, AdminSettings, AdminAnalyticsDashboard, AdminConceptAnalytics, etc.) |
| `architect-dashboard/` | Dashboard architectes (consultations, projets, annotations) |
| `client-dashboard/` | Dashboard clients CHR (DesignAssistantSection notamment) |
| `partner-dashboard/` | Dashboard partenaires (leads, quotes, analytics, supplier calls) |
| `partners/` | UI publique partenaires (PartnerCard, PartnerContactDialog) |
| `products/` | Catalog UI : filtres, compare bar, compatibles, quote modal |
| `project/` | Sourcing detail / project cart helpers (SupplierRecommendations, ProductDetailDrawer, SourcingAlerts) |
| `project-builder/` | Wizard multi-step (CapacityStep, StyleStep, EditableLayoutDisplay, ZoneEditor, etc.) |
| `quotes/` | PDF viewer/uploader, recap card, access section |
| `mood-board/` | Mood boards avec items |
| `pro-service/` | Pro service request flow |
| `payments/` | Stripe flows |
| `financing/` | Financing requests |
| `resources/` | Pages ressources (illustrations) |
| `ui/` | **49 primitives shadcn** (Radix wrappers) — ne pas éditer manuellement |
| Composants racine (22) | Header, Footer, ChatbotWidget, ConceptCard, ProjectResults, MultiZoneResults, HeroSearch, SmartSearch, ProductCard, ProductSearchResults, ProtectedRoute, ErrorBoundary, SEO, StructuredData, NotificationBell, CookieBanner, etc. |

### 3.2 `src/pages/` — 26 pages

| Pages | Rôle |
|---|---|
| `Index.tsx` | Homepage (hero search) |
| `Products.tsx`, `ProductDetail.tsx`, `ProductCompare.tsx` | Catalog |
| `ProjectBuilder.tsx`, `ProjectCart.tsx` | Wizard projet + sourcing |
| `Partners.tsx`, `PartnerDetail.tsx`, `BecomePartner.tsx` | Annuaire partenaires |
| `BrandPage.tsx`, `Collections.tsx` | Pages brand-specifiques |
| `ProService.tsx`, `ProServiceGate.tsx` | Pro service (lead form public + page protégée) |
| `Inspirations.tsx`, `Resources.tsx` | Contenu marketing/SEO |
| `MoodBoard.tsx`, `SharedBoard.tsx` | Mood board (privé + partage public via token) |
| `Account.tsx` | Compte utilisateur (protégé) |
| `Admin.tsx` | Back-office (protégé `requireAdmin`) |
| `Messages.tsx` | Messagerie internes (protégé) |
| `Auth.tsx` | Login / signup / reset-password |
| `Legal.tsx`, `CGV.tsx`, `CGU.tsx`, `Privacy.tsx` | Pages légales |
| `NotFound.tsx` | 404 |

### 3.3 `src/contexts/`

- **`AuthContext`** — session Supabase + ligne `user_profiles`. User types : `client | partner | architect | admin`.
- **`ProjectCartContext`** — cart in-memory `CartItem[]`, suppliers sélectionnés par produit, `QuotationStatus`.
- **`CompareContext`** — jusqu'à 3 produits comparés.
- **`FavouritesContext`** — produits favoris (sync DB via `useFavouritesDB`).

### 3.4 `src/engine/` — 10 modules

| Module | Rôle |
|---|---|
| `types.ts` | Types partagés (`ProjectParameters`, `LayoutRequirement`, `BOMSlot`, `ProjectConcept`, `ConceptBOM`, etc.) |
| `layoutEngine.ts` | Layout sièges + métriques spatiales |
| `spatialEngine.ts` | Calculs densité d'une terrasse |
| `projectEngine.ts` | Génère `ProjectConcept[]` à partir de paramètres + catalogue |
| `supplierEngine.ts` | Score / classe les offres fournisseurs (MOQ-aware depuis Chantier 3) |
| `multiZoneEngine.ts` | Multi-zone (nouveau, Chantier 3) |
| `complianceEngine.ts` | Compliance (nouveau, Chantier 3) |
| `compatibilityEngine.ts` | Compatibilités produits |
| `similarityEngine.ts` | Similarité produits |
| `intentDetector.ts` | Parsing langage naturel des recherches |

### 3.5 `src/hooks/` — 24 hooks

Liste : `use-mobile`, `use-toast`, `useAdminAnalytics`, `useArchitectProjects`, `useArrivals`, `useChatbot`, `useClientCountry`, `useClientDashboard`, `useConversations`, `useDebounce`, `useFavouritesDB`, `useMoodBoard`, `useNotifications`, `useOrders`, `usePartnerAnalytics`, `usePartnerLeads`, `usePartnerQuotes`, `usePaymentFlow`, `useProductReviews`, `useProductSubmissions`, `useProducts`, `useSearchAutocomplete`, `useStripePayment`, `useSupplierCalls`.

⚠ Doublon constaté : **`use-toast.ts`** existe à la fois dans `hooks/` ET `components/ui/use-toast.ts`. À investiguer en ÉTAPE 2 (Thème 1 — Architecture).

### 3.6 `src/lib/` — 19 modules

`cartPdfExport`, `conceptTracking`, `countries`, `i18nFields`, `partnerConstants`, `paymentUtils`, `pdfCoverPage`, `productOffers`, `productQualityScore`, `products`, `quoteDocuments`, `reasonI18n`, `sanitizePostgrest`, `searchNormalizer`, `sirenVerification`, `trackingService`, `utils`, `validateUpload`.

À noter : `partnerConstants.ts` contient la **single source of truth** pour les plans/commissions (voir §14 Divergences).

---

## 4. Cartographie `supabase/`

```
supabase/
├── config.toml         project_id = "cguffqiewducpbofdvff"   ⚠ DIVERGENT du vrai projet
├── functions/          13 edge functions (Deno)
└── migrations/         47 migrations versionnées (2026-03-13 → 2026-04-29)
```

### 4.1 Edge Functions (13)

| Fonction | Rôle apparent (déduit du nom) |
|---|---|
| `analyze-csv-products` | Import CSV de produits avec analyse IA |
| `analyze-product-image` | Analyse image produit (vision LLM) |
| `enrich-products` | Enrichissement bulk produits |
| `merge-descriptions` | Fusion / nettoyage descriptions produits |
| `auto-workflow` | Workflow automatique (à creuser ÉTAPE 2) |
| `chatbot` | Backend chatbot (probablement Anthropic Claude) |
| `run-scheduled-tasks` | Tâches planifiées (cron-style) |
| `send-notification-email` | Envoi mails de notification |
| `send-quote-notification` | Envoi mail spécifique workflow quote |
| `send-review-request` | Demande d'avis post-livraison |
| `stock-sync-webhook` | Webhook synchronisation stocks partenaires |
| `stripe-checkout` | Création session Stripe Checkout |
| `stripe-webhook` | Webhook Stripe (paiement confirmé, etc.) |

### 4.2 Migrations (47 fichiers, du 2026-03-13 au 2026-04-29)

Migrations remarquables identifiées :

| Migration | Sujet |
|---|---|
| `20260326180000_security_rls_lockdown.sql` | Durcissement RLS général (products, partners, applications, quotes…) |
| `20260408200000_define_is_admin_function.sql` | Helper `public.is_admin()` SECURITY DEFINER |
| `20260408300000_enable_rls_all_tables.sql` | Activation RLS en masse (incomplet — a raté les `*_prospects`) |
| `20260411100000_restrict_user_profiles_self_update.sql` | Restreint update self à colonnes safe via RPC |
| `20260412100000_fix_quote_system_phase1.sql` + `200000_security_integrity_phase2.sql` | Refonte du système quote (39 issues) |
| `20260420100000_analytics_concept_events_scoring_snapshots.sql` | Tables analytics Chantier 1 feedback loop |
| **`20260429120000_enable_rls_prospects_admin_only.sql`** | **HOTFIX d'aujourd'hui** — voir §15 |

---

## 5. Cartographie `api/` (Vercel functions, 4 fichiers)

| Fichier | Rôle |
|---|---|
| `cron-reminders.ts` | Cron Vercel (configuré dans `vercel.json` : `"schedule": "0 9 * * *"`) — rappels quotidiens |
| `geo.ts` | Geo-routing (détection pays — utilisé par `useClientCountry`) |
| `prerender.ts` | Server-side rendering pour bots IA / SEO (déclenché par `vercel.json` rewrite header user-agent) |
| `sitemap.ts` | `GET /sitemap.xml` |

`vercel.json` configure aussi des security headers globaux (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Permissions-Policy`, `Referrer-Policy`).

---

## 6. Cartographie `public/`

`favicon.ico`, `og-image.svg`, `placeholder.svg`, `robots.txt`, `sitemap.xml` (statique), `llms.txt`, `llms-full.txt` (servi avec content-type `text/markdown` via headers Vercel).

---

## 7. Cartographie `.github/`

```
.github/workflows/ci.yml
```

Workflow CI :
- Trigger : `push` sur `main` + `pull_request` sur `main`
- Steps : checkout → setup-node@20 → setup-bun → `bun install --frozen-lockfile` → `bun run lint` → `bunx tsc --noEmit` → `bun run test` → `bun run build`
- ✅ Lint, type-check, tests, build sont **bloquants au merge**

---

## 8. Configuration & tooling

| Fichier | Note |
|---|---|
| `package.json` | `"private": true`, scripts `dev`/`build`/`build:dev`/`lint`/`preview`/`test`/`test:watch` |
| `tsconfig.json` (root) | Réfère `tsconfig.app.json` + `tsconfig.node.json`. **`strict` non activé**, `noImplicitAny: false`, `strictNullChecks: false` |
| `tsconfig.app.json` | Idem, `strict: false` également |
| `vite.config.ts` | manualChunks bien structurés (vendor-react, vendor-supabase, vendor-ui, vendor-motion, vendor-query, vendor-i18n, vendor-recharts, vendor-pdf). Plugin `lovable-tagger` en dev only. HMR overlay désactivé. |
| `eslint.config.js` | Flat config. `@typescript-eslint/no-explicit-any: off`, `@typescript-eslint/no-unused-vars: warn`. React-hooks rules activées. |
| `vitest.config.ts` | jsdom, globals true, setupFile `src/test/setup.ts`, include `src/**/*.{test,spec}.{ts,tsx}` |
| `vercel.json` | Cron `/api/cron-reminders` à 9h tous les jours, prerender bots IA/SEO, security headers globaux |
| `playwright.config.ts` | Réfère `lovable-agent-playwright-config` — config externalisée, pas de tests E2E visibles dans le repo |
| `.gitignore` | Couvre `.env`, `.env.*` (sauf `.example`), `node_modules`, `dist`, `.claude/`, `.mcp.json` |
| `.mcp.json` | MCP Supabase HTTP pointant sur `gwgcfgeouropcighpztj` |
| `components.json` | shadcn/ui config (`baseColor: slate`, `cssVariables: true`) |

---

## 9. Tests

### 9.1 Tests unitaires Vitest (7 fichiers)

| Fichier | Sujet |
|---|---|
| `src/test/engines.test.ts` | Tests des engines (probablement projectEngine, layoutEngine, etc.) |
| `src/test/bom-validation.test.ts` | Validation BOM (Bill of Materials) |
| `src/test/palette-validation.test.ts` | Validation palettes couleurs |
| `src/test/multiZone.test.ts` | Multi-zone engine (Chantier 3) |
| `src/test/compliance.test.ts` | Compliance engine (Chantier 3) |
| `src/test/search-categories.test.ts` | Catégories de recherche |
| `src/test/setup.ts` | Setup global (jsdom, mocks) |

**Couverture estimée RECON-only** : tests centrés sur le moteur métier (engine/) et la validation côté client. **Aucun test côté composants UI ni hooks**, **aucun test E2E concret**. À creuser à l'ÉTAPE 2 (Thème 6 — Tests).

### 9.2 Tests E2E

`playwright.config.ts` réfère `lovable-agent-playwright-config/config` (lib externe). Pas de fichiers `*.spec.ts` E2E dans le repo. **Statut effectif : E2E non implémentés en local**, à confirmer ÉTAPE 2.

---

## 10. Routing & points d'entrée

### 10.1 Entrées

- **HTML** : `index.html` (racine) → `<div id="root">` + `<script src="/src/main.tsx">`.
- **JS** : `src/main.tsx` (7 lignes) → `createRoot().render(<App />)`. Import `./i18n` au démarrage.
- **App** : `src/App.tsx` (118 lignes) — providers + Routes.

### 10.2 Routes (extraits de `src/App.tsx`)

| Route | Page | Protection |
|---|---|---|
| `/` | `Index` | publique |
| `/products` | `Products` | publique |
| `/products/compare` | `ProductCompare` | publique |
| `/products/:id` | `ProductDetail` | publique |
| `/project-cart` | `ProjectCart` | `ProtectedRoute` (auth) |
| `/projects/new` | `ProjectBuilder` | `ProtectedRoute` (auth) |
| `/inspirations` | `Inspirations` | publique |
| `/resources` | `Resources` | publique |
| `/pro-service` | `ProServiceGate` | publique (gate puis form) |
| `/partners` | `Partners` | publique |
| `/become-partner` | `BecomePartner` | publique |
| `/partners/:slug` | `PartnerDetail` | publique |
| `/brands/:slug` | `BrandPage` | publique |
| `/collections` | `Collections` | publique |
| `/admin` | `Admin` | `ProtectedRoute requireAdmin` |
| `/messages`, `/messages/:conversationId` | `Messages` | `ProtectedRoute` |
| `/login`, `/auth`, `/reset-password` | `Auth` | publique |
| `/boards/shared/:token` | `SharedBoard` | publique (token-based) |
| `/mood-board` | `MoodBoard` | `ProtectedRoute` |
| `/account` | `Account` | `ProtectedRoute` |
| `/mentions-legales`, `/cgv`, `/cgu`, `/confidentialite` | légal | publique |
| `*` | `NotFound` | publique |

### 10.3 Providers

Hiérarchie observée dans `App.tsx` :
```
QueryClientProvider
└── TooltipProvider
    └── ErrorBoundary
        └── AuthProvider
            └── FavouritesProvider
                └── ProjectCartProvider
                    └── CompareProvider
                        ├── Sonner (toasts)
                        ├── BrowserRouter (Routes)
                        ├── Suspense (CookieBanner, ChatbotWidget)
                        └── StructuredData (SEO)
```

`QueryClient` config : `staleTime: 120_000` (2 min), `refetchOnWindowFocus: false`.

---

## 11. Tables Supabase identifiées (réelles, via `mcp__supabase__list_tables`)

**66 tables** dans le schéma `public`, toutes avec RLS activée (post-hotfix).

### 11.1 Tables principales (rows > 0 ou centrales)

| Table | Rows | Note |
|---|---|---|
| `tag_definitions` | 346 | (brief annonçait 339 → écart de +7) |
| `product_submissions` | 211 | Soumissions partenaires |
| `notifications` | 178 | Bell d'événements |
| `platform_settings` | 58 | Feature flags + config (lu via `Authenticated read platform_settings`) |
| `products` | 53 | Catalogue produit |
| `product_offers` | 52 | Offres fournisseurs (multi-color depuis migration `20260331400000`) |
| `brand_prospects` | 52 | CRM (sécurisé hotfix 2026-04-29) |
| `architect_prospects` | 36 | CRM (sécurisé hotfix 2026-04-29) |
| `distributor_prospects` | 26 | CRM (sécurisé hotfix 2026-04-29) |
| `user_profiles` | 11 | Comptes (admin / client / partner / architect) |
| `project_requests` | 8 | Demandes projet |
| `messages` | 7 | Messagerie |
| `quote_requests` | 5 | Quotes |
| `saved_carts` | 5 | Carts persistés |
| `conversation_participants` | 4 | |
| `project_cart_items` | 4 | |
| `conversations` | 2 | |
| `partners`, `partner_subscriptions` | 1 chacun | |

### 11.2 Tables vides mais structurellement définies (rows = 0)

`partner_applications`, `partner_commissions`, `partner_loyalty`, `partner_points_history`, `partner_analytics`, `partner_featured_products`, `partner_ratings`, `partner_arrivals`, `partner_arrival_items`, `partner_api_connections`, `partner_contact_requests`, `pro_service_requests`, `pro_service_matches`, `pro_service_responses`, `pro_service_events`, `quote_documents`, `user_favourites`, `orders`, `order_events`, `image_analyses`, `architect_projects`, `project_zones`, `project_zone_products`, `project_annotations`, `material_boards`, `board_items`, `project_templates`, `supplier_calls`, `supplier_call_needs`, `supplier_call_responses`, `supplier_call_response_products`, `preorders`, `chatbot_conversations`, `chatbot_messages`, `chatbot_usage`, `financing_requests`, `project_briefs`, `brand_distributors`, `brand_collections`, `brand_references`, `salone_2026_visits`, `product_reviews`, `product_archetypes`, `stock_sync_logs`, `scoring_snapshots`, `concept_events`.

---

## 12. Internationalisation

| Aspect | État |
|---|---|
| Locales | **4** : `en`, `fr`, `es`, `it` (dans `src/i18n/locales/`) |
| Bibliothèque | i18next 25 + react-i18next 16 + browser-languagedetector |
| Détection | ordre `localStorage` → `navigator`, persistance `localStorage` |
| Fallback | `en` |
| Escape | désactivé (`escapeValue: false` — React échappe déjà) |

`src/i18n/index.ts` est l'unique point de config. Les fichiers `*.json` n'ont PAS été ouverts pendant la RECON pour économiser le contexte (ils dépassent vraisemblablement plusieurs milliers de clés).

---

## 13. Tooling spécial / observations diverses

- **`lovable-tagger`** : plugin Vite en `mode === "development"` only. Provient de l'origine Lovable du projet (cf. premiers commits `gpt-engineer-app[bot]`).
- **`bun.lock` + `bun.lockb`** : 2 lockfiles co-existent (un texte `.lock` 154 KB + un binaire `.lockb` 246 KB). Doublon à clarifier ÉTAPE 2 (probablement résiduel de migration npm→bun).
- **`package-lock.json`** : également présent (309 KB). **3 lockfiles = signal d'incohérence package manager**.
- **`brief-brand-system.md`** : dossier vide à la racine — résidu, à nettoyer.
- **`dist/`** : présent à la racine (commit récent ?). Devrait être gitignore (oui, `.gitignore:11` couvre `dist`). À vérifier qu'il n'est pas versionné.
- **`.agents/`** : présent (gitignored) — contient `product-marketing-context.md`. Hors scope app.

---

## 14. Divergences avec le brief stratégique

> Cette section liste **tous les écarts** entre le brief que tu m'as donné et l'état réel du codebase, pour que tu puisses mettre à jour ton CLAUDE.md.

### 14.1 Chemins de fichiers

| Brief | Réalité |
|---|---|
| `src/lib/engine/projectEngine.ts` | `src/engine/projectEngine.ts` (engine au niveau racine de `src/`, pas dans `lib/`) |
| `src/lib/engine/intentDetector.ts` | `src/engine/intentDetector.ts` |

### 14.2 Internationalisation

| Brief | Réalité |
|---|---|
| 6 langues : EN, FR, IT, ES, DE, NL | **4 langues** : `en`, `fr`, `es`, `it`. Allemand (DE) et Néerlandais (NL) **absents** |
| 339 tags multilingues 6 langues | **346 lignes** dans `tag_definitions`. Nombre de colonnes label par langue à vérifier ÉTAPE 2 (le brief implique 6, le code dit 4) |

### 14.3 Edge Functions

Brief annonce **3** (`analyze-product-image`, `analyze-csv-products`, `enrich-products`). Réalité : **13** edge functions (les 3 + 10 autres : `auto-workflow`, `chatbot`, `merge-descriptions`, `run-scheduled-tasks`, `send-notification-email`, `send-quote-notification`, `send-review-request`, `stock-sync-webhook`, `stripe-checkout`, `stripe-webhook`).

### 14.4 Tables annoncées vs présentes

| Brief | Réalité |
|---|---|
| `brands` | ❌ **n'existe pas**. À la place : `brand_collections`, `brand_distributors`, `brand_references`, `brand_prospects`. La notion de "brand" semble portée par `partners` avec `partner_type='brand'` et `partner_mode='brand_member'/'brand_network'`. |
| `loyalty_balance` | ❌ **n'existe pas**. À la place : `partner_loyalty` + `partner_points_history`. |

Tables annoncées et présentes : `products`, `tag_definitions`, `partners`, `architect_projects`, `project_zones`, `material_boards`, `quote_requests`, `orders`, `brand_distributors`, `conversations` ✅

### 14.5 Plans tarifaires partenaires

**Source de vérité du code** : `src/lib/partnerConstants.ts`

| Plan (code) | Commission | Max produits | Prix mensuel ? |
|---|---|---|---|
| `starter` | 8 % | 30 | non défini dans `partnerConstants.ts` (probablement dans `platform_settings`) |
| `growth` | 5 % | 50 | idem |
| `elite` | 3.5 % | 150 | idem |
| `brand_member` | 0 % | 999 | idem |
| `brand_network` | 0 % | 999 | idem |

**Brief utilisateur prompt actuel** : Starter 0€/8%, Growth 249€/5%, **Elite 599€/3.5%**, **Elite Pro 899€/2.5%**.

**Divergences** :
- Le plan **`Elite Pro`** annoncé dans le brief **n'existe pas** dans `PARTNER_PLANS`. Plan le plus cher actuel = `elite` à 3.5 % de commission.
- Les **prix mensuels** ne sont **pas dans le code** (ni dans `partnerConstants.ts`, ni dans `MAX_PRODUCTS_BY_PLAN`). Probablement stockés dans `platform_settings` (58 lignes — à vérifier ÉTAPE 2).
- `.agents/product-marketing-context.md` (hors-app) annonce des prix **différents encore** : Distributor Elite à €499 (vs 599 dans brief), Brand Member €799 et Brand Network €1 299 (jamais vus dans le brief utilisateur). Triple incohérence brief vs marketing context vs code.
- Migration `20260409100000_brand_plans_zero_commission.sql` confirme que `brand_member` et `brand_network` sont passés à 0% de commission (donc probablement pricing pur subscription pour ces deux modes).

### 14.6 Tiers architectes

**Brief** : `Studio / Atelier / Maison`.

**Réalité** : aucune trace dans `partnerConstants.ts`, ni dans les tables `user_profiles`, `architect_projects`, `architect_prospects`. **Concept absent du code**. À traiter comme "feature non encore implémentée" pour l'audit.

### 14.7 Composants annoncés sans trace explicite

Brief mentionne :
- **`MoodBoardAnalyzer`** : pas de fichier portant ce nom. Il y a `mood-board/` (composants UI) et `useMoodBoard` (hook), mais pas de composant analyzer dédié visible.
- **`similarityEngine.ts`** : ✅ existe à `src/engine/similarityEngine.ts`.

### 14.8 Project ID Supabase — RÉSOLU le 2026-04-29

**Constat initial (RECON)** :

| Source | Valeur |
|---|---|
| `.env` | `gwgcfgeouropcighpztj` (prod, vrai projet) |
| `.mcp.json` | `gwgcfgeouropcighpztj` ✅ cohérent |
| `supabase/config.toml` | `cguffqiewducpbofdvff` ⚠ **divergent** |

**Résolution (commit `605f106`)** : confirmation founder qu'il n'existe **qu'un seul projet Supabase** (`gwgcfgeouropcighpztj`). Le `config.toml` référençait un project_id obsolète (vraisemblablement Lovable initial / sandbox abandonnée). Aligné sur le vrai project_id le 2026-04-29.

✅ **Statut : résolu.** Plus de risque que `supabase db reset` lancé localement écrive sur un projet fantôme.

### 14.9 Pages pas mentionnées dans le brief

Le brief n'évoque pas explicitement plusieurs zones existantes : **chatbot** (table + edge function + widget), **financing** (composants + table `financing_requests`), **mood-board** (pages + hook + tables `material_boards` / `board_items`), **pro-service** (gate + page + tables `pro_service_*`), **supplier_calls** (4 tables), **scoring_snapshots** + **concept_events** (analytics Chantier 1 feedback loop), **chatbot_usage**.

C'est une vraie surface fonctionnelle non documentée — à intégrer à `CLAUDE.md` côté founder.

---

## 15. Hotfix appliqué pendant la RECON

| Action | Détail |
|---|---|
| Détection | `mcp__supabase__get_advisors(security)` → 3 ERROR `rls_disabled_in_public` sur `architect_prospects`, `distributor_prospects`, `brand_prospects` (114 lignes B2B exposées) |
| Documentation | `docs/audit/2026-04/HOTFIX_RLS_PROSPECTS.md` |
| Migration | `supabase/migrations/20260429120000_enable_rls_prospects_admin_only.sql` (RLS activée + FORCE + 12 policies admin-only via `public.is_admin()`) |
| Commit / push | `a9ca964` sur `origin/main` |
| Tests | A (anon=0) ✅, B (service_role=36/26/52) ✅, C (INSERT/DELETE round-trip) ✅, D (advisors clean) ✅ |
| Évaluation RGPD | Notification CNIL non active ; risque faible (B2B, exposition front nulle) ; vérification logs Supabase 30j déléguée founder |

---

## 16. Advisors Supabase à traiter (hors hotfix, à intégrer à l'ÉTAPE 2)

Issus des scans `mcp__supabase__get_advisors(type="security")` pre-fix et post-fix :

| Advisor | Niveau | Cible | Note |
|---|---|---|---|
| `function_search_path_mutable` | WARN | `public.update_product_review_timestamp` | Fonction sans `SET search_path` fixé. À durcir comme `public.is_admin()`. |
| `materialized_view_in_api` | WARN | `public.product_review_stats` | Vue matérialisée accessible par `anon`/`authenticated` via PostgREST. À évaluer : sensibilité des stats agrégées. |
| `rls_policy_always_true` | WARN | `public.concept_events` policy `Anyone can insert concept events` | Policy INSERT avec `WITH CHECK (true)`. Probablement intentionnel pour tracking analytics anonyme, à confirmer. |

**Output complet `get_advisors(security)`** persisté à : `/Users/adrien/.claude/projects/.../tool-results/toolu_01PiPtTypBiauubaNingicUu.json` (60 KB). Le scan **performance** (advisors index/RLS perf) n'a pas été exécuté pendant la RECON — sera fait à l'ÉTAPE 2 (Thème 5 — Performance).

---

## 17. Questions ouvertes pour l'ÉTAPE 2

Listées au fil de la RECON pour référence. Ne pas chercher à y répondre maintenant.

1. **Doublon `use-toast`** : `src/hooks/use-toast.ts` ET `src/components/ui/use-toast.ts`. Lequel est canonique ? L'autre est-il importé quelque part ?
2. **3 lockfiles** : `bun.lock` (texte) + `bun.lockb` (binaire) + `package-lock.json`. Lequel fait foi ? CI utilise `bun install --frozen-lockfile` (donc `bun.lock` ou `bun.lockb`).
3. **Project ID Supabase divergent dans `config.toml`** : ancien projet ? Sandbox Lovable ?
4. **Pas de Sentry / PostHog / Plausible identifié** au niveau RECON. Aucun outil d'observabilité produit visible. À confirmer ÉTAPE 2 (Thème 7 — Observabilité).
5. **Tests E2E** : `playwright.config.ts` réfère un package externe `lovable-agent-playwright-config`. Aucun fichier `.spec.ts` côté repo. Tests E2E réellement exécutés ?
6. **`brief-brand-system.md`** : dossier vide à la racine — peut être supprimé ?
7. **`dist/`** : présent localement mais gitignore. Vérifier qu'il n'a pas été push accidentellement.
8. **TypeScript laxiste** : `strict: false`, `noImplicitAny: false`, `strictNullChecks: false`, ESLint `no-explicit-any: off`. Décision business à arbitrer (renforcement progressif ?) — Thème 1 ou 2 ÉTAPE 2.
9. **Plans tarifaires** : où sont les **prix mensuels** stockés ? Dans `platform_settings` ? Si oui, vérifier la cohérence avec brief utilisateur et `.agents/product-marketing-context.md`.

---

## 18. Récapitulatif de fin d'ÉTAPE 1

**Fichiers produits par l'audit à ce stade** :
- `docs/audit/2026-04/HOTFIX_RLS_PROSPECTS.md` (committé `a9ca964`)
- `docs/audit/2026-04/RECON.md` (ce fichier — non committé)

**Fichiers technique introduits dans le repo** :
- `supabase/migrations/20260429120000_enable_rls_prospects_admin_only.sql` (committé `a9ca964`)

**État audit** :
- ÉTAPE 1 RECON : ✅ terminée
- ÉTAPE 2 audit thématique : ⏸ en attente validation founder de cette RECON
- ÉTAPE 3 synthèse + ÉTAPE 4 plan d'action : ⏸ pas démarrées

**Action attendue founder** :
1. Lire ce fichier (~600 lignes mais navigation par sommaire)
2. Confirmer ou corriger les **divergences §14** (utile pour mettre à jour le CLAUDE.md racine)
3. Donner GO ÉTAPE 2 ou demander des clarifications sur la §17

🛑 **STOP fort en fin d'ÉTAPE 1**, j'attends la relecture avant ÉTAPE 2.
