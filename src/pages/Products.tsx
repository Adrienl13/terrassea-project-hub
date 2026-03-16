import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search, SlidersHorizontal, X, Plus, LayoutGrid, List, BarChart3, ChevronDown,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CompareBar from "@/components/products/CompareBar";
import ProductFilterSidebar, {
  type FilterState,
  EMPTY_FILTERS,
  SORT_OPTIONS,
} from "@/components/products/ProductFilterSidebar";
import ActiveFilters from "@/components/products/ActiveFilters";
import { useProducts } from "@/hooks/useProducts";
import { useProjectCart } from "@/contexts/ProjectCartContext";
import { useCompare } from "@/contexts/CompareContext";
import { useIsMobile } from "@/hooks/use-mobile";
import type { DBProduct } from "@/lib/products";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type ViewMode = "grid" | "list";
type SortKey = typeof SORT_OPTIONS[number]["key"];

const Products = () => {
  const { data: products = [], isLoading } = useProducts();
  const { addItem } = useProjectCart();
  const isMobile = useIsMobile();

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState<SortKey>("popular");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const activeFilterCount =
    filters.categories.length + filters.usage.length + filters.materials.length +
    filters.styles.length + filters.colors.length + filters.features.length +
    filters.stock.length +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < 500 ? 1 : 0);

  const clearAllFilters = () => setFilters(EMPTY_FILTERS);

  const filtered = useMemo(() => {
    let result = products;
    const q = search.toLowerCase().trim();

    if (q) {
      result = result.filter((p) => {
        const haystack = [
          p.name, p.category, p.subcategory, p.short_description,
          p.main_color, p.product_family, p.collection, p.brand_source,
          ...p.style_tags, ...p.material_tags, ...p.use_case_tags,
        ].filter(Boolean).join(" ").toLowerCase();
        return q.split(/\s+/).every((word) => haystack.includes(word));
      });
    }

    if (filters.categories.length > 0)
      result = result.filter((p) =>
        filters.categories.some(
          (c) => p.category.toLowerCase() === c.toLowerCase() ||
            p.subcategory?.toLowerCase() === c.toLowerCase()
        )
      );

    if (filters.usage.length > 0)
      result = result.filter((p) =>
        p.use_case_tags.some((t) => filters.usage.includes(t.toLowerCase()))
      );

    if (filters.materials.length > 0)
      result = result.filter((p) =>
        p.material_tags.some((t) =>
          filters.materials.some((m) => t.toLowerCase().includes(m.toLowerCase()))
        )
      );

    if (filters.styles.length > 0)
      result = result.filter((p) =>
        p.style_tags.some((t) =>
          filters.styles.some((s) => t.toLowerCase().includes(s.toLowerCase()))
        )
      );

    if (filters.colors.length > 0)
      result = result.filter((p) =>
        filters.colors.some(
          (c) =>
            p.main_color?.toLowerCase().includes(c.toLowerCase()) ||
            p.secondary_color?.toLowerCase().includes(c.toLowerCase()) ||
            p.available_colors.some((ac) => ac.toLowerCase().includes(c.toLowerCase()))
        )
      );

    if (filters.features.length > 0)
      result = result.filter((p) =>
        filters.features.every((f) => (p as any)[f] === true)
      );

    if (filters.stock.length > 0)
      result = result.filter((p) =>
        filters.stock.includes(p.stock_status || "available")
      );

    // Price filter
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 500) {
      result = result.filter((p) => {
        const price = p.price_min ?? 0;
        return price >= filters.priceRange[0] && (filters.priceRange[1] >= 500 || price <= filters.priceRange[1]);
      });
    }

    // Sorting
    result = [...result];
    switch (sortKey) {
      case "price_asc":
        result.sort((a, b) => (a.price_min ?? 0) - (b.price_min ?? 0));
        break;
      case "price_desc":
        result.sort((a, b) => (b.price_min ?? 0) - (a.price_min ?? 0));
        break;
      case "newest":
        result.sort((a, b) => b.id.localeCompare(a.id));
        break;
      case "in_stock":
        result.sort((a, b) => {
          const order: Record<string, number> = { available: 0, low_stock: 1, production: 2, on_order: 3, to_confirm: 4 };
          return (order[a.stock_status || "available"] ?? 5) - (order[b.stock_status || "available"] ?? 5);
        });
        break;
      default: // popular
        break;
    }

    return result;
  }, [products, search, filters, sortKey]);

  const handleAdd = (product: DBProduct) => {
    addItem(product);
    toast.success(`${product.name} added to your project`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="px-6 mb-8">
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
          </div>
        </section>

        {/* Main content with sidebar */}
        <section className="px-6">
          <div className="container mx-auto">
            <div className="flex gap-8">
              {/* Desktop sidebar */}
              {!isMobile && (
                <aside className="w-60 flex-shrink-0">
                  <div className="sticky top-24">
                    <ProductFilterSidebar filters={filters} onChange={setFilters} />
                  </div>
                </aside>
              )}

              {/* Products area */}
              <div className="flex-1 min-w-0">
                {/* Controls bar */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    {isMobile && (
                      <button
                        onClick={() => setMobileFilterOpen(true)}
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
                    )}
                    <span className="text-xs text-muted-foreground font-body">
                      {filtered.length} product{filtered.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Sort */}
                    <div className="relative">
                      <select
                        value={sortKey}
                        onChange={(e) => setSortKey(e.target.value as SortKey)}
                        className="appearance-none text-xs font-body bg-card border border-border rounded-full pl-3 pr-8 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 cursor-pointer"
                      >
                        {SORT_OPTIONS.map((opt) => (
                          <option key={opt.key} value={opt.key}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                    </div>

                    {/* View toggle */}
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

                {/* Active filters */}
                {activeFilterCount > 0 && (
                  <div className="mb-5">
                    <ActiveFilters filters={filters} onChange={setFilters} onClearAll={clearAllFilters} />
                  </div>
                )}

                {/* Product grid / list */}
                {isLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
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
            </div>
          </div>
        </section>
      </main>

      {/* Mobile filter drawer */}
      <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <SheetContent side="left" className="w-full sm:w-80 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <ProductFilterSidebar
            filters={filters}
            onChange={setFilters}
            onClose={() => setMobileFilterOpen(false)}
            showHeader
          />
        </SheetContent>
      </Sheet>

      <CompareBar />
      <Footer />
    </div>
  );
};

/* ─── sub-components ─── */
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
  const { addToCompare, isInCompare } = useCompare();
  const inCompare = isInCompare(product.id);
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
          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
            <button
              onClick={(e) => { e.preventDefault(); addToCompare(product); }}
              disabled={inCompare}
              className={`border rounded-full p-1.5 transition-colors ${inCompare ? "border-foreground bg-foreground" : "border-border hover:border-foreground"}`}
              title={inCompare ? "In compare" : "Compare"}
            >
              <BarChart3 className={`h-3 w-3 ${inCompare ? "text-primary-foreground" : "text-muted-foreground"}`} />
            </button>
            <button
              onClick={(e) => { e.preventDefault(); onAdd(product); }}
              className="border border-border hover:border-foreground rounded-full p-1.5 transition-colors"
              title="Add to project"
            >
              <Plus className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 font-body">
          {product.short_description}
        </p>
        <p className="text-sm font-display font-medium text-foreground mt-2">
          {product.indicative_price || "On request"}
        </p>
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
        <span className="text-sm font-display font-medium text-foreground mt-2 inline-block">
          {product.indicative_price || "On request"}
        </span>
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
