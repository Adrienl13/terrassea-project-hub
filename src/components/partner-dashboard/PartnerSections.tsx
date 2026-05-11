import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useConversations } from "@/hooks/useConversations";
import { usePricingMode } from "@/hooks/usePricingMode";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  TrendingUp, Star, Eye, FileText,
  ArrowUpRight, Lock, Crown, Shield, Zap, BarChart3, Download,
  MessageSquare, Clock, CheckCircle2, XCircle, AlertTriangle,
  Image, Paperclip, Send,
  Users, Sparkles, Award,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

export type PartnerPlan = "starter" | "growth" | "elite" | "brand_member" | "brand_network";

export type PartnerSectionSetter = (section: string) => void;

export const PLAN_CONFIG = {
  starter: {
    label: "Starter",
    color: "#6B7280",
    bg: "#F3F4F6",
    border: "#E5E7EB",
    commission: 8,
    maxProducts: 30,
    price: "Gratuit",
    icon: Shield,
  },
  growth: {
    label: "Growth",
    color: "#2563EB",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    commission: 5,
    maxProducts: 50,
    price: "249€/mois",
    icon: Zap,
  },
  elite: {
    label: "Elite",
    color: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
    commission: 3.5,
    maxProducts: 150,
    price: "499€/mois",
    icon: Crown,
  },
  brand_member: {
    label: "Brand Member",
    color: "#7C3AED",
    bg: "#F5F3FF",
    border: "#C4B5FD",
    commission: 2,
    maxProducts: 999,
    price: "799€/mois",
    icon: Crown,
  },
  brand_network: {
    label: "Brand Network",
    color: "#6D28D9",
    bg: "#EDE9FE",
    border: "#A78BFA",
    commission: 1.5,
    maxProducts: 999,
    price: "1299€/mois",
    icon: Crown,
  },
};

// ── Plan Badge ─────────────────────────────────────────────────────────────────

export function PlanBadge({ plan }: { plan: PartnerPlan }) {
  const config = PLAN_CONFIG[plan];
  const Icon = config.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-display font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border"
      style={{ background: config.bg, color: config.color, borderColor: config.border }}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

// ── Commission Reminder Banner ─────────────────────────────────────────────────

export function CommissionReminder({ plan, onUpgrade }: { plan: PartnerPlan; onUpgrade?: () => void }) {
  const { t } = useTranslation();
  if (usePricingMode() === "launch") return null;
  const config = PLAN_CONFIG[plan];
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 rounded-sm border text-[11px] font-body"
      style={{ background: config.bg, borderColor: config.border, color: config.color }}
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span>
        <strong>{t('pd.commission.label', { percent: config.commission })}</strong>
        {plan !== "elite" && plan !== "brand_network" && onUpgrade && (
          <> — <button onClick={onUpgrade} className="underline font-semibold hover:opacity-80 transition-opacity">{t('pd.commission.upgrade')}</button></>
        )}
      </span>
    </div>
  );
}

// ── Upgrade CTA ────────────────────────────────────────────────────────────────

