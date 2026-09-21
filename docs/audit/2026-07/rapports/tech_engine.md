# Audit des moteurs métier (`src/engine/`) et des tests — Terrassea Hub

## Synthèse (28/07/2026)

Les 10 moteurs constituent un vrai capital différenciant : architecture propre (slugs, engines purs, séparation search/projet/BOM/conformité), vocabulaire multilingue riche, scoring composite sophistiqué et bien commenté. Trois problèmes structurels majeurs ressortent cependant. **(1)** La migration vocabulaire 2026-04-30 n'a jamais été propagée aux moteurs (Dette 32 documentée mais **sous-estimée** : ce n'est pas qu'un problème de lisibilité — 3 catégories sur 8 obtiennent un score catégorie de **zéro** en recherche, et les bonus « mandatory » des venues bar/hotel/beach-club ne s'appliquent jamais). **(2)** Le moteur de conformité produit des **blockers ERP quasi systématiques** sur des layouts pourtant réalistes, à cause d'une heuristique d'allée mathématiquement incohérente avec le modèle de densité — dangereux pour la crédibilité du positionnement « conformité réglementaire ». **(3)** La suite de tests (575 tests verts) valide les moteurs contre la **taxonomie obsolète** (mocks `"Chairs"`, `"Lounge Seating"`, `"Sun Loungers"`) : sentiment de sécurité factice, aucun test unitaire sur supplierEngine, spatialEngine, layoutEngine, compatibilityEngine, similarityEngine.

---

## Forces

- **Architecture slugs-first** : `intentDetector.normalizeQuery()` est le seul point de traduction langue→slug, le reste des moteurs travaille en slugs. Choix excellent et documenté (intentDetector.ts:9-14).
- **Recherche multilingue réellement bonne** : 5 langues (EN/FR/IT/ES/DE) couvrant catégories, couleurs, styles, matériaux, use-cases ; désambiguïsation contextuelle de « natural » (couleur vs style) ; word-boundary matching avec cache regex (`_wbCache`) ; hints spécifiques par catégorie (forme, capacité, type parasol, empilable). Testée sérieusement (search-categories.test.ts, 12 blocs).
- **Scoring produit composite crédible** : climat (bonus/malus Beaufort ≥6 côtier, ≥5 rooftop — très pertinent métier), ergonomie poids par type de venue (léger pour beach-club/event, lourd pour rooftop = logique vent), durabilité (garantie parsée + matériaux + EN 12727 niveau 4), budget en pénalité douce plutôt qu'en filtre dur, data_quality multiplicatif — tout cela est du vrai savoir-faire CHR encodé.
- **Scoring fournisseur MOQ-aware** avec diagnostic exposé à l'UI (`MoqWarning`), pénalité plafonnée à -25 car « MOQ négociable » — nuance métier juste ; poids urgent/normal distincts ; note de qualité de données honnête en commentaire (supplierEngine.ts:318-322).
- **Multi-zone** propre : héritage parent→zone, garde anti-récursion, agrégat consolidé — bien testé (multiZone.test.ts).
- **Valeurs de conformité correctes** : 1,40 m allée principale ERP N, 0,90 m transversale, 1,50 m giration PMR, 36″/60″ ADA, 2ᵉ issue >50 couverts — les constantes réglementaires sont justes.
- **Densités crédibles** : 1,3 / 1,7 / 2,2 m²/couvert (dense/équilibré/confortable) correspondent aux standards terrasse CHR.
- **Dictionnaires centralisés** (fabricBrands.ts) conformes à la convention CLAUDE.md, avec labels/slugs/premium-set séparés.

---

## Faiblesses / problèmes détectés

### CRITIQUE

1. **Le moteur de conformité déclenche `AISLE_TOO_NARROW` (blocker) sur pratiquement tout layout FR réaliste** — `complianceEngine.ts:83-94` + `spatialEngine.ts:95-112`.
   Démonstration : restaurant 40 couverts, 70 m², équilibré (1,75 m²/couvert = « good ») → `estimateMainAisleWidth` = remaining×0,4 / √aire / aisleCount ≈ 10×0,4/8,37/2 = **0,24 m** → blocker (seuil 1,40 m). Pour passer le seuil il faudrait ~84 % de la surface en circulation, ce qui est impossible. Deux causes : (a) le footprint par table double-compte la clearance sur les 4 côtés (un 70×70 à clearance 0,9 = 6,25 m² pour 2 couverts = 3,1 m²/couvert, presque 2× le facteur densité affiché), donc `remainingCirculationSpace` est souvent quasi nul voire **négatif** (propagé tel quel, spatialEngine.ts:152) ; (b) la division par `aisleCount` re-pénalise. Les tests compliance.test.ts n'attrapent rien car ils injectent des `spatialMetrics` fabriqués à la main (remaining = 60 m² sur 100) au lieu de passer par le pipeline réel spatialEngine→compliance. **Un moteur de conformité qui crie au loup en permanence détruit la crédibilité du positionnement « acheteurs publics / ERP » de PRODUCT_PHILOSOPHY.md.**

