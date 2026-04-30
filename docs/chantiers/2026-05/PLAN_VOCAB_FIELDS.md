# PLAN — Chantier vocabulaire 2026 + champs critiques DB (ÉTAPE 1)

**Date :** 2026-04-30
**Périmètre :** 5 catégories prioritaires (Tables, Parasols, Sun Loungers, Sofas/Lounge Seating, Bar Stools)
**Référence stratégique :** `docs/audit/2026-04/STRATEGIC_DECISIONS.md`
**Statut :** ÉTAPE 1 terminée — en attente validation founder pour ÉTAPE 2

---

## 0. Résumé exécutif

| Volet | Volume |
|---|---|
| Migrations à créer | **6** (1 base `products` + 5 par catégorie) |
| Champs DB à ajouter | **27 colonnes** sur `products` (7 + 6 + 5 + 4 + 5) |
| FK uuid à ajouter (B2.2 intégré) | **7** `ON DELETE` adaptés |
| Policies à fixer (B2.3 intégré) | **7** `auth_rls_initplan` sur `products`/`quote_documents`/`product_reviews` |
| Termes vocabulaire 2026 | **~ 25 termes** + 5 fabric brands (Sunbrella, Solaris, Dickson_Orchestra, Dickson_Saphir, Serge_Ferrari) |
| Sous-composants UI à créer | **5 sections** + 1 module dictionnaire fabric |
| Tests Vitest à ajouter | **5 fichiers** (1 par catégorie) + 1 fabric brands |
| Locales à enrichir | **4 langues × ~ 80 clés** = ~ 320 nouvelles clés i18n |
| Estimation totale | **5-7 jours** sur les 5 semaines des chantiers produits |

---

## 1. État des lieux du schéma actuel

### 1.1 Table `products` — 87 colonnes existantes

Champs déjà présents pertinents pour le chantier :

| Champ existant | Type | Default | Remarque pour ce chantier |
|---|---|---|---|
| `seat_height_cm` | **integer NULL** | — | ⚠ **CONFLIT TYPE** — brief Bar Stools demande **float**. Décision tranchée plus bas. |
| `weight_kg` | numeric NULL | — | Réutilisé pour `min_base_weight_kg` Parasols (champ distinct) |
| `is_stackable` | bool NULL | false | Sera **rendu cohérent** avec `nesting_capacity` Sun Loungers |
| `combinable` | bool NULL | false | Distinct de `available_modules` Sofas |
| `dimensions_height_cm` | int NULL | — | Distinct de `table_top_height_cm` Bar Stools (brief) |
| `material_structure`, `material_seat` | text NULL | — | Conservé tel quel |
| `dimension_variants` | jsonb | `'[]'` | Pattern jsonb existant pour comparaison |
| `documents` | jsonb | `'[]'` | Idem |
| `color_variants` | jsonb | `'[]'` | Idem |
| `name_fr/es/it`, `short_description_fr/es/it`, `long_description_fr/es/it`, `maintenance_info_fr/es/it` | text NULL | — | i18n DB déjà solide pour les libellés produit. **Pas besoin d'ajouter de colonnes i18n DB pour les nouveaux champs** (les libellés des champs eux-mêmes sont des i18n keys côté front). |

### 1.2 Catégories actuellement peuplées

| Catégorie | Produits | Inclus dans chantier |
|---|---|---|
| `Chairs` | 34 | NON (hors scope) |
| `Armchairs` | 10 | NON (hors scope) |
| `Tables` | **6** | ✅ |
| `Bar Stools` | **3** | ✅ |
| Parasols | **0** | ✅ (catégorie pré-créée pour futurs imports post-Salone) |
| Sun Loungers | **0** | ✅ (idem) |
| Sofas / Lounge Seating | **0** | ✅ (idem) |

**Implication majeure** : sur 3 des 5 catégories du chantier, **aucun produit existant** → les nouveaux champs seront NULL/default sur 100 % des produits actuels (cohérent par construction). Pas de backfill nécessaire pour ces 3 cat. Pour `Tables` (6 prod) et `Bar Stools` (3 prod), les valeurs par défaut s'appliqueront.

### 1.3 Trigger `auto_derive_product_tags` (BEFORE INSERT/UPDATE)

300+ lignes, dérive automatiquement :
- Normalize `style_tags`, `ambience_tags`, `material_structure`, `material_seat`, `main_color`
- Derive `material_tags` depuis structure + seat
- Derive `secondary_color` depuis material
- Derive `palette_tags` depuis main_color
- Derive `technical_tags` depuis 8 booleans (stackable, uv_resistant, weather_resistant, fire_retardant, lightweight, easy_maintenance, is_chr_heavy_use, is_outdoor)
- Auto-fill `product_type_tags` jsonb : `frame_material`, `seat_type`, `table_type`, `dimension_tag`, `shape`, `height_type`, `top_material`
- Derive `default_seating_capacity` from dimensions

