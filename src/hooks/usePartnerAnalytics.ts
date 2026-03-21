import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ── Tier Types & Config ─────────────────────────────────────────────────────

export type PartnerTier = "growth" | "elite" | "elite_prestige";

export interface TierConfig {
  key: PartnerTier;
  name: string;
  nameKey: string;
  commission: number;
  maxProducts: number | null;
  featuredProducts: number;
  hasAdvancedAnalytics: boolean;
  hasProLeads: boolean;
  hasCsvExport: boolean;
  hasPrioritySupport: boolean;
  hasDedicatedManager: boolean;
  hasCoBranding: boolean;
  color: string;
  icon: string;
}

export const TIER_CONFIG: Record<PartnerTier, TierConfig> = {
  growth: {
    key: "growth",
    name: "Growth",
    nameKey: "partnerTiers.growth",
    commission: 5,
    maxProducts: 50,
    featuredProducts: 2,
    hasAdvancedAnalytics: false,
    hasProLeads: false,
    hasCsvExport: false,
    hasPrioritySupport: false,
    hasDedicatedManager: false,
    hasCoBranding: false,
    color: "blue",
    icon: "Zap",
  },
  elite: {
    key: "elite",
    name: "Elite",
    nameKey: "partnerTiers.elite",
    commission: 3,
    maxProducts: 200,
    featuredProducts: 10,
    hasAdvancedAnalytics: true,
    hasProLeads: true,
    hasCsvExport: true,
    hasPrioritySupport: true,
    hasDedicatedManager: false,
    hasCoBranding: false,
    color: "amber",
    icon: "Crown",
  },
  elite_prestige: {
    key: "elite_prestige",
    name: "Elite Prestige",
    nameKey: "partnerTiers.elitePrestige",
    commission: 2,
    maxProducts: null,
    featuredProducts: 25,
    hasAdvancedAnalytics: true,
    hasProLeads: true,
    hasCsvExport: true,
    hasPrioritySupport: true,
    hasDedicatedManager: true,
    hasCoBranding: true,
    color: "purple",
    icon: "Gem",
  },
};

const TIER_ORDER: PartnerTier[] = ["growth", "elite", "elite_prestige"];

// ── Helper ──────────────────────────────────────────────────────────────────

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// ── Analytics Types ─────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  totalViews: number;
  totalQuotes: number;
  totalOrders: number;
  totalRevenue: number;
  avgConversionRate: number;
  avgResponseTime: number;
}

export interface AnalyticsTrends {
  views: number;
  quotes: number;
  orders: number;
  revenue: number;
  conversionRate: number;
  responseTime: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  quoteCount: number;
}

// ── Hook 1: usePartnerAnalytics ─────────────────────────────────────────────

