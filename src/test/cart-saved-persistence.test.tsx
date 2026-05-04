// Tests d'intégration pour saved_carts persistence + rehydration —
// ÉTAPE 9a-fix-2-γ-2.
//
// Vérifie que :
//   - Le serializer de cart_data inclut selectedModelBVariantId (pour upsert
//     dans saved_carts.cart_data jsonb).
//   - À la rehydration depuis saved_carts, le selectedModelBVariantId est
//     reconstruit côté client.
//   - Backward compat : un saved_cart pré-β (sans selectedModelBVariantId
//     dans cart_data) rehydrate sans crash, le champ devient undefined.
//
// Stratégie : intercepte les calls supabase.from() pour capturer le
// payload upsert vers saved_carts et stuber la réponse maybeSingle()
// avec un cart_data fixture.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import {
  ProjectCartProvider,
  useProjectCart,
} from "@/contexts/ProjectCartContext";
import type { DBProduct } from "@/lib/products";

// ── Mock supabase: capture upserts + servir maybeSingle ─────────────────────

interface UpsertCall {
  table: string;
  payload: Record<string, unknown>;
}

const upsertCalls: UpsertCall[] = [];
let savedCartFixture: { cart_data: unknown[] | null; notes: string | null } | null = null;
let productsFixture: Record<string, unknown>[] = [];

function makeChain(table: string) {
  // Default data per table
  const dataFor = (): unknown[] | null => {
    if (table === "products") return productsFixture;
    return [];
  };

  const chain: any = {};
  const passthrough = () => chain;
  chain.select = passthrough;
  chain.eq = passthrough;
  chain.in = passthrough;
  chain.is = passthrough;
  chain.neq = passthrough;
  chain.order = passthrough;
  chain.limit = passthrough;
  chain.maybeSingle = () =>
    Promise.resolve({
      data: table === "saved_carts" ? savedCartFixture : null,
      error: null,
    });
  // Awaitable directly (PromiseLike)
  chain.then = (resolve: (v: { data: unknown[] | null; error: null }) => void) =>
    resolve({ data: dataFor(), error: null });
  return chain;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      ...makeChain(table),
      upsert: (payload: Record<string, unknown>) => {
        upsertCalls.push({ table, payload });
        return Promise.resolve({ error: null });
      },
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
  },
}));

const FAKE_USER_ID = "11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: FAKE_USER_ID },
    profile: null,
  }),
}));

vi.mock("sonner", () => ({
  toast: { warning: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

// ── Fixtures ────────────────────────────────────────────────────────────────

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
    ...overrides,
  } as unknown as DBProduct);

function TestConsumer() {
  const { items, addItem } = useProjectCart();

  return (
    <div>
      <div data-testid="item-count">{items.length}</div>
      <div data-testid="items-json">
        {JSON.stringify(
          items.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
            variantId: i.selectedModelBVariantId ?? null,
          })),
        )}
      </div>
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
    </div>
  );
}

beforeEach(() => {
  upsertCalls.length = 0;
  savedCartFixture = null;
  productsFixture = [];
  localStorage.clear();
  vi.clearAllMocks();
});

// ── saveCart preserves variant_id ───────────────────────────────────────────

