import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Star, ArrowRight, ArrowLeft, FileText, Clock, CheckCircle2,
  Briefcase, Eye, Megaphone, Award, Send, X, Plus,
  ChevronRight, Calendar, Users, Shield, MessageSquare,
  ThumbsUp, Package, Timer,
} from "lucide-react";
import {
  MOCK_PORTFOLIO_EXTRAS,
  STATUS_CONFIG, CONNECTION_STATUS_CONFIG,
  computeMatchScore,
  type ProProject, type ProConnection, type ProProfessional, type SupplierCall,
} from "./proServiceMockData";
import { type ProServiceStore, getConnectionsForProfessional, getConnectionsForProjectFromStore } from "./useProServiceStore";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "missions" | "active" | "calls" | "portfolio";

type View =
  | { type: "list" }
  | { type: "accept-mission"; projectId: string }
  | { type: "project-detail"; projectId: string }
  | { type: "call-detail"; callId: string }
  | { type: "create-call"; projectId?: string }
  | { type: "portfolio-detail"; projectId: string };

// ── Main Component ────────────────────────────────────────────────────────────

export default function ProServiceArchitectHub({ store }: { store: ProServiceStore }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("missions");
  const [view, setView] = useState<View>({ type: "list" });

  // Simulate this architect = pro-002
  const myId = "pro-002";
  const myProFound = store.professionals.find(p => p.id === myId);
  // Fallback profile so the page doesn't crash when demo data is absent
  const myPro: ProProfessional = myProFound ?? {
    id: myId,
    name: "Architect",
    company: "",
    type: "architect",
    specialties: [],
    location: "",
    rating: 0,
    projectsCompleted: 0,
  };
  const myConnections = getConnectionsForProfessional(store.connections, myId);
  // Track which projects the architect already accepted (to show confirmation in mission cards)
  const accepted = new Set(
    myConnections.filter(c => c.status === "accepted" || c.status === "pending").map(c => c.projectId)
  );

  // All project IDs this architect has any connection to (accepted, pending, completed, declined)
  const connectedProjectIds = new Set(myConnections.map(c => c.projectId));
  const proposedMissions = store.projects.filter(
    p => !connectedProjectIds.has(p.id) && ["submitted", "in_review", "matched"].includes(p.status)
  );
  const activeProjects = store.projects.filter(
    p => myConnections.some(c => c.projectId === p.id && (c.status === "accepted" || c.status === "pending"))
  );
  const completedProjects = store.projects.filter(
    p => myConnections.some(c => c.projectId === p.id && c.status === "completed")
  );
  const portfolioProjects = completedProjects.length > 0
    ? completedProjects
    : store.projects.filter(p => p.status === "completed").slice(0, 1);

  const myCalls = store.supplierCalls.filter(
    c => activeProjects.some(p => p.id === c.projectId) || completedProjects.some(p => p.id === c.projectId)
  );

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "missions", label: t("proHub.architect.tabMissions"), count: proposedMissions.length },
    { id: "active", label: t("proHub.architect.tabActive"), count: activeProjects.length },
    { id: "calls", label: t("proHub.architect.tabCalls"), count: myCalls.filter(c => c.status === "open").length },
    { id: "portfolio", label: t("proHub.architect.tabPortfolio"), count: portfolioProjects.length },
  ];

  const handleAcceptMission = (projectId: string) => {
    // Add a real connection to the shared store — this updates all hubs
    store.addConnection({
      projectId,
      professionalId: myId,
      status: "pending",
      connectedAt: new Date().toISOString().split("T")[0],
      message: "Disponibilité confirmée via le hub architecte.",
    });
    setView({ type: "list" });
  };

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    setView({ type: "list" });
  };

  // ── Detail views ──────────────────────────────────────────────────────────

  if (view.type === "accept-mission") {
    const project = store.projects.find(p => p.id === view.projectId);
    if (!project) { setView({ type: "list" }); return null; }
    return (
      <AcceptMissionView
        project={project}
        architect={myPro}
        matchScore={computeMatchScore(project, myPro)}
        onAccept={() => handleAcceptMission(project.id)}
        onDecline={() => setView({ type: "list" })}
      />
    );
  }

  if (view.type === "project-detail") {
    const project = store.projects.find(p => p.id === view.projectId);
    if (!project) { setView({ type: "list" }); return null; }
    const connection = myConnections.find(c => c.projectId === project.id);
    const projectCalls = store.supplierCalls.filter(c => c.projectId === project.id);
    return (
      <ProjectDetailView
        project={project}
        connection={connection}
        calls={projectCalls}
        onBack={() => setView({ type: "list" })}
        onViewCall={(callId) => setView({ type: "call-detail", callId })}
        onCreateCall={() => setView({ type: "create-call", projectId: project.id })}
        store={store}
      />
    );
  }

  if (view.type === "call-detail") {
    const call = store.supplierCalls.find(c => c.id === view.callId);
    if (!call) { setView({ type: "list" }); return null; }
    const project = store.projects.find(p => p.id === call.projectId);
    return <CallDetailView call={call} project={project} onBack={() => setView({ type: "list" })} />;
  }

  if (view.type === "create-call") {
    return (
      <CreateCallView
        projects={activeProjects}
        preselectedProjectId={view.projectId}
        onBack={() => setView({ type: "list" })}
        onCreated={() => { setTab("calls"); setView({ type: "list" }); }}
      />
    );
  }

  if (view.type === "portfolio-detail") {
    const project = store.projects.find(p => p.id === view.projectId);
    if (!project) { setView({ type: "list" }); return null; }
    const extra = MOCK_PORTFOLIO_EXTRAS.find(e => e.projectId === project.id);
    return <PortfolioDetailView project={project} extra={extra} onBack={() => setView({ type: "list" })} />;
  }

  // ── List view ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight">{t("proHub.architect.title")}</h1>
          <p className="text-sm font-body text-muted-foreground mt-1">{t("proHub.architect.subtitle")}</p>
        </div>
        {tab === "calls" && (
          <button
            onClick={() => setView({ type: "create-call" })}
            className="flex items-center gap-2 px-4 py-2.5 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" /> {t("proHub.architect.newCall")}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Eye} value={String(proposedMissions.length)} label={t("proHub.architect.statMissions")} />
        <StatCard icon={Briefcase} value={String(activeProjects.length)} label={t("proHub.architect.statActive")} />
        <StatCard icon={Megaphone} value={String(myCalls.filter(c => c.status === "open").length)} label={t("proHub.architect.statCalls")} />
        <StatCard icon={Award} value={String(portfolioProjects.length)} label={t("proHub.architect.statPortfolio")} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(tb => (
          <button
            key={tb.id}
            onClick={() => handleTabChange(tb.id)}
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
          {tab === "missions" && (
            <div className="space-y-4">
              <p className="text-xs font-body text-muted-foreground">{t("proHub.architect.missionsDesc")}</p>
              {proposedMissions.length === 0 ? (
                <EmptyState message={t("proHub.architect.noMissions")} />
              ) : (
                proposedMissions.map(project => (
                  <MissionCard
                    key={project.id}
                    project={project}
                    architect={myPro}
                    matchScore={computeMatchScore(project, myPro)}
                    accepted={accepted.has(project.id)}
                    onAccept={() => setView({ type: "accept-mission", projectId: project.id })}
                    onDecline={() => store.declineProject(project.id, myId)}
                  />
                ))
              )}
            </div>
          )}

          {tab === "active" && (
            <div className="space-y-3">
              {activeProjects.length === 0 ? (
                <EmptyState message={t("proHub.architect.noActive")} />
              ) : (
                activeProjects.map(project => {
                  const conn = myConnections.find(c => c.projectId === project.id);
                  return (
                    <ActiveProjectCard
                      key={project.id}
                      project={project}
                      connectionStatus={conn?.status || "pending"}
                      callCount={store.supplierCalls.filter(c => c.projectId === project.id).length}
                      onClick={() => setView({ type: "project-detail", projectId: project.id })}
                      store={store}
                    />
                  );
                })
              )}
            </div>
          )}

          {tab === "calls" && (
            <div className="space-y-4">
              <p className="text-xs font-body text-muted-foreground">{t("proHub.architect.callsDesc")}</p>
              {myCalls.length === 0 ? (
                <EmptyState message={t("proHub.architect.noCalls")} />
              ) : (
                myCalls.map(call => {
                  const project = store.projects.find(p => p.id === call.projectId);
                  return (
                    <CallCard
                      key={call.id}
                      call={call}
                      projectTitle={project?.title || ""}
                      onClick={() => setView({ type: "call-detail", callId: call.id })}
                    />
                  );
                })
              )}
            </div>
          )}

          {tab === "portfolio" && (
            <div className="space-y-3">
              {portfolioProjects.length === 0 ? (
                <EmptyState message={t("proHub.architect.noPortfolio")} />
              ) : (
                portfolioProjects.map(project => (
                  <PortfolioCard
                    key={project.id}
                    project={project}
                    onClick={() => setView({ type: "portfolio-detail", projectId: project.id })}
                  />
                ))
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

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

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-display font-semibold text-muted-foreground hover:text-foreground transition-colors mb-4"
    >
      <ArrowLeft className="h-4 w-4" /> {label}
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-display font-bold text-sm text-foreground mb-3">{children}</h3>;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <FileText className="h-8 w-8 text-muted-foreground/30 mb-3" />
      <p className="text-sm font-body text-muted-foreground">{message}</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. MISSIONS PROPOSÉES — Card + Accept view
// ══════════════════════════════════════════════════════════════════════════════

/** Generate human-readable match reasons between project and architect */
function getMatchReasons(project: ProProject, architect: ProProfessional, t: (k: string) => string): string[] {
  const reasons: string[] = [];
  // Location match
  if (project.country === "France" && architect.location.includes("France")) {
    reasons.push(t("proHub.architect.matchReasonLocation"));
  }
  if (project.country === "Spain" && architect.location.includes("Spain")) {
    reasons.push(t("proHub.architect.matchReasonLocation"));
  }
  // Specialty match
  const matchedSpecs = architect.specialties.filter(s =>
    project.needs.some(n => n.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(n.toLowerCase()))
    || project.clientType.toLowerCase().includes(s.toLowerCase())
    || s.toLowerCase().includes(project.clientType.toLowerCase())
  );
  if (matchedSpecs.length > 0) {
    reasons.push(t("proHub.architect.matchReasonSpecialty") + ": " + matchedSpecs.join(", "));
  }
  // Style match
  if (project.style.toLowerCase().includes("contemporary") || project.style.toLowerCase().includes("minimalist")) {
    reasons.push(t("proHub.architect.matchReasonStyle"));
  }
  // Scale match
  if (project.budgetNum >= 80000) {
    reasons.push(t("proHub.architect.matchReasonScale"));
  }
  // Experience
  if (architect.projectsCompleted > 25) {
    reasons.push(t("proHub.architect.matchReasonExperience"));
  }
  return reasons.slice(0, 3); // max 3 reasons
}

function MissionCard({
  project, architect, matchScore, accepted, onAccept, onDecline,
}: {
  project: ProProject; architect: ProProfessional;
  matchScore: number; accepted: boolean; onAccept: () => void; onDecline?: () => void;
}) {
  const { t } = useTranslation();
  const matchReasons = getMatchReasons(project, architect, t);

  return (
    <div className="border border-border rounded-xl p-5 hover:border-foreground/20 transition-colors">
      {/* Terrassea recommendation badge */}
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
        <div className="w-5 h-5 rounded-full bg-terracotta/10 flex items-center justify-center">
          <Star className="h-3 w-3 text-terracotta" />
        </div>
        <span className="text-[10px] font-display font-semibold text-terracotta uppercase tracking-wider">
          {t("proHub.architect.recommendedByTerrassea")}
        </span>
        <div className={`ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-display font-bold shrink-0 ${
          matchScore >= 75 ? "bg-green-50 text-green-700" : matchScore >= 50 ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground"
        }`}>
          {matchScore}% {t("proHub.common.match")}
        </div>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
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
      </div>

      {/* Why this mission — match reasons */}
      {matchReasons.length > 0 && (
        <div className="mt-3 p-3 rounded-lg bg-muted/30 border border-border">
          <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            {t("proHub.architect.whyThisMission")}
          </p>
          <div className="space-y-1">
            {matchReasons.map((reason, i) => (
              <p key={i} className="text-[10px] font-body text-foreground flex items-start gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0 mt-0.5" />
                {reason}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
        {accepted ? (
          <span className="text-xs font-display font-semibold text-green-600 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" /> {t("proHub.architect.availabilityConfirmed")}
          </span>
        ) : (
          <>
            <button
              onClick={onAccept}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
            >
              {t("proHub.architect.imAvailable")} <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDecline}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-display font-semibold text-muted-foreground border border-border rounded-full hover:text-foreground hover:border-foreground transition-colors"
            >
              {t("proHub.architect.notForMe")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. ACCEPT MISSION VIEW — Confirm availability
// ══════════════════════════════════════════════════════════════════════════════

function AcceptMissionView({
  project, architect, matchScore, onAccept, onDecline,
}: {
  project: ProProject;
  architect: ProProfessional;
  matchScore: number;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { t } = useTranslation();
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const matchReasons = getMatchReasons(project, architect, t);

  const handleConfirm = () => {
    setConfirming(true);
    setTimeout(() => {
      onAccept();
    }, 600);
  };

  return (
    <div className="space-y-6">
      <BackButton onClick={onDecline} label={t("proHub.architect.backToMissions")} />

      <div className="max-w-2xl">
        <h2 className="font-display text-lg font-bold tracking-tight mb-1">
          {t("proHub.architect.confirmAvailability")}
        </h2>
        <p className="text-sm font-body text-muted-foreground mb-6">
          {t("proHub.architect.confirmAvailabilityDesc")}
        </p>

        {/* Mission summary */}
        <div className="border border-border rounded-xl p-5 mb-6 bg-muted/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {project.clientType}
            </span>
            <span className="text-xs font-display font-semibold text-foreground">{project.city}, {project.country}</span>
            <div className={`ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-display font-bold ${
              matchScore >= 75 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
            }`}>
              {matchScore}% {t("proHub.common.match")}
            </div>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-body text-muted-foreground">
            <span>{project.budget}</span>
            <span>{project.covers} covers</span>
            <span>{project.area}</span>
            <span>{project.style}</span>
          </div>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {project.needs.map((n, i) => (
              <span key={i} className="text-[9px] font-body bg-background text-muted-foreground px-2 py-0.5 rounded-full">{n}</span>
            ))}
          </div>
        </div>

        {/* Why Terrassea is suggesting this */}
        {matchReasons.length > 0 && (
          <div className="border border-terracotta/20 rounded-xl p-4 mb-6 bg-terracotta/5">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-4 w-4 text-terracotta" />
              <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-terracotta">
                {t("proHub.architect.whyWeRecommend")}
              </p>
            </div>
            <div className="space-y-1.5">
              {matchReasons.map((reason, i) => (
                <p key={i} className="text-xs font-body text-foreground flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
                  {reason}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Optional note */}
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
              {t("proHub.architect.optionalNote")}
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={t("proHub.architect.optionalNotePlaceholder")}
              rows={3}
              className="w-full text-sm font-body bg-white border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/50 resize-none"
            />
          </div>

          {/* What happens next */}
          <div className="border border-border rounded-xl p-4 bg-card">
            <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {t("proHub.architect.whatHappensNext")}
            </p>
            <div className="space-y-1.5 text-xs font-body text-muted-foreground">
              <p className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-display font-bold shrink-0">1</span> {t("proHub.architect.step1Confirm")}</p>
              <p className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-display font-bold shrink-0">2</span> {t("proHub.architect.step2Review")}</p>
              <p className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-display font-bold shrink-0">3</span> {t("proHub.architect.step3Connect")}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="flex items-center gap-2 px-6 py-3 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {confirming ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {t("proHub.architect.confirmAvailabilityBtn")}
            </button>
            <button
              onClick={onDecline}
              className="px-6 py-3 font-display font-semibold text-sm text-muted-foreground border border-border rounded-full hover:border-foreground hover:text-foreground transition-all"
            >
              {t("proHub.architect.notForMe")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. ACTIVE PROJECTS — Card + Detail view
// ══════════════════════════════════════════════════════════════════════════════

function ActiveProjectCard({
  project, connectionStatus, callCount, onClick, store,
}: {
  project: ProProject; connectionStatus: string; callCount: number; onClick: () => void; store: ProServiceStore;
}) {
  const { t } = useTranslation();
  const sc = STATUS_CONFIG[project.status];
  const connectedSuppliers = getConnectionsForProjectFromStore(store.connections, store.professionals, project.id).filter(c => c.professional.type === "supplier" && c.status === "accepted");
  return (
    <div
      onClick={onClick}
      className="border border-border rounded-xl p-4 hover:border-foreground/20 transition-colors cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-display font-semibold text-foreground truncate">{project.title}</h3>
            <span className={`text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${sc.style}`}>
              {sc.label}
            </span>
            {connectionStatus === "pending" && (
              <span className="text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                {t("proHub.architect.awaitingApproval")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[10px] font-body text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {project.city}, {project.country}</span>
            <span>{project.budget}</span>
            <span>{project.covers} covers</span>
          </div>
          {connectionStatus === "accepted" && project.clientName && (
            <p className="text-xs font-body text-foreground mt-2">
              {project.clientName} — {project.clientCompany}
            </p>
          )}
          {/* Quick metrics */}
          <div className="flex items-center gap-4 mt-3">
            {connectedSuppliers.length > 0 && (
              <span className="text-[10px] font-body text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" /> {connectedSuppliers.length} {t("proHub.architect.suppliersConnected")}
              </span>
            )}
            {callCount > 0 && (
              <span className="text-[10px] font-body text-muted-foreground flex items-center gap-1">
                <Megaphone className="h-3 w-3" /> {callCount} {t("proHub.architect.activeCalls")}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 mt-1" />
      </div>
    </div>
  );
}

function ProjectDetailView({
  project, connection, calls, onBack, onViewCall, onCreateCall, store,
}: {
  project: ProProject;
  connection?: ProConnection;
  calls: SupplierCall[];
  onBack: () => void;
  onViewCall: (callId: string) => void;
  onCreateCall: () => void;
  store: ProServiceStore;
}) {
  const { t } = useTranslation();
  const connectedPros = getConnectionsForProjectFromStore(store.connections, store.professionals, project.id);
  const isAccepted = connection?.status === "accepted";
  const suppliers = connectedPros.filter(c => c.professional.type === "supplier");

  return (
    <div className="space-y-6">
      <BackButton onClick={onBack} label={t("proHub.architect.backToActive")} />

      {/* Project header */}
      <div className="border border-border rounded-xl p-5 bg-card">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight mb-1">{project.title}</h2>
            <div className="flex items-center gap-3 text-xs font-body text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {project.city}, {project.country}</span>
              <span>{project.budget}</span>
              <span>{project.covers} covers</span>
              <span>{project.area}</span>
            </div>
          </div>
          <span className={`text-[9px] font-display font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${STATUS_CONFIG[project.status].style}`}>
            {STATUS_CONFIG[project.status].label}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <InfoBlock label={t("proHub.architect.detailStyle")} value={project.style} />
          <InfoBlock label={t("proHub.architect.detailTimeline")} value={project.timeline} />
          <InfoBlock label={t("proHub.architect.detailType")} value={project.clientType} />
          <InfoBlock label={t("proHub.architect.detailCreated")} value={project.createdAt} />
        </div>
      </div>

      {/* Client info (only if connection accepted) */}
      {isAccepted && project.clientName && (
        <div className="border border-green-200 rounded-xl p-4 bg-green-50/30">
          <SectionTitle>{t("proHub.architect.clientInfo")}</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <InfoBlock label={t("proHub.architect.clientName")} value={project.clientName} />
            <InfoBlock label={t("proHub.architect.clientCompany")} value={project.clientCompany || "—"} />
            <InfoBlock label={t("proHub.architect.detailStatus")} value={t("proHub.architect.connectionAccepted")} accent />
          </div>
        </div>
      )}

      {/* Awaiting approval notice */}
      {connection?.status === "pending" && (
        <div className="border border-amber-200 rounded-xl p-4 bg-amber-50/30">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-display font-semibold text-amber-800">{t("proHub.architect.pendingTitle")}</p>
              <p className="text-xs font-body text-amber-700 mt-1">{t("proHub.architect.pendingDesc")}</p>
              {connection.message && (
                <p className="text-xs font-body text-amber-700 mt-2 italic">"{connection.message}"</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Needs */}
      <div>
        <SectionTitle>{t("proHub.architect.projectNeeds")}</SectionTitle>
        <div className="flex gap-2 flex-wrap">
          {project.needs.map((need, i) => (
            <span key={i} className="text-xs font-body bg-muted text-foreground px-3 py-1.5 rounded-full">
              {need}
            </span>
          ))}
        </div>
      </div>

      {/* Connected suppliers */}
      {isAccepted && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <SectionTitle>{t("proHub.architect.connectedSuppliers")}</SectionTitle>
            <span className="text-[10px] font-body text-muted-foreground">{suppliers.length} {t("proHub.common.suppliers").toLowerCase()}</span>
          </div>
          {suppliers.length === 0 ? (
            <p className="text-xs font-body text-muted-foreground">{t("proHub.architect.noSuppliersYet")}</p>
          ) : (
            <div className="space-y-2">
              {suppliers.map(({ professional, status }) => (
                <div key={professional.id} className="flex items-center justify-between border border-border rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-display font-bold">
                      {professional.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-display font-semibold text-foreground">{professional.name}</p>
                      <p className="text-[10px] font-body text-muted-foreground">{professional.company} · {professional.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[10px] font-body text-muted-foreground">
                      <Star className="h-3 w-3 text-amber-500" /> {professional.rating}
                    </span>
                    <span className={`text-[9px] font-display font-semibold uppercase px-2 py-0.5 rounded-full ${CONNECTION_STATUS_CONFIG[status].style}`}>
                      {CONNECTION_STATUS_CONFIG[status].label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Supplier calls for this project */}
      {isAccepted && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <SectionTitle>{t("proHub.architect.projectCalls")}</SectionTitle>
            <button
              onClick={onCreateCall}
              className="flex items-center gap-1 text-[10px] font-display font-semibold text-foreground hover:underline"
            >
              <Plus className="h-3 w-3" /> {t("proHub.architect.newCall")}
            </button>
          </div>
          {calls.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl p-6 text-center">
              <Megaphone className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs font-body text-muted-foreground mb-3">{t("proHub.architect.noCallsForProject")}</p>
              <button
                onClick={onCreateCall}
                className="text-xs font-display font-semibold text-foreground hover:underline"
              >
                {t("proHub.architect.createFirstCall")}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {calls.map(call => (
                <div
                  key={call.id}
                  onClick={() => onViewCall(call.id)}
                  className="flex items-center justify-between border border-border rounded-lg p-3 hover:border-foreground/20 cursor-pointer transition-colors"
                >
                  <div>
                    <p className="text-xs font-display font-semibold text-foreground">{call.title}</p>
                    <div className="flex items-center gap-2 text-[10px] font-body text-muted-foreground mt-0.5">
                      <span>{call.responseCount} {t("proHub.architect.responses")}</span>
                      <span>·</span>
                      <span className={call.status === "open" ? "text-green-600" : call.status === "selecting" ? "text-amber-600" : "text-muted-foreground"}>
                        {call.status === "open" ? t("proHub.architect.callOpen") : call.status === "selecting" ? t("proHub.architect.callSelecting") : t("proHub.architect.callClosed")}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoBlock({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-sm font-body mt-0.5 ${accent ? "text-green-700 font-semibold" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. SUPPLIER CALLS — Card + Detail + Create
// ══════════════════════════════════════════════════════════════════════════════

function CallCard({
  call, projectTitle, onClick,
}: {
  call: SupplierCall; projectTitle: string; onClick: () => void;
}) {
  const { t } = useTranslation();
  const statusColor = call.status === "open" ? "bg-green-50 text-green-700" : call.status === "selecting" ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground";
  const bestPrice = call.responses.length > 0
    ? Math.min(...call.responses.map(r => r.estimatedAmount))
    : null;

  return (
    <div
      onClick={onClick}
      className="border border-border rounded-xl p-4 hover:border-foreground/20 transition-colors cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-display font-semibold text-foreground truncate">{call.title}</h3>
            <span className={`text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusColor}`}>
              {call.status}
            </span>
          </div>
          <p className="text-[10px] font-body text-muted-foreground">{projectTitle}</p>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {call.categories.map((cat, i) => (
              <span key={i} className="text-[9px] font-body bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{cat}</span>
            ))}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-display font-bold text-foreground">{call.responseCount}</p>
          <p className="text-[9px] font-body text-muted-foreground">{t("proHub.architect.responses")}</p>
          {bestPrice && (
            <p className="text-[10px] font-body text-green-600 mt-1">{t("proHub.architect.from")} €{bestPrice.toLocaleString()}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border text-[10px] font-body text-muted-foreground">
        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {t("proHub.architect.deadline")}: {call.deadline}</span>
        {call.responses.some(r => r.selected) && (
          <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3 w-3" /> {t("proHub.architect.supplierSelected")}</span>
        )}
      </div>
    </div>
  );
}

function CallDetailView({
  call, project, onBack,
}: {
  call: SupplierCall; project?: ProProject; onBack: () => void;
}) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(
    call.responses.find(r => r.selected)?.id || null
  );

  return (
    <div className="space-y-6">
      <BackButton onClick={onBack} label={t("proHub.architect.backToCalls")} />

      {/* Call header */}
      <div className="border border-border rounded-xl p-5 bg-card">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight mb-1">{call.title}</h2>
            {project && (
              <p className="text-xs font-body text-muted-foreground">{project.title}</p>
            )}
          </div>
          <span className={`text-[9px] font-display font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${
            call.status === "open" ? "bg-green-50 text-green-700" : call.status === "selecting" ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground"
          }`}>
            {call.status}
          </span>
        </div>
        <p className="text-sm font-body text-muted-foreground mb-4">{call.description}</p>
        <div className="grid grid-cols-3 gap-3">
          <InfoBlock label={t("proHub.architect.callCreated")} value={call.createdAt} />
          <InfoBlock label={t("proHub.architect.deadline")} value={call.deadline} />
          <InfoBlock label={t("proHub.architect.totalResponses")} value={String(call.responseCount)} />
        </div>
      </div>

      {/* Responses */}
      <div>
        <SectionTitle>{t("proHub.architect.supplierResponses")} ({call.responses.length})</SectionTitle>
        <div className="space-y-3">
          {call.responses.map(resp => {
            const isSelected = selectedId === resp.id;
            return (
              <div
                key={resp.id}
                className={`border rounded-xl p-4 transition-colors ${
                  isSelected ? "border-green-400 bg-green-50/30" : "border-border hover:border-foreground/20"
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-display font-bold">
                      {resp.supplierName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-display font-semibold text-foreground">{resp.supplierName}</p>
                      <p className="text-[10px] font-body text-muted-foreground">{resp.supplierCompany}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> {t("proHub.architect.selected")}
                    </span>
                  )}
                </div>

                <p className="text-xs font-body text-muted-foreground mb-3 leading-relaxed">{resp.message}</p>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="bg-muted/50 rounded-lg p-2.5">
                    <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t("proHub.architect.estimate")}</p>
                    <p className="text-sm font-display font-bold text-foreground">€{resp.estimatedAmount.toLocaleString()}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2.5">
                    <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t("proHub.architect.delivery")}</p>
                    <p className="text-sm font-display font-bold text-foreground">{resp.deliveryWeeks} {t("proHub.architect.weeks")}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2.5">
                    <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t("proHub.architect.warranty")}</p>
                    <p className="text-sm font-display font-bold text-foreground">{resp.warranty}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  {!isSelected ? (
                    <button
                      onClick={() => setSelectedId(resp.id)}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" /> {t("proHub.architect.selectSupplier")}
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedId(null)}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-display font-semibold text-muted-foreground border border-border rounded-full hover:text-foreground transition-colors"
                    >
                      {t("proHub.architect.deselectSupplier")}
                    </button>
                  )}
                  <Link
                    to={"/messages"}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-display font-semibold text-muted-foreground border border-border rounded-full hover:text-foreground transition-colors"
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> {t("proHub.architect.messageSupplier")}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CreateCallView({
  projects, preselectedProjectId, onBack, onCreated,
}: {
  projects: ProProject[];
  preselectedProjectId?: string;
  onBack: () => void;
  onCreated: () => void;
}) {
  const { t } = useTranslation();
  const [selectedProject, setSelectedProject] = useState(preselectedProjectId || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState("");
  const [deadline, setDeadline] = useState("");
  const [creating, setCreating] = useState(false);

  const inputClass = "w-full text-sm font-body bg-white border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/50";
  const labelClass = "text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5";

  const handleCreate = () => {
    if (!selectedProject || !title || !description) return;
    setCreating(true);
    setTimeout(() => {
      onCreated();
    }, 600);
  };

  return (
    <div className="space-y-6">
      <BackButton onClick={onBack} label={t("proHub.architect.backToCalls")} />

      <div className="max-w-2xl">
        <h2 className="font-display text-lg font-bold tracking-tight mb-1">{t("proHub.architect.createCallTitle")}</h2>
        <p className="text-sm font-body text-muted-foreground mb-6">{t("proHub.architect.createCallSubtitle")}</p>

        <div className="space-y-4">
          <div>
            <label className={labelClass}>{t("proHub.architect.callProject")} *</label>
            <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className={inputClass}>
              <option value="">{t("proHub.architect.selectProject")}</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>{t("proHub.architect.callTitleLabel")} *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder={t("proHub.architect.callTitlePlaceholder")} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>{t("proHub.architect.callDescription")} *</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder={t("proHub.architect.callDescPlaceholder")} rows={4}
              className={`${inputClass} resize-none`} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t("proHub.architect.callCategories")}</label>
              <input type="text" value={categories} onChange={e => setCategories(e.target.value)}
                placeholder={t("proHub.architect.callCategoriesPlaceholder")} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t("proHub.architect.callDeadline")}</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCreate}
              disabled={!selectedProject || !title || !description || creating}
              className="flex items-center gap-2 px-6 py-3 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {creating ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Megaphone className="h-4 w-4" />
              )}
              {t("proHub.architect.publishCall")}
            </button>
            <button onClick={onBack}
              className="px-6 py-3 font-display font-semibold text-sm text-muted-foreground border border-border rounded-full hover:border-foreground hover:text-foreground transition-all">
              {t("proHub.architect.cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. PORTFOLIO — Card + Detail
// ══════════════════════════════════════════════════════════════════════════════

function PortfolioCard({ project, onClick }: { project: ProProject; onClick: () => void }) {
  const { t } = useTranslation();
  const extra = MOCK_PORTFOLIO_EXTRAS.find(e => e.projectId === project.id);
  return (
    <div
      onClick={onClick}
      className="border border-border rounded-xl p-4 hover:border-foreground/20 transition-colors cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-display font-semibold text-foreground mb-1">{project.title}</h3>
          <div className="flex items-center gap-3 text-[10px] font-body text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {project.city}, {project.country}</span>
            <span>{extra?.finalBudget || project.budget}</span>
            <span>{project.style}</span>
          </div>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {project.needs.map((n, i) => (
              <span key={i} className="text-[9px] font-body bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{n}</span>
            ))}
          </div>
          {extra?.clientRating && (
            <div className="flex items-center gap-1 mt-2">
              {Array.from({ length: extra.clientRating }).map((_, i) => (
                <Star key={i} className="h-3 w-3 text-amber-500 fill-amber-500" />
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {extra?.deliveredDate || project.createdAt}
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
      </div>
    </div>
  );
}

function PortfolioDetailView({
  project, extra, onBack,
}: {
  project: ProProject;
  extra?: typeof MOCK_PORTFOLIO_EXTRAS[0];
  onBack: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <BackButton onClick={onBack} label={t("proHub.architect.backToPortfolio")} />

      {/* Header */}
      <div className="border border-border rounded-xl p-5 bg-card">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight mb-1">{project.title}</h2>
            <div className="flex items-center gap-3 text-xs font-body text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {project.city}, {project.country}</span>
              <span>{project.style}</span>
              <span>{project.covers} covers</span>
              <span>{project.area}</span>
            </div>
          </div>
          <span className="text-[9px] font-display font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-green-50 text-green-700">
            {t("proHub.common.completed")}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <InfoBlock label={t("proHub.architect.detailType")} value={project.clientType} />
          <InfoBlock label={t("proHub.architect.finalBudget")} value={extra?.finalBudget || project.budget} />
          <InfoBlock label={t("proHub.architect.deliveredDate")} value={extra?.deliveredDate || "—"} />
          <InfoBlock label={t("proHub.architect.clientName")} value={project.clientName || "—"} />
        </div>
      </div>

      {/* Client testimonial */}
      {extra?.clientTestimonial && (
        <div className="border border-border rounded-xl p-5 bg-amber-50/20">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4 text-amber-600" />
            <p className="text-xs font-display font-semibold text-foreground">{t("proHub.architect.clientTestimonial")}</p>
          </div>
          <blockquote className="text-sm font-body text-foreground leading-relaxed italic mb-3">
            "{extra.clientTestimonial}"
          </blockquote>
          <div className="flex items-center gap-2">
            <p className="text-xs font-body text-muted-foreground">— {project.clientName}, {project.clientCompany}</p>
            {extra.clientRating && (
              <div className="flex items-center gap-0.5 ml-2">
                {Array.from({ length: extra.clientRating }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 text-amber-500 fill-amber-500" />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Suppliers used */}
      {extra?.suppliersUsed && (
        <div>
          <SectionTitle>{t("proHub.architect.suppliersUsed")}</SectionTitle>
          <div className="flex gap-2 flex-wrap">
            {extra.suppliersUsed.map((supplier, i) => (
              <span key={i} className="text-xs font-body bg-muted text-foreground px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <Package className="h-3 w-3 text-muted-foreground" /> {supplier}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Highlights */}
      {extra?.highlights && (
        <div>
          <SectionTitle>{t("proHub.architect.highlights")}</SectionTitle>
          <div className="space-y-2">
            {extra.highlights.map((highlight, i) => (
              <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg border border-border bg-card">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                <p className="text-xs font-body text-foreground">{highlight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Needs delivered */}
      <div>
        <SectionTitle>{t("proHub.architect.needsDelivered")}</SectionTitle>
        <div className="flex gap-2 flex-wrap">
          {project.needs.map((need, i) => (
            <span key={i} className="text-xs font-body bg-green-50 text-green-700 px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3" /> {need}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
