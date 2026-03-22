import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Package, AlertTriangle, CheckCircle2, ShoppingCart } from "lucide-react";
import type { ProductArrival } from "@/hooks/useArrivals";

interface Props {
  stockStatus: string | null;
  stockQuantity: number | null;
  arrivals: ProductArrival[];
  onPreorder?: (arrivalItemId: string, maxQty: number) => void;
}

function formatRelativeDate(dateStr: string, t: (key: string, opts?: any) => string): string {
  const target = new Date(dateStr);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return t("restock.today");
  if (diffDays === 1) return t("restock.tomorrow");
  if (diffDays <= 14) return t("restock.inDays", { count: diffDays });
  if (diffDays <= 56) {
    const weeks = Math.round(diffDays / 7);
    return t("restock.inWeeks", { count: weeks });
  }
  return target.toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

const RestockBadge = ({ stockStatus, stockQuantity, arrivals, onPreorder }: Props) => {
  const { t } = useTranslation();
  const [preorderOpen, setPreorderOpen] = useState<string | null>(null);
  const [preorderQty, setPreorderQty] = useState(1);

  const inStock = stockQuantity !== null && stockQuantity > 0;
  const nextArrival = arrivals.length > 0 ? arrivals[0] : null;
  const availableToPreorder = nextArrival?.available ?? 0;

  const handlePreorderSubmit = (arrivalId: string, maxQty: number) => {
    const qty = Math.min(preorderQty, maxQty);
    onPreorder?.(arrivalId, qty);
    setPreorderOpen(null);
    setPreorderQty(1);
  };

  // In stock + arrival coming
  if (inStock && nextArrival) {
    const dateLabel = formatRelativeDate(nextArrival.expectedDate, t);
    return (
      <div className="space-y-0.5">
        <span className="inline-flex items-center gap-1 text-[10px] font-body text-green-700">
          <CheckCircle2 className="h-3 w-3" />
          {t("restock.inStock", { count: stockQuantity })}
        </span>
        <span className="flex items-center gap-1 text-[10px] font-body text-blue-600">
          <Package className="h-3 w-3" />
          {t("restock.arrivingIn", { qty: nextArrival.expectedQuantity, date: dateLabel })}
        </span>
      </div>
    );
  }

  // In stock, no arrival
  if (inStock) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-body text-green-700">
        <CheckCircle2 className="h-3 w-3" />
        {t("restock.inStock", { count: stockQuantity })}
      </span>
    );
  }

  // Out of stock + arrival
  if (!inStock && nextArrival) {
    const dateLabel = formatRelativeDate(nextArrival.expectedDate, t);
    return (
      <div className="space-y-1">
        <span className="flex items-center gap-1 text-[10px] font-body text-blue-600">
          <Package className="h-3 w-3" />
          {t("restock.availableFrom", { date: dateLabel, count: nextArrival.expectedQuantity })}
        </span>
        {nextArrival.preorderEnabled && onPreorder && availableToPreorder > 0 && (
          <>
            {preorderOpen === nextArrival.arrivalId ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={availableToPreorder}
                  value={preorderQty}
                  onChange={(e) => setPreorderQty(Math.max(1, Math.min(availableToPreorder, parseInt(e.target.value) || 1)))}
                  className="w-14 text-center text-[10px] font-display border border-border rounded px-1 py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  onClick={() => handlePreorderSubmit(nextArrival.arrivalId, availableToPreorder)}
                  className="text-[10px] font-display font-semibold bg-blue-600 text-white rounded px-2 py-0.5 hover:bg-blue-700 transition-colors"
                >
                  {t("restock.confirm")}
                </button>
                <button
                  onClick={() => setPreorderOpen(null)}
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                >
                  x
                </button>
              </div>
            ) : (
              <button
                onClick={() => setPreorderOpen(nextArrival.arrivalId)}
                className="inline-flex items-center gap-1 text-[10px] font-display font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                <ShoppingCart className="h-3 w-3" />
                {t("restock.preorderButton")}
              </button>
            )}
          </>
        )}
      </div>
    );
  }

  // Out of stock, no arrival
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-body text-destructive">
      <AlertTriangle className="h-3 w-3" />
      {t("restock.outOfStock")}
    </span>
  );
};

export default RestockBadge;
