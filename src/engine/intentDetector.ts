import type { DBProduct } from "@/lib/products";

export type SearchIntent = "product_search" | "project_creation";

// Product type keywords — if ANY of these appear, it's a product search
const PRODUCT_TYPE_KEYWORDS = [
  // English
  "chair", "chairs", "armchair", "armchairs", "table", "tables",
  "stool", "stools", "bar stool", "barstool", "barstools",
  "sofa", "sofas", "bench", "benches", "parasol", "parasols",
  "sun lounger", "lounger", "loungers", "cushion", "cushions",
  "planter", "planters",
  // French
  "chaise", "chaises", "fauteuil", "fauteuils", "table", "tables",
  "tabouret", "tabourets", "tabouret de bar", "canapé", "banc", "bancs",
  "parasol", "parasols", "bain de soleil", "transat", "transats",
  "coussin", "coussins", "jardinière", "jardinières",
];

// Attribute signals that reinforce product search (but don't trigger it alone)
const PRODUCT_ATTRIBUTE_SIGNALS = [
  "stackable", "empilable", "folding", "pliable", "pliante",
  "HPL", "textilene", "polypropylene", "polypropylène",
  "aluminium", "aluminum", "teak", "teck", "rope", "corde",
  "resin", "résine", "steel", "acier", "wood", "bois", "marble", "marbre",
  "price", "prix", "model", "modèle", "replace", "buy", "purchase", "acheter",
  "blue", "bleu", "bleue", "black", "noir", "noire", "white", "blanc", "blanche",
  "green", "vert", "verte", "red", "rouge", "grey", "gray", "gris", "grise",
  "beige", "taupe", "terracotta", "anthracite",
];

const PROJECT_CREATION_SIGNALS = [
  "terrace", "terrasse", "project", "projet", "design",
  "layout", "aménagement", "décoration", "concept", "atmosphere", "ambiance",
  "furnish", "equip", "équiper", "meubler",
  "complete", "full setup", "inspiration", "collection", "ensemble",
  "mediterranean", "méditerranéen", "bistro", "bistrot", "lounge",
  "rooftop", "beach club", "industrial", "industriel",
  "coffee shop", "hotel", "hôtel", "camping", "glamping",
];

export function detectIntent(query: string): SearchIntent {
  const lower = query.toLowerCase();

  // Rule 1: If any product type keyword is found → product search (strong signal)
  const hasProductType = PRODUCT_TYPE_KEYWORDS.some(kw => {
    // Match as whole word to avoid partial matches
    const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(lower);
  });

  if (hasProductType) {
    return "product_search";
  }

  // Rule 2: If only attribute signals (color, material) but no product type and no project signal → product search
  let attrScore = 0;
  let projectScore = 0;

  for (const signal of PRODUCT_ATTRIBUTE_SIGNALS) {
    if (lower.includes(signal)) attrScore++;
  }

  for (const signal of PROJECT_CREATION_SIGNALS) {
    if (lower.includes(signal)) projectScore++;
  }

  // Capacity mentions strongly suggest project
  if (/\d+\s*(seats?|places?|covers?|pax|couverts?)/i.test(query)) {
    projectScore += 3;
  }

  // If we have project signals and no product type → project
  if (projectScore > 0 && attrScore <= 1) {
    return "project_creation";
  }

  // If we have attribute signals but no project signals → product search
  if (attrScore > 0 && projectScore === 0) {
    return "product_search";
  }

  // Longer queries with project signals lean toward project
  const wordCount = query.trim().split(/\s+/).length;
  if (wordCount >= 4 && projectScore > 0) {
    return "project_creation";
  }

  // Default: product search (safer default)
  return projectScore > attrScore ? "project_creation" : "product_search";
}

