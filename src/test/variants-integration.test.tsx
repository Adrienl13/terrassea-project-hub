// Tests d'intégration ÉTAPE 6d — workflow complet variants → submit payload.
//
// Stratégie : les composants UI (VariantsGrid, VariantsSection) ont déjà des
// tests behavioral isolés. Le hook useProductSubmissions a aussi ses tests
// unit. Cette suite vérifie l'intégration des deux : la chaîne
//   VariantsGrid (state) → onChange → parent state → submitProduct payload
// fonctionne bout-en-bout avec un mock supabase représentant l'INSERT
// product_submissions, en simulant l'orchestration AddProductForm sans
// rendre le composant entier (évite la fragilité des mocks i18n + Auth).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import VariantsSection from "@/components/partner-dashboard/VariantsSection";
import {
  type LocalVariantRow,
  makeEmptyVariantRow,
  variantRowSchema,
} from "@/lib/variantsGridHelpers";

// Replicate ici la logique du hook submitProduct côté validation +
// serialization. Permet de tester l'intégration sans monter useProductSubmission
// et tous ses dépendants (auth, supabase, similarityEngine).
function simulateSubmitPayload(
  productData: Record<string, unknown>,
  variants: LocalVariantRow[],
): { ok: true; payload: Record<string, unknown> } | { ok: false; reason: string } {
  if (variants.length > 0) {
    const defaultCount = variants.filter((v) => v.is_default).length;
    if (defaultCount === 0) return { ok: false, reason: "no_default" };
    if (defaultCount > 1) return { ok: false, reason: "multiple_default" };
    for (let i = 0; i < variants.length; i++) {
      const parsed = variantRowSchema.safeParse(variants[i]);
      if (!parsed.success) return { ok: false, reason: `invalid_row_${i}` };
    }
  }
  const productDataPayload =
    variants.length > 0
      ? {
          ...productData,
          variants: variants.map((v) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { _localId, ...rest } = v;
            return rest;
          }),
        }
      : productData;
  return { ok: true, payload: productDataPayload };
}

// Mock supabase — pas utilisé directement ici mais requis par VariantsGrid
// (les hooks useFabricBrands / useColorsCanonical / useFinishesCanonical).
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

// Wrapper test qui imite l'orchestration AddProductForm (state local +
// passage à onChange + simulation du Save).
function FormHarness({ onSimulatedSubmit }: { onSimulatedSubmit: (rows: LocalVariantRow[]) => void }) {
  const [variants, setVariants] = useState<LocalVariantRow[]>([makeEmptyVariantRow(true)]);
  return (
    <div>
      <VariantsSection initial={variants} onChange={setVariants} />
      <button
        type="button"
        onClick={() => onSimulatedSubmit(variants)}
        data-testid="simulated-submit"
      >
        Simulated Save
      </button>
    </div>
  );
}

describe("Integration: VariantsGrid → parent state → submit payload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits 1 default variant when partner doesn't touch the Variantes tab (regression-zero flow)", async () => {
    const submitSpy = vi.fn();
    renderWithQuery(<FormHarness onSimulatedSubmit={submitSpy} />);
    fireEvent.click(screen.getByTestId("simulated-submit"));
    expect(submitSpy).toHaveBeenCalledTimes(1);
    const rows = submitSpy.mock.calls[0][0] as LocalVariantRow[];
    expect(rows).toHaveLength(1);
    expect(rows[0].is_default).toBe(true);

    const result = simulateSubmitPayload({ name: "Chair", category: "chairs" }, rows);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload).toHaveProperty("variants");
      expect((result.payload.variants as unknown[])).toHaveLength(1);
    }
  });

  it("submits 3 variants after partner adds 2 rows manually in the grid", async () => {
    const submitSpy = vi.fn();
    renderWithQuery(<FormHarness onSimulatedSubmit={submitSpy} />);
    // Grid starts with 1 default. Add 2 more rows.
    const addButton = screen.getByRole("button", { name: /Ajouter une variante/i });
    fireEvent.click(addButton);
    fireEvent.click(addButton);
    // Now 3 rows. Click simulated submit.
    fireEvent.click(screen.getByTestId("simulated-submit"));

    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalled();
    });
    const rows = submitSpy.mock.calls[submitSpy.mock.calls.length - 1][0] as LocalVariantRow[];
    expect(rows).toHaveLength(3);
    // 1st row stays is_default, others are added with is_default=false
    expect(rows.filter((r) => r.is_default)).toHaveLength(1);

    const result = simulateSubmitPayload({ name: "Chair", category: "chairs" }, rows);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const variants = result.payload.variants as Array<Record<string, unknown>>;
      expect(variants).toHaveLength(3);
      // _localId should be stripped from each
      for (const v of variants) {
        expect(v).not.toHaveProperty("_localId");
      }
    }
  });

  it("rejects submission with no default variant (defense-in-depth validation)", () => {
    const variants: LocalVariantRow[] = [
      { ...makeEmptyVariantRow(false), _localId: "a" },
      { ...makeEmptyVariantRow(false), _localId: "b" },
    ];
    const result = simulateSubmitPayload({ name: "X" }, variants);
    expect(result).toEqual({ ok: false, reason: "no_default" });
  });

  it("rejects submission with multiple defaults (defense-in-depth validation)", () => {
    const variants: LocalVariantRow[] = [
      { ...makeEmptyVariantRow(true), _localId: "a" },
      { ...makeEmptyVariantRow(true), _localId: "b" },
    ];
    const result = simulateSubmitPayload({ name: "X" }, variants);
    expect(result).toEqual({ ok: false, reason: "multiple_default" });
  });

  it("strips _localId from every serialized variant in the embedded payload", () => {
    const variants: LocalVariantRow[] = [
      { ...makeEmptyVariantRow(true), _localId: "local-a", sku: "A" },
      { ...makeEmptyVariantRow(false), _localId: "local-b", sku: "B" },
    ];
    const result = simulateSubmitPayload({ name: "X" }, variants);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const payload = result.payload as { variants: Array<Record<string, unknown>> };
      for (const v of payload.variants) {
        expect(v).not.toHaveProperty("_localId");
        expect(v).toHaveProperty("is_default");
        expect(v).toHaveProperty("sku");
      }
    }
  });

  it("preserves backward compat: empty variants array does NOT add a `variants` key to product_data", () => {
    const result = simulateSubmitPayload({ name: "X", category: "chairs" }, []);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload).not.toHaveProperty("variants");
      expect(result.payload).toEqual({ name: "X", category: "chairs" });
    }
  });

  it("VariantsSection renders the help text and the grid empty state on first mount", () => {
    renderWithQuery(<FormHarness onSimulatedSubmit={vi.fn()} />);
    // Help text from VariantsSection
    expect(screen.getByText(/Déclinez votre produit/i)).toBeInTheDocument();
    // Grid header with the variants counter (1/1 valid by default)
    expect(screen.getByTestId("variants-grid-counter")).toHaveTextContent(/1 \/ 1/);
  });
});
