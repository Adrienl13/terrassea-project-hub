import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import type { DBProduct } from "@/lib/products";

interface CompareContextType {
  items: DBProduct[];
  addToCompare: (product: DBProduct) => void;
  removeFromCompare: (id: string) => void;
  isInCompare: (id: string) => boolean;
  clearCompare: () => void;
  count: number;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<DBProduct[]>(() => {
    try {
      const saved = localStorage.getItem("terrassea_compare");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("terrassea_compare", JSON.stringify(items));
    } catch (err) {
      console.warn("Failed to persist compare items to localStorage:", err);
    }
  }, [items]);

  const addToCompare = useCallback((product: DBProduct) => {
    setItems((prev) => {
      if (prev.length >= 4) return prev;
      if (prev.some((p) => p.id === product.id)) return prev;
      return [...prev, product];
    });
  }, []);

  const removeFromCompare = useCallback((id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const isInCompare = useCallback(
    (id: string) => items.some((p) => p.id === id),
    [items]
  );

  const clearCompare = useCallback(() => setItems([]), []);

  return (
    <CompareContext.Provider
      value={{ items, addToCompare, removeFromCompare, isInCompare, clearCompare, count: items.length }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}
