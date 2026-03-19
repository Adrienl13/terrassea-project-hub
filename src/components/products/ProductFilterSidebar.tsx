import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";

export interface FilterState {
  categories: string[];
  usage: string[];
  materials: string[];
  styles: string[];
  colors: string[];
  features: string[];
  stock: string[];
  priceRange: [number, number];
}

export const EMPTY_FILTERS: FilterState = {
  categories: [],
  usage: [],
  materials: [],
  styles: [],
  colors: [],
  features: [],
  stock: [],
  priceRange: [0, 500],
};

export const CATEGORY_OPTIONS = [
  "Chairs", "Armchairs", "Stools", "Tables", "Table Bases", "Tabletops",
  "Coffee Tables", "High Tables", "Sofas", "Sun Loungers", "Parasols", "Benches",
];

export const USAGE_OPTIONS = [
  "restaurant", "café", "hotel", "beach", "pool", "rooftop",
  "community", "camping", "indoor", "outdoor",
];

export const MATERIAL_OPTIONS = [
  "aluminium", "polypropylene", "wood", "bamboo", "HPL", "steel",
  "rope", "synthetic rattan", "textile", "technical fabric",
];

export const STYLE_OPTIONS = [
  "bistro", "contemporary", "mediterranean", "design", "natural",
  "chic", "minimalist", "contract", "traditional",
];

export const COLOR_OPTIONS = [
  "black", "white", "blue", "green", "terracotta", "beige",
  "grey", "wood effect", "custom",
];

export const FEATURE_OPTIONS = [
  { key: "is_stackable", label: "Stackable" },
  { key: "is_chr_heavy_use", label: "Heavy-duty CHR" },
  { key: "uv_resistant", label: "UV Resistant" },
  { key: "weather_resistant", label: "Weather Resistant" },
  { key: "lightweight", label: "Lightweight" },
  { key: "easy_maintenance", label: "Easy Maintenance" },
  { key: "fire_retardant", label: "Fire Retardant" },
  { key: "customizable", label: "Customizable" },
];

export const STOCK_OPTIONS = [
  { key: "available", label: "In stock" },
  { key: "low_stock", label: "Low stock" },
  { key: "production", label: "Quick production" },
  { key: "on_order", label: "On order" },
  { key: "to_confirm", label: "To confirm" },
];

export const SORT_OPTIONS = [
  { key: "popular", labelKey: "filters.mostPopular" },
  { key: "price_asc", labelKey: "filters.priceLowHigh" },
  { key: "price_desc", labelKey: "filters.priceHighLow" },
  { key: "newest", labelKey: "filters.newest" },
  { key: "in_stock", labelKey: "filters.inStockFirst" },
];

function toggle(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

interface ProductFilterSidebarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onClose?: () => void;
  showHeader?: boolean;
}

