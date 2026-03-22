import { useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations } from "@/hooks/useConversations";
import { usePartnerQuotes } from "@/hooks/usePartnerQuotes";
import { usePartnerLeads } from "@/hooks/usePartnerLeads";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AddProductForm = lazy(() => import("./AddProductForm"));
const ApiConnectionPanel = lazy(() => import("./ApiConnectionPanel"));
const QuotePdfUploader = lazy(() => import("@/components/quotes/QuotePdfUploader"));
import {
  TrendingUp, Star, ChevronRight, Inbox, Package, Eye, FileText,
  ArrowUpRight, Lock, Crown, Shield, Zap, BarChart3, Download,
  MessageSquare, Clock, CheckCircle2, XCircle, AlertTriangle,
  Plus, Upload, Image, Paperclip, Send, Search,
  Users, Sparkles, Award, FileSpreadsheet,
  Rocket, GripVertical, Briefcase, MapPin, Calendar,
  Building2, EyeOff, Handshake, Target, ThumbsUp, ThumbsDown, Info,
} from "lucide-react";

const ExcelImportModal = lazy(() => import("./ExcelImportModal"));

// ── Types ──────────────────────────────────────────────────────────────────────

export type PartnerPlan = "starter" | "growth" | "elite";

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
    commission: 3,
    maxProducts: null,
    price: "Sur mesure",
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
        {plan !== "elite" && onUpgrade && (
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
  if (currentPlan === "elite") return null;

  const nextPlan = currentPlan === "starter" ? "growth" : "elite";
  const nextConfig = PLAN_CONFIG[nextPlan];
  const currentConfig = PLAN_CONFIG[currentPlan];
  const savings = currentConfig.commission - nextConfig.commission;

  const handleUpgrade = () => {
    if (nextPlan === "growth") {
      navigate("/become-partner");
    } else {
      navigate("/become-partner");
      toast.info("Contactez-nous pour discuter du plan Elite.");
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

// ── Product Row with Commission ────────────────────────────────────────────────

function ProductRow({
  name, image, price, commissionRate, views, quotes, stock,
}: {
  name: string; image?: string; price: number; commissionRate: number;
  views: number; quotes: number; stock: string;
}) {
  const commissionAmount = price * (commissionRate / 100);
  const clientPrice = price + commissionAmount;

  return (
    <div className="flex items-center gap-4 px-4 py-3 border border-border rounded-sm hover:border-foreground/20 transition-colors">
      <div className="w-12 h-12 rounded-sm overflow-hidden border border-border shrink-0 bg-muted">
        {image ? (
          <img src={image} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-5 w-5 text-muted-foreground/30" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-display font-semibold text-foreground truncate">{name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[10px] font-body text-foreground font-medium">€{price.toFixed(0)} HT</p>
          <span className="text-[9px] font-body text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
            +{commissionRate}% comm. ≈ €{commissionAmount.toFixed(0)}
          </span>
          <span className="text-[9px] font-body text-muted-foreground">
            → Client : €{clientPrice.toFixed(0)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0 text-[10px] font-body text-muted-foreground">
        <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {views}</span>
        <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {quotes}</span>
        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-display font-semibold ${
          stock === "En stock" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
        }`}>
          {stock}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── PARTNER OVERVIEW ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function PartnerOverview({ plan, onNavigate }: { plan: PartnerPlan; onNavigate: PartnerSectionSetter }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const config = PLAN_CONFIG[plan];
  const isElite = plan === "elite";

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
          <QuoteRow
            title="40× Chaise Riviera — Aluminium blanc"
            client="Hotel Le Grand, Paris"
            amount="€5 600"
            date="il y a 2h"
            status="Nouveau"
            statusStyle="bg-blue-50 text-blue-700"
            commission={`€${(5600 * config.commission / 100).toFixed(0)}`}
            onClick={() => onNavigate("quotes")}
          />
          <QuoteRow
            title="12× Parasol XL 3m — Beige"
            client="Beach Club Cala, Nice"
            amount="€3 840"
            date="il y a 1j"
            status="Nouveau"
            statusStyle="bg-blue-50 text-blue-700"
            commission={`€${(3840 * config.commission / 100).toFixed(0)}`}
            onClick={() => onNavigate("quotes")}
          />
          <QuoteRow
            title="8× Table ronde 80cm — Anthracite"
            client="Brasserie du Port, Marseille"
            amount="€1 920"
            date="il y a 3j"
            status="En cours"
            statusStyle="bg-amber-50 text-amber-700"
            commission={`€${(1920 * config.commission / 100).toFixed(0)}`}
            onClick={() => onNavigate("quotes")}
          />
        </div>
        <button
          onClick={() => onNavigate("quotes")}
          className="w-full mt-2 text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1 py-2"
        >
          {t('pd.overview.seeAllRequests')} <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Top products */}
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
          <div
            onClick={() => onNavigate("catalogue")}
            className="flex items-center justify-between px-3 py-2 border border-border rounded-sm cursor-pointer hover:border-foreground/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Star className="h-3.5 w-3.5 text-amber-500" />
              <p className="text-xs font-display font-semibold text-foreground">Chaise Riviera</p>
            </div>
            <p className="text-[10px] font-body text-muted-foreground">142 vues · 12 devis</p>
          </div>
          <div
            onClick={() => onNavigate("catalogue")}
            className="flex items-center justify-between px-3 py-2 border border-border rounded-sm cursor-pointer hover:border-foreground/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Star className="h-3.5 w-3.5 text-amber-500" />
              <p className="text-xs font-display font-semibold text-foreground">Parasol XL</p>
            </div>
            <p className="text-[10px] font-body text-muted-foreground">98 vues · 8 devis</p>
          </div>
        </div>
      </div>

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

type QuoteStatus = "all" | "Nouveau" | "En cours" | "Accepté" | "Décliné";

export function PartnerQuotesSection({ plan }: { plan: PartnerPlan }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>("all");
  const [expandedQuote, setExpandedQuote] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [proposedPrice, setProposedPrice] = useState<Record<string, string>>({});
  const [proposedDelay, setProposedDelay] = useState<Record<string, string>>({});
  const [proposedTva, setProposedTva] = useState<Record<string, string>>({});
  const [proposedValidity, setProposedValidity] = useState<Record<string, string>>({});
  const [proposedPaymentCond, setProposedPaymentCond] = useState<Record<string, string>>({});
  const [proposedDeliveryCond, setProposedDeliveryCond] = useState<Record<string, string>>({});
  const config = PLAN_CONFIG[plan];

  // Real data from Supabase
  const { quotes: realQuotes, isLoading: quotesLoading, partnerId, updateStatus } = usePartnerQuotes();

  // Map real data to display format
  const STATUS_MAP: Record<string, { label: string; style: string }> = {
    pending:  { label: "Nouveau",  style: "bg-blue-50 text-blue-700" },
    replied:  { label: "Répondu",  style: "bg-amber-50 text-amber-700" },
    accepted: { label: "Accepté",  style: "bg-green-50 text-green-700" },
    signed:   { label: "Signé",    style: "bg-emerald-50 text-emerald-700" },
    expired:  { label: "Expiré",   style: "bg-gray-100 text-gray-500" },
    cancelled:{ label: "Annulé",   style: "bg-red-50 text-red-600" },
  };

  const displayQuotes = realQuotes.map(q => ({
    id: q.id,
    title: `${q.quantity}× ${q.product_name}`,
    client: `${q.client_first_name || "Client"}, ${q.client_city || "—"}`,
    clientRef: q.client_anonymous_id || "—",
    amount: q.total_price ? `€${Number(q.total_price).toLocaleString()}` : "Sur demande",
    totalHT: Number(q.total_price || 0),
    date: timeAgo(q.created_at),
    status: STATUS_MAP[q.status]?.label || q.status,
    statusKey: q.status,
    statusStyle: STATUS_MAP[q.status]?.style || "bg-gray-100 text-gray-600",
    products: [{ name: q.product_name, qty: q.quantity, unitPrice: Number(q.unit_price || 0) }],
    projectName: q.project_name,
    projectType: q.project_venue_type,
    city: q.client_city,
    message: q.message,
    hasPdf: !!q.latest_pdf_path,
    isSigned: !!q.signed_at,
    raw: q,
  }));

  const filtered = filter === "all" ? displayQuotes : displayQuotes.filter(q => q.statusKey === filter);

  const handleSendProposal = (id: string) => {
    const price = proposedPrice[id];
    if (!price) { toast.error("Ajoutez un prix proposé."); return; }
    const qty = realQuotes.find(q => q.id === id)?.quantity || 1;
    updateStatus({
      quoteId: id,
      status: "replied",
      unitPrice: Number(price) / qty,
      totalPrice: Number(price),
      tvaRate: Number(proposedTva[id] || 20),
      deliveryDelayDays: proposedDelay[id] ? Number(proposedDelay[id]) : undefined,
      deliveryConditions: proposedDeliveryCond[id] || undefined,
      paymentConditions: proposedPaymentCond[id] || undefined,
      validityDays: Number(proposedValidity[id] || 30),
      partnerConditions: replyText[id] || undefined,
    });
    toast.success("Proposition envoyée au client !");
    setExpandedQuote(null);
  };

  const handleDecline = (id: string) => {
    updateStatus({ quoteId: id, status: "cancelled" });
    toast("Demande déclinée", { description: "Le client sera notifié." });
  };

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return "à l'instant";
    if (hours < 24) return `il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `il y a ${days}j`;
    return `il y a ${Math.floor(days / 7)}sem`;
  }

  return (
    <div className="space-y-5">
      <CommissionReminder plan={plan} onUpgrade={() => navigate("/become-partner")} />

      {/* Filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 flex-wrap">
          {[
            { id: "all", label: t('pd.quotes.all'), count: displayQuotes.length },
            { id: "pending", label: t('pd.quotes.new'), count: displayQuotes.filter(q => q.statusKey === "pending").length },
            { id: "replied", label: "Répondu", count: displayQuotes.filter(q => q.statusKey === "replied").length },
            { id: "signed", label: "Signé", count: displayQuotes.filter(q => q.statusKey === "signed").length },
          ].map(f => (
            <button key={f.id} onClick={() => { setFilter(f.id); setExpandedQuote(null); }}
              className={`text-[10px] font-display font-semibold px-3 py-1.5 rounded-full transition-all ${
                filter === f.id ? "bg-foreground text-primary-foreground" : "border border-border text-muted-foreground"
              }`}>
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>

      {/* Quote list */}
      {quotesLoading ? (
        <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="border border-border rounded-sm px-4 py-8 text-center">
          <FileText className="h-6 w-6 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs font-body text-muted-foreground">{t('pd.quotes.noResults')}</p>
          <button onClick={() => setFilter("all")} className="text-[10px] font-display font-semibold text-foreground underline mt-2">{t('pd.quotes.seeAll')}</button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(q => {
            const isOpen = expandedQuote === q.id;
            const isActionable = q.statusKey === "pending" || q.statusKey === "replied";
            const totalHT = q.totalHT;
            const commAmount = totalHT * config.commission / 100;

            return (
              <div key={q.id} className={`border rounded-sm transition-colors ${isOpen ? "border-foreground/30 shadow-sm" : "border-border hover:border-foreground/20"}`}>
                {/* Header — clickable */}
                <div onClick={() => setExpandedQuote(isOpen ? null : q.id)}
                  className="flex items-center justify-between px-4 py-3 cursor-pointer">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-display font-semibold text-foreground truncate">{q.title}</p>
                    <p className="text-[10px] font-body text-muted-foreground">{q.client} · {q.date}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-display font-semibold text-foreground">{q.amount}</p>
                      <p className="text-[9px] font-body text-amber-600">{t('pd.quotes.commLabel', { percent: config.commission })}</p>
                    </div>
                    <span className={`text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap ${q.statusStyle}`}>{q.status}</span>
                    <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  </div>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-border">
                    {/* Product breakdown */}
                    <div className="px-4 py-3 bg-card/50">
                      <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('pd.quotes.productDetail', { defaultValue: "Détail produits" })}</p>
                      <div className="border border-border rounded-sm overflow-hidden">
                        <table className="w-full text-[10px] font-body">
                          <thead className="bg-card">
                            <tr className="border-b border-border">
                              <th className="text-left px-3 py-1.5 font-display font-semibold text-muted-foreground">{t('pd.quotes.product', { defaultValue: "Produit" })}</th>
                              <th className="text-center px-3 py-1.5 font-display font-semibold text-muted-foreground">{t('pd.quotes.color', { defaultValue: "Couleur" })}</th>
                              <th className="text-center px-3 py-1.5 font-display font-semibold text-muted-foreground">{t('pd.quotes.qty', { defaultValue: "Qté" })}</th>
                              <th className="text-right px-3 py-1.5 font-display font-semibold text-muted-foreground">{t('pd.quotes.unitPrice', { defaultValue: "Prix unit. HT" })}</th>
                              <th className="text-right px-3 py-1.5 font-display font-semibold text-muted-foreground">{t('pd.quotes.subtotal', { defaultValue: "Sous-total" })}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {q.products.map((p, i) => (
                              <tr key={i} className="border-b border-border last:border-0">
                                <td className="px-3 py-2 font-semibold text-foreground">{p.name}</td>
                                <td className="px-3 py-2 text-center text-muted-foreground">{p.color || "—"}</td>
                                <td className="px-3 py-2 text-center text-foreground">{p.qty}</td>
                                <td className="px-3 py-2 text-right text-foreground">€{p.unitPrice.toFixed(0)}</td>
                                <td className="px-3 py-2 text-right font-semibold text-foreground">€{(p.qty * p.unitPrice).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {/* Totals */}
                      <div className="flex justify-end mt-2 space-x-6 text-[10px] font-body">
                        <div className="text-right">
                          <p className="text-muted-foreground">{t('pd.quotes.totalHT', { defaultValue: "Total HT" })}</p>
                          <p className="font-display font-bold text-foreground">€{totalHT.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-amber-600">{t('pd.quotes.commLabel', { percent: config.commission })}</p>
                          <p className="font-display font-semibold text-amber-600">€{commAmount.toFixed(0)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground">{t('pd.quotes.yourNet', { defaultValue: "Votre net" })}</p>
                          <p className="font-display font-bold text-foreground">€{(totalHT - commAmount).toFixed(0)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Client request details */}
                    {(q.projectName || q.message) && (
                      <div className="px-4 py-3 space-y-3">
                        {q.projectName && (
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('pd.quotes.project', { defaultValue: "Projet" })}</p>
                              <p className="text-[11px] font-body text-foreground mt-0.5">{q.projectName}</p>
                            </div>
                            {q.projectType && (
                              <div>
                                <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('pd.quotes.establishment', { defaultValue: "Établissement" })}</p>
                                <p className="text-[11px] font-body text-foreground mt-0.5">{t('pd.projectTypes.' + q.projectType, { defaultValue: q.projectType })}</p>
                              </div>
                            )}
                            {q.city && (
                              <div>
                                <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('pd.quotes.location', { defaultValue: "Localisation" })}</p>
                                <p className="text-[11px] font-body text-foreground mt-0.5">{q.city}</p>
                              </div>
                            )}
                          </div>
                        )}
                        {(q.timeline || q.budget) && (
                          <div className="grid grid-cols-2 gap-3">
                            {q.timeline && (
                              <div>
                                <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('pd.leads.timeline')}</p>
                                <p className="text-[11px] font-body text-foreground mt-0.5">{t('pd.timelines.' + q.timeline, { defaultValue: q.timeline })}</p>
                              </div>
                            )}
                            {q.budget && (
                              <div>
                                <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('pd.leads.budget')}</p>
                                <p className="text-[11px] font-body text-foreground mt-0.5">€{q.budget}</p>
                              </div>
                            )}
                          </div>
                        )}
                        {q.message && (
                          <div>
                            <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('pd.quotes.clientMessage', { defaultValue: "Message du client" })}</p>
                            <p className="text-[11px] font-body text-foreground leading-relaxed mt-1 bg-card border border-border rounded-sm px-3 py-2.5">{q.message}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Response form for actionable quotes */}
                    {isActionable && (
                      <div className="px-4 py-3 border-t border-border bg-card/30 space-y-3">
                        <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('pd.quotes.yourResponse', { defaultValue: "Votre réponse" })}</p>

                        {/* Row 1: Prix + TVA */}
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-[9px] font-display font-semibold text-muted-foreground block mb-1">Prix total HT *</label>
                            <input type="number" value={proposedPrice[q.id] || ""} onChange={e => setProposedPrice(prev => ({ ...prev, [q.id]: e.target.value }))}
                              placeholder={`€${totalHT}`} className="w-full bg-background border border-border rounded-sm px-3 py-1.5 text-sm font-body outline-none focus:ring-1 focus:ring-foreground" />
                            {proposedPrice[q.id] && (
                              <p className="text-[9px] font-body text-amber-600 mt-0.5">
                                Commission {config.commission}% ≈ €{(Number(proposedPrice[q.id]) * config.commission / 100).toFixed(0)}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="text-[9px] font-display font-semibold text-muted-foreground block mb-1">Taux TVA</label>
                            <select value={proposedTva[q.id] || "20"} onChange={e => setProposedTva(prev => ({ ...prev, [q.id]: e.target.value }))}
                              className="w-full bg-background border border-border rounded-sm px-3 py-1.5 text-sm font-body outline-none focus:ring-1 focus:ring-foreground">
                              <option value="0">0% (Export)</option>
                              <option value="5.5">5,5%</option>
                              <option value="10">10%</option>
                              <option value="20">20%</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] font-display font-semibold text-muted-foreground block mb-1">Validité du devis</label>
                            <select value={proposedValidity[q.id] || "30"} onChange={e => setProposedValidity(prev => ({ ...prev, [q.id]: e.target.value }))}
                              className="w-full bg-background border border-border rounded-sm px-3 py-1.5 text-sm font-body outline-none focus:ring-1 focus:ring-foreground">
                              <option value="15">15 jours</option>
                              <option value="30">30 jours</option>
                              <option value="45">45 jours</option>
                              <option value="60">60 jours</option>
                              <option value="90">90 jours</option>
                            </select>
                          </div>
                        </div>

                        {/* Row 2: Délai + Conditions livraison */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] font-display font-semibold text-muted-foreground block mb-1">Délai de livraison</label>
                            <select value={proposedDelay[q.id] || ""} onChange={e => setProposedDelay(prev => ({ ...prev, [q.id]: e.target.value }))}
                              className="w-full bg-background border border-border rounded-sm px-3 py-1.5 text-sm font-body outline-none focus:ring-1 focus:ring-foreground">
                              <option value="">—</option>
                              <option value="3">3 jours</option>
                              <option value="7">1 semaine</option>
                              <option value="14">2 semaines</option>
                              <option value="21">3 semaines</option>
                              <option value="30">1 mois</option>
                              <option value="60">2 mois</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] font-display font-semibold text-muted-foreground block mb-1">Conditions de livraison</label>
                            <input type="text" value={proposedDeliveryCond[q.id] || ""} onChange={e => setProposedDeliveryCond(prev => ({ ...prev, [q.id]: e.target.value }))}
                              placeholder="Franco de port, EXW, DDP…" className="w-full bg-background border border-border rounded-sm px-3 py-1.5 text-sm font-body outline-none focus:ring-1 focus:ring-foreground" />
                          </div>
                        </div>

                        {/* Row 3: Conditions de paiement */}
                        <div>
                          <label className="text-[9px] font-display font-semibold text-muted-foreground block mb-1">Conditions de paiement</label>
                          <select value={proposedPaymentCond[q.id] || ""} onChange={e => setProposedPaymentCond(prev => ({ ...prev, [q.id]: e.target.value }))}
                            className="w-full bg-background border border-border rounded-sm px-3 py-1.5 text-sm font-body outline-none focus:ring-1 focus:ring-foreground">
                            <option value="">—</option>
                            <option value="30% acompte, solde à livraison">30% acompte, solde à livraison</option>
                            <option value="50% acompte, 50% à livraison">50% acompte, 50% à livraison</option>
                            <option value="100% à la commande">100% à la commande</option>
                            <option value="30 jours fin de mois">30 jours fin de mois</option>
                          </select>
                        </div>

                        {/* Legal disclaimer */}
                        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-blue-50/50 border border-blue-100">
                          <Shield className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                          <p className="text-[9px] font-body text-blue-700">
                            En soumettant ce devis, vous confirmez que votre PDF contient vos mentions légales obligatoires (SIREN, n° TVA, CGV). Terrassea transmet ce devis en qualité de mandataire de paiement.
                          </p>
                        </div>

                        <div>
                          <label className="text-[9px] font-display font-semibold text-muted-foreground block mb-1">{t('pd.quotes.responseMessage', { defaultValue: "Message" })}</label>
                          <textarea
                            value={replyText[q.id] || ""}
                            onChange={e => setReplyText(prev => ({ ...prev, [q.id]: e.target.value }))}
                            rows={3}
                            placeholder={t('pd.quotes.responsePlaceholder', { defaultValue: "Conditions, disponibilité, alternatives, remise..." })}
                            className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground resize-none"
                          />
                        </div>

                        {/* PDF Upload */}
                        <Suspense fallback={<div className="h-20 animate-pulse bg-card rounded-xl" />}>
                          <QuotePdfUploader
                            quoteRequestId={q.id}
                            projectName={q.projectName || ""}
                            productName={q.products[0]?.name || ""}
                            quantity={q.products[0]?.qty || 0}
                            supplierAlias={q.clientRef}
                            totalAmount={proposedPrice[q.id] || q.amount}
                          />
                        </Suspense>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button onClick={() => handleSendProposal(q.id)}
                            className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity">
                            <Send className="h-3 w-3" /> {t('pd.quotes.sendProposal', { defaultValue: "Envoyer la proposition" })}
                          </button>
                          <button onClick={() => { updateStatus({ quoteId: q.id, status: "replied" }); toast.success("Demande acceptée"); setExpandedQuote(null); }}
                            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-display font-semibold border border-green-200 text-green-700 rounded-full hover:bg-green-50 transition-colors">
                            <CheckCircle2 className="h-3 w-3" /> {t('pd.quotes.acceptDirect', { defaultValue: "Accepter tel quel" })}
                          </button>
                          <button onClick={() => navigate("/messages")}
                            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-display font-semibold border border-border rounded-full hover:border-foreground transition-colors">
                            <MessageSquare className="h-3 w-3" /> Message
                          </button>
                          <div className="flex-1" />
                          <button onClick={() => handleDecline(q.id)}
                            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-display font-semibold text-red-600 border border-red-200 rounded-full hover:bg-red-50 transition-colors">
                            <XCircle className="h-3 w-3" /> {t('pd.quotes.decline')}
                          </button>
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

      {/* Info text */}
      <div className="flex items-start gap-2 px-4 py-3 bg-card border border-border rounded-sm">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-[10px] font-body text-muted-foreground leading-relaxed">
          {t('pd.quotes.reminder', { percent: config.commission, plan: config.label })}
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── PARTNER CATALOGUE SECTION ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function PartnerCatalogueSection({ plan, partnerId }: { plan: PartnerPlan; partnerId?: string | null }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const config = PLAN_CONFIG[plan];
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [showApiPanel, setShowApiPanel] = useState(false);

  // Real product offers from DB
  const { data: dbProducts = [] } = useQuery({
    queryKey: ["partner-products", partnerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_offers")
        .select("id, price, stock_status, stock_quantity, product_id")
        .eq("partner_id", partnerId!)
        .eq("is_active", true);
      if (!data || data.length === 0) return [];

      // Fetch associated product details
      const productIds = data.map((d) => d.product_id);
      const { data: products } = await supabase
        .from("products")
        .select("id, name, image_url, category")
        .in("id", productIds);

      const productMap = new Map((products || []).map((p) => [p.id, p]));
      return data.map((offer) => {
        const prod = productMap.get(offer.product_id);
        return {
          name: prod?.name ?? "Unknown product",
          price: offer.price ?? 0,
          views: 0, // TODO: connect to real analytics
          quotes: 0, // TODO: connect to real quote_requests count
          stock: offer.stock_status === "in_stock" ? "En stock" : offer.stock_status === "low_stock" ? "Stock faible" : (offer.stock_status ?? "—"),
        };
      });
    },
    enabled: !!partnerId,
  });

  const allProducts = dbProducts;

  const products = searchTerm
    ? allProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : allProducts;

  const productsCount = allProducts.length;
  const maxProducts = config.maxProducts;
  const usagePercent = maxProducts ? Math.round((productsCount / maxProducts) * 100) : 0;

  const handleAddProduct = () => {
    setShowAddForm(true);
  };

  return (
    <div className="space-y-5">
      {/* Commission reminder */}
      <CommissionReminder plan={plan} onUpgrade={() => navigate("/become-partner")} />

      {/* Header with product count */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display font-bold text-sm text-foreground">{t('pd.catalogue.title')}</p>
          <p className="text-[10px] font-body text-muted-foreground mt-0.5">
            {productsCount}{maxProducts ? `/${maxProducts}` : ""} produits référencés
            {maxProducts && (
              <> — <span className={usagePercent > 80 ? "text-amber-600 font-semibold" : ""}>{usagePercent}% utilisé</span></>
            )}
          </p>
        </div>
        <button
          onClick={handleAddProduct}
          className="flex items-center gap-2 px-4 py-2 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
        >
          <Plus className="h-3 w-3" /> {t('pd.catalogue.add')}
        </button>
      </div>

      {/* Product limit bar */}
      {maxProducts && (
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${usagePercent}%`,
              background: usagePercent > 80 ? "#D97706" : config.color,
            }}
          />
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder={t('pd.catalogue.search')}
          className="w-full bg-card border border-border rounded-sm pl-9 pr-3 py-2.5 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
        />
      </div>

      {/* Commission info box */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-sm border" style={{ background: config.bg, borderColor: config.border }}>
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: config.color }} />
        <div className="text-[10px] font-body leading-relaxed" style={{ color: config.color }}>
          <strong>Commission {config.label} : {config.commission}%</strong>
          <br />
          Les prix ci-dessous sont vos prix HT. La commission Terrassea de {config.commission}% est ajoutée au prix présenté au client.
        </div>
      </div>

      {/* Product list */}
      {products.length === 0 ? (
        <div className="border border-border rounded-sm px-4 py-8 text-center">
          <Package className="h-6 w-6 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs font-body text-muted-foreground">
            {searchTerm ? "Aucun produit ne correspond à votre recherche" : "Aucun produit dans votre catalogue"}
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="text-[10px] font-display font-semibold text-foreground underline mt-2"
            >
              Effacer la recherche
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((p, i) => (
            <ProductRow
              key={i}
              name={p.name}
              price={p.price}
              commissionRate={config.commission}
              views={p.views}
              quotes={p.quotes}
              stock={p.stock}
            />
          ))}
        </div>
      )}

      {/* Import actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setShowExcelImport(true)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-display font-semibold border border-border rounded-full hover:border-foreground transition-colors"
        >
          <FileSpreadsheet className="h-3 w-3" /> Import Excel / CSV
        </button>
        <button
          onClick={() => setShowApiPanel(true)}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-display font-semibold border border-border rounded-full hover:border-foreground transition-colors ${
            plan !== "elite" ? "text-muted-foreground" : ""
          }`}
        >
          <Zap className="h-3 w-3" /> Sync API temps réel
          {plan !== "elite" && <Lock className="h-2.5 w-2.5 ml-0.5" />}
        </button>
      </div>

      {/* Upsell */}
      {plan !== "elite" && maxProducts && productsCount >= maxProducts * 0.8 && (
        <UpgradeCTA currentPlan={plan} />
      )}

      {/* Add Product Form Modal */}
      {showAddForm && (
        <Suspense fallback={null}>
          <AddProductForm
            plan={plan}
            onClose={() => setShowAddForm(false)}
            onSuccess={() => {
              setShowAddForm(false);
              toast.success("Produit ajouté !");
            }}
          />
        </Suspense>
      )}

      {/* Excel Import Modal */}
      {showExcelImport && (
        <Suspense fallback={null}>
          <ExcelImportModal
            plan={plan}
            onClose={() => setShowExcelImport(false)}
            onSuccess={(count) => {
              setShowExcelImport(false);
              toast.success(`${count} produit${count > 1 ? "s" : ""} importé${count > 1 ? "s" : ""} avec succès !`);
            }}
          />
        </Suspense>
      )}

      {/* API Connection Panel */}
      {showApiPanel && (
        <Suspense fallback={null}>
          <ApiConnectionPanel
            plan={plan}
            partnerId={null}
            onClose={() => setShowApiPanel(false)}
          />
        </Suspense>
      )}
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
  const isElite = plan === "elite";

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
  const maxFeatured = plan === "elite" ? 10 : plan === "growth" ? 2 : 0;
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
      let query = supabase
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

          {plan !== "elite" && <UpgradeCTA currentPlan={plan} />}
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

  const { leads: rawLeads, isLoading, expressInterest, declineLead } = usePartnerLeads();

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
                      <div className="flex items-center gap-2 pt-1">
                        {!isInterested ? (
                          <>
                            <button onClick={() => handleInterest(lead.id)} className="flex items-center gap-2 px-4 py-2 text-[10px] font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity">
                              <ThumbsUp className="h-3 w-3" /> Je suis intéressé
                            </button>
                            <button onClick={() => handleDecline(lead.id)} className="flex items-center gap-2 px-4 py-2 text-[10px] font-display font-semibold border border-border rounded-full hover:border-foreground transition-colors">
                              <ThumbsDown className="h-3 w-3" /> Pas pour moi
                            </button>
                          </>
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
