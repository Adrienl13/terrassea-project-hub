## Synthèse (5-10 lignes)

La chaîne CI a été exécutée intégralement en local : **install OK, lint OK (0 erreur / 303 warnings), tests 635/635 verts, build OK en 16,4 s**. Mais la découverte majeure est que **l'étape "Type check" du CI est un no-op complet** : `bunx tsc --noEmit` sur le tsconfig racine (`"files": []` + `references`, sans `--build`) vérifie **0 fichier** (0,2 s). Un vrai typecheck (`tsc -p tsconfig.app.json`) révèle **88 erreurs de type réelles** concentrées sur les composants brand/partner-dashboard, dont 2 vraies erreurs de duplication de clés dans `intentDetector.ts`. Le garde-fou "tsc bloque les merges" annoncé dans CLAUDE.md est donc fictif depuis probablement des mois. S'ajoutent : **54 vulnérabilités dépendances (1 critique, 29 high)** dont `xlsx` 0.18.5 (direct, exposé aux fichiers uploadés par les partenaires) et `react-router` 7.13.2, aucune étape d'audit sécu dans le CI, et des tests qui échouent localement sans variables d'env Supabase (5 fichiers).

## Forces

- **Suite de tests bien plus riche que documentée** : 48 fichiers Vitest / 635 tests (CLAUDE.md dit "7 fichiers") — tous verts en 16,2 s. Doc en retard, réalité en avance.
- **Build production sain et rapide** : 16,4 s, 171 chunks JS, dist total 6,3 Mo, aucun chunk > 500 kB (max : `Admin` 458,67 kB / 98,67 kB gzip — admin-only, acceptable).
- **manualChunks bien pensé** dans `vite.config.ts` (8 groupes vendor) + visualizer opt-in (`ANALYZE=1`) déjà en place.
- **i18n lazy-loading déjà implémenté** (Dette 98 résolue) : payload initial ≈ **210 kB gzip** (index 34 + react 59 + supabase 46 + ui 42,5 + i18n 17 + query 12), les 4 locales (~70-77 kB gzip chacune) chargées à la demande.
- **xlsx et pdf-lib en dynamic import** (`ExcelImportModal.tsx:191`, `pdfCoverPage.ts:113`) — pas dans le payload initial.
- Lint : **0 erreur**, uniquement des warnings.
- Lockfiles : les 3 sont synchronisés (même commit `d359a7d`, 2026-06-01), `--frozen-lockfile` passe sans modification.

## Faiblesses / problèmes détectés

