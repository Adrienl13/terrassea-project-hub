import type { DBProduct, ProductTypeTags } from "@/lib/products";

export type SearchIntent = "product_search" | "project_creation";

// ═══════════════════════════════════════════════════════════
// TERM NORMALIZATION
// Maps user input (any language) → internal slugs
// This is the ONLY place where language translation happens.
// The engine always works with slugs after this step.
// ═══════════════════════════════════════════════════════════

const TERM_TO_CATEGORY_SLUG: Record<string, string> = {
  // ── EN ──
  chair: "chairs", chairs: "chairs",
  armchair: "armchairs", armchairs: "armchairs",
  table: "tables", tables: "tables",
  stool: "bar stools", stools: "bar stools",
  "bar stool": "bar stools", barstool: "bar stools", barstools: "bar stools",
  sofa: "lounge seating", sofas: "lounge seating",
  couch: "lounge seating", sectional: "lounge seating",
  bench: "benches", benches: "benches",
  banquette: "lounge seating",
  parasol: "parasols", parasols: "parasols",
  umbrella: "parasols", sunshade: "parasols",
  "shade sail": "parasols", pergola: "parasols",
  lounger: "sun loungers", loungers: "sun loungers",
  "sun lounger": "sun loungers", "sun loungers": "sun loungers",
  sunbed: "sun loungers", "sun bed": "sun loungers",
  daybed: "sun loungers", daybeds: "sun loungers",
  "chaise longue": "sun loungers", "chaise lounge": "sun loungers",
  cushion: "accessories", cushions: "accessories",
  planter: "accessories", planters: "accessories",
  pot: "accessories", pots: "accessories",
  cover: "accessories", covers: "accessories",
  "furniture cover": "accessories",
  "parasol base": "accessories", "umbrella base": "accessories",
  screen: "accessories", "privacy screen": "accessories",
  // ── FR ──
  chaise: "chairs", chaises: "chairs",
  fauteuil: "armchairs", fauteuils: "armchairs",
  tabouret: "bar stools", tabourets: "bar stools",
  canapé: "lounge seating", canape: "lounge seating",
  canapés: "lounge seating", canapes: "lounge seating",
  banquettes: "lounge seating",
  méridienne: "lounge seating", meridienne: "lounge seating",
  banc: "benches", bancs: "benches",
  "voile d'ombrage": "parasols", "voile ombrage": "parasols",
  tonnelle: "parasols",
  transat: "sun loungers", transats: "sun loungers",
  "bain de soleil": "sun loungers", "bains de soleil": "sun loungers",
  "lit de jour": "sun loungers",
  coussin: "accessories", coussins: "accessories",
  jardinière: "accessories", jardiniere: "accessories",
  jardinières: "accessories", jardinieres: "accessories",
  housse: "accessories", housses: "accessories",
  "pied de parasol": "accessories",
  "brise-vue": "accessories",
  // ── IT ──
  sedia: "chairs", sedie: "chairs",
  poltrona: "armchairs", poltrone: "armchairs",
  tavolo: "tables", tavoli: "tables",
  sgabello: "bar stools", sgabelli: "bar stools",
  divano: "lounge seating", divani: "lounge seating",
  panca: "benches", panche: "benches", panchina: "benches",
  ombrellone: "parasols", ombrelloni: "parasols",
  "vela ombreggiante": "parasols",
  lettino: "sun loungers", lettini: "sun loungers",
  "lettino prendisole": "sun loungers",
  sdraio: "sun loungers",
  cuscino: "accessories", cuscini: "accessories",
  vaso: "accessories", vasi: "accessories",
  telo: "accessories", "copertura": "accessories",
  // ── ES ──
  silla: "chairs", sillas: "chairs",
  sillón: "armchairs", sillon: "armchairs", sillones: "armchairs",
  mesa: "tables", mesas: "tables",
  taburete: "bar stools", taburetes: "bar stools",
  sofá: "lounge seating",
  banco: "benches", bancos: "benches",
  sombrilla: "parasols", sombrillas: "parasols",
  "vela de sombra": "parasols", pérgola: "parasols",
  tumbona: "sun loungers", tumbonas: "sun loungers",
  hamaca: "sun loungers",
  cojín: "accessories", cojin: "accessories", cojines: "accessories",
  maceta: "accessories", macetas: "accessories",
  funda: "accessories", fundas: "accessories",
  "base de sombrilla": "accessories",
  // ── DE ──
  stuhl: "chairs", stühle: "chairs", stuhle: "chairs",
  sessel: "armchairs",
  tisch: "tables", tische: "tables",
  hocker: "bar stools", barhocker: "bar stools",
  bank: "benches", bänke: "benches",
  sonnenschirm: "parasols", sonnensegel: "parasols",
  liege: "sun loungers", sonnenliege: "sun loungers", sonnenliegen: "sun loungers",
  kissen: "accessories", blumentopf: "accessories",
  schutzhülle: "accessories", schirmständer: "accessories",
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
  ivory: "ivory",
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
  sabbia: "sand", avorio: "ivory", ruggine: "rust",
  // ES
  azul: "blue", blanco: "white", negro: "black",
  rojo: "red",
  arena: "sand", marfil: "ivory", óxido: "rust",
  // DE
  blau: "blue", weiß: "white", weiss: "white",
  schwarz: "black", grau: "grey", grün: "green",
};

