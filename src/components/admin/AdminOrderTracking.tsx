import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Search, ArrowLeft, FileText, Clock, CheckCircle2, XCircle,
  Package, Building2, CreditCard, Truck, User, MapPin,
  ChevronRight, AlertTriangle, Ban, RefreshCw, ArrowDown,
  ArrowUp, Banknote, ClipboardCheck, Factory, ShieldCheck,
  Radio, Loader2,
} from "lucide-react";
import { isAutoTrackingEnabled, refreshOrderTracking, refreshAllShippedOrders } from "@/lib/trackingService";

// ── Status config ──────────────────────────────────────────────────────────────

const ORDER_STATUS: Record<string, { label: string; color: string; bg: string; icon: any; step: number }> = {
  pending_deposit:  { label: "Acompte en attente",  color: "#D97706", bg: "#FFFBEB", icon: Clock,          step: 0 },
  deposit_paid:     { label: "Acompte reçu",        color: "#2563EB", bg: "#EFF6FF", icon: CreditCard,     step: 1 },
  in_production:    { label: "En production",        color: "#7C3AED", bg: "#F5F3FF", icon: Factory,        step: 2 },
  shipped:          { label: "Expédié",              color: "#0891B2", bg: "#ECFEFF", icon: Truck,           step: 3 },
  delivered:        { label: "Livré",                color: "#059669", bg: "#ECFDF5", icon: CheckCircle2,    step: 4 },
  completed:        { label: "Terminée",             color: "#059669", bg: "#ECFDF5", icon: ShieldCheck,     step: 5 },
  disputed:         { label: "Litige",               color: "#DC2626", bg: "#FEF2F2", icon: AlertTriangle,   step: -1 },
  cancelled:        { label: "Annulée",              color: "#6B7280", bg: "#F3F4F6", icon: Ban,             step: -1 },
  refunded:         { label: "Remboursée",           color: "#6B7280", bg: "#F3F4F6", icon: RefreshCw,       step: -1 },
};

const STEP_ORDER = ["pending_deposit", "deposit_paid", "in_production", "shipped", "delivered", "completed"];

function countryFlag(code: string | null): string {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(...code.toUpperCase().split("").map(c => 0x1f1e6 + c.charCodeAt(0) - 65));
}

// ══════════════════════════════════════════════════════════════════════════════

