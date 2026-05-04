// Tests pour getAvailabilityFromVariant — chantier Modèle B variants
// ÉTAPE 9a-fix-2-ε.
//
// 4 branches mappant flags variant in_stock / is_made_to_order /
// stock_quantity vers AvailabilityInfo.

import { describe, it, expect } from "vitest";
import { getAvailabilityFromVariant } from "@/lib/productAvailability";
import type { DBProduct } from "@/lib/products";
import type { DBProductVariant } from "@/lib/productVariants";

const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
const VARIANT_ID = "22222222-2222-4222-8222-222222222222";

const stubProduct = (overrides: Partial<DBProduct> = {}): DBProduct =>
  ({
    id: PRODUCT_ID,
    name: "Demo",
    estimated_delivery_days: null,
    ...overrides,
  } as DBProduct);

const stubVariant = (overrides: Partial<DBProductVariant> = {}): DBProductVariant =>
  ({
    id: VARIANT_ID,
    product_id: PRODUCT_ID,
    in_stock: true,
    is_made_to_order: false,
    stock_quantity: null,
    delivery_weeks_min: null,
    delivery_weeks_max: null,
    price_eur: 100,
    is_default: false,
    is_published: true,
    is_stackable: false,
    has_wheels: false,
    has_cushion: false,
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
    available_in_markets: null,
    primary_media_id: null,
    source_type: null,
    source_url: null,
    extracted_at: null,
    validated_by: null,
    validated_at: null,
    confidence_score: null,
    discontinued_at: null,
    price_currency: "EUR",
    created_at: "2026-05-04T00:00:00Z",
    updated_at: "2026-05-04T00:00:00Z",
    ...overrides,
  } as DBProductVariant);

describe("getAvailabilityFromVariant — ε mapping (4 branches)", () => {
  it("Branche 1 : is_made_to_order=true + delivery_weeks_min/max → 'Made to order' + lead time variant", () => {
    const v = stubVariant({ is_made_to_order: true, in_stock: false, delivery_weeks_min: 4, delivery_weeks_max: 6 });
    const result = getAvailabilityFromVariant(v, stubProduct());
    expect(result.label).toBe("Made to order");
    expect(result.iconKey).toBe("clock");
    expect(result.description).toBe("Lead time: 4–6 weeks");
  });

  it("Branche 1 : is_made_to_order=true + delivery_weeks_min seul → lead time min", () => {
    const v = stubVariant({ is_made_to_order: true, in_stock: false, delivery_weeks_min: 8, delivery_weeks_max: null });
    const result = getAvailabilityFromVariant(v, stubProduct());
    expect(result.description).toBe("Lead time: 8 weeks");
  });

  it("Branche 1 fallback product : is_made_to_order=true sans variant lead time mais product.estimated_delivery_days=21 → 3-5 weeks", () => {
    const v = stubVariant({ is_made_to_order: true, in_stock: false });
    const result = getAvailabilityFromVariant(v, stubProduct({ estimated_delivery_days: 21 }));
    expect(result.label).toBe("Made to order");
    expect(result.description).toBe("Lead time: 3–5 weeks");
  });

  it("Branche 1 fallback final : is_made_to_order=true sans aucun lead time → 'Lead time on request'", () => {
    const v = stubVariant({ is_made_to_order: true, in_stock: false });
    const result = getAvailabilityFromVariant(v, stubProduct());
    expect(result.label).toBe("Made to order");
    expect(result.description).toBe("Lead time on request");
  });

  it("Branche 2 : in_stock=true + qty=5 (≤20) → 'Low stock' + count", () => {
    const v = stubVariant({ in_stock: true, stock_quantity: 5 });
    const result = getAvailabilityFromVariant(v, stubProduct());
    expect(result.label).toBe("Low stock");
    expect(result.iconKey).toBe("alert");
    expect(result.description).toBe("5 units available");
  });

  it("Branche 2 : in_stock=true + qty=20 (limite haute) → 'Low stock'", () => {
    const v = stubVariant({ in_stock: true, stock_quantity: 20 });
    const result = getAvailabilityFromVariant(v, stubProduct());
    expect(result.label).toBe("Low stock");
  });

  it("Branche 3 : in_stock=true + qty=null → 'In stock' + 'Available for immediate dispatch' (cas DEMO-T-80, DEMO-T-120)", () => {
    const v = stubVariant({ in_stock: true, stock_quantity: null });
    const result = getAvailabilityFromVariant(v, stubProduct());
    expect(result.label).toBe("In stock");
    expect(result.iconKey).toBe("check");
    expect(result.description).toBe("Available for immediate dispatch");
  });

  it("Branche 3 : in_stock=true + qty=50 (>20) → 'In stock' + count", () => {
    const v = stubVariant({ in_stock: true, stock_quantity: 50 });
    const result = getAvailabilityFromVariant(v, stubProduct());
    expect(result.label).toBe("In stock");
    expect(result.description).toBe("50 units available");
  });

  it("Branche 4 : in_stock=false + is_made_to_order=false (cas DEMO-T-160) → 'Availability on request'", () => {
    const v = stubVariant({ in_stock: false, is_made_to_order: false, stock_quantity: null });
    const result = getAvailabilityFromVariant(v, stubProduct());
    expect(result.label).toBe("Availability on request");
    expect(result.iconKey).toBe("package");
    expect(result.description).toBe("Contact us for availability details");
  });
});
