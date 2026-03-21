import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useConversations, useMessages, createConversation } from "@/hooks/useConversations";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSupplierCalls } from "@/hooks/useSupplierCalls";
import type { SupplierCall as HookSupplierCall, SupplierResponse as HookSupplierResponse } from "@/hooks/useSupplierCalls";
import { useArchitectProjects, useProjectZones, useProjectAnnotations, useMaterialBoards } from "@/hooks/useArchitectProjects";
import type { ZoneWithProducts } from "@/hooks/useArchitectProjects";

const ProjectAnnotations = lazy(() => import("./ProjectAnnotations"));
const MaterialBoardView = lazy(() => import("./MaterialBoardView"));
import {
  TrendingUp, Star, ChevronRight, ChevronLeft, Award, Compass, Crown,
  FolderOpen, MessageSquare, Plus, Search, Calendar,
  Clock, CheckCircle2, Send, Users, Target,
  Lock, Megaphone, StickyNote, Trash2, Paperclip,
  ArrowLeft, FileText, Image, MapPin, Eye, X,
} from "lucide-react";

const ProductPreviewDrawer = lazy(() => import("./ProductPreviewDrawer"));

// ── Types ──────────────────────────────────────────────────────────────────────

export type ArchitectTier = "studio" | "atelier" | "maison";

export type ArchitectSectionSetter = (section: string) => void;

// ── Tier Config ────────────────────────────────────────────────────────────────

export const TIER_CONFIG = {
  studio: {
    label: "Studio",
    color: "#6B7B5E",
    bg: "#F0F4EE",
    border: "#C5D1BC",
    icon: Compass,
    quotesPerMonth: 10,
    threshold: 0,
    nextThreshold: 1000,
  },
  atelier: {
    label: "Atelier",
    color: "#2563EB",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    icon: Star,
    quotesPerMonth: 30,
    threshold: 1000,
    nextThreshold: 5000,
  },
  maison: {
    label: "Maison",
    color: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
    icon: Crown,
    quotesPerMonth: null,
    threshold: 5000,
    nextThreshold: null,
  },
};

const EARNING_RULES = [
  { action: "project_created", points: 50, icon: FolderOpen },
  { action: "quote_sent", points: 25, icon: Send },
  { action: "quote_accepted", points: 50, icon: CheckCircle2 },
  { action: "order_confirmed", points: 100, icon: Target },
  { action: "supplier_call", points: 75, icon: Megaphone },
  { action: "referral", points: 200, icon: Users },
  { action: "review_left", points: 25, icon: Star },
  { action: "profile_completed", points: 100, icon: CheckCircle2 },
];

// ── Mock data ──────────────────────────────────────────────────────────────────

const MOCK_POINTS = 2350;

interface ProjectNote {
  id: string;
  text: string;
  author: string;
  date: string;
  pinned?: boolean;
}

interface ZoneProduct {
  name: string;
  qty: number;
  supplier: string;
  status: string;
  image?: string;
  productId?: string;
}

interface ProjectZone {
  id: string;
  name: string;
  area: string;
  productCount: number;
  products: ZoneProduct[];
}

interface ArchitectProject {
  id: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientCompany?: string;
  projectName: string;
  venueType: string;
  zoneCount: number;
  productCount: number;
  estimatedValue: number;
  status: "draft" | "quoting" | "in-progress" | "delivered" | "archived";
  updatedAt: string;
  quotesCount: number;
  address?: string;
  surfaceArea?: string;
  style?: string;
  startDate?: string;
  deadline?: string;
  description?: string;
  constraints?: string;
  notes: ProjectNote[];
  zones: ProjectZone[];
}

interface QuoteProduct {
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
}

interface ArchitectQuote {
  id: string;
  projectName: string;
  clientName: string;
  supplierName: string;
  productSummary: string;
  amount: number;
  dateSent: string;
  dateReply?: string;
  status: "pending" | "replied" | "accepted" | "expired" | "declined";
  validUntil?: string;
  supplierMessage?: string;
  products: QuoteProduct[];
  attachments?: string[];
}

const MOCK_QUOTES: ArchitectQuote[] = [
  {
    id: "1", projectName: "Sofitel Paris", clientName: "Groupe Accor", supplierName: "Fermob Pro",
    productSummary: "24× chaises Luxembourg, 8× tables", amount: 18500, dateSent: "18 mars", dateReply: "19 mars",
    status: "replied", validUntil: "18 avril 2026",
    supplierMessage: "Bonjour, veuillez trouver ci-joint notre meilleure offre pour les chaises Luxembourg en coloris vert olive. Délai de livraison : 6 semaines après confirmation. Un échantillon de tissu peut être envoyé sur demande.",
    products: [
      { name: "Chaise Luxembourg", qty: 24, unitPrice: 385, total: 9240 },
      { name: "Table Bellevie 140×80", qty: 4, unitPrice: 890, total: 3560 },
      { name: "Table Bellevie 196×90", qty: 4, unitPrice: 1425, total: 5700 },
    ],
    attachments: ["Devis_Fermob_Sofitel_2026.pdf"],
  },
  {
    id: "2", projectName: "Sofitel Paris", clientName: "Groupe Accor", supplierName: "Vlaemynck",
    productSummary: "12× bains de soleil Riviera", amount: 14200, dateSent: "17 mars",
    status: "pending",
    products: [
      { name: "Bain de soleil Riviera", qty: 12, unitPrice: 980, total: 11760 },
      { name: "Table d'appoint Riviera", qty: 6, unitPrice: 290, total: 1740 },
    ],
  },
  {
    id: "3", projectName: "Patio Le Comptoir", clientName: "Le Comptoir du Marais", supplierName: "Ethimo",
    productSummary: "6× canapés modulaires Costes", amount: 9800, dateSent: "15 mars", dateReply: "16 mars",
    status: "accepted", validUntil: "15 avril 2026",
    supplierMessage: "Offre spéciale pour ce projet. Livraison incluse sur Paris intra-muros.",
    products: [
      { name: "Canapé modulaire Costes 2P", qty: 4, unitPrice: 1650, total: 6600 },
      { name: "Canapé modulaire Costes 3P", qty: 2, unitPrice: 1600, total: 3200 },
    ],
  },
  {
    id: "4", projectName: "Beach Club", clientName: "Beach House Marseille", supplierName: "Vondom",
    productSummary: "20× fauteuils Faz, 10× tables", amount: 22000, dateSent: "12 mars",
    status: "pending",
    products: [
      { name: "Fauteuil Faz", qty: 20, unitPrice: 680, total: 13600 },
      { name: "Table Faz Ø70", qty: 10, unitPrice: 420, total: 4200 },
      { name: "Table basse Faz", qty: 6, unitPrice: 350, total: 2100 },
    ],
  },
  {
    id: "5", projectName: "Bord de piscine", clientName: "Hôtel Biarritz", supplierName: "Dedon",
    productSummary: "8× daybeds Swingrest", amount: 31500, dateSent: "10 mars",
    status: "expired", validUntil: "10 mars 2026",
    products: [
      { name: "Daybed Swingrest", qty: 8, unitPrice: 3450, total: 27600 },
      { name: "Coussin Swingrest outdoor", qty: 8, unitPrice: 290, total: 2320 },
    ],
  },
];

interface ResponseProduct {
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
  image?: string;
}

interface SupplierResponse {
  id: string;
  supplierName: string;
  supplierCompany: string;
  message: string;
  estimatedAmount: number;
  deliveryWeeks: number;
  warranty?: string;
  date: string;
  selected?: boolean;
  products: ResponseProduct[];
  attachments?: string[];
}

interface ProjectNeed {
  category: string;
  description: string;
  qty?: number;
  priority: "essential" | "important" | "optional";
}

interface SupplierCall {
  id: string;
  projectName: string;
  clientName: string;
  venueType: string;
  brief: string;
  budget: string;
  deadline: string;
  needs: ProjectNeed[];
  style?: string;
  materials?: string[];
  ambiance?: string;
  surfaceArea?: string;
  seatingCapacity?: number;
  urgency?: "normal" | "urgent" | "flexible";
  constraints?: string;
  status: "open" | "closed" | "evaluating";
  responsesCount: number;
  views: number;
  clicks: number;
  createdAt: string;
  responses: SupplierResponse[];
}

// MOCK_SUPPLIER_CALLS removed — now using useSupplierCalls() hook for real DB data.

interface PointsEntry {
  id: string;
  action: string;
  description: string;
  points: number;
  date: string;
}

const MOCK_POINTS_HISTORY: PointsEntry[] = [
  { id: "1", action: "order_confirmed", description: "Commande confirmée — La Villa Cannes", points: 124, date: "18 mars" },
  { id: "2", action: "supplier_call", description: "Appel fournisseur — Sofitel Paris", points: 75, date: "15 mars" },
  { id: "3", action: "quote_accepted", description: "Devis accepté — Ethimo / Le Comptoir", points: 50, date: "14 mars" },
  { id: "4", action: "quote_sent", description: "Multi-devis envoyé — Beach Club", points: 25, date: "12 mars" },
  { id: "5", action: "project_created", description: "Projet créé — Beach Club Lounge", points: 50, date: "10 mars" },
  { id: "6", action: "quote_sent", description: "Multi-devis envoyé — Hôtel Biarritz", points: 25, date: "8 mars" },
  { id: "7", action: "referral", description: "Parrainage — Beach House Marseille", points: 200, date: "5 mars" },
  { id: "8", action: "review_left", description: "Avis laissé — Fermob Pro", points: 25, date: "3 mars" },
];

// ── Tier Badge ─────────────────────────────────────────────────────────────────

