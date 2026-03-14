import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProjectParameters } from "@/engine/types";

interface Props {
  params: ProjectParameters;
  onChange: (updates: Partial<ProjectParameters>) => void;
  onBack?: () => void;
  onNext?: () => void;
}

const PRESETS = [
  { value: 20, label: "Under 30 seats", description: "Intimate space" },
  { value: 45, label: "30–60 seats", description: "Medium terrace" },
  { value: 90, label: "60–120 seats", description: "Large terrace" },
  { value: 150, label: "120+ seats", description: "High-volume venue" },
];

function getDensityLabel(seats: number | null, surface: number | null): { label: string; color: string } | null {
  if (!seats || !surface || surface <= 0) return null;
  const density = seats / surface;
  if (density <= 0.8) return { label: "Comfortable layout", color: "text-green-600" };
  if (density <= 1.2) return { label: "Balanced layout", color: "text-amber-600" };
  return { label: "Dense layout", color: "text-red-600" };
}

const CapacityStep = ({ params, onChange, onBack, onNext }: Props) => {
  const surface = params.terraceSurfaceM2 ??
    (params.terraceLength && params.terraceWidth ? params.terraceLength * params.terraceWidth : null);
  const density = getDensityLabel(params.seatingCapacity, surface);

  return (
    <motion.div
      key="capacity"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="font-display text-xl md:text-2xl font-bold text-foreground mb-8">
        What is your target seating capacity?
      </h2>

      {/* Presets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {PRESETS.map((preset) => {
          const isSelected = params.seatingCapacity === preset.value;
          return (
            <button
              key={preset.value}
              onClick={() => onChange({ seatingCapacity: preset.value })}
              className={`text-left p-4 rounded-sm border transition-all ${
                isSelected
                  ? "border-foreground bg-foreground text-primary-foreground"
                  : "border-border bg-card hover:border-foreground/30 text-foreground"
              }`}
            >
              <span className="font-display font-semibold text-sm block">{preset.label}</span>
              <span className={`text-xs font-body mt-1 block ${
                isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
              }`}>{preset.description}</span>
            </button>
          );
        })}
      </div>

      {/* Exact input */}
      <div className="border-t border-border pt-6 mb-6">
        <Label htmlFor="exact-capacity" className="text-xs font-body uppercase tracking-[0.15em] text-muted-foreground mb-2 block">
          Or enter exact number of seats
        </Label>
        <Input
          id="exact-capacity"
          type="number"
          min={1}
          max={500}
          placeholder="e.g. 72"
          value={params.seatingCapacity ?? ""}
          onChange={(e) => onChange({ seatingCapacity: e.target.value ? parseInt(e.target.value) : null })}
          className="max-w-48"
        />
      </div>

      {/* Terrace surface */}
      <div className="border-t border-border pt-6">
        <Label className="text-xs font-body uppercase tracking-[0.15em] text-muted-foreground mb-2 block">
          Terrace dimensions (optional)
        </Label>
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <span className="text-[10px] font-body text-muted-foreground block mb-1">Length (m)</span>
            <Input
              type="number"
              min={1}
              placeholder="12"
              value={params.terraceLength ?? ""}
              onChange={(e) => {
                const len = e.target.value ? parseFloat(e.target.value) : null;
                const w = params.terraceWidth;
                onChange({
                  terraceLength: len,
                  terraceSurfaceM2: len && w ? Math.round(len * w) : params.terraceSurfaceM2,
                });
              }}
              className="max-w-24"
            />
          </div>
          <span className="text-muted-foreground font-body text-sm pb-2">×</span>
          <div>
            <span className="text-[10px] font-body text-muted-foreground block mb-1">Width (m)</span>
            <Input
              type="number"
              min={1}
              placeholder="8"
              value={params.terraceWidth ?? ""}
              onChange={(e) => {
                const w = e.target.value ? parseFloat(e.target.value) : null;
                const len = params.terraceLength;
                onChange({
                  terraceWidth: w,
                  terraceSurfaceM2: len && w ? Math.round(len * w) : params.terraceSurfaceM2,
                });
              }}
              className="max-w-24"
            />
          </div>
          <span className="text-muted-foreground font-body text-sm pb-2">or</span>
          <div>
            <span className="text-[10px] font-body text-muted-foreground block mb-1">Area (m²)</span>
            <Input
              type="number"
              min={1}
              placeholder="96"
              value={params.terraceSurfaceM2 ?? ""}
              onChange={(e) => onChange({
                terraceSurfaceM2: e.target.value ? parseFloat(e.target.value) : null,
                terraceLength: null,
                terraceWidth: null,
              })}
              className="max-w-24"
            />
          </div>
        </div>

        {density && (
          <div className="mt-3 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              density.label.includes("Comfortable") ? "bg-green-500" :
              density.label.includes("Balanced") ? "bg-amber-500" : "bg-red-500"
            }`} />
            <span className={`text-xs font-body font-medium ${density.color}`}>
              {density.label}
            </span>
            <span className="text-[10px] font-body text-muted-foreground">
              ({(params.seatingCapacity! / surface!).toFixed(1)} seats/m²)
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-10">
        {onBack ? (
          <button onClick={onBack} className="flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        ) : <div />}
        {onNext && (
          <button
            onClick={onNext}
            disabled={!params.seatingCapacity}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-display font-semibold rounded-full transition-all ${
              params.seatingCapacity
                ? "bg-foreground text-primary-foreground hover:opacity-90"
                : "bg-border text-muted-foreground cursor-not-allowed"
            }`}
          >
            Next <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default CapacityStep;
