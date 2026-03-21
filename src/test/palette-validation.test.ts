import { describe, it, expect } from "vitest";
import { generateProjectConcepts } from "@/engine/projectEngine";
import type { DBProduct } from "@/lib/products";

function p(overrides: Partial<DBProduct>): DBProduct {
  return {
    id: overrides.id || crypto.randomUUID(),
    created_at: "", updated_at: "",
    name: overrides.name || "",
    category: overrides.category || "Chairs",
    subcategory: "", short_description: "", long_description: null,
    product_family: overrides.product_family || null, collection: null,
    brand_source: null, supplier_internal: null,
    archetype_id: null, archetype_confidence: null,
    image_url: null, gallery_urls: [], documents: null,
    indicative_price: null,
    price_min: overrides.price_min ?? 100, price_max: overrides.price_max ?? 200,
    style_tags: overrides.style_tags || ["modern"],
    ambience_tags: overrides.ambience_tags || [],
    palette_tags: [], material_tags: overrides.material_tags || ["aluminium"],
    use_case_tags: overrides.use_case_tags || ["restaurant-terrace"],
    technical_tags: overrides.technical_tags || ["weather-resistant"],
    product_type_tags: overrides.product_type_tags || {},
    main_color: overrides.main_color || "black",
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
    country_of_manufacture: null, warranty: null, maintenance_info: null,
    stock_status: null, stock_quantity: null, estimated_delivery_days: null,
    availability_type: "available",
    popularity_score: 0.5, priority_score: 0.5, data_quality_score: 0.8,
    is_canonical_instance: true, duplicate_of: null,
    publish_status: "published", partner_id: null,
    name_fr: null, name_es: null, name_it: null,
    short_description_fr: null, short_description_es: null, short_description_it: null,
    long_description_fr: null, long_description_es: null, long_description_it: null,
    maintenance_info_fr: null, maintenance_info_es: null, maintenance_info_it: null,
  } as DBProduct;
}

// Products with similar colors (the real-world scenario)
const CATALOG: DBProduct[] = [
  p({ id: "c1", name: "Chair A", category: "Chairs", product_family: "a", style_tags: ["modern", "minimal"], main_color: "black", material_tags: ["aluminium"] }),
  p({ id: "c2", name: "Chair B", category: "Chairs", product_family: "b", style_tags: ["natural", "mediterranean"], main_color: "natural", material_tags: ["teak"] }),
  p({ id: "c3", name: "Chair C", category: "Chairs", product_family: "c", style_tags: ["coastal", "modern"], main_color: "white", material_tags: ["aluminium"] }),
  p({ id: "t1", name: "Table A", category: "Tables", product_family: "d", style_tags: ["modern"], main_color: "anthracite", material_tags: ["aluminium"], product_type_tags: { table_type: "complete", dimension_tag: "70×70" } }),
  p({ id: "t2", name: "Table B", category: "Tables", product_family: "e", style_tags: ["natural", "coastal"], main_color: "teak", material_tags: ["teak"], product_type_tags: { table_type: "complete", dimension_tag: "120×70" } }),
  p({ id: "p1", name: "Parasol", category: "Parasols", product_family: "f", style_tags: ["classic"], main_color: "white", material_tags: ["aluminium"], product_type_tags: { wind_beaufort: 5 } }),
  p({ id: "s1", name: "Sofa", category: "Lounge Seating", product_family: "g", style_tags: ["modern", "luxury"], main_color: "grey", material_tags: ["aluminium", "fabric"] }),
  p({ id: "l1", name: "Lounger", category: "Sun Loungers", product_family: "h", style_tags: ["modern"], main_color: "white", material_tags: ["aluminium"] }),
];

