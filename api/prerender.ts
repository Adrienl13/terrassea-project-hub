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

const MAX_TITLE = 70;
function clampTitle(t: string): string {
  if (t.length <= MAX_TITLE) return t;
  const cut = t.lastIndexOf(" ", MAX_TITLE - 2);
  return t.slice(0, cut > 0 ? cut : MAX_TITLE - 1) + "…";
}

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
  logo: `${BASE}/favicon-512.png`,
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
      title: `${SITE_NAME} — B2B Outdoor Furniture for Hotels & Restaurants`,
      description: DEFAULT_DESC,
      schemas: [ORG_JSONLD, WEBSITE_JSONLD, FAQ_JSONLD],
      bodyHtml: `
        <h1>TerrasseaHUB — B2B Outdoor Furniture for Hotels & Restaurants</h1>
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
    title: `${SITE_NAME} — B2B Outdoor Furniture for Hotels & Restaurants`,
    description: DEFAULT_DESC,
    schemas: [ORG_JSONLD],
    bodyHtml: `<h1>TerrasseaHUB</h1><p>${DEFAULT_DESC}</p><p><a href="${BASE}/products">Browse Products</a></p>`,
  };
}

// ── Supabase helper ──────────────────────────────────────────────────

function getSupabaseConfig() {
  // Prefer server-side env vars; fall back to VITE_ for local dev only
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

async function supabaseQuery(table: string, query: string): Promise<any[]> {
  const sb = getSupabaseConfig();
  if (!sb) return [];
  try {
    const res = await fetch(`${sb.url}/rest/v1/${table}?${query}`, {
      headers: { apikey: sb.key, Authorization: `Bearer ${sb.key}` },
    });
    return res.ok ? await res.json() : [];
  } catch {
    return [];
  }
}

// Plans where the partner name is visible to buyers (Elite+)
const VISIBLE_PLANS = ["elite", "brand_member", "brand_network"];

// ── Product page (dynamic) ──────────────────────────────────────────

async function getProductConfig(productId: string): Promise<RouteConfig | null> {
  const rows = await supabaseQuery(
    "products",
    `id=eq.${encodeURIComponent(productId)}&select=id,name,name_en,short_description,short_description_en,category,image_url,price_min,brand_name,material_tags&limit=1`
  );
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
    offeredBy: { "@id": `${BASE}/#organization` },
  };

  if (p.price_min != null) {
    productSchema.offers = {
      "@type": "AggregateOffer",
      lowPrice: Number(p.price_min).toFixed(2),
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      seller: { "@id": `${BASE}/#organization` },
    };
  }

  // Fetch review stats for AggregateRating
  const { data: reviewStats } = await supabase
    .from("product_review_stats")
    .select("*")
    .eq("product_id", p.id)
    .maybeSingle();

  if (reviewStats?.review_count > 0) {
    productSchema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: reviewStats.avg_rating,
      reviewCount: reviewStats.review_count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return {
    title: clampTitle(`${name} | ${SITE_NAME}`),
    description: desc,
    schemas: [ORG_JSONLD, productSchema],
    bodyHtml: `
      <h1>${name}</h1>
      <p>${desc}</p>
      ${p.category ? `<p>Category: ${p.category}</p>` : ""}
      ${p.brand_name ? `<p>Brand: ${p.brand_name} — available on TerrasseaHUB</p>` : ""}
      ${p.price_min != null ? `<p>From €${Number(p.price_min).toFixed(2)}</p>` : ""}
      ${p.image_url ? `<img src="${p.image_url}" alt="${name}" width="600" />` : ""}
      <p><a href="${BASE}/products">Back to catalogue</a> | <a href="${BASE}/">TerrasseaHUB</a></p>
    `,
  };
}

// ── Partner directory page (dynamic) ────────────────────────────────

