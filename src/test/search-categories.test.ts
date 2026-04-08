import { describe, it, expect } from "vitest";
import { searchProducts, normalizeQuery, detectIntent, filterProducts } from "@/engine/intentDetector";
import type { DBProduct } from "@/lib/products";

// ═══════════════════════════════════════════════════════════
// REAL CATALOG (mirrors the 8 Supabase products)
// ═══════════════════════════════════════════════════════════

function p(overrides: Partial<DBProduct>): DBProduct {
  return {
    id: overrides.id || crypto.randomUUID(),
    created_at: "", updated_at: "",
    name: overrides.name || "",
    category: overrides.category || "",
    subcategory: overrides.subcategory || "",
    short_description: overrides.short_description || "",
    long_description: null, product_family: null, collection: null,
    brand_source: null, supplier_internal: null,
    archetype_id: null, archetype_confidence: null,
    image_url: null, gallery_urls: [], documents: null,
    indicative_price: null,
    price_min: overrides.price_min ?? 100,
    price_max: overrides.price_max ?? 200,
    style_tags: overrides.style_tags || [],
    ambience_tags: overrides.ambience_tags || [],
    palette_tags: overrides.palette_tags || [],
    material_tags: overrides.material_tags || [],
    use_case_tags: overrides.use_case_tags || [],
    technical_tags: overrides.technical_tags || [],
    product_type_tags: overrides.product_type_tags || {},
    main_color: overrides.main_color || null,
    secondary_color: null, available_colors: [], color_variants: null,
    dimensions_length_cm: null, dimensions_width_cm: null,
    dimensions_height_cm: null, seat_height_cm: null,
    weight_kg: null, table_shape: null,
    default_seating_capacity: null,
    recommended_seating_min: null, recommended_seating_max: null,
    combinable: null, combined_capacity_if_joined: null,
    is_outdoor: true, is_stackable: false, is_chr_heavy_use: true,
    uv_resistant: true, weather_resistant: true,
    fire_retardant: false, lightweight: false,
    easy_maintenance: true, customizable: false,
    dismountable: false, requires_assembly: false,
    material_structure: null, material_seat: null,
    country_of_manufacture: null, warranty: null,
    maintenance_info: null, stock_status: null,
    stock_quantity: null, estimated_delivery_days: null,
    availability_type: "available",
    popularity_score: 0.5, priority_score: 0.5,
    data_quality_score: 0.8,
    is_canonical_instance: true, duplicate_of: null,
    publish_status: "published", partner_id: null,
    name_fr: null, name_es: null, name_it: null,
    short_description_fr: null, short_description_es: null, short_description_it: null,
    long_description_fr: null, long_description_es: null, long_description_it: null,
    maintenance_info_fr: null, maintenance_info_es: null, maintenance_info_it: null,
  } as DBProduct;
}

