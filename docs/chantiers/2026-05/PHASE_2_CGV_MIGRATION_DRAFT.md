# Phase 2 CGV — Migration DB + Storage (DRAFT)

> **Status** : DRAFT awaiting founder review — NOT YET APPLIED.
> **Created** : 2026-05-14
> **Companion** : `docs/strategy/CGV_STRATEGY.md` §5 Phase 2
> **Apply procedure** : §7 of this document.

---

## 1. Objectif

Mettre en place le socle DB pour la gestion versionnée des CGV :
1. Versions du cadre Terrassea (master Terms FR + EN)
2. Versions des CGV des marques partenaires
3. État courant dénormalisé par partenaire (cache lecture)
4. Journal d'audit immuable de toutes les acceptations CGV

Plus le bucket Storage `partner-cgv` et ses politiques d'accès.

**Hors scope** :
- Conversion DOCX → PDF (capturée Dette 100 — PDF only en MVP, cf. CGV_STRATEGY §6 risque 2)
- Components frontend (Phase 3)
- Edge Function `get-signed-cgv-url` (Phase 3 — génération URL signée pour buyers)

---

## 2. Modèle de données — synthèse

| Table | Rôle | Lignes attendues v1 |
|---|---|---|
| `terrassea_terms` | Versions du cadre maître Terrassea (FR authoritative + EN informational) | 1 (v1.0 livrée 2026-05-14) |
| `partner_cgv` | Versions des CGV par marque (PDF only en MVP) | 0 au démarrage Vague 2 |
| `partner_cgv_metadata` | Cache de l'état courant par partenaire (1 ligne / partenaire) | Auto-créées par trigger |
| `cgv_acceptances` | Journal d'audit immuable IP + UA + contexte | Append-only |

---

## 3. Décisions FK / CASCADE / RESTRICT

| FK | Cible | Action | Rationale |
|---|---|---|---|
| `partner_cgv.partner_id` | `partners.id` | **CASCADE** | Si partner hard-deleted, son historique GCS part avec — mais hard-delete impossible si acceptances existent (RESTRICT en aval, voir ci-dessous). En pratique, partners avec transactions = soft-delete uniquement. |
| `partner_cgv.created_by` | `user_profiles.id` | SET NULL | Préserver l'historique CGV même si compte user supprimé. |
| `partner_cgv.archived_by` | `user_profiles.id` | SET NULL | Idem. |
| `partner_cgv_metadata.partner_id` | `partners.id` | **CASCADE** | Cache lié au partner, disparaît avec lui. |
| `partner_cgv_metadata.current_cgv_id` | `partner_cgv.id` | **RESTRICT** | Force archivage avant suppression (intégrité). N'entre pas en conflit avec CASCADE partners→partner_cgv car l'ordre d'évaluation supprime d'abord les rows partner_cgv qui à leur tour cascadent les rows metadata. |
| `partner_cgv_metadata.admin_reviewed_by` | `user_profiles.id` | SET NULL | Préserver l'historique. |
| `terrassea_terms.created_by` | `user_profiles.id` | SET NULL | Préserver versions historiques. |
| `cgv_acceptances.user_id` | `user_profiles.id` | SET NULL | RGPD : si user demande suppression compte, l'acceptance reste anonymisée (preuve d'acceptation conservée à des fins légales conformément à L.123-22 Code de commerce + obligations DSA). |
| `cgv_acceptances.terrassea_terms_id` | `terrassea_terms.id` | **RESTRICT** | Empêche suppression d'une version Terrassea acceptée. |
| `cgv_acceptances.partner_cgv_id` | `partner_cgv.id` | **RESTRICT** | Empêche suppression d'une CGV marque acceptée → force archivage. **Conséquence** : un partner avec des acceptances ne peut PAS être hard-deleted, le CASCADE partners→partner_cgv échouera. C'est intentionnel (intégrité audit) → impose soft-delete pour les partners en production. |
| `cgv_acceptances.partner_id` | `partners.id` | SET NULL | Conservation de l'acceptance même si partner anonymisé. |

