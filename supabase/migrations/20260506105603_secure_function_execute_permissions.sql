-- ============================================================================
-- Secure function EXECUTE permissions (Dette 18 Sprint 2)
-- Date : 2026-05-06
--
-- Removes unnecessary EXECUTE permissions from anon/authenticated on
-- SECURITY DEFINER functions that should only be callable by :
-- - Postgres internals (triggers : function called via pg_trigger context, not REST RPC)
-- - service_role (cron tasks, internal RPCs invoked by edge functions)
-- - Specific authenticated flows kept explicit (e.g., reserve_preorder)
--
-- Also fixes the 1 function with mutable search_path (update_product_review_timestamp).
--
-- Functions intentionally KEPT with EXECUTE for anon/authenticated (faux positifs) :
--   * is_admin(), is_brand_member(), is_brand_owner() — RLS helpers, must remain
--     executable at planning time (incident 2026-05-01 lesson : 102 RLS policies
--     dépendent de is_admin()).
--   * fuzzy_search_products(...) — public catalogue search, intentional.
--
-- Functions documented as orphan (REVOKE but kept in DB) :
--   * notify_application_approved/submitted, notify_quote_submitted (no current
--     trigger or caller — Dette 21 tracks future cleanup).
--   * create_notification(...) (kept for service_role / edge function future
--     use, related to Dette 19 — notifications cross-user phishing risk).
-- ============================================================================

-- ===== Phase 1 : capture baseline =====

DO $$
DECLARE
  baseline_anon_count integer;
BEGIN
  SELECT count(DISTINCT p.proname) INTO baseline_anon_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef = true
    AND has_function_privilege('anon', p.oid, 'EXECUTE');

  RAISE NOTICE 'Baseline: % SECURITY DEFINER functions executable by anon', baseline_anon_count;
END $$;

-- ===== Phase 2 : Fix Cat C — search_path =====

ALTER FUNCTION public.update_product_review_timestamp()
  SET search_path = 'public, pg_temp';

-- ===== Phase 3 : REVOKE EXECUTE — Trigger functions (14) =====
-- These are RETURNS trigger and called only by Postgres trigger context.
-- REVOKE PUBLIC + anon + authenticated. service_role retains its explicit grant.

REVOKE EXECUTE ON FUNCTION public.check_partner_upgrade()                       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_application_approved()                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_application_submitted()                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_new_message()                       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_order_status_changed()                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_quote_pdf_uploaded()                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_quote_status_changed()                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_quote_submitted()                      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_user_type_change()                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_signed_quote_requests()               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_product_review_stats()                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_partner_subscription_on_plan_change()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_conversation_last_message()            FROM PUBLIC, anon, authenticated;

-- ===== Phase 4 : REVOKE EXECUTE — Cron / internal RPCs =====
-- Called only by service_role from edge functions or scheduled tasks.

REVOKE EXECUTE ON FUNCTION public.expire_overdue_quotes()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.invoke_scheduled_tasks()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.run_reminder_notifications()  FROM PUBLIC, anon, authenticated;

-- ===== Phase 5 : REVOKE EXECUTE — Admin-only RPCs =====
-- next_invoice_number / next_payment_reference are called via paymentUtils.ts
-- → usePaymentFlow.createOrderFromQuote → 3 admin components only
-- (AdminPaymentPanel, AdminQuoteWorkflow, AdminOrderTracking).
-- ClientOrdersSection consumes usePaymentFlow only for paymentSettings.
-- → Safe to revoke from authenticated; admin operations go through service_role context.

REVOKE EXECUTE ON FUNCTION public.next_invoice_number()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_payment_reference()    FROM PUBLIC, anon, authenticated;

-- ===== Phase 6 : REVOKE EXECUTE FROM anon — RPC user-scoped =====
-- reserve_preorder is called by authenticated users (useArrivals.ts).
-- Keep authenticated EXECUTE, revoke anon.

REVOKE EXECUTE ON FUNCTION public.reserve_preorder(uuid, uuid, uuid, integer)
  FROM PUBLIC, anon;

-- ===== Phase 7 : REVOKE EXECUTE — Orphan / future use =====
-- create_notification has no current frontend caller and no DB function uses it.
-- Kept for service_role only as preparation for future Dette 19 fix
-- (cross-user notifications via SECURITY DEFINER RPC pattern).

REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text)
  FROM PUBLIC, anon, authenticated;

-- ===== Phase 8 : embedded validation =====

DO $$
DECLARE
  remaining_anon_count integer;
  expected_remaining   integer := 4; -- is_admin, is_brand_member, is_brand_owner, fuzzy_search_products
  remaining_funcs      text;
BEGIN
  -- Count SECURITY DEFINER functions still executable by anon
  SELECT count(DISTINCT p.proname),
         string_agg(DISTINCT p.proname, ', ' ORDER BY p.proname)
    INTO remaining_anon_count, remaining_funcs
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef = true
    AND has_function_privilege('anon', p.oid, 'EXECUTE');

  IF remaining_anon_count <> expected_remaining THEN
    RAISE WARNING 'Expected % functions with EXECUTE for anon, got %. Remaining: %',
      expected_remaining, remaining_anon_count, remaining_funcs;
  ELSE
    RAISE NOTICE 'OK: % expected functions remain executable by anon (RLS helpers + public search): %',
      remaining_anon_count, remaining_funcs;
  END IF;

  -- Verify search_path explicit on update_product_review_timestamp
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'update_product_review_timestamp'
      AND p.proconfig IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM unnest(p.proconfig) AS c
        WHERE c LIKE 'search_path=%'
      )
  ) THEN
    RAISE EXCEPTION 'update_product_review_timestamp does not have explicit search_path';
  END IF;

  RAISE NOTICE 'OK: search_path set on update_product_review_timestamp';
END $$;
