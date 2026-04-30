-- ============================================================================
-- CHANTIER VOCAB 2026 — Indexation FK uuid (ÉTAPE 7.4, follow-up B2.x)
-- Date : 2026-04-30
--
-- Indexation des 5 FK ajoutées dans la migration de base ÉTAPE 2 pour éliminer
-- les advisors `unindexed_foreign_keys`. Tables actuellement vides ou
-- quasi-vides → CREATE INDEX standard (pas CONCURRENTLY, qui requiert hors
-- transaction et n'apporte rien sur 0 rows).
--
-- 5 FK indexées :
--   board_items.product_id          (CASCADE)
--   concept_events.product_id        (SET NULL)
--   partner_arrival_items.product_id (CASCADE)
--   project_zone_products.product_id (CASCADE)
--   pro_service_events.actor_id      (SET NULL, vers auth.users)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_board_items_product_id
  ON public.board_items(product_id);

CREATE INDEX IF NOT EXISTS idx_concept_events_product_id
  ON public.concept_events(product_id);

CREATE INDEX IF NOT EXISTS idx_partner_arrival_items_product_id
  ON public.partner_arrival_items(product_id);

CREATE INDEX IF NOT EXISTS idx_project_zone_products_product_id
  ON public.project_zone_products(product_id);

CREATE INDEX IF NOT EXISTS idx_pro_service_events_actor_id
  ON public.pro_service_events(actor_id);
