## Synthèse (audit ARCHITECTURE FRONTEND & QUALITÉ DE CODE — 2026-07-29)

Le frontend est globalement bien architecturé pour un solo founder + IA : routing lazy propre, code-splitting vendor réfléchi, i18n lazy-loadée (Dette 98 FIXED), 48 fichiers de tests (vs 7 documentés), contexts correctement mémoïsés, un helper `supabaseAction` de gestion d'erreur standardisée. Les god components (Admin.tsx, ArchitectSections, ClientSections) sont déjà documentés — mais la liste s'allonge sans stratégie de découpage (`ProServiceClientHub.tsx` 2 274 l, `ExcelImportModal.tsx` 1 566 l, `AddProductForm.tsx` 1 555 l). Les findings NOUVEAUX les plus significatifs : (1) un bug réel dans le flush `sendBeacon` du panier (échec silencieux garanti à 100 %), (2) **react-hook-form n'est utilisé nulle part** alors que CLAUDE.md le présente comme le stack forms — tous les formulaires sont hand-rolled en useState, (3) ~506 occurrences de `any` hors ui/, (4) un volume notable de dépendances et composants morts (recharts, cmdk, vaul, 22 primitives shadcn, 5 composants applicatifs), (5) une dérive documentaire de CLAUDE.md qui, dans un workflow IA-as-developer, est elle-même un vecteur de bugs.

## Forces

- **`src/App.tsx` (162 l)** : exemplaire. Toutes les pages en `lazy()`, providers hiérarchisés proprement, `RecoveryGuard` et `BecomePartnerRouter` bien commentés avec leur raison d'être, `queryClient` configuré (staleTime 120s, pas de refetch on focus), ErrorBoundary présent.
- **Contexts** : `AuthContext` (156 l) et `ProjectCartContext` (490 l) sont soignés — `useMemo`/`useCallback` systématiques sur les values, gestion de la race condition password-recovery documentée, sync serveur du panier débouncée (1,5 s), refs pour éviter les doubles chargements. `CompareContext` (72 l) et `FavouritesContext` (134 l) restent minces.
- **Code-splitting** : `manualChunks` vendor (react/supabase/ui/motion/query/i18n/recharts/pdf) + `rollup-plugin-visualizer` opt-in (`ANALYZE=1`). Locales i18n dynamiquement importées (~286 KB gzip économisés au first paint).
- **Tests** : 48 fichiers Vitest (engines, variants, cart-context-integration, specs par catégorie, supabaseAction) — bien au-delà des « 7 » documentés. Les zones critiques métier (variants, normalisation catégories, BOM) sont couvertes.
- **`src/utils/supabaseAction.ts`** (278 l + hook + tests) : pattern d'action Supabase avec propagation d'erreur unifiée — la bonne réponse au problème « toast trompeur » (Dette 75).
- **Imports lourds différés** : `xlsx` en `await import()` dans `ExcelImportModal.tsx:191`, `pdf-lib` isolé dans 2 modules lib chargés depuis des chunks lazy.
- **Dictionnaires vocab 2026** respectés (categoryNormalizer, fabricBrands) et réellement importés par Admin.tsx (`CANONICAL_CATEGORIES`), conformément à la convention.

## Faiblesses / problèmes détectés

**HAUTE — Flush `sendBeacon` du panier structurellement cassé** — `src/contexts/ProjectCartContext.tsx:320-325`. Le handler `beforeunload` envoie `navigator.sendBeacon(VITE_SUPABASE_URL/rest/v1/saved_carts?on_conflict=user_id, JSON.stringify(payload))`. `sendBeacon` ne peut pas définir de headers : pas d'`apikey`, pas d'`Authorization`, `Content-Type: text/plain`. PostgREST répond 401 systématiquement. Ce code de « prévention de perte de données » échoue 100 % du temps, silencieusement, et donne une fausse assurance. À supprimer ou remplacer (`visibilitychange` + fetch keepalive avec headers).

**HAUTE — react-hook-form + zodResolver : 0 usage dans l'application** — `react-hook-form` et `@hookform/resolvers` sont en dependencies et CLAUDE.md annonce « react-hook-form + zod » comme stack forms, mais `zodResolver` a 0 occurrence et `useForm` n'apparaît que dans `src/components/ui/form.tsx` (primitive shadcn, elle-même non importée). Conséquence : `AddProductForm.tsx` (1 555 l), `PartnerProfileForm.tsx` (1 038 l), le `ProductForm` inline d'`Admin.tsx` sont des formulaires hand-rolled en `useState` sans validation déclarative — la principale source de volume des monolithes. Risque aggravé : un agent IA lisant CLAUDE.md écrira du RHF incohérent avec le codebase.

**HAUTE — ~506 occurrences de `any` hors `ui/`** — concentrées dans les zones les plus critiques : `AdminDashboard.tsx` (47), `ArchitectSections.tsx` (36), `useAdminAnalytics.ts` (22), `useProductSubmissions.ts` (18), `ClientSections.tsx` (15). La dette « strict:false » est documentée, mais son ampleur réelle (un `any` toutes les ~120 lignes de code applicatif) est sous-estimée : combinée à `strictNullChecks:false`, elle neutralise TypeScript précisément là où transitent paiements, soumissions produits et analytics.

