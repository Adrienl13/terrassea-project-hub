-- Phase 1 Modèle B variants — Migration 2 : seeds initiaux référentiels Phase 1
-- Réf : docs/chantiers/2026-05/PLAN_MODELE_B_VARIANTS.md §2 Migration 2
-- Cible : ~27 material_brands, 17 certifications, 50 colors_canonical, 30 finishes_canonical, 8 markets
-- Cohérence : 5 fabric premium = src/engine/dictionaries/fabricBrands.ts FABRIC_BRAND_SLUGS

-- ─────────────────────────────────────────────────────────────────────────
-- 1. material_brands : 27 lignes (Q3 reco B)
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO public.material_brands (slug, name, category, is_premium, parent_company, official_website) VALUES
  -- Fabric premium (5) — alignés avec fabricBrands.ts FABRIC_BRAND_SLUGS
  ('sunbrella',          'Sunbrella',           'fabric', true, 'Glen Raven, Inc.',    'https://www.sunbrella.com'),
  ('solaris',            'Solaris',             'fabric', true, 'Para Tempotest',      'https://www.solarix-para.com'),
  ('dickson-orchestra',  'Dickson Orchestra',   'fabric', true, 'Dickson Constant',    'https://www.dickson-constant.com'),
  ('dickson-saphir',     'Dickson Saphir',      'fabric', true, 'Dickson Constant',    'https://www.dickson-constant.com'),
  ('serge-ferrari',      'Serge Ferrari',       'fabric', true, 'Serge Ferrari Group', 'https://www.sergeferrari.com'),
  -- Fabric additional (5)
  ('sergio-tessuti',     'Sergio Tessuti',      'fabric', false, 'Sergio Tessuti S.r.l.', NULL),
  ('ikatex',             'Ikatex',              'fabric', false, 'Ikatex',                NULL),
  ('para-tempotest',     'Para Tempotest',      'fabric', false, 'Para Tempotest',        'https://www.tempotest.com'),
  ('agora-fabrics',      'Agora Fabrics',       'fabric', false, 'Tuvatextil',            'https://www.agora-fabrics.com'),
  ('batyline',           'Batyline',            'fabric', false, 'Serge Ferrari Group',   'https://www.sergeferrari.com'),
  -- Cushion-grade fabrics (2)
  ('olefin-marine',      'Olefin Marine',       'fabric', false, NULL, NULL),
  ('acrylic-spun-dyed',  'Acrylic Spun-Dyed',   'fabric', false, NULL, NULL),
  -- Wood (5) — toutes plantation/sustainable
  ('fsc-teak-plantation','FSC Teak (Plantation)','wood',   true,  NULL, NULL),
  ('fsc-iroko',          'FSC Iroko',           'wood',    false, NULL, NULL),
  ('fsc-acacia',         'FSC Acacia',          'wood',    false, NULL, NULL),
  ('fsc-robinia',        'FSC Robinia',         'wood',    false, NULL, NULL),
  ('fsc-eucalyptus',     'FSC Eucalyptus',      'wood',    false, NULL, NULL),
  -- Metal (5)
  ('aluminium-6063',     'Aluminium 6063',      'metal',   false, NULL, NULL),
  ('stainless-steel-316','Stainless Steel 316', 'metal',   true,  NULL, NULL),
  ('iron-powder-coated', 'Iron (Powder Coated)','metal',   false, NULL, NULL),
  ('brass',              'Brass',               'metal',   false, NULL, NULL),
  ('bronze',             'Bronze',              'metal',   false, NULL, NULL),
  -- Composite (3)
  ('hpl-compact',        'HPL Compact',         'composite', false, NULL, NULL),
  ('composite-wood',     'Composite Wood (WPC)','composite', false, NULL, NULL),
  ('polyrattan-pe',      'Polyrattan PE',       'composite', false, NULL, NULL),
  -- Fallbacks (2) — cible des slugs CamelCase TS Other/Unknown via materialBrandsMapping.ts
  ('other-fabric',       'Other (fabric)',      'fabric',  false, NULL, NULL),
  ('unknown',            'Unknown',             'other',   false, NULL, NULL);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. certifications : 17 lignes
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO public.certifications (slug, name, category, official_website) VALUES
  ('fsc',              'FSC (Forest Stewardship Council)', 'environmental', 'https://fsc.org'),
  ('pefc',             'PEFC',                              'environmental', 'https://pefc.org'),
  ('oeko-tex-100',     'OEKO-TEX Standard 100',             'environmental', 'https://www.oeko-tex.com'),
  ('greenguard',       'GREENGUARD',                        'environmental', 'https://www.ul.com/services/greenguard-certification'),
  ('greenguard-gold',  'GREENGUARD Gold',                   'environmental', 'https://www.ul.com/services/greenguard-certification'),
  ('cradle-to-cradle', 'Cradle to Cradle',                  'environmental', 'https://c2ccertified.org'),
  ('ecolabel-eu',      'EU Ecolabel',                       'environmental', 'https://environment.ec.europa.eu/topics/circular-economy/eu-ecolabel_en'),
  ('iso-9001',         'ISO 9001',                          'quality',       'https://www.iso.org/iso-9001-quality-management.html'),
  ('iso-14001',        'ISO 14001',                         'environmental', 'https://www.iso.org/iso-14001-environmental-management.html'),
  ('en-1335',          'EN 1335 (office chair safety)',     'safety',        NULL),
  ('en-581',           'EN 581 (outdoor furniture)',        'safety',        NULL),
  ('reach',            'REACH',                             'safety',        'https://echa.europa.eu/regulations/reach'),
  ('fr-fire-class-m1', 'Fire Class M1 (FR)',                'safety',        NULL),
  ('fire-class-m2',    'Fire Class M2',                     'safety',        NULL),
  ('made-in-italy',    'Made in Italy',                     'origin',        NULL),
  ('made-in-france',   'Made in France',                    'origin',        NULL),
  ('made-in-eu',       'Made in EU',                        'origin',        NULL);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. material_brand_certifications : liens N-N principaux
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO public.material_brand_certifications (material_brand_id, certification_id)
SELECT mb.id, c.id FROM public.material_brands mb
JOIN public.certifications c ON
  (mb.slug = 'sunbrella'         AND c.slug IN ('oeko-tex-100','greenguard')) OR
  (mb.slug = 'solaris'            AND c.slug IN ('oeko-tex-100','greenguard-gold')) OR
  (mb.slug = 'dickson-orchestra'  AND c.slug IN ('oeko-tex-100','ecolabel-eu')) OR
  (mb.slug = 'dickson-saphir'     AND c.slug IN ('oeko-tex-100')) OR
  (mb.slug = 'serge-ferrari'      AND c.slug IN ('oeko-tex-100','cradle-to-cradle')) OR
  (mb.slug = 'fsc-teak-plantation' AND c.slug = 'fsc') OR
  (mb.slug = 'fsc-iroko'           AND c.slug = 'fsc') OR
  (mb.slug = 'fsc-acacia'          AND c.slug = 'fsc') OR
  (mb.slug = 'fsc-robinia'         AND c.slug IN ('fsc','pefc')) OR
  (mb.slug = 'fsc-eucalyptus'      AND c.slug = 'fsc');

