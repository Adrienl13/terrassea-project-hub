// ============================================================================
// variantsGridHelpers — types et helpers utilisés par VariantsGrid
// ============================================================================
//
// Extrait dans un fichier séparé pour éviter le warning eslint
// react-refresh/only-export-components (un fichier composant React ne doit
// exporter que des composants pour que Fast Refresh fonctionne).
//
// Phase 1 ÉTAPE 6b — chantier Modèle B variants étendu.

import { z } from "zod";

// ── Local row type (sans product_id, ajouté à la persistance ÉTAPE 6c) ─────

export type LocalVariantRow = {
  _localId: string;
  sku: string | null;
  width_cm: number | null;
  depth_cm: number | null;
  material_brand_id: string | null;
  fabric_color_slug: string | null;
  frame_finish_slug: string | null;
  price_eur: number | null;
  in_stock: boolean;
  is_default: boolean;
};

// Validation schema (slim — sans product_id qui n'existe pas en flow création)
export const variantRowSchema = z.object({
  sku: z.string().max(100).nullable(),
  width_cm: z.number().min(0).max(99999.9).nullable(),
  depth_cm: z.number().min(0).max(99999.9).nullable(),
  material_brand_id: z.string().uuid().nullable(),
  fabric_color_slug: z.string().nullable(),
  frame_finish_slug: z.string().nullable(),
  price_eur: z.number().min(0).nullable(),
  in_stock: z.boolean(),
  is_default: z.boolean(),
});

const newLocalId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export function makeEmptyVariantRow(isDefault = false): LocalVariantRow {
  return {
    _localId: newLocalId(),
    sku: null,
    width_cm: null,
    depth_cm: null,
    material_brand_id: null,
    fabric_color_slug: null,
    frame_finish_slug: null,
    price_eur: null,
    in_stock: false,
    is_default: isDefault,
  };
}
