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
  "table base": "tables", "table top": "tables", tabletop: "tables",
  "table leg": "tables", "table legs": "tables", pedestal: "tables",
  "high table": "tables", "coffee table": "tables", "bar table": "tables",
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
  "pied de table": "tables", "pieds de table": "tables",
  "plateau de table": "tables", "plateaux de table": "tables",
  "table haute": "tables", "tables hautes": "tables",
  "table basse": "tables", "tables basses": "tables",
  "mange-debout": "tables",
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
  "piano tavolo": "tables", "base tavolo": "tables",
  "tavolo alto": "tables", "tavolino": "tables",
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
  "mesa alta": "tables", "mesa baja": "tables",
  "pie de mesa": "tables", "tablero": "tables",
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
  tischgestell: "tables", tischplatte: "tables",
  stehtisch: "tables", couchtisch: "tables", bartisch: "tables",
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
  brown: "brown", taupe: "taupe", silver: "silver",
  copper: "copper", yellow: "yellow", mustard: "mustard",
  ivory: "ivory", camel: "camel", tan: "camel",
  orange: "orange", coral: "coral", turquoise: "turquoise",
  pink: "pink", lavender: "lavender", lilac: "lavender",
  // FR
  bleu: "blue", bleue: "blue", marine: "navy",
  blanc: "white", blanche: "white",
  noir: "black", noire: "black",
  gris: "grey", grise: "grey",
  vert: "green", verte: "green",
  rouge: "red", rouille: "rust",
  sable: "sand", naturel: "natural", naturelle: "natural",
  marron: "brown", brun: "brown", brune: "brown",
  corail: "coral", rose: "pink",
  lavande: "lavender",
  // IT
  blu: "blue", bianco: "white", nero: "black",
  grigio: "grey", verde: "green", rosso: "red",
  sabbia: "sand", avorio: "ivory", ruggine: "rust",
  marrone: "brown", arancione: "orange",
  corallo: "coral", rosa: "pink", turchese: "turquoise",
  naturale: "natural", cammello: "camel", lavanda: "lavender",
  // ES
  azul: "blue", blanco: "white", negro: "black",
  rojo: "red", verde: "green",
  arena: "sand", marfil: "ivory", óxido: "rust",
  marrón: "brown", naranja: "orange",
  turquesa: "turquoise", rosado: "pink",
  // DE
  blau: "blue", weiß: "white", weiss: "white",
  schwarz: "black", grau: "grey", grün: "green",
  braun: "brown", rot: "red", gelb: "yellow",
  türkis: "turquoise",
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

// ── Word-boundary matching helper ────────────────────────
// Avoids false positives like "table" matching "comfortable"

