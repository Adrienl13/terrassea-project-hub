import { ProjectParameters, ProjectConcept, RecommendedProduct, EnrichedProduct } from "./types";
import { enrichedProducts } from "@/data/products";

// ─── Step 1 & 2: Parse natural language into structured parameters ───

const ESTABLISHMENT_KEYWORDS: Record<string, string[]> = {
  restaurant: ["restaurant", "dining", "bistro", "brasserie", "trattoria", "cafe", "eatery"],
  hotel: ["hotel", "resort", "boutique hotel", "lodge", "inn"],
  rooftop: ["rooftop", "sky bar", "sky lounge", "rooftop bar"],
  "beach-club": ["beach", "beach club", "beachfront", "seaside", "coastal"],
  camping: ["camping", "glamping", "outdoor", "campsite"],
  bar: ["bar", "lounge bar", "cocktail", "pub"],
};

const STYLE_KEYWORDS: Record<string, string[]> = {
  mediterranean: ["mediterranean", "riviera", "greek", "italian", "provence", "south of france"],
  modern: ["modern", "contemporary", "minimalist", "sleek", "clean"],
  scandinavian: ["scandinavian", "nordic", "hygge", "scandi"],
  industrial: ["industrial", "urban", "loft", "raw", "metal"],
  bohemian: ["bohemian", "boho", "eclectic", "free-spirit"],
  natural: ["natural", "organic", "earthy", "rustic", "raw"],
  luxury: ["luxury", "premium", "high-end", "exclusive", "upscale", "chic"],
  tropical: ["tropical", "exotic", "palm", "jungle", "caribbean"],
  classic: ["classic", "timeless", "traditional", "elegant"],
};

const AMBIENCE_KEYWORDS: Record<string, string[]> = {
  warm: ["warm", "cozy", "inviting", "sun", "golden"],
  sophisticated: ["sophisticated", "refined", "elegant", "upscale"],
  relaxed: ["relaxed", "casual", "laid-back", "chill", "easy"],
  lively: ["lively", "vibrant", "energetic", "buzzing", "social"],
  intimate: ["intimate", "romantic", "quiet", "private"],
};

const COLOR_KEYWORDS: Record<string, string[]> = {
  natural: ["natural", "beige", "sand", "cream", "earth", "terre"],
  white: ["white", "bright", "light", "airy", "blanc"],
  black: ["black", "dark", "noir", "charcoal"],
  warm: ["warm", "terracotta", "rust", "amber", "honey", "ochre"],
  cool: ["cool", "blue", "gray", "silver", "slate"],
  green: ["green", "olive", "sage", "forest", "verdure"],
};

const MATERIAL_KEYWORDS: Record<string, string[]> = {
  teak: ["teak", "wood", "timber", "bois"],
  aluminum: ["aluminum", "aluminium", "metal", "steel"],
  rattan: ["rattan", "wicker", "woven", "cane"],
  marble: ["marble", "stone", "granite"],
  rope: ["rope", "cord", "woven rope"],
  fabric: ["fabric", "textile", "cushion", "upholstered"],
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
  const match = input.match(/(\d+)\s*(?:seats?|places?|covers?|pax|pers)/i);
  if (match) return parseInt(match[1]);
  const standalone = input.match(/(\d{2,3})/);
  if (standalone) return parseInt(standalone[1]);
  return null;
}

function extractZone(input: string): string {
  const zones = ["terrace", "terrasse", "patio", "garden", "pool", "deck", "lobby", "rooftop", "balcony", "courtyard"];
  const lower = input.toLowerCase();
  for (const z of zones) {
    if (lower.includes(z)) return z;
  }
  return "outdoor";
}

