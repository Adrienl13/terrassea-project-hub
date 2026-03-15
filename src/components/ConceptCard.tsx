import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Check } from "lucide-react";
import { ProjectConcept, LayoutRecommendation, LayoutRequirementType } from "@/engine/types";
import type { DBProduct } from "@/lib/products";
import { useProjectCart, type CartItemLayoutMeta } from "@/contexts/ProjectCartContext";
import { toast } from "sonner";
import EditableLayoutDisplay from "./project-builder/EditableLayoutDisplay";

interface ConceptCardProps {
  concept: ProjectConcept;
  index: number;
  products: DBProduct[];
  budgetEstimate?: { min: number; max: number; avgPerSeat: number } | null;
}

type ConceptProduct = DBProduct & {
  relevance: number;
  reason: string;
  suggestedQuantity?: number;
  layoutRequirementType?: LayoutRequirementType;
  layoutRequirementLabel?: string;
};

const ConceptCard = ({ concept, index, products, budgetEstimate }: ConceptCardProps) => {
  const { addItem, items, updateQuantity } = useProjectCart();
  const [layout, setLayout] = useState<LayoutRecommendation | undefined>(concept.layout);

  const conceptProducts = useMemo(
    () =>
      concept.products
        .map((rec) => {
          const product = products.find((p) => p.id === rec.productId);
          return product
            ? {
                ...product,
                relevance: rec.relevanceScore,
                reason: rec.reason,
                suggestedQuantity: rec.suggestedQuantity,
                layoutRequirementType: rec.layoutRequirementType,
                layoutRequirementLabel: rec.layoutRequirementLabel,
              }
            : null;
        })
        .filter(Boolean) as ConceptProduct[],
    [concept.products, products]
  );

  const getCartItem = (productId: string) => items.find((i) => i.product.id === productId);

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
      toast.success(`Updated in project cart — quantity set to ${qty} based on your project layout`);
      return;
    }

    addItem(product, concept.title, qty, layoutMeta);
    if (qty > 1) {
      toast.success(`${product.name} added — quantity automatically set to ${qty} based on your project layout`);
    } else {
      toast.success(`${product.name} added to your project`);
    }
  };

  const handleAddAll = () => {
    let added = 0;
    let updated = 0;

    conceptProducts.forEach((product) => {
      const qty = product.suggestedQuantity ?? 1;
      const layoutMeta = getLayoutMeta(product);
      const existing = getCartItem(product.id);

      if (existing) {
        if (
          existing.quantity !== qty ||
          existing.layoutSuggestedQuantity !== qty ||
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
      toast.success(`${added} added · ${updated} synced with layout quantities`);
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
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <span className="text-[10px] font-body uppercase tracking-[0.2em] text-muted-foreground">
              Concept {index + 1}
            </span>
            <h3 className="font-display text-xl md:text-2xl font-bold text-foreground mt-1">
              {concept.title}
            </h3>
          </div>
          <button
            onClick={handleAddAll}
            className="flex-shrink-0 text-xs font-body text-muted-foreground hover:text-foreground border border-border hover:border-foreground rounded-full px-4 py-2 transition-all"
          >
            Add all to project
          </button>
        </div>

        <p className="text-sm font-body text-muted-foreground leading-relaxed max-w-2xl">
          {concept.description}
        </p>

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

        <div className="flex gap-2 mt-4">
          {concept.moodKeywords.map((keyword) => (
            <span
              key={keyword}
              className="text-[10px] font-body uppercase tracking-wider text-muted-foreground bg-card px-2.5 py-1 rounded-full"
            >
              {keyword}
            </span>
          ))}
        </div>

        {layout && (
          <div className="mt-6">
            <EditableLayoutDisplay
              layout={layout}
              onLayoutChange={setLayout}
              budgetEstimate={budgetEstimate}
            />
          </div>
        )}
      </div>

      <div className="border-t border-border">
        <div className="px-6 pt-4 pb-2">
          <span className="text-[10px] font-body uppercase tracking-[0.15em] text-muted-foreground">
            Matching products
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          {conceptProducts.map((product, i) => {
            const cartItem = getCartItem(product.id);
            const inCart = Boolean(cartItem);
            const storedQty = cartItem?.quantity;
            const suggestedQty = product.suggestedQuantity ?? 1;
            const needsSync = inCart && storedQty !== suggestedQty;

            return (
              <div
                key={product.id}
                className={`p-4 ${i < conceptProducts.length - 1 ? "border-r border-border" : ""}`}
              >
                <div className="aspect-square overflow-hidden bg-card rounded-sm mb-3">
                  <img
                    src={product.image_url || "/placeholder.svg"}
                    alt={product.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                </div>
                <h4 className="font-display font-semibold text-xs text-foreground truncate">
                  {product.name}
                </h4>
                <p className="text-[10px] font-body text-muted-foreground mt-0.5 italic line-clamp-2">
                  {product.reason}
                </p>
                <p className="text-[9px] font-body text-muted-foreground mt-1.5">
                  Requirement: {product.layoutRequirementType ?? "other"} · Suggested: {suggestedQty} · Stored: {storedQty ?? "—"}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs font-display font-medium text-foreground">
                    {product.indicative_price}
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
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default ConceptCard;
