import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Sparkles } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProjectBuilderStepper from "@/components/project-builder/ProjectBuilderStepper";
import ProjectBuilderSummary from "@/components/project-builder/ProjectBuilderSummary";
import ProjectBuilderStep from "@/components/project-builder/ProjectBuilderStep";
import ProjectBuilderReview from "@/components/project-builder/ProjectBuilderReview";
import ProjectBuilderModeSelect from "@/components/project-builder/ProjectBuilderModeSelect";
import ProjectBuilderExpertInputs from "@/components/project-builder/ProjectBuilderExpertInputs";
import CapacityStep from "@/components/project-builder/CapacityStep";
import StyleStep from "@/components/project-builder/StyleStep";
import ProjectResults from "@/components/ProjectResults";
import { ProjectParameters, ProjectConcept } from "@/engine/types";
import { useProducts } from "@/hooks/useProducts";
import { generateProjectConcepts } from "@/engine/projectEngine";

const DEFAULT_PARAMS: ProjectParameters = {
  builderMode: "",
  establishmentType: "",
  projectZone: "outdoor",
  seatingCapacity: null,
  seatingLayout: "balanced-2-4",
  layoutPriority: "balanced",
  style: [],
  ambience: [],
  colorPalette: [],
  materialPreferences: [],
  technicalConstraints: [],
  isOutdoor: true,
  budgetLevel: "",
  timeline: "",
  terraceSurfaceM2: null,
  terraceLength: null,
  terraceWidth: null,
  tableMix: [],
};

const STYLE_INFERENCE: Record<string, { ambience: string[]; colorPalette: string[] }> = {
  mediterranean: { ambience: ["warm", "convivial", "relaxed"], colorPalette: ["warm", "natural", "cool"] },
  bistro:        { ambience: ["convivial", "warm", "authentic"], colorPalette: ["black", "warm"] },
  natural:       { ambience: ["relaxed", "authentic", "warm"], colorPalette: ["natural", "wood", "green"] },
  modern:        { ambience: ["refined", "design-forward"], colorPalette: ["black", "white", "cool"] },
  luxury:        { ambience: ["elegant", "refined", "evening"], colorPalette: ["warm", "black"] },
  industrial:    { ambience: ["festive", "convivial", "design-forward"], colorPalette: ["black", "cool"] },
  coastal:       { ambience: ["relaxed", "bright", "elegant"], colorPalette: ["cool", "white", "natural"] },
  tropical:      { ambience: ["relaxed", "festive", "warm"], colorPalette: ["green", "warm", "cool"] },
};

function inferFromStyles(styles: string[]) {
  const ambience = new Set<string>();
  const palette = new Set<string>();
  for (const s of styles) {
    STYLE_INFERENCE[s]?.ambience.forEach((a) => ambience.add(a));
    STYLE_INFERENCE[s]?.colorPalette.forEach((p) => palette.add(p));
  }
  return {
    ambience: Array.from(ambience),
    colorPalette: Array.from(palette),
  };
}

