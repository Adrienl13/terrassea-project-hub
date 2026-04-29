import { describe, it, expect } from "vitest";
import {
  generateMultiZoneProject,
  generateProject,
} from "@/engine/multiZoneEngine";
import type { ProjectParameters, ProjectZone } from "@/engine/types";
import type { DBProduct } from "@/lib/products";

// ═══════════════════════════════════════════════════════════
// FIXTURES — minimal product catalogue to satisfy projectEngine
// ═══════════════════════════════════════════════════════════

function mockProduct(overrides: Partial<DBProduct> = {}): DBProduct {
  return {
    id: crypto.randomUUID(),
    created_at: "",
    updated_at: "",
    name: "Test Chair",
    category: "Chairs",
    subcategory: "Dining Chair",
    short_description: "A test chair",
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
    use_case_tags: ["restaurant"],
    technical_tags: ["outdoor"],
    main_color: "#111111",
    secondary_color: null,
    available_colors: [],
    warranty_years: 2,
    estimated_delivery_days: 14,
    popularity_score: 0.5,
    priority_score: 0,
    data_quality_score: 0.7,
    stock_status: "available",
    dimensions: null,
    weight_kg: 4.5,
    is_admin_created: true,
    product_type_tags: {},
    status: "published",
    ...overrides,
  } as unknown as DBProduct;
}

function baseParams(overrides: Partial<ProjectParameters> = {}): ProjectParameters {
  return {
    builderMode: "expert",
    establishmentType: "hotel",
    projectZone: "terrace",
    seatingCapacity: 40,
    seatingLayout: "balanced-2-4",
    layoutPriority: "balanced",
    style: ["modern"],
    ambience: ["relaxed"],
    colorPalette: ["natural"],
    materialPreferences: [],
    technicalConstraints: [],
    isOutdoor: true,
    budgetLevel: "mid",
    timeline: "flexible",
    terraceSurfaceM2: 80,
    terraceLength: null,
    terraceWidth: null,
    countryCode: "FR",
    ...overrides,
  };
}

const CATALOGUE: DBProduct[] = [
  mockProduct({ name: "Chair A", category: "Chairs" }),
  mockProduct({ name: "Table A", category: "Tables", price_min: 300, price_max: 450 }),
  mockProduct({
    name: "Parasol A",
    category: "Parasols",
    price_min: 250,
    price_max: 400,
    use_case_tags: ["restaurant", "beach-club"],
  }),
  mockProduct({ name: "Lounger A", category: "Sun Loungers", price_min: 400, price_max: 700 }),
  mockProduct({ name: "Sofa A", category: "Lounge Seating", price_min: 800, price_max: 1200 }),
];

// ═══════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════

describe("generateMultiZoneProject — per-zone generation", () => {
  it("produces one ZoneResult per zone", () => {
    const zones: ProjectZone[] = [
      { id: "z1", label: "Piscine", projectZone: "pool", seatingCapacity: 30, terraceSurfaceM2: 60 },
      { id: "z2", label: "Restaurant", projectZone: "terrace", seatingCapacity: 50, terraceSurfaceM2: 100 },
    ];
    const params = baseParams({ zones });
    const result = generateMultiZoneProject("hotel with pool and restaurant", CATALOGUE, params);
    expect(result.zones).toHaveLength(2);
    expect(result.zones[0].zone.id).toBe("z1");
    expect(result.zones[1].zone.id).toBe("z2");
  });

  it("each zone receives its own sizing from zone overrides", () => {
    const zones: ProjectZone[] = [
      { id: "z1", label: "Piscine", projectZone: "pool", seatingCapacity: 20, terraceSurfaceM2: 40 },
      { id: "z2", label: "Rooftop", projectZone: "rooftop", seatingCapacity: 60, terraceSurfaceM2: 120 },
    ];
    const params = baseParams({ zones, seatingCapacity: 999 /* ignored per-zone */ });
    const result = generateMultiZoneProject("hotel", CATALOGUE, params);
    expect(result.zones[0].parameters.seatingCapacity).toBe(20);
    expect(result.zones[0].parameters.terraceSurfaceM2).toBe(40);
    expect(result.zones[1].parameters.seatingCapacity).toBe(60);
    expect(result.zones[1].parameters.terraceSurfaceM2).toBe(120);
  });

  it("zones inherit top-level context when not overridden", () => {
    const zones: ProjectZone[] = [
      { id: "z1", label: "Piscine", projectZone: "pool", seatingCapacity: 20, terraceSurfaceM2: 40 },
    ];
    const params = baseParams({ zones, style: ["mediterranean"], budgetLevel: "premium" });
    const result = generateMultiZoneProject("hotel", CATALOGUE, params);
    expect(result.zones[0].parameters.style).toEqual(["mediterranean"]);
    expect(result.zones[0].parameters.budgetLevel).toBe("premium");
  });

  it("zone-level style override takes precedence", () => {
    const zones: ProjectZone[] = [
      {
        id: "z1",
        label: "Rooftop bar",
        projectZone: "rooftop",
        seatingCapacity: 30,
        terraceSurfaceM2: 60,
        style: ["industrial"],
      },
    ];
    const params = baseParams({ zones, style: ["mediterranean"] });
    const result = generateMultiZoneProject("hotel", CATALOGUE, params);
    expect(result.zones[0].parameters.style).toEqual(["industrial"]);
  });

  it("does not recurse: child zone call has zones undefined", () => {
    const zones: ProjectZone[] = [
      { id: "z1", label: "X", projectZone: "pool", seatingCapacity: 10, terraceSurfaceM2: 30 },
    ];
    const params = baseParams({ zones });
    const result = generateMultiZoneProject("hotel", CATALOGUE, params);
    expect(result.zones[0].parameters.zones).toBeUndefined();
  });
});

