-- ============================================================================
-- Dette 103 — cgv_url_grants audit log for signed URL grants
-- Date : 2026-05-15
--
-- Trace immuable des URL signées générées par get-signed-cgv-url Edge Function.
-- Obligatoire avant Vague 2 transactionnelle : sans log, impossible de prouver
-- qu'un buyer a consulté les CGV avant son achat (exigence DSA + L.111-7
-- Code conso FR).
--
-- Schéma :
--   - signed_url_hash : sha256 de la URL signée (la URL elle-même contient un
--     token random + expiry et ne doit pas être stockée en clair). Le hash
--     suffit à corréler post-mortem une consultation à un grant DB.
--   - ip_address / user_agent : captés côté Edge Function via headers.
--   - ttl_seconds + expires_at : duplication intentionnelle pour audit clair.
--
-- Permissions :
--   - SELECT : user own (user_id = auth.uid())
--             OR partner owner (partners.user_id = auth.uid())
--             OR admin (public.is_admin())
--   - INSERT/UPDATE/DELETE : seul le service-role (Edge Function) peut écrire.
--     REVOKE explicite pour anon + authenticated.
-- ============================================================================

BEGIN;

CREATE TABLE public.cgv_url_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  partner_cgv_id uuid NOT NULL REFERENCES public.partner_cgv(id) ON DELETE RESTRICT,
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  signed_url_hash text NOT NULL CHECK (char_length(signed_url_hash) = 64),
  ip_address inet,
  user_agent text,
  ttl_seconds int NOT NULL CHECK (ttl_seconds BETWEEN 30 AND 3600),
  expires_at timestamptz NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cgv_url_grants_user
  ON public.cgv_url_grants(user_id, granted_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX idx_cgv_url_grants_partner
  ON public.cgv_url_grants(partner_id, granted_at DESC)
  WHERE partner_id IS NOT NULL;

CREATE INDEX idx_cgv_url_grants_partner_cgv
  ON public.cgv_url_grants(partner_cgv_id, granted_at DESC);

COMMENT ON TABLE public.cgv_url_grants IS
  'Audit log immuable des URLs signées générées par get-signed-cgv-url Edge Function. Obligatoire DSA + L.111-7 (preuve consultation CGV pré-achat). INSERT via service-role uniquement.';

ALTER TABLE public.cgv_url_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cgv_url_grants_user_read_own"
  ON public.cgv_url_grants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "cgv_url_grants_partner_read_own"
  ON public.cgv_url_grants FOR SELECT
  TO authenticated
  USING (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

CREATE POLICY "cgv_url_grants_admin_read_all"
  ON public.cgv_url_grants FOR SELECT
  TO authenticated
  USING (public.is_admin());

REVOKE INSERT, UPDATE, DELETE ON public.cgv_url_grants FROM anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='cgv_url_grants'
  ) THEN
    RAISE EXCEPTION 'cgv_url_grants table missing';
  END IF;
  RAISE NOTICE 'OK Dette 103 — cgv_url_grants in place';
END $$;

COMMIT;
