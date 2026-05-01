// ============================================================================
// Material brands mapping — TS dictionary slugs (CamelCase) ↔ DB slugs (kebab)
// Created during chantier Modèle B variants — ÉTAPE 2 (2026-05-01).
//
// Why this exists:
//   - src/engine/dictionaries/fabricBrands.ts uses CamelCase slugs
//     (Sunbrella, Solaris, Dickson_Orchestra, …) — wired into ParasolSpecsSection
//     UI and parasolSpecsSchema zod enum, both shipping in the products table
//     fabric_certification column (legacy Phase 1).
//   - public.material_brands table uses lowercase-kebab slugs (sunbrella, solaris,
//     dickson-orchestra, …) — aligned with categories normalization 2026-04-30.
//
// This module is the single source of truth for the bidirectional mapping
// between the two representations. Use it in:
//   - The migration that copies products.fabric_certification onto
//     product_variants.material_brand_id (ÉTAPE 4)
//   - The partner-dashboard UI when a user picks a TS slug and we persist
//     a material_brand_id
//   - The admin re-tag flows (Phase 2)
// ============================================================================

import type { FabricBrandSlug } from "@/engine/dictionaries/fabricBrands";

/** Canonical lowercase-kebab DB slugs (subset relevant for fabric brands). */
export const MATERIAL_BRAND_DB_SLUG = {
  sunbrella: "sunbrella",
  solaris: "solaris",
  dicksonOrchestra: "dickson-orchestra",
  dicksonSaphir: "dickson-saphir",
  sergeFerrari: "serge-ferrari",
  otherFabric: "other-fabric",
  unknown: "unknown",
} as const;

export type MaterialBrandDbSlug =
  (typeof MATERIAL_BRAND_DB_SLUG)[keyof typeof MATERIAL_BRAND_DB_SLUG];

/** TS CamelCase → DB kebab. Total covers every value of FabricBrandSlug. */
export const FABRIC_BRAND_TS_TO_DB: Record<FabricBrandSlug, MaterialBrandDbSlug> = {
  Sunbrella: "sunbrella",
  Solaris: "solaris",
  Dickson_Orchestra: "dickson-orchestra",
  Dickson_Saphir: "dickson-saphir",
  Serge_Ferrari: "serge-ferrari",
  Other: "other-fabric",
  Unknown: "unknown",
};

/** DB kebab → TS CamelCase. Reverse of FABRIC_BRAND_TS_TO_DB (only fabric). */
export const FABRIC_BRAND_DB_TO_TS: Record<MaterialBrandDbSlug, FabricBrandSlug> = {
  sunbrella: "Sunbrella",
  solaris: "Solaris",
  "dickson-orchestra": "Dickson_Orchestra",
  "dickson-saphir": "Dickson_Saphir",
  "serge-ferrari": "Serge_Ferrari",
  "other-fabric": "Other",
  unknown: "Unknown",
};

/**
 * Convert a TS dictionary slug (CamelCase) to a DB material_brands.slug (kebab).
 * Falls back to 'unknown' for any unrecognised input — preserves invariant
 * "every product has a resolvable material_brand_id" during ingestion.
 */
export function tsBrandToDbSlug(ts: string | null | undefined): MaterialBrandDbSlug {
  if (!ts) return "unknown";
  const direct = FABRIC_BRAND_TS_TO_DB[ts as FabricBrandSlug];
  return direct ?? "unknown";
}

/**
 * Convert a DB material_brands.slug to the TS CamelCase representation used
 * in the parasolSpecsSchema zod enum and ParasolSpecsSection UI.
 * Falls back to 'Unknown' for non-fabric slugs (wood/metal/composite have no
 * TS counterpart in fabricBrands.ts; UI consumers should not be calling this
 * with non-fabric DB slugs).
 */
export function dbSlugToTsBrand(db: string | null | undefined): FabricBrandSlug {
  if (!db) return "Unknown";
  const direct = FABRIC_BRAND_DB_TO_TS[db as MaterialBrandDbSlug];
  return direct ?? "Unknown";
}

/**
 * The set of DB slugs that correspond to fabric brands tracked in fabricBrands.ts.
 * Used to filter material_brands rows when populating the parasol fabric picker.
 */
export const FABRIC_DB_SLUGS: ReadonlySet<MaterialBrandDbSlug> = new Set(
  Object.values(MATERIAL_BRAND_DB_SLUG),
);
