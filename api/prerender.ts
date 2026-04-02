import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Bot pre-rendering endpoint.
 * Returns lightweight HTML with proper meta tags, JSON-LD, and text content
 * for AI crawlers and search bots that don't execute JavaScript.
 *
 * Called via Vercel rewrite when the request path matches a known public route.
 * The original path is passed as ?path=/some/page
 */

const BASE = "https://terrassea.com";
const SITE_NAME = "TerrasseaHUB";
const DEFAULT_DESC =
  "Europe's B2B marketplace for outdoor hospitality furniture. Chairs, tables, parasols, sun loungers from verified European manufacturers. 9 countries, 6 languages. Free quotes.";

const BOT_UA =
  /GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-SearchBot|Claude-Web|Google-Extended|Google-Agent|PerplexityBot|Bytespider|CCBot|Cohere-ai|YouBot|Meta-ExternalAgent|Googlebot|bingbot|BingPreview|AppleBot|facebookexternalhit|FacebookBot|Twitterbot/i;

// ── Shared JSON-LD blocks ────────────────────────────────────────────

const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${BASE}/#organization`,
  name: SITE_NAME,
  legalName: "Pros Import EURL",
  url: BASE,
  logo: `${BASE}/favicon.ico`,
  email: "contact@terrassea.com",
  foundingDate: "2025",
  founder: { "@type": "Person", name: "Adrien Laniez" },
  address: { "@type": "PostalAddress", addressLocality: "Paris", addressCountry: "FR" },
  areaServed: ["France","Italy","Spain","Germany","Denmark","Belgium","Slovenia","Turkey","Portugal"],
  knowsLanguage: ["fr","en","it","es","de","nl"],
  sameAs: [
    "https://www.linkedin.com/company/terrassea",
    "https://www.instagram.com/terrassea_hub",
    "https://www.facebook.com/terrassea",
  ],
};

const FAQ_ENTRIES = [
  { q: "What is TerrasseaHUB?", a: "TerrasseaHUB is Europe's first B2B marketplace dedicated to outdoor furniture for the hospitality industry (hotels, restaurants, cafés, beach clubs). It connects buyers with verified European manufacturers and distributors." },
  { q: "How much does it cost for buyers?", a: "Browsing the catalogue, comparing products, and requesting quotes is completely free for buyers. No subscription or commitment required." },
  { q: "How much does it cost for suppliers?", a: "Suppliers can start with a free Starter plan (8% commission) or choose Growth (€249/month, 5%), Elite (€499/month, 3.5%), Brand Member (€790/month, 0%), or Brand Network (€1,290/month, 0%)." },
  { q: "Which countries does TerrasseaHUB cover?", a: "9 European countries: France, Italy, Spain, Germany, Denmark, Belgium, Slovenia, Turkey, and Portugal." },
  { q: "What product categories are available?", a: "Chairs, tables, parasols, sun loungers, sofas, bar stools, and accessories — all for professional outdoor hospitality use." },
  { q: "Are supplier identities hidden?", a: "Yes. Supplier identities remain anonymous during comparison and quoting, ensuring unbiased product selection." },
  { q: "What languages are supported?", a: "6 languages: French, English, Italian, Spanish, German, and Dutch." },
];

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ENTRIES.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

const WEBSITE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: BASE,
  description: DEFAULT_DESC,
  publisher: { "@id": `${BASE}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: `${BASE}/products?q={search_term}`,
    "query-input": "required name=search_term",
  },
};

const SERVICE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "TerrasseaHUB Partner Programme",
  description: "Join Europe's B2B marketplace for outdoor hospitality furniture as a verified supplier.",
  provider: { "@id": `${BASE}/#organization` },
  areaServed: { "@type": "Place", name: "Europe" },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Supplier Plans",
    itemListElement: [
      { "@type": "Offer", name: "Starter", price: "0", priceCurrency: "EUR", description: "Free plan, 8% commission, up to 10 products." },
      { "@type": "Offer", name: "Growth", price: "249", priceCurrency: "EUR", description: "€249/month, 5% commission, up to 100 products." },
      { "@type": "Offer", name: "Elite", price: "499", priceCurrency: "EUR", description: "€499/month, 3.5% commission, unlimited products." },
    ],
  },
};

