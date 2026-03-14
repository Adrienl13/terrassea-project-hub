
CREATE TABLE public.product_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  price numeric,
  currency text DEFAULT 'EUR',
  stock_status text DEFAULT 'available',
  stock_quantity integer,
  delivery_delay_days integer,
  minimum_order integer DEFAULT 1,
  purchase_type text DEFAULT 'quote_request',
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, partner_id)
);

ALTER TABLE public.product_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product offers are publicly readable"
  ON public.product_offers FOR SELECT
  TO public
  USING (true);

CREATE TRIGGER update_product_offers_updated_at
  BEFORE UPDATE ON public.product_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.product_offers;
