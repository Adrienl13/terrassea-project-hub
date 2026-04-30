-- ============================================================================
-- CHANTIER VOCAB 2026 — Drop duplicate index (ÉTAPE 7.4 cleanup)
-- Date : 2026-04-30
--
-- Mon idx_partner_arrival_items_product_id est un doublon de
-- idx_arrival_items_product préexistant (signalé par advisor duplicate_index).
-- Je drop le mien, l'index préexistant continue de couvrir la FK.
-- ============================================================================

DROP INDEX IF EXISTS public.idx_partner_arrival_items_product_id;
