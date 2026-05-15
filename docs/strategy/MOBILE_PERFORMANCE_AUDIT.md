# Audit Performance Mobile — Terrassea Hub

> **Date** : 14 mai 2026 (Day 13)
> **Origine** : Continuité Mobile UX (closed Day 13), démarchage Salone imminent
> **Statut** : Audit complet livré, plan correctif en 3 lots
> **Auteur** : Adrien Laniez · Fondateur Terrassea

---

## 1. Contexte

Mobile UX layout closed Day 13 (6 commits, audit + 5 lots). Marques Salone vont consulter Terrassea sur mobile. Performance = complément naturel du layout : page lente = friction avant même que l'utilisateur juge l'UX. Bundle JS lourd = coûteux sur 4G/5G hors WiFi. Images non optimisées = LCP dégradé.

Cet audit cartographie l'état actuel et planifie les optimisations sans implémentation.

---

## 2. Méthodologie

- Build production (`bun run build`) + analyse output Vite
- Inventory bundles JS et chunks (gros chunks > 100 KB)
- Inventory images dans `public/` + scan `<img>` tags dans `src/`
- Vérification lazy loading routes + images
- Vérification Supabase Storage transformations
- Lighthouse mobile : **non lancé** (CLI non installé localement). Capturé en suggestion follow-up.

---

## 3. Bundle analysis (build production)

### 3.1 Top chunks (raw size / gzip)

| Chunk | Raw | Gzip | Type |
|---|---|---|---|
| **index.js** | **1 101 KB** | **317 KB** | Critical path (chargé sur toutes les pages) |
| Account.tsx | 545 KB | 107 KB | Route lazy |
| vendor-pdf (pdf-lib) | 430 KB | 178 KB | Vendor chunk |
| Admin.tsx | 427 KB | 90 KB | Route lazy |
| xlsx | 334 KB | 113 KB | Lib lazy ✅ |
| vendor-react | 179 KB | 59 KB | Vendor core |
| vendor-supabase | 176 KB | 46 KB | Vendor core |
| ProService.tsx | 157 KB | 29 KB | Route lazy |
| vendor-ui (Radix) | 133 KB | 42 KB | Vendor UI |
| vendor-motion (framer) | 129 KB | 43 KB | Vendor anim |
| ProductDetail.tsx | 99 KB | 25 KB | Route lazy |
| ProjectCart.tsx | 70 KB | 19 KB | Route lazy |
| ProjectBuilder.tsx | 63 KB | 14 KB | Route lazy |
| Resources.tsx | 53 KB | 10 KB | Route lazy |
| Index.tsx | 44 KB | 11 KB | Route lazy |

### 3.2 Diagnostic

**Bon** :
- ✅ 23+ routes lazy-loadées via `React.lazy` dans `App.tsx`
- ✅ Manual chunks vendor configurés (react / supabase / ui / motion / query / i18n / recharts / pdf)
- ✅ Chaque page = chunk séparé (code splitting route-level OK)
- ✅ `xlsx` lazy-loadé dynamiquement dans `ExcelImportModal.tsx:183`

**Critique** :
- 🔴 **`index.js` = 1.1 MB / 317 KB gzip** : chunk principal chargé immédiatement. Trop lourd. Probablement contient des imports statiques d'utilities + contextes globaux + types Supabase entier.
- 🔴 **`vendor-pdf` (pdf-lib) = 430 KB / 178 KB gzip** : tiré statiquement par `pdfCoverPage.ts` → import statique dans `QuotePdfUploader.tsx:11`. Devrait être dynamic-import partout (seul `quoteDocuments.ts:59` le fait déjà).
- 🟠 **`vendor-motion` (framer-motion) = 129 KB** : utilisé partout, tree-shaking limité. Acceptable mais alternative à étudier (motion one, react-spring) si critique.

### 3.3 Code splitting status

```
src/App.tsx — 23 routes lazy
  ✅ Index, Inspirations, Resources, Auth, Messages, Legal, CGV/CGU/Privacy,
  ✅ Admin, ProjectBuilder, ProductCompare, BecomePartner(/Launch),
  ✅ Account, MoodBoard, SharedBoard, Products, ProductDetail, etc.
  ✅ CookieBanner, ChatbotWidget (lazy widgets)
```

Pattern global solide. **Le bottleneck est `index.js`, pas les routes**.

---

## 4. Images audit

### 4.1 Inventory `public/`

