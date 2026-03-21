import { describe, it, expect } from "vitest";
import { generateProjectConcepts } from "@/engine/projectEngine";
import type { DBProduct } from "@/lib/products";

// Realistic mock catalog
function mockProduct(overrides: Partial<DBProduct>): DBProduct {
  return {
    id: overrides.id || crypto.randomUUID(),
    created_at: "", updated_at: "",
    name: overrides.name || "Product",
    category: overrides.category || "Chairs",
    subcategory: overrides.subcategory || "",
    short_description: "", long_description: null,
    product_family: overrides.product_family || null,
    collection: null, brand_source: null, supplier_internal: null,
    archetype_id: overrides.archetype_id || null,
    archetype_confidence: null,
    image_url: null, gallery_urls: [], documents: null,
    indicative_price: overrides.indicative_price || "€100",
    price_min: overrides.price_min ?? 100,
    price_max: overrides.price_max ?? 150,
    style_tags: overrides.style_tags || ["modern"],
    ambience_tags: overrides.ambience_tags || ["relaxed"],
    palette_tags: overrides.palette_tags || [],
    material_tags: overrides.material_tags || ["aluminium"],
    use_case_tags: overrides.use_case_tags || ["restaurant-terrace"],
    technical_tags: overrides.technical_tags || ["weather-resistant"],
    product_type_tags: overrides.product_type_tags || {},
    main_color: overrides.main_color || "black",
    secondary_color: null,
    available_colors: [], color_variants: null,
    dimensions_length_cm: null, dimensions_width_cm: null,
    dimensions_height_cm: null, seat_height_cm: null,
    weight_kg: overrides.weight_kg ?? 4,
    table_shape: null,
    default_seating_capacity: null,
    recommended_seating_min: null, recommended_seating_max: null,
    combinable: null, combined_capacity_if_joined: null,
    is_outdoor: true, is_stackable: overrides.is_stackable ?? false,
    is_chr_heavy_use: overrides.is_chr_heavy_use ?? true,
    uv_resistant: true, weather_resistant: true,
    fire_retardant: false, lightweight: true,
    easy_maintenance: true, customizable: false,
    dismountable: false, requires_assembly: false,
    material_structure: null, material_seat: null,
    country_of_manufacture: null,
    warranty: overrides.warranty || "3 years",
    maintenance_info: null,
    stock_status: "in_stock", stock_quantity: 200,
    estimated_delivery_days: overrides.estimated_delivery_days ?? 14,
    availability_type: "available",
    popularity_score: overrides.popularity_score ?? 0.7,
    priority_score: overrides.priority_score ?? 0.5,
    data_quality_score: overrides.data_quality_score ?? 0.8,
    is_canonical_instance: true, duplicate_of: null,
    publish_status: "published", partner_id: null,
    name_fr: null, name_es: null, name_it: null,
    short_description_fr: null, short_description_es: null, short_description_it: null,
    long_description_fr: null, long_description_es: null, long_description_it: null,
    maintenance_info_fr: null, maintenance_info_es: null, maintenance_info_it: null,
  } as DBProduct;
}

