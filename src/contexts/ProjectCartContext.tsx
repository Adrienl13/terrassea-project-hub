import { createContext, useContext, useState, ReactNode } from "react";
import type { DBProduct } from "@/lib/products";
import type { LayoutRequirementType } from "@/engine/types";

export interface CartItemLayoutMeta {
  requirementType?: LayoutRequirementType;
  requirementLabel?: string;
  suggestedQuantity?: number;
}

export interface CartItem {
  product: DBProduct;
  quantity: number;
  conceptName?: string;
  layoutRequirementType?: LayoutRequirementType;
  layoutRequirementLabel?: string;
  layoutSuggestedQuantity?: number;
}

interface ProjectCartContextType {
  items: CartItem[];
  addItem: (product: DBProduct, conceptName?: string, quantity?: number, layoutMeta?: CartItemLayoutMeta) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number, layoutMeta?: CartItemLayoutMeta) => void;
  itemCount: number;
  notes: string;
  setNotes: (notes: string) => void;
}

const ProjectCartContext = createContext<ProjectCartContextType | undefined>(undefined);

function applyLayoutMeta(item: CartItem, layoutMeta?: CartItemLayoutMeta): CartItem {
  if (!layoutMeta) return item;

  return {
    ...item,
    layoutRequirementType: layoutMeta.requirementType ?? item.layoutRequirementType,
    layoutRequirementLabel: layoutMeta.requirementLabel ?? item.layoutRequirementLabel,
    layoutSuggestedQuantity: layoutMeta.suggestedQuantity ?? item.layoutSuggestedQuantity,
  };
}

export function ProjectCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");

  const addItem = (product: DBProduct, conceptName?: string, quantity?: number, layoutMeta?: CartItemLayoutMeta) => {
    const qty = quantity ?? 1;
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? applyLayoutMeta({ ...i, quantity: i.quantity + qty }, layoutMeta)
            : i
        );
      }

      const newItem: CartItem = {
        product,
        quantity: qty,
        conceptName,
        layoutRequirementType: layoutMeta?.requirementType,
        layoutRequirementLabel: layoutMeta?.requirementLabel,
        layoutSuggestedQuantity: layoutMeta?.suggestedQuantity,
      };

      return [...prev, newItem];
    });
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number, layoutMeta?: CartItemLayoutMeta) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    setItems((prev) =>
      prev.map((i) =>
        i.product.id === productId
          ? applyLayoutMeta({ ...i, quantity }, layoutMeta)
          : i
      )
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
