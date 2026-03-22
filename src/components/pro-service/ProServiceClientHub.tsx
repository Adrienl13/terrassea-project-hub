import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Search, MapPin, Star, ArrowRight, ArrowLeft,
  FileText, Users, CheckCircle2, Clock, ChevronRight,
  Pencil, Send, Heart, MessageSquare, Shield, ExternalLink, Calendar,
  Building2, Package, Euro, Sparkles, Factory, Compass, Mail, Phone, User, Briefcase,
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Tab = "requests" | "find_architect" | "find_pro" | "completed";

type View =
  | { type: "list" }
  | { type: "new-request" }
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

  const { profile, user } = useAuth();
  const queryClient = useQueryClient();

  // Real pro service requests from DB
  const { data: myProRequests = [] } = useQuery({
    queryKey: ["my-pro-requests", profile?.email],
    queryFn: async () => {
      const { data } = await supabase
        .from("pro_service_requests")
        .select("*")
        .eq("client_email", profile!.email!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!profile?.email,
  });

  // Also keep mock projects as fallback display
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
    { id: "requests", label: t("proHub.client.tabRequests"), count: myProRequests.length },
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

  if (view.type === "new-request") {
    return (
      <NewProRequestForm
        onCancel={() => setView({ type: "list" })}
        onSubmitted={() => {
          queryClient.invalidateQueries({ queryKey: ["my-pro-requests"] });
          setView({ type: "list" });
          setTab("requests");
        }}
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
            onClick={() => setView({ type: "new-request" })}
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
              <div className="flex items-center justify-between">
                <p className="text-xs font-body text-muted-foreground">{t("proHub.client.myProRequestsDesc")}</p>
                <button
                  onClick={() => setView({ type: "new-request" })}
                  className="flex items-center gap-1.5 text-xs font-display font-semibold text-foreground hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> {t("proHub.client.newRequest")}
                </button>
              </div>
              {myProRequests.length === 0 ? (
                <div className="border border-dashed border-border rounded-xl p-8 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-display font-semibold text-foreground mb-1">{t("proHub.client.noRequests")}</p>
                  <p className="text-xs font-body text-muted-foreground mb-4">{t("proHub.client.noRequestsSubtitle")}</p>
                  <button
                    onClick={() => setView({ type: "new-request" })}
                    className="inline-flex items-center gap-2 px-5 py-2.5 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
                  >
                    <Plus className="h-4 w-4" /> {t("proHub.client.newRequest")}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myProRequests.map((req: any) => (
                    <ProRequestCard key={req.id} request={req} />
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

// ══════════════════════════════════════════════════════════════════════════════
// PRO REQUEST CARD (real DB data)
// ══════════════════════════════════════════════════════════════════════════════

const PRO_REQUEST_STATUS_MAP: Record<string, { label: string; style: string }> = {
  pending: { label: "En cours d'analyse", style: "bg-blue-50 text-blue-700" },
  matched: { label: "Architecte propos\u00e9", style: "bg-amber-50 text-amber-700" },
  in_progress: { label: "En relation", style: "bg-emerald-50 text-emerald-700" },
  completed: { label: "Termin\u00e9", style: "bg-muted text-muted-foreground" },
};

function ProRequestCard({ request }: { request: any }) {
  const sc = PRO_REQUEST_STATUS_MAP[request.status] || PRO_REQUEST_STATUS_MAP.pending;
  const createdDate = request.created_at ? new Date(request.created_at).toLocaleDateString("fr-FR") : "";

  return (
    <div className="border border-border rounded-xl p-4 hover:border-foreground/20 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-display font-semibold text-foreground truncate">
              {request.project_title || request.establishment_name || request.client_company}
            </h3>
            <span className={`text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${sc.style}`}>
              {sc.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-body text-muted-foreground">
            {request.project_city && (
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {request.project_city}{request.project_country ? `, ${request.project_country}` : ""}</span>
            )}
            {request.budget_range && <span>{request.budget_range}</span>}
            {request.quantity_estimate && <span>{request.quantity_estimate} couverts</span>}
            {createdDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {createdDate}</span>}
          </div>
          {request.categories_needed && request.categories_needed.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {request.categories_needed.slice(0, 5).map((cat: string, i: number) => (
                <span key={i} className="text-[9px] font-body bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{cat}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// NEW PRO REQUEST FORM (comprehensive qualification form)
// ══════════════════════════════════════════════════════════════════════════════

const MIN_COVERS_QUAL = 80;
const MIN_BUDGET_QUAL = 30000;

const BUDGET_OPTIONS = [
  { value: "<10000", label: "< 10 000 \u20ac" },
  { value: "10000-20000", label: "10 000 - 20 000 \u20ac" },
  { value: "20000-30000", label: "20 000 - 30 000 \u20ac" },
  { value: "30000-50000", label: "30 000 - 50 000 \u20ac" },
  { value: "50000-80000", label: "50 000 - 80 000 \u20ac" },
  { value: "80000-100000", label: "80 000 - 100 000 \u20ac" },
  { value: ">100000", label: "> 100 000 \u20ac" },
];

const TIMELINE_OPTIONS = [
  { value: "urgent", label: "Urgent (< 1 mois)" },
  { value: "1-2months", label: "1-2 mois" },
  { value: "2-3months", label: "2-3 mois" },
  { value: "3-6months", label: "3-6 mois" },
  { value: "no_rush", label: "Pas de rush" },
];

const STYLE_OPTIONS = [
  "M\u00e9diterran\u00e9en", "Contemporain", "Industriel", "Scandinave", "Tropical",
  "Classique/\u00c9l\u00e9gant", "Rustique/Naturel", "Minimaliste", "Je ne sais pas encore",
];

const CATEGORY_OPTIONS = [
  "Chaises", "Tables", "Parasols", "Bains de soleil",
  "Mobilier lounge", "Tabourets de bar", "Accessoires (coussins, pots, etc.)",
];

const MATERIAL_OPTIONS = [
  "Aluminium", "Teck/Bois", "R\u00e9sine tress\u00e9e", "Polypropyl\u00e8ne", "Inox/Acier", "Pas de pr\u00e9f\u00e9rence",
];

const ESTABLISHMENT_TYPE_OPTIONS = [
  { value: "hotel", label: "H\u00f4tel" },
  { value: "resort", label: "Resort" },
  { value: "restaurant", label: "Restaurant" },
  { value: "beach_club", label: "Beach Club" },
  { value: "rooftop", label: "Rooftop Bar" },
  { value: "bar", label: "Bar / Lounge" },
  { value: "camping", label: "Camping / Glamping" },
  { value: "spa", label: "Spa / Wellness" },
  { value: "event_venue", label: "Espace \u00e9v\u00e9nementiel" },
  { value: "other", label: "Autre" },
];

const FUNCTION_OPTIONS = [
  { value: "director", label: "Directeur / G\u00e9rant" },
  { value: "purchasing", label: "Responsable achats" },
  { value: "interior_architect", label: "Architecte d'int\u00e9rieur" },
  { value: "project_manager", label: "Chef de projet" },
  { value: "other", label: "Autre" },
];

const REFERRAL_OPTIONS = [
  { value: "google", label: "Google" },
  { value: "social", label: "R\u00e9seaux sociaux" },
  { value: "referral", label: "Recommandation" },
  { value: "trade_show", label: "Salon professionnel" },
  { value: "other", label: "Autre" },
];

function parseBudgetRange(val: string): number | null {
  if (val.startsWith(">")) return 100001;
  const match = val.replace(/[<>€\s,]/g, "").match(/(\d+)/);
  if (!match) return null;
  return parseInt(match[1]);
}


function NewProRequestForm({
  onCancel,
  onSubmitted,
}: {
  onCancel: () => void;
  onSubmitted: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile, user: authUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<"form" | "not_qualified" | "submitted">("form");
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  const [form, setForm] = useState({
    // Section 1: Establishment
    establishmentType: "",
    establishmentName: "",
    location: "",
    covers: "",
    surfaceArea: "",
    projectNature: "new",
    // Section 2: Need
    categories: [] as string[],
    style: "",
    colors: "",
    materials: [] as string[],
    constraints: "",
    // Section 3: Budget & Planning
    budget: "",
    timeline: "",
    desiredDate: "",
    // Section 4: Accompaniment + Contact
    accompanimentType: "",
    notes: "",
    referralSource: "",
    fullName: profile?.first_name ? `${profile.first_name} ${profile.last_name || ""}`.trim() : "",
    email: profile?.email || "",
    phone: "",
    company: "",
    siren: "",
    clientFunction: "",
  });

  const handle = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm(p => ({ ...p, [field]: e.target.value }));
      if (errors[field]) setErrors(p => { const n = { ...p }; delete n[field]; return n; });
    };

  const toggleCategory = (cat: string) => {
    setForm(p => ({
      ...p,
      categories: p.categories.includes(cat)
        ? p.categories.filter(c => c !== cat)
        : [...p.categories, cat],
    }));
    if (errors.categories) setErrors(p => { const n = { ...p }; delete n.categories; return n; });
  };

  const toggleMaterial = (mat: string) => {
    setForm(p => ({
      ...p,
      materials: p.materials.includes(mat)
        ? p.materials.filter(m => m !== mat)
        : [...p.materials, mat],
    }));
  };

  const coversNum = parseInt(form.covers);
  const budgetNum = parseBudgetRange(form.budget);

  const isQualified = (coversNum >= MIN_COVERS_QUAL) || (budgetNum !== null && budgetNum >= MIN_BUDGET_QUAL);

  const inputClass = "w-full text-sm font-body bg-white border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta transition-all placeholder:text-muted-foreground/40";
  const inputErrorClass = "w-full text-sm font-body bg-white border border-red-400 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all placeholder:text-muted-foreground/40";
  const inputIconClass = "w-full text-sm font-body bg-white border border-border rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta transition-all placeholder:text-muted-foreground/40";
  const inputIconErrorClass = "w-full text-sm font-body bg-white border border-red-400 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all placeholder:text-muted-foreground/40";
  const labelClass = "text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5";
  const errorMsgClass = "text-[10px] font-body text-red-500 mt-1";

  const STEPS = [
    { icon: Building2, label: "\u00c9tablissement", subtitle: "D\u00e9crivez votre lieu" },
    { icon: Package, label: "Besoin", subtitle: "Ce que vous recherchez" },
    { icon: Calendar, label: "Budget & Planning", subtitle: "Votre enveloppe et d\u00e9lais" },
    { icon: Users, label: "Accompagnement & Contact", subtitle: "Vos coordonn\u00e9es" },
  ];

  const TOTAL_STEPS = STEPS.length;
  const progressPercent = ((step + 1) / TOTAL_STEPS) * 100;

  // Step validation
  const validateStep = (s: number): boolean => {
    const errs: Record<string, string> = {};
    if (s === 0) {
      if (!form.establishmentType) errs.establishmentType = "Champ requis";
      if (!form.establishmentName) errs.establishmentName = "Champ requis";
      if (!form.location) errs.location = "Champ requis";
      if (!form.covers) errs.covers = "Champ requis";
    } else if (s === 1) {
      if (form.categories.length === 0) errs.categories = "S\u00e9lectionnez au moins une cat\u00e9gorie";
    } else if (s === 2) {
      if (!form.budget) errs.budget = "Champ requis";
    } else if (s === 3) {
      if (!form.fullName) errs.fullName = "Champ requis";
      if (!form.email) errs.email = "Champ requis";
      if (!form.phone) errs.phone = "Champ requis";
      if (!form.company) errs.company = "Champ requis";
      if (!form.siren) errs.siren = "Champ requis";
      else if (form.siren.length !== 9) errs.siren = "9 chiffres requis";
      if (!form.accompanimentType) errs.accompanimentType = "Champ requis";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setDirection(1);
    setStep(s => Math.min(s + 1, TOTAL_STEPS - 1));
  };

  const goPrev = () => {
    setErrors({});
    setDirection(-1);
    setStep(s => Math.max(s - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    // Qualification check
    if (!isQualified) {
      setPhase("not_qualified");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("pro_service_requests").insert({
        client_name: form.fullName,
        client_email: form.email,
        client_phone: form.phone,
        client_company: form.company,
        project_title: `Pro Service \u2014 ${form.establishmentName}`,
        project_type: form.establishmentType,
        project_city: form.location.split(",")[0]?.trim() || form.location,
        project_country: form.location.split(",")[1]?.trim() || "France",
        categories_needed: form.categories,
        style_preferences: form.style ? [form.style] : [],
        budget_range: form.budget,
        quantity_estimate: coversNum || null,
        timeline: form.timeline,
        description: form.notes,
        special_requirements: form.constraints,
        status: "pending",
        establishment_name: form.establishmentName,
        surface_area: form.surfaceArea ? parseFloat(form.surfaceArea) : null,
        project_nature: form.projectNature,
        materials_preferred: form.materials,
        colors_preferred: form.colors,
        constraints_text: form.constraints,
        desired_date: form.desiredDate || null,
        accompaniment_type: form.accompanimentType,
        referral_source: form.referralSource,
        client_function: form.clientFunction,
        siren: form.siren,
        client_user_id: authUser?.id || null,
      } as any);

      if (error) throw error;

      const { data: admins } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("user_type", "admin");

      if (admins && admins.length > 0) {
        const notifications = admins.map(admin => ({
          user_id: admin.id,
          type: "pro_service",
          title: "Nouvelle demande Pro Service",
          body: `${form.fullName} (${form.company}) a soumis une demande Pro Service pour ${form.establishmentName}.`,
          link: "/admin",
        }));
        await supabase.from("notifications").insert(notifications);
      }

      try {
        await supabase.functions.invoke("send-notification-email", {
          body: {
            to: form.email,
            subject: "Votre demande Pro Service Terrassea",
            html: `<p>Bonjour ${form.fullName},</p><p>Votre demande Pro Service pour <strong>${form.establishmentName}</strong> a bien \u00e9t\u00e9 enregistr\u00e9e.</p><p>Notre \u00e9quipe vous contactera sous 24h pour vous mettre en relation avec le meilleur interlocuteur.</p><p>L'\u00e9quipe Terrassea</p>`,
          },
        });
      } catch {
        // Email is best-effort
      }

      setPhase("submitted");
    } catch (err) {
      console.error(err);
      toast.error(t("proHub.client.formSubmitError"));
    } finally {
      setSubmitting(false);
    }
  };

  // -- Submitted --
  if (phase === "submitted") {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="font-display text-xl font-bold tracking-tight mb-2">{t("proHub.client.formSuccessTitle")}</h2>
          <p className="text-sm font-body text-muted-foreground leading-relaxed mb-8">
            {t("proHub.client.formSuccessDesc")}
          </p>
          <button
            onClick={onSubmitted}
            className="inline-flex items-center gap-2 px-6 py-3 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90"
          >
            {t("proHub.client.formSuccessBack")} <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      </div>
    );
  }

  // -- Not qualified -- positive redirect --
  if (phase === "not_qualified") {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="font-display text-xl font-bold tracking-tight mb-4">{t("proService.catalogueMatchTitle")}</h2>
          <p className="text-sm font-body text-muted-foreground leading-relaxed mb-8">
            {t("proService.catalogueMatchDesc")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate("/products")} className="flex items-center justify-center gap-2 px-6 py-3 font-display font-semibold text-sm bg-terracotta text-white rounded-full hover:opacity-90">
              {t("proService.exploreCatalogue")} <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => navigate("/projects/new")} className="flex items-center justify-center gap-2 px-6 py-3 font-display font-semibold text-sm border border-border text-foreground rounded-full hover:border-foreground transition-all">
              {t("proService.launchGuidedProject")} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // -- Slide animation variants --
  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
  };

  // -- Accompaniment card options --
  const accompanimentCards = [
    { value: "supplier_only", icon: Factory, label: t("proHub.client.accompSupplier"), desc: t("proHub.client.accompSupplierDesc") },
    { value: "architect_only", icon: Compass, label: t("proHub.client.accompArchitect"), desc: t("proHub.client.accompArchitectDesc") },
    { value: "both", icon: Users, label: t("proHub.client.accompBoth"), desc: t("proHub.client.accompBothDesc") },
  ];

  // -- Step content renderers --
  const renderStep0 = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>{t("proHub.client.formEstablishment")} *</label>
          <select value={form.establishmentType} onChange={handle("establishmentType")} className={errors.establishmentType ? inputErrorClass : inputClass}>
            <option value="">{t("proHub.client.formSelect")}</option>
            {ESTABLISHMENT_TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {errors.establishmentType && <p className={errorMsgClass}>{errors.establishmentType}</p>}
        </div>
        <div>
          <label className={labelClass}>{t("proHub.client.formEstablishmentName")} *</label>
          <input type="text" value={form.establishmentName} onChange={handle("establishmentName")} placeholder="H\u00f4tel Les Pins" className={errors.establishmentName ? inputErrorClass : inputClass} />
          {errors.establishmentName && <p className={errorMsgClass}>{errors.establishmentName}</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>{t("proHub.client.formLocation")} *</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <input type="text" value={form.location} onChange={handle("location")} placeholder="Nice, France" className={errors.location ? inputIconErrorClass : inputIconClass} />
          </div>
          {errors.location && <p className={errorMsgClass}>{errors.location}</p>}
        </div>
        <div>
          <label className={labelClass}>{t("proHub.client.formCoversSeats")} *</label>
          <input type="number" value={form.covers} onChange={handle("covers")} placeholder="150" className={errors.covers ? inputErrorClass : inputClass} />
          {errors.covers && <p className={errorMsgClass}>{errors.covers}</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>{t("proHub.client.formSurface")}</label>
          <input type="number" value={form.surfaceArea} onChange={handle("surfaceArea")} placeholder="200" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>{t("proHub.client.formProjectNature")} *</label>
          <div className="flex gap-2 flex-wrap pt-1">
            {[
              { value: "renovation", label: t("proHub.client.natureRenovation") },
              { value: "new", label: t("proHub.client.natureNew") },
              { value: "extension", label: t("proHub.client.natureExtension") },
            ].map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => setForm(p => ({ ...p, projectNature: o.value }))}
                className={`text-sm font-body px-4 py-2 rounded-full border transition-all ${
                  form.projectNature === o.value
                    ? "bg-foreground text-primary-foreground border-foreground shadow-sm"
                    : "bg-white text-muted-foreground border-border hover:border-foreground/50"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-5">
      <div>
        <label className={labelClass}>{t("proHub.client.formCategories")} *</label>
        <div className="flex gap-2.5 flex-wrap">
          {CATEGORY_OPTIONS.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCategory(cat)}
              className={`text-sm font-body px-4 py-2 rounded-full border transition-all ${
                form.categories.includes(cat)
                  ? "bg-foreground text-primary-foreground border-foreground shadow-sm"
                  : "bg-white text-muted-foreground border-border hover:border-foreground/50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        {errors.categories && <p className={errorMsgClass}>{errors.categories}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>{t("proHub.client.formStyleWanted")}</label>
          <select value={form.style} onChange={handle("style")} className={inputClass}>
            <option value="">{t("proHub.client.formSelect")}</option>
            {STYLE_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>{t("proHub.client.formColors")}</label>
          <input type="text" value={form.colors} onChange={handle("colors")} placeholder="Beige, blanc, bois naturel..." className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>{t("proHub.client.formMaterials")}</label>
        <div className="flex gap-2.5 flex-wrap">
          {MATERIAL_OPTIONS.map(mat => (
            <button
              key={mat}
              type="button"
              onClick={() => toggleMaterial(mat)}
              className={`text-sm font-body px-4 py-2 rounded-full border transition-all ${
                form.materials.includes(mat)
                  ? "bg-foreground text-primary-foreground border-foreground shadow-sm"
                  : "bg-white text-muted-foreground border-border hover:border-foreground/50"
              }`}
            >
              {mat}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className={labelClass}>{t("proHub.client.formConstraints")}</label>
        <textarea value={form.constraints} onChange={handle("constraints")} placeholder="Vent, pluie, sol irr\u00e9gulier, empilage n\u00e9cessaire, normes feu..." rows={2} className={`${inputClass} resize-none`} />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>{t("proHub.client.formBudgetGlobal")} *</label>
          <div className="relative">
            <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <select value={form.budget} onChange={handle("budget")} className={errors.budget ? inputIconErrorClass : inputIconClass}>
              <option value="">{t("proHub.client.formSelect")}</option>
              {BUDGET_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          {errors.budget && <p className={errorMsgClass}>{errors.budget}</p>}
        </div>
        <div>
          <label className={labelClass}>{t("proHub.client.formTimelineWanted")}</label>
          <select value={form.timeline} onChange={handle("timeline")} className={inputClass}>
            <option value="">{t("proHub.client.formSelect")}</option>
            {TIMELINE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>{t("proHub.client.formDesiredDate")}</label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <input type="date" value={form.desiredDate} onChange={handle("desiredDate")} className={inputIconClass} />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      {/* Accompaniment type as cards */}
      <div>
        <label className={labelClass}>{t("proHub.client.formAccompaniment")} *</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
          {accompanimentCards.map(o => {
            const Icon = o.icon;
            const selected = form.accompanimentType === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  setForm(p => ({ ...p, accompanimentType: o.value }));
                  if (errors.accompanimentType) setErrors(p => { const n = { ...p }; delete n.accompanimentType; return n; });
                }}
                className={`relative flex flex-col items-start p-5 rounded-2xl border-2 text-left transition-all ${
                  selected
                    ? "border-terracotta bg-terracotta/5 shadow-md"
                    : "border-border bg-white hover:border-foreground/30 hover:shadow-sm"
                }`}
              >
                {selected && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle2 className="h-5 w-5 text-terracotta" />
                  </div>
                )}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                  selected ? "bg-terracotta/10" : "bg-muted/50"
                }`}>
                  <Icon className={`h-5 w-5 ${selected ? "text-terracotta" : "text-muted-foreground"}`} />
                </div>
                <p className="text-sm font-display font-semibold mb-1">{o.label}</p>
                <p className="text-xs font-body text-muted-foreground leading-relaxed">{o.desc}</p>
              </button>
            );
          })}
        </div>
        {errors.accompanimentType && <p className={errorMsgClass}>{errors.accompanimentType}</p>}
      </div>

      {/* Notes & referral */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>{t("proHub.client.formNotesCompl")}</label>
          <textarea value={form.notes} onChange={handle("notes")} placeholder={t("proHub.client.formNotesPlaceholder")} rows={3} className={`${inputClass} resize-none`} />
        </div>
        <div>
          <label className={labelClass}>{t("proHub.client.formReferral")}</label>
          <select value={form.referralSource} onChange={handle("referralSource")} className={inputClass}>
            <option value="">{t("proHub.client.formSelect")}</option>
            {REFERRAL_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-border" />

      {/* Contact info */}
      <div>
        <p className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground mb-4">Vos coordonn\u00e9es</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>{t("proHub.client.formFullName")} *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <input type="text" value={form.fullName} onChange={handle("fullName")} placeholder="Jean Dupont" className={errors.fullName ? inputIconErrorClass : inputIconClass} />
            </div>
            {errors.fullName && <p className={errorMsgClass}>{errors.fullName}</p>}
          </div>
          <div>
            <label className={labelClass}>{t("proHub.client.formEmailPro")} *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <input type="email" value={form.email} onChange={handle("email")} placeholder="jean@hotel.fr" className={errors.email ? inputIconErrorClass : inputIconClass} />
            </div>
            {errors.email && <p className={errorMsgClass}>{errors.email}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className={labelClass}>{t("proHub.client.formPhone")} *</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <input type="tel" value={form.phone} onChange={handle("phone")} placeholder="+33 6 12 34 56 78" className={errors.phone ? inputIconErrorClass : inputIconClass} />
            </div>
            {errors.phone && <p className={errorMsgClass}>{errors.phone}</p>}
          </div>
          <div>
            <label className={labelClass}>{t("proHub.client.formCompany")} *</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <input type="text" value={form.company} onChange={handle("company")} placeholder="SAS Les Pins" className={errors.company ? inputIconErrorClass : inputIconClass} />
            </div>
            {errors.company && <p className={errorMsgClass}>{errors.company}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className={labelClass}>{t("proHub.client.formSiren")} *</label>
            <input
              type="text"
              value={form.siren}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 9);
                setForm(p => ({ ...p, siren: v }));
                if (errors.siren) setErrors(p => { const n = { ...p }; delete n.siren; return n; });
              }}
              placeholder="123456789"
              className={errors.siren ? inputErrorClass : inputClass}
            />
            {errors.siren ? <p className={errorMsgClass}>{errors.siren}</p> : <p className="text-[9px] font-body text-muted-foreground mt-1">9 chiffres</p>}
          </div>
          <div>
            <label className={labelClass}>{t("proHub.client.formFunction")}</label>
            <select value={form.clientFunction} onChange={handle("clientFunction")} className={inputClass}>
              <option value="">{t("proHub.client.formSelect")}</option>
              {FUNCTION_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const stepRenderers = [renderStep0, renderStep1, renderStep2, renderStep3];
  const StepIcon = STEPS[step].icon;

  // -- Form --
  return (
    <div className="space-y-6">
      <button
        onClick={onCancel}
        className="flex items-center gap-1.5 text-xs font-display font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> {t("proHub.client.backToHub")}
      </button>

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-terracotta" />
            <h2 className="font-display text-xl font-bold tracking-tight">{t("proHub.client.newRequestFormTitle")}</h2>
          </div>
          <p className="text-sm font-body text-muted-foreground">{t("proHub.client.newRequestFormSubtitle")}</p>
        </div>

        {/* Step indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((s, i) => {
              const SIcon = s.icon;
              const isActive = i === step;
              const isDone = i < step;
              return (
                <div key={i} className="flex items-center gap-2 flex-1">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <motion.div
                      animate={{ scale: isActive ? 1 : 0.9, opacity: isActive || isDone ? 1 : 0.4 }}
                      transition={{ duration: 0.2 }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                        isActive
                          ? "bg-terracotta text-white shadow-md"
                          : isDone
                            ? "bg-terracotta/15 text-terracotta"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="h-5 w-5" /> : <SIcon className="h-4 w-4" />}
                    </motion.div>
                    <span className={`text-[9px] font-display font-semibold mt-1.5 text-center leading-tight hidden sm:block ${
                      isActive ? "text-foreground" : "text-muted-foreground"
                    }`}>{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="flex-1 h-px mx-1 mt-[-14px] sm:mt-[-20px]">
                      <div className={`h-full ${isDone ? "bg-terracotta/40" : "bg-border"}`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #D4603A, #e8845c)" }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            />
          </div>
          <p className="text-[10px] font-body text-muted-foreground text-right mt-1">{Math.round(progressPercent)}%</p>
        </div>

        {/* Step card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          {/* Step visual header */}
          <div className="flex items-center gap-4 mb-6 pb-5 border-b border-border">
            <div className="w-12 h-12 rounded-2xl bg-terracotta/10 flex items-center justify-center flex-shrink-0">
              <StepIcon className="h-6 w-6 text-terracotta" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold tracking-tight">{STEPS[step].label}</h3>
              <p className="text-xs font-body text-muted-foreground">{STEPS[step].subtitle}</p>
            </div>
          </div>

          {/* Step content with animation */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              {stepRenderers[step]()}
            </motion.div>
          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-8 pt-5 border-t border-border">
            {step > 0 ? (
              <button
                type="button"
                onClick={goPrev}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-display font-semibold text-muted-foreground hover:text-foreground border border-border rounded-full hover:border-foreground/30 transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Pr\u00e9c\u00e9dent
              </button>
            ) : (
              <div />
            )}

            {step < TOTAL_STEPS - 1 ? (
              <button
                type="button"
                onClick={goNext}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
              >
                Suivant <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-display font-semibold text-white rounded-full hover:opacity-90 transition-opacity disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #D4603A, #c4502a)" }}
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>{t("proHub.client.formSubmitPro")} <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Disclaimer on last step */}
        {step === TOTAL_STEPS - 1 && (
          <p className="text-[10px] text-muted-foreground font-body text-center mt-4 leading-relaxed">
            {t("proHub.client.formDisclaimer")}
          </p>
        )}
      </div>
    </div>
  );
}
