import { useState, useEffect, useMemo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { supabase } from "@/integrations/supabase/client";

export interface SearchSuggestion {
  type: "product" | "category" | "partner" | "style";
  id: string;
  label: string;
  sublabel?: string;
  imageUrl?: string;
  url: string;
}

const CATEGORY_LIST = [
  { name: "Chairs", slug: "chairs" },
  { name: "Armchairs", slug: "armchairs" },
  { name: "Tables", slug: "tables" },
  { name: "Parasols", slug: "parasols" },
  { name: "Sun Loungers", slug: "sun-loungers" },
  { name: "Sofas", slug: "sofas" },
  { name: "Bar Stools", slug: "bar-stools" },
  { name: "Accessories", slug: "accessories" },
];

const STYLE_LIST = [
  "Mediterranean",
  "Minimalist",
  "Industrial",
  "Bohemian",
  "Scandinavian",
  "Tropical",
  "Classic",
  "Contemporary",
  "Coastal",
  "Rustic",
];

export function useSearchAutocomplete(query: string) {
  const debouncedQuery = useDebounce(query.trim(), 200);
  const [productSuggestions, setProductSuggestions] = useState<SearchSuggestion[]>([]);
  const [partnerSuggestions, setPartnerSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Static matches for categories and styles
  const categorySuggestions = useMemo<SearchSuggestion[]>(() => {
    if (debouncedQuery.length < 2) return [];
    const q = debouncedQuery.toLowerCase();
    return CATEGORY_LIST
      .filter((c) => c.name.toLowerCase().includes(q))
      .map((c) => ({
        type: "category" as const,
        id: `cat-${c.slug}`,
        label: c.name,
        url: `/products?category=${c.slug}`,
      }));
  }, [debouncedQuery]);

  const styleSuggestions = useMemo<SearchSuggestion[]>(() => {
    if (debouncedQuery.length < 2) return [];
    const q = debouncedQuery.toLowerCase();
    return STYLE_LIST
      .filter((s) => s.toLowerCase().includes(q))
      .map((s) => ({
        type: "style" as const,
        id: `style-${s.toLowerCase()}`,
        label: s,
        url: `/products?style=${encodeURIComponent(s.toLowerCase())}`,
      }));
  }, [debouncedQuery]);

  // Fetch products and partners from Supabase
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
      const pattern = `%${debouncedQuery}%`;

      const [productsRes, partnersRes] = await Promise.all([
        supabase
          .from("products")
          .select("id, name, category, image_url")
          .ilike("name", pattern)
          .neq("availability_type", "discontinued")
          .limit(5),
        supabase
          .from("partners")
          .select("id, name, country, slug")
          .ilike("name", pattern)
          .eq("is_public", true)
          .limit(3),
      ]);

      if (cancelled) return;

      const products: SearchSuggestion[] = (productsRes.data ?? []).map((p) => ({
        type: "product" as const,
        id: p.id,
        label: p.name,
        sublabel: p.category,
        imageUrl: p.image_url ?? undefined,
        url: `/products/${p.id}`,
      }));

      const partners: SearchSuggestion[] = (partnersRes.data ?? []).map((p) => ({
        type: "partner" as const,
        id: p.id,
        label: p.name,
        sublabel: p.country ?? undefined,
        url: `/products?supplier=${p.slug ?? p.id}`,
      }));

      setProductSuggestions(products);
      setPartnerSuggestions(partners);
      setIsLoading(false);
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
