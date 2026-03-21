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
  { key: "is_stackable", labelKey: "filters.feat_stackable" },
  { key: "is_chr_heavy_use", labelKey: "filters.feat_heavyDutyChr" },
  { key: "uv_resistant", labelKey: "filters.feat_uvResistant" },
  { key: "weather_resistant", labelKey: "filters.feat_weatherResistant" },
  { key: "lightweight", labelKey: "filters.feat_lightweight" },
  { key: "easy_maintenance", labelKey: "filters.feat_easyMaintenance" },
  { key: "fire_retardant", labelKey: "filters.feat_fireRetardant" },
  { key: "customizable", labelKey: "filters.feat_customizable" },
];

export const STOCK_OPTIONS = [
  { key: "available", labelKey: "filters.stock_available" },
  { key: "low_stock", labelKey: "filters.stock_lowStock" },
  { key: "production", labelKey: "filters.stock_production" },
  { key: "on_order", labelKey: "filters.stock_onOrder" },
  { key: "to_confirm", labelKey: "filters.stock_toConfirm" },
];

export const SORT_OPTIONS = [
  { key: "popular", labelKey: "filters.mostPopular" },
  { key: "price_asc", labelKey: "filters.priceLowHigh" },
  { key: "price_desc", labelKey: "filters.priceHighLow" },
  { key: "newest", labelKey: "filters.newest" },
  { key: "in_stock", labelKey: "filters.inStockFirst" },
];

/** Maps internal option values to their i18n keys inside the "filters" namespace. */
export const CATEGORY_LABEL_KEYS: Record<string, string> = {
  "Chairs": "filters.cat_chairs",
  "Armchairs": "filters.cat_armchairs",
  "Stools": "filters.cat_stools",
  "Tables": "filters.cat_tables",
  "Table Bases": "filters.cat_tableBases",
  "Tabletops": "filters.cat_tabletops",
  "Coffee Tables": "filters.cat_coffeeTables",
  "High Tables": "filters.cat_highTables",
  "Sofas": "filters.cat_sofas",
  "Sun Loungers": "filters.cat_sunLoungers",
  "Parasols": "filters.cat_parasols",
  "Benches": "filters.cat_benches",
};

export const USAGE_LABEL_KEYS: Record<string, string> = {
  "restaurant": "filters.restaurant",
  "café": "filters.cafe",
  "hotel": "filters.hotel",
  "beach": "filters.beach",
  "pool": "filters.pool",
  "rooftop": "filters.rooftop",
  "community": "filters.community",
  "camping": "filters.camping",
  "indoor": "filters.indoor",
  "outdoor": "filters.outdoor",
};

export const MATERIAL_LABEL_KEYS: Record<string, string> = {
  "aluminium": "filters.mat_aluminium",
  "polypropylene": "filters.mat_polypropylene",
  "wood": "filters.mat_wood",
  "bamboo": "filters.mat_bamboo",
  "HPL": "filters.mat_hpl",
  "steel": "filters.mat_steel",
  "rope": "filters.mat_rope",
  "synthetic rattan": "filters.mat_syntheticRattan",
  "textile": "filters.mat_textile",
  "technical fabric": "filters.mat_technicalFabric",
};

export const STYLE_LABEL_KEYS: Record<string, string> = {
  "bistro": "filters.sty_bistro",
  "contemporary": "filters.sty_contemporary",
  "mediterranean": "filters.sty_mediterranean",
  "design": "filters.sty_design",
  "natural": "filters.sty_natural",
  "chic": "filters.sty_chic",
  "minimalist": "filters.sty_minimalist",
  "contract": "filters.sty_contract",
  "traditional": "filters.sty_traditional",
};