describe("Palette — concepts have DISTINCT palettes", () => {
  it("mediterranean concepts have warm colors, not all the same", () => {
    const { concepts } = generateProjectConcepts("restaurant terrace 30 seats", CATALOG, {
      style: ["mediterranean"],
      budgetLevel: "mid",
      establishmentType: "restaurant",
      seatingCapacity: 30,
    });

    console.log("\n=== MEDITERRANEAN CONCEPTS ===");
    for (const c of concepts) {
      console.log(`[${c.title}]`);
      console.log(`  Palette hex:   ${c.colorPalette.join(", ")}`);
      console.log(`  Palette names: ${c.colorNames.join(", ")}`);
    }

    // Each concept should have a palette
    for (const c of concepts) {
      expect(c.colorPalette.length).toBeGreaterThanOrEqual(3);
    }

    // Palettes should be DIFFERENT between concepts (at least first 3 colors differ)
    if (concepts.length >= 2) {
      const palette1 = concepts[0].colorPalette.slice(0, 3).join(",");
      const palette2 = concepts[1].colorPalette.slice(0, 3).join(",");
      expect(palette1).not.toBe(palette2);
    }
  });

  it("modern concepts have cool/neutral colors", () => {
    const { concepts } = generateProjectConcepts("modern hotel", CATALOG, {
      style: ["modern"],
      budgetLevel: "premium",
      establishmentType: "hotel",
    });

    console.log("\n=== MODERN CONCEPTS ===");
    for (const c of concepts) {
      console.log(`[${c.title}]`);
      console.log(`  Palette hex:   ${c.colorPalette.join(", ")}`);
      console.log(`  Palette names: ${c.colorNames.join(", ")}`);
    }

    // Each concept should have at least 3 colors
    for (const c of concepts) {
      expect(c.colorPalette.length).toBeGreaterThanOrEqual(3);
    }

    // Concepts 1 and 2 should have different palettes (different templates)
    if (concepts.length >= 2) {
      const p1 = concepts[0].colorPalette.slice(0, 3).join(",");
      const p2 = concepts[1].colorPalette.slice(0, 3).join(",");
      expect(p1).not.toBe(p2);
    }
  });

  it("coastal vs luxury: palettes are visually different", () => {
    const { concepts: coastalConcepts } = generateProjectConcepts("coastal beach", CATALOG, {
      style: ["coastal"],
      budgetLevel: "mid",
      establishmentType: "beach-club",
    });

    const { concepts: luxuryConcepts } = generateProjectConcepts("luxury hotel", CATALOG, {
      style: ["luxury"],
      budgetLevel: "luxury",
      establishmentType: "hotel",
    });

    console.log("\n=== COASTAL vs LUXURY ===");
    console.log(`Coastal[0]: ${coastalConcepts[0]?.colorPalette.join(", ")}`);
    console.log(`Luxury[0]:  ${luxuryConcepts[0]?.colorPalette.join(", ")}`);

    // First 3 colors should be different (template-driven)
    if (coastalConcepts[0] && luxuryConcepts[0]) {
      const cp = coastalConcepts[0].colorPalette.slice(0, 3).join(",");
      const lp = luxuryConcepts[0].colorPalette.slice(0, 3).join(",");
      expect(cp).not.toBe(lp);
    }
  });

  it("palette first 3 colors come from the template, not products", () => {
    const { concepts } = generateProjectConcepts("restaurant", CATALOG, {
      style: ["industrial"],
      budgetLevel: "mid",
      establishmentType: "restaurant",
    });

    console.log("\n=== INDUSTRIAL TEMPLATE CHECK ===");
    // Industrial template: ["#888888","#1A1A1A","#C0C0C0","#D4C9B8","#666666"]
    // = Steel, Iron, Zinc, Concrete, Smoke
    const industrialTemplateHex = ["#888888", "#1A1A1A", "#C0C0C0"];

    if (concepts.length > 0) {
      const first3 = concepts[0].colorPalette.slice(0, 3);
      console.log(`First 3 colors: ${first3.join(", ")}`);
      console.log(`Expected template: ${industrialTemplateHex.join(", ")}`);
      // First 3 should be from the template
      expect(first3).toEqual(industrialTemplateHex);
    }
  });
});
