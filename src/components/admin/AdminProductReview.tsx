import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminSubmissions, type ProductSubmission } from "@/hooks/useProductSubmissions";
import {
  Package, CheckCircle2, XCircle, AlertTriangle,
  Copy, ChevronDown, ChevronUp, RefreshCw, Loader2,
  MessageSquare, Sparkles, EyeOff, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { DBProduct } from "@/lib/products";
import {
  computeProductQuality,
  QualityScoreRing,
  QualityReportPanel,
  FeedbackForm,
  StatusBadge,
  SimilarityBadge,
  ProductDetailCard,
} from "./ProductReviewHelpers";

// ── Filter tabs ──

type FilterTab = "all" | "pending_review" | "duplicates" | "approved" | "rejected";
const TABS: FilterTab[] = ["all", "pending_review", "duplicates", "approved", "rejected"];

// ── Main component ──

export default function AdminProductReview() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState<Record<string, string>>({});
  const [showFeedbackForm, setShowFeedbackForm] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [confirmBulkAction, setConfirmBulkAction] = useState<"delete" | "offline" | null>(null);

  const {
    submissions,
    isLoading,
    approveAsNew,
    approveEdit,
    approveAsMerge,
    reject,
    regenerateMerge,
  } = useAdminSubmissions();

  const filtered = submissions.filter((s) => {
    if (filterTab === "all") return true;
    if (filterTab === "duplicates") return s.detected_duplicate_id != null;
    return s.status === filterTab;
  });

  const pendingCount = submissions.filter((s) => s.status === "pending_review").length;

  // Product management actions (offline / delete)
  const handleSetOffline = async (productId: string, productName: string) => {
    try {
      const { error } = await supabase.from("products").update({ publish_status: "draft" }).eq("id", productId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-product-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["partner-products"] });
      toast.success(`"${productName}" mis hors ligne`);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la mise hors ligne");
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    try {
      // Delete offers first (FK constraint)
      await supabase.from("product_offers").delete().eq("product_id", productId);
      const { error } = await supabase.from("products").delete().eq("id", productId);
      if (error) throw error;
      // Also clean up related submissions
      await supabase.from("product_submissions").delete().eq("target_product_id", productId);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-product-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["partner-products"] });
      setConfirmDeleteId(null);
      toast.success(`"${productName}" supprimé définitivement`);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression");
    }
  };

  // Bulk selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(s => s.id)));
    }
  };
  const selectedSubmissions = filtered.filter(s => selectedIds.has(s.id));
  const selectedProductIds = [...new Set(
    selectedSubmissions.map(s => (s as any).target_product_id).filter(Boolean) as string[]
  )];

  const handleBulkApprove = async () => {
    setBulkLoading(true);
    let ok = 0, fail = 0;
    for (const s of selectedSubmissions) {
      if (s.status !== "pending_review") continue;
      try {
        if ((s as any).submission_type === "edit" && (s as any).target_product_id) {
          await approveEdit(s.id);
        } else {
          await approveAsNew(s.id);
        }
        ok++;
      } catch { fail++; }
    }
    setSelectedIds(new Set());
    setBulkLoading(false);
    toast.success(`${ok} approuvé${ok > 1 ? "s" : ""}${fail ? `, ${fail} échoué${fail > 1 ? "s" : ""}` : ""}`);
  };

  const handleBulkReject = async () => {
    setBulkLoading(true);
    let ok = 0;
    for (const s of selectedSubmissions) {
      if (s.status !== "pending_review") continue;
      try { await reject(s.id, "Rejet groupé"); ok++; } catch { /* skip */ }
    }
    setSelectedIds(new Set());
    setBulkLoading(false);
    toast.success(`${ok} rejeté${ok > 1 ? "s" : ""}`);
  };

  const handleBulkOffline = async () => {
    setBulkLoading(true);
    for (const pid of selectedProductIds) {
      await supabase.from("products").update({ publish_status: "draft" }).eq("id", pid);
    }
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["admin-product-submissions"] });
    queryClient.invalidateQueries({ queryKey: ["partner-products"] });
    setSelectedIds(new Set());
    setConfirmBulkAction(null);
    setBulkLoading(false);
    toast.success(`${selectedProductIds.length} produit${selectedProductIds.length > 1 ? "s" : ""} mis hors ligne`);
  };

  const handleBulkDelete = async () => {
    setBulkLoading(true);
    for (const pid of selectedProductIds) {
      await supabase.from("product_offers").delete().eq("product_id", pid);
      await supabase.from("product_submissions").delete().eq("target_product_id", pid);
      await supabase.from("products").delete().eq("id", pid);
    }
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["admin-product-submissions"] });
    queryClient.invalidateQueries({ queryKey: ["partner-products"] });
    setSelectedIds(new Set());
    setConfirmBulkAction(null);
    setBulkLoading(false);
    toast.success(`${selectedProductIds.length} produit${selectedProductIds.length > 1 ? "s" : ""} supprimé${selectedProductIds.length > 1 ? "s" : ""}`);
  };

  const handleAction = async (action: () => Promise<void>, label: string) => {
    try {
      await action();
      toast.success(`${label} effectué`);
    } catch (err: unknown) {
      toast.error(`${label} échoué : ${err instanceof Error ? err.message : "Erreur inconnue"}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getProductData = (s: ProductSubmission) => s.product_data as Record<string, any>;

  const tabLabels: Record<FilterTab, string> = {
    all: "Tous",
    pending_review: "En attente",
    duplicates: "Doublons",
    approved: "Approuvés",
    rejected: "Rejetés",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            <Package className="h-5 w-5" />
            Soumissions produits
          </h2>
          {pendingCount > 0 && (
            <p className="text-xs font-body text-amber-600 mt-0.5 font-medium">
              {pendingCount} soumission{pendingCount > 1 ? "s" : ""} en attente de validation
            </p>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => {
          const count = tab === "all"
            ? submissions.length
            : tab === "duplicates"
            ? submissions.filter((s) => s.detected_duplicate_id != null).length
            : submissions.filter((s) => s.status === tab).length;

          return (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-4 py-2.5 text-xs font-display font-semibold border-b-2 -mb-px transition-colors ${
                filterTab === tab
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tabLabels[tab]}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] ${
                filterTab === tab ? "bg-foreground text-primary-foreground" : "bg-foreground/10 text-muted-foreground"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 px-4 py-3 bg-foreground text-primary-foreground rounded-xl shadow-lg">
          <input type="checkbox" checked={selectedIds.size === filtered.length} onChange={toggleSelectAll} className="rounded" />
          <span className="text-xs font-display font-bold">
            {selectedIds.size} sélectionné{selectedIds.size > 1 ? "s" : ""}
          </span>
          <div className="h-4 w-px bg-primary-foreground/30" />

          {selectedSubmissions.some(s => s.status === "pending_review") && (
            <>
              <button onClick={handleBulkApprove} disabled={bulkLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-display font-bold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 transition-colors">
                <CheckCircle2 className="h-3 w-3" /> Approuver tout
              </button>
              <button onClick={handleBulkReject} disabled={bulkLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-display font-bold rounded-lg bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 transition-colors">
                <XCircle className="h-3 w-3" /> Rejeter tout
              </button>
            </>
          )}

          {selectedProductIds.length > 0 && (
            <>
              {confirmBulkAction === "offline" ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20">
                  <span className="text-[10px] font-bold">Mettre {selectedProductIds.length} produit{selectedProductIds.length > 1 ? "s" : ""} hors ligne ?</span>
                  <button onClick={handleBulkOffline} disabled={bulkLoading} className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded">Oui</button>
                  <button onClick={() => setConfirmBulkAction(null)} className="text-[10px] font-bold hover:underline">Non</button>
                </div>
              ) : confirmBulkAction === "delete" ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/20">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="text-[10px] font-bold">Supprimer {selectedProductIds.length} produit{selectedProductIds.length > 1 ? "s" : ""} définitivement ?</span>
                  <button onClick={handleBulkDelete} disabled={bulkLoading} className="text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded">Oui</button>
                  <button onClick={() => setConfirmBulkAction(null)} className="text-[10px] font-bold hover:underline">Non</button>
                </div>
              ) : (
                <>
                  <button onClick={() => setConfirmBulkAction("offline")} disabled={bulkLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-display font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 transition-colors">
                    <EyeOff className="h-3 w-3" /> Hors ligne
                  </button>
                  <button onClick={() => setConfirmBulkAction("delete")} disabled={bulkLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-display font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-colors">
                    <Trash2 className="h-3 w-3" /> Supprimer
                  </button>
                </>
              )}
            </>
          )}

          <button onClick={() => { setSelectedIds(new Set()); setConfirmBulkAction(null); }}
            className="ml-auto text-[10px] font-display font-semibold hover:underline opacity-70 hover:opacity-100">
            Désélectionner
          </button>

          {bulkLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="w-14 h-14 mx-auto rounded-full bg-foreground/5 flex items-center justify-center mb-3">
            <Package className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-body text-muted-foreground">Aucune soumission trouvée</p>
        </div>
      )}

      {/* Submission list */}
      <div className="space-y-4">
        {filtered.map((s) => {
          const pd = getProductData(s);
          const isExpanded = expandedId === s.id;
          const qualityReport = computeProductQuality(pd as Partial<DBProduct>);
          const partnerName = (s as any).partner?.name ?? "Partenaire inconnu";
          const submittedDate = s.created_at ? new Date(s.created_at).toLocaleDateString("fr-FR", {
            day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
          }) : "—";

          return (
            <div key={s.id} className={`border rounded-2xl overflow-hidden transition-all ${
              isExpanded ? "border-foreground/20 shadow-lg" : "border-border bg-card hover:border-foreground/10"
            }`}>
              {/* Card header — summary row */}
              <div className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors">
                {/* Selection checkbox */}
                <input
                  type="checkbox"
                  checked={selectedIds.has(s.id)}
                  onChange={(e) => { e.stopPropagation(); toggleSelect(s.id); }}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded border-border shrink-0"
                />
              <button
                onClick={() => setExpandedId(isExpanded ? null : s.id)}
                className="flex-1 flex items-center gap-4 text-left"
              >
                {/* Product thumbnail */}
                {pd.image_url ? (
                  <img src={pd.image_url} alt="" className="w-14 h-14 rounded-xl object-cover border border-border shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0">
                    <Package className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                )}

                {/* Product name + meta */}
                <div className="flex-1 min-w-0">
                  <p className="font-display text-sm font-bold text-foreground truncate">
                    {pd.name ?? "Produit sans nom"}
                  </p>
                  <p className="text-[11px] font-body text-muted-foreground mt-0.5">
                    {pd.category && <span className="text-foreground/60">{pd.category}</span>}
                    {pd.category && " · "}
                    Par <span className="font-medium">{partnerName}</span> · {submittedDate}
                  </p>
                </div>

                {/* Right side: quality score + badges */}
                <div className="flex items-center gap-3 shrink-0">
                  <QualityScoreRing score={qualityReport.score} size="sm" />
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={s.status} />
                    {(s as any).submission_type === "edit" && (
                      <span className="text-[9px] font-display font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                        Modification
                      </span>
                    )}
                    {s.similarity_score != null && s.similarity_score > 0 && (
                      <SimilarityBadge score={s.similarity_score} />
                    )}
                  </div>
                  <div className="ml-1">
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              </button>
              </div>

              {/* Expanded detail panel */}
              {isExpanded && (
                <div className="border-t border-border bg-background">
                  {/* Product detail section */}
                  <div className="px-6 py-6 space-y-6">
                    {/* Two-column for duplicates, single for new */}
                    <div className={`grid gap-8 ${s.detected_duplicate_id ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
                      <ProductDetailCard pd={pd} title="Produit soumis" />

                      {s.detected_duplicate_id && (
                        <div className="space-y-5">
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider">
                              Produit existant (doublon détecté)
                            </p>
                            <SimilarityBadge score={s.similarity_score!} />
                          </div>

                          <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-4">
                            <div className="flex items-start gap-2 text-amber-700">
                              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs font-display font-semibold">Doublon potentiel détecté</p>
                                <p className="text-[11px] font-body mt-0.5">
                                  Ce produit a un score de similarité de {Math.round(s.similarity_score!)}% avec un produit existant.
                                  Vous pouvez l'approuver comme nouveau produit ou le fusionner.
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Merged description preview */}
                          {s.merged_description && (
                            <div className="border border-blue-200 bg-blue-50/30 rounded-xl p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                                <p className="text-[10px] font-display font-semibold text-blue-700 uppercase tracking-wider">
                                  Description fusionnée (IA)
                                </p>
                              </div>
                              <p className="text-sm font-body text-foreground whitespace-pre-wrap leading-relaxed">
                                {s.merged_description}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quality analysis */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="h-4 w-4 text-foreground" />
                        <p className="text-xs font-display font-bold text-foreground uppercase tracking-wider">Analyse qualité</p>
                      </div>
                      <QualityReportPanel report={qualityReport} />
                    </div>

                    {/* Feedback form */}
                    {showFeedbackForm === s.id ? (
                      <FeedbackForm
                        submissionId={s.id}
                        partnerId={s.partner_id}
                        onSent={() => {
                          setShowFeedbackForm(null);
                          queryClient.invalidateQueries({ queryKey: ["admin-product-submissions"] });
                          queryClient.invalidateQueries({ queryKey: ["partner-pending-submissions"] });
                          queryClient.invalidateQueries({ queryKey: ["partner-submissions-feedback"] });
                        }}
                      />
                    ) : (
                      <button
                        onClick={() => setShowFeedbackForm(s.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-display font-semibold rounded-lg border border-border text-foreground hover:bg-foreground/5 transition-colors"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Envoyer un retour au partenaire
                      </button>
                    )}

                    {/* Rejection notes input */}
                    {s.status === "pending_review" && (
                      <div>
                        <label className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                          Notes de rejet (requis pour rejeter)
                        </label>
                        <textarea
                          value={rejectionNotes[s.id] ?? ""}
                          onChange={(e) => setRejectionNotes((prev) => ({ ...prev, [s.id]: e.target.value }))}
                          rows={2}
                          className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm font-body focus:outline-none focus:border-foreground/40 resize-none"
                          placeholder="Motif de rejet..."
                        />
                      </div>
                    )}

                    {/* Actions */}
                    {s.status === "pending_review" && (
                      <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border">
                        {(s as any).submission_type === "edit" && (s as any).target_product_id ? (
                          <button
                            disabled={actionLoading === s.id}
                            onClick={() => {
                              setActionLoading(s.id);
                              handleAction(() => approveEdit(s.id), "Approbation modification");
                            }}
                            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-display font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Approuver la modification
                          </button>
                        ) : (
                          <button
                            disabled={actionLoading === s.id}
                            onClick={() => {
                              setActionLoading(s.id);
                              handleAction(() => approveAsNew(s.id), "Approbation");
                            }}
                            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-display font-bold rounded-xl bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Approuver comme nouveau produit
                          </button>
                        )}

                        {s.detected_duplicate_id && (
                          <>
                            <button
                              disabled={actionLoading === s.id}
                              onClick={() => {
                                setActionLoading(s.id);
                                handleAction(() => approveAsMerge(s.id), "Fusion");
                              }}
                              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-display font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                            >
                              <Copy className="h-4 w-4" />
                              Fusionner avec l'existant
                            </button>

                            <button
                              disabled={actionLoading === s.id}
                              onClick={() => {
                                setActionLoading(s.id);
                                handleAction(() => regenerateMerge(s.id), "Régénération");
                              }}
                              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-display font-semibold rounded-xl border border-border text-foreground hover:bg-foreground/5 disabled:opacity-50 transition-colors"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              Régénérer la fusion IA
                            </button>
                          </>
                        )}

                        <button
                          disabled={actionLoading === s.id || !(rejectionNotes[s.id]?.trim())}
                          onClick={() => {
                            setActionLoading(s.id);
                            handleAction(() => reject(s.id, rejectionNotes[s.id] ?? ""), "Rejet");
                          }}
                          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-display font-bold rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
                        >
                          <XCircle className="h-4 w-4" />
                          Rejeter
                        </button>

                        {actionLoading === s.id && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                      </div>
                    )}

                    {/* Product management: offline / delete (for edits with target or approved submissions) */}
                    {(() => {
                      const targetId = (s as any).target_product_id;
                      const productName = (s.product_data as any)?.name || "ce produit";
                      if (!targetId) return null;
                      return (
                        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-dashed border-border mt-3">
                          <span className="text-[9px] font-display font-semibold text-muted-foreground uppercase tracking-wider mr-2">
                            Gérer le produit
                          </span>
                          <button
                            onClick={() => handleSetOffline(targetId, productName)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-display font-semibold rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                          >
                            <EyeOff className="h-3 w-3" /> Mettre hors ligne
                          </button>
                          {confirmDeleteId === s.id ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200">
                              <AlertTriangle className="h-3 w-3 text-red-600" />
                              <span className="text-[10px] font-display font-semibold text-red-700">Confirmer la suppression ?</span>
                              <button
                                onClick={() => handleDeleteProduct(targetId, productName)}
                                className="text-[10px] font-display font-bold text-white bg-red-600 hover:bg-red-700 px-2.5 py-1 rounded-md transition-colors"
                              >
                                Oui, supprimer
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-[10px] font-display font-semibold text-red-600 hover:text-red-800 transition-colors"
                              >
                                Annuler
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(s.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-display font-semibold rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            >
                              <Trash2 className="h-3 w-3" /> Supprimer définitivement
                            </button>
                          )}
                        </div>
                      );
                    })()}
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
