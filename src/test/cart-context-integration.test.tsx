// Tests d'intégration pour ProjectCartContext — chantier Modèle B variants
// ÉTAPE 9a-fix-2-β.
//
// Stratégie : render le Provider avec un consumer de test qui invoque
// addItem / selectSupplier dans des boutons. Verifie le comportement
// merge identity (product_id, variant_id) end-to-end via le state du cart.
//
// Mocks supabase (saved_carts) + auth pour isoler le test du backend.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import {
  ProjectCartProvider,
  useProjectCart,
  type CartItem,
} from "@/contexts/ProjectCartContext";
import type { DBProduct } from "@/lib/products";

// Mock supabase pour ne pas hit le backend pendant le test
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          in: () => Promise.resolve({ data: [], error: null }),
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
      upsert: () => Promise.resolve({ error: null }),
    }),
  },
}));

// Mock useAuth pour simuler un user non-connecté (cart purement local)
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    profile: null,
  }),
}));

// Mock toast pour ne pas crasher
vi.mock("sonner", () => ({
  toast: { warning: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
const VARIANT_A = "22222222-2222-4222-8222-222222222222";
const VARIANT_B = "33333333-3333-4333-8333-333333333333";

const stubProduct = (overrides: Partial<DBProduct> = {}): DBProduct =>
  ({
    id: PRODUCT_ID,
    name: "Test Chair",
    category: "chairs",
    price_min: 100,
    price_max: null,
    publish_status: "published",
    color_variants: [],
    dimension_variants: [],
    ...overrides,
  } as unknown as DBProduct);

const SUPPLIER_FIXTURE = {
  offerId: "o1",
  partnerId: "p1",
  partnerName: "X",
  price: 100,
  stockStatus: null,
  stockQuantity: null,
  deliveryDelayDays: null,
  purchaseType: null,
  score: 0,
};

// Test consumer that exposes addItem + items via DOM
function TestConsumer({ onItemsChange }: { onItemsChange?: (items: CartItem[]) => void }) {
  const { items, addItem, removeItem, updateQuantity, clearSupplier, selectSupplier } =
    useProjectCart();

  // Notify parent of items changes
  if (onItemsChange) onItemsChange(items);

  return (
    <div>
      <div data-testid="item-count">{items.length}</div>
      <div data-testid="items-json">{JSON.stringify(items.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
        variantId: i.selectedModelBVariantId ?? null,
        supplier: i.selectedSupplier?.partnerName ?? null,
      })))}</div>
      <button
        data-testid="add-variant-a"
        onClick={() =>
          addItem(stubProduct(), undefined, 1, undefined, undefined, undefined, VARIANT_A)
        }
      >
        Add A
      </button>
      <button
        data-testid="add-variant-b"
        onClick={() =>
          addItem(stubProduct(), undefined, 1, undefined, undefined, undefined, VARIANT_B)
        }
      >
        Add B
      </button>
      <button
        data-testid="add-legacy"
        onClick={() => addItem(stubProduct())}
      >
        Add legacy
      </button>
      <button
        data-testid="remove-variant-a"
        onClick={() => removeItem(PRODUCT_ID, VARIANT_A)}
      >
        Remove A
      </button>
      <button
        data-testid="remove-legacy"
        onClick={() => removeItem(PRODUCT_ID)}
      >
        Remove legacy
      </button>
      <button
        data-testid="qty-variant-a-5"
        onClick={() => updateQuantity(PRODUCT_ID, 5, undefined, VARIANT_A)}
      >
        Qty A=5
      </button>
      <button
        data-testid="qty-legacy-7"
        onClick={() => updateQuantity(PRODUCT_ID, 7)}
      >
        Qty legacy=7
      </button>
      <button
        data-testid="select-supplier-a"
        onClick={() => selectSupplier(PRODUCT_ID, SUPPLIER_FIXTURE, VARIANT_A)}
      >
        Supplier A
      </button>
      <button
        data-testid="select-supplier-b"
        onClick={() => selectSupplier(PRODUCT_ID, { ...SUPPLIER_FIXTURE, partnerName: "Y" }, VARIANT_B)}
      >
        Supplier B
      </button>
      <button
        data-testid="clear-supplier-a"
        onClick={() => clearSupplier(PRODUCT_ID, VARIANT_A)}
      >
        Clear A supplier
      </button>
      <button
        data-testid="clear-supplier-legacy"
        onClick={() => clearSupplier(PRODUCT_ID)}
      >
        Clear legacy supplier
      </button>
    </div>
  );
}

function renderCart() {
  return render(
    <ProjectCartProvider>
      <TestConsumer />
    </ProjectCartProvider>,
  );
}

describe("ProjectCartContext integration — Modèle B variant_id propagation", () => {
  beforeEach(() => {
    // Clean localStorage between tests
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("Add to cart avec variant_id → l'item porte selectedModelBVariantId", () => {
    renderCart();
    act(() => {
      fireEvent.click(screen.getByTestId("add-variant-a"));
    });
    expect(screen.getByTestId("item-count").textContent).toBe("1");
    const items = JSON.parse(screen.getByTestId("items-json").textContent ?? "[]");
    expect(items).toHaveLength(1);
    expect(items[0].variantId).toBe(VARIANT_A);
    expect(items[0].quantity).toBe(1);
  });

  it("Add 2 variants distinctes du même product → 2 lignes séparées", () => {
    renderCart();
    act(() => {
      fireEvent.click(screen.getByTestId("add-variant-a"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("add-variant-b"));
    });
    expect(screen.getByTestId("item-count").textContent).toBe("2");
    const items = JSON.parse(screen.getByTestId("items-json").textContent ?? "[]");
    expect(items).toHaveLength(2);
    const variantIds = items.map((i: { variantId: string }) => i.variantId).sort();
    expect(variantIds).toEqual([VARIANT_A, VARIANT_B].sort());
    expect(items.every((i: { quantity: number }) => i.quantity === 1)).toBe(true);
  });

  it("Add 2 fois la même variant → 1 ligne avec quantity=2", () => {
    renderCart();
    act(() => {
      fireEvent.click(screen.getByTestId("add-variant-a"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("add-variant-a"));
    });
    expect(screen.getByTestId("item-count").textContent).toBe("1");
    const items = JSON.parse(screen.getByTestId("items-json").textContent ?? "[]");
    expect(items).toHaveLength(1);
    expect(items[0].variantId).toBe(VARIANT_A);
    expect(items[0].quantity).toBe(2);
  });

  it("Régression zéro legacy : 2 add sans variant_id → 1 ligne quantity=2", () => {
    renderCart();
    act(() => {
      fireEvent.click(screen.getByTestId("add-legacy"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("add-legacy"));
    });
    expect(screen.getByTestId("item-count").textContent).toBe("1");
    const items = JSON.parse(screen.getByTestId("items-json").textContent ?? "[]");
    expect(items).toHaveLength(1);
    expect(items[0].variantId).toBe(null);
    expect(items[0].quantity).toBe(2);
  });

  it("Modèle B + legacy même product → 2 lignes distinctes (cas défensif)", () => {
    renderCart();
    act(() => {
      fireEvent.click(screen.getByTestId("add-variant-a"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("add-legacy"));
    });
    expect(screen.getByTestId("item-count").textContent).toBe("2");
    const items = JSON.parse(screen.getByTestId("items-json").textContent ?? "[]");
    expect(items).toHaveLength(2);
    const variantIds = items.map((i: { variantId: string | null }) => i.variantId).sort();
    expect(variantIds).toEqual([null, VARIANT_A].sort());
  });
});

// ── δ-1-bis Bug A : removeItem / updateQuantity / clearSupplier variant-aware ─

describe("Bug A — composite identity sur removeItem / updateQuantity / clearSupplier (δ-1-bis)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("removeItem(productId, variantId) → ne supprime QUE cette variant, l'autre variant du même product reste", () => {
    renderCart();
    act(() => fireEvent.click(screen.getByTestId("add-variant-a")));
    act(() => fireEvent.click(screen.getByTestId("add-variant-b")));
    expect(screen.getByTestId("item-count").textContent).toBe("2");

    act(() => fireEvent.click(screen.getByTestId("remove-variant-a")));

    expect(screen.getByTestId("item-count").textContent).toBe("1");
    const items = JSON.parse(screen.getByTestId("items-json").textContent ?? "[]");
    expect(items).toHaveLength(1);
    expect(items[0].variantId).toBe(VARIANT_B);
  });

  it("updateQuantity(productId, qty, _, variantId) → ne modifie QUE cette variant", () => {
    renderCart();
    act(() => fireEvent.click(screen.getByTestId("add-variant-a")));
    act(() => fireEvent.click(screen.getByTestId("add-variant-b")));

    act(() => fireEvent.click(screen.getByTestId("qty-variant-a-5")));

    const items = JSON.parse(screen.getByTestId("items-json").textContent ?? "[]");
    expect(items).toHaveLength(2);
    const aQty = items.find((i: { variantId: string | null; quantity: number }) => i.variantId === VARIANT_A)?.quantity;
    const bQty = items.find((i: { variantId: string | null; quantity: number }) => i.variantId === VARIANT_B)?.quantity;
    expect(aQty).toBe(5);
    expect(bQty).toBe(1); // unchanged
  });

  it("clearSupplier(productId, variantId) → ne touche QUE le supplier de cette variant", () => {
    renderCart();
    act(() => fireEvent.click(screen.getByTestId("add-variant-a")));
    act(() => fireEvent.click(screen.getByTestId("add-variant-b")));
    act(() => fireEvent.click(screen.getByTestId("select-supplier-a")));
    act(() => fireEvent.click(screen.getByTestId("select-supplier-b")));

    let items = JSON.parse(screen.getByTestId("items-json").textContent ?? "[]");
    const findByVariant = (vId: string) =>
      items.find((i: { variantId: string | null; supplier: string | null }) => i.variantId === vId);
    expect(findByVariant(VARIANT_A).supplier).toBe("X");
    expect(findByVariant(VARIANT_B).supplier).toBe("Y");

    act(() => fireEvent.click(screen.getByTestId("clear-supplier-a")));

    items = JSON.parse(screen.getByTestId("items-json").textContent ?? "[]");
    expect(items.find((i: { variantId: string | null; supplier: string | null }) => i.variantId === VARIANT_A).supplier).toBe(null);
    expect(items.find((i: { variantId: string | null; supplier: string | null }) => i.variantId === VARIANT_B).supplier).toBe("Y");
  });

  it("Régression zéro legacy : removeItem(productId) sans variantId supprime tous les items du product", () => {
    renderCart();
    // Ajout 2 items legacy + 1 variant ; legacy sont mergés en 1 ligne qty=2
    act(() => fireEvent.click(screen.getByTestId("add-legacy")));
    act(() => fireEvent.click(screen.getByTestId("add-legacy")));
    act(() => fireEvent.click(screen.getByTestId("add-variant-a")));
    expect(screen.getByTestId("item-count").textContent).toBe("2");

    // Remove legacy (sans variantId) → comportement legacy : supprime tous les items
    // avec ce product_id, INCLUANT le variant. C'est le comportement attendu pre-δ.
    act(() => fireEvent.click(screen.getByTestId("remove-legacy")));

    expect(screen.getByTestId("item-count").textContent).toBe("0");
  });

  it("Régression zéro legacy : updateQuantity(productId, qty) sans variantId update tous les items du product", () => {
    renderCart();
    act(() => fireEvent.click(screen.getByTestId("add-legacy")));
    act(() => fireEvent.click(screen.getByTestId("qty-legacy-7")));

    const items = JSON.parse(screen.getByTestId("items-json").textContent ?? "[]");
    expect(items).toHaveLength(1);
    expect(items[0].variantId).toBe(null);
    expect(items[0].quantity).toBe(7);
  });
});
