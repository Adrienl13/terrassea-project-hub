import {
  ProjectParameters,
  ProjectConcept,
  RecommendedProduct,
  DiscoveryQuestion,
  ProjectSummary,
  LayoutRecommendation,
  LayoutRequirement,
  LayoutRequirementType,
  BOMSlot,
  BOMSlotRole,
  ConceptBOM,
  ConceptAlternative,
  ClimateProfile,
  VenueNeeds,
  ProductCategorySelection,
} from "./types";
import { generateLayouts } from "./layoutEngine";
import type { DBProduct, ProductTypeTags } from "@/lib/products";

// ═══════════════════════════════════════════════════════════
// TAXONOMY — all values are slugs (EN kebab-case)
// ═══════════════════════════════════════════════════════════

const ESTABLISHMENT_KEYWORDS: Record<string, string[]> = {
  restaurant:   ["restaurant", "dining", "bistro", "brasserie", "trattoria", "cafe", "eatery", "pizzeria", "gastro", "café"],
  hotel:        ["hotel", "resort", "boutique hotel", "lodge", "inn", "spa", "wellness"],
  rooftop:      ["rooftop", "sky bar", "sky lounge", "rooftop bar", "roof terrace"],
  "beach-club": ["beach", "beach club", "beachfront", "seaside", "coastal", "plage"],
  camping:      ["camping", "glamping", "campsite", "caravan", "mobile home"],
  bar:          ["bar", "lounge bar", "cocktail", "pub", "wine bar", "tapas"],
  event:        ["event", "banquet", "wedding", "catering", "conference"],
  pool:         ["pool", "poolside", "piscine", "pool deck"],
};

const STYLE_KEYWORDS: Record<string, string[]> = {
  mediterranean: ["mediterranean", "riviera", "greek", "italian", "provence", "south of france", "ibiza", "med"],
  modern:        ["modern", "contemporary", "sleek", "clean", "design"],
  minimal:       ["minimal", "minimalist", "less is more", "pared-back"],
  scandinavian:  ["scandinavian", "nordic", "hygge", "scandi", "danish"],
  industrial:    ["industrial", "urban", "loft", "raw", "factory"],
  bohemian:      ["bohemian", "boho", "eclectic", "free-spirit"],
  natural:       ["natural", "organic", "earthy", "rustic", "raw wood", "nature"],
  luxury:        ["luxury", "premium", "high-end", "exclusive", "upscale", "chic", "5-star"],
  tropical:      ["tropical", "exotic", "palm", "jungle", "caribbean", "bali"],
  classic:       ["classic", "timeless", "traditional", "elegant", "french"],
  coastal:       ["coastal", "nautical", "maritime", "harbor", "port"],
  bistro:        ["bistro", "parisian", "café", "french bistro", "terrasse"],
  lounge:        ["lounge", "chill-out", "daybed", "relax zone"],
  vintage:       ["vintage", "retro", "mid-century", "antique"],
  japandi:       ["japandi", "wabi-sabi", "japanese", "zen"],
  resort:        ["resort", "all-inclusive", "holiday village"],
  "ski-chalet":  ["chalet", "mountain", "alpine", "ski"],
};

const AMBIENCE_KEYWORDS: Record<string, string[]> = {
  warm:           ["warm", "cozy", "inviting", "sun", "golden", "chaleureux"],
  convivial:      ["convivial", "social", "family", "sharing", "communal"],
  elegant:        ["elegant", "sophisticated", "refined", "upscale", "chic"],
  festive:        ["festive", "party", "celebration", "vibrant", "energetic", "buzzing"],
  relaxed:        ["relaxed", "casual", "laid-back", "chill", "easy"],
  refined:        ["refined", "polished", "curated", "considered"],
  authentic:      ["authentic", "genuine", "artisan", "handmade", "local"],
  bright:         ["bright", "airy", "luminous", "daytime", "brunch", "morning"],
  intimate:       ["intimate", "romantic", "quiet", "private", "cosy"],
  "design-forward": ["design-forward", "avant-garde", "bold", "statement", "architectural"],
  evening:        ["evening", "night", "sunset", "cocktail hour", "after-dark"],
};

// Palette slugs — atmospheric tone, NOT product color
const PALETTE_KEYWORDS: Record<string, string[]> = {
  natural:    ["natural", "beige", "sand", "cream", "earth", "nude", "travertine"],
  white:      ["white", "bright", "light", "airy", "blanc", "pure"],
  black:      ["black", "dark", "noir", "charcoal", "anthracite"],
  warm:       ["warm", "terracotta", "rust", "amber", "honey", "ochre", "cognac"],
  cool:       ["cool", "blue", "gray", "silver", "slate", "steel"],
  green:      ["green", "olive", "sage", "forest", "khaki"],
  wood:       ["wood", "teak", "oak", "walnut", "timber", "bois"],
  navy:       ["navy", "maritime", "nautical", "deep blue"],
  terracotta: ["terracotta", "clay", "brick", "burnt orange"],
};

const MATERIAL_KEYWORDS: Record<string, string[]> = {
  aluminium:        ["aluminum", "aluminium", "powder-coated"],
  rope:             ["rope", "cord", "woven rope"],
  polypropylene:    ["polypropylene", "plastic", "pp"],
  resin:            ["resin", "composite", "synthetic"],
  "synthetic-rattan": ["rattan", "wicker", "woven", "cane"],
  textilene:        ["textilene", "batyline", "mesh", "sling"],
  wood:             ["wood", "teak", "timber", "bois", "oak", "walnut", "acacia"],
  steel:            ["steel", "iron", "metal", "wrought iron"],
  hpl:              ["hpl", "compact laminate", "high pressure laminate"],
  "marble-effect":  ["marble", "stone", "granite", "concrete", "terrazzo"],
  fabric:           ["fabric", "textile", "cushion", "upholstered", "sunbrella"],
};

const BUDGET_KEYWORDS: Record<string, string[]> = {
  economy: ["budget", "affordable", "economic", "cheap", "low cost"],
  mid:     ["mid-range", "moderate", "reasonable", "balanced"],
  premium: ["premium", "luxury", "high-end", "no budget", "invest", "quality"],
};

const TIMELINE_KEYWORDS: Record<string, string[]> = {
  urgent:       ["urgent", "asap", "rush", "this week", "immediately"],
  "1-month":    ["next month", "1 month", "4 weeks", "30 days"],
  "2-3-months": ["2 months", "3 months", "spring", "summer", "season"],
  flexible:     ["no rush", "flexible", "whenever", "planning"],
};

// ═══════════════════════════════════════════════════════════
// FIX 1 — HEX ↔ PALETTE/COLOR SLUG MAPPING
// Used to derive palette swatches from real product colors
// and to score concept-palette match
// ═══════════════════════════════════════════════════════════

const COLOR_SLUG_TO_HEX: Record<string, string> = {
  white:      "#FFFFFF",
  "off-white":"#F5F0EB",
  cream:      "#F5E6D3",
  ivory:      "#F0EDE8",
  sand:       "#D4C9B8",
  natural:    "#C4B8A8",
  beige:      "#D4C5A9",
  champagne:  "#D4C9A8",
  taupe:      "#A69B8E",
  grey:       "#888888",
  graphite:   "#666666",
  charcoal:   "#444444",
  anthracite: "#333333",
  black:      "#1A1A1A",
  teak:       "#8B7355",
  walnut:     "#6B5040",
  "dark-brown": "#4A3020",
  chocolate:  "#3D2010",
  terracotta: "#D4603A",
  rust:       "#C04828",
  copper:     "#B07040",
  "red":      "#C03020",
  bordeaux:   "#7A1828",
  mustard:    "#C49820",
  gold:       "#C4956A",
  yellow:     "#E8C840",
  olive:      "#6B7B5E",
  sage:       "#8B9B7E",
  green:      "#4A6B4A",
  navy:       "#1A3A5A",
  petrol:     "#1A4A5A",
  blue:       "#4A6BA8",
  blush:      "#E8B0A8",
  silver:     "#B8C0C8",
  bronze:     "#8B6B4A",
};

const HEX_TO_PALETTE_TAGS: Record<string, string[]> = {
  "#D4A574": ["warm", "terracotta", "natural"],
  "#C4956A": ["warm", "terracotta", "wood"],
  "#D4603A": ["warm", "terracotta"],
  "#F5E6D3": ["natural", "white"],
  "#E8DDD3": ["natural", "white"],
  "#8B7355": ["wood", "natural"],
  "#A69B8E": ["natural"],
  "#1A1A1A": ["black"],
  "#333333": ["black"],
  "#888888": ["cool"],
  "#4A90A4": ["cool", "navy"],
  "#6B7B5E": ["green"],
  "#FFFFFF": ["white"],
  "#F5F0EB": ["white", "natural"],
  "#D4C5A9": ["natural"],
  "#C4B8A8": ["natural"],
};

function deriveConceptPalette(
  selectedProducts: DBProduct[],
  templateHex: string[],
  templateNames: string[]
): { hex: string[]; names: string[] } {
  // Extract unique real product colors
  const seen = new Set<string>();
  const realHex: string[] = [];
  const realNames: string[] = [];
  for (const p of selectedProducts) {
    if (!p.main_color) continue;
    const hex = COLOR_SLUG_TO_HEX[p.main_color.toLowerCase()];
    if (!hex || seen.has(hex)) continue;
    seen.add(hex);
    realHex.push(hex);
    realNames.push(p.main_color.charAt(0).toUpperCase() + p.main_color.slice(1).replace(/-/g, " "));
  }

  // Strategy: template palette is the BASE (defines concept identity),
  // enriched with real product colors that complement it.
  // Template provides the first 3 colors, then real product colors fill the rest.
  const finalHex: string[] = [];
  const finalNames: string[] = [];

  // Start with template colors (up to 3 — the concept's visual identity)
  for (let i = 0; i < Math.min(3, templateHex.length); i++) {
    finalHex.push(templateHex[i]);
    finalNames.push(templateNames[i] || "");
  }

  // Add unique real product colors that aren't already in the palette
  for (let i = 0; i < realHex.length && finalHex.length < 5; i++) {
    if (!finalHex.includes(realHex[i])) {
      finalHex.push(realHex[i]);
      finalNames.push(realNames[i]);
    }
  }

  // Fill remaining slots from template if needed
  for (let i = 3; i < templateHex.length && finalHex.length < 5; i++) {
    if (!finalHex.includes(templateHex[i])) {
      finalHex.push(templateHex[i]);
      finalNames.push(templateNames[i] || "");
    }
  }

  return { hex: finalHex, names: finalNames };
}

