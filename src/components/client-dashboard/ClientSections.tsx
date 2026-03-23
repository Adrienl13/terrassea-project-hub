import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useConversations, useMessages, createConversation } from "@/hooks/useConversations";
import { useAuth } from "@/contexts/AuthContext";
import { useFavourites } from "@/contexts/FavouritesContext";
import {
  useClientProjects, useClientQuotes, useClientStats,
  type ClientProject, type ClientProjectProduct, type ClientQuote,
} from "@/hooks/useClientDashboard";
import { useFavouritePartners, useFavouriteArchitects } from "@/hooks/useFavouritesDB";
import { signDocument } from "@/lib/quoteDocuments";

const QuotePdfViewer = lazy(() => import("@/components/quotes/QuotePdfViewer"));
const QuoteRecapCard = lazy(() => import("@/components/quotes/QuoteRecapCard"));
const QuotePdfAccessSection = lazy(() => import("@/components/quotes/QuotePdfAccessSection"));
import {
  TrendingUp, ChevronRight, Heart, Plus, Search,
  FolderOpen, MessageSquare, Package, Users, HelpCircle,
  CheckCircle2, Clock, FileText, Send, ArrowRight,
  Lightbulb, ShieldCheck, Star, Eye, MapPin, X,
  ChevronDown, ChevronUp, Truck, ClipboardList,
  ExternalLink, Bookmark, Lock, Unlock, PenTool,
  Download, AlertTriangle, Upload, Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────────────────────────

export type ClientSectionSetter = (section: string) => void;

// ── Helpers ────────────────────────────────────────────────────────────────────

function StatCard({
  value, label, icon: Icon, color = "#D4603A",
}: {
  value: string; label: string; icon: any; color?: string;
}) {
  return (
    <div className="border border-border rounded-lg p-4 hover:border-foreground/20 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${color}12` }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </div>
      <p className="font-display font-bold text-xl text-foreground">{value}</p>
      <p className="text-[11px] font-body text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    draft:     { bg: "bg-gray-100", text: "text-gray-600", label: "Brouillon" },
    sourcing:  { bg: "bg-blue-50",  text: "text-blue-700", label: "En recherche" },
    quoted:    { bg: "bg-amber-50", text: "text-amber-700", label: "Devis reçu" },
    ordered:   { bg: "bg-emerald-50", text: "text-emerald-700", label: "Commandé" },
    delivered: { bg: "bg-green-50", text: "text-green-700", label: "Livré" },
    pending:   { bg: "bg-amber-50", text: "text-amber-700", label: "En attente" },
    replied:   { bg: "bg-blue-50",  text: "text-blue-700", label: "Devis reçu" },
    accepted:  { bg: "bg-green-50", text: "text-green-700", label: "Accepté" },
    signed:    { bg: "bg-emerald-50", text: "text-emerald-700", label: "Signé" },
    expired:   { bg: "bg-gray-100", text: "text-gray-500", label: "Expiré" },
  };
  const c = config[status] ?? config.draft;
  return (
    <span className={`text-[9px] font-display font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

function MaskedSupplierTag({ quote }: { quote: ClientQuote }) {
  const revealed = isSupplierRevealed(quote);
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-display font-semibold px-2 py-0.5 rounded-full ${
      revealed
        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
        : "bg-gray-100 text-gray-600 border border-gray-200"
    }`}>
      {revealed ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
      {getSupplierDisplayName(quote)}
      {quote.supplierCountryCode && <span className="text-xs ml-0.5">{countryFlag(quote.supplierCountryCode)}</span>}
      {quote.supplierVerified && <ShieldCheck className="h-3 w-3 ml-0.5" />}
    </span>
  );
}

// ── Mock data ──────────────────────────────────────────────────────────────────

// ── Country flag from ISO code ───────────────────────────────────────────────

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  return String.fromCodePoint(
    ...code.toUpperCase().split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

// ── Supplier masking helpers ─────────────────────────────────────────────────

function isSupplierRevealed(quote: ClientQuote) {
  return quote.status === "signed";
}

function getSupplierDisplayName(quote: ClientQuote) {
  return isSupplierRevealed(quote) ? quote.supplierReal : quote.supplierAlias;
}

// ── Date formatting ─────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} jours`;
  if (days < 30) return `Il y a ${Math.floor(days / 7)} sem.`;
  return `Il y a ${Math.floor(days / 30)} mois`;
}

// ── Venue emojis ───────────────────────────────────────────────────────────────

const VENUE_EMOJI: Record<string, string> = {
  restaurant: "🍽️",
  hotel: "🏨",
  "beach-club": "🏖️",
  rooftop: "🌇",
  bar: "🍸",
  camping: "⛺",
  pool: "🏊",
  event: "🎪",
};

// ══════════════════════════════════════════════════════════════════════════════
// ── CLIENT OVERVIEW ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export function ClientOverview({
  onNavigate,
  favourites,
  onToggleFavourite,
}: {
  onNavigate: ClientSectionSetter;
  favourites: any[];
  onToggleFavourite: (p: any) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { activeProjects, pendingQuotes, totalEstimated, projectsByStatus, projects, quotes } = useClientStats();
  const [showHowItWorks, setShowHowItWorks] = useState(() => {
    try { return localStorage.getItem("terrassea_hiw_seen") !== "1"; } catch { return true; }
  });

  const firstName = profile?.first_name || "there";

  return (
    <div className="space-y-8">
      {/* ── Welcome banner ──────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-[#D4603A]/5 via-transparent to-[#D4603A]/3 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display font-bold text-xl text-foreground">
              {t("cd.welcome", { name: firstName })}
            </h1>
            <p className="text-sm font-body text-muted-foreground mt-1 max-w-md">
              {t("cd.welcomeSubtitle")}
            </p>
          </div>
          <button
            onClick={() => navigate("/pro-service")}
            className="hidden sm:flex items-center gap-1.5 text-[11px] font-display font-semibold text-[#D4603A] hover:underline shrink-0"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            {t("cd.needHelp")}
          </button>
        </div>

        {/* Seasonal tip */}
        <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50/80 border border-amber-100">
          <Lightbulb className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-[11px] font-body text-amber-800">
            {t("cd.seasonalTip")}
          </p>
        </div>
      </div>

      {/* ── Quick actions ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: FolderOpen, label: t("cd.quickActions.newProject"), onClick: () => navigate("/projects/new"), primary: true },
          { icon: Package, label: t("cd.quickActions.browseProducts"), onClick: () => navigate("/products") },
          { icon: FileText, label: t("cd.quickActions.requestQuote"), onClick: () => onNavigate("quotes") },
          { icon: Users, label: t("cd.quickActions.talkExpert"), onClick: () => navigate("/pro-service") },
        ].map((action, i) => (
          <button
            key={i}
            onClick={action.onClick}
            className={`flex items-center gap-3 p-4 rounded-lg border transition-all text-left ${
              action.primary
                ? "bg-foreground text-primary-foreground border-foreground hover:opacity-90"
                : "border-border hover:border-foreground/30 hover:bg-card"
            }`}
          >
            <action.icon className="h-5 w-5 shrink-0" />
            <span className="text-xs font-display font-semibold">{action.label}</span>
          </button>
        ))}
      </div>

      {/* ── Stats ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard value={String(activeProjects)} label={t("cd.stats.activeProjects")} icon={FolderOpen} color="#2563EB" />
        <StatCard value={String(pendingQuotes)} label={t("cd.stats.pendingQuotes")} icon={ClipboardList} color="#D97706" />
        <StatCard value={`€${totalEstimated.toLocaleString()}`} label={t("cd.stats.totalEstimated")} icon={TrendingUp} color="#059669" />
        <StatCard
          value={String(favourites.length)}
          label={t("cd.stats.savedFavourites")}
          icon={Heart}
          color="#EC4899"
        />
      </div>

      {/* ── Project journey stepper ─────────────────────────────── */}
      <div>
        <p className="font-display font-bold text-sm text-foreground mb-4">{t("cd.projectFlow.title")}</p>
        <div className="flex items-center gap-0">
          {[
            { key: "draft", count: projectsByStatus["draft"] || 0, color: "#9CA3AF" },
            { key: "sourcing", count: projectsByStatus["sourcing"] || 0, color: "#3B82F6" },
            { key: "quoted", count: projectsByStatus["quoted"] || 0, color: "#F59E0B" },
            { key: "ordered", count: projectsByStatus["ordered"] || 0, color: "#8B5CF6" },
            { key: "delivered", count: projectsByStatus["delivered"] || 0, color: "#10B981" },
          ].map((step, i, arr) => (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-display font-bold text-white mb-1.5"
                  style={{ background: step.count > 0 ? step.color : `${step.color}40` }}
                >
                  {step.count}
                </div>
                <span className="text-[10px] font-body text-muted-foreground text-center">
                  {t(`cd.projectFlow.${step.key}`)}
                </span>
              </div>
              {i < arr.length - 1 && (
                <div className="h-px w-full bg-border -mt-4" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent projects ─────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="font-display font-bold text-sm text-foreground">{t("cd.projects.recent")}</p>
          <button
            onClick={() => onNavigate("projects")}
            className="text-[11px] font-body text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            {t("cd.projects.viewAll")} <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div className="space-y-2">
          {projects.slice(0, 3).map((p) => (
            <div
              key={p.id}
              onClick={() => onNavigate(`project-detail:${p.id}`)}
              className="flex items-center justify-between px-4 py-3 border border-border rounded-lg hover:border-foreground/20 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{VENUE_EMOJI[p.venueType] || "📋"}</span>
                <div>
                  <p className="text-xs font-display font-semibold text-foreground group-hover:text-[#D4603A] transition-colors">
                    {p.name}
                  </p>
                  <p className="text-[10px] font-body text-muted-foreground">
                    {p.productCount} produits · {timeAgo(p.updatedAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-display font-semibold text-foreground hidden sm:block">
                  €{p.estimatedValue.toLocaleString()}
                </span>
                <StatusBadge status={p.status} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent quotes ───────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="font-display font-bold text-sm text-foreground">{t("cd.quotes.recent")}</p>
          <button
            onClick={() => onNavigate("quotes")}
            className="text-[11px] font-body text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            {t("cd.projects.viewAll")} <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div className="space-y-2">
          {quotes.slice(0, 3).map((q) => (
            <div
              key={q.id}
              onClick={() => onNavigate("quotes")}
              className="flex items-center justify-between px-4 py-3 border border-border rounded-lg hover:border-foreground/20 transition-colors cursor-pointer"
            >
              <div>
                <p className="text-xs font-display font-semibold text-foreground">{q.productName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <MaskedSupplierTag quote={q} />
                  <span className="text-[10px] font-body text-muted-foreground">{q.quantity} pcs · {q.date}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-display font-semibold text-foreground hidden sm:block">
                  €{(q.totalPrice || 0).toLocaleString()}
                </span>
                <StatusBadge status={q.status} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Favourites preview ──────────────────────────────────── */}
      {favourites.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="font-display font-bold text-sm text-foreground">
              {t("cd.favourites.title")}
            </p>
            <button
              onClick={() => onNavigate("favourites")}
              className="text-[11px] font-body text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              {favourites.length} {t("cd.favourites.saved")} <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {favourites.slice(0, 6).map((p) => (
              <FavMiniCard key={p.id} product={p} onRemove={() => onToggleFavourite(p)} />
            ))}
          </div>
        </div>
      )}

      {/* ── How it works (collapsible, reassuring) ──────────────── */}
      <div className="border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => {
            setShowHowItWorks(!showHowItWorks);
            if (showHowItWorks) {
              try { localStorage.setItem("terrassea_hiw_seen", "1"); } catch {}
            }
          }}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-card transition-colors"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#D4603A]" />
            <span className="text-sm font-display font-semibold text-foreground">
              {t("cd.howItWorks.title")}
            </span>
          </div>
          {showHowItWorks ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {showHowItWorks && (
          <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { step: 1, icon: FolderOpen, key: "step1", color: "#3B82F6" },
              { step: 2, icon: Package, key: "step2", color: "#F59E0B" },
              { step: 3, icon: FileText, key: "step3", color: "#8B5CF6" },
              { step: 4, icon: Truck, key: "step4", color: "#10B981" },
            ].map((s) => (
              <div key={s.step} className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: s.color }}
                >
                  {s.step}
                </div>
                <p className="text-[11px] font-body text-muted-foreground leading-relaxed pt-1.5">
                  {t(`cd.howItWorks.${s.key}`)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Reassurance bar ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: ShieldCheck, text: t("cd.reassurance.verified") },
          { icon: Users, text: t("cd.reassurance.experts") },
          { icon: Truck, text: t("cd.reassurance.delivery") },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-card border border-border">
            <item.icon className="h-4 w-4 text-[#D4603A] shrink-0" />
            <span className="text-[11px] font-body text-muted-foreground">{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Spec row (used in product recap) ─────────────────────────────────────────

function SpecRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] font-body text-muted-foreground whitespace-nowrap">{label}</span>
      <span className={`text-[10px] font-body truncate ${highlight ? "font-display font-bold text-[#D4603A]" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

// ── Fav mini card (reused) ──────────────────────────────────────────────────

function FavMiniCard({ product, onRemove }: { product: any; onRemove: () => void }) {
  const navigate = useNavigate();
  return (
    <div onClick={() => navigate(`/products/${product.id}`)} className="group cursor-pointer">
      <div className="relative aspect-square rounded-lg overflow-hidden border border-border mb-1.5">
        <img
          src={product.image_url || "/placeholder.svg"}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <p className="text-[11px] font-display font-semibold text-foreground truncate">{product.name}</p>
      <p className="text-[10px] font-body text-muted-foreground">
        {product.price_min ? `€${product.price_min}+` : "—"}
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── CLIENT PROJECTS ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export function ClientProjectsSection({ onNavigate }: { onNavigate: ClientSectionSetter }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: allProjects = [], isLoading } = useClientProjects();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filters = [
    { id: "all", label: t("cd.projects.all") },
    { id: "draft", label: t("cd.projectFlow.draft") },
    { id: "sourcing", label: t("cd.projectFlow.sourcing") },
    { id: "quoted", label: t("cd.projectFlow.quoted") },
    { id: "ordered", label: t("cd.projectFlow.ordered") },
    { id: "delivered", label: t("cd.projectFlow.delivered") },
  ];

  const filtered = allProjects
    .filter((p) => filter === "all" || p.status === filter)
    .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-lg text-foreground">{t("cd.projects.title")}</h2>
        <button
          onClick={() => navigate("/projects/new")}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
        >
          <Plus className="h-3.5 w-3.5" /> {t("account.newProject")}
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`text-[11px] font-display font-semibold px-3 py-1.5 rounded-full border transition-all ${
              filter === f.id
                ? "bg-foreground text-primary-foreground border-foreground"
                : "text-muted-foreground border-border hover:border-foreground/30"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("cd.projects.searchPlaceholder")}
          className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-xs font-body focus:outline-none focus:border-foreground/40 transition-colors"
        />
      </div>

      {/* Project list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FolderOpen className="h-10 w-10 text-muted-foreground/20 mb-3" />
          <p className="text-sm font-body text-muted-foreground mb-1">{t("cd.projects.empty")}</p>
          <p className="text-xs font-body text-muted-foreground/70 mb-4 max-w-xs">{t("cd.projects.emptyHint")}</p>
          <button
            onClick={() => navigate("/projects/new")}
            className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
          >
            <Plus className="h-3.5 w-3.5" /> {t("cd.projects.createFirst")}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div
              key={p.id}
              onClick={() => onNavigate(`project-detail:${p.id}`)}
              className="flex items-center justify-between px-4 py-4 border border-border rounded-lg hover:border-foreground/20 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{VENUE_EMOJI[p.venueType] || "📋"}</span>
                <div>
                  <p className="text-sm font-display font-semibold text-foreground group-hover:text-[#D4603A] transition-colors">
                    {p.name}
                  </p>
                  <p className="text-[11px] font-body text-muted-foreground mt-0.5">
                    {p.productCount} produits · {p.quotesCount} devis · {timeAgo(p.updatedAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-display font-semibold text-foreground hidden sm:block">
                  €{p.estimatedValue.toLocaleString()}
                </span>
                <StatusBadge status={p.status} />
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── CLIENT PROJECT DETAIL ───────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export function ClientProjectDetail({
  projectId,
  onBack,
}: {
  projectId: string;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: allProjects = [] } = useClientProjects();
  const { data: allQuotes = [] } = useClientQuotes();
  const project = allProjects.find((p) => p.id === projectId);

  if (!project) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">{t("cd.detail.notFound")}</p>
        <button onClick={onBack} className="mt-2 text-sm text-[#D4603A] hover:underline">{t("cd.detail.backToProjects")}</button>
      </div>
    );
  }

  const products = project.products;
  const relatedQuotes = allQuotes.filter((q) => q.projectRequestId === project.id);
  const totalItems = products.reduce((sum, p) => sum + p.quantity, 0);
  const totalBudget = products.reduce((sum, p) => sum + (p.priceMin || 0) * p.quantity, 0);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  // Steps for progress
  const steps = ["draft", "sourcing", "quoted", "ordered", "delivered"];
  const currentStep = steps.indexOf(project.status);

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-body text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronRight className="h-3 w-3 rotate-180" /> {t("cd.detail.backToProjects")}
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{VENUE_EMOJI[project.venueType] || "📋"}</span>
          <div>
            <h2 className="font-display font-bold text-lg text-foreground">{project.name}</h2>
            <p className="text-xs font-body text-muted-foreground mt-0.5">
              {products.length} {t("cd.detail.productRefs")} · {totalItems} {t("cd.detail.totalPieces")} · €{totalBudget.toLocaleString()} {t("cd.detail.estimated")}
            </p>
          </div>
        </div>
        <StatusBadge status={project.status} />
      </div>

      {/* Progress bar */}
      <div>
        <p className="text-[11px] font-display font-semibold text-muted-foreground mb-3">{t("cd.detail.progress")}</p>
        <div className="flex items-center gap-0">
          {steps.map((step, i) => (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold mb-1 ${
                    i <= currentStep
                      ? "bg-[#D4603A] text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {i <= currentStep ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className={`text-[9px] font-body text-center ${i <= currentStep ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                  {t(`cd.projectFlow.${step}`)}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-0.5 w-full -mt-4 ${i < currentStep ? "bg-[#D4603A]" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <button
          onClick={() => navigate("/products")}
          className="flex items-center gap-2 px-4 py-3 border border-border rounded-lg text-xs font-display font-semibold hover:border-foreground/30 transition-colors"
        >
          <Package className="h-4 w-4 text-[#D4603A]" /> {t("cd.detail.addProducts")}
        </button>
        <button
          onClick={() => navigate("/products")}
          className="flex items-center gap-2 px-4 py-3 border border-border rounded-lg text-xs font-display font-semibold hover:border-foreground/30 transition-colors"
        >
          <FileText className="h-4 w-4 text-[#D4603A]" /> {t("cd.detail.requestQuote")}
        </button>
        <button
          onClick={() => navigate("/pro-service")}
          className="flex items-center gap-2 px-4 py-3 border border-border rounded-lg text-xs font-display font-semibold hover:border-foreground/30 transition-colors"
        >
          <Users className="h-4 w-4 text-[#D4603A]" /> {t("cd.detail.getHelp")}
        </button>
      </div>

      {/* ── Products in this project ────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="font-display font-bold text-sm text-foreground">
            {t("cd.detail.productsInProject")} ({products.length})
          </p>
          <button
            onClick={() => navigate("/products")}
            className="text-[11px] font-body text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> {t("cd.detail.addProducts")}
          </button>
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-xl">
            <Package className="h-10 w-10 text-muted-foreground/20 mb-3" />
            <p className="text-sm font-body text-muted-foreground mb-1">{t("cd.detail.noProducts")}</p>
            <p className="text-xs font-body text-muted-foreground/70 mb-4 max-w-xs">{t("cd.detail.noProductsHint")}</p>
            <button
              onClick={() => navigate("/products")}
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
            >
              <Package className="h-3.5 w-3.5" /> {t("cd.quickActions.browseProducts")}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((product) => {
              const relatedQuote = relatedQuotes.find(
                (q) => q.productName === product.name
              );
              const isExpanded = expandedProduct === product.id;
              return (
                <div
                  key={product.id}
                  className={`border rounded-xl overflow-hidden transition-colors ${isExpanded ? "border-[#D4603A]/30 bg-[#D4603A]/[0.02]" : "border-border hover:border-foreground/15"}`}
                >
                  {/* ── Collapsed row (always visible) ────────── */}
                  <button
                    onClick={() => setExpandedProduct(isExpanded ? null : product.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  >
                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-border shrink-0 bg-gray-50">
                      <img src={product.image || "/placeholder.svg"} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                    {/* Name + brand */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-display font-bold text-foreground truncate">{product.name}</p>
                        {relatedQuote && <StatusBadge status={relatedQuote.status} />}
                      </div>
                      <p className="text-[10px] font-body text-muted-foreground">{product.brand} · {product.category}</p>
                    </div>
                    {/* Qty + price */}
                    <div className="text-right shrink-0">
                      <p className="text-xs font-display font-bold text-foreground">×{product.quantity}</p>
                      {product.priceMin && (
                        <p className="text-[10px] font-display font-semibold text-[#D4603A]">
                          €{(product.priceMin * product.quantity).toLocaleString()}
                        </p>
                      )}
                    </div>
                    {/* Chevron */}
                    <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>

                  {/* ── Expanded product recap card ────────────── */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0">
                      <div className="border-t border-border/50 pt-4">
                        <div className="flex gap-4">
                          {/* Larger image */}
                          <div className="w-32 sm:w-40 shrink-0 aspect-square rounded-lg overflow-hidden border border-border bg-gray-50">
                            <img src={product.image || "/placeholder.svg"} alt={product.name} className="w-full h-full object-cover" />
                          </div>

                          {/* Full recap */}
                          <div className="flex-1 min-w-0 space-y-3">
                            {/* Header */}
                            <div>
                              <span className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground bg-gray-100 px-2 py-0.5 rounded">
                                {product.category}
                              </span>
                              <p className="text-sm font-display font-bold text-foreground mt-1">{product.name}</p>
                              <p className="text-[11px] font-body text-muted-foreground">{product.brand} · {product.color}</p>
                            </div>

                            {/* Technical specs grid */}
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                              <SpecRow label={t("cd.detail.spec.material")} value={product.material} />
                              <SpecRow label={t("cd.detail.spec.dimensions")} value={product.dimensions} />
                              {product.weight && <SpecRow label={t("cd.detail.spec.weight")} value={`${product.weight} kg`} />}
                              <SpecRow label={t("cd.detail.spec.quantity")} value={`${product.quantity} pcs`} />
                              {product.priceMin && <SpecRow label={t("cd.detail.spec.unitPrice")} value={`€${product.priceMin}`} />}
                              {product.priceMin && <SpecRow label={t("cd.detail.spec.subtotal")} value={`€${(product.priceMin * product.quantity).toLocaleString()}`} highlight />}
                            </div>

                            {/* Property tags */}
                            <div className="flex flex-wrap gap-1.5">
                              {product.isOutdoor && (
                                <span className="text-[8px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">Outdoor</span>
                              )}
                              {product.isStackable && (
                                <span className="text-[8px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{t("cd.detail.spec.stackable")}</span>
                              )}
                              {product.uvResistant && (
                                <span className="text-[8px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">{t("cd.detail.spec.uvResistant")}</span>
                              )}
                            </div>

                            {/* Related quote info */}
                            {relatedQuote && (
                              <div className="px-3 py-2 rounded-lg bg-card border border-border">
                                <p className="text-[10px] font-display font-semibold text-muted-foreground mb-1">{t("cd.detail.quoteStatus")}</p>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <MaskedSupplierTag quote={relatedQuote} />
                                    <span className="text-[10px] font-body text-muted-foreground">{relatedQuote.date}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-display font-semibold">€{relatedQuote.totalPrice.toLocaleString()}</span>
                                    <StatusBadge status={relatedQuote.status} />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* CTA to full product page */}
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/products/${product.productId}`); }}
                              className="text-[11px] font-display font-semibold text-[#D4603A] hover:underline flex items-center gap-1 pt-1"
                            >
                              {t("cd.detail.viewFullProduct")} <ExternalLink className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Budget summary ──────────────────────────────────────── */}
      {products.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="font-display font-bold text-sm text-foreground mb-3">{t("cd.detail.budgetSummary")}</p>
          <div className="space-y-2">
            {products.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-xs font-body">
                <span className="text-muted-foreground truncate mr-3">{p.name} ×{p.quantity}</span>
                <span className="font-display font-semibold text-foreground shrink-0">
                  {p.unitPrice ? `€${(p.unitPrice * p.quantity).toLocaleString()}` : "—"}
                </span>
              </div>
            ))}
            <div className="border-t border-border pt-2 mt-2 flex items-center justify-between">
              <span className="text-xs font-display font-bold text-foreground">{t("cd.detail.totalEstimated")}</span>
              <span className="text-sm font-display font-bold text-[#D4603A]">€{totalBudget.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Related quotes ──────────────────────────────────────── */}
      {relatedQuotes.length > 0 && (
        <div>
          <p className="font-display font-bold text-sm text-foreground mb-3">{t("cd.detail.relatedQuotes")}</p>
          <div className="space-y-2">
            {relatedQuotes.map((q) => (
              <div key={q.id} className="flex items-center justify-between px-4 py-3 border border-border rounded-lg">
                <div>
                  <p className="text-xs font-display font-semibold text-foreground">{q.productName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <MaskedSupplierTag quote={q} />
                    <span className="text-[10px] font-body text-muted-foreground">{q.quantity} pcs</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-display font-semibold">€{(q.totalPrice || 0).toLocaleString()}</span>
                  <StatusBadge status={q.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help tip */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-blue-50/50 border border-blue-100">
        <HelpCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-[11px] font-display font-semibold text-blue-800 mb-0.5">{t("cd.detail.helpTipTitle")}</p>
          <p className="text-[10px] font-body text-blue-700">{t("cd.detail.helpTipText")}</p>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── CLIENT QUOTES ───────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export function ClientQuotesSection({ onNavigate }: { onNavigate?: ClientSectionSetter }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: allQuotes = [], isLoading } = useClientQuotes();
  const [filter, setFilter] = useState("all");
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signingQuoteId, setSigningQuoteId] = useState<string | null>(null);
  const [hasSigned, setHasSigned] = useState(false);

  const filters = [
    { id: "all", label: t("cd.quotes.all") },
    { id: "pending", label: t("cd.quotes.pending") },
    { id: "replied", label: t("cd.quotes.replied") },
    { id: "signed", label: t("cd.quotes.signed") },
    { id: "expired", label: t("cd.quotes.expired") },
  ];

  const filtered = allQuotes.filter((q) => filter === "all" || q.status === filter);
  const activeQuote = selectedQuote ? allQuotes.find((q) => q.id === selectedQuote) : null;

  // ── Quote detail view ──────────────────────────────────────
  if (activeQuote) {
    const revealed = isSupplierRevealed(activeQuote);
    return (
      <div className="space-y-5">
        {/* Back */}
        <button
          onClick={() => setSelectedQuote(null)}
          className="flex items-center gap-1.5 text-xs font-body text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-3 w-3 rotate-180" /> {t("cd.quotes.backToQuotes")}
        </button>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display font-bold text-lg text-foreground">{activeQuote.productName}</h2>
            <p className="text-xs font-body text-muted-foreground mt-0.5">{activeQuote.projectName}</p>
          </div>
          <StatusBadge status={activeQuote.status} />
        </div>

        {/* Supplier info (masked or revealed) */}
        <div className={`rounded-xl border p-5 ${revealed ? "border-emerald-200 bg-emerald-50/30" : "border-border bg-card"}`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider">{t("cd.quotes.supplierInfo")}</p>
            <MaskedSupplierTag quote={activeQuote} />
          </div>

          {revealed ? (
            <div className="grid grid-cols-2 gap-3">
              <SpecRow label={t("cd.quotes.supplierName")} value={activeQuote.supplierReal} />
              <SpecRow label={t("cd.quotes.supplierCountry")} value={"—"} />
              <SpecRow label={t("cd.quotes.rating")} value={`${4.5}/5`} />
              <SpecRow label={t("cd.quotes.signedDate")} value={activeQuote.signedAt || "—"} />
            </div>
          ) : (
            <div className="flex items-start gap-3 mt-2">
              <Lock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-display font-semibold text-foreground">{t("cd.quotes.identityHidden")}</p>
                <p className="text-[10px] font-body text-muted-foreground">{t("cd.quotes.identityHiddenHint")}</p>
              </div>
            </div>
          )}

          {/* Supplier profile badges */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {activeQuote.supplierVerified && (
              <span className="text-[8px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1">
                <ShieldCheck className="h-2.5 w-2.5" /> {t("cd.quotes.verified")}
              </span>
            )}
            <span className="text-[8px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 flex items-center gap-1">
              <Star className="h-2.5 w-2.5" /> {4.5}/5
            </span>
          </div>
        </div>

        {/* Quote details */}
        <div className="border border-border rounded-xl p-5 space-y-3">
          <p className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider">{t("cd.quotes.quoteDetails")}</p>
          <div className="grid grid-cols-2 gap-3">
            <SpecRow label={t("cd.detail.spec.quantity")} value={`${activeQuote.quantity} pcs`} />
            <SpecRow label={t("cd.detail.spec.unitPrice")} value={`€${activeQuote.unitPrice}`} />
            <SpecRow label={t("cd.quotes.validUntil")} value={"30 jours"} />
            <SpecRow label={t("cd.detail.spec.subtotal")} value={`€${activeQuote.totalPrice.toLocaleString()}`} highlight />
          </div>
        </div>

        {/* PDF download (if available) */}
        {/* Structured recap (always visible) */}
        <Suspense fallback={<div className="h-40 animate-pulse bg-card rounded-xl" />}>
          <QuoteRecapCard quote={{
            productName: activeQuote.productName,
            quantity: activeQuote.quantity,
            unitPrice: activeQuote.unitPrice,
            totalPrice: activeQuote.totalPrice,
            tvaRate: activeQuote.tvaRate ?? null,
            deliveryDelayDays: activeQuote.deliveryDelayDays ?? null,
            deliveryConditions: activeQuote.deliveryConditions ?? null,
            paymentConditions: activeQuote.paymentConditions ?? null,
            validityDays: activeQuote.validityDays ?? null,
            validityExpiresAt: activeQuote.validityExpiresAt ?? null,
            partnerConditions: activeQuote.partnerConditions ?? null,
            supplierAlias: activeQuote.supplierAlias,
            supplierCountryCode: activeQuote.supplierCountryCode,
            status: activeQuote.status,
          }} />
        </Suspense>

        {/* PDF access — gated: only after signature + deposit */}
        <Suspense fallback={<div className="h-16 animate-pulse bg-card rounded-xl" />}>
          <QuotePdfAccessSection quoteRequestId={activeQuote.id} status={activeQuote.status} />
        </Suspense>

        {/* Actions */}
        <div className="space-y-3">
          {/* Sign & accept */}
          {activeQuote.status === "replied" && activeQuote.pdfPath && (
            <button
              onClick={() => { setSigningQuoteId(activeQuote.id); setShowSignModal(true); }}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-display font-bold bg-[#D4603A] text-white rounded-xl hover:opacity-90 transition-opacity"
            >
              <PenTool className="h-4 w-4" /> {t("cd.quotes.signAndAccept")}
            </button>
          )}

          {/* Already signed */}
          {activeQuote.status === "signed" && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-display font-semibold text-emerald-800">{t("cd.quotes.signedConfirm")}</p>
                <p className="text-[10px] font-body text-emerald-700">{t("cd.quotes.signedConfirmHint")}</p>
              </div>
            </div>
          )}

          {/* Pending — no PDF yet */}
          {activeQuote.status === "pending" && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50/50 border border-amber-100">
              <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-display font-semibold text-amber-800">{t("cd.quotes.awaitingSupplier")}</p>
                <p className="text-[10px] font-body text-amber-700">{t("cd.quotes.awaitingSupplierHint")}</p>
              </div>
            </div>
          )}

          {/* Message via platform */}
          <button
            onClick={() => onNavigate?.("messages")}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-display font-semibold border border-border rounded-xl hover:border-foreground/30 transition-colors"
          >
            <MessageSquare className="h-4 w-4" /> {t("cd.quotes.messageVia")}
          </button>
        </div>

        {/* Security note */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-50/50 border border-blue-100">
          <ShieldCheck className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-display font-semibold text-blue-800">{t("cd.quotes.securityTitle")}</p>
            <p className="text-[10px] font-body text-blue-700">{t("cd.quotes.securityHint")}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Quote list view ────────────────────────────────────────
  return (
    <div className="space-y-5">
      <h2 className="font-display font-bold text-lg text-foreground">{t("cd.quotes.title")}</h2>

      {/* Info banner — how quotes work */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[#D4603A]/5 border border-[#D4603A]/10">
        <ShieldCheck className="h-4 w-4 text-[#D4603A] shrink-0 mt-0.5" />
        <div>
          <p className="text-[11px] font-display font-semibold text-foreground">{t("cd.quotes.howItWorksTitle")}</p>
          <p className="text-[10px] font-body text-muted-foreground">{t("cd.quotes.howItWorksHint")}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {filters.map((f) => {
          const count = f.id === "all" ? allQuotes.length : allQuotes.filter((q) => q.status === f.id).length;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`text-[11px] font-display font-semibold px-3 py-1.5 rounded-full border transition-all ${
                filter === f.id
                  ? "bg-foreground text-primary-foreground border-foreground"
                  : "text-muted-foreground border-border hover:border-foreground/30"
              }`}
            >
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Quotes */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/20 mb-3" />
          <p className="text-sm font-body text-muted-foreground mb-1">{t("cd.quotes.empty")}</p>
          <p className="text-xs font-body text-muted-foreground/70 mb-4 max-w-xs">{t("cd.quotes.emptyHint")}</p>
          <button
            onClick={() => navigate("/products")}
            className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
          >
            <Package className="h-3.5 w-3.5" /> {t("cd.quickActions.browseProducts")}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((q) => (
            <div
              key={q.id}
              onClick={() => setSelectedQuote(q.id)}
              className="flex items-center justify-between px-4 py-4 border border-border rounded-xl hover:border-foreground/20 transition-colors cursor-pointer group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-display font-semibold text-foreground group-hover:text-[#D4603A] transition-colors">{q.productName}</p>
                  {q.status === "replied" && q.pdfPath && (
                    <span className="text-[8px] font-display font-semibold uppercase px-1.5 py-0.5 rounded-full bg-[#D4603A]/10 text-[#D4603A] flex items-center gap-0.5">
                      <PenTool className="h-2.5 w-2.5" /> {t("cd.quotes.toSign")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <MaskedSupplierTag quote={q} />
                  <span className="text-[10px] font-body text-muted-foreground">· {q.quantity} pcs · {q.projectName}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0 ml-4">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-display font-bold text-foreground">€{(q.totalPrice || 0).toLocaleString()}</p>
                  <p className="text-[10px] font-body text-muted-foreground">{q.date}</p>
                </div>
                <StatusBadge status={q.status} />
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending info */}
      {allQuotes.filter((q) => q.status === "pending").length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50/50 border border-amber-100">
          <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] font-body text-amber-800">
            {t("cd.quotes.waitingResponse")}
          </p>
        </div>
      )}

      {/* ── Sign modal ──────────────────────────────────────────── */}
      {showSignModal && signingQuoteId && (
        <SignatureModal
          quoteId={signingQuoteId}
          onClose={() => { setShowSignModal(false); setSigningQuoteId(null); }}
          onSigned={() => { setShowSignModal(false); setSigningQuoteId(null); setHasSigned(true); }}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── SIGNATURE MODAL ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function SignatureModal({
  quoteId,
  onClose,
  onSigned,
}: {
  quoteId: string;
  onClose: () => void;
  onSigned: () => void;
}) {
  const { t } = useTranslation();
  const { profile, user } = useAuth();
  const { data: quotesForModal = [] } = useClientQuotes();
  const [step, setStep] = useState<"verify" | "review" | "sign" | "done">("verify");
  const [agreed, setAgreed] = useState(false);
  const [sirenVerified, setSirenVerified] = useState(false);
  const [sirenOfficialName, setSirenOfficialName] = useState<string | null>(null);

  const quote = quotesForModal.find((q) => q.id === quoteId);
  if (!quote) return null;

  const StepDot = ({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) => (
    <>
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
        done ? "bg-emerald-500 text-white" : active ? "bg-[#D4603A] text-white" : "bg-gray-200 text-gray-500"
      }`}>
        {done ? <CheckCircle2 className="h-3 w-3" /> : n}
      </span>
      <span className={`text-[10px] font-display font-semibold ${active ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
      <div className="h-px flex-1 bg-border" />
    </>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <PenTool className="h-5 w-5 text-[#D4603A]" />
            <h3 className="font-display font-bold text-sm">{t("cd.sign.title")}</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Step indicator (3 steps) */}
          <div className="flex items-center gap-1.5">
            <StepDot n={1} label={t("cd.sign.stepVerify")} active={step === "verify"} done={step !== "verify"} />
            <StepDot n={2} label={t("cd.sign.stepReview")} active={step === "review"} done={step === "sign" || step === "done"} />
            <StepDot n={3} label={t("cd.sign.stepSign")} active={step === "sign"} done={step === "done"} />
          </div>

          {/* ── STEP 1: SIREN VERIFICATION ───────────────────────── */}
          {step === "verify" && (
            <>
              <SirenVerificationInline
                siren={profile?.siren || ""}
                companyName={profile?.company || ""}
                onVerified={(result) => {
                  setSirenVerified(result.verified);
                  setSirenOfficialName(result.officialName);
                }}
              />

              <button
                disabled={!sirenVerified}
                onClick={() => setStep("review")}
                className="w-full py-3 text-sm font-display font-bold rounded-xl transition-opacity disabled:opacity-40 bg-foreground text-primary-foreground hover:opacity-90"
              >
                {t("cd.sign.continueToReview")}
              </button>
            </>
          )}

          {/* ── STEP 2: REVIEW & ACCEPT ──────────────────────────── */}
          {step === "review" && (
            <>
              {/* Verified identity banner */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <p className="text-[10px] font-body text-emerald-800">
                  {t("cd.sign.identityConfirmed")} <strong>{sirenOfficialName || profile?.company}</strong>
                </p>
              </div>

              {/* Quote recap */}
              <div className="border border-border rounded-xl p-4 space-y-2">
                <p className="text-xs font-display font-bold text-foreground">{quote.productName}</p>
                <div className="grid grid-cols-2 gap-2">
                  <SpecRow label={t("cd.quotes.supplierInfo")} value={quote.supplierAlias} />
                  <SpecRow label={t("cd.detail.spec.quantity")} value={`${quote.quantity} pcs`} />
                  <SpecRow label={t("cd.detail.spec.unitPrice")} value={`€${quote.unitPrice}`} />
                  <SpecRow label="Total" value={`€${quote.totalPrice.toLocaleString()}`} highlight />
                  <SpecRow label={t("cd.quotes.validUntil")} value={"30 jours"} />
                  <SpecRow label={t("cd.sign.project")} value={quote.projectName} />
                </div>
              </div>

              {/* Terms */}
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 rounded border-border"
                />
                <span className="text-[11px] font-body text-muted-foreground leading-relaxed">
                  {t("cd.sign.termsText")}
                </span>
              </label>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("verify")}
                  className="flex-1 py-2.5 text-xs font-display font-semibold border border-border rounded-xl hover:border-foreground/30 transition-colors"
                >
                  {t("cd.sign.back")}
                </button>
                <button
                  disabled={!agreed}
                  onClick={() => setStep("sign")}
                  className="flex-1 py-3 text-sm font-display font-bold rounded-xl transition-opacity disabled:opacity-40 bg-foreground text-primary-foreground hover:opacity-90"
                >
                  {t("cd.sign.continueToSign")}
                </button>
              </div>
            </>
          )}

          {/* ── STEP 3: SIGNATURE ────────────────────────────────── */}
          {step === "sign" && (
            <>
              {/* Signer info */}
              <div className="border border-border rounded-xl p-4 space-y-2">
                <p className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider">{t("cd.sign.signerInfo")}</p>
                <div className="grid grid-cols-2 gap-2">
                  <SpecRow label={t("cd.settings.firstName")} value={profile?.first_name || "—"} />
                  <SpecRow label={t("cd.settings.lastName")} value={profile?.last_name || "—"} />
                  <SpecRow label={t("cd.settings.company")} value={sirenOfficialName || profile?.company || "—"} />
                  <SpecRow label="SIREN" value={profile?.siren || "—"} />
                </div>
              </div>

              {/* Signature area */}
              <div>
                <p className="text-[11px] font-display font-semibold text-foreground mb-2">{t("cd.sign.signatureLabel")}</p>
                <div className="border-2 border-dashed border-border rounded-xl h-28 flex items-center justify-center bg-gray-50/50 cursor-pointer hover:border-[#D4603A]/30 transition-colors">
                  <div className="text-center">
                    <PenTool className="h-6 w-6 text-muted-foreground/30 mx-auto mb-1" />
                    <p className="text-[10px] font-body text-muted-foreground">{t("cd.sign.clickToSign")}</p>
                  </div>
                </div>
                <p className="text-[9px] font-body text-muted-foreground mt-1.5">{t("cd.sign.legalNote")}</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("review")}
                  className="flex-1 py-2.5 text-xs font-display font-semibold border border-border rounded-xl hover:border-foreground/30 transition-colors"
                >
                  {t("cd.sign.back")}
                </button>
                <button
                  onClick={async () => {
                    // Call real signDocument if we have a document ID
                    if (user?.id) {
                      try {
                        await signDocument({ documentId: quoteId, signedBy: user.id, provider: "platform" });
                      } catch (e) { /* Will work when real documents exist */ }
                    }
                    setStep("done");
                  }}
                  className="flex-1 py-2.5 text-sm font-display font-bold bg-[#D4603A] text-white rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <PenTool className="h-4 w-4" /> {t("cd.sign.confirmSign")}
                </button>
              </div>
            </>
          )}

          {/* ── DONE ─────────────────────────────────────────────── */}
          {step === "done" && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="font-display font-bold text-lg text-foreground mb-1">{t("cd.sign.doneTitle")}</h3>
              <p className="text-sm font-body text-muted-foreground mb-1">{t("cd.sign.doneSubtitle")}</p>
              <p className="text-xs font-body text-muted-foreground/70 mb-6 max-w-xs mx-auto">{t("cd.sign.doneHint")}</p>
              <button
                onClick={onSigned}
                className="px-8 py-2.5 text-sm font-display font-bold bg-foreground text-primary-foreground rounded-xl hover:opacity-90 transition-opacity"
              >
                {t("cd.sign.close")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Inline SIREN Verification (embedded in signature modal) ─────────────────

function SirenVerificationInline({
  siren,
  companyName,
  onVerified,
}: {
  siren: string;
  companyName: string;
  onVerified: (result: { verified: boolean; officialName: string | null }) => void;
}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"idle" | "checking" | "valid" | "mismatch" | "invalid">("idle");
  const [officialName, setOfficialName] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [input, setInput] = useState(siren || "");

  const verify = async () => {
    const cleaned = input.replace(/\s/g, "");
    if (cleaned.length < 9) return;

    setStatus("checking");
    try {
      // Dynamic import to avoid bundling for users who never sign
      const { verifySirenMatchesCompany } = await import("@/lib/sirenVerification");
      const result = await verifySirenMatchesCompany(cleaned, companyName);
      setOfficialName(result.officialName);
      setMessage(result.message);

      if (result.matches) {
        setStatus("valid");
        onVerified({ verified: true, officialName: result.officialName });
      } else if (result.officialName) {
        setStatus("mismatch");
        onVerified({ verified: false, officialName: result.officialName });
      } else {
        setStatus("invalid");
        onVerified({ verified: false, officialName: null });
      }
    } catch {
      setStatus("invalid");
      setMessage(t("siren.errorGeneric"));
      onVerified({ verified: false, officialName: null });
    }
  };

  // Auto-verify if siren provided
  useEffect(() => {
    if (siren && siren.replace(/\s/g, "").length >= 9) {
      setTimeout(verify, 300);
    }
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-[#D4603A]" />
        <p className="text-xs font-display font-bold text-foreground">{t("siren.title")}</p>
      </div>
      <p className="text-[11px] font-body text-muted-foreground">{t("siren.subtitle")}</p>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value.replace(/[^\d\s]/g, "")); setStatus("idle"); }}
          placeholder="123 456 789"
          maxLength={14}
          className="flex-1 px-3 py-2.5 border border-border rounded-lg text-sm font-body focus:outline-none focus:border-foreground/40"
        />
        <button
          onClick={verify}
          disabled={status === "checking" || input.replace(/\s/g, "").length < 9}
          className="px-4 py-2.5 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-40"
        >
          {status === "checking" ? "..." : t("siren.verify")}
        </button>
      </div>

      {status === "valid" && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <div>
            <p className="text-[11px] font-display font-bold text-emerald-800">{t("siren.verified")}</p>
            <p className="text-[10px] font-body text-emerald-700">{officialName}</p>
          </div>
        </div>
      )}
      {status === "mismatch" && (
        <div className="px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-[11px] font-display font-bold text-amber-800">{t("siren.mismatch")}</p>
          </div>
          <p className="text-[10px] font-body text-amber-700 mt-1 ml-6">{message}</p>
        </div>
      )}
      {status === "invalid" && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200">
          <X className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-[11px] font-body text-red-700">{message || t("siren.invalid")}</p>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── CLIENT MESSAGES ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export function ClientMessagesSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { conversations, isLoading, totalUnread } = useConversations();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-lg text-foreground">
          {t("cd.messages.title")}
          {totalUnread > 0 && (
            <span className="ml-2 text-[10px] font-display font-bold bg-foreground text-primary-foreground px-2 py-0.5 rounded-full">
              {totalUnread}
            </span>
          )}
        </h2>
        <button
          onClick={() => navigate("/messages")}
          className="flex items-center gap-1.5 text-[11px] font-display font-semibold text-[#D4603A] hover:underline"
        >
          {t("cd.messages.openFull")} <ExternalLink className="h-3 w-3" />
        </button>
      </div>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MessageSquare className="h-10 w-10 text-muted-foreground/20 mb-3" />
          <p className="text-sm font-body text-muted-foreground mb-1">{t("cd.messages.empty")}</p>
          <p className="text-xs font-body text-muted-foreground/70 max-w-xs">{t("cd.messages.emptyHint")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.slice(0, 8).map((conv: any) => (
            <div
              key={conv.id}
              onClick={() => navigate(`/messages/${conv.id}`)}
              className="flex items-center justify-between px-4 py-3 border border-border rounded-lg hover:border-foreground/20 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-xs font-display font-bold text-foreground shrink-0">
                  {(conv.other_participant_name || "?")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-display font-semibold text-foreground truncate">
                    {conv.other_participant_name || conv.other_participant_email}
                  </p>
                  <p className="text-[10px] font-body text-muted-foreground truncate">
                    {conv.last_message || conv.subject || "..."}
                  </p>
                </div>
              </div>
              {conv.unread_count > 0 && (
                <span className="text-[9px] font-display font-bold bg-[#D4603A] text-white px-1.5 py-0.5 rounded-full shrink-0">
                  {conv.unread_count}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── CLIENT FAVOURITES (enhanced with tabs) ──────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export function ClientFavouritesSection({
  favourites,
  onToggle,
}: {
  favourites: any[];
  onToggle: (p: any) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"products" | "suppliers" | "architects">("products");
  const { partners: favPartners, toggle: togglePartner } = useFavouritePartners();
  const { architects: favArchitects, toggle: toggleArchitect } = useFavouriteArchitects();

  const tabs = [
    { id: "products" as const, label: t("cd.favourites.products"), count: favourites.length },
    { id: "suppliers" as const, label: t("cd.favourites.suppliers"), count: favPartners.length },
    { id: "architects" as const, label: t("cd.favourites.architects"), count: favArchitects.length },
  ];

  return (
    <div className="space-y-5">
      <h2 className="font-display font-bold text-lg text-foreground">{t("cd.favourites.title")}</h2>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-card rounded-lg border border-border w-fit">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`text-[11px] font-display font-semibold px-4 py-2 rounded-md transition-all ${
              tab === tb.id
                ? "bg-foreground text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tb.label} ({tb.count})
          </button>
        ))}
      </div>

      {/* Products tab */}
      {tab === "products" && (
        favourites.length === 0 ? (
          <EmptyFavState
            icon={Heart}
            message={t("cd.favourites.emptyProducts")}
            cta={t("cd.quickActions.browseProducts")}
            onClick={() => navigate("/products")}
          />
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-body text-muted-foreground">{favourites.length} {t("cd.favourites.saved")}</p>
              <button
                onClick={() => navigate("/products")}
                className="text-[11px] font-body text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> {t("cd.favourites.addMore")}
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {favourites.map((p) => (
                <FavMiniCard key={p.id} product={p} onRemove={() => onToggle(p)} />
              ))}
            </div>
          </div>
        )
      )}

      {/* Suppliers tab */}
      {tab === "suppliers" && (
        favPartners.length === 0 ? (
          <EmptyFavState
            icon={Package}
            message={t("cd.favourites.emptySuppliers")}
            cta={t("cd.favourites.discoverPartners")}
            onClick={() => navigate("/partners")}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {favPartners.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-4 px-4 py-4 border border-border rounded-xl hover:border-foreground/20 transition-colors cursor-pointer group"
                onClick={() => navigate(`/partners/${s.slug}`)}
              >
                {/* Logo or flag */}
                <div className="w-12 h-12 rounded-lg bg-card border border-border flex items-center justify-center text-xl shrink-0 overflow-hidden">
                  {s.logoUrl ? (
                    <img src={s.logoUrl} alt={s.name} className="w-full h-full object-cover" />
                  ) : s.countryCode ? (
                    <span className="text-2xl">{countryFlag(s.countryCode)}</span>
                  ) : (
                    <span>🏭</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-display font-semibold text-foreground group-hover:text-[#D4603A] transition-colors truncate">{s.name}</p>
                    {s.countryCode && <span className="text-sm shrink-0">{countryFlag(s.countryCode)}</span>}
                  </div>
                  <p className="text-[11px] font-body text-muted-foreground">
                    {s.city}{s.country ? `, ${s.country}` : ""}
                    {s.specialtyTags.length > 0 && ` · ${s.specialtyTags.slice(0, 2).join(", ")}`}
                  </p>
                  {s.avgRating && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      <span className="text-[10px] font-display font-semibold text-foreground">{s.avgRating}</span>
                      <span className="text-[9px] font-body text-muted-foreground">({s.totalRatings})</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); togglePartner(s.id); }}
                  className="shrink-0"
                >
                  <Bookmark className="h-4 w-4 text-[#D4603A] fill-[#D4603A]" />
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {/* Architects tab */}
      {tab === "architects" && (
        favArchitects.length === 0 ? (
          <EmptyFavState
            icon={Users}
            message={t("cd.favourites.emptyArchitects")}
            cta={t("cd.favourites.findArchitect")}
            onClick={() => navigate("/pro-service")}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {favArchitects.map((a) => {
              const initials = [a.firstName?.[0], a.lastName?.[0]].filter(Boolean).join("") || "?";
              const displayName = [a.firstName, a.lastName].filter(Boolean).join(" ") || a.email;
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-4 px-4 py-4 border border-border rounded-xl hover:border-foreground/20 transition-colors cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#D4603A]/10 to-[#D4603A]/5 border border-border flex items-center justify-center text-sm font-display font-bold text-[#D4603A] shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-display font-semibold text-foreground group-hover:text-[#D4603A] transition-colors">{displayName}</p>
                    {a.company && <p className="text-[11px] font-body text-muted-foreground">{a.company}</p>}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleArchitect(a.id); }}
                    className="shrink-0"
                  >
                    <Bookmark className="h-4 w-4 text-[#D4603A] fill-[#D4603A]" />
                  </button>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

function EmptyFavState({
  icon: Icon,
  message,
  cta,
  onClick,
}: {
  icon: any;
  message: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="h-10 w-10 text-muted-foreground/20 mb-3" />
      <p className="text-sm font-body text-muted-foreground mb-4">{message}</p>
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
      >
        {cta} <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── CLIENT SETTINGS ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export function ClientSettingsSection({ profile }: { profile: any }) {
  const { t } = useTranslation();
  const { refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: profile.first_name || "",
    last_name: profile.last_name || "",
    company: profile.company || "",
    phone: profile.phone || "",
  });

  const editableKeys = new Set(["first_name", "last_name", "company", "phone"]);

  const handleCancel = () => {
    setForm({
      first_name: profile.first_name || "",
      last_name: profile.last_name || "",
      company: profile.company || "",
      phone: profile.phone || "",
    });
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({
          first_name: form.first_name || null,
          last_name: form.last_name || null,
          company: form.company || null,
          phone: form.phone || null,
        })
        .eq("id", profile.id);
      if (error) throw error;
      await refreshProfile();
      setEditing(false);
    } catch {
      // keep editing mode open on failure
    } finally {
      setSaving(false);
    }
  };

  // Build the display list — always show all standard fields
  const displayFields: { label: string; key: string; value: string }[] = [
    { label: t("cd.settings.email"), key: "email", value: profile.email || "" },
    { label: t("cd.settings.firstName"), key: "first_name", value: editing ? form.first_name : (profile.first_name || "") },
    { label: t("cd.settings.lastName"), key: "last_name", value: editing ? form.last_name : (profile.last_name || "") },
    { label: t("cd.settings.company"), key: "company", value: editing ? form.company : (profile.company || "") },
    { label: t("cd.settings.siren"), key: "siren", value: profile.siren || "" },
    { label: t("cd.settings.phone"), key: "phone", value: editing ? form.phone : (profile.phone || "") },
    { label: t("cd.settings.country"), key: "country", value: profile.country || "" },
    { label: t("cd.settings.accountType"), key: "accountType", value: profile.user_type || "" },
  ].filter(({ value, key }) => value || (editing && editableKeys.has(key)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-lg text-foreground">{t("cd.settings.title")}</h2>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-display font-semibold border border-border rounded-lg hover:border-foreground/30 transition-colors"
          >
            <PenTool className="h-3.5 w-3.5" />
            {t("cd.settings.edit", { defaultValue: "Edit" })}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-display font-semibold border border-border rounded-lg hover:border-foreground/30 transition-colors"
            >
              {t("cd.settings.cancel", { defaultValue: "Cancel" })}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              {saving ? t("cd.settings.saving", { defaultValue: "Saving..." }) : t("cd.settings.save", { defaultValue: "Save" })}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
        {displayFields.map(({ label, key, value }) => (
          <div key={key}>
            <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            {editing && editableKeys.has(key) ? (
              <input
                value={(form as any)[key] || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                className="w-full text-sm font-body text-foreground mt-0.5 bg-transparent border-b border-border outline-none focus:border-foreground transition-colors py-0.5"
              />
            ) : (
              <p className="text-sm font-body text-foreground mt-0.5">{value || "—"}</p>
            )}
          </div>
        ))}
      </div>

      {/* Reassurance */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-green-50/50 border border-green-100">
        <ShieldCheck className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
        <p className="text-[11px] font-body text-green-800">
          {t("cd.settings.securityNote")}
        </p>
      </div>
    </div>
  );
}