| Type | Count |
|---|---|
| PNG | 5 (favicons + og-image) |
| JPG/JPEG | 0 |
| WebP | 0 |
| AVIF | 0 |
| SVG | 1 (placeholder.svg) |

Pas d'images marketing baked dans le bundle. ✅

### 4.2 Images produits

Toutes les images produits viennent de **Supabase Storage** via les colonnes :
- `products.image_url`
- `products.gallery_urls`
- `partner.logo_url`
- `users.avatar_url`

### 4.3 Lazy loading natif

- **76 tags `<img>` dans `src/`**
- **10 avec `loading="lazy"`** = **13 %**
- **0 avec `srcSet`** (aucune image responsive)

→ 87 % des images chargent eagerly (impact LCP + bandwidth mobile).

### 4.4 Supabase Storage transformations

Aucun usage de transformations URL natives Supabase (`?width=400&format=webp`). Toutes les images sont servies à leur taille originale uploadée par le partenaire.

**Impact** : un partenaire uploadant une photo produit 4 MB (1920×1920) sert cette taille au client iPhone qui n'a besoin que de 400×400 = **10× de données inutiles** par image, sur des bandes passantes 4G/5G coûteuses.

---

## 5. Cartographie par criticité

| # | Issue | Pages impactées | Criticité | Effort fix |
|---|---|---|---|---|
| I1 | `index.js` 1.1 MB chargé immédiatement | Toutes | 🔴 | 2-4 h |
| I2 | `pdf-lib` 430 KB tiré statiquement par `pdfCoverPage` | Toutes (via QuotePdfUploader) | 🔴 | 1 h |
| I3 | 87 % des `<img>` sans `loading="lazy"` | Catalogue, ProductDetail, Index | 🟠 | 30 min |
| I4 | 0 `srcSet` + 0 transformation Supabase image | Toutes | 🟠 | 2-3 h |
| I5 | Pas de Lighthouse CI en place | — | 🟡 | 1-2 h (setup) |
| I6 | `framer-motion` 129 KB chargé partout | Toutes | 🟡 | (audit alternative) |
| I7 | Pas de cache headers documentés | — | 🟡 | (vérifier Vercel config) |

---

## 6. Patterns systémiques identifiés

### Pattern P1 — 🔴 Imports statiques de libs lourdes

`pdf-lib` (430 KB) tiré statiquement par `pdfCoverPage.ts` → l'import statique de `QuotePdfUploader.tsx:11` charge la lib même si l'utilisateur ne génère jamais de PDF.

**Solution** : 
- Splitter `pdfCoverPage.ts` en 2 fichiers : `pdfReference.ts` (types + `generateQuoteReference` sans pdf-lib) et `pdfCover.ts` (avec pdf-lib en dynamic import).
- Ou tout dynamic-importer `pdf-lib` dans `pdfCoverPage.ts`.

### Pattern P2 — 🟠 Lazy loading images non systématique

10/76 images en lazy. Le bon pattern existe (`<img loading="lazy" />`) mais pas appliqué uniformément. Pattern à standardiser via composant `<LazyImage>` partagé ou ESLint rule.

### Pattern P3 — 🟠 Pas de srcSet ni transformations Supabase

Le client iPhone reçoit la même image qu'un écran 4K alors que Supabase Storage supporte nativement les transformations (`?width=X&height=Y&resize=cover&format=webp`).

**Solution** : helper `getOptimizedImageUrl(url, { width, format: 'webp' })` qui ajoute les query params Supabase. Tous les `<img>` produits passent par ce helper.

### Pattern P4 — 🟡 `index.js` 1.1 MB

Probables causes (à investiguer en Lot 3) :
- Types Supabase générés (5944 lignes, ~190 KB de code TS) — devraient être tree-shaken.
- Helpers partagés (`@/lib/*`) importés tous en haut.
- Composants `Header`/`Footer` qui importent eux-mêmes beaucoup.
- Contexts globaux (Auth, Cart, Compare, Favourites).
- i18n init + locale FR chargée d'office.

**Solution** : analyse via `rollup-plugin-visualizer` ou `vite-bundle-visualizer` pour cartographier précisément.

---

## 7. Top 5 fixes critiques

### Fix #1 — pdf-lib lazy (I2)

```ts
// AVANT pdfCoverPage.ts
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export async function addCoverPageToPdf(...) {
  const pdf = await PDFDocument.load(...);
  // ...
}

// APRÈS pdfCoverPage.ts
export async function addCoverPageToPdf(...) {
  const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
  // ...
}
```

