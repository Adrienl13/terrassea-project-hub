-- Documentation rétroactive de la suppression manuelle des
-- products tests ÉTAPE 7 validation (chantier Modèle B variants
-- étendu).
--
-- Contexte : pendant la validation ÉTAPE 7 le 2026-05-02, le
-- founder a approuvé 2 submissions tests qui ont matérialisé
-- 2 products + 6 variants. Après validation, le founder a
-- supprimé ces products manuellement via UI ou SQL direct, sans
-- passer par une migration versionnée.
--
-- Cette migration documente cet événement pour cohérence avec
-- la règle CLAUDE.md "drift prevention". Elle ne modifie PAS la
-- DB (les produits sont déjà supprimés).
--
-- Products supprimés (manuellement, hors-migration) :
-- - bbac50af-bd78-473f-8bfd-75c5da256328 "TEST ÉTAPE 7 - Variants"
-- - 8069f268-3bf6-4365-ab15-f1f7576fed61 "Test Vari Tables"
--
-- Submissions associées (laissées en DB avec FK SET NULL) :
-- - db567bcb-2c9e-4bfc-96a7-f7d8b0f58f93
-- - 8c8f43e8-6b6f-4a31-8216-7fb11513039b
--
-- Validation : assertion que l'état DB correspond bien à
-- l'attendu post-suppression.

DO $$
DECLARE
  products_count int;
  test_variants_remaining int;
  orphan_submissions_count int;
BEGIN
  SELECT COUNT(*) INTO products_count FROM public.products;

  SELECT COUNT(*) INTO test_variants_remaining
    FROM public.product_variants
    WHERE product_id IN (
      'bbac50af-bd78-473f-8bfd-75c5da256328',
      '8069f268-3bf6-4365-ab15-f1f7576fed61'
    );

  SELECT COUNT(*) INTO orphan_submissions_count
    FROM public.product_submissions
    WHERE id IN (
      'db567bcb-2c9e-4bfc-96a7-f7d8b0f58f93',
      '8c8f43e8-6b6f-4a31-8216-7fb11513039b'
    )
    AND status = 'approved'
    AND approved_product_id IS NULL;

  IF products_count != 52 THEN
    RAISE EXCEPTION 'Expected 52 products post-cleanup, got %',
      products_count;
  END IF;

  IF test_variants_remaining != 0 THEN
    RAISE EXCEPTION 'Expected 0 test variants remaining, got %',
      test_variants_remaining;
  END IF;

  IF orphan_submissions_count != 2 THEN
    RAISE EXCEPTION
      'Expected 2 orphan submissions (FK SET NULL), got %',
      orphan_submissions_count;
  END IF;

  RAISE NOTICE
    'Documentation OK: 52 products, 0 test variants, 2 orphan submissions FK SET NULL';
END $$;
