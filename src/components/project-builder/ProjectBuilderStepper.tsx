import { Check } from "lucide-react";
import { ProjectParameters } from "@/engine/types";

interface Step {
  id: string;
  label: string;
  description: string;
}

interface ProjectBuilderStepperProps {
  steps: Step[];
  currentStep: number;
  params: ProjectParameters;
  onStepClick: (index: number) => void;
}

function isStepComplete(stepId: string, params: ProjectParameters): boolean {
  switch (stepId) {
    case "type": return !!params.establishmentType;
    case "capacity": return params.seatingCapacity !== null;
    case "layout": return !!params.seatingLayout;
    case "priority": return !!params.layoutPriority;
    case "style": return params.style.length > 0;
    case "budget": return !!params.budgetLevel;
    case "review": return false;
    default: return false;
  }
}

const ProjectBuilderStepper = ({ steps, currentStep, params, onStepClick }: ProjectBuilderStepperProps) => {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {steps.map((step, i) => {
        const completed = isStepComplete(step.id, params);
        const isCurrent = i === currentStep;

        return (
          <button
            key={step.id}
            onClick={() => onStepClick(i)}
            className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-body whitespace-nowrap transition-all ${
              isCurrent
                ? "bg-foreground text-primary-foreground"
                : completed
                ? "bg-card text-foreground border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {completed && !isCurrent ? (
              <Check className="h-3 w-3" />
            ) : (
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-display font-bold ${
                isCurrent
                  ? "bg-primary-foreground text-foreground"
                  : "bg-border text-muted-foreground"
              }`}>
                {i + 1}
              </span>
            )}
            <span className="hidden sm:inline">{step.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ProjectBuilderStepper;
