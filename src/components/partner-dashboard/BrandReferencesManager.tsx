import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateImageUpload } from "@/lib/validateUpload";
import {
  Plus, ArrowLeft, Pencil, Trash2, Image as ImageIcon, Upload,
  Crown, Sparkles, Loader2, X, Save, MapPin, Package, Search,
  CheckCircle2, ExternalLink,
} from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BrandReference {
  id: string;
  partner_id: string;
  title: string;
  location: string | null;
  description: string | null;
  photos: string[];
  product_ids: string[];
  display_order: number;
  is_active: boolean;
}

interface LinkedProduct {
  id: string;
  name: string;
  image_url: string | null;
}

type View = "list" | "create" | "detail";

// ── Main Component ────────────────────────────────────────────────────────────

export default function BrandReferencesManager({ partnerId }: { partnerId: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [view, setView] = useState<View>("list");
  const [selectedRef, setSelectedRef] = useState<BrandReference | null>(null);
  const [editingRef, setEditingRef] = useState<BrandReference | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["brand-references", partnerId] });
  };

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: references = [], isLoading } = useQuery({
    queryKey: ["brand-references", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_references")
        .select("*")
        .eq("partner_id", partnerId)
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return (data ?? []) as BrandReference[];
    },
  });

  // Resolve all product IDs across all references
  const allProductIds = [...new Set(references.flatMap((r) => r.product_ids || []))];
  const { data: allProducts = [] } = useQuery({
    queryKey: ["brand-ref-products", allProductIds],
    queryFn: async () => {
      if (allProductIds.length === 0) return [];
      const { data } = await supabase
        .from("products")
        .select("id, name, image_url")
        .in("id", allProductIds);
      return (data ?? []) as LinkedProduct[];
    },
    enabled: allProductIds.length > 0,
  });

  const getProducts = (ids: string[]) => allProducts.filter((p) => ids.includes(p.id));

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleDelete = async (ref: BrandReference) => {
    const { error } = await supabase
      .from("brand_references")
      .update({ is_active: false })
      .eq("id", ref.id);
    if (error) { toast.error("Erreur"); return; }
    toast.success("Référence supprimée");
    setView("list");
    setSelectedRef(null);
    invalidate();
  };

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
      </div>
    );
  }

  // ── VIEW: Create / Edit ───────────────────────────────────────────────────

  if (view === "create") {
    return (
      <ReferenceForm
        partnerId={partnerId}
        existing={editingRef}
        onClose={() => { setView("list"); setEditingRef(null); }}
        onSaved={() => { setView("list"); setEditingRef(null); invalidate(); }}
      />
    );
  }

  // ── VIEW: Detail ──────────────────────────────────────────────────────────

  if (view === "detail" && selectedRef) {
    const products = getProducts(selectedRef.product_ids || []);

    return (
      <div>
        <button onClick={() => { setView("list"); setSelectedRef(null); }} className="flex items-center gap-1.5 text-xs font-body text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> Retour aux références
        </button>

        {/* Photos */}
        {selectedRef.photos.length > 1 ? (
          <Carousel className="w-full mb-6">
            <CarouselContent>
              {selectedRef.photos.map((url, i) => (
                <CarouselItem key={i}>
                  <div className="aspect-[16/9] rounded-2xl overflow-hidden">
                    <img loading="lazy" src={url} alt={`${selectedRef.title} — ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-4" />
            <CarouselNext className="-right-4" />
          </Carousel>
        ) : selectedRef.photos.length === 1 ? (
          <div className="aspect-[16/9] rounded-2xl overflow-hidden mb-6">
            <img loading="lazy" src={selectedRef.photos[0]} alt={selectedRef.title} className="w-full h-full object-cover" />
          </div>
        ) : null}

        {/* Info */}
        <div className="mb-6">
          <h2 className="font-display text-xl font-bold text-foreground">{selectedRef.title}</h2>
          {selectedRef.location && (
            <p className="text-sm font-body text-muted-foreground flex items-center gap-1.5 mt-1">
              <MapPin className="h-3.5 w-3.5" /> {selectedRef.location}
            </p>
          )}
          {selectedRef.description && (
            <p className="text-sm font-body text-muted-foreground mt-3 leading-relaxed">{selectedRef.description}</p>
          )}
          <div className="flex items-center gap-2 mt-4">
            <button onClick={() => { setEditingRef(selectedRef); setView("create"); }} className="text-[10px] font-display font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1">
              <Pencil className="h-3 w-3" /> Modifier
            </button>
            <button onClick={() => { if (confirm("Supprimer cette référence ?")) handleDelete(selectedRef); }} className="text-[10px] font-display font-semibold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1">
              <Trash2 className="h-3 w-3" /> Supprimer
            </button>
          </div>
        </div>

        {/* Linked products */}
        {products.length > 0 && (
          <div>
            <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Produits utilisés ({products.length})
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p) => (
                <Link key={p.id} to={`/products/${p.id}`} className="border border-purple-100 rounded-2xl overflow-hidden group hover:shadow-lg hover:shadow-purple-100/50 transition-all bg-white">
                  <div className="aspect-square bg-gradient-to-br from-purple-50 to-violet-50 overflow-hidden">
                    {p.image_url ? (
                      <img loading="lazy" src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-8 w-8 text-purple-200" /></div>
                    )}
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <p className="text-xs font-display font-semibold text-foreground truncate">{p.name}</p>
                    <ExternalLink className="h-3 w-3 text-purple-400 shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── VIEW: List ────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-violet-600 to-purple-700 p-6 mb-6">
        <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
          <Crown className="w-full h-full text-white" />
        </div>
        <div className="relative">
          <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> Projets & Références
          </h2>
          <p className="text-xs font-body text-purple-200 mt-1">
            {references.length} projet{references.length !== 1 ? "s" : ""} réalisé{references.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {references.map((ref) => {
          const cover = ref.photos?.[0] || null;
          const productCount = ref.product_ids?.length || 0;
          return (
            <button
              key={ref.id}
              onClick={() => { setSelectedRef(ref); setView("detail"); }}
              className="text-left border border-purple-100 rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-purple-100/50 transition-all bg-white group"
            >
              <div className="h-40 relative overflow-hidden">
                {cover ? (
                  <img loading="lazy" src={cover} alt={ref.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-100 to-violet-100 flex items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-purple-300" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  {ref.location && (
                    <span className="text-[10px] font-display font-semibold text-white bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1">
                      <MapPin className="h-2.5 w-2.5" /> {ref.location}
                    </span>
                  )}
                  {productCount > 0 && (
                    <span className="text-[10px] font-display font-semibold text-white bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
                      {productCount} produit{productCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-display text-sm font-bold text-foreground truncate">{ref.title}</h3>
                {ref.description && (
                  <p className="text-[10px] font-body text-muted-foreground mt-1 line-clamp-2">{ref.description}</p>
                )}
              </div>
            </button>
          );
        })}

        {/* Create card */}
        <button
          onClick={() => { setEditingRef(null); setView("create"); }}
          className="border-2 border-dashed border-purple-200 rounded-2xl min-h-[220px] flex flex-col items-center justify-center gap-3 hover:border-purple-400 hover:bg-purple-50/30 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-violet-100 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus className="h-5 w-5 text-purple-500" />
          </div>
          <div className="text-center">
            <p className="text-xs font-display font-bold text-purple-600">Nouveau projet</p>
            <p className="text-[10px] font-body text-muted-foreground mt-0.5">Ajoutez une réalisation</p>
          </div>
        </button>
      </div>

      {/* Empty state */}
      {references.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center mt-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 flex items-center justify-center mb-5">
            <ImageIcon className="h-9 w-9 text-purple-400" />
          </div>
          <p className="text-base font-display font-bold text-foreground mb-2">Montrez votre savoir-faire</p>
          <p className="text-xs font-body text-muted-foreground max-w-sm mb-5">
            Ajoutez des photos de vos projets réalisés (hôtels, restaurants, terrasses...) et liez les produits utilisés pour générer des demandes.
          </p>
          <button
            onClick={() => { setEditingRef(null); setView("create"); }}
            className="text-sm font-display font-semibold text-white rounded-full px-6 py-3 transition-opacity hover:opacity-90 flex items-center gap-2"
            style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }}
          >
            <Plus className="h-4 w-4" /> Ajouter un projet
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Reference Form ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function ReferenceForm({
  partnerId,
  existing,
  onClose,
  onSaved,
}: {
  partnerId: string;
  existing: BrandReference | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(existing?.title ?? "");
  const [location, setLocation] = useState(existing?.location ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [photos, setPhotos] = useState<string[]>(existing?.photos ?? []);
  const [productIds, setProductIds] = useState<string[]>(existing?.product_ids ?? []);
  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  // Partner's products for selector
  const { data: partnerProducts = [] } = useQuery({
    queryKey: ["brand-ref-partner-products", partnerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_offers")
        .select("product:product_id(id, name, image_url)")
        .eq("partner_id", partnerId)
        .eq("is_active", true)
        .is("source_offer_id", null);
      const products = (data ?? []).map((d: any) => d.product).filter(Boolean) as LinkedProduct[];
      // Dedupe by id
      const seen = new Set<string>();
      return products.filter((p) => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
    },
  });

  const filteredProducts = partnerProducts.filter(
    (p) => !productIds.includes(p.id) && p.name.toLowerCase().includes(productSearch.toLowerCase()),
  );

  const selectedProducts = partnerProducts.filter((p) => productIds.includes(p.id));

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = 4 - photos.length;
    if (remaining <= 0) { toast.error("Maximum 4 photos par projet"); return; }
    setUploadingPhotos(true);
    const newUrls: string[] = [];
    for (const file of files.slice(0, remaining)) {
      const vErr = validateImageUpload(file, { maxSizeMB: 5 });
      if (vErr) { toast.error(vErr); continue; }
      const ext = file.name.split(".").pop() || "jpg";
      const path = `brand-references/${partnerId}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const { error } = await supabase.storage.from("partner-assets").upload(path, file, { contentType: file.type });
      if (error) {
        toast.error(`Échec de l'upload : ${error.message}`);
        continue;
      }
      const { data: urlData } = supabase.storage.from("partner-assets").getPublicUrl(path);
      newUrls.push(urlData.publicUrl);
    }
    setPhotos((prev) => [...prev, ...newUrls]);
    setUploadingPhotos(false);
    if (newUrls.length > 0) toast.success(`${newUrls.length} photo(s) ajoutée(s)`);
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Le titre est obligatoire"); return; }
    setSaving(true);
    try {
      if (existing) {
        const { error } = await supabase
          .from("brand_references")
          .update({ title: title.trim(), location: location.trim() || null, description: description.trim() || null, photos, product_ids: productIds })
          .eq("id", existing.id);
        if (error) throw error;
        toast.success("Référence mise à jour");
      } else {
        const { error } = await supabase
          .from("brand_references")
          .insert({ partner_id: partnerId, title: title.trim(), location: location.trim() || null, description: description.trim() || null, photos, product_ids: productIds, display_order: 0 });
        if (error) throw error;
        toast.success("Référence créée");
      }
      onSaved();
    } catch (err: any) {
      toast.error("Erreur : " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full text-base font-body bg-white border border-border rounded-lg px-3 py-3 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-all";
  const labelClass = "text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1";

  return (
    <div>
      <button onClick={onClose} className="flex items-center gap-1.5 text-xs font-body text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="h-3.5 w-3.5" /> Retour aux références
      </button>

      <div className="max-w-xl mx-auto space-y-5">
        <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          {existing ? "Modifier le projet" : "Nouveau projet réalisé"}
        </h2>

        {/* Photos */}
        <div>
          <label className={labelClass}>Photos du projet (max 4)</label>
          <div className="grid grid-cols-2 gap-3 mb-2">
            {photos.map((url, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden aspect-[16/10]">
                <img loading="lazy" src={url} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {photos.length < 4 && (
              <label className="flex flex-col items-center justify-center aspect-[16/10] border-2 border-dashed border-purple-300 rounded-xl cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-all">
                {uploadingPhotos ? <Loader2 className="h-4 w-4 animate-spin text-purple-400" /> : <><Upload className="h-5 w-5 text-purple-300 mb-1" /><span className="text-[9px] font-body text-muted-foreground">Ajouter</span></>}
                <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
              </label>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className={labelClass}>Nom du projet *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="ex: Hôtel Martinez, terrasse restaurant" />
        </div>

        {/* Location */}
        <div>
          <label className={labelClass}>Lieu</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} placeholder="ex: Cannes, France" />
        </div>

        {/* Description */}
        <div>
          <label className={labelClass}>Description (optionnel)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputClass} resize-none`} rows={3} placeholder="Décrivez le projet, le contexte, les contraintes..." />
        </div>

        {/* Product selector */}
        <div>
          <label className={labelClass}>Produits utilisés dans ce projet</label>
          {/* Selected */}
          {selectedProducts.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedProducts.map((p) => (
                <span key={p.id} className="inline-flex items-center gap-2 text-xs font-display font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded-full pl-1.5 pr-2.5 py-1">
                  {p.image_url && <img loading="lazy" src={p.image_url} alt="" className="h-5 w-5 rounded-full object-cover" />}
                  {p.name}
                  <button type="button" onClick={() => setProductIds((prev) => prev.filter((id) => id !== p.id))}>
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full text-xs font-body border border-purple-200 rounded-full pl-9 pr-3 py-2 focus:outline-none focus:border-purple-500"
              placeholder="Rechercher un produit de votre catalogue..."
            />
          </div>
          {productSearch && filteredProducts.length > 0 && (
            <div className="mt-2 border border-purple-100 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              {filteredProducts.slice(0, 8).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setProductIds((prev) => [...prev, p.id]); setProductSearch(""); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-purple-50 transition-colors"
                >
                  {p.image_url ? (
                    <img loading="lazy" src={p.image_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center"><Package className="h-3.5 w-3.5 text-purple-400" /></div>
                  )}
                  <span className="text-xs font-display font-semibold text-foreground truncate">{p.name}</span>
                </button>
              ))}
            </div>
          )}
          {productSearch && filteredProducts.length === 0 && (
            <p className="text-[10px] font-body text-muted-foreground mt-2">Aucun produit trouvé</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button onClick={onClose} className="text-xs font-display font-semibold text-muted-foreground hover:text-foreground transition-colors px-4 py-2">
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="text-sm font-display font-semibold text-white rounded-full px-6 py-2.5 transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {existing ? "Enregistrer" : "Créer le projet"}
          </button>
        </div>
      </div>
    </div>
  );
}
