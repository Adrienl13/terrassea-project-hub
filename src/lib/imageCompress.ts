// ============================================================================
// Client-side image compression (insertion layer).
//
// Resizes proportionally (single scale ratio → never distorts) and re-encodes
// to WebP at high quality before upload, so stored originals stay light
// (a 6400px / 9 MB phone photo → ~200-400 KB) without visible loss at web
// sizes. EXIF orientation is applied via createImageBitmap (avoids the rotated
// /"déformé" photos). Any failure or non-raster input → returns the original
// file untouched (never blocks the user).
//
// Locked settings 2026-06-03: max 2560px longest side, quality 0.85, WebP.
// ============================================================================

const DEFAULT_MAX_SIZE = 2560;
const DEFAULT_QUALITY = 0.85;

export interface CompressOptions {
  maxSize?: number;
  quality?: number;
}

export async function compressImage(file: File, opts: CompressOptions = {}): Promise<File> {
  const maxSize = opts.maxSize ?? DEFAULT_MAX_SIZE;
  const quality = opts.quality ?? DEFAULT_QUALITY;

  // Skip vectors / animated / non-images (logos stay crisp, GIFs keep animation).
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/svg+xml" || file.type === "image/gif") return file;
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file;

  try {
    // Decode with EXIF orientation applied (phone photos) so the canvas output
    // is upright — otherwise images come out rotated.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const { width, height } = bitmap;
    const scale = Math.min(1, maxSize / Math.max(width, height));

    // Already within bounds and reasonably small → keep as-is (no recompress loss).
    if (scale === 1 && file.size < 1_200_000) {
      bitmap.close?.();
      return file;
    }

    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) { bitmap.close?.(); return file; }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );
    // Bail out if encoding failed or didn't actually shrink the file.
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], name, { type: "image/webp", lastModified: file.lastModified });
  } catch {
    return file;
  }
}