async function getPartnersConfig(): Promise<RouteConfig> {
  const partners = await supabaseQuery(
    "partners",
    "is_public=eq.true&select=name,partner_type,country,plan,slug,visibility_level&order=priority_order.desc&limit=200"
  );

  const listItems = partners.map((p, i) => {
    const isVisible = VISIBLE_PLANS.includes(p.plan);
    const label = isVisible ? p.name : `Verified ${(p.partner_type || "supplier").replace(/^\w/, (c: string) => c.toUpperCase())}`;
    return {
      "@type": "ListItem" as const,
      position: i + 1,
      item: {
        "@type": "Offer",
        name: label,
        ...(p.country ? { areaServed: p.country } : {}),
        availableAtOrFrom: { "@id": `${BASE}/#organization` },
        url: isVisible && p.slug ? `${BASE}/partners/${p.slug}` : `${BASE}/partners`,
      },
    };
  });

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Verified Outdoor Furniture Suppliers on TerrasseaHUB",
    description: `${partners.length} verified manufacturers, brands, and distributors of professional outdoor furniture for the hospitality industry.`,
    numberOfItems: partners.length,
    itemListElement: listItems,
  };

  const visiblePartners = partners.filter(p => VISIBLE_PLANS.includes(p.plan));
  const anonCount = partners.length - visiblePartners.length;

  return {
    title: clampTitle(`Verified Outdoor Furniture Suppliers (${partners.length}) | ${SITE_NAME}`),
    description: `Discover ${partners.length} verified outdoor furniture suppliers on TerrasseaHUB. Manufacturers, brands, and distributors from across Europe. Compare and request free quotes.`,
    schemas: [ORG_JSONLD, itemListSchema],
    bodyHtml: `
      <h1>Verified Outdoor Furniture Suppliers on TerrasseaHUB</h1>
      <p>${partners.length} verified manufacturers, brands, and distributors of professional outdoor furniture for the hospitality industry.</p>
      <h2>Featured Suppliers</h2>
      <ul>
        ${visiblePartners.map(p => `<li>${p.name}${p.country ? ` — ${p.country}` : ""} — <a href="${BASE}/partners/${p.slug}">View on TerrasseaHUB</a></li>`).join("")}
      </ul>
      ${anonCount > 0 ? `<p>+ ${anonCount} additional verified suppliers available on the platform.</p>` : ""}
      <p><a href="${BASE}/products">Browse Products</a> | <a href="${BASE}/become-partner">Become a Supplier</a></p>
    `,
  };
}

// ── Partner detail page (dynamic) ───────────────────────────────────

