import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Package, Truck, CheckCircle2, Clock,
  Factory, XCircle, ExternalLink, MapPin, CreditCard,
  CalendarDays, FileText, CircleDot, RefreshCw, Copy, Check,
  ChevronDown, ChevronRight, Euro, AlertCircle,
} from "lucide-react";
import { useClientOrders, useOrderDetail, type ClientOrder } from "@/hooks/useOrders";
import { usePaymentFlow } from "@/hooks/usePaymentFlow";
import { useAuth } from "@/contexts/AuthContext";
import { useProjectCart } from "@/contexts/ProjectCartContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PaymentInstructions from "@/components/payments/PaymentInstructions";
import PayNowButton from "@/components/payments/PayNowButton";

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

const fmtDateShort = (d: string) =>
  new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });

const orderRef = (id: string) => `TRS-${id.slice(0, 8).toUpperCase()}`;

// ── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; icon: any; label: string }> = {
  pending:          { bg: "bg-slate-50",   text: "text-slate-600",  border: "border-slate-200", icon: Clock,        label: "En attente" },
  pending_deposit:  { bg: "bg-amber-50",   text: "text-amber-700",  border: "border-amber-200", icon: Clock,        label: "Acompte requis" },
  deposit_paid:     { bg: "bg-blue-50",    text: "text-blue-700",   border: "border-blue-200",  icon: CheckCircle2, label: "Acompte payé" },
  confirmed:        { bg: "bg-blue-50",    text: "text-blue-700",   border: "border-blue-200",  icon: CheckCircle2, label: "Confirmé" },
  in_production:    { bg: "bg-indigo-50",  text: "text-indigo-700", border: "border-indigo-200",icon: Factory,      label: "En production" },
  production:       { bg: "bg-indigo-50",  text: "text-indigo-700", border: "border-indigo-200",icon: Factory,      label: "En production" },
  shipped:          { bg: "bg-purple-50",  text: "text-purple-700", border: "border-purple-200",icon: Truck,        label: "Expédié" },
  delivered:        { bg: "bg-emerald-50", text: "text-emerald-700",border: "border-emerald-200",icon: CheckCircle2, label: "Livré" },
  completed:        { bg: "bg-emerald-50", text: "text-emerald-700",border: "border-emerald-200",icon: CheckCircle2, label: "Terminé" },
  cancelled:        { bg: "bg-red-50",     text: "text-red-600",    border: "border-red-200",   icon: XCircle,      label: "Annulé" },
};

const STATUS_STEPS = ["pending", "confirmed", "production", "shipped", "delivered"];

const ACTIVE_STATUSES = ["pending", "pending_deposit", "deposit_paid", "confirmed", "in_production", "production", "shipped"];
const AWAITING_PAYMENT_STATUSES = ["pending_deposit"];
const DELIVERED_STATUSES = ["delivered", "completed"];
const REORDERABLE_STATUSES = ["delivered", "completed"];

function getStatusCfg(status: string) {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
}

// ── Status badge ─────────────────────────────────────────────────────────────

function OrderStatusBadge({ status }: { status: string }) {
  const cfg = getStatusCfg(status);
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-display font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

// ── Reorder helper ───────────────────────────────────────────────────────────

function useReorder() {
  const { addItem } = useProjectCart();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isReordering, setIsReordering] = useState(false);

  const reorder = useCallback(async (order: ClientOrder) => {
    setIsReordering(true);
    try {
      if (!order.productId) {
        toast.error(t("orders.reorderNoProduct"));
        return;
      }
      const { data: product } = await supabase
        .from("products")
        .select("*")
        .eq("id", order.productId)
        .single();

      if (!product) {
        toast.error(t("orders.reorderNoProduct"));
        return;
      }

      addItem(product as any, undefined, order.quantity);
      toast.success(t("orders.reorderSuccess", { count: 1, ref: orderRef(order.id) }));
      navigate("/project-cart");
    } catch (err) {
      console.error("Reorder error:", err);
      toast.error(t("orders.reorderNoProduct"));
    } finally {
      setIsReordering(false);
    }
  }, [addItem, navigate, t]);

  return { reorder, isReordering };
}

// ── Filter tabs ──────────────────────────────────────────────────────────────

type FilterTab = "all" | "active" | "awaiting" | "delivered";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all",       label: "Tous" },
  { key: "active",    label: "En cours" },
  { key: "awaiting",  label: "En attente" },
  { key: "delivered", label: "Livrées" },
];

