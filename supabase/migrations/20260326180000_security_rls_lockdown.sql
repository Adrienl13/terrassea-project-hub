-- ============================================================================
-- SECURITY RLS LOCKDOWN MIGRATION
-- Date: 2026-03-26
-- Purpose: Fix all open RLS policies, prevent admin self-registration,
--          prevent user_type escalation, add atomic preorder RPC
-- ============================================================================

-- Helper: all admin policies use public.is_admin() — a SECURITY DEFINER function
-- that bypasses RLS to avoid circular self-referencing on user_profiles.

-- ============================================================================
-- A. PRODUCTS — restrict write to admin only, keep public SELECT
-- ============================================================================

DROP POLICY IF EXISTS "Allow product management" ON public.products;

CREATE POLICY "Admins can insert products" ON public.products
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update products" ON public.products
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete products" ON public.products
  FOR DELETE USING (public.is_admin());

-- "Products are publicly readable" (SELECT USING true) already exists — keep it

-- ============================================================================
-- B. PARTNERS — restrict write to admin only, keep public SELECT for is_public
-- ============================================================================

DROP POLICY IF EXISTS "Allow partner management" ON public.partners;

CREATE POLICY "Admins can insert partners" ON public.partners
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update partners" ON public.partners
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete partners" ON public.partners
  FOR DELETE USING (public.is_admin());

-- Allow partner users to read their own partner row
CREATE POLICY "Partner users can read own partner" ON public.partners
  FOR SELECT USING (user_id = auth.uid());

-- "Public partners are readable" (SELECT USING is_public = true) already exists — keep it

-- ============================================================================
-- C. PARTNER_APPLICATIONS — restrict SELECT + UPDATE to admin, keep INSERT public
-- ============================================================================

DROP POLICY IF EXISTS "Allow reading applications" ON public.partner_applications;
DROP POLICY IF EXISTS "Allow updating applications" ON public.partner_applications;

CREATE POLICY "Admins can read applications" ON public.partner_applications
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update applications" ON public.partner_applications
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- "Anyone can apply" (INSERT WITH CHECK true) already exists — keep it

-- ============================================================================
-- D. PARTNER_CONTACT_REQUESTS — restrict SELECT to admin + relevant partner
-- ============================================================================

DROP POLICY IF EXISTS "Allow reading contact requests" ON public.partner_contact_requests;

CREATE POLICY "Admins can read contact requests" ON public.partner_contact_requests
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Partners can read own contact requests" ON public.partner_contact_requests
  FOR SELECT USING (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

-- "Anyone can submit contact request" (INSERT WITH CHECK true) already exists — keep it

-- ============================================================================
-- E. QUOTE_REQUESTS — restrict SELECT to admin, keep INSERT public
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all quote requests" ON public.quote_requests;

CREATE POLICY "Admins can read quote requests" ON public.quote_requests
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update quote requests" ON public.quote_requests
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- "Anyone can insert quote requests" (INSERT WITH CHECK true) already exists — keep it

-- ============================================================================
-- F. PROJECT_REQUESTS — restrict SELECT to admin, keep INSERT public
-- ============================================================================

DROP POLICY IF EXISTS "Allow reading project requests" ON public.project_requests;

CREATE POLICY "Admins can read project requests" ON public.project_requests
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update project requests" ON public.project_requests
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- "Anyone can submit a project request" (INSERT WITH CHECK true) already exists — keep it

-- ============================================================================
-- G. PROJECT_CART_ITEMS — restrict SELECT to admin, keep INSERT public
-- ============================================================================

DROP POLICY IF EXISTS "Allow reading cart items" ON public.project_cart_items;

CREATE POLICY "Admins can read cart items" ON public.project_cart_items
  FOR SELECT USING (public.is_admin());

-- "Anyone can add cart items" (INSERT WITH CHECK true) already exists — keep it

-- ============================================================================
-- H. USER_PROFILES — prevent user_type self-escalation
-- ============================================================================

-- Ensure every user can read their own profile (base case — breaks circular RLS)
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Add admin read-all policy so admin dashboard can list users
-- Uses is_admin() SECURITY DEFINER to avoid self-referencing RLS on same table
CREATE POLICY "Admins can read all profiles" ON public.user_profiles
  FOR SELECT USING (public.is_admin());

-- Add admin update-all policy so admin can manage users
CREATE POLICY "Admins can update all profiles" ON public.user_profiles
  FOR UPDATE USING (public.is_admin());

-- Trigger to prevent non-admin users from changing user_type
CREATE OR REPLACE FUNCTION public.prevent_user_type_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_type IS DISTINCT FROM OLD.user_type THEN
    -- Only admins can change user_type (check caller's profile)
    IF NOT EXISTS (
      SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND user_type = 'admin'
    ) THEN
      RAISE EXCEPTION 'Changing user_type is not allowed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_user_type_change ON public.user_profiles;
CREATE TRIGGER trg_prevent_user_type_change
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_user_type_change();

-- ============================================================================
-- I. HANDLE_NEW_USER — prevent admin self-registration
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  safe_user_type text;
BEGIN
  safe_user_type := COALESCE(NEW.raw_user_meta_data->>'user_type', 'client');

  -- SECURITY: Never allow 'admin' via self-registration
  IF safe_user_type NOT IN ('client', 'partner', 'architect') THEN
    safe_user_type := 'client';
  END IF;

  INSERT INTO public.user_profiles (id, email, first_name, last_name, user_type, company, siren, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    safe_user_type,
    NEW.raw_user_meta_data->>'company',
    NEW.raw_user_meta_data->>'siren',
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    -- DO NOT overwrite user_type on conflict
    company = EXCLUDED.company,
    siren = EXCLUDED.siren,
    phone = EXCLUDED.phone;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- J. RESERVE_PREORDER RPC — atomic preorder increment (fixes race condition)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reserve_preorder(
  p_arrival_item_id uuid,
  p_user_id uuid,
  p_product_id uuid,
  p_quantity integer
) RETURNS void AS $$
BEGIN
  -- Atomically check availability and increment reserved count
  UPDATE public.partner_arrival_items
  SET preorder_reserved = COALESCE(preorder_reserved, 0) + p_quantity
  WHERE id = p_arrival_item_id
    AND (expected_quantity - COALESCE(preorder_reserved, 0)) >= p_quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient availability for preorder';
  END IF;

  -- Insert the preorder record
  INSERT INTO public.preorders (user_id, arrival_item_id, product_id, quantity, status)
  VALUES (p_user_id, p_arrival_item_id, p_product_id, p_quantity, 'pending');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
