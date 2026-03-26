import { useState, useEffect, useCallback } from "react";
import { useProducts } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Plus, Pencil, X, Save, ArrowLeft, Package,
  FileText, Users, Eye, ClipboardList, CheckCircle2,
  XCircle, Clock, AlertTriangle, Star, TrendingUp,
  ChevronDown, ChevronUp, Search, LayoutDashboard,
  Building2, UserCircle, MessageSquare, BarChart3, Settings,
  CreditCard, Inbox, Menu, ShoppingCart, Bot, ChevronLeft, LogOut, Merge, Landmark, Crown,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { DBProduct, ProductTypeTags, TagDefinition } from "@/lib/products";
import type { Json } from "@/integrations/supabase/types";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminPartners from "@/components/admin/AdminPartners";
import AdminMessages from "@/components/admin/AdminMessages";
import AdminPartnerVisibility from "@/components/admin/AdminPartnerVisibility";
import AdminQuoteWorkflow from "@/components/admin/AdminQuoteWorkflow";
import AdminOrderTracking from "@/components/admin/AdminOrderTracking";
import AdminAnalyticsDashboard from "@/components/admin/AdminAnalyticsDashboard";
import AdminSettings from "@/components/admin/AdminSettings";
import AdminRatingsModeration from "@/components/admin/AdminRatingsModeration";
import AdminSubscriptions from "@/components/admin/AdminSubscriptions";
import AdminProductReview from "@/components/admin/AdminProductReview";
import AdminChatbotStats from "@/components/admin/AdminChatbotStats";
import AdminFinancing from "@/components/admin/AdminFinancing";
import AdminBrandManagement from "@/components/admin/AdminBrandManagement";
import ColorVariantEditor from "@/components/admin/ColorVariantEditor";
import ProductMergeDialog from "@/components/admin/ProductMergeDialog";
import type { ColorVariant } from "@/lib/products";

// ═══════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════

type Tab = "dashboard" | "users" | "partners" | "partner_visibility" | "subscriptions" | "ratings" | "messages" | "applications" | "quotes" | "orders" | "analytics" | "pro_service" | "products" | "submissions" | "chatbot" | "financing" | "brands" | "settings";

type ProductFormData = Omit<DBProduct, "id"> & { id?: string; publish_status?: string };

const CATEGORIES = [
  "Chairs", "Armchairs", "Tables", "Bar Stools", "Parasols",
  "Lounge Seating", "Sun Loungers", "Benches", "Coffee Tables",
  "High Tables", "Sofas", "Accessories",
];

const AVAILABILITY_OPTIONS = ["available", "on-order", "production", "out-of-stock", "discontinued"];
const STOCK_STATUS_OPTIONS  = ["available", "low_stock", "out_of_stock", "on_order", "production"];

const COLOR_SLUGS = [
  "white","off-white","cream","ivory","sand","natural","beige","champagne",
  "taupe","grey","graphite","charcoal","anthracite","black","teak","walnut",
  "dark-brown","chocolate","terracotta","rust","copper","red","bordeaux",
  "mustard","gold","yellow","olive","sage","green","navy","petrol","blue",
  "blush","silver","bronze",
];

const emptyProduct = (): ProductFormData => ({
  name: "", category: "", subcategory: "", short_description: "", long_description: "",
  indicative_price: "", image_url: "", gallery_urls: [], product_family: "", collection: "",
  main_color: "", secondary_color: "", available_colors: [], style_tags: [], ambience_tags: [],
  palette_tags: [], material_tags: [], use_case_tags: [], technical_tags: [],
  material_structure: "", material_seat: "", dimensions_length_cm: null, dimensions_width_cm: null,
  dimensions_height_cm: null, seat_height_cm: null, weight_kg: null,
  is_outdoor: true, is_stackable: false, is_chr_heavy_use: false,
  uv_resistant: false, weather_resistant: false, fire_retardant: false,
  lightweight: false, easy_maintenance: false, customizable: false,
  dismountable: false, requires_assembly: false,
  country_of_manufacture: "", warranty: "", maintenance_info: "",
  stock_status: "available", stock_quantity: null, estimated_delivery_days: null,
  price_min: null, price_max: null,
  popularity_score: 0.5, priority_score: 0.5, data_quality_score: 0,
  availability_type: "available", brand_source: "", supplier_internal: "",
  documents: [], table_shape: null, default_seating_capacity: null,
  recommended_seating_min: null, recommended_seating_max: null,
  combinable: false, combined_capacity_if_joined: null,
  archetype_id: null, archetype_confidence: null,
  product_type_tags: {}, color_variants: [],
  publish_status: "draft",
});

// ═══════════════════════════════════════════════════════════
// DATA QUALITY SCORE INDICATOR
// ═══════════════════════════════════════════════════════════

function DataQualityBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const tier =
    pct >= 80 ? { label: "Excellent", color: "text-green-700", bg: "bg-green-500/10 border-green-500/20", bar: "bg-green-500" } :
    pct >= 60 ? { label: "Good",      color: "text-blue-700",  bg: "bg-blue-500/10 border-blue-500/20",  bar: "bg-blue-500"  } :
    pct >= 40 ? { label: "Fair",      color: "text-amber-700", bg: "bg-amber-500/10 border-amber-500/20",bar: "bg-amber-500" } :
                { label: "Incomplete",color: "text-red-700",   bg: "bg-red-500/10 border-red-500/20",    bar: "bg-red-500"   };

  return (
    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-[10px] font-display font-semibold ${tier.bg} ${tier.color}`}>
      <div className="w-16 h-1.5 bg-black/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${tier.bar}`} style={{ width: `${pct}%` }} />
      </div>
      {pct}% — {tier.label}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAG INPUT WITH AUTOCOMPLETE
// ═══════════════════════════════════════════════════════════

