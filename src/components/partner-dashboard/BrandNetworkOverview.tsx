import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Globe, Users, Briefcase, TrendingUp, ArrowRight, MapPin, CheckCircle2 } from "lucide-react";

interface BrandNetworkOverviewProps {
  partnerId: string;
  onNavigate: (section: string) => void;
}

export default function BrandNetworkOverview({ partnerId, onNavigate }: BrandNetworkOverviewProps) {
  const { t } = useTranslation();

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
        .select("id, status, country, created_at, routed_to_partner_id")
        .eq("brand_partner_id", partnerId);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch collections count
  const { data: collectionsCount = 0 } = useQuery({
    queryKey: ["brand-network-overview-collections", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_offers")
        .select("collection_name")
        .eq("partner_id", partnerId)
        .eq("is_active", true)
        .not("collection_name", "is", null);
      if (error) return 0;
      return new Set((data ?? []).map((d) => d.collection_name)).size;
    },
  });

  const countriesCovered = new Set(distributors.map((d) => d.country_code));
  const totalLeads = briefs.length;
  const routedLeads = briefs.filter((b) => b.routed_to_partner_id).length;
  const pendingLeads = briefs.filter((b) => b.status === "pending_review").length;
  const acceptedLeads = briefs.filter((b) => b.status === "accepted").length;
  const conversionRate = totalLeads > 0 ? Math.round((acceptedLeads / totalLeads) * 100) : 0;

  // Countries without distributors from briefs
  const uncoveredCountries = new Set(
    briefs
      .filter((b) => b.country && !b.routed_to_partner_id)
      .map((b) => b.country!)
  );

  return (
    <div className="space-y-8">
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Globe}
          value={String(countriesCovered.size)}
          label={t("network.countriesCovered", "Pays couverts")}
          color="#2563EB"
        />
        <StatCard
          icon={Users}
          value={String(distributors.length)}
          label={t("network.distributors")}
          color="#059669"
        />
        <StatCard
          icon={Briefcase}
          value={String(totalLeads)}
          label={t("network.totalLeads", "Leads totaux")}
          sub={routedLeads > 0 ? t("network.routedCount", "{{count}} routé", { count: routedLeads }) : undefined}
          color="#D4603A"
        />
        <StatCard
          icon={TrendingUp}
          value={conversionRate + "%"}
          label={t("network.conversionRate", "Taux conversion")}
          color="#7C3AED"
        />
      </div>

      {/* Country coverage map */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="font-display text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          {t("network.coverageMap", "Couverture géographique")}
        </h3>
        {distributors.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-xs font-body text-muted-foreground mb-3">{t("network.noDistributors")}</p>
            <button
              onClick={() => onNavigate("network")}
              className="inline-flex items-center gap-1.5 text-xs font-display font-semibold text-[#D4603A] hover:text-[#B84E2E] transition-colors"
            >
              {t("network.addDistributor")} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {distributors.map((d) => {
              const partner = d.partner as { name: string; country: string | null } | null;
              return (
                <div key={d.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 border border-green-200">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-display font-bold text-foreground truncate">
                      {d.country_code}
                    </p>
                    <p className="text-[9px] font-body text-muted-foreground truncate">
                      {partner?.name || "—"}
                    </p>
                  </div>
                  {d.is_exclusive ? (
                    <span className="text-[7px] font-display font-bold uppercase tracking-wider text-amber-600 ml-auto shrink-0">
                      {t("network.exclusive")}
                    </span>
                  ) : null}
                </div>
              );
            })}
            {/* Show uncovered countries with briefs as warnings */}
            {[...uncoveredCountries].map((country) => (
              <div key={country} className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-display font-bold text-foreground">{country}</p>
                  <p className="text-[9px] font-body text-amber-600">{t("network.noCoverage", "Non couvert")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickAction
          icon={Globe}
          title={t("network.distributors")}
          desc={t("network.manageDistributorsDesc", "Gérer vos distributeurs par pays")}
          count={distributors.length}
          onClick={() => onNavigate("network")}
        />
        <QuickAction
          icon={Briefcase}
          title={t("network.routedLeads")}
          desc={t("network.viewLeadsDesc", "Suivre les leads routés")}
          count={pendingLeads > 0 ? pendingLeads : undefined}
          badge={pendingLeads > 0 ? t("network.pendingCount", "{{count}} en attente", { count: pendingLeads }) : undefined}
          onClick={() => onNavigate("network")}
        />
        <QuickAction
          icon={Users}
          title={t("brand.manageCollections")}
          desc={t("network.collectionsDesc", "Vos collections produits")}
          count={collectionsCount}
          onClick={() => onNavigate("collections")}
        />
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ icon: Icon, value, label, sub, color }: {
  icon: typeof Globe; value: string; label: string; sub?: string; color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color + "15" }}>
          <Icon className="h-3.5 w-3.5" style={{ color }} />
        </div>
      </div>
      <p className="font-display text-2xl font-bold text-foreground">{value}</p>
      <p className="text-[10px] font-body text-muted-foreground uppercase tracking-wider">{label}</p>
      {sub ? <p className="text-[9px] font-body text-muted-foreground mt-0.5">{sub}</p> : null}
    </div>
  );
}

function QuickAction({ icon: Icon, title, desc, count, badge, onClick }: {
  icon: typeof Globe; title: string; desc: string; count?: number; badge?: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 p-4 bg-card border border-border rounded-xl text-left hover:border-foreground/20 hover:shadow-sm transition-all group"
    >
      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-display font-bold text-foreground group-hover:text-[#D4603A] transition-colors">{title}</p>
          {count !== undefined ? (
            <span className="text-[9px] font-display font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{count}</span>
          ) : null}
        </div>
        <p className="text-[10px] font-body text-muted-foreground mt-0.5">{desc}</p>
        {badge ? (
          <span className="inline-flex text-[9px] font-display font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full mt-1.5">
            {badge}
          </span>
        ) : null}
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0 mt-1" />
    </button>
  );
}
