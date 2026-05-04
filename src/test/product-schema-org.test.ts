// Tests for buildProductSchema — ÉTAPE 9b-3.
//
// Validates Schema.org JSON-LD output for both legacy (single Product) and
// Modèle B (ProductGroup with hasVariant) modes.

import { describe, it, expect, vi } from "vitest";
import { buildProductSchema } from "@/lib/productSchemaOrg";
import type { DBProduct } from "@/lib/products";
import type { DBProductVariant } from "@/lib/productVariants";

vi.mock("@/lib/i18nFields", () => ({
  ml: (obj: { name?: string; short_description?: string; description?: string }, key: string) =>
    (obj as Record<string, string | undefined>)[key] ?? null,
}));

const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
const VARIANT_A = "22222222-2222-4222-8222-222222222222";
const VARIANT_B = "33333333-3333-4333-8333-333333333333";

const stubProduct = (overrides: Partial<DBProduct> = {}): DBProduct =>
  ({
    id: PRODUCT_ID,
    name: "ANGEL 001",
    category: "chairs",
    product_slug: "angel-001",
    owner_brand_slug: "tribu",
    image_url: "https://cdn/test.jpg",
    short_description: "Iconic chair",
    price_min: 199,
    material_tags: ["teak", "rope"],
    brand_source: null,
    supplier_internal: null,
    ...overrides,
  } as unknown as DBProduct);

const stubVariant = (overrides: Partial<DBProductVariant> = {}): DBProductVariant =>
  ({
    id: VARIANT_A,
    product_id: PRODUCT_ID,
    sku: "ANGEL-001-A",
    variant_name: "80×80 cm",
    width_cm: 80,
    depth_cm: 80,
    height_cm: null,
    fabric_color_slug: "natural",
    price_eur: 199,
    in_stock: true,
    is_made_to_order: false,
    ...overrides,
  } as unknown as DBProductVariant);

describe("buildProductSchema — legacy single Product (no variants)", () => {
  it("@type Product avec offers AggregateOffer + URL canonique", () => {
    const result = buildProductSchema(stubProduct(), [], "Tribù", 3);
    expect(result["@context"]).toBe("https://schema.org");
    expect(result["@type"]).toBe("Product");
    expect(result.url).toBe("https://terrassea.com/products/tribu/angel-001");
    expect(result.name).toBe("ANGEL 001");
    expect(result.brand).toEqual({ "@type": "Brand", name: "Tribù" });
    expect((result.offers as Record<string, unknown>).lowPrice).toBe("199.00");
    expect((result.offers as Record<string, unknown>).priceCurrency).toBe("EUR");
    expect((result.offers as Record<string, unknown>).offerCount).toBe(3);
  });

  it("Fallback URL legacy quand owner_brand_slug absent", () => {
    const result = buildProductSchema(
      stubProduct({ owner_brand_slug: null }),
      [],
      null,
    );
    expect(result.url).toBe(`https://terrassea.com/products/${PRODUCT_ID}`);
    expect(result.brand).toBeUndefined();
  });

  it("aggregateRating ajouté quand reviewStats > 0", () => {
    const result = buildProductSchema(stubProduct(), [], "Tribù", 1, {
      avg_rating: 4.5,
      review_count: 12,
    });
    expect(result.aggregateRating).toEqual({
      "@type": "AggregateRating",
      ratingValue: 4.5,
      reviewCount: 12,
      bestRating: 5,
      worstRating: 1,
    });
  });

  it("Pas d'offers quand price_min null", () => {
    const result = buildProductSchema(
      stubProduct({ price_min: null }),
      [],
      "Tribù",
    );
    expect(result.offers).toBeUndefined();
  });
});

describe("buildProductSchema — Modèle B ProductGroup (variants > 1)", () => {
  it("@type ProductGroup avec hasVariant array et variesBy=size", () => {
    const variants = [
      stubVariant({ id: VARIANT_A, sku: "DEMO-T-80", width_cm: 80, depth_cm: 80, price_eur: 199 }),
      stubVariant({ id: VARIANT_B, sku: "DEMO-T-120", width_cm: 120, depth_cm: 80, price_eur: 299 }),
    ];
    const result = buildProductSchema(stubProduct(), variants, "Tribù");
    expect(result["@type"]).toBe("ProductGroup");
    expect(result.productGroupID).toBe(PRODUCT_ID);
    expect(result.variesBy).toBe("https://schema.org/size");
    const hasVariant = result.hasVariant as Record<string, unknown>[];
    expect(hasVariant).toHaveLength(2);
    expect(hasVariant[0].sku).toBe("DEMO-T-80");
    expect(hasVariant[1].sku).toBe("DEMO-T-120");
  });

  it("variant in_stock=true → availability InStock", () => {
    const variants = [
      stubVariant({ in_stock: true, is_made_to_order: false }),
      stubVariant({ id: VARIANT_B, in_stock: true }),
    ];
    const result = buildProductSchema(stubProduct(), variants, "Tribù");
    const v0 = (result.hasVariant as Record<string, unknown>[])[0];
    expect((v0.offers as Record<string, unknown>).availability).toBe(
      "https://schema.org/InStock",
    );
  });

  it("variant is_made_to_order=true → availability MadeToOrder (court-circuite in_stock)", () => {
    const variants = [
      stubVariant({ in_stock: true, is_made_to_order: true }),
      stubVariant({ id: VARIANT_B }),
    ];
    const result = buildProductSchema(stubProduct(), variants, "Tribù");
    const v0 = (result.hasVariant as Record<string, unknown>[])[0];
    expect((v0.offers as Record<string, unknown>).availability).toBe(
      "https://schema.org/MadeToOrder",
    );
  });

  it("variant in_stock=false + !is_made_to_order → availability OutOfStock", () => {
    const variants = [
      stubVariant({ in_stock: false, is_made_to_order: false }),
      stubVariant({ id: VARIANT_B }),
    ];
    const result = buildProductSchema(stubProduct(), variants, "Tribù");
    const v0 = (result.hasVariant as Record<string, unknown>[])[0];
    expect((v0.offers as Record<string, unknown>).availability).toBe(
      "https://schema.org/OutOfStock",
    );
  });

  it("Régression zéro : 1 seul variant → @type Product (pas ProductGroup)", () => {
    const result = buildProductSchema(stubProduct(), [stubVariant()], "Tribù");
    expect(result["@type"]).toBe("Product");
    expect(result.hasVariant).toBeUndefined();
  });

  it("brand depuis partnerName prioritaire sur product.brand_source", () => {
    const result = buildProductSchema(
      stubProduct({ brand_source: "Legacy Brand" }),
      [stubVariant({ id: VARIANT_A }), stubVariant({ id: VARIANT_B })],
      "Tribù",
    );
    expect(result.brand).toEqual({ "@type": "Brand", name: "Tribù" });
  });
});
