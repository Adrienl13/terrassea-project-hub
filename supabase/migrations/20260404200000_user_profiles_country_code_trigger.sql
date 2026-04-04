-- 1. Add country_code (ISO 2-letter) to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS country_code text;

-- 2. Backfill existing users from country name
UPDATE public.user_profiles SET country_code = CASE country
  WHEN 'France'         THEN 'FR'
  WHEN 'Belgium'        THEN 'BE'
  WHEN 'Switzerland'    THEN 'CH'
  WHEN 'Luxembourg'     THEN 'LU'
  WHEN 'Monaco'         THEN 'MC'
  WHEN 'Italy'          THEN 'IT'
  WHEN 'Spain'          THEN 'ES'
  WHEN 'Portugal'       THEN 'PT'
  WHEN 'Germany'        THEN 'DE'
  WHEN 'Netherlands'    THEN 'NL'
  WHEN 'United Kingdom' THEN 'GB'
  WHEN 'Denmark'        THEN 'DK'
  WHEN 'Sweden'         THEN 'SE'
  WHEN 'Greece'         THEN 'GR'
  WHEN 'Austria'        THEN 'AT'
  WHEN 'Poland'         THEN 'PL'
  ELSE NULL
END
WHERE country IS NOT NULL AND country_code IS NULL;

-- 3. Fix handle_new_user() to populate country + country_code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id, email, first_name, last_name, user_type,
    company, siren, phone, country, country_code
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'client'),
    NEW.raw_user_meta_data->>'company',
    NEW.raw_user_meta_data->>'siren',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'country',
    NEW.raw_user_meta_data->>'country_code'
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name  = EXCLUDED.last_name,
    user_type  = EXCLUDED.user_type,
    company    = EXCLUDED.company,
    siren      = EXCLUDED.siren,
    phone      = EXCLUDED.phone,
    country      = COALESCE(EXCLUDED.country, user_profiles.country),
    country_code = COALESCE(EXCLUDED.country_code, user_profiles.country_code);
  RETURN NEW;
END;
$$;
