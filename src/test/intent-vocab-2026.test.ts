import { describe, it, expect } from "vitest";
import {
  TERM_TO_TREND_TAG,
  TERM_TO_FABRIC_BRAND_SLUG,
} from "@/engine/intentDetector";

// ============================================================================
// Vocabulary 2026 dictionary tests (chantier vocab 2026, ÉTAPE 7.2)
// Non-destructive : we only check NEW terms ; existing ones (style, color,
// material, etc.) are covered by the engine tests.
// ============================================================================

describe("TERM_TO_TREND_TAG — design trends 2026", () => {
  it("maps resimercial", () => {
    expect(TERM_TO_TREND_TAG["resimercial"]).toBe("resimercial");
  });

  it("maps soft-modern (with hyphen and with space)", () => {
    expect(TERM_TO_TREND_TAG["soft-modern"]).toBe("soft-modern");
    expect(TERM_TO_TREND_TAG["soft modern"]).toBe("soft-modern");
  });

  it("maps biophilic across 4 languages", () => {
    expect(TERM_TO_TREND_TAG["biophilic"]).toBe("biophilic");
    expect(TERM_TO_TREND_TAG["biophilique"]).toBe("biophilic"); // FR
    expect(TERM_TO_TREND_TAG["biofílico"]).toBe("biophilic");   // ES with accent
    expect(TERM_TO_TREND_TAG["biofilico"]).toBe("biophilic");   // ES no accent / IT
  });

  it("maps layered-maximalism (both forms)", () => {
    expect(TERM_TO_TREND_TAG["layered-maximalism"]).toBe("layered-maximalism");
    expect(TERM_TO_TREND_TAG["layered maximalism"]).toBe("layered-maximalism");
  });

  it("maps cocooning + cocon", () => {
    expect(TERM_TO_TREND_TAG["cocooning"]).toBe("cocooning");
    expect(TERM_TO_TREND_TAG["cocon"]).toBe("cocooning");
  });

  it("maps material-honesty (both forms)", () => {
    expect(TERM_TO_TREND_TAG["material-honesty"]).toBe("material-honesty");
    expect(TERM_TO_TREND_TAG["material honesty"]).toBe("material-honesty");
  });
});

describe("TERM_TO_TREND_TAG — hospitality experience", () => {
  it("maps linger-worthy (both forms)", () => {
    expect(TERM_TO_TREND_TAG["linger-worthy"]).toBe("linger-worthy");
    expect(TERM_TO_TREND_TAG["linger worthy"]).toBe("linger-worthy");
  });

  it("maps zone variants", () => {
    expect(TERM_TO_TREND_TAG["quiet-zone"]).toBe("quiet-zone");
    expect(TERM_TO_TREND_TAG["quiet zone"]).toBe("quiet-zone");
    expect(TERM_TO_TREND_TAG["social-zone"]).toBe("social-zone");
    expect(TERM_TO_TREND_TAG["social zone"]).toBe("social-zone");
    expect(TERM_TO_TREND_TAG["vip-zone"]).toBe("vip-zone");
    expect(TERM_TO_TREND_TAG["vip zone"]).toBe("vip-zone");
  });

  it("maps acoustic-comfort across EN+FR", () => {
    expect(TERM_TO_TREND_TAG["acoustic-comfort"]).toBe("acoustic-comfort");
    expect(TERM_TO_TREND_TAG["acoustic comfort"]).toBe("acoustic-comfort");
    expect(TERM_TO_TREND_TAG["confort acoustique"]).toBe("acoustic-comfort");
  });
});

describe("TERM_TO_TREND_TAG — sustainability", () => {
  it("maps repairable across EN+FR (with and without accent)", () => {
    expect(TERM_TO_TREND_TAG["repairable"]).toBe("repairable");
    expect(TERM_TO_TREND_TAG["réparable"]).toBe("repairable");
    expect(TERM_TO_TREND_TAG["reparable"]).toBe("repairable");
  });

  it("maps reconfigurable", () => {
    expect(TERM_TO_TREND_TAG["reconfigurable"]).toBe("reconfigurable");
  });

  it("maps replacement parts variants (EN + FR)", () => {
    expect(TERM_TO_TREND_TAG["replacement-parts-available"]).toBe("replacement-parts-available");
    expect(TERM_TO_TREND_TAG["replacement parts"]).toBe("replacement-parts-available");
    expect(TERM_TO_TREND_TAG["pièces détachées"]).toBe("replacement-parts-available");
    expect(TERM_TO_TREND_TAG["pieces detachees"]).toBe("replacement-parts-available");
  });
});

describe("TERM_TO_TREND_TAG — coverage", () => {
  it("contains at least 14 distinct trend slugs", () => {
    const distinctSlugs = new Set(Object.values(TERM_TO_TREND_TAG));
    expect(distinctSlugs.size).toBeGreaterThanOrEqual(14);
  });

  it("returns undefined for unknown terms (non-destructive)", () => {
    expect(TERM_TO_TREND_TAG["unknown-trend"]).toBeUndefined();
    expect(TERM_TO_TREND_TAG["modern"]).toBeUndefined(); // existing style, not a trend
    expect(TERM_TO_TREND_TAG["mediterranean"]).toBeUndefined();
  });
});

describe("TERM_TO_FABRIC_BRAND_SLUG re-export from intentDetector", () => {
  it("is accessible via intentDetector import", () => {
    expect(TERM_TO_FABRIC_BRAND_SLUG["sunbrella"]).toBe("Sunbrella");
    expect(TERM_TO_FABRIC_BRAND_SLUG["serge ferrari"]).toBe("Serge_Ferrari");
    expect(TERM_TO_FABRIC_BRAND_SLUG["dickson orchestra"]).toBe("Dickson_Orchestra");
  });

  it("contains all 5 named premium brands as keys (lowercase)", () => {
    expect(Object.keys(TERM_TO_FABRIC_BRAND_SLUG).length).toBeGreaterThanOrEqual(5);
  });
});
