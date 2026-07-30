# Audit parcours utilisateur — Persona ARCHITECTE / DESIGNER
**Terrassea Hub — 2026-07-30 — lecture code complète (App.tsx, Auth, Account, ArchitectSections 2743 l, ProServiceArchitectHub 1265 l, useProServiceStore, useSupplierCalls, usePartnerLeads, hooks boards/moodboard, migrations pro_service)**

---

## Synthèse

Le parcours architecte a **deux visages incohérents**. Côté `/account` (ArchitectSections), le tooling est devenu majoritairement **réel et branché DB** depuis l'audit de mai : projets clients (`architect_projects` + zones + produits), notes persistées (`project_annotations` — la moitié "notes" de la Dette 36 est de facto résolue mais non documentée), material boards avec partage public par token, mood board AI, appels fournisseurs écrits dans `pro_service_requests` avec réponses/métriques réelles, suivi de devis réels (`quote_requests`). Côté `/pro-service` (ProServiceArchitectHub), c'est toujours de la **démo dangereuse** : identité hardcodée `"pro-002"`, "missions recommandées par Terrassea" qui sont en réalité les propres demandes de l'architecte re-présentées avec un faux score de matching, et surtout **deux formulaires qui simulent un succès sans rien persister** (publication d'appel et confirmation de disponibilité en `setTimeout`). Par ailleurs, deux découvertes non documentées sont bloquantes : **le signup architecte exige un SIREN français validé contre le registre gouvernemental français** — un architecte UK/ES/IT ne peut littéralement pas créer de compte en pleine année d'acquisition Europe+UK — et **le routing des appels vers les partners est 100 % manuel** (aucun moteur de matching ; sans action admin, un appel n'est visible d'aucun fournisseur). Enfin, **zéro support fichiers 3D/BIM** alors que PRODUCT_PHILOSOPHY.md liste ce besoin comme définitoire de la cible architecte.

---

## Forces

- **Signup dédié** : type "architect" sélectionnable dans `Auth.tsx` avec parcours propre (company obligatoire, icône, badge, couleur de profil dédiée).
- **Projets clients réels et riches** : `useArchitectProjects.ts` couvre CRUD `architect_projects`, zones (`project_zones`), produits par zone (`project_zone_products`), annotations persistées (`project_annotations`), **templates de projets** (`project_templates`, save-as + create-from), édition inline (statut, adresse, deadline, contraintes).
- **Appels fournisseurs côté Account réellement branchés** : `useSupplierCalls.ts` écrit/lit `pro_service_requests`/`pro_service_responses`/`pro_service_events` (vues/clics), sélection d'une réponse, clôture d'appel — plus du tout mock.
- **Devis réels** : `ArchitectQuotesSection` lit `quote_requests` (TVA, délais, validité, PDF, conditions partenaires) avec filtre par statut et détail complet.
- **Material boards + partage** : `material_boards`/`board_items` réels, duplication, réordonnancement, partage public par token via `/boards/shared/:token` (route publique fonctionnelle).
- **Mood board AI réel** (`image_analyses` + bucket `mood-images`).
- **RLS pro_service sérieuse** : anti-récursion via helpers SECURITY DEFINER (`architect_owns_request`, `partner_matches_request`, migration `20260519143042`), contact client masqué aux partners avant connexion (feed sanitisé R2), email de confirmation server-side triggé (Dette 59 Lot D).
- **Rewards affichés honnêtement "coming soon"** avec cadenas (`ArchitectRewardsSection`) — l'UI ne prétend plus que le programme est actif.
- **Certifications produits visibles publiquement** (`ProductCertificationsPublic.tsx`, `ProductCertificationBadges.tsx`) + 27 colonnes specs vocab 2026 : la précision technique attendue par un architecte est présente sur la fiche produit.

---

## Faiblesses / problèmes détectés

**CRITIQUE — Signup architecte impossible hors France.** `src/pages/Auth.tsx:101,117` : SIREN 9 chiffres **obligatoire** pour `userType !== "client"`, validé contre `recherche-entreprises.api.gouv.fr` (`Auth.tsx:77-89`) — registre exclusivement français. Le sélecteur de pays (`SUPPORTED_COUNTRIES`) n'exempte pas du SIREN. Un architecte de Londres, Milan ou Barcelone est bloqué à l'inscription. Contradiction frontale avec "Geographic focus: Europe + UK" en année d'acquisition. **Non documenté dans DETTE_TECHNIQUE_AUDIT.md.**

