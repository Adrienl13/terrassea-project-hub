// Tests for src/lib/productVariants.ts — chantier Modèle B variants ÉTAPE 3.
// Validates the zod draft schema, defaults, and helper functions.

import { describe, it, expect } from "vitest";
import {
  productVariantDraftSchema,
  defaultProductVariantDraft,
  defaultVariantOf,
  isVariantPublished,
  isVariantAvailable,
  variantDimensionLabel,
  VARIANT_SHAPES,
  VARIANT_SUBDIVISIONS,
  type DBProductVariant,
} from "@/lib/productVariants";

const PRODUCT_UUID = "11111111-1111-4111-8111-111111111111";

describe("productVariantDraftSchema", () => {
  it("accepts a minimal valid variant draft", () => {
    const draft = defaultProductVariantDraft(PRODUCT_UUID);
    const result = productVariantDraftSchema.safeParse(draft);
    expect(result.success).toBe(true);
  });

  it("rejects a draft without product_id", () => {
    const draft = { ...defaultProductVariantDraft(PRODUCT_UUID) } as Record<string, unknown>;
    delete draft.product_id;
    const result = productVariantDraftSchema.safeParse(draft);
    expect(result.success).toBe(false);
  });

  it("rejects an invalid product_id (not a uuid)", () => {
    const result = productVariantDraftSchema.safeParse({
      ...defaultProductVariantDraft(PRODUCT_UUID),
      product_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts every shape value", () => {
    for (const shape of VARIANT_SHAPES) {
      const result = productVariantDraftSchema.safeParse({
        ...defaultProductVariantDraft(PRODUCT_UUID),
        shape,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects an unknown shape", () => {
    const result = productVariantDraftSchema.safeParse({
      ...defaultProductVariantDraft(PRODUCT_UUID),
      shape: "hexagon",
    });
    expect(result.success).toBe(false);
  });

  it("accepts every subdivision value", () => {
    for (const subdivision of VARIANT_SUBDIVISIONS) {
      const result = productVariantDraftSchema.safeParse({
        ...defaultProductVariantDraft(PRODUCT_UUID),
        subdivision,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects a hex color without #", () => {
    const result = productVariantDraftSchema.safeParse({
      ...defaultProductVariantDraft(PRODUCT_UUID),
      fabric_color_hex: "FF0000",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a hex color with wrong length", () => {
    const result = productVariantDraftSchema.safeParse({
      ...defaultProductVariantDraft(PRODUCT_UUID),
      fabric_color_hex: "#FFF",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid 6-digit hex color", () => {
    const result = productVariantDraftSchema.safeParse({
      ...defaultProductVariantDraft(PRODUCT_UUID),
      fabric_color_hex: "#A1B2C3",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a negative price_eur", () => {
    const result = productVariantDraftSchema.safeParse({
      ...defaultProductVariantDraft(PRODUCT_UUID),
      price_eur: -10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects price_currency longer than 3 chars", () => {
    const result = productVariantDraftSchema.safeParse({
      ...defaultProductVariantDraft(PRODUCT_UUID),
      price_currency: "EURO",
    });
    expect(result.success).toBe(false);
  });

  it("accepts numeric width_cm at boundary 99999.9", () => {
    const result = productVariantDraftSchema.safeParse({
      ...defaultProductVariantDraft(PRODUCT_UUID),
      width_cm: 99999.9,
    });
    expect(result.success).toBe(true);
  });

  it("rejects delivery_weeks_max < min via .refine()", () => {
    const result = productVariantDraftSchema.safeParse({
      ...defaultProductVariantDraft(PRODUCT_UUID),
      delivery_weeks_min: 8,
      delivery_weeks_max: 4,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === "delivery_max_below_min")).toBe(true);
    }
  });

  it("accepts delivery_weeks_max equal to min", () => {
    const result = productVariantDraftSchema.safeParse({
      ...defaultProductVariantDraft(PRODUCT_UUID),
      delivery_weeks_min: 6,
      delivery_weeks_max: 6,
    });
    expect(result.success).toBe(true);
  });

  it("rejects confidence_score outside [0,1]", () => {
    expect(
      productVariantDraftSchema.safeParse({
        ...defaultProductVariantDraft(PRODUCT_UUID),
        confidence_score: 1.5,
      }).success,
    ).toBe(false);
    expect(
      productVariantDraftSchema.safeParse({
        ...defaultProductVariantDraft(PRODUCT_UUID),
        confidence_score: -0.1,
      }).success,
    ).toBe(false);
  });
});

describe("defaultProductVariantDraft", () => {
  it("returns sensible Phase 1 defaults", () => {
    const d = defaultProductVariantDraft(PRODUCT_UUID);
    expect(d.product_id).toBe(PRODUCT_UUID);
    expect(d.is_default).toBe(false);
    expect(d.is_published).toBe(false);
    expect(d.in_stock).toBe(false);
    expect(d.is_made_to_order).toBe(false);
    expect(d.price_currency).toBe("EUR");
    expect(d.source_type).toBe("manual");
  });

  it("default draft passes its own schema", () => {
    expect(productVariantDraftSchema.safeParse(defaultProductVariantDraft(PRODUCT_UUID)).success).toBe(true);
  });
});

// ── Helper functions ────────────────────────────────────────────────────────

const stubVariant = (overrides: Partial<DBProductVariant> = {}): DBProductVariant =>
  ({
    id: "v1",
    product_id: PRODUCT_UUID,
    sku: null,
    variant_name: null,
    width_cm: null,
    depth_cm: null,
    height_cm: null,
    diameter_cm: null,
    shape: null,
    weight_kg: null,
    material_brand_id: null,
    fabric_color_slug: null,
    fabric_color_label_i18n: null,
    fabric_color_hex: null,
    frame_finish_slug: null,
    frame_finish_label_i18n: null,
    configuration_module: null,
    subdivision: null,
    has_armrests: null,
    has_wheels: false,
    has_cushion: false,
    is_stackable: false,
    price_eur: null,
    price_currency: "EUR",
    in_stock: false,
    stock_quantity: null,
    delivery_weeks_min: null,
    delivery_weeks_max: null,
    is_made_to_order: false,
    available_in_markets: null,
    primary_media_id: null,
    source_type: null,
    source_url: null,
    extracted_at: null,
    validated_by: null,
    validated_at: null,
    confidence_score: null,
    is_published: false,
    is_default: false,
    discontinued_at: null,
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
    ...overrides,
  }) as DBProductVariant;

describe("defaultVariantOf", () => {
  it("returns null for an empty list", () => {
    expect(defaultVariantOf([])).toBe(null);
  });

  it("returns the variant flagged is_default if any", () => {
    const a = stubVariant({ id: "a", is_default: false });
    const b = stubVariant({ id: "b", is_default: true });
    const c = stubVariant({ id: "c", is_default: false });
    expect(defaultVariantOf([a, b, c])?.id).toBe("b");
  });

  it("falls back to the first variant when none flagged", () => {
    const a = stubVariant({ id: "a" });
    const b = stubVariant({ id: "b" });
    expect(defaultVariantOf([a, b])?.id).toBe("a");
  });
});

describe("isVariantPublished", () => {
  it("requires both is_published and !discontinued_at", () => {
    expect(isVariantPublished({ is_published: true, discontinued_at: null })).toBe(true);
    expect(isVariantPublished({ is_published: false, discontinued_at: null })).toBe(false);
    expect(isVariantPublished({ is_published: true, discontinued_at: "2026-04-01T00:00:00Z" })).toBe(false);
  });
});

describe("isVariantAvailable", () => {
  it("treats discontinued as unavailable", () => {
    expect(
      isVariantAvailable({
        in_stock: true,
        is_made_to_order: false,
        discontinued_at: "2026-04-01T00:00:00Z",
      }),
    ).toBe(false);
  });

  it("considers in_stock OR made_to_order as available", () => {
    expect(isVariantAvailable({ in_stock: true, is_made_to_order: false, discontinued_at: null })).toBe(true);
    expect(isVariantAvailable({ in_stock: false, is_made_to_order: true, discontinued_at: null })).toBe(true);
    expect(isVariantAvailable({ in_stock: false, is_made_to_order: false, discontinued_at: null })).toBe(false);
  });
});

describe("variantDimensionLabel", () => {
  it("returns null when no dimensions set", () => {
    expect(
      variantDimensionLabel({ width_cm: null, depth_cm: null, height_cm: null, diameter_cm: null }),
    ).toBe(null);
  });

  it("uses diameter when present (overrides W×D×H)", () => {
    expect(
      variantDimensionLabel({ width_cm: 80, depth_cm: 80, height_cm: null, diameter_cm: 120 }),
    ).toBe("Ø 120 cm");
  });

  it("formats W × D × H when diameter null", () => {
    expect(
      variantDimensionLabel({ width_cm: 80, depth_cm: 60, height_cm: 75, diameter_cm: null }),
    ).toBe("80 × 60 × 75 cm");
  });

  it("formats W × D when height missing", () => {
    expect(
      variantDimensionLabel({ width_cm: 80, depth_cm: 60, height_cm: null, diameter_cm: null }),
    ).toBe("80 × 60 cm");
  });
});
