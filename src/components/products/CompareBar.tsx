import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, BarChart3 } from "lucide-react";
import { useCompare } from "@/contexts/CompareContext";

const CompareBar = () => {
  const { items, removeFromCompare, clearCompare, count } = useCompare();

  if (count === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-foreground text-primary-foreground px-6 py-3"
      >
        <div className="container mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 overflow-x-auto">
            <BarChart3 className="h-4 w-4 flex-shrink-0" />
            <span className="text-xs font-display font-semibold flex-shrink-0">
              Compare ({count}/4)
            </span>
            <div className="flex items-center gap-2">
              {items.map((p) => (
                <div key={p.id} className="flex items-center gap-1.5 bg-primary-foreground/10 rounded-full pl-1.5 pr-2 py-1">
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-primary-foreground/20">
                    <img src={p.image_url || "/placeholder.svg"} alt={p.name} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-body truncate max-w-[80px]">{p.name}</span>
                  <button onClick={() => removeFromCompare(p.id)} className="hover:opacity-70">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={clearCompare}
              className="text-[10px] font-body text-primary-foreground/60 hover:text-primary-foreground transition-colors"
            >
              Clear
            </button>
            {count >= 2 && (
              <Link
                to="/products/compare"
                className="flex items-center gap-1.5 text-xs font-display font-semibold bg-primary-foreground text-foreground rounded-full px-4 py-2 hover:opacity-90 transition-opacity"
              >
                Compare <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CompareBar;