**Comportement face aux nouveaux champs** : le trigger **ignore** les colonnes qu'il ne connaît pas → pas de plantage. Mais il ne dérivera pas non plus les `technical_tags` correspondants (`extendable`, `tippable`, etc.). **Décision** : étendre le trigger en fin de chantier (avant ÉTAPE 6) pour ajouter les dérivations cohérentes ; ne pas le toucher à chaque migration de catégorie pour limiter le risque.

### 1.4 `intentDetector.ts` (1093 lignes)

Dictionnaires multi-langues bien structurés :
- `TERM_TO_CATEGORY_SLUG` (5 langues : EN/FR/IT/ES/DE)
- `TERM_TO_COLOR_SLUG`
- Style/ambience/material/palette term maps (à confirmer la structure exacte)

Le pattern existe pour ajouter `TERM_TO_FABRIC_BRAND_SLUG` et `TERM_TO_TREND_TAG` (vocabulaire 2026 design trends). Ajout **non destructif**.

### 1.5 `AddProductForm.tsx` (1307 lignes, dans `partner-dashboard/`)

⚠ **Le formulaire est dans `partner-dashboard/`, pas dans `admin/`**. Utilisé par les partenaires pour soumettre des produits. L'admin a son propre flow via `AdminProductReview.tsx` (validation/édition des soumissions).

**Décision d'architecture proposée (à valider founder)** :

Le brief disait `src/components/admin/product-specs/`. Mais étant donné que les sub-composants doivent être réutilisables :
1. Côté `AddProductForm` (partner submit)
2. Côté `AdminProductReview` (admin edit)
3. Côté page produit publique (`Products.tsx`, `ProductDetail.tsx`)
4. Côté comparateur (`ProductCompare.tsx`)

**Importer depuis `admin/` un composant utilisé par `partner-dashboard/` et par les pages publiques crée un cross-import bizarre.**

**Proposition** : placer les sub-composants dans `src/components/products/specs/` (au niveau racine de `components/products/` qui existe déjà). Importation cohérente partout.

```
src/components/products/specs/
├── TableSpecsSection.tsx
├── ParasolSpecsSection.tsx
├── SunLoungerSpecsSection.tsx
├── SofaSpecsSection.tsx
└── BarStoolSpecsSection.tsx
```

**À ratifier founder** dans la validation de ce plan. Si tu préfères vraiment `admin/product-specs/`, on peut le faire mais on aura des imports cross-package.

---

## 2. Décisions techniques

### 2.1 Tranchées (par le founder dans ses Q-A)

| Décision | Choix |
|---|---|
| Schéma DB | **Option (a)** colonnes directement sur `products`, nullable, défauts sensés |
| Migration produits existants | **Option (a)** : booleans → `false`, numériques nullable → `NULL`, enums → `'Unknown'`, jsonb arrays → `[]` |
| IntentDetector | **Ajout non destructif**, vocabulaire actuel conservé |
| UI admin | **Option (b)** sub-composants par catégorie |
| B2.2 FK uuid | Intégré à la migration de base (1 migration combinée) |
| B2.3 `auth_rls_initplan` | Intégré à la migration de base |
| B2.10 coverage | NON, hors scope |

### 2.2 À ratifier founder dans la validation du plan

