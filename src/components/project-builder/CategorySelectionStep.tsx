import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Armchair, Table2, Sun, Palmtree, Sofa,
  LayoutGrid, Package, CheckCircle2,
} from "lucide-react";
import type { ProductCategorySelection } from "@/engine/types";
import { getDefaultCategories } from "@/engine/projectEngine";

interface CategorySelectionStepProps {
  establishmentType: string;
  selectedCategories: ProductCategorySelection[] | null;
  onChange: (categories: ProductCategorySelection[] | null) => void;
}

const ALL_CATEGORIES: {
  id: ProductCategorySelection;
  icon: React.ElementType;
}[] = [
  { id: "chairs",          icon: Armchair },
  { id: "armchairs",       icon: Armchair },
  { id: "tables",          icon: Table2 },
  { id: "bar-stools",      icon: Armchair },
  { id: "parasols",        icon: Sun },
  { id: "sun-loungers",    icon: Palmtree },
  { id: "lounge-seating",  icon: Sofa },
  { id: "benches",         icon: LayoutGrid },
  { id: "accessories",     icon: Package },
];

export default function CategorySelectionStep({
  establishmentType,
  selectedCategories,
  onChange,
}: CategorySelectionStepProps) {
  const { t } = useTranslation();
  const isComplete = selectedCategories === null;
  const [defaults] = useState(() => getDefaultCategories(establishmentType));

  // When switching to complete, notify parent with null
  useEffect(() => {
    if (isComplete) onChange(null);
  }, [isComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleComplete = () => {
    if (isComplete) {
      // Switch to custom with venue defaults pre-selected
      onChange([...defaults]);
    } else {
      onChange(null);
    }
  };

  const toggleCategory = (cat: ProductCategorySelection) => {
    if (isComplete) return;
    const current = selectedCategories || [];
    if (current.includes(cat)) {
      onChange(current.filter(c => c !== cat));
    } else {
      onChange([...current, cat]);
    }
  };

  const selected = isComplete ? defaults : (selectedCategories || []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-lg font-bold text-foreground mb-1">
          {t("categorySelection.title")}
        </h3>
        <p className="text-sm font-body text-muted-foreground">
          {t("categorySelection.subtitle")}
        </p>
      </div>

      {/* Complete proposal toggle */}
      <button
        onClick={toggleComplete}
        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
          isComplete
            ? "border-[#D4603A] bg-[#D4603A]/5"
            : "border-border hover:border-foreground/20"
        }`}
      >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          isComplete ? "bg-[#D4603A] text-white" : "bg-muted text-muted-foreground"
        }`}>
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-display font-semibold text-sm text-foreground">
            {t("categorySelection.completeProposal")}
          </p>
          <p className="text-xs font-body text-muted-foreground mt-0.5">
            {t("categorySelection.completeProposalDesc")}
          </p>
        </div>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          isComplete ? "border-[#D4603A] bg-[#D4603A]" : "border-border"
        }`}>
          {isComplete && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
      </button>

      {/* Custom selection toggle */}
      <button
        onClick={() => { if (isComplete) toggleComplete(); }}
        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
          !isComplete
            ? "border-[#D4603A] bg-[#D4603A]/5"
            : "border-border hover:border-foreground/20"
        }`}
      >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          !isComplete ? "bg-[#D4603A] text-white" : "bg-muted text-muted-foreground"
        }`}>
          <LayoutGrid className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-display font-semibold text-sm text-foreground">
            {t("categorySelection.customSelection")}
          </p>
        </div>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          !isComplete ? "border-[#D4603A] bg-[#D4603A]" : "border-border"
        }`}>
          {!isComplete && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
      </button>

      {/* Category grid — visible when custom */}
      {!isComplete && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="grid grid-cols-3 gap-2"
        >
          {ALL_CATEGORIES.map(({ id, icon: Icon }) => {
            const isSelected = selected.includes(id);
            const isDefault = defaults.includes(id);
            return (
              <button
                key={id}
                onClick={() => toggleCategory(id)}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all text-center ${
                  isSelected
                    ? "border-foreground bg-foreground text-primary-foreground"
                    : isDefault
                    ? "border-border bg-card hover:border-foreground/30 text-foreground"
                    : "border-border bg-card/50 hover:border-foreground/20 text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[11px] font-display font-semibold leading-tight">
                  {t(`categorySelection.${id}`)}
                </span>
              </button>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
