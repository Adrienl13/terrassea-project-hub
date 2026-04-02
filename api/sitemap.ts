import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Dynamic sitemap generator.
 * Fetches all published products and public partners from Supabase
 * and generates a complete XML sitemap with every public URL.
 *
 * Cached for 1 hour via Cache-Control headers.
 */

const BASE = "https://terrassea.com";

// ── Static pages ─────────────────────────────────────────────────────

const STATIC_URLS: { loc: string; priority: string; changefreq: string }[] = [
  { loc: "/", priority: "1.0", changefreq: "weekly" },
  { loc: "/products", priority: "0.9", changefreq: "daily" },
  { loc: "/become-partner", priority: "0.8", changefreq: "monthly" },
  { loc: "/partners", priority: "0.8", changefreq: "weekly" },
  { loc: "/inspirations", priority: "0.7", changefreq: "weekly" },
  { loc: "/resources", priority: "0.7", changefreq: "monthly" },
  { loc: "/collections", priority: "0.7", changefreq: "weekly" },
  { loc: "/pro-service", priority: "0.6", changefreq: "monthly" },
  // Categories
  { loc: "/products?category=chairs", priority: "0.8", changefreq: "daily" },
  { loc: "/products?category=tables", priority: "0.8", changefreq: "daily" },
  { loc: "/products?category=parasols", priority: "0.8", changefreq: "daily" },
  { loc: "/products?category=sun-loungers", priority: "0.8", changefreq: "daily" },
  { loc: "/products?category=sofas", priority: "0.8", changefreq: "daily" },
  { loc: "/products?category=bar-stools", priority: "0.8", changefreq: "daily" },
  { loc: "/products?category=accessories", priority: "0.7", changefreq: "daily" },
  // Legal
  { loc: "/mentions-legales", priority: "0.3", changefreq: "yearly" },
  { loc: "/cgv", priority: "0.3", changefreq: "yearly" },
  { loc: "/cgu", priority: "0.3", changefreq: "yearly" },
  { loc: "/confidentialite", priority: "0.3", changefreq: "yearly" },
  // LLM files
  { loc: "/llms.txt", priority: "0.5", changefreq: "monthly" },
  { loc: "/llms-full.txt", priority: "0.5", changefreq: "monthly" },
];

// ── Supabase helpers ─────────────────────────────────────────────────

function getSupabaseConfig() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

async function fetchFromSupabase(
  config: { url: string; key: string },
  table: string,
  select: string,
  filters: string
): Promise<any[]> {
  try {
    const res = await fetch(
      `${config.url}/rest/v1/${table}?select=${select}&${filters}`,
      {
        headers: {
          apikey: config.key,
          Authorization: `Bearer ${config.key}`,
        },
      }
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// ── XML builder ──────────────────────────────────────────────────────

function urlEntry(loc: string, priority: string, changefreq: string, lastmod?: string): string {
  return `  <url>
    <loc>${BASE}${loc}</loc>
    <priority>${priority}</priority>
    <changefreq>${changefreq}</changefreq>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}
  </url>`;
}

// ── Handler ──────────────────────────────────────────────────────────

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const entries: string[] = [];

  // Static pages
  for (const page of STATIC_URLS) {
    entries.push(urlEntry(page.loc, page.priority, page.changefreq));
  }

  // Dynamic pages from Supabase
  const sb = getSupabaseConfig();
  if (sb) {
    // Published products
    const products = await fetchFromSupabase(
      sb,
      "products",
      "id,updated_at",
      "publish_status=eq.published&order=updated_at.desc&limit=5000"
    );
    for (const p of products) {
      const lastmod = p.updated_at ? p.updated_at.slice(0, 10) : undefined;
      entries.push(urlEntry(`/products/${p.id}`, "0.7", "weekly", lastmod));
    }

    // Public partners
    const partners = await fetchFromSupabase(
      sb,
      "partners",
      "slug,updated_at",
      "is_public=eq.true&order=updated_at.desc&limit=1000"
    );
    for (const p of partners) {
      if (!p.slug) continue;
      const lastmod = p.updated_at ? p.updated_at.slice(0, 10) : undefined;
      entries.push(urlEntry(`/partners/${p.slug}`, "0.6", "weekly", lastmod));
    }

    // Brand pages (partners with brand mode)
    const brands = await fetchFromSupabase(
      sb,
      "partners",
      "slug,updated_at",
      "is_public=eq.true&partner_mode=in.(brand_member,brand_network)&order=updated_at.desc&limit=500"
    );
    for (const b of brands) {
      if (!b.slug) continue;
      const lastmod = b.updated_at ? b.updated_at.slice(0, 10) : undefined;
      entries.push(urlEntry(`/brands/${b.slug}`, "0.6", "weekly", lastmod));
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send(xml);
}
