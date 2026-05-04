# CHANGELOG — Chantier Modèle B variants étendu

> Journal append-only des étapes du chantier Modèle B variants étendu (Phase 1).
> Réf : `docs/strategy/PRODUCT_DATA_VISION.md` v1.1, `docs/chantiers/2026-05/PLAN_MODELE_B_VARIANTS.md`.
> Démarrage : 2026-05-01. Cible fin : 22-26 mai 2026.

---

## Note sur la numérotation des étapes

Le `PLAN_MODELE_B_VARIANTS.md` initial (ÉTAPE 1) prévoyait une numérotation
qui a légèrement divergé en cours de chantier. Mapping pour audit futur :

| Plan ÉTAPE 1 (initial) | Réalité chantier (suivie) |
|---|---|
| ÉTAPE 7 — UI partner-dashboard refondue | Livrée en ÉTAPE 6 (sub-étapes 6a/6b/6c/6d) |
| ÉTAPE 8 — UI admin + edge functions | Devient ÉTAPE 7 (UI admin matérialisation) + ÉTAPE 8 (UI admin référentiels) |
| ÉTAPE 9 — UI publique | Reste ÉTAPE 9 |
| ÉTAPE 10 — Doc finale | Reste ÉTAPE 10 |

Justification : la numérotation chantier est plus granulaire et reflète mieux
la séparation matérialisation variants / gestion référentiels que la
numérotation plan initial.

---

## ÉTAPE 1 — Plan détaillé (2026-05-01)

Plan créé dans `docs/chantiers/2026-05/PLAN_MODELE_B_VARIANTS.md` (1019 lignes).
9 migrations DDL planifiées + DDL exhaustif des 6 référentiels Phase 1 + stratégie
migration 53 produits + estimations effort + 5 questions de cadrage validées en bloc
par le founder.

Commit : `46e5682`.

---

## ÉTAPE 2 — Référentiels Phase 1 (2026-05-01)

Migrations appliquées :
- `20260501121738_create_phase1_referentials` (DDL)
- `20260501122056_seed_phase1_referentials` (seeds)

Compteurs : 27 material_brands, 17 certifications, 49 colors, 30 finishes, 8 markets,
15 liens N-N material_brand_certifications. Pattern N-N retenu (Q2 reco A) plutôt
qu'`uuid[]`. Util `src/lib/materialBrandsMapping.ts` créé pour pont TS↔DB.

Tests : 264 → 274 (+10 mapping).

Commits : `21a6dfa`, `88d828b`.

---

## ÉTAPE 3 — product_variants + product_media (2026-05-01)

Migrations appliquées :
- `20260501122940_create_product_media` (table + indexes + RLS héritée)
- `20260501123138_create_product_variants` (~30 cols + 13 indexes + RLS + ALTER FK media→variant)

Stratégie FK circulaire : 2 migrations atomiques (product_media créé avec
variant_id sans FK ; FK ajoutée en migration suivante).

Helpers TS livrés :
- `src/lib/productVariants.ts` (zod schema, defaults, helpers)
- `src/lib/productMedia.ts` (zod schema XOR product_id/variant_id)

Tests : 274 → 317 (+43 variants/media).

Commits : `1dfd2e8`, `61827e4`.

---

## ÉTAPE 4a — Champs Chairs/Armchairs/designer/owner_brand_id (2026-05-01)

Migration appliquée :
- `20260501124427_products_extend_chairs_armchairs_designer_owner`

6 nouvelles colonnes sur `products` : `has_armrests`, `chair_structure_type`,
`outdoor_classification`, `usage_mode`, `primary_designer`, `owner_brand_id`.
Backfill `owner_brand_id` depuis `partner_id` : 52/53 produits backfillés
(1 orphelin sans partner_id détecté).

Commit : `1af3068`.

---

## ÉTAPE 4a-bis — Cleanup produit orphelin "Lp" (2026-05-01)

Investigation : produit "Lp" / collection "Summ" / partner_id NULL identifié,
0 enfant FK sur 18 tables consommatrices. Décision founder : suppression.

Migration appliquée :
- `20260501125446_cleanup_orphan_test_product_lp`

Snapshot CSV pré-suppression : `docs/chantiers/2026-05/snapshot_deleted_test_product_lp.csv`.
Catalogue passe de 53 à 52 produits sains.

Commit : `6b1621a`.

---

## ÉTAPE 4b — Migration 52 produits → default variants (2026-05-01)

Bug détecté en cours de migration : FK `price_currency text REFERENCES markets(code)`
sémantiquement incorrecte (markets.code = zone géographique, pas devise ISO 4217).
Première tentative INSERT rollbackée.

Migration corrective :
- `20260501130644_relax_variants_price_currency_to_text` (DROP FK + CHECK regex `^[A-Z]{3}$`)

Migration finale :
- `20260501130815_migrate_52_products_to_default_variants` (52 INSERT default variants)

Compteurs : 52 = 52 = 52 (products × variants × default). Tous les 52 fabric_certification='Unknown'
mappent vers `material_brands.slug='unknown'` via CTE alignée avec materialBrandsMapping.ts.

Audit trail : `snapshot_products_pre_migration.csv`, `snapshot_products_post_migration.csv`,
`snapshot_variants_post_migration.csv`. Diff products pre/post = 0 (additive strict).

Tests : 317 → 324 (+7 mapping fabric).

Commits : `e579df1`, `95c65b3`.

---

## ÉTAPE 5 — Multi-tenant brand_users + RLS owner_brand_id (2026-05-02)

### 5.1 Investigation préalable
1 seul partner ("Pros Import") détient les 52 produits, user_id présent → pas de
décision founder requise.

### 5.2 brand_users table + helpers
Migration appliquée :
- `20260501131806_create_brand_users_and_helpers` (table + 2 helpers SECURITY DEFINER)

Helpers `is_brand_member(brand, user)` et `is_brand_owner(brand, user)` avec
`STABLE`, `SET search_path`, `REVOKE FROM PUBLIC`, `GRANT TO authenticated, service_role`.
Backfill : 1 ligne (Pros Import + user, role='owner').

### 5.3 Remplacement RLS products/variants/media
Migration appliquée :
- `20260501132154_replace_rls_products_variants_media_with_owner_brand`

Pattern "combined OR" : DROP 21 policies legacy + CREATE 12 policies consolidées.
Réduction `multiple_permissive_policies` : **693 → 638 (-55)**, marge sous seuil
700 passe de 7 à 62. Behavioral change signalé : drafts non visibles aux
authenticated non-membres (cohérence multi-tenant).

DELETE strict : seul `role='owner'` peut DELETE (helper `is_brand_owner`).

