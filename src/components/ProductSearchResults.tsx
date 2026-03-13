import { motion } from "framer-motion";
import { Search, ArrowRight, Sparkles, SlidersHorizontal, X } from "lucide-react";
import { useState, useMemo } from "react";
import type { DBProduct } from "@/lib/products";
import ProductCard from "./ProductCard";

interface ProductSearchResultsProps {
  recommended: DBProduct[];
  similar: DBProduct[];
  compatible: DBProduct[];
  query: string;
  allProducts: DBProduct[];
  onCreateProjectFromProduct: (product: DBProduct) => void;
}

type FilterKey = "style" | "color" | "material" | "useCase";

const ProductSearchResults = ({
  recommended,
  similar,
  compatible,
  query,
  allProducts,
  onCreateProjectFromProduct,
}: ProductSearchResultsProps) => {
  const [activeFilters, setActiveFilters] = useState<Record<FilterKey, string[]>>({
    style: [],
    color: [],
    material: [],
    useCase: [],
  });
  const [showFilters, setShowFilters] = useState(false);

  // Extract available filter values from recommended products
  const filterOptions = useMemo(() => {
    const products = recommended.length > 0 ? recommended : allProducts.slice(0, 20);
    const styles = new Set<string>();
    const colors = new Set<string>();
    const materials = new Set<string>();
    const useCases = new Set<string>();

    for (const p of products) {
      p.style_tags.forEach(t => styles.add(t));
      if (p.main_color) colors.add(p.main_color);
      p.material_tags.forEach(t => materials.add(t));
      p.use_case_tags.forEach(t => useCases.add(t));
    }

    return {
      style: Array.from(styles).slice(0, 6),
      color: Array.from(colors).slice(0, 6),
      material: Array.from(materials).slice(0, 6),
      useCase: Array.from(useCases).slice(0, 6),
    };
  }, [recommended, allProducts]);

  const filteredRecommended = useMemo(() => {
    let products = recommended;
    if (activeFilters.style.length > 0) {
      products = products.filter(p => p.style_tags.some(t => activeFilters.style.includes(t)));
    }
    if (activeFilters.color.length > 0) {
      products = products.filter(p => activeFilters.color.includes(p.main_color || ""));
    }
    if (activeFilters.material.length > 0) {
      products = products.filter(p => p.material_tags.some(t => activeFilters.material.includes(t)));
    }
    if (activeFilters.useCase.length > 0) {
      products = products.filter(p => p.use_case_tags.some(t => activeFilters.useCase.includes(t)));
    }
    return products;
  }, [recommended, activeFilters]);

  const toggleFilter = (key: FilterKey, value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value],
    }));
  };

  const activeFilterCount = Object.values(activeFilters).flat().length;

  return (
    <section className="py-16 px-6">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-foreground" />
            <span className="text-xs font-body uppercase tracking-[0.2em] text-muted-foreground">
              Product Search
            </span>
          </div>

          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
            Results for "{query}"
          </h2>
          <p className="text-sm text-muted-foreground font-body">
            {filteredRecommended.length} product{filteredRecommended.length !== 1 ? "s" : ""} found
          </p>
        </motion.div>

        {/* Filters */}
        <div className="mb-8">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm font-display font-semibold text-foreground border border-border rounded-full px-4 py-2 hover:border-foreground transition-colors"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-foreground text-primary-foreground text-[10px] rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 space-y-4"
            >
              <FilterRow label="Style" options={filterOptions.style} active={activeFilters.style} onToggle={(v) => toggleFilter("style", v)} />
              <FilterRow label="Color" options={filterOptions.color} active={activeFilters.color} onToggle={(v) => toggleFilter("color", v)} />
              <FilterRow label="Material" options={filterOptions.material} active={activeFilters.material} onToggle={(v) => toggleFilter("material", v)} />
              <FilterRow label="Use case" options={filterOptions.useCase} active={activeFilters.useCase} onToggle={(v) => toggleFilter("useCase", v)} />

              {activeFilterCount > 0 && (
                <button
                  onClick={() => setActiveFilters({ style: [], color: [], material: [], useCase: [] })}
                  className="flex items-center gap-1.5 text-xs font-body text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3 w-3" /> Clear all filters
                </button>
              )}
            </motion.div>
          )}
        </div>

        {/* Recommended Products */}
        {filteredRecommended.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {filteredRecommended.map((product) => (
              <ProductSearchCard
                key={product.id}
                product={product}
                onCreateProject={onCreateProjectFromProduct}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground font-body">
              No products match your current filters. Try adjusting your search.
            </p>
          </div>
        )}

        {/* Similar Products */}
        {similar.length > 0 && (
          <div className="mt-16">
            <h3 className="font-display text-lg font-bold text-foreground mb-6">
              Similar products
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {similar.map((product) => (
                <ProductSearchCard
                  key={product.id}
                  product={product}
                  onCreateProject={onCreateProjectFromProduct}
                />
              ))}
            </div>
          </div>
        )}

        {/* Compatible Products */}
        {compatible.length > 0 && (
          <div className="mt-16">
            <h3 className="font-display text-lg font-bold text-foreground mb-6">
              Compatible products
            </h3>
            <p className="text-xs text-muted-foreground font-body mb-4">
              Products that pair well with your selection
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {compatible.map((product) => (
                <ProductSearchCard
                  key={product.id}
                  product={product}
                  onCreateProject={onCreateProjectFromProduct}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

function ProductSearchCard({
  product,
  onCreateProject,
}: {
  product: DBProduct;
  onCreateProject: (product: DBProduct) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
      className="group"
    >
      <div className="aspect-square overflow-hidden bg-card rounded-sm mb-4 relative">
        <img
          src={product.image_url || "/placeholder.svg"}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          loading="lazy"
        />
      </div>
      <div>
        <h3 className="font-display font-semibold text-sm text-foreground truncate">
          {product.name}
        </h3>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 font-body">
          {product.short_description}
        </p>
        <p className="text-sm font-display font-medium text-foreground mt-2">
          {product.indicative_price}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-2">
          {product.style_tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-[10px] font-body text-muted-foreground bg-card border border-border rounded-full px-2 py-0.5 capitalize">
              {tag}
            </span>
          ))}
          {product.material_tags.slice(0, 1).map(tag => (
            <span key={tag} className="text-[10px] font-body text-muted-foreground bg-card border border-border rounded-full px-2 py-0.5 capitalize">
              {tag}
            </span>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => onCreateProject(product)}
          className="mt-3 flex items-center gap-1.5 text-xs font-display font-semibold text-foreground hover:opacity-70 transition-opacity"
        >
          <Sparkles className="h-3 w-3" />
          Create a project with this product
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </motion.div>
  );
}

function FilterRow({
  label,
  options,
  active,
  onToggle,
}: {
  label: string;
  options: string[];
  active: string[];
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div className="flex items-start gap-3">
      <span className="text-[10px] font-body uppercase tracking-[0.15em] text-muted-foreground w-16 flex-shrink-0 pt-2">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        {options.map(option => (
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

export default ProductSearchResults;
