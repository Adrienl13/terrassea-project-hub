# User Tools Audit — Terrassea Hub

**Date** : 2026-05-06
**Auteur** : audit Claude Code (read-only)
**Companion** : `docs/strategy/ADMIN_PANEL_AUDIT.md` (admin scope, commit 041af30)

## Objectif

Les 22 derniers commits ont apporté énormément de valeur **invisible** (sécurité RLS, transactions atomiques, audit, design language). Avant de continuer Session 2 admin (Dettes 25, 27, 29 = certifs admin + VariantsGrid admin + upload Storage admin), audit stratégique des **outils utilisateurs** pour vérifier que la priorisation reste alignée sur l'impact business.

## Méthodologie

- **4 personas** : Client (acheteur final), Architecte/Pro Service, Partner (fabricant/marque), Admin (synthèse seulement, déjà audité).
- **3 catégories de trous** : BLOQUANT (workflow critique impossible), FRICTION (friction notable mais workaround), EXPÉRIENCE (UX nice-to-have).
- **Matrice priorisation** : impact business × effort (Quick wins / Chantiers / Nice to have / À éviter).

## Constats critiques en tête

Aucune faille de sécurité découverte. Deux constats à surfacer immédiatement :

1. **Aucune UI de gestion des commandes côté partner** : grep dans `src/components/partner-dashboard/*` confirme l'absence de tout `PartnerOrders*`. La table `orders` n'est interrogée que pour la stat de revenu dans `PartnerOverview.tsx:252-266` et `UpgradeSuggestion.tsx:57`. Quand un client signe un devis → l'edge function `auto-workflow` crée une commande → admin la voit dans `AdminOrderTracking.tsx`, client la voit dans `ClientOrdersSection.tsx`, **partner ne voit rien**. Le workflow partner ↔ commande est un trou noir. **C'est le top BLOQUANT.**

2. **Architect tier hardcodé `"atelier"`** dans `src/pages/Account.tsx:417`. Les UI de tier (rewards, perks, discount banner) sont tous basés sur cette valeur statique. Le sectionnement Studio/Atelier/Maison promis dans l'UI est non-fonctionnel — directement contredit par le note CLAUDE.md "Tiers Studio / Atelier / Maison are not implemented".

---

## 1. Persona — CLIENT (acheteur final)

### Inventaire

**Routes** : `/`, `/products`, `/products/:id`, `/products/compare`, `/products/:brandSlug/:productSlug`, `/collections`, `/inspirations`, `/pro-service`, `/account` (section client), `/messages`, `/projects/new`, `/project-cart`, `/mood-board`. Note : `/solutions` n'existe pas dans `App.tsx`.

| Item | Detail |
|---|---|
| **Routes / écrans** | Discovery publique (Index, Products, ProductDetail), Project builder (`ProjectBuilder.tsx` 570 l), Project cart (`ProjectCart.tsx` 952 l), Account dashboard 8 sections (overview, design-ai, projects, quotes, orders, messages, favourites, settings) |
| **Actions critiques** | Browse + filter ; SmartSearch (NL→engine) ; favorites ; compare ; create project ; add to cart ; request quote (`QuoteRequestModal` 444 l avec lookup SIREN) ; submit project brief (`ProjectBriefModal` 556 l) ; accept quote ; **sign quote** (3-step modal) ; pay deposit/balance Stripe ; reorder ; financing request ; mood-board AI |
| **Données visibles** | Projects timeline (draft→sourcing→quoted→ordered→delivered) ; quote details avec **alias supplier masqué jusqu'à signature** ; orders avec timeline complet + tracking + payment ; messages avec partners ; favoris ; financing apps |
| **Données modifiables** | Project name/details ; brief ; quote acceptance/signature ; quantity in cart ; profile (read-only display !) ; order actions (cancel, reorder) |
| **Communications cross-persona** | In-app messages (Conversations) ; sonner toasts ; emails via 3 edge functions ; client→admin RPC `create_quote_notification_to_admins` (Session 2B.1 wired in `ClientSections.tsx:983, :1311`) |

### Trous identifiés

