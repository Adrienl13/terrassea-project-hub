import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface StepOption {
  value: string;
  label: string;
  description?: string;
}

interface ProjectBuilderStepProps {
  stepId: string;
  stepConfig: { question: string; options: StepOption[] };
  selectedValue: string;
  onSelect: (value: string) => void;
  onBack?: () => void;
  onNext?: () => void;
}

const ProjectBuilderStep = ({
  stepId,
  stepConfig,
  selectedValue,
  onSelect,
  onBack,
  onNext,
}: ProjectBuilderStepProps) => {
  const { t } = useTranslation();

  return (
    <motion.div
      key={stepId}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="font-display text-xl md:text-2xl font-bold text-foreground mb-8">
        {stepConfig.question}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {stepConfig.options.map((option) => {
          const isSelected = selectedValue === option.value;
          return (
            <button
              key={option.value}
              onClick={() => onSelect(option.value)}
              className={`text-left p-4 rounded-sm border transition-all ${
                isSelected
                  ? "border-foreground bg-foreground text-primary-foreground"
                  : "border-border bg-card hover:border-foreground/30 text-foreground"
              }`}
            >
              <span className="font-display font-semibold text-sm block">
                {option.label}
              </span>
              {option.description && (
                <span className={`text-xs font-body mt-1 block ${
                  isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
                }`}>
                  {option.description}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-10">
        {onBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> {t('projectBuilder.capacity.back')}
          </button>
        ) : (
          <div />
        )}
        {onNext && (
          <button
            onClick={onNext}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-display font-semibold rounded-full transition-all ${
              selectedValue
                ? "bg-foreground text-primary-foreground hover:opacity-90"
                : "bg-border text-muted-foreground cursor-not-allowed"
            }`}
            disabled={!selectedValue}
          >
            {t('projectBuilder.capacity.next')} <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default ProjectBuilderStep;
