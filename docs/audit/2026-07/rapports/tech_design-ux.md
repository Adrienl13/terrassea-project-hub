## Synthèse (5-10 lignes)

L'infrastructure design/SEO/i18n est nettement au-dessus de la moyenne d'un projet solo-founder : tokens HSL shadcn propres, prerender bot-side avec JSON-LD échappé (XSS H9 fixé), sitemap dynamique, llms.txt, i18n 4 locales quasi-paritaires (4 343 clés, écart < 0,5 %), lazy-loading des locales (Dette 98), lots Mobile UX 1-3 livrés. Mais trois failles **non documentées** minent directement l'objectif 2026 d'acquisition : (1) ~113 clés i18n n'existent dans **aucun** fichier de locale et affichent leur fallback inline français à tous les utilisateurs — y compris sur `BecomePartner.tsx` et `Auth.tsx`, le funnel d'acquisition partenaires, vu en français par une usine italienne ou espagnole ; (2) le contenu servi aux crawlers IA (prerender, llms.txt, index.html) contient des **données factuelles fausses** (prix des plans €790/€1 290 vs €799/€1 299 réels, caps produits 10/100/illimité vs 30/50/150, « 6 langues » alors que 4 existent) — ChatGPT/Perplexity citeront des prix erronés à vos prospects ; (3) la chaîne de slugs catégories est cassée pour les catégories à tiret (`sun-loungers` émis par Header/sitemap/prerender vs `loungers` canonique en DB → landing pages catégories SEO potentiellement vides). Côté design, le token `terracotta` existe mais est contourné par **260 occurrences de `#D4603A` en dur** (62 fichiers, + 1 variante `#d4613a` divergente) : le système de tokens est décoratif, pas opérant. La crédibilité premium est réelle sur la typo (Manrope/Inter, eyebrows, tracking) mais fragilisée par le mélange de langues et les micro-textes 9-10 px.

*Limitation : le proxy sortant du sandbox bloque terrassea.com (CONNECT 403) — le rendu live n'a pas pu être vérifié ; l'analyse porte sur le code et la config Vercel.*

## Forces

- **Design tokens sains à la base** : palette HSL near-black/beige chaud/terracotta cohérente avec un positionnement hospitality premium (`src/index.css`), typo bicéphale Manrope (display) / Inter (body) appliquée partout, `ADMIN_DESIGN_LANGUAGE.md` remarquablement formalisé (Linear 60 % / Stripe 30 % / Vercel 10 %).
- **Cohérence visuelle inter-pages réelle** : Index, Products, ProductDetail, Account partagent les mêmes patterns (eyebrow `text-[10px] uppercase tracking-[0.2em]`, `font-display font-bold`, bordures `border-border`, rounded-full CTAs). Pas de divergence structurelle majeure entre pages publiques.
- **i18n structurellement solide** : 4 343 clés en, écarts fr/es/it de 3 clés seulement ; détection localStorage→navigator ; lazy-loading par locale (−286 KB gzip au first paint).
- **SEO technique avancé pour un SPA** : `api/prerender.ts` sert un HTML complet aux 20+ bots (UA-match Vercel), échappement XSS documenté, JSON-LD Organization/FAQPage/Product/ItemList, `api/sitemap.ts` dynamique (produits + partners + brands), robots.txt propre avec Disallow des routes privées, headers sécurité (HSTS, X-Frame-Options).
- **GEO/AI-SEO précoce** : llms.txt + llms-full.txt + autorisations explicites GPTBot/ClaudeBot/PerplexityBot — rare et différenciant.
- **Mobile** : lots UX 1-3 FIXED (tap targets 44 px, iOS zoom, overflow-x guard), `min-h-[44px]` systématique sur les CTAs d'Index, alternatives mobiles aux boutons `hidden md:flex`, table comparateur dans `overflow-x-auto`.
- **A11y ponctuellement soignée** : `prefers-reduced-motion` global CSS, aria-modal/aria-expanded sur le menu mobile Header, breadcrumb aria-labellisé (Dette 90), alt sur toutes les images (grep : 0 `<img>` sans alt).
- **JSON-LD produit client-side** (`ProductSchemaOrg.tsx`) avec aggregateRating/variants — builder testable isolé.

## Faiblesses / problèmes détectés

