## Synthèse

Le parcours MARQUE (brand_member 799€ / brand_network 1 299€) et DISTRIBUTEUR est le segment le plus ambitieux de Terrassea — et le plus fracturé entre promesse et réalité. La **vitrine publique** (`/collections`, `/brands/:slug`) est d'un niveau éditorial réellement premium et crédible face à une Fermob ou une Pedrali. Le **back-office**, lui, est largement inopérant : vérification faite en prod (2026-07-30), la migration `20260329100000` n'est **toujours pas appliquée** (Dette 46), et son rayon d'impact est **plus large que ce que documente Dette 47** — la gestion des distributeurs est cassée côté marque ET côté admin, l'héritage d'offres brand→distributor n'existe pas, et les stats réseau échouent en 400 silencieux. En prod : **1 seule marque (Isimar)**, sans compte utilisateur, 0 offre, 0 brief jamais reçu, 0 ligne d'analytics. Le funnel de briefs — la raison d'être des 799€ — est mort sur la seule page marque en production (CTA no-op + fallback mailto qui fait fuir le lead hors plateforme). Aucun billing récurrent Stripe n'existe pour ces plans. Verdict détaillé en fin de rapport : **non** pour brand_network, **partiellement** (vitrine seulement) pour brand_member.

## Forces

- **Vitrine marque exceptionnelle** : `BrandPage.tsx` (hero premium, chiffres clés, storytelling savoir-faire, vidéo, références projets avec produits liés, collections en "takeover" éditorial inspiré isimar.es, CGV signées via `get-signed-cgv-url`, catalogues PDF lead-gated). `Collections.tsx` avec strates "Maisons signature / Manufactures partenaires", recherche, skeletons. C'est le niveau attendu par une marque premium.
- **Onboarding admin→marque soigné** : edge function `invite-brand-partner` (idempotente, email brandé via `send-notification-email`, reset-password flow, création `brand_users` owner, gestion des cas legacy auth) — un des meilleurs morceaux du codebase.
- **BrandBriefInbox bien conçu** : coordonnées acheteur masquées jusqu'à acceptation (mécanique marketplace correcte), score de qualification, empty-state pédagogique en 4 étapes.
- **Modèle de données sérieux** : `brand_users` avec rôles owner/editor/viewer + helpers RLS, `brand_features` (feature flags par marque dans AdminBrandManagement), `brand_collections` enrichies (designer, année, ambiances), routage géographique pensé (codes ISO cohérents entre `ProjectBriefModal` et `brand_distributors`).
- **Cohérence "on request"** : `pricing_mode = on_request` respecté partout (BrandPage sans prix, `VendorOffers.tsx:194,292` affiche le vrai nom de la marque et masque les prix) — conforme au positionnement des marques premium.
- **Routage quote fonctionnel dans son socle** : `auto-workflow` route les devis produits brand_network vers le distributeur territorial (colonnes de base de `brand_distributors` présentes en prod, trigger de routage brief actif).

## Faiblesses / problèmes détectés

**CRITIQUE — Dette 46 : rayon d'impact sous-estimé, vérifié en prod (2 mois après la doc, toujours rien d'appliqué).** Les colonnes `brand_distributors.{allow_price_override, commission_override, revenue_share_brand, revenue_share_distributor, collections}`, `product_offers.source_offer_id` et `project_briefs.is_auto_routed` **n'existent pas en prod** (vérifié via information_schema). Dette 47 ne documente que 4 callsites `source_offer_id` ; il y en a en réalité au moins **7 de plus, non documentés** :
- `BrandNetworkDashboard.tsx:80` — le SELECT de la liste des distributeurs inclut les 5 colonnes manquantes → **la liste des distributeurs est toujours vide** pour une marque à 1 299€.
- `BrandNetworkDashboard.tsx:157-163` — l'INSERT d'ajout de distributeur passe `collections` → **impossible d'ajouter un distributeur depuis l'UI**.
- `AdminBrandManagement.tsx:386-388` — même SELECT côté admin → **l'admin non plus ne voit pas les distributeurs**.
- `AdminBrandManagement.tsx:94-102` (DistributorCommissionEditor) — UPDATE sur commission_override / revenue_share → échec systématique.
- `BrandCatalogueSection.tsx:63` — SELECT `allow_price_override` → le catalogue hérité côté distributeur échoue avant même le callsite `source_offer_id` documenté (ligne 92-94).
- `BrandNetworkOverview.tsx:42` — SELECT `is_auto_routed` sur project_briefs → **toutes les stats de leads de l'overview brand_network sont en 400**.
Conséquence nette : le plan à 1 299€ ne peut pas créer la relation marque↔distributeur, ni la voir, ni la piloter. La seule voie est du SQL manuel.

