// Tests for src/lib/slug.ts — chantier ÉTAPE 9b-1.

import { describe, it, expect } from "vitest";
import { slugify, uniqueSlug } from "@/lib/slug";

describe("slugify", () => {
  it("supprime les diacritiques (NFD)", () => {
    expect(slugify("Café Lounge Chair")).toBe("cafe-lounge-chair");
    expect(slugify("Demo Modèle B")).toBe("demo-modele-b");
    expect(slugify("Crème brûlée")).toBe("creme-brulee");
  });

  it("garde les chiffres et lowercase", () => {
    expect(slugify("DURBAN 004-BG")).toBe("durban-004-bg");
    expect(slugify("Foo123")).toBe("foo123");
  });

  it("remplace caractères spéciaux par '-'", () => {
    expect(slugify("L&M Outdoor!")).toBe("l-m-outdoor");
    expect(slugify("L'Atelier 100%")).toBe("l-atelier-100");
  });

  it("collapse multiple '-' en un seul", () => {
    expect(slugify("Foo   bar   baz")).toBe("foo-bar-baz");
    expect(slugify("Foo___bar")).toBe("foo-bar");
  });

  it("trim '-' au début / fin", () => {
    expect(slugify("   hello   ")).toBe("hello");
    expect(slugify("---hello---")).toBe("hello");
  });

  it("empty / whitespace → empty string", () => {
    expect(slugify("")).toBe("");
    expect(slugify("   ")).toBe("");
  });

  it("idempotent : slugify(slugify(x)) === slugify(x)", () => {
    const inputs = ["Hello World", "café", "L&M-Outdoor", "DURBAN 004-BG"];
    for (const input of inputs) {
      const once = slugify(input);
      expect(slugify(once)).toBe(once);
    }
  });

  it("characters mixed scripts → ascii fallback (caractères chinois ignorés)", () => {
    // Non-latin scripts non transliérés (caractères supprimés) — comportement
    // attendu Phase 1. Phase 2 pourrait introduire transliteration via lib.
    expect(slugify("Hello 世界")).toBe("hello");
    expect(slugify("世界 only")).toBe("only");
  });
});

describe("uniqueSlug", () => {
  it("retourne le slug brut si pas de collision", () => {
    expect(uniqueSlug("Diamond Chair", new Set())).toBe("diamond-chair");
    expect(uniqueSlug("Foo", new Set(["bar", "baz"]))).toBe("foo");
  });

  it("ajoute -2 sur première collision", () => {
    expect(uniqueSlug("Diamond", new Set(["diamond"]))).toBe("diamond-2");
  });

  it("incrémente jusqu'à trouver libre (-3, -4, …)", () => {
    expect(
      uniqueSlug("Diamond", new Set(["diamond", "diamond-2", "diamond-3"])),
    ).toBe("diamond-4");
  });

  it("empty input → empty string (caller gère fallback)", () => {
    expect(uniqueSlug("", new Set())).toBe("");
    expect(uniqueSlug("   ", new Set())).toBe("");
  });

  it("ne mute pas le Set existing", () => {
    const existing = new Set(["diamond"]);
    uniqueSlug("Diamond", existing);
    expect(existing.has("diamond")).toBe(true);
    expect(existing.has("diamond-2")).toBe(false);
  });
});
