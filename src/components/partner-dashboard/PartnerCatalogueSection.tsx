import { useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Package, Search, Plus, Clock, AlertTriangle, FileSpreadsheet,
  ImagePlus, Zap, Lock, Send, Pencil, Trash2, Info, MessageSquare,
} from "lucide-react";
import { type PartnerPlan, PLAN_CONFIG, CommissionReminder, UpgradeCTA } from "./PartnerSections";

const AddProductForm = lazy(() => import("./AddProductForm"));
const ExcelImportModal = lazy(() => import("./ExcelImportModal"));
const PhotoGalleryManager = lazy(() => import("./PhotoGalleryManager"));
const ProductPhotoLinker = lazy(() => import("./ProductPhotoLinker"));
const ApiConnectionPanel = lazy(() => import("./ApiConnectionPanel"));

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProductRowData {
  offerId: string;
  productId: string;
  name: string;
  image?: string;
  category?: string;
  price: number;
  commissionRate: number;
  views: number;
  quotes: number;
  stock: string;
  // Full product data for edit
  productData?: Record<string, any>;
  offerData?: Record<string, any> | null;
  publishStatus?: string;
}

// ── Product Row with Commission ──────────────────────────────────────────────

function ProductRow({
  product, onEdit, onPhotos, hasPendingEdit,
}: {
  product: ProductRowData;
  onEdit: (p: ProductRowData) => void;
  onPhotos: (p: ProductRowData) => void;
  hasPendingEdit?: boolean;
}) {
  const { name, image, price, commissionRate, stock } = product;
  const commissionAmount = price * (commissionRate / 100);
  const clientPrice = price + commissionAmount;

  return (
    <div className="flex items-center gap-4 px-4 py-3 border border-border rounded-sm hover:border-foreground/20 transition-colors">
      <div className="w-12 h-12 rounded-sm overflow-hidden border border-border shrink-0 bg-muted">
        {image ? (
          <img loading="lazy" src={image} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-5 w-5 text-muted-foreground/30" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-display font-semibold text-foreground truncate">
          {name}
          {product.publishStatus === "published" && (
            <span className="ml-1.5 text-[8px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">En ligne</span>
          )}
          {(!product.publishStatus || product.publishStatus === "draft") && (
            <span className="ml-1.5 text-[8px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Draft</span>
          )}
          {hasPendingEdit && (
            <span className="ml-1.5 text-[8px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Modification en attente</span>
          )}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[10px] font-body text-foreground font-medium">€{price.toFixed(0)} HT</p>
          <span className="text-[9px] font-body text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
            +{commissionRate}% comm. ≈ €{commissionAmount.toFixed(0)}
          </span>
          <span className="text-[9px] font-body text-muted-foreground">
            → Client : €{clientPrice.toFixed(0)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-4 text-[10px] font-body text-muted-foreground">
          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-display font-semibold ${
            stock === "En stock" ? "bg-green-50 text-green-700" :
            stock === "Rupture" ? "bg-red-50 text-red-700" :
            "bg-amber-50 text-amber-700"
          }`}>
            {stock}
          </span>
        </div>
        <button
          onClick={() => onPhotos(product)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[9px] font-display font-semibold border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"
          title="Associer des photos"
        >
          <ImagePlus className="h-3 w-3" /> Photos
        </button>
        <button
          onClick={() => onEdit(product)}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-[9px] font-display font-semibold border rounded-lg transition-colors ${
            hasPendingEdit
              ? "border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
              : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
          }`}
          title={hasPendingEdit ? "Remplacer la modification en attente" : "Modifier ce produit"}
        >
          <Pencil className="h-3 w-3" /> {hasPendingEdit ? "Re-modifier" : "Modifier"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── PARTNER CATALOGUE SECTION ───────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function PartnerCatalogueSection({ plan, partnerId, profileCompleted = true }: { plan: PartnerPlan; partnerId?: string | null; profileCompleted?: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const config = PLAN_CONFIG[plan];
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [showApiPanel, setShowApiPanel] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRowData | null>(null);
  const [editingSubmission, setEditingSubmission] = useState<{ id: string; productData: Record<string, any>; targetProductId?: string } | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [linkingPhotos, setLinkingPhotos] = useState<ProductRowData | null>(null);
  const [catalogueTab, setCatalogueTab] = useState<"published" | "pending" | "drafts">("published");

  // Read subscription overrides for this partner
  const { data: subOverrides } = useQuery({
    queryKey: ["partner-sub-overrides", partnerId],
    queryFn: async () => {
      const { data } = await supabase.from("partner_subscriptions")
        .select("max_products, commission_rate")
        .eq("partner_id", partnerId!)
        .maybeSingle();
      return data;
    },
    enabled: !!partnerId,
  });
  const effectiveMaxProducts = subOverrides?.max_products ?? config.maxProducts;

  // Products directly owned by this partner
  const { data: dbProducts = [] } = useQuery<ProductRowData[]>({
    queryKey: ["partner-products", partnerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("partner_id", partnerId!)
        .order("name");
      if (!data) return [];
      return data.map((prod: any) => {
        // Fallback: use first gallery image if image_url is empty
        const galleryUrls = prod.gallery_urls ?? [];
        const fallbackImage = galleryUrls.find((u: string) => u && (u.startsWith("http") || u.startsWith("data:image")));
        return {
        offerId: prod.id,
        productId: prod.id,
        name: prod.name ?? "Unknown",
        image: prod.image_url || fallbackImage || undefined,
        category: prod.category ?? undefined,
        price: prod.price_min ?? 0,
        commissionRate: config.commission,
        views: 0,
        quotes: 0,
        stock: ({ available: "En stock", in_stock: "En stock", low_stock: "Stock faible", out_of_stock: "Rupture", on_order: "En commande", production: "En production" } as Record<string, string>)[prod.stock_status ?? ""] ?? prod.stock_status ?? "—",
        productData: prod,
        offerData: null,
        publishStatus: prod.publish_status ?? "draft",
      } as ProductRowData;
      });
    },
    enabled: !!partnerId,
  });

  // Pending product submissions for this partner (sent to admin)
  const { data: pendingSubmissions = [] } = useQuery({
    queryKey: ["partner-pending-submissions", partnerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_submissions")
        .select("id, product_data, status, created_at, admin_feedback, similarity_score, target_product_id, submission_type")
        .eq("partner_id", partnerId!)
        .in("status", ["pending_review", "feedback_sent"])
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!partnerId,
  });

  // Draft submissions (not yet submitted to admin)
  const { data: draftSubmissions = [] } = useQuery({
    queryKey: ["partner-draft-submissions", partnerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_submissions")
        .select("id, product_data, status, created_at, submission_type, target_product_id")
        .eq("partner_id", partnerId!)
        .eq("status", "draft")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!partnerId,
  });

  const allProducts = dbProducts;
  const publishedProducts = allProducts.filter(p => p.publishStatus === "published");

  // Track which products have a pending edit submission
  const pendingEditProductIds = new Set(
    [...pendingSubmissions, ...draftSubmissions]
      .filter((s: any) => s.submission_type === "edit" && s.target_product_id)
      .map((s: any) => s.target_product_id as string)
  );
  const publishedCount = publishedProducts.length;
  const pendingCount = pendingSubmissions.length;
  const draftsCount = draftSubmissions.length;

  const products = searchTerm
    ? publishedProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : publishedProducts;

  const productsCount = allProducts.length;
  const maxProducts = effectiveMaxProducts;
  const usagePercent = maxProducts ? Math.round((productsCount / maxProducts) * 100) : 0;

  const handleAddProduct = () => {
    if (!profileCompleted) {
      toast.error(t('pd.catalogue.profileRequired', 'Complétez votre fiche partenaire pour ajouter des produits'));
      return;
    }
    if (maxProducts && productsCount >= maxProducts) {
      toast.error(t('pd.catalogue.limitReached', `Limite atteinte : ${productsCount}/${maxProducts} produits. Passez au plan supérieur pour ajouter plus de produits.`));
      return;
    }
    setShowAddForm(true);
  };

  return (
    <div className="space-y-5">
      {/* Commission reminder */}
      <CommissionReminder plan={plan} onUpgrade={() => navigate("/become-partner")} />

      {/* Header with product count */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display font-bold text-sm text-foreground">{t('pd.catalogue.title')}</p>
          <p className="text-[10px] font-body text-muted-foreground mt-0.5">
            {productsCount}{maxProducts ? `/${maxProducts}` : ""} produits référencés
            {maxProducts && (
              <> — <span className={usagePercent > 80 ? "text-amber-600 font-semibold" : ""}>{usagePercent}% utilisé</span></>
            )}
          </p>
        </div>
        <button
          onClick={handleAddProduct}
          className="flex items-center gap-2 px-4 py-2 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
        >
          <Plus className="h-3 w-3" /> {t('pd.catalogue.add')}
        </button>
      </div>

      {/* Product limit bar */}
      {maxProducts && (
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${usagePercent}%`,
              background: usagePercent > 80 ? "#D97706" : config.color,
            }}
          />
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-border mb-4">
        <button
          onClick={() => setCatalogueTab("published")}
          className={`px-4 py-2.5 text-xs font-display font-semibold border-b-2 transition-colors ${
            catalogueTab === "published"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          En ligne
          <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{publishedCount}</span>
        </button>
        <button
          onClick={() => setCatalogueTab("pending")}
          className={`px-4 py-2.5 text-xs font-display font-semibold border-b-2 transition-colors ${
            catalogueTab === "pending"
              ? "border-amber-600 text-amber-700"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          En attente
          {pendingCount > 0 && <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">{pendingCount}</span>}
        </button>
        <button
          onClick={() => setCatalogueTab("drafts")}
          className={`px-4 py-2.5 text-xs font-display font-semibold border-b-2 transition-colors ${
            catalogueTab === "drafts"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Brouillons
          {draftsCount > 0 && <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">{draftsCount}</span>}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder={t('pd.catalogue.search')}
          className="w-full bg-card border border-border rounded-sm pl-9 pr-3 py-2.5 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
        />
      </div>

      {/* Commission info box */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-sm border" style={{ background: config.bg, borderColor: config.border }}>
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: config.color }} />
        <div className="text-[10px] font-body leading-relaxed" style={{ color: config.color }}>
          <strong>Commission {config.label} : {config.commission}%</strong>
          <br />
          Les prix ci-dessous sont vos prix HT. La commission Terrassea de {config.commission}% est ajoutée au prix présenté au client.
        </div>
      </div>

      {/* ── "En ligne" tab ── */}
      {catalogueTab === "published" && (
        <>
          {products.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl px-4 py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Package className="h-6 w-6 text-muted-foreground/40" />
              </div>
              {searchTerm ? (
                <>
                  <p className="text-xs font-display font-semibold text-foreground mb-1">
                    {t('pd.catalogue.noSearch', 'Aucun produit ne correspond à votre recherche')}
                  </p>
                  <button
                    onClick={() => setSearchTerm("")}
                    className="text-[10px] font-display font-semibold text-foreground underline mt-2"
                  >
                    {t('pd.catalogue.clearSearch', 'Effacer la recherche')}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs font-display font-semibold text-foreground mb-1">
                    {t('pd.catalogue.noPublished', 'Aucun produit en ligne')}
                  </p>
                  <p className="text-[10px] font-body text-muted-foreground mb-4 max-w-xs mx-auto">
                    {t('pd.catalogue.noPublishedHint', 'Importez votre catalogue via Excel ou ajoutez vos produits manuellement pour commencer à recevoir des demandes de devis.')}
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {products.map((p) => (
                <ProductRow
                  key={p.offerId}
                  product={p}
                  onEdit={setEditingProduct}
                  onPhotos={setLinkingPhotos}
                  hasPendingEdit={pendingEditProductIds.has(p.productId)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── "En attente" tab ── */}
      {catalogueTab === "pending" && (
        <>
          <div className="flex items-start gap-3 px-4 py-3 rounded-sm border border-amber-200 bg-amber-50/50">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" />
            <p className="text-[10px] font-body leading-relaxed text-amber-700">
              Ces produits ont été soumis pour validation. L'équipe Terrassea les examinera prochainement.
            </p>
          </div>
          {pendingSubmissions.length === 0 ? (
            <div className="border border-border rounded-sm px-4 py-8 text-center">
              <Clock className="h-6 w-6 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-xs font-body text-muted-foreground">Aucun produit en attente de validation</p>
              {draftsCount > 0 && (
                <button onClick={() => setCatalogueTab("drafts")} className="text-[10px] font-display font-semibold text-blue-600 underline mt-2">
                  Voir vos {draftsCount} brouillon{draftsCount > 1 ? "s" : ""}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                En attente de validation ({pendingSubmissions.length})
              </p>
              {pendingSubmissions.map((sub: any) => {
                const pd = sub.product_data as Record<string, any> || {};
                const isFeedback = sub.status === "feedback_sent";
                const statusLabel = isFeedback ? "Retour admin" : sub.submission_type === "edit" ? "Modification en attente" : "En attente de validation";
                const statusColor = isFeedback ? "text-blue-700 bg-blue-50 border-blue-200" : "text-amber-700 bg-amber-50 border-amber-200";
                const thumbUrl = pd.image_url || (Array.isArray(pd.gallery_urls) && pd.gallery_urls.length > 0 ? pd.gallery_urls[0] : null);
                const stockLabel = ({ available: "En stock", in_stock: "En stock", low_stock: "Stock faible", out_of_stock: "Rupture", on_order: "En commande", production: "En production" } as Record<string, string>)[pd.stock_status ?? ""] ?? pd.stock_status ?? null;
                return (
                  <div key={sub.id} className="border border-border rounded-xl bg-card hover:border-foreground/20 transition-colors">
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                      onClick={() => setEditingSubmission({ id: sub.id, productData: pd, targetProductId: sub.target_product_id || undefined })}
                    >
                      {/* Thumbnail */}
                      {thumbUrl ? (
                        <img loading="lazy" src={thumbUrl as string} alt="" className="w-12 h-12 rounded-lg object-cover bg-muted border border-border shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center border border-border shrink-0">
                          <Package className="h-5 w-5 text-muted-foreground/30" />
                        </div>
                      )}

                      {/* Product info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-display font-semibold text-foreground truncate">
                          {(pd.name as string) || "Produit sans nom"}
                        </p>
                        <p className="text-[10px] font-body text-muted-foreground mt-0.5">
                          {pd.category}{pd.subcategory ? ` → ${pd.subcategory}` : ""}
                          {pd.main_color ? <span className="ml-1.5">· {pd.main_color}</span> : null}
                          {pd.material_structure ? <span className="ml-1.5">· {pd.material_structure}</span> : null}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {pd.price_min != null && (
                            <span className="text-[11px] font-display font-bold text-foreground">
                              {pd.price_max ? `${pd.price_min}€ — ${pd.price_max}€` : `${pd.price_min}€`}
                            </span>
                          )}
                          {stockLabel && (
                            <span className={`text-[9px] font-display font-semibold px-1.5 py-0.5 rounded-full ${
                              stockLabel === "En stock" ? "bg-green-50 text-green-700" :
                              stockLabel === "Rupture" ? "bg-red-50 text-red-700" :
                              "bg-amber-50 text-amber-700"
                            }`}>
                              {stockLabel}
                            </span>
                          )}
                          <span className="text-[9px] font-body text-muted-foreground">
                            Soumis le {new Date(sub.created_at).toLocaleDateString("fr-FR")}
                          </span>
                          {sub.similarity_score && sub.similarity_score > 70 && (
                            <span className="text-[9px] text-amber-600 font-semibold">Doublon {sub.similarity_score}%</span>
                          )}
                        </div>
                      </div>

                      {/* Badge + actions */}
                      <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                        <span className={`text-[9px] font-display font-semibold px-2 py-0.5 rounded-full border ${statusColor}`}>
                          {statusLabel}
                        </span>
                        <button
                          onClick={() => setEditingSubmission({ id: sub.id, productData: pd, targetProductId: sub.target_product_id || undefined })}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
                          title="Compléter / Modifier"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm("Supprimer cette soumission ?")) return;
                            await supabase.from("product_submissions").delete().eq("id", sub.id);
                            queryClient.invalidateQueries({ queryKey: ["partner-pending-submissions"] });
                            toast.success("Soumission supprimée");
                          }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Admin feedback panel */}
                    {isFeedback && sub.admin_feedback && (
                      <div className="px-4 pb-3 pt-0">
                        <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-3 space-y-2">
                          <p className="text-[10px] font-display font-semibold text-blue-700 uppercase tracking-wider flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> Retour de l'équipe Terrassea
                          </p>
                          {(sub.admin_feedback as Record<string, any>).general_comment && (
                            <p className="text-xs font-body text-blue-800">
                              {(sub.admin_feedback as Record<string, any>).general_comment}
                            </p>
                          )}
                          {["photos", "description", "specs", "pricing"].map((key) => {
                            const section = (sub.admin_feedback as Record<string, any>)?.[key];
                            if (!section || section.status === "ok") return null;
                            return (
                              <div key={key} className="text-[10px] font-body text-blue-700">
                                <span className="font-semibold capitalize">{key === "specs" ? "Spécifications" : key === "pricing" ? "Tarification" : key === "photos" ? "Photos" : "Description"}</span>
                                {" : "}
                                <span className={section.status === "missing" ? "text-red-600" : "text-amber-600"}>
                                  {section.status === "missing" ? "Manquant" : "À améliorer"}
                                </span>
                                {section.comment && <> — {section.comment}</>}
                              </div>
                            );
                          })}
                          <button
                            onClick={() => setEditingSubmission({ id: sub.id, productData: pd, targetProductId: sub.target_product_id || undefined })}
                            className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-display font-semibold rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                          >
                            <Pencil className="h-3 w-3" /> Corriger et re-soumettre
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── "Brouillons" tab ── */}
      {catalogueTab === "drafts" && (
        <>
          <div className="flex items-start gap-3 px-4 py-3 rounded-sm border border-blue-200 bg-blue-50/50">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-blue-600" />
            <p className="text-[10px] font-body leading-relaxed text-blue-700">
              Complétez vos produits puis cliquez « Soumettre pour validation » quand ils sont prêts.
            </p>
          </div>
          {draftSubmissions.length === 0 ? (
            <div className="border border-border rounded-sm px-4 py-8 text-center">
              <Package className="h-6 w-6 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-xs font-body text-muted-foreground">Aucun brouillon</p>
              <p className="text-[10px] font-body text-muted-foreground mt-1">Importez des produits via Excel / CSV pour commencer</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Bulk submit button */}
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                  <Package className="h-3 w-3" />
                  Brouillons ({draftSubmissions.length})
                </p>
                <button
                  onClick={async () => {
                    if (!confirm(`Soumettre ${draftSubmissions.length} produit${draftSubmissions.length > 1 ? "s" : ""} pour validation ?`)) return;
                    const ids = draftSubmissions.map((s: any) => s.id);
                    const { error } = await supabase
                      .from("product_submissions")
                      .update({ status: "pending_review", updated_at: new Date().toISOString() } as any)
                      .in("id", ids);
                    if (error) { toast.error("Erreur lors de la soumission"); return; }

                    // Notify admins
                    const { data: admins } = await supabase.from("user_profiles").select("id").eq("user_type", "admin").limit(50);
                    if (admins && admins.length > 0) {
                      const partnerName = profile?.company ?? profile?.email ?? "Un partenaire";
                      await supabase.from("notifications").insert(
                        admins.map(a => ({ user_id: a.id, title: "Produits soumis", body: `${partnerName} a soumis ${ids.length} produit${ids.length > 1 ? "s" : ""} pour validation`, type: "product_submission", link: "/admin?tab=submissions" })) as any
                      );
                    }

                    queryClient.invalidateQueries({ queryKey: ["partner-draft-submissions"] });
                    queryClient.invalidateQueries({ queryKey: ["partner-pending-submissions"] });
                    toast.success(`${ids.length} produit${ids.length > 1 ? "s" : ""} soumis pour validation`);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-display font-semibold bg-amber-600 text-white rounded-full hover:bg-amber-700 transition-colors"
                >
                  <Send className="h-3 w-3" /> Tout soumettre pour validation
                </button>
              </div>

              {draftSubmissions.map((sub: any) => {
                const pd = sub.product_data as Record<string, any> || {};
                const thumbUrl = pd.image_url || (Array.isArray(pd.gallery_urls) && pd.gallery_urls.length > 0 ? pd.gallery_urls[0] : null);
                const stockLabel = ({ available: "En stock", in_stock: "En stock", low_stock: "Stock faible", out_of_stock: "Rupture", on_order: "En commande", production: "En production" } as Record<string, string>)[pd.stock_status ?? ""] ?? null;
                return (
                  <div key={sub.id} className="border border-border rounded-xl bg-card hover:border-blue-300 transition-colors">
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                      onClick={() => setEditingSubmission({ id: sub.id, productData: pd, targetProductId: sub.target_product_id || undefined })}
                    >
                      {thumbUrl ? (
                        <img loading="lazy" src={thumbUrl as string} alt="" className="w-12 h-12 rounded-lg object-cover bg-muted border border-border shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center border border-border shrink-0">
                          <Package className="h-5 w-5 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-display font-semibold text-foreground truncate">
                          {(pd.name as string) || "Produit sans nom"}
                        </p>
                        <p className="text-[10px] font-body text-muted-foreground mt-0.5">
                          {pd.category}{pd.subcategory ? ` → ${pd.subcategory}` : ""}
                          {pd.main_color ? <span className="ml-1.5">· {pd.main_color}</span> : null}
                          {pd.material_structure ? <span className="ml-1.5">· {pd.material_structure}</span> : null}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {pd.price_min != null && (
                            <span className="text-[11px] font-display font-bold text-foreground">
                              {pd.price_max ? `${pd.price_min}€ — ${pd.price_max}€` : `${pd.price_min}€`}
                            </span>
                          )}
                          {stockLabel && (
                            <span className="text-[9px] font-display font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">
                              {stockLabel}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                        <span className="text-[9px] font-display font-semibold px-2 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700">
                          Brouillon
                        </span>
                        <button
                          onClick={async () => {
                            if (!confirm(`Soumettre "${pd.name}" pour validation ?`)) return;
                            await supabase.from("product_submissions").update({ status: "pending_review", updated_at: new Date().toISOString() }).eq("id", sub.id);
                            // Notify admins
                            const { data: admins } = await supabase.from("user_profiles").select("id").eq("user_type", "admin").limit(50);
                            if (admins && admins.length > 0) {
                              const pName = profile?.company ?? "Un partenaire";
                              await supabase.from("notifications").insert(
                                admins.map(a => ({ user_id: a.id, title: "Produit soumis", body: `${pName} a soumis "${pd.name}" pour validation`, type: "product_submission", link: "/admin?tab=submissions" })) as any
                              );
                            }
                            queryClient.invalidateQueries({ queryKey: ["partner-draft-submissions"] });
                            queryClient.invalidateQueries({ queryKey: ["partner-pending-submissions"] });
                            toast.success(`"${pd.name}" soumis pour validation`);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[9px] font-display font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                          title="Soumettre pour validation"
                        >
                          <Send className="h-3 w-3" /> Soumettre
                        </button>
                        <button
                          onClick={() => setEditingSubmission({ id: sub.id, productData: pd, targetProductId: sub.target_product_id || undefined })}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
                          title="Compléter / Modifier"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm("Supprimer ce brouillon ?")) return;
                            await supabase.from("product_submissions").delete().eq("id", sub.id);
                            queryClient.invalidateQueries({ queryKey: ["partner-draft-submissions"] });
                            toast.success("Brouillon supprimé");
                          }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Import actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setShowExcelImport(true)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-display font-semibold border border-border rounded-full hover:border-foreground transition-colors"
        >
          <FileSpreadsheet className="h-3 w-3" /> Import Excel / CSV
        </button>
        <button
          onClick={() => setShowGallery(true)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-display font-semibold border border-blue-200 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
        >
          <ImagePlus className="h-3 w-3" /> Galerie photos
        </button>
        <button
          onClick={() => setShowApiPanel(true)}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-display font-semibold border border-border rounded-full hover:border-foreground transition-colors ${
            plan !== "elite" && plan !== "brand_member" && plan !== "brand_network" ? "text-muted-foreground" : ""
          }`}
        >
          <Zap className="h-3 w-3" /> Sync API temps réel
          {plan !== "elite" && plan !== "brand_member" && plan !== "brand_network" && <Lock className="h-2.5 w-2.5 ml-0.5" />}
        </button>
      </div>

      {/* Upsell */}
      {(plan === "starter" || plan === "growth") && maxProducts && productsCount >= maxProducts * 0.8 && (
        <UpgradeCTA currentPlan={plan} />
      )}

      {/* Add Product Form Modal */}
      {showAddForm && (
        <Suspense fallback={null}>
          <AddProductForm
            plan={plan}
            partnerId={partnerId ?? undefined}
            onClose={() => setShowAddForm(false)}
            onSuccess={() => {
              setShowAddForm(false);
              toast.success("Produit ajouté !");
            }}
          />
        </Suspense>
      )}

      {/* Photo Gallery Modal */}
      {showGallery && partnerId && (
        <Suspense fallback={null}>
          <PhotoGalleryManager partnerId={partnerId} onClose={() => setShowGallery(false)} />
        </Suspense>
      )}

      {/* Product Photo Linker Modal */}
      {linkingPhotos && partnerId && (
        <Suspense fallback={null}>
          <ProductPhotoLinker
            productId={linkingPhotos.productId}
            productName={linkingPhotos.name}
            currentImageUrl={linkingPhotos.productData?.image_url || null}
            currentGalleryUrls={linkingPhotos.productData?.gallery_urls || []}
            partnerId={partnerId}
            onClose={() => setLinkingPhotos(null)}
          />
        </Suspense>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <Suspense fallback={null}>
          <AddProductForm
            plan={plan}
            partnerId={partnerId ?? undefined}
            editMode
            editProductId={editingProduct.productId}
            editInitialData={editingProduct.productData}
            onClose={() => setEditingProduct(null)}
            onSuccess={() => {
              setEditingProduct(null);
              toast.success("Modification soumise pour validation par l'équipe Terrassea.");
            }}
          />
        </Suspense>
      )}

      {/* Edit Submission Modal (complete/edit a pending submission in place) */}
      {editingSubmission && (
        <Suspense fallback={null}>
          <AddProductForm
            plan={plan}
            partnerId={partnerId ?? undefined}
            editMode={!!editingSubmission.targetProductId}
            editProductId={editingSubmission.targetProductId}
            editInitialData={editingSubmission.productData}
            editSubmissionId={editingSubmission.id}
            onClose={() => setEditingSubmission(null)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["partner-pending-submissions"] });
              queryClient.invalidateQueries({ queryKey: ["partner-draft-submissions"] });
              setEditingSubmission(null);
            }}
          />
        </Suspense>
      )}

      {/* Excel Import Modal */}
      {showExcelImport && (
        <Suspense fallback={null}>
          <ExcelImportModal
            plan={plan}
            partnerId={partnerId ?? undefined}
            onClose={() => setShowExcelImport(false)}
            onSuccess={(count) => {
              setShowExcelImport(false);
              toast.success(`${count} produit${count > 1 ? "s" : ""} importé${count > 1 ? "s" : ""} avec succès !`);
            }}
          />
        </Suspense>
      )}

      {/* API Connection Panel */}
      {showApiPanel && (
        <Suspense fallback={null}>
          <ApiConnectionPanel
            plan={plan}
            partnerId={null}
            onClose={() => setShowApiPanel(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
