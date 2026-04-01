import type { DimensionVariant } from "@/lib/products";

interface Props {
  variants: DimensionVariant[];
  selectedDimension: string | null;
  onSelectDimension: (dimensionTag: string) => void;
}

export default function DimensionVariantSelector({
  variants,
  selectedDimension,
  onSelectDimension,
}: Props) {
  if (variants.length === 0) return null;

  const selected = variants.find((v) => v.dimension_tag === selectedDimension);

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
        Dimensions disponibles
      </p>
      <div className="flex flex-wrap gap-2">
        {variants.map((v) => {
          const isSelected = selectedDimension === v.dimension_tag;
          const isUnavailable = v.available === false;

          return (
            <button
              key={v.dimension_tag}
              type="button"
              onClick={() => {
                if (!isUnavailable) onSelectDimension(v.dimension_tag);
              }}
              disabled={isUnavailable}
              className={`
                relative px-3 py-2 rounded-lg border text-left transition-all
                ${isSelected
                  ? "border-foreground bg-foreground/[0.03] ring-1 ring-foreground"
                  : "border-border hover:border-foreground/30"
                }
                ${isUnavailable ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              <p className={`text-xs font-display font-bold ${isSelected ? "text-foreground" : "text-foreground/80"}`}>
                {v.label || v.dimension_tag.replace(/x/g, "×")}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-body text-muted-foreground">
                  {v.seats} {v.seats > 1 ? "places" : "place"}
                </span>
                <span className="text-[11px] font-display font-semibold text-[#D4603A]">
                  {v.price.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <p className="text-xs font-body text-muted-foreground">
          {selected.label || selected.dimension_tag.replace(/x/g, "×")} — {selected.seats} places — {selected.price.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} HT
        </p>
      )}
    </div>
  );
}
