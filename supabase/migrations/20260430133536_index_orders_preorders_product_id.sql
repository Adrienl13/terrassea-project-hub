-- ============================================================================
-- CHANTIER VOCAB 2026 — Indexation FK uuid manquantes (ÉTAPE 7.4 patch)
-- Date : 2026-04-30
--
-- Complète la migration index_fk_products_columns : 2 FK supplémentaires
-- ajoutées en ÉTAPE 2 mais oubliées dans la première passe d'indexation.
--   orders.product_id     (RESTRICT)
--   preorders.product_id  (RESTRICT)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_orders_product_id ON public.orders(product_id);
CREATE INDEX IF NOT EXISTS idx_preorders_product_id ON public.preorders(product_id);