**CRITIQUE — Funnel brief mort sur la page marque en production.** `BrandPage.tsx:856-860` : le CTA "Soumettre un brief pour cette collection" fait `setBriefOffer({ collection_name } as any)` sans produit ; la garde ligne 866 (`briefOffer && briefProduct && ...`) exige un produit → **le clic ne fait strictement rien** (no-op silencieux). Comme Isimar a 0 offre active, `handleContactCta` (ligne 122-126) bascule sur `mailto:` → le lead qualifié part **hors plateforme, sans tracking, sans brief, sans score**. Le "qualified brief inbox" facturé 799€ ne peut recevoir aucun brief aujourd'hui (0 brief en base, jamais).

**CRITIQUE — Aucune notification email de brief à la marque.** `ProjectBriefModal.tsx:208-218` : seule une notification in-app **aux admins** est créée (via SELECT `user_profiles` côté client anon, discutable en soi). La marque n'est ni notifiée in-app ni par email. Combiné au fait qu'**Isimar n'a pas de compte utilisateur** (`partners.user_id` null, 0 `brand_users`), un brief soumis ne serait vu par personne côté marque.

**CRITIQUE — Drift prod/repo supplémentaire non documenté sur le routage des briefs.** La fonction en prod est `auto_route_brief_to_distributor` (teste `partner_mode`, pas de `is_auto_routed`, BEFORE-style) alors que le repo versionne `auto_route_brief` (`20260329000000`, teste `plan`, écrit `is_auto_routed`). Le repo n'est **pas** source de vérité sur cette fonction — violation directe du principe "Drift prevention strict" de PRODUCT_PHILOSOPHY.md, et 4e incident de drift non recensé.

**HAUTE — Analytics "avancés" promis, vides à jamais.** `partner_analytics` : **0 ligne en prod et aucun writer** (aucune edge function n'y écrit ; seules 2 migrations d'index la référencent). `PartnerAnalyticsDashboard` → zéros permanents ; `BrandMemberOverview.tsx:53-65` (vues page) → 0. Pire : le fallback `PartnerPerformanceSection` (`PartnerSections.tsx:349-352, 377-386, 407-410`) affiche des **stats hardcodées fictives** ("1 240 vues", "€8 200 confirmés", "4.8/5", "Top 12%"). Une marque premium qui détecte des chiffres inventés ne revient pas.

**HAUTE — Promesses UI sans implémentation.** `usePartnerAnalytics.ts:96-125` (TIER_CONFIG) promet pour 799/1299€ : searchPriority "maximum" (aucune trace dans le ranking produits), multi-users 3-5 sièges (aucune UI self-serve `brand_users`), social posts 4-6/mois, market report mensuel, pro leads "exclusive_48h", API temps réel. `BecomePartner.tsx:139-174` promet "account manager", "co-marketing", "API sync". Le décalage promesse/produit est le principal risque de churn J+30.

**HAUTE — Triple représentation des "collections", incohérente.** (1) `product_offers.collection_name` (texte), (2) table `brand_collections`, (3) `products.collection_id`. `BrandNetworkDashboard.tsx:106-118`, `BrandMemberOverview.tsx:36-49` et `brand_distributors.collections` raisonnent sur (1) ; `BrandPage`/`BrandCollectionManager` sur (2)+(3). En prod : 6 collections dans `brand_collections`, **0 offre avec collection_name, 0 produit avec collection_id** → les modals collections d'Isimar n'affichent aucun produit, l'assignation de collections aux distributeurs ne proposerait rien, et la page Isimar affiche "**0 Produits**" dans ses chiffres clés (`BrandPage.tsx:416-419`) — très mauvais signal public pour une "Maison signature".

