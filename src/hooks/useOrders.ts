import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sanitizePostgrest } from "@/lib/sanitizePostgrest";

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
  paymentReference: string | null;
  depositAmount: number | null;
  depositPercentage: number | null;
  balanceAmount: number | null;
  depositDueDate: string | null;
  depositPaidAt: string | null;
  balanceDueDate: string | null;
  balancePaidAt: string | null;
  invoiceNumber: string | null;
  paymentMethod: string | null;
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

      // Explicit column list — NEVER select("*") on orders from client context.
      // `commission_rate` and `commission_amount` must not transit on the wire
      // to the client browser (RLS allows row-wide read; Supabase has no
      // column-level RLS, so frontend acts as the security boundary). Dette 87.
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, product_name, product_id, quantity, unit_price, total_amount, status, " +
          "tracking_number, shipping_carrier, tracking_status, tracking_last_event, " +
          "tracking_last_checked, tracking_url, estimated_delivery_date, " +
          "payment_reference, deposit_amount, deposit_percent, balance_amount, " +
          "deposit_due_date, deposit_paid_at, balance_due_date, balance_paid_at, " +
          "invoice_number, payment_method, delivered_at, shipped_at, " +
          "production_confirmed_at, created_at, partner:partner_id(name)"
        )
        .or(`client_email.eq.${sanitizePostgrest(profile.email)},client_user_id.eq.${profile.id}`)
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
        paymentReference: row.payment_reference ?? null,
        depositAmount: row.deposit_amount,
        depositPercentage: row.deposit_percent ?? null,
        balanceAmount: row.balance_amount,
        depositDueDate: row.deposit_due_date ?? null,
        depositPaidAt: row.deposit_paid_at,
        balanceDueDate: row.balance_due_date,
        balancePaidAt: row.balance_paid_at,
        invoiceNumber: row.invoice_number ?? null,
        paymentMethod: row.payment_method ?? null,
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

      // Explicit column list — see useClientOrders comment above (Dette 87).
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, product_name, product_id, quantity, unit_price, total_amount, status, " +
          "tracking_number, shipping_carrier, tracking_status, tracking_last_event, " +
          "tracking_last_checked, tracking_url, estimated_delivery_date, " +
          "payment_reference, deposit_amount, deposit_percent, balance_amount, " +
          "deposit_due_date, deposit_paid_at, balance_due_date, balance_paid_at, " +
          "invoice_number, payment_method, delivered_at, shipped_at, " +
          "production_confirmed_at, created_at, partner:partner_id(name)"
        )
        .eq("id", orderId)
        .single();

      if (error || !data) return null;

      // Column-string selects don't narrow to the generated Order type.
      // Cast through `any` and map explicitly (same pattern as useClientOrders).
      const row = data as any;
      return {
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
        paymentReference: row.payment_reference ?? null,
        depositAmount: row.deposit_amount,
        depositPercentage: row.deposit_percent ?? null,
        balanceAmount: row.balance_amount,
        depositDueDate: row.deposit_due_date ?? null,
        depositPaidAt: row.deposit_paid_at,
        balanceDueDate: row.balance_due_date,
        balancePaidAt: row.balance_paid_at,
        invoiceNumber: row.invoice_number ?? null,
        paymentMethod: row.payment_method ?? null,
        deliveredAt: row.delivered_at,
        shippedAt: row.shipped_at,
        productionConfirmedAt: row.production_confirmed_at,
        createdAt: row.created_at,
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
