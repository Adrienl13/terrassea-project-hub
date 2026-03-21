import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Link2, Plus, Package } from "lucide-react";
import { findCompatibleProducts, type CompatibleProduct } from "@/engine/compatibilityEngine";
import type { DBProduct } from "@/lib/products";
import { ml } from "@/lib/i18nFields";
import { useProjectCart } from "@/contexts/ProjectCartContext";
import { toast } from "sonner";

interface Props {
  product: DBProduct;
  allProducts: DBProduct[];
}

function confidenceBadge(confidence: CompatibleProduct["confidence"], t: (key: string) => string) {
  switch (confidence) {
    case "exact":
      return (
        <span className="inline-flex text-[9px] font-body px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">
          {t("compatibility.exactMatch")}
        </span>
      );
    case "dimensional":
      return (
        <span className="inline-flex text-[9px] font-body px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
          {t("compatibility.sizeMatch")}
        </span>
      );
    case "stylistic":
      return (
        <span className="inline-flex text-[9px] font-body px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
          {t("compatibility.styleMatch")}
        </span>
      );
  }
}

function CompactCard({
  item,
  t,
  onAdd,
}: {
  item: CompatibleProduct;
  t: (key: string) => string;
  onAdd: (p: DBProduct) => void;
}) {
  const p = item.product;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35 }}
      className="flex-shrink-0 w-36"
    >
      <Link to={`/products/${p.id}`}>
        <div className="aspect-square overflow-hidden bg-card rounded-sm mb-2">
          <img
            src={p.image_url || "/placeholder.svg"}
            alt={ml(p, "name")}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
            loading="lazy"
          />
        </div>
      </Link>
      <div className="space-y-1">
        <Link to={`/products/${p.id}`}>
          <h4 className="font-display font-semibold text-[11px] text-foreground truncate hover:underline leading-tight">
            {ml(p, "name")}
          </h4>
        </Link>
        {confidenceBadge(item.confidence, t)}
        {p.price_min != null ? (
          <p className="text-[11px] font-display font-medium text-foreground">
            {t("compatibility.from")} &euro;{p.price_min.toFixed(2)}
          </p>
        ) : p.indicative_price ? (
          <p className="text-[11px] font-display font-medium text-foreground">
            {p.indicative_price}
          </p>
        ) : null}
        <button
          onClick={() => onAdd(p)}
          className="flex items-center gap-1 text-[10px] font-display font-semibold text-muted-foreground hover:text-foreground transition-colors mt-0.5"
        >
          <Plus className="h-3 w-3" />
          {t("compatibility.add")}
        </button>
      </div>
    </motion.div>
  );
}

export default function CompatibleProducts({ product, allProducts }: Props) {
  const { t } = useTranslation();
  const { addItem } = useProjectCart();

  const result = useMemo(
    () => findCompatibleProducts(product, allProducts),
    [product, allProducts],
  );

  const handleAdd = (p: DBProduct) => {
    addItem(p);
    toast.success(`${ml(p, "name")} ${t("success.addedToProject").toLowerCase()}`);
  };

  const handleAddCompleteSet = () => {
    const exactItems = result.groups
      .flatMap((g) => g.items)
      .filter((item) => item.confidence === "exact");
    for (const item of exactItems) {
      addItem(item.product);
    }
    toast.success(
      t("compatibility.completeSetAdded", { count: exactItems.length }),
    );
  };

  // Same-collection products not already in groups
  const groupProductIds = new Set(
    result.groups.flatMap((g) => g.items.map((i) => i.product.id)),
  );
  const sameCollectionExtras = product.collection
    ? allProducts.filter(
        (p) =>
          p.id !== product.id &&
          p.collection === product.collection &&
          !groupProductIds.has(p.id),
      ).slice(0, 8)
    : [];

  if (result.totalCount === 0 && sameCollectionExtras.length === 0) return null;

  const exactMatchCount = result.groups
    .flatMap((g) => g.items)
    .filter((item) => item.confidence === "exact").length;

  return (
    <section className="px-6 mt-12">
      <div className="container mx-auto">
        {/* Section header */}
        <div className="flex items-center gap-2 mb-6">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold text-foreground">
            {t("compatibility.title")}
          </h2>
          <span className="text-xs font-body text-muted-foreground">
            ({result.totalCount + sameCollectionExtras.length})
          </span>
        </div>

        {/* Compatibility groups */}
        {result.groups.map((group) => (
          <div key={group.type} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-display text-sm font-semibold text-foreground">
                {t(`compatibility.group.${group.type}`, group.label)}
              </h3>
              <span className="text-[10px] font-body text-muted-foreground">
                ({group.items.length})
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-border">
              {group.items.map((item) => (
                <CompactCard
                  key={item.product.id}
                  item={item}
                  t={t}
                  onAdd={handleAdd}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Same collection extras */}
        {sameCollectionExtras.length > 0 && (
          <div className="mb-6 pt-4 border-t border-border">
            <h3 className="font-display text-sm font-semibold text-muted-foreground mb-3">
              {t("compatibility.sameCollection")}
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-border">
              {sameCollectionExtras.map((p) => (
                <CompactCard
                  key={p.id}
                  item={{ product: p, confidence: "stylistic", type: "same_collection", reason: "Same collection" }}
                  t={t}
                  onAdd={handleAdd}
                />
              ))}
            </div>
          </div>
        )}

        {/* Add complete set CTA */}
        {exactMatchCount >= 2 && (
          <button
            onClick={handleAddCompleteSet}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-display font-semibold border border-foreground text-foreground rounded-full hover:bg-foreground hover:text-primary-foreground transition-all"
          >
            <Package className="h-4 w-4" />
            {t("compatibility.addCompleteSet")}
          </button>
        )}
      </div>
    </section>
  );
}
