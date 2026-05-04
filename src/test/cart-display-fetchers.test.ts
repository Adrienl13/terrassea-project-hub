// Tests pour les fetchers utilisés par le display panier — γ-1 chantier
// Modèle B variants (ÉTAPE 9a-fix-2-γ-1).
//
// Couvre :
//   - fetchVariantsByIds (batch, commission par partner, N+1 évité)
//   - fetchProductsByIds (commission appliquée upstream)
//
// Le mock supabase reproduit la structure from().select().in() ainsi que
// .eq(...).is(...).neq(...) chaînés, en suivant la table interrogée.

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock supabase: routeur par table ────────────────────────────────────────

type Row = Record<string, unknown>;

interface MockState {
  product_variants: Row[];
  products: Row[];
  partners: Row[];
  partner_subscriptions: Row[];
}

const state: MockState = {
  product_variants: [],
  products: [],
  partners: [],
  partner_subscriptions: [],
};

function makeQuery(table: keyof MockState) {
  let rows = [...state[table]];

  const api = {
    select: () => api,
    eq: (col: string, val: unknown) => {
      rows = rows.filter((r) => r[col] === val);
      return api;
    },
    in: (col: string, vals: unknown[]) => {
      rows = rows.filter((r) => vals.includes(r[col]));
      return api;
    },
    is: (col: string, val: unknown) => {
      if (val === null) {
        rows = rows.filter((r) => r[col] == null);
      }
      return api;
    },
    neq: (col: string, val: unknown) => {
      rows = rows.filter((r) => r[col] !== val);
      return api;
    },
    order: () => api,
    limit: () => api,
    maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
    then: (resolve: (v: { data: Row[]; error: null }) => void) =>
      resolve({ data: rows, error: null }),
  };
  return api;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: keyof MockState) => makeQuery(table),
  },
}));

import { fetchVariantsByIds } from "@/lib/productVariants";
import { fetchProductsByIds } from "@/lib/products";

// ── Fixtures ────────────────────────────────────────────────────────────────

const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
const PRODUCT_2_ID = "22222222-2222-4222-8222-222222222222";
const PARTNER_GROWTH = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PARTNER_BRAND = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const VARIANT_A = "33333333-3333-4333-8333-333333333333";
const VARIANT_B = "44444444-4444-4444-8444-444444444444";
const VARIANT_C = "55555555-5555-4555-8555-555555555555";

beforeEach(() => {
  state.product_variants = [];
  state.products = [];
  state.partners = [];
  state.partner_subscriptions = [];
});

// ── fetchVariantsByIds ──────────────────────────────────────────────────────

