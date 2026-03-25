import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Briefcase } from "lucide-react";

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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  routed: { label: "Rout\u00e9", color: "#2563EB", bg: "#EFF6FF" },
  accepted: { label: "Accept\u00e9 par distrib.", color: "#059669", bg: "#ECFDF5" },
  declined: { label: "D\u00e9clin\u00e9", color: "#DC2626", bg: "#FEF2F2" },
  pending_review: { label: "En attente", color: "#D97706", bg: "#FFFBEB" },
};

export default function BrandNetworkDashboard({ partnerId }: BrandNetworkDashboardProps) {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-lg font-bold text-foreground">R\u00e9seau de distribution</h2>
        <p className="text-xs font-body text-muted-foreground">
          Leads rout\u00e9s automatiquement vers vos distributeurs agr\u00e9\u00e9s par pays.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6">
        <p className="text-xs font-body text-blue-800">
          <strong>Mode Brand Network</strong> \u2014 Les briefs sont automatiquement dirig\u00e9s vers le distributeur agr\u00e9\u00e9 du pays de l'acheteur.
          Vous ne pouvez pas interagir directement avec ces leads. Le distributeur a la main.
        </p>
      </div>

      {routedBriefs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Briefcase className="h-8 w-8 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-body text-muted-foreground mb-1">Aucun lead rout\u00e9 pour le moment.</p>
          <p className="text-xs font-body text-muted-foreground">Les leads apparaitront ici une fois des briefs soumis.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">Pays</th>
                <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">Distributeur</th>
                <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">\u00c9tablissement</th>
                <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">Budget</th>
                <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">Date</th>
                <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">Statut</th>
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
                        {brief.distributor?.name || "Non assign\u00e9"}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="text-xs text-muted-foreground">
                        {brief.establishment_type || "N/A"}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="text-xs text-foreground font-semibold">{brief.budget_range || "N/A"}</span>
                    </td>
                    <td className="py-3 text-xs text-muted-foreground">
                      {new Date(brief.created_at).toLocaleDateString("fr-FR")}
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
  );
}
