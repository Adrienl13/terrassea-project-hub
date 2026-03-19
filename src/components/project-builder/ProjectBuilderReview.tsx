import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, RotateCcw, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProjectParameters } from "@/engine/types";
import { getDensityInfo } from "@/engine/spatialEngine";

interface ProjectBuilderReviewProps {
  params: ProjectParameters;
  onGenerate: () => void;
  onBack: () => void;
  onReset: () => void;
  isLoading: boolean;
}

const ProjectBuilderReview = ({ params, onGenerate, onBack, onReset, isLoading }: ProjectBuilderReviewProps) => {
  const { t } = useTranslation();

  const surface = params.terraceSurfaceM2 ??
    (params.terraceLength && params.terraceWidth ? params.terraceLength * params.terraceWidth : null);
  const density = getDensityInfo(params.seatingCapacity, surface);

  const ns = t('projectBuilder.review.notSpecified');

  const rows = [
    { label: t('projectBuilder.review.establishment'), value: params.establishmentType || ns },
    { label: t('projectBuilder.review.zone'), value: params.projectZone || "outdoor" },
    { label: t('projectBuilder.review.capacity'), value: params.seatingCapacity ? `${params.seatingCapacity} ${t('projectBuilder.review.seats')}` : ns },
    ...(surface ? [{ label: t('projectBuilder.review.terrace'), value: `${surface} m²` }] : []),
    ...(density ? [
      { label: t('projectBuilder.review.spaceSeat'), value: `${density.spacePerSeat} m²/${t('projectBuilder.review.seats').charAt(0)}` },
      { label: t('projectBuilder.review.circulation'), value: density.label },
      { label: t('projectBuilder.review.feasibility'), value: density.feasibilityLabel },
    ] : []),
    { label: t('projectBuilder.review.layoutStrategy'), value: t(`projectBuilder.layouts.${params.seatingLayout}`, { defaultValue: ns }) },
    { label: t('projectBuilder.review.layoutPriority'), value: t(`projectBuilder.priorities.${params.layoutPriority}`, { defaultValue: ns }) },
    { label: t('projectBuilder.review.style'), value: params.style.length > 0 ? params.style.join(", ") : ns },
    { label: t('projectBuilder.review.budget'), value: params.budgetLevel ? t(`projectBuilder.budgetLabels.${params.budgetLevel}`, { defaultValue: ns }) : ns },
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
          {t('projectBuilder.review.badge')}
        </span>
      </div>

      <h2 className="font-display text-xl md:text-2xl font-bold text-foreground mb-6">
        {t('projectBuilder.review.title')}
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
          {t('projectBuilder.review.generate')}
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-3 text-sm font-body text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> {t('projectBuilder.review.editAnswers')}
        </button>
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-5 py-3 text-sm font-body text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" /> {t('projectBuilder.review.startOver')}
        </button>
      </div>
    </motion.div>
  );
};

export default ProjectBuilderReview;
