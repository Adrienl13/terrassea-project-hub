// Tests pour src/lib/cartHelpers.ts — chantier Modèle B variants ÉTAPE 9a-fix-2-α.
// Validate getEffectiveCartPrice avec ses 3 niveaux de priorité.

import { describe, it, expect } from "vitest";
import { getEffectiveCartPrice, cartItemMatchesIdentity, getEffectiveStockStatus } from "@/lib/cartHelpers";
import type { CartItem } from "@/contexts/ProjectCartContext";
import type { DBProductVariant } from "@/lib/productVariants";

const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
const VARIANT_A = "22222222-2222-4222-8222-222222222222";

const stubProduct = (overrides: Record<string, unknown> = {}) =>
  ({
    id: PRODUCT_ID,
    name: "Test Chair",
    category: "chairs",
    price_min: 100,
    price_max: null,
    publish_status: "published",
    ...overrides,
  }) as unknown as CartItem["product"];

const stubVariant = (overrides: Partial<DBProductVariant> = {}): DBProductVariant =>
  ({
    id: VARIANT_A,
    product_id: PRODUCT_ID,
    price_eur: 199,
    price_currency: "EUR",
    in_stock: true,
    is_made_to_order: false,
    is_default: false,
    is_published: true,
    is_stackable: false,
    has_wheels: false,
    has_cushion: false,
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
    created_at: "2026-05-02T00:00:00Z",
    updated_at: "2026-05-02T00:00:00Z",
    ...overrides,
  }) as DBProductVariant;

const stubItem = (overrides: Partial<CartItem> = {}): CartItem =>
  ({
    product: stubProduct(),
    quantity: 1,
    ...overrides,
  } as CartItem);

describe("getEffectiveCartPrice — priorité 1 (variant Modèle B)", () => {
  it("retourne variant.price_eur quand variant_id matche", () => {
    const item = stubItem({ selectedModelBVariantId: VARIANT_A });
    const variants = [stubVariant({ id: VARIANT_A, price_eur: 322.92 })];
    expect(getEffectiveCartPrice(item, variants)).toBe(322.92);
  });

  it("convertit price_eur string → number (Postgres numeric)", () => {
    const item = stubItem({ selectedModelBVariantId: VARIANT_A });
    const variants = [
      stubVariant({ id: VARIANT_A, price_eur: "322.92" as unknown as number }),
    ];
    expect(getEffectiveCartPrice(item, variants)).toBe(322.92);
  });

  it("variant trouvé avec price_eur=0 → retourne 0 (pas null)", () => {
    const item = stubItem({ selectedModelBVariantId: VARIANT_A });
    const variants = [stubVariant({ id: VARIANT_A, price_eur: 0 })];
    expect(getEffectiveCartPrice(item, variants)).toBe(0);
  });
});

describe("getEffectiveCartPrice — defensive fallbacks (variant absent)", () => {
  it("variant_id présent mais variants[] ne le contient pas → fallback supplier", () => {
    const item = stubItem({
      selectedModelBVariantId: VARIANT_A,
      selectedSupplier: {
        offerId: "o1",
        partnerId: "p1",
        partnerName: "X",
        price: 250,
        stockStatus: null,
        stockQuantity: null,
        deliveryDelayDays: null,
        purchaseType: null,
        score: 0,
      },
    });
    const variants: DBProductVariant[] = []; // empty array → no match
    expect(getEffectiveCartPrice(item, variants)).toBe(250);
  });

  it("variant_id présent mais variants undefined → fallback supplier", () => {
    const item = stubItem({
      selectedModelBVariantId: VARIANT_A,
      selectedSupplier: {
        offerId: "o1",
        partnerId: "p1",
        partnerName: "X",
        price: 250,
        stockStatus: null,
        stockQuantity: null,
        deliveryDelayDays: null,
        purchaseType: null,
        score: 0,
      },
    });
    expect(getEffectiveCartPrice(item, undefined)).toBe(250);
  });

  it("variant trouvé avec price_eur null → fallback supplier", () => {
    const item = stubItem({
      selectedModelBVariantId: VARIANT_A,
      selectedSupplier: {
        offerId: "o1",
        partnerId: "p1",
        partnerName: "X",
        price: 200,
        stockStatus: null,
        stockQuantity: null,
        deliveryDelayDays: null,
        purchaseType: null,
        score: 0,
      },
    });
    const variants = [stubVariant({ id: VARIANT_A, price_eur: null })];
    expect(getEffectiveCartPrice(item, variants)).toBe(200);
  });
});

