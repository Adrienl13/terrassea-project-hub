import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Package, Truck, CheckCircle2, Clock,
  Factory, XCircle, ExternalLink, MapPin, CreditCard,
  CalendarDays, FileText, CircleDot, RefreshCw,
} from "lucide-react";
import { useClientOrders, useOrderDetail, type ClientOrder } from "@/hooks/useOrders";
import { usePaymentFlow } from "@/hooks/usePaymentFlow";
import { useAuth } from "@/contexts/AuthContext";
import { useProjectCart } from "@/contexts/ProjectCartContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PaymentInstructions from "@/components/payments/PaymentInstructions";
import PayNowButton from "@/components/payments/PayNowButton";

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: any }> = {
  pending:    { bg: "bg-gray-100",    text: "text-gray-600",    icon: Clock },
  confirmed:  { bg: "bg-blue-50",     text: "text-blue-700",    icon: CheckCircle2 },
  production: { bg: "bg-amber-50",    text: "text-amber-700",   icon: Factory },
  shipped:    { bg: "bg-purple-50",   text: "text-purple-700",  icon: Truck },
  delivered:  { bg: "bg-green-50",    text: "text-green-700",   icon: CheckCircle2 },
  cancelled:  { bg: "bg-red-50",      text: "text-red-600",     icon: XCircle },
};

const STATUS_STEPS = ["pending", "confirmed", "production", "shipped", "delivered"];

function OrderStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[9px] font-display font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
      <Icon className="h-3 w-3" />
      {t(`orders.status.${status}`, status)}
    </span>
  );
}

// ── Reorder helper ─────────────────────────────────────────────────────────────

function useReorder() {
  const { addItem } = useProjectCart();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isReordering, setIsReordering] = useState(false);

  const reorder = useCallback(async (order: ClientOrder) => {
    setIsReordering(true);
    try {
      // Fetch the product from the database
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

      const orderRef = order.id.slice(0, 8).toUpperCase();
      toast.success(t("orders.reorderSuccess", { count: 1, ref: `TRS-${orderRef}` }));
      navigate("/project-cart");
    } finally {
      setIsReordering(false);
    }
  }, [addItem, navigate, t]);

  return { reorder, isReordering };
}

const REORDERABLE_STATUSES = ["delivered", "completed"];

// ── Order list view ────────────────────────────────────────────────────────────