| # | Question | Recommandation |
|---|---|---|
| **D1** | Type de `seat_height_cm` : conserver `integer` ou migrer en `numeric(5,1)` ? | **Migrer en `numeric(5,1)`**. Coût : 1 ALTER COLUMN, aucune perte de data (les 9 produits existants Chairs/Bar Stools ont des integers castables). Bénéfice : précision 0.5 cm pour bar stools (76.5 cm vs 76 cm). |
| **D2** | Sub-composants : `src/components/admin/product-specs/` (brief original) ou `src/components/products/specs/` (recommandation pragmatique) ? | **`src/components/products/specs/`**. Évite cross-imports admin/partner-dashboard. Réutilisable partout. |
| **D3** | Exception jsonb pour `available_modules` (Sofas) ? | **OUI, jsonb** est le bon choix pour une liste variable de modules ('corner', 'central-1seat', etc.) avec ordre potentiellement signifiant. Default `'[]'::jsonb`. |
| **D4** | `table_top_height_cm` (Bar Stools) — sur products ou conditionné par `category='Tables' AND subcategory LIKE '%high%'` ? | **Colonne `table_top_height_cm` sur products, NULL par défaut**. Application-side enforce qu'elle ne soit set que pour high tables (validation zod). Plus simple qu'une CHECK constraint complexe. |
| **D5** | Enum `fabric_certification` Parasols : Postgres `CREATE TYPE` ou simple `text CHECK IN (...)` ? | **`text` avec `CHECK (fabric_certification IN ('Sunbrella', 'Solaris', 'Dickson_Orchestra', 'Dickson_Saphir', 'Serge_Ferrari', 'Other', 'Unknown'))`**. Plus simple à maintenir qu'un enum Postgres (qui ne supporte pas REMOVE VALUE facilement). |
| **D6** | Enum `subdivision` Bar Stools (counter/bar/tall) : idem D5 ? | **Même approche** : text + CHECK. |
| **D7** | Extension trigger `auto_derive_product_tags` : dans la 1re migration combinée ou en migration séparée à la fin ? | **Migration séparée à la fin** (juste avant ÉTAPE 6 CLAUDE.md). Permet de tester chaque catégorie indépendamment sans risque de régression du trigger. |

---

## 3. Spec exhaustive par catégorie

### 3.1 Tables (7 nouveaux champs)

| Colonne SQL | Type | NULL | Default | Validation zod | i18n key (en.json) |
|---|---|---|---|---|---|
| `built_in_umbrella_hole` | boolean | YES | `false` | `z.boolean()` | `products.specs.tables.umbrella_hole` |
| `umbrella_hole_diameter_mm` | integer | YES | `NULL` | `z.number().int().min(20).max(80).nullable()` | `products.specs.tables.umbrella_hole_diameter` |
| `top_thickness_cm` | numeric(4,1) | YES | `NULL` | `z.number().min(0.5).max(15).nullable()` | `products.specs.tables.top_thickness` |
| `is_tippable` | boolean | YES | `false` | `z.boolean()` | `products.specs.tables.tippable` |
| `extension_capability` | boolean | YES | `false` | `z.boolean()` | `products.specs.tables.extension` |
| `extension_max_length_cm` | integer | YES | `NULL` | `z.number().int().min(80).max(400).nullable()` | `products.specs.tables.extension_max` |
| `outdoor_anchor_compatible` | boolean | YES | `false` | `z.boolean()` | `products.specs.tables.anchor` |

**Validation conditionnelle zod** :
- `umbrella_hole_diameter_mm` requis si `built_in_umbrella_hole === true` (sinon NULL)
- `extension_max_length_cm` requis si `extension_capability === true` (sinon NULL)

**Trigger extension** : ajouter dérivation `technical_tags`
- `extension_capability=true` → tag `'extendable'`
- `is_tippable=true` → tag `'tippable'`
- `built_in_umbrella_hole=true` → tag `'umbrella-ready'`
- `outdoor_anchor_compatible=true` → tag `'anchor-compat'`

**Sub-composant** : `src/components/products/specs/TableSpecsSection.tsx` (~ 150 lignes, react-hook-form + zod schema partagé).

---

### 3.2 Parasols (6 nouveaux champs)

| Colonne SQL | Type | NULL | Default | Validation zod | i18n key |
|---|---|---|---|---|---|
| `fabric_g_m2` | integer | YES | `NULL` | `z.number().int().min(150).max(450).nullable()` | `products.specs.parasols.fabric_grammage` |
| `fabric_certification` | text | YES | `'Unknown'` | `z.enum(['Sunbrella','Solaris','Dickson_Orchestra','Dickson_Saphir','Serge_Ferrari','Other','Unknown'])` | `products.specs.parasols.fabric_certification` |
| `min_base_weight_kg` | integer | YES | `NULL` | `z.number().int().min(15).max(150).nullable()` | `products.specs.parasols.min_base_weight` |
| `pole_diameter_mm` | integer | YES | `NULL` | `z.number().int().min(30).max(80).nullable()` | `products.specs.parasols.pole_diameter` |
| `heating_compatible` | boolean | YES | `false` | `z.boolean()` | `products.specs.parasols.heating_compat` |
| `wind_beaufort_max` | integer | YES | `NULL` | `z.number().int().min(0).max(12).nullable()` | `products.specs.parasols.wind_beaufort_max` |

**CHECK constraint SQL** :
```sql
CHECK (fabric_certification IN ('Sunbrella', 'Solaris', 'Dickson_Orchestra', 'Dickson_Saphir', 'Serge_Ferrari', 'Other', 'Unknown'))
CHECK (wind_beaufort_max IS NULL OR (wind_beaufort_max BETWEEN 0 AND 12))
```