- **CRITIQUE — L'étape type-check du CI ne vérifie rien.** `.github/workflows/ci.yml` (step "Type check") exécute `bunx tsc --noEmit` sur `tsconfig.json` racine qui a `"files": []` + `references` sans `--build` : `--listFiles` confirme **0 fichier compilé** (0,22 s). Le vrai check `bunx tsc --noEmit -p tsconfig.app.json` sort **88 erreurs** en 57,7 s : 67× TS2339 (propriétés inexistantes), 5× TS2769, 4× TS2589, 4× TS2345, 2× TS2739, 2× TS1117, etc. Fichiers les plus touchés : `src/components/partner-dashboard/BrandNetworkOverview.tsx` (21), `src/components/admin/AdminBrandManagement.tsx` (19), `src/components/partner-dashboard/BrandCatalogueSection.tsx` (18), `src/pages/ProductDetail.tsx` (6, propriété `owner_brand_id` absente de `DBProduct` — types Supabase probablement désynchronisés du schéma prod), `src/components/admin/referentials/ReferentialCRUD.tsx` (5, noms de tables en `string` non assignables aux types générés).
- **HAUTE — 2 vraies erreurs de code** : `src/engine/intentDetector.ts:152` et `:510` (TS1117, clés dupliquées `verde` IT/ES et `alta` IT/ES dans des littéraux objet — valeurs identiques donc sans impact runtime aujourd'hui, mais bombe à retardement si une traduction diverge).
- **HAUTE — 54 vulnérabilités deps (1 critique, 29 high, 20 moderate, 4 low)**, aucune étape `bun audit` dans le CI. Exposition runtime réelle : **`xlsx` 0.18.5** (dépendance directe, 2 advisories HIGH : prototype pollution GHSA-4r6h-8v6p-xvw6 + ReDoS — parse côté client de fichiers Excel uploadés par les partenaires, vecteur d'attaque réel ; npm est figé à 0.18.5, le fix nécessite le CDN SheetJS ≥ 0.19.3) ; **`react-router` 7.13.2** (10 advisories dont open redirect via `<Link>`/`useNavigate` GHSA-wrjc-x8rr-h8h6 applicable en mode SPA). Le critique (vitest UI) et la plupart des autres sont dev-only.
- **HAUTE — Tests non hermétiques** : `bun run test` sans `VITE_SUPABASE_URL` fait échouer **5 fichiers sur 48** ("supabaseUrl is required", `src/integrations/supabase/client.ts:11` instancié au module-load via `src/engine/supplierEngine.ts:1` — alors que CLAUDE.md affirme "les engines n'appellent pas Supabase directement"). Le CI masque le problème en injectant les secrets prod dans l'étape test.
- **MOYENNE — 303 warnings ESLint non gatés** (239 `no-unused-vars`, 36 `react-refresh/only-export-components`, 26 `react-hooks/exhaustive-deps`) : pas de `--max-warnings` dans le script lint, le stock ne peut que croître. Les 26 `exhaustive-deps` sont des bugs potentiels (stale closures), ex. `Partners.tsx:341`, `ProjectBuilder.tsx:154`, `ProjectCart.tsx:198`.
- **MOYENNE — `recharts` est une dépendance morte** : seul `src/components/ui/chart.tsx` l'importe et **aucun fichier n'importe chart.tsx** ; le chunk `vendor-recharts` fait 409 octets (tree-shaké) mais est modulepreloadé dans `index.html`, et recharts tire `lodash` avec 3 advisories. CLAUDE.md la liste pourtant dans la stack.
- **MOYENNE — Dérive de versions** : jsdom 20.0.3 (courant : 30), react-day-picker 8.x, vaul 0.9.9, sonner 1.7.4, @hookform/resolvers 3.x, zod 3 (v4 dispo), Vite 5.4 (v8 courant), les 27 packages Radix tous en retard de patch.
- **BASSE — 3 lockfiles coexistants** (`bun.lock` 160 kB, `bun.lockb` 247 kB, `package-lock.json` 309 kB) — dette déjà connue (§2), toujours pas purgée ; `package-lock.json` n'est utilisé par rien.
- **BASSE — CI minimaliste** : pas de pin de version bun (`setup-bun@v2` = latest, dérive possible), `setup-node@v4` probablement inutile, pas de `concurrency` (cancel-in-progress), pas de `timeout-minutes`, pas de cache, pas d'upload d'artefact build, pas de job séparé (tout séquentiel dans un seul job).

## Risques

1. **Régression de types silencieuse en production** : n'importe quel code faux au niveau types merge aujourd'hui — les 88 erreurs prouvent que c'est déjà arrivé (probablement lors du chantier brand). `owner_brand_id` absent de `DBProduct` suggère des types Supabase générés obsolètes → risque de bug runtime réel sur `ProductDetail`/`BrandPage`.
2. **Vecteur d'attaque via upload Excel partenaire** (xlsx vulnérable, parse client-side de fichiers non fiables) — incompatible avec la règle "security gaps = non acceptable" de CLAUDE.md.
3. **Secrets prod injectés dans l'étape test du CI** : un test (ou une dépendance compromise) peut lire `VITE_SUPABASE_URL`/clé publishable — impact limité (clé publique) mais habitude dangereuse ; surtout, les tests peuvent en théorie toucher la vraie DB.
4. **Réactivation du garde-fou = friction brutale** : corriger le CI sans corriger les 88 erreurs bloque tous les merges d'un coup.
5. **Dérive doc/code** : CLAUDE.md (7 fichiers de tests, recharts "utilisé", engines "sans Supabase") induit en erreur les futures sessions IA — coût réel dans un setup solo-founder + IA.

## Opportunités / améliorations proposées

| Amélioration | Effort | Impact |
|---|---|---|
| Corriger le CI : `bunx tsc --noEmit -p tsconfig.app.json` (ou `tsc -b`) + résorber les 88 erreurs (concentrées sur ~8 fichiers, dont régénération des types Supabase pour `owner_brand_id`) | 1-1,5 j | Restaure le seul garde-fou de types du projet ; élevé |
| Ajouter `bun audit --audit-level=high` (ou job hebdo dédié + Dependabot/Renovate) au CI | 0,25 j | Détection continue des CVE ; élevé |
| Migrer `xlsx` vers SheetJS CDN ≥ 0.20.2 ou remplacer (le parse est déjà derrière un dynamic import unique dans `ExcelImportModal.tsx`) | 0,5 j | Ferme le vecteur upload partenaire ; élevé |
| Mock Supabase dans `src/test/setup` (ou factory lazy du client) pour rendre les tests hermétiques et retirer les secrets de l'étape test | 0,5 j | Tests reproductibles offline, CI moins privilégié ; moyen |
| `eslint --max-warnings 303` (cliquet dégressif) dans le script lint | 0,1 j | Gèle le stock de warnings ; moyen |
| Supprimer `recharts` + `ui/chart.tsx` + entrée manualChunks, purger `package-lock.json`, mettre à jour CLAUDE.md (48 fichiers tests, stack) | 0,25 j | -1 dep vulnérable (lodash), doc fiable ; moyen |
| Durcir ci.yml : pin `bun-version`, `concurrency: cancel-in-progress`, `timeout-minutes: 15`, retirer setup-node si inutile | 0,25 j | Robustesse/coût CI ; faible-moyen |
| `bun update` (patchs compatibles : Radix, postcss, autoprefixer, typescript-eslint 8.65…) puis upgrades majeures ciblées (jsdom, react-router patché) | 0,5-1 j | Résorbe ~la moitié des advisories ; moyen |
| Compression build : `vite-plugin-compression` (brotli pré-généré) — utile seulement si Vercel ne suffit pas (Vercel sert déjà brotli) → probablement à ne PAS faire | 0 j | Nul — déjà couvert par Vercel |

## Top 5 recommandations priorisées

1. **[CRITIQUE] Réparer l'étape type-check du CI** (`bunx tsc --noEmit -p tsconfig.app.json`) **et résorber les 88 erreurs** — commencer par régénérer les types Supabase (`owner_brand_id`), puis les 3 fichiers brand (58 erreurs à eux trois) et les 2 duplications de clés `intentDetector.ts:152,510`. Sans ça, "Failing CI blocks merges" est une fiction. (~1,5 j)
2. **[HAUTE] Traiter `xlsx` 0.18.5** (2 CVE high, dépendance directe exposée aux uploads partenaires) — migration CDN SheetJS ou lib alternative. (0,5 j)
3. **[HAUTE] Ajouter `bun audit` au CI** + passe de mise à jour deps compatibles (`bun update`) pour purger le gros des 54 advisories, react-router en tête. (0,75 j)
4. **[MOYENNE] Rendre les tests hermétiques** (mock du client Supabase, retrait des secrets de l'étape test) — 5/48 fichiers échouent aujourd'hui hors CI. (0,5 j)
5. **[MOYENNE] Cliquet anti-régression lint** (`--max-warnings` au niveau courant 303, à faire décroître) + nettoyage `recharts`/`package-lock.json` + mise à jour CLAUDE.md (48 fichiers de tests, pas 7 ; engines important bien Supabase via `supplierEngine`). (0,5 j)

**Chiffres bruts d'exécution** : install `--frozen-lockfile` OK 0,04 s (cache chaud, 616 packages) · lint 10,6 s → 0 erreur / 303 warnings · `bunx tsc --noEmit` (commande CI) 0,22 s → **0 fichier vérifié** ; `tsc -p tsconfig.app.json` 57,7 s → **88 erreurs** · tests 16,2 s → 48 fichiers / **635 tests, 100 % verts** (avec env Supabase ; 5 fichiers FAIL sans) · build 16,4 s → dist 6,3 Mo, 171 chunks JS, max `Admin` 458,67 kB (98,67 gzip), aucun warning Vite >500 kB, payload initial ≈ 210 kB gzip · `bun audit` : **54 vulnérabilités (1 critical / 29 high / 20 moderate / 4 low)**.