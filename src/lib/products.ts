import { supabase } from "@/integrations/supabase/client";

// ── Color variant (regrouped under one product) ───────────
export interface ColorVariant {
  color_slug: string;
  color_hex:  string;
  label_en:   string;
  image_url?: string;
  available:  boolean;
}

// ── Dimension variant (tables with multiple sizes) ──────
export interface DimensionVariant {
  dimension_tag: string;        // e.g. "80x80", "120x70"
  label:         string;        // e.g. "80×80 cm — 4 couverts"
  seats:         number;        // seating capacity for this size
  price:         number;        // price for this dimension
  available?:    boolean;       // stock availability (default true)
  stock_status?: string;        // "in_stock", "low_stock", "out_of_stock", "made_to_order"
  stock_quantity?: number | null; // per-variant stock count
}

// ── Product-type specific tags (JSONB) ────────────────────
export interface ProductTypeTags {
  silhouette?:     string;
  frame_material?: string;
  seat_type?:      string;
  arm_type?:       string;
  back_height?:    string;
  comfort_tier?:   string;
  stack_max?:      number;
  seat_height_cm?: number;
  weight_kg?:      number;
  footrest?:       boolean;
  cushion_type?:   string;
  table_type?:       string;
  top_material?:     string;
  base_type?:        string;
  dimension_tag?:    string;
  shape?:            string;
  capacity_covers?:  number;
  height_type?:      string;
  edge_finish?:      string;
  compatible_bases?: string[];
  compatible_tops?:  string[];
  parasol_type?:    string;
  diameter_m?:      number;
  covers_seats?:    number;
  wind_beaufort?:   number;
  upf_rating?:      string;
  base_weight_kg?:  number;
  tilt_type?:       string;
  pole_material?:   string;
  fabric_material?: string;
  opening_type?:    string;
  positions?:           number;
  has_wheels?:          boolean;
  has_towel_bar?:       boolean;
  has_side_table?:      boolean;
  weight_capacity_kg?:  number;
  is_daybed?:           boolean;
  is_modular?: boolean;
  seats?:      number;
  has_chaise?: boolean;
  accessory_type?: string;
  [key: string]: unknown;
}

// ── Main product interface ────────────────────────────────
export interface DBProduct {
  id:   string;
  created_at?: string | null;
  updated_at?: string | null;
  name: string;
  name_fr: string | null;
  name_es: string | null;
  name_it: string | null;
  category:       string;
  subcategory:    string | null;
  product_family: string | null;
  /** ÉTAPE 9b-1 : URL-safe slug for canonical /products/[brand-slug]/[product-slug] routing. NOT NULL post-migration 20260504092533. */
  product_slug:   string;
  /** ÉTAPE 9b-2b : denormalized partners.slug joined via owner_brand_id (or partner_id fallback). Optional — null if no owner brand resolved. */
  owner_brand_slug?: string | null;
  // Vague 2.5 : Founding tier de la marque propriétaire (pour badge ProductCard + boost ranking)
  partner_founding_tier?: string | null;
  partner_founding_tier_rank?: number | null;
  collection:     string | null;
  brand_source:   string | null;
  supplier_internal: string | null;
  short_description: string | null;
  short_description_fr: string | null;
  short_description_es: string | null;
  short_description_it: string | null;
  long_description:  string | null;
  long_description_fr:  string | null;
  long_description_es:  string | null;
  long_description_it:  string | null;
  indicative_price:  string | null;
  archetype_id:         string | null;
  archetype_confidence: number | null;
  image_url:    string | null;
  gallery_urls: string[];
  environment_urls: string[];
  documents:    any[];
  price_min: number | null;
  price_max: number | null;
  style_tags:     string[];
  ambience_tags:  string[];
  palette_tags:   string[];
  material_tags:  string[];
  use_case_tags:  string[];
  technical_tags: string[];
  product_type_tags: ProductTypeTags;
  main_color:      string | null;
  secondary_color: string | null;
  available_colors: string[];
  color_variants:     ColorVariant[];
  dimension_variants:  DimensionVariant[];
  dimensions_length_cm: number | null;
  dimensions_width_cm:  number | null;
  dimensions_height_cm: number | null;
  seat_height_cm:       number | null;
  weight_kg:            number | null;
  table_shape:                string | null;
  default_seating_capacity:   number | null;
  recommended_seating_min:    number | null;
  recommended_seating_max:    number | null;
  combinable:                 boolean;
  combined_capacity_if_joined: number | null;
  material_structure: string | null;
  material_seat:      string | null;
  is_outdoor:       boolean;
  is_stackable:     boolean;
  is_chr_heavy_use: boolean;
  uv_resistant:     boolean;
  weather_resistant: boolean;
  fire_retardant:   boolean;
  lightweight:      boolean;
  easy_maintenance: boolean;
  customizable:     boolean;
  dismountable:     boolean;
  requires_assembly: boolean;
  country_of_manufacture: string | null;
  warranty:               string | null;
  maintenance_info:       string | null;
  maintenance_info_fr?: string | null;
  maintenance_info_es?: string | null;
  maintenance_info_it?: string | null;
  stock_status:           string | null;
  stock_quantity:         number | null;
  estimated_delivery_days: number | null;
  availability_type:      string | null;
  popularity_score:   number;
  priority_score:     number;
  data_quality_score: number;
  // Deduplication fields from DB
  duplicate_of?: string | null;
  is_canonical_instance?: boolean | null;
  // Linked partner (supplier who owns this product)
  partner_id: string | null;
  // Computed at fetch time from product_offers
  offers_count?: number;
  // Publish workflow field
  publish_status?: string;
}

