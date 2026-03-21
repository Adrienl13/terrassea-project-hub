import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProjectParameters } from "@/engine/types";
import { getDensityInfo, getMaxSeats } from "@/engine/spatialEngine";

interface Props {
  params: ProjectParameters;
  onChange: (updates: Partial<ProjectParameters>) => void;
  onBack?: () => void;
  onNext?: () => void;
}

const CapacityStep = ({ params, onChange, onBack, onNext }: Props) => {
  const { t } = useTranslation();
  const surface = params.terraceSurfaceM2 ??
    (params.terraceLength && params.terraceWidth ? params.terraceLength * params.terraceWidth : null);
  const density = getDensityInfo(params.seatingCapacity, surface);

  const PRESETS = [
    { value: 20, label: t('projectBuilder.capacity.under30'), description: t('projectBuilder.capacity.intimate') },
    { value: 45, label: t('projectBuilder.capacity.30to60'), description: t('projectBuilder.capacity.mediumTerrace') },
    { value: 90, label: t('projectBuilder.capacity.60to120'), description: t('projectBuilder.capacity.largeTerrace') },
    { value: 150, label: t('projectBuilder.capacity.120plus'), description: t('projectBuilder.capacity.highVolume') },
  ];

  return (
    <motion.div
      key="capacity"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="font-display text-xl md:text-2xl font-bold text-foreground mb-8">
        {t('projectBuilder.capacity.question')}
      </h2>

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

      <div className="border-t border-border pt-6 mb-6">
        <Label htmlFor="exact-capacity" className="text-xs font-body uppercase tracking-[0.15em] text-muted-foreground mb-2 block">
          {t('projectBuilder.capacity.exactLabel')}
        </Label>
        <Input
          id="exact-capacity"
          type="number"
          min={1}
          max={500}
          placeholder={t('projectBuilder.capacity.exactPlaceholder')}
          value={params.seatingCapacity ?? ""}
          onChange={(e) => {
            const raw = parseInt(e.target.value);
            onChange({ seatingCapacity: e.target.value && !isNaN(raw) ? raw : null });
          }}
          className="max-w-48"
        />
      </div>

      <div className="border-t border-border pt-6">
        <Label className="text-xs font-body uppercase tracking-[0.15em] text-muted-foreground mb-2 block">
          {t('projectBuilder.capacity.dimensionsLabel')}
        </Label>
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <span className="text-[10px] font-body text-muted-foreground block mb-1">{t('projectBuilder.expertInputs.length')}</span>
            <Input
              type="number" min={1} placeholder="12"
              value={params.terraceLength ?? ""}
              onChange={(e) => {
                const raw = parseFloat(e.target.value);
                const len = e.target.value && !isNaN(raw) ? raw : null;
                const w = params.terraceWidth;
                onChange({ terraceLength: len, terraceSurfaceM2: len && w ? Math.round(len * w) : params.terraceSurfaceM2 });
              }}
              className="max-w-24"
            />
          </div>
          <span className="text-muted-foreground font-body text-sm pb-2">×</span>
          <div>
            <span className="text-[10px] font-body text-muted-foreground block mb-1">{t('projectBuilder.expertInputs.width')}</span>
            <Input
              type="number" min={1} placeholder="8"
              value={params.terraceWidth ?? ""}
              onChange={(e) => {
                const raw = parseFloat(e.target.value);
                const w = e.target.value && !isNaN(raw) ? raw : null;
                const len = params.terraceLength;
                onChange({ terraceWidth: w, terraceSurfaceM2: len && w ? Math.round(len * w) : params.terraceSurfaceM2 });
              }}
              className="max-w-24"
            />
          </div>
          <span className="text-muted-foreground font-body text-sm pb-2">{t('projectBuilder.capacity.or')}</span>
          <div>
            <span className="text-[10px] font-body text-muted-foreground block mb-1">{t('projectBuilder.expertInputs.area')}</span>
            <Input
              type="number" min={1} placeholder="96"
              value={params.terraceSurfaceM2 ?? ""}
              onChange={(e) => {
                const raw = parseFloat(e.target.value);
                onChange({
                  terraceSurfaceM2: e.target.value && !isNaN(raw) ? raw : null,
                  terraceLength: null, terraceWidth: null,
                });
              }}
              className="max-w-24"
            />
          </div>
        </div>

        {density && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${density.dotClass}`} />
              <span className={`text-xs font-body font-medium ${density.textClass}`}>
                {density.label}
              </span>
              <span className="text-[10px] font-body text-muted-foreground">
                — {density.spacePerSeat} m²/{t('projectBuilder.review.seats').charAt(0)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                density.feasibility === "good" ? "bg-green-500" :
                density.feasibility === "compact" ? "bg-amber-500" : "bg-red-500"
              }`} />
              <span className={`text-xs font-body font-medium ${
                density.feasibility === "good" ? "text-green-600" :
                density.feasibility === "compact" ? "text-amber-600" : "text-red-600"
              }`}>
                {density.feasibilityLabel}
              </span>
            </div>
            {surface && (
              <p className="text-[10px] font-body text-muted-foreground">
                {t('projectBuilder.capacity.recommendedCapacity', { min: getMaxSeats(surface, "dense"), max: getMaxSeats(surface, "comfortable") })}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-10">
        {onBack ? (
          <button onClick={onBack} className="flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> {t('projectBuilder.capacity.back')}
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
            {t('projectBuilder.capacity.next')} <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default CapacityStep;
