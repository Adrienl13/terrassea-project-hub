# Admin Panel Design Language — 2026-05-06

> Référence visuelle pour le panel admin Terrassea Hub. Formalise l'existant, comble les manques, établit la discipline.

## 1. Inspiration & ton

| Source | Dose | Ce qu'on emprunte |
|---|---|---|
| **Linear** | 60 % | Densité d'information, sidebar dark fixe, keyboard-first, badges count discrets, hiérarchie typo stable |
| **Stripe** | 30 % | Tables épurées (no zebra, hover discret), forms calmes (label small caps + input net), spacing généreux mais pas spacieux |
| **Vercel** | 10 % | Typography premium (Manrope + Inter déjà en place), accents minimaux, monospace pour identifiants techniques |

**Principe directeur** : *quiet B2B*. Le panel admin n'est pas un dashboard marketing — il est consulté tous les jours par 1 personne (le founder) qui doit aller vite. Densité > whitespace excessif. Lisibilité > effets.

---

## 2. Tokens (existants — formalisés)

### 2.1 Couleurs (CSS variables, `src/index.css`)

| Token | HSL | Usage admin |
|---|---|---|
| `--background` | `0 0% 100%` | Page background main |
| `--foreground` | `0 0% 10%` | Texte principal (near-black) |
| `--card` / `--muted` | `0 0% 97%` | Surfaces secondaires (cards, hover bg) |
| `--border` | `0 0% 92%` | Toutes bordures normales |
| `--secondary` / `--accent` / `--warm` | `30 18% 87%` | Beige chaud (brand identity, hover items) |
| `--terracotta` | `16 62% 53%` | **Couleur signature** — accents (badges count, active states, CTA secondaire) |
| `--destructive` | `0 84% 60%` | Erreurs, delete |
| `--muted-foreground` | `0 0% 45%` | Texte secondaire, micro-copy |

**Sidebar (overrides dédiés)** :
- Background fixe `#1A1A1A` (dark constant, ne suit pas le mode)
- Item active : bordure gauche `border-l-[3px] border-[#D4603A]` + bg `bg-white/10`
- Item inactif : `text-white/50`, hover `text-white/80 bg-white/5`

### 2.2 Status colors (à centraliser — voir §4.5)

| Status | bg | border | text |
|---|---|---|---|
| success | `bg-green-50` | `border-green-200` | `text-green-700` |
| warning | `bg-amber-50` | `border-amber-200` | `text-amber-700` |
| error | `bg-red-50` | `border-red-200` | `text-red-700` |
| info | `bg-blue-50` | `border-blue-200` | `text-blue-700` |
| neutral | `bg-muted` | `border-border` | `text-muted-foreground` |
| accent | `bg-orange-50` | `border-orange-200` | `text-orange-700` |

### 2.3 Typography (Manrope display + Inter body, déjà chargés)

| Niveau | Classes Tailwind | Usage |
|---|---|---|
| **h1 page** | `font-display text-xl font-bold tracking-tight text-foreground` | Titre de page (top header). Densité : `text-xl` (pas `text-2xl` style marketing). |
| **h2 section** | `font-display text-base font-bold text-foreground` | Section principale dans une page. |
| **h3 subsection** | `font-display text-sm font-bold text-foreground` | Sous-section dans card. |
| **eyebrow** | `font-display text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground` | Labels au-dessus de groupes (« CATÉGORIE », « STATUT »). |
| **body** | `font-body text-sm text-foreground` | Texte standard. |
| **body-small** | `font-body text-xs text-muted-foreground` | Métadonnées, légendes. |
| **micro** | `font-body text-[10px] text-muted-foreground` | Timestamps, identifiants techniques. |
| **mono** | `font-mono text-xs` | UUIDs, codes, slugs. |

### 2.4 Spacing (Tailwind par défaut, conventions admin)

| Échelle | Usage |
|---|---|
| `gap-1.5` (6px) | Icon + label inline |
| `gap-2` (8px) | Items inline pile |
| `gap-3` (12px) | Items dans un row |
| `space-y-2` | Items denses dans liste |
| `space-y-4` | Items normaux dans card |
| `space-y-5` | Sections dans card |
| `space-y-6` | Sections principales dans page |
| `p-3` (12px) | Padding cards denses |
| `p-4` (16px) | Padding cards moyens |
| `p-5` (20px) | Padding cards principaux **(défaut admin)** |
| `p-6` (24px) | Padding pages (`<main>` content area) |

### 2.5 Border radius

