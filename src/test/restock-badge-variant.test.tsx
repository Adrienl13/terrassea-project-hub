// Tests pour RestockBadge — chantier Modèle B variants ÉTAPE 9a-fix-2-δ-1.
//
// Avant le fix, le composant ignorait le prop `stockStatus` et calculait
// tout depuis `stockQuantity > 0`. Conséquence : changer la variant Modèle B
// sélectionnée n'updatait pas le badge si le stockQuantity restait identique.
//
// Le fix rend `stockStatus` autoritatif quand il est défini :
//   - "made_to_order" / "on_order" → badge bleu "Sur commande"
//   - "out_of_stock"               → badge rouge "Rupture"
//   - "in_stock"                   → badge vert "En stock"
//   - null                         → comportement legacy (stockQuantity-driven)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import RestockBadge from "@/components/products/RestockBadge";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      // Returns interpolated key for assertion clarity
      if (opts && typeof opts.count !== "undefined") {
        return `${key}[${opts.count}]`;
      }
      return key;
    },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RestockBadge — variant-aware stockStatus authoritative (δ-1)", () => {
  it("stockStatus='in_stock' + stockQuantity null → badge 'In stock generic'", () => {
    render(
      <RestockBadge
        stockStatus="in_stock"
        stockQuantity={null}
        arrivals={[]}
      />,
    );
    expect(screen.getByText("restock.inStockGeneric")).toBeInTheDocument();
  });

  it("stockStatus='in_stock' + stockQuantity > 0 → utilise comportement legacy quantity (compteur)", () => {
    render(
      <RestockBadge
        stockStatus="in_stock"
        stockQuantity={50}
        arrivals={[]}
      />,
    );
    // Avec stockQuantity > 0, on garde la logique legacy "{count} in stock"
    expect(screen.getByText("restock.inStock[50]")).toBeInTheDocument();
  });

  it("stockStatus='out_of_stock' + stockQuantity > 0 → badge OUT OF STOCK (court-circuite quantity)", () => {
    // Cas critique : la variant Modèle B est out-of-stock même si l'offer
    // partner a du stock pour d'autres variantes.
    render(
      <RestockBadge
        stockStatus="out_of_stock"
        stockQuantity={20}
        arrivals={[]}
      />,
    );
    expect(screen.getByText("restock.outOfStock")).toBeInTheDocument();
    expect(screen.queryByText(/restock.inStock/)).not.toBeInTheDocument();
  });

  it("stockStatus='made_to_order' → badge 'Made to order'", () => {
    render(
      <RestockBadge
        stockStatus="made_to_order"
        stockQuantity={null}
        arrivals={[]}
      />,
    );
    expect(screen.getByText("restock.madeToOrder")).toBeInTheDocument();
  });

  it("stockStatus='on_order' (alias variant.is_made_to_order=true) → badge 'Made to order'", () => {
    render(
      <RestockBadge
        stockStatus="on_order"
        stockQuantity={null}
        arrivals={[]}
      />,
    );
    expect(screen.getByText("restock.madeToOrder")).toBeInTheDocument();
  });

  it("Régression zéro legacy : stockStatus null + stockQuantity > 0 → badge In stock count", () => {
    render(
      <RestockBadge
        stockStatus={null}
        stockQuantity={12}
        arrivals={[]}
      />,
    );
    expect(screen.getByText("restock.inStock[12]")).toBeInTheDocument();
  });

  it("Régression zéro legacy : stockStatus null + stockQuantity 0 → badge Out of stock", () => {
    render(
      <RestockBadge
        stockStatus={null}
        stockQuantity={0}
        arrivals={[]}
      />,
    );
    expect(screen.getByText("restock.outOfStock")).toBeInTheDocument();
  });
});