// ── Offer enrichment (reusable) ───────────────────────────

async function fetchOfferStats(): Promise<Map<string, { count: number; minPrice: number | null }>> {
  const { data, error } = await supabase
    .from("product_offers")
    .select("product_id, price, is_active")
    .eq("is_active", true)
    .limit(10000);

  if (error) throw error;

  const stats = new Map<string, { count: number; minPrice: number | null }>();
  for (const o of data ?? []) {
    const existing = stats.get(o.product_id) ?? { count: 0, minPrice: null };
    existing.count++;
    if (o.price != null) {
      existing.minPrice =
        existing.minPrice != null
          ? Math.min(existing.minPrice, o.price)
          : o.price;
    }
    stats.set(o.product_id, existing);
  }
  return stats;
}

export function enrichProductsWithOffers(
  products: DBProduct[],
  offerStats: Map<string, { count: number; minPrice: number | null }>
): DBProduct[] {
  return products.map((product) => {
    const stats = offerStats.get(product.id);
    if (stats) {
      product.offers_count = stats.count;
      if (stats.minPrice != null && product.price_min == null) {
        product.price_min = stats.minPrice;
      }
    }
    return product;
  });
}

// ── Fetch all products ────────────────────────────────────

// Plans that allow brand_source display (Growth+)
const BRAND_VISIBLE_PLANS = ["growth", "elite", "brand_member", "brand_network"];

// Commission rates by partner plan — applied transparently to client-facing prices
const PLAN_COMMISSION: Record<string, number> = {
  starter: 8,
  growth: 5,
  elite: 3.5,
  brand_member: 0,
  brand_network: 0,
};

export function applyCommission(price: number, plan: string, overrideRate?: number | null): number {
  const rate = overrideRate ?? PLAN_COMMISSION[plan] ?? PLAN_COMMISSION.starter;
  return Math.round((price * (1 + rate / 100)) * 100) / 100;
}

