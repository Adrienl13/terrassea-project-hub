import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchProducts, normalizeProduct, type DBProduct } from "@/lib/products";
import { useTranslation } from "react-i18next";

export function useProducts(searchTerm?: string, categoryFilter?: string) {
  const { i18n } = useTranslation();
  const lang = i18n.language.split("-")[0];

  return useQuery<DBProduct[]>({
    queryKey: ["products", searchTerm, categoryFilter, lang],
    queryFn: async () => {
      // If search term present → server-side ilike filtering
      if (searchTerm && searchTerm.trim().length > 0) {
        let query = supabase
          .from("products")
          .select("*")
          .eq("publish_status", "published")
          .neq("availability_type", "discontinued");

        if (categoryFilter) {
          query = query.ilike("category", `%${categoryFilter}%`);
        }

        // Search across name, category, subcategory, style_tags
        const term = searchTerm.trim();
        query = query.or(
          `name.ilike.%${term}%,category.ilike.%${term}%,subcategory.ilike.%${term}%,short_description.ilike.%${term}%`
        );

        const { data, error } = await query
          .order("priority_score", { ascending: false })
          .limit(50);
        if (error) throw error;
        return (data ?? []).map(normalizeProduct);
      }

      // If category filter only → filtered fetch
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

      // Default → fetch all
      return fetchProducts();
    },
    staleTime: 0,
    refetchOnMount: true,
  });
}
