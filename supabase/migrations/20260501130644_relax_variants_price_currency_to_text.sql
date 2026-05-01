-- Phase 1 Modèle B variants — Correction ÉTAPE 4b
-- Réf : docs/chantiers/2026-05/PLAN_MODELE_B_VARIANTS.md §3 décisions
--      docs/strategy/PRODUCT_DATA_VISION.md §4.6 D-PV-13
-- Création 2026-05-01.
--
-- CONTEXTE
-- Erreur de design ÉTAPE 3 : la migration `create_product_variants` a posé une
-- FK `price_currency text REFERENCES markets(code)` au moment de définir le
-- défaut 'EUR'. Sémantiquement incorrecte : markets contient des codes ZONE
-- GÉOGRAPHIQUE (EU, FR, IT, ES, DE, UK, CH, US), pas des codes DEVISE ISO 4217
-- (EUR, GBP, CHF, USD).
--
-- Bug détecté pendant ÉTAPE 4b à la première tentative d'INSERT des 52 default
-- variants : Postgres a rejeté `price_currency='EUR'` car 'EUR' n'existe pas
-- dans `markets`. Rollback Postgres complet, 0 variant créé.
--
-- CORRECTION PHASE 1
-- DROP CONSTRAINT product_variants_price_currency_fkey.
-- price_currency reste un text NOT NULL DEFAULT 'EUR'. Le format est validé
-- par le CHECK regex `^[A-Z]{3}$` (déjà présent au niveau de markets.currency
-- mais pas de product_variants.price_currency). On AJOUTE un CHECK regex sur
-- product_variants.price_currency aussi pour cohérence.
--
-- Phase 2 (à évaluer selon usage réel) : table `currencies` dédiée si besoin
-- observé (D-PV-13 pattern entités partagées).
--
-- Idempotence : la migration est conçue pour passer même si la FK a déjà été
-- droppée (cf. IF EXISTS).

ALTER TABLE public.product_variants
  DROP CONSTRAINT IF EXISTS product_variants_price_currency_fkey;

-- Ajout du CHECK regex pour valider le format ISO 4217 (3 lettres maj)
-- L'existence du CHECK est vérifiée dynamiquement pour éviter les doublons.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_variants_price_currency_iso4217_check'
      AND conrelid = 'public.product_variants'::regclass
  ) THEN
    ALTER TABLE public.product_variants
      ADD CONSTRAINT product_variants_price_currency_iso4217_check
      CHECK (price_currency ~ '^[A-Z]{3}$');
  END IF;
END $$;

-- Validation post-ALTER : la FK n'existe plus
DO $$
DECLARE
  fk_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_variants_price_currency_fkey'
      AND conrelid = 'public.product_variants'::regclass
  ) INTO fk_exists;

  IF fk_exists THEN
    RAISE EXCEPTION 'product_variants_price_currency_fkey still exists after DROP';
  END IF;

  RAISE NOTICE 'price_currency FK to markets relaxed; CHECK regex ^[A-Z]{3}$ enforced';
END $$;

COMMENT ON COLUMN public.product_variants.price_currency IS
  'Code devise ISO 4217 (EUR/GBP/CHF/USD/...). Validé par CHECK regex ^[A-Z]{3}$. Pas de FK Phase 1 — table currencies dédiée à évaluer Phase 2 (D-PV-13).';
