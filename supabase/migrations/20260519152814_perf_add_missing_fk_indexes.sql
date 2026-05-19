-- Add B-tree indexes on 8 foreign-key columns that lack one. Without
-- a leading index, every ON DELETE / ON UPDATE check (and any join
-- that filters on the FK) performs a full sequential scan of the
-- referencing table. Audit confirmed no existing leading index on
-- any of these 8 columns. All tables are small (max ~240 rows today)
-- so index creation is instant — no CONCURRENTLY needed.
--
-- Closes 8 of 11 advisor entries on `unindexed_foreign_keys`. The 3
-- residual ones (concept_events.user_id, product_reviews.order_id,
-- product_reviews.quote_request_id) are documented in CLAUDE.md §5
-- as pre-existing tech debt, out of scope here.

CREATE INDEX IF NOT EXISTS idx_notifications_sender_user_id
  ON public.notifications (sender_user_id);

CREATE INDEX IF NOT EXISTS idx_partner_cgv_archived_by
  ON public.partner_cgv (archived_by);

CREATE INDEX IF NOT EXISTS idx_partner_cgv_created_by
  ON public.partner_cgv (created_by);

CREATE INDEX IF NOT EXISTS idx_partner_cgv_metadata_admin_reviewed_by
  ON public.partner_cgv_metadata (admin_reviewed_by);

CREATE INDEX IF NOT EXISTS idx_partner_cgv_metadata_current_cgv_id
  ON public.partner_cgv_metadata (current_cgv_id);

CREATE INDEX IF NOT EXISTS idx_project_cart_items_variant_id
  ON public.project_cart_items (variant_id);

CREATE INDEX IF NOT EXISTS idx_quote_requests_variant_id
  ON public.quote_requests (variant_id);

CREATE INDEX IF NOT EXISTS idx_terrassea_terms_created_by
  ON public.terrassea_terms (created_by);
