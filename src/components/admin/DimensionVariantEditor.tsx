/**
 * @deprecated Phase 1 ÉTAPE 6 — Remplacé par VariantsGrid (mode tableur
 * editable avec autocomplete référentiels et validation Zod inline).
 *
 * Ce composant édite le champ legacy `products.dimension_variants` (jsonb)
 * créé avant le chantier Modèle B. Il est conservé pour la backward compat
 * du UI admin actuel mais ne devrait plus être utilisé pour les nouvelles
 * intégrations. Sera supprimé Phase 2 quand le code applicatif sera
 * entièrement aligné sur product_variants (cf. PLAN_MODELE_B_VARIANTS.md
 * §3, Q5 reco A "deprecate Phase 2").
 */
import { Plus, Trash2, GripVertical, Package } from "lucide-react";
import type { DimensionVariant } from "@/lib/products";

const STOCK_OPTIONS = [
  { value: "in_stock", label: "En stock", dot: "bg-green-500" },
  { value: "low_stock", label: "Stock faible", dot: "bg-amber-500" },
  { value: "out_of_stock", label: "Rupture", dot: "bg-red-500" },
  { value: "made_to_order", label: "Sur commande", dot: "bg-blue-500" },
];

const PRESET_SIZES = [
  // Carrées
  { tag: "60x60", label: "60×60 cm", seats: 2, group: "Carrées" },
  { tag: "70x70", label: "70×70 cm", seats: 2, group: "Carrées" },
  { tag: "80x80", label: "80×80 cm", seats: 4, group: "Carrées" },
  { tag: "90x90", label: "90×90 cm", seats: 4, group: "Carrées" },
  // Rectangulaires
  { tag: "110x70", label: "110×70 cm", seats: 4, group: "Rectangulaires" },
  { tag: "120x70", label: "120×70 cm", seats: 4, group: "Rectangulaires" },
  { tag: "120x80", label: "120×80 cm", seats: 6, group: "Rectangulaires" },
  { tag: "140x80", label: "140×80 cm", seats: 6, group: "Rectangulaires" },
  { tag: "160x80", label: "160×80 cm", seats: 6, group: "Rectangulaires" },
  { tag: "160x90", label: "160×90 cm", seats: 6, group: "Rectangulaires" },
  { tag: "180x90", label: "180×90 cm", seats: 8, group: "Rectangulaires" },
  { tag: "200x90", label: "200×90 cm", seats: 8, group: "Rectangulaires" },
  { tag: "200x100", label: "200×100 cm", seats: 8, group: "Rectangulaires" },
  { tag: "220x100", label: "220×100 cm", seats: 10, group: "Rectangulaires" },
  { tag: "240x100", label: "240×100 cm", seats: 10, group: "Rectangulaires" },
  { tag: "300x100", label: "300×100 cm", seats: 12, group: "Rectangulaires" },
  // Rondes
  { tag: "o60", label: "Ø60 cm", seats: 2, group: "Rondes" },
  { tag: "o70", label: "Ø70 cm", seats: 2, group: "Rondes" },
  { tag: "o80", label: "Ø80 cm", seats: 4, group: "Rondes" },
  { tag: "o90", label: "Ø90 cm", seats: 4, group: "Rondes" },
  { tag: "o100", label: "Ø100 cm", seats: 4, group: "Rondes" },
  { tag: "o120", label: "Ø120 cm", seats: 6, group: "Rondes" },
  { tag: "o150", label: "Ø150 cm", seats: 8, group: "Rondes" },
  // Hautes (bar / mange-debout)
  { tag: "60x60h", label: "60×60 cm (haute)", seats: 2, group: "Hautes" },
  { tag: "70x70h", label: "70×70 cm (haute)", seats: 2, group: "Hautes" },
  { tag: "80x80h", label: "80×80 cm (haute)", seats: 4, group: "Hautes" },
  { tag: "120x60h", label: "120×60 cm (haute)", seats: 4, group: "Hautes" },
  { tag: "o60h", label: "Ø60 cm (haute)", seats: 2, group: "Hautes" },
  { tag: "o80h", label: "Ø80 cm (haute)", seats: 4, group: "Hautes" },
];

interface Props {
  variants: DimensionVariant[];
  onChange: (variants: DimensionVariant[]) => void;
}

