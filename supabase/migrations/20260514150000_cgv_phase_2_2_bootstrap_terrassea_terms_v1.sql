-- ============================================================================
-- CGV Phase 2.2 — Bootstrap terrassea_terms v1.0
-- Date : 2026-05-14
--
-- Insère la row métadonnées correspondant au cadre v1.0 livré 2026-05-14
-- (commit FR `cd1593b` + rename + EN companion `634b5e9`).
--
-- Pré-requis : Phase 2.1 appliquée (table terrassea_terms existe).
--
-- Valeurs scellées :
--   - git_commit_sha = 634b5e985fa24aa1b01ea3ad6fbdc2c669dc4414
--     (commit du rename FR + ajout EN, état canonique v1.0)
--   - fr_sha256 = 22f903204fef08cc682957310b86ad4218c6285cb2e1c071f67ec4c951358d93
--     (legal/terrassea-terms-v1-fr.md @ 634b5e9)
--   - en_sha256 = 6685ff34c409b5f0e46234371ca83e4d0cf3c3a908f684a6e9b1e5df38c64eb1
--     (legal/terrassea-terms-v1-en.md @ 634b5e9)
--   - published_at = 2026-05-14 (date livraison Phase 1, cf. CGV_STRATEGY.md)
--   - legal_review_status = self_validated (lawyer review différée — Dette 78)
-- ============================================================================

BEGIN;

INSERT INTO public.terrassea_terms (
  version,
  title,
  legal_review_status,
  git_commit_sha,
  fr_source_path,
  en_source_path,
  fr_sha256,
  en_sha256,
  published_at,
  supersedes_version,
  notes
) VALUES (
  1,
  'Terrassea Terms v1.0',
  'self_validated',
  '634b5e985fa24aa1b01ea3ad6fbdc2c669dc4414',
  'legal/terrassea-terms-v1-fr.md',
  'legal/terrassea-terms-v1-en.md',
  '22f903204fef08cc682957310b86ad4218c6285cb2e1c071f67ec4c951358d93',
  '6685ff34c409b5f0e46234371ca83e4d0cf3c3a908f684a6e9b1e5df38c64eb1',
  '2026-05-14 00:00:00+00',
  NULL,
  'Cadre initial Vague 1. FR = autoritaire (legal/terrassea-terms-v1-fr.md), EN = informationnel non-binding (legal/terrassea-terms-v1-en.md, disclaimer en tête). Inspired Stripe Connect Terms + Etsy Seller Policy. Mentions provisoires Vague 1 : Founding Partner pré-commercial, médiateur conso à désigner avant Vague 2 (Dette 79), DPO formel à désigner. Pending lawyer review (Dette 78 — Critical avant volume transactions).'
)
ON CONFLICT (version) DO NOTHING;

-- Validation
DO $$
DECLARE
  v_row record;
BEGIN
  SELECT * INTO v_row
  FROM public.terrassea_terms
  WHERE version = 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bootstrap row v1 not inserted';
  END IF;

  IF v_row.legal_review_status <> 'self_validated' THEN
    RAISE EXCEPTION 'v1 legal_review_status mismatch: %', v_row.legal_review_status;
  END IF;

  IF char_length(v_row.git_commit_sha) <> 40 THEN
    RAISE EXCEPTION 'v1 git_commit_sha length mismatch';
  END IF;

  IF char_length(v_row.fr_sha256) <> 64 OR char_length(v_row.en_sha256) <> 64 THEN
    RAISE EXCEPTION 'v1 sha256 length mismatch';
  END IF;

  RAISE NOTICE 'OK CGV Phase 2.2 — terrassea_terms v1.0 bootstrapped (id=%)', v_row.id;
END $$;

COMMIT;
