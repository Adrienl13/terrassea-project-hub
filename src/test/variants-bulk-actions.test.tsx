// Tests comportementaux pour les bulk actions VariantsGrid (ÉTAPE 6c).
// Vérifie : selection, apply price bulk, duplicate with dimensions, toggle stock.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import VariantsGrid from "@/components/partner-dashboard/VariantsGrid";
import { makeEmptyVariantRow, type LocalVariantRow } from "@/lib/variantsGridHelpers";

// Mock supabase pour éviter les vraies queries pendant les tests.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
        order: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  },
}));

function renderWithQuery(node: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

// 3 rows, default = first
const threeRows = (): LocalVariantRow[] => [
  { ...makeEmptyVariantRow(true), _localId: "row-a", sku: "A", price_eur: 100, width_cm: 80 },
  { ...makeEmptyVariantRow(false), _localId: "row-b", sku: "B", price_eur: 120, width_cm: 100 },
  { ...makeEmptyVariantRow(false), _localId: "row-c", sku: "C", price_eur: 140, width_cm: 120 },
];

describe("VariantsGrid bulk actions (ÉTAPE 6c)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bulk actions toolbar is hidden when no row is selected", () => {
    renderWithQuery(<VariantsGrid initial={threeRows()} />);
    expect(screen.queryByTestId("variant-bulk-actions")).not.toBeInTheDocument();
  });

  it("bulk actions toolbar appears when at least one row is selected", () => {
    renderWithQuery(<VariantsGrid initial={threeRows()} />);
    fireEvent.click(screen.getByLabelText(/Select variant 1/i));
    expect(screen.getByTestId("variant-bulk-actions")).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 3 sélectionnée/i)).toBeInTheDocument();
  });

  it("toggle all checkbox selects all rows", () => {
    renderWithQuery(<VariantsGrid initial={threeRows()} />);
    fireEvent.click(screen.getByLabelText(/Select all variants/i));
    expect(screen.getByText(/3 \/ 3 sélectionnées/i)).toBeInTheDocument();
  });

  it("bulk apply price updates price_eur on selected rows only", () => {
    const onChange = vi.fn();
    renderWithQuery(<VariantsGrid initial={threeRows()} onChange={onChange} />);
    // Select rows 1 and 2 (B and C)
    fireEvent.click(screen.getByLabelText(/Select variant 2/i));
    fireEvent.click(screen.getByLabelText(/Select variant 3/i));
    // Open apply price popover
    fireEvent.click(screen.getByLabelText(/Apply price to selected variants/i));
    const input = screen.getByLabelText(/Bulk price input/i);
    fireEvent.change(input, { target: { value: "199.99" } });
    fireEvent.click(screen.getByRole("button", { name: /^Appliquer$/i }));
    // Last onChange call should reflect the price update
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall[0].price_eur).toBe(100); // Row A (not selected) unchanged
    expect(lastCall[1].price_eur).toBe(199.99); // Row B selected
    expect(lastCall[2].price_eur).toBe(199.99); // Row C selected
  });

  it("bulk toggle stock marks selected rows in_stock=true", () => {
    const onChange = vi.fn();
    renderWithQuery(<VariantsGrid initial={threeRows()} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText(/Select variant 1/i));
    fireEvent.click(screen.getByLabelText(/Mark selected as in stock/i));
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall[0].in_stock).toBe(true);
    expect(lastCall[1].in_stock).toBe(false);
  });

  it("duplicate with dimensions creates N additional rows", () => {
    const onChange = vi.fn();
    renderWithQuery(<VariantsGrid initial={threeRows()} onChange={onChange} />);
    // Select exactly 1 row (template = row A with width 80)
    fireEvent.click(screen.getByLabelText(/Select variant 1/i));
    // Open duplicate popover
    fireEvent.click(screen.getByLabelText(/Duplicate selected variant with dimension variations/i));
    const input = screen.getByLabelText(/Bulk duplicate widths input/i);
    fireEvent.change(input, { target: { value: "100, 120" } });
    fireEvent.click(screen.getByRole("button", { name: /^Dupliquer$/i }));
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    // Original 3 rows + 2 new copies = 5
    expect(lastCall).toHaveLength(5);
    // The 4th row is the first copy with width=100
    expect(lastCall[3].width_cm).toBe(100);
    expect(lastCall[3].is_default).toBe(false);
    expect(lastCall[3].sku).toBe("A-w100");
    // The 5th row is the second copy with width=120
    expect(lastCall[4].width_cm).toBe(120);
    expect(lastCall[4].sku).toBe("A-w120");
  });

  it("duplicate button is disabled when 0 or >1 rows selected", () => {
    renderWithQuery(<VariantsGrid initial={threeRows()} />);
    // Select 2 rows
    fireEvent.click(screen.getByLabelText(/Select variant 1/i));
    fireEvent.click(screen.getByLabelText(/Select variant 2/i));
    const dupButton = screen.getByLabelText(
      /Duplicate selected variant with dimension variations/i,
    );
    expect(dupButton).toBeDisabled();
  });

  it("clear selection button clears the selection", () => {
    renderWithQuery(<VariantsGrid initial={threeRows()} />);
    fireEvent.click(screen.getByLabelText(/Select variant 1/i));
    expect(screen.getByTestId("variant-bulk-actions")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Clear selection/i));
    expect(screen.queryByTestId("variant-bulk-actions")).not.toBeInTheDocument();
  });
});
