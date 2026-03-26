import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  X, Upload, FileSpreadsheet, Check, Loader2, AlertTriangle,
  Download, Trash2, CheckCircle2, XCircle, Info, Sparkles,
  ImagePlus, Link2, Image as ImageIcon,
} from "lucide-react";
import { PLAN_CONFIG, type PartnerPlan } from "./PartnerSections";

// ── Types ──────────────────────────────────────────────────────────────────────

interface AIProduct {
  id: string;
  name: string;
  category: string;
  subcategory?: string | null;
  short_description?: string | null;
  long_description?: string | null;
  material_structure?: string | null;
  material_seat?: string | null;
  main_color?: string | null;
  secondary_color?: string | null;
  available_colors?: string[];
  style_tags?: string[];
  ambience_tags?: string[];
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
  collection?: string | null;
  brand_source?: string | null;
  // UI state
  image_url?: string | null;
  gallery_urls?: string[];
  valid: boolean;
  errors: string[];
}

// ── CSV Parser ────────────────────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
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

const MAX_ROWS_PER_BATCH = 20;

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
  const { user } = useAuth();
  const config = PLAN_CONFIG[plan];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "analyzing" | "preview" | "photos" | "importing">("upload");
  const [fileName, setFileName] = useState("");
  const [products, setProducts] = useState<AIProduct[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [analyzeProgress, setAnalyzeProgress] = useState("");
  // Photo matching
  const [unmatchedPhotos, setUnmatchedPhotos] = useState<File[]>([]);
  const [manualAssign, setManualAssign] = useState<string | null>(null);

  // ── File handling ──

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "tsv", "txt"].includes(ext || "")) {
      toast.error("Format non supporté. Utilisez un fichier CSV ou TSV.");
      return;
    }
    setFileName(file.name);
    const text = await file.text();
    await processCSVWithAI(text);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    await processCSVWithAI(text);
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
        } catch (batchErr: any) {
          console.warn(`Batch ${batchNum} failed:`, batchErr);
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
      if (error) { console.warn("Photo upload failed:", error.message); return null; }
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
      return urlData?.publicUrl || null;
    } catch (err) {
      console.warn("Photo upload error:", err);
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
      toast.warning("Aucun profil partenaire trouvé. Les produits seront importés sans propriétaire.");
    }

    setImporting(true);
    setStep("importing");
    let imported = 0;
    const failedNames: string[] = [];

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

        const { error } = await supabase.from("products").insert({
          name: p.name,
          category: p.category,
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
          collection: p.collection || null,
          brand_source: p.brand_source || null,
          image_url: imageUrl,
          gallery_urls: galleryUrls.length > 0 ? galleryUrls : [],
          publish_status: "draft",
          partner_id: partnerId,
        });
        if (error) {
          console.warn(`Insert failed for "${p.name}":`, error.message);
          failedNames.push(p.name);
        } else {
          imported++;
        }
      } catch (err: any) {
        console.warn(`Insert exception for "${p.name}":`, err);
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

    setImporting(false);
    if (imported > 0) {
      if (failedNames.length > 0) {
        toast.warning(`${imported} importé${imported > 1 ? "s" : ""}, ${failedNames.length} échoué${failedNames.length > 1 ? "s" : ""} : ${failedNames.slice(0, 3).join(", ")}${failedNames.length > 3 ? "..." : ""}`);
      }
      onSuccess(imported);
    } else {
      toast.error("Aucun produit n'a pu être importé.");
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
              Import intelligent CSV
              <span className="text-[9px] font-body text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">IA</span>
            </h2>
            <p className="text-[10px] font-body text-muted-foreground mt-0.5">
              L'IA analyse votre fichier et enrichit automatiquement chaque produit
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* ── Step: Upload ── */}
          {step === "upload" && (
            <div className="space-y-5">
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
                <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt" onChange={handleFileSelect} className="hidden" />
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
          {step === "preview" && (
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

              {/* Summary */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-display font-semibold text-foreground">
                    {products.length} produit{products.length > 1 ? "s" : ""} enrichi{products.length > 1 ? "s" : ""}
                  </p>
                  <p className="text-[10px] font-body text-muted-foreground">Fichier : {fileName}</p>
                </div>
                <div className="flex items-center gap-2">
                  {validCount > 0 && (
                    <span className="flex items-center gap-1 text-[9px] font-display font-semibold bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="h-2.5 w-2.5" /> {validCount} valide{validCount > 1 ? "s" : ""}
                    </span>
                  )}
                  {invalidCount > 0 && (
                    <span className="flex items-center gap-1 text-[9px] font-display font-semibold bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                      <XCircle className="h-2.5 w-2.5" /> {invalidCount} erreur{invalidCount > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>

              {/* Product cards */}
              <div className="border border-border rounded-sm overflow-hidden max-h-[45vh] overflow-y-auto divide-y divide-border">
                {products.map(p => {
                  const comm = p.price_min ? p.price_min * (config.commission / 100) : 0;
                  const clientPrice = p.price_min ? p.price_min + comm : null;
                  return (
                    <div key={p.id} className={`p-3 ${!p.valid ? "bg-red-50/50" : "hover:bg-card/50"}`}>
                      <div className="flex items-start gap-3">
                        {/* Image preview */}
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border">
                          {p.image_url ? (
                            <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
                          )}
                        </div>

                        {/* Product info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {p.valid ? <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" /> : <XCircle className="h-3 w-3 text-red-500 shrink-0" />}
                            <p className="text-xs font-display font-semibold text-foreground truncate">{p.name || "—"}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-[9px] font-display font-semibold bg-foreground/5 px-1.5 py-0.5 rounded text-muted-foreground">{p.category || "—"}</span>
                            {p.material_structure && <span className="text-[9px] font-body text-muted-foreground">{p.material_structure}</span>}
                            {p.main_color && <span className="text-[9px] font-body text-muted-foreground">· {p.main_color}</span>}
                            {p.dimensions_length_cm && p.dimensions_width_cm && (
                              <span className="text-[9px] font-body text-muted-foreground">
                                · {p.dimensions_length_cm}×{p.dimensions_width_cm}{p.dimensions_height_cm ? `×${p.dimensions_height_cm}` : ""} cm
                              </span>
                            )}
                          </div>
                          {/* Tags */}
                          {(p.style_tags?.length || 0) > 0 && (
                            <div className="flex flex-wrap gap-0.5 mt-1">
                              {p.style_tags!.slice(0, 4).map(tag => (
                                <span key={tag} className="text-[8px] font-body text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">{tag}</span>
                              ))}
                              {(p.material_tags || []).slice(0, 2).map(tag => (
                                <span key={tag} className="text-[8px] font-body text-blue-700 bg-blue-50 px-1 py-0.5 rounded">{tag}</span>
                              ))}
                            </div>
                          )}
                          {!p.valid && <p className="text-[8px] text-red-500 mt-0.5">{p.errors.join(", ")}</p>}
                        </div>

                        {/* Price + actions */}
                        <div className="text-right shrink-0">
                          {p.price_min != null ? (
                            <>
                              <p className="text-xs font-display font-bold text-foreground">€{p.price_min}</p>
                              {clientPrice != null && (
                                <p className="text-[9px] font-body text-amber-600">→ €{clientPrice.toFixed(0)}</p>
                              )}
                            </>
                          ) : (
                            <p className="text-[9px] font-body text-muted-foreground">—</p>
                          )}
                          <button onClick={() => removeProduct(p.id)} className="text-muted-foreground hover:text-red-500 mt-1 transition-colors">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <button onClick={() => { setStep("upload"); setProducts([]); setColumnMapping({}); }}
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
          )}

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
