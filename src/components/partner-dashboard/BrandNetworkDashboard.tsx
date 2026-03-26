import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin, Briefcase, Plus, Trash2, Shield, Globe, TrendingUp, Users, Crown, Sparkles } from "lucide-react";

interface BrandNetworkDashboardProps {
  partnerId: string;
}

interface RoutedBrief {
  id: string;
  country: string | null;
  establishment_type: string | null;
  budget_range: string | null;
  status: string;
  created_at: string;
  distributor: {
    name: string;
    country: string | null;
  } | null;
}

interface Distributor {
  id: string;
  brand_id: string;
  distributor_id: string;
  country_code: string;
  is_exclusive: boolean | null;
  is_active: boolean | null;
  priority: number | null;
  partner: {
    id: string;
    name: string;
    country: string | null;
    logo_url: string | null;
  } | null;
}

interface AvailablePartner {
  id: string;
  name: string;
  country: string | null;
}

const COUNTRY_OPTIONS = ["FR", "ES", "IT", "DE", "BE", "NL", "PT", "CH", "AT", "GB", "DK", "SE", "PL", "GR"];

function useStatusConfig() {
  const { t } = useTranslation();
  return {
    routed: { label: t("brief.statusRouted"), color: "#7C3AED", bg: "linear-gradient(135deg, #F5F3FF, #EDE9FE)" },
    accepted: { label: t("network.acceptedByDistrib"), color: "#059669", bg: "linear-gradient(135deg, #ECFDF5, #D1FAE5)" },
    declined: { label: t("brief.statusDeclined"), color: "#DC2626", bg: "linear-gradient(135deg, #FEF2F2, #FECACA)" },
    pending_review: { label: t("brief.statusPending"), color: "#D97706", bg: "linear-gradient(135deg, #FFFBEB, #FEF3C7)" },
  } as Record<string, { label: string; color: string; bg: string }>;
}

