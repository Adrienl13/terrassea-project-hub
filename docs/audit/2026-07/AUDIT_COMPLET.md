# Audit complet Terrassea Hub — Juillet 2026

> **Date** : 2026-07-30 · **Méthode** : 11 agents spécialisés en parallèle (frontend, moteurs métier, backend/Supabase live, sécurité, build/CI exécuté, design/UX/SEO/i18n, 4 personas — restaurateur, usine, marque, architecte — et étude de marché web), ~1,7 M tokens d'analyse, 400+ opérations (lecture code intégrale, SQL prod lecture seule, exécution réelle de la chaîne CI, recherche web sourcée).
> **Rapports détaillés** : `docs/audit/2026-07/rapports/*.md` (11 fichiers — chaque affirmation ci-dessous y est sourcée avec fichier:ligne).
> **Règle appliquée** : les dettes déjà documentées FIXED n'ont pas été re-signalées. Ce rapport se concentre sur le **nouveau**, le **non documenté** et le **sous-estimé**.

---

## 1. Verdict global

**La plateforme est architecturalement bien au-dessus de la moyenne — et opérationnellement pas encore vraie.**

Ce qui est construit est sérieux : Stripe irréprochable (signature vérifiée, montants server-side, idempotence), RLS sur 100 % des 85 tables, moteurs métier encodant un vrai savoir-faire CHR, vitrine marque au niveau d'une Maison premium, import Excel multilingue excellent, design system crédible, 635 tests verts, discipline documentaire exceptionnelle (114 dettes tracées).

Mais l'audit croisé révèle un **fil rouge unique derrière presque tous les problèmes : la plateforme échoue en silence et affiche le contraire de la réalité**. Devis jamais routés (401 avalés), crons morts depuis des mois (503/401/404 quotidiens), signature qui affiche « signé ✓ » même en cas d'échec, commission affichée 8 % quand la vraie est 5 %, stats partner inventées (« 1 240 vues, 4.8/5 »), analytics jamais alimentées, formulaires Pro Service qui jettent les saisies après un faux succès, prix faux servis à ChatGPT/Perplexity, CI type-check qui ne vérifie 0 fichier depuis des mois (88 erreurs de type réelles masquées), et le repo qui ne peut plus reconstruire la prod (228 migrations prod vs 150 fichiers).

Et surtout, la découverte n°1, remontée **indépendamment par 3 agents** :

> **Une usine italienne ou espagnole ne peut pas créer de compte.** Le signup partner (seul chemin actif en mode launch) exige un SIREN français à 9 chiffres validé contre `recherche-entreprises.api.gouv.fr`. Une P.IVA italienne ou un CIF espagnol échoue mécaniquement. Le même verrou bloque les architectes non-français au signup, et les acheteurs non-français au devis, à la soumission projet ET à la signature. **Les 2 usines qui te rappellent en ce moment seraient bloquées au premier clic.** Non documenté dans aucune dette.

**État prod vérifié le 2026-07-29** : 53 produits (4 catégories seulement — zéro parasol, lounger, sofa alors que la homepage vend beach-clubs et rooftops), 2 partenaires (0 manufacturer), 5 devis **tous sans réponse**, 0 commande, 0 avis, 0 brief marque, 0 ligne d'analytics. La boucle transactionnelle complète n'a **jamais tourné en réel**.

**Le marché, lui, valide le pari** : créneau réellement vacant (personne ne combine vertical outdoor CHR + transaction + outillage conformité en Europe), tendances 2026 alignées avec le modèle de données (durabilité/certifications devenues éliminatoires dans les tenders FF&E), coût d'acquisition usine imbattable vs salons (~50 k€ un stand Salone vs 0 € + commission). La fenêtre est ouverte, mais bornée : Material Bank s'installe en Europe (18-36 mois estimés).

---

## 2. Ce que la plateforme est (compréhension consolidée)

Marketplace B2B verticale du mobilier outdoor CHR/hospitality en Europe, avec 4 faces :

