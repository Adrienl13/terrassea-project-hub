import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { normalizeProduct, type DBProduct } from "@/lib/products";
import { useDebounce } from "@/hooks/useDebounce";
import { fetchProducts } from "@/lib/products";

export function useProducts(searchTerm?: string, categoryFilter?: string) {
  const { i18n } = useTranslation();
  const lang = i18n.language.split("-")[0];
  const debouncedSearch = useDebounce(searchTerm, 300);

  return useQuery<DBProduct[]>({
    queryKey: ["products", debouncedSearch, categoryFilter, lang],
    queryFn: async () => {
      if (debouncedSearch && debouncedSearch.trim().length > 1) {
        const { data, error } = await supabase
          .rpc("fuzzy_search_products", {
            search_query: debouncedSearch.trim(),
            lang: lang,
            category_filter: categoryFilter || null,
            limit_count: 50,
          });
        if (error) throw error;
        return (data ?? []).map(normalizeProduct);
      }

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
