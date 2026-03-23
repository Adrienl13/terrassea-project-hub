import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAdminSubmissions, type ProductSubmission } from "@/hooks/useProductSubmissions";
import {
  Package, Clock, CheckCircle2, XCircle, AlertTriangle,
  Copy, ChevronDown, ChevronUp, RefreshCw, Loader2,
  Send, MessageSquare,
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

function QualityScoreRing({ score }: { score: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#16a34a" : score >= 50 ? "#d97706" : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="68" height="68" className="-rotate-90">
        <circle cx="34" cy="34" r={radius} fill="none" stroke="currentColor" strokeWidth="5" className="text-muted/30" />
        <circle cx="34" cy="34" r={radius} fill="none" stroke={color} strokeWidth="5" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <span className="absolute text-sm font-display font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

// ── Quality Report Panel ──

function QualityReportPanel({ report }: { report: QualityReport }) {
  const { t } = useTranslation();
  return (
    <div className="border border-border rounded-xl p-4 space-y-4">
      <div className="flex items-start gap-4">
        <QualityScoreRing score={report.score} />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t("adminReview.qualityScore", "Quality Score")}
          </p>
          {report.strengths.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] font-display font-semibold text-green-700 uppercase tracking-wider mb-1">
                {t("adminReview.strengths", "Points forts")}
              </p>
              <ul className="space-y-0.5">
                {report.strengths.map((s, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-[11px] font-body text-green-700">
                    <CheckCircle2 className="h-3 w-3 shrink-0" /> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {report.suggestions.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] font-display font-semibold text-amber-700 uppercase tracking-wider mb-1">
                {t("adminReview.toImprove", "A ameliorer")}
              </p>
              <ul className="space-y-0.5">
                {report.suggestions.map((s, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-[11px] font-body text-amber-700">
                    <AlertTriangle className="h-3 w-3 shrink-0" /> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {report.missingFields.length > 0 && (
            <div>
              <p className="text-[10px] font-display font-semibold text-red-700 uppercase tracking-wider mb-1">
                {t("adminReview.missingFields", "Champs manquants")}
              </p>
              <ul className="space-y-0.5">
                {report.missingFields.map((s, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-[11px] font-body text-red-700">
                    <XCircle className="h-3 w-3 shrink-0" /> {s}
                  </li>
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
  const { t } = useTranslation();
  const [feedback, setFeedback] = useState<AdminFeedback>(EMPTY_FEEDBACK);
  const [sending, setSending] = useState(false);

  const sections: { key: keyof Omit<AdminFeedback, "general_comment">; label: string }[] = [
    { key: "photos", label: t("adminReview.feedback.photos", "Photos") },
    { key: "description", label: t("adminReview.feedback.description", "Description") },
    { key: "specs", label: t("adminReview.feedback.specs", "Specifications") },
    { key: "pricing", label: t("adminReview.feedback.pricing", "Pricing") },
  ];

  const statusOptions: { value: FeedbackStatus; label: string; color: string }[] = [
    { value: "ok", label: "OK", color: "text-green-700 bg-green-50 border-green-200" },
    { value: "needs_work", label: t("adminReview.feedback.needsWork", "A ameliorer"), color: "text-amber-700 bg-amber-50 border-amber-200" },
    { value: "missing", label: t("adminReview.feedback.missing", "Manquant"), color: "text-red-700 bg-red-50 border-red-200" },
  ];

  const updateSection = (key: keyof Omit<AdminFeedback, "general_comment">, field: keyof FeedbackSection, value: string) => {
    setFeedback((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
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

      // Notify partner
      await supabase.from("notifications").insert({
        user_id: partnerId,
        title: t("adminReview.feedback.notifTitle", "Feedback on your product submission"),
        body: feedback.general_comment || t("adminReview.feedback.notifBody", "An admin has reviewed your submission. Please check the feedback."),
        type: "product_feedback",
        link: "/account?section=catalogue",
      } as Record<string, unknown>);

      toast.success(t("adminReview.feedback.sent", "Feedback sent to partner"));
      onSent();
    } catch (err: unknown) {
      toast.error(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border border-border rounded-xl p-4 space-y-4">
      <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider">
        {t("adminReview.feedback.title", "Feedback to partner")}
      </p>

      {sections.map(({ key, label }) => (
        <div key={key} className="space-y-2">
          <p className="text-xs font-display font-semibold text-foreground">{label}</p>
          <div className="flex gap-2">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateSection(key, "status", opt.value)}
                className={`px-3 py-1 text-[10px] font-display font-semibold rounded-full border transition-all ${
                  feedback[key].status === opt.value ? opt.color : "border-border text-muted-foreground"
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
            placeholder={t("adminReview.feedback.commentPlaceholder", "Comment (optional)...")}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:border-foreground/40 resize-none"
          />
        </div>
      ))}

      <div>
        <p className="text-xs font-display font-semibold text-foreground mb-1">
          {t("adminReview.feedback.generalComment", "General comment")}
        </p>
        <textarea
          value={feedback.general_comment}
          onChange={(e) => setFeedback((prev) => ({ ...prev, general_comment: e.target.value }))}
          rows={2}
          className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:border-foreground/40 resize-none"
          placeholder={t("adminReview.feedback.generalPlaceholder", "General feedback for the partner...")}
        />
      </div>

      <button
        onClick={handleSend}
        disabled={sending}
        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-display font-semibold rounded-lg bg-foreground text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all"
      >
        {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        {t("adminReview.feedback.send", "Envoyer le retour")}
      </button>
    </div>
  );
}

// ── Status badge ──

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending_review: { label: "pending", color: "bg-amber-500/10 text-amber-700 border-amber-500/20", icon: Clock },
  approved:       { label: "approved", color: "bg-green-500/10 text-green-700 border-green-500/20", icon: CheckCircle2 },
  merged:         { label: "merged", color: "bg-blue-500/10 text-blue-700 border-blue-500/20", icon: Copy },
  rejected:       { label: "rejected", color: "bg-red-500/10 text-red-700 border-red-500/20", icon: XCircle },
  feedback_sent:  { label: "feedback sent", color: "bg-purple-500/10 text-purple-700 border-purple-500/20", icon: MessageSquare },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? statusConfig.pending_review;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-display font-semibold ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function SimilarityBadge({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-700 text-[10px] font-display font-semibold">
      <AlertTriangle className="h-3 w-3" />
      {Math.round(score)}% match
    </span>
  );
}

// ── Filter tabs ──

type FilterTab = "all" | "pending_review" | "duplicates" | "approved" | "rejected";

const TABS: FilterTab[] = ["all", "pending_review", "duplicates", "approved", "rejected"];

// ── Description card ──

function DescriptionCard({ title, text }: { title: string; text: string | null }) {
  return (
    <div className="border border-border rounded-xl p-4">
      <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title}</p>
      <p className="text-sm font-body text-foreground whitespace-pre-wrap">{text || "—"}</p>
    </div>
  );
}

// ── Main component ──

export default function AdminProductReview() {
  const { t } = useTranslation();
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState<Record<string, string>>({});
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
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

  // Filter submissions
  const filtered = submissions.filter((s) => {
    if (filterTab === "all") return true;
    if (filterTab === "duplicates") return s.detected_duplicate_id != null;
    return s.status === filterTab;
  });

  const pendingCount = submissions.filter((s) => s.status === "pending_review").length;

  const handleAction = async (action: () => Promise<void>, label: string) => {
    try {
      await action();
    } catch (err: unknown) {
      toast.error(`${label} failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getProductData = (s: ProductSubmission) => s.product_data as Record<string, any>;

  const tabLabels: Record<FilterTab, string> = {
    all: t("adminReview.all", "Tous"),
    pending_review: t("adminReview.pending", "En attente"),
    duplicates: t("adminReview.duplicates", "Doublons"),
    approved: t("adminReview.approved", "Approuvés"),
    rejected: t("adminReview.rejected", "Rejetés"),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t("adminReview.title", "Product Submissions")}
          </h2>
          {pendingCount > 0 && (
            <p className="text-xs font-body text-muted-foreground mt-0.5">
              {pendingCount} {t("adminReview.pending", "pending")}
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
              className={`px-4 py-2 text-xs font-display font-semibold border-b-2 -mb-px transition-colors ${
                filterTab === tab
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tabLabels[tab]} ({count})
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-12 text-sm text-muted-foreground font-body">
          {t("adminReview.noSubmissions", "No submissions found.")}
        </div>
      )}

      {/* Submission list */}
      <div className="space-y-3">
        {filtered.map((s) => {
          const pd = getProductData(s);
          const isExpanded = expandedId === s.id;
          const partnerName = (s as any).partner?.name ?? s.partner_id;

          return (
            <div key={s.id} className="border border-border rounded-xl bg-card overflow-hidden">
              {/* Card header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : s.id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-foreground/[0.02] transition-colors"
              >
                {/* Product image thumbnail */}
                {pd.image_url ? (
                  <img src={pd.image_url} alt="" className="w-12 h-12 rounded-lg object-cover border border-border" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-foreground/5 flex items-center justify-center">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-display text-sm font-semibold text-foreground truncate">
                    {pd.name ?? "Unnamed Product"}
                  </p>
                  <p className="text-[11px] font-body text-muted-foreground">
                    {t("adminReview.submittedBy", "Submitted by")} {partnerName} &middot;{" "}
                    {s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={s.status} />
                  {s.similarity_score != null && s.similarity_score > 0 && (
                    <SimilarityBadge score={s.similarity_score} />
                  )}
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {/* Expanded review panel */}
              {isExpanded && (
                <div className="border-t border-border px-5 py-5 space-y-6">
                  {/* Two-column layout: submitted vs existing */}
                  <div className={`grid gap-6 ${s.detected_duplicate_id ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
                    {/* Left: submitted product */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider">
                        {t("adminReview.submittedProduct", "Submitted Product")}
                      </p>
                      {pd.image_url && (
                        <img src={pd.image_url} alt="" className="w-full max-w-xs rounded-xl border border-border" />
                      )}
                      <div className="space-y-1 text-sm font-body">
                        <p><span className="text-muted-foreground">Name:</span> {pd.name}</p>
                        <p><span className="text-muted-foreground">Category:</span> {pd.category}</p>
                        <p><span className="text-muted-foreground">Description:</span> {pd.long_description ?? pd.short_description ?? "—"}</p>
                        {pd.indicative_price && <p><span className="text-muted-foreground">Price:</span> {pd.indicative_price}</p>}
                        {pd.material_structure && <p><span className="text-muted-foreground">Material:</span> {pd.material_structure}</p>}
                        {pd.dimensions_length_cm && (
                          <p><span className="text-muted-foreground">Dimensions:</span> {pd.dimensions_length_cm}×{pd.dimensions_width_cm}×{pd.dimensions_height_cm} cm</p>
                        )}
                      </div>
                    </div>

                    {/* Right: existing product (if duplicate) */}
                    {s.detected_duplicate_id && (
                      <div className="space-y-3">
                        <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider">
                          {t("adminReview.existingProduct", "Existing Product (Duplicate)")}
                        </p>
                        {(s as any).duplicate_product?.image_url && (
                          <img src={(s as any).duplicate_product.image_url} alt="" className="w-full max-w-xs rounded-xl border border-border" />
                        )}
                        <div className="space-y-1 text-sm font-body">
                          <p><span className="text-muted-foreground">Name:</span> {(s as any).duplicate_product?.name ?? "—"}</p>
                          <p><span className="text-muted-foreground">Category:</span> {(s as any).duplicate_product?.category ?? "—"}</p>
                          <p><span className="text-muted-foreground">Description:</span> {(s as any).duplicate_product?.long_description ?? "—"}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Description comparison (if duplicate) */}
                  {s.detected_duplicate_id && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider">
                        {t("adminReview.descriptionComparison", "Description Comparison")}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <DescriptionCard
                          title={t("adminReview.existingDescription", "Description existante")}
                          text={(s as any).duplicate_product?.long_description ?? s.existing_description}
                        />
                        <DescriptionCard
                          title={t("adminReview.newDescription", "Nouvelle description")}
                          text={pd.long_description ?? pd.short_description ?? s.original_description}
                        />
                        <DescriptionCard
                          title={t("adminReview.mergedDescription", "Description fusionnée (IA)")}
                          text={s.merged_description}
                        />
                      </div>
                    </div>
                  )}

                  {/* Quality Score */}
                  <QualityReportPanel report={computeProductQuality(pd as Partial<DBProduct>)} />

                  {/* Feedback form */}
                  {showFeedbackForm === s.id ? (
                    <FeedbackForm
                      submissionId={s.id}
                      partnerId={s.partner_id}
                      onSent={() => {
                        setShowFeedbackForm(null);
                        // Refresh submissions
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => setShowFeedbackForm(s.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-display font-semibold rounded-lg border border-border text-foreground hover:bg-foreground/5 transition-colors"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      {t("adminReview.sendFeedback", "Envoyer un retour")}
                    </button>
                  )}

                  {/* Admin notes */}
                  <div>
                    <label className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      {t("adminReview.adminNotes", "Admin Notes")}
                    </label>
                    <textarea
                      value={adminNotes[s.id] ?? s.admin_notes ?? ""}
                      onChange={(e) => setAdminNotes((prev) => ({ ...prev, [s.id]: e.target.value }))}
                      rows={2}
                      className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:border-foreground/40 resize-none"
                      placeholder={t("adminReview.adminNotesPlaceholder", "Internal notes...")}
                    />
                  </div>

                  {/* Rejection notes (only for reject action) */}
                  <div>
                    <label className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      {t("adminReview.rejectionNotes", "Rejection Notes")}
                    </label>
                    <textarea
                      value={rejectionNotes[s.id] ?? ""}
                      onChange={(e) => setRejectionNotes((prev) => ({ ...prev, [s.id]: e.target.value }))}
                      rows={2}
                      className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:border-foreground/40 resize-none"
                      placeholder={t("adminReview.rejectionNotesPlaceholder", "Reason for rejection (optional)...")}
                    />
                  </div>

                  {/* Actions row */}
                  {s.status === "pending_review" && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                      {/* Approve as new */}
                      <button
                        disabled={actionLoading === s.id}
                        onClick={() => {
                          setActionLoading(s.id);
                          handleAction(() => approveAsNew(s.id), t("adminReview.approveNew", "Approve"));
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-display font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t("adminReview.approveNew", "Approuver comme nouveau produit")}
                      </button>

                      {/* Merge with existing (only if duplicate) */}
                      {s.detected_duplicate_id && (
                        <button
                          disabled={actionLoading === s.id}
                          onClick={() => {
                            setActionLoading(s.id);
                            handleAction(() => approveAsMerge(s.id), t("adminReview.mergeExisting", "Merge"));
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-display font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          {t("adminReview.mergeExisting", "Fusionner avec l'existant")}
                        </button>
                      )}

                      {/* Regenerate merge (only if duplicate) */}
                      {s.detected_duplicate_id && (
                        <button
                          disabled={actionLoading === s.id}
                          onClick={() => {
                            setActionLoading(s.id);
                            handleAction(() => regenerateMerge(s.id), t("adminReview.regenerate", "Regenerate"));
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-display font-semibold rounded-lg bg-foreground/10 text-foreground hover:bg-foreground/20 disabled:opacity-50 transition-colors"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          {t("adminReview.regenerate", "Régénérer la fusion")}
                        </button>
                      )}

                      {/* Reject */}
                      <button
                        disabled={actionLoading === s.id}
                        onClick={() => {
                          setActionLoading(s.id);
                          handleAction(
                            () => reject(s.id, rejectionNotes[s.id] ?? ""),
                            t("adminReview.reject", "Reject")
                          );
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-display font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        {t("adminReview.reject", "Rejeter")}
                      </button>

                      {actionLoading === s.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground self-center" />}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
