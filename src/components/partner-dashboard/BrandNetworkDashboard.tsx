import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin, Briefcase, Plus, Trash2, Shield, Globe } from "lucide-react";

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
    routed: { label: t("brief.statusRouted"), color: "#2563EB", bg: "#EFF6FF" },
    accepted: { label: t("network.acceptedByDistrib"), color: "#059669", bg: "#ECFDF5" },
    declined: { label: t("brief.statusDeclined"), color: "#DC2626", bg: "#FEF2F2" },
    pending_review: { label: t("brief.statusPending"), color: "#D97706", bg: "#FFFBEB" },
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

  const routedBriefs = briefs.filter((b) => b.status === "routed" || b.distributor);

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
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <h2 className="font-display text-lg font-bold text-foreground">{t("network.title")}</h2>
        <p className="text-xs font-body text-muted-foreground mt-0.5">{t("network.subtitle")}</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
        <p className="text-xs font-body text-blue-800">{t("network.modeInfo")}</p>
      </div>

      {/* ── Distributors management ─────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            {t("network.distributors")}
          </h3>
          <button
            onClick={() => setAddingDistributor((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-[11px] font-display font-semibold text-[#D4603A] hover:text-[#B84E2E] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("network.addDistributor")}
          </button>
        </div>

        {/* Add distributor form */}
        {addingDistributor ? (
          <div className="flex flex-wrap items-end gap-3 mb-5 p-4 bg-muted/30 rounded-xl border border-border">
            <div>
              <span className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                {t("network.selectCountry")}
              </span>
              <select
                value={newCountry}
                onChange={(e) => setNewCountry(e.target.value)}
                className="text-xs font-body bg-background border border-border rounded-full px-3 py-2 focus:outline-none focus:border-foreground transition-colors"
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
                className="w-full text-xs font-body bg-background border border-border rounded-full px-3 py-2 focus:outline-none focus:border-foreground transition-colors"
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
              className="text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {t("network.addDistributor")}
            </button>
          </div>
        ) : null}

        {/* Distributors list */}
        {distributors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Globe className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-body text-muted-foreground mb-1">{t("network.noDistributors")}</p>
            <p className="text-xs font-body text-muted-foreground">{t("network.addDistributorHint")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {distributors.map((d) => (
              <div key={d.id} className="flex items-center gap-4 p-3 border border-border rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  {d.partner?.logo_url ? (
                    <img src={d.partner.logo_url} alt={d.partner?.name || ""} className="w-6 h-6 rounded object-contain" />
                  ) : (
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
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
                  <span className="text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                    <Shield className="h-2.5 w-2.5" />{t("network.exclusive")}
                  </span>
                ) : null}
                <button
                  onClick={() => handleRemoveDistributor(d.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                  title={t("network.remove")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Routed leads ────────────────────────────────────────────────── */}
      <div>
        <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2 mb-4">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          {t("network.routedLeads")}
        </h3>

        {routedBriefs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Briefcase className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-body text-muted-foreground mb-1">{t("network.noLeads")}</p>
            <p className="text-xs font-body text-muted-foreground">{t("network.leadsWillAppear")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">{t("network.country")}</th>
                  <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">{t("network.distributor")}</th>
                  <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">{t("network.establishment")}</th>
                  <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">{t("network.budget")}</th>
                  <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">{t("network.date")}</th>
                  <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">{t("network.status")}</th>
                </tr>
              </thead>
              <tbody>
                {routedBriefs.map((brief) => {
                  const statusCfg = STATUS_CONFIG[brief.status] || STATUS_CONFIG.routed;
                  return (
                    <tr key={brief.id} className="border-b border-border/50 last:border-0">
                      <td className="py-3">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-foreground">{brief.country || "?"}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="text-xs font-semibold text-foreground">
                          {brief.distributor?.name || t("network.notAssigned")}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="text-xs text-muted-foreground">{brief.establishment_type || "N/A"}</span>
                      </td>
                      <td className="py-3">
                        <span className="text-xs text-foreground font-semibold">{brief.budget_range || "N/A"}</span>
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">
                        {new Date(brief.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <span
                          className="text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
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
