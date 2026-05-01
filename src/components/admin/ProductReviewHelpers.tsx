import { useState } from "react";
import {
  Package, CheckCircle2, XCircle, AlertTriangle,
  Send, MessageSquare, Image, Ruler, Palette, Tag,
  Euro, Layers, Box, Shield, Globe, Truck, Weight,
  Loader2, Clock, Copy,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { computeProductQuality, type QualityReport } from "@/lib/productQualityScore";
import {
  TableSpecsSection,
  ParasolSpecsSection,
  SunLoungerSpecsSection,
  SofaSpecsSection,
  BarStoolSpecsSection,
  HighTableSpecsSection,
  type TableSpecs,
  type ParasolSpecs,
  type SunLoungerSpecs,
  type SofaSpecs,
  type BarStoolSpecs,
  type HighTableSpecs,
  type SubdivisionOption,
} from "@/components/products/specs";

// ── Re-export for convenience ──

export { computeProductQuality, type QualityReport };

// ── Feedback types ──

export type FeedbackStatus = "ok" | "needs_work" | "missing";

export interface FeedbackSection {
  status: FeedbackStatus;
  comment: string;
}

export interface AdminFeedback {
  photos: FeedbackSection;
  description: FeedbackSection;
  specs: FeedbackSection;
  pricing: FeedbackSection;
  general_comment: string;
}

export const EMPTY_FEEDBACK: AdminFeedback = {
  photos: { status: "ok", comment: "" },
  description: { status: "ok", comment: "" },
  specs: { status: "ok", comment: "" },
  pricing: { status: "ok", comment: "" },
  general_comment: "",
};

// ── Status config ──

export const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending_review: { label: "En attente", color: "bg-amber-500/10 text-amber-700 border-amber-500/20", icon: Clock },
  approved:       { label: "Approuvé", color: "bg-green-500/10 text-green-700 border-green-500/20", icon: CheckCircle2 },
  merged:         { label: "Fusionné", color: "bg-blue-500/10 text-blue-700 border-blue-500/20", icon: Copy },
  rejected:       { label: "Rejeté", color: "bg-red-500/10 text-red-700 border-red-500/20", icon: XCircle },
  feedback_sent:  { label: "Retour envoyé", color: "bg-purple-500/10 text-purple-700 border-purple-500/20", icon: MessageSquare },
};

// ── Quality Score Ring ──