**MOYENNE — Dérive documentaire de CLAUDE.md (critique dans un workflow IA)** — chiffres faux : 27 pages (pas 26), 27 hooks (pas 24), 33 modules lib (pas 19), 48 fichiers de tests (pas 7) ; `src/utils/` (4 modules dont `supabaseAction`, pierre angulaire de la gestion d'erreur) absent du « repo layout source of truth » ; stack forms erronée (cf. supra) ; recharts listé comme actif alors que mort. Pour un développement piloté par IA, CLAUDE.md inexact = prompts systémiquement faux.

**MOYENNE — Dépendances et code morts non documentés** —
- `recharts` (~500 KB) : uniquement importé par `ui/chart.tsx`, lui-même importé par personne — pourtant listé dans `manualChunks` (`vite.config.ts:58`) et dans CLAUDE.md.
- Deps orphelines : `cmdk`, `vaul`, `input-otp`, `react-day-picker`, `react-resizable-panels`, `react-hook-form`, `@hookform/resolvers` (usage : 0 hors primitives ui/ non importées).
- 22 primitives shadcn jamais importées (dont `sidebar.tsx` 637 l, `chart`, `form`, `calendar`, `skeleton`, `dropdown-menu`…).
- 5 composants applicatifs orphelins : `src/components/HeroSearch.tsx`, `common/CGVAcceptanceCheckbox.tsx`, `partner-dashboard/ProductModelForm.tsx`, `partners/BecomePartnerDialog.tsx`, `partners/PartnerContactDialog.tsx`.
- Le système toast shadcn complet (`hooks/use-toast.ts` 186 l + `ui/toast` + `ui/toaster`) est mort — sonner est utilisé dans 82 fichiers. (Le doublon est documenté, le fait que TOUT le système soit supprimable ne l'est pas.)

**MOYENNE — React Query sans discipline de clés** — 176 `useQuery`, 200 `invalidateQueries`, toutes les queryKeys en littéraux de chaîne dispersés (14× `["products"]`, 7× `["partner-products"]`…), aucune factory centralisée. Conventions incohérentes (`["partner_applications"]` underscore vs `["partner-leads"]` kebab). Un typo dans une clé = invalidation silencieusement inopérante — indétectable avec `strict:false` et sans tests d'invalidation.

**MOYENNE — Double pattern de data-fetching** — 38 fichiers de `src/pages`/`src/components` appellent `supabase.from()` directement (hors hooks), coexistant avec les hooks react-query. Pas de couche d'accès données unifiée : cache et invalidations ne voient pas les écritures faites en direct.

**MOYENNE — Favoris : sync unidirectionnelle et snapshots périmés** — `src/contexts/FavouritesContext.tsx:42-82` : au login, les favoris DB sont tirés vers le local, mais les favoris locaux pré-login ne sont jamais poussés vers la DB (perte cross-device). Surtout, le contexte persiste des objets `DBProduct` complets en localStorage : les prix affichés (avec commission appliquée au moment de l'ajout) peuvent rester périmés indéfiniment — sensible en B2B où `pricing_visibility_mode` et commissions évoluent. Même pattern de snapshot dans le panier local (le re-fetch frais n'a lieu que si le panier local est vide, `ProjectCartContext.tsx:240-242`).

**MOYENNE — ErrorBoundary unique au sommet** — `src/App.tsx:101` : un seul boundary (57 l, console.error uniquement, pas de reporting — l'absence d'observabilité est déjà documentée AUDIT.md §9). Toute erreur de rendu dans n'importe quelle page remplace l'app entière par le fallback. Aucun boundary par route ni sur les zones à risque (Admin, dashboards).

**BASSE — Monolithes : le pattern se reproduit sur le code récent** — les god components historiques sont documentés (AUDIT.md §), mais `ProServiceClientHub.tsx` (2 274 l, 28 composants dans un fichier) et `ProServiceArchitectHub.tsx` (1 265 l) sont récents : la pratique « N composants par fichier-section » continue de produire de nouveaux monolithes. `Admin.tsx` importe statiquement 26 sections admin → un seul chunk admin massif (acceptable car admin-only, mais 1 clic = tout télécharger).

**BASSE — `AuthContext` re-fetch le profil à chaque `TOKEN_REFRESHED`** — `src/contexts/AuthContext.tsx:112-134` : `onAuthStateChange` refait un `fetchProfile` à chaque rafraîchissement de token (~1×/h) alors que le profil change rarement. Bénin, mais un `useQuery` avec staleTime serait plus cohérent avec le reste du stack.

**BASSE — 133 `console.*` (dont 21 `console.log`) en production** — pas de logger, pas de stripping en build (`esbuild.drop` absent de vite.config.ts).

**BASSE — Aucune skeleton UI** — `ui/skeleton.tsx` existe mais n'est importé nulle part ; le fallback Suspense global est un spinner. Cohérent avec « cosmétique acceptable », noté pour mémoire.

## Risques

1. **Le vecteur IA** : la boucle founder + IA dépend de l'exactitude de CLAUDE.md et de DETTE_TECHNIQUE_AUDIT.md. Chaque dérive documentaire (RHF, recharts, comptes de fichiers, `src/utils` invisible) se traduit en code futur incohérent — c'est le risque n°1 spécifique à ce mode d'organisation.
2. **Scalabilité 10x features** : sans factory de queryKeys, sans couche formulaire, et avec des sections-fichiers de 2 000+ lignes, chaque nouvelle feature augmente le coût marginal. Les fichiers > 1 500 l dépassent les fenêtres de contexte confortables des agents → éditions partielles, régressions.
3. **`strict:false` + 506 `any` + zéro monitoring d'erreur front** : les erreurs de type se manifestent en prod chez l'utilisateur, sans remontée. Combinaison particulièrement dangereuse sur Admin/analytics/paiements.
4. **Snapshots localStorage (panier + favoris)** : affichage de prix périmés à des acheteurs B2B = risque commercial (devis basé sur un prix affiché non honoré).
5. **Dead code trompeur** : le flush sendBeacon et le système use-toast donnent l'illusion de garanties (persistance, notifications) qui n'existent pas — le pattern « code mort à fausse assurance » a déjà mordu (Dette 44 : toasts muets).

## Opportunités / améliorations proposées

| Amélioration | Effort | Impact |
|---|---|---|
| Corriger/supprimer le flush `sendBeacon` (fetch keepalive + headers, ou suppression assumée — le debounce 1,5 s couvre presque tout) | 0,25 j | Élimine un faux filet de sécurité ; vraie persistance on-close |
| Mise à jour CLAUDE.md : comptes réels, `src/utils/`, stack forms réelle, recharts retiré, pointer `supabaseAction` comme pattern canonique | 0,25 j | Fort — fiabilise chaque session IA future |
| Purge dead code : 7 deps npm, 22 primitives ui/, 5 composants orphelins, système use-toast, entrée `vendor-recharts` | 0,5 j | Install plus rapide, surface d'audit réduite, `ANALYZE=1` plus lisible |
| Factory de queryKeys (`src/lib/queryKeys.ts`) + migration mécanique des 176 useQuery / 200 invalidations | 1-1,5 j | Invalidations fiables, refactors sûrs, prérequis au 10x |
| Adopter RHF + zodResolver (déjà en deps) sur les 3 formulaires géants (AddProductForm, PartnerProfileForm, ProductForm admin) — ou retirer les deps et documenter le choix hand-rolled | 3-4 j (ou 0,1 j) | −30/40 % de lignes sur les monolithes, validation déclarative réutilisant les schémas zod specs/ |
| Re-fetch des produits favoris/panier au mount (batch `fetchProductsByIds`) pour rafraîchir les prix des snapshots | 0,5 j | Supprime le risque prix périmés B2B |
| ErrorBoundary par route (wrapper dans `App.tsx`) + hook d'un reporting minimal (même un insert Supabase `frontend_errors`) | 0,5-1 j | Une page cassée ne tue plus l'app ; première observabilité front |
| Règle d'or « nouveau fichier-section < 500 l » inscrite dans CLAUDE.md + découpage opportuniste des hubs Pro Service (récents, encore mous) | 0,5 j doc + continu | Stoppe la production de nouveaux god components |
| `esbuild: { drop: ["console", "debugger"] }` en build prod dans vite.config.ts | 0,1 j | Hygiène prod immédiate |
| Activer `noUnusedLocals`/`noUnusedParameters` (moins violent que `strict`) comme 1re étape du resserrement TS | 0,5 j | Détection automatique du code mort à la source |

## Top 5 recommandations priorisées

1. **Fixer le flush `sendBeacon` du panier** (`ProjectCartContext.tsx:320-325`) — bug réel, 2 h, dans un flux cœur de métier (panier projet B2B).
2. **Resynchroniser CLAUDE.md avec la réalité du code** (stack forms, `src/utils/`, comptes, deps mortes) — dans un modèle « IA seul développeur », c'est l'investissement au meilleur ratio impact/effort du repo.
3. **Trancher la question formulaires** : soit adopter réellement RHF+zod sur les 3 formulaires géants, soit retirer les deps et acter le pattern hand-rolled — l'entre-deux actuel est le pire des mondes et alimente les monolithes.
4. **Factory de queryKeys centralisée** — 200 invalidations sur littéraux dispersés est la bombe à retardement silencieuse du passage à 10x features.
5. **Purge du dead code + garde-fou taille de fichier** (deps orphelines, 22 primitives ui/, 5 composants, use-toast ; règle < 500 l/fichier-section) — réduit la surface de contexte que l'IA doit charger et empêche la dette de monolithisation de se reproduire sur Pro Service et les prochains chantiers.