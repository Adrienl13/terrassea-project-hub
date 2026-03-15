import { Package, Users, TrendingUp, Clock, BarChart3 } from "lucide-react";
import type { CartItem, QuotationStatus } from "@/contexts/ProjectCartContext";

interface SourcingSummaryProps {
  items: CartItem[];
  quotationStatus: QuotationStatus;
}

const STATUS_CONFIG: Record<QuotationStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  sourcing_in_progress: { label: "Sourcing in progress", className: "bg-amber-500/10 text-amber-700 border border-amber-500/20" },
  supplier_confirmation_required: { label: "Supplier confirmation required", className: "bg-blue-500/10 text-blue-700 border border-blue-500/20" },
  ready_for_quotation: { label: "Ready for quotation", className: "bg-green-500/10 text-green-700 border border-green-500/20" },
};

function computeStats(items: CartItem[]) {
  const withSupplier = items.filter((i) => i.selectedSupplier);
  const coveredCount = withSupplier.length;
  const totalCount = items.length;

  // Unique suppliers
  const supplierIds = new Set(withSupplier.map((i) => i.selectedSupplier!.partnerId));
  const supplierCount = supplierIds.size;

  // Consolidation ratio: ideal = 1 supplier for all items. Higher ratio = more consolidated
  const consolidationRatio = supplierCount > 0
    ? Math.round((coveredCount / supplierCount / totalCount) * 100)
    : 0;

  // Estimated max lead time
  const leadTimes = withSupplier
    .map((i) => i.selectedSupplier!.deliveryDelayDays)
    .filter((d): d is number => d !== null && d !== undefined);
  const maxLeadTime = leadTimes.length > 0 ? Math.max(...leadTimes) : null;

  // Complexity
  let complexity: "low" | "medium" | "high" = "low";
  if (supplierCount > 3 || (coveredCount < totalCount && totalCount > 3)) complexity = "high";
  else if (supplierCount > 1 || coveredCount < totalCount) complexity = "medium";

  return { coveredCount, totalCount, supplierCount, consolidationRatio, maxLeadTime, complexity };
}

const COMPLEXITY_STYLE: Record<string, string> = {
  low: "text-green-700",
  medium: "text-amber-700",
  high: "text-destructive",
};

const SourcingSummary = ({ items, quotationStatus }: SourcingSummaryProps) => {
  if (items.length === 0) return null;

  const stats = computeStats(items);
  const statusConfig = STATUS_CONFIG[quotationStatus];

  return (
    <div className="bg-card rounded-sm p-5 mb-6">
      {/* Status badge */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-body uppercase tracking-[0.2em] text-muted-foreground">
          Sourcing Overview
        </h3>
        <span className={`text-[10px] font-display font-semibold px-2.5 py-1 rounded-full ${statusConfig.className}`}>
          {statusConfig.label}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="font-display font-bold text-lg text-foreground block">
            {stats.coveredCount}/{stats.totalCount}
          </span>
          <span className="text-[9px] font-body uppercase tracking-wider text-muted-foreground">
            Items sourced
          </span>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="font-display font-bold text-lg text-foreground block">
            {stats.supplierCount}
          </span>
          <span className="text-[9px] font-body uppercase tracking-wider text-muted-foreground">
            Supplier{stats.supplierCount !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="font-display font-bold text-lg text-foreground block">
            {stats.consolidationRatio}%
          </span>
          <span className="text-[9px] font-body uppercase tracking-wider text-muted-foreground">
            Consolidation
          </span>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="font-display font-bold text-lg text-foreground block">
            {stats.maxLeadTime !== null ? `${stats.maxLeadTime}d` : "—"}
          </span>
          <span className="text-[9px] font-body uppercase tracking-wider text-muted-foreground">
            Max lead time
          </span>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className={`font-display font-bold text-lg block capitalize ${COMPLEXITY_STYLE[stats.complexity]}`}>
            {stats.complexity}
          </span>
          <span className="text-[9px] font-body uppercase tracking-wider text-muted-foreground">
            Complexity
          </span>
        </div>
      </div>
    </div>
  );
};

export default SourcingSummary;
