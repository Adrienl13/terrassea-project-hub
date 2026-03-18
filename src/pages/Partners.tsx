import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import {
  Building2, Factory, Store, Palette, Handshake,
  MapPin, ArrowRight, Star, Search, ChevronRight,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Partner {
  id: string;
  name: string;
  slug: string;
  partner_type: string;
  country: string | null;
  city: string | null;
  logo_url: string | null;
  description: string | null;
  is_featured: boolean | null;
  priority_order: number | null;
  website: string | null;
  specialties: string[] | null;
}

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: "all",          label: "All Partners",   icon: Handshake },
  { key: "brand",        label: "Brands",          icon: Building2 },
  { key: "manufacturer", label: "Manufacturers",   icon: Factory },
  { key: "reseller",     label: "Resellers",       icon: Store },
  { key: "designer",     label: "Designers",       icon: Palette },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

const TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  brand:        { label: "Brand",        color: "#712B13", bg: "#F5C4B3" },
  manufacturer: { label: "Manufacturer", color: "#0C447C", bg: "#B5D4F4" },
  reseller:     { label: "Reseller",     color: "#085041", bg: "#9FE1CB" },
  designer:     { label: "Designer",     color: "#3C3489", bg: "#CECBF6" },
};

const COUNTRY_FLAGS: Record<string, string> = {
  France: "🇫🇷", Italy: "🇮🇹", Spain: "🇪🇸", Germany: "🇩🇪",
  Portugal: "🇵🇹", Netherlands: "🇳🇱", Belgium: "🇧🇪", Denmark: "🇩🇰",
  Sweden: "🇸🇪", Greece: "🇬🇷", "United Kingdom": "🇬🇧",
};

// ── Featured Partner Card ─────────────────────────────────────────────────────

