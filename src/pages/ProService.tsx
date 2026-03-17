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

// ── What's included ──────────────────────────────────────────────────────────

const INCLUDES = [
  {
    icon: Clock,
    title: "48h expert brief",
    desc: "A Terrassea sourcing expert analyses your project and comes back with a tailored approach within 48 business hours.",
  },
  {
    icon: Sparkles,
    title: "3 curated proposals",
    desc: "Products selected to match your space, style, budget and technical constraints — with matched suppliers and net pricing.",
  },
  {
    icon: Users,
    title: "Multi-supplier coordination",
    desc: "One point of contact for all quotes, delivery scheduling and supplier follow-up. We consolidate the complexity.",
  },
  {
    icon: Shield,
    title: "Free for the client",
    desc: "Our fee is paid by suppliers on confirmed orders. You get expert sourcing at zero cost.",
  },
];

// ── Who it's for ─────────────────────────────────────────────────────────────

const FOR_WHO = [
  { check: true, label: "Hotel with multiple outdoor spaces", sub: "Terrace + pool deck + garden = complex multi-supplier coordination" },
  { check: true, label: "New restaurant opening, 100+ covers", sub: "Volume + deadline + first-time procurement = you need an expert" },
  { check: true, label: "Resort or seasonal beach club", sub: "Marine-grade specs + volume orders + tight seasonal deadlines" },
  { check: true, label: "Architect managing several client projects", sub: "Multi-project coordination and pro pricing across all orders" },
  { check: false, label: "Restaurant under 100 covers, budget < €25k", sub: "→ Our Project Builder is built exactly for you" },
  { check: false, label: "Replacing a few individual pieces", sub: "→ Browse the catalogue and request a direct quote" },
];

// ── Process steps ─────────────────────────────────────────────────────────────

