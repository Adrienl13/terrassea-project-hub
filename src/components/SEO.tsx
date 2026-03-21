import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "product" | "article";
  noindex?: boolean;
}

const DEFAULT_TITLE = "Terrassea — B2B Outdoor Furniture Sourcing";
const DEFAULT_DESCRIPTION =
  "Source premium outdoor furniture for hotels, restaurants, and beach clubs. Compare verified suppliers, request quotes, and manage your hospitality projects.";
const DEFAULT_IMAGE = "https://terrassea.com/favicon.ico";
const SITE_NAME = "Terrassea";
const BASE_URL = "https://terrassea.com";

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
  const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const canonicalUrl = url ?? (typeof window !== "undefined" ? `${BASE_URL}${window.location.pathname}` : BASE_URL);

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

    // Canonical
    setCanonical(canonicalUrl);
  }, [fullTitle, description, image, canonicalUrl, type, noindex]);

  return null;
}
