import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProjectParameters } from "@/engine/types";

interface Props {
  params: ProjectParameters;
  onChange: (updates: Partial<ProjectParameters>) => void;
  onBack: () => void;
  onNext: () => void;
}

function getDensityLabel(seats: number | null, surface: number | null): { label: string; color: string } | null {
  if (!seats || !surface || surface <= 0) return null;
  const density = seats / surface;
  if (density <= 0.8) return { label: "Comfortable layout", color: "text-green-600" };
  if (density <= 1.2) return { label: "Balanced layout", color: "text-amber-600" };
  return { label: "Dense layout", color: "text-red-600" };
}

const ProjectBuilderExpertInputs = ({ params, onChange, onBack, onNext }: Props) => {
  const surface = params.terraceSurfaceM2 ??
    (params.terraceLength && params.terraceWidth ? params.terraceLength * params.terraceWidth : null);

  const density = getDensityLabel(params.seatingCapacity, surface);

  return (
    <motion.div
      key="expert"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="font-display text-xl md:text-2xl font-bold text-foreground mb-2">
        Define your project parameters
      </h2>
      <p className="text-sm font-body text-muted-foreground mb-8">
        Enter your exact requirements for a precise recommendation.
      </p>

      <div className="space-y-8">
        {/* Establishment type */}
        <div>
          <Label className="text-xs font-body uppercase tracking-[0.15em] text-muted-foreground mb-2 block">
            Establishment type
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {["restaurant", "hotel", "rooftop", "beach-club", "bar", "camping", "event", "pool"].map((type) => (
              <button
                key={type}
                onClick={() => onChange({ establishmentType: type })}
                className={`px-3 py-2 text-xs font-display font-semibold rounded-sm border transition-all capitalize ${
                  params.establishmentType === type
                    ? "border-foreground bg-foreground text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-foreground/30"
                }`}
              >
                {type.replace("-", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Exact seating */}
        <div>
          <Label htmlFor="exact-seats" className="text-xs font-body uppercase tracking-[0.15em] text-muted-foreground mb-2 block">
            Exact seating capacity
          </Label>
          <Input
            id="exact-seats"
            type="number"
            min={1}
            max={500}
            placeholder="e.g. 60"
            value={params.seatingCapacity ?? ""}
            onChange={(e) => onChange({ seatingCapacity: e.target.value ? parseInt(e.target.value) : null })}
            className="max-w-48"
          />
        </div>

        {/* Terrace surface */}
        <div>
          <Label className="text-xs font-body uppercase tracking-[0.15em] text-muted-foreground mb-2 block">
            Terrace dimensions
          </Label>
          <div className="flex items-end gap-3">
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

          {/* Density indicator */}
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

        {/* Layout strategy */}
        <div>
          <Label className="text-xs font-body uppercase tracking-[0.15em] text-muted-foreground mb-2 block">
            Seating layout strategy
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { value: "mostly-2", label: "Mostly 2-seater" },
              { value: "balanced-2-4", label: "Mix 2 & 4-seater" },
              { value: "mostly-4", label: "Mostly 4-seater" },
              { value: "modular", label: "Flexible modular" },
              { value: "group", label: "Group dining" },
              { value: "custom", label: "Custom mix" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => onChange({ seatingLayout: opt.value })}
                className={`px-3 py-2 text-xs font-display font-semibold rounded-sm border transition-all ${
                  params.seatingLayout === opt.value
                    ? "border-foreground bg-foreground text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-foreground/30"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Layout priority */}
        <div>
          <Label className="text-xs font-body uppercase tracking-[0.15em] text-muted-foreground mb-2 block">
            Layout priority
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { value: "max-capacity", label: "Max capacity" },
              { value: "balanced", label: "Balanced" },
              { value: "spacious", label: "Spacious premium" },
              { value: "flexible-groups", label: "Flexible groups" },
              { value: "couples", label: "Couples" },
              { value: "groups", label: "Groups" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => onChange({ layoutPriority: opt.value })}
                className={`px-3 py-2 text-xs font-display font-semibold rounded-sm border transition-all ${
                  params.layoutPriority === opt.value
                    ? "border-foreground bg-foreground text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-foreground/30"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Style */}
        <div>
          <Label className="text-xs font-body uppercase tracking-[0.15em] text-muted-foreground mb-2 block">
            Style
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {["mediterranean", "modern", "bistro", "natural", "industrial", "luxury", "coastal", "tropical"].map((s) => (
              <button
                key={s}
                onClick={() => onChange({ style: [s] })}
                className={`px-3 py-2 text-xs font-display font-semibold rounded-sm border transition-all capitalize ${
                  params.style.includes(s)
                    ? "border-foreground bg-foreground text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-foreground/30"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div>
          <Label className="text-xs font-body uppercase tracking-[0.15em] text-muted-foreground mb-2 block">
            Budget range per seat
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { value: "economy", label: "€50–80" },
              { value: "mid", label: "€80–120" },
              { value: "premium", label: "€120–180" },
              { value: "luxury", label: "€180+" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => onChange({ budgetLevel: opt.value })}
                className={`px-3 py-2 text-xs font-display font-semibold rounded-sm border transition-all ${
                  params.budgetLevel === opt.value
                    ? "border-foreground bg-foreground text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-foreground/30"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!params.establishmentType || !params.seatingCapacity}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-display font-semibold rounded-full transition-all ${
            params.establishmentType && params.seatingCapacity
              ? "bg-foreground text-primary-foreground hover:opacity-90"
              : "bg-border text-muted-foreground cursor-not-allowed"
          }`}
        >
          Review & Generate <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
};

export default ProjectBuilderExpertInputs;
