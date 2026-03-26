import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, Building2, FolderOpen, User, ChevronRight, ChevronLeft, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { DBProduct } from "@/lib/products";
import type { ProductOffer } from "@/lib/productOffers";

interface ProjectBriefModalProps {
  open: boolean;
  onClose: () => void;
  product: DBProduct;
  offer: ProductOffer;
}

// ── SIREN lookup (same as QuoteRequestModal) ─────────────────────────────────

interface SirenResult { companyName: string; address: string; }

async function lookupSiren(siren: string): Promise<SirenResult | null> {
  try {
    const res = await fetch(
      `https://recherche-entreprises.api.gouv.fr/search?q=${siren}&mtm_campaign=terrassea`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.results?.[0];
    if (!result) return null;
    const name = result.nom_complet || result.nom_raison_sociale || "";
    const siege = result.siege;
    const address = siege
      ? `${siege.numero_voie || ""} ${siege.type_voie || ""} ${siege.libelle_voie || ""}, ${siege.code_postal || ""} ${siege.libelle_commune || ""}`.trim()
      : "";
    return { companyName: name, address };
  } catch {
    return null;
  }
}

// ── Qualification score ──────────────────────────────────────────────────────

function computeScore(form: {
  stars_or_class: string;
  budget_range: string;
  quantity_estimate: number;
  timeline: string;
}): number {
  let score = 0;
  if (form.stars_or_class === "5\u2605" || form.stars_or_class === "4\u2605") score += 30;
  if (form.stars_or_class === "3\u2605") score += 15;
  if (form.budget_range === "> 100K\u20AC") score += 40;
  if (form.budget_range === "50-100K\u20AC") score += 30;
  if (form.budget_range === "15-50K\u20AC") score += 20;
  if (form.budget_range === "5-15K\u20AC") score += 10;
  if (form.quantity_estimate >= 50) score += 20;
  else if (form.quantity_estimate >= 20) score += 10;
  if (form.timeline === "urgent" || form.timeline === "short") score += 10;
  return score;
}

// ── Constants ────────────────────────────────────────────────────────────────

const ESTABLISHMENT_TYPES = ["hotel", "restaurant", "resort", "bar", "cafe", "other"] as const;
const STAR_OPTIONS = ["5\u2605", "4\u2605", "3\u2605", "sans_classement"] as const;
const COUNTRY_CODES = ["FR", "ES", "IT", "DE", "BE", "NL", "PT", "CH", "AT"] as const;
const COUNTRY_KEYS: Record<string, string> = { FR: "countryFrance", ES: "countrySpain", IT: "countryItaly", DE: "countryGermany", BE: "countryBelgium", NL: "countryNetherlands", PT: "countryPortugal", CH: "countrySwitzerland", AT: "countryAustria" };
const BUDGET_RANGES = ["< 5K\u20AC", "5-15K\u20AC", "15-50K\u20AC", "50-100K\u20AC", "> 100K\u20AC"];
const TIMELINE_KEYS = [
  { value: "urgent", key: "timelineUrgent" },
  { value: "short", key: "timelineShort" },
  { value: "medium", key: "timelineMedium" },
  { value: "long", key: "timelineLong" },
];
const PROJECT_TYPES = ["new_project", "renovation", "replacement"] as const;
const PROJECT_TYPE_KEYS: Record<string, string> = { new_project: "newProject", renovation: "renovation", replacement: "replacement" };
const ESTABLISHMENT_KEYS: Record<string, string> = { hotel: "hotel", restaurant: "restaurant", resort: "resort", bar: "bar", cafe: "cafe", other: "other" };

// ── Main component ───────────────────────────────────────────────────────────

const ProjectBriefModal = ({ open, onClose, product, offer }: ProjectBriefModalProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | "success" | "rejected">(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 — Establishment
  const [establishmentType, setEstablishmentType] = useState("");
  const [starsOrClass, setStarsOrClass] = useState("");
  const [capacity, setCapacity] = useState<number>(0);
  const [country, setCountry] = useState("");

  // Step 2 — Project
  const [collectionsInterest, setCollectionsInterest] = useState<string[]>([]);
  const [quantityEstimate, setQuantityEstimate] = useState<number>(10);
  const [budgetRange, setBudgetRange] = useState("");
  const [timeline, setTimeline] = useState("");
  const [projectType, setProjectType] = useState("");

  // Step 3 — Contact
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [siren, setSiren] = useState("");
  const [message, setMessage] = useState("");
  const [sirenResult, setSirenResult] = useState<SirenResult | null>(null);
  const [sirenChecking, setSirenChecking] = useState(false);
  const [sirenError, setSirenError] = useState(false);

  // Fetch available collections for this brand
  const [brandCollections, setBrandCollections] = useState<string[]>([]);
  useEffect(() => {
    if (!open || !offer.partner_id) return;
    supabase
      .from("product_offers")
      .select("collection_name")
      .eq("partner_id", offer.partner_id)
      .eq("is_active", true)
      .not("collection_name", "is", null)
      .then(({ data }) => {
        const names = [...new Set((data ?? []).map((d) => d.collection_name).filter(Boolean))] as string[];
        setBrandCollections(names);
      });
  }, [open, offer.partner_id]);

  // Pre-fill collection from current offer
  useEffect(() => {
    if (open && offer.collection_name) {
      setCollectionsInterest([offer.collection_name]);
    }
  }, [open, offer.collection_name]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(1);
      setSubmitting(false);
    }
  }, [open]);

  // SIREN lookup
  useEffect(() => {
    if (siren.length !== 9) { setSirenResult(null); setSirenError(false); return; }
    let cancelled = false;
    setSirenChecking(true);
    lookupSiren(siren).then((result) => {
      if (cancelled) return;
      setSirenChecking(false);
      if (result) {
        setSirenResult(result);
        if (result.companyName && !company) setCompany(result.companyName);
      } else {
        setSirenResult(null); setSirenError(true);
      }
    }).catch(() => { if (!cancelled) { setSirenChecking(false); setSirenError(true); } });
    return () => { cancelled = true; };
  }, [siren]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const canProceed1 = establishmentType && starsOrClass && country;
  const canProceed2 = quantityEstimate > 0 && budgetRange && timeline && projectType;
  const canSubmit = firstName && email && siren.length === 9;

  const handleSubmit = async () => {
    if (!canSubmit) { toast.error(t("brief.fillRequired")); return; }

    const score = computeScore({ stars_or_class: starsOrClass, budget_range: budgetRange, quantity_estimate: quantityEstimate, timeline });

    if (score < 20) {
      setStep("rejected");
      return;
    }

    setSubmitting(true);
    try {
      const { error: insertError } = await supabase.from("project_briefs").insert({
        brand_partner_id: offer.partner_id,
        product_id: product.id,
        establishment_type: establishmentType,
        stars_or_class: starsOrClass,
        capacity,
        country,
        quantity_estimate: quantityEstimate,
        budget_range: budgetRange,
        timeline,
        project_type: projectType,
        collections_interest: collectionsInterest,
        first_name: firstName,
        last_name: lastName,
        email,
        company: company || sirenResult?.companyName || null,
        siren,
        message: message || null,
        qualification_score: score,
        status: "pending_review",
        client_user_id: user?.id || null,
      });
      if (insertError) throw insertError;

      // Notify admins (non-blocking)
      supabase.from("user_profiles").select("id").eq("user_type", "admin").then(({ data: admins }) => {
        for (const admin of admins || []) {
          supabase.from("notifications").insert({
            user_id: admin.id,
            title: "Nouveau brief projet Brand",
            body: `${firstName} ${lastName || ""} a soumis un brief pour ${product.name} (score: ${score})`.trim(),
            type: "info",
            link: "/admin",
          });
        }
      });

      setStep("success");
    } catch (err) {
      console.error(err);
      toast.error(t("brief.submitError"));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full text-sm font-body bg-background border border-border rounded-full px-4 py-2.5 focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/50";
  const selectClass = "w-full text-sm font-body bg-background border border-border rounded-full px-4 py-2.5 focus:outline-none focus:border-foreground transition-colors appearance-none cursor-pointer";
  const labelClass = "text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5";

  const stepIndicator = (
    <div className="flex items-center gap-2 mb-6">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-bold transition-colors ${
            step === s ? "bg-foreground text-primary-foreground" :
            (typeof step === "number" && s < step) ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
          }`}>
            {typeof step === "number" && s < step ? "\u2713" : s}
          </div>
          {s < 3 && <div className={`w-8 h-px ${typeof step === "number" && s < step ? "bg-green-400" : "bg-border"}`} />}
        </div>
      ))}
    </div>
  );

  const toggleCollection = (name: string) => {
    setCollectionsInterest((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto pointer-events-auto">

              {/* ── Success ── */}
              {step === "success" && (
                <div className="p-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="h-7 w-7 text-green-600" />
                  </div>
                  <h2 className="font-display text-xl font-bold text-foreground mb-2">
                    {t("brief.successTitle")}
                  </h2>
                  <p className="text-sm font-body text-muted-foreground leading-relaxed mb-6">
                    {t("brief.successDescription")}
                  </p>
                  <button onClick={onClose} className="px-8 py-3 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity">
                    {t("brief.close")}
                  </button>
                </div>
              )}

              {/* ── Rejected (score < 20) ── */}
              {step === "rejected" && (
                <div className="p-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-5">
                    <AlertTriangle className="h-7 w-7 text-amber-600" />
                  </div>
                  <h2 className="font-display text-xl font-bold text-foreground mb-2">
                    {t("brief.rejectedTitle")}
                  </h2>
                  <p className="text-sm font-body text-muted-foreground leading-relaxed mb-6">
                    {t("brief.rejectedDescription")}
                  </p>
                  <button onClick={onClose} className="px-8 py-3 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity">
                    {t("brief.backToCatalog")}
                  </button>
                </div>
              )}

              {/* ── Step 1: Establishment ── */}
              {step === 1 && (
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h2 className="font-display text-lg font-bold text-foreground">{t("brief.submitTitle")}</h2>
                      <p className="text-xs font-body text-muted-foreground mt-0.5">{product.name} &middot; {offer.partner?.name || "Marque"}</p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1"><X className="h-5 w-5" /></button>
                  </div>
                  {stepIndicator}

                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-display text-sm font-semibold text-foreground">{t("brief.step1")}</h3>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className={labelClass}>{t("brief.establishmentType")} *</span>
                      <select value={establishmentType} onChange={(e) => setEstablishmentType(e.target.value)} className={selectClass}>
                        <option value="">{t("brief.selectPlaceholder")}</option>
                        {ESTABLISHMENT_TYPES.map((et) => <option key={et} value={et}>{t("brief." + ESTABLISHMENT_KEYS[et])}</option>)}
                      </select>
                    </div>

                    <div>
                      <span className={labelClass}>{t("brief.classification")} *</span>
                      <select value={starsOrClass} onChange={(e) => setStarsOrClass(e.target.value)} className={selectClass}>
                        <option value="">{t("brief.selectPlaceholder")}</option>
                        {STAR_OPTIONS.map((s) => <option key={s} value={s}>{s === "sans_classement" ? t("brief.noClassification") : s}</option>)}
                      </select>
                    </div>

                    <div>
                      <span className={labelClass}>{t("brief.capacity")}</span>
                      <input type="number" min={0} value={capacity || ""} onChange={(e) => setCapacity(parseInt(e.target.value) || 0)} placeholder={t("brief.capacityPlaceholder")} className={inputClass} />
                    </div>

                    <div>
                      <span className={labelClass}>{t("brief.country")} *</span>
                      <select value={country} onChange={(e) => setCountry(e.target.value)} className={selectClass}>
                        <option value="">{t("brief.selectPlaceholder")}</option>
                        {COUNTRY_CODES.map((code) => <option key={code} value={code}>{t("brief." + COUNTRY_KEYS[code])}</option>)}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    disabled={!canProceed1}
                    className="w-full mt-5 py-3 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {t("brief.next")} <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* ── Step 2: Project ── */}
              {step === 2 && (
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h2 className="font-display text-lg font-bold text-foreground">{t("brief.submitTitle")}</h2>
                      <p className="text-xs font-body text-muted-foreground mt-0.5">{product.name}</p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1"><X className="h-5 w-5" /></button>
                  </div>
                  {stepIndicator}

                  <div className="flex items-center gap-2 mb-4">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-display text-sm font-semibold text-foreground">{t("brief.step2")}</h3>
                  </div>

                  <div className="space-y-3">
                    {brandCollections.length > 0 && (
                      <div>
                        <span className={labelClass}>{t("brief.collectionsInterest")}</span>
                        <div className="flex flex-wrap gap-2">
                          {brandCollections.map((c) => (
                            <button
                              key={c}
                              onClick={() => toggleCollection(c)}
                              className={`text-xs px-3 py-1.5 rounded-full border transition-colors font-body ${
                                collectionsInterest.includes(c)
                                  ? "bg-foreground text-primary-foreground border-foreground"
                                  : "bg-background text-muted-foreground border-border hover:border-foreground"
                              }`}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <span className={labelClass}>{t("brief.estimatedQuantity")} *</span>
                      <input type="number" min={1} value={quantityEstimate || ""} onChange={(e) => setQuantityEstimate(parseInt(e.target.value) || 0)} className={inputClass} />
                    </div>

                    <div>
                      <span className={labelClass}>{t("brief.globalBudget")} *</span>
                      <select value={budgetRange} onChange={(e) => setBudgetRange(e.target.value)} className={selectClass}>
                        <option value="">{t("brief.selectPlaceholder")}</option>
                        {BUDGET_RANGES.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>

                    <div>
                      <span className={labelClass}>{t("brief.timeline")} *</span>
                      <select value={timeline} onChange={(e) => setTimeline(e.target.value)} className={selectClass}>
                        <option value="">{t("brief.selectPlaceholder")}</option>
                        {TIMELINE_KEYS.map((tl) => <option key={tl.value} value={tl.value}>{t("brief." + tl.key)}</option>)}
                      </select>
                    </div>

                    <div>
                      <span className={labelClass}>{t("brief.projectType")} *</span>
                      <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className={selectClass}>
                        <option value="">{t("brief.selectPlaceholder")}</option>
                        {PROJECT_TYPES.map((pt) => <option key={pt} value={pt}>{t("brief." + PROJECT_TYPE_KEYS[pt])}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={() => setStep(1)}
                      className="flex-1 py-3 font-display font-semibold text-sm border border-border text-foreground rounded-full hover:bg-card transition-colors flex items-center justify-center gap-2"
                    >
                      <ChevronLeft className="h-4 w-4" /> {t("brief.back")}
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      disabled={!canProceed2}
                      className="flex-1 py-3 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {t("brief.next")} <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 3: Contact ── */}
              {step === 3 && (
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h2 className="font-display text-lg font-bold text-foreground">{t("brief.submitTitle")}</h2>
                      <p className="text-xs font-body text-muted-foreground mt-0.5">{product.name}</p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1"><X className="h-5 w-5" /></button>
                  </div>
                  {stepIndicator}

                  <div className="flex items-center gap-2 mb-4">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-display text-sm font-semibold text-foreground">{t("brief.step3")}</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className={labelClass}>{t("brief.firstName")} *</span>
                        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <span className={labelClass}>{t("brief.lastName")}</span>
                        <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
                      </div>
                    </div>

                    <div>
                      <span className={labelClass}>{t("brief.email")} *</span>
                      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="contact@restaurant.fr" className={inputClass} />
                    </div>

                    <div>
                      <span className={labelClass}>{t("brief.company")}</span>
                      <input value={company} onChange={(e) => setCompany(e.target.value)} className={inputClass} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={labelClass + " mb-0"}>{t("brief.siren")} *</span>
                        {sirenChecking && <span className="text-[9px] text-muted-foreground">{t("brief.sirenChecking")}</span>}
                        {sirenResult && !sirenChecking && (
                          <span className="text-[9px] text-green-600 flex items-center gap-0.5">\u2713 {sirenResult.companyName}</span>
                        )}
                        {sirenError && !sirenChecking && (
                          <span className="text-[9px] text-destructive">{t("brief.sirenNotFound")}</span>
                        )}
                      </div>
                      <input
                        value={siren}
                        onChange={(e) => setSiren(e.target.value.replace(/\D/g, "").slice(0, 9))}
                        placeholder="123456789"
                        className={`${inputClass} ${sirenResult ? "border-green-500" : sirenError ? "border-destructive" : ""}`}
                      />
                    </div>

                    <div>
                      <span className={labelClass}>{t("brief.message")}</span>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={2}
                        placeholder={t("brief.messagePlaceholder")}
                        className="w-full text-sm font-body bg-background border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/50 resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={() => setStep(2)}
                      className="flex-1 py-3 font-display font-semibold text-sm border border-border text-foreground rounded-full hover:bg-card transition-colors flex items-center justify-center gap-2"
                    >
                      <ChevronLeft className="h-4 w-4" /> {t("brief.back")}
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={!canSubmit || submitting}
                      className="flex-1 py-3 font-display font-semibold text-sm bg-[#D4603A] text-white rounded-full hover:opacity-90 transition-opacity disabled:opacity-40"
                    >
                      {submitting ? t("brief.submitting") : t("brief.submitButton") + " \u2192"}
                    </button>
                  </div>

                  <p className="text-[10px] font-body text-muted-foreground leading-relaxed mt-3 text-center">
                    {t("brief.finePrint")}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProjectBriefModal;
