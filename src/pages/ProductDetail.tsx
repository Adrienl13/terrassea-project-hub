import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import QuoteRequestModal from "@/components/products/QuoteRequestModal";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft, Plus, FileText, Shield, Sun, CloudRain, Flame, Feather,
  Wrench, Palette, Package, Truck, ChevronRight, Info, BarChart3, Heart,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import VendorOffers from "@/components/products/VendorOffers";
import { fetchProductById, fetchProducts, type DBProduct } from "@/lib/products";
import { fetchProductOffers } from "@/lib/productOffers";
import { useProjectCart } from "@/contexts/ProjectCartContext";
import { useCompare } from "@/contexts/CompareContext";
import { useFavourites } from "@/contexts/FavouritesContext";
import { toast } from "sonner";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { addItem, items } = useProjectCart();
  const { addToCompare, isInCompare } = useCompare();
  const { isFavourite, toggleFavourite } = useFavourites();
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);

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

  const { data: offers = [] } = useQuery({
    queryKey: ["product-offers", id],
    queryFn: () => fetchProductOffers(id!),
    enabled: !!id,
  });

  // Compute offer-based stats (hooks before early returns)
  const lowestOfferPrice = useMemo(() => {
    const priced = offers.filter((o) => o.price !== null);
    if (priced.length === 0) return null;
    return Math.min(...priced.map((o) => o.price!));
  }, [offers]);

  const offersCount = offers.length;
  const fastestDelivery = useMemo(() => {
    const withDel = offers.filter((o) => o.delivery_delay_days !== null);
    if (withDel.length === 0) return null;
    return Math.min(...withDel.map((o) => o.delivery_delay_days!));
  }, [offers]);

  // Project-aware default quantity
  const projectQuantity = useMemo(() => {
    const cartItem = items.find((i) => i.product.id === id);
    return cartItem?.layoutSuggestedQuantity ?? cartItem?.quantity ?? 1;
  }, [items, id]);

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
          <p className="text-muted-foreground font-body">{t('productDetail.productNotFound')}</p>
          <Link to="/products" className="text-sm font-display font-semibold text-foreground underline mt-4 inline-block">
            {t('productDetail.backToProducts')}
          </Link>
        </div>
      </div>
    );
  }

  const handleAdd = () => {
    addItem(product);
    toast.success(`${product.name} ${t('success.addedToProject').toLowerCase()}`);
  };

  // Related products: same category, exclude self
  const similar = allProducts
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 6);

  // Complementary: different category, matching style or use_case
  const complementary = allProducts
    .filter(
      (p) =>
        p.category !== product.category &&
        p.id !== product.id &&
        (p.style_tags.some((t) => product.style_tags.includes(t)) ||
          p.use_case_tags.some((t) => product.use_case_tags.includes(t)))
    )
    .slice(0, 6);

  const proFeatures = [
    product.is_chr_heavy_use && { icon: Shield, label: t('productDetail.heavyDuty') },
    product.is_outdoor && { icon: Sun, label: t('productDetail.outdoorSuitable') },
    product.uv_resistant && { icon: Sun, label: t('productDetail.uvResistant') },
    product.weather_resistant && { icon: CloudRain, label: t('productDetail.weatherResistant') },
    product.fire_retardant && { icon: Flame, label: t('productDetail.fireRetardant') },
    product.lightweight && { icon: Feather, label: t('productDetail.lightweightStructure') },
    product.easy_maintenance && { icon: Wrench, label: t('productDetail.easyMaintenance') },
    product.is_stackable && { icon: Package, label: t('productDetail.stackable') },
    product.customizable && { icon: Palette, label: t('productDetail.customizable') },
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
              <ArrowLeft className="h-3 w-3" /> {t('nav.products')}
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
                      {t('productDetail.collection')}: {product.collection}
                    </p>
                  )}
                   <div className="flex items-center gap-3 mt-3">
                    <span className="text-lg font-display font-bold text-foreground">
                      {lowestOfferPrice !== null
                        ? `${t('productDetail.startingFrom')} €${lowestOfferPrice.toFixed(2)}`
                        : product.indicative_price || t('productDetail.onRequest')}
                    </span>
                    <StockBadge status={product.stock_status} />
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground font-body">
                    {offersCount > 0 && (
                      <span>{offersCount} {t('productDetail.sellers')}</span>
                    )}
                    {fastestDelivery !== null && (
                      <span className="flex items-center gap-1">
                        <Truck className="h-3 w-3" /> {t('productDetail.fromDays')} {fastestDelivery} {t('productDetail.fromDays') === 'From' ? 'days' : t('productDetail.fromDays') === 'Dès' ? 'jours' : 'días'}
                      </span>
                    )}
                  </div>
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
                    {t('actions.addToProject')}
                  </button>
                  <button
                    onClick={() => setQuoteModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 text-sm font-display font-semibold border border-foreground text-foreground rounded-full hover:bg-foreground hover:text-primary-foreground transition-all"
                  >
                    <FileText className="h-4 w-4" />
                    {t('actions.requestQuote')}
                  </button>
                   <button
                    onClick={() => addToCompare(product)}
                    disabled={isInCompare(product.id)}
                    className="flex items-center gap-2 px-4 py-3 text-sm font-display font-semibold border border-border text-muted-foreground rounded-full hover:border-foreground hover:text-foreground transition-all disabled:opacity-50"
                  >
                    <BarChart3 className="h-4 w-4" />
                    {isInCompare(product.id) ? t('productDetail.inCompare') : t('productDetail.compare')}
                  </button>
                  <button
                    onClick={() => toggleFavourite(product)}
                    className={`flex items-center gap-2 px-5 py-3 rounded-full border transition-all font-display font-semibold text-sm ${
                      isFavourite(product.id)
                        ? "bg-foreground text-primary-foreground border-foreground" 
                        : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${isFavourite(product.id) ? "fill-primary-foreground" : ""}`} />
                    {isFavourite(product.id) ? t('productDetail.saved') : t('productDetail.save')}
                  </button>
                </div>

                {/* Structured attributes */}
                <div className="space-y-3">
                  {product.style_tags.length > 0 && (
                    <div className="flex items-baseline gap-3">
                      <span className="text-[10px] font-body uppercase tracking-[0.15em] text-muted-foreground w-20 flex-shrink-0">{t('productDetail.style')}</span>
                      <span className="text-xs font-body text-foreground capitalize">{product.style_tags.join(" / ")}</span>
                    </div>
                  )}
                  {product.material_tags.length > 0 && (
                    <div className="flex items-baseline gap-3">
                      <span className="text-[10px] font-body uppercase tracking-[0.15em] text-muted-foreground w-20 flex-shrink-0">{t('productDetail.material')}</span>
                      <span className="text-xs font-body text-foreground capitalize">{product.material_tags.join(" / ")}</span>
                    </div>
                  )}
                  {product.use_case_tags.length > 0 && (
                    <div className="flex items-baseline gap-3">
                      <span className="text-[10px] font-body uppercase tracking-[0.15em] text-muted-foreground w-20 flex-shrink-0">{t('productDetail.suitableFor')}</span>
                      <span className="text-xs font-body text-foreground capitalize">{product.use_case_tags.join(" / ")}</span>
                    </div>
                  )}
                </div>

                {/* Technical specs */}
                <div className="border-t border-border pt-6 space-y-4">
                  <h2 className="font-display text-sm font-bold text-foreground uppercase tracking-wider">
                    {t('productDetail.technicalSpecs')}
                  </h2>
                  <div className="grid grid-cols-2 gap-3 text-xs font-body">
                    {product.category && <SpecRow label={t('productDetail.category')} value={product.category} />}
                    {product.subcategory && <SpecRow label={t('productDetail.subcategory')} value={product.subcategory} />}
                    {dimensions.length > 0 && <SpecRow label={t('productDetail.dimensions')} value={dimensions.join(" × ")} />}
                    {product.seat_height_cm && <SpecRow label={t('productDetail.seatHeight')} value={`${product.seat_height_cm} cm`} />}
                    {product.weight_kg && <SpecRow label={t('productDetail.weight')} value={`${product.weight_kg} kg`} />}
                    {product.material_structure && <SpecRow label={t('productDetail.structure')} value={product.material_structure} />}
                    {product.material_seat && <SpecRow label={t('productDetail.seatTop')} value={product.material_seat} />}
                    {product.main_color && <SpecRow label={t('productDetail.mainColor')} value={product.main_color} />}
                    {product.available_colors.length > 0 && (
                      <SpecRow label={t('productDetail.availableColors')} value={product.available_colors.join(", ")} />
                    )}
                    {product.country_of_manufacture && <SpecRow label={t('productDetail.madeIn')} value={product.country_of_manufacture} />}
                    {product.warranty && <SpecRow label={t('productDetail.warranty')} value={product.warranty} />}
                    {product.requires_assembly && <SpecRow label={t('productDetail.assembly')} value={t('productDetail.assemblyRequired')} />}
                    {product.maintenance_info && <SpecRow label={t('productDetail.maintenance')} value={product.maintenance_info} />}
                  </div>
                </div>

                {/* Professional info block */}
                {proFeatures.length > 0 && (
                  <div className="border border-border rounded-sm p-5 bg-card">
                    <h2 className="font-display text-xs font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Info className="h-3.5 w-3.5" />
                      {t('productDetail.professionalInfo')}
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
                        {t('productDetail.recommendedFor')}: {product.use_case_tags.join(", ") || t('productDetail.professionalUse')}
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

        {/* Vendor offers */}
        <section className="px-6 mt-4">
          <div className="container mx-auto">
            <VendorOffers offers={offers} product={product} defaultQuantity={projectQuantity} />
          </div>
        </section>


        {similar.length > 0 && (
          <section className="px-6 mt-20">
            <div className="container mx-auto">
              <h2 className="font-display text-lg font-bold text-foreground mb-6">
                Similar products
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {complementary.map((p) => (
                  <RelatedCard key={p.id} product={p} onAdd={() => { addItem(p); toast.success(`${p.name} added`); }} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
      <QuoteRequestModal
        open={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
        product={product}
        offers={offers}
        defaultQuantity={projectQuantity}
      />
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
  const STOCK_DOT: Record<string, { dot: string; label: string }> = {
    available:    { dot: "bg-green-500",       label: "In stock"     },
    low_stock:    { dot: "bg-amber-500",        label: "Low stock"    },
    production:   { dot: "bg-blue-500",         label: "Production"   },
    on_order:     { dot: "bg-muted-foreground", label: "On order"     },
    to_confirm:   { dot: "bg-muted-foreground", label: "To confirm"   },
    out_of_stock: { dot: "bg-red-500",          label: "Out of stock" },
  };
  const stock = STOCK_DOT[product.stock_status || "available"] ?? STOCK_DOT.available;

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
        <div className="min-w-0 flex-1">
          <Link to={`/products/${product.id}`}>
            <h3 className="font-display font-semibold text-xs text-foreground truncate hover:underline leading-tight">
              {product.name}
            </h3>
          </Link>
          <div className="flex items-center justify-between mt-1 gap-1">
            <p className="text-xs font-display font-medium text-foreground">
              {product.price_min != null
                ? `From €${product.price_min.toFixed(2)}`
                : product.indicative_price ?? (
                    <span className="text-muted-foreground font-normal">On request</span>
                  )}
            </p>
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${stock.dot}`}
              title={stock.label}
            />
          </div>
          {(product as any).offers_count > 0 && (
            <p className="text-[10px] text-muted-foreground font-body mt-0.5">
              {(product as any).offers_count} supplier{(product as any).offers_count > 1 ? "s" : ""}
            </p>
          )}
        </div>
        <button
          onClick={onAdd}
          className="flex-shrink-0 border border-border hover:border-foreground rounded-full p-1 transition-colors mt-0.5"
        >
          <Plus className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    </motion.div>
  );
}

export default ProductDetail;
