import {
  ProjectParameters,
  ProjectConcept,
  RecommendedProduct,
  DiscoveryQuestion,
  ProjectSummary,
  LayoutRecommendation,
  LayoutRequirement,
  LayoutRequirementType,
} from "./types";
import { generateLayouts } from "./layoutEngine";
import type { DBProduct } from "@/lib/products";

// ═══════════════════════════════════════════════════════════
// EXTENDED TAXONOMY
// ═══════════════════════════════════════════════════════════

const ESTABLISHMENT_KEYWORDS: Record<string, string[]> = {
  restaurant: ["restaurant", "dining", "bistro", "brasserie", "trattoria", "cafe", "eatery", "pizzeria", "gastro", "café"],
  hotel: ["hotel", "resort", "boutique hotel", "lodge", "inn", "spa", "wellness"],
  rooftop: ["rooftop", "sky bar", "sky lounge", "rooftop bar", "roof terrace"],
  "beach-club": ["beach", "beach club", "beachfront", "seaside", "coastal", "plage"],
  camping: ["camping", "glamping", "campsite", "caravan", "mobile home"],
  bar: ["bar", "lounge bar", "cocktail", "pub", "wine bar", "tapas"],
  event: ["event", "banquet", "wedding", "catering", "conference"],
  pool: ["pool", "poolside", "piscine", "pool deck"],
};

const STYLE_KEYWORDS: Record<string, string[]> = {
  mediterranean: ["mediterranean", "riviera", "greek", "italian", "provence", "south of france", "côte d'azur", "ibiza", "med"],
  modern: ["modern", "contemporary", "sleek", "clean", "design"],
  minimal: ["minimal", "minimalist", "less is more", "pared-back"],
  scandinavian: ["scandinavian", "nordic", "hygge", "scandi", "danish"],
  industrial: ["industrial", "urban", "loft", "raw", "factory"],
  bohemian: ["bohemian", "boho", "eclectic", "free-spirit"],
  natural: ["natural", "organic", "earthy", "rustic", "raw wood", "nature"],
  luxury: ["luxury", "premium", "high-end", "exclusive", "upscale", "chic", "5-star"],
  tropical: ["tropical", "exotic", "palm", "jungle", "caribbean", "bali"],
  classic: ["classic", "timeless", "traditional", "elegant", "french"],
  coastal: ["coastal", "nautical", "maritime", "harbor", "port"],
  bistro: ["bistro", "parisian", "café", "french bistro", "terrasse"],
  lounge: ["lounge", "chill-out", "daybed", "relax zone"],
  vintage: ["vintage", "retro", "mid-century", "antique"],
  event: ["event", "banquet", "reception", "wedding", "gala"],
};

const AMBIENCE_KEYWORDS: Record<string, string[]> = {
  warm: ["warm", "cozy", "inviting", "sun", "golden", "chaleureux"],
  convivial: ["convivial", "social", "family", "sharing", "communal"],
  elegant: ["elegant", "sophisticated", "refined", "upscale", "chic"],
  festive: ["festive", "party", "celebration", "vibrant", "energetic", "buzzing"],
  relaxed: ["relaxed", "casual", "laid-back", "chill", "easy", "décontracté"],
  refined: ["refined", "polished", "curated", "considered"],
  authentic: ["authentic", "genuine", "artisan", "handmade", "local"],
  bright: ["bright", "airy", "luminous", "daytime", "brunch", "morning"],
  intimate: ["intimate", "romantic", "quiet", "private", "cosy"],
  "design-forward": ["design-forward", "avant-garde", "bold", "statement", "architectural"],
  evening: ["evening", "night", "sunset", "cocktail hour", "after-dark"],
};

const COLOR_KEYWORDS: Record<string, string[]> = {
  natural: ["natural", "beige", "sand", "cream", "earth", "terre", "nude", "travertine"],
  white: ["white", "bright", "light", "airy", "blanc", "pure"],
  black: ["black", "dark", "noir", "charcoal", "anthracite"],
  warm: ["warm", "terracotta", "rust", "amber", "honey", "ochre", "cognac", "caramel"],
  cool: ["cool", "blue", "gray", "silver", "slate", "steel"],
  green: ["green", "olive", "sage", "forest", "verdure", "vert", "khaki"],
  wood: ["wood", "teak", "oak", "walnut", "timber", "bois"],
};

const MATERIAL_KEYWORDS: Record<string, string[]> = {
  aluminium: ["aluminum", "aluminium", "powder-coated"],
  rope: ["rope", "cord", "woven rope", "macramé"],
  polypropylene: ["polypropylene", "plastic", "pp"],
  resin: ["resin", "composite", "synthetic"],
  "synthetic-rattan": ["rattan", "wicker", "woven", "cane", "osier", "synthetic rattan"],
  textilene: ["textilene", "batyline", "mesh", "sling"],
  wood: ["wood", "teak", "timber", "bois", "oak", "walnut", "acacia"],
  steel: ["steel", "iron", "metal", "wrought iron"],
  hpl: ["hpl", "compact laminate", "high pressure laminate"],
  "marble-effect": ["marble", "stone", "granite", "concrete", "terrazzo", "marble effect"],
  fabric: ["fabric", "textile", "cushion", "upholstered", "sunbrella"],
};

const USE_CASE_KEYWORDS: Record<string, string[]> = {
  "restaurant-terrace": ["restaurant terrace", "terrasse restaurant", "outdoor dining"],
  "hotel-patio": ["hotel patio", "hotel garden", "hotel terrace"],
  rooftop: ["rooftop", "sky bar", "roof terrace"],
  poolside: ["poolside", "pool deck", "piscine"],
  "beach-club": ["beach club", "beach bar", "plage"],
  "event-dining": ["event", "banquet", "wedding", "reception"],
  "cafe-frontage": ["café", "cafe frontage", "sidewalk café", "terrasse café"],
  "high-volume-brasserie": ["brasserie", "high volume", "high traffic", "busy"],
  "lounge-area": ["lounge", "chill-out", "relaxation", "daybed area"],
};

