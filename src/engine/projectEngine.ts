import { ProjectParameters, ProjectConcept, RecommendedProduct } from "./types";
import type { DBProduct } from "@/lib/products";

// ═══════════════════════════════════════════════════════════
// STEP 1 & 2: Interpret project request → structured parameters
// ═══════════════════════════════════════════════════════════

const ESTABLISHMENT_KEYWORDS: Record<string, string[]> = {
  restaurant: ["restaurant", "dining", "bistro", "brasserie", "trattoria", "cafe", "eatery", "pizzeria", "gastro"],
  hotel: ["hotel", "resort", "boutique hotel", "lodge", "inn", "spa", "wellness"],
  rooftop: ["rooftop", "sky bar", "sky lounge", "rooftop bar", "roof terrace"],
  "beach-club": ["beach", "beach club", "beachfront", "seaside", "coastal", "plage"],
  camping: ["camping", "glamping", "campsite", "caravan", "mobile home"],
  bar: ["bar", "lounge bar", "cocktail", "pub", "wine bar", "tapas"],
  event: ["event", "banquet", "wedding", "catering", "conference"],
};

const STYLE_KEYWORDS: Record<string, string[]> = {
  mediterranean: ["mediterranean", "riviera", "greek", "italian", "provence", "south of france", "côte d'azur", "ibiza"],
  modern: ["modern", "contemporary", "minimalist", "sleek", "clean", "design"],
  scandinavian: ["scandinavian", "nordic", "hygge", "scandi", "danish"],
  industrial: ["industrial", "urban", "loft", "raw", "metal", "factory"],
  bohemian: ["bohemian", "boho", "eclectic", "free-spirit", "hippie"],
  natural: ["natural", "organic", "earthy", "rustic", "raw wood", "nature"],
  luxury: ["luxury", "premium", "high-end", "exclusive", "upscale", "chic", "5-star"],
  tropical: ["tropical", "exotic", "palm", "jungle", "caribbean", "bali"],
  classic: ["classic", "timeless", "traditional", "elegant", "french"],
  coastal: ["coastal", "nautical", "maritime", "harbor", "port"],
};

const AMBIENCE_KEYWORDS: Record<string, string[]> = {
  warm: ["warm", "cozy", "inviting", "sun", "golden", "chaleureux"],
  sophisticated: ["sophisticated", "refined", "elegant", "upscale", "chic"],
  relaxed: ["relaxed", "casual", "laid-back", "chill", "easy", "décontracté"],
  lively: ["lively", "vibrant", "energetic", "buzzing", "social", "festive"],
  intimate: ["intimate", "romantic", "quiet", "private", "cosy"],
  evening: ["evening", "night", "sunset", "cocktail hour", "after-dark"],
  daytime: ["daytime", "brunch", "lunch", "morning", "breakfast"],
};

const COLOR_KEYWORDS: Record<string, string[]> = {
  natural: ["natural", "beige", "sand", "cream", "earth", "terre", "nude"],
  white: ["white", "bright", "light", "airy", "blanc", "pure"],
  black: ["black", "dark", "noir", "charcoal", "anthracite"],
  warm: ["warm", "terracotta", "rust", "amber", "honey", "ochre", "cognac"],
  cool: ["cool", "blue", "gray", "silver", "slate", "steel"],
  green: ["green", "olive", "sage", "forest", "verdure", "vert"],
  wood: ["wood", "teak", "oak", "walnut", "timber", "bois"],
};

const MATERIAL_KEYWORDS: Record<string, string[]> = {
  teak: ["teak", "wood", "timber", "bois", "oak", "walnut"],
  aluminum: ["aluminum", "aluminium", "metal", "steel", "iron", "powder-coated"],
  rattan: ["rattan", "wicker", "woven", "cane", "osier"],
  marble: ["marble", "stone", "granite", "concrete", "terrazzo"],
  rope: ["rope", "cord", "woven rope", "macramé"],
  fabric: ["fabric", "textile", "cushion", "upholstered", "sunbrella"],
  resin: ["resin", "plastic", "polypropylene", "composite"],
};

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
  const match = input.match(/(\d+)\s*(?:seats?|places?|covers?|pax|pers|couverts?)/i);
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
  };
  const lower = input.toLowerCase();
  for (const [zone, keywords] of Object.entries(zones)) {
    if (keywords.some((k) => lower.includes(k))) return zone;
  }
  return "outdoor";
}