describe("getEffectiveCartPrice — régression zéro legacy (1-variant)", () => {
  it("Pas de variant_id, supplier avec price → retourne supplier.price", () => {
    const item = stubItem({
      selectedSupplier: {
        offerId: "o1",
        partnerId: "p1",
        partnerName: "X",
        price: 214.92,
        stockStatus: null,
        stockQuantity: null,
        deliveryDelayDays: null,
        purchaseType: null,
        score: 0,
      },
    });
    expect(getEffectiveCartPrice(item, undefined)).toBe(214.92);
  });

  it("Pas de variant_id, pas de supplier → retourne product.price_min", () => {
    const item = stubItem({ product: stubProduct({ price_min: 100 }) });
    expect(getEffectiveCartPrice(item)).toBe(100);
  });

  it("Pas de variant_id, supplier avec price null → fallback product.price_min", () => {
    const item = stubItem({
      product: stubProduct({ price_min: 150 }),
      selectedSupplier: {
        offerId: "o1",
        partnerId: "p1",
        partnerName: "X",
        price: null,
        stockStatus: null,
        stockQuantity: null,
        deliveryDelayDays: null,
        purchaseType: null,
        score: 0,
      },
    });
    expect(getEffectiveCartPrice(item)).toBe(150);
  });

  it("Aucune source de prix → null", () => {
    const item = stubItem({ product: stubProduct({ price_min: null }) });
    expect(getEffectiveCartPrice(item)).toBe(null);
  });
});

describe("getEffectiveCartPrice — variant Modèle B prioritaire sur supplier", () => {
  it("Quand variant et supplier coexistent et matchent, variant gagne (autoritatif pour Modèle B)", () => {
    const item = stubItem({
      selectedModelBVariantId: VARIANT_A,
      selectedSupplier: {
        offerId: "o1",
        partnerId: "p1",
        partnerName: "X",
        price: 250,
        stockStatus: null,
        stockQuantity: null,
        deliveryDelayDays: null,
        purchaseType: null,
        score: 0,
      },
    });
    const variants = [stubVariant({ id: VARIANT_A, price_eur: 322.92 })];
    expect(getEffectiveCartPrice(item, variants)).toBe(322.92);
  });
});

// ── cartItemMatchesIdentity (merge identity ÉTAPE 9a-fix-2-α) ───────────────

const VARIANT_B = "33333333-3333-4333-8333-333333333333";

describe("cartItemMatchesIdentity — merge logic", () => {
  it("Cas 1 : 2 add même product, MÊME variant → match (quantity++ au merge)", () => {
    const item = stubItem({ selectedModelBVariantId: VARIANT_A });
    expect(cartItemMatchesIdentity(item, PRODUCT_ID, VARIANT_A)).toBe(true);
  });

  it("Cas 2 : 2 add même product, variants DIFFÉRENTES → no match (2 items distincts)", () => {
    const item = stubItem({ selectedModelBVariantId: VARIANT_A });
    expect(cartItemMatchesIdentity(item, PRODUCT_ID, VARIANT_B)).toBe(false);
  });

  it("Cas 3 : 2 add même product, SANS variant_id (legacy) → match (quantity++)", () => {
    const item = stubItem({ selectedModelBVariantId: undefined });
    expect(cartItemMatchesIdentity(item, PRODUCT_ID, undefined)).toBe(true);
  });

  it("Cas 4 : 1 add Modèle B + 1 add legacy même product → no match (2 items distincts)", () => {
    const item = stubItem({ selectedModelBVariantId: VARIANT_A });
    expect(cartItemMatchesIdentity(item, PRODUCT_ID, undefined)).toBe(false);
    // Symétrique : item legacy + nouveau add avec variant
    const itemLegacy = stubItem({ selectedModelBVariantId: undefined });
    expect(cartItemMatchesIdentity(itemLegacy, PRODUCT_ID, VARIANT_A)).toBe(false);
  });

  it("Cas 5 : products différents → no match peu importe le variant_id", () => {
    const item = stubItem({ selectedModelBVariantId: VARIANT_A });
    expect(cartItemMatchesIdentity(item, "other-product-id", VARIANT_A)).toBe(false);
    expect(cartItemMatchesIdentity(item, "other-product-id", undefined)).toBe(false);
  });
});