-- ─────────────────────────────────────────────────────────────────────────
-- 4. colors_canonical : 49 lignes
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO public.colors_canonical (slug, label_i18n, hex, family, display_order) VALUES
  -- Neutrals (10)
  ('white',       '{"en":"White","fr":"Blanc","es":"Blanco","it":"Bianco"}',                   '#FFFFFF', 'neutral',  10),
  ('off-white',   '{"en":"Off-white","fr":"Blanc cassé","es":"Hueso","it":"Bianco sporco"}',   '#F5F2EA', 'neutral',  20),
  ('cream',       '{"en":"Cream","fr":"Crème","es":"Crema","it":"Crema"}',                     '#F1E9D2', 'neutral',  30),
  ('ivory',       '{"en":"Ivory","fr":"Ivoire","es":"Marfil","it":"Avorio"}',                  '#FFFFF0', 'neutral',  40),
  ('sand',        '{"en":"Sand","fr":"Sable","es":"Arena","it":"Sabbia"}',                     '#C2B280', 'earth',    50),
  ('natural',     '{"en":"Natural","fr":"Naturel","es":"Natural","it":"Naturale"}',            '#D7C7A7', 'earth',    60),
  ('beige',       '{"en":"Beige","fr":"Beige","es":"Beige","it":"Beige"}',                     '#C8AD7F', 'neutral',  70),
  ('champagne',   '{"en":"Champagne","fr":"Champagne","es":"Champán","it":"Champagne"}',       '#E6D2A4', 'metallic', 80),
  ('taupe',       '{"en":"Taupe","fr":"Taupe","es":"Topo","it":"Tortora"}',                    '#8B7E66', 'neutral',  90),
  ('stone',       '{"en":"Stone","fr":"Pierre","es":"Piedra","it":"Pietra"}',                  '#A5A29B', 'neutral', 100),
  -- Greys / blacks (5)
  ('grey',        '{"en":"Grey","fr":"Gris","es":"Gris","it":"Grigio"}',                       '#808080', 'neutral', 110),
  ('graphite',    '{"en":"Graphite","fr":"Graphite","es":"Grafito","it":"Grafite"}',           '#3B3B3B', 'neutral', 120),
  ('charcoal',    '{"en":"Charcoal","fr":"Anthracite clair","es":"Carbón","it":"Carbone"}',    '#36454F', 'neutral', 130),
  ('anthracite',  '{"en":"Anthracite","fr":"Anthracite","es":"Antracita","it":"Antracite"}',   '#2C2F33', 'neutral', 140),
  ('black',       '{"en":"Black","fr":"Noir","es":"Negro","it":"Nero"}',                       '#000000', 'neutral', 150),
  -- Wood tones (4)
  ('teak',        '{"en":"Teak","fr":"Teck","es":"Teca","it":"Teak"}',                         '#8B6F47', 'wood',    160),
  ('walnut',      '{"en":"Walnut","fr":"Noyer","es":"Nogal","it":"Noce"}',                     '#5D4037', 'wood',    170),
  ('dark-brown',  '{"en":"Dark brown","fr":"Marron foncé","es":"Marrón oscuro","it":"Marrone scuro"}', '#3E2723', 'wood', 180),
  ('chocolate',   '{"en":"Chocolate","fr":"Chocolat","es":"Chocolate","it":"Cioccolato"}',     '#4B2E2A', 'wood',    190),
  -- Warm earth (8)
  ('terracotta',  '{"en":"Terracotta","fr":"Terracotta","es":"Terracota","it":"Terracotta"}',  '#C97D60', 'earth',   200),
  ('rust',        '{"en":"Rust","fr":"Rouille","es":"Óxido","it":"Ruggine"}',                  '#B7410E', 'earth',   210),
  ('copper',      '{"en":"Copper","fr":"Cuivre","es":"Cobre","it":"Rame"}',                    '#B87333', 'metallic',220),
  ('cognac',      '{"en":"Cognac","fr":"Cognac","es":"Coñac","it":"Cognac"}',                  '#8B4513', 'wood',    230),
  ('tobacco',     '{"en":"Tobacco","fr":"Tabac","es":"Tabaco","it":"Tabacco"}',                '#705C3A', 'earth',   240),
  ('khaki',       '{"en":"Khaki","fr":"Kaki","es":"Caqui","it":"Cachi"}',                      '#8B7E5A', 'earth',   250),
  ('ocre',        '{"en":"Ochre","fr":"Ocre","es":"Ocre","it":"Ocra"}',                        '#CC7722', 'earth',   260),
  ('mustard',     '{"en":"Mustard","fr":"Moutarde","es":"Mostaza","it":"Senape"}',             '#D2A24C', 'warm',    270),
  -- Reds / golds (4)
  ('gold',        '{"en":"Gold","fr":"Or","es":"Oro","it":"Oro"}',                             '#D4AF37', 'metallic',280),
  ('yellow',      '{"en":"Yellow","fr":"Jaune","es":"Amarillo","it":"Giallo"}',                '#F1C40F', 'warm',    290),
  ('red',         '{"en":"Red","fr":"Rouge","es":"Rojo","it":"Rosso"}',                        '#C0392B', 'warm',    300),
  ('bordeaux',    '{"en":"Bordeaux","fr":"Bordeaux","es":"Burdeos","it":"Bordeaux"}',          '#722F37', 'jewel',   310),
  -- Greens (5)
  ('olive',       '{"en":"Olive","fr":"Olive","es":"Oliva","it":"Oliva"}',                     '#808000', 'earth',   320),
  ('sage',        '{"en":"Sage","fr":"Sauge","es":"Salvia","it":"Salvia"}',                    '#9CAF88', 'cool',    330),
  ('moss',        '{"en":"Moss","fr":"Mousse","es":"Musgo","it":"Muschio"}',                   '#6B8E4E', 'cool',    340),
  ('forest',      '{"en":"Forest","fr":"Forêt","es":"Bosque","it":"Foresta"}',                 '#228B22', 'cool',    350),
  ('green',       '{"en":"Green","fr":"Vert","es":"Verde","it":"Verde"}',                      '#2E7D32', 'cool',    360),
  -- Blues (6)
  ('mint',        '{"en":"Mint","fr":"Menthe","es":"Menta","it":"Menta"}',                     '#A8E6CF', 'pastel',  370),
  ('aqua',        '{"en":"Aqua","fr":"Aqua","es":"Aguamarina","it":"Acqua"}',                  '#7FDBFF', 'cool',    380),
  ('turquoise',   '{"en":"Turquoise","fr":"Turquoise","es":"Turquesa","it":"Turchese"}',       '#40E0D0', 'cool',    390),
  ('petrol',      '{"en":"Petrol","fr":"Pétrole","es":"Petróleo","it":"Petrolio"}',            '#005F6A', 'jewel',   400),
  ('navy',        '{"en":"Navy","fr":"Marine","es":"Marino","it":"Blu marino"}',               '#1B263B', 'cool',    410),
  ('blue',        '{"en":"Blue","fr":"Bleu","es":"Azul","it":"Blu"}',                          '#1F77B4', 'cool',    420),
  -- Pastels / accents (3)
  ('blush',       '{"en":"Blush","fr":"Rose poudré","es":"Rubor","it":"Cipria"}',              '#F4C2C2', 'pastel',  430),
  ('indigo',      '{"en":"Indigo","fr":"Indigo","es":"Índigo","it":"Indaco"}',                 '#4B0082', 'jewel',   440),
  ('slate',       '{"en":"Slate","fr":"Ardoise","es":"Pizarra","it":"Ardesia"}',               '#708090', 'cool',    450),
  -- Metallics (3)
  ('silver',      '{"en":"Silver","fr":"Argent","es":"Plata","it":"Argento"}',                 '#C0C0C0', 'metallic',460),
  ('bronze',      '{"en":"Bronze","fr":"Bronze","es":"Bronce","it":"Bronzo"}',                 '#65503D', 'metallic',470),
  ('burgundy',    '{"en":"Burgundy","fr":"Bourgogne","es":"Burdeos profundo","it":"Borgogna"}','#800020', 'jewel',   480),
  -- Sand variants (1)
  ('sand-warm',   '{"en":"Warm sand","fr":"Sable chaud","es":"Arena cálida","it":"Sabbia calda"}','#D2B48C', 'earth', 490);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. finishes_canonical : 30 lignes
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO public.finishes_canonical (slug, label_i18n, category, display_order) VALUES
  -- Wood (6)
  ('teak-natural',          '{"en":"Natural teak","fr":"Teck naturel","es":"Teca natural","it":"Teak naturale"}',                       'wood',  10),
  ('teak-aged',             '{"en":"Aged teak","fr":"Teck vieilli","es":"Teca envejecida","it":"Teak invecchiato"}',                     'wood',  20),
  ('teak-oiled',            '{"en":"Oiled teak","fr":"Teck huilé","es":"Teca aceitada","it":"Teak oliato"}',                              'wood',  30),
  ('iroko-natural',         '{"en":"Natural iroko","fr":"Iroko naturel","es":"Iroko natural","it":"Iroko naturale"}',                    'wood',  40),
  ('acacia-natural',        '{"en":"Natural acacia","fr":"Acacia naturel","es":"Acacia natural","it":"Acacia naturale"}',                'wood',  50),
  ('eucalyptus-natural',    '{"en":"Natural eucalyptus","fr":"Eucalyptus naturel","es":"Eucalipto natural","it":"Eucalipto naturale"}', 'wood',  60),
  -- Metal (13)
  ('aluminum-anodized-clear',     '{"en":"Clear anodized aluminium","fr":"Aluminium anodisé clair","es":"Aluminio anodizado claro","it":"Alluminio anodizzato chiaro"}', 'metal', 100),
  ('aluminum-anodized-bronze',    '{"en":"Bronze anodized aluminium","fr":"Aluminium anodisé bronze","es":"Aluminio anodizado bronce","it":"Alluminio anodizzato bronzo"}', 'metal', 110),
  ('aluminum-powder-matt-black',  '{"en":"Matt black powder-coated aluminium","fr":"Aluminium époxy noir mat","es":"Aluminio epoxi negro mate","it":"Alluminio verniciato nero opaco"}', 'metal', 120),
  ('aluminum-powder-matt-white',  '{"en":"Matt white powder-coated aluminium","fr":"Aluminium époxy blanc mat","es":"Aluminio epoxi blanco mate","it":"Alluminio verniciato bianco opaco"}', 'metal', 130),
  ('aluminum-powder-anthracite',  '{"en":"Anthracite powder-coated aluminium","fr":"Aluminium époxy anthracite","es":"Aluminio epoxi antracita","it":"Alluminio verniciato antracite"}', 'metal', 140),
  ('aluminum-powder-sand',        '{"en":"Sand powder-coated aluminium","fr":"Aluminium époxy sable","es":"Aluminio epoxi arena","it":"Alluminio verniciato sabbia"}', 'metal', 150),
  ('stainless-steel-brushed',     '{"en":"Brushed stainless steel","fr":"Inox brossé","es":"Acero inoxidable cepillado","it":"Acciaio inossidabile spazzolato"}', 'metal', 160),
  ('stainless-steel-mirror',      '{"en":"Mirror stainless steel","fr":"Inox poli miroir","es":"Acero inoxidable espejo","it":"Acciaio inossidabile specchio"}', 'metal', 170),
  ('iron-powder-matt-black',      '{"en":"Matt black powder-coated iron","fr":"Acier époxy noir mat","es":"Hierro epoxi negro mate","it":"Ferro verniciato nero opaco"}', 'metal', 180),
  ('iron-powder-matt-white',      '{"en":"Matt white powder-coated iron","fr":"Acier époxy blanc mat","es":"Hierro epoxi blanco mate","it":"Ferro verniciato bianco opaco"}', 'metal', 190),
  ('brass-natural',               '{"en":"Natural brass","fr":"Laiton naturel","es":"Latón natural","it":"Ottone naturale"}', 'metal', 200),
  ('brass-burnished',             '{"en":"Burnished brass","fr":"Laiton patiné","es":"Latón bruñido","it":"Ottone brunito"}', 'metal', 210),
  ('bronze-aged',                 '{"en":"Aged bronze","fr":"Bronze vieilli","es":"Bronce envejecido","it":"Bronzo invecchiato"}', 'metal', 220),
  -- Composite (4)
  ('hpl-compact-anthracite',      '{"en":"Anthracite HPL compact","fr":"HPL compact anthracite","es":"HPL compacto antracita","it":"HPL compatto antracite"}', 'composite', 300),
  ('hpl-compact-white',           '{"en":"White HPL compact","fr":"HPL compact blanc","es":"HPL compacto blanco","it":"HPL compatto bianco"}', 'composite', 310),
  ('hpl-compact-teak-effect',     '{"en":"Teak-effect HPL compact","fr":"HPL compact aspect teck","es":"HPL compacto efecto teca","it":"HPL compatto effetto teak"}', 'composite', 320),
  ('hpl-compact-stone-effect',    '{"en":"Stone-effect HPL compact","fr":"HPL compact aspect pierre","es":"HPL compacto efecto piedra","it":"HPL compatto effetto pietra"}', 'composite', 330),
  -- Fabric (3) — finitions de tissu signature
  ('sunbrella-canvas',            '{"en":"Sunbrella Canvas","fr":"Sunbrella Canvas","es":"Sunbrella Canvas","it":"Sunbrella Canvas"}', 'fabric', 400),
  ('sunbrella-heritage',          '{"en":"Sunbrella Heritage","fr":"Sunbrella Heritage","es":"Sunbrella Heritage","it":"Sunbrella Heritage"}', 'fabric', 410),
  ('dickson-orchestra-max',       '{"en":"Dickson Orchestra Max","fr":"Dickson Orchestra Max","es":"Dickson Orchestra Max","it":"Dickson Orchestra Max"}', 'fabric', 420),
  -- Other (4)
  ('powder-coat-textured-black',  '{"en":"Textured black powder-coat","fr":"Époxy noir texturé","es":"Recubrimiento texturado negro","it":"Verniciatura testurizzata nera"}', 'other', 500),
  ('powder-coat-textured-bronze', '{"en":"Textured bronze powder-coat","fr":"Époxy bronze texturé","es":"Recubrimiento texturado bronce","it":"Verniciatura testurizzata bronzo"}', 'other', 510),
  ('ceramic-glaze-matte',         '{"en":"Matte ceramic glaze","fr":"Émail céramique mat","es":"Esmalte cerámico mate","it":"Smalto ceramico opaco"}', 'other', 520),
  ('ceramic-glaze-glossy',        '{"en":"Glossy ceramic glaze","fr":"Émail céramique brillant","es":"Esmalte cerámico brillante","it":"Smalto ceramico lucido"}', 'other', 530);

