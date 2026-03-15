import { createContext, useContext, useState, ReactNode } from "react";
import type { DBProduct } from "@/lib/products";
import type { LayoutRequirementType } from "@/engine/types";

export interface CartItemLayoutMeta {
  requirementType?: LayoutRequirementType;
  requirementLabel?: string;
  suggestedQuantity?: number;
}

export interface SelectedSupplier {
  offerId: string;
  partnerId: string;
  partnerName: string;
  partnerCountry?: string | null;
  price: number | null;
  stockStatus: string;
  stockQuantity: number | null;
  deliveryDelayDays: number | null;
  purchaseType: string;
  score: number;
}

export interface CartItem {
  product: DBProduct;
  quantity: number;
  conceptName?: string;
  layoutRequirementType?: LayoutRequirementType;
  layoutRequirementLabel?: string;
  layoutSuggestedQuantity?: number;
  selectedSupplier?: SelectedSupplier;
}

export type QuotationStatus =
  | "draft"
  | "sourcing_in_progress"
  | "supplier_confirmation_required"
  | "ready_for_quotation";

interface ProjectCartContextType {
  items: CartItem[];
  addItem: (product: DBProduct, conceptName?: string, quantity?: number, layoutMeta?: CartItemLayoutMeta) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number, layoutMeta?: CartItemLayoutMeta) => void;
  selectSupplier: (productId: string, supplier: SelectedSupplier) => void;
  clearSupplier: (productId: string) => void;
  itemCount: number;
  notes: string;
  setNotes: (notes: string) => void;
  quotationStatus: QuotationStatus;
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

function computeQuotationStatus(items: CartItem[]): QuotationStatus {
  if (items.length === 0) return "draft";

  const withSupplier = items.filter((i) => i.selectedSupplier);
  if (withSupplier.length === 0) return "draft";
  if (withSupplier.length < items.length) return "sourcing_in_progress";

  // Check if any supplier has uncertain stock
  const needsConfirmation = withSupplier.some((i) => {
    const s = i.selectedSupplier!.stockStatus?.toLowerCase();
    return s === "low_stock" || s === "production" || s === "on_order";
  });

  if (needsConfirmation) return "supplier_confirmation_required";
  return "ready_for_quotation";
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
    if (quantity <= 0) { removeItem(productId); return; }
    setItems((prev) =>
      prev.map((i) =>
        i.product.id === productId
          ? applyLayoutMeta({ ...i, quantity }, layoutMeta)
          : i
      )
    );
  };

  const selectSupplier = (productId: string, supplier: SelectedSupplier) => {
    setItems((prev) =>
      prev.map((i) =>
        i.product.id === productId ? { ...i, selectedSupplier: supplier } : i
      )
    );
  };

  const clearSupplier = (productId: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.product.id === productId ? { ...i, selectedSupplier: undefined } : i
      )
    );
  };

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const quotationStatus = computeQuotationStatus(items);

  return (
    <ProjectCartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, selectSupplier, clearSupplier, itemCount, notes, setNotes, quotationStatus }}
    >
      {children}
    </ProjectCartContext.Provider>
  );
}

const FALLBACK_CONTEXT: ProjectCartContextType = {
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  selectSupplier: () => {},
  clearSupplier: () => {},
  itemCount: 0,
  notes: "",
  setNotes: () => {},
  quotationStatus: "draft",
};

export function useProjectCart() {
  const context = useContext(ProjectCartContext);
  return context ?? FALLBACK_CONTEXT;
}