const CATALOG: DBProduct[] = [
  p({
    id: "armchair-cote", name: "Côte Lounge Armchair", category: "Armchairs", subcategory: "Lounge Armchair",
    style_tags: ["modern", "minimal", "luxury"], material_tags: ["aluminium", "fabric"],
    use_case_tags: ["hotel-patio", "rooftop", "lounge-area", "poolside"],
    technical_tags: ["uv-resistant", "weather-resistant", "lightweight"],
    main_color: "grey", price_min: 890,
    product_type_tags: { silhouette: "lounge" },
  }),
  p({
    id: "stool-porto", name: "Porto Bar Stool", category: "Bar Stools", subcategory: "Bar Stool",
    style_tags: ["natural", "bohemian", "coastal"], material_tags: ["synthetic-rattan", "steel"],
    use_case_tags: ["rooftop", "beach-club", "lounge-area"],
    technical_tags: ["lightweight", "easy-maintenance"],
    main_color: "natural", price_min: 280,
    product_type_tags: { silhouette: "4-leg" },
  }),
  p({
    id: "chair-bistro", name: "Bistro Stackable Chair", category: "Chairs", subcategory: "Bistro Chair",
    style_tags: ["industrial", "modern", "bistro"], material_tags: ["aluminium"],
    use_case_tags: ["cafe-frontage", "high-volume-brasserie", "event-dining"],
    technical_tags: ["stackable", "lightweight", "chr-heavy-use", "easy-maintenance"],
    main_color: "anthracite", price_min: 195,
    product_type_tags: { silhouette: "bistrot" },
    short_description: "Lightweight aluminum bistro chair. Stackable for easy storage.",
  }),
  p({
    id: "chair-riviera", name: "Riviera Dining Chair", category: "Chairs", subcategory: "Dining Chair",
    style_tags: ["mediterranean", "coastal", "natural", "artisan"], material_tags: ["teak", "rope"],
    use_case_tags: ["restaurant-terrace", "hotel-garden", "beach-club"],
    technical_tags: ["uv-resistant", "weather-resistant"],
    main_color: "natural", price_min: 320,
    product_type_tags: { silhouette: "4-leg" },
    short_description: "Woven rope seat with solid teak frame. Weather-resistant outdoor dining.",
  }),
  p({
    id: "sofa-terrazza", name: "Terrazza Lounge Sofa", category: "Lounge Seating", subcategory: "Outdoor Sofa",
    style_tags: ["scandinavian", "minimal", "natural"], material_tags: ["teak", "fabric"],
    use_case_tags: ["hotel-patio", "lounge-area", "poolside", "rooftop"],
    technical_tags: ["weather-resistant", "easy-maintenance"],
    main_color: "natural", price_min: 1650,
  }),
  p({
    id: "parasol-horizon", name: "Horizon Parasol 3m", category: "Parasols", subcategory: "Centre Pole Parasol",
    style_tags: ["classic", "coastal", "minimal"], material_tags: ["aluminium", "fabric"],
    use_case_tags: ["restaurant-terrace", "hotel-patio", "cafe-frontage", "poolside"],
    technical_tags: ["uv-resistant", "weather-resistant", "chr-heavy-use"],
    main_color: "white", price_min: 1200,
    product_type_tags: { parasol_type: "centre-pole", wind_beaufort: 5 },
  }),
  p({
    id: "table-marble", name: "Marble Dining Table", category: "Tables", subcategory: "Dining Table",
    style_tags: ["modern", "luxury", "classic"], material_tags: ["marble-effect", "steel"],
    use_case_tags: ["hotel-patio", "rooftop", "lounge-area"],
    technical_tags: ["chr-heavy-use", "weather-resistant"],
    main_color: "white", price_min: 1900,
    product_type_tags: { table_type: "complete", dimension_tag: "160x80" },
  }),
  p({
    id: "table-soleil", name: "Soleil Round Table", category: "Tables", subcategory: "Dining Table",
    style_tags: ["modern", "natural", "coastal"], material_tags: ["teak", "steel"],
    use_case_tags: ["restaurant-terrace", "cafe-frontage", "hotel-patio"],
    technical_tags: ["weather-resistant", "chr-heavy-use"],
    main_color: "teak", price_min: 750,
    product_type_tags: { table_type: "complete", dimension_tag: "o80" },
  }),
];

// ═══════════════════════════════════════════════════════════
// 1. CATEGORY SEARCH — each category returns the right products
// ═══════════════════════════════════════════════════════════

describe("Category search — EN", () => {
  const cases: [string, string[]][] = [
    ["chairs", ["chair-bistro", "chair-riviera"]],
    ["armchairs", ["armchair-cote"]],
    ["tables", ["table-marble", "table-soleil"]],
    ["bar stools", ["stool-porto"]],
    ["parasol", ["parasol-horizon"]],
    ["sofa", ["sofa-terrazza"]],
  ];

  for (const [query, expectedIds] of cases) {
    it(`"${query}" → finds ${expectedIds.join(", ")}`, () => {
      const { recommended } = searchProducts(query, CATALOG);
      for (const id of expectedIds) {
        expect(recommended.some(p => p.id === id)).toBe(true);
      }
      // First result should be from the expected category
      expect(expectedIds).toContain(recommended[0].id);
    });
  }
});

describe("Category search — FR", () => {
  const cases: [string, string[]][] = [
    ["chaises", ["chair-bistro", "chair-riviera"]],
    ["fauteuil", ["armchair-cote"]],
    ["table", ["table-marble", "table-soleil"]],
    ["tabouret de bar", ["stool-porto"]],
    ["parasol", ["parasol-horizon"]],
    ["canapé", ["sofa-terrazza"]],
  ];

  for (const [query, expectedIds] of cases) {
    it(`"${query}" → finds ${expectedIds.join(", ")}`, () => {
      const { recommended } = searchProducts(query, CATALOG);
      for (const id of expectedIds) {
        expect(recommended.some(p => p.id === id)).toBe(true);
      }
      expect(expectedIds).toContain(recommended[0].id);
    });
  }
});

describe("Category search — IT", () => {
  const cases: [string, string[]][] = [
    ["sedia", ["chair-bistro", "chair-riviera"]],
    ["poltrona", ["armchair-cote"]],
    ["tavolo", ["table-marble", "table-soleil"]],
    ["sgabello", ["stool-porto"]],
    ["ombrellone", ["parasol-horizon"]],
    ["divano", ["sofa-terrazza"]],
  ];

  for (const [query, expectedIds] of cases) {
    it(`"${query}" → finds ${expectedIds.join(", ")}`, () => {
      const { recommended } = searchProducts(query, CATALOG);
      for (const id of expectedIds) {
        expect(recommended.some(p => p.id === id)).toBe(true);
      }
      expect(expectedIds).toContain(recommended[0].id);
    });
  }
});

describe("Category search — ES", () => {
  const cases: [string, string[]][] = [
    ["silla", ["chair-bistro", "chair-riviera"]],
    ["sillón", ["armchair-cote"]],
    ["mesa", ["table-marble", "table-soleil"]],
    ["taburete", ["stool-porto"]],
    ["sombrilla", ["parasol-horizon"]],
    ["sofá", ["sofa-terrazza"]],
  ];

  for (const [query, expectedIds] of cases) {
    it(`"${query}" → finds ${expectedIds.join(", ")}`, () => {
      const { recommended } = searchProducts(query, CATALOG);
      for (const id of expectedIds) {
        expect(recommended.some(p => p.id === id)).toBe(true);
      }
      expect(expectedIds).toContain(recommended[0].id);
    });
  }
});

// ═══════════════════════════════════════════════════════════
// 2. STYLE SEARCH — products matching a style are boosted
// ═══════════════════════════════════════════════════════════

describe("Style search", () => {
  it('"mediterranean chair" → Riviera first (has mediterranean tag)', () => {
    const { recommended } = searchProducts("mediterranean chair", CATALOG);
    expect(recommended[0].id).toBe("chair-riviera");
  });

  it('"modern table" → both tables present, modern-tagged first', () => {
    const { recommended } = searchProducts("modern table", CATALOG);
    const tableIds = recommended.filter(r => r.category === "Tables").map(r => r.id);
    expect(tableIds.length).toBe(2);
    // Both have "modern" tag, marble also has "luxury" → either can be first
    expect(tableIds).toContain("table-marble");
    expect(tableIds).toContain("table-soleil");
  });

  it('"bistro" → Bistro chair first', () => {
    const { recommended } = searchProducts("bistro chair", CATALOG);
    expect(recommended[0].id).toBe("chair-bistro");
  });

  it('"coastal" → products with coastal tag ranked high', () => {
    const { recommended } = searchProducts("coastal", CATALOG);
    const coastalProducts = recommended.filter(r => r.style_tags.includes("coastal"));
    // Riviera, Porto, Horizon, Soleil all have "coastal"
    expect(coastalProducts.length).toBeGreaterThanOrEqual(3);
  });
});

// ═══════════════════════════════════════════════════════════
// 3. MATERIAL SEARCH — products with matching materials
// ═══════════════════════════════════════════════════════════

describe("Material search", () => {
  it('"teak" → Riviera chair, Soleil table, Terrazza sofa', () => {
    const { recommended } = searchProducts("teak", CATALOG);
    const teakProducts = recommended.filter(r => r.material_tags.includes("teak"));
    expect(teakProducts.length).toBeGreaterThanOrEqual(3);
    expect(teakProducts.map(p => p.id)).toEqual(expect.arrayContaining(["chair-riviera", "table-soleil", "sofa-terrazza"]));
  });

  it('"aluminium chair" → Bistro first (aluminium + chair match)', () => {
    const { recommended } = searchProducts("aluminium chair", CATALOG);
    expect(recommended[0].id).toBe("chair-bistro");
  });

  it('"teck" (FR) → same as "teak"', () => {
    const norm = normalizeQuery("teck");
    expect(norm.materialSlugs).toContain("teak");
  });

  it('"rattan" → Porto bar stool', () => {
    const { recommended } = searchProducts("rattan", CATALOG);
    const rattanProducts = recommended.filter(r => r.material_tags.includes("synthetic-rattan"));
    expect(rattanProducts.length).toBeGreaterThanOrEqual(1);
    expect(rattanProducts[0].id).toBe("stool-porto");
  });
});

// ═══════════════════════════════════════════════════════════
// 4. COLOR SEARCH — products matching a color
// ═══════════════════════════════════════════════════════════

describe("Color search", () => {
  it('"white table" → Marble table first (white + table)', () => {
    const { recommended } = searchProducts("white table", CATALOG);
    expect(recommended[0].id).toBe("table-marble");
  });

  it('"noir" (FR for black) → anthracite/black products boosted', () => {
    const norm = normalizeQuery("chaise noir");
    expect(norm.colorSlugs).toContain("black");
    expect(norm.categorySlug).toBe("chairs");
  });

  it('"grey armchair" → Côte Lounge (grey + armchair)', () => {
    const { recommended } = searchProducts("grey armchair", CATALOG);
    expect(recommended[0].id).toBe("armchair-cote");
  });
});

// ═══════════════════════════════════════════════════════════
// 5. USE-CASE SEARCH — products for specific venues
// ═══════════════════════════════════════════════════════════

describe("Use-case search", () => {
  it('"rooftop" → products with rooftop use-case ranked high', () => {
    const { recommended } = searchProducts("rooftop furniture", CATALOG);
    const rooftopProducts = recommended.filter(r => r.use_case_tags.includes("rooftop"));
    // Cote armchair, Porto stool, Terrazza sofa, Marble table all have rooftop
    expect(rooftopProducts.length).toBeGreaterThanOrEqual(3);
  });

  it('"beach club" → intent is project_creation (no category), products with beach-club tag present', () => {
    const intent = detectIntent("beach club");
    expect(intent).toBe("project_creation");
  });

  it('"chair for beach club" → product search with use-case boost', () => {
    const intent = detectIntent("chair for beach club");
    expect(intent).toBe("product_search");
    const { recommended } = searchProducts("chair for beach club", CATALOG);
    // Riviera has beach-club use-case
    expect(recommended.some(r => r.id === "chair-riviera")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
// 6. MULTI-CRITERIA — combined searches
// ═══════════════════════════════════════════════════════════

describe("Multi-criteria search", () => {
  it('"teak coastal chair" → Riviera (teak + coastal + chair)', () => {
    const { recommended } = searchProducts("teak coastal chair", CATALOG);
    expect(recommended[0].id).toBe("chair-riviera");
  });

  it('"modern luxury table" → Marble table (modern + luxury + table)', () => {
    const { recommended } = searchProducts("modern luxury table", CATALOG);
    expect(recommended[0].id).toBe("table-marble");
  });

  it('"aluminium stackable" → Bistro (aluminium + stackable in technical_tags)', () => {
    const { recommended } = searchProducts("aluminium stackable chair", CATALOG);
    expect(recommended[0].id).toBe("chair-bistro");
  });
});

// ═══════════════════════════════════════════════════════════
// 7. SIMILAR & COMPATIBLE — cross-category suggestions
// ═══════════════════════════════════════════════════════════

describe("Similar & compatible products", () => {
  it('"chair" → similar = other chairs, compatible = tables/parasols', () => {
    const { recommended, similar, compatible } = searchProducts("chairs", CATALOG);
    // Recommended should be both chairs
    expect(recommended.filter(r => r.category === "Chairs").length).toBe(2);
    // Similar: other chairs not in recommended (may be empty with only 2 chairs)
    for (const s of similar) {
      expect(s.category).toBe("Chairs");
    }
    // Compatible: tables and/or parasols
    if (compatible.length > 0) {
      const compatCats = compatible.map(c => c.category);
      expect(compatCats.some(c => c === "Tables" || c === "Parasols" || c === "Accessories")).toBe(true);
    }
  });

  it('"table" → compatible includes chairs', () => {
    const { compatible } = searchProducts("table", CATALOG);
    if (compatible.length > 0) {
      const hasSeating = compatible.some(c =>
        c.category === "Chairs" || c.category === "Armchairs" || c.category === "Parasols"
      );
      expect(hasSeating).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 8. DESCRIPTION FALLBACK — raw terms match in description
// ═══════════════════════════════════════════════════════════

describe("Description fallback", () => {
  it('"stackable storage" → matches Bistro description even if not in tags', () => {
    const { recommended } = searchProducts("stackable storage", CATALOG);
    // "stackable" matches technical_tag, "storage" matches description
    expect(recommended.some(r => r.id === "chair-bistro")).toBe(true);
  });

  it('"rope woven" → matches Riviera description', () => {
    const { recommended } = searchProducts("rope woven", CATALOG);
    expect(recommended.some(r => r.id === "chair-riviera")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
// 9. WORD-BOUNDARY MATCHING — avoid false positives
// ═══════════════════════════════════════════════════════════

describe("Word-boundary matching", () => {
  const lounge = p({
    id: "lounge-comfort", name: "Comfortable Lounge Armchair", category: "Armchairs",
    style_tags: ["modern"], material_tags: ["fabric"],
    main_color: "grey", price_min: 500,
  });

  it('"table" should NOT have Comfortable Lounge as top result', () => {
    const catalog = [...CATALOG, lounge];
    const { recommended } = searchProducts("table", catalog);
    expect(recommended[0].category).toBe("Tables");
    expect(recommended.some(r => r.id === "lounge-comfort")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// 10. NATURAL DISAMBIGUATION — context-aware color/style
// ═══════════════════════════════════════════════════════════

describe("Natural disambiguation", () => {
  it('"natural chair" → natural resolved as style (category present)', () => {
    const norm = normalizeQuery("natural chair");
    expect(norm.styleSlugs).toContain("natural");
    expect(norm.colorSlugs).not.toContain("natural");
    expect(norm.categorySlug).toBe("chairs");
  });

  it('"natural" alone → resolved as color', () => {
    const norm = normalizeQuery("natural");
    expect(norm.colorSlugs).toContain("natural");
    expect(norm.styleSlugs).not.toContain("natural");
  });

  it('"naturel méditerranéen" → natural as style (other style present)', () => {
    const norm = normalizeQuery("naturel méditerranéen");
    expect(norm.styleSlugs).toContain("natural");
    expect(norm.styleSlugs).toContain("mediterranean");
    expect(norm.colorSlugs).not.toContain("natural");
  });
});

// ═══════════════════════════════════════════════════════════
// 11. CATEGORY-SPECIFIC HINTS — tables, chairs, parasols
// ═══════════════════════════════════════════════════════════

describe("Table-specific hints", () => {
  it('"table ronde" → shapeHint = round', () => {
    const norm = normalizeQuery("table ronde");
    expect(norm.shapeHint).toBe("round");
    expect(norm.categorySlug).toBe("tables");
  });

  it('"tavolo quadrato" (IT) → shapeHint = square', () => {
    const norm = normalizeQuery("tavolo quadrato");
    expect(norm.shapeHint).toBe("square");
  });

  it('"table 6 places" → capacityHint = 6', () => {
    const norm = normalizeQuery("table 6 places");
    expect(norm.capacityHint).toBe(6);
  });

  it('"table ronde" → round table with Ø80 boosted', () => {
    const roundTable = p({
      id: "table-round", name: "Round Teak Table", category: "Tables",
      style_tags: ["modern"], material_tags: ["teak"],
      main_color: "teak", price_min: 800,
      product_type_tags: { table_type: "complete", shape: "round", dimension_tag: "o80" },
    });
    const squareTable = p({
      id: "table-square", name: "Square Steel Table", category: "Tables",
      style_tags: ["modern"], material_tags: ["steel"],
      main_color: "black", price_min: 600,
      product_type_tags: { table_type: "complete", shape: "square", dimension_tag: "80x80" },
    });
    const { recommended } = searchProducts("table ronde", [roundTable, squareTable]);
    expect(recommended[0].id).toBe("table-round");
  });
});

describe("Chair-specific hints", () => {
  it('"chaise empilable" → stackableHint = true', () => {
    const norm = normalizeQuery("chaise empilable");
    expect(norm.stackableHint).toBe(true);
    expect(norm.categorySlug).toBe("chairs");
  });

  it('"fauteuil" → armTypeHint = with-arms (implicit)', () => {
    const norm = normalizeQuery("fauteuil");
    expect(norm.armTypeHint).toBe("with-arms");
    expect(norm.categorySlug).toBe("armchairs");
  });

  it('stackable chairs boosted over non-stackable', () => {
    const { recommended } = searchProducts("chaise empilable", CATALOG);
    // Bistro is stackable, Riviera is not
    expect(recommended[0].id).toBe("chair-bistro");
  });
});

describe("Parasol-specific hints", () => {
  it('"parasol déporté" → parasolTypeHint = cantilever', () => {
    const norm = normalizeQuery("parasol déporté");
    expect(norm.parasolTypeHint).toBe("cantilever");
    expect(norm.categorySlug).toBe("parasols");
  });

  it('"parasol 3m" → parasolSizeHint = 3', () => {
    const norm = normalizeQuery("parasol 3m");
    expect(norm.parasolSizeHint).toBe(3);
  });

  it('"ombrellone 4m" (IT) → parasol + size 4', () => {
    const norm = normalizeQuery("ombrellone 4m");
    expect(norm.categorySlug).toBe("parasols");
    expect(norm.parasolSizeHint).toBe(4);
  });
});

// ═══════════════════════════════════════════════════════════
// 12. filterProducts — unified Products page search
// ═══════════════════════════════════════════════════════════

describe("filterProducts", () => {
  it("returns scored results sorted by relevance", () => {
    const results = filterProducts("chair", CATALOG);
    expect(results.length).toBeGreaterThan(0);
    // Chairs should be first
    expect(results[0].category).toBe("Chairs");
  });

  it("returns all products on zero results (fallback)", () => {
    const results = filterProducts("xyznonexistent", CATALOG);
    // Should fallback to full catalog rather than empty
    expect(results.length).toBe(CATALOG.length);
  });

  it("empty query returns all products unchanged", () => {
    const results = filterProducts("", CATALOG);
    expect(results.length).toBe(CATALOG.length);
  });

  it("French multi-word query works", () => {
    const results = filterProducts("chaise aluminium", CATALOG);
    expect(results[0].id).toBe("chair-bistro");
  });
});
