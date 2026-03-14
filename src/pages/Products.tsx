import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, SlidersHorizontal, X, ChevronDown, Plus, LayoutGrid, List, BarChart3,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CompareBar from "@/components/products/CompareBar";
import { useProducts } from "@/hooks/useProducts";
import { useProjectCart } from "@/contexts/ProjectCartContext";
import { useCompare } from "@/contexts/CompareContext";
import type { DBProduct } from "@/lib/products";
import { toast } from "sonner";

/* ─── filter config ─── */
const CATEGORY_OPTIONS = [
  "Chairs", "Armchairs", "Stools", "Tables", "Coffee Tables",
  "High Tables", "Sofas", "Sun Loungers", "Parasols", "Benches",
];

const USAGE_OPTIONS = [
  "restaurant", "café", "hotel", "beach", "pool", "rooftop",
  "community", "camping", "indoor", "outdoor",
];

const MATERIAL_OPTIONS = [
  "aluminium", "polypropylene", "wood", "bamboo", "HPL", "steel",
  "rope", "synthetic rattan", "textile", "technical fabric",
];

const STYLE_OPTIONS = [
  "bistro", "contemporary", "mediterranean", "design", "natural",
  "chic", "minimalist", "contract", "traditional",
];

const COLOR_OPTIONS = [
  "black", "white", "blue", "green", "terracotta", "beige",
  "grey", "wood effect", "custom",
];

const FEATURE_OPTIONS = [
  { key: "is_stackable", label: "Stackable" },
  { key: "is_chr_heavy_use", label: "Heavy-duty CHR" },
  { key: "uv_resistant", label: "UV Resistant" },
  { key: "weather_resistant", label: "Weather Resistant" },
  { key: "lightweight", label: "Lightweight" },
  { key: "easy_maintenance", label: "Easy Maintenance" },
  { key: "fire_retardant", label: "Fire Retardant" },
  { key: "customizable", label: "Customizable" },
];

const STOCK_OPTIONS = [
  "available", "low_stock", "production", "on_order", "to_confirm",
];

const STOCK_LABELS: Record<string, string> = {
  available: "In stock",
  low_stock: "Low stock",
  production: "Quick production",
  on_order: "On order",
  to_confirm: "To confirm",
};

type ViewMode = "grid" | "list";

