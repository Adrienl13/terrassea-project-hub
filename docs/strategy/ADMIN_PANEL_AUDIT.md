# Admin Panel Audit — 2026-05-06

> Audit lecture-seule, snapshot 2026-05-06. Sources : `src/pages/Admin.tsx` (2355 l), `src/components/admin/*` (22 fichiers + sous-dossier `referentials/`), comparé à `src/components/partner-dashboard/*` et `src/components/products/specs/*`.

## Objectif

Le founder a découvert en explorant l'admin panel que certaines fonctionnalités présentes côté partner ne sont pas exposées côté admin (cas concret : section "Certifications" sur ProductEdit présente côté partner depuis 8e-2 mais absente côté admin). Cet audit identifie exhaustivement :
1. La structure actuelle de l'admin panel (24 sections)
2. Les incohérences UX et trous fonctionnels (admin vs partner)
3. Les duplications/redondances
4. Une roadmap de rationalisation en 3 phases

---

## 1. Inventaire (24 sections)

| Section | Composant | CRUD | Notes (1 ligne) | Partner equiv. |
|---|---|---|---|---|
| **dashboard** | `admin/AdminDashboard.tsx` (608 l) | R | KPIs : commandes, devis, candidatures, partenaires, revenus, alertes | n/a (PartnerOverview) |
| **quotes** | `admin/AdminQuoteWorkflow.tsx` (622 l) | R/U | Workflow devis : status update, RPC `create_admin_notification`, lazy `AdminPaymentPanel` | PartnerQuotesSection |
| **orders** | `admin/AdminOrderTracking.tsx` (816 l) | R/U + dispute/cancel | Timeline + tracking auto + Stripe panel intégré | n/a (lecture client) |
| **financing** | `admin/AdminFinancing.tsx` (293 l) | R/U | Status workflow + admin_notes + email partner | n/a |
| **applications** | `Admin.tsx::ApplicationsTab` inline (l 1583-1920) | R/U + create partner on approve | Approuver / rejeter / `info_requested` + email | n/a (auto-création depuis BecomePartner) |
| **products** | `Admin.tsx::ProductsTab` + `ProductForm` inline (l 415-1581) | C/R/U/D + merge | 7 onglets : basics, media, tags, typetags, pricing, dims, technical | AddProductForm (6 onglets + specs) |
| **partners** | `admin/AdminPartners.tsx` (655 l) | C/R/U/D | Drawer édition + workflow `profile_status` | PartnerProfileForm |
| **submissions** | `admin/AdminProductReview.tsx` (613 l) + `ProductReviewHelpers.tsx` (671 l) | R/U + bulk delete/offline | Comparatif submission vs canonical, **utilise les 6 specs sections en READ-ONLY** | AddProductForm soumission |
| **subscriptions** | `admin/AdminSubscriptions.tsx` (474 l) | R/U | Override plan, max_products, suspend, status | UpgradeSuggestion |
| **brands** | `admin/AdminBrandManagement.tsx` (1216 l) | R/U + invite/suspend | Brand rollout, KPIs, distributors mgmt — **aucune brand cert** | BrandNetworkOverview |
| **referentials_brands** | `admin/AdminMaterialBrands.tsx` (187 l) → `referentials/ReferentialCRUD.tsx` | C/R/U/D | Composer minimal sur ReferentialCRUD générique (Sheet drawer) | n/a |
| **referentials_certifications** | `admin/AdminCertifications.tsx` (36 l) → `referentials/ReferentialCRUD.tsx` | C/R/U/D | Ultra-thin composer, 0 champs extra | n/a |
| **ai_scanner** | `admin/AdminAIScanner.tsx` (846 l) | R + bulk U | Scan IA produits, suggestions par champ, auto-apply, **ne couvre pas les 27 colonnes vocab 2026** (cf. CLAUDE.md §9) | n/a |
| **messages** | `admin/AdminMessages.tsx` (489 l) | C/R + send | 2 colonnes liste/conv, filtre status, archive | PartnerSections (Messages) |
| **ratings** | `admin/AdminRatingsModeration.tsx` (194 l) | R/U/D | Verify / unverify / delete | PartnerLoyalty (lecture) |
| **product_reviews** | `admin/AdminProductReviews.tsx` (227 l) | R/U/D | Status approve/reject + delete, mutations React Query | n/a |
| **chatbot** | `admin/AdminChatbotStats.tsx` (494 l) | R/U | KPIs + conversations + system prompt config (4 langues) | n/a |
| **users** | `admin/AdminUsers.tsx` (323 l) | R/U | Drawer détail, **pas de delete**, update user_type/onboarding | n/a |
| **settings** | `admin/AdminSettings.tsx` (157 l) | R/U | Inline edit `platform_settings` (58 lignes), groupé par catégorie | n/a |
| **partner_visibility** | `admin/AdminPartnerVisibility.tsx` (267 l) | R/U | Toggles `is_active` / `is_public` / `visibility_level` + admin_notes | n/a |
| **analytics** | `admin/AdminAnalyticsDashboard.tsx` (378 l) | R | Hook `useAdminAnalytics`, period selector, breakdown statuts | PartnerAnalyticsDashboard |
| **concept_analytics** | `admin/AdminConceptAnalytics.tsx` (314 l) | R | 3 vues sur `concept_events` + `scoring_snapshots` (feedback loop) | n/a |
| **pro_service** | `Admin.tsx::QuoteRequestsTab type="pro"` inline (l 1922-2041) | R/U | Variante de QuoteRequestsTab (paramétrée) — CRM pro | PartnerProLeadsSection |

