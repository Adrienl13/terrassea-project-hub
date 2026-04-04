-- Fix: allow partners to read their assigned quote_requests
-- and clients to read their own quote_requests
-- Pattern mirrors partner_contact_requests and product_views RLS

-- Partners can read quote_requests assigned to them
CREATE POLICY "Partners can read own quote requests"
  ON public.quote_requests FOR SELECT
  USING (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

-- Partners can update their assigned quote_requests (e.g. respond with pricing)
CREATE POLICY "Partners can update own quote requests"
  ON public.quote_requests FOR UPDATE
  USING (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  )
  WITH CHECK (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

-- Clients can read quote_requests they submitted
CREATE POLICY "Clients can read own quote requests"
  ON public.quote_requests FOR SELECT
  USING (
    client_user_id = auth.uid()
  );
