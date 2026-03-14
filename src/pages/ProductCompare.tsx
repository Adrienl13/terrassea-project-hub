import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, X, Plus, Check } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCompare } from "@/contexts/CompareContext";
import { useProjectCart } from "@/contexts/ProjectCartContext";
import { toast } from "sonner";
import type { DBProduct } from "@/lib/products";

const COMPARE_ROWS: { label: string; getValue: (p: DBProduct) => string }[] = [
  { label: "Category", getValue: (p) => p.category },
  { label: "Subcategory", getValue: (p) => p.subcategory || "—" },
  { label: "Brand", getValue: (p) => p.brand_source || "—" },
  { label: "Collection", getValue: (p) => p.collection || "—" },
  {
    label: "Dimensions",
    getValue: (p) => {
      const parts = [
        p.dimensions_length_cm && `L${p.dimensions_length_cm}`,
        p.dimensions_width_cm && `W${p.dimensions_width_cm}`,
        p.dimensions_height_cm && `H${p.dimensions_height_cm}`,
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(" × ") + " cm" : "—";
    },
  },
  { label: "Seat height", getValue: (p) => p.seat_height_cm ? `${p.seat_height_cm} cm` : "—" },
  { label: "Weight", getValue: (p) => p.weight_kg ? `${p.weight_kg} kg` : "—" },
  { label: "Structure", getValue: (p) => p.material_structure || p.material_tags.join(", ") || "—" },
  { label: "Seat / Top", getValue: (p) => p.material_seat || "—" },
  { label: "Main color", getValue: (p) => p.main_color || "—" },
  { label: "Stackable", getValue: (p) => p.is_stackable ? "Yes" : "No" },
  { label: "Outdoor", getValue: (p) => p.is_outdoor ? "Yes" : "No" },
  { label: "UV resistant", getValue: (p) => p.uv_resistant ? "Yes" : "No" },
  { label: "Weather resistant", getValue: (p) => p.weather_resistant ? "Yes" : "No" },
  { label: "Fire retardant", getValue: (p) => p.fire_retardant ? "Yes" : "No" },
  { label: "Heavy-duty CHR", getValue: (p) => p.is_chr_heavy_use ? "Yes" : "No" },
  { label: "Easy maintenance", getValue: (p) => p.easy_maintenance ? "Yes" : "No" },
  { label: "Customizable", getValue: (p) => p.customizable ? "Yes" : "No" },
  { label: "Warranty", getValue: (p) => p.warranty || "—" },
  { label: "Country", getValue: (p) => p.country_of_manufacture || "—" },
  { label: "Stock", getValue: (p) => p.stock_status || "available" },
  { label: "Delivery", getValue: (p) => p.estimated_delivery_days ? `${p.estimated_delivery_days} days` : "—" },
  { label: "Price", getValue: (p) => p.indicative_price || "On request" },
];

const ProductCompare = () => {
  const { items, removeFromCompare } = useCompare();
  const { addItem } = useProjectCart();

  if (items.length < 2) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 px-6 container mx-auto text-center py-20">
          <p className="text-sm text-muted-foreground font-body mb-4">
            Select at least 2 products to compare.
          </p>
          <Link to="/products" className="text-sm font-display font-semibold text-foreground underline">
            Back to products
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const handleAdd = (product: DBProduct) => {
    addItem(product);
    toast.success(`${product.name} added to your project`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16 px-6">
        <div className="container mx-auto">
          <nav className="mb-6">
            <Link to="/products" className="flex items-center gap-1 text-xs font-body text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-3 w-3" /> Back to products
            </Link>
          </nav>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-2xl md:text-3xl font-bold text-foreground mb-8"
          >
            Product comparison
          </motion.h1>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              {/* Product headers */}
              <thead>
                <tr>
                  <th className="w-40 text-left" />
                  {items.map((product) => (
                    <th key={product.id} className="p-3 text-center align-top min-w-[180px]">
                      <div className="relative">
                        <button
                          onClick={() => removeFromCompare(product.id)}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-card border border-border flex items-center justify-center hover:border-foreground transition-colors"
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                        <Link to={`/products/${product.id}`}>
                          <div className="aspect-square w-full max-w-[160px] mx-auto overflow-hidden bg-card rounded-sm mb-3">
                            <img
                              src={product.image_url || "/placeholder.svg"}
                              alt={product.name}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                            />
                          </div>
                        </Link>
                        <Link to={`/products/${product.id}`} className="font-display font-semibold text-xs text-foreground hover:underline block">
                          {product.name}
                        </Link>
                        {product.brand_source && (
                          <p className="text-[10px] text-muted-foreground font-body mt-0.5">{product.brand_source}</p>
                        )}
                        <button
                          onClick={() => handleAdd(product)}
                          className="mt-2 inline-flex items-center gap-1 text-[10px] font-display font-semibold border border-foreground text-foreground rounded-full px-3 py-1.5 hover:bg-foreground hover:text-primary-foreground transition-all"
                        >
                          <Plus className="h-3 w-3" /> Add to project
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row, i) => (
                  <tr key={row.label} className={i % 2 === 0 ? "bg-card/50" : ""}>
                    <td className="px-3 py-2.5 text-[10px] font-body uppercase tracking-wider text-muted-foreground">
                      {row.label}
                    </td>
                    {items.map((product) => {
                      const value = row.getValue(product);
                      const isYes = value === "Yes";
                      const isNo = value === "No";
                      return (
                        <td key={product.id} className="px-3 py-2.5 text-center text-xs font-body text-foreground">
                          {isYes ? (
                            <Check className="h-4 w-4 text-green-600 mx-auto" />
                          ) : isNo ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span className="capitalize">{value}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProductCompare;
