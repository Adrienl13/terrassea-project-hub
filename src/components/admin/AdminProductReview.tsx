import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAdminSubmissions, type ProductSubmission } from "@/hooks/useProductSubmissions";
import {
  Package, Clock, CheckCircle2, XCircle, AlertTriangle,
  Copy, ChevronDown, ChevronUp, RefreshCw, Loader2,
  Send, MessageSquare, Image, Ruler, Palette, Tag,
  Euro, Layers, Box, Shield, Globe, Truck, Weight,
  ArrowRight, Eye, Sparkles, Info,
} from "lucide-react";
import { toast } from "sonner";
import { computeProductQuality, type QualityReport } from "@/lib/productQualityScore";
import type { DBProduct } from "@/lib/products";
import { supabase } from "@/integrations/supabase/client";

// ── Feedback types ──

type FeedbackStatus = "ok" | "needs_work" | "missing";

interface FeedbackSection {
  status: FeedbackStatus;
  comment: string;
}

interface AdminFeedback {
  photos: FeedbackSection;
  description: FeedbackSection;
  specs: FeedbackSection;
  pricing: FeedbackSection;
  general_comment: string;
}

const EMPTY_FEEDBACK: AdminFeedback = {
  photos: { status: "ok", comment: "" },
  description: { status: "ok", comment: "" },
  specs: { status: "ok", comment: "" },
  pricing: { status: "ok", comment: "" },
  general_comment: "",
};

// ── Quality Score Ring ──

function QualityScoreRing({ score, size = "md" }: { score: number; size?: "sm" | "md" }) {
  const isSm = size === "sm";
  const radius = isSm ? 18 : 28;
  const svgSize = isSm ? 44 : 68;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#16a34a" : score >= 50 ? "#d97706" : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={svgSize} height={svgSize} className="-rotate-90">
        <circle cx={svgSize / 2} cy={svgSize / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={isSm ? 3 : 5} className="text-muted/30" />
        <circle cx={svgSize / 2} cy={svgSize / 2} r={radius} fill="none" stroke={color} strokeWidth={isSm ? 3 : 5} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <span className={`absolute font-display font-bold ${isSm ? "text-[10px]" : "text-sm"}`} style={{ color }}>{score}</span>
    </div>
  );
}

// ── Quality Report Panel ──