export function usePartnerAnalytics(partnerId: string | undefined) {
  const [period, setPeriod] = useState<30 | 90 | 365>(30);

  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ["partner-analytics", partnerId, period],
    enabled: !!partnerId,
    queryFn: async (): Promise<{
      current: AnalyticsSummary;
      trends: AnalyticsTrends;
    }> => {
      const currentStart = daysAgo(period);
      const previousStart = daysAgo(period * 2);

      // Fetch current period
      const { data: currentRows, error: errCurrent } = await supabase
        .from("partner_analytics")
        .select("*")
        .eq("partner_id", partnerId!)
        .gte("period_date", currentStart);

      if (errCurrent) throw errCurrent;

      // Fetch previous period for trend comparison
      const { data: previousRows, error: errPrevious } = await supabase
        .from("partner_analytics")
        .select("*")
        .eq("partner_id", partnerId!)
        .gte("period_date", previousStart)
        .lt("period_date", currentStart);

      if (errPrevious) throw errPrevious;

      const summarize = (
        rows: typeof currentRows
      ): AnalyticsSummary => {
        if (!rows || rows.length === 0) {
          return {
            totalViews: 0,
            totalQuotes: 0,
            totalOrders: 0,
            totalRevenue: 0,
            avgConversionRate: 0,
            avgResponseTime: 0,
          };
        }
        const totalViews = rows.reduce((s, r) => s + (r.views ?? 0), 0);
        const totalQuotes = rows.reduce(
          (s, r) => s + (r.quote_requests ?? 0),
          0
        );
        const totalOrders = rows.reduce(
          (s, r) => s + (r.orders_count ?? 0),
          0
        );
        const totalRevenue = rows.reduce(
          (s, r) => s + (r.orders_value ?? 0),
          0
        );
        const conversionRates = rows
          .filter((r) => r.conversion_rate != null)
          .map((r) => r.conversion_rate!);
        const avgConversionRate =
          conversionRates.length > 0
            ? conversionRates.reduce((s, v) => s + v, 0) /
              conversionRates.length
            : 0;
        const responseTimes = rows
          .filter((r) => r.avg_response_hours != null)
          .map((r) => r.avg_response_hours!);
        const avgResponseTime =
          responseTimes.length > 0
            ? responseTimes.reduce((s, v) => s + v, 0) / responseTimes.length
            : 0;

        return {
          totalViews,
          totalQuotes,
          totalOrders,
          totalRevenue,
          avgConversionRate: Math.round(avgConversionRate * 100) / 100,
          avgResponseTime: Math.round(avgResponseTime * 10) / 10,
        };
      };

      const current = summarize(currentRows);
      const previous = summarize(previousRows);

      const trends: AnalyticsTrends = {
        views: pctChange(current.totalViews, previous.totalViews),
        quotes: pctChange(current.totalQuotes, previous.totalQuotes),
        orders: pctChange(current.totalOrders, previous.totalOrders),
        revenue: pctChange(current.totalRevenue, previous.totalRevenue),
        conversionRate: pctChange(
          current.avgConversionRate,
          previous.avgConversionRate
        ),
        responseTime: pctChange(
          current.avgResponseTime,
          previous.avgResponseTime
        ),
      };

      return { current, trends };
    },
  });

  // Top products from quote_requests
  const { data: topProducts, isLoading: isLoadingTop } = useQuery({
    queryKey: ["partner-top-products", partnerId, period],
    enabled: !!partnerId,
    queryFn: async (): Promise<TopProduct[]> => {
      const since = daysAgo(period);

      const { data, error } = await supabase
        .from("quote_requests")
        .select("product_id, product_name")
        .eq("partner_id", partnerId!)
        .gte("created_at", since)
        .not("product_id", "is", null);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Group by product_id
      const counts = new Map<
        string,
        { productId: string; productName: string; quoteCount: number }
      >();
      for (const row of data) {
        if (!row.product_id) continue;
        const existing = counts.get(row.product_id);
        if (existing) {
          existing.quoteCount++;
        } else {
          counts.set(row.product_id, {
            productId: row.product_id,
            productName: row.product_name ?? "Unknown",
            quoteCount: 1,
          });
        }
      }

      return Array.from(counts.values())
        .sort((a, b) => b.quoteCount - a.quoteCount)
        .slice(0, 5);
    },
  });

  return {
    analytics: analytics?.current ?? null,
    trends: analytics?.trends ?? null,
    topProducts: topProducts ?? [],
    isLoading: isLoadingAnalytics || isLoadingTop,
    period,
    setPeriod,
  };
}

// ── Loyalty Types ───────────────────────────────────────────────────────────

export interface LoyaltyRecord {
  id: string;
  partnerId: string;
  lifetimePoints: number;
  pointsBalance: number;
  tier: string | null;
  tierLockedUntil: string | null;
}

export interface PointsHistoryEntry {
  id: string;
  action: string;
  points: number;
  description: string | null;
  referenceId: string | null;
  createdAt: string;
}

interface LoyaltyThresholds {
  elite: number;
  elite_prestige: number;
}

const DEFAULT_THRESHOLDS: LoyaltyThresholds = {
  elite: 5000,
  elite_prestige: 20000,
};

// ── Hook 2: usePartnerLoyalty ───────────────────────────────────────────────

