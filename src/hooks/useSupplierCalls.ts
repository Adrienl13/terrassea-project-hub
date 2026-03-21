import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SupplierCall {
  id: string;
  projectTitle: string;
  projectType: string;
  clientName: string;
  budget: string;
  deadline: string;
  brief: string;
  categoriesNeeded: string[];
  stylePreferences: string[];
  status: string;
  urgency: string;
  responsesCount: number;
  views: number;
  clicks: number;
  createdAt: string;
}

export interface SupplierResponse {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerCountry: string | null;
  partnerLogo: string | null;
  partnerType: string | null;
  message: string | null;
  estimatedAmount: number | null;
  deliveryWeeks: number | null;
  warranty: string | null;
  products: any[];
  isSelected: boolean;
  createdAt: string;
}

// ── Helper: map DB row to SupplierCall ─────────────────────────────────────────

function mapRowToCall(
  row: any,
  responsesCount: number,
  views: number,
  clicks: number,
): SupplierCall {
  return {
    id: row.id,
    projectTitle: row.project_title,
    projectType: row.project_type,
    clientName: row.client_name,
    budget: row.budget_range ?? "",
    deadline: row.timeline ?? "",
    brief: row.description ?? "",
    categoriesNeeded: row.categories_needed ?? [],
    stylePreferences: row.style_preferences ?? [],
    status: row.status ?? "pending",
    urgency: row.timeline ?? "",
    responsesCount,
    views,
    clicks,
    createdAt: row.created_at ?? "",
  };
}

// ── Hook 1: useSupplierCalls (for architects) ──────────────────────────────────