export async function fetchProducts(): Promise<DBProduct[]> {
  const [productsRes, offerStats] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("publish_status", "published")
      .is("duplicate_of", null)
      .neq("availability_type", "discontinued")
      .order("priority_score", { ascending: false })
      .limit(2000),
    fetchOfferStats(),
  ]);

  if (productsRes.error) throw productsRes.error;

  // Fetch partner plans + subscription commission overrides + owner_brand slug (9b-2b)
  // + Founding tier rank/tier pour boost ranking Vague 2.5
  const ownerBrandIds = [...new Set((productsRes.data ?? []).map(p => p.owner_brand_id).filter(Boolean))];
  const partnerIds = [...new Set([
    ...(productsRes.data ?? []).map(p => p.partner_id).filter(Boolean),
    ...ownerBrandIds,
  ])];
  const partnerPlans = new Map<string, string>();
  const partnerCommissions = new Map<string, number | null>();
  const partnerSlugs = new Map<string, string>();
  const partnerFoundingTier = new Map<string, string | null>();
  const partnerFoundingRank = new Map<string, number>();
  if (partnerIds.length > 0) {
    const [{ data: partners }, { data: subs }] = await Promise.all([
      supabase.from("partners").select("id, plan, slug, is_founding, founding_tier, founding_tier_rank").in("id", partnerIds),
      supabase.from("partner_subscriptions").select("partner_id, commission_rate").in("partner_id", partnerIds),
    ]);
    for (const p of partners ?? []) {
      partnerPlans.set(p.id, p.plan || "starter");
      if (p.slug) partnerSlugs.set(p.id, p.slug);
      if (p.is_founding) {
        partnerFoundingTier.set(p.id, p.founding_tier ?? "founder");
        partnerFoundingRank.set(p.id, p.founding_tier_rank ?? 1);
      }
    }
    for (const s of subs ?? []) {
      if (s.commission_rate != null) {
        partnerCommissions.set(s.partner_id, Number(s.commission_rate));
      }
    }
  }

  const products = (productsRes.data ?? []).map((raw) => {
    const stats   = offerStats.get(raw.id);
    const product = normalizeProduct(raw);

    // Resolve partner plan and commission rate
    const plan = product.partner_id
      ? partnerPlans.get(product.partner_id) || "starter"
      : "starter";
    const commissionRate = product.partner_id
      ? partnerCommissions.get(product.partner_id) ?? null
      : null;

    // Hide brand_source for Starter plan partners
    if (product.partner_id && !BRAND_VISIBLE_PLANS.includes(plan)) {
      product.brand_source = null;
    }

    // 9b-2b : denormalize owner_brand slug for canonical URL building
    const ownerId = (raw as { owner_brand_id?: string | null }).owner_brand_id ?? product.partner_id;
    product.owner_brand_slug = ownerId ? partnerSlugs.get(ownerId) ?? null : null;

    // Vague 2.5 : denormalize founding tier pour badge ProductCard
    const tierOwnerId = ownerId ?? product.partner_id;
    product.partner_founding_tier = tierOwnerId ? (partnerFoundingTier.get(tierOwnerId) ?? null) : null;
    product.partner_founding_tier_rank = tierOwnerId ? (partnerFoundingRank.get(tierOwnerId) ?? 0) : 0;

    // Apply commission to client-facing prices (subscription override > plan default)
    if (product.price_min != null) {
      product.price_min = applyCommission(product.price_min, plan, commissionRate);
    }
    if (product.price_max != null) {
      product.price_max = applyCommission(product.price_max, plan, commissionRate);
    }

    if (stats) {
      product.offers_count = stats.count;
      if (stats.minPrice != null && product.price_min == null) {
        product.price_min = applyCommission(stats.minPrice, plan, commissionRate);
      }
    }
    return product;
  });

  // Vague 2.5 : tri secondaire par tier_rank Founding DESC, conserve priority_score DESC
  // initial pour les ties. ORDER BY combiné (founding_tier_rank DESC NULLS LAST,
  // priority_score DESC) appliqué côté JS pour éviter join sql lourd.
  products.sort((a, b) => {
    const rankA = a.partner_founding_tier_rank ?? 0;
    const rankB = b.partner_founding_tier_rank ?? 0;
    if (rankA !== rankB) return rankB - rankA;
    return (b.priority_score ?? 0) - (a.priority_score ?? 0);
  });

  return products;
}

// ── Fetch single product ──────────────────────────────────

