import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Package, Truck, ShoppingCart, FileText,
  Minus, Plus, Zap, AlertTriangle, CheckCircle2, XCircle, Clock, Shield,
} from "lucide-react";
import type { ProductOffer } from "@/lib/productOffers";
import type { DBProduct } from "@/lib/products";
import type { ProductArrival } from "@/hooks/useArrivals";
import { useProjectCart, type SelectedSupplier } from "@/contexts/ProjectCartContext";
import { useAuth } from "@/contexts/AuthContext";
import AddToProjectModal from "@/components/architect-dashboard/AddToProjectModal";
import QuoteRequestModal from "@/components/products/QuoteRequestModal";
import ProjectBriefModal from "@/components/products/ProjectBriefModal";
import RestockBadge from "@/components/products/RestockBadge";
import { toast } from "sonner";

interface VendorOffersProps {
  offers: ProductOffer[];
  product: DBProduct;
  defaultQuantity?: number;
  isAdmin?: boolean;
  arrivals?: ProductArrival[];
  selectedColor?: string | null;
}

// ── Country flags ─────────────────────────────────────────────────────────────

const COUNTRY_FLAGS: Record<string, string> = {
  "France": "🇫🇷", "Italy": "🇮🇹", "Spain": "🇪🇸", "Germany": "🇩🇪",
  "Portugal": "🇵🇹", "Netherlands": "🇳🇱", "Belgium": "🇧🇪", "United Kingdom": "🇬🇧",
  "Denmark": "🇩🇰", "Sweden": "🇸🇪", "Switzerland": "🇨🇭", "Austria": "🇦🇹",
  "Poland": "🇵🇱", "Turkey": "🇹🇷", "China": "🇨🇳", "Vietnam": "🇻🇳",
  "Indonesia": "🇮🇩", "India": "🇮🇳",
};

function getFlag(country: string | null | undefined): string {
  if (!country) return "🌍";
  return COUNTRY_FLAGS[country] || "🌍";
}

// ── Stock / Fit config ────────────────────────────────────────────────────────

type StockStatusKey = "available" | "low_stock" | "production" | "on_order" | "out_of_stock";

const STOCK_DOT: Record<string, string> = {
  available: "bg-green-500",
  low_stock: "bg-amber-500",
  production: "bg-blue-500",
  on_order: "bg-muted-foreground",
  out_of_stock: "bg-destructive",
};

const STOCK_I18N_KEY: Record<string, string> = {
  available: "vendorOffers.inStock",
  low_stock: "vendorOffers.lowStock",
  production: "vendorOffers.production",
  on_order: "vendorOffers.onOrder",
  out_of_stock: "vendorOffers.outOfStock",
};

type QuantityFit = "full_match" | "partial_stock" | "production_required" | "moq_not_met" | "out_of_stock";

interface FitConfig {
  i18nKey: string;
  color: string;
  icon: typeof CheckCircle2;
}

const FIT_CONFIG: Record<QuantityFit, FitConfig> = {
  full_match: { i18nKey: "vendorOffers.fullMatch", color: "text-green-600", icon: CheckCircle2 },
  partial_stock: { i18nKey: "vendorOffers.partialStock", color: "text-amber-600", icon: AlertTriangle },
  production_required: { i18nKey: "vendorOffers.productionRequired", color: "text-blue-600", icon: Package },
  moq_not_met: { i18nKey: "vendorOffers.moqNotMet", color: "text-destructive", icon: XCircle },
  out_of_stock: { i18nKey: "vendorOffers.outOfStock", color: "text-destructive", icon: XCircle },
};

