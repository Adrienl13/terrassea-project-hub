import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from "react";
import type { DBProduct } from "@/lib/products";
import type { LayoutRequirementType } from "@/engine/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
  stockStatus: string | null;
  stockQuantity: number | null;
  deliveryDelayDays: number | null;
  purchaseType: string | null;
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
  selectedColor?: string;
  selectedDimension?: string;
}

export type QuotationStatus =
  | "draft"
  | "sourcing_in_progress"
  | "supplier_confirmation_required"
  | "ready_for_quotation";

interface ProjectCartContextType {
  items: CartItem[];
  addItem: (product: DBProduct, conceptName?: string, quantity?: number, layoutMeta?: CartItemLayoutMeta, selectedColor?: string, selectedDimension?: string) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number, layoutMeta?: CartItemLayoutMeta) => void;
  selectSupplier: (productId: string, supplier: SelectedSupplier) => void;
  clearSupplier: (productId: string) => void;
  itemCount: number;
  notes: string;
  setNotes: (notes: string) => void;
  quotationStatus: QuotationStatus;
  markCartSubmitted: () => Promise<void>;
  clearCart: () => void;
}

/** Lightweight cart item stored server-side (no full product objects). */
interface SerializableCartItem {
  productId: string;
  quantity: number;
  conceptName?: string;
  selectedSupplier?: SelectedSupplier;
  selectedColor?: string;
  selectedDimension?: string;
}

