import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface StyleStepProps {
  selectedStyles: string[];
  onToggle: (style: string) => void;
  onBack?: () => void;
  onNext?: () => void;
}

const STYLE_OPTIONS = [
  {
    value: "mediterranean",
    label: "Mediterranean",
    description: "Riviera, earthy tones, natural textures",
    palette: ["#D4603A", "#C4956A", "#E8D5B0", "#4A90A4", "#6B7B5E"],
    paletteNames: ["Terracotta", "Ocre", "Sand", "Azure", "Olive"],
  },
  {
    value: "bistro",
    label: "Bistro / Parisian",
    description: "Classic French terrace charm",
    palette: ["#C0392B", "#7D2935", "#1A1A1A", "#6B4C1E", "#F5E6D3"],
    paletteNames: ["Red", "Bordeaux", "Iron", "Dark wood", "Cream"],
  },
  {
    value: "natural",
    label: "Natural / Organic",
    description: "Organic materials, earthy palette",
    palette: ["#8B7355", "#E8DDD3", "#6B7B5E", "#D4C9B8", "#A0856E"],
    paletteNames: ["Teak", "Linen", "Sage", "Dune", "Clay"],
  },
  {
    value: "modern",
    label: "Modern / Minimal",
    description: "Clean lines, contemporary design",
    palette: ["#1A1A1A", "#F5F0EB", "#888888", "#C0C0C0", "#D4C9B8"],
    paletteNames: ["Black", "Off-white", "Concrete", "Steel", "Stone"],
  },
  {
    value: "luxury",
    label: "Luxury / Premium",
    description: "High-end materials, exclusive feel",
    palette: ["#1B4D3E", "#1A2456", "#722F37", "#C4956A", "#F5E6D3"],
    paletteNames: ["Emerald", "Navy", "Bordeaux", "Gold", "Ivory"],
  },
  {
    value: "industrial",
    label: "Industrial / Urban",
    description: "Metal, raw finishes, urban character",
    palette: ["#2D2D2D", "#C4956A", "#C0C0C0", "#5D3A1A", "#F5F0EB"],
    paletteNames: ["Anthracite", "Bronze", "Steel", "Dark wood", "Off-white"],
  },
  {
    value: "coastal",
    label: "Coastal / Nautical",
    description: "Maritime elegance, harbour vibes",
    palette: ["#2C5F7C", "#FFFFFF", "#F5E6D3", "#8B7355", "#A8C5D6"],
    paletteNames: ["Navy", "White", "Sand", "Rope", "Sky"],
  },
  {
    value: "tropical",
    label: "Tropical / Resort",
    description: "Exotic, lush, resort-style living",
    palette: ["#6B7B5E", "#D4A574", "#F5E6D3", "#8B7355", "#2BBCD4"],
    paletteNames: ["Palm", "Bamboo", "Coconut", "Teak", "Turquoise"],
  },
];

const StyleStep = ({ selectedStyles, onToggle, onBack, onNext }: StyleStepProps) => {
  const canProceed = selectedStyles.length > 0;

  return (
    <motion.div
      key="style-step"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="font-display text-xl md:text-2xl font-bold text-foreground mb-2">
        What style defines your project?
      </h2>
      <p className="text-sm font-body text-muted-foreground mb-8">
        Select one or more styles — we'll create concepts that blend them.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {STYLE_OPTIONS.map((option) => {
          const isSelected = selectedStyles.includes(option.value);
          return (
            <button
              key={option.value}
              onClick={() => onToggle(option.value)}
              className={`text-left p-4 rounded-sm border transition-all group relative overflow-hidden ${
                isSelected
                  ? "border-foreground bg-foreground/[0.02]"
                  : "border-border bg-card hover:border-foreground/30"
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-foreground flex items-center justify-center flex-shrink-0">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}

              <div className="flex items-center gap-1.5 mb-3">
                {option.palette.map((color, i) => (
                  <div
                    key={i}
                    title={option.paletteNames[i]}
                    className="w-5 h-5 rounded-full border border-black/10 flex-shrink-0 transition-transform group-hover:scale-110"
                    style={{ background: color, transitionDelay: `${i * 20}ms` }}
                  />
                ))}
                <div
                  className="ml-auto h-px flex-1 opacity-30 rounded-full"
                  style={{ background: option.palette[0] }}
                />
              </div>

              <span className="font-display font-bold text-sm text-foreground block">
                {option.label}
              </span>
              <span className="text-xs font-body text-muted-foreground block mt-0.5">
                {option.description}
              </span>

              <p className="text-[9px] font-body text-muted-foreground/60 mt-2 truncate">
                {option.paletteNames.slice(0, 3).join(" · ")}
              </p>
            </button>
          );
        })}
      </div>

      {selectedStyles.length === 0 && (
        <p className="text-[11px] font-body text-muted-foreground mt-4 text-center">
          You can select multiple styles for hybrid concepts
        </p>
      )}

      {selectedStyles.length > 0 && (
        <p className="text-[11px] font-body text-muted-foreground mt-4 text-center">
          {selectedStyles.length} style{selectedStyles.length > 1 ? "s" : ""} selected
          {selectedStyles.length > 1 ? " — we'll blend them together" : ""}
        </p>
      )}

      <div className="flex items-center justify-between mt-8">
        {onBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>
        ) : <div />}

        {onNext && (
          <button
            onClick={onNext}
            disabled={!canProceed}
            className={`flex items-center gap-2 px-6 py-2.5 text-sm font-display font-semibold rounded-full transition-all ${
              canProceed
                ? "bg-foreground text-primary-foreground hover:opacity-90"
                : "bg-border text-muted-foreground cursor-not-allowed opacity-50"
            }`}
          >
            Review brief
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>
    </motion.div>
  );
};

export { STYLE_OPTIONS };
export default StyleStep;
