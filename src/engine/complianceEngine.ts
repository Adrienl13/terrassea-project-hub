// ═══════════════════════════════════════════════════════════
// COMPLIANCE ENGINE — Regulatory & accessibility overlay
// ═══════════════════════════════════════════════════════════
// Validates a layout against local regulatory constraints for
// establishments receiving public (ERP/ADA/EU-accessibility). Flags
// violations and accessibility gaps that the density/feasibility engine
// cannot catch (those only measure m²/seat, not aisle geometry).
//
// Scope of this first pass:
//  - France ERP type N (restaurants/bars) — main aisle ≥1.40m,
//    cross-aisle ≥0.90m, evacuation paths clear
//  - EU accessibility (PMR) — 1.50m turning radius, 0.90m min passage
//  - US ADA (coarse) — 36" (0.91m) aisle, 60" (1.52m) turning space
//
// We infer aisle widths from `remainingCirculationSpace` and table count.
// It is NOT a replacement for a CAD-based ERP audit — it surfaces the most
// common violations at generation time so users aren't blindsided later.
// ═══════════════════════════════════════════════════════════

import type { LayoutRecommendation, SpatialMetricsData } from "./types";

export type ComplianceRegime = "FR_ERP_N" | "EU_ACCESSIBILITY" | "US_ADA" | "NONE";

export type ComplianceSeverity = "blocker" | "warning" | "info";

export interface ComplianceIssue {
  code: string;
  severity: ComplianceSeverity;
  regime: ComplianceRegime;
  title: string;
  description: string;
  suggestion?: string;
}

export interface ComplianceReport {
  regime: ComplianceRegime;
  countryCode: string | null;
  isCompliant: boolean;
  issues: ComplianceIssue[];
  checkedRules: string[];
  estimatedMainAisleWidth: number;   // metres
  estimatedMaxSeats: number;          // under compliant circulation
}

// ── Regulatory constants ───────────────────────────────────

const MAIN_AISLE_MIN_M = 1.40;      // FR ERP type N main aisle
const CROSS_AISLE_MIN_M = 0.90;     // FR ERP cross-aisle & EU PMR
const PMR_TURNING_RADIUS_M = 1.50;  // EU accessibility turning circle
const ADA_AISLE_M = 0.91;           // ADA 36 inches
const ADA_TURNING_M = 1.52;         // ADA 60 inches
const EVACUATION_MIN_SEATS_FOR_FIRE_DOOR = 50; // FR ERP N: >50 seats → 2 exits

// ── Country → regime mapping ────────────────────────────────

const COUNTRY_TO_REGIME: Record<string, ComplianceRegime> = {
  FR: "FR_ERP_N",
  BE: "FR_ERP_N",        // Belgium follows similar ERP logic
  ES: "EU_ACCESSIBILITY",
  IT: "EU_ACCESSIBILITY",
  PT: "EU_ACCESSIBILITY",
  DE: "EU_ACCESSIBILITY",
  NL: "EU_ACCESSIBILITY",
  LU: "EU_ACCESSIBILITY",
  CH: "EU_ACCESSIBILITY",
  US: "US_ADA",
  CA: "US_ADA",
};

export function getRegimeForCountry(countryCode: string | null | undefined): ComplianceRegime {
  if (!countryCode) return "EU_ACCESSIBILITY"; // safe default for our primary market
  return COUNTRY_TO_REGIME[countryCode.toUpperCase()] ?? "EU_ACCESSIBILITY";
}

// ── Heuristics ──────────────────────────────────────────────

/**
 * Estimate the widest continuous aisle given remaining circulation space
 * and table count. Assumes tables are laid out in rows with aisles between.
 * This is a coarse model — a CAD layout would be exact — but it's enough
 * to flag obvious violations (e.g. <0.9m aisles at dense configurations).
 */
function estimateMainAisleWidth(metrics: SpatialMetricsData): number {
  const tableCount = Math.max(1, Math.floor(metrics.totalSeats / 3));
  // Assume ~2 aisles per 10 tables (one main + N cross).
  const aisleCount = Math.max(1, Math.floor(tableCount / 5));
  // Main aisle gets ~40% of remaining circulation; cross aisles share the rest.
  const mainAisleShare = 0.4;
  // Floor-plan aisle width is √(area / length); we approximate terrace as √area wide.
  const terraceEdge = Math.sqrt(metrics.terraceArea);
  const mainAisleArea = metrics.remainingCirculationSpace * mainAisleShare;
  const width = terraceEdge > 0 ? mainAisleArea / terraceEdge / aisleCount : 0;
  return Math.max(0, Math.round(width * 100) / 100);
}

/**
 * Maximum seats the terrace can hold while respecting minimum aisle widths.
 */
function estimateMaxCompliantSeats(
  terraceArea: number,
  regime: ComplianceRegime
): number {
  // Reserve floor area for mandatory circulation: terraceEdge × mainAisle.
  const edge = Math.sqrt(terraceArea);
  const aisleMin = regime === "US_ADA" ? ADA_AISLE_M : MAIN_AISLE_MIN_M;
  const reservedArea = edge * aisleMin;
  const usableArea = Math.max(0, terraceArea - reservedArea);
  // At balanced density (1.7 m²/seat), count how many seats fit.
  return Math.floor(usableArea / 1.7);
}

// ── Main checker ────────────────────────────────────────────

