import { useState, useRef, lazy, Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus, ArrowLeft, Pencil, Trash2, Image as ImageIcon, Upload,
  Package, FolderOpen, Crown, Sparkles, Loader2, Clock, X, Save,
} from "lucide-react";
import type { PartnerPlan } from "./PartnerSections";

const AddProductForm = lazy(() => import("./AddProductForm"));

// ── Types ─────────────────────────────────────────────────────────────────────

interface BrandCollection {
  id: string;
  partner_id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  display_order: number;
  is_active: boolean;
}

interface CollectionProduct {
  id: string;
  collection_name: string | null;
  product_id: string;
  product: {
    id: string;
    name: string;
    image_url: string | null;
    category: string | null;
  } | null;
}

interface PendingSubmission {
  id: string;
  product_data: any;
  status: string;
  created_at: string;
}

type View = "list" | "create" | "detail";

// ── Main Component ────────────────────────────────────────────────────────────

export default function BrandCollectionManager({
  partnerId,
  plan = "brand_member",
}: {
  partnerId: string;
  plan?: PartnerPlan;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [view, setView] = useState<View>("list");
  const [selectedCollection, setSelectedCollection] = useState<BrandCollection | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingCollection, setEditingCollection] = useState<BrandCollection | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["brand-collections", partnerId] });
    queryClient.invalidateQueries({ queryKey: ["brand-collection-offers", partnerId] });
    queryClient.invalidateQueries({ queryKey: ["brand-pending-submissions", partnerId] });
  };

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: collections = [], isLoading: loadingCollections } = useQuery({
    queryKey: ["brand-collections", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_collections")
        .select("*")
        .eq("partner_id", partnerId)
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as BrandCollection[];
    },
  });

  const { data: allOffers = [] } = useQuery({
    queryKey: ["brand-collection-offers", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_offers")
        .select("id, collection_name, product_id, product:product_id(id, name, image_url, category)")
        .eq("partner_id", partnerId)
        .eq("is_active", true)
        .is("source_offer_id", null);
      if (error) throw error;
      return (data ?? []) as CollectionProduct[];
    },
  });

  const { data: pendingSubmissions = [] } = useQuery({
    queryKey: ["brand-pending-submissions", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_submissions")
        .select("id, product_data, status, created_at")
        .eq("partner_id", partnerId)
        .in("status", ["pending_review", "feedback_sent"]);
      if (error) throw error;
      return (data ?? []) as PendingSubmission[];
    },
  });

  const getProductCount = (collName: string) =>
    allOffers.filter((o) => o.collection_name === collName).length;

  const getPendingCount = (collName: string) =>
    pendingSubmissions.filter((s) => s.product_data?.collection === collName).length;

  const getCoverImage = (coll: BrandCollection) => {
    if (coll.cover_image_url) return coll.cover_image_url;
    const firstProduct = allOffers.find((o) => o.collection_name === coll.name);
    return firstProduct?.product?.image_url || null;
  };

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleRemoveFromCollection = async (offerId: string) => {
    const { error } = await supabase
      .from("product_offers")
      .update({ collection_name: null })
      .eq("id", offerId);
    if (error) {
      toast.error("Erreur lors du retrait");
      return;
    }
    toast.success("Produit retiré de la collection");
    invalidate();
  };

  const handleDeleteCollection = async (coll: BrandCollection) => {
    const { error } = await supabase
      .from("brand_collections")
      .update({ is_active: false })
      .eq("id", coll.id);
    if (error) {
      toast.error("Erreur");
      return;
    }
    // Unlink products from this collection
    await supabase
      .from("product_offers")
      .update({ collection_name: null })
      .eq("partner_id", partnerId)
      .eq("collection_name", coll.name);

    toast.success("Collection supprimée");
    setView("list");
    setSelectedCollection(null);
    invalidate();
  };

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loadingCollections) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
      </div>
    );
  }

  // ── VIEW: Create / Edit Collection ────────────────────────────────────────

  if (view === "create") {
    return (
      <CollectionForm
        partnerId={partnerId}
        existing={editingCollection}
        onClose={() => { setView("list"); setEditingCollection(null); }}
        onSaved={() => { setView("list"); setEditingCollection(null); invalidate(); }}
      />
    );
  }

  // ── VIEW: Collection Detail ───────────────────────────────────────────────

  if (view === "detail" && selectedCollection) {
    const products = allOffers.filter((o) => o.collection_name === selectedCollection.name);
    const pending = pendingSubmissions.filter((s) => s.product_data?.collection === selectedCollection.name);

    return (
      <div>
        {/* Back */}
        <button
          onClick={() => { setView("list"); setSelectedCollection(null); }}
          className="flex items-center gap-1.5 text-xs font-body text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour aux collections
        </button>

        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl mb-6">
          {selectedCollection.cover_image_url ? (
            <img src={selectedCollection.cover_image_url} alt="" className="w-full h-48 object-cover" />
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-white">{selectedCollection.name}</h2>
                {selectedCollection.description && (
                  <p className="text-xs font-body text-white/70 mt-1 max-w-md">{selectedCollection.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[10px] font-display font-semibold text-white/80 bg-white/15 px-2 py-0.5 rounded-full">
                    {products.length} produit{products.length !== 1 ? "s" : ""}
                  </span>
                  {pending.length > 0 && (
                    <span className="text-[10px] font-display font-semibold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full">
                      {pending.length} en attente
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setEditingCollection(selectedCollection); setView("create"); }}
                  className="text-[10px] font-display font-semibold text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
                >
                  <Pencil className="h-3 w-3" /> Modifier
                </button>
                <button
                  onClick={() => {
                    if (confirm("Supprimer cette collection ? Les produits seront conservés mais désassociés.")) {
                      handleDeleteCollection(selectedCollection);
                    }
                  }}
                  className="text-[10px] font-display font-semibold text-red-300 bg-red-500/20 hover:bg-red-500/30 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Add product CTA */}
        <button
          onClick={() => setShowAddProduct(true)}
          className="w-full mb-6 flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-purple-300 rounded-xl text-sm font-display font-semibold text-purple-600 hover:border-purple-500 hover:bg-purple-50/50 transition-all"
        >
          <Plus className="h-4 w-4" /> Ajouter un produit à cette collection
        </button>

        {/* Approved products grid */}
        {products.length > 0 && (
          <div className="mb-8">
            <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Produits publiés ({products.length})
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((item) => (
                <div key={item.id} className="border border-purple-100 rounded-2xl overflow-hidden group hover:shadow-lg hover:shadow-purple-100/50 transition-all bg-white">
                  <div className="aspect-square bg-gradient-to-br from-purple-50 to-violet-50 relative overflow-hidden">
                    {item.product?.image_url ? (
                      <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-purple-200" />
                      </div>
                    )}
                    <button
                      onClick={() => handleRemoveFromCollection(item.id)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 hover:bg-red-50 text-muted-foreground hover:text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                      title="Retirer de la collection"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="p-3.5">
                    <p className="text-xs font-display font-semibold text-foreground truncate">{item.product?.name || "Produit"}</p>
                    <p className="text-[10px] font-body text-muted-foreground">{item.product?.category || ""}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending submissions */}
        {pending.length > 0 && (
          <div>
            <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-amber-600 mb-3 flex items-center gap-1.5">
              <Clock className="h-3 w-3" /> En attente de validation ({pending.length})
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {pending.map((sub) => (
                <div key={sub.id} className="border border-amber-200 rounded-2xl overflow-hidden bg-amber-50/30">
                  <div className="aspect-square bg-gradient-to-br from-amber-50 to-orange-50 relative overflow-hidden">
                    {sub.product_data?.image_url ? (
                      <img src={sub.product_data.image_url} alt={sub.product_data.name} className="w-full h-full object-cover opacity-70" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-amber-200" />
                      </div>
                    )}
                    <span className="absolute top-2 left-2 text-[8px] font-display font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      En attente
                    </span>
                  </div>
                  <div className="p-3.5">
                    <p className="text-xs font-display font-semibold text-foreground truncate">{sub.product_data?.name || "Produit"}</p>
                    <p className="text-[10px] font-body text-muted-foreground">
                      Soumis le {new Date(sub.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {products.length === 0 && pending.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 flex items-center justify-center mb-4">
              <Package className="h-7 w-7 text-purple-400" />
            </div>
            <p className="text-sm font-display font-semibold text-foreground mb-1">Aucun produit dans cette collection</p>
            <p className="text-xs font-body text-muted-foreground max-w-xs mb-4">Ajoutez vos premiers produits pour les rendre visibles aux acheteurs CHR.</p>
            <button
              onClick={() => setShowAddProduct(true)}
              className="text-xs font-display font-semibold text-white rounded-full px-5 py-2.5 transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }}
            >
              <Plus className="h-3.5 w-3.5 inline mr-1" /> Ajouter un produit
            </button>
          </div>
        )}

        {/* AddProductForm modal */}
        {showAddProduct && (
          <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"><Loader2 className="h-6 w-6 animate-spin text-white" /></div>}>
            <AddProductForm
              plan={plan}
              collectionName={selectedCollection.name}
              onClose={() => setShowAddProduct(false)}
              onSuccess={() => { setShowAddProduct(false); invalidate(); toast.success("Produit soumis pour validation"); }}
            />
          </Suspense>
        )}
      </div>
    );
  }

  // ── VIEW: Collection List (default) ───────────────────────────────────────

  return (
    <div>
      {/* Premium header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-violet-600 to-purple-700 p-6 mb-6">
        <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
          <Crown className="w-full h-full text-white" />
        </div>
        <div className="relative">
          <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Mes Collections
          </h2>
          <p className="text-xs font-body text-purple-200 mt-1">
            {collections.length} collection{collections.length !== 1 ? "s" : ""} · {allOffers.filter((o) => o.collection_name).length} produit{allOffers.filter((o) => o.collection_name).length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Collection grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {collections.map((coll) => {
          const cover = getCoverImage(coll);
          const productCount = getProductCount(coll.name);
          const pendingCount = getPendingCount(coll.name);
          return (
            <button
              key={coll.id}
              onClick={() => { setSelectedCollection(coll); setView("detail"); }}
              className="text-left border border-purple-100 rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-purple-100/50 transition-all bg-white group"
            >
              <div className="h-36 relative overflow-hidden">
                {cover ? (
                  <img src={cover} alt={coll.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-100 to-violet-100 flex items-center justify-center">
                    <FolderOpen className="h-10 w-10 text-purple-300" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <span className="text-[10px] font-display font-semibold text-white bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
                    {productCount} produit{productCount !== 1 ? "s" : ""}
                  </span>
                  {pendingCount > 0 && (
                    <span className="text-[10px] font-display font-semibold text-amber-300 bg-amber-500/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
                      +{pendingCount} en attente
                    </span>
                  )}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-display text-sm font-bold text-foreground truncate">{coll.name}</h3>
                {coll.description && (
                  <p className="text-[10px] font-body text-muted-foreground mt-1 line-clamp-2">{coll.description}</p>
                )}
              </div>
            </button>
          );
        })}

        {/* Create new collection card */}
        <button
          onClick={() => { setEditingCollection(null); setView("create"); }}
          className="border-2 border-dashed border-purple-200 rounded-2xl h-full min-h-[220px] flex flex-col items-center justify-center gap-3 hover:border-purple-400 hover:bg-purple-50/30 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-violet-100 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus className="h-5 w-5 text-purple-500" />
          </div>
          <div className="text-center">
            <p className="text-xs font-display font-bold text-purple-600">Nouvelle collection</p>
            <p className="text-[10px] font-body text-muted-foreground mt-0.5">Créer et organiser vos produits</p>
          </div>
        </button>
      </div>

      {/* Empty state when no collections at all */}
      {collections.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center mt-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 flex items-center justify-center mb-5">
            <FolderOpen className="h-9 w-9 text-purple-400" />
          </div>
          <p className="text-base font-display font-bold text-foreground mb-2">Créez votre première collection</p>
          <p className="text-xs font-body text-muted-foreground max-w-sm mb-5">
            Les collections regroupent vos produits par gamme, saison ou style. Elles sont visibles par les acheteurs CHR sur votre page marque.
          </p>
          <button
            onClick={() => { setEditingCollection(null); setView("create"); }}
            className="text-sm font-display font-semibold text-white rounded-full px-6 py-3 transition-opacity hover:opacity-90 flex items-center gap-2"
            style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }}
          >
            <Plus className="h-4 w-4" /> Créer une collection
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Collection Create / Edit Form ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function CollectionForm({
  partnerId,
  existing,
  onClose,
  onSaved,
}: {
  partnerId: string;
  existing: BrandCollection | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [coverUrl, setCoverUrl] = useState(existing?.cover_image_url ?? "");
  const [coverPreview, setCoverPreview] = useState(existing?.cover_image_url ?? "");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = () => setCoverPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Le nom de la collection est obligatoire");
      return;
    }
    setSaving(true);
    try {
      let finalCoverUrl = coverUrl;

      // Upload cover image
      if (coverFile && user) {
        const ext = coverFile.name.split(".").pop() || "jpg";
        const path = `collections/${partnerId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("partner-assets")
          .upload(path, coverFile, { contentType: coverFile.type });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("partner-assets").getPublicUrl(path);
          finalCoverUrl = urlData.publicUrl;
        }
      }

      if (existing) {
        // If name changed, also update product_offers
        if (existing.name !== name.trim()) {
          await supabase
            .from("product_offers")
            .update({ collection_name: name.trim() })
            .eq("partner_id", partnerId)
            .eq("collection_name", existing.name);
        }
        const { error } = await supabase
          .from("brand_collections")
          .update({
            name: name.trim(),
            description: description.trim() || null,
            cover_image_url: finalCoverUrl || null,
          })
          .eq("id", existing.id);
        if (error) throw error;
        toast.success("Collection mise à jour");
      } else {
        const maxOrder = await supabase
          .from("brand_collections")
          .select("display_order")
          .eq("partner_id", partnerId)
          .order("display_order", { ascending: false })
          .limit(1)
          .maybeSingle();
        const nextOrder = (maxOrder.data?.display_order ?? 0) + 1;

        const { error } = await supabase
          .from("brand_collections")
          .insert({
            partner_id: partnerId,
            name: name.trim(),
            description: description.trim() || null,
            cover_image_url: finalCoverUrl || null,
            display_order: nextOrder,
          });
        if (error) {
          if (error.code === "23505") {
            toast.error("Une collection avec ce nom existe déjà");
            return;
          }
          throw error;
        }
        toast.success("Collection créée");
      }
      onSaved();
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur : " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <button
        onClick={onClose}
        className="flex items-center gap-1.5 text-xs font-body text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Retour aux collections
      </button>

      <div className="max-w-xl mx-auto">
        <h2 className="font-display text-lg font-bold text-foreground mb-6 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          {existing ? "Modifier la collection" : "Nouvelle collection"}
        </h2>

        <div className="space-y-5">
          {/* Cover image */}
          <div>
            <label className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
              Image de couverture
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className="relative w-full h-44 rounded-xl border-2 border-dashed border-purple-200 hover:border-purple-400 transition-colors cursor-pointer overflow-hidden group"
            >
              {coverPreview ? (
                <>
                  <img src={coverPreview} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload className="h-6 w-6 text-white" />
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-purple-50 to-violet-50">
                  <Upload className="h-6 w-6 text-purple-300" />
                  <p className="text-[10px] font-body text-muted-foreground">Cliquez pour ajouter une image</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </div>

          {/* Name */}
          <div>
            <label className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Nom de la collection <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Summer 2026, Collection Coastal..."
              className="w-full bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez l'univers de cette collection, ses matériaux, son inspiration..."
              rows={3}
              className="w-full bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-all resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="text-xs font-display font-semibold text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="text-sm font-display font-semibold text-white rounded-full px-6 py-2.5 transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {existing ? "Enregistrer" : "Créer la collection"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
