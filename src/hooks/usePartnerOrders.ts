// ============================================================================
// usePartnerOrders — hook for partner-side order management (Dette 33).
//
// Provides :
//   - orders : list of orders visible to the current partner (filtered by RLS
//     "Partners read own orders" — no partner_id filter needed in SELECT)
//   - updateOrder : mutation that calls update_order_as_partner RPC (status
//     transitions, tracking_*, auto-timestamps, audit trail)
//   - notifyClient : mutation that calls create_order_notification_to_client
//     (P3.O1, anticipates Phase 2B.2 of Dette 19)
//
// Pattern aligned with usePartnerQuotes for DRY consistency.
// ============================================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PartnerOrderRow {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  partner_id: string | null;
  client_user_id: string | null;
  client_email: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number | null;
  total_amount: number;
  // Workflow timestamps
  deposit_paid_at: string | null;
  production_confirmed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  // Tracking
  tracking_number: string | null;
  tracking_url: string | null;
  shipping_carrier: string | null;
  tracking_status: string | null;
  // Other
  invoice_number: string | null;
  estimated_delivery_date: string | null;
}

export interface PartnerOrderEvent {
  id: string;
  order_id: string;
  event_type: string;
  description: string | null;
  actor: string | null;
  metadata: unknown;
  created_at: string;
}

interface UpdateOrderInput {
  orderId: string;
  status?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  shipping_carrier?: string | null;
}

interface NotifyClientInput {
  orderId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
}

const QUERY_KEY = ["partner-orders"] as const;

export function usePartnerOrders() {
  const queryClient = useQueryClient();

  const ordersQuery = useQuery<PartnerOrderRow[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PartnerOrderRow[];
    },
  });

  const updateOrder = useMutation({
    mutationFn: async (input: UpdateOrderInput) => {
      const { data, error } = await supabase.rpc("update_order_as_partner", {
        p_order_id:         input.orderId,
        p_status:           input.status ?? null,
        p_tracking_number:  input.tracking_number ?? null,
        p_tracking_url:     input.tracking_url ?? null,
        p_shipping_carrier: input.shipping_carrier ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const notifyClient = useMutation({
    mutationFn: async (input: NotifyClientInput) => {
      const { data, error } = await supabase.rpc(
        "create_order_notification_to_client",
        {
          p_order_id: input.orderId,
          p_type:     input.type,
          p_title:    input.title,
          p_body:     input.body ?? null,
          p_link:     input.link ?? null,
        },
      );
      if (error) throw error;
      return data as string | null;
    },
  });

  return {
    orders: ordersQuery.data ?? [],
    isLoading: ordersQuery.isLoading,
    error: ordersQuery.error,
    updateOrder,
    notifyClient,
  };
}

/** Fetch order_events history for a single order (separate query). */
export function useOrderEvents(orderId: string | null) {
  return useQuery<PartnerOrderEvent[]>({
    queryKey: ["order-events", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      if (!orderId) return [];
      const { data, error } = await supabase
        .from("order_events")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PartnerOrderEvent[];
    },
  });
}
