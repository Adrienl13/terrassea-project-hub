// ============================================================================
// Image optimization helpers — Supabase Storage Render API
//
// Origin : Dette 97 — Mobile Performance Lot 2 (2026-05-14).
// Reference : docs/strategy/MOBILE_PERFORMANCE_AUDIT.md
//
// Supabase Storage exposes a /render/image/ endpoint that performs on-the-fly
// resizing + format conversion (webp/jpg) + quality adjustment via query params.
// Original /object/ URLs serve the file as uploaded (often 1920×1920 png 4MB+),
// while /render/image/ URLs can serve 400×400 webp ~30KB for a mobile card.
//
// Usage :
//   <img src={getOptimizedImageUrl(product.image_url, { width: 400 })} />
//   <img srcSet={getResponsiveSrcSet(product.image_url, [400, 800])} />
//
// Non-Supabase URLs are returned untouched (CDN images, external URLs, etc.).
// Null/undefined returns '' (safe for <img src="" />).
// ============================================================================

export interface OptimizationOptions {
  /** Target width in pixels. Defaults to 800. */
  width?: number;
  /** Target height in pixels. If omitted, aspect ratio is preserved. */
  height?: number;
  /** Quality 1-100. Defaults to 80 (sweet spot for web). */
  quality?: number;
  /** Output format. Defaults to 'webp' (best compression, broad support). */
  format?: "webp" | "jpg" | "origin";
  /** Resize mode for height-constrained outputs. */
  resize?: "cover" | "contain" | "fill";
}

/**
 * Transforms a Supabase Storage URL to use the render image API.
 * Returns the original URL if it's not a Supabase Storage URL.
 * Returns '' if the input is null/undefined/empty.
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  options: OptimizationOptions = {},
): string {
  if (!url) return "";

  // Skip non-Supabase URLs (external CDN, placeholder paths, etc.).
  if (!url.includes("/storage/v1/object/")) {
    return url;
  }

  const { width = 800, height, quality = 80, format = "webp", resize } = options;

  // Convert object URL → render URL.
  const renderUrl = url.replace("/storage/v1/object/", "/storage/v1/render/image/");

  const params = new URLSearchParams();
  params.set("width", String(width));
  if (height != null) params.set("height", String(height));
  params.set("quality", String(quality));
  if (format !== "origin") params.set("format", format);
  if (resize) params.set("resize", resize);

  return `${renderUrl}?${params.toString()}`;
}

/**
 * Generates a srcSet string for responsive images.
 * Non-Supabase URLs return '' (callers should skip srcSet attribute).
 */
export function getResponsiveSrcSet(
  url: string | null | undefined,
  widths: number[] = [400, 800, 1200],
  options: Omit<OptimizationOptions, "width"> = {},
): string {
  if (!url || !url.includes("/storage/v1/object/")) return "";

  return widths
    .map((width) => `${getOptimizedImageUrl(url, { ...options, width })} ${width}w`)
    .join(", ");
}