function wordBoundaryMatch(haystack: string, term: string): boolean {
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[\\s\\-_/,.()])${esc}(?=[\\s\\-_/,.]|$)`, "i").test(haystack);
}

// ── Ambiguous terms (both color AND style) ───────────────
// Deferred during tokenization, resolved after full scan.

const AMBIGUOUS_TERMS: Record<string, { color: string; style: string }> = {
  natural:   { color: "natural", style: "natural" },
  naturel:   { color: "natural", style: "natural" },
  naturelle: { color: "natural", style: "natural" },
  naturale:  { color: "natural", style: "natural" },
  "natürlich": { color: "natural", style: "natural" },
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
  heightTypeHint: string | null;   // "dining" | "high-bar" | "coffee" extracted from query
  dimensionHint:  string | null;   // "80x80" extracted from query pattern
  // ── Category-specific hints ──
  shapeHint:       string | null;  // "round" | "square" | "rectangular"
  capacityHint:    number | null;  // seats/covers extracted for tables
  armTypeHint:     string | null;  // "with-arms" | "no-arms"
  stackableHint:   boolean;
  parasolTypeHint: string | null;  // "centre-pole" | "cantilever" | "wall-mounted" | "shade-sail"
  parasolSizeHint: number | null;  // diameter in meters
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
  const deferredAmbiguous: string[] = [];  // tokens to resolve after full scan

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

    // Defer ambiguous terms (color AND style) for context-aware resolution
    if (AMBIGUOUS_TERMS[clean]) {
      deferredAmbiguous.push(clean);
      continue;
    }

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

  // Resolve ambiguous terms: if category or other styles present → style, else → color
  for (const amb of deferredAmbiguous) {
    const entry = AMBIGUOUS_TERMS[amb];
    if (categorySlug || styleSlugs.length > 0 || materialSlugs.length > 0) {
      styleSlugs.push(entry.style);
    } else {
      colorSlugs.push(entry.color);
    }
  }

  // preferComplete = user said "table" (not "base/pied/plateau/top" in any language)
  const baseWords = [
    // FR
    "pied", "base", "socle", "plateau", "dessus", "dessous",
    // EN
    "top", "tabletop", "base-only", "pedestal", "trestle",
    // IT
    "piano", "basamento", "piedistallo", "gambe",
    // ES
    "pie", "sobre", "tablero", "pedestal",
    // DE
    "gestell", "tischplatte", "fuss",
  ];
  const preferComplete = categorySlug === "tables"
    && !baseWords.some(w => lower.includes(w));

  // Extract height type hint from table queries
  let heightTypeHint: string | null = null;
  if (categorySlug === "tables") {
    const heightWords: Record<string, string> = {
      // FR
      haute: "high-bar", hautes: "high-bar", "mange-debout": "high-bar",
      basse: "coffee", basses: "coffee",
      // EN
      high: "high-bar", bar: "high-bar", standing: "high-bar",
      coffee: "coffee", low: "coffee",
      // IT
      alto: "high-bar", alta: "high-bar", basso: "coffee", bassa: "coffee",
      // ES
      alta: "high-bar", baja: "coffee",
    };
    for (const token of tokens) {
      if (heightWords[token]) { heightTypeHint = heightWords[token]; break; }
    }
  }

  // Extract dimension pattern from query (e.g., "80x80", "120x70", "Ø80")
  let dimensionHint: string | null = null;
  const dimMatch = lower.match(/\b(\d{2,3})\s*[x×]\s*(\d{2,3})\b/);
  if (dimMatch) {
    dimensionHint = `${dimMatch[1]}x${dimMatch[2]}`;
  } else {
    // Only match round dimension if preceded by ø/o or if query is about tables
    const roundMatch = lower.match(/[øØ]\s*(\d{2,3})\b/);
    if (roundMatch && categorySlug === "tables") {
      dimensionHint = `o${roundMatch[1]}`;
    }
  }

  // ── Category-specific hint extraction ─────────────────────

  // Shape (tables)
  let shapeHint: string | null = null;
  const shapeTerms: Record<string, string> = {
    round: "round", ronde: "round", rond: "round", rotondo: "round", rotonda: "round",
    redonda: "round", redondo: "round", rund: "round",
    square: "square", carré: "square", carrée: "square", quadrato: "square", quadrata: "square",
    cuadrada: "square", cuadrado: "square", quadratisch: "square",
    rectangular: "rectangular", rectangulaire: "rectangular", rettangolare: "rectangular",
    rechteckig: "rectangular",
  };
  for (const token of tokens) {
    if (shapeTerms[token]) { shapeHint = shapeTerms[token]; break; }
  }

  // Capacity (tables) — "6 places", "8 seats", "4 couverts"
  let capacityHint: number | null = null;
  if (categorySlug === "tables") {
    const capMatch = lower.match(/(\d+)\s*(places?|couverts?|seats?|covers?|posti|plazas?)/);
    if (capMatch) capacityHint = parseInt(capMatch[1]);
  }

  // Arm type (chairs/armchairs)
  let armTypeHint: string | null = null;
  if (categorySlug === "armchairs") {
    armTypeHint = "with-arms";  // fauteuil/armchair implies arms
  } else {
    const armTerms: Record<string, string> = {
      accoudoirs: "with-arms", accoudoir: "with-arms",
      "avec accoudoirs": "with-arms", "con braccioli": "with-arms",
      "con reposabrazos": "with-arms", "with arms": "with-arms",
      "sans accoudoirs": "no-arms", "without arms": "no-arms",
      "senza braccioli": "no-arms", "sin reposabrazos": "no-arms",
    };
    for (const [term, hint] of Object.entries(armTerms)) {
      if (lower.includes(term)) { armTypeHint = hint; break; }
    }
  }

  // Stackable
  const stackableTerms = [
    "stackable", "empilable", "empilables", "impilabile", "impilabili",
    "apilable", "apilables", "stapelbar",
  ];
  const stackableHint = stackableTerms.some(t => lower.includes(t));

  // Parasol type
  let parasolTypeHint: string | null = null;
  if (categorySlug === "parasols") {
    const pTypeTerms: Record<string, string> = {
      "déporté": "cantilever", deporte: "cantilever", cantilever: "cantilever",
      offset: "cantilever", "braccio laterale": "cantilever", "brazo lateral": "cantilever",
      droit: "centre-pole", "centre pole": "centre-pole", central: "centre-pole",
      mural: "wall-mounted", "wall mounted": "wall-mounted",
      voile: "shade-sail", "shade sail": "shade-sail", "vela": "shade-sail",
    };
    for (const [term, hint] of Object.entries(pTypeTerms)) {
      if (lower.includes(term)) { parasolTypeHint = hint; break; }
    }
  }

  // Parasol size — "3m", "4.5m", "Ø3m"
  let parasolSizeHint: number | null = null;
  if (categorySlug === "parasols") {
    const sizeMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*m\b/);
    if (sizeMatch) parasolSizeHint = parseFloat(sizeMatch[1].replace(",", "."));
  }

  return {
    originalTerms: tokens,
    categorySlug,
    colorSlugs,
    styleSlugs,
    materialSlugs,
    useCaseSlugs,
    rawTerms,
    preferComplete,
    heightTypeHint,
    dimensionHint,
    shapeHint,
    capacityHint,
    armTypeHint,
    stackableHint,
    parasolTypeHint,
    parasolSizeHint,
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
// CATEGORY-AWARE SCORING PROFILES
// Each product type has different decision criteria.
// ═══════════════════════════════════════════════════════════

// Base weights — product_type is the strongest signal
const W = {
  categoryExact:   8.0,
  categoryPartial: 4.0,
  colorExact:      5.0,
  colorPartial:    2.5,
  material:        4.0,
  style:           3.5,
  use_case:        3.0,
  name:            3.0,
  subcategory:     2.5,
  technical:       2.0,
  availability:    1.5,
  popularity:      1.5,
  priority:        1.0,
  dataQuality:     1.0,
  baseOnlyPenalty: -6.0,
  topOnlyPenalty:  -6.0,
};

type Weights = typeof W;

interface ScoringProfile {
  weights?: Partial<Weights>;
  bonusScorer?: (product: DBProduct, norm: NormalizedQuery) => number;
}

function getDimensionTags(product: DBProduct): string[] {
  const variantTags: string[] = (product.dimension_variants || [])
    .map((v: any) => v.dimension_tag).filter(Boolean);
  const ptt: ProductTypeTags = product.product_type_tags || {};
  return variantTags.length > 0 ? variantTags : (ptt.dimension_tag ? [String(ptt.dimension_tag)] : []);
}

const CATEGORY_PROFILES: Record<string, ScoringProfile> = {
  tables: {
    weights: { material: 5.0, style: 3.0 },
    bonusScorer: (product, norm) => {
      let bonus = 0;
      const ptt: ProductTypeTags = product.product_type_tags || {};
      // Shape match
      if (norm.shapeHint && ptt.shape) {
        if (ptt.shape === norm.shapeHint) bonus += 4.0;
        else bonus -= 1.0;
      }
      // Capacity match — "table 6 places"
      if (norm.capacityHint && ptt.capacity_covers) {
        if ((ptt.capacity_covers as number) >= norm.capacityHint) bonus += 3.0;
      }
      return bonus;
    },
  },

  chairs: {
    weights: { style: 4.0, material: 3.5 },
    bonusScorer: (product, norm) => {
      let bonus = 0;
      const ptt: ProductTypeTags = product.product_type_tags || {};
      // Arm type
      if (norm.armTypeHint) {
        const hasArms = ptt.arm_type && ptt.arm_type !== "no-arms";
        if (norm.armTypeHint === "with-arms" && hasArms) bonus += 4.0;
        if (norm.armTypeHint === "no-arms" && !hasArms) bonus += 2.0;
      }
      // Stackable
      if (norm.stackableHint && product.is_stackable) bonus += 3.0;
      return bonus;
    },
  },

  armchairs: {
    weights: { style: 4.0, material: 3.5 },
    bonusScorer: (product, norm) => {
      let bonus = 0;
      // Armchairs always have arms — no arm_type bonus needed
      if (norm.stackableHint && product.is_stackable) bonus += 3.0;
      return bonus;
    },
  },

  "bar stools": {
    weights: { style: 4.0 },
    bonusScorer: (product, norm) => {
      let bonus = 0;
      const ptt: ProductTypeTags = product.product_type_tags || {};
      if (norm.armTypeHint === "with-arms" && ptt.arm_type && ptt.arm_type !== "no-arms") bonus += 3.0;
      if (norm.stackableHint && product.is_stackable) bonus += 3.0;
      return bonus;
    },
  },

  parasols: {
    weights: { use_case: 4.0, material: 3.0 },
    bonusScorer: (product, norm) => {
      let bonus = 0;
      const ptt: ProductTypeTags = product.product_type_tags || {};
      // Parasol type match
      if (norm.parasolTypeHint && ptt.parasol_type) {
        if (ptt.parasol_type === norm.parasolTypeHint) bonus += 5.0;
        else bonus -= 1.5;
      }
      // Diameter match (±0.5m tolerance)
      if (norm.parasolSizeHint && ptt.diameter_m) {
        if (Math.abs((ptt.diameter_m as number) - norm.parasolSizeHint) <= 0.5) bonus += 4.0;
      }
      // Wind resistance
      if (ptt.wind_beaufort && typeof ptt.wind_beaufort === "number" && ptt.wind_beaufort >= 5) {
        bonus += 1.0;
      }
      return bonus;
    },
  },

  "sun loungers": {
    weights: { material: 3.5 },
    bonusScorer: (product, norm) => {
      let bonus = 0;
      const ptt: ProductTypeTags = product.product_type_tags || {};
      const rawSet = new Set(norm.rawTerms);
      if ((rawSet.has("daybed") || rawSet.has("lit")) && ptt.is_daybed) bonus += 4.0;
      if ((rawSet.has("wheels") || rawSet.has("roulettes") || rawSet.has("ruote") || rawSet.has("ruedas")) && ptt.has_wheels) bonus += 2.0;
      return bonus;
    },
  },

  "lounge seating": {
    weights: { style: 4.5 },
    bonusScorer: (product, norm) => {
      let bonus = 0;
      const ptt: ProductTypeTags = product.product_type_tags || {};
      const rawSet = new Set(norm.rawTerms);
      if ((rawSet.has("modular") || rawSet.has("modulaire") || rawSet.has("modulare")) && ptt.is_modular) bonus += 4.0;
      return bonus;
    },
  },
};

// ═══════════════════════════════════════════════════════════
// SCORE COMPUTATION (reusable by searchProducts & filterProducts)
// ═══════════════════════════════════════════════════════════

const AMBIENCE_TERMS_SCORING: Record<string, string> = {
  cozy: "warm", cosy: "warm", chaleureux: "warm", accogliente: "warm", acogedor: "warm",
  elegant: "elegant", élégant: "elegant", elegante: "elegant",
  relaxed: "relaxed", décontracté: "relaxed", rilassato: "relaxed", relajado: "relaxed",
  festive: "festive", festif: "festive", festivo: "festive",
  intimate: "intimate", intime: "intimate", intimo: "intimate", íntimo: "intimate",
  bright: "bright", lumineux: "bright", luminoso: "bright",
  refined: "refined", raffiné: "refined", raffinato: "refined", refinado: "refined",
  convivial: "convivial", conviviale: "convivial",
};

function computeScore(product: DBProduct, norm: NormalizedQuery, W_eff: Weights): number {
  let score = 0;
  const catLower = (product.category || "").toLowerCase();
  const subLower = (product.subcategory || "").toLowerCase();
  const ptt: ProductTypeTags = product.product_type_tags || {};

  // ── Category match ──────────────────────────────────────
  if (norm.categorySlug) {
    if (catLower === norm.categorySlug || catLower.startsWith(norm.categorySlug.replace(/s$/, ""))) {
      score += W_eff.categoryExact;
    } else if (catLower.includes(norm.categorySlug.replace(/s$/, ""))) {
      score += W_eff.categoryPartial;
    }

    // Penalize table bases and tops when user searched plain "table"
    if (norm.categorySlug === "tables" && norm.preferComplete) {
      if (ptt.table_type === "base-only") score += W_eff.baseOnlyPenalty;
      if (ptt.table_type === "top-only")  score += W_eff.topOnlyPenalty;
    }

    // Height type hint matching (e.g., "table haute" → high-bar)
    if (norm.heightTypeHint && ptt.height_type) {
      if (ptt.height_type === norm.heightTypeHint) score += 4.0;
      else score -= 2.0;
    }

    // Dimension hint matching (e.g., "80x80")
    if (norm.dimensionHint) {
      const allDims = getDimensionTags(product);
      if (allDims.some(d => d.includes(norm.dimensionHint!))) score += 5.0;
    }

    // Subcategory match
    if (subLower.includes(norm.categorySlug.replace(/s$/, ""))) {
      score += W_eff.subcategory;
    }
  }

  // ── Color match — slug-first ────────────────────────────
  for (const colorSlug of norm.colorSlugs) {
    if (product.main_color?.toLowerCase() === colorSlug) {
      score += W_eff.colorExact;
    }
    if (product.available_colors?.includes(colorSlug)) {
      score += W_eff.colorExact * 0.7;
    }
    // color_variants
    if (product.color_variants?.some((cv: any) => cv.color_slug === colorSlug || cv.label?.toLowerCase() === colorSlug)) {
      score += W_eff.colorExact * 0.6;
    }
    if (product.secondary_color?.toLowerCase() === colorSlug) {
      score += W_eff.colorPartial;
    }
    const colorTerms = Object.entries(TERM_TO_COLOR_SLUG)
      .filter(([, slug]) => slug === colorSlug)
      .map(([term]) => term);
    for (const term of colorTerms) {
      if (wordBoundaryMatch(product.name.toLowerCase(), term)) score += W_eff.colorPartial;
    }
  }

  // ── Style match ─────────────────────────────────────────
  for (const styleSlug of norm.styleSlugs) {
    if (product.style_tags.includes(styleSlug)) score += W_eff.style;
    if (product.ambience_tags.includes(styleSlug)) score += W_eff.style * 0.4;
  }

  // ── Ambience match (from raw terms) ───────────────────
  for (const term of norm.rawTerms) {
    const ambienceSlug = AMBIENCE_TERMS_SCORING[term];
    if (ambienceSlug && product.ambience_tags.includes(ambienceSlug)) {
      score += W_eff.style * 0.6;
    }
  }

  // ── Material match ──────────────────────────────────────
  for (const matSlug of norm.materialSlugs) {
    if (product.material_tags.includes(matSlug)) score += W_eff.material;
  }

  // ── Use-case match ────────────────────────────────────
  for (const ucSlug of norm.useCaseSlugs) {
    if (product.use_case_tags.includes(ucSlug)) score += W_eff.use_case;
  }

  // ── Technical tag match via raw terms ──────────────────
  for (const term of norm.rawTerms) {
    if (term.length < 3) continue;
    for (const tag of product.technical_tags) {
      if (tag.includes(term) || term.includes(tag.replace(/-/g, ""))) {
        score += W_eff.technical;
      }
    }
  }

  // ── Availability bonus ──────────────────────────────────
  if (product.availability_type === "available" || product.stock_status === "in_stock") {
    score += W_eff.availability;
  }

  // ── Cross-attribute synergy bonus ──────────────────────
  const signalCount = [
    norm.categorySlug ? 1 : 0,
    norm.colorSlugs.length > 0 ? 1 : 0,
    norm.styleSlugs.length > 0 ? 1 : 0,
    norm.materialSlugs.length > 0 ? 1 : 0,
    norm.useCaseSlugs.length > 0 ? 1 : 0,
  ].reduce((a, b) => a + b, 0);
  if (signalCount >= 3 && score > 0) score += 2.0;

  // ── Category-specific bonus scorer ──────────────────────
  if (norm.categorySlug) {
    const profile = CATEGORY_PROFILES[norm.categorySlug];
    if (profile?.bonusScorer) score += profile.bonusScorer(product, norm);
  }

  // ── Raw terms fallback — match against name/tags ────────
  for (const term of norm.rawTerms) {
    if (term.length < 3) continue;
    if (wordBoundaryMatch(product.name.toLowerCase(), term))  score += W_eff.name * 0.8;
    if (wordBoundaryMatch(catLower, term))                    score += W_eff.categoryPartial * 0.5;
    for (const tag of [...product.style_tags, ...product.ambience_tags]) {
      if (tag.includes(term)) score += W_eff.style * 0.5;
    }
    for (const tag of product.material_tags) {
      if (tag.includes(term)) score += W_eff.material * 0.5;
    }
    for (const tag of product.use_case_tags) {
      if (tag.includes(term)) score += W_eff.use_case * 0.5;
    }
  }

  // ── Description fallback (multilingual) ──────────────────
  if (norm.rawTerms.length > 0) {
    const descriptions = [
      product.short_description,
      (product as any).short_description_fr,
      (product as any).short_description_es,
      (product as any).short_description_it,
    ].filter(Boolean).map((d: string) => d.toLowerCase());

    for (const term of norm.rawTerms) {
      if (term.length < 4) continue;
      for (const desc of descriptions) {
        if (wordBoundaryMatch(desc, term)) {
          score += W_eff.name * 0.5;
          break; // count once per term across all languages
        }
      }
    }
  }

  // ── Boost by priority and popularity ───────────────────
  score += product.priority_score   * W_eff.priority;
  score += product.popularity_score * W_eff.popularity;

  // ── data_quality multiplicative ─────────────────────────
  const quality = product.data_quality_score ?? 0.5;
  score = score * (0.5 + quality * 0.5);

  return score;
}

// ═══════════════════════════════════════════════════════════
// PRODUCT SEARCH (Homepage — returns recommended + similar + compatible)
// ═══════════════════════════════════════════════════════════

export function searchProducts(query: string, products: DBProduct[]): {
  recommended: DBProduct[];
  similar:     DBProduct[];
  compatible:  DBProduct[];
} {
  const norm = normalizeQuery(query);
  const profile = norm.categorySlug ? CATEGORY_PROFILES[norm.categorySlug] : null;
  const W_eff: Weights = profile?.weights ? { ...W, ...profile.weights } as Weights : W;

  const scored = products.map(product => ({
    product,
    score: computeScore(product, norm, W_eff),
  }));

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
    const fallback = products
      .filter(p => {
        const nameLower = p.name.toLowerCase();
        return norm.rawTerms.some(t => t.length >= 3 && wordBoundaryMatch(nameLower, t))
          || norm.originalTerms.some(t => t.length >= 3 && wordBoundaryMatch(nameLower, t));
      })
      .slice(0, 4);
    if (fallback.length > 0) {
      recommended.push(...fallback);
    } else {
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

    const affinityScore = (p: DBProduct): number => {
      let aff = 0;
      aff += p.style_tags.filter(t => topProduct.style_tags.includes(t)).length * 2;
      aff += p.material_tags.filter(t => topProduct.material_tags.includes(t)).length * 1.5;
      aff += p.ambience_tags.filter(t => topProduct.ambience_tags.includes(t)).length;
      if (p.main_color && topProduct.main_color && p.main_color === topProduct.main_color) aff += 2;
      if (p.availability_type === "available") aff += 0.5;
      return aff;
    };

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

// ═══════════════════════════════════════════════════════════
// FILTER PRODUCTS (Products page — returns all matching, sorted by score)
// ═══════════════════════════════════════════════════════════

export function filterProducts(query: string, products: DBProduct[]): DBProduct[] {
  if (!query.trim()) return products;

  const norm = normalizeQuery(query);
  const profile = norm.categorySlug ? CATEGORY_PROFILES[norm.categorySlug] : null;
  const W_eff: Weights = profile?.weights ? { ...W, ...profile.weights } as Weights : W;

  const scored = products
    .map(p => ({ product: p, score: computeScore(p, norm, W_eff) }))
    .sort((a, b) => b.score - a.score);

  const results = scored.filter(s => s.score > 0).map(s => s.product);
  if (results.length > 0) return results;

  // Fallback 1: name matching with word-boundary
  const nameMatches = products.filter(p => {
    const nameLower = p.name.toLowerCase();
    return norm.rawTerms.some(t => t.length >= 3 && wordBoundaryMatch(nameLower, t))
      || norm.originalTerms.some(t => t.length >= 3 && wordBoundaryMatch(nameLower, t));
  });
  if (nameMatches.length > 0) return nameMatches;

  // Fallback 2: return all products rather than empty page
  return products;
}

// ── Export normalization helpers for use in other modules ──
export { normalizeQuery, TERM_TO_COLOR_SLUG, TERM_TO_CATEGORY_SLUG, TERM_TO_USE_CASE_SLUG, TERM_TO_STYLE_SLUG };
