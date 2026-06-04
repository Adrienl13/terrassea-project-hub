/**
 * Catalog metadata stored in `partners.documents` (jsonb). Shared shape between
 * the public download component, the partner upload form and the edge function.
 *
 * Kept in this tiny dependency-free module (no React, no UI imports) so callers
 * can cheaply detect whether a partner has catalogs WITHOUT pulling the heavier
 * <CatalogDownload> component (Dialog + form) into their bundle. The public
 * pages use this to gate a lazy import — pages with no catalog never load the
 * download UI at all.
 */
export interface CatalogDoc {
  id: string;
  kind: "catalog";
  title: string;
  path: string;
  filename: string;
  size?: number;
  uploaded_at?: string;
}

/** Narrow an opaque jsonb `documents` array down to catalog entries. */
export function extractCatalogs(documents: unknown): CatalogDoc[] {
  if (!Array.isArray(documents)) return [];
  return documents.filter(
    (d): d is CatalogDoc =>
      !!d &&
      typeof d === "object" &&
      (d as CatalogDoc).kind === "catalog" &&
      !!(d as CatalogDoc).id &&
      !!(d as CatalogDoc).path,
  );
}
