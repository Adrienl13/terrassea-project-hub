import { useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { ProjectParameters, ProjectConcept } from "@/engine/types";
import type { DBProduct } from "@/lib/products";
import ConceptCard from "./ConceptCard";

interface ProjectResultsProps {
  parameters: ProjectParameters;
  concepts: ProjectConcept[];
  query: string;
  products: DBProduct[];
}

function estimateBudget(
  totalSeats: number,
  budgetLevel: string
): { min: number; max: number; avgPerSeat: number } | null {
  const ranges: Record<string, [number, number]> = {
    economy: [50, 80],
    mid: [80, 120],
    premium: [120, 180],
    luxury: [180, 300],
  };
  const range = ranges[budgetLevel];
  if (!range) return null;
  return {
    min: totalSeats * range[0],
    max: totalSeats * range[1],
    avgPerSeat: Math.round((range[0] + range[1]) / 2),
  };
}

const ProjectResults = ({ parameters, concepts, query, products }: ProjectResultsProps) => {
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
              Project Analysis
            </span>
          </div>

          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
            3 concepts for your project
          </h2>

          <div className="flex flex-wrap gap-2">
            <ParameterPill label="Space" value={parameters.establishmentType} />
            <ParameterPill label="Zone" value={parameters.projectZone} />
            {parameters.seatingCapacity && (
              <ParameterPill label="Capacity" value={`${parameters.seatingCapacity} seats`} />
            )}
            {parameters.terraceSurfaceM2 && (
              <ParameterPill label="Terrace" value={`${parameters.terraceSurfaceM2} m²`} />
            )}
            {parameters.style.map((s) => (
              <ParameterPill key={s} label="Style" value={s} />
            ))}
            {parameters.seatingLayout && (
              <ParameterPill label="Layout" value={parameters.seatingLayout.replace(/-/g, " ")} />
            )}
            {parameters.layoutPriority && (
              <ParameterPill label="Priority" value={parameters.layoutPriority.replace(/-/g, " ")} />
            )}
          </div>
        </motion.div>

        <div className="space-y-8">
          {concepts.map((concept, i) => {
            const budget = concept.layout
              ? estimateBudget(concept.layout.totalSeats, parameters.budgetLevel)
              : null;
            return (
              <ConceptCard
                key={concept.id}
                concept={concept}
                index={i}
                products={products}
                budgetEstimate={budget}
              />
            );
          })}
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
