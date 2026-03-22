import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Euro, TrendingUp, TrendingDown, Clock, ShoppingCart,
  ArrowRight, UserPlus, FileText, Building2, Package,
  Truck, Wallet, Star, AlertTriangle, ChevronRight,
  Loader2, CreditCard, BadgePercent, PackageCheck,
} from "lucide-react";

// ══════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function startOfWeek(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1); // Monday
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function formatCurrency(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function trendCalc(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

function relativeTime(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "A l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Hier";
  if (diffD < 7) return `Il y a ${diffD}j`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// ══════════════════════════════════════════════════════════════════
// DATA HOOK
// ══════════════════════════════════════════════════════════════════

function useOverviewData() {
  const thirtyDaysAgo = daysAgo(30);
  const sixtyDaysAgo = daysAgo(60);
  const weekStart = startOfWeek();
  const todayStart = startOfToday();
  const sevenDaysAgo = daysAgo(7);
  const fourteenDaysAgo = daysAgo(14);

  const { data: users = [], isLoading: l1 } = useQuery({
    queryKey: ["overview-users"],
    queryFn: async () => {
      const { data } = await supabase.from("user_profiles").select("id, user_type, created_at");
      return data || [];
    },
    staleTime: 60000,
  });

  const { data: orders = [], isLoading: l2 } = useQuery({
    queryKey: ["overview-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, status, total_amount, commission_amount, deposit_amount, deposit_paid_at, balance_paid_at, shipped_at, delivered_at, client_email, product_name, created_at, invoice_number, estimated_delivery_date")
        .order("created_at", { ascending: false });
      return data || [];
    },
    staleTime: 60000,
  });

  const { data: quotes = [], isLoading: l3 } = useQuery({
    queryKey: ["overview-quotes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("quote_requests")
        .select("id, status, first_name, product_name, total_price, partner_name, created_at, replied_at, signed_at")
        .order("created_at", { ascending: false });
      return data || [];
    },
    staleTime: 60000,
  });

  const { data: projectRequests = [], isLoading: l4 } = useQuery({
    queryKey: ["overview-project-requests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("project_requests")
        .select("id, status, contact_name, contact_email, project_name, created_at")
        .order("created_at", { ascending: false });
      return data || [];
    },
    staleTime: 60000,
  });

  const { data: applications = [], isLoading: l5 } = useQuery({
    queryKey: ["overview-applications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_applications")
        .select("id, status, company_name, contact_name, created_at")
        .order("created_at", { ascending: false });
      return data || [];
    },
    staleTime: 60000,
  });

  const { data: productSubmissions = [], isLoading: l6 } = useQuery({
    queryKey: ["overview-product-submissions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_submissions")
        .select("id, status, partner_id, created_at")
        .order("created_at", { ascending: false });
      return data || [];
    },
    staleTime: 60000,
  });

  const { data: ratings = [], isLoading: l7 } = useQuery({
    queryKey: ["overview-ratings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_ratings")
        .select("id, rating, review, created_at")
        .order("created_at", { ascending: false });
      return data || [];
    },
    staleTime: 60000,
  });

  const { data: orderEvents = [], isLoading: l8 } = useQuery({
    queryKey: ["overview-order-events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("order_events")
        .select("id, event_type, description, order_id, actor, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    staleTime: 60000,
  });

  const isLoading = l1 || l2 || l3 || l4 || l5 || l6 || l7 || l8;

  const computed = useMemo(() => {
    // ── Row 1: Financial KPIs ──
    const totalRevenue = orders.reduce((s, o: any) => s + Number(o.total_amount || 0), 0);
    const totalCommissions = orders.reduce((s, o: any) => s + Number(o.commission_amount || 0), 0);

    const currentMonthOrders = orders.filter((o: any) => o.created_at >= thirtyDaysAgo);
    const prevMonthOrders = orders.filter((o: any) => o.created_at >= sixtyDaysAgo && o.created_at < thirtyDaysAgo);

    const currentRevenue = currentMonthOrders.reduce((s, o: any) => s + Number(o.total_amount || 0), 0);
    const prevRevenue = prevMonthOrders.reduce((s, o: any) => s + Number(o.total_amount || 0), 0);
    const revenueTrend = trendCalc(currentRevenue, prevRevenue);

    const currentCommissions = currentMonthOrders.reduce((s, o: any) => s + Number(o.commission_amount || 0), 0);
    const prevCommissions = prevMonthOrders.reduce((s, o: any) => s + Number(o.commission_amount || 0), 0);
    const commissionsTrend = trendCalc(currentCommissions, prevCommissions);

    // Pending payments: orders where deposit not yet paid
    const pendingPayments = orders
      .filter((o: any) => !o.deposit_paid_at && o.status !== "cancelled" && o.status !== "delivered" && o.status !== "completed")
      .reduce((s, o: any) => s + Number(o.deposit_amount || o.total_amount || 0), 0);

    // Active orders (in production or shipped)
    const activeOrders = orders.filter((o: any) =>
      ["confirmed", "production", "shipped"].includes(o.status)
    ).length;

    const currentActiveOrders = orders.filter((o: any) =>
      ["confirmed", "production", "shipped"].includes(o.status) && o.created_at >= thirtyDaysAgo
    ).length;
    const prevActiveOrders = orders.filter((o: any) =>
      ["confirmed", "production", "shipped"].includes(o.status) && o.created_at >= sixtyDaysAgo && o.created_at < thirtyDaysAgo
    ).length;
    const activeOrdersTrend = trendCalc(currentActiveOrders, prevActiveOrders);

    // ── Row 2: Funnel ──
    const totalInscriptions = users.length;
    const totalQuoteRequests = quotes.length + projectRequests.length;
    const quotesSent = quotes.filter((q: any) => q.status && q.status !== "pending").length;
    const quotesAccepted = quotes.filter((q: any) => ["accepted", "signed"].includes(q.status || "")).length;
    const totalOrdersCount = orders.length;
    const deliveredOrders = orders.filter((o: any) => ["delivered", "completed"].includes(o.status)).length;

    // ── Row 3: Flux entrant / sortant ──
    const usersToday = users.filter((u: any) => u.created_at && u.created_at >= todayStart).length;
    const usersThisWeek = users.filter((u: any) => u.created_at && u.created_at >= weekStart).length;
    const usersLastWeek = users.filter((u: any) => u.created_at && u.created_at >= fourteenDaysAgo && u.created_at < sevenDaysAgo).length;
    const usersThisWeekCount = users.filter((u: any) => u.created_at && u.created_at >= sevenDaysAgo).length;

    const quotesRequestsToday = [...quotes, ...projectRequests].filter((q: any) => q.created_at && q.created_at >= todayStart).length;
    const quotesRequestsThisWeek = [...quotes, ...projectRequests].filter((q: any) => q.created_at && q.created_at >= weekStart).length;
    const quotesRequestsThisWeekCount = [...quotes, ...projectRequests].filter((q: any) => q.created_at && q.created_at >= sevenDaysAgo).length;
    const quotesRequestsLastWeek = [...quotes, ...projectRequests].filter((q: any) => q.created_at && q.created_at >= fourteenDaysAgo && q.created_at < sevenDaysAgo).length;

    const pendingApplications = applications.filter((a: any) => a.status === "pending").length;
    const newApplicationsThisWeek = applications.filter((a: any) => a.created_at && a.created_at >= weekStart).length;

    const pendingSubmissions = productSubmissions.filter((s: any) => s.status === "pending").length;
    const newSubmissionsThisWeek = productSubmissions.filter((s: any) => s.created_at && s.created_at >= weekStart).length;

    // Sortant
    const shippedThisWeek = orders.filter((o: any) => o.shipped_at && o.shipped_at >= weekStart).length;
    const revenueThisWeek = orders
      .filter((o: any) => o.created_at >= weekStart)
      .reduce((s, o: any) => s + Number(o.total_amount || 0), 0);
    const revenueLastWeek = orders
      .filter((o: any) => o.created_at >= fourteenDaysAgo && o.created_at < sevenDaysAgo)
      .reduce((s, o: any) => s + Number(o.total_amount || 0), 0);

    const commissionsToPay = orders
      .filter((o: any) => ["delivered", "completed"].includes(o.status))
      .reduce((s, o: any) => s + Number(o.commission_amount || 0), 0);

    const ratingsThisWeek = ratings.filter((r: any) => r.created_at >= weekStart).length;
    const ratingsLastWeek = ratings.filter((r: any) => r.created_at >= fourteenDaysAgo && r.created_at < sevenDaysAgo).length;

    // ── Row 4: Timeline ──
    type TimelineEvent = { id: string; type: string; label: string; time: string; color: string };
    const timeline: TimelineEvent[] = [];

    // Quote requests
    quotes.slice(0, 30).forEach((q: any) => {
      if (q.status === "pending" || !q.status) {
        timeline.push({ id: `q-${q.id}`, type: "quote_request", label: `${q.first_name || "Client"} a demande un devis pour "${q.product_name || "produit"}"`, time: q.created_at, color: "bg-blue-500" });
      }
      if (q.replied_at) {
        timeline.push({ id: `qr-${q.id}`, type: "quote_replied", label: `${q.partner_name || "Fournisseur"} a repondu au devis de ${q.first_name || "client"}`, time: q.replied_at, color: "bg-green-500" });
      }
      if (q.signed_at) {
        timeline.push({ id: `qs-${q.id}`, type: "quote_signed", label: `Devis signe par ${q.first_name || "client"} — ${q.product_name || ""}`, time: q.signed_at, color: "bg-emerald-600" });
      }
    });

    // Orders
    orders.slice(0, 20).forEach((o: any) => {
      timeline.push({ id: `o-${o.id}`, type: "order", label: `Commande ${o.invoice_number || o.id.slice(0, 8)} — ${o.product_name} (${formatCurrency(Number(o.total_amount))} EUR)`, time: o.created_at, color: "bg-purple-500" });
      if (o.deposit_paid_at) {
        timeline.push({ id: `op-${o.id}`, type: "payment", label: `Paiement de ${formatCurrency(Number(o.deposit_amount || o.total_amount))} EUR recu — ${o.product_name}`, time: o.deposit_paid_at, color: "bg-emerald-500" });
      }
      if (o.shipped_at) {
        timeline.push({ id: `os-${o.id}`, type: "shipped", label: `Commande ${o.invoice_number || o.id.slice(0, 8)} expediee`, time: o.shipped_at, color: "bg-indigo-500" });
      }
    });

    // New users
    users.filter((u: any) => u.created_at && u.created_at >= sevenDaysAgo).forEach((u: any) => {
      timeline.push({ id: `u-${u.id}`, type: "user", label: `Nouvel utilisateur inscrit (${u.user_type})`, time: u.created_at, color: "bg-gray-400" });
    });

    // Applications
    applications.slice(0, 10).forEach((a: any) => {
      timeline.push({ id: `a-${a.id}`, type: "application", label: `Candidature partenaire: ${a.company_name || a.contact_name}`, time: a.created_at || "", color: "bg-amber-500" });
    });

    // Sort by time descending, take 20
    timeline.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    const recentTimeline = timeline.slice(0, 20);

    // ── Row 5: Alerts ──
    const pendingQuoteAssignment = quotes.filter((q: any) => q.status === "pending" && !q.partner_name).length;
    const pendingProductReview = pendingSubmissions;
    const pendingPaymentConfirmation = orders.filter((o: any) => o.status === "pending" && !o.deposit_paid_at).length;
    const overdueDeliveries = orders.filter((o: any) => {
      if (o.status === "delivered" || o.status === "completed" || o.status === "cancelled") return false;
      if (!o.estimated_delivery_date) return false;
      return new Date(o.estimated_delivery_date) < new Date();
    }).length;

    return {
      // Row 1
      totalRevenue, totalCommissions, pendingPayments, activeOrders,
      revenueTrend, commissionsTrend, activeOrdersTrend,
      // Row 2
      totalInscriptions, totalQuoteRequests, quotesSent, quotesAccepted, totalOrdersCount, deliveredOrders,
      // Row 3 In
      usersToday, usersThisWeek, usersThisWeekCount, usersLastWeek,
      quotesRequestsToday, quotesRequestsThisWeek, quotesRequestsThisWeekCount, quotesRequestsLastWeek,
      pendingApplications, newApplicationsThisWeek,
      pendingSubmissions, newSubmissionsThisWeek,
      // Row 3 Out
      shippedThisWeek, revenueThisWeek, revenueLastWeek, commissionsToPay,
      ratingsThisWeek, ratingsLastWeek,
      // Row 4
      recentTimeline,
      // Row 5
      pendingQuoteAssignment, pendingProductReview, pendingPaymentConfirmation, overdueDeliveries,
    };
  }, [users, orders, quotes, projectRequests, applications, productSubmissions, ratings, orderEvents, thirtyDaysAgo, sixtyDaysAgo, weekStart, todayStart, sevenDaysAgo, fourteenDaysAgo]);

  return { ...computed, isLoading };
}

// ══════════════════════════════════════════════════════════════════
// GRADIENT KPI CARD
// ══════════════════════════════════════════════════════════════════

function GradientKPI({ icon: Icon, label, value, sub, trend, gradient }: {
  icon: any; label: string; value: string; sub?: string;
  trend?: { value: number; label: string }; gradient: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-xl p-5 text-white ${gradient}`}>
      <div className="absolute top-3 right-3 opacity-20">
        <Icon className="h-12 w-12" />
      </div>
      <p className="text-sm font-body opacity-90">{label}</p>
      <p className="font-display text-3xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs font-body opacity-75 mt-1">{sub}</p>}
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          {trend.value > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : trend.value < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : null}
          <span className="text-xs font-display font-semibold">
            {trend.value > 0 ? "+" : ""}{trend.value}% {trend.label}
          </span>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// FUNNEL STEP
// ══════════════════════════════════════════════════════════════════

function FunnelStep({ label, count, isLast, shade }: {
  label: string; count: number; isLast?: boolean; shade: string;
}) {
  return (
    <div className="flex items-center flex-1 min-w-0">
      <div className={`flex flex-col items-center justify-center rounded-lg px-3 py-3 ${shade} flex-1 min-w-0`}>
        <span className="font-display text-xl font-bold text-foreground">{count.toLocaleString()}</span>
        <span className="text-[10px] font-body text-muted-foreground text-center leading-tight mt-0.5">{label}</span>
      </div>
      {!isLast && (
        <ArrowRight className="h-4 w-4 text-muted-foreground/40 mx-1 shrink-0" />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// FLUX ITEM
// ══════════════════════════════════════════════════════════════════

function FluxItem({ label, todayValue, weekValue, trend }: {
  label: string; todayValue?: string; weekValue: string; trend: "up" | "down" | "neutral";
}) {
  const dotColor = trend === "up" ? "bg-green-500" : trend === "down" ? "bg-red-500" : "bg-gray-400";
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
      <div className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
      <span className="text-xs font-body text-foreground flex-1">{label}</span>
      {todayValue && (
        <span className="text-[10px] font-display font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {todayValue} auj.
        </span>
      )}
      <span className="text-xs font-display font-bold text-foreground">{weekValue}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ALERT CARD
// ══════════════════════════════════════════════════════════════════

function AlertCard({ icon: Icon, count, label, color, bgColor }: {
  icon: any; count: number; label: string; color: string; bgColor: string;
}) {
  if (count === 0) return null;
  return (
    <div className={`flex items-center gap-3 rounded-xl p-4 border cursor-pointer hover:shadow-md transition-shadow ${bgColor}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display text-lg font-bold text-foreground">{count}</p>
        <p className="text-xs font-body text-muted-foreground">{label}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════

export default function AdminDashboard() {
  const data = useOverviewData();

  if (data.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Row 1: Financial KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GradientKPI
          icon={Euro}
          label="Revenu total"
          value={`${formatCurrency(data.totalRevenue)} EUR`}
          gradient="bg-gradient-to-br from-green-600 to-emerald-700"
          trend={{ value: data.revenueTrend, label: "vs mois dernier" }}
        />
        <GradientKPI
          icon={BadgePercent}
          label="Commissions gagnees"
          value={`${formatCurrency(data.totalCommissions)} EUR`}
          gradient="bg-gradient-to-br from-blue-600 to-indigo-700"
          trend={{ value: data.commissionsTrend, label: "vs mois dernier" }}
        />
        <GradientKPI
          icon={CreditCard}
          label="Paiements en attente"
          value={`${formatCurrency(data.pendingPayments)} EUR`}
          gradient="bg-gradient-to-br from-amber-500 to-orange-600"
        />
        <GradientKPI
          icon={PackageCheck}
          label="Commandes actives"
          value={`${data.activeOrders}`}
          sub="En production / expediees"
          gradient="bg-gradient-to-br from-purple-600 to-violet-700"
          trend={{ value: data.activeOrdersTrend, label: "vs mois dernier" }}
        />
      </div>

      {/* ── Row 2: Conversion Funnel ── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-display font-bold text-sm mb-4">Entonnoir de conversion</h3>
        <div className="flex items-stretch gap-0 overflow-x-auto">
          <FunnelStep label="Inscriptions" count={data.totalInscriptions} shade="bg-blue-50 dark:bg-blue-950/30" />
          <FunnelStep label="Demandes devis" count={data.totalQuoteRequests} shade="bg-blue-100 dark:bg-blue-900/30" />
          <FunnelStep label="Devis envoyes" count={data.quotesSent} shade="bg-indigo-100 dark:bg-indigo-900/30" />
          <FunnelStep label="Devis acceptes" count={data.quotesAccepted} shade="bg-violet-100 dark:bg-violet-900/30" />
          <FunnelStep label="Commandes" count={data.totalOrdersCount} shade="bg-purple-100 dark:bg-purple-900/30" />
          <FunnelStep label="Livrees" count={data.deliveredOrders} shade="bg-purple-200 dark:bg-purple-800/30" isLast />
        </div>
      </div>

      {/* ── Row 3: Flux entrant / sortant ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Flux entrant */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <h3 className="font-display font-bold text-sm">Flux entrant</h3>
            <span className="text-[10px] font-body text-muted-foreground ml-auto">cette semaine</span>
          </div>
          <div>
            <FluxItem
              label="Nouveaux utilisateurs"
              todayValue={`${data.usersToday}`}
              weekValue={`${data.usersThisWeek} cette sem.`}
              trend={data.usersThisWeekCount > data.usersLastWeek ? "up" : data.usersThisWeekCount < data.usersLastWeek ? "down" : "neutral"}
            />
            <FluxItem
              label="Demandes de devis"
              todayValue={`${data.quotesRequestsToday}`}
              weekValue={`${data.quotesRequestsThisWeek} cette sem.`}
              trend={data.quotesRequestsThisWeekCount > data.quotesRequestsLastWeek ? "up" : data.quotesRequestsThisWeekCount < data.quotesRequestsLastWeek ? "down" : "neutral"}
            />
            <FluxItem
              label="Candidatures partenaires"
              weekValue={`${data.newApplicationsThisWeek} nouvelle${data.newApplicationsThisWeek > 1 ? "s" : ""} / ${data.pendingApplications} en attente`}
              trend={data.pendingApplications > 0 ? "up" : "neutral"}
            />
            <FluxItem
              label="Soumissions produit"
              weekValue={`${data.newSubmissionsThisWeek} nouvelle${data.newSubmissionsThisWeek > 1 ? "s" : ""} / ${data.pendingSubmissions} en attente`}
              trend={data.pendingSubmissions > 0 ? "up" : "neutral"}
            />
          </div>
        </div>

        {/* Flux sortant */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <h3 className="font-display font-bold text-sm">Flux sortant</h3>
            <span className="text-[10px] font-body text-muted-foreground ml-auto">cette semaine</span>
          </div>
          <div>
            <FluxItem
              label="Commandes expediees"
              weekValue={`${data.shippedThisWeek} cette sem.`}
              trend={data.shippedThisWeek > 0 ? "up" : "neutral"}
            />
            <FluxItem
              label="Revenu encaisse"
              weekValue={`${formatCurrency(data.revenueThisWeek)} EUR`}
              trend={data.revenueThisWeek > data.revenueLastWeek ? "up" : data.revenueThisWeek < data.revenueLastWeek ? "down" : "neutral"}
            />
            <FluxItem
              label="Commissions a verser"
              weekValue={`${formatCurrency(data.commissionsToPay)} EUR`}
              trend={data.commissionsToPay > 0 ? "down" : "neutral"}
            />
            <FluxItem
              label="Avis recus"
              weekValue={`${data.ratingsThisWeek} cette sem.`}
              trend={data.ratingsThisWeek > data.ratingsLastWeek ? "up" : data.ratingsThisWeek < data.ratingsLastWeek ? "down" : "neutral"}
            />
          </div>
        </div>
      </div>

      {/* ── Row 4: Activity Timeline ── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-display font-bold text-sm">Activite recente</h3>
        </div>
        {data.recentTimeline.length === 0 ? (
          <p className="text-xs font-body text-muted-foreground py-4">Aucune activite recente.</p>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />
            <div className="space-y-0">
              {data.recentTimeline.map((evt) => (
                <div key={evt.id} className="flex items-start gap-3 py-2 relative">
                  <div className={`w-3.5 h-3.5 rounded-full ${evt.color} shrink-0 mt-0.5 ring-2 ring-background z-10`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-body text-foreground leading-relaxed">{evt.label}</p>
                  </div>
                  <span className="text-[10px] font-display text-muted-foreground shrink-0 mt-0.5">
                    {relativeTime(evt.time)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Row 5: Alerts & Actions ── */}
      {(data.pendingQuoteAssignment > 0 || data.pendingProductReview > 0 || data.pendingPaymentConfirmation > 0 || data.overdueDeliveries > 0) && (
        <div>
          <h3 className="font-display font-bold text-sm mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Actions requises
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <AlertCard
              icon={FileText}
              count={data.pendingQuoteAssignment}
              label="Devis en attente d'assignation"
              color="bg-blue-500"
              bgColor="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
            />
            <AlertCard
              icon={Package}
              count={data.pendingProductReview}
              label="Soumissions produit a valider"
              color="bg-amber-500"
              bgColor="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
            />
            <AlertCard
              icon={Wallet}
              count={data.pendingPaymentConfirmation}
              label="Paiements en attente de confirmation"
              color="bg-emerald-500"
              bgColor="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
            />
            <AlertCard
              icon={Truck}
              count={data.overdueDeliveries}
              label="Commandes en retard de livraison"
              color="bg-red-500"
              bgColor="bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
            />
          </div>
        </div>
      )}
    </div>
  );
}