const Products = () => {
  const { data: products = [], isLoading } = useProducts();
  const { addItem } = useProjectCart();

  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Filters state
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedUsage, setSelectedUsage] = useState<string[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [selectedStock, setSelectedStock] = useState<string[]>([]);

  const activeFilterCount =
    selectedCategories.length + selectedUsage.length + selectedMaterials.length +
    selectedStyles.length + selectedColors.length + selectedFeatures.length +
    selectedStock.length;

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedUsage([]);
    setSelectedMaterials([]);
    setSelectedStyles([]);
    setSelectedColors([]);
    setSelectedFeatures([]);
    setSelectedStock([]);
  };

  const filtered = useMemo(() => {
    let result = products;
    const q = search.toLowerCase().trim();

    if (q) {
      result = result.filter((p) => {
        const haystack = [
          p.name, p.category, p.subcategory, p.short_description,
          p.main_color, p.product_family, p.collection, p.brand_source,
          ...p.style_tags, ...p.material_tags, ...p.use_case_tags,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return q.split(/\s+/).every((word) => haystack.includes(word));
      });
    }

    if (selectedCategories.length > 0)
      result = result.filter((p) =>
        selectedCategories.some(
          (c) => p.category.toLowerCase() === c.toLowerCase() ||
            p.subcategory?.toLowerCase() === c.toLowerCase()
        )
      );

    if (selectedUsage.length > 0)
      result = result.filter((p) =>
        p.use_case_tags.some((t) => selectedUsage.includes(t.toLowerCase()))
      );

    if (selectedMaterials.length > 0)
      result = result.filter((p) =>
        p.material_tags.some((t) =>
          selectedMaterials.some((m) => t.toLowerCase().includes(m.toLowerCase()))
        )
      );

    if (selectedStyles.length > 0)
      result = result.filter((p) =>
        p.style_tags.some((t) =>
          selectedStyles.some((s) => t.toLowerCase().includes(s.toLowerCase()))
        )
      );

    if (selectedColors.length > 0)
      result = result.filter((p) =>
        selectedColors.some(
          (c) =>
            p.main_color?.toLowerCase().includes(c.toLowerCase()) ||
            p.secondary_color?.toLowerCase().includes(c.toLowerCase()) ||
            p.available_colors.some((ac) => ac.toLowerCase().includes(c.toLowerCase()))
        )
      );

    if (selectedFeatures.length > 0)
      result = result.filter((p) =>
        selectedFeatures.every((f) => (p as any)[f] === true)
      );

    if (selectedStock.length > 0)
      result = result.filter((p) =>
        selectedStock.includes(p.stock_status || "available")
      );

    return result;
  }, [products, search, selectedCategories, selectedUsage, selectedMaterials, selectedStyles, selectedColors, selectedFeatures, selectedStock]);

  const handleAdd = (product: DBProduct) => {
    addItem(product);
    toast.success(`${product.name} added to your project`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="px-6 mb-10">
          <div className="container mx-auto">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
              Product Hub
            </h1>
            <p className="text-sm text-muted-foreground font-body max-w-xl">
              Professional furniture sourcing — search, compare and select from our curated catalog.
            </p>

            {/* Search bar */}
            <div className="mt-6 relative max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, material, color, style..."
                className="w-full pl-11 pr-4 py-3 text-sm font-body bg-card border border-border rounded-full focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-all placeholder:text-muted-foreground"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>

            {/* Controls bar */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 text-xs font-display font-semibold border border-border rounded-full px-4 py-2 hover:border-foreground transition-colors"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="bg-foreground text-primary-foreground text-[10px] rounded-full w-5 h-5 flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="flex items-center gap-1 text-xs font-body text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3 w-3" /> Clear all
                  </button>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground font-body">
                  {filtered.length} product{filtered.length !== 1 ? "s" : ""}
                </span>
                <div className="flex items-center border border-border rounded-full overflow-hidden">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 transition-colors ${viewMode === "grid" ? "bg-foreground text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 transition-colors ${viewMode === "list" ? "bg-foreground text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Filters panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-6 mb-8 overflow-hidden"
            >
              <div className="container mx-auto space-y-4 pb-6 border-b border-border">
                <FilterRow label="Type" options={CATEGORY_OPTIONS} active={selectedCategories} onToggle={(v) => toggle(selectedCategories, setSelectedCategories, v)} />
                <FilterRow label="Usage" options={USAGE_OPTIONS} active={selectedUsage} onToggle={(v) => toggle(selectedUsage, setSelectedUsage, v)} />
                <FilterRow label="Material" options={MATERIAL_OPTIONS} active={selectedMaterials} onToggle={(v) => toggle(selectedMaterials, setSelectedMaterials, v)} />
                <FilterRow label="Style" options={STYLE_OPTIONS} active={selectedStyles} onToggle={(v) => toggle(selectedStyles, setSelectedStyles, v)} />
                <FilterRow label="Color" options={COLOR_OPTIONS} active={selectedColors} onToggle={(v) => toggle(selectedColors, setSelectedColors, v)} />
                <FilterRow label="Features" options={FEATURE_OPTIONS.map((f) => f.label)} active={selectedFeatures.map((k) => FEATURE_OPTIONS.find((f) => f.key === k)?.label || k)} onToggle={(label) => {
                  const feat = FEATURE_OPTIONS.find((f) => f.label === label);
                  if (feat) toggle(selectedFeatures, setSelectedFeatures, feat.key);
                }} />
                <FilterRow label="Stock" options={STOCK_OPTIONS.map((s) => STOCK_LABELS[s] || s)} active={selectedStock.map((s) => STOCK_LABELS[s] || s)} onToggle={(label) => {
                  const key = Object.entries(STOCK_LABELS).find(([, v]) => v === label)?.[0];
                  if (key) toggle(selectedStock, setSelectedStock, key);
                }} />
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Product grid / list */}
        <section className="px-6">
          <div className="container mx-auto">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-square bg-card rounded-sm mb-4" />
                    <div className="h-4 bg-card rounded w-3/4 mb-2" />
                    <div className="h-3 bg-card rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-sm text-muted-foreground font-body">
                  No products match your criteria. Try adjusting your filters.
                </p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
                {filtered.map((product) => (
                  <ProductGridCard key={product.id} product={product} onAdd={handleAdd} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((product) => (
                  <ProductListCard key={product.id} product={product} onAdd={handleAdd} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

/* ─── helpers ─── */
function toggle(arr: string[], setter: (v: string[]) => void, value: string) {
  setter(arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);
}

/* ─── sub-components ─── */
function FilterRow({
  label, options, active, onToggle,
}: {
  label: string; options: string[]; active: string[]; onToggle: (v: string) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-[10px] font-body uppercase tracking-[0.15em] text-muted-foreground w-20 flex-shrink-0 pt-2">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onToggle(option)}
            className={`text-xs font-body px-3 py-1.5 rounded-full border transition-all capitalize ${
              active.includes(option)
                ? "border-foreground bg-foreground text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-foreground/30"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
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

function ProductGridCard({ product, onAdd }: { product: DBProduct; onAdd: (p: DBProduct) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
      className="group"
    >
      <Link to={`/products/${product.id}`} className="block">
        <div className="aspect-square overflow-hidden bg-card rounded-sm mb-4 relative">
          <img
            src={product.image_url || "/placeholder.svg"}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
          />
          <div className="absolute top-2 right-2">
            <StockBadge status={product.stock_status} />
          </div>
        </div>
      </Link>
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link to={`/products/${product.id}`}>
              <h3 className="font-display font-semibold text-sm text-foreground truncate hover:underline">
                {product.name}
              </h3>
            </Link>
            {product.brand_source && (
              <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider mt-0.5">
                {product.brand_source}
              </p>
            )}
          </div>
          <button
            onClick={(e) => { e.preventDefault(); onAdd(product); }}
            className="flex-shrink-0 mt-0.5 border border-border hover:border-foreground rounded-full p-1.5 transition-colors"
            title="Add to project"
          >
            <Plus className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 font-body">
          {product.short_description}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <p className="text-sm font-display font-medium text-foreground">
            {product.indicative_price || "On request"}
          </p>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {product.style_tags.slice(0, 2).map((tag) => (
            <span key={tag} className="text-[10px] font-body text-muted-foreground bg-card border border-border rounded-full px-2 py-0.5 capitalize">
              {tag}
            </span>
          ))}
          {product.material_tags.slice(0, 1).map((tag) => (
            <span key={tag} className="text-[10px] font-body text-muted-foreground bg-card border border-border rounded-full px-2 py-0.5 capitalize">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function ProductListCard({ product, onAdd }: { product: DBProduct; onAdd: (p: DBProduct) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3 }}
      className="flex gap-4 p-4 border border-border rounded-sm hover:border-foreground/20 transition-colors group"
    >
      <Link to={`/products/${product.id}`} className="flex-shrink-0">
        <div className="w-24 h-24 overflow-hidden bg-card rounded-sm">
          <img
            src={product.image_url || "/placeholder.svg"}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link to={`/products/${product.id}`}>
              <h3 className="font-display font-semibold text-sm text-foreground hover:underline">
                {product.name}
              </h3>
            </Link>
            {product.brand_source && (
              <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">
                {product.brand_source}
              </p>
            )}
          </div>
          <StockBadge status={product.stock_status} />
        </div>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1 font-body">
          {product.short_description}
        </p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-sm font-display font-medium text-foreground">
            {product.indicative_price || "On request"}
          </span>
          <div className="flex flex-wrap gap-1">
            {product.style_tags.slice(0, 2).map((tag) => (
              <span key={tag} className="text-[10px] font-body text-muted-foreground bg-card border border-border rounded-full px-2 py-0.5 capitalize">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
      <button
        onClick={() => onAdd(product)}
        className="self-center flex-shrink-0 flex items-center gap-1.5 text-xs font-body border border-border hover:border-foreground rounded-full px-3 py-1.5 transition-colors text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
        Add
      </button>
    </motion.div>
  );
}

export default Products;
