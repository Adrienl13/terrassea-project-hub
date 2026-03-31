-- ============================================================================
-- Migration: Drop auto-offer trigger on products
-- Date: 2026-03-31
-- Purpose: The trigger create_offer_on_product_partner_link() used
--          ON CONFLICT (product_id, partner_id) which no longer exists
--          after the multi-color constraint change. Offers are now created
--          explicitly in approveAsNew() with all fields including color.
-- ============================================================================

DROP TRIGGER IF EXISTS trg_create_offer_on_product ON products;
DROP FUNCTION IF EXISTS create_offer_on_product_partner_link();
