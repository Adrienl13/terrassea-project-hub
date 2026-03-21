import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, X, Plus, Check, Award, Zap, DollarSign, Star } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCompare } from "@/contexts/CompareContext";
import { useProjectCart } from "@/contexts/ProjectCartContext";
import { toast } from "sonner";
import type { DBProduct } from "@/lib/products";

/* ─── Types ─────────────────────────────────────────────── */

type RowType = "text" | "boolean" | "numeric_lower_better" | "numeric_higher_better";

interface CompareRow {
  key: string;
  type: RowType;
  getNumeric?: (p: DBProduct) => number | null;
  getValue: (p: DBProduct, t: (k: string) => string) => string;
  getRawBool?: (p: DBProduct) => boolean;
}

/* ─── Row definitions ───────────────────────────────────── */

const COMPARE_ROWS: CompareRow[] = [
  { key: "category", type: "text", getValue: (p) => p.category },
  { key: "subcategory", type: "text", getValue: (p) => p.subcategory || "\u2014" },
  { key: "brand", type: "text", getValue: (p) => p.brand_source || "\u2014" },
  { key: "collection", type: "text", getValue: (p) => p.collection || "\u2014" },
  {
    key: "dimensions",
    type: "text",
    getValue: (p) => {
      const parts = [
        p.dimensions_length_cm && `L${p.dimensions_length_cm}`,
        p.dimensions_width_cm && `W${p.dimensions_width_cm}`,
        p.dimensions_height_cm && `H${p.dimensions_height_cm}`,
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(" \u00d7 ") + " cm" : "\u2014";
    },
  },
  {
    key: "seat_height",
    type: "text",
    getValue: (p) => (p.seat_height_cm ? `${p.seat_height_cm} cm` : "\u2014"),
  },
  {
    key: "weight",
    type: "numeric_lower_better",
    getNumeric: (p) => p.weight_kg,
    getValue: (p) => (p.weight_kg ? `${p.weight_kg} kg` : "\u2014"),
  },
  {
    key: "structure",
    type: "text",
    getValue: (p) => p.material_structure || p.material_tags.join(", ") || "\u2014",
  },
  { key: "seat_top", type: "text", getValue: (p) => p.material_seat || "\u2014" },
  { key: "main_color", type: "text", getValue: (p) => p.main_color || "\u2014" },
  { key: "stackable", type: "boolean", getRawBool: (p) => p.is_stackable, getValue: (p, t) => (p.is_stackable ? t("compare.yes") : t("compare.no")) },
  { key: "outdoor", type: "boolean", getRawBool: (p) => p.is_outdoor, getValue: (p, t) => (p.is_outdoor ? t("compare.yes") : t("compare.no")) },
  { key: "uv_resistant", type: "boolean", getRawBool: (p) => p.uv_resistant, getValue: (p, t) => (p.uv_resistant ? t("compare.yes") : t("compare.no")) },
  { key: "weather_resistant", type: "boolean", getRawBool: (p) => p.weather_resistant, getValue: (p, t) => (p.weather_resistant ? t("compare.yes") : t("compare.no")) },
  { key: "fire_retardant", type: "boolean", getRawBool: (p) => p.fire_retardant, getValue: (p, t) => (p.fire_retardant ? t("compare.yes") : t("compare.no")) },
  { key: "heavy_duty_chr", type: "boolean", getRawBool: (p) => p.is_chr_heavy_use, getValue: (p, t) => (p.is_chr_heavy_use ? t("compare.yes") : t("compare.no")) },
  { key: "easy_maintenance", type: "boolean", getRawBool: (p) => p.easy_maintenance, getValue: (p, t) => (p.easy_maintenance ? t("compare.yes") : t("compare.no")) },
  { key: "customizable", type: "boolean", getRawBool: (p) => p.customizable, getValue: (p, t) => (p.customizable ? t("compare.yes") : t("compare.no")) },
  { key: "warranty", type: "text", getValue: (p) => p.warranty || "\u2014" },
  { key: "country", type: "text", getValue: (p) => p.country_of_manufacture || "\u2014" },
  { key: "stock", type: "text", getValue: (p) => p.stock_status || "available" },
  {
    key: "delivery",
    type: "numeric_lower_better",
    getNumeric: (p) => p.estimated_delivery_days,
    getValue: (p, t) =>
      p.estimated_delivery_days ? `${p.estimated_delivery_days} ${t("compare.days")}` : "\u2014",
  },
  {
    key: "price",
    type: "text",
    getValue: (p, t) => p.indicative_price || t("compare.on_request"),
  },
];

/* ─── Relevance score computation ───────────────────────── */

function computeRelevanceScore(
  product: DBProduct,
  cartProducts: DBProduct[],
  comparedItems: DBProduct[]
): number {
  let raw = 0;

  // Style tag overlap with cart
  for (const cartP of cartProducts) {
    for (const tag of product.style_tags) {
      if (cartP.style_tags.includes(tag)) raw += 5;
    }
  }

  // Material tag overlap with cart
  for (const cartP of cartProducts) {
    for (const tag of product.material_tags) {
      if (cartP.material_tags.includes(tag)) raw += 3;
    }
  }

  // Same collection as any carted item
  if (product.collection) {
    const match = cartProducts.some((cp) => cp.collection === product.collection);
    if (match) raw += 15;
  }

  // Has offers
  if (product.offers_count && product.offers_count > 0) raw += 10;

  // Stackable
  if (product.is_stackable) raw += 5;

  // CHR heavy-duty
  if (product.is_chr_heavy_use) raw += 10;

  // Price competitiveness
  if (product.price_min != null) {
    const prices = comparedItems
      .map((p) => p.price_min)
      .filter((v): v is number => v != null);
    if (prices.length > 0) {
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      if (product.price_min < avg) raw += 10;
    }
  }

  // Normalize to 0-100: cap raw at 100
  return Math.min(100, Math.max(0, raw));
}

/* ─── Circular Progress Ring ────────────────────────────── */

function ScoreRing({ score }: { score: number }) {
  const radius = 30;
  const stroke = 4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "#16a34a" : score >= 40 ? "#d97706" : "#dc2626";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={76} height={76} className="-rotate-90">
        <circle
          cx={38}
          cy={38}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-border"
        />
        <circle
          cx={38}
          cy={38}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <span
        className="absolute text-sm font-display font-bold"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}

/* ─── Best-in-class helpers ─────────────────────────────── */

function findBestIndex(
  items: DBProduct[],
  row: CompareRow
): number | null {
  if (row.type === "boolean" && row.getRawBool) {
    // Winner = true value; if multiple, no single winner
    const trueIndices = items
      .map((p, i) => (row.getRawBool!(p) ? i : -1))
      .filter((i) => i >= 0);
    // Only highlight if not all true
    if (trueIndices.length > 0 && trueIndices.length < items.length) return null; // highlight all trues individually
    return null;
  }

  if (
    (row.type === "numeric_lower_better" || row.type === "numeric_higher_better") &&
    row.getNumeric
  ) {
    const values = items.map((p) => row.getNumeric!(p));
    const validValues = values.filter((v): v is number => v != null);
    if (validValues.length < 2) return null;

    const best =
      row.type === "numeric_lower_better"
        ? Math.min(...validValues)
        : Math.max(...validValues);

    const bestIndices = values
      .map((v, i) => (v === best ? i : -1))
      .filter((i) => i >= 0);

    return bestIndices.length === 1 ? bestIndices[0] : null;
  }

  return null;
}

/* ─── Verdict pills ─────────────────────────────────────── */

interface VerdictPill {
  productIndex: number;
  labelKey: string;
  icon: typeof Award;
}

function computeVerdictPills(items: DBProduct[]): VerdictPill[] {
  const pills: VerdictPill[] = [];

  // Best price
  const prices = items.map((p) => p.price_min);
  const validPrices = prices.filter((v): v is number => v != null);
  if (validPrices.length >= 2) {
    const minPrice = Math.min(...validPrices);
    const idx = prices.indexOf(minPrice);
    if (idx >= 0) pills.push({ productIndex: idx, labelKey: "compare.best_price", icon: DollarSign });
  }

  // Fastest delivery
  const deliveries = items.map((p) => p.estimated_delivery_days);
  const validDeliveries = deliveries.filter((v): v is number => v != null);
  if (validDeliveries.length >= 2) {
    const minDel = Math.min(...validDeliveries);
    const idx = deliveries.indexOf(minDel);
    if (idx >= 0) pills.push({ productIndex: idx, labelKey: "compare.fastest_delivery", icon: Zap });
  }

  // Most features (count boolean trues)
  const boolRows = COMPARE_ROWS.filter((r) => r.type === "boolean" && r.getRawBool);
  const featureCounts = items.map((p) =>
    boolRows.reduce((sum, r) => sum + (r.getRawBool!(p) ? 1 : 0), 0)
  );
  const maxFeatures = Math.max(...featureCounts);
  if (maxFeatures > 0) {
    const winners = featureCounts.filter((c) => c === maxFeatures);
    if (winners.length === 1) {
      const idx = featureCounts.indexOf(maxFeatures);
      pills.push({ productIndex: idx, labelKey: "compare.most_features", icon: Star });
    }
  }

  return pills;
}

/* ─── Main Component ────────────────────────────────────── */

const ProductCompare = () => {
  const { items, removeFromCompare } = useCompare();
  const { addItem, items: cartItems } = useProjectCart();
  const { t } = useTranslation();

  const cartProducts = useMemo(
    () => cartItems.map((ci) => ci.product),
    [cartItems]
  );

  const scores = useMemo(
    () => items.map((p) => computeRelevanceScore(p, cartProducts, items)),
    [items, cartProducts]
  );

  const bestScoreIndex = useMemo(() => {
    if (scores.length === 0) return -1;
    let best = 0;
    for (let i = 1; i < scores.length; i++) {
      if (scores[i] > scores[best]) best = i;
    }
    return best;
  }, [scores]);

  const verdictPills = useMemo(() => computeVerdictPills(items), [items]);

  /* ── Empty state ────────────────────────────────── */
  if (items.length < 2) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 px-6 container mx-auto text-center py-20">
          <p className="text-sm text-muted-foreground font-body mb-4">
            {t("compare.no_products_to_compare")}
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-1 text-sm font-display font-semibold text-foreground underline"
          >
            <ArrowLeft className="h-3 w-3" /> {t("compare.back_to_products")}
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const handleAdd = (product: DBProduct) => {
    addItem(product);
    toast.success(`${product.name} ${t("success.addedToProject").toLowerCase()}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16 px-6">
        <div className="container mx-auto">
          <nav className="mb-6">
            <Link
              to="/products"
              className="flex items-center gap-1 text-xs font-body text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> {t("compare.back_to_products")}
            </Link>
          </nav>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-2xl md:text-3xl font-bold text-foreground mb-8"
          >
            {t("compare.product_comparison")}
          </motion.h1>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              {/* ─── Product headers ─── */}
              <thead>
                <tr>
                  <th className="w-40 text-left" />
                  {items.map((product, idx) => (
                    <th
                      key={product.id}
                      className="p-3 text-center align-top min-w-[180px]"
                    >
                      <div className="relative">
                        <button
                          onClick={() => removeFromCompare(product.id)}
                          aria-label={t("compare.remove")}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-card border border-border flex items-center justify-center hover:border-foreground transition-colors z-10"
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
                        <Link
                          to={`/products/${product.id}`}
                          className="font-display font-semibold text-xs text-foreground hover:underline block"
                        >
                          {product.name}
                        </Link>
                        {product.brand_source && (
                          <p className="text-[10px] text-muted-foreground font-body mt-0.5">
                            {product.brand_source}
                          </p>
                        )}

                        {/* ─── Relevance Score ─── */}
                        <div className="mt-3">
                          <ScoreRing score={scores[idx]} />
                          <p className="text-[10px] text-muted-foreground font-body mt-1">
                            {t("compare.project_relevance")}
                          </p>
                        </div>

                        {/* ─── Best match badge ─── */}
                        {idx === bestScoreIndex && scores[idx] > 0 && (
                          <div className="mt-2 inline-flex items-center gap-1 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 text-[10px] font-display font-semibold rounded-full px-2 py-0.5">
                            <Award className="h-3 w-3" /> {t("compare.best_match")}
                          </div>
                        )}

                        <button
                          onClick={() => handleAdd(product)}
                          className="mt-2 inline-flex items-center gap-1 text-[10px] font-display font-semibold border border-foreground text-foreground rounded-full px-3 py-1.5 hover:bg-foreground hover:text-primary-foreground transition-all"
                        >
                          <Plus className="h-3 w-3" /> {t("compare.add_to_project")}
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>

                {/* ─── Quick Verdict Row ─── */}
                {verdictPills.length > 0 && (
                  <tr className="border-b border-border">
                    <td className="px-3 py-3 text-[10px] font-body uppercase tracking-wider text-muted-foreground">
                      {t("compare.quick_verdict")}
                    </td>
                    {items.map((_product, idx) => {
                      const myPills = verdictPills.filter(
                        (p) => p.productIndex === idx
                      );
                      return (
                        <td key={idx} className="px-3 py-3 text-center">
                          <div className="flex flex-wrap justify-center gap-1">
                            {myPills.map((pill) => {
                              const Icon = pill.icon;
                              return (
                                <span
                                  key={pill.labelKey}
                                  className="inline-flex items-center gap-0.5 text-[10px] font-display font-semibold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 rounded-full px-2 py-0.5"
                                >
                                  <Icon className="h-3 w-3" />
                                  {t(pill.labelKey)}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                )}
              </thead>

              {/* ─── Data Rows ─── */}
              <tbody>
                {COMPARE_ROWS.map((row, i) => {
                  const bestIdx = findBestIndex(items, row);

                  return (
                    <tr
                      key={row.key}
                      className={i % 2 === 0 ? "bg-card/50" : ""}
                    >
                      <td className="px-3 py-2.5 text-[10px] font-body uppercase tracking-wider text-muted-foreground">
                        {t(`compare.${row.key}`)}
                      </td>
                      {items.map((product, idx) => {
                        const value = row.getValue(product, t);
                        const isBoolRow = row.type === "boolean" && row.getRawBool;
                        const isTrue = isBoolRow && row.getRawBool!(product);
                        const isFalse = isBoolRow && !row.getRawBool!(product);
                        const isWinner =
                          bestIdx === idx ||
                          (isBoolRow && isTrue && items.some((p) => !row.getRawBool!(p)));

                        return (
                          <td
                            key={product.id}
                            className={`px-3 py-2.5 text-center text-xs font-body text-foreground transition-colors ${
                              isWinner
                                ? "bg-green-50/60 dark:bg-green-950/30 border-l-2 border-green-500"
                                : ""
                            }`}
                          >
                            {isTrue ? (
                              <Check className="h-4 w-4 text-green-600 mx-auto" />
                            ) : isFalse ? (
                              <span className="text-muted-foreground">\u2014</span>
                            ) : (
                              <span className="capitalize">{value}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
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
