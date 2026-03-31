-- ============================================================================
-- Migration: Allow multiple offers per partner per product (one per color)
-- Date: 2026-03-31
-- Purpose: A partner can sell the same chair in multiple colors, each with
--          its own stock, price and delivery. The old UNIQUE(product_id, partner_id)
--          constraint blocked this. New constraint includes partner_color_name.
-- ============================================================================

ALTER TABLE product_offers DROP CONSTRAINT IF EXISTS product_offers_product_id_partner_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS product_offers_product_partner_color_key
ON product_offers (product_id, partner_id, COALESCE(partner_color_name, ''));