function TagInput({
  label, value, onChange, suggestions = [], placeholder,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filtered = suggestions.filter(
    s => s.includes(input.toLowerCase()) && !value.includes(s)
  ).slice(0, 8);

  const addTag = (tag: string) => {
    const clean = tag.trim().toLowerCase();
    if (clean && !value.includes(clean)) {
      onChange([...value, clean]);
    }
    setInput("");
    setShowSuggestions(false);
  };

  const removeTag = (tag: string) => onChange(value.filter(t => t !== tag));

  return (
    <div>
      <label className="text-xs font-body text-muted-foreground block mb-1">{label}</label>
      <div className="relative">
        <div className="flex flex-wrap gap-1 min-h-[38px] bg-card border border-border rounded-lg px-3 py-2 focus-within:border-foreground/40">
          {value.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 text-[10px] bg-foreground/10 text-foreground px-2 py-0.5 rounded">
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500">
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
          <input
            value={input}
            onChange={e => { setInput(e.target.value); setShowSuggestions(true); }}
            onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); if (input) addTag(input); } }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder={value.length === 0 ? (placeholder || "Type + Enter") : ""}
            className="flex-1 min-w-[80px] bg-transparent text-sm font-body outline-none"
          />
        </div>
        {showSuggestions && filtered.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-20 bg-background border border-border rounded-lg shadow-md mt-1 max-h-40 overflow-y-auto">
            {filtered.map(s => (
              <button
                key={s} type="button"
                onMouseDown={() => addTag(s)}
                className="w-full text-left px-3 py-1.5 text-xs font-body hover:bg-card transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DYNAMIC PRODUCT TYPE TAGS FORM
// Fields change based on category
// ═══════════════════════════════════════════════════════════

function ProductTypeTagsForm({
  category, value, onChange,
}: {
  category: string;
  value: ProductTypeTags;
  onChange: (v: ProductTypeTags) => void;
}) {
  const cat = category.toLowerCase();
  const set = (key: string, val: unknown) => onChange({ ...value, [key]: val });

  const Field = ({ label, field, type = "text", options }: {
    label: string; field: string; type?: string; options?: string[];
  }) => (
    <div>
      <label className="text-[10px] font-body text-muted-foreground block mb-1">{label}</label>
      {options ? (
        <select
          value={value[field] ?? ""}
          onChange={e => set(field, e.target.value || undefined)}
          className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:border-foreground/40"
        >
          <option value="">—</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={value[field] ?? ""}
          onChange={e => set(field, type === "number" ? (e.target.value ? Number(e.target.value) : undefined) : e.target.value || undefined)}
          className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:border-foreground/40"
        />
      )}
    </div>
  );

  const BoolField = ({ label, field }: { label: string; field: string }) => (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={Boolean(value[field])}
        onChange={e => set(field, e.target.checked)}
        className="rounded"
      />
      <span className="text-xs font-body text-foreground">{label}</span>
    </label>
  );

  // ── Chairs, Armchairs, Bar Stools, Benches ──
  if (cat.includes("chair") || cat.includes("armchair") || cat.includes("stool") || cat.includes("bench")) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Field label="Silhouette" field="silhouette"
          options={["bistrot","4-leg","sled","cantilever","lounge","shell","cross-back","ghost","folding","tulip","stacking"]} />
        <Field label="Frame material" field="frame_material"
          options={["alu-powder","alu-raw","teak-fsc","acacia","pp-gf","pp-standard","steel-epoxy","steel-raw","cast-iron","resin-hdpe","rattan-nat","oak","fiberglass","bamboo","hdpe"]} />
        <Field label="Seat type" field="seat_type"
          options={["pp-shell","rope-woven","textilene","cushion","integrated-cush","solid-teak","solid-alu","rattan-woven","wood-slats","mesh","perforated-alu","fabric-stretch"]} />
        <Field label="Arm type" field="arm_type"
          options={["no-arms","low-arms","full-arms","integrated"]} />
        <Field label="Back height" field="back_height"
          options={["no-back","low","mid","high"]} />
        <Field label="Comfort tier" field="comfort_tier"
          options={["functional","comfortable","premium-comfort"]} />
        <Field label="Stack max" field="stack_max" type="number" />
        <Field label="Seat height (cm)" field="seat_height_cm" type="number" />
        <Field label="Weight (kg)" field="weight_kg" type="number" />
        <Field label="Cushion type" field="cushion_type"
          options={["quick-dry","removable","waterproof","integrated","sunbrella-cush","none"]} />
        {cat.includes("stool") && <BoolField label="Has footrest" field="footrest" />}
      </div>
    );
  }

  // ── Tables ──
  if (cat.includes("table")) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Field label="Table type *" field="table_type"
          options={["complete","base-only","top-only"]} />
        <Field label="Dimension tag *" field="dimension_tag"
          options={["60x60","70x70","80x80","120x70","120x80","160x80","200x90","o60","o80","o120","70x70h","80x80h","120x60h","o60h","o80h"]} />
        <Field label="Shape" field="shape"
          options={["square","rectangular","round","oval"]} />
        <Field label="Height type" field="height_type"
          options={["dining","coffee","high-bar","console"]} />
        <Field label="Top material" field="top_material"
          options={["hpl","teak","alu-top","ceramic","marble-effect","werzalit","compact","glass","concrete","melamine","acacia-top","resin-top","iroko","oak-top","granite-effect","bamboo-top"]} />
        <Field label="Base type" field="base_type"
          options={["pedestal","4-leg","bistrot-base","folding-base","x-frame","tulip-base","h-frame","trestle"]} />
        <Field label="Capacity (covers)" field="capacity_covers" type="number" />
        <Field label="Edge finish" field="edge_finish"
          options={["square","beveled","rounded"]} />
      </div>
    );
  }

  // ── Parasols ──
  if (cat.includes("parasol") || cat.includes("shade")) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Field label="Parasol type *" field="parasol_type"
          options={["centre-pole","cantilever","wall-mounted","sail","pergola","giant"]} />
        <Field label="Diameter (m) *" field="diameter_m" type="number" />
        <Field label="Shape" field="shape"
          options={["round","square","rectangular","hexagonal"]} />
        <Field label="Covers seats *" field="covers_seats" type="number" />
        <Field label="Wind Beaufort *" field="wind_beaufort" type="number" />
        <Field label="UPF rating" field="upf_rating"
          options={["40","50+"]} />
        <Field label="Base weight (kg)" field="base_weight_kg" type="number" />
        <Field label="Tilt type" field="tilt_type"
          options={["fixed","manual-tilt","auto-tilt"]} />
        <Field label="Pole material" field="pole_material"
          options={["alu","wood","steel","fiberglass"]} />
        <Field label="Fabric material" field="fabric_material"
          options={["acrylic","polyester","sunbrella","batyline","olefin"]} />
        <Field label="Opening type" field="opening_type"
          options={["manual","crank","pulley"]} />
      </div>
    );
  }

  // ── Sun Loungers / Daybeds ──
  if (cat.includes("lounger") || cat.includes("daybed") || cat.includes("sun")) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Field label="Frame material" field="frame_material"
          options={["alu-powder","steel-epoxy","teak-fsc","resin-hdpe"]} />
        <Field label="Cushion type" field="cushion_type"
          options={["quick-dry","removable","waterproof","integrated","sunbrella-cush","none"]} />
        <Field label="Positions" field="positions" type="number" />
        <Field label="Weight capacity (kg)" field="weight_capacity_kg" type="number" />
        <BoolField label="Has wheels" field="has_wheels" />
        <BoolField label="Has towel bar" field="has_towel_bar" />
        <BoolField label="Has side table" field="has_side_table" />
        <BoolField label="Is daybed (2 persons)" field="is_daybed" />
      </div>
    );
  }

  // ── Sofas / Lounge Seating ──
  if (cat.includes("sofa") || cat.includes("lounge")) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Field label="Frame material" field="frame_material"
          options={["alu-powder","teak-fsc","resin-hdpe","steel-epoxy"]} />
        <Field label="Seat type" field="seat_type"
          options={["cushion","rope-woven","textilene","integrated-cush"]} />
        <Field label="Seats" field="seats" type="number" />
        <Field label="Cushion type" field="cushion_type"
          options={["sunbrella-cush","quick-dry","removable","waterproof","integrated","none"]} />
        <BoolField label="Modular" field="is_modular" />
        <BoolField label="Has chaise" field="has_chaise" />
      </div>
    );
  }

  // ── Accessories ──
  if (cat.includes("accessor")) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Field label="Accessory type" field="accessory_type"
          options={["cushion","back-cushion","cover","parasol-base","side-table","tray","planter","screen","weight-bag","umbrella-cover","floor-anchor"]} />
      </div>
    );
  }

  return (
    <p className="text-xs font-body text-muted-foreground italic">
      Select a category to see type-specific fields.
    </p>
  );
}

// ═══════════════════════════════════════════════════════════
// FULL PRODUCT FORM (redesigned)
// ═══════════════════════════════════════════════════════════