| Token | Usage |
|---|---|
| `rounded` (4px) | Boutons compacts, badges carrés |
| `rounded-md` (6px) | Inputs, boutons normaux, cards denses |
| `rounded-lg` (8px) | Drawer items, hover blocks |
| `rounded-xl` (12px) | **Cards principaux admin (défaut)** |
| `rounded-2xl` (16px) | Modals, drawers |
| `rounded-full` | Status pills, badges count, avatars |

### 2.6 Elevation (shadows)

Le panel admin utilise **très peu d'ombres** (style Linear, plat). Les surfaces se distinguent par bordure + bg.

| Token | Usage |
|---|---|
| pas d'ombre | Cards, sections (bordure suffit) |
| `shadow-sm` | Hover discret sur boutons d'action |
| `shadow-md` | Drawer ouvert (Sheet shadcn par défaut) |
| `shadow-2xl` | Modals (Dialog shadcn) |

---

## 3. Patterns

### 3.1 Page header standard

```tsx
{/* Top header sticky (déjà en place dans Admin.tsx) */}
<header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-3 flex items-center gap-4">
  <div className="flex-1">
    <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
      {pageTitle}
    </h1>
    <p className="font-body text-xs text-muted-foreground mt-0.5">
      {subtitle}
    </p>
  </div>
  {/* Actions inline (right) */}
  <div className="flex items-center gap-2">
    {actions}
  </div>
</header>

{/* Content area */}
<div className="p-6 max-w-6xl">
  {children}
</div>
```

### 3.2 Card / section pattern (le défaut admin)

```tsx
<div className="border border-border rounded-xl p-5 space-y-4 bg-background">
  <h3 className="font-display text-sm font-bold text-foreground">
    {sectionTitle}
  </h3>
  <p className="font-body text-xs text-muted-foreground">
    {optionalDescription}
  </p>
  {/* Form fields, content */}
</div>
```

### 3.3 Form pattern (shadcn-first OBLIGATOIRE)

```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

<div className="space-y-4">
  <div className="space-y-1.5">
    <Label htmlFor="name" className="font-display text-xs font-semibold">
      Nom du produit *
    </Label>
    <Input
      id="name"
      value={form.name}
      onChange={(e) => setForm({ ...form, name: e.target.value })}
      className="font-body"
    />
  </div>

  <div className="space-y-1.5">
    <Label className="font-display text-xs font-semibold">Catégorie</Label>
    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
      <SelectTrigger className="font-body">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>
</div>
```

**❌ INTERDIT — pattern HTML natif à supprimer progressivement** :
```tsx
// NE PLUS FAIRE :
const inputClass = "w-full text-sm font-body bg-background border border-border rounded-full px-4 py-2.5 ...";
<input type="text" value={form.name} onChange={...} className={inputClass} />
```

### 3.4 Drawer d'édition (Sheet) — pattern de référence

Modèle : `src/components/admin/referentials/ReferentialCRUD.tsx`. Déjà en place, à propager.

```tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

<Sheet open={open} onOpenChange={setOpen}>
  <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
    <SheetHeader>
      <SheetTitle className="font-display">{mode === "create" ? "Nouveau" : "Modifier"}</SheetTitle>
      <SheetDescription className="font-body text-xs">
        {description}
      </SheetDescription>
    </SheetHeader>

    <div className="py-6 space-y-5">
      {/* Form sections */}
    </div>

    <SheetFooter className="border-t border-border pt-4">
      <Button variant="outline" onClick={onCancel}>Annuler</Button>
      <Button onClick={onSubmit} disabled={saving}>
        {saving ? "Sauvegarde…" : "Enregistrer"}
      </Button>
    </SheetFooter>
  </SheetContent>
</Sheet>
```

### 3.5 Status badge (helper centralisé — à créer)

**Lib à créer** : `src/lib/statusConfig.ts` (Phase 1.3 facultatif si touché par les quick wins, sinon Session 2).

```tsx
// src/lib/statusConfig.ts
export type StatusVariant = "success" | "warning" | "error" | "info" | "neutral" | "accent";

export const STATUS_CLASSES: Record<StatusVariant, string> = {
  success: "bg-green-50 border-green-200 text-green-700",
  warning: "bg-amber-50 border-amber-200 text-amber-700",
  error:   "bg-red-50 border-red-200 text-red-700",
  info:    "bg-blue-50 border-blue-200 text-blue-700",
  neutral: "bg-muted border-border text-muted-foreground",
  accent:  "bg-orange-50 border-orange-200 text-orange-700",
};

export function statusBadgeClass(variant: StatusVariant) {
  return `inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-display font-semibold ${STATUS_CLASSES[variant]}`;
}
```

