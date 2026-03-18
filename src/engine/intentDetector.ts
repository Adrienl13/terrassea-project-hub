import type { DBProduct, ProductTypeTags } from "@/lib/products";

export type SearchIntent = "product_search" | "project_creation";

// ═══════════════════════════════════════════════════════════
// TERM NORMALIZATION
// Maps user input (any language) → internal slugs
// This is the ONLY place where language translation happens.
// The engine always works with slugs after this step.
// ═══════════════════════════════════════════════════════════

const TERM_TO_CATEGORY_SLUG: Record<string, string> = {
  // EN
  chair: "chairs", chairs: "chairs",
  armchair: "armchairs", armchairs: "armchairs",
  table: "tables", tables: "tables",
  stool: "bar stools", stools: "bar stools",
  "bar stool": "bar stools", barstool: "bar stools", barstools: "bar stools",
  sofa: "lounge seating", sofas: "lounge seating",
  bench: "benches", benches: "benches",
  parasol: "parasols", parasols: "parasols",
  umbrella: "parasols",
  lounger: "sun loungers", loungers: "sun loungers",
  "sun lounger": "sun loungers", daybed: "sun loungers",
  cushion: "accessories", cushions: "accessories",
  planter: "accessories", planters: "accessories",
  // FR
  chaise: "chairs", chaises: "chairs",
  fauteuil: "armchairs", fauteuils: "armchairs",
  tabouret: "bar stools", tabourets: "bar stools",
  canapé: "lounge seating", canape: "lounge seating",
  banc: "benches", bancs: "benches",
  transat: "sun loungers", transats: "sun loungers",
  "bain de soleil": "sun loungers",
  coussin: "accessories", coussins: "accessories",
  jardinière: "accessories", jardiniere: "accessories",
  // IT
  sedia: "chairs", sedie: "chairs",
  poltrona: "armchairs", poltrone: "armchairs",
  tavolo: "tables", tavoli: "tables",
  sgabello: "bar stools",
  divano: "lounge seating",
  ombrellone: "parasols",
  // ES
  silla: "chairs", sillas: "chairs",
  sillón: "armchairs", sillon: "armchairs",
  mesa: "tables", mesas: "tables",
  taburete: "bar stools",
  sofá: "lounge seating",
  // DE
  stuhl: "chairs", stühle: "chairs", stuhle: "chairs",
  sessel: "armchairs",
  tisch: "tables", tische: "tables",
  hocker: "bar stools",
  sonnenschirm: "parasols",
};

// Color terms → color slugs (used in DB as main_color)
const TERM_TO_COLOR_SLUG: Record<string, string> = {
  // EN
  blue: "blue", navy: "navy", white: "white", black: "black",
  grey: "grey", gray: "grey", anthracite: "anthracite",
  terracotta: "terracotta", sand: "sand", natural: "natural",
  beige: "beige", cream: "cream", green: "green", sage: "sage",
  olive: "olive", red: "red", rust: "rust", gold: "gold",
  bronze: "bronze", teak: "teak", walnut: "walnut",
  brown: "dark-brown", taupe: "taupe", silver: "silver",
  copper: "copper", yellow: "yellow", mustard: "mustard",
  // FR
  bleu: "blue", bleue: "blue", marine: "navy",
  blanc: "white", blanche: "white",
  noir: "black", noire: "black",
  gris: "grey", grise: "grey",
  vert: "green", verte: "green",
  rouge: "red", rouille: "rust",
  sable: "sand", naturel: "natural",
  // IT
  blu: "blue", bianco: "white", nero: "black",
  grigio: "grey", verde: "green", rosso: "red",
  // ES
  azul: "blue", blanco: "white", negro: "black",
  rojo: "red",
  // DE
  blau: "blue", weiß: "white", weiss: "white",
  schwarz: "black", grau: "grey", grün: "green",
};

