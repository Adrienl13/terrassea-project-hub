import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProductSubmission } from "@/hooks/useProductSubmissions";
import { toast } from "sonner";
import {
  X, Upload, Sparkles, Camera, Check, Loader2, AlertTriangle,
  ChevronDown, ChevronUp, Package, Image as ImageIcon, Info,
} from "lucide-react";
import { PLAN_CONFIG, type PartnerPlan } from "./PartnerSections";

// ── Types ──────────────────────────────────────────────────────────────────────

interface AIAnalysis {
  name?: string;
  category?: string;
  subcategory?: string;
  short_description?: string;
  material_structure?: string;
  material_seat?: string;
  main_color?: string;
  secondary_color?: string;
  style_tags?: string[];
  ambience_tags?: string[];
  material_tags?: string[];
  use_case_tags?: string[];
  is_outdoor?: boolean;
  is_stackable?: boolean;
  is_chr_heavy_use?: boolean;
  weather_resistant?: boolean;
  uv_resistant?: boolean;
  lightweight?: boolean;
  easy_maintenance?: boolean;
  estimated_dimensions?: {
    length_cm?: number | null;
    width_cm?: number | null;
    height_cm?: number | null;
    seat_height_cm?: number | null;
  };
  estimated_weight_kg?: number | null;
  confidence?: number;
}

interface ProductFormData {
  name: string;
  category: string;
  subcategory: string;
  short_description: string;
  long_description: string;
  image_url: string;
  gallery_urls: string[];
  environment_urls: string[];
  price_min: number | null;
  price_max: number | null;
  main_color: string;
  secondary_color: string;
  material_structure: string;
  material_seat: string;
  style_tags: string[];
  ambience_tags: string[];
  material_tags: string[];
  use_case_tags: string[];
  dimensions_length_cm: number | null;
  dimensions_width_cm: number | null;
  dimensions_height_cm: number | null;
  seat_height_cm: number | null;
  weight_kg: number | null;
  is_outdoor: boolean;
  is_stackable: boolean;
  is_chr_heavy_use: boolean;
  weather_resistant: boolean;
  uv_resistant: boolean;
  lightweight: boolean;
  easy_maintenance: boolean;
  stock_status: string;
  stock_quantity: number | null;
  estimated_delivery_days: number | null;
  country_of_manufacture: string;
  warranty: string;
}

const EMPTY_FORM: ProductFormData = {
  name: "", category: "", subcategory: "", short_description: "", long_description: "",
  image_url: "", gallery_urls: [], environment_urls: [], price_min: null, price_max: null,
  main_color: "", secondary_color: "", material_structure: "", material_seat: "",
  style_tags: [], ambience_tags: [], material_tags: [], use_case_tags: [],
  dimensions_length_cm: null, dimensions_width_cm: null, dimensions_height_cm: null,
  seat_height_cm: null, weight_kg: null,
  is_outdoor: true, is_stackable: false, is_chr_heavy_use: false,
  weather_resistant: false, uv_resistant: false, lightweight: false, easy_maintenance: false,
  stock_status: "in_stock", stock_quantity: null, estimated_delivery_days: null,
  country_of_manufacture: "", warranty: "",
};

const CATEGORIES = [
  { value: "seating",     label: "Assises" },
  { value: "tables",      label: "Tables" },
  { value: "parasols",    label: "Parasols" },
  { value: "loungers",    label: "Bains de soleil" },
  { value: "sofas",       label: "Canapés / Banquettes" },
  { value: "accessories", label: "Accessoires" },
];

const COLOR_OPTIONS = [
  "white", "black", "grey", "anthracite", "natural-wood", "beige",
  "terracotta", "blue", "green", "taupe", "brown", "cream", "red", "yellow",
];

