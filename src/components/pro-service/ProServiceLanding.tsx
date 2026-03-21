import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight, CheckCircle2, Sparkles, Clock, Shield, Users,
  ChevronDown, Building2, Truck, Pencil,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Qualification logic ───────────────────────────────────────────────────────

const MIN_COVERS = 100;
const MIN_BUDGET = 35000;

function isQualified(covers: number | null, budget: string): boolean {
  if (covers !== null && covers >= MIN_COVERS) return true;
  const budgetNum = parseBudget(budget);
  if (budgetNum !== null && budgetNum >= MIN_BUDGET) return true;
  return false;
}

function parseBudget(val: string): number | null {
  const match = val.replace(/[€\s,]/g, "").match(/\d+/);
  if (!match) return null;
  const num = parseInt(match[0]);
  return isNaN(num) ? null : num;
}

// ── Data ──────────────────────────────────────────────────────────────────────

const INCLUDES_ICONS = [
  { icon: Clock, accent: "#FAECE7", iconColor: "#D85A30", titleKey: "proService.card1Title", descKey: "proService.card1Desc" },
  { icon: Sparkles, accent: "#E6F1FB", iconColor: "#378ADD", titleKey: "proService.card2Title", descKey: "proService.card2Desc" },
  { icon: Users, accent: "#E6F1FB", iconColor: "#378ADD", titleKey: "proService.card3Title", descKey: "proService.card3Desc" },
  { icon: Shield, accent: "#E1F5EE", iconColor: "#1D9E75", titleKey: "proService.card4Title", descKey: "proService.card4Desc" },
];

const PORTALS = [
  {
    icon: Building2,
    titleKey: "proHub.landing.portalClient",
    descKey: "proHub.landing.portalClientDesc",
    color: "#D4603A",
    bg: "rgba(212,96,58,0.08)",
    role: "client",
  },
  {
    icon: Truck,
    titleKey: "proHub.landing.portalPartner",
    descKey: "proHub.landing.portalPartnerDesc",
    color: "#1A2456",
    bg: "rgba(26,36,86,0.08)",
    role: "partner",
  },
  {
    icon: Pencil,
    titleKey: "proHub.landing.portalArchitect",
    descKey: "proHub.landing.portalArchitectDesc",
    color: "#6B7B5E",
    bg: "rgba(107,123,94,0.08)",
    role: "architect",
  },
];

const KEY_FIGURES = [
  { value: "120+", labelKey: "proHub.landing.figProjects" },
  { value: "45",   labelKey: "proHub.landing.figSuppliers" },
  { value: "18",   labelKey: "proHub.landing.figArchitects" },
  { value: "98%",  labelKey: "proHub.landing.figSatisfaction" },
];

// ── Component ─────────────────────────────────────────────────────────────────

type Phase = "form" | "not_qualified" | "submitted";