// Style/material terms → style_tags slugs
const TERM_TO_STYLE_SLUG: Record<string, string> = {
  bistro: "bistro", bistrot: "bistro", bistrotisch: "bistro",
  mediterranean: "mediterranean", méditerranéen: "mediterranean",
  modern: "modern", moderne: "modern",
  industrial: "industrial", industriel: "industrial",
  natural: "natural", naturel: "natural",
  luxury: "luxury", luxe: "luxury",
  coastal: "coastal", côtier: "coastal",
  lounge: "lounge", scandinave: "scandinavian",
  scandinavian: "scandinavian", nordic: "scandinavian",
  vintage: "vintage", tropical: "tropical",
  classic: "classic", classique: "classic",
  minimal: "minimal", minimaliste: "minimal",
};

// Material terms → material_tags slugs
const TERM_TO_MATERIAL_SLUG: Record<string, string> = {
  aluminium: "aluminium", aluminum: "aluminium", alu: "aluminium",
  teak: "teak", teck: "teak",
  rope: "rope", corde: "rope",
  rattan: "synthetic-rattan", rotin: "synthetic-rattan",
  wicker: "synthetic-rattan", osier: "synthetic-rattan",
  polypropylene: "polypropylene", polypropylène: "polypropylene", pp: "polypropylene",
  resin: "resin", résine: "resin",
  textilene: "textilene", textilène: "textilene",
  steel: "steel", acier: "steel", iron: "steel", fer: "steel",
  wood: "wood", bois: "wood",
  hpl: "hpl", marble: "marble-effect", marbre: "marble-effect",
  fabric: "fabric", tissu: "fabric", sunbrella: "fabric",
  concrete: "concrete", béton: "concrete",
};

// ── Normalized query structure ────────────────────────────

interface NormalizedQuery {
  originalTerms:  string[];
  categorySlug:   string | null;   // "chairs" | "tables" | ...
  colorSlugs:     string[];
  styleSlugs:     string[];
  materialSlugs:  string[];
  rawTerms:       string[];        // unmatched terms for fallback
  preferComplete: boolean;         // user said "table" (not "pied" or "plateau")
}

function normalizeQuery(query: string): NormalizedQuery {
  const lower = query.toLowerCase().trim();
  const tokens = lower.split(/\s+/).filter(t => t.length > 1);

  let categorySlug:   string | null = null;
  const colorSlugs:   string[] = [];
  const styleSlugs:   string[] = [];
  const materialSlugs: string[] = [];
  const rawTerms:     string[] = [];

  // Check multi-word terms first
  const multiWordTerms = Object.keys(TERM_TO_CATEGORY_SLUG)
    .filter(k => k.includes(" "))
    .sort((a, b) => b.length - a.length);

  let processedLower = lower;
  for (const term of multiWordTerms) {
    if (processedLower.includes(term)) {
      if (!categorySlug) categorySlug = TERM_TO_CATEGORY_SLUG[term];
      processedLower = processedLower.replace(term, "");
    }
  }

  // Process individual tokens
  for (const token of tokens) {
    const clean = token.replace(/[^a-zàâäéèêëîïôùûüœæç]/gi, "");
    if (!clean) continue;

    if (!categorySlug && TERM_TO_CATEGORY_SLUG[clean]) {
      categorySlug = TERM_TO_CATEGORY_SLUG[clean];
    } else if (TERM_TO_COLOR_SLUG[clean]) {
      colorSlugs.push(TERM_TO_COLOR_SLUG[clean]);
    } else if (TERM_TO_STYLE_SLUG[clean]) {
      styleSlugs.push(TERM_TO_STYLE_SLUG[clean]);
    } else if (TERM_TO_MATERIAL_SLUG[clean]) {
      materialSlugs.push(TERM_TO_MATERIAL_SLUG[clean]);
    } else {
      rawTerms.push(clean);
    }
  }

  // preferComplete = user said "table"/"tables" (not "pied", "base", "plateau", "top")
  const baseWords = ["pied", "base", "socle", "plateau", "top", "dessus", "dessous"];
  const preferComplete = categorySlug === "tables"
    && !baseWords.some(w => lower.includes(w));

  return {
    originalTerms: tokens,
    categorySlug,
    colorSlugs,
    styleSlugs,
    materialSlugs,
    rawTerms,
    preferComplete,
  };
}

// ═══════════════════════════════════════════════════════════
// INTENT DETECTION
// ═══════════════════════════════════════════════════════════

