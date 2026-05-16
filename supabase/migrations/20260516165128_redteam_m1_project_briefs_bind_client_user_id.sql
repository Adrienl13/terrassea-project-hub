-- Red-team M1 (2026-05-16): project_briefs INSERT WITH CHECK (true) let
-- any caller (anonymous or authenticated) insert briefs with arbitrary
-- client_user_id and brand_partner_id, enabling lead-poisoning at scale
-- (auto-routing trigger forwards to a real distributor).
--
-- Fix: bind client_user_id to NULL (anonymous-style submission) or
-- auth.uid() (authenticated self-submission). Anonymous form submission
-- remains supported because the policy still applies to all roles --
-- anonymous callers omit client_user_id, authenticated callers set it
-- to their own uid. Spoofing client_user_id to a victim's uid is now
-- blocked.

DROP POLICY "anyone can insert brief" ON public.project_briefs;

CREATE POLICY "anyone can insert brief"
  ON public.project_briefs
  FOR INSERT
  WITH CHECK (client_user_id IS NULL OR client_user_id = (SELECT auth.uid()));
