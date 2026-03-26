import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Inbox, Building2, MapPin, Users, Calendar, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, Mail, Phone, Building,
} from "lucide-react";

interface BrandBriefInboxProps {
  partnerId: string;
}

interface Brief {
  id: string;
  establishment_type: string | null;
  stars_or_class: string | null;
  capacity: number | null;
  country: string | null;
  quantity_estimate: number | null;
  budget_range: string | null;
  timeline: string | null;
  project_type: string | null;
  collections_interest: string[] | null;
  qualification_score: number | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company: string | null;
  siren: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 60 ? "bg-green-500" : score >= 30 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(100, score)}%` }} />
      </div>
      <span className={`text-[10px] font-display font-bold ${score >= 60 ? "text-green-600" : score >= 30 ? "text-amber-600" : "text-red-500"}`}>
        {score}
      </span>
    </div>
  );
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending_review: { label: "En attente", color: "#D97706", bg: "#FFFBEB" },
  qualified: { label: "Qualifi\u00e9", color: "#059669", bg: "#ECFDF5" },
  accepted: { label: "Accept\u00e9", color: "#059669", bg: "#ECFDF5" },
  declined: { label: "D\u00e9clin\u00e9", color: "#DC2626", bg: "#FEF2F2" },
  rejected: { label: "Rejet\u00e9", color: "#DC2626", bg: "#FEF2F2" },
  routed: { label: "Rout\u00e9", color: "#2563EB", bg: "#EFF6FF" },
};

export default function BrandBriefInbox({ partnerId }: BrandBriefInboxProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: briefs = [], isLoading } = useQuery({
    queryKey: ["brand-briefs", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_briefs")
        .select("*")
        .eq("brand_partner_id", partnerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Brief[];
    },
  });

  const handleAction = async (briefId: string, action: "accepted" | "declined") => {
    const { error } = await supabase
      .from("project_briefs")
      .update({ status: action, updated_at: new Date().toISOString() })
      .eq("id", briefId);
    if (error) {
      toast.error("Erreur lors de la mise \u00e0 jour.");
      return;
    }
    toast.success(action === "accepted" ? "Brief accept\u00e9 \u2014 coordonn\u00e9es r\u00e9v\u00e9l\u00e9es." : "Brief d\u00e9clin\u00e9.");
    queryClient.invalidateQueries({ queryKey: ["brand-briefs", partnerId] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  if (briefs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Inbox className="h-8 w-8 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-body text-muted-foreground mb-1">Aucun brief re\u00e7u pour le moment.</p>
        <p className="text-xs font-body text-muted-foreground">Les briefs projet qualifi\u00e9s apparaitront ici.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Briefs projet re\u00e7us</h2>
          <p className="text-xs font-body text-muted-foreground">{briefs.length} brief{briefs.length > 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="space-y-3">
        {briefs.map((brief) => {
          const expanded = expandedId === brief.id;
          const statusCfg = STATUS_CONFIG[brief.status] || STATUS_CONFIG.pending_review;
          const showContact = brief.status === "accepted";

          return (
            <div key={brief.id} className="border border-border rounded-xl overflow-hidden">
              {/* Summary row */}
              <button
                onClick={() => setExpandedId(expanded ? null : brief.id)}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-card/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-display font-semibold text-foreground">
                      {brief.establishment_type ? (brief.establishment_type === "hotel" ? "H\u00f4tel" : brief.establishment_type.charAt(0).toUpperCase() + brief.establishment_type.slice(1)) : "N/A"}
                    </span>
                    {brief.stars_or_class && (
                      <span className="text-[10px] text-muted-foreground">{brief.stars_or_class}</span>
                    )}
                    <span className="text-[10px] text-muted-foreground">\u00b7 {brief.country || "?"}</span>
                    <span className="text-[10px] text-muted-foreground">\u00b7 {brief.budget_range || "?"}</span>
                    <span className="text-[10px] text-muted-foreground">\u00b7 {brief.quantity_estimate ?? 0} unit\u00e9s</span>
                  </div>
                  {brief.collections_interest && brief.collections_interest.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {brief.collections_interest.map((c) => (
                        <span key={c} className="text-[9px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-body">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-24">
                    <ScoreBar score={brief.qualification_score || 0} />
                  </div>
                  <span
                    className="text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ background: statusCfg.bg, color: statusCfg.color }}
                  >
                    {statusCfg.label}
                  </span>
                  {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {/* Expanded details */}
              {expanded && (
                <div className="border-t border-border p-4 bg-card/30 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-body">
                    <div>
                      <p className="text-muted-foreground">\u00c9tablissement</p>
                      <p className="font-semibold text-foreground">{brief.establishment_type || "N/A"} {brief.stars_or_class || ""}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Capacit\u00e9</p>
                      <p className="font-semibold text-foreground">{brief.capacity || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Budget</p>
                      <p className="font-semibold text-foreground">{brief.budget_range || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Calendrier</p>
                      <p className="font-semibold text-foreground">{brief.timeline || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Type projet</p>
                      <p className="font-semibold text-foreground">{brief.project_type || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Quantit\u00e9</p>
                      <p className="font-semibold text-foreground">{brief.quantity_estimate || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pays</p>
                      <p className="font-semibold text-foreground">{brief.country || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Date</p>
                      <p className="font-semibold text-foreground">{new Date(brief.created_at).toLocaleDateString("fr-FR")}</p>
                    </div>
                  </div>

                  {brief.message && (
                    <div className="text-xs font-body">
                      <p className="text-muted-foreground mb-1">Message</p>
                      <p className="text-foreground bg-background border border-border rounded-lg p-3">{brief.message}</p>
                    </div>
                  )}

                  {/* Contact info — only shown after acceptance */}
                  {showContact && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-display font-semibold text-green-800 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Coordonn\u00e9es de l'acheteur
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs font-body text-green-800">
                        <p className="flex items-center gap-1.5"><Users className="h-3 w-3" /> {brief.first_name || "—"} {brief.last_name || ""}</p>
                        <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {brief.email || "N/A"}</p>
                        <p className="flex items-center gap-1.5"><Building className="h-3 w-3" /> {brief.company || "N/A"}</p>
                        <p className="flex items-center gap-1.5">SIREN: {brief.siren || "N/A"}</p>
                      </div>
                    </div>
                  )}

                  {/* Actions — only for pending_review */}
                  {brief.status === "pending_review" && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleAction(brief.id, "accepted")}
                        className="flex items-center gap-1.5 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full px-4 py-2 hover:opacity-90 transition-opacity"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Accepter
                      </button>
                      <button
                        onClick={() => handleAction(brief.id, "declined")}
                        className="flex items-center gap-1.5 text-xs font-display font-semibold border border-border text-muted-foreground rounded-full px-4 py-2 hover:bg-card transition-colors"
                      >
                        <XCircle className="h-3.5 w-3.5" /> D\u00e9cliner
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
