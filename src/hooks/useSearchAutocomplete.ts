import { useState, useEffect, useMemo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { supabase } from "@/integrations/supabase/client";
import { normalizeQuery, TERM_TO_CATEGORY_SLUG, TERM_TO_STYLE_SLUG } from "@/engine/intentDetector";
import i18next from "i18next";

export interface SearchSuggestion {
  type: "product" | "category" | "partner" | "style";
  id: string;
  label: string;
  sublabel?: string;
  imageUrl?: string;
  url: string;
}

// Multilingual category display names — labels shown in autocomplete
const CATEGORY_DISPLAY: Record<string, Record<string, string>> = {
  chairs:           { en: "Chairs",         fr: "Chaises",          it: "Sedie",          es: "Sillas" },
  armchairs:        { en: "Armchairs",      fr: "Fauteuils",        it: "Poltrone",       es: "Sillones" },
  tables:           { en: "Tables",         fr: "Tables",           it: "Tavoli",         es: "Mesas" },
  parasols:         { en: "Parasols",       fr: "Parasols",         it: "Ombrelloni",     es: "Sombrillas" },
  "sun loungers":   { en: "Sun Loungers",   fr: "Bains de soleil",  it: "Lettini",        es: "Tumbonas" },
  "lounge seating": { en: "Lounge Seating", fr: "Canapés & Lounge", it: "Divani & Lounge", es: "Sofás & Lounge" },
  "bar stools":     { en: "Bar Stools",     fr: "Tabourets de bar", it: "Sgabelli",       es: "Taburetes" },
  accessories:      { en: "Accessories",    fr: "Accessoires",      it: "Accessori",      es: "Accesorios" },
  benches:          { en: "Benches",        fr: "Bancs",            it: "Panche",         es: "Bancos" },
};

// Derive unique style slugs from engine dictionary
const STYLE_SLUGS = [...new Set(Object.values(TERM_TO_STYLE_SLUG))].sort();

// Multilingual style display names
const STYLE_DISPLAY: Record<string, Record<string, string>> = {
  bistro:         { en: "Bistro",         fr: "Bistro",           it: "Bistrot",         es: "Bistro" },
  mediterranean:  { en: "Mediterranean",  fr: "Méditerranéen",    it: "Mediterraneo",    es: "Mediterráneo" },
  modern:         { en: "Modern",         fr: "Moderne",          it: "Moderno",         es: "Moderno" },
  industrial:     { en: "Industrial",     fr: "Industriel",       it: "Industriale",     es: "Industrial" },
  natural:        { en: "Natural",        fr: "Naturel",          it: "Naturale",        es: "Natural" },
  luxury:         { en: "Luxury",         fr: "Luxe",             it: "Lusso",           es: "Lujo" },
  coastal:        { en: "Coastal",        fr: "Côtier",           it: "Costiero",        es: "Costero" },
  lounge:         { en: "Lounge",         fr: "Lounge",           it: "Lounge",          es: "Lounge" },
  scandinavian:   { en: "Scandinavian",   fr: "Scandinave",       it: "Scandinavo",      es: "Escandinavo" },
  vintage:        { en: "Vintage",        fr: "Vintage",          it: "Vintage",         es: "Vintage" },
  tropical:       { en: "Tropical",       fr: "Tropical",         it: "Tropicale",       es: "Tropical" },
  classic:        { en: "Classic",        fr: "Classique",        it: "Classico",        es: "Clásico" },
  minimal:        { en: "Minimalist",     fr: "Minimaliste",      it: "Minimalista",     es: "Minimalista" },
  bohemian:       { en: "Bohemian",       fr: "Bohème",           it: "Boemo",           es: "Bohemio" },
  farmhouse:      { en: "Rustic",         fr: "Champêtre",        it: "Rustico",         es: "Rústico" },
  resort:         { en: "Resort",         fr: "Resort",           it: "Resort",          es: "Resort" },
  "art-deco":     { en: "Art Deco",       fr: "Art Déco",         it: "Art Deco",        es: "Art Deco" },
  japandi:        { en: "Japandi",        fr: "Japandi",          it: "Japandi",         es: "Japandi" },
  event:          { en: "Event",          fr: "Évènementiel",     it: "Evento",          es: "Evento" },
  "ski-chalet":   { en: "Ski Chalet",     fr: "Chalet",           it: "Chalet",          es: "Chalet" },
  maximalist:     { en: "Maximalist",     fr: "Maximaliste",      it: "Massimalista",    es: "Maximalista" },
};

function getLang(): string {
  return (i18next.language || "en").split("-")[0];
}

export function useSearchAutocomplete(query: string) {
  const debouncedQuery = useDebounce(query.trim(), 200);
  const [productSuggestions, setProductSuggestions] = useState<SearchSuggestion[]>([]);
  const [partnerSuggestions, setPartnerSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Category suggestions — use engine's normalizeQuery for multilingual matching
  const categorySuggestions = useMemo<SearchSuggestion[]>(() => {
    if (debouncedQuery.length < 2) return [];
    const lang = getLang();
    const q = debouncedQuery.toLowerCase();

    // Check if the query matches any term in the engine's category dictionary
    const norm = normalizeQuery(debouncedQuery);
    const matches: SearchSuggestion[] = [];

    if (norm.categorySlug && CATEGORY_DISPLAY[norm.categorySlug]) {
      const display = CATEGORY_DISPLAY[norm.categorySlug];
      const slug = norm.categorySlug.replace(/\s+/g, "-");
      matches.push({
        type: "category",
        id: `cat-${slug}`,
        label: display[lang] || display.en,
        url: `/products?category=${slug}`,
      });
    }

    // Also match by display name in current language
    for (const [catSlug, display] of Object.entries(CATEGORY_DISPLAY)) {
      if (norm.categorySlug === catSlug) continue; // already added
      const localName = (display[lang] || display.en).toLowerCase();
      if (localName.includes(q)) {
        const slug = catSlug.replace(/\s+/g, "-");
        matches.push({
          type: "category",
          id: `cat-${slug}`,
          label: display[lang] || display.en,
          url: `/products?category=${slug}`,
        });
      }
    }

    return matches;
  }, [debouncedQuery]);

  // Style suggestions — multilingual matching via engine dictionary
  const styleSuggestions = useMemo<SearchSuggestion[]>(() => {
    if (debouncedQuery.length < 2) return [];
    const lang = getLang();
    const q = debouncedQuery.toLowerCase();

    // Check if query matches any style term in the engine
    const norm = normalizeQuery(debouncedQuery);
    const matchedSlugs = new Set<string>();
    const matches: SearchSuggestion[] = [];

    // Direct engine match
    for (const slug of norm.styleSlugs) {
      if (matchedSlugs.has(slug)) continue;
      matchedSlugs.add(slug);
      const display = STYLE_DISPLAY[slug];
      if (display) {
        matches.push({
          type: "style",
          id: `style-${slug}`,
          label: display[lang] || display.en,
          url: `/products?style=${encodeURIComponent(slug)}`,
        });
      }
    }

    // Also match by display name in current language
    for (const slug of STYLE_SLUGS) {
      if (matchedSlugs.has(slug)) continue;
      const display = STYLE_DISPLAY[slug];
      if (!display) continue;
      const localName = (display[lang] || display.en).toLowerCase();
      if (localName.includes(q)) {
        matchedSlugs.add(slug);
        matches.push({
          type: "style",
          id: `style-${slug}`,
          label: display[lang] || display.en,
          url: `/products?style=${encodeURIComponent(slug)}`,
        });
      }
    }

    return matches.slice(0, 5);
  }, [debouncedQuery]);

  // Fetch products and partners from Supabase — normalize query for better matching
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setProductSuggestions([]);
      setPartnerSuggestions([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const fetchSuggestions = async () => {
      try {
        // Normalize query to English for DB name matching
        const norm = normalizeQuery(debouncedQuery);
        const searchTerms = [
          ...(norm.categorySlug ? [norm.categorySlug.replace(/s$/, "")] : []),
          ...norm.colorSlugs,
          ...norm.materialSlugs,
          ...norm.rawTerms,
        ].filter(t => t.length >= 2);

        // Build search patterns — original query + normalized terms
        const patterns = [
          `%${debouncedQuery}%`,
          ...searchTerms.map(t => `%${t}%`),
        ];

        // Search products with original query OR normalized terms
        const productQueries = patterns.slice(0, 3).map(pattern =>
          supabase
            .from("products")
            .select("id, name, category, image_url")
            .ilike("name", pattern)
            .eq("publish_status", "published")
            .neq("availability_type", "discontinued")
            .limit(3)
        );

        const [partnersRes, ...productResults] = await Promise.all([
          supabase
            .from("partners")
            .select("id, name, country, slug")
            .ilike("name", `%${debouncedQuery}%`)
            .eq("is_public", true)
            .limit(3),
          ...productQueries,
        ]);

        if (cancelled) return;

        // Deduplicate products from multiple queries
        const seenIds = new Set<string>();
        const products: SearchSuggestion[] = [];
        for (const res of productResults) {
          for (const p of res.data ?? []) {
            if (seenIds.has(p.id)) continue;
            seenIds.add(p.id);
            products.push({
              type: "product",
              id: p.id,
              label: p.name,
              sublabel: p.category,
              imageUrl: p.image_url ?? undefined,
              url: `/products/${p.id}`,
            });
          }
        }

        const partners: SearchSuggestion[] = (partnersRes.data ?? []).map((p) => ({
          type: "partner" as const,
          id: p.id,
          label: p.name,
          sublabel: p.country ?? undefined,
          url: `/products?supplier=${p.slug ?? p.id}`,
        }));

        setProductSuggestions(products.slice(0, 5));
        setPartnerSuggestions(partners);
      } catch (err) {
        console.error("Search autocomplete error:", err);
        setProductSuggestions([]);
        setPartnerSuggestions([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchSuggestions();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const suggestions = useMemo<SearchSuggestion[]>(
    () => [
      ...productSuggestions,
      ...partnerSuggestions,
      ...categorySuggestions,
      ...styleSuggestions,
    ],
    [productSuggestions, partnerSuggestions, categorySuggestions, styleSuggestions]
  );

  return { suggestions, isLoading };
}
