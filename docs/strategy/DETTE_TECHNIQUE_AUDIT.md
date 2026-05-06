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

**Statut FIXED 2026-05-06** : refactor en RPC SECURITY DEFINER `approve_product_submission_as_new`. PostgreSQL transaction implicite garantit l'atomicité. Élimine 3 problèmes :
- Risque CRITIQUE de duplication produit (crash entre offers INSERT et submission UPDATE → admin retry car submission encore `pending_review` → product créé en double). Éliminé par PG ROLLBACK.
- Silent-fail des offers (`console.warn` côté frontend → produits publiés sans offer). Éliminé : la RPC raise sur error d'INSERT.
- Fragilité du cleanup applicatif (DELETE products on variants fail pouvait lui-même échouer → orphan logged). Éliminé : PG ROLLBACK natif, plus de cleanup manuel.

Frontend hook `approveAsNew` (`src/hooks/useProductSubmissions.ts`) délègue les steps 8-12 à la RPC. Steps 1-7 + 9 (storage uploads, race-check UX, validation, slug gen) restent côté frontend.

Implementation : `jsonb_populate_record(NULL::table, payload)` pour mapping schema-resilient (nouvelles colonnes auto-picked-up sans modifier la RPC).

**Out of scope** :
- Storage orphans si RPC échoue après uploads → cron cleaner futur.
- `approveEdit` a un pattern similaire (UPDATE products + variants + submissions séquentiel) mais architecture différente → **Dette 23** créée.

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

**Statut 2026-05-06 (Phase 2A delivered)** :
- 2 RPCs SECURITY DEFINER créés : `create_self_notification` (P1 future-proof) et `create_admin_notification` (P2 admin → user)
- Colonne `sender_user_id` ajoutée pour audit logging (FK auth.users ON DELETE SET NULL)
- 14 callsites P2 refactorés vers `create_admin_notification` (8 fichiers : AdminQuoteWorkflow, ProductReviewHelpers, AdminFinancing, AdminOrderTracking, AdminMessages, AdminPartners, Admin, usePaymentFlow). Les 2 bulk inserts (AdminOrderTracking, AdminMessages) utilisent une boucle de RPC.
- ~50 % de la surface d'attaque cross-user fermée
- RLS tightening (DROP permissive INSERT policy) reporté à Phase 2A.2 final, après livraison Phase 2B
- 16 callsites P3 cross-user reportés à Phase 2B (ClientSections re-classifiés : 2 → quote-related)

**Roadmap Phase 2B** (16 P3 callsites, ~4-6h sur plusieurs sessions) :
- Phase 2B.1 — Quote-related (5 callsites) : `QuoteRequestModal` (2), `usePartnerQuotes` (1), `ProjectCart` (2 — quote acceptation/signature flow), `ClientSections` (2 — re-classifiés)
- Phase 2B.2 — Order-related (callsites depuis triggers DB déjà SECURITY DEFINER, peu de frontend)
- Phase 2B.3 — Brief-related (2 callsites) : `ProjectBriefModal`, `ProServiceClientHub`
- Phase 2B.4 — Partner-application (3 callsites) : `BecomePartner`, `PartnerProfileForm`, `PartnerCatalogueSection`
- Phase 2B.5 — Financing (1 callsite) : `FinancingRequestModal`
- Phase 2B.6 — Product approval (1 callsite) : `useProductSubmissions`
- Phase 2B.final — RLS tightening : DROP permissive INSERT policy, CREATE restrictive `WITH CHECK (user_id = auth.uid() OR is_admin())`

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

### Dette 23 — approveEdit transactionnel

**Origine** : Recon Dette 9 (2026-05-06)
**Impact** : la fonction `approveEdit` (`src/hooks/useProductSubmissions.ts:607`) effectue plusieurs UPDATE séquentiels non-transactionnels :
- UPDATE products
- UPDATE product_variants (potentiellement plusieurs)
- UPDATE product_submissions

**Pattern différent de Dette 9** : UPDATEs au lieu d'INSERTs, donc pas de risque de duplication, mais risque d'état incohérent (product partiellement updated, status submission désynchronisé).