**CRITIQUE — /pro-service architecte : perte de données silencieuse (pire que du mock).** La Dette 35 dit "mock data" ; la réalité est plus grave, l'UI accepte des saisies réelles et les jette :
- `ProServiceArchitectHub.tsx:1042-1048` : `CreateCallView.handleCreate` = `setTimeout(600ms)` puis succès — **aucune écriture DB**. L'architecte remplit un appel d'offres complet, voit une confirmation, tout est perdu.
- `ProServiceArchitectHub.tsx:84-94` + `useProServiceStore.ts:234-239` : "Confirmer ma disponibilité" sur une mission → `addConnection` **local-only**, évaporé au refresh.
- `ProServiceArchitectHub.tsx:39` : `myId = "pro-002"` hardcodé, profil fallback rating 0.
- **Sémantique cassée** : la RLS (`architect_owns_request`) ne renvoie à l'architecte que **ses propres** `pro_service_requests` ; le hub les lui re-présente comme "missions recommandées par Terrassea" avec badge étoile et % de match calculé contre un profil mock (`computeMatchScore`). L'architecte "accepte" donc ses propres demandes.
- Onglet "calls" toujours vide par construction (`useProServiceStore.ts:151` : `supplierCalls` = `useState([])` jamais alimenté) ; portfolio sur `MOCK_PORTFOLIO_EXTRAS`.

**HAUTE — Double surface concurrente pour la même fonction.** Les appels fournisseurs existent en version réelle (`/account` → `ArchitectCallsSection`) ET en version fake (`/pro-service` → onglet calls + CreateCallView). Rien n'oriente l'architecte vers la bonne. Probabilité élevée qu'il utilise la mauvaise.

**HAUTE — Routing des appels = 0 % automatique, 100 % admin.** Aucun trigger/moteur ne crée de `pro_service_matches` à la publication d'un appel : seuls l'admin (`proposeMatch`, `useProServiceStore.ts:278-286`) crée des matches, et `usePartnerLeads` ne montre aux partners **que** les matches existants. Sans intervention manuelle du founder, un appel architecte n'atteint **aucun** fournisseur. La USP "we route you qualified projects" est un process concierge non outillé (pas de dashboard admin de routage dédié aux appels architectes, pas de SLA, pas de notification partner à la création du match côté insert direct).

**HAUTE — Vocabulaire catégories du brief incompatible avec le catalogue.** `ArchitectSections.tsx:1601-1614` : les besoins utilisent `seating`, `sun_protection`, `sunbeds`, `sofas_lounge`, `planters`, `lighting`, `outdoor_heating`… alors que les catégories produits/partner canoniques sont `chairs`/`parasols`/`loungers`/`sofas`… Même un matching manuel (ou futur automatique) par chevauchement de catégories ne peut pas fonctionner sans table de correspondance. Non couvert par `categoryNormalizer.ts` (qui ne gère que les entrées AI/CSV).

**HAUTE — Formulaire d'appel : champs collectés puis jetés.** `ArchitectSections.tsx` (`handleCreateCall`, ~l.1897-1930) : urgence, matériaux, surface, capacité, ambiance, et par besoin description/quantité/priorité sont saisis mais **absents du payload** `createCall` (seuls category-slugs aplatis, style, contraintes partent en DB alors que `quantity_estimate`, `surface_area`, `project_city/country` existent dans le schéma). Le fournisseur reçoit un brief appauvri ; l'architecte croit avoir transmis le détail.

