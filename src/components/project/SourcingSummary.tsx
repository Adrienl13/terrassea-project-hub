import { Package, Users, TrendingUp, Clock, BarChart3, DollarSign } from "lucide-react";
import type { CartItem, QuotationStatus } from "@/contexts/ProjectCartContext";

interface SourcingSummaryProps {
  items: CartItem[];
  quotationStatus: QuotationStatus;
}

const STATUS_CONFIG: Record<QuotationStatus, { label: string; className: string; step: number }> = {
  draft:                          { label: "Draft",                        className: "bg-muted text-muted-foreground",                           step: 1 },
  sourcing_in_progress:           { label: "Sourcing in progress",         className: "bg-amber-500/10 text-amber-700 border border-amber-500/20", step: 2 },
  supplier_confirmation_required: { label: "Supplier confirmation needed", className: "bg-blue-500/10 text-blue-700 border border-blue-500/20",   step: 3 },
  ready_for_quotation:            { label: "Ready for quotation",          className: "bg-green-500/10 text-green-700 border border-green-500/20", step: 4 },
};

const STEPS = ["Draft", "Sourcing", "Confirmation", "Ready"];

function computeStats(items: CartItem[]) {
  const withSupplier = items.filter((i) => i.selectedSupplier);
  const coveredCount  = withSupplier.length;
  const totalCount    = items.length;

  const supplierIds   = new Set(withSupplier.map((i) => i.selectedSupplier!.partnerId));
  const supplierCount = supplierIds.size;

  const consolidationRatio = supplierCount > 0
    ? Math.round((coveredCount / supplierCount / totalCount) * 100)
    : 0;

  const leadTimes = withSupplier
    .map((i) => i.selectedSupplier!.deliveryDelayDays)
    .filter((d): d is number => d !== null && d !== undefined);
  const maxLeadTime = leadTimes.length > 0 ? Math.max(...leadTimes) : null;

  let complexity: "low" | "medium" | "high" = "low";
  if (supplierCount > 3 || (coveredCount < totalCount && totalCount > 3)) complexity = "high";
  else if (supplierCount > 1 || coveredCount < totalCount) complexity = "medium";

  const totalBudget = items.reduce((sum, item) => {
    const price = item.selectedSupplier?.price ?? (item.product as any).price_min ?? null;
    if (price === null) return sum;
    return sum + price * item.quantity;
  }, 0);
  const hasBudget = items.some((i) =>
    i.selectedSupplier?.price != null || (i.product as any).price_min != null
  );

  return {
    coveredCount, totalCount, supplierCount,
    consolidationRatio, maxLeadTime, complexity,
    totalBudget, hasBudget,
  };
}

const COMPLEXITY_STYLE: Record<string, string> = {
  low:    "text-green-700",
  medium: "text-amber-700",
  high:   "text-destructive",
};

const SourcingSummary = ({ items, quotationStatus }: SourcingSummaryProps) => {
  if (items.length === 0) return null;

  const stats        = computeStats(items);
  const statusConfig = STATUS_CONFIG[quotationStatus];

  return (
    <div className="bg-card rounded-sm p-5 mb-6">
      {/* Header — titre + badge statut */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-body uppercase tracking-[0.2em] text-muted-foreground">
          Sourcing Overview
        </h3>
        <span className={`text-[10px] font-display font-semibold px-2.5 py-1 rounded-full ${statusConfig.className}`}>
          {statusConfig.label}
        </span>
      </div>

      {/* Progress steps */}
      <div className="flex items-center justify-between mb-5">
        {STEPS.map((step, i) => {
          const stepNum  = i + 1;
          const isDone   = statusConfig.step > stepNum;
          const isActive = statusConfig.step === stepNum;
          const isLast   = i === STEPS.length - 1;
          return (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-display font-bold transition-colors ${
                    isDone
                      ? "bg-green-600 text-white"
                      : isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isDone ? "✓" : stepNum}
                </div>
                <span className={`text-[9px] font-body ${isActive ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                  {step}
                </span>
              </div>
              {!isLast && (
                <div className={`flex-1 h-px mx-2 ${isDone ? "bg-green-600" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Stats grid — 6 métriques */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="text-center">
          <Package className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
          <span className="font-display font-bold text-lg text-foreground block">
            {stats.coveredCount}/{stats.totalCount}
          </span>
          <span className="text-[9px] font-body uppercase tracking-wider text-muted-foreground">
            Items sourced
          </span>
        </div>

        <div className="text-center">
          <Users className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
          <span className="font-display font-bold text-lg text-foreground block">
            {stats.supplierCount}
          </span>
          <span className="text-[9px] font-body uppercase tracking-wider text-muted-foreground">
            Supplier{stats.supplierCount !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="text-center">
          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
          <span className="font-display font-bold text-lg text-foreground block">
            {stats.consolidationRatio}%
          </span>
          <span className="text-[9px] font-body uppercase tracking-wider text-muted-foreground">
            Consolidation
          </span>
        </div>

        <div className="text-center">
          <Clock className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
          <span className="font-display font-bold text-lg text-foreground block">
            {stats.maxLeadTime !== null ? `${stats.maxLeadTime}d` : "—"}
          </span>
          <span className="text-[9px] font-body uppercase tracking-wider text-muted-foreground">
            Max lead time
          </span>
        </div>

        <div className="text-center">
          <BarChart3 className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
          <span className={`font-display font-bold text-lg block capitalize ${COMPLEXITY_STYLE[stats.complexity]}`}>
            {stats.complexity}
          </span>
          <span className="text-[9px] font-body uppercase tracking-wider text-muted-foreground">
            Complexity
          </span>
        </div>

        <div className="text-center">
          <DollarSign className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
          <span className="font-display font-bold text-lg text-foreground block">
            {stats.hasBudget
              ? `~€${stats.totalBudget.toLocaleString("fr-FR")}`
              : "—"}
          </span>
          <span className="text-[9px] font-body uppercase tracking-wider text-muted-foreground">
            Indicative
          </span>
        </div>
      </div>

      {/* Disclaimer budget si affiché */}
      {stats.hasBudget && (
        <p className="text-[9px] font-body text-muted-foreground italic mt-3 text-center">
          Indicative total based on listed prices · excl. delivery &amp; VAT · final quotes may vary
        </p>
      )}
    </div>
  );
};

export default SourcingSummary;
