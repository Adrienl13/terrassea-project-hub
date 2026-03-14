import { supabase } from "@/integrations/supabase/client";

export interface DBProduct {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  short_description: string | null;
  long_description: string | null;
  indicative_price: string | null;
  image_url: string | null;
  gallery_urls: string[];
  product_family: string | null;
  collection: string | null;
  brand_source: string | null;
  main_color: string | null;
  secondary_color: string | null;
  available_colors: string[];
  style_tags: string[];
  ambience_tags: string[];
  palette_tags: string[];
  material_tags: string[];
  use_case_tags: string[];
  technical_tags: string[];
  material_structure: string | null;
  material_seat: string | null;
  dimensions_length_cm: number | null;
  dimensions_width_cm: number | null;
  dimensions_height_cm: number | null;
  seat_height_cm: number | null;
  weight_kg: number | null;
  is_outdoor: boolean;
  is_stackable: boolean;
  is_chr_heavy_use: boolean;
  uv_resistant: boolean;
  weather_resistant: boolean;
  fire_retardant: boolean;
  lightweight: boolean;
  easy_maintenance: boolean;
  customizable: boolean;
  dismountable: boolean;
  requires_assembly: boolean;
  country_of_manufacture: string | null;
  warranty: string | null;
  maintenance_info: string | null;
  stock_status: string | null;
  stock_quantity: number | null;
  estimated_delivery_days: number | null;
  price_min: number | null;
  price_max: number | null;
  popularity_score: number;
  priority_score: number;
  availability_type: string | null;
  supplier_internal: string | null;
  documents: any[];
  table_shape: string | null;
  default_seating_capacity: number | null;
  recommended_seating_min: number | null;
  recommended_seating_max: number | null;
  combinable: boolean;
  combined_capacity_if_joined: number | null;
}

export async function fetchProducts(): Promise<DBProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("priority_score", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(normalizeProduct);
}

export async function fetchProductById(id: string): Promise<DBProduct | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeProduct(data) : null;
}

function normalizeProduct(raw: any): DBProduct {
  return {
    ...raw,
    style_tags: raw.style_tags ?? [],
    ambience_tags: raw.ambience_tags ?? [],
    palette_tags: raw.palette_tags ?? [],
    material_tags: raw.material_tags ?? [],
    use_case_tags: raw.use_case_tags ?? [],
    technical_tags: raw.technical_tags ?? [],
    available_colors: raw.available_colors ?? [],
    gallery_urls: raw.gallery_urls ?? [],
    documents: raw.documents ?? [],
    is_outdoor: raw.is_outdoor ?? false,
    is_stackable: raw.is_stackable ?? false,
    is_chr_heavy_use: raw.is_chr_heavy_use ?? false,
    uv_resistant: raw.uv_resistant ?? false,
    weather_resistant: raw.weather_resistant ?? false,
    fire_retardant: raw.fire_retardant ?? false,
    lightweight: raw.lightweight ?? false,
    easy_maintenance: raw.easy_maintenance ?? false,
    customizable: raw.customizable ?? false,
    dismountable: raw.dismountable ?? false,
    requires_assembly: raw.requires_assembly ?? false,
    popularity_score: raw.popularity_score ?? 0,
    priority_score: raw.priority_score ?? 0,
    combinable: raw.combinable ?? false,
  };
