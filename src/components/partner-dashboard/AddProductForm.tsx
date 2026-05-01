import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProductSubmission } from "@/hooks/useProductSubmissions";
import { toast } from "sonner";
import {
  X, Upload, Sparkles, Camera, Check, Loader2, AlertTriangle,
  ChevronDown, ChevronUp, Package, Image as ImageIcon, Info,
  Plus, Trash2, Layers,
} from "lucide-react";
import { PLAN_CONFIG, type PartnerPlan } from "./PartnerSections";
import VariantsSection from "./VariantsSection";
import type { DimensionVariant } from "@/lib/products";
import { validateImageUpload } from "@/lib/validateUpload";
import {
  TableSpecsSection,
  ParasolSpecsSection,
  SunLoungerSpecsSection,
  SofaSpecsSection,
  BarStoolSpecsSection,
  HighTableSpecsSection,
  type TableSpecs,
  type ParasolSpecs,
  type SunLoungerSpecs,
  type SofaSpecs,
  type BarStoolSpecs,
  type HighTableSpecs,
  type SubdivisionOption,
  defaultTableSpecs,
  defaultParasolSpecs,
  defaultSunLoungerSpecs,
  defaultSofaSpecs,
  defaultBarStoolSpecs,
  defaultHighTableSpecs,
} from "@/components/products/specs";

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
  dimension_variants: DimensionVariant[];
  product_type_tags: Record<string, any>;
  tableSpecs: TableSpecs;
  parasolSpecs: ParasolSpecs;
  sunLoungerSpecs: SunLoungerSpecs;
  sofaSpecs: SofaSpecs;
  barStoolSpecs: BarStoolSpecs;
  highTableSpecs: HighTableSpecs;
}

const EMPTY_FORM: ProductFormData = {
  name: "", category: "", subcategory: "", short_description: "", long_description: "",
  image_url: "", gallery_urls: [], environment_urls: [], price_min: null, price_max: null,
  main_color: "", secondary_color: "", material_structure: "", material_seat: "",
  style_tags: [], ambience_tags: [], use_case_tags: [],
  dimensions_length_cm: null, dimensions_width_cm: null, dimensions_height_cm: null,
  seat_height_cm: null, weight_kg: null,
  is_outdoor: true, is_stackable: false, is_chr_heavy_use: false,
  weather_resistant: false, uv_resistant: false, lightweight: false, easy_maintenance: false,
  stock_status: "in_stock", stock_quantity: null, estimated_delivery_days: null,
  country_of_manufacture: "", warranty: "",
  dimension_variants: [],
  product_type_tags: {},
  tableSpecs: defaultTableSpecs,
  parasolSpecs: defaultParasolSpecs,
  sunLoungerSpecs: defaultSunLoungerSpecs,
  sofaSpecs: defaultSofaSpecs,
  barStoolSpecs: defaultBarStoolSpecs,
  highTableSpecs: defaultHighTableSpecs,
};

const CATEGORIES = [
  { value: "chairs",      label: "Chaises" },
  { value: "tables",      label: "Tables" },
  { value: "armchairs",   label: "Fauteuils" },
  { value: "sofas",       label: "Canapés / Banquettes" },
  { value: "loungers",    label: "Bains de soleil" },
  { value: "parasols",    label: "Parasols" },
  { value: "bar-stools",  label: "Tabourets de bar" },
  { value: "accessories", label: "Accessoires" },
];

const SEATING_LIKE_CATEGORIES = ["chairs", "armchairs", "bar-stools"] as const;
const isSeatingLike = (cat: string): boolean =>
  (SEATING_LIKE_CATEGORIES as readonly string[]).includes(cat);

