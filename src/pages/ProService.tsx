import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Sparkles, Clock, Shield, Users, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

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
  return match ? parseInt(match[0]) : null;
}

// ── Data ──────────────────────────────────────────────────────────────────────

const INCLUDES = [
  {
    icon: Clock,
    title: "48h expert brief",
    desc: "A Terrassea sourcing expert analyses your project and comes back with a tailored approach within 48 business hours.",
    accent: "#FAECE7",
    iconColor: "#D85A30",
  },
  {
    icon: Sparkles,
    title: "3 curated proposals",
    desc: "Products matched to your space, style, budget and technical constraints — with matched suppliers and net pricing.",
    accent: "#E6F1FB",
    iconColor: "#378ADD",
  },
  {
    icon: Users,
    title: "Multi-supplier coordination",
    desc: "One point of contact for all quotes, delivery scheduling and supplier follow-up. We consolidate the complexity.",
    accent: "#E6F1FB",
    iconColor: "#378ADD",
  },
  {
    icon: Shield,
    title: "Free for the client",
    desc: "Our fee is paid by suppliers on confirmed orders. You get expert sourcing at zero cost.",
    accent: "#E1F5EE",
    iconColor: "#1D9E75",
  },
];

const FOR_WHO_YES = [
  { label: "Hotel with multiple outdoor spaces", sub: "Terrace + pool deck + garden = complex multi-supplier coordination" },
  { label: "New restaurant opening, 100+ covers", sub: "Volume + deadline + first-time procurement = you need an expert" },
  { label: "Resort or seasonal beach club", sub: "Marine-grade specs + volume orders + tight seasonal deadlines" },
  { label: "Architect managing several client projects", sub: "Multi-project coordination and pro pricing across all orders" },
];

const FOR_WHO_NO = [
  { label: "Restaurant under 100 covers, budget < €25k", sub: "→ Our Project Builder is built exactly for you" },
  { label: "Replacing a few individual pieces", sub: "→ Browse the catalogue and request a direct quote" },
];

const STEPS = [
  { n: "01", title: "You describe", desc: "Fill in the project brief below. 5 minutes, no commitment." },
  { n: "02", title: "We qualify", desc: "Our team reviews your request within 24 hours and confirms we can help." },
  { n: "03", title: "We source", desc: "3 curated proposals with matched suppliers and pricing, within 5 business days." },
  { n: "04", title: "You decide", desc: "You choose what fits. We handle the rest — orders, delivery, follow-up." },
];

// ── Main component ────────────────────────────────────────────────────────────

type Phase = "form" | "not_qualified" | "submitted";

