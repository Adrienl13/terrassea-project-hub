import { AlertTriangle, Info, CheckCircle2, ShieldAlert } from "lucide-react";
import type { CartItem } from "@/contexts/ProjectCartContext";

interface SourcingAlertsProps {
  items: CartItem[];
}

interface SourcingAlert {
  type: "warning" | "info" | "success";
  message: string;
}

function computeAlerts(items: CartItem[]): SourcingAlert[] {
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

  // Uncertain stock
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

  // All sourced
  if (withoutSupplier.length === 0 && items.length > 0) {
    const allConfirmed = uncertainStock.length === 0;
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

const SourcingAlerts = ({ items }: SourcingAlertsProps) => {
  const alerts = computeAlerts(items);
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