export async function fetchProductById(id: string): Promise<DBProduct | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .neq("availability_type", "discontinued")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const product = normalizeProduct(data);

  // Hide brand_source for Starter plan partners + apply commission
  if (product.partner_id) {
    const [{ data: partner }, { data: sub }] = await Promise.all([
      supabase.from("partners").select("plan").eq("id", product.partner_id).maybeSingle(),
      supabase.from("partner_subscriptions").select("commission_rate").eq("partner_id", product.partner_id).maybeSingle(),
    ]);
    const plan = partner?.plan || "starter";
    const commissionRate = sub?.commission_rate != null ? Number(sub.commission_rate) : null;

    if (!BRAND_VISIBLE_PLANS.includes(plan)) {
      product.brand_source = null;
    }
    // Apply commission (subscription override > plan default)
    if (product.price_min != null) {
      product.price_min = applyCommission(product.price_min, plan, commissionRate);
    }
    if (product.price_max != null) {
      product.price_max = applyCommission(product.price_max, plan, commissionRate);
    }
  }

  // 9b-2b : denormalize owner_brand slug for canonical URL building
  const ownerId = (data as { owner_brand_id?: string | null }).owner_brand_id ?? product.partner_id;
  if (ownerId) {
    const { data: ownerPartner } = await supabase
      .from("partners")
      .select("slug")
      .eq("id", ownerId)
      .maybeSingle();
    product.owner_brand_slug = ownerPartner?.slug ?? null;
  } else {
    product.owner_brand_slug = null;
  }

  return product;
}

// ── Fetch products by IDs ─────────────────────────────────

export async function fetchProductsByIds(ids: string[]): Promise<DBProduct[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .in("id", ids)
    .eq("publish_status", "published")
    .is("duplicate_of", null)
    .neq("availability_type", "discontinued");

  if (error) throw error;
  const products = (data ?? []).map(normalizeProduct);
  if (products.length === 0) return products;

  // 9b-2b : include owner_brand_id in the partnerIds set so we can map slugs
  const ownerBrandIds = (data ?? []).map((r) => (r as { owner_brand_id?: string | null }).owner_brand_id).filter(Boolean) as string[];
  const partnerIds = [...new Set([
    ...products.map((p) => p.partner_id).filter(Boolean) as string[],
    ...ownerBrandIds,
  ])];
  if (partnerIds.length === 0) return products;

  const [{ data: partners }, { data: subs }] = await Promise.all([
    supabase.from("partners").select("id, plan, slug").in("id", partnerIds),
    supabase.from("partner_subscriptions").select("partner_id, commission_rate").in("partner_id", partnerIds),
  ]);
  const partnerPlans = new Map<string, string>();
  const partnerCommissions = new Map<string, number | null>();
  const partnerSlugs = new Map<string, string>();
  for (const p of partners ?? []) {
    partnerPlans.set(p.id, p.plan || "starter");
    if (p.slug) partnerSlugs.set(p.id, p.slug);
  }
  for (const s of subs ?? []) {
    if (s.commission_rate != null) partnerCommissions.set(s.partner_id, Number(s.commission_rate));
  }

  // Build a map of product.id → owner_brand_id for 9b-2b denormalization
  const ownerBrandByProduct = new Map<string, string | null>();
  for (const r of data ?? []) {
    ownerBrandByProduct.set(
      r.id as string,
      ((r as { owner_brand_id?: string | null }).owner_brand_id ?? null) || null,
    );
  }

  return products.map((product) => {
    // 9b-2b : denormalize owner_brand slug
    const ownerId = ownerBrandByProduct.get(product.id) ?? product.partner_id;
    product.owner_brand_slug = ownerId ? partnerSlugs.get(ownerId) ?? null : null;

    if (!product.partner_id) return product;
    const plan = partnerPlans.get(product.partner_id) || "starter";
    const commissionRate = partnerCommissions.get(product.partner_id) ?? null;
    if (!BRAND_VISIBLE_PLANS.includes(plan)) {
      product.brand_source = null;
    }
    if (product.price_min != null) {
      product.price_min = applyCommission(product.price_min, plan, commissionRate);
    }
    if (product.price_max != null) {
      product.price_max = applyCommission(product.price_max, plan, commissionRate);
    }
    return product;
  });
}