function FeaturedCard({ partner, index }: { partner: Partner; index: number }) {
  const type = TYPE_LABELS[partner.partner_type] || TYPE_LABELS.brand;
  const flag = partner.country ? (COUNTRY_FLAGS[partner.country] || "🌍") : "🌍";
  const initials = partner.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <Link
        to={`/partners/${partner.slug}`}
        className="group relative block rounded-2xl border border-border bg-card overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
      >
        {/* Featured banner */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#D4603A] via-[#E8956A] to-[#D4603A]" />

        {/* Featured badge */}
        <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFF8F0] border border-[#D4603A]/20">
          <Star className="h-3 w-3 fill-[#D4603A] text-[#D4603A]" />
          <span className="text-[10px] font-display font-semibold text-[#D4603A] uppercase tracking-wider">Featured</span>
        </div>

        <div className="p-6">
          {/* Logo / initials */}
          <div className="flex items-start gap-4">
            {partner.logo_url ? (
              <img
                src={partner.logo_url}
                alt={partner.name}
                className="h-14 w-14 rounded-xl object-contain bg-muted p-1.5 flex-shrink-0"
              />
            ) : (
              <div className="h-14 w-14 rounded-xl flex items-center justify-center font-display font-bold text-lg flex-shrink-0"
                style={{ backgroundColor: type.bg, color: type.color }}>
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-display font-bold text-foreground text-lg leading-tight group-hover:text-foreground/80 transition-colors truncate">
                {partner.name}
              </h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[10px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: type.bg, color: type.color }}>
                  {type.label}
                </span>
                <span className="text-xs text-muted-foreground font-body flex items-center gap-1">
                  {flag} {partner.city ? `${partner.city}, ` : ""}{partner.country}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          {partner.description && (
            <p className="mt-4 text-sm font-body text-muted-foreground line-clamp-2 leading-relaxed">
              {partner.description}
            </p>
          )}

          {/* Specialty tags */}
          {partner.specialties && partner.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {partner.specialties.slice(0, 3).map(tag => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-body">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
            <span className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
              Featured Partner
            </span>
            <span className="flex items-center gap-1 text-sm font-display font-semibold text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              View profile <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Standard Partner Card ─────────────────────────────────────────────────────

function PartnerCard({ partner, index }: { partner: Partner; index: number }) {
  const type = TYPE_LABELS[partner.partner_type] || TYPE_LABELS.brand;
  const flag = partner.country ? (COUNTRY_FLAGS[partner.country] || "🌍") : "🌍";
  const initials = partner.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Link
        to={`/partners/${partner.slug}`}
        className="group flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:shadow-md hover:border-foreground/10 transition-all duration-200"
      >
        {/* Logo / initials */}
        {partner.logo_url ? (
          <img
            src={partner.logo_url}
            alt={partner.name}
            className="h-11 w-11 rounded-lg object-contain bg-muted p-1 flex-shrink-0"
          />
        ) : (
          <div className="h-11 w-11 rounded-lg flex items-center justify-center font-display font-bold text-sm flex-shrink-0"
            style={{ backgroundColor: type.bg, color: type.color }}>
            {initials}
          </div>
        )}

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-semibold text-foreground text-sm truncate group-hover:text-foreground/80 transition-colors">
              {partner.name}
            </h3>
            <span className="text-[9px] font-display font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: type.bg, color: type.color }}>
              {type.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-body mt-0.5 flex items-center gap-1">
            {flag} {partner.city ? `${partner.city}, ` : ""}{partner.country}
          </p>
          {partner.description && (
            <p className="text-xs text-muted-foreground font-body mt-1 line-clamp-1">{partner.description}</p>
          )}
        </div>

        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </Link>
    </motion.div>
  );
}

// ── Premium placement CTA ─────────────────────────────────────────────────────

function PremiumPlacementCTA() {
  return (
    <div className="my-12">
      <div className="rounded-2xl border border-dashed border-[#D4603A]/30 bg-[#FFF8F0] p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="flex items-start gap-4 flex-1">
            <div className="h-10 w-10 rounded-xl bg-[#D4603A]/10 flex items-center justify-center flex-shrink-0">
              <Star className="h-5 w-5 text-[#D4603A]" />
            </div>
            <div>
              <h3 className="font-display font-bold text-foreground text-base">
                Get featured at the top of the Partner Network
              </h3>
              <p className="text-sm font-body text-muted-foreground mt-1 max-w-lg">
                Featured partners are seen first by hospitality professionals searching for suppliers.
                Upgrade to Growth or Elite to unlock your featured placement, priority in project recommendations,
                and a verified badge visible across the entire platform.
              </p>
            </div>
          </div>
          <Link
            to="/become-partner"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#D4603A] text-white font-display font-semibold text-sm hover:bg-[#C05030] transition-colors flex-shrink-0"
          >
            Become a Partner <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ category }: { category: string }) {
  return (
    <div className="text-center py-20">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
        <Search className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="font-display font-bold text-foreground text-lg">
        No {category === "all" ? "" : category + " "}partners yet
      </h3>
      <p className="text-sm font-body text-muted-foreground mt-2 max-w-sm mx-auto">
        Be the first in this category. Featured placements available now.
      </p>
      <Link
        to="/become-partner"
        className="inline-flex items-center gap-2 mt-6 px-6 py-2.5 rounded-full bg-foreground text-primary-foreground font-display font-semibold text-sm hover:bg-foreground/90 transition-colors"
      >
        Apply as partner
      </Link>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Partners() {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("all");
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("");

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ["partners", activeCategory],
    queryFn: async () => {
      let query = supabase
        .from("partners")
        .select("*")
        .eq("is_public", true)
        .order("priority_order", { ascending: false });

      if (activeCategory !== "all") {
        query = query.eq("partner_type", activeCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Partner[];
    },
  });

  // Extract unique countries
  const countries = useMemo(() => {
    const all = partners.map(p => p.country).filter(Boolean) as string[];
    return [...new Set(all)].sort();
  }, [partners]);

  // Filter partners
  const filtered = useMemo(() => {
    return partners.filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      const matchCountry = !countryFilter || p.country === countryFilter;
      return matchSearch && matchCountry;
    });
  }, [partners, search, countryFilter]);

  const featured = filtered.filter(p => p.is_featured);
  const standard = filtered.filter(p => !p.is_featured);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* ── HERO ── */}
      <section className="pt-28 pb-16 px-6 bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-display font-semibold uppercase tracking-widest text-[#D4603A] mb-4"
              >
                Partner Network
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
                A curated ecosystem of brands, manufacturers, resellers and designers
                powering the European hospitality industry. Every partner is reviewed and approved by Terrassea.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mt-8 flex items-center gap-3"
              >
                <Link to="/become-partner" className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#D4603A] text-white font-display font-semibold text-sm hover:bg-[#C05030] transition-colors">
                  Become a Partner <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="#partners-grid" className="px-6 py-3 rounded-full border border-border font-display font-semibold text-sm text-foreground hover:bg-muted transition-colors">
                  Browse the network
                </a>
              </motion.div>
            </div>

            {/* Right — stats + trust signals */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 gap-4"
            >
              {[
                { value: `${partners.length || "—"}`, label: "Approved partners", accent: "#D4603A" },
                { value: "7", label: "Countries covered", accent: "#4A90A4" },
                { value: "100%", label: "CHR verified", accent: "#1D9E75" },
                { value: "Free", label: "To source & quote", accent: "#8B7355" },
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
            {/* Category pills */}
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.key;
              const count = cat.key === "all" ? partners.length : partners.filter(p => p.partner_type === cat.key).length;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-display font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                    isActive ? "bg-foreground text-primary-foreground" : "border border-border text-muted-foreground hover:border-foreground hover:text-foreground"
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

            {/* Separator */}
            <div className="h-5 w-px bg-border flex-shrink-0 mx-1" />

            {/* Search */}
            <div className="relative flex-shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="pl-8 pr-4 py-1.5 text-xs font-body bg-card border border-border rounded-full outline-none focus:border-foreground w-36 transition-all focus:w-48"
              />
            </div>

            {/* Country filter */}
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

      {/* ── PARTNERS CONTENT ── */}
      <section id="partners-grid" className="py-10 pb-24 px-6">
        <div className="container mx-auto max-w-6xl">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState category={activeCategory} />
          ) : (
            <>
              {/* Featured section */}
              {featured.length > 0 && (
                <div className="mb-10">
                  <div className="flex items-center gap-2 mb-6">
                    <Star className="h-4 w-4 text-[#D4603A]" />
                    <h2 className="font-display font-bold text-foreground text-lg">
                      Featured Partners
                    </h2>
                    <div className="flex-1 h-px bg-border ml-3" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {featured.map((partner, i) => (
                      <FeaturedCard key={partner.id} partner={partner} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* Premium placement CTA */}
              <PremiumPlacementCTA />

              {/* Standard partners */}
              {standard.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-display font-bold text-foreground text-lg">
                      All Partners
                    </h2>
                    <div className="flex-1 h-px bg-border mx-4" />
                    <span className="text-xs font-body text-muted-foreground">{standard.length} partners</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

      {/* ── BOTTOM CTA ── */}
      <section className="py-20 px-6 bg-muted/30 border-t border-border">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <p className="text-[10px] font-display font-semibold uppercase tracking-widest text-[#D4603A] mb-3">
                For suppliers &amp; manufacturers
              </p>
              <h2 className="font-display text-3xl font-bold tracking-tight text-foreground leading-tight">
                Get in front of the right buyers.<br />
                For free, for 6 months.
              </h2>
              <p className="mt-4 text-sm font-body text-muted-foreground max-w-md leading-relaxed">
                Terrassea connects you directly with hotels, restaurants, beach clubs and resorts actively sourcing outdoor furniture.
                No intermediaries. No commission on your first 3 confirmed orders.
              </p>
              <div className="mt-8">
                <Link
                  to="/become-partner"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#D4603A] text-white font-display font-semibold text-sm hover:bg-[#C05030] transition-colors"
                >
                  Apply as a partner <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { title: "Starter — Free 6 months", desc: "List up to 30 products, 8% commission after first 3 orders, then automatic upgrade.", tag: "No credit card" },
                { title: "Growth — €199/month", desc: "Unlimited products, 5% commission, featured placement in partner network + project recommendations.", tag: "Most popular" },
                { title: "Elite — Custom pricing", desc: "3% commission, API integration, dedicated account manager, custom showcase page.", tag: "Large volumes" },
              ].map((plan, i) => (
                <div key={i} className="flex items-start gap-4 p-5 rounded-xl border border-border bg-card">
                  <div className="h-2 w-2 rounded-full bg-[#D4603A] mt-2 flex-shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-bold text-foreground text-sm">{plan.title}</h3>
                      <span className="text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {plan.tag}
                      </span>
                    </div>
                    <p className="text-xs font-body text-muted-foreground mt-1 leading-relaxed">{plan.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