---

## 4. RLS — résumé

| Table | Read public | Read partner owner | Read user | Read admin | Write |
|---|---|---|---|---|---|
| `terrassea_terms` | ✅ si status validé | — | — | ✅ all | admin only |
| `partner_cgv` | ✅ si status='active' | ✅ all statuses (own) | — | ✅ all | partner owner INSERT/UPDATE (own) + admin |
| `partner_cgv_metadata` | ✅ all | — | — | ✅ all | trigger only (SECURITY DEFINER) + admin |
| `cgv_acceptances` | ❌ | ✅ acceptances liées à ses CGV | ✅ ses propres acceptances | ✅ all | **RPC only** `record_cgv_acceptance` (SECURITY DEFINER) — INSERT/UPDATE/DELETE révoqués |

**Note sur la lecture buyers** : les CGV `status='active'` sont publiquement lisibles via la table (métadonnées), mais les **fichiers PDF dans Storage** ne sont accessibles que via signed URL générée par Edge Function en Phase 3. Le bucket lui-même reste privé.

---

## 5. Migration SQL (draft complet)

Filename cible : `supabase/migrations/20260514120000_cgv_phase_2_tables.sql`

```sql
-- =================================================================
-- CGV Phase 2 — Schema DB pour gestion versionnée Terrassea Terms,
-- Partner CGV, et journal d'acceptations immuable.
--
-- Compagnon : docs/strategy/CGV_STRATEGY.md §5 Phase 2
-- Draft : docs/chantiers/2026-05/PHASE_2_CGV_MIGRATION_DRAFT.md
-- =================================================================

BEGIN;

-- ---------------------------------------------------------------
-- TABLE 1 : terrassea_terms
-- Versions du cadre maître Terrassea. FR authoritative + EN informational.
-- Les fichiers sources vivent dans legal/ (git-tracked, pas Storage).
-- ---------------------------------------------------------------
CREATE TABLE public.terrassea_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version int NOT NULL,
  title text NOT NULL,
  status text NOT NULL CHECK (status IN ('draft','self_validated','lawyer_validated','deprecated')),
  fr_source_path text NOT NULL,
  en_source_path text,
  fr_sha256 text NOT NULL CHECK (char_length(fr_sha256) = 64),
  en_sha256 text CHECK (en_sha256 IS NULL OR char_length(en_sha256) = 64),
  effective_date date NOT NULL,
  supersedes_version int,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,

  CONSTRAINT terrassea_terms_version_unique UNIQUE (version),
  CONSTRAINT terrassea_terms_supersedes_valid CHECK (supersedes_version IS NULL OR supersedes_version < version)
);

CREATE INDEX idx_terrassea_terms_status_active
  ON public.terrassea_terms(effective_date DESC)
  WHERE status IN ('self_validated','lawyer_validated');

COMMENT ON TABLE public.terrassea_terms IS
  'Historique des versions du cadre Terrassea (master Terms). FR = autoritaire, EN = informationnel. Les fichiers sources vivent dans legal/ (git-tracked) ; fr_source_path / en_source_path sont des chemins relatifs au repo. sha256 garantit l''immuabilité des snapshots.';

-- ---------------------------------------------------------------
-- TABLE 2 : partner_cgv
-- Historique versionné des CGV de chaque marque. PDF only en MVP (Dette 100).
-- Fichiers stockés dans bucket Storage 'partner-cgv'.
-- ---------------------------------------------------------------
CREATE TABLE public.partner_cgv (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  version int NOT NULL,
  title text NOT NULL,
  storage_path text NOT NULL,
  mime_type text NOT NULL DEFAULT 'application/pdf' CHECK (mime_type = 'application/pdf'),
  sha256 text NOT NULL CHECK (char_length(sha256) = 64),
  byte_size int NOT NULL CHECK (byte_size > 0 AND byte_size <= 25 * 1024 * 1024),
  status text NOT NULL CHECK (status IN ('draft','active','archived')),
  effective_date date NOT NULL,
  archived_at timestamptz,
  archived_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  archive_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,

  CONSTRAINT partner_cgv_version_unique UNIQUE (partner_id, version),
  CONSTRAINT partner_cgv_archive_consistency CHECK (
    (status = 'archived' AND archived_at IS NOT NULL)
    OR (status <> 'archived' AND archived_at IS NULL)
  )
);

-- Un seul 'active' à la fois par partenaire (contrainte métier)
CREATE UNIQUE INDEX idx_partner_cgv_one_active_per_partner
  ON public.partner_cgv(partner_id)
  WHERE status = 'active';

CREATE INDEX idx_partner_cgv_partner_status
  ON public.partner_cgv(partner_id, status);

CREATE INDEX idx_partner_cgv_effective_date
  ON public.partner_cgv(partner_id, effective_date DESC);

COMMENT ON TABLE public.partner_cgv IS
  'Historique versionné des CGV par marque. PDF only en MVP (Dette 100 = conversion DOCX→PDF différée). Chemin Storage dans bucket partner-cgv, format {partner_id}/v{N}.pdf. sha256 immuabilise les snapshots.';

-- ---------------------------------------------------------------
-- TABLE 3 : partner_cgv_metadata
-- Cache dénormalisé de l'état courant par partenaire. Maintenu via trigger.
-- ---------------------------------------------------------------
CREATE TABLE public.partner_cgv_metadata (
  partner_id uuid PRIMARY KEY REFERENCES public.partners(id) ON DELETE CASCADE,
  current_cgv_id uuid REFERENCES public.partner_cgv(id) ON DELETE RESTRICT,
  current_version int,
  needs_renewal boolean NOT NULL DEFAULT false,
  renewal_reason text,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  admin_reviewed_at timestamptz,
  admin_reviewed_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,

  CONSTRAINT partner_cgv_metadata_current_consistency CHECK (
    (current_cgv_id IS NULL AND current_version IS NULL)
    OR (current_cgv_id IS NOT NULL AND current_version IS NOT NULL)
  )
);

CREATE INDEX idx_partner_cgv_metadata_needs_renewal
  ON public.partner_cgv_metadata(partner_id)
  WHERE needs_renewal = true;

COMMENT ON TABLE public.partner_cgv_metadata IS
  'Cache dénormalisé de la CGV active courante par partenaire. Maintenu automatiquement par trigger sync_partner_cgv_metadata. Mutations directes interdites côté client.';

-- ---------------------------------------------------------------
-- TABLE 4 : cgv_acceptances
-- Journal d'audit immuable. UPDATE/DELETE révoqués. IP + UA captés serveur.
-- ---------------------------------------------------------------
CREATE TABLE public.cgv_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  acceptance_type text NOT NULL CHECK (acceptance_type IN ('terrassea_terms','partner_cgv')),
  terrassea_terms_id uuid REFERENCES public.terrassea_terms(id) ON DELETE RESTRICT,
  partner_cgv_id uuid REFERENCES public.partner_cgv(id) ON DELETE RESTRICT,
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  ip_address inet NOT NULL,
  user_agent text NOT NULL,
  context text NOT NULL CHECK (context IN ('signup','quote_signature','order_placement','partner_onboarding','manual')),
  context_reference_id uuid,
  accepted_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT cgv_acceptances_target_consistency CHECK (
    (acceptance_type = 'terrassea_terms' AND terrassea_terms_id IS NOT NULL AND partner_cgv_id IS NULL)
    OR
    (acceptance_type = 'partner_cgv' AND partner_cgv_id IS NOT NULL AND terrassea_terms_id IS NULL)
  )
);

CREATE INDEX idx_cgv_acceptances_user
  ON public.cgv_acceptances(user_id, accepted_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX idx_cgv_acceptances_partner
  ON public.cgv_acceptances(partner_id, accepted_at DESC)
  WHERE partner_id IS NOT NULL;

CREATE INDEX idx_cgv_acceptances_terrassea_terms
  ON public.cgv_acceptances(terrassea_terms_id)
  WHERE terrassea_terms_id IS NOT NULL;

CREATE INDEX idx_cgv_acceptances_partner_cgv
  ON public.cgv_acceptances(partner_cgv_id)
  WHERE partner_cgv_id IS NOT NULL;

CREATE INDEX idx_cgv_acceptances_context_ref
  ON public.cgv_acceptances(context, context_reference_id)
  WHERE context_reference_id IS NOT NULL;

COMMENT ON TABLE public.cgv_acceptances IS
  'Journal d''audit immuable des acceptations CGV. UPDATE/DELETE révoqués (cf. REVOKE plus bas). IP + user_agent captés serveur via RPC record_cgv_acceptance(SECURITY DEFINER) pour bloquer le spoofing client. user_id en SET NULL pour conformité RGPD droit à l''oubli — acceptance preserved as anonymized audit trail (obligation L.123-22 + DSA).';

-- ---------------------------------------------------------------
-- TRIGGER : sync_partner_cgv_metadata
-- Maintient automatiquement partner_cgv_metadata.current_* à jour
-- en réaction aux INSERT/UPDATE de status / DELETE sur partner_cgv.
-- Pattern hardened : SECURITY DEFINER + search_path unquoted.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_partner_cgv_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_partner_id uuid;
  v_active_id uuid;
  v_active_version int;
BEGIN
  v_partner_id := COALESCE(NEW.partner_id, OLD.partner_id);

  -- Trouve la CGV 'active' courante pour ce partenaire (au plus une, contrainte unique partielle)
  SELECT id, version
  INTO v_active_id, v_active_version
  FROM public.partner_cgv
  WHERE partner_id = v_partner_id AND status = 'active'
  LIMIT 1;

  INSERT INTO public.partner_cgv_metadata (
    partner_id, current_cgv_id, current_version, last_updated_at
  )
  VALUES (
    v_partner_id, v_active_id, v_active_version, now()
  )
  ON CONFLICT (partner_id) DO UPDATE
    SET current_cgv_id = EXCLUDED.current_cgv_id,
        current_version = EXCLUDED.current_version,
        last_updated_at = now();

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_partner_cgv_sync_metadata
  AFTER INSERT OR UPDATE OF status OR DELETE
  ON public.partner_cgv
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_partner_cgv_metadata();

COMMENT ON FUNCTION public.sync_partner_cgv_metadata IS
  'Trigger SECURITY DEFINER maintenant partner_cgv_metadata. Pattern search_path hardened (cf. Bug #1 / Dette 75 / Dette 74).';

-- ---------------------------------------------------------------
-- RPC : record_cgv_acceptance
-- SEULE voie d'INSERT dans cgv_acceptances. Capte IP + UA serveur.
-- Pattern hardened : SECURITY DEFINER + search_path unquoted.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_cgv_acceptance(
  p_acceptance_type text,
  p_context text,
  p_terrassea_terms_id uuid DEFAULT NULL,
  p_partner_cgv_id uuid DEFAULT NULL,
  p_context_reference_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_ip inet;
  v_ua text;
  v_partner_id uuid;
  v_id uuid;
  v_headers jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to record CGV acceptance';
  END IF;

  -- Extraction IP + UA via PostgREST request.headers
  BEGIN
    v_headers := current_setting('request.headers', true)::jsonb;
  EXCEPTION WHEN OTHERS THEN
    v_headers := '{}'::jsonb;
  END;

  -- x-forwarded-for peut contenir une liste séparée par virgule — prendre la première
  v_ip := COALESCE(
    NULLIF(split_part(v_headers ->> 'x-forwarded-for', ',', 1), '')::inet,
    inet '0.0.0.0'
  );
  v_ua := COALESCE(NULLIF(v_headers ->> 'user-agent', ''), 'unknown');

  -- Dérive partner_id depuis partner_cgv si pertinent
  IF p_partner_cgv_id IS NOT NULL THEN
    SELECT partner_id INTO v_partner_id
    FROM public.partner_cgv
    WHERE id = p_partner_cgv_id;

    IF v_partner_id IS NULL THEN
      RAISE EXCEPTION 'partner_cgv_id % not found', p_partner_cgv_id;
    END IF;
  END IF;

  INSERT INTO public.cgv_acceptances (
    user_id, acceptance_type,
    terrassea_terms_id, partner_cgv_id, partner_id,
    ip_address, user_agent,
    context, context_reference_id
  ) VALUES (
    v_user_id, p_acceptance_type,
    p_terrassea_terms_id, p_partner_cgv_id, v_partner_id,
    v_ip, v_ua,
    p_context, p_context_reference_id
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_cgv_acceptance(text, text, uuid, uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.record_cgv_acceptance IS
  'Point d''entrée unique pour enregistrer une acceptation CGV. Capte IP + UA serveur (anti-spoof client). Pattern SECURITY DEFINER + search_path hardened.';

-- ---------------------------------------------------------------
-- RLS — enable + policies
-- ---------------------------------------------------------------
ALTER TABLE public.terrassea_terms      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_cgv          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_cgv_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cgv_acceptances      ENABLE ROW LEVEL SECURITY;

-- ----- terrassea_terms -----
CREATE POLICY "terrassea_terms_public_read_validated"
  ON public.terrassea_terms FOR SELECT
  TO anon, authenticated
  USING (status IN ('self_validated','lawyer_validated'));

CREATE POLICY "terrassea_terms_admin_all"
  ON public.terrassea_terms FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----- partner_cgv -----
CREATE POLICY "partner_cgv_public_read_active"
  ON public.partner_cgv FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

CREATE POLICY "partner_cgv_owner_read_all_own"
  ON public.partner_cgv FOR SELECT
  TO authenticated
  USING (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

CREATE POLICY "partner_cgv_owner_insert_own"
  ON public.partner_cgv FOR INSERT
  TO authenticated
  WITH CHECK (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

CREATE POLICY "partner_cgv_owner_update_own"
  ON public.partner_cgv FOR UPDATE
  TO authenticated
  USING (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  )
  WITH CHECK (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

CREATE POLICY "partner_cgv_admin_all"
  ON public.partner_cgv FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----- partner_cgv_metadata -----
-- Lecture publique (juste un cache de l'état "qui a une CGV active"),
-- écriture seulement via trigger SECURITY DEFINER + admin.
CREATE POLICY "partner_cgv_metadata_public_read"
  ON public.partner_cgv_metadata FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "partner_cgv_metadata_admin_all"
  ON public.partner_cgv_metadata FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----- cgv_acceptances -----
-- SELECT : user voit ses acceptances, partner voit celles liées à ses CGV, admin all.
CREATE POLICY "cgv_acceptances_user_read_own"
  ON public.cgv_acceptances FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "cgv_acceptances_partner_read_own"
  ON public.cgv_acceptances FOR SELECT
  TO authenticated
  USING (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

CREATE POLICY "cgv_acceptances_admin_all"
  ON public.cgv_acceptances FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- AUCUNE policy INSERT/UPDATE/DELETE → seul le RPC SECURITY DEFINER peut écrire.
-- En complément, REVOKE explicite pour bloquer toute tentative directe :
REVOKE INSERT, UPDATE, DELETE ON public.cgv_acceptances FROM anon, authenticated;

-- ---------------------------------------------------------------
-- STORAGE — bucket partner-cgv (private, PDF only, 25 MB max)
-- ---------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'partner-cgv',
  'partner-cgv',
  false,
  25 * 1024 * 1024,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
  SET file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types,
      public = EXCLUDED.public;

-- Storage policies : owner peut upload + lire ses propres fichiers (subfolder = partner_id).
-- Buyer access = via signed URL générée par Edge Function (Phase 3), pas de policy directe.

CREATE POLICY "partner_cgv_storage_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'partner-cgv'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.partners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "partner_cgv_storage_owner_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'partner-cgv'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.partners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "partner_cgv_storage_admin_all"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'partner-cgv' AND public.is_admin())
  WITH CHECK (bucket_id = 'partner-cgv' AND public.is_admin());

COMMIT;
```