// ── Route config ──────────────────────────────────────────────────────

interface RouteConfig {
  title: string;
  description: string;
  schemas: object[];
  bodyHtml: string;
}

const CATEGORIES = ["chairs", "tables", "parasols", "sun-loungers", "sofas", "bar-stools", "accessories"];

function getRouteConfig(path: string, query: URLSearchParams): RouteConfig {
  const category = query.get("category");

  // Homepage
  if (path === "/") {
    return {
      title: `${SITE_NAME} — Europe's B2B Marketplace for Outdoor Hospitality Furniture`,
      description: DEFAULT_DESC,
      schemas: [ORG_JSONLD, WEBSITE_JSONLD, FAQ_JSONLD],
      bodyHtml: `
        <h1>TerrasseaHUB — Europe's B2B Marketplace for Outdoor Hospitality Furniture</h1>
        <p>${DEFAULT_DESC}</p>
        <h2>Product Categories</h2>
        <ul>${CATEGORIES.map(c => `<li><a href="${BASE}/products?category=${c}">${c.replace(/-/g, " ")}</a></li>`).join("")}</ul>
        <h2>FAQ</h2>
        ${FAQ_ENTRIES.map(({ q, a }) => `<h3>${q}</h3><p>${a}</p>`).join("")}
        <p><a href="${BASE}/products">Browse Products</a> | <a href="${BASE}/become-partner">Become a Partner</a></p>
      `,
    };
  }

  // Products listing
  if (path === "/products") {
    const catLabel = category ? category.replace(/-/g, " ") : "all categories";
    return {
      title: `${category ? catLabel.charAt(0).toUpperCase() + catLabel.slice(1) + " — " : ""}Outdoor Furniture Catalogue | ${SITE_NAME}`,
      description: `Browse professional outdoor ${catLabel} for hotels, restaurants, and cafés. Compare verified suppliers and request free quotes on ${SITE_NAME}.`,
      schemas: [ORG_JSONLD],
      bodyHtml: `
        <h1>Outdoor Furniture Catalogue${category ? ` — ${catLabel}` : ""}</h1>
        <p>Browse professional outdoor furniture for hospitality. Filter by category, material, style, and compare offers from verified European suppliers.</p>
        <h2>Categories</h2>
        <ul>${CATEGORIES.map(c => `<li><a href="${BASE}/products?category=${c}">${c.replace(/-/g, " ")}</a></li>`).join("")}</ul>
      `,
    };
  }

  // Become partner
  if (path === "/become-partner") {
    return {
      title: `Become a Partner | ${SITE_NAME}`,
      description: "Join TerrasseaHUB as a verified supplier. Reach hospitality buyers across 9 European countries. Free Starter plan available.",
      schemas: [ORG_JSONLD, SERVICE_JSONLD, FAQ_JSONLD],
      bodyHtml: `
        <h1>Become a Partner on TerrasseaHUB</h1>
        <p>Join Europe's B2B marketplace for outdoor hospitality furniture. Reach qualified buyers from hotels, restaurants, and beach clubs.</p>
        <h2>Supplier Plans</h2>
        <ul>
          <li>Starter — Free, 8% commission, up to 10 products</li>
          <li>Growth — €249/month, 5% commission, up to 100 products</li>
          <li>Elite — €499/month, 3.5% commission, unlimited products</li>
          <li>Brand Member — €790/month, 0% commission</li>
          <li>Brand Network — €1,290/month, 0% commission</li>
        </ul>
        <h2>FAQ</h2>
        ${FAQ_ENTRIES.map(({ q, a }) => `<h3>${q}</h3><p>${a}</p>`).join("")}
      `,
    };
  }

  // Inspirations
  if (path === "/inspirations") {
    return {
      title: `Inspirations | ${SITE_NAME}`,
      description: "Explore curated outdoor furniture moodboards for hotels, restaurants, and beach clubs. Find your terrace style on TerrasseaHUB.",
      schemas: [ORG_JSONLD],
      bodyHtml: `<h1>Outdoor Furniture Inspirations</h1><p>Explore curated moodboards and terrace design ideas for hospitality professionals.</p>`,
    };
  }

  // Resources
  if (path === "/resources") {
    return {
      title: `Resources & Guides | ${SITE_NAME}`,
      description: "Expert guides on choosing outdoor furniture for hospitality. Materials, dimensions, maintenance tips.",
      schemas: [ORG_JSONLD],
      bodyHtml: `<h1>Resources & Guides</h1><p>Expert guides on choosing professional outdoor furniture for hotels, restaurants, and cafés.</p>`,
    };
  }

  // Partners
  if (path === "/partners") {
    return {
      title: `Our Partners — Verified Outdoor Furniture Suppliers | ${SITE_NAME}`,
      description: "Discover verified outdoor furniture suppliers, manufacturers, and brands on TerrasseaHUB.",
      schemas: [ORG_JSONLD],
      bodyHtml: `<h1>Verified Outdoor Furniture Suppliers</h1><p>Discover manufacturers and brands on TerrasseaHUB. All partners are verified for quality and reliability.</p>`,
    };
  }

  // Collections
  if (path === "/collections") {
    return {
      title: `Collections | ${SITE_NAME}`,
      description: "Browse curated furniture collections from verified European manufacturers on TerrasseaHUB.",
      schemas: [ORG_JSONLD],
      bodyHtml: `<h1>Furniture Collections</h1><p>Curated collections from verified European outdoor furniture manufacturers.</p>`,
    };
  }

  // Legal pages
  const legalPages: Record<string, string> = {
    "/mentions-legales": "Legal Notice",
    "/cgv": "Terms of Sale (CGV)",
    "/cgu": "Terms of Use (CGU)",
    "/confidentialite": "Privacy Policy",
  };
  if (legalPages[path]) {
    return {
      title: `${legalPages[path]} | ${SITE_NAME}`,
      description: `${legalPages[path]} for TerrasseaHUB — Pros Import EURL, Paris, France.`,
      schemas: [ORG_JSONLD],
      bodyHtml: `<h1>${legalPages[path]}</h1><p>${legalPages[path]} for TerrasseaHUB, operated by Pros Import EURL, Paris, France.</p>`,
    };
  }

  // Default fallback
  return {
    title: `${SITE_NAME} — Europe's B2B Marketplace for Outdoor Hospitality Furniture`,
    description: DEFAULT_DESC,
    schemas: [ORG_JSONLD],
    bodyHtml: `<h1>TerrasseaHUB</h1><p>${DEFAULT_DESC}</p><p><a href="${BASE}/products">Browse Products</a></p>`,
  };
}

