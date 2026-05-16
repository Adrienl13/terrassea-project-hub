-- Red-team H5 (2026-05-16): reserve_preorder accepted p_user_id from the body
-- without verifying against auth.uid(). Any authenticated caller could spoof
-- a victim UUID and have a preorder inserted in their name.
--
-- Fix: rewrite the body to use auth.uid() and ignore p_user_id. Keep the
-- 4-arg signature unchanged so the existing useArrivals.ts caller continues
-- to work without a frontend redeploy gap. The param is now a no-op.
--
-- Also add explicit null-auth and non-positive-quantity guards.

CREATE OR REPLACE FUNCTION public.reserve_preorder(
  p_arrival_item_id uuid, p_user_id uuid, p_product_id uuid, p_quantity integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  -- NB: p_user_id parameter is intentionally ignored. The reservation always
  -- belongs to auth.uid(). Closes red-team H5 (2026-05-16): prior version
  -- inserted preorders.user_id = p_user_id, letting any authenticated caller
  -- assign preorders to a victim by spoofing the param.

  UPDATE public.partner_arrival_items
    SET preorder_reserved = COALESCE(preorder_reserved, 0) + p_quantity
    WHERE id = p_arrival_item_id
      AND (expected_quantity - COALESCE(preorder_reserved, 0)) >= p_quantity;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient availability for preorder';
  END IF;

  INSERT INTO public.preorders (user_id, arrival_item_id, product_id, quantity, status)
  VALUES (v_user_id, p_arrival_item_id, p_product_id, p_quantity, 'pending');
END;
$$;

COMMENT ON FUNCTION public.reserve_preorder IS
  'Reserves an arrival_item preorder for auth.uid() (p_user_id is ignored). Closes red-team H5 (2026-05-16).';