// ═══════════════════════════════════════════════════════════
// FIX 2 — VENUE NEEDS MAP
// ═══════════════════════════════════════════════════════════

const VENUE_NEEDS_MAP: Record<string, VenueNeeds> = {
  restaurant: {
    mandatory: ["Chairs", "Tables"],
    preferred: ["Parasols", "Armchairs"],
    boost: 1.4,
    technicalRequirements: ["is_chr_heavy_use"],
  },
  hotel: {
    mandatory: ["Chairs", "Tables", "Lounge Seating"],
    preferred: ["Parasols", "Sun Loungers", "Sofas"],
    boost: 1.5,
    technicalRequirements: ["is_outdoor", "weather_resistant"],
  },
  rooftop: {
    mandatory: ["Chairs", "Tables"],
    preferred: ["Bar Stools", "High Tables", "Lounge Seating"],
    boost: 1.6,
    technicalRequirements: ["weather_resistant", "lightweight"],
  },
  "beach-club": {
    mandatory: ["Sun Loungers", "Parasols"],
    preferred: ["Lounge Seating", "Bar Stools"],
    boost: 1.8,
    technicalRequirements: ["uv_resistant", "weather_resistant", "easy_maintenance"],
  },
  camping: {
    mandatory: ["Chairs", "Tables"],
    preferred: ["Lounge Seating", "Parasols"],
    boost: 1.3,
    technicalRequirements: ["lightweight", "easy_maintenance"],
  },
  bar: {
    mandatory: ["Bar Stools", "High Tables"],
    preferred: ["Lounge Seating", "Chairs", "Parasols"],
    boost: 1.5,
    technicalRequirements: ["is_chr_heavy_use"],
  },
  event: {
    mandatory: ["Chairs", "Tables"],
    preferred: ["Lounge Seating", "Parasols"],
    boost: 1.3,
    technicalRequirements: ["is_stackable"],
  },
  pool: {
    mandatory: ["Sun Loungers", "Parasols"],
    preferred: ["Lounge Seating", "Bar Stools"],
    boost: 1.7,
    technicalRequirements: ["uv_resistant", "weather_resistant", "easy_maintenance"],
  },
};

const DEFAULT_VENUE_NEEDS: VenueNeeds = {
  mandatory: ["Chairs", "Tables"],
  preferred: ["Parasols"],
  boost: 1.3,
  technicalRequirements: ["is_outdoor"],
};

function getVenueNeeds(establishmentType: string): VenueNeeds {
  return VENUE_NEEDS_MAP[establishmentType] || DEFAULT_VENUE_NEEDS;
}

// ═══════════════════════════════════════════════════════════
// CATEGORY SELECTION — filter products by user's chosen categories
// ═══════════════════════════════════════════════════════════

/** Map category selection slugs → DB category substrings for matching */
const CATEGORY_SLUG_TO_DB: Record<ProductCategorySelection, string[]> = {
  chairs:          ["chair"],
  armchairs:       ["armchair"],
  tables:          ["table"],
  "bar-stools":    ["bar stool", "stool"],
  parasols:        ["parasol", "shade"],
  "sun-loungers":  ["lounger", "daybed"],
  "lounge-seating": ["lounge", "sofa"],
  benches:         ["bench"],
  accessories:     ["accessor", "cushion", "cover", "planter"],
};

/** Get default category selection for a venue type (used for "complete proposal") */
export function getDefaultCategories(establishmentType: string): ProductCategorySelection[] {
  const needs = getVenueNeeds(establishmentType);
  const allCats: ProductCategorySelection[] = [];

  const dbToSelection = (dbCat: string): ProductCategorySelection | null => {
    const lower = dbCat.toLowerCase();
    for (const [sel, matchers] of Object.entries(CATEGORY_SLUG_TO_DB)) {
      if (matchers.some(m => lower.includes(m))) return sel as ProductCategorySelection;
    }
    return null;
  };

  for (const m of [...needs.mandatory, ...needs.preferred]) {
    const sel = dbToSelection(m);
    if (sel && !allCats.includes(sel)) allCats.push(sel);
  }

  // Always include accessories as optional
  if (!allCats.includes("accessories")) allCats.push("accessories");

  return allCats;
}

/** Filter products to only include selected categories */
function filterBySelectedCategories(
  products: DBProduct[],
  selectedCategories: ProductCategorySelection[] | null | undefined
): DBProduct[] {
  // null/undefined = no filter (complete proposal)
  if (!selectedCategories || selectedCategories.length === 0) return products;

  const allowedMatchers = selectedCategories.flatMap(sel => CATEGORY_SLUG_TO_DB[sel] || []);

  return products.filter(p => {
    const catLower = (p.category || "").toLowerCase();
    return allowedMatchers.some(m => catLower.includes(m));
  });
}

/** Adjust venue needs based on selected categories */
function adjustVenueNeeds(
  venueNeeds: VenueNeeds,
  selectedCategories: ProductCategorySelection[] | null | undefined
): VenueNeeds {
  if (!selectedCategories || selectedCategories.length === 0) return venueNeeds;

  const allowedMatchers = selectedCategories.flatMap(sel => CATEGORY_SLUG_TO_DB[sel] || []);
  const isAllowed = (cat: string) => allowedMatchers.some(m => cat.toLowerCase().includes(m));

  return {
    ...venueNeeds,
    mandatory: venueNeeds.mandatory.filter(isAllowed),
    preferred: venueNeeds.preferred.filter(isAllowed),
  };
}

// ═══════════════════════════════════════════════════════════
// FIX 3 — CLIMATE PROFILE
// ═══════════════════════════════════════════════════════════

function inferClimateProfile(params: ProjectParameters): ClimateProfile {
  const coastal = ["beach-club", "pool", "hotel"].includes(params.establishmentType)
    || ["beach", "pool", "deck"].includes(params.projectZone);
  const highUV = coastal || ["beach-club", "pool", "camping"].includes(params.establishmentType) || params.isOutdoor;
  const highTraffic = ["restaurant", "bar", "event"].includes(params.establishmentType)
    || (params.seatingCapacity !== null && params.seatingCapacity > 80);
  const elevated = params.establishmentType === "rooftop" || params.projectZone === "rooftop";
  return { isCoastal: coastal, isHighUV: highUV, isHighTraffic: highTraffic, isElevated: elevated };
}

function climateBonus(product: DBProduct, climate: ClimateProfile): number {
  let bonus = 0;
  const ptt: ProductTypeTags = product.product_type_tags || {};

  if (climate.isCoastal) {
    if (product.weather_resistant) bonus += 2.5;
    if (product.uv_resistant)      bonus += 2.0;
    // Parasol: require Beaufort 6 on coastal — penalize if < 6
    if (product.category.toLowerCase() === "parasols" && ptt.wind_beaufort != null) {
      bonus += ptt.wind_beaufort >= 6 ? 3.0 : -8.0;
    }
    // Marine grade
    if (product.technical_tags.includes("marine-grade")) bonus += 2.0;
  }
  if (climate.isHighUV  && product.uv_resistant)      bonus += 1.5;
  if (climate.isHighTraffic && product.is_chr_heavy_use) bonus += 2.0;
  if (climate.isElevated) {
    if (product.weather_resistant) bonus += 1.5;
    if (product.lightweight)       bonus += 1.0;
    // Parasol: penalize low wind resistance on rooftop
    if (product.category.toLowerCase() === "parasols" && ptt.wind_beaufort != null) {
      bonus += ptt.wind_beaufort >= 5 ? 1.5 : -5.0;
    }
  }
  return bonus;
}

// ═══════════════════════════════════════════════════════════
// FIX 1 — SOFT BUDGET SCORING
// ═══════════════════════════════════════════════════════════

const BUDGET_MAX: Record<string, number> = {
  economy: 80,
  mid:     150,
  premium: 250,
  luxury:  99999,
};

function budgetPenalty(product: DBProduct, budgetLevel: string): number {
  if (!budgetLevel) return 0;
  const isStrict = budgetLevel.endsWith("-strict");
  const level = isStrict ? budgetLevel.replace("-strict", "") : budgetLevel;
  if (level === "luxury") return 0;
  const max = BUDGET_MAX[level] ?? 99999;
  if (product.price_min === null) return 0;
  const ratio = product.price_min / max;
  if (ratio <= 1.0) return 0;
  if (isStrict) return 50.0; // hard elimination
  if (ratio <= 1.1) return 1.5;
  if (ratio <= 1.3) return 4.0;
  if (ratio <= 1.6) return 7.0;
  return 12.0;
}

// ═══════════════════════════════════════════════════════════
// FIX 6 — CAPACITY SIGNALS
// ═══════════════════════════════════════════════════════════

function capacityBonus(product: DBProduct, capacity: number | null): number {
  if (!capacity) return 0;
  let bonus = 0;
  if (capacity > 80  && product.is_stackable)    bonus += 2.0;
  if (capacity > 80  && product.is_chr_heavy_use) bonus += 1.5;
  if (capacity > 150 && product.is_stackable)    bonus += 1.5;
  if (capacity < 40  && !product.is_stackable)   bonus += 0.5;
  return bonus;
}

// ═══════════════════════════════════════════════════════════
// WEIGHT / ERGONOMICS — penalize heavy products for high-handling venues
// ═══════════════════════════════════════════════════════════

const HIGH_HANDLING_VENUES = ["beach-club", "event", "camping", "bar"];
const MODERATE_HANDLING_VENUES = ["restaurant", "cafe", "brasserie", "pool"];

function weightErgonomicsBonus(product: DBProduct, params: ProjectParameters): number {
  const weight = product.weight_kg;
  if (!weight) return 0;
  const venue = params.establishmentType;
  let bonus = 0;

  // High-handling venues: staff moves furniture daily (beach club, events, camping)
  if (HIGH_HANDLING_VENUES.includes(venue)) {
    if (weight <= 4)  bonus += 2.5;  // excellent for daily handling
    else if (weight <= 6)  bonus += 1.5;
    else if (weight <= 8)  bonus += 0.5;
    else if (weight > 12) bonus -= 2.0; // too heavy for daily setup
    else if (weight > 8)  bonus -= 1.0;
  }
  // Moderate-handling venues: weekly rearrangement
  else if (MODERATE_HANDLING_VENUES.includes(venue)) {
    if (weight <= 5)  bonus += 1.0;
    else if (weight > 15) bonus -= 1.0;
  }
  // Rooftop: weight is good for wind resistance
  else if (venue === "rooftop" || params.projectZone === "rooftop") {
    if (weight >= 8)  bonus += 1.5;  // heavier = more stable in wind
    if (weight >= 12) bonus += 1.0;
    if (weight < 4)   bonus -= 1.0;  // too light for wind
  }

  // Stackability bonus scales with capacity
  if (product.is_stackable && params.seatingCapacity) {
    if (params.seatingCapacity > 60) bonus += 1.0;
  }

  return bonus;
}

