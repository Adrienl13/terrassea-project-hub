import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PricingMode = "launch" | "full";

const QUERY_KEY = ["platform_settings", "pricing_visibility_mode"] as const;
const STALE_TIME = 5 * 60 * 1000;

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
