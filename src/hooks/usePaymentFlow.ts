import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  generatePaymentReference,
  generateInvoiceNumber,
  generatePaymentInstructions,
} from "@/lib/paymentUtils";

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

  // ── createOrderFromQuote ────────────────────────────────────────────────

  const createOrderFromQuote = useMutation({
    mutationFn: async (quoteRequestId: string) => {
      // 1. Read the quote request details
      const { data: quote, error: quoteErr } = await supabase
        .from("quote_requests")
        .select("*, partner:partner_id(name, contact_email)")
        .eq("id", quoteRequestId)
        .single();

      if (quoteErr || !quote) throw new Error("Quote request not found");

      const totalPrice = Number(quote.total_price ?? 0);
      if (totalPrice <= 0) throw new Error("Cannot create order with zero amount");
      const quantity = Number(quote.quantity ?? 1);
      const unitPrice = Number(quote.unit_price ?? 0);

      // 2. Calculate deposit and balance
      const depositAmount = Math.round((totalPrice * paymentSettings.depositPercent) / 100 * 100) / 100;
      const balanceAmount = Math.round((totalPrice - depositAmount) * 100) / 100;

      // 3. Generate references
      const paymentReference = generatePaymentReference();
      const invoiceNumber = generateInvoiceNumber();

      // Due dates
      const now = new Date();
      const depositDueDate = new Date(now.getTime() + paymentSettings.depositDueDays * 86_400_000);
      const balanceDueDate = new Date(now.getTime() + paymentSettings.balanceDueDays * 86_400_000);

      // 4. Insert into orders
      // Bug 3: quote_requests uses "email", not "client_email"
      const clientEmail = quote.email ?? user?.email ?? "";

      // Bug 4: quote_requests has no "client_user_id" column.
      // Look up the user_id from user_profiles by email, fallback to current user.
      let clientUserId: string | null = user?.id ?? null;
      if (clientEmail) {
        const { data: profileRow } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("email", clientEmail)
          .maybeSingle();
        if (profileRow?.id) clientUserId = profileRow.id;
      }

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          quote_request_id: quoteRequestId,
          product_name: quote.product_name,
          product_id: quote.product_id,
          partner_id: quote.partner_id,
          project_request_id: quote.project_request_id,
          client_email: clientEmail,
          client_user_id: clientUserId,
          quantity,
          unit_price: unitPrice,
          total_amount: totalPrice,
          deposit_amount: depositAmount,
          deposit_percent: paymentSettings.depositPercent,
          deposit_due_date: depositDueDate.toISOString(),
          balance_amount: balanceAmount,
          balance_due_date: balanceDueDate.toISOString(),
          payment_reference: paymentReference,
          invoice_number: invoiceNumber,
          payment_method: "bank_transfer",
          status: "pending_deposit",
        } as Record<string, unknown>)
        .select()
        .single();

      if (orderErr || !order) throw new Error(orderErr?.message ?? "Failed to create order");

      // 5. Insert order_event
      await supabase.from("order_events").insert({
        order_id: (order as Record<string, unknown>).id,
        event_type: "order_created",
        description: `Order created from quote ${quoteRequestId}. Payment reference: ${paymentReference}`,
        actor: user?.id ?? "system",
      } as Record<string, unknown>);

      // 6. Send payment instructions email via Edge Function
      const lang = localStorage.getItem("i18nextLng") ?? "en";
      const instructions = generatePaymentInstructions({
        reference: paymentReference,
        amount: depositAmount,
        beneficiary: paymentSettings.beneficiary,
        iban: paymentSettings.iban,
        bic: paymentSettings.bic,
        bankName: paymentSettings.bankName,
        dueDate: depositDueDate.toLocaleDateString(lang === "en" ? "en-GB" : lang),
        lang,
      });

      try {
        await supabase.functions.invoke("send-notification-email", {
          body: {
            to: clientEmail,
            subject: instructions.subject,
            body_html: instructions.bodyHtml,
            body_text: instructions.bodyText,
          },
        });
      } catch {
        // Email sending is non-blocking; log but don't throw
        console.warn("Failed to send payment instructions email");
      }

      // 7. Create in-app notification for the client
      if (clientUserId) {
        await supabase.from("notifications").insert({
          user_id: clientUserId,
          title: "Order created",
          body: `Your order for ${quote.product_name} has been created. Please proceed with the deposit payment.`,
          type: "order_update",
          link: `/account?tab=orders`,
        } as Record<string, unknown>);
      }

      // 8. Return the order
      return order as Record<string, unknown>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-orders"] });
      queryClient.invalidateQueries({ queryKey: ["partner-quotes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-order-events"] });
    },
    onError: (err: any) => {
      console.error("Failed to create order:", err);
    },
  });

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
      } as Record<string, unknown>);

      // 3. Notify client
      const { data: order } = await supabase
        .from("orders")
        .select("client_user_id, product_name")
        .eq("id", orderId)
        .single();

      if (order?.client_user_id) {
        await supabase.from("notifications").insert({
          user_id: order.client_user_id,
          title: "Deposit confirmed",
          body: `Your deposit for ${order.product_name} has been confirmed. Production is starting.`,
          type: "order_update",
          link: `/account?tab=orders`,
        } as Record<string, unknown>);
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
          status: "paid",
        })
        .eq("id", orderId);

      if (updateErr) throw updateErr;

      // 2. Insert order event
      await supabase.from("order_events").insert({
        order_id: orderId,
        event_type: "balance_confirmed",
        description: "Balance payment confirmed. Order is fully paid.",
        actor: user?.id ?? "system",
      } as Record<string, unknown>);

      // 3. Notify client
      const { data: order } = await supabase
        .from("orders")
        .select("client_user_id, product_name")
        .eq("id", orderId)
        .single();

      if (order?.client_user_id) {
        await supabase.from("notifications").insert({
          user_id: order.client_user_id,
          title: "Balance payment confirmed",
          body: `Your balance payment for ${order.product_name} has been confirmed. Your order is fully paid.`,
          type: "order_update",
          link: `/account?tab=orders`,
        } as Record<string, unknown>);
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
    createOrderFromQuote: createOrderFromQuote.mutate,
    createOrderFromQuoteAsync: createOrderFromQuote.mutateAsync,
    isCreatingOrder: createOrderFromQuote.isPending,
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
