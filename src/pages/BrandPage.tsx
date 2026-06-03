import { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Award, Calendar, ArrowRight, Globe, FolderOpen, Package, Truck, ExternalLink, Mail, Phone, Play, X, Sparkles, FileText } from "lucide-react";
import { toast } from "sonner";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import ProjectBriefModal from "@/components/products/ProjectBriefModal";
import type { ProductOffer } from "@/lib/productOffers";
import type { DBProduct } from "@/lib/products";
import { urlForProduct } from "@/lib/productRoutes";
import FoundingBadge from "@/components/common/FoundingBadge";
import type { FoundingTier } from "@/hooks/useFoundingScore";

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
  cover_photo_url: string | null;
  specialties: string[] | null;
  certifications: string[] | null;
  partner_mode: string;
  founded_year: number | null;
  website: string | null;
  gallery_urls: string[] | null;
  delivery_countries: string[] | null;
  video_url: string | null;
  showroom_address: string | null;
  locations: { label?: string; address?: string; city?: string; country?: string }[] | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_founding: boolean | null;
  founding_tier: string | null;
  founding_tier_rank: number | null;
}

interface BrandReferenceItem {
  id: string;
  title: string;
  location: string | null;
  description: string | null;
  photos: string[];
  product_ids: string[];
}

interface RefProduct {
  id: string;
  name: string;
  image_url: string | null;
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

function getEmbedUrl(url: string): string {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return url;
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
  const [briefOffer, setBriefOffer] = useState<CollectionOffer | null>(null);
  const [openCollection, setOpenCollection] = useState<any | null>(null);
  const [cgvLoading, setCgvLoading] = useState(false);

  // Final CTA: brief flow if the brand has offers, otherwise reach out directly
  // (email if available, else scroll to the contact & addresses section).
  const handleContactCta = () => {
    if (offers.length > 0) { setBriefOffer(offers[0]); return; }
    if (brand?.contact_email) { window.location.href = `mailto:${brand.contact_email}`; return; }
    document.getElementById("brand-contact")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleViewCgv = async (cgvId: string) => {
    setCgvLoading(true);
    const { data, error } = await supabase.functions.invoke("get-signed-cgv-url", {
      body: { partner_cgv_id: cgvId },
    });
    setCgvLoading(false);
    if (error || !data?.url) {
      toast.error(t("brand.cgvError", "Impossible d'ouvrir les conditions de vente pour le moment."));
      return;
    }
    window.open(data.url, "_blank", "noopener,noreferrer");
  };

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
      // `locations` is a fresh column not yet in the generated Supabase types.
      return data as unknown as BrandPartner;
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

  // Real collections (source of truth) + their linked products (collection_id).
  const { data: brandCollections = [] } = useQuery({
    queryKey: ["brand-page-collections", brand?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("brand_collections")
        .select("id, name, designer, year, description, cover_image_url, gallery_urls, environment_urls, display_order")
        .eq("partner_id", brand!.id)
        .eq("is_active", true)
        .order("display_order");
      return (data ?? []) as any[];
    },
    enabled: !!brand?.id,
  });

  // Active (published) sales terms for this brand, if any.
  const { data: brandCgv } = useQuery({
    queryKey: ["brand-active-cgv", brand?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_cgv")
        .select("id, title, version, effective_date")
        .eq("partner_id", brand!.id)
        .eq("status", "active")
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as { id: string; title: string | null; version: number; effective_date: string | null } | null;
    },
    enabled: !!brand?.id,
  });

  const { data: collectionProducts = [] } = useQuery({
    queryKey: ["brand-page-collection-products", brand?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, image_url, collection_id")
        .eq("partner_id", brand!.id)
        .not("collection_id", "is", null)
        .eq("publish_status", "published");
      return (data ?? []) as any[];
    },
    enabled: !!brand?.id,
  });

  // Fetch brand references (project portfolio)
  const { data: references = [] } = useQuery({
    queryKey: ["brand-page-references", brand?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_references")
        .select("id, title, location, description, photos, product_ids")
        .eq("partner_id", brand!.id)
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return (data ?? []) as BrandReferenceItem[];
    },
    enabled: !!brand?.id,
  });

  // Resolve products linked in references
  const refProductIds = [...new Set(references.flatMap((r) => r.product_ids || []))];
  const { data: refProducts = [] } = useQuery({
    queryKey: ["brand-page-ref-products", refProductIds],
    queryFn: async () => {
      if (refProductIds.length === 0) return [];
      const { data } = await supabase.from("products").select("id, name, image_url").in("id", refProductIds);
      return (data ?? []) as RefProduct[];
    },
    enabled: refProductIds.length > 0,
  });

  const [expandedRef, setExpandedRef] = useState<string | null>(null);

  // Collections now come from brand_collections (source of truth); products are
  // linked via products.collection_id (no more fragile text-name matching).
  const collectionNames = brandCollections.map((c: any) => c.name);

  // Deep-link ?collection=<name> opens that collection's detail modal directly.
  useEffect(() => {
    if (highlightCollection && brandCollections.length) {
      const match = brandCollections.find((c: any) => c.name === highlightCollection);
      if (match) setOpenCollection(match);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightCollection, brandCollections.length]);

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

  const yearsExperience = brand.founded_year ? new Date().getFullYear() - brand.founded_year : null;
  const tagline = brand.description ? brand.description.split(/[.!?]/)[0] : null;
  const galleryImages = brand.gallery_urls?.filter(Boolean) || [];
  const websiteDomain = brand.website ? brand.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*/, "") : null;
  // Ensure the href is absolute — a stored value like "www.isimar.es" without a
  // scheme is otherwise treated as a relative path and navigates within the app.
  const websiteHref = brand.website
    ? (/^https?:\/\//i.test(brand.website) ? brand.website : `https://${brand.website}`)
    : null;
  const extraLocations = Array.isArray(brand.locations)
    ? brand.locations.filter((l) => l && (l.label || l.address || l.city || l.country))
    : [];
  // Unified, uniform list of all brand addresses (primary showroom first).
  const addressList: { label: string; address: string; city: string; country: string }[] = [
    ...(brand.showroom_address
      ? [{ label: t("brand.mainShowroom", "Showroom principal"), address: brand.showroom_address, city: brand.city || "", country: brand.country || "" }]
      : []),
    ...extraLocations.map((l) => ({
      label: (l.label || "").trim(),
      address: (l.address || "").trim(),
      city: (l.city || "").trim(),
      country: (l.country || "").trim(),
    })),
  ];
  const hasContact = !!(brand.contact_name || brand.contact_email || brand.contact_phone);
  const hasKeyFigures = yearsExperience || collectionNames.length > 0 || offers.length > 0 || (brand.delivery_countries && brand.delivery_countries.length > 0);

  return (
    <>
      <SEO title={`${brand.name} — Outdoor Furniture Collection`} description={brand.description || `Découvrez les collections ${brand.name} pour l'hôtellerie-restauration outdoor.`} />
      <Header />

      {/* ═══ Section 1 — Hero premium ═══ */}
      <section
        className="relative min-h-[60vh] flex items-end"
        style={{
          background: brand.hero_image_url
            ? `linear-gradient(to top, rgba(28,26,23,0.92) 0%, rgba(28,26,23,0.4) 50%, rgba(28,26,23,0.15) 100%), url(${brand.hero_image_url}) center/cover no-repeat`
            : "linear-gradient(135deg, #1C1A17 0%, #2A2520 100%)",
        }}
      >
        <div className="container mx-auto px-6 pb-14 pt-12 md:pt-32">
          <Link to="/collections" className="inline-flex items-center gap-1.5 text-xs font-body text-white/50 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> {t("brand.backToCollections")}
          </Link>
          <div className="flex items-end gap-6">
            {brand.logo_url && (
              <div className="h-20 flex items-center justify-center bg-white rounded-2xl px-4 shadow-lg shadow-black/20 shrink-0">
                <img loading="lazy" src={brand.logo_url} alt={brand.name} className="max-h-12 w-auto max-w-[180px] object-contain" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-4xl md:text-5xl font-bold text-white tracking-tight">{brand.name}</h1>
                {brand.is_founding && brand.founding_tier ? (
                  <FoundingBadge tier={brand.founding_tier as FoundingTier} />
                ) : null}
              </div>
              {tagline && <p className="text-sm font-body text-white/60 mt-2 max-w-xl">{tagline}.</p>}
              <div className="flex flex-wrap items-center gap-4 mt-4">
                {flag && brand.country && (
                  <span className="flex items-center gap-1.5 text-xs font-body text-white/70">
                    <MapPin className="h-3 w-3" /> {flag} {brand.country}{brand.city ? `, ${brand.city}` : ""}
                  </span>
                )}
                {brand.founded_year && (
                  <span className="flex items-center gap-1.5 text-xs font-body text-white/70">
                    <Calendar className="h-3 w-3" /> Depuis {brand.founded_year}
                  </span>
                )}
                {websiteDomain && websiteHref && (
                  <a href={websiteHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-body text-white/70 hover:text-white transition-colors">
                    <Globe className="h-3 w-3" /> {websiteDomain} <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Section 2 — Chiffres clés ═══ */}
      {hasKeyFigures && (
        <section className="bg-[#1C1A17] border-t border-white/5">
          <div className="container mx-auto px-6 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {yearsExperience && yearsExperience > 0 && (
                <div className="text-center">
                  <p className="font-display text-3xl font-bold text-white">{yearsExperience}</p>
                  <p className="text-[10px] font-body text-white/50 uppercase tracking-wider mt-1">Années d'expérience</p>
                </div>
              )}
              <div className="text-center">
                <p className="font-display text-3xl font-bold text-white">{collectionNames.length}</p>
                <p className="text-[10px] font-body text-white/50 uppercase tracking-wider mt-1">Collections</p>
              </div>
              <div className="text-center">
                <p className="font-display text-3xl font-bold text-white">{offers.length}</p>
                <p className="text-[10px] font-body text-white/50 uppercase tracking-wider mt-1">Produits</p>
              </div>
              {brand.delivery_countries && brand.delivery_countries.length > 0 && (
                <div className="text-center">
                  <p className="font-display text-3xl font-bold text-white">{brand.delivery_countries.length}</p>
                  <p className="text-[10px] font-body text-white/50 uppercase tracking-wider mt-1">Pays livrés</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ═══ Section 3 — Origine & savoir-faire ═══ */}
      <section className="bg-[#FAF7F4] py-16 sm:py-24">
        <div className="container mx-auto px-6 max-w-6xl">
          {/* Header */}
          <div className="max-w-2xl mb-12 sm:mb-16">
            <p className="text-[11px] font-display font-semibold uppercase tracking-[0.25em] text-[#D4603A] mb-3">
              {t("brand.heritageEyebrow", "Maison & savoir-faire")}
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">{t("brand.originExpertise")}</h2>
          </div>

          {/* Editorial: portrait image + story & identity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Image */}
            <div>
              {galleryImages.length > 1 ? (
                <Carousel className="w-full">
                  <CarouselContent>
                    {galleryImages.map((url, i) => (
                      <CarouselItem key={i}>
                        <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-xl shadow-black/[0.08]">
                          <img loading="lazy" src={url} alt={`${brand.name} — ${i + 1}`} className="w-full h-full object-cover" />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="left-3 bg-white/90" />
                  <CarouselNext className="right-3 bg-white/90" />
                </Carousel>
              ) : (
                <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-xl shadow-black/[0.08]">
                  {galleryImages[0] || brand.cover_photo_url ? (
                    <img loading="lazy" src={galleryImages[0] || brand.cover_photo_url!} alt={brand.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#F5F0EB] to-[#E8E0D8] flex items-center justify-center">
                      <span className="font-display text-7xl font-bold text-foreground/10">{brand.name[0]}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Story + identity */}
            <div>
              {brand.description && (
                <div className="space-y-4">
                  {brand.description.split(/\n{2,}|\n/).map((para) => para.trim()).filter(Boolean).map((para, i) => (
                    <p
                      key={i}
                      className={
                        "text-base sm:text-lg font-body text-foreground/75 leading-relaxed" +
                        (i === 0
                          ? " first-letter:text-5xl first-letter:font-display first-letter:font-bold first-letter:text-[#D4603A] first-letter:float-left first-letter:leading-[0.85] first-letter:mr-2.5 first-letter:mt-1"
                          : "")
                      }
                    >
                      {para}
                    </p>
                  ))}
                </div>
              )}

              {/* Identity card */}
              {(brand.country || brand.founded_year || (brand.certifications && brand.certifications.length > 0)) && (
                <dl className="grid grid-cols-2 gap-x-6 gap-y-6 mt-10 pt-8 border-t border-border">
                  {brand.country && (
                    <div>
                      <dt className="text-[10px] font-display font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-1.5 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-[#D4603A]" /> {t("brand.factOrigin", "Origine")}
                      </dt>
                      <dd className="text-sm font-display font-bold text-foreground">{brand.country}{brand.city ? `, ${brand.city}` : ""}</dd>
                    </div>
                  )}
                  {brand.founded_year && (
                    <div>
                      <dt className="text-[10px] font-display font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-1.5 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-[#D4603A]" /> {t("brand.factSince", "Depuis")}
                      </dt>
                      <dd className="text-sm font-display font-bold text-foreground">{brand.founded_year}</dd>
                    </div>
                  )}
                  {brand.certifications && brand.certifications.length > 0 && (
                    <div className="col-span-2">
                      <dt className="text-[10px] font-display font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Award className="h-3.5 w-3.5 text-[#D4603A]" /> {t("brand.factCertifications", "Certifications")}
                      </dt>
                      <dd className="flex flex-wrap gap-2">
                        {brand.certifications.map((c) => (
                          <span key={c} className="inline-flex items-center gap-1.5 text-xs font-display font-semibold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Award className="h-3 w-3" /> {c}
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
          </div>

          {/* Savoir-faire cards */}
          {brand.specialties && brand.specialties.length > 0 && (
            <div className="mt-16 sm:mt-20">
              <h3 className="text-center font-display text-xl sm:text-2xl font-bold text-foreground mb-8">
                {t("brand.ourKnowHow", "Notre savoir-faire")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {brand.specialties.map((s) => (
                  <div key={s} className="bg-white rounded-2xl border border-border p-5 flex items-center gap-3.5 hover:shadow-md hover:shadow-black/[0.04] transition-shadow">
                    <div className="h-10 w-10 rounded-xl bg-[#D4603A]/10 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-4 w-4 text-[#D4603A]" />
                    </div>
                    <span className="text-sm font-display font-semibold text-foreground">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══ Section 3b — Video ═══ */}
      {brand.video_url && (
        <section className="py-16">
          <div className="container mx-auto px-6">
            <h2 className="font-display text-2xl font-bold text-foreground mb-8 text-center flex items-center justify-center gap-2">
              <Play className="h-5 w-5 text-[#D4603A]" /> Découvrir la marque
            </h2>
            <div className="max-w-3xl mx-auto">
              <div className="aspect-video rounded-2xl overflow-hidden shadow-xl">
                <iframe
                  src={getEmbedUrl(brand.video_url)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══ Section 3c — Projets & Références ═══ */}
      {references.length > 0 && (
        <section className="bg-[#FAF7F4] py-16">
          <div className="container mx-auto px-6">
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">Projets réalisés</h2>
            <p className="text-sm font-body text-muted-foreground mb-10">Des réalisations concrètes à travers l'Europe</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {references.map((ref) => {
                const cover = ref.photos?.[0] || null;
                const isExpanded = expandedRef === ref.id;
                const linkedProducts = refProducts.filter((p) => ref.product_ids?.includes(p.id));

                return (
                  <div key={ref.id} className={`rounded-2xl overflow-hidden border transition-all bg-white ${isExpanded ? "border-[#D4603A] shadow-lg col-span-full" : "border-border hover:shadow-md"}`}>
                    <button onClick={() => setExpandedRef(isExpanded ? null : ref.id)} className="w-full text-left">
                      <div className={`relative overflow-hidden ${isExpanded ? "h-64" : "h-48"}`}>
                        {cover ? (
                          <img loading="lazy" src={cover} alt={ref.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
                            <Package className="h-10 w-10 text-amber-300" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        <div className="absolute bottom-4 left-4 right-4">
                          <h3 className="font-display text-lg font-bold text-white">{ref.title}</h3>
                          {ref.location && (
                            <p className="text-xs font-body text-white/70 flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" /> {ref.location}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-6">
                        {ref.description && (
                          <p className="text-sm font-body text-muted-foreground leading-relaxed mb-6">{ref.description}</p>
                        )}

                        {/* Extra photos */}
                        {ref.photos.length > 1 && (
                          <div className="grid grid-cols-3 gap-2 mb-6">
                            {ref.photos.slice(1).map((url, i) => (
                              <div key={i} className="aspect-[4/3] rounded-xl overflow-hidden">
                                <img loading="lazy" src={url} alt="" className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Linked products → sales funnel */}
                        {linkedProducts.length > 0 && (
                          <div>
                            <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                              Produits utilisés dans ce projet
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {linkedProducts.map((p) => (
                                <Link key={p.id} to={urlForProduct(p, p.owner_brand_slug)} className="group border border-border rounded-xl overflow-hidden hover:border-[#D4603A] hover:shadow-sm transition-all">
                                  <div className="aspect-square bg-muted overflow-hidden">
                                    {p.image_url ? (
                                      <img loading="lazy" src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center"><Package className="h-6 w-6 text-muted-foreground/30" /></div>
                                    )}
                                  </div>
                                  <div className="p-2.5 flex items-center justify-between">
                                    <p className="text-[11px] font-display font-semibold text-foreground truncate">{p.name}</p>
                                    <ExternalLink className="h-3 w-3 text-[#D4603A] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══ Section 4 — Collections ═══ */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="font-display text-2xl font-bold text-foreground">{t("brand.ourCollections")}</h2>
            {collectionNames.length > 0 && (
              <span className="text-xs font-display font-semibold bg-muted text-muted-foreground px-2.5 py-0.5 rounded-full">{collectionNames.length}</span>
            )}
          </div>
          <p className="text-sm font-body text-muted-foreground mb-10">{t("brand.collectionSubtitle")}</p>

          {brandCollections.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {brandCollections.map((coll: any) => {
                const items = collectionProducts.filter((p: any) => p.collection_id === coll.id);
                const photoCount = (coll.gallery_urls?.length || 0) + (coll.environment_urls?.length || 0);
                return (
                  <button
                    key={coll.id}
                    onClick={() => setOpenCollection(coll)}
                    className="group text-left rounded-2xl overflow-hidden border border-border bg-card hover:shadow-xl hover:shadow-black/[0.06] hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <div className="aspect-[4/3] relative overflow-hidden bg-muted">
                      {coll.cover_image_url ? (
                        <img loading="lazy" src={coll.cover_image_url} alt={coll.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#FAF7F4] to-muted">
                          <FolderOpen className="h-10 w-10 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        <div className="flex items-end justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-display text-lg font-bold text-white truncate">{coll.name}</h3>
                            {coll.designer ? (
                              <p className="text-xs font-body text-white/80 truncate">{t("brand.designedBy", "Design")} : {coll.designer}</p>
                            ) : null}
                          </div>
                          {coll.year ? (
                            <span className="flex-shrink-0 text-[11px] font-display font-semibold text-white/90 bg-white/15 backdrop-blur-sm px-2 py-0.5 rounded-full">{coll.year}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-[11px] font-body text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Package className="h-3.5 w-3.5" /> {items.length} {items.length !== 1 ? "produits" : "produit"}</span>
                        {photoCount > 0 && <span>· {photoCount} photo{photoCount !== 1 ? "s" : ""}</span>}
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-display font-semibold text-[#D4603A] group-hover:gap-2 transition-all">
                        {t("brand.discover", "Découvrir")} <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-2xl">
              <FolderOpen className="h-10 w-10 text-muted-foreground/30 mb-4" />
              <p className="text-sm font-display font-semibold text-foreground mb-1">Collections à venir</p>
              <p className="text-xs font-body text-muted-foreground max-w-xs">
                {brand.name} prépare ses collections. Revenez bientôt pour découvrir leur catalogue.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ═══ Section 5 — Contact / Adresses ═══ */}
      {(hasContact || addressList.length > 0) && (
        <section id="brand-contact" className="py-10 bg-[#FAF7F4] scroll-mt-20">
          <div className="container mx-auto px-6 max-w-5xl">
            <h2 className="font-display text-lg font-bold text-foreground mb-5 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#D4603A]" /> {t("brand.contactAddresses", "Contact & adresses")}
            </h2>

            <div className={`grid gap-3 ${hasContact && addressList.length > 0 ? "lg:grid-cols-3" : "grid-cols-1"}`}>
              {/* Contact — compact dark panel */}
              {hasContact && (
                <div className="bg-[#1C1A17] text-white rounded-xl p-4">
                  <h3 className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-white/45 mb-2.5">
                    {t("brand.contact", "Contact")}
                  </h3>
                  <div className="space-y-1.5">
                    {brand.contact_name && (
                      <p className="font-display text-sm font-bold text-white">{brand.contact_name}</p>
                    )}
                    {brand.contact_email && (
                      <a href={`mailto:${brand.contact_email}`} className="flex items-center gap-2 text-xs font-body text-white/75 hover:text-[#E8845F] transition-colors break-all">
                        <Mail className="h-3.5 w-3.5 flex-shrink-0 text-[#D4603A]" /> {brand.contact_email}
                      </a>
                    )}
                    {brand.contact_phone && (
                      <a href={`tel:${brand.contact_phone}`} className="flex items-center gap-2 text-xs font-body text-white/75 hover:text-[#E8845F] transition-colors">
                        <Phone className="h-3.5 w-3.5 flex-shrink-0 text-[#D4603A]" /> {brand.contact_phone}
                      </a>
                    )}
                    {websiteDomain && websiteHref && (
                      <a href={websiteHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-body text-white/75 hover:text-[#E8845F] transition-colors">
                        <Globe className="h-3.5 w-3.5 flex-shrink-0 text-[#D4603A]" /> {websiteDomain}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Addresses — compact cards */}
              {addressList.length > 0 && (
                <div className={hasContact ? "lg:col-span-2" : ""}>
                  <div className={`grid gap-3 ${addressList.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
                    {addressList.map((loc, i) => {
                      const cityLine = [loc.city, loc.country].filter(Boolean).join(", ");
                      const title = loc.label || cityLine || t("brand.location", "Localisation");
                      const mapQuery = encodeURIComponent([loc.label, loc.address, cityLine].filter(Boolean).join(", "));
                      return (
                        <div key={i} className="bg-white rounded-xl border border-border p-3.5 flex gap-3">
                          <MapPin className="h-4 w-4 text-[#D4603A] flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <h4 className="font-display text-xs font-bold text-foreground truncate">{title}</h4>
                              {mapQuery && (
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] font-display font-semibold text-[#D4603A] hover:text-[#B84E2E] flex-shrink-0 transition-colors"
                                >
                                  {t("brand.directions", "Itinéraire")}
                                </a>
                              )}
                            </div>
                            {cityLine && loc.label && (
                              <p className="text-[11px] font-body text-foreground/55">{cityLine}</p>
                            )}
                            {loc.address && (
                              <p className="text-[11px] font-body text-muted-foreground mt-0.5 leading-snug whitespace-pre-line">{loc.address}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ═══ Section 6 — CTA final ═══ */}
      <section className="bg-[#1C1A17] py-16">
        <div className="container mx-auto px-6 text-center">
          {brand.logo_url && (
            <div className="inline-flex items-center justify-center bg-white rounded-xl px-3 h-12 mb-5 shadow-md">
              <img loading="lazy" src={brand.logo_url} alt="" className="max-h-8 w-auto max-w-[150px] object-contain" />
            </div>
          )}
          <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-3">
            {t("brand.outdoorProject")}
          </h2>
          <p className="text-sm font-body text-white/60 mb-8">
            {t("brand.teamContact")}
          </p>
          <button
            onClick={handleContactCta}
            className="px-8 py-3 font-display font-semibold text-sm bg-[#D4603A] text-white rounded-full hover:opacity-90 transition-opacity"
          >
            {offers.length > 0 ? t("brand.submitBrief") : t("brand.contactUs", "Nous contacter")} &rarr;
          </button>

          {brandCgv && (
            <div className="mt-6">
              <button
                onClick={() => handleViewCgv(brandCgv.id)}
                disabled={cgvLoading}
                className="inline-flex items-center gap-2 text-xs font-body text-white/60 hover:text-white transition-colors disabled:opacity-50"
              >
                <FileText className="h-3.5 w-3.5" />
                {cgvLoading ? t("brand.cgvLoading", "Ouverture…") : t("brand.viewCgv", "Voir les conditions de vente")}
              </button>
            </div>
          )}
        </div>
      </section>

      <Footer />

      {/* Collection detail modal */}
      {openCollection && (
        <CollectionDetailModal
          coll={openCollection}
          products={collectionProducts.filter((p: any) => p.collection_id === openCollection.id)}
          onClose={() => setOpenCollection(null)}
          onBrief={() => {
            const name = openCollection.name;
            setOpenCollection(null);
            setBriefOffer({ collection_name: name } as any);
          }}
          t={t}
        />
      )}

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

// ── Collection detail — full-screen editorial takeover ──────────────────────
// Opens on card click. Inspired by how furniture brands present a collection
// (e.g. isimar.es): immersive hero → story → metadata → full-width lifestyle
// gallery → product grid (linked products) → product gallery → CTA.

function CollectionDetailModal({
  coll,
  products,
  onClose,
  onBrief,
  t,
}: {
  coll: any;
  products: any[];
  onClose: () => void;
  onBrief: () => void;
  t: any; // i18next TFunction — widened to avoid overload-signature mismatch
}) {
  const productPhotos: string[] = (coll.gallery_urls || []).filter(Boolean);
  const ambiancePhotos: string[] = (coll.environment_urls || []).filter(Boolean);

  // Lock background scroll + close on Escape while the takeover is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const meta = [
    { label: t("brand.metaCollection", "Collection"), value: coll.name },
    coll.designer ? { label: t("brand.designedBy", "Design"), value: coll.designer } : null,
    coll.year ? { label: t("brand.metaYear", "Année"), value: String(coll.year) } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto overscroll-contain">
      {/* Close — sticky over content */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 z-20 h-10 w-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
        aria-label={t("common.close", "Fermer")}
      >
        <X className="h-5 w-5" />
      </button>

      {/* ── Hero ── */}
      <div className="relative h-[58vh] sm:h-[74vh] bg-muted">
        {coll.cover_image_url ? (
          <img src={coll.cover_image_url} alt={coll.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#FAF7F4] to-muted">
            <FolderOpen className="h-16 w-16 text-muted-foreground/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/20" />
        <div className="absolute inset-0 flex flex-col items-center justify-end text-center pb-12 sm:pb-16 px-6">
          <p className="text-[11px] font-display font-semibold uppercase tracking-[0.25em] text-white/70 mb-3">
            {t("brand.collection", "Collection")}
          </p>
          <h2 className="font-display text-4xl sm:text-6xl font-bold text-white tracking-tight">{coll.name}</h2>
          {(coll.designer || coll.year) && (
            <p className="text-sm font-body text-white/80 mt-4">
              {coll.designer ? `${t("brand.designedBy", "Design")} : ${coll.designer}` : ""}
              {coll.designer && coll.year ? " · " : ""}
              {coll.year || ""}
            </p>
          )}
        </div>
      </div>

      {/* ── Story ── */}
      {coll.description ? (
        <section className="py-14 sm:py-20 px-6">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            {coll.description.split(/\n{2,}|\n/).map((p: string) => p.trim()).filter(Boolean).map((para: string, i: number) => (
              <p key={i} className="text-base sm:text-lg font-body text-foreground/80 leading-relaxed">{para}</p>
            ))}
          </div>
        </section>
      ) : (
        <div className="pt-14" />
      )}

      {/* ── Metadata strip ── */}
      {meta.length > 0 && (
        <div className="border-y border-border bg-[#FAF7F4]">
          <div className="max-w-3xl mx-auto px-6 py-7 flex flex-wrap items-center justify-center gap-x-12 gap-y-5 text-center">
            {meta.map((m) => (
              <div key={m.label}>
                <p className="text-[10px] font-display font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1">{m.label}</p>
                <p className="text-sm font-display font-bold text-foreground">{m.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── La collection en situation (editorial lifestyle showcase) ── */}
      {ambiancePhotos.length > 0 && (
        <section className="py-14 sm:py-20">
          <div className="max-w-3xl mx-auto px-6 text-center mb-10 sm:mb-14">
            <p className="text-[11px] font-display font-semibold uppercase tracking-[0.25em] text-[#D4603A] mb-3">
              {t("brand.inSituEyebrow", "En situation")}
            </p>
            <h3 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              {t("brand.collectionInSitu", "La collection dans vos espaces")}
            </h3>
            <p className="text-sm font-body text-muted-foreground mt-3 leading-relaxed">
              {t("brand.inSituSubtitle", "Projetez la collection dans différents lieux et ambiances — terrasses, restaurants, rooftops, hôtels.")}
            </p>
          </div>

          {/* Rhythm: a full-width hero image, then a two-up pair, repeating. */}
          <div className="space-y-3 sm:space-y-5">
            {(() => {
              const groups: string[][] = [];
              for (let i = 0; i < ambiancePhotos.length; i += 3) groups.push(ambiancePhotos.slice(i, i + 3));
              return groups.map((g, gi) => (
                <div key={gi} className="space-y-3 sm:space-y-5">
                  {/* Hero of the group — full-width */}
                  <a href={g[0]} target="_blank" rel="noopener noreferrer" className="block w-full overflow-hidden bg-muted group">
                    <img src={g[0]} alt="" className="w-full h-[42vh] sm:h-[72vh] object-cover group-hover:scale-[1.02] transition-transform duration-700" />
                  </a>
                  {/* Pair — two-up (or full-width if a lone trailing image) */}
                  {g.length > 1 && (
                    <div className={`grid gap-3 sm:gap-5 ${g.length === 3 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
                      {g.slice(1).map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden bg-muted group">
                          <img src={url} alt="" className={`w-full object-cover group-hover:scale-[1.02] transition-transform duration-700 ${g.length === 3 ? "h-[34vh] sm:h-[52vh]" : "h-[42vh] sm:h-[60vh]"}`} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ));
            })()}
          </div>
        </section>
      )}

      {/* ── Products in the collection ── */}
      {products.length > 0 && (
        <section className="py-12 sm:py-16 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-foreground">{t("brand.theCollection", "La collection")}</h3>
              <p className="text-sm font-body text-muted-foreground mt-2">
                {products.length} {products.length !== 1 ? t("brand.pieces", "pièces") : t("brand.piece", "pièce")}
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
              {products.map((item: any) => (
                <a key={item.id} href={`/products/${item.id}`} className="group text-center">
                  <div className="aspect-square overflow-hidden bg-[#FAF7F4] mb-3 rounded-sm">
                    {item.image_url ? (
                      <img loading="lazy" src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-body">{t("brand.noPhoto")}</div>
                    )}
                  </div>
                  <p className="text-sm font-display font-semibold text-foreground group-hover:text-[#D4603A] transition-colors">{item.name || "Produit"}</p>
                  {item.category ? <p className="text-[11px] font-body text-muted-foreground mt-0.5">{item.category}</p> : null}
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Product gallery (studio shots) ── */}
      {productPhotos.length > 0 && (
        <section className="py-8 sm:py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <h3 className="text-[11px] font-display font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-5 text-center">
              {t("brand.productPhotos", "Photos produit")}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {productPhotos.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square overflow-hidden bg-muted block group rounded-sm">
                  <img loading="lazy" src={url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {products.length === 0 && productPhotos.length === 0 && ambiancePhotos.length === 0 && !coll.description && (
        <p className="text-sm font-body text-muted-foreground text-center py-16 px-6">
          {t("brand.collectionEmpty", "Cette collection sera bientôt enrichie.")}
        </p>
      )}

      {/* ── Editorial CTA ── */}
      <section className="bg-[#1C1A17] py-16 sm:py-24 px-6 text-center">
        <h3 className="font-display text-2xl sm:text-4xl font-bold text-white max-w-2xl mx-auto leading-tight">
          {coll.name}
        </h3>
        <p className="text-sm font-body text-white/60 mt-4 mb-8 max-w-md mx-auto">
          {t("brand.collectionCtaSubtitle", "Un projet hôtellerie-restauration en tête ? Décrivez-le, la marque vous répond.")}
        </p>
        <button
          onClick={onBrief}
          className="inline-flex items-center gap-2 text-sm font-display font-semibold text-white bg-[#D4603A] hover:bg-[#B84E2E] px-8 py-3.5 rounded-full transition-colors"
        >
          {t("brand.submitBriefForCollection")} <ArrowRight className="h-4 w-4" />
        </button>
      </section>
    </div>
  );
}
