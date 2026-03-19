import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  X, Upload, FileSpreadsheet, Check, Loader2, AlertTriangle,
  Download, Eye, Trash2, Edit3, CheckCircle2, XCircle, Info,
} from "lucide-react";
import { PLAN_CONFIG, type PartnerPlan } from "./PartnerSections";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ParsedProduct {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  short_description: string;
  material_structure: string;
  material_seat: string;
  main_color: string;
  price_min: number | null;
  price_max: number | null;
  dimensions_length_cm: number | null;
  dimensions_width_cm: number | null;
  dimensions_height_cm: number | null;
  weight_kg: number | null;
  stock_status: string;
  stock_quantity: number | null;
  country_of_manufacture: string;
  warranty: string;
  is_outdoor: boolean;
  is_stackable: boolean;
  // Validation
  valid: boolean;
  errors: string[];
}

// Column mapping from Excel headers to our fields
const COLUMN_MAP: Record<string, keyof ParsedProduct> = {
  // French
  "nom": "name", "nom du produit": "name", "produit": "name",
  "catégorie": "category", "categorie": "category", "category": "category",
  "sous-catégorie": "subcategory", "sous-categorie": "subcategory", "subcategory": "subcategory",
  "description": "short_description", "description courte": "short_description",
  "matériau": "material_structure", "materiau": "material_structure", "matériau structure": "material_structure",
  "material": "material_structure", "structure": "material_structure",
  "matériau assise": "material_seat", "assise": "material_seat", "seat material": "material_seat",
  "couleur": "main_color", "couleur principale": "main_color", "color": "main_color",
  "prix": "price_min", "prix ht": "price_min", "prix min": "price_min", "price": "price_min",
  "prix max": "price_max", "price max": "price_max",
  "longueur": "dimensions_length_cm", "longueur cm": "dimensions_length_cm", "length": "dimensions_length_cm",
  "largeur": "dimensions_width_cm", "largeur cm": "dimensions_width_cm", "width": "dimensions_width_cm",
  "hauteur": "dimensions_height_cm", "hauteur cm": "dimensions_height_cm", "height": "dimensions_height_cm",
  "poids": "weight_kg", "poids kg": "weight_kg", "weight": "weight_kg",
  "stock": "stock_status", "statut stock": "stock_status", "stock status": "stock_status",
  "quantité": "stock_quantity", "quantite": "stock_quantity", "qty": "stock_quantity", "quantity": "stock_quantity",
  "pays": "country_of_manufacture", "pays de fabrication": "country_of_manufacture", "country": "country_of_manufacture",
  "garantie": "warranty", "warranty": "warranty",
  "extérieur": "is_outdoor", "outdoor": "is_outdoor", "exterieur": "is_outdoor",
  "empilable": "is_stackable", "stackable": "is_stackable",
};

const CATEGORY_ALIASES: Record<string, string> = {
  "chaise": "seating", "chaises": "seating", "assise": "seating", "assises": "seating",
  "fauteuil": "seating", "fauteuils": "seating", "tabouret": "seating", "banc": "seating",
  "table": "tables", "tables": "tables",
  "parasol": "parasols", "parasols": "parasols", "ombrage": "parasols",
  "bain de soleil": "loungers", "transat": "loungers", "lounger": "loungers", "loungers": "loungers",
  "canapé": "sofas", "canapés": "sofas", "banquette": "sofas", "sofa": "sofas", "sofas": "sofas",
  "accessoire": "accessories", "accessoires": "accessories", "accessories": "accessories",
  "seating": "seating", "tables": "tables", "parasols": "parasols",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === "," || ch === ";" || ch === "\t") {
        row.push(current.trim());
        current = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(current.trim());
        if (row.some(c => c !== "")) rows.push(row);
        row = [];
        current = "";
      } else {
        current += ch;
      }
    }
  }
  row.push(current.trim());
  if (row.some(c => c !== "")) rows.push(row);
  return rows;
}