export default function BrandNetworkDashboard({ partnerId }: BrandNetworkDashboardProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const STATUS_CONFIG = useStatusConfig();
  const [addingDistributor, setAddingDistributor] = useState(false);
  const [newCountry, setNewCountry] = useState("");
  const [newDistributorId, setNewDistributorId] = useState("");

  // ── Fetch distributors for this brand ──────────────────────────────────
  const { data: distributors = [] } = useQuery({
    queryKey: ["brand-distributors", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_distributors")
        .select("id, brand_id, distributor_id, country_code, is_exclusive, is_active, priority, partner:distributor_id(id, name, country, logo_url)")
        .eq("brand_id", partnerId)
        .eq("is_active", true)
        .order("country_code");
      if (error) throw error;
      return (data ?? []) as Distributor[];
    },
  });

  // ── Fetch available partners (resellers/distributors) ──────────────────
  const { data: availablePartners = [] } = useQuery({
    queryKey: ["available-distributors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, name, country")
        .in("partner_type", ["reseller", "distributor", "wholesaler"])
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as AvailablePartner[];
    },
    enabled: addingDistributor,
  });

  // ── Fetch routed briefs ────────────────────────────────────────────────
  const { data: briefs = [], isLoading } = useQuery({
    queryKey: ["brand-network-briefs", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_briefs")
        .select("id, country, establishment_type, budget_range, status, created_at, distributor:partners!project_briefs_routed_to_partner_id_fkey(name, country)")
        .eq("brand_partner_id", partnerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RoutedBrief[];
    },
  });

  const routedBriefs = briefs;

  // ── Add distributor ────────────────────────────────────────────────────
  const handleAddDistributor = async () => {
    if (!newCountry || !newDistributorId) return;
    const { error } = await supabase.from("brand_distributors").insert({
      brand_id: partnerId,
      distributor_id: newDistributorId,
      country_code: newCountry,
      is_active: true,
    });
    if (error) {
      toast.error(t("brand.updateError"));
      return;
    }
    toast.success(t("network.added"));
    setAddingDistributor(false);
    setNewCountry("");
    setNewDistributorId("");
    queryClient.invalidateQueries({ queryKey: ["brand-distributors", partnerId] });
  };

  // ── Remove distributor ─────────────────────────────────────────────────
  const handleRemoveDistributor = async (id: string) => {
    const { error } = await supabase
      .from("brand_distributors")
      .update({ is_active: false })
      .eq("id", id);
    if (error) {
      toast.error(t("brand.updateError"));
      return;
    }
    toast.success(t("network.removed"));
    queryClient.invalidateQueries({ queryKey: ["brand-distributors", partnerId] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Premium Header ────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6">
        <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
          <Crown className="w-full h-full text-white" />
        </div>
        <div className="relative">
          <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t("network.title")}
          </h2>
          <p className="text-xs font-body text-purple-200 mt-0.5">{t("network.subtitle")}</p>
        </div>
      </div>

      {/* ── Stats bar ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-purple-100 rounded-2xl p-4 hover:shadow-md hover:shadow-purple-100/50 transition-all">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 flex items-center justify-center mb-2">
            <Globe className="h-4 w-4 text-blue-600" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{new Set(distributors.map((d) => d.country_code)).size}</p>
          <p className="text-[9px] font-body text-muted-foreground uppercase tracking-wider">{t("network.countriesCovered")}</p>
        </div>
        <div className="bg-white border border-purple-100 rounded-2xl p-4 hover:shadow-md hover:shadow-purple-100/50 transition-all">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-600/10 flex items-center justify-center mb-2">
            <Users className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{distributors.length}</p>
          <p className="text-[9px] font-body text-muted-foreground uppercase tracking-wider">{t("network.distributors")}</p>
        </div>
        <div className="bg-white border border-purple-100 rounded-2xl p-4 hover:shadow-md hover:shadow-purple-100/50 transition-all">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/10 to-violet-600/10 flex items-center justify-center mb-2">
            <Briefcase className="h-4 w-4 text-purple-600" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{routedBriefs.length}</p>
          <p className="text-[9px] font-body text-muted-foreground uppercase tracking-wider">{t("network.routedLeads")}</p>
        </div>
        <div className="bg-white border border-purple-100 rounded-2xl p-4 hover:shadow-md hover:shadow-purple-100/50 transition-all">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/10 to-indigo-600/10 flex items-center justify-center mb-2">
            <TrendingUp className="h-4 w-4 text-violet-600" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">
            {briefs.length > 0 ? Math.round((briefs.filter((b) => b.status === "accepted").length / briefs.length) * 100) : 0}%
          </p>
          <p className="text-[9px] font-body text-muted-foreground uppercase tracking-wider">{t("network.conversionRate")}</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-2xl p-4">
        <p className="text-xs font-body text-purple-800 flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-purple-500 shrink-0" />
          {t("network.modeInfo")}
        </p>
      </div>

      {/* ── Distributors management ───────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
            <Globe className="h-4 w-4 text-purple-500" />
            {t("network.distributors")}
          </h3>
          <button
            onClick={() => setAddingDistributor((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-[11px] font-display font-semibold text-purple-600 hover:text-purple-800 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("network.addDistributor")}
          </button>
        </div>

        {/* Add distributor form */}
        {addingDistributor ? (
          <div className="flex flex-wrap items-end gap-3 mb-5 p-5 bg-gradient-to-br from-purple-50/50 to-violet-50/50 rounded-2xl border border-purple-100">
            <div>
              <span className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                {t("network.selectCountry")}
              </span>
              <select
                value={newCountry}
                onChange={(e) => setNewCountry(e.target.value)}
                className="text-xs font-body bg-white border border-purple-200 rounded-full px-3 py-2 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-all"
              >
                <option value="">{t("brief.selectPlaceholder")}</option>
                {COUNTRY_OPTIONS.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <span className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                {t("network.selectPartner")}
              </span>
              <select
                value={newDistributorId}
                onChange={(e) => setNewDistributorId(e.target.value)}
                className="w-full text-xs font-body bg-white border border-purple-200 rounded-full px-3 py-2 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-all"
              >
                <option value="">{t("brief.selectPlaceholder")}</option>
                {availablePartners.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.country ? " (" + p.country + ")" : ""}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAddDistributor}
              disabled={!newCountry || !newDistributorId}
              className="text-xs font-display font-semibold text-white rounded-full px-5 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }}
            >
              {t("network.addDistributor")}
            </button>
          </div>
        ) : null}

        {/* Distributors list */}
        {distributors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 flex items-center justify-center mb-3">
              <Globe className="h-6 w-6 text-purple-400" />
            </div>
            <p className="text-sm font-display font-semibold text-foreground mb-1">{t("network.noDistributors")}</p>
            <p className="text-xs font-body text-muted-foreground">{t("network.addDistributorHint")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {distributors.map((d) => (
              <div key={d.id} className="flex items-center gap-4 p-4 border border-purple-100 rounded-2xl bg-white hover:shadow-sm hover:shadow-purple-100/50 transition-all">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 flex items-center justify-center shrink-0">
                  {d.partner?.logo_url ? (
                    <img src={d.partner.logo_url} alt={d.partner?.name || ""} className="w-7 h-7 rounded-lg object-contain" />
                  ) : (
                    <MapPin className="h-4 w-4 text-purple-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-display font-semibold text-foreground truncate">
                    {d.partner?.name || t("network.notAssigned")}
                  </p>
                  <p className="text-[10px] font-body text-muted-foreground">
                    {d.country_code}{d.partner?.country ? " \u00b7 " + d.partner.country : ""}
                  </p>
                </div>
                {d.is_exclusive ? (
                  <span className="text-[9px] font-display font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                    <Shield className="h-2.5 w-2.5" />{t("network.exclusive")}
                  </span>
                ) : null}
                <button
                  onClick={() => handleRemoveDistributor(d.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-red-50"
                  title={t("network.remove")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Routed leads ──────────────────────────────────────────────── */}
      <div>
        <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2 mb-4">
          <Briefcase className="h-4 w-4 text-purple-500" />
          {t("network.routedLeads")}
        </h3>

        {routedBriefs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 flex items-center justify-center mb-3">
              <Briefcase className="h-6 w-6 text-purple-400" />
            </div>
            <p className="text-sm font-display font-semibold text-foreground mb-1">{t("network.noLeads")}</p>
            <p className="text-xs font-body text-muted-foreground">{t("network.leadsWillAppear")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-purple-100">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="border-b border-purple-100 bg-gradient-to-r from-purple-50/50 to-violet-50/50 text-left">
                  <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">{t("network.country")}</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">{t("network.distributor")}</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">{t("network.establishment")}</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">{t("network.budget")}</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">{t("network.date")}</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">{t("network.status")}</th>
                </tr>
              </thead>
              <tbody>
                {routedBriefs.map((brief) => {
                  const statusCfg = STATUS_CONFIG[brief.status] || STATUS_CONFIG.routed;
                  return (
                    <tr key={brief.id} className="border-b border-purple-50 last:border-0 hover:bg-purple-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-purple-400" />
                          <span className="text-xs text-foreground">{brief.country || "?"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold text-foreground">
                          {brief.distributor?.name || t("network.notAssigned")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">{brief.establishment_type || "N/A"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-foreground font-semibold">{brief.budget_range || "N/A"}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(brief.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-[9px] font-display font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
                          style={{ background: statusCfg.bg, color: statusCfg.color }}
                        >
                          {statusCfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
