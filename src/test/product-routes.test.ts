// Tests for src/lib/productRoutes.ts — chantier ÉTAPE 9b-2a.

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────────────────────────

const PARTNER_ID = "11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PRODUCT_ID = "22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

let partnerFixture: { id: string } | null = null;
let productRowFixture: { id: string } | null = null;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        neq: () => chain,
        maybeSingle: () =>
          Promise.resolve({
            data: table === "partners" ? partnerFixture : productRowFixture,
            error: null,
          }),
      };
      return chain;
    },
  },
}));

const fetchProductByIdMock = vi.fn();
vi.mock("@/lib/products", () => ({
  fetchProductById: (id: string) => fetchProductByIdMock(id),
}));

import { urlForProduct, resolveProductBySlugs } from "@/lib/productRoutes";

beforeEach(() => {
  partnerFixture = null;
  productRowFixture = null;
  fetchProductByIdMock.mockReset();
});

// ── urlForProduct ───────────────────────────────────────────────────────────

describe("urlForProduct — canonical URL builder", () => {
  it("partner.slug + product.product_slug → URL canonique", () => {
    expect(
      urlForProduct({ id: PRODUCT_ID, product_slug: "demo-table" }, "tribu"),
    ).toBe("/products/tribu/demo-table");
  });

  it("partner.slug undefined → fallback /products/[id]", () => {
    expect(
      urlForProduct({ id: PRODUCT_ID, product_slug: "demo-table" }, undefined),
    ).toBe(`/products/${PRODUCT_ID}`);
  });

  it("partner.slug null → fallback /products/[id]", () => {
    expect(
      urlForProduct({ id: PRODUCT_ID, product_slug: "demo-table" }, null),
    ).toBe(`/products/${PRODUCT_ID}`);
  });

  it("product.product_slug empty → fallback /products/[id]", () => {
    expect(urlForProduct({ id: PRODUCT_ID, product_slug: "" }, "tribu")).toBe(
      `/products/${PRODUCT_ID}`,
    );
  });
});

// ── resolveProductBySlugs ───────────────────────────────────────────────────

describe("resolveProductBySlugs — slug → DBProduct lookup", () => {
  it("partner + product trouvés → fetchProductById appelé avec product.id", async () => {
    partnerFixture = { id: PARTNER_ID };
    productRowFixture = { id: PRODUCT_ID };
    fetchProductByIdMock.mockResolvedValueOnce({ id: PRODUCT_ID, name: "Demo" });

    const result = await resolveProductBySlugs("tribu", "demo-table");
    expect(fetchProductByIdMock).toHaveBeenCalledWith(PRODUCT_ID);
    expect(result?.id).toBe(PRODUCT_ID);
  });

  it("partner non trouvé → null (pas de query products)", async () => {
    partnerFixture = null;
    productRowFixture = { id: PRODUCT_ID };

    const result = await resolveProductBySlugs("inconnu", "demo-table");
    expect(result).toBe(null);
    expect(fetchProductByIdMock).not.toHaveBeenCalled();
  });

  it("product non trouvé → null", async () => {
    partnerFixture = { id: PARTNER_ID };
    productRowFixture = null;

    const result = await resolveProductBySlugs("tribu", "inconnu");
    expect(result).toBe(null);
    expect(fetchProductByIdMock).not.toHaveBeenCalled();
  });

  it("brandSlug vide → null sans query", async () => {
    const result = await resolveProductBySlugs("", "demo-table");
    expect(result).toBe(null);
  });

  it("productSlug vide → null sans query", async () => {
    const result = await resolveProductBySlugs("tribu", "");
    expect(result).toBe(null);
  });
});
