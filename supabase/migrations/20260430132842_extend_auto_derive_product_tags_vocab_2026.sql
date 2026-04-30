-- ============================================================================
-- CHANTIER VOCAB 2026 — Extension trigger auto_derive_product_tags (ÉTAPE 7.3)
-- Date : 2026-04-30
-- Ref  : docs/chantiers/2026-05/PLAN_VOCAB_FIELDS.md §3 (per-category trigger
--        extensions) + §11 D7 (migration séparée pour rollback indépendant)
--
-- 8 nouvelles dérivations de technical_tags depuis les nouveaux champs :
--
--   - 'premium-fabric'  si fabric_certification IN PREMIUM_FABRIC_BRANDS (5 marques)
--   - 'high-wind'       si wind_beaufort_max >= 8 (vents forts à ouragan)
--   - 'heating-compat'  si heating_compatible = true
--   - 'modular'         si available_modules est un array jsonb non vide
--   - 'pool-resistant'  si chlorine_resistance = true
--   - 'beach-resistant' si salt_water_resistance = true ET sand_drainage = true
--   - 'acoustic'        si acoustic_nrc IS NOT NULL ET >= 0.7 (excellent NRC)
--   - 'repairable'      si cushion_replacement_available = true
--
-- Le reste du trigger (normalisation tags, dérivation matériaux/palette/
-- product_type_tags, default_seating_capacity, etc.) est conservé tel quel.
--
-- Rollback : ré-appliquer une version antérieure de la fonction. Aucune
-- destruction de tags existants — uniquement des ajouts si conditions OK.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_derive_product_tags()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  derived_materials text[] := '{}';
  derived_technicals text[] := '{}';
  derived_palette text[] := '{}';
  derived_frame text;
  derived_seat_type text;
  mat_struct text;
  mat_seat text;
  struct_changed boolean := false;
  seat_changed boolean := false;
  cat_lower text;
  subcat_lower text;