export function TierBadge({ tier }: { tier: ArchitectTier }) {
  const config = TIER_CONFIG[tier];
  const Icon = config.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-display font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border"
      style={{ background: config.bg, color: config.color, borderColor: config.border }}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────────

function StatCard({
  value, label, trend, trendColor = "var(--muted-foreground)", icon: Icon,
}: {
  value: string; label: string; trend?: string; trendColor?: string; icon?: any;
}) {
  return (
    <div className="border border-border rounded-sm p-4">
      {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground mb-1" />}
      <p className="font-display font-bold text-lg text-foreground">{value}</p>
      <p className="text-[10px] font-body text-muted-foreground mt-0.5">{label}</p>
      {trend && (
        <p className="text-[9px] font-body mt-1 flex items-center gap-1" style={{ color: trendColor }}>
          <TrendingUp className="h-3 w-3" />{trend}
        </p>
      )}
    </div>
  );
}

// ── Status styles ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { label: string; style: string }> = {
  draft:         { label: "Brouillon",  style: "bg-muted text-muted-foreground" },
  quoting:       { label: "Devis",      style: "bg-amber-50 text-amber-700" },
  "in-progress": { label: "En cours",   style: "bg-blue-50 text-blue-700" },
  in_progress:   { label: "En cours",   style: "bg-blue-50 text-blue-700" },
  delivered:     { label: "Livré",      style: "bg-green-50 text-green-700" },
  archived:      { label: "Archivé",    style: "bg-muted text-muted-foreground" },
};

const QUOTE_STATUS_STYLES: Record<string, { label: string; style: string }> = {
  pending:  { label: "En attente", style: "bg-amber-50 text-amber-700" },
  replied:  { label: "Répondu",    style: "bg-blue-50 text-blue-700" },
  accepted: { label: "Accepté",    style: "bg-green-50 text-green-700" },
  expired:  { label: "Expiré",     style: "bg-muted text-muted-foreground" },
  declined: { label: "Décliné",    style: "bg-red-50 text-red-700" },
};

const CALL_STATUS_STYLES: Record<string, { label: string; style: string }> = {
  open:       { label: "Ouvert",      style: "bg-green-50 text-green-700" },
  evaluating: { label: "Évaluation",  style: "bg-amber-50 text-amber-700" },
  closed:     { label: "Clôturé",     style: "bg-muted text-muted-foreground" },
};

const PRODUCT_STATUS_STYLES: Record<string, string> = {
  "commandé":      "bg-green-50 text-green-700",
  "devis accepté": "bg-blue-50 text-blue-700",
  "devis envoyé":  "bg-amber-50 text-amber-700",
  "en attente":    "bg-muted text-muted-foreground",
};

const VENUE_ICONS: Record<string, string> = {
  hotel: "🏨", restaurant: "🍽", bar: "🍸", "beach-club": "🏖", rooftop: "🌇", cafe: "☕",
};

/** Map a DB architect_projects row (+ optional zones) into the ArchitectProject UI shape */
function dbToArchitectProject(row: any, zones?: ZoneWithProducts[]): ArchitectProject {
  const zonesMapped: ProjectZone[] = (zones || []).map((z) => ({
    id: z.id,
    name: z.zone_name || "Zone",
    area: z.zone_area || "",
    productCount: z.products?.length || 0,
    products: (z.products || []).map((p: any) => ({
      name: p.product?.name || "Unknown product",
      qty: p.quantity || 1,
      supplier: p.supplier_name || "",
      status: p.status || "en attente",
      image: p.product?.image || undefined,
      productId: p.product_id || undefined,
    })),
  }));
  const totalProducts = zonesMapped.reduce((sum, z) => sum + z.productCount, 0);

  const updatedAt = row.updated_at
    ? new Date(row.updated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
    : "";

  return {
    id: row.id,
    clientName: row.client_name || "",
    clientEmail: row.client_email || undefined,
    clientPhone: row.client_phone || undefined,
    clientCompany: row.client_company || undefined,
    projectName: row.project_name || "",
    venueType: row.venue_type || "",
    zoneCount: zonesMapped.length,
    productCount: totalProducts,
    estimatedValue: Number(row.estimated_value || 0),
    status: (row.status || "draft") as ArchitectProject["status"],
    updatedAt,
    quotesCount: 0,
    address: row.address || undefined,
    surfaceArea: row.surface_area || undefined,
    style: row.style || undefined,
    startDate: row.start_date || undefined,
    deadline: row.deadline || undefined,
    description: row.description || undefined,
    constraints: row.constraints || undefined,
    notes: [],
    zones: zonesMapped,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── ARCHITECT OVERVIEW ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function ArchitectOverview({
  tier, onNavigate, favourites = [], onToggleFavourite,
}: {
  tier: ArchitectTier; onNavigate: ArchitectSectionSetter; favourites?: any[]; onToggleFavourite?: (p: any) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projects: dbProjects, stats, isLoading: projectsLoading } = useArchitectProjects();
  const { calls, isLoading: callsLoading } = useSupplierCalls();
  const config = TIER_CONFIG[tier];
  const nextTier = tier === "studio" ? "atelier" : tier === "atelier" ? "maison" : null;
  const progress = nextTier
    ? ((MOCK_POINTS - config.threshold) / (config.nextThreshold! - config.threshold)) * 100
    : 100;
  const recentProjects = dbProjects.slice(0, 3).map((row) => dbToArchitectProject(row));
  const activeCalls = calls.filter((c) => c.status !== "closed").slice(0, 2);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard value="6" label={t('ad.stats.activeProjects')} trend="+2 ce mois" trendColor="#3A4D35" icon={FolderOpen} />
        <StatCard value="14" label={t('ad.stats.quotesSent')} trend="+4 ce mois" trendColor="#2563EB" icon={Send} />
        <StatCard value="€45 200" label={t('ad.stats.totalSourced')} trend="+18%" trendColor="#059669" icon={TrendingUp} />
        <StatCard value={`${MOCK_POINTS}`} label={t('ad.stats.rewardPoints')} icon={Award} />
      </div>

      {/* Rewards progress */}
      <div
        className="rounded-sm border p-4 cursor-pointer hover:border-foreground/20 transition-colors"
        style={{ borderColor: config.border, background: config.bg }}
        onClick={() => onNavigate("rewards")}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TierBadge tier={tier} />
            <span className="text-xs font-body text-muted-foreground">{MOCK_POINTS} pts</span>
          </div>
          {nextTier && (
            <span className="text-[10px] font-body text-muted-foreground">
              {config.nextThreshold! - MOCK_POINTS} pts → {TIER_CONFIG[nextTier].label}
            </span>
          )}
        </div>
        <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(progress, 100)}%`, background: config.color }} />
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-[10px] font-body text-muted-foreground">{t('ad.overview.tierBenefits')}</p>
          <span className="text-[10px] font-body flex items-center gap-1 hover:underline" style={{ color: config.color }}>
            {t('ad.overview.seeRewards')} <ChevronRight className="h-3 w-3" />
          </span>
        </div>
      </div>

      {/* Recent projects */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="font-display font-bold text-sm text-foreground">{t('ad.overview.recentProjects')}</p>
          <button onClick={() => onNavigate("projects")} className="text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            {t('ad.overview.viewAll')} <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div className="space-y-2">
          {recentProjects.map((p) => {
            const st = STATUS_STYLES[p.status] || STATUS_STYLES.draft;
            return (
              <div key={p.id} onClick={() => onNavigate(`project-detail:${p.id}`)} className="flex items-center justify-between px-4 py-3 border border-border rounded-sm hover:border-foreground/20 transition-colors cursor-pointer">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-base">{VENUE_ICONS[p.venueType] || "📍"}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-display font-semibold text-foreground truncate">{p.projectName}</p>
                    <p className="text-[10px] font-body text-muted-foreground">{p.clientName} · {p.updatedAt}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-display font-semibold text-foreground">€{p.estimatedValue.toLocaleString()}</span>
                  <span className={`text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${st.style}`}>{st.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active supplier calls */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="font-display font-bold text-sm text-foreground">{t('ad.overview.activeCalls')}</p>
          <button onClick={() => onNavigate("calls")} className="text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            {t('ad.overview.viewAll')} <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div className="space-y-2">
          {activeCalls.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3 border border-border rounded-sm hover:border-foreground/20 transition-colors cursor-pointer">
              <div className="flex items-center gap-3 min-w-0">
                <Megaphone className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-display font-semibold text-foreground truncate">{c.projectTitle}</p>
                  <p className="text-[10px] font-body text-muted-foreground">{c.budget} · {c.responsesCount} réponses · {c.createdAt}</p>
                </div>
              </div>
              <span className="text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-50 text-green-700">Ouvert</span>
            </div>
          ))}
        </div>
      </div>

      {favourites.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="font-display font-bold text-sm text-foreground">{t('ad.overview.favourites')}</p>
            <span className="text-[10px] font-body text-muted-foreground">{favourites.length} {t('ad.overview.saved')}</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {favourites.slice(0, 6).map((p: any) => (
              <div key={p.id} onClick={() => navigate(`/products/${p.id}`)} className="group cursor-pointer">
                <div className="relative aspect-square rounded-sm overflow-hidden border border-border mb-1.5">
                  <img src={p.image_url || "/placeholder.svg"} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <p className="text-[11px] font-display font-semibold text-foreground truncate">{p.name}</p>
                <p className="text-[10px] font-body text-muted-foreground">{p.price_min ? `dès €${p.price_min}` : "Sur demande"}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── PROJECT CREATE FORM ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const VENUE_TYPES = [
  { value: "hotel", icon: "🏨", label: "Hôtel" },
  { value: "restaurant", icon: "🍽", label: "Restaurant" },
  { value: "bar", icon: "🍸", label: "Bar" },
  { value: "beach-club", icon: "🏖", label: "Beach Club" },
  { value: "rooftop", icon: "🌇", label: "Rooftop" },
  { value: "cafe", icon: "☕", label: "Café" },
];

const inputCls = "w-full text-xs font-body bg-transparent border border-border rounded-sm px-3 py-2 focus:outline-none focus:border-foreground transition-colors";
const labelCls = "text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1";

export function ArchitectCreateProject({ onBack, onCreated }: { onBack: () => void; onCreated?: (project: ArchitectProject) => void }) {
  const { t } = useTranslation();
  const { createProject } = useArchitectProjects();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    projectName: "", venueType: "restaurant",
    clientName: "", clientEmail: "", clientPhone: "", clientCompany: "",
    address: "", surfaceArea: "", style: "",
    startDate: "", deadline: "",
    description: "", constraints: "",
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.projectName || !form.clientName || submitting) return;
    setSubmitting(true);
    try {
      const created = await createProject({
        project_name: form.projectName,
        client_name: form.clientName,
        client_email: form.clientEmail || null,
        client_phone: form.clientPhone || null,
        client_company: form.clientCompany || null,
        venue_type: form.venueType,
        address: form.address || null,
        surface_area: form.surfaceArea || null,
        style: form.style || null,
        start_date: form.startDate || null,
        deadline: form.deadline || null,
        description: form.description || null,
        constraints: form.constraints || null,
        status: "draft",
      });
      toast.success(t("ad.create.success") || "Project created");
      onCreated?.(dbToArchitectProject(created));
    } catch (err: any) {
      toast.error(err?.message || "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <button onClick={onBack} className="flex items-center gap-1.5 text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="h-3 w-3" /> {t('ad.create.back')}
        </button>
        <h2 className="font-display font-bold text-lg text-foreground">{t('ad.create.title')}</h2>
        <p className="text-[10px] font-body text-muted-foreground mt-0.5">{t('ad.create.subtitle')}</p>
      </div>

      {/* Client info */}
      <div className="border border-border rounded-sm p-4 space-y-3">
        <p className="font-display font-bold text-xs text-foreground uppercase tracking-wider">{t('ad.create.clientInfo')}</p>
        <div className="grid grid-cols-2 gap-3">
          <div><span className={labelCls}>{t('ad.create.clientName')} *</span><input value={form.clientName} onChange={set("clientName")} className={inputCls} /></div>
          <div><span className={labelCls}>{t('ad.create.clientCompany')}</span><input value={form.clientCompany} onChange={set("clientCompany")} className={inputCls} /></div>
          <div><span className={labelCls}>{t('ad.create.clientEmail')}</span><input value={form.clientEmail} onChange={set("clientEmail")} type="email" className={inputCls} /></div>
          <div><span className={labelCls}>{t('ad.create.clientPhone')}</span><input value={form.clientPhone} onChange={set("clientPhone")} className={inputCls} /></div>
        </div>
      </div>

      {/* Project info */}
      <div className="border border-border rounded-sm p-4 space-y-3">
        <p className="font-display font-bold text-xs text-foreground uppercase tracking-wider">{t('ad.create.projectInfo')}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><span className={labelCls}>{t('ad.create.projectName')} *</span><input value={form.projectName} onChange={set("projectName")} placeholder="ex: Terrasse Rooftop — Sofitel Paris" className={inputCls} /></div>
          <div>
            <span className={labelCls}>{t('ad.create.venueType')}</span>
            <div className="grid grid-cols-3 gap-1.5">
              {VENUE_TYPES.map(v => (
                <button key={v.value} onClick={() => setForm(p => ({ ...p, venueType: v.value }))}
                  className={`p-2 rounded-sm border text-center transition-all ${form.venueType === v.value ? "border-foreground bg-card" : "border-border hover:border-foreground/20"}`}>
                  <span className="text-sm block">{v.icon}</span>
                  <span className="text-[9px] font-display font-semibold text-foreground">{v.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div><span className={labelCls}>{t('ad.create.address')}</span><input value={form.address} onChange={set("address")} className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><span className={labelCls}>{t('ad.create.surface')}</span><input value={form.surfaceArea} onChange={set("surfaceArea")} placeholder="ex: 200m²" className={inputCls} /></div>
              <div><span className={labelCls}>{t('ad.create.style')}</span><input value={form.style} onChange={set("style")} placeholder="ex: Contemporain" className={inputCls} /></div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><span className={labelCls}>{t('ad.create.startDate')}</span><input value={form.startDate} onChange={set("startDate")} type="date" className={inputCls} /></div>
          <div><span className={labelCls}>{t('ad.create.deadline')}</span><input value={form.deadline} onChange={set("deadline")} type="date" className={inputCls} /></div>
        </div>
        <div><span className={labelCls}>{t('ad.create.description')}</span><textarea value={form.description} onChange={set("description")} rows={3} placeholder={t('ad.create.descPlaceholder')} className={inputCls + " resize-none"} /></div>
        <div><span className={labelCls}>{t('ad.create.constraints')}</span><textarea value={form.constraints} onChange={set("constraints")} rows={2} placeholder={t('ad.create.constraintsPlaceholder')} className={inputCls + " resize-none"} /></div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button onClick={handleSubmit} disabled={!form.projectName || !form.clientName}
          className="flex items-center gap-2 px-5 py-2.5 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity disabled:opacity-30">
          <Plus className="h-3.5 w-3.5" /> {t('ad.create.submit')}
        </button>
        <button onClick={onBack} className="text-xs font-body text-muted-foreground hover:text-foreground transition-colors">{t('ad.create.cancel')}</button>
        <p className="text-[9px] font-body text-muted-foreground flex items-center gap-1 ml-auto">
          <Award className="h-3 w-3" /> +50 pts
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── PROJECT DETAIL VIEW ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function ArchitectProjectDetail({
  projectId, onBack, extraProjects = [],
}: {
  projectId: string; onBack: () => void; extraProjects?: ArchitectProject[];
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projects: dbProjects } = useArchitectProjects();
  const { zones: dbZones, isLoading: zonesLoading } = useProjectZones(projectId);
  const { boards, isLoading: boardsLoading } = useMaterialBoards(projectId);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"zones" | "notes" | "boards">("zones");

  // Find the DB row and convert
  const dbRow = dbProjects.find((p) => p.id === projectId);
  const fromExtra = extraProjects.find((p) => p.id === projectId);
  const project = dbRow ? dbToArchitectProject(dbRow, dbZones) : fromExtra || null;

  const [newNote, setNewNote] = useState("");
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [expandedQuote, setExpandedQuote] = useState<string | null>(null);
  const [previewProductId, setPreviewProductId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState(project?.status || "draft");
  const [editDesc, setEditDesc] = useState(project?.description || "");
  const [editConstraints, setEditConstraints] = useState(project?.constraints || "");
  const [editAddress, setEditAddress] = useState(project?.address || "");
  const [editDeadline, setEditDeadline] = useState(project?.deadline || "");

  if (!project) return null;

  if (activeBoardId) {
    return (
      <div className="space-y-4">
        <button onClick={() => setActiveBoardId(null)} className="flex items-center gap-1.5 text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3 w-3" /> Back to project
        </button>
        <Suspense fallback={<div className="py-8 text-center text-sm text-muted-foreground">Loading board...</div>}>
          <MaterialBoardView boardId={activeBoardId} />
        </Suspense>
      </div>
    );
  }

  const st = STATUS_STYLES[editStatus] || STATUS_STYLES.draft;
  const relatedQuotes = MOCK_QUOTES.filter(q => q.projectName.includes(project.projectName.split("—")[0].trim()) || q.clientName === project.clientName);

  const addNote = () => {
    if (!newNote.trim()) return;
    setNotes(prev => [{ id: `n-${Date.now()}`, text: newNote.trim(), author: "Vous", date: "Maintenant" }, ...prev]);
    setNewNote("");
  };
  const deleteNote = (id: string) => setNotes(prev => prev.filter(n => n.id !== id));
  const togglePin = (id: string) => setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));
  const sortedNotes = [...notes].sort((a, b) => (a.pinned && !b.pinned ? -1 : !a.pinned && b.pinned ? 1 : 0));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button onClick={onBack} className="flex items-center gap-1.5 text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="h-3 w-3" /> {t('ad.detail.backToProjects')}
        </button>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{VENUE_ICONS[project.venueType] || "📍"}</span>
            <div>
              <h2 className="font-display font-bold text-lg text-foreground">{project.projectName}</h2>
              <p className="text-xs font-body text-muted-foreground">{project.clientName}{project.clientCompany ? ` · ${project.clientCompany}` : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <select value={editStatus} onChange={e => setEditStatus(e.target.value)}
                className="text-[10px] font-display font-semibold px-2.5 py-1 rounded-full border border-border bg-transparent focus:outline-none">
                {Object.entries(STATUS_STYLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            ) : (
              <span className={`text-[9px] font-display font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${st.style}`}>{st.label}</span>
            )}
            <button onClick={() => setEditing(!editing)}
              className={`text-[10px] font-display font-semibold px-3 py-1 rounded-full border transition-colors ${editing ? "border-foreground bg-foreground text-primary-foreground" : "border-border hover:border-foreground text-muted-foreground hover:text-foreground"}`}>
              {editing ? t('ad.detail.save') : t('ad.detail.edit')}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard value={`€${project.estimatedValue.toLocaleString()}`} label={t('ad.detail.estimated')} icon={TrendingUp} />
        <StatCard value={`${project.productCount}`} label={t('ad.detail.products')} icon={FolderOpen} />
        <StatCard value={`${project.zoneCount}`} label={t('ad.detail.zones')} icon={MapPin} />
        <StatCard value={`${project.quotesCount}`} label={t('ad.detail.quotes')} icon={Send} />
      </div>

      {/* Client card */}
      {(project.clientEmail || project.clientPhone) && (
        <div className="border border-border rounded-sm p-4">
          <p className="font-display font-bold text-xs text-foreground uppercase tracking-wider mb-2">{t('ad.detail.client')}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px] font-body">
            <div><span className="text-muted-foreground block">{t('ad.detail.clientName')}</span><span className="text-foreground font-semibold">{project.clientName}</span></div>
            {project.clientCompany && <div><span className="text-muted-foreground block">{t('ad.detail.company')}</span><span className="text-foreground">{project.clientCompany}</span></div>}
            {project.clientEmail && <div><span className="text-muted-foreground block">{t('ad.detail.email')}</span><span className="text-foreground">{project.clientEmail}</span></div>}
            {project.clientPhone && <div><span className="text-muted-foreground block">{t('ad.detail.phone')}</span><span className="text-foreground">{project.clientPhone}</span></div>}
          </div>
        </div>
      )}

      {/* Project info — editable */}
      <div className="border border-border rounded-sm p-4 space-y-3">
        <p className="font-display font-bold text-xs text-foreground uppercase tracking-wider">{t('ad.detail.projectInfo')}</p>
        {editing ? (
          <div className="space-y-3">
            <div><span className={labelCls}>{t('ad.detail.descriptionLabel')}</span><textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3} className={inputCls + " resize-none"} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className={labelCls}>{t('ad.detail.addressLabel')}</span><input value={editAddress} onChange={e => setEditAddress(e.target.value)} className={inputCls} /></div>
              <div><span className={labelCls}>{t('ad.detail.deadlineLabel')}</span><input value={editDeadline} onChange={e => setEditDeadline(e.target.value)} className={inputCls} /></div>
            </div>
            <div><span className={labelCls}>{t('ad.detail.constraintsLabel')}</span><textarea value={editConstraints} onChange={e => setEditConstraints(e.target.value)} rows={2} className={inputCls + " resize-none"} /></div>
          </div>
        ) : (
          <>
            {editDesc && <p className="text-[11px] font-body text-foreground/80 leading-relaxed">{editDesc}</p>}
            {editConstraints && (
              <div className="flex items-start gap-2 text-[10px] font-body text-amber-700 bg-amber-50/50 rounded-sm px-3 py-2">
                <FileText className="h-3 w-3 mt-0.5 shrink-0" />
                <span>{editConstraints}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-4 text-[10px] font-body text-muted-foreground">
              {editAddress && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {editAddress}</span>}
              {project.surfaceArea && <span className="flex items-center gap-1"><Target className="h-3 w-3" /> {project.surfaceArea}</span>}
              {project.style && <span className="flex items-center gap-1"><Star className="h-3 w-3" /> {project.style}</span>}
              {project.startDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Début : {project.startDate}</span>}
              {editDeadline && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Deadline : {editDeadline}</span>}
            </div>
          </>
        )}
      </div>

      {/* Tabs: Zones | Notes | Material Boards */}
      <div className="flex gap-1 border-b border-border">
        {(["zones", "notes", "boards"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-[10px] font-display font-semibold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === tab
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "zones" ? t('ad.detail.zonesProducts') : tab === "notes" ? t('ad.detail.notes') : "Material Boards"}
            {tab === "boards" && boards.length > 0 && ` (${boards.length})`}
          </button>
        ))}
      </div>

      {/* Zones & Products tab */}
      {activeTab === "zones" && project.zones.length > 0 && (
        <div>
          <div className="space-y-3">
            {project.zones.map((zone) => (
              <div key={zone.id} className="border border-border rounded-sm overflow-hidden">
                <button onClick={() => setActiveZone(activeZone === zone.id ? null : zone.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-card transition-colors">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-display font-semibold text-foreground">{zone.name}</span>
                    <span className="text-[10px] font-body text-muted-foreground">{zone.area} · {zone.productCount} produits</span>
                  </div>
                  <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${activeZone === zone.id ? "rotate-90" : ""}`} />
                </button>
                {activeZone === zone.id && (
                  <div className="border-t border-border">
                    <table className="w-full">
                      <thead><tr className="bg-muted/50">
                        <th className="text-left px-4 py-2 text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('ad.detail.product')}</th>
                        <th className="text-center px-2 py-2 text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('ad.detail.qty')}</th>
                        <th className="text-left px-2 py-2 text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('ad.detail.supplier')}</th>
                        <th className="text-right px-4 py-2 text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('ad.detail.status')}</th>
                      </tr></thead>
                      <tbody>
                        {zone.products.map((prod, i) => (
                          <tr
                            key={i}
                            className={`${i % 2 === 0 ? "" : "bg-muted/20"} ${prod.productId ? "cursor-pointer hover:bg-card transition-colors" : ""}`}
                            onClick={() => prod.productId && setPreviewProductId(prod.productId)}
                          >
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-sm overflow-hidden border border-border shrink-0 bg-muted">
                                  {prod.image ? (
                                    <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <FolderOpen className="h-3 w-3 text-muted-foreground/30" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-body text-foreground">{prod.name}</span>
                                  {prod.productId && <Eye className="h-3 w-3 text-muted-foreground/40" />}
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-2 text-[11px] font-body text-foreground text-center">{prod.qty}</td>
                            <td className="px-2 py-2 text-[11px] font-body text-muted-foreground">{prod.supplier}</td>
                            <td className="px-4 py-2 text-right">
                              <span className={`text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${PRODUCT_STATUS_STYLES[prod.status] || "bg-muted text-muted-foreground"}`}>{prod.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === "zones" && project.zones.length === 0 && (
        <div className="text-center py-8">
          <MapPin className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-[10px] font-body text-muted-foreground">No zones yet</p>
        </div>
      )}

      {/* Notes tab — real DB annotations */}
      {activeTab === "notes" && (
        <Suspense fallback={<div className="py-8 text-center text-sm text-muted-foreground">Loading notes...</div>}>
          <ProjectAnnotations projectId={projectId} />
        </Suspense>
      )}

      {/* Material Boards tab */}
      {activeTab === "boards" && (
        <div className="space-y-3">
          {boardsLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading boards...</div>
          ) : boards.length === 0 ? (
            <div className="text-center py-8">
              <Image className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-[10px] font-body text-muted-foreground">No material boards for this project</p>
            </div>
          ) : (
            boards.map((board: any) => (
              <div
                key={board.id}
                onClick={() => setActiveBoardId(board.id)}
                className="flex items-center justify-between px-4 py-3 border border-border rounded-sm hover:border-foreground/20 transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-xs font-display font-semibold text-foreground truncate">{board.board_name}</p>
                  <p className="text-[10px] font-body text-muted-foreground">
                    {board.items?.length || 0} items · {board.updated_at ? new Date(board.updated_at).toLocaleDateString("fr-FR") : ""}
                  </p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            ))
          )}
        </div>
      )}

      {/* Related quotes — with expandable item details */}
      {relatedQuotes.length > 0 && (
        <div>
          <p className="font-display font-bold text-sm text-foreground mb-3">{t('ad.detail.relatedQuotes')} ({relatedQuotes.length})</p>
          <div className="space-y-3">
            {relatedQuotes.map(q => {
              const qst = QUOTE_STATUS_STYLES[q.status];
              const isExpanded = expandedQuote === q.id;
              return (
                <div key={q.id} className="border border-border rounded-sm overflow-hidden">
                  <button onClick={() => setExpandedQuote(isExpanded ? null : q.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-card transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <p className="text-xs font-display font-semibold text-foreground text-left">{q.supplierName}</p>
                        <p className="text-[10px] font-body text-muted-foreground text-left">{q.products.length} produits · {q.dateSent}{q.dateReply ? ` · Répondu ${q.dateReply}` : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-display font-semibold text-foreground">€{q.amount.toLocaleString()}</span>
                      <span className={`text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${qst.style}`}>{qst.label}</span>
                      <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-border">
                      {q.supplierMessage && (
                        <div className="px-4 py-3 bg-card border-b border-border">
                          <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t('ad.quoteDetail.supplierMessage')}</p>
                          <p className="text-[11px] font-body text-foreground/80 leading-relaxed">{q.supplierMessage}</p>
                        </div>
                      )}
                      <table className="w-full">
                        <thead><tr className="bg-muted/50">
                          <th className="text-left px-4 py-2 text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('ad.detail.product')}</th>
                          <th className="text-center px-2 py-2 text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('ad.detail.qty')}</th>
                          <th className="text-right px-2 py-2 text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('ad.quoteDetail.unitPrice')}</th>
                          <th className="text-right px-4 py-2 text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('ad.quoteDetail.total')}</th>
                        </tr></thead>
                        <tbody>
                          {q.products.map((p, i) => (
                            <tr key={i} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                              <td className="px-4 py-2 text-[11px] font-body text-foreground">{p.name}</td>
                              <td className="px-2 py-2 text-[11px] font-body text-foreground text-center">{p.qty}</td>
                              <td className="px-2 py-2 text-[11px] font-body text-muted-foreground text-right">€{p.unitPrice.toLocaleString()}</td>
                              <td className="px-4 py-2 text-[11px] font-display font-semibold text-foreground text-right">€{p.total.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot><tr className="border-t border-border bg-muted/30">
                          <td colSpan={3} className="px-4 py-2 text-[11px] font-display font-bold text-foreground text-right">{t('ad.quoteDetail.total')}</td>
                          <td className="px-4 py-2 text-[11px] font-display font-bold text-foreground text-right">€{q.amount.toLocaleString()}</td>
                        </tr></tfoot>
                      </table>
                      {q.validUntil && (
                        <div className="px-4 py-2 text-[9px] font-body text-muted-foreground border-t border-border">
                          {t('ad.quoteDetail.validUntil')} : {q.validUntil}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Project messages */}
      <div>
        <p className="font-display font-bold text-sm text-foreground mb-3">{t('ad.detail.projectMessages')}</p>
        <ArchitectMessagesSection filterProjectRef={`project-${project.id}`} />
      </div>

      {/* Product preview drawer */}
      {previewProductId && (
        <Suspense fallback={<div className="fixed inset-y-0 right-0 w-96 bg-background border-l border-border animate-pulse" />}>
          <ProductPreviewDrawer productId={previewProductId} onClose={() => setPreviewProductId(null)} />
        </Suspense>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── ARCHITECT PROJECTS SECTION ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function ArchitectProjectsSection({
  tier, onNavigate, extraProjects = [],
}: {
  tier: ArchitectTier; onNavigate?: ArchitectSectionSetter; extraProjects?: ArchitectProject[];
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projects: dbProjects, isLoading } = useArchitectProjects();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const allProjects = [...extraProjects, ...dbProjects.map((row) => dbToArchitectProject(row))];

  const filters = [
    { id: "all", label: t('ad.projects.all') },
    { id: "in-progress", label: t('ad.projects.active') },
    { id: "quoting", label: t('ad.projects.quoting') },
    { id: "delivered", label: t('ad.projects.delivered') },
    { id: "draft", label: t('ad.projects.draft') },
  ];

  const filtered = allProjects
    .filter(p => filter === "all" || p.status === filter)
    .filter(p => !search || p.projectName.toLowerCase().includes(search.toLowerCase()) || p.clientName.toLowerCase().includes(search.toLowerCase()));

  if (selectedProject) {
    return <ArchitectProjectDetail projectId={selectedProject} onBack={() => setSelectedProject(null)} extraProjects={extraProjects} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="font-display font-bold text-sm text-foreground">{t('ad.projects.title')}</p>
        <button
          onClick={() => onNavigate?.("create-project")}
          className="flex items-center gap-2 px-4 py-2 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
        >
          <Plus className="h-3.5 w-3.5" /> {t('ad.projects.newProject')}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('ad.projects.search')}
            className="w-full pl-9 pr-4 py-2 text-xs font-body bg-transparent border border-border rounded-full focus:outline-none focus:border-foreground transition-colors"
          />
        </div>
      </div>

      <div className="flex gap-1">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 text-[10px] font-display font-semibold rounded-full transition-colors ${
              filter === f.id ? "bg-foreground text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-card"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FolderOpen className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-body text-muted-foreground">{t('ad.projects.noResults')}</p>
          </div>
        ) : (
          filtered.map((p) => {
            const st = STATUS_STYLES[p.status];
            return (
              <div
                key={p.id}
                onClick={() => setSelectedProject(p.id)}
                className="flex items-center justify-between px-4 py-3 border border-border rounded-sm hover:border-foreground/20 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-lg">{VENUE_ICONS[p.venueType] || "📍"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-display font-semibold text-foreground truncate">{p.projectName}</p>
                    <p className="text-[10px] font-body text-muted-foreground">
                      {p.clientName} · {p.zoneCount} zones · {p.productCount} produits · {p.quotesCount} devis
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-xs font-display font-semibold text-foreground">€{p.estimatedValue.toLocaleString()}</p>
                    <p className="text-[9px] font-body text-muted-foreground">{p.updatedAt}</p>
                  </div>
                  <span className={`text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap ${st.style}`}>{st.label}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── QUOTE DETAIL VIEW ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function QuoteDetail({ quote, onBack }: { quote: ArchitectQuote; onBack: () => void }) {
  const { t } = useTranslation();
  const qst = QUOTE_STATUS_STYLES[quote.status];

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3 w-3" /> {t('ad.quoteDetail.backToQuotes')}
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display font-bold text-lg text-foreground">{quote.supplierName}</h2>
          <p className="text-xs font-body text-muted-foreground">{quote.projectName} · {quote.clientName}</p>
        </div>
        <span className={`text-[9px] font-display font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${qst.style}`}>{qst.label}</span>
      </div>

      {/* Key info */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard value={`€${quote.amount.toLocaleString()}`} label={t('ad.quoteDetail.totalAmount')} icon={TrendingUp} />
        <StatCard value={`${quote.products.length}`} label={t('ad.quoteDetail.products')} icon={FolderOpen} />
        <StatCard value={quote.dateSent} label={t('ad.quoteDetail.sentDate')} icon={Send} />
        <StatCard value={quote.validUntil || "—"} label={t('ad.quoteDetail.validUntil')} icon={Calendar} />
      </div>

      {/* Supplier message */}
      {quote.supplierMessage && (
        <div className="border border-border rounded-sm p-4 bg-card">
          <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('ad.quoteDetail.supplierMessage')}</p>
          <p className="text-[11px] font-body text-foreground leading-relaxed">{quote.supplierMessage}</p>
          {quote.dateReply && (
            <p className="text-[9px] font-body text-muted-foreground mt-2">{t('ad.quoteDetail.repliedOn')} {quote.dateReply}</p>
          )}
        </div>
      )}

      {/* Product breakdown */}
      <div>
        <p className="font-display font-bold text-sm text-foreground mb-3">{t('ad.quoteDetail.productBreakdown')}</p>
        <div className="border border-border rounded-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-4 py-2.5 text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('ad.detail.product')}</th>
                <th className="text-center px-2 py-2.5 text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('ad.detail.qty')}</th>
                <th className="text-right px-2 py-2.5 text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('ad.quoteDetail.unitPrice')}</th>
                <th className="text-right px-4 py-2.5 text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('ad.quoteDetail.total')}</th>
              </tr>
            </thead>
            <tbody>
              {quote.products.map((prod, i) => (
                <tr key={i} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                  <td className="px-4 py-2.5 text-[11px] font-body text-foreground">{prod.name}</td>
                  <td className="px-2 py-2.5 text-[11px] font-body text-foreground text-center">{prod.qty}</td>
                  <td className="px-2 py-2.5 text-[11px] font-body text-muted-foreground text-right">€{prod.unitPrice.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-[11px] font-display font-semibold text-foreground text-right">€{prod.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/30">
                <td colSpan={3} className="px-4 py-2.5 text-xs font-display font-bold text-foreground text-right">{t('ad.quoteDetail.total')}</td>
                <td className="px-4 py-2.5 text-xs font-display font-bold text-foreground text-right">€{quote.amount.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Attachments */}
      {quote.attachments && quote.attachments.length > 0 && (
        <div>
          <p className="font-display font-bold text-sm text-foreground mb-3">{t('ad.quoteDetail.attachments')}</p>
          <div className="space-y-1.5">
            {quote.attachments.map((file, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 border border-border rounded-sm hover:border-foreground/20 transition-colors cursor-pointer">
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] font-body text-foreground">{file}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {quote.status === "replied" && (
        <div className="flex items-center gap-3 pt-2">
          <button className="flex items-center gap-2 px-5 py-2.5 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity">
            <CheckCircle2 className="h-3.5 w-3.5" /> {t('ad.quoteDetail.accept')}
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 text-xs font-display font-semibold border border-border text-foreground rounded-full hover:border-foreground transition-colors">
            <MessageSquare className="h-3.5 w-3.5" /> {t('ad.quoteDetail.negotiate')}
          </button>
          <button className="text-xs font-body text-muted-foreground hover:text-red-500 transition-colors">
            {t('ad.quoteDetail.decline')}
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── ARCHITECT QUOTES SECTION ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function ArchitectQuotesSection({ tier }: { tier: ArchitectTier }) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<string>("all");
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);

  const filters = [
    { id: "all", label: t('ad.quotes.all') },
    { id: "pending", label: t('ad.quotes.pending') },
    { id: "replied", label: t('ad.quotes.replied') },
    { id: "accepted", label: t('ad.quotes.accepted') },
    { id: "expired", label: t('ad.quotes.expired') },
  ];

  const filtered = MOCK_QUOTES.filter(q => filter === "all" || q.status === filter);

  if (selectedQuote) {
    const quote = MOCK_QUOTES.find(q => q.id === selectedQuote);
    if (quote) return <QuoteDetail quote={quote} onBack={() => setSelectedQuote(null)} />;
  }

  // Group quotes by project
  const byProject: Record<string, ArchitectQuote[]> = {};
  filtered.forEach(q => {
    const key = `${q.projectName} — ${q.clientName}`;
    if (!byProject[key]) byProject[key] = [];
    byProject[key].push(q);
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="font-display font-bold text-sm text-foreground">{t('ad.quotes.title')}</p>
        <span className="text-[10px] font-body text-muted-foreground">
          {filtered.length} {t('ad.quotes.total')}
        </span>
      </div>

      <div className="flex gap-1">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 text-[10px] font-display font-semibold rounded-full transition-colors ${
              filter === f.id ? "bg-foreground text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-card"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-body text-muted-foreground">{t('ad.quotes.noResults')}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(byProject).map(([projectKey, quotes]) => (
            <div key={projectKey}>
              <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-2">{projectKey}</p>
              <div className="space-y-2">
                {quotes.map((q) => {
                  const st = QUOTE_STATUS_STYLES[q.status];
                  return (
                    <div
                      key={q.id}
                      onClick={() => setSelectedQuote(q.id)}
                      className="flex items-center justify-between px-4 py-3 border border-border rounded-sm hover:border-foreground/20 transition-colors cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-display font-semibold text-foreground truncate">{q.supplierName}</p>
                        <p className="text-[10px] font-body text-muted-foreground truncate">{q.productSummary}</p>
                        <p className="text-[9px] font-body text-muted-foreground">{q.dateSent}{q.dateReply ? ` · Répondu le ${q.dateReply}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-display font-semibold text-foreground">€{q.amount.toLocaleString()}</span>
                        <span className={`text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap ${st.style}`}>{st.label}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── ARCHITECT SUPPLIER CALLS SECTION ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const NEED_PRESETS = [
  { cat: "Assises", ph: "Chaises, fauteuils, tabourets, banquettes…" },
  { cat: "Tables", ph: "Tables dining, basses, hautes, d'appoint…" },
  { cat: "Protection solaire", ph: "Parasols, voiles d'ombrage, stores…" },
];

const NEED_CATEGORIES = [
  "Assises", "Tables", "Protection solaire", "Bains de soleil & transats",
  "Éclairage", "Décoration", "Végétal & jardinières", "Canapés & lounge",
  "Accessoires", "Rangement", "Chauffage extérieur", "Autre",
];

interface NeedRow {
  id: string;
  category: string;
  description: string;
  qty: string;
  priority: "essential" | "important" | "optional";
  customCategory: string;
}

function makeNeedRow(cat = "", desc = "", priority: "essential" | "important" | "optional" = "essential"): NeedRow {
  return { id: `nr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, category: cat, description: desc, qty: "", priority, customCategory: "" };
}

// ── Sub-component: Expanded call detail with responses fetched from DB ───────

function CallDetailExpanded({
  call,
  onSelectResponse,
  onCloseCall,
}: {
  call: HookSupplierCall;
  onSelectResponse: (responseId: string) => void;
  onCloseCall: (callId: string) => void;
}) {
  const { t } = useTranslation();

  // Fetch responses for the expanded call via getCallDetail query
  const { data: detail, isLoading: detailLoading } = useQuery<{ call: HookSupplierCall | null; responses: HookSupplierResponse[] }>({
    queryKey: ["supplier-call-detail", call.id],
    queryFn: async () => {
      const { data: responsesRaw } = await supabase
        .from("pro_service_responses")
        .select(
          "id, partner_id, message, estimated_amount, delivery_weeks, warranty, products, is_selected, created_at, partner:partner_id(name, country, logo_url, partner_type)",
        )
        .eq("request_id", call.id)
        .order("created_at", { ascending: false });

      const responses: HookSupplierResponse[] = (responsesRaw ?? []).map(
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
    enabled: true,
  });

  const responses = detail?.responses ?? [];

  // Map categories to needs-like structure for display
  const needs: ProjectNeed[] = (call.categoriesNeeded || []).map((cat) => ({
    category: cat,
    description: "",
    priority: "essential" as const,
  }));

  // Style preferences joined as style string
  const styleStr = (call.stylePreferences || []).join(", ") || undefined;

  return (
    <div className="border-t border-border">
      {/* Metrics cards */}
      <div className="grid grid-cols-4 gap-0 border-b border-border">
        {[
          { value: `${call.views}`, label: t('ad.calls.views'), color: "#6B7B5E" },
          { value: `${call.clicks}`, label: t('ad.calls.clicks'), color: "#2563EB" },
          { value: `${call.responsesCount}`, label: t('ad.calls.responses'), color: "#059669" },
          { value: call.views > 0 ? `${Math.round((call.clicks / call.views) * 100)}%` : "\u2014", label: t('ad.calls.clickRate'), color: "#D97706" },
        ].map((m, i) => (
          <div key={i} className={`p-3 text-center ${i < 3 ? "border-r border-border" : ""}`}>
            <p className="font-display font-bold text-lg" style={{ color: m.color }}>{m.value}</p>
            <p className="text-[9px] font-body text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Full brief + specs */}
      <div className="p-4 border-b border-border space-y-3">
        <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('ad.calls.fullBrief')}</p>
        <p className="text-[11px] font-body text-foreground/80 leading-relaxed">{call.brief}</p>

        {/* Project specs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {styleStr && <div className="px-3 py-2 border border-border rounded-sm"><p className="text-[8px] font-display font-semibold uppercase tracking-wider text-muted-foreground">Style</p><p className="text-[10px] font-body text-foreground">{styleStr}</p></div>}
          {call.urgency && <div className="px-3 py-2 border border-border rounded-sm"><p className="text-[8px] font-display font-semibold uppercase tracking-wider text-muted-foreground">Urgence</p><p className={`text-[10px] font-body ${call.urgency === "urgent" ? "text-red-600 font-semibold" : "text-foreground"}`}>{call.urgency === "urgent" ? "Urgent" : call.urgency === "flexible" ? "Flexible" : "Normal"}</p></div>}
        </div>

        {/* Needs by priority (mapped from categoriesNeeded) */}
        {needs.length > 0 && (
          <div>
            <p className="text-[8px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('ad.calls.needsList')}</p>
            <div className="space-y-1.5">
              {needs.map(n => {
                const priorityStyle = n.priority === "essential" ? "border-l-green-500 bg-green-50/30" : n.priority === "important" ? "border-l-blue-500 bg-blue-50/30" : "border-l-muted-foreground/30 bg-muted/20";
                const priorityLabel = n.priority === "essential" ? "Essentiel" : n.priority === "important" ? "Important" : "Optionnel";
                const priorityColor = n.priority === "essential" ? "text-green-700 bg-green-50" : n.priority === "important" ? "text-blue-700 bg-blue-50" : "text-muted-foreground bg-muted";
                return (
                  <div key={n.category} className={`flex items-center justify-between px-3 py-2 border-l-2 rounded-r-sm ${priorityStyle}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-display font-semibold text-foreground">{n.category}</span>
                        <span className={`text-[8px] font-display font-semibold uppercase px-1.5 py-0.5 rounded-full ${priorityColor}`}>{priorityLabel}</span>
                      </div>
                      {n.description && <p className="text-[9px] font-body text-muted-foreground mt-0.5">{n.description}</p>}
                    </div>
                    {n.qty && <span className="text-[10px] font-display font-semibold text-foreground shrink-0 ml-3">&times;{n.qty}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Supplier responses with products */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
            {t('ad.calls.supplierResponses')} ({responses.length})
          </p>
          {call.status !== "closed" && (
            <button
              onClick={() => onCloseCall(call.id)}
              className="text-[9px] font-display font-semibold px-3 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
            >
              {t('ad.calls.closed')}
            </button>
          )}
        </div>
        {detailLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-foreground" />
          </div>
        ) : responses.length === 0 ? (
          <p className="text-[10px] font-body text-muted-foreground text-center py-4">{t('ad.calls.noResponses')}</p>
        ) : (
          <div className="space-y-3">
            {[...responses]
              .sort((a, b) => (a.estimatedAmount ?? 0) - (b.estimatedAmount ?? 0))
              .map((r, i) => {
                const products: ResponseProduct[] = (r.products || []).map((p: any) => ({
                  name: p.name || p.product_name || "",
                  qty: p.qty || p.quantity || 0,
                  unitPrice: p.unitPrice || p.unit_price || 0,
                  total: p.total || (p.qty || p.quantity || 0) * (p.unitPrice || p.unit_price || 0),
                  image: p.image || p.image_url,
                }));
                const displayName = r.partnerName || "Fournisseur";
                const displayInitial = displayName[0] || "?";
                return (
                <div key={r.id} className={`border rounded-sm overflow-hidden ${r.isSelected ? "border-green-400 bg-green-50/30" : "border-border"}`}>
                  {/* Response header */}
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        {r.partnerLogo ? (
                          <img src={r.partnerLogo} alt={displayName} className="w-7 h-7 rounded-full object-cover border border-border" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px] font-display font-bold">{displayInitial}</div>
                        )}
                        <div>
                          <p className="text-[11px] font-display font-semibold text-foreground">{displayName}</p>
                          <p className="text-[9px] font-body text-muted-foreground">{r.partnerType ? `${r.partnerType} · ` : ""}{r.partnerCountry || ""}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {i === 0 && <span className="text-[8px] font-display font-semibold uppercase px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">{t('ad.calls.bestPrice')}</span>}
                        {r.isSelected && <span className="text-[8px] font-display font-semibold uppercase px-1.5 py-0.5 rounded-full bg-green-100 text-green-800">{t('ad.calls.selected')}</span>}
                        {r.warranty && <span className="text-[8px] font-display font-semibold uppercase px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">{t('ad.calls.warranty')} {r.warranty}</span>}
                      </div>
                    </div>
                    {r.message && <p className="text-[10px] font-body text-foreground/80 leading-relaxed">{r.message}</p>}

                    {/* Key numbers */}
                    <div className="flex items-center gap-4 mt-2 text-[10px] font-body">
                      {r.estimatedAmount != null && <span className="font-display font-bold text-foreground">&euro;{r.estimatedAmount.toLocaleString()}</span>}
                      {r.deliveryWeeks != null && <span className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3" /> {r.deliveryWeeks} sem.</span>}
                      {products.length > 0 && <span className="text-muted-foreground">{products.length} produits</span>}
                    </div>
                  </div>

                  {/* Products table */}
                  {products.length > 0 && (
                    <div className="border-t border-border">
                      <table className="w-full">
                        <thead><tr className="bg-muted/40">
                          <th className="text-left px-3 py-1.5 text-[8px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('ad.detail.product')}</th>
                          <th className="text-center px-2 py-1.5 text-[8px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('ad.detail.qty')}</th>
                          <th className="text-right px-2 py-1.5 text-[8px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('ad.quoteDetail.unitPrice')}</th>
                          <th className="text-right px-3 py-1.5 text-[8px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('ad.quoteDetail.total')}</th>
                        </tr></thead>
                        <tbody>
                          {products.map((p, pi) => (
                            <tr key={pi} className={pi % 2 === 0 ? "" : "bg-muted/20"}>
                              <td className="px-3 py-1.5">
                                <div className="flex items-center gap-2">
                                  {p.image && <img src={p.image} alt={p.name} className="w-6 h-6 rounded-sm object-cover border border-border shrink-0" />}
                                  <span className="text-[10px] font-body text-foreground">{p.name}</span>
                                </div>
                              </td>
                              <td className="px-2 py-1.5 text-[10px] font-body text-foreground text-center">{p.qty}</td>
                              <td className="px-2 py-1.5 text-[10px] font-body text-muted-foreground text-right">&euro;{p.unitPrice.toLocaleString()}</td>
                              <td className="px-3 py-1.5 text-[10px] font-display font-semibold text-foreground text-right">&euro;{p.total.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot><tr className="border-t border-border bg-muted/30">
                          <td colSpan={3} className="px-3 py-1.5 text-[10px] font-display font-bold text-foreground text-right">{t('ad.quoteDetail.total')}</td>
                          <td className="px-3 py-1.5 text-[10px] font-display font-bold text-foreground text-right">&euro;{(r.estimatedAmount ?? 0).toLocaleString()}</td>
                        </tr></tfoot>
                      </table>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end px-3 py-2 border-t border-border bg-muted/20">
                    {!r.isSelected && call.status !== "closed" && (
                      <button
                        onClick={() => onSelectResponse(r.id)}
                        className="text-[9px] font-display font-semibold px-3 py-1 rounded-full bg-foreground text-primary-foreground hover:opacity-90 transition-opacity"
                      >
                        {t('ad.calls.selectSupplier')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function ArchitectCallsSection({ tier }: { tier: ArchitectTier }) {
  const { t } = useTranslation();
  const { calls, isLoading, createCall, isCreating, selectResponse, closeCall } = useSupplierCalls();
  const [filter, setFilter] = useState<string>("all");
  const [showNew, setShowNew] = useState(false);
  const [expandedCall, setExpandedCall] = useState<string | null>(null);
  const [needRows, setNeedRows] = useState<NeedRow[]>([
    makeNeedRow("Assises", "", "essential"),
    makeNeedRow("Tables", "", "essential"),
    makeNeedRow("Protection solaire", "", "important"),
  ]);

  // ── Create form state ──────────────────────────────────────────────────────
  const [formProject, setFormProject] = useState("");
  const [formBudget, setFormBudget] = useState("");
  const [formDeadline, setFormDeadline] = useState("");
  const [formBrief, setFormBrief] = useState("");
  const [formStyle, setFormStyle] = useState("");
  const [formUrgency, setFormUrgency] = useState<"normal" | "urgent" | "flexible">("normal");
  const [formMaterials, setFormMaterials] = useState("");
  const [formSurface, setFormSurface] = useState("");
  const [formCapacity, setFormCapacity] = useState("");
  const [formAmbiance, setFormAmbiance] = useState("");
  const [formConstraints, setFormConstraints] = useState("");

  const resetForm = () => {
    setFormProject(""); setFormBudget(""); setFormDeadline(""); setFormBrief("");
    setFormStyle(""); setFormUrgency("normal"); setFormMaterials("");
    setFormSurface(""); setFormCapacity(""); setFormAmbiance(""); setFormConstraints("");
    setNeedRows([makeNeedRow("Assises", "", "essential"), makeNeedRow("Tables", "", "essential"), makeNeedRow("Protection solaire", "", "important")]);
  };

  const handleCreateCall = async () => {
    if (!formBrief.trim() || !formBudget.trim()) {
      toast.error(t('ad.calls.fillRequired'));
      return;
    }

    // Build project_title from selected project or brief
    const projectLabel = formProject || formBrief.slice(0, 60);
    const categories = needRows
      .filter(r => r.category && r.category !== "")
      .map(r => r.category === "Autre" ? r.customCategory : r.category)
      .filter(Boolean);
    const styles = formStyle ? formStyle.split(",").map(s => s.trim()).filter(Boolean) : [];

    try {
      await createCall({
        project_title: projectLabel,
        project_type: "",
        client_name: "",
        client_email: "",
        budget_range: formBudget || null,
        timeline: formDeadline || null,
        description: formBrief || null,
        categories_needed: categories.length > 0 ? categories : null,
        style_preferences: styles.length > 0 ? styles : null,
        special_requirements: formConstraints || null,
      });
      toast.success(t('ad.calls.publishSuccess'));
      resetForm();
      setShowNew(false);
    } catch (err: any) {
      console.error("Failed to create call:", err);
      toast.error(err?.message || t('ad.calls.publishError'));
    }
  };

  const handleSelectResponse = async (responseId: string) => {
    try {
      await selectResponse(responseId);
      toast.success(t('ad.calls.responseSelected'));
    } catch (err: any) {
      console.error("Failed to select response:", err);
      toast.error(err?.message || "Error");
    }
  };

  const handleCloseCall = async (callId: string) => {
    try {
      await closeCall(callId);
      toast.success(t('ad.calls.callClosed'));
    } catch (err: any) {
      console.error("Failed to close call:", err);
      toast.error(err?.message || "Error");
    }
  };

  const filters = [
    { id: "all", label: t('ad.calls.all') },
    { id: "open", label: t('ad.calls.open') },
    { id: "evaluating", label: t('ad.calls.evaluating') },
    { id: "closed", label: t('ad.calls.closed') },
  ];

  // Map hook status values to filter — the hook may return "pending" etc., normalize
  const statusMap: Record<string, string> = { pending: "open", open: "open", in_progress: "evaluating", evaluating: "evaluating", closed: "closed", completed: "closed" };
  const normalizeStatus = (s: string) => statusMap[s] || s;
  const filtered = calls.filter(c => filter === "all" || normalizeStatus(c.status) === filter);

  // ── Empty state when no calls at all ───────────────────────────────────────
  const hasNoCalls = !isLoading && calls.length === 0 && !showNew;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display font-bold text-sm text-foreground">{t('ad.calls.title')}</p>
          <p className="text-[10px] font-body text-muted-foreground mt-0.5">{t('ad.calls.subtitle')}</p>
        </div>
        <button onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity">
          <Megaphone className="h-3.5 w-3.5" /> {t('ad.calls.newCall')}
        </button>
      </div>

      {hasNoCalls && (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border rounded-sm">
          <Megaphone className="h-10 w-10 text-muted-foreground/30 mb-4" />
          <p className="text-sm font-display font-semibold text-foreground mb-1">{t('ad.calls.emptyTitle', 'No supplier calls yet')}</p>
          <p className="text-[11px] font-body text-muted-foreground mb-4 max-w-xs">{t('ad.calls.emptyDesc', 'Create your first supplier call to start receiving quotes from verified partners.')}</p>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity">
            <Megaphone className="h-3.5 w-3.5" /> {t('ad.calls.createFirst', 'Create your first supplier call')}
          </button>
        </div>
      )}

      {showNew && (
        <div className="border-2 border-foreground/20 rounded-sm p-5 space-y-4 bg-card">
          <p className="font-display font-bold text-sm text-foreground">{t('ad.calls.createTitle')}</p>
          <p className="text-[10px] font-body text-muted-foreground -mt-2">{t('ad.calls.createSubtitle')}</p>

          {/* Project + budget + deadline */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <span className={labelCls}>{t('ad.calls.projectLabel')} *</span>
              <input value={formProject} onChange={e => setFormProject(e.target.value)} placeholder={t('ad.calls.selectProject')} className={inputCls} />
            </div>
            <div><span className={labelCls}>{t('ad.calls.budgetLabel')} *</span><input value={formBudget} onChange={e => setFormBudget(e.target.value)} placeholder="ex: 20 000 – 30 000 €" className={inputCls} /></div>
            <div><span className={labelCls}>{t('ad.calls.deadlineLabel')} *</span><input value={formDeadline} onChange={e => setFormDeadline(e.target.value)} type="date" className={inputCls} /></div>
          </div>

          {/* Brief */}
          <div><span className={labelCls}>{t('ad.calls.briefLabel')} *</span><textarea value={formBrief} onChange={e => setFormBrief(e.target.value)} rows={3} placeholder={t('ad.calls.briefPlaceholder')} className={inputCls + " resize-none"} /></div>

          {/* Needs list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={labelCls + " mb-0"}>{t('ad.calls.needsLabel')} *</span>
              <button type="button" onClick={() => setNeedRows(prev => [...prev, makeNeedRow()])}
                className="text-[9px] font-display font-semibold text-foreground hover:underline flex items-center gap-1">
                <Plus className="h-3 w-3" /> {t('ad.calls.addNeed')}
              </button>
            </div>
            <div className="space-y-2">
              {needRows.map((row) => (
                <div key={row.id} className="grid grid-cols-12 gap-2 items-start">
                  <select
                    value={row.category}
                    onChange={e => setNeedRows(prev => prev.map(r => r.id === row.id ? { ...r, category: e.target.value, customCategory: e.target.value === "Autre" ? r.customCategory : "" } : r))}
                    className={inputCls + " col-span-3"}
                  >
                    <option value="">{t('ad.calls.needCategory')}</option>
                    {NEED_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {row.category === "Autre" ? (
                    <div className="col-span-2">
                      <input
                        value={row.customCategory}
                        onChange={e => setNeedRows(prev => prev.map(r => r.id === row.id ? { ...r, customCategory: e.target.value } : r))}
                        placeholder={t('ad.calls.customCategory')}
                        className={inputCls}
                      />
                    </div>
                  ) : null}
                  <input
                    value={row.description}
                    onChange={e => setNeedRows(prev => prev.map(r => r.id === row.id ? { ...r, description: e.target.value } : r))}
                    placeholder={t('ad.calls.needDesc')}
                    className={inputCls + (row.category === "Autre" ? " col-span-3" : " col-span-5")}
                  />
                  <input
                    value={row.qty}
                    onChange={e => setNeedRows(prev => prev.map(r => r.id === row.id ? { ...r, qty: e.target.value } : r))}
                    placeholder="Qté" type="number"
                    className={inputCls + " col-span-1"}
                  />
                  <select
                    value={row.priority}
                    onChange={e => setNeedRows(prev => prev.map(r => r.id === row.id ? { ...r, priority: e.target.value as NeedRow["priority"] } : r))}
                    className={inputCls + " col-span-2"}
                  >
                    <option value="essential">{t('ad.calls.priorityEssential')}</option>
                    <option value="important">{t('ad.calls.priorityImportant')}</option>
                    <option value="optional">{t('ad.calls.priorityOptional')}</option>
                  </select>
                  {needRows.length > 1 && (
                    <button type="button" onClick={() => setNeedRows(prev => prev.filter(r => r.id !== row.id))}
                      className="col-span-1 flex items-center justify-center py-2 text-muted-foreground/40 hover:text-red-500 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[9px] font-body text-muted-foreground mt-1.5">{t('ad.calls.needsHint')}</p>
          </div>

          {/* Style + urgency */}
          <div className="grid grid-cols-3 gap-3">
            <div><span className={labelCls}>{t('ad.calls.styleLabel')}</span><input value={formStyle} onChange={e => setFormStyle(e.target.value)} placeholder="ex: Contemporain, Bistrot chic…" className={inputCls} /></div>
            <div>
              <span className={labelCls}>{t('ad.calls.urgencyLabel')}</span>
              <select value={formUrgency} onChange={e => setFormUrgency(e.target.value as "normal" | "urgent" | "flexible")} className={inputCls}>
                <option value="normal">{t('ad.calls.urgencyNormal')}</option>
                <option value="urgent">{t('ad.calls.urgencyUrgent')}</option>
                <option value="flexible">{t('ad.calls.urgencyFlexible')}</option>
              </select>
            </div>
            <div><span className={labelCls}>{t('ad.calls.materialsLabel')}</span><input value={formMaterials} onChange={e => setFormMaterials(e.target.value)} placeholder="Aluminium, Teck, Résine…" className={inputCls} /></div>
          </div>

          {/* Surface + capacity */}
          <div className="grid grid-cols-2 gap-3">
            <div><span className={labelCls}>{t('ad.calls.surfaceLabel')}</span><input value={formSurface} onChange={e => setFormSurface(e.target.value)} placeholder="ex: 200m²" className={inputCls} /></div>
            <div><span className={labelCls}>{t('ad.calls.capacityLabel')}</span><input value={formCapacity} onChange={e => setFormCapacity(e.target.value)} placeholder="ex: 80 couverts" type="number" className={inputCls} /></div>
          </div>

          {/* Ambiance + constraints */}
          <div><span className={labelCls}>{t('ad.calls.ambianceLabel')}</span><input value={formAmbiance} onChange={e => setFormAmbiance(e.target.value)} placeholder={t('ad.calls.ambiancePlaceholder')} className={inputCls} /></div>
          <div><span className={labelCls}>{t('ad.calls.constraintsLabel')}</span><textarea value={formConstraints} onChange={e => setFormConstraints(e.target.value)} rows={2} placeholder={t('ad.calls.constraintsPlaceholder')} className={inputCls + " resize-none"} /></div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleCreateCall}
              disabled={isCreating}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Send className="h-3 w-3" /> {isCreating ? "..." : t('ad.calls.publish')}
            </button>
            <button onClick={() => { setShowNew(false); resetForm(); }} className="text-xs font-body text-muted-foreground hover:text-foreground transition-colors">{t('ad.calls.cancel')}</button>
            <p className="text-[9px] font-body text-muted-foreground flex items-center gap-1.5 ml-auto"><Award className="h-3 w-3" /> {t('ad.calls.pointsNote')}</p>
          </div>
        </div>
      )}

      {(calls.length > 0 || isLoading) && (
        <>
          <div className="flex gap-1">
            {filters.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 text-[10px] font-display font-semibold rounded-full transition-colors ${filter === f.id ? "bg-foreground text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-card"}`}>
                {f.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Megaphone className="h-8 w-8 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-body text-muted-foreground">{t('ad.calls.noResults')}</p>
                </div>
              ) : (
                filtered.map((c) => {
                  const displayStatus = normalizeStatus(c.status);
                  const st = CALL_STATUS_STYLES[displayStatus] || CALL_STATUS_STYLES["open"];
                  const isExpanded = expandedCall === c.id;
                  // Map categoriesNeeded to simple need tags
                  const needTags = c.categoriesNeeded || [];
                  return (
                    <div key={c.id} className="border border-border rounded-sm overflow-hidden">
                      {/* Card header — always visible */}
                      <button onClick={() => setExpandedCall(isExpanded ? null : c.id)}
                        className="w-full p-4 text-left hover:bg-card/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{VENUE_ICONS[c.projectType] || "\uD83D\uDCCD"}</span>
                            <div>
                              <p className="text-xs font-display font-semibold text-foreground">{c.projectTitle}</p>
                              <p className="text-[10px] font-body text-muted-foreground">{c.clientName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${st.style}`}>{st.label}</span>
                            <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                          </div>
                        </div>
                        <p className="text-[11px] font-body text-foreground/80 mb-2.5 line-clamp-2">{c.brief}</p>
                        {/* Metrics row */}
                        <div className="flex items-center gap-3 text-[10px] font-body text-muted-foreground">
                          {c.budget && <span className="flex items-center gap-1"><Target className="h-3 w-3" /> {c.budget}</span>}
                          {c.deadline && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {c.deadline}</span>}
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {c.responsesCount} rép.</span>
                          <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {c.views} vues</span>
                          <span className="flex items-center gap-1"><Target className="h-3 w-3" /> {c.clicks} clics</span>
                        </div>
                        {needTags.length > 0 && (
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            {needTags.map(tag => (
                              <span key={tag} className="text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{tag}</span>
                            ))}
                          </div>
                        )}
                      </button>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <CallDetailExpanded
                          call={c}
                          onSelectResponse={handleSelectResponse}
                          onCloseCall={handleCloseCall}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── ARCHITECT MESSAGES SECTION ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// ── Messaging helpers ───────────────────────────────────────────────────────

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "maintenant";
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}j`;
  return new Date(date).toLocaleDateString("fr-FR");
}

const USER_TYPE_COLOR: Record<string, string> = {
  client: "text-blue-600 bg-blue-50", partner: "text-emerald-600 bg-emerald-50",
  architect: "text-purple-600 bg-purple-50", admin: "text-red-600 bg-red-50",
};
const USER_TYPE_LABEL: Record<string, string> = {
  client: "Client", partner: "Partenaire", architect: "Architecte", admin: "Admin",
};

function participantName(p: { profile: { first_name: string | null; last_name: string | null; email: string } }) {
  const name = [p.profile.first_name, p.profile.last_name].filter(Boolean).join(" ");
  return name || p.profile.email;
}

// ── Shared conversation list item ───────────────────────────────────────────

function ConversationListItem({ conv, userId, isActive, onClick, showProject = true }: {
  conv: any; userId: string; isActive: boolean; onClick: () => void; showProject?: boolean;
}) {
  const others = conv.participants.filter((p: any) => p.user_id !== userId);
  return (
    <button onClick={onClick}
      className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left border-b border-border/50 transition-colors ${isActive ? "bg-card" : "hover:bg-card/50"}`}>
      <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-display font-bold ${
        others[0] ? USER_TYPE_COLOR[others[0].profile.user_type] || "bg-muted text-muted-foreground" : "bg-muted text-muted-foreground"
      }`}>
        {others[0] ? participantName(others[0])[0].toUpperCase() : "?"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className={`text-[10px] font-display truncate ${conv.unread_count > 0 ? "font-bold text-foreground" : "font-semibold text-foreground"}`}>
            {conv.subject || others.map((p: any) => participantName(p)).join(", ") || "Conversation"}
          </p>
          <span className="text-[8px] font-body text-muted-foreground whitespace-nowrap ml-1">
            {conv.last_message_at ? timeAgo(conv.last_message_at) : ""}
          </span>
        </div>
        {showProject && conv.project_name && (
          <p className="text-[8px] font-display font-semibold text-muted-foreground truncate mt-0.5 flex items-center gap-1">
            <FolderOpen className="h-2.5 w-2.5" /> {conv.project_name}
          </p>
        )}
        {conv.last_message && (
          <p className={`text-[9px] font-body truncate mt-0.5 ${conv.unread_count > 0 ? "text-foreground" : "text-muted-foreground"}`}>
            {conv.last_message.body}
          </p>
        )}
      </div>
      {conv.unread_count > 0 && (
        <span className="shrink-0 w-4 h-4 rounded-full bg-foreground text-primary-foreground text-[8px] font-display font-bold flex items-center justify-center mt-0.5">
          {conv.unread_count}
        </span>
      )}
    </button>
  );
}

// ── Inline conversation thread ──────────────────────────────────────────────

function InlineThread({ conversationId, onBack }: { conversationId: string; onBack: () => void }) {
  const { user } = useAuth();
  const { messages, sendMessage, markConversationRead } = useMessages(conversationId);
  const { conversations } = useConversations();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const conv = conversations.find((c: any) => c.id === conversationId);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { markConversationRead(); }, [conversationId, messages.length, markConversationRead]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages.length]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try { await sendMessage(input); setInput(""); }
    catch (err: any) { toast.error(err.message || "Erreur d'envoi"); }
    finally { setSending(false); }
  };

  const others = conv ? conv.participants.filter((p: any) => p.user_id !== user?.id) : [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-xs text-foreground truncate">
            {conv?.subject || others.map((p: any) => participantName(p)).join(", ") || "Conversation"}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {others.map((p: any) => (
              <span key={p.user_id} className={`text-[8px] font-display font-semibold px-1.5 py-0.5 rounded-full ${USER_TYPE_COLOR[p.profile.user_type] || "bg-muted text-muted-foreground"}`}>
                {participantName(p)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <MessageSquare className="h-6 w-6 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-[10px] font-body text-muted-foreground">Aucun message</p>
          </div>
        )}
        {messages.map((msg: any) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[80%]">
                {!isMe && (
                  <p className="text-[8px] font-display font-semibold text-muted-foreground mb-0.5">
                    {msg.sender ? [msg.sender.first_name, msg.sender.last_name].filter(Boolean).join(" ") || msg.sender.email : "?"}
                  </p>
                )}
                <div className={`px-3 py-2 rounded-2xl text-[11px] font-body leading-relaxed ${
                  isMe ? "bg-foreground text-primary-foreground rounded-br-sm" : "bg-card border border-border text-foreground rounded-bl-sm"
                }`}>
                  {msg.body}
                </div>
                <p className={`text-[8px] font-body text-muted-foreground/50 mt-0.5 ${isMe ? "text-right" : ""}`}>
                  {msg.created_at ? timeAgo(msg.created_at) : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 border-t border-border shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Votre message..."
            rows={1}
            className="flex-1 bg-card border border-border rounded-2xl px-3 py-2 text-[11px] font-body outline-none focus:ring-1 focus:ring-foreground resize-none max-h-20"
          />
          <button onClick={handleSend} disabled={!input.trim() || sending}
            className="p-2 bg-foreground text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity shrink-0">
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helper: project linker select that reads from DB ─────────────────────────

function ProjectLinkerSelect({ value, onChange, className, noProjectLabel }: {
  value: string; onChange: (val: string, name: string) => void; className?: string; noProjectLabel: string;
}) {
  const { projects } = useArchitectProjects();
  return (
    <select
      value={value}
      onChange={(e) => {
        const p = projects.find((p) => p.id === e.target.value);
        onChange(e.target.value, p?.project_name || "");
      }}
      className={className}
    >
      <option value="">{noProjectLabel}</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>{p.project_name} — {p.client_name}</option>
      ))}
    </select>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── ARCHITECT MESSAGES SECTION (fully inline) ───────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function ArchitectMessagesSection({ filterProjectRef }: { filterProjectRef?: string } = {}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { conversations, totalUnread, isLoading } = useConversations();
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState<string | null>(filterProjectRef || null);

  // New conversation state
  const [newSearch, setNewSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newProjectRef, setNewProjectRef] = useState(filterProjectRef || "");
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: searchedUsers = [] } = useQuery({
    queryKey: ["arch_msg_users", newSearch],
    enabled: newSearch.length >= 2 && showNew,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("id, first_name, last_name, email, user_type, company")
        .neq("id", user!.id)
        .or(`email.ilike.%${newSearch}%,first_name.ilike.%${newSearch}%,last_name.ilike.%${newSearch}%,company.ilike.%${newSearch}%`)
        .limit(8);
      return data || [];
    },
  });

  const handleCreateConv = async () => {
    if (!selectedUser || !newMessage.trim()) return;
    setCreating(true);
    try {
      const convId = await createConversation(
        user!.id, [selectedUser.id],
        newSubject || `Conversation avec ${selectedUser.first_name || selectedUser.email}`,
        newMessage,
        newProjectRef || undefined,
        newProjectName || undefined,
      );
      setShowNew(false); setSelectedUser(null); setNewSubject(""); setNewMessage(""); setNewSearch(""); setNewProjectRef(""); setNewProjectName("");
      setActiveConv(convId);
    } catch (err: any) { toast.error(err.message || "Erreur"); }
    finally { setCreating(false); }
  };

  // Get unique projects from conversations for filter
  const projectRefs = [...new Set(conversations.filter((c: any) => c.project_name).map((c: any) => c.project_ref))];
  const projectNames: Record<string, string> = {};
  conversations.forEach((c: any) => { if (c.project_ref && c.project_name) projectNames[c.project_ref] = c.project_name; });

  const filtered = conversations.filter((c: any) => {
    // When actively searching, ignore project filter to search across all conversations
    if (projectFilter && !search && c.project_ref !== projectFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    const others = c.participants.filter((p: any) => p.user_id !== user?.id);
    const lastMsg = c.last_message?.body || "";
    return (c.subject || "").toLowerCase().includes(s)
      || others.some((p: any) => participantName(p).toLowerCase().includes(s))
      || others.some((p: any) => (p.profile.company || "").toLowerCase().includes(s))
      || (c.project_name || "").toLowerCase().includes(s)
      || lastMsg.toLowerCase().includes(s);
  });

  if (!user) return null;

  return (
    <div className="border border-border rounded-sm overflow-hidden" style={{ height: "calc(100vh - var(--header-height) - 180px)", minHeight: "450px" }}>
      <div className="flex h-full">
        {/* Sidebar */}
        <div className={`w-full md:w-72 border-r border-border shrink-0 flex flex-col ${activeConv ? "hidden md:flex" : "flex"}`}>
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
            <div className="flex items-center gap-1.5">
              <p className="font-display font-bold text-xs text-foreground">{t('ad.messages.title')}</p>
              {totalUnread > 0 && (
                <span className="text-[8px] font-display font-bold bg-foreground text-primary-foreground px-1.5 py-0.5 rounded-full">{totalUnread}</span>
              )}
            </div>
            <button onClick={() => setShowNew(true)}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-card rounded-sm transition-colors">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Search */}
          <div className="px-3 py-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('ad.messages.searchPlaceholder')}
                className="w-full bg-transparent border border-border rounded-sm pl-7 pr-7 py-1.5 text-[10px] font-body outline-none focus:border-foreground transition-colors" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Project filter tabs */}
          {!filterProjectRef && projectRefs.length > 0 && (
            <div className="px-2 py-1.5 border-b border-border flex gap-1 overflow-x-auto">
              <button onClick={() => setProjectFilter(null)}
                className={`shrink-0 px-2 py-1 text-[8px] font-display font-semibold rounded-full transition-colors ${!projectFilter ? "bg-foreground text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-card"}`}>
                {t('ad.messages.allProjects')}
              </button>
              {projectRefs.map(ref => (
                <button key={ref} onClick={() => setProjectFilter(ref === projectFilter ? null : ref)}
                  className={`shrink-0 px-2 py-1 text-[8px] font-display font-semibold rounded-full transition-colors truncate max-w-[140px] ${projectFilter === ref ? "bg-foreground text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-card"}`}>
                  {projectNames[ref as string]?.split("—")[0]?.trim() || ref}
                </button>
              ))}
            </div>
          )}

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <p className="text-center py-8 text-[10px] text-muted-foreground font-body">Chargement...</p>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 px-4">
                <MessageSquare className="h-6 w-6 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-[10px] font-body text-muted-foreground">{t('ad.messages.none')}</p>
                <button onClick={() => setShowNew(true)} className="mt-2 text-[9px] font-display font-semibold text-foreground underline">
                  {t('ad.messages.startNew')}
                </button>
              </div>
            ) : (
              filtered.map((conv: any) => (
                <ConversationListItem key={conv.id} conv={conv} userId={user.id} isActive={activeConv === conv.id}
                  onClick={() => setActiveConv(conv.id)} showProject={!filterProjectRef} />
              ))
            )}
          </div>
        </div>

        {/* Main content */}
        <div className={`flex-1 ${!activeConv ? "hidden md:flex" : "flex"} flex-col`}>
          {activeConv ? (
            <InlineThread conversationId={activeConv} onBack={() => setActiveConv(null)} />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="font-display font-semibold text-xs text-muted-foreground">{t('ad.messages.selectConv')}</p>
                <button onClick={() => setShowNew(true)} className="mt-2 text-[9px] font-display font-semibold text-foreground underline">
                  {t('ad.messages.startNew')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New conversation modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background border border-border rounded-sm shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <p className="font-display font-semibold text-xs">{t('ad.messages.newConv')}</p>
              <button onClick={() => { setShowNew(false); setSelectedUser(null); setNewSearch(""); }} aria-label="Close" className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {/* Recipient */}
              <div>
                <span className={labelCls}>{t('ad.messages.recipient')}</span>
                {selectedUser ? (
                  <div className="flex items-center gap-2 bg-card border border-border rounded-sm px-3 py-2">
                    <span className="text-[11px] font-body text-foreground flex-1">
                      {[selectedUser.first_name, selectedUser.last_name].filter(Boolean).join(" ") || selectedUser.email}
                    </span>
                    <span className={`text-[8px] font-display font-semibold px-1.5 py-0.5 rounded-full ${USER_TYPE_COLOR[selectedUser.user_type] || ""}`}>
                      {USER_TYPE_LABEL[selectedUser.user_type] || selectedUser.user_type}
                    </span>
                    <button onClick={() => setSelectedUser(null)} aria-label="Close" className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <input value={newSearch} onChange={e => setNewSearch(e.target.value)} placeholder={t('ad.messages.searchUser')}
                      className={inputCls + " pl-8"} />
                    {searchedUsers.length > 0 && newSearch.length >= 2 && (
                      <div className="absolute top-full left-0 right-0 z-10 bg-background border border-border rounded-sm shadow-md mt-1 max-h-40 overflow-y-auto">
                        {searchedUsers.map((u: any) => (
                          <button key={u.id} onClick={() => { setSelectedUser(u); setNewSearch(""); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-card transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-body text-foreground truncate">{[u.first_name, u.last_name].filter(Boolean).join(" ") || u.email}</p>
                              {u.company && <p className="text-[9px] text-muted-foreground truncate">{u.company}</p>}
                            </div>
                            <span className={`text-[8px] font-display font-semibold px-1.5 py-0.5 rounded-full ${USER_TYPE_COLOR[u.user_type] || ""}`}>
                              {USER_TYPE_LABEL[u.user_type] || u.user_type}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Project link */}
              <div>
                <span className={labelCls}>{t('ad.messages.linkProject')}</span>
                <ProjectLinkerSelect
                  value={newProjectRef}
                  onChange={(val, name) => { setNewProjectRef(val); setNewProjectName(name); }}
                  className={inputCls}
                  noProjectLabel={t('ad.messages.noProject')}
                />
                </select>
              </div>
              {/* Subject */}
              <div>
                <span className={labelCls}>{t('ad.messages.subject')}</span>
                <input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder={t('ad.messages.subjectPlaceholder')} className={inputCls} />
              </div>
              {/* Message */}
              <div>
                <span className={labelCls}>{t('ad.messages.message')}</span>
                <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder={t('ad.messages.messagePlaceholder')} rows={3} className={inputCls + " resize-none"} />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
              <button onClick={() => { setShowNew(false); setSelectedUser(null); setNewSearch(""); }}
                className="px-3 py-1.5 font-display font-semibold text-[10px] border border-border rounded-full hover:border-foreground transition-colors">
                {t('ad.messages.cancel')}
              </button>
              <button onClick={handleCreateConv} disabled={!selectedUser || !newMessage.trim() || creating}
                className="flex items-center gap-1.5 px-4 py-1.5 font-display font-semibold text-[10px] bg-foreground text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-50">
                <Send className="h-3 w-3" /> {creating ? "..." : t('ad.messages.send')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── ARCHITECT REWARDS SECTION ───────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function ArchitectRewardsSection({ tier }: { tier: ArchitectTier }) {
  const { t } = useTranslation();
  const config = TIER_CONFIG[tier];
  const nextTier = tier === "studio" ? "atelier" : tier === "atelier" ? "maison" : null;
  const progress = nextTier
    ? ((MOCK_POINTS - config.threshold) / (config.nextThreshold! - config.threshold)) * 100
    : 100;

  const allTiers: ArchitectTier[] = ["studio", "atelier", "maison"];

  const benefits = [
    { key: "quotesMonth", getValue: (t: ArchitectTier) => TIER_CONFIG[t].quotesPerMonth ? `${TIER_CONFIG[t].quotesPerMonth}` : "Illimité" },
    { key: "priority", getValue: (t: ArchitectTier) => t !== "studio" },
    { key: "earlyAccess", getValue: (t: ArchitectTier) => t !== "studio" },
    { key: "samples", getValue: (t: ArchitectTier) => t === "maison" ? "3/trim." : t === "atelier" ? "1/trim." : false },
    { key: "accountManager", getValue: (t: ArchitectTier) => t === "maison" },
    { key: "cobranding", getValue: (t: ArchitectTier) => t === "maison" },
    { key: "featured", getValue: (t: ArchitectTier) => t === "maison" },
  ];

  return (
    <div className="space-y-6">
      {/* Tier banner */}
      <div
        className="rounded-sm border-2 p-5 relative overflow-hidden"
        style={{ borderColor: config.border, background: `linear-gradient(135deg, ${config.bg}, white)` }}
      >
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <TierBadge tier={tier} />
              <span className="text-sm font-display font-bold text-foreground">{MOCK_POINTS} {t('ad.rewards.points')}</span>
            </div>
            {nextTier && (
              <span className="text-[10px] font-body text-muted-foreground">
                {config.nextThreshold! - MOCK_POINTS} pts → {TIER_CONFIG[nextTier].label}
              </span>
            )}
          </div>
          <div className="w-full h-2 bg-background rounded-full overflow-hidden mb-2">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(progress, 100)}%`, background: config.color }} />
          </div>
          <div className="flex items-center justify-between text-[10px] font-body text-muted-foreground">
            <span>{config.label} — {config.threshold} pts</span>
            {nextTier && <span>{TIER_CONFIG[nextTier].label} — {config.nextThreshold} pts</span>}
          </div>
        </div>
      </div>

      {/* Coming soon: pro discount */}
      <div className="rounded-sm border border-dashed border-border p-4 bg-muted/30">
        <div className="flex items-center gap-2 mb-1.5">
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-display font-semibold text-foreground">{t('ad.rewards.comingSoonTitle')}</p>
        </div>
        <p className="text-[10px] font-body text-muted-foreground leading-relaxed">
          {t('ad.rewards.comingSoonDesc')}
        </p>
      </div>

      {/* Benefits comparison table */}
      <div>
        <p className="font-display font-bold text-sm text-foreground mb-3">{t('ad.rewards.benefits')}</p>
        <div className="border border-border rounded-sm overflow-hidden">
          <div className="grid grid-cols-4 bg-muted/50">
            <div className="p-3 text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('ad.rewards.benefit')}</div>
            {allTiers.map(t => {
              const tc = TIER_CONFIG[t];
              const Icon = tc.icon;
              const isCurrent = t === tier;
              return (
                <div key={t} className={`p-3 text-center ${isCurrent ? "bg-card" : ""}`}>
                  <div className="flex items-center justify-center gap-1">
                    <Icon className="h-3 w-3" style={{ color: tc.color }} />
                    <span className={`text-[10px] font-display font-bold uppercase tracking-wider ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                      {tc.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {benefits.map((b, i) => (
            <div key={b.key} className={`grid grid-cols-4 ${i % 2 === 0 ? "" : "bg-muted/30"}`}>
              <div className="p-3 text-[10px] font-body text-foreground">{t(`ad.rewards.b_${b.key}`)}</div>
              {allTiers.map(tierKey => {
                const val = b.getValue(tierKey);
                const isCurrent = tierKey === tier;
                const isLocked = allTiers.indexOf(tierKey) > allTiers.indexOf(tier);
                return (
                  <div key={tierKey} className={`p-3 text-center ${isCurrent ? "bg-card" : ""}`}>
                    {typeof val === "boolean" ? (
                      val ? <CheckCircle2 className="h-3.5 w-3.5 mx-auto text-green-600" /> : <Lock className="h-3.5 w-3.5 mx-auto text-muted-foreground/40" />
                    ) : (
                      <span className={`text-[10px] font-display font-semibold ${isLocked ? "text-muted-foreground/40" : "text-foreground"}`}>{val}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* How to earn */}
      <div>
        <p className="font-display font-bold text-sm text-foreground mb-3">{t('ad.rewards.howToEarn')}</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {EARNING_RULES.map((rule) => {
            const Icon = rule.icon;
            return (
              <div key={rule.action} className="border border-border rounded-sm p-3 text-center">
                <Icon className="h-4 w-4 mx-auto text-muted-foreground mb-1.5" />
                <p className="text-sm font-display font-bold text-foreground">+{rule.points}</p>
                <p className="text-[9px] font-body text-muted-foreground mt-0.5">{t(`ad.rewards.earn_${rule.action}`)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Points history */}
      <div>
        <p className="font-display font-bold text-sm text-foreground mb-3">{t('ad.rewards.history')}</p>
        <div className="space-y-1.5">
          {MOCK_POINTS_HISTORY.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between px-3 py-2.5 border border-border rounded-sm">
              <div className="flex items-center gap-2 min-w-0">
                <Award className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-body text-foreground truncate">{entry.description}</p>
                  <p className="text-[9px] font-body text-muted-foreground">{entry.date}</p>
                </div>
              </div>
              <span className="text-xs font-display font-bold text-green-700 shrink-0">+{entry.points}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