// ═══════════════════════════════════════════════════════════
// DURABILITY / WARRANTY — favor products with longer lifecycle
// ═══════════════════════════════════════════════════════════

function durabilityBonus(product: DBProduct): number {
  let bonus = 0;
  const warranty = (product.warranty || "").toLowerCase();

  // Parse warranty duration
  const yearMatch = warranty.match(/(\d+)\s*(?:year|an|año|anno|jahr)/i);
  if (yearMatch) {
    const years = parseInt(yearMatch[1]);
    if (years >= 5) bonus += 2.0;
    else if (years >= 3) bonus += 1.0;
    else if (years >= 2) bonus += 0.5;
  }

  // Material-based durability heuristics
  const materials = product.material_tags || [];
  // Premium durable materials
  if (materials.includes("teak"))       bonus += 1.0;
  if (materials.includes("aluminium"))  bonus += 0.5;
  if (materials.includes("steel"))      bonus += 0.5;
  // Less durable
  if (materials.includes("polypropylene") && !product.technical_tags?.includes("fibreglass-reinforced")) {
    bonus -= 0.5;
  }

  // CHR certification bonus
  if (product.technical_tags?.includes("en-12727-level-4") || product.technical_tags?.includes("chr-heavy-use")) {
    bonus += 1.0;
  }

  return bonus;
}

// ═══════════════════════════════════════════════════════════
// COLOR HARMONY — advanced palette compatibility
// ═══════════════════════════════════════════════════════════

const COLOR_FAMILIES: Record<string, string> = {
  // Darks
  black: "dark", anthracite: "dark", charcoal: "dark", graphite: "dark",
  // Lights
  white: "light", cream: "light", ivory: "light", "off-white": "light",
  // Warm neutrals
  beige: "warm-neutral", sand: "warm-neutral", taupe: "warm-neutral", champagne: "warm-neutral",
  // Cool neutrals
  grey: "cool-neutral", silver: "cool-neutral",
  // Woods
  teak: "wood", walnut: "wood", "dark-brown": "wood", chocolate: "wood",
  // Earths
  terracotta: "earth", rust: "earth", copper: "earth", bronze: "earth",
  // Nature
  green: "nature", sage: "nature", olive: "nature",
  // Cool tones
  blue: "cool-tone", navy: "cool-tone", "petrol-blue": "cool-tone",
  // Warm tones
  red: "warm-tone", mustard: "warm-tone", gold: "warm-tone", yellow: "warm-tone",
  // Pastels
  "blush-pink": "pastel", bordeaux: "warm-tone",
};

// Families that harmonize well together
const HARMONIOUS_PAIRS: [string, string][] = [
  ["dark", "light"], ["dark", "warm-neutral"], ["dark", "wood"],
  ["light", "warm-neutral"], ["light", "nature"], ["light", "cool-tone"],
  ["warm-neutral", "wood"], ["warm-neutral", "earth"],
  ["cool-neutral", "cool-tone"], ["cool-neutral", "nature"],
  ["wood", "earth"], ["wood", "nature"],
  ["earth", "warm-tone"],
];

// Families that clash
const CLASHING_PAIRS: [string, string][] = [
  ["warm-tone", "cool-tone"],
  ["pastel", "dark"],
  ["earth", "cool-tone"],
];

function colorHarmonyScore(productColor: string | null, conceptColors: string[]): number {
  if (!productColor) return 0;
  const productFamily = COLOR_FAMILIES[productColor.toLowerCase()];
  if (!productFamily) return 0;

  const conceptFamilies = conceptColors
    .map(c => COLOR_FAMILIES[c.toLowerCase()])
    .filter((f): f is string => !!f);

  if (conceptFamilies.length === 0) return 0;

  let score = 0;
  for (const cf of conceptFamilies) {
    if (cf === productFamily) { score += 1.5; continue; } // same family = good
    const isHarmonious = HARMONIOUS_PAIRS.some(
      ([a, b]) => (a === productFamily && b === cf) || (b === productFamily && a === cf)
    );
    if (isHarmonious) { score += 1.0; continue; }
    const isClashing = CLASHING_PAIRS.some(
      ([a, b]) => (a === productFamily && b === cf) || (b === productFamily && a === cf)
    );
    if (isClashing) { score -= 1.5; }
  }

  return score;
}

// ═══════════════════════════════════════════════════════════
// SEASONAL SCORING
// ═══════════════════════════════════════════════════════════

function seasonalBonus(product: DBProduct): number {
  const month = new Date().getMonth(); // 0-11
  const ptt: ProductTypeTags = product.product_type_tags || {};
  let bonus = 0;

  // Spring/Summer (Mar-Aug): boost shade & cooling
  if (month >= 2 && month <= 7) {
    if (product.category?.toLowerCase().includes("parasol")) bonus += 1.5;
    if (product.category?.toLowerCase().includes("lounger")) bonus += 1.0;
    if (product.uv_resistant) bonus += 0.5;
  }

  // Autumn/Winter (Sep-Feb): boost covered/heated solutions
  if (month >= 8 || month <= 1) {
    // Boost products suitable for covered terraces
    if (product.technical_tags?.includes("indoor-outdoor")) bonus += 1.0;
    // Accessories like heaters, windbreaks
    if (product.category?.toLowerCase().includes("accessor")) bonus += 0.5;
  }

  return bonus;
}

// ═══════════════════════════════════════════════════════════
// FIX C — ADAPTIVE WEIGHTS BY PRODUCT TYPE
// ═══════════════════════════════════════════════════════════

interface WeightSet {
  style:        number;
  silhouette:   number;
  use_case:     number;
  ambience:     number;
  material:     number;
  palette:      number;
  conceptPalette: number;  // new: score vs concept hex
  technical:    number;
  dimension:    number;    // for tables/parasols
  popularity:   number;
  data_quality: number;
}

function getWeights(category: string): WeightSet {
  const cat = category.toLowerCase();
  if (cat.includes("chair") || cat.includes("armchair") || cat.includes("bench")) {
    return { style: 4.0, silhouette: 5.0, use_case: 3.5, ambience: 2.5,
      material: 3.0, palette: 3.5, conceptPalette: 3.0, technical: 2.0,
      dimension: 0.5, popularity: 1.5, data_quality: 2.5 };
  }
  if (cat.includes("stool")) {
    return { style: 3.5, silhouette: 4.0, use_case: 4.0, ambience: 2.0,
      material: 3.0, palette: 3.0, conceptPalette: 2.5, technical: 2.5,
      dimension: 1.0, popularity: 1.5, data_quality: 2.5 };
  }
  if (cat.includes("table")) {
    return { style: 3.0, silhouette: 1.0, use_case: 3.0, ambience: 2.0,
      material: 3.5, palette: 3.0, conceptPalette: 2.5, technical: 2.0,
      dimension: 6.0, popularity: 1.0, data_quality: 2.5 };
  }
  if (cat.includes("parasol") || cat.includes("shade")) {
    return { style: 2.0, silhouette: 0.5, use_case: 2.5, ambience: 1.5,
      material: 2.0, palette: 3.0, conceptPalette: 2.0, technical: 4.0,
      dimension: 6.0, popularity: 1.0, data_quality: 2.5 };
  }
  if (cat.includes("lounger") || cat.includes("daybed")) {
    return { style: 3.0, silhouette: 2.0, use_case: 4.0, ambience: 2.0,
      material: 3.0, palette: 3.0, conceptPalette: 2.5, technical: 5.0,
      dimension: 1.0, popularity: 1.5, data_quality: 2.5 };
  }
  if (cat.includes("sofa") || cat.includes("lounge")) {
    return { style: 4.0, silhouette: 3.0, use_case: 3.5, ambience: 3.0,
      material: 3.5, palette: 3.5, conceptPalette: 3.0, technical: 2.5,
      dimension: 0.5, popularity: 1.5, data_quality: 2.5 };
  }
  // Default
  return { style: 3.5, silhouette: 2.0, use_case: 3.0, ambience: 2.5,
    material: 2.5, palette: 3.0, conceptPalette: 2.5, technical: 2.0,
    dimension: 1.0, popularity: 1.5, data_quality: 2.0 };
}

// ═══════════════════════════════════════════════════════════
// STEP 1: Parse input
// ═══════════════════════════════════════════════════════════

function matchKeywords(input: string, dict: Record<string, string[]>): string[] {
  const lower = input.toLowerCase();
  return Object.entries(dict)
    .filter(([, synonyms]) => synonyms.some(s => lower.includes(s)))
    .map(([key]) => key);
}

function extractCapacity(input: string): number | null {
  const match = input.match(/(\d+)\s*(?:seats?|places?|covers?|pax|pers|couverts?|m²|sqm)/i);
  if (match) return parseInt(match[1]);
  const standalone = input.match(/(\d{2,3})/);
  if (standalone) return parseInt(standalone[1]);
  return null;
}

function extractZone(input: string): string {
  const zones: Record<string, string[]> = {
    terrace:  ["terrace", "terrasse", "patio"],
    garden:   ["garden", "jardin", "courtyard"],
    pool:     ["pool", "piscine", "pool deck"],
    rooftop:  ["rooftop", "roof", "toit"],
    deck:     ["deck", "boardwalk", "plage"],
    balcony:  ["balcony", "balcon"],
    interior: ["interior", "indoor", "inside"],
    lounge:   ["lounge", "chill", "relax zone"],
  };
  const lower = input.toLowerCase();
  for (const [zone, keywords] of Object.entries(zones)) {
    if (keywords.some(k => lower.includes(k))) return zone;
  }
  return "outdoor";
}

