# Audit parcours utilisateur — Persona USINE / FABRICANT (partner manufacturer)

**Date** : 2026-07-29 · Base : lecture code + docs stratégiques + état prod live (Supabase `gwgcfgeouropcighpztj`)

**État prod vérifié ce jour** : `pricing_visibility_mode = 'launch'` · 2 partners actifs, **0 manufacturer**, **0 partner_applications**, 53 produits (52 publiés), 5 quote_requests, **0 orders**, **0 lignes partner_analytics**, 0 pro_service_matches. Le parcours usine n'a **jamais été joué en production**.

---

## Synthèse (8 lignes)

La plomberie partner est la plus riche de la plateforme (35+ composants, devis→réponse structurée→commande→tracking en RPC sécurisées, import Excel multilingue, certifications, CGV, Founding Program). Mais pour le persona précis de la mission — **une usine italienne ou espagnole qui signe demain** — le parcours est **cassé dès la porte d'entrée** : en mode `launch` (actif en prod), l'unique chemin d'inscription est `/auth?type=partner`, qui exige un **SIREN français à 9 chiffres validé contre l'API SIRENE française** (`recherche-entreprises.api.gouv.fr`). Une usine italienne (P.IVA 11 chiffres) ou espagnole (CIF alphanumérique) **ne peut pas créer de compte**. Derrière cette porte, le dashboard mélange français hardcodé et i18n, affiche une commission statique de plan qui contredit le taux launch réel (5 %), ne capture **ni MOQ ni prix dégressifs** (le cœur du métier d'une usine), n'a **aucun pipeline d'analytics** (table `partner_analytics` : 0 writer), et l'URL de webhook stock-sync affichée en prod est fausse (404). Verdict : **partiellement utilisable seulement**, et pas par une usine non-française sans intervention manuelle du founder.

---

## Forces

- **Boucle devis complète et sécurisée** : `PartnerQuotesSection` (réponse structurée prix/TVA/délai/conditions/PDF) via RPC `update_quote_as_partner` (whitelist colonnes, durcie red-team H4) ; anonymisation client avant signature (bon design B2B). `usePartnerQuotes.ts`.
- **Boucle commandes réelle** (Dette 33 fixée) : `PartnerOrdersSection` + RPC `update_order_as_partner` (workflow strict deposit→production→shipped→delivered, tracking obligatoire, audit `order_events`).
- **Emails serveur-side fiables** : triggers DB Lot A/B (Dette 59) — nouveau devis assigné → email partner ; statut replied → email client. Plus de 401 silencieux.
- **Import Excel excellent pour une usine** : `ExcelImportModal` — chemin déterministe avec alias de colonnes **FR/EN/IT/ES** (`colAliases`, lignes 325-384) + fallback IA `analyze-csv-products`. C'est l'outil le plus adapté au persona.
- **Profil validé par workflow robuste** (5 états, notes admin, gate produits), certifications 3 niveaux (marque/produit) sur vraies tables, section CGV réelle, compression images à l'upload.
- **VariantsGrid Modèle B** : SKU/dimensions/tissu/couleur/finition/prix/stock avec référentiels DB + validation zod par ligne.
- **Founding Program réel** (score, tiers, badges DB) — bonne réponse "année acquisition" au lieu de plans payants prématurés.
- Limite produits par plan appliquée avec overrides `partner_subscriptions` (`PartnerCatalogueSection.tsx:154`).

---

## Faiblesses / problèmes détectés

### CRITIQUE

1. **SIREN français obligatoire au signup partner — usine IT/ES hard-bloquée.** `src/pages/Auth.tsx:100-102` exige `siren` non vide ; `:113-119` rejette si `length !== 9` ou `sirenValid === false` ; `validateSiren` (`:76-93`) interroge **`recherche-entreprises.api.gouv.fr`** (registre français uniquement). Une P.IVA italienne (11 chiffres) ou un CIF espagnol échoue mécaniquement. Et comme le mode prod est `launch`, `/become-partner` rend `BecomePartnerLaunch` dont **l'unique CTA est `/auth?mode=register&type=partner`** (`BecomePartnerLaunch.tsx:96,401`) : il n'existe **aucun chemin d'inscription possible** pour les 2 usines qui rappellent en ce moment (hors invitation admin manuelle). Non documenté dans aucune dette — la Dette 53 parle de la confusion des 2 entry-points, pas de ce blocage. **C'est LE point de décrochage n°1 du persona.**

2. **Commission affichée ≠ commission réelle en mode launch.** `PartnerQuotesSection.tsx:26,144,158,202-207,273` calcule et affiche la commission via `PLAN_CONFIG[plan].commission` **statique** (8 % starter) alors que le taux effectif launch est 5 % (`platform_settings.launch_commission_rate=5`, vérifié en DB). Le hook correct `useEffectiveCommission` existe et sa docstring dit explicitement « never read a static per-plan config directly » — la section devis (le seul endroit où l'usine voit de l'argent) l'ignore. Idem `PartnerOverview.tsx:320`. Une usine qui répond à son 1er devis voit « comm. 8 % ≈ €X » faux. **Confiance sur l'argent = zéro droit à l'erreur.**

3. **`partner_analytics` : 0 ligne, 0 writer.** Grep exhaustif : seuls des *lecteurs* existent (`usePartnerAnalytics`, `BrandMemberOverview`, `AdminBrandManagement`) ; aucun trigger, aucune edge function, aucun tracking de vues produit n'alimente la table. La section « Performance » (`PartnerAnalyticsDashboard`) affichera **0 vues / 0 % pour toujours**, alors que « analytics » est une feature vendue des plans Growth/Elite et que la question n°1 d'une usine est « est-ce que ça me rapporte de la visibilité ? ». Non documenté comme dette.

### HAUTE

4. **Résolution d'identité partner fragile → risque de doublon silencieux.** `Account.tsx:438-461` résout le partner **uniquement** par `partners.contact_email == profile.email` (pas de fallback `user_id`, contrairement à `usePartnerQuotes.ts:38-62`). Si l'email de login diverge de `contact_email` (marque invitée avec info@, changement d'email), `partnerData=null` → l'auto-create `Account.tsx:505-560` **insère un doublon partners** (vérifié en DB : aucune contrainte unique sur `contact_email` ni `user_id` — seulement pkey + slug). Trois façons différentes de résoudre `partnerId` dans le même dashboard (`Account.tsx`, `PartnerOverview.tsx:198-209`, `usePartnerQuotes.ts`) = incohérences garanties.

5. **Ni MOQ ni prix dégressifs partner-side.** `supplierEngine.ts:323-330` score les offres par `minimum_order`, mais **aucun formulaire** (`AddProductForm`, `ExcelImportModal`, `VariantsGrid`, admin) ne permet de saisir un MOQ ; grep `minimum_order` dans `partner-dashboard/` : 0 résultat. Pas de paliers de prix par quantité (seulement `price_min`/`price_max`). Pour une usine, MOQ + dégressif quantité **sont** le modèle commercial. Le moteur promet un matching MOQ-aware sur une donnée que personne ne peut renseigner.

6. **URL webhook stock-sync fausse en prod.** `ApiConnectionPanel.tsx:220` : `window.location.origin.replace('localhost:5173', '<your-supabase-project>.supabase.co')` — en prod l'origin est `https://terrassea.com`, le replace ne matche pas → l'écran affiche `https://terrassea.com/functions/v1/stock-sync-webhook`, qui tombe dans le rewrite SPA de `vercel.json` (→ index.html). L'ERP de l'usine pousserait son stock dans le vide. `stockSync` est pourtant vendu dès le plan Starter (`BecomePartner.tsx:82`).

7. **Dashboard partner mi-français mi-i18n.** ~50 strings FR hardcodées dans les composants les plus utilisés par une usine : `PartnerQuotesSection.tsx:32-39` (STATUS_MAP « Nouveau/Répondu/Signé »), `:268-341` (labels « Prix total HT », options de conditions de paiement **stockées en français en DB**), disclaimer légal `:338-340` FR only ; `PartnerOrdersSection.tsx:56-77` (STATUS_CONFIG + filtres 100 % FR, dates forcées `fr-FR`) ; `PartnerOverview.tsx:139-150` (« Voir tout », « Aucun message ») ; `PartnerSections.tsx:129` (toast FR). La convention CLAUDE.md tolère le FR-only pour l'admin interne — pas pour l'UI partner. Une usine italienne verra un mélange IT/FR incompréhensible sur ses devis et commandes.

8. **Toasts trompeurs résiduels dans le flux devis** (hors périmètre TOAST_TROMPEUR_AUDIT qui ciblait l'admin) : `PartnerQuotesSection.tsx:70-83` — `toast.success("Proposition envoyée au client !")` tiré immédiatement après `updateStatus(...)` (mutation async, **aucun handler onError** dans `usePartnerQuotes.ts:85-145`) : si la RPC échoue, l'usine croit avoir répondu et perd le deal. `handleDecline` (`:86-89`) affiche « Le client sera notifié » alors que la notification n'est créée **que** pour `status==='replied'` (`usePartnerQuotes.ts:122-140`) — pour `cancelled`, personne n'est notifié : le toast ment.

9. **Stats mock en dur encore présentes** : `PartnerSections.tsx::PartnerPerformanceSection:348-427` — « 1 240 vues, 42 devis, €8 200, 4.8/5, Top 12 % » hardcodés + faux export CSV (`:318-320` : `toast.success("Export CSV en cours de génération...")` qui ne fait rien). Rendu quand `partnerId` est null (`Account.tsx:723,748`) — précisément le cas d'échec de résolution d'identité (#4) : l'usine verrait alors de fausses données présentées comme les siennes.

10. **Aucune réponse à « comment suis-je payé ? »** : aucun champ IBAN partner, aucune UI facturation/règlement/relevé de commission côté partner (grep `iban|payout|invoice` : 0). L'usine signe sans savoir quand ni comment l'argent arrive. Acceptable en année d'acquisition, mais rien ne l'explique dans le produit.

### MOYENNE

11. **Trois vocabulaires de catégories partner divergents** : `BecomePartner.tsx:19-24` (12 slugs élargis), `PartnerProfileForm.tsx:26-29` (10 slugs dont `stools`, `lighting`, `planters`, `screens` **non canoniques** — le canon est `bar-stools`, etc.), canon produits (8). Dette 37 marquée « à fixer » : le lowercase est fait, mais la divergence sémantique persiste → matching leads/catégories approximatif.
12. **Auto-create partner : échec silencieux → spinner infini.** `Account.tsx:539-543` (console.error only) + `:618-625` : si l'INSERT échoue (RLS, réseau), l'usine reste bloquée sur « Setting up your partner space... » sans retry ni message.
13. **Stats par produit du catalogue factices** : `PartnerCatalogueSection.tsx:177-178` — `views: 0, quotes: 0` hardcodés par ligne produit.
14. **Badge « en attente » figé** : `PartnerOverview.tsx:301` — `t('pd.overview.pending', { count: 0 })` avec count hardcodé à 0 alors que `pendingCount` est calculé 60 lignes plus haut.
15. **Flow A (`/become-partner` mode full) : l'approbation d'une candidature ne crée pas de compte auth.users** (gap β de ONBOARDING_PARTNER_AUDIT, jamais tracé en dette numérotée ni fixé — vérifié : seul `trg_auto_create_partner` subsiste, qui crée le row `partners`, pas l'utilisateur). Le candidat approuvé ne peut pas se connecter sans process manuel.
16. **« Commissions payées » = "Coming soon"** pour Elite (`PartnerOverview.tsx:282`) — stat verrouillée qui, débloquée, n'affiche rien.
17. **Alias Excel des 27 colonnes specs incomplets** (parasol/lounger partiels, rien pour extension_capability, fabric_certification, modules…) — déjà noté « à surveiller » dans ONBOARDING_PARTNER_AUDIT §« Reste », toujours vrai.

### BASSE

18. `Header.tsx` : aucun lien « Devenir partenaire » (footer uniquement) — découverte du parcours affaiblie.
19. `PartnerProLeadsSection` désormais branché sur vraies tables `pro_service_matches`… qui contiennent 0 lignes (amont Pro Service toujours mock — Dette 35 documentée, pas re-signalée ; mais la justification du plan Elite reste vide).
20. Options TVA (`0/5.5/10/20 %`) et conditions de paiement franco-françaises dans la réponse devis — une usine espagnole facture à 21 %.

---

## Risques

- **Perte des 2 usines chaudes** : le blocage SIREN transforme un « oui » commercial en échec technique au premier clic. Risque réputationnel maximal (« ils n'ont même pas prévu les entreprises italiennes »).
- **Premier devis réel = premier mensonge** : commission affichée fausse (#2) + toast success sans vérification d'erreur (#8) sur le flux le plus sensible.
- **Doublon partner silencieux** (#4) : dès qu'un email diverge, données scindées entre deux rows — pattern déjà vu 3× sur les drifts migrations, ici côté données métier.
- **Boucle orders jamais éprouvée** : 0 commande en prod, transitions RPC testées seulement à vide (noté dans Dette 33 elle-même) — le premier ordre réel d'une usine sera le test d'intégration.
- **Promesses invérifiables** : analytics à 0 pour toujours (#3), leads Elite vides, « stock sync » avec URL cassée — l'usine qui explore son dashboard conclut « coquille vide » alors que devis/commandes/import sont réels.
- **Dettes 49/50/51 (welcome modal, checklist, emails onboarding) toujours non livrées** (vérifié : aucun composant dans le code) : documentées, mais leur criticité est **sous-estimée** maintenant que de vraies usines arrivent — le premier login reste un dashboard de zéros sans orientation.

---

## Opportunités / améliorations proposées

| # | Amélioration | Effort | Impact |
|---|---|---|---|
| 1 | **Identifiant entreprise européen** : remplacer le gate SIREN par SIREN *ou* n° TVA intracommunautaire (validation VIES, format par pays, fallback « vérification manuelle sous 24h » si API down) dans `Auth.tsx` + `QuoteRequestModal`/`ProjectBriefModal` | 1 j | Débloque l'acquisition IT/ES — précondition absolue du persona |
| 2 | **Unifier la résolution partnerId** : hook unique `usePartnerIdentity` (user_id d'abord, contact_email fallback), contrainte DB `UNIQUE (user_id)` partielle, garde anti-doublon dans l'auto-create + écran d'erreur avec retry | 1 j | Supprime le doublon silencieux + le spinner infini |
| 3 | **Vérité commission** : brancher `useEffectiveCommission` dans PartnerQuotesSection/PartnerOverview ; onError sur `updateStatus` + toasts conditionnels ; corriger le toast decline | 0.5 j | Confiance transactionnelle |
| 4 | **MOQ + prix dégressifs** : colonnes `minimum_order` + `quantity_price_tiers jsonb` exposées dans AddProductForm/ExcelImportModal/VariantsGrid, affichées côté client, consommées par supplierEngine (déjà prêt) | 2-3 j | LA feature différenciante pour une usine — aligne le produit sur le métier réel (principe n°1 de PRODUCT_PHILOSOPHY) |
| 5 | **Pipeline analytics minimal** : trigger/edge léger qui agrège vues produit (event insert-only type `concept_events`) + devis + commandes vers `partner_analytics` en daily rollup | 1.5-2 j | Rend la section Performance vraie ; argument de rétention n°1 |
| 6 | **i18n sweep partner-dashboard** : extraire les ~50 strings FR vers les 4 locales ; stocker les conditions de paiement en clés, pas en français ; TVA par pays | 1-1.5 j | Dashboard digne pour usine IT/ES |
| 7 | Corriger l'URL webhook stock-sync (constante `VITE_SUPABASE_URL`) + README partner | 0.25 j | Évite une intégration ERP dans le vide |
| 8 | Onboarding Tier 1 (dettes 49/50/51 déjà spécifiées) : welcome modal + checklist 5 étapes + 2 emails | 2 j | Activation des signups launch |
| 9 | Supprimer/neutraliser `PartnerPerformanceSection` mock + faux export CSV | 0.25 j | Élimine le dernier « mensonge » visible |
| 10 | Page « Comment ça marche pour les fabricants » (commission launch 5 %, paiement, SLA review) accessible en mode launch | 0.5 j | Répond aux questions que posent les usines au téléphone |

---

## Top 5 recommandations priorisées

1. **URGENT (avant le rappel des 2 usines)** : gate d'inscription européen — SIREN *ou* TVA intra (VIES) avec fallback manuel. Sans ça, tout le reste est théorique. *(1 j)*
2. **Vérité sur l'argent** : commission effective partout + onError sur la réponse devis + toast decline honnête. *(0.5 j)*
3. **Identité partner unifiée + garde anti-doublon** avant tout signup réel. *(1 j)*
4. **MOQ / prix dégressifs** — la feature qui ferait signer une usine, car elle prouve que la plateforme comprend son métier. *(2-3 j)*
5. **i18n partner dashboard + fix webhook stock-sync + retrait des mocks Performance** — le « polish de dignité » cumulé. *(2 j)*

---

## Verdict — « Une usine peut-elle utiliser la plateforme en production AUJOURD'HUI de bout en bout ? »

**NON pour une usine italienne ou espagnole ; PARTIELLEMENT pour une usine française.**

- **Usine non-française : bloquée à l'étape 1** (signup impossible sans SIREN français, seul chemin actif en mode launch). Seul contournement : création manuelle par l'admin (flow `invite-brand-partner`, pensé pour les marques).
- **Usine française** : signup ✅ → profil ✅ (workflow validation solide) → produits ✅ (formulaire riche + import Excel réellement bon) → réception/réponse devis ✅ (mais commission affichée fausse et toasts non fiables) → commandes ⚠️ (UI réelle, jamais éprouvée, 0 order en prod) → paiement/payout ❌ (aucune visibilité) → stats ❌ (pipeline analytics inexistant) → stock sync ❌ (URL cassée) → fidélisation ⚠️ (Founding réel, mais leads Elite vides et pas d'onboarding guidé).
- **Ce qui la ferait signer** : l'import Excel multilingue, la réponse devis structurée avec PDF, et le Founding Program. **Ce qui la ferait fuir** : le blocage SIREN, le dashboard mi-français, les zéros partout sans explication, et la première incohérence sur un montant de commission.

**Top 5 pour CE persona** : (1) gate TVA européenne, (2) MOQ/dégressifs, (3) commission véridique + erreurs visibles sur devis, (4) i18n dashboard IT/ES, (5) analytics réelles (vues produit) — dans cet ordre.

*Non re-signalés car déjà documentés : dettes 49/50/51 (onboarding Tier 1, statut « à fixer » confirmé), 53 (double entry-point — de facto neutralisée par le mode launch), 42 (BRAND_SPECIALTIES/CERTIFICATIONS FR), 35 (Pro Service mock amont), 46/47 (drift brand-distributor), backlog §6 (prompts edge functions catégories), gap β (auth.users post-approbation, ici requalifié MOYENNE car toujours ouvert). Dette 52 vérifiée FIXÉE en DB (1 seul trigger restant sur partner_applications).*