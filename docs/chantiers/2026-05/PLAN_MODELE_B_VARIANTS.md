# PLAN — Chantier Modèle B variants étendu (Phase 1)

> Plan détaillé de l'ÉTAPE 1 du chantier, à valider avant exécution.
> Auteur : Claude Code (avec founder).
> Date : 2026-05-01.
> Référence stratégique : `docs/strategy/PRODUCT_DATA_VISION.md` v1.1 (D-PV-1 → D-PV-15).
> Statut : 🟡 **En attente de validation founder** avant ÉTAPE 2.

---

## 0. Synthèse exécutive

| Item | Valeur |
|---|---|
| Objectif | Refonder l'architecture produits sur Modèle B (1 modèle + N variantes), préparer multi-tenant et référentiels canoniques transverses |
| Décisions stratégiques couvertes | D-PV-1, D-PV-7, D-PV-8, D-PV-9, D-PV-10, D-PV-13, D-PV-14, D-PV-15 |
| Phase | Phase 1 (mai-juin 2026), Chantier 1/3 |
| Effort total estimé | **2.0 — 2.5 semaines** (ÉTAPES 2 → 10) |
| Durée ÉTAPE 1 (ce document) | ~½ journée (analyse + plan) ✅ effectuée |
| Sortie attendue chantier | `product_variants` + 5 référentiels + champs Chairs/Armchairs + multi-tenant + UI partner refondue + 300+ tests verts |
| Hors scope | Engine 2-niveaux (Chantier 2), pipeline IA (Phase 2), versioning event sourcing, audit logs étendus, refacto god components |
| Catalogue actuel à migrer | **53 produits**, 1 product → 1 product + 1 default variant |
| Tests baseline | **264 verts**, cible **300+** |

---

## 1. Findings de la reconnaissance code

### 1.1 Schéma `products` actuel

- **~110 colonnes** (cf. `src/integrations/supabase/types.ts:2961-3294`).
- Beaucoup de champs sont déjà *de facto* "niveau modèle" : `name`, `category`, `subcategory`, `material_structure`, descriptions i18n, tags (style/ambience/material/use-case/technical/palette), spec critiques par catégorie (chantier vocab 2026).
- Plusieurs champs sont *de facto* "niveau variante" (à migrer vers `product_variants`) :
  - `dimensions_length_cm`, `dimensions_width_cm`, `dimensions_height_cm`
  - `seat_height_cm`
  - `weight_kg`
  - `stock_status`, `stock_quantity`, `availability_type`, `estimated_delivery_days`
  - `price_min`, `price_max`, `indicative_price`
  - `main_color`, `secondary_color`, `available_colors`
  - `color_variants` (jsonb), `dimension_variants` (jsonb) ⇐ remplacés par lignes `product_variants`
  - `fabric_certification` ⇐ migré vers `material_brand_id` sur `product_variants`
  - `image_url`, `gallery_urls`, `environment_urls` ⇐ migrés vers `product_media`
- Les champs Chairs déjà présents : `nesting_capacity`, `is_stackable`, `weight_kg`. **Manquent** : `has_armrests`, `chair_structure_type`, `outdoor_classification`. Note : `weight_kg` est dans la liste vision Chairs (section 4.3) **mais existe déjà** comme colonne sur products — à confirmer si on dédoublonne ou si on l'amène sur variants. Recommandation : laisser `weight_kg` sur `products` (poids "type" du modèle) **et** ajouter `weight_kg` sur `product_variants` pour les variantes vraiment plus lourdes/légères (cas rare, optionnel).
- Les champs Armchairs : `seat_depth_cm` et `cushion_replacement_available` existent déjà. **Manquent** : `usage_mode` (dining/lounge/flex), `has_armrests`. (`has_armrests` est commun à Chairs+Armchairs — une seule colonne nullable suffit.)
- Aucun champ `primary_designer`, `owner_brand_id`.

### 1.2 FK pointant sur `products.id` (14 tables, 16 FK)

| Table | FK col | Action Phase 1 |
|---|---|---|
| `board_items` | `product_id` | conservée (board cite un modèle) |
| `concept_events` | `product_id` | conservée (analytics au niveau modèle) |
| `orders` | `product_id` | conservée + ajouter `product_variant_id NULL` (préparation Phase 2) |
| `partner_arrival_items` | `product_id` | conservée + ajouter `product_variant_id NULL` (option) |
| `partner_featured_products` | `product_id` | conservée |
| `preorders` | `product_id` | conservée + ajouter `product_variant_id NULL` (préparation Phase 2) |
| `product_offers` | `product_id` | conservée + ajouter `product_variant_id NULL` (préparation Phase 2) |
| `product_reviews` | `product_id` | conservée |
| `product_submissions` | `approved_product_id`, `detected_duplicate_id`, `target_product_id` | conservées (submissions = niveau modèle) |
| `project_briefs` | `product_id` | conservée |
| `project_cart_items` | `product_id` | conservée + ajouter `product_variant_id NULL` (option) |
| `project_zone_products` | `product_id` | conservée |
| `quote_requests` | `product_id` | conservée + ajouter `product_variant_id NULL` (préparation Phase 2) |
| `products.duplicate_of` (self) | `duplicate_of` | conservée |

**Décision proposée** : ne **migrer aucune** FK existante en Phase 1. Ajouter `product_variant_id uuid NULL REFERENCES product_variants(id)` sur **5 tables clés** (`orders`, `preorders`, `product_offers`, `quote_requests`, `partner_arrival_items`) pour permettre une bascule progressive en Phase 2 sans nouvelle migration coûteuse. Aucun code applicatif ne dépend encore de ce champ ; il reste NULL Phase 1.

### 1.3 Code applicatif touché

| Fichier | Lignes | Rôle | Impact chantier |
|---|---:|---|---|
| `src/lib/products.ts` | ~600 | Types `DBProduct`, `ColorVariant`, `DimensionVariant`, `fetchProducts` | Étendre : type `DBProductVariant`, `fetchProductWithVariants`, mapping legacy `dimension_variants` jsonb → variants rows |
| `src/lib/categoryNormalizer.ts` | ~existant | Catégorie lowercase-kebab | RAS |
| `src/lib/productQualityScore.ts` | ~existant | Score qualité | À étendre pour score variant-aware (option) |
| `src/components/partner-dashboard/AddProductForm.tsx` | 1486 | UI saisie partner | Refonte majeure ÉTAPE 7 — grid editable + bulk + variants |
| `src/components/admin/ProductReviewHelpers.tsx` | 591 | UI admin review | Adapter ÉTAPE 8 |
| `src/components/admin/AdminProductReviews.tsx` | ? | UI admin liste | À regarder ÉTAPE 8 |
| `src/components/admin/AdminAIScanner.tsx` | ? | AI re-tag | À adapter (scope minimal Phase 1, propre Phase 2) |
| `src/components/admin/ColorVariantEditor.tsx` | ? | Éditeur color jsonb | **Déprécier** — remplacé par variants rows |
| `src/components/admin/DimensionVariantEditor.tsx` | ? | Éditeur dim jsonb | **Déprécier** — remplacé par variants rows |
| `src/hooks/useProductSubmissions.ts` | 831 | Submission flow | Adapter pour soumettre N variants associés |
| `src/hooks/useProducts.ts` | 111 | Fetch produits | Étendre pour joindre variants |
| `src/engine/intentDetector.ts` | 1150 | Filtres intent → produits | Étendre `filterProducts` pour filtrer par axes variant (dimension, fabric brand, color) |
| `src/engine/similarityEngine.ts` | ? | Dédoublonnage | RAS Phase 1 (similarity reste niveau modèle) |
| `supabase/functions/enrich-products/index.ts` | 227 | AI re-tag | Prompt à rafraîchir mais hors scope strict (cf. Backlog post-vocab §6) |
| `supabase/functions/analyze-csv-products/index.ts` | 187 | AI ingestion | RAS Phase 1, scope Phase 2 |
| `supabase/functions/analyze-product-image/index.ts` | 150 | AI vision | RAS Phase 1 |
| `supabase/functions/analyze-terrace/index.ts` | ? | AI brief | RAS Phase 1 |
| `src/components/products/specs/*` | 6 fichiers | Specs sub-components | RAS (déjà strict Phase 1) |
| `src/engine/dictionaries/fabricBrands.ts` | ~80 | 7 slugs fabric | **Réutilisé** pour seeder `material_brands` (cf. D-PV-9) |

