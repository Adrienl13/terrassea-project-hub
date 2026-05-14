# Audit Mobile UX — Pages critiques

> **Date** : 14 mai 2026
> **Origine** : Founder a constaté lacunes critiques mobile, démarchage Salone en cours
> **Statut** : Audit pur livré, plan correctif en 3 lots
> **Auteur** : Adrien Laniez + Claude

---

## 1. Contexte

3-5 marques Salone del Mobile en démarchage actif. Première consultation Terrassea = mobile (réflexe 2026 ~70 % du trafic web). UX mobile dégradée = première impression négative = friction acquisition direct.

Founder a testé sur son téléphone et constaté des "lacunes plutôt critiques qui dégradent l'expérience client et ne donnent pas envie d'approfondir". Cet audit objectivise et hiérarchise.

---

## 2. Méthodologie

- Audit code statique Tailwind responsive sur 5 fichiers clés (3052 lignes au total)
- Inspection patterns récurrents (largeurs fixes, breakpoints, tap targets, font-size inputs, h-screen)
- Quirks iOS Safari + Android Chrome vérifiés
- Lighthouse non lancé (pas dispo localement) — capture en Dette si pertinent post-fix

### Pages auditées

| Page | Route | Fichier | Lignes |
|---|---|---|---|
| Homepage | `/` | `src/pages/Index.tsx` | 583 |
| Become-partner (full) | `/become-partner` | `src/pages/BecomePartner.tsx` | 783 |
| Become-partner (launch variant) | idem si flag launch | `src/pages/BecomePartnerLaunch.tsx` | 349 |
| Fiche produit | `/products/:id` | `src/pages/ProductDetail.tsx` | 808 |
| Header partagé | toutes pages | `src/components/Header.tsx` | 529 |

### Vérifications transverses

- ✅ Viewport meta présent et correct (`width=device-width, initial-scale=1.0`)
- ✅ Aucun `user-scalable=no` (accessibilité préservée)
- ✅ Aucun `h-screen` strict — tous les `min-h-screen` (safe iOS)
- ⚠️ `text-sm` (14 px) appliqué aux inputs formulaires → iOS Safari zoom auto

---

## 3. Cartographie par criticité

### 🔴 Critique (impact direct UX et conversion)

| # | Page | Composant | Problème | Effort |
|---|---|---|---|---|
| C1 | BecomePartner | `inputClass` ligne 305 | `text-sm` (14px) sur tous les inputs/selects → **iOS Safari zoome automatiquement** dès qu'on tape dans un champ. Cassure majeure du flow d'inscription partenaire. | 5 min |
| C2 | BecomePartnerLaunch | inputs locaux | Probable même bug (même pattern) à vérifier | 5 min |
| C3 | Header.tsx | bouton close mobile drawer ligne 399 | `p-1` = ~20×20px effectif → **bien en dessous des 44×44 WCAG**. Geste imprécis sur mobile. | 5 min |

### 🟠 Élevé (impact UX significatif)

| # | Page | Composant | Problème | Effort |
|---|---|---|---|---|
| E1 | Index.tsx | quick action buttons L213-230 | `px-4 py-2` → hauteur effective ~32 px, sous WCAG 44 px | 10 min |
| E2 | Index.tsx | "View all products" CTA L442 | `px-5 py-2.5` → ~40 px, marginal | 5 min |
| E3 | Index.tsx | grid-cols-2 L378 (How It Works) | Sur écran < 380 px, 2 colonnes serrées pour blocs texte | 5 min |
| E4 | BecomePartner | Formulaire complet (10+ champs) | `py-2.5` sur inputs = ~36 px, marginal hors WCAG | 10 min |

### 🟡 Moyen (confort)

| # | Page | Composant | Problème | Effort |
|---|---|---|---|---|
| M1 | Toutes | sections `py-24 px-6` (Index L326,360,404,453 + autres) | 96 px verticaux fixes desktop appliqués mobile → information moins dense, scroll allongé inutile | 15 min global |
| M2 | Index.tsx | hero decorations `w-[500px]` `w-[600px]` L158-163 | éléments visuels purs ambient — peuvent créer scrollbar horizontale subtile sur certains devices, opacity ≤ 30% | 5 min |
| M3 | ProductDetail.tsx | breadcrumb `pt-24` L348 | Marge top excessive mobile avant breadcrumb | 5 min |
| M4 | ProductDetail.tsx | tech specs `grid-cols-2 text-xs` L563 | Densité élevée mais lisible | acceptable |

### 🟢 Faible / acceptable

- Headlines responsive (`text-4xl md:text-6xl lg:text-7xl`) ✓
- Grids `grid md:grid-cols-2` (ProductDetail L365) ✓
- Mobile drawer overlay onClick close (L382) ✓

---

## 4. Patterns systémiques identifiés

### Pattern P1 — 🔴 iOS Safari input zoom auto

**Symptôme** : sur iOS Safari, tout `<input>`, `<textarea>` ou `<select>` avec `font-size < 16 px` déclenche un zoom automatique du viewport quand l'utilisateur tape dedans. L'utilisateur doit ensuite pincer pour dézoomer manuellement.

