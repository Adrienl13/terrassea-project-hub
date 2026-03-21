import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Plus, Check, AlertTriangle, ChevronRight, ArrowLeftRight } from "lucide-react";
import { ProjectConcept, LayoutRecommendation, LayoutRequirementType, BOMSlot, BOMSlotRole } from "@/engine/types";
import type { DBProduct } from "@/lib/products";
import { useProjectCart, type CartItemLayoutMeta } from "@/contexts/ProjectCartContext";
import { toast } from "sonner";
import EditableLayoutDisplay from "./project-builder/EditableLayoutDisplay";

interface ConceptCardProps {
  concept: ProjectConcept;
  index: number;
  products: DBProduct[];
}

type ConceptProduct = DBProduct & {
  relevance: number;
  reason: string;
  suggestedQuantity?: number;
  layoutRequirementType?: LayoutRequirementType;
  layoutRequirementLabel?: string;
};

// ── Role display config ───────────────────────────────────

const ROLE_LABELS: Record<BOMSlotRole, string> = {
  chair:          "Chairs",
  armchair:       "Armchairs",
  bar_stool:      "Bar stools",
  complete_table: "Tables",
  table_base:     "Bases",
  tabletop:       "Tops",
  parasol:        "Parasols",
  sun_lounger:    "Loungers",
  sofa:           "Sofas",
  bench:          "Benches",
  accessory:      "Accessories",
  other:          "Other",
};

const ROLE_COLORS: Record<BOMSlotRole, string> = {
  chair:          "bg-amber-500/10 text-amber-700 border-amber-500/20",
  armchair:       "bg-orange-500/10 text-orange-700 border-orange-500/20",
  bar_stool:      "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  complete_table: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  table_base:     "bg-blue-500/10 text-blue-700 border-blue-500/20",
  tabletop:       "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
  parasol:        "bg-green-500/10 text-green-700 border-green-500/20",
  sun_lounger:    "bg-teal-500/10 text-teal-700 border-teal-500/20",
  sofa:           "bg-purple-500/10 text-purple-700 border-purple-500/20",
  bench:          "bg-stone-500/10 text-stone-700 border-stone-500/20",
  accessory:      "bg-muted text-muted-foreground border-border",
  other:          "bg-muted text-muted-foreground border-border",
};

// ── BOM bar — compact summary of quantities + price ───────

