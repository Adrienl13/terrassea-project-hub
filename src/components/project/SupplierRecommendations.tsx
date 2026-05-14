import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2, Zap, Star, Package, Truck, FileText, MessageSquare,
  ChevronDown, ChevronUp, TrendingUp, AlertTriangle,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { scoreSupplierOffers, type ScoredOffer, type SupplierBadge } from "@/engine/supplierEngine";
import { useProjectCart, type SelectedSupplier } from "@/contexts/ProjectCartContext";
import { cartItemMatchesIdentity } from "@/lib/cartHelpers";
import { fetchVariantsByIds } from "@/lib/productVariants";
import { toast } from "sonner";

interface SupplierRecommendationsProps {
  productId: string;
  productName: string;
  /**
   * δ-1-bis Bug B : variant_id du cart item d'origine. Quand fourni :
   *  - currentItem matche par (product_id, variant_id) au lieu de product_id
   *  - prix display = variant.price_eur (commission appliquée par
   *    fetchVariantsByIds) au lieu de offer.price brut
   *  - selectSupplier transmet variantId pour filtrer le bon item au cart
   * Sans variantId → comportement legacy 100 % inchangé.
   */
  variantId?: string;
}

const BADGE_CONFIG: Record<SupplierBadge, { labelKey: string; icon: typeof Star; className: string }> = {
  recommended: {
    labelKey: "supplierRecs.badgeRecommended",
    icon: Star,
    className: "bg-primary/10 text-primary border-primary/20",
  },
  best_stock: {
    labelKey: "supplierRecs.badgeBestStock",
    icon: Package,
    className: "bg-green-500/10 text-green-700 border-green-500/20",
  },
  fastest: {
    labelKey: "supplierRecs.badgeFastest",
    icon: Zap,
    className: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  },
  best_project_fit: {
    labelKey: "supplierRecs.badgeBestProjectFit",
    icon: TrendingUp,
    className: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  },
  top_rated: {
    labelKey: "supplierRecs.badgeTopRated",
    icon: Star,
    className: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  },
  moq_mismatch: {
    labelKey: "supplierRecs.badgeMoqMismatch",
    icon: AlertTriangle,
    className: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  },
};

const STOCK_DOT: Record<string, string> = {
  available: "bg-green-500",
  in_stock: "bg-green-500",
  low_stock: "bg-amber-500",
  production: "bg-blue-500",
  on_order: "bg-muted-foreground",
  out_of_stock: "bg-destructive",
};

// Brand offers (pricing_mode = on_request) show real name, others are masked
function getSupplierDisplayName(offer: ScoredOffer, index: number, t: (k: string, o?: Record<string, unknown>) => string): string {
  if (offer.pricing_mode === "on_request" && offer.partner?.name) return offer.partner.name;
  return t("vendorOffers.verifiedSupplier", { index: index + 1 });
}

function isBrandOffer(offer: ScoredOffer): boolean {
  return offer.pricing_mode === "on_request";
}