export function parseProjectRequest(input: string): ProjectParameters {
  const establishments = matchKeywords(input, ESTABLISHMENT_KEYWORDS);
  const styles = matchKeywords(input, STYLE_KEYWORDS);
  const ambiences = matchKeywords(input, AMBIENCE_KEYWORDS);
  const colors = matchKeywords(input, COLOR_KEYWORDS);
  const materials = matchKeywords(input, MATERIAL_KEYWORDS);

  return {
    establishmentType: establishments[0] || "restaurant",
    projectZone: extractZone(input),
    seatingCapacity: extractCapacity(input),
    style: styles.length ? styles : ["modern"],
    ambience: ambiences.length ? ambiences : ["warm"],
    colorPalette: colors.length ? colors : ["natural"],
    materialPreferences: materials,
    technicalConstraints: [],
  };
}

// ─── Step 3: Generate 3 distinct project concepts ───

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
    {
      titleTemplate: "Riviera Sun",
      descTemplate: "A sun-drenched Mediterranean terrace with natural textures and warm earthy tones. Woven materials meet teak wood for timeless coastal elegance.",
      styleBias: ["mediterranean", "coastal", "natural"],
      ambienceBias: ["warm", "relaxed", "sun-drenched"],
      colorHex: ["#D4A574", "#F5E6D3", "#8B7355", "#E8DDD3", "#C4956A"],
      colorNames: ["Terracotta", "Sand", "Driftwood", "Linen", "Amber"],
      mood: ["sun-kissed", "artisan", "al-fresco"],
    },
    {
      titleTemplate: "Aegean Breeze",
      descTemplate: "Inspired by Greek island terraces — whitewashed simplicity balanced with organic textures and blue accents for a fresh coastal feel.",
      styleBias: ["mediterranean", "minimalist", "coastal"],
      ambienceBias: ["relaxed", "intimate", "casual-elegant"],
      colorHex: ["#FFFFFF", "#4A90A4", "#D4C5A9", "#E8E3DA", "#8AAFBF"],
      colorNames: ["White", "Aegean Blue", "Wheat", "Chalk", "Sea Mist"],
      mood: ["fresh", "island", "breezy"],
    },
    {
      titleTemplate: "Provençal Garden",
      descTemplate: "Rustic charm meets refined comfort. Aged materials, lavender tones and natural textiles create an intimate garden dining atmosphere.",
      styleBias: ["natural", "artisan", "classic"],
      ambienceBias: ["intimate", "warm", "convivial"],
      colorHex: ["#9B8B7A", "#D4C9B8", "#7B6B8A", "#E8DDD3", "#A69B8E"],
      colorNames: ["Stone", "Flax", "Lavender", "Cream", "Pebble"],
      mood: ["rustic", "garden", "provençal"],
    },
  ],
  modern: [
    {
      titleTemplate: "Urban Edge",
      descTemplate: "Clean-lined contemporary design with monochrome palette and metallic accents. Architectural furniture that makes a statement.",
      styleBias: ["modern", "industrial", "bold"],
      ambienceBias: ["sophisticated", "energetic", "evening"],
      colorHex: ["#1A1A1A", "#FFFFFF", "#888888", "#C0C0C0", "#333333"],
      colorNames: ["Onyx", "Pure White", "Concrete", "Silver", "Graphite"],
      mood: ["sleek", "urban", "architectural"],
    },
    {
      titleTemplate: "Soft Modern",
      descTemplate: "Warm minimalism with curved forms and muted earth tones. Natural materials elevated through contemporary design language.",
      styleBias: ["modern", "minimalist", "warm-modern"],
      ambienceBias: ["sophisticated", "relaxing", "premium"],
      colorHex: ["#E8DDD3", "#D4C5A9", "#8B7355", "#F5F0EB", "#A69B8E"],
      colorNames: ["Oat", "Wheat", "Walnut", "Mist", "Mushroom"],
      mood: ["calm", "refined", "organic-modern"],
    },
    {
      titleTemplate: "Noir Luxe",
      descTemplate: "Dark sophistication with premium materials. Marble, black iron and deep tones create an evening-first atmosphere of quiet luxury.",
      styleBias: ["luxury", "modern", "statement"],
      ambienceBias: ["sophisticated", "evening", "premium"],
      colorHex: ["#1A1A1A", "#8B7355", "#D4A574", "#2D2D2D", "#C4956A"],
      colorNames: ["Black", "Bronze", "Copper", "Charcoal", "Gold"],
      mood: ["dramatic", "luxurious", "evening"],
    },
  ],
  natural: [
    {
      titleTemplate: "Forest Lodge",
      descTemplate: "Organic textures and forest-inspired palette. Teak, rattan and linen combine for a warm, grounded outdoor retreat.",
      styleBias: ["natural", "scandinavian", "organic"],
      ambienceBias: ["relaxing", "warm", "intimate"],
      colorHex: ["#6B7B5E", "#D4C5A9", "#8B7355", "#E8DDD3", "#A69B8E"],
      colorNames: ["Sage", "Flax", "Walnut", "Linen", "Pebble"],
      mood: ["earthy", "grounded", "retreat"],
    },
    {
      titleTemplate: "Coastal Natural",
      descTemplate: "Beach-washed textures with natural fiber seating and bleached wood. Effortless outdoor living inspired by seaside simplicity.",
      styleBias: ["natural", "coastal", "bohemian"],
      ambienceBias: ["relaxed", "casual", "tropical"],
      colorHex: ["#F5E6D3", "#D4C9B8", "#E8DDD3", "#B8A898", "#C4B8A8"],
      colorNames: ["Sand", "Dune", "Shell", "Driftwood", "Sea Salt"],
      mood: ["breezy", "barefoot", "organic"],
    },
    {
      titleTemplate: "Earth & Craft",
      descTemplate: "Artisan-crafted pieces with raw textures. Hand-woven details and honest materials for spaces that feel genuinely welcoming.",
      styleBias: ["artisan", "natural", "bohemian"],
      ambienceBias: ["warm", "convivial", "casual"],
      colorHex: ["#C4956A", "#8B7355", "#D4C5A9", "#E8DDD3", "#A0856E"],
      colorNames: ["Terracotta", "Teak", "Hemp", "Cream", "Clay"],
      mood: ["handmade", "authentic", "textured"],
    },
  ],
  scandinavian: [
    {
      titleTemplate: "Nordic Calm",
      descTemplate: "Restrained Scandinavian design with light woods, clean forms and soft neutral textiles. Quiet luxury for considered outdoor spaces.",
      styleBias: ["scandinavian", "minimalist", "refined"],
      ambienceBias: ["relaxing", "intimate", "sophisticated"],
      colorHex: ["#F5F0EB", "#D4C9B8", "#8B7355", "#E8E3DA", "#BFBAB3"],
      colorNames: ["Snow", "Oat", "Oak", "Frost", "Stone"],
      mood: ["serene", "balanced", "light"],
    },
    {
      titleTemplate: "Scandi Outdoor",
      descTemplate: "Functional Nordic design adapted for hospitality outdoors. Light teak and performance fabrics in a restrained palette.",
      styleBias: ["scandinavian", "functional", "warm-modern"],
      ambienceBias: ["relaxing", "casual-elegant", "daytime"],
      colorHex: ["#E8DDD3", "#C4B8A8", "#6B7B5E", "#F5F0EB", "#A69B8E"],
      colorNames: ["Birch", "Linen", "Moss", "Cloud", "Pebble"],
      mood: ["hygge", "outdoor", "natural-light"],
    },
  ],
  luxury: [
    {
      titleTemplate: "Grand Terrace",
      descTemplate: "Statement pieces and premium materials define this luxury outdoor concept. Marble, brass and sculptural forms for discerning venues.",
      styleBias: ["luxury", "modern", "statement"],
      ambienceBias: ["sophisticated", "premium", "evening"],
      colorHex: ["#1A1A1A", "#D4A574", "#FFFFFF", "#8B7355", "#C4956A"],
      colorNames: ["Black", "Brass", "Marble", "Bronze", "Gold"],
      mood: ["opulent", "dramatic", "exclusive"],
    },
    {
      titleTemplate: "Quiet Luxury",
      descTemplate: "Understated premium design. Rich materials, perfect proportions and a muted palette that speaks to quality without ostentation.",
      styleBias: ["luxury", "minimalist", "refined"],
      ambienceBias: ["sophisticated", "intimate", "premium"],
      colorHex: ["#E8DDD3", "#8B7355", "#D4C5A9", "#A69B8E", "#C4B8A8"],
      colorNames: ["Cream", "Espresso", "Cashmere", "Taupe", "Sand"],
      mood: ["refined", "subtle", "exclusive"],
    },
  ],
  industrial: [
    {
      titleTemplate: "Factory Terrace",
      descTemplate: "Raw metal, concrete tones and stackable functionality. Industrial design optimized for high-volume hospitality with character.",
      styleBias: ["industrial", "urban", "functional"],
      ambienceBias: ["energetic", "lively", "bustling"],
      colorHex: ["#888888", "#1A1A1A", "#C0C0C0", "#D4C9B8", "#666666"],
      colorNames: ["Steel", "Iron", "Zinc", "Concrete", "Smoke"],
      mood: ["raw", "urban", "functional"],
    },
    {
      titleTemplate: "Industrial Warm",
      descTemplate: "Industrial bones with warm wood accents. The contrast of metal and natural materials creates spaces with soul and practicality.",
      styleBias: ["industrial", "natural", "warm-modern"],
      ambienceBias: ["warm", "convivial", "social"],
      colorHex: ["#333333", "#8B7355", "#C0C0C0", "#D4C5A9", "#A0856E"],
      colorNames: ["Charcoal", "Oak", "Aluminium", "Sand", "Rust"],
      mood: ["hybrid", "character", "grounded"],
    },
  ],
  tropical: [
    {
      titleTemplate: "Island Resort",
      descTemplate: "Lush tropical vibes with woven rattan, teak and resort-style lounging. Designed for daytime relaxation and sunset cocktails.",
      styleBias: ["tropical", "natural", "bohemian"],
      ambienceBias: ["relaxed", "tropical", "lively"],
      colorHex: ["#6B7B5E", "#D4A574", "#F5E6D3", "#8B7355", "#A0856E"],
      colorNames: ["Palm", "Bamboo", "Coconut", "Teak", "Cinnamon"],
      mood: ["exotic", "resort", "lush"],
    },
  ],
};

