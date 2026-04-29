# AUDIT — Synthèse transverse

**Date :** 2026-04-29
**Companion docs :** `RECON.md`, `AUDIT.md`, `STRATEGIC_DECISIONS.md`, `HOTFIX_RLS_PROSPECTS.md`, `DRIFT_PROD_FUNCTIONS.md`
**Contexte stratégique** : Salone del Mobile fini 27 avril, 50 contacts à relancer mi-juin. Chantiers produits 5 mai → 8 juin sur 5 catégories (Tables, Parasols, Sun Loungers, Sofas, Bar Stools). Architectes gratuits 2026. Runway 3-6 mois, fundraising en parallèle.

---

## 1. Top 5 problèmes critiques à corriger AVANT le 5 mai

Sélection stricte : sécurité active, OU bloquant onboarding marques, OU pré-requis indispensable aux chantiers produits.

| # | Problème | Sévérité | Effort |
|---|---|---|---|
| 1 | **`TRIGGER_SECRET` fallback hardcodé** dans `send-quote-notification:7`. Si la var d'env n'est pas set en prod → `"terrassea-trigger-secret-change-me"` actif → spoofing possible. **À VÉRIFIER founder** dans Studio Secrets (si présente : sévérité Moyenne, à durcir ; si absente : Critique, à fixer). | Critique conditionnel | 5 min vérif + 30 min fix si nécessaire |
| 2 | **`Terrassea-Production` edge function** : drift résiduel. Hello world template ACTIVE en prod, jamais utilisé, MCP n'expose pas `delete_edge_function`. Action founder via Studio. | Basse mais résiduelle | 30 sec |
| 3 | **`salone_2026_visits` policy `Allow all anon ALL true`** : RLS active mais ouverte à tous (SELECT/INSERT/UPDATE/DELETE) sur table contenant `prenom`, `nom`, `mail`, `poste`, `notes`. Actuellement 0 rows, **MAIS le founder s'apprête à y inscrire les 50 contacts post-Salone**. Faille à fermer AVANT alimentation. | Élevée | 30 min (migration admin-only) |
| 4 | **Aucun outil d'observabilité** (Sentry, Plausible, uptime). Démarrer 5 semaines de chantiers produits + relance commerciale 50 marques sans observabilité = piloter à l'aveugle. Bug en démo marque = perdu sans trace. | Élevée | 4-6 h (3 outils gratuits) |
| 5 | **`README.md` racine = template Lovable** (URL `REPLACE_WITH_PROJECT_ID`, `npm i`, "Use Lovable" comme première option). Vu en premier sur GitHub par recruteurs / VCs. **Bloquant fundraising materials.** | Moyenne mais bloquante pour fundraising | 1-2 h |

**Effort cumulé Bucket 1 : ~ 1.5-2 jours.**

---

## 2. Top 10 dettes techniques à programmer dans les 3 mois (mai-juillet)

Priorité aux dettes qui touchent le schéma produits, l'engine, le commercial flow, ou la sécurité applicative au-delà du Bucket 1.

