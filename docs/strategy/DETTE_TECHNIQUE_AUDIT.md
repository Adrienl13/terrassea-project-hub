# Audit dette technique — Terrassea Hub

**Date audit** : 2026-05-05
**Contexte** : Recadrage stratégique post-Salone vers framing 
long-terme

## Niveau 1 — Critiques (fix dans les 1-2 semaines)

### Dette 9 — Transactionnel approveAsNew

**Origine** : ÉTAPE 7 (matérialisation variants)
**Impact** : approveAsNew n'est pas atomique. Si crash entre 
INSERT product et INSERT variants, l'état DB est partiel et 
incohérent.
**Fix** : Refactor en edge function transactionnelle Supabase 
ou en transaction PostgreSQL explicite (BEGIN / COMMIT / 
ROLLBACK).
**Risque non-fix** : corruption données possible en production.
**Effort** : 0.5-1 jour

### Dette 10 — Refactor RLS pour inliner les helpers

**Origine** : Incident prod 2026-05-05 (RLS anon EXECUTE)
**Impact** : Les RLS policies de products / product_variants / 
product_media référencent is_brand_member et is_brand_owner. 
A déjà causé un incident prod (terrassea.com 0 produits 
pendant 4 jours).
**Fix** : Inliner la logique helper dans les RLS policies via 
sub-EXISTS clauses. Plus de dépendance EXECUTE sur fonctions.
**Risque non-fix** : reproduction incident si modification 
permissions futures.
**Effort** : 0.5 jour
**Statut : FIXED 2026-05-05** (commit 1c23eec, verified 48/48 cells, REST API HTTP 200)
**Note** : DROP des fonctions helpers (is_brand_member, is_brand_owner) planifié 1-2 semaines après observation prod stable, à programmer pour mi-mai 2026.

### Dette 2 — variant_id persistence dans project_cart_items

**Origine** : ÉTAPE 9a-fix-2 γ-2
**Impact** : Le panier en BDD ne stocke pas la variant Modèle 
B choisie. Si l'acheteur revient demain, il perd la variant.
**Fix** : ALTER TABLE project_cart_items ADD COLUMN 
variant_id uuid REFERENCES product_variants(id). Migration + 
adaptation code persistence.
**Risque non-fix** : perte de données utilisateur, expérience 
dégradée.
**Effort** : 0.5-1 jour

### Dette 3 — variant_id persistence dans quote_requests

**Origine** : ÉTAPE 9a-fix-2
**Impact** : Quand l'acheteur soumet une demande de sourcing, 
la variant n'est pas dans la requête. Le commercial doit 
deviner ou re-demander.
**Fix** : Idem dette 2 mais sur quote_requests.
**Risque non-fix** : friction commerciale, pertes de deals.
**Effort** : 0.5-1 jour

### Dette 19 — Notifications cross-user phishing risk

**Origine** : Audit Dette 18 phase 1+2 (2026-05-06)
**Impact** : La table `notifications` (206 rows actifs) permet à n'importe quel user authentifié d'INSERT une notification avec n'importe quel `user_id` cible. Vecteur phishing potentiel inter-user (User A crée fausse notif pour User B).

Le métier nécessite cross-user inserts légitimes (admin→partner, partner→client) → fix non trivial.

**3 options identifiées** :

**A) Status quo + risque accepté** (effort 0)
- Documenter et monitorer
- Acceptable tant que population utilisateurs limitée

**B) RPC SECURITY DEFINER refactor** (effort 0.5-1j)
- Functions dédiées par cas d'usage : `create_notification_admin_to_partner`, etc.
- INSERT direct depuis frontend impossible
- Pattern propre long-terme
- Refactor 30+ fichiers consommateurs

**C) RLS conditionnelle** (effort 0.5j)
- INSERT autorisé si `user_id=auth.uid()` (auto-notif) OR `is_admin()` OR sender est partner/client de la cible
- Pas de refactor frontend
- Validation exhaustive complexe (toutes paires possibles)

**Risque non-fix** : phishing interne (peu probable mais possible), surtout si la base utilisateurs grandit.

**Effort recommandé** : Option B (RPC SECURITY DEFINER) en session dédiée 1-2h après recensement précis des cas d'usage cross-user.

