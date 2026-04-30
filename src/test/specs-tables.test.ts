import { describe, it, expect } from "vitest";
import { tableSpecsSchema, defaultTableSpecs } from "@/components/products/specs";

describe("tableSpecsSchema — validation", () => {
  it("accepts the default specs (all booleans false, all numerics null)", () => {
    const result = tableSpecsSchema.safeParse(defaultTableSpecs);
    expect(result.success).toBe(true);
  });

  it("accepts a fully specified table", () => {
    const result = tableSpecsSchema.safeParse({
      built_in_umbrella_hole: true,
      umbrella_hole_diameter_mm: 50,
      top_thickness_cm: 2.5,
      is_tippable: true,
      extension_capability: true,
      extension_max_length_cm: 240,
      outdoor_anchor_compatible: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects umbrella_hole=true without diameter", () => {
    const result = tableSpecsSchema.safeParse({
      ...defaultTableSpecs,
      built_in_umbrella_hole: true,
      umbrella_hole_diameter_mm: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues.find((i) =>
        i.path.includes("umbrella_hole_diameter_mm"),
      );
      expect(msg?.message).toBe("diameter_required");
    }
  });

  it("rejects extension=true without max_length", () => {
    const result = tableSpecsSchema.safeParse({
      ...defaultTableSpecs,
      extension_capability: true,
      extension_max_length_cm: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues.find((i) =>
        i.path.includes("extension_max_length_cm"),
      );
      expect(msg?.message).toBe("extension_max_required");
    }
  });

  it("accepts umbrella_hole=false with null diameter (default state)", () => {
    const result = tableSpecsSchema.safeParse({
      ...defaultTableSpecs,
      built_in_umbrella_hole: false,
      umbrella_hole_diameter_mm: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects diameter below 20mm", () => {
    const result = tableSpecsSchema.safeParse({
      ...defaultTableSpecs,
      built_in_umbrella_hole: true,
      umbrella_hole_diameter_mm: 10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects diameter above 80mm", () => {
    const result = tableSpecsSchema.safeParse({
      ...defaultTableSpecs,
      built_in_umbrella_hole: true,
      umbrella_hole_diameter_mm: 100,
    });
    expect(result.success).toBe(false);
  });

  it("accepts diameter exactly at boundaries (20 and 80)", () => {
    expect(
      tableSpecsSchema.safeParse({
        ...defaultTableSpecs,
        built_in_umbrella_hole: true,
        umbrella_hole_diameter_mm: 20,
      }).success,
    ).toBe(true);
    expect(
      tableSpecsSchema.safeParse({
        ...defaultTableSpecs,
        built_in_umbrella_hole: true,
        umbrella_hole_diameter_mm: 80,
      }).success,
    ).toBe(true);
  });

  it("rejects top_thickness_cm below 0.5", () => {
    const result = tableSpecsSchema.safeParse({
      ...defaultTableSpecs,
      top_thickness_cm: 0.2,
    });
    expect(result.success).toBe(false);
  });

  it("rejects extension_max_length_cm above 400", () => {
    const result = tableSpecsSchema.safeParse({
      ...defaultTableSpecs,
      extension_capability: true,
      extension_max_length_cm: 500,
    });
    expect(result.success).toBe(false);
  });

  it("accepts top_thickness_cm at boundaries (0.5 and 15)", () => {
    expect(
      tableSpecsSchema.safeParse({ ...defaultTableSpecs, top_thickness_cm: 0.5 }).success,
    ).toBe(true);
    expect(
      tableSpecsSchema.safeParse({ ...defaultTableSpecs, top_thickness_cm: 15 }).success,
    ).toBe(true);
  });
});
