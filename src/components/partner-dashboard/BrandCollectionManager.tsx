import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, Image, Package, FolderOpen, Crown, Sparkles } from "lucide-react";

interface BrandCollectionManagerProps {
  partnerId: string;
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

function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = String(item[key] ?? "Sans collection");
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

export default function BrandCollectionManager({ partnerId }: BrandCollectionManagerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editingOffer, setEditingOffer] = useState<string | null>(null);
  const [editCollection, setEditCollection] = useState("");

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ["brand-collection-offers", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_offers")
        .select("id, collection_name, product_id, product:product_id(id, name, image_url, category)")
        .eq("partner_id", partnerId)
        .eq("is_active", true)
        .order("collection_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CollectionProduct[];
    },
  });

  const collections = groupBy(offers, "collection_name");
  const collectionNames = Object.keys(collections);

  const handleUpdateCollection = async (offerId: string, newName: string) => {
    const { error } = await supabase
      .from("product_offers")
      .update({ collection_name: newName || null })
      .eq("id", offerId);
    if (error) {
      toast.error(t("brand.updateError"));
      return;
    }
    toast.success(t("brand.collectionUpdated"));
    setEditingOffer(null);
    queryClient.invalidateQueries({ queryKey: ["brand-collection-offers", partnerId] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

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
            {t("brand.manageCollections")}
          </h2>
          <p className="text-xs font-body text-purple-200 mt-1">
            {offers.length} {t("brand.productsCount", "produit")}{offers.length > 1 ? "s" : ""} &middot; {collectionNames.length} collection{collectionNames.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-2xl p-4 mb-6">
        <p className="text-xs font-body text-purple-800 flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-purple-500 shrink-0" />
          {t("brand.brandModeInfo")}
        </p>
      </div>

      {collectionNames.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 flex items-center justify-center mb-4">
            <FolderOpen className="h-7 w-7 text-purple-400" />
          </div>
          <p className="text-sm font-display font-semibold text-foreground mb-1">{t("brand.noProducts")}</p>
          <p className="text-xs font-body text-muted-foreground max-w-xs">{t("brand.addProducts")}</p>
        </div>
      ) : (
        <div className="space-y-10">
          {collectionNames.map((collName) => {
            const items = collections[collName];
            return (
              <div key={collName}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-100 to-violet-100 flex items-center justify-center">
                    <Package className="h-3.5 w-3.5 text-purple-600" />
                  </div>
                  <h3 className="font-display text-sm font-bold text-foreground">{collName}</h3>
                  <span className="text-[10px] text-muted-foreground font-body bg-purple-50 px-2 py-0.5 rounded-full">{items.length} {t("brand.productsCount", "produit")}{items.length > 1 ? "s" : ""}</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {items.map((item) => (
                    <div key={item.id} className="border border-purple-100 rounded-2xl overflow-hidden group hover:shadow-lg hover:shadow-purple-100/50 transition-all bg-white">
                      <div className="aspect-square bg-gradient-to-br from-purple-50 to-violet-50 relative overflow-hidden">
                        {item.product?.image_url ? (
                          <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="h-8 w-8 text-purple-200" />
                          </div>
                        )}
                      </div>
                      <div className="p-3.5">
                        <p className="text-xs font-display font-semibold text-foreground truncate">{item.product?.name || t("brand.productsCount", "Produit")}</p>
                        <p className="text-[10px] font-body text-muted-foreground">{item.product?.category || ""}</p>

                        {editingOffer === item.id ? (
                          <div className="mt-2 flex gap-1">
                            <input
                              value={editCollection}
                              onChange={(e) => setEditCollection(e.target.value)}
                              placeholder={t("brand.collectionPlaceholder", "Nom collection")}
                              className="flex-1 text-[10px] border border-purple-200 rounded-full px-2.5 py-1.5 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-all"
                            />
                            <button
                              onClick={() => handleUpdateCollection(item.id, editCollection)}
                              className="text-[10px] font-display font-semibold text-white rounded-full px-3 py-1.5"
                              style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }}
                            >
                              OK
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingOffer(item.id); setEditCollection(item.collection_name || ""); }}
                            className="mt-1.5 text-[10px] font-body text-purple-500 hover:text-purple-700 transition-colors flex items-center gap-1"
                          >
                            <Pencil className="h-2.5 w-2.5" /> {t("brand.editCollection")}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