export default function DimensionVariantEditor({ variants, onChange }: Props) {
  const addVariant = () => {
    onChange([...variants, {
      dimension_tag: "",
      label: "",
      seats: 2,
      price: 0,
      available: true,
      stock_status: "in_stock",
      stock_quantity: null,
    }]);
  };

  const addPreset = (preset: typeof PRESET_SIZES[number]) => {
    if (variants.some(v => v.dimension_tag === preset.tag)) return;
    onChange([...variants, {
      dimension_tag: preset.tag,
      label: `${preset.label} — ${preset.seats} couverts`,
      seats: preset.seats,
      price: 0,
      available: true,
      stock_status: "in_stock",
      stock_quantity: null,
    }]);
  };

  const updateVariant = (index: number, patch: Partial<DimensionVariant>) => {
    const updated = variants.map((v, i) => i === index ? { ...v, ...patch } : v);
    onChange(updated);
  };

  const removeVariant = (index: number) => {
    onChange(variants.filter((_, i) => i !== index));
  };

  // Price summary
  const prices = variants.filter(v => v.price > 0).map(v => v.price);
  const priceMin = prices.length > 0 ? Math.min(...prices) : null;
  const priceMax = prices.length > 0 ? Math.max(...prices) : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
            Variantes de dimensions
          </p>
          {variants.length > 0 && priceMin != null && (
            <p className="text-[9px] font-body text-muted-foreground mt-0.5">
              {variants.length} taille{variants.length > 1 ? "s" : ""} · Prix : €{priceMin}{priceMax && priceMax !== priceMin ? ` — €${priceMax}` : ""}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={addVariant}
          className="flex items-center gap-1.5 text-[10px] font-display font-semibold text-[#D4603A] hover:text-[#B8472A] transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Ajouter une taille
        </button>
      </div>

      {/* Quick presets */}
      {variants.length === 0 && (
        <div className="border border-dashed border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Package className="h-4 w-4" />
            <p className="text-[10px] font-display font-semibold">Tailles prédéfinies — cliquez pour ajouter</p>
          </div>
          {(["Carrées", "Rectangulaires", "Rondes", "Hautes"] as const).map(group => (
            <div key={group}>
              <p className="text-[9px] font-display font-semibold text-muted-foreground uppercase tracking-wider mb-1">{group}</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_SIZES.filter(p => p.group === group).map(p => (
                  <button
                    key={p.tag}
                    type="button"
                    onClick={() => addPreset(p)}
                    className="text-[10px] font-body px-2.5 py-1 rounded-lg border border-border hover:border-foreground/30 hover:bg-card transition-colors"
                  >
                    {p.label} <span className="text-muted-foreground">({p.seats}pl.)</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <p className="text-[9px] font-body text-muted-foreground italic">
            Ou utilisez le bouton "Ajouter une taille" pour des dimensions personnalisées.
          </p>
        </div>
      )}

      {/* Variant rows */}
      {variants.length > 0 && (
        <div className="space-y-2">
          {/* Column headers */}
          <div className="grid grid-cols-[auto_1fr_1.4fr_0.5fr_0.7fr_0.7fr_0.7fr_auto] gap-2 px-1 text-[8px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="w-4" />
            <div>Tag</div>
            <div>Label</div>
            <div>Places</div>
            <div>Prix HT €</div>
            <div>Stock</div>
            <div>Qté</div>
            <div className="w-7" />
          </div>

          {variants.map((dv, i) => (
            <div
              key={i}
              className="grid grid-cols-[auto_1fr_1.4fr_0.5fr_0.7fr_0.7fr_0.7fr_auto] gap-2 items-center border border-border rounded-lg px-2 py-2 bg-card/50 hover:border-foreground/20 transition-colors"
            >
              {/* Drag handle (visual only for now) */}
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30" />

              {/* Tag */}
              <input
                type="text"
                placeholder="80x80"
                value={dv.dimension_tag}
                onChange={e => updateVariant(i, { dimension_tag: e.target.value })}
                className="w-full px-2 py-1.5 text-xs font-body border border-border rounded-md bg-background focus:border-foreground/40 outline-none transition-colors"
              />

              {/* Label */}
              <input
                type="text"
                placeholder="80×80 cm — 4 couverts"
                value={dv.label}
                onChange={e => updateVariant(i, { label: e.target.value })}
                className="w-full px-2 py-1.5 text-xs font-body border border-border rounded-md bg-background focus:border-foreground/40 outline-none transition-colors"
              />

              {/* Seats */}
              <input
                type="number"
                min={1}
                max={20}
                value={dv.seats}
                onChange={e => updateVariant(i, { seats: Number(e.target.value) || 1 })}
                className="w-full px-2 py-1.5 text-xs font-body border border-border rounded-md bg-background focus:border-foreground/40 outline-none transition-colors text-center"
              />

              {/* Price */}
              <input
                type="number"
                min={0}
                step={10}
                placeholder="0"
                value={dv.price || ""}
                onChange={e => updateVariant(i, { price: Number(e.target.value) || 0 })}
                className="w-full px-2 py-1.5 text-xs font-body border border-border rounded-md bg-background focus:border-foreground/40 outline-none transition-colors font-semibold"
              />

              {/* Stock status */}
              <div className="relative">
                <select
                  value={dv.stock_status || "in_stock"}
                  onChange={e => {
                    const status = e.target.value;
                    updateVariant(i, {
                      stock_status: status,
                      available: status !== "out_of_stock",
                    });
                  }}
                  className="w-full px-1.5 py-1.5 text-[10px] font-body border border-border rounded-md bg-background focus:border-foreground/40 outline-none appearance-none transition-colors"
                >
                  {STOCK_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <div className={`absolute top-1/2 right-1.5 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${
                  STOCK_OPTIONS.find(o => o.value === (dv.stock_status || "in_stock"))?.dot || "bg-green-500"
                }`} />
              </div>

              {/* Stock quantity */}
              <input
                type="number"
                min={0}
                placeholder="—"
                value={dv.stock_quantity ?? ""}
                onChange={e => updateVariant(i, { stock_quantity: e.target.value ? Number(e.target.value) : null })}
                className="w-full px-2 py-1.5 text-xs font-body border border-border rounded-md bg-background focus:border-foreground/40 outline-none transition-colors text-center"
              />

              {/* Delete */}
              <button
                type="button"
                onClick={() => removeVariant(i)}
                className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                title="Supprimer cette taille"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {/* Add more + presets (when variants exist) */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={addVariant}
              className="text-[10px] font-display font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Ligne vide
            </button>
            <span className="text-muted-foreground/30">|</span>
            {PRESET_SIZES.filter(p => !variants.some(v => v.dimension_tag === p.tag)).slice(0, 5).map(p => (
              <button
                key={p.tag}
                type="button"
                onClick={() => addPreset(p)}
                className="text-[9px] font-body px-2 py-0.5 rounded-md border border-dashed border-border hover:border-foreground/30 text-muted-foreground hover:text-foreground transition-colors"
              >
                + {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
