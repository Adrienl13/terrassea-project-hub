import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  generatePaymentReference,
  generateInvoiceNumber,
  generatePaymentInstructions,
} from "@/lib/paymentUtils";
import { COMMISSION_BY_PLAN } from "@/lib/partnerConstants";

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

      // 1b. Resolve commission rate via v_effective_commissions (brand-distributor)
      //     or fall back to the distributor's plan-based commission from partner_subscriptions.
      let commissionRate = 8; // default fallback (starter plan)

      if (quote.partner_id) {
        let found = false;

        // If the product belongs to a brand, look up the brand-distributor effective rate
        if (quote.product_id) {
          const { data: product } = await supabase
            .from("products")
            .select("partner_id")
            .eq("id", quote.product_id)
            .maybeSingle();

          if (product?.partner_id) {
            const { data: ec } = await supabase
              .from("v_effective_commissions" as any)
              .select("effective_commission_rate")
              .eq("brand_id", product.partner_id)
              .eq("distributor_id", quote.partner_id)
              .maybeSingle() as { data: { effective_commission_rate: number } | null };

            if (ec?.effective_commission_rate != null) {
              commissionRate = Number(ec.effective_commission_rate);
              found = true;
            }
          }
        }

        // Fallback: use the distributor's plan-based commission from partner_subscriptions
        if (!found) {
          const { data: sub } = await supabase
            .from("partner_subscriptions")
            .select("commission_rate")
            .eq("partner_id", quote.partner_id)
            .maybeSingle();

          if (sub?.commission_rate != null) {
            commissionRate = Number(sub.commission_rate);
          } else {
            // Last resort: plan-based hardcoded fallback
            const { data: partnerRow } = await supabase
              .from("partners")
              .select("plan")
              .eq("id", quote.partner_id)
              .maybeSingle();
            if (partnerRow?.plan && COMMISSION_BY_PLAN[partnerRow.plan] !== undefined) {
              commissionRate = COMMISSION_BY_PLAN[partnerRow.plan];
            }
          }
        }
      }

      const commissionAmount = Math.round((totalPrice * commissionRate) / 100 * 100) / 100;

      // 2. Calculate deposit and balance
      const depositAmount = Math.round((totalPrice * paymentSettings.depositPercent) / 100 * 100) / 100;
      const balanceAmount = Math.round((totalPrice - depositAmount) * 100) / 100;

      // 3. Generate references (sequential via DB)
      const paymentReference = await generatePaymentReference();
      const invoiceNumber = await generateInvoiceNumber();

      // Due dates
      const now = new Date();
      const depositDueDate = new Date(now.getTime() + paymentSettings.depositDueDays * 86_400_000);
      const balanceDueDate = new Date(now.getTime() + paymentSettings.balanceDueDays * 86_400_000);

      // Partner response terms (contractual data from quote)
      const tvaRate = quote.tva_rate != null ? Number(quote.tva_rate) : null;
      const deliveryDelayDays = quote.delivery_delay_days != null ? Number(quote.delivery_delay_days) : null;
      const deliveryConditions = quote.delivery_conditions ?? null;
      const paymentConditions = quote.payment_conditions ?? null;
      const partnerConditions = quote.partner_conditions ?? null;

      // Compute estimated delivery date from partner's delivery delay
      const estimatedDeliveryDate = deliveryDelayDays
        ? new Date(now.getTime() + deliveryDelayDays * 86_400_000).toISOString().split("T")[0]
        : null;

      // 4. Insert into orders
      const clientEmail = quote.email ?? user?.email ?? "";

      // Use client_user_id from quote if available, else look up by email, fallback to current user
      let clientUserId: string | null = quote.client_user_id ?? user?.id ?? null;
      if (!clientUserId && clientEmail) {
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
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          tva_rate: tvaRate,
          delivery_delay_days: deliveryDelayDays,
          estimated_delivery_date: estimatedDeliveryDate,
          delivery_conditions: deliveryConditions,
          payment_conditions: paymentConditions,
          partner_conditions: partnerConditions,
          payment_method: "bank_transfer",
          status: "pending_deposit",
        })
        .select("id")
        .single();

      if (orderErr || !order) throw new Error(orderErr?.message ?? "Failed to create order");

      // 5. Insert order_event
      await supabase.from("order_events").insert({
        order_id: order.id,
        event_type: "order_created",
        description: `Order created from quote ${quoteRequestId}. Payment reference: ${paymentReference}`,
        actor: user?.id ?? "system",
      });

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
        // Email sending is non-blocking
      }

      // 7. Create in-app notification for the client
      if (clientUserId) {
        await supabase.from("notifications").insert({
          user_id: clientUserId,
          title: "Order created",
          body: `Your order for ${quote.product_name} has been created. Please proceed with the deposit payment.`,
          type: "order_update",
          link: `/account?tab=orders`,
        });
      }

      // 8. Notify partner that their quote was accepted and order created
      const partnerJoin = quote.partner as { name?: string; contact_email?: string } | null;
      if (quote.partner_id) {
        const { data: partnerProfile } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("email", partnerJoin?.contact_email ?? "")
          .maybeSingle();

        if (partnerProfile?.id) {
          await supabase.from("notifications").insert({
            user_id: partnerProfile.id,
            title: "Devis accepté — commande créée",
            body: `Votre devis pour ${quote.product_name} (${quantity} pcs, €${totalPrice.toLocaleString()}) a été accepté. Une commande a été créée.`,
            type: "order_update",
            link: `/account?tab=quotes`,
          });
        }

        // Send email to partner
        try {
          await supabase.functions.invoke("send-notification-email", {
            body: {
              to: partnerJoin?.contact_email,
              subject: `Devis accepté — commande #${order.id?.slice(0, 8)}`,
              body_html: `<p>Votre devis pour <strong>${quote.product_name}</strong> (${quantity} pcs, €${totalPrice.toLocaleString()}) a été accepté par le client.</p><p>Une commande a été créée. Le client procède au paiement de l'acompte.</p>`,
              body_text: `Votre devis pour ${quote.product_name} (${quantity} pcs, €${totalPrice.toLocaleString()}) a été accepté. Une commande a été créée.`,
            },
          });
        } catch {
          // Non-blocking
        }
      }

      // 9. Return the order
      return order;
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
      });

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
        await supabase.from("notifications").insert({
          user_id: order.client_user_id,
          title: "Balance payment confirmed",
          body: `Your balance payment for ${order.product_name} has been confirmed. Your order is fully paid.`,
          type: "order_update",
          link: `/account?tab=orders`,
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
