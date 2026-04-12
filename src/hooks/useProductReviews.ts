import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  review: string | null;
  status: string;
  is_verified_purchase: boolean;
  created_at: string;
  user_profiles?: { first_name: string | null; company: string | null } | null;
}

export interface ReviewStats {
  product_id: string;
  review_count: number;
  avg_rating: number;
  stars_5: number;
  stars_4: number;
  stars_3: number;
  stars_2: number;
  stars_1: number;
}

export function useProductReviews(productId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Aggregate stats from materialized view
  const { data: stats } = useQuery<ReviewStats | null>({
    queryKey: ["product-review-stats", productId],
    queryFn: async () => {
      if (!productId) return null;
      const { data, error } = await supabase
        .from("product_review_stats")
        .select("*")
        .eq("product_id", productId)
        .maybeSingle();
      if (error) return null;
      return data as unknown as ReviewStats;
    },
    enabled: !!productId,
    staleTime: 60_000,
  });

  // Approved reviews list
  const { data: reviews = [] } = useQuery<ProductReview[]>({
    queryKey: ["product-reviews", productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from("product_reviews")
        .select("*, user_profiles:user_id(first_name, company)")
        .eq("product_id", productId)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return [];
      return data as unknown as ProductReview[];
    },
    enabled: !!productId,
    staleTime: 60_000,
  });

  // Current user's review (any status)
  const { data: userReview } = useQuery<ProductReview | null>({
    queryKey: ["product-review-mine", productId, user?.id],
    queryFn: async () => {
      if (!productId || !user) return null;
      const { data, error } = await supabase
        .from("product_reviews")
        .select("*")
        .eq("product_id", productId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) return null;
      return data as unknown as ProductReview;
    },
    enabled: !!productId && !!user,
    staleTime: 30_000,
  });

  // Submit review mutation
  const submitReview = useMutation({
    mutationFn: async (input: { rating: number; title: string; review: string }) => {
      if (!user || !productId) throw new Error("Auth required");

      // Auto-detect verified purchase
      let isVerified = false;
      let orderId: string | null = null;
      let quoteRequestId: string | null = null;

      const [orderRes, quoteRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id")
          .eq("client_user_id", user.id)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("quote_requests")
          .select("id")
          .eq("product_id", productId)
          .eq("client_user_id", user.id)
          .limit(1)
          .maybeSingle(),
      ]);

      if (orderRes.data) {
        isVerified = true;
        orderId = orderRes.data.id;
      }
      if (quoteRes.data) {
        isVerified = true;
        quoteRequestId = quoteRes.data.id;
      }

      const { error } = await supabase.from("product_reviews").insert({
        product_id: productId,
        user_id: user.id,
        rating: input.rating,
        title: input.title || null,
        review: input.review || null,
        is_verified_purchase: isVerified,
        order_id: orderId,
        quote_request_id: quoteRequestId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-reviews", productId] });
      queryClient.invalidateQueries({ queryKey: ["product-review-stats", productId] });
      queryClient.invalidateQueries({ queryKey: ["product-review-mine", productId] });
    },
  });

  return { stats, reviews, userReview, submitReview };
}
