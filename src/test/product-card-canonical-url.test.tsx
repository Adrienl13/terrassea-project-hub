// Tests for ProductCard canonical URL routing — chantier ÉTAPE 9b-2b.
//
// Validates that <ProductCard> renders the canonical /products/[brand-slug]/[product-slug]
// URL when `product.owner_brand_slug` is present, and falls back to the legacy
// /products/[id] URL when it's null/undefined (régression zéro garantie).

import { describe, it, expect, vi, beforeAll } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProductCard from "@/components/ProductCard";
import type { DBProduct } from "@/lib/products";

// jsdom n'inclut pas IntersectionObserver (framer-motion whileInView l'utilise).
beforeAll(() => {
  if (typeof globalThis.IntersectionObserver === "undefined") {
    class MockIO {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() { return []; }
    }
    (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = MockIO;
  }
});

vi.mock("@/contexts/ProjectCartContext", () => ({
  useProjectCart: () => ({ addItem: vi.fn() }),
}));
vi.mock("@/contexts/CompareContext", () => ({
  useCompare: () => ({ addToCompare: vi.fn(), isInCompare: () => false }),
}));
vi.mock("@/contexts/FavouritesContext", () => ({
  useFavourites: () => ({ isFavourite: () => false, toggleFavourite: vi.fn() }),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";

const stubProduct = (overrides: Partial<DBProduct> = {}): DBProduct =>
  ({
    id: PRODUCT_ID,
    name: "ANGEL 001",
    name_fr: null,
    name_es: null,
    name_it: null,
    category: "chairs",
    product_slug: "angel-001",
    image_url: "/test.png",
    price_min: 199,
    style_tags: [],
    ambience_tags: [],
    palette_tags: [],
    material_tags: [],
    use_case_tags: [],
    technical_tags: [],
    available_colors: [],
    gallery_urls: [],
    color_variants: [],
    dimension_variants: [],
    product_type_tags: {},
    is_outdoor: true,
    ...overrides,
  } as unknown as DBProduct);

function renderCard(product: DBProduct) {
  return render(
    <MemoryRouter>
      <ProductCard product={product} />
    </MemoryRouter>,
  );
}

describe("ProductCard — canonical URL with owner_brand_slug (9b-2b)", () => {
  it("owner_brand_slug present → href = /products/[brand]/[slug]", () => {
    const { container } = renderCard(
      stubProduct({ owner_brand_slug: "tribu" }),
    );
    const links = container.querySelectorAll("a");
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.getAttribute("href")).toBe("/products/tribu/angel-001");
    }
  });

  it("Régression zéro : owner_brand_slug null → href = /products/[id] legacy", () => {
    const { container } = renderCard(
      stubProduct({ owner_brand_slug: null }),
    );
    const links = container.querySelectorAll("a");
    for (const link of links) {
      expect(link.getAttribute("href")).toBe(`/products/${PRODUCT_ID}`);
    }
  });

  it("Régression zéro : owner_brand_slug undefined → href = /products/[id] legacy", () => {
    const { container } = renderCard(stubProduct({}));
    const links = container.querySelectorAll("a");
    for (const link of links) {
      expect(link.getAttribute("href")).toBe(`/products/${PRODUCT_ID}`);
    }
  });

  it("product_slug vide → fallback /products/[id] même si brand_slug défini", () => {
    const { container } = renderCard(
      stubProduct({ owner_brand_slug: "tribu", product_slug: "" }),
    );
    const links = container.querySelectorAll("a");
    for (const link of links) {
      expect(link.getAttribute("href")).toBe(`/products/${PRODUCT_ID}`);
    }
  });
});
