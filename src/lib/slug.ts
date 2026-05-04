// ============================================================================
// slugify — pure helper to derive URL-safe slugs from arbitrary names
// ÉTAPE 9b-1 (2026-05-04).
//
// Used for:
//   - product_slug auto-generation at admin approval (useProductSubmissions)
//   - future canonical URLs /products/[brand-slug]/[product-slug] (9b-2)
//
// Pattern aligned with Supabase trigger backfill (migration 9b-1) so client
// and server emit identical slugs. Tests in src/test/slug.test.ts.
// ============================================================================

/**
 * Convertit un nom (ex: "Café Lounge — Chair") en slug URL-safe minuscule
 * ASCII : "cafe-lounge-chair".
 *
 * Étapes :
 *   1. NFD normalize → décomposition Unicode (é → e + combining acute)
 *   2. Retire les diacritiques (̀-ͯ)
 *   3. Lowercase
 *   4. Remplace tout caractère non [a-z0-9] par '-'
 *   5. Collapse multiples '-' en un seul
 *   6. Trim '-' au début / fin
 *
 * Idempotent : slugify(slugify(x)) === slugify(x).
 *
 * Empty / whitespace input → "" (caller doit gérer le fallback ID).
 */
export function slugify(input: string): string {
  if (!input) return "";
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Génère un slug unique au sein d'un namespace (ex: par brand_id).
 * Si `slugify(name)` est déjà pris dans `existingSlugs`, ajoute un suffixe
 * `-2`, `-3`, etc. jusqu'à trouver un slug libre.
 *
 * existingSlugs : Set des slugs déjà utilisés DANS le même namespace
 * (typiquement same owner_brand_id). Side-effect-free (renvoie une nouvelle
 * string sans muter l'input).
 */
export function uniqueSlug(name: string, existingSlugs: Set<string>): string {
  const base = slugify(name);
  if (!base) return "";
  if (!existingSlugs.has(base)) return base;
  let n = 2;
  while (existingSlugs.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
