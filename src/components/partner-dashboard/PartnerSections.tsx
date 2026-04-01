import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations } from "@/hooks/useConversations";
import { usePartnerLeads } from "@/hooks/usePartnerLeads";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  TIER_CONFIG as TIER_CONFIG_ANALYTICS,
  type PartnerTier as PartnerTierType,
} from "@/hooks/usePartnerAnalytics";
import {
  TrendingUp, Star, ChevronRight, Inbox, Package, Eye, FileText,
  ArrowUpRight, Lock, Crown, Shield, Zap, BarChart3, Download,
  MessageSquare, Clock, CheckCircle2, XCircle, AlertTriangle,
  Image, Paperclip, Send,
  Users, Sparkles, Award,
  Rocket, GripVertical, Briefcase, MapPin, Calendar,
  Building2, EyeOff, Handshake, Target, ThumbsUp, ThumbsDown, Info,
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

function StatCard({
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

// ── Quote Row ──────────────────────────────────────────────────────────────────

function QuoteRow({
  title, client, amount, date, status, statusStyle, commission, onClick,
}: {
  title: string; client: string; amount: string; date: string;
  status: string; statusStyle: string; commission?: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between px-4 py-3 border border-border rounded-sm hover:border-foreground/20 transition-colors cursor-pointer"
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-display font-semibold text-foreground truncate">{title}</p>
        <p className="text-[10px] font-body text-muted-foreground">{client} · {date}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <p className="text-xs font-display font-semibold text-foreground">{amount}</p>
          {commission && (
            <p className="text-[9px] font-body text-amber-600">comm. {commission}</p>
          )}
        </div>
        <span className={`text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap ${statusStyle}`}>
          {status}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── PARTNER OVERVIEW ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function TopProductsWidget({ partnerId, onNavigate }: { partnerId: string | null; onNavigate: PartnerSectionSetter }) {
  const { t } = useTranslation();
  const { data: topProducts = [] } = useQuery({
    queryKey: ["partner-top-products", partnerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_offers")
        .select("product_id, product:product_id(name, image_url)")
        .eq("partner_id", partnerId!)
        .eq("is_active", true)
        .is("source_offer_id", null)
        .limit(3);
      return (data ?? []) as { product_id: string; product: { name: string; image_url: string | null } | null }[];
    },
    enabled: !!partnerId,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="font-display font-bold text-sm text-foreground">{t('pd.overview.topProducts')}</p>
        <button
          onClick={() => onNavigate("catalogue")}
          className="text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          {t('pd.overview.myCatalogue')} <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      <div className="space-y-2">
        {topProducts.length > 0 ? topProducts.map((item) => (
          <div
            key={item.product_id}
            onClick={() => onNavigate("catalogue")}
            className="flex items-center justify-between px-3 py-2 border border-border rounded-sm cursor-pointer hover:border-foreground/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              {item.product?.image_url ? (
                <img src={item.product.image_url} alt="" className="w-6 h-6 rounded object-cover" />
              ) : (
                <Star className="h-3.5 w-3.5 text-amber-500" />
              )}
              <p className="text-xs font-display font-semibold text-foreground">{item.product?.name || "—"}</p>
            </div>
          </div>
        )) : (
          <p className="text-xs font-body text-muted-foreground py-4 text-center">{t('pd.overview.noProducts', 'Aucun produit dans le catalogue')}</p>
        )}
      </div>
    </div>
  );
}

export function PartnerOverview({ plan, onNavigate }: { plan: PartnerPlan; onNavigate: PartnerSectionSetter }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const config = PLAN_CONFIG[plan];
  const isElite = plan === "elite" || plan === "brand_member" || plan === "brand_network";

  const handleUpgrade = () => navigate("/become-partner");

  // Resolve partner ID from the partners table using the user's email
  const { data: partnerId } = useQuery({
    queryKey: ["partner-id-for-overview", profile?.email],
    queryFn: async () => {
      const { data } = await supabase
        .from("partners")
        .select("id")
        .eq("contact_email", profile!.email)
        .maybeSingle();
      return data?.id ?? null;
    },
    enabled: !!profile?.email && profile?.user_type === "partner",
  });

  // Pending quotes count
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["partner-pending-quotes", partnerId],
    queryFn: async () => {
      const { count } = await supabase
        .from("quote_requests")
        .select("id", { count: "exact", head: true })
        .eq("partner_id", partnerId!)
        .eq("status", "pending");
      return count ?? 0;
    },
    enabled: !!partnerId,
  });

  // Recent quote requests for the overview list
  const { data: recentQuotes = [] } = useQuery({
    queryKey: ["partner-recent-quotes", partnerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("quote_requests")
        .select("id, product_name, client_name, quantity, unit_price, status, created_at")
        .eq("partner_id", partnerId!)
        .order("created_at", { ascending: false })
        .limit(3);
      return data ?? [];
    },
    enabled: !!partnerId,
  });

  // Products listed count
  const { data: productsCount = 0 } = useQuery({
    queryKey: ["partner-products-count", partnerId],
    queryFn: async () => {
      const { count } = await supabase
        .from("product_offers")
        .select("id", { count: "exact", head: true })
        .eq("partner_id", partnerId!)
        .eq("is_active", true);
      return count ?? 0;
    },
    enabled: !!partnerId,
  });

  // Monthly revenue from orders
  const { data: monthlyRevenue = 0 } = useQuery({
    queryKey: ["partner-monthly-revenue", partnerId],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data } = await supabase
        .from("orders")
        .select("total_amount")
        .eq("partner_id", partnerId!)
        .gte("created_at", startOfMonth);
      if (!data || data.length === 0) return 0;
      return data.reduce((sum, o) => sum + Number(o.total_amount ?? 0), 0);
    },
    enabled: !!partnerId,
  });

  return (
    <div className="space-y-5">
      {/* Commission reminder */}
      <CommissionReminder plan={plan} onUpgrade={handleUpgrade} />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard value={partnerId ? String(pendingCount) : "—"} label={t('pd.stats.pendingRequests')} icon={Inbox} />
        <StatCard value={partnerId ? String(productsCount) : "—"} label={t('pd.stats.productsListed')} icon={Package} />
        <StatCard value={partnerId ? `€${monthlyRevenue.toLocaleString()}` : "—"} label={t('pd.stats.monthlyRevenue')} icon={TrendingUp} />
        <StatCard
          value={isElite ? (partnerId ? "Coming soon" : "—") : "—"}
          label={t('pd.stats.commissionsPaid')}
          icon={BarChart3}
          locked={!isElite}
          onLockedClick={handleUpgrade}
        />
      </div>

      {/* Incoming requests */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="font-display font-bold text-sm text-foreground flex items-center gap-2">
            <Inbox className="h-4 w-4 text-muted-foreground" />
            {t('pd.overview.latestRequests')}
          </p>
          <button
            onClick={() => onNavigate("quotes")}
            className="text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
          >
            {t('pd.overview.pending', { count: 0 })}
          </button>
        </div>
        <div className="space-y-2">
          {recentQuotes.length > 0 ? recentQuotes.map((q: any) => {
            const amount = q.quantity && q.unit_price ? q.quantity * q.unit_price : 0;
            const statusLabel = q.status === "pending" ? t('pd.overview.statusNew') : q.status === "in_progress" ? t('pd.overview.statusInProgress') : q.status;
            const statusStyle = q.status === "pending" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700";
            const dateStr = q.created_at ? new Date(q.created_at).toLocaleDateString() : "";
            return (
              <QuoteRow
                key={q.id}
                title={`${q.quantity ? q.quantity + "× " : ""}${q.product_name || t('pd.overview.quoteRequest')}`}
                client={q.client_name || "—"}
                amount={amount > 0 ? `€${amount.toLocaleString()}` : "—"}
                date={dateStr}
                status={statusLabel}
                statusStyle={statusStyle}
                commission={amount > 0 ? `€${(amount * config.commission / 100).toFixed(0)}` : "—"}
                onClick={() => onNavigate("quotes")}
              />
            );
          }) : (
            <p className="text-xs font-body text-muted-foreground py-4 text-center">{t('pd.overview.noRecentRequests', 'Aucune demande récente')}</p>
          )}
        </div>
        <button
          onClick={() => onNavigate("quotes")}
          className="w-full mt-2 text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1 py-2"
        >
          {t('pd.overview.seeAllRequests')} <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Top products */}
      <TopProductsWidget partnerId={partnerId} onNavigate={onNavigate} />

      {/* Quick messages preview */}
      <QuickMessagesPreview onNavigate={onNavigate} />

      {/* Upsell */}
      <UpgradeCTA currentPlan={plan} />
    </div>
  );
}