// Search products by matching query terms against name, tags, category, etc.
export function searchProducts(query: string, products: DBProduct[]): {
  recommended: DBProduct[];
  similar: DBProduct[];
  compatible: DBProduct[];
} {
  const lower = query.toLowerCase();
  const terms = lower.split(/\s+/).filter(t => t.length > 2);

  // Weight hierarchy: product_type > color > material > style > use_case > popularity
  const WEIGHTS = {
    category: 5.0,
    color: 4.5,
    material: 4.0,
    style: 3.5,
    use_case: 3.0,
    name: 3.0,
    subcategory: 2.5,
    popularity: 2.0,
    priority: 1.5,
  };

  const scored = products.map(product => {
    let score = 0;

    // Category match (strongest signal)
    for (const term of terms) {
      if (product.category.toLowerCase().includes(term)) score += WEIGHTS.category;
      if (product.subcategory?.toLowerCase().includes(term)) score += WEIGHTS.subcategory;
    }

    // Name match
    for (const term of terms) {
      if (product.name.toLowerCase().includes(term)) score += WEIGHTS.name;
    }

    // Color match
    for (const term of terms) {
      if (product.main_color?.toLowerCase().includes(term)) score += WEIGHTS.color;
      if (product.secondary_color?.toLowerCase().includes(term)) score += WEIGHTS.color * 0.6;
    }

    // Material tags
    for (const term of terms) {
      for (const tag of product.material_tags) {
        if (tag.toLowerCase().includes(term)) score += WEIGHTS.material;
      }
    }

    // Style tags
    for (const term of terms) {
      for (const tag of product.style_tags) {
        if (tag.toLowerCase().includes(term)) score += WEIGHTS.style;
      }
    }

    // Use case, ambience, palette tags
    const contextTags = [
      ...product.ambience_tags,
      ...product.palette_tags,
      ...product.use_case_tags,
    ];
    for (const term of terms) {
      for (const tag of contextTags) {
        if (tag.toLowerCase().includes(term)) score += WEIGHTS.use_case;
      }
    }

    // Technical tags
    for (const term of terms) {
      for (const tag of product.technical_tags) {
        if (tag.toLowerCase().includes(term)) score += WEIGHTS.use_case * 0.5;
      }
    }

    // Boost by priority and popularity
    score += product.priority_score * (WEIGHTS.priority * 0.1);
    score += product.popularity_score * (WEIGHTS.popularity * 0.1);

    return { product, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const recommended = scored.filter(s => s.score > 0).slice(0, 8).map(s => s.product);

  // If we found a top product, find similar (same category/style) and compatible (complementary category)
  const topProduct = recommended[0];
  let similar: DBProduct[] = [];
  let compatible: DBProduct[] = [];

  if (topProduct) {
    // Similar = same category or product_family, not in recommended
    const recIds = new Set(recommended.map(p => p.id));
    similar = products
      .filter(p => !recIds.has(p.id) && (
        p.category === topProduct.category ||
        (p.product_family && p.product_family === topProduct.product_family)
      ))
      .slice(0, 4);

    // Compatible = complementary categories
    const COMPAT_MAP: Record<string, string[]> = {
      chair: ["table", "parasol"],
      armchair: ["table", "parasol", "sofa"],
      stool: ["high_table"],
      table: ["chair", "armchair"],
      high_table: ["stool"],
      sofa: ["table", "parasol"],
      sun_lounger: ["parasol"],
      parasol: ["chair", "armchair", "sun_lounger", "sofa"],
    };

    const compatCategories = COMPAT_MAP[topProduct.category] || [];
    const compatIds = new Set([...recIds, ...similar.map(p => p.id)]);
    compatible = products
      .filter(p => !compatIds.has(p.id) && compatCategories.includes(p.category))
      .sort((a, b) => {
        // Prefer products that share style tags with top product
        const aShared = a.style_tags.filter(t => topProduct.style_tags.includes(t)).length;
        const bShared = b.style_tags.filter(t => topProduct.style_tags.includes(t)).length;
        return bShared - aShared;
      })
      .slice(0, 4);
  }

  return { recommended, similar, compatible };
}
