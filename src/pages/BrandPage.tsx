import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Award, Calendar, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import ProjectBriefModal from "@/components/products/ProjectBriefModal";
import type { ProductOffer } from "@/lib/productOffers";
import type { DBProduct } from "@/lib/products";

// ── Types ────────────────────────────────────────────────────────────────────

interface BrandPartner {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  country: string | null;
  country_code: string | null;
  city: string | null;
  logo_url: string | null;
  hero_image_url: string | null;
  specialties: string[] | null;
  certifications: string[] | null;
  partner_mode: string;
  founded_year: number | null;
  website: string | null;
}

interface CollectionOffer {
  id: string;
  collection_name: string;
  partner_id: string;
  pricing_mode: string;
  product: {
    id: string;
    name: string;
    image_url: string | null;
  } | null;
}

function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = String(item[key] ?? "");
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

function countryFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(
    ...code.toUpperCase().split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function BrandPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const highlightCollection = searchParams.get("collection");
  const collectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [briefOffer, setBriefOffer] = useState<CollectionOffer | null>(null);

  // Fetch brand partner
  const { data: brand, isLoading: brandLoading } = useQuery({
    queryKey: ["brand-page", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .eq("slug", slug!)
        .in("partner_mode", ["brand_member", "brand_network"])
        .single();
      if (error) throw error;
      return data as BrandPartner;
    },
    enabled: !!slug,
  });

  // Fetch collection offers (no prices!)
  const { data: offers = [] } = useQuery({
    queryKey: ["brand-collections", brand?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_offers")
        .select("id, collection_name, partner_id, pricing_mode, product:product_id(id, name, image_url)")
        .eq("partner_id", brand!.id)
        .eq("is_active", true)
        .not("collection_name", "is", null);
      if (error) throw error;
      return (data ?? []) as CollectionOffer[];
    },
    enabled: !!brand?.id,
  });

  const collections = groupBy(offers.filter((o) => o.collection_name), "collection_name");
  const collectionNames = Object.keys(collections);

  // Scroll to highlighted collection
  useEffect(() => {
    if (highlightCollection && collectionRefs.current[highlightCollection]) {
      setTimeout(() => {
        collectionRefs.current[highlightCollection]?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [highlightCollection, collectionNames.length]);

  // Dummy product for ProjectBriefModal
  const briefProduct = briefOffer?.product
    ? { id: briefOffer.product.id, name: briefOffer.product.name, image_url: briefOffer.product.image_url, category: "", main_color: "" } as DBProduct
    : null;

  const briefOfferForModal: ProductOffer | null = briefOffer
    ? {
        id: briefOffer.id,
        product_id: briefOffer.product?.id || "",
        partner_id: briefOffer.partner_id,
        price: null,
        currency: null,
        stock_status: null,
        stock_quantity: null,
        delivery_delay_days: null,
        minimum_order: null,
        purchase_type: null,
        notes: null,
        is_active: true,
        pricing_mode: "on_request",
        collection_name: briefOffer.collection_name,
        partner: brand ? { id: brand.id, name: brand.name, slug: brand.slug, partner_type: "brand", country: brand.country, city: brand.city, logo_url: brand.logo_url, partner_mode: brand.partner_mode } : undefined,
      }
    : null;

  const flag = countryFlag(brand?.country_code);

  if (brandLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-foreground border-t-transparent" />
        </div>
      </>
    );
  }

  if (!brand) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">{t("brand.notFound")}</h1>
          <p className="text-sm font-body text-muted-foreground mb-6">{t("brand.notFoundDescription")}</p>
          <Link to="/collections" className="text-sm font-display font-semibold text-foreground hover:underline">
            &larr; {t("brand.backToCollections")}
          </Link>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <SEO title={`${brand.name} | TerrasseaHUB`} description={brand.description || `D\u00e9couvrez les collections ${brand.name} pour l'h\u00f4tellerie-restauration outdoor.`} />
      <Header />

      {/* Section 1 — Hero */}
      <section
        className="relative min-h-[50vh] flex items-end"
        style={{
          background: brand.hero_image_url
            ? `linear-gradient(to top, rgba(28,26,23,0.85) 0%, rgba(28,26,23,0.3) 60%), url(${brand.hero_image_url}) center/cover no-repeat`
            : "#1C1A17",
        }}
      >
        <div className="container mx-auto px-6 pb-12 pt-24">
          <Link to="/collections" className="inline-flex items-center gap-1.5 text-xs font-body text-white/60 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> {t("brand.backToCollections")}
          </Link>
          <div className="flex items-end gap-6">
            {brand.logo_url && (
              <img src={brand.logo_url} alt={brand.name} className="h-16 w-16 rounded-xl object-contain bg-white/10 backdrop-blur-sm p-2" />
            )}
            <div>
              <h1 className="font-display text-4xl md:text-5xl font-bold text-white tracking-tight">{brand.name}</h1>
              <div className="flex items-center gap-3 mt-2 text-sm font-body text-white/60">
                {flag && <span className="text-lg">{flag}</span>}
                {brand.country && <span>{brand.country}</span>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 — Origine & Savoir-faire */}
      <section className="bg-[#FAF7F4] py-16">
        <div className="container mx-auto px-6 max-w-3xl">
          <h2 className="font-display text-2xl font-bold text-foreground mb-6">{t("brand.originExpertise")}</h2>
          {brand.description && (
            <p className="text-sm font-body text-muted-foreground leading-relaxed mb-8">{brand.description}</p>
          )}
          <div className="flex flex-wrap gap-6">
            {brand.country && (
              <div className="flex items-center gap-2 text-sm font-body text-muted-foreground">
                <MapPin className="h-4 w-4" /> {brand.country}{brand.city ? `, ${brand.city}` : ""}
              </div>
            )}
            {brand.certifications && brand.certifications.length > 0 && (
              <div className="flex items-center gap-2 text-sm font-body text-muted-foreground">
                <Award className="h-4 w-4" /> {brand.certifications.join(", ")}
              </div>
            )}
          </div>
          {brand.specialties && brand.specialties.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {brand.specialties.map((s) => (
                <span key={s} className="text-xs px-3 py-1 rounded-full bg-white border border-border text-muted-foreground font-body">{s}</span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Section 3 — Collections */}
      {collectionNames.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-6">
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">{t("brand.ourCollections")}</h2>
            <p className="text-sm font-body text-muted-foreground mb-10">{t("brand.collectionSubtitle")}</p>

            <div className="space-y-12">
              {collectionNames.map((collName) => {
                const items = collections[collName];
                const isHighlighted = highlightCollection === collName;
                return (
                  <div
                    key={collName}
                    ref={(el) => { collectionRefs.current[collName] = el; }}
                    className={`rounded-2xl p-6 transition-all ${isHighlighted ? "ring-2 ring-[#D4603A] bg-[#FAF7F4]" : "bg-card border border-border"}`}
                  >
                    <h3 className="font-display text-lg font-bold text-foreground mb-4">{collName}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {items.slice(0, 8).map((item) => (
                        <div key={item.id} className="group">
                          <div className="aspect-square rounded-xl overflow-hidden bg-muted mb-2">
                            {item.product?.image_url ? (
                              <img
                                src={item.product.image_url}
                                alt={item.product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-body">
                                {t("brand.noPhoto")}
                              </div>
                            )}
                          </div>
                          <p className="text-xs font-display font-semibold text-foreground truncate">{item.product?.name || "Produit"}</p>
                          {/* Never display price */}
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => setBriefOffer(items[0] || null)}
                      className="mt-6 inline-flex items-center gap-2 text-sm font-display font-semibold text-[#D4603A] hover:text-[#B84E2E] transition-colors"
                    >
                      {t("brand.submitBriefForCollection")} <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Section 4 — CTA final */}
      <section className="bg-[#1C1A17] py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-3">
            {t("brand.outdoorProject")}
          </h2>
          <p className="text-sm font-body text-white/60 mb-8">
            {t("brand.teamContact")}
          </p>
          {offers.length > 0 && (
            <button
              onClick={() => setBriefOffer(offers[0])}
              className="px-8 py-3 font-display font-semibold text-sm bg-[#D4603A] text-white rounded-full hover:opacity-90 transition-opacity"
            >
              {t("brand.submitBrief")} &rarr;
            </button>
          )}
        </div>
      </section>

      <Footer />

      {/* Brief Modal */}
      {briefOffer && briefProduct && briefOfferForModal && (
        <ProjectBriefModal
          open={!!briefOffer}
          onClose={() => setBriefOffer(null)}
          product={briefProduct}
          offer={briefOfferForModal}
        />
      )}
    </>
  );
}