**Statut** : à fixer en session dédiée.

## Niveau 2 — Importantes (fix dans le mois)

### Dette 1 + 12 — i18n incomplète ProductDetailDrawer

Labels "Available for immediate dispatch", "Lead time", etc. 
hardcoded en anglais. Acheteurs FR/IT/ES voient de l'anglais 
sur le panel cart.
**Effort** : 1-2 heures

### Dette 11 — Refactor partner.slug "adrien-laniez" → "pros-import"

URL canonique contient "adrien-laniez" qui n'est pas un nom 
de marque. Affecte SEO et perception professionnelle.
**Effort** : 30 min (UPDATE + invalidation cache)

### Dette 4 — Validation zod schema variants partner

Aucune validation côté form partner pour empêcher 
combinaisons invalides (ex: in_stock=false && qty=null && 
!made_to_order).
**Effort** : 1-2 heures

### Dette 6 — i18n labels StockBadge

Labels FR uniquement. À étendre aux 4 locales (en/fr/it/es).
**Effort** : 30 min

### Dette 13 + 14 — Server-side redirect pour SEO

Redirect actuel client-side (React Router). Pas un vrai 301 
HTTP reconnu par les crawlers.
**Fix** : vercel.json rewrites/redirects ou edge function.
**Effort** : 30-45 min

### Dette 16 — Erreur 400 product_reviews

**Origine** : Découverte 2026-05-05 lors de validation browser post-Dette 10
**Impact** : Console DevTools affiche 400 Bad Request sur GET /rest/v1/product_reviews?select=*..&status=eq.approved. Frontend probablement désynchronisé du schema DB. N'impacte pas l'utilisateur final visiblement.
**Fix** : Investiguer le caller. Vérifier le SELECT projection vs colonnes existantes en DB.
**Risque non-fix** : erreurs console répétées, possible défaillance silencieuse de fonctionnalités review.
**Effort** : 30 min - 1 heure

### Dette 17 — Erreur 400 partners

**Origine** : Découverte 2026-05-05 lors de validation browser /admin certifications
**Impact** : Console DevTools affiche 400 Bad Request sur GET /rest/v1/partners avec filter plan=in.(brand_member,brand_network). Filter probablement sur colonne inexistante ou renommée.
**Fix** : Identifier le caller. Vérifier la colonne plan sur partners et adapter la requête.
**Risque non-fix** : idem dette 16.
**Effort** : 30 min - 1 heure

### Dette 18 — 61 warnings advisors Supabase préexistants

**Origine** : Audit Supabase Advisors 2026-05-05 (post-Dette 10)
**Impact** : 61 warnings sécurité préexistants, dont :
- 7 RLS "Always True" sur tables sensibles (concept_events, notifications, partner_contact_requests, pro_service_requests, project_briefs, salone_2026_visits, scoring_snapshots)
- Function Search Path Mutable (update_product_review_timestamp)
- Materialized View in API (product_review_stats)
- Public Bucket Allows Listing (storage.product-images)
- Public Can Execute SECURITY DEFINER (check_partner_upgrade)

Les RLS "Always True" sur tables sensibles peuvent être de vraies failles de sécurité (exposition de données privées à anon).
**Fix** : Session dédiée d'audit RLS pour les 7 tables sensibles + classification des autres warnings.
**Risque non-fix** : Possible exposition de données privées ou exécution de fonctions sensibles depuis anon.
**Effort** : 0.5-1 jour pour audit complet et fix prioritaires

**Statut partiel 2026-05-06 sprint 1** : audit ciblé sur les 7 RLS Always True effectué (cf. session day 8). Résultat :
- 1 fix appliqué : salone_2026_visits (cat A, fuite PII potentielle)
- 5 documentées en faux positifs (cat B, formulaires publics intentionnels — voir nouvelle section "RLS Always True justifiées et acceptées")
- 1 nouvelle dette critique : Dette 19 (notifications, cat C, vecteur phishing inter-user)
- 1 hors scope : Dette 20 (project_briefs.contact_email pattern incohérent)