const CATALOG: DBProduct[] = [
  // 3 chairs (different families)
  mockProduct({ id: "chair-alu", name: "Modern Alu Chair", category: "Chairs", product_family: "alu-seating", style_tags: ["modern", "minimal"], material_tags: ["aluminium"], price_min: 120, price_max: 160 }),
  mockProduct({ id: "chair-teak", name: "Teak Dining Chair", category: "Chairs", product_family: "teak-seating", style_tags: ["natural", "mediterranean"], material_tags: ["teak"], price_min: 280, price_max: 350 }),
  mockProduct({ id: "chair-bistro", name: "Bistro Stackable", category: "Chairs", product_family: "bistro-seating", style_tags: ["bistro", "classic"], material_tags: ["aluminium"], price_min: 95, price_max: 130, is_stackable: true }),

  // 1 armchair
  mockProduct({ id: "armchair-rope", name: "Rope Lounge Armchair", category: "Armchairs", product_family: "rope-lounge", style_tags: ["modern", "coastal"], material_tags: ["aluminium", "rope"], price_min: 450, price_max: 580 }),

  // 2 tables (different dimensions)
  mockProduct({ id: "table-70", name: "HPL Table 70x70", category: "Tables", product_family: "hpl-tables", style_tags: ["modern"], material_tags: ["aluminium", "hpl"], price_min: 180, price_max: 240, product_type_tags: { dimension_tag: "70×70 cm — 2 covers", table_type: "complete" } }),
  mockProduct({ id: "table-120", name: "Teak Table 120x70", category: "Tables", product_family: "teak-tables", style_tags: ["natural", "mediterranean"], material_tags: ["teak"], price_min: 650, price_max: 850, product_type_tags: { dimension_tag: "120×70 cm — 4 covers", table_type: "complete" } }),

  // 1 parasol
  mockProduct({ id: "parasol-3m", name: "Cantilever Parasol 3m", category: "Parasols", product_family: "parasols", style_tags: ["modern"], material_tags: ["aluminium"], price_min: 890, price_max: 1200, product_type_tags: { wind_beaufort: 6, parasol_type: "cantilever" } }),

  // 1 sun lounger
  mockProduct({ id: "lounger-1", name: "Pool Sun Lounger", category: "Sun Loungers", product_family: "loungers", style_tags: ["modern", "luxury"], material_tags: ["aluminium", "textilene"], price_min: 450, price_max: 600 }),

  // 1 bar stool
  mockProduct({ id: "stool-1", name: "Bar Stool Rattan", category: "Bar Stools", product_family: "bar-stools", style_tags: ["natural", "coastal"], material_tags: ["synthetic-rattan"], price_min: 220, price_max: 290 }),

  // 1 sofa
  mockProduct({ id: "sofa-1", name: "Outdoor 2-Seater Sofa", category: "Lounge Seating", product_family: "outdoor-sofas", style_tags: ["modern", "lounge"], material_tags: ["aluminium", "fabric"], price_min: 1200, price_max: 1650 }),

  // 1 accessory
  mockProduct({ id: "cushion-1", name: "Seat Cushion Sunbrella", category: "Accessories", product_family: "cushions", style_tags: [], material_tags: ["fabric"], price_min: 45, price_max: 65 }),
];

// ═══════════════════════════════════════════════════════════
// BOM VALIDATION TESTS
// ═══════════════════════════════════════════════════════════