**Diagnostic** : `inputClass` de BecomePartner.tsx ligne 305 utilise `text-sm` (14 px). Tous les 10+ champs du formulaire d'inscription partenaire sont affectés.

**Fix global** : passer `text-sm` → `text-base` dans `inputClass`. **Une seule ligne** corrige tous les champs du formulaire. À vérifier également dans BecomePartnerLaunch + autres formulaires.

**Effort** : 5-10 min.

### Pattern P2 — 🟠 Tap targets sub-WCAG

**Symptôme** : Apple HIG + WCAG 2.1 AAA recommandent **minimum 44×44 px** pour tout élément tactile. Plusieurs boutons sont en dessous : header close (~20 px), quick action buttons home (~32 px), CTAs marginaux (~40 px).

**Fix pattern** : `min-h-[44px]` sur les boutons / ajustement des paddings (`py-2` → `py-3` ou `py-2.5` → `py-3`).

**Effort** : 15-20 min cumulés.

### Pattern P3 — 🟡 Padding vertical desktop appliqué mobile

**Symptôme** : `py-24` (96 px) en haut/bas de plusieurs sections. Sur mobile, ça allonge inutilement le scroll et réduit la densité d'information. Convention `py-16 md:py-24` (64 px mobile, 96 px desktop) plus ergonomique.

**Fix pattern** : `py-24` → `py-16 md:py-24` sur les sections de page.

**Effort** : 15 min global (find/replace sur Index + autres).

### Pattern P4 — 🟡 Backgrounds décoratifs hors-viewport

**Symptôme** : `w-[500px]` et `w-[600px]` sur un device 375 px débordent — éléments décoratifs ambient avec position absolute et opacity faible. Pas de scrollbar horizontal observé dans le code (parent `overflow-hidden` présent ligne 153) mais à confirmer sur device réel.

**Fix défensif** : `overflow-x: hidden` sur body OU réduire les tailles via breakpoint `sm:w-[500px] w-[280px]`.

**Effort** : 5 min.

### Pattern P5 — 🟢 Non-issues confirmés

- Aucun `h-screen` strict (tous `min-h-screen` → safe iOS Safari).
- Viewport meta correct.
- Aucun input avec `font-size: 1[0-5]px` inline-style (toutes les small-fonts sont sur du texte UI, pas des inputs).

---

## 5. Top 5 fixes critiques

### Fix #1 — iOS input zoom (C1+C2, ⚡ ROI maximum)

```tsx
// BecomePartner.tsx:305 — AVANT
const inputClass =
  "w-full text-sm font-body bg-card border border-border rounded-full px-4 py-2.5 focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/50";

// APRÈS
const inputClass =
  "w-full text-base font-body bg-card border border-border rounded-full px-4 py-2.5 focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/50";
```

1 caractère changé (`text-sm` → `text-base`), 10+ champs du formulaire fixés.

### Fix #2 — Header mobile close button (C3)

```tsx
// Header.tsx:399 — AVANT
<button onClick={closeMobile} className="p-1 text-muted-foreground">

// APRÈS
<button onClick={closeMobile} className="p-3 -m-3 text-muted-foreground" aria-label="Close menu">
```

`p-3` = 48 px tap target, `-m-3` annule la place visuelle excédentaire.

### Fix #3 — Quick action buttons Index (E1)

```tsx
// Index.tsx:213-230 — AVANT
className="flex items-center gap-1.5 text-xs font-body text-muted-foreground border border-border rounded-full px-4 py-2 ..."

// APRÈS
className="flex items-center gap-1.5 text-xs font-body text-muted-foreground border border-border rounded-full px-4 py-3 min-h-[44px] ..."
```

3 boutons identiques → un seul refactor mental.

### Fix #4 — Padding sections (M1)

Find/replace global `py-24 px-6` → `py-16 px-6 md:py-24` sur les sections de Index.tsx.

### Fix #5 — Defense overflow-x

```tsx
// index.html ou globals.css — APRÈS
body { overflow-x: hidden; }
```

Filet de sécurité contre les éléments décoratifs `w-[500+px]`.

---

## 6. Plan correctif découpé en lots

### Lot 1 — CRITIQUE ✅ FIXED 2026-05-14
**Bénéfice : 80 % du ressenti UX mobile**

- Fix #1 (iOS input zoom) : appliqué à **13 fichiers** via sed global sur le pattern unique `text-sm font-body bg-` → `text-base font-body bg-`. Tous les formulaires (Auth, BecomePartner, Quote/Brief/Financing modals, ProService trio, Admin) n'auront plus le zoom iOS auto.
- Fix #2 (Header close button) : `p-1` → `p-3 -m-3 min-h-[44px] min-w-[44px]` + aria-label.
- Fix #3 (Hero quick actions) : `py-2` → `py-3 min-h-[44px]`.
- Fix #4 (Sections padding) : `py-24` → `py-16 md:py-24` sur Index.tsx (3 sections).
- Fix #5 (Overflow guard) : `body { overflow-x: hidden }` dans index.css.

