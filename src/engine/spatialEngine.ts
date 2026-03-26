// ═══════════════════════════════════════════════════════════
// SPATIAL ENGINE — circulation, density & feasibility
// ═══════════════════════════════════════════════════════════

import { LayoutRecommendation, TableGroup } from "./types";

// ── Density model (hospitality standards) ──

export type DensityLevel = "comfortable" | "balanced" | "dense";

export const DENSITY_FACTORS: Record<DensityLevel, { m2PerSeat: number; label: string; circulationClearance: number }> = {
  dense:       { m2PerSeat: 1.3, label: "Dense layout",       circulationClearance: 0.6 },
  balanced:    { m2PerSeat: 1.7, label: "Balanced layout",     circulationClearance: 0.9 },
  comfortable: { m2PerSeat: 2.2, label: "Comfortable layout",  circulationClearance: 1.2 },
};

export type FeasibilityLevel = "good" | "compact" | "overcrowded";

export interface SpatialMetrics {
  terraceArea: number;
  totalSeats: number;
  spacePerSeat: number;
  densityLevel: DensityLevel;
  densityLabel: string;
  feasibility: FeasibilityLevel;
  feasibilityLabel: string;
  feasibilityDescription: string;
  maxSeatsComfortable: number;
  maxSeatsBalanced: number;
  maxSeatsDense: number;
  estimatedOccupiedSurface: number;
  remainingCirculationSpace: number;
}

// ── Table physical dimensions (meters) ──

interface TableDimensions { width: number; length: number }

const TABLE_PHYSICAL_DIMS: Record<string, TableDimensions> = {
  "70×70":  { width: 0.70, length: 0.70 },
  "80×80":  { width: 0.80, length: 0.80 },
  "120×70": { width: 0.70, length: 1.20 },
  "120×80": { width: 0.80, length: 1.20 },
  "160×80": { width: 0.80, length: 1.60 },
  "200×90": { width: 0.90, length: 2.00 },
  "Ø80":    { width: 0.80, length: 0.80 },
  "Ø120":   { width: 1.20, length: 1.20 },
};

// ── Core functions ──

export function getDensityLevel(spacePerSeat: number): DensityLevel {
  if (spacePerSeat >= 2.0) return "comfortable";
  if (spacePerSeat >= 1.5) return "balanced";
  return "dense";
}

export function getDensityLevelFromPriority(priority: string): DensityLevel {
  switch (priority) {
    case "max-capacity": return "dense";
    case "spacious": return "comfortable";
    default: return "balanced";
  }
}

export function getMaxSeats(terraceArea: number, density: DensityLevel): number {
  return Math.floor(terraceArea / DENSITY_FACTORS[density].m2PerSeat);
}

export function getFeasibility(totalSeats: number, terraceArea: number): { level: FeasibilityLevel; label: string; description: string } {
  if (totalSeats <= 0) {
    return { level: "good", label: "No seats configured", description: "Add seating to evaluate spatial feasibility." };
  }
  const spacePerSeat = terraceArea / totalSeats;

  if (spacePerSeat >= 1.5) {
    return { level: "good", label: "Good spatial balance", description: "Layout fits comfortably within the available space." };
  }
  if (spacePerSeat >= 1.0) {
    return { level: "compact", label: "Compact layout", description: "Layout is dense but operationally possible." };
  }
  return { level: "overcrowded", label: "Overcrowded layout", description: "The number of seats exceeds recommended spatial limits." };
}

/**
 * Calculate the effective footprint of a table group including circulation clearance.
 */
export function getEffectiveTableFootprint(tableFormat: string, density: DensityLevel): number {
  const dims = TABLE_PHYSICAL_DIMS[tableFormat];
  // Fallback footprint in m² for unknown table formats (~1.5m × 1.5m + clearance)
  if (!dims) return 2.5;
  
  const clearance = DENSITY_FACTORS[density].circulationClearance;
  const effWidth = dims.width + clearance * 2;
  const effLength = dims.length + clearance * 2;
  return effWidth * effLength;
}

/**
 * Calculate estimated occupied surface from table groups.
 */
export function getOccupiedSurface(groups: TableGroup[], density: DensityLevel): number {
  let total = 0;
  for (const group of groups) {
    total += group.quantity * getEffectiveTableFootprint(group.tableFormat, density);
  }
  return Math.round(total * 10) / 10;
}

/**
 * Full spatial analysis for a layout within a given terrace area.
 */
export function computeSpatialMetrics(
  terraceArea: number,
  layout: LayoutRecommendation,
  densityOverride?: DensityLevel
): SpatialMetrics {
  const totalSeats = layout.totalSeats;
  const spacePerSeat = totalSeats > 0 ? terraceArea / totalSeats : terraceArea;
  const densityLevel = densityOverride ?? getDensityLevel(spacePerSeat);
  const feasibility = getFeasibility(totalSeats, terraceArea);
  const occupiedSurface = getOccupiedSurface(layout.tableGroups, densityLevel);
  
  return {
    terraceArea,
    totalSeats,
    spacePerSeat: Math.round(spacePerSeat * 10) / 10,
    densityLevel,
    densityLabel: DENSITY_FACTORS[densityLevel].label,
    feasibility: feasibility.level,
    feasibilityLabel: feasibility.label,
    feasibilityDescription: feasibility.description,
    maxSeatsComfortable: getMaxSeats(terraceArea, "comfortable"),
    maxSeatsBalanced: getMaxSeats(terraceArea, "balanced"),
    maxSeatsDense: getMaxSeats(terraceArea, "dense"),
    estimatedOccupiedSurface: occupiedSurface,
    remainingCirculationSpace: Math.round((terraceArea - occupiedSurface) * 10) / 10,
  };
}

/**
 * Simplified density info for quick UI indicators (backwards-compatible).
 */
export function getDensityInfo(seats: number | null, surface: number | null): {
  label: string;
  dotClass: string;
  textClass: string;
  density: number;
  spacePerSeat: number;
  feasibility: FeasibilityLevel;
  feasibilityLabel: string;
  maxSeatsBalanced: number;
} | null {
  if (!seats || !surface || surface <= 0) return null;
  const spacePerSeat = surface / seats;
  const level = getDensityLevel(spacePerSeat);
  const feasibility = getFeasibility(seats, surface);
  
  const styles: Record<DensityLevel, { dot: string; text: string }> = {
    comfortable: { dot: "bg-green-500", text: "text-green-600" },
    balanced:    { dot: "bg-amber-500", text: "text-amber-600" },
    dense:       { dot: "bg-red-500",   text: "text-red-600" },
  };
  
  return {
    label: DENSITY_FACTORS[level].label,
    dotClass: styles[level].dot,
    textClass: styles[level].text,
    density: Math.round((seats / surface) * 10) / 10,
    spacePerSeat: Math.round(spacePerSeat * 10) / 10,
    feasibility: feasibility.level,
    feasibilityLabel: feasibility.label,
    maxSeatsBalanced: getMaxSeats(surface, "balanced"),
  };
}
