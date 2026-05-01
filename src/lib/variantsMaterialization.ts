// ============================================================================
// variantsMaterialization — pure helpers used by approveAsNew (admin flow)
// ============================================================================
//
// Phase 1 ÉTAPE 7 du chantier Modèle B variants étendu.
//
// Quand l'admin approuve une submission :
//   Phase A : INSERT products (existant)
//   Phase B : INSERT product_variants depuis product_data.variants (NOUVEAU)
//   Cleanup applicatif : DELETE products si Phase B fail (cf. approveAsNew)
//
// Ce module fournit la logique pure de TRANSFORMATION (sans supabase) :
// - `buildVariantInserts` : map les variants sérialisées (LocalVariantRow
//   sans _localId) + product_id + fallback depuis pd → array d'insert payloads
//   pour product_variants
// - Fallback : si product_data.variants est vide ou absent (cas des
//   submissions legacy pré-ÉTAPE 6c), construit 1 default variant depuis
//   les champs `dimensions_*`, `price_min`, `stock_status` de la products row.
//
// Logique séparée pour testabilité (pas de dépendance supabase / React).

import type { Database } from "@/integrations/supabase/types";

export type ProductVariantInsert = Database["public"]["Tables"]["product_variants"]["Insert"];

/**
 * Variant tel que sérialisé dans product_submissions.product_data.variants
 * (LocalVariantRow sans _localId — strippé au submit côté useProductSubmission).
 */
export type SerializedVariant = {
  sku?: string | null;
  width_cm?: number | null;
  depth_cm?: number | null;
  material_brand_id?: string | null;
  fabric_color_slug?: string | null;
  frame_finish_slug?: string | null;
  price_eur?: number | null;
  in_stock?: boolean;
  is_default?: boolean;
};

/**
 * Sous-ensemble du product_data utilisé en fallback quand la submission
 * n'a pas de variants (cas des submissions legacy pré-ÉTAPE 6c).
 */
export type ProductDataFallback = {
  dimensions_length_cm?: number | null;
  dimensions_width_cm?: number | null;
  dimensions_height_cm?: number | null;
  price_min?: number | string | null;
  stock_status?: string | null;
  weight_kg?: number | string | null;
  main_color?: string | null;
};

/**
 * Construit les inserts product_variants pour un product nouvellement créé.
 *
 * - Si `serializedVariants` non-vide : map chaque variant à un insert payload
 *   en ajoutant les champs auto (product_id, source_type, validated_by/_at,
 *   is_published).
 * - Si vide ou absent : retourne 1 default variant pré-rempli depuis
 *   `productDataFallback` (régression zéro pour submissions legacy).
 *
 * Précondition : exactement 1 variant doit avoir is_default=true. La
 * validation est faite côté caller (approveAsNew lance une exception si
 * cette invariant est violée — cf. defense in depth dans submitProduct).
 */
export function buildVariantInserts(
  productId: string,
  serializedVariants: SerializedVariant[] | null | undefined,
  productDataFallback: ProductDataFallback,
  validatedBy: string | null,
): ProductVariantInsert[] {
  const now = new Date().toISOString();

  // Cas fallback : aucune variante dans la submission → 1 default depuis pd
  if (!serializedVariants || serializedVariants.length === 0) {
    return [
      {
        product_id: productId,
        sku: null,
        width_cm: productDataFallback.dimensions_length_cm ?? null,
        depth_cm: productDataFallback.dimensions_width_cm ?? null,
        height_cm: productDataFallback.dimensions_height_cm ?? null,
        weight_kg: numberOrNull(productDataFallback.weight_kg),
        material_brand_id: null,
        fabric_color_slug: null,
        frame_finish_slug: null,
        price_eur: numberOrNull(productDataFallback.price_min),
        price_currency: "EUR",
        in_stock:
          productDataFallback.stock_status === "in_stock" ||
          productDataFallback.stock_status === "low_stock",
        stock_quantity: null,
        is_made_to_order: false,
        is_default: true,
        is_published: true,
        source_type: "manual",
        extracted_at: now,
        validated_at: now,
        validated_by: validatedBy,
      },
    ];
  }

  // Cas nominal : map chaque variant sérialisée
  return serializedVariants.map((v) => ({
    product_id: productId,
    sku: v.sku ?? null,
    width_cm: v.width_cm ?? null,
    depth_cm: v.depth_cm ?? null,
    height_cm: null,
    material_brand_id: v.material_brand_id ?? null,
    fabric_color_slug: v.fabric_color_slug ?? null,
    frame_finish_slug: v.frame_finish_slug ?? null,
    price_eur: v.price_eur ?? null,
    price_currency: "EUR",
    in_stock: v.in_stock ?? false,
    is_default: v.is_default ?? false,
    is_published: true,
    source_type: "manual",
    extracted_at: now,
    validated_at: now,
    validated_by: validatedBy,
  }));
}

/**
 * Vérifie qu'exactement 1 variant a is_default=true. Utilisé par approveAsNew
 * comme defense in depth avant l'INSERT batch (refus de matérialiser une
 * configuration cassée même si le partner submit a échoué à la valider).
 */
export function assertExactlyOneDefault(
  variants: SerializedVariant[],
): { ok: true } | { ok: false; reason: "no_default" | "multiple_default"; count: number } {
  const count = variants.filter((v) => v.is_default === true).length;
  if (count === 0) return { ok: false, reason: "no_default", count };
  if (count > 1) return { ok: false, reason: "multiple_default", count };
  return { ok: true };
}

// ── Internal helpers ────────────────────────────────────────────────────────

function numberOrNull(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
