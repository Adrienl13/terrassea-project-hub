import { useQuery } from "@tanstack/react-query";
import { fetchProducts, type DBProduct } from "@/lib/products";

export function useProducts() {
  return useQuery<DBProduct[]>({
    queryKey: ["products"],
    queryFn: fetchProducts,
    staleTime: 0,
    refetchOnMount: true,
  });
}