const BUDGET_KEYWORDS: Record<string, string[]> = {
  economy: ["budget", "affordable", "economic", "cheap", "low cost"],
  mid: ["mid-range", "moderate", "reasonable", "balanced"],
  premium: ["premium", "luxury", "high-end", "no budget", "invest", "quality"],
};

const TIMELINE_KEYWORDS: Record<string, string[]> = {
  urgent: ["urgent", "asap", "rush", "this week", "immediately"],
  "1-month": ["next month", "1 month", "4 weeks", "30 days"],
  "2-3-months": ["2 months", "3 months", "spring", "summer", "season"],
  flexible: ["no rush", "flexible", "whenever", "planning"],
};

// ═══════════════════════════════════════════════════════════
// STEP 1: Parse user input
// ═══════════════════════════════════════════════════════════

function matchKeywords(input: string, dict: Record<string, string[]>): string[] {
  const lower = input.toLowerCase();
  const matches: string[] = [];
  for (const [key, synonyms] of Object.entries(dict)) {
    if (synonyms.some((s) => lower.includes(s))) {
      matches.push(key);
    }
  }
  return matches;
}

function extractCapacity(input: string): number | null {
  const match = input.match(/(\d+)\s*(?:seats?|places?|covers?|pax|pers|couverts?|m²|sqm|square)/i);
  if (match) return parseInt(match[1]);
  const standalone = input.match(/(\d{2,3})/);
  if (standalone) return parseInt(standalone[1]);
  return null;
}

function extractZone(input: string): string {
  const zones: Record<string, string[]> = {
    terrace: ["terrace", "terrasse", "patio"],
    garden: ["garden", "jardin", "courtyard", "cour"],
    pool: ["pool", "piscine", "pool deck"],
    rooftop: ["rooftop", "roof", "toit"],
    lobby: ["lobby", "hall", "entrance"],
    deck: ["deck", "boardwalk", "plage"],
    balcony: ["balcony", "balcon", "loggia"],
    interior: ["interior", "indoor", "inside", "intérieur"],
    lounge: ["lounge", "chill", "relax zone"],
  };
  const lower = input.toLowerCase();
  for (const [zone, keywords] of Object.entries(zones)) {
    if (keywords.some((k) => lower.includes(k))) return zone;
  }
  return "outdoor";
}

function detectIsOutdoor(input: string): boolean {
  const lower = input.toLowerCase();
  if (["indoor", "interior", "inside", "intérieur"].some((w) => lower.includes(w))) return false;
  return true;
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
    colorPalette: matchKeywords(input, COLOR_KEYWORDS),
    materialPreferences: matchKeywords(input, MATERIAL_KEYWORDS),
    technicalConstraints: [],
    isOutdoor: detectIsOutdoor(input),
    budgetLevel: matchKeywords(input, BUDGET_KEYWORDS)[0] || "",
    timeline: matchKeywords(input, TIMELINE_KEYWORDS)[0] || "",
    terraceSurfaceM2: null,
    terraceLength: null,
    terraceWidth: null,
    tableMix: [],
  };
}

// ═══════════════════════════════════════════════════════════
// STEP 2: Discovery — detect missing info, generate questions
// ═══════════════════════════════════════════════════════════

export function detectMissingFields(params: ProjectParameters): DiscoveryQuestion[] {
  const questions: DiscoveryQuestion[] = [];

  if (params.style.length === 0) {
    questions.push({
      id: "style",
      question: "What style defines your terrace?",
      options: ["Bistro", "Mediterranean", "Natural / Wood", "Modern", "Lounge", "Coastal"],
      field: "style",
      priority: 10,
    });
  }

  if (params.materialPreferences.length === 0) {
    questions.push({
      id: "material",
      question: "What type of chair are you looking for?",
      options: ["Professional polypropylene", "Aluminium + rope", "Bamboo bistro", "Aluminium + textilene", "Wood"],
      field: "materialPreferences",
      priority: 9,
    });
  }

  // Seating layout distribution — always ask if not set
  if (!params.seatingLayout) {
    questions.push({
      id: "seatingLayout",
      question: "How do you want to organize your seating layout?",
      options: [
        "Mostly 2-seater tables",
        "Balanced mix of 2 and 4-seater tables",
        "Mostly 4-seater tables",
        "Flexible modular layout",
        "Group dining friendly",
        "Custom mix",
      ],
      field: "seatingLayout",
      priority: 8.5,
    });
  }

  // Layout priority — always ask if not set
  if (!params.layoutPriority) {
    questions.push({
      id: "layoutPriority",
      question: "What matters most for your layout?",
      options: [
        "Maximize seating capacity",
        "Balanced comfort and capacity",
        "Spacious premium layout",
        "Flexible tables for groups",
        "Mostly couple seating",
        "Mostly group seating",
      ],
      field: "layoutPriority",
      priority: 8,
    });
  }

  if (!params.budgetLevel) {
    questions.push({
      id: "budget",
      question: "What is your budget per seat?",
      options: ["€50–80", "€80–120", "€120–180", "€180+"],
      field: "budgetLevel",
      priority: 7.5,
    });
  }

  if (params.colorPalette.length === 0) {
    questions.push({
      id: "palette",
      question: "Which color palette do you prefer?",
      options: ["Terracotta / natural", "Wood / beige", "Black / anthracite", "Blue / white", "Olive green"],
      field: "colorPalette",
      priority: 7,
    });
  }

  questions.sort((a, b) => b.priority - a.priority);
  return questions;
}

