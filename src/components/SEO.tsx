import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const LANG_TO_OG_LOCALE: Record<string, string> = {
  fr: "fr_FR",
  en: "en_GB",
  es: "es_ES",
  it: "it_IT",
};

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "product" | "article";
  noindex?: boolean;
}

const DEFAULT_TITLE = "TerrasseaHUB — B2B Outdoor Furniture for Hotels & Restaurants";
const DEFAULT_DESCRIPTION =
  "Source outdoor furniture for restaurants, hotels, and cafés from verified European manufacturers. Chairs, tables, parasols, sun loungers. Free quotes, 9 countries, 6 languages.";
const DEFAULT_IMAGE = "https://terrassea.com/og-image.svg";
const SITE_NAME = "TerrasseaHUB";
const BASE_URL = "https://terrassea.com";
const MAX_TITLE = 70;

function clampTitle(t: string): string {
  if (t.length <= MAX_TITLE) return t;
  const cut = t.lastIndexOf(" ", MAX_TITLE - 2);
  return t.slice(0, cut > 0 ? cut : MAX_TITLE - 1) + "…";
}

const OG_LOCALE_ALTERNATES = ["en_GB", "it_IT", "es_ES", "de_DE"];

function setMeta(name: string, content: string, attribute = "name") {
  let el = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attribute, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Lightweight SEO component that sets document.title and meta tags via useEffect.
 * No external dependency needed — works with any React SPA.
 */
export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url,
  type = "website",
  noindex = false,
}: SEOProps) {
  const { i18n } = useTranslation();
  const fullTitle = clampTitle(title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE);
  const canonicalUrl = url ?? (typeof window !== "undefined" ? `${BASE_URL}${window.location.pathname}` : BASE_URL);
  const currentLocale = LANG_TO_OG_LOCALE[i18n.language] ?? "fr_FR";

  useEffect(() => {
    // Title
    document.title = fullTitle;

    // Basic meta
    setMeta("description", description);
    setMeta("robots", noindex ? "noindex, nofollow" : "index, follow");

    // Open Graph
    setMeta("og:title", fullTitle, "property");
    setMeta("og:description", description, "property");
    setMeta("og:image", image, "property");
    setMeta("og:url", canonicalUrl, "property");
    setMeta("og:type", type, "property");
    setMeta("og:site_name", SITE_NAME, "property");

    // Twitter Card
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description);
    setMeta("twitter:image", image);

    // Locale — dynamic based on current i18n language
    setMeta("og:locale", currentLocale, "property");
    for (const alt of OG_LOCALE_ALTERNATES.filter(a => a !== currentLocale)) {
      let el = document.querySelector(`meta[property="og:locale:alternate"][content="${alt}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", "og:locale:alternate");
        el.setAttribute("content", alt);
        document.head.appendChild(el);
      }
    }

    // Hreflang link tags for language alternates
    // All hreflang point to the same canonical URL (SPA serves content in any language)
    const hreflangs = ["fr", "en", "es", "it", "x-default"];
    const cleanHref = `${BASE_URL}${window.location.pathname}`;
    for (const hl of hreflangs) {
      const selector = `link[rel="alternate"][hreflang="${hl}"]`;
      let linkEl = document.querySelector(selector) as HTMLLinkElement | null;
      if (!linkEl) {
        linkEl = document.createElement("link");
        linkEl.setAttribute("rel", "alternate");
        linkEl.setAttribute("hreflang", hl);
        document.head.appendChild(linkEl);
      }
      linkEl.setAttribute("href", cleanHref);
    }

    // Canonical
    setCanonical(canonicalUrl);
  }, [fullTitle, description, image, canonicalUrl, type, noindex, currentLocale]);

  return null;
}