**CRITIQUE — i18n : ~113 clés absentes de TOUTES les locales, fallback français servi à tous**
Scan systématique : 113 appels `t('clé', 'default inline')` dont la clé n'existe dans aucun des 4 JSON (+ 12 clés présentes uniquement dans fr.json). Les defaults inline sont majoritairement français. Impact maximal sur le funnel d'acquisition : `src/pages/BecomePartner.tsx:422-448` (« Étape 1 », « Quel est votre profil ? », « Choisir »), `src/pages/Auth.tsx` (12 clés, messages SIREN), `src/components/partner-dashboard/*` (PartnerOverview, AddProductForm, ExcelImportModal, PartnerProfileForm — ~40 clés + français **en dur sans t()** dans PartnerCatalogueSection, PartnerCGVSection, BrandReferencesManager, VariantsGrid), `src/components/client-dashboard/ClientSections.tsx`, `src/pages/PartnerDetail.tsx` (« Pays », « Ville » sur page publique). Un fabricant italien qui s'inscrit voit un formulaire mi-français. Non couvert par les Dettes 1+12 et 6 (périmètre bien plus large).

**CRITIQUE — SEO/GEO : données factuelles fausses servies aux crawlers IA**
`api/prerender.ts:83` + `public/llms.txt:40-46` + FAQ JSON-LD : Brand Member €790 et Brand Network €1 290 (réels : €799/€1 299 selon CLAUDE.md/partnerConstants), Starter « up to 10 products » (réel : 30), Growth « up to 100 » (réel : 50), Elite « unlimited » (réel : 150) et Elite présenté comme souscriptible alors qu'il est sur invitation. `prerender.ts:87` + `index.html` + `SEO.tsx:22` : « 6 languages: … German, and Dutch » alors que DE/NL n'existent pas (CLAUDE.md l'affirme explicitement). Ces réponses sont exactement ce que ChatGPT/Perplexity restitueront à un prospect qui demande « combien coûte TerrasseaHUB ». C'est de la désinformation auto-infligée sur le canal GEO que le projet cultive.

**HAUTE — chaîne de slugs catégories cassée pour les catégories à tiret (extension non documentée de Dette 32)**
- `src/components/Header.tsx:59-65`, `api/sitemap.ts:28`, `api/prerender.ts:141` émettent `sun-loungers` ; le slug canonique DB est `loungers` (`src/lib/categoryNormalizer.ts:24,55`).
- `src/pages/Products.tsx:150` : `category.charAt(0).toUpperCase() + category.slice(1).replace("-", " ")` ne remplace que le **premier** tiret → `?category=sun-loungers` devient le filtre « Sun loungers » qui ne matche jamais `p.category === "loungers"` ; `?category=bar-stools` → « Bar stools » ≠ `bar-stools`.
- `ProductFilterSidebar.tsx:44-46` : options « Sun Loungers », « Bar Stools » avec la même incompatibilité.
Conséquence : les landing pages catégories poussées dans le sitemap (priority 0.8, changefreq daily) rendent probablement un catalogue vide pour ces catégories — pages « soft 404 » aux yeux de Google. Dette 32 documente le CamelCase générique mais ne liste ni `api/sitemap.ts`, ni `api/prerender.ts`, ni `Header.tsx`, et qualifie la sévérité de « non bloquante » sur la foi d'un test « Chairs » (catégorie sans tiret, seul cas qui marche). Sous-estimée.

**HAUTE — en.json a perdu 3 clés utilisées par ProductDetail**
`reviews.backToProducts/collection/productNotFound` existent dans en.json mais `src/pages/ProductDetail.tsx:242-260,400` consomme `productDetail.*`, présent uniquement dans fr/es/it. Renommage fait dans 3 locales sur 4 : les utilisateurs EN (fallbackLng !) voient la clé brute `productDetail.productNotFound` sur les états 404/erreur produit.

**HAUTE — hreflang incorrect + lang HTML figé**
- `index.html:21-26` et `SEO.tsx:109-121` : tous les hreflang (fr/en/it/es/de/x-default) pointent vers la **même URL** — usage invalide (Google exige des URL distinctes par langue), avec un hreflang `de` sans locale de. Signal contradictoire : `<html lang="fr">` figé, title/description EN, `og:locale fr_FR`.
- `document.documentElement.lang` n'est jamais mis à jour au changement de langue (grep : 0 occurrence) → WCAG 3.1.1 non conforme, lecteurs d'écran prononcent l'italien avec une voix française.

**HAUTE — le système de tokens est contourné : 260 × `#D4603A` en dur dans 62 fichiers**
Le token `--terracotta` existe (`index.css:53`, `tailwind.config.ts:56`) mais la couleur signature est écrite en hex littéral partout (260 occurrences), plus une variante divergente `#d4613a` (`Index.tsx:194` — soulignement du hero, littéralement l'élément le plus visible du site, dans une teinte légèrement différente du reste). S'y ajoutent ~15 hex récurrents non tokenisés (#6B7B5E, #4A90A4, #C4956A, #8B7355, #1A1A1A…). Un rebranding ou un dark mode est aujourd'hui impossible sans sed géant ; la config `darkMode: ["class"]` est d'ailleurs morte (aucun bloc `.dark` dans index.css).

**MOYENNE — accessibilité : pas de skip-link, landmarks incomplets, focus clavier absent des boutons custom**
- 0 skip-link ; `<main>` sur 11/27 pages seulement (Index.tsx n'en a pas) ; 69 aria-label sur tout src/ ; 8 `sr-only` ; 14 `<div onClick>` sans role/tabindex.
- 0 import du Button shadcn dans src/pages (153 `<button>` bruts) : les styles `focus-visible` du design system ne s'appliquent jamais aux pages publiques, et aucun `focus-visible:` global n'existe dans index.css (3 occurrences hors ui/ dans tout le code) → navigation clavier quasiment invisible sur Index, Products, CTA…
- framer-motion sans `MotionConfig reducedMotion="user"` : les animations JS (dots flottants du hero, y-loops infinis) ignorent `prefers-reduced-motion` — le garde CSS ne couvre que les animations CSS.

**MOYENNE — contrastes et micro-typographie**
`text-muted-foreground/35` et `/40` (Index.tsx:247,508) : ~2:1 de contraste, très en dessous de WCAG AA ; usage massif de `text-[9px]`/`text-[10px]`/`text-[11px]` (20 occurrences dans Account.tsx seul) pour du contenu porteur d'information (labels de stats, métadonnées), pas seulement décoratif.

**MOYENNE — SEO résiduel**
- `og:image` générique même pour les pages produit (`prerender.ts:586`) alors que `image_url` est disponible — les partages sociaux de produits n'affichent pas le produit.
- Le JSON-LD produit bot-side (`prerender.ts:310`) n'inclut ni `aggregateRating` ni `review` alors que le client-side (`productSchemaOrg.ts`) les a : les bots (seuls à compter pour les rich snippets) ne voient jamais les étoiles.
- Titles/descriptions des `<SEO>` passés en anglais en dur sur toutes les pages (`Index.tsx:147`, `Products.tsx:332`…) quelle que soit la locale — le SEO multilingue affiché dans les hreflang n'existe pas en pratique.
- `public/sitemap.xml` statique périmé (liste `/login`, ignore les catégories) — inoffensif car le rewrite Vercel le shadow, mais drift repo/prod du type que CLAUDE.md interdit.
- `/pro-service` absent des routes du prerender (tombe sur le fallback générique) alors qu'il est dans le sitemap.

**BASSE** — Google Fonts via `@import` URL dans index.css (render-blocking, pas de preconnect, dépendance tierce) ; `container` padding fixe 2rem non responsive ; pas de doc design-language pour le site public (seul l'admin en a un) ; drapeaux emoji comme seul repère du sélecteur de langue (peu lisible Windows).

## Risques

1. **Réputation GEO durable** : les réponses IA se construisent maintenant ; des prix faux cités par ChatGPT à une usine prospect en plein « acquisition year » coûtent des deals et sont lents à corriger (caches de crawl).
2. **Soft-404 catégories** : Google crawle quotidiennement (changefreq daily) des pages catégories vides → dégradation du crawl budget et du ranking des vraies pages, aggravée quand le catalogue passera à 30-50 produits pré-Salone.
3. **Perception « cheap » chez les cibles internationales** : le mélange FR/EN sur les dashboards partenaires et le funnel signup contredit frontalement la promesse « plateforme européenne 4 langues ». C'est le facteur n°1 qui fait « cheap » vs « référence » aujourd'hui — bien plus que le design, qui est bon.
4. **Dette de marque verrouillée** : chaque nouvelle page ajoute des hex en dur ; le coût du refactor tokens croît linéairement. Le passage marine (yachts/cruise) impliquera probablement une déclinaison visuelle — impossible à coût raisonnable en l'état.
5. **Exposition légale a11y** : l'European Accessibility Act s'applique depuis juin 2025 au e-commerce ; une marketplace B2B visant des collectivités (marchés publics = exigences RGAA/EN 301 549) sans skip-link ni focus visible est attaquable lors d'appels d'offres.

## Opportunités / améliorations proposées

| # | Action | Effort | Impact |
|---|---|---|---|
| 1 | **Chantier « vérité factuelle GEO »** : aligner prerender.ts FAQ/Service JSON-LD, llms.txt, llms-full.txt, index.html et SEO.tsx sur partnerConstants.ts (prix, caps, 4 langues, Elite sur invitation) ; idéalement importer les constantes plutôt que dupliquer | 0,5 j | Très élevé — intégrité du canal IA |
| 2 | **Chantier i18n de clôture** : script CI (déjà prototypé dans cet audit) qui échoue si une clé `t()` est absente d'une locale ; backfill des 113+12+3 clés ; extraction du français en dur des 15 composants partner-dashboard | 2-3 j | Très élevé — crédibilité internationale du funnel partenaires |
| 3 | **Fix slugs catégories bout-en-bout** : `sun-loungers`→`loungers` dans Header/sitemap/prerender, normalisation via `categoryNormalizer` dans Products.tsx:150 et ProductFilterSidebar (fusion avec Dette 32 en l'étendant à api/) | 0,5-1 j | Élevé — landing pages SEO fonctionnelles avant le push catalogue |
| 4 | **Tokenisation couleurs** : codemod `#D4603A`→`text-terracotta`/`bg-terracotta`, ajout des 5-6 accents secondaires comme tokens (sage #6B7B5E, ocean #4A90A4, sand #C4956A), fix `#d4613a` | 1 j | Moyen — déverrouille rebranding/dark mode/déclinaison marine |
| 5 | **Pass a11y ciblé** : skip-link + `<main>` partout, `document.documentElement.lang = i18n.language` dans SEO.tsx (3 lignes), `focus-visible` global dans index.css, `MotionConfig reducedMotion="user"` dans App.tsx, suppression des `/35 /40` sur texte porteur | 1-1,5 j | Moyen — conformité EAA + marchés publics |
| 6 | **Rich snippets produits bot-side** : réutiliser `buildProductSchema` (aggregateRating) dans prerender.ts + og:image = image produit ; hreflang : supprimer les balises tant qu'il n'y a pas d'URLs par langue (`?lang=` ou préfixe) | 0,5 j | Moyen — étoiles dans les SERP, partages sociaux vendeurs |
| 7 | Localiser les titles/meta descriptions via i18n dans les appels `<SEO>` ; supprimer public/sitemap.xml statique ; ajouter /pro-service au prerender | 1 j | Faible-moyen |
| 8 | Rédiger `docs/design/PUBLIC_DESIGN_LANGUAGE.md` (pendant public de l'admin) : échelle typo (bannir <11 px pour l'informationnel), usage tokens, quand utiliser Button shadcn | 0,5 j | Moyen — discipline long-terme alignée PRODUCT_PHILOSOPHY |

## Top 5 recommandations priorisées

1. **Corriger les données fausses servies aux IA/crawlers** (prerender.ts, llms.txt, index.html : prix, caps produits, « 6 langues ») — 0,5 j, c'est le canal d'acquisition que vous cultivez activement et il ment actuellement sur votre pricing. À faire cette semaine.
2. **Réparer le funnel partenaires en 4 langues** : backfill des clés `becomePartnerPage.*`/`auth.*` dans les 4 locales + les 3 clés `productDetail.*` manquantes d'en.json, puis check de parité i18n en CI — 1 j pour le funnel seul, 2-3 j pour le solde (partner-dashboard).
3. **Fixer la chaîne `sun-loungers`/`loungers` et le parsing d'URL de Products.tsx** avant l'enrichissement catalogue pré-Salone (BACKLOG_POST_VOCAB §1) — sinon vous pousserez 40 produits dans des landing pages qui ne les affichent pas.
4. **Codemod tokens couleurs** (260 hex → `terracotta` et frères) + fix `#d4613a` du hero — 1 j, à faire avant que le compte ne passe à 400.
5. **Mini-pass accessibilité structurel** (lang dynamique, skip-link, main, focus-visible global, MotionConfig) — 1-1,5 j, faible coût, requis pour la cible collectivités/marchés publics et l'EAA.

**Verdict crédibilité premium** : la direction artistique (typo, palette, densité, prerender soigné) est au niveau « référence » ; ce qui fait « cheap » aujourd'hui n'est pas le design mais l'exécution transverse — français résiduel devant des prospects non francophones, clés i18n brutes sur les états d'erreur, catégories vides, et des chiffres publics (prix, langues, caps) qui se contredisent entre le site, les crawlers et le code. Ce sont des défauts de cohérence, pas de goût — et ils sont tous corrigeables en ~6-8 jours cumulés.