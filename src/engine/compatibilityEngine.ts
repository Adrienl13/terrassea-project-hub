import type { DBProduct, ProductTypeTags } from "@/lib/products";

// ── Types ────────────────────────────────────────────────

export type CompatibilityType =
  | "compatible_top"
  | "compatible_base"
  | "matching_chair"
  | "matching_table"
  | "compatible_parasol"
  | "compatible_base_parasol"
  | "matching_cushion"
  | "same_collection";

export interface CompatibleProduct {
  product: DBProduct;
  type: CompatibilityType;
  reason: string;
  confidence: "exact" | "dimensional" | "stylistic";
}

export interface CompatibilityResult {
  groups: {
    type: CompatibilityType;
    label: string;
    items: CompatibleProduct[];
  }[];
  totalCount: number;
}

// ── Category detection ───────────────────────────────────

type ProductCategory =
  | "chair"
  | "table"
  | "stool"
  | "parasol"
  | "lounger"
  | "lounge"
  | "accessory"
  | "unknown";

function detectCategory(product: DBProduct): ProductCategory {
  const cat = product.category.toLowerCase();
  if (cat.includes("stool")) return "stool";
  if (cat.includes("chair") || cat.includes("armchair")) return "chair";
  if (cat.includes("table")) return "table";
  if (cat.includes("parasol") || cat.includes("shade")) return "parasol";
  if (cat.includes("lounger") || cat.includes("daybed")) return "lounger";
  if (cat.includes("sofa") || cat.includes("lounge")) return "lounge";
  if (cat.includes("accessory") || cat.includes("cushion")) return "accessory";
  return "unknown";
}

// ── Labels per compatibility type ────────────────────────

const TYPE_LABELS: Record<CompatibilityType, string> = {
  compatible_top: "Compatible tops",
  compatible_base: "Compatible bases",
  matching_chair: "Matching chairs",
  matching_table: "Matching tables",
  compatible_parasol: "Compatible parasols",
  compatible_base_parasol: "Compatible parasol bases",
  matching_cushion: "Matching cushions",
  same_collection: "Same collection",
};

// ── Helpers ──────────────────────────────────────────────

function tags(p: DBProduct): ProductTypeTags {
  return p.product_type_tags ?? {};
}

function arrayOverlap(a: string[], b: string[]): number {
  const setB = new Set(b);
  return a.filter((v) => setB.has(v)).length;
}

const CONFIDENCE_ORDER: Record<string, number> = {
  exact: 0,
  dimensional: 1,
  stylistic: 2,
};

function sortCompatible(items: CompatibleProduct[]): CompatibleProduct[] {
  return items.sort((a, b) => {
    const confDiff = CONFIDENCE_ORDER[a.confidence] - CONFIDENCE_ORDER[b.confidence];
    if (confDiff !== 0) return confDiff;
    return (b.product.priority_score ?? 0) - (a.product.priority_score ?? 0);
  });
}

const MAX_PER_GROUP = 6;

// ── Main engine ──────────────────────────────────────────

