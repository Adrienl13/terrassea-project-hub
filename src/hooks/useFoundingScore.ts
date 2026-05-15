// Hook for Vague 2 Founding Partner Tracking (Dette 108 Session 2).
//
// Lit :
//   - founding_partner_scores (view RLS-héritée : partner read own, admin all)
//   - founding_actions (event log, RLS partner read own, admin all)
//   - platform_settings.founding_tiers_config (jsonb : seuils + catalogue 15 actions)
//
// Dérive :
//   - nextTier (founder → silver → gold → platinum)
//   - pointsToNextTier
//   - tierProgress (% de progression dans le palier courant)
//
// Pour le badge public (page partner publique), utiliser get_partner_founding_tier
// RPC (SECURITY DEFINER, anonyme OK) — voir useFoundingBadge ci-dessous.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FoundingTier = "founder" | "silver" | "gold" | "platinum";

export const FOUNDING_TIER_ORDER: FoundingTier[] = ["founder", "silver", "gold", "platinum"];

export interface FoundingScore {
  partnerId: string;
  partnerName: string;
  slug: string | null;
  isFounding: boolean;
  foundingJoinedAt: string | null;
  totalPoints: number;
  actionsCount: number;
  tier: FoundingTier;
}

export interface FoundingAction {
  id: string;
  actionType: string;
  points: number;
  referenceId: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
}

export interface FoundingActionConfig {
  points: number;
  category: "onboarding" | "transaction" | "invitation" | "co_dev" | "milestone";
  one_shot: boolean;
  active: boolean;
  deferred_to?: string;
}

export interface FoundingTiersConfig {
  thresholds: Record<FoundingTier, number>;
  actions: Record<string, FoundingActionConfig>;
}

export function useFoundingScore(partnerId: string | undefined) {
  const { data: score, isLoading: loadingScore } = useQuery({
    queryKey: ["founding-score", partnerId],
    enabled: !!partnerId,
    queryFn: async (): Promise<FoundingScore | null> => {
      const { data, error } = await supabase
        .from("founding_partner_scores")
        .select("partner_id, partner_name, slug, is_founding, founding_joined_at, total_points, actions_count, tier")
        .eq("partner_id", partnerId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        partnerId: data.partner_id as string,
        partnerName: data.partner_name as string,
        slug: data.slug as string | null,
        isFounding: data.is_founding as boolean,
        foundingJoinedAt: data.founding_joined_at as string | null,
        totalPoints: (data.total_points as number) ?? 0,
        actionsCount: (data.actions_count as number) ?? 0,
        tier: data.tier as FoundingTier,
      };
    },
  });

  const { data: history } = useQuery({
    queryKey: ["founding-history", partnerId],
    enabled: !!partnerId,
    queryFn: async (): Promise<FoundingAction[]> => {
      const { data, error } = await supabase
        .from("founding_actions")
        .select("id, action_type, points, reference_id, meta, created_at")
        .eq("partner_id", partnerId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id as string,
        actionType: row.action_type as string,
        points: row.points as number,
        referenceId: (row.reference_id as string) ?? null,
        meta: (row.meta as Record<string, unknown>) ?? {},
        createdAt: (row.created_at as string) ?? "",
      }));
    },
  });

  const { data: config } = useQuery({
    queryKey: ["founding-tiers-config"],
    queryFn: async (): Promise<FoundingTiersConfig | null> => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "founding_tiers_config")
        .maybeSingle();
      if (error) throw error;
      return (data?.value as FoundingTiersConfig) ?? null;
    },
    staleTime: 30 * 60_000,
  });

  const nextTier: FoundingTier | null = (() => {
    if (!score) return null;
    const i = FOUNDING_TIER_ORDER.indexOf(score.tier);
    return i >= 0 && i < FOUNDING_TIER_ORDER.length - 1 ? FOUNDING_TIER_ORDER[i + 1] : null;
  })();

  const pointsToNextTier: number | null = (() => {
    if (!score || !config || !nextTier) return null;
    const target = config.thresholds[nextTier] ?? Number.POSITIVE_INFINITY;
    return Math.max(0, target - score.totalPoints);
  })();

  const tierProgress: number = (() => {
    if (!score || !config) return 0;
    if (score.tier === "platinum") return 100;
    const currentThreshold = config.thresholds[score.tier] ?? 0;
    const next = nextTier ? config.thresholds[nextTier] : score.totalPoints;
    const range = next - currentThreshold;
    if (range <= 0) return 100;
    const progress = score.totalPoints - currentThreshold;
    return Math.min(100, Math.max(0, Math.round((progress / range) * 100)));
  })();

  return {
    score,
    history: history ?? [],
    config: config ?? null,
    nextTier,
    pointsToNextTier,
    tierProgress,
    isLoading: loadingScore,
  };
}

// Public badge — utilise la RPC SECURITY DEFINER, accessible aux anon.
export function useFoundingBadge(partnerId: string | undefined) {
  return useQuery({
    queryKey: ["founding-badge", partnerId],
    enabled: !!partnerId,
    queryFn: async (): Promise<{ tier: FoundingTier; isFounding: true; foundingJoinedAt: string } | null> => {
      const { data, error } = await supabase.rpc("get_partner_founding_tier", { p_partner_id: partnerId! });
      if (error) throw error;
      if (!data) return null;
      const payload = data as { tier?: string; is_founding?: boolean; founding_joined_at?: string };
      if (!payload.is_founding || !payload.tier) return null;
      return {
        tier: payload.tier as FoundingTier,
        isFounding: true,
        foundingJoinedAt: payload.founding_joined_at ?? "",
      };
    },
    staleTime: 5 * 60_000,
  });
}