### 5.4 Vérifications
- 5/5 cas RLS comportementaux validés via `SET LOCAL ROLE` + `request.jwt.claim.sub`
  (Cas 1 anon → 51 published / Cas 2 brand member → 52 incl. drafts / Cas 3 random
  authenticated → 51 / Cas 4 INSERT own brand OK / Cas 5 INSERT NULL/other brand bloqué)
- Helpers TS livrés : `src/lib/brandUsers.ts` (zod, helpers `canWriteAsRole`/`canDeleteAsRole`)
- Tests : 324 → 344 (+20 brand-users)

### 5.5 Correction post-validation
Détection : Supabase `ALTER DEFAULT PRIVILEGES` accorde EXECUTE à anon malgré
`REVOKE FROM PUBLIC`. Migration corrective :
- `20260501135941_revoke_brand_helpers_execute_from_anon` (REVOKE EXECUTE FROM anon explicite)

Advisors `anon_security_definer_function_executable` : 25 → 23 (-2).

Commits : `8fb6bff`, `d4c0a7e`, `cd6e661`, `d95ca6b`, `9fda8f2`.

---

## ÉTAPE 6a — Refonte AddProductForm split modèle/variants (2026-05-02)

**Variant retenue : Option B "semantic split"** (arbitrage 2026-05-02).

Contexte : analyse de `AddProductForm.tsx` (1486 lignes) a révélé un coupling
profond du state local (11 useState, 3 refs, 15+ handlers, 4 render helpers).
Une extraction JSX complète vers `ProductModelForm.tsx` aurait demandé soit un
refactor Context (1.5j, risque régression élevé), soit un prop drilling massif
(anti-pattern, ~30 props).

**Décision arbitrée** :
- **Option A (extraction Context complète)** refusée : 1.5j pour zéro valeur user-visible
- **Option B (semantic split + tab placeholder)** retenue : 3h, ancrage architectural durable
- **Option C (découpage progressif sans ancrage)** refusée : manque de marker

L'extraction JSX vraie est **différée Phase 2** quand le state autour de
variants[] sera stabilisé et les patterns d'usage observés.

Fichiers livrés :
- `src/components/partner-dashboard/VariantsSection.tsx` — placeholder isolé,
  affiche un message explicite "Section Variantes — disponible ÉTAPE 6b" + icône
  + copy informatif (66 lignes, aucun coupling avec AddProductForm)
- `src/components/partner-dashboard/ProductModelForm.tsx` — alias documentaire
  pointant vers `AddProductForm` avec commentaire JSDoc explicite sur l'intention
  architecturale (28 lignes, encourage les imports `ProductModelForm` dans le
  nouveau code Phase 1+)
- `src/components/partner-dashboard/AddProductForm.tsx` — modifications minimales :
  - Import `Layers` icône + `VariantsSection`
  - Ajout `{ id: "variants", label: "Variantes", icon: Layers }` à `SECTION_TABS`
  - Type union `section` étendue avec `"variants"`
  - Bloc render `{section === "variants" && <VariantsSection />}` après pricing
  - Suivant button : s'arrête à `pricing` (ne pousse pas vers placeholder), Save
    button reste visible sur pricing (régression zéro sur le flow existant)

Tests : 344 → 346 (+2 sanity VariantsSection).

UX résultante :
```
┌────────────────────────────────────────────────────────┐
│ Photo & IA │ Informations │ Caracs │ Prix & Stock │ Variantes │
└────────────────────────────────────────────────────────┘
                                              │
                                              └─→ placeholder
                                                  ÉTAPE 6b
```

