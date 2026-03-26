import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, MapPin, Sparkles, Package, Award, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

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
}

interface CollectionOffer {
  collection_name: string | null;
  product: {
    image_url: string | null;
    name: string;
    category: string | null;
  } | null;
}

interface BrandCollections {
  grouped: Record<string, CollectionOffer[]>;
  totalProducts: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function countryFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(
    ...code.toUpperCase().split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

function groupByCollection(offers: CollectionOffer[]): Record<string, CollectionOffer[]> {
  const result: Record<string, CollectionOffer[]> = {};
  for (const offer of offers) {
    const key = offer.collection_name;
    if (!key) continue;
    if (!result[key]) result[key] = [];
    result[key].push(offer);
  }
  return result;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function Collections() {
  const { t } = useTranslation();
  const [brands, setBrands] = useState<BrandPartner[]>([]);
  const [brandData, setBrandData] = useState<Record<string, BrandCollections>>({});
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Load brands on mount ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data, error: err } = await supabase
          .from("partners")
          .select("id, slug, name, logo_url, country, country_code, description, partner_mode, hero_image_url, cover_photo_url, founded_year, specialties, certifications")
          .in("partner_mode", ["brand_member", "brand_network"])
          .eq("is_active", true)
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

  // ── Fetch all collections for all brands ─────────────────────────────────
  const fetchCollections = useCallback(async (brandId: string) => {
    try {
      const { data, error: err } = await supabase
        .from("product_offers")
        .select("collection_name, product:product_id(image_url, name, category)")
        .eq("partner_id", brandId)
        .eq("is_active", true)
        .not("collection_name", "is", null);

      if (err) { console.error("[Collections] fetch error:", err.message); return; }

      const offers = (data ?? []) as CollectionOffer[];
      const grouped = groupByCollection(offers);
      setBrandData((prev) => ({
        ...prev,
        [brandId]: { grouped, totalProducts: offers.length },
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
        title={t("nav.collections", "Collections") + " | TerrasseaHUB"}
        description={t("brand.heroDescription")}
      />
      <Header />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative bg-[#1C1A17] pt-24 pb-20 overflow-hidden">
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
                {String(Object.values(brandData).reduce((acc, d) => acc + Object.keys(d.grouped).length, 0))}
              </p>
              <p className="text-[10px] font-body text-white/40 uppercase tracking-wider">{t("brand.collectionsCount")}</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="font-display text-2xl font-bold text-white">
                {String(Object.values(brandData).reduce((acc, d) => acc + d.totalProducts, 0))}
              </p>
              <p className="text-[10px] font-body text-white/40 uppercase tracking-wider">{t("brand.productsCount")}</p>
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
        <section className="py-24 bg-[#FAF7F4]">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-foreground border-t-transparent" />
          </div>
        </section>
      ) : (
        brands.map((brand, brandIdx) => {
          const data = brandData[brand.id];
          const collections = data ? data.grouped : {};
          const collNames = Object.keys(collections);
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
                        <img src={heroImg} alt={brand.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="aspect-[4/3] rounded-2xl bg-[#1C1A17] flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M0 20L20 0l20 20-20 20z' fill-opacity='.05'/%3E%3C/g%3E%3C/svg%3E\")" }} />
                        {brand.logo_url ? (
                          <img src={brand.logo_url} alt={brand.name} className="h-20 w-20 object-contain opacity-80" />
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
                        <img src={brand.logo_url} alt="" className="h-10 w-10 rounded-lg object-contain bg-muted p-1" />
                      ) : null}
                      <div>
                        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                          {brand.name}
                        </h2>
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

                    {/* Stats + mini collection previews */}
                    <div className="flex items-center gap-4 text-xs font-body text-muted-foreground mb-5">
                      <span className="flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5" />
                        {t("brand.collectionCount", { count: collNames.length })}
                      </span>
                      {data ? (
                        <span>{t("brand.productCount", { count: data.totalProducts })}</span>
                      ) : null}
                    </div>

                    {/* Mini preview thumbnails — always visible */}
                    {collNames.length > 0 ? (
                      <div className="flex gap-2 mb-6">
                        {collNames.map((collName) => {
                          const items = collections[collName] ?? [];
                          const thumb = items.find((i) => i.product?.image_url)?.product?.image_url ?? null;
                          return (
                            <Link
                              key={collName}
                              to={"/brands/" + brand.slug + "?collection=" + encodeURIComponent(collName)}
                              className="group flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-background hover:border-foreground/30 transition-colors"
                            >
                              {thumb ? (
                                <img src={thumb} alt="" className="h-5 w-5 rounded-full object-cover" />
                              ) : (
                                <div className="h-5 w-5 rounded-full bg-gradient-to-br from-stone-200 to-stone-300 flex items-center justify-center">
                                  <span className="text-[7px] font-bold text-stone-500">{collName.charAt(0)}</span>
                                </div>
                              )}
                              <span className="text-[11px] font-display font-semibold text-foreground">{collName}</span>
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}

                    {/* Expand / Collapse button */}
                    {collNames.length > 0 ? (
                      <button
                        onClick={() => setExpandedBrand((prev) => (prev === brand.id ? null : brand.id))}
                        className="inline-flex items-center gap-1.5 text-xs font-display font-semibold text-[#D4603A] hover:text-[#B84E2E] transition-colors"
                      >
                        {expandedBrand === brand.id ? t("brand.hideCollections") : t("brand.showCollections")}
                        {expandedBrand === brand.id ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* ── Expanded collections grid ───────────────────────────── */}
                {expandedBrand === brand.id && collNames.length > 0 ? (
                  <div className="mt-10 pt-10 border-t border-border">
                    <h3 className="font-display text-sm font-bold text-foreground uppercase tracking-wider mb-6">
                      {t("brand.collectionsOf", { name: brand.name })}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {collNames.map((collName) => {
                        const items = collections[collName] ?? [];
                        const heroImage = items.find((i) => i.product?.image_url)?.product?.image_url ?? null;
                        const categories = [...new Set(items.map((i) => i.product?.category).filter(Boolean))];

                        return (
                          <Link
                            key={collName}
                            to={"/brands/" + brand.slug + "?collection=" + encodeURIComponent(collName)}
                            className="group block"
                          >
                            <div className="aspect-[4/3] rounded-xl overflow-hidden mb-3 relative">
                              {heroImage ? (
                                <img
                                  src={heroImage}
                                  alt={collName}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-stone-100 via-stone-200 to-stone-300 flex items-center justify-center">
                                  <span className="font-display text-3xl font-bold text-stone-400/50">{collName.charAt(0)}</span>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                              <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                                <ArrowRight className="h-3.5 w-3.5 text-foreground" />
                              </div>
                            </div>
                            <h4 className="font-display text-base font-bold text-foreground group-hover:text-[#D4603A] transition-colors">
                              {collName}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-body text-muted-foreground">
                                {t("brand.productCount", { count: items.length })}
                              </span>
                              {categories.length > 0 ? (
                                <span className="text-[10px] font-body text-muted-foreground">
                                  {"\u00b7 " + categories.slice(0, 2).join(", ")}
                                </span>
                              ) : null}
                            </div>
                          </Link>
                        );
                      })}
                    </div>

                    <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <Link
                        to={"/brands/" + brand.slug}
                        className="inline-flex items-center gap-2 px-6 py-3 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
                      >
                        {t("brand.discover", { name: brand.name })}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <span className="text-[10px] font-body text-muted-foreground">
                        {t("brand.briefAccess")}
                      </span>
                    </div>
                  </div>
                ) : null}
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
