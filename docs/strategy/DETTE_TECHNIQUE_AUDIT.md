# Audit dette technique — Terrassea Hub

**Date audit** : 2026-05-05
**Contexte** : Recadrage stratégique post-Salone vers framing 
long-terme

## Niveau 1 — Critiques (fix dans les 1-2 semaines)

### Dette 33 — PartnerOrders section absente (BLOQUANT)

**Origine** : User Tools Audit 2026-05-06 (cf. `docs/strategy/USER_TOOLS_AUDIT.md` §3 P1)
**Impact** : aucune UI partner pour voir/gérer les commandes générées des devis acceptés. Quand un client signe un devis → `auto-workflow` edge function crée une commande → admin la voit dans `AdminOrderTracking`, client la voit dans `ClientOrdersSection`, **partner ne voit rien**. Boucle catalogue→quote→ORDER→delivery cassée pour le partner.
**Fix** : créer `src/components/partner-dashboard/PartnerOrdersSection.tsx`, mirror `ClientOrdersSection` côté partner, ajouter entrée nav `Account.tsx::NAV_PARTNER_BASE`. Reuse `orders` table existante.
**Risque non-fix** : promesse plateforme cassée pour partners payants — friction acquisition + retention.
**Effort** : 2-4 j
**Priorité** : Niveau 1 (top BLOQUANT identifié dans l'audit user-tools)
**Statut FIXED 2026-05-06 (Chantier Σ1)** : end-to-end partner-side orders. Architecture mono-partner confirmée (1 order = 1 partner = 1 product). RLS SELECT préexistante OK. 2 RPCs SECURITY DEFINER créés via migration `20260506232545_dette_33_partner_orders_rpcs.sql` :
- `update_order_as_partner(p_order_id, p_status, p_tracking_number, p_tracking_url, p_shipping_carrier)` — partner-owner check, whitelist 6 colonnes, status workflow strict (deposit_paid → in_production → shipped → delivered avec tracking_number requis pour shipped), auto-timestamps, audit `order_events`
- `create_order_notification_to_client(p_order_id, p_type, p_title, p_body, p_link)` — pattern P3.O1 anticipant Phase 2B.2 Dette 19, 1 callsite éliminé proactivement
- Hook `src/hooks/usePartnerOrders.ts` (orders query + updateOrder mutation + notifyClient mutation + useOrderEvents)
- Composant `src/components/partner-dashboard/PartnerOrdersSection.tsx` (~470 lignes, 5 sous-sections detail Sheet)
- Intégration `Account.tsx` : entrée nav `orders` entre `quotes` et `messages` (NAV_PARTNER_BASE), case switch standard partner
- i18n key `account.orders` déjà existante dans 4 locales — réutilisée
- Empirical tests : anon refused ✅, authenticated EXECUTE ✅. Tests transitions/tracking non-empiriques (DB 0 orders) — à valider post-merge avec vraie order.
- Smoke test browser : empty state propre confirmé. 2 nouvelles dettes capturées en sous-produit (44 WebSocket realtime, 45 Supabase 400 errors).

### Dette 9 — Transactionnel approveAsNew

**Origine** : ÉTAPE 7 (matérialisation variants)
**Impact** : approveAsNew n'est pas atomique. Si crash entre 
INSERT product et INSERT variants, l'état DB est partiel et 
incohérent.
**Fix** : Refactor en edge function transactionnelle Supabase 
ou en transaction PostgreSQL explicite (BEGIN / COMMIT / 
ROLLBACK).
**Risque non-fix** : corruption données possible en production.
**Effort** : 0.5-1 jour

**Statut FIXED 2026-05-06** : refactor en RPC SECURITY DEFINER `approve_product_submission_as_new`. PostgreSQL transaction implicite garantit l'atomicité. Élimine 3 problèmes :
- Risque CRITIQUE de duplication produit (crash entre offers INSERT et submission UPDATE → admin retry car submission encore `pending_review` → product créé en double). Éliminé par PG ROLLBACK.
- Silent-fail des offers (`console.warn` côté frontend → produits publiés sans offer). Éliminé : la RPC raise sur error d'INSERT.
- Fragilité du cleanup applicatif (DELETE products on variants fail pouvait lui-même échouer → orphan logged). Éliminé : PG ROLLBACK natif, plus de cleanup manuel.

Frontend hook `approveAsNew` (`src/hooks/useProductSubmissions.ts`) délègue les steps 8-12 à la RPC. Steps 1-7 + 9 (storage uploads, race-check UX, validation, slug gen) restent côté frontend.

Implementation : `jsonb_populate_record(NULL::table, payload)` pour mapping schema-resilient (nouvelles colonnes auto-picked-up sans modifier la RPC).

**Out of scope** :
- Storage orphans si RPC échoue après uploads → cron cleaner futur.
- `approveEdit` a un pattern similaire (UPDATE products + variants + submissions séquentiel) mais architecture différente → **Dette 23** créée.

### Dette 10 — Refactor RLS pour inliner les helpers

**Origine** : Incident prod 2026-05-05 (RLS anon EXECUTE)
**Impact** : Les RLS policies de products / product_variants / 
product_media référencent is_brand_member et is_brand_owner. 
A déjà causé un incident prod (terrassea.com 0 produits 
pendant 4 jours).
**Fix** : Inliner la logique helper dans les RLS policies via 
sub-EXISTS clauses. Plus de dépendance EXECUTE sur fonctions.
**Risque non-fix** : reproduction incident si modification 
permissions futures.
**Effort** : 0.5 jour
**Statut : FIXED 2026-05-05** (commit 1c23eec, verified 48/48 cells, REST API HTTP 200)
**Note** : DROP des fonctions helpers (is_brand_member, is_brand_owner) planifié 1-2 semaines après observation prod stable, à programmer pour mi-mai 2026.

### Dette 2 — variant_id persistence dans project_cart_items

**Origine** : ÉTAPE 9a-fix-2 γ-2
**Impact** : Le panier en BDD ne stocke pas la variant Modèle 
B choisie. Si l'acheteur revient demain, il perd la variant.
**Fix** : ALTER TABLE project_cart_items ADD COLUMN 
variant_id uuid REFERENCES product_variants(id). Migration + 
adaptation code persistence.
**Risque non-fix** : perte de données utilisateur, expérience 
dégradée.
**Effort** : 0.5-1 jour

**Statut FIXED 2026-05-06** : variant_id ajouté à `project_cart_items` (FK → product_variants(id) ON DELETE SET NULL, cohérent avec pattern existant des FK soft sur cette table). Frontend `ProjectCart.tsx:291-308` propage `item.selectedModelBVariantId`.

**Note** : la dette était mal documentée à l'origine. Le cart côté client (`saved_carts.cart_data` jsonb via `selectedModelBVariantId`) gérait déjà le variant_id depuis chantier 9a-fix-2 — l'utilisateur ne perdait PAS la variant au reload. Le vrai problème était la perte du variant_id lors de la submission relationnelle (cart → `project_cart_items` lors de la création d'un project_request).

### Dette 3 — variant_id persistence dans quote_requests

**Origine** : ÉTAPE 9a-fix-2
**Impact** : Quand l'acheteur soumet une demande de sourcing, 
la variant n'est pas dans la requête. Le commercial doit 
deviner ou re-demander.
**Fix** : Idem dette 2 mais sur quote_requests.
**Risque non-fix** : friction commerciale, pertes de deals.
**Effort** : 0.5-1 jour

**Statut FIXED 2026-05-06** : variant_id ajouté à `quote_requests` (FK → product_variants(id) ON DELETE SET NULL). Frontend refactoré sur 5 callsites :
- `QuoteRequestModalProps` : nouveau prop `selectedVariantId?: string`
- `QuoteRequestModal.tsx:153` : INSERT inclut `variant_id`
- `ProductDetail.tsx:691` : passe `selectedVariantId={selectedModelBVariant?.id}`
- `VendorOffers.tsx:406` + `:793` : 2 modales secondaires reçoivent aussi le selectedVariantId
- `ProjectCart.tsx:374` : INSERT loop quote_requests inclut variant_id

**Effort réel cumulé Dettes 2 + 3** : 1.5-2h (vs 1-2j estimation initiale). La moitié du travail (cart côté client) était déjà faite par chantier 9a-fix-2.

### Dette 19 — Notifications cross-user phishing risk

**Origine** : Audit Dette 18 phase 1+2 (2026-05-06)
**Impact** : La table `notifications` (206 rows actifs) permet à n'importe quel user authentifié d'INSERT une notification avec n'importe quel `user_id` cible. Vecteur phishing potentiel inter-user (User A crée fausse notif pour User B).

Le métier nécessite cross-user inserts légitimes (admin→partner, partner→client) → fix non trivial.

**3 options identifiées** :

**A) Status quo + risque accepté** (effort 0)
- Documenter et monitorer
- Acceptable tant que population utilisateurs limitée

**B) RPC SECURITY DEFINER refactor** (effort 0.5-1j)
- Functions dédiées par cas d'usage : `create_notification_admin_to_partner`, etc.
- INSERT direct depuis frontend impossible
- Pattern propre long-terme
- Refactor 30+ fichiers consommateurs

**C) RLS conditionnelle** (effort 0.5j)
- INSERT autorisé si `user_id=auth.uid()` (auto-notif) OR `is_admin()` OR sender est partner/client de la cible
- Pas de refactor frontend
- Validation exhaustive complexe (toutes paires possibles)

**Risque non-fix** : phishing interne (peu probable mais possible), surtout si la base utilisateurs grandit.

**Effort recommandé** : Option B (RPC SECURITY DEFINER) en session dédiée 1-2h après recensement précis des cas d'usage cross-user.

**Statut 2026-05-06 (Phase 2A delivered)** :
- 2 RPCs SECURITY DEFINER créés : `create_self_notification` (P1 future-proof) et `create_admin_notification` (P2 admin → user)
- Colonne `sender_user_id` ajoutée pour audit logging (FK auth.users ON DELETE SET NULL)
- 14 callsites P2 refactorés vers `create_admin_notification` (8 fichiers : AdminQuoteWorkflow, ProductReviewHelpers, AdminFinancing, AdminOrderTracking, AdminMessages, AdminPartners, Admin, usePaymentFlow). Les 2 bulk inserts (AdminOrderTracking, AdminMessages) utilisent une boucle de RPC.
- ~50 % de la surface d'attaque cross-user fermée
- RLS tightening (DROP permissive INSERT policy) reporté à Phase 2A.2 final, après livraison Phase 2B
- 16 callsites P3 cross-user reportés à Phase 2B (ClientSections re-classifiés : 2 → quote-related)

