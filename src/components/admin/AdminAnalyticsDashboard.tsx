import { useTranslation } from "react-i18next";
import {
  Users, Building2, Package, ShoppingCart, DollarSign, Percent,
  TrendingUp, TrendingDown, Minus, ArrowRight, Loader2,
} from "lucide-react";
import { useAdminAnalytics, type Period } from "@/hooks/useAdminAnalytics";

// ══════════════════════════════════════════════════════════════════
// STATUS COLOURS
// ══════════════════════════════════════════════════════════════════

const STATUS_COLORS: Record<string, string> = {
  // orders
  pending: "#D97706",
  confirmed: "#2563EB",
  production: "#7C3AED",
  shipped: "#0891B2",
  delivered: "#059669",
  completed: "#059669",
  cancelled: "#DC2626",
  disputed: "#DC2626",
  // quotes
  replied: "#2563EB",
  accepted: "#059669",
  signed: "#7C3AED",
  rejected: "#DC2626",
  expired: "#6B7280",
  // users
  client: "#2563EB",
  partner: "#D4603A",
  architect: "#7C3AED",
  admin: "#059669",
};

function statusColor(status: string): string {
  return STATUS_COLORS[status] || "#6B7280";
}

// ══════════════════════════════════════════════════════════════════
// PERIOD SELECTOR
// ══════════════════════════════════════════════════════════════════