export function UpgradeCTA({ currentPlan }: { currentPlan: PartnerPlan }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  if (usePricingMode() === "launch") return null;
  if (currentPlan === "elite" || currentPlan === "brand_network") return null;

  const nextPlan: PartnerPlan = currentPlan === "starter" ? "growth" : currentPlan === "growth" ? "elite" : currentPlan === "brand_member" ? "brand_network" : "elite";
  const nextConfig = PLAN_CONFIG[nextPlan];
  const currentConfig = PLAN_CONFIG[currentPlan];
  const savings = currentConfig.commission - nextConfig.commission;

  const handleUpgrade = () => {
    navigate("/become-partner");
    if (nextPlan === "elite" || nextPlan === "brand_network") {
      toast.info(`Contactez-nous pour discuter du plan ${nextConfig.label}.`);
    }
  };

  return (
    <div className="border-2 rounded-sm p-5 relative overflow-hidden" style={{ borderColor: nextConfig.border, background: `linear-gradient(135deg, ${nextConfig.bg}, white)` }}>
      <div className="absolute top-0 right-0 w-24 h-24 opacity-5">
        <Crown className="w-full h-full" style={{ color: nextConfig.color }} />
      </div>
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4" style={{ color: nextConfig.color }} />
          <p className="font-display font-bold text-sm" style={{ color: nextConfig.color }}>
            {t('pd.upgrade.title', { plan: nextConfig.label })}
          </p>
        </div>
        <p className="text-xs font-body text-muted-foreground mb-3 leading-relaxed">
          {nextPlan === "growth"
            ? t('pd.upgrade.growthMsg', { savings })
            : t('pd.upgrade.eliteMsg', { percent: nextConfig.commission })
          }
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={handleUpgrade}
            className="flex items-center gap-2 px-4 py-2 text-xs font-display font-semibold rounded-full text-white hover:opacity-90 transition-opacity"
            style={{ background: nextConfig.color }}
          >
            <ArrowUpRight className="h-3 w-3" />
            {nextPlan === "growth" ? t('pd.upgrade.growthCta', { price: PLAN_CONFIG.growth.price }) : t('pd.upgrade.eliteCta')}
          </button>
          <span className="text-[10px] font-body text-muted-foreground">
            {t('pd.upgrade.savings', { savings })}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────────

export function StatCard({
  value, label, trend, trendColor = "var(--muted-foreground)", icon: Icon, locked, onLockedClick,
}: {
  value: string; label: string; trend?: string; trendColor?: string;
  icon?: any; locked?: boolean; onLockedClick?: () => void;
}) {
  return (
    <div
      className={`border border-border rounded-sm p-4 relative ${locked ? "opacity-50 cursor-pointer" : ""}`}
      onClick={locked ? onLockedClick : undefined}
    >
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-sm z-10">
          <Lock className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div className="flex items-center justify-between mb-1">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>
      <p className="font-display font-bold text-lg text-foreground">{value}</p>
      <p className="text-[10px] font-body text-muted-foreground mt-0.5">{label}</p>
      {trend && (
        <p className="text-[9px] font-body mt-1 flex items-center gap-1" style={{ color: trendColor }}>
          <TrendingUp className="h-3 w-3" />{trend}
        </p>
      )}
    </div>
  );
}

export { PartnerOverview } from "./PartnerOverview";

// ═══════════════════════════════════════════════════════════════════════════════
// ── PARTNER QUOTES SECTION ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export { PartnerQuotesSection } from "./PartnerQuotesSection";

// ═══════════════════════════════════════════════════════════════════════════════
// ── PARTNER CATALOGUE SECTION (extracted) ───────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export { PartnerCatalogueSection } from "./PartnerCatalogueSection";
// ═══════════════════════════════════════════════════════════════════════════════
// ── PARTNER SUBMISSION FEEDBACK SECTION ──────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function PartnerSubmissionFeedbackSection({ partnerId }: { partnerId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["partner-submissions-feedback", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_submissions")
        .select("id, product_data, status, admin_feedback, feedback_sent_at, created_at")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!partnerId,
  });

  const feedbackStatuses: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
    ok: { label: "OK", icon: CheckCircle2, color: "text-green-700" },
    needs_work: { label: t("pd.feedback.needsWork", "A ameliorer"), icon: AlertTriangle, color: "text-amber-700" },
    missing: { label: t("pd.feedback.missing", "Manquant"), icon: XCircle, color: "text-red-700" },
  };

  const withFeedback = submissions.filter((s: any) => s.admin_feedback);

  if (isLoading) return <div className="py-8 text-center"><div className="w-5 h-5 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  if (withFeedback.length === 0) return null;

  return (
    <div className="space-y-4 border border-border rounded-xl p-5">
      <p className="font-display font-bold text-sm text-foreground">
        {t("pd.feedback.title", "Admin feedback on submissions")}
      </p>
      <div className="space-y-3">
        {withFeedback.map((sub: any) => {
          const fb = sub.admin_feedback as Record<string, any>;
          const pd = sub.product_data as Record<string, any>;
          const sections = ["photos", "description", "specs", "pricing"] as const;

          return (
            <div key={sub.id} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-display font-semibold text-foreground">{pd?.name || "Product"}</p>
                <span className="text-[9px] font-display font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  {t("pd.feedback.feedbackReceived", "Feedback received")}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {sections.map((section) => {
                  const sectionFb = fb?.[section];
                  if (!sectionFb) return null;
                  const cfg = feedbackStatuses[sectionFb.status] || feedbackStatuses.ok;
                  const Icon = cfg.icon;
                  return (
                    <div key={section} className="flex items-start gap-2 text-[11px] font-body">
                      <Icon className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${cfg.color}`} />
                      <div>
                        <p className={`font-semibold capitalize ${cfg.color}`}>{section}</p>
                        {sectionFb.comment && <p className="text-muted-foreground">{sectionFb.comment}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {fb?.general_comment && (
                <p className="text-[11px] font-body text-muted-foreground italic border-t border-border pt-2">
                  {fb.general_comment}
                </p>
              )}

              <button
                onClick={() => navigate("/account?section=catalogue")}
                className="text-[10px] font-display font-semibold text-foreground underline hover:opacity-70 transition-opacity"
              >
                {t("pd.feedback.editAndResubmit", "Modifier et resoumettre")}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── PARTNER PERFORMANCE SECTION ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function PartnerPerformanceSection({ plan }: { plan: PartnerPlan }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const config = PLAN_CONFIG[plan];
  const isElite = plan === "elite" || plan === "brand_member" || plan === "brand_network";

  const handleExportCSV = () => {
    toast.success("Export CSV en cours de génération...");
  };

  return (
    <div className="space-y-5">
      {/* Commission reminder */}
      <CommissionReminder plan={plan} onUpgrade={() => navigate("/become-partner")} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="font-display font-bold text-sm text-foreground">{t('pd.perf.title')}</p>
        {isElite ? (
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-display font-semibold border border-border rounded-full hover:border-foreground transition-colors"
          >
            <Download className="h-3 w-3" /> {t('pd.perf.export')}
          </button>
        ) : (
          <button
            onClick={() => navigate("/become-partner")}
            className="flex items-center gap-1.5 text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors"
          >
            <Lock className="h-3 w-3" /> Export — plan Elite
          </button>
        )}
      </div>

      {/* Basic stats — available to all */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard value="1 240" label={t('pd.perf.views')} trend="+18%" trendColor="#059669" icon={Eye} />
        <StatCard value="42" label={t('pd.perf.quoteRequests')} trend="+8" trendColor="#2563EB" icon={FileText} />
        <StatCard value="€8 200" label={t('pd.perf.confirmed')} trend="+12%" trendColor="#059669" icon={TrendingUp} />
        <StatCard value="28%" label={t('pd.perf.conversion')} icon={BarChart3} />
      </div>

      {/* Growth-level analytics */}
      <div>
        <p className="font-display font-semibold text-xs text-foreground mb-3">{t('pd.perf.chart')}</p>
        <div className="border border-border rounded-sm p-4 h-40 flex items-center justify-center bg-card">
          <div className="text-center">
            <BarChart3 className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-[10px] font-body text-muted-foreground">Graphique de performance</p>
          </div>
        </div>
      </div>

      {/* Commission tracking */}
      <div>
        <p className="font-display font-semibold text-xs text-foreground mb-3 flex items-center gap-2">
          {t('pd.perf.commTracking')}
          <span className="text-[9px] font-display font-bold px-2 py-0.5 rounded-full" style={{ background: config.bg, color: config.color }}>
            {config.commission}%
          </span>
        </p>
        <div className="border border-border rounded-sm divide-y divide-border">
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-[10px] font-body text-muted-foreground">{t('pd.perf.thisMonth')}</span>
            <span className="text-xs font-display font-semibold text-foreground">€{(8200 * config.commission / 100).toFixed(0)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-[10px] font-body text-muted-foreground">{t('pd.perf.lastMonth')}</span>
            <span className="text-xs font-display font-semibold text-foreground">€{(7100 * config.commission / 100).toFixed(0)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-[10px] font-body text-muted-foreground">{t('pd.perf.total')}</span>
            <span className="text-xs font-display font-semibold text-foreground">€{(32400 * config.commission / 100).toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* Elite-only sections */}
      <div className={`space-y-5 ${!isElite ? "relative" : ""}`}>
        {!isElite && (
          <div className="absolute inset-0 z-10 flex items-start justify-center pt-12 bg-gradient-to-b from-background/80 to-background/95 rounded-sm">
            <div className="text-center">
              <Lock className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="font-display font-bold text-sm text-foreground mb-1">Analytics avancés</p>
              <p className="text-[10px] font-body text-muted-foreground mb-3 max-w-xs">
                Accédez aux analytics détaillés, exports CSV, suivi de performance par produit et comparaison sectorielle.
              </p>
              <UpgradeCTA currentPlan={plan} />
            </div>
          </div>
        )}

        <div className={!isElite ? "opacity-30 pointer-events-none" : ""}>
          <div className="grid grid-cols-2 gap-3">
            <StatCard value="4.8/5" label="Note moyenne client" icon={Star} />
            <StatCard value="3.2j" label="Temps de réponse moyen" icon={Clock} />
            <StatCard value="Top 12%" label="Classement catégorie" icon={Award} />
            <StatCard value="6" label="Clients réguliers" icon={Users} />
          </div>

          <div>
            <p className="font-display font-semibold text-xs text-foreground mb-3">Performance par produit</p>
            <div className="border border-border rounded-sm p-4 h-32 flex items-center justify-center bg-card">
              <p className="text-[10px] font-body text-muted-foreground">Tableau détaillé par produit</p>
            </div>
          </div>

          <div>
            <p className="font-display font-semibold text-xs text-foreground mb-3">Comparaison sectorielle</p>
            <div className="border border-border rounded-sm p-4 h-32 flex items-center justify-center bg-card">
              <p className="text-[10px] font-body text-muted-foreground">Benchmark vs. moyenne du secteur</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── PARTNER MESSAGES SECTION ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function PartnerMessagesSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { conversations, totalUnread } = useConversations();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display font-bold text-sm text-foreground">{t('pd.msg.title')}</p>
          <p className="text-[10px] font-body text-muted-foreground mt-0.5">
            {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
            {totalUnread > 0 && <> · <strong className="text-foreground">{totalUnread} non lu{totalUnread > 1 ? "s" : ""}</strong></>}
          </p>
        </div>
        <button
          onClick={() => navigate("/messages")}
          className="flex items-center gap-2 px-4 py-2 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
        >
          <MessageSquare className="h-3 w-3" /> {t('pd.msg.open')}
        </button>
      </div>

      {/* Capabilities info */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-border rounded-sm p-3 text-center">
          <Send className="h-4 w-4 text-muted-foreground mx-auto mb-1.5" />
          <p className="text-[10px] font-display font-semibold text-foreground">{t('pd.overview.messages')}</p>
          <p className="text-[9px] font-body text-muted-foreground mt-0.5">{t('pd.msg.exchange')}</p>
        </div>
        <div className="border border-border rounded-sm p-3 text-center">
          <Paperclip className="h-4 w-4 text-muted-foreground mx-auto mb-1.5" />
          <p className="text-[10px] font-display font-semibold text-foreground">{t('pd.quotes.document')}</p>
          <p className="text-[9px] font-body text-muted-foreground mt-0.5">{t('pd.msg.docs')}</p>
        </div>
        <div className="border border-border rounded-sm p-3 text-center">
          <Image className="h-4 w-4 text-muted-foreground mx-auto mb-1.5" />
          <p className="text-[10px] font-display font-semibold text-foreground">{t('pd.quotes.photo')}</p>
          <p className="text-[9px] font-body text-muted-foreground mt-0.5">{t('pd.msg.photos')}</p>
        </div>
      </div>

      {/* Recent conversations */}
      <div>
        <p className="font-display font-semibold text-xs text-foreground mb-3">{t('pd.msg.recent')}</p>
        {conversations.length === 0 ? (
          <div className="border border-border rounded-sm px-4 py-8 text-center">
            <MessageSquare className="h-6 w-6 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-xs font-body text-muted-foreground mb-2">{t('pd.msg.none')}</p>
            <button
              onClick={() => navigate("/messages")}
              className="text-xs font-display font-semibold text-foreground underline"
            >
              {t('pd.msg.start')}
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {conversations.slice(0, 5).map(conv => (
              <div
                key={conv.id}
                onClick={() => navigate(`/messages/${conv.id}`)}
                className="flex items-center gap-3 px-4 py-3 border border-border rounded-sm hover:border-foreground/20 transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-display truncate ${conv.unread_count > 0 ? "font-bold" : "font-semibold"} text-foreground`}>
                      {conv.subject || "Conversation"}
                    </p>
                    <span className="text-[9px] font-body text-muted-foreground whitespace-nowrap ml-2">
                      {conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString("fr-FR") : ""}
                    </span>
                  </div>
                  {conv.last_message && (
                    <p className="text-[10px] font-body text-muted-foreground truncate mt-0.5">
                      {conv.last_message.body}
                    </p>
                  )}
                </div>
                {conv.unread_count > 0 && (
                  <span className="w-5 h-5 rounded-full bg-foreground text-primary-foreground text-[9px] font-display font-bold flex items-center justify-center shrink-0">
                    {conv.unread_count}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// ── PARTNER FEATURED PRODUCTS SECTION (extracted) ────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export { PartnerFeaturedSection } from "./PartnerFeaturedSection";

// ═══════════════════════════════════════════════════════════════════════════════
// ── PARTNER PRO SERVICE LEADS (extracted) ────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export { PartnerProLeadsSection } from "./PartnerProLeadsSection";
