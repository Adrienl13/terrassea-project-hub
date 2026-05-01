-- Cleanup données — chantier Modèle B variants ÉTAPE 4a-bis
-- Réf : docs/chantiers/2026-05/PLAN_MODELE_B_VARIANTS.md
--      docs/chantiers/2026-05/snapshot_deleted_test_product_lp.csv (audit trail)
-- Création 2026-05-01.
--
-- CONTEXTE
-- L'investigation menée pendant l'ÉTAPE 4a a identifié 1 produit orphelin
-- avec owner_brand_id NULL après backfill (le seul des 53 sans partner_id) :
--
--   id:               4ec77f95-5a96-4edd-b15b-1cfde9e640ab
--   name:             "Lp"
--   collection:       "Summ"
--   partner_id:       NULL
--   publish_status:   "published"
--   created_at:       2026-04-07
--   updated_at:       2026-04-30 (touché par trigger auto_derive_product_tags)
--
-- Caractéristiques :
--   * Nom et collection visiblement tronqués (saisie test inachevée)
--   * Tous champs métier null (subcategory, indicative_price, designer, etc.)
--   * Créé en admin direct (partner_id NULL) sans flow partenaire
--   * Aucun enfant FK : vérification exhaustive sur 18 tables enfants
--     (orders, preorders, quote_requests, board_items, project_*,
--     product_offers, product_reviews, product_submissions × 3,
--     product_variants, product_media, partner_*, concept_events,
--     products.duplicate_of self-ref) — toutes 0 ligne référençant ce produit.
--
-- DÉCISION FOUNDER (2026-05-01) : suppression validée pour permettre la
-- migration ÉTAPE 4b sur 52 = 52 = 52 produits sains, sans exception
-- silencieuse dans le catalogue.
--
-- Snapshot CSV pré-suppression conservé dans
-- docs/chantiers/2026-05/snapshot_deleted_test_product_lp.csv

DELETE FROM public.products
WHERE id = '4ec77f95-5a96-4edd-b15b-1cfde9e640ab';

-- ─────────────────────────────────────────────────────────────────────────
-- Validation post-DELETE : 52 produits restants, 0 sans owner_brand_id
-- ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  remaining int;
  orphans int;
BEGIN
  SELECT COUNT(*) INTO remaining FROM public.products;
  SELECT COUNT(*) INTO orphans FROM public.products WHERE owner_brand_id IS NULL;

  IF remaining != 52 THEN
    RAISE EXCEPTION 'Expected 52 products after cleanup, got %', remaining;
  END IF;
  IF orphans != 0 THEN
    RAISE EXCEPTION 'Expected 0 products with owner_brand_id NULL after cleanup, got %', orphans;
  END IF;

  RAISE NOTICE 'Cleanup OK: 1 orphan deleted, 52 products remain, 0 sans owner_brand_id';
END $$;
