import { supabase } from "@/integrations/supabase/client";

export interface ProductOffer {
  id: string;
  product_id: string;
  partner_id: string;
  price: number | null;
  currency: string | null;
  stock_status: string | null;
  stock_quantity: number | null;
  delivery_delay_days: number | null;
  minimum_order: number | null;
  purchase_type: string | null;
  notes: string | null;
  is_active: boolean | null;
  partner?: {
    id: string;
    name: string;
    slug: string;
    partner_type: string;
    country: string | null;
    city: string | null;
    logo_url: string | null;
  };
}

export async function fetchProductOffers(productId: string): Promise<ProductOffer[]> {
  const { data, error } = await supabase
    .from("product_offers")
    .select(`
      *,
      partner:partners (id, name, slug, partner_type, country, city, logo_url)
    `)
    .eq("product_id", productId)
    .eq("is_active", true)
    .order("price", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as unknown as ProductOffer[];
}
