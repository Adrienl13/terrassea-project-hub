# Audit parcours utilisateur — Persona RESTAURATEUR / HÔTELIER (acheteur)

**Méthode** : lecture intégrale du code des pages/composants/hooks du funnel (Index, Products, ProductDetail, ProjectBuilder, ProjectCart, QuoteRequestModal, ClientSections/SignatureModal, ClientOrdersSection, usePaymentFlow/useStripePayment, edge functions stripe-checkout/stripe-webhook, ProductReviews, FinancingRequestModal, Messages, Compare, MoodBoard), croisée avec les docs stratégiques (CLAUDE.md, PRODUCT_PHILOSOPHY, DETTE_TECHNIQUE_AUDIT 2599 l, USER_TOOLS_AUDIT, TOAST_TROMPEUR_AUDIT) et **vérification de l'état réel de la prod** (SQL sur le projet Supabase `gwgcfgeouropcighpztj`, 2026-07-29).

---

## Synthèse (8 lignes)

Le parcours acheteur est **architecturalement complet et réel** (aucune table mockée sur ce persona : quote_requests, project_requests, orders, product_reviews, financing_requests, conversations sont toutes branchées) et la chaîne paiement Stripe est **correctement sécurisée** (montant server-side, webhook signé). Mais trois réalités le fragilisent : **(1)** la plateforme est franco-centrée de fait — SIREN français obligatoire au devis, à la soumission projet ET à la signature, ce qui **bloque tout hôtelier espagnol/italien/UK** malgré le positionnement "Europe + UK" ; **(2)** l'étape la plus critique du funnel (signature) est un stub qui **avale silencieusement ses erreurs** et affiche "signé" même en cas d'échec — or c'est le trigger DB sur `signed_at` qui crée la commande ; **(3)** l'état prod confirme que la boucle transactionnelle n'a **jamais tourné en réel** : 52 produits (4 catégories seulement), 2 partenaires, 5 devis tous sans réponse, 0 signature, 0 commande, 0 avis, 0 conversation. Le filtre catégorie public est en outre cassé pour `bar-stools` (vérifié contre les données prod). Le persona peut découvrir, chercher, composer un projet et demander un devis — mais pas encore acheter de bout en bout dans des conditions fiables.

---

## Forces

- **Chaîne de données 100 % réelle** : aucune donnée mockée sur ce persona (contrairement au côté architecte/Pro Service). Devis, projets, commandes, events, avis, financement, messages → vraies tables avec RLS.
- **Paiement solide** : `stripe-checkout` recalcule le montant server-side depuis `orders` (jamais le client), vérifie l'appartenance de la commande, valide les redirect URLs ; `stripe-webhook` vérifie la signature Stripe (timing-safe) et pose `deposit_paid_at`/`balance_paid_at` server-side. `orders` : UPDATE réservé à `is_admin()` (vérifié en prod). Fallback virement bancaire avec IBAN configuré + référence de paiement.
- **Suivi de commande client excellent** (`ClientOrdersSection.tsx`, 966 l) : stats, filtres, progress bar, timeline d'events, tracking avec **copy + deeplink transporteur** (Dette 41 en fait résolue dans le code), reorder 1-clic, échéances acompte/solde.
- **Discovery différenciante** : SmartSearch NL → `intentDetector` (dictionnaire slugs canonique correct), ProjectBuilder guidé/expert avec moteurs layout/multi-zone/compliance réels et draft localStorage, export PDF du panier, financement intégré au panier, comparateur, favoris DB, mood board.
- **Devis anonyme possible** (bon pour la conversion) et rattaché ensuite au compte par email OU user_id (`useClientDashboard.ts:178-180`).
- **Alias fournisseur masqué jusqu'à signature** : mécanique marketplace anti-désintermédiation propre, bien expliquée dans l'UI.
- **UX de qualité** : empty states avec CTA, i18n 4 locales largement respectée, mobile passes récentes (Dettes 88-90, 97-98 FIXED).

---

## Faiblesses / problèmes détectés

### CRITIQUE

