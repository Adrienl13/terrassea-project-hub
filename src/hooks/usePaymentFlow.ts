import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ── Types ───────────────────────────────────────────────────────────────────

interface PaymentSettings {
  iban: string;
  bic: string;
  bankName: string;
  beneficiary: string;
  depositPercent: number;
  depositDueDays: number;
  balanceDueDays: number;
}

const DEFAULT_SETTINGS: PaymentSettings = {
  iban: "",
  bic: "",
  bankName: "",
  beneficiary: "Terrassea SAS",
  depositPercent: 30,
  depositDueDays: 7,
  balanceDueDays: 30,
};

// ── Hook ────────────────────────────────────────────────────────────────────

export function usePaymentFlow() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ── Read payment settings from platform_settings ────────────────────────

  const { data: paymentSettings = DEFAULT_SETTINGS, isLoading } = useQuery<PaymentSettings>({
    queryKey: ["payment-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("key, value")
        .eq("category", "payment");

      if (error || !data) return DEFAULT_SETTINGS;

      const map: Record<string, unknown> = {};
      for (const row of data) {
        map[row.key] = row.value;
      }

      return {
        iban: String(map["iban"] ?? DEFAULT_SETTINGS.iban),
        bic: String(map["bic"] ?? DEFAULT_SETTINGS.bic),
        bankName: String(map["bank_name"] ?? DEFAULT_SETTINGS.bankName),
        beneficiary: String(map["beneficiary"] ?? DEFAULT_SETTINGS.beneficiary),
        depositPercent: Number(map["deposit_percent"] ?? DEFAULT_SETTINGS.depositPercent),
        depositDueDays: Number(map["deposit_due_days"] ?? DEFAULT_SETTINGS.depositDueDays),
        balanceDueDays: Number(map["balance_due_days"] ?? DEFAULT_SETTINGS.balanceDueDays),
      };
    },
    staleTime: 5 * 60 * 1000, // cache 5 min
  });

  // ── createOrderFromQuote removed in Dette 74 ────────────────────────────
  // The auto_create_order_on_signature DB trigger now produces a complete
  // order on every signature (UPDATE quote_requests.signed_at NULL → not-null).
  // It populates payment_reference, invoice_number, due_dates, tva_rate,
  // delivery_conditions, etc. — equivalent to what this mutation used to do.
  // Frontend code is no longer responsible for order creation.

  // ── confirmDeposit ──────────────────────────────────────────────────────

  const confirmDeposit = useMutation({
    mutationFn: async (orderId: string) => {
      // 1. Update the order
      const { error: updateErr } = await supabase
        .from("orders")
        .update({
          deposit_paid_at: new Date().toISOString(),
          status: "deposit_paid",
        })
        .eq("id", orderId);

      if (updateErr) throw updateErr;

      // 2. Insert order event
      await supabase.from("order_events").insert({
        order_id: orderId,
        event_type: "deposit_confirmed",
        description: "Deposit payment confirmed. Production can begin.",
        actor: user?.id ?? "system",
      });

      // 3. Notify client
      const { data: order } = await supabase
        .from("orders")
        .select("client_user_id, product_name")
        .eq("id", orderId)
        .single();

      if (order?.client_user_id) {
        await supabase.rpc("create_admin_notification", {
          p_user_id: order.client_user_id,
          p_type: "order_update",
          p_title: "Deposit confirmed",
          p_body: `Your deposit for ${order.product_name} has been confirmed. Production is starting.`,
          p_link: `/account?tab=orders`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-detail"] });
      queryClient.invalidateQueries({ queryKey: ["order-events"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-order-events"] });
    },
  });

  // ── confirmBalance ──────────────────────────────────────────────────────

  const confirmBalance = useMutation({
    mutationFn: async (orderId: string) => {
      // 1. Update the order
      const { error: updateErr } = await supabase
        .from("orders")
        .update({
          balance_paid_at: new Date().toISOString(),
          status: "completed",
        })
        .eq("id", orderId);

      if (updateErr) throw updateErr;

      // 2. Insert order event
      await supabase.from("order_events").insert({
        order_id: orderId,
        event_type: "balance_confirmed",
        description: "Balance payment confirmed. Order is fully paid.",
        actor: user?.id ?? "system",
      });

      // 3. Notify client
      const { data: order } = await supabase
        .from("orders")
        .select("client_user_id, product_name")
        .eq("id", orderId)
        .single();

      if (order?.client_user_id) {
        await supabase.rpc("create_admin_notification", {
          p_user_id: order.client_user_id,
          p_type: "order_update",
          p_title: "Balance payment confirmed",
          p_body: `Your balance payment for ${order.product_name} has been confirmed. Your order is fully paid.`,
          p_link: `/account?tab=orders`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-detail"] });
      queryClient.invalidateQueries({ queryKey: ["order-events"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-order-events"] });
    },
  });

  return {
    confirmDeposit: confirmDeposit.mutate,
    confirmDepositAsync: confirmDeposit.mutateAsync,
    isConfirmingDeposit: confirmDeposit.isPending,
    confirmBalance: confirmBalance.mutate,
    confirmBalanceAsync: confirmBalance.mutateAsync,
    isConfirmingBalance: confirmBalance.isPending,
    paymentSettings,
    isLoading,
  };
}