| # | Gap | Catégorie | Impact business | Effort | Composants |
|---|---|---|---|---|---|
| C1 | **Profile edit read-only**. `Account.tsx::SettingsSection` l 362-385 + `ClientSettingsSection` n'offrent pas l'édition du nom, téléphone, company, SIREN. Doit aller via Auth ou contact admin. | Friction | Retention (B2B trust) | 0.5 j |
| C2 | **Architect tier hardcodé** `"atelier"` dans `Account.tsx:417` (touche aussi le client si user_type=architect — voir A2 persona architecte) | Bloquant | Acquisition | 1 j |
| C3 | **SignatureModal canvas non-fonctionnel**. `ClientSections.tsx:1479-1486` rend un placeholder "click to sign" mais `signQuoteRequest` est appelé sans capture de signature. Stub. | **Bloquant légal** | Conversion + risque légal | 2-4 j + vendor decision |
| C4 | **Tracking number sans copy/deep-link**. Affichage seul dans `ClientOrdersSection`. | Friction | Retention | 0.5 j |
| C5 | **Cart→quote multi-produit cassé**. `ProjectCart` est multi-produits, mais `QuoteRequestModal` est mono-produit. Brief ProjectBriefModal couvre mais flux quote multi-partenaires non aligné. | Friction | Conversion | 2-4 j |
| C6 | **Pas de RMA/dispute UI client** (admin a, client n'a pas — passe par Messages) | Expérience | Retention | 1 j |
| C7 | **Pas d'upload images dans brief/quote**. Mood-board existe mais ne nourrit pas les briefs. | Expérience | Conversion | 1 j |
| C8 | **Pas de prompt review post-livraison**. Edge function `send-review-request` existe + table `product_reviews` wired, mais pas de UI client pour reviewer. Admin modère. | Expérience | Acquisition (social proof) | 1-2 j |
| C9 | **Pas de suivi `financing_requests` côté client** (modal existe, follow-up screen absent) | Friction | Retention | 0.5 j |
| C10 | **Account dashboard mobile cassé** : `Account.tsx:786` masque la sidebar entièrement (`hidden md:block`) sans fallback nav mobile | Friction (mobile ~50% trafic) | Acquisition | 1 j |

**Verdict client** : journey discovery→brief→quote→sign→pay→track end-to-end fonctionnel et solidifié récemment (Session 2B.1 RPC notifs). Deux vrais trous : signature canvas stub (C3) plus critique, et profile edit (C1) un fix 0.5 j qui supprime un irritant 100% des cas.

---

## 2. Persona — ARCHITECTE / PRO SERVICE

### Inventaire

**Routes** : `/inspirations`, `/pro-service`, `/projects/new`, `/mood-board`, `/account` (section architect), `/messages`. Pas de route dédiée `/architect` — tout passe par Account avec `user_type='architect'`.

| Item | Detail |
|---|---|
| **Routes / écrans** | Account shell avec sections architect : overview, design-ai, projects (avec project-detail subview), create-project, quotes, calls (supplier_calls), messages, rewards, favourites, settings. Pro Service hub `/pro-service` lazy-load `ProServiceArchitectHub.tsx` (1 265 l) |
| **Actions critiques** | Create project pour client ; manage zones (`useProjectZones`) ; annotate (`ProjectAnnotations`) ; build material boards avec partage par token (`/boards/shared/:token`) ; create supplier call (`useSupplierCalls`) ; receive supplier responses ; multi-quotes ; **save project as template + create from template** ; mood-board AI vision ; AddToProject modal |
| **Données visibles** | Architect projects (zones+products) ; quotes par projet ; supplier calls + responses ; reward tier "coming soon" preview ; messages |
| **Données modifiables** | Project status, description, address, deadline, constraints (inline edit `ArchitectProjectDetail` l 750-768) ; project zones (add) ; project notes (**local-only**, not persisted, voir A1) ; supplier calls ; quote acceptance |
| **Communications cross-persona** | In-app messages ; supplier call broadcast → multiple partners ; quotes ; **pas d'email lifecycle architect** au-delà du générique |

### Trous identifiés

| # | Gap | Catégorie | Impact | Effort |
|---|---|---|---|---|
| A1 | **Project notes local-only**. `ArchitectSections.tsx:682` initialise `notes` en `useState<ProjectNote[]>([])`, jamais lu/écrit en Supabase. Évaporent au refresh. Hook `useProjectAnnotations` existe pour zones, pas pour project-level notes. | Bloquant | Retention | 1 j |
| A2 | **Tier system décoratif**. `architectTier = "atelier"` hardcodé. `ArchitectRewardsSection` derrière "coming soon" lock. Sidebar montre tier badge + discount reminder pure UI. Contradit CLAUDE.md "no SaaS tier in 2026" — l'UI promet ce qui n'existe pas. | Bloquant (false promise) | Acquisition | 2-4 j (decision : remove vs implement) |
| A3 | **Pro Service Architect Hub mock data**. `ProServicePartnerHub.tsx:22 const myId = "pro-001"` + utilise `proServiceMockData.ts`. 1 265 lignes de demo qui ne touchent PAS les vraies tables `pro_service_*` (4 tables existent per CLAUDE.md). | **Bloquant** | Conversion (Pro Service = USP architect) | >5 j |
| A4 | **Pas de client-portal sharing**. Architect crée projet pour client mais aucun lien pour inviter le client à voir le statut live. Shared boards ne partagent que le mood-board. | Friction | Retention | 1-2 j |
| A5 | Quotes section groupe par `${q.projectName} — ${q.clientName}` string (`ArchitectSections.tsx:1528`) au lieu de `project_request_id`. Collisions possibles. | Expérience | — | 0.5 j |
| A6 | **Architect ne peut pas upload livrables** (PDF specs, plans CAD). MaterialBoardView accepte images uniquement. | Expérience | Retention | 1-2 j |
| A7 | **Supplier calls UI fonctionnelle, mais aucun inbox partner pour répondre**. `partner-dashboard/PartnerProLeadsSection` lit pro_service_* mock, pas `supplier_calls`. Architect émet dans le vide sauf relai admin manuel. | **Bloquant** | Acquisition (architect↔partner) | 2-4 j |
| A8 | Pas de view analytics architect (project stats, spend per supplier). Partner a `PartnerAnalyticsDashboard`, architect n'a rien. | Expérience | Retention | 1-2 j |
| A9 | **Product preview drawer in-project read-only** (`ProductPreviewDrawer` 248 l). Pas de "request quote on product directly into project context" — architect doit sortir, naviguer, ouvrir QuoteRequestModal client-targeted. | Friction | Conversion | 1 j |

**Verdict architect** : tooling beaucoup plus mince qu'il n'y paraît au premier coup d'œil. ~50% est mock data (Pro Service), ~20% est décoratif (tiers, rewards), 30% restant est fonctionnel (projects, zones, boards, quotes) mais isolé. La déconnexion supplier-call ↔ partner-leads (A7) et le mock Pro Service (A3) sont **existentiels** : la USP architect est "we route you qualified projects" et c'est actuellement de la démo.

---

## 3. Persona — PARTNER (fabricant / fournisseur / marque)

### Inventaire

**Routes** : `/partners`, `/become-partner` (`BecomePartner.tsx` 788 l), `/partners/:slug`, `/brands/:slug`, `/account` (section partner avec variantes brand/standard/distributor). Account shell forke selon `partnerData.partner_type` × `partner_mode` en 3 nav configs (`NAV_PARTNER_BASE`, `NAV_BRAND_MEMBER`, `NAV_BRAND_NETWORK`) + optionnel `brand-catalogue` pour distributors.

| Item | Detail |
|---|---|
| **Routes / écrans** | BecomePartner (3-step : profile → plan → form) ; partner Account dashboard (10-12 sections selon type/plan) ; public partner page ; public brand page |
| **Actions critiques** | Apply ; complete profile (`PartnerProfileForm` 810 l avec logo/hero/cover, gallery, certifications) ; **wait admin approval** (gating `Account.tsx:600-668`) ; manage catalogue : add/edit products via `AddProductForm` (1 542 l, 6 onglets + 6 specs sections vocab 2026) ; bulk import Excel (1 553 l) ; API connection ; manage variants (`VariantsGrid` 570 l Modèle B) ; product certs ; brand certs ; photo gallery ; respond to quotes (full proposal price/TVA/delay/conditions) ; mark accepted/declined ; arrivals/preorders (`PartnerArrivalsSection` 708 l) ; loyalty program (`PartnerLoyaltyProgram` 475 l) ; brand-only : briefs inbox, collections, references, network mgmt |
| **Données visibles** | Pending quote count badge ; product list (published / pending / drafts tabs) ; submission feedback ; revenue stat (monthly only) ; conversations ; analytics dashboard (647 l) ; loyalty points/tier ; arrivals timeline ; brand : briefs avec qualification score, distributors, references |
| **Données modifiables** | Profile (lock après approval sauf admin demande modif) ; products (admin re-review on edit → "Modification en attente") ; photos ; certifications PDFs ; variants ; arrivals ; quote responses ; collections (brand) |
| **Communications cross-persona** | Receive quote requests ; receive briefs (brand) ; messages clients ; admin notes via `profile_review_notes` ; emails ; partner application notifs routées admins (`BecomePartner:280-298`) |

### Trous identifiés

| # | Gap | Catégorie | Impact | Effort |
|---|---|---|---|---|
| **P1** | **AUCUNE PartnerOrders section**. Partner ne peut pas voir/gérer les commandes générées des devis acceptés. Confirmé par absence de `PartnerOrder*` component, aucune query `orders` côté partner sauf revenue stat read-only. Boucle catalogue→quote→ORDER→delivery cassée pour partner. | **BLOQUANT** | Retention + acquisition | 2-4 j |
| P2 | **`BecomePartner.tsx:15` utilise vieilles catégories** (`["chairs", "armchairs", "barStools", "benches", "diningTables", ...]`). Mismatch avec lowercase-kebab canonical (`bar-stools`, `loungers`). `PartnerProfileForm.tsx:23-26` pire — CamelCase **`["Chairs", "Tables", "Parasols", ...]`**. | Friction | Acquisition (zero matched leads) | 0.5 j |
| P3 | **PartnerProfileForm hardcode `BRAND_CERTIFICATIONS`** (l 34) au lieu d'utiliser table `certifications` que `PartnerCertifications.tsx` (264 l) hit via `usePartnerCertifications`. Deux vérités parallèles. | Friction | — | 1 j |
| P4 | **Aucune notif quote arrival** au-delà du badge sidebar. Pas de browser notif, pas de toast top-banner. Doit check manuellement. | Friction | Conversion (delayed response) | 0.5 j |
| P5 | **AddProductForm n'affiche pas le statut admin re-review inline**. Partner édite un published product, voit "Modification en attente" tag dans la liste, mais inside the form ne voit pas ce qu'admin a demandé. | Friction | Retention | 0.5-1 j |
| P6 | **Featured Products section Elite-gated** (PlanUpgradeGate). Pas de preview de ce qu'on unlock pour Starter/Growth. | Expérience | Conversion (upsell) | 1 j |
| P7 | **Aucun lead routing proactif**. Architect supplier_calls non surfacés à partners ; brand briefs surfacés à brands seulement (`BrandBriefInbox`). Standard manufacturers/resellers ont **zéro inbox leads**. | Bloquant | Acquisition | 2-4 j |
| P8 | **`PartnerProLeadsSection` (350 l) Elite-gated mais lit mock data** (références `proServiceMockData` à confirmer). | Bloquant | Conversion (Elite plan justification) | 2-4 j |
| P9 | **Partner ne peut pas initier conversation client unprompted**. Infrastructure `useConversations` existe, mais ancrée sur quote_request threads — pas de chemin pour message client about news catalogue, restocks. | Expérience | Retention | 1 j |
| P10 | **Pas de bouton "preview public profile"** dans dashboard partner. Doit logout ou incognito. | Expérience | Retention | 0.5 j |
| P11 | **PartnerLoyaltyProgram** (475 l) basé sur `partner_loyalty` + `partner_points_history`. Earning rules wired aux events réels (delivered orders, etc.) ou décoratif ? À auditer. | Expérience (ou bloquant si backend missing) | Retention | TBD |
| P12 | **Brand `BrandReferencesManager` + `BrandCollectionManager` fonctionnels** mais references projets affichés publiquement sur `/brands/:slug` 100% gérés par brand (pas de moderation admin avant publication). Risque image Terrassea. | Friction | Retention | 1-2 j |

**Verdict partner** : persona la plus construite — `AddProductForm` 1 542 l est l'UI la plus lourde du codebase — mais **avec le plus gros trou de la plateforme** (P1, no order management). Onboarding (`BecomePartner` → `PartnerProfileForm` → admin approval → catalogue) solide, gating bien géré. Features Elite (Featured, ProLeads) partiellement mock-data. Brand-mode plus fonctionnel que standard-partner-mode pour lead routing.

---

## 4. Persona — ADMIN (synthèse seulement)

Pas de re-audit. **Référence : `docs/strategy/ADMIN_PANEL_AUDIT.md` (commit 041af30)**.

Le panel admin 24-sections est fonctionnel mais en **retard d'une phase produit** : `Admin.tsx` ProductForm (l 415-989) inline 575 l, déconnecté des avancées partner-side phase 8e (PartnerCertifications, ProductCertifications), variants Modèle B (`VariantsGrid`), 6 specs sections vocab 2026, `environment_urls`. **7 dettes (24-30) trackées**, total 5-9.5 j pour atteindre parité admin/partner — Phase A "quick wins" 1-1.5 j (specs + certifs + lowercase + extract Apps), Phase B "alignement" 2-3 j (VariantsGrid + cert drawer + envs + Storage), Phase C "refonte" 3-5 j (extract `<ProductEditForm>`). Pas de gaps sécurité, juste functional/parity.

**Out of scope cet audit user-tools, mais Session 2 = Dettes 25/27/29 = subset Phase B.**

---

## 5. Watchpoints transverses

### (a) Client journey integrity
Discovery → brief → quote → order → tracking : chain hold end-to-end avec une exception : la **e-signature canvas (C3) est un stub**. Du point de vue confiance B2B, c'est un risque contractuel si un devis signé aujourd'hui est challengé.

### (b) Partner onboarding friction
Signup → premier produit publié bien shapé. Real bottleneck = **admin approval gate** (`Account.tsx:600-668`). Si admin ne review pas dans 48-72h (promesse BecomePartner), partner voit écran jaune "pending" sans signal de progression. **Pas de SLA timer, pas de reminder "still under review"**.

### (c) Architect value differentiation
USP annoncée : "concept generation + Pro Service + tier rewards". Concept generation (`engines/projectEngine.ts`) réel. Pro Service mock-data (A3). Tiers décoratifs (A2, C2). Net : architect est actuellement un free-tier client + outil notes/zones. Acceptable per strategy doc 2026 mais **l'UI overpromet**.

### (d) Onboarding, email, in-app vs email, search, mobile, analytics

- **First-login → first action** : Account dashboard a bons empty-states avec primary CTAs ✓
- **Email lifecycle** : 4 edge functions dédiées mais pas d'audit-trail des events triggers. À vérifier en backlog
- **In-app vs email** : `NotificationBell` (193 l) + `send-notification-email` ; RPC `create_quote_notification_to_admins` Session 2B.1. Coverage client/admin ✓ ; partner↔client patchy (P4)
- **Search** : `SmartSearch` + `intentDetector.ts` strongest discovery feature ✓
- **Mobile** : Account sidebar disparaît mobile (C10). Header drawer mobile OK. Partner forms (especially AddProductForm 1 542 l) denses non optimisés narrow screens
- **Analytics** : partner a dashboard, architect & client n'ont rien

### (e) Cross-persona communication coherence
Pattern Session 2B.1 RPC est correct. Devrait être étendu partner-side (quote replied, order shipped). Currently partner actions ne notifient pas admins via RPC, juste via DB row changes implicites.

---

## 6. Top 10 priorisé (matrice)

```
                    Effort faible (≤1 j)                         Effort élevé (>1 j)
                    ┌──────────────────────────────┐    ┌────────────────────────────────┐
Impact élevé        │  QUICK WINS (1-5)            │    │  CHANTIERS (6-9)               │
                    │  ────────────                │    │  ──────────                    │
                    │  1. Lowercase categories     │    │  6. PartnerOrders section ★    │
                    │     (P2, 0.5 j)              │    │     (P1, 2-4 j)                │
                    │  2. Profile edit client      │    │  7. Pro Service real wiring    │
                    │     (C1, 0.5 j)              │    │     (A3, A7, P7, P8, >5 j)     │
                    │  3. Notif quote arrival      │    │  8. Architect notes persisted  │
                    │     (P4, 0.5 j)              │    │     + tier decision (A1+A2)    │
                    │  4. Public profile preview   │    │  9. Signature canvas real      │
                    │     (P10, 0.5 j)             │    │     (C3, 2-4 j)                │
                    │  5. Tracking copy/deeplink   │    │                                │
                    │     (C4, 0.5 j)              │    │                                │
                    └──────────────────────────────┘    └────────────────────────────────┘
                    ┌──────────────────────────────┐    ┌────────────────────────────────┐
Impact faible       │  NICE TO HAVE (10)           │    │  À ÉVITER                      │
                    │  10. Cert dictionnary unified│    │  (rien identifié                │
                    │      (P3, 1 j)               │    │   à différer absolument)       │
                    └──────────────────────────────┘    └────────────────────────────────┘
```

### Top 10 ranked

| Rank | Gap | Persona | File | Effort | Impact |
|---|---|---|---|---|---|
| 1 | Lowercase-kebab categories BecomePartner + PartnerProfileForm | Partner | `pages/BecomePartner.tsx:15`, `partner-dashboard/PartnerProfileForm.tsx:23-26` | 0.5 j | Acquisition |
| 2 | Client profile editable settings | Client | `client-dashboard/ClientSections.tsx::ClientSettingsSection` | 0.5 j | Retention |
| 3 | In-app banner/toast on new quote arrival partner | Partner | `pages/Account.tsx` + `usePartnerQuotes` | 0.5 j | Conversion |
| 4 | "Preview public profile" partner sidebar | Partner | `pages/Account.tsx:944-988` | 0.5 j | Retention |
| 5 | Tracking number copy + carrier deep-link client | Client | `client-dashboard/ClientOrdersSection.tsx` | 0.5 j | Retention |
| 6 | **★ PartnerOrders section** (close catalogue→quote→ORDER→delivery loop) | Partner | new `partner-dashboard/PartnerOrdersSection.tsx` + nav `Account.tsx::NAV_PARTNER_BASE` | 2-4 j | Retention + acquisition |
| 7 | Pro Service real wiring (architect + partner pro-leads + supplier-calls bridge) | Architect + Partner | `pro-service/*Hub.tsx`, `partner-dashboard/PartnerProLeadsSection.tsx`, `useSupplierCalls`, `pro_service_*` tables | >5 j | Acquisition (architect USP) |
| 8 | Architect notes persistence + tier decision | Architect | `architect-dashboard/ArchitectSections.tsx:682` + `pages/Account.tsx:417` | 2-4 j | Acquisition (truth in UI) |
| 9 | Signature canvas réel + DocuSign-style flow | Client | `client-dashboard/ClientSections.tsx::SignatureModal:1463-1513` | 2-4 j | Conversion + legal |
| 10 | Brand certifications dictionnary unification | Partner | `partner-dashboard/PartnerProfileForm.tsx:34` ↔ `partner-dashboard/PartnerCertifications.tsx` | 1 j | Data consistency |

---

## 7. Recommandation roadmap

### Session 2 admin (Dettes 25, 27, 29) — pertinence ?

**Trancher : NON pas en l'état. Réordonner.**

L'audit admin Phase B (Dettes 25/27/29 = certifs admin + VariantsGrid admin + Storage admin) est sain *structurellement* mais son impact sur acquisition/conversion/retention est **minimal en 2026**. Ces dettes fixent surtout la parité admin pour modérer les soumissions partner — valeur interne, pas user-visible. Pendant ce temps l'audit user-tools identifie **au moins 3 quick wins (≤0.5 j chacun, total 1.5 j) qui débloquent directement partner & client UX** (P2, C1, P4) et **un chantier équivalent à Session 2 (P1 PartnerOrders, 2-4 j) qui est actuellement une promesse cassée pour les partners payants**.

### Re-ordering proposé

**Insert avant Session 2 — "Quick Wins Sprint" (1.5-2 j)**
- QW1 : P2 (lowercase categories partner-side) — 0.5 j
- QW2 : C1 (client profile edit) — 0.5 j
- QW3 : P4 (partner quote arrival notification) — 0.5 j

**Puis "Session 2-bis" remplace Session 2 admin : P1 PartnerOrders (2-4 j)**
- Nouvelle section dans partner dashboard, list orders, status timeline, mark shipped, upload tracking number → mirror `ClientOrdersSection` côté partner. Réutilise `orders` table déjà populated par `auto-workflow` edge function. Ferme la boucle catalogue→quote→order→delivery côté partner.

**Puis Session 3 = Session 2 admin originale (Dettes 25/27/29 Phase B subset, 1-1.5 j)**
- Une fois le user-facing critical gap fermé, refaire le travail de parité admin.

**Defer Q3 2026 (chantiers >5 j)** :
- Pro Service real wiring (A3 + A7 + P7 + P8) — dépend d'une décision stratégique : keep architect tier promise alive in 2026 ou align UI to "no SaaS" reality
- Architect notes persistence + tier decision (A1 + A2) — même prérequis
- Signature canvas réel (C3) — legal review needed

### Top 3 quick wins à insérer immédiatement

1. **P2 — Categories lowercase-kebab partner-side** (0.5 j) — débloque correct lead matching pour nouveaux partners
2. **C1 — Client profile editable settings** (0.5 j) — supprime un irritant 100% des clients B2B
3. **P4 — Partner new-quote toast/banner** (0.5 j) — direct conversion lift

### Major future chantiers identifiés

- **Σ1 — Partner orders loop** : 2-4 j, immédiate post-quick-wins, ferme le plus gros trou visible plateforme
- **Σ2 — Pro Service real wiring** : >5 j, Q3 2026, requires architect-positioning strategy
- **Σ3 — Architect dashboard veracity** : 2-4 j, Q3 2026, paired with Σ2
- **Σ4 — Real e-signature flow** : 2-4 j + vendor decision, Q3 2026
- **Σ5 — Cross-persona notification standard** : 1-2 j, extend Session 2B.1 RPC pattern partner→admin et partner→client transactional events
- **Σ6 — Mobile dashboard responsiveness** : 1-2 j, unify Account/AddProductForm narrow viewports
- **Σ7 — Reviews-after-delivery loop** : 1-2 j, leverage existing edge function

---

## 8. Synthèse

La persona **partner est la plus construite (35+ composants, 22k+ lignes)** et ironiquement **a le plus gros trou** : pas de gestion commandes. La persona **client est la plus cohérente end-to-end** avec un stub (signature). La persona **architect overpromet et underdelivers** : ~50% de la surface architect-facing est mock data ou tier UI hardcodé.

Session 2 admin (Dettes 25/27/29) est dette structurelle correcte mais a **impact business strictement inférieur** au re-ordering proposé. Les 3 quick wins (1.5-2 j total) + le chantier PartnerOrders (2-4 j) délivrent valeur visible pour acquisition (P2), retention (C1), conversion (P4) et crédibilité plateforme (Σ1) avant de revenir à la parité admin.

**Recommandation finale** : **GO Quick Wins Sprint + GO Chantier Σ1 PartnerOrders, defer Session 2 admin de ~1 semaine**.

---

**Audit lecture-seule, 2026-05-06.** Document vivant — sera enrichi au fur et à mesure des observations.
