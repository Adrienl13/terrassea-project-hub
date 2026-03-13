
-- Allow public insert/update on products for admin (no auth yet)
CREATE POLICY "Allow product management" ON public.products FOR ALL USING (true) WITH CHECK (true);

-- Allow reading project_requests (for admin dashboard later)
CREATE POLICY "Allow reading project requests" ON public.project_requests FOR SELECT USING (true);

-- Allow reading cart items
CREATE POLICY "Allow reading cart items" ON public.project_cart_items FOR SELECT USING (true);