export function isRequestComplete(params: ProjectParameters): boolean {
  // Count how many "design" attributes are still missing
  const missingDesignAttrs = [
    params.style.length === 0,
    params.ambience.length === 0,
    params.colorPalette.length === 0,
    params.materialPreferences.length === 0,
    !params.budgetLevel,
  ].filter(Boolean).length;

  // If 3 or more design attributes are missing, the brief is incomplete
  return missingDesignAttrs < 3;
}

export function applyAnswer(
  params: ProjectParameters,
  questionId: string,
  answer: string
): ProjectParameters {
  const updated = { ...params };
  const lower = answer.toLowerCase();

  switch (questionId) {
    case "establishment":
      updated.establishmentType = matchKeywords(lower, ESTABLISHMENT_KEYWORDS)[0] || lower.split(" ")[0].toLowerCase();
      break;
    case "zone":
      updated.projectZone = extractZone(lower) !== "outdoor" ? extractZone(lower) : lower.split(" ")[0].toLowerCase();
      break;
    case "capacity": {
      const num = answer.match(/(\d+)/);
      if (num) updated.seatingCapacity = parseInt(num[1]);
      else if (lower.includes("under 30")) updated.seatingCapacity = 25;
      else if (lower.includes("30")) updated.seatingCapacity = 45;
      else if (lower.includes("60")) updated.seatingCapacity = 90;
      else if (lower.includes("120")) updated.seatingCapacity = 150;
      break;
    }
    case "style":
      updated.style = [...updated.style, ...matchKeywords(lower, STYLE_KEYWORDS)];
      if (updated.style.length === 0) updated.style = [lower.split("/")[0].trim().toLowerCase()];
      break;
    case "ambience":
      updated.ambience = [...updated.ambience, ...matchKeywords(lower, AMBIENCE_KEYWORDS)];
      if (updated.ambience.length === 0) updated.ambience = [lower.split("&")[0].trim().toLowerCase()];
      break;
    case "palette":
      updated.colorPalette = [...updated.colorPalette, ...matchKeywords(lower, COLOR_KEYWORDS)];
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
        "mostly 2": "mostly-2",
        "balanced mix": "balanced-2-4",
        "mostly 4": "mostly-4",
        "flexible modular": "modular",
        "group dining": "group",
        "custom mix": "custom",
      };
      for (const [key, val] of Object.entries(layoutMap)) {
        if (lower.includes(key)) { updated.seatingLayout = val; break; }
      }
      if (!updated.seatingLayout) updated.seatingLayout = "balanced-2-4";
      break;
    }
    case "layoutPriority": {
      const priorityMap: Record<string, string> = {
        "maximize": "max-capacity",
        "balanced comfort": "balanced",
        "spacious": "spacious",
        "flexible": "flexible-groups",
        "couple": "couples",
        "group": "groups",
      };
      for (const [key, val] of Object.entries(priorityMap)) {
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
    "mostly-2": "Mostly 2-seater tables",
    "balanced-2-4": "Balanced mix of 2 & 4-seaters",
    "mostly-4": "Mostly 4-seater tables",
    modular: "Flexible modular layout",
    group: "Group dining friendly",
    custom: "Custom mix",
  };
  const priorityLabels: Record<string, string> = {
    "max-capacity": "Maximize capacity",
    balanced: "Balanced comfort & capacity",
    spacious: "Spacious premium layout",
    "flexible-groups": "Flexible for groups",
    couples: "Mostly couple seating",
    groups: "Mostly group seating",
  };
  return {
    establishment: params.establishmentType || "hospitality space",
    zone: params.projectZone || "outdoor",
    style: params.style.join(", ") || "to be defined",
    ambience: params.ambience.join(", ") || "to be defined",
    capacity: params.seatingCapacity ? `${params.seatingCapacity} seats` : "to be defined",
    layout: layoutLabels[params.seatingLayout] || "to be defined",
    layoutPriority: priorityLabels[params.layoutPriority] || "to be defined",
    palette: params.colorPalette.join(", ") || "open",
    materials: params.materialPreferences.join(", ") || "open",
    constraints: [
      params.isOutdoor ? "outdoor use" : "indoor use",
      ...(params.technicalConstraints || []),
    ].join(", "),
  };
}

// ═══════════════════════════════════════════════════════════
// STEP 3: Concept Templates
// ═══════════════════════════════════════════════════════════

interface ConceptTemplate {
  titleTemplate: string;
  descTemplate: string;
  styleBias: string[];
  ambienceBias: string[];
  colorHex: string[];
  colorNames: string[];
  mood: string[];
}

