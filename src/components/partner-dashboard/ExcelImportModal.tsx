import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  X, Upload, FileSpreadsheet, Check, Loader2, AlertTriangle,
  Download, Trash2, CheckCircle2, XCircle, Info, Sparkles,
  ImagePlus, Link2, Image as ImageIcon, Zap, Bot, ArrowLeft,
} from "lucide-react";
import { PLAN_CONFIG, type PartnerPlan } from "./PartnerSections";

// ── Types ──────────────────────────────────────────────────────────────────────

interface AIProduct {
  id: string;
  name: string;
  category: string;
  subcategory?: string | null;
  short_description?: string | null;
  short_description_fr?: string | null;
  short_description_it?: string | null;
  short_description_es?: string | null;
  long_description?: string | null;
  material_structure?: string | null;
  material_seat?: string | null;
  frame_material_tags?: string[];
  seat_type_tags?: string[];
  fabric_material_tags?: string[];
  top_material_tags?: string[];
  cushion_type_tags?: string[];
  main_color?: string | null;
  secondary_color?: string | null;
  available_colors?: string[];
  palette_tags?: string[];
  style_tags?: string[];
  ambience_tags?: string[];
  silhouette_tags?: string[];
  comfort_tier?: string | null;
  material_tags?: string[];
  use_case_tags?: string[];
  technical_tags?: string[];
  price_min?: number | null;
  price_max?: number | null;
  dimensions_length_cm?: number | null;
  dimensions_width_cm?: number | null;
  dimensions_height_cm?: number | null;
  seat_height_cm?: number | null;
  weight_kg?: number | null;
  height_type?: string | null;
  is_outdoor?: boolean;
  is_stackable?: boolean;
  is_chr_heavy_use?: boolean;
  uv_resistant?: boolean;
  weather_resistant?: boolean;
  fire_retardant?: boolean;
  lightweight?: boolean;
  easy_maintenance?: boolean;
  country_of_manufacture?: string | null;
  warranty?: string | null;
  stock_status?: string | null;
  stock_quantity?: number | null;
  estimated_delivery_days?: number | null;
  collection?: string | null;
  brand_source?: string | null;
  // Category-specific fields (packed into product_type_tags JSONB)
  parasol_type?: string | null;
  parasol_shape?: string | null;
  parasol_size?: string | null;
  parasol_opening?: string | null;
  parasol_fabric_tag?: string | null;
  lounger_type?: string | null;
  bench_type?: string | null;
  sofa_type?: string | null;
  base_type?: string | null;
  // UI state
  image_url?: string | null;
  gallery_urls?: string[];
  valid: boolean;
  errors: string[];
}

// ── CSV Parser ────────────────────────────────────────────────────────────────

function parseCSV(rawText: string): string[][] {
  // Strip UTF-8 BOM if present
  const text = rawText.charCodeAt(0) === 0xFEFF ? rawText.slice(1) : rawText;
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === "," || ch === ";" || ch === "\t") { row.push(current.trim()); current = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(current.trim());
        if (row.some(c => c !== "")) rows.push(row);
        row = []; current = "";
      } else { current += ch; }
    }
  }
  row.push(current.trim());
  if (row.some(c => c !== "")) rows.push(row);
  return rows;
}

// ── Photo matching ───────────────────────────────────────────────────────────