export function parseProjectRequest(input: string): ProjectParameters {
  return {
    establishmentType: matchKeywords(input, ESTABLISHMENT_KEYWORDS)[0] || "restaurant",
    projectZone: extractZone(input),
    seatingCapacity: extractCapacity(input),
    style: matchKeywords(input, STYLE_KEYWORDS) || ["modern"],
    ambience: matchKeywords(input, AMBIENCE_KEYWORDS) || ["warm"],
    colorPalette: matchKeywords(input, COLOR_KEYWORDS) || ["natural"],
    materialPreferences: matchKeywords(input, MATERIAL_KEYWORDS),
    technicalConstraints: [],
  };
}

// ═══════════════════════════════════════════════════════════
// STEP 3: Generate 3 distinct project concepts
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
    { titleTemplate: "Riviera Sun", descTemplate: "A sun-drenched Mediterranean terrace with natural textures and warm earthy tones. Woven materials meet teak wood for timeless coastal elegance.", styleBias: ["mediterranean", "coastal", "natural"], ambienceBias: ["warm", "relaxed", "sun-drenched"], colorHex: ["#D4A574", "#F5E6D3", "#8B7355", "#E8DDD3", "#C4956A"], colorNames: ["Terracotta", "Sand", "Driftwood", "Linen", "Amber"], mood: ["sun-kissed", "artisan", "al-fresco"] },
    { titleTemplate: "Aegean Breeze", descTemplate: "Inspired by Greek island terraces — whitewashed simplicity balanced with organic textures and blue accents for a fresh coastal feel.", styleBias: ["mediterranean", "minimalist", "coastal"], ambienceBias: ["relaxed", "intimate", "casual-elegant"], colorHex: ["#FFFFFF", "#4A90A4", "#D4C5A9", "#E8E3DA", "#8AAFBF"], colorNames: ["White", "Aegean Blue", "Wheat", "Chalk", "Sea Mist"], mood: ["fresh", "island", "breezy"] },
    { titleTemplate: "Provençal Garden", descTemplate: "Rustic charm meets refined comfort. Aged materials, lavender tones and natural textiles create an intimate garden dining atmosphere.", styleBias: ["natural", "artisan", "classic"], ambienceBias: ["intimate", "warm", "convivial"], colorHex: ["#9B8B7A", "#D4C9B8", "#7B6B8A", "#E8DDD3", "#A69B8E"], colorNames: ["Stone", "Flax", "Lavender", "Cream", "Pebble"], mood: ["rustic", "garden", "provençal"] },
  ],
  modern: [
    { titleTemplate: "Urban Edge", descTemplate: "Clean-lined contemporary design with monochrome palette and metallic accents. Architectural furniture that makes a statement.", styleBias: ["modern", "industrial", "bold"], ambienceBias: ["sophisticated", "energetic", "evening"], colorHex: ["#1A1A1A", "#FFFFFF", "#888888", "#C0C0C0", "#333333"], colorNames: ["Onyx", "Pure White", "Concrete", "Silver", "Graphite"], mood: ["sleek", "urban", "architectural"] },
    { titleTemplate: "Soft Modern", descTemplate: "Warm minimalism with curved forms and muted earth tones. Natural materials elevated through contemporary design language.", styleBias: ["modern", "minimalist", "warm-modern"], ambienceBias: ["sophisticated", "relaxing", "premium"], colorHex: ["#E8DDD3", "#D4C5A9", "#8B7355", "#F5F0EB", "#A69B8E"], colorNames: ["Oat", "Wheat", "Walnut", "Mist", "Mushroom"], mood: ["calm", "refined", "organic-modern"] },
    { titleTemplate: "Noir Luxe", descTemplate: "Dark sophistication with premium materials. Marble, black iron and deep tones create an evening-first atmosphere of quiet luxury.", styleBias: ["luxury", "modern", "statement"], ambienceBias: ["sophisticated", "evening", "premium"], colorHex: ["#1A1A1A", "#8B7355", "#D4A574", "#2D2D2D", "#C4956A"], colorNames: ["Black", "Bronze", "Copper", "Charcoal", "Gold"], mood: ["dramatic", "luxurious", "evening"] },
  ],
  natural: [
    { titleTemplate: "Forest Lodge", descTemplate: "Organic textures and forest-inspired palette. Teak, rattan and linen combine for a warm, grounded outdoor retreat.", styleBias: ["natural", "scandinavian", "organic"], ambienceBias: ["relaxing", "warm", "intimate"], colorHex: ["#6B7B5E", "#D4C5A9", "#8B7355", "#E8DDD3", "#A69B8E"], colorNames: ["Sage", "Flax", "Walnut", "Linen", "Pebble"], mood: ["earthy", "grounded", "retreat"] },
    { titleTemplate: "Coastal Natural", descTemplate: "Beach-washed textures with natural fiber seating and bleached wood. Effortless outdoor living inspired by seaside simplicity.", styleBias: ["natural", "coastal", "bohemian"], ambienceBias: ["relaxed", "casual", "tropical"], colorHex: ["#F5E6D3", "#D4C9B8", "#E8DDD3", "#B8A898", "#C4B8A8"], colorNames: ["Sand", "Dune", "Shell", "Driftwood", "Sea Salt"], mood: ["breezy", "barefoot", "organic"] },
    { titleTemplate: "Earth & Craft", descTemplate: "Artisan-crafted pieces with raw textures. Hand-woven details and honest materials for spaces that feel genuinely welcoming.", styleBias: ["artisan", "natural", "bohemian"], ambienceBias: ["warm", "convivial", "casual"], colorHex: ["#C4956A", "#8B7355", "#D4C5A9", "#E8DDD3", "#A0856E"], colorNames: ["Terracotta", "Teak", "Hemp", "Cream", "Clay"], mood: ["handmade", "authentic", "textured"] },
  ],
  scandinavian: [
    { titleTemplate: "Nordic Calm", descTemplate: "Restrained Scandinavian design with light woods, clean forms and soft neutral textiles. Quiet luxury for considered outdoor spaces.", styleBias: ["scandinavian", "minimalist", "refined"], ambienceBias: ["relaxing", "intimate", "sophisticated"], colorHex: ["#F5F0EB", "#D4C9B8", "#8B7355", "#E8E3DA", "#BFBAB3"], colorNames: ["Snow", "Oat", "Oak", "Frost", "Stone"], mood: ["serene", "balanced", "light"] },
    { titleTemplate: "Scandi Outdoor", descTemplate: "Functional Nordic design adapted for hospitality outdoors. Light teak and performance fabrics in a restrained palette.", styleBias: ["scandinavian", "functional", "warm-modern"], ambienceBias: ["relaxing", "casual-elegant", "daytime"], colorHex: ["#E8DDD3", "#C4B8A8", "#6B7B5E", "#F5F0EB", "#A69B8E"], colorNames: ["Birch", "Linen", "Moss", "Cloud", "Pebble"], mood: ["hygge", "outdoor", "natural-light"] },
  ],
  luxury: [
    { titleTemplate: "Grand Terrace", descTemplate: "Statement pieces and premium materials define this luxury outdoor concept. Marble, brass and sculptural forms for discerning venues.", styleBias: ["luxury", "modern", "statement"], ambienceBias: ["sophisticated", "premium", "evening"], colorHex: ["#1A1A1A", "#D4A574", "#FFFFFF", "#8B7355", "#C4956A"], colorNames: ["Black", "Brass", "Marble", "Bronze", "Gold"], mood: ["opulent", "dramatic", "exclusive"] },
    { titleTemplate: "Quiet Luxury", descTemplate: "Understated premium design. Rich materials, perfect proportions and a muted palette that speaks to quality without ostentation.", styleBias: ["luxury", "minimalist", "refined"], ambienceBias: ["sophisticated", "intimate", "premium"], colorHex: ["#E8DDD3", "#8B7355", "#D4C5A9", "#A69B8E", "#C4B8A8"], colorNames: ["Cream", "Espresso", "Cashmere", "Taupe", "Sand"], mood: ["refined", "subtle", "exclusive"] },
  ],
  industrial: [
    { titleTemplate: "Factory Terrace", descTemplate: "Raw metal, concrete tones and stackable functionality. Industrial design optimized for high-volume hospitality with character.", styleBias: ["industrial", "urban", "functional"], ambienceBias: ["energetic", "lively", "bustling"], colorHex: ["#888888", "#1A1A1A", "#C0C0C0", "#D4C9B8", "#666666"], colorNames: ["Steel", "Iron", "Zinc", "Concrete", "Smoke"], mood: ["raw", "urban", "functional"] },
    { titleTemplate: "Industrial Warm", descTemplate: "Industrial bones with warm wood accents. The contrast of metal and natural materials creates spaces with soul and practicality.", styleBias: ["industrial", "natural", "warm-modern"], ambienceBias: ["warm", "convivial", "social"], colorHex: ["#333333", "#8B7355", "#C0C0C0", "#D4C5A9", "#A0856E"], colorNames: ["Charcoal", "Oak", "Aluminium", "Sand", "Rust"], mood: ["hybrid", "character", "grounded"] },
  ],
  tropical: [
    { titleTemplate: "Island Resort", descTemplate: "Lush tropical vibes with woven rattan, teak and resort-style lounging. Designed for daytime relaxation and sunset cocktails.", styleBias: ["tropical", "natural", "bohemian"], ambienceBias: ["relaxed", "tropical", "lively"], colorHex: ["#6B7B5E", "#D4A574", "#F5E6D3", "#8B7355", "#A0856E"], colorNames: ["Palm", "Bamboo", "Coconut", "Teak", "Cinnamon"], mood: ["exotic", "resort", "lush"] },
  ],
  coastal: [
    { titleTemplate: "Harbor View", descTemplate: "Maritime elegance with weathered textures, nautical blues and durable materials. Designed for port-side dining and seaside venues.", styleBias: ["coastal", "classic", "natural"], ambienceBias: ["relaxed", "sophisticated", "daytime"], colorHex: ["#2C5F7C", "#F5E6D3", "#FFFFFF", "#8B7355", "#A8C5D6"], colorNames: ["Navy", "Sand", "White", "Rope", "Sky"], mood: ["maritime", "fresh", "harbour"] },
  ],
  classic: [
    { titleTemplate: "Belle Époque", descTemplate: "Timeless European terrace design with elegant proportions and quality materials. Classic bistro charm for established venues.", styleBias: ["classic", "timeless", "elegant"], ambienceBias: ["sophisticated", "warm", "intimate"], colorHex: ["#8B7355", "#E8DDD3", "#333333", "#D4C5A9", "#C4956A"], colorNames: ["Bronze", "Cream", "Iron", "Linen", "Gold"], mood: ["timeless", "parisian", "elegant"] },
  ],
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

  const scored = allTemplates.map((t) => {
    let score = 0;
    for (const amb of params.ambience) {
      if (t.ambienceBias.includes(amb)) score += 2;
    }
    for (const col of params.colorPalette) {
      if (t.colorNames.some((cn) => cn.toLowerCase().includes(col))) score += 1;
    }
    // Establishment affinity bonus
    const estMap: Record<string, string[]> = {
      restaurant: ["convivial", "daytime", "warm"],
      hotel: ["sophisticated", "premium", "relaxing"],
      rooftop: ["evening", "sophisticated", "energetic"],
      "beach-club": ["relaxed", "tropical", "casual"],
      bar: ["evening", "lively", "sophisticated"],
    };
    const estAmbiences = estMap[params.establishmentType] || [];
    for (const amb of estAmbiences) {
      if (t.ambienceBias.includes(amb)) score += 1;
    }
    score += Math.random() * 0.5;
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

// Scoring weights — relevance dominates, popularity amplifies,
// diversity is controlled not forced.
const WEIGHTS = {
  styleConceptMatch: 4.0,    // product tag matches concept bias
  styleParamMatch: 3.0,      // product tag matches user request
  useCaseMatch: 3.5,         // product use-case matches establishment
  zoneMatch: 2.5,            // product use-case matches zone
  ambienceConceptMatch: 2.5, // ambience alignment with concept
  ambienceParamMatch: 2.0,   // ambience alignment with user request
  paletteMatch: 1.5,         // color palette fit
  materialMatch: 1.5,        // material preference fit
  popularityBoost: 3.0,      // popular products deserve visibility
  priorityBoost: 2.0,        // editorial priority from admin
  chrBonus: 1.0,             // heavy-use bonus for hospitality
  freshness: 0.8,            // controlled randomness for variation
};

function scoreProduct(
  product: DBProduct,
  concept: ConceptTemplate,
  params: ProjectParameters
): number {
  let score = 0;

  // Style relevance (strongest signal)
  for (const tag of product.style_tags) {
    if (concept.styleBias.includes(tag)) score += WEIGHTS.styleConceptMatch;
    if (params.style.includes(tag)) score += WEIGHTS.styleParamMatch;
  }

  // Use-case relevance (very important for hospitality context)
  for (const tag of product.use_case_tags) {
    if (tag.includes(params.establishmentType)) score += WEIGHTS.useCaseMatch;
    if (tag.includes(params.projectZone)) score += WEIGHTS.zoneMatch;
  }

  // Ambience alignment
  for (const tag of product.ambience_tags) {
    if (concept.ambienceBias.includes(tag)) score += WEIGHTS.ambienceConceptMatch;
    if (params.ambience.includes(tag)) score += WEIGHTS.ambienceParamMatch;
  }

  // Palette match
  for (const tag of product.palette_tags) {
    if (params.colorPalette.includes(tag)) score += WEIGHTS.paletteMatch;
  }

  // Material preference
  for (const tag of product.material_tags) {
    for (const pref of params.materialPreferences) {
      if (tag.includes(pref)) score += WEIGHTS.materialMatch;
    }
  }

  // Popularity boost — high-demand products stay visible
  score += product.popularity_score * WEIGHTS.popularityBoost;

  // Priority boost — admin-curated priority
  score += product.priority_score * WEIGHTS.priorityBoost;

  // CHR heavy-use bonus for professional hospitality projects
  if (product.is_chr_heavy_use) score += WEIGHTS.chrBonus;

  // Controlled freshness (small random variation, not enough to override relevance)
  score += Math.random() * WEIGHTS.freshness;

  return score;
}

// ── Complementarity: score bonus when products work well together ──

function computeComplementarityBonus(
  selected: { product: DBProduct; score: number }[],
  candidate: DBProduct
): number {
  if (selected.length === 0) return 0;

  let bonus = 0;
  const candidateFamily = candidate.product_family || candidate.category;

  for (const { product: existing } of selected) {
    const existingFamily = existing.product_family || existing.category;

    // Same family = redundant (slight penalty)
    if (candidateFamily === existingFamily) {
      bonus -= 0.5;
      continue;
    }

    // Complementary category pairings (tables + chairs, lounge + parasols, etc.)
    const pairings: [string, string][] = [
      ["Dining Seating", "Dining Tables"],
      ["Lounge Seating", "Shade"],
      ["Bar Seating", "Dining Tables"],
      ["Dining Seating", "Shade"],
      ["Lounge Seating", "Dining Tables"],
    ];

    for (const [a, b] of pairings) {
      if (
        (candidateFamily === a && existingFamily === b) ||
        (candidateFamily === b && existingFamily === a)
      ) {
        bonus += 2.0;
      }
    }

    // Shared style affinity (products that "go together")
    const sharedStyles = candidate.style_tags.filter((t) =>
      existing.style_tags.includes(t)
    );
    bonus += sharedStyles.length * 0.3;

    // Shared material affinity
    const sharedMaterials = candidate.material_tags.filter((t) =>
      existing.material_tags.includes(t)
    );
    bonus += sharedMaterials.length * 0.2;
  }

  return bonus;
}

// ── Product family logic: find variant alternatives ──

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
  // Score all products
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

  for (const item of scored) {
    if (selected.length >= maxProducts) break;

    const family = item.product.product_family || item.product.category;

    // Diversity control: allow max 1 product per family,
    // but NEVER skip a high-relevance product just for diversity
    // (only enforce diversity after we have the minimum)
    if (usedFamilies.has(family) && selected.length >= minProducts) continue;

    // If this exact product was already used in a previous concept,
    // check if a family variant exists with decent score
    if (usedProductIds.has(item.product.id)) {
      const variants = findFamilyVariants(item.product, products, usedProductIds);
      const scoredVariant = variants
        .map((v) => ({ product: v, score: scoreProduct(v, concept, params) }))
        .sort((a, b) => b.score - a.score)[0];

      // Use variant if it has at least 60% of original's score
      if (scoredVariant && scoredVariant.score >= item.score * 0.6) {
        const compBonus = computeComplementarityBonus(selected, scoredVariant.product);
        selected.push({ product: scoredVariant.product, score: scoredVariant.score + compBonus });
        usedFamilies.add(scoredVariant.product.product_family || scoredVariant.product.category);
        continue;
      }
    }

    // Complementarity bonus
    const compBonus = computeComplementarityBonus(selected, item.product);
    selected.push({ product: item.product, score: item.score + compBonus });
    usedFamilies.add(family);
  }

  // Re-sort by final score (with complementarity)
  selected.sort((a, b) => b.score - a.score);

  // Build recommendation objects with rich reasons
  return selected.map(({ product, score }) => {
    const reason = generateReason(product, concept, params);
    return {
      productId: product.id,
      relevanceScore: Math.min(score / 20, 1),
      reason,
    };
  });
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
    return `${matchedStyles[0]} aesthetic in ${materials}`;
  }
  if (matchedUseCases.length > 0) {
    return `Designed for ${params.establishmentType} spaces`;
  }
  if (product.is_chr_heavy_use) {
    return `Professional-grade, built for ${concept.titleTemplate} concept`;
  }
  return `Complements the ${concept.titleTemplate} palette`;
}

// ═══════════════════════════════════════════════════════════
// STEP 5: Main engine function
// ═══════════════════════════════════════════════════════════

export function generateProjectConcepts(
  input: string,
  products: DBProduct[]
): {
  parameters: ProjectParameters;
  concepts: ProjectConcept[];
} {
  const parameters = parseProjectRequest(input);
  const templates = getConceptTemplates(parameters);

  const usedProductIds = new Set<string>();
  const concepts: ProjectConcept[] = templates.map((template, i) => {
    const recommended = selectProductsForConcept(template, parameters, products, usedProductIds);

    // Track used products for cross-concept family variant logic
    recommended.forEach((r) => usedProductIds.add(r.productId));

    return {
      id: `concept-${i + 1}`,
      title: template.titleTemplate,
      description: template.descTemplate,
      colorPalette: template.colorHex,
      colorNames: template.colorNames,
      moodKeywords: template.mood,
      products: recommended,
    };
  });

  return { parameters, concepts };
}
