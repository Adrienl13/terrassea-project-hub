import { motion } from "framer-motion";
import { Plus, Check } from "lucide-react";
import { ProjectConcept } from "@/engine/types";
import { enrichedProducts } from "@/data/products";
import { useProjectCart } from "@/contexts/ProjectCartContext";
import { toast } from "sonner";

interface ConceptCardProps {
  concept: ProjectConcept;
  index: number;
}

const ConceptCard = ({ concept, index }: ConceptCardProps) => {
  const { addItem, items } = useProjectCart();

  const conceptProducts = concept.products
    .map((rec) => {
      const product = enrichedProducts.find((p) => p.id === rec.productId);
      return product ? { ...product, relevance: rec.relevanceScore, reason: rec.reason } : null;
    })
    .filter(Boolean) as (typeof enrichedProducts[0] & { relevance: number; reason: string })[];

  const isInCart = (productId: string) => items.some((i) => i.product.id === productId);

  const handleAddProduct = (product: typeof enrichedProducts[0]) => {
    const { tags, scoring, ...base } = product;
    addItem(base);
    toast.success(`${product.name} added to your project`);
  };

  const handleAddAll = () => {
    let added = 0;
    conceptProducts.forEach((product) => {
      if (!isInCart(product.id)) {
        const { tags, scoring, relevance, reason, ...base } = product as any;
        addItem(base);
        added++;
      }
    });
    if (added > 0) {
      toast.success(`${added} products added to your project`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.15 }}
      className="border border-border rounded-sm bg-background overflow-hidden"
    >
      {/* Concept Header */}
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

        {/* Color Palette */}
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

        {/* Mood */}
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
      </div>

      {/* Product Grid */}
      <div className="border-t border-border">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {conceptProducts.map((product, i) => {
            const inCart = isInCart(product.id);
            return (
              <div
                key={product.id}
                className={`p-4 ${i < conceptProducts.length - 1 ? "border-r border-border" : ""}`}
              >
                <div className="aspect-square overflow-hidden bg-card rounded-sm mb-3">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                </div>
                <h4 className="font-display font-semibold text-xs text-foreground truncate">
                  {product.name}
                </h4>
                <p className="text-[10px] font-body text-muted-foreground mt-0.5 italic">
                  {product.reason}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs font-display font-medium text-foreground">
                    {product.price}
                  </span>
                  <button
                    onClick={() => !inCart && handleAddProduct(product)}
                    disabled={inCart}
                    className={`flex items-center gap-1 text-[10px] font-body rounded-full px-2.5 py-1 transition-all ${
                      inCart
                        ? "text-muted-foreground bg-card cursor-default"
                        : "text-muted-foreground hover:text-foreground border border-border hover:border-foreground"
                    }`}
                  >
                    {inCart ? (
                      <>
                        <Check className="h-3 w-3" />
                        Added
                      </>
                    ) : (
                      <>
                        <Plus className="h-3 w-3" />
                        Add
                      </>
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
