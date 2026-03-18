import { useState } from "react";
import { useProducts } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Plus, Pencil, X, Save, ArrowLeft, Package,
  FileText, Users, Eye, ClipboardList, CheckCircle2,
  XCircle, Clock,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import type { DBProduct } from "@/lib/products";

type Tab = "applications" | "quotes" | "pro_service" | "products";

type ProductFormData = Omit<DBProduct, "id" | "created_at" | "updated_at"> & { id?: string };

const emptyProduct: ProductFormData = {
  name: "", category: "", subcategory: "", short_description: "", long_description: "",
  indicative_price: "", image_url: "", gallery_urls: [], product_family: "", collection: "",
  main_color: "", secondary_color: "", available_colors: [], style_tags: [], ambience_tags: [],
  palette_tags: [], material_tags: [], use_case_tags: [], technical_tags: [],
  material_structure: "", material_seat: "", dimensions_length_cm: null, dimensions_width_cm: null,
  dimensions_height_cm: null, seat_height_cm: null, weight_kg: null, is_outdoor: true,
  is_stackable: false, is_chr_heavy_use: false, uv_resistant: false, weather_resistant: false,
  fire_retardant: false, lightweight: false, easy_maintenance: false, customizable: false,
  dismountable: false, requires_assembly: false, country_of_manufacture: "", warranty: "",
  maintenance_info: "", stock_status: "available", stock_quantity: null,
  estimated_delivery_days: null, price_min: null, price_max: null,
  popularity_score: 0.5, priority_score: 0.5, availability_type: "available",
  brand_source: "", supplier_internal: "", documents: [], table_shape: null,
  default_seating_capacity: null, recommended_seating_min: null, recommended_seating_max: null,
  combinable: false, combined_capacity_if_joined: null,
  archetype_id: null, archetype_confidence: null,
  product_type_tags: {}, color_variants: [],
  data_quality_score: 0,
};

const CATEGORIES = ["Chairs", "Armchairs", "Tables", "Bar Stools", "Parasols", "Lounge Seating", "Sun Loungers", "Benches", "Coffee Tables", "High Tables", "Sofas"];

const STATUS_BADGE: Record<string, string> = {
  pending:   "bg-amber-50 text-amber-700 border border-amber-200",
  confirmed: "bg-green-50 text-green-700 border border-green-200",
  rejected:  "bg-red-50 text-red-700 border border-red-200",
  shipped:   "bg-blue-50 text-blue-700 border border-blue-200",
  approved:  "bg-green-50 text-green-700 border border-green-200",
  suspended: "bg-red-50 text-red-700 border border-red-200",
};

const APP_STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  pending:   { label: "Pending review", icon: Clock,        color: "#BA7517", bg: "#FAEEDA" },
  approved:  { label: "Approved",       icon: CheckCircle2, color: "#085041", bg: "#E1F5EE" },
  rejected:  { label: "Rejected",       icon: XCircle,      color: "#791F1F", bg: "#FCF0F0" },
  suspended: { label: "Suspended",      icon: XCircle,      color: "#791F1F", bg: "#FCF0F0" },
};

const VOLUME_LABELS: Record<string, string> = {
  under_50k:   "Under €50,000",
  "50k_200k":  "€50k – €200k",
  "200k_500k": "€200k – €500k",
  over_500k:   "Over €500,000",
};

// ── Applications tab ──────────────────────────────────────────────────────────

