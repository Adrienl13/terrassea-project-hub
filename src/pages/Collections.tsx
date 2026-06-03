import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Sparkles, Package, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Max collection covers shown per brand before a "+N" tile links to the brand page.
const PREVIEW_CAP = 7;
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import FoundingBadge from "@/components/common/FoundingBadge";
import type { FoundingTier } from "@/hooks/useFoundingScore";
import { getOptimizedImageUrl } from "@/utils/imageOptimization";
import { SmartImg } from "@/components/common/SmartImg";

// ── Types ────────────────────────────────────────────────────────────────────

interface BrandPartner {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  country: string | null;
  country_code: string | null;
  description: string | null;
  hero_image_url: string | null;
  cover_photo_url: string | null;
  founded_year: number | null;
  specialties: string[] | null;
  certifications: string[] | null;
  partner_mode: string | null;
  priority_order: number | null;
  is_founding: boolean | null;
  founding_tier: string | null;
  founding_tier_rank: number | null;
  showcase_tier: string | null;
}

interface CollItem {
  id: string;
  name: string;
  cover_image_url: string | null;
  designer: string | null;
  year: number | null;
}

interface BrandCollections {
  items: CollItem[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function countryFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(
    ...code.toUpperCase().split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function Collections() {
  const { t } = useTranslation();
  const [brands, setBrands] = useState<BrandPartner[]>([]);
  const [brandData, setBrandData] = useState<Record<string, BrandCollections>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // ── Load brands on mount ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data, error: err } = await supabase
          .from("partners")
          .select("id, slug, name, logo_url, country, country_code, description, partner_mode, hero_image_url, cover_photo_url, founded_year, specialties, certifications, priority_order, is_founding, founding_tier, founding_tier_rank, showcase_tier")
          .in("partner_mode", ["brand_member", "brand_network"])
          .eq("is_active", true)
          .order("founding_tier_rank", { ascending: false, nullsFirst: false })
          .order("priority_order", { ascending: true, nullsFirst: false })
          .order("name");

        if (cancelled) return;
        if (err) { setError(err.message); setLoading(false); return; }
        // showcase_tier is a fresh column not yet in the generated Supabase types.
        setBrands((data ?? []) as unknown as BrandPartner[]);
        setLoading(false);
      } catch (e) {
        if (!cancelled) { setError(e instanceof Error ? e.message : "Erreur inconnue"); setLoading(false); }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Fetch collections for all brands (source of truth = brand_collections) ─
  const fetchCollections = useCallback(async (brandId: string) => {
    try {
      const { data, error: err } = await supabase
        .from("brand_collections")
        .select("id, name, cover_image_url, designer, year, display_order")
        .eq("partner_id", brandId)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (err) { console.error("[Collections] fetch error:", err.message); return; }

      setBrandData((prev) => ({
        ...prev,
        // designer/year are fresh columns not yet in the generated Supabase types.
        [brandId]: { items: (data ?? []) as unknown as CollItem[] },
      }));
    } catch (e) {
      console.error("[Collections] fetch error:", e);
    }
  }, []);

  // Fetch collections for all brands once loaded
  useEffect(() => {
    for (const brand of brands) {
      if (!brandData[brand.id]) fetchCollections(brand.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- brandData intentionally excluded to avoid refetch loop
  }, [brands, fetchCollections]);

  // ── Render ───────────────────────────────────────────────────────────────
  const q = query.trim().toLowerCase();
  const visibleBrands = q
    ? brands.filter((b) => b.name.toLowerCase().includes(q) || (b.country ?? "").toLowerCase().includes(q))
    : brands;
  const maisons = visibleBrands.filter((b) => b.showcase_tier === "signature");
  const manufactures = visibleBrands.filter((b) => b.showcase_tier !== "signature");

  const renderBrandCard = (brand: BrandPartner) => {
    const data = brandData[brand.id];
    const collItems = data ? data.items : [];
    const flag = countryFlag(brand.country_code);
    const heroImg = brand.hero_image_url || brand.cover_photo_url;
    const thumbs = collItems.filter((c) => c.cover_image_url).slice(0, 3);
    return (
      <Link
        key={brand.id}
        to={"/brands/" + brand.slug}
        className="group flex flex-col rounded-2xl overflow-hidden border border-border bg-white hover:shadow-lg hover:shadow-black/[0.06] hover:-translate-y-0.5 transition-all duration-300"
      >
        <div className="aspect-[16/10] relative bg-muted overflow-hidden">
          {heroImg ? (
            <SmartImg src={heroImg} box={700} alt={brand.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[#1C1A17]">
              {brand.logo_url ? (
                <img loading="lazy" src={brand.logo_url} alt={brand.name} className="h-14 w-auto max-w-[60%] object-contain opacity-90" />
              ) : (
                <span className="font-display text-4xl font-bold text-white/20">{brand.name.charAt(0)}</span>
              )}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          {brand.is_founding && brand.founding_tier ? (
            <div className="absolute top-3 right-3">
              <FoundingBadge tier={brand.founding_tier as FoundingTier} size="sm" />
            </div>
          ) : null}
          {heroImg && brand.logo_url ? (
            <div className="absolute top-3 left-3 h-9 bg-white rounded-lg px-2 flex items-center shadow-sm">
              <img loading="lazy" src={brand.logo_url} alt="" className="max-h-6 w-auto max-w-[80px] object-contain" />
            </div>
          ) : null}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h2 className="font-display text-xl font-bold text-white leading-tight truncate">{brand.name}</h2>
            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-body text-white/80">
              {flag ? <span>{flag}</span> : null}
              {brand.country ? <span>{brand.country}</span> : null}
              {brand.founded_year ? <span className="text-white/50">· {brand.founded_year}</span> : null}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 flex items-center justify-between gap-2">
          <span className="text-xs font-display font-semibold text-foreground">
            {t("brand.collectionCount", { count: collItems.length })}
          </span>
          {thumbs.length > 0 ? (
            <div className="flex items-center -space-x-2">
              {thumbs.map((c) => (
                <img key={c.id} loading="lazy" src={getOptimizedImageUrl(c.cover_image_url, { width: 120 })} alt="" className="h-7 w-7 rounded-md object-cover ring-2 ring-white" />
              ))}
              {collItems.length > 3 ? (
                <span className="h-7 min-w-7 px-1 rounded-md bg-foreground/5 ring-2 ring-white flex items-center justify-center text-[10px] font-display font-bold text-foreground">+{collItems.length - 3}</span>
              ) : null}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-display font-semibold text-[#D4603A] group-hover:gap-1.5 transition-all">
              {t("brand.discoverBrand", "Découvrir")} <ArrowRight className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </Link>
    );
  };

  return (
    <>
      <SEO
        title={t("nav.collections", "Collections")}
        description={t("brand.heroDescription")}
      />
      <Header />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative bg-[#1C1A17] pt-12 md:pt-24 pb-20 overflow-hidden">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="container mx-auto px-6 max-w-5xl relative">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="h-4 w-4 text-[#D4603A]" />
            <span className="text-xs font-display font-semibold uppercase tracking-[0.2em] text-[#D4603A]">
              {t("brand.partnersLabel")}
            </span>
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold text-white tracking-tight mb-4 max-w-3xl">
            {t("brand.exclusiveCollections")}
          </h1>
          <p className="text-base md:text-lg font-body text-white/50 max-w-2xl leading-relaxed">
            {t("brand.heroDescription")}
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4 mt-8">
            <div className="text-center">
              <p className="font-display text-2xl font-bold text-white">{String(brands.length)}</p>
              <p className="text-[10px] font-body text-white/40 uppercase tracking-wider">{t("brand.brandsCount")}</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="font-display text-2xl font-bold text-white">
                {String(Object.values(brandData).reduce((acc, d) => acc + d.items.length, 0))}
              </p>
              <p className="text-[10px] font-body text-white/40 uppercase tracking-wider">{t("brand.collectionsCount")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Brand showcases ───────────────────────────────────────────────── */}
      {error ? (
        <section className="py-12 bg-[#FAF7F4]">
          <div className="container mx-auto px-6 max-w-5xl">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-xs font-body text-red-800">{t("common.error", "Erreur") + " : " + error}</p>
            </div>
          </div>
        </section>
      ) : null}

      {loading ? (
        <section className="py-12 bg-[#FAF7F4]">
          <div className="container mx-auto px-6 max-w-6xl">
            {/* Skeleton grid — instant structure so the page never looks blank/broken */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden border border-border bg-white">
                  <div className="aspect-[16/10] bg-muted animate-pulse" />
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                    <div className="h-7 w-16 rounded bg-muted animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="py-12 bg-[#FAF7F4]">
          <div className="container mx-auto px-6 max-w-6xl">
            {/* Search — helps discovery as the directory grows */}
            {brands.length > 6 ? (
              <div className="relative max-w-md mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("brand.searchBrands", "Rechercher une marque, un pays…")}
                  className="w-full bg-white border border-border rounded-full pl-11 pr-4 py-2.5 text-sm font-body outline-none focus:ring-1 focus:ring-[#D4603A] focus:border-[#D4603A] transition-all"
                />
              </div>
            ) : null}

            {/* Two curated strata: signature maisons first, then partner manufactures */}
            {maisons.length > 0 ? (
              <div className="mb-12">
                <div className="flex items-baseline gap-3 mb-5">
                  <h2 className="font-display text-lg font-bold text-foreground">{t("brand.tierMaisons", "Maisons signature")}</h2>
                  <span className="text-xs font-body text-muted-foreground">{maisons.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {maisons.map(renderBrandCard)}
                </div>
              </div>
            ) : null}

            {manufactures.length > 0 ? (
              <div>
                <div className="flex items-baseline gap-3 mb-5">
                  <h2 className="font-display text-lg font-bold text-foreground">{t("brand.tierManufactures", "Manufactures partenaires")}</h2>
                  <span className="text-xs font-body text-muted-foreground">{manufactures.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {manufactures.map(renderBrandCard)}
                </div>
              </div>
            ) : null}

            {visibleBrands.length === 0 ? (
              <p className="text-sm font-body text-muted-foreground text-center py-12">
                {t("brand.noBrandFound", "Aucune marque ne correspond à votre recherche.")}
              </p>
            ) : null}
          </div>
        </section>
      )}

      {/* ── Bottom CTA ────────────────────────────────────────────────────── */}
      {!loading && brands.length > 0 ? (
        <section className="bg-[#1C1A17] py-20">
          <div className="container mx-auto px-6 max-w-3xl text-center">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-3">
              {t("brand.areYouBrand")}
            </h2>
            <p className="text-sm font-body text-white/50 mb-8 max-w-lg mx-auto leading-relaxed">
              {t("brand.joinDescription")}
            </p>
            <Link
              to="/become-partner"
              className="inline-flex items-center gap-2 px-8 py-3 font-display font-semibold text-sm bg-[#D4603A] text-white rounded-full hover:opacity-90 transition-opacity"
            >
              {t("brand.becomePartner")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      ) : null}

      <Footer />
    </>
  );
}