// ── getEffectiveStockStatus (ζ — 2026-05-04) ─────────────────────────────

describe("getEffectiveStockStatus — variant Modèle B priority", () => {
  it("Variant in_stock=true → 'in_stock'", () => {
    const item = stubItem({ selectedModelBVariantId: VARIANT_A });
    const variants = [stubVariant({ id: VARIANT_A, in_stock: true, is_made_to_order: false })];
    expect(getEffectiveStockStatus(item, variants)).toBe("in_stock");
  });

  it("Variant is_made_to_order=true → 'made_to_order' (prioritaire sur in_stock)", () => {
    const item = stubItem({ selectedModelBVariantId: VARIANT_A });
    const variants = [stubVariant({ id: VARIANT_A, in_stock: true, is_made_to_order: true })];
    expect(getEffectiveStockStatus(item, variants)).toBe("made_to_order");
  });

  it("Variant in_stock=false && !is_made_to_order (cas DEMO-T-160) → 'availability_on_request'", () => {
    const item = stubItem({ selectedModelBVariantId: VARIANT_A });
    const variants = [stubVariant({ id: VARIANT_A, in_stock: false, is_made_to_order: false })];
    expect(getEffectiveStockStatus(item, variants)).toBe("availability_on_request");
  });

  it("Cas défensif : variant_id présent mais variant absente DB → fallback product.stock_status", () => {
    const item = stubItem({
      selectedModelBVariantId: VARIANT_A,
      product: stubProduct({ stock_status: "in_stock" }),
    });
    const variants: DBProductVariant[] = []; // variant supprimée
    expect(getEffectiveStockStatus(item, variants)).toBe("in_stock");
  });
});

describe("getEffectiveStockStatus — régression zéro legacy 1-variant", () => {
  it("Legacy avec product.stock_status='in_stock' → 'in_stock'", () => {
    const item = stubItem({ product: stubProduct({ stock_status: "in_stock" }) });
    expect(getEffectiveStockStatus(item)).toBe("in_stock");
  });

  it("Legacy avec product.stock_status='available' → 'in_stock' (alias)", () => {
    const item = stubItem({ product: stubProduct({ stock_status: "available" }) });
    expect(getEffectiveStockStatus(item)).toBe("in_stock");
  });

  it("Legacy avec product.stock_status='made_to_order' → 'made_to_order'", () => {
    const item = stubItem({ product: stubProduct({ stock_status: "made_to_order" }) });
    expect(getEffectiveStockStatus(item)).toBe("made_to_order");
  });

  it("Legacy avec product.stock_status='out_of_stock' → 'availability_on_request'", () => {
    const item = stubItem({ product: stubProduct({ stock_status: "out_of_stock" }) });
    expect(getEffectiveStockStatus(item)).toBe("availability_on_request");
  });

  it("Legacy sans product.stock_status → null (pas de badge affiché)", () => {
    const item = stubItem({ product: stubProduct({ stock_status: null }) });
    expect(getEffectiveStockStatus(item)).toBe(null);
  });

  it("Legacy avec stock_status inconnu → null (pas d'affichage erroné)", () => {
    const item = stubItem({ product: stubProduct({ stock_status: "weird_value" }) });
    expect(getEffectiveStockStatus(item)).toBe(null);
  });
});