const PROJECT_CREATION_SIGNALS = [
  "terrace", "terrasse", "project", "projet", "design",
  "layout", "aménagement", "concept", "atmosphere", "ambiance",
  "furnish", "equip", "équiper", "meubler",
  "full setup", "inspiration", "ensemble",
  "rooftop", "beach club", "hotel", "hôtel", "camping", "glamping",
  "restaurant", "bistro", "bistrot",
];

export function detectIntent(query: string): SearchIntent {
  const lower = query.toLowerCase();
  const norm  = normalizeQuery(query);

  // Strong signal: explicit product type → product search
  if (norm.categorySlug) return "product_search";

  // Capacity mentions → project creation
  if (/\d+\s*(seats?|places?|covers?|pax|couverts?)/i.test(query)) {
    return "project_creation";
  }

  let attrScore    = 0;
  let projectScore = 0;

  for (const _slug of [...norm.colorSlugs, ...norm.materialSlugs]) {
    attrScore++;
  }
  for (const signal of PROJECT_CREATION_SIGNALS) {
    if (lower.includes(signal)) projectScore++;
  }

  if (projectScore > 0 && attrScore <= 1) return "project_creation";
  if (attrScore > 0 && projectScore === 0) return "product_search";

  const wordCount = query.trim().split(/\s+/).length;
  if (wordCount >= 4 && projectScore > 0) return "project_creation";

  return projectScore > attrScore ? "project_creation" : "product_search";
}

// ═══════════════════════════════════════════════════════════
// PRODUCT SEARCH
// Fixed: French/multi-lang normalization, complete table priority,
// color slug matching, case-insensitive categories, base/top penalty
// ═══════════════════════════════════════════════════════════

