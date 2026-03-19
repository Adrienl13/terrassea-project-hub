import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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

  const PLANS = [
    {
      id: "starter",
      name: t('becomePartnerPage.starterName'),
      price: t('becomePartnerPage.starterPrice'),
      sub: t('becomePartnerPage.starterSub'),
      commission: "8%",
      badge: { label: t('becomePartnerPage.starterBadge'), bg: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" },
      features: [
        { ok: true, label: t('becomePartnerPage.starterF1') },
        { ok: true, label: t('becomePartnerPage.starterF2') },
        { ok: true, label: t('becomePartnerPage.starterF3') },
        { ok: true, label: t('becomePartnerPage.starterF4') },
        { ok: true, label: t('becomePartnerPage.starterF5') },
        { ok: false, label: t('becomePartnerPage.starterF6') },
        { ok: false, label: t('becomePartnerPage.starterF7') },
        { ok: false, label: t('becomePartnerPage.starterF8') },
      ],
      note: t('becomePartnerPage.starterNote'),
    },
    {
      id: "growth",
      name: t('becomePartnerPage.growthName'),
      price: t('becomePartnerPage.growthPrice'),
      sub: t('becomePartnerPage.growthSub'),
      commission: "5%",
      badge: { label: t('becomePartnerPage.growthBadge'), bg: "hsl(var(--foreground))", color: "hsl(var(--primary-foreground))" },
      features: [
        { ok: true, label: t('becomePartnerPage.growthF1') },
        { ok: true, label: t('becomePartnerPage.growthF2') },
        { ok: true, label: t('becomePartnerPage.growthF3') },
        { ok: true, label: t('becomePartnerPage.growthF4') },
        { ok: true, label: t('becomePartnerPage.growthF5') },
        { ok: true, label: t('becomePartnerPage.growthF6') },
        { ok: true, label: t('becomePartnerPage.growthF7') },
        { ok: true, label: t('becomePartnerPage.growthF8') },
      ],
      note: t('becomePartnerPage.growthNote'),
      featured: true,
    },
    {
      id: "elite",
      name: t('becomePartnerPage.eliteName'),
      price: t('becomePartnerPage.elitePrice'),
      sub: t('becomePartnerPage.eliteSub'),
      commission: "3%",
      badge: { label: t('becomePartnerPage.eliteBadge'), bg: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" },
      features: [
        { ok: true, label: t('becomePartnerPage.eliteF1') },
        { ok: true, label: t('becomePartnerPage.eliteF2') },
        { ok: true, label: t('becomePartnerPage.eliteF3') },
        { ok: true, label: t('becomePartnerPage.eliteF4') },
        { ok: true, label: t('becomePartnerPage.eliteF5') },
        { ok: true, label: t('becomePartnerPage.eliteF6') },
        { ok: true, label: t('becomePartnerPage.eliteF7') },
        { ok: true, label: t('becomePartnerPage.eliteF8') },
        { ok: true, label: t('becomePartnerPage.eliteF9') },
        { ok: true, label: t('becomePartnerPage.eliteF10') },
      ],
      note: t('becomePartnerPage.eliteNote'),
    },
  ];

  const WHY_ITEMS = [
    { icon: Zap, titleKey: "qualifiedLeads", descKey: "qualifiedLeadsDesc", color: "#D4603A", bg: "rgba(212,96,58,0.08)" },
    { icon: TrendingUp, titleKey: "growingNetwork", descKey: "growingNetworkDesc", color: "#4A90A4", bg: "rgba(74,144,164,0.08)" },
    { icon: Shield, titleKey: "protectedIdentity", descKey: "protectedIdentityDesc", color: "#6B7B5E", bg: "rgba(107,123,94,0.08)" },
    { icon: BarChart3, titleKey: "marketData", descKey: "marketDataDesc", color: "#C4956A", bg: "rgba(196,149,106,0.08)" },
  ];

  if (!path) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
        <p className="text-[10px] font-display font-bold uppercase tracking-[.2em] text-muted-foreground mb-4">
          {t('becomePartner.title')}
        </p>
        <h1 className="font-display text-3xl font-bold text-foreground text-center mb-10">
          {t('becomePartner.title')}
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-2xl">
          <button onClick={() => setPath('supplier')}
            className="text-left border border-border rounded-xl p-7 hover:border-foreground transition-all group bg-card">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-5">
              <Factory className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <p className="font-display font-bold text-lg text-foreground mb-2">
              {t('becomePartner.supplier')}
            </p>
            <p className="text-sm font-body text-muted-foreground leading-relaxed">
              {t('becomePartner.supplierDesc')}
            </p>
          </button>
          <Link to="/auth?mode=register&type=designer"
            className="text-left border border-border rounded-xl p-7 hover:border-foreground transition-all group bg-card">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-5">
              <Palette className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <p className="font-display font-bold text-lg text-foreground mb-2">
              {t('becomePartner.designer')}
            </p>
            <p className="text-sm font-body text-muted-foreground leading-relaxed">
              {t('becomePartner.designerDesc')}
            </p>
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );


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
      toast.error(t('becomePartnerPage.fillRequired'));
      return;
    }
    if (form.productCategories.length === 0) {
      toast.error(t('becomePartnerPage.selectCategory'));
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
      toast.error(t('becomePartnerPage.somethingWrong'));
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
              {t('becomePartnerPage.applicationReceived')}
            </h1>
            <p className="mt-2 font-display text-lg text-muted-foreground">
              {t('becomePartnerPage.thankYou')} {form.companyName}
            </p>
            <p className="mt-4 font-body text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
              {t('becomePartnerPage.applicationReviewDesc')}
            </p>
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() => navigate("/")}
                className="px-6 py-3 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
              >
                {t('becomePartnerPage.backToHomepage')}
              </button>
              <button
                onClick={() => navigate("/products")}
                className="px-6 py-3 font-display font-semibold text-sm border border-border text-muted-foreground rounded-full hover:border-foreground hover:text-foreground transition-all"
              >
                {t('becomePartnerPage.browseCatalogue')}
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
              {t('becomePartnerPage.badge')}
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight whitespace-pre-line">
              {t('becomePartnerPage.heroTitle')}
            </h1>
            <p className="mt-6 font-body text-muted-foreground max-w-xl mx-auto leading-relaxed">
              {t('becomePartnerPage.heroDesc')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
              {(['stat1', 'stat2', 'stat3', 'stat4'] as const).map((key) => (
                <span
                  key={key}
                  className="flex items-center gap-1.5 text-xs font-body text-muted-foreground"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-foreground" />
                  {t(`becomePartnerPage.${key}`)}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-10 px-6 border-b border-border">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {WHY_ITEMS.map((item, i) => (
              <motion.div
                key={item.titleKey}
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
                <p className="font-display font-bold text-xs text-foreground mb-1">{t(`becomePartnerPage.${item.titleKey}`)}</p>
                <p className="text-[10px] font-body text-muted-foreground leading-relaxed">{t(`becomePartnerPage.${item.descKey}`)}</p>
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
              {t('becomePartnerPage.partnerPlans')}
            </p>
            <h2 className="font-display text-3xl font-bold text-foreground">
              {t('becomePartnerPage.plansTitle')}
            </h2>
            <p className="mt-3 font-body text-sm text-muted-foreground max-w-lg mx-auto">
              {t('becomePartnerPage.plansDesc')}
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
                    {t('becomePartnerPage.growthBadge')}
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
                  <span className="text-[10px] font-body text-muted-foreground">{t('becomePartnerPage.commission')}</span>
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
                  {plan.id === "elite" ? t('becomePartnerPage.contactUs') : t('becomePartnerPage.applyWithPlan')}
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
                  {selectedPlan} {t('becomePartnerPage.planSelected')}
                </span>
                <button onClick={() => setSelectedPlan(null)} className="text-muted-foreground hover:text-foreground ml-1 text-sm">×</button>
              </div>
            )}
            <p className="text-xs font-display font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              {t('becomePartnerPage.applyToJoin')}
            </p>
            <h2 className="font-display text-2xl font-bold text-foreground">
              {t('becomePartnerPage.partnerApplication')}
            </h2>
            <p className="mt-3 font-body text-sm text-muted-foreground leading-relaxed max-w-md">
              {t('becomePartnerPage.applicationDesc')}
            </p>

            <div className="mt-8 space-y-5">
              {/* Company info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t('becomePartnerPage.companyName')} *</label>
                  <input value={form.companyName} onChange={handle("companyName")} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t('becomePartnerPage.contactName')} *</label>
                  <input value={form.contactName} onChange={handle("contactName")} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t('forms.email')} *</label>
                  <input type="email" value={form.email} onChange={handle("email")} placeholder={t('forms.emailPlaceholder')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t('forms.phone')}</label>
                  <input value={form.phone} onChange={handle("phone")} placeholder={t('forms.phonePlaceholder')} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t('forms.country')} *</label>
                  <select value={form.country} onChange={handle("country")} className={inputClass}>
                    <option value="">{t('becomePartnerPage.selectCountry')}</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{t('becomePartnerPage.type')} *</label>
                  <select
                    value={form.partnerType}
                    onChange={(e) => setForm((p) => ({ ...p, partnerType: e.target.value as any }))}
                    className={inputClass}
                  >
                    <option value="">{t('becomePartnerPage.selectType')}</option>
                    <option value="manufacturer">{t('becomePartnerPage.manufacturer')}</option>
                    <option value="brand">{t('becomePartnerPage.brand')}</option>
                    <option value="reseller">{t('becomePartnerPage.resellerDistributor')}</option>
                  </select>
                </div>
              </div>

              {/* Product categories */}
              <div>
                <label className={labelClass}>
                  {t('becomePartnerPage.productCategories')} *{" "}
                  <span className="font-normal normal-case tracking-normal">({t('becomePartnerPage.selectAllApply')})</span>
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
                + {t('becomePartnerPage.additionalDetails')}
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
                        <label className={labelClass}>{t('forms.website')}</label>
                        <input value={form.website} onChange={handle("website")} placeholder="https://…" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>{t('becomePartnerPage.vatSiret')}</label>
                        <input value={form.vatNumber} onChange={handle("vatNumber")} className={inputClass} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>{t('becomePartnerPage.estimatedVolume')}</label>
                      <select value={form.estimatedVolume} onChange={handle("estimatedVolume")} className={inputClass}>
                        <option value="">{t('becomePartnerPage.selectRange')}</option>
                        <option value="under_50k">Under €50,000</option>
                        <option value="50k_200k">€50,000 – €200,000</option>
                        <option value="200k_500k">€200,000 – €500,000</option>
                        <option value="over_500k">Over €500,000</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>{t('becomePartnerPage.deliveryCountries')}</label>
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
                  {t('becomePartnerPage.tellAboutCatalogue')} <span className="font-normal normal-case tracking-normal">({t('becomePartnerPage.optional')})</span>
                </label>
                <textarea
                  value={form.message}
                  onChange={handle("message")}
                  rows={3}
                  className="w-full text-sm font-body bg-card border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/50 resize-none"
                  placeholder={t('forms.messagePlaceholder')}
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-4 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {submitting ? t('becomePartnerPage.submitting') : (
                  <>{t('becomePartnerPage.submitApplication')} <ArrowRight className="h-4 w-4" /></>
                )}
              </button>

              <div className="flex items-center gap-2 mt-2">
                <Shield className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <p className="text-[10px] font-body text-muted-foreground leading-relaxed">
                  {t('becomePartnerPage.reviewNotice')}
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
