-- ============================================================================
-- CHANTIER VOCAB 2026 — Parasols specs (6 nouvelles colonnes)
-- Date     : 2026-04-30
-- Catégorie : Parasols (0 produit existant en DB ; pré-création schéma)
-- Ref      : docs/chantiers/2026-05/PLAN_VOCAB_FIELDS.md §3.2
--
-- Champs ajoutés :
--   - fabric_g_m2          integer  null            (grammage tissu, 150-450 g/m²)
--   - fabric_certification text     default 'Unknown' (CHECK : 7 valeurs)
--   - min_base_weight_kg   integer  null            (poids min base recommandé, 15-150 kg)
--   - pole_diameter_mm     integer  null            (diamètre mât, 30-80 mm)
--   - heating_compatible   boolean  default false    (compatible chauffage radiant intégré)
--   - wind_beaufort_max    integer  null            (force max Beaufort, 0-12)
--
-- Vérification pré-migration : aucun champ existant équivalent dans products
-- (wind_*, fabric_*, pole_*, heating_*, grammage_*, certif_* tous absents).
-- ============================================================================

ALTER TABLE public.products
  ADD COLUMN fabric_g_m2          integer,
  ADD COLUMN fabric_certification text    DEFAULT 'Unknown',
  ADD COLUMN min_base_weight_kg   integer,
  ADD COLUMN pole_diameter_mm     integer,
  ADD COLUMN heating_compatible   boolean DEFAULT false,
  ADD COLUMN wind_beaufort_max    integer;

-- Range CHECK + enum CHECK (defensive, matches zod ranges in PLAN_VOCAB_FIELDS §3.2)
ALTER TABLE public.products
  ADD CONSTRAINT products_fabric_g_m2_range
    CHECK (fabric_g_m2 IS NULL OR fabric_g_m2 BETWEEN 150 AND 450),
  ADD CONSTRAINT products_fabric_certification_enum
    CHECK (fabric_certification IN (
      'Sunbrella', 'Solaris', 'Dickson_Orchestra', 'Dickson_Saphir',
      'Serge_Ferrari', 'Other', 'Unknown'
    )),
  ADD CONSTRAINT products_min_base_weight_range
    CHECK (min_base_weight_kg IS NULL OR min_base_weight_kg BETWEEN 15 AND 150),
  ADD CONSTRAINT products_pole_diameter_range
    CHECK (pole_diameter_mm IS NULL OR pole_diameter_mm BETWEEN 30 AND 80),
  ADD CONSTRAINT products_wind_beaufort_range
    CHECK (wind_beaufort_max IS NULL OR wind_beaufort_max BETWEEN 0 AND 12);

COMMENT ON COLUMN public.products.fabric_g_m2 IS
  'Grammage du tissu en g/m². 220-280 = standard, 300+ = professionnel intensif.';
COMMENT ON COLUMN public.products.fabric_certification IS
  'Certification du tissu (Sunbrella, Solaris, Dickson Orchestra, Dickson Saphir, Serge Ferrari, Other, Unknown).';
COMMENT ON COLUMN public.products.min_base_weight_kg IS
  'Poids minimum recommandé de la base pour stabilité.';
COMMENT ON COLUMN public.products.pole_diameter_mm IS
  'Diamètre du mât central en millimètres.';
COMMENT ON COLUMN public.products.heating_compatible IS
  'Compatible avec un chauffage radiant intégré au parasol.';
COMMENT ON COLUMN public.products.wind_beaufort_max IS
  'Force maximale supportée sur l''échelle de Beaufort (0=calme, 6=vent frais, 8=coup de vent, 12=ouragan).';