const COLOR_OPTIONS = [
  "white", "black", "grey", "anthracite", "brown", "natural", "beige", "cream",
  "taupe", "camel", "sand", "teak", "walnut",
  "blue", "navy", "petrol", "turquoise",
  "green", "sage", "olive",
  "terracotta", "rust", "orange", "coral",
  "red", "bordeaux", "pink", "blush", "lavender",
  "yellow", "mustard", "gold",
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
  editMode = false,
  editProductId,
  editInitialData,
  editSubmissionId,
  collectionName,
}: {
  plan: PartnerPlan;
  editMode?: boolean;
  editProductId?: string;
  editInitialData?: Record<string, any>;
  editSubmissionId?: string;
  onClose: () => void;
  onSuccess: () => void;
  collectionName?: string;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { submitProduct, isSubmitting } = useProductSubmission();
  const config = PLAN_CONFIG[plan];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const envInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ProductFormData>(() => {
    if (editInitialData) {
      const d = editInitialData;
      return {
        name: d.name || "",
        category: d.category || "",
        subcategory: d.subcategory || "",
        short_description: d.short_description || "",
        long_description: d.long_description || "",
        image_url: d.image_url || "",
        gallery_urls: d.gallery_urls || [],
        environment_urls: d.environment_urls || [],
        price_min: d.price_min ?? null,
        price_max: d.price_max ?? null,
        main_color: d.main_color || "",
        secondary_color: d.secondary_color || "",
        material_structure: d.material_structure || "",
        material_seat: d.material_seat || "",
        style_tags: d.style_tags || [],
        ambience_tags: d.ambience_tags || [],

        use_case_tags: d.use_case_tags || [],
        dimensions_length_cm: d.dimensions_length_cm ?? null,
        dimensions_width_cm: d.dimensions_width_cm ?? null,
        dimensions_height_cm: d.dimensions_height_cm ?? null,
        seat_height_cm: d.seat_height_cm ?? null,
        weight_kg: d.weight_kg ?? null,
        is_outdoor: d.is_outdoor ?? true,
        is_stackable: d.is_stackable ?? false,
        is_chr_heavy_use: d.is_chr_heavy_use ?? false,
        weather_resistant: d.weather_resistant ?? false,
        uv_resistant: d.uv_resistant ?? false,
        lightweight: d.lightweight ?? false,
        easy_maintenance: d.easy_maintenance ?? false,
        stock_status: d.stock_status || "in_stock",
        stock_quantity: d.stock_quantity ?? null,
        estimated_delivery_days: d.estimated_delivery_days ?? null,
        country_of_manufacture: d.country_of_manufacture || "",
        warranty: d.warranty || "",
        dimension_variants: Array.isArray(d.dimension_variants) ? d.dimension_variants : [],
        product_type_tags: (d as any).product_type_tags || {},
        tableSpecs: {
          built_in_umbrella_hole: d.built_in_umbrella_hole ?? false,
          umbrella_hole_diameter_mm: d.umbrella_hole_diameter_mm ?? null,
          top_thickness_cm: d.top_thickness_cm != null ? Number(d.top_thickness_cm) : null,
          is_tippable: d.is_tippable ?? false,
          extension_capability: d.extension_capability ?? false,
          extension_max_length_cm: d.extension_max_length_cm ?? null,
          outdoor_anchor_compatible: d.outdoor_anchor_compatible ?? false,
        },
        parasolSpecs: {
          fabric_g_m2: d.fabric_g_m2 ?? null,
          fabric_certification: d.fabric_certification ?? "Unknown",
          min_base_weight_kg: d.min_base_weight_kg ?? null,
          pole_diameter_mm: d.pole_diameter_mm ?? null,
          heating_compatible: d.heating_compatible ?? false,
          wind_beaufort_max: d.wind_beaufort_max ?? null,
        },
        sunLoungerSpecs: {
          cushion_quick_dry: d.cushion_quick_dry ?? false,
          salt_water_resistance: d.salt_water_resistance ?? false,
          chlorine_resistance: d.chlorine_resistance ?? false,
          sand_drainage: d.sand_drainage ?? false,
          nesting_capacity: d.nesting_capacity ?? null,
        },
        sofaSpecs: {
          available_modules: Array.isArray(d.available_modules) ? d.available_modules : [],
          seat_depth_cm: d.seat_depth_cm != null ? Number(d.seat_depth_cm) : null,
          cushion_replacement_available: d.cushion_replacement_available ?? false,
          acoustic_nrc: d.acoustic_nrc != null ? Number(d.acoustic_nrc) : null,
        },
        barStoolSpecs: {
          seat_height_cm: d.seat_height_cm != null ? Number(d.seat_height_cm) : null,
          subdivision: (d.subdivision as SubdivisionOption) ?? "unknown",
          footrest: d.footrest ?? false,
          swivel: d.swivel ?? false,
        },
        highTableSpecs: {
          table_top_height_cm: d.table_top_height_cm != null ? Number(d.table_top_height_cm) : null,
          subdivision: (d.subdivision as SubdivisionOption) ?? "unknown",
        },
      };
    }
    return EMPTY_FORM;
  });
  const [imagePreview, setImagePreview] = useState<string | null>(editInitialData?.image_url ? editInitialData.image_url : null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<{ file: File; preview: string }[]>([]);
  const [envFiles, setEnvFiles] = useState<{ file: File; preview: string }[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [aiApplied, setAiApplied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<"photo" | "basics" | "specs" | "pricing" | "variants">("photo");
  const [expandedTags, setExpandedTags] = useState(false);

  const set = useCallback((key: keyof ProductFormData, val: unknown) =>
    setForm(prev => ({ ...prev, [key]: val })),
  []);

  // ── Image handling ──

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const vErr = validateImageUpload(file, { maxSizeMB: 10 });
    if (vErr) { toast.error(vErr); return; }
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
    if (!file) return;
    const vErr = validateImageUpload(file, { maxSizeMB: 10 });
    if (vErr) { toast.error(vErr); return; }
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
    const toAdd = files.slice(0, remaining).filter(f => !validateImageUpload(f, { maxSizeMB: 10 }));
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
    const toAdd = files.slice(0, remaining).filter(f => !validateImageUpload(f, { maxSizeMB: 10 }));
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

      // For tables, product_type_tags is the source of truth; material_structure/seat stay for non-table categories
      const isTableCategory = form.category === "tables";
      const pttPayload = isTableCategory && Object.keys(form.product_type_tags || {}).length > 0
        ? form.product_type_tags
        : null;

      const productPayload = {
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
        material_structure: isTableCategory ? null : (form.material_structure || null),
        material_seat: isTableCategory ? null : (form.material_seat || null),
        product_type_tags: pttPayload,
        style_tags: form.style_tags.length > 0 ? form.style_tags : null,
        ambience_tags: form.ambience_tags.length > 0 ? form.ambience_tags : null,

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
        dimension_variants: form.dimension_variants.length > 0 ? form.dimension_variants : null,
        collection: collectionName || null,
        ...(isTableCategory ? {
          built_in_umbrella_hole: form.tableSpecs.built_in_umbrella_hole,
          umbrella_hole_diameter_mm: form.tableSpecs.umbrella_hole_diameter_mm,
          top_thickness_cm: form.tableSpecs.top_thickness_cm,
          is_tippable: form.tableSpecs.is_tippable,
          extension_capability: form.tableSpecs.extension_capability,
          extension_max_length_cm: form.tableSpecs.extension_max_length_cm,
          outdoor_anchor_compatible: form.tableSpecs.outdoor_anchor_compatible,
        } : {}),
        ...(form.category === "parasols" ? {
          fabric_g_m2: form.parasolSpecs.fabric_g_m2,
          fabric_certification: form.parasolSpecs.fabric_certification,
          min_base_weight_kg: form.parasolSpecs.min_base_weight_kg,
          pole_diameter_mm: form.parasolSpecs.pole_diameter_mm,
          heating_compatible: form.parasolSpecs.heating_compatible,
          wind_beaufort_max: form.parasolSpecs.wind_beaufort_max,
        } : {}),
        ...(form.category === "loungers" ? {
          cushion_quick_dry: form.sunLoungerSpecs.cushion_quick_dry,
          salt_water_resistance: form.sunLoungerSpecs.salt_water_resistance,
          chlorine_resistance: form.sunLoungerSpecs.chlorine_resistance,
          sand_drainage: form.sunLoungerSpecs.sand_drainage,
          nesting_capacity: form.sunLoungerSpecs.nesting_capacity,
        } : {}),
        ...(form.category === "sofas" ? {
          available_modules: form.sofaSpecs.available_modules,
          seat_depth_cm: form.sofaSpecs.seat_depth_cm,
          cushion_replacement_available: form.sofaSpecs.cushion_replacement_available,
          acoustic_nrc: form.sofaSpecs.acoustic_nrc,
        } : {}),
        ...(form.category === "bar-stools" ? {
          seat_height_cm: form.barStoolSpecs.seat_height_cm,
          subdivision: form.barStoolSpecs.subdivision,
          footrest: form.barStoolSpecs.footrest,
          swivel: form.barStoolSpecs.swivel,
        } : {}),
        ...(form.category === "tables" && form.subcategory.toLowerCase().includes("high") ? {
          table_top_height_cm: form.highTableSpecs.table_top_height_cm,
          subdivision: form.highTableSpecs.subdivision,
        } : {}),
      } as any;

      // If editing an existing submission, update it in place instead of creating a new one
      if (editSubmissionId) {
        const { error: updateError } = await supabase
          .from("product_submissions")
          .update({ product_data: productPayload, updated_at: new Date().toISOString() } as any)
          .eq("id", editSubmissionId);
        if (updateError) throw updateError;
        toast.success("Produit mis à jour", {
          description: "Vos modifications ont été enregistrées. Le produit est en attente de validation.",
        });
        onSuccess();
        return;
      }

      const { duplicate } = await submitProduct(productPayload, editMode && editProductId ? {
        editMode: true,
        targetProductId: editProductId,
      } : undefined);

      toast.success(
        editMode ? "Modification soumise" : "Produit soumis pour validation",
        {
          description: editMode
            ? "Votre modification sera visible après validation par l'équipe Terrassea."
            : duplicate
            ? "Un doublon potentiel a été détecté — notre équipe va vérifier."
            : "Il sera visible après validation par l'équipe Terrassea.",
        },
      );
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
    { id: "variants", label: "Variantes", icon: Layers },
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
            <h2 className="font-display font-bold text-base text-foreground">{editMode ? "Modifier un produit" : editInitialData ? "Compléter le produit" : "Ajouter un produit"}</h2>
            {collectionName && (
              <span className="inline-flex items-center gap-1 text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 mt-1">
                <Package className="h-2.5 w-2.5" /> {collectionName}
              </span>
            )}
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
              <div className="grid grid-cols-2 gap-4">
                {renderSelect("Couleur secondaire (optionnel)", "secondary_color",
                  [{ value: "", label: "— Aucune —" }, ...COLOR_OPTIONS.map(c => ({ value: c, label: c }))])}
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
                  {(form.style_tags.length + form.use_case_tags.length) > 0 && (
                    <span className="text-[9px] font-body text-muted-foreground">
                      ({form.style_tags.length + form.use_case_tags.length} tags)
                    </span>
                  )}
                </button>
                {expandedTags && (
                  <div className="space-y-3 pl-1">
                    <TagEditor label="Style" tags={form.style_tags} onChange={v => set("style_tags", v)} />
                    <TagEditor label="Ambiance" tags={form.ambience_tags} onChange={v => set("ambience_tags", v)} />
                    <TagEditor label="Cas d'usage" tags={form.use_case_tags} onChange={v => set("use_case_tags", v)} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Caractéristiques techniques ── */}
          {section === "specs" && (
            <div className="space-y-5">
              {/* ── Category-specific fields ── */}
              {isSeatingLike(form.category) && (
                <>
                  <p className="text-xs font-display font-semibold text-foreground">Spécifications — Assises</p>
                  <div className="grid grid-cols-2 gap-3">
                    {renderSelect("Silhouette", "material_structure", ["bistrot","4-leg","sled","cantilever","lounge","shell","cross-back","folding","stacking"].map(v => ({ value: v, label: v })))}
                    {renderSelect("Type d'assise", "material_seat", ["pp-shell","rope-woven","textilène","coussin","teck-massif","alu-massif","rotin-tressé","lattes-bois","mesh","tissu-stretch"].map(v => ({ value: v, label: v })))}
                  </div>
                </>
              )}

              {(form.category === "tables") && (() => {
                const ptt = form.product_type_tags || {};
                const tableType = ptt.table_type || "";
                const setPtt = (key: string, val: any) => setForm(prev => ({ ...prev, product_type_tags: { ...prev.product_type_tags, [key]: val } }));
                const selectCls = "w-full bg-card border border-border rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground";
                const labelCls = "text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1";
                const PttSelect = ({ label, field, options, required }: { label: string; field: string; options: { value: string; label: string }[]; required?: boolean }) => (
                  <div>
                    <label className={labelCls}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
                    <select value={ptt[field] || ""} onChange={e => setPtt(field, e.target.value)} className={selectCls}>
                      <option value="">— Sélectionner —</option>
                      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                );
                return (
                  <>
                    <p className="text-xs font-display font-semibold text-foreground">Spécifications — Tables</p>
                    <div className="grid grid-cols-2 gap-3">
                      <PttSelect label="Type de table *" field="table_type" required options={[
                        { value: "complete", label: "Table complète" },
                        { value: "base-only", label: "Piètement seul" },
                        { value: "top-only", label: "Plateau seul" },
                      ]} />
                      <PttSelect label="Type de hauteur" field="height_type" options={[
                        { value: "dining", label: "Dining" },
                        { value: "coffee", label: "Table basse" },
                        { value: "high-bar", label: "Mange-debout" },
                        { value: "console", label: "Console" },
                      ]} />
                    </div>
                    {tableType && (
                      <div className="grid grid-cols-2 gap-3">
                        {tableType !== "base-only" && (
                          <PttSelect label="Forme" field="shape" options={[
                            { value: "square", label: "Carré" },
                            { value: "rectangular", label: "Rectangulaire" },
                            { value: "round", label: "Rond" },
                            { value: "oval", label: "Ovale" },
                          ]} />
                        )}
                        {tableType !== "base-only" && (
                          <PttSelect label="Matériau plateau" field="top_material" options={[
                            { value: "hpl", label: "HPL" }, { value: "teak", label: "Teck" },
                            { value: "alu-top", label: "Aluminium" }, { value: "ceramic", label: "Céramique" },
                            { value: "marble-effect", label: "Effet marbre" }, { value: "werzalit", label: "Werzalit" },
                            { value: "compact", label: "Compact" }, { value: "glass", label: "Verre" },
                            { value: "concrete", label: "Béton" },
                          ]} />
                        )}
                        {tableType !== "top-only" && (
                          <PttSelect label="Type de piètement" field="base_type" options={[
                            { value: "pedestal", label: "Pied central" }, { value: "4-leg", label: "4 pieds" },
                            { value: "bistrot-base", label: "Base bistrot" }, { value: "folding-base", label: "Pliant" },
                            { value: "x-frame", label: "Croisillon" }, { value: "tulip-base", label: "Tulipe" },
                          ]} />
                        )}
                        {tableType !== "base-only" && (
                          <PttSelect label="Finition bord" field="edge_finish" options={[
                            { value: "square", label: "Droit" },
                            { value: "beveled", label: "Biseauté" },
                            { value: "rounded", label: "Arrondi" },
                          ]} />
                        )}
                      </div>
                    )}
                  </>
                );
              })()}

              {(form.category === "parasols") && (
                <>
                  <p className="text-xs font-display font-semibold text-foreground">Spécifications — Parasols</p>
                  <div className="grid grid-cols-2 gap-3">
                    {renderSelect("Type", "material_structure", ["mât-central","déporté","mural","voile","pergola"].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) })))}
                    {renderSelect("Forme", "material_seat", ["rond","carré","rectangulaire","hexagonal"].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) })))}
                  </div>
                </>
              )}

              {(form.category === "loungers") && (
                <>
                  <p className="text-xs font-display font-semibold text-foreground">Spécifications — Bains de soleil</p>
                  <div className="grid grid-cols-2 gap-3">
                    {renderSelect("Matériau structure", "material_structure", ["aluminium","acier","teck","résine-hdpe"].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) })))}
                    {renderSelect("Type de coussin", "material_seat", ["quick-dry","déhoussable","waterproof","intégré","sunbrella","sans"].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) })))}
                  </div>
                </>
              )}

              {(form.category === "sofas") && (
                <>
                  <p className="text-xs font-display font-semibold text-foreground">Spécifications — Canapés</p>
                  <div className="grid grid-cols-2 gap-3">
                    {renderSelect("Matériau structure", "material_structure", ["aluminium","teck","résine-hdpe","acier"].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) })))}
                    {renderSelect("Type d'assise", "material_seat", ["coussin","rope-woven","textilène","intégré"].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) })))}
                  </div>
                </>
              )}

              {/* ── Dimensions (all categories) ── */}
              <p className="text-xs font-display font-semibold text-foreground pt-2">Dimensions</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {renderInput("Longueur", "dimensions_length_cm", "number", false, "—", "cm")}
                {renderInput("Largeur", "dimensions_width_cm", "number", false, "—", "cm")}
                {renderInput("Hauteur", "dimensions_height_cm", "number", false, "—", "cm")}
                {isSeatingLike(form.category) && renderInput("Haut. assise", "seat_height_cm", "number", false, "—", "cm")}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {renderInput("Poids", "weight_kg", "number", false, "—", "kg")}
                {renderInput("Pays de fabrication", "country_of_manufacture", "text", false, "Ex: Italie, Espagne")}
              </div>

              {/* ── Properties (adaptive) ── */}
              <p className="text-xs font-display font-semibold text-foreground pt-2">Propriétés</p>
              <div className="grid grid-cols-2 gap-3">
                {renderToggle("Usage extérieur", "is_outdoor")}
                {isSeatingLike(form.category) && renderToggle("Empilable", "is_stackable")}
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

              {/* Table specs (chantier vocab 2026 — caractéristiques techniques) */}
              {form.category === "tables" && (
                <div className="border border-border rounded-md p-4 mb-4 bg-card/30">
                  <TableSpecsSection
                    value={form.tableSpecs}
                    onChange={(next) => setForm(prev => ({ ...prev, tableSpecs: next }))}
                  />
                </div>
              )}

              {/* Parasol specs (chantier vocab 2026) */}
              {form.category === "parasols" && (
                <div className="border border-border rounded-md p-4 mb-4 bg-card/30">
                  <ParasolSpecsSection
                    value={form.parasolSpecs}
                    onChange={(next) => setForm(prev => ({ ...prev, parasolSpecs: next }))}
                  />
                </div>
              )}

              {/* Sun lounger specs (chantier vocab 2026) */}
              {form.category === "loungers" && (
                <div className="border border-border rounded-md p-4 mb-4 bg-card/30">
                  <SunLoungerSpecsSection
                    value={form.sunLoungerSpecs}
                    onChange={(next) => setForm(prev => ({ ...prev, sunLoungerSpecs: next }))}
                  />
                </div>
              )}

              {/* Sofa / lounge seating specs (chantier vocab 2026) */}
              {form.category === "sofas" && (
                <div className="border border-border rounded-md p-4 mb-4 bg-card/30">
                  <SofaSpecsSection
                    value={form.sofaSpecs}
                    onChange={(next) => setForm(prev => ({ ...prev, sofaSpecs: next }))}
                  />
                </div>
              )}

              {/* Bar stool specs (chantier vocab 2026) */}
              {form.category === "bar-stools" && (
                <div className="border border-border rounded-md p-4 mb-4 bg-card/30">
                  <BarStoolSpecsSection
                    value={form.barStoolSpecs}
                    onChange={(next) => setForm(prev => ({ ...prev, barStoolSpecs: next }))}
                  />
                </div>
              )}

              {/* High table specs (chantier vocab 2026 — Tables with subcategory "high") */}
              {form.category === "tables" && form.subcategory.toLowerCase().includes("high") && (
                <div className="border border-border rounded-md p-4 mb-4 bg-card/30">
                  <HighTableSpecsSection
                    value={form.highTableSpecs}
                    onChange={(next) => setForm(prev => ({ ...prev, highTableSpecs: next }))}
                  />
                </div>
              )}

              {/* Dimension variants for tables */}
              {form.category === "tables" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-display font-semibold text-foreground">Variantes de dimensions</p>
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({
                        ...prev,
                        dimension_variants: [...prev.dimension_variants, { dimension_tag: "", label: "", seats: 2, price: 0, available: true }],
                      }))}
                      className="flex items-center gap-1 text-[10px] font-display font-semibold text-[#D4603A] hover:underline"
                    >
                      <Plus className="h-3 w-3" /> Ajouter une taille
                    </button>
                  </div>
                  {form.dimension_variants.length === 0 && (
                    <p className="text-[10px] font-body text-muted-foreground italic">
                      Ajoutez les différentes tailles disponibles (ex : 80×80, 120×70, 160×80). Les prix ci-dessous seront utilisés comme prix par défaut.
                    </p>
                  )}
                  {form.dimension_variants.map((dv, i) => {
                    const updateDv = (patch: Partial<DimensionVariant>) => {
                      const updated = [...form.dimension_variants];
                      updated[i] = { ...dv, ...patch };
                      setForm(prev => ({ ...prev, dimension_variants: updated }));
                    };
                    return (
                    <div key={i} className="grid grid-cols-[1fr_1.2fr_0.5fr_0.7fr_0.7fr_auto] gap-2 items-end">
                      <div>
                        <label className="text-[9px] font-display font-semibold text-muted-foreground uppercase">Tag *</label>
                        <input type="text" placeholder="80x80" value={dv.dimension_tag}
                          onChange={e => updateDv({ dimension_tag: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs font-body border border-border rounded-sm bg-background focus:border-foreground transition-colors outline-none" />
                      </div>
                      <div>
                        <label className="text-[9px] font-display font-semibold text-muted-foreground uppercase">Label</label>
                        <input type="text" placeholder="80×80 cm — 4 couverts" value={dv.label}
                          onChange={e => updateDv({ label: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs font-body border border-border rounded-sm bg-background focus:border-foreground transition-colors outline-none" />
                      </div>
                      <div>
                        <label className="text-[9px] font-display font-semibold text-muted-foreground uppercase">Places</label>
                        <input type="number" min={1} value={dv.seats}
                          onChange={e => updateDv({ seats: Number(e.target.value) || 0 })}
                          className="w-full px-2.5 py-1.5 text-xs font-body border border-border rounded-sm bg-background focus:border-foreground transition-colors outline-none" />
                      </div>
                      <div>
                        <label className="text-[9px] font-display font-semibold text-muted-foreground uppercase">Prix HT €</label>
                        <input type="number" min={0} placeholder="0" value={dv.price || ""}
                          onChange={e => updateDv({ price: Number(e.target.value) || 0 })}
                          className="w-full px-2.5 py-1.5 text-xs font-body border border-border rounded-sm bg-background focus:border-foreground transition-colors outline-none" />
                      </div>
                      <div>
                        <label className="text-[9px] font-display font-semibold text-muted-foreground uppercase">Stock</label>
                        <select value={dv.stock_status || "in_stock"}
                          onChange={e => updateDv({ stock_status: e.target.value, available: e.target.value !== "out_of_stock" })}
                          className="w-full px-1.5 py-1.5 text-[10px] font-body border border-border rounded-sm bg-background focus:border-foreground transition-colors outline-none">
                          <option value="in_stock">En stock</option>
                          <option value="low_stock">Faible</option>
                          <option value="out_of_stock">Rupture</option>
                          <option value="made_to_order">Sur cde</option>
                        </select>
                      </div>
                      <button type="button"
                        onClick={() => setForm(prev => ({ ...prev, dimension_variants: prev.dimension_variants.filter((_, idx) => idx !== i) }))}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>);
                  })}
                  {form.dimension_variants.length > 0 && (
                    <p className="text-[9px] font-body text-muted-foreground">
                      Les prix min/max ci-dessous servent de référence. Chaque taille aura son offre avec son propre prix.
                    </p>
                  )}
                </div>
              )}

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

          {/* ── Variantes (placeholder ÉTAPE 6a, vrai contenu ÉTAPE 6b) ── */}
          {section === "variants" && <VariantsSection />}
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
            {section !== "pricing" && section !== "variants" ? (
              <button
                onClick={() => {
                  // Suivant s'arrête à pricing — la tab "variants" est un
                  // placeholder Phase 1 (ÉTAPE 6a) accessible uniquement par
                  // clic direct sur l'onglet, pas via le flow Suivant.
                  const order = ["photo", "basics", "specs", "pricing"] as const;
                  const idx = order.indexOf(section as "photo" | "basics" | "specs" | "pricing");
                  // Gate: require category before advancing past basics
                  if (section === "basics" && !form.category) {
                    toast.error("Veuillez sélectionner une catégorie avant de continuer");
                    return;
                  }
                  if (idx >= 0 && idx < order.length - 1) setSection(order[idx + 1]);
                }}
                disabled={section === "basics" && !form.category}
                className="flex items-center gap-2 px-5 py-2 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-40 transition-opacity"
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
