// ============================================================================
// PartnerOrdersSection — partner-side order management (Dette 33).
//
// Closes the catalogue → quote → ORDER → delivery loop for partners.
// Top BLOQUANT identified by USER_TOOLS_AUDIT (commit 06a9150).
//
// Sections :
//   1. List header with status filter
//   2. List of orders (cards with key info + open detail button)
//   3. Detail Sheet drawer with 5 sub-sections :
//      - Identity (read-only)
//      - Status workflow (transition button)
//      - Tracking (form for number / URL / carrier)
//      - Communication (link to messages)
//      - History (order_events timeline)
//   4. Empty state
//
// Design language : ADMIN_DESIGN_LANGUAGE.md (commit 2c61572). Cards use
// `border-border rounded-xl p-5 space-y-4`, font-display headers, eyebrow
// labels in `text-[10px] uppercase tracking-wider`, inline status badges.
// ============================================================================

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  MessageSquare,
  Calendar,
  Hash,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  usePartnerOrders,
  useOrderEvents,
  type PartnerOrderRow,
} from "@/hooks/usePartnerOrders";

// ── Status display config ────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; icon: typeof Clock }
> = {
  pending_deposit:  { label: "Acompte en attente",  color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200",  icon: Clock },
  deposit_paid:     { label: "Acompte reçu",        color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200",   icon: Package },
  in_production:    { label: "En production",       color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", icon: Package },
  shipped:          { label: "Expédié",             color: "text-cyan-700",   bg: "bg-cyan-50",   border: "border-cyan-200",   icon: Truck },
  delivered:        { label: "Livré",               color: "text-green-700",  bg: "bg-green-50",  border: "border-green-200",  icon: CheckCircle2 },
  completed:        { label: "Terminée",            color: "text-green-700",  bg: "bg-green-50",  border: "border-green-200",  icon: CheckCircle2 },
  cancelled:        { label: "Annulée",             color: "text-gray-700",   bg: "bg-gray-50",   border: "border-gray-200",   icon: AlertCircle },
  disputed:         { label: "Litige",              color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200",    icon: AlertCircle },
  refunded:         { label: "Remboursée",          color: "text-gray-700",   bg: "bg-gray-50",   border: "border-gray-200",   icon: AlertCircle },
};

const STATUS_FILTERS: { id: string; label: string }[] = [
  { id: "all",            label: "Toutes" },
  { id: "deposit_paid",   label: "Acompte reçu" },
  { id: "in_production",  label: "En production" },
  { id: "shipped",        label: "Expédiées" },
  { id: "delivered",      label: "Livrées" },
];

const FR_DATE = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
const FR_CURRENCY = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    color: "text-muted-foreground",
    bg: "bg-muted",
    border: "border-border",
    icon: Clock,
  };
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-display font-semibold ${cfg.bg} ${cfg.color} ${cfg.border}`}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

// ── Main section ─────────────────────────────────────────────────────────────

export default function PartnerOrdersSection() {
  const { orders, isLoading, updateOrder, notifyClient } = usePartnerOrders();
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: orders.length };
    for (const f of STATUS_FILTERS) {
      if (f.id !== "all") {
        result[f.id] = orders.filter((o) => o.status === f.id).length;
      }
    }
    return result;
  }, [orders]);

  const filteredOrders = useMemo(
    () => (filter === "all" ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter],
  );

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedId) ?? null,
    [orders, selectedId],
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
            Commandes
          </h2>
          <p className="font-body text-xs text-muted-foreground mt-0.5">
            {orders.length} commande{orders.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-display font-semibold rounded-full transition-all ${
              filter === f.id
                ? "bg-foreground text-primary-foreground"
                : "border border-border text-muted-foreground hover:border-foreground/30"
            }`}
          >
            {f.label}
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                filter === f.id ? "bg-white/20" : "bg-card"
              }`}
            >
              {counts[f.id] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {filteredOrders.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="space-y-2">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onOpen={() => setSelectedId(order.id)}
            />
          ))}
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedOrder && (
            <OrderDetail
              order={selectedOrder}
              onUpdate={(input) =>
                updateOrder.mutateAsync({ orderId: selectedOrder.id, ...input })
              }
              onNotifyClient={(input) =>
                notifyClient.mutateAsync({ orderId: selectedOrder.id, ...input })
              }
              isUpdating={updateOrder.isPending}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ── List card ────────────────────────────────────────────────────────────────

function OrderCard({
  order,
  onOpen,
}: {
  order: PartnerOrderRow;
  onOpen: () => void;
}) {
  const shortId = order.id.slice(0, 8).toUpperCase();
  return (
    <button
      onClick={onOpen}
      className="w-full text-left border border-border rounded-xl p-4 bg-background hover:border-foreground/30 transition-colors"
    >
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-display text-sm font-bold text-foreground">
              {order.product_name}
            </span>
            <StatusBadge status={order.status} />
          </div>
          <div className="flex items-center gap-3 text-xs font-body text-muted-foreground flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Hash className="h-3 w-3" /> #{shortId}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {FR_DATE.format(new Date(order.created_at))}
            </span>
            <span>Quantité : {order.quantity}</span>
            <span className="font-semibold text-foreground">
              {FR_CURRENCY.format(Number(order.total_amount))}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </button>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ filter }: { filter: string }) {
  return (
    <div className="border border-dashed border-border rounded-xl p-12 text-center space-y-3">
      <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center">
        <Inbox className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="font-display text-sm font-bold text-foreground">
          {filter === "all" ? "Pas encore de commandes" : "Aucune commande dans ce filtre"}
        </p>
        <p className="font-body text-xs text-muted-foreground mt-1">
          {filter === "all"
            ? "Les commandes apparaîtront ici dès qu'un client signe un devis."
            : "Essayez un autre filtre."}
        </p>
      </div>
    </div>
  );
}

// ── Detail drawer ────────────────────────────────────────────────────────────

interface DetailProps {
  order: PartnerOrderRow;
  onUpdate: (input: {
    status?: string | null;
    tracking_number?: string | null;
    tracking_url?: string | null;
    shipping_carrier?: string | null;
  }) => Promise<unknown>;
  onNotifyClient: (input: {
    type: string;
    title: string;
    body?: string | null;
    link?: string | null;
  }) => Promise<unknown>;
  isUpdating: boolean;
}

function OrderDetail({ order, onUpdate, onNotifyClient, isUpdating }: DetailProps) {
  const navigate = useNavigate();
  const { data: events = [] } = useOrderEvents(order.id);
  const shortId = order.id.slice(0, 8).toUpperCase();

  // Local state for tracking form
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number ?? "");
  const [trackingUrl, setTrackingUrl] = useState(order.tracking_url ?? "");
  const [shippingCarrier, setShippingCarrier] = useState(order.shipping_carrier ?? "");

  const trackingDirty =
    trackingNumber !== (order.tracking_number ?? "") ||
    trackingUrl !== (order.tracking_url ?? "") ||
    shippingCarrier !== (order.shipping_carrier ?? "");

  // Determine which transition is allowed next (per RPC validation rules)
  const nextTransition: { status: string; label: string } | null = useMemo(() => {
    if (order.status === "deposit_paid") return { status: "in_production", label: "Démarrer la production" };
    if (order.status === "in_production") return { status: "shipped", label: "Marquer comme expédiée" };
    if (order.status === "shipped") return { status: "delivered", label: "Confirmer la livraison" };
    return null;
  }, [order.status]);

  const handleStatusUpdate = async () => {
    if (!nextTransition) return;
    if (nextTransition.status === "shipped" && !trackingNumber.trim()) {
      toast.error("Le numéro de tracking est requis pour expédier la commande.");
      return;
    }
    try {
      await onUpdate({
        status: nextTransition.status,
        tracking_number: trackingDirty ? trackingNumber.trim() || null : null,
        tracking_url: trackingDirty ? trackingUrl.trim() || null : null,
        shipping_carrier: trackingDirty ? shippingCarrier.trim() || null : null,
      });
      toast.success(`Commande ${nextTransition.label.toLowerCase()}`);

      // Notify client of the status change (best-effort)
      try {
        await onNotifyClient({
          type: "order_update",
          title: STATUS_CONFIG[nextTransition.status]?.label ?? nextTransition.status,
          body: `Commande #${shortId} — ${order.product_name}`,
          link: `/account?tab=orders`,
        });
      } catch {
        // Non-blocking
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Erreur lors de la mise à jour");
    }
  };

  const handleTrackingSave = async () => {
    try {
      await onUpdate({
        tracking_number: trackingNumber.trim() || null,
        tracking_url: trackingUrl.trim() || null,
        shipping_carrier: shippingCarrier.trim() || null,
      });
      toast.success("Tracking mis à jour");
    } catch (err: any) {
      toast.error(err?.message ?? "Erreur lors de la mise à jour");
    }
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle className="font-display flex items-center gap-2 flex-wrap">
          Commande #{shortId}
          <StatusBadge status={order.status} />
        </SheetTitle>
        <SheetDescription className="font-body text-xs">
          {order.product_name} · {FR_CURRENCY.format(Number(order.total_amount))}
        </SheetDescription>
      </SheetHeader>

      <div className="py-6 space-y-5">
        {/* Identity (read-only) */}
        <div className="border border-border rounded-xl p-5 space-y-3">
          <h3 className="font-display text-sm font-bold text-foreground">Identité</h3>
          <div className="grid grid-cols-2 gap-3 text-xs font-body">
            <Field label="Date" value={FR_DATE.format(new Date(order.created_at))} />
            <Field label="Quantité" value={String(order.quantity)} />
            <Field label="Client" value={order.client_email} />
            <Field
              label="Prix unitaire"
              value={
                order.unit_price != null
                  ? FR_CURRENCY.format(Number(order.unit_price))
                  : "—"
              }
            />
            <Field
              label="Acompte payé"
              value={
                order.deposit_paid_at
                  ? FR_DATE.format(new Date(order.deposit_paid_at))
                  : "Pas encore"
              }
            />
            <Field
              label="N° facture"
              value={order.invoice_number || "—"}
            />
          </div>
        </div>

        {/* Status workflow */}
        <div className="border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-display text-sm font-bold text-foreground">Workflow</h3>
          {nextTransition ? (
            <Button
              onClick={handleStatusUpdate}
              disabled={isUpdating}
              className="w-full"
            >
              {isUpdating ? "Mise à jour…" : nextTransition.label}
            </Button>
          ) : (
            <p className="font-body text-xs text-muted-foreground">
              Aucune action possible à ce stade ({STATUS_CONFIG[order.status]?.label ?? order.status}).
            </p>
          )}
          {order.status === "in_production" && (
            <p className="font-body text-[11px] text-muted-foreground">
              Renseignez le numéro de tracking ci-dessous avant d'expédier.
            </p>
          )}
        </div>

        {/* Tracking */}
        <div className="border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-display text-sm font-bold text-foreground">Tracking</h3>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="tracking_number" className="font-display text-xs font-semibold">
                Numéro de tracking
              </Label>
              <Input
                id="tracking_number"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Ex : 1Z999AA1234567890"
                className="font-body"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shipping_carrier" className="font-display text-xs font-semibold">
                Transporteur
              </Label>
              <Input
                id="shipping_carrier"
                value={shippingCarrier}
                onChange={(e) => setShippingCarrier(e.target.value)}
                placeholder="DHL, UPS, Colissimo, …"
                className="font-body"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tracking_url" className="font-display text-xs font-semibold">
                URL de suivi
              </Label>
              <Input
                id="tracking_url"
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                placeholder="https://…"
                className="font-body"
              />
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTrackingSave}
            disabled={!trackingDirty || isUpdating}
          >
            Enregistrer le tracking
          </Button>
        </div>

        {/* Communication */}
        <div className="border border-border rounded-xl p-5 space-y-3">
          <h3 className="font-display text-sm font-bold text-foreground">Communication</h3>
          <p className="font-body text-xs text-muted-foreground">
            Échangez avec le client via la messagerie.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/account?tab=messages")}
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            Ouvrir la messagerie
          </Button>
        </div>

        {/* History */}
        <div className="border border-border rounded-xl p-5 space-y-3">
          <h3 className="font-display text-sm font-bold text-foreground">Historique</h3>
          {events.length === 0 ? (
            <p className="font-body text-xs text-muted-foreground">
              Aucun événement enregistré.
            </p>
          ) : (
            <ul className="space-y-2">
              {events.map((evt) => (
                <li key={evt.id} className="border-l-2 border-border pl-3 py-1">
                  <p className="font-display text-xs font-semibold text-foreground">
                    {evt.event_type}
                  </p>
                  {evt.description && (
                    <p className="font-body text-[11px] text-muted-foreground mt-0.5">
                      {evt.description}
                    </p>
                  )}
                  <p className="font-body text-[10px] text-muted-foreground mt-0.5">
                    {FR_DATE.format(new Date(evt.created_at))}
                    {evt.actor && ` · ${evt.actor}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-display font-semibold">
        {label}
      </p>
      <p className="text-foreground mt-0.5">{value}</p>
    </div>
  );
}
