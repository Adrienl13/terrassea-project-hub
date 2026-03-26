import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ── Tier Types & Config ─────────────────────────────────────────────────────

export type PartnerTier = "starter" | "growth" | "elite" | "brand_member" | "brand_network";

export interface TierConfig {
  key: PartnerTier;
  name: string;
  nameKey: string;
  monthlyPrice: number; // €/month HT
  annualPrice: number | null; // €/year HT (-15%)
  commission: number; // %
  engagement: string; // "none" | "6_months" | "12_months"
  maxProducts: number;
  maxCategories: number | null; // null = all
  featuredProducts: number;
  searchPriority: "standard" | "high" | "maximum";
  hasAdvancedAnalytics: boolean;
  hasPremiumAnalytics: boolean;
  hasProLeads: boolean;
  proLeadsPriority: "standard" | "priority" | "exclusive_48h";
  hasCsvExport: boolean;
  hasApiExport: boolean;
  hasRealtimeApi: boolean;
  hasPrioritySupport: boolean;
  hasDedicatedManager: boolean;
  hasSharedManager: boolean;
  hasCoBranding: boolean;
  hasBetaAccess: boolean;
  hasMultiUsers: boolean;
  maxUsers: number;
  socialPosts: number; // per month
  videoRelays: number; // per month
  sponsoredBanners: number; // per month
  onboardingType: "self_service" | "assisted_10" | "full_integration";
  stockSync: "csv_manual" | "csv_auto" | "api_realtime";
  brandPageType: "basic" | "gallery" | "gallery_video";
  badge: string; // "" | "verified" | "elite" | "brand_member" | "brand_network"
  marketReport: "none" | "quarterly" | "monthly";
  color: string;
  icon: string;
}

export const TIER_CONFIG: Record<PartnerTier, TierConfig> = {
  starter: {
    key: "starter", name: "Starter", nameKey: "partnerTiers.starter",
    monthlyPrice: 0, annualPrice: null, commission: 8, engagement: "none",
    maxProducts: 30, maxCategories: 2, featuredProducts: 0,
    searchPriority: "standard",
    hasAdvancedAnalytics: false, hasPremiumAnalytics: false,
    hasProLeads: true, proLeadsPriority: "standard",
    hasCsvExport: true, hasApiExport: false, hasRealtimeApi: false,
    hasPrioritySupport: false, hasDedicatedManager: false, hasSharedManager: false,
    hasCoBranding: false, hasBetaAccess: false, hasMultiUsers: false, maxUsers: 1,
    socialPosts: 0, videoRelays: 0, sponsoredBanners: 0,
    onboardingType: "self_service", stockSync: "csv_manual",
    brandPageType: "basic", badge: "", marketReport: "none",
    color: "slate", icon: "Shield",
  },
  growth: {
    key: "growth", name: "Growth", nameKey: "partnerTiers.growth",
    monthlyPrice: 249, annualPrice: 2540, commission: 5, engagement: "6_months",
    maxProducts: 50, maxCategories: 3, featuredProducts: 0,
    searchPriority: "standard",
    hasAdvancedAnalytics: true, hasPremiumAnalytics: false,
    hasProLeads: true, proLeadsPriority: "standard",
    hasCsvExport: true, hasApiExport: false, hasRealtimeApi: false,
    hasPrioritySupport: false, hasDedicatedManager: false, hasSharedManager: false,
    hasCoBranding: false, hasBetaAccess: false, hasMultiUsers: false, maxUsers: 1,
    socialPosts: 0, videoRelays: 0, sponsoredBanners: 0,
    onboardingType: "self_service", stockSync: "csv_manual",
    brandPageType: "basic", badge: "verified", marketReport: "none",
    color: "blue", icon: "Zap",
  },
  elite: {
    key: "elite", name: "Elite", nameKey: "partnerTiers.elite",
    monthlyPrice: 499, annualPrice: 5090, commission: 3.5, engagement: "6_months",
    maxProducts: 150, maxCategories: null, featuredProducts: 15,
    searchPriority: "high",
    hasAdvancedAnalytics: true, hasPremiumAnalytics: false,
    hasProLeads: true, proLeadsPriority: "priority",
    hasCsvExport: true, hasApiExport: true, hasRealtimeApi: false,
    hasPrioritySupport: true, hasDedicatedManager: false, hasSharedManager: true,
    hasCoBranding: true, hasBetaAccess: true, hasMultiUsers: false, maxUsers: 1,
    socialPosts: 2, videoRelays: 1, sponsoredBanners: 1,
    onboardingType: "assisted_10", stockSync: "csv_auto",
    brandPageType: "gallery", badge: "elite", marketReport: "quarterly",
    color: "amber", icon: "Crown",
  },
  brand_member: {
    key: "brand_member", name: "Brand Member", nameKey: "partnerTiers.brandMember",
    monthlyPrice: 799, annualPrice: 8150, commission: 2, engagement: "12_months",
    maxProducts: 999, maxCategories: null, featuredProducts: 0,
    searchPriority: "maximum",
    hasAdvancedAnalytics: true, hasPremiumAnalytics: true,
    hasProLeads: true, proLeadsPriority: "exclusive_48h",
    hasCsvExport: true, hasApiExport: true, hasRealtimeApi: true,
    hasPrioritySupport: true, hasDedicatedManager: true, hasSharedManager: false,
    hasCoBranding: true, hasBetaAccess: true, hasMultiUsers: true, maxUsers: 3,
    socialPosts: 4, videoRelays: 3, sponsoredBanners: 3,
    onboardingType: "full_integration", stockSync: "api_realtime",
    brandPageType: "gallery_video", badge: "brand_member", marketReport: "monthly",
    color: "purple", icon: "Crown",
  },
  brand_network: {
    key: "brand_network", name: "Brand Network", nameKey: "partnerTiers.brandNetwork",
    monthlyPrice: 1299, annualPrice: 13250, commission: 1.5, engagement: "12_months",
    maxProducts: 999, maxCategories: null, featuredProducts: 0,
    searchPriority: "maximum",
    hasAdvancedAnalytics: true, hasPremiumAnalytics: true,
    hasProLeads: true, proLeadsPriority: "exclusive_48h",
    hasCsvExport: true, hasApiExport: true, hasRealtimeApi: true,
    hasPrioritySupport: true, hasDedicatedManager: true, hasSharedManager: false,
    hasCoBranding: true, hasBetaAccess: true, hasMultiUsers: true, maxUsers: 5,
    socialPosts: 6, videoRelays: 4, sponsoredBanners: 4,
    onboardingType: "full_integration", stockSync: "api_realtime",
    brandPageType: "gallery_video", badge: "brand_network", marketReport: "monthly",
    color: "violet", icon: "Crown",
  },
};