function QualityReportPanel({ report }: { report: QualityReport }) {
  return (
    <div className="border border-border rounded-xl p-5 bg-card/50">
      <div className="flex items-start gap-4">
        <QualityScoreRing score={report.score} />
        <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-3 gap-4">
          {report.strengths.length > 0 && (
            <div>
              <p className="text-[10px] font-display font-semibold text-green-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Points forts
              </p>
              <ul className="space-y-1">
                {report.strengths.map((s, i) => (
                  <li key={i} className="text-[11px] font-body text-green-700/80">{s}</li>
                ))}
              </ul>
            </div>
          )}
          {report.suggestions.length > 0 && (
            <div>
              <p className="text-[10px] font-display font-semibold text-amber-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> À améliorer
              </p>
              <ul className="space-y-1">
                {report.suggestions.map((s, i) => (
                  <li key={i} className="text-[11px] font-body text-amber-700/80">{s}</li>
                ))}
              </ul>
            </div>
          )}
          {report.missingFields.length > 0 && (
            <div>
              <p className="text-[10px] font-display font-semibold text-red-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <XCircle className="h-3 w-3" /> Manquant
              </p>
              <ul className="space-y-1">
                {report.missingFields.map((s, i) => (
                  <li key={i} className="text-[11px] font-body text-red-700/80">{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Feedback Form ──

function FeedbackForm({ submissionId, partnerId, onSent }: { submissionId: string; partnerId: string; onSent: () => void }) {
  const [feedback, setFeedback] = useState<AdminFeedback>(EMPTY_FEEDBACK);
  const [sending, setSending] = useState(false);

  const sections: { key: keyof Omit<AdminFeedback, "general_comment">; label: string; icon: typeof Image }[] = [
    { key: "photos", label: "Photos", icon: Image },
    { key: "description", label: "Description", icon: MessageSquare },
    { key: "specs", label: "Spécifications", icon: Ruler },
    { key: "pricing", label: "Tarification", icon: Euro },
  ];

  const statusOptions: { value: FeedbackStatus; label: string; color: string }[] = [
    { value: "ok", label: "OK", color: "text-green-700 bg-green-50 border-green-200" },
    { value: "needs_work", label: "À améliorer", color: "text-amber-700 bg-amber-50 border-amber-200" },
    { value: "missing", label: "Manquant", color: "text-red-700 bg-red-50 border-red-200" },
  ];

  const updateSection = (key: keyof Omit<AdminFeedback, "general_comment">, field: keyof FeedbackSection, value: string) => {
    setFeedback((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const { error } = await supabase
        .from("product_submissions")
        .update({
          admin_feedback: feedback as unknown as Record<string, unknown>,
          feedback_sent_at: new Date().toISOString(),
          status: "feedback_sent",
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq("id", submissionId);
      if (error) throw error;

      await supabase.from("notifications").insert({
        user_id: partnerId,
        title: "Retour sur votre soumission produit",
        body: feedback.general_comment || "Un administrateur a examiné votre soumission. Consultez le retour.",
        type: "product_feedback",
        link: "/account?section=catalogue",
      } as Record<string, unknown>);

      toast.success("Retour envoyé au partenaire");
      onSent();
    } catch (err: unknown) {
      toast.error(`Erreur : ${err instanceof Error ? err.message : "Inconnue"}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border border-border rounded-xl p-5 bg-card/50 space-y-5">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-foreground" />
        <p className="text-xs font-display font-bold text-foreground uppercase tracking-wider">Retour au partenaire</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map(({ key, label, icon: Icon }) => (
          <div key={key} className="border border-border rounded-lg p-3 space-y-2.5">
            <div className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-display font-semibold text-foreground">{label}</p>
            </div>
            <div className="flex gap-1.5">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateSection(key, "status", opt.value)}
                  className={`px-2.5 py-1 text-[10px] font-display font-semibold rounded-full border transition-all ${
                    feedback[key].status === opt.value ? opt.color : "border-border text-muted-foreground hover:border-foreground/30"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <textarea
              value={feedback[key].comment}
              onChange={(e) => updateSection(key, "comment", e.target.value)}
              rows={1}
              placeholder="Commentaire..."
              className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-body focus:outline-none focus:border-foreground/40 resize-none"
            />
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs font-display font-semibold text-foreground mb-1.5">Commentaire général</p>
        <textarea
          value={feedback.general_comment}
          onChange={(e) => setFeedback((prev) => ({ ...prev, general_comment: e.target.value }))}
          rows={2}
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:border-foreground/40 resize-none"
          placeholder="Retour global pour le partenaire..."
        />
      </div>

      <button
        onClick={handleSend}
        disabled={sending}
        className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-display font-semibold rounded-lg bg-foreground text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all"
      >
        {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        Envoyer le retour
      </button>
    </div>
  );
}

// ── Status badge ──

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending_review: { label: "En attente", color: "bg-amber-500/10 text-amber-700 border-amber-500/20", icon: Clock },
  approved:       { label: "Approuvé", color: "bg-green-500/10 text-green-700 border-green-500/20", icon: CheckCircle2 },
  merged:         { label: "Fusionné", color: "bg-blue-500/10 text-blue-700 border-blue-500/20", icon: Copy },
  rejected:       { label: "Rejeté", color: "bg-red-500/10 text-red-700 border-red-500/20", icon: XCircle },
  feedback_sent:  { label: "Retour envoyé", color: "bg-purple-500/10 text-purple-700 border-purple-500/20", icon: MessageSquare },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? statusConfig.pending_review;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-display font-semibold ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function SimilarityBadge({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-700 text-[10px] font-display font-semibold">
      <AlertTriangle className="h-3 w-3" />
      {Math.round(score)}% doublon
    </span>
  );
}

// ── Info row helper ──

function InfoRow({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: string | number | null | undefined }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm font-body text-foreground">{String(value)}</p>
      </div>
    </div>
  );
}

// ── Tag pill ──

function TagPill({ children }: { children: string }) {
  return (
    <span className="inline-block px-2 py-0.5 text-[10px] font-display font-semibold rounded-full bg-foreground/5 text-foreground/70 border border-border">
      {children}
    </span>
  );
}

// ── Boolean feature pill ──

function FeaturePill({ label, active }: { label: string; active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-display font-semibold rounded-full border ${
      active ? "bg-green-50 text-green-700 border-green-200" : "bg-foreground/5 text-muted-foreground border-border"
    }`}>
      {active ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
      {label}
    </span>
  );
}

// ── Filter tabs ──

type FilterTab = "all" | "pending_review" | "duplicates" | "approved" | "rejected";
const TABS: FilterTab[] = ["all", "pending_review", "duplicates", "approved", "rejected"];

// ── Product Detail Card ──

function ProductDetailCard({ pd, title }: { pd: Record<string, any>; title: string }) {
  const galleryUrls = (pd.gallery_urls || []) as string[];
  const allImages = [pd.image_url, ...galleryUrls].filter(Boolean);
  const styleTags = (pd.style_tags || []) as string[];
  const materialTags = (pd.material_tags || []) as string[];
  const colorVariants = (pd.available_colors || pd.color_variants || []) as string[];

  return (
    <div className="space-y-5">
      <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </p>

      {/* Image gallery */}
      {allImages.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {allImages.map((url: string, i: number) => (
            <img
              key={i}
              src={url}
              alt=""
              className={`rounded-xl border border-border object-cover shrink-0 ${
                i === 0 ? "w-48 h-48" : "w-24 h-24"
              }`}
            />
          ))}
          {allImages.length === 0 && (
            <div className="w-48 h-48 rounded-xl bg-foreground/5 border border-dashed border-border flex flex-col items-center justify-center">
              <Image className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-[10px] font-body text-muted-foreground/50 mt-1">Aucune photo</p>
            </div>
          )}
        </div>
      )}

      {/* Main info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 border border-border rounded-xl p-4 bg-card/50">
        <InfoRow icon={Package} label="Nom" value={pd.name} />
        <InfoRow icon={Layers} label="Catégorie" value={[pd.category, pd.subcategory].filter(Boolean).join(" → ")} />
        <InfoRow icon={Palette} label="Couleur principale" value={pd.main_color} />
        <InfoRow icon={Palette} label="Couleur secondaire" value={pd.secondary_color} />
        <InfoRow icon={Box} label="Structure" value={pd.material_structure} />
        <InfoRow icon={Box} label="Assise" value={pd.material_seat} />
        <InfoRow icon={Ruler} label="Dimensions (L×l×H)" value={
          pd.dimensions_length_cm ? `${pd.dimensions_length_cm} × ${pd.dimensions_width_cm} × ${pd.dimensions_height_cm} cm` : null
        } />
        <InfoRow icon={Ruler} label="Hauteur assise" value={pd.seat_height_cm ? `${pd.seat_height_cm} cm` : null} />
        <InfoRow icon={Weight} label="Poids" value={pd.weight_kg ? `${pd.weight_kg} kg` : null} />
        <InfoRow icon={Euro} label="Prix indicatif" value={pd.indicative_price} />
        <InfoRow icon={Euro} label="Fourchette prix" value={
          pd.price_min ? `${pd.price_min}€ — ${pd.price_max ?? "?"}€` : null
        } />
        <InfoRow icon={Truck} label="Délai livraison" value={pd.estimated_delivery_days ? `${pd.estimated_delivery_days} jours` : null} />
        <InfoRow icon={Globe} label="Pays fabrication" value={pd.country_of_manufacture} />
        <InfoRow icon={Shield} label="Garantie" value={pd.warranty} />
        <InfoRow icon={Tag} label="Collection" value={pd.collection} />
        <InfoRow icon={Tag} label="Famille" value={pd.product_family} />
      </div>

      {/* Description */}
      {(pd.short_description || pd.long_description) && (
        <div className="border border-border rounded-xl p-4 bg-card/50">
          {pd.short_description && (
            <div className="mb-3">
              <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description courte</p>
              <p className="text-sm font-body text-foreground">{pd.short_description}</p>
            </div>
          )}
          {pd.long_description && (
            <div>
              <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description longue</p>
              <p className="text-sm font-body text-foreground whitespace-pre-wrap leading-relaxed">{pd.long_description}</p>
            </div>
          )}
        </div>
      )}

      {/* Features */}
      <div className="flex flex-wrap gap-1.5">
        <FeaturePill label="Outdoor" active={!!pd.is_outdoor} />
        <FeaturePill label="Empilable" active={!!pd.is_stackable} />
        <FeaturePill label="CHR Intensif" active={!!pd.is_chr_heavy_use} />
        <FeaturePill label="Anti-UV" active={!!pd.uv_resistant} />
        <FeaturePill label="Résistant intempéries" active={!!pd.weather_resistant} />
        <FeaturePill label="Anti-feu" active={!!pd.fire_retardant} />
        <FeaturePill label="Léger" active={!!pd.lightweight} />
        <FeaturePill label="Entretien facile" active={!!pd.easy_maintenance} />
        <FeaturePill label="Personnalisable" active={!!pd.customizable} />
        <FeaturePill label="Démontable" active={!!pd.dismountable} />
      </div>

      {/* Tags */}
      {(styleTags.length > 0 || materialTags.length > 0 || colorVariants.length > 0) && (
        <div className="space-y-2">
          {styleTags.length > 0 && (
            <div>
              <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider mb-1">Style</p>
              <div className="flex flex-wrap gap-1">{styleTags.map((t, i) => <TagPill key={i}>{t}</TagPill>)}</div>
            </div>
          )}
          {materialTags.length > 0 && (
            <div>
              <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider mb-1">Matériaux</p>
              <div className="flex flex-wrap gap-1">{materialTags.map((t, i) => <TagPill key={i}>{t}</TagPill>)}</div>
            </div>
          )}
          {colorVariants.length > 0 && (
            <div>
              <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider mb-1">Variantes couleur</p>
              <div className="flex flex-wrap gap-1">{colorVariants.map((c, i) => <TagPill key={i}>{String(c)}</TagPill>)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Description comparison card ──

function DescriptionCard({ title, text, accent }: { title: string; text: string | null; accent?: string }) {
  return (
    <div className={`border rounded-xl p-4 ${accent ? `border-${accent}-200 bg-${accent}-50/30` : "border-border bg-card/50"}`}>
      <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title}</p>
      <p className="text-sm font-body text-foreground whitespace-pre-wrap leading-relaxed">{text || "—"}</p>
    </div>
  );
}

// ── Main component ──

export default function AdminProductReview() {
  const { t } = useTranslation();
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState<Record<string, string>>({});
  const [showFeedbackForm, setShowFeedbackForm] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const {
    submissions,
    isLoading,
    approveAsNew,
    approveAsMerge,
    reject,
    regenerateMerge,
  } = useAdminSubmissions();

  const filtered = submissions.filter((s) => {
    if (filterTab === "all") return true;
    if (filterTab === "duplicates") return s.detected_duplicate_id != null;
    return s.status === filterTab;
  });

  const pendingCount = submissions.filter((s) => s.status === "pending_review").length;

  const handleAction = async (action: () => Promise<void>, label: string) => {
    try {
      await action();
      toast.success(`${label} effectué`);
    } catch (err: unknown) {
      toast.error(`${label} échoué : ${err instanceof Error ? err.message : "Erreur inconnue"}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getProductData = (s: ProductSubmission) => s.product_data as Record<string, any>;

  const tabLabels: Record<FilterTab, string> = {
    all: "Tous",
    pending_review: "En attente",
    duplicates: "Doublons",
    approved: "Approuvés",
    rejected: "Rejetés",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            <Package className="h-5 w-5" />
            Soumissions produits
          </h2>
          {pendingCount > 0 && (
            <p className="text-xs font-body text-amber-600 mt-0.5 font-medium">
              {pendingCount} soumission{pendingCount > 1 ? "s" : ""} en attente de validation
            </p>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => {
          const count = tab === "all"
            ? submissions.length
            : tab === "duplicates"
            ? submissions.filter((s) => s.detected_duplicate_id != null).length
            : submissions.filter((s) => s.status === tab).length;

          return (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-4 py-2.5 text-xs font-display font-semibold border-b-2 -mb-px transition-colors ${
                filterTab === tab
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tabLabels[tab]}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] ${
                filterTab === tab ? "bg-foreground text-primary-foreground" : "bg-foreground/10 text-muted-foreground"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="w-14 h-14 mx-auto rounded-full bg-foreground/5 flex items-center justify-center mb-3">
            <Package className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-body text-muted-foreground">Aucune soumission trouvée</p>
        </div>
      )}

      {/* Submission list */}
      <div className="space-y-4">
        {filtered.map((s) => {
          const pd = getProductData(s);
          const isExpanded = expandedId === s.id;
          const qualityReport = computeProductQuality(pd as Partial<DBProduct>);
          const partnerName = (s as any).partner?.name ?? s.partner_id;
          const submittedDate = s.created_at ? new Date(s.created_at).toLocaleDateString("fr-FR", {
            day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
          }) : "—";

          return (
            <div key={s.id} className={`border rounded-2xl overflow-hidden transition-all ${
              isExpanded ? "border-foreground/20 shadow-lg" : "border-border bg-card hover:border-foreground/10"
            }`}>
              {/* Card header — summary row */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : s.id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors"
              >
                {/* Product thumbnail */}
                {pd.image_url ? (
                  <img src={pd.image_url} alt="" className="w-14 h-14 rounded-xl object-cover border border-border shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0">
                    <Package className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                )}

                {/* Product name + meta */}
                <div className="flex-1 min-w-0">
                  <p className="font-display text-sm font-bold text-foreground truncate">
                    {pd.name ?? "Produit sans nom"}
                  </p>
                  <p className="text-[11px] font-body text-muted-foreground mt-0.5">
                    {pd.category && <span className="text-foreground/60">{pd.category}</span>}
                    {pd.category && " · "}
                    Par <span className="font-medium">{partnerName}</span> · {submittedDate}
                  </p>
                </div>

                {/* Right side: quality score + badges */}
                <div className="flex items-center gap-3 shrink-0">
                  <QualityScoreRing score={qualityReport.score} size="sm" />
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={s.status} />
                    {s.similarity_score != null && s.similarity_score > 0 && (
                      <SimilarityBadge score={s.similarity_score} />
                    )}
                  </div>
                  <div className="ml-1">
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              </button>

              {/* Expanded detail panel */}
              {isExpanded && (
                <div className="border-t border-border bg-background">
                  {/* Product detail section */}
                  <div className="px-6 py-6 space-y-6">
                    {/* Two-column for duplicates, single for new */}
                    <div className={`grid gap-8 ${s.detected_duplicate_id ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
                      <ProductDetailCard pd={pd} title="Produit soumis" />

                      {s.detected_duplicate_id && (
                        <div className="space-y-5">
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider">
                              Produit existant (doublon détecté)
                            </p>
                            <SimilarityBadge score={s.similarity_score!} />
                          </div>

                          <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-4">
                            <div className="flex items-start gap-2 text-amber-700">
                              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs font-display font-semibold">Doublon potentiel détecté</p>
                                <p className="text-[11px] font-body mt-0.5">
                                  Ce produit a un score de similarité de {Math.round(s.similarity_score!)}% avec un produit existant.
                                  Vous pouvez l'approuver comme nouveau produit ou le fusionner.
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Merged description preview */}
                          {s.merged_description && (
                            <div className="border border-blue-200 bg-blue-50/30 rounded-xl p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                                <p className="text-[10px] font-display font-semibold text-blue-700 uppercase tracking-wider">
                                  Description fusionnée (IA)
                                </p>
                              </div>
                              <p className="text-sm font-body text-foreground whitespace-pre-wrap leading-relaxed">
                                {s.merged_description}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quality analysis */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="h-4 w-4 text-foreground" />
                        <p className="text-xs font-display font-bold text-foreground uppercase tracking-wider">Analyse qualité</p>
                      </div>
                      <QualityReportPanel report={qualityReport} />
                    </div>

                    {/* Feedback form */}
                    {showFeedbackForm === s.id ? (
                      <FeedbackForm
                        submissionId={s.id}
                        partnerId={s.partner_id}
                        onSent={() => setShowFeedbackForm(null)}
                      />
                    ) : (
                      <button
                        onClick={() => setShowFeedbackForm(s.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-display font-semibold rounded-lg border border-border text-foreground hover:bg-foreground/5 transition-colors"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Envoyer un retour au partenaire
                      </button>
                    )}

                    {/* Rejection notes input */}
                    {s.status === "pending_review" && (
                      <div>
                        <label className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                          Notes de rejet (requis pour rejeter)
                        </label>
                        <textarea
                          value={rejectionNotes[s.id] ?? ""}
                          onChange={(e) => setRejectionNotes((prev) => ({ ...prev, [s.id]: e.target.value }))}
                          rows={2}
                          className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm font-body focus:outline-none focus:border-foreground/40 resize-none"
                          placeholder="Motif de rejet..."
                        />
                      </div>
                    )}

                    {/* Actions */}
                    {s.status === "pending_review" && (
                      <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border">
                        <button
                          disabled={actionLoading === s.id}
                          onClick={() => {
                            setActionLoading(s.id);
                            handleAction(() => approveAsNew(s.id), "Approbation");
                          }}
                          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-display font-bold rounded-xl bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Approuver comme nouveau produit
                        </button>

                        {s.detected_duplicate_id && (
                          <>
                            <button
                              disabled={actionLoading === s.id}
                              onClick={() => {
                                setActionLoading(s.id);
                                handleAction(() => approveAsMerge(s.id), "Fusion");
                              }}
                              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-display font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                            >
                              <Copy className="h-4 w-4" />
                              Fusionner avec l'existant
                            </button>

                            <button
                              disabled={actionLoading === s.id}
                              onClick={() => {
                                setActionLoading(s.id);
                                handleAction(() => regenerateMerge(s.id), "Régénération");
                              }}
                              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-display font-semibold rounded-xl border border-border text-foreground hover:bg-foreground/5 disabled:opacity-50 transition-colors"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              Régénérer la fusion IA
                            </button>
                          </>
                        )}

                        <button
                          disabled={actionLoading === s.id || !(rejectionNotes[s.id]?.trim())}
                          onClick={() => {
                            setActionLoading(s.id);
                            handleAction(() => reject(s.id, rejectionNotes[s.id] ?? ""), "Rejet");
                          }}
                          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-display font-bold rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
                        >
                          <XCircle className="h-4 w-4" />
                          Rejeter
                        </button>

                        {actionLoading === s.id && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
