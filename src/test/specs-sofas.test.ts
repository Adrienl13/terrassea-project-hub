import { describe, it, expect } from "vitest";
import {
  sofaSpecsSchema,
  defaultSofaSpecs,
  SOFA_MODULES,
} from "@/components/products/specs";

describe("sofaSpecsSchema — validation", () => {
  it("accepts the default specs (empty modules, all numerics null)", () => {
    const result = sofaSpecsSchema.safeParse(defaultSofaSpecs);
    expect(result.success).toBe(true);
  });

  it("accepts a fully modular sofa with all 7 modules", () => {
    const result = sofaSpecsSchema.safeParse({
      available_modules: [...SOFA_MODULES],
      seat_depth_cm: 65,
      cushion_replacement_available: true,
      acoustic_nrc: 0.75,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a single-module sofa", () => {
    const result = sofaSpecsSchema.safeParse({
      ...defaultSofaSpecs,
      available_modules: ["corner"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown module value", () => {
    const result = sofaSpecsSchema.safeParse({
      ...defaultSofaSpecs,
      available_modules: ["sectional"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects mix of valid + invalid modules", () => {
    const result = sofaSpecsSchema.safeParse({
      ...defaultSofaSpecs,
      available_modules: ["corner", "wrong-module"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts duplicates in available_modules (zod array allows duplicates by default ; UI dedupes)", () => {
    const result = sofaSpecsSchema.safeParse({
      ...defaultSofaSpecs,
      available_modules: ["corner", "corner"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects available_modules as a non-array (jsonb edge case)", () => {
    const result = sofaSpecsSchema.safeParse({
      ...defaultSofaSpecs,
      available_modules: "corner",
    });
    expect(result.success).toBe(false);
  });

  it("accepts seat_depth_cm at 45 (formal structured)", () => {
    const result = sofaSpecsSchema.safeParse({
      ...defaultSofaSpecs,
      seat_depth_cm: 45,
    });
    expect(result.success).toBe(true);
  });

  it("accepts seat_depth_cm at 65 (deep lounge)", () => {
    const result = sofaSpecsSchema.safeParse({
      ...defaultSofaSpecs,
      seat_depth_cm: 65,
    });
    expect(result.success).toBe(true);
  });

  it("rejects seat_depth_cm below 30", () => {
    const result = sofaSpecsSchema.safeParse({
      ...defaultSofaSpecs,
      seat_depth_cm: 25,
    });
    expect(result.success).toBe(false);
  });

  it("rejects seat_depth_cm above 120", () => {
    const result = sofaSpecsSchema.safeParse({
      ...defaultSofaSpecs,
      seat_depth_cm: 150,
    });
    expect(result.success).toBe(false);
  });

  it("accepts seat_depth_cm at exact boundaries (30 and 120)", () => {
    expect(
      sofaSpecsSchema.safeParse({ ...defaultSofaSpecs, seat_depth_cm: 30 }).success,
    ).toBe(true);
    expect(
      sofaSpecsSchema.safeParse({ ...defaultSofaSpecs, seat_depth_cm: 120 }).success,
    ).toBe(true);
  });

  it("rejects acoustic_nrc above 1.0", () => {
    const result = sofaSpecsSchema.safeParse({
      ...defaultSofaSpecs,
      acoustic_nrc: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects acoustic_nrc below 0", () => {
    const result = sofaSpecsSchema.safeParse({
      ...defaultSofaSpecs,
      acoustic_nrc: -0.1,
    });
    expect(result.success).toBe(false);
  });

  it("accepts acoustic_nrc at exact boundaries (0 and 1)", () => {
    expect(
      sofaSpecsSchema.safeParse({ ...defaultSofaSpecs, acoustic_nrc: 0 }).success,
    ).toBe(true);
    expect(
      sofaSpecsSchema.safeParse({ ...defaultSofaSpecs, acoustic_nrc: 1 }).success,
    ).toBe(true);
  });

  it("accepts acoustic_nrc = 0.7 (excellent threshold)", () => {
    const result = sofaSpecsSchema.safeParse({
      ...defaultSofaSpecs,
      acoustic_nrc: 0.7,
    });
    expect(result.success).toBe(true);
  });

  it("realistic case: modular sofa, 4 modules, 60cm depth, NRC null (most common)", () => {
    const result = sofaSpecsSchema.safeParse({
      available_modules: ["corner", "central-2seat", "chaise-left", "ottoman"],
      seat_depth_cm: 60,
      cushion_replacement_available: true,
      acoustic_nrc: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("SOFA_MODULES dictionary", () => {
  it("contains exactly 7 entries", () => {
    expect(SOFA_MODULES).toHaveLength(7);
  });

  it("contains the expected slugs", () => {
    expect([...SOFA_MODULES]).toEqual([
      "corner",
      "central-1seat",
      "central-2seat",
      "chaise-left",
      "chaise-right",
      "ottoman",
      "pouf",
    ]);
  });
});