export function usePartnerLoyalty(partnerId: string | undefined) {
  // Loyalty record
  const { data: loyalty, isLoading: isLoadingLoyalty } = useQuery({
    queryKey: ["partner-loyalty", partnerId],
    enabled: !!partnerId,
    queryFn: async (): Promise<LoyaltyRecord | null> => {
      const { data, error } = await supabase
        .from("partner_loyalty")
        .select("*")
        .eq("partner_id", partnerId!)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        partnerId: data.partner_id,
        lifetimePoints: data.lifetime_points ?? 0,
        pointsBalance: data.points_balance ?? 0,
        tier: data.tier,
        tierLockedUntil: data.tier_locked_until,
      };
    },
  });

  // Points history
  const { data: history, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["partner-points-history", partnerId],
    enabled: !!partnerId,
    queryFn: async (): Promise<PointsHistoryEntry[]> => {
      const { data, error } = await supabase
        .from("partner_points_history")
        .select("*")
        .eq("partner_id", partnerId!)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      return (data ?? []).map((row) => ({
        id: row.id,
        action: row.action,
        points: row.points,
        description: row.description,
        referenceId: row.reference_id,
        createdAt: row.created_at ?? "",
      }));
    },
  });

  // Platform settings for loyalty config
  const { data: loyaltySettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["platform-settings-loyalty"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("key, value")
        .eq("category", "loyalty");

      if (error) throw error;
      return data ?? [];
    },
  });

  // Derive loyalty config
  const isEnabled =
    loyaltySettings?.find((s) => s.key === "loyalty_enabled")?.value === true;

  const thresholds: LoyaltyThresholds = (() => {
    const raw = loyaltySettings?.find(
      (s) => s.key === "loyalty_thresholds"
    )?.value;
    if (
      raw &&
      typeof raw === "object" &&
      !Array.isArray(raw) &&
      "elite" in raw &&
      "elite_prestige" in raw
    ) {
      return {
        elite: Number((raw as Record<string, unknown>).elite) || DEFAULT_THRESHOLDS.elite,
        elite_prestige:
          Number((raw as Record<string, unknown>).elite_prestige) || DEFAULT_THRESHOLDS.elite_prestige,
      };
    }
    return DEFAULT_THRESHOLDS;
  })();

  // Compute tier from lifetime points
  const lifetimePoints = loyalty?.lifetimePoints ?? 0;

  const currentTier: PartnerTier =
    lifetimePoints >= thresholds.elite_prestige
      ? "elite_prestige"
      : lifetimePoints >= thresholds.elite
        ? "elite"
        : "growth";

  const nextTier: PartnerTier | null =
    currentTier === "elite_prestige"
      ? null
      : currentTier === "elite"
        ? "elite_prestige"
        : "elite";

  const pointsToNextTier: number | null = (() => {
    if (currentTier === "elite_prestige") return null;
    const target =
      currentTier === "elite"
        ? thresholds.elite_prestige
        : thresholds.elite;
    return Math.max(0, target - lifetimePoints);
  })();

  const tierProgress: number = (() => {
    if (currentTier === "elite_prestige") return 100;

    const currentThreshold =
      currentTier === "elite" ? thresholds.elite : 0;
    const nextThreshold =
      currentTier === "elite"
        ? thresholds.elite_prestige
        : thresholds.elite;

    const range = nextThreshold - currentThreshold;
    if (range <= 0) return 100;

    const progress = lifetimePoints - currentThreshold;
    return Math.min(100, Math.max(0, Math.round((progress / range) * 100)));
  })();

  return {
    loyalty,
    history: history ?? [],
    isEnabled: isEnabled ?? false,
    currentTier,
    nextTier,
    pointsToNextTier,
    tierProgress,
    isLoading: isLoadingLoyalty || isLoadingHistory || isLoadingSettings,
  };
}

// ── Hook 3: usePartnerTierConfig ────────────────────────────────────────────

export function usePartnerTierConfig(partnerId: string | undefined) {
  const { currentTier: loyaltyTier, isLoading: isLoadingLoyalty } =
    usePartnerLoyalty(partnerId);

  const { data: partner, isLoading: isLoadingPartner } = useQuery({
    queryKey: ["partner-plan", partnerId],
    enabled: !!partnerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("plan")
        .eq("id", partnerId!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const subscriptionPlan: PartnerTier = (() => {
    const plan = partner?.plan;
    if (plan === "elite_prestige" || plan === "elite" || plan === "growth") {
      return plan;
    }
    return "growth";
  })();

  // Effective tier = higher of subscription plan or loyalty tier
  const subIndex = TIER_ORDER.indexOf(subscriptionPlan);
  const loyaltyIndex = TIER_ORDER.indexOf(loyaltyTier);
  const effectiveTier = TIER_ORDER[Math.max(subIndex, loyaltyIndex)];

  const config = TIER_CONFIG[effectiveTier];

  return {
    effectiveTier,
    config,
    subscriptionPlan,
    loyaltyTier,
    isLoading: isLoadingLoyalty || isLoadingPartner,
  };
}