Régression zéro confirmée : flow photo→basics→specs→pricing→Save inchangé.
La tab "Variantes" reste optionnelle (clic direct sur l'onglet).

Commits ÉTAPE 6a : (à venir).

---

## ÉTAPE 6b — VariantsGrid avec autocomplete + validation Zod (2026-05-02)

**Décision technique** : Tanstack Table **non installé** (n'était pas dans les
deps), pattern HTML table + React state retenu. Avantages :
- 0 nouvelle dependency
- Plus simple à maintenir Phase 1
- Performance suffisante pour <100 variants typiques
- shadcn/ui `command` + `popover` couvrent l'autocomplete

Fichiers livrés :
- `src/lib/variantsGridHelpers.ts` — types + zod schema + makeEmptyVariantRow
  (extrait de VariantsGrid pour éviter le warning eslint
  react-refresh/only-export-components)
- `src/components/partner-dashboard/VariantsGrid.tsx` — grille editable HTML
  table + Combobox shadcn (popover + command + cmdk) + validation Zod inline.
  ~430 lignes. 9 colonnes : SKU / L / l / Tissu / Couleur / Finition / Prix /
  Stock / Default + bouton supprimer.
- `src/components/partner-dashboard/VariantsSection.tsx` — wrapper qui rend
  VariantsGrid + texte d'aide. Le placeholder ÉTAPE 6a est remplacé.

Référentiels chargés via React Query (staleTime 5 min) :
- material_brands filtré category='fabric' → 12 lignes en DB
- colors_canonical → 49 lignes
- finishes_canonical → 30 lignes

Validation et UX :
- Validation Zod par row inline (variantRowSchema slim, sans product_id)
- Counter global "X / Y valides" coloré (rouge si invalid, vert si OK)
- Warnings cross-row : "plusieurs default" et "aucun default"
- Add row : si premier row, marqué is_default=true automatiquement
- Delete row : si on supprime le default et qu'il reste des rows, le premier
  remaining devient default (pas de cas "aucun default" possible suite à delete)
- Radio is_default : exclusif (changer = retirer des autres)

State management :
- State local au composant VariantsGrid (useState array)
- Prop `onChange` pour notifier le parent (préparation ÉTAPE 6c)
- Prop `initial` pour fournir des rows existantes (préparation édition)
- ÉTAPE 6c branchera ce state au form parent + persistance via
  useProductSubmissions adapté

Tests : 346 → 367 (+21 tests : 11 helpers + 10 grid behavioral).
- variants-grid-helpers.test.ts : defaults, schema valid/invalid (price negatif,
  width hors borne, uuid, sku trop long, etc.)
- variants-grid.test.tsx : empty state, render initial rows, add row, first row
  is_default automatique, delete row, default radio, multiple-defaults warning,
  no-default warning, onChange notifications, delete default promotes first
- variants-section-placeholder.test.tsx : mis à jour pour le nouveau contenu

Cumul commits ÉTAPE 6 : 6a (3) + 6b (4 prévus) = 7.

## Phase 2 backlog (non implémenté Phase 1)

Pendant ÉTAPE 6b, plusieurs idées d'amélioration UX ont été identifiées mais
volontairement non implémentées (R-9 mitigation, MVP strict Phase 1) :

- **Drag&drop reorder de rows** : UX cool mais non bloquant
- **Bulk paste depuis Excel/CSV** : utile mais Phase 2 ingestion IA
- **Smart suggestions IA** : "vous avez créé 3 variants Sunbrella, ajouter
  automatiquement les 5 couleurs Sunbrella populaires"
- **Inline image upload par variant** : à scoper avec product_media en ÉTAPE 7+
- **Tooltips d'aide contextuelle riches** : ergonomie Phase 2
- **Génération automatique de SKU** depuis nom modèle + dimensions + couleur
- **Filtre/recherche dans la grid** : utile au-delà de ~50 variants
- **Markdown WYSIWYG par variant** : hors scope

## ÉTAPE 6c — useProductSubmissions adapté + bulk actions (2026-05-02)

### Découverte architecturale et arbitrage Option B

Au début d'ÉTAPE 6c, l'analyse de `useProductSubmissions.ts` a révélé que le
flow partner submit n'insère PAS dans `products` directement — il insère dans
`product_submissions` (queue de validation). C'est l'admin via `approveAsNew`
qui crée la ligne `products` plus tard.

Le pattern "Phase A INSERT product / Phase B INSERT variants / cleanup" du
brief initial était basé sur une hypothèse incorrecte sur le flow. Trois
options proposées au founder :
- **Option A** : périmètre étendu (partner submit + admin approval matérialise
  variants) — 1.5j
- **Option B** retenue : partner submit sérialise variants[] dans
  `product_submissions.product_data` ; matérialisation différée à ÉTAPE 7
  (refonte ProductReviewHelpers) — 1j
- **Option C** : 6c-bis admin séparé — refusée pour ne pas fragmenter

Justification Option B :
- Respecte le calendrier ÉTAPE 6 (3-4j initial)
- Zéro régression sur le flow admin existant
- Démo Salone crédible (partner voit la saisie + sérialisation)
- 30-50 produits démo × 3-5 variants = ~150-250 variants à matérialiser
  manuellement avant Salone si besoin = 30 min de travail SQL pas un goulot

### Fichiers modifiés / créés

`src/hooks/useProductSubmissions.ts` (831 → ~890 lignes) :
- Signature `submitProduct` étendue avec `options.variants?: LocalVariantRow[]`
- Defense-in-depth validation côté hook (en plus de la validation côté UI) :
  - Si `variants.length > 0` : exactement 1 variant `is_default=true` requise
  - Validation `variantRowSchema` par row (zod)
- Sérialisation : `variants[]` est embedded dans `product_data` (jsonb) avec
  `_localId` strippé (champ React-only, pas pertinent en DB)
- Rétrocompat 100% : si `variants` undefined ou vide, payload identique à
  avant ÉTAPE 6c

`src/components/partner-dashboard/AddProductForm.tsx` :
- Ajout state local `variants: LocalVariantRow[]` initialisé avec
  `[makeEmptyVariantRow(true)]` (1 variant default vide)
- VariantsSection reçoit `initial={variants}` + `onChange={setVariants}`
- Au Save, pré-remplissage de la default variant depuis le form modèle
  (dimensions / prix / stock) si valeurs grid laissées vides — préserve
  régression zéro pour partners qui ne touchent pas l'onglet Variantes
- `submitProduct` reçoit `enrichedVariants` dans options

`src/components/partner-dashboard/VariantsGrid.tsx` :
- Ajout colonne checkbox de sélection (header avec "select all")
- Ajout state `selectedIds: Set<string>`
- 4 nouveaux callbacks bulk : `bulkApplyPrice`, `bulkToggleStock`,
  `bulkDuplicateWithDimensions`, `clearSelection`
- Render `<VariantBulkActions />` au-dessus de la table quand selection > 0
- Highlight bleu sur les rows sélectionnées (cohérence visuelle)

`src/components/partner-dashboard/VariantBulkActions.tsx` (nouveau, ~180 lignes) :
- Composant présentationnal (props in / callbacks out)
- 3 bulk operations Phase 1 :
  1. **Apply price** : popover avec input numérique, applique à toutes les rows sélectionnées
  2. **Duplicate with dimensions** : popover avec input "100, 120, 140",
     duplique 1 row sélectionnée N fois en variant width_cm + auto-suffixe SKU
     (ex: "A" → "A-w100", "A-w120")
  3. **Toggle stock** : 2 boutons (En stock / Hors stock) qui marquent les
     rows sélectionnées
- Bouton "Désélectionner" pour clear

### Tests Vitest

Total tests : 367 → 384 (+17).

`src/test/use-product-submissions-variants.test.ts` (9 tests) :
- Validation logic isolée (rétrocompat 0 variants, exactement 1 default,
  rejet no-default, rejet multiple-default, rejet row invalide)
- Payload serialization (productData inchangé sans variants, embedded avec,
  `_localId` strippé)

`src/test/variants-bulk-actions.test.tsx` (8 tests behavioral) :
- Toolbar caché si 0 row sélectionnée, affiché si >0
- Select all → 3/3 sélectionnées
- Apply price : seules les rows sélectionnées sont mises à jour
- Toggle stock : in_stock=true sur sélectionnées
- Duplicate : 3 + 2 widths = 5 rows, SKU auto-suffixé "A-w100"
- Duplicate button disabled si 0 ou >1 sélection
- Clear selection → toolbar disparaît

### Hors scope (rappel)

- ❌ Bulk delete (UX risk, déléter accidentellement)
- ❌ Bulk apply fabric_color (trop spécifique Phase 1)
- ❌ Import CSV (Phase 2 ingestion)
- ❌ Drag&drop reorder (Phase 2)
- ❌ Edge function transactionnelle (Phase 2 si besoin observé)
- ❌ Modification de `approveAsNew` (différée ÉTAPE 7)

### Validation E2E ÉTAPE 6c

50% validation manuelle browser par founder + 50% vérification croisée
Claude Code via lecture des chemins de code (state init, enrichissement
handleSave, validation hook, bulk handlers). Approche pragmatique acceptée
2026-05-02.

Validation E2E complète **différée à la fin du chantier (post-ÉTAPE 9)**
via `docs/testing/E2E_VALIDATION_NOTEBOOK.md` (32 cas structurés en 6 blocs,
90-120 min de validation consolidée). Cohérent avec stratégie de validation
consolidée fin de chantier plutôt que validation au fil de l'eau qui dilue
la vigilance founder sur Day 4-5.

Edge case identifié pendant l'audit code : le scenario "2 rows is_default=true
simultanément" est **structurellement empêché par le radio exclusif** dans
`setDefault` (VariantsGrid.tsx). Le warning UI "Plusieurs default" + la
validation hook restent un garde-fou défensif (defense in depth) jamais
déclenché via flow normal. La validation reste néanmoins couverte par les
9 tests `use-product-submissions-variants.test.ts`.

### Préparation ÉTAPE 7

Note pour la refonte ProductReviewHelpers :
- `approveAsNew` (ligne ~280 de useProductSubmissions) devra être adapté pour
  matérialiser `product_data.variants` en lignes `product_variants` après
  l'INSERT products
- Pattern attendu : 2-phase (Phase A INSERT product / Phase B INSERT variants /
  cleanup applicatif `DELETE products WHERE id = newProductId` si Phase B fail)
- Si en attendant ÉTAPE 7 il faut matérialiser des variants pour Salone : faire
  manuellement via `mcp__supabase__execute_sql` ou un script admin one-shot
- Tests d'admin approval avec variants à écrire en ÉTAPE 7

## ÉTAPE 6d — Tests intégration + dépréciation legacy editors (2026-05-02)

### Tests d'intégration React Testing Library

`src/test/variants-integration.test.tsx` (nouveau, 7 tests) :
- Stratégie : tests behavioral isolés sur VariantsGrid + bulk actions déjà
  livrés ÉTAPES 6b/6c. Les tests intégration vérifient la chaîne
  `VariantsGrid (state) → onChange → parent state → submit payload`
  bout-en-bout sans rendre le composant AddProductForm entier (évite la
  fragilité des mocks i18n + Auth + supabase storage).
- Wrapper `FormHarness` réplique l'orchestration AddProductForm avec un
  state local + bouton "Simulated Save" qui invoque un callback de submit.
- Helper `simulateSubmitPayload` réplique la logique du hook
  (validation cross-row + sérialisation avec strip _localId).

Tests livrés :
1. Submit avec 1 default variant initiale (régression zéro flow)
2. Submit avec 3 variants après ajout manuel via "Ajouter une variante"
3. Rejet validation no-default
4. Rejet validation multiple-default
5. Strip `_localId` de chaque variant sérialisée
6. Backward compat : variants vide → product_data sans clé `variants`
7. VariantsSection rend le help text + grid empty state au mount

### Dépréciation soft des éditeurs legacy

JSDoc `@deprecated` ajouté en tête de :
- `src/components/admin/ColorVariantEditor.tsx` (167 lignes)
- `src/components/admin/DimensionVariantEditor.tsx` (276 lignes)

Note : les fichiers sont en réalité dans `src/components/admin/` (pas
`src/components/partner-dashboard/` comme indiqué initialement dans le
brief). Ils éditent les champs legacy `products.color_variants` et
`products.dimension_variants` (jsonb). Conservés pour backward compat
du UI admin actuel — suppression Phase 2 quand le code applicatif sera
entièrement aligné sur `product_variants` (Q5 reco A).

Aucune suppression de fichier ÉTAPE 6d. Aucun retrait d'import.

### Vérifications finales ÉTAPE 6d + ÉTAPE 6 globale

- `bunx vitest run` : **391 / 391 verts** ✅ (cible 390+ atteinte)
- `bunx tsc --noEmit` : passe ✅
- `bun run lint` : 612 baseline préservé ✅
- Advisors : `multiple_permissive_policies` **638** (stable depuis ÉTAPE 5) ✅

---

## ÉTAPE 6 — Synthèse consolidée (clôture 2026-05-02)

### Vue d'ensemble

| Sub-étape | Date | Effort réel | Cible spec | Livraison |
|---|---|---|---|---|
| 6a | 2026-05-02 | 2h30 | 1j | ProductModelForm alias + VariantsSection placeholder + tab Variantes |
| 6b | 2026-05-02 | ~5h | 1j | VariantsGrid (HTML table + Combobox shadcn + Zod inline) + 21 tests |
| 6c | 2026-05-02 | ~5h | 1j | useProductSubmissions adapté (variants[] in product_data) + state plumbing + VariantBulkActions (3 ops) + 17 tests |
| 6d | 2026-05-02 | ~2h | 0.5-1j | Tests intégration RTL (7) + dépréciation legacy editors |
| **Total** | | **~14-15h** | **3.5-4j** | sous le budget initial |

### Décisions techniques majeures (arbitrages 2026-05-02)

1. **Option B "semantic split"** ÉTAPE 6a : pas d'extraction JSX complète vers
   ProductModelForm (1.5j risque régression élevé), alias documentaire +
   nouveau placeholder à la place. Vraie extraction différée Phase 2.
2. **Pas de Tanstack Table** ÉTAPE 6b : HTML table + React state suffit
   pour <100 variants typiques, économise une dependency.
3. **Option B "asynchronous variant materialization"** ÉTAPE 6c : variants[]
   sérialisée dans `product_submissions.product_data` au submit partner ;
   matérialisation en lignes `product_variants` différée à ÉTAPE 7
   (refonte ProductReviewHelpers admin).

### Code livré ÉTAPE 6 (récapitulatif)

| Fichier | Type | Lignes |
|---|---|---:|
| `src/components/partner-dashboard/VariantsSection.tsx` | nouveau (puis refondu 6b) | 30 |
| `src/components/partner-dashboard/ProductModelForm.tsx` | nouveau (alias) | 28 |
| `src/components/partner-dashboard/VariantsGrid.tsx` | nouveau | 480 |
| `src/components/partner-dashboard/VariantBulkActions.tsx` | nouveau | 180 |
| `src/lib/variantsGridHelpers.ts` | nouveau | 67 |
| `src/components/partner-dashboard/AddProductForm.tsx` | modifié | +50 lignes |
| `src/hooks/useProductSubmissions.ts` | modifié | +60 lignes |
| `src/components/admin/ColorVariantEditor.tsx` | annoté @deprecated | +12 |
| `src/components/admin/DimensionVariantEditor.tsx` | annoté @deprecated | +12 |
| Tests (5 fichiers) | nouveau | ~750 |

### Tests cumulés ÉTAPE 6

| Fichier de test | Tests | ÉTAPE |
|---|---:|---|
| variants-section-placeholder.test.tsx | 2 | 6a (mis à jour 6b) |
| variants-grid-helpers.test.ts | 11 | 6b |
| variants-grid.test.tsx | 10 | 6b |
| use-product-submissions-variants.test.ts | 9 | 6c |
| variants-bulk-actions.test.tsx | 8 | 6c |
| variants-integration.test.tsx | 7 | 6d |
| **Total ÉTAPE 6** | **47** | |

Évolution tests Vitest globale : 344 (fin ÉTAPE 5) → **391** (fin ÉTAPE 6).

### Validation E2E ÉTAPE 6

- 50% manuelle browser par founder + 50% vérification croisée Claude Code
  via lecture chemins de code (state init, enrichissement handleSave,
  validation hook, bulk handlers)
- Validation E2E complète différée à la fin du chantier (post-ÉTAPE 9)
  via `docs/testing/E2E_VALIDATION_NOTEBOOK.md` (32 cas en 6 blocs)
- Cohérent avec stratégie de validation consolidée fin de chantier

### Limitations connues post-ÉTAPE 6 (différées Phase 1+ ou Phase 2)

| Limite | Reportée à |
|---|---|
| Variants pas matérialisées en lignes `product_variants` au submit (jsonb embedded) | ÉTAPE 7 (admin approval) |
| Bulk delete | Phase 2 (UX risk) |
| Drag&drop reorder | Phase 2 |
| Smart suggestions IA | Phase 2 |
| Bulk paste depuis Excel/CSV | Phase 2 ingestion |
| Génération auto SKU | Phase 2 backlog |
| i18n français hardcodé | ÉTAPE 6c+ ou Phase 2 |
| Inline image upload par variant | ÉTAPE 7+ |

## ÉTAPE 7 — UI admin matérialisation variants (2026-05-02)

### Note méthodologique — drift prevention

Pendant la validation ÉTAPE 7 le 2026-05-02, le founder a supprimé
manuellement 2 products tests (matérialisés via approbation de submissions
tests) hors migration versionnée. Cette suppression hors-migration enfreint
la règle "drift prevention" actée 2026-04-30 dans `CLAUDE.md`. Pour
préserver la cohérence audit trail, la migration
`20260502091832_document_etape_7_test_products_cleanup.sql` documente
officiellement cet événement (DO block validation sans DELETE puisque la
suppression est déjà faite).

À éviter à l'avenir : toute modification DB doit passer par une migration
versionnée locale AVANT apply.

Snapshot CSV pré-suppression : **non disponible** (suppression hors-process).
Audit trail des données détruites perdu.

Products tests supprimés manuellement :
- `bbac50af-bd78-473f-8bfd-75c5da256328` ("TEST ÉTAPE 7 - Variants", injecté SQL Phase 1)
- `8069f268-3bf6-4365-ab15-f1f7576fed61` ("Test Vari Tables", flow partner Phase 2)

Submissions associées (laissées en DB, FK SET NULL → `approved_product_id` NULL) :
- `db567bcb-2c9e-4bfc-96a7-f7d8b0f58f93`
- `8c8f43e8-6b6f-4a31-8216-7fb11513039b`

### Pattern 2-phase + cleanup applicatif (livré)

L'admin approval (`approveAsNew` dans `useProductSubmissions.ts`) implémente
maintenant le pattern défensif suivant :

```
Phase A : INSERT products  (existant, inchangé)
   ↓
Phase B : INSERT product_variants[]  (NOUVEAU ÉTAPE 7)
   ↓
   ├─ succès    → continue product_offers + update submission
   └─ échec     → DELETE products WHERE id = newProduct.id (cleanup)
                  → throw "Échec création variantes. Produit nettoyé."
```

Si le DELETE de cleanup échoue lui-même (cas extrême) : log critical +
throw avec id du produit orphelin pour suppression manuelle. Logging vers
Sentry/audit prévu Phase 2 (cf. backlog).

### Décisions techniques

- **Logique pure extraite** dans `src/lib/variantsMaterialization.ts` :
  - `buildVariantInserts(productId, serializedVariants, productDataFallback, validatedBy)` :
    - Cas nominal (variants présentes) : map chaque variant à un insert payload
    - Cas fallback (variants absent ou vide → submissions legacy pré-ÉTAPE 6c) :
      retourne 1 default variant pré-rempli depuis productDataFallback
      (dimensions_*, price_min, stock_status, weight_kg)
  - `assertExactlyOneDefault(variants)` : defense in depth pour les variants
    arrivant côté admin (rejet si 0 ou >1 default)
- **Source-of-truth séparée** : la transformation est testable purement
  (10 tests Vitest) sans monter supabase ni React.
- **Régression zéro** : les submissions legacy (pas de `product_data.variants`)
  reçoivent automatiquement 1 default variant via le path fallback.
- **`validated_by` reste null Phase 1** — track admin user_id Phase 2 (nécessite
  passer `useAuth` à `useAdminSubmissions`, refactor mineur reporté).

### Affichage admin (read-only)

`src/components/admin/ProductReviewHelpers.tsx` (`ProductDetailCard`) :
- Section "Variantes proposées (X)" affichée si `product_data.variants`
  contient des éléments
- Tableau read-only : SKU / L × l / Tissu / Couleur / Finition / Prix / Stock / Default
- Compteur "X marquée default" en header
- Note explicative : "Ces variantes seront matérialisées en lignes
  product_variants à l'approbation (Phase B). Édition Phase 2."

Édition admin des variants AVANT approval **différée Phase 2** (stretch goal
du brief, peu de valeur ajoutée Phase 1 puisque le partner garde la main
sur sa submission jusqu'à la validation).

### Code livré ÉTAPE 7

| Fichier | Type | Lignes |
|---|---|---:|
| `src/lib/variantsMaterialization.ts` | nouveau | 130 |
| `src/hooks/useProductSubmissions.ts` (`approveAsNew`) | modifié | +75 |
| `src/components/admin/ProductReviewHelpers.tsx` (`ProductDetailCard`) | modifié | +75 |
| `src/test/variants-materialization.test.ts` | nouveau (10 tests) | 145 |

### Tests cumulés

`src/test/variants-materialization.test.ts` (10 tests) :
- Cas nominal : N variants matérialisées avec champs mappés directement
- Préservation null pour champs optionnels
- Fallback legacy : 1 default depuis productDataFallback (variants absent)
- Fallback : objets quasi-vides traités proprement
- Conversion `price_min` string → number
- `in_stock=true` si stock_status='in_stock' ou 'low_stock'
- `in_stock=false` pour stock_status non-stock
- `assertExactlyOneDefault` : ok / no_default / multiple_default

Total tests : 391 → **401 verts**.

### Vérifications ÉTAPE 7

- `bunx vitest run` : 401 / 401 ✅
- `bunx tsc --noEmit` : passe ✅
- `bun run lint` : 612 baseline ✅
- Advisors : inchangés (aucune migration DDL ÉTAPE 7) — `multiple_permissive_policies`
  toujours 638
- Régression flow admin : approval submissions legacy → 1 default variant
  auto-créée (path fallback) ✅

### Hors scope (rappel)

- ❌ Édition admin des variants AVANT approval (Phase 2)
- ❌ Edge function transactionnelle (Phase 2 si besoin)
- ❌ Bulk approve plusieurs submissions (Phase 2)
- ❌ Track `validated_by` admin user_id (refactor `useAdminSubmissions`
  Phase 2, nécessite `useAuth` import)
- ❌ Sentry/audit log pour cleanup catastrophique (Phase 2)

### Phase 2 backlog

Si la stratégie cleanup applicatif rencontre des limites en pratique
(concurrent inserts entre products INSERT et variants INSERT, race
conditions FK), créer une edge function "approve-with-variants"
transactionnelle côté serveur (Postgres BEGIN / COMMIT / ROLLBACK).

## Cibles ÉTAPE 8 (à venir, 1-2j)

ÉTAPE 8 = UI admin pour gérer les référentiels Phase 1 :
- Page admin liste `material_brands` avec CRUD
- Page admin liste `certifications` avec CRUD
- Pages admin légères pour `colors_canonical` et `finishes_canonical`
  (nice-to-have, peut être différé Phase 2 si trop)

Effort estimé : 1-2 jours.

## ÉTAPE 9a-fix-2-γ — Cart display + persistence variant-aware

### γ-1 — Display + Hydration (2026-05-02)

- `fetchProductsByIds` (`src/lib/products.ts`) : ajoute application de
  commission upstream (plan + override `partner_subscriptions.commission_rate`)
  alignée sur `fetchProductById`. Hide `brand_source` pour Starter.
- `fetchVariantsByIds` (`src/lib/productVariants.ts` NEW) : batch fetcher
  pour cart display. 3 queries totales (variants + products + partners/subs)
  → évite N+1 avec commission par partner correctement appliquée même sur
  variants de products distincts.
- `ProjectCartContext.tsx` hydration : remplace `from("products").select("*")
  .in("id", ...)` raw par `fetchProductsByIds` (commission cohérente avec
  listing/detail).
- `ProjectCart.tsx` page :
  - `useQuery` cart-variants (queryKey stable via sortedVariantIdsKey,
    staleTime 2 min)
  - Map `variantsById` lookup O(1)
  - Suppression de la priorité ad-hoc `selectedSupplier?.price ?? dimPrice
    ?? price_min` → centralisée dans `getEffectiveCartPrice(item, variants)`
  - Affichage variant : `variant_name` après nom du product, dimensions
    `variantDimensionLabel` en sous-ligne
  - Legacy color/dimension labels conservés si `!modelBVariant` (régression
    zéro 51/52 products)
  - Key composite `product.id + variantId` distingue 2 lignes même product
- Tests : +10 (`cart-display-fetchers.test.ts`)
- Régression : 0 (tests cumulés 443 → 453)

### γ-2 — Audit downstream + saved_carts persistence (2026-05-02)

**Audit downstream — findings :**

| Callsite | Crash risk | Comportement Modèle B | Action |
|---|---|---|---|
| `ProjectCart.tsx` INSERT `project_cart_items` | NONE (variant_id ignoré) | Variant LOST en DB | Dette Phase 2 |
| `ProjectCart.tsx` INSERT `quote_requests` | NONE | Variant LOST + prix peut être faux | Dette Phase 2 |
| `SourcingSummary.tsx` (budget stats) | NONE | Total faux pour Modèle B | **Patché γ-2** |
| `cartPdfExport.ts` (PDF export) | NONE | Legacy info, pas variant | Dette Phase 2 (founder dit "laisser tel quel") |
| `ConceptCard.tsx` `addItem(...)` 4 args | NONE | Backward compat ✅ | OK |
| `useArrivals.ts` (partner_arrival_items) | NONE | Pas de CartItem dependency | OK |
| `QuoteRequestModal.tsx` | NONE | Pas de CartItem dependency | OK |

**Patches γ-2 :**

- `SourcingSummary.tsx` : ajoute prop optionnelle `variants?: DBProductVariant[]`,
  `computeStats` utilise `getEffectiveCartPrice(item, variants)` pour
  `totalBudget` et `hasBudget`. ProjectCart wire `variants` via le prop
  (les variants déjà fetchés en γ-1 sont passées).
- saved_carts persistence : pas de modification — `serializeCartItems` (α)
  et hydration (γ-1) gèrent déjà `selectedModelBVariantId`. Tests
  d'intégration ajoutés pour confirmer.
- Tests : +5 (`cart-saved-persistence.test.tsx`)
  - upsert préserve `selectedModelBVariantId` pour 2 variants distinctes
  - rehydration restitue `selectedModelBVariantId`
  - backward compat : saved_cart pré-β sans variant_id → undefined sans crash
  - cas défensif : variant supprimée DB → item rehydraté sans crash, fallback
    `getEffectiveCartPrice` sur `price_min` (testé séparément dans
    `cart-helpers.test.ts`)
  - rehydration mixte 1 Modèle B + 1 legacy → 2 items distincts
- Tests cumulés : 453 → **458**, lint 611 (-1 vs baseline 612), tsc clean

### Limitations Phase 1 + Backlog Phase 2

**Tables `project_cart_items` et `quote_requests` n'ont pas de colonne
`variant_id`.** Conséquence : quand un client soumet un cart contenant
un Modèle B variant, l'identité de la variant est PERDUE en DB côté
flow project_request / quote_request. Le partenaire reçoit l'offre
sans savoir quelle variant exacte a été sélectionnée.

**Workaround Phase 1 :** la chaîne `selected_offer_id` + `selected_price`
+ `selected_dimension_tag` (legacy) capture suffisamment d'info pour
le flow legacy 1-variant. Pour Modèle B avec une seule variante par
product (51/52 products actuels), pas de différence visible.

**Backlog Phase 2 (à planifier après ÉTAPE 10) :**

- Migration DDL ajout colonne `variant_id uuid` (FK `product_variants(id)`,
  `ON DELETE SET NULL`) sur `project_cart_items` ET `quote_requests`.
- Adapter `ProjectCart.tsx` INSERTs pour persister
  `item.selectedModelBVariantId`.
- Adapter `partner-dashboard` quote view pour afficher le variant
  sélectionné (current : montre seulement `selected_dimension_tag`).
- Adapter `cartPdfExport.ts` pour montrer dimensions/variant info
  via `variantDimensionLabel(variant)` quand un variant_id est présent
  (signer optionnel `variants?: DBProductVariant[]` cohérent avec
  SourcingSummary).
- Effort estimé Phase 2 : 0.5-1 jour.

### ε — Stock variant-aware drawer + SupplierRecommendations (2026-05-04)

Suite Bug 7 (déféré δ-3 puis arbitré urgent founder pour cohérence
avec le fix prix Phase 2) : le panel SUPPLIER OPTIONS et le badge
availability en haut du drawer affichaient le stock du PRODUCT (ou
de l'OFFER), pas de la VARIANT Modèle B sélectionnée.

**Patches** :

- `src/lib/productAvailability.ts` (NEW) : helper pur `getAvailabilityFromVariant(v, p)`
  retourne le shape `AvailabilityInfo` avec 4 branches :
  1. `is_made_to_order=true` → "Made to order" + lead time
     (variant `delivery_weeks_min/max` > product `estimated_delivery_days`)
  2. `in_stock=true` + `stock_quantity ≤ 20` → "Low stock" + count
  3. `in_stock=true` (qty > 20 ou null) → "In stock" générique
  4. `in_stock=false && !is_made_to_order` → "Availability on request"
- `ProductDetailDrawer.tsx` : useQuery `fetchVariantsByIds([variantId])`,
  utilise `getAvailabilityFromVariant` quand variant trouvée. Mapping
  `iconKey` → composant lucide local.
- `SupplierRecommendations.tsx` : nouveaux helpers locaux
  `effectiveStockStatusOf(offer)` et `effectiveStockQuantityOf(offer)`
  (mêmes branches mapping → "made_to_order" / "in_stock" /
  "out_of_stock"). 2 sites display (recommended + others) patchés.

**Tests** :
- `drawer-availability-variant.test.ts` (NEW) : 9 tests sur les 4 branches
  + edge cases (lead time variant > product fallback > "Lead time on request").
- `supplier-recommendations-variant.test.tsx` : +3 tests stock variant-aware
  (made_to_order, out_of_stock, régression zéro legacy).
- Tests cumulés : 474 → **486** (+12).

**Data quality issue documentée Phase 2** :

> Cas DB invalide observé sur DEMO-T-160 : `in_stock=false &&
> is_made_to_order=false && stock_quantity=null`. Cette combinaison
> ne correspond à aucun état métier propre. Mapping ε retourne
> "Availability on request" par défaut (sémantique honnête), mais
> idéalement le formulaire partenaire / admin devrait interdire ces
> combinaisons ou imposer un statut explicite (ex: si `in_stock=false`,
> exiger soit `is_made_to_order=true` avec lead time, soit
> `discontinued_at` set).
>
> Action Phase 2 : ajouter validation côté `useProductSubmissions` zod schema +
> `VariantsGrid` partner UI + admin variant editor.

**Dette technique pré-existante (hors scope ε)** :

- i18n complet du `ProductDetailDrawer` : labels "Available for
  immediate dispatch" / "Made to order" / "Low stock" / "In stock" /
  "Availability on request" hardcoded en anglais (pas via `t()`).
  Le helper `getAvailabilityFromVariant` reproduit les mêmes strings
  pour cohérence. À i18n-iser Phase 2 (effort ~30 min, 4 locales).

### ζ — Stock visibility cart list + summary banner (2026-05-04)

Suite ε (drawer panel fixé) : le bandeau `SourcingAlerts` affichait
"All items sourced and available — project is ready for quotation"
en vert même quand un variant Modèle B était `in_stock=false` ou
`is_made_to_order`, parce que la logique `computeAlerts` ne
consultait que `selectedSupplier.stockStatus` (offer-level), pas la
variant. Friction commerciale : un acheteur soumettait un cart avec
items non-disponibles sans le savoir.

**Patches** :

- `src/lib/cartHelpers.ts` : nouveau helper `getEffectiveStockStatus(item, variants)`
  retournant `'in_stock' | 'made_to_order' | 'availability_on_request' | null`.
  Priorité variant Modèle B → fallback `product.stock_status` reconnu →
  null pour valeurs inconnues / absentes (régression zéro pour les 51
  legacy products sans stock_status défini).
- `src/components/project/SourcingAlerts.tsx` : prop optionnel `variants`,
  ajoute filtre `variantUnavailable` dans `computeAlerts` qui détecte les
  items dont la VARIANT est out_of_stock/made_to_order. Génère bandeau
  warning dédié "X item(s) require availability confirmation — review
  your selection before submitting". Le bandeau success `allConfirmed`
  exige désormais `variantUnavailable.length === 0` AND `uncertainStock.length === 0`.
- `src/pages/ProjectCart.tsx` : composant local `<StockBadge status>` (FR
  par défaut "En stock" / "Sur commande" / "Disponibilité à confirmer"),
  rendu dans la ligne d'item sous le nom du product à côté du supplier
  badge. Wired `variants` au `<SourcingAlerts />`.

**Tests** :
- `cart-helpers.test.ts` : +10 tests sur `getEffectiveStockStatus` (3
  branches variant + 5 branches legacy + 2 cas défensifs).
- `sourcing-alerts-variant.test.tsx` (NEW) : 5 tests intégration (banner
  success vs warning selon variants + régression zéro legacy).
- Tests cumulés : 486 → **501** (+15).

**Régression zéro garantie** :
- Helper retourne `null` pour les products legacy sans `stock_status`
  reconnu → `<StockBadge status={null} />` ne rend rien.
- `SourcingAlerts.variants` prop optionnel → comportement legacy strict
  côté pages qui ne le passent pas.

**Phase 2 backlog** :
- i18n des labels `<StockBadge>` ("En stock" / "Sur commande" /
  "Disponibilité à confirmer") via `t()` + 4 locales. Aujourd'hui
  hardcoded FR (audience CHR France 2026), cohérent avec dette i18n
  préexistante du drawer.

## ÉTAPE 9a-fix-2 — Récap final (clôture 2026-05-04)

ÉTAPE 9a + 9a-fix + 9a-fix-2 OFFICIELLEMENT VALIDÉES FINAL.
**8 bugs réglés sur 8** durant la session, validés E2E browser par le
founder.

### Bugs réglés

| # | Sub-étape | Description | Fix |
|---|---|---|---|
| 1 | 9a-fix | AVAILABLE OFFERS prix non synchronisé avec sélecteur variants | `effectivePriceOf` dans VendorOffers |
| 2 | α + β + γ-1 | Cart reçoit prix incorrect €199 au lieu de €322.92 | Architecture cart Modèle B compatible (`selectedModelBVariantId`) |
| 3 | δ-1 | Stock badge AVAILABLE OFFERS non synchronisé | RestockBadge `stockStatus` autoritatif |
| 4 | α + β | 2 variants distinctes du même product mergées en 1 ligne | `selectedModelBVariantId` structurel + `cartItemMatchesIdentity` |
| A | δ-2 Phase 1 | DELETE supprimait les 2 variants du product | `removeItem`/`updateQuantity`/`clearSupplier` variant-aware (signatures étendues, optionnel) |
| B | δ-2 Phase 2 | Panel SUPPLIER OPTIONS du drawer affichait €199 au lieu de €322.92 | `SupplierRecommendations` + `ProductDetailDrawer` propagation `variant_id` + `effectivePriceOf` local |
| 7 | ε | Stock status textuel du drawer panel toujours "In stock" | `getAvailabilityFromVariant` (4 branches mapping) + `effectiveStockStatusOf` SupplierRecommendations |
| 8 | ζ | Stock visibility absente du cart list + bandeau "All sourced" mensonger | `<StockBadge>` per-item + `SourcingAlerts` `variantUnavailable` filter |

### Métriques cumulées (depuis 54e166c)

- **Tests** : 422 → **501** (+79, tous verts)
- **lint** : 612 → **610 warnings** (-2 net stable)
- **tsc --noEmit** : clean
- **Régressions** : 0
- **Fichiers nouveaux** : 4 (`cartHelpers.ts`, `productAvailability.ts`, 8 fichiers de test)
- **Fichiers modifiés** : 16

### Sub-étapes cumulées

| Sub-étape | Effort réel | Livrable |
|---|---|---|
| α | ~45 min | Helper `cartHelpers.ts` + `CartItem.selectedModelBVariantId` + `cartItemMatchesIdentity` |
| β | ~30 min | UI VendorOffers + ProductDetail wire variant_id |
| γ-1 | ~1h15 | `fetchProductsByIds` commission + `fetchVariantsByIds` batch + ProjectCart display variant-aware |
| γ-2 | ~45 min | SourcingSummary patch + saved_carts persistence + audit downstream documenté |
| δ-1 | ~30 min | RestockBadge stockStatus autoritatif + i18n 4 locales |
| δ-2 Phase 1 | ~15 min | removeItem/updateQuantity/clearSupplier variant-aware |
| δ-2 Phase 2 | ~40 min | SupplierRecommendations + ProductDetailDrawer panel variant-aware |
| ε | ~35 min | `productAvailability.ts` helper + drawer + supplier panel stock |
| ζ | ~30 min | `getEffectiveStockStatus` + `<StockBadge>` + SourcingAlerts conditionnel |

**Total session : ~5h30 de travail effectif.**

### Arbitrages techniques majeurs

1. **β architecture** : `selectedModelBVariantId` champ optionnel sur CartItem
   plutôt que refonte cart complète (Option β β2 plutôt que table cart_items
   normalisée Phase 2). Backward compat 100 % sur 51 legacy products.
2. **Pattern helpers locaux** : `effectivePriceOf` / `effectiveStockStatusOf`
   / `effectiveStockQuantityOf` réutilisé cohérent dans VendorOffers (β / δ-1)
   + SupplierRecommendations (δ-2 Phase 2 / ε). Helpers purs cartHelpers.ts /
   productAvailability.ts pour testabilité.
3. **Batch fetchers anti-N+1** : `fetchProductsByIds` (γ-1) et
   `fetchVariantsByIds` (γ-1) groupent les queries partner / commission par
   partner_id. 3 queries totales quel que soit le nombre d'items du cart.
4. **Régression zéro** : tous les chemins variant-aware sont conditionnés par
   `variant ?? null` ou `variantId !== undefined` → fallback systématique
   au comportement legacy. Validé par 7 tests régression zéro explicites.
5. **Phase 1 dette acceptable + Phase 2 backlog formalisé** : 5 dettes
   documentées (variant_id non persisté en DB downstream, i18n drawer +
   StockBadge, cas DB invalide DEMO-T-160, édition admin variants pre-approval,
   edge function transactionnelle).

### Cas E2E validés browser par le founder

- ✅ Cas A : 2 variants distinctes du même product → 2 lignes cart distinctes
- ✅ Cas B : reload page → 2 lignes persistent avec prix corrects
- ✅ Cas C : régression zéro 51 legacy products
- ✅ Cas D : qty incrémentée même variant → merge correct
- ✅ Cas E : stock badge AVAILABLE OFFERS sync avec variant
- ✅ Bug A : DELETE supprime UNE variant, l'autre reste
- ✅ Bug B : panel SUPPLIER OPTIONS affiche €322.92 / €430.92 selon variant
- ✅ ε : drawer availability badge cohérent avec variant
- ✅ ζ : 3 badges stock par item + bandeau conditionnel orange/vert

### Limitations Phase 1 + Backlog Phase 2 consolidé

**DDL / data layer** :
- `project_cart_items` et `quote_requests` n'ont pas de colonne `variant_id`.
  Conséquence : variant_id du cart soumis est PERDU côté flow B2B partner-side.
  → Migration DDL Phase 2 + adapter ProjectCart submit + partner quote view +
  cartPdfExport (effort 0.5-1j).

**Vocabulaire** :
- Champs `selectedColor` / `selectedDimension` `@deprecated` Phase 1 — encore
  utilisés par 51 legacy products via dimension_variants jsonb. Migration vers
  variants Modèle B Phase 2 quand catalogue rebuild.

**i18n** :
- Labels `<StockBadge>` ("En stock" / "Sur commande" / "Disponibilité à
  confirmer") hardcoded FR. À i18n-iser via `t()` 4 locales Phase 2.
- Labels du `ProductDetailDrawer` ("Available for immediate dispatch" /
  "Made to order" / etc.) hardcoded EN. Idem Phase 2.

**Validation data-layer** :
- Cas DB invalide observé sur DEMO-T-160 (`in_stock=false &&
  is_made_to_order=false && stock_quantity=null`). Mapping ε retourne
  "Availability on request" mais idéalement le formulaire partenaire / admin
  devrait interdire cette combinaison via zod schema.

**Admin / partner workflow** (déjà documenté ÉTAPE 7) :
- Édition admin des variants AVANT approval submission (Phase 2).
- Edge function `approveAsNew` transactionnelle Postgres BEGIN/COMMIT/ROLLBACK
  (si concurrent inserts deviennent un problème).
- Bulk approve plusieurs submissions simultanément.

### Vérifications finales

```
bunx vitest run    → 501/501 verts
bunx tsc --noEmit  → clean
bun run lint       → 610 warnings (baseline 612, -2 net stable)
git status         → 0 fichier non commité (post δ-3)
```

### Rappels pour la suite

- **Pas de push** : le founder choisira quand pousser.
- **Demo Modèle B + 3 variants matérialisées** : conservées en DB pour
  validation E2E future et démo Salone (à supprimer plus tard si souhaité).
- **Vite dev** reste actif sur `localhost:8080`.

→ **Prêt pour ÉTAPE 9b** (URLs canoniques `/products/[brand]/[product]`)
   ou ÉTAPE 8 (UI admin référentiels Phase 1) selon priorité founder.