**Fix** : refactor en RPC SECURITY DEFINER similaire à Dette 9 (`approve_product_submission_edit`). Pattern identique : transaction PG implicite, jsonb_populate_record pour schema-resilient mapping.

**Effort** : 2-3h
**Priorité** : Niveau 2 (importante mais pas critique car pas de risque de duplication)

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

**Statut FIXED 2026-05-06 sprint 3** : audit complet effectué en 3 sprints. Les 3 derniers warnings traités :
- `product_review_stats` : ACL réduit à SELECT-only pour anon/authenticated (auparavant TOUS privilèges). Le warning advisor `materialized_view_in_api` persiste (faux positif accepté — matview dans schema public est exposée à l'API par design Postgres). Optional refactor tracké comme Dette 22.
- `product-images` bucket : action manuelle Dashboard requise (storage.objects owned by supabase_storage_admin, MCP postgres role insuffisant). Procédure documentée ci-dessous dans "Actions manuelles requises".
- `auth_leaked_password_protection` : action manuelle Dashboard requise. Procédure documentée.

Bilan cumulé Dette 18 :
- 60 → 19 advisor warnings DB-fixables (−41)
- 2 vraies failles fermées (salone PII leak, 21 functions over-exposed)
- 9 faux positifs documentés
- 4 nouvelles dettes identifiées : 19 (notifications phishing), 20 (project_briefs pattern), 21 (orphan triggers), 22 (matview refactor optional)
- 2 actions manuelles Dashboard pending (bucket listing + leaked password)

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

### Dette 22 — Matview architecture refactor (optional)

**Origine** : Audit Dette 18 sprint 3 (2026-05-06)
**Impact** : la matview `product_review_stats` persiste comme advisor warning `materialized_view_in_api` après cleanup ACL (sprint 3). C'est by-design Postgres — une matview dans le schema public est exposée à l'API PostgREST par construction.

ACL post-Sprint 3 : SELECT-only pour anon/authenticated (auparavant tous privilèges).
Données exposées : pure agrégation (count, avg rating, distribution stars). Pas de PII.

**Fix optionnel** :
- Option A : déplacer la matview dans un schema dédié (ex : `stats.product_review_stats`)
- Option B : convertir en function `public.get_product_review_stats(product_id)` retournant un row
- Option C : laisser tel quel — données publiques par design

**Effort** : 2-4h selon option choisie + adaptation des callers (`useProductReviews`, `ProductDetail`, `ProductReviews`).

**Recommandation** : laisser tel quel sauf exigence réglementaire ou audit externe.

## Tableau de tracking

| # | Dette | Niveau | Effort | Statut | Date fix |
|---|-------|--------|--------|--------|----------|
| 9 | approveAsNew transactionnel | 1 | 0.5-1j | **FIXED ✅** | **2026-05-06** |
| 10 | RLS refactor inline | 1 | 0.5j | **FIXED ✅** | **2026-05-05** |
| 2 | variant_id cart | 1 | 0.5-1j | À fixer | - |
| 3 | variant_id quote | 1 | 0.5-1j | À fixer | - |
| **19** | **notifications phishing risk** | **1** | **0.5-1j** | **À fixer** | - |
| 1+12 | i18n drawer | 2 | 1-2h | À fixer | - |
| 11 | partner.slug | 2 | 30min | À fixer | - |
| 4 | zod variants | 2 | 1-2h | À fixer | - |
| 6 | i18n StockBadge | 2 | 30min | À fixer | - |
| 13+14 | SEO redirect | 2 | 30-45min | À fixer | - |
| **23** | **approveEdit transactionnel** | **2** | **2-3h** | **À fixer** | - |
| 16 | 400 product_reviews | 2 | 30min-1h | À fixer | - |
| 17 | 400 partners | 2 | 30min-1h | À fixer | - |
| 18 | 61 advisors warnings | 2 | 0.5-1j | **FIXED ✅** | **2026-05-06** (3 sprints) |
| 5 | selectedColor deprecated | 3 | 1h | Continu | - |
| 7 | DB invalide seed | 3 | 30min | Continu | - |
| 8 | Édition admin variants | 3 | 2-3h | Continu | - |
| 15 | Tests E2E Playwright | 3 | Continu | Continu | - |
| 20 | project_briefs pattern incohérent | 3 | 30min-1h | À fixer | - |
| 21 | cleanup orphan trigger functions | 3 | 15min | À fixer | - |
| **22** | **matview architecture refactor (optional)** | **3** | **2-4h** | **À fixer (optional)** | - |

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

## Advisor warnings acceptés (faux positifs documentés)

Certains warnings de Supabase Advisor sont des faux positifs inhérents au design de l'application. Ils sont documentés ici pour traçabilité.

### materialized_view_in_api — product_review_stats

**Advisor flag** : "Materialized View in API"

**Justification** : la matview `product_review_stats` expose des aggregats publics (count, avg rating, distribution stars) du catalogue de produits. Cette exposition est intentionnelle pour l'affichage public des reviews sur les fiches produits (cf. `src/hooks/useProductReviews.ts`, `src/pages/ProductDetail.tsx`).

**ACL post-Sprint 3** : SELECT-only pour anon/authenticated (commit 33ce142… → final commit Sprint 3).

**Pas de PII** : pure agrégation statistique (count + averages).

**Why not refactor** : déplacer la matview hors schema public OU la convertir en function/view normale nécessiterait un refactor lourd (impact `useProductReviews` hook + `ProductDetail.tsx` + `ProductReviews.tsx`). Effort non justifié pour un warning informationnel sur des données publiques.

Voir Dette 22 pour refactor optionnel future.

## Actions manuelles requises (Dashboard)

Certains settings Supabase ne sont pas versionnables en SQL et doivent être configurés via Dashboard.

### Bucket product-images : restreindre listing à authenticated

**Origine** : Audit Dette 18 sprint 3 (2026-05-06)
**Statut** : ✅ DONE 2026-05-06 (founder a appliqué via SQL Editor Dashboard, query "Success. No rows returned").

**Pourquoi pas en migration MCP** : `storage.objects` est owned par `supabase_storage_admin`. Le rôle `postgres` utilisé par MCP ne peut pas DROP/CREATE de policies sur cette table.

**Procédure** :
1. Aller sur https://supabase.com/dashboard
2. Sélectionner le projet, ouvrir SQL Editor
3. Exécuter :

```sql
DROP POLICY "Public read access to product images" ON storage.objects;

CREATE POLICY "Authenticated read access to product images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'product-images');
```

**Impact** :
- Anon ne peut plus lister les 160 objets via `storage.objects` SELECT
- `getPublicUrl()` continue de fonctionner pour anon (path CDN dédié `/storage/v1/object/public/` qui bypasse RLS)
- `PhotoGalleryManager.tsx` (partner dashboard, authenticated) continue de fonctionner

**Date d'exécution à reporter ici** : ____/____/____

### auth_leaked_password_protection

**Origine** : Audit Dette 18 sprint 3 (2026-05-06)
**Statut** : ⚠️ DÉPEND DU PRO PLAN — feature gated, action reportée jusqu'à upgrade Supabase plan.

**Note (découverte 2026-05-06)** : tentative d'activation effectuée 2026-05-06. Le toggle n'est pas accessible sur le plan actuel. À programmer quand le projet aura besoin d'un upgrade plan (croissance utilisateurs, fonctionnalités payantes Supabase, etc.).

**Procédure (post-upgrade)** :
1. Aller sur https://supabase.com/dashboard
2. Sélectionner le projet
3. Aller dans Authentication → Providers → Email
4. Section "Password security"
5. Activer "Prevent the use of leaked passwords"

**Impact** : aucun pour les utilisateurs existants. Vérification HaveIBeenPwned activée pour les futurs signups et changements de mot de passe.

**Date d'activation à reporter ici** : ____/____/____

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
- Reste à auditer : 3 warnings (materialized_view_in_api, public_bucket_allows_listing, auth_leaked_password_protection) — sprint 3

### 2026-05-06 — Dette 9 FIXED ✅

- RPC `approve_product_submission_as_new(submission_id, product_jsonb, variants_jsonb, offers_jsonb)` créée (SECURITY DEFINER, search_path=public,pg_temp, EXECUTE authenticated only)
- Frontend hook `approveAsNew` refactoré (~140 lignes simplifiées) :
  - Steps 1-7 + 9 préservés (uploads Storage, race-check UX, validation, slug gen)
  - Steps 8 (INSERT product) + 10 (variants) + 11 (offers) + 12 (UPDATE submission) délégués à la RPC en 1 seul appel
  - Cleanup applicatif (DELETE products on fail) supprimé — PG ROLLBACK gère
  - `console.warn` silent-fails sur offers supprimés — la RPC raise désormais
- Validation empirique pre/post : anon → 42501 permission denied ✓ (pre-apply pas testable car RPC n'existait pas)
- types.ts régénéré (signature `approve_product_submission_as_new` visible)
- 1 nouvelle dette : **Dette 23** (`approveEdit` similar non-transactional pattern, Niveau 2)
- Out of scope : storage orphans (cron cleaner futur)

### 2026-05-06 — Dette 19 Phase 2A delivered

- 2 RPCs SECURITY DEFINER créés : `create_self_notification` (P1 future-proof, no current caller) et `create_admin_notification` (P2 admin → user, with `is_admin()` check)
- Colonne `sender_user_id` ajoutée à `notifications` (FK auth.users, audit logging)
- 14 callsites P2 refactorés frontend → RPC (8 fichiers admin/* + usePaymentFlow). Les 2 bulk inserts utilisent une boucle (admins ≤ 5, ou utilisateurs si "all")
- types.ts régénéré (sender_user_id column + 2 RPCs visibles)
- Validation : DO block embarqué + has_function_privilege checks (anon=false, authenticated=true sur les 2 RPCs)
- ~50 % surface d'attaque cross-user fermée
- 16 callsites P3 reportés Phase 2B (roadmap dans Dette 19)
- RLS tightening reporté Phase 2A.2 final

### 2026-05-06 — Dette 18 sprint 3 COMPLETED ✅

- 3 derniers warnings traités, audit Dette 18 fermé après 3 sprints
- `product_review_stats` matview : ACL réduite à SELECT-only pour anon/authenticated (auparavant TOUS privilèges a/r/w/d/D/x/t/m). service_role et postgres intacts. Validation empirique : anon SELECT=true, INSERT/UPDATE/DELETE=false ✓.
- `product-images` bucket : action manuelle Dashboard SQL Editor documentée (storage.objects owned by supabase_storage_admin → MCP postgres role insuffisant).
- `auth_leaked_password_protection` : action manuelle Dashboard documentée.
- 1 dette future optionnelle ajoutée : Dette 22 (matview architecture refactor).
- 1 warning persistera comme faux positif documenté : `materialized_view_in_api` sur `product_review_stats` (by-design Postgres).

**Bilan final Dette 18 (3 sprints cumulés)** :
- 60 → 19 advisor warnings DB-fixables (−41)
- 2 vraies failles fermées : salone_2026_visits PII leak + 21 functions SECURITY DEFINER over-exposed
- 9 faux positifs documentés (5 RLS Always True + 4 SECURITY DEFINER intentionnels)
- 1 ACL matview réduit
- 1 fix search_path
- 4 nouvelles dettes identifiées (Dette 19/20/21/22)
- 2 actions manuelles Dashboard pending : bucket policy + leaked password protection

## Initiatives stratégiques planifiées

### SEO/GEO Strategy (Q3 2026)

Voir docs/strategy/SEO_GEO_STRATEGY.md pour le plan complet.

Approche progressive en 3 phases :
- Phase 1 : Quick wins SEO/Schema sur l'existant (1-2j)
- Phase 2 : 3 pages "Solutions" pilotes (3-5j)
- Phase 3 : Industrialisation conditionnelle si Phase 2 positive (5-10j)

Conditionné à la résolution préalable des dettes critiques (9, 2, 3) et de la Dette 18 (audit RLS warnings).