// ── Product page (dynamic — fetches from Supabase) ────────────────────

async function getProductConfig(productId: string): Promise<RouteConfig | null> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/products?id=eq.${encodeURIComponent(productId)}&select=id,name,name_en,name_it,name_es,short_description,short_description_en,short_description_it,short_description_es,category,image_url,price_min,brand_name,material_tags&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows.length) return null;

    const p = rows[0];
    const name = p.name_en || p.name || "Product";
    const desc = p.short_description_en || p.short_description || `${name} — professional outdoor furniture on TerrasseaHUB.`;

    const productSchema: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Product",
      name,
      description: desc,
      image: p.image_url || undefined,
      url: `${BASE}/products/${p.id}`,
      category: p.category,
      brand: p.brand_name ? { "@type": "Brand", name: p.brand_name } : undefined,
      material: Array.isArray(p.material_tags) ? p.material_tags.join(", ") : undefined,
    };

    if (p.price_min != null) {
      productSchema.offers = {
        "@type": "AggregateOffer",
        lowPrice: Number(p.price_min).toFixed(2),
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
      };
    }

    return {
      title: `${name} | ${SITE_NAME}`,
      description: desc,
      schemas: [ORG_JSONLD, productSchema],
      bodyHtml: `
        <h1>${name}</h1>
        <p>${desc}</p>
        ${p.category ? `<p>Category: ${p.category}</p>` : ""}
        ${p.brand_name ? `<p>Brand: ${p.brand_name}</p>` : ""}
        ${p.price_min != null ? `<p>From €${Number(p.price_min).toFixed(2)}</p>` : ""}
        ${p.image_url ? `<img src="${p.image_url}" alt="${name}" width="600" />` : ""}
        <p><a href="${BASE}/products">Back to catalogue</a></p>
      `,
    };
  } catch {
    return null;
  }
}

