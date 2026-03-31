-- ============================================================================
-- Migration: Add approved_product_id to product_submissions
-- Date: 2026-03-31
-- Purpose: Track which product was created from each approved submission,
--          enabling reliable linking between submissions and products.
-- ============================================================================

ALTER TABLE product_submissions
ADD COLUMN IF NOT EXISTS approved_product_id uuid REFERENCES products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_submissions_approved_product_id
ON product_submissions(approved_product_id) WHERE approved_product_id IS NOT NULL;
