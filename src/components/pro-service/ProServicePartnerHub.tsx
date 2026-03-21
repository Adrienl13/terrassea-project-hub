import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Star, ArrowRight, ThumbsUp, ThumbsDown,
  FileText, Clock, CheckCircle2, XCircle, Eye,
} from "lucide-react";
import {
  STATUS_CONFIG, CONNECTION_STATUS_CONFIG,
  computeMatchScore,
  type ProProject, type ProConnection, type ProProfessional,
} from "./proServiceMockData";
import { type ProServiceStore, getConnectionsForProfessional } from "./useProServiceStore";

type Tab = "available" | "applications" | "connected" | "completed";

export default function ProServicePartnerHub({ store }: { store: ProServiceStore }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("available");

  // Simulate this partner = pro-001
  const myId = "pro-001";
  const myProFound = store.professionals.find(p => p.id === myId);
  // Fallback profile so the page doesn't crash when demo data is absent
  const myPro: ProProfessional = myProFound ?? {
    id: myId,
    name: "Partner",
    company: "",
    type: "supplier",
    specialties: [],
    location: "",
    rating: 0,
    projectsCompleted: 0,
  };
  const myConnections = getConnectionsForProfessional(store.connections, myId);

  // Available = projects not connected to (no connection at all), with open status
  const connectedProjectIds = new Set(myConnections.map(c => c.projectId));
  const availableProjects = store.projects.filter(
    p => !connectedProjectIds.has(p.id) && ["submitted", "in_review", "matched"].includes(p.status)
  );

  const pendingConnections = myConnections.filter(c => c.status === "pending");
  const acceptedConnections = myConnections.filter(c => c.status === "accepted");
  const completedConnections = myConnections.filter(c => c.status === "completed");

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "available", label: t("proHub.partner.tabAvailable"), count: availableProjects.length },
    { id: "applications", label: t("proHub.partner.tabApplications"), count: pendingConnections.length + acceptedConnections.length },
    { id: "connected", label: t("proHub.partner.tabConnected"), count: acceptedConnections.length },
    { id: "completed", label: t("proHub.partner.tabCompleted"), count: completedConnections.length },
  ];

  const handleExpressInterest = (projectId: string) => {
    store.addConnection({
      projectId,
      professionalId: myId,
      status: "pending",
      connectedAt: new Date().toISOString().split("T")[0],
      message: "Interest expressed via supplier marketplace.",
    });
  };

  const handleDecline = (projectId: string) => {
    store.declineProject(projectId, myId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold tracking-tight">{t("proHub.partner.title")}</h1>
        <p className="text-sm font-body text-muted-foreground mt-1">{t("proHub.partner.subtitle")}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Eye} value={String(availableProjects.length)} label={t("proHub.partner.statAvailable")} />
        <StatCard icon={Clock} value={String(pendingConnections.length)} label={t("proHub.partner.statPending")} />
        <StatCard icon={CheckCircle2} value={String(acceptedConnections.length)} label={t("proHub.partner.statConnected")} />
        <StatCard icon={FileText} value={String(completedConnections.length)} label={t("proHub.partner.statCompleted")} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(tb => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`px-4 py-2.5 text-xs font-display font-semibold transition-colors relative ${
              tab === tb.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tb.label}
            {tb.count !== undefined && tb.count > 0 && (
              <span className="ml-1.5 text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{tb.count}</span>
            )}
            {tab === tb.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "available" && (
            <div className="space-y-4">
              {availableProjects.length === 0 ? (
                <EmptyState message={t("proHub.partner.noAvailable")} />
              ) : (
                availableProjects.map(project => (
                  <AvailableProjectCard
                    key={project.id}
                    project={project}
                    matchScore={computeMatchScore(project, myPro)}
                    expressed={interestShown.has(project.id)}
                    onExpress={() => handleExpressInterest(project.id)}
                    onDecline={() => handleDecline(project.id)}
                  />
                ))
              )}
            </div>
          )}

          {tab === "applications" && (
            <div className="space-y-3">
              {[...pendingConnections, ...acceptedConnections].length === 0 ? (
                <EmptyState message={t("proHub.partner.noApplications")} />
              ) : (
                [...pendingConnections, ...acceptedConnections].map(conn => {
                  const project = store.projects.find(p => p.id === conn.projectId);
                  if (!project) return null;
                  return <ApplicationCard key={conn.id} connection={conn} project={project} />;
                })
              )}
            </div>
          )}

          {tab === "connected" && (
            <div className="space-y-3">
              {acceptedConnections.length === 0 ? (
                <EmptyState message={t("proHub.partner.noConnected")} />
              ) : (
                acceptedConnections.map(conn => {
                  const project = store.projects.find(p => p.id === conn.projectId);
                  if (!project) return null;
                  return <ConnectedProjectCard key={conn.id} connection={conn} project={project} />;
                })
              )}
            </div>
          )}

          {tab === "completed" && (
            <div className="space-y-3">
              {completedConnections.length === 0 ? (
                <EmptyState message={t("proHub.partner.noCompleted")} />
              ) : (
                completedConnections.map(conn => {
                  const project = store.projects.find(p => p.id === conn.projectId);
                  if (!project) return null;
                  return <ConnectedProjectCard key={conn.id} connection={conn} project={project} />;
                })
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <div className="border border-border rounded-xl p-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="font-display font-bold text-lg text-foreground">{value}</p>
        <p className="text-[10px] font-body text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function AvailableProjectCard({
  project, matchScore, expressed, onExpress, onDecline,
}: {
  project: ProProject; matchScore: number;
  expressed: boolean; onExpress: () => void; onDecline: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="border border-border rounded-xl p-5 hover:border-foreground/20 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Anonymized — no client name */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {project.clientType}
            </span>
            <span className="text-xs font-display font-semibold text-foreground">{project.city}, {project.country}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-body text-muted-foreground mt-1">
            <span>{project.budget}</span>
            <span>{project.covers} covers</span>
            <span>{project.area}</span>
            <span>{project.style}</span>
          </div>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {project.needs.map((n, i) => (
              <span key={i} className="text-[9px] font-body bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{n}</span>
            ))}
          </div>
          <p className="text-[10px] font-body text-muted-foreground mt-2">
            {t("proHub.partner.timeline")}: {project.timeline}
          </p>
        </div>

        <div className="text-right shrink-0">
          {/* Match score */}
          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-display font-bold ${
            matchScore >= 75 ? "bg-green-50 text-green-700" : matchScore >= 50 ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground"
          }`}>
            {matchScore}% {t("proHub.common.match")}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
        {expressed ? (
          <span className="text-xs font-display font-semibold text-green-600 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" /> {t("proHub.partner.interestSent")}
          </span>
        ) : (
          <>
            <button
              onClick={onExpress}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
            >
              <ThumbsUp className="h-3.5 w-3.5" /> {t("proHub.partner.expressInterest")}
            </button>
            <button
              onClick={onDecline}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-display font-semibold text-muted-foreground border border-border rounded-full hover:text-foreground hover:border-foreground transition-colors"
            >
              <ThumbsDown className="h-3.5 w-3.5" /> {t("proHub.partner.decline")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ApplicationCard({ connection, project }: { connection: ProConnection; project: ProProject }) {
  const { t } = useTranslation();
  const cs = CONNECTION_STATUS_CONFIG[connection.status];
  return (
    <div className="border border-border rounded-xl p-4 hover:border-foreground/20 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {project.clientType}
            </span>
            <span className="text-xs font-display font-semibold text-foreground">{project.city}</span>
          </div>
          <p className="text-[10px] font-body text-muted-foreground mt-1">{project.budget} · {project.covers} covers</p>
          {connection.message && (
            <p className="text-xs font-body text-muted-foreground mt-2 italic">"{connection.message}"</p>
          )}
        </div>
        <span className={`text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${cs.style}`}>
          {cs.label}
        </span>
      </div>
    </div>
  );
}

function ConnectedProjectCard({ connection, project }: { connection: ProConnection; project: ProProject }) {
  const { t } = useTranslation();
  return (
    <div className="border border-border rounded-xl p-4 hover:border-foreground/20 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-display font-semibold text-foreground mb-1">{project.title}</h3>
          <div className="flex items-center gap-3 text-[10px] font-body text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {project.city}, {project.country}</span>
            <span>{project.budget}</span>
            <span>{project.covers} covers</span>
          </div>
          {/* Revealed client info */}
          {project.clientName && (
            <div className="mt-2 p-2 rounded-lg bg-green-50/50 border border-green-200">
              <p className="text-[10px] font-display font-semibold text-green-700">{t("proHub.partner.clientRevealed")}</p>
              <p className="text-xs font-body text-green-800">{project.clientName} — {project.clientCompany}</p>
            </div>
          )}
        </div>
        <span className={`text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
          connection.status === "completed" ? "bg-muted text-muted-foreground" : "bg-green-50 text-green-700"
        }`}>
          {connection.status === "completed" ? t("proHub.common.completed") : t("proHub.common.connected")}
        </span>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <FileText className="h-8 w-8 text-muted-foreground/30 mb-3" />
      <p className="text-sm font-body text-muted-foreground">{message}</p>
    </div>
  );
}
