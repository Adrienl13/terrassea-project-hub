import type { DBProduct } from "@/lib/products";

// ── Types ────────────────────────────────────────────────────

export interface SimilarityResult {
  product: DBProduct;
  score: number; // 0-100
  reasons: string[]; // ["Same archetype", "Name 85% similar", "Identical dimensions"]
}

// ── Name similarity (bigram overlap) ─────────────────────────

function nameSimilarity(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return 0;

  const bigrams = (s: string): string[] => {
    const result: string[] = [];
    for (let i = 0; i < s.length - 1; i++) result.push(s.slice(i, i + 2));
    return result;
  };

  const ba = bigrams(na);
  const bb = bigrams(nb);
  const common = ba.filter((b) => bb.includes(b)).length;
  return common / Math.max(ba.length, bb.length, 1);
}

// ── Dimension comparison (±2 cm tolerance) ───────────────────

function dimensionsMatch(
  a: Partial<DBProduct>,
  b: DBProduct
): boolean {
  const close = (v1: number | null | undefined, v2: number | null | undefined): boolean => {
    if (v1 == null || v2 == null) return false;
    return Math.abs(v1 - v2) <= 2;
  };

  return (
    close(a.dimensions_length_cm, b.dimensions_length_cm) &&
    close(a.dimensions_width_cm, b.dimensions_width_cm) &&
    close(a.dimensions_height_cm, b.dimensions_height_cm)
  );
}

// ── Material tag overlap ─────────────────────────────────────

function materialOverlap(
  a: string[] | undefined,
  b: string[]
): number {
  if (!a || a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  return a.filter((tag) => setB.has(tag)).length;
}

// ── Main scoring function ────────────────────────────────────

function computeSimilarity(
  newProduct: Partial<DBProduct>,
  existing: DBProduct
): SimilarityResult | null {
  let score = 0;
  const reasons: string[] = [];

  // Same archetype_id (both non-null): +40
  if (
    newProduct.archetype_id &&
    existing.archetype_id &&
    newProduct.archetype_id === existing.archetype_id
  ) {
    score += 40;
    reasons.push("Same archetype");
  }

  // Name similarity (bigram > 0.8): +20
  if (newProduct.name && existing.name) {
    const sim = nameSimilarity(newProduct.name, existing.name);
    if (sim > 0.8) {
      score += 20;
      reasons.push(`Name ${Math.round(sim * 100)}% similar`);
    }
  }

  // Same dimensions (±2cm on L, W, H): +15
  if (dimensionsMatch(newProduct, existing)) {
    score += 15;
    reasons.push("Identical dimensions");
  }

  // Same category + subcategory: +10
  if (
    newProduct.category &&
    existing.category &&
    newProduct.category === existing.category &&
    newProduct.subcategory &&
    existing.subcategory &&
    newProduct.subcategory === existing.subcategory
  ) {
    score += 10;
    reasons.push("Same category & subcategory");
  }

  // Material tags overlap (≥2 common tags): +10
  const overlap = materialOverlap(newProduct.material_tags, existing.material_tags);
  if (overlap >= 2) {
    score += 10;
    reasons.push(`${overlap} common material tags`);
  }

  // Same brand_source: +5
  if (
    newProduct.brand_source &&
    existing.brand_source &&
    newProduct.brand_source === existing.brand_source
  ) {
    score += 5;
    reasons.push("Same brand");
  }

  // Same collection: +5
  if (
    newProduct.collection &&
    existing.collection &&
    newProduct.collection === existing.collection
  ) {
    score += 5;
    reasons.push("Same collection");
  }

  return { product: existing, score, reasons };
}

// ── Public API ───────────────────────────────────────────────

/**
 * Find products in the catalog that are similar to a new/candidate product.
 * Returns all matches with score >= threshold, sorted descending by score.
 */
export function findSimilarProducts(
  newProduct: Partial<DBProduct>,
  catalog: DBProduct[],
  threshold: number = 60
): SimilarityResult[] {
  const results: SimilarityResult[] = [];

  for (const existing of catalog) {
    // Skip comparing against itself
    if (newProduct.id && newProduct.id === existing.id) continue;

    const result = computeSimilarity(newProduct, existing);
    if (result && result.score >= threshold) {
      results.push(result);
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
