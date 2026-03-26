import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useConversations } from "@/hooks/useConversations";
import {
  Crown, Sparkles, Inbox, Package, TrendingUp, CheckCircle2,
  ArrowRight, MessageSquare, Clock, FolderOpen, BarChart3, Eye,
} from "lucide-react";

interface BrandMemberOverviewProps {
  partnerId: string;
  onNavigate: (section: string) => void;
}

export default function BrandMemberOverview({ partnerId, onNavigate }: BrandMemberOverviewProps) {
  const { t } = useTranslation();
  const { totalUnread } = useConversations();

  // ── Briefs data ────────────────────────────────────────────────────────
  const { data: briefs = [] } = useQuery({
    queryKey: ["brand-member-overview-briefs", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_briefs")
        .select("id, status, qualification_score, budget_range, establishment_type, stars_or_class, country, quantity_estimate, collections_interest, created_at")
        .eq("brand_partner_id", partnerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Collections data ───────────────────────────────────────────────────
  const { data: collectionsData } = useQuery({
    queryKey: ["brand-member-overview-collections", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_offers")
        .select("id, collection_name, product:product_id(name, image_url)")
        .eq("partner_id", partnerId)
        .eq("is_active", true)
        .order("collection_name");
      if (error) return { products: 0, collections: new Set<string>(), recent: [] };
      const items = data ?? [];
      const collectionNames = new Set(items.map((i: any) => i.collection_name).filter(Boolean));
      return { products: items.length, collections: collectionNames, recent: items.slice(0, 4) };
    },
  });

  // ── Brand page views (from partner stats if exists) ────────────────────
  const { data: pageViews = 0 } = useQuery({
    queryKey: ["brand-member-overview-views", partnerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_analytics")
        .select("page_views")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.page_views ?? 0;
    },
  });

  const pendingBriefs = briefs.filter((b) => b.status === "pending_review");
  const acceptedBriefs = briefs.filter((b) => b.status === "accepted");
  const qualifiedBriefs = briefs.filter((b) => (b.qualification_score ?? 0) >= 30);
  const qualificationRate = briefs.length > 0 ? Math.round((qualifiedBriefs.length / briefs.length) * 100) : 0;
  const productsCount = collectionsData?.products ?? 0;
  const collectionsCount = collectionsData?.collections?.size ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Premium hero ───────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 p-7">
        <div className="absolute -top-8 -right-8 w-48 h-48 opacity-[0.06]">
          <Crown className="w-full h-full text-white" />
        </div>
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/10 to-transparent" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-purple-200" />
            <span className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-purple-200">Brand Member</span>
          </div>
          <h2 className="font-display text-xl font-bold text-white">{t("account.overview")}</h2>
          <p className="text-xs font-body text-purple-200/80 mt-1">{t("brand.brandModeInfo")}</p>
        </div>

        {/* Inline stats */}
        <div className="relative grid grid-cols-4 gap-3 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-3 text-center">
            <p className="text-2xl font-display font-bold text-white">{briefs.length}</p>
            <p className="text-[8px] font-body text-purple-200 uppercase tracking-wider mt-0.5">{t("brief.receivedBriefs")}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-3 text-center">
            <p className="text-2xl font-display font-bold text-white">{pendingBriefs.length}</p>
            <p className="text-[8px] font-body text-purple-200 uppercase tracking-wider mt-0.5">{t("brief.statusPending")}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-3 text-center">
            <p className="text-2xl font-display font-bold text-white">{acceptedBriefs.length}</p>
            <p className="text-[8px] font-body text-purple-200 uppercase tracking-wider mt-0.5">{t("brief.statusAccepted")}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-3 text-center">
            <p className="text-2xl font-display font-bold text-white">{qualificationRate}%</p>
            <p className="text-[8px] font-body text-purple-200 uppercase tracking-wider mt-0.5">{t("network.conversionRate")}</p>
          </div>
        </div>
      </div>

      {/* ── KPI cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => onNavigate("collections")} className="bg-white border border-purple-100 rounded-2xl p-5 text-left hover:shadow-lg hover:shadow-purple-100/40 transition-all group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-100 to-violet-100 flex items-center justify-center mb-3">
            <FolderOpen className="h-4 w-4 text-purple-600" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{collectionsCount}</p>
          <p className="text-[10px] font-body text-muted-foreground uppercase tracking-wider">{t("brand.collectionsCount")}</p>
          <p className="text-[10px] font-body text-purple-500 mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {t("brand.manageCollections")} <ArrowRight className="h-3 w-3" />
          </p>
        </button>

        <button onClick={() => onNavigate("collections")} className="bg-white border border-purple-100 rounded-2xl p-5 text-left hover:shadow-lg hover:shadow-purple-100/40 transition-all group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center mb-3">
            <Package className="h-4 w-4 text-violet-600" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{productsCount}</p>
          <p className="text-[10px] font-body text-muted-foreground uppercase tracking-wider">{t("brand.productsCount")}</p>
          <p className="text-[10px] font-body text-purple-500 mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {t("brand.showCollections")} <ArrowRight className="h-3 w-3" />
          </p>
        </button>

        <button onClick={() => onNavigate("performance")} className="bg-white border border-purple-100 rounded-2xl p-5 text-left hover:shadow-lg hover:shadow-purple-100/40 transition-all group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center mb-3">
            <Eye className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{pageViews}</p>
          <p className="text-[10px] font-body text-muted-foreground uppercase tracking-wider">{t("pd.stats.pageViews", "Vues page")}</p>
          <p className="text-[10px] font-body text-purple-500 mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {t("account.performance")} <ArrowRight className="h-3 w-3" />
          </p>
        </button>
      </div>

      {/* ── Recent briefs ──────────────────────────────────────────────── */}
      <div className="bg-white border border-purple-100 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-purple-50">
          <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
            <Inbox className="h-4 w-4 text-purple-500" />
            {t("brief.receivedBriefs")}
          </h3>
          {pendingBriefs.length > 0 && (
            <span className="text-[9px] font-display font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              {pendingBriefs.length} {t("brief.statusPending").toLowerCase()}
            </span>
          )}
        </div>

        {briefs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
              <Inbox className="h-5 w-5 text-purple-300" />
            </div>
            <p className="text-xs font-body text-muted-foreground">{t("brief.noBriefs")}</p>
            <p className="text-[10px] font-body text-muted-foreground mt-0.5">{t("brief.briefsWillAppear")}</p>
          </div>
        ) : (
          <div>
            {briefs.slice(0, 5).map((brief, i) => {
              const isPending = brief.status === "pending_review";
              const isAccepted = brief.status === "accepted";
              return (
                <button
                  key={brief.id}
                  onClick={() => onNavigate("briefs")}
                  className={`w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-purple-50/40 transition-colors ${i < Math.min(briefs.length, 5) - 1 ? "border-b border-purple-50" : ""}`}
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${isPending ? "bg-amber-400" : isAccepted ? "bg-emerald-400" : "bg-gray-300"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-display font-semibold text-foreground">
                        {brief.establishment_type || "N/A"} {brief.stars_or_class || ""}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{brief.country || ""}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-body text-muted-foreground">{brief.budget_range || "—"}</span>
                      <span className="text-[10px] text-muted-foreground">&middot;</span>
                      <span className="text-[10px] font-body text-muted-foreground">{brief.quantity_estimate ?? 0} {t("brief.units", "units")}</span>
                      {brief.collections_interest && brief.collections_interest.length > 0 && (
                        <>
                          <span className="text-[10px] text-muted-foreground">&middot;</span>
                          <span className="text-[9px] font-body text-purple-600">{brief.collections_interest[0]}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-body text-muted-foreground">
                      {new Date(brief.created_at).toLocaleDateString()}
                    </span>
                    {isPending && (
                      <span className="text-[8px] font-display font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                        {t("brief.statusPending")}
                      </span>
                    )}
                    {isAccepted && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    )}
                  </div>
                </button>
              );
            })}
            {briefs.length > 5 && (
              <button
                onClick={() => onNavigate("briefs")}
                className="w-full py-3 text-[10px] font-display font-semibold text-purple-600 hover:text-purple-800 transition-colors flex items-center justify-center gap-1 border-t border-purple-50"
              >
                {t("pd.overview.seeAllRequests")} ({briefs.length}) <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Quick actions ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          onClick={() => onNavigate("briefs")}
          className="flex items-center gap-4 p-4 bg-white border border-purple-100 rounded-2xl text-left hover:border-purple-300 hover:shadow-md hover:shadow-purple-100/30 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-violet-100 flex items-center justify-center shrink-0">
            <Inbox className="h-4.5 w-4.5 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-display font-bold text-foreground group-hover:text-purple-700 transition-colors">{t("brief.receivedBriefs")}</p>
            <p className="text-[10px] font-body text-muted-foreground">{t("brief.briefsWillAppear")}</p>
          </div>
          {pendingBriefs.length > 0 && (
            <span className="text-[9px] font-display font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{pendingBriefs.length}</span>
          )}
        </button>

        <button
          onClick={() => onNavigate("collections")}
          className="flex items-center gap-4 p-4 bg-white border border-purple-100 rounded-2xl text-left hover:border-purple-300 hover:shadow-md hover:shadow-purple-100/30 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center shrink-0">
            <FolderOpen className="h-4.5 w-4.5 text-violet-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-display font-bold text-foreground group-hover:text-purple-700 transition-colors">{t("brand.manageCollections")}</p>
            <p className="text-[10px] font-body text-muted-foreground">{productsCount} {t("brand.productsCount")}</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate("messages")}
          className="flex items-center gap-4 p-4 bg-white border border-purple-100 rounded-2xl text-left hover:border-purple-300 hover:shadow-md hover:shadow-purple-100/30 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center shrink-0">
            <MessageSquare className="h-4.5 w-4.5 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-display font-bold text-foreground group-hover:text-purple-700 transition-colors">{t("pd.msg.title")}</p>
            <p className="text-[10px] font-body text-muted-foreground">{t("account.messages")}</p>
          </div>
          {totalUnread > 0 && (
            <span className="text-[9px] font-display font-bold bg-purple-600 text-white px-2 py-0.5 rounded-full">{totalUnread}</span>
          )}
        </button>
      </div>
    </div>
  );
}
