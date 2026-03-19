import { useTranslation } from "react-i18next";
import { SpatialMetricsData } from "@/engine/types";

interface Props {
  metrics: SpatialMetricsData;
  compact?: boolean;
}

const SpatialMetricsDisplay = ({ metrics, compact = false }: Props) => {
  const { t } = useTranslation();

  const feasibilityStyles: Record<string, { dot: string; text: string }> = {
    good:        { dot: "bg-green-500", text: "text-green-600" },
    compact:     { dot: "bg-amber-500", text: "text-amber-600" },
    overcrowded: { dot: "bg-red-500",   text: "text-red-600" },
  };

  const densityStyles: Record<string, { dot: string; text: string }> = {
    comfortable: { dot: "bg-green-500", text: "text-green-600" },
    balanced:    { dot: "bg-amber-500", text: "text-amber-600" },
    dense:       { dot: "bg-red-500",   text: "text-red-600" },
  };

  const fStyle = feasibilityStyles[metrics.feasibility] || feasibilityStyles.good;
  const dStyle = densityStyles[metrics.densityLevel] || densityStyles.balanced;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${dStyle.dot}`} />
          <span className={`text-[10px] font-body ${dStyle.text}`}>
            {metrics.spacePerSeat} m²/{t('projectBuilder.review.seats').charAt(0)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${fStyle.dot}`} />
          <span className={`text-[10px] font-body ${fStyle.text}`}>
            {metrics.feasibilityLabel}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-2">
      <span className="text-[10px] font-body uppercase tracking-[0.15em] text-muted-foreground">
        {t('projectBuilder.spatialMetrics.title')}
      </span>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-body text-muted-foreground">{t('projectBuilder.spatialMetrics.terraceArea')}</span>
          <span className="text-xs font-display font-medium text-foreground ml-auto">{metrics.terraceArea} m²</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-body text-muted-foreground">{t('projectBuilder.spatialMetrics.totalSeats')}</span>
          <span className="text-xs font-display font-medium text-foreground ml-auto">{metrics.totalSeats}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-body text-muted-foreground">{t('projectBuilder.spatialMetrics.spacePerSeat')}</span>
          <span className="text-xs font-display font-medium text-foreground ml-auto">{metrics.spacePerSeat} m²</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-body text-muted-foreground">{t('projectBuilder.spatialMetrics.circulation')}</span>
          <div className="ml-auto flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${dStyle.dot}`} />
            <span className={`text-xs font-body font-medium ${dStyle.text}`}>{metrics.densityLabel}</span>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-body text-muted-foreground">{t('projectBuilder.spatialMetrics.occupiedSurface')}</span>
          <span className="text-xs font-display font-medium text-foreground ml-auto">{metrics.estimatedOccupiedSurface} m²</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-body text-muted-foreground">{t('projectBuilder.spatialMetrics.remainingSpace')}</span>
          <span className="text-xs font-display font-medium text-foreground ml-auto">{metrics.remainingCirculationSpace} m²</span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <div className={`w-2 h-2 rounded-full ${fStyle.dot}`} />
        <span className={`text-xs font-body font-semibold ${fStyle.text}`}>
          {metrics.feasibilityLabel}
        </span>
        <span className="text-[10px] font-body text-muted-foreground">
          — {metrics.feasibilityDescription}
        </span>
      </div>
    </div>
  );
};

export default SpatialMetricsDisplay;