const STEPS = [
  { n: "01", title: "You describe", desc: "Fill in the project brief below. 5 minutes, no commitment." },
  { n: "02", title: "We qualify", desc: "Our team reviews your request within 24 hours and confirms we can help." },
  { n: "03", title: "We source", desc: "3 curated product proposals with matched suppliers and pricing, within 5 business days." },
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
      setForm((p) => ({ ...p, [field]: e.target.value }));

  const coversNum = form.covers ? parseInt(form.covers) : null;
  const qualified = isQualified(coversNum, form.budget);

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.phone || !form.establishmentType || !form.location) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (!qualified) {
      setPhase("not_qualified");
      return;
    }

    setSubmitting(true);
    try {
      await supabase.from("project_requests").insert({
        project_name: `Pro Service — ${form.company || form.name}`,
        contact_name: form.name,
        contact_company: form.company,
        contact_email: form.email,
        contact_phone: form.phone,
        city: form.location,
        budget_range: form.budget,
        timeline: form.timeline,
        free_text_request: `${form.notes}\n\nType: ${form.establishmentType}\nCovers: ${form.covers}\nSpaces: ${form.spaces}\nStyle: ${form.style}\nConstraints: ${form.constraints}`,
        detected_attributes: {
          service_type: "pro_service",
          siren: form.siren,
          covers: coversNum,
          spaces: form.spaces,
        },
      });
      setPhase("submitted");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full text-sm font-body bg-card border border-border rounded-full px-4 py-2.5 focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/50";
  const labelClass = "text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5";

  // ── Submitted ──

  if (phase === "submitted") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-6 py-32 max-w-xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight mb-2">
              Request received
            </h1>
            <p className="text-sm font-body text-muted-foreground mb-4">
              We'll be in touch within 24 hours.
            </p>
            <p className="text-sm font-body text-muted-foreground leading-relaxed mb-8">
              Our sourcing team has your brief. We'll review it and confirm we can help — then get started on your 3 proposals within 5 business days.
            </p>
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 px-6 py-3 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
            >
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
        <div className="container mx-auto px-6 py-32 max-w-xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="h-8 w-8 text-amber-600" />
            </div>
            <h1 className="font-display text-xl font-bold tracking-tight mb-4">
              Great news — your project is a perfect fit for our Project Builder.
            </h1>
            <p className="text-sm font-body text-muted-foreground leading-relaxed mb-4">
              Pro Service is designed for projects above {MIN_COVERS} covers or €{MIN_BUDGET.toLocaleString()} budget. Your project looks like it's well-served by our self-service tools — faster, simpler, and just as effective.
            </p>
            <p className="text-sm font-body text-muted-foreground leading-relaxed mb-8">
              Describe your project in the builder and get 3 curated product concepts in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate("/projects/new")}
                className="flex items-center justify-center gap-2 px-6 py-3 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
              >
                Launch Project Builder <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPhase("form")}
                className="flex items-center justify-center gap-2 px-6 py-3 font-display font-semibold text-sm border border-border text-muted-foreground rounded-full hover:border-foreground hover:text-foreground transition-all"
              >
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

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 bg-background">
        <div className="container mx-auto px-6 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="text-xs font-display font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Terrassea Pro Service
            </p>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-6">
              Not for every project —<br />
              for the ones where getting it wrong is expensive.
            </h1>
            <p className="text-base font-body text-muted-foreground leading-relaxed max-w-2xl mb-10">
              For large-scale hospitality projects — hotels, resorts, restaurant openings, beach clubs — our sourcing experts handle everything from brief to delivery. One contact, multiple suppliers, zero sourcing headaches.
            </p>

            {/* Qualification thresholds */}
            <div className="flex flex-wrap items-center gap-4 text-sm font-body">
              <div className="flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="font-semibold">100+ covers</span>
                <span className="text-muted-foreground">or more</span>
              </div>
              <span className="text-muted-foreground">or</span>
              <div className="flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="font-semibold">€35,000+</span>
                <span className="text-muted-foreground">indicative budget</span>
              </div>
              <span className="text-muted-foreground">or</span>
              <div className="flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="font-semibold">2+ spaces</span>
                <span className="text-muted-foreground">to furnish simultaneously</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── What's included ── */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6 max-w-3xl">
          <h2 className="font-display text-xl font-bold tracking-tight mb-10">
            What's included
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {INCLUDES.map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center shrink-0">
                  <item.icon className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-sm mb-1">{item.title}</h3>
                  <p className="text-sm font-body text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Process ── */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6 max-w-3xl">
          <h2 className="font-display text-xl font-bold tracking-tight mb-10">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {STEPS.map((step, i) => (
              <div key={i}>
                <p className="text-3xl font-display font-bold text-muted-foreground/20 mb-2">{step.n}</p>
                <h3 className="font-display font-semibold text-sm mb-1">{step.title}</h3>
                <p className="text-sm font-body text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For who ── */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6 max-w-3xl">
          <h2 className="font-display text-xl font-bold tracking-tight mb-10">
            Is this right for you?
          </h2>
          <div className="space-y-4">
            {FOR_WHO.map((item, i) => (
              <div key={i} className={`flex gap-4 p-4 rounded-xl border ${item.check ? 'border-green-200 bg-green-50/50' : 'border-border bg-card'}`}>
                <span className={`text-lg font-semibold mt-0.5 ${item.check ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {item.check ? "✓" : "→"}
                </span>
                <div>
                  <p className={`text-sm font-display font-semibold ${item.check ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {item.label}
                  </p>
                  <p className="text-xs font-body text-muted-foreground mt-0.5">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Form ── */}
      <section className="py-20 bg-background" id="brief">
        <div className="container mx-auto px-6 max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <p className="text-xs font-display font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Tell us about your project
            </p>
            <h2 className="font-display text-2xl font-bold tracking-tight mb-2">
              Submit your brief
            </h2>
            <p className="text-sm font-body text-muted-foreground leading-relaxed mb-10">
              5 minutes. No commitment. If your project qualifies, we'll confirm within 24 hours and start working on your proposals.
            </p>

            {/* Qualification indicator */}
            <AnimatePresence>
              {(form.covers || form.budget) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`flex items-start gap-3 p-4 rounded-xl border mb-8 ${qualified ? 'border-green-200 bg-green-50/50' : 'border-amber-200 bg-amber-50/50'}`}
                >
                  <span className={`text-sm font-semibold ${qualified ? 'text-green-600' : 'text-amber-600'}`}>
                    {qualified ? "✓" : "○"}
                  </span>
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
                      <span className="font-normal normal-case tracking-normal text-muted-foreground"> (total across all spaces)</span>
                    </label>
                    <input
                      type="number"
                      value={form.covers}
                      onChange={handle("covers")}
                      placeholder="e.g. 200"
                      className={`${inputClass} ${
                        coversNum && coversNum >= MIN_COVERS ? "border-green-500" :
                        coversNum && coversNum < MIN_COVERS ? "border-amber-400" : ""
                      }`}
                    />
                    {coversNum !== null && (
                      <p className={`text-[10px] font-body mt-1.5 ${coversNum >= MIN_COVERS ? "text-green-600" : "text-amber-600"}`}>
                        {coversNum >= MIN_COVERS ? `✓ Qualifies (100+ covers)` : `Min. ${MIN_COVERS} covers for Pro Service`}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>
                      Indicative budget
                      <span className="font-normal normal-case tracking-normal text-muted-foreground"> (furniture only, excl. delivery)</span>
                    </label>
                    <input
                      type="text"
                      value={form.budget}
                      onChange={handle("budget")}
                      placeholder="e.g. €50,000"
                      className={`${inputClass} ${
                        parseBudget(form.budget) && parseBudget(form.budget)! >= MIN_BUDGET ? "border-green-500" :
                        parseBudget(form.budget) && parseBudget(form.budget)! < MIN_BUDGET ? "border-amber-400" : ""
                      }`}
                    />
                    {parseBudget(form.budget) !== null && (
                      <p className={`text-[10px] font-body mt-1.5 ${parseBudget(form.budget)! >= MIN_BUDGET ? "text-green-600" : "text-amber-600"}`}>
                        {parseBudget(form.budget)! >= MIN_BUDGET ? `✓ Qualifies (€35k+)` : `Min. €${MIN_BUDGET.toLocaleString()} for Pro Service`}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Optional details */}
              <button
                type="button"
                onClick={() => setShowOptional(!showOptional)}
                className="w-full flex items-center justify-between text-xs font-body text-muted-foreground hover:text-foreground transition-colors py-1"
              >
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
                <label className={labelClass}>SIREN <span className="font-normal text-muted-foreground normal-case tracking-normal">(optional — for faster processing)</span></label>
                <input type="text" value={form.siren} onChange={(e) => setForm(p => ({ ...p, siren: e.target.value.replace(/\D/g, "").slice(0, 9) }))} placeholder="123456789" className={inputClass} />
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full py-4 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {submitting ? "Submitting..." : <>Submit project brief <ArrowRight className="h-4 w-4" /></>}
                </button>
                <p className="text-[10px] text-muted-foreground font-body text-center mt-3 leading-relaxed">
                  No commitment · Our team confirms eligibility within 24h · Free for the client
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ProService;