**HAUTE — Aucun billing récurrent.** `stripe-checkout` ne gère que `mode: "payment"` (acomptes/soldes de commandes). Aucune souscription Stripe 799/1299€ ; `AdminSubscriptions.tsx:91-92` calcule un MRR théorique en dur côté client. La facturation des plans est entièrement hors système.

**MOYENNE** :
- `BrandCollectionManager.tsx:~123` : produits "liables" cherchés via `products.partner_id` alors que le Modèle B porte l'ownership sur `owner_brand_id` (53 produits prod avec owner_brand_id) — une marque Modèle B ne pourrait pas rattacher ses produits à ses collections.
- `auto-workflow/index.ts:118-130` : si aucun distributeur ne couvre le pays, le devis d'un produit brand_network **retombe sur "l'offre la moins chère"** → perte de contrôle de distribution, inacceptable pour une marque sélective. (+ résidu plan `elite_pro` ligne 201.)
- `BrandPage.tsx:638` : `urlForProduct(p, p.owner_brand_slug)` sur des produits sélectionnés sans `owner_brand_slug` (toujours undefined) ; `:1032` : `<a href="/products/:id">` (full reload, route non canonique).
- `BecomePartner.tsx:277` : `distributedBrands` et `coverageZone` du distributeur concaténés dans un champ texte `message` — perte de données structurées pour le matching marque↔distributeur.
- Métriques incohérentes : `BrandMemberOverview.tsx:106-107` affiche un taux de **qualification** sous le label "conversion rate" ; `BrandNetworkDashboard.tsx:242` calcule autre chose sous le même label.
- `Collections.tsx:121-126` : N+1 (1 requête par marque) — inoffensif à 1 marque, pénalisant à 30.
- `DETTE_TECHNIQUE_AUDIT.md:2084` (400 sur filter plan brand) toujours ouvert.

**BASSE** : i18n fallback FR hardcodé sur de nombreuses strings brand (sections "Projets réalisés", "Découvrir la marque" non traduites) ; `handleExportCSV` = toast factice (`PartnerSections.tsx:318-320`).

## Risques

1. **Risque réputationnel majeur au premier onboarding réel** : une marque payant 799€ découvrirait dès la première session un dashboard aux stats fausses/vides et des boutons morts. En B2B vertical, ce bouche-à-oreille est fatal — le secteur CHR outdoor européen est petit.
2. **Perte de leads irréversible** : le fallback `mailto:` court-circuite briefs, scoring et tracking. Terrassea ne peut même pas prouver la valeur qu'elle génère (or c'est l'argument de vente n°1 en année d'acquisition).
3. **Dette 46 devient un piège au pire moment** : le premier brand_network signé déclenchera une réparation d'urgence sur une migration de 15 mois d'âge, jamais testée, avec triggers SECURITY DEFINER de propagation d'offres — exactement le scénario "silent breaking change" que CLAUDE.md interdit.
4. **Fallback "cheapest offer"** sur les produits brand_network : un devis peut être attribué à un revendeur non agréé par la marque → rupture de contrat de distribution potentielle.
5. **Drift récurrent** (4 incidents dont 1 non documenté découvert ici) : la confiance dans `supabase/migrations/` comme source de vérité est déjà entamée sur tout le périmètre brand.
6. **Zéro brief + zéro analytics = zéro preuve de ROI** au moment du renouvellement des contrats 12 mois.

## Opportunités / améliorations proposées

