import { useState, useCallback, useMemo } from "react";
import {
  MOCK_PROJECTS, MOCK_CONNECTIONS, MOCK_PROFESSIONALS,
  MOCK_SUPPLIER_CALLS, MOCK_ARCHITECT_REQUESTS, MOCK_PORTFOLIO_EXTRAS,
  type ProProject, type ProConnection, type ProProfessional,
  type SupplierCall, type ArchitectRequest, type ConnectionStatus,
} from "./proServiceMockData";

// ── Store state ───────────────────────────────────────────────────────────────

export interface ProServiceStore {
  // Core data (mutable copies of mock data)
  projects: ProProject[];
  connections: ProConnection[];
  architectRequests: ArchitectRequest[];
  supplierCalls: SupplierCall[];
  professionals: ProProfessional[];

  // Actions
  addConnection: (conn: Omit<ProConnection, "id">) => void;
  updateConnectionStatus: (connId: string, status: ConnectionStatus) => void;
  addArchitectRequest: (req: ArchitectRequest) => void;
  declineProject: (projectId: string, professionalId: string) => void;
}

export function useProServiceStore(): ProServiceStore {
  // Mutable copies of mock data — single source of truth
  const [connections, setConnections] = useState<ProConnection[]>([...MOCK_CONNECTIONS]);
  const [architectRequests, setArchitectRequests] = useState<ArchitectRequest[]>([...MOCK_ARCHITECT_REQUESTS]);
  const [supplierCalls] = useState<SupplierCall[]>([...MOCK_SUPPLIER_CALLS]);

  // Projects & professionals are read-only for now
  const projects = MOCK_PROJECTS;
  const professionals = MOCK_PROFESSIONALS;

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
    // Add a "declined" connection so it's tracked across all views
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
  clientCompany: string,
) {
  // In a real app, filter by user ID. Here we show all for demo.
  return requests;
}