function PeriodTabs({ period, setPeriod, t }: { period: Period; setPeriod: (p: Period) => void; t: (k: string) => string }) {
  const opts: { value: Period; label: string }[] = [
    { value: 30, label: t("adminAnalytics.period30") },
    { value: 90, label: t("adminAnalytics.period90") },
    { value: 365, label: t("adminAnalytics.period365") },
  ];
  return (
    <div className="flex gap-1 bg-muted rounded-lg p-1">
      {opts.map((o) => (
        <button
          key={o.value}
          onClick={() => setPeriod(o.value)}
          className={`px-3 py-1.5 text-xs font-display font-semibold rounded-md transition-colors ${
            period === o.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// KPI CARD
// ══════════════════════════════════════════════════════════════════

function KPICard({ icon: Icon, label, value, trend, color, isCurrency }: {
  icon: any; label: string; value: number; trend?: number; color: string; isCurrency?: boolean;
}) {
  const formatted = isCurrency
    ? `€${value.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : value.toLocaleString();

  return (
    <div className="border border-border rounded-xl p-4 bg-card">
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}14` }}>
          <Icon className="h-4.5 w-4.5" style={{ color }} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-display font-semibold rounded-full px-2 py-0.5 ${
            trend > 0 ? "text-green-700 bg-green-50" : trend < 0 ? "text-red-700 bg-red-50" : "text-gray-500 bg-gray-50"
          }`}>
            {trend > 0 ? <TrendingUp className="h-3 w-3" /> : trend < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {trend > 0 ? "+" : ""}{trend}%
          </div>
        )}
      </div>
      <p className="font-display font-bold text-2xl text-foreground">{formatted}</p>
      <p className="text-[10px] font-body text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// BAR CHART (CSS-only)
// ══════════════════════════════════════════════════════════════════

function RevenueChart({ data, t }: { data: { month: string; revenue: number; orders: number; commissions: number }[]; t: (k: string) => string }) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const formatMonth = (m: string) => {
    const [y, mo] = m.split("-");
    const date = new Date(Number(y), Number(mo) - 1);
    return date.toLocaleDateString("default", { month: "short" });
  };

  return (
    <div className="border border-border rounded-xl p-5 bg-card">
      <h3 className="font-display font-bold text-sm mb-5">{t("adminAnalytics.monthlyRevenue")}</h3>
      <div className="flex items-end gap-2 h-44">
        {data.map((d) => {
          const pct = (d.revenue / maxRevenue) * 100;
          return (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-1 group relative">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-10">
                <div className="bg-foreground text-background text-[10px] font-display px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                  <p className="font-bold">€{d.revenue.toLocaleString()}</p>
                  <p className="opacity-70">{d.orders} {t("adminAnalytics.ordersLabel")}</p>
                </div>
                <div className="w-2 h-2 bg-foreground rotate-45 -mt-1" />
              </div>
              {/* Bar */}
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-[#D4603A] to-[#E8956A] transition-all duration-500 hover:from-[#C0502E] hover:to-[#D4603A] cursor-pointer min-h-[2px]"
                style={{ height: `${Math.max(pct, 2)}%` }}
              />
              <span className="text-[8px] font-display text-muted-foreground leading-none">{formatMonth(d.month)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// STATUS BREAKDOWN RING
// ══════════════════════════════════════════════════════════════════

function StatusBreakdown({ title, data }: { title: string; data: Record<string, number> }) {
  const total = Object.values(data).reduce((s, v) => s + v, 0);
  if (total === 0) return null;

  // Build segments for a horizontal bar
  const entries = Object.entries(data).sort(([, a], [, b]) => b - a);

  return (
    <div className="border border-border rounded-xl p-4 bg-card">
      <h4 className="font-display font-bold text-xs mb-3">{title}</h4>
      {/* Segmented bar */}
      <div className="flex h-3 rounded-full overflow-hidden mb-3">
        {entries.map(([status, count]) => (
          <div
            key={status}
            className="h-full transition-all duration-500"
            style={{ width: `${(count / total) * 100}%`, backgroundColor: statusColor(status) }}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {entries.map(([status, count]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor(status) }} />
            <span className="text-[10px] font-display font-semibold text-muted-foreground capitalize">
              {status.replace(/_/g, " ")}
            </span>
            <span className="text-[10px] font-display font-bold text-foreground">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// TABLES
// ══════════════════════════════════════════════════════════════════

function RecentOrdersTable({ orders, t }: { orders: { id: string; productName: string; clientEmail: string; status: string; totalAmount: number; createdAt: string }[]; t: (k: string) => string }) {
  return (
    <div className="border border-border rounded-xl p-4 bg-card">
      <h4 className="font-display font-bold text-xs mb-3">{t("adminAnalytics.recentOrders")}</h4>
      {orders.length === 0 ? (
        <p className="text-xs text-muted-foreground font-body">{t("adminAnalytics.noData")}</p>
      ) : (
        <div className="space-y-1.5">
          {orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-display font-semibold text-foreground truncate">{o.productName}</p>
                <p className="text-[9px] font-body text-muted-foreground truncate">{o.clientEmail}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span
                  className="text-[9px] font-display font-semibold px-2 py-0.5 rounded-full capitalize"
                  style={{ color: statusColor(o.status), backgroundColor: `${statusColor(o.status)}14` }}
                >
                  {o.status.replace(/_/g, " ")}
                </span>
                <span className="text-xs font-display font-bold text-foreground">€{o.totalAmount.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecentQuotesTable({ quotes, t }: { quotes: { id: string; productName: string; firstName: string; status: string; totalPrice: number | null; createdAt: string }[]; t: (k: string) => string }) {
  return (
    <div className="border border-border rounded-xl p-4 bg-card">
      <h4 className="font-display font-bold text-xs mb-3">{t("adminAnalytics.recentQuotes")}</h4>
      {quotes.length === 0 ? (
        <p className="text-xs text-muted-foreground font-body">{t("adminAnalytics.noData")}</p>
      ) : (
        <div className="space-y-1.5">
          {quotes.map((q) => (
            <div key={q.id} className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-display font-semibold text-foreground truncate">{q.productName}</p>
                <p className="text-[9px] font-body text-muted-foreground">{q.firstName}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span
                  className="text-[9px] font-display font-semibold px-2 py-0.5 rounded-full capitalize"
                  style={{ color: statusColor(q.status), backgroundColor: `${statusColor(q.status)}14` }}
                >
                  {q.status.replace(/_/g, " ")}
                </span>
                {q.totalPrice != null && (
                  <span className="text-xs font-display font-bold text-foreground">€{q.totalPrice.toLocaleString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TopProductsTable({ products, t }: { products: { id: string; name: string; category: string; quoteCount: number }[]; t: (k: string) => string }) {
  return (
    <div className="border border-border rounded-xl p-4 bg-card">
      <h4 className="font-display font-bold text-xs mb-3">{t("adminAnalytics.topProducts")}</h4>
      {products.length === 0 ? (
        <p className="text-xs text-muted-foreground font-body">{t("adminAnalytics.noData")}</p>
      ) : (
        <div className="space-y-1.5">
          {products.map((p, i) => (
            <div key={p.id} className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-display font-bold text-muted-foreground shrink-0">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-display font-semibold text-foreground truncate">{p.name}</p>
                  <p className="text-[9px] font-body text-muted-foreground">{p.category}</p>
                </div>
              </div>
              <span className="text-xs font-display font-bold text-foreground shrink-0 ml-2">
                {p.quoteCount} {t("adminAnalytics.quotes")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TopPartnersTable({ partners, t }: { partners: { id: string; name: string; plan: string; revenue: number; orderCount: number }[]; t: (k: string) => string }) {
  return (
    <div className="border border-border rounded-xl p-4 bg-card">
      <h4 className="font-display font-bold text-xs mb-3">{t("adminAnalytics.topPartners")}</h4>
      {partners.length === 0 ? (
        <p className="text-xs text-muted-foreground font-body">{t("adminAnalytics.noData")}</p>
      ) : (
        <div className="space-y-1.5">
          {partners.map((p, i) => (
            <div key={p.id} className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-display font-bold text-muted-foreground shrink-0">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-display font-semibold text-foreground truncate">{p.name}</p>
                  <p className="text-[9px] font-body text-muted-foreground capitalize">{p.plan}</p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <p className="text-xs font-display font-bold text-foreground">€{p.revenue.toLocaleString()}</p>
                <p className="text-[9px] font-body text-muted-foreground">{p.orderCount} {t("adminAnalytics.ordersLabel")}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════

export default function AdminAnalyticsDashboard() {
  const { t } = useTranslation();
  const {
    totalUsers, totalPartners, totalProducts, totalOrders, totalRevenue, totalCommissions,
    usersTrend, ordersTrend, revenueTrend,
    topProducts, topPartners, recentOrders, recentQuotes,
    ordersByStatus, quotesByStatus, usersByType,
    monthlyRevenue,
    isLoading, period, setPeriod,
  } = useAdminAnalytics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-lg">{t("adminAnalytics.title")}</h2>
          <p className="text-xs font-body text-muted-foreground mt-0.5">{t("adminAnalytics.subtitle")}</p>
        </div>
        <PeriodTabs period={period} setPeriod={setPeriod} t={t} />
      </div>

      {/* KPI Cards — 2 rows of 3 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KPICard icon={Users} label={t("adminAnalytics.kpiUsers")} value={totalUsers} trend={usersTrend} color="#2563EB" />
        <KPICard icon={Building2} label={t("adminAnalytics.kpiPartners")} value={totalPartners} color="#D4603A" />
        <KPICard icon={Package} label={t("adminAnalytics.kpiProducts")} value={totalProducts} color="#7C3AED" />
        <KPICard icon={ShoppingCart} label={t("adminAnalytics.kpiOrders")} value={totalOrders} trend={ordersTrend} color="#0891B2" />
        <KPICard icon={DollarSign} label={t("adminAnalytics.kpiRevenue")} value={totalRevenue} trend={revenueTrend} color="#059669" isCurrency />
        <KPICard icon={Percent} label={t("adminAnalytics.kpiCommissions")} value={totalCommissions} color="#D97706" isCurrency />
      </div>

      {/* Revenue chart */}
      <RevenueChart data={monthlyRevenue} t={t} />

      {/* Recent orders + quotes — 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentOrdersTable orders={recentOrders} t={t} />
        <RecentQuotesTable quotes={recentQuotes} t={t} />
      </div>

      {/* Status breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatusBreakdown title={t("adminAnalytics.ordersByStatus")} data={ordersByStatus} />
        <StatusBreakdown title={t("adminAnalytics.quotesByStatus")} data={quotesByStatus} />
        <StatusBreakdown title={t("adminAnalytics.usersByType")} data={usersByType} />
      </div>

      {/* Top 5 tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopProductsTable products={topProducts} t={t} />
        <TopPartnersTable partners={topPartners} t={t} />
      </div>
    </div>
  );
}
