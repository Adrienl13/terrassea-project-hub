-- ============================================================================
-- Phase 1: Fix quote system critical issues
-- ============================================================================

-- ── 1. Add phone column to quote_requests ──────────────────────────────────
ALTER TABLE public.quote_requests ADD COLUMN IF NOT EXISTS phone text;

-- ── 2. Add INSERT policy for clients/architects on quote_requests ──────────
-- Without this, client-side inserts silently fail when RLS is enabled
CREATE POLICY "Authenticated users can insert quote requests"
  ON public.quote_requests FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL OR client_user_id IS NULL);

-- ── 3. Add SELECT policy for architects (user_type = 'architect') ──────────
CREATE POLICY "Architects can read own quote requests"
  ON public.quote_requests FOR SELECT
  USING (
    client_user_id = auth.uid()
    OR email = (SELECT email FROM public.user_profiles WHERE id = auth.uid())
  );

-- ── 4. Add UPDATE policy for clients/architects (accept/sign) ──────────────
CREATE POLICY "Clients can update own quote requests"
  ON public.quote_requests FOR UPDATE
  USING (
    client_user_id = auth.uid()
    OR email = (SELECT email FROM public.user_profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    client_user_id = auth.uid()
    OR email = (SELECT email FROM public.user_profiles WHERE id = auth.uid())
  );

-- ── 5. Enable RLS on quote_documents and add policies ──────────────────────
ALTER TABLE public.quote_documents ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full access to quote_documents"
  ON public.quote_documents FOR ALL
  USING (public.is_admin());

-- Partners can manage documents for their assigned quotes
CREATE POLICY "Partners can manage own quote documents"
  ON public.quote_documents FOR ALL
  USING (
    quote_request_id IN (
      SELECT qr.id FROM public.quote_requests qr
      WHERE qr.partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
    )
  );

-- Clients can read documents for their own quotes (after signing)
CREATE POLICY "Clients can read own quote documents"
  ON public.quote_documents FOR SELECT
  USING (
    quote_request_id IN (
      SELECT qr.id FROM public.quote_requests qr
      WHERE qr.client_user_id = auth.uid()
        OR qr.email = (SELECT email FROM public.user_profiles WHERE id = auth.uid())
    )
  );

-- ── 6. Fix DB trigger functions to use proper auth ─────────────────────────
-- The triggers were using the anon key which was rejected by the edge function.
-- We use vault to store a shared secret for trigger→edge-function auth.

-- Store the trigger secret in vault (update this value in production)
INSERT INTO vault.secrets (name, secret)
VALUES ('edge_function_trigger_secret', 'terrassea-trigger-secret-change-me')
ON CONFLICT (name) DO NOTHING;

-- Recreate trigger functions with the vault-based secret
CREATE OR REPLACE FUNCTION public.notify_quote_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _secret text;
  _url text;
BEGIN
  SELECT decrypted_secret INTO _secret
    FROM vault.decrypted_secrets
    WHERE name = 'edge_function_trigger_secret'
    LIMIT 1;

  _url := current_setting('app.settings.supabase_url', true);
  IF _url IS NULL THEN
    _url := 'https://cguffqiewducpbofdvff.supabase.co';
  END IF;

  PERFORM extensions.http_post(
    url := _url || '/functions/v1/send-quote-notification',
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'quote_requests',
      'record', row_to_json(NEW)::jsonb
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Trigger-Secret', COALESCE(_secret, '')
    )
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_application_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _secret text;
  _url text;
BEGIN
  SELECT decrypted_secret INTO _secret
    FROM vault.decrypted_secrets
    WHERE name = 'edge_function_trigger_secret'
    LIMIT 1;

  _url := current_setting('app.settings.supabase_url', true);
  IF _url IS NULL THEN
    _url := 'https://cguffqiewducpbofdvff.supabase.co';
  END IF;

  PERFORM extensions.http_post(
    url := _url || '/functions/v1/send-quote-notification',
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'partner_applications',
      'record', row_to_json(NEW)::jsonb
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Trigger-Secret', COALESCE(_secret, '')
    )
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_application_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _secret text;
  _url text;
BEGIN
  SELECT decrypted_secret INTO _secret
    FROM vault.decrypted_secrets
    WHERE name = 'edge_function_trigger_secret'
    LIMIT 1;

  _url := current_setting('app.settings.supabase_url', true);
  IF _url IS NULL THEN
    _url := 'https://cguffqiewducpbofdvff.supabase.co';
  END IF;

  PERFORM extensions.http_post(
    url := _url || '/functions/v1/send-quote-notification',
    body := jsonb_build_object(
      'type', 'UPDATE',
      'table', 'partner_applications',
      'record', row_to_json(NEW)::jsonb
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Trigger-Secret', COALESCE(_secret, '')
    )
  );
  RETURN NEW;
END;
$$;
