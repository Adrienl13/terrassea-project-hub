/**
 * Multilingual search normalization — thin shim over the engine.
 * Delegates to intentDetector's normalizeQuery which has the full
 * 500+ term multilingual dictionary (EN, FR, IT, ES, DE).
 */
import { normalizeQuery } from "@/engine/intentDetector";

export function normalizeSearchQuery(query: string): string {
  const norm = normalizeQuery(query);
  const parts: string[] = [];
  if (norm.categorySlug) parts.push(norm.categorySlug);
  parts.push(...norm.colorSlugs, ...norm.styleSlugs, ...norm.materialSlugs);
  parts.push(...norm.useCaseSlugs, ...norm.rawTerms);
  return parts.join(" ") || query.toLowerCase().trim();
}