export function searchProducts(query: string, products: DBProduct[]): {
  recommended: DBProduct[];
  similar:     DBProduct[];
  compatible:  DBProduct[];
} {
  const norm  = normalizeQuery(query);

  // Weights — product_type is the strongest signal
  const W = {
    categoryExact:   8.0,  // category matches the search intent exactly
    categoryPartial: 4.0,
    colorExact:      5.0,  // main_color slug matches
    colorPartial:    2.5,  // color in available_colors or name
    material:        4.0,
    style:           3.5,
    use_case:        3.0,
    name:            3.0,
    subcategory:     2.5,
    popularity:      1.5,
    priority:        1.0,
    // Penalties
    baseOnlyPenalty: -6.0,  // penalize table bases when user wants "table"
    topOnlyPenalty:  -6.0,  // penalize tabletops when user wants "table"
  };

  const scored = products.map(product => {
    let score = 0;
    const catLower = (product.category || "").toLowerCase();
    const subLower = (product.subcategory || "").toLowerCase();
    const ptt: ProductTypeTags = product.product_type_tags || {};

    // ── Category match ──────────────────────────────────────
    if (norm.categorySlug) {
      // Exact: "chairs" matches category "Chairs"
      if (catLower === norm.categorySlug || catLower.startsWith(norm.categorySlug.replace(/s$/, ""))) {
        score += W.categoryExact;
      } else if (catLower.includes(norm.categorySlug.replace(/s$/, ""))) {
        score += W.categoryPartial;
      }

      // Penalize table bases and tops when user searched plain "table"
      if (norm.categorySlug === "tables" && norm.preferComplete) {
        if (ptt.table_type === "base-only") score += W.baseOnlyPenalty;
        if (ptt.table_type === "top-only")  score += W.topOnlyPenalty;
      }

      // Subcategory match
      if (subLower.includes(norm.categorySlug.replace(/s$/, ""))) {
        score += W.subcategory;
      }
    }

    // ── Color match — slug-first ────────────────────────────
    for (const colorSlug of norm.colorSlugs) {
      // main_color exact slug match
      if (product.main_color?.toLowerCase() === colorSlug) {
        score += W.colorExact;
      }
      // available_colors includes this slug
      if (product.available_colors?.includes(colorSlug)) {
        score += W.colorExact * 0.7;
      }
      // secondary_color
      if (product.secondary_color?.toLowerCase() === colorSlug) {
        score += W.colorPartial;
      }
      // name or description contains color term
      const colorTerms = Object.entries(TERM_TO_COLOR_SLUG)
        .filter(([, slug]) => slug === colorSlug)
        .map(([term]) => term);
      for (const term of colorTerms) {
        if (product.name.toLowerCase().includes(term)) score += W.colorPartial;
      }
    }

    // ── Style match ─────────────────────────────────────────
    for (const styleSlug of norm.styleSlugs) {
      if (product.style_tags.includes(styleSlug)) score += W.style;
    }

    // ── Material match ──────────────────────────────────────
    for (const matSlug of norm.materialSlugs) {
      if (product.material_tags.includes(matSlug)) score += W.material;
    }

    // ── Raw terms fallback — match against name/tags ────────
    for (const term of norm.rawTerms) {
      if (term.length < 3) continue;
      if (product.name.toLowerCase().includes(term))     score += W.name * 0.8;
      if (catLower.includes(term))                       score += W.categoryPartial * 0.5;
      for (const tag of [...product.style_tags, ...product.ambience_tags]) {
        if (tag.includes(term)) score += W.style * 0.5;
      }
      for (const tag of product.material_tags) {
        if (tag.includes(term)) score += W.material * 0.5;
      }
      for (const tag of product.use_case_tags) {
        if (tag.includes(term)) score += W.use_case * 0.5;
      }
    }

    // ── Boost by priority and popularity ───────────────────
    score += product.priority_score   * W.priority;
    score += product.popularity_score * W.popularity;

    // ── data_quality multiplicative ─────────────────────────
    const quality = product.data_quality_score ?? 0.5;
    score = score * (0.5 + quality * 0.5);

    return { product, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const recommended = scored
    .filter(s => s.score > 0)
    .slice(0, 8)
    .map(s => s.product);

  // ── Similar & compatible ────────────────────────────────
  const topProduct = recommended[0];
  let similar:    DBProduct[] = [];
  let compatible: DBProduct[] = [];

  if (topProduct) {
    const recIds = new Set(recommended.map(p => p.id));
    const topCat = topProduct.category.toLowerCase();

    // Similar = same category (excluding bases/tops if top is complete)
    similar = products
      .filter(p => {
        if (recIds.has(p.id)) return false;
        if (p.category.toLowerCase() !== topCat) return false;
        // If top product is a complete table, don't suggest bases in "similar"
        const ptt: ProductTypeTags = p.product_type_tags || {};
        if (norm.preferComplete && (ptt.table_type === "base-only" || ptt.table_type === "top-only")) return false;
        return true;
      })
      .sort((a, b) => {
        const aShared = a.style_tags.filter(t => topProduct.style_tags.includes(t)).length;
        const bShared = b.style_tags.filter(t => topProduct.style_tags.includes(t)).length;
        return bShared - aShared;
      })
      .slice(0, 4);

    // Compatible = complementary categories (case-insensitive)
    const COMPAT_MAP: Record<string, string[]> = {
      chairs:        ["tables", "parasols"],
      armchairs:     ["tables", "parasols", "lounge seating"],
      "bar stools":  ["tables"],
      tables:        ["chairs", "armchairs", "parasols"],
      "lounge seating": ["tables", "parasols"],
      "sun loungers":   ["parasols"],
      parasols:      ["chairs", "armchairs", "sun loungers", "lounge seating"],
    };

    const compatCategories = COMPAT_MAP[topCat] || COMPAT_MAP[norm.categorySlug || ""] || [];
    const compatIds = new Set([...recIds, ...similar.map(p => p.id)]);

    compatible = products
      .filter(p => {
        if (compatIds.has(p.id)) return false;
        const pCat = p.category.toLowerCase();
        return compatCategories.some(c => pCat.includes(c.replace(/s$/, "")) || c.includes(pCat.replace(/s$/, "")));
      })
      .sort((a, b) => {
        const aShared = a.style_tags.filter(t => topProduct.style_tags.includes(t)).length;
        const bShared = b.style_tags.filter(t => topProduct.style_tags.includes(t)).length;
        return bShared - aShared;
      })
      .slice(0, 4);
  }

  return { recommended, similar, compatible };
}

// ── Export normalization helpers for use in other modules ──
export { normalizeQuery, TERM_TO_COLOR_SLUG, TERM_TO_CATEGORY_SLUG };
