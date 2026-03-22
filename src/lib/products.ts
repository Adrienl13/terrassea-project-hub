import { supabase } from "@/integrations/supabase/client";

// ── Color variant (regrouped under one product) ───────────
export interface ColorVariant {
  color_slug: string;
  color_hex:  string;
  label_en:   string;
  image_url?: string;
  available:  boolean;
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
  name: string;
  name_fr: string | null;
  name_es: string | null;
  name_it: string | null;
  category:       string;
  subcategory:    string | null;
  product_family: string | null;
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
  color_variants:  ColorVariant[];
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
  stock_status:           string | null;
  stock_quantity:         number | null;
  estimated_delivery_days: number | null;
  availability_type:      string | null;
  popularity_score:   number;
  priority_score:     number;
  data_quality_score: number;
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

export async function fetchProducts(): Promise<DBProduct[]> {
  const [productsRes, offerStats] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .neq("availability_type", "discontinued")
      .order("priority_score", { ascending: false })
      .limit(2000),
    fetchOfferStats(),
  ]);

  if (productsRes.error) throw productsRes.error;

  return (productsRes.data ?? []).map((raw) => {
    const stats   = offerStats.get(raw.id);
    const product = normalizeProduct(raw);
    if (stats) {
      product.offers_count = stats.count;
      if (stats.minPrice != null && product.price_min == null) {
        product.price_min = stats.minPrice;
      }
    }
    return product;
  });
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
  return data ? normalizeProduct(data) : null;
}

// ── Fetch products by IDs ─────────────────────────────────

export async function fetchProductsByIds(ids: string[]): Promise<DBProduct[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .in("id", ids)
    .neq("availability_type", "discontinued");

  if (error) throw error;
  return (data ?? []).map(normalizeProduct);
}

// ── Fetch products by archetype ───────────────────────────

export async function fetchProductsByArchetype(
  archetypeId: string
): Promise<DBProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("archetype_id", archetypeId)
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

export function normalizeProduct(raw: any): DBProduct {
  return {
    ...raw,
    style_tags:      raw.style_tags      ?? [],
    ambience_tags:   raw.ambience_tags   ?? [],
    palette_tags:    raw.palette_tags    ?? [],
    material_tags:   raw.material_tags   ?? [],
    use_case_tags:   raw.use_case_tags   ?? [],
    technical_tags:  raw.technical_tags  ?? [],
    available_colors: raw.available_colors ?? [],
    gallery_urls:    raw.gallery_urls    ?? [],
    documents:       raw.documents       ?? [],
    color_variants:  raw.color_variants  ?? [],
    product_type_tags: raw.product_type_tags ?? {},
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
  };
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