**HAUTE — Deux chemins de réponse partner avec vocabulaires de statut divergents (PLAUSIBLE, à vérifier en prod).** `usePartnerLeads.ts:97-147` écrit `status: "interested"/"declined"` directement sur `pro_service_matches`, tandis que le RPC `respond_to_pro_service_match` / le store attendent `partner_interested`/`partner_declined` (`useProServiceStore.ts:85-98` documente le CHECK). Si le CHECK utilise le vocabulaire long, le bouton "intéressé" de `PartnerProLeadsSection` échoue en silence (mutation sans handler d'erreur UI). Au minimum, deux mappings contradictoires du même champ. En bonus, `usePartnerLeads.ts:43-59` résout le partner par `contact_email` — pattern explicitement qualifié de "fragile" et abandonné dans `ProServiceGate.tsx:20-22` (résolution par `user_id`).

**MOYENNE — Zéro fichier 3D/BIM/CAD.** Grep exhaustif `dwg|dxf|rvt|skp|revit|bim|glb` = 0 occurrence dans `src/`. `products.documents` (jsonb) ne porte que des PDF affichés dans `ProductDetail.tsx:606-612`. `PRODUCT_PHILOSOPHY.md:23-24` cite pourtant "Architectes (besoin de précision technique, certifications, **fichiers 3D**)". C'est le gap produit n°1 pour convaincre un architecte de sourcer ici plutôt que sur les sites des marques (qui fournissent DWG/3DS/Revit).

**MOYENNE — Tier "atelier" toujours hardcodé** (`Account.tsx:433` + badge sidebar l.859 + bannière cliquable l.877-890). Documenté (Dette 36) donc pas re-signalé en soi, mais **sous-estimé/à mettre à jour** : la moitié "notes non-persistées" de la Dette 36 est résolue (l'onglet notes rend `ProjectAnnotations`, persisté — `ArchitectSections.tsx:992-996`), le state local `notes` (l.682, 718-722) est du code mort à supprimer, et la doc n'en dit rien. La grille rewards promet échantillons/account manager/co-branding sans aucun backend.

**MOYENNE — Settings architecte read-only et non-i18n.** `Account.tsx:378-401` : labels hardcodés en anglais ("Profile information", "First name"…), aucune édition — alors que le client a `ClientSettingsSection` éditable. Un architecte ne peut pas corriger son téléphone/société. Violation de la convention i18n du CLAUDE.md.

**MOYENNE — 4 tables `supplier_call*` orphelines.** `supplier_calls`, `supplier_call_needs`, `supplier_call_responses`, `supplier_call_response_products` existent en DB (types.ts:5582-5711) mais **aucun code ne les lit ni ne les écrit** — les "appels fournisseurs" vivent dans `pro_service_requests`. CLAUDE.md référence encore `supplier_calls` comme module actif. Drift schéma/doc non documenté.

**MOYENNE — Stat "Devis envoyés" toujours à 0.** `ArchitectSections.tsx:360` agrège `(p as any).quotes_count`, colonne inexistante sur `architect_projects` (absente de types.ts). Idem `quotesCount: 0` hardcodé dans `dbToArchitectProject` (l.331). La barre de progression tier (l.362-364) calcule `(0 - threshold)/(next - threshold)` → largeur négative pour "atelier" ; purement décoratif.

**BASSE — Groupement devis par clé string** `${projectName} — ${clientName}` (`ArchitectSections.tsx:1528`) au lieu de `project_request_id` — A5 de mai, toujours en l'état.

**BASSE — Injection de filtre PostgREST** : `ArchitectSections.tsx:1459` interpole `profile.email` dans `.or(...)` sans échappement (emails avec virgule/parenthèse cassent le filtre).

**BASSE — Aucune porte d'entrée publique architecte** : zéro mention "architect" dans `Index.tsx`, `Header.tsx`, `Footer.tsx`. La découverte passe uniquement par le sélecteur de signup et une carte du landing Pro Service. Pas de page SEO `/architects` en année d'acquisition.

**BASSE — SharedBoard en N+1** (`SharedBoard.tsx:49-56` : une requête produit par item de board).

---

## Risques

1. **Réputationnel (le plus grave)** : le hub /pro-service simule des recommandations Terrassea avec scores de matching fictifs, et deux actions clés jettent silencieusement les saisies. Le milieu des architectes hospitality européens est petit et réseauté : un seul architecte qui découvre la supercherie ("j'ai publié un appel, aucun fournisseur ne l'a jamais vu") peut brûler le segment. L'écart promesse/réalité de la USP est aujourd'hui total sur /pro-service, partiel sur /account (l'appel est enregistré mais n'est routé nulle part sans admin).
2. **Acquisition gelée hors France** par le verrou SIREN — silencieux (l'architecte étranger échoue et part sans laisser de trace).
3. **Goulot founder** : chaque appel doit être matché à la main ; à 10 appels/semaine le process casse, sans outillage admin dédié ni SLA visible.
4. **Catalogue famélique** (~9 produits actifs, Dette #10 CLAUDE.md) : un architecte qui teste le sourcing ne trouve rien à spécifier → churn au premier usage, quelle que soit la qualité du tooling.
5. **Intégrité de données pro_service** : double vocabulaire de statut + double chemin d'écriture partner = états incohérents entre hubs, difficile à débugger plus tard.

---

## Opportunités / améliorations proposées

| # | Proposition | Effort | Impact |
|---|---|---|---|
| 1 | **Signup international** : SIREN requis seulement si pays=FR ; sinon champ "n° d'enregistrement / VAT" libre (validation VIES optionnelle plus tard) | 0.5-1 j | Débloque 100 % de l'acquisition architecte non-FR |
| 2 | **Tuer le fake court terme** : pour `user_type='architect'`, remplacer les onglets calls/missions de ProServiceArchitectHub par un renvoi vers `/account?section=calls`, supprimer CreateCallView/AcceptMission fake | 0.5-1 j | Élimine la perte de données silencieuse et le risque réputationnel immédiat |
| 3 | **Compléter le payload d'appel** (urgency, surface, capacité→`quantity_estimate`, matériaux, ambiance, needs structurés) + mapping `NEED_CATEGORIES` → catégories canoniques | 1 j | Briefs exploitables par les fournisseurs |
| 4 | **Matching automatique v1** : trigger/RPC à l'INSERT d'un `pro_service_request` créant des `pro_service_matches` par chevauchement catégories×pays partner + notification partner (réutilise l'infra RLS et le feed sanitisé existants) ; unifier le vocabulaire de statut et faire converger `usePartnerLeads` sur les RPCs | 3-4 j | La USP devient réelle a minima ; supprime le goulot admin |
| 5 | **Fichiers 3D/BIM** : étendre `products.documents` avec `{type: 'pdf'\|'dwg'\|'glb'\|'rvt'...}`, upload partner, section "Fichiers techniques" sur ProductDetail, badge "3D disponible" filtrable | 2-3 j | Différenciateur n°1 pour ce persona ; aligné PRODUCT_PHILOSOPHY |
| 6 | **Décision tier** : retirer badge/bannière/comparatif Studio-Atelier-Maison (ou les ancrer sur une vraie table de points) + nettoyer le code mort notes | 0.5-2 j | Véracité UI (Dette 36, à requalifier) |
| 7 | **Settings architecte éditables + i18n** (réutiliser ClientSettingsSection) | 0.5 j | Irritant récurrent |
| 8 | **Landing publique `/architects`** (SEO, cas d'usage, capture email) + lien header/footer | 1-2 j | Acquisition organique |
| 9 | **Portail client par projet** (lien lecture seule statut projet, extension du pattern share_token des boards) | 1-2 j | L'architecte fait de Terrassea son outil de restitution client → rétention |

---

## Top 5 recommandations priorisées

1. **Débloquer le signup non-français** (SIREN conditionnel au pays) — 0.5-1 j, prérequis absolu de l'année acquisition, non documenté à ce jour.
2. **Supprimer les flux fantômes du ProServiceArchitectHub** (create-call et accept-mission non persistés, missions auto-référentielles) et rediriger vers les sections réelles de Account — 0.5-1 j, stoppe la perte de données et le risque réputationnel.
3. **Matching automatique minimal + unification des statuts/chemins partner** (`pro_service_matches` auto + notif + vocabulaire unique) — 3-4 j, transforme la USP de démo en service réel.
4. **Support fichiers 3D/BIM sur les fiches produits** — 2-3 j, la feature qui ferait signer ce persona (aujourd'hui il retourne sur les sites des marques pour ses DWG).
5. **Trancher le tier Studio/Atelier/Maison et compléter le brief d'appel** (payload complet + catégories alignées) — 1.5-3 j, véracité UI + qualité des leads transmis.

---

## Verdict — utilisable en production aujourd'hui, de bout en bout ?

**PARTIELLEMENT — et seulement s'il est français.**

**Ce qui marche end-to-end** : signup (FR uniquement) → création de projets clients avec zones/produits/annotations/templates → material boards + partage public → mood board AI → publication d'appels fournisseurs (via `/account` uniquement) → réception/comparaison/sélection de réponses → suivi de devis réels avec PDF et conditions.

**Les trous qui cassent le "bout en bout"** :
- **Inscription impossible hors France** (SIREN) ;
- **L'appel publié n'atteint aucun fournisseur** sans routage admin manuel (aucun matching automatique) — le cœur de la promesse ;
- **`/pro-service` est une simulation** qui jette les saisies réelles (deux formulaires fake) et présente à l'architecte ses propres demandes comme des "missions recommandées" ;
- **Pas de fichiers 3D/BIM**, besoin métier définitoire du persona ;
- **Tier décoratif** hardcodé "atelier", settings non éditables, stat devis à 0 ;
- **Catalogue trop mince** (~9 produits) pour un sourcing réel.

Fichiers pivots : `/home/user/terrassea-project-hub/src/pages/Auth.tsx`, `/home/user/terrassea-project-hub/src/pages/Account.tsx`, `/home/user/terrassea-project-hub/src/components/architect-dashboard/ArchitectSections.tsx`, `/home/user/terrassea-project-hub/src/components/pro-service/ProServiceArchitectHub.tsx`, `/home/user/terrassea-project-hub/src/components/pro-service/useProServiceStore.ts`, `/home/user/terrassea-project-hub/src/hooks/useSupplierCalls.ts`, `/home/user/terrassea-project-hub/src/hooks/usePartnerLeads.ts`, `/home/user/terrassea-project-hub/src/hooks/useArchitectProjects.ts`, `/home/user/terrassea-project-hub/supabase/migrations/20260519143042_fix_pro_service_policy_recursion.sql`.