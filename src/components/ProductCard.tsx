import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, BarChart3, Heart } from "lucide-react";
import type { DBProduct } from "@/lib/products";
import { useProjectCart } from "@/contexts/ProjectCartContext";
import { useCompare } from "@/contexts/CompareContext";
import { useFavourites } from "@/contexts/FavouritesContext";
import { toast } from "sonner";

const STOCK_DOT: Record<string, { dot: string; label: string }> = {
  available:    { dot: "bg-green-500",       label: "In stock"     },
  low_stock:    { dot: "bg-amber-500",        label: "Low stock"    },
  production:   { dot: "bg-blue-500",         label: "Production"   },
  on_order:     { dot: "bg-muted-foreground", label: "On order"     },
  to_confirm:   { dot: "bg-muted-foreground", label: "To confirm"   },
  out_of_stock: { dot: "bg-red-500",          label: "Out of stock" },
};

interface ProductCardProps {
  product: DBProduct;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const { addItem } = useProjectCart();
  const { addToCompare, isInCompare } = useCompare();
  const { isFavourite, toggleFavourite } = useFavourites();
  const inCompare = isInCompare(product.id);
  const fav = isFavourite(product.id);

  const stock = STOCK_DOT[product.stock_status || "available"] ?? STOCK_DOT.available;

  const priceDisplay = product.price_min != null
    ? `From €${product.price_min.toFixed(2)}`
    : product.indicative_price || null;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem(product);
    toast.success(`${product.name} added to your project`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
      className="group"
    >
      <Link to={`/products/${product.id}`} className="block">
        <div className="aspect-square overflow-hidden bg-card rounded-sm mb-4 relative">
          <img
            src={product.image_url || "/placeholder.svg"}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
          />
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavourite(product); }}
            className={`absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
              fav ? "bg-foreground" : "bg-white border border-gray-300"
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${fav ? "text-white fill-white" : "text-gray-500"}`} />
          </button>
          <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.preventDefault(); addToCompare(product); }}
              disabled={inCompare}
              className={`border rounded-full p-1.5 backdrop-blur-sm transition-colors ${
                inCompare
                  ? "border-foreground bg-foreground"
                  : "border-border bg-background/80 hover:border-foreground"
              }`}
              title={inCompare ? "In compare" : "Compare"}
            >
              <BarChart3 className={`h-3 w-3 ${inCompare ? "text-primary-foreground" : "text-muted-foreground"}`} />
            </button>
            <button
              onClick={handleAdd}
              className="border border-border bg-background/80 hover:border-foreground rounded-full p-1.5 backdrop-blur-sm transition-colors"
              title="Add to project"
            >
              <Plus className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        </div>
      </Link>

      <div className="space-y-1">
        <Link to={`/products/${product.id}`}>
          <h3 className="font-display font-semibold text-sm text-foreground truncate group-hover:underline">
            {product.name}
          </h3>
        </Link>
        {product.brand_source && (
          <p className="text-[11px] text-muted-foreground font-body truncate">
            {product.brand_source}
          </p>
        )}
        <div className="flex items-center justify-between gap-2 pt-1">
          <p className="text-sm font-display font-medium text-foreground">
            {priceDisplay ?? (
              <span className="text-muted-foreground text-xs">On request</span>
            )}
          </p>
          <span className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${stock.dot}`} />
            <span className="text-[10px] text-muted-foreground font-body">{stock.label}</span>
          </span>
        </div>
        {(product.offers_count ?? 0) > 0 && (
          <p className="text-[10px] text-muted-foreground font-body">
            {product.offers_count} supplier{(product.offers_count ?? 0) > 1 ? "s" : ""}
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default React.memo(ProductCard);
