import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Sparkles, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProjectBuilderStepper from "@/components/project-builder/ProjectBuilderStepper";
import ProjectBuilderSummary from "@/components/project-builder/ProjectBuilderSummary";
import ProjectBuilderStep from "@/components/project-builder/ProjectBuilderStep";
import ProjectBuilderReview from "@/components/project-builder/ProjectBuilderReview";
import ProjectResults from "@/components/ProjectResults";
import { ProjectParameters, ProjectConcept } from "@/engine/types";
import { useProducts } from "@/hooks/useProducts";
import { generateProjectConcepts } from "@/engine/projectEngine";

const STEPS = [
  { id: "type", label: "Project type", description: "What type of establishment?" },
  { id: "capacity", label: "Capacity", description: "How many guests?" },
  { id: "layout", label: "Seating layout", description: "How to organize tables?" },
  { id: "priority", label: "Layout priority", description: "What matters most?" },
  { id: "style", label: "Style & materials", description: "Define the aesthetic" },
  { id: "budget", label: "Budget & timeline", description: "Practical details" },
  { id: "review", label: "Review", description: "Confirm your brief" },
];

const STEP_OPTIONS: Record<string, { question: string; options: { value: string; label: string; description?: string }[] }> = {
  type: {
    question: "What type of establishment is this project for?",
    options: [
      { value: "restaurant", label: "Restaurant", description: "Terraces, patios & outdoor dining" },
      { value: "hotel", label: "Hotel", description: "Lobbies, pool decks & garden lounges" },
      { value: "rooftop", label: "Rooftop", description: "Sky bars & urban terraces" },
      { value: "beach-club", label: "Beach Club", description: "Beachfront lounges & daybeds" },
      { value: "bar", label: "Bar / Lounge", description: "Cocktail bars & wine bars" },
      { value: "camping", label: "Camping", description: "Glamping & outdoor communal areas" },
      { value: "event", label: "Event Space", description: "Banquets, weddings & receptions" },
      { value: "pool", label: "Pool Area", description: "Poolside & deck furniture" },
    ],
  },
  capacity: {
    question: "What is your target seating capacity?",
    options: [
      { value: "20", label: "Under 30 seats", description: "Intimate space" },
      { value: "45", label: "30–60 seats", description: "Medium terrace" },
      { value: "90", label: "60–120 seats", description: "Large terrace" },
      { value: "150", label: "120+ seats", description: "High-volume venue" },
    ],
  },
  layout: {
    question: "How do you want to organize your seating layout?",
    options: [
      { value: "mostly-2", label: "Mostly 2-seater tables", description: "Ideal for cafés & couple dining" },
      { value: "balanced-2-4", label: "Balanced mix of 2 and 4-seater", description: "Most common restaurant setup" },
      { value: "mostly-4", label: "Mostly 4-seater tables", description: "Family & group oriented" },
      { value: "modular", label: "Flexible modular layout", description: "Combinable tables for any group size" },
      { value: "group", label: "Group dining friendly", description: "Large tables for sharing" },
      { value: "custom", label: "Custom mix", description: "Specific requirements" },
    ],
  },
  priority: {
    question: "What matters most for your layout?",
    options: [
      { value: "max-capacity", label: "Maximize seating capacity", description: "Fit as many guests as possible" },
      { value: "balanced", label: "Balanced comfort and capacity", description: "Best of both worlds" },
      { value: "spacious", label: "Spacious premium layout", description: "Generous spacing between tables" },
      { value: "flexible-groups", label: "Flexible tables for groups", description: "Adapt to varying group sizes" },
      { value: "couples", label: "Mostly couple seating", description: "Intimate two-person tables" },
      { value: "groups", label: "Mostly group seating", description: "Large communal tables" },
    ],
  },
  style: {
    question: "What style defines your project?",
    options: [
      { value: "mediterranean", label: "Mediterranean", description: "Riviera, earthy tones, natural textures" },
      { value: "modern", label: "Modern", description: "Clean lines, contemporary design" },
      { value: "bistro", label: "Bistro / Parisian", description: "Classic French terrace charm" },
      { value: "natural", label: "Natural / Wood", description: "Organic materials, earthy palette" },
      { value: "industrial", label: "Industrial", description: "Metal, raw finishes, urban" },
      { value: "luxury", label: "Luxury / Premium", description: "High-end materials, exclusive feel" },
      { value: "coastal", label: "Coastal", description: "Nautical, maritime elegance" },
      { value: "tropical", label: "Tropical", description: "Exotic, resort-style" },
    ],
  },
  budget: {
    question: "What is your budget range per seat?",
    options: [
      { value: "economy", label: "€50–80 per seat", description: "Economic, functional" },
      { value: "mid", label: "€80–120 per seat", description: "Mid-range, good quality" },
      { value: "premium", label: "€120–180 per seat", description: "Premium materials & design" },
      { value: "luxury", label: "€180+ per seat", description: "Luxury, bespoke" },
    ],
  },
};