function getConceptTemplates(params: ProjectParameters): ConceptTemplate[] {
  // Collect templates from all matching styles
  const allTemplates: ConceptTemplate[] = [];
  for (const style of params.style) {
    const templates = CONCEPT_LIBRARY[style];
    if (templates) allTemplates.push(...templates);
  }

  // Fallback
  if (allTemplates.length === 0) {
    allTemplates.push(...(CONCEPT_LIBRARY["modern"] || []));
  }

  // Score templates by ambience match
  const scored = allTemplates.map((t) => {
    let score = 0;
    for (const amb of params.ambience) {
      if (t.ambienceBias.includes(amb)) score += 2;
    }
    for (const col of params.colorPalette) {
      if (t.colorNames.some((cn) => cn.toLowerCase().includes(col))) score += 1;
    }
    // Add small random factor for variation
    score += Math.random() * 0.5;
    return { template: t, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Pick top 3, ensuring diversity (different titles)
  const selected: ConceptTemplate[] = [];
  const usedTitles = new Set<string>();
  for (const { template } of scored) {
    if (!usedTitles.has(template.titleTemplate) && selected.length < 3) {
      selected.push(template);
      usedTitles.add(template.titleTemplate);
    }
  }

  // If we still need more, add from other styles
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

// ─── Step 4: Score & recommend products for a concept ───

function scoreProduct(
  product: EnrichedProduct,
  concept: ConceptTemplate,
  params: ProjectParameters
): number {
  let score = 0;

  // Style match (most important)
  for (const tag of product.tags.style) {
    if (concept.styleBias.includes(tag)) score += 3;
    if (params.style.includes(tag)) score += 2;
  }

  // Ambience match
  for (const tag of product.tags.ambience) {
    if (concept.ambienceBias.includes(tag)) score += 2;
    if (params.ambience.includes(tag)) score += 1.5;
  }

  // Color match
  for (const tag of product.tags.color) {
    if (params.colorPalette.includes(tag)) score += 1.5;
  }

  // Use-case match (establishment type)
  for (const tag of product.tags.useCase) {
    if (tag.includes(params.establishmentType)) score += 3;
    if (tag.includes(params.projectZone)) score += 2;
  }

  // Material preference
  for (const tag of [product.material.toLowerCase()]) {
    for (const pref of params.materialPreferences) {
      if (tag.includes(pref)) score += 1.5;
    }
  }

  // Popularity boost
  score += product.scoring.popularity * 2;

  // Small random factor for freshness
  score += Math.random() * 1.5;

  return score;
}

function selectProductsForConcept(
  concept: ConceptTemplate,
  params: ProjectParameters,
  excludeIds: Set<string> = new Set()
): RecommendedProduct[] {
  const scored = enrichedProducts
    .filter((p) => !excludeIds.has(p.id))
    .map((p) => ({
      product: p,
      score: scoreProduct(p, concept, params),
    }))
    .sort((a, b) => b.score - a.score);

  // Select top products ensuring diversity (different categories)
  const selected: RecommendedProduct[] = [];
  const usedGroups = new Set<string>();
  const maxProducts = Math.min(4, scored.length);

  for (const { product, score } of scored) {
    if (selected.length >= maxProducts) break;
    // Allow one duplicate group max
    if (usedGroups.has(product.scoring.diversityGroup) && usedGroups.size < 3) continue;
    usedGroups.add(product.scoring.diversityGroup);

    // Generate reason
    const matchedStyles = product.tags.style.filter(
      (t) => concept.styleBias.includes(t) || params.style.includes(t)
    );
    const reason = matchedStyles.length
      ? `Matches ${matchedStyles[0]} style with ${product.material.toLowerCase()}`
      : `Complements the ${concept.titleTemplate} concept`;

    selected.push({
      productId: product.id,
      relevanceScore: Math.min(score / 15, 1), // Normalize
      reason,
    });
  }

  // Check complementarity bonus and re-sort
  if (selected.length > 1) {
    for (let i = 1; i < selected.length; i++) {
      const prev = selected[i - 1];
      const curr = selected[i];
      const product = enrichedProducts.find((p) => p.id === curr.productId);
      if (product?.scoring.complementarity[prev.productId]) {
        curr.relevanceScore = Math.min(
          curr.relevanceScore + product.scoring.complementarity[prev.productId] * 0.1,
          1
        );
      }
    }
  }

  return selected;
}

// ─── Step 5: Main engine function ───

export function generateProjectConcepts(input: string): {
  parameters: ProjectParameters;
  concepts: ProjectConcept[];
} {
  // Step 1-2: Parse
  const parameters = parseProjectRequest(input);

  // Step 3: Get concept templates
  const templates = getConceptTemplates(parameters);

  // Step 4: Generate concepts with products
  const usedProductIds = new Set<string>();
  const concepts: ProjectConcept[] = templates.map((template, i) => {
    const products = selectProductsForConcept(template, parameters, new Set());

    // Track used products for mild diversity across concepts
    products.forEach((p) => usedProductIds.add(p.productId));

    return {
      id: `concept-${i + 1}`,
      title: template.titleTemplate,
      description: template.descTemplate,
      colorPalette: template.colorHex,
      colorNames: template.colorNames,
      moodKeywords: template.mood,
      products,
    };
  });

  return { parameters, concepts };
}
