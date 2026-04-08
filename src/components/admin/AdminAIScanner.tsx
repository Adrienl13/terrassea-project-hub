import { useState, useMemo } from "react";
import { useProducts } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Sparkles, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  AlertTriangle, ArrowUpDown, Filter, Zap, Package, RotateCcw,
  Check, X, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { computeProductQuality } from "@/lib/productQualityScore";
import type { DBProduct } from "@/lib/products";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface FieldSuggestion {
  action: "add" | "replace";
  current_value: any;
  suggested_value: any;
  confidence: number;
  reason: string;
}

interface ProductSuggestion {
  product_id: string;
  fields: Record<string, FieldSuggestion>;
}

type FieldDecision = "pending" | "accepted" | "rejected";

interface ScanState {
  suggestions: ProductSuggestion[];
  decisions: Record<string, Record<string, FieldDecision>>; // productId -> fieldName -> decision
}

type SortKey = "quality_asc" | "quality_desc" | "name" | "suggestions";
type FilterMode = "all" | "low_quality" | "no_tags" | "scanned";

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

const TAG_FIELDS = ["style_tags", "ambience_tags", "palette_tags", "material_tags", "use_case_tags", "technical_tags", "available_colors"];
const BOOL_FIELDS = ["is_outdoor", "is_stackable", "is_chr_heavy_use", "uv_resistant", "weather_resistant", "fire_retardant", "lightweight", "easy_maintenance"];
const TEXT_FIELDS = ["short_description", "long_description", "short_description_fr", "short_description_es", "short_description_it", "long_description_fr", "long_description_es", "long_description_it", "subcategory", "main_color", "secondary_color"];
const OBJECT_FIELDS = ["product_type_tags"];

const FIELD_LABELS: Record<string, string> = {
  style_tags: "Tags style",
  ambience_tags: "Tags ambiance",
  palette_tags: "Tags palette",
  material_tags: "Tags matériaux",
  use_case_tags: "Tags cas d'usage",
  technical_tags: "Tags techniques",
  available_colors: "Couleurs disponibles",
  short_description: "Description courte",
  long_description: "Description longue",
  short_description_fr: "Description courte (FR)",
  short_description_es: "Description courte (ES)",
  short_description_it: "Description courte (IT)",
  long_description_fr: "Description longue (FR)",
  long_description_es: "Description longue (ES)",
  long_description_it: "Description longue (IT)",
  subcategory: "Sous-catégorie",
  main_color: "Couleur principale",
  secondary_color: "Couleur secondaire",
  is_outdoor: "Outdoor",
  is_stackable: "Empilable",
  is_chr_heavy_use: "Usage CHR intensif",
  uv_resistant: "Anti-UV",
  weather_resistant: "Résistant intempéries",
  fire_retardant: "Ignifuge",
  lightweight: "Léger",
  easy_maintenance: "Entretien facile",
  product_type_tags: "Specs type produit",
};

function confidenceColor(c: number): string {
  if (c >= 0.8) return "text-green-600";
  if (c >= 0.6) return "text-amber-600";
  return "text-red-500";
}

function confidenceBg(c: number): string {
  if (c >= 0.8) return "bg-green-500";
  if (c >= 0.6) return "bg-amber-500";
  return "bg-red-500";
}

function qualityTier(score: number) {
  const pct = Math.round(score * 100);
  if (pct >= 80) return { label: "Excellent", color: "text-green-700", bg: "bg-green-50 border-green-200", bar: "bg-green-500" };
  if (pct >= 60) return { label: "Bon",       color: "text-blue-700",  bg: "bg-blue-50 border-blue-200",  bar: "bg-blue-500" };
  if (pct >= 40) return { label: "Moyen",     color: "text-amber-700", bg: "bg-amber-50 border-amber-200", bar: "bg-amber-500" };
  return { label: "Incomplet", color: "text-red-700", bg: "bg-red-50 border-red-200", bar: "bg-red-500" };
}

