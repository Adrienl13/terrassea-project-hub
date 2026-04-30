# CHANGELOG — Chantier Vocabulaire 2026

**Date de réalisation :** 2026-04-30 (1 journée intensive, 7 ÉTAPES)
**Statut :** ✅ COMPLÉTÉ — en attente de validation finale founder pour commit + push.
**Plan source :** `docs/chantiers/2026-05/PLAN_VOCAB_FIELDS.md` (10 décisions architecturales D1-D10)
**Backlog post-chantier :** `docs/chantiers/2026-05/BACKLOG_POST_VOCAB.md`

---

## 1. Vue d'ensemble

| Phase | Objet | Statut |
|---|---|---|
| ÉTAPE 1 | Analyse + plan + 10 décisions D1-D10 | ✅ |
| ÉTAPE 2 | Migration base + Tables (7 colonnes) + sub-composants + AdminProductReview | ✅ |
| ÉTAPE 3 | Parasols (6 colonnes) + dictionnaire fabricBrands.ts + AdminProductReview | ✅ |
| ÉTAPE 4 | Sun Loungers (5 colonnes) + AdminProductReview | ✅ |
| ÉTAPE 5 | Sofas / Lounge Seating (4 colonnes dont jsonb available_modules) + AdminProductReview | ✅ |
| ÉTAPE 6 | Bar Stools & High Tables (5 colonnes incl. subdivision partagé) + AdminProductReview | ✅ |
| ÉTAPE 7 | Vocabulaire 2026 + normalisation catégories + extension trigger + cleanup + CLAUDE.md + CHANGELOG | ✅ |

**Périmètre** : 5 catégories produits prioritaires (Tables, Parasols, Sun Loungers, Sofas/Lounge Seating, Bar Stools & High Tables) — celles qui pèsent dans le pitch commercial avant relance Salone mid-juin 2026 (50 contacts founder).

**Méthodologie** : workflow strict ÉTAPE par ÉTAPE avec validation founder à chaque jalon. Chaque catégorie : migration SQL → types/zod → sub-composant UI → intégration AddProductForm → intégration AdminProductReview → tests Vitest → i18n 4 langues.

---

## 2. Migrations appliquées

11 migrations Supabase appliquées via `mcp__supabase__apply_migration` (atomicité + traçabilité). Toutes le 2026-04-30, séquencées de 10:52 UTC à 13:36 UTC.

| # | Version | Nom | Effet |
|---|---|---|---|
| 1 | 20260430105259 | `products_base_fk_initplan_seatheight` | 7 FK uuid (cart_items, quote_requests, etc.) ajoutent `auth.uid()` initplan optimization → `auth_rls_initplan` 7 → 0. ALTER `seat_height_cm` to `numeric(5,1)` (de int) |
| 2 | 20260430105759 | `products_table_specs` | +7 colonnes Tables (extension_capability, extension_type, top_thickness_cm, base_count, top_material, edge_finish, leveling_feet) + CHECK constraints + defaults |
| 3 | 20260430111611 | `products_parasol_specs` | +6 colonnes Parasols (canopy_diameter_cm, beaufort_rating, fabric_certification, mast_position, has_lighting, base_required) |
| 4 | 20260430112559 | `products_sun_lounger_specs` | +5 colonnes Sun Loungers (recline_positions, has_wheels, has_canopy, pool_resistant, beach_resistant) |
| 5 | 20260430115625 | `products_sofa_specs` | +4 colonnes Sofas / Lounge Seating, dont 1 `jsonb` (available_modules: ['corner', 'arm-left', 'arm-right', 'middle', 'ottoman', 'curved', 'chaise']) + acoustic_treatment + heating_compat + min_unit_count |
| 6 | 20260430121845 | `products_bar_stool_high_table_specs` | +5 colonnes incl. 1 partagée (subdivision: counter/bar/tall/unknown) + footrest, swivel_mechanism, weight_capacity_kg, weatherproof_outdoor |
| 7 | 20260430131701 | `products_normalize_categories` | 4 UPDATEs : Tables→tables, Bar Stools→bar-stools, Chairs→chairs, Armchairs→armchairs (lowercase-kebab) |
| 8 | 20260430132842 | `extend_auto_derive_product_tags_vocab_2026` | CREATE OR REPLACE FUNCTION : 8 nouveaux technical_tags dérivés (premium-fabric, high-wind, heating-compat, modular, pool-resistant, beach-resistant, acoustic, repairable) |
| 9 | 20260430132936 | `index_fk_products_columns` | 5 INDEX CONCURRENTLY sur les FK uuid produits (résout `unindexed_foreign_keys`) |
| 10 | 20260430133536 | `index_orders_preorders_product_id` | 2 INDEX patch (orders.product_id, preorders.product_id) découverts post-application |
| 11 | 20260430133622 | `drop_duplicate_index_partner_arrival_items` | DROP INDEX doublon (idx_partner_arrival_items_product_id) — pré-existant `idx_arrival_items_product` conservé |