// Style/material terms → style_tags slugs
const TERM_TO_STYLE_SLUG: Record<string, string> = {
  // EN
  bistro: "bistro", bistrot: "bistro",
  mediterranean: "mediterranean", modern: "modern", contemporary: "modern",
  industrial: "industrial", natural: "natural", organic: "natural",
  luxury: "luxury", premium: "luxury",
  coastal: "coastal", seaside: "coastal", nautical: "coastal",
  lounge: "lounge", scandinavian: "scandinavian", nordic: "scandinavian",
  vintage: "vintage", retro: "vintage",
  tropical: "tropical", exotic: "tropical",
  classic: "classic", traditional: "classic", timeless: "classic",
  minimal: "minimal", minimalist: "minimal",
  bohemian: "bohemian", boho: "bohemian",
  farmhouse: "farmhouse", rustic: "farmhouse",
  resort: "resort", "art deco": "art-deco", artdeco: "art-deco",
  japandi: "japandi", maximalist: "maximalist", event: "event",
  "ski chalet": "ski-chalet", chalet: "ski-chalet",
  // FR
  bistrotisch: "bistro",
  méditerranéen: "mediterranean", méditerranéenne: "mediterranean", mediterranéen: "mediterranean",
  moderne: "modern", contemporain: "modern",
  industriel: "industrial", industrielle: "industrial",
  naturel: "natural", naturelle: "natural",
  luxe: "luxury", luxueux: "luxury",
  côtier: "coastal", "bord de mer": "coastal",
  scandinave: "scandinavian", nordique: "scandinavian",
  classique: "classic", minimaliste: "minimal",
  bohème: "bohemian", champêtre: "farmhouse",
  exotique: "tropical",
  // IT
  mediterraneo: "mediterranean", moderno: "modern",
  industriale: "industrial", naturale: "natural",
  lusso: "luxury", costiero: "coastal",
  scandinavo: "scandinavian", classico: "classic",
  minimalista: "minimal", boemo: "bohemian",
  tropicale: "tropical", rustico: "farmhouse",
  // ES
  mediterráneo: "mediterranean",
  contemporáneo: "modern",
  lujo: "luxury",
  costero: "coastal", escandinavo: "scandinavian",
  clásico: "classic", clasico: "classic",
  bohemio: "bohemian",
  rústico: "farmhouse",
  // DE
  mediterran: "mediterranean",
  industriell: "industrial", natürlich: "natural",
  luxuriös: "luxury", skandinavisch: "scandinavian",
  klassisch: "classic", minimalistisch: "minimal",
};