function parseBool(val: string): boolean {
  const v = val.toLowerCase().trim();
  return v === "oui" || v === "yes" || v === "true" || v === "1" || v === "x" || v === "✓";
}

function mapRow(headers: string[], row: string[]): ParsedProduct {
  const product: any = {
    id: crypto.randomUUID(),
    name: "", category: "", subcategory: "", short_description: "",
    material_structure: "", material_seat: "", main_color: "",
    price_min: null, price_max: null,
    dimensions_length_cm: null, dimensions_width_cm: null, dimensions_height_cm: null,
    weight_kg: null, stock_status: "in_stock", stock_quantity: null,
    country_of_manufacture: "", warranty: "",
    is_outdoor: true, is_stackable: false,
    valid: true, errors: [],
  };

  headers.forEach((header, i) => {
    const val = row[i] || "";
    if (!val) return;
    const key = COLUMN_MAP[header.toLowerCase().trim()];
    if (!key) return;

    if (key === "price_min" || key === "price_max" || key === "dimensions_length_cm" ||
        key === "dimensions_width_cm" || key === "dimensions_height_cm" ||
        key === "weight_kg" || key === "stock_quantity") {
      const num = parseFloat(val.replace(/[€$,\s]/g, "").replace(",", "."));
      if (!isNaN(num)) product[key] = num;
    } else if (key === "is_outdoor" || key === "is_stackable") {
      product[key] = parseBool(val);
    } else if (key === "category") {
      product[key] = CATEGORY_ALIASES[val.toLowerCase().trim()] || val.toLowerCase().trim();
    } else {
      product[key] = val;
    }
  });

  // Validate
  if (!product.name) {
    product.valid = false;
    product.errors.push("Nom manquant");
  }
  if (!product.category || !["seating", "tables", "parasols", "loungers", "sofas", "accessories"].includes(product.category)) {
    product.valid = false;
    product.errors.push("Catégorie invalide ou manquante");
  }

  return product;
}

