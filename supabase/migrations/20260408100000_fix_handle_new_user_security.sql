-- SECURITY FIX: Re-apply admin self-registration guard in handle_new_user()
-- The 20260404200000 migration introduced a regression by dropping the safe_user_type
-- sanitization and re-adding user_type overwrite on conflict.
-- This migration restores both protections while preserving country_code support.

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

  INSERT INTO public.user_profiles (
    id, email, first_name, last_name, user_type,
    company, siren, phone, country, country_code
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    safe_user_type,
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
    -- SECURITY: DO NOT overwrite user_type on conflict (prevents privilege escalation)
    company    = EXCLUDED.company,
    siren      = EXCLUDED.siren,
    phone      = EXCLUDED.phone,
    country      = COALESCE(EXCLUDED.country, user_profiles.country),
    country_code = COALESCE(EXCLUDED.country_code, user_profiles.country_code);
  RETURN NEW;
END;
$$;