function evaluateQuantityFit(offer: ProductOffer, quantity: number): QuantityFit {
  if (offer.minimum_order != null && offer.minimum_order > 1 && quantity < offer.minimum_order) return "moq_not_met";
  const status = offer.stock_status?.toLowerCase() || "available";
  if (status === "out_of_stock") return "out_of_stock";
  if (status === "production" || status === "on_order") return "production_required";
  const qty = offer.stock_quantity;
  if (qty !== null && qty !== undefined) {
    if (qty >= quantity) return "full_match";
    if (qty > 0) return "partial_stock";
    return "production_required";
  }
  if (status === "low_stock") return "partial_stock";
  return "full_match";
}

function FitBadge({ fit }: { fit: QuantityFit }) {
  const { t } = useTranslation();
  const config = FIT_CONFIG[fit];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-display font-semibold ${config.color}`}>
      <Icon className="h-3 w-3" />
      {t(config.i18nKey)}
    </span>
  );
}

function FitHelperText({ fit, offer, quantity }: { fit: QuantityFit; offer: ProductOffer; quantity: number }) {
  const { t } = useTranslation();
  if (fit === "full_match") return null;
  const stockQty = offer.stock_quantity ?? 0;
  const remaining = quantity - stockQty;
  return (
    <div className="text-[10px] text-muted-foreground leading-relaxed mt-1 text-right">
      {fit === "partial_stock" && (
        <>
          <p>{t("vendorOffers.onlyInStock", { count: stockQty })}</p>
          <p>{t("vendorOffers.requireRestock", { count: remaining })}</p>
        </>
      )}
      {fit === "production_required" && (
        <p className="flex items-center justify-end gap-1">
          <Clock className="h-3 w-3" />
          {t("vendorOffers.requiresProduction")}{offer.delivery_delay_days ? ` · ${offer.delivery_delay_days}d` : ""}
        </p>
      )}
      {fit === "moq_not_met" && <p>{t("vendorOffers.minOrder", { count: offer.minimum_order })}</p>}
      {fit === "out_of_stock" && <p>{t("vendorOffers.currentlyUnavailable")}</p>}
    </div>
  );
}

function OfferAction({ fit, offer, quantity, onAddToCart, onRequestQuote }: {
  fit: QuantityFit; offer: ProductOffer; quantity: number; onAddToCart: (o: ProductOffer) => void; onRequestQuote?: (o: ProductOffer) => void;
}) {
  const { t } = useTranslation();
  if (fit === "full_match") {
    return (
      <button onClick={() => onAddToCart(offer)}
        className="flex items-center gap-1.5 text-[10px] font-display font-semibold bg-foreground text-primary-foreground rounded-full px-3 py-1.5 hover:opacity-90 transition-opacity">
        <ShoppingCart className="h-3 w-3" /> {t("vendorOffers.addQuantity", { count: quantity })}
      </button>
    );
  }
  if (fit === "out_of_stock" || fit === "moq_not_met") {
    return (
      <button disabled
        className="flex items-center gap-1.5 text-[10px] font-display font-semibold bg-muted text-muted-foreground rounded-full px-3 py-1.5 cursor-not-allowed opacity-60">
        <XCircle className="h-3 w-3" /> {t("vendorOffers.unavailable")}
      </button>
    );
  }
  const label = fit === "production_required"
    ? t("vendorOffers.requestProductionQuote")
    : t("vendorOffers.requestQuoteFor", { count: quantity });
  return (
    <button onClick={() => onRequestQuote?.(offer)} className="flex items-center gap-1.5 text-[10px] font-display font-semibold border border-foreground text-foreground rounded-full px-3 py-1.5 hover:bg-foreground hover:text-primary-foreground transition-colors">
      <FileText className="h-3 w-3" /> {label}
    </button>
  );
}

// ── Partner type label ────────────────────────────────────────────────────────

function usePartnerTypeLabel() {
  const { t } = useTranslation();
  return (type: string | null | undefined): string => {
    if (!type) return "";
    const lower = type.toLowerCase();
    if (lower === "manufacturer") return t("vendorOffers.manufacturer");
    if (lower === "brand") return t("vendorOffers.brand");
    if (lower === "reseller" || lower === "distributor" || lower === "retailer" || lower === "wholesaler") return t("vendorOffers.reseller");
    return type;
  };
}

// ── Supplier avatar (masked) ──────────────────────────────────────────────────

function SupplierAvatar({ index, isAdmin, offer }: {
  index: number; isAdmin: boolean; offer: ProductOffer;
}) {
  if (isAdmin && offer.partner?.logo_url) {
    return <img src={offer.partner.logo_url} alt="" className="w-8 h-8 rounded-full object-cover bg-card" />;
  }
  return (
    <div className="w-8 h-8 rounded-full bg-card flex items-center justify-center text-xs font-display font-bold text-muted-foreground">
      {isAdmin ? (offer.partner?.name?.charAt(0) || "?") : (index + 1)}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const VendorOffers = ({ offers, product, defaultQuantity = 1, isAdmin = false, arrivals = [], selectedColor = null }: VendorOffersProps) => {
  const { t } = useTranslation();
  const [quantity, setQuantity] = useState(defaultQuantity);
  const { addItem, selectSupplier } = useProjectCart();
  const { profile } = useAuth();
  const isArchitect = profile?.user_type === "architect";
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [pendingSupplier, setPendingSupplier] = useState<SelectedSupplier | null>(null);
  const [quoteModalOffer, setQuoteModalOffer] = useState<ProductOffer | null>(null);
  const [projectBriefOffer, setProjectBriefOffer] = useState<ProductOffer | null>(null);
  const getPartnerTypeLabel = usePartnerTypeLabel();

  const getOfferArrivals = (partnerId: string) =>
    arrivals.filter((a) => a.partnerId === partnerId);

  const handlePreorder = (_arrivalItemId: string, qty: number) => {
    toast.success(t("restock.preorderSuccess", { count: qty }));
    // Preorder creation would go through a Supabase insert to the preorders table
  };

  const getMaskedName = (index: number): string => {
    return t("vendorOffers.verifiedSupplier", { index: index + 1 });
  };

  const summary = useMemo(() => {
    if (offers.length === 0) return { lowestTotal: null, fastestDelivery: null, bestStockIndex: null };
    const priced = offers.filter((o) => o.price !== null);
    const lowestPrice = priced.length > 0 ? Math.min(...priced.map((o) => o.price!)) : null;
    const lowestTotal = lowestPrice !== null ? lowestPrice * quantity : null;
    const withDelivery = offers.filter((o) => o.delivery_delay_days !== null);
    const fastestDelivery = withDelivery.length > 0
      ? Math.min(...withDelivery.map((o) => o.delivery_delay_days!))
      : null;

    let bestStockIndex: number | null = null;
    let bestStockCover = -1;
    offers.forEach((o, i) => {
      const fit = evaluateQuantityFit(o, quantity);
      const cover = fit === "full_match" ? 2 : fit === "partial_stock" ? 1 : 0;
      if (cover > bestStockCover || (cover === bestStockCover && (o.price ?? Infinity) < (offers[bestStockIndex ?? 0]?.price ?? Infinity))) {
        bestStockCover = cover;
        bestStockIndex = i;
      }
    });
    return { lowestTotal, fastestDelivery, bestStockIndex };
  }, [offers, quantity]);

  if (offers.length === 0) return null;

  const buildSupplier = (offer: ProductOffer, index: number): SelectedSupplier => ({
    offerId: offer.id,
    partnerId: offer.partner_id,
    partnerName: isAdmin ? (offer.partner?.name || "Unknown") : getMaskedName(index),
    partnerCountry: offer.partner?.country,
    price: offer.price,
    stockStatus: offer.stock_status,
    stockQuantity: offer.stock_quantity,
    deliveryDelayDays: offer.delivery_delay_days,
    purchaseType: offer.purchase_type,
    score: 0,
  });

  const handleAddToCart = (offer: ProductOffer, index: number) => {
    const supplier = buildSupplier(offer, index);

    if (isArchitect) {
      setPendingSupplier(supplier);
      setProjectModalOpen(true);
      return;
    }

    addItem(product, undefined, quantity, undefined, selectedColor ?? undefined);
    selectSupplier(product.id, supplier);
    toast.success(t("vendorOffers.addedToProject", { count: quantity, name: product.name }));
  };

  const handleArchitectConfirm = (projectId: string, projectName: string, zoneName?: string) => {
    addItem(product, zoneName || projectName, quantity, undefined, selectedColor ?? undefined);
    if (pendingSupplier) {
      selectSupplier(product.id, pendingSupplier);
    }
    toast.success(t("vendorOffers.addedToProjectZone", {
      count: quantity,
      name: product.name,
      project: projectName,
      zone: zoneName ? ` · ${zoneName}` : "",
    }));
    setPendingSupplier(null);
  };

  return (
    <section className="border-t border-border pt-8 mt-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <h2 className="font-display text-sm font-bold text-foreground uppercase tracking-wider">
          {t("vendorOffers.availableOffers")}
        </h2>
        {!isAdmin && (
          <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground font-body">
            <Shield className="h-3 w-3" />
            {t("vendorOffers.identitiesRevealed")}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground font-body mb-6">
        {t("vendorOffers.verifiedSuppliers", { count: offers.length, name: product.name })}
      </p>

      {/* Quantity selector */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
        <div>
          <label className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
            {t("vendorOffers.quantityNeeded")}
          </label>
          <div className="flex items-center gap-0 border border-border rounded-full overflow-hidden">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity" className="px-3 py-2 hover:bg-card transition-colors">
              <Minus className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 text-center text-sm font-display font-bold bg-transparent border-x border-border py-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button onClick={() => setQuantity(quantity + 1)} aria-label="Increase quantity" className="px-3 py-2 hover:bg-card transition-colors">
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Summary helpers */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-body text-muted-foreground">
          {summary.lowestTotal !== null && (
            <span className="flex items-center gap-1.5">
              <ShoppingCart className="h-3.5 w-3.5" />
              {t("vendorOffers.lowestTotal")} <strong className="text-foreground font-display">€{summary.lowestTotal.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</strong>
            </span>
          )}
          {summary.fastestDelivery !== null && (
            <span className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              {t("vendorOffers.fastest")} <strong className="text-foreground font-display">{t("vendorOffers.days", { count: summary.fastestDelivery })}</strong>
            </span>
          )}
          {summary.bestStockIndex !== null && (
            <span className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" />
              {t("vendorOffers.bestStock")} <strong className="text-foreground font-display">
                {isAdmin
                  ? offers[summary.bestStockIndex]?.partner?.name
                  : getMaskedName(summary.bestStockIndex)}
              </strong>
            </span>
          )}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm font-body">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">{t("vendorOffers.supplier")}</th>
              <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">{t("vendorOffers.origin")}</th>
              <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">{t("vendorOffers.unitPrice")}</th>
              <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">{t("vendorOffers.total")}</th>
              <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">{t("vendorOffers.stock")}</th>
              <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">{t("vendorOffers.fit")}</th>
              <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">{t("vendorOffers.delivery")}</th>
              <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal text-right">{t("vendorOffers.action")}</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer, index) => {
              const stockKey = offer.stock_status || "available";
              const stockDot = STOCK_DOT[stockKey] || STOCK_DOT.available;
              const stockLabel = t(STOCK_I18N_KEY[stockKey] || STOCK_I18N_KEY.available);
              const fit = evaluateQuantityFit(offer, quantity);
              const total = offer.price !== null ? offer.price * quantity : null;
              const flag = getFlag(offer.partner?.country);
              const displayName = isAdmin ? (offer.partner?.name || "Unknown") : getMaskedName(index);

              return (
                <tr key={offer.id} className="border-b border-border/50 last:border-0">
                  {/* Supplier */}
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <SupplierAvatar index={index} isAdmin={isAdmin} offer={offer} />
                      <div>
                        <div className="flex items-center gap-2">
                          {isAdmin && offer.partner?.slug ? (
                            <Link to={`/partners/${offer.partner.slug}`} className="font-display font-semibold text-foreground text-xs hover:underline">
                              {displayName}
                            </Link>
                          ) : (
                            <span className="font-display font-semibold text-foreground text-xs">
                              {displayName}
                            </span>
                          )}
                          {index === summary.bestStockIndex && (
                            <span className="text-[9px] font-display font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                              {t("vendorOffers.bestMatch")}
                            </span>
                          )}
                        </div>
                        {offer.partner?.partner_type && (
                          <p className="text-[10px] text-muted-foreground capitalize">
                            {isAdmin
                              ? `${offer.partner?.name || "Unknown"} · ${getPartnerTypeLabel(offer.partner.partner_type)}`
                              : getPartnerTypeLabel(offer.partner.partner_type)}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  {/* Origin */}
                  <td className="py-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{flag}</span>
                      <span className="text-xs text-muted-foreground">
                        {offer.partner?.country || "—"}
                      </span>
                    </div>
                  </td>
                  {/* Prices */}
                  <td className="py-4">
                    {offer.pricing_mode === 'on_request' ? (
                      <span className="font-display font-semibold italic text-[#D4603A] text-xs">
                        {t("vendorOffers.onQualifiedBrief")}
                      </span>
                    ) : (
                      <span className="font-display font-bold text-foreground">
                        {offer.price ? `€${offer.price.toFixed(2)}` : t("vendorOffers.onRequest")}
                      </span>
                    )}
                  </td>
                  <td className="py-4">
                    {offer.pricing_mode === 'on_request' ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <span className="font-display font-bold text-foreground">
                        {total !== null ? `€${total.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}` : "—"}
                      </span>
                    )}
                  </td>
                  {/* Stock */}
                  <td className="py-4">
                    <RestockBadge
                      stockStatus={offer.stock_status}
                      stockQuantity={offer.stock_quantity}
                      arrivals={getOfferArrivals(offer.partner_id)}
                      onPreorder={handlePreorder}
                    />
                  </td>
                  {/* Fit */}
                  <td className="py-4">
                    <FitBadge fit={fit} />
                  </td>
                  {/* Delivery */}
                  <td className="py-4 text-xs text-muted-foreground">
                    {offer.delivery_delay_days ? (
                      <span className="flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        {offer.delivery_delay_days}d
                      </span>
                    ) : "—"}
                  </td>
                  {/* Action */}
                  <td className="py-4">
                    <div className="flex flex-col items-end gap-1">
                      {offer.pricing_mode === 'on_request' ? (
                        <button
                          onClick={() => setProjectBriefOffer(offer)}
                          className="flex items-center gap-1.5 text-[10px] font-display font-semibold border border-[#D4603A] text-[#D4603A] rounded-full px-3 py-1.5 hover:bg-[#D4603A] hover:text-white transition-colors"
                        >
                          <FileText className="h-3 w-3" /> {t("vendorOffers.submitBrief")}
                        </button>
                      ) : (
                        <>
                          <OfferAction fit={fit} offer={offer} quantity={quantity} onAddToCart={(o) => handleAddToCart(o, index)} onRequestQuote={(o) => setQuoteModalOffer(o)} />
                          <FitHelperText fit={fit} offer={offer} quantity={quantity} />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {offers.map((offer, index) => {
          const stockKey = offer.stock_status || "available";
          const stockDot = STOCK_DOT[stockKey] || STOCK_DOT.available;
          const stockLabel = t(STOCK_I18N_KEY[stockKey] || STOCK_I18N_KEY.available);
          const fit = evaluateQuantityFit(offer, quantity);
          const total = offer.price !== null ? offer.price * quantity : null;
          const flag = getFlag(offer.partner?.country);
          const displayName = isAdmin ? (offer.partner?.name || "Unknown") : getMaskedName(index);

          return (
            <div key={offer.id} className="border border-border rounded-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SupplierAvatar index={index} isAdmin={isAdmin} offer={offer} />
                  <div>
                    <p className="font-display font-semibold text-xs text-foreground">{displayName}</p>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <span>{flag}</span>
                        <span>{offer.partner?.country || "—"}</span>
                      </span>
                      {offer.partner?.partner_type && (
                        <span>
                          · {isAdmin
                            ? `${offer.partner.name} · ${getPartnerTypeLabel(offer.partner.partner_type)}`
                            : getPartnerTypeLabel(offer.partner.partner_type)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {offer.pricing_mode === 'on_request' ? (
                    <span className="font-display font-semibold italic text-[#D4603A] text-xs">
                      {t("vendorOffers.onQualifiedBrief")}
                    </span>
                  ) : (
                    <>
                      <span className="font-display font-bold text-foreground text-sm">
                        {offer.price ? `€${offer.price.toFixed(2)}` : t("vendorOffers.onRequest")}
                      </span>
                      {total !== null && (
                        <p className="text-[10px] text-muted-foreground">
                          {t("vendorOffers.total")}: €{total.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-start gap-4 text-xs text-muted-foreground">
                <RestockBadge
                  stockStatus={offer.stock_status}
                  stockQuantity={offer.stock_quantity}
                  arrivals={getOfferArrivals(offer.partner_id)}
                  onPreorder={handlePreorder}
                />
                {offer.delivery_delay_days && (
                  <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> {offer.delivery_delay_days}d</span>
                )}
                <FitBadge fit={fit} />
              </div>
              <div className="flex items-start gap-2">
                <div className="flex-1 flex flex-col gap-1">
                  {offer.pricing_mode === 'on_request' ? (
                    <button
                      onClick={() => setProjectBriefOffer(offer)}
                      className="flex items-center gap-1.5 text-[10px] font-display font-semibold border border-[#D4603A] text-[#D4603A] rounded-full px-3 py-1.5 hover:bg-[#D4603A] hover:text-white transition-colors"
                    >
                      <FileText className="h-3 w-3" /> {t("vendorOffers.submitBrief")}
                    </button>
                  ) : (
                    <>
                      <OfferAction fit={fit} offer={offer} quantity={quantity} onAddToCart={(o) => handleAddToCart(o, index)} onRequestQuote={(o) => setQuoteModalOffer(o)} />
                      <FitHelperText fit={fit} offer={offer} quantity={quantity} />
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Privacy notice */}
      {!isAdmin && (
        <div className="mt-6 flex items-start gap-2 text-[10px] text-muted-foreground font-body bg-card rounded-sm p-3">
          <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <p>
            {t("vendorOffers.privacyNotice")}
          </p>
        </div>
      )}
      {isArchitect && (
        <AddToProjectModal
          open={projectModalOpen}
          onClose={() => { setProjectModalOpen(false); setPendingSupplier(null); }}
          product={product}
          quantity={quantity}
          supplier={pendingSupplier}
          onConfirm={handleArchitectConfirm}
        />
      )}
      <QuoteRequestModal
        open={quoteModalOffer !== null}
        onClose={() => setQuoteModalOffer(null)}
        product={product}
        offers={quoteModalOffer ? [quoteModalOffer] : []}
        defaultQuantity={quantity}
      />
      {projectBriefOffer && (
        <ProjectBriefModal
          open={projectBriefOffer !== null}
          onClose={() => setProjectBriefOffer(null)}
          product={product}
          offer={projectBriefOffer}
        />
      )}
    </section>
  );
};

export default VendorOffers;
