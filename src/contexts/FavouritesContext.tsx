import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, ReactNode } from "react";
import type { DBProduct } from "@/lib/products";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface FavouritesContextType {
  favourites: DBProduct[];
  isFavourite: (productId: string) => boolean;
  toggleFavourite: (product: DBProduct) => void;
  count: number;
}

const FavouritesContext = createContext<FavouritesContextType>({
  favourites: [],
  isFavourite: () => false,
  toggleFavourite: () => {},
  count: 0,
});

export const FavouritesProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [favourites, setFavourites] = useState<DBProduct[]>(() => {
    try {
      const saved = localStorage.getItem("terrassea_favourites");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const hasLoadedDBRef = useRef(false);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("terrassea_favourites", JSON.stringify(favourites));
    } catch (err) {
      console.warn("Failed to persist favourites to localStorage:", err);
    }
  }, [favourites]);

  // Sync with DB on login: load DB favourites and merge with local
  useEffect(() => {
    if (!user) {
      hasLoadedDBRef.current = false;
      return;
    }
    if (hasLoadedDBRef.current) return;
    hasLoadedDBRef.current = true;

    (async () => {
      try {
        const { data: dbFavs, error } = await supabase
          .from("user_favourites")
          .select("entity_id")
          .eq("user_id", user.id)
          .eq("entity_type", "product");
        if (error || !dbFavs || dbFavs.length === 0) return;

        const dbIds = dbFavs.map((r) => r.entity_id);
        // Find IDs not already in local favourites
        const localIds = new Set(favourites.map((p) => p.id));
        const missingIds = dbIds.filter((id) => !localIds.has(id));
        if (missingIds.length === 0) return;

        // Fetch full product objects for missing IDs
        const { data: products, error: prodErr } = await supabase
          .from("products")
          .select("*")
          .in("id", missingIds);
        if (prodErr || !products || products.length === 0) return;

        setFavourites((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newProducts = (products as unknown as DBProduct[]).filter((p) => !existingIds.has(p.id));
          return newProducts.length > 0 ? [...prev, ...newProducts] : prev;
        });
      } catch (err) {
        console.warn("Failed to load DB favourites:", err);
      }
    })();
  }, [user]);

  // Sync toggle to DB when authenticated
  const syncToggleToDB = async (productId: string, isAdding: boolean) => {
    if (!user) return;
    try {
      if (isAdding) {
        await supabase
          .from("user_favourites")
          .upsert({ user_id: user.id, entity_type: "product", entity_id: productId }, { onConflict: "user_id,entity_type,entity_id" });
      } else {
        await supabase
          .from("user_favourites")
          .delete()
          .eq("user_id", user.id)
          .eq("entity_type", "product")
          .eq("entity_id", productId);
      }
    } catch (err) {
      console.warn("Failed to sync favourite to DB:", err);
    }
  };

  const isFavourite = useCallback(
    (productId: string) => favourites.some((p) => p.id === productId),
    [favourites]
  );

  const toggleFavourite = useCallback((product: DBProduct) => {
    const isCurrentlyFav = favourites.some((p) => p.id === product.id);
    setFavourites((prev) =>
      isCurrentlyFav
        ? prev.filter((p) => p.id !== product.id)
        : [...prev, product]
    );
    syncToggleToDB(product.id, !isCurrentlyFav);
  }, [favourites]);

  const value = useMemo(
    () => ({ favourites, isFavourite, toggleFavourite, count: favourites.length }),
    [favourites, isFavourite, toggleFavourite]
  );

  return (
    <FavouritesContext.Provider value={value}>
      {children}
    </FavouritesContext.Provider>
  );
};

export const useFavourites = () => useContext(FavouritesContext);