function BOMBar({ concept }: { concept: ProjectConcept }) {
  const { t } = useTranslation();
  const bom = concept.bom;
  if (!bom || bom.slots.length === 0) return null;

  const hasPrice = bom.indicativeTotalMin != null;

  // Compute per-cover cost from BOM total and layout seats
  const totalSeats = concept.layout?.totalSeats || 0;
  const perCoverMin = hasPrice && totalSeats > 0 ? Math.round(bom.indicativeTotalMin! / totalSeats) : null;
  const perCoverMax = hasPrice && totalSeats > 0 && bom.indicativeTotalMax ? Math.round(bom.indicativeTotalMax / totalSeats) : null;

  return (
    <div className="mt-6 border border-border rounded-sm bg-card/50 p-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Slots summary */}
        <div className="flex items-center gap-2 flex-wrap">
          {bom.slots.map((slot, i) => (
            <span key={i} className={`text-[10px] font-body px-2 py-0.5 rounded-full border ${ROLE_COLORS[slot.role]}`}>
              ×{slot.quantity}
              {" "}{ROLE_LABELS[slot.role] || slot.role}
            </span>
          ))}
        </div>

        {/* Price range */}
        {hasPrice && (
          <div className="text-right">
            <span className="text-[9px] font-body uppercase tracking-wider text-muted-foreground block">
              {t('concept.totalProject', 'Total project estimate')}
            </span>
            <span className="text-sm font-display font-semibold text-foreground">
              ~€{bom.indicativeTotalMin!.toLocaleString("fr-FR")}
              {bom.indicativeTotalMax && bom.indicativeTotalMax !== bom.indicativeTotalMin
                ? ` – €${bom.indicativeTotalMax.toLocaleString("fr-FR")}`
                : ""}
            </span>
          </div>
        )}
      </div>

      {/* Per-cover + total items */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] font-body text-muted-foreground">
          {t('concept.bomNotice', '{{count}} items · excl. delivery & VAT · based on catalogue prices', { count: bom.totalItems })}
        </span>
        {hasPrice && (
          <span className="text-[9px] font-body text-muted-foreground italic">
            {t('concept.logisticsMargin', '+15% logistics est.')}
          </span>
        )}
      </div>

      {/* Per cover breakdown */}
      {perCoverMin && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
          <span className="text-[10px] font-body text-muted-foreground">
            {t('concept.perCover', 'Per cover ({{seats}} seats)', { seats: totalSeats })}
          </span>
          <span className="text-xs font-display font-medium text-foreground">
            €{perCoverMin.toLocaleString("fr-FR")}
            {perCoverMax && perCoverMax !== perCoverMin ? ` – €${perCoverMax.toLocaleString("fr-FR")}` : ""}
            {" "}{t('concept.perCoverUnit', '/ seat')}
          </span>
        </div>
      )}

      {/* Missing slots warning */}
      {bom.missingSlots.length > 0 && (
        <div className="flex items-start gap-2 mt-3 text-amber-700 bg-amber-500/10 border border-amber-500/20 rounded-sm px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span className="text-[10px] font-body leading-relaxed">
            {t('concept.missingSlots', "No {{slots}} in catalogue yet — we'll source them via Pro Service.", { slots: bom.missingSlots.map(r => ROLE_LABELS[r] || r).join(", ") })}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Alternative toggle button ─────────────────────────────

function AlternativeToggle({
  concept,
  showAlternative,
  onToggle,
}: {
  concept: ProjectConcept;
  showAlternative: boolean;
  onToggle: () => void;
}) {
  const alt = concept.alternative;
  if (!alt) return null;

  return (
    <button onClick={onToggle} className="flex items-center gap-1.5 text-[10px] font-body text-muted-foreground hover:text-foreground border border-border hover:border-foreground rounded-full px-3 py-1.5 transition-all">
      <ArrowLeftRight className="h-3 w-3" />
      <span>
        {showAlternative ? "Main selection" : `Alternative: ${alt.label}`}
      </span>
      {alt.priceDelta !== 0 && !showAlternative && (
        <span className={`font-medium ${alt.priceDelta > 0 ? "text-amber-600" : "text-green-600"}`}>
          {alt.priceDelta > 0 ? "+" : ""}
          €{Math.round(alt.priceDelta).toLocaleString("fr-FR")}
        </span>
      )}
    </button>
  );
}

// ── Relevance score badge (Terrassea Score) ───────────────

function TerraseaScore({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  if (pct < 50) return null;

  const color =
    pct >= 85 ? "text-green-700 bg-green-500/10" :
    pct >= 70 ? "text-amber-700 bg-amber-500/10" :
                "text-muted-foreground bg-muted";

  return (
    <span className={`text-[9px] font-body font-medium px-1.5 py-0.5 rounded ${color}`}>
      {pct}%
    </span>
  );
}

// ── Main ConceptCard ──────────────────────────────────────

const ConceptCard = ({ concept, index, products }: ConceptCardProps) => {
  const { t } = useTranslation();
  const { addItem, items, updateQuantity } = useProjectCart();
  const [layout, setLayout] = useState<LayoutRecommendation | undefined>(concept.layout);
  const [showAlternative, setShowAlternative] = useState(false);

  // Resolve which set of products to display
  // Priority: BOM slots (new) → fallback to legacy concept.products
  const activeSlots: BOMSlot[] | null = useMemo(() => {
    if (showAlternative && concept.alternative) {
      return concept.alternative.slots;
    }
    return concept.bom?.slots ?? null;
  }, [concept.bom, concept.alternative, showAlternative]);

  // Build ConceptProduct[] from BOM slots (preferred) or legacy products
  const conceptProducts = useMemo((): ConceptProduct[] => {
    // If BOM slots available, use them
    if (activeSlots && activeSlots.length > 0) {
      return activeSlots.map(slot => {
        const product = products.find(p => p.id === slot.product.id) ?? slot.product;
        return {
          ...product,
          relevance: slot.relevanceScore,
          reason: slot.reason,
          suggestedQuantity: slot.quantity,
          layoutRequirementType: slot.layoutRequirementType,
          layoutRequirementLabel: slot.layoutRequirementLabel,
        } as ConceptProduct;
      });
    }

    // Legacy fallback
    return concept.products
      .map(rec => {
        const product = products.find(p => p.id === rec.productId);
        return product
          ? {
              ...product,
              relevance: rec.relevanceScore,
              reason: rec.reason,
              suggestedQuantity: rec.suggestedQuantity,
              layoutRequirementType: rec.layoutRequirementType,
              layoutRequirementLabel: rec.layoutRequirementLabel,
            } as ConceptProduct
          : null;
      })
      .filter(Boolean) as ConceptProduct[];
  }, [activeSlots, concept.products, products]);

  const getCartItem = (productId: string) => items.find(i => i.product.id === productId);

  const getLayoutMeta = (product: ConceptProduct): CartItemLayoutMeta => ({
    requirementType: product.layoutRequirementType,
    requirementLabel: product.layoutRequirementLabel,
    suggestedQuantity: product.suggestedQuantity,
  });

  const handleAddProduct = (product: ConceptProduct) => {
    const qty = product.suggestedQuantity ?? 1;
    const layoutMeta = getLayoutMeta(product);
    const existing = getCartItem(product.id);

    if (existing) {
      updateQuantity(product.id, qty, layoutMeta);
      toast.success(`Updated in project cart — quantity set to ${qty}`);
      return;
    }

    addItem(product, concept.title, qty, layoutMeta);
    if (qty > 1) {
      toast.success(`${product.name} added — ×${qty} based on your layout`);
    } else {
      toast.success(`${product.name} added to your project`);
    }
  };

  const handleAddAll = () => {
    let added = 0;
    let updated = 0;

    conceptProducts.forEach(product => {
      const qty = product.suggestedQuantity ?? 1;
      const layoutMeta = getLayoutMeta(product);
      const existing = getCartItem(product.id);

      if (existing) {
        if (
          existing.quantity !== qty ||
          existing.layoutRequirementType !== product.layoutRequirementType
        ) {
          updateQuantity(product.id, qty, layoutMeta);
          updated++;
        }
        return;
      }
      addItem(product, concept.title, qty, layoutMeta);
      added++;
    });

    if (added > 0 || updated > 0) {
      toast.success(
        showAlternative
          ? `Alternative added — ${added} items · ${updated} updated`
          : `${added} added · ${updated} synced with layout quantities`
      );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.15 }}
      className="border border-border rounded-sm bg-background overflow-hidden"
    >
      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <span className="text-[10px] font-body uppercase tracking-[0.2em] text-muted-foreground">
              {t('concept.label', 'Concept')} {index + 1}
            </span>
            <h3 className="font-display text-xl md:text-2xl font-bold text-foreground mt-1">
              {concept.title}
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Alternative toggle */}
            <AlternativeToggle
              concept={concept}
              showAlternative={showAlternative}
              onToggle={() => setShowAlternative(v => !v)}
            />
            <button
              onClick={handleAddAll}
              className="text-xs font-body text-muted-foreground hover:text-foreground border border-border hover:border-foreground rounded-full px-4 py-2 transition-all"
            >
              {t('concept.addAll', 'Add all to project')}
            </button>
          </div>
        </div>

        {/* Alternative label */}
        {showAlternative && concept.alternative && (
          <p className="text-xs font-body text-muted-foreground italic mb-3">
            {concept.alternative.alternativeReason}
          </p>
        )}

        <p className="text-sm font-body text-muted-foreground leading-relaxed max-w-2xl">
          {concept.description}
        </p>

        {/* Color palette */}
        <div className="flex items-center gap-3 mt-5">
          {concept.colorPalette.map((color, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div
                className="w-8 h-8 rounded-full border border-border"
                style={{ backgroundColor: color }}
              />
              <span className="text-[9px] font-body text-muted-foreground">
                {concept.colorNames[i]}
              </span>
            </div>
          ))}
        </div>

        {/* Mood keywords */}
        <div className="flex gap-2 mt-4">
          {concept.moodKeywords.map(keyword => (
            <span
              key={keyword}
              className="text-[10px] font-body uppercase tracking-wider text-muted-foreground bg-card px-2.5 py-1 rounded-full"
            >
              {keyword}
            </span>
          ))}
        </div>

        {/* BOM summary bar */}
        <BOMBar concept={concept} />

        {/* Layout */}
        {layout && (
          <div className="mt-6">
            <EditableLayoutDisplay
              layout={layout}
              onLayoutChange={setLayout}
            />
          </div>
        )}
      </div>

      {/* Products grid */}
      <div className="border-t border-border">
        <div className="px-6 pt-4 pb-2 flex items-center justify-between">
          <span className="text-[10px] font-body uppercase tracking-[0.15em] text-muted-foreground">
            {showAlternative ? t('concept.alternativeSelection', 'Alternative selection') : t('concept.matchingProducts', 'Matching products')}
          </span>
          {conceptProducts.length > 0 && (
            <span className="text-[10px] font-body text-muted-foreground">
              {conceptProducts.length} product{conceptProducts.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          {conceptProducts.map((product, i) => {
            const cartItem = getCartItem(product.id);
            const inCart = Boolean(cartItem);
            const storedQty = cartItem?.quantity;
            const suggestedQty = product.suggestedQuantity ?? 1;
            const needsSync = inCart && storedQty !== suggestedQty;

            // Find BOM slot role for this product
            const bomSlot = activeSlots?.find(s => s.product.id === product.id);
            const role = bomSlot?.role;

            return (
              <div
                key={product.id}
                className={`p-4 ${i < conceptProducts.length - 1 ? "border-r border-border" : ""}`}
              >
                {/* Image */}
                <div className="aspect-square overflow-hidden bg-card rounded-sm mb-3 relative">
                  <img
                    src={product.image_url || "/placeholder.svg"}
                    alt={product.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                  {/* Role badge */}
                  {role && role !== "other" && (
                    <span className={`absolute top-2 left-2 text-[9px] font-body px-1.5 py-0.5 rounded border ${ROLE_COLORS[role]}`}>
                      {ROLE_LABELS[role]}
                    </span>
                  )}
                </div>

                {/* Name + score */}
                <div className="flex items-center gap-1.5">
                  <h4 className="font-display font-semibold text-xs text-foreground truncate">
                    {product.name}
                  </h4>
                  <TerraseaScore score={product.relevance} />
                </div>

                {/* Reason */}
                <p className="text-[10px] font-body text-muted-foreground mt-0.5 italic line-clamp-2">
                  {product.reason}
                </p>

                {/* Price + qty + add button */}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs font-display font-medium text-foreground">
                    {product.price_min
                      ? `~€${product.price_min.toLocaleString("fr-FR")}`
                      : product.indicative_price || "—"}
                  </span>

                  {suggestedQty > 1 && (
                    <span className="text-[9px] font-body text-muted-foreground bg-accent/50 px-1.5 py-0.5 rounded">
                      ×{suggestedQty}
                    </span>
                  )}

                  <button
                    onClick={() => handleAddProduct(product)}
                    disabled={inCart && !needsSync}
                    className={`flex items-center gap-1 text-[10px] font-body rounded-full px-2.5 py-1 transition-all ${
                      inCart && !needsSync
                        ? "text-muted-foreground bg-card cursor-default"
                        : "text-muted-foreground hover:text-foreground border border-border hover:border-foreground"
                    }`}
                  >
                    {inCart && !needsSync ? (
                      <><Check className="h-3 w-3" /> Added</>
                    ) : needsSync ? (
                      <><Plus className="h-3 w-3" /> Sync qty</>
                    ) : (
                      <><Plus className="h-3 w-3" /> Add</>
                    )}
                  </button>
                </div>

                {/* Slot total line */}
                {bomSlot?.slotTotalMin != null && suggestedQty > 1 && (
                  <p className="text-[9px] font-body text-muted-foreground mt-1">
                    Slot total ~€{bomSlot.slotTotalMin.toLocaleString("fr-FR")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default ConceptCard;
