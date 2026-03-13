import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Sparkles, RotateCcw } from "lucide-react";
import { ProjectParameters, DiscoveryQuestion, ProjectSummary } from "@/engine/types";
import {
  parseProjectRequest,
  detectMissingFields,
  applyAnswer,
  isRequestComplete,
  generateProjectSummary,
} from "@/engine/projectEngine";

type DiscoveryPhase = "questions" | "summary" | "done";

interface ProjectDiscoveryProps {
  query: string;
  onComplete: (params: ProjectParameters) => void;
  onReset: () => void;
}

const ProjectDiscovery = ({ query, onComplete, onReset }: ProjectDiscoveryProps) => {
  const [params, setParams] = useState<ProjectParameters>(() => parseProjectRequest(query));
  const [questions, setQuestions] = useState<DiscoveryQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<DiscoveryPhase>("questions");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parsed = parseProjectRequest(query);
    setParams(parsed);

    if (isRequestComplete(parsed)) {
      // Request is detailed enough — skip to summary
      setPhase("summary");
    } else {
      const missing = detectMissingFields(parsed);
      if (missing.length === 0) {
        setPhase("summary");
      } else {
        setQuestions(missing);
        setPhase("questions");
      }
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
      setPhase("summary");
    }
  };

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
                Project Discovery — {currentQuestionIndex + 1} of {questions.length}
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
                  {questions[currentQuestionIndex].question}
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  {questions[currentQuestionIndex].options.map((option) => {
                    const isSelected = answers[questions[currentQuestionIndex].id] === option;
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
                        {option}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Skip link */}
            <button
              onClick={() => setPhase("summary")}
              className="text-xs font-body text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip remaining questions →
            </button>
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
                Project Brief
              </span>
            </div>

            <h3 className="font-display text-xl md:text-2xl font-bold text-foreground">
              Here's what we understood
            </h3>

            <div className="bg-card rounded-sm p-6 space-y-3">
              <SummaryRow label="Establishment" value={summary.establishment} />
              <SummaryRow label="Zone" value={summary.zone} />
              <SummaryRow label="Style" value={summary.style} />
              <SummaryRow label="Ambience" value={summary.ambience} />
              <SummaryRow label="Capacity" value={summary.capacity} />
              <SummaryRow label="Palette" value={summary.palette} />
              <SummaryRow label="Materials" value={summary.materials} />
              <SummaryRow label="Constraints" value={summary.constraints} />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleConfirmSummary}
                className="flex items-center gap-2 px-6 py-3 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
              >
                Generate 3 concepts <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={onReset}
                className="flex items-center gap-2 px-5 py-3 font-display font-semibold text-sm border border-border rounded-full hover:border-foreground transition-colors text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Start over
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