function serializeCartItems(items: CartItem[]): SerializableCartItem[] {
  return items.map((i) => ({
    productId: i.product.id,
    quantity: i.quantity,
    conceptName: i.conceptName,
    selectedSupplier: i.selectedSupplier,
    selectedColor: i.selectedColor,
    selectedDimension: i.selectedDimension,
  }));
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

const CART_STORAGE_KEY = "terrassea_cart_items";
const NOTES_STORAGE_KEY = "terrassea_cart_notes";

function loadCartFromStorage(): CartItem[] {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function loadNotesFromStorage(): string {
  try {
    return localStorage.getItem(NOTES_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function ProjectCartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>(loadCartFromStorage);
  const [notes, setNotes] = useState(loadNotesFromStorage);
  const serverCartExistsRef = useRef(false);
  const hasLoadedServerCartRef = useRef(false);

  const storageWarningShownRef = useRef(false);

  // Persist cart items to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      if (!storageWarningShownRef.current) {
        storageWarningShownRef.current = true;
        toast.warning("Storage full — your cart may not persist across page reloads.");
      }
    }
  }, [items]);

  // Persist notes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, notes);
    } catch {
      // Notes storage failure is non-critical
    }
  }, [notes]);

  // ── Load server cart on login ──────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      hasLoadedServerCartRef.current = false;
      serverCartExistsRef.current = false;
      return;
    }
    if (hasLoadedServerCartRef.current) return;
    hasLoadedServerCartRef.current = true;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("saved_carts")
          .select("cart_data, notes")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          return;
        }

        if (data) {
          serverCartExistsRef.current = true;
          // Only load server cart if local cart is empty
          const localItems = loadCartFromStorage();
          if (localItems.length === 0 && Array.isArray(data.cart_data)) {
            const serverItems = data.cart_data as unknown as SerializableCartItem[];
            if (serverItems.length > 0) {
              // Hydrate: fetch full product objects for the stored IDs
              const productIds = serverItems.map((si) => si.productId);
              const { data: products, error: prodErr } = await supabase
                .from("products")
                .select("*")
                .in("id", productIds);

              if (prodErr || !products) {
                return;
              }

              const productMap = new Map(products.map((p) => [p.id, p as unknown as DBProduct]));
              const hydrated: CartItem[] = serverItems
                .filter((si) => productMap.has(si.productId))
                .map((si) => ({
                  product: productMap.get(si.productId)!,
                  quantity: si.quantity,
                  conceptName: si.conceptName,
                  selectedSupplier: si.selectedSupplier,
                  selectedColor: si.selectedColor,
                  selectedDimension: si.selectedDimension,
                }));

              if (hydrated.length > 0) {
                setItems(hydrated);
              }
              if (data.notes) {
                setNotes(data.notes as string);
              }
            }
          }
        }
      } catch {
        // Server cart load failed silently
      }
    })();
  }, [user]);

  // ── Debounced server sync ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    // Don't sync empty cart if no server cart exists (avoid creating empty rows)
    if (items.length === 0 && !serverCartExistsRef.current) return;

    const totalEstimated = items.reduce((sum, item) => {
      const price = item.selectedSupplier?.price ?? item.product.price_min ?? null;
      return price !== null ? sum + price * item.quantity : sum;
    }, 0);

    const syncPayload = {
      user_id: user.id,
      cart_data: serializeCartItems(items) as any,
      notes,
      item_count: items.reduce((s, i) => s + i.quantity, 0),
      total_estimated: totalEstimated,
      last_synced_at: new Date().toISOString(),
    };

    const timer = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from("saved_carts")
          .upsert(syncPayload, { onConflict: "user_id" });

        if (!error) {
          serverCartExistsRef.current = true;
        }
      } catch {
        // Server sync failed silently
      }
    }, 1500);

    // Flush on page close to prevent data loss
    const handleBeforeUnload = () => {
      navigator.sendBeacon?.(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/saved_carts?on_conflict=user_id`,
        JSON.stringify(syncPayload)
      );
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user, items, notes]);

  // ── Mark cart as submitted ─────────────────────────────────────────────────
  const markCartSubmitted = useCallback(async () => {
    if (!user) return;
    try {
      await supabase
        .from("saved_carts")
        .update({ submitted_at: new Date().toISOString() })
        .eq("user_id", user.id);
    } catch {
      // Mark-submitted failed silently
    }
  }, [user]);

  const addItem = useCallback((product: DBProduct, conceptName?: string, quantity?: number, layoutMeta?: CartItemLayoutMeta, selectedColor?: string, selectedDimension?: string) => {
    const qty = quantity ?? 1;
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? applyLayoutMeta({ ...i, quantity: i.quantity + qty, selectedColor: selectedColor ?? i.selectedColor, selectedDimension: selectedDimension ?? i.selectedDimension }, layoutMeta)
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
        selectedColor,
        selectedDimension,
      };
      return [...prev, newItem];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number, layoutMeta?: CartItemLayoutMeta) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.product.id !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.product.id === productId
          ? applyLayoutMeta({ ...i, quantity }, layoutMeta)
          : i
      )
    );
  }, []);

  const selectSupplier = useCallback((productId: string, supplier: SelectedSupplier) => {
    setItems((prev) =>
      prev.map((i) =>
        i.product.id === productId ? { ...i, selectedSupplier: supplier } : i
      )
    );
  }, []);

  const clearSupplier = useCallback((productId: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.product.id === productId ? { ...i, selectedSupplier: undefined } : i
      )
    );
  }, []);

  const setNotesCallback = useCallback((newNotes: string) => {
    setNotes(newNotes);
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setNotes("");
  }, []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const quotationStatus = computeQuotationStatus(items);

  const value = useMemo(() => ({
    items, addItem, removeItem, updateQuantity, selectSupplier, clearSupplier, itemCount, notes, setNotes: setNotesCallback, quotationStatus, markCartSubmitted, clearCart,
  }), [items, addItem, removeItem, updateQuantity, selectSupplier, clearSupplier, itemCount, notes, setNotesCallback, quotationStatus, markCartSubmitted, clearCart]);

  return (
    <ProjectCartContext.Provider value={value}>
      {children}
    </ProjectCartContext.Provider>
  );
}

export function useProjectCart() {
  const context = useContext(ProjectCartContext);
  if (!context) throw new Error("useProjectCart must be used within ProjectCartProvider");
  return context;
}