export function parseProjectRequest(input: string): ProjectParameters {
  return {
    builderMode: "",
    establishmentType: matchKeywords(input, ESTABLISHMENT_KEYWORDS)[0] || "",
    projectZone: extractZone(input),
    seatingCapacity: extractCapacity(input),
    seatingLayout: "",
    layoutPriority: "",
    style: matchKeywords(input, STYLE_KEYWORDS),
    ambience: matchKeywords(input, AMBIENCE_KEYWORDS),
    colorPalette: matchKeywords(input, PALETTE_KEYWORDS),
    materialPreferences: matchKeywords(input, MATERIAL_KEYWORDS),
    technicalConstraints: [],
    isOutdoor: !["indoor", "interior", "inside"].some(w => input.toLowerCase().includes(w)),
    budgetLevel: matchKeywords(input, BUDGET_KEYWORDS)[0] || "",
    timeline: matchKeywords(input, TIMELINE_KEYWORDS)[0] || "",
    terraceSurfaceM2: null,
    terraceLength: null,
    terraceWidth: null,
    tableMix: [],
    selectedCategories: null, // null = complete proposal
  };
}

// ═══════════════════════════════════════════════════════════
// STEP 2: Discovery
// ═══════════════════════════════════════════════════════════

export function detectMissingFields(params: ProjectParameters): DiscoveryQuestion[] {
  const questions: DiscoveryQuestion[] = [];

  if (params.style.length === 0) {
    questions.push({ id: "style", question: "discovery.styleQuestion",
      options: ["discovery.styleBistro", "discovery.styleMediterranean", "discovery.styleNatural", "discovery.styleModern", "discovery.styleLounge", "discovery.styleCoastal"],
      field: "style", priority: 10 });
  }
  if (params.materialPreferences.length === 0) {
    questions.push({ id: "material", question: "discovery.materialQuestion",
      options: ["discovery.materialPP", "discovery.materialAluRope", "discovery.materialAluTextilene", "discovery.materialTeak", "discovery.materialRattan"],
      field: "materialPreferences", priority: 9 });
  }
  if (!params.seatingLayout) {
    questions.push({ id: "seatingLayout", question: "discovery.layoutQuestion",
      options: ["discovery.layoutMostly2", "discovery.layoutBalanced", "discovery.layoutMostly4", "discovery.layoutModular", "discovery.layoutGroup"],
      field: "seatingLayout", priority: 8.5 });
  }
  if (!params.layoutPriority) {
    questions.push({ id: "layoutPriority", question: "discovery.priorityQuestion",
      options: ["discovery.priorityMaxCapacity", "discovery.priorityBalanced", "discovery.prioritySpacious", "discovery.priorityFlexible"],
      field: "layoutPriority", priority: 8 });
  }
  if (!params.budgetLevel) {
    questions.push({ id: "budget", question: "discovery.budgetQuestion",
      options: ["€50–80", "€80–120", "€120–180", "€180+"],
      field: "budgetLevel", priority: 7.5 });
  }
  if (params.colorPalette.length === 0) {
    questions.push({ id: "palette", question: "discovery.paletteQuestion",
      options: ["discovery.paletteTerracotta", "discovery.paletteWood", "discovery.paletteBlack", "discovery.paletteBlue", "discovery.paletteOlive"],
      field: "colorPalette", priority: 7 });
  }

  questions.sort((a, b) => b.priority - a.priority);
  return questions;
}

export function isRequestComplete(params: ProjectParameters): boolean {
  const missing = [
    params.style.length === 0,
    params.ambience.length === 0,
    params.colorPalette.length === 0,
    params.materialPreferences.length === 0,
    !params.budgetLevel,
  ].filter(Boolean).length;
  return missing < 3;
}

export function applyAnswer(params: ProjectParameters, questionId: string, answer: string): ProjectParameters {
  const updated = { ...params };
  const lower = answer.toLowerCase();

  switch (questionId) {
    case "style":
      updated.style = [...updated.style, ...matchKeywords(lower, STYLE_KEYWORDS)];
      if (updated.style.length === 0) updated.style = [lower.split("/")[0].trim().toLowerCase()];
      break;
    case "ambience":
      updated.ambience = [...updated.ambience, ...matchKeywords(lower, AMBIENCE_KEYWORDS)];
      break;
    case "palette":
      updated.colorPalette = [...updated.colorPalette, ...matchKeywords(lower, PALETTE_KEYWORDS)];
      if (updated.colorPalette.length === 0) updated.colorPalette = [lower.split("/")[0].trim().toLowerCase()];
      break;
    case "material":
      if (!lower.includes("no preference")) {
        updated.materialPreferences = [...updated.materialPreferences, ...matchKeywords(lower, MATERIAL_KEYWORDS)];
      }
      break;
    case "budget":
      updated.budgetLevel = matchKeywords(lower, BUDGET_KEYWORDS)[0] || "mid";
      break;
    case "seatingLayout": {
      const layoutMap: Record<string, string> = {
        "mostly 2": "mostly-2", "balanced mix": "balanced-2-4",
        "mostly 4": "mostly-4", "flexible modular": "modular", "group dining": "group",
      };
      for (const [key, val] of Object.entries(layoutMap)) {
        if (lower.includes(key)) { updated.seatingLayout = val; break; }
      }
      if (!updated.seatingLayout) updated.seatingLayout = "balanced-2-4";
      break;
    }
    case "layoutPriority": {
      const pm: Record<string, string> = {
        maximize: "max-capacity", "balanced comfort": "balanced",
        spacious: "spacious", flexible: "flexible-groups",
      };
      for (const [key, val] of Object.entries(pm)) {
        if (lower.includes(key)) { updated.layoutPriority = val; break; }
      }
      if (!updated.layoutPriority) updated.layoutPriority = "balanced";
      break;
    }
  }
  return updated;
}

export function generateProjectSummary(params: ProjectParameters): ProjectSummary {
  const layoutLabels: Record<string, string> = {
    "mostly-2": "Mostly 2-seater tables", "balanced-2-4": "Balanced mix of 2 & 4-seaters",
    "mostly-4": "Mostly 4-seater tables", modular: "Flexible modular layout",
    group: "Group dining friendly", custom: "Custom mix",
  };
  const priorityLabels: Record<string, string> = {
    "max-capacity": "Maximize capacity", balanced: "Balanced comfort & capacity",
    spacious: "Spacious premium layout", "flexible-groups": "Flexible for groups",
  };
  return {
    establishment: params.establishmentType || "hospitality space",
    zone:          params.projectZone || "outdoor",
    style:         params.style.join(", ") || "to be defined",
    ambience:      params.ambience.join(", ") || "to be defined",
    capacity:      params.seatingCapacity ? `${params.seatingCapacity} seats` : "to be defined",
    layout:        layoutLabels[params.seatingLayout] || "to be defined",
    layoutPriority: priorityLabels[params.layoutPriority] || "to be defined",
    palette:       params.colorPalette.join(", ") || "open",
    materials:     params.materialPreferences.join(", ") || "open",
    constraints:   [params.isOutdoor ? "outdoor use" : "indoor use", ...(params.technicalConstraints || [])].join(", "),
  };
}

// ═══════════════════════════════════════════════════════════
// STEP 3: Concept templates
// ═══════════════════════════════════════════════════════════

interface ConceptTemplate {
  titleTemplate: string;
  descTemplate:  string;
  styleBias:     string[];
  ambienceBias:  string[];
  colorHex:      string[];
  colorNames:    string[];
  mood:          string[];
}

