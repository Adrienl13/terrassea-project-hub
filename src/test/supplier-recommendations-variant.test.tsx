// Tests pour SupplierRecommendations — chantier Modèle B variants
// ÉTAPE 9a-fix-2-δ-1-bis Phase 2 (Bug B).
//
// Avant le fix, le composant :
//   - utilisait `offer.price` brut (sans commission, sans variant)
//   - matchait `currentItem` par product_id seul (2 variants partagent
//     le même item, écrasement supplier mutuel)
//   - appelait `selectSupplier(productId, ...)` sans variantId
//
// Le fix :
//   - prop `variantId?: string`
//   - useQuery fetchVariantsByIds → applique commission au prix variant
//   - currentItem matche via cartItemMatchesIdentity quand variantId fourni
//   - effectivePriceOf(offer) = variant.price_eur ?? offer.price
//   - selectSupplier transmet variantId

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import SupplierRecommendations from "@/components/project/SupplierRecommendations";
import type { ScoredOffer } from "@/engine/supplierEngine";

// ── Mocks ───────────────────────────────────────────────────────────────────

const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
const VARIANT_A = "22222222-2222-4222-8222-222222222222";
const PARTNER_ID = "33333333-3333-4333-8333-333333333333";

let scoredOffersFixture: ScoredOffer[] = [];

vi.mock("@/engine/supplierEngine", async () => {
  const actual = await vi.importActual<typeof import("@/engine/supplierEngine")>(
    "@/engine/supplierEngine",
  );
  return {
    ...actual,
    scoreSupplierOffers: vi.fn(() => Promise.resolve(scoredOffersFixture)),
  };
});

const selectSupplierMock = vi.fn();
let cartItemsFixture: Array<{ product: { id: string }; selectedModelBVariantId?: string; quantity: number; selectedDimension?: string; selectedSupplier?: { offerId: string } }> = [];

vi.mock("@/contexts/ProjectCartContext", () => ({
  useProjectCart: () => ({
    items: cartItemsFixture,
    selectSupplier: selectSupplierMock,
  }),
}));

let variantFixture:
  | {
      id: string;
      price_eur: number | null;
      in_stock?: boolean;
      is_made_to_order?: boolean;
      stock_quantity?: number | null;
    }
  | null = null;

