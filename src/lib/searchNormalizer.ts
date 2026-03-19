/**
 * Multilingual term normalization for search queries.
 * Maps user input in any supported language → English slugs
 * so the fuzzy_search_products RPC can match against English DB values.
 */

const MULTILANG_TERMS: Record<string, string> = {
  // FR catégories
  chaise: "chair", chaises: "chair", fauteuil: "armchair",
  fauteuils: "armchair", table: "table", tables: "table",
  parasol: "parasol", parasols: "parasol",
  "bain de soleil": "sun lounger", canapé: "sofa", canapés: "sofa",
  tabouret: "bar stool", tabourets: "bar stool",
  // FR matériaux
  teck: "teak", corde: "rope", empilable: "stackable",
  pliant: "folding", déporté: "cantilever", aluminium: "aluminium",
  bois: "wood", rotin: "rattan",
  // FR couleurs
  noir: "black", blanc: "white", gris: "grey", vert: "green",
  rouge: "red", bleu: "blue", beige: "beige", sable: "sand",
  rouille: "rust", crème: "cream", ivoire: "ivory",
  // FR usage
  piscine: "pool", plage: "beach", restaurant: "restaurant",
  hôtel: "hotel", hotel: "hotel", terrasse: "terrace",
  rooftop: "rooftop", bar: "bar",

  // IT catégories
  sedia: "chair", sedie: "chair", poltrona: "armchair",
  poltrone: "armchair", tavolo: "table", tavoli: "table",
  ombrellone: "parasol", ombrelloni: "parasol",
  lettino: "sun lounger", lettini: "sun lounger",
  divano: "sofa", divani: "sofa", sgabello: "bar stool",
  // IT matériaux
  corda: "rope", legno: "wood", alluminio: "aluminium",
  vimini: "wicker", ghisa: "cast iron",
  // IT couleurs
  nero: "black", bianco: "white", grigio: "grey",
  verde: "green", rosso: "red", blu: "blue",
  sabbia: "sand", avorio: "ivory", ruggine: "rust",
  // IT usage
  piscina: "pool", spiaggia: "beach", ristorante: "restaurant",
  albergo: "hotel", terrazza: "terrace",

  // ES catégories
  silla: "chair", sillas: "chair", sillón: "armchair",
  mesa: "table", mesas: "table", sombrilla: "parasol",
  tumbona: "sun lounger", sofá: "sofa", taburete: "bar stool",
  // ES matériaux
  cuerda: "rope", madera: "wood", aluminio: "aluminium",
  mimbre: "wicker",
  // ES couleurs
  negro: "black", blanco: "white",
  rojo: "red", azul: "blue",
  arena: "sand", marfil: "ivory",
  // ES usage
  playa: "beach", restaurante: "restaurant",
};

// Multi-word terms sorted longest-first for greedy matching
const MULTI_WORD_TERMS = Object.keys(MULTILANG_TERMS)
  .filter((k) => k.includes(" "))
  .sort((a, b) => b.length - a.length);

/**
 * Normalizes a multilingual search query into English terms.
 * "chaise aluminium noir" → "chair aluminium black"
 */
export function normalizeSearchQuery(query: string): string {
  let lower = query.toLowerCase().trim();

  // Replace multi-word terms first
  for (const term of MULTI_WORD_TERMS) {
    if (lower.includes(term)) {
      lower = lower.replace(term, MULTILANG_TERMS[term]);
    }
  }

  const words = lower.split(/\s+/);
  const normalized = words.map((word) =>
    MULTILANG_TERMS[word] ? MULTILANG_TERMS[word] : word
  );

  return normalized.join(" ");
}
