// Tests behavioral pour VariantSelector — chantier Modèle B variants ÉTAPE 9a.
// Vérifie : layout adaptatif (cards vs dropdown), backward compat, sélection,
// rendu des données (dimensions, color, prix, stock).

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import VariantSelector from "@/components/products/VariantSelector";
import type { DBProductVariant } from "@/lib/productVariants";

const stubVariant = (overrides: Partial<DBProductVariant> = {}): DBProductVariant =>
  ({
    id: `v-${Math.random().toString(36).slice(2, 8)}`,
    product_id: "p1",
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
    has_wheels: false,
    has_cushion: false,
    is_stackable: false,
    price_eur: null,
    price_currency: "EUR",
    in_stock: false,
    stock_quantity: null,
    delivery_weeks_min: null,
    delivery_weeks_max: null,
    is_made_to_order: false,
    available_in_markets: null,
    primary_media_id: null,
    source_type: null,
    source_url: null,
    extracted_at: null,
    validated_by: null,
    validated_at: null,
    confidence_score: null,
    is_published: true,
    is_default: false,
    discontinued_at: null,
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
    ...overrides,
  }) as DBProductVariant;

describe("VariantSelector — backward compat", () => {
  it("renders nothing when there are 0 variants", () => {
    const { container } = render(
      <VariantSelector variants={[]} selectedId={null} onSelect={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when there is exactly 1 variant (51/52 products legacy default)", () => {
    const { container } = render(
      <VariantSelector
        variants={[stubVariant({ id: "v1", is_default: true })]}
        selectedId="v1"
        onSelect={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe("VariantSelector — radio cards (2-5 variants)", () => {
  const fiveVariants = (): DBProductVariant[] => [
    stubVariant({ id: "v1", width_cm: 80, depth_cm: 60, price_eur: 99.5, is_default: true }),
    stubVariant({ id: "v2", width_cm: 100, depth_cm: 60, price_eur: 119, in_stock: true }),
    stubVariant({ id: "v3", width_cm: 120, depth_cm: 80, price_eur: 149, is_made_to_order: true }),
    stubVariant({ id: "v4", width_cm: 140, depth_cm: 80, price_eur: 169 }),
    stubVariant({ id: "v5", width_cm: 160, depth_cm: 80, price_eur: 189 }),
  ];

  it("renders radio cards layout for 2-5 variants", () => {
    render(
      <VariantSelector variants={fiveVariants()} selectedId="v1" onSelect={vi.fn()} />,
    );
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    expect(screen.queryByTestId("variant-dropdown")).not.toBeInTheDocument();
    // 5 cards rendered
    expect(screen.getByTestId("variant-card-v1")).toBeInTheDocument();
    expect(screen.getByTestId("variant-card-v5")).toBeInTheDocument();
  });

  it("displays dimensions, price, and stock badge per card", () => {
    render(
      <VariantSelector
        variants={[
          stubVariant({ id: "v1", width_cm: 80, depth_cm: 60, price_eur: 99.5, in_stock: true, is_default: true }),
          stubVariant({ id: "v2", width_cm: 100, depth_cm: 60, price_eur: 119 }),
        ]}
        selectedId="v1"
        onSelect={vi.fn()}
      />,
    );
    // v1 card content
    expect(screen.getByText("80 × 60 cm")).toBeInTheDocument();
    expect(screen.getByText("€99.50")).toBeInTheDocument();
    // v2 card content
    expect(screen.getByText("100 × 60 cm")).toBeInTheDocument();
    expect(screen.getByText("€119.00")).toBeInTheDocument();
  });

  it("calls onSelect with the variant id when a card is clicked", () => {
    const onSelect = vi.fn();
    render(
      <VariantSelector
        variants={[
          stubVariant({ id: "v1", price_eur: 99, is_default: true }),
          stubVariant({ id: "v2", price_eur: 119 }),
        ]}
        selectedId="v1"
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByTestId("variant-card-v2"));
    expect(onSelect).toHaveBeenCalledWith("v2");
  });

  it("marks the selected card with aria-checked=true", () => {
    render(
      <VariantSelector
        variants={[
          stubVariant({ id: "v1", price_eur: 99 }),
          stubVariant({ id: "v2", price_eur: 119 }),
        ]}
        selectedId="v2"
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByTestId("variant-card-v1")).toHaveAttribute("aria-checked", "false");
    expect(screen.getByTestId("variant-card-v2")).toHaveAttribute("aria-checked", "true");
  });

  it("displays a 'Default' badge on the default variant when not selected", () => {
    render(
      <VariantSelector
        variants={[
          stubVariant({ id: "v1", price_eur: 99, is_default: true }),
          stubVariant({ id: "v2", price_eur: 119 }),
        ]}
        selectedId="v2"
        onSelect={vi.fn()}
      />,
    );
    // The Default badge appears on v1 (not selected)
    expect(screen.getByText("Default")).toBeInTheDocument();
  });

  it("displays color slug formatted (capitalized) and a swatch when hex is present", () => {
    render(
      <VariantSelector
        variants={[
          stubVariant({ id: "v1", price_eur: 99, fabric_color_slug: "navy", fabric_color_hex: "#1B263B" }),
          stubVariant({ id: "v2", price_eur: 119, fabric_color_slug: "sand-warm" }),
        ]}
        selectedId="v1"
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("Navy")).toBeInTheDocument();
    expect(screen.getByText("Sand Warm")).toBeInTheDocument();
  });

  it("displays 'Sur demande' when price is null", () => {
    render(
      <VariantSelector
        variants={[
          stubVariant({ id: "v1", price_eur: null }),
          stubVariant({ id: "v2", price_eur: 119 }),
        ]}
        selectedId="v1"
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("Sur demande")).toBeInTheDocument();
  });
});

describe("VariantSelector — defaultVariantOf integration", () => {
  it("re-selecting changes the underlying selected variant", () => {
    // Smoke test : valide que onSelect propagation fonctionne pour les
    // consommateurs (utile pour ProductDetail + VendorOffers ÉTAPE 9a-fix).
    const onSelect = vi.fn();
    const variants = [
      stubVariant({ id: "v1", price_eur: 99, is_default: true, in_stock: true }),
      stubVariant({ id: "v2", price_eur: 119, in_stock: false }),
      stubVariant({ id: "v3", price_eur: 149, is_made_to_order: true }),
    ];
    render(<VariantSelector variants={variants} selectedId="v1" onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId("variant-card-v3"));
    expect(onSelect).toHaveBeenCalledWith("v3");
  });
});

describe("VariantSelector — dropdown (6+ variants)", () => {
  const sixVariants = (): DBProductVariant[] =>
    Array.from({ length: 6 }, (_, i) =>
      stubVariant({
        id: `v${i + 1}`,
        width_cm: 80 + i * 20,
        depth_cm: 60,
        price_eur: 99 + i * 10,
        is_default: i === 0,
      }),
    );

  it("renders dropdown when there are 6+ variants", () => {
    render(<VariantSelector variants={sixVariants()} selectedId="v1" onSelect={vi.fn()} />);
    expect(screen.getByTestId("variant-dropdown")).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("calls onSelect when dropdown changes", () => {
    const onSelect = vi.fn();
    render(<VariantSelector variants={sixVariants()} selectedId="v1" onSelect={onSelect} />);
    fireEvent.change(screen.getByTestId("variant-dropdown"), { target: { value: "v3" } });
    expect(onSelect).toHaveBeenCalledWith("v3");
  });
});
