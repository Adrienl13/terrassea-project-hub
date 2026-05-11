import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Sparkles, Check, ArrowRight, Crown, Star, Award,
  TrendingUp, Users, Zap, Gift, Lock, Building2, Palette,
  Truck, Briefcase,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

export default function BecomePartnerLaunch() {
  const { t } = useTranslation();

  const benefits = [
    { icon: Award, key: "benefitBadge" },
    { icon: Star, key: "benefitPriority" },
    { icon: TrendingUp, key: "benefitFeatured" },
    { icon: Gift, key: "benefitCommission" },
    { icon: Zap, key: "benefitBeta" },
    { icon: Users, key: "benefitNetwork" },
  ] as const;

  const inviteCategories = [
    { icon: Palette, key: "architects" },
    { icon: Truck, key: "distributors" },
    { icon: Sparkles, key: "designers" },
    { icon: Building2, key: "resellers" },
    { icon: Briefcase, key: "proService" },
  ] as const;

  const steps = [
    { key: "step1" },
    { key: "step2" },
    { key: "step3" },
  ] as const;

  const fadeUp = {
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: 0.5 },
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={t("becomePartnerLaunch.seoTitle")}
        description={t("becomePartnerLaunch.seoDescription")}
      />
      <Header />

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative px-6 pt-20 pb-16 md:pt-28 md:pb-24 overflow-hidden">
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-foreground text-primary-foreground text-[10px] font-display font-bold uppercase tracking-[.2em] mb-6"
          >
            <Sparkles className="h-3 w-3" />
            {t("becomePartnerLaunch.hero.badge")}
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="font-display text-4xl md:text-5xl font-bold text-foreground mb-5 leading-tight"
          >
            {t("becomePartnerLaunch.hero.title")}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-base md:text-lg font-body text-muted-foreground mb-3 max-w-2xl mx-auto leading-relaxed"
          >
            {t("becomePartnerLaunch.hero.subtitle")}
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-sm font-body font-semibold text-foreground mb-8"
          >
            {t("becomePartnerLaunch.hero.tagline")}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link
              to="/auth?mode=register&type=partner"
              className="inline-flex items-center gap-2 bg-foreground text-primary-foreground hover:opacity-90 font-display font-semibold text-sm px-7 py-3 rounded-full transition-opacity"
            >
              {t("becomePartnerLaunch.hero.cta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="text-[11px] font-body text-muted-foreground inline-flex items-center gap-1.5">
              <Lock className="h-3 w-3" />
              {t("becomePartnerLaunch.hero.noCard")}
            </span>
          </motion.div>
        </div>
      </section>

      {/* ── Comment ça marche ──────────────────────────────────── */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <motion.h2
            {...fadeUp}
            className="font-display text-2xl md:text-3xl font-bold text-foreground text-center mb-12"
          >
            {t("becomePartnerLaunch.howItWorks.title")}
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <motion.div
                key={s.key}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.08 }}
                className="bg-card border border-border rounded-xl p-6"
              >
                <div className="w-9 h-9 rounded-full bg-foreground text-primary-foreground flex items-center justify-center font-display font-bold text-sm mb-4">
                  {i + 1}
                </div>
                <h3 className="font-display font-bold text-base text-foreground mb-2">
                  {t(`becomePartnerLaunch.howItWorks.${s.key}.title`)}
                </h3>
                <p className="text-sm font-body text-muted-foreground leading-relaxed">
                  {t(`becomePartnerLaunch.howItWorks.${s.key}.desc`)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Modèle économique ──────────────────────────────────── */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-3xl">
          <motion.div {...fadeUp} className="text-center mb-10">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">
              {t("becomePartnerLaunch.business.title")}
            </h2>
            <p className="text-sm font-body text-muted-foreground max-w-xl mx-auto leading-relaxed">
              {t("becomePartnerLaunch.business.intro")}
            </p>
          </motion.div>
          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-display font-bold text-sm text-foreground mb-1">
                    {t("becomePartnerLaunch.business.pointNoSub.title")}
                  </p>
                  <p className="text-xs font-body text-muted-foreground leading-relaxed">
                    {t("becomePartnerLaunch.business.pointNoSub.desc")}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-display font-bold text-sm text-foreground mb-1">
                    {t("becomePartnerLaunch.business.pointCommission.title")}
                  </p>
                  <p className="text-xs font-body text-muted-foreground leading-relaxed">
                    {t("becomePartnerLaunch.business.pointCommission.desc")}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Programme Founding Partner (rich) ──────────────────── */}
      <section className="py-20 px-6 bg-foreground text-primary-foreground">
        <div className="container mx-auto max-w-4xl">
          <motion.div {...fadeUp} className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-foreground/10 text-[10px] font-display font-bold uppercase tracking-[.2em] mb-5">
              <Crown className="h-3 w-3" />
              {t("becomePartnerLaunch.founding.eyebrow")}
            </span>
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
              {t("becomePartnerLaunch.founding.title")}
            </h2>
            <p className="text-sm md:text-base font-body opacity-80 max-w-2xl mx-auto leading-relaxed">
              {t("becomePartnerLaunch.founding.description")}
            </p>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.1 }}
            className="bg-primary-foreground/5 border border-primary-foreground/15 rounded-xl p-6 md:p-8 mb-10"
          >
            <p className="font-display font-bold text-sm uppercase tracking-wider opacity-70 mb-3">
              {t("becomePartnerLaunch.founding.howItWorksLabel")}
            </p>
            <p className="text-sm font-body opacity-90 leading-relaxed">
              {t("becomePartnerLaunch.founding.howItWorksText")}
            </p>
          </motion.div>

          <motion.div {...fadeUp} className="mb-6">
            <p className="font-display font-bold text-sm uppercase tracking-wider opacity-70 text-center mb-6">
              {t("becomePartnerLaunch.founding.benefitsLabel")}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {benefits.map((b, i) => {
              const Icon = b.icon;
              return (
                <motion.div
                  key={b.key}
                  {...fadeUp}
                  transition={{ ...fadeUp.transition, delay: i * 0.05 }}
                  className="flex items-start gap-3 bg-primary-foreground/5 border border-primary-foreground/15 rounded-xl p-5"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary-foreground/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-sm mb-1">
                      {t(`becomePartnerLaunch.founding.benefits.${b.key}.title`)}
                    </p>
                    <p className="text-xs font-body opacity-75 leading-relaxed">
                      {t(`becomePartnerLaunch.founding.benefits.${b.key}.desc`)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.2 }}
            className="mt-10 text-center"
          >
            <p className="font-display font-bold text-sm uppercase tracking-wider opacity-70 mb-3">
              {t("becomePartnerLaunch.founding.lifetimeLabel")}
            </p>
            <p className="text-sm font-body opacity-90 max-w-2xl mx-auto leading-relaxed">
              {t("becomePartnerLaunch.founding.lifetimeText")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Catégories invitations ─────────────────────────────── */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="container mx-auto max-w-5xl">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">
              {t("becomePartnerLaunch.invites.title")}
            </h2>
            <p className="text-sm font-body text-muted-foreground max-w-xl mx-auto leading-relaxed">
              {t("becomePartnerLaunch.invites.intro")}
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {inviteCategories.map((c, i) => {
              const Icon = c.icon;
              return (
                <motion.div
                  key={c.key}
                  {...fadeUp}
                  transition={{ ...fadeUp.transition, delay: i * 0.05 }}
                  className="bg-card border border-border rounded-xl p-5 text-center"
                >
                  <div className="w-10 h-10 rounded-lg bg-muted mx-auto mb-3 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                  <p className="font-display font-bold text-sm text-foreground mb-1">
                    {t(`becomePartnerLaunch.invites.${c.key}.title`)}
                  </p>
                  <p className="text-[11px] font-body text-muted-foreground leading-relaxed">
                    {t(`becomePartnerLaunch.invites.${c.key}.desc`)}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Prochaines étapes + CTA ────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-2xl text-center">
          <motion.h2
            {...fadeUp}
            className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4"
          >
            {t("becomePartnerLaunch.nextSteps.title")}
          </motion.h2>
          <motion.ul
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.1 }}
            className="space-y-3 mb-10 text-left max-w-md mx-auto"
          >
            <li className="flex items-start gap-3 text-sm font-body text-foreground">
              <Check className="h-4 w-4 text-foreground shrink-0 mt-1" />
              <span>{t("becomePartnerLaunch.nextSteps.point1")}</span>
            </li>
            <li className="flex items-start gap-3 text-sm font-body text-foreground">
              <Check className="h-4 w-4 text-foreground shrink-0 mt-1" />
              <span>{t("becomePartnerLaunch.nextSteps.point2")}</span>
            </li>
            <li className="flex items-start gap-3 text-sm font-body text-foreground">
              <Check className="h-4 w-4 text-foreground shrink-0 mt-1" />
              <span>{t("becomePartnerLaunch.nextSteps.point3")}</span>
            </li>
          </motion.ul>
          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.2 }}
          >
            <Link
              to="/auth?mode=register&type=partner"
              className="inline-flex items-center gap-2 bg-foreground text-primary-foreground hover:opacity-90 font-display font-semibold text-sm px-8 py-3.5 rounded-full transition-opacity"
            >
              {t("becomePartnerLaunch.hero.cta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-4 text-[11px] font-body text-muted-foreground">
              {t("becomePartnerLaunch.hero.noCard")}
            </p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