| # | Amélioration | Effort | Impact |
|---|---|---|---|
| 1 | **Trancher Dette 46 en Option A "réconciliée"** : ré-écrire la migration en partant de l'état prod réel (incl. remplacement propre de `auto_route_brief_to_distributor`), l'appliquer, smoke-tester l'héritage d'offres avec un brand de test | 2-3 j | Débloque 100 % du plan 1 299€ + catalogue distributeur |
| 2 | **Réparer le funnel brief** : permettre un brief au niveau collection/marque sans produit (le modal l'accepte presque déjà), supprimer le fallback mailto, notifier la marque par email via `send-notification-email` + notification in-app | 1 j | La feature cœur des 799€ devient réelle |
| 3 | **Activer le compte Isimar** via `invite-brand-partner` (la fonction existe et est prête) + créer 5-10 offres/produits liés aux 6 collections | 0.5 j + contenu | La seule marque prod devient une démo vivante de bout en bout |
| 4 | **Unifier les collections** sur `brand_collections` + `products.collection_id` ; migrer les usages de `collection_name` (network dashboard, overview, brand_distributors.collections → FK array d'ids) | 2 j | Supprime une classe entière d'incohérences |
| 5 | **Analytics réels** : job dans `run-scheduled-tasks` qui agrège product_views/quotes/briefs par partner_id dans `partner_analytics` ; supprimer les stats hardcodées de `PartnerPerformanceSection` | 1-2 j | Crédibilité + preuve de ROI pour le renouvellement |
| 6 | Billing Stripe subscriptions (mode subscription, webhooks d'échéance) pour 799/1299 | 2 j | Professionnalise la relation commerciale |
| 7 | Supprimer le fallback "cheapest offer" pour les produits brand_network (escalade admin si pays non couvert) | 0.5 j | Protège le contrat de distribution |
| 8 | Aligner TIER_CONFIG/BecomePartner sur ce qui existe réellement (retirer ou griser search priority, multi-users, social posts, market report) | 0.5 j | Élimine le décalage promesse/réalité |
| 9 | Structurer la candidature distributeur (marques distribuées, zones en colonnes dédiées) pour préparer le matching réseau | 0.5 j | Alimente le pipeline brand_network |

## Top 5 recommandations priorisées

1. **Dette 46 — Option A réconciliée maintenant** (2-3 j). Un brand_member est actif en prod : la condition de révision fixée dans la doc ("réviser à l'onboarding du 1er brand_member réel") est atteinte depuis des semaines. Documenter au passage le drift `auto_route_brief_to_distributor`.
2. **Réparer le funnel brief BrandPage** (1 j) — CTA collection no-op, fallback mailto, notification email marque. C'est LE bug qui vide la proposition de valeur.
3. **Activer Isimar de bout en bout** (0.5 j + contenu) — compte user, produits liés aux collections, brief de test. Sans ça, aucune vente du plan n'est démontrable.
4. **Purger les fake stats et brancher partner_analytics** (1-2 j) — une marque premium pardonne un dashboard vide, jamais un dashboard menteur.
5. **Unifier le modèle collections** (2 j) — prérequis pour que l'assignation distributeur-par-collection (argument clé du 1 299€) fonctionne un jour.

## Verdict — ce persona peut-il utiliser la plateforme en production AUJOURD'HUI de bout en bout ?

**Brand Member (799€) : PARTIELLEMENT — vitrine oui, produit non.** Fonctionne : page marque publique magnifique, collections/références (gérées de fait par l'admin), CGV, invitation de compte (jamais utilisée). Cassé/manquant : réception de briefs (CTA mort + zéro notification), analytics (vides ou fictives), pas de compte actif, pas de produits liés, pas de billing. Une Fermob jugerait la vitrine crédible et le back-office non livré.

**Brand Network (1 299€) : NON.** Impossible d'ajouter un distributeur (UI marque ET admin en 400 sur colonnes inexistantes), liste distributeurs toujours vide, héritage d'offres inexistant (`source_offer_id` absent), stats réseau en erreur (`is_auto_routed`), commissions/revenue-share non éditables. Seul le routage de devis fonctionnerait — à condition de créer les liens `brand_distributors` en SQL manuel.

**Distributeur : PARTIELLEMENT.** Candidature et réception de devis routés OK ; mais le "catalogue marque hérité" (sa valeur ajoutée dans le réseau) est entièrement non fonctionnel.

**LA feature qui changerait tout pour ce persona** : un brief inbox qui marche vraiment — brief soumis depuis n'importe quelle collection, email immédiat à la marque, coordonnées révélées à l'acceptation, et un compteur mensuel "X leads qualifiés, Y € de pipeline générés". En année d'acquisition, c'est la seule preuve tangible qui justifie 799€/mois — tout le reste (vitrine, collections, réseau) n'est que le décor autour de cette promesse.