const STOCK_OPTIONS = [
  { value: "in_stock", label: "En stock" },
  { value: "low_stock", label: "Stock faible" },
  { value: "made_to_order", label: "Sur commande" },
  { value: "pre_order", label: "Pré-commande" },
];

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AddProductForm({
  plan,
  onClose,
  onSuccess,
}: {
  plan: PartnerPlan;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { submitProduct, isSubmitting } = useProductSubmission();
  const config = PLAN_CONFIG[plan];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const envInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ProductFormData>(EMPTY_FORM);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<{ file: File; preview: string }[]>([]);
  const [envFiles, setEnvFiles] = useState<{ file: File; preview: string }[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [aiApplied, setAiApplied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<"photo" | "basics" | "specs" | "pricing">("photo");
  const [expandedTags, setExpandedTags] = useState(false);

  const set = useCallback((key: keyof ProductFormData, val: unknown) =>
    setForm(prev => ({ ...prev, [key]: val })),
  []);

  // ── Image handling ──

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 10 Mo.");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
    setAiApplied(false);
    setAiConfidence(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file?.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 10 Mo.");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
    setAiApplied(false);
    setAiConfidence(null);
  };

  // ── Gallery / Environment image handling ──

  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - galleryFiles.length;
    const toAdd = files.slice(0, remaining).filter(f => f.size <= 10 * 1024 * 1024);
    toAdd.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setGalleryFiles(prev => {
          if (prev.length >= 5) return prev;
          return [...prev, { file, preview: ev.target?.result as string }];
        });
      };
      reader.readAsDataURL(file);
    });
    if (e.target) e.target.value = "";
  };

  const handleEnvSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 3 - envFiles.length;
    const toAdd = files.slice(0, remaining).filter(f => f.size <= 10 * 1024 * 1024);
    toAdd.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setEnvFiles(prev => {
          if (prev.length >= 3) return prev;
          return [...prev, { file, preview: ev.target?.result as string }];
        });
      };
      reader.readAsDataURL(file);
    });
    if (e.target) e.target.value = "";
  };

  const removeGalleryFile = (index: number) => {
    setGalleryFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeEnvFile = (index: number) => {
    setEnvFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadExtraImages = async (
    files: { file: File; preview: string }[],
    prefix: string,
  ): Promise<string[]> => {
    const urls: string[] = [];
    for (const { file, preview } of files) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `products/${user!.id}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, file, { contentType: file.type });
      if (uploadError) {
        console.warn("Upload failed, using preview:", uploadError.message);
        urls.push(preview);
      } else {
        const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
        urls.push(urlData.publicUrl);
      }
    }
    return urls;
  };

  // ── AI Analysis ──

  const analyzeWithAI = async () => {
    if (!imagePreview) {
      toast.error("Ajoutez d'abord une photo.");
      return;
    }

    setAnalyzing(true);
    try {
      // Extract base64 data from data URL
      const base64Match = imagePreview.match(/^data:([^;]+);base64,(.+)$/);
      if (!base64Match) {
        toast.error("Format d'image non supporté.");
        return;
      }

      const media_type = base64Match[1];
      const image_base64 = base64Match[2];

      const { data, error } = await supabase.functions.invoke("analyze-product-image", {
        body: { image_base64, media_type },
      });

      if (error) throw error;
      if (!data?.success || !data?.analysis) {
        throw new Error(data?.error || "Analyse échouée");
      }

      const ai: AIAnalysis = data.analysis;
      applyAIResults(ai);
      setAiConfidence(ai.confidence ?? 0.7);
      setAiApplied(true);
      toast.success("Caractéristiques détectées par l'IA !", {
        description: `Confiance : ${Math.round((ai.confidence ?? 0.7) * 100)}%. Vérifiez et ajustez si nécessaire.`,
      });
      setSection("basics");
    } catch (err: any) {
      console.error("AI analysis error:", err);
      toast.error("Erreur lors de l'analyse IA", {
        description: err.message || "Veuillez réessayer ou remplir manuellement.",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const applyAIResults = (ai: AIAnalysis) => {
    setForm(prev => ({
      ...prev,
      name: ai.name || prev.name,
      category: ai.category || prev.category,
      subcategory: ai.subcategory || prev.subcategory,
      short_description: ai.short_description || prev.short_description,
      material_structure: ai.material_structure || prev.material_structure,
      material_seat: ai.material_seat || prev.material_seat,
      main_color: ai.main_color || prev.main_color,
      secondary_color: ai.secondary_color || prev.secondary_color,
      style_tags: ai.style_tags?.length ? ai.style_tags : prev.style_tags,
      ambience_tags: ai.ambience_tags?.length ? ai.ambience_tags : prev.ambience_tags,
      material_tags: ai.material_tags?.length ? ai.material_tags : prev.material_tags,
      use_case_tags: ai.use_case_tags?.length ? ai.use_case_tags : prev.use_case_tags,
      is_outdoor: ai.is_outdoor ?? prev.is_outdoor,
      is_stackable: ai.is_stackable ?? prev.is_stackable,
      is_chr_heavy_use: ai.is_chr_heavy_use ?? prev.is_chr_heavy_use,
      weather_resistant: ai.weather_resistant ?? prev.weather_resistant,
      uv_resistant: ai.uv_resistant ?? prev.uv_resistant,
      lightweight: ai.lightweight ?? prev.lightweight,
      easy_maintenance: ai.easy_maintenance ?? prev.easy_maintenance,
      dimensions_length_cm: ai.estimated_dimensions?.length_cm ?? prev.dimensions_length_cm,
      dimensions_width_cm: ai.estimated_dimensions?.width_cm ?? prev.dimensions_width_cm,
      dimensions_height_cm: ai.estimated_dimensions?.height_cm ?? prev.dimensions_height_cm,
      seat_height_cm: ai.estimated_dimensions?.seat_height_cm ?? prev.seat_height_cm,
      weight_kg: ai.estimated_weight_kg ?? prev.weight_kg,
    }));
  };

  // ── Save ──

  const handleSave = async () => {
    if (!form.name || !form.category) {
      toast.error("Le nom et la catégorie sont obligatoires.");
      return;
    }
    if (form.price_min == null) {
      toast.error("Veuillez indiquer un prix minimum.");
      return;
    }

    setSaving(true);
    try {
      // Upload image to Supabase storage if we have a file
      let finalImageUrl = form.image_url;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop() || "jpg";
        const path = `products/${user!.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(path, imageFile, { contentType: imageFile.type });

        if (uploadError) {
          // If bucket doesn't exist, use the preview as URL placeholder
          console.warn("Upload failed, using placeholder:", uploadError.message);
          finalImageUrl = imagePreview || "";
        } else {
          const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
          finalImageUrl = urlData.publicUrl;
        }
      }

      // Upload gallery and environment images
      const galleryUrls = galleryFiles.length > 0
        ? await uploadExtraImages(galleryFiles, "gallery")
        : form.gallery_urls;
      const environmentUrls = envFiles.length > 0
        ? await uploadExtraImages(envFiles, "env")
        : form.environment_urls;

      const { duplicate } = await submitProduct({
        name: form.name,
        category: form.category,
        subcategory: form.subcategory || null,
        short_description: form.short_description || null,
        long_description: form.long_description || null,
        image_url: finalImageUrl || null,
        gallery_urls: galleryUrls.length > 0 ? galleryUrls : null,
        environment_urls: environmentUrls.length > 0 ? environmentUrls : null,
        price_min: form.price_min,
        price_max: form.price_max,
        main_color: form.main_color || null,
        secondary_color: form.secondary_color || null,
        material_structure: form.material_structure || null,
        material_seat: form.material_seat || null,
        style_tags: form.style_tags.length > 0 ? form.style_tags : null,
        ambience_tags: form.ambience_tags.length > 0 ? form.ambience_tags : null,
        material_tags: form.material_tags.length > 0 ? form.material_tags : null,
        use_case_tags: form.use_case_tags.length > 0 ? form.use_case_tags : null,
        dimensions_length_cm: form.dimensions_length_cm,
        dimensions_width_cm: form.dimensions_width_cm,
        dimensions_height_cm: form.dimensions_height_cm,
        seat_height_cm: form.seat_height_cm,
        weight_kg: form.weight_kg,
        is_outdoor: form.is_outdoor,
        is_stackable: form.is_stackable,
        is_chr_heavy_use: form.is_chr_heavy_use,
        weather_resistant: form.weather_resistant,
        uv_resistant: form.uv_resistant,
        lightweight: form.lightweight,
        easy_maintenance: form.easy_maintenance,
        stock_status: form.stock_status || null,
        stock_quantity: form.stock_quantity,
        estimated_delivery_days: form.estimated_delivery_days,
        country_of_manufacture: form.country_of_manufacture || null,
        warranty: form.warranty || null,
      } as any);

      toast.success("Product submitted for review", {
        description: duplicate
          ? "A potential duplicate was detected — our team will review it."
          : "Il sera visible après validation par l'équipe Terrassea.",
      });
      onSuccess();
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error("Erreur lors de l'enregistrement", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  // ── Render helpers ──

  const renderInput = (label: string, field: keyof ProductFormData, type = "text", required = false, placeholder?: string, suffix?: string) => (
    <div key={field}>
      <label className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          type={type}
          value={String(form[field] ?? "")}
          onChange={e => set(field, type === "number" ? (e.target.value ? Number(e.target.value) : null) : e.target.value)}
          placeholder={placeholder}
          className="w-full bg-card border border-border rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-body text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );

  const renderSelect = (label: string, field: keyof ProductFormData, options: { value: string; label: string }[], required = false) => (
    <div key={field}>
      <label className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        value={String(form[field] ?? "")}
        onChange={e => set(field, e.target.value)}
        className="w-full bg-card border border-border rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
      >
        <option value="">— Sélectionner —</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  const renderToggle = (label: string, field: keyof ProductFormData) => (
    <label key={field} className="flex items-center gap-2.5 cursor-pointer group">
      <div
        onClick={() => set(field, !form[field])}
        className={`relative w-8 h-[18px] rounded-full transition-colors ${form[field] ? "bg-foreground" : "bg-border group-hover:bg-muted-foreground/30"}`}
      >
        <div className={`absolute top-[3px] left-[3px] w-3 h-3 rounded-full bg-white transition-transform ${form[field] ? "translate-x-3.5" : ""}`} />
      </div>
      <span className="text-xs font-body text-foreground">{label}</span>
    </label>
  );

  const TagsDisplay = ({ tags, color = "bg-muted text-muted-foreground" }: { tags: string[]; color?: string }) => (
    <div className="flex flex-wrap gap-1">
      {tags.map(t => (
        <span key={t} className={`text-[9px] font-display font-semibold px-2 py-0.5 rounded-full ${color}`}>
          {t}
        </span>
      ))}
    </div>
  );

  const commissionAmount = form.price_min ? form.price_min * (config.commission / 100) : 0;
  const clientPrice = form.price_min ? form.price_min + commissionAmount : 0;

  const SECTION_TABS = [
    { id: "photo", label: "Photo & IA", icon: Camera },
    { id: "basics", label: "Informations", icon: Package },
    { id: "specs", label: "Caractéristiques", icon: Info },
    { id: "pricing", label: "Prix & Stock", icon: AlertTriangle },
  ];

  const filledCount = [
    form.name, form.category, form.short_description,
    form.price_min != null, form.main_color, form.material_structure,
    form.style_tags.length > 0, form.use_case_tags.length > 0,
    imagePreview,
  ].filter(Boolean).length;
  const completionPercent = Math.round((filledCount / 9) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8">
      <div className="bg-background border border-border rounded-sm shadow-xl w-full max-w-2xl mx-4 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-display font-bold text-base text-foreground">Ajouter un produit</h2>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1.5">
                <div className="w-20 h-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${completionPercent}%` }} />
                </div>
                <span className="text-[9px] font-body text-muted-foreground">{completionPercent}%</span>
              </div>
              {aiApplied && aiConfidence != null && (
                <span className="flex items-center gap-1 text-[9px] font-display font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <Sparkles className="h-2.5 w-2.5" />
                  IA {Math.round(aiConfidence * 100)}% confiance
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Section tabs */}
        <div className="flex border-b border-border">
          {SECTION_TABS.map(s => (
            <button
              key={s.id}
              onClick={() => setSection(s.id as typeof section)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-display font-semibold border-b-2 -mb-px transition-colors ${
                section === s.id
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <s.icon className="h-3.5 w-3.5" />
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
          {/* ── Photo & IA ── */}
          {section === "photo" && (
            <div className="space-y-5">
              {/* Upload zone */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-sm p-8 text-center cursor-pointer transition-colors ${
                  imagePreview ? "border-foreground/20" : "border-border hover:border-foreground/30"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-h-64 mx-auto rounded-sm object-contain"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setImagePreview(null);
                        setImageFile(null);
                        setAiApplied(false);
                        setAiConfidence(null);
                      }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 border border-border flex items-center justify-center hover:bg-background transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-display font-semibold text-foreground mb-1">
                      Glissez une photo ou cliquez pour sélectionner
                    </p>
                    <p className="text-[10px] font-body text-muted-foreground">
                      JPG, PNG ou WebP · Max 10 Mo
                    </p>
                  </div>
                )}
              </div>

              {/* AI Analysis button */}
              {imagePreview && (
                <button
                  onClick={analyzeWithAI}
                  disabled={analyzing}
                  className="w-full flex items-center justify-center gap-2.5 py-3 text-sm font-display font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Analyser avec l'IA — préremplir les caractéristiques
                    </>
                  )}
                </button>
              )}

              {/* AI results summary */}
              {aiApplied && (
                <div className="border border-emerald-200 bg-emerald-50 rounded-sm p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    <p className="text-xs font-display font-semibold text-emerald-700">
                      Caractéristiques préremplies par l'IA
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-body text-emerald-700">
                    {form.name && <div><strong>Nom :</strong> {form.name}</div>}
                    {form.category && <div><strong>Catégorie :</strong> {CATEGORIES.find(c => c.value === form.category)?.label}</div>}
                    {form.material_structure && <div><strong>Structure :</strong> {form.material_structure}</div>}
                    {form.main_color && <div><strong>Couleur :</strong> {form.main_color}</div>}
                  </div>
                  {form.style_tags.length > 0 && (
                    <div>
                      <p className="text-[9px] font-display font-semibold text-emerald-600 mb-1">Tags style :</p>
                      <TagsDisplay tags={form.style_tags} color="bg-emerald-100 text-emerald-700" />
                    </div>
                  )}
                  <p className="text-[9px] font-body text-emerald-600">
                    Naviguez dans les onglets pour vérifier et ajuster les valeurs.
                  </p>
                </div>
              )}

              {/* Product gallery photos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("gallery.uploadProduct")} ({galleryFiles.length}/5)
                  </label>
                  {galleryFiles.length < 5 && (
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="text-[10px] font-display font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      + {t("gallery.productPhotos")}
                    </button>
                  )}
                </div>
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleGallerySelect}
                  className="hidden"
                />
                {galleryFiles.length > 0 ? (
                  <div className="flex gap-2 flex-wrap">
                    {galleryFiles.map((g, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-sm overflow-hidden border-2 border-blue-200">
                        <img src={g.preview} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeGalleryFile(i)}
                          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-background/80 border border-border flex items-center justify-center hover:bg-background"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="w-full border border-dashed border-blue-200 rounded-sm p-3 text-center hover:border-blue-400 transition-colors"
                  >
                    <ImageIcon className="h-5 w-5 text-blue-300 mx-auto mb-1" />
                    <p className="text-[10px] font-body text-muted-foreground">
                      {t("gallery.maxProductPhotos")}
                    </p>
                  </button>
                )}
              </div>

              {/* Environment photos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("gallery.uploadEnvironment")} ({envFiles.length}/3)
                  </label>
                  {envFiles.length < 3 && (
                    <button
                      type="button"
                      onClick={() => envInputRef.current?.click()}
                      className="text-[10px] font-display font-semibold text-green-600 hover:text-green-700 transition-colors"
                    >
                      + {t("gallery.environmentPhotos")}
                    </button>
                  )}
                </div>
                <input
                  ref={envInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleEnvSelect}
                  className="hidden"
                />
                {envFiles.length > 0 ? (
                  <div className="flex gap-2 flex-wrap">
                    {envFiles.map((g, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-sm overflow-hidden border-2 border-green-200">
                        <img src={g.preview} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeEnvFile(i)}
                          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-background/80 border border-border flex items-center justify-center hover:bg-background"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-green-500" />
                        <span className="absolute top-0.5 left-0.5 text-[6px] font-display font-semibold bg-green-500/80 text-white px-1 rounded">
                          {t("gallery.inSitu")}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => envInputRef.current?.click()}
                    className="w-full border border-dashed border-green-200 rounded-sm p-3 text-center hover:border-green-400 transition-colors"
                  >
                    <ImageIcon className="h-5 w-5 text-green-300 mx-auto mb-1" />
                    <p className="text-[10px] font-body text-muted-foreground">
                      {t("gallery.maxEnvironmentPhotos")}
                    </p>
                  </button>
                )}
              </div>

              {!imagePreview && (
                <div className="flex items-start gap-2 px-4 py-3 bg-card border border-border rounded-sm">
                  <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-[10px] font-body text-muted-foreground leading-relaxed">
                    Ajoutez une photo de votre produit pour que notre IA détecte automatiquement le type de mobilier,
                    les matériaux, les couleurs, les dimensions estimées et les tags pertinents.
                    Vous pourrez ensuite ajuster manuellement chaque champ.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Informations de base ── */}
          {section === "basics" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {renderInput("Nom du produit", "name", "text", true, "Ex: Chaise empilable Riviera")}
                {renderSelect("Catégorie", "category", CATEGORIES, true)}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {renderInput("Sous-catégorie", "subcategory", "text", false, "Ex: dining-chair, bar-stool")}
                {renderSelect("Couleur principale", "main_color", COLOR_OPTIONS.map(c => ({ value: c, label: c })))}
              </div>
              <div>
                <label className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                  Description courte
                </label>
                <textarea
                  value={form.short_description}
                  onChange={e => set("short_description", e.target.value)}
                  rows={2}
                  placeholder="Décrivez votre produit en 1-2 phrases..."
                  className="w-full bg-card border border-border rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground resize-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                  Description longue
                </label>
                <textarea
                  value={form.long_description}
                  onChange={e => set("long_description", e.target.value)}
                  rows={4}
                  placeholder="Description détaillée, arguments de vente, particularités..."
                  className="w-full bg-card border border-border rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {renderInput("Matériau structure", "material_structure", "text", false, "Ex: aluminium, teck")}
                {renderInput("Matériau assise", "material_seat", "text", false, "Ex: textilène, coussin")}
              </div>

              {/* Tags */}
              <div>
                <button
                  onClick={() => setExpandedTags(!expandedTags)}
                  className="flex items-center gap-2 text-xs font-display font-semibold text-foreground mb-3"
                >
                  Tags & classifications
                  {expandedTags ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {(form.style_tags.length + form.use_case_tags.length + form.material_tags.length) > 0 && (
                    <span className="text-[9px] font-body text-muted-foreground">
                      ({form.style_tags.length + form.use_case_tags.length + form.material_tags.length} tags)
                    </span>
                  )}
                </button>
                {expandedTags && (
                  <div className="space-y-3 pl-1">
                    <TagEditor label="Style" tags={form.style_tags} onChange={v => set("style_tags", v)} />
                    <TagEditor label="Ambiance" tags={form.ambience_tags} onChange={v => set("ambience_tags", v)} />
                    <TagEditor label="Matériaux" tags={form.material_tags} onChange={v => set("material_tags", v)} />
                    <TagEditor label="Cas d'usage" tags={form.use_case_tags} onChange={v => set("use_case_tags", v)} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Caractéristiques techniques ── */}
          {section === "specs" && (
            <div className="space-y-5">
              <p className="text-xs font-display font-semibold text-foreground">Dimensions</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {renderInput("Longueur", "dimensions_length_cm", "number", false, "—", "cm")}
                {renderInput("Largeur", "dimensions_width_cm", "number", false, "—", "cm")}
                {renderInput("Hauteur", "dimensions_height_cm", "number", false, "—", "cm")}
                {renderInput("Haut. assise", "seat_height_cm", "number", false, "—", "cm")}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {renderInput("Poids", "weight_kg", "number", false, "—", "kg")}
                {renderInput("Pays de fabrication", "country_of_manufacture", "text", false, "Ex: Italie, Espagne")}
              </div>

              <p className="text-xs font-display font-semibold text-foreground pt-2">Propriétés</p>
              <div className="grid grid-cols-2 gap-3">
                {renderToggle("Usage extérieur", "is_outdoor")}
                {renderToggle("Empilable", "is_stackable")}
                {renderToggle("Usage CHR intensif", "is_chr_heavy_use")}
                {renderToggle("Résistant aux intempéries", "weather_resistant")}
                {renderToggle("Résistant UV", "uv_resistant")}
                {renderToggle("Léger", "lightweight")}
                {renderToggle("Entretien facile", "easy_maintenance")}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                {renderInput("Garantie", "warranty", "text", false, "Ex: 3 ans")}
              </div>
            </div>
          )}

          {/* ── Prix & Stock ── */}
          {section === "pricing" && (
            <div className="space-y-5">
              {/* Commission reminder */}
              <div
                className="flex items-start gap-3 px-4 py-3 rounded-sm border"
                style={{ background: config.bg, borderColor: config.border }}
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: config.color }} />
                <div className="text-[10px] font-body leading-relaxed" style={{ color: config.color }}>
                  <strong>Plan {config.label} — Commission {config.commission}%</strong>
                  <br />
                  Indiquez votre prix HT. La commission Terrassea de {config.commission}% sera ajoutée au prix présenté au client.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  {renderInput("Prix minimum HT", "price_min", "number", true, "0", "€")}
                  {form.price_min != null && form.price_min > 0 && (
                    <p className="text-[9px] font-body text-amber-600 mt-1">
                      +{config.commission}% comm. ≈ €{commissionAmount.toFixed(0)} → Client : <strong>€{clientPrice.toFixed(0)}</strong>
                    </p>
                  )}
                </div>
                <div>
                  {renderInput("Prix maximum HT", "price_max", "number", false, "Optionnel", "€")}
                  {form.price_max != null && form.price_max > 0 && (
                    <p className="text-[9px] font-body text-amber-600 mt-1">
                      → Client : <strong>€{(form.price_max + form.price_max * config.commission / 100).toFixed(0)}</strong>
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {renderSelect("Statut du stock", "stock_status", STOCK_OPTIONS)}
                {renderInput("Quantité en stock", "stock_quantity", "number", false, "—")}
              </div>

              {renderInput("Délai de livraison estimé", "estimated_delivery_days", "number", false, "—", "jours")}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-display font-semibold border border-border rounded-full hover:border-foreground transition-colors"
          >
            Annuler
          </button>
          <div className="flex items-center gap-3">
            {section !== "pricing" ? (
              <button
                onClick={() => {
                  const order = ["photo", "basics", "specs", "pricing"] as const;
                  const idx = order.indexOf(section);
                  if (idx < order.length - 1) setSection(order[idx + 1]);
                }}
                className="flex items-center gap-2 px-5 py-2 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
              >
                Suivant
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving || !form.name || !form.category}
                className="flex items-center gap-2 px-5 py-2 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Check className="h-3 w-3" />
                    Enregistrer le produit
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tag Editor ─────────────────────────────────────────────────────────────────

function TagEditor({
  label, tags, onChange,
}: {
  label: string; tags: string[]; onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const tag = input.trim().toLowerCase().replace(/\s+/g, "-");
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setInput("");
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter(t => t !== tag));
  };

  return (
    <div>
      <label className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
        {label}
      </label>
      <div className="flex flex-wrap gap-1 mb-1.5">
        {tags.map(t => (
          <span
            key={t}
            className="inline-flex items-center gap-1 text-[9px] font-display font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full"
          >
            {t}
            <button onClick={() => removeTag(t)} className="hover:text-foreground">
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
      </div>
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
        placeholder={`Ajouter un tag ${label.toLowerCase()}...`}
        className="w-full bg-card border border-border rounded-sm px-3 py-1.5 text-[11px] font-body outline-none focus:ring-1 focus:ring-foreground"
      />
    </div>
  );
}