**Trigger extension** : ajouter dérivation `technical_tags`
- `heating_compatible=true` → tag `'heating-compat'`
- `wind_beaufort_max >= 8` → tag `'high-wind'` (catégorisation perf)
- `fabric_certification IN (Sunbrella, Dickson_Orchestra, Dickson_Saphir, Serge_Ferrari, Solaris)` → tag `'premium-fabric'`

**Sub-composant** : `src/components/products/specs/ParasolSpecsSection.tsx`.

---

### 3.3 Sun Loungers (5 nouveaux champs)

| Colonne SQL | Type | NULL | Default | Validation zod | i18n key |
|---|---|---|---|---|---|
| `cushion_quick_dry` | boolean | YES | `false` | `z.boolean()` | `products.specs.loungers.cushion_quick_dry` |
| `salt_water_resistance` | boolean | YES | `false` | `z.boolean()` | `products.specs.loungers.salt_water` |
| `chlorine_resistance` | boolean | YES | `false` | `z.boolean()` | `products.specs.loungers.chlorine` |
| `sand_drainage` | boolean | YES | `false` | `z.boolean()` | `products.specs.loungers.sand_drainage` |
| `nesting_capacity` | integer | YES | `NULL` | `z.number().int().min(2).max(20).nullable()` | `products.specs.loungers.nesting` |

**Cohérence avec `is_stackable` existant** :
- Si `nesting_capacity > 0` alors `is_stackable` doit être `true` (validation côté front, pas constraint DB pour permettre flexibilité backfill).
- Inverse : si `is_stackable=true` mais `nesting_capacity=NULL`, c'est OK (sun lounger empilable mais on ne sait pas combien).

**Trigger extension** :
- `salt_water_resistance OR chlorine_resistance` → tag `'pool-beach-ready'`
- `cushion_quick_dry` → tag `'quick-dry'`
- `sand_drainage` → tag `'sand-friendly'`
- `nesting_capacity >= 4` → tag `'compact-storage'`

**Sub-composant** : `src/components/products/specs/SunLoungerSpecsSection.tsx`.

---

### 3.4 Sofas / Lounge Seating (4 nouveaux champs)

| Colonne SQL | Type | NULL | Default | Validation zod | i18n key |
|---|---|---|---|---|---|
| `available_modules` | jsonb | YES | `'[]'::jsonb` | `z.array(z.enum(['corner','central-1seat','central-2seat','chaise-left','chaise-right','ottoman','pouf','armless']))` | `products.specs.sofas.modules` |
| `seat_depth_cm` | numeric(4,1) | YES | `NULL` | `z.number().min(40).max(120).nullable()` | `products.specs.sofas.seat_depth` |
| `cushion_replacement_available` | boolean | YES | `false` | `z.boolean()` | `products.specs.sofas.cushion_replacement` |
| `acoustic_NRC` | numeric(3,2) | YES | `NULL` | `z.number().min(0).max(1).nullable()` | `products.specs.sofas.acoustic_nrc` |

**Décision D3 confirmée** : `available_modules` en jsonb (liste variable, ordre potentiellement signifiant pour assemblage).

**Trigger extension** :
- `cushion_replacement_available` → tag `'replaceable-cushions'`
- `acoustic_NRC >= 0.5` → tag `'acoustic-comfort'`
- `seat_depth_cm >= 65` → tag `'deep-lounge'`
- `seat_depth_cm BETWEEN 45 AND 55` → tag `'structured-seating'`
- `jsonb_array_length(available_modules) > 0` → tag `'modular'`

**Sub-composant** : `src/components/products/specs/SofaSpecsSection.tsx` (avec `ModulesPicker` enfant pour la jsonb array).

---

### 3.5 Bar Stools & High Tables (5 nouveaux champs)

| Colonne SQL | Type | NULL | Default | Validation zod | i18n key |
|---|---|---|---|---|---|
| `seat_height_cm` (modif type) | **numeric(5,1)** au lieu de `integer` | YES | `NULL` | `z.number().min(40).max(95).nullable()` | (déjà existant, libellé reste) |
| `table_top_height_cm` | numeric(5,1) | YES | `NULL` | `z.number().min(60).max(110).nullable()` | `products.specs.bar_stools.table_top_height` |
| `subdivision` | text | YES | `'Unknown'` | `z.enum(['counter','bar','tall','Unknown'])` | `products.specs.bar_stools.subdivision` |
| `footrest` | boolean | YES | `false` | `z.boolean()` | `products.specs.bar_stools.footrest` |
| `swivel` | boolean | YES | `false` | `z.boolean()` | `products.specs.bar_stools.swivel` |

