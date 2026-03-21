import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Settings2, ArrowRight, ChevronDown, RotateCcw } from "lucide-react";
import { STYLE_OPTIONS } from "@/components/project-builder/StyleStep";
import type { ProjectParameters, ProductCategorySelection } from "@/engine/types";
import { getDefaultCategories } from "@/engine/projectEngine";

interface ProjectResultsEditorProps {
  parameters: ProjectParameters;
  onRegenerate: (params: ProjectParameters) => void;
  isRegenerating?: boolean;
}

const ESTABLISHMENT_OPTIONS = [
  "restaurant", "hotel", "rooftop", "beach-club", "bar", "camping", "event", "pool",
];

const BUDGET_OPTIONS = [
  { value: "economy", label: "€50–80" },
  { value: "mid", label: "€80–120" },
  { value: "premium", label: "€120–180" },
  { value: "luxury", label: "€180+" },
];

const ALL_CATEGORIES: ProductCategorySelection[] = [
  "chairs", "armchairs", "tables", "bar-stools", "parasols",
  "sun-loungers", "lounge-seating", "benches", "accessories",
];

export default function ProjectResultsEditor({
  parameters,
  onRegenerate,
  isRegenerating,
}: ProjectResultsEditorProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [editParams, setEditParams] = useState<ProjectParameters>(parameters);

  const hasChanges = JSON.stringify(editParams) !== JSON.stringify(parameters);

  const handleStyleToggle = (style: string) => {
    setEditParams(prev => ({
      ...prev,
      style: prev.style.includes(style)
        ? prev.style.filter(s => s !== style)
        : [...prev.style, style],
    }));
  };

  const handleCategoryToggle = (cat: ProductCategorySelection) => {
    setEditParams(prev => {
      const current = prev.selectedCategories || getDefaultCategories(prev.establishmentType);
      return {
        ...prev,
        selectedCategories: current.includes(cat)
          ? current.filter(c => c !== cat)
          : [...current, cat],
      };
    });
  };

  const handleRegenerate = () => {
    onRegenerate(editParams);
    setIsOpen(false);
  };

  const handleReset = () => {
    setEditParams(parameters);
  };

  const activeCategories = editParams.selectedCategories || getDefaultCategories(editParams.establishmentType);

  return (
    <div className="mb-8">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-display font-semibold transition-all ${
          isOpen
            ? "border-foreground bg-foreground text-primary-foreground"
            : "border-border text-foreground hover:border-foreground"
        }`}
      >
        <Settings2 className="h-4 w-4" />
        {t('results.editParams', 'Edit parameters')}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-4 border border-border rounded-xl bg-card p-6 space-y-6">

              {/* Row 1: Type + Capacity + Budget */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    {t('results.type', 'Establishment')}
                  </label>
                  <select
                    value={editParams.establishmentType}
                    onChange={e => setEditParams(prev => ({ ...prev, establishmentType: e.target.value }))}
                    className="w-full px-3 py-2 text-sm font-body bg-background border border-border rounded-lg outline-none focus:border-foreground capitalize"
                  >
                    {ESTABLISHMENT_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt.replace(/-/g, " ")}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    {t('results.capacity', 'Capacity')}
                  </label>
                  <input
                    type="number"
                    min={4}
                    max={500}
                    value={editParams.seatingCapacity ?? ""}
                    onChange={e => setEditParams(prev => ({
                      ...prev,
                      seatingCapacity: e.target.value ? parseInt(e.target.value) : null,
                    }))}
                    placeholder="30"
                    className="w-full px-3 py-2 text-sm font-body bg-background border border-border rounded-lg outline-none focus:border-foreground"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    {t('results.budget', 'Budget / seat')}
                  </label>
                  <select
                    value={editParams.budgetLevel}
                    onChange={e => setEditParams(prev => ({ ...prev, budgetLevel: e.target.value }))}
                    className="w-full px-3 py-2 text-sm font-body bg-background border border-border rounded-lg outline-none focus:border-foreground"
                  >
                    <option value="">—</option>
                    {BUDGET_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Styles */}
              <div>
                <label className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-2 block">
                  {t('results.styles', 'Styles')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {STYLE_OPTIONS.map(opt => {
                    const isSelected = editParams.style.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => handleStyleToggle(opt.value)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-display font-semibold border transition-all ${
                          isSelected
                            ? "border-foreground bg-foreground text-primary-foreground"
                            : "border-border text-foreground hover:border-foreground/30"
                        }`}
                      >
                        <div className="flex gap-0.5">
                          {opt.palette.slice(0, 3).map((c, i) => (
                            <div key={i} className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ background: c }} />
                          ))}
                        </div>
                        <span className="capitalize">{opt.value}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 3: Categories */}
              <div>
                <label className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-2 block">
                  {t('results.categories', 'Product categories')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_CATEGORIES.map(cat => {
                    const isSelected = activeCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => handleCategoryToggle(cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-display font-semibold border transition-all ${
                          isSelected
                            ? "border-foreground bg-foreground/5 text-foreground"
                            : "border-border text-muted-foreground hover:border-foreground/30"
                        }`}
                      >
                        {t(`categorySelection.${cat}`)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <button
                  onClick={handleReset}
                  disabled={!hasChanges}
                  className="flex items-center gap-1.5 text-xs font-body text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                >
                  <RotateCcw className="h-3 w-3" />
                  {t('results.resetChanges', 'Reset changes')}
                </button>

                <button
                  onClick={handleRegenerate}
                  disabled={isRegenerating || editParams.style.length === 0}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#D4603A] text-white font-display font-semibold text-sm hover:bg-[#C05030] transition-colors disabled:opacity-50"
                >
                  {isRegenerating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      {t('results.regenerate', 'Regenerate concepts')}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
