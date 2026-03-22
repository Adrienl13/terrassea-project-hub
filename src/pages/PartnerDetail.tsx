import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SEO from "@/components/SEO";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFavouritePartners } from "@/hooks/useFavouritesDB";
import { ml } from "@/lib/i18nFields";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Lock, Package, Globe,
  Calendar, Award, MapPin, Star, ChevronLeft, ChevronRight as ChevronRightIcon,
  Factory, Layers, Shield, Heart,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; initial_bg: string }> = {
  brand:        { label: "Brand",        color: "#712B13", bg: "#F5C4B3", initial_bg: "#D4603A" },
  manufacturer: { label: "Manufacturer", color: "#0C447C", bg: "#B5D4F4", initial_bg: "#378ADD" },
  reseller:     { label: "Reseller",     color: "#085041", bg: "#9FE1CB", initial_bg: "#1D9E75" },
  designer:     { label: "Designer",     color: "#3C3489", bg: "#CECBF6", initial_bg: "#534AB7" },
};

const COUNTRY_FLAGS: Record<string, string> = {
  France: "🇫🇷", Italy: "🇮🇹", Spain: "🇪🇸", Germany: "🇩🇪",
  Portugal: "🇵🇹", Netherlands: "🇳🇱", Belgium: "🇧🇪", Denmark: "🇩🇰",
  Sweden: "🇸🇪", Greece: "🇬🇷", "United Kingdom": "🇬🇧", Switzerland: "🇨🇭",
};

// ═══════════════════════════════════════════════════════════
// INFO BLOCK
// ═══════════════════════════════════════════════════════════

