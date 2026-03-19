import { useTranslation } from "react-i18next";
import { ProjectParameters } from "@/engine/types";
import { getDensityInfo } from "@/engine/spatialEngine";

interface ProjectBuilderSummaryProps {
  params: ProjectParameters;
  currentStep: number;
}

const ProjectBuilderSummary = ({ params }: ProjectBuilderSummaryProps) => {
  const { t } = useTranslation();
  const surface = params.terraceSurfaceM2 ??
    (params.terraceLength && params.terraceWidth ? params.terraceLength * params.terraceWidth : null);
  const density = getDensityInfo(params.seatingCapacity, surface);

  const rows = [
    { label: t('projectBuilder.summary.mode'), value: params.builderMode === "expert" ? t('projectBuilder.summary.expert') : params.builderMode === "guided" ? t('projectBuilder.summary.guided') : "" },
    { label: t('projectBuilder.summary.projectType'), value: params.establishmentType },
    { label: t('projectBuilder.summary.zone'), value: params.projectZone },
    { label: t('projectBuilder.summary.capacity'), value: params.seatingCapacity ? `${params.seatingCapacity} ${t('projectBuilder.review.seats')}` : "" },
    { label: t('projectBuilder.summary.terrace'), value: surface ? `${surface} m²` : "" },
    ...(density ? [
      { label: t('projectBuilder.summary.m2Seat'), value: `${density.spacePerSeat} m²` },
      { label: t('projectBuilder.summary.density'), value: density.label },
      { label: t('projectBuilder.summary.feasibility'), value: density.feasibilityLabel },
    ] : []),
    { label: t('projectBuilder.summary.layout'), value: params.seatingLayout ? t(`projectBuilder.layouts.${params.seatingLayout}`, { defaultValue: "" }) : "" },
    { label: t('projectBuilder.summary.priority'), value: params.layoutPriority ? t(`projectBuilder.priorities.${params.layoutPriority}`, { defaultValue: "" }) : "" },
    { label: t('projectBuilder.summary.style'), value: params.style.join(", ") },
    { label: t('projectBuilder.summary.budget'), value: params.budgetLevel ? t(`projectBuilder.budgetLabels.${params.budgetLevel}`, { defaultValue: "" }) : "" },
  ];

  const hasAnyData = rows.some((r) => !!r.value);

  return (
    <div className="sticky top-28">
      <div className="bg-card rounded-sm border border-border p-6">
        <h3 className="font-display text-sm font-bold text-foreground uppercase tracking-[0.1em] mb-5">
          {t('projectBuilder.summary.title')}
        </h3>

        {!hasAnyData ? (
          <p className="text-xs font-body text-muted-foreground italic">
            {t('projectBuilder.summary.emptyHint')}
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
