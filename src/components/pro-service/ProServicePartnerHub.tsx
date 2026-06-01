import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, ThumbsUp, ThumbsDown, FileText, Clock,
  CheckCircle2, Eye, Sparkles, Inbox,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import FoundingBadge from "@/components/common/FoundingBadge";
import type { FoundingTier } from "@/hooks/useFoundingScore";
import {
  CONNECTION_STATUS_CONFIG,
  computeMatchScore,
  type ProProject, type ProConnection, type ProProfessional,
} from "./proServiceMockData";
import { type ProServiceStore, getConnectionsForProfessional } from "./useProServiceStore";

type Tab = "available" | "applications" | "connected" | "completed";

export default function ProServicePartnerHub({ store }: { store: ProServiceStore }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("available");

  // Resolve the REAL logged-in partner (replaces the former hard-coded
  // "pro-001"). Connections in the store are keyed by partner_id, so once we
  // have the real id the hub shows this partner's own leads.
  const { data: partner } = useQuery({
    queryKey: ["pro-service-partner", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("partners")
        .select("id, name, country_code, is_founding, founding_tier")
        .eq("user_id", user!.id)
        .is("deleted_at", null)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const myId = partner?.id ?? "";
  const myPro: ProProfessional = {
    id: myId,
    name: partner?.name ?? "Partner",
    company: partner?.name ?? "",
    type: "supplier",
    specialties: [],
    location: partner?.country_code ?? "",
    rating: 0,
    projectsCompleted: 0,
  };

  const myConnections = myId ? getConnectionsForProfessional(store.connections, myId) : [];
  const connectedProjectIds = new Set(myConnections.map(c => c.projectId));
  const availableProjects = store.projects.filter(
    p => !connectedProjectIds.has(p.id) && ["submitted", "in_review", "matched"].includes(p.status)
  );

  const pendingConnections = myConnections.filter(c => c.status === "pending");
  const acceptedConnections = myConnections.filter(c => c.status === "accepted");
  const completedConnections = myConnections.filter(c => c.status === "completed");

  const isFounding = partner?.is_founding === true;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "available", label: t("proHub.partner.tabAvailable"), count: availableProjects.length },
    { id: "applications", label: t("proHub.partner.tabApplications"), count: pendingConnections.length + acceptedConnections.length },
    { id: "connected", label: t("proHub.partner.tabConnected"), count: acceptedConnections.length },
    { id: "completed", label: t("proHub.partner.tabCompleted"), count: completedConnections.length },
  ];

  const interestShown = connectedProjectIds;

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
      {/* Founding Partner banner — priority access framing */}
      {isFounding && (
        <FounderBanner tier={(partner?.founding_tier as FoundingTier | null) ?? "founder"} />
      )}

      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("proHub.partner.title")}</h1>
        <p className="text-sm font-body text-muted-foreground mt-1">{t("proHub.partner.subtitle")}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Eye} value={availableProjects.length} label={t("proHub.partner.statAvailable")} accent />
        <StatCard icon={Clock} value={pendingConnections.length} label={t("proHub.partner.statPending")} />
        <StatCard icon={CheckCircle2} value={acceptedConnections.length} label={t("proHub.partner.statConnected")} />
        <StatCard icon={FileText} value={completedConnections.length} label={t("proHub.partner.statCompleted")} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map(tb => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`px-4 py-2.5 text-xs font-display font-semibold transition-colors relative whitespace-nowrap ${
              tab === tb.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tb.label}
            {tb.count !== undefined && tb.count > 0 && (
              <span className={`ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full ${
                tab === tb.id ? "bg-terracotta/10 text-terracotta" : "bg-muted text-muted-foreground"
              }`}>{tb.count}</span>
            )}
            {tab === tb.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-terracotta" />}
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
                <EmptyState
                  icon={Inbox}
                  title={t("proHub.partner.emptyAvailableTitle", "Vos premiers leads arrivent bientôt")}
                  subtitle={t("proHub.partner.emptyAvailableDesc", "Dès qu'un projet hôtelier correspond à votre catalogue, il apparaîtra ici. Nous vous mettons en relation avec les bons projets.")}
                  founderHint={isFounding ? t("proHub.partner.founderPriority", "Accès prioritaire founder activé — vous serez notifié en premier.") : undefined}
                />
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
                <EmptyState
                  icon={Clock}
                  title={t("proHub.partner.emptyApplicationsTitle", "Aucune candidature en cours")}
                  subtitle={t("proHub.partner.emptyApplicationsDesc", "Quand vous manifestez votre intérêt pour un lead, votre candidature apparaît ici jusqu'à la mise en relation.")}
                />
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
                <EmptyState
                  icon={CheckCircle2}
                  title={t("proHub.partner.emptyConnectedTitle", "Pas encore de mise en relation")}
                  subtitle={t("proHub.partner.emptyConnectedDesc", "Lorsqu'un porteur de projet accepte votre candidature, vous accédez ici à ses coordonnées pour échanger directement.")}
                />
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
                <EmptyState
                  icon={FileText}
                  title={t("proHub.partner.emptyCompletedTitle", "Aucun projet terminé")}
                  subtitle={t("proHub.partner.emptyCompletedDesc", "Vos projets livrés s'archiveront ici — un historique pour valoriser vos réalisations.")}
                />
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

function FounderBanner({ tier }: { tier: FoundingTier }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-terracotta/25 bg-gradient-to-r from-terracotta/[0.06] to-amber-50/50 px-5 py-4 flex items-center gap-4 flex-wrap">
      <FoundingBadge tier={tier} size="md" />
      <div className="min-w-0">
        <p className="font-display text-sm font-bold text-foreground">
          {t("proHub.partner.founderBannerTitle", "Accès Founding Partner")}
        </p>
        <p className="text-xs font-body text-muted-foreground mt-0.5">
          {t("proHub.partner.founderBannerDesc", "Vous recevez les leads qualifiés en priorité, avant les autres fournisseurs.")}
        </p>
      </div>
      <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-display font-semibold text-terracotta bg-terracotta/10 px-3 py-1.5 rounded-full whitespace-nowrap">
        <Sparkles className="h-3.5 w-3.5" /> {t("proHub.partner.founderBannerTag", "Priorité activée")}
      </span>
    </div>
  );
}

function StatCard({ icon: Icon, value, label, accent = false }: { icon: any; value: number; label: string; accent?: boolean }) {
  return (
    <div className={`border rounded-xl p-4 flex items-start gap-3 ${accent && value > 0 ? "border-terracotta/30 bg-terracotta/[0.04]" : "border-border"}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${accent && value > 0 ? "bg-terracotta/10" : "bg-muted/60"}`}>
        <Icon className={`h-4 w-4 ${accent && value > 0 ? "text-terracotta" : "text-muted-foreground"}`} />
      </div>
      <div>
        <p className="font-display font-bold text-xl text-foreground leading-none">{value}</p>
        <p className="text-[10px] font-body text-muted-foreground mt-1">{label}</p>
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
    <div className="border border-border rounded-2xl p-5 hover:border-foreground/20 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Anonymized — no client name until connected */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {project.clientType}
            </span>
            <span className="text-sm font-display font-semibold text-foreground">{project.city}{project.country ? `, ${project.country}` : ""}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-body text-muted-foreground mt-1 flex-wrap">
            {project.budget && <span>{project.budget}</span>}
            {project.covers > 0 && <span>{project.covers} covers</span>}
            {project.style && <span>{project.style}</span>}
          </div>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {project.needs.map((n, i) => (
              <span key={i} className="text-[9px] font-body bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{n}</span>
            ))}
          </div>
          {project.timeline && (
            <p className="text-[10px] font-body text-muted-foreground mt-2">
              {t("proHub.partner.timeline")}: {project.timeline}
            </p>
          )}
        </div>

        <div className="text-right shrink-0">
          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-display font-bold ${
            matchScore >= 75 ? "bg-green-50 text-green-700" : matchScore >= 50 ? "bg-terracotta/10 text-terracotta" : "bg-muted text-muted-foreground"
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
  const cs = CONNECTION_STATUS_CONFIG[connection.status];
  return (
    <div className="border border-border rounded-2xl p-4 hover:border-foreground/20 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {project.clientType}
            </span>
            <span className="text-xs font-display font-semibold text-foreground">{project.city}</span>
          </div>
          <p className="text-[10px] font-body text-muted-foreground mt-1">{project.budget}{project.covers > 0 ? ` · ${project.covers} covers` : ""}</p>
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
    <div className="border border-border rounded-2xl p-4 hover:border-foreground/20 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-display font-semibold text-foreground mb-1">{project.title}</h3>
          <div className="flex items-center gap-3 text-[10px] font-body text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {project.city}{project.country ? `, ${project.country}` : ""}</span>
            {project.budget && <span>{project.budget}</span>}
            {project.covers > 0 && <span>{project.covers} covers</span>}
          </div>
          {project.clientName && (
            <div className="mt-2 p-2 rounded-lg bg-green-50/50 border border-green-200">
              <p className="text-[10px] font-display font-semibold text-green-700">{t("proHub.partner.clientRevealed")}</p>
              <p className="text-xs font-body text-green-800">{project.clientName}{project.clientCompany ? ` — ${project.clientCompany}` : ""}</p>
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

function EmptyState({
  icon: Icon, title, subtitle, founderHint,
}: {
  icon: any; title: string; subtitle: string; founderHint?: string;
}) {
  return (
    <div className="border border-dashed border-border rounded-2xl py-16 px-6 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-terracotta/[0.07] flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-terracotta" />
      </div>
      <h3 className="font-display text-base font-bold text-foreground">{title}</h3>
      <p className="text-sm font-body text-muted-foreground mt-1.5 max-w-sm leading-relaxed">{subtitle}</p>
      {founderHint && (
        <p className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-display font-semibold text-terracotta bg-terracotta/[0.07] px-3 py-1.5 rounded-full">
          <Sparkles className="h-3.5 w-3.5" /> {founderHint}
        </p>
      )}
    </div>
  );
}
