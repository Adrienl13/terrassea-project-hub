# Audit perf / saturation IO — TerrasseaHUB (juin 2026)

> Projet Supabase `gwgcfgeouropcighpztj` · compute **Nano** (0,5 Go RAM, IO de base 43 Mbps, pause auto après 1 sem.) · front React/TS sur Vercel.
> Statut : **lot sûr appliqué** (migration `20260608120000`). Reste : chantier RLS (à valider) + nettoyage index (différé ~1 semaine).

---

## 1. Symptôme

Site « beaucoup trop lent », produits longs à s'afficher (page paraît vide / chargement continu). Côté Supabase : **Disk IO budget à 100 % du 6 au 8 juin**, `Connection terminated due to connection timeout`, rafales de `canceling statement due to statement timeout`. Redémarrage manuel le 8 juin = débloqué temporairement.

## 2. Cause racine (mesurée, pas devinée)

**Sur-indexage** → amplification d'écriture → saturation de l'IO minuscule du Nano pendant les sessions d'écriture intensives (re-seed produits, migrations, refonte pages marques — pile 6-8 juin).

Preuves :
- **347 index** au total (219 non-PK/unique) pour **5,2 Mo** ≈ taille des données elles-mêmes.
- Base entière < 10 Mo → tient des dizaines de fois en RAM : **les lectures ne peuvent pas saturer l'IO**, seules les écritures (× tous les index) le peuvent.
- Realtime **vide** (publication `supabase_realtime` = 0 table) → écarté. pg_cron : 3 jobs rares → écarté.

**Signature universelle du ralentissement de lecture** (EXPLAIN ANALYZE, cache froid) :

| Requête | Exécution | **Planning** | Planning buffers |
|---|---|---|---|
| catalogue produits | 16 ms | **40 ms** | 687 |
| partners by slug | 1,6 ms | **20,7 ms** | 416 |
| product_offers (marque) | 1,2 ms | **14,5 ms** | 188 |
| products by collection | 0,9 ms | **17,4 ms** | 306 |

→ L'**exécution est triviale** ; c'est le **temps de planification** qui domine, car le planner lit les métadonnées de **tous** les index à froid depuis le disque. Sur une page = 5+ requêtes ⇒ ~75-100 ms de planning, qui explose quand l'IO est saturée.

**Donc :** le vrai levier lecture = **réduire le nombre d'index** (moins de métadonnées à planifier) + **garder le catalogue en RAM** (→ compute Micro). **Ajouter des index est contre-productif** ici.

## 3. Fait — Lot SÛR (migration `20260608120000_perf_index_hygiene_safe_batch.sql`)

Validé founder : structurel uniquement.
- **DROP 5 index strictement doublons** (redondants avec un index de contrainte UNIQUE) : `idx_brand_company_id`, `idx_distrib_company_id`, `idx_chatbot_usage_date`, `idx_partner_analytics_partner_date`, `idx_partner_loyalty_partner`.
- **CREATE 3 index FK** manquants : `pro_service_matches(conversation_id)`, `product_reviews(order_id)`, `product_reviews(quote_request_id)`.
- **Écartés** (tables insert-lourdes, coût d'écriture) : `concept_events(user_id)`, `product_views(user_id)`.
- Résultat : 347 → **345** index, **0 doublon exact** restant, 2 FK sans index restantes (les 2 écartées, assumées).

## 4. Différé (~1 semaine) — nettoyage des index inutilisés ⚠️

Les stats `idx_scan` ont été **remises à zéro par le redémarrage du 8 juin** : `idx_scan=0` aujourd'hui ne prouve PAS l'inutilité (vérifié : `idx_products_partner_id`/`idx_offers_partner` montraient 0 mais sont utilisés). **Attendre ~1 semaine de trafic réel**, puis :

```sql
-- Re-lancer l'advisor Supabase (Performance) + cette requête :
SELECT s.relname AS table_name, s.indexrelname AS index_name,
       pg_size_pretty(pg_relation_size(s.indexrelid)) AS size, s.idx_scan
FROM pg_stat_user_indexes s
JOIN pg_index i ON i.indexrelid = s.indexrelid
WHERE s.idx_scan = 0 AND NOT i.indisprimary AND NOT i.indisunique
ORDER BY pg_relation_size(s.indexrelid) DESC;
```

Règles : ne jamais supprimer PK ni index unique de contrainte ; valider chaque drop ; mesurer le **planning time** de la requête catalogue avant/après (cible : < 687 planning buffers). C'est CE nettoyage qui réduira la latence de lecture (planning) ET l'amplification d'écriture.

## 5. À valider — chantier RLS (hygiène/dette, pas la cause de la lenteur)

Empiriquement **sans effet visible** sur cette mini-base (coût RLS négligeable à si peu de lignes), mais nettoie la dette `multiple_permissive_policies` (cf. CLAUDE.md §7). À faire en **lot dédié testé** (accès `anon`/`authenticated` identique avant/après) :
- **P2** : fusionner **35 groupes** `(table, cmd, rôle)` ayant ≥2 policies permissives (pattern admin + owner → 1 policy `OR`). Tables : `partners`, `conversations`, `quote_*`, `product_offers`, `brand_*`, `preorders`, `project_*`, etc.
- **P3** : envelopper **~120 policies** réévaluant `auth.uid()/role()/jwt()` par ligne en `(select auth.…)` (évaluation unique en InitPlan).

## 6. Hygiène (P6) — ne plus refaire sauter l'IO

- **Plus de re-seed massif / migrations lourdes / réimports contre la prod live** sur Nano. → **branche Supabase**, ou heures creuses + par lots.
- Après tout DDL : re-lancer le Performance Advisor, comparer les `EXPLAIN ANALYZE` avant/après.

## 7. Infra (décision Adrien)

Base minuscule → **pas besoin d'un gros compute**. Mais **Pro (25 $/mois, compute Micro inclus)** recommandé pour la **stabilité** : fin de la pause auto, RAM/IO de base doublées (le catalogue reste en cache → planning servi depuis la RAM), sauvegardes quotidiennes. **Inutile de monter au-dessus de Micro.**

---

_Cache hit ratio au moment de l'audit : 94,7 % (se réchauffe après restart ; cible > 99 % une fois chaud)._