**Côté partner-dashboard non répliqué côté admin** : PartnerCertifications, PartnerLoyaltyProgram, PartnerArrivalsSection, PartnerFeaturedSection, PartnerCatalogueSection, BrandReferencesManager, BrandCollectionManager, PhotoGalleryManager, BrandBriefInbox.

---

## 2. Patterns architecturaux observés

### A. Pattern générique `ReferentialCRUD` (`admin/referentials/ReferentialCRUD.tsx`)
**2 sections seulement** : `referentials_brands`, `referentials_certifications`.
- Sheet drawer (shadcn) + AlertDialog confirm delete
- FK guard avant DELETE (bloque si `referencedBy.count > 0`)
- Schéma zod commun + `extraSchema` injecté par caller
- C'est le **bon pattern** : il devrait être réutilisé pour les colors/finishes futurs.

### B. Custom-built avec drawer / Sheet
- `AdminPartners` (drawer édition full-screen)
- `AdminMessages` (2 colonnes)
- `AdminUsers` (drawer détail user)
- `AdminProductReview` (split-screen comparatif)
- `AdminBrandManagement` (multi-vues + dialog invitations)

### C. Table-only display + inline edit
- `AdminSettings` (inline edit cellules)
- `AdminPartnerVisibility` (toggles inline)
- `AdminRatingsModeration`, `AdminProductReviews`, `AdminFinancing`, `AdminSubscriptions` (table + actions ligne)