---

## 3. Champs ajoutés par catégorie (récap)

| Catégorie | # colonnes | Détail |
|---|---|---|
| **Tables** | 7 | `extension_capability` (boolean) ; `extension_type` (none/leaf/butterfly/sliding) ; `top_thickness_cm` (numeric) ; `base_count` (integer) ; `top_material` (text) ; `edge_finish` (text) ; `leveling_feet` (boolean) |
| **Parasols** | 6 | `canopy_diameter_cm` (numeric) ; `beaufort_rating` (integer 0-12) ; `fabric_certification` (enum 7 valeurs : Sunbrella, Solaris, Dickson_Orchestra, Dickson_Saphir, Serge_Ferrari, Other, Unknown) ; `mast_position` (center/side/cantilever) ; `has_lighting` (boolean) ; `base_required` (boolean) |
| **Sun Loungers** | 5 | `recline_positions` (integer) ; `has_wheels` (boolean) ; `has_canopy` (boolean) ; `pool_resistant` (boolean) ; `beach_resistant` (boolean) |
| **Sofas / Lounge Seating** | 4 (1 jsonb) | `available_modules` (jsonb array, 7 enum values via zod) ; `acoustic_treatment` (boolean) ; `heating_compat` (boolean) ; `min_unit_count` (integer) |
| **Bar Stools & High Tables** | 5 (1 partagé) | `subdivision` (counter/bar/tall/unknown — partagé entre les 2 sous-types) ; `footrest` (boolean) ; `swivel_mechanism` (boolean) ; `weight_capacity_kg` (numeric) ; `weatherproof_outdoor` (boolean) |

**Total : 27 colonnes** ajoutées à `public.products`. Toutes avec CHECK constraints + defaults. `available_modules` jsonb validé app-side (pas de CHECK Postgres possible sur array).

**Cross-validation soft** : `seat_height_cm` ↔ `subdivision` réconcilié via hints (counter:65, bar:75, tall:85, ±5cm tolérance). Z-refine warning, pas blocker.

---

## 4. Vocabulaire 2026

### 4.1 Dictionnaire `src/engine/dictionaries/fabricBrands.ts` (nouveau)

- 7 slugs : `Sunbrella` | `Solaris` | `Dickson_Orchestra` | `Dickson_Saphir` | `Serge_Ferrari` | `Other` | `Unknown`
- 5 marques premium dérivent le tag `premium-fabric` via trigger
- `TERM_TO_FABRIC_BRAND_SLUG` : 8 termes lowercase (sunbrella, solaris, solaris trevira, dickson orchestra, orchestra max, dickson saphir, serge ferrari, soltis)
- `detectFabricBrand(text)` helper : détection inclusion case-insensitive

### 4.2 `src/engine/intentDetector.ts` étendu

- Ajout `TERM_TO_TREND_TAG` : ~14 design-trends 2026 (resimercial, soft-modern, biophilic, layered-maximalism, cocooning, material-honesty, linger-worthy, quiet-zone, social-zone, vip-zone, acoustic-comfort, repairable, reconfigurable, replacement-parts-available)
- Variantes 4 langues : `biophilic` / `biophilique` / `biofílico` / `biofilico` ; `repairable` / `réparable` / `reparable` ; `pièces détachées` / `pieces detachees`
- Re-export valeur `TERM_TO_FABRIC_BRAND_SLUG` + type `FabricBrandSlug` (split en 2 statements pour éviter type-only re-export)

---

## 5. Sous-composants UI créés

Tous dans `src/components/products/specs/` (pas `admin/` — décision D9 : réutilisables côté Add + côté AdminReview).