`generateQuoteReference` (utility sans pdf-lib) reste import-static — extraire dans fichier séparé si nécessaire.

**Gain** : -430 KB / -178 KB gzip retirés du critical path.

### Fix #2 — `loading="lazy"` systématique (I3)

Patch global sed sur tous les `<img>` qui n'ont pas déjà `loading=`.

**Gain** : LCP mobile amélioré significativement sur pages avec multiples images (Catalogue, ProductDetail).

### Fix #3 — Helper Supabase image transform (I4)

```ts
// src/lib/imageUrl.ts (nouveau)
export function getOptimizedImageUrl(
  url: string | null | undefined,
  opts: { width?: number; quality?: number; format?: 'webp' | 'png' } = {}
): string {
  if (!url) return '/placeholder.svg';
  const params = new URLSearchParams();
  if (opts.width) params.set('width', String(opts.width));
  if (opts.quality) params.set('quality', String(opts.quality));
  if (opts.format) params.set('format', opts.format);
  const sep = url.includes('?') ? '&' : '?';
  return params.toString() ? `${url}${sep}${params}` : url;
}
```

Utiliser dans tous les `<img>` produits : `<img src={getOptimizedImageUrl(product.image_url, { width: 400, format: 'webp' })} />`

**Gain** : -50 à -90 % de payload images sur mobile.

### Fix #4 — Audit index.js avec visualizer (I1 investigation)

```bash
bun add -D rollup-plugin-visualizer
```

Ajouter au `vite.config.ts` :
```ts
import { visualizer } from "rollup-plugin-visualizer";
plugins: [react(), visualizer({ open: true })]
```

Run `bun run build` puis examiner le treemap interactif pour identifier les vrais responsables.

**Gain** : visibilité précise pour Lot 3.

### Fix #5 — Lighthouse CI setup (I5)

Ajouter un script `bun run audit:lighthouse` qui lance Lighthouse en CI ou local. Configurer `.lighthouserc.json` avec budgets pour homepage / catalogue / product detail.

**Gain** : détection automatique des régressions perf.

---

## 8. Plan correctif découpé en lots

### Lot 1 — CRITIQUE (~1 h) → Dette 96

- **Fix #1** : Lazy `pdf-lib` (gain immédiat -430 KB du critical path)
- **Fix #2** : `loading="lazy"` systématique sur les 66 `<img>` restants
- **Smoke** : rebuild + check chunk sizes
- Effort : 30-60 min

### Lot 2 — ÉLEVÉ (~2-3 h) → Dette 97

- **Fix #3** : Helper `getOptimizedImageUrl` + intégration sur cartes produits + ProductDetail
- Standardiser le pattern par un composant `<ProductImage>` qui wraps `<img>` avec width/format automatique
- Possible tests visuels pour valider les transformations Supabase Storage
- Effort : 2-3 h

> **🚨 Status Lot 2 — DÉSACTIVÉ TEMPORAIREMENT (2026-05-15)**
>
> Cause : Supabase Free tier ne supporte pas Render Image API comme attendu. Smoke test live a révélé que les images ProductDetail (BAHIA 001, COSTA RICA 004, BAHAMAS 001) étaient **coupées sur les côtés** en Free tier (pieds de chaises tronqués).
>
> Le helper `src/utils/imageOptimization.ts` est passé en **no-op explicite** : `getOptimizedImageUrl(url) → url` et `getResponsiveSrcSet() → ''`. Le code original est préservé en commentaire en bas du fichier pour roll-forward sans archéologie git.
>
> **Impact** : ROI -95% payload perdu temporairement. Visuel correct. Activation Supabase Pro (Dette 99 escaladée P0) restaurera automatiquement le bénéfice.

### Lot 3 — MOYEN (~3-5 h) → Dette 98

- **Fix #4** : Setup `rollup-plugin-visualizer` → identifier les responsables d'`index.js` 1.1 MB
- Selon résultats : split contexts, helpers, types, ou imports massifs
- **Fix #5** : Setup Lighthouse CI + budgets perf
- Audit alternatives `framer-motion` si critique
- Effort : 3-5 h

### Total estimé : ~6-9 h sur 3 sessions

---

## 9. Captures dettes liées