function filterOrders(orders: ClientOrder[], tab: FilterTab): ClientOrder[] {
  switch (tab) {
    case "active":
      return orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
    case "awaiting":
      return orders.filter((o) => AWAITING_PAYMENT_STATUSES.includes(o.status));
    case "delivered":
      return orders.filter((o) => DELIVERED_STATUSES.includes(o.status));
    default:
      return orders;
  }
}

// ── Summary stats ────────────────────────────────────────────────────────────

function OrderStats({ orders }: { orders: ClientOrder[] }) {
  const activeCount = orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length;
  const awaitingCount = orders.filter((o) => AWAITING_PAYMENT_STATUSES.includes(o.status)).length;
  const deliveredCount = orders.filter((o) => DELIVERED_STATUSES.includes(o.status)).length;

  const amountPending = orders.reduce((sum, o) => {
    let pending = 0;
    if (!o.depositPaidAt && o.depositAmount != null) pending += o.depositAmount;
    if (!o.balancePaidAt && o.balanceAmount != null) pending += o.balanceAmount;
    return sum + pending;
  }, 0);

  const stats = [
    {
      icon: Package,
      value: String(activeCount),
      label: "En cours",
      color: "text-blue-700",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-100",
    },
    {
      icon: Clock,
      value: String(awaitingCount),
      label: "En attente paiement",
      color: "text-amber-700",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-100",
    },
    {
      icon: Euro,
      value: fmt(amountPending),
      label: "A payer",
      color: "text-rose-700",
      bgColor: "bg-rose-50",
      borderColor: "border-rose-100",
    },
    {
      icon: CheckCircle2,
      value: String(deliveredCount),
      label: "Livrees",
      color: "text-emerald-700",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className={`rounded-xl border ${s.borderColor} ${s.bgColor} p-4 flex flex-col gap-1`}
          >
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${s.color}`} />
              <span className={`text-lg font-display font-bold ${s.color}`}>{s.value}</span>
            </div>
            <span className={`text-[11px] font-display font-medium ${s.color} opacity-80`}>
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Order list view ──────────────────────────────────────────────────────────

function OrderListView({ orders, isLoading, onSelect }: {
  orders: ClientOrder[];
  isLoading: boolean;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { reorder, isReordering } = useReorder();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const filtered = useMemo(() => filterOrders(orders, activeTab), [orders, activeTab]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
          <Package className="h-7 w-7 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-display font-semibold text-muted-foreground mb-1">
          {t("orders.empty")}
        </p>
        <p className="text-xs font-body text-muted-foreground/70 max-w-xs">
          {t("orders.emptyHint")}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display font-bold text-lg text-foreground">
          {t("orders.title")}
        </h2>
        <span className="text-xs font-body text-muted-foreground">
          {orders.length} {t("orders.orderCount", { count: orders.length })}
        </span>
      </div>

      {/* Summary stats */}
      <OrderStats orders={orders} />

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-5 p-1 bg-muted/30 rounded-xl w-fit">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-xs font-display font-semibold rounded-lg transition-all ${
              activeTab === tab.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Order cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-sm font-body text-muted-foreground">
            Aucune commande dans cette categorie.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const cfg = getStatusCfg(order.status);
            const ref = orderRef(order.id);

            return (
              <div
                key={order.id}
                className="border border-border rounded-xl p-5 hover:border-foreground/20 hover:shadow-sm transition-all cursor-pointer group bg-background"
                onClick={() => onSelect(order.id)}
              >
                {/* Top row: ref + status */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                      <Package className={`h-4 w-4 ${cfg.text}`} />
                    </div>
                    <span className="text-sm font-mono font-bold text-foreground">{ref}</span>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>

                {/* Product info */}
                <div className="mb-3 pl-[42px]">
                  <p className="text-sm font-display font-semibold text-foreground">
                    {order.productName} <span className="text-muted-foreground font-normal">x {order.quantity}</span>
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    {order.partnerName && (
                      <span className="text-xs font-body text-muted-foreground">
                        Fournisseur : {order.partnerName}
                      </span>
                    )}
                    <span className="text-xs font-body text-muted-foreground/60">
                      Commande le {fmtDate(order.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Financial summary */}
                <div className="flex items-center gap-4 pl-[42px] mb-3 text-xs">
                  <span className="font-display font-bold text-foreground">
                    Total : {fmt(order.totalPrice)}
                  </span>
                  <span className="flex items-center gap-1">
                    Acompte :
                    {order.depositPaidAt ? (
                      <span className="inline-flex items-center gap-0.5 text-emerald-600 font-semibold">
                        <CheckCircle2 className="h-3 w-3" /> Paye
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-amber-600 font-semibold">
                        <Clock className="h-3 w-3" /> En attente
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    Solde :
                    {order.balancePaidAt ? (
                      <span className="inline-flex items-center gap-0.5 text-emerald-600 font-semibold">
                        <CheckCircle2 className="h-3 w-3" /> Paye
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-amber-600 font-semibold">
                        <Clock className="h-3 w-3" /> En attente
                      </span>
                    )}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pl-[42px]">
                  <button
                    onClick={(e) => { e.stopPropagation(); onSelect(order.id); }}
                    className="inline-flex items-center gap-1.5 text-xs font-display font-semibold text-foreground hover:underline transition-colors"
                  >
                    Voir le detail
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>

                  {REORDERABLE_STATUSES.includes(order.status) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); reorder(order); }}
                      disabled={isReordering}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[10px] font-display font-semibold uppercase tracking-wider bg-foreground text-background rounded-full hover:bg-foreground/90 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3 w-3 ${isReordering ? "animate-spin" : ""}`} />
                      Recommander
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Progress bar (redesigned) ────────────────────────────────────────────────

function OrderProgressBar({ status }: { status: string }) {
  const { t } = useTranslation();
  // Map broader statuses to steps
  const stepMapping: Record<string, string> = {
    pending: "pending",
    pending_deposit: "pending",
    deposit_paid: "confirmed",
    confirmed: "confirmed",
    in_production: "production",
    production: "production",
    shipped: "shipped",
    delivered: "delivered",
    completed: "delivered",
  };
  const mappedStatus = stepMapping[status] ?? "pending";
  const currentIdx = STATUS_STEPS.indexOf(mappedStatus);
  const isCancelled = status === "cancelled";
  const progressPercent = isCancelled ? 0 : Math.round(((currentIdx + 1) / STATUS_STEPS.length) * 100);

  const stepLabels = ["Confirme", "Acompte", "Production", "Expedie", "Livre"];
  const stepNumbers = ["\u2460", "\u2461", "\u2462", "\u2463", "\u2464"];

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-display font-semibold text-foreground">
            {progressPercent}% — {getStatusCfg(status).label}
          </span>
        </div>
        <div className="w-full h-2.5 bg-muted/40 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {STATUS_STEPS.map((step, idx) => {
          const isComplete = !isCancelled && idx <= currentIdx;
          const isCurrent = !isCancelled && idx === currentIdx;

          return (
            <div key={step} className="flex flex-col items-center gap-1.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-display font-bold transition-colors ${
                  isCurrent
                    ? "bg-foreground text-background shadow-md"
                    : isComplete
                      ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-200"
                      : "bg-muted/30 text-muted-foreground/40 border-2 border-border"
                }`}
              >
                {isComplete && !isCurrent ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <span className="text-xs">{stepNumbers[idx]}</span>
                )}
              </div>
              <span className={`text-[9px] font-display font-semibold uppercase tracking-wider text-center whitespace-nowrap ${
                isCurrent ? "text-foreground" : isComplete ? "text-emerald-700" : "text-muted-foreground/40"
              }`}>
                {stepLabels[idx]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Improved Timeline ────────────────────────────────────────────────────────

function EventTimeline({ events }: { events: { id: string; eventType: string; description: string | null; actor: string | null; createdAt: string }[] }) {
  const { t } = useTranslation();

  const colorForType = (type: string) => {
    switch (type) {
      case "created":
      case "order_created":  return { dot: "bg-slate-500",  text: "text-slate-700" };
      case "confirmed":      return { dot: "bg-blue-500",   text: "text-blue-700" };
      case "deposit_confirmed":
      case "payment":        return { dot: "bg-emerald-500",text: "text-emerald-700" };
      case "production":     return { dot: "bg-indigo-500", text: "text-indigo-700" };
      case "shipped":
      case "tracking":       return { dot: "bg-purple-500", text: "text-purple-700" };
      case "delivered":      return { dot: "bg-emerald-500",text: "text-emerald-700" };
      case "cancelled":      return { dot: "bg-red-500",    text: "text-red-600" };
      case "balance_confirmed": return { dot: "bg-emerald-500", text: "text-emerald-700" };
      default:               return { dot: "bg-slate-400",  text: "text-slate-600" };
    }
  };

  const iconForType = (type: string) => {
    switch (type) {
      case "created":
      case "order_created":  return Clock;
      case "confirmed":      return CheckCircle2;
      case "production":     return Factory;
      case "shipped":        return Truck;
      case "delivered":      return CheckCircle2;
      case "cancelled":      return XCircle;
      case "payment":
      case "deposit_confirmed":
      case "balance_confirmed": return CreditCard;
      case "tracking":       return MapPin;
      default:               return CircleDot;
    }
  };

  if (events.length === 0) {
    return (
      <p className="text-xs font-body text-muted-foreground italic">{t("orders.noEvents")}</p>
    );
  }

  return (
    <div className="relative pl-8">
      {/* Vertical line */}
      <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-border via-border to-transparent rounded-full" />

      <div className="space-y-5">
        {events.map((event, idx) => {
          const Icon = iconForType(event.eventType);
          const colors = colorForType(event.eventType);
          const isLast = idx === events.length - 1;
          return (
            <div key={event.id} className="relative flex gap-3.5">
              {/* Dot */}
              <div className={`absolute -left-8 w-[22px] h-[22px] rounded-full flex items-center justify-center ${
                isLast
                  ? `${colors.dot} text-white shadow-md`
                  : "bg-background border-2 border-border text-muted-foreground"
              }`}>
                <Icon className="h-3 w-3" />
              </div>

              <div className="min-w-0 pb-0.5">
                <p className="text-[11px] font-body text-muted-foreground leading-snug">
                  {new Date(event.createdAt).toLocaleString("fr-FR")}
                  {event.actor && <span className="ml-2 text-muted-foreground/50">({event.actor})</span>}
                </p>
                <p className={`text-sm font-body mt-0.5 leading-snug ${isLast ? "font-semibold text-foreground" : "text-foreground/80"}`}>
                  {event.description || t(`orders.eventType.${event.eventType}`, event.eventType)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Copy button ──────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-display font-semibold text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/50 rounded-md transition-colors"
    >
      {copied ? (
        <><Check className="h-3 w-3 text-emerald-600" /> Copie !</>
      ) : (
        <><Copy className="h-3 w-3" /> Copier</>
      )}
    </button>
  );
}

// ── Order detail view ────────────────────────────────────────────────────────

function OrderDetailView({ orderId, onBack }: { orderId: string; onBack: () => void }) {
  const { t } = useTranslation();
  const { order, events, isLoading } = useOrderDetail(orderId);
  const { paymentSettings } = usePaymentFlow();
  const { profile } = useAuth();
  const { reorder, isReordering } = useReorder();
  const [bankTransferOpen, setBankTransferOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-16">
        <p className="text-sm font-body text-muted-foreground">{t("orders.notFound")}</p>
        <button onClick={onBack} className="text-xs font-display font-semibold text-foreground hover:underline mt-2">
          {t("orders.backToOrders")}
        </button>
      </div>
    );
  }

  const ref = orderRef(order.id);
  const isDepositPending = !order.depositPaidAt;
  const isBalancePending = !!order.depositPaidAt && !order.balancePaidAt;
  const isFullyPaid = !!order.depositPaidAt && !!order.balancePaidAt;
  const customerEmail = profile?.email ?? "";
  const showStripeButtons = !!order.paymentReference;
  const showBankTransfer = !!order.paymentReference && (!isFullyPaid);

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-background to-muted/10 p-6">
        {/* Top actions */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-display font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux commandes
          </button>

          {REORDERABLE_STATUSES.includes(order.status) && (
            <button
              onClick={() => reorder(order)}
              disabled={isReordering}
              className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-xl text-xs font-display font-semibold hover:bg-foreground/90 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isReordering ? "animate-spin" : ""}`} />
              Recommander
            </button>
          )}
        </div>

        {/* Order info */}
        <div className="mb-5">
          <p className="text-lg font-mono font-bold text-foreground mb-1">{ref}</p>
          <p className="text-base font-display font-semibold text-foreground">
            {order.productName} <span className="text-muted-foreground font-normal">x {order.quantity}</span>
          </p>
          <p className="text-xs font-body text-muted-foreground mt-1">
            {order.partnerName && <>Fournisseur : {order.partnerName} — </>}
            Commande le {fmtDate(order.createdAt)}
          </p>
        </div>

        {/* Progress */}
        {order.status === "cancelled" ? (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
            <XCircle className="h-5 w-5 text-red-500" />
            <span className="text-sm font-display font-semibold text-red-700">Commande annulee</span>
          </div>
        ) : (
          <OrderProgressBar status={order.status} />
        )}
      </div>

      {/* Financial summary */}
      <div className="rounded-xl border border-border p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <CreditCard className="h-4 w-4 text-emerald-700" />
          </div>
          <h3 className="font-display font-bold text-sm text-foreground">Recapitulatif financier</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Total */}
          <div className="rounded-xl border border-border p-4 bg-background">
            <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Total HT
            </p>
            <p className="text-xl font-display font-bold text-foreground">
              {fmt(order.totalPrice)}
            </p>
          </div>

          {/* Deposit */}
          {order.depositAmount != null && (
            <div className={`rounded-xl border p-4 ${
              order.depositPaidAt
                ? "bg-emerald-50/50 border-emerald-200"
                : "bg-amber-50/50 border-amber-200"
            }`}>
              <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Acompte ({order.depositPercentage ?? 30}%)
              </p>
              <p className="text-xl font-display font-bold text-foreground">
                {fmt(order.depositAmount)}
              </p>
              {order.depositPaidAt ? (
                <p className="text-[11px] font-display font-semibold text-emerald-700 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Paye le {fmtDateShort(order.depositPaidAt)}
                </p>
              ) : (
                <p className="text-[11px] font-display font-semibold text-amber-700 mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {order.depositDueDate ? `Du le ${fmtDateShort(order.depositDueDate)}` : "En attente"}
                </p>
              )}
            </div>
          )}

          {/* Balance */}
          {order.balanceAmount != null && (
            <div className={`rounded-xl border p-4 ${
              order.balancePaidAt
                ? "bg-emerald-50/50 border-emerald-200"
                : "bg-amber-50/50 border-amber-200"
            }`}>
              <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Solde
              </p>
              <p className="text-xl font-display font-bold text-foreground">
                {fmt(order.balanceAmount)}
              </p>
              {order.balancePaidAt ? (
                <p className="text-[11px] font-display font-semibold text-emerald-700 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Paye le {fmtDateShort(order.balancePaidAt)}
                </p>
              ) : (
                <p className="text-[11px] font-display font-semibold text-amber-700 mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {order.balanceDueDate ? `Du le ${fmtDateShort(order.balanceDueDate)}` : "En attente"}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stripe payment buttons */}
      {showStripeButtons && (() => {
        if (isDepositPending && order.depositAmount != null) {
          return (
            <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-5">
              <PayNowButton
                orderId={order.id}
                amount={order.depositAmount}
                customerEmail={customerEmail}
                description={`${t("stripe.payDeposit")} — ${order.productName}`}
                label={t("stripe.payDeposit")}
                isPaid={false}
              />
            </div>
          );
        }

        if (isBalancePending && order.balanceAmount != null) {
          return (
            <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-5">
              <PayNowButton
                orderId={order.id}
                amount={order.balanceAmount}
                customerEmail={customerEmail}
                description={`${t("stripe.payBalance")} — ${order.productName}`}
                label={t("stripe.payBalance")}
                isPaid={false}
              />
            </div>
          );
        }

        if (isFullyPaid) {
          return (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5 space-y-2">
              <PayNowButton
                orderId={order.id}
                amount={order.depositAmount ?? 0}
                customerEmail={customerEmail}
                description=""
                label={t("stripe.payDeposit")}
                isPaid={true}
                paidAt={order.depositPaidAt}
              />
              <PayNowButton
                orderId={order.id}
                amount={order.balanceAmount ?? 0}
                customerEmail={customerEmail}
                description=""
                label={t("stripe.payBalance")}
                isPaid={true}
                paidAt={order.balancePaidAt}
              />
            </div>
          );
        }

        return null;
      })()}

      {/* Bank transfer - collapsible */}
      {showBankTransfer && (() => {
        const amount = isDepositPending
          ? (order.depositAmount ?? order.totalPrice)
          : isBalancePending
            ? (order.balanceAmount ?? order.totalPrice)
            : order.totalPrice;

        const dueDate = isDepositPending
          ? (order.depositDueDate || new Date(Date.now() + 7 * 86400000).toISOString())
          : (order.balanceDueDate || new Date(Date.now() + 30 * 86400000).toISOString());

        const status = isFullyPaid ? "paid" as const : "pending" as const;

        return (
          <div className="rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setBankTransferOpen(!bankTransferOpen)}
              className="flex items-center justify-between w-full px-5 py-3.5 text-left hover:bg-muted/10 transition-colors"
            >
              <span className="text-sm font-display font-semibold text-foreground">
                Payer par virement bancaire
              </span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${bankTransferOpen ? "rotate-180" : ""}`} />
            </button>
            {bankTransferOpen && (
              <div className="px-5 pb-5">
                <PaymentInstructions
                  reference={order.paymentReference!}
                  amount={amount}
                  beneficiary={paymentSettings.beneficiary}
                  iban={paymentSettings.iban}
                  bic={paymentSettings.bic}
                  bankName={paymentSettings.bankName}
                  dueDate={dueDate}
                  status={status}
                />
              </div>
            )}
          </div>
        );
      })()}

      {/* Tracking section — prominent when shipped */}
      {(order.status === "shipped" || order.trackingNumber) && (
        <div className="rounded-xl border-2 border-purple-200 bg-purple-50/30 p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Truck className="h-4 w-4 text-purple-700" />
            </div>
            <h3 className="font-display font-bold text-sm text-foreground">Suivi de livraison</h3>
          </div>

          <div className="space-y-3">
            {order.shippingCarrier && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-body text-muted-foreground">Transporteur</span>
                <span className="text-sm font-display font-semibold text-foreground">{order.shippingCarrier}</span>
              </div>
            )}
            {order.trackingNumber && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-body text-muted-foreground">N° suivi</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-semibold text-foreground">{order.trackingNumber}</span>
                  <CopyBtn text={order.trackingNumber} />
                  {order.trackingUrl && (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-display font-semibold text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-md transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Suivre
                    </a>
                  )}
                </div>
              </div>
            )}
            {order.trackingLastEvent && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-body text-muted-foreground">Dernier evenement</span>
                <span className="text-sm font-body text-foreground">{order.trackingLastEvent}</span>
              </div>
            )}
            {order.estimatedDelivery && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-body text-muted-foreground">Livraison estimee</span>
                <span className="text-sm font-display font-semibold text-foreground">
                  {fmtDate(order.estimatedDelivery)}
                </span>
              </div>
            )}
            {order.trackingLastChecked && (
              <p className="text-[10px] font-body text-muted-foreground/60 pt-1">
                Derniere mise a jour : {new Date(order.trackingLastChecked).toLocaleString("fr-FR")}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Info cards (quantity, unit price, delivery) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border p-4">
          <Package className="h-4 w-4 text-muted-foreground mb-2" />
          <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">Quantite</p>
          <p className="text-lg font-display font-bold text-foreground">{order.quantity}</p>
        </div>
        {order.unitPrice != null && (
          <div className="rounded-xl border border-border p-4">
            <FileText className="h-4 w-4 text-muted-foreground mb-2" />
            <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">Prix unitaire</p>
            <p className="text-lg font-display font-bold text-foreground">{fmt(order.unitPrice)}</p>
          </div>
        )}
        {order.estimatedDelivery && (
          <div className="rounded-xl border border-border p-4">
            <CalendarDays className="h-4 w-4 text-muted-foreground mb-2" />
            <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">Livraison estimee</p>
            <p className="text-lg font-display font-bold text-foreground">{fmtDate(order.estimatedDelivery)}</p>
          </div>
        )}
        {order.invoiceNumber && (
          <div className="rounded-xl border border-border p-4">
            <FileText className="h-4 w-4 text-muted-foreground mb-2" />
            <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">N° facture</p>
            <p className="text-lg font-mono font-bold text-foreground">{order.invoiceNumber}</p>
          </div>
        )}
      </div>

      {/* Event timeline */}
      <div className="rounded-xl border border-border p-5">
        <p className="text-sm font-display font-bold text-foreground mb-4">
          Historique
        </p>
        <EventTimeline events={events} />
      </div>
    </div>
  );
}

// ── Main exported component ──────────────────────────────────────────────────

export default function ClientOrdersSection() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const { orders, isLoading } = useClientOrders();

  if (selectedOrderId) {
    return (
      <OrderDetailView
        orderId={selectedOrderId}
        onBack={() => setSelectedOrderId(null)}
      />
    );
  }

  return (
    <OrderListView
      orders={orders}
      isLoading={isLoading}
      onSelect={setSelectedOrderId}
    />
  );
}
