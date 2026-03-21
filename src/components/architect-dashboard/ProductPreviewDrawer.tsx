import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  X, ExternalLink, Package, Sun, CloudRain, Shield, Flame,
  Feather, Wrench, Palette, Ruler, MapPin, Truck,
} from "lucide-react";
import { fetchProductById, type DBProduct } from "@/lib/products";
import { ml } from "@/lib/i18nFields";
import { fetchProductOffers } from "@/lib/productOffers";

interface ProductPreviewDrawerProps {
  productId: string | null;
  onClose: () => void;
}

export default function ProductPreviewDrawer({ productId, onClose }: ProductPreviewDrawerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product-preview", productId],
    queryFn: () => fetchProductById(productId!),
    enabled: !!productId,
  });

  const { data: offers = [] } = useQuery({
    queryKey: ["product-offers-preview", productId],
    queryFn: () => fetchProductOffers(productId!),
    enabled: !!productId,
  });

  if (!productId) return null;

  const handleGoToFull = () => {
    onClose();
    navigate(`/products/${productId}`);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-background border-l border-border shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <p className="font-display font-bold text-sm text-foreground">{t('preview.title')}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGoToFull}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-display font-semibold border border-border rounded-full hover:border-foreground hover:text-foreground text-muted-foreground transition-colors"
            >
              <ExternalLink className="h-3 w-3" /> {t('preview.fullPage')}
            </button>
            <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-5 space-y-4 animate-pulse">
              <div className="aspect-[4/3] bg-muted rounded-sm" />
              <div className="h-5 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
              <div className="h-20 bg-muted rounded" />
            </div>
          ) : !product ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-5">
              <Package className="h-8 w-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-body text-muted-foreground">{t('preview.notFound')}</p>
            </div>
          ) : (
            <div className="p-5 space-y-5">
              {/* Image */}
              <div className="aspect-[4/3] rounded-sm overflow-hidden border border-border bg-muted">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : product.gallery_urls?.[0] ? (
                  <img src={product.gallery_urls[0]} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-12 w-12 text-muted-foreground/20" />
                  </div>
                )}
              </div>

              {/* Name + category */}
              <div>
                <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{product.category}{product.subcategory ? ` · ${product.subcategory}` : ""}</p>
                <h3 className="font-display font-bold text-lg text-foreground mt-0.5">{product.name}</h3>
                {product.collection && (
                  <p className="text-[10px] font-body text-muted-foreground mt-0.5">Collection {product.collection}</p>
                )}
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-2">
                {product.price_min ? (
                  <>
                    <span className="text-lg font-display font-bold text-foreground">€{product.price_min}</span>
                    {product.price_max && product.price_max !== product.price_min && (
                      <span className="text-xs font-body text-muted-foreground">– €{product.price_max}</span>
                    )}
                    <span className="text-[10px] font-body text-muted-foreground">HT / unité</span>
                  </>
                ) : (
                  <span className="text-sm font-display font-semibold text-muted-foreground">{t('preview.onRequest')}</span>
                )}
              </div>

              {/* Description */}
              {ml(product, 'short_description') && (
                <p className="text-[11px] font-body text-foreground/80 leading-relaxed">{ml(product, 'short_description')}</p>
              )}

              {/* Key specs */}
              <div className="grid grid-cols-2 gap-2">
                {product.dimensions_length_cm && (
                  <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-sm">
                    <Ruler className="h-3 w-3 text-muted-foreground" />
                    <div>
                      <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('preview.dimensions')}</p>
                      <p className="text-[10px] font-body text-foreground">
                        {[product.dimensions_length_cm && `L${product.dimensions_length_cm}`, product.dimensions_width_cm && `l${product.dimensions_width_cm}`, product.dimensions_height_cm && `H${product.dimensions_height_cm}`].filter(Boolean).join(" × ")} cm
                      </p>
                    </div>
                  </div>
                )}
                {product.material_structure && (
                  <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-sm">
                    <Package className="h-3 w-3 text-muted-foreground" />
                    <div>
                      <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('preview.material')}</p>
                      <p className="text-[10px] font-body text-foreground capitalize">{product.material_structure}</p>
                    </div>
                  </div>
                )}
                {product.weight_kg && (
                  <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-sm">
                    <Feather className="h-3 w-3 text-muted-foreground" />
                    <div>
                      <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('preview.weight')}</p>
                      <p className="text-[10px] font-body text-foreground">{product.weight_kg} kg</p>
                    </div>
                  </div>
                )}
                {product.country_of_manufacture && (
                  <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-sm">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <div>
                      <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('preview.origin')}</p>
                      <p className="text-[10px] font-body text-foreground">{product.country_of_manufacture}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Pro features badges */}
              {(() => {
                const features = [
                  product.is_chr_heavy_use && { icon: Shield, label: t('preview.heavyDuty') },
                  product.is_outdoor && { icon: Sun, label: t('preview.outdoor') },
                  product.weather_resistant && { icon: CloudRain, label: t('preview.weatherResistant') },
                  product.is_stackable && { icon: Package, label: t('preview.stackable') },
                  product.customizable && { icon: Palette, label: t('preview.customizable') },
                  product.fire_retardant && { icon: Flame, label: t('preview.fireRetardant') },
                  product.easy_maintenance && { icon: Wrench, label: t('preview.easyMaintenance') },
                ].filter(Boolean) as { icon: any; label: string }[];

                if (features.length === 0) return null;
                return (
                  <div className="flex flex-wrap gap-1.5">
                    {features.map(({ icon: Icon, label }) => (
                      <span key={label} className="inline-flex items-center gap-1 text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-muted text-muted-foreground">
                        <Icon className="h-3 w-3" /> {label}
                      </span>
                    ))}
                  </div>
                );
              })()}

              {/* Available colors */}
              {product.available_colors.length > 0 && (
                <div>
                  <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{t('preview.colors')}</p>
                  <div className="flex flex-wrap gap-1">
                    {product.available_colors.slice(0, 12).map(color => (
                      <span key={color} className="text-[9px] font-body px-2 py-0.5 rounded-full border border-border text-muted-foreground capitalize">{color}</span>
                    ))}
                    {product.available_colors.length > 12 && (
                      <span className="text-[9px] font-body text-muted-foreground">+{product.available_colors.length - 12}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Offers summary */}
              {offers.length > 0 && (
                <div className="border border-border rounded-sm p-3">
                  <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    {t('preview.offers', { count: offers.length })}
                  </p>
                  <div className="space-y-1.5">
                    {offers.slice(0, 3).map((offer, i) => (
                      <div key={offer.id} className="flex items-center justify-between text-[10px] font-body">
                        <span className="text-muted-foreground">Fournisseur #{i + 1}</span>
                        <div className="flex items-center gap-2">
                          {offer.price && <span className="text-foreground font-semibold">€{offer.price}</span>}
                          {offer.delivery_delay_days && (
                            <span className="flex items-center gap-0.5 text-muted-foreground">
                              <Truck className="h-3 w-3" /> {offer.delivery_delay_days}j
                            </span>
                          )}
                          <span className={`text-[8px] font-display font-semibold uppercase px-1.5 py-0.5 rounded-full ${
                            offer.stock_status === "available" ? "bg-green-50 text-green-700" :
                            offer.stock_status === "low_stock" ? "bg-amber-50 text-amber-700" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {offer.stock_status === "available" ? "En stock" : offer.stock_status === "low_stock" ? "Stock limité" : offer.stock_status || "N/A"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border shrink-0">
          <button
            onClick={handleGoToFull}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
          >
            <ExternalLink className="h-3.5 w-3.5" /> {t('preview.goToProduct')}
          </button>
        </div>
      </div>
    </>
  );
}