| Fichier | Lignes | Catégorie |
|---|---|---|
| `TableSpecsSection.tsx` | ~180 | Tables |
| `ParasolSpecsSection.tsx` | ~190 | Parasols |
| `SunLoungerSpecsSection.tsx` | ~150 | Sun Loungers |
| `SofaSpecsSection.tsx` | ~210 | Sofas / Lounge Seating |
| `BarStoolSpecsSection.tsx` | ~165 | Bar Stools |
| `HighTableSpecsSection.tsx` | ~145 | High Tables |
| `shared/SubdivisionPicker.tsx` | ~50 | Picker factorisé Bar/High |
| `shared/types.ts` | ~330 | Types + zod schemas + defaults centralisés |
| `index.ts` | barrel | Re-exports propres |

**Pattern** : chaque sub-composant prend `value: SpecsType`, `onChange: (v) => void`, `disabled?: boolean`. Mode disabled = read-only (utilisé par AdminProductReview).

---

## 6. Tests Vitest

| Avant chantier | Après chantier | Delta |
|---|---|---|
| 153 tests verts | **264/264 verts** | **+111 tests** |

**Nouveaux fichiers de test** (8) :
- `src/test/specs-tables.test.ts` (11 tests)
- `src/test/specs-parasols.test.ts` (15 tests)
- `src/test/specs-sun-loungers.test.ts` (12 tests)
- `src/test/specs-sofas.test.ts` (19 tests)
- `src/test/specs-bar-stools.test.ts` (18 tests)
- `src/test/category-normalizer.test.ts` (~25 tests)
- `src/test/intent-vocab-2026.test.ts` (~20 tests)
- (extension intent-engine existant)

Coverage : zod schemas (parse strict + parse safe), defaults, edge cases (jsonb arrays vides, valeurs hors enum), heuristique seating, fabric brand detection.

---

## 7. i18n

**~370 nouvelles clés** réparties × 4 langues (en/fr/es/it) = **~1480 traductions** ajoutées.

Distribution par catégorie :
- Tables : ~20 clés (extension types, top materials, edge finishes)
- Parasols : ~20 clés (beaufort labels, mast positions, fabric brands)
- Sun Loungers : ~15 clés (recline, wheels/canopy, environments)
- Sofas : ~21 clés (modules + composition + acoustic + heating)
- Bar Stools / High Tables / shared.subdivision : ~27 clés
- Trends 2026 (intentDetector) : ~14 clés × labels
- Misc UI labels (toggle helpers, format hints, validation) : ~250 clés

Méthode : 5 batches via scripts Python (lecture json → patch in-place → écriture). Aucun `<TODO>` résiduel.

---

## 8. Advisors Supabase résolus

| Advisor | Avant | Après | Note |
|---|---|---|---|
| `auth_rls_initplan` | 7 | **0** | Résolu via migration #1 (initplan optim sur 7 FK) |
| `unindexed_foreign_keys` | 8 | **3** | 5 résolus chantier vocab. 3 résiduels pré-existants (concept_events.user_id, product_reviews.order_id, product_reviews.quote_request_id) — hors scope vocab |
| `duplicate_index` | 1 | **0** | Migration #11 a droppé le doublon |
| `multiple_permissive_policies` | **623** | **623** | **NON résolu — reporté Bucket 3** (53 tables × roles × actions, pattern admin + owner systémique). Voir §9 et BACKLOG §5 |

**Verified 2026-04-30** via `mcp__supabase__get_advisors(type="performance")`.

---

## 9. Décisions stratégiques importantes

