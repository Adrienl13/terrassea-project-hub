import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useConversations } from "@/hooks/useConversations";
import {
  Globe, Users, Briefcase, TrendingUp, ArrowRight, MapPin, CheckCircle2,
  Crown, Sparkles, MessageSquare, FolderOpen, Package, AlertTriangle,
} from "lucide-react";

interface BrandNetworkOverviewProps {
  partnerId: string;
  onNavigate: (section: string) => void;
}

export default function BrandNetworkOverview({ partnerId, onNavigate }: BrandNetworkOverviewProps) {
  const { t } = useTranslation();
  const { totalUnread } = useConversations();

  // Fetch distributors
  const { data: distributors = [] } = useQuery({
    queryKey: ["brand-network-overview-distributors", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_distributors")
        .select("id, country_code, is_exclusive, partner:distributor_id(name, country)")
        .eq("brand_id", partnerId)
        .eq("is_active", true);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch briefs stats
  const { data: briefs = [] } = useQuery({
    queryKey: ["brand-network-overview-briefs", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_briefs")
        .select("id, status, country, budget_range, establishment_type, stars_or_class, quantity_estimate, created_at, routed_to_partner_id")
        .eq("brand_partner_id", partnerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch collections count
  const { data: collectionsData } = useQuery({
    queryKey: ["brand-network-overview-collections", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_offers")
        .select("id, collection_name")
        .eq("partner_id", partnerId)
        .eq("is_active", true);
      if (error) return { products: 0, collections: 0 };
      const items = data ?? [];
      return {
        products: items.length,
        collections: new Set(items.map((d) => d.collection_name).filter(Boolean)).size,
      };
    },
  });

  const countriesCovered = new Set(distributors.map((d) => d.country_code));
  const totalLeads = briefs.length;
  const routedLeads = briefs.filter((b) => b.routed_to_partner_id).length;
  const pendingLeads = briefs.filter((b) => b.status === "pending_review").length;
  const acceptedLeads = briefs.filter((b) => b.status === "accepted").length;
  const conversionRate = totalLeads > 0 ? Math.round((acceptedLeads / totalLeads) * 100) : 0;
  const productsCount = collectionsData?.products ?? 0;
  const collectionsCount = collectionsData?.collections ?? 0;

  // Countries from briefs that don't have distributors
  const uncoveredCountries = new Set(
    briefs
      .filter((b) => b.country && !b.routed_to_partner_id)
      .map((b) => b.country!)
  );

  return (
    <div className="space-y-6">
      {/* ── Premium hero ───────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-700 via-purple-600 to-indigo-800 p-7">
        <div className="absolute -top-8 -right-8 w-48 h-48 opacity-[0.06]">
          <Crown className="w-full h-full text-white" />
        </div>
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/10 to-transparent" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-purple-200" />
            <span className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-purple-200">Brand Network</span>
          </div>
          <h2 className="font-display text-xl font-bold text-white">{t("account.overview")}</h2>
          <p className="text-xs font-body text-purple-200/80 mt-1">{t("network.subtitle")}</p>
        </div>

        {/* Inline stats */}
        <div className="relative grid grid-cols-4 gap-3 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-3 text-center">
            <p className="text-2xl font-display font-bold text-white">{countriesCovered.size}</p>
            <p className="text-[8px] font-body text-purple-200 uppercase tracking-wider mt-0.5">{t("network.countriesCovered")}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-3 text-center">
            <p className="text-2xl font-display font-bold text-white">{distributors.length}</p>
            <p className="text-[8px] font-body text-purple-200 uppercase tracking-wider mt-0.5">{t("network.distributors")}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-3 text-center">
            <p className="text-2xl font-display font-bold text-white">{totalLeads}</p>
            <p className="text-[8px] font-body text-purple-200 uppercase tracking-wider mt-0.5">{t("network.totalLeads")}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-3 text-center">
            <p className="text-2xl font-display font-bold text-white">{conversionRate}%</p>
            <p className="text-[8px] font-body text-purple-200 uppercase tracking-wider mt-0.5">{t("network.conversionRate")}</p>
          </div>
        </div>
      </div>

      {/* ── Country coverage + alerts ──────────────────────────────────── */}
      <div className="bg-white border border-purple-100 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-purple-50">
          <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
            <Globe className="h-4 w-4 text-purple-500" />
            {t("network.coverageMap")}
          </h3>
          <button
            onClick={() => onNavigate("network")}
            className="text-[10px] font-display font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1 transition-colors"
          >
            {t("network.addDistributor")} <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {distributors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
              <Globe className="h-5 w-5 text-purple-300" />
            </div>
            <p className="text-xs font-display font-semibold text-foreground mb-1">{t("network.noDistributors")}</p>
            <p className="text-[10px] font-body text-muted-foreground mb-3">{t("network.addDistributorHint")}</p>
            <button
              onClick={() => onNavigate("network")}
              className="text-xs font-display font-semibold text-white rounded-full px-5 py-2"
              style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }}
            >
              {t("network.addDistributor")}
            </button>
          </div>
        ) : (
          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {distributors.map((d) => {
                const partner = d.partner as { name: string; country: string | null } | null;
                return (
                  <div key={d.id} className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-display font-bold text-foreground truncate">{d.country_code}</p>
                      <p className="text-[9px] font-body text-muted-foreground truncate">{partner?.name || "\u2014"}</p>
                    </div>
                    {d.is_exclusive ? (
                      <span className="text-[7px] font-display font-bold uppercase tracking-wider text-amber-600 ml-auto shrink-0">{t("network.exclusive")}</span>
                    ) : null}
                  </div>
                );
              })}
              {[...uncoveredCountries].map((country) => (
                <div key={country} className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-display font-bold text-foreground">{country}</p>
                    <p className="text-[9px] font-body text-amber-600">{t("network.noCoverage")}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Recent leads ───────────────────────────────────────────────── */}
      <div className="bg-white border border-purple-100 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-purple-50">
          <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-purple-500" />
            {t("network.routedLeads")}
          </h3>
          {pendingLeads > 0 && (
            <span className="text-[9px] font-display font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              {t("network.pendingCount", { count: pendingLeads })}
            </span>
          )}
        </div>

        {briefs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
              <Briefcase className="h-5 w-5 text-purple-300" />
            </div>
            <p className="text-xs font-body text-muted-foreground">{t("network.noLeads")}</p>
            <p className="text-[10px] font-body text-muted-foreground mt-0.5">{t("network.leadsWillAppear")}</p>
          </div>
        ) : (
          <div>
            {briefs.slice(0, 5).map((brief, i) => {
              const isPending = brief.status === "pending_review";
              const isRouted = !!brief.routed_to_partner_id;
              const isAccepted = brief.status === "accepted";
              return (
                <button
                  key={brief.id}
                  onClick={() => onNavigate("network")}
                  className={`w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-purple-50/40 transition-colors ${i < Math.min(briefs.length, 5) - 1 ? "border-b border-purple-50" : ""}`}
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${isPending ? "bg-amber-400" : isAccepted ? "bg-emerald-400" : isRouted ? "bg-purple-400" : "bg-gray-300"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-display font-semibold text-foreground">
                        {brief.establishment_type || "N/A"} {brief.stars_or_class || ""}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-2.5 w-2.5" />{brief.country || "?"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-body text-muted-foreground">{brief.budget_range || "—"}</span>
                      <span className="text-[10px] text-muted-foreground">&middot;</span>
                      <span className="text-[10px] font-body text-muted-foreground">{brief.quantity_estimate ?? 0} {t("brief.units", "units")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-body text-muted-foreground">
                      {new Date(brief.created_at).toLocaleDateString()}
                    </span>
                    {isRouted && <span className="text-[8px] font-display font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">{t("brief.statusRouted")}</span>}
                    {isPending && <span className="text-[8px] font-display font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">{t("brief.statusPending")}</span>}
                    {isAccepted && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                  </div>
                </button>
              );
            })}
            {briefs.length > 5 && (
              <button
                onClick={() => onNavigate("network")}
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
          onClick={() => onNavigate("network")}
          className="flex items-center gap-4 p-4 bg-white border border-purple-100 rounded-2xl text-left hover:border-purple-300 hover:shadow-md hover:shadow-purple-100/30 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-violet-100 flex items-center justify-center shrink-0">
            <Globe className="h-4.5 w-4.5 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-display font-bold text-foreground group-hover:text-purple-700 transition-colors">{t("network.distributors")}</p>
            <p className="text-[10px] font-body text-muted-foreground">{t("network.manageDistributorsDesc")}</p>
          </div>
          <span className="text-[9px] font-display font-bold bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{distributors.length}</span>
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
            <p className="text-[10px] font-body text-muted-foreground">{productsCount} {t("brand.productsCount")} &middot; {collectionsCount} {t("brand.collectionsCount")}</p>
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