async function getPartnerDetailConfig(slug: string): Promise<RouteConfig | null> {
  const rows = await supabaseQuery(
    "partners",
    `slug=eq.${encodeURIComponent(slug)}&is_public=eq.true&select=id,name,partner_type,country,plan,slug,description_en,description,logo_url,specialties&limit=1`
  );
  if (!rows.length) return null;

  const p = rows[0];
  const isVisible = VISIBLE_PLANS.includes(p.plan);

  // Non-visible partners: anonymous prerender
  if (!isVisible) {
    const typeLabel = (p.partner_type || "supplier").replace(/^\w/, (c: string) => c.toUpperCase());
    return {
      title: clampTitle(`Verified ${typeLabel}${p.country ? ` — ${p.country}` : ""} | ${SITE_NAME}`),
      description: `Verified ${typeLabel.toLowerCase()} of outdoor furniture${p.country ? ` based in ${p.country}` : ""}. Request quotes via TerrasseaHUB.`,
      schemas: [ORG_JSONLD],
      bodyHtml: `
        <h1>Verified ${typeLabel} on TerrasseaHUB</h1>
        <p>This supplier is a verified ${typeLabel.toLowerCase()} of professional outdoor furniture${p.country ? ` based in ${p.country}` : ""}.</p>
        <p>Request free quotes and compare offers from multiple suppliers on <a href="${BASE}/">TerrasseaHUB</a>.</p>
      `,
    };
  }

  const desc = p.description_en || p.description || `${p.name} — verified outdoor furniture supplier on TerrasseaHUB.`;

  // Fetch their products for the ItemList
  const products = await supabaseQuery(
    "product_offers",
    `partner_id=eq.${p.id}&is_active=eq.true&select=product:product_id(id,name,name_en,image_url,category)&limit=50`
  );

  const productItems = products
    .filter((o: any) => o.product)
    .map((o: any, i: number) => ({
      "@type": "ListItem" as const,
      position: i + 1,
      item: {
        "@type": "Product",
        name: o.product.name_en || o.product.name,
        url: `${BASE}/products/${o.product.id}`,
        ...(o.product.image_url ? { image: o.product.image_url } : {}),
        ...(o.product.category ? { category: o.product.category } : {}),
        offeredBy: { "@id": `${BASE}/#organization` },
      },
    }));

  const schemas: object[] = [ORG_JSONLD];

  if (productItems.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${p.name} products available on TerrasseaHUB`,
      description: `Browse ${p.name} outdoor furniture collection on TerrasseaHUB. Compare offers and request free quotes.`,
      numberOfItems: productItems.length,
      itemListElement: productItems,
    });
  }

  return {
    title: clampTitle(`${p.name} — Outdoor Furniture on ${SITE_NAME}`),
    description: `${p.name}: ${desc.slice(0, 150)}. Browse their collection and request quotes on TerrasseaHUB.`,
    schemas,
    bodyHtml: `
      <h1>${p.name} — Available on TerrasseaHUB</h1>
      ${p.logo_url ? `<img src="${p.logo_url}" alt="${p.name}" width="200" />` : ""}
      <p>${desc}</p>
      ${p.country ? `<p>Based in ${p.country}</p>` : ""}
      ${Array.isArray(p.specialties) && p.specialties.length ? `<p>Specialties: ${p.specialties.join(", ")}</p>` : ""}
      ${productItems.length > 0 ? `<h2>${productItems.length} products available</h2><ul>${productItems.map((item: any) => `<li><a href="${item.item.url}">${item.item.name}</a></li>`).join("")}</ul>` : ""}
      <p><a href="${BASE}/partners">All suppliers</a> | <a href="${BASE}/products">Browse catalogue</a></p>
    `,
  };
}

// ── Brand page (dynamic) ────────────────────────────────────────────

async function getBrandConfig(slug: string): Promise<RouteConfig | null> {
  const rows = await supabaseQuery(
    "partners",
    `slug=eq.${encodeURIComponent(slug)}&partner_mode=in.(brand_member,brand_network)&select=id,name,description_en,description,logo_url,country,specialties&limit=1`
  );
  if (!rows.length) return null;

  const b = rows[0];
  const desc = b.description_en || b.description || `${b.name} — premium outdoor furniture brand on TerrasseaHUB.`;

  // Fetch brand products
  const offers = await supabaseQuery(
    "product_offers",
    `partner_id=eq.${b.id}&is_active=eq.true&select=collection_name,product:product_id(id,name,name_en,image_url,category)&limit=100`
  );

  const collections = new Map<string, any[]>();
  for (const o of offers) {
    if (!o.product) continue;
    const col = o.collection_name || "Main Collection";
    if (!collections.has(col)) collections.set(col, []);
    collections.get(col)!.push(o.product);
  }

  const productItems = offers
    .filter((o: any) => o.product)
    .map((o: any, i: number) => ({
      "@type": "ListItem" as const,
      position: i + 1,
      item: {
        "@type": "Product",
        name: o.product.name_en || o.product.name,
        url: `${BASE}/products/${o.product.id}`,
        ...(o.product.image_url ? { image: o.product.image_url } : {}),
        ...(o.product.category ? { category: o.product.category } : {}),
        offeredBy: { "@id": `${BASE}/#organization` },
      },
    }));

  const schemas: object[] = [ORG_JSONLD];

  if (productItems.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${b.name} collection on TerrasseaHUB`,
      description: `Explore ${b.name} outdoor furniture. ${productItems.length} products available exclusively via TerrasseaHUB.`,
      numberOfItems: productItems.length,
      itemListElement: productItems,
    });
  }

  let collectionsHtml = "";
  for (const [colName, products] of collections) {
    collectionsHtml += `<h3>${colName}</h3><ul>${products.map((p: any) => `<li><a href="${BASE}/products/${p.id}">${p.name_en || p.name}</a></li>`).join("")}</ul>`;
  }

  return {
    title: clampTitle(`${b.name} — Outdoor Furniture Collection on ${SITE_NAME}`),
    description: `Explore ${b.name} outdoor furniture collection on TerrasseaHUB. ${desc.slice(0, 120)}`,
    schemas,
    bodyHtml: `
      <h1>${b.name} — Available on TerrasseaHUB</h1>
      ${b.logo_url ? `<img src="${b.logo_url}" alt="${b.name}" width="200" />` : ""}
      <p>${desc}</p>
      ${b.country ? `<p>Based in ${b.country}</p>` : ""}
      ${Array.isArray(b.specialties) && b.specialties.length ? `<p>Specialties: ${b.specialties.join(", ")}</p>` : ""}
      ${collectionsHtml ? `<h2>Collections</h2>${collectionsHtml}` : ""}
      <p>All products by ${b.name} are available exclusively through <a href="${BASE}/">TerrasseaHUB</a>. <a href="${BASE}/products">Browse full catalogue</a>.</p>
    `,
  };
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
    <meta property="og:image" content="${BASE}/og-image.png" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:locale" content="fr_FR" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${config.title}" />
    <meta name="twitter:description" content="${config.description}" />
    <meta name="twitter:image" content="${BASE}/og-image.png" />
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
        <a href="${BASE}/collections">Collections</a> |
        <a href="${BASE}/inspirations">Inspirations</a> |
        <a href="${BASE}/resources">Resources</a> |
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

  // Dynamic pages — fetch from Supabase
  const productMatch = path.match(/^\/products\/([a-f0-9-]+)$/i);
  const partnerMatch = path.match(/^\/partners\/([a-z0-9_-]+)$/i);
  const brandMatch = path.match(/^\/brands\/([a-z0-9_-]+)$/i);

  if (productMatch) {
    config = (await getProductConfig(productMatch[1])) || getRouteConfig(path, forwardedSearch);
  } else if (path === "/partners") {
    config = await getPartnersConfig();
  } else if (partnerMatch) {
    config = (await getPartnerDetailConfig(partnerMatch[1])) || getRouteConfig(path, forwardedSearch);
  } else if (brandMatch) {
    config = (await getBrandConfig(brandMatch[1])) || getRouteConfig(path, forwardedSearch);
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