// ── Fetch products by archetype ───────────────────────────

export async function fetchProductsByArchetype(
  archetypeId: string
): Promise<DBProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("archetype_id", archetypeId)
    .eq("publish_status", "published")
    .is("duplicate_of", null)
    .neq("availability_type", "discontinued")
    .order("data_quality_score", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(normalizeProduct);
}

// ── Tag definitions ───────────────────────────────────────

export interface TagDefinition {
  tag_type: string;
  slug:     string;
  label_en: string;
  label_fr: string | null;
  label_it: string | null;
  label_es: string | null;
  label_de: string | null;
  label_nl: string | null;
}

export async function fetchTagDefinitions(
  tagType?: string
): Promise<TagDefinition[]> {
  let query = supabase
    .from("tag_definitions")
    .select("tag_type, slug, label_en, label_fr, label_it, label_es, label_de, label_nl")
    .order("tag_type")
    .order("slug");

  if (tagType) query = query.eq("tag_type", tagType);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// ── Normalize raw Supabase row → DBProduct ─────────────────

export function normalizeProduct(raw: Record<string, any>): DBProduct {
  // Fallback: use first gallery image as main image if image_url is missing
  const galleryUrls = raw.gallery_urls ?? [];
  const validGalleryUrl = galleryUrls.find((u: string) => u && (u.startsWith("http") || u.startsWith("data:image")));
  const image_url = raw.image_url || validGalleryUrl || null;

  return ({
    ...raw,
    image_url,
    style_tags:      raw.style_tags      ?? [],
    ambience_tags:   raw.ambience_tags   ?? [],
    palette_tags:    raw.palette_tags    ?? [],
    material_tags:   raw.material_tags   ?? [],
    use_case_tags:   raw.use_case_tags   ?? [],
    technical_tags:  raw.technical_tags  ?? [],
    available_colors: raw.available_colors ?? [],
    gallery_urls:    raw.gallery_urls    ?? [],
    environment_urls: raw.environment_urls ?? [],
    documents:       raw.documents       ?? [],
    color_variants:     raw.color_variants     ?? [],
    dimension_variants: raw.dimension_variants ?? [],
    product_type_tags:  raw.product_type_tags  ?? {},
    is_outdoor:       raw.is_outdoor        ?? false,
    is_stackable:     raw.is_stackable      ?? false,
    is_chr_heavy_use: raw.is_chr_heavy_use  ?? false,
    uv_resistant:     raw.uv_resistant      ?? false,
    weather_resistant: raw.weather_resistant ?? false,
    fire_retardant:   raw.fire_retardant    ?? false,
    lightweight:      raw.lightweight       ?? false,
    easy_maintenance: raw.easy_maintenance  ?? false,
    customizable:     raw.customizable      ?? false,
    dismountable:     raw.dismountable      ?? false,
    requires_assembly: raw.requires_assembly ?? false,
    combinable:       raw.combinable        ?? false,
    partner_id:       raw.partner_id        ?? null,
    popularity_score:   raw.popularity_score   ?? 0,
    priority_score:     raw.priority_score     ?? 0,
    data_quality_score: raw.data_quality_score ?? 0,
    publish_status:     raw.publish_status     ?? "draft",
  }) as DBProduct;
}

// ── Helpers ───────────────────────────────────────────────

export function getColorLabel(
  slug: string,
  tags: TagDefinition[],
  lang: "en" | "fr" | "it" | "es" | "de" | "nl" = "en"
): string {
  const def = tags.find((t) => t.tag_type === "color" && t.slug === slug);
  if (!def) return slug;
  const labelKey = `label_${lang}` as keyof TagDefinition;
  return (def[labelKey] as string | null) ?? def.label_en ?? slug;
}

export function isProductPublishable(product: DBProduct): boolean {
  return product.data_quality_score >= 0.5;
}

export function getQualityTier(
  score: number
): "excellent" | "good" | "fair" | "incomplete" {
  if (score >= 0.8) return "excellent";
  if (score >= 0.6) return "good";
  if (score >= 0.4) return "fair";
  return "incomplete";
}
