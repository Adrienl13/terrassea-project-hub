import { createContext, useContext, useState, ReactNode } from "react";
import type { DBProduct } from "@/lib/products";

export interface CartItem {
  product: DBProduct;
  quantity: number;
  conceptName?: string;
}

interface ProjectCartContextType {
  items: CartItem[];
  addItem: (product: DBProduct, conceptName?: string, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  itemCount: number;
  notes: string;
  setNotes: (notes: string) => void;
}

const ProjectCartContext = createContext<ProjectCartContextType | undefined>(undefined);

export function ProjectCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");

  const addItem = (product: DBProduct, conceptName?: string) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1, conceptName }];
    });
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i))
    );
  };

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <ProjectCartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, itemCount, notes, setNotes }}
    >
      {children}
    </ProjectCartContext.Provider>
  );
}

export function useProjectCart() {
  const context = useContext(ProjectCartContext);
  if (!context) throw new Error("useProjectCart must be used within ProjectCartProvider");
  return context;
}
