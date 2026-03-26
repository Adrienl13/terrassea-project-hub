import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Package, Plus, ChevronDown, ChevronUp, Trash2, Search,
  Truck, CheckCircle2, XCircle, Calendar, Edit2, ToggleLeft, ToggleRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerArrivals, type Arrival, type ArrivalItem } from "@/hooks/useArrivals";

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status, t }: { status: string; t: (k: string) => string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    planned:    { bg: "bg-blue-50",   text: "text-blue-700",   label: t("arrivals.planned") },
    in_transit: { bg: "bg-amber-50",  text: "text-amber-700",  label: t("arrivals.inTransit") },
    arrived:    { bg: "bg-green-50",  text: "text-green-700",  label: t("arrivals.arrived") },
    cancelled:  { bg: "bg-red-50",    text: "text-red-600",    label: t("arrivals.cancelled") },
  };
  const c = config[status] ?? config.planned;
  return (
    <span className={`text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

// ── Create form ────────────────────────────────────────────────────────────────

function CreateArrivalForm({
  onCreate,
  isCreating,
  onCancel,
  t,
}: {
  onCreate: (data: { name: string; expectedDate: string; notes?: string; preorderEnabled?: boolean }) => void;
  isCreating: boolean;
  onCancel: () => void;
  t: (k: string) => string;
}) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [preorder, setPreorder] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date) return;
    onCreate({ name: name.trim(), expectedDate: date, notes: notes.trim() || undefined, preorderEnabled: preorder });
    setName("");
    setDate("");
    setNotes("");
    setPreorder(false);
  };

  return (
    <form onSubmit={handleSubmit} className="border border-border rounded-sm p-4 space-y-3 bg-card">
      <p className="font-display font-bold text-sm text-foreground">{t("arrivals.newArrival")}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
            {t("arrivals.name")}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 text-xs font-body border border-border rounded-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
            placeholder="Container Mars 2026"
            required
          />
        </div>
        <div>
          <label className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
            {t("arrivals.expectedDate")}
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 text-xs font-body border border-border rounded-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
            required
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 text-xs font-body border border-border rounded-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 resize-none"
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        {preorder ? (
          <ToggleRight className="h-5 w-5 text-foreground" onClick={() => setPreorder(false)} aria-label={t("arrivals.preorderEnabled")} />
        ) : (
          <ToggleLeft className="h-5 w-5 text-muted-foreground" onClick={() => setPreorder(true)} aria-label={t("arrivals.preorderEnabled")} />
        )}
        <span className="text-xs font-body text-foreground">{t("arrivals.preorderEnabled")}</span>
      </label>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isCreating || !name.trim() || !date}
          className="px-4 py-2 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {t("arrivals.create")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs font-body text-muted-foreground border border-border rounded-sm hover:border-foreground transition-colors"
        >
          {t("arrivals.cancel")}
        </button>
      </div>
    </form>
  );
}

// ── Add product search ─────────────────────────────────────────────────────────

function AddProductSearch({
  partnerId,
  arrivalId,
  onAdd,
  isAdding,
  t,
}: {
  partnerId: string;
  arrivalId: string;
  onAdd: (params: { arrivalId: string; productId: string; expectedQuantity: number }) => void;
  isAdding: boolean;
  t: (k: string) => string;
}) {
  const [search, setSearch] = useState("");
  const [qty, setQty] = useState(10);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const { data: products = [] } = useQuery({
    queryKey: ["partner-products-for-arrival", partnerId, search],
    queryFn: async () => {
      let query = supabase
        .from("product_offers")
        .select("product_id, products(id, name, image_url)")
        .eq("partner_id", partnerId)
        .limit(20);
      if (search.trim()) {
        // Filter will be done client-side on product name
      }
      const { data, error } = await query;
      if (error) return [];
      const seen = new Set<string>();
      return (data || [])
        .filter((o: any) => {
          if (!o.products || seen.has(o.product_id)) return false;
          seen.add(o.product_id);
          if (search.trim()) {
            return o.products.name?.toLowerCase().includes(search.toLowerCase());
          }
          return true;
        })
        .map((o: any) => ({
          id: o.product_id,
          name: o.products.name,
          image: o.products.image_url,
        }));
    },
    enabled: !!partnerId,
  });

  const handleAdd = () => {
    if (!selectedProductId || qty < 1) return;
    onAdd({ arrivalId, productId: selectedProductId, expectedQuantity: qty });
    setSelectedProductId(null);
    setSearch("");
    setQty(10);
    toast.success(t("arrivals.productAdded"));
  };

  return (
    <div className="border border-dashed border-border rounded-sm p-3 space-y-2">
      <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
        {t("arrivals.addProduct")}
      </p>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setSelectedProductId(null); }}
          placeholder={t("arrivals.searchProduct")}
          className="w-full pl-8 pr-3 py-2 text-xs font-body border border-border rounded-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
        />
      </div>

      {products.length > 0 && !selectedProductId && search.trim() && (
        <div className="max-h-40 overflow-y-auto border border-border rounded-sm divide-y divide-border">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => { setSelectedProductId(p.id); setSearch(p.name); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
            >
              {p.image && (
                <img src={p.image} alt={p.name} className="w-7 h-7 object-cover rounded-sm flex-shrink-0" />
              )}
              <span className="text-xs font-body text-foreground truncate">{p.name}</span>
            </button>
          ))}
        </div>
      )}

      {selectedProductId && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-20 px-2 py-1.5 text-xs font-body border border-border rounded-sm bg-background text-foreground text-center focus:outline-none focus:ring-1 focus:ring-foreground/20"
          />
          <span className="text-[10px] font-body text-muted-foreground">{t("arrivals.units")}</span>
          <button
            onClick={handleAdd}
            disabled={isAdding}
            className="ml-auto px-3 py-1.5 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Plus className="h-3 w-3 inline mr-1" />
            {t("arrivals.add")}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Expanded arrival card ──────────────────────────────────────────────────────

function ArrivalDetail({
  arrival,
  partnerId,
  onCollapse,
  updateArrival,
  cancelArrival,
  markArrived,
  addItem,
  isAddingItem,
  updateItem,
  removeItem,
  t,
}: {
  arrival: Arrival;
  partnerId: string;
  onCollapse: () => void;
  updateArrival: (params: { id: string; data: Record<string, any> }) => void;
  cancelArrival: (id: string) => void;
  markArrived: (id: string) => void;
  addItem: (params: { arrivalId: string; productId: string; expectedQuantity: number }) => void;
  isAddingItem: boolean;
  updateItem: (params: { itemId: string; data: Record<string, any> }) => void;
  removeItem: (itemId: string) => void;
  t: (k: string) => string;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(arrival.name);
  const [editingDate, setEditingDate] = useState(false);
  const [dateValue, setDateValue] = useState(arrival.expectedDate);
  const [notesValue, setNotesValue] = useState(arrival.notes ?? "");
  const [showAddProduct, setShowAddProduct] = useState(false);

  const isEditable = arrival.status === "planned" || arrival.status === "in_transit";
  const isArrived = arrival.status === "arrived";
  const totalUnits = arrival.items.reduce((s, i) => s + i.expectedQuantity, 0);

  const saveName = () => {
    if (nameValue.trim() && nameValue !== arrival.name) {
      updateArrival({ id: arrival.id, data: { name: nameValue.trim() } });
    }
    setEditingName(false);
  };

  const saveDate = () => {
    if (dateValue && dateValue !== arrival.expectedDate) {
      updateArrival({ id: arrival.id, data: { expectedDate: dateValue } });
    }
    setEditingDate(false);
  };

  const saveNotes = () => {
    if (notesValue !== (arrival.notes ?? "")) {
      updateArrival({ id: arrival.id, data: { notes: notesValue || null } });
    }
  };

  const togglePreorder = () => {
    updateArrival({ id: arrival.id, data: { preorderEnabled: !arrival.preorderEnabled } });
  };

  return (
    <div className="border border-foreground/20 rounded-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {editingName ? (
            <input
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => e.key === "Enter" && saveName()}
              className="text-sm font-display font-bold text-foreground bg-transparent border-b border-foreground/30 focus:outline-none"
            />
          ) : (
            <button onClick={() => isEditable && setEditingName(true)} className="text-sm font-display font-bold text-foreground truncate flex items-center gap-1.5">
              {arrival.name}
              {isEditable && <Edit2 className="h-3 w-3 text-muted-foreground" />}
            </button>
          )}
          <StatusBadge status={arrival.status} t={t} />
        </div>
        <button onClick={onCollapse} className="p-1 text-muted-foreground hover:text-foreground">
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-body">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            {editingDate ? (
              <input
                type="date"
                autoFocus
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                onBlur={saveDate}
                className="text-xs font-body bg-transparent border-b border-foreground/30 focus:outline-none"
              />
            ) : (
              <button
                onClick={() => isEditable && setEditingDate(true)}
                className="text-foreground hover:underline"
              >
                {new Date(arrival.expectedDate).toLocaleDateString()}
              </button>
            )}
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer">
            {arrival.preorderEnabled ? (
              <ToggleRight className="h-4 w-4 text-foreground" onClick={isEditable ? togglePreorder : undefined} />
            ) : (
              <ToggleLeft className="h-4 w-4 text-muted-foreground" onClick={isEditable ? togglePreorder : undefined} />
            )}
            <span className="text-muted-foreground">{t("arrivals.preorderEnabled")}</span>
          </label>

          <span className="text-muted-foreground">
            {arrival.items.length} {t("arrivals.products")} &middot; {totalUnits} {t("arrivals.units")}
          </span>
        </div>

        {/* Notes */}
        {isEditable && (
          <textarea
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            onBlur={saveNotes}
            rows={2}
            placeholder="Notes..."
            className="w-full px-3 py-2 text-xs font-body border border-border rounded-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 resize-none"
          />
        )}
        {!isEditable && arrival.notes && (
          <p className="text-xs font-body text-muted-foreground italic">{arrival.notes}</p>
        )}

        {/* Status actions */}
        {isEditable && (
          <div className="flex flex-wrap gap-2">
            {arrival.status === "planned" && (
              <button
                onClick={() => updateArrival({ id: arrival.id, data: { status: "in_transit" } })}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-display font-semibold text-amber-700 bg-amber-50 rounded-sm hover:bg-amber-100 transition-colors"
              >
                <Truck className="h-3.5 w-3.5" />
                {t("arrivals.markInTransit")}
              </button>
            )}
            <button
              onClick={() => { markArrived(arrival.id); toast.success(t("arrivals.arrived")); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-display font-semibold text-green-700 bg-green-50 rounded-sm hover:bg-green-100 transition-colors"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("arrivals.markArrived")}
            </button>
            <button
              onClick={() => { cancelArrival(arrival.id); toast.info(t("arrivals.cancelled")); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-display font-semibold text-red-600 bg-red-50 rounded-sm hover:bg-red-100 transition-colors"
            >
              <XCircle className="h-3.5 w-3.5" />
              {t("arrivals.cancel")}
            </button>
          </div>
        )}

        {/* Items table */}
        {arrival.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-body">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-3 font-display font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">
                    {t("arrivals.product")}
                  </th>
                  <th className="text-center py-2 px-2 font-display font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">
                    {t("arrivals.expectedQty")}
                  </th>
                  <th className="text-center py-2 px-2 font-display font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">
                    {t("arrivals.receivedQty")}
                  </th>
                  <th className="text-center py-2 px-2 font-display font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">
                    {t("arrivals.reserved")}
                  </th>
                  <th className="text-center py-2 px-2 font-display font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">
                    {t("arrivals.available")}
                  </th>
                  {isEditable && <th className="w-8" />}
                </tr>
              </thead>
              <tbody>
                {arrival.items.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    isEditable={isEditable}
                    isArrived={isArrived}
                    updateItem={updateItem}
                    removeItem={removeItem}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add product */}
        {isEditable && (
          <>
            {showAddProduct ? (
              <AddProductSearch
                partnerId={partnerId}
                arrivalId={arrival.id}
                onAdd={addItem}
                isAdding={isAddingItem}
                t={t}
              />
            ) : (
              <button
                onClick={() => setShowAddProduct(true)}
                className="flex items-center gap-1.5 text-xs font-display font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                {t("arrivals.addProduct")}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Item row ───────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  isEditable,
  isArrived,
  updateItem,
  removeItem,
}: {
  item: ArrivalItem;
  isEditable: boolean;
  isArrived: boolean;
  updateItem: (params: { itemId: string; data: Record<string, any> }) => void;
  removeItem: (itemId: string) => void;
}) {
  const available = item.expectedQuantity - item.preorderReserved;

  return (
    <tr className="border-b border-border/50 hover:bg-muted/20">
      <td className="py-2 pr-3">
        <div className="flex items-center gap-2">
          {item.productImage && (
            <img src={item.productImage} alt={item.productName} className="w-8 h-8 object-cover rounded-sm flex-shrink-0" />
          )}
          <span className="text-foreground truncate max-w-[200px]">{item.productName}</span>
        </div>
      </td>
      <td className="text-center py-2 px-2">
        {isEditable ? (
          <input
            type="number"
            min={1}
            defaultValue={item.expectedQuantity}
            onBlur={(e) => {
              const v = parseInt(e.target.value) || item.expectedQuantity;
              if (v !== item.expectedQuantity) updateItem({ itemId: item.id, data: { expectedQuantity: v } });
            }}
            className="w-16 text-center text-xs border border-border rounded-sm bg-background py-1 focus:outline-none focus:ring-1 focus:ring-foreground/20"
          />
        ) : (
          <span>{item.expectedQuantity}</span>
        )}
      </td>
      <td className="text-center py-2 px-2">
        {isArrived ? (
          <input
            type="number"
            min={0}
            defaultValue={item.receivedQuantity ?? ""}
            onBlur={(e) => {
              const v = e.target.value === "" ? null : parseInt(e.target.value);
              updateItem({ itemId: item.id, data: { receivedQuantity: v } });
            }}
            className="w-16 text-center text-xs border border-border rounded-sm bg-background py-1 focus:outline-none focus:ring-1 focus:ring-foreground/20"
          />
        ) : (
          <span className="text-muted-foreground">{item.receivedQuantity ?? "—"}</span>
        )}
      </td>
      <td className="text-center py-2 px-2 text-muted-foreground">
        {item.preorderReserved}
      </td>
      <td className="text-center py-2 px-2">
        <span className={available <= 0 ? "text-red-500 font-semibold" : "text-foreground"}>
          {available}
        </span>
      </td>
      {isEditable && (
        <td className="py-2">
          <button
            onClick={() => removeItem(item.id)}
            className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </td>
      )}
    </tr>
  );
}

// ── Main section ───────────────────────────────────────────────────────────────

export default function PartnerArrivalsSection({ partnerId }: { partnerId: string | null }) {
  const { t } = useTranslation();
  const {
    arrivals,
    isLoading,
    createArrival,
    isCreating,
    updateArrival,
    cancelArrival,
    markArrived,
    addItem,
    isAddingItem,
    updateItem,
    removeItem,
  } = usePartnerArrivals(partnerId);

  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!partnerId) {
    return (
      <div className="text-center py-16">
        <p className="text-sm font-body text-muted-foreground">{t("arrivals.noArrivals")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display font-bold text-lg text-foreground">{t("arrivals.title")}</p>
          <p className="text-[10px] font-body text-muted-foreground mt-0.5">
            {arrivals.length} {t("arrivals.arrivalsCount")}
          </p>
        </div>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-sm hover:opacity-90 transition-opacity"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("arrivals.newArrival")}
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <CreateArrivalForm
          onCreate={(data) => {
            createArrival(data);
            setShowCreate(false);
            toast.success(t("arrivals.created"));
          }}
          isCreating={isCreating}
          onCancel={() => setShowCreate(false)}
          t={t}
        />
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && arrivals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="h-8 w-8 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-body text-muted-foreground">{t("arrivals.noArrivals")}</p>
        </div>
      )}

      {/* Arrival cards */}
      {arrivals.map((arrival) =>
        expandedId === arrival.id ? (
          <ArrivalDetail
            key={arrival.id}
            arrival={arrival}
            partnerId={partnerId}
            onCollapse={() => setExpandedId(null)}
            updateArrival={updateArrival}
            cancelArrival={cancelArrival}
            markArrived={markArrived}
            addItem={addItem}
            isAddingItem={isAddingItem}
            updateItem={updateItem}
            removeItem={removeItem}
            t={t}
          />
        ) : (
          <ArrivalCard
            key={arrival.id}
            arrival={arrival}
            onExpand={() => setExpandedId(arrival.id)}
            t={t}
          />
        )
      )}
    </div>
  );
}

// ── Collapsed arrival card ─────────────────────────────────────────────────────

function ArrivalCard({
  arrival,
  onExpand,
  t,
}: {
  arrival: Arrival;
  onExpand: () => void;
  t: (k: string) => string;
}) {
  const totalUnits = arrival.items.reduce((s, i) => s + i.expectedQuantity, 0);

  return (
    <button
      onClick={onExpand}
      className="w-full flex items-center justify-between px-4 py-3 border border-border rounded-sm hover:border-foreground/20 transition-colors text-left"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-display font-semibold text-foreground truncate">{arrival.name}</p>
          <p className="text-[10px] font-body text-muted-foreground">
            {new Date(arrival.expectedDate).toLocaleDateString()} &middot; {arrival.items.length} {t("arrivals.products")} &middot; {totalUnits} {t("arrivals.units")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <StatusBadge status={arrival.status} t={t} />
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  );
}
