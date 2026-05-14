import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ml } from "@/lib/i18nFields";
import SEO from "@/components/SEO";
import QuoteRequestModal from "@/components/products/QuoteRequestModal";
import ColorVariantSelector from "@/components/products/ColorVariantSelector";
import DimensionVariantSelector from "@/components/products/DimensionVariantSelector";
import VariantSelector from "@/components/products/VariantSelector";
import { fetchProductVariantsByProductId, defaultVariantOf, type DBProductVariant } from "@/lib/productVariants";
import { useParams, Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft, Plus, FileText, Shield, Sun, CloudRain, Flame, Feather,
  Wrench, Palette, Package, Truck, ChevronRight, Info, BarChart3, Heart,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductGallery from "@/components/products/ProductGallery";
import VendorOffers from "@/components/products/VendorOffers";
import CompatibleProducts from "@/components/products/CompatibleProducts";
import ProductCertificationsPublic from "@/components/products/ProductCertificationsPublic";
import ProductCertificationBadges from "@/components/products/ProductCertificationBadges";
import { fetchProductById, type DBProduct } from "@/lib/products";
import { resolveProductBySlugs, urlForProduct } from "@/lib/productRoutes";
import ProductSchemaOrg from "@/components/seo/ProductSchemaOrg";
import { fetchProductOffers } from "@/lib/productOffers";
import { useProductArrivals } from "@/hooks/useArrivals";
import { useProjectCart } from "@/contexts/ProjectCartContext";
import { useCompare } from "@/contexts/CompareContext";
import { useProductReviews } from "@/hooks/useProductReviews";
import ProductReviews from "@/components/products/ProductReviews";
import { useFavourites } from "@/contexts/FavouritesContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AddToProjectModal from "@/components/architect-dashboard/AddToProjectModal";
import { toast } from "sonner";

const ProductDetail = () => {
  // ÉTAPE 9b-2a : route /products/:brandSlug/:productSlug (canonical) OR
  // legacy /products/:id (UUID, redirected to canonical at runtime).
  const params = useParams<{ id?: string; brandSlug?: string; productSlug?: string }>();
  const { id, brandSlug, productSlug } = params;
  const isLegacyRoute = !!id && !brandSlug && !productSlug;
  const isCanonicalRoute = !!brandSlug && !!productSlug;

  const { t, i18n } = useTranslation();
  const { addItem, items } = useProjectCart();
  const { addToCompare, isInCompare } = useCompare();
  const { isFavourite, toggleFavourite } = useFavourites();
  const { user, profile } = useAuth();
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null);
  // ÉTAPE 9a — sélection de la variante Modèle B (par id)
  const [selectedModelBVariantId, setSelectedModelBVariantId] = useState<string | null>(null);
  const isArchitect = profile?.user_type === "architect";

  const { data: product, isLoading } = useQuery({
    queryKey: isCanonicalRoute
      ? ["product-by-slugs", brandSlug, productSlug]
      : ["product", id],
    queryFn: () =>
      isCanonicalRoute
        ? resolveProductBySlugs(brandSlug!, productSlug!)
        : fetchProductById(id!),
    enabled: isCanonicalRoute || !!id,
  });

  // ÉTAPE 9b-2a : si la route est legacy /products/:id, rediriger vers
  // l'URL canonique /products/:brandSlug/:productSlug une fois product +
  // partner chargés. Pas de "vrai" 301 HTTP côté client (Phase 2 via Vercel
  // ou prerender), mais Navigate replace assure la cohérence UX.
  const { data: ownerPartner } = useQuery({
    queryKey: ["product-owner-partner", product?.owner_brand_id, product?.partner_id],
    queryFn: async () => {
      const ownerId = product?.owner_brand_id ?? product?.partner_id;
      if (!ownerId) return null;
      const { data } = await supabase
        .from("partners")
        .select("slug, name")
        .eq("id", ownerId)
        .maybeSingle();
      return data;
    },
    enabled: !!product,
  });

  // Effective product id: legacy `:id` URL param OR resolved product.id from
  // canonical slug route. Used by all downstream useQueries.
  const productId = id ?? product?.id;

  // ÉTAPE 9a — fetch les variants Modèle B (avec commission appliquée)
  const { data: modelBVariants = [] } = useQuery<DBProductVariant[]>({
    queryKey: ["product-variants", productId],
    queryFn: () => fetchProductVariantsByProductId(productId!),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });

  // Sélection initiale : la variant default si disponible, sinon la première
  useEffect(() => {
    if (modelBVariants.length > 0 && selectedModelBVariantId === null) {
      const defaultV = defaultVariantOf(modelBVariants);
      if (defaultV) setSelectedModelBVariantId(defaultV.id);
    }
  }, [modelBVariants, selectedModelBVariantId]);

  const selectedModelBVariant = useMemo<DBProductVariant | null>(() => {
    if (!selectedModelBVariantId) return null;
    return modelBVariants.find((v) => v.id === selectedModelBVariantId) ?? null;
  }, [modelBVariants, selectedModelBVariantId]);

  // Fetch only similar products (same category) — NOT the full 2000-product catalog
  const { data: similarProducts = [] } = useQuery({
    queryKey: ["similar-products", product?.category, productId],
    queryFn: async () => {
      if (!product) return [];
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("publish_status", "published")
        .is("duplicate_of", null)
        .eq("category", product.category)
        .neq("id", product.id)
        .order("priority_score", { ascending: false })
        .limit(12);
      return (data ?? []) as unknown as DBProduct[];
    },
    enabled: !!product,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch complementary products (different category, matching style)
  const { data: complementaryProducts = [] } = useQuery({
    queryKey: ["complementary-products", product?.style_tags, product?.category, productId],
    queryFn: async () => {
      if (!product || product.style_tags.length === 0) return [];
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("publish_status", "published")
        .is("duplicate_of", null)
        .neq("category", product.category)
        .neq("id", product.id)
        .overlaps("style_tags", product.style_tags)
        .order("priority_score", { ascending: false })
        .limit(12);
      return (data ?? []) as unknown as DBProduct[];
    },
    enabled: !!product,
    staleTime: 5 * 60 * 1000,
  });

  const { data: offers = [] } = useQuery({
    queryKey: ["product-offers", productId],
    queryFn: () => fetchProductOffers(productId!),
    enabled: !!productId,
  });

  const { arrivals } = useProductArrivals(productId);
  const { stats: reviewStats } = useProductReviews(productId);

  const isAdmin = profile?.user_type === "admin";
  const { data: currentPartner } = useQuery({
    queryKey: ["my-partner-id", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("partners").select("id").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id && profile?.user_type === "partner",
    staleTime: 5 * 60 * 1000,
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

  // Auto-select first color variant if product has variants and none selected
  const effectiveVariant = useMemo(() => {
    if (selectedVariant) return selectedVariant;
    if (!product) return null;
    const variants = product.color_variants ?? [];
    if (variants.length > 0) {
      const mainMatch = variants.find(v => v.color_slug === product.main_color);
      return mainMatch?.color_slug ?? variants[0].color_slug;
    }
    return null;
  }, [product, selectedVariant]);

  // ÉTAPE 9b-3 : JSON-LD injection now lives in <ProductSchemaOrg>, rendered
  // conditionally below once `product` is loaded. ProductGroup with hasVariant
  // is emitted automatically when modelBVariants.length > 1.

  // ÉTAPE 9b-2a — legacy /products/:id → canonical redirect.
  // Placé après tous les hooks pour respecter rules-of-hooks.
  if (isLegacyRoute && product && ownerPartner?.slug && product.product_slug) {
    return <Navigate to={urlForProduct(product, ownerPartner.slug)} replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-20 md:pt-24 px-6 container mx-auto animate-pulse">
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
        <div className="pt-20 md:pt-24 px-6 container mx-auto text-center py-20">
          <p className="text-muted-foreground font-body">{t('productDetail.productNotFound')}</p>
          <Link to="/products" className="text-sm font-display font-semibold text-foreground underline mt-4 inline-block">
            {t('productDetail.backToProducts')}
          </Link>
        </div>
      </div>
    );
  }

  // Block draft products for non-admin / non-owner
  const isProductOwner = !!(currentPartner?.id && product.partner_id && currentPartner.id === product.partner_id);
  if (product.publish_status !== "published" && !isAdmin && !isProductOwner) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-20 md:pt-24 px-6 container mx-auto text-center py-20">
          <p className="text-muted-foreground font-body">{t('productDetail.productNotFound')}</p>
          <Link to="/products" className="text-sm font-display font-semibold text-foreground underline mt-4 inline-block">
            {t('productDetail.backToProducts')}
          </Link>
        </div>
      </div>
    );
  }

  const localName = ml(product, "name");

  // Determine displayed image based on selected color variant
  const activeVariant = product.color_variants.find((v) => v.color_slug === effectiveVariant);
  const handleAdd = () => {
    if (isArchitect) {
      setProjectModalOpen(true);
      return;
    }
    addItem(
      product,
      undefined,
      undefined,
      undefined,
      effectiveVariant ?? undefined,
      selectedDimension ?? undefined,
      selectedModelBVariantId ?? undefined,
    );
    toast.success(`${localName} ${t('success.addedToProject').toLowerCase()}`);
  };

  const handleArchitectAddConfirm = (projectId: string, projectName: string, zoneName?: string) => {
    addItem(
      product,
      zoneName || projectName,
      undefined,
      undefined,
      undefined,
      selectedDimension ?? undefined,
      selectedModelBVariantId ?? undefined,
    );
    toast.success(`${localName} → ${projectName}${zoneName ? ` · ${zoneName}` : ""}`);
  };

  // Related products: already filtered server-side
  const similar = similarProducts.slice(0, 6);

  // Complementary: already filtered server-side, further refine by use_case overlap
  const complementary = complementaryProducts
    .filter(
      (p) =>
        p.style_tags.some((t) => product.style_tags.includes(t)) ||
        p.use_case_tags.some((t) => product.use_case_tags.includes(t))
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
      <SEO
        title={localName}
        description={ml(product, "short_description") || `${localName} — professional outdoor furniture available on Terrassea. Compare supplier offers and request quotes.`}
        image={product.image_url || undefined}
        type="product"
        url={`https://terrassea.com${urlForProduct(product, product.owner_brand_slug)}`}
      />
      <ProductSchemaOrg
        product={product}
        variants={modelBVariants}
        partnerName={(ownerPartner as { name?: string | null } | null)?.name ?? null}
        offerCount={offers.length}
        reviewStats={reviewStats}
      />
      <Header />
      <main className="pt-16 pb-12 md:pt-24 md:pb-16">
        {/* Breadcrumb */}
        <div className="px-6 container mx-auto mb-3 md:mb-6">
          <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs font-body text-muted-foreground">
            <Link to="/products" className="hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> {t('nav.products')}
            </Link>
            <ChevronRight className="h-3 w-3 flex-shrink-0" />
            <Link to={`/products?category=${encodeURIComponent(product.category)}`} className="hover:text-foreground transition-colors capitalize">{product.category}</Link>
            <ChevronRight className="h-3 w-3 flex-shrink-0" />
            <span className="text-foreground break-words min-w-0">{localName}</span>
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
                <ProductGallery
                  mainImage={product.image_url}
                  galleryUrls={product.gallery_urls}
                  environmentUrls={product.environment_urls}
                  selectedVariantImage={activeVariant?.image_url || null}
                  productName={localName}
                />
              </motion.div>

              {/* Info */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="space-y-4 md:space-y-6"
              >
                {/* Header */}
                <div>
                  {product.brand_source && (
                    <p className="text-[10px] font-body uppercase tracking-[0.2em] text-muted-foreground mb-1">
                      {product.brand_source}
                    </p>
                  )}
                  <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                    {localName}
                  </h1>
                  {product.collection && (
                   <p className="text-xs text-muted-foreground font-body mt-1">
                      {t('productDetail.collection')}: {product.collection}
                    </p>
                  )}
                  {/* ─── Modèle B variant selector (ÉTAPE 9a) ────────────
                       Si le product a 2+ variants Modèle B, on les affiche
                       en priorité. Les selectors legacy color/dimension ne
                       s'affichent que si modelBVariants <= 1 (backward compat
                       pour les 51/52 products avec 1 default unique). */}
                  {modelBVariants.length >= 2 ? (
                    <div className="mt-3">
                      <VariantSelector
                        variants={modelBVariants}
                        selectedId={selectedModelBVariantId}
                        onSelect={setSelectedModelBVariantId}
                      />
                    </div>
                  ) : (
                    <>
                      {product.color_variants.length > 1 && (
                        <div className="mt-3">
                          <ColorVariantSelector
                            variants={product.color_variants}
                            selectedColor={effectiveVariant}
                            onSelectColor={setSelectedVariant}
                            size="md"
                          />
                        </div>
                      )}
                      {product.dimension_variants.length > 1 && (
                        <div className="mt-3">
                          <DimensionVariantSelector
                            variants={product.dimension_variants}
                            selectedDimension={selectedDimension}
                            onSelectDimension={setSelectedDimension}
                          />
                        </div>
                      )}
                    </>
                  )}
                   <div className="flex items-center gap-3 mt-3">
                    <span className="text-lg font-display font-bold text-foreground">
                      {(() => {
                        // ÉTAPE 9a — priorité au prix de la variante Modèle B sélectionnée
                        if (selectedModelBVariant?.price_eur != null) {
                          return `€${Number(selectedModelBVariant.price_eur).toFixed(2)}`;
                        }
                        // Fallback legacy : dimension_variants jsonb (avant Modèle B)
                        const dimVariant = selectedDimension
                          ? product.dimension_variants.find(v => v.dimension_tag === selectedDimension)
                          : null;
                        if (dimVariant) return `€${dimVariant.price.toFixed(2)}`;
                        if (lowestOfferPrice !== null) return `${t('productDetail.startingFrom')} €${lowestOfferPrice.toFixed(2)}`;
                        return product.indicative_price || t('productDetail.onRequest');
                      })()}
                    </span>
                    <StockBadge status={
                      // ÉTAPE 9a — priorité au stock de la variante Modèle B sélectionnée
                      selectedModelBVariant
                        ? (selectedModelBVariant.in_stock
                            ? "in_stock"
                            : selectedModelBVariant.is_made_to_order
                            ? "made_to_order"
                            : "out_of_stock")
                        : selectedDimension
                        ? (product.dimension_variants?.find((v: any) => v.dimension_tag === selectedDimension)?.stock_status
                          ?? product.stock_status)
                        : (offers.length > 0 ? (offers[0].stock_status ?? product.stock_status) : product.stock_status)
                    } />
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground font-body">
                    {offersCount > 0 && (
                      <span>{offersCount} {t('productDetail.sellers')}</span>
                    )}
                    {fastestDelivery !== null && (
                      <span className="flex items-center gap-1">
                        <Truck className="h-3 w-3" /> {t('productDetail.deliveryDays', { count: fastestDelivery })}
                      </span>
                    )}
                  </div>
                  {(product.owner_brand_id || product.partner_id) && (
                    <ProductCertificationBadges
                      productId={product.id}
                      partnerId={product.owner_brand_id ?? product.partner_id ?? ""}
                    />
                  )}
                </div>

                {/* Description */}
                <div>
                  <p className="text-sm text-foreground/80 font-body leading-relaxed">
                    {ml(product, 'short_description')}
                  </p>
                  {ml(product, 'long_description') && (
                    <p className="text-sm text-muted-foreground font-body leading-relaxed mt-3">
                      {ml(product, 'long_description')}
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
                <div className="border-t border-border pt-4 md:pt-6 space-y-3 md:space-y-4">
                  <h2 className="font-display text-sm font-bold text-foreground uppercase tracking-wider">
                    {t('productDetail.technicalSpecs')}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-body">
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
                    {ml(product, 'maintenance_info') && <SpecRow label={t('productDetail.maintenance')} value={ml(product, 'maintenance_info')} />}
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
                   <div className="border-t border-border pt-4 md:pt-6">
                    <h2 className="font-display text-sm font-bold text-foreground uppercase tracking-wider mb-3">
                      {t('productDetail.documents')}
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

        {/* Certifications (brand-level + product-level) — anchored for badge scroll */}
        {(product.owner_brand_id || product.partner_id) && (
          <div id="certifications-section">
            <ProductCertificationsPublic
              productId={product.id}
              partnerId={product.owner_brand_id ?? product.partner_id ?? ""}
              partnerName={(ownerPartner as { name?: string | null } | null)?.name ?? null}
            />
          </div>
        )}

        {/* Vendor offers */}
        <section className="px-6 mt-4">
          <div className="container mx-auto">
            <VendorOffers offers={offers} product={product} defaultQuantity={projectQuantity} arrivals={arrivals} selectedColor={effectiveVariant} selectedDimension={selectedDimension} selectedModelBVariant={selectedModelBVariant} />
          </div>
        </section>

        {/* Customer reviews */}
        <ProductReviews productId={product.id} />

        {/* Compatible products */}
        <CompatibleProducts product={product} allProducts={[...similarProducts, ...complementaryProducts]} />

        {similar.length > 0 && (
          <section className="px-6 mt-20">
            <div className="container mx-auto">
              <h2 className="font-display text-lg font-bold text-foreground mb-6">
                {t('productDetail.similarProducts')}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {similar.map((p) => (
                  <RelatedCard key={p.id} product={p} onAdd={() => { addItem(p); toast.success(`${ml(p, "name")} added`); }} />
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
                {t('productDetail.complementaryProducts')}
              </h2>
              <p className="text-xs text-muted-foreground font-body mb-6">
                {t('productDetail.complementaryDesc')} {localName}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {complementary.map((p) => (
                  <RelatedCard key={p.id} product={p} onAdd={() => { addItem(p); toast.success(`${ml(p, "name")} added`); }} />
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
        selectedVariantId={selectedModelBVariant?.id}
      />
      {isArchitect && (
        <AddToProjectModal
          open={projectModalOpen}
          onClose={() => setProjectModalOpen(false)}
          product={product}
          quantity={projectQuantity}
          onConfirm={handleArchitectAddConfirm}
        />
      )}
    </div>
  );
};

function SpecRow({ label, value }: { label: string; value: string }) {
  // Mobile UX V2 — chaque ligne devient une rangée flex justify-between
  // pour éviter le pattern "label sur 1 ligne / value sur ligne suivante"
  // induit par grid-cols-1 mobile. Fonctionne aussi dans grid 2-cols desktop
  // (chaque SpecRow occupe une cellule, contenu flex à l'intérieur).
  return (
    <div className="flex justify-between items-baseline gap-3 py-1 border-b border-border/30 last:border-0 sm:py-0 sm:border-0">
      <span className="text-muted-foreground flex-shrink-0">{label}</span>
      <span className="text-foreground capitalize text-right sm:text-left break-words min-w-0">{value}</span>
    </div>
  );
}

const STOCK_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  available: { bg: "bg-green-50", text: "text-green-700", label: "En stock" },
  in_stock: { bg: "bg-green-50", text: "text-green-700", label: "En stock" },
  low_stock: { bg: "bg-amber-50", text: "text-amber-700", label: "Stock faible" },
  production: { bg: "bg-blue-50", text: "text-blue-700", label: "En production" },
  on_order: { bg: "bg-muted", text: "text-muted-foreground", label: "En commande" },
  out_of_stock: { bg: "bg-red-50", text: "text-red-700", label: "Rupture de stock" },
  to_confirm: { bg: "bg-muted", text: "text-muted-foreground", label: "À confirmer" },
};

function StockBadge({ status }: { status: string | null }) {
  const s = status || "available";
  const c = STOCK_CONFIG[s] || STOCK_CONFIG.available;
  return (
    <span className={`inline-flex text-[10px] font-body px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

function RelatedCard({ product, onAdd }: { product: DBProduct; onAdd: () => void }) {
  const relatedName = ml(product, "name");
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
      <Link to={urlForProduct(product, product.owner_brand_slug)}>
        <div className="aspect-[4/5] overflow-hidden bg-white rounded-sm mb-3">
          <img
            src={product.image_url || "/placeholder.svg"}
            alt={relatedName}
            className="w-full h-full object-contain p-3 mix-blend-multiply group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
          />
        </div>
      </Link>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link to={urlForProduct(product, product.owner_brand_slug)}>
            <h3 className="font-display font-semibold text-xs text-foreground truncate hover:underline leading-tight">
              {relatedName}
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
          {(product.offers_count ?? 0) > 0 && (
            <p className="text-[10px] text-muted-foreground font-body mt-0.5">
              {product.offers_count} supplier{(product.offers_count ?? 0) > 1 ? "s" : ""}
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
