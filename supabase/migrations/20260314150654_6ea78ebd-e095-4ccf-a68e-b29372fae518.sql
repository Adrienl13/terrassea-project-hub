
-- Partner types enum
CREATE TYPE public.partner_type AS ENUM ('brand', 'manufacturer', 'reseller', 'designer');

-- Partners table
CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_type public.partner_type NOT NULL,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  country text,
  city text,
  description text,
  specialties text[] DEFAULT '{}',
  certifications text[] DEFAULT '{}',
  materials text[] DEFAULT '{}',
  production_capacity text,
  coverage_zone text,
  partner_subtype text,
  project_types text[] DEFAULT '{}',
  website text,
  is_public boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  priority_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public partners are readable" ON public.partners
  FOR SELECT USING (is_public = true);

CREATE POLICY "Allow partner management" ON public.partners
  FOR ALL USING (true) WITH CHECK (true);

-- Partner contact requests
CREATE TABLE public.partner_contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES public.partners(id) ON DELETE CASCADE NOT NULL,
  contact_name text NOT NULL,
  contact_company text,
  contact_country text,
  project_type text,
  estimated_quantity text,
  budget_range text,
  project_date text,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_contact_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit contact request" ON public.partner_contact_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow reading contact requests" ON public.partner_contact_requests
  FOR SELECT USING (true);

-- Partner applications (Become a Partner)
CREATE TABLE public.partner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  country text NOT NULL,
  partner_type public.partner_type NOT NULL,
  website text,
  product_category text,
  certifications text,
  contact_name text,
  contact_email text NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can apply" ON public.partner_applications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow reading applications" ON public.partner_applications
  FOR SELECT USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