const ProjectBuilder = () => {
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const [currentStep, setCurrentStep] = useState(0);
  const [params, setParams] = useState<ProjectParameters>({
    establishmentType: "",
    projectZone: "outdoor",
    seatingCapacity: null,
    seatingLayout: "",
    layoutPriority: "",
    style: [],
    ambience: [],
    colorPalette: [],
    materialPreferences: [],
    technicalConstraints: [],
    isOutdoor: true,
    budgetLevel: "",
    timeline: "",
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<{
    parameters: ProjectParameters;
    concepts: ProjectConcept[];
    query: string;
  } | null>(null);

  const handleSelectOption = useCallback((stepId: string, value: string) => {
    setParams((prev) => {
      const updated = { ...prev };
      switch (stepId) {
        case "type":
          updated.establishmentType = value;
          break;
        case "capacity":
          updated.seatingCapacity = parseInt(value);
          break;
        case "layout":
          updated.seatingLayout = value;
          break;
        case "priority":
          updated.layoutPriority = value;
          break;
        case "style":
          updated.style = [value];
          break;
        case "budget":
          updated.budgetLevel = value;
          break;
      }
      return updated;
    });

    // Auto-advance after selection (except review)
    if (currentStep < STEPS.length - 1) {
      setTimeout(() => setCurrentStep((s) => s + 1), 300);
    }
  }, [currentStep]);

  const getSelectedValue = (stepId: string): string => {
    switch (stepId) {
      case "type": return params.establishmentType;
      case "capacity": return params.seatingCapacity?.toString() || "";
      case "layout": return params.seatingLayout;
      case "priority": return params.layoutPriority;
      case "style": return params.style[0] || "";
      case "budget": return params.budgetLevel;
      default: return "";
    }
  };

  const handleGenerate = () => {
    if (products.length === 0) return;
    setIsGenerating(true);

    const query = `${params.establishmentType} ${params.style.join(" ")} ${params.seatingCapacity || 60} seats`;

    setTimeout(() => {
      const { parameters, concepts } = generateProjectConcepts(query, products, params);
      setResults({ parameters, concepts, query });
      setIsGenerating(false);
    }, 1200);
  };

  const handleReset = () => {
    setCurrentStep(0);
    setParams({
      establishmentType: "",
      projectZone: "outdoor",
      seatingCapacity: null,
      seatingLayout: "",
      layoutPriority: "",
      style: [],
      ambience: [],
      colorPalette: [],
      materialPreferences: [],
      technicalConstraints: [],
      isOutdoor: true,
      budgetLevel: "",
      timeline: "",
    });
    setResults(null);
  };

  const stepId = STEPS[currentStep].id;
  const isReviewStep = stepId === "review";

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
                <RotateCcw className="h-4 w-4" /> New project
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
        {/* Hero intro */}
        <section className="px-6 mb-12">
          <div className="container mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-foreground" />
                <span className="text-xs font-body uppercase tracking-[0.2em] text-muted-foreground">
                  Project Builder
                </span>
              </div>
              <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground tracking-tight">
                Build your hospitality project
              </h1>
              <p className="text-muted-foreground font-body text-sm md:text-base mt-4 max-w-lg mx-auto">
                Define your needs · Get layout suggestions · Discover matching products · Request supplier quotes
              </p>
            </motion.div>
          </div>
        </section>

        {/* Stepper */}
        <section className="px-6 mb-12">
          <div className="container mx-auto max-w-4xl">
            <ProjectBuilderStepper
              steps={STEPS}
              currentStep={currentStep}
              params={params}
              onStepClick={(i) => setCurrentStep(i)}
            />
          </div>
        </section>

        {/* Main content: step + summary */}
        <section className="px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left: step content */}
              <div className="lg:col-span-2">
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
                        Generating your project concepts...
                      </p>
                    </motion.div>
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
                      stepConfig={STEP_OPTIONS[stepId]}
                      selectedValue={getSelectedValue(stepId)}
                      onSelect={(val) => handleSelectOption(stepId, val)}
                      onBack={currentStep > 0 ? () => setCurrentStep(currentStep - 1) : undefined}
                      onNext={
                        currentStep < STEPS.length - 1
                          ? () => setCurrentStep(currentStep + 1)
                          : undefined
                      }
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Right: sticky summary */}
              <div className="hidden lg:block">
                <ProjectBuilderSummary params={params} currentStep={currentStep} />
              </div>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default ProjectBuilder;