1. **SIREN français obligatoire sur tout le funnel transactionnel — contradiction frontale avec "Europe + UK"** — `QuoteRequestModal.tsx:142,150` (devis bloqué sans SIREN 9 chiffres), `ProjectCart.tsx:249,257` (soumission projet), `ClientSections.tsx:1444-1462` (la signature exige une **vérification SIREN via `recherche-entreprises.api.gouv.fr`** pour passer à l'étape 2 — un hôtelier de Barcelone ou Londres **ne peut littéralement pas signer**), `FinancingRequestModal.tsx:53`. Non documenté dans les audits existants. Le pays du `project_requests` est même défaulté à `"France"` (`ProjectCart.tsx:276`).
2. **Signature : stub documenté (Dette 34) mais sous-estimé — silent fail sur l'étape qui crée la commande** — `ClientSections.tsx:1554-1565` : `signQuoteRequest` en try/catch → `console.error` puis `setStep("done")` **quoi qu'il arrive**. L'acheteur voit "Devis signé ✓", le toast succès part, la notif admin part… alors que `signed_at` peut ne pas avoir été posé — et c'est le trigger `auto_create_order_on_signature` (Dette 74 Option Beta) qui crée l'order. Résultat possible : client convaincu d'avoir commandé, aucune commande n'existe. C'est exactement l'anti-pattern du TOAST_TROMPEUR_AUDIT, non couvert par les Lots 1-5 (admin-side only).
3. **Filtre catégorie public cassé pour des catégories réellement en base (vérifié prod)** — `ProductFilterSidebar.tsx:43` (`CATEGORY_OPTIONS` CamelCase "Bar Stools", "Sun Loungers") vs slugs kebab canoniques. `Products.tsx:207-230` compare en lowercase : `"bar stools" ≠ "bar-stools"`, subcategory prod = `"Bar Stool"` (singulier) → **les 3 bar stools publiés sont introuvables via le filtre**. Idem le breadcrumb `ProductDetail.tsx:356` → `/products?category=bar-stools` → `Products.tsx:149-154` reformate en `"Bar stools"` → **0 résultat**. Rattaché à Dette 32 (documentée "à fixer") mais l'impact concret — deep-links et filtres retournant 0 produit sur des catégories peuplées — n'était pas mesuré.

### HAUTE

4. **Note fournisseur 4.5/5 hardcodée, présentée comme vraie** — `ClientSections.tsx:1117` et `:1138` : `{4.5}/5` littéral affiché dans le détail devis. Fausse preuve sociale à l'endroit exact où l'acheteur B2B décide de faire confiance. Non documenté.
5. **`is_verified_purchase` frauduleusement laxiste** — `useProductReviews.ts:97-120` : n'importe quelle commande du user (**sans filtre produit** — le `.eq("product_id")` manque sur la requête `orders`) OU une **simple demande de devis** suffit à obtenir le badge "achat vérifié". Intégrité du social proof compromise dès les premiers avis. Non documenté.
6. **Soumission panier → devis : boucle non transactionnelle avec échecs avalés** — `ProjectCart.tsx:316-437` : inserts `quote_requests` séquentiels en boucle, chaque échec catché par item (`console.error`), puis `toast.success` + panier vidé **même si 0 devis a été créé**. Le `project_request` peut exister sans aucun devis, sans que personne ne le sache. (Bonus : `partnerItemCount` faux, `ProjectCart.tsx:423-425` — les items sans fournisseur comptent pour tous les partenaires.)
7. **État prod : funnel post-devis jamais exercé + catalogue incohérent avec la promesse** — 52 produits publiés sur **4 catégories** (armchairs, bar-stools, chairs, tables) : **zéro parasol, lounger, sofa** alors que la homepage vend beach clubs/hôtels/rooftops et que le chantier vocab a construit 27 colonnes de specs pour ces catégories. 5 devis en base, **0 replied / 0 signé / 0 order / 0 review / 0 conversation**. Les 8 devis-projets et 5 quotes attendent depuis des semaines. La homepage **affiche ces stats réelles** (`Index.tsx:306-323` : "2 partenaires fournisseurs") — un restaurateur lit "2 partenaires" et part. Dette 10 (catalogue thin) documentée, mais l'effet vitrine des stats et l'absence totale de réponse partenaire ne le sont pas.

### MOYENNE

8. **Quantité projet par défaut cassée sur les URLs canoniques** — `ProductDetail.tsx:191-194` : `items.find(i => i.product.id === id)` utilise le param legacy `id`, `undefined` sur la route `/products/:brandSlug/:productSlug` → le pré-remplissage de quantité "project-aware" du QuoteRequestModal ne marche que sur les vieilles URLs UUID.
9. **Notification "nouveau devis" envoyée potentiellement au mauvais partenaire** — `QuoteRequestModal.tsx:216-229` notifie le partner du `bestOffer` (le moins cher) alors que le commentaire ligne 164 précise que `partner_id` n'est **pas** pré-assigné justement parce qu'`auto-workflow` fait un géo-routage (marques). Le partenaire notifié peut ne jamais recevoir le devis, et l'assigné réel n'est pas notifié.
10. **Tri "Nouveautés" = tri UUID** — `Products.tsx:303-304` : `b.id.localeCompare(a.id)` sur des UUID → ordre aléatoire, pas `created_at`.
11. **Panier localStorage uniquement + route protégée** — le panier n'est persisté en DB qu'à la soumission ; un restaurateur qui compose sur desktop ne retrouve rien sur mobile, et `/project-cart` est derrière `ProtectedRoute` alors que l'ajout au panier est public → wall de connexion surprise en plein tunnel.
12. **StockBadge triple implémentation, langues incohérentes** — labels **anglais** hardcodés dans `Products.tsx:541-556`, **français** hardcodés dans `ProductDetail.tsx:725-733` et `ProjectCart.tsx:43-59`. Un anglophone voit "In stock" sur la liste et "En stock" sur la fiche. Dette 6 documentait l'i18n manquante, pas l'incohérence FR/EN inter-pages.
13. **"Sauvegarder pour plus tard" = toast sans action** — `ProjectCart.tsx:244-246` : `handleSave` ne fait qu'un `toast.success` (le localStorage sauvait déjà en continu). Toast trompeur buyer-side, hors périmètre des Lots admin fixés.
14. **Slider prix plafonné à 500 €** — `ProductFilterSidebar.tsx:34` : pour du mobilier CHR (sofas, parasols pro > 1 500 €), l'échelle suggère un marché discount ; fonctionnellement ≥500 = no-max, mais l'UX ment sur le positionnement.

### BASSE

15. `ProductListCard` linke en legacy `/products/:id` (`Products.tsx:677,690`) au lieu de `urlForProduct` — redirection runtime + jus SEO perdu.
16. `client_city` reçoit l'adresse complète du siège (`QuoteRequestModal.tsx:169`) — champ mal nommé, donnée polluée.
17. Chaînes hors i18n dans le funnel : bannière supplier "Showing products from Verified Supplier" (`Products.tsx:341-348`), "Add", "supplier(s)", titres de notifs partner en français hardcodé (`QuoteRequestModal.tsx:222`, `ProjectCart.tsx:429`).
18. `SpecRow` "Pays fournisseur" affiche `"—"` en dur même après révélation (`ClientSections.tsx:1116`).

---

## Risques

- **Risque légal contractuel (le plus grave)** : des devis peuvent être "signés" aujourd'hui via un placeholder sans capture de signature, sans horodatage probant, avec échec silencieux possible. Combiné à l'absence d'intégration `CGVAcceptanceCheckbox` dans les flux buyer (Dette 104, différée Vague 2), une contestation client serait indéfendable. À geler ou fixer **avant** le premier vrai devis signé.
- **Risque de mort silencieuse du funnel** : 5 devis prod sans aucune réponse partenaire. Si le premier restaurateur réel ne reçoit rien sous 48 h, il ne revient pas — et rien (SLA, relance, escalade admin) ne le détecte. Les crons de relance sont d'ailleurs cassés (`check-abandoned-carts` 503, `send-review-request` 401 — Dettes 57/58 ouvertes).
- **Risque de confiance à la première visite** : stats réelles exposées ("2 partenaires"), catégories vitrines vides (parasols, loungers), note 4.5/5 inventée — un acheteur pro détecte vite l'artifice.
- **Risque dormant classique** : toute la chaîne signature→order→paiement→review n'a jamais tourné en prod (0 occurrence). L'historique du projet (Dette 74 découverte dormante) montre que ces chemins réservent des bugs au premier passage réel.
- **Risque d'expansion** : chaque nouveau marché (ES/IT/UK) nécessitera de détricoter le SIREN hardcodé sur 4 composants + la vérification de signature — plus c'est tard, plus c'est cher.

## Opportunités / améliorations proposées

| # | Amélioration | Effort | Impact |
|---|---|---|---|
| 1 | **Identifiant entreprise européen** : SIREN → champ "n° d'immatriculation + pays" (VIES/VAT lookup pour EU, Companies House pour UK), validation conditionnelle par pays | 2-3 j | Débloque littéralement le marché annoncé |
| 2 | **Durcir la signature** : propager l'erreur de `signQuoteRequest` (pas de step "done" si throw), capture réelle (canvas ou signature typée + horodatage + IP), intégrer `CGVAcceptanceCheckbox` déjà livré (Dette 104) | 2-4 j | Conversion + défense légale |
| 3 | **Réparer le filtre catalogue** : mapper `CATEGORY_OPTIONS` sur les slugs canoniques + normaliser le param URL `?category=` via `categoryNormalizer` existant | 0.5 j | Découvrabilité immédiate (3 produits invisibles aujourd'hui) |
| 4 | **SLA devis visible + relance** : timestamp "réponse attendue sous X h" côté client, cron de relance partner à J+2, escalade admin à J+4 | 1-2 j | Le point de fuite n°1 de ce persona est l'attente silencieuse |
| 5 | Transactionaliser la soumission panier (RPC SECURITY DEFINER `submit_project_cart` : project_request + cart_items + quote_requests atomiques, pattern déjà éprouvé Dette 9/23) | 1-2 j | Fiabilité + supprime le toast trompeur |
| 6 | Supprimer/brancher la note fournisseur (vraie moyenne `product_reviews` par partner ou rien) + corriger `is_verified_purchase` (filtrer orders par produit, exclure les simples devis) | 0.5 j | Crédibilité social proof |
| 7 | Persister le panier en DB pour les users connectés (sync localStorage ↔ table à la connexion) | 1-2 j | Multi-device B2B, relance panier abandonné |
| 8 | Masquer les stats homepage sous seuil (afficher "50+ produits" ou rien tant que partners < 10) | 0.2 j | Première impression |
| 9 | LA feature qui changerait tout pour ce persona : **devis multi-produits consolidé avec réponse groupée et prix livraison** — aujourd'hui un projet de terrasse (30 chaises + 8 tables + 4 parasols) éclate en N devis mono-produit sans frais de port ni vision globale (C5 documenté, toujours ouvert). Un restaurateur pense "budget total terrasse posée", pas "prix unitaire chaise" | 4-6 j | Conversion structurelle |

## Top 5 recommandations priorisées

1. **Internationaliser l'identification entreprise (SIREN → EU/UK)** — bloquant absolu pour la cible affichée ; à faire avant toute prospection hors France.
2. **Fiabiliser la signature avant le 1er devis signé réel** : propagation d'erreur (0.5 j, urgent) puis capture probante + CGV (chantier Dette 34/104).
3. **Quick-wins catalogue (1 j total)** : fix filtre catégories kebab + tri "newest" + note 4.5 hardcodée + is_verified_purchase. Quatre irritants de confiance pour un jour de travail.
4. **SLA + relances sur les devis** (et réparer les crons 503/401) — sans réponse partenaire, tout le reste est décoratif ; les 5 devis prod en souffrance le prouvent.
5. **Remplir les catégories vitrines avant le relaunch Salone** (parasols/loungers/sofas — Backlog §1) et masquer les stats homepage sous seuil en attendant.

---

## Verdict — ce persona peut-il utiliser la plateforme en production AUJOURD'HUI de bout en bout ?

**Partiellement — oui jusqu'au devis, non au-delà.**

- ✅ **Fonctionne aujourd'hui** : découverte, recherche NL, fiche produit riche (variants, certifs, offres, MOQ), ProjectBuilder, panier, demande de devis (mono-produit ou projet), dashboard devis, messagerie, favoris, comparateur, mood board, demande de financement.
- ⚠️ **Fonctionne sous conditions** : uniquement pour une **entreprise française** (SIREN), avec un catalogue limité à chaises/fauteuils/tabourets/tables (pas de quoi équiper une terrasse complète), et à condition qu'un des 2 partenaires réponde — ce qui ne s'est encore jamais produit (5/5 devis sans réponse).
- ❌ **Trous bloquants pour la fin du parcours** : signature légalement creuse avec silent fail (l'order dépend de ce `signed_at`), chaîne signature→commande→paiement→livraison→avis jamais exécutée en réel (0 occurrence en base — code présent et bien conçu, mais non éprouvé), devis multi-produits non consolidé, acheteur non-français exclu.

Le squelette transactionnel est de qualité (Stripe irréprochable, orders/RLS propres, tracking client soigné) — c'est la **couche de véracité** (signature réelle, réponses partenaires réelles, catalogue réel, badges réels) qui manque encore entre "démo crédible" et "plateforme sur laquelle un hôtelier engage 40 000 €".