// ── HTML builder ──────────────────────────────────────────────────────

function buildHtml(config: RouteConfig, canonicalUrl: string): string {
  const schemasHtml = config.schemas
    .map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`)
    .join("\n    ");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${config.title}</title>
    <meta name="description" content="${config.description}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:title" content="${config.title}" />
    <meta property="og:description" content="${config.description}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="${BASE}/og-image.svg" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:locale" content="fr_FR" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${config.title}" />
    <meta name="twitter:description" content="${config.description}" />
    <meta name="twitter:image" content="${BASE}/og-image.svg" />
    <link rel="alternate" hreflang="fr" href="${canonicalUrl}" />
    <link rel="alternate" hreflang="en" href="${canonicalUrl}" />
    <link rel="alternate" hreflang="it" href="${canonicalUrl}" />
    <link rel="alternate" hreflang="es" href="${canonicalUrl}" />
    <link rel="alternate" hreflang="de" href="${canonicalUrl}" />
    <link rel="alternate" hreflang="x-default" href="${canonicalUrl}" />
    ${schemasHtml}
  </head>
  <body>
    <header>
      <nav>
        <a href="${BASE}/">${SITE_NAME}</a> |
        <a href="${BASE}/products">Products</a> |
        <a href="${BASE}/partners">Partners</a> |
        <a href="${BASE}/inspirations">Inspirations</a> |
        <a href="${BASE}/become-partner">Become a Partner</a>
      </nav>
    </header>
    <main>
      ${config.bodyHtml}
    </main>
    <footer>
      <p>&copy; ${new Date().getFullYear()} TerrasseaHUB — Pros Import EURL, Paris, France. Contact: contact@terrassea.com</p>
      <nav>
        <a href="${BASE}/mentions-legales">Legal Notice</a> |
        <a href="${BASE}/cgv">Terms of Sale</a> |
        <a href="${BASE}/cgu">Terms of Use</a> |
        <a href="${BASE}/confidentialite">Privacy Policy</a>
      </nav>
    </footer>
  </body>
</html>`;
}

// ── Handler ───────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // The original path is passed via the ?path= query parameter from vercel.json rewrite
  const rawPath = (req.query.path as string) || "/";
  const path = "/" + rawPath.replace(/^\/+/, "");
  const url = new URL(req.url || "/", BASE);
  // Use query params from the original URL (forwarded by Vercel), minus our internal "path" param
  const forwardedSearch = new URL(`${BASE}${path}${url.search}`).searchParams;
  forwardedSearch.delete("path");

  let config: RouteConfig;

  // Product detail page — fetch from Supabase
  const productMatch = path.match(/^\/products\/([a-f0-9-]+)$/i);
  if (productMatch) {
    const productConfig = await getProductConfig(productMatch[1]);
    config = productConfig || getRouteConfig(path, forwardedSearch);
  } else {
    config = getRouteConfig(path, forwardedSearch);
  }

  const qs = forwardedSearch.toString();
  const canonicalUrl = `${BASE}${path}${qs ? "?" + qs : ""}`;
  const html = buildHtml(config, canonicalUrl);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send(html);
}