---

## 6. Open questions pour review founder

1. **Versions Terrassea Terms — git vs Storage** : j'ai choisi git-tracked (chemin relatif `legal/`). Avantage : review en PR. Inconvénient : le sha256 doit être calculé manuellement / via script CI à chaque release. **OK ou tu préfères Storage aussi ?**

2. **CGV public reads** : j'autorise la lecture publique des CGV `status='active'` (table metadata), partant du principe que les conditions générales d'une marque sont un document juridique public (comme les Terms d'un site). L'accès aux **fichiers PDF** reste contrôlé via signed URL. **OK ou tu veux un scope plus serré (ex : seulement aux users avec un quote en cours avec ce partner) ?**

3. **REVOKE INSERT sur cgv_acceptances + RPC unique** : tout INSERT passe par `record_cgv_acceptance`. Frontend ne peut PAS insérer directement. **OK ?**

4. **RGPD vs audit trail** : `cgv_acceptances.user_id ON DELETE SET NULL`. Si un user demande suppression compte, l'acceptance reste mais user_id devient null (preuve conservée à fins légales, anonymisée). **OK pour Phase 1 ou tu veux un mécanisme plus fin ?**

5. **Soft-delete partners obligatoire en prod** : conséquence de `cgv_acceptances.partner_cgv_id ON DELETE RESTRICT` — un partner avec des acceptances ne peut PAS être hard-deleted. Comportement souhaité (intégrité audit). **OK ?**

6. **Bootstrap row terrassea_terms v1** : faut-il inclure dans cette migration un INSERT initial pour la version v1.0 livrée 2026-05-14, ou faire ça dans une migration séparée après validation ? Je recommande **migration séparée** pour garder Phase 2 schema-only et faciliter rollback.

7. **Storage Edge Function `get-signed-cgv-url`** : Phase 3. Je propose ce signature :
   ```ts
   POST /functions/v1/get-signed-cgv-url
   body: { partner_cgv_id: uuid, ttl_seconds?: number }
   returns: { url: string, expires_at: string }
   ```
   Validation côté function : `partner_cgv.status = 'active'` requis. **OK comme design Phase 3 ?**

---

## 7. Apply procedure (post-review)

Une fois les 7 points validés :

1. Créer le fichier SQL dans `supabase/migrations/20260514120000_cgv_phase_2_tables.sql` (copie du bloc SQL §5).
2. Appliquer via `mcp__supabase__apply_migration` (atomique).
3. Vérifier `get_advisors` post-application → 0 erreur attendue, WARN acceptés si déjà présents avant.
4. `git add` la migration + ce draft + l'update DETTE_TECHNIQUE_AUDIT.md (Dette 100).
5. Commit avec message `feat(cgv): Phase 2 — DB schema + Storage bucket (4 tables + RLS + RPC)`.
6. Push origin/main.
7. Marquer §5 Phase 2 LIVRÉE dans `CGV_STRATEGY.md`.

---

## 8. Tests post-application

À enchaîner aussitôt que migration appliquée :

- `SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('terrassea_terms','partner_cgv','partner_cgv_metadata','cgv_acceptances');` → 4 lignes, toutes `rowsecurity=true`.
- Tenter un INSERT direct dans `cgv_acceptances` depuis le rôle `authenticated` → doit échouer (REVOKE).
- Appeler `record_cgv_acceptance` avec auth.uid() set → doit retourner un uuid.
- Insérer un partner_cgv `status='active'` puis un second `status='active'` pour le même partner → le second doit échouer (unique partial index).
- Vérifier trigger : un INSERT `status='active'` doit peupler `partner_cgv_metadata` correspondant.

---

## 9. Hors scope Phase 2 (à venir)

- Phase 3 : components frontend + Edge Function signed URL
- Phase 4 : tests e2e + migration emails Founding Partners
- Phase 5 : adhésion médiateur conso agréé
- Dette 100 : conversion DOCX → PDF si demande réelle au-delà du MVP