**Statut 2026-05-06 (Phase 2B.1 delivered)** :
- 3 RPCs SECURITY DEFINER créées :
  - `create_quote_notification_to_admins(p_quote_id, ...)` → uuid[] (P3.Q1, 4 callsites)
  - `create_quote_notification_to_partner(p_quote_id, ...)` → uuid (P3.Q2, 2 callsites)
  - `create_quote_notification_to_client(p_quote_id, ...)` → uuid (P3.Q3, 1 callsite)
- 7 callsites Quote-related refactorés : `QuoteRequestModal.tsx` (2), `usePartnerQuotes.ts` (1), `ProjectCart.tsx` (2), `ClientSections.tsx` (2)
- Chaque RPC valide la business relation (quote ownership client OR partner-owner via brand_users / partners.user_id) avant INSERT
- sender_user_id loggué pour audit (Phase 2A column)
- Sous-phase 2B.1 done. Reste 9 callsites P3 dans 5 sous-phases :

**Roadmap Phase 2B (restant)** (~3-5h sur sessions futures) :
- Phase 2B.2 — Order-related (callsites depuis triggers DB déjà SECURITY DEFINER, peu de frontend)
- Phase 2B.3 — Brief-related (2 callsites) : `ProjectBriefModal`, `ProServiceClientHub`
- Phase 2B.4 — Partner-application (3 callsites) : `BecomePartner`, `PartnerProfileForm`, `PartnerCatalogueSection`
- Phase 2B.5 — Financing (1 callsite) : `FinancingRequestModal`
- Phase 2B.6 — Product approval (1 callsite) : `useProductSubmissions`
- Phase 2B.final — RLS tightening : DROP permissive INSERT policy, CREATE restrictive `WITH CHECK (user_id = auth.uid() OR is_admin())`

## Niveau 2 — Importantes (fix dans le mois)

### Dette 1 + 12 — i18n incomplète ProductDetailDrawer

Labels "Available for immediate dispatch", "Lead time", etc. 
hardcoded en anglais. Acheteurs FR/IT/ES voient de l'anglais 
sur le panel cart.
**Effort** : 1-2 heures

### Dette 11 — Refactor partner.slug "adrien-laniez" → "pros-import"

URL canonique contient "adrien-laniez" qui n'est pas un nom 
de marque. Affecte SEO et perception professionnelle.
**Effort** : 30 min (UPDATE + invalidation cache)

### Dette 4 — Validation zod schema variants partner

Aucune validation côté form partner pour empêcher 
combinaisons invalides (ex: in_stock=false && qty=null && 
!made_to_order).
**Effort** : 1-2 heures

### Dette 6 — i18n labels StockBadge

Labels FR uniquement. À étendre aux 4 locales (en/fr/it/es).
**Effort** : 30 min

### Dette 23 — approveEdit transactionnel

**Origine** : Recon Dette 9 (2026-05-06)
**Impact** : la fonction `approveEdit` (`src/hooks/useProductSubmissions.ts:607`) effectue plusieurs UPDATE séquentiels non-transactionnels :
- UPDATE products
- UPDATE product_variants (potentiellement plusieurs)
- UPDATE product_submissions

**Pattern différent de Dette 9** : UPDATEs au lieu d'INSERTs, donc pas de risque de duplication, mais risque d'état incohérent (product partiellement updated, status submission désynchronisé).

**Fix** : refactor en RPC SECURITY DEFINER similaire à Dette 9 (`approve_product_submission_edit`). Pattern identique : transaction PG implicite, jsonb_populate_record pour schema-resilient mapping.

**Effort** : 2-3h
**Priorité** : Niveau 2 (importante mais pas critique car pas de risque de duplication)

### Dette 13 + 14 — Server-side redirect pour SEO

Redirect actuel client-side (React Router). Pas un vrai 301 
HTTP reconnu par les crawlers.
**Fix** : vercel.json rewrites/redirects ou edge function.
**Effort** : 30-45 min

### Dette 24 — ProductForm admin déconnecté du vocabulaire 2026 et des certifications

**Origine** : Audit panel admin 2026-05-06 (cf. `docs/strategy/ADMIN_PANEL_AUDIT.md`)
**Impact** : Le ProductForm admin (inline dans `Admin.tsx` l 415-989) **n'a pas suivi les phases produit récentes** :
- Aucun import des 6 `*SpecsSection` (vocab 2026) — les 27 colonnes critiques absentes
- Aucun import de `ProductCertifications` (8e-2) — admin ne peut pas valider les PV
- Pas de support `environment_urls`
- Pas d'upload Storage (URLs textuelles seulement)
- Utilise `ColorVariantEditor` + `DimensionVariantEditor` (`@deprecated`) au lieu de `VariantsGrid`

C'est la dette racine — toutes les phases produit ont été livrées côté partner sans propagation admin.

