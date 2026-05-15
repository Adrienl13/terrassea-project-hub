// ============================================================================
// Tests imageOptimization — adaptés au mode no-op (2026-05-15).
//
// Le helper a été désactivé temporairement (cf. src/utils/imageOptimization.ts
// + Dette 99 escaladée P0) car la Render Image API de Supabase Free tier
// recadrait les images en production. Les tests transform-spécifiques sont
// préservés en commentaire pour réactivation post-Supabase Pro.
// ============================================================================

import { describe, expect, it } from "vitest";
import { getOptimizedImageUrl, getResponsiveSrcSet } from "../utils/imageOptimization";

const SUPABASE_OBJECT_URL =
  "https://gwgcfgeouropcighpztj.supabase.co/storage/v1/object/public/product-images/products/angel-001.jpg";
const EXTERNAL_URL = "https://cdn.external.com/photo.png";

describe("getOptimizedImageUrl (no-op mode)", () => {
  it("returns '' for null / undefined / empty input", () => {
    expect(getOptimizedImageUrl(null)).toBe("");
    expect(getOptimizedImageUrl(undefined)).toBe("");
    expect(getOptimizedImageUrl("")).toBe("");
  });

  it("returns the original URL unchanged for any non-empty input (no-op)", () => {
    expect(getOptimizedImageUrl(EXTERNAL_URL, { width: 400 })).toBe(EXTERNAL_URL);
    expect(getOptimizedImageUrl("/local/asset.png", { width: 400 })).toBe("/local/asset.png");
    expect(getOptimizedImageUrl(SUPABASE_OBJECT_URL)).toBe(SUPABASE_OBJECT_URL);
    expect(getOptimizedImageUrl(SUPABASE_OBJECT_URL, { width: 400, quality: 60, format: "jpg" }))
      .toBe(SUPABASE_OBJECT_URL);
  });

  it("does NOT inject render/image/ path in no-op mode", () => {
    const out = getOptimizedImageUrl(SUPABASE_OBJECT_URL, { width: 400 });
    expect(out).not.toContain("/render/image/");
    expect(out).not.toContain("width=");
    expect(out).not.toContain("quality=");
    expect(out).not.toContain("format=");
  });
});

describe("getResponsiveSrcSet (no-op mode)", () => {
  it("returns '' for any input", () => {
    expect(getResponsiveSrcSet(null)).toBe("");
    expect(getResponsiveSrcSet(undefined)).toBe("");
    expect(getResponsiveSrcSet("")).toBe("");
    expect(getResponsiveSrcSet(EXTERNAL_URL, [400, 800])).toBe("");
    expect(getResponsiveSrcSet(SUPABASE_OBJECT_URL)).toBe("");
    expect(getResponsiveSrcSet(SUPABASE_OBJECT_URL, [200, 400], { format: "jpg", quality: 50 })).toBe("");
  });
});

// ============================================================================
// === TESTS ORIGINAUX — À RÉACTIVER POST-SUPABASE PRO (Dette 99) =============
// ============================================================================
//
// describe("getOptimizedImageUrl", () => {
//   it("converts Supabase /object/ URL to /render/image/ with default params", () => {
//     const out = getOptimizedImageUrl(SUPABASE_OBJECT_URL);
//     expect(out).toContain("/storage/v1/render/image/public/product-images/products/angel-001.jpg");
//     expect(out).toContain("width=800");
//     expect(out).toContain("quality=80");
//     expect(out).toContain("format=webp");
//   });
//
//   it("applies custom width / quality / format", () => { ... });
//   it("omits format query when format='origin'", () => { ... });
//   it("includes height + resize when provided", () => { ... });
//   it("does NOT include resize when not specified", () => { ... });
// });
//
// describe("getResponsiveSrcSet", () => {
//   it("generates 3 entries by default (400 / 800 / 1200)", () => { ... });
//   it("supports custom widths array", () => { ... });
//   it("propagates options (format, quality) to each entry", () => { ... });
// });
//
// ============================================================================