**ALTER TYPE** sur `seat_height_cm` (D1 confirmée) :
```sql
ALTER TABLE public.products ALTER COLUMN seat_height_cm TYPE numeric(5,1) USING seat_height_cm::numeric(5,1);
```

**CHECK** :
```sql
CHECK (subdivision IN ('counter','bar','tall','Unknown'))
```

**Cross-validation côté zod** :
- Si `category='Bar Stools'` ET `subdivision='counter'`, `seat_height_cm` ∈ [60, 70]
- Si `subdivision='bar'`, `seat_height_cm` ∈ [70, 80]
- Si `subdivision='tall'`, `seat_height_cm` ∈ [80, 95]
- Si `category='Tables'` ET subcategory contient "high", `table_top_height_cm` requis

**Trigger extension** :
- `swivel=true` → tag `'swivel'`
- `footrest=true` → tag `'footrest'`
- `subdivision='counter'` → derive product_type_tags `{height_type: 'counter'}`
- `subdivision='bar'` → derive `{height_type: 'bar'}`
- `subdivision='tall'` → derive `{height_type: 'tall'}`

**Sub-composant** : `src/components/products/specs/BarStoolSpecsSection.tsx`.

---

## 4. Vocabulaire 2026 — patches `intentDetector.ts`

### 4.1 Nouveau dictionnaire `TERM_TO_TREND_TAG`

À ajouter dans `intentDetector.ts` (export depuis le fichier existant) :

```ts
const TERM_TO_TREND_TAG: Record<string, string> = {
  // ── Design trends 2026 ──
  resimercial: "resimercial",
  "soft modern": "soft-modern", "soft-modern": "soft-modern",
  biophilic: "biophilic",
  "layered maximalism": "layered-maximalism", "layered-maximalism": "layered-maximalism",
  cocooning: "cocooning",
  "material honesty": "material-honesty", "material-honesty": "material-honesty",

  // ── Hospitality experience ──
  "linger worthy": "linger-worthy", "linger-worthy": "linger-worthy",
  "quiet zone": "quiet-zone", "quiet-zone": "quiet-zone",
  "social zone": "social-zone", "social-zone": "social-zone",
  "vip zone": "vip-zone", "vip-zone": "vip-zone",
  "acoustic comfort": "acoustic-comfort", "acoustic-comfort": "acoustic-comfort",

  // ── Sustainability ──
  repairable: "repairable",
  reconfigurable: "reconfigurable",
  "replacement parts": "replacement-parts-available",
};
```

### 4.2 Nouveau module `src/engine/dictionaries/fabricBrands.ts`

Préférable au sein d'un module dédié (recommandation founder, plus propre) :

```ts
// src/engine/dictionaries/fabricBrands.ts
export type FabricBrandSlug =
  | "Sunbrella"
  | "Solaris"
  | "Dickson_Orchestra"
  | "Dickson_Saphir"
  | "Serge_Ferrari"
  | "Other"
  | "Unknown";

export const TERM_TO_FABRIC_BRAND_SLUG: Record<string, FabricBrandSlug> = {
  sunbrella: "Sunbrella",
  solaris: "Solaris",
  "solaris trevira": "Solaris",
  "dickson orchestra": "Dickson_Orchestra",
  "orchestra max": "Dickson_Orchestra",
  "dickson saphir": "Dickson_Saphir",
  "serge ferrari": "Serge_Ferrari",
  soltis: "Serge_Ferrari",
};

export function detectFabricBrand(text: string): FabricBrandSlug | null {
  const lower = text.toLowerCase().trim();
  for (const [term, slug] of Object.entries(TERM_TO_FABRIC_BRAND_SLUG)) {
    if (lower.includes(term)) return slug;
  }
  return null;
}
```

Importé depuis `intentDetector.ts` et `ParasolSpecsSection.tsx`.

### 4.3 Termes existants à conserver

**Aucun terme actuel n'est supprimé.** Audit rapide pendant l'analyse n'a rien trouvé d'obsolète à signaler. Si pendant l'exécution un terme paraît mal calibré (ex. ambiguïté entre 2 slugs), je le signalerai en récap de catégorie.

---

## 5. Architecture sub-composants UI

### 5.1 Décision D2 (à ratifier) : `src/components/products/specs/`

Plutôt que `src/components/admin/product-specs/` (cross-import bizarre depuis `partner-dashboard/`).

