// ============================================================================
// productRoutes — URL helpers for canonical /products/[brand-slug]/[product-slug]
// ÉTAPE 9b-2a (2026-05-04).
//
// Centralizes :
//   - urlForProduct(product, partner?) : build canonical URL or fallback to /products/[id]
//   - resolveProductBySlugs(brandSlug, productSlug) : lookup product via slugs (partner JOIN)
//
// Pattern aligned with cartHelpers / productAvailability : pure functions
// + thin async wrapper around supabase. Tests in src/test/product-routes.test.ts.
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import { fetchProductById, type DBProduct } from "@/lib/products";

/**
 * Generate canonical product URL when both brand-slug and product-slug are
 * available, fallback to `/products/[id]` otherwise. Garantit régression zéro
 * sur les products ou partners sans slug renseigné (ex: data partielle Phase 1).
 */
export function urlForProduct(
  product: Pick<DBProduct, "id" | "product_slug">,
  partnerSlug?: string | null,
): string {
  if (partnerSlug && product.product_slug) {
    return `/products/${partnerSlug}/${product.product_slug}`;
  }
  return `/products/${product.id}`;
}

/**
 * Resolve a product by (brandSlug, productSlug) via JOIN partners ON
 * partners.id = products.owner_brand_id. Renvoie le DBProduct complet avec
 * commission appliquée (réutilise fetchProductById qui applique la même
 * logique commission/brand_source).
 *
 * Renvoie null si aucun product ne matche — le composant routing gère le 404.
 */
export async function resolveProductBySlugs(
  brandSlug: string,
  productSlug: string,
): Promise<DBProduct | null> {
  if (!brandSlug || !productSlug) return null;

  // Step 1: resolve brand-slug → partner.id
  const { data: partner, error: partnerErr } = await supabase
    .from("partners")
    .select("id")
    .eq("slug", brandSlug)
    .maybeSingle();

  if (partnerErr || !partner) return null;

  // Step 2: resolve (owner_brand_id, product_slug) → product.id
  const { data: row, error: prodErr } = await supabase
    .from("products")
    .select("id")
    .eq("owner_brand_id", partner.id)
    .eq("product_slug", productSlug)
    .neq("availability_type", "discontinued")
    .maybeSingle();

  if (prodErr || !row) return null;

  // Step 3: delegate to fetchProductById (commission + brand_source masking)
  return fetchProductById(row.id);
}