// ── Quick Messages Preview ─────────────────────────────────────────────────────

function QuickMessagesPreview({ onNavigate }: { onNavigate: PartnerSectionSetter }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { conversations, totalUnread } = useConversations();
  const recent = conversations.slice(0, 3);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="font-display font-bold text-sm text-foreground flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          Messages
          {totalUnread > 0 && (
            <span className="text-[9px] font-display font-bold bg-foreground text-primary-foreground px-1.5 py-0.5 rounded-full">
              {totalUnread}
            </span>
          )}
        </p>
        <button
          onClick={() => onNavigate("messages")}
          className="text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          Voir tout <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      {recent.length === 0 ? (
        <div className="border border-border rounded-sm px-4 py-6 text-center">
          <MessageSquare className="h-5 w-5 text-muted-foreground/30 mx-auto mb-1.5" />
          <p className="text-[10px] font-body text-muted-foreground mb-2">Aucun message</p>
          <button
            onClick={() => navigate("/messages")}
            className="text-[10px] font-display font-semibold text-foreground underline"
          >
            Commencer une conversation
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {recent.map(conv => (
            <div
              key={conv.id}
              onClick={() => navigate(`/messages/${conv.id}`)}
              className="flex items-center gap-3 px-3 py-2.5 border border-border rounded-sm hover:border-foreground/20 transition-colors cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-display truncate ${conv.unread_count > 0 ? "font-bold" : "font-semibold"} text-foreground`}>
                  {conv.subject || "Conversation"}
                </p>
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
  );
}

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
// ── PARTNER FEATURED PRODUCTS SECTION ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function PartnerFeaturedSection({ plan, partnerId }: { plan: PartnerPlan; partnerId?: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const config = PLAN_CONFIG[plan];

  // Read subscription overrides for this partner
  const { data: featSubOverrides } = useQuery({
    queryKey: ["partner-sub-overrides", partnerId],
    queryFn: async () => {
      const { data } = await supabase.from("partner_subscriptions")
        .select("max_products, commission_rate")
        .eq("partner_id", partnerId!)
        .maybeSingle();
      return data;
    },
    enabled: !!partnerId,
  });

  // Use TIER_CONFIG from usePartnerAnalytics for default featured limit, with override support
  const defaultFeatured = TIER_CONFIG_ANALYTICS[plan as PartnerTierType]?.featuredProducts ?? 0;
  const maxFeatured = defaultFeatured;
  const isStarter = plan === "starter";

  // Fetch real featured products from DB
  const { data: featured = [] } = useQuery({
    queryKey: ["partner-featured", partnerId],
    queryFn: async () => {
      if (!partnerId) return [];
      const { data } = await supabase
        .from("partner_featured_products")
        .select("id, product_id, position, product:product_id(id, name, image_url)")
        .eq("partner_id", partnerId)
        .eq("is_active", true)
        .order("position", { ascending: true });
      return (data || []).map((f: any) => ({
        id: f.id,
        productId: f.product?.id || f.product_id,
        name: f.product?.name || "Product",
        views: 0,
        quotes: 0,
      }));
    },
    enabled: !!partnerId,
  });

  // Fetch partner's products not yet featured
  const { data: availableProducts = [] } = useQuery({
    queryKey: ["partner-available-for-feature", partnerId, featured],
    queryFn: async () => {
      if (!partnerId) return [];
      const featuredIds = featured.map((f: any) => f.productId).filter(Boolean);
      const query = supabase
        .from("product_offers")
        .select("product_id, product:product_id(id, name, image_url)")
        .eq("partner_id", partnerId)
        .eq("is_active", true)
        .limit(10);
      const { data } = await query;
      return (data || [])
        .filter((o: any) => !featuredIds.includes(o.product_id))
        .map((o: any) => ({
          id: o.product?.id || o.product_id,
          name: o.product?.name || "Product",
          views: 0,
          quotes: 0,
        }));
    },
    enabled: !!partnerId,
  });

  const handleRemove = async (id: string) => {
    await supabase.from("partner_featured_products").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["partner-featured", partnerId] });
    toast.success(t('pd.featured.removedToast'));
  };

  const handleAdd = async (product: { id: string; name: string }) => {
    if (featured.length >= maxFeatured) {
      toast.error(t('pd.featured.limitToast', { max: maxFeatured, plan: config.label }));
      return;
    }
    if (!partnerId) return;
    await supabase.from("partner_featured_products").insert({
      partner_id: partnerId,
      product_id: product.id,
      position: featured.length,
      is_active: true,
    });
    queryClient.invalidateQueries({ queryKey: ["partner-featured", partnerId] });
    toast.success(t('pd.featured.addedToast', { name: product.name }));
  };

  return (
    <div className="space-y-5">
      <CommissionReminder plan={plan} onUpgrade={() => {}} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display font-bold text-sm text-foreground flex items-center gap-2">
            <Rocket className="h-4 w-4" /> {t('pd.featured.title')}
          </p>
          <p className="text-[10px] font-body text-muted-foreground mt-0.5">
            {t('pd.featured.slots', { count: featured.length, max: maxFeatured })}
          </p>
        </div>
        <PlanBadge plan={plan} />
      </div>

      {/* Usage bar */}
      {maxFeatured > 0 && (
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${(featured.length / maxFeatured) * 100}%`,
              background: featured.length >= maxFeatured ? "#D97706" : config.color,
            }}
          />
        </div>
      )}

      {isStarter ? (
        <div className="border-2 border-dashed border-border rounded-sm p-8 text-center">
          <Lock className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
          <p className="font-display font-bold text-sm text-foreground mb-1">{t('pd.featured.noStarter')}</p>
          <p className="text-[10px] font-body text-muted-foreground mb-4 max-w-sm mx-auto">
            {t('pd.featured.upgradeMsg')}
          </p>
          <UpgradeCTA currentPlan={plan} />
        </div>
      ) : (
        <>
          {/* Featured list */}
          <div>
            <p className="text-xs font-display font-semibold text-foreground mb-3">{t('pd.featured.current')}</p>
            {featured.length === 0 ? (
              <div className="border border-border rounded-sm px-4 py-8 text-center">
                <Rocket className="h-6 w-6 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs font-body text-muted-foreground">{t('pd.featured.none')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {featured.map((p, idx) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3 border border-border rounded-sm bg-gradient-to-r from-amber-50/50 to-transparent">
                    <GripVertical className="h-4 w-4 text-muted-foreground/30 shrink-0 cursor-grab" />
                    <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-display font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-display font-semibold text-foreground truncate">{p.name}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-[9px] font-body text-muted-foreground">
                        <span className="flex items-center gap-1"><Eye className="h-2.5 w-2.5" /> {p.views} {t('pd.featured.views')}</span>
                        <span className="flex items-center gap-1"><FileText className="h-2.5 w-2.5" /> {p.quotes} {t('pd.featured.quotes')}</span>
                        <span className="flex items-center gap-1 text-amber-600"><Sparkles className="h-2.5 w-2.5" /> {t('pd.featured.boosted')}</span>
                      </div>
                    </div>
                    <button onClick={() => handleRemove(p.id)} className="text-[10px] font-display font-semibold text-red-500 hover:text-red-700 transition-colors px-2 py-1">
                      {t('pd.featured.remove')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available to boost */}
          {featured.length < maxFeatured && (
            <div>
              <p className="text-xs font-display font-semibold text-foreground mb-3">{t('pd.featured.addTitle')}</p>
              <div className="space-y-1.5">
                {availableProducts.filter(ap => !featured.some(f => f.id === ap.id)).map(p => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-2.5 border border-border rounded-sm hover:border-foreground/20 transition-colors">
                    <div>
                      <p className="text-xs font-display font-semibold text-foreground">{p.name}</p>
                      <p className="text-[9px] font-body text-muted-foreground">{p.views} {t('pd.featured.views')} · {p.quotes} {t('pd.featured.quotes')}</p>
                    </div>
                    <button onClick={() => handleAdd(p)} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity">
                      <Rocket className="h-3 w-3" /> {t('pd.featured.boost')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="flex items-start gap-2 px-4 py-3 bg-card border border-border rounded-sm">
            <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[10px] font-body text-muted-foreground leading-relaxed">
              {t('pd.featured.info', { plan: config.label, max: maxFeatured })}
              {plan === "growth" && ` ${t('pd.featured.upgradeElite')}`}
            </p>
          </div>

          {(plan === "growth" || plan === "brand_member") && <UpgradeCTA currentPlan={plan} />}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── PARTNER PRO SERVICE LEADS (Elite only) ───────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const PROJECT_TYPE_LABELS: Record<string, string> = {
  hotel: "Hôtel", restaurant: "Restaurant", bar: "Bar", "beach-club": "Beach Club",
  rooftop: "Rooftop", cafe: "Café", lounge: "Lounge", other: "Autre",
};

const TIMELINE_LABELS: Record<string, string> = {
  urgent: "Urgent", "1-month": "1 mois", "2-3-months": "2-3 mois",
  "6-months": "6 mois", flexible: "Flexible",
};

type ProLead = {
  id: string; project_title: string; project_type: string;
  project_city: string; project_country: string;
  categories_needed: string[]; style_preferences: string[];
  budget_range: string; quantity_estimate: number; timeline: string;
  description: string; match_score: number; match_status: string;
  created_at: string;
};

export function PartnerProLeadsSection({ plan }: { plan: PartnerPlan }) {
  const { t } = useTranslation();
  const config = PLAN_CONFIG[plan];
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "new" | "interested" | "connected">("all");

  const { leads: rawLeads, isLoading, expressInterest, declineLead, submitResponse, isSubmittingResponse } = usePartnerLeads();
  const [respondingLead, setRespondingLead] = useState<string | null>(null);
  const [responseForm, setResponseForm] = useState({ message: "", estimatedAmount: "", deliveryWeeks: "" });

  // Map DB leads to ProLead shape expected by the UI
  const leads: ProLead[] = rawLeads.map(l => ({
    id: l.id,
    project_title: l.project_title,
    project_type: l.project_type,
    project_city: l.project_city,
    project_country: l.project_country,
    categories_needed: l.categories_needed,
    style_preferences: l.style_preferences,
    budget_range: l.budget_range || "",
    quantity_estimate: l.quantity_estimate || 0,
    timeline: l.timeline || "",
    description: l.description || "",
    match_score: l.match_score,
    match_status: l.match_status,
    created_at: l.created_at,
  }));

  const filtered = filter === "all" ? leads
    : filter === "new" ? leads.filter(l => l.match_status === "sent_to_partner")
    : filter === "interested" ? leads.filter(l => l.match_status === "partner_interested")
    : leads.filter(l => l.match_status === "client_connected");

  const handleInterest = (id: string) => {
    expressInterest(id, {
      onSuccess: () => toast.success(t('pd.leads.interestToast'), { description: t('pd.leads.interestToastDesc') }),
      onError: () => toast.error("Failed to express interest"),
    });
  };

  const handleDecline = (id: string) => {
    declineLead(id, {
      onSuccess: () => toast(t('pd.leads.declinedToast')),
      onError: () => toast.error("Failed to decline lead"),
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display font-bold text-sm text-foreground flex items-center gap-2">
            <Briefcase className="h-4 w-4" /> Leads Pro Service
          </p>
          <p className="text-[10px] font-body text-muted-foreground mt-0.5">
            Demandes de projets matchées à votre catalogue — données client anonymisées
          </p>
        </div>
        <PlanBadge plan={plan} />
      </div>

      {/* How it works */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: Target, label: "Match", desc: "L'algorithme vous suggère des leads" },
          { icon: EyeOff, label: "Anonyme", desc: "Données client masquées" },
          { icon: ThumbsUp, label: "Intérêt", desc: "Vous exprimez votre intérêt" },
          { icon: Handshake, label: "Connexion", desc: "L'admin valide la relation" },
        ].map((s, i) => (
          <div key={i} className="border border-border rounded-sm p-2.5 text-center">
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center mx-auto mb-1.5">
              <s.icon className="h-3 w-3 text-muted-foreground" />
            </div>
            <p className="text-[9px] font-display font-bold text-foreground">{s.label}</p>
            <p className="text-[8px] font-body text-muted-foreground mt-0.5">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 bg-card border border-border rounded-sm p-0.5">
        {([
          { id: "all" as const, label: "Tous", count: leads.length },
          { id: "new" as const, label: "Nouveaux", count: leads.filter(l => l.match_status === "sent_to_partner").length },
          { id: "interested" as const, label: "Intéressé", count: leads.filter(l => l.match_status === "partner_interested").length },
          { id: "connected" as const, label: "Connecté", count: leads.filter(l => l.match_status === "client_connected").length },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 text-[10px] font-display font-semibold rounded-sm transition-colors ${
              filter === tab.id ? "bg-foreground text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full ${
              filter === tab.id ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"
            }`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Leads list */}
      {isLoading ? (
        <div className="border border-border rounded-sm px-4 py-8 text-center">
          <Clock className="h-6 w-6 text-muted-foreground/20 mx-auto mb-2 animate-pulse" />
          <p className="text-xs font-body text-muted-foreground">Chargement des leads...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="border border-border rounded-sm px-4 py-8 text-center">
          <Briefcase className="h-6 w-6 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs font-body text-muted-foreground">No leads available yet. Your matching profile will be used to find relevant projects.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-border rounded-sm px-4 py-8 text-center">
          <Briefcase className="h-6 w-6 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs font-body text-muted-foreground">Aucun lead avec ce filtre</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(lead => {
            const open = expandedLead === lead.id;
            const isNew = lead.match_status === "sent_to_partner";
            const isConnected = lead.match_status === "client_connected";
            const isInterested = lead.match_status === "partner_interested";

            return (
              <div key={lead.id} className={`border rounded-sm overflow-hidden transition-colors ${
                isNew ? "border-blue-200 bg-blue-50/30" : isConnected ? "border-green-200 bg-green-50/30" : "border-border"
              }`}>
                {/* Header */}
                <div onClick={() => setExpandedLead(open ? null : lead.id)} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-card/50 transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-xs font-display font-bold ${
                    lead.match_score >= 90 ? "bg-green-100 text-green-700" : lead.match_score >= 70 ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {lead.match_score}%
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-display font-semibold text-foreground truncate">{lead.project_title}</p>
                      {isNew && <span className="text-[8px] font-display font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full shrink-0">NOUVEAU</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[9px] font-body text-muted-foreground">
                      <span className="flex items-center gap-1"><Building2 className="h-2.5 w-2.5" /> {t('pd.projectTypes.' + lead.project_type, { defaultValue: lead.project_type })}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5" /> {lead.project_city}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-2.5 w-2.5" /> {t('pd.timelines.' + lead.timeline, { defaultValue: lead.timeline })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-display font-semibold text-foreground">{lead.budget_range}€</span>
                    <span className={`text-[9px] font-display font-semibold px-2 py-0.5 rounded-full ${
                      isConnected ? "bg-green-100 text-green-700" : isInterested ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {isConnected ? "Connecté" : isInterested ? "Intéressé" : "Nouveau"}
                    </span>
                  </div>
                </div>

                {/* Expanded */}
                {open && (
                  <div className="px-4 pb-4 space-y-4 border-t border-border/50">
                    {/* Anonymization notice */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-sm mt-3">
                      <EyeOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <p className="text-[9px] font-body text-muted-foreground">
                        <strong>Données anonymisées</strong> — Les coordonnées du client sont masquées. La mise en relation est validée par l'administrateur Terrassea.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">Catégories</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {lead.categories_needed.map(c => <span key={c} className="text-[9px] font-display font-semibold bg-muted text-foreground px-2 py-0.5 rounded-full">{c}</span>)}
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">Style</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {lead.style_preferences.map(s => <span key={s} className="text-[9px] font-display font-semibold bg-muted text-foreground px-2 py-0.5 rounded-full">{s}</span>)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="border border-border rounded-sm p-2.5 text-center">
                        <p className="text-xs font-display font-bold text-foreground">{lead.budget_range}€</p>
                        <p className="text-[9px] font-body text-muted-foreground">Budget</p>
                      </div>
                      <div className="border border-border rounded-sm p-2.5 text-center">
                        <p className="text-xs font-display font-bold text-foreground">~{lead.quantity_estimate}</p>
                        <p className="text-[9px] font-body text-muted-foreground">Pièces</p>
                      </div>
                      <div className="border border-border rounded-sm p-2.5 text-center">
                        <p className="text-xs font-display font-bold text-foreground">{t('pd.timelines.' + lead.timeline, { defaultValue: lead.timeline })}</p>
                        <p className="text-[9px] font-body text-muted-foreground">Délai</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-1">Descriptif du besoin</p>
                      <p className="text-[11px] font-body text-foreground leading-relaxed bg-card border border-border rounded-sm px-3 py-2.5">{lead.description}</p>
                    </div>

                    <div className="flex items-center gap-3 px-3 py-2 rounded-sm border text-[10px] font-body" style={{ background: config.bg, borderColor: config.border, color: config.color }}>
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      Commission {config.label} : <strong>{config.commission}%</strong> sur la commande finale si mise en relation validée.
                    </div>

                    {/* Actions */}
                    {!isConnected && (
                      <div className="space-y-3 pt-1">
                        {!isInterested ? (
                          respondingLead === lead.id ? (
                            <div className="space-y-2 border border-border rounded-sm p-3">
                              <p className="text-[10px] font-display font-semibold text-foreground uppercase tracking-wider">Votre proposition</p>
                              <textarea
                                value={responseForm.message}
                                onChange={(e) => setResponseForm(f => ({ ...f, message: e.target.value }))}
                                placeholder="Message pour le client (votre expertise, disponibilit\u00e9...)"
                                rows={2}
                                className="w-full text-[11px] font-body bg-background border border-border rounded-sm px-3 py-2 focus:outline-none focus:border-foreground resize-none"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[9px] font-display font-semibold text-muted-foreground uppercase">Montant estim\u00e9 (EUR)</label>
                                  <input
                                    type="number"
                                    value={responseForm.estimatedAmount}
                                    onChange={(e) => setResponseForm(f => ({ ...f, estimatedAmount: e.target.value }))}
                                    placeholder="5000"
                                    className="w-full text-[11px] font-body bg-background border border-border rounded-sm px-3 py-1.5 focus:outline-none focus:border-foreground mt-0.5"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-display font-semibold text-muted-foreground uppercase">D\u00e9lai (semaines)</label>
                                  <input
                                    type="number"
                                    value={responseForm.deliveryWeeks}
                                    onChange={(e) => setResponseForm(f => ({ ...f, deliveryWeeks: e.target.value }))}
                                    placeholder="4"
                                    className="w-full text-[11px] font-body bg-background border border-border rounded-sm px-3 py-1.5 focus:outline-none focus:border-foreground mt-0.5"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  disabled={isSubmittingResponse || !responseForm.message || !responseForm.estimatedAmount || !responseForm.deliveryWeeks}
                                  onClick={() => {
                                    submitResponse(
                                      { requestId: lead.id, data: { message: responseForm.message, estimatedAmount: Number(responseForm.estimatedAmount), deliveryWeeks: Number(responseForm.deliveryWeeks) } },
                                      {
                                        onSuccess: () => {
                                          handleInterest(lead.id);
                                          setRespondingLead(null);
                                          setResponseForm({ message: "", estimatedAmount: "", deliveryWeeks: "" });
                                          toast.success("Proposition envoy\u00e9e");
                                        },
                                        onError: () => toast.error("Erreur lors de l'envoi"),
                                      }
                                    );
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 text-[10px] font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity disabled:opacity-40"
                                >
                                  <Send className="h-3 w-3" /> {isSubmittingResponse ? "Envoi..." : "Envoyer ma proposition"}
                                </button>
                                <button
                                  onClick={() => { setRespondingLead(null); setResponseForm({ message: "", estimatedAmount: "", deliveryWeeks: "" }); }}
                                  className="text-[10px] font-display font-semibold text-muted-foreground hover:text-foreground"
                                >
                                  Annuler
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button onClick={() => setRespondingLead(lead.id)} className="flex items-center gap-2 px-4 py-2 text-[10px] font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity">
                                <ThumbsUp className="h-3 w-3" /> Je suis int\u00e9ress\u00e9
                              </button>
                              <button onClick={() => handleDecline(lead.id)} className="flex items-center gap-2 px-4 py-2 text-[10px] font-display font-semibold border border-border rounded-full hover:border-foreground transition-colors">
                                <ThumbsDown className="h-3 w-3" /> Pas pour moi
                              </button>
                            </div>
                          )
                        ) : (
                          <div className="flex items-center gap-2 text-[10px] font-body text-amber-600">
                            <Clock className="h-3 w-3" /> En attente de validation par l'administrateur Terrassea
                          </div>
                        )}
                      </div>
                    )}

                    {isConnected && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-sm">
                        <Handshake className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="text-[10px] font-display font-semibold text-green-700">Mise en relation validée</p>
                          <p className="text-[9px] font-body text-green-600">L'administrateur a connecté les deux parties. Consultez vos messages.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Matching explanation */}
      <div className="flex items-start gap-2 px-4 py-3 bg-card border border-border rounded-sm">
        <Target className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[10px] font-body text-muted-foreground leading-relaxed">
          Le <strong>score de match</strong> est calculé sur votre catalogue (catégories, styles, matériaux),
          zone de livraison, capacité et plan. La mise en relation est <strong>toujours validée par un administrateur Terrassea</strong>.
        </p>
      </div>
    </div>
  );
}
