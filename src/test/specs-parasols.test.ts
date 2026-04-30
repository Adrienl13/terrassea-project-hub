import { describe, it, expect } from "vitest";
import { parasolSpecsSchema, defaultParasolSpecs } from "@/components/products/specs";
import {
  FABRIC_BRAND_SLUGS,
  FABRIC_BRAND_LABELS,
  PREMIUM_FABRIC_BRANDS,
} from "@/engine/dictionaries/fabricBrands";

describe("parasolSpecsSchema — validation", () => {
  it("accepts the default specs (Unknown certification, all numerics null)", () => {
    const result = parasolSpecsSchema.safeParse(defaultParasolSpecs);
    expect(result.success).toBe(true);
  });

  it("accepts a fully specified parasol", () => {
    const result = parasolSpecsSchema.safeParse({
      fabric_g_m2: 280,
      fabric_certification: "Sunbrella",
      min_base_weight_kg: 50,
      pole_diameter_mm: 48,
      heating_compatible: false,
      wind_beaufort_max: 8,
    });
    expect(result.success).toBe(true);
  });

  it("accepts all 7 fabric_certification slugs", () => {
    for (const slug of FABRIC_BRAND_SLUGS) {
      const result = parasolSpecsSchema.safeParse({
        ...defaultParasolSpecs,
        fabric_certification: slug,
      });
      expect(result.success, `slug ${slug} must be valid`).toBe(true);
    }
  });

  it("rejects an unknown fabric_certification slug", () => {
    const result = parasolSpecsSchema.safeParse({
      ...defaultParasolSpecs,
      fabric_certification: "RandomBrand",
    });
    expect(result.success).toBe(false);
  });

  it("rejects fabric_g_m2 below 150 (invalid grammage)", () => {
    const result = parasolSpecsSchema.safeParse({
      ...defaultParasolSpecs,
      fabric_g_m2: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects fabric_g_m2 above 450 (invalid grammage)", () => {
    const result = parasolSpecsSchema.safeParse({
      ...defaultParasolSpecs,
      fabric_g_m2: 500,
    });
    expect(result.success).toBe(false);
  });

  it("accepts fabric_g_m2 at boundaries (150 and 450)", () => {
    expect(
      parasolSpecsSchema.safeParse({ ...defaultParasolSpecs, fabric_g_m2: 150 }).success,
    ).toBe(true);
    expect(
      parasolSpecsSchema.safeParse({ ...defaultParasolSpecs, fabric_g_m2: 450 }).success,
    ).toBe(true);
  });

  it("rejects wind_beaufort_max below 0 or above 12", () => {
    expect(
      parasolSpecsSchema.safeParse({ ...defaultParasolSpecs, wind_beaufort_max: -1 }).success,
    ).toBe(false);
    expect(
      parasolSpecsSchema.safeParse({ ...defaultParasolSpecs, wind_beaufort_max: 13 }).success,
    ).toBe(false);
  });

  it("accepts wind_beaufort_max at boundaries (0 and 12)", () => {
    expect(
      parasolSpecsSchema.safeParse({ ...defaultParasolSpecs, wind_beaufort_max: 0 }).success,
    ).toBe(true);
    expect(
      parasolSpecsSchema.safeParse({ ...defaultParasolSpecs, wind_beaufort_max: 12 }).success,
    ).toBe(true);
  });

  it("rejects pole_diameter_mm below 30", () => {
    const result = parasolSpecsSchema.safeParse({
      ...defaultParasolSpecs,
      pole_diameter_mm: 20,
    });
    expect(result.success).toBe(false);
  });

  it("rejects min_base_weight_kg above 150", () => {
    const result = parasolSpecsSchema.safeParse({
      ...defaultParasolSpecs,
      min_base_weight_kg: 200,
    });
    expect(result.success).toBe(false);
  });

  it("accepts heating_compatible true with full specs (typical premium parasol)", () => {
    const result = parasolSpecsSchema.safeParse({
      fabric_g_m2: 320,
      fabric_certification: "Dickson_Orchestra",
      min_base_weight_kg: 80,
      pole_diameter_mm: 60,
      heating_compatible: true,
      wind_beaufort_max: 9,
    });
    expect(result.success).toBe(true);
  });
});

describe("fabricBrands dictionary", () => {
  it("FABRIC_BRAND_SLUGS contains exactly 7 entries", () => {
    expect(FABRIC_BRAND_SLUGS).toHaveLength(7);
  });

  it("FABRIC_BRAND_LABELS has a label for every slug", () => {
    for (const slug of FABRIC_BRAND_SLUGS) {
      expect(FABRIC_BRAND_LABELS[slug]).toBeTruthy();
      expect(typeof FABRIC_BRAND_LABELS[slug]).toBe("string");
    }
  });

  it("PREMIUM_FABRIC_BRANDS contains the 5 named brands but not Other/Unknown", () => {
    expect(PREMIUM_FABRIC_BRANDS.has("Sunbrella")).toBe(true);
    expect(PREMIUM_FABRIC_BRANDS.has("Solaris")).toBe(true);
    expect(PREMIUM_FABRIC_BRANDS.has("Dickson_Orchestra")).toBe(true);
    expect(PREMIUM_FABRIC_BRANDS.has("Dickson_Saphir")).toBe(true);
    expect(PREMIUM_FABRIC_BRANDS.has("Serge_Ferrari")).toBe(true);
    expect(PREMIUM_FABRIC_BRANDS.has("Other")).toBe(false);
    expect(PREMIUM_FABRIC_BRANDS.has("Unknown")).toBe(false);
    expect(PREMIUM_FABRIC_BRANDS.size).toBe(5);
  });
});