export const COLOR_LABEL_KEYS: Record<string, string> = {
  "black": "filters.col_black",
  "white": "filters.col_white",
  "blue": "filters.col_blue",
  "green": "filters.col_green",
  "terracotta": "filters.col_terracotta",
  "beige": "filters.col_beige",
  "grey": "filters.col_grey",
  "wood effect": "filters.col_woodEffect",
  "custom": "filters.col_custom",
};

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
              <CheckboxGroup options={CATEGORY_OPTIONS} selected={filters.categories} labelKeys={CATEGORY_LABEL_KEYS} onToggle={(v) => update({ categories: toggle(filters.categories, v) })} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="usage" className="border-border">
            <AccordionTrigger className="text-xs font-display font-bold uppercase tracking-wider text-foreground hover:no-underline py-3">
              {t('filters.usage')}
            </AccordionTrigger>
            <AccordionContent>
              <CheckboxGroup options={USAGE_OPTIONS} selected={filters.usage} labelKeys={USAGE_LABEL_KEYS} onToggle={(v) => update({ usage: toggle(filters.usage, v) })} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="material" className="border-border">
            <AccordionTrigger className="text-xs font-display font-bold uppercase tracking-wider text-foreground hover:no-underline py-3">
              {t('filters.material')}
            </AccordionTrigger>
            <AccordionContent>
              <CheckboxGroup options={MATERIAL_OPTIONS} selected={filters.materials} labelKeys={MATERIAL_LABEL_KEYS} onToggle={(v) => update({ materials: toggle(filters.materials, v) })} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="style" className="border-border">
            <AccordionTrigger className="text-xs font-display font-bold uppercase tracking-wider text-foreground hover:no-underline py-3">
              {t('filters.style')}
            </AccordionTrigger>
            <AccordionContent>
              <CheckboxGroup options={STYLE_OPTIONS} selected={filters.styles} labelKeys={STYLE_LABEL_KEYS} onToggle={(v) => update({ styles: toggle(filters.styles, v) })} />
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
              <KeyLabelCheckboxGroup
                options={FEATURE_OPTIONS}
                selected={filters.features}
                onToggle={(key) => update({ features: toggle(filters.features, key) })}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="stock" className="border-border">
            <AccordionTrigger className="text-xs font-display font-bold uppercase tracking-wider text-foreground hover:no-underline py-3">
              {t('filters.stock')}
            </AccordionTrigger>
            <AccordionContent>
              <KeyLabelCheckboxGroup
                options={STOCK_OPTIONS}
                selected={filters.stock}
                onToggle={(key) => update({ stock: toggle(filters.stock, key) })}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="color" className="border-border">
            <AccordionTrigger className="text-xs font-display font-bold uppercase tracking-wider text-foreground hover:no-underline py-3">
              {t('filters.color')}
            </AccordionTrigger>
            <AccordionContent>
              <CheckboxGroup options={COLOR_OPTIONS} selected={filters.colors} labelKeys={COLOR_LABEL_KEYS} onToggle={(v) => update({ colors: toggle(filters.colors, v) })} />
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

function CheckboxGroup({ options, selected, labelKeys, onToggle }: { options: string[]; selected: string[]; labelKeys?: Record<string, string>; onToggle: (value: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2.5 pb-1">
      {options.map((option) => (
        <label key={option} className="flex items-center gap-2.5 cursor-pointer group/check">
          <Checkbox checked={selected.includes(option)} onCheckedChange={() => onToggle(option)} className="h-3.5 w-3.5 rounded-sm border-muted-foreground/40 data-[state=checked]:border-foreground data-[state=checked]:bg-foreground" />
          <span className="text-xs font-body text-muted-foreground group-hover/check:text-foreground transition-colors capitalize">
            {labelKeys?.[option] ? t(labelKeys[option]) : option}
          </span>
        </label>
      ))}
    </div>
  );
}

function KeyLabelCheckboxGroup({ options, selected, onToggle }: { options: { key: string; labelKey: string }[]; selected: string[]; onToggle: (key: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2.5 pb-1">
      {options.map((option) => (
        <label key={option.key} className="flex items-center gap-2.5 cursor-pointer group/check">
          <Checkbox checked={selected.includes(option.key)} onCheckedChange={() => onToggle(option.key)} className="h-3.5 w-3.5 rounded-sm border-muted-foreground/40 data-[state=checked]:border-foreground data-[state=checked]:bg-foreground" />
          <span className="text-xs font-body text-muted-foreground group-hover/check:text-foreground transition-colors capitalize">
            {t(option.labelKey)}
          </span>
        </label>
      ))}
    </div>
  );
}