const CONCEPT_LIBRARY: Record<string, ConceptTemplate[]> = {
  mediterranean: [
    { titleTemplate: "Riviera Sun",
      descTemplate: "A sun-drenched Mediterranean terrace with natural textures and warm earthy tones. Woven materials meet teak wood for timeless coastal elegance.",
      styleBias: ["mediterranean","coastal","natural"], ambienceBias: ["warm","relaxed","convivial"],
      colorHex: ["#D4A574","#F5E6D3","#8B7355","#E8DDD3","#C4956A"],
      colorNames: ["Terracotta","Sand","Driftwood","Linen","Amber"], mood: ["sun-kissed","artisan","al-fresco"] },
    { titleTemplate: "Aegean Breeze",
      descTemplate: "Inspired by Greek island terraces — whitewashed simplicity with organic textures and blue accents.",
      styleBias: ["mediterranean","minimal","coastal"], ambienceBias: ["relaxed","intimate","bright"],
      colorHex: ["#FFFFFF","#4A90A4","#D4C5A9","#E8E3DA","#8AAFBF"],
      colorNames: ["White","Aegean Blue","Wheat","Chalk","Sea Mist"], mood: ["fresh","island","breezy"] },
    { titleTemplate: "Provençal Garden",
      descTemplate: "Rustic charm meets refined comfort. Aged materials and natural textiles create an intimate garden dining atmosphere.",
      styleBias: ["natural","classic","bistro"], ambienceBias: ["intimate","warm","authentic"],
      colorHex: ["#9B8B7A","#D4C9B8","#7B6B8A","#E8DDD3","#A69B8E"],
      colorNames: ["Stone","Flax","Lavender","Cream","Pebble"], mood: ["rustic","garden","provençal"] },
  ],
  modern: [
    { titleTemplate: "Urban Edge",
      descTemplate: "Clean-lined contemporary design with monochrome palette and metallic accents.",
      styleBias: ["modern","industrial","minimal"], ambienceBias: ["elegant","design-forward","evening"],
      colorHex: ["#1A1A1A","#FFFFFF","#888888","#C0C0C0","#333333"],
      colorNames: ["Onyx","Pure White","Concrete","Silver","Graphite"], mood: ["sleek","urban","architectural"] },
    { titleTemplate: "Soft Modern",
      descTemplate: "Warm minimalism with curved forms and muted earth tones. Natural materials elevated through contemporary design.",
      styleBias: ["modern","minimal","natural"], ambienceBias: ["refined","relaxed","elegant"],
      colorHex: ["#E8DDD3","#D4C5A9","#8B7355","#F5F0EB","#A69B8E"],
      colorNames: ["Oat","Wheat","Walnut","Mist","Mushroom"], mood: ["calm","refined","organic-modern"] },
    { titleTemplate: "Noir Luxe",
      descTemplate: "Dark sophistication with premium materials. Black iron and deep tones create an evening-first atmosphere.",
      styleBias: ["luxury","modern","minimal"], ambienceBias: ["elegant","evening","refined"],
      colorHex: ["#1A1A1A","#8B7355","#D4A574","#2D2D2D","#C4956A"],
      colorNames: ["Black","Bronze","Copper","Charcoal","Gold"], mood: ["dramatic","luxurious","evening"] },
  ],
  natural: [
    { titleTemplate: "Forest Lodge",
      descTemplate: "Organic textures and forest-inspired palette. Teak, rattan and linen for a warm, grounded outdoor retreat.",
      styleBias: ["natural","scandinavian","bohemian"], ambienceBias: ["warm","relaxed","intimate"],
      colorHex: ["#6B7B5E","#D4C5A9","#8B7355","#E8DDD3","#A69B8E"],
      colorNames: ["Sage","Flax","Walnut","Linen","Pebble"], mood: ["earthy","grounded","retreat"] },
    { titleTemplate: "Earth & Craft",
      descTemplate: "Artisan-crafted pieces with raw textures. Hand-woven details and honest materials.",
      styleBias: ["natural","bohemian","vintage"], ambienceBias: ["warm","convivial","authentic"],
      colorHex: ["#C4956A","#8B7355","#D4C5A9","#E8DDD3","#A0856E"],
      colorNames: ["Terracotta","Teak","Hemp","Cream","Clay"], mood: ["handmade","authentic","textured"] },
  ],
  minimal: [
    { titleTemplate: "Pared Back",
      descTemplate: "Essential forms and honest materials. Every piece earns its place through function and beauty.",
      styleBias: ["minimal","modern","natural"], ambienceBias: ["refined","bright","relaxed"],
      colorHex: ["#F5F0EB","#E8DDD3","#D4C9B8","#C4B8A8","#8B7355"],
      colorNames: ["Snow","Linen","Oat","Pebble","Walnut"], mood: ["essential","considered","quiet"] },
  ],
  scandinavian: [
    { titleTemplate: "Nordic Calm",
      descTemplate: "Restrained Scandinavian design with light woods, clean forms and soft neutral textiles.",
      styleBias: ["scandinavian","minimal","modern"], ambienceBias: ["refined","intimate","bright"],
      colorHex: ["#F5F0EB","#D4C9B8","#8B7355","#E8E3DA","#BFBAB3"],
      colorNames: ["Snow","Oat","Oak","Frost","Stone"], mood: ["serene","balanced","light"] },
  ],
  luxury: [
    { titleTemplate: "Grand Terrace",
      descTemplate: "Statement pieces and premium materials. Marble, brass and sculptural forms for discerning venues.",
      styleBias: ["luxury","modern","classic"], ambienceBias: ["elegant","refined","evening"],
      colorHex: ["#1A1A1A","#D4A574","#FFFFFF","#8B7355","#C4956A"],
      colorNames: ["Black","Brass","Marble","Bronze","Gold"], mood: ["opulent","dramatic","exclusive"] },
    { titleTemplate: "Quiet Luxury",
      descTemplate: "Understated premium design. Rich materials and perfect proportions.",
      styleBias: ["luxury","minimal","modern"], ambienceBias: ["refined","intimate","elegant"],
      colorHex: ["#E8DDD3","#8B7355","#D4C5A9","#A69B8E","#C4B8A8"],
      colorNames: ["Cream","Espresso","Cashmere","Taupe","Sand"], mood: ["refined","subtle","exclusive"] },
  ],
  industrial: [
    { titleTemplate: "Factory Terrace",
      descTemplate: "Raw metal, concrete tones and stackable functionality. Industrial design for high-volume hospitality.",
      styleBias: ["industrial","modern","minimal"], ambienceBias: ["festive","convivial","design-forward"],
      colorHex: ["#888888","#1A1A1A","#C0C0C0","#D4C9B8","#666666"],
      colorNames: ["Steel","Iron","Zinc","Concrete","Smoke"], mood: ["raw","urban","functional"] },
  ],
  tropical: [
    { titleTemplate: "Island Resort",
      descTemplate: "Woven rattan, teak and resort-style lounging. Designed for daytime relaxation and sunset cocktails.",
      styleBias: ["tropical","natural","bohemian"], ambienceBias: ["relaxed","festive","warm"],
      colorHex: ["#6B7B5E","#D4A574","#F5E6D3","#8B7355","#A0856E"],
      colorNames: ["Palm","Bamboo","Coconut","Teak","Cinnamon"], mood: ["exotic","resort","lush"] },
  ],
  coastal: [
    { titleTemplate: "Harbor View",
      descTemplate: "Maritime elegance with weathered textures and nautical blues. For port-side dining and seaside venues.",
      styleBias: ["coastal","classic","natural"], ambienceBias: ["relaxed","elegant","bright"],
      colorHex: ["#2C5F7C","#F5E6D3","#FFFFFF","#8B7355","#A8C5D6"],
      colorNames: ["Navy","Sand","White","Rope","Sky"], mood: ["maritime","fresh","harbour"] },
  ],
  bistro: [
    { titleTemplate: "Café Parisien",
      descTemplate: "The quintessential French bistro terrace — stackable chairs, marble-effect tables, heritage colors.",
      styleBias: ["bistro","classic","industrial"], ambienceBias: ["convivial","warm","authentic"],
      colorHex: ["#333333","#E8DDD3","#8B7355","#C4956A","#A69B8E"],
      colorNames: ["Iron","Cream","Walnut","Copper","Stone"], mood: ["parisian","bustling","terrasse"] },
  ],
  lounge: [
    { titleTemplate: "Sunset Lounge",
      descTemplate: "Deep seating, low tables and a palette designed for lingering.",
      styleBias: ["lounge","modern","luxury"], ambienceBias: ["relaxed","intimate","evening"],
      colorHex: ["#D4A574","#1A1A1A","#E8DDD3","#8B7355","#C4956A"],
      colorNames: ["Amber","Black","Linen","Bronze","Gold"], mood: ["sunset","lingering","chill"] },
  ],
  classic: [
    { titleTemplate: "Belle Époque",
      descTemplate: "Timeless European terrace design with elegant proportions and quality materials.",
      styleBias: ["classic","bistro","luxury"], ambienceBias: ["elegant","warm","intimate"],
      colorHex: ["#8B7355","#E8DDD3","#333333","#D4C5A9","#C4956A"],
      colorNames: ["Bronze","Cream","Iron","Linen","Gold"], mood: ["timeless","parisian","elegant"] },
  ],
  japandi: [
    { titleTemplate: "Zen Terrace",
      descTemplate: "Japanese-Scandinavian harmony. Natural materials, clean lines and mindful simplicity.",
      styleBias: ["japandi","minimal","scandinavian"], ambienceBias: ["refined","relaxed","intimate"],
      colorHex: ["#E8DDD3","#6B7B5E","#8B7355","#F5F0EB","#A69B8E"],
      colorNames: ["Rice Paper","Moss","Oak","Cream","Stone"], mood: ["mindful","serene","wabi-sabi"] },
  ],
};

const ESTABLISHMENT_AMBIENCE: Record<string, string[]> = {
  restaurant:   ["convivial","warm","authentic","bright"],
  hotel:        ["elegant","refined","relaxed","intimate"],
  rooftop:      ["evening","design-forward","festive","elegant"],
  "beach-club": ["relaxed","festive","bright","warm"],
  bar:          ["evening","intimate","festive","design-forward"],
  camping:      ["relaxed","authentic","warm","convivial"],
  event:        ["festive","elegant","convivial","refined"],
  pool:         ["relaxed","bright","warm","refined"],
};

// FIX 5 — Concept diversity enforcement
function getConceptTemplates(params: ProjectParameters): ConceptTemplate[] {
  const allTemplates: ConceptTemplate[] = [];
  for (const style of params.style) {
    const t = CONCEPT_LIBRARY[style];
    if (t) allTemplates.push(...t);
  }
  if (allTemplates.length === 0) {
    allTemplates.push(...(CONCEPT_LIBRARY["modern"] || []));
  }

  const estAmbiences = ESTABLISHMENT_AMBIENCE[params.establishmentType] || [];

  const scored = allTemplates.map(t => {
    let score = 0;
    for (const a of params.ambience) { if (t.ambienceBias.includes(a)) score += 2; }
    for (const c of params.colorPalette) {
      if (t.colorNames.some(cn => cn.toLowerCase().includes(c))) score += 1;
    }
    for (const a of estAmbiences) { if (t.ambienceBias.includes(a)) score += 1.5; }
    return { template: t, score };
  });
  scored.sort((a, b) => b.score - a.score);

  const selected: ConceptTemplate[] = [];
  const usedTitles = new Set<string>();

  for (const { template } of scored) {
    if (usedTitles.has(template.titleTemplate) || selected.length >= 3) continue;
    // Diversity: reject if too similar to already-selected concepts
    const tooSimilar = selected.some(s => {
      const sharedStyles    = template.styleBias.filter(st => s.styleBias.includes(st)).length;
      const sharedAmbiences = template.ambienceBias.filter(a => s.ambienceBias.includes(a)).length;
      return sharedStyles >= 2 && sharedAmbiences >= 2;
    });
    if (tooSimilar && selected.length > 0) continue;
    selected.push(template);
    usedTitles.add(template.titleTemplate);
  }

  // Fill remaining from other style families
  if (selected.length < 3) {
    for (const style of Object.keys(CONCEPT_LIBRARY)) {
      if (selected.length >= 3) break;
      const t = CONCEPT_LIBRARY[style]?.[0];
      if (t && !usedTitles.has(t.titleTemplate)) {
        selected.push(t);
        usedTitles.add(t.titleTemplate);
      }
    }
  }
  return selected.slice(0, 3);
}

// ═══════════════════════════════════════════════════════════
// STEP 4: Product scoring — composite formula
// score = contextScore × climate × venue × capacity − budget
//         then × data_quality_score (multiplicative)
// ═══════════════════════════════════════════════════════════

