// ============================================================================
// Product category normalizer (chantier vocab 2026, ÉTAPE 7.1)
//
// Maps free-form category strings (from AI scanners, CSV imports, partner
// submissions) to canonical lowercase-kebab slugs aligned with the DB and
// frontend CATEGORIES list.
//
// Heuristic for legacy "seating" : detect armchair / stool keywords in name +
// subcategory across the 4 supported languages (en/fr/es/it). Without keyword
// match, fallback to 'chairs'.
//
// Long-term clean fix (BACKLOG_POST_VOCAB.md) : update edge function prompts
// (enrich-products, analyze-product-image, analyze-csv-products,
// analyze-terrace) to return canonical slugs directly. This helper bridges
// the gap until then.
// ============================================================================

export const CANONICAL_CATEGORIES = [
  "chairs",
  "armchairs",
  "bar-stools",
  "tables",
  "parasols",
  "loungers",
  "sofas",
  "accessories",
] as const;

export type CanonicalCategory = (typeof CANONICAL_CATEGORIES)[number];

/** Direct slug aliases (legacy ↔ canonical). Lowercase keys only. */
const DIRECT_ALIASES: Record<string, CanonicalCategory> = {
  // Already canonical
  chairs: "chairs",
  armchairs: "armchairs",
  "bar-stools": "bar-stools",
  tables: "tables",
  parasols: "parasols",
  loungers: "loungers",
  sofas: "sofas",
  accessories: "accessories",
  // Legacy / capitalised / variants
  chair: "chairs",
  armchair: "armchairs",
  "bar stools": "bar-stools",
  barstools: "bar-stools",
  "bar stool": "bar-stools",
  barstool: "bar-stools",
  stool: "bar-stools",
  stools: "bar-stools",
  table: "tables",
  parasol: "parasols",
  umbrella: "parasols",
  lounger: "loungers",
  "sun-loungers": "loungers",
  "sun loungers": "loungers",
  "sun lounger": "loungers",
  daybed: "loungers",
  daybeds: "loungers",
  sofa: "sofas",
  couch: "sofas",
  sectional: "sofas",
  "lounge seating": "sofas",
  "lounge-seating": "sofas",
  banquette: "sofas",
  banquettes: "sofas",
  accessory: "accessories",
};

/**
 * Regex per-language for the heuristic seating fallback.
 *
 * Uses `(?<!\p{L})` / `(?!\p{L})` instead of `\b` so that words with accents
 * (sillón, ç…) are matched correctly. Flag `u` is required to enable `\p{L}`
 * (Unicode Letter category).
 *
 * Italian : poltrona (sing.) / poltrone (plur.) → `poltron[ae]`
 * Spanish : sillón / sillones / sillon (no-accent variant) → `sillón|sillones?|sillon`
 */
const ARMCHAIR_KEYWORD_RE =
  /(?<!\p{L})(armchairs?|fauteuils?|poltron[ae]|sillón|sillones?|sillon)(?!\p{L})/iu;
const STOOL_KEYWORD_RE =
  /(?<!\p{L})(stools?|tabourets?|sgabell[oi]|taburetes?)(?!\p{L})/iu;

/**
 * Normalize a free-form category string to a canonical slug.
 *
 * - If `rawCategory` matches a direct alias (after lowercase + trim), return it.
 * - If it equals `seating` (legacy generic), inspect `name` + `subcategory`:
 *     - keyword "armchair / fauteuil / …" → 'armchairs'
 *     - keyword "stool / tabouret / …" → 'bar-stools'
 *     - else → 'chairs'
 * - Otherwise return the original `rawCategory` (caller may decide to reject).
 */
export function normalizeProductCategory(
  rawCategory: string | null | undefined,
  context: { name?: string | null; subcategory?: string | null } = {},
): string {
  const raw = String(rawCategory ?? "").trim();
  const lower = raw.toLowerCase();

  if (lower === "seating") {
    const haystack = `${context.name ?? ""} ${context.subcategory ?? ""}`.toLowerCase();
    if (STOOL_KEYWORD_RE.test(haystack)) return "bar-stools";
    if (ARMCHAIR_KEYWORD_RE.test(haystack)) return "armchairs";
    return "chairs";
  }

  if (DIRECT_ALIASES[lower]) return DIRECT_ALIASES[lower];

  return raw;
}