describe("saved_carts — γ-2 persistence + rehydration", () => {
  it("upsert payload contient selectedModelBVariantId pour les 2 variants Modèle B", async () => {
    vi.useFakeTimers();
    render(
      <ProjectCartProvider>
        <TestConsumer />
      </ProjectCartProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByTestId("add-variant-a"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("add-variant-b"));
    });

    expect(screen.getByTestId("item-count").textContent).toBe("2");

    // Le sync est debounced 1500ms — flush via fake timers
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    vi.useRealTimers();

    // Capture le dernier upsert vers saved_carts
    const savedUpserts = upsertCalls.filter((c) => c.table === "saved_carts");
    expect(savedUpserts.length).toBeGreaterThan(0);
    const last = savedUpserts[savedUpserts.length - 1];
    const cartData = last.payload.cart_data as Array<Record<string, unknown>>;
    expect(cartData).toHaveLength(2);
    const variantIds = cartData.map((ci) => ci.selectedModelBVariantId).sort();
    expect(variantIds).toEqual([VARIANT_A, VARIANT_B].sort());
  });

  it("rehydration depuis saved_carts restitue selectedModelBVariantId", async () => {
    savedCartFixture = {
      cart_data: [
        { productId: PRODUCT_ID, quantity: 2, selectedModelBVariantId: VARIANT_A },
      ],
      notes: null,
    };
    productsFixture = [
      {
        id: PRODUCT_ID,
        name: "Test Chair",
        category: "chairs",
        price_min: 100,
        publish_status: "published",
        duplicate_of: null,
        availability_type: "in_stock",
        partner_id: null,
      },
    ];

    render(
      <ProjectCartProvider>
        <TestConsumer />
      </ProjectCartProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("item-count").textContent).toBe("1"),
    );

    const items = JSON.parse(
      screen.getByTestId("items-json").textContent ?? "[]",
    );
    expect(items).toHaveLength(1);
    expect(items[0].variantId).toBe(VARIANT_A);
    expect(items[0].quantity).toBe(2);
  });

  it("backward compat : saved_cart pré-β (sans variant_id) rehydrate avec variantId=null", async () => {
    savedCartFixture = {
      cart_data: [
        // Format pré-β : pas de selectedModelBVariantId
        { productId: PRODUCT_ID, quantity: 3 },
      ],
      notes: null,
    };
    productsFixture = [
      {
        id: PRODUCT_ID,
        name: "Test Chair",
        category: "chairs",
        price_min: 100,
        publish_status: "published",
        duplicate_of: null,
        availability_type: "in_stock",
        partner_id: null,
      },
    ];

    render(
      <ProjectCartProvider>
        <TestConsumer />
      </ProjectCartProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("item-count").textContent).toBe("1"),
    );

    const items = JSON.parse(
      screen.getByTestId("items-json").textContent ?? "[]",
    );
    expect(items[0].variantId).toBe(null);
    expect(items[0].quantity).toBe(3);
  });

  it("cas défensif : variant rehydratée mais supprimée DB (pas de prix variant disponible) → fallback price_min sans crash", async () => {
    // Simule : cart persisté avec variant_id, mais variant has been deleted /
    // is unavailable. fetchVariantsByIds renvoie []. getEffectiveCartPrice
    // doit tomber sur price_min.
    savedCartFixture = {
      cart_data: [
        { productId: PRODUCT_ID, quantity: 1, selectedModelBVariantId: VARIANT_A },
      ],
      notes: null,
    };
    productsFixture = [
      {
        id: PRODUCT_ID,
        name: "Test Chair",
        category: "chairs",
        price_min: 100,
        publish_status: "published",
        duplicate_of: null,
        availability_type: "in_stock",
        partner_id: null,
      },
    ];

    render(
      <ProjectCartProvider>
        <TestConsumer />
      </ProjectCartProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("item-count").textContent).toBe("1"),
    );

    const items = JSON.parse(
      screen.getByTestId("items-json").textContent ?? "[]",
    );
    // Variant_id préservé même si la variant ne sera pas trouvée downstream
    expect(items[0].variantId).toBe(VARIANT_A);
    expect(items[0].quantity).toBe(1);
    // Pas de crash → la rehydration termine, l'item reste dans le cart.
  });

  it("rehydration mixte : 2 items 1 Modèle B + 1 legacy → ids préservés correctement", async () => {
    savedCartFixture = {
      cart_data: [
        { productId: PRODUCT_ID, quantity: 1, selectedModelBVariantId: VARIANT_A },
        { productId: PRODUCT_ID, quantity: 5 }, // legacy
      ],
      notes: null,
    };
    productsFixture = [
      {
        id: PRODUCT_ID,
        name: "Test Chair",
        category: "chairs",
        price_min: 100,
        publish_status: "published",
        duplicate_of: null,
        availability_type: "in_stock",
        partner_id: null,
      },
    ];

    render(
      <ProjectCartProvider>
        <TestConsumer />
      </ProjectCartProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("item-count").textContent).toBe("2"),
    );

    const items = JSON.parse(
      screen.getByTestId("items-json").textContent ?? "[]",
    );
    const variantIds = items.map((i: { variantId: string | null }) => i.variantId).sort();
    expect(variantIds).toEqual([VARIANT_A, null].sort());
  });
});
