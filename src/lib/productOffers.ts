import { supabase } from "@/integrations/supabase/client";
import { applyCommission } from "@/lib/products";

export interface BrandDistributor {
  distributor_id: string;
  country_code: string;
  is_exclusive: boolean;
  priority: number;
}

/**
 * For brand_network products: find the distributor assigned to a specific country.
 * Returns null if no distributor covers that country.
 */
export async function fetchBrandDistributorForCountry(
  brandId: string,
  countryCode: string
): Promise<BrandDistributor | null> {
  const { data } = await supabase
    .from("brand_distributors")
    .select("distributor_id, country_code, is_exclusive, priority")
    .eq("brand_id", brandId)
    .eq("country_code", countryCode)
    .eq("is_active", true)
    .order("is_exclusive", { ascending: false })
    .order("priority", { ascending: true })
    .limit(1);
  return (data?.[0] as BrandDistributor) ?? null;
}

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
  dimension_tag: string | null;
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

  // Fetch subscription commission overrides for all partners in offers
  const partnerIds = [...new Set((data ?? []).map((o: any) => o.partner_id).filter(Boolean))];
  const commissionMap = new Map<string, number | null>();
  if (partnerIds.length > 0) {
    const { data: subs } = await supabase
      .from("partner_subscriptions")
      .select("partner_id, commission_rate")
      .in("partner_id", partnerIds);
    for (const s of subs ?? []) {
      if (s.commission_rate != null) commissionMap.set(s.partner_id, Number(s.commission_rate));
    }
  }

  // Apply commission (subscription override > plan default)
  return (data ?? []).map((offer: any) => {
    const plan = offer.partner?.plan || "starter";
    const overrideRate = commissionMap.get(offer.partner_id) ?? null;
    return {
      ...offer,
      price: offer.price != null ? applyCommission(offer.price, plan, overrideRate) : null,
    } as ProductOffer;
  });
}
