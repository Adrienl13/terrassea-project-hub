import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Package, Truck, ShoppingCart, FileText, MessageSquare,
  Minus, Plus, Zap, AlertTriangle, CheckCircle2, XCircle, Clock,
} from "lucide-react";
import type { ProductOffer } from "@/lib/productOffers";
import type { DBProduct } from "@/lib/products";
import { useProjectCart, type SelectedSupplier } from "@/contexts/ProjectCartContext";
import { toast } from "sonner";

interface VendorOffersProps {
  offers: ProductOffer[];
  product: DBProduct;
  defaultQuantity?: number;
}

const STOCK_CONFIG: Record<string, { dot: string; label: string }> = {
  available: { dot: "bg-green-500", label: "In stock" },
  low_stock: { dot: "bg-amber-500", label: "Low stock" },
  production: { dot: "bg-blue-500", label: "Production" },
  on_order: { dot: "bg-muted-foreground", label: "On order" },
  out_of_stock: { dot: "bg-destructive", label: "Out of stock" },
};

type QuantityFit =
  | "full_match"
  | "partial_stock"
  | "production_required"
  | "moq_not_met"
  | "out_of_stock";

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

  // No quantity info but status is available/low_stock
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

const VendorOffers = ({ offers, product, defaultQuantity = 1 }: VendorOffersProps) => {
  const [quantity, setQuantity] = useState(defaultQuantity);
  const { addItem, selectSupplier } = useProjectCart();

  // Summary computations (hooks before early return)
  const summary = useMemo(() => {
    if (offers.length === 0) return { lowestTotal: null, fastestDelivery: null, bestStockOffer: null };
    const priced = offers.filter((o) => o.price !== null);
    const lowestPrice = priced.length > 0
      ? Math.min(...priced.map((o) => o.price!))
      : null;
    const lowestTotal = lowestPrice !== null ? lowestPrice * quantity : null;

    const withDelivery = offers.filter((o) => o.delivery_delay_days !== null);
    const fastestDelivery = withDelivery.length > 0
      ? Math.min(...withDelivery.map((o) => o.delivery_delay_days!))
      : null;

    // Best stock match: offer whose stock_quantity best covers quantity
    let bestStockOffer: ProductOffer | null = null;
    let bestStockCover = -1;
    for (const o of offers) {
      const fit = evaluateQuantityFit(o, quantity);
      const cover = fit === "full_match" ? 2 : fit === "partial_stock" ? 1 : 0;
      if (cover > bestStockCover || (cover === bestStockCover && (o.price ?? Infinity) < (bestStockOffer?.price ?? Infinity))) {
        bestStockCover = cover;
        bestStockOffer = o;
      }
    }

    return { lowestTotal, fastestDelivery, bestStockOffer };
  }, [offers, quantity]);
  if (offers.length === 0) return null;

  const handleQuantityChange = (val: number) => {
    setQuantity(Math.max(1, val));
  };

  const handleAddToCart = (offer: ProductOffer) => {
    addItem(product, undefined, quantity);

    const supplier: SelectedSupplier = {
      offerId: offer.id,
      partnerId: offer.partner_id,
      partnerName: offer.partner?.name || "Unknown",
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
      <h2 className="font-display text-sm font-bold text-foreground uppercase tracking-wider mb-1">
        Available offers
      </h2>
      <p className="text-xs text-muted-foreground font-body mb-6">
        {offers.length} seller{offers.length !== 1 ? "s" : ""} offering {product.name}
      </p>

      {/* Quantity selector */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
        <div>
          <label className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
            Quantity needed
          </label>
          <div className="flex items-center gap-0 border border-border rounded-full overflow-hidden">
            <button
              onClick={() => handleQuantityChange(quantity - 1)}
              className="px-3 py-2 hover:bg-card transition-colors"
            >
              <Minus className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
              className="w-16 text-center text-sm font-display font-bold bg-transparent border-x border-border py-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              onClick={() => handleQuantityChange(quantity + 1)}
              className="px-3 py-2 hover:bg-card transition-colors"
            >
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Purchase summary helpers */}
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
          {summary.bestStockOffer && (
            <span className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" />
              Best stock: <strong className="text-foreground font-display">{summary.bestStockOffer.partner?.name}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm font-body">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">Seller</th>
              <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">Unit price</th>
              <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">Total</th>
              <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">Stock</th>
              <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">Fit</th>
              <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">Delivery</th>
              <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => {
              const stock = STOCK_CONFIG[offer.stock_status] || STOCK_CONFIG.available;
              const fit = evaluateQuantityFit(offer, quantity);
              const total = offer.price !== null ? offer.price * quantity : null;
              return (
                <tr key={offer.id} className="border-b border-border/50 last:border-0">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      {offer.partner?.logo_url ? (
                        <img src={offer.partner.logo_url} alt="" className="w-8 h-8 rounded-full object-cover bg-card" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-card flex items-center justify-center text-xs font-display font-bold text-muted-foreground">
                          {offer.partner?.name?.charAt(0) || "?"}
                        </div>
                      )}
                      <div>
                        <Link
                          to={`/partners/${offer.partner?.slug}`}
                          className="font-display font-semibold text-foreground text-xs hover:underline"
                        >
                          {offer.partner?.name}
                        </Link>
                        <p className="text-[10px] text-muted-foreground capitalize">
                          {offer.partner?.partner_type} · {offer.partner?.country}
                        </p>
                      </div>
                    </div>
                  </td>
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
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${stock.dot}`} />
                      <span className="text-xs">{stock.label}</span>
                      {offer.stock_quantity != null && (
                        <span className="text-[10px] text-muted-foreground">({offer.stock_quantity})</span>
                      )}
                    </div>
                  </td>
                  <td className="py-4">
                    <FitBadge fit={fit} />
                  </td>
                  <td className="py-4 text-xs text-muted-foreground">
                    {offer.delivery_delay_days ? `${offer.delivery_delay_days} days` : "—"}
                  </td>
                  <td className="py-4">
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        <OfferAction fit={fit} offer={offer} quantity={quantity} onAddToCart={handleAddToCart} />
                        <button className="p-1.5 border border-border rounded-full hover:border-foreground transition-colors" title="Contact seller">
                          <MessageSquare className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </div>
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
        {offers.map((offer) => {
          const stock = STOCK_CONFIG[offer.stock_status] || STOCK_CONFIG.available;
          const fit = evaluateQuantityFit(offer, quantity);
          const total = offer.price !== null ? offer.price * quantity : null;
          return (
            <div key={offer.id} className="border border-border rounded-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-card flex items-center justify-center text-[10px] font-display font-bold text-muted-foreground">
                    {offer.partner?.name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <Link to={`/partners/${offer.partner?.slug}`} className="font-display font-semibold text-xs text-foreground hover:underline">
                      {offer.partner?.name}
                    </Link>
                    <p className="text-[10px] text-muted-foreground capitalize">{offer.partner?.partner_type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-display font-bold text-foreground text-sm">
                    {offer.price ? `€${offer.price.toFixed(2)}` : "On request"}
                  </span>
                  {total !== null && (
                    <p className="text-[10px] text-muted-foreground">Total: €{total.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</p>
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
              <div className="flex gap-2">
                <div className="flex-1 flex flex-col gap-1">
                  <OfferAction fit={fit} offer={offer} quantity={quantity} onAddToCart={handleAddToCart} />
                  <FitHelperText fit={fit} offer={offer} quantity={quantity} />
                </div>
                <button className="p-2 border border-border rounded-full hover:border-foreground transition-colors self-start">
                  <MessageSquare className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default VendorOffers;
