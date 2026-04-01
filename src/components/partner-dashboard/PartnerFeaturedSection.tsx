import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  TIER_CONFIG as TIER_CONFIG_ANALYTICS,
  type PartnerTier as PartnerTierType,
} from "@/hooks/usePartnerAnalytics";
import {
  Rocket, Lock, GripVertical, Eye, FileText, Sparkles, Info,
} from "lucide-react";
import {
  type PartnerPlan, PLAN_CONFIG, PlanBadge, CommissionReminder, UpgradeCTA,
} from "./PartnerSections";

export function PartnerFeaturedSection({ plan, partnerId }: { plan: PartnerPlan; partnerId?: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const config = PLAN_CONFIG[plan];

  // Read subscription overrides for this partner
  const { data: featSubOverrides } = useQuery({
    queryKey: ["partner-sub-overrides", partnerId],
    queryFn: async () => {
      const { data } = await supabase.from("partner_subscriptions")
        .select("max_products, commission_rate")
        .eq("partner_id", partnerId!)
        .maybeSingle();
      return data;
    },
    enabled: !!partnerId,
  });

  // Use TIER_CONFIG from usePartnerAnalytics for default featured limit, with override support
  const defaultFeatured = TIER_CONFIG_ANALYTICS[plan as PartnerTierType]?.featuredProducts ?? 0;
  const maxFeatured = defaultFeatured;
  const isStarter = plan === "starter";

  // Fetch real featured products from DB
  const { data: featured = [] } = useQuery({
    queryKey: ["partner-featured", partnerId],
    queryFn: async () => {
      if (!partnerId) return [];
      const { data } = await supabase
        .from("partner_featured_products")
        .select("id, product_id, position, product:product_id(id, name, image_url)")
        .eq("partner_id", partnerId)
        .eq("is_active", true)
        .order("position", { ascending: true });
      return (data || []).map((f: any) => ({
        id: f.id,
        productId: f.product?.id || f.product_id,
        name: f.product?.name || "Product",
        views: 0,
        quotes: 0,
      }));
    },
    enabled: !!partnerId,
  });

  // Fetch partner's products not yet featured
  const { data: availableProducts = [] } = useQuery({
    queryKey: ["partner-available-for-feature", partnerId, featured],
    queryFn: async () => {
      if (!partnerId) return [];
      const featuredIds = featured.map((f: any) => f.productId).filter(Boolean);
      const query = supabase
        .from("product_offers")
        .select("product_id, product:product_id(id, name, image_url)")
        .eq("partner_id", partnerId)
        .eq("is_active", true)
        .limit(10);
      const { data } = await query;
      return (data || [])
        .filter((o: any) => !featuredIds.includes(o.product_id))
        .map((o: any) => ({
          id: o.product?.id || o.product_id,
          name: o.product?.name || "Product",
          views: 0,
          quotes: 0,
        }));
    },
    enabled: !!partnerId,
  });

  const handleRemove = async (id: string) => {
    await supabase.from("partner_featured_products").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["partner-featured", partnerId] });
    toast.success(t('pd.featured.removedToast'));
  };

  const handleAdd = async (product: { id: string; name: string }) => {
    if (featured.length >= maxFeatured) {
      toast.error(t('pd.featured.limitToast', { max: maxFeatured, plan: config.label }));
      return;
    }
    if (!partnerId) return;
    await supabase.from("partner_featured_products").insert({
      partner_id: partnerId,
      product_id: product.id,
      position: featured.length,
      is_active: true,
    });
    queryClient.invalidateQueries({ queryKey: ["partner-featured", partnerId] });
    toast.success(t('pd.featured.addedToast', { name: product.name }));
  };

  return (
    <div className="space-y-5">
      <CommissionReminder plan={plan} onUpgrade={() => {}} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display font-bold text-sm text-foreground flex items-center gap-2">
            <Rocket className="h-4 w-4" /> {t('pd.featured.title')}
          </p>
          <p className="text-[10px] font-body text-muted-foreground mt-0.5">
            {t('pd.featured.slots', { count: featured.length, max: maxFeatured })}
          </p>
        </div>
        <PlanBadge plan={plan} />
      </div>

      {/* Usage bar */}
      {maxFeatured > 0 && (
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${(featured.length / maxFeatured) * 100}%`,
              background: featured.length >= maxFeatured ? "#D97706" : config.color,
            }}
          />
        </div>
      )}

      {isStarter ? (
        <div className="border-2 border-dashed border-border rounded-sm p-8 text-center">
          <Lock className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
          <p className="font-display font-bold text-sm text-foreground mb-1">{t('pd.featured.noStarter')}</p>
          <p className="text-[10px] font-body text-muted-foreground mb-4 max-w-sm mx-auto">
            {t('pd.featured.upgradeMsg')}
          </p>
          <UpgradeCTA currentPlan={plan} />
        </div>
      ) : (
        <>
          {/* Featured list */}
          <div>
            <p className="text-xs font-display font-semibold text-foreground mb-3">{t('pd.featured.current')}</p>
            {featured.length === 0 ? (
              <div className="border border-border rounded-sm px-4 py-8 text-center">
                <Rocket className="h-6 w-6 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs font-body text-muted-foreground">{t('pd.featured.none')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {featured.map((p, idx) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3 border border-border rounded-sm bg-gradient-to-r from-amber-50/50 to-transparent">
                    <GripVertical className="h-4 w-4 text-muted-foreground/30 shrink-0 cursor-grab" />
                    <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-display font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-display font-semibold text-foreground truncate">{p.name}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-[9px] font-body text-muted-foreground">
                        <span className="flex items-center gap-1"><Eye className="h-2.5 w-2.5" /> {p.views} {t('pd.featured.views')}</span>
                        <span className="flex items-center gap-1"><FileText className="h-2.5 w-2.5" /> {p.quotes} {t('pd.featured.quotes')}</span>
                        <span className="flex items-center gap-1 text-amber-600"><Sparkles className="h-2.5 w-2.5" /> {t('pd.featured.boosted')}</span>
                      </div>
                    </div>
                    <button onClick={() => handleRemove(p.id)} className="text-[10px] font-display font-semibold text-red-500 hover:text-red-700 transition-colors px-2 py-1">
                      {t('pd.featured.remove')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available to boost */}
          {featured.length < maxFeatured && (
            <div>
              <p className="text-xs font-display font-semibold text-foreground mb-3">{t('pd.featured.addTitle')}</p>
              <div className="space-y-1.5">
                {availableProducts.filter(ap => !featured.some(f => f.id === ap.id)).map(p => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-2.5 border border-border rounded-sm hover:border-foreground/20 transition-colors">
                    <div>
                      <p className="text-xs font-display font-semibold text-foreground">{p.name}</p>
                      <p className="text-[9px] font-body text-muted-foreground">{p.views} {t('pd.featured.views')} · {p.quotes} {t('pd.featured.quotes')}</p>
                    </div>
                    <button onClick={() => handleAdd(p)} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity">
                      <Rocket className="h-3 w-3" /> {t('pd.featured.boost')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="flex items-start gap-2 px-4 py-3 bg-card border border-border rounded-sm">
            <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[10px] font-body text-muted-foreground leading-relaxed">
              {t('pd.featured.info', { plan: config.label, max: maxFeatured })}
              {plan === "growth" && ` ${t('pd.featured.upgradeElite')}`}
            </p>
          </div>

          {(plan === "growth" || plan === "brand_member") && <UpgradeCTA currentPlan={plan} />}
        </>
      )}
    </div>
  );
}