### Dette 96 — Mobile Perf Lot 1 (Critique)
**Statut** : à fixer ASAP
**Priorité** : Haute (gain critical path immédiat)
**Effort** : ~1 h

### Dette 97 — Mobile Perf Lot 2 (Élevé)
**Statut** : à fixer après Lot 1
**Priorité** : Moyenne
**Effort** : ~2-3 h

### Dette 98 — Mobile Perf Lot 3 (Moyen)
**Statut** : à fixer après Lots 1+2 stabilisés
**Priorité** : Basse
**Effort** : ~3-5 h

---

## 10. Risques et mitigations

### R1 — pdf-lib lazy fix peut casser génération PDF
**Mitigation** : tester signature quote + génération PDF avant commit. Le `await import()` ne change pas la signature publique de `addCoverPageToPdf`, juste l'ordre de chargement.

### R2 — `loading="lazy"` peut affecter LCP si appliqué à l'image au-dessus du fold
**Mitigation** : la première image hero ne reçoit PAS `loading="lazy"`, le pattern s'applique uniquement aux images en dessous du fold (ProductCard liste, gallery secondaire, etc.).

### R3 — Supabase image transformations payantes au-delà d'un quota
**Mitigation** : vérifier le pricing Supabase Storage Image Transformations (gratuit en dessous d'un seuil, ~10 $ par 1000 transformations au-delà). Possibilité de cacher les URLs transformées dans la CDN edge.

### R4 — index.js bloating peut nécessiter refactor structurel
**Mitigation** : Lot 3 commence par audit visualizer pour mesurer avant d'agir. Si refactor lourd identifié (>1j de travail), capturer en dette séparée hors Lot 3.

---

## 11. Cumul ROI estimé

| Lot | Gain critical path | Gain images | LCP estimé |
|---|---|---|---|
| Lot 1 | -430 KB pdf-lib | + lazy 66 img | -1.5 à -2 s sur 4G |
| Lot 2 | — | -50 à -90 % payload | -0.5 à -1.5 s sur 4G |
| Lot 3 | -? selon visualizer | — | -0.5 à -1 s |
| **Cumul** | **~-500 KB à -800 KB** | **-60 % à -80 %** | **-2.5 à -4.5 s** |

Estimation conservatrice pour un device mobile 4G moyen (5-10 Mbps).

---

## ⚠️ Note importante — Supabase Pro requis pour le ROI Lot 2

Le **Lot 2** (helper `getOptimizedImageUrl`, commit `f877947`) nécessite **Supabase Pro tier (~25 $/mois)** pour bénéficier des optimisations Render Image API. La capture est suivie via **Dette 99** dans `DETTE_TECHNIQUE_AUDIT.md`.

### Mode actuel (14 mai 2026) — Supabase Free tier

- Helper en place dans le code (`src/utils/imageOptimization.ts`)
- Endpoint `/storage/v1/render/image/` retourne l'image originale (Free ne le gère pas)
- **Aucun ROI immédiat mais aucune régression** : helper en no-op gracieux
- Tests 640/640 OK
- Helper se comporte aussi en no-op pour toutes URLs non-Supabase (CDN externes, placeholders)

### Mode futur — Supabase Pro tier

- **Activation simple** : upgrade dans Dashboard
- **Aucun changement de code nécessaire** — l'optimisation s'active automatiquement
- ROI immédiat : -95 % à -99 % du payload images
- LCP mobile : -1 à -2 s additionnels

### Triggers d'activation prévus

1. Trafic confirmé > 50 visiteurs uniques /jour
2. Transactions Vague 2 démarrées (commissions justifient le coût)
3. Besoin d'autres features Pro : daily backups (résilience production marketplace EU), support prioritaire

### Référence détaillée
→ **Dette 99** dans `DETTE_TECHNIQUE_AUDIT.md` pour le plan d'activation en 5 étapes.

---

## 12. Historique

| Date | Auteur | Modification |
|---|---|---|
| 14 mai 2026 | Adrien Laniez + Claude | Audit initial — 3 lots cartographiés |
| 14 mai 2026 | Adrien Laniez + Claude | Lot 1 livré (pdf-lib lazy + img lazy) — Dette 96 ✅ |
| 14 mai 2026 | Adrien Laniez + Claude | Lot 2 livré (getOptimizedImageUrl helper) — Dette 97 ✅ |
| 14 mai 2026 | Adrien Laniez + Claude | Capture Dette 99 — Supabase Pro activation pending pour ROI Lot 2 |
