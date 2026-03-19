import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import {
  CheckCircle2, ArrowRight, Shield, TrendingUp,
  Package, BarChart3, ChevronDown, Zap, Factory, Palette,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "Free",
    sub: "Until your 3rd confirmed order then 8% commission",
    commission: "8%",
    badge: { label: "No risk", bg: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" },
    features: [
      { ok: true, label: "Up to 30 products" },
      { ok: true, label: "8% commission on confirmed orders" },
      { ok: true, label: "Logo + description visible on partner profile" },
      { ok: true, label: "Access to incoming quote requests" },
      { ok: true, label: "Partner profile page with logo & description" },
      { ok: false, label: "Analytics dashboard" },
      { ok: false, label: "Verified Partner badge" },
      { ok: false, label: "Leads 24h in advance" },
    ],
    note: "6-month renewable contract. Automatically upgrades to Growth at your 3rd confirmed order.",
  },
  {
    id: "growth",
    name: "Growth",
    price: "249€ HT",
    sub: "/month · auto-activated at your 3rd confirmed order · 5% commission",
    commission: "5%",
    badge: { label: "Most popular", bg: "hsl(var(--foreground))", color: "hsl(var(--primary-foreground))" },
    features: [
      { ok: true, label: "Up to 50 products" },
      { ok: true, label: "5% commission (save vs 8%)" },
      { ok: true, label: "Logo visible on partner profile & product cards" },
      { ok: true, label: "2 featured products boosted in recommendation engine" },
      { ok: true, label: "Verified Partner badge" },
      { ok: true, label: "Analytics dashboard — views, quotes, orders" },
      { ok: true, label: "Leads 24h before Starter partners" },
      { ok: true, label: "Stock sync via CSV" },
    ],
    note: "6-month renewable contract. At €8,300/month in orders, the commission saving covers the subscription.",
    featured: true,
  },
  {
    id: "elite",
    name: "Elite",
    price: "Custom",
    sub: "Negotiated · for established CHR brands",
    commission: "3%",
    badge: { label: "By invitation", bg: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" },
    features: [
      { ok: true, label: "Product catalogue — volume defined by contract" },
      { ok: true, label: "3% commission only" },
      { ok: true, label: "Logo + Brand name visible across the platform" },
      { ok: true, label: "10 featured products — maximum priority" },
      { ok: true, label: "Dedicated branded page with gallery & showroom photos" },
      { ok: true, label: "Dedicated account manager" },
      { ok: true, label: "Real-time API stock sync" },
      { ok: true, label: "Advanced analytics + export" },
      { ok: true, label: "Co-marketing with Terrassea" },
      { ok: true, label: "Access to Pro Service leads" },
    ],
    note: "6-month renewable contract. For established brands with significant CHR volume. Contact us to discuss terms and pricing.",
  },
];

const WHY = [
  {
    icon: Zap,
    title: "Qualified leads",
    desc: "Every quote request comes with project details, quantity, budget and SIREN. No tyre-kickers.",
  },
  {
    icon: TrendingUp,
    title: "Growing network",
    desc: "500+ hospitality professionals across Europe sourcing outdoor furniture. Your products in front of the right buyers.",
  },
  {
    icon: Shield,
    title: "Controlled marketplace",
    desc: "Your identity is protected until order confirmation. No direct contact before Terrassea validates the lead.",
  },
  {
    icon: BarChart3,
    title: "Market data",
    desc: "See which styles, budgets and regions are most active. Adjust your catalogue and pricing accordingly.",
  },
];

const CATEGORIES = [
  "Chairs", "Armchairs", "Bar Stools", "Benches",
  "Dining Tables", "Coffee Tables", "High Tables",
  "Sun Loungers", "Sofas / Lounge", "Parasols",
  "Pergolas / Shade", "Accessories",
];

const COUNTRIES = [
  "France", "Italy", "Spain", "Germany", "Portugal",
  "Netherlands", "Belgium", "United Kingdom", "Switzerland",
  "Austria", "Denmark", "Sweden", "Poland", "Turkey",
  "China", "Vietnam", "Indonesia",
];

type Phase = "form" | "submitted";

const BecomePartner = () => {
  const navigate = useNavigate();
  const [path, setPath] = useState<'supplier' | null>(null);
  const [phase, setPhase] = useState<Phase>("form");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showOptional, setShowOptional] = useState(false);

  const [form, setForm] = useState({
    companyName: "", contactName: "", email: "", phone: "",
    website: "", vatNumber: "", country: "",
    partnerType: "" as "manufacturer" | "brand" | "reseller" | "",
    productCategories: [] as string[],
    estimatedVolume: "", deliveryCountries: [] as string[],
    message: "",
  });
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
        <p className="text-[10px] font-display font-bold uppercase tracking-[.2em] text-muted-foreground mb-4">
          Become a Partner
        </p>
        <h1 className="font-display text-3xl font-bold text-foreground text-center mb-10">
          What best describes you?
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-2xl">
          <button onClick={() => setPath('supplier')}
            className="text-left border border-border rounded-xl p-7 hover:border-foreground transition-all group bg-card">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-5">
              <Factory className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <p className="font-display font-bold text-lg text-foreground mb-2">
              Brand, Manufacturer or Reseller
            </p>
            <p className="text-sm font-body text-muted-foreground leading-relaxed">
              You supply outdoor CHR furniture and want to reach hospitality buyers across Europe.
            </p>
          </button>
          <Link to="/pro-service"
            className="text-left border border-border rounded-xl p-7 hover:border-foreground transition-all group bg-card">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-5">
              <Palette className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <p className="font-display font-bold text-lg text-foreground mb-2">
              Designer or Architect
            </p>
            <p className="text-sm font-body text-muted-foreground leading-relaxed">
              You design hospitality spaces. Sourcing support and curated products — at no cost.
            </p>
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );

  const [form, setForm] = useState({
    companyName: "", contactName: "", email: "", phone: "",
    website: "", vatNumber: "", country: "",
    partnerType: "" as "manufacturer" | "brand" | "reseller" | "",
    productCategories: [] as string[],
    estimatedVolume: "", deliveryCountries: [] as string[],
    message: "",
  });

  const handle = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }));

  const toggleCategory = (cat: string) =>
    setForm((p) => ({
      ...p,
      productCategories: p.productCategories.includes(cat)
        ? p.productCategories.filter((c) => c !== cat)
        : [...p.productCategories, cat],
    }));

  const toggleCountry = (c: string) =>
    setForm((p) => ({
      ...p,
      deliveryCountries: p.deliveryCountries.includes(c)
        ? p.deliveryCountries.filter((x) => x !== c)
        : [...p.deliveryCountries, c],
    }));

  const handleSubmit = async () => {
    if (!form.companyName || !form.contactName || !form.email || !form.country || !form.partnerType) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (form.productCategories.length === 0) {
      toast.error("Please select at least one product category.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("partner_applications").insert({
        company_name: form.companyName,
        contact_name: form.contactName,
        contact_email: form.email,
        phone: form.phone || null,
        website: form.website || null,
        vat_number: form.vatNumber || null,
        country: form.country,
        partner_type: form.partnerType as "manufacturer" | "brand" | "reseller",
        product_categories: form.productCategories,
        estimated_annual_volume: form.estimatedVolume || null,
        delivery_countries: form.deliveryCountries,
        message: form.message || null,
        status: "pending",
      });
      if (error) throw error;
      setPhase("submitted");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full text-sm font-body bg-card border border-border rounded-full px-4 py-2.5 focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/50";
  const labelClass =
    "text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5";

  // ── Submitted phase ──
  if (phase === "submitted") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <section className="pt-32 pb-24 px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="container mx-auto max-w-lg text-center"
          >
            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-8 w-8 text-accent-foreground" />
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Application received
            </h1>
            <p className="mt-2 font-display text-lg text-muted-foreground">
              Thank you, {form.companyName}
            </p>
            <p className="mt-4 font-body text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
              We'll review your application and get back to you within 48–72 hours.
              If approved, you'll receive an email with your access link and onboarding instructions.
            </p>
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() => navigate("/")}
                className="px-6 py-3 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
              >
                Back to homepage
              </button>
              <button
                onClick={() => navigate("/products")}
                className="px-6 py-3 font-display font-semibold text-sm border border-border text-muted-foreground rounded-full hover:border-foreground hover:text-foreground transition-all"
              >
                Browse catalogue
              </button>
            </div>
          </motion.div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Fond coloré */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-[#D4603A]/8 via-background to-background" />
          <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full opacity-15" style={{ background: "radial-gradient(circle, #D4603A 0%, transparent 70%)" }} />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #4A90A4 0%, transparent 70%)" }} />
        </div>
        <div className="container mx-auto max-w-3xl text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-xs font-display font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Terrassea Partner Programme
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
              Reach Europe's hospitality
              <br className="hidden md:block" />
              {" "}professionals directly.
            </h1>
            <p className="mt-6 font-body text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Join the Terrassea partner network and put your outdoor furniture catalogue
              in front of restaurants, hotels, beach clubs and architects actively sourcing for their projects.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
              {[
                "500+ hospitality professionals",
                "12 European countries",
                "Qualified leads with project details",
                "Free to start",
              ].map((item) => (
                <span
                  key={item}
                  className="flex items-center gap-1.5 text-xs font-body text-muted-foreground"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-foreground" />
                  {item}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-10 px-6 border-b border-border">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Zap, title: "Qualified leads", desc: "Project details, quantity, budget and SIREN. No tyre-kickers.", color: "#D4603A", bg: "rgba(212,96,58,0.08)" },
              { icon: TrendingUp, title: "Growing network", desc: "500+ hospitality professionals across Europe actively sourcing.", color: "#4A90A4", bg: "rgba(74,144,164,0.08)" },
              { icon: Shield, title: "Protected identity", desc: "Your name is revealed only after order confirmation.", color: "#6B7B5E", bg: "rgba(107,123,94,0.08)" },
              { icon: BarChart3, title: "Market data", desc: "See which styles and regions are most active.", color: "#C4956A", bg: "rgba(196,149,106,0.08)" },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="p-4 rounded-sm border border-border relative overflow-hidden"
                style={{ background: item.bg }}
              >
                <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: item.color }} />
                <div className="w-7 h-7 rounded-full flex items-center justify-center mb-3" style={{ background: `${item.color}20` }}>
                  <item.icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                </div>
                <p className="font-display font-bold text-xs text-foreground mb-1">{item.title}</p>
                <p className="text-[10px] font-body text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Plans ── */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <p className="text-xs font-display font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Partner plans
            </p>
            <h2 className="font-display text-3xl font-bold text-foreground">
              Start free, grow on your terms
            </h2>
            <p className="mt-3 font-body text-sm text-muted-foreground max-w-lg mx-auto">
              No upfront cost. You pay commission only on confirmed orders.
              Growth unlocks automatically at your 3rd confirmed order.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-card rounded-2xl border p-6 ${
                  plan.featured ? "border-foreground ring-1 ring-foreground" : "border-border"
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-foreground text-primary-foreground text-[10px] font-display font-semibold px-3 py-1 rounded-full">
                    Most popular
                  </div>
                )}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-bold text-lg text-foreground">{plan.name}</h3>
                  <span
                    className="text-[10px] font-display font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: plan.badge.bg, color: plan.badge.color }}
                  >
                    {plan.badge.label}
                  </span>
                </div>
                <p className="font-display text-3xl font-bold text-foreground">{plan.price}</p>
                <p className="text-xs font-body text-muted-foreground mt-1">{plan.sub}</p>
                <div className="mt-4 mb-5 inline-flex items-center gap-1.5 bg-muted rounded-full px-3 py-1.5">
                  <span className="font-display font-bold text-sm text-foreground">{plan.commission}</span>
                  <span className="text-[10px] font-body text-muted-foreground">commission</span>
                </div>
                <ul className="space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f.label} className="flex items-start gap-2 text-xs font-body">
                      <span
                        className={`mt-0.5 text-[10px] font-semibold w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                          f.ok
                            ? "bg-foreground text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {f.ok ? "✓" : "✗"}
                      </span>
                      <span className={f.ok ? "text-foreground" : "text-muted-foreground"}>{f.label}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => {
                    setSelectedPlan(plan.id);
                    document.getElementById("apply")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className={`w-full py-2.5 mt-3 font-display font-semibold text-xs rounded-full transition-all ${
                    plan.featured
                      ? "bg-foreground text-primary-foreground hover:opacity-90"
                      : "border border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {plan.id === "elite" ? "Contact us →" : "Apply with this plan →"}
                </button>
                <p className="mt-5 text-[10px] font-body text-muted-foreground leading-relaxed border-t border-border pt-4">
                  {plan.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Application form ── */}
      <section className="py-20 px-6 bg-muted/30" id="apply">
        <div className="container mx-auto max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-card rounded-2xl border border-border p-8 md:p-10"
          >
            {selectedPlan && (
              <div className="flex items-center gap-2 mb-6 px-4 py-2.5 bg-card border border-border rounded-full w-fit">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs font-display font-semibold text-foreground capitalize">
                  {selectedPlan} plan selected
                </span>
                <button onClick={() => setSelectedPlan(null)} className="text-muted-foreground hover:text-foreground ml-1 text-sm">×</button>
              </div>
            )}
            <p className="text-xs font-display font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Apply to join
            </p>
            <h2 className="font-display text-2xl font-bold text-foreground">
              Partner application
            </h2>
            <p className="mt-3 font-body text-sm text-muted-foreground leading-relaxed max-w-md">
              We review every application manually. If approved, you'll receive access
              within 48–72 hours and start on the Starter plan — free until your 3rd confirmed order.
            </p>

            <div className="mt-8 space-y-5">
              {/* Company info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Company name *</label>
                  <input value={form.companyName} onChange={handle("companyName")} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Contact name *</label>
                  <input value={form.contactName} onChange={handle("contactName")} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Email *</label>
                  <input type="email" value={form.email} onChange={handle("email")} placeholder="you@company.com" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input value={form.phone} onChange={handle("phone")} placeholder="+33…" className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Country *</label>
                  <select value={form.country} onChange={handle("country")} className={inputClass}>
                    <option value="">Select country...</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Type *</label>
                  <select
                    value={form.partnerType}
                    onChange={(e) => setForm((p) => ({ ...p, partnerType: e.target.value as any }))}
                    className={inputClass}
                  >
                    <option value="">Select type...</option>
                    <option value="manufacturer">Manufacturer</option>
                    <option value="brand">Brand</option>
                    <option value="reseller">Reseller / Distributor</option>
                  </select>
                </div>
              </div>

              {/* Product categories */}
              <div>
                <label className={labelClass}>
                  Product categories *{" "}
                  <span className="font-normal normal-case tracking-normal">(select all that apply)</span>
                </label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`text-[11px] font-body px-2.5 py-1 rounded-full border transition-all ${
                        form.productCategories.includes(cat)
                          ? "bg-foreground text-primary-foreground border-foreground"
                          : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional details */}
              <button
                type="button"
                onClick={() => setShowOptional(!showOptional)}
                className="w-full flex items-center justify-between text-xs font-body text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                + Additional details (website, VAT, delivery countries, annual volume)
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showOptional ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {showOptional && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Website</label>
                        <input value={form.website} onChange={handle("website")} placeholder="https://…" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>VAT / SIRET number</label>
                        <input value={form.vatNumber} onChange={handle("vatNumber")} className={inputClass} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Estimated annual CHR volume</label>
                      <select value={form.estimatedVolume} onChange={handle("estimatedVolume")} className={inputClass}>
                        <option value="">Select range...</option>
                        <option value="under_50k">Under €50,000</option>
                        <option value="50k_200k">€50,000 – €200,000</option>
                        <option value="200k_500k">€200,000 – €500,000</option>
                        <option value="over_500k">Over €500,000</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Delivery countries</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {COUNTRIES.slice(0, 12).map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => toggleCountry(c)}
                            className={`text-[11px] font-body px-2.5 py-1 rounded-full border transition-all ${
                              form.deliveryCountries.includes(c)
                                ? "bg-foreground text-primary-foreground border-foreground"
                                : "border-border text-muted-foreground hover:border-foreground"
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Message */}
              <div>
                <label className={labelClass}>
                  Tell us about your catalogue <span className="font-normal normal-case tracking-normal">(optional)</span>
                </label>
                <textarea
                  value={form.message}
                  onChange={handle("message")}
                  rows={3}
                  className="w-full text-sm font-body bg-card border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/50 resize-none"
                  placeholder="Materials, styles, price range, anything relevant…"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-4 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {submitting ? "Submitting..." : (
                  <>Submit application <ArrowRight className="h-4 w-4" /></>
                )}
              </button>

              <div className="flex items-center gap-2 mt-2">
                <Shield className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <p className="text-[10px] font-body text-muted-foreground leading-relaxed">
                  Every application is reviewed manually. We reply within 48–72h.
                  Approved partners start on the Starter plan — free until their 3rd confirmed order.
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

export default BecomePartner;