| # | Décision | Rationale |
|---|---|---|
| D1 | **Option B chairs/armchairs distincts** (pas mappé en un seul `seating`) | Vocabulaire produits doit refléter la réalité commerciale outdoor hospitality (un fauteuil n'est pas une chaise). 4 langues confirment |
| D2 | **Slug `seating` conservé hors catégorie produit** | Conservé comme concept sémantique dans 2 contextes : architect need briefs (ArchitectSections) et Resources page topic. Catégorie produit = `chairs`/`armchairs`/`bar-stools`/`sofas` distincts |
| D3 | **Sub-composants dans `products/specs/` (pas `admin/`)** | Réutilisables : AddProductForm (partner-side) + ProductReviewHelpers (admin-side) consomment les mêmes composants avec/sans `disabled` |
| D4 | **`available_modules` jsonb avec validation zod stricte** | Postgres ne peut pas faire CHECK sur array. zod enum `["corner", "arm-left", "arm-right", "middle", "ottoman", "curved", "chaise"]` parse-strict client-side avant insert |
| D5 | **Cross-validation soft seat_height ↔ subdivision** | Warning Zod refine (pas blocker) : counter≈65, bar≈75, tall≈85, ±5cm. Permet edge cases tout en signalant incohérences évidentes |
| D6 | **Heuristique seating fallback** côté `useProductSubmissions` | AI/CSV ingestion peut renvoyer "Chairs" ou "seating" mal qualifiés. categoryNormalizer choisit chairs/armchairs/bar-stools selon mots-clés du nom (4 langues) |
| D7 | **Trigger `auto_derive_product_tags` étendu, pas dupliqué** | CREATE OR REPLACE de la fonction existante avec 8 nouveaux tags dérivés. Pas de nouveau trigger |
| D8 | **AdminProductReview intégré au fil de chaque catégorie** (pas en fin de chantier) | Tester complet à chaque ÉTAPE évite la dette d'intégration tardive. 6 helpers `pdToTableSpecs`, etc. + flag `isHighTable(pd)` |
| D9 | **Backlog §5 (multiple_permissive_policies)** : reporté Q3 2026 | 623 entries × 53 tables (auth, payments, conversations…) hors scope vocab. Risque régression élevé |
| D10 | **PAS DE DEPLOYMENT EDGE FUNCTIONS** dans ce chantier | Mismatch taxonomie côté prompts AI absorbé par categoryNormalizer client-side. Migration prompts upstream → Backlog §6 (Q3 2026, ~1-2h) |

---

## 10. Backlog post-chantier

Voir `docs/chantiers/2026-05/BACKLOG_POST_VOCAB.md` pour le détail. 6 items identifiés :

| § | Item | Priorité | Effort | Cible |
|---|---|---|---|---|
| 1 | Catalogue de démo 30-50 produits réels | **Haute** | 1-2 jours | Avant Salone relaunch (mid-juin 2026) |
| 2 | Composant `<ProductSpecs>` read-only public | **Haute** | 0.5-1 jour | Avant Salone relaunch |
| 3 | Backfill IA des 27 champs critiques (AdminAIScanner) | Moyenne | 1-2 jours | Q3 2026 |
| 4 | Documentation CLAUDE.md (couvert par 7.7 ✅) | — | — | Done |
| 5 | Consolider `multiple_permissive_policies` (623→<100) | Moyenne | 1-2 jours par lots | Q3 2026 |
| 6 | Migrer prompts edge functions taxonomie | Moyenne | 1-2h | Q3 2026 |

---

## 11. Critères de succès (8) — statut final

| # | Critère | Statut |
|---|---|---|
| 1 | 5 catégories prioritaires couvertes par migrations + sub-composants + tests | ✅ |
| 2 | Tous tests Vitest verts post-chantier | ✅ 264/264 |
| 3 | `tsc --noEmit` clean | ✅ Pré-existant `isSubmitting unused` documenté hors scope |
| 4 | Aucune régression UI sur AddProductForm (partner) | ✅ Conditionnel render par catégorie validé |
| 5 | AdminProductReview affiche les 27 nouveaux champs en read-only | ✅ Via 6 sub-composants en mode `disabled` |
| 6 | `auth_rls_initplan` resolu | ✅ 7 → 0 |
| 7 | `unindexed_foreign_keys` < 5 résiduels documentés | ✅ 8 → 3 |
| 8 | Trigger auto_derive_product_tags dérive 8 nouveaux tags | ✅ Validé empiriquement par 3 INSERT/DELETE roundtrips |

---

## 12. Récapitulatif chiffré

```
Migrations Supabase :        11
Colonnes products ajoutées : 27
Sub-composants UI :           6 + 1 shared picker
Lignes types/zod centralisées : ~330 (specs/shared/types.ts)
Tests Vitest :               +111 (153 → 264 verts)
Clés i18n :                  ~370 × 4 langues = ~1480 traductions
Vocabulary terms ajoutés :   ~22 (14 trends + 8 fabric brand variants)
Trigger tags dérivés :       +8 nouveaux (premium-fabric, high-wind, …)
Advisors résolus :           auth_rls_initplan 7→0, unindexed_fk 8→3, dup_index 1→0
Advisors backlogués :        multiple_permissive_policies 623 (Bucket 3 Q3 2026)
Décisions stratégiques :     10 (D1-D10) tracées dans PLAN_VOCAB_FIELDS.md
Documentation produite :     PLAN_VOCAB_FIELDS.md + BACKLOG_POST_VOCAB.md + CHANGELOG.md + 3 diffs CLAUDE.md
```

---

**Chantier vocab 2026 : ✅ COMPLÉTÉ.** Reste : commit + push après validation founder du récap final.