export default function AdminOrderTracking() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, partner:partner_id(name, country_code, slug)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ["admin-order-events", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data } = await supabase
        .from("order_events")
        .select("*")
        .eq("order_id", selectedId)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const counts: Record<string, number> = { all: orders.length };
  Object.keys(ORDER_STATUS).forEach(s => { counts[s] = orders.filter((o: any) => o.status === s).length; });

  const filtered = orders.filter((o: any) => {
    const matchStatus = filter === "all" || o.status === filter;
    const matchSearch = !search ||
      (o.product_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.client_email || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.partner?.name || "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const selected = selectedId ? orders.find((o: any) => o.id === selectedId) : null;

  const updateOrder = async (id: string, updates: Record<string, any>, eventType: string, eventDesc: string) => {
    const { error } = await supabase.from("orders").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error("Erreur : " + error.message); return; }
    // Log event
    await supabase.from("order_events").insert({ order_id: id, event_type: eventType, description: eventDesc, actor: "admin" });
    toast.success(eventDesc);
    queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    queryClient.invalidateQueries({ queryKey: ["admin-order-events", id] });
  };

  // ── Detail ──
  if (selected) {
    const sc = ORDER_STATUS[selected.status] || ORDER_STATUS.pending_deposit;
    const currentStep = sc.step;

    return (
      <div className="space-y-5">
        <button onClick={() => setSelectedId(null)} className="flex items-center gap-1.5 text-xs font-body text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>

        {/* Header */}
        <div className="border border-border rounded-xl p-5 bg-card">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display font-bold text-lg">{selected.product_name}</h2>
              <p className="text-xs font-body text-muted-foreground">{selected.client_email} · {selected.quantity} pcs</p>
            </div>
            <span className="text-[10px] font-display font-semibold uppercase px-3 py-1.5 rounded-full" style={{ background: sc.bg, color: sc.color }}>
              <sc.icon className="h-3 w-3 inline mr-1" /> {sc.label}
            </span>
          </div>
        </div>

        {/* Progress stepper */}
        {currentStep >= 0 && (
          <div className="flex items-center gap-0">
            {STEP_ORDER.map((step, i) => {
              const cfg = ORDER_STATUS[step];
              const done = i <= currentStep;
              const active = i === currentStep;
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs mb-1 ${
                      done ? "text-white" : "bg-gray-100 text-gray-400"
                    }`} style={done ? { background: cfg.color } : undefined}>
                      {done ? <cfg.icon className="h-4 w-4" /> : i + 1}
                    </div>
                    <span className={`text-[8px] font-display text-center leading-tight ${active ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                      {cfg.label}
                    </span>
                  </div>
                  {i < STEP_ORDER.length - 1 && <div className={`h-0.5 w-full -mt-5 ${i < currentStep ? "bg-emerald-400" : "bg-gray-200"}`} />}
                </div>
              );
            })}
          </div>
        )}

        {/* Action buttons based on current status */}
        <div className="border border-border rounded-xl p-4">
          <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-3">Actions</p>
          <div className="flex gap-2 flex-wrap">
            {selected.status === "pending_deposit" && (
              <ActionBtn label="Marquer acompte reçu" icon={CreditCard} color="#2563EB"
                onClick={() => updateOrder(selected.id, { status: "deposit_paid", deposit_paid_at: new Date().toISOString() }, "deposit_paid", "Acompte reçu")} />
            )}
            {selected.status === "deposit_paid" && (
              <ActionBtn label="Production lancée" icon={Factory} color="#7C3AED"
                onClick={() => updateOrder(selected.id, { status: "in_production", production_confirmed_at: new Date().toISOString() }, "production_started", "Production confirmée par le fournisseur")} />
            )}
            {selected.status === "in_production" && (
              <ActionBtn label="Marquer expédié" icon={Truck} color="#0891B2"
                onClick={() => updateOrder(selected.id, { status: "shipped", shipped_at: new Date().toISOString() }, "shipped", "Commande expédiée")} />
            )}
            {selected.status === "shipped" && (
              <ActionBtn label="Confirmer livraison" icon={CheckCircle2} color="#059669"
                onClick={() => updateOrder(selected.id, {
                  status: "delivered",
                  delivered_at: new Date().toISOString(),
                  delivery_confirmed_by: "admin",
                  balance_due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
                }, "delivered", "Livraison confirmée — solde dû sous 7 jours")} />
            )}
            {selected.status === "delivered" && (
              <ActionBtn label="Solde reçu — Clôturer" icon={ShieldCheck} color="#059669"
                onClick={() => updateOrder(selected.id, { status: "completed", balance_paid_at: new Date().toISOString() }, "completed", "Solde reçu, commande clôturée")} />
            )}
            {!["completed", "cancelled", "refunded"].includes(selected.status) && (
              <>
                <ActionBtn label="Litige" icon={AlertTriangle} color="#DC2626"
                  onClick={() => {
                    const reason = prompt("Raison du litige :");
                    if (reason) updateOrder(selected.id, { status: "disputed", dispute_reason: reason }, "disputed", `Litige ouvert : ${reason}`);
                  }} />
                <ActionBtn label="Annuler" icon={Ban} color="#6B7280"
                  onClick={() => updateOrder(selected.id, { status: "cancelled" }, "cancelled", "Commande annulée par l'admin")} />
              </>
            )}
            {selected.status === "disputed" && (
              <ActionBtn label="Résoudre le litige" icon={CheckCircle2} color="#059669"
                onClick={() => updateOrder(selected.id, { status: "delivered", dispute_resolved_at: new Date().toISOString(), dispute_reason: null }, "admin_action", "Litige résolu")} />
            )}
          </div>
        </div>

        {/* Financial summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <FinCard label="Total commande" value={`€${Number(selected.total_amount || 0).toLocaleString()}`} icon={CreditCard} />
          <FinCard label={`Acompte (${selected.deposit_percent}%)`} value={`€${Number(selected.deposit_amount || 0).toLocaleString()}`} icon={ArrowDown}
            sub={selected.deposit_paid_at ? `Reçu le ${new Date(selected.deposit_paid_at).toLocaleDateString("fr-FR")}` : "En attente"} />
          <FinCard label="Solde" value={`€${Number(selected.balance_amount || 0).toLocaleString()}`} icon={ArrowUp}
            sub={selected.balance_paid_at ? `Reçu le ${new Date(selected.balance_paid_at).toLocaleDateString("fr-FR")}` : selected.balance_due_date ? `Dû avant le ${new Date(selected.balance_due_date).toLocaleDateString("fr-FR")}` : "Après livraison"} />
          <FinCard label={`Commission (${selected.commission_rate}%)`} value={`€${Number(selected.commission_amount || 0).toLocaleString()}`} icon={Banknote} highlight />
        </div>

        {/* Tracking info */}
        {(selected.tracking_number || selected.status === "shipped" || selected.status === "delivered") && (
          <TrackingPanel order={selected} onUpdate={updateOrder} queryClient={queryClient} />
        )}

        {/* Supplier payout */}
        <div className="border border-border rounded-xl p-4">
          <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> Versement fournisseur
          </p>
          <div className="grid grid-cols-2 gap-3 text-xs font-body">
            <div className="border border-border rounded-lg p-3">
              <p className="text-[9px] font-display font-semibold uppercase text-muted-foreground">Payout acompte</p>
              <p className="text-sm font-display font-bold mt-0.5">
                {selected.supplier_payout_deposit ? `€${Number(selected.supplier_payout_deposit).toLocaleString()}` : "—"}
              </p>
              {!selected.supplier_payout_deposit && selected.deposit_paid_at && (
                <button
                  onClick={() => {
                    const net = Number(selected.deposit_amount) - Number(selected.commission_amount) * (Number(selected.deposit_percent) / 100);
                    updateOrder(selected.id, { supplier_payout_deposit: net.toFixed(2), supplier_payout_deposit_at: new Date().toISOString() }, "supplier_payout", `Versement acompte fournisseur : €${net.toFixed(2)}`);
                  }}
                  className="mt-2 text-[10px] font-display font-semibold text-[#D4603A] hover:underline"
                >
                  Verser au fournisseur
                </button>
              )}
            </div>
            <div className="border border-border rounded-lg p-3">
              <p className="text-[9px] font-display font-semibold uppercase text-muted-foreground">Payout solde</p>
              <p className="text-sm font-display font-bold mt-0.5">
                {selected.supplier_payout_balance ? `€${Number(selected.supplier_payout_balance).toLocaleString()}` : "—"}
              </p>
              {!selected.supplier_payout_balance && selected.balance_paid_at && (
                <button
                  onClick={() => {
                    const net = Number(selected.balance_amount) - Number(selected.commission_amount) * ((100 - Number(selected.deposit_percent)) / 100);
                    updateOrder(selected.id, { supplier_payout_balance: net.toFixed(2), supplier_payout_balance_at: new Date().toISOString() }, "supplier_payout", `Versement solde fournisseur : €${net.toFixed(2)}`);
                  }}
                  className="mt-2 text-[10px] font-display font-semibold text-[#D4603A] hover:underline"
                >
                  Verser au fournisseur
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Admin notes */}
        <div className="border border-border rounded-xl p-4">
          <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-2">Notes admin</p>
          <textarea
            defaultValue={selected.admin_notes || ""}
            onBlur={(e) => {
              if (e.target.value !== (selected.admin_notes || "")) {
                updateOrder(selected.id, { admin_notes: e.target.value }, "note", "Note admin mise à jour");
              }
            }}
            rows={2}
            placeholder="Notes internes..."
            className="w-full px-3 py-2 border border-border rounded-lg text-xs font-body focus:outline-none focus:border-foreground/40 resize-none"
          />
        </div>

        {/* Event timeline */}
        <div>
          <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-3">Historique</p>
          {events.length === 0 ? (
            <p className="text-xs font-body text-muted-foreground">Aucun événement</p>
          ) : (
            <div className="space-y-2">
              {events.map((ev: any) => (
                <div key={ev.id} className="flex items-start gap-3 text-xs font-body">
                  <div className="w-2 h-2 rounded-full bg-border mt-1.5 shrink-0" />
                  <div>
                    <p className="text-foreground">{ev.description}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(ev.created_at).toLocaleString("fr-FR")} · {ev.actor}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── List ──
  if (isLoading) return <p className="text-muted-foreground text-sm">Chargement...</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-lg">Suivi des commandes</h2>
          <p className="text-xs font-body text-muted-foreground mt-0.5">
            Gérez le cycle complet : acompte → production → expédition → livraison → solde → versement fournisseur.
          </p>
        </div>
        <RefreshAllButton />
      </div>

      {/* Pipeline stats */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STEP_ORDER.map(s => {
          const cfg = ORDER_STATUS[s];
          return (
            <div key={s} className="text-center px-3 py-2 rounded-lg border border-border min-w-[90px] shrink-0" style={{ background: cfg.bg }}>
              <p className="font-display font-bold text-base" style={{ color: cfg.color }}>{counts[s] || 0}</p>
              <p className="text-[8px] font-display font-semibold leading-tight" style={{ color: cfg.color }}>{cfg.label}</p>
            </div>
          );
        })}
        {["disputed", "cancelled"].map(s => {
          const cfg = ORDER_STATUS[s];
          return (counts[s] || 0) > 0 ? (
            <div key={s} className="text-center px-3 py-2 rounded-lg border border-border min-w-[80px] shrink-0" style={{ background: cfg.bg }}>
              <p className="font-display font-bold text-base" style={{ color: cfg.color }}>{counts[s]}</p>
              <p className="text-[8px] font-display font-semibold" style={{ color: cfg.color }}>{cfg.label}</p>
            </div>
          ) : null;
        })}
      </div>

      {/* Search + filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par produit, client, fournisseur…"
            className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-xs font-body focus:outline-none focus:border-foreground/40" />
        </div>
      </div>

      <div className="flex gap-1 flex-wrap">
        {[{ id: "all", label: "Toutes" }, ...STEP_ORDER.map(s => ({ id: s, label: ORDER_STATUS[s].label })), { id: "disputed", label: "Litiges" }].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`text-[10px] font-display font-semibold px-3 py-1.5 rounded-full transition-all ${
              filter === f.id ? "bg-foreground text-primary-foreground" : "border border-border text-muted-foreground"
            }`}>
            {f.label} ({counts[f.id] || 0})
          </button>
        ))}
      </div>

      {/* Order list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-body text-muted-foreground">Aucune commande.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((o: any) => {
            const sc = ORDER_STATUS[o.status] || ORDER_STATUS.pending_deposit;
            return (
              <div key={o.id} onClick={() => setSelectedId(o.id)}
                className="flex items-center gap-3 px-4 py-3 border border-border rounded-xl hover:border-foreground/15 cursor-pointer group">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: sc.bg }}>
                  <sc.icon className="h-4 w-4" style={{ color: sc.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-display font-bold text-foreground group-hover:text-[#D4603A] truncate">{o.product_name}</p>
                    <span className="text-[9px] font-display font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                  </div>
                  <p className="text-[10px] font-body text-muted-foreground">
                    {o.client_email}
                    {o.partner?.name && <span> → {o.partner.name} {countryFlag(o.partner.country_code)}</span>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-display font-bold">€{Number(o.total_amount || 0).toLocaleString()}</p>
                  <p className="text-[9px] font-body text-muted-foreground">{o.quantity} pcs</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function ActionBtn({ label, icon: Icon, color, onClick }: { label: string; icon: any; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 text-[10px] font-display font-semibold px-3 py-2 rounded-lg border-2 transition-all hover:opacity-80"
      style={{ borderColor: color, color }}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function FinCard({ label, value, icon: Icon, sub, highlight }: { label: string; value: string; icon: any; sub?: string; highlight?: boolean }) {
  return (
    <div className={`border rounded-xl p-3 ${highlight ? "border-[#D4603A]/30 bg-[#D4603A]/5" : "border-border"}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`h-3.5 w-3.5 ${highlight ? "text-[#D4603A]" : "text-muted-foreground"}`} />
        <p className="text-[9px] font-display font-semibold uppercase text-muted-foreground">{label}</p>
      </div>
      <p className={`text-sm font-display font-bold ${highlight ? "text-[#D4603A]" : "text-foreground"}`}>{value}</p>
      {sub && <p className="text-[9px] font-body text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TRACKING PANEL (manual + auto-ready)
// ══════════════════════════════════════════════════════════════════════════════

const TRACKING_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending:          { label: "En attente",       color: "#D97706", bg: "#FFFBEB" },
  info_received:    { label: "Info reçue",       color: "#2563EB", bg: "#EFF6FF" },
  in_transit:       { label: "En transit",       color: "#7C3AED", bg: "#F5F3FF" },
  out_for_delivery: { label: "En livraison",     color: "#0891B2", bg: "#ECFEFF" },
  delivered:        { label: "Livré",            color: "#059669", bg: "#ECFDF5" },
  exception:        { label: "Problème",         color: "#DC2626", bg: "#FEF2F2" },
};

function RefreshAllButton() {
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  if (!isAutoTrackingEnabled) return null;

  return (
    <button
      onClick={async () => {
        setRefreshing(true);
        try {
          const count = await refreshAllShippedOrders();
          toast.success(`${count} tracking(s) mis à jour`);
          queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
        } catch { toast.error("Erreur"); }
        finally { setRefreshing(false); }
      }}
      disabled={refreshing}
      className="flex items-center gap-1.5 text-[10px] font-display font-semibold text-[#D4603A] border border-[#D4603A]/20 px-3 py-2 rounded-full hover:bg-[#D4603A]/5 disabled:opacity-40 shrink-0"
    >
      {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
      Rafraîchir tous les trackings
    </button>
  );
}

function TrackingPanel({
  order, onUpdate, queryClient,
}: {
  order: any;
  onUpdate: (id: string, updates: Record<string, any>, eventType: string, desc: string) => Promise<void>;
  queryClient: any;
}) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!order.tracking_number) { toast.error("Pas de numéro de tracking"); return; }
    setRefreshing(true);
    try {
      const result = await refreshOrderTracking(order.id);
      if (result) {
        toast.success(`Tracking mis à jour : ${result.lastEvent}`);
        queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      } else {
        toast.info("Pas de mise à jour disponible");
      }
    } catch { toast.error("Erreur lors du rafraîchissement"); }
    finally { setRefreshing(false); }
  };

  const handleToggleAuto = async () => {
    const newVal = !order.tracking_auto_enabled;
    await onUpdate(
      order.id,
      { tracking_auto_enabled: newVal, tracking_provider: newVal ? "aftership" : "manual" },
      "admin_action",
      newVal ? "Suivi automatique activé" : "Suivi automatique désactivé"
    );
  };

  const trkStatus = order.tracking_status ? TRACKING_STATUS_MAP[order.tracking_status] : null;

  return (
    <div className="border border-border rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Truck className="h-3.5 w-3.5" /> Suivi livraison
        </p>
        <div className="flex items-center gap-2">
          {/* Auto-tracking toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={!!order.tracking_auto_enabled}
              onChange={handleToggleAuto}
              className="rounded border-border"
              disabled={!isAutoTrackingEnabled}
            />
            <span className="text-[9px] font-display font-semibold text-muted-foreground flex items-center gap-1">
              <Radio className="h-3 w-3" />
              Auto
              {!isAutoTrackingEnabled && <span className="text-[8px] text-amber-600">(clé API requise)</span>}
            </span>
          </label>
          {/* Manual refresh */}
          {order.tracking_number && (
            <button
              onClick={handleRefresh}
              disabled={refreshing || !isAutoTrackingEnabled}
              className="flex items-center gap-1 text-[9px] font-display font-semibold text-[#D4603A] hover:underline disabled:opacity-40"
            >
              {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Rafraîchir
            </button>
          )}
        </div>
      </div>

      {/* Tracking status from API (if available) */}
      {trkStatus && (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: trkStatus.bg }}>
          <Radio className="h-4 w-4" style={{ color: trkStatus.color }} />
          <div>
            <p className="text-[11px] font-display font-bold" style={{ color: trkStatus.color }}>{trkStatus.label}</p>
            {order.tracking_last_event && <p className="text-[10px] font-body text-muted-foreground">{order.tracking_last_event}</p>}
            {order.tracking_last_checked && (
              <p className="text-[9px] font-body text-muted-foreground/60">
                Vérifié le {new Date(order.tracking_last_checked).toLocaleString("fr-FR")}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Manual fields */}
      <div className="grid grid-cols-2 gap-3 text-xs font-body">
        <div>
          <span className="text-muted-foreground">N° tracking :</span>
          <input
            type="text"
            defaultValue={order.tracking_number || ""}
            onBlur={(e) => {
              if (e.target.value !== (order.tracking_number || "")) {
                onUpdate(order.id, { tracking_number: e.target.value }, "admin_action", `Tracking mis à jour : ${e.target.value}`);
              }
            }}
            placeholder="Entrer le numéro..."
            className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-foreground/40"
          />
        </div>
        <div>
          <span className="text-muted-foreground">Transporteur :</span>
          <input
            type="text"
            defaultValue={order.shipping_carrier || ""}
            onBlur={(e) => {
              if (e.target.value !== (order.shipping_carrier || "")) {
                onUpdate(order.id, { shipping_carrier: e.target.value }, "admin_action", `Transporteur : ${e.target.value}`);
              }
            }}
            placeholder="DHL, Chronopost, TNT..."
            className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-foreground/40"
          />
        </div>
      </div>

      {/* Info banner */}
      {!isAutoTrackingEnabled && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50/50 border border-amber-100">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[9px] font-body text-amber-700">
            Suivi automatique inactif. Ajoutez <code className="bg-amber-100 px-1 rounded">VITE_TRACKING_API_KEY</code> et <code className="bg-amber-100 px-1 rounded">VITE_TRACKING_PROVIDER=aftership</code> dans votre .env pour activer.
          </p>
        </div>
      )}
    </div>
  );
}