### 1.4 Trigger `auto_derive_product_tags`

Existe (migration `20260430132842`). Dérive 8 tags vocab 2026 depuis colonnes `products`. Phase 1 : **status quo** — le trigger reste sur `products`, ne touche pas aux variants. Phase 2 : à étendre pour réagir aussi aux UPDATE sur variants si besoin.

### 1.5 Tests baseline

`bun run test` : **264 tests verts** dans 13 fichiers. Cible chantier : **300+** (≥ 36 nouveaux tests à écrire).

---

## 2. Architecture cible — DDL exhaustif

8 migrations atomiques, dans cet ordre. Chaque migration applique via `mcp__supabase__apply_migration` ET crée le fichier local `supabase/migrations/YYYYMMDDHHMMSS_*.sql` AVANT commit (règle source-of-truth).

### Migration 1 — `*_create_phase1_referentials.sql`

```sql
-- 5 tables référentielles canoniques (D-PV-9, D-PV-13)

CREATE TABLE public.material_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('fabric', 'wood', 'metal', 'composite', 'other')),
  parent_company text,
  description_i18n jsonb,
  logo_url text,
  official_website text,
  is_premium boolean DEFAULT false,
  is_proprietary boolean DEFAULT false,
  parent_brand_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,  -- ⚠️ partners(id), pas brands (cf. CLAUDE.md)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT material_brands_proprietary_has_parent
    CHECK (is_proprietary = false OR parent_brand_id IS NOT NULL)
);

CREATE INDEX idx_material_brands_category ON public.material_brands(category);
CREATE INDEX idx_material_brands_parent_brand_id ON public.material_brands(parent_brand_id) WHERE parent_brand_id IS NOT NULL;

CREATE TABLE public.certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('environmental', 'quality', 'safety', 'origin', 'other')),
  description_i18n jsonb,
  logo_url text,
  official_website text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_certifications_category ON public.certifications(category);

-- Lien material_brands ↔ certifications (N-N)
CREATE TABLE public.material_brand_certifications (
  material_brand_id uuid NOT NULL REFERENCES public.material_brands(id) ON DELETE CASCADE,
  certification_id uuid NOT NULL REFERENCES public.certifications(id) ON DELETE CASCADE,
  PRIMARY KEY (material_brand_id, certification_id)
);
-- Note: vision doc 4.6 mentionne `certifications_associated uuid[]` — on préfère table N-N
-- pour FK strictes + indexabilité. Justifié dans la section "Décisions techniques".

CREATE TABLE public.colors_canonical (
  slug text PRIMARY KEY,
  label_i18n jsonb NOT NULL,            -- {en, fr, es, it}
  hex text NOT NULL CHECK (hex ~ '^#[0-9A-Fa-f]{6}$'),
  family text CHECK (family IN ('neutral', 'warm', 'cool', 'earth', 'jewel', 'pastel', 'metallic', 'wood', 'other')),
  display_order int DEFAULT 100,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.finishes_canonical (
  slug text PRIMARY KEY,
  label_i18n jsonb NOT NULL,
  category text CHECK (category IN ('wood', 'metal', 'fabric', 'composite', 'other')),
  display_order int DEFAULT 100,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.markets (
  code text PRIMARY KEY,                -- 'EU', 'UK', 'CH', 'FR', 'DE', 'IT', 'ES', 'US'
  label_i18n jsonb NOT NULL,
  currency text NOT NULL,               -- ISO 4217
  is_active boolean DEFAULT true,
  display_order int DEFAULT 100,
  created_at timestamptz DEFAULT now()
);

-- RLS : référentiels en lecture publique, écriture admin only
ALTER TABLE public.material_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_brand_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colors_canonical ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finishes_canonical ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;

-- Pattern uniforme : SELECT public, INSERT/UPDATE/DELETE admin only
-- (helper public.is_admin() existant, cf. migration 20260408200000)
CREATE POLICY material_brands_select_public ON public.material_brands FOR SELECT USING (true);
CREATE POLICY material_brands_admin_write ON public.material_brands FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
-- (idem pour les 5 autres tables — bloc identique répété)
```

### Migration 2 — `*_seed_phase1_referentials.sql`