export function findCompatibleProducts(
  product: DBProduct,
  allProducts: DBProduct[]
): CompatibilityResult {
  const others = allProducts.filter((p) => p.id !== product.id);
  const sourceTags = tags(product);
  const sourceCategory = detectCategory(product);

  const matches: CompatibleProduct[] = [];

  // ── 1. Exact compatibility ─────────────────────────────

  // compatible_tops: source is a base → find tops whose dimension_tag matches
  if (sourceTags.compatible_tops?.length) {
    const topSet = new Set(sourceTags.compatible_tops);
    for (const p of others) {
      const dt = tags(p).dimension_tag;
      if (dt && topSet.has(dt)) {
        matches.push({
          product: p,
          type: "compatible_top",
          reason: `Compatible top — ${dt}`,
          confidence: "exact",
        });
      }
    }
  }

  // compatible_bases: source is a top → find bases whose dimension_tag or base_type matches
  if (sourceTags.compatible_bases?.length) {
    const baseSet = new Set(sourceTags.compatible_bases);
    for (const p of others) {
      const pt = tags(p);
      if (
        (pt.dimension_tag && baseSet.has(pt.dimension_tag)) ||
        (pt.base_type && baseSet.has(pt.base_type))
      ) {
        matches.push({
          product: p,
          type: "compatible_base",
          reason: `Compatible base — ${pt.dimension_tag ?? pt.base_type}`,
          confidence: "exact",
        });
      }
    }
  }

  // Parasol → parasol bases (exact: matching parasol_type and pole_material)
  if (sourceCategory === "parasol") {
    for (const p of others) {
      const pt = tags(p);
      const pCat = detectCategory(p);
      if (
        pCat === "accessory" &&
        pt.accessory_type?.toLowerCase().includes("base")
      ) {
        // Exact match when parasol_type and pole_material align
        if (
          sourceTags.parasol_type &&
          pt.parasol_type &&
          sourceTags.parasol_type === pt.parasol_type &&
          sourceTags.pole_material &&
          pt.pole_material &&
          sourceTags.pole_material === pt.pole_material
        ) {
          matches.push({
            product: p,
            type: "compatible_base_parasol",
            reason: `Compatible base — ${pt.parasol_type}, ${pt.pole_material}`,
            confidence: "exact",
          });
        }
      }
    }
  }

  // ── 2. Dimensional compatibility ───────────────────────

  if (sourceCategory === "table") {
    // Table → find matching chairs/stools
    const sourceHeightType = sourceTags.height_type?.toLowerCase();
    for (const p of others) {
      const pCat = detectCategory(p);
      if (pCat !== "chair" && pCat !== "stool") continue;
      // Already matched as exact?
      if (matches.some((m) => m.product.id === p.id)) continue;

      const pt = tags(p);
      const pHeightType = pt.height_type?.toLowerCase();
      const seatH = pt.seat_height_cm ?? p.seat_height_cm;

      let matched = false;
      let reason = "";

      if (sourceHeightType && pHeightType && sourceHeightType === pHeightType) {
        matched = true;
        reason = `Matching height type — ${pHeightType}`;
      } else if (sourceHeightType === "standard" && seatH != null && seatH >= 42 && seatH <= 48) {
        matched = true;
        reason = `Seat height ${seatH}cm — standard table compatible`;
      } else if (sourceHeightType === "bar" && seatH != null && seatH >= 60 && seatH <= 75) {
        matched = true;
        reason = `Seat height ${seatH}cm — bar table compatible`;
      } else if (
        !sourceHeightType &&
        seatH != null &&
        seatH >= 42 &&
        seatH <= 48
      ) {
        // Default: assume standard table
        matched = true;
        reason = `Seat height ${seatH}cm — standard height compatible`;
      }

      if (matched) {
        matches.push({
          product: p,
          type: "matching_chair",
          reason,
          confidence: "dimensional",
        });
      }
    }
  }

  if (sourceCategory === "chair" || sourceCategory === "stool") {
    // Chair/Stool → find matching tables
    const sourceHeightType = sourceTags.height_type?.toLowerCase();
    const sourceSeatH = sourceTags.seat_height_cm ?? product.seat_height_cm;

    for (const p of others) {
      if (detectCategory(p) !== "table") continue;
      if (matches.some((m) => m.product.id === p.id)) continue;

      const pt = tags(p);
      const pHeightType = pt.height_type?.toLowerCase();

      let matched = false;
      let reason = "";

      if (sourceHeightType && pHeightType && sourceHeightType === pHeightType) {
        matched = true;
        reason = `Matching height type — ${pHeightType}`;
      } else if (pHeightType === "standard" && sourceSeatH != null && sourceSeatH >= 42 && sourceSeatH <= 48) {
        matched = true;
        reason = `Standard table — seat height ${sourceSeatH}cm compatible`;
      } else if (pHeightType === "bar" && sourceSeatH != null && sourceSeatH >= 60 && sourceSeatH <= 75) {
        matched = true;
        reason = `Bar table — seat height ${sourceSeatH}cm compatible`;
      } else if (sourceCategory === "stool" && pHeightType === "bar") {
        matched = true;
        reason = "Bar table — stool compatible";
      }

      if (matched) {
        matches.push({
          product: p,
          type: "matching_table",
          reason,
          confidence: "dimensional",
        });
      }
    }
  }

  if (sourceCategory === "parasol") {
    // Parasol → find bases with enough weight (dimensional, not already exact)
    const diameter = sourceTags.diameter_m ?? 0;
    const minWeight = diameter > 3 ? 40 : 25;

    for (const p of others) {
      if (matches.some((m) => m.product.id === p.id)) continue;
      const pt = tags(p);
      if (pt.base_weight_kg != null && pt.base_weight_kg >= minWeight) {
        matches.push({
          product: p,
          type: "compatible_base_parasol",
          reason: `Base weight ${pt.base_weight_kg}kg — supports ${diameter > 3 ? "large" : "standard"} parasol`,
          confidence: "dimensional",
        });
      }
    }
  }

  if (sourceCategory === "lounger") {
    // Lounger → find cushions/mattresses
    for (const p of others) {
      if (matches.some((m) => m.product.id === p.id)) continue;
      const pt = tags(p);
      const accType = pt.accessory_type?.toLowerCase() ?? "";
      if (accType === "cushion" || accType === "mattress") {
        matches.push({
          product: p,
          type: "matching_cushion",
          reason: `Compatible ${accType}`,
          confidence: "dimensional",
        });
      }
    }
  }

  // ── 3. Stylistic compatibility ─────────────────────────

  for (const p of others) {
    const pCat = detectCategory(p);
    // Must be a different category
    if (pCat === sourceCategory) continue;
    // Skip if already matched
    if (matches.some((m) => m.product.id === p.id)) continue;

    // Same collection (different category)
    if (
      product.collection &&
      p.collection &&
      product.collection === p.collection
    ) {
      matches.push({
        product: p,
        type: "same_collection",
        reason: `Same collection — ${product.collection}`,
        confidence: "stylistic",
      });
      continue;
    }

    // Style overlap >= 2 AND palette overlap >= 1
    const styleOverlap = arrayOverlap(product.style_tags, p.style_tags);
    const paletteOverlap = arrayOverlap(product.palette_tags, p.palette_tags);

    if (styleOverlap >= 2 && paletteOverlap >= 1) {
      matches.push({
        product: p,
        type: "same_collection",
        reason: `Matching style and palette`,
        confidence: "stylistic",
      });
    }
  }

  // ── Build grouped result ───────────────────────────────

  const groupMap = new Map<CompatibilityType, CompatibleProduct[]>();
  for (const m of matches) {
    const list = groupMap.get(m.type) ?? [];
    list.push(m);
    groupMap.set(m.type, list);
  }

  const groups: CompatibilityResult["groups"] = [];
  for (const [type, items] of groupMap) {
    const sorted = sortCompatible(items).slice(0, MAX_PER_GROUP);
    groups.push({
      type,
      label: TYPE_LABELS[type],
      items: sorted,
    });
  }

  // Sort groups in a stable order matching the CompatibilityType union
  const TYPE_ORDER: CompatibilityType[] = [
    "compatible_top",
    "compatible_base",
    "matching_chair",
    "matching_table",
    "compatible_parasol",
    "compatible_base_parasol",
    "matching_cushion",
    "same_collection",
  ];
  groups.sort(
    (a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)
  );

  const totalCount = groups.reduce((sum, g) => sum + g.items.length, 0);

  return { groups, totalCount };
}
