import { useState, useMemo } from "react";
import { Search, ArrowRight, Merge, X, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { DBProduct, ColorVariant } from "@/lib/products";
import type { Json } from "@/integrations/supabase/types";

interface Props {
  /** If provided, this product is pre-selected as source. Otherwise user picks both. */
  initialSource?: DBProduct | null;
  products: DBProduct[];
  onClose: () => void;
}

type Step = "pick-source" | "pick-target" | "confirm";

function ProductPicker({ products, excludeId, onPick, label }: {
  products: DBProduct[];
  excludeId?: string;
  onPick: (p: DBProduct) => void;
  label: string;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products
      .filter(p => p.id !== excludeId)
      .filter(p => !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || (p.main_color || "").toLowerCase().includes(q))
      .slice(0, 30);
  }, [products, excludeId, search]);

  return (
    <div className="border border-border rounded-xl p-4 space-y-3">
      <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="relative">
        <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom, catégorie, couleur..."
          className="w-full pl-9 pr-3 py-2.5 text-xs font-body bg-background border border-border rounded-lg focus:outline-none focus:border-foreground transition-colors" />
      </div>
      <div className="max-h-64 overflow-y-auto space-y-1">
        {filtered.map(p => (
          <button key={p.id} onClick={() => onPick(p)}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all text-left">
            {p.image_url ? (
              <img src={p.image_url} alt={p.name} className="w-11 h-11 rounded-lg object-cover border border-border shrink-0" />
            ) : (
              <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <span className="text-[8px] text-muted-foreground">N/A</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-display font-semibold text-foreground truncate">{p.name}</p>
              <p className="text-[10px] font-body text-muted-foreground">{p.category} · {p.main_color || "—"}</p>
            </div>
            {/* Color swatches */}
            <div className="flex items-center gap-0.5 shrink-0">
              {(p.color_variants ?? []).slice(0, 5).map((v, i) => (
                <div key={i} className="w-3.5 h-3.5 rounded-full border border-white shadow-sm" style={{ backgroundColor: v.color_hex }} title={v.label_en} />
              ))}
              {(p.available_colors ?? []).length > 0 && (p.color_variants ?? []).length === 0 && (
                <span className="text-[8px] font-body text-muted-foreground">{p.available_colors.length} couleurs</span>
              )}
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-[10px] font-body text-muted-foreground text-center py-6">Aucun produit trouvé</p>
        )}
      </div>
    </div>
  );
}

function ProductCard({ product, badge, badgeColor, onClear }: {
  product: DBProduct;
  badge: string;
  badgeColor: string;
  onClear?: () => void;
}) {
  return (
    <div className={`flex items-center gap-4 p-3 border rounded-xl ${badgeColor}`}>
      {product.image_url ? (
        <img src={product.image_url} alt={product.name} className="w-14 h-14 rounded-lg object-cover border border-border" />
      ) : (
        <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
          <span className="text-[9px] text-muted-foreground">N/A</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-display font-semibold text-xs text-foreground truncate">{product.name}</p>
        <p className="text-[10px] font-body text-muted-foreground">{product.category} · {product.main_color || "—"}</p>
        <div className="flex items-center gap-1 mt-1">
          {(product.color_variants ?? []).map((v, i) => (
            <div key={i} className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: v.color_hex }} title={v.label_en} />
          ))}
          {(product.color_variants ?? []).length === 0 && (product.available_colors ?? []).length > 0 && (
            <span className="text-[9px] font-body text-muted-foreground">{product.available_colors.join(", ")}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-[9px] font-display font-bold px-2 py-1 rounded-lg ${
          badge === "SOURCE" ? "text-amber-700 bg-amber-100" : "text-green-700 bg-green-100"
        }`}>{badge}</span>
        {onClear && (
          <button onClick={onClear} className="text-muted-foreground hover:text-foreground transition-colors" title="Changer">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function ProductMergeDialog({ initialSource, products, onClose }: Props) {
  const queryClient = useQueryClient();
  const [source, setSource] = useState<DBProduct | null>(initialSource?.id ? initialSource : null);
  const [target, setTarget] = useState<DBProduct | null>(null);
  const [keepOffers, setKeepOffers] = useState(true);
  const [deleteSource, setDeleteSource] = useState(false);
  const [merging, setMerging] = useState(false);

  const step: Step = !source ? "pick-source" : !target ? "pick-target" : "confirm";

  // Preview merged color variants
  const mergedVariants = useMemo(() => {
    if (!target || !source) return [];
    const targetVariants: ColorVariant[] = target.color_variants ?? [];
    const sourceVariants: ColorVariant[] = source.color_variants ?? [];
    const existingSlugs = new Set(targetVariants.map(v => v.color_slug));
    return [
      ...targetVariants,
      ...sourceVariants.filter(v => !existingSlugs.has(v.color_slug)),
    ];
  }, [target, source]);

  const mergedColors = useMemo(() => {
    if (!target || !source) return [];
    return [...new Set([...(target.available_colors ?? []), ...(source.available_colors ?? [])])];
  }, [target, source]);

  const handleMerge = async () => {
    if (!target || !source) return;
    setMerging(true);
    try {
      const { error: updateErr } = await supabase.from("products").update({
        color_variants: mergedVariants as unknown as Json,
        available_colors: mergedColors,
        is_canonical_instance: true,
      }).eq("id", target.id);
      if (updateErr) throw updateErr;

      if (keepOffers) {
        const { error: offerErr } = await supabase.from("product_offers")
          .update({ product_id: target.id })
          .eq("product_id", source.id);
        if (offerErr) throw offerErr;
      }

      if (deleteSource) {
        const { error: delErr } = await supabase.from("products").delete().eq("id", source.id);
        if (delErr) throw delErr;
      } else {
        const { error: dupErr } = await supabase.from("products").update({
          duplicate_of: target.id,
          availability_type: "discontinued",
        }).eq("id", source.id);
        if (dupErr) throw dupErr;
      }

      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`"${source.name}" fusionné dans "${target.name}"`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la fusion");
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Merge className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-foreground">Fusionner des produits</h2>
              <p className="text-xs font-body text-muted-foreground">
                {step === "pick-source" && "Étape 1 — Sélectionnez le produit à absorber (source)"}
                {step === "pick-target" && "Étape 2 — Sélectionnez le produit qui conservera la fiche (cible)"}
                {step === "confirm" && "Étape 3 — Vérifiez et confirmez la fusion"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Step indicator */}
          <div className="flex items-center gap-2 justify-center mb-2">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-bold ${
                  (step === "pick-source" && s === 1) || (step === "pick-target" && s === 2) || (step === "confirm" && s === 3)
                    ? "bg-blue-600 text-white"
                    : s < (step === "pick-source" ? 1 : step === "pick-target" ? 2 : 3)
                    ? "bg-green-100 text-green-700"
                    : "bg-muted text-muted-foreground"
                }`}>{s}</div>
                {s < 3 && <div className="w-8 h-px bg-border" />}
              </div>
            ))}
          </div>

          {/* Source section */}
          {source ? (
            <ProductCard product={source} badge="SOURCE" badgeColor="border-amber-200 bg-amber-50/50"
              onClear={() => { setSource(null); setTarget(null); }} />
          ) : (
            <ProductPicker products={products} onPick={setSource} label="Sélectionner le produit source (sera absorbé)" />
          )}

          {/* Arrow */}
          {source && (
            <div className="flex items-center justify-center">
              <ArrowRight className="h-5 w-5 text-blue-400" />
            </div>
          )}

          {/* Target section */}
          {source && !target && step === "pick-target" && (
            <ProductPicker products={products} excludeId={source.id} onPick={setTarget}
              label="Sélectionner le produit cible (conservera la fiche)" />
          )}

          {target && (
            <ProductCard product={target} badge="CIBLE" badgeColor="border-green-200 bg-green-50/50"
              onClear={() => setTarget(null)} />
          )}

          {/* Confirmation details */}
          {step === "confirm" && source && target && (
            <>
              {/* Merged preview */}
              <div className="border border-blue-200 bg-blue-50/30 rounded-xl p-4 space-y-3">
                <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-blue-700">
                  Aperçu après fusion
                </p>
                <div>
                  <p className="text-[9px] font-display text-muted-foreground mb-1.5">
                    Variantes couleur fusionnées ({mergedVariants.length})
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {mergedVariants.map((v, i) => (
                      <div key={i} className="flex items-center gap-1 bg-white rounded-full px-2 py-1 border border-border">
                        <div className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: v.color_hex }} />
                        <span className="text-[9px] font-body text-foreground">{v.label_en || v.color_slug}</span>
                      </div>
                    ))}
                    {mergedVariants.length === 0 && (
                      <span className="text-[9px] font-body text-muted-foreground italic">Aucune variante couleur</span>
                    )}
                  </div>
                </div>
                {mergedColors.length > 0 && (
                  <div>
                    <p className="text-[9px] font-display text-muted-foreground mb-1">Couleurs disponibles</p>
                    <p className="text-[10px] font-body text-foreground">{mergedColors.join(", ")}</p>
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="border border-border rounded-xl p-4 space-y-3">
                <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">Options</p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={keepOffers} onChange={e => setKeepOffers(e.target.checked)} className="rounded border-border" />
                  <div>
                    <span className="text-xs font-display font-semibold text-foreground">Transférer les offres fournisseurs</span>
                    <p className="text-[9px] font-body text-muted-foreground">Les offres du produit source seront rattachées au produit cible</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={deleteSource} onChange={e => setDeleteSource(e.target.checked)} className="rounded border-border" />
                  <div>
                    <span className="text-xs font-display font-semibold text-foreground">Supprimer le produit source</span>
                    <p className="text-[9px] font-body text-muted-foreground">
                      {deleteSource ? "Le produit source sera supprimé définitivement" : "Le produit source sera marqué comme doublon (discontinued)"}
                    </p>
                  </div>
                </label>
              </div>

              {/* Category warning */}
              {target.category !== source.category && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-body text-amber-800">
                    Attention : catégories différentes ({source.category} → {target.category}).
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-border">
          <button onClick={onClose}
            className="px-5 py-2.5 text-xs font-display font-semibold border border-border rounded-xl hover:border-foreground/30 transition-colors">
            Annuler
          </button>
          {step === "confirm" && (
            <button onClick={handleMerge} disabled={merging}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-display font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors">
              <Merge className="h-3.5 w-3.5" />
              {merging ? "Fusion en cours..." : "Confirmer la fusion"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