**Statut partiel 2026-05-06 sprint 2** : audit ciblé sur les 25 functions SECURITY DEFINER public + 1 search_path mutable. Résultat :
- 1 fix appliqué : `update_product_review_timestamp` (search_path explicite ajouté)
- 21 REVOKE EXECUTE appliqués sur trigger functions (14), cron/internal RPCs (3), admin RPCs (2 — `next_invoice_number`, `next_payment_reference`), user-scoped RPCs (1 — `reserve_preorder` revoke anon, garde authenticated), orphan future-use (1 — `create_notification`)
- 4 fonctions documentées en faux positifs (helpers RLS `is_admin`/`is_brand_member`/`is_brand_owner` + `fuzzy_search_products`, voir nouvelle section "Functions SECURITY DEFINER acceptées")
- 1 nouvelle dette : Dette 21 (cleanup orphan trigger functions)
- Réduction empirique : advisor 60 warnings → 19 warnings (-41).

Reste à auditer : 3 warnings (materialized_view_in_api, public_bucket_allows_listing, auth_leaked_password_protection) — sprint 3 future.

## Niveau 3 — Cosmétiques (continues)

### Dette 5 — selectedColor / selectedDimension @deprecated

Vocabulaire déprécié encore présent dans le code. Migration 
future pour clarté.

### Dette 7 — Cas DB invalide DEMO-T-160

Données de seed avec combinaison de flags invalide métier. 
À nettoyer ou corriger.

### Dette 8 — Édition admin variants avant approval

L'admin ne peut pas éditer les variants avant matérialisation.
À fixer pour flexibilité opérationnelle.

### Dette 15 — Tests E2E lourds

Beaucoup de scénarios validés uniquement par browser manuel.
À automatiser progressivement (Playwright).

### Dette 20 — project_briefs SELECT pattern incohérent

**Origine** : Audit Dette 18 phase 1 (2026-05-06)
**Impact** : Le RLS SELECT de `project_briefs` utilise `partners.contact_email = auth.email()` au lieu du pattern standard `partners.user_id = auth.uid()`. Si l'email d'un user authentifié diffère de l'email du contact partner (changement d'email ou structure multi-user dans une organisation), le scope ne fonctionnera pas.
**Fix** : Refactor de la RLS pour utiliser brand_users (cohérent avec les autres patterns RLS).
**Risque non-fix** : utilisateurs légitimes ne peuvent pas voir leurs briefs si emails désynchronisés.
**Effort** : 30 min - 1h

### Dette 21 — Cleanup orphan trigger functions

**Origine** : Audit Dette 18 sprint 2 (2026-05-06)
**Impact** : 3 functions sont SECURITY DEFINER mais n'ont aucun trigger associé ni aucun appel frontend :
- `notify_application_approved()`
- `notify_application_submitted()`
- `notify_quote_submitted()`

Code mort qui peut induire en erreur lors de futurs refactors. Permission EXECUTE déjà revoke dans le sprint 2, mais les fonctions restent en DB.

**Fix** : DROP des 3 fonctions orphelines après confirmation qu'elles ne sont plus prévues pour usage futur.
**Risque non-fix** : confusion lors de futurs développements, code mort persistant.
**Effort** : 15 min

## Tableau de tracking

| # | Dette | Niveau | Effort | Statut | Date fix |
|---|-------|--------|--------|--------|----------|
| 9 | approveAsNew transactionnel | 1 | 0.5-1j | À fixer | - |
| 10 | RLS refactor inline | 1 | 0.5j | **FIXED ✅** | **2026-05-05** |
| 2 | variant_id cart | 1 | 0.5-1j | À fixer | - |
| 3 | variant_id quote | 1 | 0.5-1j | À fixer | - |
| **19** | **notifications phishing risk** | **1** | **0.5-1j** | **À fixer** | - |
| 1+12 | i18n drawer | 2 | 1-2h | À fixer | - |
| 11 | partner.slug | 2 | 30min | À fixer | - |
| 4 | zod variants | 2 | 1-2h | À fixer | - |
| 6 | i18n StockBadge | 2 | 30min | À fixer | - |
| 13+14 | SEO redirect | 2 | 30-45min | À fixer | - |
| 16 | 400 product_reviews | 2 | 30min-1h | À fixer | - |
| 17 | 400 partners | 2 | 30min-1h | À fixer | - |
| 18 | 61 advisors warnings | 2 | 0.5-1j | **PARTIELLEMENT FIXED** | **2026-05-06** (cat A) |
| 5 | selectedColor deprecated | 3 | 1h | Continu | - |
| 7 | DB invalide seed | 3 | 30min | Continu | - |
| 8 | Édition admin variants | 3 | 2-3h | Continu | - |
| 15 | Tests E2E Playwright | 3 | Continu | Continu | - |
| 20 | project_briefs pattern incohérent | 3 | 30min-1h | À fixer | - |
| **21** | **cleanup orphan trigger functions** | **3** | **15min** | **À fixer** | - |

