-- ============================================================================
-- CHANTIER VOCAB 2026 — Sofas / Lounge Seating specs (4 nouvelles colonnes)
-- Date     : 2026-04-30
-- Catégorie : sofas (slug front) / "Lounge Seating" (label DB éventuel)
-- 0 produit existant en DB ; pré-création schéma.
-- Ref      : docs/chantiers/2026-05/PLAN_VOCAB_FIELDS.md §3.4
--
-- Champs ajoutés :
--   - available_modules              jsonb    default '[]'::jsonb
--       Liste des modules disponibles à la commande pour configurer le sofa.
--       FORMAT ATTENDU : tableau JSON de strings, valeurs autorisées :
--         'corner', 'central-1seat', 'central-2seat',
--         'chaise-left', 'chaise-right', 'ottoman', 'pouf'
--       Validation côté FRONT (zod) — pas de CHECK Postgres possible
--       proprement sur jsonb array. C'est l'exception jsonb du chantier
--       (PLAN §11 D3 validée). Default = [] (sofa monobloc).
--
--   - seat_depth_cm                  numeric(5,1) null
--       Profondeur d'assise. 45cm = structuré formel, 55-60 = casual,
--       65+ = lounge profond. CHECK : 30-120 ou null.
--
--   - cushion_replacement_available  boolean      default false
--       Coussins de remplacement disponibles à la commande.
--
--   - acoustic_nrc                   numeric(3,2) null
--       Coefficient d'absorption acoustique certifié (0=réflexion totale,
--       1=absorption totale). CHECK : 0-1 ou null. Nullable car la majorité
--       des produits n'ont pas de certification NRC.
--
-- Vérification pré-migration : aucun champ existant équivalent
-- (sauf cushion_quick_dry — Sun Loungers, distinct nom et fonction).
-- ============================================================================

ALTER TABLE public.products
  ADD COLUMN available_modules             jsonb        DEFAULT '[]'::jsonb,
  ADD COLUMN seat_depth_cm                 numeric(5,1),
  ADD COLUMN cushion_replacement_available boolean      DEFAULT false,
  ADD COLUMN acoustic_nrc                  numeric(3,2);

ALTER TABLE public.products
  ADD CONSTRAINT products_seat_depth_range
    CHECK (seat_depth_cm IS NULL OR seat_depth_cm BETWEEN 30 AND 120),
  ADD CONSTRAINT products_acoustic_nrc_range
    CHECK (acoustic_nrc IS NULL OR (acoustic_nrc >= 0 AND acoustic_nrc <= 1));

COMMENT ON COLUMN public.products.available_modules IS
  'Modules disponibles à la commande (sofa modulaire). JSON array of strings : corner, central-1seat, central-2seat, chaise-left, chaise-right, ottoman, pouf. Validation enforced front-side via zod (no Postgres CHECK on jsonb array).';
COMMENT ON COLUMN public.products.seat_depth_cm IS
  'Profondeur d''assise en cm. 45=formel structuré, 55-60=casual, 65+=lounge profond.';
COMMENT ON COLUMN public.products.cushion_replacement_available IS
  'Coussins de remplacement disponibles à la commande (entretien longue durée).';
COMMENT ON COLUMN public.products.acoustic_nrc IS
  'Coefficient d''absorption acoustique NRC, range 0.00-1.00. Null si non certifié. 0.7+ = excellent.';