// ═══════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════

export default function AdminAIScanner() {
  const { data: products = [] } = useProducts();
  const queryClient = useQueryClient();

  const [scanState, setScanState] = useState<ScanState>({ suggestions: [], decisions: {} });
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ done: 0, total: 0 });
  const [applying, setApplying] = useState<string | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("quality_asc");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Published products only
  const publishedProducts = useMemo(
    () => products.filter(p => p.publish_status === "published" || p.publish_status === "draft"),
    [products],
  );

  // Filtered & sorted product list
  const displayProducts = useMemo(() => {
    let list = [...publishedProducts];

    // Filter
    if (filterMode === "low_quality") {
      list = list.filter(p => (p.data_quality_score ?? 0) < 0.6);
    } else if (filterMode === "no_tags") {
      list = list.filter(p =>
        (!p.style_tags || p.style_tags.length === 0) &&
        (!p.material_tags || p.material_tags.length === 0) &&
        (!p.use_case_tags || p.use_case_tags.length === 0),
      );
    } else if (filterMode === "scanned") {
      const scannedIds = new Set(scanState.suggestions.map(s => s.product_id));
      list = list.filter(p => scannedIds.has(p.id));
    }

    // Sort
    if (sortKey === "quality_asc") list.sort((a, b) => (a.data_quality_score ?? 0) - (b.data_quality_score ?? 0));
    else if (sortKey === "quality_desc") list.sort((a, b) => (b.data_quality_score ?? 0) - (a.data_quality_score ?? 0));
    else if (sortKey === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortKey === "suggestions") {
      const sugMap = new Map(scanState.suggestions.map(s => [s.product_id, Object.keys(s.fields).length]));
      list.sort((a, b) => (sugMap.get(b.id) ?? 0) - (sugMap.get(a.id) ?? 0));
    }

    return list;
  }, [publishedProducts, filterMode, sortKey, scanState.suggestions]);

  // Stats
  const stats = useMemo(() => {
    const total = publishedProducts.length;
    const lowQuality = publishedProducts.filter(p => (p.data_quality_score ?? 0) < 0.6).length;
    const noTags = publishedProducts.filter(p =>
      (!p.style_tags || p.style_tags.length === 0) &&
      (!p.material_tags || p.material_tags.length === 0) &&
      (!p.use_case_tags || p.use_case_tags.length === 0),
    ).length;
    const scanned = scanState.suggestions.length;
    const pendingDecisions = Object.values(scanState.decisions).reduce((acc, fields) =>
      acc + Object.values(fields).filter(d => d === "pending").length, 0,
    );
    return { total, lowQuality, noTags, scanned, pendingDecisions };
  }, [publishedProducts, scanState]);

  // ── Scan products via Edge Function ──
  const scanProducts = async (productIds: string[]) => {
    const toScan = publishedProducts.filter(p => productIds.includes(p.id));
    if (toScan.length === 0) return;

    setScanning(true);
    setScanProgress({ done: 0, total: toScan.length });

    const BATCH_SIZE = 5;
    const allSuggestions: ProductSuggestion[] = [];

    try {
      for (let i = 0; i < toScan.length; i += BATCH_SIZE) {
        const batch = toScan.slice(i, i + BATCH_SIZE);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { toast.error("Session expirée"); break; }

        const res = await supabase.functions.invoke("enrich-products", {
          body: { products: batch },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (res.error) {
          console.error("Enrich error:", res.error);
          toast.error(`Erreur batch ${Math.floor(i / BATCH_SIZE) + 1}: ${res.error.message}`);
          continue;
        }

        const suggestions = res.data?.suggestions || [];
        allSuggestions.push(...suggestions);
        setScanProgress({ done: Math.min(i + BATCH_SIZE, toScan.length), total: toScan.length });
      }

      // Merge into state
      setScanState(prev => {
        const existingMap = new Map(prev.suggestions.map(s => [s.product_id, s]));
        for (const s of allSuggestions) {
          existingMap.set(s.product_id, s);
        }
        const newSuggestions = Array.from(existingMap.values());

        // Init decisions for new suggestions
        const newDecisions = { ...prev.decisions };
        for (const s of allSuggestions) {
          if (!newDecisions[s.product_id]) newDecisions[s.product_id] = {};
          for (const field of Object.keys(s.fields)) {
            if (!newDecisions[s.product_id][field]) {
              newDecisions[s.product_id][field] = "pending";
            }
          }
        }

        return { suggestions: newSuggestions, decisions: newDecisions };
      });

      const totalFields = allSuggestions.reduce((a, s) => a + Object.keys(s.fields).length, 0);
      toast.success(`Scan terminé : ${allSuggestions.length} produit(s), ${totalFields} suggestion(s)`);
    } catch (err) {
      console.error("Scan error:", err);
      toast.error("Erreur lors du scan");
    } finally {
      setScanning(false);
    }
  };

  // ── Accept/reject field decision ──
  const setDecision = (productId: string, field: string, decision: FieldDecision) => {
    setScanState(prev => ({
      ...prev,
      decisions: {
        ...prev.decisions,
        [productId]: { ...prev.decisions[productId], [field]: decision },
      },
    }));
  };

  // ── Accept/reject all fields for a product ──
  const setAllDecisions = (productId: string, decision: FieldDecision) => {
    setScanState(prev => {
      const productDecisions = { ...prev.decisions[productId] };
      for (const field of Object.keys(productDecisions)) {
        productDecisions[field] = decision;
      }
      return { ...prev, decisions: { ...prev.decisions, [productId]: productDecisions } };
    });
  };

  // ── Apply accepted suggestions for a product ──
  const applyAccepted = async (productId: string) => {
    const suggestion = scanState.suggestions.find(s => s.product_id === productId);
    const decisions = scanState.decisions[productId];
    if (!suggestion || !decisions) return;

    const acceptedFields = Object.entries(decisions)
      .filter(([_, d]) => d === "accepted")
      .map(([field]) => field);

    if (acceptedFields.length === 0) {
      toast.info("Aucune suggestion validée pour ce produit");
      return;
    }

    setApplying(productId);

    try {
      // Find current product
      const product = publishedProducts.find(p => p.id === productId);
      if (!product) throw new Error("Produit introuvable");

      const updates: Record<string, any> = {};

      for (const field of acceptedFields) {
        const fieldSuggestion = suggestion.fields[field];
        if (!fieldSuggestion) continue;

        if (TAG_FIELDS.includes(field)) {
          // Merge new tags with existing
          const existing: string[] = (product as any)[field] || [];
          const toAdd: string[] = fieldSuggestion.suggested_value || [];
          const merged = [...new Set([...existing, ...toAdd])];
          updates[field] = merged;
        } else if (field === "product_type_tags") {
          const existing = (product.product_type_tags as Record<string, any>) || {};
          const toAdd = fieldSuggestion.suggested_value || {};
          updates[field] = { ...existing, ...toAdd };
        } else {
          updates[field] = fieldSuggestion.suggested_value;
        }
      }

      // Recompute quality score
      const updatedProduct = { ...product, ...updates };
      const newQuality = computeProductQuality(updatedProduct as any);
      updates.data_quality_score = newQuality.score / 100;

      const { error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", productId);

      if (error) throw error;

      // Remove applied suggestions from state
      setScanState(prev => ({
        suggestions: prev.suggestions.filter(s => s.product_id !== productId),
        decisions: (() => {
          const d = { ...prev.decisions };
          delete d[productId];
          return d;
        })(),
      }));

      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`${acceptedFields.length} amélioration(s) appliquée(s) — Score: ${Math.round(updates.data_quality_score * 100)}%`);
    } catch (err) {
      console.error("Apply error:", err);
      toast.error("Erreur lors de l'application");
    } finally {
      setApplying(null);
    }
  };

  // ── Get suggestion for a product ──
  const getSuggestion = (productId: string) =>
    scanState.suggestions.find(s => s.product_id === productId);

  const getSuggestionCount = (productId: string) => {
    const s = getSuggestion(productId);
    return s ? Object.keys(s.fields).length : 0;
  };

  const getPendingCount = (productId: string) => {
    const d = scanState.decisions[productId];
    return d ? Object.values(d).filter(v => v === "pending").length : 0;
  };

  const getAcceptedCount = (productId: string) => {
    const d = scanState.decisions[productId];
    return d ? Object.values(d).filter(v => v === "accepted").length : 0;
  };

  // ── Toggle select ──
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === displayProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayProducts.map(p => p.id)));
    }
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#D4603A]" />
            AI Product Scanner
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Scannez le catalogue pour détecter et appliquer des améliorations IA
          </p>
        </div>
      </div>

      {/* ── Stats cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Produits" value={stats.total} icon={Package} />
        <StatCard
          label="Qualité < 60%"
          value={stats.lowQuality}
          icon={AlertTriangle}
          color={stats.lowQuality > 0 ? "text-amber-600" : undefined}
          onClick={() => setFilterMode("low_quality")}
        />
        <StatCard
          label="Sans tags"
          value={stats.noTags}
          icon={XCircle}
          color={stats.noTags > 0 ? "text-red-600" : undefined}
          onClick={() => setFilterMode("no_tags")}
        />
        <StatCard
          label="Scannés"
          value={stats.scanned}
          icon={Eye}
          color="text-blue-600"
          onClick={() => setFilterMode("scanned")}
        />
        <StatCard
          label="En attente"
          value={stats.pendingDecisions}
          icon={Zap}
          color={stats.pendingDecisions > 0 ? "text-[#D4603A]" : undefined}
        />
      </div>

      {/* ── Controls bar ── */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-border rounded-xl p-3">
        {/* Filters */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          {(["all", "low_quality", "no_tags", "scanned"] as FilterMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-display font-semibold transition-all ${
                filterMode === mode
                  ? "bg-[#D4603A] text-white"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              }`}
            >
              {{ all: "Tous", low_quality: "Qualité < 60%", no_tags: "Sans tags", scanned: "Scannés" }[mode]}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5 ml-auto">
          <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            className="text-[11px] font-display font-semibold bg-secondary/50 border-none rounded-lg px-2 py-1 focus:outline-none"
          >
            <option value="quality_asc">Qualité croissante</option>
            <option value="quality_desc">Qualité décroissante</option>
            <option value="name">Nom A-Z</option>
            <option value="suggestions">Suggestions</option>
          </select>
        </div>

        {/* Scan buttons */}
        <button
          onClick={selectAll}
          className="px-3 py-1.5 rounded-lg text-[11px] font-display font-semibold bg-secondary/50 hover:bg-secondary transition-all"
        >
          {selectedIds.size === displayProducts.length ? "Désélectionner tout" : "Sélectionner tout"}
        </button>

        <button
          onClick={() => {
            const ids = selectedIds.size > 0 ? Array.from(selectedIds) : displayProducts.map(p => p.id);
            scanProducts(ids);
          }}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-display font-bold bg-[#D4603A] text-white hover:bg-[#C0502E] disabled:opacity-50 transition-all"
        >
          {scanning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Scan {scanProgress.done}/{scanProgress.total}...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              Scanner {selectedIds.size > 0 ? `(${selectedIds.size})` : `tout (${displayProducts.length})`}
            </>
          )}
        </button>
      </div>

      {/* ── Product list ── */}
      <div className="space-y-2">
        {displayProducts.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Aucun produit ne correspond aux filtres sélectionnés.
          </div>
        )}

        {displayProducts.map(product => {
          const suggestion = getSuggestion(product.id);
          const sugCount = getSuggestionCount(product.id);
          const pendingCount = getPendingCount(product.id);
          const acceptedCount = getAcceptedCount(product.id);
          const isExpanded = expandedProduct === product.id;
          const tier = qualityTier(product.data_quality_score ?? 0);

          return (
            <div
              key={product.id}
              className={`border rounded-xl overflow-hidden transition-all ${
                suggestion ? "border-[#D4603A]/30 bg-[#D4603A]/[0.02]" : "border-border bg-white"
              }`}
            >
              {/* Product row */}
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedIds.has(product.id)}
                  onChange={() => toggleSelect(product.id)}
                  className="w-4 h-4 rounded border-border accent-[#D4603A]"
                />

                {/* Image */}
                <div className="w-10 h-10 rounded-lg bg-secondary/50 overflow-hidden flex-shrink-0">
                  {product.image_url ? (
                    <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-4 h-4 text-muted-foreground/40" />
                    </div>
                  )}
                </div>

                {/* Name + category */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-display font-semibold truncate">{product.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {product.category}{product.subcategory ? ` / ${product.subcategory}` : ""} — {product.brand_source || "Sans marque"}
                  </p>
                </div>

                {/* Quality badge */}
                <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full border text-[10px] font-display font-semibold ${tier.bg} ${tier.color}`}>
                  <div className="w-12 h-1.5 bg-black/10 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${tier.bar}`} style={{ width: `${Math.round((product.data_quality_score ?? 0) * 100)}%` }} />
                  </div>
                  {Math.round((product.data_quality_score ?? 0) * 100)}%
                </div>

                {/* Suggestion count badge */}
                {sugCount > 0 && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#D4603A]/10 border border-[#D4603A]/20 text-[10px] font-display font-bold text-[#D4603A]">
                    <Sparkles className="w-3 h-3" />
                    {sugCount} suggestion{sugCount > 1 ? "s" : ""}
                    {pendingCount > 0 && (
                      <span className="ml-1 px-1.5 py-0 rounded-full bg-[#D4603A] text-white text-[9px]">
                        {pendingCount}
                      </span>
                    )}
                  </div>
                )}

                {/* Expand button */}
                {sugCount > 0 && (
                  <button
                    onClick={() => setExpandedProduct(isExpanded ? null : product.id)}
                    className="p-1.5 rounded-lg hover:bg-secondary/80 transition-all"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                )}
              </div>

              {/* ── Expanded suggestion panel ── */}
              {isExpanded && suggestion && (
                <div className="border-t border-border/50 bg-secondary/20 px-4 py-4">
                  {/* Bulk actions */}
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-display font-bold text-muted-foreground uppercase tracking-wider">
                      Suggestions IA — Revue champ par champ
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setAllDecisions(product.id, "accepted")}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-display font-bold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-all"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Tout accepter
                      </button>
                      <button
                        onClick={() => setAllDecisions(product.id, "rejected")}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-display font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-all"
                      >
                        <XCircle className="w-3 h-3" /> Tout rejeter
                      </button>
                      <button
                        onClick={() => setAllDecisions(product.id, "pending")}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-display font-bold bg-secondary text-muted-foreground border border-border hover:bg-secondary/80 transition-all"
                      >
                        <RotateCcw className="w-3 h-3" /> Reset
                      </button>
                    </div>
                  </div>

                  {/* Field suggestions */}
                  <div className="space-y-2">
                    {Object.entries(suggestion.fields).map(([field, fieldSug]) => {
                      const decision = scanState.decisions[product.id]?.[field] ?? "pending";
                      return (
                        <SuggestionRow
                          key={field}
                          field={field}
                          suggestion={fieldSug}
                          decision={decision}
                          onAccept={() => setDecision(product.id, field, "accepted")}
                          onReject={() => setDecision(product.id, field, "rejected")}
                          onReset={() => setDecision(product.id, field, "pending")}
                        />
                      );
                    })}
                  </div>

                  {/* Apply button */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                    <p className="text-[11px] text-muted-foreground">
                      {acceptedCount} champ(s) validé(s) sur {sugCount}
                    </p>
                    <button
                      onClick={() => applyAccepted(product.id)}
                      disabled={acceptedCount === 0 || applying === product.id}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl text-[12px] font-display font-bold bg-[#D4603A] text-white hover:bg-[#C0502E] disabled:opacity-40 transition-all"
                    >
                      {applying === product.id ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Application...</>
                      ) : (
                        <><CheckCircle2 className="w-3.5 h-3.5" /> Appliquer les {acceptedCount} validé(s)</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUGGESTION ROW
// ═══════════════════════════════════════════════════════════

function formatCurrentValue(value: any, isTag: boolean, isBool: boolean, isObject: boolean): string {
  if (value === null || value === undefined || value === "") return "";
  if (isBool) return value ? "Oui" : "Non";
  if (isObject) {
    if (typeof value === "object") {
      const entries = Object.entries(value).filter(([, v]) => v != null && v !== "");
      return entries.length === 0 ? "" : entries.map(([k, v]) => `${k}: ${v}`).join(", ");
    }
    return String(value);
  }
  if (isTag && Array.isArray(value)) return value.length === 0 ? "" : value.join(", ");
  const str = String(value);
  return str.length > 120 ? str.slice(0, 120) + "..." : str;
}

function formatSuggestedObject(value: any): { key: string; val: string }[] {
  if (typeof value !== "object" || value === null) return [{ key: "", val: String(value) }];
  return Object.entries(value)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => ({ key: k, val: String(v) }));
}

function SuggestionRow({
  field, suggestion, decision, onAccept, onReject, onReset,
}: {
  field: string;
  suggestion: FieldSuggestion;
  decision: FieldDecision;
  onAccept: () => void;
  onReject: () => void;
  onReset: () => void;
}) {
  const isTag = TAG_FIELDS.includes(field);
  const isBool = BOOL_FIELDS.includes(field);
  const isObject = OBJECT_FIELDS.includes(field);
  const label = FIELD_LABELS[field] || field;

  const borderColor =
    decision === "accepted" ? "border-green-300 bg-green-50/50" :
    decision === "rejected" ? "border-red-200 bg-red-50/30 opacity-60" :
    "border-[#D4603A]/20 bg-[#D4603A]/[0.03]";

  const currentDisplay = formatCurrentValue(suggestion.current_value, isTag, isBool, isObject);

  // Decision-based style for suggested value
  const sugAccepted = "bg-green-100 text-green-800 border-green-300";
  const sugRejected = "bg-red-50 text-red-400 border-red-200 line-through";
  const sugPending = "bg-[#D4603A]/10 text-[#D4603A] border-[#D4603A]/20";
  const sugStyle = decision === "accepted" ? sugAccepted : decision === "rejected" ? sugRejected : sugPending;

  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3 transition-all ${borderColor}`}>
      {/* Left: field info */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Field name + confidence */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-display font-bold">{label}</span>
          <span className={`text-[9px] font-display font-bold ${confidenceColor(suggestion.confidence)}`}>
            {Math.round(suggestion.confidence * 100)}% confiance
          </span>
          <div className="w-10 h-1 rounded-full bg-black/10 overflow-hidden">
            <div className={`h-full rounded-full ${confidenceBg(suggestion.confidence)}`} style={{ width: `${suggestion.confidence * 100}%` }} />
          </div>
          <span className="text-[9px] font-display px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
            {suggestion.action === "add" ? "AJOUT" : "REMPLACEMENT"}
          </span>
        </div>

        {/* Current value */}
        {isTag ? (
          <div className="flex flex-wrap gap-1">
            <span className="text-[9px] text-muted-foreground mr-1">Actuel :</span>
            {Array.isArray(suggestion.current_value) && suggestion.current_value.length > 0 ? (
              suggestion.current_value.map((tag: string) => (
                <span key={tag} className="inline-flex px-2 py-0.5 rounded-full bg-secondary text-[9px] font-display font-semibold text-muted-foreground">
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-[9px] text-muted-foreground italic">vide</span>
            )}
          </div>
        ) : isBool ? (
          <p className="text-[10px] text-muted-foreground">
            <span className="font-semibold">Actuel :</span>{" "}
            <span>{suggestion.current_value === true ? "Oui" : suggestion.current_value === false ? "Non" : "Non défini"}</span>
            {" → "}
          </p>
        ) : currentDisplay ? (
          <p className="text-[10px] text-muted-foreground">
            <span className="font-semibold">Actuel :</span> {currentDisplay}
          </p>
        ) : (
          <p className="text-[10px] text-muted-foreground italic">
            <span className="font-semibold">Actuel :</span> vide
          </p>
        )}

        {/* Suggested value — highlighted */}
        <div className="mt-1">
          {isTag ? (
            <div className="flex flex-wrap gap-1">
              <span className="text-[9px] text-[#D4603A] font-semibold mr-1">+</span>
              {(Array.isArray(suggestion.suggested_value) ? suggestion.suggested_value : []).map((tag: string) => (
                <span
                  key={tag}
                  className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-display font-bold border transition-all ${sugStyle}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : isBool ? (
            <span className={`inline-flex px-2 py-0.5 rounded-lg text-[11px] font-display font-bold border ${sugStyle}`}>
              {suggestion.suggested_value ? "Oui" : "Non"}
            </span>
          ) : isObject ? (
            <div className="flex flex-wrap gap-1.5">
              {formatSuggestedObject(suggestion.suggested_value).map(({ key, val }) => (
                <span
                  key={key}
                  className={`inline-flex px-2 py-0.5 rounded-lg text-[10px] font-display font-semibold border ${sugStyle}`}
                >
                  {key ? <><span className="font-bold mr-1">{key}:</span>{val}</> : val}
                </span>
              ))}
            </div>
          ) : (
            <p className={`text-[11px] font-display rounded-lg px-2 py-1 border ${sugStyle}`}>
              {String(suggestion.suggested_value).length > 200
                ? String(suggestion.suggested_value).slice(0, 200) + "..."
                : String(suggestion.suggested_value)}
            </p>
          )}
        </div>

        {/* Reason */}
        <p className="text-[9px] text-muted-foreground italic mt-1">{suggestion.reason}</p>
      </div>

      {/* Right: action buttons */}
      <div className="flex flex-col gap-1 flex-shrink-0">
        {decision === "pending" ? (
          <>
            <button
              onClick={onAccept}
              className="p-1.5 rounded-lg bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-all"
              title="Valider"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onReject}
              className="p-1.5 rounded-lg bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 transition-all"
              title="Rejeter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <button
            onClick={onReset}
            className="p-1.5 rounded-lg bg-secondary text-muted-foreground border border-border hover:bg-secondary/80 transition-all"
            title="Annuler la décision"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════════

function StatCard({
  label, value, icon: Icon, color, onClick,
}: {
  label: string; value: number; icon: any; color?: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`flex items-center gap-3 bg-white border border-border rounded-xl px-4 py-3 text-left transition-all ${
        onClick ? "hover:border-[#D4603A]/30 hover:bg-[#D4603A]/[0.02] cursor-pointer" : "cursor-default"
      }`}
    >
      <Icon className={`w-4 h-4 ${color || "text-muted-foreground"}`} />
      <div>
        <p className={`text-lg font-display font-bold ${color || ""}`}>{value}</p>
        <p className="text-[9px] font-display font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
    </button>
  );
}
