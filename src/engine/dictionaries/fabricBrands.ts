// ============================================================================
// Fabric brand dictionary — outdoor hospitality 2026 vocabulary
// Created during chantier vocab 2026 — see docs/chantiers/2026-05/PLAN_VOCAB_FIELDS.md §4.2
//
// Used by:
//   - ParasolSpecsSection (UI dropdown)
//   - parasolSpecsSchema zod enum
//   - intentDetector.ts (will import in ÉTAPE 7 to add detectFabricBrand)
//
// The 5 named brands are the most common premium fabric certifications in
// the European outdoor hospitality market (parasols, sun lounger cushions,
// outdoor sofa upholstery). 'Other' covers known but less common brands ;
// 'Unknown' is the default for unverified/missing data.
// ============================================================================

export const FABRIC_BRAND_SLUGS = [
  "Sunbrella",
  "Solaris",
  "Dickson_Orchestra",
  "Dickson_Saphir",
  "Serge_Ferrari",
  "Other",
  "Unknown",
] as const;

export type FabricBrandSlug = (typeof FABRIC_BRAND_SLUGS)[number];

/** Human-readable labels (latin script, marketing-correct typography). */
export const FABRIC_BRAND_LABELS: Record<FabricBrandSlug, string> = {
  Sunbrella: "Sunbrella",
  Solaris: "Solaris",
  Dickson_Orchestra: "Dickson Orchestra",
  Dickson_Saphir: "Dickson Saphir",
  Serge_Ferrari: "Serge Ferrari",
  Other: "Other",
  Unknown: "Unknown",
};

/**
 * Premium-tier brands (used to derive `'premium-fabric'` technical_tag in the
 * auto_derive_product_tags trigger — extension scheduled for ÉTAPE 7).
 */
export const PREMIUM_FABRIC_BRANDS: ReadonlySet<FabricBrandSlug> = new Set([
  "Sunbrella",
  "Solaris",
  "Dickson_Orchestra",
  "Dickson_Saphir",
  "Serge_Ferrari",
]);

/**
 * Lowercase term map used by intentDetector and CSV/AI ingestion to detect
 * fabric brand mentions in free-form text and route them to the canonical
 * slug. Variants (e.g. "soltis" → Serge Ferrari) are intentional.
 */
export const TERM_TO_FABRIC_BRAND_SLUG: Record<string, FabricBrandSlug> = {
  sunbrella: "Sunbrella",
  solaris: "Solaris",
  "solaris trevira": "Solaris",
  "dickson orchestra": "Dickson_Orchestra",
  "orchestra max": "Dickson_Orchestra",
  "dickson saphir": "Dickson_Saphir",
  "serge ferrari": "Serge_Ferrari",
  soltis: "Serge_Ferrari",
};

/** Detects a fabric brand mention in free-form text (case-insensitive). */
export function detectFabricBrand(text: string): FabricBrandSlug | null {
  const lower = text.toLowerCase().trim();
  for (const [term, slug] of Object.entries(TERM_TO_FABRIC_BRAND_SLUG)) {
    if (lower.includes(term)) return slug;
  }
  return null;
}