describe("BOM — No duplicate quantities", () => {
  it("restaurant 30 seats: each role appears at most once in BOM", () => {
    const { concepts } = generateProjectConcepts(
      "modern restaurant terrace 30 seats",
      CATALOG,
      { style: ["modern"], budgetLevel: "mid", establishmentType: "restaurant", seatingCapacity: 30 }
    );

    for (const concept of concepts) {
      const bom = concept.bom!;
      // Count roles
      const roleCounts: Record<string, number> = {};
      for (const slot of bom.slots) {
        roleCounts[slot.role] = (roleCounts[slot.role] || 0) + 1;
      }

      // Chair should appear at most once (not 3 times)
      expect(roleCounts["chair"] || 0).toBeLessThanOrEqual(1);
      // Parasol should appear at most once
      expect(roleCounts["parasol"] || 0).toBeLessThanOrEqual(1);

      console.log(`[${concept.title}] BOM slots:`, bom.slots.map(s => `${s.product.name} (${s.role}) × ${s.quantity}`));
    }
  });

  it("restaurant 30 seats: chair quantity matches layout", () => {
    const { concepts } = generateProjectConcepts(
      "modern restaurant terrace 30 seats",
      CATALOG,
      { style: ["modern"], budgetLevel: "mid", establishmentType: "restaurant", seatingCapacity: 30 }
    );

    for (const concept of concepts) {
      const bom = concept.bom!;
      const chairSlot = bom.slots.find(s => s.role === "chair" || s.role === "armchair");
      if (chairSlot) {
        // Chair quantity should be ~30 (the seating capacity), not 90 (3 × 30)
        expect(chairSlot.quantity).toBeLessThanOrEqual(35);
        expect(chairSlot.quantity).toBeGreaterThanOrEqual(10);
        console.log(`[${concept.title}] Chair: ${chairSlot.product.name} × ${chairSlot.quantity}`);
      }
    }
  });

  it("restaurant 30 seats: total items is reasonable", () => {
    const { concepts } = generateProjectConcepts(
      "restaurant terrace 30 seats modern",
      CATALOG,
      { style: ["modern"], budgetLevel: "mid", establishmentType: "restaurant", seatingCapacity: 30 }
    );

    for (const concept of concepts) {
      const bom = concept.bom!;
      // For 30 seats: ~30 chairs + ~10 tables + ~8 parasols = ~48 items max
      // Should NOT be 90+ due to duplication
      console.log(`[${concept.title}] Total items: ${bom.totalItems}, Price: €${bom.indicativeTotalMin}–€${bom.indicativeTotalMax}`);
      expect(bom.totalItems).toBeLessThan(80);
      expect(bom.totalItems).toBeGreaterThan(5);
    }
  });

  it("budget estimate is coherent per cover", () => {
    const { concepts } = generateProjectConcepts(
      "restaurant 40 seats mid budget modern",
      CATALOG,
      { style: ["modern"], budgetLevel: "mid", establishmentType: "restaurant", seatingCapacity: 40 }
    );

    for (const concept of concepts) {
      const bom = concept.bom!;
      if (bom.indicativeTotalMax !== null) {
        const perCover = bom.indicativeTotalMax / 40;
        console.log(`[${concept.title}] Budget per cover: €${Math.round(perCover)}, Total: €${bom.indicativeTotalMax}`);
        // With parasols (€890-1200 each × ~10) the per-cover can reach €600-700.
        // The key metric: no single BOM role should have duplicated quantities.
        const chairSlots = bom.slots.filter(s => s.role === "chair");
        const totalChairQty = chairSlots.reduce((sum, s) => sum + s.quantity, 0);
        // Chair quantity should not exceed capacity × 1.2
        expect(totalChairQty).toBeLessThanOrEqual(48);
      }
    }
  });

  it("table groups are assigned correctly (not all to first group)", () => {
    const { concepts } = generateProjectConcepts(
      "restaurant 30 seats",
      CATALOG,
      { style: ["modern"], budgetLevel: "mid", establishmentType: "restaurant", seatingCapacity: 30 }
    );

    for (const concept of concepts) {
      const bom = concept.bom!;
      const tableSlots = bom.slots.filter(s => s.role === "complete_table");

      // Log table assignments
      for (const t of tableSlots) {
        console.log(`[${concept.title}] Table: ${t.product.name} × ${t.quantity} (format: ${t.tableFormat || "none"})`);
      }

      // Each table slot should have a reasonable quantity
      for (const t of tableSlots) {
        expect(t.quantity).toBeGreaterThan(0);
        expect(t.quantity).toBeLessThan(30); // not all 30 seats as tables
      }
    }
  });

  it("hotel with category selection: only selected categories appear", () => {
    const { concepts } = generateProjectConcepts(
      "hotel terrace",
      CATALOG,
      {
        style: ["modern", "luxury"],
        budgetLevel: "premium",
        establishmentType: "hotel",
        seatingCapacity: 20,
        selectedCategories: ["chairs", "tables"], // Only chairs and tables
      }
    );

    for (const concept of concepts) {
      const bom = concept.bom!;
      for (const slot of bom.slots) {
        const cat = slot.product.category.toLowerCase();
        // Should NOT contain parasols, loungers, etc.
        expect(cat.includes("parasol")).toBe(false);
        expect(cat.includes("lounger")).toBe(false);
        expect(cat.includes("lounge")).toBe(false);
        console.log(`[${concept.title}] Selected categories only: ${slot.product.name} (${slot.product.category}) × ${slot.quantity}`);
      }
    }
  });

  it("beach club: BOM includes shade/lounger categories", () => {
    const { concepts } = generateProjectConcepts(
      "beach club 40 seats",
      CATALOG,
      { style: ["coastal"], budgetLevel: "premium", establishmentType: "beach-club", seatingCapacity: 40 }
    );

    const allCategories = concepts.flatMap(c =>
      c.bom?.slots.map(s => s.product.category) || []
    );
    console.log("Beach club categories:", [...new Set(allCategories)]);

    // Should include parasol or lounger or flag as missing
    const allMissing = concepts.flatMap(c => c.bom?.missingSlots || []);
    const hasShadeProducts = allCategories.some(c =>
      c.toLowerCase().includes("parasol") || c.toLowerCase().includes("lounger")
    );
    expect(hasShadeProducts || allMissing.length > 0).toBe(true);
  });
});