-- ─────────────────────────────────────────────────────────────────────────
-- 6. markets : 8 marchés Phase 1
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO public.markets (code, label_i18n, currency, display_order) VALUES
  ('EU', '{"en":"European Union","fr":"Union européenne","es":"Unión Europea","it":"Unione Europea"}', 'EUR',  1),
  ('FR', '{"en":"France","fr":"France","es":"Francia","it":"Francia"}',                                'EUR', 10),
  ('IT', '{"en":"Italy","fr":"Italie","es":"Italia","it":"Italia"}',                                   'EUR', 20),
  ('ES', '{"en":"Spain","fr":"Espagne","es":"España","it":"Spagna"}',                                  'EUR', 30),
  ('DE', '{"en":"Germany","fr":"Allemagne","es":"Alemania","it":"Germania"}',                          'EUR', 40),
  ('UK', '{"en":"United Kingdom","fr":"Royaume-Uni","es":"Reino Unido","it":"Regno Unito"}',           'GBP', 50),
  ('CH', '{"en":"Switzerland","fr":"Suisse","es":"Suiza","it":"Svizzera"}',                            'CHF', 60),
  ('US', '{"en":"United States","fr":"États-Unis","es":"Estados Unidos","it":"Stati Uniti"}',          'USD', 90);

-- ─────────────────────────────────────────────────────────────────────────
-- Validation : asserts de cohérence post-seed
-- ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  mb_count int;
  cert_count int;
  link_count int;
  color_count int;
  finish_count int;
  market_count int;