## Méta-règle

Toute nouvelle décision technique doit éviter d'ajouter 
à cette dette. Si on doit accepter un trade-off temporaire, 
il rejoint cette liste avec une justification.

## RLS Always True justifiées et acceptées

Certaines tables ont une RLS `WITH CHECK (true)` sur INSERT par design métier. L'advisor Supabase les flag mais ce sont des faux positifs documentés et acceptés.

### concept_events

- **RLS** : `INSERT public WITH CHECK (true)` ; SELECT scopé `is_admin()`
- **Justification** : analytics anonymes sur la phase de découverte produit. Intentionnel pour tracking utilisateurs non-loggés.
- **PII** : aucune (session_id, event_type, metadata)
- **Recommandation** : ajouter rate limiting via edge function pour prévenir spam (à programmer si besoin).

### partner_contact_requests

- **RLS** : `INSERT public WITH CHECK (true)` ; SELECT scopé `is_admin() OR partner_id IN (mes partners)`
- **Justification** : formulaire de contact public sur les pages partner. Lead capture intentionnel.
- **PII** : nom, email, téléphone, message — saisis par l'utilisateur lui-même volontairement.
- **Recommandation** : rate limiting + captcha invisible pour prévenir spam (à programmer si besoin).

### pro_service_requests

- **RLS** : `INSERT public WITH CHECK (true)` ; SELECT scopé `architect_id=auth.uid() OR client_user_id=auth.uid() OR partner via match OR is_admin()`
- **Justification** : formulaire public de demande Pro Service (architectes, clients). Lead capture pour le service.
- **PII** : fortes (client_name, client_email, client_phone, client_company) — saisies volontairement.
- **Recommandation** : rate limiting + validation email.

### project_briefs

- **RLS** : `INSERT public WITH CHECK (true)` ; SELECT scopé `brand_partner_id IN (mes brand partners via contact_email)`
- **Justification** : formulaire brief public, brand-routed pour distribution aux partners.
- **PII** : nom, email, company, siren, message.
- **Note** : le SELECT scope utilise `partners.contact_email = auth.email()` au lieu de `user_id`. Cf. Dette 20 (à investiguer hors scope).
- **Recommandation** : rate limiting + validation email.

### scoring_snapshots

- **RLS** : `INSERT public WITH CHECK (true)` ; SELECT scopé `is_admin()`
- **Justification** : analytics immutable de scoring. INSERT public intentionnel pour tracking utilisateurs anonymes.
- **PII** : aucune (session_id, parameters jsonb, concept_ids[], etc.)
- **Recommandation** : idem concept_events, rate limiting si abuse détecté.

## Functions SECURITY DEFINER acceptées et justifiées

Certaines fonctions doivent rester executable par anon/authenticated pour le fonctionnement légitime de l'app. L'advisor Supabase les flag mais ce sont des faux positifs documentés.

### Helpers RLS (3 functions)

- `is_admin()`
- `is_brand_member(check_brand_id uuid, check_user_id uuid)`
- `is_brand_owner(check_brand_id uuid, check_user_id uuid)`

**Justification** : `is_admin()` est utilisée par 102 RLS policies (vérifié 2026-05-06). PostgreSQL vérifie la permission EXECUTE au PLANNING TIME, pas au runtime (incident 2026-05-01 a prouvé que REVOKE casse production pendant 4 jours).

**Note** : `is_brand_member` et `is_brand_owner` ne sont plus utilisées en RLS depuis Dette 10 (refactor inline). Gardées pour observation 1-2 semaines, DROP planifié mi-mai 2026. À ce moment, ces 2 fonctions disparaîtront des warnings advisor naturellement.

### RPCs publics légitimes (1 function)