function scoreProduct(
  product: DBProduct,
  concept: ConceptTemplate,
  params: ProjectParameters,
  climate: ClimateProfile,
  venueNeeds: VenueNeeds
): number {
  const W   = getWeights(product.category);
  const ptt = product.product_type_tags || {};
  let score = 0;

  // Style
  for (const tag of product.style_tags) {
    if (concept.styleBias.includes(tag)) score += W.style;
    if (params.style.includes(tag))      score += W.style * 0.75;
  }

  // Silhouette (chairs / sofas)
  if (ptt.silhouette) {
    const venueType = params.establishmentType;
    const preferredSilhouettes: Record<string, string[]> = {
      "beach-club": ["lounge","daybed","cantilever"],
      bar:          ["4-leg","sled","tulip"],
      restaurant:   ["bistrot","4-leg","sled","cross-back"],
      hotel:        ["lounge","shell","cross-back"],
      rooftop:      ["lounge","4-leg","ghost"],
    };
    const preferred = preferredSilhouettes[venueType] || [];
    if (preferred.includes(ptt.silhouette)) score += W.silhouette;
    else score += W.silhouette * 0.3;
  }

  // Use-case
  for (const tag of product.use_case_tags) {
    if (tag.includes(params.establishmentType)) score += W.use_case;
    if (tag.includes(params.projectZone))       score += W.use_case * 0.7;
  }

  // Ambience
  for (const tag of product.ambience_tags) {
    if (concept.ambienceBias.includes(tag)) score += W.ambience;
    if (params.ambience.includes(tag))      score += W.ambience * 0.6;
  }

  // FIX A — Palette: compare product main_color vs concept hex
  if (product.main_color) {
    const productHex = COLOR_SLUG_TO_HEX[product.main_color.toLowerCase()];
    if (productHex) {
      const inConceptPalette = concept.colorHex.includes(productHex);
      const paletteTagsForHex = HEX_TO_PALETTE_TAGS[productHex] || [];
      const matchesUserPalette = paletteTagsForHex.some(t => params.colorPalette.includes(t));
      if (inConceptPalette)   score += W.conceptPalette;
      if (matchesUserPalette) score += W.palette;
      // Penalize clear color clash
      const clashMap: Record<string, string[]> = {
        "#1A1A1A": ["natural","warm","terracotta"],
        "#D4603A": ["black","cool"],
        "#FFFFFF": ["black","dark"],
      };
      const clashes = clashMap[productHex] || [];
      if (clashes.some(c => params.colorPalette.includes(c))) score -= W.conceptPalette * 0.5;
    }
  }

  // Palette tags match
  for (const tag of product.palette_tags) {
    if (params.colorPalette.includes(tag)) score += W.palette * 0.5;
  }

  // Material — match full words only to avoid false positives (e.g. "al" matching "aluminum")
  for (const tag of product.material_tags) {
    const tagLower = tag.toLowerCase();
    for (const pref of params.materialPreferences) {
      const prefLower = pref.toLowerCase();
      if (tagLower === prefLower || tagLower.split(/[\s\-_]+/).includes(prefLower) || prefLower.split(/[\s\-_]+/).includes(tagLower)) {
        score += W.material;
      }
    }
  }

  // Technical
  if (params.isOutdoor && product.is_outdoor) score += W.technical;

  // Dimension match for tables
  if (product.category.toLowerCase().includes("table")) {
    if (ptt.dimension_tag) {
      score += W.dimension * 0.5; // has a dimension specified
      // Expert mode: boost if dimension matches user's tableMix
      if (params.tableMix && params.tableMix.length > 0) {
        const matchesUserFormat = params.tableMix.some(
          tm => ptt.dimension_tag && ptt.dimension_tag.includes(tm.format)
        );
        if (matchesUserFormat) score += W.dimension * 1.5;
      }
    }
  }

  // Base/top compatible matching — boost if product has defined compatibility
  if (ptt.table_type === "base-only" && ptt.compatible_tops?.length) {
    score += 1.5; // has documented compatible tops
  }
  if (ptt.table_type === "top-only" && ptt.compatible_bases?.length) {
    score += 1.5; // has documented compatible bases
  }

  // FIX 2 — Venue needs
  const catNorm = (product.category || "").toLowerCase();
  const isMandatory = venueNeeds.mandatory.some(m => catNorm.includes(m.toLowerCase()));
  const isPreferred = venueNeeds.preferred.some(p => catNorm.includes(p.toLowerCase()));
  if (isMandatory) score += 5.0;
  if (isPreferred) score += 2.5;

  // FIX 3 — Climate
  score += climateBonus(product, climate);

  // FIX 6 — Capacity
  score += capacityBonus(product, params.seatingCapacity);

  // Weight & ergonomics — penalize heavy products for high-handling venues
  score += weightErgonomicsBonus(product, params);

  // Durability & warranty — favor products with longer lifecycle
  score += durabilityBonus(product);

  // Color harmony — advanced palette compatibility
  const conceptColorSlugs = concept.colorNames.map(c => c.toLowerCase().replace(/\s+/g, "-"));
  score += colorHarmonyScore(product.main_color, conceptColorSlugs);

  // Popularity (kept low to not override quality signals)
  score += product.popularity_score * W.popularity;

  // Admin priority
  score += product.priority_score * 2.0;

  // CHR bonus
  if (product.is_chr_heavy_use) score += 1.5;

  // Availability
  if (product.availability_type === "available") score += 1.5;
  else if (product.availability_type === "on-order") score += 0.75;

  // Seasonal bonus
  score += seasonalBonus(product);

  // FIX 1 — Soft budget penalty
  score -= budgetPenalty(product, params.budgetLevel);

  // FIX D — Data quality as MULTIPLICATIVE factor
  const quality = product.data_quality_score ?? 0.5;
  const qualityMultiplier = 0.4 + (quality * 0.6); // floor 0.4, ceiling 1.0
  score = Math.max(0, score) * qualityMultiplier;

  return score;
}

// ═══════════════════════════════════════════════════════════
// FIX 4 — Percentile scoring
// ═══════════════════════════════════════════════════════════

function computePercentiles(scores: number[]): number[] {
  if (scores.length === 0) return [];
  const sorted = [...scores].sort((a, b) => a - b);
  return scores.map(s => {
    const rank = sorted.filter(x => x < s).length;
    return Math.round((rank / Math.max(sorted.length - 1, 1)) * 100) / 100;
  });
}

// ═══════════════════════════════════════════════════════════
// BOM ENGINE
// Selects the best product per functional slot
// ═══════════════════════════════════════════════════════════

function inferBOMRole(product: DBProduct): BOMSlotRole {
  const cat = (product.category || "").toLowerCase();
  if (cat.includes("armchair"))    return "armchair";
  if (cat.includes("chair"))       return "chair";
  if (cat.includes("stool"))       return "bar_stool";
  if (cat.includes("sofa") || cat.includes("lounge seating")) return "sofa";
  if (cat.includes("lounger") || cat.includes("daybed"))      return "sun_lounger";
  if (cat.includes("parasol") || cat.includes("shade"))       return "parasol";
  if (cat.includes("bench"))       return "bench";
  if (cat.includes("table")) {
    const ptt: ProductTypeTags = product.product_type_tags || {};
    if (ptt.table_type === "base-only") return "table_base";
    if (ptt.table_type === "top-only")  return "tabletop";
    return "complete_table";
  }
  return "other";
}

function buildBOMSlot(
  product: DBProduct,
  role: BOMSlotRole,
  quantity: number,
  relevanceScore: number,
  reason: string,
  layoutReq?: { id?: string; type?: LayoutRequirementType; label?: string }
): BOMSlot {
  const unitMin = product.price_min;
  const unitMax = product.price_max;
  return {
    role,
    quantity,
    product,
    archetypeId:   product.archetype_id ?? null,
    relevanceScore,
    reason,
    layoutRequirementId:    layoutReq?.id,
    layoutRequirementType:  layoutReq?.type,
    layoutRequirementLabel: layoutReq?.label,
    tableFormat: (product.product_type_tags as ProductTypeTags)?.dimension_tag,
    unitPriceMin:  unitMin,
    unitPriceMax:  unitMax,
    slotTotalMin:  unitMin != null ? unitMin * quantity : null,
    slotTotalMax:  unitMax != null ? unitMax * quantity : null,
  };
}

function buildConceptBOM(
  slots: BOMSlot[],
  venueNeeds: VenueNeeds
): ConceptBOM {
  const totalItems = slots.reduce((sum, s) => sum + s.quantity, 0);

  const mins = slots.map(s => s.slotTotalMin).filter((v): v is number => v != null);
  const maxs = slots.map(s => s.slotTotalMax).filter((v): v is number => v != null);
  const rawMin = mins.length > 0 ? mins.reduce((a, b) => a + b, 0) : null;
  const rawMax = maxs.length > 0 ? maxs.reduce((a, b) => a + b, 0) : null;

  // Find mandatory slots that have no product assigned
  const coveredRoles = new Set(slots.map(s => s.role));
  const roleForCategory = (cat: string): BOMSlotRole => {
    const c = cat.toLowerCase();
    if (c.includes("chair"))   return "chair";
    if (c.includes("table"))   return "complete_table";
    if (c.includes("parasol")) return "parasol";
    if (c.includes("lounger")) return "sun_lounger";
    if (c.includes("stool"))   return "bar_stool";
    return "other";
  };
  const missingSlots: BOMSlotRole[] = venueNeeds.mandatory
    .map(roleForCategory)
    .filter(r => r !== "other" && !coveredRoles.has(r));

  return {
    slots,
    totalItems,
    indicativeTotalMin: rawMin != null ? Math.round(rawMin * 1.15) : null,
    indicativeTotalMax: rawMax != null ? Math.round(rawMax * 1.15) : null,
    missingSlots,
  };
}

// ═══════════════════════════════════════════════════════════
// Product selection with archetype deduplication
// ═══════════════════════════════════════════════════════════

