import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Trash2, Star, Shield, Search } from "lucide-react";
import { toast } from "sonner";

type StatusFilter = "pending" | "approved" | "rejected" | "all";

interface ReviewRow {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  review: string | null;
  status: string;
  is_verified_purchase: boolean;
  created_at: string;
  products: { name: string } | null;
  user_profiles: { first_name: string | null; email: string | null; company: string | null } | null;
}

export default function AdminProductReviews() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [search, setSearch] = useState("");

  const { data: reviews = [], isLoading } = useQuery<ReviewRow[]>({
    queryKey: ["admin-product-reviews", filter, search],
    queryFn: async () => {
      let query = supabase
        .from("product_reviews")
        .select("*, products:product_id(name), user_profiles:user_id(first_name, email, company)")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = (data ?? []) as unknown as ReviewRow[];
      if (search) {
        const s = search.toLowerCase();
        results = results.filter(
          (r) =>
            r.products?.name?.toLowerCase().includes(s) ||
            r.user_profiles?.first_name?.toLowerCase().includes(s) ||
            r.user_profiles?.email?.toLowerCase().includes(s) ||
            r.title?.toLowerCase().includes(s) ||
            r.review?.toLowerCase().includes(s)
        );
      }
      return results;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("product_reviews")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-product-reviews"] });
      toast.success("Review updated");
    },
  });

  const deleteReview = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_reviews")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-product-reviews"] });
      toast.success("Review deleted");
    },
  });

  const tabs: { key: StatusFilter; label: string; color: string }[] = [
    { key: "pending", label: "Pending", color: "text-amber-600" },
    { key: "approved", label: "Approved", color: "text-green-600" },
    { key: "rejected", label: "Rejected", color: "text-red-600" },
    { key: "all", label: "All", color: "text-foreground" },
  ];

  const pendingCount = reviews.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-foreground">
          Product Reviews
          {filter === "pending" && pendingCount > 0 && (
            <span className="ml-2 text-sm font-body text-amber-600">({pendingCount} pending)</span>
          )}
        </h2>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reviews..."
            className="w-full text-sm font-body bg-background border border-border rounded-full pl-9 pr-4 py-2 focus:outline-none focus:border-foreground transition-colors"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-muted rounded-full p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-1.5 text-xs font-display font-semibold rounded-full transition-colors ${
              filter === tab.key
                ? "bg-foreground text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reviews table */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading...</div>
      ) : reviews.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">No reviews found</div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="border border-border rounded-xl p-4 flex items-start gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display font-semibold text-sm text-foreground truncate">
                    {r.products?.name || "Unknown product"}
                  </span>
                  <span className={`text-[10px] font-body px-2 py-0.5 rounded-full ${
                    r.status === "approved" ? "bg-green-50 text-green-600" :
                    r.status === "rejected" ? "bg-red-50 text-red-600" :
                    "bg-amber-50 text-amber-600"
                  }`}>
                    {r.status}
                  </span>
                  {r.is_verified_purchase && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-green-600">
                      <Shield className="h-2.5 w-2.5" /> Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3 w-3 ${s <= r.rating ? "text-amber-400 fill-amber-400" : "text-border"}`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-muted-foreground font-body">
                    by {r.user_profiles?.first_name || r.user_profiles?.email || "Unknown"}
                    {r.user_profiles?.company && ` (${r.user_profiles.company})`}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-body">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                {r.title && (
                  <p className="font-display font-semibold text-sm mt-2">{r.title}</p>
                )}
                {r.review && (
                  <p className="text-sm font-body text-muted-foreground mt-1">{r.review}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {r.status !== "approved" && (
                  <button
                    onClick={() => updateStatus.mutate({ id: r.id, status: "approved" })}
                    className="p-2 rounded-full hover:bg-green-50 text-green-600 transition-colors"
                    title="Approve"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
                {r.status !== "rejected" && (
                  <button
                    onClick={() => updateStatus.mutate({ id: r.id, status: "rejected" })}
                    className="p-2 rounded-full hover:bg-red-50 text-red-600 transition-colors"
                    title="Reject"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => {
                    if (confirm("Delete this review permanently?")) {
                      deleteReview.mutate(r.id);
                    }
                  }}
                  className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