const ProjectBuilder = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { data: products = [], isLoading: productsLoading } = useProducts();

  const urlStyle = searchParams.get("style");
  const urlFrom  = searchParams.get("from");

  const guidedSteps = useMemo(() => [
    { id: "mode",     label: t('projectBuilder.steps.start'),    description: t('projectBuilder.stepDescriptions.howToBegin') },
    { id: "type",     label: t('projectBuilder.steps.type'),     description: t('projectBuilder.stepDescriptions.establishmentType') },
    { id: "budget",   label: t('projectBuilder.steps.budget'),   description: t('projectBuilder.stepDescriptions.budgetPerSeat') },
    { id: "capacity", label: t('projectBuilder.steps.capacity'), description: t('projectBuilder.stepDescriptions.guestsSpace') },
    { id: "style",    label: t('projectBuilder.steps.style'),    description: t('projectBuilder.stepDescriptions.aestheticDirection') },
    { id: "review",   label: t('projectBuilder.steps.review'),   description: t('projectBuilder.stepDescriptions.confirmBrief') },
  ], [t]);

  const expertSteps = useMemo(() => [
    { id: "mode",   label: t('projectBuilder.steps.start'),        description: t('projectBuilder.stepDescriptions.howToBegin') },
    { id: "expert", label: t('projectBuilder.steps.requirements'), description: t('projectBuilder.stepDescriptions.defineParameters') },
    { id: "review", label: t('projectBuilder.steps.review'),       description: t('projectBuilder.stepDescriptions.confirmBrief') },
  ], [t]);

  const stepOptions = useMemo(() => ({
    type: {
      question: t('projectBuilder.type.question'),
      options: [
        { value: "restaurant", label: t('projectBuilder.type.restaurant'), description: t('projectBuilder.type.restaurantDesc') },
        { value: "hotel",      label: t('projectBuilder.type.hotel'),      description: t('projectBuilder.type.hotelDesc') },
        { value: "rooftop",    label: t('projectBuilder.type.rooftop'),    description: t('projectBuilder.type.rooftopDesc') },
        { value: "beach-club", label: t('projectBuilder.type.beachClub'),  description: t('projectBuilder.type.beachClubDesc') },
        { value: "bar",        label: t('projectBuilder.type.bar'),        description: t('projectBuilder.type.barDesc') },
        { value: "camping",    label: t('projectBuilder.type.camping'),    description: t('projectBuilder.type.campingDesc') },
        { value: "event",      label: t('projectBuilder.type.event'),      description: t('projectBuilder.type.eventDesc') },
        { value: "pool",       label: t('projectBuilder.type.pool'),       description: t('projectBuilder.type.poolDesc') },
      ],
    },
    budget: {
      question: t('projectBuilder.budget.question'),
      options: [
        { value: "economy", label: t('projectBuilder.budget.economy'), description: t('projectBuilder.budget.economyDesc') },
        { value: "mid",     label: t('projectBuilder.budget.mid'),     description: t('projectBuilder.budget.midDesc') },
        { value: "premium", label: t('projectBuilder.budget.premium'), description: t('projectBuilder.budget.premiumDesc') },
        { value: "luxury",  label: t('projectBuilder.budget.luxury'),  description: t('projectBuilder.budget.luxuryDesc') },
      ],
    },
  }), [t]);

  const [currentStep, setCurrentStep] = useState(0);
  const [params, setParams] = useState<ProjectParameters>(() => {
    const initial = { ...DEFAULT_PARAMS };
    if (urlStyle) {
      initial.style = [urlStyle];
      initial.builderMode = "guided";
      const inferred = inferFromStyles([urlStyle]);
      initial.ambience = inferred.ambience;
      initial.colorPalette = inferred.colorPalette;
    }
    return initial;
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<{
    parameters: ProjectParameters;
    concepts: ProjectConcept[];
    query: string;
  } | null>(null);

  useEffect(() => {
    if (urlStyle && urlFrom === "inspirations") {
      setCurrentStep(3);
    }
  }, [urlStyle, urlFrom]);

  const isExpert     = params.builderMode === "expert";
  const steps        = isExpert ? expertSteps : guidedSteps;
  const stepId       = steps[currentStep]?.id;
  const isModeStep   = stepId === "mode";
  const isReviewStep = stepId === "review";
  const isExpertStep = stepId === "expert";
  const isCapacityStep = stepId === "capacity";
  const isStyleStep  = stepId === "style";

  const handleModeSelect = (mode: "guided" | "expert") => {
    setParams((p) => ({ ...p, builderMode: mode }));
    setTimeout(() => setCurrentStep(1), 200);
  };

  const handleSelectOption = useCallback((id: string, value: string) => {
    setParams((prev) => {
      const u = { ...prev };
      switch (id) {
        case "type":   u.establishmentType = value; break;
        case "budget": u.budgetLevel = value; break;
      }
      return u;
    });
    if (currentStep < steps.length - 1) {
      setTimeout(() => setCurrentStep((s) => s + 1), 300);
    }
  }, [currentStep, steps.length]);

  const handleStyleToggle = useCallback((style: string) => {
    setParams((prev) => {
      const existing = prev.style;
      const next = existing.includes(style)
        ? existing.filter((s) => s !== style)
        : [...existing, style];
      const inferred = inferFromStyles(next);
      return { ...prev, style: next, ambience: inferred.ambience, colorPalette: inferred.colorPalette };
    });
  }, []);

  const handleParamsChange = useCallback((updates: Partial<ProjectParameters>) => {
    setParams((prev) => ({ ...prev, ...updates }));
  }, []);

  const getSelectedValue = (id: string): string => {
    switch (id) {
      case "type":   return params.establishmentType;
      case "budget": return params.budgetLevel;
      default:       return "";
    }
  };

  const handleGenerate = () => {
    if (products.length === 0) return;
    setIsGenerating(true);
    const query = [
      params.establishmentType,
      ...params.style,
      params.seatingCapacity ? `${params.seatingCapacity} seats` : "",
      params.budgetLevel,
    ].filter(Boolean).join(" ");

    setTimeout(() => {
      const { parameters, concepts } = generateProjectConcepts(query, products, params);
      setResults({ parameters, concepts, query });
      setIsGenerating(false);
    }, 1200);
  };

  const handleReset = () => {
    setCurrentStep(0);
    setParams({ ...DEFAULT_PARAMS });
    setResults(null);
  };

  if (results) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-8 px-6">
          <div className="container mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="h-4 w-4" /> {t('projectBuilder.newProject')}
              </button>
            </div>
          </div>
        </div>
        <ProjectResults
          parameters={results.parameters}
          concepts={results.concepts}
          query={results.query}
          products={products}
        />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="pt-24 pb-16">
        {/* Hero */}
        <section className="px-6 mb-12">
          <div className="container mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {urlFrom === "inspirations" && urlStyle && (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-4">
                  <Sparkles className="h-3 w-3 text-accent-foreground" />
                  <span className="text-xs font-body text-accent-foreground capitalize">
                    {t('projectBuilder.stylePreSelected', { style: urlStyle })}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-foreground" />
                <span className="text-xs font-body uppercase tracking-[0.2em] text-muted-foreground">
                  {t('projectBuilder.badge')}
                </span>
              </div>
              <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground tracking-tight">
                {t('projectBuilder.title')}
              </h1>
              <p className="text-muted-foreground font-body text-sm md:text-base mt-4 max-w-lg mx-auto">
                {urlFrom === "inspirations"
                  ? t('projectBuilder.subtitleFromInspirations')
                  : t('projectBuilder.subtitle')}
              </p>
            </motion.div>
          </div>
        </section>

        {/* Stepper */}
        {!isModeStep && (
          <section className="px-6 mb-12">
            <div className="container mx-auto max-w-4xl">
              <ProjectBuilderStepper
                steps={steps}
                currentStep={currentStep}
                params={params}
                onStepClick={(i) => setCurrentStep(i)}
              />
            </div>
          </section>
        )}

        {/* Main content */}
        <section className="px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className={isModeStep ? "lg:col-span-3" : "lg:col-span-2"}>
                <AnimatePresence mode="wait">
                  {isGenerating ? (
                    <motion.div
                      key="generating"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-24"
                    >
                      <div className="w-10 h-10 border-2 border-foreground border-t-transparent rounded-full animate-spin mb-4" />
                      <p className="text-sm font-body text-muted-foreground">
                        {t('projectBuilder.generating')}
                      </p>
                    </motion.div>
                  ) : isModeStep ? (
                    <ProjectBuilderModeSelect key="mode" onSelect={handleModeSelect} />
                  ) : isExpertStep ? (
                    <ProjectBuilderExpertInputs
                      key="expert"
                      params={params}
                      onChange={handleParamsChange}
                      onBack={() => setCurrentStep(0)}
                      onNext={() => setCurrentStep(2)}
                    />
                  ) : isStyleStep ? (
                    <StyleStep
                      key="style"
                      selectedStyles={params.style}
                      onToggle={handleStyleToggle}
                      onBack={() => setCurrentStep(currentStep - 1)}
                      onNext={() => setCurrentStep(currentStep + 1)}
                    />
                  ) : isCapacityStep ? (
                    <CapacityStep
                      key="capacity"
                      params={params}
                      onChange={handleParamsChange}
                      onBack={currentStep > 0 ? () => setCurrentStep(currentStep - 1) : undefined}
                      onNext={currentStep < steps.length - 1 ? () => setCurrentStep(currentStep + 1) : undefined}
                    />
                  ) : isReviewStep ? (
                    <ProjectBuilderReview
                      key="review"
                      params={params}
                      onGenerate={handleGenerate}
                      onBack={() => setCurrentStep(currentStep - 1)}
                      onReset={handleReset}
                      isLoading={productsLoading}
                    />
                  ) : (
                    <ProjectBuilderStep
                      key={stepId}
                      stepId={stepId}
                      stepConfig={stepOptions[stepId as keyof typeof stepOptions]}
                      selectedValue={getSelectedValue(stepId)}
                      onSelect={(val) => handleSelectOption(stepId, val)}
                      onBack={currentStep > 0 ? () => setCurrentStep(currentStep - 1) : undefined}
                      onNext={currentStep < steps.length - 1 ? () => setCurrentStep(currentStep + 1) : undefined}
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Sidebar */}
              {!isModeStep && (
                <div className="hidden lg:block">
                  <ProjectBuilderSummary params={params} currentStep={currentStep} />
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default ProjectBuilder;
