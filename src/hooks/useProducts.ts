import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { normalizeSearchQuery } from "@/lib/searchNormalizer";
import { normalizeProduct, fetchProducts, enrichProductsWithOffers, type DBProduct } from "@/lib/products";

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

        // The RPC returns partial data — we need to re-fetch full products for matches
        const { data: searchResults, error } = await supabase.rpc("fuzzy_search_products", {
          search_query: normalized,
          lang: lang,
          category_filter: categoryFilter || null,
          limit_count: 50,
        });

        if (error) throw error;
        if (!searchResults || searchResults.length === 0) return [];

        // Re-fetch full product data for matched IDs to get all fields
        const matchedIds = searchResults.map((r: { id: string }) => r.id);
        const { data: fullProducts, error: fullError } = await supabase
          .from("products")
          .select("*")
          .in("id", matchedIds);
        if (fullError) throw fullError;

        // Enrich with offer stats
        const { data: offers } = await supabase
          .from("product_offers")
          .select("product_id, price, is_active")
          .in("product_id", matchedIds)
          .eq("is_active", true);

        const offerStats = new Map<string, { count: number; minPrice: number | null }>();
        for (const o of offers ?? []) {
          const existing = offerStats.get(o.product_id) ?? { count: 0, minPrice: null };
          existing.count++;
          if (o.price != null) {
            existing.minPrice = existing.minPrice != null ? Math.min(existing.minPrice, o.price) : o.price;
          }
          offerStats.set(o.product_id, existing);
        }

        // Preserve search relevance order
        const productMap = new Map((fullProducts ?? []).map(p => [p.id, p]));
        const ordered = matchedIds
          .map((id: string) => productMap.get(id))
          .filter(Boolean)
          .map((raw) => normalizeProduct(raw as Record<string, unknown>));

        return enrichProductsWithOffers(ordered, offerStats);
      }

      // Category filter — with offer enrichment
      if (categoryFilter) {
        const [productsRes, offersRes] = await Promise.all([
          supabase
            .from("products")
            .select("*")
            .eq("publish_status", "published")
            .neq("availability_type", "discontinued")
            .ilike("category", `%${categoryFilter}%`)
            .order("priority_score", { ascending: false }),
          supabase
            .from("product_offers")
            .select("product_id, price, is_active")
            .eq("is_active", true)
            .limit(10000),
        ]);
        if (productsRes.error) throw productsRes.error;

        const offerStats = new Map<string, { count: number; minPrice: number | null }>();
        for (const o of offersRes.data ?? []) {
          const existing = offerStats.get(o.product_id) ?? { count: 0, minPrice: null };
          existing.count++;
          if (o.price != null) {
            existing.minPrice = existing.minPrice != null ? Math.min(existing.minPrice, o.price) : o.price;
          }
          offerStats.set(o.product_id, existing);
        }

        return enrichProductsWithOffers(
          (productsRes.data ?? []).map(normalizeProduct),
          offerStats
        );
      }

      return fetchProducts();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes — product catalog changes infrequently
  });
}
