
ALTER TABLE public.partner_applications
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS vat_number text,
  ADD COLUMN IF NOT EXISTS product_categories text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS estimated_annual_volume text,
  ADD COLUMN IF NOT EXISTS delivery_countries text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS message text;