function selectProductsForConcept(
  concept: ConceptTemplate,
  params: ProjectParameters,
  products: DBProduct[],
  usedArchetypeIds: Set<string>,
  usedProductIds: Set<string>,
  climate: ClimateProfile,
  venueNeeds: VenueNeeds
): { selected: Array<{ product: DBProduct; score: number; percentile: number }>; allScores: number[] } {
  const allScored = products.map(p => ({
    product: p,
    score: scoreProduct(p, concept, params, climate, venueNeeds),
  }));

  const allRawScores = allScored.map(s => s.score);
  const percentiles  = computePercentiles(allRawScores);
  const scoredWithP  = allScored.map((s, i) => ({ ...s, percentile: percentiles[i] }));
  scoredWithP.sort((a, b) => b.score - a.score);

  const selected: Array<{ product: DBProduct; score: number; percentile: number }> = [];
  const usedFamilies   = new Set<string>();
  const coveredMandatory = new Set<string>();
  const maxProducts = Math.min(5, scoredWithP.length);

  for (const item of scoredWithP) {
    if (selected.length >= maxProducts) break;
    const { product, score, percentile } = item;
    const family   = product.product_family || product.category;
    const catNorm  = (product.category || "").toLowerCase();
    const archetypeId = product.archetype_id || product.id;

    const coversMandatory = venueNeeds.mandatory.some(
      m => catNorm.includes(m.toLowerCase()) && !coveredMandatory.has(m)
    );

    // Skip if same archetype already used in this concept (dedup)
    if (usedArchetypeIds.has(archetypeId) && !coversMandatory) continue;

    // Skip same family unless it covers a mandatory slot
    if (usedFamilies.has(family) && selected.length >= 3 && !coversMandatory) continue;

    selected.push({ product, score, percentile });
    usedFamilies.add(family);
    usedArchetypeIds.add(archetypeId);
    usedProductIds.add(product.id);
    venueNeeds.mandatory.forEach(m => {
      if (catNorm.includes(m.toLowerCase())) coveredMandatory.add(m);
    });
  }

  // Re-rank: boost scores by cohesion with already-selected products
  if (selected.length >= 2) {
    const cohesion = computeCohesionScore(selected.map(s => s.product));
    // If cohesion is low, try swapping the weakest non-mandatory product
    if (cohesion < 1.0 && selected.length >= 3) {
      const weakestIdx = selected.reduce((minIdx, s, idx) => {
        const catNorm = (s.product.category || "").toLowerCase();
        const isMandatory = venueNeeds.mandatory.some(m => catNorm.includes(m.toLowerCase()));
        if (isMandatory) return minIdx; // never swap mandatory
        return s.score < selected[minIdx].score ? idx : minIdx;
      }, 0);

      // Find a replacement that improves cohesion
      const weakest = selected[weakestIdx];
      const weakestCatNorm = (weakest.product.category || "").toLowerCase();
      const isMandatory = venueNeeds.mandatory.some(m => weakestCatNorm.includes(m.toLowerCase()));

      if (!isMandatory) {
        const remaining = scoredWithP.filter(
          item => !selected.some(s => s.product.id === item.product.id)
            && item.score > weakest.score * 0.7
        );
        for (const candidate of remaining) {
          const testSet = [...selected];
          testSet[weakestIdx] = candidate;
          const newCohesion = computeCohesionScore(testSet.map(s => s.product));
          if (newCohesion > cohesion + 1.0) {
            selected[weakestIdx] = candidate;
            break;
          }
        }
      }
    }
  }

  // ── Base/top auto-pairing ─────────────────────────────────
  // If a base-only or top-only table was selected, try to find its compatible counterpart
  const baseOnlyProducts = selected.filter(s => {
    const ptt: ProductTypeTags = s.product.product_type_tags || {};
    return ptt.table_type === "base-only" && ptt.compatible_tops?.length;
  });
  const topOnlyProducts = selected.filter(s => {
    const ptt: ProductTypeTags = s.product.product_type_tags || {};
    return ptt.table_type === "top-only" && ptt.compatible_bases?.length;
  });
  for (const baseItem of baseOnlyProducts) {
    const ptt: ProductTypeTags = baseItem.product.product_type_tags || {};
    const compatTopIds = ptt.compatible_tops || [];
    const matchingTop = scoredWithP.find(
      item => compatTopIds.includes(item.product.id) && !selected.some(s => s.product.id === item.product.id)
    );
    if (matchingTop && selected.length < maxProducts + 1) {
      selected.push(matchingTop);
    }
  }
  for (const topItem of topOnlyProducts) {
    const ptt: ProductTypeTags = topItem.product.product_type_tags || {};
    const compatBaseIds = ptt.compatible_bases || [];
    const matchingBase = scoredWithP.find(
      item => compatBaseIds.includes(item.product.id) && !selected.some(s => s.product.id === item.product.id)
    );
    if (matchingBase && selected.length < maxProducts + 1) {
      selected.push(matchingBase);
    }
  }

  return { selected, allScores: allRawScores };
}

// ═══════════════════════════════════════════════════════════
// AESTHETIC COHESION — bonus when concept products share palette
// ═══════════════════════════════════════════════════════════

function computeCohesionScore(selected: DBProduct[]): number {
  if (selected.length < 2) return 0;
  const colors = selected
    .map(p => p.main_color?.toLowerCase())
    .filter((c): c is string => !!c);
  if (colors.length < 2) return 0;

  // Group colors by family
  const FAMILY: Record<string, string> = {
    black: "dark", anthracite: "dark", charcoal: "dark", graphite: "dark",
    white: "light", cream: "light", ivory: "light", "off-white": "light",
    beige: "warm-neutral", sand: "warm-neutral", taupe: "warm-neutral",
    grey: "cool-neutral", silver: "cool-neutral",
    teak: "wood", walnut: "wood", "dark-brown": "wood",
    terracotta: "earth", rust: "earth", copper: "earth", bronze: "earth",
    green: "nature", sage: "nature", olive: "nature",
    blue: "cool", navy: "cool", "petrol-blue": "cool",
  };

  const families = colors.map(c => FAMILY[c] || c);
  const familyCounts: Record<string, number> = {};
  for (const f of families) familyCounts[f] = (familyCounts[f] || 0) + 1;

  // Score: how many products share the dominant family
  const familyValues = Object.values(familyCounts);
  if (familyValues.length === 0) return 0;
  const maxFamilyCount = Math.max(...familyValues);
  const uniqueFamilies = Object.keys(familyCounts).length;

  // 3/3 same family = +4.0, 2/3 = +2.0, all different = 0
  if (maxFamilyCount >= 3) return 4.0;
  if (maxFamilyCount >= 2 && uniqueFamilies <= 2) return 2.5;
  if (maxFamilyCount >= 2) return 1.5;
  return 0;
}

// ═══════════════════════════════════════════════════════════
// DELIVERY COHERENCE — penalize concepts with scattered delivery
// ═══════════════════════════════════════════════════════════

function computeDeliveryPenalty(products: DBProduct[]): number {
  const deliveryDays = products
    .map(p => p.estimated_delivery_days)
    .filter((d): d is number => d != null && d > 0);
  if (deliveryDays.length < 2) return 0;

  const maxDays = Math.max(...deliveryDays);
  const minDays = Math.min(...deliveryDays);
  const spread = maxDays - minDays;

  let penalty = 0;
  // Penalize if slowest item is very slow
  if (maxDays > 56) penalty += 2.0;  // > 8 weeks
  if (maxDays > 84) penalty += 3.0;  // > 12 weeks
  // Penalize if big gap between fastest and slowest
  if (spread > 42) penalty += 2.0;   // > 6 weeks gap
  if (spread > 70) penalty += 2.0;   // > 10 weeks gap

  return penalty;
}

// ═══════════════════════════════════════════════════════════
// Alternative selection — same concept theme, different seats
// ═══════════════════════════════════════════════════════════

function buildAlternative(
  mainBOM: BOMSlot[],
  concept: ConceptTemplate,
  params: ProjectParameters,
  allProducts: DBProduct[],
  climate: ClimateProfile,
  venueNeeds: VenueNeeds
): ConceptAlternative | undefined {
  const seatRoles: BOMSlotRole[] = ["chair", "armchair", "sofa", "sun_lounger", "bar_stool"];
  const mainSeatSlots = mainBOM.filter(s => seatRoles.includes(s.role));
  if (mainSeatSlots.length === 0) return undefined;

  const usedProductIds = new Set(mainBOM.map(s => s.product.id));

  // Find alternative seating — same use_case, different silhouette/seat_type
  const altCandidates = allProducts.filter(p => {
    if (usedProductIds.has(p.id)) return false;
    const role = inferBOMRole(p);
    if (!seatRoles.includes(role)) return false;
    const ptt: ProductTypeTags = p.product_type_tags || {};
    // Different silhouette from main
    const mainSilhouettes = mainSeatSlots
      .map(s => (s.product.product_type_tags as ProductTypeTags)?.silhouette)
      .filter(Boolean);
    if (ptt.silhouette && mainSilhouettes.includes(ptt.silhouette)) return false;
    // Same style family
    return p.style_tags.some(t => concept.styleBias.includes(t));
  });

  if (altCandidates.length === 0) return undefined;

  // Score alternatives
  const scoredAlts = altCandidates.map(p => ({
    p,
    score: scoreProduct(p, concept, params, climate, venueNeeds),
  })).sort((a, b) => b.score - a.score);

  const topAlt = scoredAlts[0];
  if (!topAlt || topAlt.score < 5) return undefined;

  // Build alternative BOM replacing seat slots
  const altBOM = mainBOM.map(slot => {
    if (!seatRoles.includes(slot.role)) return slot;
    // Replace with alternative product, keep same quantity
    return buildBOMSlot(
      topAlt.p,
      slot.role,
      slot.quantity,
      0.75,
      `Alternative: ${topAlt.p.name} — ${(topAlt.p.product_type_tags as ProductTypeTags)?.silhouette || "different style"}`
    );
  });

  const mainMin  = mainBOM.reduce((s, b) => s + (b.slotTotalMin ?? 0), 0);
  const altMin   = altBOM.reduce((s, b) => s + (b.slotTotalMin ?? 0), 0);
  const priceDelta = altMin - mainMin;

  const altSilhouette = (topAlt.p.product_type_tags as ProductTypeTags)?.silhouette;
  const altSeatType   = (topAlt.p.product_type_tags as ProductTypeTags)?.seat_type;

  return {
    label: `${topAlt.p.name}${altSilhouette ? ` — ${altSilhouette}` : ""}`,
    changedSlots: seatRoles.filter(r => mainBOM.some(s => s.role === r)),
    slots: altBOM,
    priceDelta,
    alternativeReason: `Same ${concept.titleTemplate} theme with ${altSeatType || altSilhouette || "different"} seating. ${priceDelta > 0 ? `+€${Math.round(priceDelta).toLocaleString("fr-FR")} vs main selection.` : priceDelta < 0 ? `-€${Math.round(Math.abs(priceDelta)).toLocaleString("fr-FR")} vs main selection.` : "Similar price range."}`,
  };
}

// ═══════════════════════════════════════════════════════════
// Reason generation
// ═══════════════════════════════════════════════════════════

/**
 * Generate a structured reason for product recommendation.
 * Returns a key + interpolation params for i18n-ready rendering.
 * The UI should call t(reason.key, reason.params) to display.
 * Fallback: the `text` field always contains a readable English string.
 */
export interface RecommendationReason {
  key: string;
  params: Record<string, string>;
  text: string; // English fallback
}

