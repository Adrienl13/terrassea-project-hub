import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, FileText, CheckCircle2, Clock, BarChart3,
  Users, ArrowRight, ThumbsUp, XCircle,
} from "lucide-react";
import {
  STATUS_CONFIG, CONNECTION_STATUS_CONFIG,
  type ProProject, type ProConnection,
} from "./proServiceMockData";
import { type ProServiceStore } from "./useProServiceStore";

type Tab = "all_requests" | "matchmaking" | "stats";

export default function ProServiceAdminHub({ store }: { store: ProServiceStore }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("all_requests");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const pendingMatches = store.connections.filter(c => c.status === "pending");

  const filteredProjects = statusFilter === "all"
    ? store.projects
    : store.projects.filter(p => p.status === statusFilter);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "all_requests", label: t("proHub.admin.tabAllRequests"), count: store.projects.length },
    { id: "matchmaking", label: t("proHub.admin.tabMatchmaking"), count: pendingMatches.length },
    { id: "stats", label: t("proHub.admin.tabStats") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold tracking-tight">{t("proHub.admin.title")}</h1>
        <p className="text-sm font-body text-muted-foreground mt-1">{t("proHub.admin.subtitle")}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={FileText} value={String(store.projects.length)} label={t("proHub.admin.statTotal")} />
        <StatCard icon={Clock} value={String(store.projects.filter(p => p.status === "in_review").length)} label={t("proHub.admin.statReview")} />
        <StatCard icon={Users} value={String(pendingMatches.length)} label={t("proHub.admin.statPendingMatch")} />
        <StatCard icon={CheckCircle2} value={String(store.projects.filter(p => p.status === "completed").length)} label={t("proHub.admin.statCompleted")} />
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

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "all_requests" && (
            <div className="space-y-4">
              {/* Status filter */}
              <div className="flex gap-2 flex-wrap">
                {["all", "submitted", "in_review", "matched", "connected", "completed"].map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`text-[10px] font-display font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full transition-colors ${
                      statusFilter === s
                        ? "bg-foreground text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s === "all" ? t("proHub.common.all") : STATUS_CONFIG[s as keyof typeof STATUS_CONFIG].label}
                    {s !== "all" && (
                      <span className="ml-1">({store.projects.filter(p => p.status === s).length})</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Project list */}
              <div className="space-y-3">
                {filteredProjects.map(project => {
                  const sc = STATUS_CONFIG[project.status];
                  const connections = store.connections.filter(c => c.projectId === project.id);
                  return (
                    <div key={project.id} className="border border-border rounded-xl p-4 hover:border-foreground/20 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-display font-semibold text-foreground truncate">{project.title}</h3>
                            <span className={`text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${sc.style}`}>
                              {sc.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] font-body text-muted-foreground">
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {project.city}, {project.country}</span>
                            <span>{project.budget}</span>
                            <span>{project.covers} covers</span>
                            <span>{project.clientName} — {project.clientCompany}</span>
                          </div>
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            {project.needs.map((n, i) => (
                              <span key={i} className="text-[9px] font-body bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{n}</span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-display font-bold">{connections.length}</p>
                          <p className="text-[9px] font-body text-muted-foreground">{t("proHub.admin.connections")}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "matchmaking" && (
            <div className="space-y-4">
              <p className="text-xs font-body text-muted-foreground">{t("proHub.admin.matchmakingDesc")}</p>
              {pendingMatches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CheckCircle2 className="h-8 w-8 text-green-500/30 mb-3" />
                  <p className="text-sm font-body text-muted-foreground">{t("proHub.admin.noMatchmaking")}</p>
                </div>
              ) : (
                pendingMatches.map(conn => {
                  const project = store.projects.find(p => p.id === conn.projectId);
                  const pro = store.professionals.find(p => p.id === conn.professionalId);
                  if (!project || !pro) return null;
                  return (
                    <div key={conn.id} className="border border-amber-200 rounded-xl p-4 bg-amber-50/30">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-display font-semibold text-foreground mb-1">{pro.name} ({pro.company})</p>
                          <p className="text-[10px] font-body text-muted-foreground">
                            → {project.title}
                          </p>
                          {conn.message && (
                            <p className="text-xs font-body text-muted-foreground mt-1 italic">"{conn.message}"</p>
                          )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => store.updateConnectionStatus(conn.id, "accepted")}
                            className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-display font-semibold bg-green-600 text-white rounded-full hover:opacity-90"
                          >
                            <ThumbsUp className="h-3 w-3" /> {t("proHub.admin.approve")}
                          </button>
                          <button
                            onClick={() => store.updateConnectionStatus(conn.id, "rejected")}
                            className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-display font-semibold text-muted-foreground border border-border rounded-full hover:text-foreground"
                          >
                            <XCircle className="h-3 w-3" /> {t("proHub.admin.reject")}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === "stats" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <MetricCard label={t("proHub.admin.metricSubmissions")} value={String(store.projects.length)} trend="" />
                <MetricCard label={t("proHub.admin.metricConversion")} value={`${store.projects.length > 0 ? Math.round((store.connections.filter(c => c.status === "accepted").length / store.projects.length) * 100) : 0}%`} trend="" />
                <MetricCard label={t("proHub.admin.metricAvgResponse")} value="18h" trend="" />
                <MetricCard label={t("proHub.admin.metricAvgBudget")} value={`€${Math.round(store.projects.reduce((sum, p) => sum + p.budgetNum, 0) / (store.projects.length || 1) / 1000)}k`} trend="" />
                <MetricCard label={t("proHub.admin.metricActivePros")} value={String(new Set(store.connections.map(c => c.professionalId)).size)} trend="" />
                <MetricCard label={t("proHub.admin.metricCompleted")} value={String(store.projects.filter(p => p.status === "completed").length)} trend="" />
              </div>

              {/* Pipeline funnel */}
              <div>
                <h3 className="font-display font-bold text-sm mb-4">{t("proHub.admin.pipeline")}</h3>
                <div className="space-y-2">
                  {(["submitted", "in_review", "matched", "connected", "completed"] as const).map(status => {
                    const count = store.projects.filter(p => p.status === status).length;
                    const maxCount = store.projects.length;
                    const pct = Math.round((count / maxCount) * 100);
                    const sc = STATUS_CONFIG[status];
                    return (
                      <div key={status} className="flex items-center gap-3">
                        <span className={`text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full w-24 text-center ${sc.style}`}>
                          {sc.label}
                        </span>
                        <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: "var(--foreground)", opacity: 0.15 + (pct / 100) * 0.85 }}
                          />
                        </div>
                        <span className="text-xs font-display font-bold w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

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

function MetricCard({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <div className="border border-border rounded-xl p-4">
      <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className="font-display font-bold text-2xl text-foreground">{value}</p>
      <p className="text-[10px] font-body text-green-600 mt-1">{trend}</p>
    </div>
  );
}
