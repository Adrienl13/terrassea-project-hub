// Tests pour src/lib/variantsMaterialization.ts — chantier Modèle B variants ÉTAPE 7.
// Validate buildVariantInserts (cas nominal + fallback legacy submissions)
// + assertExactlyOneDefault (defense in depth admin approval).

import { describe, it, expect } from "vitest";
import {
  buildVariantInserts,
  assertExactlyOneDefault,
  type SerializedVariant,
} from "@/lib/variantsMaterialization";

const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
const ADMIN_USER_ID = "22222222-2222-4222-8222-222222222222";

describe("buildVariantInserts — cas nominal (submission contient variants)", () => {
  it("matérialise N variants avec les champs mappés directement", () => {
    const variants: SerializedVariant[] = [
      {
        sku: "A",
        width_cm: 80,
        depth_cm: 60,
        material_brand_id: "33333333-3333-4333-8333-333333333333",
        fabric_color_slug: "beige",
        frame_finish_slug: "teak-natural",
        price_eur: 99.5,
        in_stock: true,
        is_default: true,
      },
      {
        sku: "B",
        width_cm: 100,
        depth_cm: 60,
        material_brand_id: null,
        fabric_color_slug: null,
        frame_finish_slug: null,
        price_eur: 119,
        in_stock: false,
        is_default: false,
      },
    ];

    const inserts = buildVariantInserts(PRODUCT_ID, variants, {}, ADMIN_USER_ID);
    expect(inserts).toHaveLength(2);

    expect(inserts[0]).toMatchObject({
      product_id: PRODUCT_ID,
      sku: "A",
      width_cm: 80,
      depth_cm: 60,
      material_brand_id: "33333333-3333-4333-8333-333333333333",
      fabric_color_slug: "beige",
      frame_finish_slug: "teak-natural",
      price_eur: 99.5,
      in_stock: true,
      is_default: true,
      is_published: true,
      source_type: "manual",
      validated_by: ADMIN_USER_ID,
      price_currency: "EUR",
    });
    expect(inserts[0].extracted_at).toBeDefined();
    expect(inserts[0].validated_at).toBeDefined();

    expect(inserts[1]).toMatchObject({
      product_id: PRODUCT_ID,
      sku: "B",
      is_default: false,
    });
  });

  it("preserves null for optional fields not provided", () => {
    const variants: SerializedVariant[] = [
      { is_default: true }, // minimum row
    ];
    const inserts = buildVariantInserts(PRODUCT_ID, variants, {}, null);
    expect(inserts).toHaveLength(1);
    expect(inserts[0].sku).toBe(null);
    expect(inserts[0].width_cm).toBe(null);
    expect(inserts[0].material_brand_id).toBe(null);
    expect(inserts[0].in_stock).toBe(false); // default false
    expect(inserts[0].is_default).toBe(true);
    expect(inserts[0].validated_by).toBe(null);
  });
});

describe("buildVariantInserts — fallback legacy (no variants in submission)", () => {
  it("retourne 1 default variant pré-rempli depuis productDataFallback (variants absent)", () => {
    const inserts = buildVariantInserts(
      PRODUCT_ID,
      undefined,
      {
        dimensions_length_cm: 80,
        dimensions_width_cm: 60,
        dimensions_height_cm: 75,
        price_min: "99.50",
        stock_status: "in_stock",
        weight_kg: "5.5",
      },
      null,
    );
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({
      product_id: PRODUCT_ID,
      width_cm: 80,
      depth_cm: 60,
      height_cm: 75,
      weight_kg: 5.5,
      price_eur: 99.5,
      price_currency: "EUR",
      in_stock: true,
      is_default: true,
      is_published: true,
      source_type: "manual",
      sku: null,
    });
  });

  it("retourne 1 default fallback même si productDataFallback est presque vide", () => {
    const inserts = buildVariantInserts(PRODUCT_ID, [], {}, null);
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({
      product_id: PRODUCT_ID,
      is_default: true,
      width_cm: null,
      depth_cm: null,
      price_eur: null,
      in_stock: false,
    });
  });

  it("convertit price_min string en number quand fallback utilisé", () => {
    const inserts = buildVariantInserts(PRODUCT_ID, [], { price_min: "150.25" }, null);
    expect(inserts[0].price_eur).toBe(150.25);
  });

  it("retourne in_stock=true si stock_status='low_stock' (cohérence flow partner)", () => {
    const inserts = buildVariantInserts(PRODUCT_ID, [], { stock_status: "low_stock" }, null);
    expect(inserts[0].in_stock).toBe(true);
  });

  it("retourne in_stock=false pour stock_status non-stock (made_to_order, on_order)", () => {
    const inserts = buildVariantInserts(PRODUCT_ID, [], { stock_status: "made_to_order" }, null);
    expect(inserts[0].in_stock).toBe(false);
  });
});

describe("assertExactlyOneDefault", () => {
  it("ok=true quand exactement 1 default", () => {
    expect(
      assertExactlyOneDefault([{ is_default: true }, { is_default: false }]),
    ).toEqual({ ok: true });
  });

  it("rejet no_default quand 0 default", () => {
    expect(
      assertExactlyOneDefault([{ is_default: false }, { is_default: false }]),
    ).toEqual({ ok: false, reason: "no_default", count: 0 });
  });

  it("rejet multiple_default quand >1 default", () => {
    expect(
      assertExactlyOneDefault([{ is_default: true }, { is_default: true }]),
    ).toEqual({ ok: false, reason: "multiple_default", count: 2 });
  });
});
