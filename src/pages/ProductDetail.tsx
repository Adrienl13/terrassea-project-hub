import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft, Plus, FileText, Shield, Sun, CloudRain, Flame, Feather,
  Wrench, Palette, Package, Truck, ChevronRight, Info, BarChart3,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import VendorOffers from "@/components/products/VendorOffers";
import { fetchProductById, fetchProducts, type DBProduct } from "@/lib/products";
import { fetchProductOffers } from "@/lib/productOffers";
import { useProjectCart } from "@/contexts/ProjectCartContext";
import { useCompare } from "@/contexts/CompareContext";
import { toast } from "sonner";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { addItem } = useProjectCart();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProductById(id!),
    enabled: !!id,
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 px-6 container mx-auto animate-pulse">
          <div className="h-6 w-32 bg-card rounded mb-8" />
          <div className="grid md:grid-cols-2 gap-10">
            <div className="aspect-square bg-card rounded-sm" />
            <div className="space-y-4">
              <div className="h-8 bg-card rounded w-3/4" />
              <div className="h-4 bg-card rounded w-1/2" />
              <div className="h-20 bg-card rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 px-6 container mx-auto text-center py-20">
          <p className="text-muted-foreground font-body">Product not found.</p>
          <Link to="/products" className="text-sm font-display font-semibold text-foreground underline mt-4 inline-block">
            Back to products
          </Link>
        </div>
      </div>
    );
  }

  const handleAdd = () => {
    addItem(product);
    toast.success(`${product.name} added to your project`);
  };

  // Related products: same category, exclude self
  const similar = allProducts
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  // Complementary: different category, matching style or use_case
  const complementary = allProducts
    .filter(
      (p) =>
        p.category !== product.category &&
        p.id !== product.id &&
        (p.style_tags.some((t) => product.style_tags.includes(t)) ||
          p.use_case_tags.some((t) => product.use_case_tags.includes(t)))
    )
    .slice(0, 4);

  const proFeatures = [
    product.is_chr_heavy_use && { icon: Shield, label: "Heavy-duty CHR use" },
    product.is_outdoor && { icon: Sun, label: "Suitable for outdoor terrace" },
    product.uv_resistant && { icon: Sun, label: "UV resistant" },
    product.weather_resistant && { icon: CloudRain, label: "Weather resistant" },
    product.fire_retardant && { icon: Flame, label: "Fire retardant" },
    product.lightweight && { icon: Feather, label: "Lightweight structure" },
    product.easy_maintenance && { icon: Wrench, label: "Easy maintenance" },
    product.is_stackable && { icon: Package, label: "Stackable" },
    product.customizable && { icon: Palette, label: "Customizable" },
  ].filter(Boolean) as { icon: any; label: string }[];

  const dimensions = [
    product.dimensions_length_cm && `L ${product.dimensions_length_cm} cm`,
    product.dimensions_width_cm && `W ${product.dimensions_width_cm} cm`,
    product.dimensions_height_cm && `H ${product.dimensions_height_cm} cm`,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        {/* Breadcrumb */}
        <div className="px-6 container mx-auto mb-6">
          <nav className="flex items-center gap-2 text-xs font-body text-muted-foreground">
            <Link to="/products" className="hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Products
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="capitalize">{product.category}</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">{product.name}</span>
          </nav>
        </div>

        {/* Product main */}
        <section className="px-6">
          <div className="container mx-auto">
            <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
              {/* Images */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="aspect-square overflow-hidden bg-card rounded-sm mb-4">
                  <img
                    src={product.image_url || "/placeholder.svg"}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                {product.gallery_urls.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {product.gallery_urls.slice(0, 4).map((url, i) => (
                      <div key={i} className="aspect-square overflow-hidden bg-card rounded-sm">
                        <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Info */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="space-y-6"
              >
                {/* Header */}
                <div>
                  {product.brand_source && (
                    <p className="text-[10px] font-body uppercase tracking-[0.2em] text-muted-foreground mb-1">
                      {product.brand_source}
                    </p>
                  )}
                  <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                    {product.name}
                  </h1>
                  {product.collection && (
                    <p className="text-xs text-muted-foreground font-body mt-1">
                      Collection: {product.collection}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-lg font-display font-bold text-foreground">
                      {product.indicative_price || "Price on request"}
                    </span>
                    <StockBadge status={product.stock_status} />
                  </div>
                  {product.estimated_delivery_days && (
                    <p className="text-xs text-muted-foreground font-body mt-1 flex items-center gap-1">
                      <Truck className="h-3 w-3" />
                      Estimated delivery: {product.estimated_delivery_days} days
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <p className="text-sm text-foreground/80 font-body leading-relaxed">
                    {product.short_description}
                  </p>
                  {product.long_description && (
                    <p className="text-sm text-muted-foreground font-body leading-relaxed mt-3">
                      {product.long_description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-6 py-3 text-sm font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
                  >
                    <Plus className="h-4 w-4" />
                    Add to project
                  </button>
                  <button className="flex items-center gap-2 px-6 py-3 text-sm font-display font-semibold border border-foreground text-foreground rounded-full hover:bg-foreground hover:text-primary-foreground transition-all">
                    Request a quote
                  </button>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {product.style_tags.map((t) => (
                    <span key={t} className="text-[10px] font-body text-muted-foreground bg-card border border-border rounded-full px-2.5 py-1 capitalize">
                      {t}
                    </span>
                  ))}
                  {product.material_tags.map((t) => (
                    <span key={t} className="text-[10px] font-body text-muted-foreground bg-card border border-border rounded-full px-2.5 py-1 capitalize">
                      {t}
                    </span>
                  ))}
                  {product.use_case_tags.map((t) => (
                    <span key={t} className="text-[10px] font-body text-muted-foreground bg-card border border-border rounded-full px-2.5 py-1 capitalize">
                      {t}
                    </span>
                  ))}
                </div>

                {/* Technical specs */}
                <div className="border-t border-border pt-6 space-y-4">
                  <h2 className="font-display text-sm font-bold text-foreground uppercase tracking-wider">
                    Technical specifications
                  </h2>
                  <div className="grid grid-cols-2 gap-3 text-xs font-body">
                    {product.category && <SpecRow label="Category" value={product.category} />}
                    {product.subcategory && <SpecRow label="Subcategory" value={product.subcategory} />}
                    {dimensions.length > 0 && <SpecRow label="Dimensions" value={dimensions.join(" × ")} />}
                    {product.seat_height_cm && <SpecRow label="Seat height" value={`${product.seat_height_cm} cm`} />}
                    {product.weight_kg && <SpecRow label="Weight" value={`${product.weight_kg} kg`} />}
                    {product.material_structure && <SpecRow label="Structure" value={product.material_structure} />}
                    {product.material_seat && <SpecRow label="Seat / Top" value={product.material_seat} />}
                    {product.main_color && <SpecRow label="Main color" value={product.main_color} />}
                    {product.available_colors.length > 0 && (
                      <SpecRow label="Available colors" value={product.available_colors.join(", ")} />
                    )}
                    {product.country_of_manufacture && <SpecRow label="Made in" value={product.country_of_manufacture} />}
                    {product.warranty && <SpecRow label="Warranty" value={product.warranty} />}
                    {product.requires_assembly && <SpecRow label="Assembly" value="Required" />}
                    {product.maintenance_info && <SpecRow label="Maintenance" value={product.maintenance_info} />}
                  </div>
                </div>

                {/* Professional info block */}
                {proFeatures.length > 0 && (
                  <div className="border border-border rounded-sm p-5 bg-card">
                    <h2 className="font-display text-xs font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Info className="h-3.5 w-3.5" />
                      Professional information
                    </h2>
                    <div className="grid grid-cols-2 gap-2">
                      {proFeatures.map(({ icon: Icon, label }) => (
                        <div key={label} className="flex items-center gap-2 text-xs font-body text-foreground/80">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          {label}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-[10px] text-muted-foreground font-body">
                        Recommended for: {product.use_case_tags.join(", ") || "professional use"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Documents */}
                {product.documents.length > 0 && (
                  <div className="border-t border-border pt-6">
                    <h2 className="font-display text-sm font-bold text-foreground uppercase tracking-wider mb-3">
                      Documents
                    </h2>
                    <div className="space-y-2">
                      {product.documents.map((doc: any, i: number) => (
                        <a
                          key={i}
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs font-body text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          {doc.name || `Document ${i + 1}`}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </section>

        {/* Similar products */}
        {similar.length > 0 && (
          <section className="px-6 mt-20">
            <div className="container mx-auto">
              <h2 className="font-display text-lg font-bold text-foreground mb-6">
                Similar products
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {similar.map((p) => (
                  <RelatedCard key={p.id} product={p} onAdd={() => { addItem(p); toast.success(`${p.name} added`); }} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Complementary products */}
        {complementary.length > 0 && (
          <section className="px-6 mt-16">
            <div className="container mx-auto">
              <h2 className="font-display text-lg font-bold text-foreground mb-2">
                Complementary products
              </h2>
              <p className="text-xs text-muted-foreground font-body mb-6">
                Products that pair well with {product.name}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {complementary.map((p) => (
                  <RelatedCard key={p.id} product={p} onAdd={() => { addItem(p); toast.success(`${p.name} added`); }} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground capitalize">{value}</span>
    </>
  );
}

function StockBadge({ status }: { status: string | null }) {
  const s = status || "available";
  const config: Record<string, { bg: string; text: string; label: string }> = {
    available: { bg: "bg-green-50", text: "text-green-700", label: "In stock" },
    low_stock: { bg: "bg-amber-50", text: "text-amber-700", label: "Low stock" },
    production: { bg: "bg-blue-50", text: "text-blue-700", label: "Production" },
    on_order: { bg: "bg-muted", text: "text-muted-foreground", label: "On order" },
    to_confirm: { bg: "bg-muted", text: "text-muted-foreground", label: "To confirm" },
  };
  const c = config[s] || config.available;
  return (
    <span className={`inline-flex text-[10px] font-body px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

function RelatedCard({ product, onAdd }: { product: DBProduct; onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="group"
    >
      <Link to={`/products/${product.id}`}>
        <div className="aspect-square overflow-hidden bg-card rounded-sm mb-3">
          <img
            src={product.image_url || "/placeholder.svg"}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
          />
        </div>
      </Link>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link to={`/products/${product.id}`}>
            <h3 className="font-display font-semibold text-xs text-foreground truncate hover:underline">
              {product.name}
            </h3>
          </Link>
          <p className="text-xs font-display font-medium text-foreground mt-1">
            {product.indicative_price || "On request"}
          </p>
        </div>
        <button
          onClick={onAdd}
          className="flex-shrink-0 border border-border hover:border-foreground rounded-full p-1 transition-colors"
        >
          <Plus className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    </motion.div>
  );
}

export default ProductDetail;