### D. Inline-in-Admin.tsx vs dedicated file
| Inline (Admin.tsx) | Lignes | Pourquoi problématique |
|---|---|---|
| `ProductForm` | 415-989 (575 l) | 575 lignes monolithiques, **diverge de AddProductForm partenaire** |
| `ProductTypeTagsForm` | 199-409 (210 l) | Encore en majuscule (Chairs, Tables…) — duplicat des specs/* |
| `ProductsTab` | 1004-1581 (577 l) | Liste + sort + paginate + delete + merge |
| `ApplicationsTab` | 1583-1920 (337 l) | Aurait sa place en `admin/AdminApplications.tsx` |
| `QuoteRequestsTab` | 1922-2041 (119 l) | Réutilisé pour `pro_service` |
| `TagInput` | 126-192 | Duplicate possible avec partner-side |
| `DataQualityBadge` | 104-120 | OK, helper court |

**Problème central** : `Admin.tsx` mélange routing/sidebar + formulaire produit massif. Le composant `ProductForm` aurait dû être extrait depuis longtemps. Il n'a jamais été branché sur les nouveautés (specs/*, VariantsGrid, environment_urls, certifications).

---

## 3. Incohérences identifiées (gaps admin vs partner)

### 3.1 Product certifications (PV) — ÉTAPE 8e-2
- **Partner** : `AddProductForm.tsx` ligne 1424-1436, onglet "Certifications" + `ProductCertifications` → `useProductCertifications(productId)` → table `product_certifications` + storage `partner-certificates`.
- **Admin** : `Admin.tsx` ProductForm n'importe **pas** `ProductCertifications`. Aucun onglet certifications.
- **Statut** : ❌ **MISSING** — **Bloquant** pour un admin qui doit valider/corriger un PV soumis.

### 3.2 Brand certifications — ÉTAPE 8e-1
- **Partner** : `PartnerCertifications` (264 l) → table `partner_certifications` + storage upload PDF.
- **Admin** : `AdminBrandManagement.tsx` (1216 l) gère les marques mais **aucun import** de `PartnerCertifications`. `AdminPartners.tsx` n'a pas non plus d'onglet certifications dans son drawer.
- **Statut** : ❌ **MISSING** — **Important**. L'admin ne peut ni voir ni modérer les certifs marque (logos M1, FSC, etc.) déposées par les partenaires.

### 3.3 Variants Modèle B (VariantsGrid)
- **Partner** : `partner-dashboard/VariantsSection.tsx` → `VariantsGrid.tsx` (570 l), aligné sur la table `product_variants`. 6 axes : SKU, dimensions, fabric_color, frame_finish, prix, stock, default.
- **Admin** : `ColorVariantEditor.tsx` (178 l) + `DimensionVariantEditor.tsx` (287 l), tous deux **explicitement marqués `@deprecated`** dans leur en-tête en faveur de VariantsGrid.
- **Statut** : ⚠️ **PARTIAL / DEPRECATED** — **Bloquant mid-terme**. L'admin est sur l'ancien modèle (color_variants jsonb + dimension_variants jsonb), le partner sur le nouveau (rows `product_variants`). Risque de désynchro structurelle dès qu'un partner crée une variante riche.
- En lecture-seule depuis `AdminProductReview` (l 530-588) la grille variants partner est affichée, mais **read-only**, pas éditable.

### 3.4 Product offers
- **Partner** : édité via `AddProductForm` (prix, stock, délai → product_offers).
- **Admin** : `ProductsTab.handleSave` (l 1086-1097) **synchronise déjà** le `product_offer` du partenaire associé sur (price, stock_status, stock_quantity, delivery_delay_days) lors de l'update. Mais **PAS UI dédiée** pour gérer N offres d'un même produit (multi-offres = multi-partenaires).
- **Statut** : ⚠️ **PARTIAL** — **Important**. La sync 1-offer auto suffit pour produits mono-partenaire, inadaptée pour multi-fournisseurs (cas distributors).

### 3.5 Photos / gallery / environment_urls
- **Partner** : `PhotoGalleryManager.tsx` (169 l) avec upload Supabase Storage + validation taille + thumbnails. `ProductPhotoLinker` pour lier photos lib → produit. `environment_urls` géré explicitement dans `AddProductForm`.
- **Admin** : ProductForm onglet "Médias" (l 690-756) :
  - Image principale = **input texte URL** (pas d'upload)
  - Galerie = **textarea CSV d'URLs** (pas d'upload, pas de drag-drop)
  - **`environment_urls` n'apparaît jamais dans le formulaire** (présent en init l.93 mais aucune UI)
- **Statut** : ❌ **MISSING (environment_urls)** + ⚠️ **PARTIAL (gallery)** — **Important**.

### 3.6 Specs sub-components (vocab 2026)
- **Partner** : `AddProductForm` ligne 1253-1311 — branche **les 6 sections** (TableSpecs / ParasolSpecs / SunLoungerSpecs / SofaSpecs / BarStoolSpecs / HighTableSpecs) selon la catégorie, avec édition complète.
- **Admin** :
  - **Submission review** (`ProductReviewHelpers.tsx` l 593-657) : les 6 sections sont rendues **avec `disabled` (read-only)**.
  - **Direct edit** (`Admin.tsx::ProductForm`) : **0 import** de `@/components/products/specs`. Les 27 colonnes critiques vocab 2026 sont totalement absentes du formulaire admin direct.
  - **Catégories obsolètes** : l 55-59 d'`Admin.tsx` utilise encore `["Chairs", "Armchairs", "Tables", …]` (capitalisées) ; le partner utilise les slugs lowercase-kebab. **Divergence de taxonomie critique**.
- **Statut** : ❌ **MISSING / REGRESSION** — **Bloquant**. C'est exactement le problème mentionné par le founder.

### Synthèse table

| Feature | Partner | Admin | Sévérité |
|---|---|---|---|
| Product certifications PV | ✅ | ❌ | **Bloquant** |
| Brand certifications | ✅ | ❌ | Important |
| Variants Modèle B grid | ✅ | ⚠️ (deprecated) | **Bloquant** mid-term |
| Product offers (multi) | ✅ | ⚠️ (auto-sync mono) | Important |
| Photos upload | ✅ | ❌ (URLs only) | Important |
| environment_urls | ✅ | ❌ | Important |
| Specs sections vocab 2026 (édition) | ✅ | ❌ | **Bloquant** |
| Specs sections (lecture submission) | n/a | ✅ | OK |
| Catégories lowercase-kebab | ✅ | ❌ (capitalized) | **Bloquant** |

---

## 4. Duplications & redondances

| Doublon | Fichiers | Note |
|---|---|---|
| **ProductTypeTagsForm vs specs/*** | `Admin.tsx` l 199-409 (210 l) ↔ `src/components/products/specs/{Table,Parasol,SunLounger,Sofa,BarStool,HighTable}SpecsSection.tsx` | Le form admin inline duplique 80% du contenu en version dégradée (capitalisée, sans zod, sans CHECK constraints alignées). |
| **ColorVariantEditor + DimensionVariantEditor vs VariantsGrid** | admin (`@deprecated` en clair) ↔ partner-dashboard | À retirer dès que VariantsGrid est branché côté admin. |
| **ProductForm admin vs AddProductForm partner** | `Admin.tsx` 575 l ↔ `partner-dashboard/AddProductForm.tsx` 1542 l | Partagent ~70% de structure mais 0% de code commun. **Source #1 de divergence future**. |
| **TagInput** | `Admin.tsx` l 126-192 | Pas duplicate stricto sensu mais aucun équivalent dans `components/ui/`. |
| **Country flag emoji helper** | `AdminPartnerVisibility.tsx`, `AdminSubscriptions.tsx`, `AdminOrderTracking.tsx`, `AdminBrandManagement.tsx` | **4 réimplémentations** identiques. À factoriser en `lib/countryFlag.ts`. |
| **`use-toast`** | `src/hooks/use-toast.ts` ↔ `src/components/ui/use-toast.ts` | Déjà tracé dans CLAUDE.md §4. |
| **Status configs** (color/icon/bg per status) | Quasiment chaque AdminXxx redéfinit son `STATUS_CONFIG` local | Pourrait être unifié en `lib/statusConfig.ts`. |

---

## 5. Recommandations

### High-priority gaps (nouvelles dettes à tracker)

1. **Dette 24 — ProductForm admin déconnecté du vocabulaire 2026 et des certifs** *(bloquant)*
   - Manque : 6 specs sections, ProductCertifications, environment_urls, upload, VariantsGrid, catégories lowercase.
   - Effort : 2-3 j.
   - Décision sous-jacente : faire converger admin et partner vers un **composant `ProductEditForm` partagé** ? Ou conserver 2 implémentations divergentes ? À trancher avec le founder.

2. **Dette 25 — AdminPartners et AdminBrandManagement n'exposent pas les certifications** *(important)*
   - Ajouter onglet "Certifications" dans le drawer `AdminPartners` et dans la vue détail brand de `AdminBrandManagement` qui réutilise `<PartnerCertifications partnerId={...} />`.
   - Effort : 0.5-1 j.

3. **Dette 26 — Catégories produits encore en CamelCase côté admin** *(bloquant)*
   - `Admin.tsx` l 55-59 hardcode `["Chairs", "Armchairs", …]`. Diverge des canonical slugs CLAUDE.md §Categories normalized.
   - Conséquence : un produit créé via l'admin a `category="Chairs"` (capitalisé) qui ne matchera ni les filtres front lowercase ni les specs sub-components.
   - Effort : 0.5 j (mais nécessite QA car changement de données stocké).

4. **Dette 27 — VariantsGrid pas branché côté admin** *(bloquant mid-term)*
   - 2 fichiers `@deprecated` toujours utilisés. Risque d'écraser les variantes Modèle B saisies par le partner si l'admin sauvegarde un produit (les `color_variants` jsonb seraient repush écrasant éventuellement les rows `product_variants`).
   - Effort : 1 j.

5. **Dette 28 — environment_urls oubliés admin-side** *(important)*
   - 1 ligne d'init mais aucune UI. Un admin ne peut ni voir ni corriger les ambiances mises par un partner.
   - Effort : 0.5 j.

6. **Dette 29 — Pas d'upload Supabase Storage côté admin** *(important)*
   - L'admin colle des URLs textuelles. Pour produits Terrassea (non-partner), l'admin n'a aucun moyen propre d'uploader.
   - Effort : 0.5-1 j (réutiliser `validateImageUpload` + bucket `product-images`).

7. **Dette 30 — `ApplicationsTab` toujours inline dans Admin.tsx** *(cosmétique)*
   - 337 lignes. Sortir en `admin/AdminApplications.tsx` pour cohérence. Effort : 0.2 j.

### Patterns à adopter
- **Étendre `ReferentialCRUD`** au pattern colors_canonical / finishes_canonical (déjà annoncé dans son commentaire).
- **Factoriser un `<ProductFormShared>`** entre `AddProductForm` partner et `ProductForm` admin. Différences = props (`mode: "partner" | "admin"`) qui togglent prix client vs prix HT, validation publish_status, accès certifications, etc. Investissement gros (2-3 j) mais éteint la dette de divergence en racine.
- **`lib/countryFlag.ts`** : 1 fonction, 4 callers à migrer.
- **Convention** : tout nouveau gros formulaire admin → fichier dédié `admin/AdminXxx.tsx`, pas inline dans `Admin.tsx`.

### Roadmap 3 phases (high-impact-low-effort first)

#### Phase A — Quick wins (≈ 1-1.5 j) — débloque les usages immédiats
- Brancher `<ProductCertifications productId={…}>` dans le ProductForm admin (Dette 24 partiel + Dette 25).
- Brancher les 6 `*SpecsSection` dans le ProductForm admin (selon `form.category`) — Dette 24 partiel.
- Migrer la liste `CATEGORIES` vers les slugs lowercase-kebab + ajouter `categoryNormalizer` au save — Dette 26.
- Sortir `ApplicationsTab` en fichier dédié — Dette 30.

#### Phase B — Alignement structurel (≈ 2-3 j)
- Brancher `VariantsGrid` admin-side, supprimer `ColorVariantEditor` + `DimensionVariantEditor` — Dette 27.
- Ajouter `<PartnerCertifications partnerId>` dans le drawer `AdminPartners` et dans la vue brand de `AdminBrandManagement` — Dette 25.
- Ajouter input/upload `environment_urls` dans le ProductForm admin — Dette 28.
- Implémenter upload Supabase Storage (image principale + galerie) admin-side — Dette 29.

#### Phase C — Refonte profonde (≈ 3-5 j) — sur acceptation founder
- Extraire `ProductForm` admin de `Admin.tsx` (Admin.tsx redevient un router/layout < 800 l).
- Décider stratégique : composant partagé `<ProductEditForm mode="admin"|"partner">` vs deux implémentations alignées.
- Factoriser `countryFlag`, `STATUS_CONFIG`, `TagInput`.
- Compléter `AdminAIScanner` pour proposer les 27 colonnes vocab 2026 (déjà tracé en dette §9 CLAUDE.md).

---

## Synthèse

- **L'admin est en retard d'une phase produit complète.** Phases 8e-1 (PartnerCertifications), 8e-2 (ProductCertifications), vocab 2026 (specs/*) et Modèle B variants ont toutes été livrées côté partner sans propagation côté admin. Cohérent avec une session de chantier focus partner — mais plus tenable côté modération/correction.
- **Pas de sécurité bloquante détectée** dans cet audit (RLS, secrets, validation hors scope ; CRUD admin passe par `is_admin()` au niveau RLS). Les gaps sont fonctionnels, pas sécuritaires.
- **Recommandation transverse — Definition of Done** : avant tout futur chantier produit majeur (variants, certifications, nouvelle catégorie), ajouter à la DoD : « la fonctionnalité est accessible et éditable depuis les 2 surfaces (partner + admin) ou explicitement justifiée comme partner-only ». Sinon la dette continuera à se creuser.

### Priorisation pour le founder
1. **Phase A (1-1.5 j)** = unlock immediate. Élimine le bug bloquant signalé (certifs absentes) + aligne la taxonomie + branche les specs vocab 2026.
2. **Phase B (2-3 j)** = ferme la dette structurelle Modèle B + unifie l'expérience photos.
3. **Phase C (3-5 j)** = refonte clean, optionnelle, à programmer si la dette continue à grossir avec les chantiers futurs.

Total cumulé : 5-9.5 jours sur 7 dettes (24 → 30) pour atteindre la parité fonctionnelle admin/partner.
