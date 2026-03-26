import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ArrivalItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  expectedQuantity: number;
  receivedQuantity: number | null;
  preorderReserved: number;
}

export interface Arrival {
  id: string;
  name: string;
  expectedDate: string;
  notes: string | null;
  status: string; // planned, in_transit, arrived, cancelled
  preorderEnabled: boolean;
  items: ArrivalItem[];
  createdAt: string;
}

export interface ProductArrival {
  arrivalItemId: string;         // partner_arrival_items.id
  arrivalId: string;
  arrivalName: string;
  partnerId: string;
  expectedDate: string;
  expectedQuantity: number;
  preorderReserved: number;
  available: number; // expectedQuantity - preorderReserved
  preorderEnabled: boolean;
  partnerName: string;
}

// ── usePartnerArrivals ─────────────────────────────────────────────────────────

export function usePartnerArrivals(partnerId: string | null) {
  const queryClient = useQueryClient();

  const {
    data: arrivals = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["partner-arrivals", partnerId],
    queryFn: async () => {
      if (!partnerId) return [];
      const { data, error } = await supabase
        .from("partner_arrivals")
        .select(
          "id, name, expected_date, notes, status, preorder_enabled, created_at, partner_arrival_items(id, product_id, expected_quantity, received_quantity, preorder_reserved, products(name, image_url))"
        )
        .eq("partner_id", partnerId)
        .order("expected_date", { ascending: false });
      if (error) {
        console.error("Failed to fetch arrivals:", error);
        return [];
      }
      return (data || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        expectedDate: a.expected_date,
        notes: a.notes,
        status: a.status ?? "planned",
        preorderEnabled: a.preorder_enabled ?? false,
        createdAt: a.created_at,
        items: (a.partner_arrival_items || []).map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          productName: item.products?.name ?? "Unknown product",
          productImage: item.products?.image_url ?? null,
          expectedQuantity: item.expected_quantity,
          receivedQuantity: item.received_quantity,
          preorderReserved: item.preorder_reserved ?? 0,
        })),
      })) as Arrival[];
    },
    enabled: !!partnerId,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["partner-arrivals", partnerId] });

  const createArrival = useMutation({
    mutationFn: async (params: {
      name: string;
      expectedDate: string;
      notes?: string;
      preorderEnabled?: boolean;
    }) => {
      if (!partnerId) throw new Error("No partner ID");
      const { error } = await supabase.from("partner_arrivals").insert({
        partner_id: partnerId,
        name: params.name,
        expected_date: params.expectedDate,
        notes: params.notes ?? null,
        preorder_enabled: params.preorderEnabled ?? false,
        status: "planned",
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateArrival = useMutation({
    mutationFn: async (params: {
      id: string;
      data: {
        name?: string;
        expectedDate?: string;
        notes?: string | null;
        preorderEnabled?: boolean;
        status?: string;
      };
    }) => {
      const updates: Record<string, unknown> = {};
      if (params.data.name !== undefined) updates.name = params.data.name;
      if (params.data.expectedDate !== undefined) updates.expected_date = params.data.expectedDate;
      if (params.data.notes !== undefined) updates.notes = params.data.notes;
      if (params.data.preorderEnabled !== undefined)
        updates.preorder_enabled = params.data.preorderEnabled;
      if (params.data.status !== undefined) updates.status = params.data.status;
      const { error } = await supabase
        .from("partner_arrivals")
        .update(updates)
        .eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const cancelArrival = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("partner_arrivals")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const markArrived = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("partner_arrivals")
        .update({ status: "arrived" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addItem = useMutation({
    mutationFn: async (params: {
      arrivalId: string;
      productId: string;
      expectedQuantity: number;
    }) => {
      const { error } = await supabase.from("partner_arrival_items").insert({
        arrival_id: params.arrivalId,
        product_id: params.productId,
        expected_quantity: params.expectedQuantity,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateItem = useMutation({
    mutationFn: async (params: {
      itemId: string;
      data: { expectedQuantity?: number; receivedQuantity?: number | null };
    }) => {
      const updates: Record<string, unknown> = {};
      if (params.data.expectedQuantity !== undefined)
        updates.expected_quantity = params.data.expectedQuantity;
      if (params.data.receivedQuantity !== undefined)
        updates.received_quantity = params.data.receivedQuantity;
      const { error } = await supabase
        .from("partner_arrival_items")
        .update(updates)
        .eq("id", params.itemId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("partner_arrival_items")
        .delete()
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    arrivals,
    isLoading,
    refetch,
    createArrival: createArrival.mutate,
    isCreating: createArrival.isPending,
    updateArrival: updateArrival.mutate,
    isUpdating: updateArrival.isPending,
    cancelArrival: cancelArrival.mutate,
    markArrived: markArrived.mutate,
    addItem: addItem.mutate,
    isAddingItem: addItem.isPending,
    updateItem: updateItem.mutate,
    removeItem: removeItem.mutate,
  };
}

// ── useProductArrivals ─────────────────────────────────────────────────────────

export function useProductArrivals(productId: string | null | undefined) {
  const { data: arrivals = [], isLoading } = useQuery({
    queryKey: ["product-arrivals", productId],
    queryFn: async () => {
      if (!productId) return [];
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("partner_arrival_items")
        .select(
          "id, expected_quantity, preorder_reserved, partner_arrivals!inner(id, name, partner_id, expected_date, status, preorder_enabled, partners(name))"
        )
        .eq("product_id", productId);
      if (error) {
        console.error("Failed to fetch product arrivals:", error);
        return [];
      }
      return (data || [])
        .filter((item: any) => {
          const arrival = item.partner_arrivals;
          if (!arrival) return false;
          const status = arrival.status ?? "planned";
          return (
            (status === "planned" || status === "in_transit") &&
            arrival.expected_date >= today
          );
        })
        .map((item: any) => {
          const arrival = item.partner_arrivals;
          const reserved = item.preorder_reserved ?? 0;
          return {
            arrivalItemId: item.id,
            arrivalId: arrival.id,
            arrivalName: arrival.name,
            partnerId: arrival.partner_id,
            expectedDate: arrival.expected_date,
            expectedQuantity: item.expected_quantity,
            preorderReserved: reserved,
            available: item.expected_quantity - reserved,
            preorderEnabled: arrival.preorder_enabled ?? false,
            partnerName: arrival.partners?.name ?? "Unknown",
          } as ProductArrival;
        })
        .sort((a: ProductArrival, b: ProductArrival) =>
          a.expectedDate.localeCompare(b.expectedDate)
        );
    },
    enabled: !!productId,
    staleTime: 2 * 60 * 1000,
  });

  return { arrivals, isLoading };
}

// ── usePreorder ────────────────────────────────────────────────────────────────

export function usePreorder() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: myPreorders = [], isLoading } = useQuery({
    queryKey: ["my-preorders", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("preorders")
        .select("id, arrival_item_id, product_id, quantity, status, created_at")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Failed to fetch preorders:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const createPreorder = useMutation({
    mutationFn: async (params: {
      arrivalItemId: string;
      productId: string;
      quantity: number;
    }) => {
      if (!profile?.id) throw new Error("Not authenticated");

      // Atomic preorder: check availability + increment reserved + insert record
      const { error: rpcError } = await supabase.rpc("reserve_preorder", {
        p_arrival_item_id: params.arrivalItemId,
        p_user_id: profile.id,
        p_product_id: params.productId,
        p_quantity: params.quantity,
      });
      if (rpcError) throw rpcError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-preorders", profile?.id] });
      queryClient.invalidateQueries({ queryKey: ["product-arrivals"] });
    },
  });

  return {
    myPreorders,
    isLoading,
    createPreorder: createPreorder.mutate,
    isCreating: createPreorder.isPending,
  };
}
