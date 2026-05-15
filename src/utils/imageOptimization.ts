// ============================================================================
// Image optimization helpers — Supabase Storage Render API
//
// 🚨 STATUS 2026-05-15 : DÉSACTIVÉ TEMPORAIREMENT (no-op explicite).
//
// Smoke test live a révélé que les images ProductDetail (BAHIA 001, COSTA RICA
// 004, BAHAMAS 001) étaient COUPÉES sur les côtés en Free tier. La Render
// Image API recadre les images au lieu de retourner l'original dégradé.
//
// Le helper passe en no-op : retourne l'URL originale telle quelle. Le payload
// est plus lourd (pas de webp / pas de redimensionnement) mais le visuel est
// correct, ce qui prime pendant la phase démarchage Salone active.
//
// Réactivation prévue lors de l'activation Supabase Pro (Dette 99 escaladée
// P2 → P0). Le code original est préservé en bas de ce fichier en commentaire
// pour roll-forward sans archéologie git.
//
// Origin : Dette 97 — Mobile Performance Lot 2 (2026-05-14, commit f877947).
// Désactivation : Dette 99 / fix urgent 2026-05-15.
// Reference : docs/strategy/MOBILE_PERFORMANCE_AUDIT.md
// ============================================================================

export interface OptimizationOptions {
  /** Target width in pixels. Ignoré en mode no-op. */
  width?: number;
  /** Target height in pixels. Ignoré en mode no-op. */
  height?: number;
  /** Quality 1-100. Ignoré en mode no-op. */
  quality?: number;
  /** Output format. Ignoré en mode no-op. */
  format?: "webp" | "jpg" | "origin";
  /** Resize mode. Ignoré en mode no-op. */
  resize?: "cover" | "contain" | "fill";
}

/**
 * NO-OP : retourne l'URL originale telle quelle (Free tier safe).
 * Retourne '' si input null/undefined/empty (safe pour <img src="" />).
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  _options: OptimizationOptions = {},
): string {
  return url ?? "";
}

/**
 * NO-OP : retourne '' systématiquement. Les callers qui passent ce résultat
 * au prop `srcSet` doivent gérer la chaîne vide proprement (omission de
 * l'attribut). Les composants qui passent déjà un fallback `src` correct
 * affichent l'image originale sans dégradation visuelle.
 */
export function getResponsiveSrcSet(
  _url: string | null | undefined,
  _widths: number[] = [400, 800, 1200],
  _options: Omit<OptimizationOptions, "width"> = {},
): string {
  return "";
}

// ============================================================================
// === CODE ORIGINAL — À RÉACTIVER POST-SUPABASE PRO (Dette 99) ===============
// ============================================================================
//
// export function getOptimizedImageUrl(
//   url: string | null | undefined,
//   options: OptimizationOptions = {},
// ): string {
//   if (!url) return "";
//
//   // Skip non-Supabase URLs (external CDN, placeholder paths, etc.).
//   if (!url.includes("/storage/v1/object/")) {
//     return url;
//   }
//
//   const { width = 800, height, quality = 80, format = "webp", resize } = options;
//
//   // Convert object URL → render URL.
//   const renderUrl = url.replace("/storage/v1/object/", "/storage/v1/render/image/");
//
//   const params = new URLSearchParams();
//   params.set("width", String(width));
//   if (height != null) params.set("height", String(height));
//   params.set("quality", String(quality));
//   if (format !== "origin") params.set("format", format);
//   if (resize) params.set("resize", resize);
//
//   return `${renderUrl}?${params.toString()}`;
// }
//
// export function getResponsiveSrcSet(
//   url: string | null | undefined,
//   widths: number[] = [400, 800, 1200],
//   options: Omit<OptimizationOptions, "width"> = {},
// ): string {
//   if (!url || !url.includes("/storage/v1/object/")) return "";
//
//   return widths
//     .map((width) => `${getOptimizedImageUrl(url, { ...options, width })} ${width}w`)
//     .join(", ");
// }
//
// ============================================================================