const CONCEPT_LIBRARY: Record<string, ConceptTemplate[]> = {
  mediterranean: [
    { titleTemplate: "Riviera Sun", descTemplate: "A sun-drenched Mediterranean terrace with natural textures and warm earthy tones. Woven materials meet teak wood for timeless coastal elegance.", styleBias: ["mediterranean", "coastal", "natural"], ambienceBias: ["warm", "relaxed", "convivial"], colorHex: ["#D4A574", "#F5E6D3", "#8B7355", "#E8DDD3", "#C4956A"], colorNames: ["Terracotta", "Sand", "Driftwood", "Linen", "Amber"], mood: ["sun-kissed", "artisan", "al-fresco"] },
    { titleTemplate: "Aegean Breeze", descTemplate: "Inspired by Greek island terraces — whitewashed simplicity balanced with organic textures and blue accents for a fresh coastal feel.", styleBias: ["mediterranean", "minimal", "coastal"], ambienceBias: ["relaxed", "intimate", "bright"], colorHex: ["#FFFFFF", "#4A90A4", "#D4C5A9", "#E8E3DA", "#8AAFBF"], colorNames: ["White", "Aegean Blue", "Wheat", "Chalk", "Sea Mist"], mood: ["fresh", "island", "breezy"] },
    { titleTemplate: "Provençal Garden", descTemplate: "Rustic charm meets refined comfort. Aged materials, lavender tones and natural textiles create an intimate garden dining atmosphere.", styleBias: ["natural", "classic", "bistro"], ambienceBias: ["intimate", "warm", "authentic"], colorHex: ["#9B8B7A", "#D4C9B8", "#7B6B8A", "#E8DDD3", "#A69B8E"], colorNames: ["Stone", "Flax", "Lavender", "Cream", "Pebble"], mood: ["rustic", "garden", "provençal"] },
  ],
  modern: [
    { titleTemplate: "Urban Edge", descTemplate: "Clean-lined contemporary design with monochrome palette and metallic accents. Architectural furniture that makes a statement.", styleBias: ["modern", "industrial", "minimal"], ambienceBias: ["elegant", "design-forward", "evening"], colorHex: ["#1A1A1A", "#FFFFFF", "#888888", "#C0C0C0", "#333333"], colorNames: ["Onyx", "Pure White", "Concrete", "Silver", "Graphite"], mood: ["sleek", "urban", "architectural"] },
    { titleTemplate: "Soft Modern", descTemplate: "Warm minimalism with curved forms and muted earth tones. Natural materials elevated through contemporary design language.", styleBias: ["modern", "minimal", "natural"], ambienceBias: ["refined", "relaxed", "elegant"], colorHex: ["#E8DDD3", "#D4C5A9", "#8B7355", "#F5F0EB", "#A69B8E"], colorNames: ["Oat", "Wheat", "Walnut", "Mist", "Mushroom"], mood: ["calm", "refined", "organic-modern"] },
    { titleTemplate: "Noir Luxe", descTemplate: "Dark sophistication with premium materials. Marble, black iron and deep tones create an evening-first atmosphere of quiet luxury.", styleBias: ["luxury", "modern", "minimal"], ambienceBias: ["elegant", "evening", "refined"], colorHex: ["#1A1A1A", "#8B7355", "#D4A574", "#2D2D2D", "#C4956A"], colorNames: ["Black", "Bronze", "Copper", "Charcoal", "Gold"], mood: ["dramatic", "luxurious", "evening"] },
  ],
  minimal: [
    { titleTemplate: "Pared Back", descTemplate: "Essential forms and honest materials. Every piece earns its place through function and beauty in equal measure.", styleBias: ["minimal", "modern", "natural"], ambienceBias: ["refined", "bright", "relaxed"], colorHex: ["#F5F0EB", "#E8DDD3", "#D4C9B8", "#C4B8A8", "#8B7355"], colorNames: ["Snow", "Linen", "Oat", "Pebble", "Walnut"], mood: ["essential", "considered", "quiet"] },
    { titleTemplate: "White Studio", descTemplate: "Monochrome clarity with subtle texture variations. A gallery-like backdrop where products and people become the focal point.", styleBias: ["minimal", "modern", "coastal"], ambienceBias: ["bright", "elegant", "design-forward"], colorHex: ["#FFFFFF", "#F5F0EB", "#E8E3DA", "#D4D0CB", "#A69B8E"], colorNames: ["White", "Snow", "Chalk", "Dove", "Stone"], mood: ["gallery", "pure", "luminous"] },
  ],
  natural: [
    { titleTemplate: "Forest Lodge", descTemplate: "Organic textures and forest-inspired palette. Teak, rattan and linen combine for a warm, grounded outdoor retreat.", styleBias: ["natural", "scandinavian", "bohemian"], ambienceBias: ["warm", "relaxed", "intimate"], colorHex: ["#6B7B5E", "#D4C5A9", "#8B7355", "#E8DDD3", "#A69B8E"], colorNames: ["Sage", "Flax", "Walnut", "Linen", "Pebble"], mood: ["earthy", "grounded", "retreat"] },
    { titleTemplate: "Coastal Natural", descTemplate: "Beach-washed textures with natural fiber seating and bleached wood. Effortless outdoor living inspired by seaside simplicity.", styleBias: ["natural", "coastal", "bohemian"], ambienceBias: ["relaxed", "bright", "authentic"], colorHex: ["#F5E6D3", "#D4C9B8", "#E8DDD3", "#B8A898", "#C4B8A8"], colorNames: ["Sand", "Dune", "Shell", "Driftwood", "Sea Salt"], mood: ["breezy", "barefoot", "organic"] },
    { titleTemplate: "Earth & Craft", descTemplate: "Artisan-crafted pieces with raw textures. Hand-woven details and honest materials for spaces that feel genuinely welcoming.", styleBias: ["natural", "bohemian", "vintage"], ambienceBias: ["warm", "convivial", "authentic"], colorHex: ["#C4956A", "#8B7355", "#D4C5A9", "#E8DDD3", "#A0856E"], colorNames: ["Terracotta", "Teak", "Hemp", "Cream", "Clay"], mood: ["handmade", "authentic", "textured"] },
  ],
  scandinavian: [
    { titleTemplate: "Nordic Calm", descTemplate: "Restrained Scandinavian design with light woods, clean forms and soft neutral textiles. Quiet luxury for considered outdoor spaces.", styleBias: ["scandinavian", "minimal", "modern"], ambienceBias: ["refined", "intimate", "bright"], colorHex: ["#F5F0EB", "#D4C9B8", "#8B7355", "#E8E3DA", "#BFBAB3"], colorNames: ["Snow", "Oat", "Oak", "Frost", "Stone"], mood: ["serene", "balanced", "light"] },
    { titleTemplate: "Scandi Outdoor", descTemplate: "Functional Nordic design adapted for hospitality outdoors. Light teak and performance fabrics in a restrained palette.", styleBias: ["scandinavian", "natural", "modern"], ambienceBias: ["relaxed", "bright", "convivial"], colorHex: ["#E8DDD3", "#C4B8A8", "#6B7B5E", "#F5F0EB", "#A69B8E"], colorNames: ["Birch", "Linen", "Moss", "Cloud", "Pebble"], mood: ["hygge", "outdoor", "natural-light"] },
  ],
  luxury: [
    { titleTemplate: "Grand Terrace", descTemplate: "Statement pieces and premium materials define this luxury outdoor concept. Marble, brass and sculptural forms for discerning venues.", styleBias: ["luxury", "modern", "classic"], ambienceBias: ["elegant", "refined", "evening"], colorHex: ["#1A1A1A", "#D4A574", "#FFFFFF", "#8B7355", "#C4956A"], colorNames: ["Black", "Brass", "Marble", "Bronze", "Gold"], mood: ["opulent", "dramatic", "exclusive"] },
    { titleTemplate: "Quiet Luxury", descTemplate: "Understated premium design. Rich materials, perfect proportions and a muted palette that speaks to quality without ostentation.", styleBias: ["luxury", "minimal", "modern"], ambienceBias: ["refined", "intimate", "elegant"], colorHex: ["#E8DDD3", "#8B7355", "#D4C5A9", "#A69B8E", "#C4B8A8"], colorNames: ["Cream", "Espresso", "Cashmere", "Taupe", "Sand"], mood: ["refined", "subtle", "exclusive"] },
  ],
  industrial: [
    { titleTemplate: "Factory Terrace", descTemplate: "Raw metal, concrete tones and stackable functionality. Industrial design optimized for high-volume hospitality with character.", styleBias: ["industrial", "modern", "minimal"], ambienceBias: ["festive", "convivial", "design-forward"], colorHex: ["#888888", "#1A1A1A", "#C0C0C0", "#D4C9B8", "#666666"], colorNames: ["Steel", "Iron", "Zinc", "Concrete", "Smoke"], mood: ["raw", "urban", "functional"] },
    { titleTemplate: "Industrial Warm", descTemplate: "Industrial bones with warm wood accents. The contrast of metal and natural materials creates spaces with soul and practicality.", styleBias: ["industrial", "natural", "modern"], ambienceBias: ["warm", "convivial", "authentic"], colorHex: ["#333333", "#8B7355", "#C0C0C0", "#D4C5A9", "#A0856E"], colorNames: ["Charcoal", "Oak", "Aluminium", "Sand", "Rust"], mood: ["hybrid", "character", "grounded"] },
  ],
  tropical: [
    { titleTemplate: "Island Resort", descTemplate: "Lush tropical vibes with woven rattan, teak and resort-style lounging. Designed for daytime relaxation and sunset cocktails.", styleBias: ["tropical", "natural", "bohemian"], ambienceBias: ["relaxed", "festive", "warm"], colorHex: ["#6B7B5E", "#D4A574", "#F5E6D3", "#8B7355", "#A0856E"], colorNames: ["Palm", "Bamboo", "Coconut", "Teak", "Cinnamon"], mood: ["exotic", "resort", "lush"] },
    { titleTemplate: "Tropical Chic", descTemplate: "Elevated tropical design blending exotic textures with refined forms. Resort luxury meets everyday hospitality.", styleBias: ["tropical", "luxury", "modern"], ambienceBias: ["elegant", "relaxed", "refined"], colorHex: ["#1A1A1A", "#6B7B5E", "#D4C5A9", "#F5E6D3", "#C4956A"], colorNames: ["Black", "Palm", "Sand", "Cream", "Gold"], mood: ["sophisticated", "resort", "tropical-luxe"] },
  ],
  coastal: [
    { titleTemplate: "Harbor View", descTemplate: "Maritime elegance with weathered textures, nautical blues and durable materials. Designed for port-side dining and seaside venues.", styleBias: ["coastal", "classic", "natural"], ambienceBias: ["relaxed", "elegant", "bright"], colorHex: ["#2C5F7C", "#F5E6D3", "#FFFFFF", "#8B7355", "#A8C5D6"], colorNames: ["Navy", "Sand", "White", "Rope", "Sky"], mood: ["maritime", "fresh", "harbour"] },
  ],
  classic: [
    { titleTemplate: "Belle Époque", descTemplate: "Timeless European terrace design with elegant proportions and quality materials. Classic bistro charm for established venues.", styleBias: ["classic", "bistro", "luxury"], ambienceBias: ["elegant", "warm", "intimate"], colorHex: ["#8B7355", "#E8DDD3", "#333333", "#D4C5A9", "#C4956A"], colorNames: ["Bronze", "Cream", "Iron", "Linen", "Gold"], mood: ["timeless", "parisian", "elegant"] },
  ],
  bistro: [
    { titleTemplate: "Café Parisien", descTemplate: "The quintessential French bistro terrace — stackable chairs, marble-effect tables and a palette of heritage colors.", styleBias: ["bistro", "classic", "industrial"], ambienceBias: ["convivial", "warm", "authentic"], colorHex: ["#333333", "#E8DDD3", "#8B7355", "#C4956A", "#A69B8E"], colorNames: ["Iron", "Cream", "Walnut", "Copper", "Stone"], mood: ["parisian", "bustling", "terrasse"] },
  ],
  lounge: [
    { titleTemplate: "Sunset Lounge", descTemplate: "Deep seating, low tables and a palette designed for lingering. Created for venues where guests stay, sip and relax.", styleBias: ["lounge", "modern", "luxury"], ambienceBias: ["relaxed", "intimate", "evening"], colorHex: ["#D4A574", "#1A1A1A", "#E8DDD3", "#8B7355", "#C4956A"], colorNames: ["Amber", "Black", "Linen", "Bronze", "Gold"], mood: ["sunset", "lingering", "chill"] },
  ],
  vintage: [
    { titleTemplate: "Retro Terrace", descTemplate: "Mid-century charm with a contemporary edge. Vintage silhouettes in modern materials create character-driven spaces.", styleBias: ["vintage", "classic", "bohemian"], ambienceBias: ["authentic", "warm", "convivial"], colorHex: ["#C4956A", "#6B7B5E", "#E8DDD3", "#8B7355", "#D4C5A9"], colorNames: ["Amber", "Olive", "Cream", "Teak", "Linen"], mood: ["retro", "character", "soulful"] },
  ],
  event: [
    { titleTemplate: "Grand Reception", descTemplate: "Modular and elegant furniture for events and receptions. Designed for flexibility, volume and visual impact.", styleBias: ["event", "modern", "classic"], ambienceBias: ["festive", "elegant", "convivial"], colorHex: ["#FFFFFF", "#C0C0C0", "#1A1A1A", "#D4C5A9", "#C4956A"], colorNames: ["White", "Silver", "Black", "Linen", "Gold"], mood: ["celebration", "formal", "versatile"] },
  ],
};