export default function ProServiceLanding() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>("form");
  const [submitting, setSubmitting] = useState(false);
  const [showOptional, setShowOptional] = useState(false);

  const FOR_WHO_YES = [
    { label: t("proService.forYes1"), sub: t("proService.forYes1Sub") },
    { label: t("proService.forYes2"), sub: t("proService.forYes2Sub") },
    { label: t("proService.forYes3"), sub: t("proService.forYes3Sub") },
    { label: t("proService.forYes4"), sub: t("proService.forYes4Sub") },
  ];
  const FOR_WHO_NO = [
    { label: t("proService.forNo1"), sub: t("proService.forNo1Sub") },
    { label: t("proService.forNo2"), sub: t("proService.forNo2Sub") },
  ];
  const STEPS = [
    { n: "01", title: t("proService.step1Title"), desc: t("proService.step1Desc"), duration: "5 min" },
    { n: "02", title: t("proService.step2Title"), desc: t("proService.step2Desc"), duration: "24h" },
    { n: "03", title: t("proService.step3Title"), desc: t("proService.step3Desc"), duration: "5 days" },
    { n: "04", title: t("proService.step4Title"), desc: t("proService.step4Desc"), duration: "Your choice" },
  ];

  const [form, setForm] = useState({
    name: "", email: "", phone: "", company: "", siren: "",
    establishmentType: "", location: "", covers: "", budget: "",
    spaces: "", timeline: "", style: "", constraints: "", notes: "",
  });

  const handle = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value }));

  const rawCovers = parseInt(form.covers);
  const coversNum = form.covers && !isNaN(rawCovers) ? rawCovers : null;
  const qualified = isQualified(coversNum, form.budget);

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.phone || !form.company || !form.siren || !form.establishmentType || !form.location) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (!qualified) { setPhase("not_qualified"); return; }
    setSubmitting(true);
    try {
      await supabase.from("project_requests").insert({
        project_name: `Pro Service — ${form.company || form.name}`,
        contact_name: form.name, contact_company: form.company,
        contact_email: form.email, contact_phone: form.phone,
        city: form.location, budget_range: form.budget, timeline: form.timeline,
        free_text_request: `${form.notes}\n\nType: ${form.establishmentType}\nCovers: ${form.covers}\nSpaces: ${form.spaces}\nStyle: ${form.style}\nConstraints: ${form.constraints}`,
        detected_attributes: { service_type: "pro_service", siren: form.siren, covers: coversNum, spaces: form.spaces },
      });
      setPhase("submitted");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full text-sm font-body bg-white border border-border rounded-full px-4 py-2.5 focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/50";
  const labelClass = "text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5";

  // ── Submitted ──
  if (phase === "submitted") {
    return (
      <div className="container mx-auto px-4 md:px-6 py-32 max-w-xl text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight mb-2">{t("proService.requestReceived")}</h1>
          <p className="text-sm font-body text-muted-foreground mb-4">{t("proService.requestReceivedDesc")}</p>
          <p className="text-sm font-body text-muted-foreground leading-relaxed mb-8">{t("proService.requestReceivedDetail")}</p>
          <button onClick={() => navigate("/")} className="inline-flex items-center gap-2 px-6 py-3 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90">
            {t("proService.backToHome")}
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Not qualified ──
  if (phase === "not_qualified") {
    return (
      <div className="container mx-auto px-4 md:px-6 py-32 max-w-xl text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="font-display text-xl font-bold tracking-tight mb-4">{t("proService.notQualifiedTitle")}</h1>
          <p className="text-sm font-body text-muted-foreground leading-relaxed mb-8">
            {t("proService.notQualifiedDesc", { covers: MIN_COVERS, budget: MIN_BUDGET.toLocaleString() })}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate("/projects/new")} className="flex items-center justify-center gap-2 px-6 py-3 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90">
              Launch Project Builder <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => setPhase("form")} className="flex items-center justify-center gap-2 px-6 py-3 font-display font-semibold text-sm border border-border text-muted-foreground rounded-full hover:border-foreground hover:text-foreground transition-all">
              {t("proService.updateDetails")}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Main landing ──
  return (
    <>
      {/* ── HERO — Pro Hub ── */}
      <section className="pt-32 pb-16 md:pb-20 bg-background">
        <div className="container mx-auto px-4 md:px-6 max-w-6xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="text-xs font-display font-semibold uppercase tracking-widest text-muted-foreground mb-4 block">
              {t("proHub.landing.badge")}
            </span>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-4 max-w-3xl mx-auto">
              {t("proHub.landing.headline")}
            </h1>
            <p className="text-base font-body text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-10">
              {t("proHub.landing.subtitle")}
            </p>
          </motion.div>

          {/* Key figures */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-12">
            {KEY_FIGURES.map((fig, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * i }}
                className="p-4 rounded-xl border border-border bg-card"
              >
                <p className="font-display text-2xl font-bold text-foreground">{fig.value}</p>
                <p className="text-xs font-body text-muted-foreground mt-1">{t(fig.labelKey)}</p>
              </motion.div>
            ))}
          </div>

          {/* 3 Portals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8">
            {PORTALS.map((portal, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 * i }}
                className="p-6 rounded-2xl border border-border bg-card text-left hover:border-foreground/20 transition-colors cursor-pointer group"
                onClick={() => navigate(`/auth?role=${portal.role}`)}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: portal.bg }}>
                  <portal.icon className="h-5 w-5" style={{ color: portal.color }} />
                </div>
                <h3 className="font-display font-bold text-sm mb-2">{t(portal.titleKey)}</h3>
                <p className="text-xs font-body text-muted-foreground leading-relaxed mb-4">{t(portal.descKey)}</p>
                <span className="text-xs font-display font-semibold text-foreground group-hover:underline flex items-center gap-1">
                  {t("proHub.landing.signUp")} <ArrowRight className="h-3 w-3" />
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Original content: hero + includes cards ── */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4 md:px-6 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <span className="text-xs font-display font-semibold uppercase tracking-widest text-muted-foreground mb-4 block">
                {t("proService.badge")}
              </span>
              <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight leading-tight mb-6">
                {t("proService.headline")}
              </h2>
              <p className="text-base font-body text-muted-foreground leading-relaxed max-w-xl mb-8">
                {t("proService.subtitle")}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm font-body mb-8">
                {[t("proService.covers"), t("proService.budget"), t("proService.spaces")].map((val, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {i > 0 && <span className="text-muted-foreground text-xs">{t("common.or")}</span>}
                    <div className="flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="font-semibold">{val}</span>
                    </div>
                  </div>
                ))}
              </div>
              <a href="#brief" className="inline-flex items-center gap-2 px-6 py-3 font-display font-semibold text-sm bg-terracotta text-white rounded-full hover:opacity-90 transition-opacity">
                {t("proService.submitBrief")} <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {INCLUDES_ICONS.map((item, i) => (
                <div key={i} className="p-4 rounded-2xl border border-border bg-card flex flex-col gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: item.accent }}>
                    <item.icon className="h-4 w-4" style={{ color: item.iconColor }} />
                  </div>
                  <h3 className="font-display font-semibold text-sm leading-snug">{t(item.titleKey)}</h3>
                  <p className="text-xs font-body text-muted-foreground leading-relaxed">{t(item.descKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS + IS THIS FOR YOU ── */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            <div>
              <h2 className="font-display text-xl font-bold tracking-tight mb-8">{t("proService.howItWorks")}</h2>
              <div className="grid grid-cols-2 gap-8">
                {STEPS.map((step, i) => (
                  <div key={i} className="p-6 bg-card rounded-xl border border-border flex flex-col">
                    <p className="text-5xl font-display font-bold text-muted-foreground/20 mb-3">{step.n}</p>
                    <h3 className="font-display font-semibold text-sm mb-1">{step.title}</h3>
                    <p className="text-sm font-body text-muted-foreground leading-relaxed">{step.desc}</p>
                    <div className="border-t border-border mt-4 pt-4 mt-auto">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">{step.duration}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="font-display text-xl font-bold tracking-tight mb-8">{t("proService.isThisForYou")}</h2>
              <p className="text-xs font-display font-semibold uppercase tracking-widest text-green-600 mb-3">{t("proService.forYouIf")}</p>
              <div className="space-y-2.5 mb-6">
                {FOR_WHO_YES.map((item, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-xl border border-green-200 bg-green-50/50">
                    <span className="text-green-600 font-semibold mt-0.5">✓</span>
                    <div>
                      <p className="text-sm font-display font-semibold">{item.label}</p>
                      <p className="text-xs font-body text-muted-foreground mt-0.5">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs font-display font-semibold uppercase tracking-widest text-muted-foreground mb-3">{t("proService.betterOptions")}</p>
              <div className="space-y-2.5 mb-4">
                {FOR_WHO_NO.map((item, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-xl border border-border bg-card">
                    <span className="text-muted-foreground font-semibold mt-0.5">→</span>
                    <div>
                      <p className="text-sm font-display font-semibold text-muted-foreground">{item.label}</p>
                      <p className="text-xs font-body text-muted-foreground mt-0.5">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 rounded-xl border border-border bg-card">
                <p className="text-sm font-display font-semibold mb-1">{t("proService.under100")}</p>
                <p className="text-xs font-body text-muted-foreground leading-relaxed mb-3">{t("proService.under100Desc")}</p>
                <button onClick={() => navigate("/projects/new")} className="inline-flex items-center gap-1.5 text-[11px] font-display font-bold text-foreground hover:opacity-70 transition-opacity">
                  {t("proService.launchBuilder")} <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FORM ── */}
      <section className="py-16 md:py-24 bg-muted/30" id="brief">
        <div className="container mx-auto px-4 md:px-6 max-w-6xl">
          <div className="max-w-2xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
              <p className="text-xs font-display font-semibold uppercase tracking-widest text-muted-foreground mb-2">{t("proService.formTitle")}</p>
              <h2 className="font-display text-2xl font-bold tracking-tight mb-2 text-terracotta">{t("proService.submitBrief")}</h2>
              <p className="text-sm font-body text-muted-foreground leading-relaxed mb-10">{t("proService.formSubtitle")}</p>

              <AnimatePresence>
                {(form.covers || form.budget) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className={`flex items-start gap-3 p-4 rounded-xl border mb-8 ${qualified ? "border-green-200 bg-green-50/50" : "border-amber-200 bg-amber-50/50"}`}
                  >
                    <span className={`text-sm font-semibold ${qualified ? "text-green-600" : "text-amber-600"}`}>{qualified ? "✓" : "○"}</span>
                    <p className={`text-sm font-body ${qualified ? "text-green-700" : "text-amber-700"}`}>
                      {qualified ? t("proService.qualifiedMsg") : t("proService.notQualifiedMsg")}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t("proService.formFields.fullName")} *</label>
                    <input type="text" value={form.name} onChange={handle("name")} placeholder="Jean Dupont" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{t("proService.formFields.company")} *</label>
                    <input type="text" value={form.company} onChange={handle("company")} placeholder="Hôtel Les Pins" className={inputClass} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t("proService.formFields.email")} *</label>
                    <input type="email" value={form.email} onChange={handle("email")} placeholder="jean@hotel.fr" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{t("proService.formFields.phone")} *</label>
                    <input type="tel" value={form.phone} onChange={handle("phone")} placeholder="+33 6 12 34 56 78" className={inputClass} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t("proService.formFields.establishmentType")} *</label>
                    <select value={form.establishmentType} onChange={handle("establishmentType")} className={inputClass}>
                      <option value="">{t("proService.formFields.select")}</option>
                      <option value="hotel">Hotel</option>
                      <option value="resort">Resort</option>
                      <option value="restaurant">Restaurant</option>
                      <option value="beach_club">Beach Club</option>
                      <option value="rooftop">Rooftop Bar</option>
                      <option value="camping">Camping / Glamping</option>
                      <option value="event_venue">Event Venue</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>{t("proService.formFields.location")} *</label>
                    <input type="text" value={form.location} onChange={handle("location")} placeholder="Nice, France" className={inputClass} />
                  </div>
                </div>
                <div className="border border-border rounded-2xl p-5 bg-muted/20">
                  <p className="text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground mb-4">{t("proService.formFields.scale")}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>
                        {t("proService.formFields.covers")}
                        <span className="font-normal normal-case tracking-normal text-muted-foreground"> {t("proService.formFields.coversAll")}</span>
                      </label>
                      <input type="number" value={form.covers} onChange={handle("covers")} placeholder="e.g. 200"
                        className={`${inputClass} ${coversNum && coversNum >= MIN_COVERS ? "border-green-500" : coversNum && coversNum < MIN_COVERS ? "border-amber-400" : ""}`} />
                      {coversNum !== null && (
                        <p className={`text-[10px] font-body mt-1.5 ${coversNum >= MIN_COVERS ? "text-green-600" : "text-amber-600"}`}>
                          {coversNum >= MIN_COVERS ? "✓ Qualifies (100+ covers)" : `Min. ${MIN_COVERS} covers for Pro Service`}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>
                        {t("proService.formFields.budget")}
                        <span className="font-normal normal-case tracking-normal text-muted-foreground"> {t("proService.formFields.budgetExcl")}</span>
                      </label>
                      <input type="text" value={form.budget} onChange={handle("budget")} placeholder="e.g. €50,000"
                        className={`${inputClass} ${parseBudget(form.budget) && parseBudget(form.budget)! >= MIN_BUDGET ? "border-green-500" : parseBudget(form.budget) && parseBudget(form.budget)! < MIN_BUDGET ? "border-amber-400" : ""}`} />
                      {parseBudget(form.budget) !== null && (
                        <p className={`text-[10px] font-body mt-1.5 ${parseBudget(form.budget)! >= MIN_BUDGET ? "text-green-600" : "text-amber-600"}`}>
                          {parseBudget(form.budget)! >= MIN_BUDGET ? "✓ Qualifies (€35k+)" : `Min. €${MIN_BUDGET.toLocaleString()} for Pro Service`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => setShowOptional(!showOptional)}
                  className="w-full flex items-center justify-between text-xs font-body text-muted-foreground hover:text-foreground transition-colors py-1">
                  {t("proService.formFields.optionalDetails")}
                  <ChevronDown className={`h-4 w-4 transition-transform ${showOptional ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {showOptional && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>{t("proService.formFields.spaces")}</label>
                          <input type="text" value={form.spaces} onChange={handle("spaces")} placeholder="Terrace, pool deck, garden" className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>{t("proService.formFields.timeline")}</label>
                          <input type="text" value={form.timeline} onChange={handle("timeline")} placeholder="Opening June 2026" className={inputClass} />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>{t("proService.formFields.style")}</label>
                        <input type="text" value={form.style} onChange={handle("style")} placeholder="Mediterranean, natural tones, rope & teak" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>{t("proService.formFields.constraints")}</label>
                        <input type="text" value={form.constraints} onChange={handle("constraints")} placeholder="Wind-exposed terrace, stackable for winter storage" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>{t("proService.formFields.notes")}</label>
                        <textarea value={form.notes} onChange={handle("notes")} placeholder="Anything else we should know..." rows={3} className={`${inputClass} rounded-2xl`} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div>
                  <label className={labelClass}>{t("proService.formFields.siren")} *</label>
                  <input type="text" value={form.siren}
                    onChange={e => setForm(p => ({ ...p, siren: e.target.value.replace(/\D/g, "").slice(0, 9) }))}
                    placeholder="123456789" className={inputClass} />
                </div>
                <div className="pt-2">
                  <button onClick={handleSubmit} disabled={submitting}
                    className="w-full py-4 font-display font-semibold text-sm bg-terracotta text-white rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2">
                    {submitting ? t("common.submitting") : <>{t("proService.formSubmitButton")} <ArrowRight className="h-4 w-4" /></>}
                  </button>
                  <p className="text-[10px] text-muted-foreground font-body text-center mt-3 leading-relaxed">{t("proService.formDisclaimer")}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
}