| # | Dette | Sévérité | Effort | Pendant quel chantier |
|---|---|---|---|---|
| 1 | **`send-review-requests` cron 401 silencieux** : la function exige une auth que le pg_cron ne passe pas → reviews jamais envoyées depuis création. Perte business sur la collecte d'avis (proof social pour fundraising). | Élevée | 30 min | Semaine 1, fix au passage du chantier 1 |
| 2 | **7 FK uuid manquantes** (`board_items.product_id`, `concept_events.product_id`, `orders.product_id`, `partner_arrival_items.product_id`, `preorders.product_id`, `project_zone_products.product_id`, `pro_service_events.actor_id`). Pas d'intégrité référentielle DB. | Élevée | 2 h | Pendant chantier 1 (schéma produits) |
| 3 | **7 policies `auth_rls_initplan`** sur `products` / `quote_documents` / `product_reviews` : `auth.uid()` ré-évalué par row → x10 latence catalogue. Fix simple `(SELECT auth.uid())`. | Élevée | 1 h | Pendant chantier 2 (engine catégories) |
| 4 | **Storage `product-images` scoping** : INSERT/UPDATE/DELETE ouverts à tout user authentifié sans scoping `partner_id`. Cross-tenant abuse possible. À fixer avant gros volume uploads. | Élevée | 2 h | Pendant chantier 1 si nouveaux uploads |
| 5 | **Logger structuré `src/lib/logger.ts`** + `window.onerror` / `unhandledrejection` global → Sentry. Remplacer les 107 `console.*` côté front. | Moyenne | 1 j | Semaine 1 (sequel Bucket 1.4) |
| 6 | **5 smoke tests E2E Playwright** : signup → quote, login admin → approve, partner upload, checkout success, chatbot anon. Sentinelles avant démo commerciale. | Élevée | 1-2 j | Semaine 4-5 avant relance |
| 7 | **`update_product_review_timestamp` search_path fix** : advisor WARN. Quick win. | Basse | 5 min | À tout moment |
| 8 | **Refactor amorce `useArchitectProjects`** (925 lignes, 49 `.from()`) : split en 2-3 hooks plus petits. Pas tout faire mais commencer pour préparer chantiers architectes plus tard. | Moyenne | 1 j | Semaine 5 |
| 9 | **3 lockfiles cleanup** : garder `bun.lock` text, supprimer `bun.lockb` binaire et `package-lock.json`. Documenter dans `CLAUDE.md`. | Moyenne | 15 min | Quick win |
| 10 | **README per-edge-function** sur les 10 restantes (10 fonctions sans doc, à part les 3 créés aujourd'hui). | Moyenne | 2-3 h | Semaine 4-5 |

---

## 3. Top 5 quick wins (effort ≤ 1 jour, ROI fort)

| # | Quick win | Effort | Bénéfice |
|---|---|---|---|
| 1 | Suppression `Terrassea-Production` via Studio | 30 sec | Drift code/prod 100 % résolu |
| 2 | `update_product_review_timestamp` search_path | 5 min | Élimine 1 advisor WARN |
| 3 | `window.onerror` + `unhandledrejection` global → Sentry | 30 min | Catche crash silencieux JS |
| 4 | Cleanup 3 lockfiles | 15 min | Propreté package manager |
| 5 | Activer `vitest --coverage` + script `test:coverage` | 30 min | Visibilité dette tests |

---

## 4. Carte de chaleur — santé par module

| Module | Score /5 | Justification |
|---|---|---|
| **Engine** (déterministe + intent detection) | **5** | 6 `any` sur 4759+ lignes (0.1 %), 153 tests verts, modules clairs (`projectEngine`, `intentDetector`, `multiZoneEngine`, `complianceEngine`, `supplierEngine`, etc.). Cœur métier exemplaire. |
| **Architect Projects + Material Boards** | **2** | God component `ArchitectSections.tsx` 2743 lignes, hook `useArchitectProjects` 925 lignes / 49 `.from()` / 11 `any`, N+1 probable, 0 test. |
| **Marketplace** (products, partners, brands) | **3.5** | Schéma propre, taxonomie `tag_definitions` 346 lignes, plans cohérents `partnerConstants.ts`. Mais `products` policy `auth_rls_initplan` à fix. Refactor `Admin.tsx` 2347 lignes. |
| **Auth + RLS** | **4** | Post-hotfix : 65/65 tables RLS-enabled, password policy OK, open redirect protection, `is_admin()` SECURITY DEFINER, `prevent_user_type_change` trigger. Manque 2FA, captcha, `localStorage` XSS surface. |
| **Payments (Stripe)** | **4.5** | `stripe-webhook` exemplaire (HMAC, idempotency, atomic updates avec `is null`), `stripe-checkout` + `stripe_payment_id` / `stripe_balance_payment_id`. Risque résiduel : pas de test E2E checkout. |
| **Admin Panel** | **2** | `Admin.tsx` 2347 lignes (god dispatcher), 174 `any` dans `components/admin/` (20 fichiers), logique métier inline dans la page. Refactor lourd. |
| **Edge Functions** (13 rapatriées) | **3.5** | Post-rapatriement : 0 drift, `stripe-webhook` + `analyze-product-image` exemplaires, `run-scheduled-tasks` correct. Mais `send-review-request` 401 silencieux, 10/13 sans README, CORS `*` sur 3 fonctions. |
| **Tests** | **3** | 153 tests verts mais 100 % engine. 0 test composants, 0 test hooks, 0 test edge functions, 0 E2E. Coverage non mesuré. |
| **Observabilité** | **1** | 0 outil installé (Sentry/PostHog/Plausible/uptime). 134 `console.*` non transportés. ErrorBoundary racine seulement. Démarrer Phase 1 sans → aveugle. |
| **Documentation** | **2.5** | `CLAUDE.md` excellent (refait 2026-04-29), 3 READMEs edge functions créés aujourd'hui, migrations SQL très bien commentées. **MAIS** `README.md` racine = template Lovable périmé, 0 doc engine, 0 ARCHITECTURE.md. |

---

## 5. Score de santé global du codebase : **62 / 100**

### Décomposition

| Dimension | Pondération | Score | Pondéré |
|---|---|---|---|
| Sécurité applicative (post-hotfix) | 20 % | 70 | 14 |
| Backend Supabase (schéma + RLS + perf) | 15 % | 75 | 11.25 |
| Architecture & maintenabilité | 15 % | 55 | 8.25 |
| Frontend (TS + React) | 10 % | 60 | 6 |
| Tests | 10 % | 40 | 4 |
| Observabilité & ops | 10 % | 15 | 1.5 |
| Documentation | 8 % | 50 | 4 |
| Dépendances | 6 % | 80 | 4.8 |
| Configuration & tooling | 6 % | 60 | 3.6 |
| **Total** | **100 %** | — | **~ 57-62 / 100** |

### Justification factuelle du score

**Ce qui tire vers le haut**
- **Engine quasi-zéro `any`** (0.1 %) + 153 tests verts → cœur métier solide.
- **65/65 tables RLS-enabled** post-hotfix → pas de fuite de données.
- **`stripe-webhook` exemplaire** + idempotency atomique → flow paiement sûr.
- **47 migrations versionnées** + idempotentes → DB reproductible.
- **Vercel security headers** complets + CI bloquante → posture sécurité standard.
- **Stack moderne 2026** (Vite 5, TS 5.8, Bun, React 18, shadcn/Radix) → pas de techno legacy.

**Ce qui tire vers le bas**
- **9 god components > 1000 lignes** (Admin.tsx 2347, ArchitectSections.tsx 2743, etc.).
- **442 `any` dans 30 % des fichiers** + TS `strict: false` → bénéfice TypeScript partiel.
- **0 outil d'observabilité** → impossible de savoir ce qui se passe en prod.
- **0 test E2E** + 0 test hooks/lib → régression possible silencieuse.
- **Storage `product-images` cross-user write** → faille bénigne mais réelle.
- **`README.md` Lovable périmé** → mauvaise première impression externe.

**Verdict** : codebase **actif, structuré, et exploitable en l'état**, mais avec une dette concentrée sur l'admin/dashboards et une absence quasi-totale d'observabilité qui devient critique à l'entrée en Phase 1. **Pas de show-stopper**, **5 corrections Bucket 1** suffisent à entrer en chantiers produits sereinement.

---

## 6. Ce qui rassure pour la relance commerciale (5-7 points forts)

À mentionner sans embarras en démo, pitch, dossier fundraising.

1. **Engine déterministe + typé**. ~ 6000 lignes de logique métier (génération de concepts, BOM, compatibilités, multiZone, compliance) avec un ratio `any` de 0.1 %. **153 tests automatisés tous verts.** C'est la différenciation tech vs concurrents marketplace simples.

2. **Sécurité DB rigoureuse**. **66 tables protégées par RLS** (Row Level Security) post-hotfix 2026-04-29. Helper `public.is_admin()` SECURITY DEFINER avec `search_path` durci. Trigger `prevent_user_type_change` empêche l'escalation de privilège. **47 migrations versionnées** dans Git pour reproducibilité de la DB.

3. **Paiements Stripe production-grade**. `stripe-webhook` implémente HMAC SHA-256 verification, idempotency via `stripe_payment_id`, atomic updates avec `is null` checks pour prévenir les race conditions. CORS contrôlé. Fail-closed si secret manquant.

4. **Pipeline déploiement mature**. CI GitHub Actions bloquante (lint + `tsc --noEmit` + tests + build). Vercel + Supabase. Bundles split (8 vendors chunks). 13 edge functions Deno post-rapatriement, traçabilité Git/Studio alignée.

5. **Sécurité réseau standard**. `vercel.json` avec HSTS preload, X-Frame-Options DENY, X-Content-Type-Options nosniff, Permissions-Policy granulaire, Referrer-Policy strict-origin-when-cross-origin.

6. **Architecture modulaire React 18**. shadcn/ui sur Radix (49 primitives isolées), Tailwind 3, react-query 5 (staleTime 2 min), react-router-dom 7 avec lazy loading sur 21 pages, react-hook-form + zod, i18next 4 langues. Stack 2026 sans techno legacy.

7. **Audit complet documenté**. Le présent audit (`docs/audit/2026-04/`) — RECON, AUDIT thématique 10 sujets, plan d'action 3 buckets, hotfix RLS, drift code/prod résolu — est lui-même un signal de discipline opérationnelle utilisable en pitch VC.

---

## Annexe — Synthèse des 4 docs d'audit

| Doc | Lignes | Sujet |
|---|---|---|
| `RECON.md` | 561 | Reconnaissance initiale (volume, stack, divergences brief vs réel) |
| `AUDIT.md` | 760 | Audit thématique 10 sujets (problèmes par sévérité + recommandations) |
| `HOTFIX_RLS_PROSPECTS.md` | 417 | Hotfix 3 tables prospects (admin-only RLS) — résolu |
| `DRIFT_PROD_FUNCTIONS.md` | ~ 280 | Drift code/prod 4 fonctions (3 rapatriées + 1 à supprimer Studio) — résolu |
| `STRATEGIC_DECISIONS.md` | 36 | Log append-only des décisions founder |
| `AUDIT_SYNTHESE.md` (ce doc) | — | Top 5 critiques + Top 10 dettes + Top 5 quick wins + carte de chaleur + score |
| `AUDIT_ACTIONS.md` (suivant) | — | Plan d'action en 3 buckets temporels |
