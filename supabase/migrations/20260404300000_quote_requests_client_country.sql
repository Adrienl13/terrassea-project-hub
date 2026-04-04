-- Add client_country_code to quote_requests for geo-routing
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS client_country_code text;

-- Index for filtering by country
CREATE INDEX IF NOT EXISTS idx_quote_requests_client_country
  ON public.quote_requests (client_country_code)
  WHERE client_country_code IS NOT NULL;