const SupplierRecommendations = ({ productId, productName, variantId }: SupplierRecommendationsProps) => {
  const { t } = useTranslation();
  const { items, selectSupplier } = useProjectCart();
  const [offers, setOffers] = useState<ScoredOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  // δ-1-bis : si variantId fourni, match strict (product_id, variant_id).
  // Sinon comportement legacy (premier item ce product). Évite que 2 variants
  // partagent le même `currentItem` et écrasent leurs suppliers mutuellement.
  const currentItem = items.find((i) =>
    variantId !== undefined
      ? cartItemMatchesIdentity(i, productId, variantId)
      : i.product.id === productId,
  );
  const projectProductIds = items.map((i) => i.product.id);

  // δ-1-bis : fetch la variant Modèle B (commission appliquée upstream).
  // Cache 2 min cohérent avec ProjectCart cart-variants useQuery.
  const { data: variants = [] } = useQuery({
    queryKey: ["supplier-recs-variant", variantId ?? null],
    queryFn: () => (variantId ? fetchVariantsByIds([variantId]) : Promise.resolve([])),
    enabled: !!variantId,
    staleTime: 2 * 60 * 1000,
  });
  const variant = variants[0] ?? null;

  // Helper : prix effectif d'une offer côté display + selectSupplier.
  // Variant (commission appliquée) prioritaire, sinon offer.price legacy.
  // NB : le scoring upstream (engine) reste sur offer.price brut — ce qui
  // est cohérent car toutes les offers d'un même product partagent la même
  // variant, donc le ranking relatif n'est pas affecté.
  const effectivePriceOf = (offer: ScoredOffer): number | null => {
    if (variant?.price_eur != null) {
      const n = Number(variant.price_eur);
      if (Number.isFinite(n)) return n;
    }
    return offer.price;
  };

  // ε : stock status / quantity dérivés de la variant Modèle B (3 mappings).
  // Si variant absente → fallback offer.stock_status / offer.stock_quantity legacy.
  const effectiveStockStatusOf = (offer: ScoredOffer): string | null => {
    if (variant) {
      if (variant.is_made_to_order) return "made_to_order";
      if (variant.in_stock) return "in_stock";
      return "out_of_stock";
    }
    return offer.stock_status;
  };

  const effectiveStockQuantityOf = (offer: ScoredOffer): number | null => {
    if (variant) return variant.stock_quantity;
    return offer.stock_quantity;
  };

  const offerToSelectedSupplier = (
    offer: ScoredOffer,
    index: number,
  ): SelectedSupplier => ({
    offerId: offer.id,
    partnerId: offer.partner_id,
    partnerName: getSupplierDisplayName(offer, index, t),
    partnerCountry: offer.partner?.country,
    price: effectivePriceOf(offer),
    stockStatus: offer.stock_status,
    stockQuantity: offer.stock_quantity,
    deliveryDelayDays: offer.delivery_delay_days,
    purchaseType: offer.purchase_type,
    score: offer.scores.total,
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    scoreSupplierOffers(
      productId,
      projectProductIds,
      false,
      [],
      currentItem?.selectedDimension || null,
      currentItem?.quantity,
    ).then((scored) => {
      if (!cancelled) {
        setOffers(scored);
        setLoading(false);
      }
    }).catch((err) => {
      console.error("Failed to score supplier offers:", err);
      if (!cancelled) {
        setLoading(false);
        toast.error(t("supplierRecs.failedToLoad"));
      }
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, items.length, currentItem?.quantity, currentItem?.selectedDimension]);

  const handleSelectSupplier = (offer: ScoredOffer, index: number) => {
    // δ-1-bis : transmet variantId pour cibler le bon (product_id, variant_id)
    selectSupplier(productId, offerToSelectedSupplier(offer, index), variantId);
    const name = getSupplierDisplayName(offer, index, t);
    toast.success(t("supplierRecs.selectedFor", { supplier: name, product: productName }));
  };

  if (loading) {
    return (
      <div className="mb-6">
        <h3 className="text-[10px] font-body uppercase tracking-[0.2em] text-muted-foreground mb-3">
          {t("supplierRecs.supplierOptions")}
        </h3>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-muted/50 rounded-sm animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (offers.length === 0) return null;

  const recommended = offers.find((o) => o.isRecommended);
  const others = offers.filter((o) => !o.isRecommended);
  const visibleOthers = expanded ? others : others.slice(0, 1);
  const isSelected = (offerId: string) => currentItem?.selectedSupplier?.offerId === offerId;

  const renderSelectButton = (offer: ScoredOffer, offerIndex: number) => {
    const selected = isSelected(offer.id);
    return (
      <button
        onClick={() => handleSelectSupplier(offer, offerIndex)}
        className={`flex items-center gap-1.5 text-[10px] font-display font-semibold rounded-full px-3 py-1.5 transition-all ${
          selected
            ? "bg-primary text-primary-foreground"
            : offer.isRecommended
              ? "bg-foreground text-primary-foreground hover:opacity-90"
              : "border border-foreground text-foreground hover:bg-foreground hover:text-primary-foreground"
        }`}
      >
        {selected ? (
          <><CheckCircle2 className="h-3 w-3" /> {t("supplierRecs.selected")}</>
        ) : (
          <><FileText className="h-3 w-3" /> {offer.purchase_type === "direct" ? t("supplierRecs.selectSupplier") : t("supplierRecs.selectForQuote")}</>
        )}
      </button>
    );
  };

  return (
    <div className="mb-6">
      <h3 className="text-[10px] font-body uppercase tracking-[0.2em] text-muted-foreground mb-1">
        {t("supplierRecs.supplierOptions")}
      </h3>
      <p className="text-[10px] font-body text-muted-foreground mb-3">
        {t("supplierRecs.supplierCount", { count: offers.length })}
      </p>

      {/* Recommended supplier */}
      {recommended && (
        <div className={`border rounded-sm p-3 mb-2 ${isSelected(recommended.id) ? "border-primary bg-primary/5" : "border-primary/20 bg-primary/5"}`}>
          <div className="flex items-start gap-3">
            {isBrandOffer(recommended) && recommended.partner?.logo_url ? (
              <img loading="lazy" src={recommended.partner.logo_url} alt={getSupplierDisplayName(recommended, 0, t)} className="w-8 h-8 rounded-full object-cover bg-card flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-card flex items-center justify-center text-xs font-display font-bold text-muted-foreground flex-shrink-0">
                {isBrandOffer(recommended) ? (recommended.partner?.name?.charAt(0) || "?") : "1"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {isBrandOffer(recommended) ? (
                  <Link
                    to={`/partners/${recommended.partner?.slug}`}
                    className="font-display font-semibold text-xs text-foreground hover:underline"
                  >
                    {getSupplierDisplayName(recommended, 0, t)}
                  </Link>
                ) : (
                  <span className="font-display font-semibold text-xs text-foreground">
                    {getSupplierDisplayName(recommended, 0, t)}
                  </span>
                )}
                {recommended.badges.map((badge) => {
                  const config = BADGE_CONFIG[badge];
                  if (!config) return null;
                  const Icon = config.icon;
                  return (
                    <span
                      key={badge}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-display font-semibold border ${config.className}`}
                    >
                      <Icon className="h-2.5 w-2.5" />
                      {t(config.labelKey)}
                    </span>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground capitalize mt-0.5">
                {recommended.partner?.partner_type} · {recommended.partner?.country}
              </p>

              {recommended.recommendationReason && (
                <p className="text-[10px] font-body text-muted-foreground mt-1.5 italic leading-snug">
                  {recommended.recommendationReason}
                </p>
              )}

              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="font-display font-bold text-sm text-foreground">
                  {(() => {
                    const p = effectivePriceOf(recommended);
                    return p ? `€${p.toFixed(2)}` : t("supplierRecs.onRequest");
                  })()}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  {(() => {
                    const eStatus = effectiveStockStatusOf(recommended);
                    const eQty = effectiveStockQuantityOf(recommended);
                    return (
                      <>
                        <span className={`w-1.5 h-1.5 rounded-full ${STOCK_DOT[eStatus ?? "available"] || STOCK_DOT.available}`} />
                        {eQty != null ? t("supplierRecs.units", { count: eQty }) : eStatus || "available"}
                      </>
                    );
                  })()}
                </span>
                {recommended.delivery_delay_days && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Truck className="h-2.5 w-2.5" />
                    {recommended.delivery_delay_days}d
                  </span>
                )}
              </div>

              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${recommended.scores.total}%` }}
                  />
                </div>
                <span className="text-[9px] font-display font-semibold text-muted-foreground">
                  {recommended.scores.total}/100
                </span>
              </div>

              <div className="flex gap-2 mt-2.5">
                {renderSelectButton(recommended, 0)}
                <Link to="/messages" className="p-1.5 border border-border rounded-full hover:border-foreground transition-colors" title={t("supplierRecs.contactSupplier")}>
                  <MessageSquare className="h-3 w-3 text-muted-foreground" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Other suppliers */}
      {visibleOthers.map((offer, idx) => {
        const offerIndex = idx + 1; // +1 because recommended is index 0
        const displayName = getSupplierDisplayName(offer, offerIndex, t);
        const showReal = isBrandOffer(offer);
        return (
        <div key={offer.id} className={`border rounded-sm p-3 mb-2 ${isSelected(offer.id) ? "border-primary bg-primary/5" : "border-border"}`}>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-card flex items-center justify-center text-[10px] font-display font-bold text-muted-foreground flex-shrink-0">
              {showReal ? (offer.partner?.name?.charAt(0) || "?") : offerIndex + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {showReal ? (
                  <Link
                    to={`/partners/${offer.partner?.slug}`}
                    className="font-display font-semibold text-xs text-foreground hover:underline"
                  >
                    {displayName}
                  </Link>
                ) : (
                  <span className="font-display font-semibold text-xs text-foreground">
                    {displayName}
                  </span>
                )}
                {offer.badges.map((badge) => {
                  const config = BADGE_CONFIG[badge];
                  if (!config) return null;
                  const Icon = config.icon;
                  return (
                    <span
                      key={badge}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-display font-semibold border ${config.className}`}
                    >
                      <Icon className="h-2.5 w-2.5" />
                      {t(config.labelKey)}
                    </span>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="font-display font-bold text-xs text-foreground">
                  {(() => {
                    const p = effectivePriceOf(offer);
                    return p ? `€${p.toFixed(2)}` : t("supplierRecs.onRequest");
                  })()}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  {(() => {
                    const eStatus = effectiveStockStatusOf(offer);
                    return (
                      <>
                        <span className={`w-1.5 h-1.5 rounded-full ${STOCK_DOT[eStatus ?? "available"] || STOCK_DOT.available}`} />
                        {eStatus || "available"}
                      </>
                    );
                  })()}
                </span>
                {offer.delivery_delay_days && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Truck className="h-2.5 w-2.5" />
                    {offer.delivery_delay_days}d
                  </span>
                )}
                <span className="text-[9px] text-muted-foreground font-display">
                  {t("supplierRecs.score", { score: offer.scores.total })}
                </span>
              </div>
              <div className="flex gap-2 mt-2">
                {renderSelectButton(offer, offerIndex)}
              </div>
            </div>
          </div>
        </div>
        );
      })}

      {/* Expand/collapse */}
      {others.length > 1 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-[10px] font-display font-semibold text-muted-foreground hover:text-foreground transition-colors mt-1"
        >
          {expanded ? (
            <><ChevronUp className="h-3 w-3" /> {t("supplierRecs.showLess")}</>
          ) : (
            <><ChevronDown className="h-3 w-3" /> {t("supplierRecs.moreSuppliers", { count: others.length - 1 })}</>
          )}
        </button>
      )}

      <p className="text-[9px] font-body text-muted-foreground italic mt-3">
        {t("supplierRecs.footerNote")}
      </p>

      <Separator className="mt-4" />
    </div>
  );
};

export default SupplierRecommendations;
