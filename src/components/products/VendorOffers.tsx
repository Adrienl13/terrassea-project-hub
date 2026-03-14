import { Link } from "react-router-dom";
import { Package, Truck, ShoppingCart, FileText, MessageSquare } from "lucide-react";
import type { ProductOffer } from "@/lib/productOffers";

interface VendorOffersProps {
  offers: ProductOffer[];
  productName: string;
}

const STOCK_CONFIG: Record<string, { dot: string; label: string }> = {
  available: { dot: "bg-green-500", label: "In stock" },
  low_stock: { dot: "bg-amber-500", label: "Low stock" },
  production: { dot: "bg-blue-500", label: "Production" },
  on_order: { dot: "bg-muted-foreground", label: "On order" },
  out_of_stock: { dot: "bg-destructive", label: "Out of stock" },
};

const VendorOffers = ({ offers, productName }: VendorOffersProps) => {
  if (offers.length === 0) return null;

  return (
    <section className="border-t border-border pt-8 mt-8">
      <h2 className="font-display text-sm font-bold text-foreground uppercase tracking-wider mb-1">
        Available offers
      </h2>
      <p className="text-xs text-muted-foreground font-body mb-6">
        {offers.length} seller{offers.length !== 1 ? "s" : ""} offering {productName}
      </p>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm font-body">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">Seller</th>
              <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">Price</th>
              <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">Stock</th>
              <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">Delivery</th>
              <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal">Min. order</th>
              <th className="pb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-body font-normal text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => {
              const stock = STOCK_CONFIG[offer.stock_status] || STOCK_CONFIG.available;
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
                    {offer.currency !== "EUR" && offer.price && (
                      <span className="text-[10px] text-muted-foreground ml-1">{offer.currency}</span>
                    )}
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
                  <td className="py-4 text-xs text-muted-foreground">
                    {offer.delivery_delay_days ? `${offer.delivery_delay_days} days` : "—"}
                  </td>
                  <td className="py-4 text-xs text-muted-foreground">
                    {offer.minimum_order > 1 ? `${offer.minimum_order} units` : "—"}
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {offer.purchase_type === "direct" ? (
                        <button className="flex items-center gap-1.5 text-[10px] font-display font-semibold bg-foreground text-primary-foreground rounded-full px-3 py-1.5 hover:opacity-90 transition-opacity">
                          <ShoppingCart className="h-3 w-3" /> Add to cart
                        </button>
                      ) : (
                        <button className="flex items-center gap-1.5 text-[10px] font-display font-semibold border border-foreground text-foreground rounded-full px-3 py-1.5 hover:bg-foreground hover:text-primary-foreground transition-all">
                          <FileText className="h-3 w-3" /> Request quote
                        </button>
                      )}
                      <button className="p-1.5 border border-border rounded-full hover:border-foreground transition-colors" title="Contact seller">
                        <MessageSquare className="h-3 w-3 text-muted-foreground" />
                      </button>
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
                <span className="font-display font-bold text-foreground text-sm">
                  {offer.price ? `€${offer.price.toFixed(2)}` : "On request"}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${stock.dot}`} /> {stock.label}
                </span>
                {offer.delivery_delay_days && (
                  <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> {offer.delivery_delay_days}d</span>
                )}
              </div>
              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-1.5 text-[10px] font-display font-semibold border border-foreground text-foreground rounded-full px-3 py-2 hover:bg-foreground hover:text-primary-foreground transition-all">
                  <FileText className="h-3 w-3" /> {offer.purchase_type === "direct" ? "Add to cart" : "Request quote"}
                </button>
                <button className="p-2 border border-border rounded-full hover:border-foreground transition-colors">
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
