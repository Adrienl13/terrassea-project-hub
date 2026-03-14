import { LayoutRecommendation, TableGroup, ProjectParameters } from "./types";
import { computeSpatialMetrics, getDensityLevelFromPriority } from "./spatialEngine";

// ═══════════════════════════════════════════════════════════
// LAYOUT ENGINE — generates realistic table/chair mixes
// ═══════════════════════════════════════════════════════════

interface TableFormat {
  format: string;       // e.g. "70×70"
  shape: string;        // "square" | "rectangular" | "round"
  seats: number;
  minSeats: number;
  maxSeats: number;
  combinable: boolean;
  combinedSeats: number; // seats when two tables are joined
}

const TABLE_FORMATS: TableFormat[] = [
  { format: "70×70", shape: "square", seats: 2, minSeats: 2, maxSeats: 2, combinable: true, combinedSeats: 4 },
  { format: "80×80", shape: "square", seats: 4, minSeats: 2, maxSeats: 4, combinable: true, combinedSeats: 6 },
  { format: "120×70", shape: "rectangular", seats: 4, minSeats: 4, maxSeats: 4, combinable: true, combinedSeats: 6 },
  { format: "120×80", shape: "rectangular", seats: 4, minSeats: 4, maxSeats: 6, combinable: true, combinedSeats: 8 },
  { format: "160×80", shape: "rectangular", seats: 6, minSeats: 6, maxSeats: 6, combinable: false, combinedSeats: 0 },
  { format: "Ø80", shape: "round", seats: 4, minSeats: 2, maxSeats: 4, combinable: false, combinedSeats: 0 },
  { format: "Ø120", shape: "round", seats: 6, minSeats: 4, maxSeats: 6, combinable: false, combinedSeats: 0 },
];

// ── Distribution ratios per layout preference ──

interface DistributionRule {
  // ratio of 2-seat vs 4-seat vs 6-seat tables
  twoSeatRatio: number;
  fourSeatRatio: number;
  sixSeatRatio: number;
  preferredFormats: string[];
}

const LAYOUT_DISTRIBUTIONS: Record<string, DistributionRule> = {
  "mostly-2": {
    twoSeatRatio: 0.7,
    fourSeatRatio: 0.25,
    sixSeatRatio: 0.05,
    preferredFormats: ["70×70", "120×70"],
  },
  "balanced-2-4": {
    twoSeatRatio: 0.4,
    fourSeatRatio: 0.5,
    sixSeatRatio: 0.1,
    preferredFormats: ["70×70", "120×70", "80×80"],
  },
  "mostly-4": {
    twoSeatRatio: 0.15,
    fourSeatRatio: 0.7,
    sixSeatRatio: 0.15,
    preferredFormats: ["120×70", "120×80", "80×80"],
  },
  modular: {
    twoSeatRatio: 0.5,
    fourSeatRatio: 0.4,
    sixSeatRatio: 0.1,
    preferredFormats: ["70×70", "80×80"],
  },
  group: {
    twoSeatRatio: 0.1,
    fourSeatRatio: 0.4,
    sixSeatRatio: 0.5,
    preferredFormats: ["120×80", "160×80", "Ø120"],
  },
  custom: {
    twoSeatRatio: 0.35,
    fourSeatRatio: 0.45,
    sixSeatRatio: 0.2,
    preferredFormats: ["70×70", "120×70", "120×80"],
  },
};

// ── Priority adjustments ──

function applyPriorityAdjustment(
  dist: DistributionRule,
  priority: string
): DistributionRule {
  const d = { ...dist, preferredFormats: [...dist.preferredFormats] };

  switch (priority) {
    case "max-capacity":
      // Pack more 2-seaters (space-efficient)
      d.twoSeatRatio = Math.min(d.twoSeatRatio + 0.15, 0.8);
      d.sixSeatRatio = Math.max(d.sixSeatRatio - 0.1, 0);
      d.fourSeatRatio = 1 - d.twoSeatRatio - d.sixSeatRatio;
      break;
    case "spacious":
      // Fewer tables, larger formats
      d.sixSeatRatio = Math.min(d.sixSeatRatio + 0.15, 0.5);
      d.twoSeatRatio = Math.max(d.twoSeatRatio - 0.1, 0.1);
      d.fourSeatRatio = 1 - d.twoSeatRatio - d.sixSeatRatio;
      break;
    case "couples":
      d.twoSeatRatio = Math.min(d.twoSeatRatio + 0.2, 0.85);
      d.sixSeatRatio = 0;
      d.fourSeatRatio = 1 - d.twoSeatRatio;
      break;
    case "groups":
      d.sixSeatRatio = Math.min(d.sixSeatRatio + 0.25, 0.6);
      d.twoSeatRatio = Math.max(d.twoSeatRatio - 0.15, 0.05);
      d.fourSeatRatio = 1 - d.twoSeatRatio - d.sixSeatRatio;
      break;
    case "flexible-groups":
      // Favor combinable formats
      d.preferredFormats = ["70×70", "80×80", "120×70"];
      break;
    // "balanced" keeps defaults
  }

  return d;
}

// ── Core layout generator ──

