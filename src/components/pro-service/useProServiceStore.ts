import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  // Demo data — will be replaced with DB queries when tables exist
  MOCK_PROFESSIONALS,
  MOCK_ARCHITECT_REQUESTS,
  type ProProject, type ProConnection, type ProProfessional,
  type SupplierCall, type ArchitectRequest, type ConnectionStatus,
} from "./proServiceMockData";

// ── Store state ───────────────────────────────────────────────────────────────

export interface ProServiceStore {
  // Core data
  projects: ProProject[];
  connections: ProConnection[];
  architectRequests: ArchitectRequest[];
  supplierCalls: SupplierCall[];
  professionals: ProProfessional[];
  isLoading: boolean;

  // Actions
  addConnection: (conn: Omit<ProConnection, "id">) => void;
  updateConnectionStatus: (connId: string, status: ConnectionStatus) => void;
  addArchitectRequest: (req: ArchitectRequest) => void;
  declineProject: (projectId: string, professionalId: string) => void;
}

// ── Helpers: map DB rows to ProService types ──────────────────────────────────

function mapRequestToProject(row: any): ProProject {
  return {
    id: row.id,
    title: row.project_title || "Untitled project",
    clientType: row.project_type || "other",
    city: row.project_city || "",
    country: row.project_country || "",
    budget: row.budget_range || "",
    budgetNum: parseBudgetNum(row.budget_range),
    covers: row.quantity_estimate || 0,
    area: "",
    needs: row.categories_needed || [],
    style: (row.style_preferences || []).join(", "),
    timeline: row.timeline || "",
    status: mapRequestStatus(row.status),
    matchedCount: 0, // will be enriched below
    createdAt: row.created_at?.split("T")[0] || "",
    clientName: row.client_name || undefined,
    clientCompany: row.client_company || undefined,
  };
}

function parseBudgetNum(budget: string | null): number {
  if (!budget) return 0;
  const num = budget.replace(/[^0-9]/g, "");
  return parseInt(num, 10) || 0;
}

function mapRequestStatus(status: string | null): ProProject["status"] {
  const valid: ProProject["status"][] = ["submitted", "in_review", "matched", "connected", "completed", "declined"];
  if (status && valid.includes(status as any)) return status as ProProject["status"];
  if (status === "pending") return "submitted";
  if (status === "closed") return "completed";
  return "submitted";
}

function mapMatchToConnection(row: any): ProConnection {
  return {
    id: row.id,
    projectId: row.request_id,
    professionalId: row.partner_id,
    status: mapConnectionStatus(row.status),
    connectedAt: row.created_at?.split("T")[0] || "",
    message: row.partner_response || undefined,
  };
}

function mapConnectionStatus(status: string | null): ConnectionStatus {
  const valid: ConnectionStatus[] = ["pending", "accepted", "declined", "completed"];
  if (status && valid.includes(status as any)) return status as ConnectionStatus;
  return "pending";
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useProServiceStore(): ProServiceStore {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProProject[]>([]);
  const [connections, setConnections] = useState<ProConnection[]>([]);
  const [supplierCalls] = useState<SupplierCall[]>([]);
  const [architectRequests, setArchitectRequests] = useState<ArchitectRequest[]>(
    // Demo data — will be replaced when architect_requests table is created
    [...MOCK_ARCHITECT_REQUESTS]
  );
  const [isLoading, setIsLoading] = useState(true);

  // Demo data — no professionals table exists yet
  const professionals = MOCK_PROFESSIONALS;

  // ── Fetch projects from pro_service_requests ──────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      try {
        // Fetch pro_service_requests as projects
        const { data: requests, error: reqErr } = await supabase
          .from("pro_service_requests")
          .select("*")
          .order("created_at", { ascending: false });

        if (reqErr) {
          console.error("Failed to fetch pro_service_requests:", reqErr.message);
        }

        // Fetch pro_service_matches as connections
        const { data: matches, error: matchErr } = await supabase
          .from("pro_service_matches")
          .select("*")
          .order("created_at", { ascending: false });

        if (matchErr) {
          console.error("Failed to fetch pro_service_matches:", matchErr.message);
        }

        if (cancelled) return;

        // Map requests to projects
        const mappedProjects = (requests || []).map(mapRequestToProject);

        // Enrich matchedCount from matches
        const matchCountByRequest: Record<string, number> = {};
        (matches || []).forEach((m: any) => {
          matchCountByRequest[m.request_id] = (matchCountByRequest[m.request_id] || 0) + 1;
        });
        mappedProjects.forEach(p => {
          p.matchedCount = matchCountByRequest[p.id] || 0;
        });

        setProjects(mappedProjects);
        setConnections((matches || []).map(mapMatchToConnection));
      } catch (err) {
        console.error("ProServiceStore: error fetching data", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [user?.id]);

  // ── Actions (optimistic, local-only for now) ───────────────────────────────

  const addConnection = useCallback((conn: Omit<ProConnection, "id">) => {
    setConnections(prev => [
      ...prev,
      { ...conn, id: `conn-new-${Date.now()}` },
    ]);
  }, []);

  const updateConnectionStatus = useCallback((connId: string, status: ConnectionStatus) => {
    setConnections(prev =>
      prev.map(c => c.id === connId ? { ...c, status } : c)
    );
  }, []);

  const addArchitectRequest = useCallback((req: ArchitectRequest) => {
    setArchitectRequests(prev => [req, ...prev]);
  }, []);

  const declineProject = useCallback((projectId: string, professionalId: string) => {
    setConnections(prev => [
      ...prev,
      {
        id: `conn-decline-${Date.now()}`,
        projectId,
        professionalId,
        status: "declined" as ConnectionStatus,
        connectedAt: new Date().toISOString().split("T")[0],
      },
    ]);
  }, []);

  return {
    projects,
    connections,
    architectRequests,
    supplierCalls,
    professionals,
    isLoading,
    addConnection,
    updateConnectionStatus,
    addArchitectRequest,
    declineProject,
  };
}

// ── Derived data helpers (used by each hub) ───────────────────────────────────

export function getConnectionsForProfessional(connections: ProConnection[], professionalId: string) {
  return connections.filter(c => c.professionalId === professionalId);
}

export function getConnectionsForProjectFromStore(
  connections: ProConnection[],
  professionals: ProProfessional[],
  projectId: string,
) {
  return connections
    .filter(c => c.projectId === projectId)
    .map(c => ({
      ...c,
      professional: professionals.find(p => p.id === c.professionalId)!,
    }))
    .filter(c => c.professional);
}

export function getArchitectRequestsForClient(
  requests: ArchitectRequest[],
  _clientCompany: string,
) {
  // In a real app, filter by user ID. For now returns all.
  return requests;
}
