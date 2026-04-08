-- ============================================================================
-- TARGETED RLS FIXES — addresses missing/broken policies
-- RLS is already enabled on all tables via Supabase dashboard.
-- This migration only adds missing policies and fixes bugs.
-- ============================================================================

-- ── 1. orders: add partner read access (was missing) ──
CREATE POLICY "Partners read own orders" ON public.orders FOR SELECT
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

-- ── 2. pro_service_requests: add client + partner + insert access ──
CREATE POLICY "Clients read own pro_service_requests" ON public.pro_service_requests FOR SELECT
  USING (client_user_id = auth.uid());

-- Allow anonymous submissions (lead form on public landing page)
CREATE POLICY "Anyone can submit pro_service_requests" ON public.pro_service_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Partners read matched pro_service_requests" ON public.pro_service_requests FOR SELECT
  USING (id IN (SELECT request_id FROM public.pro_service_matches WHERE partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())));

-- ── 3. platform_settings: authenticated users read all settings ──
-- Feature flags, loyalty config, payment info are needed client-side
CREATE POLICY "Authenticated read platform_settings" ON public.platform_settings FOR SELECT
  TO authenticated USING (true);

-- ── 4. notifications: fix INSERT to allow sending to other users ──
-- Old policy required user_id = auth.uid() → blocked cross-user notifications
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
CREATE POLICY "Authenticated users send notifications" ON public.notifications FOR INSERT
  TO authenticated WITH CHECK (true);

-- ── 5. messages: fix INSERT self-comparison bug ──
-- Old: cp.conversation_id = cp.conversation_id (always true → any user can post anywhere)
-- New: cp.conversation_id = messages.conversation_id (correct participant check)
DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;
CREATE POLICY "Participants can send messages" ON public.messages FOR INSERT
  TO authenticated WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );
