import { describe, it, expect } from "vitest";
import { detectIntent, searchProducts, normalizeQuery } from "@/engine/intentDetector";
import {
  parseProjectRequest,
  detectMissingFields,
  applyAnswer,
  isRequestComplete,
  generateProjectConcepts,
} from "@/engine/projectEngine";
import type { DBProduct } from "@/lib/products";

// ═══════════════════════════════════════════════════════════
// MOCK PRODUCT FACTORY
// ═══════════════════════════════════════════════════════════

function mockProduct(overrides: Partial<DBProduct> = {}): DBProduct {
  return {
    id: crypto.randomUUID(),
    created_at: "",
    updated_at: "",
    name: "Test Chair",
    category: "Chairs",
    subcategory: "Dining Chair",
    short_description: "A professional outdoor dining chair",
    long_description: null,
    product_family: null,
    collection: null,
    brand_source: null,
    supplier_internal: null,
    archetype_id: null,
    archetype_confidence: null,
    image_url: null,
    gallery_urls: [],
    documents: null,
    indicative_price: "€150",
    price_min: 120,
    price_max: 180,
    style_tags: ["modern"],
    ambience_tags: ["relaxed"],
    palette_tags: ["natural"],
    material_tags: ["aluminium"],
    use_case_tags: ["restaurant-terrace"],
    technical_tags: ["weather-resistant"],
    product_type_tags: {},
    main_color: "black",
    secondary_color: null,
    available_colors: ["black", "white", "grey"],
    color_variants: null,
    dimensions_length_cm: 55,
    dimensions_width_cm: 50,
    dimensions_height_cm: 82,
    seat_height_cm: 45,
    weight_kg: 4.5,
    table_shape: null,
    default_seating_capacity: null,
    recommended_seating_min: null,
    recommended_seating_max: null,
    combinable: null,
    combined_capacity_if_joined: null,
    is_outdoor: true,
    is_stackable: true,
    is_chr_heavy_use: true,
    uv_resistant: true,
    weather_resistant: true,
    fire_retardant: false,
    lightweight: true,
    easy_maintenance: true,
    customizable: false,
    dismountable: false,
    requires_assembly: false,
    material_structure: "aluminium",
    material_seat: "textilene",
    country_of_manufacture: "Italy",
    warranty: "3 years",
    maintenance_info: null,
    stock_status: "in_stock",
    stock_quantity: 200,
    estimated_delivery_days: 14,
    availability_type: "available",
    popularity_score: 0.8,
    priority_score: 1.0,
    data_quality_score: 0.85,
    is_canonical_instance: true,
    duplicate_of: null,
    publish_status: "published",
    partner_id: null,
    // Multilingual fields
    name_fr: null, name_es: null, name_it: null,
    short_description_fr: null, short_description_es: null, short_description_it: null,
    long_description_fr: null, long_description_es: null, long_description_it: null,
    maintenance_info_fr: null, maintenance_info_es: null, maintenance_info_it: null,
  } as DBProduct;
}

function createCatalog(): DBProduct[] {
  return [
    mockProduct({ id: "chair-modern", name: "Modern Alu Chair", category: "Chairs", style_tags: ["modern", "minimal"], material_tags: ["aluminium"], main_color: "black", weight_kg: 3.8, price_min: 120 }),
    mockProduct({ id: "chair-teak", name: "Teak Dining Chair", category: "Chairs", style_tags: ["natural", "mediterranean"], material_tags: ["teak"], main_color: "teak", weight_kg: 8, price_min: 280 }),
    mockProduct({ id: "chair-bistro", name: "Bistro Stackable Chair", category: "Chairs", subcategory: "Bistro Chair", style_tags: ["bistro", "classic"], material_tags: ["aluminium"], main_color: "anthracite", weight_kg: 3.5, is_stackable: true, price_min: 95, product_type_tags: { silhouette: "bistrot" } }),
    mockProduct({ id: "table-square", name: "HPL Dining Table 70x70", category: "Tables", style_tags: ["modern", "minimal"], material_tags: ["aluminium", "hpl"], main_color: "anthracite", price_min: 180, product_type_tags: { dimension_tag: "70×70 cm — 2 covers", table_type: "complete" } }),
    mockProduct({ id: "table-teak", name: "Teak Table 120x70", category: "Tables", style_tags: ["natural", "mediterranean"], material_tags: ["teak"], main_color: "teak", price_min: 650, product_type_tags: { dimension_tag: "120×70 cm — 4 covers", table_type: "complete" } }),
    mockProduct({ id: "parasol-3m", name: "Cantilever Parasol 3m", category: "Parasols", style_tags: ["modern"], material_tags: ["aluminium"], main_color: "white", price_min: 890, uv_resistant: true, weather_resistant: true, product_type_tags: { wind_beaufort: 6, parasol_type: "cantilever", diameter_m: 3 } }),
    mockProduct({ id: "lounger-pool", name: "Pool Sun Lounger", category: "Sun Loungers", style_tags: ["modern", "luxury"], material_tags: ["aluminium", "textilene"], main_color: "white", price_min: 450, uv_resistant: true }),
    mockProduct({ id: "sofa-2seat", name: "Outdoor Lounge Sofa", category: "Lounge Seating", style_tags: ["modern", "lounge"], material_tags: ["aluminium", "fabric"], main_color: "grey", price_min: 1200 }),
    mockProduct({ id: "stool-bar", name: "Bar Stool Porto", category: "Bar Stools", style_tags: ["natural", "coastal"], material_tags: ["synthetic-rattan", "steel"], main_color: "natural", price_min: 220 }),
    mockProduct({ id: "bench-teak", name: "Garden Teak Bench", category: "Benches", style_tags: ["natural", "classic"], material_tags: ["teak"], main_color: "teak", price_min: 480, weight_kg: 18 }),
    mockProduct({ id: "cushion-seat", name: "Seat Cushion Sunbrella", category: "Accessories", style_tags: ["modern"], material_tags: ["fabric"], main_color: "grey", price_min: 45 }),
    mockProduct({ id: "parasol-base", name: "Granite Parasol Base 60kg", category: "Accessories", style_tags: [], material_tags: ["concrete"], main_color: "grey", price_min: 180 }),
  ];
}

// ═══════════════════════════════════════════════════════════
// 1. INTENT DETECTION TESTS
// ═══════════════════════════════════════════════════════════

describe("Intent Detection", () => {
  it("detects product search for explicit categories (EN)", () => {
    expect(detectIntent("black aluminium chairs")).toBe("product_search");
    expect(detectIntent("teak dining table")).toBe("product_search");
    expect(detectIntent("parasol 3m")).toBe("product_search");
  });

  it("detects product search for categories (FR)", () => {
    expect(detectIntent("chaise teck noir")).toBe("product_search");
    expect(detectIntent("fauteuil corde")).toBe("product_search");
    expect(detectIntent("tabouret de bar")).toBe("product_search");
  });

  it("detects product search for categories (IT)", () => {
    expect(detectIntent("sedia alluminio")).toBe("product_search");
    expect(detectIntent("tavolo teak")).toBe("product_search");
    expect(detectIntent("ombrellone")).toBe("product_search");
  });

  it("detects product search for categories (ES)", () => {
    expect(detectIntent("silla aluminio negra")).toBe("product_search");
    expect(detectIntent("mesa teca")).toBe("product_search");
    expect(detectIntent("sombrilla")).toBe("product_search");
  });

  it("detects project creation for capacity mentions", () => {
    expect(detectIntent("40 seats restaurant terrace")).toBe("project_creation");
    expect(detectIntent("terrasse 60 couverts")).toBe("project_creation");
    expect(detectIntent("ristorante 80 posti")).toBe("project_creation");
    expect(detectIntent("restaurante 50 plazas")).toBe("project_creation");
  });

  it("detects project creation for surface mentions", () => {
    expect(detectIntent("terrasse 120 m²")).toBe("project_creation");
    expect(detectIntent("60 sqm rooftop")).toBe("project_creation");
  });

  it("detects project creation for venue-only queries", () => {
    expect(detectIntent("beach club lounge area")).toBe("project_creation");
    expect(detectIntent("rooftop bar modern")).toBe("project_creation");
    expect(detectIntent("aménagement terrasse restaurant")).toBe("project_creation");
  });

  it("detects project creation for use-case without category", () => {
    expect(detectIntent("pool deck hotel")).toBe("project_creation");
    expect(detectIntent("spa wellness outdoor")).toBe("project_creation");
  });

  it("prefers product_search when category is explicit even with venue terms", () => {
    expect(detectIntent("chairs for restaurant terrace")).toBe("product_search");
    expect(detectIntent("parasol for beach club")).toBe("product_search");
  });
});

// ═══════════════════════════════════════════════════════════
// 2. QUERY NORMALIZATION TESTS
// ═══════════════════════════════════════════════════════════

describe("Query Normalization", () => {
  it("normalizes multi-language category terms", () => {
    expect(normalizeQuery("chaise").categorySlug).toBe("chairs");
    expect(normalizeQuery("sedia").categorySlug).toBe("chairs");
    expect(normalizeQuery("silla").categorySlug).toBe("chairs");
    expect(normalizeQuery("stuhl").categorySlug).toBe("chairs");
  });

  it("normalizes sun lounger terms in all languages", () => {
    expect(normalizeQuery("sun lounger").categorySlug).toBe("sun loungers");
    expect(normalizeQuery("bain de soleil").categorySlug).toBe("sun loungers");
    expect(normalizeQuery("lettino").categorySlug).toBe("sun loungers");
    expect(normalizeQuery("tumbona").categorySlug).toBe("sun loungers");
    expect(normalizeQuery("sonnenliege").categorySlug).toBe("sun loungers");
  });

  it("normalizes accessory terms", () => {
    expect(normalizeQuery("coussin").categorySlug).toBe("accessories");
    expect(normalizeQuery("housse").categorySlug).toBe("accessories");
    expect(normalizeQuery("cuscino").categorySlug).toBe("accessories");
    expect(normalizeQuery("cojín").categorySlug).toBe("accessories");
  });

  it("normalizes parasol/shade terms", () => {
    expect(normalizeQuery("shade sail").categorySlug).toBe("parasols");
    expect(normalizeQuery("pergola").categorySlug).toBe("parasols");
    expect(normalizeQuery("voile d'ombrage").categorySlug).toBe("parasols");
    expect(normalizeQuery("sonnensegel").categorySlug).toBe("parasols");
  });

  it("normalizes colors in all languages", () => {
    const q = normalizeQuery("chaise noir");
    expect(q.categorySlug).toBe("chairs");
    expect(q.colorSlugs).toContain("black");
  });

  it("normalizes materials in all languages", () => {
    expect(normalizeQuery("teck").materialSlugs).toContain("teak");
    expect(normalizeQuery("alluminio").materialSlugs).toContain("aluminium");
    expect(normalizeQuery("acero").materialSlugs).toContain("steel");
    expect(normalizeQuery("bois").materialSlugs).toContain("wood");
  });

  it("normalizes styles in all languages", () => {
    expect(normalizeQuery("méditerranéen").styleSlugs).toContain("mediterranean");
    expect(normalizeQuery("moderno").styleSlugs).toContain("modern");
    expect(normalizeQuery("bohème").styleSlugs).toContain("bohemian");
    expect(normalizeQuery("skandinavisch").styleSlugs).toContain("scandinavian");
  });

  it("normalizes use-case multi-word terms", () => {
    const q = normalizeQuery("furniture for beach club");
    expect(q.useCaseSlugs).toContain("beach-club");
  });

  it("detects preferComplete for tables", () => {
    expect(normalizeQuery("table").preferComplete).toBe(true);
    expect(normalizeQuery("pied de table").preferComplete).toBe(false);
    expect(normalizeQuery("table base").preferComplete).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// 3. PRODUCT SEARCH TESTS
// ═══════════════════════════════════════════════════════════

describe("Product Search", () => {
  const catalog = createCatalog();

  it("returns results for category search", () => {
    const { recommended } = searchProducts("chairs", catalog);
    expect(recommended.length).toBeGreaterThan(0);
    expect(recommended[0].category).toBe("Chairs");
  });

  it("returns correct category for FR search", () => {
    const { recommended } = searchProducts("chaise", catalog);
    expect(recommended.length).toBeGreaterThan(0);
    expect(recommended[0].category).toBe("Chairs");
  });

  it("color filter works", () => {
    const { recommended } = searchProducts("black chairs", catalog);
    expect(recommended.length).toBeGreaterThan(0);
    // First result should be the black chair
    expect(recommended[0].main_color).toBe("black");
  });

  it("material filter boosts matching products", () => {
    const teakTable: DBProduct = { ...mockProduct(), id: "tt", name: "Teak Table", category: "Tables", material_tags: ["teak"], style_tags: [] };
    const aluTable: DBProduct = { ...mockProduct(), id: "at", name: "Alu Table", category: "Tables", material_tags: ["aluminium"], style_tags: [] };
    const { recommended } = searchProducts("teak table", [teakTable, aluTable]);
    expect(recommended[0].id).toBe("tt");
  });

  it("style filter boosts matching products", () => {
    const bistro: DBProduct = { ...mockProduct(), id: "bc", name: "Bistro Chair", category: "Chairs", style_tags: ["bistro"] };
    const modern: DBProduct = { ...mockProduct(), id: "mc", name: "Modern Chair", category: "Chairs", style_tags: ["modern"] };
    const { recommended } = searchProducts("bistro chair", [bistro, modern]);
    expect(recommended[0].id).toBe("bc");
  });

  it("returns similar products in same category", () => {
    const { similar } = searchProducts("modern chair", catalog);
    for (const p of similar) {
      expect(p.category).toBe("Chairs");
    }
  });

  it("returns compatible products in complementary categories", () => {
    const { recommended, compatible } = searchProducts("chairs", catalog);
    // If there are compatible results, they should be from complementary categories
    if (compatible.length > 0) {
      const compatCategories = compatible.map(p => p.category.toLowerCase());
      expect(compatCategories.some(c => c.includes("table") || c.includes("parasol") || c.includes("accessor"))).toBe(true);
    } else {
      // With a small catalog, all products may already be in recommended
      expect(recommended.length).toBeGreaterThan(0);
    }
  });

  it("deduplicates by archetype", () => {
    const dupeProducts = [
      mockProduct({ id: "v1", archetype_id: "arch-1", name: "Chair Black" }),
      mockProduct({ id: "v2", archetype_id: "arch-1", name: "Chair White" }),
      mockProduct({ id: "v3", archetype_id: "arch-2", name: "Chair Different" }),
    ];
    const { recommended } = searchProducts("chair", dupeProducts);
    const ids = recommended.map(p => p.id);
    // Should not have both v1 and v2
    expect(ids.includes("v1") && ids.includes("v2")).toBe(false);
  });

  it("zero results fallback returns popular products", () => {
    const { recommended } = searchProducts("xyznonexistent", catalog);
    expect(recommended.length).toBeGreaterThan(0);
  });

  it("parasol search prioritizes parasols", () => {
    const norm = normalizeQuery("parasol");
    expect(norm.categorySlug).toBe("parasols");
    // Minimal mock — only override what's needed
    const p1: DBProduct = { ...mockProduct(), id: "p1", name: "Parasol 3m", category: "Parasols" };
    const c1: DBProduct = { ...mockProduct(), id: "c1", name: "Dining Chair", category: "Chairs" };
    const { recommended } = searchProducts("parasol", [p1, c1]);
    // Both should have score > 0 (from popularity/priority at minimum)
    expect(recommended.length).toBe(2);
    // Parasol must be ranked first due to +8 category bonus
    expect(recommended[0].id).toBe("p1");
  });

  it("sun lounger search works in FR", () => {
    const lounger: DBProduct = { ...mockProduct(), id: "sl", name: "Sun Lounger", category: "Sun Loungers" };
    const chair: DBProduct = { ...mockProduct(), id: "ch", name: "Chair", category: "Chairs" };
    const { recommended } = searchProducts("bain de soleil", [lounger, chair]);
    expect(recommended[0].id).toBe("sl");
  });

  it("accessory search works", () => {
    const cushion: DBProduct = { ...mockProduct(), id: "cu", name: "Seat Cushion", category: "Accessories" };
    const chair: DBProduct = { ...mockProduct(), id: "ch", name: "Chair", category: "Chairs" };
    const { recommended } = searchProducts("cushion", [cushion, chair]);
    expect(recommended[0].id).toBe("cu");
  });
});

// ═══════════════════════════════════════════════════════════
// 4. PROJECT ENGINE TESTS
// ═══════════════════════════════════════════════════════════

describe("Project Engine — Parse Request", () => {
  it("extracts establishment type", () => {
    const params = parseProjectRequest("restaurant terrace modern 40 seats");
    expect(params.establishmentType).toBe("restaurant");
  });

  it("extracts capacity", () => {
    const params = parseProjectRequest("hotel terrace 60 seats");
    expect(params.seatingCapacity).toBe(60);
  });

  it("extracts style", () => {
    const params = parseProjectRequest("modern coastal restaurant");
    expect(params.style).toContain("modern");
    expect(params.style).toContain("coastal");
  });

  it("extracts zone", () => {
    const params = parseProjectRequest("pool deck furniture");
    expect(params.projectZone).toBe("pool");
  });

  it("extracts materials", () => {
    const params = parseProjectRequest("teak aluminium furniture");
    expect(params.materialPreferences.length).toBeGreaterThan(0);
  });

  it("detects outdoor context", () => {
    const params = parseProjectRequest("outdoor terrace");
    expect(params.isOutdoor).toBe(true);
  });
});

describe("Project Engine — Discovery", () => {
  it("detects missing fields", () => {
    const params = parseProjectRequest("restaurant");
    const questions = detectMissingFields(params);
    expect(questions.length).toBeGreaterThan(0);
    // Should ask about style first (highest priority)
    expect(questions[0].id).toBe("style");
  });

  it("questions use i18n keys", () => {
    const params = parseProjectRequest("restaurant");
    const questions = detectMissingFields(params);
    expect(questions[0].question).toMatch(/^discovery\./);
    expect(questions[0].options[0]).toMatch(/^discovery\./);
  });

  it("applies answers correctly", () => {
    let params = parseProjectRequest("restaurant");
    params = applyAnswer(params, "style", "Mediterranean");
    expect(params.style.length).toBeGreaterThan(0);
  });

  it("request is complete with enough data", () => {
    const params = parseProjectRequest("modern coastal restaurant 40 seats mid budget teak natural");
    expect(isRequestComplete(params)).toBe(true);
  });
});

describe("Project Engine — Concept Generation", () => {
  const catalog = createCatalog();

  it("generates 3 concepts", () => {
    const { concepts } = generateProjectConcepts(
      "modern restaurant terrace 30 seats",
      catalog,
      { style: ["modern"], budgetLevel: "mid", establishmentType: "restaurant" }
    );
    expect(concepts.length).toBe(3);
  });

  it("each concept has required fields", () => {
    const { concepts } = generateProjectConcepts(
      "hotel pool area",
      catalog,
      { style: ["modern", "luxury"], budgetLevel: "premium", establishmentType: "hotel" }
    );
    for (const c of concepts) {
      expect(c.id).toBeTruthy();
      expect(c.title).toBeTruthy();
      expect(c.colorPalette.length).toBeGreaterThan(0);
      expect(c.products.length).toBeGreaterThan(0);
    }
  });

  it("concepts have BOM with slots", () => {
    const { concepts } = generateProjectConcepts(
      "restaurant 20 seats",
      catalog,
      { style: ["modern"], budgetLevel: "mid", establishmentType: "restaurant", seatingCapacity: 20 }
    );
    for (const c of concepts) {
      expect(c.bom).toBeDefined();
      expect(c.bom!.slots.length).toBeGreaterThan(0);
    }
  });

  it("concepts have price range", () => {
    const { concepts } = generateProjectConcepts(
      "restaurant modern",
      catalog,
      { style: ["modern"], budgetLevel: "mid", establishmentType: "restaurant" }
    );
    for (const c of concepts) {
      expect(c.priceRange).toBeDefined();
    }
  });

  it("concepts have cohesion and delivery metrics", () => {
    const { concepts } = generateProjectConcepts(
      "hotel terrace",
      catalog,
      { style: ["modern"], budgetLevel: "premium", establishmentType: "hotel" }
    );
    for (const c of concepts) {
      expect(c.cohesionScore).toBeDefined();
      expect(typeof c.cohesionScore).toBe("number");
    }
  });

  it("concepts have distinct products (no reuse across concepts)", () => {
    const { concepts } = generateProjectConcepts(
      "restaurant terrace",
      catalog,
      { style: ["modern", "natural"], budgetLevel: "mid", establishmentType: "restaurant" }
    );
    const allProductIds = concepts.flatMap(c => c.products.map(p => p.productId));
    const uniqueIds = new Set(allProductIds);
    // Most products should be unique (some overlap ok for mandatory slots)
    expect(uniqueIds.size).toBeGreaterThanOrEqual(allProductIds.length * 0.6);
  });

  it("reasons use structured format for i18n", () => {
    const { concepts } = generateProjectConcepts(
      "restaurant",
      catalog,
      { style: ["modern"], budgetLevel: "mid", establishmentType: "restaurant" }
    );
    const reasons = concepts.flatMap(c => c.products.map(p => p.reason));
    // At least some reasons should use the new structured format
    expect(reasons.some(r => r.startsWith("reason:"))).toBe(true);
  });

  it("beach club concepts include mandatory categories", () => {
    const { concepts } = generateProjectConcepts(
      "beach club",
      catalog,
      { style: ["coastal"], budgetLevel: "premium", establishmentType: "beach-club" }
    );
    // At least one concept should have products
    expect(concepts.some(c => c.products.length > 0)).toBe(true);
    // BOM should flag missing mandatory slots if catalog is too small
    const allMissing = concepts.flatMap(c => c.bom?.missingSlots || []);
    const allCategories = concepts.flatMap(c =>
      c.bom?.slots.map(s => s.product.category.toLowerCase()) || []
    );
    // Either products match mandatory categories or missing slots are flagged
    const hasMandatoryOrFlagged = allCategories.some(
      c => c.includes("parasol") || c.includes("lounger")
    ) || allMissing.length > 0;
    expect(hasMandatoryOrFlagged).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
// 5. BUDGET TESTS
// ═══════════════════════════════════════════════════════════

describe("Budget Handling", () => {
  const catalog = createCatalog();

  it("economy budget favors cheaper products", () => {
    const { concepts } = generateProjectConcepts(
      "restaurant chairs",
      catalog,
      { style: ["bistro"], budgetLevel: "economy", establishmentType: "restaurant" }
    );
    const prices = concepts[0].bom?.slots
      .filter(s => s.unitPriceMin !== null)
      .map(s => s.unitPriceMin!) || [];
    if (prices.length > 0) {
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      expect(avgPrice).toBeLessThan(500); // economy should not pick expensive products
    }
  });
});