```
src/components/products/specs/
├── index.ts                          # exports tous les sub-composants + types partagés
├── shared/
│   ├── SpecField.tsx                 # wrapper field commun (label + input + error)
│   ├── ConditionalSpecField.tsx      # wrapper avec condition d'affichage
│   └── types.ts                      # type SpecsSectionProps<T>
├── TableSpecsSection.tsx
├── ParasolSpecsSection.tsx
├── SunLoungerSpecsSection.tsx
├── SofaSpecsSection.tsx
└── BarStoolSpecsSection.tsx
```

### 5.2 Pattern d'intégration dans `AddProductForm.tsx`

```tsx
import { TableSpecsSection, ParasolSpecsSection, SunLoungerSpecsSection,
         SofaSpecsSection, BarStoolSpecsSection } from "@/components/products/specs";

// ... dans le render
{form.category === "Tables" && (
  <TableSpecsSection value={form.tableSpecs} onChange={...} errors={errors} />
)}
{form.category === "Parasols" && (
  <ParasolSpecsSection value={form.parasolSpecs} onChange={...} errors={errors} />
)}
// idem pour les 3 autres
```

Les sub-composants sont **présentationnels** (props in / events out). Ils n'ouvrent pas de connexion Supabase eux-mêmes. Le state principal reste dans `AddProductForm` / `AdminProductReview`.

### 5.3 Réutilisation côté affichage public

Pour `ProductDetail.tsx` (page produit publique), créer en parallèle un composant `<ProductSpecs>` read-only qui affiche les nouveaux champs selon la catégorie. **HORS scope de ce chantier** ; à programmer dans un mini-chantier suivant si demandé. Les sections édit créées ici exposent leurs sous-helpers (formatters de label) qui pourront être réutilisés.

---

## 6. Migration de base (combinée FK + RLS init-plan + colonnes Tables/Bar Stools peuplées)

**Fichier** : `supabase/migrations/2026050X1_chantier_vocab_base_products.sql`

Cette migration combine :
1. **B2.2** — 7 FK uuid manquantes vers `products` (et `user_profiles` pour `pro_service_events.actor_id`)
2. **B2.3** — Fix 7 policies `auth_rls_initplan` (`(SELECT auth.uid())` au lieu de `auth.uid()`)
3. **D1** — `ALTER COLUMN seat_height_cm TYPE numeric(5,1)`
4. Pas de nouvelle colonne dans cette migration : les colonnes par catégorie sont dans les 5 migrations suivantes pour atomicité.

**SQL prévu (extrait)** :

```sql
-- ── Section 1 : Add missing foreign keys ──────────────────────────────────────
ALTER TABLE public.board_items
  ADD CONSTRAINT board_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.concept_events
  ADD CONSTRAINT concept_events_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;

ALTER TABLE public.partner_arrival_items
  ADD CONSTRAINT partner_arrival_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.preorders
  ADD CONSTRAINT preorders_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;

ALTER TABLE public.project_zone_products
  ADD CONSTRAINT project_zone_products_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.pro_service_events
  ADD CONSTRAINT pro_service_events_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── Section 2 : Fix auth_rls_initplan policies ────────────────────────────────
-- products / "Authenticated users can read products"
DROP POLICY IF EXISTS "Authenticated users can read products" ON public.products;
CREATE POLICY "Authenticated users can read products" ON public.products
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- 6 autres policies similaires (quote_documents x2, product_reviews x4)
-- ... (à détailler en ÉTAPE 2)

-- ── Section 3 : Migrate seat_height_cm to numeric(5,1) ────────────────────────
ALTER TABLE public.products
  ALTER COLUMN seat_height_cm TYPE numeric(5,1)
  USING seat_height_cm::numeric(5,1);
```

**Tests post-déploiement** :
- `SELECT count(*) FROM products` avant/après migration : doit être identique (53)
- Test FK : `INSERT board_items` avec product_id inexistant → doit fail avec FK violation
- Test policy : `SET LOCAL ROLE anon; SELECT count(*) FROM products WHERE publish_status='published';` doit retourner les products publics
- `mcp__supabase__get_advisors(performance)` ne signale plus `unindexed_foreign_keys` ni `auth_rls_initplan` sur ces colonnes

---

## 7. Plan d'exécution par étape