Usage :
```tsx
<span className={statusBadgeClass("success")}>
  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
  Approuvé
</span>
```

### 3.6 Table pattern (HTML stylé Tailwind, ou shadcn Table)

Pas de `divider-y` zébré. Hover discret. Headers alignés.

```tsx
<div className="border border-border rounded-xl overflow-hidden">
  <table className="w-full">
    <thead className="bg-muted">
      <tr className="border-b border-border">
        <th className="px-4 py-2.5 text-left font-display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Nom
        </th>
        <th className="px-4 py-2.5 text-left font-display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Statut
        </th>
        <th className="w-10" />
      </tr>
    </thead>
    <tbody>
      {rows.map((row) => (
        <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
          <td className="px-4 py-3 font-body text-sm text-foreground">{row.name}</td>
          <td className="px-4 py-3"><span className={statusBadgeClass(row.statusVariant)}>{row.status}</span></td>
          <td className="px-4 py-3"><Button variant="ghost" size="icon"><Pencil className="h-3.5 w-3.5" /></Button></td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

### 3.7 Empty state (pattern à standardiser)

```tsx
<div className="border border-dashed border-border rounded-xl p-12 text-center space-y-3">
  <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center">
    <Icon className="h-5 w-5 text-muted-foreground" />
  </div>
  <div>
    <p className="font-display text-sm font-bold text-foreground">{title}</p>
    <p className="font-body text-xs text-muted-foreground mt-1">{description}</p>
  </div>
  {action && <Button size="sm" onClick={onAction}>{actionLabel}</Button>}
</div>
```

### 3.8 Loading state

**Préférer skeleton à spinner** quand le layout est connu.

```tsx
// Skeleton pour table list
<div className="space-y-2">
  {[1, 2, 3].map((i) => (
    <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />
  ))}
</div>

// Spinner uniquement pour mutation (save, delete)
<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
```

---

## 4. Discipline (règles non-négociables)

### Règle 1 — shadcn-first sur les inputs
Tout nouveau form admin **DOIT** utiliser `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>` de `@/components/ui/`. Plus de `<input className="...">` natifs. Les composants existants en HTML natif sont migrés au passage si touchés (pas de big-bang).

### Règle 2 — Pattern ReferentialCRUD pour CRUD simple
Tout nouveau CRUD admin sur table de référentiel ou data simple **DOIT** réutiliser/imiter le pattern `ReferentialCRUD` (table + Sheet drawer + AlertDialog confirm + FK guard). Si écart nécessaire, justifier explicitement.

### Règle 3 — Pas de STATUS_CONFIG inline
Quand `lib/statusConfig.ts` sera créé (recommandé Session 2 ou immédiatement si touché), tout status/badge **DOIT** passer par `statusBadgeClass()`. Pas de redéfinition locale.

### Règle 4 — Hiérarchie typo stable
Pas de `text-lg` improvisé pour un h1. Suivre §2.3 exactement. h1 admin = `font-display text-xl font-bold tracking-tight`.

### Règle 5 — Cards = `border-border rounded-xl p-5 space-y-4`
Le pattern card admin par défaut. Variations autorisées (rounded-md p-4 pour cards denses, rounded-2xl p-6 pour highlight) mais à justifier.

### Règle 6 — Pas de ProductForm inline dans Admin.tsx
Tout gros formulaire admin sort en `src/components/admin/AdminXxx.tsx` dédié. Admin.tsx redevient un router/layout (cf. Dette 30 ApplicationsTab + Dette 24 ProductForm dans roadmap).

### Règle 7 — Country flag, status colors, formats date : helpers centralisés
- `lib/countryFlag.ts` → factoriser les 4 réimplémentations
- `lib/statusConfig.ts` → centraliser les classes
- `lib/relativeTime.ts` → existe déjà dans `AdminDashboard.tsx`, à extraire

---

## 5. Application

### Phase 1.3 (cette session — quick wins)
- **Dette 26** (catégories CamelCase) : pas de UI à refondre, juste data + dropdown. Appliquer §3.3 pattern Select shadcn si touché.
- **Dette 30** (ApplicationsTab extraction) : extraire dans `admin/AdminApplications.tsx`. Appliquer §3.1 page header + §3.2 cards si modifications faites au passage. Sinon copie quasi-identique du contenu actuel (extraction structurelle).
- **Dette 28** (environment_urls admin) : ajouter UI dans le ProductForm admin existant. Appliquer §3.3 (Textarea shadcn ou TagInput) + §3.2 card section.

**Discipline minimale** : pas de big-bang refactor. Chaque touche apporte le pattern. Le reste sera refait en Sessions 2 & 3.

### Sessions 2 & 3 (futures)
Le document sert de référence pour :
- **Session 2** (Dettes 25, 27, 29) : ajouts certifs admin, VariantsGrid admin, upload Storage admin → application complète des patterns 3.3, 3.4, 3.7.
- **Session 3** (Dette 24) : refonte ProductForm admin → big-bang aligné, possibilité de factoriser un `<ProductEditForm mode="admin"|"partner">` partagé.

---

## 6. Mockup textuel : page admin standard

Voici le squelette d'une page admin idéale après application du design language :

```
┌──────────────┬──────────────────────────────────────────────────┐
│ #1A1A1A      │ sticky header (white/95, blur)                   │
│              │  ▶ h1 "Catalogue produits" (xl bold tracking-t)  │
│ TERRASSEA    │     subtitle small (188 produits • 12 attente)   │
│ [ADMIN]      │                                              [+] │
│              │                                                  │
│ DASHBOARD    │ ──────────────────────────────────────────────── │
│              │                                                  │
│ BUSINESS     │  p-6 max-w-6xl                                  │
│   Devis  3   │                                                  │
│   Cmd    7   │  ┌─────────────────────────────────────────────┐ │
│ • Finance    │  │ filters bar (border-border rounded-xl p-3) │ │
│              │  └─────────────────────────────────────────────┘ │
│ CATALOGUE    │                                                  │
│ • Produits   │  ┌─────────────────────────────────────────────┐ │
│   Partners   │  │ ┌─────┬───────────────┬─────────┬─────────┐ │ │
│   Soumis. 12 │  │ │EYEB.│ EYEBROW HEAD  │ STATUS  │   ...   │ │ │
│ ...          │  │ ├─────┼───────────────┼─────────┼─────────┤ │ │
│              │  │ │ row │ name (sm)     │ ●Active │  [✏][🗑] │ │ │
│ COMM.        │  │ │ row │ ...           │ ⚠Pend.  │         │ │ │
│ SYSTEME      │  │ └─────┴───────────────┴─────────┴─────────┘ │ │
│ INSIGHTS     │  └─────────────────────────────────────────────┘ │
│              │                                                  │
└──────────────┴──────────────────────────────────────────────────┘
                              ↓ click row
                          Sheet drawer (max-w-2xl)
                          ┌──────────────────────┐
                          │ SheetTitle           │
                          │ SheetDescription     │
                          │                      │
                          │ section (rounded-xl  │
                          │   p-5 space-y-4)     │
                          │   <Label/> + <Input/>│
                          │   <Label/> + <Select│
                          │                      │
                          │ section ...          │
                          │                      │
                          │ ───────────────────  │
                          │ [Annuler] [Enreg.]   │
                          └──────────────────────┘
