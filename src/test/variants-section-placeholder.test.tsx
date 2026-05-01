// Sanity tests pour VariantsSection (placeholder ÉTAPE 6a).
// Vérifie que le composant rend sans crash et affiche le contenu attendu.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import VariantsSection from "@/components/partner-dashboard/VariantsSection";

describe("VariantsSection (placeholder ÉTAPE 6a)", () => {
  it("renders without crashing", () => {
    const { container } = render(<VariantsSection />);
    expect(container.firstChild).toBeTruthy();
  });

  it("displays the placeholder heading and explanation copy", () => {
    const { container } = render(<VariantsSection />);
    expect(screen.getByText(/Section Variantes/i)).toBeInTheDocument();
    expect(container.textContent ?? "").toMatch(/déclinaisons/i);
    expect(screen.getByText(/1 modèle peut avoir N variantes/i)).toBeInTheDocument();
  });
});