function ProductForm({
  initial, onSave, onCancel,
}: {
  initial: ProductFormData;
  onSave: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ProductFormData>(initial);
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<string>("basics");

  const { data: partnersList = [] } = useQuery({
    queryKey: ["partners-list"],
    queryFn: async () => {
      const { data } = await supabase.from("partners").select("id, name, slug").order("name");
      return data || [];
    },
    staleTime: 1000 * 60 * 10,
  });

  const { data: tagDefs = [] } = useQuery<TagDefinition[]>({
    queryKey: ["tag_definitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tag_definitions")
        .select("tag_type, slug, label_en, label_fr, label_it, label_es, label_de, label_nl")
        .order("slug");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 10,
  });

  const suggestions = useCallback((tagType: string) =>
    tagDefs.filter(t => t.tag_type === tagType).map(t => t.slug),
  [tagDefs]);

  const set = (key: keyof ProductFormData, val: unknown) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const previewScore = (() => {
    let s = 0;
    if (form.archetype_id) s += 0.20;
    const pttKeys = Object.keys(form.product_type_tags || {}).filter(k => form.product_type_tags[k] != null).length;
    if (pttKeys >= 4) s += 0.15;
    if (form.image_url) s += 0.10;
    if (form.gallery_urls.length >= 1) s += 0.05;
    if (form.price_min != null) s += 0.10;
    if (form.use_case_tags.length >= 3) s += 0.10;
    if (form.style_tags.length >= 2) s += 0.10;
    if (form.dimensions_length_cm != null) s += 0.05;
    if (form.dimensions_width_cm != null) s += 0.05;
    if (form.main_color) s += 0.05;
    if (form.warranty) s += 0.05;
    return Math.min(Math.round(s * 100) / 100, 1);
  })();

  const handleSave = async (overrides?: Partial<ProductFormData>) => {
    if (!form.name || !form.category) {
      toast.error("Le nom et la catégorie sont requis");
      return;
    }
    setSaving(true);
    try { await onSave({ ...form, ...overrides }); } finally { setSaving(false); }
  };

  const handleSubmitForReview = () => { handleSave({ publish_status: "pending_review" }); };

  const SECTIONS = [
    { id: "basics",    label: "Informations",       icon: Package },
    { id: "media",     label: "Médias",             icon: Eye },
    { id: "tags",      label: "Tags",               icon: Star },
    { id: "typetags",  label: "Tags spécifiques",   icon: ClipboardList },
    { id: "pricing",   label: "Prix & Stock",       icon: CreditCard },
    { id: "dims",      label: "Dimensions",         icon: FileText },
    { id: "technical", label: "Technique",          icon: Settings },
  ];

  const inputClass = "w-full bg-white border border-border rounded-xl px-4 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/40 transition-all";
  const labelClass = "text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5";

  const renderInput = (label: string, field: keyof ProductFormData, type = "text", required = false) => (
    <div>
      <label className={labelClass}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input
        type={type}
        value={String(form[field] ?? "")}
        onChange={e => set(field, type === "number" ? (e.target.value ? Number(e.target.value) : null) : e.target.value)}
        className={inputClass}
      />
    </div>
  );

  const renderSelect = (label: string, field: keyof ProductFormData, options: string[], required = false) => (
    <div>
      <label className={labelClass}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <select value={String(form[field] ?? "")} onChange={e => set(field, e.target.value)} className={inputClass}>
        <option value="">—</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const renderToggle = (label: string, field: keyof ProductFormData) => (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div
        onClick={() => set(field, !form[field])}
        className={`relative w-9 h-5 rounded-full transition-colors ${form[field] ? "bg-green-500" : "bg-border group-hover:bg-muted-foreground/30"}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form[field] ? "translate-x-4" : ""}`} />
      </div>
      <span className="text-xs font-body text-foreground">{label}</span>
    </label>
  );

  const SectionHeader = ({ icon: Icon, title, description }: { icon: typeof Package; title: string; description: string }) => (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0">
        <Icon className="h-4.5 w-4.5 text-foreground/60" />
      </div>
      <div>
        <h3 className="font-display text-sm font-bold text-foreground">{title}</h3>
        <p className="text-[11px] font-body text-muted-foreground">{description}</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:border-foreground/30 transition-colors">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">
              {form.id ? "Modifier le produit" : "Nouveau produit"}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <DataQualityBadge score={previewScore} />
              {form.publish_status && (
                <span className={`text-[9px] font-display font-semibold px-2 py-0.5 rounded-full ${
                  form.publish_status === "published" ? "bg-green-50 text-green-700" :
                  form.publish_status === "pending_review" ? "bg-amber-50 text-amber-700" :
                  form.publish_status === "rejected" ? "bg-red-50 text-red-700" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {form.publish_status === "published" ? "Publié" :
                   form.publish_status === "pending_review" ? "En attente" :
                   form.publish_status === "rejected" ? "Rejeté" : "Brouillon"}
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Live image preview */}
        {form.image_url && (
          <img src={form.image_url} alt="" className="w-16 h-16 rounded-xl object-cover border border-border" />
        )}
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto border-b border-border pb-px">
        {SECTIONS.map(s => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-display font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${
                section === s.id
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* ── Basics ── */}
      {section === "basics" && (
        <div className="space-y-6">
          <SectionHeader icon={Package} title="Informations générales" description="Nom, catégorie, marque et descriptions du produit" />
          <div className="border border-border rounded-2xl p-5 space-y-4 bg-card/30">
            <div className="grid grid-cols-2 gap-4">
              {renderInput("Nom du produit", "name", "text", true)}
              {renderSelect("Catégorie", "category", CATEGORIES, true)}
              {renderInput("Sous-catégorie", "subcategory")}
              {renderInput("Famille produit", "product_family")}
              {renderInput("Marque / Source", "brand_source")}
              <div>
                <label className={labelClass}>Partenaire</label>
                <select
                  value={partnersList.find(p => p.slug === form.supplier_internal)?.id ?? ""}
                  onChange={e => {
                    const partner = partnersList.find(p => p.id === e.target.value);
                    set("supplier_internal", partner ? partner.slug : "");
                  }}
                  className={inputClass}
                >
                  <option value="">— Aucun partenaire —</option>
                  {partnersList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {renderInput("Collection", "collection")}
              {renderInput("Pays de fabrication", "country_of_manufacture")}
            </div>
          </div>

          <div className="border border-border rounded-2xl p-5 space-y-4 bg-card/30">
            <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">Descriptions</p>
            <div>
              <label className={labelClass}>Description courte</label>
              <textarea value={form.short_description || ""} onChange={e => set("short_description", e.target.value)} rows={2}
                className={`${inputClass} resize-none rounded-xl`} placeholder="Résumé en 1-2 phrases..." />
            </div>
            <div>
              <label className={labelClass}>Description longue</label>
              <textarea value={form.long_description || ""} onChange={e => set("long_description", e.target.value)} rows={5}
                className={`${inputClass} resize-none rounded-xl`} placeholder="Description détaillée du produit..." />
            </div>
          </div>

          <div className="border border-border rounded-2xl p-5 space-y-4 bg-card/30">
            <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">Informations complémentaires</p>
            <div className="grid grid-cols-2 gap-4">
              {renderInput("Prix indicatif (affichage)", "indicative_price")}
              {renderInput("Garantie", "warranty")}
              {renderInput("Infos entretien", "maintenance_info")}
              {renderInput("Fournisseur (interne)", "supplier_internal")}
            </div>
          </div>
        </div>
      )}

      {/* ── Media ── */}
      {section === "media" && (
        <div className="space-y-6">
          <SectionHeader icon={Eye} title="Photos & Médias" description="Image principale, galerie et couleurs" />

          <div className="border border-border rounded-2xl p-5 space-y-4 bg-card/30">
            <div>
              <label className={labelClass}>URL image principale</label>
              <input type="text" value={form.image_url || ""} onChange={e => set("image_url", e.target.value)}
                className={inputClass} placeholder="https://..." />
            </div>
            {form.image_url && (
              <div className="flex justify-center">
                <img src={form.image_url} alt="Preview" className="max-w-xs max-h-48 rounded-xl border border-border object-cover" />
              </div>
            )}

            <div>
              <label className={labelClass}>Galerie photos (URLs séparées par des virgules)</label>
              <textarea
                value={form.gallery_urls.join(", ")}
                onChange={e => set("gallery_urls", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                rows={2} className={`${inputClass} resize-none rounded-xl`} placeholder="https://..., https://..." />
            </div>
            {form.gallery_urls.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {form.gallery_urls.map((url, i) => (
                  <img key={i} src={url} alt="" className="w-20 h-20 rounded-lg border border-border object-cover shrink-0" />
                ))}
              </div>
            )}
          </div>

          <div className="border border-border rounded-2xl p-5 space-y-4 bg-card/30">
            <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">Couleurs</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Couleur principale</label>
                <select value={form.main_color || ""} onChange={e => set("main_color", e.target.value)} className={inputClass}>
                  <option value="">—</option>
                  {COLOR_SLUGS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Couleur secondaire</label>
                <select value={form.secondary_color || ""} onChange={e => set("secondary_color", e.target.value)} className={inputClass}>
                  <option value="">—</option>
                  {COLOR_SLUGS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Color Variant Editor */}
            <ColorVariantEditor
              value={form.color_variants as ColorVariant[]}
              onChange={(variants: ColorVariant[]) => {
                set("color_variants", variants);
                const availableSlugs = variants.filter(v => v.available).map(v => v.color_slug).filter(Boolean);
                set("available_colors", availableSlugs);
                if (variants.length > 0 && variants[0].color_slug) {
                  set("main_color", variants[0].color_slug);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* ── Tags ── */}
      {section === "tags" && (
        <div className="space-y-6">
          <SectionHeader icon={Star} title="Tags & Étiquettes" description="Tapez et appuyez Entrée pour ajouter des tags. Les suggestions apparaissent automatiquement." />
          <div className="border border-border rounded-2xl p-5 space-y-5 bg-card/30">
            <TagInput label="Tags de style" value={form.style_tags}
              onChange={v => set("style_tags", v)} suggestions={suggestions("style")}
              placeholder="mediterranean, modern, bistro..." />
            <TagInput label="Tags d'ambiance" value={form.ambience_tags}
              onChange={v => set("ambience_tags", v)} suggestions={suggestions("ambience")}
              placeholder="warm, convivial, elegant..." />
            <TagInput label="Tags de palette" value={form.palette_tags}
              onChange={v => set("palette_tags", v)} suggestions={suggestions("palette")}
              placeholder="warm, natural, cool..." />
            <TagInput label="Tags de matériau" value={form.material_tags}
              onChange={v => set("material_tags", v)} suggestions={suggestions("material")}
              placeholder="aluminium, teak, rope..." />
            <TagInput label="Tags d'usage" value={form.use_case_tags}
              onChange={v => set("use_case_tags", v)} suggestions={suggestions("use_case")}
              placeholder="restaurant-terrace, rooftop, beach-club..." />
            <TagInput label="Tags techniques" value={form.technical_tags}
              onChange={v => set("technical_tags", v)} suggestions={suggestions("technical")}
              placeholder="stackable, uv-resistant, chr-heavy-use..." />
          </div>
          <div className="border border-border rounded-2xl p-5 space-y-4 bg-card/30">
            <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">Matériaux (affichage)</p>
            <div className="grid grid-cols-2 gap-4">
              {renderInput("Structure", "material_structure")}
              {renderInput("Assise", "material_seat")}
            </div>
          </div>
        </div>
      )}

      {/* ── Type-specific tags ── */}
      {section === "typetags" && (
        <div className="space-y-6">
          <SectionHeader icon={ClipboardList} title="Tags spécifiques à la catégorie" description="Champs dynamiques selon la catégorie sélectionnée" />
          {!form.category ? (
            <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm font-body text-amber-700">Sélectionnez d'abord une catégorie dans l'onglet Informations.</p>
            </div>
          ) : (
            <div className="border border-border rounded-2xl p-5 bg-card/30">
              <ProductTypeTagsForm
                category={form.category}
                value={form.product_type_tags}
                onChange={v => set("product_type_tags", v)}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Pricing & Stock ── */}
      {section === "pricing" && (
        <div className="space-y-6">
          <SectionHeader icon={CreditCard} title="Prix & Stock" description="Tarification, disponibilité et scores de visibilité" />
          <div className="border border-border rounded-2xl p-5 space-y-4 bg-card/30">
            <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">Tarification</p>
            <div className="grid grid-cols-2 gap-4">
              {renderInput("Prix min (€)", "price_min", "number")}
              {renderInput("Prix max (€)", "price_max", "number")}
            </div>
          </div>
          <div className="border border-border rounded-2xl p-5 space-y-4 bg-card/30">
            <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">Disponibilité</p>
            <div className="grid grid-cols-2 gap-4">
              {renderSelect("Type de disponibilité", "availability_type", AVAILABILITY_OPTIONS)}
              {renderSelect("Statut stock", "stock_status", STOCK_STATUS_OPTIONS)}
              {renderInput("Quantité en stock", "stock_quantity", "number")}
              {renderInput("Délai de livraison (jours)", "estimated_delivery_days", "number")}
            </div>
          </div>
          <div className="border border-border rounded-2xl p-5 space-y-4 bg-card/30">
            <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">Scores de visibilité</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Score de popularité</label>
                <div className="flex items-center gap-3">
                  <input type="range" min="0" max="1" step="0.05" value={form.popularity_score}
                    onChange={e => set("popularity_score", Number(e.target.value))} className="flex-1 accent-foreground" />
                  <span className="text-sm font-display font-bold text-foreground w-10 text-right">{Math.round(form.popularity_score * 100)}%</span>
                </div>
              </div>
              <div>
                <label className={labelClass}>Score de priorité</label>
                <div className="flex items-center gap-3">
                  <input type="range" min="0" max="1" step="0.05" value={form.priority_score}
                    onChange={e => set("priority_score", Number(e.target.value))} className="flex-1 accent-foreground" />
                  <span className="text-sm font-display font-bold text-foreground w-10 text-right">{Math.round(form.priority_score * 100)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Dimensions ── */}
      {section === "dims" && (
        <div className="space-y-6">
          <SectionHeader icon={FileText} title="Dimensions & Capacité" description="Mesures physiques du produit et capacité d'assise" />
          <div className="border border-border rounded-2xl p-5 space-y-4 bg-card/30">
            <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">Mesures</p>
            <div className="grid grid-cols-3 gap-4">
              {renderInput("Longueur (cm)", "dimensions_length_cm", "number")}
              {renderInput("Largeur (cm)", "dimensions_width_cm", "number")}
              {renderInput("Hauteur (cm)", "dimensions_height_cm", "number")}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {renderInput("Hauteur assise (cm)", "seat_height_cm", "number")}
              {renderInput("Poids (kg)", "weight_kg", "number")}
            </div>
          </div>
          <div className="border border-border rounded-2xl p-5 space-y-4 bg-card/30">
            <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">Capacité d'assise</p>
            <div className="grid grid-cols-2 gap-4">
              {renderSelect("Forme table", "table_shape", ["square","rectangular","round","oval"])}
              {renderInput("Places par défaut", "default_seating_capacity", "number")}
              {renderInput("Places min", "recommended_seating_min", "number")}
              {renderInput("Places max", "recommended_seating_max", "number")}
            </div>
            <div className="flex gap-6 flex-wrap pt-2">
              {renderToggle("Combinable", "combinable")}
            </div>
            {form.combinable && renderInput("Capacité si combiné", "combined_capacity_if_joined", "number")}
          </div>
        </div>
      )}

      {/* ── Technical booleans ── */}
      {section === "technical" && (
        <div className="space-y-6">
          <SectionHeader icon={Settings} title="Caractéristiques techniques" description="Propriétés techniques et certifications du produit" />
          <div className="border border-border rounded-2xl p-5 bg-card/30">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {([
                ["is_outdoor",        "Extérieur"],
                ["is_stackable",      "Empilable"],
                ["is_chr_heavy_use",  "Usage CHR intensif"],
                ["uv_resistant",      "Anti-UV"],
                ["weather_resistant", "Résistant intempéries"],
                ["fire_retardant",    "Anti-feu"],
                ["lightweight",       "Léger"],
                ["easy_maintenance",  "Entretien facile"],
                ["customizable",      "Personnalisable"],
                ["dismountable",      "Démontable"],
                ["requires_assembly", "Assemblage requis"],
              ] as [keyof ProductFormData, string][]).map(([field, label]) => (
                <div key={field} className="py-1">{renderToggle(label, field)}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer actions — sticky */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border mt-8 -mx-1 px-1 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DataQualityBadge score={previewScore} />
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="px-5 py-2.5 font-display font-semibold text-sm border border-border rounded-xl hover:border-foreground/30 transition-colors">
            Annuler
          </button>
          {(!form.id || form.publish_status === "draft") && previewScore >= 0.4 && (
            <button onClick={handleSubmitForReview} disabled={saving || !form.name || !form.category}
              className="flex items-center gap-2 px-5 py-2.5 font-display font-semibold text-sm border border-amber-300 text-amber-700 bg-amber-50 rounded-xl hover:bg-amber-100 disabled:opacity-50 transition-colors">
              <Eye className="h-4 w-4" />
              {saving ? "Envoi..." : "Soumettre pour validation"}
            </button>
          )}
          <button onClick={() => handleSave()} disabled={saving || !form.name || !form.category}
            className="flex items-center gap-2 px-6 py-2.5 font-display font-bold text-sm bg-foreground text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-50 transition-colors shadow-sm">
            <Save className="h-4 w-4" />
            {saving ? "Enregistrement..." : form.id ? "Mettre à jour" : "Enregistrer brouillon"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PRODUCTS TAB
// ═══════════════════════════════════════════════════════════

type PublishFilter = "all" | "draft" | "pending_review" | "published" | "rejected";

const PUBLISH_BADGE: Record<string, string> = {
  published:      "bg-green-50 text-green-700",
  pending_review: "bg-amber-50 text-amber-700",
  draft:          "bg-muted text-muted-foreground",
  rejected:       "bg-red-50 text-red-700",
};

function ProductsTab() {
  const { data: products = [], isLoading } = useProducts();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ProductFormData | null>(null);
  const [filter, setFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<PublishFilter>("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showMerge, setShowMerge] = useState(false);
  const [mergeInitialSource, setMergeInitialSource] = useState<DBProduct | null>(null);

  const filtered = products.filter(p => {
    const matchText = p.name.toLowerCase().includes(filter.toLowerCase()) ||
      p.category.toLowerCase().includes(filter.toLowerCase());
    const matchCat = !catFilter || p.category === catFilter;
    const matchStatus = statusFilter === "all" || p.publish_status === statusFilter;
    return matchText && matchCat && matchStatus;
  });

  const handleSave = async (data: ProductFormData) => {
    const { id, publish_status, ...rest } = data;
    const dbData = {
      ...rest,
      color_variants:    rest.color_variants as unknown as Json,
      product_type_tags: rest.product_type_tags as unknown as Json,
      documents:         rest.documents as unknown as Json,
      publish_status:    undefined as string | undefined,
    };
    // New products default to draft; existing keep their status unless explicitly changed
    if (!id) {
      dbData.publish_status = publish_status || "draft";
    } else if (publish_status) {
      dbData.publish_status = publish_status;
    }
    try {
      if (id) {
        const { error } = await supabase.from("products").update(dbData).eq("id", id);
        if (error) throw error;
        toast.success("Produit mis a jour");
      } else {
        const { error } = await supabase.from("products").insert(dbData);
        if (error) throw error;
        toast.success("Produit cree");
      }
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setEditing(null);
    } catch (err: any) {
      toast.error(err.message || "Echec de l'enregistrement");
      throw err;
    }
  };

  const handlePublishAction = async (productId: string, newStatus: string) => {
    try {
      const { error } = await supabase.from("products").update({ publish_status: newStatus }).eq("id", productId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(newStatus === "published" ? "Produit publie" : "Produit rejete");

      // Notify the partner who owns this product
      const product = products.find((p: any) => p.id === productId);
      if (product?.partner_id) {
        const { data: partnerProfile } = await supabase.from("user_profiles").select("id").eq("id", product.partner_id).maybeSingle();
        if (partnerProfile) {
          const body = newStatus === "published"
            ? `Votre produit ${product.name} a été publié`
            : `Votre produit ${product.name} a été rejeté`;
          await supabase.from("notifications").insert({
            user_id: partnerProfile.id,
            title: newStatus === "published" ? "Produit publié" : "Produit rejeté",
            body,
            type: "info",
            link: "/account?tab=products",
          });
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Echec de la mise a jour");
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produit supprime");
    } catch (err: any) {
      toast.error(err.message || "Echec de la suppression");
    } finally {
      setDeleting(null);
      setConfirmDeleteId(null);
    }
  };

  if (editing) {
    return (
      <ProductForm
        initial={editing}
        onSave={handleSave}
        onCancel={() => setEditing(null)}
      />
    );
  }

  const statusLabels: Record<string, string> = {
    published: "Publié", pending_review: "En attente", draft: "Brouillon", rejected: "Rejeté",
  };

  const statusCounts = {
    all: products.length,
    draft: products.filter(p => p.publish_status === "draft" || !p.publish_status).length,
    pending_review: products.filter(p => p.publish_status === "pending_review").length,
    published: products.filter(p => p.publish_status === "published").length,
    rejected: products.filter(p => p.publish_status === "rejected").length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            <Package className="h-5 w-5" />
            Catalogue produits
          </h2>
          <p className="text-xs font-body text-muted-foreground mt-0.5">
            {products.length} produit{products.length > 1 ? "s" : ""} au total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setMergeInitialSource(null); setShowMerge(true); }}
            className="flex items-center gap-2 px-5 py-2.5 font-display font-bold text-sm border-2 border-blue-500 text-blue-600 rounded-xl hover:bg-blue-50 transition-all"
          >
            <Merge className="h-4 w-4" /> Fusionner des produits
          </button>
          <button
            onClick={() => setEditing(emptyProduct())}
            className="flex items-center gap-2 px-5 py-2.5 font-display font-bold text-sm bg-foreground text-primary-foreground rounded-xl hover:opacity-90 shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" /> Ajouter un produit
          </button>
        </div>
      </div>

      {/* Search & filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text" value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Rechercher par nom ou catégorie..."
            className="w-full bg-white border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/40 transition-all"
          />
        </div>
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="bg-white border border-border rounded-xl px-4 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/40 transition-all"
        >
          <option value="">Toutes les catégories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1.5 border-b border-border pb-px">
        {([
          { id: "all",            label: "Tous" },
          { id: "published",      label: "Publiés" },
          { id: "pending_review", label: "En attente" },
          { id: "draft",          label: "Brouillons" },
          { id: "rejected",       label: "Rejetés" },
        ] as { id: PublishFilter; label: string }[]).map(f => (
          <button key={f.id} onClick={() => setStatusFilter(f.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-display font-semibold border-b-2 -mb-px transition-colors ${
              statusFilter === f.id
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {f.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${
              statusFilter === f.id ? "bg-foreground text-primary-foreground" : "bg-foreground/10"
            }`}>
              {statusCounts[f.id]}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 mx-auto rounded-full bg-foreground/5 flex items-center justify-center mb-3">
            <Package className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-body text-muted-foreground">
            {products.length === 0 ? "Aucun produit. Ajoutez votre premier produit." : "Aucun produit ne correspond à votre recherche."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(product => {
            const price = product.price_min ? `${product.price_min.toLocaleString("fr-FR")}€` : product.indicative_price || null;
            const qualityPct = Math.round(product.data_quality_score * 100);
            const qualityColor = qualityPct >= 80 ? "text-green-600" : qualityPct >= 50 ? "text-amber-600" : "text-red-500";

            return (
              <div key={product.id} className="border border-border rounded-2xl bg-card overflow-hidden hover:border-foreground/15 hover:shadow-md transition-all group">
                {/* Image */}
                <div className="relative aspect-[4/3] bg-foreground/5 overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-10 w-10 text-muted-foreground/20" />
                    </div>
                  )}
                  {/* Status badge overlay */}
                  <div className="absolute top-3 left-3">
                    <span className={`text-[10px] font-display font-bold px-2.5 py-1 rounded-lg backdrop-blur-sm ${
                      product.publish_status === "published" ? "bg-green-500/90 text-white" :
                      product.publish_status === "pending_review" ? "bg-amber-500/90 text-white" :
                      product.publish_status === "rejected" ? "bg-red-500/90 text-white" :
                      "bg-black/50 text-white"
                    }`}>
                      {statusLabels[product.publish_status] || "Brouillon"}
                    </span>
                  </div>
                  {/* Quality score overlay */}
                  <div className="absolute top-3 right-3">
                    <span className={`text-[10px] font-display font-bold px-2 py-1 rounded-lg bg-white/90 backdrop-blur-sm ${qualityColor}`}>
                      {qualityPct}%
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h3 className="font-display text-sm font-bold text-foreground truncate">{product.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-display font-semibold text-muted-foreground bg-foreground/5 px-2 py-0.5 rounded-md">
                          {product.category}
                        </span>
                        {product.main_color && (
                          <span className="text-[10px] font-body text-muted-foreground">{product.main_color}</span>
                        )}
                      </div>
                      {/* Color variant pastilles */}
                      {(product.color_variants ?? []).length > 0 && (
                        <div className="flex items-center gap-0.5 mt-1">
                          {(product.color_variants as ColorVariant[]).slice(0, 6).map((v, i) => (
                            <div key={i} className="w-3.5 h-3.5 rounded-full border border-border shadow-sm" style={{ backgroundColor: v.color_hex }} title={v.label_en} />
                          ))}
                          {(product.color_variants as ColorVariant[]).length > 6 && (
                            <span className="text-[8px] font-body text-muted-foreground ml-0.5">+{(product.color_variants as ColorVariant[]).length - 6}</span>
                          )}
                        </div>
                      )}
                    </div>
                    {price && (
                      <span className="text-sm font-display font-bold text-foreground shrink-0">{price}</span>
                    )}
                  </div>

                  {/* Tags preview */}
                  {product.style_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {product.style_tags.slice(0, 3).map(t => (
                        <span key={t} className="text-[9px] font-body text-muted-foreground bg-foreground/5 px-1.5 py-0.5 rounded">{t}</span>
                      ))}
                      {product.style_tags.length > 3 && (
                        <span className="text-[9px] font-body text-muted-foreground">+{product.style_tags.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* Actions row */}
                  <div className="flex items-center gap-2 pt-3 border-t border-border">
                    {product.publish_status === "pending_review" && (
                      <>
                        <button onClick={() => handlePublishAction(product.id, "published")}
                          className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-display font-bold rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors">
                          <CheckCircle2 className="h-3 w-3" /> Publier
                        </button>
                        <button onClick={() => handlePublishAction(product.id, "rejected")}
                          className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-display font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors">
                          <XCircle className="h-3 w-3" /> Rejeter
                        </button>
                      </>
                    )}
                    <div className="flex items-center gap-1 ml-auto">
                      <button onClick={() => { setMergeInitialSource(product); setShowMerge(true); }}
                        className="flex items-center gap-1 px-2.5 h-8 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:border-blue-300 transition-colors"
                        title="Fusionner avec un autre produit">
                        <Merge className="h-3 w-3" />
                        <span className="text-[9px] font-display font-bold">Fusionner</span>
                      </button>
                      <button onClick={() => setEditing({ ...product })}
                        className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                        title="Modifier">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setConfirmDeleteId(product.id)} disabled={deleting === product.id}
                        className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-red-500 hover:border-red-300 transition-colors disabled:opacity-50"
                        title="Supprimer">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="font-display font-bold text-sm text-foreground text-center mb-1">Supprimer ce produit ?</h3>
            <p className="text-xs font-body text-muted-foreground text-center mb-6">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)}
                className="flex-1 px-4 py-2.5 text-xs font-display font-semibold border border-border rounded-xl hover:border-foreground/30 transition-colors">
                Annuler
              </button>
              <button onClick={() => handleDelete(confirmDeleteId)} disabled={!!deleting}
                className="flex-1 px-4 py-2.5 text-xs font-display font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors">
                {deleting ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product merge dialog */}
      {showMerge && (
        <ProductMergeDialog
          initialSource={mergeInitialSource}
          products={products}
          onClose={() => { setShowMerge(false); setMergeInitialSource(null); }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// EXISTING TABS (unchanged)
// ═══════════════════════════════════════════════════════════

const STATUS_BADGE: Record<string, string> = {
  pending:   "bg-amber-50 text-amber-700 border border-amber-200",
  confirmed: "bg-green-50 text-green-700 border border-green-200",
  rejected:  "bg-red-50 text-red-700 border border-red-200",
  shipped:   "bg-blue-50 text-blue-700 border border-blue-200",
  approved:  "bg-green-50 text-green-700 border border-green-200",
  suspended: "bg-red-50 text-red-700 border border-red-200",
};

const APP_STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  pending:        { label: "En attente",           icon: Clock,           color: "#BA7517", bg: "#FAEEDA" },
  info_requested: { label: "Infos demandées",      icon: AlertTriangle,   color: "#B45309", bg: "#FEF3C7" },
  approved:       { label: "Approuvée",            icon: CheckCircle2,    color: "#085041", bg: "#E1F5EE" },
  rejected:       { label: "Rejetée",              icon: XCircle,         color: "#791F1F", bg: "#FCF0F0" },
  suspended:      { label: "Suspendue",            icon: XCircle,         color: "#791F1F", bg: "#FCF0F0" },
};

const VOLUME_LABELS: Record<string, string> = {
  under_50k:   "Moins de 50 000 €",
  "50k_200k":  "50k – 200k €",
  "200k_500k": "200k – 500k €",
  over_500k:   "Plus de 500 000 €",
};

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
      const { data, error } = await supabase.from("partner_applications").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = filter === "all" ? applications : applications.filter((a: any) => a.status === filter);
  const counts = {
    all: applications.length,
    pending: applications.filter((a: any) => a.status === "pending").length,
    info_requested: applications.filter((a: any) => a.status === "info_requested").length,
    approved: applications.filter((a: any) => a.status === "approved").length,
    rejected: applications.filter((a: any) => a.status === "rejected").length,
  };

  const [infoRequestMessage, setInfoRequestMessage] = useState("");
  const [showInfoForm, setShowInfoForm] = useState(false);

  const updateStatus = async (id: string, status: string, reason?: string) => {
    setProcessing(true);
    try {
      const updates: any = { status, reviewed_at: new Date().toISOString() };
      if (reason) updates.rejection_reason = reason;
      const { error } = await supabase.from("partner_applications").update(updates).eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["partner_applications"] });
      queryClient.invalidateQueries({ queryKey: ["partner_applications_pending"] });
      queryClient.invalidateQueries({ queryKey: ["admin_partners"] });
      if (status === "approved") toast.success("Candidature approuvée — le profil partenaire a été créé automatiquement.");
      else if (status === "rejected") toast.success("Candidature rejetée.");
      else if (status === "info_requested") toast.success("Demande d'informations envoyée.");
      setSelected((prev: any) => prev ? { ...prev, status, rejection_reason: reason } : null);
      setShowRejectForm(false);
      setShowInfoForm(false);
      setRejectionReason("");
      setInfoRequestMessage("");
    } catch { toast.error("Erreur lors de la mise à jour."); }
    finally { setProcessing(false); }
  };

  const sendInfoRequest = async (appId: string, message: string) => {
    setProcessing(true);
    try {
      await supabase.from("partner_applications").update({
        status: "info_requested",
        admin_notes: message,
        reviewed_at: new Date().toISOString(),
      }).eq("id", appId);

      // Send email to the applicant
      if (selected?.contact_email) {
        await supabase.functions.invoke("send-notification-email", {
          body: {
            to: selected.contact_email,
            subject: "Terrassea — Informations complémentaires requises",
            body_html: `<p>Bonjour ${selected.contact_name || ""},</p><p>Merci pour votre candidature sur Terrassea. Nous avons besoin d'informations complémentaires :</p><p style="background:#f5f5f5;padding:16px;border-radius:8px;font-style:italic;">${message}</p><p>Merci de répondre à <a href="mailto:contact@terrassea.com">contact@terrassea.com</a></p><p>L'équipe Terrassea</p>`,
            body_text: `Bonjour, nous avons besoin d'informations complémentaires : ${message}. Répondez à contact@terrassea.com`,
          },
        }).catch(() => {});
      }

      queryClient.invalidateQueries({ queryKey: ["partner_applications"] });
      toast.success("Demande d'informations envoyée par email.");
      setSelected((prev: any) => prev ? { ...prev, status: "info_requested", admin_notes: message } : null);
      setShowInfoForm(false);
      setInfoRequestMessage("");
    } catch { toast.error("Erreur lors de l'envoi."); }
    finally { setProcessing(false); }
  };

  if (isLoading) return <p className="text-muted-foreground font-body text-sm">Chargement...</p>;

  if (selected) {
    const cfg = APP_STATUS_CONFIG[selected.status] || APP_STATUS_CONFIG.pending;
    const StatusIcon = cfg.icon;
    return (
      <div>
        <button onClick={() => { setSelected(null); setShowRejectForm(false); }}
          className="flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-3 w-3" /> Retour
        </button>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6" style={{ background: cfg.bg }}>
          <StatusIcon className="h-4 w-4" style={{ color: cfg.color }} />
          <span className="font-display font-semibold text-sm" style={{ color: cfg.color }}>{cfg.label}</span>
          {selected.reviewed_at && (
            <span className="text-[10px] font-body ml-auto" style={{ color: cfg.color }}>
              {new Date(selected.reviewed_at).toLocaleDateString("fr-FR")}
            </span>
          )}
        </div>
        <div className="space-y-5">
          <div className="border border-border rounded-xl p-5">
            <h3 className="font-display font-semibold text-sm text-foreground mb-4">Entreprise</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Entreprise", value: selected.company_name },
                { label: "Contact",    value: selected.contact_name },
                { label: "Email",      value: selected.contact_email },
                { label: "Telephone",  value: selected.phone },
                { label: "Site web",   value: selected.website },
                { label: "TVA",        value: selected.vat_number },
                { label: "Pays",       value: selected.country },
                { label: "Type",       value: selected.partner_type },
                { label: "Volume",     value: VOLUME_LABELS[selected.estimated_annual_volume] || selected.estimated_annual_volume },
              ].filter(({ value }) => value).map(({ label, value }) => (
                <div key={label}>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-body">{label}</span>
                  <p className="text-sm font-body text-foreground">{value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {selected.product_categories?.length > 0 && (
              <div className="border border-border rounded-xl p-4">
                <h3 className="font-display font-semibold text-xs text-foreground mb-2">Categories</h3>

                <div className="flex flex-wrap gap-1">
                  {selected.product_categories.map((c: string) => (
                    <span key={c} className="text-[10px] bg-card border border-border text-muted-foreground px-2 py-0.5 rounded-full">{c}</span>
                  ))}
                </div>
              </div>
            )}
            {selected.delivery_countries?.length > 0 && (
              <div className="border border-border rounded-xl p-4">
                <h3 className="font-display font-semibold text-xs text-foreground mb-2">Pays de livraison</h3>
                <div className="flex flex-wrap gap-1">
                  {selected.delivery_countries.map((c: string) => (
                    <span key={c} className="text-[10px] bg-card border border-border text-muted-foreground px-2 py-0.5 rounded-full">{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          {selected.message && (
            <div className="border border-border rounded-xl p-5">
              <h3 className="font-display font-semibold text-sm text-foreground mb-2">Message</h3>
              <p className="text-sm font-body text-muted-foreground">{selected.message}</p>
            </div>
          )}
          {selected.admin_notes && selected.status === "info_requested" && (
            <div className="border border-amber-200 bg-amber-50 rounded-xl p-4">
              <h3 className="font-display font-semibold text-xs text-amber-800 mb-1">Informations demandées</h3>
              <p className="text-sm font-body text-amber-700">{selected.admin_notes}</p>
            </div>
          )}
          {selected.rejection_reason && (
            <div className="border border-red-200 bg-red-50 rounded-xl p-4">
              <h3 className="font-display font-semibold text-xs text-red-700 mb-1">Motif du rejet</h3>
              <p className="text-sm font-body text-red-600">{selected.rejection_reason}</p>
            </div>
          )}
        </div>
        {(selected.status === "pending" || selected.status === "info_requested") && (
          <div className="space-y-4 mt-6">
            <div className="flex gap-3 flex-wrap">
              <button onClick={() => updateStatus(selected.id, "approved")} disabled={processing}
                className="flex items-center gap-2 px-6 py-2.5 font-display font-semibold text-sm bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50">
                <CheckCircle2 className="h-4 w-4" /> {processing ? "Traitement..." : "Approuver"}
              </button>
              <button onClick={() => { setShowInfoForm(!showInfoForm); setShowRejectForm(false); }} disabled={processing}
                className="flex items-center gap-2 px-6 py-2.5 font-display font-semibold text-sm border border-amber-200 text-amber-700 rounded-full hover:bg-amber-50">
                <AlertTriangle className="h-4 w-4" /> Demander des informations
              </button>
              <button onClick={() => { setShowRejectForm(!showRejectForm); setShowInfoForm(false); }} disabled={processing}
                className="flex items-center gap-2 px-6 py-2.5 font-display font-semibold text-sm border border-red-200 text-red-600 rounded-full hover:bg-red-50">
                <XCircle className="h-4 w-4" /> Rejeter
              </button>
            </div>
            {showInfoForm && (
              <div className="space-y-3 border border-amber-200 bg-amber-50/30 rounded-xl p-4">
                <label className="text-xs font-display font-semibold text-amber-800">Quelles informations souhaitez-vous ?</label>
                <textarea value={infoRequestMessage} onChange={e => setInfoRequestMessage(e.target.value)}
                  rows={3} placeholder="Ex: Pourriez-vous nous fournir votre catalogue produit et vos conditions de livraison ?"
                  className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-sm font-body outline-none focus:border-amber-400 resize-none" />
                <div className="flex gap-2">
                  <button onClick={() => sendInfoRequest(selected.id, infoRequestMessage)} disabled={processing || !infoRequestMessage.trim()}
                    className="px-5 py-2 font-display font-semibold text-xs bg-amber-600 text-white rounded-full hover:bg-amber-700 disabled:opacity-50">
                    Envoyer la demande
                  </button>
                  <button onClick={() => setShowInfoForm(false)}
                    className="px-5 py-2 font-display font-semibold text-xs border border-border text-muted-foreground rounded-full">
                    Annuler
                  </button>
                </div>
              </div>
            )}
            {showRejectForm && (
              <div className="space-y-3 border border-border rounded-xl p-4">
                <label className="text-xs font-body text-muted-foreground">Motif du rejet (optionnel)</label>
                <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                  rows={3} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-body outline-none focus:border-foreground resize-none" />
                <div className="flex gap-2">
                  <button onClick={() => updateStatus(selected.id, "rejected", rejectionReason)} disabled={processing}
                    className="px-5 py-2 font-display font-semibold text-xs bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50">
                    Confirmer le rejet
                  </button>
                  <button onClick={() => setShowRejectForm(false)}
                    className="px-5 py-2 font-display font-semibold text-xs border border-border text-muted-foreground rounded-full">
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {selected.status === "approved" && (
          <button onClick={() => updateStatus(selected.id, "suspended")} disabled={processing}
            className="flex items-center gap-2 px-5 py-2.5 font-display font-semibold text-sm border border-red-200 text-red-600 rounded-full hover:bg-red-50 mt-6">
            Suspendre le partenaire
          </button>
        )}
        {selected.status === "suspended" && (
          <button onClick={() => updateStatus(selected.id, "approved")} disabled={processing}
            className="flex items-center gap-2 px-5 py-2.5 font-display font-semibold text-sm bg-green-600 text-white rounded-full mt-6">
            Reactiver
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-1 mb-6">
        {[
          { id: "all", label: "Toutes" },
          { id: "pending", label: "En attente" },
          { id: "approved", label: "Approuvees" },
          { id: "rejected", label: "Rejetees" },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-display font-semibold rounded-full transition-all ${
              filter === f.id ? "bg-foreground text-primary-foreground" : "border border-border text-muted-foreground hover:border-foreground"
            }`}>
            {f.label}
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${filter === f.id ? "bg-white/20" : "bg-card"}`}>
              {counts[f.id as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-body text-muted-foreground">
            {filter === "all" ? "Aucune candidature." : `Aucune candidature ${filter}.`}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-border">
                {["Date","Entreprise","Contact","Pays","Type","Volume","Statut",""].map(h => (
                  <th key={h} className={`py-3 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-normal ${h === "" ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((app: any) => {
                const c = APP_STATUS_CONFIG[app.status] || APP_STATUS_CONFIG.pending;
                return (
                  <tr key={app.id} className="border-b border-border/50 hover:bg-card/50 transition-colors">
                    <td className="py-3 px-2 text-[10px] text-muted-foreground">{new Date(app.created_at).toLocaleDateString("fr-FR")}</td>
                    <td className="py-3 px-2 font-display font-semibold text-xs text-foreground">{app.company_name}</td>
                    <td className="py-3 px-2 text-xs text-muted-foreground">{app.contact_name}</td>
                    <td className="py-3 px-2 text-xs text-muted-foreground">{app.country}</td>
                    <td className="py-3 px-2">
                      <span className="text-[10px] bg-card border border-border rounded px-1.5 py-0.5 capitalize text-muted-foreground">{app.partner_type}</span>
                    </td>
                    <td className="py-3 px-2 text-[10px] text-muted-foreground">{VOLUME_LABELS[app.estimated_annual_volume] || "—"}</td>
                    <td className="py-3 px-2">
                      <span className="text-[9px] font-display font-semibold px-2 py-1 rounded-full capitalize"
                        style={{ background: c.bg, color: c.color }}>{app.status}</span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button onClick={() => setSelected(app)} className="text-muted-foreground hover:text-foreground">
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

function QuoteRequestsTab({ type = "standard" }: { type?: "standard" | "pro" }) {
  const [selected, setSelected] = useState<any>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["project_requests", type],
    queryFn: async () => {
      let query = supabase.from("project_requests").select("*").order("created_at", { ascending: false });
      if (type === "pro") query = query.ilike("project_name", "%Pro Service%");
      else query = query.not("project_name", "ilike", "%Pro Service%");
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: cartItems = [] } = useQuery({
    queryKey: ["project_cart_items", selected?.id],
    enabled: !!selected?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("project_cart_items").select("*, products(*)").eq("project_request_id", selected.id);
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) return <p className="text-muted-foreground font-body text-sm">Chargement...</p>;

  if (selected) return (
    <div>
      <button onClick={() => setSelected(null)}
        className="flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-3 w-3" /> Retour
      </button>
      <div className="space-y-5">
        <div className="border border-border rounded-xl p-5">
          <h3 className="font-display font-semibold text-sm mb-4">Contact</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "Nom",        value: selected.contact_name },
              { label: "Entreprise", value: selected.contact_company },
              { label: "Email",      value: selected.contact_email },
              { label: "Telephone",  value: selected.contact_phone },
              { label: "Budget",     value: selected.budget_range },
              { label: "Delai",      value: selected.timeline },
            ].filter(({ value }) => value).map(({ label, value }) => (
              <div key={label}>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
                <p className="text-sm font-body text-foreground">{String(value)}</p>
              </div>
            ))}
          </div>
        </div>
        {cartItems.length > 0 && (
          <div className="border border-border rounded-xl p-5">
            <h3 className="font-display font-semibold text-sm mb-3">Produits</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Produit","Qte","Concept"].map(h => (
                    <th key={h} className="py-2 px-2 text-[10px] uppercase text-muted-foreground font-normal text-left">{h}</th>
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

  return (
    <div>
      {requests.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground font-body text-sm">Aucune demande pour le moment.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-border">
                {["Date","Projet","Contact","Entreprise","Budget","Statut",""].map(h => (
                  <th key={h} className={`py-3 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-normal ${h === "" ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((req: any) => (
                <tr key={req.id} className="border-b border-border/50 hover:bg-card/50">
                  <td className="py-3 px-2 text-[10px] text-muted-foreground">{new Date(req.created_at).toLocaleDateString("fr-FR")}</td>
                  <td className="py-3 px-2 font-display font-semibold text-xs">{req.project_name}</td>
                  <td className="py-3 px-2 text-muted-foreground">{req.contact_name}</td>
                  <td className="py-3 px-2 text-muted-foreground">{req.contact_company}</td>
                  <td className="py-3 px-2 text-muted-foreground">{req.budget_range || "—"}</td>
                  <td className="py-3 px-2">
                    <span className={`text-[10px] font-display font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_BADGE[req.status || "pending"] || STATUS_BADGE.pending}`}>
                      {req.status || "pending"}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <button onClick={() => setSelected(req)} className="text-muted-foreground hover:text-foreground">
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

// ═══════════════════════════════════════════════════════════
// MAIN ADMIN
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// SIDEBAR SECTION DEFINITIONS
// ═══════════════════════════════════════════════════════════

type SidebarGroup = {
  label: string;
  items: { id: Tab; icon: any; label: string; badgeKey?: string }[];
};

const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    label: "",
    items: [
      { id: "dashboard", icon: BarChart3, label: "Vue d'ensemble" },
    ],
  },
  {
    label: "BUSINESS",
    items: [
      { id: "quotes",  icon: FileText,     label: "Devis",      badgeKey: "quotes" },
      { id: "orders",  icon: ShoppingCart,  label: "Commandes",  badgeKey: "orders" },
      { id: "financing", icon: Landmark,    label: "Financement" },
      { id: "applications", icon: CreditCard, label: "Paiements" },
    ],
  },
  {
    label: "CATALOGUE",
    items: [
      { id: "products",    icon: Package,      label: "Produits",      badgeKey: "products" },
      { id: "partners",    icon: Building2,     label: "Partenaires", badgeKey: "partners" },
      { id: "submissions", icon: Inbox,         label: "Soumissions",   badgeKey: "submissions" },
      { id: "subscriptions", icon: Star,        label: "Abonnements" },
      { id: "brands",        icon: Crown,       label: "Marques" },
    ],
  },
  {
    label: "COMMUNICATION",
    items: [
      { id: "messages", icon: MessageSquare, label: "Messages",   badgeKey: "messages" },
      { id: "ratings",  icon: Star,          label: "Avis" },
      { id: "chatbot",  icon: Bot,           label: "Chatbot IA" },
    ],
  },
  {
    label: "SYSTEME",
    items: [
      { id: "users",    icon: Users,    label: "Utilisateurs" },
      { id: "settings", icon: Settings, label: "Parametres" },
      { id: "partner_visibility", icon: Eye, label: "Visibilite" },
    ],
  },
  {
    label: "INSIGHTS",
    items: [
      { id: "analytics",   icon: TrendingUp, label: "Analytics" },
      { id: "pro_service",  icon: Users,      label: "Pro Service" },
    ],
  },
];

const TAB_TITLES: Record<Tab, string> = {
  dashboard: "Vue d'ensemble",
  quotes: "Gestion des devis",
  orders: "Suivi des commandes",
  applications: "Paiements & candidatures",
  products: "Catalogue produits",
  partners: "Partenaires & fournisseurs",
  submissions: "Soumissions produits",
  subscriptions: "Abonnements",
  messages: "Messages",
  ratings: "Avis & moderation",
  chatbot: "Chatbot IA",
  users: "Utilisateurs",
  settings: "Parametres",
  partner_visibility: "Visibilite partenaires",
  analytics: "Analytics",
  pro_service: "Pro Service",
  brands: "Gestion des marques",
};

const Admin = () => {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { data: products = [] } = useProducts();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const { data: pendingApps = [] } = useQuery({
    queryKey: ["partner_applications_pending"],
    queryFn: async () => {
      const { data } = await supabase.from("partner_applications").select("id").eq("status", "pending");
      return data || [];
    },
  });

  const { data: pendingQuotes = [] } = useQuery({
    queryKey: ["admin-quotes-pending-count"],
    queryFn: async () => {
      const { data } = await supabase.from("quote_requests").select("id").eq("status", "pending");
      return data || [];
    },
  });

  const { data: activeOrders = [] } = useQuery({
    queryKey: ["admin-orders-active-count"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("id").not("status", "in", '("completed","cancelled","refunded")');
      return data || [];
    },
  });

  const { data: unreadMessages = [] } = useQuery({
    queryKey: ["admin-messages-unread-count"],
    queryFn: async () => {
      const { data } = await supabase.from("admin_messages").select("id").eq("read", false);
      return data || [];
    },
  });

  const { data: pendingSubmissions = [] } = useQuery({
    queryKey: ["admin-submissions-pending-count"],
    queryFn: async () => {
      const { data } = await supabase.from("product_submissions").select("id").eq("status", "pending_review");
      return data || [];
    },
  });

  const { data: pendingPartnerProfiles = [] } = useQuery({
    queryKey: ["admin-pending-partner-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("partners").select("id").eq("profile_status" as string, "pending_review" as string);
      return data || [];
    },
  });

  const pendingReviewCount = products.filter(p => p.publish_status === "pending_review").length;

  const badges: Record<string, number> = {
    quotes: pendingQuotes.length,
    orders: activeOrders.length,
    products: pendingReviewCount,
    submissions: pendingSubmissions.length,
    messages: unreadMessages.length,
    partners: pendingPartnerProfiles.length,
  };

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-60 bg-[#1A1A1A] flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-2.5">
          <span className="font-display text-base font-bold tracking-wide text-white">TERRASSEA</span>
          <span className="text-[9px] font-display font-bold tracking-widest bg-[#D4603A] text-white px-2 py-0.5 rounded">ADMIN</span>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {SIDEBAR_GROUPS.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "mt-5" : ""}>
              {group.label && (
                <p className="text-[9px] font-display font-bold tracking-[0.15em] text-white/30 uppercase px-2 mb-2">
                  {group.label}
                </p>
              )}
              {group.items.map(item => {
                const isActive = tab === item.id;
                const badge = item.badgeKey ? badges[item.badgeKey] || 0 : 0;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-display font-semibold transition-all mb-0.5 ${
                      isActive
                        ? "text-white bg-white/10 border-l-[3px] border-[#D4603A] pl-[9px]"
                        : "text-white/50 hover:text-white/80 hover:bg-white/5 border-l-[3px] border-transparent pl-[9px]"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {badge > 0 && (
                      <span className="text-[9px] font-bold bg-[#D4603A] text-white px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom: back link */}
        <div className="px-3 py-4 border-t border-white/10">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 text-[11px] font-display font-semibold text-white/40 hover:text-white/70 transition-colors rounded-lg hover:bg-white/5"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Retour au site
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-2 mt-1 w-full text-[11px] font-display font-semibold text-red-400/70 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
          >
            <LogOut className="h-3.5 w-3.5" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Content area */}
      <main className="flex-1 lg:ml-60 min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-3 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-card transition-colors"
          >
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-lg font-bold text-foreground">{TAB_TITLES[tab]}</h1>
            <p className="text-[10px] font-body text-muted-foreground mt-0.5">
              Administration Terrassea &middot; {products.length} produits
              {pendingApps.length > 0 && ` · ${pendingApps.length} candidature${pendingApps.length > 1 ? "s" : ""} en attente`}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-[10px] font-display font-semibold text-green-700">Admin</span>
            </div>
            {pendingReviewCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full">
                <span className="text-[10px] font-display font-semibold text-red-600">
                  {pendingReviewCount} en attente
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Tab content */}
        <div className="p-6 max-w-6xl">
          {tab === "dashboard"    && <AdminDashboard />}
          {tab === "users"        && <AdminUsers />}
          {tab === "partners"     && <AdminPartners />}
          {tab === "partner_visibility" && <AdminPartnerVisibility />}
          {tab === "subscriptions"      && <AdminSubscriptions />}
          {tab === "ratings"            && <AdminRatingsModeration />}
          {tab === "messages"     && <AdminMessages />}
          {tab === "applications" && <ApplicationsTab />}
          {tab === "quotes"       && <AdminQuoteWorkflow />}
          {tab === "orders"       && <AdminOrderTracking />}
          {tab === "analytics"    && <AdminAnalyticsDashboard />}
          {tab === "settings"     && <AdminSettings />}
          {tab === "pro_service"  && <QuoteRequestsTab type="pro" />}
          {tab === "products"     && <ProductsTab />}
          {tab === "submissions"  && <AdminProductReview />}
          {tab === "financing"    && <AdminFinancing />}
          {tab === "brands"       && <AdminBrandManagement />}
          {tab === "chatbot"      && <AdminChatbotStats />}
        </div>
      </main>
    </div>
  );
};

export default Admin;
