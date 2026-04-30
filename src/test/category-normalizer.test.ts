import { describe, it, expect } from "vitest";
import {
  normalizeProductCategory,
  CANONICAL_CATEGORIES,
} from "@/lib/categoryNormalizer";

describe("normalizeProductCategory — direct aliases", () => {
  it("maps already-canonical slugs identically", () => {
    for (const cat of CANONICAL_CATEGORIES) {
      expect(normalizeProductCategory(cat)).toBe(cat);
    }
  });

  it("maps capitalized DB legacy values", () => {
    expect(normalizeProductCategory("Chairs")).toBe("chairs");
    expect(normalizeProductCategory("Armchairs")).toBe("armchairs");
    expect(normalizeProductCategory("Bar Stools")).toBe("bar-stools");
    expect(normalizeProductCategory("Tables")).toBe("tables");
    expect(normalizeProductCategory("Parasols")).toBe("parasols");
    expect(normalizeProductCategory("Sun Loungers")).toBe("loungers");
    expect(normalizeProductCategory("Lounge Seating")).toBe("sofas");
  });

  it("trims whitespace", () => {
    expect(normalizeProductCategory("  Tables  ")).toBe("tables");
    expect(normalizeProductCategory("\tBar Stools\n")).toBe("bar-stools");
  });

  it("maps singular forms", () => {
    expect(normalizeProductCategory("chair")).toBe("chairs");
    expect(normalizeProductCategory("armchair")).toBe("armchairs");
    expect(normalizeProductCategory("stool")).toBe("bar-stools");
    expect(normalizeProductCategory("table")).toBe("tables");
    expect(normalizeProductCategory("sofa")).toBe("sofas");
    expect(normalizeProductCategory("lounger")).toBe("loungers");
    expect(normalizeProductCategory("parasol")).toBe("parasols");
  });

  it("maps lounge-seating (with hyphen) and 'lounge seating' (with space) to sofas", () => {
    expect(normalizeProductCategory("lounge-seating")).toBe("sofas");
    expect(normalizeProductCategory("lounge seating")).toBe("sofas");
  });

  it("returns original string for unknown categories", () => {
    expect(normalizeProductCategory("Pergolas")).toBe("Pergolas");
    expect(normalizeProductCategory("custom-category")).toBe("custom-category");
  });

  it("handles null and undefined gracefully (returns empty string)", () => {
    expect(normalizeProductCategory(null)).toBe("");
    expect(normalizeProductCategory(undefined)).toBe("");
  });
});

describe("normalizeProductCategory — seating heuristic fallback", () => {
  it("seating + no keyword → chairs (default fallback)", () => {
    expect(normalizeProductCategory("seating")).toBe("chairs");
    expect(normalizeProductCategory("seating", { name: "Outdoor seat" })).toBe("chairs");
  });

  // Armchair detection across 4 languages
  it("seating + armchair (en) → armchairs", () => {
    expect(normalizeProductCategory("seating", { name: "Lounge armchair" })).toBe("armchairs");
  });

  it("seating + fauteuil (fr) → armchairs", () => {
    expect(normalizeProductCategory("seating", { name: "Fauteuil club" })).toBe("armchairs");
  });

  it("seating + poltrona (it) → armchairs", () => {
    expect(normalizeProductCategory("seating", { name: "Poltrona Mediterranea" })).toBe("armchairs");
  });

  it("seating + sillón (es, with accent) → armchairs", () => {
    expect(normalizeProductCategory("seating", { name: "Sillón vintage" })).toBe("armchairs");
  });

  it("seating + sillon (es, no accent) → armchairs", () => {
    expect(normalizeProductCategory("seating", { name: "Sillon clasico" })).toBe("armchairs");
  });

  // Bar stool detection across 4 languages
  it("seating + stool (en) → bar-stools", () => {
    expect(normalizeProductCategory("seating", { name: "Counter stool" })).toBe("bar-stools");
  });

  it("seating + tabouret (fr) → bar-stools", () => {
    expect(normalizeProductCategory("seating", { name: "Tabouret de bar industriel" })).toBe("bar-stools");
  });

  it("seating + sgabello (it) → bar-stools", () => {
    expect(normalizeProductCategory("seating", { name: "Sgabello alto" })).toBe("bar-stools");
  });

  it("seating + taburete (es) → bar-stools", () => {
    expect(normalizeProductCategory("seating", { name: "Taburete de cocina" })).toBe("bar-stools");
  });

  it("subcategory takes precedence when name has no signal", () => {
    expect(
      normalizeProductCategory("seating", {
        name: "Outdoor",
        subcategory: "Bar Stool",
      }),
    ).toBe("bar-stools");
  });

  it("stool wins over armchair if both present (unlikely but explicit precedence)", () => {
    expect(
      normalizeProductCategory("seating", {
        name: "Bar stool with armchair-style backrest",
      }),
    ).toBe("bar-stools");
  });

  it("case-insensitive matching", () => {
    expect(normalizeProductCategory("SEATING", { name: "FAUTEUIL" })).toBe("armchairs");
    expect(normalizeProductCategory("Seating", { name: "TABOURET" })).toBe("bar-stools");
  });
});