```sql
-- material_brands : seed depuis fabricBrands.ts (7 slugs) + ~18 ajouts
-- Total visé ~25-30 lignes (D-PV-9, vision section 4.4)
-- 5 fabric premium déjà connus + Other + Unknown
-- + ~5 fabric supplémentaires (Sergio, Ikatex, Para Tempotest, etc.)
-- + ~5 wood (FSC Teak Plantation, FSC Iroko, FSC Acacia, FSC Robinia, FSC Eucalyptus)
-- + ~5 metal (Aluminium 6063, Stainless Steel 316, Iron Powder Coated, Brass, Bronze)
-- + ~3 composite (HPL Compact, Composite Wood, Polyrattan PE)

INSERT INTO public.material_brands (slug, name, category, is_premium) VALUES
  ('sunbrella', 'Sunbrella', 'fabric', true),
  ('solaris', 'Solaris', 'fabric', true),
  ('dickson-orchestra', 'Dickson Orchestra', 'fabric', true),
  ('dickson-saphir', 'Dickson Saphir', 'fabric', true),
  ('serge-ferrari', 'Serge Ferrari', 'fabric', true),
  -- ... ~20 lignes additionnelles
  ('other-fabric', 'Other (fabric)', 'fabric', false),
  ('unknown', 'Unknown', 'other', false);
-- ⚠️ slugs lowercase-kebab (cohérent avec catégories normalisées chantier vocab)
-- ⚠️ Mapping FabricBrandSlug TS (CamelCase) → DB (kebab) géré dans util TS dédiée

-- certifications : ~15-20 lignes
INSERT INTO public.certifications (slug, name, category) VALUES
  ('fsc', 'FSC (Forest Stewardship Council)', 'environmental'),
  ('pefc', 'PEFC', 'environmental'),
  ('oeko-tex', 'OEKO-TEX Standard 100', 'environmental'),
  ('greenguard', 'GREENGUARD', 'environmental'),
  ('greenguard-gold', 'GREENGUARD Gold', 'environmental'),
  ('cradle-to-cradle', 'Cradle to Cradle', 'environmental'),
  ('ecolabel-eu', 'EU Ecolabel', 'environmental'),
  ('iso-9001', 'ISO 9001', 'quality'),
  ('iso-14001', 'ISO 14001', 'environmental'),
  ('en-1335', 'EN 1335 (office chair safety)', 'safety'),
  ('en-581', 'EN 581 (outdoor furniture)', 'safety'),
  ('reach', 'REACH', 'safety'),
  ('fr-fire-class-1', 'Fire Class M1 (FR)', 'safety'),
  ('m2', 'Fire Class M2', 'safety'),
  ('made-in-italy', 'Made in Italy', 'origin'),
  ('made-in-france', 'Made in France', 'origin'),
  ('made-in-eu', 'Made in EU', 'origin');
-- (~17 lignes seedées)

-- colors_canonical : ~50 lignes (extraction depuis enrich-products SYSTEM_PROMPT existant)
INSERT INTO public.colors_canonical (slug, label_i18n, hex, family, display_order) VALUES
  ('white', '{"en":"White","fr":"Blanc","es":"Blanco","it":"Bianco"}'::jsonb, '#FFFFFF', 'neutral', 10),
  ('off-white', '{"en":"Off-white","fr":"Blanc cassé","es":"Hueso","it":"Bianco sporco"}'::jsonb, '#F5F2EA', 'neutral', 11),
  -- ... ~50 lignes (white, off-white, cream, ivory, sand, natural, beige, champagne, taupe,
  -- grey, graphite, charcoal, anthracite, black, teak, walnut, dark-brown, chocolate,
  -- terracotta, rust, copper, red, bordeaux, mustard, gold, yellow, olive, sage, green,
  -- navy, petrol, blue, blush, silver, bronze, + 15 spécifiques outdoor)
  ('bronze', '{"en":"Bronze","fr":"Bronze","es":"Bronce","it":"Bronzo"}'::jsonb, '#65503D', 'metallic', 990);

-- finishes_canonical : ~30 lignes
INSERT INTO public.finishes_canonical (slug, label_i18n, category) VALUES
  ('teak-natural', '{"en":"Natural teak","fr":"Teck naturel","es":"Teca natural","it":"Teak naturale"}'::jsonb, 'wood'),
  ('teak-aged', '{"en":"Aged teak","fr":"Teck vieilli","es":"Teca envejecida","it":"Teak invecchiato"}'::jsonb, 'wood'),
  ('aluminum-anodized', '{"en":"Anodized aluminium","fr":"Aluminium anodisé","es":"Aluminio anodizado","it":"Alluminio anodizzato"}'::jsonb, 'metal'),
  -- ... ~30 lignes
  ('powder-coat-matte-black', '{"en":"Matte black powder coat","fr":"Époxy noir mat","es":"Recubrimiento epoxi negro mate","it":"Vernice epossidica nera opaca"}'::jsonb, 'metal');

-- markets : 8 marchés Phase 1 (EU + 6 pays + US)
INSERT INTO public.markets (code, label_i18n, currency, display_order) VALUES
  ('EU',  '{"en":"European Union","fr":"Union européenne","es":"Unión Europea","it":"Unione Europea"}'::jsonb, 'EUR', 1),
  ('FR',  '{"en":"France","fr":"France","es":"Francia","it":"Francia"}'::jsonb, 'EUR', 10),
  ('IT',  '{"en":"Italy","fr":"Italie","es":"Italia","it":"Italia"}'::jsonb, 'EUR', 20),
  ('ES',  '{"en":"Spain","fr":"Espagne","es":"España","it":"Spagna"}'::jsonb, 'EUR', 30),
  ('DE',  '{"en":"Germany","fr":"Allemagne","es":"Alemania","it":"Germania"}'::jsonb, 'EUR', 40),
  ('UK',  '{"en":"United Kingdom","fr":"Royaume-Uni","es":"Reino Unido","it":"Regno Unito"}'::jsonb, 'GBP', 50),
  ('CH',  '{"en":"Switzerland","fr":"Suisse","es":"Suiza","it":"Svizzera"}'::jsonb, 'CHF', 60),
  ('US',  '{"en":"United States","fr":"États-Unis","es":"Estados Unidos","it":"Stati Uniti"}'::jsonb, 'USD', 90);
```

### Migration 3 — `*_create_product_variants.sql`

```sql
-- D-PV-1, vision section 4.2 — schéma exact, légères adaptations alignement existant

CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,

  -- Identifiants commerciaux
  sku text,                              -- UNIQUE par owner, pas global (cf. décision technique §3)
  variant_name text,                     -- libellé human-readable

  -- Dimensions
  width_cm numeric(6,1),
  depth_cm numeric(6,1),
  height_cm numeric(6,1),
  diameter_cm numeric(6,1),
  shape text CHECK (shape IS NULL OR shape IN ('round', 'square', 'rectangle', 'oval', 'asymmetric', 'modular')),
  weight_kg numeric(6,2),                -- ⚠️ ajouté en plus du `weight_kg` sur products (variant override optionnel)

  -- Tissu
  material_brand_id uuid REFERENCES public.material_brands(id) ON DELETE SET NULL,
  fabric_color_slug text REFERENCES public.colors_canonical(slug) ON DELETE SET NULL,
  fabric_color_label_i18n jsonb,         -- override marque, optionnel
  fabric_color_hex text CHECK (fabric_color_hex IS NULL OR fabric_color_hex ~ '^#[0-9A-Fa-f]{6}$'),

  -- Structure
  frame_finish_slug text REFERENCES public.finishes_canonical(slug) ON DELETE SET NULL,
  frame_finish_label_i18n jsonb,

  -- Configuration spécifique
  configuration_module text,             -- pour Sofas modulaires (free text → enum Phase 2)
  subdivision text CHECK (subdivision IS NULL OR subdivision IN ('counter', 'bar', 'tall', 'unknown')),

  -- Options et features
  has_armrests boolean,
  has_wheels boolean DEFAULT false,
  has_cushion boolean DEFAULT false,
  is_stackable boolean DEFAULT false,

  -- Pricing & disponibilité
  price_eur numeric(10,2),
  price_currency text DEFAULT 'EUR' REFERENCES public.markets(code) ON DELETE SET DEFAULT,
  -- ⚠️ FK currency → markets.code OU table currencies dédiée ? Décision : on garde markets.code en Phase 1 (assez minimal)
  in_stock boolean DEFAULT false,
  stock_quantity int CHECK (stock_quantity IS NULL OR stock_quantity >= 0),
  delivery_weeks_min int CHECK (delivery_weeks_min IS NULL OR delivery_weeks_min >= 0),
  delivery_weeks_max int CHECK (delivery_weeks_max IS NULL OR delivery_weeks_max >= delivery_weeks_min),
  is_made_to_order boolean DEFAULT false,

  -- Disponibilité géographique
  available_in_markets text[],           -- array de markets.code (validé app-side Phase 1, FK array via trigger Phase 2)

  -- Médias spécifiques (FK forward declaration : product_media créé en migration 4)
  primary_media_id uuid,                 -- FK ajoutée plus tard (migration 4)

  -- Traçabilité (data lineage — préparation Phase 2 ingestion IA)
  source_type text CHECK (source_type IS NULL OR source_type IN ('pim', 'pdf-extraction', 'web-scraping', 'csv-import', 'manual')),
  source_url text,
  extracted_at timestamptz,
  validated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  validated_at timestamptz,
  confidence_score numeric(3,2) CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),

  -- Méta
  is_published boolean DEFAULT false,
  is_default boolean DEFAULT false,      -- ⚠️ AJOUT vs spec vision : marque la "variante par défaut" affichée si aucune sélection
  discontinued_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Une seule variante "default" par product
CREATE UNIQUE INDEX product_variants_one_default_per_product
  ON public.product_variants(product_id) WHERE is_default = true;

-- Indexes (vision section 4.2)
CREATE INDEX idx_variants_product_id ON public.product_variants(product_id);
CREATE INDEX idx_variants_dimension ON public.product_variants(width_cm, depth_cm) WHERE width_cm IS NOT NULL;
CREATE INDEX idx_variants_material_brand ON public.product_variants(material_brand_id) WHERE material_brand_id IS NOT NULL;
CREATE INDEX idx_variants_fabric_color ON public.product_variants(fabric_color_slug) WHERE fabric_color_slug IS NOT NULL;
CREATE INDEX idx_variants_finish ON public.product_variants(frame_finish_slug) WHERE frame_finish_slug IS NOT NULL;
CREATE INDEX idx_variants_price ON public.product_variants(price_eur) WHERE price_eur IS NOT NULL;
CREATE INDEX idx_variants_published ON public.product_variants(is_published) WHERE is_published = true;
CREATE INDEX idx_variants_in_stock ON public.product_variants(in_stock) WHERE in_stock = true;
CREATE INDEX idx_variants_sku ON public.product_variants(sku) WHERE sku IS NOT NULL;

-- updated_at trigger (réutiliser fonction existante)
CREATE TRIGGER product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
-- (vérifier que cette fonction existe ; sinon en créer une — pattern standard)

-- RLS — multi-tenant héritée (cf. migration 6)
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
-- (policies créées en migration 6 quand owner_brand_id existe sur products)
```

