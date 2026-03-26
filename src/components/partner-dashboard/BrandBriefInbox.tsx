import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Inbox, Building2, MapPin, Users, Calendar, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, Mail, Phone, Building, Sparkles, Crown,
  Eye, FileText, Shield, Lightbulb, ArrowRight,
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
  const color = score >= 60 ? "bg-emerald-500" : score >= 30 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(100, score)}%` }} />
      </div>
      <span className={`text-[10px] font-display font-bold ${score >= 60 ? "text-emerald-600" : score >= 30 ? "text-amber-600" : "text-red-500"}`}>
        {score}
      </span>
    </div>
  );
}

function useStatusConfig() {
  const { t } = useTranslation();
  return {
    pending_review: { label: t("brief.statusPending"), color: "#D97706", bg: "linear-gradient(135deg, #FFFBEB, #FEF3C7)" },
    qualified: { label: t("brief.statusQualified"), color: "#059669", bg: "linear-gradient(135deg, #ECFDF5, #D1FAE5)" },
    accepted: { label: t("brief.statusAccepted"), color: "#059669", bg: "linear-gradient(135deg, #ECFDF5, #D1FAE5)" },
    declined: { label: t("brief.statusDeclined"), color: "#DC2626", bg: "linear-gradient(135deg, #FEF2F2, #FECACA)" },
    rejected: { label: t("brief.statusRejected"), color: "#DC2626", bg: "linear-gradient(135deg, #FEF2F2, #FECACA)" },
    routed: { label: t("brief.statusRouted"), color: "#7C3AED", bg: "linear-gradient(135deg, #F5F3FF, #EDE9FE)" },
  } as Record<string, { label: string; color: string; bg: string }>;
}

export default function BrandBriefInbox({ partnerId }: BrandBriefInboxProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const STATUS_CONFIG = useStatusConfig();
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
      toast.error(t("brand.updateError"));
      return;
    }
    toast.success(action === "accepted" ? t("brief.briefAccepted") : t("brief.briefDeclined"));
    queryClient.invalidateQueries({ queryKey: ["brand-briefs", partnerId] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  const pendingCount = briefs.filter((b) => b.status === "pending_review").length;
  const acceptedCount = briefs.filter((b) => b.status === "accepted").length;

  if (briefs.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-violet-600 to-purple-700 p-7">
          <div className="absolute -top-6 -right-6 w-40 h-40 opacity-[0.06]">
            <Crown className="w-full h-full text-white" />
          </div>
          <div className="relative">
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              {t("brief.emptyTitle")}
            </h2>
            <p className="text-xs font-body text-purple-200 mt-1">{t("brief.emptySubtitle")}</p>
          </div>
        </div>

        {/* How it works — 4 steps */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            { icon: Eye, titleKey: "brief.howStep1Title", descKey: "brief.howStep1Desc", color: "#7C3AED", num: "1" },
            { icon: FileText, titleKey: "brief.howStep2Title", descKey: "brief.howStep2Desc", color: "#6D28D9", num: "2" },
            { icon: Shield, titleKey: "brief.howStep3Title", descKey: "brief.howStep3Desc", color: "#5B21B6", num: "3" },
            { icon: CheckCircle2, titleKey: "brief.howStep4Title", descKey: "brief.howStep4Desc", color: "#4C1D95", num: "4" },
          ].map((step) => (
            <div key={step.num} className="bg-white border border-purple-100 rounded-2xl p-5 relative">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-display font-bold"
                  style={{ background: `linear-gradient(135deg, ${step.color}, ${step.color}dd)` }}
                >
                  {step.num}
                </div>
                <step.icon className="h-4 w-4 text-purple-400" />
              </div>
              <p className="text-xs font-display font-bold text-foreground mb-1">{t(step.titleKey)}</p>
              <p className="text-[10px] font-body text-muted-foreground leading-relaxed">{t(step.descKey)}</p>
            </div>
          ))}
        </div>

        {/* Tips */}
        <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-2xl p-5">
          <h3 className="text-xs font-display font-bold text-purple-800 flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-purple-500" />
            {t("brief.tipTitle")}
          </h3>
          <div className="space-y-2">
            {["brief.tip1", "brief.tip2", "brief.tip3"].map((key) => (
              <div key={key} className="flex items-start gap-2">
                <ArrowRight className="h-3 w-3 text-purple-400 mt-0.5 shrink-0" />
                <p className="text-[11px] font-body text-purple-700">{t(key)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Premium header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-violet-600 to-purple-700 p-6 mb-6">
        <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
          <Crown className="w-full h-full text-white" />
        </div>
        <div className="relative">
          <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {t("brief.receivedBriefs")}
          </h2>
          <p className="text-xs font-body text-purple-200 mt-1">{briefs.length} brief{briefs.length > 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-4 mt-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
            <p className="text-xl font-display font-bold text-white">{pendingCount}</p>
            <p className="text-[9px] font-body text-purple-200 uppercase tracking-wider">{t("brief.statusPending")}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
            <p className="text-xl font-display font-bold text-white">{acceptedCount}</p>
            <p className="text-[9px] font-body text-purple-200 uppercase tracking-wider">{t("brief.statusAccepted")}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {briefs.map((brief) => {
          const expanded = expandedId === brief.id;
          const statusCfg = STATUS_CONFIG[brief.status] || STATUS_CONFIG.pending_review;
          const showContact = brief.status === "accepted";

          return (
            <div key={brief.id} className="border border-border rounded-2xl overflow-hidden hover:border-purple-200 transition-colors">
              {/* Summary row */}
              <button
                onClick={() => setExpandedId(expanded ? null : brief.id)}
                aria-expanded={expanded}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-purple-50/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-display font-semibold text-foreground">
                      {brief.establishment_type ? t("brief." + brief.establishment_type, brief.establishment_type) : "N/A"}
                    </span>
                    {brief.stars_or_class && (
                      <span className="text-[10px] text-muted-foreground">{brief.stars_or_class}</span>
                    )}
                    <span className="text-[10px] text-muted-foreground">&middot; {brief.country || "?"}</span>
                    <span className="text-[10px] text-muted-foreground">&middot; {brief.budget_range || "?"}</span>
                    <span className="text-[10px] text-muted-foreground">&middot; {brief.quantity_estimate ?? 0} {t("brief.units", "units")}</span>
                  </div>
                  {brief.collections_interest && brief.collections_interest.length > 0 && (
                    <div className="flex gap-1 mt-1.5">
                      {brief.collections_interest.map((c) => (
                        <span key={c} className="text-[9px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100 font-body">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-24">
                    <ScoreBar score={brief.qualification_score || 0} />
                  </div>
                  <span
                    className="text-[9px] font-display font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
                    style={{ background: statusCfg.bg, color: statusCfg.color }}
                  >
                    {statusCfg.label}
                  </span>
                  {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {/* Expanded details */}
              {expanded && (
                <div className="border-t border-border p-5 bg-gradient-to-b from-purple-50/30 to-transparent space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-body">
                    <div className="bg-white rounded-xl p-3 border border-purple-100/50">
                      <p className="text-muted-foreground text-[10px] uppercase tracking-wider">{t("brief.establishment", "\u00c9tablissement")}</p>
                      <p className="font-semibold text-foreground mt-0.5">{brief.establishment_type || "N/A"} {brief.stars_or_class || ""}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-purple-100/50">
                      <p className="text-muted-foreground text-[10px] uppercase tracking-wider">{t("brief.capacityLabel", "Capacit\u00e9")}</p>
                      <p className="font-semibold text-foreground mt-0.5">{brief.capacity || "N/A"}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-purple-100/50">
                      <p className="text-muted-foreground text-[10px] uppercase tracking-wider">{t("brief.budgetLabel", "Budget")}</p>
                      <p className="font-semibold text-foreground mt-0.5">{brief.budget_range || "N/A"}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-purple-100/50">
                      <p className="text-muted-foreground text-[10px] uppercase tracking-wider">{t("brief.timelineLabel", "Calendrier")}</p>
                      <p className="font-semibold text-foreground mt-0.5">{brief.timeline || "N/A"}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-purple-100/50">
                      <p className="text-muted-foreground text-[10px] uppercase tracking-wider">{t("brief.projectTypeLabel", "Type projet")}</p>
                      <p className="font-semibold text-foreground mt-0.5">{brief.project_type || "N/A"}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-purple-100/50">
                      <p className="text-muted-foreground text-[10px] uppercase tracking-wider">{t("brief.quantityLabel", "Quantit\u00e9")}</p>
                      <p className="font-semibold text-foreground mt-0.5">{brief.quantity_estimate || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-purple-100/50">
                      <p className="text-muted-foreground text-[10px] uppercase tracking-wider">{t("brief.countryLabel", "Pays")}</p>
                      <p className="font-semibold text-foreground mt-0.5">{brief.country || "N/A"}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-purple-100/50">
                      <p className="text-muted-foreground text-[10px] uppercase tracking-wider">{t("brief.dateLabel", "Date")}</p>
                      <p className="font-semibold text-foreground mt-0.5">{new Date(brief.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {brief.message && (
                    <div className="text-xs font-body">
                      <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1.5">{t("brief.messageLabel", "Message")}</p>
                      <p className="text-foreground bg-white border border-purple-100/50 rounded-xl p-4">{brief.message}</p>
                    </div>
                  )}

                  {/* Contact info — only shown after acceptance */}
                  {showContact && (
                    <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-5 space-y-3">
                      <p className="text-xs font-display font-semibold text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" /> {t("brief.buyerCoordinates")}
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-xs font-body text-emerald-800">
                        <p className="flex items-center gap-1.5"><Users className="h-3 w-3" /> {brief.first_name || "\u2014"} {brief.last_name || ""}</p>
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
                        className="flex items-center gap-1.5 text-xs font-display font-semibold text-white rounded-full px-5 py-2.5 hover:opacity-90 transition-opacity"
                        style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> {t("brief.accept")}
                      </button>
                      <button
                        onClick={() => handleAction(brief.id, "declined")}
                        className="flex items-center gap-1.5 text-xs font-display font-semibold border border-border text-muted-foreground rounded-full px-5 py-2.5 hover:bg-card transition-colors"
                      >
                        <XCircle className="h-3.5 w-3.5" /> {t("brief.decline")}
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
