import { useState, useEffect, useCallback } from "react";
import { useProducts } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Plus, Pencil, X, Save, ArrowLeft, Package,
  FileText, Users, Eye, ClipboardList, CheckCircle2,
  XCircle, Clock, AlertTriangle, Star, TrendingUp,
  ChevronDown, ChevronUp, Search,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import type { DBProduct, ProductTypeTags, TagDefinition } from "@/lib/products";

// ═══════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════

type Tab = "applications" | "quotes" | "pro_service" | "products";

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
        <div className="flex flex-wrap gap-1 min-h-[38px] bg-card border border-border rounded-sm px-2 py-1.5 focus-within:ring-1 focus-within:ring-foreground">
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
          <div className="absolute top-full left-0 right-0 z-20 bg-background border border-border rounded-sm shadow-md mt-1 max-h-40 overflow-y-auto">
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
          value={(value as any)[field] ?? ""}
          onChange={e => set(field, e.target.value || undefined)}
          className="w-full bg-card border border-border rounded-sm px-2.5 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
        >
          <option value="">—</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={(value as any)[field] ?? ""}
          onChange={e => set(field, type === "number" ? (e.target.value ? Number(e.target.value) : undefined) : e.target.value || undefined)}
          className="w-full bg-card border border-border rounded-sm px-2.5 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
        />
      )}
    </div>
  );

  const BoolField = ({ label, field }: { label: string; field: string }) => (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={Boolean((value as any)[field])}
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
// FULL PRODUCT FORM
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

  // Load tag suggestions from DB
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

  // Compute preview quality score locally
  const previewScore = (() => {
    let s = 0;
    if (form.archetype_id) s += 0.20;
    const pttKeys = Object.keys(form.product_type_tags || {}).filter(k => (form.product_type_tags as any)[k] != null).length;
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
      toast.error("Name and category are required");
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...form, ...overrides });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = () => {
    handleSave({ publish_status: "pending_review" });
  };

  const SECTIONS = [
    { id: "basics",    label: "Basics" },
    { id: "tags",      label: "Tags" },
    { id: "typetags",  label: "Type-specific" },
    { id: "pricing",   label: "Pricing & Stock" },
    { id: "dims",      label: "Dimensions" },
    { id: "technical", label: "Technical" },
  ];

  const Input = ({ label, field, type = "text", required }: {
    label: string; field: keyof ProductFormData; type?: string; required?: boolean;
  }) => (
    <div>
      <label className="text-xs font-body text-muted-foreground block mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={(form[field] as any) ?? ""}
        onChange={e => set(field, type === "number" ? (e.target.value ? Number(e.target.value) : null) : e.target.value)}
        className="w-full bg-card border border-border rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
      />
    </div>
  );

  const Select = ({ label, field, options, required }: {
    label: string; field: keyof ProductFormData; options: string[]; required?: boolean;
  }) => (
    <div>
      <label className="text-xs font-body text-muted-foreground block mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        value={(form[field] as any) ?? ""}
        onChange={e => set(field, e.target.value)}
        className="w-full bg-card border border-border rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
      >
        <option value="">—</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const Toggle = ({ label, field }: { label: string; field: keyof ProductFormData }) => (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        onClick={() => set(field, !form[field])}
        className={`relative w-8 h-4 rounded-full transition-colors ${form[field] ? "bg-foreground" : "bg-border"}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${form[field] ? "translate-x-4" : ""}`} />
      </div>
      <span className="text-xs font-body text-foreground">{label}</span>
    </label>
  );

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">
            {form.id ? "Edit Product" : "New Product"}
          </h2>
          <div className="mt-1">
            <DataQualityBadge score={previewScore} />
          </div>
        </div>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Section tabs */}
      <div className="flex gap-0.5 mb-6 overflow-x-auto border-b border-border">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`px-4 py-2 text-[11px] font-display font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${
              section === s.id
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Basics ── */}
      {section === "basics" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name" field="name" required />
            <Select label="Category" field="category" options={CATEGORIES} required />
            <Input label="Subcategory" field="subcategory" />
            <Input label="Product family" field="product_family" />
            <Input label="Brand / Source" field="brand_source" />
            <Input label="Supplier (internal)" field="supplier_internal" />
            <Input label="Collection" field="collection" />
            <Input label="Country of manufacture" field="country_of_manufacture" />
          </div>
          <div>
            <label className="text-xs font-body text-muted-foreground block mb-1">Short description</label>
            <textarea
              value={form.short_description || ""}
              onChange={e => set("short_description", e.target.value)}
              rows={2}
              className="w-full bg-card border border-border rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-body text-muted-foreground block mb-1">Long description</label>
            <textarea
              value={form.long_description || ""}
              onChange={e => set("long_description", e.target.value)}
              rows={4}
              className="w-full bg-card border border-border rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Image URL" field="image_url" />
            <Input label="Indicative price (display)" field="indicative_price" />
          </div>
          <div>
            <label className="text-xs font-body text-muted-foreground block mb-1">Gallery URLs (comma separated)</label>
            <input
              type="text"
              value={form.gallery_urls.join(", ")}
              onChange={e => set("gallery_urls", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
              className="w-full bg-card border border-border rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
              placeholder="https://..., https://..."
            />
          </div>
          {/* Main color */}
          <div>
            <label className="text-xs font-body text-muted-foreground block mb-1">Main color (slug)</label>
            <select
              value={form.main_color || ""}
              onChange={e => set("main_color", e.target.value)}
              className="w-full bg-card border border-border rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
            >
              <option value="">—</option>
              {COLOR_SLUGS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-body text-muted-foreground block mb-1">Available colors (slugs, comma separated)</label>
            <input
              type="text"
              value={form.available_colors.join(", ")}
              onChange={e => set("available_colors", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
              className="w-full bg-card border border-border rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
              placeholder="white, black, terracotta"
            />
            <p className="text-[9px] font-body text-muted-foreground mt-1">
              Use slugs: {COLOR_SLUGS.slice(0, 8).join(", ")}...
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Warranty" field="warranty" />
            <Input label="Maintenance info" field="maintenance_info" />
          </div>
        </div>
      )}

      {/* ── Tags ── */}
      {section === "tags" && (
        <div className="space-y-4">
          <div className="p-3 bg-card border border-border rounded-sm">
            <p className="text-[10px] font-body text-muted-foreground">
              All tags are <strong>English slugs</strong> (kebab-case). Type and press Enter, or select from suggestions.
              Translations are handled automatically by the UI layer.
            </p>
          </div>
          <TagInput label="Style tags" value={form.style_tags}
            onChange={v => set("style_tags", v)} suggestions={suggestions("style")}
            placeholder="mediterranean, modern, bistro..." />
          <TagInput label="Ambience tags" value={form.ambience_tags}
            onChange={v => set("ambience_tags", v)} suggestions={suggestions("ambience")}
            placeholder="warm, convivial, elegant..." />
          <TagInput label="Palette tags" value={form.palette_tags}
            onChange={v => set("palette_tags", v)} suggestions={suggestions("palette")}
            placeholder="warm, natural, cool..." />
          <TagInput label="Material tags" value={form.material_tags}
            onChange={v => set("material_tags", v)} suggestions={suggestions("material")}
            placeholder="aluminium, teak, rope..." />
          <TagInput label="Use case tags" value={form.use_case_tags}
            onChange={v => set("use_case_tags", v)} suggestions={suggestions("use_case")}
            placeholder="restaurant-terrace, rooftop, beach-club..." />
          <TagInput label="Technical tags" value={form.technical_tags}
            onChange={v => set("technical_tags", v)} suggestions={suggestions("technical")}
            placeholder="stackable, uv-resistant, chr-heavy-use..." />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Material structure (display)" field="material_structure" />
            <Input label="Material seat (display)" field="material_seat" />
          </div>
        </div>
      )}

      {/* ── Type-specific tags ── */}
      {section === "typetags" && (
        <div className="space-y-4">
          {!form.category ? (
            <div className="flex items-center gap-2 p-4 bg-amber-500/10 border border-amber-500/20 rounded-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-body text-amber-700">Select a category in Basics first.</p>
            </div>
          ) : (
            <>
              <div className="p-3 bg-card border border-border rounded-sm">
                <p className="text-[10px] font-body text-muted-foreground">
                  Fields marked <span className="text-red-500">*</span> are required for a good quality score.
                  These feed directly into the recommendation engine.
                </p>
              </div>
              <ProductTypeTagsForm
                category={form.category}
                value={form.product_type_tags}
                onChange={v => set("product_type_tags", v)}
              />
            </>
          )}
        </div>
      )}

      {/* ── Pricing & Stock ── */}
      {section === "pricing" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Price min (€)" field="price_min" type="number" />
            <Input label="Price max (€)" field="price_max" type="number" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Availability type" field="availability_type" options={AVAILABILITY_OPTIONS} />
            <Select label="Stock status" field="stock_status" options={STOCK_STATUS_OPTIONS} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Stock quantity" field="stock_quantity" type="number" />
            <Input label="Estimated delivery (days)" field="estimated_delivery_days" type="number" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-body text-muted-foreground block mb-1">Popularity score (0–1)</label>
              <input type="range" min="0" max="1" step="0.05"
                value={form.popularity_score}
                onChange={e => set("popularity_score", Number(e.target.value))}
                className="w-full"
              />
              <span className="text-xs font-body text-muted-foreground">{form.popularity_score}</span>
            </div>
            <div>
              <label className="text-xs font-body text-muted-foreground block mb-1">Priority score (0–1)</label>
              <input type="range" min="0" max="1" step="0.05"
                value={form.priority_score}
                onChange={e => set("priority_score", Number(e.target.value))}
                className="w-full"
              />
              <span className="text-xs font-body text-muted-foreground">{form.priority_score}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Dimensions ── */}
      {section === "dims" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Input label="Length (cm)" field="dimensions_length_cm" type="number" />
            <Input label="Width (cm)"  field="dimensions_width_cm"  type="number" />
            <Input label="Height (cm)" field="dimensions_height_cm" type="number" />
            <Input label="Seat height (cm)" field="seat_height_cm" type="number" />
            <Input label="Weight (kg)" field="weight_kg" type="number" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Table shape" field="table_shape"
              options={["square","rectangular","round","oval"]} />
            <Input label="Default seating" field="default_seating_capacity" type="number" />
            <Input label="Seating min" field="recommended_seating_min" type="number" />
            <Input label="Seating max" field="recommended_seating_max" type="number" />
          </div>
          <div className="flex gap-4 flex-wrap">
            <Toggle label="Combinable" field="combinable" />
          </div>
          {form.combinable && (
            <Input label="Combined capacity when joined" field="combined_capacity_if_joined" type="number" />
          )}
        </div>
      )}

      {/* ── Technical booleans ── */}
      {section === "technical" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-card border border-border rounded-sm">
            {([
              ["is_outdoor",        "Outdoor"],
              ["is_stackable",      "Stackable"],
              ["is_chr_heavy_use",  "CHR heavy use"],
              ["uv_resistant",      "UV resistant"],
              ["weather_resistant", "Weather resistant"],
              ["fire_retardant",    "Fire retardant"],
              ["lightweight",       "Lightweight"],
              ["easy_maintenance",  "Easy maintenance"],
              ["customizable",      "Customizable"],
              ["dismountable",      "Dismountable"],
              ["requires_assembly", "Requires assembly"],
            ] as [keyof ProductFormData, string][]).map(([field, label]) => (
              <Toggle key={field} label={label} field={field} />
            ))}
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
        <div className="text-[10px] font-body text-muted-foreground">
          Quality score will be auto-calculated on save.
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 font-display font-semibold text-sm border border-border rounded-full hover:border-foreground transition-colors"
          >
            Cancel
          </button>
          {(!form.id || form.publish_status === "draft") && previewScore >= 0.4 && (
            <button
              onClick={handleSubmitForReview}
              disabled={saving || !form.name || !form.category}
              className="flex items-center gap-2 px-5 py-2.5 font-display font-semibold text-sm border border-amber-300 text-amber-700 bg-amber-50 rounded-full hover:bg-amber-100 disabled:opacity-50 transition-colors"
            >
              <Eye className="h-4 w-4" />
              {saving ? "Submitting..." : "Submit for review"}
            </button>
          )}
          <button
            onClick={() => handleSave()}
            disabled={saving || !form.name || !form.category}
            className="flex items-center gap-2 px-6 py-2.5 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : form.id ? "Update product" : "Save draft"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PRODUCTS TAB
// ═══════════════════════════════════════════════════════════

function ProductsTab() {
  const { data: products = [], isLoading } = useProducts();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ProductFormData | null>(null);
  const [filter, setFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = products.filter(p => {
    const matchText = p.name.toLowerCase().includes(filter.toLowerCase()) ||
      p.category.toLowerCase().includes(filter.toLowerCase());
    const matchCat = !catFilter || p.category === catFilter;
    return matchText && matchCat;
  });

  const handleSave = async (data: ProductFormData) => {
    const { id, ...rest } = data;
    const dbData = {
      ...rest,
      color_variants:    rest.color_variants as any,
      product_type_tags: rest.product_type_tags as any,
    };
    try {
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
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    setDeleting(id);
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeleting(null);
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

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text" value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Search products..."
            className="w-full bg-card border border-border rounded-sm pl-9 pr-4 py-2.5 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
          />
        </div>
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
        >
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          onClick={() => setEditing(emptyProduct())}
          className="flex items-center gap-2 px-5 py-2.5 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 ml-auto"
        >
          <Plus className="h-4 w-4" /> Add product
        </button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground font-body text-sm">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-body text-muted-foreground">
            {products.length === 0 ? "No products yet. Add your first product." : "No products match your search."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-border">
                {["Product", "Category", "Color", "Price", "Quality", "Stock", ""].map(h => (
                  <th key={h} className={`py-3 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-normal ${h === "" ? "text-right" : "text-left"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(product => (
                <tr key={product.id} className="border-b border-border/50 hover:bg-card/50 transition-colors">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      {product.image_url && (
                        <img src={product.image_url} alt="" className="w-8 h-8 rounded object-cover bg-card" />
                      )}
                      <div>
                        <p className="font-display font-semibold text-xs text-foreground">{product.name}</p>
                        <p className="text-[10px] text-muted-foreground">{product.style_tags.slice(0, 2).join(", ")}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <span className="text-[10px] bg-card border border-border rounded px-1.5 py-0.5 text-muted-foreground">
                      {product.category}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    {product.main_color ? (
                      <span className="text-[10px] font-body text-foreground">{product.main_color}</span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-muted-foreground text-xs">
                    {product.price_min ? `€${product.price_min.toLocaleString("fr-FR")}` : product.indicative_price || "—"}
                  </td>
                  <td className="py-3 px-2">
                    <DataQualityBadge score={product.data_quality_score} />
                  </td>
                  <td className="py-3 px-2">
                    <span className={`text-[9px] font-body px-1.5 py-0.5 rounded ${
                      product.availability_type === "available" ? "bg-green-50 text-green-700" :
                      product.availability_type === "on-order"  ? "bg-blue-50 text-blue-700" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {product.availability_type || "—"}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditing({ ...product })}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        disabled={deleting === product.id}
                        className="text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
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
    approved: applications.filter((a: any) => a.status === "approved").length,
    rejected: applications.filter((a: any) => a.status === "rejected").length,
  };

  const updateStatus = async (id: string, status: string, reason?: string) => {
    setProcessing(true);
    try {
      const updates: any = { status, reviewed_at: new Date().toISOString() };
      if (reason) updates.rejection_reason = reason;
      const { error } = await supabase.from("partner_applications").update(updates).eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["partner_applications"] });
      queryClient.invalidateQueries({ queryKey: ["partner_applications_pending"] });
      if (status === "approved") toast.success("Application approved.");
      else if (status === "rejected") toast.success("Application rejected.");
      setSelected((prev: any) => prev ? { ...prev, status, rejection_reason: reason } : null);
      setShowRejectForm(false);
      setRejectionReason("");
    } catch { toast.error("Failed to update status."); }
    finally { setProcessing(false); }
  };

  if (isLoading) return <p className="text-muted-foreground font-body text-sm">Loading...</p>;

  if (selected) {
    const cfg = APP_STATUS_CONFIG[selected.status] || APP_STATUS_CONFIG.pending;
    const StatusIcon = cfg.icon;
    return (
      <div>
        <button onClick={() => { setSelected(null); setShowRejectForm(false); }}
          className="flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-3 w-3" /> Back
        </button>
        <div className="flex items-center gap-3 px-4 py-3 rounded-sm mb-6" style={{ background: cfg.bg }}>
          <StatusIcon className="h-4 w-4" style={{ color: cfg.color }} />
          <span className="font-display font-semibold text-sm" style={{ color: cfg.color }}>{cfg.label}</span>
          {selected.reviewed_at && (
            <span className="text-[10px] font-body ml-auto" style={{ color: cfg.color }}>
              {new Date(selected.reviewed_at).toLocaleDateString("fr-FR")}
            </span>
          )}
        </div>
        <div className="space-y-5">
          <div className="border border-border rounded-sm p-5">
            <h3 className="font-display font-semibold text-sm text-foreground mb-4">Company</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Company", value: selected.company_name },
                { label: "Contact", value: selected.contact_name },
                { label: "Email",   value: selected.contact_email },
                { label: "Phone",   value: selected.phone },
                { label: "Website", value: selected.website },
                { label: "VAT",     value: selected.vat_number },
                { label: "Country", value: selected.country },
                { label: "Type",    value: selected.partner_type },
                { label: "Volume",  value: VOLUME_LABELS[selected.estimated_annual_volume] || selected.estimated_annual_volume },
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
              <div className="border border-border rounded-sm p-4">
                <h3 className="font-display font-semibold text-xs text-foreground mb-2">Categories</h3>
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
          {selected.message && (
            <div className="border border-border rounded-sm p-5">
              <h3 className="font-display font-semibold text-sm text-foreground mb-2">Message</h3>
              <p className="text-sm font-body text-muted-foreground">{selected.message}</p>
            </div>
          )}
          {selected.rejection_reason && (
            <div className="border border-red-200 bg-red-50 rounded-sm p-4">
              <h3 className="font-display font-semibold text-xs text-red-700 mb-1">Rejection reason</h3>
              <p className="text-sm font-body text-red-600">{selected.rejection_reason}</p>
            </div>
          )}
        </div>
        {selected.status === "pending" && (
          <div className="space-y-4 mt-6">
            <div className="flex gap-3">
              <button onClick={() => updateStatus(selected.id, "approved")} disabled={processing}
                className="flex items-center gap-2 px-6 py-2.5 font-display font-semibold text-sm bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50">
                <CheckCircle2 className="h-4 w-4" /> {processing ? "Processing..." : "Approve"}
              </button>
              <button onClick={() => setShowRejectForm(!showRejectForm)} disabled={processing}
                className="flex items-center gap-2 px-6 py-2.5 font-display font-semibold text-sm border border-red-200 text-red-600 rounded-full hover:bg-red-50">
                <XCircle className="h-4 w-4" /> Reject
              </button>
            </div>
            {showRejectForm && (
              <div className="space-y-3 border border-border rounded-sm p-4">
                <label className="text-xs font-body text-muted-foreground">Rejection reason (optional)</label>
                <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                  rows={3} className="w-full bg-background border border-border rounded-sm px-4 py-2.5 text-sm font-body outline-none focus:border-foreground resize-none" />
                <div className="flex gap-2">
                  <button onClick={() => updateStatus(selected.id, "rejected", rejectionReason)} disabled={processing}
                    className="px-5 py-2 font-display font-semibold text-xs bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50">
                    Confirm rejection
                  </button>
                  <button onClick={() => setShowRejectForm(false)}
                    className="px-5 py-2 font-display font-semibold text-xs border border-border text-muted-foreground rounded-full">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {selected.status === "approved" && (
          <button onClick={() => updateStatus(selected.id, "suspended")} disabled={processing}
            className="flex items-center gap-2 px-5 py-2.5 font-display font-semibold text-sm border border-red-200 text-red-600 rounded-full hover:bg-red-50 mt-6">
            Suspend partner
          </button>
        )}
        {selected.status === "suspended" && (
          <button onClick={() => updateStatus(selected.id, "approved")} disabled={processing}
            className="flex items-center gap-2 px-5 py-2.5 font-display font-semibold text-sm bg-green-600 text-white rounded-full mt-6">
            Reactivate
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-1 mb-6">
        {[
          { id: "all", label: "All" },
          { id: "pending", label: "Pending" },
          { id: "approved", label: "Approved" },
          { id: "rejected", label: "Rejected" },
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
            {filter === "all" ? "No applications yet." : `No ${filter} applications.`}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-border">
                {["Date","Company","Contact","Country","Type","Volume","Status",""].map(h => (
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

  if (isLoading) return <p className="text-muted-foreground font-body text-sm">Loading...</p>;

  if (selected) return (
    <div>
      <button onClick={() => setSelected(null)}
        className="flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-3 w-3" /> Back
      </button>
      <div className="space-y-5">
        <div className="border border-border rounded-sm p-5">
          <h3 className="font-display font-semibold text-sm mb-4">Contact</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "Name",     value: selected.contact_name },
              { label: "Company",  value: selected.contact_company },
              { label: "Email",    value: selected.contact_email },
              { label: "Phone",    value: selected.contact_phone },
              { label: "Budget",   value: selected.budget_range },
              { label: "Timeline", value: selected.timeline },
            ].filter(({ value }) => value).map(({ label, value }) => (
              <div key={label}>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
                <p className="text-sm font-body text-foreground">{String(value)}</p>
              </div>
            ))}
          </div>
        </div>
        {cartItems.length > 0 && (
          <div className="border border-border rounded-sm p-5">
            <h3 className="font-display font-semibold text-sm mb-3">Products</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Product","Qty","Concept"].map(h => (
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
        <p className="text-center py-12 text-muted-foreground font-body text-sm">No requests yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-border">
                {["Date","Project","Contact","Company","Budget","Status",""].map(h => (
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

const Admin = () => {
  const [tab, setTab] = useState<Tab>("applications");
  const { data: products = [] } = useProducts();

  const { data: pendingApps = [] } = useQuery({
    queryKey: ["partner_applications_pending"],
    queryFn: async () => {
      const { data } = await supabase.from("partner_applications").select("id").eq("status", "pending");
      return data || [];
    },
  });

  const tabs = [
    { id: "applications", icon: ClipboardList, label: "Applications",   badge: pendingApps.length },
    { id: "quotes",       icon: FileText,      label: "Quote requests", badge: 0 },
    { id: "pro_service",  icon: Users,         label: "Pro Service",    badge: 0 },
    { id: "products",     icon: Package,       label: "Products",       badge: 0 },
  ];

  // Quality stats
  const qualityStats = {
    excellent: products.filter(p => p.data_quality_score >= 0.8).length,
    good:      products.filter(p => p.data_quality_score >= 0.6 && p.data_quality_score < 0.8).length,
    fair:      products.filter(p => p.data_quality_score >= 0.4 && p.data_quality_score < 0.6).length,
    incomplete:products.filter(p => p.data_quality_score < 0.4).length,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-xs font-body text-muted-foreground hover:text-foreground mb-2">
              <ArrowLeft className="h-3 w-3" /> Back to site
            </Link>
            <h1 className="font-display text-2xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-sm text-muted-foreground font-body mt-0.5">
              {products.length} products
              {pendingApps.length > 0 && ` · ${pendingApps.length} application${pendingApps.length > 1 ? "s" : ""} pending`}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-[10px] font-display font-semibold text-green-700">Admin · full access</span>
            </div>
            {products.length > 0 && (
              <div className="flex items-center gap-2 text-[10px] font-body text-muted-foreground">
                <span className="text-green-600 font-semibold">{qualityStats.excellent}</span> excellent ·
                <span className="text-blue-600 font-semibold">{qualityStats.good}</span> good ·
                <span className="text-amber-600 font-semibold">{qualityStats.fair}</span> fair ·
                <span className="text-red-500 font-semibold">{qualityStats.incomplete}</span> incomplete
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-border overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as Tab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-display font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${
                tab === t.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
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
