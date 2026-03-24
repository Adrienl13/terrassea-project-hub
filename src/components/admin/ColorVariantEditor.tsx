import { Plus, X, GripVertical } from "lucide-react";
import type { ColorVariant } from "@/lib/products";

const COLOR_SLUGS = [
  "white","off-white","cream","ivory","sand","natural","beige","champagne",
  "taupe","grey","graphite","charcoal","anthracite","black","teak","walnut",
  "dark-brown","chocolate","terracotta","rust","copper","red","bordeaux",
  "mustard","gold","yellow","olive","sage","green","navy","petrol","blue",
  "blush","silver","bronze",
];

const SLUG_DEFAULT_HEX: Record<string, string> = {
  white: "#FFFFFF", "off-white": "#FAF9F6", cream: "#FFFDD0", ivory: "#FFFFF0",
  sand: "#C2B280", natural: "#D2B48C", beige: "#F5F5DC", champagne: "#F7E7CE",
  taupe: "#483C32", grey: "#808080", graphite: "#41424C", charcoal: "#36454F",
  anthracite: "#293133", black: "#1A1A1A", teak: "#B8860B", walnut: "#5C4033",
  "dark-brown": "#3B2F2F", chocolate: "#3D1C02", terracotta: "#D4603A", rust: "#B7410E",
  copper: "#B87333", red: "#C41E3A", bordeaux: "#6D2E46", mustard: "#FFDB58",
  gold: "#CFB53B", yellow: "#FFD700", olive: "#808000", sage: "#BCB88A",
  green: "#228B22", navy: "#000080", petrol: "#005F69", blue: "#4169E1",
  blush: "#DE5D83", silver: "#C0C0C0", bronze: "#CD7F32",
};

interface Props {
  value: ColorVariant[];
  onChange: (variants: ColorVariant[]) => void;
}

const inputClass = "w-full text-xs font-body bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-foreground transition-colors";

export default function ColorVariantEditor({ value, onChange }: Props) {
  const variants = value ?? [];

  const update = (index: number, patch: Partial<ColorVariant>) => {
    const next = variants.map((v, i) => (i === index ? { ...v, ...patch } : v));
    onChange(next);
  };

  const add = () => {
    onChange([...variants, { color_slug: "", color_hex: "#808080", label_en: "", available: true }]);
  };

  const remove = (index: number) => {
    onChange(variants.filter((_, i) => i !== index));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...variants];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  };

  const handleSlugChange = (index: number, slug: string) => {
    const hex = SLUG_DEFAULT_HEX[slug] || variants[index].color_hex;
    const label = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");
    update(index, { color_slug: slug, color_hex: hex, label_en: label });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
          Variantes couleur ({variants.length})
        </p>
        <button type="button" onClick={add}
          className="flex items-center gap-1 text-[10px] font-display font-semibold text-foreground hover:text-foreground/80 transition-colors">
          <Plus className="h-3 w-3" /> Ajouter
        </button>
      </div>

      {/* Preview pastilles */}
      {variants.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {variants.map((v, i) => (
            <div key={i} className="relative group" title={v.label_en || v.color_slug}>
              <div
                className={`w-6 h-6 rounded-full border-2 transition-all ${v.available ? "border-foreground/20" : "border-red-300"}`}
                style={{ backgroundColor: v.color_hex }}
              />
              {!v.available && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-px bg-red-500 rotate-45" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Variant rows */}
      {variants.map((variant, i) => (
        <div key={i} className="border border-border rounded-xl p-3 bg-card/50 space-y-2">
          <div className="flex items-center gap-2">
            {/* Reorder handle */}
            <button type="button" onClick={() => moveUp(i)} disabled={i === 0}
              className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors" title="Monter">
              <GripVertical className="h-3.5 w-3.5" />
            </button>

            {/* Color preview */}
            <div className="w-8 h-8 rounded-lg border border-border shrink-0"
              style={{ backgroundColor: variant.color_hex }} />

            {/* Slug dropdown */}
            <select value={variant.color_slug} onChange={e => handleSlugChange(i, e.target.value)}
              className={`${inputClass} flex-1`}>
              <option value="">— Choisir —</option>
              {COLOR_SLUGS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Hex color picker */}
            <input type="color" value={variant.color_hex}
              onChange={e => update(i, { color_hex: e.target.value })}
              className="w-8 h-8 rounded-lg border border-border cursor-pointer shrink-0" title="Hex" />

            {/* Available toggle */}
            <button type="button" onClick={() => update(i, { available: !variant.available })}
              className={`text-[9px] font-display font-bold px-2 py-1 rounded-lg border transition-colors shrink-0 ${
                variant.available
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}>
              {variant.available ? "Dispo" : "Indispo"}
            </button>

            {/* Remove */}
            <button type="button" onClick={() => remove(i)}
              className="text-muted-foreground hover:text-red-500 transition-colors shrink-0" title="Supprimer">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Second row: label + image */}
          <div className="grid grid-cols-2 gap-2 pl-6">
            <div>
              <label className="text-[9px] font-display text-muted-foreground">Label</label>
              <input type="text" value={variant.label_en}
                onChange={e => update(i, { label_en: e.target.value })}
                className={inputClass} placeholder="White" />
            </div>
            <div>
              <label className="text-[9px] font-display text-muted-foreground">Image URL (optionnel)</label>
              <input type="text" value={variant.image_url || ""}
                onChange={e => update(i, { image_url: e.target.value || undefined })}
                className={inputClass} placeholder="https://..." />
            </div>
          </div>

          {/* Image preview */}
          {variant.image_url && (
            <div className="pl-6">
              <img src={variant.image_url} alt={variant.label_en}
                className="w-16 h-16 rounded-lg border border-border object-cover" />
            </div>
          )}
        </div>
      ))}

      {variants.length === 0 && (
        <p className="text-[10px] font-body text-muted-foreground italic text-center py-4">
          Aucune variante. Cliquez sur "Ajouter" pour créer une variante couleur.
        </p>
      )}
    </div>
  );
}
