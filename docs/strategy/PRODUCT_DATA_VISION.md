# Product Data Vision — Terrassea Hub

> **Document stratégique de référence** sur la modélisation des produits, l'ingestion des catalogues, et l'architecture de données long terme.
> Date de création : 2026-04-30
> Dernière mise à jour : 2026-05-01 (v1.1)
> Auteurs : Adrien Laniez (founder) + copilote stratégique
> Statut : validé pour exécution Phase 1

---

## Sommaire

1. [Pourquoi ce document](#1-pourquoi-ce-document)
2. [Vision produit en une page](#2-vision-produit-en-une-page)
3. [Les 4 personae utilisateurs](#3-les-4-personae-utilisateurs)
4. [Architecture de données : Modèle B variants](#4-architecture-de-données--modèle-b-variants)
5. [Anatomie des variantes par catégorie](#5-anatomie-des-variantes-par-catégorie)
6. [Stratégie d'ingestion produit](#6-stratégie-dingestion-produit)
7. [Maintenance continue](#7-maintenance-continue)
8. [Les 10 sujets transverses critiques](#8-les-10-sujets-transverses-critiques)
9. [Stack technique recommandée](#9-stack-technique-recommandée)
10. [Roadmap par phases](#10-roadmap-par-phases)
11. [Décisions actées](#11-décisions-actées)
12. [Risques identifiés et mitigations](#12-risques-identifiés-et-mitigations)
13. [Ce qui reste à trancher](#13-ce-qui-reste-à-trancher)

---

## 1. Pourquoi ce document

Terrassea Hub n'est pas une simple marketplace B2B. C'est une plateforme verticale outdoor hospitality CHR avec une couche d'intelligence sémantique. À horizon 18-24 mois, l'objectif est de devenir la référence européenne pour le sourcing outdoor B2B avec des capacités agentic-ready.

Ce document existe pour :

- **Aligner les décisions techniques** sur la vision produit long terme, pas seulement les contraintes court terme
- **Documenter l'architecture de données** qui va structurer l'expérience utilisateur pendant 5-10 ans
- **Servir de référence** pour le fundraising, l'onboarding équipe future, et les relectures stratégiques
- **Éviter de re-débattre** les choix fondamentaux à chaque chantier

Toute décision technique majeure sur les produits, variantes, ingestion ou recherche doit être cohérente avec ce document. Si une décision diverge, le document doit être mis à jour explicitement.

---

## 2. Vision produit en une page

**Mission** : permettre aux acteurs de l'hospitality CHR européen (architectes, acheteurs, marques) de connecter leurs besoins outdoor à l'offre marché avec précision, rapidité et confiance.

**Différenciateur** : combinaison unique d'un catalogue verticale qualifié + d'un engine de matching sémantique + d'un pipeline d'ingestion IA-first + d'un graphe de données métier propriétaire.

**Architecture cognitive Terrassea Hub** :

```
[Intention utilisateur en langage naturel]
              ↓
       [IntentDetector]
              ↓
  [Engine de scoring 2 niveaux]
   (modèle d'abord, variante ensuite)
              ↓
  [Catalogue qualifié multi-marques]
   (53 → 500 → 5000 → 50000 produits)
              ↓
   [Recommandations explicables]
   (score + 3-5 raisons textuelles)
```

**Trois capacités à construire dans l'ordre** :

1. **Phase 1 (mai-juin 2026)** : socle de données solide + Engine fonctionnel sur 5 catégories prioritaires
2. **Phase 2 (juillet-août 2026)** : pipeline d'ingestion IA pour scaler à 50+ marques sans friction
3. **Phase 3 (Q4 2026 - 2027)** : couche conversationnelle, agent IA, intelligence marché

---

## 3. Les 4 personae utilisateurs

L'architecture de données et l'expérience produit doivent servir 4 personae distincts.

### Persona 1 — L'architecte hospitality (40-50% des recherches futures)

**Profil** : Pierre-Yves, designer hospitality indépendant, 8 projets/an pour groupes hôteliers et restaurants haut de gamme.

**Comment il cherche** : par **brief contextualisé** en langage naturel.

> *"J'ai besoin de parasols pour rooftop bar à Marseille, vent Mistral, 50 places assises, ambiance soft-modern"*

**Ce qu'il attend** : recommandations de modèles cohérents avec le brief + variantes pertinentes pour son contexte + explication du score.

**Implication architecture** : score à 2 niveaux (modèle puis variante), capacité d'IntentDetector à parser des briefs riches, vocabulaire 2026 actif.

### Persona 2 — L'acheteur CHR opérationnel (30-35% des recherches)

**Profil** : Marina, responsable achat groupe hôtelier 12 hôtels Italie, renouvelle 4 hôtels/an.

**Comment elle cherche** : par **lots et budgets** avec filtres précis.

> *"50 chaises de terrasse, budget 200€/unité max, finition aluminium beige, livraison sous 8 semaines"*

**Ce qu'elle attend** : filtres précis sur les attributs variants, comparaison facile, prix et délais structurés.

**Implication architecture** : variantes filtrables individuellement, pricing par variante, stock par variante, comparaison cross-variantes intuitive.

### Persona 3 — Le partenaire marque (3-5% des "recherches" mais 100% du revenu)

**Profil** : Federico, export manager Tribù, gère le catalogue Terrassea Hub.

**Comment il interagit** : il **alimente et gère** son catalogue, ne cherche pas.

**Ce qu'il attend** : import simple PIM/CSV/PDF, UI grid editable, structure cohérente avec son PIM interne, autonomie self-service.

**Implication architecture** : Modèle B variants (1 modèle + N variantes) est obligatoire pour onboarder les marques sérieuses sans friction prohibitive.

### Persona 4 — Le LLM / agent IA (10-20% en croissance vers 2027-2028)

**Profil** : ChatGPT, Perplexity, Claude, futurs agents IA des architectes/acheteurs.

**Comment ils cherchent** : par **requêtes structurées** via API ou structured data.

**Ce qu'ils attendent** : Schema.org structured data complet, API publique propre, données variants riches.

**Implication architecture** : Modèle B + Schema.org ProductGroup/Variant + API stable. Sans ça, Terrassea Hub ne sera pas cité par les LLMs.

### Synthèse personae

| Persona | Volume | Unité de recherche | Modèle requis |
|---|---|---|---|
| Architecte | 40-50% | Brief contextualisé | Score 2 niveaux modèle/variante |
| Acheteur CHR | 30-35% | Variante précise | Filtres et comparaison variantes |
| Partenaire marque | 3-5% (100% revenu) | Catalogue PIM-aware | Modèle B obligatoire |
| LLM / agent IA | 10-20% (en croissance) | Requête structurée | Modèle B + Schema.org + API |

**Conclusion** : les 4 personae convergent vers Modèle B. C'est la seule architecture qui sert toutes les audiences.

---

## 4. Architecture de données : Modèle B variants

### 4.1 Principe fondamental

**Un produit Terrassea Hub se compose de 2 niveaux** :

- **Niveau modèle** (table `products`) : ce qui est commun à toutes les variantes. Marque, gamme, certifications structurelles, caractéristiques techniques invariantes.
- **Niveau variante** (table `product_variants`) : ce qui change selon la déclinaison commercialisée. Dimension, couleur, tissu, finition, prix, stock, délai.

### 4.2 Schéma de la table `product_variants`

```sql
CREATE TABLE product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- Identifiants commerciaux
  sku text UNIQUE,
  variant_name text,             -- libellé human-readable (ex: "300x300 Sunbrella Beige")

  -- Dimensions
  width_cm numeric(6,1),
  depth_cm numeric(6,1),
  height_cm numeric(6,1),
  diameter_cm numeric(6,1),
  shape text CHECK (shape IN ('round', 'square', 'rectangle', 'oval', 'asymmetric', 'modular') OR shape IS NULL),

  -- Tissu
  fabric_type text,              -- ref enum global ou texte libre
  fabric_color_slug text,        -- slug couleur normalisé (ref colors_canonical)
  fabric_color_label_i18n jsonb, -- {en, fr, es, it} pour displayability
  fabric_color_hex text,         -- #BEIGE12 pour preview UI

  -- Structure
  frame_finish_slug text,        -- ref finishes_canonical (teak, aluminum-black, etc.)
  frame_finish_label_i18n jsonb,

  -- Configuration spécifique
  configuration_module text,     -- pour Sofas modulaires (ref SOFA_MODULES enum)
  subdivision text CHECK (subdivision IN ('counter', 'bar', 'tall', 'unknown') OR subdivision IS NULL),

  -- Options et features
  has_armrests boolean DEFAULT false,
  has_wheels boolean DEFAULT false,
  has_cushion boolean DEFAULT false,
  is_stackable boolean DEFAULT false,

  -- Pricing & disponibilité
  price_eur numeric(10,2),
  price_currency text DEFAULT 'EUR',
  in_stock boolean DEFAULT false,
  stock_quantity int,
  delivery_weeks_min int,
  delivery_weeks_max int,
  is_made_to_order boolean DEFAULT false,

  -- Médias spécifiques à la variante (lien vers product_media)
  primary_media_id uuid REFERENCES product_media(id) NULL,

  -- Traçabilité (data lineage)
  source_type text,              -- 'pim', 'pdf-extraction', 'web-scraping', 'csv-import', 'manual'
  source_url text,
  extracted_at timestamptz,
  validated_by uuid REFERENCES auth.users(id),
  validated_at timestamptz,
  confidence_score numeric(3,2), -- 0.00-1.00 score de confiance IA

  -- Méta
  is_published boolean DEFAULT false,
  discontinued_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes recommandés
CREATE INDEX idx_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_variants_dimension ON product_variants(width_cm, depth_cm) WHERE width_cm IS NOT NULL;
CREATE INDEX idx_variants_fabric ON product_variants(fabric_type, fabric_color_slug);
CREATE INDEX idx_variants_price ON product_variants(price_eur) WHERE price_eur IS NOT NULL;
CREATE INDEX idx_variants_published ON product_variants(is_published) WHERE is_published = true;
CREATE INDEX idx_variants_in_stock ON product_variants(in_stock) WHERE in_stock = true;
```

### 4.3 Ce qui reste sur `products`

Tout ce qui est invariant pour le modèle :

- Identité : `name`, `brand_id`, `product_line_id`, `designer_id`
- Catégorie : `category`, `subcategory`
- Description : `short_description_i18n`, `long_description_i18n`, `features_i18n`
- Champs critiques structurels (par catégorie) :
  - Tables : `built_in_umbrella_hole`, `top_thickness_cm`, etc.
  - Parasols : `wind_beaufort_max`, `min_base_weight_kg`, `pole_diameter_mm`, etc.
  - Sun Loungers : `salt_water_resistance`, `chlorine_resistance`, `sand_drainage`, etc.
  - Sofas : `acoustic_nrc`, `available_modules`, etc.
  - Bar Stools : (champs spécifiques)
  - Chairs : `nesting_capacity`, `chair_structure_type`, `outdoor_classification`, etc.
  - Armchairs : `usage_mode` (dining/lounge/flex), `seat_depth_cm`, etc.
- Tags vocab 2026 (auto-dérivés via trigger)
- Méta : timestamps, audit, ownership

### 4.4 Tables référentielles à créer (Master Data Management)

Pour assurer la cohérence cross-marques, créer ces référentiels canoniques selon le phasage suivant :

**Phase 1 — Référentiels critiques (chantier Modèle B)** :

```sql
material_brands           -- Sunbrella, Solaris, Dickson Orchestra, Serge Ferrari, Tribùcord (proprio), etc.
                          -- catégorie : fabric / wood / metal / composite
certifications            -- FSC, OEKO-TEX, GREENGUARD, Cradle to Cradle, ECOLABEL EU, etc.
colors_canonical          -- ~50 slugs de couleurs avec hex et i18n
finishes_canonical        -- ~30 slugs de finitions (teck, alu noir, etc.)
markets                   -- 'EU', 'UK', 'CH', 'US', etc.
```

**Phase 3 — Référentiels avancés (chantier Master Data Management)** :

```sql
brands                    -- table déjà partielle, consolidation Phase 3
product_lines             -- ex: "Vis-à-Vis" est une gamme Tribù
designers                 -- ex: "Yabu Pushelberg" (Phase 1 : champ texte primary_designer simple sur products)
fabric_types_canonical    -- types de tissus avec mapping vers material_brands
```

**Justification du phasage** : `material_brands` et `certifications` sont en Phase 1 parce qu'ils sont **transversaux aux marques structures** et qu'ils représentent **le critère #1 de recherche en B2B outdoor** (le tissu Sunbrella vaut un argument de vente plus fort que la marque structure dans 60-70% des briefs). Voir section 4.6 pour le pattern complet.

### 4.5 Tables transverses critiques

```sql
product_media             -- gestion images/vidéos/3D par modèle ou variante
product_relationships     -- compatible_with, same_collection, replaces, etc.
product_variant_change_events -- versioning et historique
brand_users               -- multi-tenant (qui peut éditer quelle marque)
audit_logs                -- conformité B2B + RGPD
ingestion_jobs            -- pipeline d'ingestion IA
```

### 4.6 Pattern entités partagées cross-marques

Plusieurs dimensions du domaine outdoor hospitality sont **transversales aux marques structures**. Ces dimensions doivent être stockées dans des **tables référentielles** plutôt que comme attributs texte sur les produits.

**Constat marché** : un même tissu (ex: Sunbrella Beige) est utilisé par 30+ marques structures différentes. Une même certification (ex: FSC) s'applique à des centaines de produits cross-marques. Stocker ces entités comme texte libre crée des doublons (Sunbrella vs Sun Brella vs SunBrella), des typos, des risques juridiques (licences fabricants), et empêche les analyses cross-marques.

**Dimensions concernées** :

| Dimension | Table référentielle | Phase d'implémentation |
|---|---|---|
| Marques de matériaux (tissus, bois, métaux, composites) | `material_brands` | **Phase 1** |
| Certifications (environnementales, qualité, sécurité) | `certifications` | **Phase 1** |
| Couleurs canoniques | `colors_canonical` | **Phase 1** |
| Finitions canoniques | `finishes_canonical` | **Phase 1** |
| Designers | `designers` | Phase 3 (Phase 1 : champ texte simple `primary_designer` sur products) |
| Gammes (product_lines) | `product_lines` | Phase 3 |
| Brands consolidées | `brands` | Phase 3 (consolidation de la table existante) |

**Schéma type d'une table référentielle (`material_brands`)** :

```sql
CREATE TABLE material_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,            -- 'sunbrella', 'solaris', 'tribucord', etc.
  name text NOT NULL,                   -- 'Sunbrella'
  category text NOT NULL CHECK (category IN ('fabric', 'wood', 'metal', 'composite', 'other')),
  parent_company text,                  -- 'Glen Raven Inc.' for Sunbrella
  description_i18n jsonb,               -- {en, fr, es, it}
  logo_url text,
  official_website text,
  certifications_associated uuid[],     -- FK arrays vers certifications
  is_premium boolean DEFAULT false,     -- pour scoring Engine
  is_proprietary boolean DEFAULT false, -- TRUE pour tissus propriétaires (Tribùcord, Maestro Outdoor)
  parent_brand_id uuid REFERENCES brands(id) NULL, -- TRUE si is_proprietary
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Liaison avec `product_variants`** :

Plutôt que `fabric_certification text` sur `products`, on a `material_brand_id uuid REFERENCES material_brands(id)` sur `product_variants`. Ça permet :

- Variantes différentes du même modèle avec tissus différents (ex: Tribù Vis-à-Vis disponible en Sunbrella OU Solaris selon la variante choisie)
- Recherche cross-marques par tissu ("tous les parasols Sunbrella")
- Conformité contractuelle (présentation centralisée selon guidelines tissus)

**Cas hybrides à gérer (10-15% des produits)** :

Certaines marques structures développent leurs propres tissus propriétaires. Exemples : Tribù avec "Tribùcord", Manutti avec "Maestro Outdoor". Ces tissus :

- Sont propres à la marque structure (pas réutilisés par d'autres)
- Doivent quand même être référencés dans `material_brands`
- Sont taggés `is_proprietary = true` et `parent_brand_id = <Tribù>`
- Apparaissent dans le picker mais avec mention "Exclusif Tribù"

**Bénéfices stratégiques de ce pattern** :

1. **Recherche cross-marques** : "tous les parasols Sunbrella" devient une query triviale qui retourne 200 produits de 30 marques différentes
2. **Pricing intelligence** : analyses cross-marques par tissu pour Market Reports vendables aux marques (ex: "le tissu Sunbrella Beige est en moyenne 12% plus cher que Solaris Beige sur les parasols 300×300")
3. **Conformité contractuelle** : présentation centralisée des marques tissus selon leurs guidelines fabricants
4. **Storytelling de marché** : pages dédiées par marque tissu sur Terrassea Hub (Sunbrella, Solaris...) qui éduquent les acheteurs
5. **Partenariats nouveaux** : capacité de signer des accords commerciaux directs avec les marques de tissus comme nouveau type de partenaires Terrassea
6. **Évite les doublons et typos** : 1 seule "Sunbrella" en DB, pas 47 variations textuelles

**Migration depuis le schéma actuel** :

Le module `src/engine/dictionaries/fabricBrands.ts` créé dans le chantier vocab 2026 (FABRIC_BRAND_SLUGS, FABRIC_BRAND_LABELS, PREMIUM_FABRIC_BRANDS) doit être **réutilisé pour seeder la table `material_brands`** lors du chantier Modèle B. Ne pas le recréer ni le dupliquer.

Les produits actuels qui ont `fabric_certification text` doivent être mappés vers `material_brand_id uuid` dans la migration.

---

## 5. Anatomie des variantes par catégorie

Volume typique de variantes par modèle, par catégorie, basé sur l'analyse du marché outdoor hospitality 2026.

### Tables — 30 à 150 variantes par modèle

| Axe variant | Volume typique | Impact recherche |
|---|---|---|
| Dimension (L × l) | 5-15 | CRITIQUE |
| Hauteur (subdivision) | 1-3 | CRITIQUE |
| Finition plateau | 3-8 | CRITIQUE |
| Finition piètement | 2-5 | IMPORTANT |
| Type de pliage/extension | 1-3 | NICE-TO-HAVE |
| Trou parasol | 0-1 | IMPORTANT |

### Parasols — 100 à 1000 variantes par modèle

| Axe variant | Volume typique | Impact recherche |
|---|---|---|
| Dimension (forme + taille) | 4-10 | CRITIQUE |
| Type de tissu | 2-4 | CRITIQUE |
| Couleur tissu | 10-30 par tissu | CRITIQUE |
| Finition mât | 2-4 | IMPORTANT |
| Options structurelles | 0-3 | NICE-TO-HAVE |
| Inclinaison | 0-1 | NICE-TO-HAVE |

### Sun Loungers — 30 à 100 variantes par modèle

| Axe variant | Volume typique | Impact recherche |
|---|---|---|
| Type structure | 2-4 | CRITIQUE |
| Tissu coussin | 2-3 | IMPORTANT |
| Couleur coussin | 5-15 par tissu | IMPORTANT |
| Finition cadre | 2-4 | IMPORTANT |
| Options | 0-2 | NICE-TO-HAVE |

### Sofas / Lounge Seating — 60 à 400 variantes par modèle

| Axe variant | Volume typique | Impact recherche |
|---|---|---|
| Configuration modulaire | 3-10 | CRITIQUE |
| Tissu coussin | 2-4 | CRITIQUE |
| Couleur coussin | 10-25 par tissu | CRITIQUE |
| Finition structure | 2-4 | IMPORTANT |
| Options | 0-3 | NICE-TO-HAVE |

### Bar Stools — 20 à 80 variantes par modèle

| Axe variant | Volume typique | Impact recherche |
|---|---|---|
| Hauteur (subdivision) | 1-3 | CRITIQUE |
| Tissu assise | 1-3 | IMPORTANT |
| Couleur | 5-15 par tissu | IMPORTANT |
| Finition structure | 2-4 | IMPORTANT |
| Options | 0-2 | NICE-TO-HAVE |

### Chairs — 30 à 200 variantes par modèle

| Axe variant | Volume typique | Impact recherche |
|---|---|---|
| Type structure | 3-5 | CRITIQUE |
| Avec/sans accoudoirs | 2 | CRITIQUE |
| Tissu assise | 2-4 | CRITIQUE |
| Couleur tissu/structure | 5-20 par tissu | CRITIQUE |
| Finition cadre | 2-5 | IMPORTANT |
| Hauteur | 1-2 | IMPORTANT |
| Empilabilité capacity | métadonnée | IMPORTANT (logistique CHR) |

### Armchairs — 30 à 150 variantes par modèle

| Axe variant | Volume typique | Impact recherche |
|---|---|---|
| Tissu coussin | 2-4 | CRITIQUE |
| Couleur coussin | 10-25 par tissu | CRITIQUE |
| Finition cadre | 2-5 | CRITIQUE |
| Profondeur d'assise | 2-3 | CRITIQUE (différencie dining/lounge) |
| Avec/sans coussin lombaire | 2 | IMPORTANT |
| Avec/sans repose-pieds | 2 | NICE-TO-HAVE |

### Estimation volume catalogue cible

| Stade | Marques | Modèles total | Variantes total |
|---|---|---|---|
| Aujourd'hui | 0 actives | 53 | ~53 (1 variante/modèle par défaut) |
| Phase 1 fin (juin 2026) | 5-10 actives | 100-200 | 5 000 - 20 000 |
| Phase 2 fin (août 2026) | 20-30 actives | 500-1000 | 30 000 - 100 000 |
| Phase 3 fin (déc 2026) | 50-80 actives | 2000-4000 | 100 000 - 400 000 |
| 18 mois | 150-200 actives | 5000-10000 | 500 000 - 2 000 000 |

L'architecture doit supporter sans dégradation jusqu'au volume 18 mois. Au-delà, optimisations dédiées (Meilisearch, partition Postgres, CDN avancé) seront nécessaires.

---

## 6. Stratégie d'ingestion produit

### 6.1 Cartographie des sources d'ingestion

| Source | % partenaires futurs | Complexité ingestion | Volume produits typique |
|---|---|---|---|
| PIM structuré (Akeneo, inRiver, Pimcore) | 30-40% | Faible (avec mapper) | 50-500 modèles |
| PDF catalogue | 40-50% | Élevée sans IA / Faible avec IA | 50-200 modèles |
| Site web vitrine | 20-30% | Moyenne (scraping ciblé) | 30-150 modèles |
| Tableur Excel/CSV | 10-15% | Moyenne (mapper assisté) | 50-500 lignes |
| Saisie manuelle | 5-10% | Très faible (formulaire) | 1-20 produits |

**Constat critique** : 60-80% des futurs partenaires viennent avec des données non-structurées (PDF + sites web). L'ingestion doit être massivement IA-assistée pour scaler.

### 6.2 Architecture d'ingestion (3 vues)

#### Vue ingénieur IA

Pipeline d'extraction multimodale :

```
[Source brute] → [Parser source-spécifique] → [Données semi-structurées]
              → [LLM extraction structurée] → [Validation schéma Zod]
              → [Enrichissement IA] → [Données structurées Terrassea]
              → [Validation humaine HITL] → [DB]
```

Composants clés :

- Parsers source-spécifiques (PDF, web, CSV, PIM)
- LLM extraction via **structured output + function calling** (Claude Sonnet 4)
- Validation Zod en double couche (syntaxique + sémantique)
- Enrichissement IA (tags vocab 2026, traductions, keywords)
- HITL obligatoire avant publication

#### Vue développeur full-stack

Architecture concrète :

- Edge function `intake-product-source`
- Table `ingestion_jobs` avec états (queued, parsing, extracting, validating, ready_for_review, published, failed)
- Edge function `process-ingestion-job` (orchestrateur)
- Edge function `enrich-product-with-ai` (existe partiellement)
- Edge function `publish-validated-product`
- Pages admin `/admin/ingestions` + `/admin/ingestions/:jobId/review`
- Page partenaire `/partner/import`
- Job queue : Inngest ou Trigger.dev pour jobs longs (>2 min)

#### Vue Head of Data

Préoccupations critiques :

1. **Data quality scoring** : score 0-100 par produit, pilote la visibilité
2. **Data lineage** : traçabilité de chaque champ (source, extraction, validation)
3. **Drift detection** : alertes sur incohérences (z-score sur prix par catégorie)
4. **Master Data Management** : référentiels canoniques centralisés
5. **Privacy / RGPD** : suppression sur demande, export, traçabilité

### 6.3 Optimisation par source

#### PIM structuré

Stratégie : **un mapper par PIM tool** (pas par marque). 90% du marché B2B utilise Akeneo, inRiver, Pimcore ou Salsify.

Gain : intégration nouvelle marque PIM = 30 min vs 8 heures.

#### PDF catalogue (le plus important)

Stratégie : **pipeline IA-first multimodal**.

Pipeline :
1. Upload PDF
2. Extraction multimodale (Claude Vision + OCR fallback)
3. Découpage par produit (1-3 pages par modèle)
4. Extraction structurée par produit (function calling)
5. Extraction des variantes (tableaux de spécifications)
6. Cross-référencement images/variantes
7. Validation HITL

Coût estimé : **~5€ par catalogue marque** (50 modèles, 200 pages).
À comparer avec extraction manuelle : 120-240€. ROI massif.

#### Sites web

Stratégie : **Crawler ciblé** ("Crawler A" interne).

Pipeline :
1. Identification structure (Shopify, WooCommerce, custom)
2. Crawl ciblé avec respect robots.txt et rate-limiting
3. Extraction LLM Vision sur chaque page produit
4. Identification variantes via sélecteurs
5. Validation HITL

Précautions juridiques : robots.txt respecté, User-Agent identifié, rate-limiting strict, pas de reproduction d'images sans accord ultérieur.

#### Tableurs Excel/CSV

Stratégie : **mapper assisté par IA**.

L'IA propose le mapping des colonnes CSV vers le schéma Terrassea. L'humain valide en 1 minute.

#### Saisie manuelle

Stratégie : **UI partenaire en mode tableur ergonomique** (grid editable, autocomplete intelligent, bulk operations, preview temps réel).

---

## 7. Maintenance continue

### 7.1 Les 4 types de maintenance

1. **Mises à jour de prix** (annuelles, parfois semestrielles)
2. **Nouvelles variantes** (couleurs, dimensions, tissus)
3. **Ruptures de stock et délais** (variations quotidiennes)
4. **Retrait de modèles** (gammes en fin de vie)

### 7.2 Stratégies de maintenance

| Type | Stratégie |
|---|---|
| Prix | UI bulk update + historique dans `product_variant_price_history` + notification 30 jours avant fin année fiscale |
| Nouvelles variantes | Re-crawl mensuel des sites marques + notification au partenaire pour validation |
| Stock/délais | Webhook ERP pour Brand Network + champ `last_stock_update` + relance >30 jours |
| Retrait modèles | Soft-delete via `discontinued_at` + notification acheteurs ayant favoris |

### 7.3 Outils de pilotage

**Dashboard admin "Data Health"** :
- % produits avec données complètes par marque
- Âge moyen des données par marque
- Taux de drift détecté
- Alertes prix anormaux

**Dashboard partenaire "Catalog Health"** :
- Score qualité catalogue
- Variantes incomplètes
- Nouvelles variantes détectées sur site officiel
- Suggestions d'amélioration

**Notifications automatiques** :
- Email mensuel aux partenaires (synthèse santé catalogue)
- Slack/email aux admins pour alertes critiques

### 7.4 Modèle de gouvernance

| Action | Responsable principal | Validation |
|---|---|---|
| Création initiale catalogue | Admin Terrassea | Marque (signature) |
| Mise à jour prix | Marque (self-service) | Auto-validée |
| Ajout nouvelle variante | Marque ou IA détection | Marque valide |
| Retrait modèle | Marque | Auto-validée |
| Correction erreur | Admin Terrassea | Admin valide |
| Modération contenus | Admin Terrassea | Admin valide |

**SLA implicites** :
- Demande MAJ partenaire : traitée sous 48h
- Détection IA d'anomalie : notif partenaire sous 24h
- Litige acheteur sur caractéristique : résolu sous 5 jours

---

## 8. Les 10 sujets transverses critiques

### 8.1 Gestion des médias (images, vidéos, 3D)

Une marque type fournit 500-2000 fichiers par catalogue (5-20 Go). Stockage Supabase Storage avec buckets dédiés (original, display 4 tailles, vidéos, 3D models). Pipeline de transformation à l'upload (AVIF/WebP, 4 tailles, compression). Table dédiée `product_media`.

Coût estimé : ~30€/mois Storage + bandwidth variable.

### 8.2 Recherche fulltext et filtres performants

- **Phase 1 (jusqu'à 500-2000 variantes)** : Postgres natif + indexes BTREE/GIN ciblés + materialized views
- **Phase 2 (2000-50 000)** : Postgres + pg_trgm + tsvector
- **Phase 3 (50 000+)** : Meilisearch (open-source, ~20-50€/mois). Postgres reste source of truth.

### 8.3 Internationalisation (i18n) au-delà des labels

Trois problèmes :
- **Descriptions multilingues** : table `product_descriptions_i18n` + traduction IA on-the-fly
- **Devises et marchés** : Phase 1 EUR uniquement, Phase 2 multi-devises
- **Disponibilité géographique** : champ `available_in_markets text[]` sur variants

### 8.4 Relations entre produits

Table `product_relationships` avec types : `compatible_with`, `same_collection`, `replaces`, `replaced_by`, `cross_sell`, `complementary`. Phase 2 pour implémentation, Phase 3 pour exploitation (recommandations cross-sells).

### 8.5 Versioning et historique des modifications

Pattern Event Sourcing : table `product_variant_change_events` qui logge chaque modification avec old_value, new_value, changed_by, changed_by_role, change_reason, changed_at. Volume : ~2.5M events/an à 100 marques. Postgres avec partition mensuelle. Phase 2.

### 8.6 Permissions granulaires et multi-tenant

Pattern : RLS + `owner_brand_id` sur `products` + table `brand_users`.

Policies clés :
- `products SELECT` : publiés à tous, brouillons aux owners + admins
- `products INSERT/UPDATE/DELETE` : owner brand + admins uniquement
- `product_variants` : héritage parent

**À intégrer dès Phase 1** dans le chantier Modèle B. Reprendre les RLS plus tard est un cauchemar.

### 8.7 Audit logs et conformité

Table dédiée `audit_logs` séparée des tables métier. Logging obligatoire :
- Toute action admin (création, modification, suppression)
- Tout export de données
- Tout accès données sensibles (devis, prix négociés)
- Connexions failed/successful (IP + UA)

Volume estimé : 180k logs/an. Rétention : 5 ans minimum. Phase 2-3.

### 8.8 Performance et caching stratégique

Hot paths à cacher :
- **Listing produits paginé** : cache CDN 1-5 min + invalidation
- **Fiche produit** : cache CDN 5-15 min
- **Recommandations** : pré-calcul nightly + cache 24h

Stack : CDN Vercel + Edge function caching + Postgres prepared statements + optionnel Upstash Redis Phase 2.

### 8.9 SEO produit et pages canoniques

- **URLs canoniques** : `/products/[brand-slug]/[product-slug]` par modèle, `?variant=[sku]` JS-driven pour variantes
- **Meta tags par produit** : title, description, og:image, canonical
- **Schema.org structured data** : ProductGroup + variantes via hasVariant + Brand + Offer
- **Sitemap.xml dynamique** : Edge function avec régénération via webhook

### 8.10 Onboarding partenaire et self-service progressif

Parcours partenaire cible (6 étapes) :
1. Self-service signup
2. Verification + KYC light
3. Onboarding catalogue (PIM/PDF/web/CSV/manuel)
4. Validation Terrassea
5. Publication + go live
6. Maintenance continue self-service

Pages dédiées : `/become-partner`, `/partner/onboarding`, `/partner/catalog`, `/partner/orders`, `/partner/billing`.

Phase 3 pour parcours complet. Phase 1 conserve l'onboarding manuel (création comptes par admin).

---

## 9. Stack technique recommandée

| Composant | Tech recommandée | Raison |
|---|---|---|
| LLM extraction structurée | Claude Sonnet 4 (Anthropic API) | Best-in-class structured output, function calling robuste |
| LLM Vision | Claude Sonnet 4 ou GPT-4o | Multimodal, suit les instructions structurées |
| OCR fallback | Tesseract.js | Open-source, suffisant pour 90% des cas |
| PDF parsing | pdf-parse + pdf-to-image | Standard JS, intégrable Edge Functions |
| Web scraping | Playwright + Cheerio | Headless browser pour JS-heavy sites |
| CSV parsing | Papaparse | Standard, déjà dans dépendances |
| Job queue | Inngest ou Trigger.dev | Modernes, intégrables Vercel |
| Validation runtime | Zod | Cohérent avec le codebase |
| Monitoring | Sentry + Plausible | Déjà prévu Bucket 1 |
| Storage | Supabase Storage | Cohérent avec le reste |
| Rate limiting | Upstash Redis | Pour crawls et appels LLM |
| Search engine (Phase 3) | Meilisearch | Open-source, instant search, facettes natives |

**Coût mensuel estimé Phase 2-3** :
- Claude API : 50-200€/mois selon volume
- Inngest/Trigger.dev : free tier puis 20-50€/mois
- Upstash Redis : free tier puis ~10€/mois
- Meilisearch hosting : 20-50€/mois
- **Total : ~100-300€/mois en cruise**

ROI : économie d'1 admin temps plein (3000-5000€/mois) → ROI x10 à x50.

---

## 10. Roadmap par phases

### Phase 1 — Fondations (mai-juin 2026)

**Chantier 1 — Modèle B variants étendu** (2-2.5 semaines, 5-22 mai)
- Création table `product_variants`
- Migration des 53 produits actuels (1 produit = 1 variante par défaut)
- Champs DB pour Chairs (5) et Armchairs (4) ajoutés
- Table `product_media` créée
- Tables référentielles canoniques **Phase 1** :
  - `colors_canonical` (~50 slugs)
  - `finishes_canonical` (~30 slugs)
  - `material_brands` (~25-30 marques tissus/bois/métaux, seedée depuis fabricBrands.ts)
  - `certifications` (~15-20 certifications environnementales et qualité)
  - `markets` (EU, UK, CH, US, etc.)
- Champ `primary_designer text` simple sur products (préparation Phase 3)
- RLS multi-tenant (`owner_brand_id` + `brand_users`)
- Migration `fabric_certification text` → `material_brand_id uuid` sur variants
- UI partner-dashboard refondue (grid editable + bulk operations)
- Adaptation IntentDetector
- Adaptation tests (objectif 300+ verts)

**Chantier 2 — Engine 5 catégories sur Modèle B** (2-2.5 semaines, 22 mai - 5 juin)
- Profils de scoring 2 niveaux (modèle + variante)
- Hard filters + score additif pondéré
- Explication score niveau 2 (3-5 raisons textuelles)
- Tests sur scénarios réalistes
- UI debug admin
- URLs canoniques propres

**Chantier 3 — Polishing + catalogue démo** (1 semaine, 5-9 juin)
- Saisie manuelle de 30-50 produits réels pour visios mi-juin
- UI fiche produit publique avec sélecteur de variantes
- Schema.org structured data minimal
- Vérification end-to-end intention → matching → résultat

**Total Phase 1** : 5-6 semaines, livré pour visios mi-juin.

### Phase 2 — Ingestion intelligente (juillet-août 2026)

**Chantier 4 — Pipeline d'ingestion IA-first** (2 semaines)
- Edge functions intake + process + publish
- Table `ingestion_jobs` + dashboard admin
- LLM extraction structurée (function calling)
- Validation HITL

**Chantier 5 — PDF Parser intelligent** (1.5 semaine)
- Extraction multimodale Claude Vision
- Découpage par produit
- Cross-référencement images/variantes
- Tests sur 5 catalogues réels (Tribù, Manutti, Roda, Ethimo, Talenti)

**Chantier 6 — Mappers PIM** (1 semaine)
- Mapper Akeneo
- Mapper inRiver
- Mapper générique CSV
- Documentation pour intégration future

**Chantier 7 — Crawler A intégré au pipeline** (1 semaine)
- Crawl mensuel des sites partenaires
- Détection nouvelles variantes / changements de prix
- Pipeline d'alimentation `market_intelligence_products`

**Total Phase 2** : 5-6 semaines, livré août-septembre 2026.

### Phase 3 — Maintenance et data quality (Q4 2026)

**Chantier 8 — Dashboard Data Health** (1 semaine)
- Métriques de qualité par marque
- Alertes drift et anomalies
- Notifications partenaires

**Chantier 9 — Master Data Management avancé** (1.5 semaine)
- Consolidation table `brands` (existante partielle → propre)
- Création `product_lines` (gammes : Vis-à-Vis, Senja, etc.)
- Création `designers` (migration depuis champ texte `primary_designer`)
- Outil admin de gestion des référentiels
- Migration produits vers FK référentielles (lines, designers)
- Note : `material_brands`, `certifications`, `colors_canonical`, `finishes_canonical` sont déjà en Phase 1

**Chantier 10 — Versioning et audit logs** (1 semaine)
- Table `product_variant_change_events`
- Table `audit_logs` avec partition
- UI admin de consultation

**Chantier 11 — i18n produit avancée** (1 semaine)
- Table `product_descriptions_i18n`
- Traduction IA on-the-fly
- Sélecteur de marché

**Total Phase 3** : 4-5 semaines.

### Phase 4 — Industrialisation (2027)

**Chantier 12 — Recherche Meilisearch**
- Intégration moteur dédié
- Synchronisation Postgres → Meilisearch
- Facettes avancées et instant search

**Chantier 13 — ERP integrations**
- API intégration ERP majeurs (SAP, Sage, NetSuite)
- Webhooks stock temps-réel pour Brand Network
- Pricing dynamique

**Chantier 14 — Self-service partenaire complet**
- UI auto-onboarding marques
- Validation IA automatique pour marques de confiance
- Réduction du besoin admin Terrassea de 80%

**Chantier 15 — Couche conversationnelle** (vision long terme)
- Agent IA pour briefs architectes
- Conversation guidée multi-tours
- Recommandations contextuelles enrichies

**Total Phase 4** : 4-6 mois selon volume et priorités.

---

## 11. Décisions actées

Décisions stratégiques validées le 2026-04-30, à appliquer dans Phase 1 :

| ID | Décision | Justification |
|---|---|---|
| D-PV-1 | **Modèle B variants** retenu (vs Modèle A "ligne par variante" ou Modèle C "jsonb sur products") | Sert les 4 personae, standard B2B, condition pour onboarding marques sérieuses |
| D-PV-2 | **Engine score à 2 niveaux** (modèle puis variante) | Reflète la façon de penser des architectes et acheteurs B2B |
| D-PV-3 | **Hard filters + score additif** (Pattern B) pour le scoring | Reflète la réalité B2B où certains critères sont non-négociables |
| D-PV-4 | **Mix B/C pour gestion null** (neutre + UX hint pour critiques, légère pénalité pour nice-to-have) | Encourage le remplissage sans pénaliser injustement |
| D-PV-5 | **Niveau 2 pour explication score** (score + 3-5 raisons textuelles) | Sweet spot entre opacité et complexité |
| D-PV-6 | **5 catégories Engine** (Tables, Parasols, Sun Loungers, Sofas, Bar Stools) **étendues à Chairs et Armchairs** soit 7 catégories | 83% du catalogue actuel est Chairs+Armchairs, ne pas les omettre |
| D-PV-7 | **RLS multi-tenant dès Phase 1** (owner_brand_id + brand_users) | Reprendre RLS plus tard est un cauchemar |
| D-PV-8 | **Table product_media créée Phase 1** (pas Phase 2) | Médias sont structurels, pas un add-on |
| D-PV-9 | **Référentiels canoniques étendus en Phase 1** (colors, finishes, **material_brands, certifications, markets**), complétés Phase 3 (designers, lines, brands consolidées) | Pattern entités partagées critique pour B2B outdoor (cf. section 4.6) |
| D-PV-10 | **URLs canoniques `/products/[brand]/[product]`** dès Phase 1 | SEO solide dès le départ, évite les migrations URL douloureuses |
| D-PV-11 | **Catalogue démo manuel pour visios mi-juin** (30-50 produits) | Pipeline IA pas nécessaire Phase 1, manuel suffit pour démo |
| D-PV-12 | **Pipeline d'ingestion IA en Phase 2** (juillet-août) | Phase 1 reste self-suffisant pour 5-10 marques signées |
| D-PV-13 | **Pattern entités partagées cross-marques** : 1 table par dimension transversale (material_brands, certifications, etc.), pas d'attribut texte sur products/variants | Évite doublons, typos, risques juridiques. Débloque recherche cross-marques + pricing intelligence + storytelling |
| D-PV-14 | **Tissus propriétaires des marques** (Tribùcord, Maestro Outdoor, etc.) référencés dans `material_brands` avec `is_proprietary=true` et `parent_brand_id` | Cohérence du pattern même pour les 10-15% de cas hybrides |
| D-PV-15 | **Champ texte `primary_designer` sur products en Phase 1**, migration vers table `designers` en Phase 3 | Permet d'afficher le designer dès Phase 1 sans alourdir le chantier Modèle B |

---

## 12. Risques identifiés et mitigations

### Risque 1 — Complexité d'import des catalogues marques

**Mitigation** :
- Mapper PIM par tool (pas par marque)
- AI-assisted parsing pour CSV non structurés
- Outil de validation avant import

### Risque 2 — Performance sur grands catalogues

**Mitigation** :
- Indexes ciblés dès la création
- Materialized views pour listings publics
- Pagination stricte
- Meilisearch en V2 si nécessaire

### Risque 3 — Migration des 53 produits actuels

**Mitigation** :
- Stratégie : 1 produit actuel → 1 ligne products + 1 ligne product_variants par défaut
- Pas de perte de données, juste restructuration
- Tests exhaustifs sur les 53 produits avant publication

### Risque 4 — Saisie manuelle des variantes par les partenaires

**Mitigation** :
- UI grid editable (mode tableur)
- Import CSV simple en plus du PIM
- Bulk operations
- IA-assisted creation

### Risque 5 — Cohérence des slugs cross-marques

**Mitigation** :
- Dictionnaire de couleurs canoniques (~50 slugs)
- Mapping marque → canonique géré par catégoryNormalizer étendu
- Recherche par canonique, affichage par libellé marque

### Risque 6 — Volume du chantier de migration

**Mitigation** :
- Découpage en chantiers courts (1-2 semaines max chacun)
- Validation founder à chaque jalon
- Tests verts à chaque étape (méthodologie Plan-Execute déjà éprouvée)

### Risque 7 — Distraction stratégique vs commercial

**Mitigation** :
- Calendrier strict aligné sur fenêtre Salone (visios mi-juin)
- Catalogue démo manuel suffit pour Phase 1
- Pipeline IA Phase 2 démarre après les premières signatures

### Risque 8 — Sur-ingénierie

**Mitigation** :
- Phase 1 livre le minimum viable d'architecture (pas de Meilisearch, pas de versioning event sourcing, pas d'audit logs étendus)
- Phases 2-4 ajoutent par incréments selon métriques réelles
- Document Décisions à chaque chantier pour éviter scope creep

---

## 13. Ce qui reste à trancher

Ces points ne sont pas critiques pour Phase 1 mais devront être tranchés ultérieurement :

1. **Choix entre Inngest vs Trigger.dev** pour le job queue (à trancher Phase 2 selon les patterns de jobs réels)
2. **Politique pricing multi-devises** (EUR uniquement Phase 1, à revoir Phase 2 quand premiers acheteurs UK/CH)
3. **Stratégie de monétisation des Market Reports** (les 27+ champs critiques + variantes structurées rendent possible des analyses de marché vendables — modèle business à concevoir)
4. **Politique de modération automatique vs manuelle** des nouveaux catalogues partenaires (admin ou IA-assisted Phase 3)
5. **Quel modèle Claude utiliser** pour quel cas d'usage (Sonnet 4 par défaut, Opus 4 pour cas complexes type extraction PDF — à calibrer Phase 2 sur métriques réelles)
6. **Stratégie de pricing des plans Brand Member et Brand Network** vs valeur fournie par variants intégrés (à revisiter quand les partenaires utilisent le système)

---

## Annexes

### A. Glossaire métier

| Terme | Définition |
|---|---|
| Modèle (produit) | Une référence design d'un fabricant (ex: "Tribù Vis-à-Vis") |
| Variante | Une déclinaison commercialisable d'un modèle (ex: "Vis-à-Vis 300×300 Sunbrella Beige Aluminium Noir") |
| SKU | Stock Keeping Unit, identifiant unique d'une variante |
| PIM | Product Information Management (Akeneo, inRiver, Pimcore, Salsify) |
| HITL | Human In The Loop (validation humaine dans pipeline IA) |
| RLS | Row Level Security (Postgres) |
| MDM | Master Data Management (gestion des référentiels) |
| Hard filter | Critère absolu qui élimine un produit (vs score qui pondère) |
| Score additif pondéré | Sommation de scores partiels avec poids par dimension |
| Function calling | Pattern LLM où la sortie est typée (vs texte libre) |

### B. Références projet

- Chantier vocab 2026 (clôturé 2026-04-30) : `docs/chantiers/2026-05/CHANGELOG.md`
- Audit Day 1 (2026-04-29) : `docs/audit/2026-04/AUDIT.md`
- Décisions stratégiques projet : `docs/audit/2026-04/STRATEGIC_DECISIONS.md`
- Backlog post-vocab : `docs/chantiers/2026-05/BACKLOG_POST_VOCAB.md`
- Conventions techniques : `CLAUDE.md`

### C. Évolution du document

| Version | Date | Auteur | Changements |
|---|---|---|---|
| 1.0 | 2026-04-30 | Adrien Laniez + copilote | Création initiale, validée pour exécution Phase 1 |
| 1.1 | 2026-05-01 | Adrien Laniez + copilote | Ajout section 4.6 (Pattern entités partagées cross-marques). Élévation de `material_brands` et `certifications` en Phase 1 (D-PV-9 mis à jour, D-PV-13/14/15 ajoutés). Ajout champ texte `primary_designer` Phase 1. Ajustement Chantier 1 Phase 1 (effort 2-2.5 sem au lieu de 1.5-2 sem). Ajustement Chantier 9 Phase 3 (référentiels Phase 1 retirés). Trigger : observation founder sur les marques de tissus partagées entre fabricants structures. |

---

**Fin du document.**

Toute évolution majeure de cette vision (changement d'architecture, nouvelle phase, abandon de décision actée) doit faire l'objet d'une nouvelle version de ce document avec changelog explicite en Annexe C.