export default function ProductFilterSidebar({
  filters,
  onChange,
  onClose,
  showHeader = false,
}: ProductFilterSidebarProps) {
  const { t } = useTranslation();
  const update = (partial: Partial<FilterState>) =>
    onChange({ ...filters, ...partial });

  return (
    <div className="h-full flex flex-col">
      {showHeader && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-display text-base font-bold text-foreground">{t('filters.filters')}</h2>
          {onClose && (
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-2">
        <Accordion type="multiple" defaultValue={["type", "usage", "material"]} className="w-full">
          <AccordionItem value="type" className="border-border">
            <AccordionTrigger className="text-xs font-display font-bold uppercase tracking-wider text-foreground hover:no-underline py-3">
              {t('filters.type')}
            </AccordionTrigger>
            <AccordionContent>
              <CheckboxGroup options={CATEGORY_OPTIONS} selected={filters.categories} onToggle={(v) => update({ categories: toggle(filters.categories, v) })} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="usage" className="border-border">
            <AccordionTrigger className="text-xs font-display font-bold uppercase tracking-wider text-foreground hover:no-underline py-3">
              {t('filters.usage')}
            </AccordionTrigger>
            <AccordionContent>
              <CheckboxGroup options={USAGE_OPTIONS} selected={filters.usage} onToggle={(v) => update({ usage: toggle(filters.usage, v) })} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="material" className="border-border">
            <AccordionTrigger className="text-xs font-display font-bold uppercase tracking-wider text-foreground hover:no-underline py-3">
              {t('filters.material')}
            </AccordionTrigger>
            <AccordionContent>
              <CheckboxGroup options={MATERIAL_OPTIONS} selected={filters.materials} onToggle={(v) => update({ materials: toggle(filters.materials, v) })} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="style" className="border-border">
            <AccordionTrigger className="text-xs font-display font-bold uppercase tracking-wider text-foreground hover:no-underline py-3">
              {t('filters.style')}
            </AccordionTrigger>
            <AccordionContent>
              <CheckboxGroup options={STYLE_OPTIONS} selected={filters.styles} onToggle={(v) => update({ styles: toggle(filters.styles, v) })} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="price" className="border-border">
            <AccordionTrigger className="text-xs font-display font-bold uppercase tracking-wider text-foreground hover:no-underline py-3">
              {t('filters.price')}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pb-2">
                <div className="flex items-center justify-between text-xs font-body text-muted-foreground">
                  <span>€{filters.priceRange[0]}</span>
                  <span>€{filters.priceRange[1]}+</span>
                </div>
                <Slider min={0} max={500} step={10} value={filters.priceRange} onValueChange={(v) => update({ priceRange: [v[0], v[1]] })} className="w-full" />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="features" className="border-border">
            <AccordionTrigger className="text-xs font-display font-bold uppercase tracking-wider text-foreground hover:no-underline py-3">
              {t('filters.features')}
            </AccordionTrigger>
            <AccordionContent>
              <CheckboxGroup
                options={FEATURE_OPTIONS.map((f) => f.label)}
                selected={filters.features.map((k) => FEATURE_OPTIONS.find((f) => f.key === k)?.label || k)}
                onToggle={(label) => { const feat = FEATURE_OPTIONS.find((f) => f.label === label); if (feat) update({ features: toggle(filters.features, feat.key) }); }}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="stock" className="border-border">
            <AccordionTrigger className="text-xs font-display font-bold uppercase tracking-wider text-foreground hover:no-underline py-3">
              {t('filters.stock')}
            </AccordionTrigger>
            <AccordionContent>
              <CheckboxGroup
                options={STOCK_OPTIONS.map((s) => s.label)}
                selected={filters.stock.map((k) => STOCK_OPTIONS.find((s) => s.key === k)?.label || k)}
                onToggle={(label) => { const opt = STOCK_OPTIONS.find((s) => s.label === label); if (opt) update({ stock: toggle(filters.stock, opt.key) }); }}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="color" className="border-border">
            <AccordionTrigger className="text-xs font-display font-bold uppercase tracking-wider text-foreground hover:no-underline py-3">
              {t('filters.color')}
            </AccordionTrigger>
            <AccordionContent>
              <CheckboxGroup options={COLOR_OPTIONS} selected={filters.colors} onToggle={(v) => update({ colors: toggle(filters.colors, v) })} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {onClose && (
        <div className="border-t border-border p-4">
          <button onClick={onClose} className="w-full py-3 text-sm font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity">
            {t('filters.applyFilters')}
          </button>
        </div>
      )}
    </div>
  );
}

function CheckboxGroup({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (value: string) => void }) {
  return (
    <div className="space-y-2.5 pb-1">
      {options.map((option) => (
        <label key={option} className="flex items-center gap-2.5 cursor-pointer group/check">
          <Checkbox checked={selected.includes(option)} onCheckedChange={() => onToggle(option)} className="h-3.5 w-3.5 rounded-sm border-muted-foreground/40 data-[state=checked]:border-foreground data-[state=checked]:bg-foreground" />
          <span className="text-xs font-body text-muted-foreground group-hover/check:text-foreground transition-colors capitalize">{option}</span>
        </label>
      ))}
    </div>
  );
}
