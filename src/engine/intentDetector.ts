import type { DBProduct } from "@/lib/products";

export type SearchIntent = "product_search" | "project_creation";

const PRODUCT_SEARCH_SIGNALS = [
  "chair", "chairs", "table", "tables", "stool", "stools", "parasol", "parasols",
  "sun lounger", "lounger", "price", "model", "replace", "buy", "purchase",
  "armchair", "sofa", "barstool", "bench", "cushion", "planter",
  "stackable", "folding", "HPL", "textilene", "polypropylene",
];

const PROJECT_CREATION_SIGNALS = [
  "terrace", "project", "design", "layout", "seats", "concept", "atmosphere",
  "style", "ambience", "aménagement", "décoration", "furnish", "equip",
  "complete", "full setup", "inspiration", "collection", "ensemble",
  "mediterranean", "bistro", "lounge", "rooftop", "beach club",
];

export function detectIntent(query: string): SearchIntent {
  const lower = query.toLowerCase();
  
  let productScore = 0;
  let projectScore = 0;

  for (const signal of PRODUCT_SEARCH_SIGNALS) {
    if (lower.includes(signal)) productScore++;
  }

  for (const signal of PROJECT_CREATION_SIGNALS) {
    if (lower.includes(signal)) projectScore++;
  }

  // Capacity mentions strongly suggest project
  if (/\d+\s*(seats?|places?|covers?|pax|couverts?)/i.test(query)) {
    projectScore += 3;
  }

  // Short queries with just a product noun → product search
  const wordCount = query.trim().split(/\s+/).length;
  if (wordCount <= 3 && productScore > 0 && projectScore === 0) {
    productScore += 2;
  }

  // Longer queries lean toward project
  if (wordCount >= 5 && projectScore > 0) {
    projectScore += 1;
  }

  return projectScore > productScore ? "project_creation" : "product_search";
}

// Search products by matching query terms against name, tags, category, etc.
export function searchProducts(query: string, products: DBProduct[]): {
  recommended: DBProduct[];
  similar: DBProduct[];
  compatible: DBProduct[];
} {
  const lower = query.toLowerCase();
  const terms = lower.split(/\s+/).filter(t => t.length > 2);

  const scored = products.map(product => {
    let score = 0;

    // Name match
    for (const term of terms) {
      if (product.name.toLowerCase().includes(term)) score += 5;
    }

    // Category match
    for (const term of terms) {
      if (product.category.toLowerCase().includes(term)) score += 4;
      if (product.subcategory?.toLowerCase().includes(term)) score += 3;
    }

    // Tag matches
    const allTags = [
      ...product.style_tags,
      ...product.material_tags,
      ...product.palette_tags,
      ...product.ambience_tags,
      ...product.use_case_tags,
      ...product.technical_tags,
    ];

    for (const term of terms) {
      for (const tag of allTags) {
        if (tag.toLowerCase().includes(term)) score += 2;
      }
    }

    // Color match
    for (const term of terms) {
      if (product.main_color?.toLowerCase().includes(term)) score += 3;
      if (product.secondary_color?.toLowerCase().includes(term)) score += 2;
    }

    // Boost by priority and popularity
    score += product.priority_score * 0.5;
    score += product.popularity_score * 0.3;

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
