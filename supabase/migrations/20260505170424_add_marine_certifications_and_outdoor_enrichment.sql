-- ============================================================================
-- ÉTAPE 8h — Enrichissement référentiel certifications
-- Date : 2026-05-05
--
-- Ajout de certifications marine et outdoor pour préparer l'expansion future
-- vers les segments yachts/cruise/ferries et le mobilier outdoor bord de
-- mer / pool decks.
--
-- Cohérent avec docs/strategy/PRODUCT_PHILOSOPHY.md (segments d'expansion
-- identifiés — section ajoutée dans le même chantier).
--
-- NOTE : le CHECK constraint d'origine inclut 'other'. On préserve cette
-- valeur (strict superset) et on ajoute 'marine'. Si une purge de 'other'
-- est souhaitée, elle se fera dans une migration dédiée pour éviter une
-- régression silencieuse du contrat de l'enum.
-- ============================================================================

-- Étape 1 : étendre le CHECK constraint avec 'marine' (preserve 'other')
ALTER TABLE certifications DROP CONSTRAINT IF EXISTS certifications_category_check;
ALTER TABLE certifications ADD CONSTRAINT certifications_category_check
  CHECK (category IN ('environmental', 'origin', 'quality', 'safety', 'other', 'marine'));

-- Étape 2 : INSERT 9 nouvelles certifications

-- ===== 6 certifications MARINE =====

INSERT INTO certifications (slug, name, category, scope, description_i18n, official_website) VALUES
('imo-ftp-part7', 'IMO FTP Code Part 7', 'marine', 'product_unit',
  '{"en":"IMO Fire Test Procedure Part 7 - vertically supported textiles and films flammability test for commercial ships","fr":"Code IMO FTP Partie 7 - Test de flammabilité pour textiles et films à support vertical sur navires commerciaux","it":"Codice IMO FTP Parte 7","es":"Código IMO FTP Parte 7"}'::jsonb,
  'https://www.imo.org/en/OurWork/Safety/Pages/Fire-Safety.aspx'),

('imo-ftp-part8', 'IMO FTP Code Part 8', 'marine', 'product_unit',
  '{"en":"IMO Fire Test Procedure Part 8 - upholstered furniture flammability test for commercial ships (cigarette + lighter test)","fr":"Code IMO FTP Partie 8 - Test de flammabilité pour mobilier rembourré sur navires commerciaux","it":"Codice IMO FTP Parte 8","es":"Código IMO FTP Parte 8"}'::jsonb,
  'https://www.imo.org/en/OurWork/Safety/Pages/Fire-Safety.aspx'),

('imo-ftp-part9', 'IMO FTP Code Part 9', 'marine', 'product_unit',
  '{"en":"IMO Fire Test Procedure Part 9 - bedding components flammability test for commercial ships","fr":"Code IMO FTP Partie 9 - Test de flammabilité pour literie sur navires commerciaux","it":"Codice IMO FTP Parte 9","es":"Código IMO FTP Parte 9"}'::jsonb,
  'https://www.imo.org/en/OurWork/Safety/Pages/Fire-Safety.aspx'),

('med-wheelmark', 'MED Wheelmark', 'marine', 'product_unit',
  '{"en":"Marine Equipment Directive Wheelmark - European maritime equipment certification with the official 12-spoke ship wheel emblem","fr":"Marquage Wheelmark MED - Certification européenne pour équipements maritimes avec emblème officiel roue de bateau à 12 rayons","it":"Marchio Wheelmark MED","es":"Marca Wheelmark MED"}'::jsonb,
  'https://transport.ec.europa.eu/transport-modes/maritime/marine-equipment_en'),

('mca-mgn-580', 'MCA MGN 580', 'marine', 'product_unit',
  '{"en":"UK Maritime and Coastguard Agency Marine Guidance Note 580 - Large Yacht Code fire protection compliance","fr":"Marine Guidance Note 580 du MCA britannique - Conformité Large Yacht Code (protection feu)","it":"MCA MGN 580","es":"MCA MGN 580"}'::jsonb,
  'https://www.gov.uk/government/organisations/maritime-and-coastguard-agency'),

('uscg-approved', 'USCG Approved', 'marine', 'product_unit',
  '{"en":"US Coast Guard Approved - flame resistance and marine durability certification for commercial vessels","fr":"Approbation USCG - Certification de résistance au feu et durabilité marine pour navires commerciaux","it":"Approvazione USCG","es":"Aprobación USCG"}'::jsonb,
  'https://www.uscg.mil/'),

-- ===== 3 certifications OUTDOOR enrichies =====

('iso-4892-uv', 'ISO 4892 UV Stability', 'safety', 'product_unit',
  '{"en":"ISO 4892 - Plastics - Methods of exposure to laboratory light sources (UV stability test for outdoor furniture)","fr":"ISO 4892 - Méthodes d''exposition à des sources lumineuses de laboratoire (test stabilité UV pour mobilier outdoor)","it":"ISO 4892 stabilità UV","es":"ISO 4892 estabilidad UV"}'::jsonb,
  'https://www.iso.org/standard/56558.html'),

('astm-b117-salt-spray', 'ASTM B117 Salt Spray', 'safety', 'product_unit',
  '{"en":"ASTM B117 - Standard practice for operating salt spray apparatus - corrosion resistance test for coastal and marine outdoor furniture","fr":"ASTM B117 - Test au brouillard salin pour résistance à la corrosion (mobilier outdoor bord de mer)","it":"ASTM B117 prova di nebbia salina","es":"ASTM B117 cámara de niebla salina"}'::jsonb,
  'https://www.astm.org/b0117-19.html'),

('en-iso-9227-corrosion', 'EN ISO 9227 Corrosion', 'safety', 'product_unit',
  '{"en":"EN ISO 9227 - Corrosion tests in artificial atmospheres - salt spray tests (European standard for outdoor metal furniture in coastal environments)","fr":"EN ISO 9227 - Essais de corrosion en atmosphère artificielle (norme européenne pour mobilier extérieur métallique en environnement marin)","it":"EN ISO 9227 prove di corrosione","es":"EN ISO 9227 ensayos de corrosión"}'::jsonb,
  'https://www.iso.org/standard/63543.html');

-- ===== Validation embarquée =====

DO $$
DECLARE
  marine_count integer;
  total_count integer;
  null_scope_count integer;
BEGIN
  -- Vérifier les 6 certifs marine ajoutées
  SELECT COUNT(*) INTO marine_count
  FROM certifications WHERE category = 'marine';

  IF marine_count <> 6 THEN
    RAISE EXCEPTION 'Expected 6 marine certifications, got %', marine_count;
  END IF;

  -- Vérifier total (17 existantes + 9 nouvelles = 26)
  SELECT COUNT(*) INTO total_count FROM certifications;

  IF total_count <> 26 THEN
    RAISE EXCEPTION 'Expected 26 total certifications after migration, got %', total_count;
  END IF;

  -- Vérifier scope NOT NULL respecté
  SELECT COUNT(*) INTO null_scope_count
  FROM certifications WHERE scope IS NULL;

  IF null_scope_count > 0 THEN
    RAISE EXCEPTION 'Some certifications have NULL scope - integrity violation (count: %)', null_scope_count;
  END IF;

  RAISE NOTICE 'OK: 9 new certifications added (6 marine + 3 outdoor enriched). Total: % certifications, all with scope assigned', total_count;
END $$;
