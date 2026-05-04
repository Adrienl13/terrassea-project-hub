// ============================================================================
// productSchemaOrg — pure builder for Schema.org JSON-LD
// ÉTAPE 9b-3 (2026-05-04).
//
// Extracted to its own module so that react-refresh/only-export-components
// doesn't fire on the React component file.
// ============================================================================

import type { DBProduct } from "@/lib/products";
import type { DBProductVariant } from "@/lib/productVariants";
import { ml } from "@/lib/i18nFields";
import { urlForProduct } from "@/lib/productRoutes";

export interface ReviewStats {
  avg_rating: number | null;
  review_count: number | null;
}

const SITE_URL = "https://terrassea.com";

function variantToProduct(
  variant: DBProductVariant,
  parent: DBProduct,
  partnerName?: string | null,
): Record<string, unknown> {
  const availability = variant.is_made_to_order
    ? "https://schema.org/MadeToOrder"
    : variant.in_stock
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock";

  return {
    "@type": "Product",
    name: variant.variant_name || ml(parent, "name"),
    sku: variant.sku || variant.id,
    image: parent.image_url || undefined,
    color: variant.fabric_color_slug || undefined,
    width: variant.width_cm ? `${variant.width_cm} cm` : undefined,
    depth: variant.depth_cm ? `${variant.depth_cm} cm` : undefined,
    height: variant.height_cm ? `${variant.height_cm} cm` : undefined,
    brand: partnerName ? { "@type": "Brand", name: partnerName } : undefined,
    offers:
      variant.price_eur != null
        ? {
            "@type": "Offer",
            price: Number(variant.price_eur).toFixed(2),
            priceCurrency: "EUR",
            availability,
          }
        : undefined,
  };
}

/**
 * Pure Schema.org JSON-LD builder.
 *   - 0/1 variants → @type Product (with AggregateOffer)
 *   - 2+ variants → @type ProductGroup (with hasVariant array, variesBy size)
 */
export function buildProductSchema(
  product: DBProduct,
  variants: DBProductVariant[] = [],
  partnerName?: string | null,
  offerCount?: number,
  reviewStats?: ReviewStats | null,
): Record<string, unknown> {
  const baseUrl = `${SITE_URL}${urlForProduct(product, product.owner_brand_slug)}`;
  const brand = partnerName
    ? { "@type": "Brand", name: partnerName }
    : product.brand_source
      ? { "@type": "Brand", name: product.brand_source }
      : undefined;

  if (variants.length > 1) {
    return {
      "@context": "https://schema.org",
      "@type": "ProductGroup",
      productGroupID: product.id,
      name: ml(product, "name"),
      description: ml(product, "short_description") || ml(product, "description") || undefined,
      image: product.image_url || undefined,
      url: baseUrl,
      category: product.category,
      brand,
      material: product.material_tags?.join(", ") || undefined,
      variesBy: "https://schema.org/size",
      hasVariant: variants.map((v) => variantToProduct(v, product, partnerName)),
      ...(reviewStats?.review_count && reviewStats.review_count > 0
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: reviewStats.avg_rating,
              reviewCount: reviewStats.review_count,
              bestRating: 5,
              worstRating: 1,
            },
          }
        : {}),
    };
  }

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: ml(product, "name"),
    description: ml(product, "short_description") || ml(product, "description") || undefined,
    image: product.image_url || undefined,
    url: baseUrl,
    category: product.category,
    sku: product.supplier_internal || product.id,
    brand,
    material: product.material_tags?.join(", ") || undefined,
  };

  if (product.price_min != null) {
    schema.offers = {
      "@type": "AggregateOffer",
      lowPrice: product.price_min.toFixed(2),
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      offerCount: offerCount ?? 1,
    };
  }

  if (reviewStats?.review_count && reviewStats.review_count > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: reviewStats.avg_rating,
      reviewCount: reviewStats.review_count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return schema;
}
