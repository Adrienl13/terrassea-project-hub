import { useState, useMemo } from "react";
import {
  Package, Truck, ShoppingCart, FileText,
  Minus, Plus, Zap, AlertTriangle, CheckCircle2, XCircle, Clock, Shield,
} from "lucide-react";
import type { ProductOffer } from "@/lib/productOffers";
import type { DBProduct } from "@/lib/products";
import { useProjectCart, type SelectedSupplier } from "@/contexts/ProjectCartContext";
import { toast } from "sonner";

interface VendorOffersProps {
  offers: ProductOffer[];
  product: DBProduct;
  defaultQuantity?: number;
  isAdmin?: boolean;
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

// ── Masked supplier name ──────────────────────────────────────────────────────

function getMaskedName(index: number): string {
  return `Verified Supplier #${index + 1}`;
}

// ── Stock / Fit config ────────────────────────────────────────────────────────

const STOCK_CONFIG: Record<string, { dot: string; label: string }> = {
  available: { dot: "bg-green-500", label: "In stock" },
  low_stock: { dot: "bg-amber-500", label: "Low stock" },
  production: { dot: "bg-blue-500", label: "Production" },
  on_order: { dot: "bg-muted-foreground", label: "On order" },
  out_of_stock: { dot: "bg-destructive", label: "Out of stock" },
};

type QuantityFit = "full_match" | "partial_stock" | "production_required" | "moq_not_met" | "out_of_stock";

interface FitConfig {
  label: string;
  color: string;
  icon: typeof CheckCircle2;
}

const FIT_CONFIG: Record<QuantityFit, FitConfig> = {
  full_match: { label: "Full match", color: "text-green-600", icon: CheckCircle2 },
  partial_stock: { label: "Partial stock", color: "text-amber-600", icon: AlertTriangle },
  production_required: { label: "Production required", color: "text-blue-600", icon: Package },
  moq_not_met: { label: "MOQ not met", color: "text-destructive", icon: XCircle },
  out_of_stock: { label: "Out of stock", color: "text-destructive", icon: XCircle },
};

function evaluateQuantityFit(offer: ProductOffer, quantity: number): QuantityFit {
  if (offer.minimum_order > 1 && quantity < offer.minimum_order) return "moq_not_met";
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
  const config = FIT_CONFIG[fit];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-display font-semibold ${config.color}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function FitHelperText({ fit, offer, quantity }: { fit: QuantityFit; offer: ProductOffer; quantity: number }) {
  if (fit === "full_match") return null;
  const stockQty = offer.stock_quantity ?? 0;
  const remaining = quantity - stockQty;
  return (
    <div className="text-[10px] text-muted-foreground leading-relaxed mt-1 text-right">
      {fit === "partial_stock" && (
        <>
          <p>Only {stockQty} in stock</p>
          <p>{remaining} require restock</p>
        </>
      )}
      {fit === "production_required" && (
        <p className="flex items-center justify-end gap-1">
          <Clock className="h-3 w-3" />
          Requires production{offer.delivery_delay_days ? ` · ${offer.delivery_delay_days}d` : ""}
        </p>
      )}
      {fit === "moq_not_met" && <p>Min. order: {offer.minimum_order} units</p>}
      {fit === "out_of_stock" && <p>Currently unavailable</p>}
    </div>
  );
}

function OfferAction({ fit, offer, quantity, onAddToCart }: {
  fit: QuantityFit; offer: ProductOffer; quantity: number; onAddToCart: (o: ProductOffer) => void;
}) {
  if (fit === "full_match") {
    return (
      <button onClick={() => onAddToCart(offer)}
        className="flex items-center gap-1.5 text-[10px] font-display font-semibold bg-foreground text-primary-foreground rounded-full px-3 py-1.5 hover:opacity-90 transition-opacity">
        <ShoppingCart className="h-3 w-3" /> Add {quantity}×
      </button>
    );
  }
  if (fit === "out_of_stock" || fit === "moq_not_met") {
    return (
      <button disabled
        className="flex items-center gap-1.5 text-[10px] font-display font-semibold bg-muted text-muted-foreground rounded-full px-3 py-1.5 cursor-not-allowed opacity-60">
        <XCircle className="h-3 w-3" /> Unavailable
      </button>
    );
  }
  const label = fit === "production_required" ? "Request production quote" : `Request quote for ${quantity}`;
  return (
    <button className="flex items-center gap-1.5 text-[10px] font-display font-semibold border border-foreground text-foreground rounded-full px-3 py-1.5 hover:bg-foreground hover:text-primary-foreground transition-colors">
      <FileText className="h-3 w-3" /> {label}
    </button>
  );
}

// ── Partner type label ────────────────────────────────────────────────────────

function getPartnerTypeLabel(type: string | null | undefined): string {
  if (!type) return "";
  const t = type.toLowerCase();
  if (t === "manufacturer") return "Manufacturer";
  if (t === "brand") return "Brand";
  if (t === "reseller" || t === "distributor" || t === "retailer" || t === "wholesaler") return "Reseller";
  return type;
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

const VendorOffers = ({ offers, product, defaultQuantity = 1, isAdmin = false }: VendorOffersProps) => {
  const [quantity, setQuantity] = useState(defaultQuantity);
  const { addItem, selectSupplier } = useProjectCart();

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

  const handleAddToCart = (offer: ProductOffer, index: number) => {
    addItem(product, undefined, quantity);
    const supplier: SelectedSupplier = {
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
    };
    selectSupplier(product.id, supplier);
    toast.success(`${quantity}× ${product.name} added to project`);
  };

  return (
    <section className="border-t border-border pt-8 mt-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <h2 className="font-display text-sm font-bold text-foreground uppercase tracking-wider">
          Available offers
        </h2>
        {!isAdmin && (
          <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground font-body">
            <Shield className="h-3 w-3" />
            Supplier identities revealed after order confirmation
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground font-body mb-6">
        {offers.length} verified supplier{offers.length !== 1 ? "s" : ""} for {product.name}
      </p>

      {/* Quantity selector */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
        <div>
          <label className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
            Quantity needed
          </label>
          <div className="flex items-center gap-0 border border-border rounded-full overflow-hidden">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 py-2 hover:bg-card transition-colors">
              <Minus className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 text-center text-sm font-display font-bold bg-transparent border-x border-border py-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button onClick={() => setQuantity(quantity + 1)} className="px-3 py-2 hover:bg-card transition-colors">
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Summary helpers */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-body text-muted-foreground">
          {summary.lowestTotal !== null && (
            <span className="flex items-center gap-1.5">
              <ShoppingCart className="h-3.5 w-3.5" />
              Lowest total: <strong className="text-foreground font-display">€{summary.lowestTotal.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</strong>
            </span>
          )}
          {summary.fastestDelivery !== null && (
            <span className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              Fastest: <strong className="text-foreground font-display">{summary.fastestDelivery} days</strong>
            </span>
          )}
          {summary.bestStockIndex !== null && (
            <span className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" />
              Best stock: <strong className="text-foreground font-display">
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
              <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">Supplier</th>
              <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">Origin</th>
              <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">Unit price</th>
              <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">Total</th>
              <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">Stock</th>
              <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">Fit</th>
              <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">Delivery</th>
              <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer, index) => {
              const stock = STOCK_CONFIG[offer.stock_status] || STOCK_CONFIG.available;
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
                          <span className="font-display font-semibold text-foreground text-xs">
                            {displayName}
                          </span>
                          {index === summary.bestStockIndex && (
                            <span className="text-[9px] font-display font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                              Best match
                            </span>
                          )}
                        </div>
                        {offer.partner?.partner_type && (
                          <p className="text-[10px] text-muted-foreground capitalize">
                            {isAdmin
                              ? `${offer.partner.name} · ${getPartnerTypeLabel(offer.partner.partner_type)}`
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
                    <span className="font-display font-bold text-foreground">
                      {offer.price ? `€${offer.price.toFixed(2)}` : "On request"}
                    </span>
                  </td>
                  <td className="py-4">
                    <span className="font-display font-bold text-foreground">
                      {total !== null ? `€${total.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}` : "—"}
                    </span>
                  </td>
                  {/* Stock */}
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${stock.dot}`} />
                      <span className="text-xs">{stock.label}</span>
                      {offer.stock_quantity != null && (
                        <span className="text-[10px] text-muted-foreground">({offer.stock_quantity})</span>
                      )}
                    </div>
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
                      <OfferAction fit={fit} offer={offer} quantity={quantity} onAddToCart={(o) => handleAddToCart(o, index)} />
                      <FitHelperText fit={fit} offer={offer} quantity={quantity} />
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
          const stock = STOCK_CONFIG[offer.stock_status] || STOCK_CONFIG.available;
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
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span>{flag}</span>
                      <span>{offer.partner?.country || "—"}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-display font-bold text-foreground text-sm">
                    {offer.price ? `€${offer.price.toFixed(2)}` : "On request"}
                  </span>
                  {total !== null && (
                    <p className="text-[10px] text-muted-foreground">
                      Total: €{total.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${stock.dot}`} /> {stock.label}
                </span>
                {offer.delivery_delay_days && (
                  <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> {offer.delivery_delay_days}d</span>
                )}
                <FitBadge fit={fit} />
              </div>
              <div className="flex items-start gap-2">
                <div className="flex-1 flex flex-col gap-1">
                  <OfferAction fit={fit} offer={offer} quantity={quantity} onAddToCart={(o) => handleAddToCart(o, index)} />
                  <FitHelperText fit={fit} offer={offer} quantity={quantity} />
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
            Supplier identities are disclosed after order confirmation through Terrassea. This ensures you get the best negotiated rates and dedicated sourcing support.
          </p>
        </div>
      )}
    </section>
  );
};

export default VendorOffers;