- `fuzzy_search_products(search_query text, lang text, category_filter text, limit_count integer)`

**Justification** : recherche publique de produits depuis le catalogue. Anon doit pouvoir l'exécuter pour la search bar publique (cf. `src/hooks/useProducts.ts`).

### RPC authenticated user (1 function)

- `reserve_preorder(p_arrival_item_id uuid, p_user_id uuid, p_product_id uuid, p_quantity integer)`

**Justification** : réservation pre-order par un utilisateur authentifié (cf. `src/hooks/useArrivals.ts`). EXECUTE retiré pour anon, conservé pour authenticated. Advisor flag persistant car authenticated peut toujours l'appeler — c'est intentionnel.

## Historique des fixes

### 2026-05-05 — Dette 10 (RLS refactor inline)

- Commit : 1c23eec
- Validation : 48/48 cells matched between pre-fix and post-fix baselines
- REST API : HTTP 200 confirmed (was 401 during incident 2026-05-01)
- Empirical evidence captured in Phase 3 récap (cf. transcript day 7 archive)
- Helper functions kept in DB for 1-2 weeks observation period before final DROP

### 2026-05-06 — Dette 18 sprint 1 (audit RLS Always True)

- Audit ciblé des 7 RLS "Always True" flagged par advisor
- 1 fix appliqué : salone_2026_visits (cat A — anon avait SELECT/INSERT/UPDATE/DELETE sur PII)
- Empirical validation pre/post : anon INSERT pré-fix=SUCCESS, post-fix=42501 RLS violation
- Advisor confirme suppression du flag salone (6 entries restantes = faux positifs documentés + cat C notifications)
- 5 documentées en faux positifs (cat B) : concept_events, partner_contact_requests, pro_service_requests, project_briefs, scoring_snapshots
- 1 nouvelle dette critique identifiée : Dette 19 (notifications phishing risk)
- 1 hors scope ajoutée : Dette 20 (project_briefs pattern incohérent)

### 2026-05-06 — Dette 18 sprint 2 (Cat E + Cat B)

- Audit ciblé des 25 functions SECURITY DEFINER public + 1 search_path mutable
- Classification :
  - 1 fix simple : `update_product_review_timestamp` search_path explicite ajouté
  - 21 REVOKE EXECUTE (PUBLIC, anon, authenticated) :
    - 14 trigger functions (jamais appelées via RPC, exécutées par Postgres trigger context)
    - 3 cron/internal RPCs (`expire_overdue_quotes`, `invoke_scheduled_tasks`, `run_reminder_notifications` — service_role only)
    - 2 admin RPCs (`next_invoice_number`, `next_payment_reference` — investigation paymentUtils confirmée admin-only)
    - 1 user-scoped RPC (`reserve_preorder` — anon revoked, authenticated kept)
    - 1 orphan future-use (`create_notification` — kept service_role for future Dette 19)
  - 4 documentées en faux positifs : `is_admin`, `is_brand_member`, `is_brand_owner`, `fuzzy_search_products`
  - 1 nouvelle dette : Dette 21 (cleanup orphan trigger functions)
- Empirical validation pre/post :
  - Pre-apply : 25 SECURITY DEFINER functions executable by anon
  - Post-apply : 4 (helpers RLS + public search) — conformément au plan
  - Spot checks : `notify_quote_submitted` anon=false ✓, `next_invoice_number` auth=false ✓, `reserve_preorder` auth=true ✓, `is_admin` anon=true ✓
- Advisor reduction : 60 warnings → 19 warnings (-41)
- Reste à auditer : 3 warnings (materialized_view_in_api, public_bucket_allows_listing, auth_leaked_password_protection) — sprint 3 future

## Initiatives stratégiques planifiées

### SEO/GEO Strategy (Q3 2026)

Voir docs/strategy/SEO_GEO_STRATEGY.md pour le plan complet.

Approche progressive en 3 phases :
- Phase 1 : Quick wins SEO/Schema sur l'existant (1-2j)
- Phase 2 : 3 pages "Solutions" pilotes (3-5j)
- Phase 3 : Industrialisation conditionnelle si Phase 2 positive (5-10j)

Conditionné à la résolution préalable des dettes critiques (9, 2, 3) et de la Dette 18 (audit RLS warnings).
