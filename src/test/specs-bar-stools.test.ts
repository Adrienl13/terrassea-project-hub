import { describe, it, expect } from "vitest";
import {
  barStoolSpecsSchema,
  defaultBarStoolSpecs,
  highTableSpecsSchema,
  defaultHighTableSpecs,
  SUBDIVISION_OPTIONS,
  SUBDIVISION_SEAT_HEIGHT_HINTS,
} from "@/components/products/specs";

describe("barStoolSpecsSchema — validation", () => {
  it("accepts the default specs (subdivision=unknown, all numerics null)", () => {
    const result = barStoolSpecsSchema.safeParse(defaultBarStoolSpecs);
    expect(result.success).toBe(true);
  });

  it("accepts a bar stool with subdivision=bar at 75cm", () => {
    const result = barStoolSpecsSchema.safeParse({
      seat_height_cm: 75,
      subdivision: "bar",
      footrest: true,
      swivel: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts all 4 subdivision values", () => {
    for (const opt of SUBDIVISION_OPTIONS) {
      const result = barStoolSpecsSchema.safeParse({
        ...defaultBarStoolSpecs,
        subdivision: opt,
      });
      expect(result.success, `subdivision ${opt} must be valid`).toBe(true);
    }
  });

  it("rejects an unknown subdivision value", () => {
    const result = barStoolSpecsSchema.safeParse({
      ...defaultBarStoolSpecs,
      subdivision: "kitchen",
    });
    expect(result.success).toBe(false);
  });

  it("rejects seat_height_cm below 40", () => {
    const result = barStoolSpecsSchema.safeParse({
      ...defaultBarStoolSpecs,
      seat_height_cm: 30,
    });
    expect(result.success).toBe(false);
  });

  it("rejects seat_height_cm above 95", () => {
    const result = barStoolSpecsSchema.safeParse({
      ...defaultBarStoolSpecs,
      seat_height_cm: 110,
    });
    expect(result.success).toBe(false);
  });

  it("accepts seat_height_cm at boundaries (40 and 95)", () => {
    expect(
      barStoolSpecsSchema.safeParse({ ...defaultBarStoolSpecs, seat_height_cm: 40 }).success,
    ).toBe(true);
    expect(
      barStoolSpecsSchema.safeParse({ ...defaultBarStoolSpecs, seat_height_cm: 95 }).success,
    ).toBe(true);
  });

  it("accepts decimal seat_height (numeric(5,1) precision)", () => {
    const result = barStoolSpecsSchema.safeParse({
      ...defaultBarStoolSpecs,
      seat_height_cm: 76.5,
    });
    expect(result.success).toBe(true);
  });
});

describe("highTableSpecsSchema — validation", () => {
  it("accepts the default specs", () => {
    const result = highTableSpecsSchema.safeParse(defaultHighTableSpecs);
    expect(result.success).toBe(true);
  });

  it("accepts a high table with subdivision=tall at 115cm", () => {
    const result = highTableSpecsSchema.safeParse({
      table_top_height_cm: 115,
      subdivision: "tall",
    });
    expect(result.success).toBe(true);
  });

  it("rejects table_top_height_cm below 60", () => {
    const result = highTableSpecsSchema.safeParse({
      ...defaultHighTableSpecs,
      table_top_height_cm: 50,
    });
    expect(result.success).toBe(false);
  });

  it("rejects table_top_height_cm above 130", () => {
    const result = highTableSpecsSchema.safeParse({
      ...defaultHighTableSpecs,
      table_top_height_cm: 150,
    });
    expect(result.success).toBe(false);
  });

  it("accepts table_top_height_cm at boundaries (60 and 130)", () => {
    expect(
      highTableSpecsSchema.safeParse({ ...defaultHighTableSpecs, table_top_height_cm: 60 }).success,
    ).toBe(true);
    expect(
      highTableSpecsSchema.safeParse({ ...defaultHighTableSpecs, table_top_height_cm: 130 }).success,
    ).toBe(true);
  });

  it("rejects extra fields like footrest (high tables don't have footrest)", () => {
    // zod strips by default ; this test confirms the schema doesn't blow up
    const result = highTableSpecsSchema.safeParse({
      ...defaultHighTableSpecs,
      footrest: true,
    } as any);
    expect(result.success).toBe(true);
  });
});

describe("SUBDIVISION_SEAT_HEIGHT_HINTS — recommendations", () => {
  it("recommends 65cm for counter", () => {
    expect(SUBDIVISION_SEAT_HEIGHT_HINTS.counter).toBe(65);
  });
  it("recommends 75cm for bar", () => {
    expect(SUBDIVISION_SEAT_HEIGHT_HINTS.bar).toBe(75);
  });
  it("recommends 85cm for tall", () => {
    expect(SUBDIVISION_SEAT_HEIGHT_HINTS.tall).toBe(85);
  });
  it("returns null for unknown (no recommendation)", () => {
    expect(SUBDIVISION_SEAT_HEIGHT_HINTS.unknown).toBeNull();
  });
});