| Face | Proposition | État réel |
|---|---|---|
| **Acheteur CHR** (restaurateur/hôtelier) | Brief → layout → BOM conforme → devis multi-usines → commande → suivi | Réel jusqu'au devis ; jamais éprouvé au-delà ; France uniquement |
| **Usine/fabricant** | Canal export digital : catalogue, devis, commandes, analytics, 0 €/an en launch | Devis+commandes réels, signup bloqué hors FR, analytics vides, MOQ absent |
| **Marque premium** (799/1 299 €) | Vitrine éditoriale + brief inbox qualifié + réseau distributeurs | Vitrine excellente ; brief inbox mort (CTA no-op) ; réseau distributeurs 100 % cassé (migration jamais appliquée) |
| **Architecte** (gratuit 2026) | Projets/zones/boards + appels fournisseurs routés + specs/certifs | Tooling projet réel et riche ; routage 100 % manuel ; /pro-service = simulation qui perd les saisies ; 0 fichier 3D/BIM |

Différenciateurs réels déjà construits : moteurs layout/spatial/conformité/scoring MOQ (uniques sur le marché), référentiel certifications 3 niveaux incl. marine, vocabulaire 2026 à 27 colonnes de specs, pipelines IA d'ingestion catalogue, GEO/llms.txt précoce.

---

## 3. Découvertes majeures par domaine

### 3.1 Frontend (rapport `tech_frontend.md`)
- **Bug réel** : flush `sendBeacon` du panier échoue à 100 % (pas de headers possibles → 401 PostgREST) — faux filet de sécurité (`ProjectCartContext.tsx:320-325`).
- **react-hook-form : 0 usage** malgré CLAUDE.md — tous les formulaires géants (AddProductForm 1 555 l, PartnerProfileForm 1 038 l) sont hand-rolled en useState.
- ~506 `any` hors ui/, concentrés sur paiements/soumissions/analytics. 176 useQuery / 200 invalidations sur littéraux de chaîne dispersés (typo = invalidation silencieusement morte).
- Volume notable de code mort : recharts, 7 deps npm orphelines, 22 primitives shadcn, 5 composants, tout le système use-toast.
- **CLAUDE.md factuellement périmé** (comptes, stack forms, tests, deps) — dans un workflow IA-as-developer, c'est un vecteur de bugs systémique.

