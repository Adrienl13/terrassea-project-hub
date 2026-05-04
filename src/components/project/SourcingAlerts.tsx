import { AlertTriangle, Info, CheckCircle2, ShieldAlert } from "lucide-react";
import type { CartItem } from "@/contexts/ProjectCartContext";
import type { DBProductVariant } from "@/lib/productVariants";
import { getEffectiveStockStatus } from "@/lib/cartHelpers";

interface SourcingAlertsProps {
  items: CartItem[];
  /**
   * ζ — variants Modèle B des items du cart. Permet à computeAlerts
   * de détecter les items dont la VARIANT est out_of_stock /
   * made_to_order (pas seulement le supplier offer). Optionnel pour
   * backward compat sur les pages qui ne les fetchent pas.
   */
  variants?: DBProductVariant[];
}

interface SourcingAlert {
  type: "warning" | "info" | "success";
  message: string;
}

function computeAlerts(items: CartItem[], variants?: DBProductVariant[]): SourcingAlert[] {
  if (items.length === 0) return [];

  const alerts: SourcingAlert[] = [];
  const withSupplier = items.filter((i) => i.selectedSupplier);
  const withoutSupplier = items.filter((i) => !i.selectedSupplier);

  // Items without supplier
  if (withoutSupplier.length > 0 && withSupplier.length > 0) {
    alerts.push({
      type: "warning",
      message: `${withoutSupplier.length} item${withoutSupplier.length > 1 ? "s" : ""} still need${withoutSupplier.length === 1 ? "s" : ""} a supplier selection`,
    });
  }

  // Fragmentation check
  if (withSupplier.length >= 2) {
    const supplierIds = new Set(withSupplier.map((i) => i.selectedSupplier!.partnerId));
    if (supplierIds.size > 2 && supplierIds.size >= withSupplier.length * 0.7) {
      alerts.push({
        type: "warning",
        message: "High sourcing fragmentation — consider consolidating suppliers to simplify logistics and quotation",
      });
    }
  }

  // Uncertain stock (offer-level: low_stock/production/on_order)
  const uncertainStock = withSupplier.filter((i) => {
    const s = i.selectedSupplier!.stockStatus?.toLowerCase();
    return s === "low_stock" || s === "production" || s === "on_order";
  });
  if (uncertainStock.length > 0) {
    alerts.push({
      type: "info",
      message: `${uncertainStock.length} item${uncertainStock.length > 1 ? "s" : ""} require${uncertainStock.length === 1 ? "s" : ""} supplier confirmation before quotation`,
    });
  }

  // ζ : variant-level availability check (separate de uncertainStock supplier-level).
  // Capture les items dont la VARIANT Modèle B est out_of_stock / made_to_order,
  // même si l'offer du supplier sélectionné a du stock.
  const variantUnavailable = items.filter((i) => {
    const status = getEffectiveStockStatus(i, variants);
    return status === "made_to_order" || status === "availability_on_request";
  });
  if (variantUnavailable.length > 0) {
    alerts.push({
      type: "warning",
      message: `${variantUnavailable.length} item${variantUnavailable.length > 1 ? "s" : ""} require${variantUnavailable.length === 1 ? "s" : ""} availability confirmation — review your selection before submitting`,
    });
  }

  // All sourced + all available
  if (withoutSupplier.length === 0 && items.length > 0) {
    const allConfirmed = uncertainStock.length === 0 && variantUnavailable.length === 0;
    if (allConfirmed) {
      alerts.push({
        type: "success",
        message: "All items sourced and available — project is ready for quotation",
      });
    }
  }

  return alerts;
}

const ICON_MAP = {
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle2,
};

const STYLE_MAP = {
  warning: "bg-amber-500/5 border-amber-500/20 text-amber-800",
  info: "bg-blue-500/5 border-blue-500/20 text-blue-800",
  success: "bg-green-500/5 border-green-500/20 text-green-800",
};

const SourcingAlerts = ({ items, variants }: SourcingAlertsProps) => {
  const alerts = computeAlerts(items, variants);
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-6">
      {alerts.map((alert, i) => {
        const Icon = ICON_MAP[alert.type];
        return (
          <div
            key={i}
            className={`flex items-start gap-2.5 px-4 py-3 rounded-sm border text-xs font-body ${STYLE_MAP[alert.type]}`}
          >
            <Icon className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span>{alert.message}</span>
          </div>
        );
      })}
      <p className="text-[9px] font-body text-muted-foreground italic">
        Availability subject to final supplier confirmation · Lead times may vary depending on finish and quantity
      </p>
    </div>
  );
};

export default SourcingAlerts;
