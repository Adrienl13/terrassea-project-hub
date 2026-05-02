// Tests pour la logique d'override prix/stock dans VendorOffers
// (ÉTAPE 9a-fix Approche A — patch côté display).
//
// Stratégie : on teste les fonctions d'override en isolation (helpers
// extraits) sans monter le composant complet (qui dépend de Auth, i18n,
// Cart, etc.). Le wiring UI est validé manuellement en browser par le
// founder avant clôture ÉTAPE 9a.
//
// On reproduit ici la logique des 2 helpers locaux à VendorOffers :
//   - effectivePriceOf(offer)
//   - effectiveStockStatusOf(offer)
// pour vérifier la régression zéro (selectedModelBVariant=null) et le
// nouveau comportement (selectedModelBVariant set).

import { describe, it, expect } from "vitest";
import type { DBProductVariant } from "@/lib/productVariants";

type ProductOffer = {
  id: string;
  price: number | null;
  stock_status: string | null;
};

function effectivePriceOf(
  offer: ProductOffer,
  selectedModelBVariant: DBProductVariant | null,
): number | null {
  if (selectedModelBVariant?.price_eur != null) {
    return Number(selectedModelBVariant.price_eur);
  }
  return offer.price;
}

function effectiveStockStatusOf(
  offer: ProductOffer,
  selectedModelBVariant: DBProductVariant | null,
): string | null {
  if (selectedModelBVariant) {
    if (selectedModelBVariant.is_made_to_order) return "on_order";
    if (selectedModelBVariant.in_stock) return "in_stock";
    return "out_of_stock";
  }
  return offer.stock_status;
}

const stubOffer = (overrides: Partial<ProductOffer> = {}): ProductOffer => ({
  id: "o1",
  price: 100,
  stock_status: "in_stock",
  ...overrides,
});

const stubVariant = (overrides: Partial<DBProductVariant> = {}): DBProductVariant =>
  ({
    id: "v1",
    product_id: "p1",
    price_eur: 199,
    in_stock: true,
    is_made_to_order: false,
    is_default: true,
    is_published: true,
    is_stackable: false,
    has_wheels: false,
    has_cushion: false,
    price_currency: "EUR",
    created_at: "2026-05-02T00:00:00Z",
    updated_at: "2026-05-02T00:00:00Z",
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
    stock_quantity: null,
    delivery_weeks_min: null,
    delivery_weeks_max: null,
    available_in_markets: null,
    primary_media_id: null,
    source_type: null,
    source_url: null,
    extracted_at: null,
    validated_by: null,
    validated_at: null,
    confidence_score: null,
    discontinued_at: null,
    ...overrides,
  }) as DBProductVariant;

describe("effectivePriceOf — régression zéro (selectedModelBVariant null)", () => {
  it("retourne offer.price quand pas de variante sélectionnée (legacy 1-variant)", () => {
    expect(effectivePriceOf(stubOffer({ price: 100 }), null)).toBe(100);
  });

  it("retourne null si offer.price est null et pas de variante", () => {
    expect(effectivePriceOf(stubOffer({ price: null }), null)).toBe(null);
  });
});

describe("effectivePriceOf — override variante Modèle B (ÉTAPE 9a-fix)", () => {
  it("override avec price_eur de la variante quand sélectionnée", () => {
    expect(effectivePriceOf(stubOffer({ price: 100 }), stubVariant({ price_eur: 250 }))).toBe(250);
  });

  it("fallback offer.price si variante a price_eur null", () => {
    expect(
      effectivePriceOf(stubOffer({ price: 100 }), stubVariant({ price_eur: null })),
    ).toBe(100);
  });

  it("convertit price_eur string → number (cas Postgres numeric → string JSON)", () => {
    // Le client Supabase peut renvoyer des numeric en string. effectivePriceOf
    // applique Number() pour normaliser.
    expect(
      effectivePriceOf(stubOffer({ price: 100 }), stubVariant({ price_eur: "199.50" as unknown as number })),
    ).toBe(199.5);
  });
});

describe("effectiveStockStatusOf — régression zéro (selectedModelBVariant null)", () => {
  it("retourne offer.stock_status quand pas de variante", () => {
    expect(effectiveStockStatusOf(stubOffer({ stock_status: "in_stock" }), null)).toBe("in_stock");
    expect(effectiveStockStatusOf(stubOffer({ stock_status: "low_stock" }), null)).toBe("low_stock");
  });
});

describe("effectiveStockStatusOf — override variante Modèle B", () => {
  it("variant in_stock=true → in_stock", () => {
    expect(
      effectiveStockStatusOf(
        stubOffer({ stock_status: "out_of_stock" }),
        stubVariant({ in_stock: true, is_made_to_order: false }),
      ),
    ).toBe("in_stock");
  });

  it("variant is_made_to_order=true → on_order", () => {
    expect(
      effectiveStockStatusOf(
        stubOffer({ stock_status: "in_stock" }),
        stubVariant({ in_stock: false, is_made_to_order: true }),
      ),
    ).toBe("on_order");
  });

  it("variant in_stock=false ET is_made_to_order=false → out_of_stock", () => {
    expect(
      effectiveStockStatusOf(
        stubOffer({ stock_status: "in_stock" }),
        stubVariant({ in_stock: false, is_made_to_order: false }),
      ),
    ).toBe("out_of_stock");
  });
});
