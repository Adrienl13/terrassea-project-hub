import { motion } from "framer-motion";
import { Compass, Wrench } from "lucide-react";

interface Props {
  onSelect: (mode: "guided" | "expert") => void;
}

const ProjectBuilderModeSelect = ({ onSelect }: Props) => {
  return (
    <motion.div
      key="mode-select"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="font-display text-xl md:text-2xl font-bold text-foreground mb-2">
        How would you like to start your project?
      </h2>
      <p className="text-sm font-body text-muted-foreground mb-8">
        Choose the approach that fits your experience level.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => onSelect("guided")}
          className="text-left p-6 rounded-sm border border-border bg-card hover:border-foreground/30 transition-all group"
        >
          <Compass className="h-6 w-6 text-foreground mb-3" />
          <span className="font-display font-bold text-base text-foreground block">
            Guided project
          </span>
          <span className="text-xs font-body text-muted-foreground block mt-1">
            Recommended — Answer a few questions and we'll build your project brief for you.
          </span>
          <span className="mt-3 inline-block text-[10px] font-body uppercase tracking-[0.15em] text-muted-foreground/70 border border-border rounded-full px-2 py-0.5">
            The system builds your project
          </span>
        </button>

        <button
          onClick={() => onSelect("expert")}
          className="text-left p-6 rounded-sm border border-border bg-card hover:border-foreground/30 transition-all group"
        >
          <Wrench className="h-6 w-6 text-foreground mb-3" />
          <span className="font-display font-bold text-base text-foreground block">
            I already know my requirements
          </span>
          <span className="text-xs font-body text-muted-foreground block mt-1">
            Enter exact seating capacity, terrace dimensions, layout strategy and more directly.
          </span>
        </button>
      </div>
    </motion.div>
  );
};

export default ProjectBuilderModeSelect;