### 3.2 Moteurs métier (rapport `tech_engine.md`)
- **Dette 32 très sous-estimée** : le chantier vocab n'a jamais été propagé aux moteurs. `"bar-stools"` ≠ `"bar stools"` → chercher « canapé », « tabouret », « transat » donne un **score catégorie 0** sur le catalogue réel ; les bonus « mandatory » des venues bar/hôtel/beach-club **ne s'appliquent jamais**. Les 575 tests verts valident la taxonomie **obsolète** (mocks `"Chairs"`) — sécurité factice.
- **Le moteur de conformité crie au loup** : `AISLE_TOO_NARROW` (blocker ERP) se déclenche sur pratiquement tout layout FR réaliste (heuristique d'allée mathématiquement incohérente, double comptage des clearances). Dangereux pour le positionnement « conformité ».
- **BOM irréaliste hors restauration** : un beach-club 40 couverts reçoit 40 chaises et **1 transat** ; un bar reçoit **1 tabouret**. Le questionnaire budget est décoratif (toutes les réponses → « mid »).
- Zéro test unitaire sur supplierEngine/spatialEngine/layoutEngine ; `supplierEngine` importe Supabase au top-level (contredit CLAUDE.md, 5 fichiers de tests échouent hors CI).

### 3.3 Backend / prod live (rapport `tech_backend.md`)
- **Toute la chaîne asynchrone est morte, vérifiée dans les logs du jour** : `auto-workflow` inaccessible depuis le front (401 avalés × 4 callsites) → **les devis sans partner pré-assigné ne sont jamais routés** et l'email d'expédition n'est jamais envoyé ; cron reviews → 401 quotidien depuis mai ; cron paniers abandonnés → 503 ; cron Vercel → appelle une fonction **jamais déployée** (404) → les devis n'expirent jamais, aucune relance ne part.
- **Drift migrations structurel** : 228 versions prod vs 150 fichiers repo ; ~108 migrations prod sans aucun fichier (toute la fondation orders/messaging/payments de mars) ; 17 fichiers référencent un **autre projet Supabase**. Le repo ne peut pas reconstruire la prod.
- Bugs neufs : `check-abandoned-carts` insère dans des **colonnes inexistantes** (100 % d'échec même réactivé) ; `stock-sync-webhook` compte les SKU inconnus comme succès + compteurs NaN + clés API partner **en clair** ; budget chatbot inopérant (RPC inexistant + upsert écraseur).
- Compute **Nano** avec pause auto : l'upgrade Pro (P0 escaladée le 15 mai) n'est toujours pas actée ; 192 index inutilisés, nettoyage promis « ~1 semaine après le 8 juin » jamais fait.

### 3.4 Sécurité (rapport `tech_security.md`)
- **`analyze-terrace` : endpoint LLM vision public** — aucune auth, CORS `*`, aucun quota → drain budgétaire Anthropic exploitable par un anonyme.
- **Chatbot** : limite journalière chargée mais **jamais appliquée**, aucun throttle session/IP → un anonyme peut vider le budget mensuel global.
- **`platform_settings` lisible par tout compte authentifié** : IBAN/BIC/bénéficiaire, email admin, **grille de commissions complète** — en contradiction directe avec « commission cachée au client ».
- `verify_jwt` par fonction non versionné (config Dashboard only) ; `VITE_TRACKING_API_KEY` inlinée dans le bundle client ; Dette 19 (notifications phishing) 2B.final toujours ouverte.
- Le socle par ailleurs très bon : 0 table sans RLS, Stripe robuste, correctifs red-team traçables, aucune clé hardcodée.

### 3.5 Build / CI (rapport `tech_build.md` — chaîne exécutée réellement)
- **Le type-check du CI est un no-op** : `bunx tsc --noEmit` sur le tsconfig racine vérifie **0 fichier** (0,22 s). Le vrai check révèle **88 erreurs de type** (dont types Supabase désynchronisés : `owner_brand_id` absent de `DBProduct`). « Failing CI blocks merges » est une fiction depuis des mois.
- **54 vulnérabilités deps (1 critique, 29 high)** dont `xlsx` 0.18.5 (prototype pollution + ReDoS, exposé aux fichiers uploadés par les partenaires) et react-router (open redirect). Aucun audit deps en CI.
- Le reste est sain : lint 0 erreur, 635/635 tests verts, build 16 s, payload initial ~210 kB gzip, i18n lazy-loadée.

### 3.6 Design / UX / SEO / i18n (rapport `tech_design-ux.md`)
- **~113 clés i18n absentes de TOUTES les locales** → fallback français servi partout, y compris sur le funnel signup partner et Auth. Une usine italienne voit un formulaire mi-français. + ~50 strings FR en dur dans le dashboard partner.
- **Les crawlers IA reçoivent des données fausses** : prix des plans €790/€1 290 (réels : 799/1 299), caps produits faux, « 6 langues » (4 réelles) — ChatGPT/Perplexity citeront des prix erronés aux prospects.
- **Chaîne de slugs cassée** : Header/sitemap/prerender émettent `sun-loungers` vs canon `loungers` ; le parsing de `Products.tsx` ne matche jamais les catégories à tiret → **landing pages catégories vides poussées en sitemap daily** (soft-404). Vérifié côté persona : les 3 bar-stools publiés sont introuvables via le filtre.
- Le token `terracotta` existe mais **260 hex `#D4603A` en dur** (+ 1 variante divergente sur le hero) — rebranding/dark mode/déclinaison marine verrouillés.
- Accessibilité : pas de skip-link, focus clavier quasi invisible, `lang` figé — exposition European Accessibility Act + marchés publics.
- Verdict crédibilité : la direction artistique est au niveau « référence » ; ce qui fait « cheap » c'est l'incohérence transverse (mélange de langues, chiffres publics contradictoires), pas le design.

---

## 4. Verdicts personas — « utilisable aujourd'hui de bout en bout ? »

| Persona | Verdict | Point de rupture |
|---|---|---|
| **Restaurateur/hôtelier** | ⚠️ Partiel — oui jusqu'au devis, non au-delà | SIREN obligatoire (non-FR exclus) ; signature stub avec silent fail sur l'étape qui **crée la commande** ; 5/5 devis prod sans réponse ; catalogue sans parasols/loungers/sofas |
| **Usine/fabricant** | ❌ NON hors France ; ⚠️ partiel pour une usine FR | **Signup impossible (SIREN)** ; commission affichée fausse (8 % vs 5 % launch) ; ni MOQ ni prix dégressifs (le cœur du métier d'une usine) ; analytics à 0 pour toujours ; URL webhook stock-sync cassée ; risque doublon partner silencieux |
| **Marque 799 €** | ⚠️ Vitrine oui, produit non | Brief inbox mort (CTA no-op + fallback mailto qui exfiltre les leads) ; marque jamais notifiée d'un brief ; stats fictives ; Isimar sans compte actif, « 0 Produits » affiché publiquement |
| **Marque 1 299 € (network)** | ❌ NON | Migration brand-distributor **jamais appliquée** (15 mois) : impossible d'ajouter/voir un distributeur (UI marque ET admin en 400), héritage d'offres inexistant, ~7 callsites cassés non documentés au-delà de Dette 47 ; aucun billing Stripe récurrent |
| **Architecte** | ⚠️ Partiel — et seulement s'il est français | SIREN au signup ; appels fournisseurs **routés 0 % automatiquement** (concierge manuel founder) ; `/pro-service` **jette silencieusement les saisies** (setTimeout + faux succès) et présente à l'architecte ses propres demandes comme « missions recommandées » ; **0 fichier 3D/BIM** (besoin n°1 du persona, 81 % des spécificateurs) |

Bonne nouvelle non documentée : les notes projets architecte sont en réalité **persistées** (`project_annotations`) — la moitié de la Dette 36 est résolue de facto.

---

## 5. Marché (rapport `market.md`, sourcé)

- **Marché** : outdoor commercial mondial ~21,6 Md$ (CAGR 6,6 %), hospitality = 41,5 % ; Europe outdoor ~4,3-4,4 Md$. Croissance EU modérée (~3,3 %) → la croissance viendra de la **prise de part sur l'offline** (salons/agents), pas de la marée montante.
- **Concurrence** : Archiproducts (~117 M$ CA, 3 M produits) = média/lead-gen, pas transactionnel ; ArchiExpo se transactionnalise ; Ambista (Koelnmesse) a **fermé** (2022) ; Clippings n'a pas survécu en indépendant (acquis par Material Bank) ; METRO Markets = généraliste price-driven. **Personne ne fait spec + transaction + conformité sur l'outdoor CHR.** Menace principale : Material Bank/Clippings en Europe (fenêtre 18-36 mois).
- **Le pitch usine est quantifiable** : stand Salone ≈ 30-100 k€ pour 4 jours vs Terrassea 0 €/365 jours + 5 % au succès. 81 % des spécificateurs demandent du BIM que la majorité des fabricants ne fournit pas.
- **Monétisation** : la grille actuelle (3,5-8 % + abonnements 249-1 299 €) est dans les benchmarks B2B gros panier. Le playbook « demande gratuite / offre payante » (Material Bank) valide la décision architectes-gratuits-2026.
- **Marine** : réel (refit cruise ~3,2 Md$, Italie = 55 % des builds yachts) mais relationnel et à cycles longs → **SEO light uniquement** tant que la liquidité CHR n'est pas prouvée.
- **Positionnement recommandé** : *« le système d'exploitation du sourcing outdoor contract en Europe »* — brief → layout → BOM conforme → devis multi-usines → commande.
- **Scénarios** : A) niche rentable 100-200 usines (probable, défendable en solo) ; B) standard vertical EU 500+ usines (l'ambition — exige levée ou 1-2 recrutements) ; C) acquisition par un consolidateur (l'actif valorisé = la donnée de spec verticale + relations usines).
- **Correction de cap** : la cible catalogue 30-50 SKU du backlog est **sous-dimensionnée**. Seuil de crédibilité sourcing : **300-500 SKU** sur les 8 catégories. Recommandé : 150-300 avant fin 2026 via campagne clusters (Manzano/Trévise/Brianza + Valence/Catalogne) avec onboarding IA-assisté.

---

## 6. Plan d'action priorisé

### P0 — Cette semaine, avant de rappeler les 2 usines (~4 j)

| # | Action | Effort |
|---|---|---|
| 1 | **Gate d'inscription européen** : SIREN *ou* n° TVA intracommunautaire (VIES) avec validation par pays + fallback « vérification manuelle 24 h » — dans Auth.tsx ET le funnel devis/signature/financement | 1-1,5 j |
| 2 | **Vérité sur l'argent** : brancher `useEffectiveCommission` dans PartnerQuotesSection/PartnerOverview (5 % launch, pas 8 %) + onError sur la réponse devis + toast decline honnête | 0,5 j |
| 3 | **Purger les mensonges visibles** : stats mock « 1 240 vues / 4.8/5 / Top 12 % », note fournisseur 4.5 hardcodée, faux export CSV, badge pending figé | 0,5 j |
| 4 | **Corriger les prix faux servis aux IA/crawlers** (prerender, llms.txt, index.html : prix, caps, « 6 langues ») — idéalement en important partnerConstants | 0,5 j |
| 5 | **Fix filtre catégories + slugs** (`sun-loungers`→`loungers`, parsing Products.tsx via categoryNormalizer, sitemap/Header/prerender) — 3 produits invisibles aujourd'hui | 0,5-1 j |

### P1 — Sous 2-3 semaines : réanimation & fiabilité (~10 j)

| # | Action | Effort |
|---|---|---|
| 6 | **Chantier « réanimation async »** : trigger DB auto-assign sur INSERT quote_requests (pattern pg_net+vault éprouvé), fix des 2 crons (headers auth), trancher run-scheduled-tasks (déployer ou porter en pg_cron), corriger les colonnes fantômes de check-abandoned-carts, dédup notifications quotidiennes | 2 j |
| 7 | **Borner les coûts IA** : auth + quota sur analyze-terrace, plafond chatbot réel + throttle session/IP | 1 j |
| 8 | **Signature fiable** : propager les erreurs (plus de « signé ✓ » sur échec — 0,5 j urgent), puis capture probante + CGVAcceptanceCheckbox (Dette 34/104) | 0,5 j + chantier |
| 9 | **CI réel** : `tsc -p tsconfig.app.json` + résorber les 88 erreurs (regénérer les types Supabase d'abord), `bun audit` en CI, migrer/remplacer `xlsx` | 2-2,5 j |
| 10 | **Fermer les fuites** : platform_settings (IBAN/commissions → whitelist `is_public` ou RPC), VITE_TRACKING_API_KEY hors bundle, Dette 19 2B.final, versionner `verify_jwt` dans config.toml | 1,5 j |
| 11 | **i18n funnel partner + dashboard** : backfill des 113 clés + extraction des ~50 strings FR (conditions de paiement en clés, TVA par pays) | 2-3 j |
| 12 | **Identité partner unifiée** : hook unique (user_id d'abord), contrainte UNIQUE, garde anti-doublon, écran d'erreur avec retry ; + fix URL webhook stock-sync | 1 j |
| 13 | **Infra** : upgrade Supabase Pro/Micro (P0 depuis mai), nettoyage des 192 index inutilisés | 0,5 j |

### P2 — Le mois suivant : crédibilité produit (~15 j)

| # | Action | Effort |
|---|---|---|
| 14 | **Chantier vocab engines** : source de vérité catégories unique, fix VENUE_NEEDS/intentDetector/compatibilityEngine, migration de **tous les mocks de tests** vers la taxonomie canonique | 1,5 j |
| 15 | **Conformité honnête** : neutraliser les faux blockers (warning « estimation »), corriger le double comptage, puis MVP placement en rangées (conformité géométrique démontrable) | 0,5 j + 3 j |
| 16 | **BOM venue-aware** : profils par type d'établissement (beach-club, bar, hôtel), ratio parasols par diamètre, fix mapping budget | 2-3 j |
| 17 | **MOQ + prix dégressifs** : colonnes + formulaires + affichage client + supplierEngine (déjà prêt) — LA feature qui prouve aux usines que la plateforme comprend leur métier | 2-3 j |
| 18 | **Réconciliation migrations** : baseline `db pull`, archivage des 150 fichiers, check CI anti-drift | 1-2 j |
| 19 | **Trancher le plan 1 299 €** : Option A réconciliée (2-3 j — le brand_member actif en prod atteint le critère de révision de Dette 46) OU geler/masquer le plan. Réparer le funnel brief (CTA, notification email marque) + activer Isimar de bout en bout | 1-3 j |
| 20 | **Pro Service : tuer le fake** (0,5-1 j immédiat : rediriger vers les sections réelles) puis matching automatique v1 (trigger matches par catégories×pays + notif partner) | 1 + 3-4 j |
| 21 | **Onboarding partner Tier 1** (dettes 49/50/51 déjà spécifiées) + pipeline analytics minimal (rollup quotidien vues/devis/commandes → partner_analytics) | 2 + 2 j |

### P3 — Trimestre : propulsion

| # | Levier | Effort |
|---|---|---|
| 22 | **Campagne clusters usines** IT/ES (30 fabricants ciblés, pitch « ½ stand Salone »), onboarding IA-assisté — objectif **150-300 SKU actifs fin 2026** | 10-15 j étalés |
| 23 | **Compliance pack exportable** par projet (PDF certifs feu/UV/corrosion du BOM, prêt tender FF&E) — personne ne le fait, viral chez les architectes | 3-5 j |
| 24 | **Fichiers 3D/BIM** par produit (GLB/DWG d'abord) — critère d'adoption n°1 des architectes, point de parité vs Archiproducts | 5-8 j |
| 25 | **Export BOM** (XLSX/PDF, quantités, fourchettes, délais) + moteur pricing par paliers | 3-5 j |
| 26 | **Devis multi-produits consolidé** (réponse groupée + livraison) — un restaurateur pense « budget terrasse posée », pas « prix unitaire chaise » | 4-6 j |
| 27 | **North Star de liquidité** : « projets avec ≥1 devis » et « devis→commande » + dashboard ; geler toute expansion (marine active, locales) tant qu'elle ne progresse pas | 2-3 j |
| 28 | Landing `/architects` SEO, marine SEO light (2-3 pages), préparation locale DE pour 2027 | 4-6 j |

### Méta-recommandation (transverse, la plus importante)

Le méta-problème n'est pas la qualité du code (bonne) mais **l'absence de boucle de détection** : chaque incident majeur trouvé était un échec silencieux (`.catch(() => {})`) vieux de plusieurs semaines/mois. Trois garde-fous structurels :

1. **Observabilité minimale** : table `cron_run_log` + tuile admin « santé des crons » (vert/rouge dernière exécution) + ErrorBoundary par route avec reporting (1-1,5 j).
2. **Interdiction des `.catch` muets** sur les flux transactionnels (règle ESLint custom déjà envisagée en Dette 81 — la promouvoir).
3. **Resynchroniser CLAUDE.md** (comptes réels, stack forms, 48 fichiers de tests, deps mortes, `src/utils/`) — dans un modèle « IA seul développeur », un CLAUDE.md faux produit des bugs en série. À refaire après chaque chantier (0,25 j).

---

## 7. Lecture stratégique finale

1. **Le diagnostic tient en une phrase** : Terrassea a construit un excellent produit *potentiel* et un produit *réel* qui n'a jamais servi personne de bout en bout. 2026 étant l'année d'acquisition, chaque semaine où le funnel usine est bloqué (SIREN) et où le funnel devis est muet (async morte) est une semaine de fenêtre concurrentielle consommée pour rien.
2. **L'ordre compte plus que le volume** : P0 (4 jours) débloque littéralement les 2 usines chaudes. P1 rend la plateforme *vraie*. P2 la rend *crédible*. P3 la rend *différenciante*. Inverser cet ordre (ex. partir sur le 3D/BIM avant de réparer l'async) reproduirait le pattern actuel : de belles features sur un socle muet.
3. **Réviser la cible catalogue à la hausse** (150-300 SKU fin 2026, pas 30-50) et instaurer la North Star de liquidité — c'est elle qui doit arbitrer chaque chantier suivant.
4. **Documenter la réponse au scénario Material Bank** dans STRATEGIC_DECISIONS.md : la défense = profondeur verticale (conformité outdoor + MOQ + devis multi-usines) + relations exclusives clusters — pas la course au volume générique.
5. **Les 5 leviers « parmi les plus grands »** : (a) la donnée de conformité comme moat irrattrapable, (b) l'arbitrage 50 k€ Salone vs 0 € comme arme commerciale, (c) l'IA d'onboarding catalogue comme débouchoir du goulot historique des marketplaces furniture, (d) le flywheel architecte gratuit, (e) l'option marine en multiplicateur différé.

---

*Rapports détaillés (fichier:ligne pour chaque finding) : `rapports/tech_frontend.md`, `rapports/tech_engine.md`, `rapports/tech_backend.md`, `rapports/tech_security.md`, `rapports/tech_build.md`, `rapports/tech_design-ux.md`, `rapports/persona_restaurateur.md`, `rapports/persona_usine.md`, `rapports/persona_marque.md`, `rapports/persona_architecte.md`, `rapports/market.md`.*