function generateLayout(
  totalSeats: number,
  distribution: DistributionRule,
  label: string
): LayoutRecommendation {
  const twoSeats = Math.round(totalSeats * distribution.twoSeatRatio);
  const sixSeats = Math.round(totalSeats * distribution.sixSeatRatio);
  const fourSeats = totalSeats - twoSeats - sixSeats;

  const groups: TableGroup[] = [];

  // Pick preferred formats for each size category
  const twoFormat = findFormat(distribution.preferredFormats, 2) || TABLE_FORMATS[0];
  const fourFormat = findFormat(distribution.preferredFormats, 4) || TABLE_FORMATS[2];
  const sixFormat = findFormat(distribution.preferredFormats, 6) || TABLE_FORMATS[4];

  if (twoSeats > 0) {
    const qty = Math.max(1, Math.round(twoSeats / twoFormat.seats));
    groups.push({
      tableFormat: twoFormat.format,
      shape: twoFormat.shape,
      quantity: qty,
      seatsPerTable: twoFormat.seats,
      totalSeats: qty * twoFormat.seats,
    });
  }

  if (fourSeats > 0) {
    const qty = Math.max(1, Math.round(fourSeats / fourFormat.seats));
    groups.push({
      tableFormat: fourFormat.format,
      shape: fourFormat.shape,
      quantity: qty,
      seatsPerTable: fourFormat.seats,
      totalSeats: qty * fourFormat.seats,
    });
  }

  if (sixSeats > 0) {
    const qty = Math.max(1, Math.round(sixSeats / sixFormat.seats));
    groups.push({
      tableFormat: sixFormat.format,
      shape: sixFormat.shape,
      quantity: qty,
      seatsPerTable: sixFormat.seats,
      totalSeats: qty * sixFormat.seats,
    });
  }

  const actualTotal = groups.reduce((sum, g) => sum + g.totalSeats, 0);
  const chairCount = actualTotal; // 1 chair per seat

  const combinableCount = groups
    .filter((g) => {
      const fmt = TABLE_FORMATS.find((f) => f.format === g.tableFormat);
      return fmt?.combinable;
    })
    .reduce((sum, g) => sum + g.quantity, 0);

  const notes = combinableCount > 0
    ? `${combinableCount} combinable tables allow flexible group configurations`
    : "Fixed layout optimized for the selected seating distribution";

  return {
    label,
    totalSeats: actualTotal,
    tableGroups: groups,
    chairCount,
    notes,
  };
}

function findFormat(preferred: string[], targetSeats: number): TableFormat | undefined {
  // First look in preferred
  const fromPreferred = TABLE_FORMATS.find(
    (f) => preferred.includes(f.format) && f.seats === targetSeats
  );
  if (fromPreferred) return fromPreferred;

  // Fallback to any format with target seats
  return TABLE_FORMATS.find((f) => f.seats === targetSeats);
}

// ── Public API ──

export function generateLayouts(params: ProjectParameters): LayoutRecommendation[] {
  const totalSeats = params.seatingCapacity || 40;
  const layoutPref = params.seatingLayout || "balanced-2-4";
  const priority = params.layoutPriority || "balanced";

  const baseDist = LAYOUT_DISTRIBUTIONS[layoutPref] || LAYOUT_DISTRIBUTIONS["balanced-2-4"];
  const adjustedDist = applyPriorityAdjustment(baseDist, priority);

  // Generate main recommended layout
  const main = generateLayout(totalSeats, adjustedDist, "Suggested layout");

  // Generate alternative with shifted ratios
  const altDist: DistributionRule = {
    ...adjustedDist,
    twoSeatRatio: Math.max(adjustedDist.twoSeatRatio - 0.15, 0.1),
    fourSeatRatio: adjustedDist.fourSeatRatio + 0.1,
    sixSeatRatio: Math.min(adjustedDist.sixSeatRatio + 0.05, 0.4),
    preferredFormats: adjustedDist.preferredFormats,
  };
  const alt = generateLayout(totalSeats, altDist, "Alternative layout");

  // Generate flexible/modular option if applicable
  const flexDist: DistributionRule = {
    twoSeatRatio: 0.6,
    fourSeatRatio: 0.4,
    sixSeatRatio: 0,
    preferredFormats: ["70×70", "80×80"],
  };
  const flex = generateLayout(totalSeats, flexDist, "Flexible layout");
  flex.notes = `${flex.chairCount} seats standard, expandable for larger groups by combining tables`;

  // Attach spatial metrics if terrace area is known
  const terraceArea = params.terraceSurfaceM2 ??
    (params.terraceLength && params.terraceWidth ? params.terraceLength * params.terraceWidth : null);

  if (terraceArea && terraceArea > 0) {
    const densityLevel = getDensityLevelFromPriority(priority);
    for (const layout of [main, alt, flex]) {
      layout.spatialMetrics = computeSpatialMetrics(terraceArea, layout, densityLevel);
    }
  }

  return [main, alt, flex];
}

export function getChairQuantityFromLayout(layout: LayoutRecommendation): number {
  return layout.chairCount;
}

export function getTableQuantitiesFromLayout(layout: LayoutRecommendation): Record<string, number> {
  const result: Record<string, number> = {};
  for (const group of layout.tableGroups) {
    result[group.tableFormat] = (result[group.tableFormat] || 0) + group.quantity;
  }
  return result;
}
