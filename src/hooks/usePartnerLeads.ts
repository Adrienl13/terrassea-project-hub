import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PartnerLead {
  id: string;              // match id
  request_id: string;
  project_title: string;
  project_type: string;
  project_city: string;
  project_country: string;
  categories_needed: string[];
  style_preferences: string[];
  budget_range: string | null;
  quantity_estimate: number | null;
  timeline: string | null;
  description: string | null;
  match_score: number;
  match_status: string;    // sent_to_partner | partner_interested | client_connected | declined
  created_at: string;
}

// Map DB match status → UI match_status
function mapMatchStatus(dbStatus: string | null): string {
  switch (dbStatus) {
    case "suggested": return "sent_to_partner";
    case "interested": return "partner_interested";
    case "connected": return "client_connected";
    case "declined": return "declined";
    default: return "sent_to_partner";
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function usePartnerLeads() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Find partner_id linked to this user's email (same pattern as usePartnerQuotes)
  const { data: partnerId } = useQuery({
    queryKey: ["partner-id-for-user", profile?.email],
    queryFn: async () => {
      if (!profile?.email) return null;
      const { data, error } = await supabase
        .from("partners")
        .select("id")
        .eq("contact_email", profile.email)
        .single();
      if (error) {
        console.error("Failed to find partner for user:", error.message);
        return null;
      }
      return data?.id || null;
    },
    enabled: !!profile?.email,
  });

  // Fetch leads (matches + joined request data) for this partner
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["partner-leads", partnerId],
    queryFn: async () => {
      if (!partnerId) return [];
      const { data, error } = await supabase
        .from("pro_service_matches")
        .select("id, request_id, score_total, status, created_at, request:request_id(project_title, project_type, project_city, project_country, categories_needed, style_preferences, budget_range, quantity_estimate, timeline, description)")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Failed to fetch partner leads:", error);
        return [];
      }
      return (data || []).map((m: any): PartnerLead => ({
        id: m.id,
        request_id: m.request_id,
        project_title: m.request?.project_title || "Untitled project",
        project_type: m.request?.project_type || "other",
        project_city: m.request?.project_city || "",
        project_country: m.request?.project_country || "France",
        categories_needed: m.request?.categories_needed || [],
        style_preferences: m.request?.style_preferences || [],
        budget_range: m.request?.budget_range || null,
        quantity_estimate: m.request?.quantity_estimate || null,
        timeline: m.request?.timeline || null,
        description: m.request?.description || null,
        match_score: m.score_total || 0,
        match_status: mapMatchStatus(m.status),
        created_at: m.created_at,
      }));
    },
    enabled: !!partnerId,
  });

  // Express interest in a lead
  const expressInterestMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await supabase
        .from("pro_service_matches")
        .update({
          status: "interested",
          partner_response: "interested",
          partner_responded_at: new Date().toISOString(),
        })
        .eq("id", matchId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-leads", partnerId] });
    },
  });

  // Decline a lead
  const declineLeadMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await supabase
        .from("pro_service_matches")
        .update({
          status: "declined",
          partner_response: "declined",
          partner_responded_at: new Date().toISOString(),
        })
        .eq("id", matchId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-leads", partnerId] });
    },
  });

  return {
    partnerId,
    leads,
    isLoading,
    expressInterest: expressInterestMutation.mutate,
    isExpressing: expressInterestMutation.isPending,
    declineLead: declineLeadMutation.mutate,
    isDeclining: declineLeadMutation.isPending,
  };
}
