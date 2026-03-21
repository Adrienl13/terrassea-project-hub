import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────────
export interface MonthlyRevenueEntry {
  month: string;      // "2026-01"
  revenue: number;
  orders: number;
  commissions: number;
}

export interface TopProduct {
  id: string;
  name: string;
  category: string;
  quoteCount: number;
}

export interface TopPartner {
  id: string;
  name: string;
  plan: string;
  revenue: number;
  orderCount: number;
}

export interface RecentOrder {
  id: string;
  productName: string;
  clientEmail: string;
  status: string;
  totalAmount: number;
  createdAt: string;
}

export interface RecentQuote {
  id: string;
  productName: string;
  firstName: string;
  status: string;
  totalPrice: number | null;
  createdAt: string;
}

export type Period = 30 | 90 | 365;

// ── Helper: date N days ago ────────────────────────────────────
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function monthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(1);
  return d.toISOString().slice(0, 7); // "YYYY-MM"
}

// ── Hook ───────────────────────────────────────────────────────
export function useAdminAnalytics() {
  const [period, setPeriod] = useState<Period>(30);

  const periodStart = daysAgo(period);
  const prevPeriodStart = daysAgo(period * 2);

  // ── User profiles ──
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["admin-analytics-users"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("id, user_type, created_at");
      return data || [];
    },
  });

  // ── Partners ──
  const { data: partners = [], isLoading: loadingPartners } = useQuery({
    queryKey: ["admin-analytics-partners"],
    queryFn: async () => {
      const { data } = await supabase
        .from("partners")
        .select("id, name, is_active, plan, created_at");
      return data || [];
    },
  });

  // ── Products ──
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["admin-analytics-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, category, publish_status, created_at");
      return data || [];
    },
  });

  // ── Orders ──
  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ["admin-analytics-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, product_name, client_email, status, total_amount, commission_amount, commission_rate, partner_id, created_at")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // ── Quote requests ──
  const { data: quotes = [], isLoading: loadingQuotes } = useQuery({
    queryKey: ["admin-analytics-quotes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("quote_requests")
        .select("id, product_name, product_id, first_name, status, total_price, created_at")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // ── Project requests ──
  const { data: projectRequests = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["admin-analytics-project-requests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("project_requests")
        .select("id, created_at");
      return data || [];
    },
  });

  const isLoading = loadingUsers || loadingPartners || loadingProducts || loadingOrders || loadingQuotes || loadingProjects;

  // ── Computed analytics ───────────────────────────────────────
  const analytics = useMemo(() => {
    // KPIs
    const totalUsers = users.length;
    const totalPartners = partners.filter((p: any) => p.is_active).length;
    const totalProducts = products.filter((p: any) => p.publish_status === "published").length;
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
    const totalCommissions = orders.reduce((s: number, o: any) => s + Number(o.commission_amount || 0), 0);

    // Trends: current period vs previous period
    const currentPeriodOrders = orders.filter((o: any) => o.created_at >= periodStart);
    const prevPeriodOrders = orders.filter((o: any) => o.created_at >= prevPeriodStart && o.created_at < periodStart);
    const currentPeriodUsers = users.filter((u: any) => u.created_at && u.created_at >= periodStart);
    const prevPeriodUsers = users.filter((u: any) => u.created_at && u.created_at >= prevPeriodStart && u.created_at < periodStart);

    const currentRevenue = currentPeriodOrders.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
    const prevRevenue = prevPeriodOrders.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);

    const trendCalc = (curr: number, prev: number): number => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    const usersTrend = trendCalc(currentPeriodUsers.length, prevPeriodUsers.length);
    const ordersTrend = trendCalc(currentPeriodOrders.length, prevPeriodOrders.length);
    const revenueTrend = trendCalc(currentRevenue, prevRevenue);

    // Top products by quote count
    const productQuoteCounts: Record<string, { name: string; category: string; count: number }> = {};
    quotes.forEach((q: any) => {
      const key = q.product_id || q.product_name || "unknown";
      if (!productQuoteCounts[key]) {
        productQuoteCounts[key] = { name: q.product_name || "—", category: "", count: 0 };
      }
      productQuoteCounts[key].count++;
    });
    // Enrich with product category
    Object.entries(productQuoteCounts).forEach(([key, val]) => {
      const prod = products.find((p: any) => p.id === key || p.name === val.name);
      if (prod) val.category = (prod as any).category || "";
    });
    const topProducts: TopProduct[] = Object.entries(productQuoteCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([id, v]) => ({ id, name: v.name, category: v.category, quoteCount: v.count }));

    // Top partners by revenue
    const partnerRevenueMap: Record<string, { revenue: number; orderCount: number }> = {};
    orders.forEach((o: any) => {
      if (!o.partner_id) return;
      if (!partnerRevenueMap[o.partner_id]) partnerRevenueMap[o.partner_id] = { revenue: 0, orderCount: 0 };
      partnerRevenueMap[o.partner_id].revenue += Number(o.total_amount || 0);
      partnerRevenueMap[o.partner_id].orderCount++;
    });
    const topPartners: TopPartner[] = Object.entries(partnerRevenueMap)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(([id, v]) => {
        const p = partners.find((p: any) => p.id === id);
        return { id, name: p?.name || "—", plan: (p as any)?.plan || "—", revenue: v.revenue, orderCount: v.orderCount };
      });

    // Recent orders (last 10)
    const recentOrders: RecentOrder[] = orders.slice(0, 10).map((o: any) => ({
      id: o.id,
      productName: o.product_name,
      clientEmail: o.client_email,
      status: o.status,
      totalAmount: Number(o.total_amount || 0),
      createdAt: o.created_at,
    }));

    // Recent quotes (last 10)
    const recentQuotes: RecentQuote[] = quotes.slice(0, 10).map((q: any) => ({
      id: q.id,
      productName: q.product_name || "—",
      firstName: q.first_name || "—",
      status: q.status || "pending",
      totalPrice: q.total_price ? Number(q.total_price) : null,
      createdAt: q.created_at,
    }));

    // Status breakdowns
    const ordersByStatus: Record<string, number> = {};
    orders.forEach((o: any) => { ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1; });

    const quotesByStatus: Record<string, number> = {};
    quotes.forEach((q: any) => {
      const st = q.status || "pending";
      quotesByStatus[st] = (quotesByStatus[st] || 0) + 1;
    });

    const usersByType: Record<string, number> = {};
    users.forEach((u: any) => {
      usersByType[u.user_type] = (usersByType[u.user_type] || 0) + 1;
    });

    // Monthly revenue (last 12 months)
    const last12 = monthsAgo(12);
    const monthlyMap: Record<string, { revenue: number; orders: number; commissions: number }> = {};
    // Pre-fill last 12 months
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      monthlyMap[key] = { revenue: 0, orders: 0, commissions: 0 };
    }
    orders.forEach((o: any) => {
      const m = o.created_at?.slice(0, 7);
      if (m && m >= last12 && monthlyMap[m]) {
        monthlyMap[m].revenue += Number(o.total_amount || 0);
        monthlyMap[m].orders++;
        monthlyMap[m].commissions += Number(o.commission_amount || 0);
      }
    });
    const monthlyRevenue: MonthlyRevenueEntry[] = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));

    return {
      totalUsers,
      totalPartners,
      totalProducts,
      totalOrders,
      totalRevenue,
      totalCommissions,
      usersTrend,
      ordersTrend,
      revenueTrend,
      topProducts,
      topPartners,
      recentOrders,
      recentQuotes,
      ordersByStatus,
      quotesByStatus,
      usersByType,
      monthlyRevenue,
    };
  }, [users, partners, products, orders, quotes, projectRequests, periodStart, prevPeriodStart]);

  return {
    ...analytics,
    isLoading,
    period,
    setPeriod,
  };
}
