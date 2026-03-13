import { supabase } from "@/integrations/supabase/client";

export interface DBProduct {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  short_description: string | null;
  indicative_price: string | null;
  image_url: string | null;
  product_family: string | null;
  main_color: string | null;
  secondary_color: string | null;
  style_tags: string[];
  ambience_tags: string[];
  palette_tags: string[];
  material_tags: string[];
  use_case_tags: string[];
  technical_tags: string[];
  is_outdoor: boolean;
  is_stackable: boolean;
  is_chr_heavy_use: boolean;
  popularity_score: number;
  priority_score: number;
  availability_type: string | null;
  brand_source: string | null;
  supplier_internal: string | null;
}

export async function fetchProducts(): Promise<DBProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("priority_score", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DBProduct[];
}

export async function fetchProductById(id: string): Promise<DBProduct | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as DBProduct | null;
}
