import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Sparkles, RotateCcw } from "lucide-react";
import CategorySelectionStep from "@/components/project-builder/CategorySelectionStep";
import StyleStep, { STYLE_OPTIONS } from "@/components/project-builder/StyleStep";
import { ProjectParameters, DiscoveryQuestion, ProjectSummary } from "@/engine/types";
import {
  parseProjectRequest,
  detectMissingFields,
  applyAnswer,
  isRequestComplete,
  generateProjectSummary,
} from "@/engine/projectEngine";

type DiscoveryPhase = "questions" | "style" | "categories" | "summary" | "done";

// Infer ambience + palette from selected styles (same logic as ProjectBuilder)
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
    STYLE_INFERENCE[s]?.ambience.forEach(a => ambience.add(a));
    STYLE_INFERENCE[s]?.colorPalette.forEach(p => palette.add(p));
  }
  return { ambience: Array.from(ambience), colorPalette: Array.from(palette) };
}

interface ProjectDiscoveryProps {
  query: string;
  onComplete: (params: ProjectParameters) => void;
  onReset: () => void;
}

const ProjectDiscovery = ({ query, onComplete, onReset }: ProjectDiscoveryProps) => {
  const { t } = useTranslation();
  const [params, setParams] = useState<ProjectParameters>(() => parseProjectRequest(query));
  const [questions, setQuestions] = useState<DiscoveryQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<DiscoveryPhase>("questions");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parsed = parseProjectRequest(query);
    setParams(parsed);

    // Filter out style (dedicated StyleStep) and palette (inferred from style)
    const missing = detectMissingFields(parsed).filter(q => q.id !== "style" && q.id !== "palette");

    if (missing.length === 0) {
      // Skip Q&A, go directly to style selection (or categories if style already set)
      setPhase(parsed.style.length > 0 ? "categories" : "style");
    } else {
      setQuestions(missing);
      setPhase("questions");
    }
  }, [query]);

  const handleAnswer = (questionId: string, answer: string) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);

    const updatedParams = applyAnswer(params, questionId, answer);
    setParams(updatedParams);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // After Q&A, go to style if not set, otherwise categories
      setPhase(updatedParams.style.length > 0 ? "categories" : "style");
    }
  };

  const handleStyleToggle = useCallback((style: string) => {
    setParams(prev => {
      const next = prev.style.includes(style)
        ? prev.style.filter(s => s !== style)
        : [...prev.style, style];
      const inferred = inferFromStyles(next);
      return { ...prev, style: next, ambience: inferred.ambience, colorPalette: inferred.colorPalette };
    });
  }, []);

  const handleConfirmSummary = () => {
    setPhase("done");
    onComplete(params);
  };

  const summary = generateProjectSummary(params);

  return (
    <div ref={containerRef} className="w-full max-w-2xl mx-auto">
      <AnimatePresence mode="wait">
        {phase === "questions" && questions.length > 0 && (
          <motion.div
            key="questions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* Progress */}
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="h-4 w-4 text-foreground" />
              <span className="text-xs font-body uppercase tracking-[0.2em] text-muted-foreground">
                {t('discovery.title')} — {currentQuestionIndex + 1} / {questions.length}
              </span>
            </div>

            <div className="w-full bg-card rounded-full h-1">
              <motion.div
                className="bg-foreground h-1 rounded-full"
                initial={{ width: 0 }}
                animate={{
                  width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
                }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Current question */}
            <AnimatePresence mode="wait">
              <motion.div
                key={questions[currentQuestionIndex].id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="font-display text-xl md:text-2xl font-bold text-foreground mb-6">
                  {t(questions[currentQuestionIndex].question)}
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  {questions[currentQuestionIndex].options.map((option) => {
                    const isSelected = answers[questions[currentQuestionIndex].id] === option;
                    const displayLabel = option.startsWith("discovery.") ? t(option) : option;
                    return (
                      <button
                        key={option}
                        onClick={() => handleAnswer(questions[currentQuestionIndex].id, option)}
                        className={`text-left px-4 py-3 rounded-sm border transition-all text-sm font-body ${
                          isSelected
                            ? "border-foreground bg-foreground text-primary-foreground"
                            : "border-border bg-card hover:border-foreground/30 text-foreground"
                        }`}
                      >
                        {displayLabel}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Skip link */}
            <button
              onClick={() => setPhase("style")}
              className="text-xs font-body text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('discovery.skip')}
            </button>
          </motion.div>
        )}

        {phase === "style" && (
          <motion.div
            key="style"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
          >
            <StyleStep
              selectedStyles={params.style}
              onToggle={handleStyleToggle}
              onNext={params.style.length > 0 ? () => setPhase("categories") : undefined}
            />
          </motion.div>
        )}

        {phase === "categories" && (
          <motion.div
            key="categories"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            <CategorySelectionStep
              establishmentType={params.establishmentType}
              selectedCategories={params.selectedCategories ?? null}
              onChange={(cats) => setParams(prev => ({ ...prev, selectedCategories: cats }))}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setPhase("summary")}
                className="flex items-center gap-2 px-6 py-3 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
              >
                {t('discovery.continue', 'Continue')} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {phase === "summary" && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3">
              <Check className="h-4 w-4 text-foreground" />
              <span className="text-xs font-body uppercase tracking-[0.2em] text-muted-foreground">
                {t('discovery.brief')}
              </span>
            </div>

            <h3 className="font-display text-xl md:text-2xl font-bold text-foreground">
              {t('discovery.understood', "Here's what we understood")}
            </h3>

            <div className="bg-card rounded-sm p-6 space-y-3">
              <SummaryRow label={t('discovery.summaryEstablishment', 'Establishment')} value={summary.establishment} />
              <SummaryRow label={t('discovery.summaryZone', 'Zone')} value={summary.zone} />
              <SummaryRow label={t('discovery.summaryStyle', 'Style')} value={summary.style} />
              <SummaryRow label={t('discovery.summaryAmbience', 'Ambience')} value={summary.ambience} />
              <SummaryRow label={t('discovery.summaryCapacity', 'Capacity')} value={summary.capacity} />
              <SummaryRow label={t('discovery.summaryLayout', 'Layout')} value={summary.layout} />
              <SummaryRow label={t('discovery.summaryPriority', 'Priority')} value={summary.layoutPriority} />

              {/* Visual palette from selected styles */}
              <div className="flex items-baseline gap-3">
                <span className="text-[10px] font-body uppercase tracking-[0.15em] text-muted-foreground w-24 flex-shrink-0">
                  {t('discovery.summaryPalette', 'Palette')}
                </span>
                <div className="flex items-center gap-3 flex-wrap">
                  {params.style.map(s => {
                    const opt = STYLE_OPTIONS.find(o => o.value === s);
                    if (!opt) return null;
                    return (
                      <div key={s} className="flex items-center gap-1.5">
                        {opt.palette.slice(0, 3).map((color, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded-full border border-black/10"
                            style={{ background: color }}
                            title={opt.paletteNames[i]}
                          />
                        ))}
                        <span className="text-xs font-display font-medium text-foreground capitalize ml-1">{s}</span>
                      </div>
                    );
                  })}
                  {params.style.length === 0 && (
                    <span className="text-sm font-display font-medium text-muted-foreground italic">
                      {t('discovery.noPalette', 'Auto-detected from style')}
                    </span>
                  )}
                </div>
              </div>

              <SummaryRow label={t('discovery.summaryMaterials', 'Materials')} value={summary.materials} />
              <SummaryRow label={t('discovery.summaryConstraints', 'Constraints')} value={summary.constraints} />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleConfirmSummary}
                className="flex items-center gap-2 px-6 py-3 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
              >
                {t('discovery.generate', 'Generate 3 concepts')} <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={onReset}
                className="flex items-center gap-2 px-5 py-3 font-display font-semibold text-sm border border-border rounded-full hover:border-foreground transition-colors text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" /> {t('discovery.startOver', 'Start over')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-[10px] font-body uppercase tracking-[0.15em] text-muted-foreground w-24 flex-shrink-0">
        {label}
      </span>
      <span className="text-sm font-display font-medium text-foreground capitalize">
        {value}
      </span>
    </div>
  );
}

export default ProjectDiscovery;
