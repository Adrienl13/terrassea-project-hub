// ============================================================================
// Tests imageOptimization — RÉACTIVÉ 2026-06-03 (formule bounding-box contain).
//
// Le helper réécrit /object/ → /render/image/ avec width+height+resize=contain
// + WebP (préserve le ratio, pas de crop). SVG / data: / blob: / URLs non
// Supabase passent inchangés.
// ============================================================================

import { describe, expect, it } from "vitest";
import { getOptimizedImageUrl, getResponsiveSrcSet } from "../utils/imageOptimization";

const SUPABASE_OBJECT_URL =
  "https://gwgcfgeouropcighpztj.supabase.co/storage/v1/object/public/product-images/products/angel-001.jpg";
const SUPABASE_SVG_URL =
  "https://gwgcfgeouropcighpztj.supabase.co/storage/v1/object/public/partner-assets/logo.svg";
const EXTERNAL_URL = "https://cdn.external.com/photo.png";

describe("getOptimizedImageUrl", () => {
  it("returns '' for null / undefined / empty input", () => {
    expect(getOptimizedImageUrl(null)).toBe("");
    expect(getOptimizedImageUrl(undefined)).toBe("");
    expect(getOptimizedImageUrl("")).toBe("");
  });

  it("leaves non-transformable URLs unchanged (external, local, svg, blob, data)", () => {
    expect(getOptimizedImageUrl(EXTERNAL_URL, { width: 400 })).toBe(EXTERNAL_URL);
    expect(getOptimizedImageUrl("/local/asset.png", { width: 400 })).toBe("/local/asset.png");
    expect(getOptimizedImageUrl(SUPABASE_SVG_URL, { width: 400 })).toBe(SUPABASE_SVG_URL);
    expect(getOptimizedImageUrl("blob:abc", { width: 400 })).toBe("blob:abc");
    expect(getOptimizedImageUrl("data:image/png;base64,xxx", { width: 400 })).toBe("data:image/png;base64,xxx");
  });

  it("converts a Supabase object URL to a render URL with bounding-box contain", () => {
    const out = getOptimizedImageUrl(SUPABASE_OBJECT_URL, { width: 600 });
    expect(out).toContain("/storage/v1/render/image/public/product-images/products/angel-001.jpg");
    expect(out).toContain("width=600");
    expect(out).toContain("height=600"); // defaults to width (square box)
    expect(out).toContain("resize=contain");
    expect(out).toContain("format=webp");
  });

  it("respects explicit height / quality / format and omits format for 'origin'", () => {
    const out = getOptimizedImageUrl(SUPABASE_OBJECT_URL, { width: 800, height: 400, quality: 60, format: "jpg" });
    expect(out).toContain("width=800");
    expect(out).toContain("height=400");
    expect(out).toContain("quality=60");
    expect(out).toContain("format=jpg");

    const origin = getOptimizedImageUrl(SUPABASE_OBJECT_URL, { width: 800, format: "origin" });
    expect(origin).not.toContain("format=");
  });
});

describe("getResponsiveSrcSet", () => {
  it("returns '' for empty / non-transformable URLs", () => {
    expect(getResponsiveSrcSet(null)).toBe("");
    expect(getResponsiveSrcSet("")).toBe("");
    expect(getResponsiveSrcSet(EXTERNAL_URL, [400, 800])).toBe("");
    expect(getResponsiveSrcSet(SUPABASE_SVG_URL)).toBe("");
  });

  it("generates one entry per width with the correct descriptor", () => {
    const out = getResponsiveSrcSet(SUPABASE_OBJECT_URL, [400, 800]);
    expect(out).toContain("width=400");
    expect(out).toContain("400w");
    expect(out).toContain("width=800");
    expect(out).toContain("800w");
    expect(out.split(",").length).toBe(2);
  });
});