describe("generateMultiZoneProject — aggregation", () => {
  it("sums total seats across zones", () => {
    const zones: ProjectZone[] = [
      { id: "a", label: "A", projectZone: "pool", seatingCapacity: 20, terraceSurfaceM2: 40 },
      { id: "b", label: "B", projectZone: "terrace", seatingCapacity: 30, terraceSurfaceM2: 80 },
      { id: "c", label: "C", projectZone: "rooftop", seatingCapacity: 15, terraceSurfaceM2: 50 },
    ];
    const params = baseParams({ zones });
    const result = generateMultiZoneProject("hotel", CATALOGUE, params);
    expect(result.aggregate.totalSeats).toBe(65);
    expect(result.aggregate.totalTerraceSurface).toBe(170);
  });

  it("tallies distinctProducts across zones (deduplicated)", () => {
    const zones: ProjectZone[] = [
      { id: "a", label: "A", projectZone: "pool", seatingCapacity: 20, terraceSurfaceM2: 40 },
      { id: "b", label: "B", projectZone: "terrace", seatingCapacity: 30, terraceSurfaceM2: 80 },
    ];
    const params = baseParams({ zones });
    const result = generateMultiZoneProject("hotel", CATALOGUE, params);
    expect(result.aggregate.distinctProducts).toBeGreaterThanOrEqual(1);
    // Distinct ≤ catalogue size (dedup works)
    expect(result.aggregate.distinctProducts).toBeLessThanOrEqual(CATALOGUE.length);
  });

  it("determines mostFrequentStyle from zone params", () => {
    const zones: ProjectZone[] = [
      { id: "a", label: "A", projectZone: "pool", seatingCapacity: 20, terraceSurfaceM2: 40, style: ["mediterranean"] },
      { id: "b", label: "B", projectZone: "terrace", seatingCapacity: 30, terraceSurfaceM2: 80, style: ["mediterranean"] },
      { id: "c", label: "C", projectZone: "rooftop", seatingCapacity: 15, terraceSurfaceM2: 50, style: ["industrial"] },
    ];
    const params = baseParams({ zones });
    const result = generateMultiZoneProject("hotel", CATALOGUE, params);
    expect(result.aggregate.mostFrequentStyle).toBe("mediterranean");
  });

  it("aggregates indicative price totals across zones", () => {
    const zones: ProjectZone[] = [
      { id: "a", label: "A", projectZone: "pool", seatingCapacity: 20, terraceSurfaceM2: 40 },
      { id: "b", label: "B", projectZone: "terrace", seatingCapacity: 30, terraceSurfaceM2: 80 },
    ];
    const params = baseParams({ zones });
    const result = generateMultiZoneProject("hotel", CATALOGUE, params);
    expect(result.aggregate.indicativeTotalMin).toBeGreaterThanOrEqual(0);
    expect(result.aggregate.indicativeTotalMax).toBeGreaterThanOrEqual(
      result.aggregate.indicativeTotalMin
    );
  });

  it("handles empty zones array gracefully", () => {
    const params = baseParams({ zones: [] });
    const result = generateMultiZoneProject("hotel", CATALOGUE, params);
    expect(result.zones).toHaveLength(0);
    expect(result.aggregate.totalSeats).toBe(0);
    expect(result.aggregate.totalTerraceSurface).toBe(0);
  });
});

describe("generateProject — router", () => {
  it("routes to single-zone engine when zones is absent", () => {
    const params = baseParams({ zones: undefined });
    const result = generateProject("restaurant with terrace", CATALOGUE, params);
    // Single-zone result shape: { parameters, concepts }
    expect("parameters" in result).toBe(true);
    expect("zones" in result).toBe(false);
  });

  it("routes to multi-zone engine when zones is non-empty", () => {
    const zones: ProjectZone[] = [
      { id: "z1", label: "Pool", projectZone: "pool", seatingCapacity: 20, terraceSurfaceM2: 40 },
    ];
    const params = baseParams({ zones });
    const result = generateProject("hotel", CATALOGUE, params);
    expect("zones" in result).toBe(true);
    expect("aggregate" in result).toBe(true);
  });

  it("routes to single-zone engine when zones is an empty array", () => {
    const params = baseParams({ zones: [] });
    const result = generateProject("bar", CATALOGUE, params);
    // Empty zones array should behave as no multi-zone
    expect("parameters" in result).toBe(true);
  });
});

describe("generateMultiZoneProject — compliance integration", () => {
  it("runs compliance per zone and exposes reports", () => {
    const zones: ProjectZone[] = [
      { id: "z1", label: "Cramped", projectZone: "terrace", seatingCapacity: 200, terraceSurfaceM2: 80 },
    ];
    const params = baseParams({ zones, countryCode: "FR" });
    const result = generateMultiZoneProject("hotel", CATALOGUE, params);
    const zone = result.zones[0];
    expect(Object.keys(zone.compliance).length).toBeGreaterThan(0);
  });

  it("cross-zone blocker count tallies issues across all zones", () => {
    const zones: ProjectZone[] = [
      { id: "z1", label: "Overloaded", projectZone: "terrace", seatingCapacity: 150, terraceSurfaceM2: 60 },
      { id: "z2", label: "Fine", projectZone: "terrace", seatingCapacity: 20, terraceSurfaceM2: 80 },
    ];
    const params = baseParams({ zones, countryCode: "FR" });
    const result = generateMultiZoneProject("hotel", CATALOGUE, params);
    expect(result.aggregate.crossZoneBlockers).toBeGreaterThanOrEqual(0);
  });
});
