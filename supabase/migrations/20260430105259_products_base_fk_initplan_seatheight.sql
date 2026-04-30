-- ============================================================================
-- CHANTIER VOCAB 2026 — Migration de base products
-- Date     : 2026-04-30
-- Contexte : pré-requis aux migrations par catégorie (Tables, Parasols,
--            Sun Loungers, Sofas, Bar Stools)
-- Inclut   :
--   - B2.2 (7 FK uuid manquantes vers products + auth.users)
--   - B2.3 (7 policies auth_rls_initplan : auth.uid() -> (SELECT auth.uid()))
--   - D1   (seat_height_cm : integer -> numeric(5,1))
-- Ref      : docs/chantiers/2026-05/PLAN_VOCAB_FIELDS.md §6
-- ============================================================================

-- ── 1. Add 7 missing foreign keys (B2.2) ────────────────────────────────────

ALTER TABLE public.board_items
  ADD CONSTRAINT board_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.concept_events
  ADD CONSTRAINT concept_events_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;

ALTER TABLE public.partner_arrival_items
  ADD CONSTRAINT partner_arrival_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.preorders
  ADD CONSTRAINT preorders_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;

ALTER TABLE public.project_zone_products
  ADD CONSTRAINT project_zone_products_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.pro_service_events
  ADD CONSTRAINT pro_service_events_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── 2. Fix auth_rls_initplan policies (B2.3) ────────────────────────────────

-- 2.1 products: "Authenticated users can read products"
DROP POLICY IF EXISTS "Authenticated users can read products" ON public.products;
CREATE POLICY "Authenticated users can read products" ON public.products
  FOR SELECT TO authenticated
  USING (
    ((SELECT auth.role()) = 'authenticated')
    AND ((publish_status = 'published') OR (availability_type <> 'discontinued'))
  );

-- 2.2 product_reviews: Auth users insert own review
DROP POLICY IF EXISTS "Auth users insert own review" ON public.product_reviews;
CREATE POLICY "Auth users insert own review" ON public.product_reviews
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

-- 2.3 product_reviews: Users delete own pending review
DROP POLICY IF EXISTS "Users delete own pending review" ON public.product_reviews;
CREATE POLICY "Users delete own pending review" ON public.product_reviews
  FOR DELETE USING (user_id = (SELECT auth.uid()) AND status = 'pending');

-- 2.4 product_reviews: Users read own reviews
DROP POLICY IF EXISTS "Users read own reviews" ON public.product_reviews;
CREATE POLICY "Users read own reviews" ON public.product_reviews
  FOR SELECT USING (user_id = (SELECT auth.uid()));

-- 2.5 product_reviews: Users update own pending review
DROP POLICY IF EXISTS "Users update own pending review" ON public.product_reviews;
CREATE POLICY "Users update own pending review" ON public.product_reviews
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()) AND status = 'pending')
  WITH CHECK (user_id = (SELECT auth.uid()));

-- 2.6 quote_documents: Clients can read own quote documents
DROP POLICY IF EXISTS "Clients can read own quote documents" ON public.quote_documents;
CREATE POLICY "Clients can read own quote documents" ON public.quote_documents
  FOR SELECT USING (
    quote_request_id IN (
      SELECT qr.id
      FROM public.quote_requests qr
      WHERE qr.client_user_id = (SELECT auth.uid())
         OR qr.email = (SELECT up.email FROM public.user_profiles up WHERE up.id = (SELECT auth.uid()))
    )
  );

-- 2.7 quote_documents: Partners can manage own quote documents
DROP POLICY IF EXISTS "Partners can manage own quote documents" ON public.quote_documents;
CREATE POLICY "Partners can manage own quote documents" ON public.quote_documents
  FOR ALL USING (
    quote_request_id IN (
      SELECT qr.id
      FROM public.quote_requests qr
      WHERE qr.partner_id IN (
        SELECT p.id FROM public.partners p WHERE p.user_id = (SELECT auth.uid())
      )
    )
  );

-- ── 3. Migrate seat_height_cm to numeric(5,1) (D1) ──────────────────────────

ALTER TABLE public.products
  ALTER COLUMN seat_height_cm TYPE numeric(5,1)
  USING seat_height_cm::numeric(5,1);
