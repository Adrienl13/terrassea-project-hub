import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const BASE_URL = "https://terrassea.com";

// ── Schema fragments ──────────────────────────────────────────

const organization = {
  "@type": "Organization",
  "@id": `${BASE_URL}/#organization`,
  name: "TerrasseaHUB",
  legalName: "Pros Import EURL",
  url: BASE_URL,
  logo: `${BASE_URL}/favicon.ico`,
  email: "contact@terrassea.com",
  foundingDate: "2025",
  founder: { "@type": "Person", name: "Adrien Laniez" },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Paris",
    addressCountry: "FR",
  },
  areaServed: [
    "France", "Italy", "Spain", "Germany", "Denmark",
    "Belgium", "Slovenia", "Turkey", "Portugal",
  ],
  knowsLanguage: ["fr", "en", "it", "es", "de", "nl"],
  sameAs: [
    "https://www.linkedin.com/company/terrassea",
    "https://www.instagram.com/terrassea_hub",
    "https://www.facebook.com/terrassea",
  ],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "TerrasseaHUB",
  url: BASE_URL,
  description:
    "Europe's first B2B marketplace for outdoor hospitality furniture. Source chairs, tables, parasols, and sun loungers from verified European manufacturers.",
  publisher: { "@id": `${BASE_URL}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: `${BASE_URL}/products?q={search_term}`,
    "query-input": "required name=search_term",
  },
};

const faqEntries = [
  {
    q: "What is TerrasseaHUB?",
    a: "TerrasseaHUB is Europe's first B2B marketplace dedicated to outdoor furniture for the hospitality industry (hotels, restaurants, cafés, beach clubs). It connects buyers with verified European manufacturers and distributors.",
  },
  {
    q: "How much does it cost for buyers?",
    a: "Browsing the catalogue, comparing products, and requesting quotes is completely free for buyers. There is no subscription or commitment required.",
  },
  {
    q: "How much does it cost for suppliers?",
    a: "Suppliers can start with a free Starter plan (8% commission) or choose Growth (€249/month, 5%), Elite (€499/month, 3.5%), Brand Member (€790/month, 0%), or Brand Network (€1,290/month, 0%).",
  },
  {
    q: "Which countries does TerrasseaHUB cover?",
    a: "TerrasseaHUB operates across 9 European countries: France, Italy, Spain, Germany, Denmark, Belgium, Slovenia, Turkey, and Portugal.",
  },
  {
    q: "What product categories are available?",
    a: "Chairs, tables, parasols, sun loungers, sofas, bar stools, and accessories — all designed for professional outdoor hospitality use.",
  },
  {
    q: "Are supplier identities hidden?",
    a: "Yes. Supplier identities remain anonymous during the comparison and quoting phase, ensuring unbiased product selection based on quality and price.",
  },
  {
    q: "What languages are supported?",
    a: "The platform is available in 6 languages: French, English, Italian, Spanish, German, and Dutch.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqEntries.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "TerrasseaHUB Partner Programme",
  description:
    "Join Europe's B2B marketplace for outdoor hospitality furniture as a verified supplier. Access qualified leads from hotels, restaurants, and beach clubs.",
  provider: { "@id": `${BASE_URL}/#organization` },
  areaServed: { "@type": "Place", name: "Europe" },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Supplier Plans",
    itemListElement: [
      {
        "@type": "Offer",
        name: "Starter",
        price: "0",
        priceCurrency: "EUR",
        description: "Free plan with 8% commission per sale. Up to 10 products.",
      },
      {
        "@type": "Offer",
        name: "Growth",
        price: "249",
        priceCurrency: "EUR",
        description: "€249/month with 5% commission. Up to 100 products, CSV import, stock sync.",
      },
      {
        "@type": "Offer",
        name: "Elite",
        price: "499",
        priceCurrency: "EUR",
        description: "€499/month with 3.5% commission. Unlimited products, API integration, priority support.",
      },
    ],
  },
};

// ── Breadcrumb builder ─────────────────────────────────────────

const ROUTE_LABELS: Record<string, string> = {
  products: "Products",
  "become-partner": "Become a Partner",
  inspirations: "Inspirations",
  resources: "Resources",
  partners: "Partners",
  collections: "Collections",
  "pro-service": "Pro Service",
  "mentions-legales": "Legal Notice",
  cgv: "Terms of Sale",
  cgu: "Terms of Use",
  confidentialite: "Privacy Policy",
  login: "Sign In",
  auth: "Sign In",
};

function buildBreadcrumbs(pathname: string, searchParams: URLSearchParams) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const items = [
    { "@type": "ListItem" as const, position: 1, name: "Home", item: BASE_URL },
  ];

  let currentPath = "";
  for (let i = 0; i < segments.length; i++) {
    currentPath += `/${segments[i]}`;
    const label = ROUTE_LABELS[segments[i]] || segments[i].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    items.push({
      "@type": "ListItem" as const,
      position: i + 2,
      name: label,
      item: `${BASE_URL}${currentPath}`,
    });
  }

  // Add category breadcrumb if on products page with category filter
  const category = searchParams.get("category");
  if (pathname === "/products" && category) {
    const label = category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    items.push({
      "@type": "ListItem" as const,
      position: items.length + 1,
      name: label,
      item: `${BASE_URL}/products?category=${category}`,
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

// ── Component ──────────────────────────────────────────────────

const ATTR = "data-jsonld";

export default function StructuredData() {
  const { pathname, search } = useLocation();
  const searchParams = new URLSearchParams(search);

  useEffect(() => {
    // Clean previous JSON-LD scripts
    document.querySelectorAll(`script[${ATTR}="terrassea"]`).forEach((el) => el.remove());

    const schemas: object[] = [];

    // Organization on every page
    schemas.push({
      "@context": "https://schema.org",
      ...organization,
    });

    // Homepage-specific
    if (pathname === "/") {
      schemas.push(websiteSchema);
      schemas.push(faqSchema);
    }

    // Become-partner-specific
    if (pathname === "/become-partner") {
      schemas.push(serviceSchema);
      schemas.push(faqSchema);
    }

    // Breadcrumbs on every page except homepage
    if (pathname !== "/") {
      const breadcrumbs = buildBreadcrumbs(pathname, searchParams);
      if (breadcrumbs) schemas.push(breadcrumbs);
    }

    // Inject scripts
    for (const schema of schemas) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute(ATTR, "terrassea");
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    }

    return () => {
      document.querySelectorAll(`script[${ATTR}="terrassea"]`).forEach((el) => el.remove());
    };
  }, [pathname, search]);

  return null;
}
