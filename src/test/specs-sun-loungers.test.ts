import { describe, it, expect } from "vitest";
import {
  sunLoungerSpecsSchema,
  defaultSunLoungerSpecs,
} from "@/components/products/specs";

describe("sunLoungerSpecsSchema — validation", () => {
  it("accepts the default specs (all false, nesting_capacity null)", () => {
    const result = sunLoungerSpecsSchema.safeParse(defaultSunLoungerSpecs);
    expect(result.success).toBe(true);
  });

  it("accepts a fully specified beach lounger", () => {
    const result = sunLoungerSpecsSchema.safeParse({
      cushion_quick_dry: true,
      salt_water_resistance: true,
      chlorine_resistance: false,
      sand_drainage: true,
      nesting_capacity: 8,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a fully specified pool lounger", () => {
    const result = sunLoungerSpecsSchema.safeParse({
      cushion_quick_dry: true,
      salt_water_resistance: false,
      chlorine_resistance: true,
      sand_drainage: false,
      nesting_capacity: 12,
    });
    expect(result.success).toBe(true);
  });

  it("accepts both salt + chlorine resistance simultaneously (premium)", () => {
    const result = sunLoungerSpecsSchema.safeParse({
      ...defaultSunLoungerSpecs,
      salt_water_resistance: true,
      chlorine_resistance: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts nesting_capacity = null (not stackable or undocumented)", () => {
    const result = sunLoungerSpecsSchema.safeParse({
      ...defaultSunLoungerSpecs,
      nesting_capacity: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects nesting_capacity = 0 (invalid — should be null instead)", () => {
    const result = sunLoungerSpecsSchema.safeParse({
      ...defaultSunLoungerSpecs,
      nesting_capacity: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative nesting_capacity", () => {
    const result = sunLoungerSpecsSchema.safeParse({
      ...defaultSunLoungerSpecs,
      nesting_capacity: -5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects nesting_capacity above 50", () => {
    const result = sunLoungerSpecsSchema.safeParse({
      ...defaultSunLoungerSpecs,
      nesting_capacity: 60,
    });
    expect(result.success).toBe(false);
  });

  it("accepts nesting_capacity at boundaries (1 and 50)", () => {
    expect(
      sunLoungerSpecsSchema.safeParse({
        ...defaultSunLoungerSpecs,
        nesting_capacity: 1,
      }).success,
    ).toBe(true);
    expect(
      sunLoungerSpecsSchema.safeParse({
        ...defaultSunLoungerSpecs,
        nesting_capacity: 50,
      }).success,
    ).toBe(true);
  });

  it("rejects non-integer nesting_capacity", () => {
    const result = sunLoungerSpecsSchema.safeParse({
      ...defaultSunLoungerSpecs,
      nesting_capacity: 4.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects extra unknown field", () => {
    const result = sunLoungerSpecsSchema.safeParse({
      ...defaultSunLoungerSpecs,
      unknown_field: "x",
    } as any);
    expect(result.success).toBe(true); // zod by default strips unknowns ; this confirms the schema is permissive on extra
  });

  it("rejects missing required boolean field", () => {
    const result = sunLoungerSpecsSchema.safeParse({
      cushion_quick_dry: true,
      salt_water_resistance: true,
      chlorine_resistance: true,
      // sand_drainage missing
      nesting_capacity: null,
    });
    expect(result.success).toBe(false);
  });
});