vi.mock("@/lib/productVariants", () => ({
  fetchVariantsByIds: vi.fn(async (ids: string[]) => {
    if (ids.length === 0) return [];
    if (variantFixture && ids.includes(variantFixture.id)) {
      return [variantFixture];
    }
    return [];
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("sonner", () => ({
  toast: { warning: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

// ── Fixtures ────────────────────────────────────────────────────────────────

function makeScoredOffer(overrides: Partial<ScoredOffer> = {}): ScoredOffer {
  return {
    id: "offer-1",
    product_id: PRODUCT_ID,
    partner_id: PARTNER_ID,
    price: 199,
    pricing_mode: "fixed",
    stock_status: "in_stock",
    stock_quantity: 10,
    delivery_delay_days: 14,
    purchase_type: "direct",
    is_default: true,
    is_active: true,
    moq: 1,
    partner: {
      id: PARTNER_ID,
      name: "Verified Supplier",
      slug: "verified",
      country: "FR",
      partner_type: "manufacturer",
      logo_url: null,
    } as ScoredOffer["partner"],
    badges: ["recommended"],
    isRecommended: true,
    recommendationReason: null,
    scores: { consistency: 80, availability: 90, leadTime: 70, price: 60, reputation: 50, total: 75 },
    ...overrides,
  } as ScoredOffer;
}

function renderWithQuery() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <SupplierRecommendations
          productId={PRODUCT_ID}
          productName="Demo Modèle B"
          variantId={VARIANT_A}
        />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

function renderLegacy() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <SupplierRecommendations
          productId={PRODUCT_ID}
          productName="Legacy Product"
        />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  scoredOffersFixture = [];
  cartItemsFixture = [];
  variantFixture = null;
  selectSupplierMock.mockClear();
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe("SupplierRecommendations — variantId variant-aware (δ-1-bis Bug B)", () => {
  it("variantId fourni + variant.price_eur=322.92 → display affiche €322.92 (pas €199 brut)", async () => {
    scoredOffersFixture = [makeScoredOffer({ price: 199 })];
    variantFixture = { id: VARIANT_A, price_eur: 322.92 };
    cartItemsFixture = [
      {
        product: { id: PRODUCT_ID },
        selectedModelBVariantId: VARIANT_A,
        quantity: 1,
      },
    ];

    renderWithQuery();

    // Wait for the variant useQuery to resolve and re-render
    await waitFor(() => {
      expect(screen.getByText("€322.92")).toBeInTheDocument();
    });
    // Ensure the raw price is NOT displayed
    expect(screen.queryByText("€199.00")).not.toBeInTheDocument();
  });

  it("Régression zéro legacy : pas de variantId → affiche offer.price brut comme avant", async () => {
    scoredOffersFixture = [makeScoredOffer({ price: 214.92 })];
    cartItemsFixture = [
      { product: { id: PRODUCT_ID }, quantity: 1 },
    ];

    renderLegacy();

    await waitFor(() => {
      expect(screen.getByText("€214.92")).toBeInTheDocument();
    });
  });

  it("selectSupplier appelé avec variantId quand un supplier est sélectionné", async () => {
    scoredOffersFixture = [makeScoredOffer({ price: 199 })];
    variantFixture = { id: VARIANT_A, price_eur: 322.92 };
    cartItemsFixture = [
      {
        product: { id: PRODUCT_ID },
        selectedModelBVariantId: VARIANT_A,
        quantity: 1,
      },
    ];

    renderWithQuery();

    await waitFor(() => {
      expect(screen.getByText("supplierRecs.selectSupplier")).toBeInTheDocument();
    });

    act(() => {
      fireEvent.click(screen.getByText("supplierRecs.selectSupplier"));
    });

    expect(selectSupplierMock).toHaveBeenCalledTimes(1);
    const [calledProductId, calledSupplier, calledVariantId] = selectSupplierMock.mock.calls[0];
    expect(calledProductId).toBe(PRODUCT_ID);
    expect(calledVariantId).toBe(VARIANT_A);
    // L'effective price (322.92) doit être passé au supplier, pas le brut 199
    expect(calledSupplier.price).toBe(322.92);
  });

  it("variantId fourni mais variant non trouvée (deleted DB) → fallback offer.price legacy", async () => {
    scoredOffersFixture = [makeScoredOffer({ price: 199 })];
    variantFixture = null; // variant deleted in DB
    cartItemsFixture = [
      {
        product: { id: PRODUCT_ID },
        selectedModelBVariantId: VARIANT_A,
        quantity: 1,
      },
    ];

    renderWithQuery();

    // Should display offer.price brut as fallback (€199.00)
    await waitFor(() => {
      expect(screen.getByText("€199.00")).toBeInTheDocument();
    });
  });

  // ── ε : stock variant-aware ─────────────────────────────────────────────
  it("ε : variant.is_made_to_order=true → badge stock affiche 'made_to_order'", async () => {
    scoredOffersFixture = [makeScoredOffer({ stock_status: "in_stock", stock_quantity: 50 })];
    variantFixture = { id: VARIANT_A, price_eur: 322.92, is_made_to_order: true, in_stock: false, stock_quantity: null };
    cartItemsFixture = [
      { product: { id: PRODUCT_ID }, selectedModelBVariantId: VARIANT_A, quantity: 1 },
    ];

    renderWithQuery();

    await waitFor(() => {
      // effectiveStockQuantityOf returns null (variant.stock_quantity null)
      // → display fallback to status string "made_to_order"
      expect(screen.getByText("made_to_order")).toBeInTheDocument();
    });
    // L'offer.stock_quantity=50 ne doit PAS apparaître
    expect(screen.queryByText("supplierRecs.units")).not.toBeInTheDocument();
  });

  it("ε : variant.in_stock=false + !is_made_to_order → badge 'out_of_stock'", async () => {
    scoredOffersFixture = [makeScoredOffer({ stock_status: "in_stock", stock_quantity: 50 })];
    variantFixture = { id: VARIANT_A, price_eur: 100, is_made_to_order: false, in_stock: false, stock_quantity: null };
    cartItemsFixture = [
      { product: { id: PRODUCT_ID }, selectedModelBVariantId: VARIANT_A, quantity: 1 },
    ];

    renderWithQuery();

    await waitFor(() => {
      expect(screen.getByText("out_of_stock")).toBeInTheDocument();
    });
  });

  it("ε régression zéro : pas de variantId → badge utilise offer.stock_status legacy", async () => {
    scoredOffersFixture = [makeScoredOffer({ stock_status: "in_stock", stock_quantity: null })];
    cartItemsFixture = [{ product: { id: PRODUCT_ID }, quantity: 1 }];

    renderLegacy();

    await waitFor(() => {
      expect(screen.getByText("in_stock")).toBeInTheDocument();
    });
  });
});
