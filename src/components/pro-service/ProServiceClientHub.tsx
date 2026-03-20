import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, MapPin, Star, ArrowRight, ArrowLeft,
  FileText, Users, CheckCircle2, Clock, ChevronRight,
  Pencil, Send, Heart, MessageSquare, Shield, ExternalLink,
} from "lucide-react";
import {
  ARCHITECT_REQUEST_STATUS_CONFIG,
  STATUS_CONFIG,
  getProVisibility, getProDisplayName, getProDisplayCompany, getProDisplayLocation, getProFlag,
  type ProProject, type ProProfessional, type ArchitectRequest, type ProVisibility,
} from "./proServiceMockData";
import { type ProServiceStore } from "./useProServiceStore";
import { useAuth } from "@/contexts/AuthContext";
import { useFavouritePartners, useFavouriteArchitects } from "@/hooks/useFavouritesDB";
import { useClientProjects } from "@/hooks/useClientDashboard";

type Tab = "requests" | "find_architect" | "find_pro" | "completed";

type View =
  | { type: "list" }
  | { type: "request-architect" }
  | { type: "architect-request-detail"; requestId: string }
  | { type: "pro-detail"; proId: string }
  | { type: "request-intro"; proId: string };

// ── Establishment type options ────────────────────────────────────────────────

const ESTABLISHMENT_TYPES = [
  "hotel", "resort", "restaurant", "beach_club", "rooftop", "bar", "camping", "spa", "event_venue",
];

const ARCHITECT_NEED_OPTIONS = [
  "space_planning", "full_design", "mood_boards", "material_selection",
  "supplier_coordination", "lighting_design", "wind_solutions", "on_site_followup",
];

// ── Main component ────────────────────────────────────────────────────────────

