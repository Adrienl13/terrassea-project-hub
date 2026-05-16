import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PartnerQuoteRequest {
  id: string;
  product_name: string;
  product_id: string | null;
  quantity: number;
  unit_price: number | null;
  total_price: number | null;
  status: string;
  message: string | null;
  created_at: string;
  // Client info (anonymized)
  client_first_name: string | null;
  client_city: string | null;
  client_anonymous_id: string | null;
  // Project info
  project_name: string | null;
  project_venue_type: string | null;
  // PDF
  latest_pdf_path: string | null;
  signed_at: string | null;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function usePartnerQuotes() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { user } = useAuth();

  // Find partner_id linked to this user (by user_id first, then contact_email fallback)
  const { data: partnerId } = useQuery({
    queryKey: ["partner-id-for-user", user?.id, profile?.email],
    queryFn: async () => {
      // Try by user_id first (matches RLS policy)
      if (user?.id) {
        const { data } = await supabase
          .from("partners")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data?.id) return data.id;
      }
      // Fallback: try by contact_email
      if (profile?.email) {
        const { data } = await supabase
          .from("partners")
          .select("id")
          .eq("contact_email", profile.email)
          .maybeSingle();
        if (data?.id) return data.id;
      }
      return null;
    },
    enabled: !!user?.id || !!profile?.email,
  });

  // Fetch quote requests assigned to this partner
  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["partner-quotes", partnerId],
    queryFn: async () => {
      if (!partnerId) return [];
      const { data, error } = await supabase
        .from("quote_requests")
        .select("id, product_name, product_id, quantity, unit_price, total_price, status, message, created_at, client_first_name, client_city, client_anonymous_id, latest_pdf_path, signed_at, project_request_id, project:project_request_id(project_name, venue_type)")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false });
      if (error) { console.error(error); return []; }
      return (data || []).map((q: any) => ({
        ...q,
        project_name: q.project?.project_name || null,
        project_venue_type: q.project?.venue_type || null,
      })) as PartnerQuoteRequest[];
    },
    enabled: !!partnerId,
  });

  // Update quote with structured fields
  const updateStatus = useMutation({
    mutationFn: async (params: {
      quoteId: string;
      status: string;
      unitPrice?: number;
      totalPrice?: number;
      tvaRate?: number;
      deliveryDelayDays?: number;
      deliveryConditions?: string;
      paymentConditions?: string;
      validityDays?: number;
      partnerConditions?: string;
    }) => {
      const { quoteId, status, unitPrice, totalPrice, tvaRate, deliveryDelayDays, deliveryConditions, paymentConditions, validityDays, partnerConditions } = params;
      // Partner updates route through update_quote_as_partner RPC (red-team
      // H4, 2026-05-16). The direct .from("quote_requests").update() path is
      // blocked at the RLS layer — the RPC enforces the column whitelist and
      // owner check, and protect_signed_quote_requests blocks identity /
      // signature fields at the trigger layer.
      const { error } = await supabase.rpc("update_quote_as_partner" as any, {
        p_quote_id: quoteId,
        p_status: status ?? null,
        p_unit_price: unitPrice ?? null,
        p_total_price: totalPrice ?? null,
        p_tva_rate: tvaRate ?? null,
        p_delivery_delay_days: deliveryDelayDays ?? null,
        p_delivery_conditions: deliveryConditions ?? null,
        p_payment_conditions: paymentConditions ?? null,
        p_partner_conditions: partnerConditions ?? null,
        p_validity_days: validityDays ?? null,
      });
      if (error) throw error;

      // Email is now sent server-side by notify_quote_status_changed when
      // status flips to 'replied' (Dette 59 Lot A).
      // The in-app notification is still created here via the existing RPC
      // because Dette 19 Phase 2B.1 documented this path explicitly.
      if (status === "replied") {
        try {
          const { data: quote } = await supabase
            .from("quote_requests")
            .select("product_name")
            .eq("id", quoteId)
            .single();

          await supabase.rpc("create_quote_notification_to_client", {
            p_quote_id: quoteId,
            p_type: "info",
            p_title: "Devis re\u00e7u",
            p_body: `Un fournisseur a r\u00e9pondu \u00e0 votre demande pour ${quote?.product_name ?? ""}`,
            p_link: "/account?tab=quotes",
          });
        } catch {
          // Non-blocking: in-app notification failed silently
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-quotes", partnerId] });
    },
  });

  // Stats
  const received = quotes.filter(q => q.status === "pending").length;
  const replied = quotes.filter(q => q.status === "replied").length;
  const signed = quotes.filter(q => q.status === "signed" || q.signed_at).length;
  const totalRevenue = quotes.filter(q => ["replied", "accepted", "signed"].includes(q.status))
    .reduce((s, q) => s + Number(q.total_price || 0), 0);

  return {
    partnerId,
    quotes,
    isLoading,
    received,
    replied,
    signed,
    totalRevenue,
    updateStatus: updateStatus.mutate,
    isUpdating: updateStatus.isPending,
  };
}
