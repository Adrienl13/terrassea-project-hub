-- ============================================================================
-- Perf — index hygiene (safe batch)
--
-- Date : 2026-06-08
-- Contexte : audit lenteur TerrasseaHUB (compute Nano, budget IO minuscule).
-- Cause racine = sur-indexage (347 index / 219 non-PK·unique / 5,2 Mo ≈ taille
-- des données) → amplification d'écriture → saturation IO pendant les sessions
-- de dev (6-8 juin). Ce lot ne traite QUE le structurellement sûr :
--   1) drop des index strictement DOUBLONS (préfixe/colonnes identiques à un
--      index de contrainte UNIQUE déjà présent) — aucun impact sur les lectures,
--      retire du coût d'écriture inutile ;
--   2) création de 3 index sur clés étrangères non couvertes (jointures /
--      cascades). Les FK insert-lourdes (concept_events.user_id,
--      product_views.user_id) sont volontairement ÉCARTÉES (décision founder).
--
-- Le nettoyage des ~219 index "inutilisés" est DIFFÉRÉ (~1 semaine) : les stats
-- idx_scan ont été remises à zéro par le redémarrage du 8 juin et ne sont pas
-- fiables aujourd'hui.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------
-- 1) Drop des index strictement doublons (la contrainte UNIQUE *_key reste)
-- ---------------------------------------------------------------
DROP INDEX IF EXISTS public.idx_brand_company_id;              -- = brand_prospects_company_id_key
DROP INDEX IF EXISTS public.idx_distrib_company_id;            -- = distributor_prospects_company_id_key
DROP INDEX IF EXISTS public.idx_chatbot_usage_date;           -- = chatbot_usage_usage_date_key
DROP INDEX IF EXISTS public.idx_partner_analytics_partner_date; -- = partner_analytics_partner_id_period_date_key
DROP INDEX IF EXISTS public.idx_partner_loyalty_partner;      -- = partner_loyalty_partner_id_key

-- ---------------------------------------------------------------
-- 2) Index sur clés étrangères non couvertes (hors tables insert-lourdes)
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_pro_service_matches_conversation_id
  ON public.pro_service_matches (conversation_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_order_id
  ON public.product_reviews (order_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_quote_request_id
  ON public.product_reviews (quote_request_id);

-- ---------------------------------------------------------------
-- Validation
-- ---------------------------------------------------------------
DO $$
DECLARE v_dropped int; v_created int;
BEGIN
  SELECT count(*) INTO v_dropped FROM pg_class
   WHERE relkind='i' AND relnamespace='public'::regnamespace
     AND relname IN ('idx_brand_company_id','idx_distrib_company_id','idx_chatbot_usage_date',
                     'idx_partner_analytics_partner_date','idx_partner_loyalty_partner');
  IF v_dropped <> 0 THEN RAISE EXCEPTION 'Expected 0 leftover duplicate indexes, found %', v_dropped; END IF;

  SELECT count(*) INTO v_created FROM pg_class
   WHERE relkind='i' AND relnamespace='public'::regnamespace
     AND relname IN ('idx_pro_service_matches_conversation_id','idx_product_reviews_order_id',
                     'idx_product_reviews_quote_request_id');
  IF v_created <> 3 THEN RAISE EXCEPTION 'Expected 3 new FK indexes, found %', v_created; END IF;

  RAISE NOTICE 'OK perf index hygiene — 5 duplicate indexes dropped, 3 FK indexes created';
END $$;

COMMIT;