function normalizeForMatch(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchScore(fileName: string, productName: string): number {
  const normFile = normalizeForMatch(fileName.replace(/\.[^.]+$/, ""));
  const normProduct = normalizeForMatch(productName);
  if (!normFile || !normProduct) return 0;

  const fileWords = normFile.split(" ").filter(w => w.length > 1);
  const productWords = normProduct.split(" ").filter(w => w.length > 1);
  if (fileWords.length === 0 || productWords.length === 0) return 0;

  let matched = 0;
  for (const fw of fileWords) {
    if (productWords.some(pw => pw.includes(fw) || fw.includes(pw))) matched++;
  }

  return matched / Math.max(fileWords.length, productWords.length);
}

// ── Batch splitter (for large CSVs, send in chunks to avoid token limits) ────

const MAX_ROWS_PER_BATCH = 25;

// ── Component ────────────────────────────────────────────────────────────────

export default function ExcelImportModal({
  plan,
  onClose,
  onSuccess,
}: {
  plan: PartnerPlan;
  onClose: () => void;
  onSuccess: (count: number) => void;
}) {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const config = PLAN_CONFIG[plan];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const directFileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "analyzing" | "preview" | "photos" | "importing">("upload");
  const [importMode, setImportMode] = useState<"select" | "direct" | "ai">("select");
  const [fileName, setFileName] = useState("");
  const [products, setProducts] = useState<AIProduct[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [analyzeProgress, setAnalyzeProgress] = useState("");
  // Photo matching
  const [unmatchedPhotos, setUnmatchedPhotos] = useState<File[]>([]);
  const [manualAssign, setManualAssign] = useState<string | null>(null);
  // Preview filters
  const [filterCat, setFilterCat] = useState<string | null>(null);

  // ── File handling ──

  const readFileAsText = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "xlsx" || ext === "xls") {
      // For Excel files, read as ArrayBuffer and convert using SheetJS
      const { read, utils } = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      return utils.sheet_to_csv(firstSheet, { FS: ";" });
    }
    return file.text();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "tsv", "txt", "xlsx", "xls"].includes(ext || "")) {
      toast.error(t("import.unsupportedFormat", "Format non supporté. Utilisez un fichier CSV, Excel (.xlsx) ou TSV."));
      return;
    }
    setFileName(file.name);
    try {
      const text = await readFileAsText(file);
      await processCSVWithAI(text);
    } catch (err) {
      toast.error(t("import.readError", "Impossible de lire le fichier. Vérifiez le format."));
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const text = await readFileAsText(file);
      if (importMode === "direct") {
        processCSVDirect(text);
      } else {
        await processCSVWithAI(text);
      }
    } catch (err) {
      toast.error(t("import.readError", "Impossible de lire le fichier. Vérifiez le format."));
    }
  };

  const handleFileSelectDirect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "tsv", "txt", "xlsx", "xls"].includes(ext || "")) {
      toast.error(t("import.unsupportedFormat", "Format non supporté. Utilisez un fichier CSV, Excel (.xlsx) ou TSV."));
      return;
    }
    setFileName(file.name);
    try {
      const text = await readFileAsText(file);
      processCSVDirect(text);
    } catch (err) {
      toast.error(t("import.readError", "Impossible de lire le fichier. Vérifiez le format."));
    }
  };

  // ── Direct CSV import (no AI) ──

  const parseBool = (val: string | undefined): boolean => {
    if (!val) return false;
    const v = val.trim().toLowerCase();
    return ["true", "yes", "oui", "1"].includes(v);
  };

  const parseArrayField = (val: string | undefined): string[] => {
    if (!val) return [];
    return val.split(/[|,]/).map(s => s.trim()).filter(Boolean);
  };

  const parseNum = (val: string | undefined): number | null => {
    if (!val) return null;
    const n = parseFloat(val.replace(",", "."));
    return isNaN(n) ? null : n;
  };

  const processCSVDirect = (text: string) => {
    const rows = parseCSV(text);
    if (rows.length < 2) {
      toast.error(t("ei.errors.empty", "Le fichier semble vide ou ne contient qu'un en-tête."));
      return;
    }

    const rawHeaders = rows[0];
    const headerMap: Record<string, number> = {};
    rawHeaders.forEach((h, i) => {
      headerMap[h.trim().toLowerCase()] = i;
    });

    // Case-insensitive column lookup with common alias support
    const colAliases: Record<string, string[]> = {
      name: ["name", "nom", "product_name", "nom_produit"],
      category: ["category", "catégorie", "categorie", "cat"],
      subcategory: ["subcategory", "sous_catégorie", "sous_categorie", "sub_category", "sous-catégorie"],
      collection: ["collection"],
      brand_source: ["brand_source", "brand", "marque"],
      short_description: ["short_description", "description", "desc", "description_courte"],
      short_description_fr: ["short_description_fr", "description_fr"],
      short_description_it: ["short_description_it", "description_it"],
      short_description_es: ["short_description_es", "description_es"],
      long_description: ["long_description", "description_longue", "long_desc"],
      material_structure: ["material_structure", "matériau_structure", "materiau_structure", "frame_material"],
      material_seat: ["material_seat", "matériau_assise", "materiau_assise", "seat_material"],
      frame_material_tags: ["frame_material_tags", "frame_tags"],
      seat_type_tags: ["seat_type_tags", "seat_tags"],
      fabric_material_tags: ["fabric_material_tags", "fabric_tags"],
      top_material_tags: ["top_material_tags", "top_tags"],
      cushion_type_tags: ["cushion_type_tags", "cushion_tags"],
      main_color: ["main_color", "couleur_principale", "couleur", "color"],
      secondary_color: ["secondary_color", "couleur_secondaire"],
      available_colors: ["available_colors", "couleurs_disponibles", "colors"],
      palette_tags: ["palette_tags", "palette"],
      style_tags: ["style_tags", "style", "styles"],
      ambience_tags: ["ambience_tags", "ambiance", "ambience"],
      silhouette_tags: ["silhouette_tags", "silhouette"],
      comfort_tier: ["comfort_tier", "comfort"],
      use_case_tags: ["use_case_tags", "use_case", "usage"],
      price_min: ["price_min", "prix_min", "prix_ht", "prix", "price"],
      price_max: ["price_max", "prix_max"],
      dimensions_length_cm: ["dimensions_length_cm", "longueur_cm", "longueur", "length_cm", "length"],
      dimensions_width_cm: ["dimensions_width_cm", "largeur_cm", "largeur", "width_cm", "width"],
      dimensions_height_cm: ["dimensions_height_cm", "hauteur_cm", "hauteur", "height_cm", "height"],
      seat_height_cm: ["seat_height_cm", "hauteur_assise_cm", "hauteur_assise", "seat_height"],
      weight_kg: ["weight_kg", "poids_kg", "poids", "weight"],
      height_type: ["height_type", "type_hauteur"],
      is_outdoor: ["is_outdoor", "extérieur", "exterieur", "outdoor"],
      is_stackable: ["is_stackable", "empilable", "stackable"],
      is_chr_heavy_use: ["is_chr_heavy_use", "chr", "heavy_use", "usage_intensif"],
      uv_resistant: ["uv_resistant", "résistant_uv", "resistant_uv", "uv"],
      weather_resistant: ["weather_resistant", "résistant_intempéries", "resistant_intemperies", "weather"],
      fire_retardant: ["fire_retardant", "ignifuge", "fire"],
      lightweight: ["lightweight", "léger", "leger", "light"],
      easy_maintenance: ["easy_maintenance", "entretien_facile", "maintenance"],
      technical_tags: ["technical_tags", "technical", "technique"],
      stock_status: ["stock_status", "stock", "disponibilité", "disponibilite"],
      stock_quantity: ["stock_quantity", "quantité", "quantite", "quantity", "qty"],
      estimated_delivery_days: ["estimated_delivery_days", "delivery_days", "délai_livraison", "delai_livraison", "delivery"],
      country_of_manufacture: ["country_of_manufacture", "pays_fabrication", "pays", "country", "origine"],
      warranty: ["warranty", "garantie"],
      image_url: ["image_url", "image", "photo", "photo_url"],
      gallery_urls: ["gallery_urls", "gallery", "photos", "galerie"],
      parasol_type: ["parasol_type", "type_parasol"],
      parasol_shape: ["parasol_shape", "forme_parasol"],
      parasol_size: ["parasol_size", "taille_parasol"],
      parasol_opening: ["parasol_opening", "ouverture_parasol"],
      parasol_fabric_tag: ["parasol_fabric_tag", "tissu_parasol"],
      lounger_type: ["lounger_type", "type_bain_de_soleil", "type_transat"],
      bench_type: ["bench_type", "type_banc"],
      sofa_type: ["sofa_type", "type_canapé", "type_canape"],
      base_type: ["base_type", "type_base", "type_pied"],
    };

    const col = (row: string[], key: string): string | undefined => {
      // Try direct match first
      const directIdx = headerMap[key];
      if (directIdx !== undefined) {
        const val = row[directIdx]?.trim();
        return val || undefined;
      }
      // Try aliases
      const aliases = colAliases[key];
      if (aliases) {
        for (const alias of aliases) {
          const idx = headerMap[alias];
          if (idx !== undefined) {
            const val = row[idx]?.trim();
            return val || undefined;
          }
        }
      }
      return undefined;
    };

    const dataRows = rows.slice(1).filter(r => r.some(c => c !== ""));
    if (dataRows.length === 0) {
      toast.error(t("ei.errors.none", "Aucun produit trouvé dans le fichier."));
      return;
    }

    const mapped: AIProduct[] = dataRows.map((row) => {
      const name = col(row, "name") || "";
      const category = col(row, "category") || "";
      const errors: string[] = [];
      if (!name) errors.push(t("ei.errors.missingName", "Nom manquant"));
      if (!category) errors.push(t("ei.errors.invalidCat", "Catégorie invalide ou manquante"));

      return {
        id: crypto.randomUUID(),
        name,
        category,
        subcategory: col(row, "subcategory") || null,
        collection: col(row, "collection") || null,
        brand_source: col(row, "brand_source") || null,
        short_description: col(row, "short_description") || null,
        short_description_fr: col(row, "short_description_fr") || null,
        short_description_it: col(row, "short_description_it") || null,
        short_description_es: col(row, "short_description_es") || null,
        long_description: col(row, "long_description") || null,
        material_structure: col(row, "material_structure") || null,
        material_seat: col(row, "material_seat") || null,
        frame_material_tags: parseArrayField(col(row, "frame_material_tags")),
        seat_type_tags: parseArrayField(col(row, "seat_type_tags")),
        fabric_material_tags: parseArrayField(col(row, "fabric_material_tags")),
        top_material_tags: parseArrayField(col(row, "top_material_tags")),
        cushion_type_tags: parseArrayField(col(row, "cushion_type_tags")),
        main_color: col(row, "main_color") || null,
        secondary_color: col(row, "secondary_color") || null,
        available_colors: parseArrayField(col(row, "available_colors")),
        palette_tags: parseArrayField(col(row, "palette_tags")),
        style_tags: parseArrayField(col(row, "style_tags")),
        ambience_tags: parseArrayField(col(row, "ambience_tags")),
        silhouette_tags: parseArrayField(col(row, "silhouette_tags")),
        comfort_tier: col(row, "comfort_tier") || null,
        material_tags: [],
        use_case_tags: parseArrayField(col(row, "use_case_tags")),
        technical_tags: parseArrayField(col(row, "technical_tags")),
        price_min: parseNum(col(row, "price_min")),
        price_max: parseNum(col(row, "price_max")),
        dimensions_length_cm: parseNum(col(row, "dimensions_length_cm")),
        dimensions_width_cm: parseNum(col(row, "dimensions_width_cm")),
        dimensions_height_cm: parseNum(col(row, "dimensions_height_cm")),
        seat_height_cm: parseNum(col(row, "seat_height_cm")),
        weight_kg: parseNum(col(row, "weight_kg")),
        height_type: col(row, "height_type") || null,
        is_outdoor: col(row, "is_outdoor") !== undefined ? parseBool(col(row, "is_outdoor")) : true,
        is_stackable: parseBool(col(row, "is_stackable")),
        is_chr_heavy_use: parseBool(col(row, "is_chr_heavy_use")),
        uv_resistant: parseBool(col(row, "uv_resistant")),
        weather_resistant: parseBool(col(row, "weather_resistant")),
        fire_retardant: parseBool(col(row, "fire_retardant")),
        lightweight: parseBool(col(row, "lightweight")),
        easy_maintenance: parseBool(col(row, "easy_maintenance")),
        country_of_manufacture: col(row, "country_of_manufacture") || null,
        warranty: col(row, "warranty") || null,
        stock_status: col(row, "stock_status") || null,
        stock_quantity: parseNum(col(row, "stock_quantity")),
        estimated_delivery_days: parseNum(col(row, "estimated_delivery_days")),
        image_url: col(row, "image_url") || null,
        gallery_urls: parseArrayField(col(row, "gallery_urls")),
        // Category-specific fields
        parasol_type: col(row, "parasol_type") || null,
        parasol_shape: col(row, "parasol_shape") || null,
        parasol_size: col(row, "parasol_size") || null,
        parasol_opening: col(row, "parasol_opening") || null,
        parasol_fabric_tag: col(row, "parasol_fabric_tag") || null,
        lounger_type: col(row, "lounger_type") || null,
        bench_type: col(row, "bench_type") || null,
        sofa_type: col(row, "sofa_type") || null,
        base_type: col(row, "base_type") || null,
        valid: !!name && !!category,
        errors,
      };
    });

    if (mapped.length === 0) {
      toast.error(t("ei.errors.none", "Aucun produit trouvé dans le fichier."));
      return;
    }

    setProducts(mapped);
    setColumnMapping({});
    setStep("preview");

    const validC = mapped.filter(p => p.valid).length;
    const invalidC = mapped.length - validC;
    if (invalidC > 0) {
      toast.warning(`${validC} produit${validC > 1 ? "s" : ""} importé${validC > 1 ? "s" : ""}, ${invalidC} avec des erreurs.`);
    } else {
      toast.success(`${validC} produit${validC > 1 ? "s" : ""} prêt${validC > 1 ? "s" : ""} à importer.`);
    }
  };

  const downloadDirectTemplate = () => {
    const headers = [
      "name","category","subcategory","collection","brand_source",
      "short_description","short_description_fr","short_description_it","short_description_es",
      "long_description","material_structure","material_seat",
      "frame_material_tags","seat_type_tags","fabric_material_tags","top_material_tags","cushion_type_tags",
      "main_color","secondary_color","available_colors","palette_tags",
      "style_tags","ambience_tags","silhouette_tags","comfort_tier","use_case_tags",
      "price_min","price_max",
      "dimensions_length_cm","dimensions_width_cm","dimensions_height_cm","seat_height_cm","weight_kg",
      "height_type","is_outdoor","is_stackable","is_chr_heavy_use",
      "uv_resistant","weather_resistant","fire_retardant","lightweight","easy_maintenance",
      "technical_tags","stock_status","stock_quantity","estimated_delivery_days",
      "country_of_manufacture","warranty",
      "image_url","gallery_urls",
      "parasol_type","parasol_shape","parasol_size","parasol_opening","parasol_fabric_tag",
      "lounger_type","bench_type","sofa_type","base_type",
    ];
    const example = [
      "Chaise Riviera","Chairs","Dining Chair","Riviera","",
      "Stackable alu & textilene chair","Chaise empilable alu et textilène","Sedia impilabile in alluminio","Silla apilable de aluminio",
      "","Aluminium","Textilene",
      "alu-powder","mesh","","","",
      "anthracite","","anthracite|white|taupe","",
      "modern|mediterranean","relaxed|bright","4-leg","functional","garden-restaurant|boutique-hotel",
      "89","129",
      "56","58","84","45","3.8",
      "dining","TRUE","TRUE","TRUE",
      "TRUE","TRUE","FALSE","TRUE","TRUE",
      "stackable|weather-resistant|uv-resistant","available","","",
      "Italy","2 ans",
      "","",
      "","","","","",
      "","","","",
    ];
    const csv = [headers.join(";"), example.join(";")].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "terrassea-product-template.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("ei.success.template", "Template téléchargé !"));
  };

  const processCSVWithAI = async (text: string) => {
    const rows = parseCSV(text);
    if (rows.length < 2) {
      toast.error("Le fichier semble vide ou ne contient qu'un en-tête.");
      return;
    }

    const headers = rows[0];
    const dataRows = rows.slice(1).filter(r => r.some(c => c !== ""));

    if (dataRows.length === 0) {
      toast.error("Aucune donnée trouvée dans le fichier.");
      return;
    }

    setStep("analyzing");
    setAnalyzeProgress(`Analyse de ${dataRows.length} produit${dataRows.length > 1 ? "s" : ""} par l'IA...`);

    try {
      const allProducts: AIProduct[] = [];
      let mapping: Record<string, string> = {};

      // Process in batches
      for (let i = 0; i < dataRows.length; i += MAX_ROWS_PER_BATCH) {
        const batch = dataRows.slice(i, i + MAX_ROWS_PER_BATCH);
        const batchNum = Math.floor(i / MAX_ROWS_PER_BATCH) + 1;
        const totalBatches = Math.ceil(dataRows.length / MAX_ROWS_PER_BATCH);

        if (totalBatches > 1) {
          setAnalyzeProgress(`Analyse lot ${batchNum}/${totalBatches} (${batch.length} produits)...`);
        }

        let data: any;
        try {
          const result = await supabase.functions.invoke("analyze-csv-products", {
            body: { headers, rows: batch },
          });
          if (result.error) throw result.error;
          if (!result.data?.products) throw new Error("Pas de produits retournés");
          data = result.data;
        } catch {
          toast.warning(`Lot ${batchNum}/${totalBatches} échoué — ${batch.length} produits ignorés.`);
          continue; // Skip this batch, continue with the rest
        }

        // Keep the mapping from the first successful batch
        if (data.column_mapping && Object.keys(mapping).length === 0) {
          mapping = data.column_mapping;
        }

        const batchProducts: AIProduct[] = (data.products as any[]).map((p: any) => ({
          id: crypto.randomUUID(),
          name: p.name || "",
          category: p.category || "",
          subcategory: p.subcategory || null,
          short_description: p.short_description || null,
          long_description: p.long_description || null,
          material_structure: p.material_structure || null,
          material_seat: p.material_seat || null,
          main_color: p.main_color || null,
          secondary_color: p.secondary_color || null,
          available_colors: p.available_colors || [],
          style_tags: p.style_tags || [],
          ambience_tags: p.ambience_tags || [],
          material_tags: p.material_tags || [],
          use_case_tags: p.use_case_tags || [],
          technical_tags: p.technical_tags || [],
          price_min: p.price_min ?? null,
          price_max: p.price_max ?? null,
          dimensions_length_cm: p.dimensions_length_cm ?? null,
          dimensions_width_cm: p.dimensions_width_cm ?? null,
          dimensions_height_cm: p.dimensions_height_cm ?? null,
          seat_height_cm: p.seat_height_cm ?? null,
          weight_kg: p.weight_kg ?? null,
          is_outdoor: p.is_outdoor ?? true,
          is_stackable: p.is_stackable ?? false,
          is_chr_heavy_use: p.is_chr_heavy_use ?? false,
          uv_resistant: p.uv_resistant ?? false,
          weather_resistant: p.weather_resistant ?? false,
          fire_retardant: p.fire_retardant ?? false,
          lightweight: p.lightweight ?? false,
          easy_maintenance: p.easy_maintenance ?? false,
          country_of_manufacture: p.country_of_manufacture || null,
          warranty: p.warranty || null,
          stock_status: p.stock_status || null,
          stock_quantity: p.stock_quantity ?? null,
          collection: p.collection || null,
          brand_source: p.brand_source || null,
          image_url: null,
          gallery_urls: [],
          valid: !!p.name && !!p.category,
          errors: [
            ...(!p.name ? ["Nom non détecté"] : []),
            ...(!p.category ? ["Catégorie non détectée"] : []),
          ],
        }));

        allProducts.push(...batchProducts);
      }

      if (allProducts.length === 0) {
        toast.error("L'IA n'a pu analyser aucun produit. Vérifiez le format du fichier.");
        setStep("upload");
        return;
      }

      setColumnMapping(mapping);
      setProducts(allProducts);
      setStep("preview");

      const validCount = allProducts.filter(p => p.valid).length;
      const invalidCount = allProducts.length - validCount;
      if (invalidCount > 0) {
        toast.warning(`${validCount} produit${validCount > 1 ? "s" : ""} enrichi${validCount > 1 ? "s" : ""}, ${invalidCount} avec des erreurs.`);
      } else {
        toast.success(`${validCount} produit${validCount > 1 ? "s" : ""} analysé${validCount > 1 ? "s" : ""} et enrichi${validCount > 1 ? "s" : ""} par l'IA.`);
      }
    } catch (err: any) {
      console.error("AI analysis error:", err);
      toast.error(err.message || "Erreur lors de l'analyse IA");
      setStep("upload");
    }
  };

  // ── Photo handling ──

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const updatedProducts = [...products];
    const unmatched: File[] = [];

    for (const file of files) {
      let bestMatch = -1;
      let bestScore = 0;

      for (let i = 0; i < updatedProducts.length; i++) {
        const score = matchScore(file.name, updatedProducts[i].name);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = i;
        }
      }

      if (bestScore >= 0.4 && bestMatch >= 0) {
        const url = URL.createObjectURL(file);
        if (!updatedProducts[bestMatch].image_url) {
          updatedProducts[bestMatch].image_url = url;
        } else {
          updatedProducts[bestMatch].gallery_urls = [
            ...(updatedProducts[bestMatch].gallery_urls || []),
            url,
          ];
        }
      } else {
        unmatched.push(file);
      }
    }

    setProducts(updatedProducts);
    setUnmatchedPhotos(prev => [...prev, ...unmatched]);

    const matchedCount = files.length - unmatched.length;
    if (matchedCount > 0) {
      toast.success(`${matchedCount} photo${matchedCount > 1 ? "s" : ""} associée${matchedCount > 1 ? "s" : ""} automatiquement.`);
    }
    if (unmatched.length > 0) {
      toast.info(`${unmatched.length} photo${unmatched.length > 1 ? "s" : ""} non matchée${unmatched.length > 1 ? "s" : ""} — association manuelle possible.`);
    }
  };

  const assignPhotoManually = (photoIndex: number, productId: string) => {
    const file = unmatchedPhotos[photoIndex];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setProducts(prev => prev.map(p => {
      if (p.id !== productId) return p;
      if (!p.image_url) return { ...p, image_url: url };
      return { ...p, gallery_urls: [...(p.gallery_urls || []), url] };
    }));
    setUnmatchedPhotos(prev => prev.filter((_, i) => i !== photoIndex));
    setManualAssign(null);
  };

  // ── Import ──

  const removeProduct = (id: string) => setProducts(prev => prev.filter(p => p.id !== id));

  /** Upload a blob URL to Supabase Storage, returns the public URL or null. */
  const uploadBlobToStorage = async (blobUrl: string, productName: string, index: number): Promise<string | null> => {
    if (!blobUrl || !blobUrl.startsWith("blob:")) return null;
    try {
      const res = await fetch(blobUrl);
      const blob = await res.blob();
      const ext = blob.type.split("/")[1] || "jpg";
      const slug = productName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 50);
      const path = `product-imports/${Date.now()}-${slug}-${index}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, blob, { contentType: blob.type, upsert: false });
      if (error) { return null; }
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
      return urlData?.publicUrl || null;
    } catch {
      return null;
    }
  };

  const handleImport = async () => {
    const validProducts = products.filter(p => p.valid);
    if (validProducts.length === 0) {
      toast.error("Aucun produit valide à importer.");
      return;
    }

    // Resolve partner_id
    let partnerId: string | null = null;
    if (user) {
      const { data } = await supabase.from("partners").select("id").eq("user_id", user.id).maybeSingle();
      partnerId = data?.id || null;
    }
    if (!partnerId) {
      toast.warning("Aucun profil partenaire trouvé.");
      return;
    }

    setImporting(true);
    setStep("importing");
    let submitted = 0;
    const failedNames: string[] = [];

    // Fetch existing products for this partner to detect duplicates by name
    const existingMap = new Map<string, string>();
    const { data: existing } = await supabase
      .from("products")
      .select("id, name")
      .eq("partner_id", partnerId);
    for (const e of existing || []) {
      if (e.name) existingMap.set(e.name.toLowerCase().trim(), e.id);
    }

    for (let idx = 0; idx < validProducts.length; idx++) {
      const p = validProducts[idx];
      try {
        // Upload photos from blob URLs to Supabase Storage
        let imageUrl: string | null = null;
        const galleryUrls: string[] = [];

        if (p.image_url?.startsWith("blob:")) {
          imageUrl = await uploadBlobToStorage(p.image_url, p.name, 0);
        }
        for (let gi = 0; gi < (p.gallery_urls || []).length; gi++) {
          const gUrl = p.gallery_urls![gi];
          if (gUrl.startsWith("blob:")) {
            const uploaded = await uploadBlobToStorage(gUrl, p.name, gi + 1);
            if (uploaded) galleryUrls.push(uploaded);
          }
        }

        // Build product_type_tags JSONB from category-specific fields
        const productTypeTags: Record<string, unknown> = {};
        if (p.parasol_type) productTypeTags.parasol_type = p.parasol_type;
        if (p.parasol_shape) productTypeTags.parasol_shape = p.parasol_shape;
        if (p.parasol_size) productTypeTags.parasol_size = p.parasol_size;
        if (p.parasol_opening) productTypeTags.parasol_opening = p.parasol_opening;
        if (p.parasol_fabric_tag) productTypeTags.parasol_fabric_tag = p.parasol_fabric_tag;
        if (p.lounger_type) productTypeTags.lounger_type = p.lounger_type;
        if (p.bench_type) productTypeTags.bench_type = p.bench_type;
        if (p.sofa_type) productTypeTags.sofa_type = p.sofa_type;
        if (p.base_type) productTypeTags.base_type = p.base_type;
        if (p.comfort_tier) productTypeTags.comfort_tier = p.comfort_tier;
        if (p.height_type) productTypeTags.height_type = p.height_type;
        if (p.silhouette_tags && p.silhouette_tags.length > 0) productTypeTags.silhouette = p.silhouette_tags;
        if (p.frame_material_tags && p.frame_material_tags.length > 0) productTypeTags.frame_material = p.frame_material_tags;
        if (p.seat_type_tags && p.seat_type_tags.length > 0) productTypeTags.seat_type = p.seat_type_tags;
        if (p.fabric_material_tags && p.fabric_material_tags.length > 0) productTypeTags.fabric_material = p.fabric_material_tags;
        if (p.top_material_tags && p.top_material_tags.length > 0) productTypeTags.top_material = p.top_material_tags;
        if (p.cushion_type_tags && p.cushion_type_tags.length > 0) productTypeTags.cushion_type = p.cushion_type_tags;

        // Resolve final image_url: prefer uploaded blob, fall back to CSV-provided URL
        const finalImageUrl = imageUrl || (p.image_url && !p.image_url.startsWith("blob:") ? p.image_url : null);
        // Merge gallery: uploaded blobs + CSV-provided non-blob URLs
        const csvGallery = (p.gallery_urls || []).filter(u => !u.startsWith("blob:"));
        const finalGallery = [...galleryUrls, ...csvGallery];

        const productData: Record<string, any> = {
          name: p.name,
          category: p.category,
          subcategory: p.subcategory || null,
          collection: p.collection || null,
          brand_source: p.brand_source || null,
          short_description: p.short_description || null,
          short_description_fr: p.short_description_fr || null,
          short_description_it: p.short_description_it || null,
          short_description_es: p.short_description_es || null,
          long_description: p.long_description || null,
          material_structure: p.material_structure || null,
          material_seat: p.material_seat || null,
          main_color: p.main_color || null,
          secondary_color: p.secondary_color || null,
          available_colors: p.available_colors || [],
          palette_tags: p.palette_tags && p.palette_tags.length > 0 ? p.palette_tags : [],
          style_tags: p.style_tags || [],
          ambience_tags: p.ambience_tags || [],
          material_tags: p.material_tags || [],
          use_case_tags: p.use_case_tags || [],
          technical_tags: p.technical_tags || [],
          price_min: p.price_min,
          price_max: p.price_max,
          dimensions_length_cm: p.dimensions_length_cm,
          dimensions_width_cm: p.dimensions_width_cm,
          dimensions_height_cm: p.dimensions_height_cm,
          seat_height_cm: p.seat_height_cm,
          weight_kg: p.weight_kg,
          is_outdoor: p.is_outdoor ?? true,
          is_stackable: p.is_stackable ?? false,
          is_chr_heavy_use: p.is_chr_heavy_use ?? false,
          uv_resistant: p.uv_resistant ?? false,
          weather_resistant: p.weather_resistant ?? false,
          fire_retardant: p.fire_retardant ?? false,
          lightweight: p.lightweight ?? false,
          easy_maintenance: p.easy_maintenance ?? false,
          country_of_manufacture: p.country_of_manufacture || null,
          warranty: p.warranty || null,
          stock_status: p.stock_status || null,
          stock_quantity: p.stock_quantity,
          estimated_delivery_days: p.estimated_delivery_days,
          image_url: finalImageUrl,
          gallery_urls: finalGallery.length > 0 ? finalGallery : [],
          product_type_tags: Object.keys(productTypeTags).length > 0 ? productTypeTags : null,
        };

        // Check if product with same name already exists for this partner → edit submission
        const existingId = existingMap.get(p.name.toLowerCase().trim());

        const submissionPayload = {
          partner_id: partnerId,
          product_data: productData,
          status: "draft",
          submission_type: existingId ? "edit" : "new",
          target_product_id: existingId || null,
          similarity_score: null,
          detected_duplicate_id: null,
          merged_description: null,
          admin_notes: null,
        };

        const { error } = await supabase
          .from("product_submissions")
          .insert(submissionPayload as any);

        if (error) {
          failedNames.push(p.name);
        } else {
          submitted++;
        }
      } catch {
        failedNames.push(p.name);
      }
      setImportProgress(Math.round(((idx + 1) / validProducts.length) * 100));
    }

    // Revoke blob URLs to free memory
    for (const p of products) {
      if (p.image_url?.startsWith("blob:")) URL.revokeObjectURL(p.image_url);
      for (const g of p.gallery_urls || []) {
        if (g.startsWith("blob:")) URL.revokeObjectURL(g);
      }
    }

    // No admin notification — drafts stay private until partner submits for review

    setImporting(false);
    if (submitted > 0) {
      const parts: string[] = [`${submitted} produit${submitted > 1 ? "s" : ""} importé${submitted > 1 ? "s" : ""} en brouillon`];
      if (failedNames.length > 0) parts.push(`${failedNames.length} échoué${failedNames.length > 1 ? "s" : ""}`);
      if (failedNames.length > 0) {
        toast.warning(parts.join(", "));
      } else {
        toast.success(parts.join(", "));
      }
      onSuccess(submitted);
    } else {
      toast.error("Aucun produit n'a pu être soumis.");
    }
  };

  // ── Template download ──

  const downloadTemplate = () => {
    const headers = [
      "Nom du produit", "Catégorie", "Sous-catégorie", "Description",
      "Matériau structure", "Matériau assise", "Couleur principale",
      "Prix HT", "Prix max", "Longueur cm", "Largeur cm", "Hauteur cm",
      "Poids kg", "Stock", "Quantité", "Pays de fabrication",
      "Garantie", "Extérieur", "Empilable",
    ];
    const example = [
      "Chaise Riviera", "Chairs", "dining-chair", "Chaise empilable en aluminium",
      "aluminium", "textilène", "white",
      "140", "160", "56", "58", "84",
      "3.8", "available", "200", "Italie",
      "3 ans", "oui", "oui",
    ];
    const csv = [headers.join(";"), example.join(";")].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "terrassea_import_template.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Template téléchargé !");
  };

  const validCount = products.filter(p => p.valid).length;
  const invalidCount = products.length - validCount;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8">
      <div className="bg-background border border-border rounded-sm shadow-xl w-full max-w-4xl mx-4 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-display font-bold text-base text-foreground flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              {importMode === "direct" ? t("ei.mode.directTitle", "Import direct CSV") :
               importMode === "ai" ? (
                <>
                  Import intelligent CSV
                  <span className="text-[9px] font-body text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">IA</span>
                </>
               ) : t("ei.mode.chooseTitle", "Import CSV / Excel")}
            </h2>
            <p className="text-[10px] font-body text-muted-foreground mt-0.5">
              {importMode === "direct" ? t("ei.mode.directSubtitle", "Gratuit et instantané — utilisez notre template standardisé") :
               importMode === "ai" ? t("ei.subtitle", "L'IA analyse votre fichier et enrichit automatiquement chaque produit") :
               t("ei.mode.chooseSubtitle", "Choisissez votre mode d'import")}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* ── Step: Upload — Mode Select ── */}
          {step === "upload" && importMode === "select" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Direct import card */}
                <button
                  onClick={() => setImportMode("direct")}
                  className="group relative text-left border-2 border-border rounded-sm p-5 hover:border-foreground/40 transition-all"
                >
                  <span className="absolute top-3 right-3 text-[8px] font-display font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {t("ei.mode.recommended", "Recommandé")}
                  </span>
                  <Zap className="h-6 w-6 text-amber-500 mb-3" />
                  <p className="text-sm font-display font-bold text-foreground mb-1">
                    {t("ei.mode.directLabel", "Import direct")}
                  </p>
                  <p className="text-[10px] font-body text-muted-foreground leading-relaxed">
                    {t("ei.mode.directDesc", "Utilisez notre template CSV. Gratuit et instantané.")}
                  </p>
                  <span className="inline-flex items-center gap-1 mt-3 text-[9px] font-display font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <Zap className="h-2.5 w-2.5" /> {t("ei.mode.free", "Gratuit")}
                  </span>
                </button>

                {/* AI import card */}
                <button
                  onClick={() => setImportMode("ai")}
                  className="group text-left border-2 border-border rounded-sm p-5 hover:border-foreground/40 transition-all"
                >
                  <Bot className="h-6 w-6 text-emerald-500 mb-3" />
                  <p className="text-sm font-display font-bold text-foreground mb-1">
                    {t("ei.mode.aiLabel", "Import IA")}
                  </p>
                  <p className="text-[10px] font-body text-muted-foreground leading-relaxed">
                    {t("ei.mode.aiDesc", "Format libre, l'IA analyse et enrichit vos données. Plus lent.")}
                  </p>
                  <span className="inline-flex items-center gap-1 mt-3 text-[9px] font-display font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <Sparkles className="h-2.5 w-2.5" /> IA
                  </span>
                </button>
              </div>

              <div
                className="flex items-center gap-3 px-4 py-2.5 rounded-sm border text-[10px] font-body"
                style={{ background: config.bg, borderColor: config.border, color: config.color }}
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>
                  <strong>Commission {config.label} : {config.commission}%</strong> — Indiquez vos prix HT, la commission sera ajoutée automatiquement.
                </span>
              </div>
            </div>
          )}

          {/* ── Step: Upload — Direct mode ── */}
          {step === "upload" && importMode === "direct" && (
            <div className="space-y-5">
              <button onClick={() => setImportMode("select")}
                className="flex items-center gap-1.5 text-[10px] font-display font-semibold text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-3 w-3" /> {t("ei.mode.changeMode", "Changer de mode")}
              </button>

              <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-sm">
                <Zap className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[10px] font-body text-amber-800 leading-relaxed">
                    <strong>{t("ei.mode.directLabel", "Import direct")} :</strong>{" "}
                    {t("ei.mode.directHint", "Téléchargez notre template, remplissez-le avec vos produits, puis importez-le ici. Colonnes standardisées, aucun traitement IA.")}
                  </p>
                  <button onClick={downloadDirectTemplate}
                    className="flex items-center gap-1.5 mt-2 text-[10px] font-display font-semibold text-amber-700 hover:underline">
                    <Download className="h-3 w-3" /> {t("ei.mode.downloadTemplate", "Télécharger le template")}
                  </button>
                </div>
              </div>

              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => directFileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-sm p-10 text-center cursor-pointer hover:border-foreground/30 transition-colors"
              >
                <input ref={directFileInputRef} type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" onChange={handleFileSelectDirect} className="hidden" />
                <Upload className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-display font-semibold text-foreground mb-1">
                  {t("ei.upload.dragDrop", "Glissez votre fichier ou cliquez pour sélectionner")}
                </p>
                <p className="text-[10px] font-body text-muted-foreground">
                  {t("ei.mode.directFormats", "CSV ou Excel · Colonnes standardisées du template")}
                </p>
              </div>

              <div
                className="flex items-center gap-3 px-4 py-2.5 rounded-sm border text-[10px] font-body"
                style={{ background: config.bg, borderColor: config.border, color: config.color }}
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>
                  <strong>Commission {config.label} : {config.commission}%</strong> — Indiquez vos prix HT, la commission sera ajoutée automatiquement.
                </span>
              </div>
            </div>
          )}

          {/* ── Step: Upload — AI mode ── */}
          {step === "upload" && importMode === "ai" && (
            <div className="space-y-5">
              <button onClick={() => setImportMode("select")}
                className="flex items-center gap-1.5 text-[10px] font-display font-semibold text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-3 w-3" /> {t("ei.mode.changeMode", "Changer de mode")}
              </button>

              <div className="flex items-start gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-sm">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[10px] font-body text-emerald-800 leading-relaxed">
                    <strong>Import intelligent :</strong> Votre fichier peut avoir n'importe quel format de colonnes.
                    L'IA détecte automatiquement chaque champ, enrichit les données (tags, catégories, descriptions)
                    et normalise les couleurs et matériaux.
                  </p>
                  <button onClick={downloadTemplate}
                    className="flex items-center gap-1.5 mt-2 text-[10px] font-display font-semibold text-emerald-700 hover:underline">
                    <Download className="h-3 w-3" /> Télécharger le template (optionnel)
                  </button>
                </div>
              </div>

              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-sm p-10 text-center cursor-pointer hover:border-foreground/30 transition-colors"
              >
                <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" onChange={handleFileSelect} className="hidden" />
                <Upload className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-display font-semibold text-foreground mb-1">
                  Glissez votre fichier ou cliquez pour sélectionner
                </p>
                <p className="text-[10px] font-body text-muted-foreground">
                  CSV ou TSV · N'importe quel format de colonnes · L'IA s'adapte
                </p>
              </div>

              <div
                className="flex items-center gap-3 px-4 py-2.5 rounded-sm border text-[10px] font-body"
                style={{ background: config.bg, borderColor: config.border, color: config.color }}
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>
                  <strong>Commission {config.label} : {config.commission}%</strong> — Indiquez vos prix HT, la commission sera ajoutée automatiquement.
                </span>
              </div>
            </div>
          )}

          {/* ── Step: Analyzing ── */}
          {step === "analyzing" && (
            <div className="py-16 text-center space-y-4">
              <div className="relative w-12 h-12 mx-auto">
                <Sparkles className="h-12 w-12 text-emerald-500 animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-display font-semibold text-foreground">Analyse IA en cours</p>
                <p className="text-[10px] font-body text-muted-foreground mt-1">{analyzeProgress}</p>
              </div>
              <p className="text-[9px] font-body text-muted-foreground max-w-xs mx-auto">
                L'IA détecte les colonnes, normalise les données, génère les tags et enrichit chaque produit
              </p>
            </div>
          )}

          {/* ── Step: Preview ── */}
          {step === "preview" && (() => {
            const noImageCount = products.filter(p => !p.image_url).length;
            const noPriceCount = products.filter(p => p.price_min == null).length;
            const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
            const filteredProducts = filterCat ? products.filter(p => p.category === filterCat) : products;
            const allTags = (p: AIProduct) => [
              ...(p.style_tags || []),
              ...(p.material_tags || []),
              ...(p.use_case_tags || []),
              ...(p.ambience_tags || []),
            ];

            return (
            <div className="space-y-4">
              {/* Column mapping summary */}
              {Object.keys(columnMapping).length > 0 && (
                <div className="border border-emerald-200 bg-emerald-50/50 rounded-sm p-3">
                  <p className="text-[9px] font-display font-semibold text-emerald-700 uppercase tracking-wider mb-2">
                    Mapping détecté par l'IA
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(columnMapping).filter(([, v]) => v).map(([csvCol, dbField]) => (
                      <span key={csvCol} className="text-[9px] font-body bg-white border border-emerald-200 rounded px-2 py-0.5">
                        <span className="text-muted-foreground">{csvCol}</span>
                        <span className="text-emerald-600 mx-1">→</span>
                        <span className="text-foreground font-semibold">{dbField}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats bar */}
              <div className="flex flex-wrap gap-2">
                <span className="text-[10px] font-display font-semibold px-3 py-1.5 rounded-full bg-foreground/5 text-foreground">
                  {products.length} produit{products.length > 1 ? "s" : ""}
                </span>
                {validCount > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-display font-semibold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" /> {validCount} valide{validCount > 1 ? "s" : ""}
                  </span>
                )}
                {invalidCount > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-display font-semibold px-3 py-1.5 rounded-full bg-red-50 text-red-600">
                    <XCircle className="h-3 w-3" /> {invalidCount} erreur{invalidCount > 1 ? "s" : ""}
                  </span>
                )}
                {noImageCount > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-display font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-amber-700">
                    <ImageIcon className="h-3 w-3" /> {noImageCount} sans image
                  </span>
                )}
                {noPriceCount > 0 && (
                  <span className="text-[10px] font-display font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-600">
                    {noPriceCount} sans prix
                  </span>
                )}
              </div>

              {/* Category filter tabs */}
              {categories.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  <button
                    onClick={() => setFilterCat(null)}
                    className={`shrink-0 text-[10px] font-display font-semibold px-3 py-1 rounded-full border transition-colors ${
                      filterCat === null
                        ? "bg-foreground text-primary-foreground border-foreground"
                        : "bg-background text-muted-foreground border-border hover:border-foreground/40"
                    }`}
                  >
                    Tous ({products.length})
                  </button>
                  {categories.map(cat => {
                    const count = products.filter(p => p.category === cat).length;
                    return (
                      <button
                        key={cat}
                        onClick={() => setFilterCat(filterCat === cat ? null : cat)}
                        className={`shrink-0 text-[10px] font-display font-semibold px-3 py-1 rounded-full border transition-colors ${
                          filterCat === cat
                            ? "bg-foreground text-primary-foreground border-foreground"
                            : "bg-background text-muted-foreground border-border hover:border-foreground/40"
                        }`}
                      >
                        {cat} ({count})
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Table */}
              <div className="border border-border rounded-sm overflow-hidden">
                <div className="max-h-[50vh] overflow-y-auto">
                  <table className="w-full text-left">
                    {/* Sticky header */}
                    <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                      <tr className="text-[9px] font-display font-semibold text-muted-foreground uppercase tracking-wider">
                        <th className="px-3 py-2 w-8"></th>
                        <th className="px-2 py-2">Nom</th>
                        <th className="px-2 py-2">Catégorie</th>
                        <th className="px-2 py-2 hidden sm:table-cell">Matériau</th>
                        <th className="px-2 py-2 hidden md:table-cell">Couleur</th>
                        <th className="px-2 py-2 text-right">Prix</th>
                        <th className="px-2 py-2 hidden lg:table-cell">Dimensions</th>
                        <th className="px-2 py-2 hidden xl:table-cell">Tags</th>
                        <th className="px-2 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredProducts.map(p => {
                        const tags = allTags(p);
                        const visibleTags = tags.slice(0, 3);
                        const overflowCount = tags.length - visibleTags.length;

                        return (
                          <tr key={p.id} className={`group ${!p.valid ? "bg-red-50/60" : "hover:bg-card/50"}`}>
                            {/* Status icon */}
                            <td className="px-3 py-2 align-top">
                              {p.valid
                                ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                : <XCircle className="h-3.5 w-3.5 text-red-500" />
                              }
                            </td>

                            {/* Name */}
                            <td className="px-2 py-2 align-top max-w-[160px]">
                              <p className="text-xs font-display font-bold text-foreground truncate">{p.name || "—"}</p>
                              {!p.valid && (
                                <p className="text-[8px] font-body text-red-500 mt-0.5 leading-tight">{p.errors.join(", ")}</p>
                              )}
                            </td>

                            {/* Category */}
                            <td className="px-2 py-2 align-top">
                              {p.category ? (
                                <span className="inline-block text-[9px] font-display font-semibold bg-foreground/5 px-1.5 py-0.5 rounded text-muted-foreground whitespace-nowrap">
                                  {p.category}
                                </span>
                              ) : (
                                <span className="text-[9px] font-body text-muted-foreground/50">—</span>
                              )}
                            </td>

                            {/* Material */}
                            <td className="px-2 py-2 align-top hidden sm:table-cell">
                              <span className="text-[10px] font-body text-muted-foreground">
                                {p.material_structure || "—"}
                              </span>
                            </td>

                            {/* Color */}
                            <td className="px-2 py-2 align-top hidden md:table-cell">
                              {p.main_color ? (
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="inline-block w-2.5 h-2.5 rounded-full border border-border shrink-0"
                                    style={{
                                      backgroundColor: /^#|^rgb/i.test(p.main_color)
                                        ? p.main_color
                                        : {
                                            white: "#ffffff", black: "#1a1a1a", grey: "#9ca3af", gray: "#9ca3af",
                                            red: "#ef4444", blue: "#3b82f6", green: "#22c55e", yellow: "#eab308",
                                            orange: "#f97316", brown: "#92400e", beige: "#d4b896", cream: "#fffdd0",
                                            navy: "#1e3a5f", teak: "#b8860b", anthracite: "#383838", taupe: "#8b8589",
                                            natural: "#deb887", sand: "#c2b280", charcoal: "#36454f", ivory: "#fffff0",
                                            terracotta: "#e2725b", olive: "#808000", rust: "#b7410e", slate: "#708090",
                                            blanc: "#ffffff", noir: "#1a1a1a", gris: "#9ca3af", rouge: "#ef4444",
                                            bleu: "#3b82f6", vert: "#22c55e", jaune: "#eab308", marron: "#92400e",
                                          }[p.main_color.toLowerCase()] || "#d4d4d8",
                                    }}
                                  />
                                  <span className="text-[10px] font-body text-muted-foreground truncate max-w-[60px]">
                                    {p.main_color}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[9px] font-body text-muted-foreground/50">—</span>
                              )}
                            </td>

                            {/* Price */}
                            <td className="px-2 py-2 align-top text-right">
                              {p.price_min != null ? (
                                <span className="text-xs font-display font-bold text-foreground">€{p.price_min}</span>
                              ) : (
                                <span className="text-[9px] font-body text-muted-foreground/50">—</span>
                              )}
                            </td>

                            {/* Dimensions */}
                            <td className="px-2 py-2 align-top hidden lg:table-cell">
                              {p.dimensions_length_cm || p.dimensions_width_cm || p.dimensions_height_cm ? (
                                <span className="text-[10px] font-body text-muted-foreground whitespace-nowrap">
                                  {[p.dimensions_length_cm, p.dimensions_width_cm, p.dimensions_height_cm]
                                    .filter(d => d != null)
                                    .join("×")}{" "}
                                  cm
                                </span>
                              ) : (
                                <span className="text-[9px] font-body text-muted-foreground/50">—</span>
                              )}
                            </td>

                            {/* Tags */}
                            <td className="px-2 py-2 align-top hidden xl:table-cell">
                              {tags.length > 0 ? (
                                <div className="flex flex-wrap gap-0.5">
                                  {visibleTags.map(tag => (
                                    <span key={tag} className="text-[8px] font-body text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded whitespace-nowrap">
                                      {tag}
                                    </span>
                                  ))}
                                  {overflowCount > 0 && (
                                    <span className="text-[8px] font-body text-muted-foreground bg-foreground/5 px-1.5 py-0.5 rounded">
                                      +{overflowCount}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[9px] font-body text-muted-foreground/50">—</span>
                              )}
                            </td>

                            {/* Delete */}
                            <td className="px-2 py-2 align-top">
                              <button
                                onClick={() => removeProduct(p.id)}
                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Filtered count hint */}
              {filterCat && (
                <p className="text-[9px] font-body text-muted-foreground">
                  {filteredProducts.length} produit{filteredProducts.length > 1 ? "s" : ""} dans « {filterCat} »
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <button onClick={() => { setStep("upload"); setProducts([]); setColumnMapping({}); setFilterCat(null); }}
                  className="px-4 py-2 text-xs font-display font-semibold border border-border rounded-full hover:border-foreground transition-colors">
                  ← Changer de fichier
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={() => setStep("photos")}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-display font-semibold border border-border rounded-full hover:border-foreground transition-colors">
                    <ImagePlus className="h-3 w-3" /> Ajouter des photos
                  </button>
                  <button onClick={handleImport} disabled={validCount === 0}
                    className="flex items-center gap-2 px-5 py-2 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity">
                    <Check className="h-3 w-3" />
                    Importer {validCount} produit{validCount > 1 ? "s" : ""}
                  </button>
                </div>
              </div>
            </div>
            );
          })()}

          {/* ── Step: Photos ── */}
          {step === "photos" && (
            <div className="space-y-5">
              <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-sm">
                <Info className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[10px] font-body text-blue-800">
                  Uploadez vos photos en lot. Le système associe automatiquement chaque photo au bon produit
                  en comparant le nom du fichier avec le nom du produit. Les photos non matchées pourront être
                  associées manuellement.
                </p>
              </div>

              <div
                onClick={() => photoInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-sm p-8 text-center cursor-pointer hover:border-foreground/30 transition-colors"
              >
                <input ref={photoInputRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                <ImagePlus className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-display font-semibold text-foreground mb-1">Sélectionner les photos</p>
                <p className="text-[10px] font-body text-muted-foreground">
                  Nommez vos fichiers avec le nom du produit pour un matching automatique
                </p>
              </div>

              {/* Photo matching summary */}
              <div className="border border-border rounded-sm max-h-[30vh] overflow-y-auto divide-y divide-border">
                {products.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-2.5">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border">
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="h-3.5 w-3.5 text-muted-foreground/30" />
                      )}
                    </div>
                    <p className="text-[10px] font-display font-semibold text-foreground flex-1 truncate">{p.name}</p>
                    {p.image_url ? (
                      <span className="text-[9px] font-display font-semibold text-green-600 flex items-center gap-1">
                        <Link2 className="h-3 w-3" /> Associée
                        {(p.gallery_urls?.length || 0) > 0 && ` + ${p.gallery_urls!.length}`}
                      </span>
                    ) : (
                      <span className="text-[9px] font-body text-muted-foreground">Pas de photo</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Unmatched photos */}
              {unmatchedPhotos.length > 0 && (
                <div className="border border-amber-200 bg-amber-50/50 rounded-sm p-3">
                  <p className="text-[9px] font-display font-semibold text-amber-700 uppercase tracking-wider mb-2">
                    Photos non matchées ({unmatchedPhotos.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {unmatchedPhotos.map((file, i) => (
                      <div key={i} className="relative group">
                        <img src={URL.createObjectURL(file)} alt={file.name}
                          className="w-14 h-14 rounded-lg object-cover border border-amber-200 cursor-pointer hover:ring-2 hover:ring-foreground transition-all"
                          onClick={() => setManualAssign(manualAssign === String(i) ? null : String(i))}
                        />
                        <p className="text-[7px] font-body text-muted-foreground truncate max-w-[56px] mt-0.5">{file.name}</p>
                        {manualAssign === String(i) && (
                          <div className="absolute top-full left-0 z-10 mt-1 bg-background border border-border rounded-lg shadow-lg p-2 w-48 max-h-32 overflow-y-auto">
                            <p className="text-[8px] font-display text-muted-foreground mb-1">Associer à :</p>
                            {products.map(p => (
                              <button key={p.id} onClick={() => assignPhotoManually(i, p.id)}
                                className="w-full text-left text-[9px] font-body text-foreground hover:bg-foreground/5 rounded px-1.5 py-1 truncate">
                                {p.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <button onClick={() => setStep("preview")}
                  className="px-4 py-2 text-xs font-display font-semibold border border-border rounded-full hover:border-foreground transition-colors">
                  ← Retour au preview
                </button>
                <button onClick={handleImport} disabled={validCount === 0}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity">
                  <Check className="h-3 w-3" />
                  Importer {validCount} produit{validCount > 1 ? "s" : ""}
                </button>
              </div>
            </div>
          )}

          {/* ── Step: Importing ── */}
          {step === "importing" && (
            <div className="py-12 text-center space-y-4">
              <Loader2 className="h-8 w-8 text-foreground animate-spin mx-auto" />
              <div>
                <p className="text-sm font-display font-semibold text-foreground">Import en cours...</p>
                <p className="text-[10px] font-body text-muted-foreground mt-1">
                  {importProgress}% — veuillez ne pas fermer cette fenêtre
                </p>
              </div>
              <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden mx-auto">
                <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${importProgress}%` }} />
              </div>
            </div>
          )}
        </div>

        {step === "upload" && (
          <div className="flex items-center justify-end px-6 py-4 border-t border-border">
            <button onClick={onClose}
              className="px-4 py-2 text-xs font-display font-semibold border border-border rounded-full hover:border-foreground transition-colors">
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