2. **Dette 32 (vocab CamelCase) sous-estimée : des comportements sont réellement cassés, pas seulement « illisibles »** — la dette est documentée (DETTE_TECHNIQUE_AUDIT.md:1999-2034, sévérité 2, 0,5 j, « non bloquante, un normalizer caché compense ») mais l'analyse fine montre qu'aucun normalizer ne compense sur ces chemins :
   - `intentDetector.ts:16-116` mappe vers `"bar stools"`, `"sun loungers"`, `"lounge seating"` (espaces) alors que la DB canonique stocke `bar-stools`, `loungers`, `sofas`. Dans `computeScore` (intentDetector.ts:848-856), `"bar-stools" === / startsWith / includes "bar stool(s)"` est **faux** (tiret ≠ espace), `"loungers"` ne contient pas `"sun lounger"`, `"sofas"` ne contient pas `"lounge seating"` → chercher « canapé », « tabouret », « transat » donne un score catégorie **0** sur le catalogue réel ; le classement retombe sur popularité/disponibilité. Idem pour `CATEGORY_PROFILES` (bonus par catégorie jamais appliqués sur ces 3 catégories via le catalogue réel).
   - `projectEngine.ts:245-301` (`VENUE_NEEDS_MAP`) utilise `"Lounge Seating"`, `"Sun Loungers"`, `"Bar Stools"`, `"High Tables"` : le bonus mandatory +5,0 / preferred +2,5 (projectEngine.ts:1232-1236) et la protection anti-dédup `coversMandatory` (projectEngine.ts:1427-1443) ne matchent **jamais** les catégories DB `sofas`/`loungers`/`bar-stools` — pour un bar, **aucun** produit ne reçoit de bonus mandatory ; pour un beach-club, les transats n'en reçoivent pas.
   - Le seul filet (`normalizeProductCategory`) n'est appelé que dans `Admin.tsx` et `useProductSubmissions.ts` (ingestion), jamais sur le chemin lecture → engines.
   → Reclasser en priorité haute et élargir le périmètre du fix (voir recommandations).

### HAUTE

3. **BOM irréaliste pour les venues non-restauration** — `projectEngine.ts:1714-1783`. `buildLayoutRequirements` est 100 % « dining-centric » : sièges = chaises, tables, parasols (+ mange-debout conditionnels). Conséquence : un **beach-club 40 couverts** reçoit 40 chaises + ~10 tables de repas + 10 parasols… et **1 seul transat** (les loungers n'entrent au BOM que par le chemin « produit sans requirement », qty 1, projetEngine.ts:1904-1919). Un **bar** reçoit **1 tabouret**. Le layoutEngine ignore totalement `establishmentType`. C'est le cœur de la proposition de valeur pour hôtels/beach-clubs (multi-zone Chantier 2) et il produit des nomenclatures que n'importe quel pro rejettera.

4. **Les réponses de découverte budget ne sont jamais mappées** — `projectEngine.ts:798-801` propose les options `"€50–80"…"€180+"`, mais `applyAnswer` (projectEngine.ts:845-847) les passe dans `BUDGET_KEYWORDS` (mots comme « premium », « cheap ») : aucune option chiffrée ne matche → **toutes les réponses donnent `budgetLevel = "mid"`**. Le questionnaire budget est décoratif.

5. **Vocabulaire `height_type` incohérent entre moteurs** — le formulaire partenaire produit `dining` / `coffee` / `high-bar` (AddProductForm.tsx:1143-1146), `projectEngine` teste `high-bar|high|coffee|low` (ok), mais `compatibilityEngine.ts:191-206 et 237-245` compare à `"standard"` et `"bar"` : les branches d'appariement dimensionnel table↔chaise (hauteur d'assise 42-48 / 60-75 cm) sont **mortes** avec les données canoniques ; seule l'égalité stricte source==cible fonctionne.