function InfoBlock({ icon, title, items }: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="font-display font-semibold text-sm text-foreground">{title}</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map(item => (
          <span
            key={item}
            className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-body"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SOURCING CTA CARD
// ═══════════════════════════════════════════════════════════

function SourcingCTA({ partnerType, slug, productCount }: { partnerType: string; slug: string; productCount: number }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      {/* Anonymous identity reminder */}
      <div className="flex items-start gap-3 mb-6 bg-muted/50 rounded-xl p-4">
        <Lock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-xs font-body text-muted-foreground leading-relaxed">
          {t("partnerDetail.anonymityNotice")}
        </p>
      </div>

      <h3 className="font-display font-bold text-base text-foreground mb-2">
        {t("partnerDetail.sourceFromSupplier")}
      </h3>
      <p className="text-sm font-body text-muted-foreground mb-5">
        {t("partnerDetail.browseOrCreate")}
      </p>

      <button
        onClick={() => navigate(`/products?supplier=${encodeURIComponent(slug)}`)}
        className="w-full flex items-center justify-center gap-2 py-3 font-display font-semibold text-sm text-white rounded-full hover:opacity-90 transition-opacity mb-3"
        style={{ background: "#D4603A" }}
      >
        {t("partnerDetail.seeProducts")} {productCount > 0 && `(${productCount})`} <ArrowRight className="h-4 w-4" />
      </button>

      <button
        onClick={() => navigate("/projects/new")}
        className="w-full flex items-center justify-center gap-2 py-2.5 font-display font-semibold text-sm text-foreground rounded-full border border-border hover:bg-muted/50 transition-colors mb-3"
      >
        {t("partnerDetail.startProject")} <ArrowRight className="h-4 w-4" />
      </button>

      <Link
        to="/pro-service"
        className="block text-center text-xs font-body text-muted-foreground hover:text-foreground transition-colors mb-5"
      >
        {t("partnerDetail.largeProjectProService")}
      </Link>

      {/* Trust signals */}
      <div className="space-y-2 pt-4 border-t border-border">
        {(["noDirectContact", "pricingConsolidated", "freeForProfessionals"] as const).map(key => (
          <div key={key} className="flex items-center gap-2 text-xs font-body text-muted-foreground">
            <Shield className="h-3 w-3 text-green-600 flex-shrink-0" />
            {t(`partnerDetail.${key}`)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════

function PartnerFavButton({ partnerId }: { partnerId: string }) {
  const { user } = useAuth();
  const { isFavourite, toggle } = useFavouritePartners();
  if (!user) return null;
  const isFav = isFavourite(partnerId);
  return (
    <button
      onClick={() => toggle(partnerId)}
      className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
        isFav
          ? "bg-[#D4603A]/10 border-[#D4603A]/20 text-[#D4603A]"
          : "border-border text-muted-foreground hover:text-[#D4603A] hover:border-[#D4603A]/20"
      }`}
    >
      <Heart className={`h-4 w-4 ${isFav ? "fill-[#D4603A]" : ""}`} />
    </button>
  );
}

export default function PartnerDetail() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();

  const { data: partner, isLoading } = useQuery({
    queryKey: ["partner", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .eq("slug", slug!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Product count for this partner
  const { data: productCount = 0 } = useQuery({
    queryKey: ["partner-product-count", partner?.id],
    queryFn: async () => {
      if (!partner?.id) return 0;
      const { count } = await supabase
        .from("product_offers")
        .select("id", { count: "exact", head: true })
        .eq("partner_id", partner.id)
        .eq("is_active", true);
      return count ?? 0;
    },
    enabled: !!partner?.id,
  });

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-32 container mx-auto px-6">
          <div className="h-8 w-48 bg-muted rounded animate-pulse mb-4" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="h-64 bg-muted rounded-xl animate-pulse" />
              <div className="h-32 bg-muted rounded-xl animate-pulse mt-6" />
            </div>
            <div className="h-80 bg-muted rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Not found
  if (!partner) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-32 container mx-auto px-6 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">{t("partnerDetail.supplierNotFound")}</h1>
          <Link to="/partners" className="text-sm text-muted-foreground hover:text-foreground mt-4 inline-block">
            {t("partnerDetail.backToPartners")}
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const type = TYPE_CONFIG[partner.partner_type] || TYPE_CONFIG.brand;
  const flag = partner.country ? (COUNTRY_FLAGS[partner.country] || "🌍") : "🌍";
  const isFeatured = partner.is_featured;
  const initial = { brand: "B", manufacturer: "M", reseller: "R", designer: "D" }[partner.partner_type as string] || "P";

  // Anonymous identity label
  const identityLabel = `${type.label} · ${partner.country || "Europe"}`;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${partner.name} — Outdoor Furniture Supplier`}
        description={ml(partner, "description") || `${partner.name} — verified outdoor furniture supplier on Terrassea. Discover their catalog and request quotes.`}
        image={partner.logo_url || undefined}
        url={`https://terrassea.com/partners/${partner.slug}`}
      />
      <Header />

      {/* ── HERO STRIP ── */}
      <section className="pt-24 pb-8 px-6 border-b border-border" style={{ background: "#FAF7F4" }}>
        <div className="container mx-auto max-w-6xl">
          <Link
            to="/partners"
            className="inline-flex items-center gap-1.5 text-sm font-body text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> {t("partnerDetail.backToPartnerNetwork")}
          </Link>

          <div className="flex items-center gap-5">
            {/* Logo / initials */}
            {partner.logo_url ? (
              <img
                src={partner.logo_url}
                alt={identityLabel}
                className="h-16 w-16 rounded-xl object-contain bg-white p-2 border border-border"
              />
            ) : (
              <div
                className="h-16 w-16 rounded-xl flex items-center justify-center font-display font-bold text-2xl text-white"
                style={{ background: type.initial_bg }}
              >
                {initial}
              </div>
            )}

            <div>
              {/* Type badge + featured */}
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-xs font-display font-semibold px-2.5 py-0.5 rounded-full"
                  style={{ color: type.color, background: type.bg }}
                >
                  {type.label}
                </span>
                {isFeatured && (
                  <span className="inline-flex items-center gap-1 text-xs font-display font-semibold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                    {t("partnerDetail.featuredPartner")}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <h1 className="font-display text-2xl font-bold text-foreground">
                  {identityLabel}
                </h1>
                <PartnerFavButton partnerId={partner.id} />
              </div>

              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground font-body">
                {partner.country && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {flag} {partner.city ? `${partner.city}, ` : ""}{partner.country}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT ── */}
      <section className="py-10 px-6">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* ── LEFT COLUMN ── */}
            <div className="lg:col-span-2 space-y-8">

              {/* Illustrated placeholder — no gallery columns in DB */}
              <div className="bg-muted/30 rounded-2xl overflow-hidden border border-border">
                <div className="flex flex-col items-center justify-center py-16">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center font-display font-bold text-3xl text-white mb-4"
                    style={{ background: type.initial_bg }}
                  >
                    {initial}
                  </div>
                  <p className="text-sm font-body text-muted-foreground">
                    {t("partnerDetail.galleryComing")}
                  </p>
                </div>
              </div>

              {/* About */}
              {ml(partner, 'description') && (
                <div>
                  <h2 className="font-display font-semibold text-lg text-foreground mb-2">{t("partnerDetail.about")}</h2>
                  <p className="font-body text-muted-foreground leading-relaxed">
                    {ml(partner, 'description')}
                  </p>
                </div>
              )}

              {/* Meta stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {partner.production_capacity && (
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <p className="font-display font-bold text-foreground">{partner.production_capacity}</p>
                    <p className="text-xs font-body text-muted-foreground mt-1">{t("partnerDetail.productionCapacity")}</p>
                  </div>
                )}
                {partner.coverage_zone && (
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <p className="font-display font-bold text-foreground">{partner.coverage_zone}</p>
                    <p className="text-xs font-body text-muted-foreground mt-1">{t("partnerDetail.coverageZone")}</p>
                  </div>
                )}
                {partner.partner_subtype && (
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <p className="font-display font-bold text-foreground">{partner.partner_subtype}</p>
                    <p className="text-xs font-body text-muted-foreground mt-1">{t("partnerDetail.subtype")}</p>
                  </div>
                )}
              </div>

              {/* Info blocks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoBlock
                  icon={<Layers className="h-4 w-4" />}
                  title={t("partnerDetail.specialties")}
                  items={partner.specialties || []}
                />
                <InfoBlock
                  icon={<Award className="h-4 w-4" />}
                  title={t("partnerDetail.certifications")}
                  items={partner.certifications || []}
                />
                <InfoBlock
                  icon={<Factory className="h-4 w-4" />}
                  title={t("partnerDetail.materials")}
                  items={partner.materials || []}
                />
                <InfoBlock
                  icon={<Globe className="h-4 w-4" />}
                  title={t("partnerDetail.projectTypes")}
                  items={partner.project_types || []}
                />
              </div>

              {/* Anonymity notice */}
              <div className="flex items-start gap-4 bg-muted/30 border border-border rounded-xl p-5">
                <Lock className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-display font-semibold text-sm text-foreground mb-1">
                    {t("partnerDetail.identityProtected")}
                  </h3>
                  <p className="text-xs font-body text-muted-foreground leading-relaxed">
                    {t("partnerDetail.identityProtectedDesc")}
                  </p>
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN — sticky CTA ── */}
            <div className="lg:sticky lg:top-28 self-start">
              <SourcingCTA partnerType={partner.partner_type} slug={partner.slug} productCount={productCount} />
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
