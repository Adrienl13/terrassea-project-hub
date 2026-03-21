import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import type { FilterState } from "./ProductFilterSidebar";
import {
  FEATURE_OPTIONS,
  STOCK_OPTIONS,
  CATEGORY_LABEL_KEYS,
  USAGE_LABEL_KEYS,
  MATERIAL_LABEL_KEYS,
  STYLE_LABEL_KEYS,
  COLOR_LABEL_KEYS,
} from "./ProductFilterSidebar";

interface ActiveFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onClearAll: () => void;
}

interface FilterChip {
  label: string;
  onRemove: () => void;
}

export default function ActiveFilters({ filters, onChange, onClearAll }: ActiveFiltersProps) {
  const { t } = useTranslation();
  const chips: FilterChip[] = [];

  const remove = (key: keyof FilterState, value: string) => {
    const arr = filters[key] as string[];
    onChange({ ...filters, [key]: arr.filter((v) => v !== value) });
  };

  filters.categories.forEach((v) =>
    chips.push({ label: CATEGORY_LABEL_KEYS[v] ? t(CATEGORY_LABEL_KEYS[v]) : v, onRemove: () => remove("categories", v) })
  );
  filters.usage.forEach((v) =>
    chips.push({ label: USAGE_LABEL_KEYS[v] ? t(USAGE_LABEL_KEYS[v]) : v, onRemove: () => remove("usage", v) })
  );
  filters.materials.forEach((v) =>
    chips.push({ label: MATERIAL_LABEL_KEYS[v] ? t(MATERIAL_LABEL_KEYS[v]) : v, onRemove: () => remove("materials", v) })
  );
  filters.styles.forEach((v) =>
    chips.push({ label: STYLE_LABEL_KEYS[v] ? t(STYLE_LABEL_KEYS[v]) : v, onRemove: () => remove("styles", v) })
  );
  filters.colors.forEach((v) =>
    chips.push({ label: COLOR_LABEL_KEYS[v] ? t(COLOR_LABEL_KEYS[v]) : v, onRemove: () => remove("colors", v) })
  );
  filters.features.forEach((v) => {
    const feat = FEATURE_OPTIONS.find((f) => f.key === v);
    const label = feat ? t(feat.labelKey) : v;
    chips.push({ label, onRemove: () => remove("features", v) });
  });
  filters.stock.forEach((v) => {
    const opt = STOCK_OPTIONS.find((s) => s.key === v);
    const label = opt ? t(opt.labelKey) : v;
    chips.push({ label, onRemove: () => remove("stock", v) });
  });

  if (filters.priceRange[0] > 0 || filters.priceRange[1] < 500) {
    chips.push({
      label: `€${filters.priceRange[0]} – €${filters.priceRange[1]}`,
      onRemove: () => onChange({ ...filters, priceRange: [0, 500] }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip, i) => (
        <button
          key={i}
          onClick={chip.onRemove}
          className="inline-flex items-center gap-1 text-[11px] font-body text-foreground bg-muted/50 border border-border rounded-full px-2.5 py-1 hover:border-foreground/30 transition-colors capitalize"
        >
          {chip.label}
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      ))}
      <button
        onClick={onClearAll}
        className="text-[11px] font-body text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
      >
        {t('filters.clearAll')}
      </button>
    </div>
  );
}
