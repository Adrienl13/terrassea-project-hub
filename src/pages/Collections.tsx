import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
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
}

interface CollectionOffer {
  collection_name: string | null;
  product: {
    image_url: string | null;
    name: string;
  } | null;
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
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);
  const [brands, setBrands] = useState<BrandPartner[]>([]);
  const [brandCollections, setBrandCollections] = useState<Record<string, Record<string, CollectionOffer[]>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Load brands on mount ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data, error: err } = await supabase
          .from("partners")
          .select("id, slug, name, logo_url, country, country_code, description, partner_mode")
          .in("partner_mode", ["brand_member", "brand_network"])
          .eq("is_active", true)
          .order("name");

        if (cancelled) return;
        if (err) {
          setError(err.message);
          setLoading(false);
          return;
        }
        setBrands(data ?? []);
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erreur inconnue");
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Auto-expand first brand once loaded ──────────────────────────────────
  useEffect(() => {
    if (brands.length > 0 && expandedBrand === null) {
      setExpandedBrand(brands[0].id);
    }
  }, [brands]);

  // ── Fetch collections for a given brand ──────────────────────────────────
  const fetchCollections = useCallback(async (brandId: string) => {
    try {
      const { data, error: err } = await supabase
        .from("product_offers")
        .select("collection_name, product:product_id(image_url, name)")
        .eq("partner_id", brandId)
        .eq("is_active", true)
        .not("collection_name", "is", null);

      if (err) {
        console.error("[Collections] fetch error:", err.message);
        return;
      }

      const offers = (data ?? []) as CollectionOffer[];
      setBrandCollections((prev) => ({ ...prev, [brandId]: groupByCollection(offers) }));
    } catch (e) {
      console.error("[Collections] fetch error:", e);
    }
  }, []);

  // ── Trigger fetch when expanded brand changes ────────────────────────────
  useEffect(() => {
    if (!expandedBrand) return;
    // Only fetch if not already cached
    setBrandCollections((prev) => {
      if (prev[expandedBrand]) return prev;
      // Trigger fetch outside of setState
      fetchCollections(expandedBrand);
      return prev;
    });
  }, [expandedBrand, fetchCollections]);

  // ── Toggle ───────────────────────────────────────────────────────────────
  const handleToggle = (brandId: string) => {
    setExpandedBrand((prev) => (prev === brandId ? null : brandId));
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <SEO title={t("nav.collections", "Collections") + " | TerrasseaHUB"} />
      <Header />

      <section className="bg-[#FAF7F4] pt-24 pb-16">
        <div className="container mx-auto px-6 max-w-4xl">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-3">
            {t("nav.collections", "Collections")}
          </h1>
          <p className="text-base font-body text-muted-foreground max-w-xl">
            {"Univers de marque s\u00e9lectionn\u00e9s pour l\u2019h\u00f4tellerie et la restauration haut de gamme."}
          </p>
        </div>
      </section>

      <section className="py-12 bg-[#FAF7F4] min-h-[50vh]">
        <div className="container mx-auto px-6 max-w-5xl">
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-xs font-body text-red-800">{"Erreur : " + error}</p>
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-foreground border-t-transparent" />
            </div>
          ) : brands.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm font-body text-muted-foreground">{"Aucune marque Brand disponible pour le moment."}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {brands.map((brand) => {
                const isExpanded = expandedBrand === brand.id;
                const collections = brandCollections[brand.id];
                const collNames = collections ? Object.keys(collections) : [];
                const flag = countryFlag(brand.country_code);

                return (
                  <div key={brand.id} className="bg-white rounded-2xl border border-border overflow-hidden">
                    <button
                      onClick={() => handleToggle(brand.id)}
                      className="w-full flex items-center gap-4 p-5 text-left hover:bg-card/50 transition-colors"
                    >
                      {brand.logo_url ? (
                        <img src={brand.logo_url} alt={brand.name} className="h-12 w-12 rounded-xl object-contain bg-muted p-1" />
                      ) : (
                        <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center font-display font-bold text-lg text-muted-foreground">
                          {flag || brand.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-lg font-bold text-foreground">{brand.name}</h3>
                          {flag ? <span className="text-base">{flag}</span> : null}
                        </div>
                        {brand.description ? (
                          <p className="text-xs font-body text-muted-foreground line-clamp-1 mt-0.5">{brand.description}</p>
                        ) : null}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                    </button>

                    {isExpanded ? (
                      <div className="border-t border-border p-5">
                        {collNames.length === 0 ? (
                          <p className="text-xs font-body text-muted-foreground text-center py-6">
                            {"Chargement des collections\u2026"}
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {collNames.map((collName, idx) => {
                              const items = collections[collName] ?? [];
                              const heroImage = items.find((i) => i.product?.image_url)?.product?.image_url ?? null;

                              return (
                                <Link
                                  key={collName}
                                  to={"/brands/" + brand.slug + "?collection=" + encodeURIComponent(collName)}
                                  className={"group relative overflow-hidden rounded-xl " + (idx < 2 ? "aspect-[4/3]" : "aspect-square")}
                                >
                                  {heroImage ? (
                                    <img
                                      src={heroImage}
                                      alt={collName}
                                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                  ) : (
                                    <div className="absolute inset-0 bg-gradient-to-br from-stone-200 to-stone-300" />
                                  )}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent group-hover:from-black/80 transition-colors" />
                                  <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
                                    <div>
                                      <h4 className="font-display text-lg font-bold text-white tracking-tight">{collName}</h4>
                                      <p className="text-[10px] font-body text-white/60 mt-0.5">
                                        {String(items.length) + " produit" + (items.length > 1 ? "s" : "")}
                                      </p>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                        <Link
                          to={"/brands/" + brand.slug}
                          className="inline-flex items-center gap-1.5 text-xs font-display font-semibold text-[#D4603A] hover:text-[#B84E2E] transition-colors mt-4"
                        >
                          {"Voir la page " + brand.name}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </>
  );
}
