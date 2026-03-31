import { supabase } from "@/integrations/supabase/client";
import { applyCommission } from "@/lib/products";

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
  pricing_mode: string | null;
  collection_name: string | null;
  partner_color_name: string | null;
  partner?: {
    id: string;
    name: string;
    slug: string;
    partner_type: string;
    country: string | null;
    city: string | null;
    logo_url: string | null;
    partner_mode: string | null;
    plan?: string | null;
  };
}

export async function fetchProductOffers(productId: string): Promise<ProductOffer[]> {
  const { data, error } = await supabase
    .from("product_offers")
    .select(`
      *,
      partner:partners (id, name, slug, partner_type, country, city, logo_url, partner_mode, plan)
    `)
    .eq("product_id", productId)
    .eq("is_active", true)
    .order("price", { ascending: true, nullsFirst: false });

  if (error) throw error;

  // Apply commission to client-facing prices
  return (data ?? []).map((offer: any) => {
    const plan = offer.partner?.plan || "starter";
    return {
      ...offer,
      price: offer.price != null ? applyCommission(offer.price, plan) : null,
    } as ProductOffer;
  });
}