**Fix** : refonte du ProductForm admin pour brancher specs/* + ProductCertifications + VariantsGrid + upload + environment_urls. Décision sous-jacente à trancher : composant `ProductEditForm` partagé entre admin et partner ?
**Risque non-fix** : impossibilité de modérer/corriger les nouvelles features côté admin. Divergence structurelle qui s'aggrave à chaque chantier produit.
**Effort** : 2-3 j

### Dette 25 — Certifications absentes du panel admin

**Origine** : Audit panel admin 2026-05-06
**Impact** : Ni `AdminPartners` (drawer édition) ni `AdminBrandManagement` (vue détail brand) n'exposent les certifications partenaire/marque. L'admin ne peut ni voir ni modérer les certifs déposées par les partenaires (M1 Feu, FSC, IMO marine, etc.).
**Fix** : ajouter `<PartnerCertifications partnerId={...} />` dans le drawer `AdminPartners` et dans la vue brand de `AdminBrandManagement`. Composant déjà existant côté partner, juste à brancher.
**Risque non-fix** : perte de contrôle qualité (un partner peut uploader un faux certificat sans review possible côté admin).
**Effort** : 0.5-1 j

**Statut FIXED 2026-05-07 (Sessions 2 admin chunk 2)** : 2 intégrations directes des composants partner-side (réutilisation as-is, aucune adaptation requise) :
- `Admin.tsx::ProductForm` : nouvelle section "Certifications" (8e dans SECTIONS) qui rend `<ProductCertifications productId={form.id}>`. Affiche un guard "produit doit être enregistré d'abord" si `form.id` n'existe pas encore (création).
- `AdminPartners.tsx` detail view : nouvelle section "Certifications partenaire" qui rend `<PartnerCertifications partnerId={selected.id}>`. Le composant gère déjà via RLS la liste des certifs partner-level.
- AdminBrandManagement non touché (les brand_member partners sont exposés via AdminPartners — pas de duplication nécessaire).
- RLS DB déjà OK : `is_admin()` dans toutes les policies INSERT/UPDATE/DELETE des 2 tables (`product_certifications`, `partner_certifications`). Aucune migration.

### Dette 26 — Catégories produits encore en CamelCase côté admin

**Origine** : Audit panel admin 2026-05-06
**Impact** : `Admin.tsx` l 55-59 hardcode `["Chairs", "Armchairs", "Tables", …]` (capitalisé) alors que le partner et le filtrage front utilisent les slugs lowercase-kebab (`chairs`, `armchairs`, `tables`). **Conséquence concrète** : un produit créé via l'admin a `category="Chairs"` (capitalisé) qui ne matchera ni les filtres front ni les specs sub-components.

Cette dette est aggravante de la Dette 24.
**Fix** : migrer la liste `CATEGORIES` vers les slugs lowercase-kebab + appeler `categoryNormalizer` au save.
**Risque non-fix** : produits admin invisibles ou mal classés sur le catalogue public. Quality issue déjà silencieuse.
**Effort** : 0.5 j (avec QA car changement de données stocké).

### Dette 27 — VariantsGrid pas branché côté admin

**Origine** : Audit panel admin 2026-05-06
**Impact** : `ColorVariantEditor.tsx` (178 l) et `DimensionVariantEditor.tsx` (287 l) sont **explicitement marqués `@deprecated`** dans leur header, mais toujours utilisés côté admin. Risque concret : un partner crée des variantes Modèle B riches via `VariantsGrid` (rows `product_variants`), puis un admin sauvegarde le produit via le ProductForm admin → écrasement des `color_variants` jsonb qui désynchronisent les rows `product_variants`.
**Fix** : brancher `VariantsGrid` admin-side, supprimer les 2 fichiers `@deprecated` après migration.
**Risque non-fix** : corruption silencieuse des variantes Modèle B chaque fois qu'un admin édite un produit.
**Effort** : 1 j

**Statut FIXED 2026-05-07 (Sessions 2 admin chunk 3 — Option γ frontend-only)** :
- `VariantsGrid` (réutilisation directe partner-side) intégré dans `Admin.tsx::ProductForm` section Pricing. Guard "save first" si form.id absent (mêmes patterns que Certifs section).
- Hydration via `useQuery(['product-variants', form.id])` qui réutilise les DB IDs comme `_localId` → permet UPSERT en préservant les FK references existantes (CASCADE product_media, SET NULL carts/quotes).
- Nouveau `persistVariants(productId)` dans handleSave : diff DB vs submitted, DELETE avec `window.confirm()` (warning CASCADE), UPSERT préservant les IDs.
- Admin n'écrit plus `color_variants` / `dimension_variants` jsonb — les colonnes restent en DB comme historical artifact (cleanup tracké en Dette 48).
- previewScore quality calc migré sur `variants` state (LocalVariantRow[]).
- 2 fichiers `@deprecated` supprimés : `ColorVariantEditor.tsx` (178 LOC) + `DimensionVariantEditor.tsx` (287 LOC) = -465 LOC.
- Audit data legacy révèle complexité plus élevée que prévu (3 produits, 11 entries jsonb, FK references concrètes) → Option γ retenue (jsonb cleanup différé en Dette 48 dédiée).

### Dette 28 — environment_urls oubliés admin-side

**Origine** : Audit panel admin 2026-05-06
**Impact** : Le ProductForm admin initialise `environment_urls` à `[]` (l 93) mais **aucune UI** dans le formulaire pour les voir/éditer. Un admin ne peut ni inspecter ni corriger les ambiances visuelles uploadées par un partner.
**Fix** : ajouter input/upload `environment_urls` dans le ProductForm admin (réutiliser le composant gallery du partner, ou textarea simple).
**Effort** : 0.5 j

### Dette 29 — Pas d'upload Supabase Storage côté admin

**Origine** : Audit panel admin 2026-05-06
**Impact** : Le ProductForm admin n'accepte que des **URLs textuelles** (input simple pour image principale, textarea CSV pour gallery). Pour les produits Terrassea internes (catalogue non-partner), l'admin doit uploader manuellement via Dashboard Supabase puis coller les URLs.
**Fix** : implémenter upload (drag-drop ou file input) avec `validateImageUpload` + bucket `product-images`. Réutiliser le composant `PhotoGalleryManager` du partner ou simplifier.
**Effort** : 0.5-1 j

**Statut FIXED 2026-05-07 (Sessions 2 admin chunk 1)** : nouveau composant `src/components/admin/ProductImagesUpload.tsx` (~280 LOC). 3 sections : image principale (single), galerie produit (multi), mises en situation/ambiances (multi). Pattern d'upload reutilise `validateImageUpload` + bucket `product-images` (auth users INSERT/DELETE déjà autorisé via storage RLS — pas de migration). Path : `products/{partnerId|admin}/{productId|temp-{ts}}/{section}-{ts}-{rand}.{ext}`. Remplace les 3 inputs textuels (image_url + gallery_urls + environment_urls) dans `Admin.tsx::ProductForm` (l 698-743). Q3 architecture : Option A retenue (composant nouveau dédié admin) au lieu de réutiliser `PhotoGalleryManager` (modal partner gallery, pattern d'usage différent). Design ADMIN_DESIGN_LANGUAGE.md aligné (eyebrow labels, border-border rounded-xl).

### Dette 34 — SignatureModal canvas non-fonctionnel (BLOQUANT légal)

**Origine** : User Tools Audit 2026-05-06 (USER_TOOLS_AUDIT.md §1 C3)
**Impact** : `ClientSections.tsx:1479-1486` rend un placeholder "click to sign" mais `signQuoteRequest` est appelé sans capture de signature stroke. Le flux e-signature actuel est un stub. Risque contractuel si un devis signé aujourd'hui est challengé — pas d'eIDAS compliance.
**Fix** : décision vendor (stub vs DocuSign-style provider eIDAS-compliant) puis intégration. Capture canvas signature OU délégation provider externe.
**Risque non-fix** : risque légal sur les devis signés depuis le go-live ; conversion freinée par méfiance B2B.
**Effort** : 2-4 j (selon vendor decision)
**Priorité** : Niveau 1 (BLOQUANT légal)
**Statut** : à fixer (review legal préalable)

### Dette 35 — Pro Service mock data architect + partner

**Origine** : User Tools Audit 2026-05-06 (USER_TOOLS_AUDIT.md §2 A3, A7 + §3 P7, P8)
**Impact** : `ProServiceArchitectHub.tsx` (1265 l) + `PartnerProLeadsSection.tsx` (350 l) lisent `proServiceMockData.ts` et n'utilisent PAS les vraies tables `pro_service_*` (4 tables existent). Architect supplier_calls (`supplier_calls` table) ne trouvent aucun inbox partner pour répondre. La USP architect = "we route you qualified projects" est actuellement de la démo.
**Fix** : connecter les hubs aux vraies tables `pro_service_*`, créer un partner inbox pour `supplier_calls`, bridge architect→partner.
**Risque non-fix** : USP architect cassée → 0 acquisition architect ; Elite plan partner injustifié (P8).
**Effort** : >5 j
**Priorité** : Niveau 1 (BLOQUANT acquisition architect)
**Statut** : à fixer (Q3 2026, après décision stratégique architect-positioning)

### Dette 36 — Architect tier hardcodé + notes non-persistées

**Origine** : User Tools Audit 2026-05-06 (USER_TOOLS_AUDIT.md §2 A1, A2)
**Impact** :
- `Account.tsx:417` `const architectTier: ArchitectTier = "atelier"` hardcodé. UI tier (rewards, perks, discount banners) basée sur cette constante. Sectionnement Studio/Atelier/Maison promis dans l'UI **non-fonctionnel**, contradiction avec CLAUDE.md "tiers non implémentés".
- `ArchitectSections.tsx:682` project notes en `useState` local-only, jamais persisté en Supabase, évaporent au refresh.
**Fix** : décision stratégique première — keep tier promise alive en 2026 (implémenter) OU align UI à "no SaaS" reality (remove tier UI). Puis persister project notes (ajout colonne ou table dédiée).
**Risque non-fix** : architect overpromise dans l'UI → trust acquisition cassée ; notes perdues = friction utilisation projets.
**Effort** : 2-4 j
**Priorité** : Niveau 2
**Statut** : à fixer (paired avec Dette 35)

### Dette 37 — Lowercase categories partner-side

**Origine** : User Tools Audit 2026-05-06 (USER_TOOLS_AUDIT.md §3 P2)
**Impact** : `BecomePartner.tsx:15` utilise `["chairs", "armchairs", "barStools", "benches", "diningTables"...]` (mix camelCase) ; `PartnerProfileForm.tsx:23-26` utilise CamelCase **`["Chairs", "Tables", "Parasols", ...]`**. Mismatch avec lowercase-kebab canonical → un nouveau partner ne reçoit aucun lead matché.
**Fix** : aligner les 2 fichiers sur `CANONICAL_CATEGORIES` (cf. Dette 26 fix admin scope).
**Risque non-fix** : friction acquisition partner directe (zero matched leads).
**Effort** : 0.5 j
**Priorité** : Niveau 2 (extension de Dette 32 frontend coherence)
**Statut** : à fixer

### Dette 38 — Client profile non-editable

**Origine** : User Tools Audit 2026-05-06 (USER_TOOLS_AUDIT.md §1 C1)
**Impact** : `Account.tsx::SettingsSection` + `ClientSettingsSection` affichent profile en read-only. User ne peut pas mettre à jour name/phone/company/SIREN. Doit passer par Auth ou contacter admin.
**Fix** : transformer la section Settings en form édit (réutiliser pattern `PartnerProfileForm`).
**Risque non-fix** : irritant 100% des clients B2B ; confiance plateforme freinée.
**Effort** : 0.5 j
**Priorité** : Niveau 2
**Statut** : à fixer

### Dette 39 — Partner notif arrivée devis

**Origine** : User Tools Audit 2026-05-06 (USER_TOOLS_AUDIT.md §3 P4)
**Impact** : aucune notif (toast top-banner, browser notif) quand un nouveau quote arrive — partner doit check manuellement. Seul le badge sidebar `pendingQuoteCount` indique.
**Fix** : ajouter polling React Query sur `usePartnerQuotes` + trigger toast `sonner` si delta > 0 ; éventuellement Push notification API browser.
**Risque non-fix** : conversion freinée par delayed response ; les partners qui répondent vite sont ceux qui closent.
**Effort** : 0.5 j
**Priorité** : Niveau 3 (quick win impact moyen)
**Statut** : à fixer

### Dette 40 — Partner public profile preview

**Origine** : User Tools Audit 2026-05-06 (USER_TOOLS_AUDIT.md §3 P10)
**Impact** : aucun bouton "voir mon profil public" dans partner dashboard. Doit logout ou ouvrir incognito pour vérifier le rendu de `/partners/:slug`.
**Fix** : ajouter bouton "Aperçu profil public" dans sidebar Account partner ouvrant `/partners/{slug}` en nouvel onglet.
**Effort** : 0.5 j
**Priorité** : Niveau 3 (quick win)
**Statut** : à fixer

### Dette 43 — Drift prevention process à renforcer

**Origine** : recon Dette 38 (2026-05-06)
**Description** : la migration `20260411100000_restrict_user_profiles_self_update.sql` a été créée le 2026-04-11 dans le repo mais **jamais appliquée à la DB**. Le frontend a été câblé à `supabase.rpc("update_own_profile", ...)` qui n'existait pas en DB. Les erreurs étaient catchées silencieusement (`} catch { /* keep editing mode open on failure */ }`), donnant à l'utilisateur l'illusion que ses modifications étaient sauvegardées. **Bug silencieux en prod pendant ~3 semaines.**

**Cause root** : les guidelines CLAUDE.md (drift prevention strict, file BEFORE apply) ont été suivies lors d'autres chantiers (cf. Dette 18, 19, 26) mais visiblement pas systématiquement. La revue de code locale ne détecte pas ce type de drift car le fichier de migration EXISTE en repo (passe la review), mais le `mcp__supabase__list_migrations` n'est pas vérifié.

**Fix process à mettre en place** :
1. **Pre-commit hook** : avant tout commit qui ajoute `supabase/migrations/*.sql`, exiger soit (a) preuve `mcp__supabase__apply_migration` réussie via présence dans `list_migrations`, soit (b) note explicite "DB apply pending" dans le commit message.
2. **Audit régulier** : à chaque session significative, comparer `ls supabase/migrations/` ↔ `list_migrations` et reporter le delta.
3. **Frontend defensive** : pour tout RPC nouvellement référencé côté frontend, ajouter un test ou warning runtime qui détecte si le RPC est `undefined`/`not found` plutôt que silent fail.
4. **Update CLAUDE.md** : ajouter une section explicite "Drift prevention checklist" avec ces 3 actions.

**Risque non-fix** : prochains drifts silencieux invisibles aux tests, prod cassée pendant des semaines avant détection user.

**Effort estimé** : 0.5-1 j (process + 1 commit CLAUDE.md update + 1 helper frontend optionnel)

**Priorité** : Niveau 2 (process critique pour la santé long-terme du projet)

**Statut** : à fixer (process improvement, pas urgent)

### Dette 44 — WebSocket realtime connection failed

**Origine** : Smoke test Dette 33 (2026-05-06 23:38)

**Description** : Console browser montre `WebSocket connection to wss://gwgcfgeouropcighpztj.supabase.co/realtime/v1/websocket failed: WebSocket is closed before the connection is established`.

**Statut 2026-05-07 — Catégorie C confirmée** : warning persiste en preview prod (`bun run preview` localhost:4173 mode incognito). Pas un HMR-only artifact. NON lié au commit 11fe166 (Dette 39) — `git log -p src/hooks/useNotifications.ts` confirme que le bloc subscribe aux lignes 55-86 n'a pas été touché ; seul l'appel toast 81-83 a changé.

**Cause probable identifiée** (hypothèse haute) : race condition auth hydration. Les hooks `useNotifications` et `useConversations` s'abonnent au channel realtime sur `user?.id`, mais le client supabase finit son auth en async → 1er subscribe sans token JWT (échoue), puis re-subscribe avec token (réussit). Confirmation visuelle requise : vérifier que les notifications realtime fonctionnent malgré le warning (probablement OUI, car le re-subscribe réussit).

**Investigation différée** :
- Effort 0.5 j - 2h
- À traiter en session dédiée
- Investiguer config Supabase realtime client + ordre des useEffect subscription
- Vérifier si on peut conditionner le subscribe sur `session !== null` plutôt que `user?.id`

**Priorité** : Niveau 2 (pollution console, pas bloquant utilisateur final)

**Statut** : à investiguer

### Dette 45 — Supabase 400 errors residual (FIXED partial)

**Origine** : Smoke test Dette 33 (2026-05-06 23:38)

**Statut FIXED 2026-05-07** : split en 2 sous-dettes après diagnostic via DevTools Network tab.

**Dette 45a — quote_requests 400** : `PartnerOverview.tsx:223-235` (Recent quote requests widget) référençait colonne inexistante `client_name` dans `.select()`. Schema réel a `first_name`, `last_name`, `client_first_name` mais pas `client_name`. **Fix** : `.select("id, product_name, first_name, last_name, ...")` + concatenation `${first_name} ${last_name}` côté UI.

**Dette 45b — product_offers 400 (narrow)** : `PartnerOverview.tsx:54-69` (Top Products widget) utilisait `.is("source_offer_id", null)`. Colonne `source_offer_id` n'existe pas en DB. **Cause root** : drift migration `20260329100000_brand_distributor_enhancements.sql` (capturée comme Dette 46). **Fix narrow** : retrait du filtre uniquement dans PartnerOverview avec commentaire explicatif. 4 callsites brand-only restants tracked en Dette 47.

### Dette 46 — Drift migration brand-distributor 20260329100000

**Origine** : Investigation Dette 45b (2026-05-07)

**Description** : Migration `20260329100000_brand_distributor_enhancements.sql` présente dans `supabase/migrations/` depuis 2026-03-29 mais **JAMAIS appliquée à prod** (absent de `supabase_migrations.schema_migrations`). Vérifié 2026-05-07.

La migration ajoute :
- Column `source_offer_id uuid` à `product_offers` (FK + index partiel)
- Triggers d'inheritance brand-distributor
- ON CONFLICT logic pour offers hérités

**Impact** :
- 5 callsites code référencent `source_offer_id`, tous 400 silencieux côté DB
- Toute la fonctionnalité brand-distributor inheritance est cassée pour brand_member/brand_network partners
- Aucun brand_member actif en prod aujourd'hui → impact zéro à court terme
- Pattern identique à Dette 38 (migration 20260411 jamais appliquée → 3 semaines silent fail) et Dette 43 (drift prevention process). **3e drift incident détecté en 1 mois.**

**Décision stratégique requise (Options A/B/C)** :

- **Option A — Appliquer la migration historique** : active la feature. Risque : feature non testée en prod, pas de brand_member actif pour valider. Effort : 1-2j (apply + test integration + frontend wiring).
- **Option B — Supprimer la migration + cleanup 5 callsites** : retire la feature complète. Effort : ~1-2h. Perte feature.
- **Option C — Status quo + retrait des references actives** : Dette 45b PartnerOverview déjà fait. Restent 4 callsites brand-only (cf. Dette 47). Effort : 30 min. Préserve l'optionalité.

**Recommandation** : Option C tant que pas d'urgence business + pas de brand_member actif. Réviser à l'onboarding du 1er brand_member réel.

**Effort** : 0.5-1 j (Option C complète) à 2 j (Option A complète)

**Priorité** : Niveau 2 (silencieux, non bloquant standard partners ; bloquant brand-only)

**Statut** : décision stratégique requise — différée

### Dette 48 — DROP legacy variants jsonb columns (deferred cleanup)

**Origine** : Audit Chunk 3.1 Dette 27 (2026-05-07)

**Description** : Les colonnes `color_variants` et `dimension_variants` (jsonb) dans `products` sont maintenues comme historical artifact suite à Dette 27 fix frontend-only (Option γ). Plus jamais écrites mais toujours présentes en DB.

**Données legacy actuelles** (audit 2026-05-07) :
- 3 produits avec data jsonb non-vide : `DURBAN 004-BG` (2 color_variants), `HPL Bois` (4 dimension_variants), `HPL Marble White` (5 dimension_variants). 11 entries jsonb total.
- 3 placeholder rows dans `product_variants` (1 par produit, créés par migration partielle antérieure)
- FK references : `product_media.variant_id` (**ON DELETE CASCADE**), `project_cart_items.variant_id` (SET NULL), `quote_requests.variant_id` (SET NULL)

**Stratégie de fix proposée** :
1. Audit FK references concrètes (combien de rows `product_media`, `project_cart_items`, `quote_requests` pointent sur les 3 placeholders existants ?)
2. Si 0 FK references actives sur les placeholders → DROP-then-INSERT possible
3. Si FK references actives → UPDATE-then-INSERT pour préserver les IDs des placeholders (mapping arbitraire 1ère entry du jsonb sur le placeholder existant)
4. Migration DDL : `ALTER TABLE products DROP COLUMN color_variants; DROP COLUMN dimension_variants;`
5. Validation post-migration : tests carts/quotes/media sur les 3 produits affectés

**Effort estimé** : 1.5h (audit FK + décision migration chirurgicale + DROP)

**Priorité** : Niveau 3 (cosmétique, no impact business — cleanup uniquement)

**Statut** : à fixer en session dédiée avec cerveau frais

### Dette 47 — 4 callsites source_offer_id brand-only à nettoyer

**Origine** : Investigation Dette 45b (2026-05-07)

**Description** : Si Option C de Dette 46 retenue, 4 callsites brand-only doivent être nettoyés :
- `BrandCollectionManager.tsx:97` — `.is("source_offer_id", null)`
- `BrandReferencesManager.tsx:336` — `.is("source_offer_id", null)`
- `BrandCatalogueSection.tsx:92,94` — `.select("..., source_offer_id, ...")` + `.not("source_offer_id", "is", null)`
- `BrandNetworkDashboard.tsx:146` — `.not("source_offer_id", "is", null)`

Tous référencent `source_offer_id` et 400 silencieusement pour brand_member/brand_network. Aucun brand_member actif en prod aujourd'hui → impact zéro pour l'instant.

**Action** :
- Si Option C confirmée : retirer/commenter les references + ajouter notes pendant Dette 46
- Si Option A : appliquer migration → ces queries refonctionnent automatiquement

**Effort** : 20-30 min (Option C scope complet)

**Priorité** : Niveau 3 (silencieux, brand-only, pas d'utilisateur actif)

**Statut** : conditionnel à résolution Dette 46

### Dette 42 — BRAND_SPECIALTIES + BRAND_CERTIFICATIONS CamelCase residue

**Origine** : recon Dette 37 (2026-05-06)
**Description** : `PartnerProfileForm.tsx:28-37` contient `BRAND_SPECIALTIES` (15 entrées : `"Aluminium", "Teck", "Résine tressée", ...`) et `BRAND_CERTIFICATIONS` (11 entrées : `"FSC", "PEFC", "ISO 9001", ...`) en CamelCase. Pattern incohérent avec Dette 37 (catégories migrées en lowercase-kebab).
**Note** : `BRAND_CERTIFICATIONS` redondant avec table `certifications` exposée via `usePartnerCertifications` hook (cf. Dette 25). Idéalement, supprimer la liste hardcodée et brancher sur la table.
**Fix** : aligner les 2 listes sur lowercase-kebab OU brancher sur les tables canoniques (preferred).
**Effort** : 0.2 j (similar pattern, scope plus petit)
**Priorité** : Niveau 3 cosmétique
**Statut** : à fixer ad hoc ou en session vocab consolidation

### Dette 41 — Tracking number client (copy + carrier deeplink)

**Origine** : User Tools Audit 2026-05-06 (USER_TOOLS_AUDIT.md §1 C4)
**Impact** : `ClientOrdersSection` affiche `tracking_number` mais sans bouton copy ni deep-link transporteur. Client doit retaper manuellement.
**Fix** : ajouter `<Button onClick={navigator.clipboard.writeText(...)}>` + détecter le carrier (DHL/UPS/Colissimo) via pattern et générer le deep-link.
**Effort** : 0.5 j
**Priorité** : Niveau 3 (quick win)
**Statut** : à fixer

### Dette 32 — Frontend public + engine encore CamelCase

**Origine** : Smoke test Phase 1.3 Session 1 (2026-05-06)

**Description** : La migration 2026-04-30 (catégories canonical lowercase en DB) n'a jamais été propagée au frontend public ni à l'engine de génération. Mismatch silent qui fonctionne seulement parce qu'un normalizer caché compense (à identifier précisément).

**Fichiers touchés (8+ identifiés)** :
- `src/components/products/ProductFilterSidebar.tsx` (l. 44-45, 97-106)
- `src/engine/projectEngine.ts` (l. 247-297)
- `src/data/products.ts` (l. 29, 51, 95, 139, 161 — données seed legacy)
- `src/pages/Products.tsx` (l. 203-204)
- `src/components/ConceptCard.tsx` (l. 34-35+)
- `src/components/partner-dashboard/ExcelImportModal.tsx` (l. 526, 944 — templates donnés aux partners)
- `src/components/partner-dashboard/PartnerProfileForm.tsx` (l. 24)
- `src/test/*.test.ts` (mocks legacy)

**Preuve fonctionnelle** : test browser localhost:8081/products filtre "Chairs" → 33 produits affichés ✅. Le bug est neutralisé par un fallback caché (à identifier).

**Severity réelle** : non bloquante (prod fonctionne) mais incohérence dangereuse :
- Code illisible (mismatch entre vocab affiché et stocké)
- Fragilité (si le normalizer caché disparaît, tout casse silencieusement)
- Templates Excel donnés aux partners reproduisent le bug côté ingestion partner
- Tests valident comportement obsolète (faux sentiment de sécurité)

**Découverte additionnelle** : test `src/test/category-normalizer.test.ts` (l. 15-21) prouve que `"Chairs"` → `"chairs"` doit être normalisé. Donc la fonction existe mais n'est PAS appelée à tous les bons endroits.

**Effort estimé** : 0.5j (refactor 8 fichiers + alignement tests + cleanup data seed)

**Priorité** : Niveau 2 (importante, à fixer avant prochaine migration vocab pour éviter la dette de la dette)

**Recommandation** :
- À fixer en session dédiée OU pendant Session 2 si l'occasion se présente naturellement (alignement avec Dette 27 VariantsGrid qui touche probablement les mêmes fichiers)
- Identifier d'abord OÙ le normalizer caché compense (audit rapide sur les query products)
- Puis migration systématique CamelCase → lowercase frontend

**Statut** : à fixer

### Dette 31 — ProductForm contextuel adaptatif

**Origine** : Session 1 day 8 (founder feedback browser validation Phase 1.3 — 2026-05-06)

**Description** : Le ProductForm (admin + partner) doit s'adapter dynamiquement selon les attributs du produit. Au lieu d'afficher toutes les sections en permanence, masquer/afficher selon :
- `has_variants` : section VariantsGrid
- catégorie outdoor : section certifs marine
- `is_custom` : section dimensions personnalisables
- `has_offers` : section offers multi-suppliers
- autres attributs à définir

**Pattern** : progressive disclosure UX, matrice attributs × visibilité de sections.

**Impact** :
- Meilleure UX admin/partner (form moins intimidant, contextuel)
- Cohérence métier (chaque produit voit uniquement ce qui le concerne)
- Évolutivité (nouveaux attributs = nouvelle règle dans la matrice)
- Réduction friction onboarding partners (form adapté à leur catalogue)

**Effort estimé** : 2-4j (chantier architectural sur le modèle produit)

**Priorité** : Niveau 2 (importante mais non bloquante)

**Recommandation** : à attaquer pendant Session 3 (Dette 24 refonte ProductForm) ou en session dédiée APRÈS Sessions 2-3 quand le contexte sera complet (alignement features + extraction ProductForm permettront une matrice plus précise).

**Conformité Definition of Done parité admin/partner** : le form contextuel doit être implémenté côté admin ET partner en cohérence (cf. recommandation transverse audit panel admin commit 041af30).

**Statut** : à fixer

### Dette 30 — `ApplicationsTab` toujours inline dans Admin.tsx

**Origine** : Audit panel admin 2026-05-06
**Impact** : 337 lignes inline dans `Admin.tsx` (l 1583-1920) alors que la convention est un fichier dédié `admin/AdminXxx.tsx`. Aggrave la maintenabilité du fichier `Admin.tsx` (déjà 2355 l).
**Fix** : extraire en `src/components/admin/AdminApplications.tsx`. Refactor mécanique.
**Risque non-fix** : cosmétique — prolonge la dette de monolithisation d'`Admin.tsx`.
**Effort** : 0.2 j

### Dette 16 — Erreur 400 product_reviews

**Origine** : Découverte 2026-05-05 lors de validation browser post-Dette 10
**Impact** : Console DevTools affiche 400 Bad Request sur GET /rest/v1/product_reviews?select=*..&status=eq.approved. Frontend probablement désynchronisé du schema DB. N'impacte pas l'utilisateur final visiblement.
**Fix** : Investiguer le caller. Vérifier le SELECT projection vs colonnes existantes en DB.
**Risque non-fix** : erreurs console répétées, possible défaillance silencieuse de fonctionnalités review.
**Effort** : 30 min - 1 heure

### Dette 17 — Erreur 400 partners

**Origine** : Découverte 2026-05-05 lors de validation browser /admin certifications
**Impact** : Console DevTools affiche 400 Bad Request sur GET /rest/v1/partners avec filter plan=in.(brand_member,brand_network). Filter probablement sur colonne inexistante ou renommée.
**Fix** : Identifier le caller. Vérifier la colonne plan sur partners et adapter la requête.
**Risque non-fix** : idem dette 16.
**Effort** : 30 min - 1 heure

### Dette 18 — 61 warnings advisors Supabase préexistants

**Origine** : Audit Supabase Advisors 2026-05-05 (post-Dette 10)
**Impact** : 61 warnings sécurité préexistants, dont :
- 7 RLS "Always True" sur tables sensibles (concept_events, notifications, partner_contact_requests, pro_service_requests, project_briefs, salone_2026_visits, scoring_snapshots)
- Function Search Path Mutable (update_product_review_timestamp)
- Materialized View in API (product_review_stats)
- Public Bucket Allows Listing (storage.product-images)
- Public Can Execute SECURITY DEFINER (check_partner_upgrade)

Les RLS "Always True" sur tables sensibles peuvent être de vraies failles de sécurité (exposition de données privées à anon).
**Fix** : Session dédiée d'audit RLS pour les 7 tables sensibles + classification des autres warnings.
**Risque non-fix** : Possible exposition de données privées ou exécution de fonctions sensibles depuis anon.
**Effort** : 0.5-1 jour pour audit complet et fix prioritaires

**Statut partiel 2026-05-06 sprint 1** : audit ciblé sur les 7 RLS Always True effectué (cf. session day 8). Résultat :
- 1 fix appliqué : salone_2026_visits (cat A, fuite PII potentielle)
- 5 documentées en faux positifs (cat B, formulaires publics intentionnels — voir nouvelle section "RLS Always True justifiées et acceptées")
- 1 nouvelle dette critique : Dette 19 (notifications, cat C, vecteur phishing inter-user)
- 1 hors scope : Dette 20 (project_briefs.contact_email pattern incohérent)

**Statut partiel 2026-05-06 sprint 2** : audit ciblé sur les 25 functions SECURITY DEFINER public + 1 search_path mutable. Résultat :
- 1 fix appliqué : `update_product_review_timestamp` (search_path explicite ajouté)
- 21 REVOKE EXECUTE appliqués sur trigger functions (14), cron/internal RPCs (3), admin RPCs (2 — `next_invoice_number`, `next_payment_reference`), user-scoped RPCs (1 — `reserve_preorder` revoke anon, garde authenticated), orphan future-use (1 — `create_notification`)
- 4 fonctions documentées en faux positifs (helpers RLS `is_admin`/`is_brand_member`/`is_brand_owner` + `fuzzy_search_products`, voir nouvelle section "Functions SECURITY DEFINER acceptées")
- 1 nouvelle dette : Dette 21 (cleanup orphan trigger functions)
- Réduction empirique : advisor 60 warnings → 19 warnings (-41).

**Statut FIXED 2026-05-06 sprint 3** : audit complet effectué en 3 sprints. Les 3 derniers warnings traités :
- `product_review_stats` : ACL réduit à SELECT-only pour anon/authenticated (auparavant TOUS privilèges). Le warning advisor `materialized_view_in_api` persiste (faux positif accepté — matview dans schema public est exposée à l'API par design Postgres). Optional refactor tracké comme Dette 22.
- `product-images` bucket : action manuelle Dashboard requise (storage.objects owned by supabase_storage_admin, MCP postgres role insuffisant). Procédure documentée ci-dessous dans "Actions manuelles requises".
- `auth_leaked_password_protection` : action manuelle Dashboard requise. Procédure documentée.

Bilan cumulé Dette 18 :
- 60 → 19 advisor warnings DB-fixables (−41)
- 2 vraies failles fermées (salone PII leak, 21 functions over-exposed)
- 9 faux positifs documentés
- 4 nouvelles dettes identifiées : 19 (notifications phishing), 20 (project_briefs pattern), 21 (orphan triggers), 22 (matview refactor optional)
- 2 actions manuelles Dashboard pending (bucket listing + leaked password)

## Niveau 3 — Cosmétiques (continues)

### Dette 5 — selectedColor / selectedDimension @deprecated

Vocabulaire déprécié encore présent dans le code. Migration 
future pour clarté.

### Dette 7 — Cas DB invalide DEMO-T-160

Données de seed avec combinaison de flags invalide métier. 
À nettoyer ou corriger.

### Dette 8 — Édition admin variants avant approval

L'admin ne peut pas éditer les variants avant matérialisation.
À fixer pour flexibilité opérationnelle.

### Dette 15 — Tests E2E lourds

Beaucoup de scénarios validés uniquement par browser manuel.
À automatiser progressivement (Playwright).

### Dette 20 — project_briefs SELECT pattern incohérent

**Origine** : Audit Dette 18 phase 1 (2026-05-06)
**Impact** : Le RLS SELECT de `project_briefs` utilise `partners.contact_email = auth.email()` au lieu du pattern standard `partners.user_id = auth.uid()`. Si l'email d'un user authentifié diffère de l'email du contact partner (changement d'email ou structure multi-user dans une organisation), le scope ne fonctionnera pas.
**Fix** : Refactor de la RLS pour utiliser brand_users (cohérent avec les autres patterns RLS).
**Risque non-fix** : utilisateurs légitimes ne peuvent pas voir leurs briefs si emails désynchronisés.
**Effort** : 30 min - 1h

### Dette 21 — Cleanup orphan trigger functions

**Origine** : Audit Dette 18 sprint 2 (2026-05-06)
**Impact** : 3 functions sont SECURITY DEFINER mais n'ont aucun trigger associé ni aucun appel frontend :
- `notify_application_approved()`
- `notify_application_submitted()`
- `notify_quote_submitted()`

Code mort qui peut induire en erreur lors de futurs refactors. Permission EXECUTE déjà revoke dans le sprint 2, mais les fonctions restent en DB.

**Fix** : DROP des 3 fonctions orphelines après confirmation qu'elles ne sont plus prévues pour usage futur.
**Risque non-fix** : confusion lors de futurs développements, code mort persistant.
**Effort** : 15 min

### Dette 22 — Matview architecture refactor (optional)

**Origine** : Audit Dette 18 sprint 3 (2026-05-06)
**Impact** : la matview `product_review_stats` persiste comme advisor warning `materialized_view_in_api` après cleanup ACL (sprint 3). C'est by-design Postgres — une matview dans le schema public est exposée à l'API PostgREST par construction.

ACL post-Sprint 3 : SELECT-only pour anon/authenticated (auparavant tous privilèges).
Données exposées : pure agrégation (count, avg rating, distribution stars). Pas de PII.

**Fix optionnel** :
- Option A : déplacer la matview dans un schema dédié (ex : `stats.product_review_stats`)
- Option B : convertir en function `public.get_product_review_stats(product_id)` retournant un row
- Option C : laisser tel quel — données publiques par design

**Effort** : 2-4h selon option choisie + adaptation des callers (`useProductReviews`, `ProductDetail`, `ProductReviews`).

**Recommandation** : laisser tel quel sauf exigence réglementaire ou audit externe.

## Tableau de tracking

| # | Dette | Niveau | Effort | Statut | Date fix |
|---|-------|--------|--------|--------|----------|
| 9 | approveAsNew transactionnel | 1 | 0.5-1j | **FIXED ✅** | **2026-05-06** |
| 10 | RLS refactor inline | 1 | 0.5j | **FIXED ✅** | **2026-05-05** |
| 2 | variant_id cart | 1 | 0.5-1j | **FIXED ✅** | **2026-05-06** |
| 3 | variant_id quote | 1 | 0.5-1j | **FIXED ✅** | **2026-05-06** |
| **19** | **notifications phishing risk** | **1** | **0.5-1j** | **À fixer** | - |
| 1+12 | i18n drawer | 2 | 1-2h | À fixer | - |
| 11 | partner.slug | 2 | 30min | À fixer | - |
| 4 | zod variants | 2 | 1-2h | À fixer | - |
| 6 | i18n StockBadge | 2 | 30min | À fixer | - |
| 13+14 | SEO redirect | 2 | 30-45min | À fixer | - |
| **23** | **approveEdit transactionnel** | **2** | **2-3h** | **À fixer** | - |
| 16 | 400 product_reviews | 2 | 30min-1h | À fixer | - |
| 17 | 400 partners | 2 | 30min-1h | À fixer | - |
| 18 | 61 advisors warnings | 2 | 0.5-1j | **FIXED ✅** | **2026-05-06** (3 sprints) |
| **24** | **ProductForm admin déconnecté vocab 2026 + certifs** | **1** | **2-3j** | **À fixer** | - |
| 25 | Certifications absentes panel admin | 2 | 0.5-1j | **FIXED ✅** | **2026-05-07** (Sessions 2 ch.2) |
| 26 | Catégories CamelCase admin (scope admin) | 1 | 0.5j | **FIXED ✅** | **2026-05-06** |
| 27 | VariantsGrid pas branché admin | 1 | 1j | **FIXED ✅** (frontend) | **2026-05-07** (Sessions 2 ch.3, Option γ) |
| 28 | environment_urls oubliés admin | 2 | 0.5j | **FIXED ✅** | **2026-05-06** |
| 29 | Pas d'upload Storage admin | 2 | 0.5-1j | **FIXED ✅** | **2026-05-07** (Sessions 2 ch.1) |
| 30 | ApplicationsTab inline Admin.tsx | 3 | 0.2j | **FIXED ✅** | **2026-05-06** |
| **31** | **ProductForm contextuel adaptatif** | **2** | **2-4j** | **À fixer** | - |
| **32** | **Frontend public + engine CamelCase** | **2** | **0.5j** | **À fixer** | - |
| **33** | **PartnerOrders section absente** ★ | **1** | **2-4j** | **À fixer** | - |
| **34** | **SignatureModal canvas non-fonctionnel** | **1** | **2-4j** | **À fixer** | - |
| **35** | **Pro Service mock data architect+partner** | **1** | **>5j** | **À fixer** | - |
| **36** | **Architect tier hardcodé + notes non-persistées** | **2** | **2-4j** | **À fixer** | - |
| **37** | **Lowercase categories partner-side** | **2** | **0.5j** | **À fixer** | - |
| **38** | **Client profile non-editable** | **2** | **0.5j** | **À fixer** | - |
| **39** | **Partner notif arrivée devis** | **3** | **0.5j** | **À fixer** | - |
| **40** | **Partner public profile preview** | **3** | **0.5j** | **À fixer** | - |
| **41** | **Tracking number client copy/deeplink** | **3** | **0.5j** | **À fixer** | - |
| 37 | Lowercase categories partner-side | 2 | 0.5j | **FIXED ✅** | **2026-05-06** |
| 38 | Client profile non-editable | 2 | 0.5j | **FIXED ✅** | **2026-05-06** |
| 39 | Partner notif arrivée devis | 3 | 0.5j | **FIXED ✅** | **2026-05-06** |
| 33 | PartnerOrders section absente ★ | 1 | 2-4j | **FIXED ✅** | **2026-05-06** (Chantier Σ1) |
| **42** | **BRAND_SPECIALTIES + BRAND_CERTIFICATIONS CamelCase** | **3** | **0.2j** | **À fixer** | - |
| **43** | **Drift prevention process à renforcer** | **2** | **0.5-1j** | **À fixer** | - |
| **44** | **WebSocket realtime connection failed** | **2** | **0.5-2h** | **À investiguer (cat C confirmée)** | - |
| **48** | **DROP legacy variants jsonb columns (deferred cleanup)** | **3** | **1.5h** | **À fixer (session dédiée)** | - |
| 45a | quote_requests 400 (client_name) | 2 | 5min | **FIXED ✅** | **2026-05-07** |
| 45b | product_offers 400 narrow (PartnerOverview) | 2 | 5min | **FIXED ✅** | **2026-05-07** |
| **46** | **Drift migration brand-distributor 20260329100000** | **2** | **0.5-2j** | **Décision stratégique requise** | - |
| **47** | **4 callsites source_offer_id brand-only** | **3** | **0.5j** | **Conditionnel Dette 46** | - |
| 5 | selectedColor deprecated | 3 | 1h | Continu | - |
| 7 | DB invalide seed | 3 | 30min | Continu | - |
| 8 | Édition admin variants | 3 | 2-3h | Continu | - |
| 15 | Tests E2E Playwright | 3 | Continu | Continu | - |
| 20 | project_briefs pattern incohérent | 3 | 30min-1h | À fixer | - |
| 21 | cleanup orphan trigger functions | 3 | 15min | À fixer | - |
| **22** | **matview architecture refactor (optional)** | **3** | **2-4h** | **À fixer (optional)** | - |

## Méta-règle

Toute nouvelle décision technique doit éviter d'ajouter 
à cette dette. Si on doit accepter un trade-off temporaire, 
il rejoint cette liste avec une justification.

## RLS Always True justifiées et acceptées

Certaines tables ont une RLS `WITH CHECK (true)` sur INSERT par design métier. L'advisor Supabase les flag mais ce sont des faux positifs documentés et acceptés.

### concept_events

- **RLS** : `INSERT public WITH CHECK (true)` ; SELECT scopé `is_admin()`
- **Justification** : analytics anonymes sur la phase de découverte produit. Intentionnel pour tracking utilisateurs non-loggés.
- **PII** : aucune (session_id, event_type, metadata)
- **Recommandation** : ajouter rate limiting via edge function pour prévenir spam (à programmer si besoin).

### partner_contact_requests

- **RLS** : `INSERT public WITH CHECK (true)` ; SELECT scopé `is_admin() OR partner_id IN (mes partners)`
- **Justification** : formulaire de contact public sur les pages partner. Lead capture intentionnel.
- **PII** : nom, email, téléphone, message — saisis par l'utilisateur lui-même volontairement.
- **Recommandation** : rate limiting + captcha invisible pour prévenir spam (à programmer si besoin).

### pro_service_requests

- **RLS** : `INSERT public WITH CHECK (true)` ; SELECT scopé `architect_id=auth.uid() OR client_user_id=auth.uid() OR partner via match OR is_admin()`
- **Justification** : formulaire public de demande Pro Service (architectes, clients). Lead capture pour le service.
- **PII** : fortes (client_name, client_email, client_phone, client_company) — saisies volontairement.
- **Recommandation** : rate limiting + validation email.

### project_briefs

- **RLS** : `INSERT public WITH CHECK (true)` ; SELECT scopé `brand_partner_id IN (mes brand partners via contact_email)`
- **Justification** : formulaire brief public, brand-routed pour distribution aux partners.
- **PII** : nom, email, company, siren, message.
- **Note** : le SELECT scope utilise `partners.contact_email = auth.email()` au lieu de `user_id`. Cf. Dette 20 (à investiguer hors scope).
- **Recommandation** : rate limiting + validation email.

### scoring_snapshots

- **RLS** : `INSERT public WITH CHECK (true)` ; SELECT scopé `is_admin()`
- **Justification** : analytics immutable de scoring. INSERT public intentionnel pour tracking utilisateurs anonymes.
- **PII** : aucune (session_id, parameters jsonb, concept_ids[], etc.)
- **Recommandation** : idem concept_events, rate limiting si abuse détecté.

## Functions SECURITY DEFINER acceptées et justifiées

Certaines fonctions doivent rester executable par anon/authenticated pour le fonctionnement légitime de l'app. L'advisor Supabase les flag mais ce sont des faux positifs documentés.

### Helpers RLS (3 functions)

- `is_admin()`
- `is_brand_member(check_brand_id uuid, check_user_id uuid)`
- `is_brand_owner(check_brand_id uuid, check_user_id uuid)`

**Justification** : `is_admin()` est utilisée par 102 RLS policies (vérifié 2026-05-06). PostgreSQL vérifie la permission EXECUTE au PLANNING TIME, pas au runtime (incident 2026-05-01 a prouvé que REVOKE casse production pendant 4 jours).

**Note** : `is_brand_member` et `is_brand_owner` ne sont plus utilisées en RLS depuis Dette 10 (refactor inline). Gardées pour observation 1-2 semaines, DROP planifié mi-mai 2026. À ce moment, ces 2 fonctions disparaîtront des warnings advisor naturellement.

### RPCs publics légitimes (1 function)

- `fuzzy_search_products(search_query text, lang text, category_filter text, limit_count integer)`

**Justification** : recherche publique de produits depuis le catalogue. Anon doit pouvoir l'exécuter pour la search bar publique (cf. `src/hooks/useProducts.ts`).

### RPC authenticated user (1 function)

- `reserve_preorder(p_arrival_item_id uuid, p_user_id uuid, p_product_id uuid, p_quantity integer)`

**Justification** : réservation pre-order par un utilisateur authentifié (cf. `src/hooks/useArrivals.ts`). EXECUTE retiré pour anon, conservé pour authenticated. Advisor flag persistant car authenticated peut toujours l'appeler — c'est intentionnel.

## Advisor warnings acceptés (faux positifs documentés)

Certains warnings de Supabase Advisor sont des faux positifs inhérents au design de l'application. Ils sont documentés ici pour traçabilité.

### materialized_view_in_api — product_review_stats

**Advisor flag** : "Materialized View in API"

**Justification** : la matview `product_review_stats` expose des aggregats publics (count, avg rating, distribution stars) du catalogue de produits. Cette exposition est intentionnelle pour l'affichage public des reviews sur les fiches produits (cf. `src/hooks/useProductReviews.ts`, `src/pages/ProductDetail.tsx`).

**ACL post-Sprint 3** : SELECT-only pour anon/authenticated (commit 33ce142… → final commit Sprint 3).

**Pas de PII** : pure agrégation statistique (count + averages).

**Why not refactor** : déplacer la matview hors schema public OU la convertir en function/view normale nécessiterait un refactor lourd (impact `useProductReviews` hook + `ProductDetail.tsx` + `ProductReviews.tsx`). Effort non justifié pour un warning informationnel sur des données publiques.

Voir Dette 22 pour refactor optionnel future.

## Actions manuelles requises (Dashboard)

Certains settings Supabase ne sont pas versionnables en SQL et doivent être configurés via Dashboard.

### Bucket product-images : restreindre listing à authenticated

**Origine** : Audit Dette 18 sprint 3 (2026-05-06)
**Statut** : ✅ DONE 2026-05-06 (founder a appliqué via SQL Editor Dashboard, query "Success. No rows returned").

**Pourquoi pas en migration MCP** : `storage.objects` est owned par `supabase_storage_admin`. Le rôle `postgres` utilisé par MCP ne peut pas DROP/CREATE de policies sur cette table.

**Procédure** :
1. Aller sur https://supabase.com/dashboard
2. Sélectionner le projet, ouvrir SQL Editor
3. Exécuter :

```sql
DROP POLICY "Public read access to product images" ON storage.objects;

CREATE POLICY "Authenticated read access to product images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'product-images');
```

**Impact** :
- Anon ne peut plus lister les 160 objets via `storage.objects` SELECT
- `getPublicUrl()` continue de fonctionner pour anon (path CDN dédié `/storage/v1/object/public/` qui bypasse RLS)
- `PhotoGalleryManager.tsx` (partner dashboard, authenticated) continue de fonctionner

**Date d'exécution à reporter ici** : ____/____/____

### auth_leaked_password_protection

**Origine** : Audit Dette 18 sprint 3 (2026-05-06)
**Statut** : ⚠️ DÉPEND DU PRO PLAN — feature gated, action reportée jusqu'à upgrade Supabase plan.

**Note (découverte 2026-05-06)** : tentative d'activation effectuée 2026-05-06. Le toggle n'est pas accessible sur le plan actuel. À programmer quand le projet aura besoin d'un upgrade plan (croissance utilisateurs, fonctionnalités payantes Supabase, etc.).

**Procédure (post-upgrade)** :
1. Aller sur https://supabase.com/dashboard
2. Sélectionner le projet
3. Aller dans Authentication → Providers → Email
4. Section "Password security"
5. Activer "Prevent the use of leaked passwords"

**Impact** : aucun pour les utilisateurs existants. Vérification HaveIBeenPwned activée pour les futurs signups et changements de mot de passe.

**Date d'activation à reporter ici** : ____/____/____

## Historique des fixes

### 2026-05-05 — Dette 10 (RLS refactor inline)

- Commit : 1c23eec
- Validation : 48/48 cells matched between pre-fix and post-fix baselines
- REST API : HTTP 200 confirmed (was 401 during incident 2026-05-01)
- Empirical evidence captured in Phase 3 récap (cf. transcript day 7 archive)
- Helper functions kept in DB for 1-2 weeks observation period before final DROP

### 2026-05-06 — Dette 18 sprint 1 (audit RLS Always True)

- Audit ciblé des 7 RLS "Always True" flagged par advisor
- 1 fix appliqué : salone_2026_visits (cat A — anon avait SELECT/INSERT/UPDATE/DELETE sur PII)
- Empirical validation pre/post : anon INSERT pré-fix=SUCCESS, post-fix=42501 RLS violation
- Advisor confirme suppression du flag salone (6 entries restantes = faux positifs documentés + cat C notifications)
- 5 documentées en faux positifs (cat B) : concept_events, partner_contact_requests, pro_service_requests, project_briefs, scoring_snapshots
- 1 nouvelle dette critique identifiée : Dette 19 (notifications phishing risk)
- 1 hors scope ajoutée : Dette 20 (project_briefs pattern incohérent)

### 2026-05-06 — Dette 18 sprint 2 (Cat E + Cat B)

- Audit ciblé des 25 functions SECURITY DEFINER public + 1 search_path mutable
- Classification :
  - 1 fix simple : `update_product_review_timestamp` search_path explicite ajouté
  - 21 REVOKE EXECUTE (PUBLIC, anon, authenticated) :
    - 14 trigger functions (jamais appelées via RPC, exécutées par Postgres trigger context)
    - 3 cron/internal RPCs (`expire_overdue_quotes`, `invoke_scheduled_tasks`, `run_reminder_notifications` — service_role only)
    - 2 admin RPCs (`next_invoice_number`, `next_payment_reference` — investigation paymentUtils confirmée admin-only)
    - 1 user-scoped RPC (`reserve_preorder` — anon revoked, authenticated kept)
    - 1 orphan future-use (`create_notification` — kept service_role for future Dette 19)
  - 4 documentées en faux positifs : `is_admin`, `is_brand_member`, `is_brand_owner`, `fuzzy_search_products`
  - 1 nouvelle dette : Dette 21 (cleanup orphan trigger functions)
- Empirical validation pre/post :
  - Pre-apply : 25 SECURITY DEFINER functions executable by anon
  - Post-apply : 4 (helpers RLS + public search) — conformément au plan
  - Spot checks : `notify_quote_submitted` anon=false ✓, `next_invoice_number` auth=false ✓, `reserve_preorder` auth=true ✓, `is_admin` anon=true ✓
- Advisor reduction : 60 warnings → 19 warnings (-41)
- Reste à auditer : 3 warnings (materialized_view_in_api, public_bucket_allows_listing, auth_leaked_password_protection) — sprint 3

### 2026-05-06 (Sprint Quick Wins #3) — Dette 39 FIXED ✅

Fix transverse notifications realtime + bug latent silencieux découvert pendant la recon.

- **Bug racine identifié** : `useNotifications.ts:5` importait `toast` depuis `@/hooks/use-toast` (système shadcn) MAIS `<Toaster />` shadcn n'était jamais monté dans `App.tsx` (seul `<Sonner />` du package `sonner` est monté). Conséquence : **TOUS les toasts realtime étaient muets** depuis la migration partielle vers sonner (Dette 4 dans CLAUDE.md "Duplicate use-toast").
- **L'audit User Tools avait suggéré** un fix workaround "polling React Query sur usePartnerQuotes". C'était traiter le symptôme : la realtime subscription existait déjà (`useNotifications.ts:54-92` souscrit au channel `notifications:${user.id}`), elle était juste muette.
- **Fix appliqué** :
  - `useNotifications.ts:5` : import migré `@/hooks/use-toast` → `sonner`
  - `useNotifications.ts:78-83` : signature adaptée `toast({title, description})` → `toast.info(title, { description })`
- **Bénéfice transverse (collateral benefit)** : ce fix unmute **TOUTES les notifs realtime** pour les 4 personas :
  - Partner quote arrivals (Dette 39 strict scope)
  - Client order status updates
  - Message arrivals (any persona)
  - Review request notifications
  - Tous les inserts dans `notifications` table
- **Audit étendu use-toast** : 3 occurrences trouvées (`toaster.tsx` shadcn component + `use-toast.ts` re-export shim + `useNotifications.ts`). Seul `useNotifications` était un caller actif. Les 2 autres = infrastructure shadcn dead code (déjà tracé en Dette 4 CLAUDE.md). **Pas de Dette 44 nécessaire**.
- Validation : tsc 0 erreur, 615/615 tests passing, lint stable (610 = baseline).
- Smoke test browser empirique recommandé post-merge (login partner + client demande devis → toast visible côté partner).

### 2026-05-06 (Sprint Quick Wins #2) — Dette 38 FIXED ✅

Client profile editing wired + drift incident closed.

- **Drift incident résolu** : la migration `20260411100000_restrict_user_profiles_self_update.sql` était présente en repo depuis le 11 avril mais jamais appliquée à la DB. Frontend appelait un RPC inexistant (`update_own_profile`) avec catch silencieux → 3 semaines de bug invisible. Migration appliquée via MCP avec REVOKE/GRANT ajoutés.
- **RPC étendu** : nouvelle migration `20260506230022_dette_38_extend_update_own_profile.sql` étend `update_own_profile` de 4 → 7 params (ajout `siren`, `country`, `country_code`). DROP de la version 4-param + CREATE 7-param + REVOKE/GRANT proper. DO block validation embarqué.
- **`lib/countries.ts` étendu** : un fichier `lib/countries.ts` existait déjà (16 entrées EN). Étendu avec labels FR (`name_fr`) pour servir partner ET client en single source of truth. PartnerProfileForm refactoré pour importer depuis `lib/countries.ts` au lieu de la liste hardcodée locale.
- **`ClientSettingsSection`** : 3 nouveaux fields éditables (siren input + country `<select>` SUPPORTED_COUNTRIES + country_code auto-dérivé). Error handling **substantiellement amélioré** : silent fail remplacé par `toast.error(err.message)` + `console.error` + log. Plus de bug silencieux possible.
- **types.ts régénéré** : nouveau RPC visible avec ses 7 params.
- **Dette 43 capturée** (Niveau 2) : drift prevention process à renforcer (pre-commit hook + audit régulier + frontend defensive + CLAUDE.md update).
- Validation : tsc 0 erreur, 615/615 tests passing, lint stable (610 warnings = baseline).

### 2026-05-06 (Sprint Quick Wins #1) — Dette 37 FIXED ✅

Vocab partner-side aligné lowercase-kebab.

- **UI** : 3 fichiers
  - `BecomePartner.tsx:15-24` : `CATEGORY_KEYS` 12 entrées (mix camelCase `barStools/diningTables/coffeeTables/highTables/sunLoungers`) → toutes en lowercase-kebab
  - `PartnerProfileForm.tsx:23-26` : `PRODUCT_CATEGORIES` 10 entrées CamelCase → lowercase + helper `prettyCategory()` ajouté pour l'affichage
  - `ExcelImportModal.tsx:526, 944` : 2 occurrences `"Chairs"` → `"chairs"` dans templates Excel d'exemple
- **i18n** : 5 keys top-level (sunLoungers, barStools, diningTables, coffeeTables, highTables) renommées dans 4 locales (en/fr/it/es) → 20 modifications. Keys `categories.sub.*` préservées (usage différent — search filters sub-categories).
- **DB** : migration `20260506224938_dette_37_lowercase_partner_categories.sql` appliquée. Pre-check : 1 partner concerné (Pros Import). Validation empirique post-apply : `["Chairs","Tables","Parasols","Loungers"]` → `["chairs","tables","parasols","loungers"]` ✓
- **Découverte** : `PartnerProfileForm` contient aussi `BRAND_SPECIALTIES` + `BRAND_CERTIFICATIONS` en CamelCase → capturé en **Dette 42** (Niveau 3 cosmétique, 0.2j) plutôt que scope creep
- **Validation** : tsc 0 erreur, 615/615 tests passing, lint stable (610 warnings = baseline)

### 2026-05-06 — User Tools Audit (9 nouvelles dettes 33-41)

Audit stratégique des 4 personas (Client, Architecte, Partner, Admin) déclenché par le founder pour réorienter ou confirmer Session 2 admin.

- Document détaillé : `docs/strategy/USER_TOOLS_AUDIT.md` (~600 lignes : inventaire + gaps par persona + matrice priorisation + recommandation roadmap)
- 9 nouvelles dettes ajoutées au tracking : 33 (PartnerOrders), 34 (SignatureModal), 35 (Pro Service mock), 36 (Architect tier+notes), 37 (lowercase partner), 38 (Client profile edit), 39 (Partner notif), 40 (Profile preview), 41 (Tracking deeplink)
- **Top 3 trous prioritaires identifiés** :
  1. Dette 33 — PartnerOrders absente (BLOQUANT, 2-4j) : promesse plateforme cassée pour partners payants
  2. Dette 34 — SignatureModal stub (BLOQUANT légal, 2-4j) : risque contractuel
  3. Dette 35 — Pro Service mock data (BLOQUANT acquisition architect, >5j) : USP architect démo-ware
- **Recommandation finale** : **réordonner Session 2**. Quick Wins Sprint (Dettes 37, 38, 39 = 1.5-2j total) puis Chantier PartnerOrders (Dette 33, 2-4j) AVANT Session 2 admin originale (Dettes 25/27/29). Impact business strictement supérieur sur l'acquisition + retention.

### 2026-05-06 (Session 1) — Dettes 26, 28, 30 FIXED ✅

Foundation UI panel admin + 3 quick wins.

- `docs/design/ADMIN_DESIGN_LANGUAGE.md` créé (267 lignes, 7 sections, inspiration Linear 60% / Stripe 30% / Vercel 10%, principe « quiet B2B »)
- **Dette 26** : 12 CamelCase → 8 canonical lowercase (`CANONICAL_CATEGORIES` import) + `normalizeProductCategory()` defense-in-depth au save (scope ProductForm admin uniquement — frontend public reporté en Dette 32 nouvellement identifiée)
- **Dette 30** : `ApplicationsTab` extracted vers `src/components/admin/AdminApplications.tsx` (340 lignes), `Admin.tsx` −341 lignes (2355 → 2014), `Clock` import unused supprimé
- **Dette 28** : `environment_urls` UI ajouté dans ProductForm admin (textarea CSV + thumbnails strip, pattern symétrique à `gallery_urls`)
- 2 nouvelles dettes capturées :
  - **Dette 31** : ProductForm contextuel adaptatif (founder feedback browser validation)
  - **Dette 32** : Frontend public + engine encore CamelCase (smoke test découverte — non bloquante mais à fixer avant prochaine migration vocab)
- Smoke test end-to-end : Dette 30 ALL GREEN (orphan refs / imports / usage / RLS), Dette 28 ALL GREEN (save / read / display / cohérence partner)
- Validation : tsc 0 erreur, 615/615 tests passing, lint stable (610 warnings = baseline), browser validation founder
- Reste Sessions 2 & 3 : Dettes 25, 27, 29 (alignement features) puis Dette 24 (ProductForm refonte)

### 2026-05-06 — Audit panel admin (7 nouvelles dettes 24-30)

- Audit complet des 24 sections admin + comparaison avec partner-dashboard
- Document détaillé : `docs/strategy/ADMIN_PANEL_AUDIT.md` (inventaire + patterns + gaps + roadmap 3 phases)
- Constat racine : **l'admin est en retard d'une phase produit complète** (8e-1, 8e-2, vocab 2026, Modèle B variants livrés côté partner sans propagation admin)
- 7 dettes ajoutées au tracking : Dette 24 (vocab+certifs ProductForm), 25 (certifs absentes admin), 26 (CamelCase), 27 (VariantsGrid), 28 (environment_urls), 29 (upload Storage), 30 (ApplicationsTab inline)
- Effort total estimé : 5-9.5 j sur 3 phases (A quick wins 1-1.5j, B alignement 2-3j, C refonte profonde 3-5j optionnelle)
- **Recommandation transverse** : ajouter à la Definition of Done que toute nouvelle feature produit doit être disponible et éditable des 2 surfaces (partner + admin) ou explicitement justifiée comme partner-only

### 2026-05-06 — Dette 19 Phase 2B.1 delivered

- 3 RPCs SECURITY DEFINER créées pour le sous-pattern Quote-related :
  - `create_quote_notification_to_admins(p_quote_id, p_type, p_title, p_body, p_link)` → uuid[] (P3.Q1)
  - `create_quote_notification_to_partner(p_quote_id, p_type, p_title, p_body, p_link)` → uuid (P3.Q2)
  - `create_quote_notification_to_client(p_quote_id, p_type, p_title, p_body, p_link)` → uuid (P3.Q3)
- Chaque RPC valide la business relation (quote.client_user_id OR partners.user_id OR brand_users membership OR is_admin) avant INSERT
- 7 callsites Quote-related refactorés frontend → RPCs :
  - `QuoteRequestModal.tsx` (2 — admins broadcast + assigned partner)
  - `usePartnerQuotes.ts` (1 — partner reply notifies client)
  - `ProjectCart.tsx` (2 — partner notif per partner + admins broadcast post-loop)
  - `ClientSections.tsx` (2 — quote acceptance + signing notify admins)
- ProjectCart.tsx : ajout d'un `firstInsertedQuoteId` tracker pour notifier les admins après la boucle
- Code paths simplifiés : suppression des SELECT user_profiles + boucles d'INSERT côté client (4 callsites simplifiés ; loops admins devenus internes à la RPC)
- Validation : DO block migration vérifie 3 RPCs créées + permissions (anon REVOKE, authenticated GRANT)
- Empirical post-apply : anon → 42501 permission denied ✓
- types.ts régénéré (3 RPCs visibles)
- tsc 0 erreur, 615/615 tests passing
- Reste Phase 2B : 9 callsites P3 dans 5 sous-phases (Order, Brief, Partner-application, Financing, Product approval) + RLS final tightening (~3-5h)

### 2026-05-06 — Dettes 2 + 3 FIXED ✅

- ALTER TABLE project_cart_items ADD COLUMN variant_id uuid (FK product_variants ON DELETE SET NULL)
- ALTER TABLE quote_requests ADD COLUMN variant_id uuid (FK product_variants ON DELETE SET NULL)
- Pattern ON DELETE SET NULL aligné avec les FK soft existantes (product_id, offer_id, partner_id) sur les 2 tables — préserve l'historique commercial
- 5 callsites frontend refactorés :
  - `ProjectCart.tsx` : 2 inserts (project_cart_items + boucle quote_requests)
  - `QuoteRequestModal.tsx` : nouveau prop `selectedVariantId`, INSERT propagé
  - `ProductDetail.tsx` : passe `selectedVariantId={selectedModelBVariant?.id}` à QuoteRequestModal
  - `VendorOffers.tsx` : 2 callsites secondaires (offer-specific quote modals) reçoivent aussi le selectedVariantId
- DO block validation : colonnes créées + FK ON DELETE SET NULL vérifiée empiriquement
- types.ts régénéré (15 occurrences variant_id incl. FK refs)
- tsc 0 erreur, 615/615 tests passing
- Effort réel cumulé : 1.5-2h (vs 1-2j estimé : la moitié du travail était déjà faite côté client par 9a-fix-2)
- Découverte : la dette était mal documentée. Le cart côté client gérait déjà variant_id en jsonb depuis 9a-fix-2 ; le vrai problème était la submission relationnelle.

### 2026-05-06 — Dette 9 FIXED ✅

- RPC `approve_product_submission_as_new(submission_id, product_jsonb, variants_jsonb, offers_jsonb)` créée (SECURITY DEFINER, search_path=public,pg_temp, EXECUTE authenticated only)
- Frontend hook `approveAsNew` refactoré (~140 lignes simplifiées) :
  - Steps 1-7 + 9 préservés (uploads Storage, race-check UX, validation, slug gen)
  - Steps 8 (INSERT product) + 10 (variants) + 11 (offers) + 12 (UPDATE submission) délégués à la RPC en 1 seul appel
  - Cleanup applicatif (DELETE products on fail) supprimé — PG ROLLBACK gère
  - `console.warn` silent-fails sur offers supprimés — la RPC raise désormais
- Validation empirique pre/post : anon → 42501 permission denied ✓ (pre-apply pas testable car RPC n'existait pas)
- types.ts régénéré (signature `approve_product_submission_as_new` visible)
- 1 nouvelle dette : **Dette 23** (`approveEdit` similar non-transactional pattern, Niveau 2)
- Out of scope : storage orphans (cron cleaner futur)

### 2026-05-06 — Dette 19 Phase 2A delivered

- 2 RPCs SECURITY DEFINER créés : `create_self_notification` (P1 future-proof, no current caller) et `create_admin_notification` (P2 admin → user, with `is_admin()` check)
- Colonne `sender_user_id` ajoutée à `notifications` (FK auth.users, audit logging)
- 14 callsites P2 refactorés frontend → RPC (8 fichiers admin/* + usePaymentFlow). Les 2 bulk inserts utilisent une boucle (admins ≤ 5, ou utilisateurs si "all")
- types.ts régénéré (sender_user_id column + 2 RPCs visibles)
- Validation : DO block embarqué + has_function_privilege checks (anon=false, authenticated=true sur les 2 RPCs)
- ~50 % surface d'attaque cross-user fermée
- 16 callsites P3 reportés Phase 2B (roadmap dans Dette 19)
- RLS tightening reporté Phase 2A.2 final

### 2026-05-06 — Dette 18 sprint 3 COMPLETED ✅

- 3 derniers warnings traités, audit Dette 18 fermé après 3 sprints
- `product_review_stats` matview : ACL réduite à SELECT-only pour anon/authenticated (auparavant TOUS privilèges a/r/w/d/D/x/t/m). service_role et postgres intacts. Validation empirique : anon SELECT=true, INSERT/UPDATE/DELETE=false ✓.
- `product-images` bucket : action manuelle Dashboard SQL Editor documentée (storage.objects owned by supabase_storage_admin → MCP postgres role insuffisant).
- `auth_leaked_password_protection` : action manuelle Dashboard documentée.
- 1 dette future optionnelle ajoutée : Dette 22 (matview architecture refactor).
- 1 warning persistera comme faux positif documenté : `materialized_view_in_api` sur `product_review_stats` (by-design Postgres).

**Bilan final Dette 18 (3 sprints cumulés)** :
- 60 → 19 advisor warnings DB-fixables (−41)
- 2 vraies failles fermées : salone_2026_visits PII leak + 21 functions SECURITY DEFINER over-exposed
- 9 faux positifs documentés (5 RLS Always True + 4 SECURITY DEFINER intentionnels)
- 1 ACL matview réduit
- 1 fix search_path
- 4 nouvelles dettes identifiées (Dette 19/20/21/22)
- 2 actions manuelles Dashboard pending : bucket policy + leaked password protection

## Initiatives stratégiques planifiées

### SEO/GEO Strategy (Q3 2026)

Voir docs/strategy/SEO_GEO_STRATEGY.md pour le plan complet.

Approche progressive en 3 phases :
- Phase 1 : Quick wins SEO/Schema sur l'existant (1-2j)
- Phase 2 : 3 pages "Solutions" pilotes (3-5j)
- Phase 3 : Industrialisation conditionnelle si Phase 2 positive (5-10j)

Conditionné à la résolution préalable des dettes critiques (9, 2, 3) et de la Dette 18 (audit RLS warnings).
