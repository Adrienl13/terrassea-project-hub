import { describe, expect, it } from "vitest";
import { getOptimizedImageUrl, getResponsiveSrcSet } from "../utils/imageOptimization";

const SUPABASE_OBJECT_URL =
  "https://gwgcfgeouropcighpztj.supabase.co/storage/v1/object/public/product-images/products/angel-001.jpg";
const EXTERNAL_URL = "https://cdn.external.com/photo.png";

describe("getOptimizedImageUrl", () => {
  it("returns '' for null / undefined / empty input", () => {
    expect(getOptimizedImageUrl(null)).toBe("");
    expect(getOptimizedImageUrl(undefined)).toBe("");
    expect(getOptimizedImageUrl("")).toBe("");
  });

  it("returns the original URL when not a Supabase Storage URL", () => {
    expect(getOptimizedImageUrl(EXTERNAL_URL, { width: 400 })).toBe(EXTERNAL_URL);
    expect(getOptimizedImageUrl("/local/asset.png", { width: 400 })).toBe("/local/asset.png");
  });

  it("converts Supabase /object/ URL to /render/image/ with default params", () => {
    const out = getOptimizedImageUrl(SUPABASE_OBJECT_URL);
    expect(out).toContain("/storage/v1/render/image/public/product-images/products/angel-001.jpg");
    expect(out).toContain("width=800");
    expect(out).toContain("quality=80");
    expect(out).toContain("format=webp");
  });

  it("applies custom width / quality / format", () => {
    const out = getOptimizedImageUrl(SUPABASE_OBJECT_URL, {
      width: 400,
      quality: 60,
      format: "jpg",
    });
    expect(out).toContain("width=400");
    expect(out).toContain("quality=60");
    expect(out).toContain("format=jpg");
  });

  it("omits format query when format='origin'", () => {
    const out = getOptimizedImageUrl(SUPABASE_OBJECT_URL, { format: "origin" });
    expect(out).not.toContain("format=");
  });

  it("includes height + resize when provided", () => {
    const out = getOptimizedImageUrl(SUPABASE_OBJECT_URL, {
      width: 200,
      height: 200,
      resize: "cover",
    });
    expect(out).toContain("width=200");
    expect(out).toContain("height=200");
    expect(out).toContain("resize=cover");
  });

  it("does NOT include resize when not specified", () => {
    const out = getOptimizedImageUrl(SUPABASE_OBJECT_URL, { width: 400 });
    expect(out).not.toContain("resize=");
  });
});

describe("getResponsiveSrcSet", () => {
  it("returns '' for null / external URLs", () => {
    expect(getResponsiveSrcSet(null)).toBe("");
    expect(getResponsiveSrcSet(EXTERNAL_URL, [400, 800])).toBe("");
  });

  it("generates 3 entries by default (400 / 800 / 1200)", () => {
    const out = getResponsiveSrcSet(SUPABASE_OBJECT_URL);
    const entries = out.split(", ");
    expect(entries).toHaveLength(3);
    expect(entries[0]).toMatch(/width=400.*400w$/);
    expect(entries[1]).toMatch(/width=800.*800w$/);
    expect(entries[2]).toMatch(/width=1200.*1200w$/);
  });

  it("supports custom widths array", () => {
    const out = getResponsiveSrcSet(SUPABASE_OBJECT_URL, [200, 400]);
    const entries = out.split(", ");
    expect(entries).toHaveLength(2);
    expect(entries[0]).toContain("width=200");
    expect(entries[1]).toContain("width=400");
  });

  it("propagates options (format, quality) to each entry", () => {
    const out = getResponsiveSrcSet(SUPABASE_OBJECT_URL, [400, 800], {
      format: "jpg",
      quality: 50,
    });
    expect(out.match(/format=jpg/g)).toHaveLength(2);
    expect(out.match(/quality=50/g)).toHaveLength(2);
  });
});
