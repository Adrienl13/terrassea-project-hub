// Tests pour SourcingAlerts — chantier Modèle B variants ÉTAPE 9a-fix-2-ζ.
//
// Avant le fix : computeAlerts ne consultait que selectedSupplier.stockStatus
// (offer-level). Les variants Modèle B out_of_stock / made_to_order
// passaient sous le radar → bandeau "All items sourced and available"
// affiché à tort.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SourcingAlerts from "@/components/project/SourcingAlerts";
import type { CartItem } from "@/contexts/ProjectCartContext";
import type { DBProductVariant } from "@/lib/productVariants";

const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
const VARIANT_A = "22222222-2222-4222-8222-222222222222";
const VARIANT_B = "33333333-3333-4333-8333-333333333333";

const stubProduct = (overrides: Record<string, unknown> = {}) =>
  ({
    id: PRODUCT_ID,
    name: "Test",
    category: "tables",
    stock_status: "in_stock",
    ...overrides,
  }) as unknown as CartItem["product"];

const stubVariant = (overrides: Partial<DBProductVariant> = {}): DBProductVariant =>
  ({
    id: VARIANT_A,
    product_id: PRODUCT_ID,
    in_stock: true,
    is_made_to_order: false,
    stock_quantity: null,
    price_eur: 100,
    is_published: true,
    ...overrides,
  } as unknown as DBProductVariant);

const SUPPLIER = {
  offerId: "o1",
  partnerId: "p1",
  partnerName: "X",
  price: 100,
  stockStatus: "in_stock",
  stockQuantity: null,
  deliveryDelayDays: null,
  purchaseType: null,
  score: 0,
};

const stubItem = (overrides: Partial<CartItem> = {}): CartItem =>
  ({
    product: stubProduct(),
    quantity: 1,
    selectedSupplier: SUPPLIER,
    ...overrides,
  } as CartItem);

describe("SourcingAlerts — ζ variant-aware availability", () => {
  it("Tous items in_stock + supplier sélectionné → bandeau success", () => {
    const items = [
      stubItem({ selectedModelBVariantId: VARIANT_A }),
      stubItem({ selectedModelBVariantId: VARIANT_B }),
    ];
    const variants = [
      stubVariant({ id: VARIANT_A, in_stock: true, is_made_to_order: false }),
      stubVariant({ id: VARIANT_B, in_stock: true, is_made_to_order: false }),
    ];
    render(<SourcingAlerts items={items} variants={variants} />);
    expect(
      screen.getByText(/All items sourced and available/),
    ).toBeInTheDocument();
  });

  it("1 variant out_of_stock + supplier sélectionné → bandeau warning 'availability confirmation' (PAS success)", () => {
    const items = [
      stubItem({ selectedModelBVariantId: VARIANT_A }),
      stubItem({ selectedModelBVariantId: VARIANT_B }),
    ];
    const variants = [
      stubVariant({ id: VARIANT_A, in_stock: true }),
      stubVariant({ id: VARIANT_B, in_stock: false, is_made_to_order: false }),
    ];
    render(<SourcingAlerts items={items} variants={variants} />);
    expect(
      screen.getByText(/1 item requires availability confirmation/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/All items sourced and available/),
    ).not.toBeInTheDocument();
  });

  it("2 variants made_to_order → bandeau warning '2 items require availability confirmation'", () => {
    const items = [
      stubItem({ selectedModelBVariantId: VARIANT_A }),
      stubItem({ selectedModelBVariantId: VARIANT_B }),
    ];
    const variants = [
      stubVariant({ id: VARIANT_A, in_stock: false, is_made_to_order: true }),
      stubVariant({ id: VARIANT_B, in_stock: false, is_made_to_order: true }),
    ];
    render(<SourcingAlerts items={items} variants={variants} />);
    expect(
      screen.getByText(/2 items require availability confirmation/),
    ).toBeInTheDocument();
  });

  it("Régression zéro legacy : items sans variant_id, product.stock_status='in_stock' → bandeau success", () => {
    const items = [
      stubItem({ product: stubProduct({ stock_status: "in_stock" }) }),
      stubItem({ product: stubProduct({ stock_status: "available" }) }),
    ];
    render(<SourcingAlerts items={items} />);
    expect(
      screen.getByText(/All items sourced and available/),
    ).toBeInTheDocument();
  });

  it("Régression zéro legacy : item product.stock_status='out_of_stock' → bandeau warning", () => {
    const items = [
      stubItem({ product: stubProduct({ stock_status: "in_stock" }) }),
      stubItem({ product: stubProduct({ stock_status: "out_of_stock" }) }),
    ];
    render(<SourcingAlerts items={items} />);
    expect(
      screen.getByText(/1 item requires availability confirmation/),
    ).toBeInTheDocument();
  });
});