function ApplicationsTab() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<any>(null);
  const [filter, setFilter] = useState("all");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [processing, setProcessing] = useState(false);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["partner_applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = filter === "all"
    ? applications
    : applications.filter((a: any) => a.status === filter);

  const counts = {
    all:      applications.length,
    pending:  applications.filter((a: any) => a.status === "pending").length,
    approved: applications.filter((a: any) => a.status === "approved").length,
    rejected: applications.filter((a: any) => a.status === "rejected").length,
  };

  const updateStatus = async (id: string, status: string, reason?: string) => {
    setProcessing(true);
    try {
      const updates: any = { status, reviewed_at: new Date().toISOString() };
      if (reason) updates.rejection_reason = reason;

      const { error } = await supabase
        .from("partner_applications")
        .update(updates)
        .eq("id", id);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["partner_applications"] });
      queryClient.invalidateQueries({ queryKey: ["partner_applications_pending"] });

      if (status === "approved") toast.success("Application approved — send the access email manually for now.");
      else if (status === "rejected") toast.success("Application rejected.");

      setSelected((prev: any) => prev ? { ...prev, status, rejection_reason: reason } : null);
      setShowRejectForm(false);
      setRejectionReason("");
    } catch {
      toast.error("Failed to update status.");
    } finally {
      setProcessing(false);
    }
  };

  if (isLoading) return <p className="text-muted-foreground font-body text-sm">Loading...</p>;

  // ── Detail view ──
  if (selected) {
    const cfg = APP_STATUS_CONFIG[selected.status] || APP_STATUS_CONFIG.pending;
    const StatusIcon = cfg.icon;

    return (
      <div>
        <button
          onClick={() => { setSelected(null); setShowRejectForm(false); }}
          className="flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Back to applications
        </button>

        {/* Status banner */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-sm mb-6" style={{ background: cfg.bg }}>
          <StatusIcon className="h-4 w-4" style={{ color: cfg.color }} />
          <span className="font-display font-semibold text-sm" style={{ color: cfg.color }}>
            {cfg.label}
          </span>
          {selected.reviewed_at && (
            <span className="text-[10px] font-body ml-auto" style={{ color: cfg.color }}>
              {new Date(selected.reviewed_at).toLocaleDateString("fr-FR")}
            </span>
          )}
        </div>

        <div className="space-y-5">
          {/* Company info */}
          <div className="border border-border rounded-sm p-5">
            <h3 className="font-display font-semibold text-sm text-foreground mb-4">Company</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Company",     value: selected.company_name },
                { label: "Contact",     value: selected.contact_name },
                { label: "Email",       value: selected.contact_email },
                { label: "Phone",       value: selected.phone },
                { label: "Website",     value: selected.website },
                { label: "VAT / ID",    value: selected.vat_number },
                { label: "Country",     value: selected.country },
                { label: "Type",        value: selected.partner_type },
                { label: "Est. volume", value: VOLUME_LABELS[selected.estimated_annual_volume] || selected.estimated_annual_volume },
              ].filter(({ value }) => value).map(({ label, value }) => (
                <div key={label}>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-body">{label}</span>
                  <p className="text-sm font-body text-foreground">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Categories + countries */}
          <div className="grid grid-cols-2 gap-4">
            {selected.product_categories?.length > 0 && (
              <div className="border border-border rounded-sm p-4">
                <h3 className="font-display font-semibold text-xs text-foreground mb-2">Product categories</h3>
                <div className="flex flex-wrap gap-1">
                  {selected.product_categories.map((c: string) => (
                    <span key={c} className="text-[10px] bg-card border border-border text-muted-foreground px-2 py-0.5 rounded-full">{c}</span>
                  ))}
                </div>
              </div>
            )}
            {selected.delivery_countries?.length > 0 && (
              <div className="border border-border rounded-sm p-4">
                <h3 className="font-display font-semibold text-xs text-foreground mb-2">Delivery countries</h3>
                <div className="flex flex-wrap gap-1">
                  {selected.delivery_countries.map((c: string) => (
                    <span key={c} className="text-[10px] bg-card border border-border text-muted-foreground px-2 py-0.5 rounded-full">{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Message */}
        {selected.message && (
          <div className="border border-border rounded-sm p-5 mt-5">
            <h3 className="font-display font-semibold text-sm text-foreground mb-2">Their message</h3>
            <p className="text-sm font-body text-muted-foreground">{selected.message}</p>
          </div>
        )}

        {/* Rejection reason */}
        {selected.rejection_reason && (
          <div className="border border-red-200 bg-red-50 rounded-sm p-4 mt-5">
            <h3 className="font-display font-semibold text-xs text-red-700 mb-1">Rejection reason</h3>
            <p className="text-sm font-body text-red-600">{selected.rejection_reason}</p>
          </div>
        )}

        {/* Actions */}
        {selected.status === "pending" && (
          <div className="space-y-4 mt-6">
            <div className="flex gap-3">
              <button
                onClick={() => updateStatus(selected.id, "approved")}
                disabled={processing}
                className="flex items-center gap-2 px-6 py-2.5 font-display font-semibold text-sm bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {processing ? "Processing..." : "Approve application"}
              </button>
              <button
                onClick={() => setShowRejectForm(!showRejectForm)}
                disabled={processing}
                className="flex items-center gap-2 px-6 py-2.5 font-display font-semibold text-sm border border-red-200 text-red-600 rounded-full hover:bg-red-50 transition-colors"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </button>
            </div>

            {showRejectForm && (
              <div className="space-y-3 border border-border rounded-sm p-4">
                <label className="text-xs font-body text-muted-foreground">
                  Rejection reason (optional — sent to applicant)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Your catalogue doesn't match our current CHR focus."
                  rows={3}
                  className="w-full bg-background border border-border rounded-sm px-4 py-2.5 text-sm font-body text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-foreground resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(selected.id, "rejected", rejectionReason)}
                    disabled={processing}
                    className="px-5 py-2 font-display font-semibold text-xs bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    Confirm rejection
                  </button>
                  <button
                    onClick={() => setShowRejectForm(false)}
                    className="px-5 py-2 font-display font-semibold text-xs border border-border text-muted-foreground rounded-full hover:border-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-sm">
              <p className="text-xs font-body text-amber-700 leading-relaxed">
                <strong>After approval:</strong> manually send the partner their access link via email. Automated email notifications will be added in the next update.
              </p>
            </div>
          </div>
        )}

        {selected.status === "approved" && (
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => updateStatus(selected.id, "suspended")}
              disabled={processing}
              className="flex items-center gap-2 px-5 py-2.5 font-display font-semibold text-sm border border-red-200 text-red-600 rounded-full hover:bg-red-50 transition-colors"
            >
              Suspend partner
            </button>
          </div>
        )}

        {selected.status === "suspended" && (
          <button
            onClick={() => updateStatus(selected.id, "approved")}
            disabled={processing}
            className="flex items-center gap-2 px-5 py-2.5 font-display font-semibold text-sm bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors mt-6"
          >
            Reactivate partner
          </button>
        )}
      </div>
    );
  }

  // ── List view ──
  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-1 mb-6">
        {[
          { id: "all",      label: "All" },
          { id: "pending",  label: "Pending" },
          { id: "approved", label: "Approved" },
          { id: "rejected", label: "Rejected" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-display font-semibold rounded-full transition-all ${
              filter === f.id
                ? "bg-foreground text-primary-foreground"
                : "border border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            }`}
          >
            {f.label}
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-normal ${
              filter === f.id ? "bg-white/20 text-white" : "bg-card"
            }`}>
              {counts[f.id as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-body text-sm">
            {filter === "all" ? "No applications yet." : `No ${filter} applications.`}
          </p>
          <p className="text-xs text-muted-foreground font-body mt-1">
            Share /become-partner to start receiving applications.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-border">
                {["Date", "Company", "Contact", "Country", "Type", "Categories", "Volume", "Status", ""].map((h) => (
                  <th key={h} className={`py-3 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-normal ${h === "" ? "text-right" : "text-left"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((app: any) => {
                const c = APP_STATUS_CONFIG[app.status] || APP_STATUS_CONFIG.pending;
                return (
                  <tr key={app.id} className="border-b border-border/50 hover:bg-card/50 transition-colors">
                    <td className="py-3 px-2 text-muted-foreground text-[10px]">
                      {new Date(app.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="py-3 px-2">
                      <p className="font-display font-semibold text-xs text-foreground">{app.company_name}</p>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground text-xs">{app.contact_name}</td>
                    <td className="py-3 px-2 text-muted-foreground text-xs">{app.country}</td>
                    <td className="py-3 px-2">
                      <span className="text-[10px] font-body text-muted-foreground bg-card border border-border rounded px-1.5 py-0.5 capitalize">
                        {app.partner_type}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex flex-wrap gap-1">
                        {(app.product_categories || []).slice(0, 2).map((cat: string) => (
                          <span key={cat} className="text-[9px] text-muted-foreground bg-card border border-border rounded px-1.5 py-0.5">
                            {cat}
                          </span>
                        ))}
                        {(app.product_categories || []).length > 2 && (
                          <span className="text-[9px] text-muted-foreground">+{app.product_categories.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground text-[10px]">
                      {VOLUME_LABELS[app.estimated_annual_volume] || "—"}
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className="text-[9px] font-display font-semibold px-2 py-1 rounded-full capitalize"
                        style={{ background: c.bg, color: c.color }}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button onClick={() => setSelected(app)} className="text-muted-foreground hover:text-foreground transition-colors">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Quote requests tab ────────────────────────────────────────────────────────

function QuoteRequestsTab({ type = "standard" }: { type?: "standard" | "pro" }) {
  const [selected, setSelected] = useState<any>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["project_requests", type],
    queryFn: async () => {
      let query = supabase
        .from("project_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (type === "pro") {
        query = query.ilike("project_name", "%Pro Service%");
      } else {
        query = query.not("project_name", "ilike", "%Pro Service%");
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: cartItems = [] } = useQuery({
    queryKey: ["project_cart_items", selected?.id],
    enabled: !!selected?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_cart_items")
        .select("*, products(*)")
        .eq("project_request_id", selected.id);
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) return <p className="text-muted-foreground font-body text-sm">Loading...</p>;

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-3 w-3" /> Back to requests
        </button>
        <div className="space-y-5">
          <div className="border border-border rounded-sm p-5">
            <h3 className="font-display font-semibold text-sm text-foreground mb-4">Contact details</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Name",     value: selected.contact_name },
                { label: "Company",  value: selected.contact_company },
                { label: "Email",    value: selected.contact_email },
                { label: "Phone",    value: selected.contact_phone },
                { label: "City",     value: selected.city },
                { label: "Country",  value: selected.country },
                { label: "Budget",   value: selected.budget_range },
                { label: "Timeline", value: selected.timeline },
                { label: "SIREN",    value: (selected.detected_attributes as any)?.siren },
                { label: "Covers",   value: (selected.detected_attributes as any)?.covers },
                { label: "Delivery", value: (selected.detected_attributes as any)?.delivery_address },
              ].filter(({ value }) => value).map(({ label, value }) => (
                <div key={label}>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-body">{label}</span>
                  <p className="text-sm font-body text-foreground">{String(value)}</p>
                </div>
              ))}
            </div>
          </div>
          {selected.free_text_request && (
            <div className="border border-border rounded-sm p-5">
              <h3 className="font-display font-semibold text-sm text-foreground mb-2">Notes</h3>
              <p className="text-sm font-body text-muted-foreground">{selected.free_text_request}</p>
            </div>
          )}
          {cartItems.length > 0 && (
            <div className="border border-border rounded-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-sm text-foreground">Products</h3>
                <span className="text-[10px] font-display font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                  Real supplier names visible
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Product", "Qty", "Concept"].map((h) => (
                      <th key={h} className="py-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-normal text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cartItems.map((item: any, i: number) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2.5 px-2 text-foreground">{item.products?.name || "—"}</td>
                      <td className="py-2.5 px-2 text-muted-foreground">{item.quantity}</td>
                      <td className="py-2.5 px-2 text-muted-foreground">{item.concept_name || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {requests.length === 0 ? (
        <p className="text-muted-foreground font-body text-sm text-center py-12">No requests yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-border">
                {["Date", "Project", "Contact", "Company", "Budget", "Status", ""].map((h) => (
                  <th key={h} className={`py-3 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-normal ${h === "" ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((req: any) => (
                <tr key={req.id} className="border-b border-border/50 hover:bg-card/50 transition-colors">
                  <td className="py-3 px-2 text-muted-foreground text-[10px]">{new Date(req.created_at).toLocaleDateString("fr-FR")}</td>
                  <td className="py-3 px-2 font-display font-semibold text-xs text-foreground">{req.project_name}</td>
                  <td className="py-3 px-2 text-muted-foreground">{req.contact_name}</td>
                  <td className="py-3 px-2 text-muted-foreground">{req.contact_company}</td>
                  <td className="py-3 px-2 text-muted-foreground">{req.budget_range || "—"}</td>
                  <td className="py-3 px-2">
                    <span className={`text-[10px] font-display font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_BADGE[req.status || "pending"] || STATUS_BADGE.pending}`}>
                      {req.status || "pending"}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <button onClick={() => setSelected(req)} className="text-muted-foreground hover:text-foreground transition-colors">
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Products tab ──────────────────────────────────────────────────────────────

function ProductsTab() {
  const { data: products = [], isLoading } = useProducts();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ProductFormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");

  const filtered = products.filter(
    (p) => p.name.toLowerCase().includes(filter.toLowerCase()) ||
           p.category.toLowerCase().includes(filter.toLowerCase())
  );

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const { id, color_variants, product_type_tags, data_quality_score, archetype_id, archetype_confidence, ...data } = editing;
      const dbData = {
        ...data,
        color_variants: color_variants as any,
        product_type_tags: product_type_tags as any,
        data_quality_score,
        archetype_id,
        archetype_confidence,
      };
      if (id) {
        const { error } = await supabase.from("products").update(dbData).eq("id", id);
        if (error) throw error;
        toast.success("Product updated");
      } else {
        const { error } = await supabase.from("products").insert(dbData as any);
        if (error) throw error;
        toast.success("Product created");
      }
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setEditing(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const TagInput = ({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) => (
    <div>
      <label className="text-xs font-body text-muted-foreground block mb-1">{label}</label>
      <input
        type="text" value={value.join(", ")}
        onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
        placeholder="tag1, tag2, tag3"
        className="w-full bg-card rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
      />
    </div>
  );

  if (editing) {
    return (
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-lg font-bold text-foreground">{editing.id ? "Edit Product" : "New Product"}</h2>
          <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-body text-muted-foreground block mb-1">Name *</label>
              <input type="text" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="w-full bg-card rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground" />
            </div>
            <div>
              <label className="text-xs font-body text-muted-foreground block mb-1">Category *</label>
              <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                className="w-full bg-card rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground">
                <option value="">Select...</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-body text-muted-foreground block mb-1">Short Description</label>
            <textarea value={editing.short_description || ""} onChange={(e) => setEditing({ ...editing, short_description: e.target.value })}
              rows={2} className="w-full bg-card rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-body text-muted-foreground block mb-1">Indicative Price</label>
              <input type="text" value={editing.indicative_price || ""} onChange={(e) => setEditing({ ...editing, indicative_price: e.target.value })}
                className="w-full bg-card rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground" />
            </div>
            <div>
              <label className="text-xs font-body text-muted-foreground block mb-1">Image URL</label>
              <input type="text" value={editing.image_url || ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                className="w-full bg-card rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground" />
            </div>
          </div>
          <div className="border-t border-border pt-4">
            <h3 className="font-display font-semibold text-sm text-foreground mb-3">Tags</h3>
            <div className="space-y-3">
              <TagInput label="Style" value={editing.style_tags} onChange={(v) => setEditing({ ...editing, style_tags: v })} />
              <TagInput label="Material" value={editing.material_tags} onChange={(v) => setEditing({ ...editing, material_tags: v })} />
              <TagInput label="Use Case" value={editing.use_case_tags} onChange={(v) => setEditing({ ...editing, use_case_tags: v })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-body text-muted-foreground block mb-1">Brand Source</label>
              <input type="text" value={editing.brand_source || ""} onChange={(e) => setEditing({ ...editing, brand_source: e.target.value })}
                className="w-full bg-card rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground" />
            </div>
            <div>
              <label className="text-xs font-body text-muted-foreground block mb-1">Supplier (internal)</label>
              <input type="text" value={editing.supplier_internal || ""} onChange={(e) => setEditing({ ...editing, supplier_internal: e.target.value })}
                className="w-full bg-card rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving || !editing.name || !editing.category}
              className="flex items-center gap-2 px-6 py-2.5 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-50">
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
            </button>
            <button onClick={() => setEditing(null)}
              className="px-6 py-2.5 font-display font-semibold text-sm border border-border rounded-full hover:border-foreground transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <input type="text" value={filter} onChange={(e) => setFilter(e.target.value)}
          placeholder="Search products..."
          className="bg-card rounded-sm px-4 py-2.5 text-sm font-body outline-none focus:ring-1 focus:ring-foreground w-full max-w-sm" />
        <button onClick={() => setEditing({ ...emptyProduct })}
          className="flex items-center gap-2 px-5 py-2.5 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 ml-4">
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground font-body text-sm">Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Name", "Category", "Price", "Style tags", "Pop.", ""].map((h) => (
                  <th key={h} className={`py-3 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-normal ${h === "" ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr key={product.id} className="border-b border-border/50 hover:bg-card/50 transition-colors">
                  <td className="py-3 px-2 font-body text-foreground">{product.name}</td>
                  <td className="py-3 px-2 font-body text-muted-foreground">{product.category}</td>
                  <td className="py-3 px-2 font-body text-muted-foreground">{product.indicative_price || "—"}</td>
                  <td className="py-3 px-2">
                    <div className="flex gap-1 flex-wrap">
                      {product.style_tags.slice(0, 2).map((t) => (
                        <span key={t} className="text-[10px] bg-card text-muted-foreground px-2 py-0.5 rounded-full border border-border">{t}</span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-2 font-body text-muted-foreground">{product.popularity_score}</td>
                  <td className="py-3 px-2 text-right">
                    <button onClick={() => setEditing({ ...product })} className="text-muted-foreground hover:text-foreground transition-colors">
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Admin ────────────────────────────────────────────────────────────────

const Admin = () => {
  const [tab, setTab] = useState<Tab>("applications");
  const { data: products = [] } = useProducts();

  const { data: pendingApps = [] } = useQuery({
    queryKey: ["partner_applications_pending"],
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_applications")
        .select("id")
        .eq("status", "pending");
      return data || [];
    },
  });

  const tabs = [
    { id: "applications", icon: ClipboardList, label: "Applications",   badge: pendingApps.length },
    { id: "quotes",       icon: FileText,      label: "Quote requests", badge: 0 },
    { id: "pro_service",  icon: Users,         label: "Pro Service",    badge: 0 },
    { id: "products",     icon: Package,       label: "Products",       badge: 0 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-xs font-body text-muted-foreground hover:text-foreground mb-2 transition-colors">
              <ArrowLeft className="h-3 w-3" /> Back to site
            </Link>
            <h1 className="font-display text-2xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-sm text-muted-foreground font-body mt-0.5">
              {products.length} products
              {pendingApps.length > 0 && ` · ${pendingApps.length} application${pendingApps.length > 1 ? "s" : ""} pending`}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[10px] font-display font-semibold text-green-700">Admin view — full data</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-border overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-display font-semibold border-b-2 transition-colors -mb-px whitespace-nowrap ${
                tab === t.id
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
              {t.badge > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 font-semibold border border-red-200">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "applications" && <ApplicationsTab />}
        {tab === "quotes"       && <QuoteRequestsTab type="standard" />}
        {tab === "pro_service"  && <QuoteRequestsTab type="pro" />}
        {tab === "products"     && <ProductsTab />}
      </div>
    </div>
  );
};

export default Admin;
