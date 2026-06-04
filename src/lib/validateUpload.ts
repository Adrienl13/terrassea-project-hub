const DEFAULT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validateImageUpload(
  file: File,
  opts?: { maxSizeMB?: number; allowSvg?: boolean },
): string | null {
  const maxMB = opts?.maxSizeMB ?? 5;
  const allowed = opts?.allowSvg
    ? [...DEFAULT_IMAGE_TYPES, "image/svg+xml"]
    : DEFAULT_IMAGE_TYPES;

  if (!allowed.includes(file.type)) {
    return `Type non supporté (${file.type}). Utilisez JPG, PNG ou WebP.`;
  }
  if (file.size > maxMB * 1024 * 1024) {
    return `Fichier trop volumineux (max ${maxMB} Mo).`;
  }
  return null;
}

export function validatePdfUpload(
  file: File,
  opts?: { maxSizeMB?: number },
): string | null {
  const maxMB = opts?.maxSizeMB ?? 25;
  // Some browsers report an empty type for .pdf drag-drops — fall back to the
  // extension so a genuine PDF isn't rejected.
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!isPdf) {
    return `Type non supporté (${file.type || "inconnu"}). Seuls les PDF sont acceptés.`;
  }
  if (file.size > maxMB * 1024 * 1024) {
    return `Fichier trop volumineux (max ${maxMB} Mo).`;
  }
  return null;
}