function generateReason(
  product: DBProduct,
  concept: ConceptTemplate,
  params: ProjectParameters,
  venueNeeds: VenueNeeds,
  climate: ClimateProfile
): string {
  const catNorm      = (product.category || "").toLowerCase();
  const matchedStyles = product.style_tags.filter(t => concept.styleBias.includes(t) || params.style.includes(t));
  const isMandatory   = venueNeeds.mandatory.some(m => catNorm.includes(m.toLowerCase()));
  const isClimate     = (climate.isCoastal && product.weather_resistant) || (climate.isHighUV && product.uv_resistant);
  const ptt: ProductTypeTags = product.product_type_tags || {};
  const style = matchedStyles[0] || "";
  const venue = params.establishmentType || "";
  const materials = product.material_tags.slice(0, 2).join(" & ");

  if (isMandatory && isClimate) return `reason:essential_climate|venue:${venue}`;
  if (isMandatory && style)     return `reason:essential_style|style:${style}|venue:${venue}`;
  if (isClimate && style)       return `reason:climate_style|style:${style}`;
  if (ptt.silhouette && style)  return `reason:silhouette_style|style:${style}|silhouette:${ptt.silhouette}|venue:${venue}`;
  if (style)                    return `reason:style_material|style:${style}|materials:${materials}`;
  if (product.is_chr_heavy_use) return `reason:professional_grade`;
  return `reason:complements_palette|theme:${concept.titleTemplate}`;
}

// ═══════════════════════════════════════════════════════════
// Layout requirement mapping (backward compat)
// ═══════════════════════════════════════════════════════════

function inferRequirementType(product: DBProduct): LayoutRequirementType {
  const cat = (product.category || "").toLowerCase().replace(/[_\s-]/g, "");
  const sub = (product.subcategory || "").toLowerCase().replace(/[_\s-]/g, "");
  // Armchairs map to "chair" requirement (unified seating slot)
  if (cat.includes("armchair") || sub.includes("armchair")) return "chair";
  if (cat.includes("chair")    || sub.includes("chair"))    return "chair";
  if (cat.includes("stool"))                                return "bar_stool";
  if (cat.includes("parasol"))                              return "parasol";
  if (cat.includes("lounger") || cat.includes("daybed"))    return "sun_lounger";
  if (cat.includes("sofa")    || cat.includes("lounge"))    return "sofa";
  if (cat.includes("table")) {
    const ptt: ProductTypeTags = product.product_type_tags || {};
    if (ptt.table_type === "base-only") return "table_base";
    if (ptt.table_type === "top-only")  return "tabletop";
    return "complete_table";
  }
  return "other";
}

function buildLayoutRequirements(layout: LayoutRecommendation): LayoutRequirement[] {
  const reqs: LayoutRequirement[] = [];

  // Seating: ONE chair requirement (not chair + armchair — the engine picks the right product)
  reqs.push({
    id: "seating-main",
    type: "chair",
    label: "Seating",
    requiredQuantity: Math.max(layout.chairCount, 1),
  });

  // Parasols: 1 per 4 seats
  reqs.push({
    id: "parasols-main",
    type: "parasol",
    label: "Parasol coverage",
    requiredQuantity: Math.max(1, Math.round(layout.totalSeats / 4)),
  });

  // Tables: ONE requirement per table group (complete_table preferred; base/top matched later if needed)
  layout.tableGroups.forEach((group, i) => {
    const suffix = `${group.tableFormat} (×${group.quantity})`;
    reqs.push({
      id: `table-group-${i}`,
      type: "complete_table",
      label: `Table ${suffix}`,
      requiredQuantity: group.quantity,
      tableFormat: group.tableFormat,
    });
  });

  return reqs;
}

function assignLayoutRequirements(recommended: RecommendedProduct[], products: DBProduct[], requirements: LayoutRequirement[]) {
  const byType = requirements.reduce<Record<string, LayoutRequirement[]>>((acc, r) => {
    (acc[r.type] = acc[r.type] || []).push(r);
    return acc;
  }, {});
  const cursors: Record<string, number> = {};

  for (const rec of recommended) {
    const product = products.find(p => p.id === rec.productId);
    if (!product) continue;
    const inferredType = inferRequirementType(product);
    const list = byType[inferredType] || [];
    const cursor = cursors[inferredType] || 0;
    const matched = list[cursor] || list[list.length - 1];
    if (matched) {
      rec.layoutRequirementType  = matched.type;
      rec.layoutRequirementLabel = matched.label;
      rec.layoutRequirementId    = matched.id;
      rec.suggestedQuantity      = matched.requiredQuantity;
      cursors[inferredType] = cursor + 1;
    }
  }
}

// ═══════════════════════════════════════════════════════════
// STEP 5: Main engine function
// ═══════════════════════════════════════════════════════════

export function generateProjectConcepts(
  input: string,
  products: DBProduct[],
  overrideParams?: Partial<ProjectParameters>
): {
  parameters: ProjectParameters;
  concepts:   ProjectConcept[];
} {
  let parameters = parseProjectRequest(input);
  if (overrideParams) parameters = { ...parameters, ...overrideParams };

  const climate    = inferClimateProfile(parameters);
  const rawVenueNeeds = getVenueNeeds(parameters.establishmentType);
  const venueNeeds = adjustVenueNeeds(rawVenueNeeds, parameters.selectedCategories);
  const filteredProducts = filterBySelectedCategories(products, parameters.selectedCategories);
  const layouts    = generateLayouts(parameters);
  const templates  = getConceptTemplates(parameters);

  const globalUsedArchetypes = new Set<string>();
  const globalUsedProducts   = new Set<string>();

  const concepts: ProjectConcept[] = templates.map((template, i) => {
    const layout = layouts[i] || layouts[0] || null;

    const { selected } = selectProductsForConcept(
      template, parameters, filteredProducts,
      globalUsedArchetypes, globalUsedProducts,
      climate, venueNeeds
    );

    selected.forEach(s => globalUsedProducts.add(s.product.id));

    // Build legacy RecommendedProduct[] for backward compat
    const recommended: RecommendedProduct[] = selected.map(({ product, percentile }) => ({
      productId:      product.id,
      relevanceScore: percentile,
      reason:         generateReason(product, template, parameters, venueNeeds, climate),
    }));

    // Assign layout requirements
    const requirements = layout ? buildLayoutRequirements(layout) : [];
    if (requirements.length > 0) {
      assignLayoutRequirements(recommended, products, requirements);
    }

    // Build BOM slots from selected products + layout quantities
    // FIX: Assign layout quantities to products with role-based dedup.
    // - Each layout requirement is assigned to at most ONE product (highest scored).
    // - Multiple table groups each get their own product if available.
    // - Extra products of the same role are excluded from BOM (available as alternatives).
    const usedRequirementIds = new Set<string>();
    const roleCursors: Record<string, number> = {};

    const bomSlots: BOMSlot[] = [];
    for (const { product, percentile } of selected) {
      const role = inferBOMRole(product);
      const reqType = inferRequirementType(product);
      const ptt: ProductTypeTags = product.product_type_tags || {};

      // Find the best matching requirement for this product
      let matchedReq: LayoutRequirement | undefined;

      // For tables, try to match by dimension_tag to the correct table group
      if (reqType === "complete_table" && ptt.dimension_tag) {
        matchedReq = requirements.find(
          r => r.type === reqType && !usedRequirementIds.has(r.id)
            && r.tableFormat && ptt.dimension_tag?.includes(r.tableFormat)
        );
      }

      // Fallback: first unused requirement of this type
      if (!matchedReq) {
        const cursor = roleCursors[reqType] || 0;
        const candidates = requirements.filter(r => r.type === reqType && !usedRequirementIds.has(r.id));
        matchedReq = candidates[0];
        roleCursors[reqType] = cursor + 1;
      }

      // Skip product if no requirement slot available (duplicate role)
      if (!matchedReq) continue;

      usedRequirementIds.add(matchedReq.id);
      const qty = matchedReq.requiredQuantity;

      bomSlots.push(buildBOMSlot(
        product, role, qty, percentile,
        generateReason(product, template, parameters, venueNeeds, climate),
        { id: matchedReq.id, type: matchedReq.type, label: matchedReq.label }
      ));
    }

    // Add selected products that don't have a layout requirement type (accessories, etc.)
    // Products that HAVE a requirement type but didn't get a slot are intentionally excluded
    // (they are duplicates of a role already filled by a higher-scored product).
    const typesWithRequirements = new Set(requirements.map(r => r.type));
    for (const { product, percentile } of selected) {
      const alreadyInBOM = bomSlots.some(s => s.product.id === product.id);
      if (alreadyInBOM) continue;
      const reqType = inferRequirementType(product);
      // Only add if this product type has NO layout requirement at all
      if (typesWithRequirements.has(reqType)) continue;
      const role = inferBOMRole(product);
      bomSlots.push(buildBOMSlot(
        product, role, 1, percentile,
        generateReason(product, template, parameters, venueNeeds, climate)
      ));
    }

    const bom = buildConceptBOM(bomSlots, venueNeeds);

    // Build alternative
    const alternative = buildAlternative(bomSlots, template, parameters, filteredProducts, climate, venueNeeds);

    // Concept-level quality metrics
    const cohesionScore = computeCohesionScore(selected.map(s => s.product));
    const deliveryPenalty = computeDeliveryPenalty(selected.map(s => s.product));
    const deliveryDays = selected
      .map(s => s.product.estimated_delivery_days)
      .filter((d): d is number => d != null && d > 0);
    const maxDeliveryDays = deliveryDays.length > 0 ? Math.max(...deliveryDays) : null;

    // FIX A — Derive palette from real product colors
    const { hex: derivedHex, names: derivedNames } = deriveConceptPalette(
      selected.map(s => s.product),
      template.colorHex,
      template.colorNames
    );

    return {
      id:           `concept-${i + 1}`,
      title:        template.titleTemplate,
      description:  template.descTemplate,
      colorPalette: derivedHex,
      colorNames:   derivedNames,
      moodKeywords: template.mood,
      products:     recommended,
      layout:       layout ? { ...layout, requirements } : layout,
      bom,
      alternative,
      priceRange: {
        min: bom.indicativeTotalMin,
        max: bom.indicativeTotalMax,
      },
      cohesionScore,
      deliveryPenalty,
      maxDeliveryDays,
    };
  });

  return { parameters, concepts };
}

// Re-export for external use
export { inferClimateProfile, getVenueNeeds, budgetPenalty, capacityBonus, climateBonus };