// ── Component ──────────────────────────────────────────────────────────────────

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
  const config = PLAN_CONFIG[plan];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "preview" | "importing">("upload");
  const [fileName, setFileName] = useState("");
  const [products, setProducts] = useState<ParsedProduct[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // ── File handling ──

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "tsv", "txt", "xlsx", "xls"].includes(ext || "")) {
      toast.error("Format non supporté. Utilisez CSV, TSV ou Excel (.xlsx).");
      return;
    }

    setFileName(file.name);

    if (ext === "xlsx" || ext === "xls") {
      // For Excel files, we read as CSV-like using a simple approach
      // In production, you'd use a library like SheetJS
      toast.info("Pour les fichiers Excel, exportez d'abord en CSV depuis Excel (Fichier → Enregistrer sous → CSV).");
      // Try to read as text anyway in case it's actually a CSV with wrong extension
      try {
        const text = await file.text();
        processCSVText(text);
      } catch {
        toast.error("Impossible de lire ce fichier. Exportez-le en CSV depuis Excel.");
      }
      return;
    }

    const text = await file.text();
    processCSVText(text);
  };

  const processCSVText = (text: string) => {
    const rows = parseCSV(text);
    if (rows.length < 2) {
      toast.error("Le fichier semble vide ou ne contient qu'un en-tête.");
      return;
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);
    const parsed = dataRows.map(row => mapRow(headers, row));

    if (parsed.length === 0) {
      toast.error("Aucun produit trouvé dans le fichier.");
      return;
    }

    setProducts(parsed);
    setStep("preview");

    const validCount = parsed.filter(p => p.valid).length;
    const invalidCount = parsed.length - validCount;
    if (invalidCount > 0) {
      toast.warning(`${validCount} produit${validCount > 1 ? "s" : ""} valide${validCount > 1 ? "s" : ""}, ${invalidCount} avec des erreurs.`);
    } else {
      toast.success(`${validCount} produit${validCount > 1 ? "s" : ""} détecté${validCount > 1 ? "s" : ""}.`);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    processCSVText(text);
  };

  // ── Import ──

  const removeProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleImport = async () => {
    const validProducts = products.filter(p => p.valid);
    if (validProducts.length === 0) {
      toast.error("Aucun produit valide à importer.");
      return;
    }

    setImporting(true);
    setStep("importing");
    let imported = 0;

    for (const p of validProducts) {
      try {
        const { error } = await supabase.from("products").insert({
          name: p.name,
          category: p.category,
          subcategory: p.subcategory || null,
          short_description: p.short_description || null,
          material_structure: p.material_structure || null,
          material_seat: p.material_seat || null,
          main_color: p.main_color || null,
          price_min: p.price_min,
          price_max: p.price_max,
          dimensions_length_cm: p.dimensions_length_cm,
          dimensions_width_cm: p.dimensions_width_cm,
          dimensions_height_cm: p.dimensions_height_cm,
          weight_kg: p.weight_kg,
          stock_status: p.stock_status || null,
          stock_quantity: p.stock_quantity,
          country_of_manufacture: p.country_of_manufacture || null,
          warranty: p.warranty || null,
          is_outdoor: p.is_outdoor,
          is_stackable: p.is_stackable,
          publish_status: "draft",
          partner_id: null,
        });

        if (!error) imported++;
      } catch {
        // Skip failed individual inserts
      }
      setImportProgress(Math.round(((imported + 1) / validProducts.length) * 100));
    }

    setImporting(false);
    if (imported > 0) {
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
      "Chaise Riviera", "seating", "dining-chair", "Chaise empilable en aluminium",
      "aluminium", "textilène", "white",
      "140", "160", "56", "58", "84",
      "3.8", "in_stock", "200", "Italie",
      "3 ans", "oui", "oui",
    ];

    const csv = [headers.join(";"), example.join(";")].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "terrassea_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Template téléchargé !");
  };

  const validCount = products.filter(p => p.valid).length;
  const invalidCount = products.length - validCount;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8">
      <div className="bg-background border border-border rounded-sm shadow-xl w-full max-w-3xl mx-4 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-display font-bold text-base text-foreground flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Import Excel / CSV
            </h2>
            <p className="text-[10px] font-body text-muted-foreground mt-0.5">
              Importez vos produits en masse depuis un fichier Excel ou CSV
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
              {/* Template download */}
              <div className="flex items-start gap-3 px-4 py-3 bg-card border border-border rounded-sm">
                <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[10px] font-body text-muted-foreground leading-relaxed">
                    Utilisez notre template pour structurer vos données correctement.
                    Les colonnes reconnues : <strong>Nom, Catégorie, Description, Matériau, Couleur, Prix HT, Dimensions, Poids, Stock, Pays, Garantie...</strong>
                  </p>
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center gap-1.5 mt-2 text-[10px] font-display font-semibold text-foreground hover:underline"
                  >
                    <Download className="h-3 w-3" /> Télécharger le template CSV
                  </button>
                </div>
              </div>

              {/* Upload zone */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-sm p-10 text-center cursor-pointer hover:border-foreground/30 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.txt,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-display font-semibold text-foreground mb-1">
                  Glissez votre fichier ou cliquez pour sélectionner
                </p>
                <p className="text-[10px] font-body text-muted-foreground">
                  CSV, TSV ou Excel (.xlsx) · Séparateur : virgule, point-virgule ou tabulation
                </p>
              </div>

              {/* Accepted columns info */}
              <div className="border border-border rounded-sm p-4">
                <p className="text-[10px] font-display font-semibold text-foreground mb-2">Colonnes reconnues automatiquement :</p>
                <div className="grid grid-cols-3 gap-1.5 text-[9px] font-body text-muted-foreground">
                  {[
                    "Nom du produit *", "Catégorie *", "Sous-catégorie",
                    "Description", "Matériau structure", "Matériau assise",
                    "Couleur", "Prix HT *", "Prix max",
                    "Longueur cm", "Largeur cm", "Hauteur cm",
                    "Poids kg", "Stock", "Quantité",
                    "Pays de fabrication", "Garantie", "Extérieur / Empilable",
                  ].map(col => (
                    <span key={col} className={col.includes("*") ? "text-foreground font-semibold" : ""}>
                      {col}
                    </span>
                  ))}
                </div>
                <p className="text-[9px] font-body text-muted-foreground mt-2">
                  * Champs obligatoires. Les noms de colonnes sont reconnus en français et en anglais.
                </p>
              </div>

              {/* Commission reminder */}
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

          {/* ── Step: Preview ── */}
          {step === "preview" && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-display font-semibold text-foreground">
                    {products.length} produit{products.length > 1 ? "s" : ""} détecté{products.length > 1 ? "s" : ""}
                  </p>
                  <p className="text-[10px] font-body text-muted-foreground">
                    Fichier : {fileName}
                  </p>
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

              {/* Product table */}
              <div className="border border-border rounded-sm overflow-hidden max-h-[40vh] overflow-y-auto">
                <table className="w-full text-[10px] font-body">
                  <thead className="bg-card sticky top-0">
                    <tr className="border-b border-border">
                      <th className="text-left px-3 py-2 font-display font-semibold text-muted-foreground">Statut</th>
                      <th className="text-left px-3 py-2 font-display font-semibold text-muted-foreground">Nom</th>
                      <th className="text-left px-3 py-2 font-display font-semibold text-muted-foreground">Catégorie</th>
                      <th className="text-left px-3 py-2 font-display font-semibold text-muted-foreground">Matériau</th>
                      <th className="text-right px-3 py-2 font-display font-semibold text-muted-foreground">Prix HT</th>
                      <th className="text-right px-3 py-2 font-display font-semibold text-muted-foreground">→ Client</th>
                      <th className="text-center px-3 py-2 font-display font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {products.map((p) => {
                      const comm = p.price_min ? p.price_min * (config.commission / 100) : 0;
                      const clientPrice = p.price_min ? p.price_min + comm : 0;
                      return (
                        <tr key={p.id} className={!p.valid ? "bg-red-50/50" : "hover:bg-card/50"}>
                          <td className="px-3 py-2">
                            {p.valid ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <div>
                                <XCircle className="h-3.5 w-3.5 text-red-500" />
                                <p className="text-[8px] text-red-500 mt-0.5">{p.errors.join(", ")}</p>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 font-semibold text-foreground max-w-[160px] truncate">
                            {p.name || <span className="text-red-400 italic">—</span>}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{p.category || "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{p.material_structure || "—"}</td>
                          <td className="px-3 py-2 text-right text-foreground">
                            {p.price_min != null ? `€${p.price_min}` : "—"}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {p.price_min != null ? (
                              <span className="text-amber-600">€{clientPrice.toFixed(0)}</span>
                            ) : "—"}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => removeProduct(p.id)}
                              className="text-muted-foreground hover:text-red-500 transition-colors"
                              title="Retirer"
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

              {/* Commission info */}
              <div
                className="flex items-center gap-3 px-4 py-2.5 rounded-sm border text-[10px] font-body"
                style={{ background: config.bg, borderColor: config.border, color: config.color }}
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>
                  La colonne "→ Client" inclut la commission Terrassea de <strong>{config.commission}%</strong> (plan {config.label}).
                </span>
              </div>

              {/* Back / Import buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => { setStep("upload"); setProducts([]); }}
                  className="px-4 py-2 text-xs font-display font-semibold border border-border rounded-full hover:border-foreground transition-colors"
                >
                  ← Changer de fichier
                </button>
                <button
                  onClick={handleImport}
                  disabled={validCount === 0}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
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
                <div
                  className="h-full rounded-full bg-foreground transition-all"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer (only for upload step) */}
        {step === "upload" && (
          <div className="flex items-center justify-end px-6 py-4 border-t border-border">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-display font-semibold border border-border rounded-full hover:border-foreground transition-colors"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