### Migration 4 — `*_create_product_media.sql` (D-PV-8)

```sql
CREATE TABLE public.product_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  -- Soit l'un soit l'autre est non-null (médias modèle OU variante)
  CONSTRAINT product_media_one_owner CHECK (
    (product_id IS NOT NULL AND variant_id IS NULL) OR
    (product_id IS NULL AND variant_id IS NOT NULL)
  ),

  kind text NOT NULL CHECK (kind IN ('image', 'video', 'model-3d', 'document')),
  url text NOT NULL,
  alt_text_i18n jsonb,
  width_px int,
  height_px int,
  bytes int,
  display_order int DEFAULT 100,
  is_primary boolean DEFAULT false,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_media_product_id ON public.product_media(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_media_variant_id ON public.product_media(variant_id) WHERE variant_id IS NOT NULL;
CREATE INDEX idx_media_primary ON public.product_media(is_primary) WHERE is_primary = true;

-- FK différée maintenant que product_media existe
ALTER TABLE public.product_variants
  ADD CONSTRAINT product_variants_primary_media_fk
  FOREIGN KEY (primary_media_id) REFERENCES public.product_media(id) ON DELETE SET NULL;

ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
-- Policies : public read, owner write (pattern multi-tenant, cf. migration 6)
```

### Migration 5 — `*_extend_products_chairs_armchairs_designer.sql`

```sql
ALTER TABLE public.products
  -- Chairs (D-PV-6)
  ADD COLUMN has_armrests boolean,                              -- partagé Chairs+Armchairs+Sofas
  ADD COLUMN chair_structure_type text
    CHECK (chair_structure_type IS NULL OR chair_structure_type IN
      ('cantilever', 'four-leg', 'sled', 'swivel', 'wheels', 'other')),
  ADD COLUMN outdoor_classification text
    CHECK (outdoor_classification IS NULL OR outdoor_classification IN
      ('indoor-only', 'covered-outdoor', 'fully-outdoor', 'marine-grade')),
  -- weight_kg : déjà présent sur products (status quo)
  -- nesting_capacity : déjà présent sur products (status quo)

  -- Armchairs (D-PV-6)
  ADD COLUMN usage_mode text
    CHECK (usage_mode IS NULL OR usage_mode IN ('dining', 'lounge', 'flex')),
  -- has_armrests : commun avec Chairs (déjà ajouté plus haut)
  -- seat_depth_cm : déjà présent sur products (status quo)
  -- cushion_replacement_available : déjà présent sur products (status quo)

  -- Designer Phase 1 (D-PV-15)
  ADD COLUMN primary_designer text,

  -- Multi-tenant Phase 1 (D-PV-7) — ajouté ici, NULL pour l'instant
  ADD COLUMN owner_brand_id uuid REFERENCES public.partners(id) ON DELETE RESTRICT;
  -- ⚠️ NULL pendant la migration 7 (backfill); RLS strictement aligné en migration 8.

CREATE INDEX idx_products_owner_brand_id ON public.products(owner_brand_id) WHERE owner_brand_id IS NOT NULL;
CREATE INDEX idx_products_has_armrests ON public.products(has_armrests) WHERE has_armrests IS NOT NULL;
```

### Migration 6 — `*_create_brand_users.sql` (D-PV-7)

```sql
CREATE TABLE public.brand_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (brand_id, user_id)
);

CREATE INDEX idx_brand_users_user_id ON public.brand_users(user_id);
CREATE INDEX idx_brand_users_brand_id ON public.brand_users(brand_id);

ALTER TABLE public.brand_users ENABLE ROW LEVEL SECURITY;

-- Helper SECURITY DEFINER : "user X est-il editor de brand B ?"
CREATE OR REPLACE FUNCTION public.is_brand_member(p_brand_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.brand_users
    WHERE brand_id = p_brand_id AND user_id = p_user_id
      AND is_active = true AND accepted_at IS NOT NULL
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_brand_member(uuid, uuid) TO authenticated, anon;

-- Policies brand_users
CREATE POLICY brand_users_self_select ON public.brand_users
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY brand_users_admin_all ON public.brand_users
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
-- Phase 1 : pas de self-invite, l'admin gère manuellement les invites.
-- Phase 2 : flow d'invitation self-service.
```

### Migration 7 — `*_migrate_53_products_to_variants.sql` ⚠️ migration de données

```sql
-- DÉCISION CRITIQUE : 1 product = 1 variant default unique
-- Champs migrés : dimensions, color/fabric/finish, stock, delivery, fabric_certification

-- Mapping fabric_certification (CamelCase enum) → material_brand_id (slug kebab)
-- via lookup CTE
WITH fabric_mapping AS (
  SELECT 'Sunbrella' AS legacy, mb.id AS new_id FROM public.material_brands mb WHERE mb.slug = 'sunbrella'
  UNION ALL SELECT 'Solaris', id FROM public.material_brands WHERE slug = 'solaris'
  UNION ALL SELECT 'Dickson_Orchestra', id FROM public.material_brands WHERE slug = 'dickson-orchestra'
  UNION ALL SELECT 'Dickson_Saphir', id FROM public.material_brands WHERE slug = 'dickson-saphir'
  UNION ALL SELECT 'Serge_Ferrari', id FROM public.material_brands WHERE slug = 'serge-ferrari'
  UNION ALL SELECT 'Other', id FROM public.material_brands WHERE slug = 'other-fabric'
  UNION ALL SELECT 'Unknown', id FROM public.material_brands WHERE slug = 'unknown'
)
INSERT INTO public.product_variants (
  product_id,
  variant_name,
  width_cm, depth_cm, height_cm,
  weight_kg,
  material_brand_id,
  fabric_color_slug,
  is_stackable,
  price_eur,
  in_stock,
  stock_quantity,
  delivery_weeks_min, delivery_weeks_max,
  is_made_to_order,
  is_published,
  is_default,
  source_type
)
SELECT
  p.id AS product_id,
  COALESCE(p.name || ' (default)', 'Default') AS variant_name,
  p.dimensions_length_cm, p.dimensions_width_cm, p.dimensions_height_cm,
  p.weight_kg,
  fm.new_id,
  -- main_color → si présent dans colors_canonical, on map ; sinon NULL
  CASE WHEN EXISTS (SELECT 1 FROM public.colors_canonical c WHERE c.slug = p.main_color)
       THEN p.main_color ELSE NULL END,
  COALESCE(p.is_stackable, false),
  COALESCE(p.price_min, NULLIF(REGEXP_REPLACE(p.indicative_price, '[^0-9.]', '', 'g'), '')::numeric),
  CASE WHEN p.stock_status IN ('available', 'in_stock') THEN true ELSE false END,
  p.stock_quantity,
  CASE WHEN p.estimated_delivery_days IS NOT NULL
       THEN GREATEST(1, p.estimated_delivery_days / 7) ELSE NULL END,
  CASE WHEN p.estimated_delivery_days IS NOT NULL
       THEN CEIL(p.estimated_delivery_days::numeric / 7)::int ELSE NULL END,
  COALESCE(p.availability_type = 'made_to_order', false),
  COALESCE(p.publish_status = 'published', false),
  true,                                    -- is_default = true (1 par produit)
  'manual'                                 -- source_type
FROM public.products p
LEFT JOIN fabric_mapping fm ON p.fabric_certification = fm.legacy;

-- Vérification : 1 variant par produit
DO $$
DECLARE
  product_count int;
  variant_count int;
BEGIN
  SELECT COUNT(*) INTO product_count FROM public.products;
  SELECT COUNT(*) INTO variant_count FROM public.product_variants;
  IF variant_count != product_count THEN
    RAISE EXCEPTION 'Migration mismatch: % products vs % variants', product_count, variant_count;
  END IF;
END $$;

-- Backfill owner_brand_id sur products depuis partner_id (si partner_type='brand')
UPDATE public.products p
SET owner_brand_id = p.partner_id
WHERE p.partner_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.partners pa
    WHERE pa.id = p.partner_id
      AND (pa.partner_type = 'brand' OR pa.partner_mode IN ('brand_member', 'brand_network'))
  );
-- ⚠️ Les produits sans partner_id ou non-brand restent owner_brand_id NULL en Phase 1.
-- Ils sont gérés exclusivement en admin (cf. RLS migration 8).
```

