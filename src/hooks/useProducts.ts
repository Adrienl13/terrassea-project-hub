import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { normalizeSearchQuery } from "@/lib/searchNormalizer";
import { normalizeProduct, fetchProducts, type DBProduct } from "@/lib/products";

export function useProducts(searchTerm?: string, categoryFilter?: string) {
  const { i18n } = useTranslation();

  // Langue active — se met à jour automatiquement quand l'utilisateur change
  const lang = i18n.language.split("-")[0]; // 'fr', 'en', 'it', 'es'

  const debouncedSearch = useDebounce(searchTerm, 300);

  return useQuery<DBProduct[]>({
    // lang dans la queryKey force le recalcul quand la langue change
    queryKey: ["products", debouncedSearch, categoryFilter, lang],
    queryFn: async () => {
      if (debouncedSearch && debouncedSearch.trim().length > 1) {
        const normalized = normalizeSearchQuery(debouncedSearch.trim());

        const { data, error } = await supabase.rpc("fuzzy_search_products", {
          search_query: normalized,
          lang: lang,
          category_filter: categoryFilter || null,
          limit_count: 50,
        });

        if (error) throw error;
        return (data ?? []).map(normalizeProduct);
      }

      // Sans recherche — catalogue normal
      if (categoryFilter) {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("publish_status", "published")
          .neq("availability_type", "discontinued")
          .ilike("category", `%${categoryFilter}%`)
          .order("priority_score", { ascending: false });
        if (error) throw error;
        return (data ?? []).map(normalizeProduct);
      }

      return fetchProducts();
    },
    staleTime: 0,
  });
}
