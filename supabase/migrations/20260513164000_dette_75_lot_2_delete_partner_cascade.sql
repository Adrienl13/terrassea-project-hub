-- ============================================================
-- Dette 75 Lot 2 — RPC delete_partner_cascade (transactionnel)
-- Date : 2026-05-13
--
-- Replaces the AdminPartners.tsx:232-253 handleDelete frontend
-- flow which issued 8 separate supabase writes without { error }
-- checks before the final DELETE on partners. Toast trompeur :
-- chaque écriture pouvait échouer silencieusement (NO ACTION FK,
-- RLS, network) — laissant des FK orphelines ou un DELETE final
-- réussi avec un partner « half-cleaned ».
--
-- This RPC consolidates everything in a single atomic transaction
-- with is_admin() guard. If any step fails, the whole DELETE is
-- rolled back automatically by PostgreSQL.
--
-- FK relationships handled (verified 2026-05-13 via
-- information_schema.referential_constraints) :
--
--   NO ACTION (manual cleanup required, this RPC handles) :
--     - brand_distributors.brand_id            → DELETE
--     - brand_distributors.distributor_id      → DELETE
--     - products.partner_id                    → SET NULL
--     - orders.partner_id                      → SET NULL
--     - partner_applications.created_partner_id → SET NULL
--     - project_briefs.brand_partner_id        → SET NULL
--     - project_briefs.routed_to_partner_id    → SET NULL
--     - project_cart_items.selected_partner_id → SET NULL
--     - project_zone_products.supplier_id      → SET NULL
--
--   RESTRICT (manual cleanup required, NOT handled by old code) :
--     - products.owner_brand_id                → SET NULL
--
--   CASCADE (handled automatically by the final DELETE) :
--     brand_collections, brand_references, brand_users,
--     partner_analytics, partner_api_connections, partner_arrivals,
--     partner_certifications, partner_contact_requests,
--     partner_featured_products, partner_loyalty,
--     partner_points_history, partner_ratings,
--     partner_subscriptions, pro_service_matches,
--     pro_service_responses, product_offers, product_submissions,
--     stock_sync_logs
--
--   SET NULL (handled automatically) :
--     - quote_requests.partner_id
--     - material_brands.parent_brand_id
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_partner_cascade(
  p_partner_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_partner_name text;
  v_brand_dist_count int;
  v_products_count int;
  v_owner_products_count int;
  v_orders_count int;
  v_app_count int;
  v_briefs_brand_count int;
  v_briefs_routed_count int;
  v_cart_items_count int;
  v_zone_products_count int;
BEGIN
  -- Admin guard
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized: admin only';
  END IF;

  -- Verify partner exists + capture name for return payload
  SELECT name INTO v_partner_name
  FROM public.partners
  WHERE id = p_partner_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'partner not found: %', p_partner_id;
  END IF;

  -- 1. brand_distributors (NO ACTION — DELETE both sides)
  DELETE FROM public.brand_distributors
  WHERE brand_id = p_partner_id OR distributor_id = p_partner_id;
  GET DIAGNOSTICS v_brand_dist_count = ROW_COUNT;

  -- 2. products.partner_id (NO ACTION — SET NULL)
  UPDATE public.products SET partner_id = NULL WHERE partner_id = p_partner_id;
  GET DIAGNOSTICS v_products_count = ROW_COUNT;

  -- 3. products.owner_brand_id (RESTRICT — must SET NULL before partner DELETE)
  -- This was NOT handled by the old frontend code → partners with owned products
  -- would fail the final DELETE with FK violation.
  UPDATE public.products SET owner_brand_id = NULL WHERE owner_brand_id = p_partner_id;
  GET DIAGNOSTICS v_owner_products_count = ROW_COUNT;

  -- 4. orders.partner_id (NO ACTION — SET NULL)
  UPDATE public.orders SET partner_id = NULL WHERE partner_id = p_partner_id;
  GET DIAGNOSTICS v_orders_count = ROW_COUNT;

  -- 5. partner_applications.created_partner_id (NO ACTION — SET NULL)
  UPDATE public.partner_applications SET created_partner_id = NULL
  WHERE created_partner_id = p_partner_id;
  GET DIAGNOSTICS v_app_count = ROW_COUNT;

  -- 6. project_briefs.brand_partner_id (NO ACTION — SET NULL)
  UPDATE public.project_briefs SET brand_partner_id = NULL
  WHERE brand_partner_id = p_partner_id;
  GET DIAGNOSTICS v_briefs_brand_count = ROW_COUNT;

  -- 7. project_briefs.routed_to_partner_id (NO ACTION — SET NULL)
  UPDATE public.project_briefs SET routed_to_partner_id = NULL
  WHERE routed_to_partner_id = p_partner_id;
  GET DIAGNOSTICS v_briefs_routed_count = ROW_COUNT;

  -- 8. project_cart_items.selected_partner_id (NO ACTION — SET NULL)
  UPDATE public.project_cart_items SET selected_partner_id = NULL
  WHERE selected_partner_id = p_partner_id;
  GET DIAGNOSTICS v_cart_items_count = ROW_COUNT;

  -- 9. project_zone_products.supplier_id (NO ACTION — SET NULL)
  UPDATE public.project_zone_products SET supplier_id = NULL
  WHERE supplier_id = p_partner_id;
  GET DIAGNOSTICS v_zone_products_count = ROW_COUNT;

  -- 10. Final DELETE — triggers CASCADE on 18 dependent tables
  -- (brand_collections, brand_references, brand_users, partner_analytics,
  --  partner_api_connections, partner_arrivals, partner_certifications,
  --  partner_contact_requests, partner_featured_products, partner_loyalty,
  --  partner_points_history, partner_ratings, partner_subscriptions,
  --  pro_service_matches, pro_service_responses, product_offers,
  --  product_submissions, stock_sync_logs)
  DELETE FROM public.partners WHERE id = p_partner_id;

  RETURN jsonb_build_object(
    'success',                  true,
    'partner_id',               p_partner_id,
    'partner_name',             v_partner_name,
    'brand_distributors_deleted', v_brand_dist_count,
    'products_partner_unlinked',  v_products_count,
    'products_owner_unlinked',    v_owner_products_count,
    'orders_unlinked',            v_orders_count,
    'applications_unlinked',      v_app_count,
    'briefs_brand_unlinked',      v_briefs_brand_count,
    'briefs_routed_unlinked',     v_briefs_routed_count,
    'cart_items_unlinked',        v_cart_items_count,
    'zone_products_unlinked',     v_zone_products_count
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_partner_cascade(uuid) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.delete_partner_cascade(uuid) TO authenticated;

-- Validation
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'delete_partner_cascade' AND pronamespace='public'::regnamespace) THEN
    RAISE EXCEPTION 'delete_partner_cascade missing';
  END IF;
  RAISE NOTICE 'OK Dette 75 Lot 2 — delete_partner_cascade in place';
END $$;