### Migration 8 — `*_rls_multi_tenant_products_variants.sql` (D-PV-7)

```sql
-- Reset des policies existantes sur products (audit Phase 1.5 nécessaire avant — vérifier RECON)
-- ... DROP existing policies on products ...

-- products SELECT
CREATE POLICY products_select_published ON public.products
  FOR SELECT USING (publish_status = 'published');
CREATE POLICY products_select_own_brand ON public.products
  FOR SELECT USING (
    owner_brand_id IS NOT NULL AND public.is_brand_member(owner_brand_id)
  );
CREATE POLICY products_select_admin ON public.products
  FOR SELECT USING (public.is_admin());

-- products INSERT/UPDATE/DELETE
CREATE POLICY products_write_own_brand ON public.products
  FOR ALL
  USING (owner_brand_id IS NOT NULL AND public.is_brand_member(owner_brand_id))
  WITH CHECK (owner_brand_id IS NOT NULL AND public.is_brand_member(owner_brand_id));
CREATE POLICY products_write_admin ON public.products
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- product_variants : héritage parent (via subquery)
CREATE POLICY variants_select_published ON public.product_variants
  FOR SELECT USING (
    is_published = true
    OR EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_variants.product_id
        AND (p.publish_status = 'published')
    )
  );
CREATE POLICY variants_select_own_brand ON public.product_variants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_variants.product_id
        AND p.owner_brand_id IS NOT NULL
        AND public.is_brand_member(p.owner_brand_id)
    )
  );
CREATE POLICY variants_select_admin ON public.product_variants
  FOR SELECT USING (public.is_admin());

CREATE POLICY variants_write_own_brand ON public.product_variants
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_variants.product_id
        AND p.owner_brand_id IS NOT NULL
        AND public.is_brand_member(p.owner_brand_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_variants.product_id
        AND p.owner_brand_id IS NOT NULL
        AND public.is_brand_member(p.owner_brand_id)
    )
  );
CREATE POLICY variants_write_admin ON public.product_variants
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- product_media : héritage idem
-- ... policies analogues

-- ⚠️ ATTENTION : pattern admin + owner-policy = 2 policies par action × role.
-- Cohérent avec le warning `multiple_permissive_policies` documenté Bucket 3 (CLAUDE.md §7).
-- Acceptable Phase 1 — chantier dédié d'optimisation Q3 2026.
```

### Migration 9 — `*_add_variant_id_to_consumer_tables.sql` (préparation Phase 2)

```sql
-- 5 tables : on ajoute product_variant_id NULL pour préparer la bascule Phase 2
-- Aucune valeur n'est insérée en Phase 1. Le code applicatif ignore ce champ.

ALTER TABLE public.orders
  ADD COLUMN product_variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL;
ALTER TABLE public.preorders
  ADD COLUMN product_variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL;
ALTER TABLE public.product_offers
  ADD COLUMN product_variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL;
ALTER TABLE public.quote_requests
  ADD COLUMN product_variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL;
ALTER TABLE public.partner_arrival_items
  ADD COLUMN product_variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL;

CREATE INDEX idx_orders_product_variant_id ON public.orders(product_variant_id) WHERE product_variant_id IS NOT NULL;
CREATE INDEX idx_preorders_product_variant_id ON public.preorders(product_variant_id) WHERE product_variant_id IS NOT NULL;
CREATE INDEX idx_product_offers_variant_id ON public.product_offers(product_variant_id) WHERE product_variant_id IS NOT NULL;
CREATE INDEX idx_quote_requests_variant_id ON public.quote_requests(product_variant_id) WHERE product_variant_id IS NOT NULL;
CREATE INDEX idx_partner_arrival_items_variant_id ON public.partner_arrival_items(product_variant_id) WHERE product_variant_id IS NOT NULL;
```

---

## 3. Décisions techniques (auto-arbitrées dans la limite du scope vision)

| Choix | Décision proposée | Justification |
|---|---|---|
| `material_brand_certifications` table N-N vs `uuid[]` | Table N-N | FK strictes, indexabilité, cohérence Postgres. La spec vision (4.6) propose `uuid[]` mais explicitement comme illustration ; pas une décision actée. |
| FK `currency` → `markets.code` ou nouvelle table currencies | `markets.code` Phase 1 | Évite une table de plus. Quand i18n monétaire mature en Phase 2, on extraira `currencies` propre. |
| `is_default` boolean sur variants (1 par produit) | AJOUTÉ vs spec | Phase 1 = 1 product = 1 default variant. Le UI public Phase 1 affiche cette variant par défaut. Pas dans la spec vision mais nécessaire pour migration ordonnée. |
| `weight_kg` sur products + variants | Doublon volontaire | products = poids "type" du modèle ; variants = override si une déclinaison spécifique pèse différemment (rare). NULL acceptable sur variants. |
| `has_armrests` sur products + variants | Doublon volontaire | Idem : products = niveau modèle (la plupart des Chairs ont accoudoirs ou non) ; variants = override (rare : version sans accoudoirs en option). |
| `owner_brand_id` séparé de `partner_id` | Nouvelle colonne | `partner_id` est legacy (peut être NULL pour produits seedés admin). `owner_brand_id` est la source-of-truth multi-tenant. Backfill depuis `partner_id` en migration 7. `partner_id` reste pour backward compat ; à déprécier en Phase 2. |
| Slugs `material_brands` lowercase-kebab | Cohérence catégorie post-vocab | Aligne avec catégories normalisées 2026-04-30. Mapping `FabricBrandSlug` (CamelCase TS) ↔ DB (kebab) via util TS dédié `src/lib/materialBrandsMapping.ts`. |
| 14 FK existantes vers products.id | **Aucune migration Phase 1** | 1 product = 1 default variant ; le code applicatif n'a pas encore besoin de référencer un SKU précis. 5 tables clés (orders/preorders/product_offers/quote_requests/partner_arrival_items) reçoivent un `product_variant_id NULL` en migration 9 pour préparer Phase 2. |
| `auto_derive_product_tags` trigger | Status quo Phase 1 | Trigger reste sur products. Phase 2 : extension sur variants si `premium-fabric` doit dépendre de la variant. |
| Tissus propriétaires (Tribùcord, Maestro Outdoor) | **Pas seedés Phase 1** | Marques structures correspondantes (Tribù, Manutti) pas encore en DB. Seed migration 2 ne référence que des matériaux génériques + 7 fabric brands premium déjà connus. Tissus propriétaires ajoutés ÉTAPE 8 (admin manuel) ou Phase 2 (pipeline IA). |
| `fabric_certification` sur products après migration | **Conservé** Phase 1 | Backward compat : UI ParasolSpecsSection, tests existants, parasolSpecsSchema. À déprécier Phase 2 quand UI variant-aware mature. |
| `dimension_variants` jsonb / `color_variants` jsonb sur products | **Conservés** Phase 1 | Backward compat (UI fiches publiques actuelles). Seront purgés Phase 2 quand toutes les UIs lisent `product_variants`. |
| URLs canoniques `/products/[brand-slug]/[product-slug]` | Implémentées ÉTAPE 9 | D-PV-10. Redirect 301 depuis `/products/:id` actuel. |

