// ═══════════════════════════════════════════════════════════
// MULTI-ZONE ENGINE — Chantier 2 orchestrator
// ═══════════════════════════════════════════════════════════
// Hospitality clients rarely buy for a single area. A hotel has a
// pool, a restaurant, a rooftop, a lobby terrace. Brief us on each zone
// separately and we produce concept sets per zone + a consolidated
// cross-zone summary (total BOM, unified supplier coverage, aggregated
// price range). Backwards-compatible: when `zones` is absent, fall back
// to the single-zone `generateProjectConcepts`.
// ═══════════════════════════════════════════════════════════

import type { DBProduct } from "@/lib/products";
import {
  type ProjectParameters,
  type ProjectZone,
  type ProjectConcept,
} from "./types";
import { generateProjectConcepts } from "./projectEngine";
import {
  checkLayoutsCompliance,
  type ComplianceReport,
} from "./complianceEngine";

export interface ZoneResult {
  zone: ProjectZone;
  parameters: ProjectParameters;
  concepts: ProjectConcept[];
  compliance: Record<string, ComplianceReport>;
}

export interface MultiZoneResult {
  zones: ZoneResult[];
  aggregate: {
    totalSeats: number;
    totalTerraceSurface: number;
    indicativeTotalMin: number;
    indicativeTotalMax: number;
    distinctProducts: number;
    mostFrequentStyle: string | null;
    crossZoneBlockers: number; // count of compliance blockers across zones
  };
}

/**
 * Merge a zone's overrides onto the parent project parameters, preserving
 * top-level context (establishment, timeline, country) while letting each
 * zone define its own sizing and design.
 */
function materializeZoneParams(
  parent: ProjectParameters,
  zone: ProjectZone
): ProjectParameters {
  return {
    ...parent,
    projectZone:       zone.projectZone || parent.projectZone,
    seatingCapacity:   zone.seatingCapacity ?? parent.seatingCapacity,
    terraceSurfaceM2:  zone.terraceSurfaceM2 ?? parent.terraceSurfaceM2,
    seatingLayout:     zone.seatingLayout ?? parent.seatingLayout,
    layoutPriority:    zone.layoutPriority ?? parent.layoutPriority,
    style:             zone.style?.length ? zone.style : parent.style,
    ambience:          zone.ambience?.length ? zone.ambience : parent.ambience,
    isOutdoor:         zone.isOutdoor ?? parent.isOutdoor,
    selectedCategories:
      zone.selectedCategories !== undefined
        ? zone.selectedCategories
        : parent.selectedCategories,
    // Remove `zones` in the child call so we don't recurse.
    zones: undefined,
  };
}

/**
 * Main API. Generates concepts for every zone of a multi-zone project and
 * returns per-zone results plus a cross-zone aggregate.
 */
export function generateMultiZoneProject(
  input: string,
  products: DBProduct[],
  parentParams: ProjectParameters
): MultiZoneResult {
  const zones = parentParams.zones ?? [];
  const results: ZoneResult[] = [];
  const seenProducts = new Set<string>();
  const styleTally: Record<string, number> = {};
  let totalSeats = 0;
  let totalSurface = 0;
  let totalMin = 0;
  let totalMax = 0;
  let crossZoneBlockers = 0;

  for (const zone of zones) {
    const zoneParams = materializeZoneParams(parentParams, zone);
    const { parameters, concepts } = generateProjectConcepts(input, products, zoneParams);

    // Compliance per concept layout
    const compliance: Record<string, ComplianceReport> = {};
    for (const concept of concepts) {
      if (!concept.layout) continue;
      const report = checkLayoutsCompliance([concept.layout], parameters.countryCode);
      Object.assign(compliance, report);
    }
    crossZoneBlockers += Object.values(compliance).reduce(
      (sum, r) => sum + r.issues.filter((i) => i.severity === "blocker").length,
      0
    );

    totalSeats += parameters.seatingCapacity ?? 0;
    totalSurface += parameters.terraceSurfaceM2 ?? 0;

    // Use the main (first) concept's BOM as the indicative total for this zone.
    const main = concepts[0];
    if (main?.bom) {
      totalMin += main.bom.indicativeTotalMin ?? 0;
      totalMax += main.bom.indicativeTotalMax ?? 0;
      main.bom.slots.forEach((s) => seenProducts.add(s.product.id));
    }

    for (const style of parameters.style ?? []) {
      styleTally[style] = (styleTally[style] ?? 0) + 1;
    }

    results.push({ zone, parameters, concepts, compliance });
  }

  const mostFrequentStyle = Object.entries(styleTally).sort(
    ([, a], [, b]) => b - a
  )[0]?.[0] ?? null;

  return {
    zones: results,
    aggregate: {
      totalSeats,
      totalTerraceSurface: totalSurface,
      indicativeTotalMin: totalMin,
      indicativeTotalMax: totalMax,
      distinctProducts: seenProducts.size,
      mostFrequentStyle,
      crossZoneBlockers,
    },
  };
}

/**
 * Convenience: decide whether to run the multi-zone or single-zone engine
 * based on the shape of the incoming parameters.
 */
export function generateProject(
  input: string,
  products: DBProduct[],
  parentParams: ProjectParameters
): MultiZoneResult | ReturnType<typeof generateProjectConcepts> {
  if (parentParams.zones && parentParams.zones.length > 0) {
    return generateMultiZoneProject(input, products, parentParams);
  }
  return generateProjectConcepts(input, products, parentParams);
}
