import { useState, useMemo } from "react";
import { X, Search, Plus, Link2 } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import type { DBProduct } from "@/lib/products";

interface Props {
  label: string;
  description: string;
  value: string[];
  onChange: (ids: string[]) => void;
  /** Filter candidates to only show products with these table_type values */
  filterTableTypes?: string[];
}

export default function CompatibleProductsEditor({ label, description, value, onChange, filterTableTypes }: Props) {
  const { data: allProducts = [] } = useProducts();
  const [search, setSearch] = useState("");

  const selectedProducts = useMemo(
    () => value.map(id => allProducts.find(p => p.id === id)).filter(Boolean) as DBProduct[],
    [value, allProducts]
  );

  const candidates = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return allProducts
      .filter(p => {
        if (value.includes(p.id)) return false;
        if (filterTableTypes?.length) {
          const tt = (p.product_type_tags as any)?.table_type;
          if (!filterTableTypes.includes(tt)) return false;
        }
        const name = p.name.toLowerCase();
        const brand = (p.brand_source || "").toLowerCase();
        return name.includes(q) || brand.includes(q);
      })
      .slice(0, 8);
  }, [search, allProducts, value, filterTableTypes]);

  const add = (id: string) => {
    onChange([...value, id]);
    setSearch("");
  };

  const remove = (id: string) => {
    onChange(value.filter(v => v !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
        <div>
          <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-[9px] font-body text-muted-foreground">{description}</p>
        </div>
      </div>

      {/* Selected products */}
      {selectedProducts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedProducts.map(p => (
            <div key={p.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-card text-[10px] font-body">
              {p.image_url && <img loading="lazy" src={p.image_url} alt="" className="w-5 h-5 rounded object-cover" />}
              <span className="text-foreground font-medium truncate max-w-[160px]">{p.name}</span>
              <span className="text-muted-foreground">{p.brand_source}</span>
              <button onClick={() => remove(p.id)} className="ml-0.5 text-muted-foreground hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un produit compatible..."
          className="w-full pl-9 pr-3 py-2 text-xs font-body border border-border rounded-lg bg-background focus:border-foreground/40 focus:outline-none transition-colors"
        />
      </div>

      {/* Search results */}
      {candidates.length > 0 && (
        <div className="border border-border rounded-lg divide-y divide-border max-h-48 overflow-y-auto">
          {candidates.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => add(p.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-card/80 transition-colors"
            >
              {p.image_url && <img loading="lazy" src={p.image_url} alt="" className="w-7 h-7 rounded object-cover shrink-0" />}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-body font-medium text-foreground truncate">{p.name}</p>
                <p className="text-[9px] font-body text-muted-foreground truncate">
                  {p.brand_source}{p.product_type_tags?.table_type ? ` · ${p.product_type_tags.table_type}` : ""}
                </p>
              </div>
              <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