// Material terms → material_tags slugs
const TERM_TO_MATERIAL_SLUG: Record<string, string> = {
  // EN
  aluminium: "aluminium", aluminum: "aluminium", alu: "aluminium",
  teak: "teak", teck: "teak",
  rope: "rope", cord: "rope",
  rattan: "synthetic-rattan", wicker: "synthetic-rattan",
  polypropylene: "polypropylene", pp: "polypropylene", plastic: "polypropylene",
  resin: "resin", hdpe: "resin",
  textilene: "textilene", batyline: "textilene",
  steel: "steel", iron: "steel", "stainless steel": "steel",
  wood: "wood", timber: "wood",
  hpl: "hpl", compact: "hpl", trespa: "hpl", werzalit: "hpl",
  marble: "marble-effect", granite: "marble-effect", ceramic: "marble-effect",
  fabric: "fabric", sunbrella: "fabric", acrylic: "fabric",
  concrete: "concrete", bamboo: "bamboo", eucalyptus: "eucalyptus",
  glass: "glass", "tempered glass": "glass",
  oak: "oak", iroko: "iroko",
  // FR
  corde: "rope", rotin: "synthetic-rattan", osier: "synthetic-rattan",
  polypropylène: "polypropylene", résine: "resin", resine: "resin",
  textilène: "textilene", acier: "steel", fer: "steel", inox: "steel",
  bois: "wood", tissu: "fabric", toile: "fabric",
  béton: "concrete", beton: "concrete", marbre: "marble-effect",
  bambou: "bamboo", verre: "glass", chêne: "oak", chene: "oak",
  // IT
  corda: "rope", alluminio: "aluminium", legno: "wood",
  vimini: "synthetic-rattan",
  acciaio: "steel", ferro: "steel",
  tessuto: "fabric", vetro: "glass", ceramica: "marble-effect",
  cemento: "concrete", bambù: "bamboo", bambu: "bamboo",
  quercia: "oak",
  // ES
  cuerda: "rope", teca: "teak", aluminio: "aluminium",
  madera: "wood", mimbre: "synthetic-rattan", ratán: "synthetic-rattan",
  acero: "steel", hierro: "steel",
  tejido: "fabric", tela: "fabric", vidrio: "glass",
  hormigón: "concrete", hormigon: "concrete", mármol: "marble-effect", marmol: "marble-effect",
  bambú: "bamboo", roble: "oak",
  // DE
  stahl: "steel", holz: "wood", seil: "rope",
  geflecht: "synthetic-rattan", kunststoff: "polypropylene",
  glas: "glass", marmor: "marble-effect",
  eiche: "oak", bambus: "bamboo",
};

// Use-case terms → use_case_tags slugs
const TERM_TO_USE_CASE_SLUG: Record<string, string> = {
  // EN
  "beach club": "beach-club", beachclub: "beach-club",
  "pool deck": "pool-deck", poolside: "pool-deck", pool: "pool-deck",
  rooftop: "rooftop", "roof terrace": "rooftop",
  "hotel patio": "hotel-patio", "hotel terrace": "hotel-patio",
  "hotel garden": "hotel-garden",
  "hotel lobby": "hotel-lobby",
  "restaurant terrace": "restaurant-terrace",
  brasserie: "high-volume-brasserie",
  café: "cafe-frontage", cafe: "cafe-frontage", coffee: "cafe-frontage",
  "lounge area": "lounge-area", "lounge zone": "lounge-area",
  spa: "spa-wellness", wellness: "spa-wellness",
  vineyard: "vineyard-winery", winery: "vineyard-winery",
  glamping: "glamping", camping: "camping-glamping",
  "cruise ship": "cruise-ship-deck", cruise: "cruise-ship-deck",
  "private club": "private-club", club: "private-club",
  brewery: "brewery-taproom", taproom: "brewery-taproom",
  "food truck": "food-truck-market", market: "food-truck-market",
  "ski resort": "ski-resort-terrace",
  event: "event-dining", "event space": "event-dining",
  coworking: "co-working-outdoor",
  airport: "airport-lounge",
  garden: "garden-restaurant",
  // FR
  "terrasse restaurant": "restaurant-terrace",
  piscine: "pool-deck", "bord de piscine": "pool-deck",
  "toit-terrasse": "rooftop",
  "club de plage": "beach-club", plage: "beach-club",
  jardin: "garden-restaurant", "jardin hôtel": "hotel-garden",
  "hall hôtel": "hotel-lobby", "lobby": "hotel-lobby",
  vignoble: "vineyard-winery", domaine: "vineyard-winery",
  évènementiel: "event-dining", événementiel: "event-dining",
  // IT
  "terrazza ristorante": "restaurant-terrace",
  piscina: "pool-deck", spiaggia: "beach-club",
  "terrazza hotel": "hotel-patio", "giardino hotel": "hotel-garden",
  vigneto: "vineyard-winery", cantina: "vineyard-winery",
  birreria: "brewery-taproom",
  // ES
  "terraza restaurante": "restaurant-terrace",
  playa: "beach-club",
  "club de playa": "beach-club",
  "terraza hotel": "hotel-patio", "jardín hotel": "hotel-garden",
  viñedo: "vineyard-winery", bodega: "vineyard-winery",
  cervecería: "brewery-taproom",
  // DE
  "strandclub": "beach-club",
  dachterrasse: "rooftop", biergarten: "brewery-taproom",
  weingut: "vineyard-winery",
};

