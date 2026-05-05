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

## Tableau de tracking

| # | Dette | Niveau | Effort | Statut | Date fix |
|---|-------|--------|--------|--------|----------|
| 9 | approveAsNew transactionnel | 1 | 0.5-1j | À fixer | - |
| 10 | RLS refactor inline | 1 | 0.5j | **FIXED ✅** | **2026-05-05** |
| 2 | variant_id cart | 1 | 0.5-1j | À fixer | - |
| 3 | variant_id quote | 1 | 0.5-1j | À fixer | - |
| 1+12 | i18n drawer | 2 | 1-2h | À fixer | - |
| 11 | partner.slug | 2 | 30min | À fixer | - |
| 4 | zod variants | 2 | 1-2h | À fixer | - |
| 6 | i18n StockBadge | 2 | 30min | À fixer | - |
| 13+14 | SEO redirect | 2 | 30-45min | À fixer | - |
| **16** | **400 product_reviews** | **2** | **30min-1h** | **À fixer** | - |
| **17** | **400 partners** | **2** | **30min-1h** | **À fixer** | - |
| **18** | **61 advisors warnings** | **2** | **0.5-1j** | **À fixer** | - |
| 5 | selectedColor deprecated | 3 | 1h | Continu | - |
| 7 | DB invalide seed | 3 | 30min | Continu | - |
| 8 | Édition admin variants | 3 | 2-3h | Continu | - |
| 15 | Tests E2E Playwright | 3 | Continu | Continu | - |

## Méta-règle

Toute nouvelle décision technique doit éviter d'ajouter 
à cette dette. Si on doit accepter un trade-off temporaire, 
il rejoint cette liste avec une justification.

## Historique des fixes

### 2026-05-05 — Dette 10 (RLS refactor inline)

- Commit : 1c23eec
- Validation : 48/48 cells matched between pre-fix and post-fix baselines
- REST API : HTTP 200 confirmed (was 401 during incident 2026-05-01)
- Empirical evidence captured in Phase 3 récap (cf. transcript day 7 archive)
- Helper functions kept in DB for 1-2 weeks observation period before final DROP