### ÉTAPE 2 — Migration base + Tables + sub-composant Tables (1.5 j)
- 7.1 Créer migration combinée base (FK + init_plan + ALTER seat_height_cm) — ÉTAPE 6 (donc plutôt en début ÉTAPE 2)
- 7.2 Créer migration Tables (7 colonnes)
- 7.3 Régénérer types TS (`mcp__supabase__generate_typescript_types`)
- 7.4 Créer `src/components/products/specs/shared/` + `TableSpecsSection.tsx`
- 7.5 Brancher dans `AddProductForm.tsx` + `AdminProductReview.tsx`
- 7.6 i18n EN/FR/ES/IT (~ 14 nouvelles clés `products.specs.tables.*`)
- 7.7 Test Vitest `src/test/specs-tables.test.ts` (validation zod + cross-field rules)
- 7.8 `bun run lint` + `bunx tsc --noEmit` + `bun run test` verts
- 7.9 Récap chat → STOP, validation founder

### ÉTAPE 3 — Parasols (1 j)
Idem pattern. Migration 6 colonnes + sub-composant + i18n + test. Récap → STOP.

### ÉTAPE 4 — Sun Loungers (1 j)
Idem. 5 colonnes.

### ÉTAPE 5 — Sofas / Lounge Seating (1 j)
Idem. 4 colonnes (dont 1 jsonb `available_modules`). Sub-composant légèrement plus riche (ModulesPicker).

### ÉTAPE 6 — Bar Stools & High Tables (1 j)
Idem. 5 colonnes (dont D1 `table_top_height_cm`). Cross-validation `subdivision` × `seat_height_cm`.

### ÉTAPE 7 — Trigger extension + vocabulaire 2026 + finalisation (1 j)
- Migration `2026050X7_extend_auto_derive_trigger.sql` qui ajoute les dérivations cohérentes pour les 27 nouveaux champs.
- Patch `intentDetector.ts` avec `TERM_TO_TREND_TAG` + nouveau module `src/engine/dictionaries/fabricBrands.ts`.
- Test Vitest `src/test/fabric-brands.test.ts` (couverture des 5 brands + variantes).
- Diff `CLAUDE.md` proposé (mise à jour conventions champs critiques + dictionnaires).
- Récap final.

**Total estimé : 5.5-6.5 jours**, en ligne avec ton range 4-6 j.

---

## 8. Risques et mitigations