// ── Normalized query structure ────────────────────────────

interface NormalizedQuery {
  originalTerms:  string[];
  categorySlug:   string | null;   // "chairs" | "tables" | ...
  colorSlugs:     string[];
  styleSlugs:     string[];
  materialSlugs:  string[];
  useCaseSlugs:   string[];
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
  const useCaseSlugs:  string[] = [];
  const rawTerms:     string[] = [];

  // Check multi-word terms first (across all dictionaries)
  const multiWordMaps: { dict: Record<string, string>; type: "category" | "material" | "useCase" }[] = [
    { dict: TERM_TO_CATEGORY_SLUG, type: "category" },
    { dict: TERM_TO_MATERIAL_SLUG, type: "material" },
    { dict: TERM_TO_USE_CASE_SLUG, type: "useCase" },
  ];

  let processedLower = lower;
  for (const { dict, type } of multiWordMaps) {
    const multiWordTerms = Object.keys(dict)
      .filter(k => k.includes(" "))
      .sort((a, b) => b.length - a.length);
    for (const term of multiWordTerms) {
      if (processedLower.includes(term)) {
        if (type === "category" && !categorySlug) categorySlug = dict[term];
        else if (type === "material") materialSlugs.push(dict[term]);
        else if (type === "useCase") useCaseSlugs.push(dict[term]);
        processedLower = processedLower.replace(term, "");
      }
    }
  }

