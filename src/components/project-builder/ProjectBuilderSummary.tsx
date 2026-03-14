import { ProjectParameters } from "@/engine/types";

interface ProjectBuilderSummaryProps {
  params: ProjectParameters;
  currentStep: number;
}

const LAYOUT_LABELS: Record<string, string> = {
  "mostly-2": "Mostly 2-seater tables",
  "balanced-2-4": "Mix of 2 & 4-seaters",
  "mostly-4": "Mostly 4-seater tables",
  modular: "Flexible modular",
  group: "Group dining",
  custom: "Custom mix",
};

const PRIORITY_LABELS: Record<string, string> = {
  "max-capacity": "Maximize capacity",
  balanced: "Balanced comfort & capacity",
  spacious: "Spacious premium",
  "flexible-groups": "Flexible for groups",
  couples: "Couple seating",
  groups: "Group seating",
};

const BUDGET_LABELS: Record<string, string> = {
  economy: "€50–80 / seat",
  mid: "€80–120 / seat",
  premium: "€120–180 / seat",
  luxury: "€180+ / seat",
};

const ProjectBuilderSummary = ({ params }: ProjectBuilderSummaryProps) => {
  const surface = params.terraceSurfaceM2 ??
    (params.terraceLength && params.terraceWidth ? params.terraceLength * params.terraceWidth : null);

  const rows = [
    { label: "Mode", value: params.builderMode === "expert" ? "Expert" : params.builderMode === "guided" ? "Guided" : "" },
    { label: "Project type", value: params.establishmentType },
    { label: "Zone", value: params.projectZone },
    { label: "Capacity", value: params.seatingCapacity ? `${params.seatingCapacity} seats` : "" },
    { label: "Terrace", value: surface ? `${surface} m²` : "" },
    { label: "Layout", value: LAYOUT_LABELS[params.seatingLayout] || "" },
    { label: "Priority", value: PRIORITY_LABELS[params.layoutPriority] || "" },
    { label: "Style", value: params.style.join(", ") },
    { label: "Budget", value: BUDGET_LABELS[params.budgetLevel] || "" },
  ];

  const hasAnyData = rows.some((r) => !!r.value);

  return (
    <div className="sticky top-28">
      <div className="bg-card rounded-sm border border-border p-6">
        <h3 className="font-display text-sm font-bold text-foreground uppercase tracking-[0.1em] mb-5">
          Project Summary
        </h3>

        {!hasAnyData ? (
          <p className="text-xs font-body text-muted-foreground italic">
            Start selecting options to build your project brief...
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.label} className="flex items-baseline gap-3">
                <span className="text-[10px] font-body uppercase tracking-[0.15em] text-muted-foreground w-20 flex-shrink-0">
                  {row.label}
                </span>
                <span className={`text-sm font-display font-medium capitalize ${
                  row.value ? "text-foreground" : "text-border"
                }`}>
                  {row.value || "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectBuilderSummary;
