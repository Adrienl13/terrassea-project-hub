import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { ProjectParameters, ProjectConcept } from "@/engine/types";
import type { DBProduct } from "@/lib/products";
import ConceptCard from "./ConceptCard";
import ProjectResultsEditor from "./ProjectResultsEditor";

interface ProjectResultsProps {
  parameters: ProjectParameters;
  concepts: ProjectConcept[];
  query: string;
  products: DBProduct[];
  onRegenerate?: (params: ProjectParameters) => void;
  isRegenerating?: boolean;
}

// Budget estimate removed — the BOM total in ConceptCard is the single source of truth

const ProjectResults = ({ parameters, concepts, query, products, onRegenerate, isRegenerating }: ProjectResultsProps) => {
  const { t } = useTranslation();
  return (
    <section className="py-16 px-6">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-foreground" />
            <span className="text-xs font-body uppercase tracking-[0.2em] text-muted-foreground">
              {t('results.label', 'Project Analysis')}
            </span>
          </div>

          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
            {t('results.title', '3 concepts for your project')}
          </h2>

          <div className="flex flex-wrap gap-2 mb-6">
            <ParameterPill label={t('results.pillSpace', 'Space')} value={parameters.establishmentType} />
            <ParameterPill label={t('results.pillZone', 'Zone')} value={parameters.projectZone} />
            {parameters.seatingCapacity && (
              <ParameterPill label={t('results.pillCapacity', 'Capacity')} value={`${parameters.seatingCapacity} ${t('results.seats', 'seats')}`} />
            )}
            {parameters.terraceSurfaceM2 && (
              <ParameterPill label={t('results.pillTerrace', 'Terrace')} value={`${parameters.terraceSurfaceM2} m²`} />
            )}
            {parameters.style.map((s) => (
              <ParameterPill key={s} label={t('results.pillStyle', 'Style')} value={s} />
            ))}
            {parameters.budgetLevel && (
              <ParameterPill label={t('results.pillBudget', 'Budget')} value={parameters.budgetLevel} />
            )}
          </div>

          {/* Editable parameters panel */}
          {onRegenerate && (
            <ProjectResultsEditor
              parameters={parameters}
              onRegenerate={onRegenerate}
              isRegenerating={isRegenerating}
            />
          )}
        </motion.div>

        <div className="space-y-8">
          {concepts.map((concept, i) => (
            <ConceptCard
              key={concept.id}
              concept={concept}
              index={i}
              products={products}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

function ParameterPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border">
      <span className="text-[10px] font-body uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-xs font-display font-semibold text-foreground capitalize">{value}</span>
    </div>
  );
}

export default ProjectResults;