export function QualityScoreRing({ score, size = "md" }: { score: number; size?: "sm" | "md" }) {
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

export function QualityReportPanel({ report }: { report: QualityReport }) {
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

export function FeedbackForm({ submissionId, partnerId, onSent }: { submissionId: string; partnerId: string; onSent: () => void }) {
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

      // Resolve partner table ID to auth user_id for notification
      const { data: partnerRow } = await supabase.from("partners").select("user_id").eq("id", partnerId).maybeSingle();
      if (partnerRow?.user_id) {
        await supabase.from("notifications").insert({
          user_id: partnerRow.user_id,
          title: "Retour sur votre soumission produit",
          body: feedback.general_comment || "Un administrateur a examiné votre soumission. Consultez le retour.",
          type: "product_feedback",
          link: "/account?section=catalogue",
        });
      }

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

// ── Status Badge ──

export function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? statusConfig.pending_review;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-display font-semibold ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

// ── Similarity Badge ──

export function SimilarityBadge({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-700 text-[10px] font-display font-semibold">
      <AlertTriangle className="h-3 w-3" />
      {Math.round(score)}% doublon
    </span>
  );
}

// ── Info Row Helper ──

export function InfoRow({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: string | number | null | undefined }) {
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

// ── Tag Pill ──

export function TagPill({ children }: { children: string }) {
  return (
    <span className="inline-block px-2 py-0.5 text-[10px] font-display font-semibold rounded-full bg-foreground/5 text-foreground/70 border border-border">
      {children}
    </span>
  );
}

// ── Boolean Feature Pill ──

export function FeaturePill({ label, active }: { label: string; active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-display font-semibold rounded-full border ${
      active ? "bg-green-50 text-green-700 border-green-200" : "bg-foreground/5 text-muted-foreground border-border"
    }`}>
      {active ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
      {label}
    </span>
  );
}

// ── Product Detail Card ──

function pdToTableSpecs(pd: Record<string, any>): TableSpecs {
  return {
    built_in_umbrella_hole: pd.built_in_umbrella_hole ?? false,
    umbrella_hole_diameter_mm: pd.umbrella_hole_diameter_mm ?? null,
    top_thickness_cm: pd.top_thickness_cm != null ? Number(pd.top_thickness_cm) : null,
    is_tippable: pd.is_tippable ?? false,
    extension_capability: pd.extension_capability ?? false,
    extension_max_length_cm: pd.extension_max_length_cm ?? null,
    outdoor_anchor_compatible: pd.outdoor_anchor_compatible ?? false,
  };
}

function pdToParasolSpecs(pd: Record<string, any>): ParasolSpecs {
  return {
    fabric_g_m2: pd.fabric_g_m2 ?? null,
    fabric_certification: pd.fabric_certification ?? "Unknown",
    min_base_weight_kg: pd.min_base_weight_kg ?? null,
    pole_diameter_mm: pd.pole_diameter_mm ?? null,
    heating_compatible: pd.heating_compatible ?? false,
    wind_beaufort_max: pd.wind_beaufort_max ?? null,
  };
}

function pdToSunLoungerSpecs(pd: Record<string, any>): SunLoungerSpecs {
  return {
    cushion_quick_dry: pd.cushion_quick_dry ?? false,
    salt_water_resistance: pd.salt_water_resistance ?? false,
    chlorine_resistance: pd.chlorine_resistance ?? false,
    sand_drainage: pd.sand_drainage ?? false,
    nesting_capacity: pd.nesting_capacity ?? null,
  };
}

function pdToSofaSpecs(pd: Record<string, any>): SofaSpecs {
  return {
    available_modules: Array.isArray(pd.available_modules) ? pd.available_modules : [],
    seat_depth_cm: pd.seat_depth_cm != null ? Number(pd.seat_depth_cm) : null,
    cushion_replacement_available: pd.cushion_replacement_available ?? false,
    acoustic_nrc: pd.acoustic_nrc != null ? Number(pd.acoustic_nrc) : null,
  };
}

function pdToBarStoolSpecs(pd: Record<string, any>): BarStoolSpecs {
  return {
    seat_height_cm: pd.seat_height_cm != null ? Number(pd.seat_height_cm) : null,
    subdivision: (pd.subdivision as SubdivisionOption) ?? "unknown",
    footrest: pd.footrest ?? false,
    swivel: pd.swivel ?? false,
  };
}

function pdToHighTableSpecs(pd: Record<string, any>): HighTableSpecs {
  return {
    table_top_height_cm: pd.table_top_height_cm != null ? Number(pd.table_top_height_cm) : null,
    subdivision: (pd.subdivision as SubdivisionOption) ?? "unknown",
  };
}

function isHighTable(pd: Record<string, any>): boolean {
  return pd.category === "tables" && typeof pd.subcategory === "string" && pd.subcategory.toLowerCase().includes("high");
}

export function ProductDetailCard({ pd, title }: { pd: Record<string, any>; title: string }) {
  const galleryUrls = (pd.gallery_urls || []) as string[];
  const allImages = [pd.image_url, ...galleryUrls].filter(Boolean);
  const styleTags = (pd.style_tags || []) as string[];
  const materialTags = (pd.material_tags || []) as string[];
  const colorVariants = (pd.available_colors || pd.color_variants || []) as string[];
  const dimensionVariants = (pd.dimension_variants || []) as { dimension_tag: string; label?: string; seats?: number; price?: number }[];
  // Modèle B variants (ÉTAPE 6c) — sérialisées dans product_data.variants
  const modelBVariants = (pd.variants || []) as Array<{
    sku?: string | null;
    width_cm?: number | null;
    depth_cm?: number | null;
    fabric_color_slug?: string | null;
    frame_finish_slug?: string | null;
    material_brand_id?: string | null;
    price_eur?: number | null;
    in_stock?: boolean;
    is_default?: boolean;
  }>;

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
          pd.price_min ? (pd.price_max ? `${pd.price_min}€ — ${pd.price_max}€` : `À partir de ${pd.price_min}€`) : null
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
          {dimensionVariants.length > 0 && (
            <div>
              <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider mb-1">Variantes dimensions</p>
              <div className="flex flex-wrap gap-1.5">
                {dimensionVariants.map((dv, i) => (
                  <span key={i} className="text-[10px] font-body px-2.5 py-1 rounded-lg border border-border bg-card">
                    <span className="font-display font-semibold">{dv.label || dv.dimension_tag?.replace(/x/g, "×")}</span>
                    {dv.seats != null && <span className="text-muted-foreground ml-1">({dv.seats} pl.)</span>}
                    {dv.price != null && <span className="text-[#D4603A] font-semibold ml-1">€{dv.price}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
       * Variantes Modèle B (chantier 2026-05) — sérialisées par
       * useProductSubmission ÉTAPE 6c dans product_data.variants. Affichage
       * read-only Phase 1 (édition admin = stretch goal Phase 2). À
       * l'approval, ces variants seront matérialisées en lignes
       * product_variants via approveAsNew Phase B (ÉTAPE 7).
       * ─────────────────────────────────────────────────────────────────── */}
      {modelBVariants.length > 0 && (
        <div className="border border-border rounded-xl p-4 bg-card/50 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3 w-3" />
              Variantes proposées ({modelBVariants.length})
            </p>
            <span className="text-[9px] font-body text-muted-foreground">
              {modelBVariants.filter((v) => v.is_default).length} marquée{modelBVariants.filter((v) => v.is_default).length > 1 ? "s" : ""} default
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-[10px] font-body">
              <thead className="border-b border-border">
                <tr className="text-left">
                  <th className="px-2 py-1.5 font-display font-semibold text-muted-foreground">SKU</th>
                  <th className="px-2 py-1.5 font-display font-semibold text-muted-foreground">L × l (cm)</th>
                  <th className="px-2 py-1.5 font-display font-semibold text-muted-foreground">Tissu</th>
                  <th className="px-2 py-1.5 font-display font-semibold text-muted-foreground">Couleur</th>
                  <th className="px-2 py-1.5 font-display font-semibold text-muted-foreground">Finition</th>
                  <th className="px-2 py-1.5 font-display font-semibold text-muted-foreground">Prix €</th>
                  <th className="px-2 py-1.5 font-display font-semibold text-muted-foreground text-center">Stock</th>
                  <th className="px-2 py-1.5 font-display font-semibold text-muted-foreground text-center">Default</th>
                </tr>
              </thead>
              <tbody>
                {modelBVariants.map((v, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-2 py-1.5 font-mono">{v.sku ?? <span className="text-muted-foreground/50">—</span>}</td>
                    <td className="px-2 py-1.5">
                      {v.width_cm != null || v.depth_cm != null
                        ? `${v.width_cm ?? "?"} × ${v.depth_cm ?? "?"}`
                        : <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-2 py-1.5 font-mono text-[9px]">
                      {v.material_brand_id
                        ? `${v.material_brand_id.slice(0, 8)}…`
                        : <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-2 py-1.5">{v.fabric_color_slug ?? <span className="text-muted-foreground/50">—</span>}</td>
                    <td className="px-2 py-1.5">{v.frame_finish_slug ?? <span className="text-muted-foreground/50">—</span>}</td>
                    <td className="px-2 py-1.5 text-[#D4603A] font-semibold">
                      {v.price_eur != null ? `${v.price_eur}` : <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {v.in_stock ? "✓" : <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {v.is_default ? <span className="text-emerald-600 font-bold">●</span> : <span className="text-muted-foreground/50">○</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[9px] font-body text-muted-foreground italic">
            Ces variantes seront matérialisées en lignes product_variants à l&apos;approbation (Phase B). Édition Phase 2.
          </p>
        </div>
      )}

      {/* Table specs — read-only display when category is Tables (chantier vocab 2026) */}
      {pd.category === "tables" && (
        <div className="border border-border rounded-xl p-4 bg-card/50">
          <TableSpecsSection
            value={pdToTableSpecs(pd)}
            onChange={() => {}}
            disabled
          />
        </div>
      )}

      {/* Parasol specs — read-only display when category is Parasols */}
      {pd.category === "parasols" && (
        <div className="border border-border rounded-xl p-4 bg-card/50">
          <ParasolSpecsSection
            value={pdToParasolSpecs(pd)}
            onChange={() => {}}
            disabled
          />
        </div>
      )}

      {/* Sun lounger specs — read-only display when category is Sun Loungers */}
      {pd.category === "loungers" && (
        <div className="border border-border rounded-xl p-4 bg-card/50">
          <SunLoungerSpecsSection
            value={pdToSunLoungerSpecs(pd)}
            onChange={() => {}}
            disabled
          />
        </div>
      )}

      {/* Sofa specs — read-only display when category is Sofas / Lounge Seating */}
      {pd.category === "sofas" && (
        <div className="border border-border rounded-xl p-4 bg-card/50">
          <SofaSpecsSection
            value={pdToSofaSpecs(pd)}
            onChange={() => {}}
            disabled
          />
        </div>
      )}

      {/* Bar stool specs — read-only display when category is Bar Stools */}
      {pd.category === "bar-stools" && (
        <div className="border border-border rounded-xl p-4 bg-card/50">
          <BarStoolSpecsSection
            value={pdToBarStoolSpecs(pd)}
            onChange={() => {}}
            disabled
          />
        </div>
      )}

      {/* High table specs — read-only display when Tables with subcategory "high" */}
      {isHighTable(pd) && (
        <div className="border border-border rounded-xl p-4 bg-card/50">
          <HighTableSpecsSection
            value={pdToHighTableSpecs(pd)}
            onChange={() => {}}
            disabled
          />
        </div>
      )}
    </div>
  );
}

// ── Description Comparison Card ──

export function DescriptionCard({ title, text, accent }: { title: string; text: string | null; accent?: string }) {
  return (
    <div className={`border rounded-xl p-4 ${accent ? `border-${accent}-200 bg-${accent}-50/30` : "border-border bg-card/50"}`}>
      <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title}</p>
      <p className="text-sm font-body text-foreground whitespace-pre-wrap leading-relaxed">{text || "—"}</p>
    </div>
  );
}
