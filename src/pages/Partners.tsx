import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import {
  Building2, Factory, Store, Palette, Handshake,
  ArrowRight, Star, Search, Lock, Package, Globe,
  ChevronRight, ImageOff,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface Partner {
  id: string;
  name: string;
  slug: string;
  partner_type: string;
  country: string | null;
  city: string | null;
  logo_url: string | null;
  description: string | null;
  specialties: string[] | null;
  is_featured: boolean | null;
  is_public: boolean | null;
  priority_order: number | null;
  website: string | null;
}

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

const CATEGORIES = [
  { key: "all",          label: "All",           icon: Handshake  },
  { key: "brand",        label: "Brands",        icon: Building2  },
  { key: "manufacturer", label: "Manufacturers", icon: Factory    },
  { key: "reseller",     label: "Resellers",     icon: Store      },
  { key: "designer",     label: "Designers",     icon: Palette    },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

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
  Austria: "🇦🇹", Poland: "🇵🇱",
};

// ═══════════════════════════════════════════════════════════
// ANONYMOUS DISPLAY HELPERS
// ═══════════════════════════════════════════════════════════

function getAnonymousLabel(partner: Partner): string {
  const type = TYPE_CONFIG[partner.partner_type];
  const country = partner.country || "EU";
  return `${type?.label || "Supplier"} · ${country}`;
}

function getInitial(partner: Partner): string {
  const typeMap: Record<string, string> = {
    brand: "B", manufacturer: "M", reseller: "R", designer: "D",
  };
  return typeMap[partner.partner_type] || "P";
}

function isFeatured(partner: Partner): boolean {
  return !!partner.is_featured;
}

// ═══════════════════════════════════════════════════════════
// PARTNER CARD
// ═══════════════════════════════════════════════════════════

function PartnerCard({ partner, index }: { partner: Partner; index: number }) {
  const type     = TYPE_CONFIG[partner.partner_type] || TYPE_CONFIG.brand;
  const flag     = partner.country ? (COUNTRY_FLAGS[partner.country] || "🌍") : "🌍";
  const featured = isFeatured(partner);
  const initial  = getInitial(partner);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Link
        to={`/partners/${partner.slug}`}
        className="group block rounded-2xl border border-border bg-card overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
      >
        {/* ── Visual zone ── */}
        <div className="relative h-44 overflow-hidden bg-muted">
          {partner.logo_url ? (
            <img
              src={partner.logo_url}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${type.initial_bg}22, ${type.initial_bg}11)` }}
            >
              <div
                className="h-16 w-16 rounded-2xl flex items-center justify-center text-white font-display font-bold text-2xl"
                style={{ backgroundColor: type.initial_bg }}
              >
                {initial}
              </div>
            </div>
          )}

          {/* Type badge */}
          <div className="absolute bottom-3 left-3">
            <span
              className="text-[10px] font-display font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
              style={{ backgroundColor: type.bg, color: type.color }}
            >
              {type.label}
            </span>
          </div>

          {/* Featured badge */}
          {featured && (
            <div className="absolute top-3 right-3">
              <span className="flex items-center gap-1 text-[10px] font-display font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#FFF8F0] border border-[#D4603A]/20 text-[#D4603A]">
                <Star className="h-3 w-3 fill-[#D4603A]" />
                Featured
              </span>
            </div>
          )}

          {/* Featured top bar */}
          {featured && (
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#D4603A] via-[#E8956A] to-[#D4603A]" />
          )}
        </div>

        {/* ── Content zone ── */}
        <div className="p-5">
          {/* Anonymous identity */}
          <div className="mb-3">
            <p className="text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              {t('partners.verifiedSupplier')}
            </p>
            <h3 className="font-display font-bold text-foreground text-base leading-tight group-hover:text-foreground/80 transition-colors">
              {getAnonymousLabel(partner)}
            </h3>
          </div>

          {/* Description */}
          <p className="text-sm font-body text-muted-foreground line-clamp-2 leading-relaxed mb-4">
            {partner.description || "Specialist in professional outdoor furniture for the hospitality industry."}
          </p>

          {/* Meta info */}
          <div className="space-y-1.5 mb-4">
            {partner.specialties && partner.specialties.length > 0 && (
              <p className="text-xs font-body text-muted-foreground flex items-center gap-1.5">
                <Package className="h-3 w-3 flex-shrink-0" />
                {partner.specialties.slice(0, 3).join(", ")}
              </p>
            )}
            {partner.country && (
              <p className="text-xs font-body text-muted-foreground flex items-center gap-1.5">
                <Globe className="h-3 w-3 flex-shrink-0" />
                {flag} {partner.city ? `${partner.city}, ` : ""}{partner.country}
              </p>
            )}
          </div>

          {/* Specialty tags */}
          {partner.specialties && partner.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {partner.specialties.slice(0, 3).map(tag => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-body">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="pt-4 border-t border-border space-y-2">
            <span className="flex items-center gap-1.5 text-sm font-display font-semibold text-foreground group-hover:text-[#D4603A] transition-colors">
              {t('partners.sourceViaTerrassea')} <ArrowRight className="h-3.5 w-3.5" />
            </span>
            <div className="flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-body text-muted-foreground">
                Supplier identity revealed in confirmed quote only
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// FEATURED PLACEMENT CTA
// ═══════════════════════════════════════════════════════════

function PremiumPlacementCTA() {
  return (
    <div className="my-12 rounded-2xl border border-dashed border-[#D4603A]/30 bg-[#FFF8F0] p-8">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        <div className="flex items-start gap-4 flex-1">
          <div className="h-10 w-10 rounded-xl bg-[#D4603A]/10 flex items-center justify-center flex-shrink-0">
            <Star className="h-5 w-5 text-[#D4603A]" />
          </div>
          <div>
            <h3 className="font-display font-bold text-foreground text-base">
              Get featured at the top of the network
            </h3>
            <p className="text-sm font-body text-muted-foreground mt-1 max-w-lg">
              Featured suppliers are seen first by hospitality professionals. Upgrade to Growth or Elite
              to unlock featured placement, cover photo, photo gallery, and priority in project recommendations.
            </p>
          </div>
        </div>
        <Link
          to="/become-partner"
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#D4603A] text-white font-display font-semibold text-sm hover:bg-[#C05030] transition-colors flex-shrink-0"
        >
          Learn more <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════

function EmptyState() {
  return (
    <div className="text-center py-20">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
        <ImageOff className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="font-display font-bold text-foreground text-lg">No partners yet in this category</h3>
      <p className="text-sm font-body text-muted-foreground mt-2">Be the first — featured placements available now.</p>
      <Link
        to="/become-partner"
        className="inline-flex items-center gap-2 mt-6 px-6 py-2.5 rounded-full bg-foreground text-primary-foreground font-display font-semibold text-sm hover:bg-foreground/90 transition-colors"
      >
        Apply as partner
      </Link>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════

export default function Partners() {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("all");
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("");

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ["partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .eq("is_public", true)
        .order("priority_order", { ascending: false });
      if (error) throw error;
      return (data || []) as Partner[];
    },
  });

  const countries = useMemo(() => {
    const all = partners.map(p => p.country).filter(Boolean) as string[];
    return [...new Set(all)].sort();
  }, [partners]);

  const filtered = useMemo(() => {
    return partners.filter(p => {
      const matchCat     = activeCategory === "all" || p.partner_type === activeCategory;
      const matchSearch  = !search || getAnonymousLabel(p).toLowerCase().includes(search.toLowerCase()) || (p.description || "").toLowerCase().includes(search.toLowerCase());
      const matchCountry = !countryFilter || p.country === countryFilter;
      return matchCat && matchSearch && matchCountry;
    });
  }, [partners, activeCategory, search, countryFilter]);

  const featured = filtered.filter(isFeatured);
  const standard = filtered.filter(p => !isFeatured(p));

  const counts: Record<string, number> = {
    all: partners.length,
    brand: partners.filter(p => p.partner_type === "brand").length,
    manufacturer: partners.filter(p => p.partner_type === "manufacturer").length,
    reseller: partners.filter(p => p.partner_type === "reseller").length,
    designer: partners.filter(p => p.partner_type === "designer").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* ── HERO ── */}
      <section className="pt-28 pb-16 px-6 bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-display font-semibold uppercase tracking-widest text-[#D4603A] mb-4"
              >
                {t('partners.title')}
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="font-display text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-[1.1]"
              >
                The trusted network<br />
                for CHR outdoor<br />
                professionals.
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-6 text-base font-body text-muted-foreground max-w-md leading-relaxed"
              >
                A curated ecosystem of verified manufacturers, brands and resellers
                powering the European hospitality industry. Every partner is reviewed and approved by Terrassea.
                Supplier identities are protected — all sourcing goes through Terrassea.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mt-8 flex items-center gap-3"
              >
                <Link to="/become-partner" className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#D4603A] text-white font-display font-semibold text-sm hover:bg-[#C05030] transition-colors">
                  {t('partners.becomePartner')} <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="#partners-grid" className="px-6 py-3 rounded-full border border-border font-display font-semibold text-sm text-foreground hover:bg-muted transition-colors">
                  Browse suppliers
                </a>
              </motion.div>
            </div>

            {/* Stats grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 gap-4"
            >
              {[
                { value: `${partners.length || "—"}`, label: "Verified suppliers",  accent: "#D4603A" },
                { value: `${countries.length || "7"}`, label: "Countries covered",  accent: "#4A90A4" },
                { value: "100%",                        label: "CHR reviewed",       accent: "#1D9E75" },
                { value: "Protected",                   label: "Supplier identity",  accent: "#8B7355" },
              ].map((stat, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-5 text-center">
                  <p className="font-display font-bold text-2xl" style={{ color: stat.accent }}>
                    {stat.value}
                  </p>
                  <p className="text-xs font-body text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── STICKY FILTERS ── */}
      <section className="sticky top-[73px] z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6">
          <div className="flex items-center gap-2 overflow-x-auto py-3 no-scrollbar">
            {CATEGORIES.map(cat => {
              const Icon     = cat.icon;
              const isActive = activeCategory === cat.key;
              const count    = counts[cat.key] ?? 0;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-display font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                    isActive
                      ? "bg-foreground text-primary-foreground"
                      : "border border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {cat.label}
                  <span className={`text-[10px] ml-0.5 ${isActive ? "text-primary-foreground/60" : "text-muted-foreground/50"}`}>
                    {count}
                  </span>
                </button>
              );
            })}

            <div className="h-5 w-px bg-border flex-shrink-0 mx-1" />

            <div className="relative flex-shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="pl-8 pr-4 py-1.5 text-xs font-body bg-card border border-border rounded-full outline-none focus:border-foreground w-36 transition-all focus:w-48"
              />
            </div>

            {countries.length > 0 && (
              <select
                value={countryFilter}
                onChange={e => setCountryFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-body bg-card border border-border rounded-full outline-none focus:border-foreground flex-shrink-0"
              >
                <option value="">All countries</option>
                {countries.map(c => (
                  <option key={c} value={c}>{COUNTRY_FLAGS[c] || ""} {c}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </section>

      {/* ── PARTNERS GRID ── */}
      <section id="partners-grid" className="py-10 pb-24 px-6">
        <div className="container mx-auto max-w-6xl">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-80 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {/* Featured */}
              {featured.length > 0 && (
                <div className="mb-10">
                  <div className="flex items-center gap-2 mb-6">
                    <Star className="h-4 w-4 text-[#D4603A]" />
                    <h2 className="font-display font-bold text-foreground text-lg">
                      Featured Suppliers
                    </h2>
                    <div className="flex-1 h-px bg-border ml-3" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {featured.map((partner, i) => (
                      <PartnerCard key={partner.id} partner={partner} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* Premium placement CTA */}
              <PremiumPlacementCTA />

              {/* All partners */}
              {standard.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-display font-bold text-foreground text-lg">
                      All Verified Suppliers
                    </h2>
                    <div className="flex-1 h-px bg-border mx-4" />
                    <span className="text-xs font-body text-muted-foreground">{standard.length} suppliers</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {standard.map((partner, i) => (
                      <PartnerCard key={partner.id} partner={partner} index={i} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── TRUST FOOTER BAND ── */}
      <section className="py-10 px-6 border-t border-border bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="flex items-start gap-3 flex-1">
              <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-display font-semibold text-foreground text-sm">Supplier identity is always protected</h3>
                <p className="text-xs font-body text-muted-foreground mt-1">
                  Full supplier details are only shared in a confirmed quote. All sourcing flows through Terrassea.
                </p>
              </div>
            </div>
            <Link
              to="/become-partner"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-border font-display font-semibold text-sm text-foreground hover:bg-muted transition-colors flex-shrink-0"
            >
              Join the network <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
