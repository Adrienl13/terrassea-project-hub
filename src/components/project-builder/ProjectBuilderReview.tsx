import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, RotateCcw, Sparkles } from "lucide-react";
import { ProjectParameters } from "@/engine/types";
import { getDensityInfo, getMaxSeats } from "@/engine/spatialEngine";

interface ProjectBuilderReviewProps {
  params: ProjectParameters;
  onGenerate: () => void;
  onBack: () => void;
  onReset: () => void;
  isLoading: boolean;
}

const LAYOUT_LABELS: Record<string, string> = {
  "mostly-2": "Mostly 2-seater tables",
  "balanced-2-4": "Balanced mix of 2 & 4-seaters",
  "mostly-4": "Mostly 4-seater tables",
  modular: "Flexible modular layout",
  group: "Group dining friendly",
  custom: "Custom mix",
};

const PRIORITY_LABELS: Record<string, string> = {
  "max-capacity": "Maximize seating capacity",
  balanced: "Balanced comfort & capacity",
  spacious: "Spacious premium layout",
  "flexible-groups": "Flexible tables for groups",
  couples: "Mostly couple seating",
  groups: "Mostly group seating",
};

const BUDGET_LABELS: Record<string, string> = {
  economy: "€50–80 per seat",
  mid: "€80–120 per seat",
  premium: "€120–180 per seat",
  luxury: "€180+ per seat",
};

function getDensityLabel(seats: number | null, surface: number | null): string | null {
  if (!seats || !surface || surface <= 0) return null;
  const density = seats / surface;
  if (density <= 0.8) return "Comfortable layout";
  if (density <= 1.2) return "Balanced layout";
  return "Dense layout";
}

const ProjectBuilderReview = ({ params, onGenerate, onBack, onReset, isLoading }: ProjectBuilderReviewProps) => {
  const surface = params.terraceSurfaceM2 ??
    (params.terraceLength && params.terraceWidth ? params.terraceLength * params.terraceWidth : null);
  const densityLabel = getDensityLabel(params.seatingCapacity, surface);

  const rows = [
    { label: "Establishment", value: params.establishmentType || "Not specified" },
    { label: "Zone", value: params.projectZone || "outdoor" },
    { label: "Capacity", value: params.seatingCapacity ? `${params.seatingCapacity} seats` : "Not specified" },
    ...(surface ? [{ label: "Terrace", value: `${surface} m²` }] : []),
    ...(densityLabel ? [{ label: "Density", value: densityLabel }] : []),
    { label: "Layout strategy", value: LAYOUT_LABELS[params.seatingLayout] || "Not specified" },
    { label: "Layout priority", value: PRIORITY_LABELS[params.layoutPriority] || "Not specified" },
    { label: "Style", value: params.style.length > 0 ? params.style.join(", ") : "Not specified" },
    { label: "Budget", value: BUDGET_LABELS[params.budgetLevel] || "Not specified" },
  ];

  return (
    <motion.div
      key="review"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-3 mb-2">
        <Sparkles className="h-4 w-4 text-foreground" />
        <span className="text-xs font-body uppercase tracking-[0.2em] text-muted-foreground">
          Project Brief — Review
        </span>
      </div>

      <h2 className="font-display text-xl md:text-2xl font-bold text-foreground mb-6">
        Review your project configuration
      </h2>

      <div className="bg-card rounded-sm border border-border p-6 space-y-4 mb-8">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline gap-4">
            <span className="text-[10px] font-body uppercase tracking-[0.15em] text-muted-foreground w-28 flex-shrink-0">
              {row.label}
            </span>
            <span className="text-sm font-display font-medium text-foreground capitalize">
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={onGenerate}
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-3 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          Build my recommendation
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-3 text-sm font-body text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Edit answers
        </button>
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-5 py-3 text-sm font-body text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Start over
        </button>
      </div>
    </motion.div>
  );
};

export default ProjectBuilderReview;
