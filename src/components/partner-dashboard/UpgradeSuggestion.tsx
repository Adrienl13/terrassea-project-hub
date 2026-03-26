import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Sparkles, ArrowRight, Package, Percent } from "lucide-react";

// ── Plan config (matching AdminSubscriptions) ─────────────────────────────────

const CATALOGUE_ORDER = ["starter", "growth", "elite"] as const;
const BRAND_ORDER = ["brand_member", "brand_network"] as const;
const ALL_PLANS = [...CATALOGUE_ORDER, ...BRAND_ORDER] as const;
type PlanKey = (typeof ALL_PLANS)[number];

const PLAN_META: Record<PlanKey, { label: string; commission: number; maxProducts: number; maxFeatured: number; color: string }> = {
  starter:       { label: "Starter",       commission: 8,   maxProducts: 30,  maxFeatured: 0,  color: "#6B7280" },
  growth:        { label: "Growth",        commission: 5,   maxProducts: 50,  maxFeatured: 0,  color: "#2563EB" },
  elite:         { label: "Elite",         commission: 3.5, maxProducts: 150, maxFeatured: 15, color: "#D4603A" },
  brand_member:  { label: "Brand Member",  commission: 2,   maxProducts: 999, maxFeatured: 0,  color: "#7C3AED" },
  brand_network: { label: "Brand Network", commission: 1.5, maxProducts: 999, maxFeatured: 0,  color: "#6D28D9" },
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  partnerId: string;
  currentPlan: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function UpgradeSuggestion({ partnerId, currentPlan }: Props) {
  const navigate = useNavigate();

  const isBrand = currentPlan === "brand_member" || currentPlan === "brand_network";
  const ORDER = isBrand ? BRAND_ORDER : CATALOGUE_ORDER;
  const planKey = ((ORDER as readonly string[]).includes(currentPlan) ? currentPlan : ORDER[0]) as PlanKey;
  const planIndex = (ORDER as readonly string[]).indexOf(planKey);
  const nextPlanKey = planIndex < ORDER.length - 1 ? ORDER[planIndex + 1] as PlanKey : null;

  // Already at highest plan
  if (!nextPlanKey) return null;

  const currentMeta = PLAN_META[planKey];
  const nextMeta = PLAN_META[nextPlanKey];

  // Fetch product count and recent commission spend
  const { data } = useQuery({
    queryKey: ["upgrade-suggestion", partnerId],
    enabled: !!partnerId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // Count partner's published products
      const { count: productCount } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("partner_id", partnerId);

      // Get recent orders to compute commission savings
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data: recentOrders } = await supabase
        .from("orders")
        .select("total_amount, commission_rate")
        .eq("partner_id", partnerId)
        .gte("created_at", thirtyDaysAgo)
        .in("status", ["completed", "delivered", "deposit_paid", "in_production", "shipped"]);

      let totalCommissionPaid = 0;
      let totalRevenue = 0;
      for (const o of recentOrders || []) {
        const amount = Number(o.total_amount || 0);
        const rate = Number(o.commission_rate || currentMeta.commission);
        totalRevenue += amount;
        totalCommissionPaid += amount * (rate / 100);
      }

      // How much they would save with the next plan's commission rate
      const hypotheticalCommission = totalRevenue * (nextMeta.commission / 100);
      const potentialSavings = Math.max(0, totalCommissionPaid - hypotheticalCommission);

      return {
        productCount: productCount || 0,
        totalRevenue,
        potentialSavings: Math.round(potentialSavings),
      };
    },
  });

  const productCount = data?.productCount ?? 0;
  const potentialSavings = data?.potentialSavings ?? 0;

  // Determine which messages to show
  const messages: { icon: any; text: string; highlight?: boolean }[] = [];

  // Commission savings message
  if (potentialSavings > 0) {
    messages.push({
      icon: Percent,
      text: `Avec le plan ${nextMeta.label}, vous auriez \u00e9conomis\u00e9 ${potentialSavings}\u20AC ce mois-ci en commissions.`,
      highlight: true,
    });
  }

  // Product limit proximity
  const productLimit = currentMeta.maxProducts;
  const usagePercent = productLimit > 0 ? (productCount / productLimit) * 100 : 0;
  if (usagePercent >= 70) {
    messages.push({
      icon: Package,
      text: `Vous avez ${productCount} produits sur ${productLimit} max \u2014 passez \u00e0 ${nextMeta.label} pour ${nextMeta.maxProducts} produits.`,
    });
  }

  // If no actionable message, don't render
  if (messages.length === 0) return null;

  return (
    <div className="border border-dashed rounded-xl p-4 space-y-3" style={{ borderColor: `${nextMeta.color}60`, background: `${nextMeta.color}06` }}>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${nextMeta.color}15` }}>
          <Sparkles className="h-4 w-4" style={{ color: nextMeta.color }} />
        </div>
        <div>
          <p className="text-xs font-display font-bold" style={{ color: nextMeta.color }}>
            Passez au plan {nextMeta.label}
          </p>
          <p className="text-[9px] font-body text-muted-foreground">
            D\u00e9bloquez plus de fonctionnalit\u00e9s et r\u00e9duisez vos commissions
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {messages.map((msg, i) => (
          <div key={i} className="flex items-start gap-2">
            <msg.icon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
            <p className={`text-[11px] font-body ${msg.highlight ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
              {msg.text}
            </p>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate("/account?tab=loyalty")}
        className="flex items-center gap-1.5 text-[10px] font-display font-semibold px-3 py-2 rounded-lg transition-colors text-white"
        style={{ background: nextMeta.color }}
      >
        <TrendingUp className="h-3 w-3" />
        Voir les plans
        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}
