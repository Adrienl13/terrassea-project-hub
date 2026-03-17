import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface FavouritesContextType {
  favourites: Set<string>;
  isLoading: boolean;
  toggleFavourite: (productId: string) => Promise<void>;
  isFavourite: (productId: string) => boolean;
}

const FavouritesContext = createContext<FavouritesContextType>({
  favourites: new Set(),
  isLoading: false,
  toggleFavourite: async () => {},
  isFavourite: () => false,
});

export const FavouritesProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [favourites, setFavourites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) { setFavourites(new Set()); return; }
    setIsLoading(true);
    supabase
      .from("user_favourites")
      .select("product_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setFavourites(new Set((data ?? []).map((r: any) => r.product_id)));
        setIsLoading(false);
      });
  }, [user]);

  const toggleFavourite = useCallback(async (productId: string) => {
    if (!user) return;
    const isFav = favourites.has(productId);
    // Optimistic update
    setFavourites((prev) => {
      const next = new Set(prev);
      isFav ? next.delete(productId) : next.add(productId);
      return next;
    });
    if (isFav) {
      await supabase.from("user_favourites").delete().eq("user_id", user.id).eq("product_id", productId);
    } else {
      await supabase.from("user_favourites").insert({ user_id: user.id, product_id: productId } as any);
    }
  }, [user, favourites]);

  const isFavourite = useCallback((productId: string) => favourites.has(productId), [favourites]);

  return (
    <FavouritesContext.Provider value={{ favourites, isLoading, toggleFavourite, isFavourite }}>
      {children}
    </FavouritesContext.Provider>
  );
};

export const useFavourites = () => useContext(FavouritesContext);
