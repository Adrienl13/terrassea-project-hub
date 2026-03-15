import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Download, ExternalLink, Ruler, Weight, Layers, Sun, Droplets,
  Flame, Wind, Package, CheckCircle2, AlertTriangle, Clock, RefreshCw,
  Palette, Shield, Wrench, ArrowRightLeft,
} from "lucide-react";
import type { DBProduct } from "@/lib/products";
import SupplierRecommendations from "./SupplierRecommendations";

interface ProductDetailDrawerProps {
  product: DBProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quantity?: number;
  onAddToQuotation?: () => void;
  onReplaceVariant?: () => void;
  showSuppliers?: boolean;
}

// ── Availability logic ──

interface AvailabilityInfo {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: typeof CheckCircle2;
  description: string;
}

function getAvailability(product: DBProduct): AvailabilityInfo {
  const status = product.stock_status?.toLowerCase() || "available";
  const qty = product.stock_quantity;

  if (status === "out_of_stock" || status === "out of stock") {
    return {
      label: "Made to order",
      variant: "outline",
      icon: Clock,
      description: product.estimated_delivery_days
        ? `Lead time: ${Math.ceil(product.estimated_delivery_days / 7)}–${Math.ceil(product.estimated_delivery_days / 7) + 2} weeks`
        : "Lead time on request",
    };
  }

  if (status === "replenishment" || status === "restock") {
    return {
      label: "Replenishment in progress",
      variant: "secondary",
      icon: RefreshCw,
      description: product.estimated_delivery_days
        ? `Expected in ${Math.ceil(product.estimated_delivery_days / 7)} weeks`
        : "Restocking date to be confirmed",
    };
  }

  if (qty !== null && qty > 0 && qty <= 20) {
    return {
      label: "Low stock",
      variant: "secondary",
      icon: AlertTriangle,
      description: `${qty} units available`,
    };
  }

  if ((qty !== null && qty > 20) || status === "available" || status === "in_stock") {
    return {
      label: "In stock",
      variant: "default",
      icon: CheckCircle2,
      description: qty ? `${qty} units available` : "Available for immediate dispatch",
    };
  }

  return {
    label: "Availability on request",
    variant: "outline",
    icon: Package,
    description: "Contact us for availability details",
  };
}

// ── Dimension formatter ──

function formatDimensions(p: DBProduct): string | null {
  const parts: string[] = [];
  if (p.dimensions_length_cm) parts.push(`L ${p.dimensions_length_cm}`);
  if (p.dimensions_width_cm) parts.push(`W ${p.dimensions_width_cm}`);
  if (p.dimensions_height_cm) parts.push(`H ${p.dimensions_height_cm}`);
  return parts.length > 0 ? parts.join(" × ") + " cm" : null;
}

// ── Component ──