function OrderListView({ orders, isLoading, onSelect }: {
  orders: ClientOrder[];
  isLoading: boolean;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { reorder, isReordering } = useReorder();

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
        <Package className="h-8 w-8 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-body text-muted-foreground mb-1">{t("orders.empty")}</p>
        <p className="text-xs font-body text-muted-foreground/70">{t("orders.emptyHint")}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-base text-foreground">{t("orders.title")}</h2>
        <span className="text-[10px] font-body text-muted-foreground">
          {orders.length} {t("orders.orderCount", { count: orders.length })}
        </span>
      </div>

      <div className="space-y-2">
        {orders.map((order) => (
          <div
            key={order.id}
            onClick={() => onSelect(order.id)}
            className="flex items-center justify-between px-4 py-3 border border-border rounded-lg hover:border-foreground/20 transition-colors cursor-pointer group"
          >
            <div className="flex-1 min-w-0 mr-4">
              <p className="text-xs font-display font-semibold text-foreground truncate">
                {order.productName}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {order.partnerName && (
                  <span className="text-[10px] font-body text-muted-foreground">{order.partnerName}</span>
                )}
                <span className="text-[10px] font-body text-muted-foreground/50">
                  {new Date(order.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-display font-semibold text-foreground whitespace-nowrap">
                {order.totalPrice.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
              </span>
              <OrderStatusBadge status={order.status} />
              {REORDERABLE_STATUSES.includes(order.status) && (
                <button
                  onClick={(e) => { e.stopPropagation(); reorder(order); }}
                  disabled={isReordering}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-display font-semibold uppercase tracking-wider bg-foreground text-background rounded-full hover:bg-foreground/90 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${isReordering ? "animate-spin" : ""}`} />
                  {t("orders.reorder")}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────────────

function OrderProgressBar({ status }: { status: string }) {
  const { t } = useTranslation();
  const currentIdx = STATUS_STEPS.indexOf(status);
  const isCancelled = status === "cancelled";

  return (
    <div className="flex items-center gap-0 w-full">
      {STATUS_STEPS.map((step, idx) => {
        const isComplete = !isCancelled && idx <= currentIdx;
        const isCurrent = !isCancelled && idx === currentIdx;
        const cfg = STATUS_CONFIG[step];
        const Icon = cfg.icon;

        return (
          <div key={step} className="flex items-center flex-1 last:flex-initial">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                  isCurrent
                    ? `${cfg.bg} ${cfg.text} border-current`
                    : isComplete
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-muted/30 text-muted-foreground/40 border-border"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span className={`text-[8px] font-display font-semibold uppercase tracking-wider mt-1.5 text-center whitespace-nowrap ${
                isCurrent ? cfg.text : isComplete ? "text-green-700" : "text-muted-foreground/40"
              }`}>
                {t(`orders.status.${step}`, step)}
              </span>
            </div>
            {idx < STATUS_STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1.5 rounded-full mt-[-16px] ${
                  !isCancelled && idx < currentIdx ? "bg-green-300" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Timeline ───────────────────────────────────────────────────────────────────

function EventTimeline({ events }: { events: { id: string; eventType: string; description: string | null; actor: string | null; createdAt: string }[] }) {
  const { t } = useTranslation();

  const iconForType = (type: string) => {
    switch (type) {
      case "created":     return Clock;
      case "confirmed":   return CheckCircle2;
      case "production":  return Factory;
      case "shipped":     return Truck;
      case "delivered":   return CheckCircle2;
      case "cancelled":   return XCircle;
      case "payment":     return CreditCard;
      case "tracking":    return MapPin;
      default:            return CircleDot;
    }
  };

  if (events.length === 0) {
    return (
      <p className="text-xs font-body text-muted-foreground italic">{t("orders.noEvents")}</p>
    );
  }

  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />

      <div className="space-y-4">
        {events.map((event, idx) => {
          const Icon = iconForType(event.eventType);
          const isLast = idx === events.length - 1;
          return (
            <div key={event.id} className="relative flex gap-3">
              {/* Dot */}
              <div className={`absolute -left-6 w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 ${
                isLast
                  ? "bg-foreground border-foreground text-primary-foreground"
                  : "bg-background border-border text-muted-foreground"
              }`}>
                <Icon className="h-2.5 w-2.5" />
              </div>

              <div className="min-w-0 pb-1">
                <p className="text-[10px] font-body text-muted-foreground">
                  {new Date(event.createdAt).toLocaleString()}
                  {event.actor && <span className="ml-1.5 text-muted-foreground/60">({event.actor})</span>}
                </p>
                <p className={`text-xs font-body mt-0.5 ${isLast ? "font-semibold text-foreground" : "text-foreground/80"}`}>
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

// ── Order detail view ──────────────────────────────────────────────────────────

function OrderDetailView({ orderId, onBack }: { orderId: string; onBack: () => void }) {
  const { t } = useTranslation();
  const { order, events, isLoading } = useOrderDetail(orderId);
  const { paymentSettings } = usePaymentFlow();
  const { profile } = useAuth();
  const { reorder, isReordering } = useReorder();

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

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-body text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("orders.backToOrders")}
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display font-bold text-lg text-foreground">{order.productName}</h2>
          <div className="flex items-center gap-3 mt-1">
            {order.partnerName && (
              <span className="text-xs font-body text-muted-foreground">{order.partnerName}</span>
            )}
            <span className="text-[10px] font-body text-muted-foreground/60">
              {t("orders.orderedOn")} {new Date(order.createdAt).toLocaleDateString()}
            </span>
            <span className="text-[10px] font-body text-muted-foreground/40">
              {order.id.slice(0, 8)}...
            </span>
          </div>
        </div>
        {REORDERABLE_STATUSES.includes(order.status) && (
          <button
            onClick={() => reorder(order)}
            disabled={isReordering}
            className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-sm text-xs font-display font-semibold hover:bg-foreground/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isReordering ? "animate-spin" : ""}`} />
            {t("orders.reorder")}
          </button>
        )}
      </div>

      {/* Status progress */}
      <div className="border border-border rounded-lg p-5">
        <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          {t("orders.orderProgress")}
        </p>
        {order.status === "cancelled" ? (
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <span className="text-sm font-display font-semibold text-red-600">{t("orders.status.cancelled")}</span>
          </div>
        ) : (
          <OrderProgressBar status={order.status} />
        )}
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="border border-border rounded-lg p-3">
          <Package className="h-4 w-4 text-muted-foreground mb-1.5" />
          <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t("orders.quantity")}</p>
          <p className="text-sm font-display font-bold text-foreground">{order.quantity}</p>
        </div>
        <div className="border border-border rounded-lg p-3">
          <CreditCard className="h-4 w-4 text-muted-foreground mb-1.5" />
          <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t("orders.totalAmount")}</p>
          <p className="text-sm font-display font-bold text-foreground">
            {order.totalPrice.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
          </p>
        </div>
        {order.unitPrice && (
          <div className="border border-border rounded-lg p-3">
            <FileText className="h-4 w-4 text-muted-foreground mb-1.5" />
            <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t("orders.unitPrice")}</p>
            <p className="text-sm font-display font-bold text-foreground">
              {order.unitPrice.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
            </p>
          </div>
        )}
        {order.estimatedDelivery && (
          <div className="border border-border rounded-lg p-3">
            <CalendarDays className="h-4 w-4 text-muted-foreground mb-1.5" />
            <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t("orders.estimatedDelivery")}</p>
            <p className="text-sm font-display font-bold text-foreground">
              {new Date(order.estimatedDelivery).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      {/* Tracking section */}
      {(order.status === "shipped" || order.trackingNumber) && (
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="h-4 w-4 text-purple-600" />
            <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
              {t("orders.trackingInfo")}
            </p>
          </div>

          <div className="space-y-2">
            {order.shippingCarrier && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-body text-muted-foreground">{t("orders.carrier")}</span>
                <span className="text-xs font-display font-semibold text-foreground">{order.shippingCarrier}</span>
              </div>
            )}
            {order.trackingNumber && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-body text-muted-foreground">{t("orders.trackingNumber")}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-semibold text-foreground">{order.trackingNumber}</span>
                  {order.trackingUrl && (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:text-purple-700 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            )}
            {order.trackingLastEvent && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-body text-muted-foreground">{t("orders.lastEvent")}</span>
                <span className="text-xs font-body text-foreground">{order.trackingLastEvent}</span>
              </div>
            )}
            {order.trackingLastChecked && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-body text-muted-foreground">{t("orders.lastChecked")}</span>
                <span className="text-[10px] font-body text-muted-foreground/60">
                  {new Date(order.trackingLastChecked).toLocaleString()}
                </span>
              </div>
            )}
            {order.estimatedDelivery && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-body text-muted-foreground">{t("orders.estimatedDelivery")}</span>
                <span className="text-xs font-display font-semibold text-foreground">
                  {new Date(order.estimatedDelivery).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment section */}
      <div className="border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="h-4 w-4 text-emerald-600" />
          <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
            {t("orders.paymentInfo")}
          </p>
        </div>

        <div className="space-y-2">
          {order.depositAmount != null && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-body text-muted-foreground">{t("orders.deposit")}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-display font-semibold text-foreground">
                  {order.depositAmount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                </span>
                {order.depositPaidAt ? (
                  <span className="text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                    {t("orders.paid")} {new Date(order.depositPaidAt).toLocaleDateString()}
                  </span>
                ) : (
                  <span className="text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                    {t("orders.pending")}
                  </span>
                )}
              </div>
            </div>
          )}
          {order.balanceAmount != null && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-body text-muted-foreground">{t("orders.balance")}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-display font-semibold text-foreground">
                  {order.balanceAmount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                </span>
                {order.balancePaidAt ? (
                  <span className="text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                    {t("orders.paid")} {new Date(order.balancePaidAt).toLocaleDateString()}
                  </span>
                ) : order.balanceDueDate ? (
                  <span className="text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                    {t("orders.dueBy")} {new Date(order.balanceDueDate).toLocaleDateString()}
                  </span>
                ) : (
                  <span className="text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {t("orders.pending")}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stripe payment buttons */}
      {order.paymentReference && (() => {
        const isDepositPending = !order.depositPaidAt;
        const isBalancePending = !!order.depositPaidAt && !order.balancePaidAt;
        const customerEmail = profile?.email ?? "";

        if (isDepositPending && order.depositAmount != null) {
          return (
            <div className="border border-border rounded-lg p-4">
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
            <div className="border border-border rounded-lg p-4">
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

        // Both paid
        if (order.depositPaidAt && order.balancePaidAt) {
          return (
            <div className="border border-border rounded-lg p-4 space-y-2">
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

      {/* OR separator when Stripe + bank transfer both shown */}
      {order.paymentReference && (!order.depositPaidAt || (!!order.depositPaidAt && !order.balancePaidAt)) && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
            {t("stripe.orBankTransfer")}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}

      {/* Bank transfer instructions */}
      {order.paymentReference && (() => {
        // Determine which payment step we're on
        const isDepositPending = !order.depositPaidAt;
        const isBalancePending = !!order.depositPaidAt && !order.balancePaidAt;
        const isFullyPaid = !!order.depositPaidAt && !!order.balancePaidAt;

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
          <PaymentInstructions
            reference={order.paymentReference}
            amount={amount}
            beneficiary={paymentSettings.beneficiary}
            iban={paymentSettings.iban}
            bic={paymentSettings.bic}
            bankName={paymentSettings.bankName}
            dueDate={dueDate}
            status={status}
          />
        );
      })()}

      {/* Event timeline */}
      <div className="border border-border rounded-lg p-4">
        <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          {t("orders.timeline")}
        </p>
        <EventTimeline events={events} />
      </div>
    </div>
  );
}

// ── Main exported component ────────────────────────────────────────────────────

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