**Capture** : Dette 88 fermée.

### Lot 2 — ÉLEVÉ ✅ FIXED 2026-05-14
**Bénéfice : confort tap + densité info**

- Inputs/selects/textareas : sed ciblé `py-2.5`/`py-2` → `py-3` sur lignes `text-base font-body bg-` (~18 fichiers). Combiné avec Lot 1, hauteur ~44 px WCAG.
- Index.tsx : "View all products" CTA mobile + "Get started" CTA → `py-3 min-h-[44px]`.
- BecomePartner.tsx : bouton plan card → `py-3 min-h-[44px]`.
- Auth.tsx : tabs login/register → `py-3 min-h-[44px]`.
- Collections.tsx : section `py-24` → `py-16 md:py-24`.

**Capture** : Dette 89 fermée.

### Lot 3 — MOYEN ✅ FIXED 2026-05-14
**Bénéfice : polish**

- Index.tsx:378 + ProductDetail.tsx:563 grids `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`.
- ProductDetail.tsx breadcrumb : `flex-wrap` + `aria-label` + `flex-shrink-0`/`break-words` (élimine overflow horizontal sur nom produit long).
- ProductDetail.tsx main `pt-24` → `pt-20 md:pt-24`.
- Hero decorations Index : aucune action — déjà neutralisées par `overflow-x: hidden body` (Lot 1).

**Capture** : Dette 90 fermée.

---

**🎯 Audit Mobile UX complet — CLOSED**

| Lot | Statut | Effort réel | Fichiers |
|---|---|---|---|
| Lot 1 (Critique) | ✅ FIXED | 25 min | 18 |
| Lot 2 (Élevé) | ✅ FIXED | 15 min | 21 |
| Lot 3 (Moyen) | ✅ FIXED | 10 min | 2 |
| **Total** | **3/3** | **~50 min** | **~30 uniques** |

### Lot 4 (optionnel) — Convention ADR

Si patterns récurrents observés sur d'autres pages lors des fixes, formaliser convention CSS responsive Tailwind dans `docs/strategy/ADR_RESPONSIVE_CONVENTIONS.md`. Effort ~1h.

---

## 7. Pattern correctif standardisé

### Anti-patterns à proscrire

```tsx
// ❌ Input qui zoom auto iOS
<input className="text-sm" />

// ❌ Tap target sous WCAG
<button className="p-1">  // 8-16px
<button className="px-3 py-1">  // ~28px

// ❌ Padding vertical fixe desktop
<section className="py-24">

// ❌ Grid serré sur petit phone
<div className="grid grid-cols-2">

// ❌ h-screen strict (iOS Safari header dynamique)
<section className="h-screen">
```

### Patterns corrects

```tsx
// ✅ Input safe iOS (font-size ≥ 16px)
<input className="text-base" />

// ✅ Tap target WCAG 44px
<button className="min-h-[44px] px-4 py-3">
<button className="p-3 -m-3">  // pour icon-only

// ✅ Padding responsive
<section className="py-16 md:py-24 px-6">

// ✅ Grid responsive
<div className="grid grid-cols-1 sm:grid-cols-2">

// ✅ min-h-screen (safe iOS) ou min-h-[100dvh]
<section className="min-h-screen">
```

---

## 8. Effort total estimé

| Lot | Durée | Recommandation timing |
|---|---|---|
| Lot 1 (Critique) | ~30 min | **ASAP** — avant prochaine démo marque |
| Lot 2 (Élevé) | ~45-60 min | Cette semaine |
| Lot 3 (Moyen) | ~30 min | Semaine prochaine |
| Lot 4 (ADR optionnel) | ~1h | Si nécessaire post-fixes |

**Total** : ~2h30-3h hors ADR optionnel, sur 2-3 sessions.

---

## 9. Captures dettes liées

- **Dette 88** — Mobile UX Lot 1 (Critique : iOS input zoom + tap target Header)
- **Dette 89** — Mobile UX Lot 2 (Élevé : tap targets + padding sections)
- **Dette 90** — Mobile UX Lot 3 (Moyen : grids + breadcrumb + decorations)

---

## 10. Recommandation founder

🔥 **Lot 1 ASAP** — 30 min de fix pour ~80 % du ressenti UX mobile fixé. À faire avant la prochaine consultation marque post-Salone. Le fix iOS input zoom seul élimine le show-stopper du formulaire d'inscription partenaire (très probablement le déclencheur du ressenti founder).

📊 **Lot 2 cette semaine** — confort tap targets + densité info.

🌊 **Lot 3 semaine prochaine** — polish.

L'audit confirme que les "lacunes critiques" sont **réelles mais concentrées** : 3 issues niveau critique, toutes fixables en 30 min total. Pas besoin de refactor structurel.

---

## 11. Historique

| Date | Auteur | Modification |
|---|---|---|
| 14 mai 2026 | Adrien Laniez + Claude | Audit initial — 3 lots cartographiés |
