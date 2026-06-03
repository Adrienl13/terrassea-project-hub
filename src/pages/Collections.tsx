import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, MapPin, Sparkles, Package, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Max collection covers shown per brand before a "+N" tile links to the brand page.
const PREVIEW_CAP = 7;
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import FoundingBadge from "@/components/common/FoundingBadge";
import type { FoundingTier } from "@/hooks/useFoundingScore";

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

  // ── Load brands on mount ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data, error: err } = await supabase
          .from("partners")
          .select("id, slug, name, logo_url, country, country_code, description, partner_mode, hero_image_url, cover_photo_url, founded_year, specialties, certifications, priority_order, is_founding, founding_tier, founding_tier_rank")
          .in("partner_mode", ["brand_member", "brand_network"])
          .eq("is_active", true)
          .order("founding_tier_rank", { ascending: false, nullsFirst: false })
          .order("priority_order", { ascending: true, nullsFirst: false })
          .order("name");

        if (cancelled) return;
        if (err) { setError(err.message); setLoading(false); return; }
        setBrands(data ?? []);
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
          <div className="flex items-center gap-6 mt-8">
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
        <section className="py-16 md:py-24 bg-[#FAF7F4]">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-foreground border-t-transparent" />
          </div>
        </section>
      ) : (
        brands.map((brand, brandIdx) => {
          const data = brandData[brand.id];
          const collItems = data ? data.items : [];
          const flag = countryFlag(brand.country_code);
          const heroImg = brand.hero_image_url || brand.cover_photo_url;
          const isEven = brandIdx % 2 === 0;

          return (
            <section
              key={brand.id}
              className={isEven ? "bg-[#FAF7F4] py-16 md:py-24" : "bg-white py-16 md:py-24"}
            >
              <div className="container mx-auto px-6 max-w-6xl">
                {/* ── Brand header ─────────────────────────────────────────── */}
                <div className={"flex flex-col md:flex-row gap-8 md:gap-16 items-start " + (isEven ? "" : "md:flex-row-reverse")}>
                  {/* Brand image / logo block */}
                  <div className="w-full md:w-2/5 shrink-0">
                    {heroImg ? (
                      <div className="aspect-[4/3] rounded-2xl overflow-hidden">
                        <img loading="lazy" src={heroImg} alt={brand.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="aspect-[4/3] rounded-2xl bg-[#1C1A17] flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M0 20L20 0l20 20-20 20z' fill-opacity='.05'/%3E%3C/g%3E%3C/svg%3E\")" }} />
                        {brand.logo_url ? (
                          <img loading="lazy" src={brand.logo_url} alt={brand.name} className="h-20 w-20 object-contain opacity-80" />
                        ) : (
                          <span className="font-display text-5xl font-bold text-white/20">{brand.name.charAt(0)}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Brand info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-4">
                      {brand.logo_url && heroImg ? (
                        <img loading="lazy" src={brand.logo_url} alt="" className="h-10 w-10 rounded-lg object-contain bg-muted p-1" />
                      ) : null}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                            {brand.name}
                          </h2>
                          {brand.is_founding && brand.founding_tier ? (
                            <FoundingBadge tier={brand.founding_tier as FoundingTier} size="sm" />
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {flag ? <span className="text-sm">{flag}</span> : null}
                          {brand.country ? (
                            <span className="text-xs font-body text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {brand.country}
                            </span>
                          ) : null}
                          {brand.founded_year ? (
                            <span className="text-xs font-body text-muted-foreground">
                              {t("brand.since", { year: brand.founded_year })}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {brand.description ? (
                      <p className="text-sm font-body text-muted-foreground leading-relaxed mb-6 max-w-lg">
                        {brand.description}
                      </p>
                    ) : null}

                    {/* Tags: specialties + certifications */}
                    {(brand.specialties?.length || brand.certifications?.length) ? (
                      <div className="flex flex-wrap gap-2 mb-6">
                        {(brand.specialties ?? []).map((s) => (
                          <span key={s} className="text-[10px] font-body px-3 py-1 rounded-full bg-foreground/5 text-muted-foreground border border-border">
                            {s}
                          </span>
                        ))}
                        {(brand.certifications ?? []).map((c) => (
                          <span key={c} className="text-[10px] font-body px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 flex items-center gap-1">
                            <Award className="h-2.5 w-2.5" />{c}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {/* Collection count */}
                    <div className="flex items-center gap-4 text-xs font-body text-muted-foreground mb-5">
                      <span className="flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5" />
                        {t("brand.collectionCount", { count: collItems.length })}
                      </span>
                    </div>

                    {/* Preview cover tiles, capped — adapts to the number of collections */}
                    {collItems.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mb-6">
                        {collItems.slice(0, PREVIEW_CAP).map((coll) => (
                          <Link
                            key={coll.id}
                            to={"/brands/" + brand.slug + "?collection=" + encodeURIComponent(coll.name)}
                            className="group relative block aspect-square rounded-lg overflow-hidden bg-muted"
                          >
                            {coll.cover_image_url ? (
                              <img loading="lazy" src={coll.cover_image_url} alt={coll.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-300">
                                <span className="font-display text-lg font-bold text-stone-400/60">{coll.name.charAt(0)}</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                            <span className="absolute bottom-1.5 left-2 right-2 text-[10px] font-display font-semibold text-white leading-tight line-clamp-2">{coll.name}</span>
                          </Link>
                        ))}
                        {collItems.length > PREVIEW_CAP ? (
                          <Link
                            to={"/brands/" + brand.slug}
                            className="flex items-center justify-center aspect-square rounded-lg bg-foreground/5 border border-border hover:border-foreground/30 hover:bg-foreground/[0.07] transition-colors"
                          >
                            <span className="text-sm font-display font-bold text-foreground">+{collItems.length - PREVIEW_CAP}</span>
                          </Link>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-[11px] font-body text-muted-foreground mb-6 italic">{t("brand.comingSoon", "Collections à venir")}</p>
                    )}

                    {/* Discover link */}
                    <Link
                      to={"/brands/" + brand.slug}
                      className="inline-flex items-center gap-2 px-6 py-2.5 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
                    >
                      {t("brand.discoverBrand", "Découvrir la marque")} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

              </div>
            </section>
          );
        })
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
