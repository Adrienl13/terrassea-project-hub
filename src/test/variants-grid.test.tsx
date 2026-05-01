// Tests comportementaux pour VariantsGrid — chantier Modèle B variants ÉTAPE 6b.
// Vérifie : render initial, add row, delete row, validation visible, default radio,
// counter "X / Y valides".

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import VariantsGrid from "@/components/partner-dashboard/VariantsGrid";
import { makeEmptyVariantRow } from "@/lib/variantsGridHelpers";

// Mock supabase pour éviter les vraies queries pendant les tests.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
        order: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  },
}));

function renderWithQuery(node: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

describe("VariantsGrid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state with add button when no rows", () => {
    renderWithQuery(<VariantsGrid />);
    expect(screen.getByText(/Aucune variante/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ajouter une variante/i })).toBeInTheDocument();
    // Counter should not appear when 0 rows
    expect(screen.queryByTestId("variants-grid-counter")).not.toBeInTheDocument();
  });

  it("renders the provided initial rows and counter", () => {
    const initial = [
      makeEmptyVariantRow(true),
      makeEmptyVariantRow(false),
      makeEmptyVariantRow(false),
    ];
    renderWithQuery(<VariantsGrid initial={initial} />);
    expect(screen.getByTestId("variant-row-0")).toBeInTheDocument();
    expect(screen.getByTestId("variant-row-1")).toBeInTheDocument();
    expect(screen.getByTestId("variant-row-2")).toBeInTheDocument();
    // Counter shows 3/3 valides (default rows pass schema)
    expect(screen.getByTestId("variants-grid-counter")).toHaveTextContent(/3 \/ 3/);
  });

  it("adds a row when clicking the add button", () => {
    renderWithQuery(<VariantsGrid />);
    fireEvent.click(screen.getByRole("button", { name: /Ajouter une variante/i }));
    expect(screen.getByTestId("variant-row-0")).toBeInTheDocument();
    // Counter appears now
    expect(screen.getByTestId("variants-grid-counter")).toHaveTextContent(/1 \/ 1/);
  });

  it("first added row gets is_default=true automatically", () => {
    const onChange = vi.fn();
    renderWithQuery(<VariantsGrid onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Ajouter une variante/i }));
    // The onChange should report a row with is_default=true
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall).toHaveLength(1);
    expect(lastCall[0].is_default).toBe(true);
  });

  it("deletes a row when clicking trash icon", () => {
    const initial = [
      makeEmptyVariantRow(true),
      makeEmptyVariantRow(false),
    ];
    renderWithQuery(<VariantsGrid initial={initial} />);
    expect(screen.getByTestId("variant-row-1")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Delete variant 2/i));
    expect(screen.queryByTestId("variant-row-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("variant-row-0")).toBeInTheDocument();
  });

  it("changing default radio reassigns is_default to selected row only", () => {
    const onChange = vi.fn();
    const initial = [
      { ...makeEmptyVariantRow(true), _localId: "row-a", sku: "A" },
      { ...makeEmptyVariantRow(false), _localId: "row-b", sku: "B" },
    ];
    renderWithQuery(<VariantsGrid initial={initial} onChange={onChange} />);
    // Click default radio on row 2 (label "Variant 2 is default")
    fireEvent.click(screen.getByLabelText(/Variant 2 is default/i));
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall[0].is_default).toBe(false);
    expect(lastCall[1].is_default).toBe(true);
  });

  it("shows multiple-defaults warning when >1 row has is_default=true", () => {
    const initial = [
      makeEmptyVariantRow(true),
      makeEmptyVariantRow(true),
    ];
    renderWithQuery(<VariantsGrid initial={initial} />);
    expect(screen.getByText(/Plusieurs variantes sont marquées comme défaut/i)).toBeInTheDocument();
  });

  it("shows no-default warning when no row has is_default", () => {
    const initial = [makeEmptyVariantRow(false), makeEmptyVariantRow(false)];
    renderWithQuery(<VariantsGrid initial={initial} />);
    expect(screen.getByText(/Aucune variante n'est marquée comme défaut/i)).toBeInTheDocument();
  });

  it("calls onChange when rows mutate (add)", () => {
    const onChange = vi.fn();
    renderWithQuery(<VariantsGrid onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Ajouter une variante/i }));
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall).toHaveLength(1);
  });

  it("deleting the default row promotes the first remaining row to default", () => {
    const onChange = vi.fn();
    const initial = [
      { ...makeEmptyVariantRow(true), _localId: "row-a", sku: "DefaultRow" },
      { ...makeEmptyVariantRow(false), _localId: "row-b", sku: "Other" },
    ];
    renderWithQuery(<VariantsGrid initial={initial} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText(/Delete variant 1/i));
    return waitFor(() => {
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall).toHaveLength(1);
      expect(lastCall[0].is_default).toBe(true);
    });
  });
});