const TIER_ORDER: PartnerTier[] = ["starter", "growth", "elite", "brand_member", "brand_network"];

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
  growth: number;
  elite: number;
}

const DEFAULT_THRESHOLDS: LoyaltyThresholds = {
  growth: 2000,
  elite: 5000,
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
      "growth" in raw &&
      "elite" in raw
    ) {
      return {
        growth: Number((raw as Record<string, unknown>).growth) || DEFAULT_THRESHOLDS.growth,
        elite: Number((raw as Record<string, unknown>).elite) || DEFAULT_THRESHOLDS.elite,
      };
    }
    return DEFAULT_THRESHOLDS;
  })();

  // Compute tier from lifetime points
  const lifetimePoints = loyalty?.lifetimePoints ?? 0;

  // Loyalty tier progression only applies to catalogue plans (starter→growth→elite)
  const currentTier: PartnerTier =
    lifetimePoints >= thresholds.elite
      ? "elite"
      : lifetimePoints >= thresholds.growth
        ? "growth"
        : "starter";

  const nextTier: PartnerTier | null =
    currentTier === "elite"
      ? null
      : currentTier === "growth"
        ? "elite"
        : "growth";

  const pointsToNextTier: number | null = (() => {
    if (currentTier === "elite") return null;
    const target =
      currentTier === "growth"
        ? thresholds.elite
        : thresholds.growth;
    return Math.max(0, target - lifetimePoints);
  })();

  const tierProgress: number = (() => {
    if (currentTier === "elite") return 100;

    const currentThreshold =
      currentTier === "growth"
        ? thresholds.growth
        : 0;
    const nextThreshold =
      currentTier === "growth"
        ? thresholds.elite
        : thresholds.growth;

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

  // Admin setting: auto tier upgrade from loyalty points
  const { data: autoUpgradeSetting } = useQuery({
    queryKey: ["setting-auto-tier-upgrade"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "partner_auto_tier_upgrade")
        .maybeSingle();
      return data?.value === "true";
    },
    staleTime: 1000 * 60 * 10,
  });
  const autoUpgradeEnabled = autoUpgradeSetting ?? false;

  const subscriptionPlan: PartnerTier = (() => {
    const plan = partner?.plan;
    if (plan === "elite" || plan === "growth" || plan === "starter" || plan === "brand_member" || plan === "brand_network") {
      return plan;
    }
    return "starter";
  })();

  // Effective tier:
  // - If auto-upgrade enabled by admin: higher of subscription OR loyalty tier
  // - If auto-upgrade disabled (default): subscription plan ONLY
  //   Loyalty tier is shown as "eligible" but does NOT grant features
  const effectiveTier = autoUpgradeEnabled
    ? TIER_ORDER[Math.max(TIER_ORDER.indexOf(subscriptionPlan), TIER_ORDER.indexOf(loyaltyTier))]
    : subscriptionPlan;

  // Check if partner is eligible for a higher tier via loyalty
  const loyaltyIndex = TIER_ORDER.indexOf(loyaltyTier);
  const subIndex = TIER_ORDER.indexOf(subscriptionPlan);
  const isEligibleForUpgrade = loyaltyIndex > subIndex && !autoUpgradeEnabled;
  const eligibleTier = isEligibleForUpgrade ? loyaltyTier : null;

  const config = TIER_CONFIG[effectiveTier];

  return {
    effectiveTier,
    config,
    subscriptionPlan,
    loyaltyTier,
    autoUpgradeEnabled,
    isEligibleForUpgrade,
    eligibleTier,
    isLoading: isLoadingLoyalty || isLoadingPartner,
  };
}
