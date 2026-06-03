// ============================================================================
// Image optimization helpers — Supabase Storage Render API
//
// STATUS 2026-06-03 : RÉACTIVÉ avec la formule validée.
//
// Historique : désactivé le 2026-05-15 car un appel `width` seul renvoyait une
// image NON proportionnelle (hauteur d'origine conservée → image écrasée, le
// fameux « coupé »). Vérifié 2026-06-03 : le rendu correct exige une BOUNDING
// BOX (width + height) + `resize=contain`, qui préserve exactement le ratio
// sans recadrer ni déformer (testé : 6402×6534 → 588×600, 8,96 Mo → 26 Ko).
//
// Garde-fou : si un appelant ne passe que `width`, on force `height = width`
// (boîte carrée) + `contain` → toujours proportionnel, jamais étiré.
//
// Les originaux ne sont jamais modifiés (transformation à la livraison,
// réversible). SVG / data: / blob: / URLs non-Supabase passent inchangés.
// Reference : docs/strategy/MOBILE_PERFORMANCE_AUDIT.md
// ============================================================================

export interface OptimizationOptions {
  /** Largeur de la boîte (px). */
  width?: number;
  /** Hauteur de la boîte (px). Par défaut = width (boîte carrée). */
  height?: number;
  /** Qualité 1-100. */
  quality?: number;
  /** Format de sortie. */
  format?: "webp" | "jpg" | "origin";
  /** Mode de redimensionnement. `contain` = ajuste DANS la boîte (pas de crop). */
  resize?: "cover" | "contain" | "fill";
}

const SUPABASE_OBJECT_PATH = "/storage/v1/object/";
const SUPABASE_RENDER_PATH = "/storage/v1/render/image/";

function isTransformable(url: string): boolean {
  // Only Supabase Storage objects can go through the Render API.
  if (!url.includes(SUPABASE_OBJECT_PATH)) return false;
  // Vector / inline / blob images: leave untouched.
  if (/\.svg(\?|$)/i.test(url)) return false;
  if (url.startsWith("data:") || url.startsWith("blob:")) return false;
  return true;
}

/**
 * Returns a resized/WebP version of a Supabase Storage image URL.
 * Empty string for null/undefined (safe for <img src="" />).
 * Non-Supabase / SVG / blob URLs are returned unchanged.
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  options: OptimizationOptions = {},
): string {
  if (!url) return "";
  if (!isTransformable(url)) return url;

  const { width = 800, height, quality = 75, format = "webp", resize = "contain" } = options;
  const renderUrl = url.replace(SUPABASE_OBJECT_PATH, SUPABASE_RENDER_PATH);

  const params = new URLSearchParams();
  params.set("width", String(width));
  // Bounding box: default height to width so a width-only caller still gets a
  // proportional (contain) result instead of a stretched image.
  params.set("height", String(height ?? width));
  params.set("resize", resize);
  params.set("quality", String(quality));
  if (format !== "origin") params.set("format", format);

  return `${renderUrl}?${params.toString()}`;
}

/**
 * Responsive srcSet across widths (for retina / large screens). Each width is
 * a square bounding box (contain), so any aspect ratio stays proportional.
 * Returns '' for non-transformable URLs (caller should omit the attribute).
 */
export function getResponsiveSrcSet(
  url: string | null | undefined,
  widths: number[] = [400, 800, 1200],
  options: Omit<OptimizationOptions, "width"> = {},
): string {
  if (!url || !isTransformable(url)) return "";
  return widths
    .map((width) => `${getOptimizedImageUrl(url, { ...options, width })} ${width}w`)
    .join(", ");
}