```

**Densité visée** : 30-50 produits visibles sur une scrollable view 1080p sans déborder. Stripe-like.

---

## 7. Convention nommage classes

Pour stabilité long-terme, conventions admin :

- `font-display` toujours sur titres et labels (clairement Manrope)
- `font-body` toujours sur paragraphes et inputs
- Tailles : préférer scale Tailwind standard (`text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`). Évite `text-[11px]` arbitraires sauf eyebrow `text-[10px]` documenté §2.3
- `text-muted-foreground` pour tout ce qui n'est pas critique
- `text-foreground` pour le contenu principal (défaut auto via body, mais à expliciter sur cards)
- Hover : toujours `transition-colors` ou `transition-all` (jamais sans transition)

---

## Synthèse pour le founder

**Ce document N'INTRODUIT QUE 3 NOUVELLES PRIMITIVES** :
1. `lib/statusConfig.ts` (helper status badge classes) — facultatif Phase 1.3, recommandé Session 2.
2. `lib/countryFlag.ts` (factorisation des 4 implémentations existantes) — facultatif, peut être plus tard.
3. Un composant `<EmptyState>` générique (optionnel, peut rester en pattern markdown ci-dessus).

**Le reste = formalisation de l'existant** (pour rendre la discipline traçable).

**Pour les 3 quick wins Phase 1.3** :
- Dette 26 : touche minime du Select catégorie → pattern §3.3.
- Dette 30 : extraction structurelle, peu d'UI changée. Copie quasi-iso, design language en référence.
- Dette 28 : nouveau bloc dans ProductForm. §3.3 (Textarea ou TagInput) + §3.2 card.

Pas de refonte massive en Phase 1.3.

---

**Document de référence vivant** — sera enrichi au fur et à mesure des Sessions 2 & 3 selon les patterns rencontrés.
