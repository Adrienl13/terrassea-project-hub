# BACKLOG — Post chantier vocabulaire 2026

**Date :** 2026-04-30
**Contexte :** mini-chantiers à programmer après le chantier vocab + champs critiques (cf. `PLAN_VOCAB_FIELDS.md`).

---

## À programmer en priorité — semaine 5-6 (avant relance Salone mi-juin)

### 1. Catalogue de démo : peupler avec 30-50 produits réels

**Pourquoi** : actuellement **9 produits actifs en DB** (note founder 2026-04-30). Pour les visios commerciales mi-juin, on a besoin d'un catalogue convaincant pour démontrer le matching engine + filtres + comparateur sans que la démo paraisse vide.

**Périmètre** :
- 30-50 produits couvrant les 5 catégories prioritaires (Tables, Parasols, Sun Loungers, Sofas, Bar Stools)
- Données complètes : noms FR/EN/ES/IT, descriptions, prix indicatifs, dimensions, matériaux, tags, **et les nouveaux champs critiques** (extension_capability, fabric_certification, available_modules, etc. selon catégorie)
- Photos correctes (au moins 1 image par produit)
- Distribution réaliste : ~ 10-15 Tables, 6-8 Parasols, 6-8 Sun Loungers, 6-8 Sofas, 4-6 Bar Stools

**Approche possible** :
- (a) Saisie manuelle via UI admin/partner
- (b) Import CSV via `analyze-csv-products` edge function (déjà existante)
- (c) Génération assistée Claude AI à partir de fiches produits brutes

**Effort estimé** : 1-2 jours selon approche

**Critère de succès** : `SELECT category, COUNT(*) FROM products GROUP BY category` retourne au moins 6 produits par catégorie prioritaire, avec champs critiques renseignés.

---

### 2. Composant `<ProductSpecs>` read-only public

**Pourquoi** : les sub-composants créés pendant le chantier vocab (`TableSpecsSection`, `ParasolSpecsSection`, etc.) sont édit-side. Pour la démo commerciale, l'affichage public sur `ProductDetail.tsx` doit rendre les nouveaux champs de manière soignée (icônes, groupes thématiques, formats lisibles).

**Périmètre** :
- 1 composant `<ProductSpecs product={product} category={...} />` qui affiche les nouveaux champs en lecture seule
- Réutilise les helpers de formatage des sub-composants edit (`formatBeaufort`, `formatFabricCertif`, etc.)
- Visible sur `ProductDetail.tsx`, optionnellement intégrable dans le comparateur `ProductCompare.tsx`
- Mobile-first
- i18n complète (4 langues)

**Effort estimé** : 0.5-1 jour

**Critère de succès** : ouverture d'une page produit Tables/Parasols/etc. → bloc Specs visuellement clair, valeurs lisibles (par ex. "Beaufort 8 — vents forts" plutôt que "8").

---

## À programmer en priorité moyenne — Q3 2026

### 3. Backfill IA des champs critiques sur les produits existants

**Pourquoi** : les 6 produits Tables et 3 produits Bar Stools existants en DB ont les nouveaux champs à `false`/`NULL` par défaut. Backfill manuel = lent.

**Périmètre** : étendre `enrich-products` edge function pour faire des suggestions sur les nouveaux champs (extension_capability, top_thickness_cm, etc.). Workflow review/accept côté admin (déjà existant via `AdminAIScanner`).

**Effort estimé** : 1-2 jours

---

### 4. Documentation `CLAUDE.md` après chantier

**Pourquoi** : les nouvelles colonnes + sub-composants + dictionnaires intent + module fabricBrands doivent être référencés dans `CLAUDE.md` pour que les futurs chantiers (Engine 2.0, scoring par catégorie, etc.) partent de la bonne base.

**Périmètre** : couvert par ÉTAPE 7 (CLAUDE.md diff) du chantier vocab actuel. Ce point est plutôt un rappel.

---

## À programmer en priorité moyenne — Q3 2026 (suite)

### 5. Consolider `multiple_permissive_policies` (623 occurrences)

**Pourquoi** : pattern admin + owner-policy partout dans le repo génère 2 policies par action × role. Postgres évalue les deux à chaque query → coût marginal multiplié.

**Périmètre** : ~ 195 policies à réécrire en `USING (is_admin() OR <owner_check>)` au lieu de 2 policies séparées.

**Pourquoi pas en ÉTAPE 7 du chantier vocab** : touche **65 tables** dont la majorité hors scope du chantier (auth, user_profiles, conversations, partner_*, etc.). Réécrire tout = 1-2 jours + risque régression sur les flows critiques (paiements, notifications).

**Effort estimé** : 1-2 jours, à découper par lots de 10 tables.

**Critère de succès** : `multiple_permissive_policies` baisse de 623 vers < 100 (impossible à 0 car certaines tables ont des roles distincts par construction Supabase).

### 6. Migrer les prompts edge functions vers la nouvelle taxonomie de catégories

**Pourquoi** : les edge functions `enrich-products`, `analyze-csv-products`, `analyze-terrace`, `analyze-product-image` retournent encore les anciens labels capitalisés (`"Chairs"`, `"Bar Stools"`, `"Lounge Seating"`, etc.). Mismatch avec la DB normalisée (lowercase-kebab).

**Workaround actuel** : `src/lib/categoryNormalizer.ts` (créé ÉTAPE 7.1) absorbe la divergence côté front via heuristique. Mais le fix propre est upstream dans les prompts AI.

**Périmètre** : 4 edge functions × prompt update + redéploiement. ~ 1-2 h.

**Critère de succès** : les 4 prompts retournent directement `chairs`/`armchairs`/`bar-stools`/`tables`/etc. Le helper `normalizeProductCategory` peut être simplifié (ou conservé en defensive).

---

## Hors périmètre 2026 (Bucket 3 audit)

Items déjà tracés dans `docs/audit/2026-04/AUDIT_ACTIONS.md` Bucket 3 et qui touchent indirectement le schéma produits :
- Refactor god component `AddProductForm.tsx` (1307 lignes) en sub-composants
- Refactor `Admin.tsx` (2347 lignes) en sub-routes par tab
- TypeScript strict progressif (les nouveaux sub-composants product-specs seront déjà conformes au pattern strict)
- Tests E2E Playwright sur le flow partner submit product

À ne PAS programmer avant la relance commerciale mi-juin.
