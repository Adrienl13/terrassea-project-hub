// Tests pour src/lib/variantsGridHelpers.ts — chantier Modèle B variants ÉTAPE 6b.
// Validate variantRowSchema + makeEmptyVariantRow defaults.

import { describe, it, expect } from "vitest";
import {
  makeEmptyVariantRow,
  variantRowSchema,
  type LocalVariantRow,
} from "@/lib/variantsGridHelpers";

describe("makeEmptyVariantRow", () => {
  it("returns sensible defaults with is_default=false by default", () => {
    const row = makeEmptyVariantRow();
    expect(row.is_default).toBe(false);
    expect(row.in_stock).toBe(false);
    expect(row.sku).toBe(null);
    expect(row.width_cm).toBe(null);
    expect(row.depth_cm).toBe(null);
    expect(row.material_brand_id).toBe(null);
    expect(row.fabric_color_slug).toBe(null);
    expect(row.frame_finish_slug).toBe(null);
    expect(row.price_eur).toBe(null);
  });

  it("sets is_default=true when explicitly requested", () => {
    const row = makeEmptyVariantRow(true);
    expect(row.is_default).toBe(true);
  });

  it("generates a unique _localId for each call", () => {
    const a = makeEmptyVariantRow();
    const b = makeEmptyVariantRow();
    expect(a._localId).not.toBe(b._localId);
    expect(a._localId.length).toBeGreaterThan(0);
  });

  it("default row passes its own validation schema", () => {
    const row = makeEmptyVariantRow();
    const result = variantRowSchema.safeParse(row);
    expect(result.success).toBe(true);
  });
});

describe("variantRowSchema", () => {
  const validRow = (): LocalVariantRow => makeEmptyVariantRow();

  it("rejects negative price_eur", () => {
    const result = variantRowSchema.safeParse({ ...validRow(), price_eur: -1 });
    expect(result.success).toBe(false);
  });

  it("accepts price_eur = 0", () => {
    const result = variantRowSchema.safeParse({ ...validRow(), price_eur: 0 });
    expect(result.success).toBe(true);
  });

  it("rejects width_cm above 99999.9", () => {
    const result = variantRowSchema.safeParse({ ...validRow(), width_cm: 100000 });
    expect(result.success).toBe(false);
  });

  it("rejects negative dimensions", () => {
    expect(variantRowSchema.safeParse({ ...validRow(), width_cm: -5 }).success).toBe(false);
    expect(variantRowSchema.safeParse({ ...validRow(), depth_cm: -5 }).success).toBe(false);
  });

  it("rejects non-uuid material_brand_id", () => {
    const result = variantRowSchema.safeParse({
      ...validRow(),
      material_brand_id: "sunbrella-not-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts uuid material_brand_id", () => {
    const result = variantRowSchema.safeParse({
      ...validRow(),
      material_brand_id: "11111111-1111-4111-8111-111111111111",
    });
    expect(result.success).toBe(true);
  });

  it("rejects sku longer than 100 chars", () => {
    const result = variantRowSchema.safeParse({
      ...validRow(),
      sku: "x".repeat(101),
    });
    expect(result.success).toBe(false);
  });
});