// Establishment → ambience affinity map
const ESTABLISHMENT_AMBIENCE_AFFINITY: Record<string, string[]> = {
  restaurant: ["convivial", "warm", "authentic", "bright"],
  hotel: ["elegant", "refined", "relaxed", "intimate"],
  rooftop: ["evening", "design-forward", "festive", "elegant"],
  "beach-club": ["relaxed", "festive", "bright", "warm"],
  bar: ["evening", "intimate", "festive", "design-forward"],
  camping: ["relaxed", "authentic", "warm", "convivial"],
  event: ["festive", "elegant", "convivial", "refined"],
  pool: ["relaxed", "bright", "warm", "refined"],
};

function getConceptTemplates(params: ProjectParameters): ConceptTemplate[] {
  const allTemplates: ConceptTemplate[] = [];
  for (const style of params.style) {
    const templates = CONCEPT_LIBRARY[style];
    if (templates) allTemplates.push(...templates);
  }
  if (allTemplates.length === 0) {
    allTemplates.push(...(CONCEPT_LIBRARY["modern"] || []));
  }

  const estAmbiences = ESTABLISHMENT_AMBIENCE_AFFINITY[params.establishmentType] || [];

  const scored = allTemplates.map((t) => {
    let score = 0;
    for (const amb of params.ambience) {
      if (t.ambienceBias.includes(amb)) score += 2;
    }
    for (const col of params.colorPalette) {
      if (t.colorNames.some((cn) => cn.toLowerCase().includes(col))) score += 1;
    }
    for (const amb of estAmbiences) {
      if (t.ambienceBias.includes(amb)) score += 1.5;
    }
    return { template: t, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const selected: ConceptTemplate[] = [];
  const usedTitles = new Set<string>();
  for (const { template } of scored) {
    if (!usedTitles.has(template.titleTemplate) && selected.length < 3) {
      selected.push(template);
      usedTitles.add(template.titleTemplate);
    }
  }

  if (selected.length < 3) {
    const otherStyles = Object.keys(CONCEPT_LIBRARY).filter((s) => !params.style.includes(s));
    for (const style of otherStyles) {
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
// STEP 4: Weighted scoring & product recommendation
// ═══════════════════════════════════════════════════════════

const WEIGHTS = {
  styleMatch: 4.0,
  useCaseMatch: 3.5,
  ambienceMatch: 2.5,
  paletteMatch: 3.5,
  materialMatch: 2.0,
  technicalMatch: 2.0,
  popularityScore: 3.0,
  adminPriorityScore: 2.0,
  chrBonus: 1.5,
  availabilityBonus: 1.5,
  complementarityBonus: 2.0,
  sameFamilyDuplicationPenalty: -1.5,
};

function scoreProduct(
  product: DBProduct,
  concept: ConceptTemplate,
  params: ProjectParameters
): number {
  let score = 0;

  // Style match (strongest signal)
  for (const tag of product.style_tags) {
    if (concept.styleBias.includes(tag)) score += WEIGHTS.styleMatch;
    if (params.style.includes(tag)) score += WEIGHTS.styleMatch * 0.75;
  }

  // Use-case match
  for (const tag of product.use_case_tags) {
    if (tag.includes(params.establishmentType)) score += WEIGHTS.useCaseMatch;
    if (tag.includes(params.projectZone)) score += WEIGHTS.useCaseMatch * 0.7;
  }

  // Ambience match
  for (const tag of product.ambience_tags) {
    if (concept.ambienceBias.includes(tag)) score += WEIGHTS.ambienceMatch;
    if (params.ambience.includes(tag)) score += WEIGHTS.ambienceMatch * 0.6;
  }

  // Palette match
  for (const tag of product.palette_tags) {
    if (params.colorPalette.includes(tag)) score += WEIGHTS.paletteMatch;
  }

  // Material match
  for (const tag of product.material_tags) {
    for (const pref of params.materialPreferences) {
      if (tag.includes(pref) || pref.includes(tag)) score += WEIGHTS.materialMatch;
    }
  }

  // Technical match (outdoor, stackable, etc.)
  if (params.isOutdoor && product.is_outdoor) score += WEIGHTS.technicalMatch;
  if (product.is_stackable && params.seatingCapacity && params.seatingCapacity > 60) {
    score += WEIGHTS.technicalMatch * 0.5; // stackable bonus for large venues
  }

  // Popularity (high-demand products stay visible)
  score += product.popularity_score * WEIGHTS.popularityScore;

  // Admin priority
  score += product.priority_score * WEIGHTS.adminPriorityScore;

  // CHR heavy-use bonus
  if (product.is_chr_heavy_use) score += WEIGHTS.chrBonus;

  // Availability bonus
  if (product.availability_type === "stock") {
    score += WEIGHTS.availabilityBonus;
  } else if (product.availability_type === "production") {
    score += WEIGHTS.availabilityBonus * 0.5;
  }

  return score;
}

// ── Complementarity logic ──

const COMPLEMENTARY_PAIRINGS: [string, string][] = [
  ["chair", "table"],
  ["armchair", "table"],
  ["stool", "high_table"],
  ["armchair", "parasol"],
  ["chair", "parasol"],
  ["sofa", "parasol"],
  ["sun_lounger", "parasol"],
  ["sofa", "table"],
  ["armchair", "sofa"],
];

function computeComplementarityBonus(
  selected: { product: DBProduct; score: number }[],
  candidate: DBProduct
): number {
  if (selected.length === 0) return 0;
  let bonus = 0;
  const candidateFamily = candidate.product_family || candidate.category;

  for (const { product: existing } of selected) {
    const existingFamily = existing.product_family || existing.category;

    // Same family in same concept = duplication penalty
    if (candidateFamily === existingFamily && candidateFamily) {
      bonus += WEIGHTS.sameFamilyDuplicationPenalty;
      continue;
    }

    // Complementary pairings
    for (const [a, b] of COMPLEMENTARY_PAIRINGS) {
      const candCat = candidate.category;
      const existCat = existing.category;
      if (
        (candCat === a && existCat === b) ||
        (candCat === b && existCat === a)
      ) {
        bonus += WEIGHTS.complementarityBonus;
      }
    }

    // Shared style affinity
    const sharedStyles = candidate.style_tags.filter((t) => existing.style_tags.includes(t));
    bonus += sharedStyles.length * 0.3;

    // Shared material affinity
    const sharedMaterials = candidate.material_tags.filter((t) => existing.material_tags.includes(t));
    bonus += sharedMaterials.length * 0.2;
  }

  return bonus;
}

// ── Product family variant logic ──

function findFamilyVariants(
  product: DBProduct,
  allProducts: DBProduct[],
  excludeIds: Set<string>
): DBProduct[] {
  if (!product.product_family) return [];
  return allProducts.filter(
    (p) =>
      p.id !== product.id &&
      !excludeIds.has(p.id) &&
      p.product_family === product.product_family
  );
}

function selectProductsForConcept(
  concept: ConceptTemplate,
  params: ProjectParameters,
  products: DBProduct[],
  usedProductIds: Set<string>
): RecommendedProduct[] {
  const scored = products
    .map((p) => ({
      product: p,
      score: scoreProduct(p, concept, params),
    }))
    .sort((a, b) => b.score - a.score);

  const selected: { product: DBProduct; score: number }[] = [];
  const usedFamilies = new Set<string>();
  const maxProducts = Math.min(5, scored.length);
  const minProducts = Math.min(3, scored.length);
  const topScore = scored[0]?.score || 1;

  for (const item of scored) {
    if (selected.length >= maxProducts) break;

    const family = item.product.product_family || item.product.category;

    // After minimum, enforce family diversity
    if (usedFamilies.has(family) && selected.length >= minProducts) continue;

    // Cross-concept family variant logic
    if (usedProductIds.has(item.product.id)) {
      const variants = findFamilyVariants(item.product, products, usedProductIds);
      const scoredVariant = variants
        .map((v) => ({ product: v, score: scoreProduct(v, concept, params) }))
        .sort((a, b) => b.score - a.score)[0];

      // Use variant only if score >= 60% of top-scoring product
      if (scoredVariant && scoredVariant.score >= topScore * 0.6) {
        const compBonus = computeComplementarityBonus(selected, scoredVariant.product);
        selected.push({ product: scoredVariant.product, score: scoredVariant.score + compBonus });
        usedFamilies.add(scoredVariant.product.product_family || scoredVariant.product.category);
        continue;
      }
      // If no good variant, still allow the original if highly relevant
      if (item.score < topScore * 0.6) continue;
    }

    const compBonus = computeComplementarityBonus(selected, item.product);
    selected.push({ product: item.product, score: item.score + compBonus });
    usedFamilies.add(family);
  }

  selected.sort((a, b) => b.score - a.score);

  return selected.map(({ product, score }) => ({
    productId: product.id,
    relevanceScore: Math.min(score / 20, 1),
    reason: generateReason(product, concept, params),
  }));
}

function generateReason(
  product: DBProduct,
  concept: ConceptTemplate,
  params: ProjectParameters
): string {
  const matchedStyles = product.style_tags.filter(
    (t) => concept.styleBias.includes(t) || params.style.includes(t)
  );
  const matchedUseCases = product.use_case_tags.filter(
    (t) => t.includes(params.establishmentType) || t.includes(params.projectZone)
  );
  const materials = product.material_tags.join(" & ");

  if (matchedUseCases.length > 0 && matchedStyles.length > 0) {
    return `${matchedStyles[0]} style, ideal for ${params.establishmentType} ${params.projectZone}`;
  }
  if (matchedStyles.length > 0) {
    return `${matchedStyles[0]} aesthetic in ${materials || product.category.toLowerCase()}`;
  }
  if (matchedUseCases.length > 0) {
    return `Designed for ${params.establishmentType} spaces`;
  }
  if (product.is_chr_heavy_use) {
    return `Professional-grade, built for high-traffic hospitality`;
  }
  return `Complements the ${concept.titleTemplate} palette`;
}

// ═══════════════════════════════════════════════════════════
// Layout requirement mapping
// ═══════════════════════════════════════════════════════════

function normalizeLookupValue(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/[_\s-]/g, "");
}

function inferRequirementType(product: DBProduct): LayoutRequirementType {
  const category = normalizeLookupValue(product.category);
  const subcategory = normalizeLookupValue(product.subcategory);

  if (category.includes("armchair") || subcategory.includes("armchair")) return "armchair";
  if (category.includes("chair") || category.includes("stool") || subcategory.includes("chair")) return "chair";
  if (category.includes("parasol") || subcategory.includes("parasol")) return "parasol";

  if (category.includes("table")) {
    if (subcategory.includes("tablebase") || subcategory.includes("bartablebase")) return "table_base";
    if (subcategory.includes("tabletop")) return "tabletop";
    return "complete_table";
  }

  return "other";
}

function buildLayoutRequirements(layout: LayoutRecommendation): LayoutRequirement[] {
  const requirements: LayoutRequirement[] = [];

  requirements.push({
    id: "chairs-main",
    type: "chair",
    label: "Chair seating",
    requiredQuantity: Math.max(layout.chairCount, 1),
  });

  requirements.push({
    id: "armchairs-main",
    type: "armchair",
    label: "Armchair seating",
    requiredQuantity: Math.max(1, Math.round(layout.chairCount * 0.25)),
  });

  requirements.push({
    id: "parasols-main",
    type: "parasol",
    label: "Parasol coverage",
    requiredQuantity: Math.max(1, Math.round(layout.totalSeats / 4)),
  });

  layout.tableGroups.forEach((group, index) => {
    const suffix = `${group.tableFormat} (${group.quantity})`;

    requirements.push({
      id: `complete-table-${index}`,
      type: "complete_table",
      label: `Complete table ${suffix}`,
      requiredQuantity: group.quantity,
      tableFormat: group.tableFormat,
    });

    requirements.push({
      id: `table-base-${index}`,
      type: "table_base",
      label: `Table base ${suffix}`,
      requiredQuantity: group.quantity,
      tableFormat: group.tableFormat,
    });

    requirements.push({
      id: `tabletop-${index}`,
      type: "tabletop",
      label: `Tabletop ${suffix}`,
      requiredQuantity: group.quantity,
      tableFormat: group.tableFormat,
    });
  });

  return requirements;
}

function assignLayoutRequirementsToRecommendations(
  recommended: RecommendedProduct[],
  products: DBProduct[],
  requirements: LayoutRequirement[]
) {
  const requirementsByType = requirements.reduce<Record<LayoutRequirementType, LayoutRequirement[]>>(
    (acc, requirement) => {
      acc[requirement.type].push(requirement);
      return acc;
    },
    {
      chair: [],
      armchair: [],
      complete_table: [],
      table_base: [],
      tabletop: [],
      parasol: [],
      other: [],
    }
  );

  const typeCursors: Partial<Record<LayoutRequirementType, number>> = {};

  for (const rec of recommended) {
    const product = products.find((p) => p.id === rec.productId);
    if (!product) continue;

    const inferredType = inferRequirementType(product);
    const typedRequirements = requirementsByType[inferredType];
    const cursor = typeCursors[inferredType] || 0;

    let matchedRequirement = typedRequirements[cursor] || typedRequirements[typedRequirements.length - 1];

    if (!matchedRequirement && inferredType === "armchair") {
      matchedRequirement = requirementsByType.armchair[0] || requirementsByType.chair[0];
    }

    if (
      !matchedRequirement &&
      (inferredType === "table_base" || inferredType === "tabletop" || inferredType === "complete_table")
    ) {
      matchedRequirement =
        requirementsByType[inferredType][0] ||
        requirementsByType.complete_table[0] ||
        requirementsByType.table_base[0] ||
        requirementsByType.tabletop[0];
    }

    if (!matchedRequirement && inferredType === "chair") {
      matchedRequirement = requirementsByType.chair[0];
    }

    if (!matchedRequirement && inferredType === "parasol") {
      matchedRequirement = requirementsByType.parasol[0];
    }

    rec.layoutRequirementType = matchedRequirement?.type ?? inferredType;
    rec.layoutRequirementLabel = matchedRequirement?.label ?? "Manual sourcing";
    rec.layoutRequirementId = matchedRequirement?.id;
    rec.suggestedQuantity = matchedRequirement?.requiredQuantity ?? 1;

    if (matchedRequirement && typedRequirements.length > 0) {
      typeCursors[inferredType] = cursor + 1;
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
  concepts: ProjectConcept[];
} {
  let parameters = parseProjectRequest(input);
  if (overrideParams) {
    parameters = { ...parameters, ...overrideParams };
  }

  // Generate layout recommendations
  const layouts = generateLayouts(parameters);
  const templates = getConceptTemplates(parameters);

  const usedProductIds = new Set<string>();
  const concepts: ProjectConcept[] = templates.map((template, i) => {
    const recommended = selectProductsForConcept(template, parameters, products, usedProductIds);
    recommended.forEach((r) => usedProductIds.add(r.productId));

    // Assign layout to concept (main, alt, flex)
    const layout = layouts[i] || layouts[0];
    const requirements = layout ? buildLayoutRequirements(layout) : [];

    if (requirements.length > 0) {
      assignLayoutRequirementsToRecommendations(recommended, products, requirements);
    }

    return {
      id: `concept-${i + 1}`,
      title: template.titleTemplate,
      description: template.descTemplate,
      colorPalette: template.colorHex,
      colorNames: template.colorNames,
      moodKeywords: template.mood,
      products: recommended,
      layout: layout ? { ...layout, requirements } : layout,
    };
  });

  return { parameters, concepts };
}