const ProductDetailDrawer = ({
  product,
  open,
  onOpenChange,
  quantity,
  onAddToQuotation,
  onReplaceVariant,
}: ProductDetailDrawerProps) => {
  if (!product) return null;

  const availability = getAvailability(product);
  const AvailIcon = availability.icon;
  const dims = formatDimensions(product);
  const leadTimeWeeks = product.estimated_delivery_days
    ? `${Math.ceil(product.estimated_delivery_days / 7)}–${Math.ceil(product.estimated_delivery_days / 7) + 2} weeks`
    : null;

  const techSpecs: { icon: typeof Ruler; label: string; value: string }[] = [];
  if (dims) techSpecs.push({ icon: Ruler, label: "Dimensions", value: dims });
  if (product.seat_height_cm) techSpecs.push({ icon: Ruler, label: "Seat height", value: `${product.seat_height_cm} cm` });
  if (product.weight_kg) techSpecs.push({ icon: Weight, label: "Weight", value: `${product.weight_kg} kg` });
  if (product.material_structure) techSpecs.push({ icon: Layers, label: "Structure", value: product.material_structure });
  if (product.material_seat) techSpecs.push({ icon: Layers, label: "Seat material", value: product.material_seat });
  if (product.table_shape) techSpecs.push({ icon: Ruler, label: "Shape", value: product.table_shape });
  if (product.country_of_manufacture) techSpecs.push({ icon: Package, label: "Made in", value: product.country_of_manufacture });
  if (product.warranty) techSpecs.push({ icon: Shield, label: "Warranty", value: product.warranty });

  const certifications: { icon: typeof Sun; label: string }[] = [];
  if (product.is_outdoor) certifications.push({ icon: Sun, label: "Outdoor use" });
  if (product.uv_resistant) certifications.push({ icon: Sun, label: "UV resistant" });
  if (product.weather_resistant) certifications.push({ icon: Droplets, label: "Weather resistant" });
  if (product.fire_retardant) certifications.push({ icon: Flame, label: "Fire retardant" });
  if (product.is_stackable) certifications.push({ icon: Layers, label: "Stackable" });
  if (product.lightweight) certifications.push({ icon: Wind, label: "Lightweight" });
  if (product.easy_maintenance) certifications.push({ icon: Wrench, label: "Easy maintenance" });
  if (product.dismountable) certifications.push({ icon: Wrench, label: "Dismountable" });
  if (product.is_chr_heavy_use) certifications.push({ icon: Shield, label: "CHR heavy use" });

  const allImages = [product.image_url, ...(product.gallery_urls || [])].filter(Boolean) as string[];

  const documents = Array.isArray(product.documents) ? product.documents : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0">
        <ScrollArea className="h-full">
          <div className="p-6">
            <SheetHeader className="mb-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <SheetTitle className="font-display text-xl font-bold text-foreground text-left">
                    {product.name}
                  </SheetTitle>
                  <p className="text-xs font-body text-muted-foreground mt-1">
                    {product.category}
                    {product.subcategory ? ` · ${product.subcategory}` : ""}
                    {product.collection ? ` · ${product.collection}` : ""}
                  </p>
                </div>
                {quantity && (
                  <div className="flex-shrink-0 text-center px-3 py-1.5 bg-muted rounded-sm">
                    <span className="font-display font-bold text-sm text-foreground block">{quantity}</span>
                    <span className="text-[9px] font-body uppercase tracking-wider text-muted-foreground">units</span>
                  </div>
                )}
              </div>
            </SheetHeader>

            {/* ── Images ── */}
            {allImages.length > 0 && (
              <div className="mb-6">
                <img
                  src={allImages[0]}
                  alt={product.name}
                  className="w-full aspect-[4/3] object-cover rounded-sm"
                />
                {allImages.length > 1 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto">
                    {allImages.slice(1, 5).map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`${product.name} ${i + 2}`}
                        className="w-16 h-16 object-cover rounded-sm flex-shrink-0 border border-border"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Availability Badge ── */}
            <div className="mb-6 p-4 bg-muted/50 rounded-sm">
              <div className="flex items-center gap-2 mb-1.5">
                <AvailIcon className="h-4 w-4" />
                <Badge variant={availability.variant} className="text-xs">
                  {availability.label}
                </Badge>
              </div>
              <p className="text-xs font-body text-muted-foreground">{availability.description}</p>
              {leadTimeWeeks && availability.label !== "In stock" && (
                <p className="text-xs font-body text-muted-foreground mt-1">
                  <Clock className="h-3 w-3 inline mr-1" />
                  Lead time: {leadTimeWeeks}
                </p>
              )}
              <p className="text-[10px] font-body text-muted-foreground/70 mt-2 italic">
                Availability subject to final confirmation
              </p>
            </div>

            {/* ── Description ── */}
            {(product.short_description || product.long_description) && (
              <>
                <p className="text-sm font-body text-foreground leading-relaxed mb-6">
                  {product.long_description || product.short_description}
                </p>
                <Separator className="mb-6" />
              </>
            )}

            {/* ── Technical Specs ── */}
            {techSpecs.length > 0 && (
              <div className="mb-6">
                <h3 className="text-[10px] font-body uppercase tracking-[0.2em] text-muted-foreground mb-3">
                  Technical Specifications
                </h3>
                <div className="space-y-2.5">
                  {techSpecs.map((spec, i) => {
                    const Icon = spec.icon;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs font-body text-muted-foreground min-w-[90px]">{spec.label}</span>
                        <span className="text-xs font-display font-semibold text-foreground">{spec.value}</span>
                      </div>
                    );
                  })}
                </div>
                <Separator className="mt-6" />
              </div>
            )}

            {/* ── Colors / Finishes ── */}
            {(product.available_colors.length > 0 || product.main_color) && (
              <div className="mb-6">
                <h3 className="text-[10px] font-body uppercase tracking-[0.2em] text-muted-foreground mb-3">
                  <Palette className="h-3 w-3 inline mr-1.5" />
                  Colors & Finishes
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {product.main_color && (
                    <Badge variant="outline" className="text-xs capitalize">
                      {product.main_color}
                    </Badge>
                  )}
                  {product.secondary_color && (
                    <Badge variant="outline" className="text-xs capitalize">
                      {product.secondary_color}
                    </Badge>
                  )}
                  {product.available_colors
                    .filter((c) => c !== product.main_color && c !== product.secondary_color)
                    .map((color) => (
                      <Badge key={color} variant="outline" className="text-xs capitalize">
                        {color}
                      </Badge>
                    ))}
                </div>
                <Separator className="mt-6" />
              </div>
            )}

            {/* ── Certifications & Properties ── */}
            {certifications.length > 0 && (
              <div className="mb-6">
                <h3 className="text-[10px] font-body uppercase tracking-[0.2em] text-muted-foreground mb-3">
                  Certifications & Properties
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {certifications.map((cert, i) => {
                    const CertIcon = cert.icon;
                    return (
                      <div
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-muted rounded-sm text-xs font-body text-foreground"
                      >
                        <CertIcon className="h-3 w-3 text-muted-foreground" />
                        {cert.label}
                      </div>
                    );
                  })}
                </div>
                <Separator className="mt-6" />
              </div>
            )}

            {/* ── Price ── */}
            {(product.indicative_price || product.price_min) && (
              <div className="mb-6">
                <h3 className="text-[10px] font-body uppercase tracking-[0.2em] text-muted-foreground mb-2">
                  Indicative Price
                </h3>
                <p className="text-lg font-display font-bold text-foreground">
                  {product.indicative_price || (
                    product.price_min && product.price_max
                      ? `€${product.price_min} – €${product.price_max}`
                      : product.price_min ? `From €${product.price_min}` : ""
                  )}
                </p>
                <Separator className="mt-6" />
              </div>
            )}

            {/* ── Documents ── */}
            {documents.length > 0 && (
              <div className="mb-6">
                <h3 className="text-[10px] font-body uppercase tracking-[0.2em] text-muted-foreground mb-3">
                  Technical Documents
                </h3>
                <div className="space-y-2">
                  {documents.map((doc: any, i: number) => (
                    <a
                      key={i}
                      href={doc.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-muted rounded-sm hover:bg-muted/80 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-body text-foreground">{doc.name || doc.label || "Specification sheet"}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
                    </a>
                  ))}
                </div>
                <Separator className="mt-6" />
              </div>
            )}

            {/* ── Maintenance ── */}
            {product.maintenance_info && (
              <div className="mb-6">
                <h3 className="text-[10px] font-body uppercase tracking-[0.2em] text-muted-foreground mb-2">
                  Maintenance
                </h3>
                <p className="text-xs font-body text-muted-foreground">{product.maintenance_info}</p>
                <Separator className="mt-6" />
              </div>
            )}

            {/* ── CTAs ── */}
            <div className="space-y-2 pt-2">
              {onAddToQuotation && (
                <button
                  onClick={onAddToQuotation}
                  className="w-full px-5 py-3 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
                >
                  Add to quotation
                </button>
              )}
              {onReplaceVariant && (
                <button
                  onClick={onReplaceVariant}
                  className="w-full px-5 py-3 font-display font-semibold text-sm border border-border text-foreground rounded-full hover:border-foreground/30 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  Replace with another variant
                </button>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export { getAvailability };
export type { AvailabilityInfo };
export default ProductDetailDrawer;