BEGIN

  -- ──────────────────────────────────────────────
  -- 1. NORMALIZE SOURCE FIELDS
  -- ──────────────────────────────────────────────

  NEW.material_structure := nullif(lower(trim(coalesce(NEW.material_structure, ''))), '');

  DECLARE
    raw_seat text := lower(trim(coalesce(NEW.material_seat, '')));
  BEGIN
    NEW.material_seat := CASE
      WHEN raw_seat LIKE '%cushion%' OR raw_seat LIKE '%coussin%' THEN 'cushion'
      WHEN raw_seat = 'rattan' THEN 'rattan-woven'
      WHEN raw_seat = '' THEN NULL
      ELSE raw_seat
    END;
  END;

  NEW.main_color := nullif(lower(trim(coalesce(NEW.main_color, ''))), '');

  mat_struct := coalesce(NEW.material_structure, '');
  mat_seat   := coalesce(NEW.material_seat, '');
  cat_lower  := lower(trim(coalesce(NEW.category, '')));
  subcat_lower := lower(trim(coalesce(NEW.subcategory, '')));

  IF TG_OP = 'UPDATE' THEN
    struct_changed := (coalesce(OLD.material_structure, '') IS DISTINCT FROM mat_struct);
    seat_changed   := (coalesce(
      CASE lower(trim(coalesce(OLD.material_seat, '')))
        WHEN '' THEN NULL
        ELSE lower(trim(OLD.material_seat))
      END, '') IS DISTINCT FROM mat_seat);
  ELSE
    struct_changed := true;
    seat_changed := true;
  END IF;

  -- ──────────────────────────────────────────────
  -- 2. NORMALIZE STYLE_TAGS
  -- ──────────────────────────────────────────────

  IF NEW.style_tags IS NOT NULL AND array_length(NEW.style_tags, 1) > 0 THEN
    NEW.style_tags := ARRAY(
      SELECT DISTINCT
        CASE WHEN lower(s) IN ('bistrot', 'bisrot') THEN 'bistro'
             ELSE lower(s)
        END
      FROM unnest(NEW.style_tags) AS s
      WHERE trim(s) != ''
      ORDER BY 1
    );
  END IF;

  IF NEW.ambience_tags IS NOT NULL AND array_length(NEW.ambience_tags, 1) > 0 THEN
    NEW.ambience_tags := ARRAY(
      SELECT DISTINCT lower(trim(s))
      FROM unnest(NEW.ambience_tags) AS s
      WHERE trim(s) != ''
      ORDER BY 1
    );
  END IF;

  -- ──────────────────────────────────────────────
  -- 3. DERIVE material_tags
  -- ──────────────────────────────────────────────

  IF mat_struct IN ('aluminium') THEN
    derived_materials := derived_materials || ARRAY['aluminium'];
  ELSIF mat_struct IN ('polypropylene') THEN
    derived_materials := derived_materials || ARRAY['polypropylene'];
  ELSIF mat_struct IN ('synthetic-rattan') THEN
    derived_materials := derived_materials || ARRAY['synthetic-rattan'];
  ELSIF mat_struct IN ('steel') THEN
    derived_materials := derived_materials || ARRAY['steel'];
  ELSIF mat_struct IN ('wood', 'teak', 'oak', 'iroko', 'eucalyptus', 'acacia') THEN
    derived_materials := derived_materials || ARRAY['wood'];
  ELSIF mat_struct IN ('bamboo') THEN
    derived_materials := derived_materials || ARRAY['bamboo'];
  ELSIF mat_struct IN ('resin') THEN
    derived_materials := derived_materials || ARRAY['resin'];
  ELSIF mat_struct IN ('hpl') THEN
    derived_materials := derived_materials || ARRAY['hpl'];
  ELSIF mat_struct IN ('ceramic') THEN
    derived_materials := derived_materials || ARRAY['hpl'];
  END IF;

  IF mat_seat IN ('mesh', 'textilene') THEN
    derived_materials := derived_materials || ARRAY['textilene'];
  ELSIF mat_seat IN ('rope', 'rope-woven') THEN
    derived_materials := derived_materials || ARRAY['rope'];
  ELSIF mat_seat IN ('rattan-woven', 'synthetic-rattan') THEN
    derived_materials := derived_materials || ARRAY['synthetic-rattan'];
  ELSIF mat_seat IN ('pp-shell') THEN
    derived_materials := derived_materials || ARRAY['polypropylene'];
  ELSIF mat_seat IN ('cushion', 'fabric-stretch', 'integrated-cush') THEN
    derived_materials := derived_materials || ARRAY['fabric'];
  ELSIF mat_seat IN ('wood-slats', 'solid-teak') THEN
    derived_materials := derived_materials || ARRAY['wood'];
  ELSIF mat_seat IN ('solid-alu', 'perforated-alu') THEN
    derived_materials := derived_materials || ARRAY['aluminium'];
  END IF;

  NEW.material_tags := ARRAY(SELECT DISTINCT unnest(derived_materials) ORDER BY 1);

  -- ──────────────────────────────────────────────
  -- 4. DERIVE secondary_color
  -- ──────────────────────────────────────────────

  IF NEW.secondary_color IS NULL OR trim(NEW.secondary_color) = '' THEN
    IF mat_seat IN ('rattan-woven', 'synthetic-rattan') THEN
      IF coalesce(NEW.main_color, '') NOT IN ('brown', 'cream', 'natural', 'beige', 'walnut', 'teak', 'camel', 'chocolate', 'dark-brown') THEN
        NEW.secondary_color := 'natural';
      END IF;
    ELSIF mat_seat IN ('rope', 'rope-woven') THEN
      IF coalesce(NEW.main_color, '') NOT IN ('brown', 'beige', 'natural', 'cream', 'camel') THEN
        NEW.secondary_color := 'natural';
      END IF;
    END IF;
  ELSE
    NEW.secondary_color := nullif(lower(trim(NEW.secondary_color)), '');
  END IF;

  -- ──────────────────────────────────────────────
  -- 5. DERIVE palette_tags
  -- ──────────────────────────────────────────────

  derived_palette := CASE coalesce(NEW.main_color, '')
    WHEN 'black'       THEN ARRAY['dark']
    WHEN 'anthracite'   THEN ARRAY['dark']
    WHEN 'charcoal'     THEN ARRAY['dark']
    WHEN 'graphite'     THEN ARRAY['dark']
    WHEN 'white'        THEN ARRAY['monochrome']
    WHEN 'off-white'    THEN ARRAY['monochrome']
    WHEN 'cream'        THEN ARRAY['pastel']
    WHEN 'ivory'        THEN ARRAY['pastel']
    WHEN 'blush'        THEN ARRAY['pastel']
    WHEN 'pink'         THEN ARRAY['pastel']
    WHEN 'lavender'     THEN ARRAY['pastel']
    WHEN 'grey'         THEN ARRAY['cool']
    WHEN 'silver'       THEN ARRAY['cool']
    WHEN 'blue'         THEN ARRAY['cool']
    WHEN 'petrol'       THEN ARRAY['cool']
    WHEN 'turquoise'    THEN ARRAY['cool']
    WHEN 'navy'         THEN ARRAY['navy']
    WHEN 'brown'        THEN ARRAY['dark']
    WHEN 'natural'      THEN ARRAY['pastel']
    WHEN 'camel'        THEN ARRAY['pastel']
    WHEN 'beige'        THEN ARRAY['pastel']
    WHEN 'sand'         THEN ARRAY['pastel']
    WHEN 'taupe'        THEN ARRAY['pastel']
    WHEN 'teak'         THEN ARRAY['dark']
    WHEN 'walnut'       THEN ARRAY['dark']
    WHEN 'terracotta'   THEN ARRAY['dark']
    WHEN 'orange'       THEN ARRAY['dark']
    WHEN 'coral'        THEN ARRAY['pastel']
    WHEN 'green'        THEN ARRAY['cool']
    WHEN 'sage'         THEN ARRAY['cool']
    WHEN 'olive'        THEN ARRAY['cool']
    WHEN 'red'          THEN ARRAY['dark']
    WHEN 'yellow'       THEN ARRAY['pastel']
    WHEN 'mustard'      THEN ARRAY['dark']
    ELSE ARRAY[]::text[]
  END;

  IF NEW.secondary_color IS NOT NULL
     AND trim(NEW.secondary_color) != ''
     AND lower(trim(NEW.secondary_color)) IS DISTINCT FROM NEW.main_color THEN
    derived_palette := derived_palette || ARRAY['bicolor'];
  END IF;

  NEW.palette_tags := ARRAY(SELECT DISTINCT unnest(derived_palette) ORDER BY 1);

  -- ──────────────────────────────────────────────
  -- 6. DERIVE technical_tags
  -- ──────────────────────────────────────────────

  IF coalesce(NEW.is_stackable, false)     THEN derived_technicals := derived_technicals || ARRAY['stackable'];        END IF;
  IF coalesce(NEW.uv_resistant, false)     THEN derived_technicals := derived_technicals || ARRAY['uv-resistant'];     END IF;
  IF coalesce(NEW.weather_resistant, false) THEN derived_technicals := derived_technicals || ARRAY['weather-resistant']; END IF;
  IF coalesce(NEW.fire_retardant, false)   THEN derived_technicals := derived_technicals || ARRAY['fire-retardant'];   END IF;
  IF coalesce(NEW.lightweight, false)      THEN derived_technicals := derived_technicals || ARRAY['lightweight'];      END IF;
  IF coalesce(NEW.easy_maintenance, false) THEN derived_technicals := derived_technicals || ARRAY['easy-maintenance']; END IF;
  IF coalesce(NEW.is_chr_heavy_use, false) THEN derived_technicals := derived_technicals || ARRAY['chr-heavy-use'];    END IF;
  IF coalesce(NEW.is_outdoor, false)       THEN derived_technicals := derived_technicals || ARRAY['indoor-outdoor'];   END IF;

  -- Vocab 2026 derivations (chantier vocab 2026, ÉTAPE 7.3)

  IF NEW.fabric_certification IN ('Sunbrella', 'Solaris', 'Dickson_Orchestra', 'Dickson_Saphir', 'Serge_Ferrari') THEN
    derived_technicals := derived_technicals || ARRAY['premium-fabric'];
  END IF;

  IF coalesce(NEW.wind_beaufort_max, 0) >= 8 THEN
    derived_technicals := derived_technicals || ARRAY['high-wind'];
  END IF;

  IF coalesce(NEW.heating_compatible, false) THEN
    derived_technicals := derived_technicals || ARRAY['heating-compat'];
  END IF;

  IF NEW.available_modules IS NOT NULL
     AND jsonb_typeof(NEW.available_modules) = 'array'
     AND jsonb_array_length(NEW.available_modules) > 0 THEN
    derived_technicals := derived_technicals || ARRAY['modular'];
  END IF;

  IF coalesce(NEW.chlorine_resistance, false) THEN
    derived_technicals := derived_technicals || ARRAY['pool-resistant'];
  END IF;

  IF coalesce(NEW.salt_water_resistance, false) AND coalesce(NEW.sand_drainage, false) THEN
    derived_technicals := derived_technicals || ARRAY['beach-resistant'];
  END IF;

  IF NEW.acoustic_nrc IS NOT NULL AND NEW.acoustic_nrc >= 0.7 THEN
    derived_technicals := derived_technicals || ARRAY['acoustic'];
  END IF;

  IF coalesce(NEW.cushion_replacement_available, false) THEN
    derived_technicals := derived_technicals || ARRAY['repairable'];
  END IF;

  NEW.technical_tags := ARRAY(SELECT DISTINCT unnest(derived_technicals) ORDER BY 1);

  -- ──────────────────────────────────────────────
  -- 7. AUTO-FILL product_type_tags (chairs)
  -- ──────────────────────────────────────────────

  IF NEW.product_type_tags IS NULL THEN
    NEW.product_type_tags := '{}'::jsonb;
  END IF;

  -- frame_material (chairs + tables)
  IF ((NEW.product_type_tags ->> 'frame_material') IS NULL OR struct_changed) AND mat_struct != '' THEN
    derived_frame := CASE mat_struct
      WHEN 'aluminium'        THEN 'alu-powder'
      WHEN 'polypropylene'    THEN 'pp-standard'
      WHEN 'steel'            THEN 'steel-epoxy'
      WHEN 'synthetic-rattan' THEN 'rattan-nat'
      WHEN 'wood'             THEN 'teak-fsc'
      WHEN 'teak'             THEN 'teak-fsc'
      WHEN 'resin'            THEN 'resin-hdpe'
      ELSE NULL
    END;
    IF derived_frame IS NOT NULL THEN
      NEW.product_type_tags := NEW.product_type_tags || jsonb_build_object('frame_material', derived_frame);
    END IF;
  END IF;

  -- seat_type (chairs only)
  IF ((NEW.product_type_tags ->> 'seat_type') IS NULL OR seat_changed) AND mat_seat != '' THEN
    derived_seat_type := CASE mat_seat
      WHEN 'mesh'             THEN 'mesh'
      WHEN 'rope'             THEN 'rope-woven'
      WHEN 'rope-woven'       THEN 'rope-woven'
      WHEN 'rattan-woven'     THEN 'rattan-woven'
      WHEN 'synthetic-rattan' THEN 'rattan-woven'
      WHEN 'pp-shell'         THEN 'pp-shell'
      WHEN 'cushion'          THEN 'cushion'
      WHEN 'fabric-stretch'   THEN 'fabric-stretch'
      WHEN 'textilene'        THEN 'mesh'
      WHEN 'wood-slats'       THEN 'wood-slats'
      WHEN 'solid-teak'       THEN 'solid-teak'
      WHEN 'solid-alu'        THEN 'solid-alu'
      WHEN 'perforated-alu'   THEN 'perforated-alu'
      ELSE NULL
    END;
    IF derived_seat_type IS NOT NULL THEN
      NEW.product_type_tags := NEW.product_type_tags || jsonb_build_object('seat_type', derived_seat_type);
    END IF;
  END IF;

  -- ──────────────────────────────────────────────
  -- 8. TABLE-SPECIFIC DERIVATION
  -- ──────────────────────────────────────────────

  IF cat_lower = 'tables' THEN

    -- table_type from subcategory (if not manually set)
    IF (NEW.product_type_tags ->> 'table_type') IS NULL THEN
      NEW.product_type_tags := NEW.product_type_tags || jsonb_build_object('table_type',
        CASE
          WHEN subcat_lower LIKE '%base%' OR subcat_lower LIKE '%pied%' OR subcat_lower LIKE '%piede%' THEN 'base-only'
          WHEN subcat_lower LIKE '%top%' OR subcat_lower LIKE '%plateau%' OR subcat_lower LIKE '%piano%' THEN 'top-only'
          ELSE 'complete'
        END
      );
    END IF;

    -- dimension_tag from physical dimensions (if not manually set)
    IF (NEW.product_type_tags ->> 'dimension_tag') IS NULL
       AND NEW.dimensions_length_cm IS NOT NULL THEN
      DECLARE
        l int := NEW.dimensions_length_cm;
        w int := coalesce(NEW.dimensions_width_cm, NEW.dimensions_length_cm);
        h int := coalesce(NEW.dimensions_height_cm, 75);
        is_high boolean := h >= 85;
        dim_tag text;
      BEGIN
        IF w = l THEN
          IF l <= 65 THEN dim_tag := CASE WHEN is_high THEN 'o60h' ELSE '60x60' END;
          ELSIF l <= 75 THEN dim_tag := CASE WHEN is_high THEN '70x70h' ELSE '70x70' END;
          ELSIF l <= 90 THEN dim_tag := CASE WHEN is_high THEN '80x80h' ELSE '80x80' END;
          ELSIF l <= 100 THEN dim_tag := 'o80';
          ELSE dim_tag := 'o120';
          END IF;
        ELSE
          IF greatest(l, w) <= 130 AND least(l, w) <= 75 THEN
            dim_tag := CASE WHEN is_high THEN '120x60h' ELSE '120x70' END;
          ELSIF greatest(l, w) <= 130 THEN dim_tag := '120x80';
          ELSIF greatest(l, w) <= 170 THEN dim_tag := '160x80';
          ELSE dim_tag := '200x90';
          END IF;
        END IF;

        IF dim_tag IS NOT NULL THEN
          NEW.product_type_tags := NEW.product_type_tags || jsonb_build_object('dimension_tag', dim_tag);
        END IF;
      END;
    END IF;

    -- shape from dimensions (if not manually set)
    IF (NEW.product_type_tags ->> 'shape') IS NULL
       AND NEW.dimensions_length_cm IS NOT NULL THEN
      NEW.product_type_tags := NEW.product_type_tags || jsonb_build_object('shape',
        CASE
          WHEN NEW.dimensions_width_cm IS NULL THEN 'round'
          WHEN NEW.dimensions_length_cm = NEW.dimensions_width_cm THEN 'square'
          ELSE 'rectangular'
        END
      );
    END IF;

    -- height_type from height (if not manually set)
    IF (NEW.product_type_tags ->> 'height_type') IS NULL
       AND NEW.dimensions_height_cm IS NOT NULL THEN
      NEW.product_type_tags := NEW.product_type_tags || jsonb_build_object('height_type',
        CASE
          WHEN NEW.dimensions_height_cm < 55 THEN 'coffee'
          WHEN NEW.dimensions_height_cm >= 85 THEN 'high-bar'
          ELSE 'dining'
        END
      );
    END IF;

    -- top_material from material_structure for tabletops
    IF (NEW.product_type_tags ->> 'top_material') IS NULL
       AND (NEW.product_type_tags ->> 'table_type') = 'top-only'
       AND mat_struct != '' THEN
      NEW.product_type_tags := NEW.product_type_tags || jsonb_build_object('top_material',
        CASE mat_struct
          WHEN 'hpl' THEN 'compact'
          WHEN 'wood' THEN 'oak-top'
          WHEN 'teak' THEN 'acacia-top'
          WHEN 'bamboo' THEN 'bamboo-top'
          WHEN 'aluminium' THEN 'alu-top'
          WHEN 'resin' THEN 'resin-top'
          ELSE NULL
        END
      );
    END IF;

    -- Derive table seating capacity
    IF NEW.default_seating_capacity IS NULL AND NEW.dimensions_length_cm IS NOT NULL THEN
      DECLARE
        l int := NEW.dimensions_length_cm;
        w int := coalesce(NEW.dimensions_width_cm, l);
      BEGIN
        NEW.default_seating_capacity := CASE
          WHEN greatest(l, w) <= 65 THEN 2
          WHEN greatest(l, w) <= 85 THEN 4
          WHEN greatest(l, w) <= 130 THEN 4
          WHEN greatest(l, w) <= 170 THEN 6
          ELSE 8
        END;
      END;
    END IF;

  END IF;

  RETURN NEW;
END;
$function$;