| Risque | Mitigation |
|---|---|
| **`trg_auto_derive_product_tags` casse silencieusement avec nouveaux champs** | Vérifié en analyse : le trigger ignore les colonnes inconnues. Aucun risque de plantage. Extension propre en ÉTAPE 7. |
| **`ALTER COLUMN seat_height_cm` lock la table** | Table 53 lignes → opération millisecondes. Fenêtre de blocage négligeable, pas besoin de `CONCURRENTLY` (qui n'existe pas pour ALTER COLUMN de toute façon). |
| **Régénération types TS introduit ~ 100 lignes nouvelles dans `types.ts` (4755 lignes)** | Acceptable, fichier auto-généré. `bunx tsc --noEmit` doit valider à chaque migration. |
| **Conflit `nesting_capacity` vs `is_stackable` côté UI** | Validation zod cross-field : si `nesting_capacity > 0` alors `is_stackable` doit être `true`. Toast d'avertissement front si incohérence. |
| **`available_modules` jsonb non typable côté Postgres** | Validation zod côté front + CHECK constraint texte JSON minimal côté DB pour fail-fast les payloads malformés. Pattern déjà utilisé pour `dimension_variants`. |
| **5 sub-composants à créer + intégration AddProductForm 1307 lignes** | God component existant. On ajoute les sections sans toucher au reste. Refactor profond du form = Bucket 3 (post-relance). |
| **i18n ~ 320 nouvelles clés × 4 langues** | Namespacing strict `products.specs.<category>.<field>`. Une factory helper si nécessaire pour générer les bundles. Risque humain mais routine. |
| **Cross-validation `subdivision × seat_height_cm` Bar Stools** | Validation soft (toast) plutôt que CHECK constraint stricte, pour permettre des produits non-standard. |
| **Catégories Parasols/Sun Loungers/Sofas vides aujourd'hui** | Les nouvelles colonnes seront NULL/default sur 100 % des prods existants. Cohérent. Le founder importera des produits dans ces cat plus tard. |
| **Double migration FK + colonnes en cas de rollback** | Si problème détecté entre ÉTAPE 2 et 7, rollback partiel (par catégorie). Migrations atomiques séparées garantissent l'isolation. |

---

## 9. Tests à écrire

| Fichier | Sujet | Volume estimé |
|---|---|---|
| `src/test/specs-tables.test.ts` | Validation zod TableSpecs + cross-field rules (umbrella_hole + diameter, extension + max) | 8-10 tests |
| `src/test/specs-parasols.test.ts` | Validation zod ParasolSpecs + fabric_certification enum + wind_beaufort_max range | 8-10 tests |
| `src/test/specs-loungers.test.ts` | Validation zod SunLoungerSpecs + cohérence `nesting_capacity` × `is_stackable` | 6-8 tests |
| `src/test/specs-sofas.test.ts` | Validation zod SofaSpecs + jsonb `available_modules` enum array | 8-10 tests |
| `src/test/specs-bar-stools.test.ts` | Validation zod BarStoolSpecs + cross-validation subdivision × seat_height | 10-12 tests |
| `src/test/fabric-brands.test.ts` | `detectFabricBrand()` couverture 5 brands + variantes + casses | 10-15 tests |

**Total nouveau** : ~ 50-65 tests. La suite passera de 153 à ~ 210-220 tests.

---

## 10. Critères de succès vérifiables (8)

| # | Critère | Comment vérifier |
|---|---|---|
| 1 | 27 nouvelles colonnes ajoutées sur `products`, types et défauts conformes | `SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name='products'` retourne les colonnes attendues |
| 2 | 7 FK uuid ajoutées + visibles | `SELECT * FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY'` montre les 7 |
| 3 | 7 policies `auth_rls_initplan` corrigées | `mcp__supabase__get_advisors(performance)` : 0 occurrence `auth_rls_initplan` |
| 4 | Aucune perte de données | `SELECT COUNT(*) FROM products` = 53 avant et après. Idem sur tables référencées. |
| 5 | `seat_height_cm` migré en numeric(5,1) | `SELECT data_type FROM information_schema.columns WHERE table_name='products' AND column_name='seat_height_cm'` = `numeric` |
| 6 | Tests Vitest tous verts (153 + ~ 60 nouveaux) | `bun run test` retourne 0 fail |
| 7 | i18n complet 4 langues sur 27 champs + 80 libellés UI | `grep -c "products.specs" src/i18n/locales/<lang>.json` retourne le même nombre dans les 4 fichiers |
| 8 | Trigger `auto_derive_product_tags` étendu et déclenché correctement | Tests manuels : INSERT produit avec `extension_capability=true` doit avoir `'extendable'` dans `technical_tags` après commit |

---

## 11. Hypothèses à valider founder (D1-D7 ci-dessus + nouvelles)

1. **D1 — `seat_height_cm` integer → numeric(5,1)** ✓ recommandé migration
2. **D2 — Sub-composants dans `src/components/products/specs/`** plutôt que `admin/product-specs/`
3. **D3 — `available_modules` en jsonb** (exception au principe "pas de jsonb")
4. **D4 — `table_top_height_cm` sur products avec validation app-side**
5. **D5 — `fabric_certification` text+CHECK** plutôt qu'enum Postgres
6. **D6 — `subdivision` text+CHECK** idem
7. **D7 — Trigger extension migration séparée à la fin** (ÉTAPE 7)
8. **D8 — Module `src/engine/dictionaries/fabricBrands.ts`** dédié, importé par `intentDetector.ts` (recommandation founder, retenue)
9. **D9 — Page produit publique `<ProductSpecs>` read-only** : HORS scope, mini-chantier suivant
10. **D10 — i18n key namespace `products.specs.<category>.<field>`** (suffisamment imbriqué pour éviter collisions)

---

## 12. Statut ÉTAPE 1

✅ Schéma actuel analysé (87 colonnes existantes)
✅ Trigger `auto_derive_product_tags` audité, plan d'extension défini
✅ Conflit `seat_height_cm` integer/float identifié et traité (D1)
✅ `intentDetector.ts` patterns existants documentés
✅ `AddProductForm.tsx` localisation clarifiée (partner-dashboard, pas admin) → décision D2 architecture sub-composants
✅ FK manquantes (B2.2) + policies init_plan (B2.3) intégrées au plan
✅ Catégories vides (Parasols/Sun Loungers/Sofas) → backfill non nécessaire
✅ 27 colonnes spécifiées par catégorie (types, défauts, validation, i18n keys, trigger extensions)
✅ 5 sub-composants UI architecturés
✅ Vocabulaire 2026 + module `fabricBrands` dédié
✅ Plan d'exécution séquencé par ÉTAPE 2-7
✅ Tests prévus (50-65 nouveaux)
✅ Risques + mitigations listés
✅ 8 critères de succès vérifiables

---

🛑 **STOP** — j'attends ta validation pour passer à l'ÉTAPE 2.

**Décisions à confirmer ou ajuster** : D1-D10 (section 11). Si "valide les défauts", je pars sur les recommandations. Si tu veux ajuster certains points, indique-les explicitement.

Plus rien d'autre côté code n'est modifié à ce stade.