---

## 4. Migration des 53 produits — stratégie

### 4.1 Phasage

1. **Migration 1-6** : DDL structurel + référentiels seedés. Aucun produit touché.
2. **Migration 7** : INSERT massif dans `product_variants` (1 ligne par produit) + UPDATE backfill `owner_brand_id`. **Pas de DROP**, pas d'écrasement de données existantes.
3. **Migration 8** : RLS multi-tenant. À ce stade, code applicatif ne consomme pas encore variants.
4. **Migration 9** : Ajout des colonnes `product_variant_id NULL` sur 5 tables consommatrices.
5. **ÉTAPES 7-9 (code applicatif)** : UI variant-aware + edge functions adaptées.

### 4.2 Garanties

- **Aucune perte de données** : tous les champs migrés sont COPIÉS, pas DÉPLACÉS. Le champ source sur `products` reste rempli Phase 1.
- **Vérification COUNT** : assertion `count(products) = count(product_variants)` dans la migration 7.
- **Idempotence** : la migration 7 vérifie absence d'orphelins avant d'INSERT (CTE check).
- **Rollback** : sauvegarde Supabase point-in-time recovery + chaque migration revertable individuellement par DROP/TRUNCATE/UPDATE inverse documenté en commentaire.

### 4.3 Tests de validation post-migration

```sql
-- À lancer après migration 7
SELECT
  (SELECT COUNT(*) FROM products) AS products_count,
  (SELECT COUNT(*) FROM product_variants) AS variants_count,
  (SELECT COUNT(*) FROM product_variants WHERE is_default = true) AS default_variants_count,
  (SELECT COUNT(*) FROM products p WHERE NOT EXISTS (
    SELECT 1 FROM product_variants v WHERE v.product_id = p.id AND v.is_default = true
  )) AS orphan_products;
-- Attendu : 53, 53, 53, 0
```

---

## 5. Fichiers à modifier / créer (côté code)

### 5.1 À créer

| Fichier | Rôle |
|---|---|
| `supabase/migrations/YYYYMMDDHHMMSS_create_phase1_referentials.sql` | Migration 1 |
| `supabase/migrations/.../seed_phase1_referentials.sql` | Migration 2 |
| `supabase/migrations/.../create_product_variants.sql` | Migration 3 |
| `supabase/migrations/.../create_product_media.sql` | Migration 4 |
| `supabase/migrations/.../extend_products_chairs_armchairs_designer.sql` | Migration 5 |
| `supabase/migrations/.../create_brand_users.sql` | Migration 6 |
| `supabase/migrations/.../migrate_53_products_to_variants.sql` | Migration 7 |
| `supabase/migrations/.../rls_multi_tenant_products_variants.sql` | Migration 8 |
| `supabase/migrations/.../add_variant_id_to_consumer_tables.sql` | Migration 9 |
| `src/lib/materialBrandsMapping.ts` | Map `FabricBrandSlug` (CamelCase) ↔ DB slug (kebab) |
| `src/lib/productVariants.ts` | Types `DBProductVariant`, helpers `fetchVariants`, `defaultVariantOf`, etc. |
| `src/lib/productMedia.ts` | Types + fetchers médias |
| `src/components/partner-dashboard/VariantsGrid.tsx` | Grid editable mode tableur (ÉTAPE 7) |
| `src/components/partner-dashboard/VariantBulkActions.tsx` | Bulk operations (ÉTAPE 7) |
| `src/components/products/VariantSelector.tsx` | Sélecteur public sur fiche produit (ÉTAPE 9) |
| `src/components/admin/AdminMaterialBrands.tsx` | Admin référentiel material_brands (ÉTAPE 8) |
| `src/components/admin/AdminCertifications.tsx` | Admin certifications (ÉTAPE 8) |
| `src/components/admin/AdminColorsCanonical.tsx` | Admin colors_canonical (ÉTAPE 8) |
| `src/components/admin/AdminFinishesCanonical.tsx` | Admin finishes (ÉTAPE 8) |
| `src/test/product-variants-migration.test.ts` | Tests migration 53 produits |
| `src/test/material-brands-mapping.test.ts` | Tests mapping CamelCase ↔ kebab |
| `src/test/intent-detector-variants.test.ts` | Tests intentDetector variant-aware |
| `src/test/variants-rls.test.ts` | Tests intégration RLS multi-tenant (mock Supabase) |

### 5.2 À modifier