  // Process individual tokens
  const remainingTokens = processedLower.split(/\s+/).filter(t => t.length > 1);
  for (const token of remainingTokens) {
    const clean = token.replace(/[^a-zàâäéèêëîïôùûüœæçñáíóúü]/gi, "");
    if (!clean) continue;

    if (!categorySlug && TERM_TO_CATEGORY_SLUG[clean]) {
      categorySlug = TERM_TO_CATEGORY_SLUG[clean];
    } else if (TERM_TO_COLOR_SLUG[clean]) {
      colorSlugs.push(TERM_TO_COLOR_SLUG[clean]);
    } else if (TERM_TO_STYLE_SLUG[clean]) {
      styleSlugs.push(TERM_TO_STYLE_SLUG[clean]);
    } else if (TERM_TO_MATERIAL_SLUG[clean]) {
      materialSlugs.push(TERM_TO_MATERIAL_SLUG[clean]);
    } else if (TERM_TO_USE_CASE_SLUG[clean]) {
      useCaseSlugs.push(TERM_TO_USE_CASE_SLUG[clean]);
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
    useCaseSlugs,
    rawTerms,
    preferComplete,
  };
}

// ═══════════════════════════════════════════════════════════
// INTENT DETECTION
// ═══════════════════════════════════════════════════════════

const PROJECT_CREATION_SIGNALS = [
  // EN
  "terrace", "project", "design", "layout", "concept", "atmosphere",
  "furnish", "equip", "full setup", "inspiration", "ensemble",
  "rooftop", "beach club", "hotel", "camping", "glamping",
  "restaurant", "bistro", "spa", "pool deck",
  // FR
  "terrasse", "projet", "aménagement", "ambiance", "aménager",
  "équiper", "meubler", "décorer", "hôtel",
  "bord de mer", "piscine", "bistrot",
  // IT
  "progetto", "arredare", "terrazza", "allestimento",
  "ristorante", "albergo", "spiaggia",
  // ES
  "proyecto", "terraza", "amueblar", "equipar", "diseño",
  "restaurante", "playa",
  // DE
  "projekt", "terrasse", "einrichten", "ausstattung",
];

export function detectIntent(query: string): SearchIntent {
  const lower = query.toLowerCase();
  const norm  = normalizeQuery(query);

  // Strong signal: explicit product type → product search
  if (norm.categorySlug) return "product_search";

  // Capacity mentions → project creation (multilingual)
  if (/\d+\s*(seats?|places?|covers?|pax|couverts?|posti|plazas?|coperti|Plätze|Sitzplätze|personnes?)/i.test(query)) {
    return "project_creation";
  }
  // Surface mentions → project creation
  if (/\d+\s*(m²|sqm|mq|m2)/i.test(query)) {
    return "project_creation";
  }

  let attrScore    = 0;
  let projectScore = 0;

  for (const _slug of [...norm.colorSlugs, ...norm.materialSlugs]) {
    attrScore++;
  }
  // Use-case terms without a category lean toward project creation
  if (norm.useCaseSlugs.length > 0 && !norm.categorySlug) {
    projectScore += norm.useCaseSlugs.length;
  } else {
    attrScore += norm.useCaseSlugs.length;
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
    technical:       2.0,  // technical tag match
    availability:    1.5,  // in-stock bonus
    popularity:      1.5,
    priority:        1.0,
    dataQuality:     1.0,  // multiplicative quality factor
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
      // Ambience tags often correlate with style searches
      if (product.ambience_tags.includes(styleSlug)) score += W.style * 0.4;
    }

    // ── Ambience match (from raw terms) ───────────────────
    const AMBIENCE_TERMS: Record<string, string> = {
      cozy: "warm", cosy: "warm", chaleureux: "warm", accogliente: "warm", acogedor: "warm",
      elegant: "elegant", élégant: "elegant", elegante: "elegant",
      relaxed: "relaxed", décontracté: "relaxed", rilassato: "relaxed", relajado: "relaxed",
      festive: "festive", festif: "festive", festivo: "festive",
      intimate: "intimate", intime: "intimate", intimo: "intimate", íntimo: "intimate",
      bright: "bright", lumineux: "bright", luminoso: "bright",
      refined: "refined", raffiné: "refined", raffinato: "refined", refinado: "refined",
      convivial: "convivial", conviviale: "convivial",
    };
    for (const term of norm.rawTerms) {
      const ambienceSlug = AMBIENCE_TERMS[term];
      if (ambienceSlug && product.ambience_tags.includes(ambienceSlug)) {
        score += W.style * 0.6;
      }
    }

    // ── Material match ──────────────────────────────────────
    for (const matSlug of norm.materialSlugs) {
      if (product.material_tags.includes(matSlug)) score += W.material;
    }

    // ── Use-case match ────────────────────────────────────
    for (const ucSlug of norm.useCaseSlugs) {
      if (product.use_case_tags.includes(ucSlug)) score += W.use_case;
    }

    // ── Technical tag match via raw terms ──────────────────
    for (const term of norm.rawTerms) {
      if (term.length < 3) continue;
      for (const tag of product.technical_tags) {
        if (tag.includes(term) || term.includes(tag.replace(/-/g, ""))) {
          score += W.technical;
        }
      }
    }

    // ── Availability bonus — prefer in-stock products ──────
    if (product.availability_type === "available" || product.stock_status === "in_stock") {
      score += W.availability;
    }

    // ── Cross-attribute bonus — multiple signals align ──────
    const signalCount = [
      norm.categorySlug ? 1 : 0,
      norm.colorSlugs.length > 0 ? 1 : 0,
      norm.styleSlugs.length > 0 ? 1 : 0,
      norm.materialSlugs.length > 0 ? 1 : 0,
      norm.useCaseSlugs.length > 0 ? 1 : 0,
    ].reduce((a, b) => a + b, 0);
    // When user provides 3+ distinct signal types, matched products get a synergy bonus
    if (signalCount >= 3 && score > 0) score += 2.0;

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

    // ── Description fallback for raw terms ──────────────────
    if (norm.rawTerms.length > 0 && product.short_description) {
      const descLower = product.short_description.toLowerCase();
      for (const term of norm.rawTerms) {
        if (term.length >= 4 && descLower.includes(term)) score += W.name * 0.5;
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

  // ── Archetype dedup — avoid showing product variants ────
  const recommended: DBProduct[] = [];
  const usedArchetypes = new Set<string>();
  for (const { product, score } of scored) {
    if (score <= 0) break;
    if (recommended.length >= 8) break;
    const archetypeKey = product.archetype_id || product.id;
    if (usedArchetypes.has(archetypeKey)) continue;
    recommended.push(product);
    usedArchetypes.add(archetypeKey);
  }

  // ── Zero-results fallback — relax criteria ──────────────
  if (recommended.length === 0 && products.length > 0) {
    // Fallback 1: try matching just by raw terms in name
    const fallback = products
      .filter(p => {
        const nameLower = p.name.toLowerCase();
        return norm.rawTerms.some(t => t.length >= 3 && nameLower.includes(t))
          || norm.originalTerms.some(t => t.length >= 3 && nameLower.includes(t));
      })
      .slice(0, 4);
    if (fallback.length > 0) {
      recommended.push(...fallback);
    } else {
      // Fallback 2: show most popular products
      const popular = [...products]
        .sort((a, b) => (b.popularity_score ?? 0) - (a.popularity_score ?? 0))
        .slice(0, 4);
      recommended.push(...popular);
    }
  }

  // ── Similar & compatible ────────────────────────────────
  const topProduct = recommended[0];
  let similar:    DBProduct[] = [];
  let compatible: DBProduct[] = [];

  if (topProduct) {
    const recIds = new Set(recommended.map(p => p.id));
    const topCat = topProduct.category.toLowerCase();

    // Affinity scorer — how similar is a product to the top result?
    const affinityScore = (p: DBProduct): number => {
      let aff = 0;
      aff += p.style_tags.filter(t => topProduct.style_tags.includes(t)).length * 2;
      aff += p.material_tags.filter(t => topProduct.material_tags.includes(t)).length * 1.5;
      aff += p.ambience_tags.filter(t => topProduct.ambience_tags.includes(t)).length;
      if (p.main_color && topProduct.main_color && p.main_color === topProduct.main_color) aff += 2;
      if (p.availability_type === "available") aff += 0.5;
      return aff;
    };

    // Similar = same category (excluding bases/tops if top is complete)
    similar = products
      .filter(p => {
        if (recIds.has(p.id)) return false;
        if (p.category.toLowerCase() !== topCat) return false;
        const ptt: ProductTypeTags = p.product_type_tags || {};
        if (norm.preferComplete && (ptt.table_type === "base-only" || ptt.table_type === "top-only")) return false;
        return true;
      })
      .sort((a, b) => affinityScore(b) - affinityScore(a))
      .slice(0, 4);

    // Compatible = complementary categories (case-insensitive)
    const COMPAT_MAP: Record<string, string[]> = {
      chairs:           ["tables", "parasols", "accessories"],
      armchairs:        ["tables", "parasols", "lounge seating", "accessories"],
      "bar stools":     ["tables", "accessories"],
      tables:           ["chairs", "armchairs", "parasols", "accessories"],
      "lounge seating": ["tables", "parasols", "accessories"],
      "sun loungers":   ["parasols", "accessories"],
      parasols:         ["chairs", "armchairs", "sun loungers", "lounge seating", "accessories"],
      benches:          ["tables", "parasols"],
      accessories:      ["chairs", "tables", "parasols"],
    };

    const compatCategories = COMPAT_MAP[topCat] || COMPAT_MAP[norm.categorySlug || ""] || [];
    const compatIds = new Set([...recIds, ...similar.map(p => p.id)]);

    compatible = products
      .filter(p => {
        if (compatIds.has(p.id)) return false;
        const pCat = p.category.toLowerCase();
        return compatCategories.some(c => pCat.includes(c.replace(/s$/, "")) || c.includes(pCat.replace(/s$/, "")));
      })
      .sort((a, b) => affinityScore(b) - affinityScore(a))
      .slice(0, 4);
  }

  return { recommended, similar, compatible };
}

// ── Export normalization helpers for use in other modules ──
export { normalizeQuery, TERM_TO_COLOR_SLUG, TERM_TO_CATEGORY_SLUG, TERM_TO_USE_CASE_SLUG };
