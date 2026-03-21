import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ClientOrder {
  id: string;
  productName: string;
  productId: string | null;
  partnerName: string | null;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number;
  status: string; // pending, confirmed, production, shipped, delivered, cancelled
  trackingNumber: string | null;
  shippingCarrier: string | null;
  trackingStatus: string | null;
  trackingLastEvent: string | null;
  trackingLastChecked: string | null;
  trackingUrl: string | null;
  estimatedDelivery: string | null;
  depositAmount: number | null;
  depositPaidAt: string | null;
  balanceAmount: number | null;
  balanceDueDate: string | null;
  balancePaidAt: string | null;
  deliveredAt: string | null;
  shippedAt: string | null;
  productionConfirmedAt: string | null;
  createdAt: string;
}

export interface OrderEvent {
  id: string;
  eventType: string;
  description: string | null;
  actor: string | null;
  createdAt: string;
}

// ── useClientOrders ────────────────────────────────────────────────────────────

export function useClientOrders() {
  const { profile } = useAuth();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["client-orders", profile?.email],
    queryFn: async () => {
      if (!profile?.email) return [];

      const { data, error } = await supabase
        .from("orders")
        .select("*, partner:partner_id(name)")
        .or(`client_email.eq.${profile.email},client_user_id.eq.${profile.id}`)
        .order("created_at", { ascending: false });

      if (error || !data) return [];

      return data.map((row: any): ClientOrder => ({
        id: row.id,
        productName: row.product_name,
        productId: row.product_id,
        partnerName: row.partner?.name ?? null,
        quantity: row.quantity,
        unitPrice: row.unit_price,
        totalPrice: row.total_amount,
        status: row.status,
        trackingNumber: row.tracking_number,
        shippingCarrier: row.shipping_carrier,
        trackingStatus: row.tracking_status,
        trackingLastEvent: row.tracking_last_event,
        trackingLastChecked: row.tracking_last_checked,
        trackingUrl: row.tracking_url,
        estimatedDelivery: row.estimated_delivery_date,
        depositAmount: row.deposit_amount,
        depositPaidAt: row.deposit_paid_at,
        balanceAmount: row.balance_amount,
        balanceDueDate: row.balance_due_date,
        balancePaidAt: row.balance_paid_at,
        deliveredAt: row.delivered_at,
        shippedAt: row.shipped_at,
        productionConfirmedAt: row.production_confirmed_at,
        createdAt: row.created_at,
      }));
    },
    enabled: !!profile?.email,
  });

  return { orders, isLoading };
}

// ── useOrderDetail ─────────────────────────────────────────────────────────────

export function useOrderDetail(orderId: string | null) {
  const { data: order = null, isLoading: orderLoading } = useQuery({
    queryKey: ["order-detail", orderId],
    queryFn: async () => {
      if (!orderId) return null;

      const { data, error } = await supabase
        .from("orders")
        .select("*, partner:partner_id(name)")
        .eq("id", orderId)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        productName: data.product_name,
        productId: data.product_id,
        partnerName: (data as any).partner?.name ?? null,
        quantity: data.quantity,
        unitPrice: data.unit_price,
        totalPrice: data.total_amount,
        status: data.status,
        trackingNumber: data.tracking_number,
        shippingCarrier: data.shipping_carrier,
        trackingStatus: data.tracking_status,
        trackingLastEvent: data.tracking_last_event,
        trackingLastChecked: data.tracking_last_checked,
        trackingUrl: data.tracking_url,
        estimatedDelivery: data.estimated_delivery_date,
        depositAmount: data.deposit_amount,
        depositPaidAt: data.deposit_paid_at,
        balanceAmount: data.balance_amount,
        balanceDueDate: data.balance_due_date,
        balancePaidAt: data.balance_paid_at,
        deliveredAt: data.delivered_at,
        shippedAt: data.shipped_at,
        productionConfirmedAt: data.production_confirmed_at,
        createdAt: data.created_at,
      } as ClientOrder;
    },
    enabled: !!orderId,
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["order-events", orderId],
    queryFn: async () => {
      if (!orderId) return [];

      const { data, error } = await supabase
        .from("order_events")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      if (error || !data) return [];

      return data.map((row: any): OrderEvent => ({
        id: row.id,
        eventType: row.event_type,
        description: row.description,
        actor: row.actor,
        createdAt: row.created_at,
      }));
    },
    enabled: !!orderId,
  });

  return { order, events, isLoading: orderLoading || eventsLoading };
}