BEGIN
  SELECT COUNT(*) INTO mb_count FROM public.material_brands;
  SELECT COUNT(*) INTO cert_count FROM public.certifications;
  SELECT COUNT(*) INTO link_count FROM public.material_brand_certifications;
  SELECT COUNT(*) INTO color_count FROM public.colors_canonical;
  SELECT COUNT(*) INTO finish_count FROM public.finishes_canonical;
  SELECT COUNT(*) INTO market_count FROM public.markets;

  IF mb_count < 25 OR mb_count > 30 THEN
    RAISE EXCEPTION 'material_brands seed mismatch: % rows (expected 25-30)', mb_count;
  END IF;
  IF cert_count < 15 OR cert_count > 20 THEN
    RAISE EXCEPTION 'certifications seed mismatch: % rows (expected 15-20)', cert_count;
  END IF;
  IF link_count < 10 THEN
    RAISE EXCEPTION 'material_brand_certifications seed too sparse: % rows', link_count;
  END IF;
  IF color_count < 45 OR color_count > 55 THEN
    RAISE EXCEPTION 'colors_canonical seed mismatch: % rows (expected 45-55)', color_count;
  END IF;
  IF finish_count < 25 OR finish_count > 35 THEN
    RAISE EXCEPTION 'finishes_canonical seed mismatch: % rows (expected 25-35)', finish_count;
  END IF;
  IF market_count != 8 THEN
    RAISE EXCEPTION 'markets seed mismatch: % rows (expected 8)', market_count;
  END IF;
END $$;
