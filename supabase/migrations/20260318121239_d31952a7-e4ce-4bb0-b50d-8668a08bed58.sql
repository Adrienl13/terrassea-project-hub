
-- Use pg_net to call the edge function from triggers
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Function to call the edge function on quote_requests INSERT
CREATE OR REPLACE FUNCTION public.notify_quote_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM extensions.http_post(
    url := 'https://cguffqiewducpbofdvff.supabase.co/functions/v1/send-quote-notification',
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'quote_requests',
      'record', row_to_json(NEW)::jsonb
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNndWZmcWlld2R1Y3Bib2ZkdmZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTkxNTcsImV4cCI6MjA4ODk5NTE1N30.rgQt4LUIdWY-M0XsNUv9GmLvuQbIcYzyms8ia7p9IuI'
    )
  );
  RETURN NEW;
END;
$$;

-- Function to call the edge function on partner_applications INSERT
CREATE OR REPLACE FUNCTION public.notify_application_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM extensions.http_post(
    url := 'https://cguffqiewducpbofdvff.supabase.co/functions/v1/send-quote-notification',
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'partner_applications',
      'record', row_to_json(NEW)::jsonb
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNndWZmcWlld2R1Y3Bib2ZkdmZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTkxNTcsImV4cCI6MjA4ODk5NTE1N30.rgQt4LUIdWY-M0XsNUv9GmLvuQbIcYzyms8ia7p9IuI'
    )
  );
  RETURN NEW;
END;
$$;

-- Function to call the edge function on partner_applications UPDATE
CREATE OR REPLACE FUNCTION public.notify_application_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM extensions.http_post(
    url := 'https://cguffqiewducpbofdvff.supabase.co/functions/v1/send-quote-notification',
    body := jsonb_build_object(
      'type', 'UPDATE',
      'table', 'partner_applications',
      'record', row_to_json(NEW)::jsonb
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNndWZmcWlld2R1Y3Bib2ZkdmZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTkxNTcsImV4cCI6MjA4ODk5NTE1N30.rgQt4LUIdWY-M0XsNUv9GmLvuQbIcYzyms8ia7p9IuI'
    )
  );
  RETURN NEW;
END;
$$;

-- Trigger 1: quote-submitted
CREATE TRIGGER quote_submitted
  AFTER INSERT ON public.quote_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_quote_submitted();

-- Trigger 2: application-submitted
CREATE TRIGGER application_submitted
  AFTER INSERT ON public.partner_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_application_submitted();

-- Trigger 3: application-approved
CREATE TRIGGER application_approved
  AFTER UPDATE ON public.partner_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_application_approved();
