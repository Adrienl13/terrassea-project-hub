import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { COMMISSION_BY_PLAN, type PartnerPlan } from "@/lib/partnerConstants";

export type PricingMode = "launch" | "full";

const QUERY_KEY = ["platform_settings", "pricing_visibility_mode"] as const;
const STALE_TIME = 5 * 60 * 1000;
const DEFAULT_LAUNCH_COMMISSION = 5;

async function fetchPricingMode(): Promise<PricingMode> {
  const { data, error } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "pricing_visibility_mode")
    .maybeSingle();
  if (error) return "full";
  const raw = data?.value;
  const v = typeof raw === "string" ? raw : raw == null ? "" : String(raw);
  return v === "launch" ? "launch" : "full";
}

/**
 * Reads `platform_settings.pricing_visibility_mode`.
 *
 * `launch` hides paid plans (Founding Partner Program era);
 * `full`   restores the standard paid pricing UI.
 *
 * Defaults to `full` so missing config never silently hides revenue surfaces.
 * Returns the resolved mode immediately — see `usePricingModeQuery` if you
 * need the loading/pending state to avoid flashes during the initial fetch.
 *
 * See `docs/strategy/FOUNDING_PROGRAM_ROADMAP.md`.
 */
export function usePricingMode(): PricingMode {
  const { data } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchPricingMode,
    staleTime: STALE_TIME,
  });
  return data ?? "full";
}

/**
 * Same as `usePricingMode` but exposes `isPending` so callers (e.g. the
 * /become-partner router) can hold a spinner until the mode is known and
 * avoid flashing the wrong page.
 */
export function usePricingModeQuery() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchPricingMode,
    staleTime: STALE_TIME,
  });
}

// ── Effective commission rate ────────────────────────────────────────────────

interface CommissionConfig {
  mode: PricingMode;
  launchRate: number;
}

async function fetchCommissionConfig(): Promise<CommissionConfig> {
  const { data } = await supabase
    .from("platform_settings")
    .select("key, value")
    .in("key", ["pricing_visibility_mode", "launch_commission_rate"]);
  let mode: PricingMode = "full";
  let launchRate = DEFAULT_LAUNCH_COMMISSION;
  for (const row of data ?? []) {
    if (row.key === "pricing_visibility_mode") {
      const v = typeof row.value === "string" ? row.value : String(row.value ?? "");
      mode = v === "launch" ? "launch" : "full";
    } else if (row.key === "launch_commission_rate") {
      const n = Number(row.value);
      if (Number.isFinite(n)) launchRate = n;
    }
  }
  return { mode, launchRate };
}

/**
 * Resolves the commission rate (%) actually applied to a partner, honouring the
 * Founding Program launch mode. Source of truth:
 *   - launch mode → `platform_settings.launch_commission_rate` (flat, e.g. 5%),
 *     overriding the native plan rate for every partner (founding era).
 *   - full mode   → the native per-plan rate (`COMMISSION_BY_PLAN`).
 * Use this everywhere a commission is shown to a partner — never read a static
 * per-plan config directly, or the launch rate gets ignored.
 */
export function useEffectiveCommission(plan: PartnerPlan): number {
  const { data } = useQuery({
    queryKey: ["platform_settings", "commission_config"],
    queryFn: fetchCommissionConfig,
    staleTime: STALE_TIME,
  });
  const planRate = COMMISSION_BY_PLAN[plan] ?? 0;
  if (!data) return planRate;
  return data.mode === "launch" ? data.launchRate : planRate;
}