export function useSupplierCalls() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all calls created by this architect, with metrics
  const {
    data: calls = [],
    isLoading,
  } = useQuery<SupplierCall[]>({
    queryKey: ["supplier-calls", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // 1. Fetch requests
      const { data: requests, error: reqErr } = await supabase
        .from("pro_service_requests")
        .select("*")
        .eq("architect_id", user.id)
        .order("created_at", { ascending: false });

      if (reqErr) {
        console.error("Failed to fetch supplier calls:", reqErr.message);
        return [];
      }
      if (!requests || requests.length === 0) return [];

      const requestIds = requests.map((r) => r.id);

      // 2. Fetch response counts per request
      const { data: responses } = await supabase
        .from("pro_service_responses")
        .select("request_id")
        .in("request_id", requestIds);

      const responseCounts: Record<string, number> = {};
      (responses ?? []).forEach((r) => {
        responseCounts[r.request_id] = (responseCounts[r.request_id] || 0) + 1;
      });

      // 3. Fetch event metrics per request
      const { data: events } = await supabase
        .from("pro_service_events")
        .select("request_id, event_type")
        .in("request_id", requestIds);

      const viewCounts: Record<string, number> = {};
      const clickCounts: Record<string, number> = {};
      (events ?? []).forEach((e) => {
        if (e.event_type === "view") {
          viewCounts[e.request_id] = (viewCounts[e.request_id] || 0) + 1;
        } else if (e.event_type === "click") {
          clickCounts[e.request_id] = (clickCounts[e.request_id] || 0) + 1;
        }
      });

      return requests.map((r) =>
        mapRowToCall(
          r,
          responseCounts[r.id] || 0,
          viewCounts[r.id] || 0,
          clickCounts[r.id] || 0,
        ),
      );
    },
    enabled: !!user?.id,
  });

  // Create a new call
  const createCallMutation = useMutation({
    mutationFn: async (
      data: Omit<
        Parameters<typeof supabase.from<"pro_service_requests">>[0] extends string
          ? Record<string, unknown>
          : Record<string, unknown>,
        "architect_id"
      > & {
        project_title: string;
        project_type: string;
        client_name: string;
        client_email: string;
        budget_range?: string | null;
        timeline?: string | null;
        description?: string | null;
        categories_needed?: string[] | null;
        style_preferences?: string[] | null;
        quantity_estimate?: number | null;
        project_city?: string | null;
        project_country?: string | null;
        outdoor_required?: boolean | null;
        special_requirements?: string | null;
      },
    ) => {
      const { error } = await supabase
        .from("pro_service_requests")
        .insert({ ...data, architect_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-calls", user?.id] });
    },
  });

  // Update a call
  const updateCallMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Record<string, unknown>;
    }) => {
      const { error } = await supabase
        .from("pro_service_requests")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-calls", user?.id] });
    },
  });

  // Close a call
  const closeCallMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pro_service_requests")
        .update({ status: "closed" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-calls", user?.id] });
    },
  });

  // Select a response (mark one as selected, un-select others for the same request)
  const selectResponseMutation = useMutation({
    mutationFn: async (responseId: string) => {
      // Find the response to get its request_id
      const { data: resp, error: fetchErr } = await supabase
        .from("pro_service_responses")
        .select("request_id")
        .eq("id", responseId)
        .single();
      if (fetchErr || !resp) throw fetchErr ?? new Error("Response not found");

      // Un-select all responses for this request
      const { error: unselectErr } = await supabase
        .from("pro_service_responses")
        .update({ is_selected: false })
        .eq("request_id", resp.request_id);
      if (unselectErr) throw unselectErr;

      // Select the chosen one
      const { error: selectErr } = await supabase
        .from("pro_service_responses")
        .update({ is_selected: true })
        .eq("id", responseId);
      if (selectErr) throw selectErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-calls", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["supplier-call-detail"] });
    },
  });

  // Get full call detail with responses + partner info
  const getCallDetail = (callId: string) =>
    useQuery<{ call: SupplierCall | null; responses: SupplierResponse[] }>({
      queryKey: ["supplier-call-detail", callId],
      queryFn: async () => {
        // Fetch request
        const { data: req, error: reqErr } = await supabase
          .from("pro_service_requests")
          .select("*")
          .eq("id", callId)
          .single();
        if (reqErr || !req) return { call: null, responses: [] };

        // Fetch events for metrics
        const { data: events } = await supabase
          .from("pro_service_events")
          .select("event_type")
          .eq("request_id", callId);

        let views = 0;
        let clicks = 0;
        (events ?? []).forEach((e) => {
          if (e.event_type === "view") views++;
          else if (e.event_type === "click") clicks++;
        });

        // Fetch response count
        const { data: allResponses } = await supabase
          .from("pro_service_responses")
          .select("id")
          .eq("request_id", callId);

        const call = mapRowToCall(req, allResponses?.length ?? 0, views, clicks);

        // Fetch responses joined with partner info
        const { data: responsesRaw } = await supabase
          .from("pro_service_responses")
          .select(
            "id, partner_id, message, estimated_amount, delivery_weeks, warranty, products, is_selected, created_at, partner:partner_id(name, country, logo_url, partner_type)",
          )
          .eq("request_id", callId)
          .order("created_at", { ascending: false });

        const responses: SupplierResponse[] = (responsesRaw ?? []).map(
          (r: any) => ({
            id: r.id,
            partnerId: r.partner_id,
            partnerName: r.partner?.name ?? "",
            partnerCountry: r.partner?.country ?? null,
            partnerLogo: r.partner?.logo_url ?? null,
            partnerType: r.partner?.partner_type ?? null,
            message: r.message,
            estimatedAmount: r.estimated_amount,
            deliveryWeeks: r.delivery_weeks,
            warranty: r.warranty,
            products: Array.isArray(r.products) ? r.products : [],
            isSelected: r.is_selected ?? false,
            createdAt: r.created_at ?? "",
          }),
        );

        return { call, responses };
      },
      enabled: !!callId,
    });

  return {
    calls,
    isLoading,
    createCall: createCallMutation.mutateAsync,
    isCreating: createCallMutation.isPending,
    updateCall: (id: string, data: Record<string, unknown>) =>
      updateCallMutation.mutateAsync({ id, data }),
    isUpdating: updateCallMutation.isPending,
    closeCall: closeCallMutation.mutateAsync,
    isClosing: closeCallMutation.isPending,
    selectResponse: selectResponseMutation.mutateAsync,
    isSelectingResponse: selectResponseMutation.isPending,
    getCallDetail,
  };
}

// ── Hook 2: useTrackCallEvent ──────────────────────────────────────────────────

export function useTrackCallEvent() {
  const { user } = useAuth();

  const mutation = useMutation({
    mutationFn: async ({
      requestId,
      eventType,
    }: {
      requestId: string;
      eventType: string;
    }) => {
      const { error } = await supabase.from("pro_service_events").insert({
        request_id: requestId,
        event_type: eventType,
        actor_id: user?.id ?? null,
      });
      if (error) throw error;
    },
  });

  return {
    trackEvent: (requestId: string, eventType: string) =>
      mutation.mutateAsync({ requestId, eventType }),
    isTracking: mutation.isPending,
  };
}