export default function ProServiceClientHub({ store }: { store: ProServiceStore }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("requests");
  const [view, setView] = useState<View>({ type: "list" });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [proTypeFilter, setProTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Client projects (simulate: first 5 projects belong to this client)
  const myProjects = store.projects.slice(0, 5);
  const completedProjects = myProjects.filter(p => p.status === "completed");
  const activeProjects = myProjects.filter(p => p.status !== "completed");

  const filteredProjects = statusFilter === "all"
    ? activeProjects
    : activeProjects.filter(p => p.status === statusFilter);

  // Architect requests from the shared store
  const myArchitectRequests = store.architectRequests;

  const filteredPros = store.professionals.filter(p => {
    if (proTypeFilter !== "all" && p.type !== proTypeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.company.toLowerCase().includes(q)
        || p.specialties.some(s => s.toLowerCase().includes(q)) || p.location.toLowerCase().includes(q);
    }
    return true;
  });

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "requests", label: t("proHub.client.tabRequests"), count: activeProjects.length },
    { id: "find_architect", label: t("proHub.client.tabFindArchitect"), count: myArchitectRequests.filter(r => r.status === "searching" || r.status === "proposed").length },
    { id: "find_pro", label: t("proHub.client.tabFindPro") },
    { id: "completed", label: t("proHub.client.tabCompleted"), count: completedProjects.length },
  ];

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    setView({ type: "list" });
  };

  const handleRequestSubmitted = (req: ArchitectRequest) => {
    store.addArchitectRequest(req);
    setView({ type: "list" });
    setTab("find_architect");
  };

  // ── Detail views ──

  if (view.type === "request-architect") {
    return (
      <RequestArchitectForm
        onSubmit={handleRequestSubmitted}
        onCancel={() => setView({ type: "list" })}
      />
    );
  }

  if (view.type === "architect-request-detail") {
    const req = myArchitectRequests.find(r => r.id === view.requestId);
    if (!req) { setView({ type: "list" }); return null; }
    const matchedArchitect = req.matchedArchitectId
      ? store.professionals.find(p => p.id === req.matchedArchitectId)
      : undefined;
    return (
      <ArchitectRequestDetail
        request={req}
        architect={matchedArchitect}
        onBack={() => setView({ type: "list" })}
        onMessage={() => navigate("/messages")}
      />
    );
  }

  if (view.type === "pro-detail") {
    const pro = store.professionals.find(p => p.id === view.proId);
    if (!pro) { setView({ type: "list" }); return null; }
    return (
      <ProDetailView
        pro={pro}
        onBack={() => setView({ type: "list" })}
        onRequestIntro={() => setView({ type: "request-intro", proId: view.proId })}
      />
    );
  }

  if (view.type === "request-intro") {
    const pro = store.professionals.find(p => p.id === view.proId);
    if (!pro) { setView({ type: "list" }); return null; }
    return (
      <RequestIntroForm
        pro={pro}
        store={store}
        onBack={() => setView({ type: "pro-detail", proId: view.proId })}
        onSubmitted={() => { setView({ type: "list" }); setTab("requests"); }}
      />
    );
  }

  // ── List view ──

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight">{t("proHub.client.title")}</h1>
          <p className="text-sm font-body text-muted-foreground mt-1">{t("proHub.client.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setTab("find_architect"); setView({ type: "request-architect" }); }}
            className="flex items-center gap-2 px-4 py-2.5 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
          >
            <Pencil className="h-4 w-4" /> {t("proHub.client.requestArchitect")}
          </button>
          <button
            onClick={() => navigate("/pro-service#brief")}
            className="flex items-center gap-2 px-4 py-2.5 font-display font-semibold text-sm border border-border text-foreground rounded-full hover:bg-muted transition-colors"
          >
            <Plus className="h-4 w-4" /> {t("proHub.client.newRequest")}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={FileText} value={String(activeProjects.length)} label={t("proHub.client.statActive")} />
        <StatCard icon={Pencil} value={String(myArchitectRequests.length)} label={t("proHub.client.statArchitectRequests")} />
        <StatCard icon={Users} value={String(store.connections.filter(c => c.status === "accepted").length)} label={t("proHub.client.statConnections")} />
        <StatCard icon={CheckCircle2} value={String(completedProjects.length)} label={t("proHub.client.statCompleted")} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map(tb => (
          <button
            key={tb.id}
            onClick={() => handleTabChange(tb.id)}
            className={`px-4 py-2.5 text-xs font-display font-semibold transition-colors relative whitespace-nowrap ${
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

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "requests" && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {["all", "submitted", "in_review", "matched", "connected"].map(s => (
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
                  </button>
                ))}
              </div>
              {filteredProjects.length === 0 ? (
                <EmptyState message={t("proHub.client.noRequests")} />
              ) : (
                <div className="space-y-3">
                  {filteredProjects.map(project => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "find_architect" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-body text-muted-foreground">{t("proHub.client.architectRequestsDesc")}</p>
                <button
                  onClick={() => setView({ type: "request-architect" })}
                  className="flex items-center gap-1.5 text-xs font-display font-semibold text-foreground hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> {t("proHub.client.newArchitectRequest")}
                </button>
              </div>

              {myArchitectRequests.length === 0 ? (
                <div className="border border-dashed border-border rounded-xl p-8 text-center">
                  <Pencil className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-display font-semibold text-foreground mb-1">{t("proHub.client.noArchitectRequests")}</p>
                  <p className="text-xs font-body text-muted-foreground mb-4">{t("proHub.client.noArchitectRequestsDesc")}</p>
                  <button
                    onClick={() => setView({ type: "request-architect" })}
                    className="inline-flex items-center gap-2 px-5 py-2.5 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
                  >
                    <Pencil className="h-4 w-4" /> {t("proHub.client.requestArchitect")}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myArchitectRequests.map(req => (
                    <ArchitectRequestCard
                      key={req.id}
                      request={req}
                      professionals={store.professionals}
                      onClick={() => setView({ type: "architect-request-detail", requestId: req.id })}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "find_pro" && (
            <div className="space-y-4">
              <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={t("proHub.client.searchPro")}
                    className="w-full text-sm font-body bg-white border border-border rounded-full pl-10 pr-4 py-2.5 focus:outline-none focus:border-foreground transition-colors"
                  />
                </div>
                <div className="flex gap-2">
                  {["all", "supplier", "architect"].map(type => (
                    <button
                      key={type}
                      onClick={() => setProTypeFilter(type)}
                      className={`text-[10px] font-display font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full transition-colors ${
                        proTypeFilter === type
                          ? "bg-foreground text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {type === "all" ? t("proHub.common.all") : type === "supplier" ? t("proHub.common.suppliers") : t("proHub.common.architects")}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPros.map(pro => (
                  <ProfessionalCard
                    key={pro.id}
                    pro={pro}
                    onClick={() => setView({ type: "pro-detail", proId: pro.id })}
                    onRequestIntro={() => setView({ type: "request-intro", proId: pro.id })}
                  />
                ))}
              </div>
            </div>
          )}

          {tab === "completed" && (
            <div className="space-y-3">
              {completedProjects.length === 0 ? (
                <EmptyState message={t("proHub.client.noCompleted")} />
              ) : (
                completedProjects.map(project => (
                  <ProjectCard key={project.id} project={project} />
                ))
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ARCHITECT REQUEST FORM
// ══════════════════════════════════════════════════════════════════════════════

function RequestArchitectForm({
  onSubmit, onCancel,
}: {
  onSubmit: (req: ArchitectRequest) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    establishmentType: "",
    city: "",
    spaces: "",
    area: "",
    covers: "",
    budget: "",
    style: "",
    timeline: "",
    description: "",
    selectedNeeds: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);

  const handle = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value }));

  const toggleNeed = (need: string) => {
    setForm(p => ({
      ...p,
      selectedNeeds: p.selectedNeeds.includes(need)
        ? p.selectedNeeds.filter(n => n !== need)
        : [...p.selectedNeeds, need],
    }));
  };

  const canSubmit = form.establishmentType && form.city && form.description && form.selectedNeeds.length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setTimeout(() => {
      onSubmit({
        id: `areq-new-${Date.now()}`,
        clientName: "You",
        clientCompany: "Your company",
        establishmentType: form.establishmentType,
        city: form.city,
        country: "France",
        spaces: form.spaces,
        area: form.area,
        covers: parseInt(form.covers) || 0,
        budget: form.budget,
        style: form.style,
        timeline: form.timeline,
        description: form.description,
        architectNeeds: form.selectedNeeds,
        status: "searching",
        createdAt: new Date().toISOString().split("T")[0],
      });
    }, 600);
  };

  const inputClass = "w-full text-sm font-body bg-white border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/50";
  const labelClass = "text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5";

  return (
    <div className="space-y-6">
      <button
        onClick={onCancel}
        className="flex items-center gap-1.5 text-xs font-display font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> {t("proHub.client.backToHub")}
      </button>

      <div className="max-w-2xl">
        <h2 className="font-display text-lg font-bold tracking-tight mb-1">
          {t("proHub.client.requestArchitectTitle")}
        </h2>
        <p className="text-sm font-body text-muted-foreground mb-6">
          {t("proHub.client.requestArchitectSubtitle")}
        </p>

        <div className="space-y-5">
          {/* Establishment & Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t("proHub.client.formEstablishment")} *</label>
              <select value={form.establishmentType} onChange={handle("establishmentType")} className={inputClass}>
                <option value="">{t("proHub.client.formSelect")}</option>
                {ESTABLISHMENT_TYPES.map(type => (
                  <option key={type} value={type}>{t(`proHub.client.estType_${type}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>{t("proHub.client.formCity")} *</label>
              <input type="text" value={form.city} onChange={handle("city")} placeholder="Paris, Nice, Lyon..." className={inputClass} />
            </div>
          </div>

          {/* Spaces & dimensions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>{t("proHub.client.formSpaces")}</label>
              <input type="text" value={form.spaces} onChange={handle("spaces")} placeholder={t("proHub.client.formSpacesPlaceholder")} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t("proHub.client.formArea")}</label>
              <input type="text" value={form.area} onChange={handle("area")} placeholder="200m²" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t("proHub.client.formCovers")}</label>
              <input type="number" value={form.covers} onChange={handle("covers")} placeholder="150" className={inputClass} />
            </div>
          </div>

          {/* Style, budget, timeline */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>{t("proHub.client.formStyle")}</label>
              <input type="text" value={form.style} onChange={handle("style")} placeholder={t("proHub.client.formStylePlaceholder")} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t("proHub.client.formBudget")}</label>
              <input type="text" value={form.budget} onChange={handle("budget")} placeholder="€50,000" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t("proHub.client.formTimeline")}</label>
              <input type="text" value={form.timeline} onChange={handle("timeline")} placeholder={t("proHub.client.formTimelinePlaceholder")} className={inputClass} />
            </div>
          </div>

          {/* What do you need the architect for */}
          <div>
            <label className={labelClass}>{t("proHub.client.formArchitectNeeds")} *</label>
            <p className="text-[10px] font-body text-muted-foreground mb-3">{t("proHub.client.formArchitectNeedsHint")}</p>
            <div className="flex gap-2 flex-wrap">
              {ARCHITECT_NEED_OPTIONS.map(need => (
                <button
                  key={need}
                  type="button"
                  onClick={() => toggleNeed(need)}
                  className={`text-xs font-body px-3 py-1.5 rounded-full border transition-colors ${
                    form.selectedNeeds.includes(need)
                      ? "bg-foreground text-primary-foreground border-foreground"
                      : "bg-white text-muted-foreground border-border hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {t(`proHub.client.need_${need}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>{t("proHub.client.formDescription")} *</label>
            <textarea
              value={form.description}
              onChange={handle("description")}
              placeholder={t("proHub.client.formDescriptionPlaceholder")}
              rows={5}
              className={`${inputClass} resize-none`}
            />
            <p className="text-[10px] font-body text-muted-foreground mt-1.5">{t("proHub.client.formDescriptionHint")}</p>
          </div>

          {/* What happens next */}
          <div className="border border-border rounded-xl p-4 bg-card">
            <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {t("proHub.client.whatHappensNext")}
            </p>
            <div className="space-y-1.5 text-xs font-body text-muted-foreground">
              <p className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-display font-bold shrink-0">1</span> {t("proHub.client.step1Submit")}</p>
              <p className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-display font-bold shrink-0">2</span> {t("proHub.client.step2Match")}</p>
              <p className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-display font-bold shrink-0">3</span> {t("proHub.client.step3Connect")}</p>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="flex items-center gap-2 px-6 py-3 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {t("proHub.client.submitRequest")}
            </button>
            <button
              onClick={onCancel}
              className="px-6 py-3 font-display font-semibold text-sm text-muted-foreground border border-border rounded-full hover:border-foreground hover:text-foreground transition-all"
            >
              {t("proHub.client.cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ARCHITECT REQUEST CARD (list item)
// ══════════════════════════════════════════════════════════════════════════════

function ArchitectRequestCard({ request, onClick, professionals }: { request: ArchitectRequest; onClick: () => void; professionals: ProProfessional[] }) {
  const { t } = useTranslation();
  const sc = ARCHITECT_REQUEST_STATUS_CONFIG[request.status];
  const matchedArchitect = request.matchedArchitectId
    ? professionals.find(p => p.id === request.matchedArchitectId)
    : undefined;

  return (
    <div
      onClick={onClick}
      className="border border-border rounded-xl p-4 hover:border-foreground/20 transition-colors cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {t(`proHub.client.estType_${request.establishmentType}`)}
            </span>
            <span className="text-xs font-display font-semibold text-foreground">{request.city}, {request.country}</span>
            <span className={`text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${sc.style}`}>
              {t(`proHub.client.archStatus_${request.status}`)}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-body text-muted-foreground mt-1">
            {request.budget && <span>{request.budget}</span>}
            {request.area && <span>{request.area}</span>}
            {request.covers > 0 && <span>{request.covers} covers</span>}
            <span>{request.style}</span>
          </div>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {request.architectNeeds.slice(0, 4).map((need, i) => (
              <span key={i} className="text-[9px] font-body bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                {t(`proHub.client.need_${need}`)}
              </span>
            ))}
          </div>
          {matchedArchitect && (
            <div className="flex items-center gap-2 mt-2">
              <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[9px] font-display font-bold text-emerald-700">
                {matchedArchitect.name.charAt(0)}
              </div>
              <span className="text-[10px] font-body text-emerald-700">
                {matchedArchitect.name} — {matchedArchitect.company}
              </span>
            </div>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 mt-1" />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ARCHITECT REQUEST DETAIL
// ══════════════════════════════════════════════════════════════════════════════

function ArchitectRequestDetail({
  request, architect, onBack, onMessage,
}: {
  request: ArchitectRequest;
  architect?: ProProfessional;
  onBack: () => void;
  onMessage?: () => void;
}) {
  const { t } = useTranslation();
  const sc = ARCHITECT_REQUEST_STATUS_CONFIG[request.status];

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-display font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> {t("proHub.client.backToArchitectRequests")}
      </button>

      {/* Header */}
      <div className="border border-border rounded-xl p-5 bg-card">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {t(`proHub.client.estType_${request.establishmentType}`)}
              </span>
              <h2 className="font-display text-lg font-bold tracking-tight">{request.city}, {request.country}</h2>
            </div>
            <div className="flex items-center gap-3 text-xs font-body text-muted-foreground">
              {request.budget && <span>{request.budget}</span>}
              {request.area && <span>{request.area}</span>}
              {request.covers > 0 && <span>{request.covers} covers</span>}
              <span>{request.timeline}</span>
            </div>
          </div>
          <span className={`text-[9px] font-display font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${sc.style}`}>
            {t(`proHub.client.archStatus_${request.status}`)}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <InfoBlock label={t("proHub.client.formStyle")} value={request.style || "—"} />
          <InfoBlock label={t("proHub.client.formSpaces")} value={request.spaces || "—"} />
          <InfoBlock label={t("proHub.client.formTimeline")} value={request.timeline || "—"} />
          <InfoBlock label={t("proHub.client.formCreated")} value={request.createdAt} />
        </div>
      </div>

      {/* Description */}
      <div>
        <h3 className="font-display font-bold text-sm text-foreground mb-2">{t("proHub.client.projectDescription")}</h3>
        <p className="text-sm font-body text-muted-foreground leading-relaxed">{request.description}</p>
      </div>

      {/* Needs */}
      <div>
        <h3 className="font-display font-bold text-sm text-foreground mb-2">{t("proHub.client.whatYouNeed")}</h3>
        <div className="flex gap-2 flex-wrap">
          {request.architectNeeds.map((need, i) => (
            <span key={i} className="text-xs font-body bg-muted text-foreground px-3 py-1.5 rounded-full">
              {t(`proHub.client.need_${need}`)}
            </span>
          ))}
        </div>
      </div>

      {/* Status-specific content */}
      {request.status === "searching" && (
        <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/30">
          <div className="flex items-start gap-3">
            <Search className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-display font-semibold text-blue-800">{t("proHub.client.statusSearching")}</p>
              <p className="text-xs font-body text-blue-700 mt-1">{t("proHub.client.statusSearchingDesc")}</p>
            </div>
          </div>
        </div>
      )}

      {request.status === "proposed" && architect && (
        <div className="border border-amber-200 rounded-xl p-4 bg-amber-50/30">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-display font-semibold text-amber-800">{t("proHub.client.statusProposed")}</p>
              <p className="text-xs font-body text-amber-700 mt-1">{t("proHub.client.statusProposedDesc")}</p>
            </div>
          </div>
        </div>
      )}

      {(request.status === "accepted" || request.status === "in_progress") && architect && (
        <div className="border border-green-200 rounded-xl p-4 bg-green-50/30">
          <h3 className="font-display font-bold text-sm text-green-800 mb-3">{t("proHub.client.yourArchitect")}</h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-display font-bold text-emerald-700">
              {architect.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-display font-semibold text-foreground">{architect.name}</p>
              <p className="text-xs font-body text-muted-foreground">{architect.company} · {architect.location}</p>
              <div className="flex items-center gap-2 mt-1 text-[10px] font-body text-muted-foreground">
                <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-500" /> {architect.rating}</span>
                <span>{architect.projectsCompleted} {t("proHub.common.projects")}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {architect.specialties.map((s, i) => (
              <span key={i} className="text-[9px] font-body bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{s}</span>
            ))}
          </div>
          <button
            onClick={onMessage}
            className="mt-4 flex items-center gap-2 px-5 py-2.5 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
          >
            <MessageSquare className="h-4 w-4" /> Contacter via la messagerie Terrassea
          </button>
        </div>
      )}

      {/* Security reminder */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-50/50 border border-blue-100">
        <Shield className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-[11px] font-body text-blue-700">
          Tous les échanges passent par la messagerie Terrassea. Vos coordonnées complètes ne sont pas partagées avec le professionnel.
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SHARED SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

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

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-body text-foreground mt-0.5">{value}</p>
    </div>
  );
}

function ProjectCard({ project }: { project: ProProject }) {
  const { t } = useTranslation();
  const sc = STATUS_CONFIG[project.status];
  return (
    <div className="border border-border rounded-xl p-4 hover:border-foreground/20 transition-colors">
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
            <span>{project.area}</span>
          </div>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {project.needs.map((n, i) => (
              <span key={i} className="text-[9px] font-body bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{n}</span>
            ))}
          </div>
        </div>
        {project.matchedCount > 0 && (
          <div className="text-right shrink-0">
            <p className="text-xs font-display font-bold text-foreground">{project.matchedCount}</p>
            <p className="text-[9px] font-body text-muted-foreground">{t("proHub.common.matched")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfessionalCard({ pro, onClick, onRequestIntro }: { pro: ProProfessional; onClick: () => void; onRequestIntro: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isFavourite: isFavPartner, toggle: togglePartner } = useFavouritePartners();
  const { isFavourite: isFavArch, toggle: toggleArch } = useFavouriteArchitects();
  const isFav = pro.type === "supplier" ? isFavPartner(pro.id) : isFavArch(pro.id);
  const toggleFav = () => pro.type === "supplier" ? togglePartner(pro.id) : toggleArch(pro.id);

  const vis = getProVisibility(pro);
  const displayName = getProDisplayName(pro);
  const displayCompany = getProDisplayCompany(pro);
  const displayLocation = getProDisplayLocation(pro);
  const flag = getProFlag(pro);

  return (
    <div
      onClick={onClick}
      className="border border-border rounded-xl p-4 hover:border-foreground/20 transition-colors cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {vis === "anonymous" && <Shield className="h-3.5 w-3.5 text-muted-foreground" />}
            <h3 className="text-sm font-display font-semibold text-foreground group-hover:text-[#D4603A] transition-colors">{displayName}</h3>
            {flag && <span className="text-sm">{flag}</span>}
            <span className={`text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              pro.type === "supplier" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
            }`}>
              {pro.type === "supplier" ? t("proHub.common.supplier") : t("proHub.common.architect")}
            </span>
            {vis === "featured" && (
              <span className="text-[8px] font-display font-bold uppercase px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                <Star className="h-2.5 w-2.5 inline fill-amber-500 text-amber-500" /> Premium
              </span>
            )}
          </div>
          {displayCompany && (
            <p className="text-xs font-body text-muted-foreground">{displayCompany}</p>
          )}
          <div className="flex items-center gap-3 text-[10px] font-body text-muted-foreground mt-1.5">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {displayLocation}</span>
            <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-500 fill-amber-500" /> {pro.rating}</span>
            <span>{pro.projectsCompleted} {t("proHub.common.projects")}</span>
          </div>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {pro.specialties.map((s, i) => (
              <span key={i} className="text-[9px] font-body bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{s}</span>
            ))}
          </div>
          {/* Review highlight (always visible regardless of plan) */}
          {pro.reviewHighlights && pro.reviewHighlights.length > 0 && (
            <p className="text-[10px] font-body text-muted-foreground/80 italic mt-2 line-clamp-1">
              "{pro.reviewHighlights[0]}"
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {user && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleFav(); }}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                isFav ? "bg-[#D4603A]/10 text-[#D4603A]" : "text-muted-foreground hover:text-[#D4603A]"
              }`}
            >
              <Heart className={`h-4 w-4 ${isFav ? "fill-[#D4603A]" : ""}`} />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onRequestIntro(); }}
            className="text-[10px] font-display font-semibold text-white bg-[#D4603A] rounded-full px-3 py-1.5 hover:opacity-90 transition-opacity"
          >
            {t("proHub.client.requestIntro")}
          </button>
        </div>
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

// ══════════════════════════════════════════════════════════════════════════════
// PRO DETAIL VIEW
// ══════════════════════════════════════════════════════════════════════════════

function ProDetailView({
  pro, onBack, onRequestIntro,
}: {
  pro: ProProfessional;
  onBack: () => void;
  onRequestIntro: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavourite: isFavP, toggle: toggleP } = useFavouritePartners();
  const { isFavourite: isFavA, toggle: toggleA } = useFavouriteArchitects();
  const isFav = pro.type === "supplier" ? isFavP(pro.id) : isFavA(pro.id);
  const toggleFav = () => pro.type === "supplier" ? toggleP(pro.id) : toggleA(pro.id);

  const vis = getProVisibility(pro);
  const displayName = getProDisplayName(pro);
  const displayCompany = getProDisplayCompany(pro);
  const displayLocation = getProDisplayLocation(pro);
  const flag = getProFlag(pro);

  return (
    <div className="space-y-6 max-w-3xl">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-display font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      {/* Header */}
      <div className="border border-border rounded-xl p-6 bg-card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-lg font-display font-bold text-white ${
              pro.type === "supplier" ? "bg-blue-600" : "bg-emerald-600"
            }`}>
              {vis === "anonymous" ? "?" : displayName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                {vis === "anonymous" && <Shield className="h-4 w-4 text-muted-foreground" />}
                <h2 className="font-display text-xl font-bold text-foreground">{displayName}</h2>
                {flag && <span className="text-lg">{flag}</span>}
                <span className={`text-[9px] font-display font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                  pro.type === "supplier" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
                }`}>
                  {pro.type === "supplier" ? t("proHub.common.supplier") : t("proHub.common.architect")}
                </span>
                {vis === "featured" && (
                  <span className="text-[8px] font-display font-bold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                    <Star className="h-2.5 w-2.5 inline fill-amber-500 text-amber-500" /> Premium
                  </span>
                )}
              </div>
              {displayCompany ? (
                <p className="text-sm font-body text-muted-foreground mt-0.5">{displayCompany}</p>
              ) : (
                <p className="text-xs font-body text-muted-foreground/60 mt-0.5 italic">Identité révélée après mise en relation</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <button
                onClick={toggleFav}
                className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${
                  isFav ? "bg-[#D4603A]/10 border-[#D4603A]/20 text-[#D4603A]" : "border-border text-muted-foreground hover:text-[#D4603A]"
                }`}
              >
                <Heart className={`h-5 w-5 ${isFav ? "fill-[#D4603A]" : ""}`} />
              </button>
            )}
          </div>
        </div>

        {/* Stats — always visible regardless of plan */}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-border">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              <span className="font-display font-bold text-lg">{pro.rating}</span>
            </div>
            <p className="text-[10px] font-body text-muted-foreground">Note moyenne</p>
          </div>
          <div className="text-center">
            <span className="font-display font-bold text-lg">{pro.projectsCompleted}</span>
            <p className="text-[10px] font-body text-muted-foreground">Projets réalisés</p>
          </div>
          <div className="text-center">
            <span className="font-display font-bold text-lg flex items-center justify-center gap-1">
              {flag && <span>{flag}</span>}
              <MapPin className="h-4 w-4 text-muted-foreground" /> {displayLocation}
            </span>
            <p className="text-[10px] font-body text-muted-foreground">Localisation</p>
          </div>
        </div>
      </div>

      {/* Specialties — always visible */}
      <div>
        <h3 className="font-display font-bold text-sm text-foreground mb-3">Spécialités</h3>
        <div className="flex gap-2 flex-wrap">
          {pro.specialties.map((s, i) => (
            <span key={i} className="text-xs font-body bg-card border border-border text-foreground px-3 py-1.5 rounded-full">
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Review highlights — always visible (key selling point) */}
      {pro.reviewHighlights && pro.reviewHighlights.length > 0 && (
        <div>
          <h3 className="font-display font-bold text-sm text-foreground mb-3">Avis des clients précédents</h3>
          <div className="space-y-2">
            {pro.reviewHighlights.map((review, i) => (
              <div key={i} className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-card border border-border">
                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs font-body text-muted-foreground italic">"{review}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trust signals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-card border border-border">
          <Shield className="h-4 w-4 text-[#D4603A] shrink-0" />
          <span className="text-[11px] font-body text-muted-foreground">Vérifié par Terrassea</span>
        </div>
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-card border border-border">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="text-[11px] font-body text-muted-foreground">Profil complet</span>
        </div>
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-card border border-border">
          <MessageSquare className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="text-[11px] font-body text-muted-foreground">Répond sous 24h</span>
        </div>
      </div>

      {/* Anonymous notice */}
      {vis !== "featured" && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50/50 border border-amber-100">
          <Shield className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-display font-semibold text-amber-800">Identité protégée</p>
            <p className="text-[10px] font-body text-amber-700">
              {vis === "anonymous"
                ? "Ce professionnel n'est pas identifiable pour préserver l'équité du processus. Vous pouvez évaluer sa qualité via sa note, ses avis et ses spécialités. Son identité sera révélée après la mise en relation via Terrassea."
                : "Le nom complet et la société de ce professionnel seront révélés après une mise en relation validée par Terrassea."}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onRequestIntro}
          className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-display font-bold bg-[#D4603A] text-white rounded-xl hover:opacity-90 transition-opacity"
        >
          <Send className="h-4 w-4" /> Demander une introduction
        </button>
        <button
          onClick={() => navigate("/messages")}
          className="flex items-center justify-center gap-2 px-5 py-3 text-sm font-display font-semibold border border-border rounded-xl hover:border-foreground/30 transition-colors"
        >
          <MessageSquare className="h-4 w-4" /> Message
        </button>
      </div>

      {/* How it works */}
      <div className="border border-border rounded-xl p-5 bg-card">
        <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-3">Comment ça marche ?</p>
        <div className="space-y-2 text-xs font-body text-muted-foreground">
          <p className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-[#D4603A] text-white flex items-center justify-center text-[9px] font-bold shrink-0">1</span> Vous demandez une introduction via Terrassea</p>
          <p className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-[#D4603A] text-white flex items-center justify-center text-[9px] font-bold shrink-0">2</span> Notre équipe vérifie la compatibilité et met en relation</p>
          <p className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-[#D4603A] text-white flex items-center justify-center text-[9px] font-bold shrink-0">3</span> L'identité complète est révélée et vous échangez via Terrassea</p>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// REQUEST INTRO FORM
// ══════════════════════════════════════════════════════════════════════════════

function RequestIntroForm({
  pro, store, onBack, onSubmitted,
}: {
  pro: ProProfessional;
  store: ProServiceStore;
  onBack: () => void;
  onSubmitted: () => void;
}) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { data: realProjects = [] } = useClientProjects();
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = message.trim().length > 10;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSubmitting(true);
    // Add connection to store
    setTimeout(() => {
      store.addConnection({
        projectId: selectedProjectId || "general",
        professionalId: pro.id,
        status: "pending",
        connectedAt: new Date().toISOString().split("T")[0],
      });
      setSubmitting(false);
      onSubmitted();
    }, 800);
  };

  const inputClass = "w-full text-sm font-body bg-white border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/50";

  return (
    <div className="space-y-6 max-w-2xl">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-display font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Retour au profil
      </button>

      <div>
        <h2 className="font-display text-lg font-bold tracking-tight mb-1">
          Demander une introduction
        </h2>
        <p className="text-sm font-body text-muted-foreground">
          Terrassea va mettre en relation {profile?.first_name || "vous"} avec <strong>{getProDisplayName(pro)}</strong>.
        </p>
      </div>

      {/* Pro summary */}
      <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-card border border-border">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white ${
          pro.type === "supplier" ? "bg-blue-600" : "bg-emerald-600"
        }`}>
          {pro.name.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-display font-semibold text-foreground">{getProDisplayName(pro)}</p>
          <p className="text-[11px] font-body text-muted-foreground">{getProDisplayCompany(pro) || getProDisplayLocation(pro)}</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
          <span className="text-xs font-display font-semibold">{pro.rating}</span>
        </div>
      </div>

      {/* Link to project (optional, uses real dashboard projects) */}
      <div>
        <label className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
          Lier à un projet (optionnel)
        </label>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className={inputClass}
        >
          <option value="">Aucun projet — demande générale</option>
          {realProjects.map((p) => (
            <option key={p.id} value={p.id}>{p.name} — {p.city || ""}</option>
          ))}
        </select>
        <p className="text-[9px] font-body text-muted-foreground mt-1">Vos projets du dashboard sont synchronisés ici.</p>
      </div>

      {/* Message */}
      <div>
        <label className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
          Votre message *
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Décrivez brièvement votre besoin : type d'établissement, style recherché, délai, budget indicatif…"
          rows={5}
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* What happens */}
      <div className="border border-border rounded-xl p-4 bg-card">
        <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Que se passe-t-il ensuite ?
        </p>
        <div className="space-y-1.5 text-xs font-body text-muted-foreground">
          <p className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-display font-bold shrink-0">1</span> Votre demande est envoyée à notre équipe</p>
          <p className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-display font-bold shrink-0">2</span> Nous vérifions la compatibilité et contactons le professionnel</p>
          <p className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-display font-bold shrink-0">3</span> Vous recevez une notification et pouvez échanger via la messagerie</p>
        </div>
      </div>

      {/* Security note */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-50/50 border border-blue-100">
        <Shield className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-[11px] font-body text-blue-700">
          Vos coordonnées ne sont pas partagées. Seul votre prénom et votre ville seront communiqués au professionnel. Tout échange passe par la messagerie Terrassea.
        </p>
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="flex items-center gap-2 px-6 py-3 font-display font-semibold text-sm bg-[#D4603A] text-white rounded-full hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {submitting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Envoyer la demande
        </button>
        <button
          onClick={onBack}
          className="px-6 py-3 font-display font-semibold text-sm text-muted-foreground border border-border rounded-full hover:border-foreground hover:text-foreground transition-all"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