6. **Non-déterminisme non assumé + contrat CLAUDE.md faux** :
   - `seasonalBonus` (projectEngine.ts:631-652) utilise `new Date()` : le même brief génère des concepts différents selon le mois, ce qui contredit « Engines are client-side and deterministic », pollue les `scoring_snapshots` (boucle de feedback « immutable » comparant des scores non comparables) et rend certains tests saisonnièrement fragiles.
   - `supplierEngine.ts:1` importe le client Supabase au top-level et interroge `product_offers`/`partner_ratings` : contredit « They do not call Supabase directly » de CLAUDE.md, et rend le moteur non testable sans mock d'environnement — **vérifié empiriquement** : 5 fichiers de tests échouent en collecte hors CI faute de `VITE_SUPABASE_URL` (`supplier-recommendations-variant.test.tsx` & co, « supabaseUrl is required »).

7. **`scoreAvailability` : stock explicite à 0 mieux noté qu'un stock de 10** — supplierEngine.ts:107-112 : `qty > 0 → 60`, `else → 80` ; or `qty === 0` tombe dans le `else` « available but no qty info » → une offre à **0 unité** score 80 quand une offre à 10 unités score 60. Le bonus arrivage s'applique aussi aux dates d'arrivée **passées** (`diffDays <= 14` inclut les négatifs, supplierEngine.ts:127-133).

8. **Couverture de tests réelle vs revendiquée** :
   - CLAUDE.md revendique « 7 unit test files focused on engines » ; la réalité est 48 fichiers / 575 tests, dont l'essentiel porte sur schémas/variants/helpers. **Zéro test unitaire** pour `supplierEngine` (le scoring lui-même), `spatialEngine`, `layoutEngine`, `compatibilityEngine`, `similarityEngine` (grep : aucun import de ces modules dans src/test hors un type).
   - Tous les mocks des tests moteurs (`engines.test.ts:22`, `bom-validation.test.ts:11`, `palette-validation.test.ts:10`, `multiZone.test.ts:19`, `search-categories.test.ts` — qui se déclare « mirrors the 8 Supabase products ») utilisent la taxonomie **pré-chantier** (`"Chairs"`, `"Bar Stools"`, `"Lounge Seating"`, `"Sun Loungers"`). La suite verte prouve donc que les moteurs marchent sur des données qui n'existent plus en prod. Dette 32 le note, mais aucun test « taxonomie canonique » n'a été ajouté depuis.

### MOYENNE

9. **layoutEngine : arrondis qui explosent aux petites capacités** — `generateLayout` (layoutEngine.ts:134-176) : demander 2 couverts en `balanced-2-4` produit 6 couverts (chaque bucket force `qty ≥ 1`). `generateLockedLayout` (layoutEngine.ts:227-248) laisse `remaining` devenir négatif → le dernier format reçoit quand même qty 1. Pas de réconciliation finale vers la capacité demandée.
10. **Incohérences internes spatialEngine** : seuils `getDensityLevel` (2,0/1,5 — spatialEngine.ts:59-63) ≠ facteurs `DENSITY_FACTORS` (2,2/1,7) ; footprint rond sous-estimé vs carré surestimé (Ø80 4 couverts = 1,33 m²/couvert vs 70×70 2 couverts = 3,1).
11. **UK absent de `COUNTRY_TO_REGIME`** (complianceEngine.ts:56-68) alors que le focus 2026 est « Europe + UK » (Part M / BS 8300 ≠ défaut EU) ; et le segment marine (déjà présent dans le vocabulaire : `cruise-ship-deck` intentDetector.ts:277) n'a aucun régime IMO/MED — incohérent avec la Phase 1 marine livrée 2026-05-05.
12. **`TERM_TO_TREND_TAG` est du code mort** : exporté, testé (intent-vocab-2026.test.ts), mais consommé par **aucun** moteur ni scoring. Les 14 slugs tendance 2026 n'influencent rien. Documenté « future extensions », mais le test donne l'illusion d'une feature.
13. **`extractCapacity` faux positifs** — projectEngine.ts:721-727 : fallback `(\d{2,3})` capture n'importe quel nombre (« terrasse 2026 » → 202 ; « table 80x80 » → 80 couverts).
14. **`buildAlternative` incohérent** — projectEngine.ts:1617-1627 : remplace **tous** les slots sièges (chair, sofa, lounger, bar_stool) par **un seul** produit alternatif en conservant le `role` du slot d'origine (un transat peut se retrouver dans un slot `chair`) ; `priceDelta` calculé sur les min uniquement.
15. **Catégorie `benches` fantôme** : intentDetector mappe « banc/bench » vers `"benches"` qui n'existe pas dans `CANONICAL_CATEGORIES` (categoryNormalizer.ts:18-27) — recherche sans issue possible.
16. **Ratio parasols agressif et aveugle au diamètre** — 1 parasol / 4 couverts (projectEngine.ts:1729-1734) : 40 couverts → 10 parasols ; à 890 € pièce cela gonfle le budget BOM de ~9 k€. Un Ø3,5 m couvre 6-8 couverts ; le ratio devrait dépendre du produit sélectionné.
17. **Divers** : allemand supporté en recherche mais pas en i18n (portée incohérente, et « weiß » cassé car `ß` absent du filtre de caractères intentDetector.ts:447) ; clé dupliquée `alta` (intentDetector.ts:508-510) ; réputation sans lissage bayésien (1 seul avis 5★ → 100, supplierEngine.ts:190-197) ; `computePercentiles` et bigrammes O(n²) — inoffensif à 9 produits, à surveiller >500 ; `multiWord replace` ne retire que la première occurrence (intentDetector.ts:439).

