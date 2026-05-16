-- Red-team H3 (2026-05-16): quote_requests INSERT policy let any authenticated
-- user spoof client_user_id to a victim's UUID. The downstream SELECT/UPDATE
-- policies use `client_user_id = auth.uid()`, so a forged row appears in the
-- victim's dashboard as if they had requested it. Combined with the order
-- auto-creation trigger on signature, that's a path to order forgery.
--
-- Fix: bind client_user_id to auth.uid() (or NULL). Anonymous inserts stay
-- blocked because the policy still requires authentication. Matches the
-- existing frontend behaviour in QuoteRequestModal.tsx and ProjectCart.tsx
-- which pass `client_user_id: user?.id || null` -- both branches now pass
-- WITH CHECK.

DROP POLICY "Authenticated users can insert quote requests" ON public.quote_requests;

CREATE POLICY "Authenticated users can insert quote requests"
  ON public.quote_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND (client_user_id IS NULL OR client_user_id = (SELECT auth.uid()))
  );