const ProService = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("form");
  const [submitting, setSubmitting] = useState(false);
  const [showOptional, setShowOptional] = useState(false);

  const [form, setForm] = useState({
    name: "", email: "", phone: "", company: "", siren: "",
    establishmentType: "", location: "", covers: "", budget: "",
    spaces: "", timeline: "", style: "", constraints: "", notes: "",
  });

  const handle = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value }));

  const coversNum = form.covers ? parseInt(form.covers) : null;
  const qualified = isQualified(coversNum, form.budget);

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.phone || !form.establishmentType || !form.location) {
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
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 md:px-6 py-32 max-w-xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight mb-2">Request received</h1>
            <p className="text-sm font-body text-muted-foreground mb-4">We'll be in touch within 24 hours.</p>
            <p className="text-sm font-body text-muted-foreground leading-relaxed mb-8">
              Our sourcing team has your brief. We'll review it and confirm we can help — then get started on your 3 proposals within 5 business days.
            </p>
            <button onClick={() => navigate("/")} className="inline-flex items-center gap-2 px-6 py-3 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90">
              Back to homepage
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Not qualified ──
  if (phase === "not_qualified") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 md:px-6 py-32 max-w-xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="h-8 w-8 text-amber-600" />
            </div>
            <h1 className="font-display text-xl font-bold tracking-tight mb-4">
              Great news — your project is a perfect fit for our Project Builder.
            </h1>
            <p className="text-sm font-body text-muted-foreground leading-relaxed mb-8">
              Pro Service is designed for projects above {MIN_COVERS} covers or €{MIN_BUDGET.toLocaleString()} budget. Your project is well-served by our self-service tools — faster, simpler, and just as effective.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => navigate("/projects/new")} className="flex items-center justify-center gap-2 px-6 py-3 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90">
                Launch Project Builder <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => setPhase("form")} className="flex items-center justify-center gap-2 px-6 py-3 font-display font-semibold text-sm border border-border text-muted-foreground rounded-full hover:border-foreground hover:text-foreground transition-all">
                Update my project details
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Main page ──
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* ── HERO + INCLUDES (merged) ── */}
      <section className="pt-32 pb-16 md:pb-24 bg-background">
        <div className="container mx-auto px-4 md:px-6 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left — copy */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <span className="text-xs font-display font-semibold uppercase tracking-widest text-muted-foreground mb-4 block">
                Terrassea Pro Service
              </span>
              <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-6">
                Not for every project —<br />
                for the ones where{" "}
                <span className="underline decoration-terracotta decoration-2 underline-offset-4">getting it wrong</span>
                {" "}is expensive.
              </h1>
              <p className="text-base font-body text-muted-foreground leading-relaxed max-w-xl mb-8">
                For large-scale hospitality projects — hotels, resorts, restaurant openings, beach clubs — our sourcing experts handle everything from brief to delivery. One contact, multiple suppliers, zero sourcing headaches.
              </p>

              {/* Thresholds */}
              <div className="flex flex-wrap items-center gap-3 text-sm font-body mb-8">
                {[
                  { value: "100+ covers", label: "or more" },
                  { value: "€35,000+", label: "indicative budget" },
                  { value: "2+ spaces", label: "simultaneously" },
                ].map((t, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {i > 0 && <span className="text-muted-foreground text-xs">or</span>}
                    <div className="flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="font-semibold">{t.value}</span>
                      <span className="text-muted-foreground">{t.label}</span>
                    </div>
                  </div>
                ))}
              </div>

              <a href="#brief" className="inline-flex items-center gap-2 px-6 py-3 font-display font-semibold text-sm bg-terracotta text-white rounded-full hover:opacity-90 transition-opacity">
                Submit your brief <ArrowRight className="h-4 w-4" />
              </a>
            </motion.div>

            {/* Right — includes cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="grid grid-cols-2 gap-4"
            >
              {INCLUDES.map((item, i) => (
                <div key={i} className="p-4 rounded-2xl border border-border bg-card flex flex-col gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: item.accent }}>
                    <item.icon className="h-4 w-4" style={{ color: item.iconColor }} />
                  </div>
                  <h3 className="font-display font-semibold text-sm leading-snug">{item.title}</h3>
                  <p className="text-xs font-body text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS + IS THIS RIGHT FOR YOU (side by side on desktop) ── */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4 md:px-6 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Left — How it works */}
            <div>
              <h2 className="font-display text-xl font-bold tracking-tight mb-8">How it works</h2>
              <div className="grid grid-cols-2 gap-6">
                {STEPS.map((step, i) => (
                  <div key={i}>
                    <p className="text-3xl font-display font-bold text-muted-foreground/20 mb-2">{step.n}</p>
                    <h3 className="font-display font-semibold text-sm mb-1">{step.title}</h3>
                    <p className="text-sm font-body text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Is this right for you */}
            <div>
              <h2 className="font-display text-xl font-bold tracking-tight mb-8">Is this right for you?</h2>

              {/* Yes */}
              <p className="text-xs font-display font-semibold uppercase tracking-widest text-green-600 mb-3">This is for you if…</p>
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

              {/* No */}
              <p className="text-xs font-display font-semibold uppercase tracking-widest text-muted-foreground mb-3">Better options for you if…</p>
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

              {/* Redirect CTA */}
              <div className="p-4 rounded-xl border border-border bg-card">
                <p className="text-sm font-display font-semibold mb-1">Under 100 covers?</p>
                <p className="text-xs font-body text-muted-foreground leading-relaxed mb-3">
                  Our Project Builder generates curated product concepts in minutes — free, no commitment.
                </p>
                <button onClick={() => navigate("/projects/new")} className="inline-flex items-center gap-1.5 text-[11px] font-display font-bold text-foreground hover:opacity-70 transition-opacity">
                  Launch Project Builder <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FORM ── */}
      <section className="py-16 md:py-24 bg-background" id="brief">
        <div className="container mx-auto px-4 md:px-6 max-w-6xl">
          <div className="max-w-2xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
              <p className="text-xs font-display font-semibold uppercase tracking-widest text-muted-foreground mb-2">Tell us about your project</p>
              <h2 className="font-display text-2xl font-bold tracking-tight mb-2">Submit your brief</h2>
              <p className="text-sm font-body text-muted-foreground leading-relaxed mb-10">
                5 minutes. No commitment. If your project qualifies, we'll confirm within 24 hours and start working on your proposals.
              </p>

              {/* Qualification indicator */}
              <AnimatePresence>
                {(form.covers || form.budget) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className={`flex items-start gap-3 p-4 rounded-xl border mb-8 ${qualified ? 'border-green-200 bg-green-50/50' : 'border-amber-200 bg-amber-50/50'}`}
                  >
                    <span className={`text-sm font-semibold ${qualified ? 'text-green-600' : 'text-amber-600'}`}>{qualified ? "✓" : "○"}</span>
                    <p className={`text-sm font-body ${qualified ? 'text-green-700' : 'text-amber-700'}`}>
                      {qualified
                        ? "Your project qualifies for Pro Service — submit to confirm."
                        : `Pro Service is for projects with 100+ covers or €35,000+ budget. Below this threshold, our Project Builder is the right tool.`}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-5">
                {/* Contact */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Full name *</label>
                    <input type="text" value={form.name} onChange={handle("name")} placeholder="Jean Dupont" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Company</label>
                    <input type="text" value={form.company} onChange={handle("company")} placeholder="Hôtel Les Pins" className={inputClass} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Email *</label>
                    <input type="email" value={form.email} onChange={handle("email")} placeholder="jean@hotel.fr" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Phone *</label>
                    <input type="tel" value={form.phone} onChange={handle("phone")} placeholder="+33 6 12 34 56 78" className={inputClass} />
                  </div>
                </div>

                {/* Project */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Establishment type *</label>
                    <select value={form.establishmentType} onChange={handle("establishmentType")} className={inputClass}>
                      <option value="">Select...</option>
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
                    <label className={labelClass}>Location *</label>
                    <input type="text" value={form.location} onChange={handle("location")} placeholder="Nice, France" className={inputClass} />
                  </div>
                </div>

                {/* Qualification fields */}
                <div className="border border-border rounded-2xl p-5 bg-muted/20">
                  <p className="text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                    Project scale — used to confirm eligibility
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>
                        Number of covers / seats
                        <span className="font-normal normal-case tracking-normal text-muted-foreground"> (all spaces)</span>
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
                        Indicative budget
                        <span className="font-normal normal-case tracking-normal text-muted-foreground"> (excl. delivery)</span>
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

                {/* Optional details */}
                <button type="button" onClick={() => setShowOptional(!showOptional)}
                  className="w-full flex items-center justify-between text-xs font-body text-muted-foreground hover:text-foreground transition-colors py-1">
                  + Project details (spaces, style, timeline, constraints)
                  <ChevronDown className={`h-4 w-4 transition-transform ${showOptional ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {showOptional && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Spaces to furnish</label>
                          <input type="text" value={form.spaces} onChange={handle("spaces")} placeholder="Terrace, pool deck, garden" className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Timeline</label>
                          <input type="text" value={form.timeline} onChange={handle("timeline")} placeholder="Opening June 2026" className={inputClass} />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Style direction</label>
                        <input type="text" value={form.style} onChange={handle("style")} placeholder="Mediterranean, natural tones, rope & teak" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Technical constraints</label>
                        <input type="text" value={form.constraints} onChange={handle("constraints")} placeholder="Wind-exposed terrace, stackable for winter storage" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Additional notes</label>
                        <textarea value={form.notes} onChange={handle("notes")} placeholder="Anything else we should know..." rows={3} className={`${inputClass} rounded-2xl`} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* SIREN */}
                <div>
                  <label className={labelClass}>
                    SIREN <span className="font-normal text-muted-foreground normal-case tracking-normal">(optional — for faster processing)</span>
                  </label>
                  <input type="text" value={form.siren}
                    onChange={e => setForm(p => ({ ...p, siren: e.target.value.replace(/\D/g, "").slice(0, 9) }))}
                    placeholder="123456789" className={inputClass} />
                </div>

                {/* Submit */}
                <div className="pt-2">
                  <button onClick={handleSubmit} disabled={submitting}
                    className="w-full py-4 font-display font-semibold text-sm bg-terracotta text-white rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2">
                    {submitting ? "Submitting..." : <>Submit project brief <ArrowRight className="h-4 w-4" /></>}
                  </button>
                  <p className="text-[10px] text-muted-foreground font-body text-center mt-3 leading-relaxed">
                    No commitment · Our team confirms eligibility within 24h · Free for the client
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ProService;
