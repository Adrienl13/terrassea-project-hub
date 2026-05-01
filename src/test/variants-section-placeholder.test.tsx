// Tests pour VariantsSection — chantier Modèle B variants ÉTAPE 6b.
// Le composant rend maintenant VariantsGrid (placeholder remplacé en ÉTAPE 6b).

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import VariantsSection from "@/components/partner-dashboard/VariantsSection";

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
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

describe("VariantsSection", () => {
  it("renders without crashing", () => {
    const { container } = renderWithQuery(<VariantsSection />);
    expect(container.firstChild).toBeTruthy();
  });

  it("displays the explanatory help text and the empty grid state", () => {
    renderWithQuery(<VariantsSection />);
    // Help text
    expect(screen.getByText(/Déclinez votre produit/i)).toBeInTheDocument();
    // Grid empty state
    expect(screen.getByText(/Aucune variante/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ajouter une variante/i })).toBeInTheDocument();
  });
});