describe("fetchVariantsByIds — batch fetch + commission", () => {
  it("ids vides → array vide (pas de query)", async () => {
    const result = await fetchVariantsByIds([]);
    expect(result).toEqual([]);
  });

  it("variants trouvés sans partner → price_eur inchangé (pas de commission)", async () => {
    state.product_variants = [
      { id: VARIANT_A, product_id: PRODUCT_ID, price_eur: 100 },
    ];
    state.products = [{ id: PRODUCT_ID, partner_id: null }];
    const result = await fetchVariantsByIds([VARIANT_A]);
    expect(result).toHaveLength(1);
    expect(result[0].price_eur).toBe(100);
  });

  it("variant avec partner Growth (5%) → price_eur majoré (322.92 EUR)", async () => {
    state.product_variants = [
      { id: VARIANT_A, product_id: PRODUCT_ID, price_eur: 307.54 },
    ];
    state.products = [{ id: PRODUCT_ID, partner_id: PARTNER_GROWTH }];
    state.partners = [{ id: PARTNER_GROWTH, plan: "growth" }];
    const result = await fetchVariantsByIds([VARIANT_A]);
    expect(result[0].price_eur).toBe(322.92);
  });

  it("variant avec brand_member (0% commission) → prix inchangé", async () => {
    state.product_variants = [
      { id: VARIANT_A, product_id: PRODUCT_ID, price_eur: 200 },
    ];
    state.products = [{ id: PRODUCT_ID, partner_id: PARTNER_BRAND }];
    state.partners = [{ id: PARTNER_BRAND, plan: "brand_member" }];
    const result = await fetchVariantsByIds([VARIANT_A]);
    expect(result[0].price_eur).toBe(200);
  });

  it("override commission_rate via partner_subscriptions → utilisé en priorité", async () => {
    state.product_variants = [
      { id: VARIANT_A, product_id: PRODUCT_ID, price_eur: 100 },
    ];
    state.products = [{ id: PRODUCT_ID, partner_id: PARTNER_GROWTH }];
    state.partners = [{ id: PARTNER_GROWTH, plan: "growth" }];
    state.partner_subscriptions = [
      { partner_id: PARTNER_GROWTH, commission_rate: 10 },
    ];
    const result = await fetchVariantsByIds([VARIANT_A]);
    expect(result[0].price_eur).toBe(110);
  });

  it("variant avec price_eur null → reste null (pas de Number(null))", async () => {
    state.product_variants = [
      { id: VARIANT_A, product_id: PRODUCT_ID, price_eur: null },
    ];
    state.products = [{ id: PRODUCT_ID, partner_id: PARTNER_GROWTH }];
    state.partners = [{ id: PARTNER_GROWTH, plan: "growth" }];
    const result = await fetchVariantsByIds([VARIANT_A]);
    expect(result[0].price_eur).toBe(null);
  });

  it("3 variants de 2 products distincts (1 partner, 1 sans) → commission appliquée correctement par partner", async () => {
    state.product_variants = [
      { id: VARIANT_A, product_id: PRODUCT_ID, price_eur: 100 },
      { id: VARIANT_B, product_id: PRODUCT_ID, price_eur: 150 },
      { id: VARIANT_C, product_id: PRODUCT_2_ID, price_eur: 200 },
    ];
    state.products = [
      { id: PRODUCT_ID, partner_id: PARTNER_GROWTH },
      { id: PRODUCT_2_ID, partner_id: null },
    ];
    state.partners = [{ id: PARTNER_GROWTH, plan: "growth" }];
    const result = await fetchVariantsByIds([VARIANT_A, VARIANT_B, VARIANT_C]);
    const byId = new Map(result.map((v) => [v.id, v]));
    expect(byId.get(VARIANT_A)?.price_eur).toBe(105);
    expect(byId.get(VARIANT_B)?.price_eur).toBe(157.5);
    expect(byId.get(VARIANT_C)?.price_eur).toBe(200);
  });
});

// ── fetchProductsByIds ──────────────────────────────────────────────────────

describe("fetchProductsByIds — commission appliquée upstream (γ-1 hydration)", () => {
  it("ids vides → array vide", async () => {
    const result = await fetchProductsByIds([]);
    expect(result).toEqual([]);
  });

  it("product avec partner Growth (5%) → price_min majoré pour hydration cart", async () => {
    state.products = [
      {
        id: PRODUCT_ID,
        partner_id: PARTNER_GROWTH,
        price_min: 100,
        price_max: 200,
        publish_status: "published",
        duplicate_of: null,
        availability_type: "in_stock",
        category: "tables",
        name: "Test",
      },
    ];
    state.partners = [{ id: PARTNER_GROWTH, plan: "growth" }];
    const result = await fetchProductsByIds([PRODUCT_ID]);
    expect(result).toHaveLength(1);
    expect(result[0].price_min).toBe(105);
    expect(result[0].price_max).toBe(210);
  });

  it("product sans partner_id → price inchangé", async () => {
    state.products = [
      {
        id: PRODUCT_ID,
        partner_id: null,
        price_min: 100,
        publish_status: "published",
        duplicate_of: null,
        availability_type: "in_stock",
        category: "tables",
        name: "Test",
      },
    ];
    const result = await fetchProductsByIds([PRODUCT_ID]);
    expect(result[0].price_min).toBe(100);
  });
});
