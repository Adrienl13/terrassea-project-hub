// ============================================================================
// ProductSchemaOrg — React component injecting Schema.org JSON-LD
// ÉTAPE 9b-3 (2026-05-04).
//
// Pure builder lives in src/lib/productSchemaOrg.ts (testable in isolation).
// This component just mounts the JSON-LD <script> in <head> via useEffect.
// ============================================================================

import { useEffect } from "react";
import type { DBProduct } from "@/lib/products";
import type { DBProductVariant } from "@/lib/productVariants";
import { buildProductSchema, type ReviewStats } from "@/lib/productSchemaOrg";

interface ProductSchemaOrgProps {
  product: DBProduct;
  variants?: DBProductVariant[];
  /** Partner.name to expose as Brand.name (preferred over product.brand_source which is often null Phase 1). */
  partnerName?: string | null;
  offerCount?: number;
  reviewStats?: ReviewStats | null;
}

export default function ProductSchemaOrg({
  product,
  variants = [],
  partnerName,
  offerCount,
  reviewStats,
}: ProductSchemaOrgProps) {
  useEffect(() => {
    const schema = buildProductSchema(product, variants, partnerName, offerCount, reviewStats);
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-jsonld", "product");
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [product, variants, partnerName, offerCount, reviewStats]);

  return null;
}
