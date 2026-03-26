import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, Image, Package, FolderOpen } from "lucide-react";

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
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">{t("brand.manageCollections")}</h2>
          <p className="text-xs font-body text-muted-foreground">
            {offers.length} produit{offers.length > 1 ? "s" : ""} \u00b7 {collectionNames.length} collection{collectionNames.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6">
        <p className="text-xs font-body text-amber-800">
          {t("brand.brandModeInfo")}
        </p>
      </div>

      {collectionNames.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FolderOpen className="h-8 w-8 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-body text-muted-foreground mb-1">{t("brand.noProducts")}</p>
          <p className="text-xs font-body text-muted-foreground">{t("brand.addProducts")}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {collectionNames.map((collName) => {
            const items = collections[collName];
            return (
              <div key={collName}>
                <div className="flex items-center gap-2 mb-3">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-display text-sm font-bold text-foreground">{collName}</h3>
                  <span className="text-[10px] text-muted-foreground font-body">{items.length} produit{items.length > 1 ? "s" : ""}</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {items.map((item) => (
                    <div key={item.id} className="border border-border rounded-xl overflow-hidden group">
                      <div className="aspect-square bg-muted relative">
                        {item.product?.image_url ? (
                          <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="h-6 w-6 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-display font-semibold text-foreground truncate">{item.product?.name || "Produit"}</p>
                        <p className="text-[10px] font-body text-muted-foreground">{item.product?.category || ""}</p>

                        {editingOffer === item.id ? (
                          <div className="mt-2 flex gap-1">
                            <input
                              value={editCollection}
                              onChange={(e) => setEditCollection(e.target.value)}
                              placeholder="Nom collection"
                              className="flex-1 text-[10px] border border-border rounded-full px-2 py-1 focus:outline-none focus:border-foreground"
                            />
                            <button
                              onClick={() => handleUpdateCollection(item.id, editCollection)}
                              className="text-[10px] font-display font-semibold bg-foreground text-primary-foreground rounded-full px-2 py-1"
                            >
                              OK
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingOffer(item.id); setEditCollection(item.collection_name || ""); }}
                            className="mt-1 text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
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