| Fichier | Nature de la modif |
|---|---|
| `src/integrations/supabase/types.ts` | **Régénération** via `supabase gen types typescript --project-id gwgcfgeouropcighpztj` après chaque migration |
| `src/lib/products.ts` | Étendre `DBProduct` avec `variants?: DBProductVariant[]`, `owner_brand_id`, `primary_designer`, etc. |
| `src/lib/productQualityScore.ts` | Score variant-aware (option Phase 1) |
| `src/components/partner-dashboard/AddProductForm.tsx` | Refonte ÉTAPE 7 — split modèle/variantes |
| `src/components/partner-dashboard/PartnerCatalogueSection.tsx` | Affichage liste avec count variants |
| `src/components/admin/ProductReviewHelpers.tsx` | Validation variant-aware |
| `src/components/admin/AdminProductReviews.tsx` | UI list adaptée |
| `src/components/admin/AdminProductReview.tsx` | Detail view variants |
| `src/components/admin/ColorVariantEditor.tsx` | **DEPRECATE** (mark as legacy) |
| `src/components/admin/DimensionVariantEditor.tsx` | **DEPRECATE** (mark as legacy) |
| `src/hooks/useProductSubmissions.ts` | Submission flow accepte variants[] |
| `src/hooks/useProducts.ts` | Joindre variants dans fetchAll |
| `src/engine/intentDetector.ts` | `filterProducts` lit dimension/fabric/color depuis variants |
| `src/engine/dictionaries/fabricBrands.ts` | RAS (réutilisé pour seed) |
| `src/engine/projectEngine.ts` | Lit poids/dimensions depuis variant default |
| `src/engine/supplierEngine.ts` | Score MOQ adapté (modèle pour l'instant, Phase 2 pour variant) |
| `src/engine/similarityEngine.ts` | RAS Phase 1 |
| `src/components/products/specs/shared/types.ts` | RAS (les zod schemas restent niveau modèle) |
| `src/pages/Products.tsx` | URL canonique `/products/[brand-slug]/[product-slug]` (ÉTAPE 9) |
| `src/App.tsx` | Routes mises à jour (ÉTAPE 9) |
| `src/components/products/specs/ParasolSpecsSection.tsx` | Continue à utiliser `fabric_certification` Phase 1 (RAS) |

### 5.3 Documentation

| Fichier | Action |
|---|---|
| `docs/chantiers/2026-05/PLAN_MODELE_B_VARIANTS.md` | **CE FICHIER** — créé ÉTAPE 1 |
| `docs/chantiers/2026-05/CHANGELOG.md` | Étendu en fin de chantier (ÉTAPE 10) |
| `CLAUDE.md` | Diff court ÉTAPE 10 : ajout section Modèle B variants, mention référentiels Phase 1, RLS multi-tenant |
| `docs/strategy/PRODUCT_DATA_VISION.md` | NON modifié sauf si arbitrage divergence |

---

## 6. Schéma des tests à écrire

### 6.1 Tests unitaires nouveaux (cible : ≥ 36)

| Fichier test | Tests | Cible |
|---|---|---|
| `material-brands-mapping.test.ts` | 8 | Mapping CamelCase ↔ kebab roundtrip, fallback Unknown |
| `product-variants-types.test.ts` | 6 | Validators zod variant, defaults, edge cases dimensions |
| `intent-detector-variants.test.ts` | 10 | filterProducts par dimension/fabric/color sur variants |
| `product-variants-migration.test.ts` | 6 | Smoke tests migration (mock RPC) |
| `variants-default.test.ts` | 4 | Helper `defaultVariantOf`, contraintes 1-default-per-product |
| `colors-canonical.test.ts` | 4 | Validation slugs, hex pattern, family enum |
| `finishes-canonical.test.ts` | 3 | Idem finishes |

**Total nouveau : ~41 tests** → portant le total à **305** (vs cible 300+).

### 6.2 Tests existants à adapter

| Fichier | Adaptation |
|---|---|
| `src/test/intent-vocab-2026.test.ts` | Possibles ajustements si filterProducts signature change |
| `src/test/specs-parasols.test.ts` | RAS (fabric_certification reste sur products Phase 1) |
| `src/test/category-normalizer.test.ts` | RAS |

### 6.3 Tests d'intégration (manuels Phase 1, automatisés Phase 2)

- Workflow partenaire : créer modèle + 5 variantes → soumettre → admin valide → publié → fiche publique avec sélecteur.
- RLS multi-tenant : user brand A ne voit pas brouillons brand B.
- Migration des 53 produits sur staging branch Supabase avant prod.

---

## 7. Estimation effort par étape

| Étape | Description | Effort | Cumulé |
|---|---|---:|---:|
| ÉTAPE 1 | Plan (ce doc) | 0.5j | 0.5j |
| ÉTAPE 2 | Référentiels Phase 1 (migrations 1-2 + types + util mapping) | 1.5j | 2.0j |
| ÉTAPE 3 | Table product_variants + product_media (migrations 3-4 + types) | 1.5j | 3.5j |
| ÉTAPE 4 | Migration 53 produits (migration 7) + tests post-migration | 1.0j | 4.5j |
| ÉTAPE 5 | Champs Chairs / Armchairs / primary_designer (migration 5) + UI specs sub-components étendus | 0.5j | 5.0j |
| ÉTAPE 6 | Multi-tenant : owner_brand_id + brand_users + RLS (migrations 6, 8) | 1.0j | 6.0j |
| ÉTAPE 7 | UI partner-dashboard refondue (grid editable, bulk, variants) | **3.5j** | 9.5j |
| ÉTAPE 8 | UI admin (ProductReviewHelpers + AdminMaterialBrands/Certifications/Colors/Finishes) + edge functions verifications | 2.5j | 12.0j |
| ÉTAPE 9 | UI publique fiche produit + URLs canoniques + redirects (migration 9) | 1.5j | 13.5j |
| ÉTAPE 10 | Documentation + diff CLAUDE.md + commit + push | 0.5j | **14.0j** |

**Total** : 14 jours = **~2.0-2.5 semaines** ouvrées (selon densité). **Conforme à la cible vision** (5-22 mai 2026).

---

## 8. Risques techniques + mitigations

| ID | Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|---|
| R-1 | Drift code/prod si une migration s'applique sans fichier local | Moyen | **Critique** (source-of-truth perdue) | Discipline rigide : `git status` après chaque `apply_migration`, fichier créé AVANT commit. Heritage chantier vocab 2026-04-30. |
| R-2 | RLS multi-tenant casse les requêtes existantes (architecture en double policies) | Élevé | Modéré | Tests intégration Supabase staging branch avant prod. Rollback documenté. Pattern admin + owner-policy connu (cf. CLAUDE.md §7 — Bucket 3). |
| R-3 | Migration 53 produits perd des données (mapping fabric_certification incorrect) | Moyen | Élevé | CTE explicite, vérification COUNT, point-in-time recovery dispo. Backup pré-migration via dump. |
| R-4 | UI grid editable (ÉTAPE 7) sous-estimée | Élevé | Modéré | Réserve 0.5j de buffer. shadcn/Tanstack Table pour réduire complexité custom. |
| R-5 | Edge functions cassent à cause du nouveau schéma | Faible | Modéré | Pas de modif majeure des edge functions Phase 1 (laissées sur le schéma legacy). enrich-products / analyze-csv : update prompts hors scope (Backlog post-vocab §6). |
| R-6 | Multi-tenant + RLS impacte performance (sub-queries dans variants policies) | Moyen | Modéré | Indexes ciblés (`idx_products_owner_brand_id`). Profiling EXPLAIN ANALYZE sur `is_brand_member` après migration 8. |
| R-7 | Mapping CamelCase ↔ kebab côté TS oublie un cas | Faible | Faible | Tests roundtrip + fallback `unknown` pour tout slug non reconnu. |
| R-8 | `auto_derive_product_tags` trigger se déclenche pendant migration 7 et ralentit | Moyen | Faible | Migration 7 = INSERT sur variants (pas products), trigger inactif. Backfill `owner_brand_id` = UPDATE products mais champ ignoré par trigger. |
| R-9 | Scope creep sur ÉTAPE 7 (UI partner) | Élevé | Modéré | Phase 1 = MVP grid editable + bulk basique. Pas de drag-drop, pas d'autocomplete avancée (Phase 2). Si dépassement >0.5j, surface au founder. |
| R-10 | Tests baseline 264 cassent après changement signature engine | Moyen | Faible | Adapter au fil de l'eau ÉTAPE 3-4. Vert obligatoire avant ÉTAPE suivante. |

---

## 9. ⚠️ Questions de cadrage critiques (à trancher avant ÉTAPE 2)

### Q1. **`owner_brand_id` distinct de `partner_id` ?** (impact migrations 5, 7, 8)

**Constat** : `products.partner_id` existe déjà, FK vers `partners.id`. Le vision doc 8.6 introduit `owner_brand_id` comme la source-of-truth multi-tenant.

**Options** :
- **A** (recommandée) : ajouter `owner_brand_id uuid REFERENCES partners(id) NOT NULL en Phase 2`. Phase 1 nullable, backfill depuis `partner_id` en migration 7. Coexistence Phase 1, déprécation `partner_id` Phase 2.
- **B** : réutiliser `partner_id`, ajouter `NOT NULL` constraint et utiliser cette colonne dans les RLS.
- **C** : renommer `partner_id` → `owner_brand_id` (breaking pour 5+ fichiers code).

**Recommandation** : **A**. Ne casse rien, prépare la suite, sémantiquement correct.

### Q2. **Tables N-N `material_brand_certifications` ou `uuid[]` ?** (impact migration 1)

**Constat** : la spec vision 4.6 propose `certifications_associated uuid[]` sur `material_brands`. Ma proposition : table N-N dédiée.

**Options** :
- **A** (recommandée) : table N-N. Plus orthodoxe, FK strictes, indexable, requêtes faciles (jointure plutôt qu'`= ANY`).
- **B** : `uuid[]` array. Plus simple à seed, mais pas de FK enforcement, requêtes plus exotiques.

**Recommandation** : **A**. Le coût marginal (1 table en plus) est trivial vs les bénéfices de l'intégrité référentielle.

### Q3. **Périmètre du seed `material_brands` Phase 1 — quelles marques ?** (impact migration 2)

**Constat** : la vision dit "~25-30 lignes". `fabricBrands.ts` couvre 7. Le reste à inventer/seeder.

**Options** :
- **A** : Seed minimal Phase 1 = 7 fabric (existants) + 5 wood + 5 metal + 3 composite + 2 fallbacks (~22 lignes). Pas de tissus propriétaires (Tribùcord, etc.) puisque marques structures pas en DB.
- **B** : Seed étendu = idem A + 5 fabric supplémentaires (Sergio, Ikatex, Para Tempotest, etc.) → ~27 lignes. Plus de couverture marché.
- **C** : Seed exhaustif (50+ marques marché européen). Hors scope Phase 1.

**Recommandation** : **B** (~27 lignes). Couvre la grande majorité du marché européen Phase 1 sans verbosité inutile. La table reste éditable en admin (ÉTAPE 8) pour ajouts ultérieurs.

### Q4. **`product_variant_id` sur les 5 tables consommatrices Phase 1 ?** (impact migration 9)

**Constat** : 14 tables FK vers `products.id`. En Phase 2, `orders`/`preorders`/`product_offers`/`quote_requests`/`partner_arrival_items` devraient idéalement référencer un SKU précis.

**Options** :
- **A** (recommandée) : ajouter `product_variant_id NULL` sur ces 5 tables MAINTENANT (Phase 1, migration 9). Aucune valeur n'est insérée. Code applicatif ignore le champ. Bascule progressive Phase 2 sans nouvelle migration.
- **B** : ne rien ajouter Phase 1. Ajouter en Phase 2 quand la bascule devient pertinente. Évite 1 migration mais coûte une migration future.
- **C** : ajouter ET commencer à insérer la `default_variant_id` dès Phase 1 dans les nouveaux orders/quotes.

**Recommandation** : **A**. Coût de migration trivial maintenant ; permet la bascule Phase 2 sans alter-table coûteux.

### Q5. **Conserver `dimension_variants` jsonb / `color_variants` jsonb sur products Phase 1 ?** (impact UI Phase 1)

**Constat** : ces 2 colonnes jsonb existent déjà et sont éditées par `ColorVariantEditor` et `DimensionVariantEditor`. Le UI public actuel les lit. La nouvelle UI variant-aware les remplace structurellement.

**Options** :
- **A** (recommandée) : **Conserver Phase 1**. Marquer les 2 éditeurs admin comme `@deprecated`. UI public lit depuis variants en priorité, fallback jsonb si vide. Migration purge en Phase 2.
- **B** : Migrer les jsonb existants vers `product_variants` lignes en migration 7, puis DROP les colonnes jsonb. Plus propre mais risque de casser le UI public actuel.
- **C** : Conserver et laisser le UI public lire d'abord les jsonb (Phase 1), bascule complète Phase 2.

**Recommandation** : **A**. Backward compat préservée, dette technique documentée et bornée.

---

## 10. Critères de validation chantier (à atteindre avant push final)

✅ DB :
- [ ] 9 migrations appliquées en production
- [ ] 9 fichiers SQL versionnés dans `supabase/migrations/` AVANT commit chaque fois
- [ ] `count(products) == count(product_variants where is_default=true) == 53`
- [ ] RLS active sur **toutes** les nouvelles tables (`material_brands`, `certifications`, `material_brand_certifications`, `colors_canonical`, `finishes_canonical`, `markets`, `product_variants`, `product_media`, `brand_users`)
- [ ] `mcp__supabase__get_advisors` : 0 ERROR ; pas de nouvelle WARN durable hors `multiple_permissive_policies` connu

✅ Code :
- [ ] `bun run lint` sans nouvelle erreur
- [ ] `bunx tsc --noEmit` passe à chaque étape
- [ ] `bun run test` ≥ 300 tests verts (cible)
- [ ] `bun run build` passe

✅ UX :
- [ ] Partner crée modèle + 5 variantes via UI grid → submission → admin valide → fiche publique affiche sélecteur
- [ ] URLs canoniques `/products/[brand]/[product]` redirige depuis `/products/:id`
- [ ] RLS testée sur staging : user brand A ne voit pas brouillons brand B

✅ Documentation :
- [ ] `docs/chantiers/2026-05/CHANGELOG.md` mis à jour (synthèse chantier)
- [ ] `CLAUDE.md` diff court (section Modèle B + référentiels + RLS multi-tenant)
- [ ] Plan v1 (ce doc) annoté en cas de divergence

✅ Git :
- [ ] 1 commit par étape, messages clairs (préfixes `feat`, `fix`, `docs`, `chore`)
- [ ] Push final unique en fin de chantier
- [ ] Pas de force-push, pas de `--no-verify`

---

## 11. Workflow ÉTAPES 2 → 10 (rappel synthétique)

Chaque étape = un mini-cycle :

1. **Prepare** : lire le code existant, identifier les patterns
2. **Migrate (si DB)** : créer fichier local SQL → `mcp__supabase__apply_migration` → vérifier `git status` → committer
3. **Codegen** : régénérer `src/integrations/supabase/types.ts`
4. **Code** : Edit/Write fichiers nécessaires
5. **Test** : `bun run test` + `bunx tsc --noEmit` + `bun run lint`
6. **Validate** : checklist étape passe ; sinon STOP et signaler
7. **Commit** : 1-3 commits cohérents par étape, pas de push

Final : ÉTAPE 10 met à jour CHANGELOG + CLAUDE.md, **STOP** pour validation founder, push après go.

---

## 12. Demande de validation — STOP

**Je ne lance pas l'ÉTAPE 2 tant que les Q1-Q5 ne sont pas tranchées.**

Ordre prioritaire des questions :
1. **Q1** (owner_brand_id) → impact toutes les migrations multi-tenant
2. **Q4** (product_variant_id sur 5 tables) → décide si on inclut migration 9 dans le scope
3. **Q3** (seed material_brands) → effort migration 2
4. **Q2** (table N-N vs uuid[]) → choix d'orthodoxie
5. **Q5** (conserver jsonb legacy) → impact UI Phase 1

Mes recommandations sont indiquées en gras dans chaque question. Si tu valides toutes les recommandations en bloc, je peux enchaîner sans plus d'arbitrage.

**Signal de go attendu** : un message court qui valide (ou amende) les 5 réponses + autorise l'ÉTAPE 2.

---

## Annexes

### A. Liste exhaustive des FK vers `products.id` (audit recon)

```
board_items.product_id
concept_events.product_id
orders.product_id
partner_arrival_items.product_id
partner_featured_products.product_id
preorders.product_id
product_offers.product_id
product_reviews.product_id
product_submissions.approved_product_id
product_submissions.detected_duplicate_id
product_submissions.target_product_id
project_briefs.product_id
project_cart_items.product_id
project_zone_products.product_id
quote_requests.product_id
products.duplicate_of  (self-reference)
```

### B. Référence chantier vocab 2026 (clôturé 2026-04-30)

`docs/chantiers/2026-05/CHANGELOG.md` — pattern de référence pour ce chantier (drift prevention, tests verts en continu, migrations atomiques, étapes courtes).

### C. Évolution du document

| Version | Date | Auteur | Changements |
|---|---|---|---|
| 1.0 | 2026-05-01 | Claude Code (avec founder) | Création initiale ÉTAPE 1 |

---

**Fin du plan.**
