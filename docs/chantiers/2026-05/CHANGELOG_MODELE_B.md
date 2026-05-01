# CHANGELOG — Chantier Modèle B variants étendu

> Journal append-only des étapes du chantier Modèle B variants étendu (Phase 1).
> Réf : `docs/strategy/PRODUCT_DATA_VISION.md` v1.1, `docs/chantiers/2026-05/PLAN_MODELE_B_VARIANTS.md`.
> Démarrage : 2026-05-01. Cible fin : 22-26 mai 2026.

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

## Cibles ÉTAPE 6b

- Création réelle de `VariantsGrid.tsx` (Tanstack Table mode tableur editable)
- Colonnes : sku, dimensions, fabric_color, frame_finish, price_eur, in_stock, is_default
- Autocomplete sur material_brand_id, color_slug, finish_slug
- Add row / delete row inline
- Validation Zod par row via `productVariantDraftSchema`
- Intégration dans `VariantsSection.tsx` (remplace le placeholder)
- 5-7 tests Vitest sur le grid

Effort estimé : 1 jour.
