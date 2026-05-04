// ============================================================================
// productAvailability — helpers d'affichage du statut de disponibilité
// ÉTAPE 9a-fix-2-ε.
//
// Centralise getAvailabilityFromVariant pour pouvoir le tester en isolation.
// Le helper legacy getAvailability(product) reste dans ProductDetailDrawer
// (pré-existant, hors scope ε).
//
// Pattern aligné sur cartHelpers.ts : pure function, pas de React, pas de I/O.
// ============================================================================

import type { DBProduct } from "@/lib/products";
import type { DBProductVariant } from "@/lib/productVariants";

export interface AvailabilityInfo {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  iconKey: "check" | "alert" | "clock" | "package";
  description: string;
}

/**
 * Mappe les flags d'une variant Modèle B vers le shape AvailabilityInfo
 * affiché dans le drawer panel et SupplierRecommendations.
 *
 * 4 branches (cf. data check 2026-05-04 sur DEMO-T-{80,120,160}) :
 *   1. is_made_to_order=true → "Made to order" + lead time variant > product
 *   2. in_stock=true + qty définie ≤ 20 → "Low stock" + count
 *   3. in_stock=true (qty > 20 ou null) → "In stock" générique
 *   4. in_stock=false && !is_made_to_order → "Availability on request"
 *
 * NB : "iconKey" est une clé sémantique, mappée à un composant lucide-react
 * côté drawer (pour éviter d'importer lucide depuis une lib pure).
 */
export function getAvailabilityFromVariant(
  v: DBProductVariant,
  p: DBProduct,
): AvailabilityInfo {
  if (v.is_made_to_order) {
    let leadTime: string | null = null;
    if (v.delivery_weeks_min != null && v.delivery_weeks_max != null) {
      leadTime = `Lead time: ${v.delivery_weeks_min}–${v.delivery_weeks_max} weeks`;
    } else if (v.delivery_weeks_min != null) {
      leadTime = `Lead time: ${v.delivery_weeks_min} weeks`;
    } else if (p.estimated_delivery_days) {
      const wMin = Math.ceil(p.estimated_delivery_days / 7);
      leadTime = `Lead time: ${wMin}–${wMin + 2} weeks`;
    }
    return {
      label: "Made to order",
      variant: "outline",
      iconKey: "clock",
      description: leadTime ?? "Lead time on request",
    };
  }
  if (v.in_stock && v.stock_quantity != null && v.stock_quantity > 0 && v.stock_quantity <= 20) {
    return {
      label: "Low stock",
      variant: "secondary",
      iconKey: "alert",
      description: `${v.stock_quantity} units available`,
    };
  }
  if (v.in_stock) {
    return {
      label: "In stock",
      variant: "default",
      iconKey: "check",
      description:
        v.stock_quantity != null
          ? `${v.stock_quantity} units available`
          : "Available for immediate dispatch",
    };
  }
  return {
    label: "Availability on request",
    variant: "outline",
    iconKey: "package",
    description: "Contact us for availability details",
  };
}
