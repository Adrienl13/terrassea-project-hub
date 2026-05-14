import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations } from "@/hooks/useConversations";
import { supabase } from "@/integrations/supabase/client";
import {
  TrendingUp, Star, ChevronRight, Inbox, Package,
  BarChart3, MessageSquare,
} from "lucide-react";
import {
  type PartnerPlan,
  PLAN_CONFIG,
  CommissionReminder,
  type PartnerSectionSetter,
  UpgradeCTA,
  StatCard,
} from "./PartnerSections";

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

// ── Top Products Widget ───────────────────────────────────────────────────────

function TopProductsWidget({ partnerId, onNavigate }: { partnerId: string | null; onNavigate: PartnerSectionSetter }) {
  const { t } = useTranslation();
  const { data: topProducts = [] } = useQuery({
    queryKey: ["partner-top-products", partnerId],
    queryFn: async () => {
      // Note: source_offer_id filter removed pending Dette 46 resolution.
      // Migration 20260329100000_brand_distributor_enhancements.sql adds the
      // column but is in repo only — never applied to prod. Standard partners
      // have no inherited offers, so the filter was functionally redundant.
      const { data } = await supabase
        .from("product_offers")
        .select("product_id, product:product_id(name, image_url)")
        .eq("partner_id", partnerId!)
        .eq("is_active", true)
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
                <img loading="lazy" src={item.product.image_url} alt="" className="w-6 h-6 rounded object-cover" />
              ) : (
                <Star className="h-3.5 w-3.5 text-amber-500" />
              )}
              <p className="text-xs font-display font-semibold text-foreground">{item.product?.name || "—"}</p>
            </div>
          </div>
        )) : (
          <div className="border border-dashed border-border rounded-xl px-4 py-6 text-center">
            <Package className="h-5 w-5 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-[10px] font-display font-semibold text-foreground mb-1">{t('pd.overview.noProducts', 'Aucun produit dans le catalogue')}</p>
            <p className="text-[9px] font-body text-muted-foreground max-w-xs mx-auto">
              {t('pd.overview.noProductsHint', 'Ajoutez vos premiers produits pour apparaître dans le catalogue et recevoir des demandes.')}
            </p>
          </div>
        )}
      </div>
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
// ── PARTNER OVERVIEW ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

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
        .select("id, product_name, first_name, last_name, quantity, unit_price, status, created_at")
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
            const clientName = `${q.first_name ?? ""} ${q.last_name ?? ""}`.trim() || "—";
            return (
              <QuoteRow
                key={q.id}
                title={`${q.quantity ? q.quantity + "× " : ""}${q.product_name || t('pd.overview.quoteRequest')}`}
                client={clientName}
                amount={amount > 0 ? `€${amount.toLocaleString()}` : "—"}
                date={dateStr}
                status={statusLabel}
                statusStyle={statusStyle}
                commission={amount > 0 ? `€${(amount * config.commission / 100).toFixed(0)}` : "—"}
                onClick={() => onNavigate("quotes")}
              />
            );
          }) : (
            <div className="border border-dashed border-border rounded-xl px-4 py-8 text-center">
              <Inbox className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs font-display font-semibold text-foreground mb-1">{t('pd.overview.noRecentRequests', 'Aucune demande récente')}</p>
              <p className="text-[10px] font-body text-muted-foreground max-w-xs mx-auto">
                {t('pd.overview.noRecentRequestsHint', 'Les demandes de devis apparaîtront ici dès que des clients s\'intéresseront à vos produits. Assurez-vous d\'avoir des produits en ligne !')}
              </p>
              {productsCount === 0 && (
                <button
                  onClick={() => onNavigate("catalogue")}
                  className="mt-3 px-4 py-2 text-[10px] font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
                >
                  {t('pd.overview.addFirstProduct', 'Ajouter des produits')}
                </button>
              )}
            </div>
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
