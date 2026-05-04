// ============================================================================
// cartHelpers — pure helpers utilisés par ProjectCart display
// ============================================================================
//
// Phase 1 ÉTAPE 9a-fix-2-α du chantier Modèle B variants étendu.
//
// Centralise la logique de calcul du prix effectif d'un cart item, qui doit
// gérer 3 couches de priorité :
//   1. Variante Modèle B sélectionnée (selectedModelBVariantId) → variant.price_eur
//   2. Supplier sélectionné (selectedSupplier.price) — legacy multi-supplier
//   3. Fallback product.price_min (legacy 1-variant)
//
// La commission partenaire est appliquée upstream par les fetchers
// (fetchProductById, fetchProductOffers, fetchProductVariantsByProductId).
// Le helper ne fait PAS de calcul de commission.

import type { CartItem } from "@/contexts/ProjectCartContext";
import type { DBProductVariant } from "@/lib/productVariants";

// ── Merge identity (ÉTAPE 9a-fix-2-α) ───────────────────────────────────────

/**
 * Identité d'un cart item pour le merge.
 * Pour Modèle B : 2 variants distinctes du même product → 2 items distincts.
 * Pour legacy (variant_id undefined) : merge par product_id seul.
 */
export function cartItemMatchesIdentity(
  item: Pick<CartItem, "product" | "selectedModelBVariantId">,
  productId: string,
  selectedModelBVariantId: string | undefined,
): boolean {
  return (
    item.product.id === productId &&
    (item.selectedModelBVariantId ?? null) === (selectedModelBVariantId ?? null)
  );
}

/**
 * Retourne le prix effectif (commission incluse) à afficher pour un cart item.
 *
 * Priorité :
 *   1. Si l'item a un selectedModelBVariantId ET le variant correspondant est
 *      présent dans le tableau `variants` ET son price_eur est non-null →
 *      retourne variant.price_eur (Number) — commission déjà appliquée par
 *      fetchProductVariantsByProductId.
 *   2. Sinon, si selectedSupplier?.price est non-null → retourne ce prix —
 *      patché par buildSupplier ÉTAPE 9a-fix avec effectivePriceOf(offer).
 *   3. Sinon → retourne product.price_min (commission appliquée par
 *      fetchProductById) ou null.
 *
 * Régression zéro absolue : pour les products legacy 1-variant
 * (selectedModelBVariantId undefined), comportement identique à l'avant
 * fix-2 (priorité supplier → product.price_min).
 */
export function getEffectiveCartPrice(
  item: CartItem,
  variants?: DBProductVariant[] | null,
): number | null {
  // Priorité 1 : variante Modèle B
  if (item.selectedModelBVariantId && variants && variants.length > 0) {
    const variant = variants.find((v) => v.id === item.selectedModelBVariantId);
    if (variant?.price_eur != null) {
      const n = Number(variant.price_eur);
      if (Number.isFinite(n)) return n;
    }
  }
  // Priorité 2 : supplier (avec effectivePriceOf appliqué côté buildSupplier)
  if (item.selectedSupplier?.price != null) {
    const n = Number(item.selectedSupplier.price);
    if (Number.isFinite(n)) return n;
  }
  // Priorité 3 : product.price_min (commission appliquée par fetchProductById)
  if (item.product.price_min != null) {
    const n = Number(item.product.price_min);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

// ── Stock status (ζ — 2026-05-04) ───────────────────────────────────────────

export type EffectiveStockStatus =
  | "in_stock"
  | "made_to_order"
  | "availability_on_request";

/**
 * Statut de stock affichable pour un cart item.
 *
 * Priorité :
 *   1. Si l'item a un selectedModelBVariantId ET le variant correspondant
 *      est trouvé → mappe ses flags variant.is_made_to_order / in_stock vers
 *      l'un des 3 statuts canoniques.
 *   2. Sinon (legacy 1-variant) → utilise product.stock_status si disponible
 *      et reconnaissable ; sinon retourne null (pas de badge à afficher).
 *
 * Régression zéro : null = comportement legacy (rien à afficher), comme
 * avant ζ.
 */
export function getEffectiveStockStatus(
  item: CartItem,
  variants?: DBProductVariant[] | null,
): EffectiveStockStatus | null {
  // Priorité 1 : variant Modèle B
  if (item.selectedModelBVariantId && variants && variants.length > 0) {
    const variant = variants.find((v) => v.id === item.selectedModelBVariantId);
    if (variant) {
      if (variant.is_made_to_order) return "made_to_order";
      if (variant.in_stock) return "in_stock";
      return "availability_on_request";
    }
    // variant absente (deleted DB) → fallback product
  }
  // Priorité 2 : product legacy
  const raw = item.product.stock_status?.toLowerCase();
  if (raw === "in_stock" || raw === "available") return "in_stock";
  if (raw === "made_to_order" || raw === "on_order") return "made_to_order";
  if (raw === "out_of_stock") return "availability_on_request";
  return null;
}