export function checkCompliance(
  layout: LayoutRecommendation,
  countryCode: string | null | undefined
): ComplianceReport | null {
  const metrics = layout.spatialMetrics;
  if (!metrics) return null;

  const regime = getRegimeForCountry(countryCode);
  const issues: ComplianceIssue[] = [];
  const checkedRules: string[] = [];
  const estimatedMainAisleWidth = estimateMainAisleWidth(metrics);
  const estimatedMaxSeats = estimateMaxCompliantSeats(metrics.terraceArea, regime);

  // ── Rule 1: Main aisle width ──
  checkedRules.push("main_aisle_width");
  const aisleMin = regime === "US_ADA" ? ADA_AISLE_M : MAIN_AISLE_MIN_M;
  if (estimatedMainAisleWidth < aisleMin) {
    issues.push({
      code: "AISLE_TOO_NARROW",
      severity: "blocker",
      regime,
      title: regime === "US_ADA"
        ? "Main aisle below ADA minimum (36″ / 0.91 m)"
        : "Allée principale inférieure au minimum réglementaire (1,40 m)",
      description: `Estimated main aisle width is ${estimatedMainAisleWidth.toFixed(2)} m. ${
        regime === "US_ADA"
          ? "ADA requires at least 36 inches for main circulation."
          : "La réglementation ERP type N impose une allée principale d'au moins 1,40 m pour la circulation et l'évacuation."
      }`,
      suggestion: `Reduce seating to approximately ${estimatedMaxSeats} seats, or increase the terrace area by ${
        Math.ceil(metrics.terraceArea * 0.15)
      } m².`,
    });
  }

  // ── Rule 2: Turning radius (PMR / ADA accessibility) ──
  checkedRules.push("pmr_turning_radius");
  const turningMin = regime === "US_ADA" ? ADA_TURNING_M : PMR_TURNING_RADIUS_M;
  // Proxy: if the smallest free-space dimension is below the turning min.
  const terraceEdge = Math.sqrt(metrics.terraceArea);
  if (metrics.remainingCirculationSpace > 0 && estimatedMainAisleWidth < turningMin && terraceEdge < turningMin * 2) {
    issues.push({
      code: "TURNING_SPACE_INSUFFICIENT",
      severity: "warning",
      regime,
      title: regime === "US_ADA"
        ? "ADA turning space (60″ / 1.52 m) may not be met"
        : "Espace de giration PMR (1,50 m) potentiellement insuffisant",
      description: `The layout may not leave a continuous ${turningMin.toFixed(2)} m turning radius for wheelchair accessibility, which is required for ERP/PMR compliance.`,
      suggestion: `Reserve a dedicated 1.5 × 1.5 m zone near the entrance and at the transition between dining and service areas.`,
    });
  }

  // ── Rule 3: Cross-aisle for >20 seats (FR ERP only) ──
  if (regime === "FR_ERP_N") {
    checkedRules.push("cross_aisle_fr_erp");
    if (metrics.totalSeats > 20 && metrics.remainingCirculationSpace < metrics.terraceArea * 0.25) {
      issues.push({
        code: "INSUFFICIENT_CROSS_CIRCULATION",
        severity: "warning",
        regime,
        title: "Circulation transversale insuffisante pour >20 couverts",
        description: `ERP type N recommande au moins 25% de la surface en circulation pour les établissements de plus de 20 couverts. Actuellement : ${
          Math.round((metrics.remainingCirculationSpace / metrics.terraceArea) * 100)
        }%.`,
        suggestion: "Prévoir une allée transversale de 0,90 m tous les 4 rangs de tables.",
      });
    }
  }

  // ── Rule 4: Evacuation — 2nd exit required >50 seats (FR ERP) ──
  if (regime === "FR_ERP_N") {
    checkedRules.push("evacuation_second_exit");
    if (metrics.totalSeats > EVACUATION_MIN_SEATS_FOR_FIRE_DOOR) {
      issues.push({
        code: "SECOND_EXIT_REQUIRED",
        severity: "info",
        regime,
        title: `Établissement >50 couverts : 2e issue de secours obligatoire`,
        description:
          "Pour un ERP type N de plus de 50 personnes, le code impose deux issues de secours distinctes avec déverrouillage par anti-panique.",
        suggestion: "Vérifier la présence et le dimensionnement des issues avec le bureau de contrôle.",
      });
    }
  }

  // ── Rule 5: Overcrowding (always checked) ──
  checkedRules.push("occupancy_density");
  if (metrics.feasibility === "overcrowded") {
    issues.push({
      code: "OVERCROWDED",
      severity: "blocker",
      regime,
      title: "Densité excessive pour un ERP / ADA",
      description: `La densité actuelle (${metrics.spacePerSeat.toFixed(1)} m²/couvert) est en dessous du seuil de 1,0 m²/couvert et compromet l'évacuation ainsi que l'accessibilité.`,
      suggestion: `Réduire à ${estimatedMaxSeats} couverts maximum pour respecter les circulations et l'évacuation.`,
    });
  }

  const isCompliant = !issues.some((i) => i.severity === "blocker");

  return {
    regime,
    countryCode: countryCode ?? null,
    isCompliant,
    issues,
    checkedRules,
    estimatedMainAisleWidth,
    estimatedMaxSeats,
  };
}

/**
 * Batch-check a set of layouts (e.g. the 3 generated alternatives) and
 * return the compliance report keyed by layout label.
 */
export function checkLayoutsCompliance(
  layouts: LayoutRecommendation[],
  countryCode: string | null | undefined
): Record<string, ComplianceReport> {
  const out: Record<string, ComplianceReport> = {};
  for (const layout of layouts) {
    const report = checkCompliance(layout, countryCode);
    if (report) out[layout.label] = report;
  }
  return out;
}
