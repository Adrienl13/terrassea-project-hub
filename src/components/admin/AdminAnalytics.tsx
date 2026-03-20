import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText, TrendingUp, CreditCard, Percent, ArrowRight,
  BarChart3, Package, CheckCircle2, PenTool, Clock, Building2,
} from "lucide-react";

// ══════════════════════════════════════════════════════════════════════════════

export default function AdminAnalytics() {
  // ── Fetch all data ──
  const { data: quotes = [] } = useQuery({
    queryKey: ["analytics-quotes"],
    queryFn: async () => {
      const { data } = await (supabase.from("quote_requests" as any).select("id, status, total_price, created_at, signed_at") as any);
      return data || [];
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["analytics-orders"],
    queryFn: async () => {
      const { data } = await (supabase.from("orders" as any).select("id, status, total_amount, commission_amount, deposit_amount, deposit_paid_at, balance_amount, balance_paid_at, created_at, partner_id") as any);
      return data || [];
    },
  });

  const { data: partners = [] } = useQuery({
    queryKey: ["analytics-partners"],
    queryFn: async () => {
      const { data } = await (supabase.from("partners" as any).select("id, name, plan") as any);
      return data || [];
    },
  });

  // ── Funnel ──
  const funnel = {
    requests: quotes.length,
    replied: quotes.filter((q: any) => ["replied", "accepted", "signed"].includes(q.status)).length,
    signed: quotes.filter((q: any) => q.status === "signed" || q.signed_at).length,
    orders: orders.length,
    completed: orders.filter((o: any) => o.status === "completed").length,
  };

  const convRate = (a: number, b: number) => b > 0 ? `${Math.round(a / b * 100)}%` : "—";

  // ── Revenue ──
  const totalOrdered = orders.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
  const depositsCollected = orders.filter((o: any) => o.deposit_paid_at).reduce((s: number, o: any) => s + Number(o.deposit_amount || 0), 0);
  const balancesCollected = orders.filter((o: any) => o.balance_paid_at).reduce((s: number, o: any) => s + Number(o.balance_amount || 0), 0);
  const totalCollected = depositsCollected + balancesCollected;
  const totalCommissions = orders.reduce((s: number, o: any) => s + Number(o.commission_amount || 0), 0);
  const avgOrderValue = orders.length > 0 ? totalOrdered / orders.length : 0;

  // ── Revenue by month ──
  const revenueByMonth: Record<string, { orders: number; amount: number; commissions: number }> = {};
  orders.forEach((o: any) => {
    const month = new Date(o.created_at).toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
    if (!revenueByMonth[month]) revenueByMonth[month] = { orders: 0, amount: 0, commissions: 0 };
    revenueByMonth[month].orders++;
    revenueByMonth[month].amount += Number(o.total_amount || 0);
    revenueByMonth[month].commissions += Number(o.commission_amount || 0);
  });
  const months = Object.entries(revenueByMonth);

  // ── Top partners by revenue ──
  const partnerRevenue: Record<string, number> = {};
  orders.forEach((o: any) => {
    if (o.partner_id) partnerRevenue[o.partner_id] = (partnerRevenue[o.partner_id] || 0) + Number(o.total_amount || 0);
  });
  const topPartners = Object.entries(partnerRevenue)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, revenue]) => {
      const partner = partners.find((p: any) => p.id === id);
      return { name: partner?.name || "—", plan: partner?.plan || "—", revenue };
    });

  // ── Orders by status ──
  const ordersByStatus: Record<string, number> = {};
  orders.forEach((o: any) => { ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1; });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-lg">Analytics</h2>
        <p className="text-xs font-body text-muted-foreground mt-0.5">Vue d'ensemble de l'activité commerciale Terrassea.</p>
      </div>

      {/* ── KPIs ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI icon={FileText} label="Demandes de devis" value={String(funnel.requests)} color="#D97706" />
        <KPI icon={Package} label="Commandes" value={String(funnel.orders)} color="#2563EB" />
        <KPI icon={CreditCard} label="CA total commandé" value={`€${totalOrdered.toLocaleString()}`} color="#059669" />
        <KPI icon={Percent} label="Commissions gagnées" value={`€${totalCommissions.toLocaleString()}`} color="#D4603A" />
      </div>

      {/* ── Funnel devis ──────────────────────────────────── */}
      <div className="border border-border rounded-xl p-5">
        <h3 className="font-display font-bold text-sm mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" /> Entonnoir de conversion
        </h3>
        <div className="flex items-center gap-0">
          {[
            { label: "Demandes", value: funnel.requests, color: "#D97706", icon: FileText },
            { label: "Devis reçus", value: funnel.replied, color: "#2563EB", icon: Clock },
            { label: "Signés", value: funnel.signed, color: "#7C3AED", icon: PenTool },
            { label: "Commandes", value: funnel.orders, color: "#059669", icon: Package },
            { label: "Terminées", value: funnel.completed, color: "#059669", icon: CheckCircle2 },
          ].map((step, i, arr) => (
            <div key={step.label} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-display font-bold mb-1.5"
                  style={{ background: step.value > 0 ? step.color : `${step.color}30` }}
                >
                  {step.value}
                </div>
                <span className="text-[9px] font-display font-semibold text-center text-muted-foreground">{step.label}</span>
                {i > 0 && (
                  <span className="text-[8px] font-body text-muted-foreground mt-0.5">
                    {convRate(step.value, arr[i - 1].value)}
                  </span>
                )}
              </div>
              {i < arr.length - 1 && (
                <ArrowRight className="h-4 w-4 text-border -mt-4 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Revenue details ───────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI icon={CreditCard} label="Acomptes encaissés" value={`€${depositsCollected.toLocaleString()}`} color="#2563EB" />
        <KPI icon={CreditCard} label="Soldes encaissés" value={`€${balancesCollected.toLocaleString()}`} color="#059669" />
        <KPI icon={TrendingUp} label="Total encaissé" value={`€${totalCollected.toLocaleString()}`} color="#059669" />
        <KPI icon={Package} label="Panier moyen" value={`€${Math.round(avgOrderValue).toLocaleString()}`} color="#7C3AED" />
      </div>

      {/* ── Revenue by month ──────────────────────────────── */}
      {months.length > 0 && (
        <div className="border border-border rounded-xl p-5">
          <h3 className="font-display font-bold text-sm mb-4">Chiffre d'affaires par mois</h3>
          <div className="space-y-2">
            {months.map(([month, data]) => {
              const maxAmount = Math.max(...months.map(([, d]) => d.amount), 1);
              const barWidth = (data.amount / maxAmount) * 100;
              return (
                <div key={month} className="flex items-center gap-3">
                  <span className="text-[10px] font-display font-semibold text-muted-foreground w-20 shrink-0">{month}</span>
                  <div className="flex-1 h-7 bg-gray-50 rounded-lg overflow-hidden relative">
                    <div
                      className="h-full rounded-lg bg-gradient-to-r from-[#D4603A] to-[#E8956A] transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-display font-bold text-foreground">
                      €{data.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right shrink-0 w-20">
                    <p className="text-[9px] font-body text-muted-foreground">{data.orders} cmd</p>
                    <p className="text-[9px] font-display font-semibold text-[#D4603A]">€{data.commissions.toLocaleString()} com.</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Top partners ──────────────────────────────────── */}
      {topPartners.length > 0 && (
        <div className="border border-border rounded-xl p-5">
          <h3 className="font-display font-bold text-sm mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" /> Top fournisseurs par CA
          </h3>
          <div className="space-y-2">
            {topPartners.map((p, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-display font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-xs font-display font-semibold text-foreground">{p.name}</p>
                    <p className="text-[9px] font-body text-muted-foreground capitalize">{p.plan}</p>
                  </div>
                </div>
                <p className="text-xs font-display font-bold text-foreground">€{p.revenue.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Orders by status ──────────────────────────────── */}
      {Object.keys(ordersByStatus).length > 0 && (
        <div className="border border-border rounded-xl p-5">
          <h3 className="font-display font-bold text-sm mb-4">Commandes par statut</h3>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(ordersByStatus).map(([status, count]) => (
              <div key={status} className="text-center px-3 py-2 rounded-lg border border-border bg-card">
                <p className="font-display font-bold text-base">{count}</p>
                <p className="text-[9px] font-display font-semibold text-muted-foreground capitalize">{status.replace(/_/g, " ")}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KPI({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}12` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </div>
      <p className="font-display font-bold text-xl">{value}</p>
      <p className="text-[10px] font-body text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
