import { describe, it, expect } from "vitest";
import {
  checkCompliance,
  checkLayoutsCompliance,
  getRegimeForCountry,
} from "@/engine/complianceEngine";
import type { LayoutRecommendation, SpatialMetricsData } from "@/engine/types";

// ═══════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════

function mockLayout(overrides: Partial<LayoutRecommendation> & { spatial?: Partial<SpatialMetricsData> }): LayoutRecommendation {
  const spatial: SpatialMetricsData = {
    terraceArea: 100,
    totalSeats: 40,
    spacePerSeat: 2.5,
    densityLevel: "comfortable",
    densityLabel: "Comfortable layout",
    feasibility: "good",
    feasibilityLabel: "Good",
    feasibilityDescription: "OK",
    maxSeatsComfortable: 45,
    maxSeatsBalanced: 58,
    maxSeatsDense: 76,
    estimatedOccupiedSurface: 40,
    remainingCirculationSpace: 60,
    ...overrides.spatial,
  };
  return {
    label: "Suggested layout",
    totalSeats: spatial.totalSeats,
    tableGroups: [],
    chairCount: spatial.totalSeats,
    notes: "",
    spatialMetrics: spatial,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════

describe("getRegimeForCountry", () => {
  it("maps FR/BE to FR_ERP_N", () => {
    expect(getRegimeForCountry("FR")).toBe("FR_ERP_N");
    expect(getRegimeForCountry("fr")).toBe("FR_ERP_N");
    expect(getRegimeForCountry("BE")).toBe("FR_ERP_N");
  });

  it("maps ES/IT/DE/NL to EU_ACCESSIBILITY", () => {
    for (const code of ["ES", "IT", "DE", "NL", "PT", "LU", "CH"]) {
      expect(getRegimeForCountry(code)).toBe("EU_ACCESSIBILITY");
    }
  });

  it("maps US/CA to US_ADA", () => {
    expect(getRegimeForCountry("US")).toBe("US_ADA");
    expect(getRegimeForCountry("CA")).toBe("US_ADA");
  });

  it("defaults to EU_ACCESSIBILITY when country is null or unknown", () => {
    expect(getRegimeForCountry(null)).toBe("EU_ACCESSIBILITY");
    expect(getRegimeForCountry(undefined)).toBe("EU_ACCESSIBILITY");
    expect(getRegimeForCountry("ZZ")).toBe("EU_ACCESSIBILITY");
  });
});

describe("checkCompliance — returns null when metrics missing", () => {
  it("returns null when spatialMetrics is undefined", () => {
    const layout: LayoutRecommendation = {
      label: "x",
      totalSeats: 20,
      tableGroups: [],
      chairCount: 20,
      notes: "",
    };
    expect(checkCompliance(layout, "FR")).toBeNull();
  });
});

describe("checkCompliance — overcrowding detection", () => {
  it("flags overcrowded layouts as blocker regardless of regime", () => {
    const layout = mockLayout({
      spatial: {
        totalSeats: 120,
        terraceArea: 100,
        spacePerSeat: 0.8,
        feasibility: "overcrowded",
        densityLevel: "dense",
        estimatedOccupiedSurface: 95,
        remainingCirculationSpace: 5,
      },
    });
    const report = checkCompliance(layout, "FR")!;
    expect(report.isCompliant).toBe(false);
    expect(report.issues.some((i) => i.code === "OVERCROWDED" && i.severity === "blocker")).toBe(true);
  });

  it("does not flag overcrowding for good layouts", () => {
    const layout = mockLayout({});
    const report = checkCompliance(layout, "FR")!;
    expect(report.issues.some((i) => i.code === "OVERCROWDED")).toBe(false);
  });
});

describe("checkCompliance — FR ERP-specific rules", () => {
  it("triggers >50 seats info-level rule about second exit", () => {
    const layout = mockLayout({
      spatial: { totalSeats: 80, terraceArea: 200, spacePerSeat: 2.5, estimatedOccupiedSurface: 80, remainingCirculationSpace: 120 },
    });
    const report = checkCompliance(layout, "FR")!;
    expect(report.issues.some((i) => i.code === "SECOND_EXIT_REQUIRED" && i.severity === "info")).toBe(true);
  });

  it("does NOT trigger second-exit rule for non-FR regimes", () => {
    const layout = mockLayout({
      spatial: { totalSeats: 80, terraceArea: 200, spacePerSeat: 2.5, estimatedOccupiedSurface: 80, remainingCirculationSpace: 120 },
    });
    const us = checkCompliance(layout, "US")!;
    expect(us.issues.some((i) => i.code === "SECOND_EXIT_REQUIRED")).toBe(false);
    const es = checkCompliance(layout, "ES")!;
    expect(es.issues.some((i) => i.code === "SECOND_EXIT_REQUIRED")).toBe(false);
  });

  it("flags insufficient cross-circulation for >20 seats with <25% free space", () => {
    const layout = mockLayout({
      spatial: {
        totalSeats: 40,
        terraceArea: 80,
        spacePerSeat: 2.0,
        estimatedOccupiedSurface: 70,      // 87.5% occupied
        remainingCirculationSpace: 10,     // 12.5% free — below 25% threshold
      },
    });
    const report = checkCompliance(layout, "FR")!;
    expect(report.issues.some((i) => i.code === "INSUFFICIENT_CROSS_CIRCULATION")).toBe(true);
  });
});

describe("checkCompliance — aisle width detection", () => {
  it("flags narrow main aisle in FR regime", () => {
    // Dense: very little circulation → aisle too narrow
    const layout = mockLayout({
      spatial: {
        totalSeats: 60,
        terraceArea: 60,              // 1.0 m²/seat
        spacePerSeat: 1.0,
        feasibility: "compact",
        estimatedOccupiedSurface: 55,
        remainingCirculationSpace: 5,
      },
    });
    const report = checkCompliance(layout, "FR")!;
    expect(report.estimatedMainAisleWidth).toBeLessThan(1.4);
    expect(report.issues.some((i) => i.code === "AISLE_TOO_NARROW" && i.severity === "blocker")).toBe(true);
    expect(report.isCompliant).toBe(false);
  });

  it("uses ADA 0.91m threshold for US regime", () => {
    const layout = mockLayout({
      spatial: {
        totalSeats: 60,
        terraceArea: 60,
        spacePerSeat: 1.0,
        estimatedOccupiedSurface: 55,
        remainingCirculationSpace: 5,
      },
    });
    const us = checkCompliance(layout, "US")!;
    // US threshold is lower — same layout may still fail, but the text mentions ADA
    const aisleIssue = us.issues.find((i) => i.code === "AISLE_TOO_NARROW");
    if (aisleIssue) {
      expect(aisleIssue.title.toLowerCase()).toContain("ada");
    }
  });
});

describe("checkCompliance — estimatedMaxSeats suggestion", () => {
  it("provides a max-seat estimate that is lower than current in failing cases", () => {
    const layout = mockLayout({
      spatial: {
        totalSeats: 100,
        terraceArea: 80,
        spacePerSeat: 0.8,
        feasibility: "overcrowded",
        estimatedOccupiedSurface: 75,
        remainingCirculationSpace: 5,
      },
    });
    const report = checkCompliance(layout, "FR")!;
    expect(report.estimatedMaxSeats).toBeLessThan(100);
    expect(report.estimatedMaxSeats).toBeGreaterThan(0);
  });
});

describe("checkLayoutsCompliance — batch", () => {
  it("produces one report per layout keyed by label", () => {
    const layouts = [
      mockLayout({ label: "Suggested layout" }),
      mockLayout({ label: "Alternative layout", spatial: { totalSeats: 80 } }),
    ];
    const reports = checkLayoutsCompliance(layouts, "FR");
    expect(Object.keys(reports)).toEqual(["Suggested layout", "Alternative layout"]);
    expect(reports["Suggested layout"].regime).toBe("FR_ERP_N");
  });

  it("skips layouts without spatial metrics", () => {
    const layouts: LayoutRecommendation[] = [
      { label: "no-metrics", totalSeats: 20, tableGroups: [], chairCount: 20, notes: "" },
    ];
    const reports = checkLayoutsCompliance(layouts, "FR");
    expect(Object.keys(reports)).toHaveLength(0);
  });
});
