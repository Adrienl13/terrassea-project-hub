import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { DBProduct } from "@/lib/products";

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
  const [favourites, setFavourites] = useState<DBProduct[]>(() => {
    try {
      const saved = localStorage.getItem("terrassea_favourites");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("terrassea_favourites", JSON.stringify(favourites));
    } catch (err) {
      console.warn("Failed to persist favourites to localStorage:", err);
    }
  }, [favourites]);

  const isFavourite = (productId: string) =>
    favourites.some((p) => p.id === productId);

  const toggleFavourite = (product: DBProduct) => {
    setFavourites((prev) =>
      prev.some((p) => p.id === product.id)
        ? prev.filter((p) => p.id !== product.id)
        : [...prev, product]
    );
  };

  return (
    <FavouritesContext.Provider
      value={{ favourites, isFavourite, toggleFavourite, count: favourites.length }}
    >
      {children}
    </FavouritesContext.Provider>
  );
};

export const useFavourites = () => useContext(FavouritesContext);
