
-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  short_description TEXT,
  indicative_price TEXT,
  image_url TEXT,
  product_family TEXT,
  main_color TEXT,
  secondary_color TEXT,
  style_tags TEXT[] DEFAULT '{}',
  ambience_tags TEXT[] DEFAULT '{}',
  palette_tags TEXT[] DEFAULT '{}',
  material_tags TEXT[] DEFAULT '{}',
  use_case_tags TEXT[] DEFAULT '{}',
  technical_tags TEXT[] DEFAULT '{}',
  is_outdoor BOOLEAN DEFAULT true,
  is_stackable BOOLEAN DEFAULT false,
  is_chr_heavy_use BOOLEAN DEFAULT false,
  popularity_score NUMERIC DEFAULT 0,
  priority_score NUMERIC DEFAULT 0,
  availability_type TEXT DEFAULT 'available',
  brand_source TEXT,
  supplier_internal TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project_requests table
CREATE TABLE public.project_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_name TEXT,
  establishment_type TEXT,
  project_zone TEXT,
  seating_capacity INTEGER,
  desired_style TEXT,
  desired_ambience TEXT,
  desired_palette TEXT,
  budget_range TEXT,
  timeline TEXT,
  city TEXT,
  country TEXT,
  free_text_request TEXT,
  detected_attributes JSONB DEFAULT '{}',
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_company TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project_cart_items table
CREATE TABLE public.project_cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_request_id UUID REFERENCES public.project_requests(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  concept_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_cart_items ENABLE ROW LEVEL SECURITY;

-- Products: publicly readable (catalogue), no public write
CREATE POLICY "Products are publicly readable"
  ON public.products FOR SELECT
  USING (true);

-- Project requests: anyone can insert (lead form), no public read
CREATE POLICY "Anyone can submit a project request"
  ON public.project_requests FOR INSERT
  WITH CHECK (true);

-- Cart items: anyone can insert
CREATE POLICY "Anyone can add cart items"
  ON public.project_cart_items FOR INSERT
  WITH CHECK (true);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_requests_updated_at
  BEFORE UPDATE ON public.project_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_style_tags ON public.products USING GIN(style_tags);
CREATE INDEX idx_products_use_case_tags ON public.products USING GIN(use_case_tags);
CREATE INDEX idx_cart_items_project ON public.project_cart_items(project_request_id);