### BASSE

18. `getFeasibility` seuil « good » à 1,5 m²/couvert alors que « comfortable » réclame 2,2 — un layout « confortable » impossible est quand même « good ».
19. `assignBadges` attribue `recommended` + jusqu'à 4 badges à une offre unique (bruit UI quand il n'y a qu'un fournisseur).
20. `computeSimilarity` typé `| null` mais ne retourne jamais null (similarityEngine.ts:63-136).

---

## Risques

- **Juridique / réputationnel** : afficher des verdicts « blocker ERP » faux (ou, inversement, un « compliant » basé sur une heuristique d'allée) à des acheteurs publics ou architectes peut engager la crédibilité de la plateforme. Le disclaimer existe en commentaire de code, pas dans le contrat produit.
- **Régression silencieuse installée** : le chantier vocab a dégradé le scoring projet/recherche pour 3 catégories sans qu'aucun test ne rougisse — exactement le scénario « silent breaking change » listé comme non-acceptable dans CLAUDE.md. Le catalogue de 9 produits masque tout ; à 30-50 produits (objectif pré-Salone), les mauvais classements deviendront visibles.
- **Boucle de feedback polluée** : `scoring_snapshots` capture des scores non-déterministes (saison) et biaisés (vocab) — les analyses futures sur ces données seront trompeuses.
- **Prolifération de dictionnaires catégorie** : au moins 5 mappings concurrents (TERM_TO_CATEGORY_SLUG, CATEGORY_SLUG_TO_DB, VENUE_NEEDS_MAP, COMPAT_MAP, categoryNormalizer) + roleForCategory/inferBOMRole — chaque futur chantier vocab multipliera les points de drift.
- **supplierEngine intestable** : tout refactor du scoring fournisseur se fera sans filet.

---

## Opportunités / améliorations proposées

| Proposition | Effort | Impact |
|---|---|---|
| **Chantier « vocab engines »** : module unique source-de-vérité catégories (slug canonique + rôles BOM + labels), migration de VENUE_NEEDS/intentDetector/COMPAT_MAP/compatibilityEngine (height_type), réécriture des mocks de tests en taxonomie canonique + un test de cohérence croisée dictionnaires↔CANONICAL_CATEGORIES | 1-1,5 j | Très élevé — corrige 2, 5, 8, 15 d'un coup ; ferme Dette 32 pour de bon |
| **Placement 2D réel** (grille simple : rangées de tables, allées explicites 1,40/0,90 m, export SVG du plan) remplaçant l'heuristique d'allée ; la conformité devient géométrique et démontrable — et le plan est un livrable vendeur pour architectes | 5-10 j (MVP rangées : 3 j) | Très élevé — différenciateur majeur, crédibilise la conformité |
| **Layout venue-aware** : profils de layout par type d'établissement (beach-club = transats/parasols ratio 1:2, bar = mange-debout + tabourets 1:1, hotel = mix zones) au lieu du modèle 100 % dining | 2-3 j | Élevé — rend le multi-zone réellement utilisable |
| **Export BOM** (CSV/XLSX/PDF avec quantités, fourchettes prix, fournisseurs recommandés, délais) — les données existent déjà dans `ConceptBOM` + `ScoredOffer` | 1-2 j | Élevé — quick win, livrable concret pour la cible architectes (année acquisition) |
| **Moteur de pricing léger** : paliers dégressifs par quantité sur `product_offers`, prise en compte MOQ dans le prix (pas seulement le score), simulation commission par plan partenaire | 3-5 j | Élevé — aujourd'hui le prix pèse 10 % du score fournisseur et aucun moteur ne raisonne en coût total projet |
| **Déterminisme + qualité tests** : injecter `now` en paramètre (seasonalBonus), extraire `fetchAllProjectOffers` en dépendance injectable, tests unitaires supplierEngine/spatialEngine/layoutEngine (cas : qty=0, MOQ, arrondis petites capacités, footprint vs densité), tests d'intégration spatial→compliance sur le pipeline réel | 1-2 j | Élevé — filet de sécurité avant tout refactor |
| **Régimes conformité UK + marine** (Part M ; IMO FTP/MED pour `cruise-ship-deck`) + activer `TERM_TO_TREND_TAG` dans le scoring (boost trend-tags ↔ technical_tags dérivés du chantier vocab) | 1-2 j | Moyen — aligne le moteur sur la stratégie affichée (UK 2026, marine Phase 2) |
| **Moteur de reco basé sur `concept_events`/`scoring_snapshots`** (re-ranking par taux d'ajout au panier par archétype, lissage bayésien de la réputation) | 3-5 j | Moyen à terme — la donnée est déjà collectée, personne ne la consomme |

---

## Top 5 recommandations priorisées

1. **Chantier vocab engines (1-1,5 j, avant le passage à 30-50 produits)** — unifier la taxonomie catégories/height_type dans un module unique, corriger `VENUE_NEEDS_MAP`, `TERM_TO_CATEGORY_SLUG`, `compatibilityEngine`, et migrer **tous les mocks de tests** vers la taxonomie canonique. C'est le préalable à toute confiance dans le reste : aujourd'hui la suite verte teste un produit qui n'existe plus.
2. **Neutraliser les faux blockers de conformité (0,5 j immédiat, puis 3 j)** — court terme : dégrader `AISLE_TOO_NARROW` en warning avec libellé « estimation heuristique », clamper `remainingCirculationSpace` à ≥ 0 et corriger le double comptage de clearance dans `getEffectiveTableFootprint` ; moyen terme : MVP de placement en rangées pour une conformité géométrique réelle.
3. **Rendre le BOM crédible hors restauration (2-3 j)** — requirements de layout par type de venue (transats, tabourets, mange-debout avec vraies quantités), ratio parasols dépendant du diamètre, et corriger le mapping budget de la découverte (`applyAnswer`).
4. **Filet de tests moteurs (1-2 j)** — unitaires supplierEngine (bug qty=0 inclus), spatialEngine, layoutEngine ; injection de l'horloge dans seasonalBonus ; test d'intégration spatial→compliance sur le pipeline réel ; mettre à jour la revendication « 7 test files » de CLAUDE.md.
5. **Livrables à valeur immédiate pour l'acquisition (2-4 j)** — export BOM (XLSX/PDF) puis moteur de pricing par paliers : deux extensions à fort effet démo pour architectes et hôteliers, réalisables sans toucher au cœur du scoring, idéalement après les points 1-3.

**Fichiers clés cités** : `src/engine/projectEngine.ts` (245-301, 631-652, 798-801, 845-847, 1232-1236, 1427-1443, 1714-1783, 1904-1919), `src/engine/intentDetector.ts` (16-116, 447, 848-877), `src/engine/complianceEngine.ts` (56-68, 83-110), `src/engine/spatialEngine.ts` (59-63, 95-112, 152), `src/engine/supplierEngine.ts` (1, 107-133, 190-197), `src/engine/compatibilityEngine.ts` (188-245), `src/engine/layoutEngine.ts` (134-176, 227-248), `src/lib/categoryNormalizer.ts`, `src/test/{engines,bom-validation,search-categories,compliance,multiZone,palette-validation}.test.ts`, `docs/strategy/DETTE_TECHNIQUE_AUDIT.md` (Dette 32, l. 1999-2034).