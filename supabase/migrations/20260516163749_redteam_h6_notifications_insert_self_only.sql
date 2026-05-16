-- Red-team H6 (2026-05-16): notifications INSERT was open with WITH CHECK (true)
-- since 20260408300000. Any authenticated user could plant arbitrary in-app
-- notifications on any other user (including admins), enabling phishing
-- attacks under the platform's trusted brand. Migration
-- 20260506124405_secure_notifications_phase_2a.sql explicitly acknowledged
-- this as "Dette 19 P3 phishing surface" and deferred to a "Phase 2B" that
-- never landed. This is that fix.
--
-- Fix: drop the WITH CHECK (true) policy, replace with self-only INSERT.
-- Admin policy "Admins manage all notifications" (polcmd=*, USING is_admin())
-- remains and continues to allow admins to write notifications for any user
-- via direct INSERT (e.g., useProductSubmissions.ts:260 admin->partner path).
--
-- Cross-user partner->admin notifications continue to be served by:
--   - DB triggers (partners_notify_review_ready, dette_59 quote triggers,
--     dette_59 order triggers, dette_59 pro_service trigger) -- these run as
--     trigger owner and bypass RLS.
--   - SECURITY DEFINER RPCs (create_partner_notification_to_admins,
--     create_quote_notification_to_*, create_order_notification_to_client,
--     create_admin_notification, create_notification, create_self_notification).
--
-- Audited frontend callers writing user_id != auth.uid() directly:
--   - PartnerProfileForm.tsx:312 (partner->admin) -- silently broken pre-fix
--     because user_profiles RLS hides admin IDs from non-admin SELECT; the
--     legitimate notification is already fired by trigger
--     notify_admins_on_partner_review_ready. The frontend loop is dead code.
--   - ProjectBriefModal.tsx:211, FinancingRequestModal.tsx:78,
--     PartnerCatalogueSection.tsx:581,647, ProServiceClientHub.tsx:1587
--     (all partner->admin) -- same silent-no-op as above. Restoring them is
--     a follow-up (wire to SECURITY DEFINER RPC).
--   - useProductSubmissions.ts:260 (admin->partner) -- continues to work via
--     the "Admins manage all notifications" policy.

DROP POLICY "Authenticated users send notifications" ON public.notifications;

CREATE POLICY "Users can send self notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
