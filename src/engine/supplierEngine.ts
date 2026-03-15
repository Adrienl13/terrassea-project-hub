import { supabase } from "@/integrations/supabase/client";
import type { ProductOffer } from "@/lib/productOffers";

// ── Types ──

export interface ScoredOffer extends ProductOffer {
  scores: {
    consistency: number;   // 0-100
    availability: number;  // 0-100
    leadTime: number;      // 0-100
    price: number;         // 0-100
    total: number;         // weighted composite
  };
  badges: SupplierBadge[];
  isRecommended: boolean;
  recommendationReason?: string;
}

export type SupplierBadge = "best_stock" | "fastest" | "best_project_fit" | "recommended";

interface ScoringWeights {
  consistency: number;
  availability: number;
  leadTime: number;
  price: number;
}

const NORMAL_WEIGHTS: ScoringWeights = {
  consistency: 0.40,
  availability: 0.30,
  leadTime: 0.20,
  price: 0.10,
};

const URGENT_WEIGHTS: ScoringWeights = {
  consistency: 0.20,
  availability: 0.35,
  leadTime: 0.40,
  price: 0.05,
};

// ── Fetch all offers for a set of product IDs ──

async function fetchAllProjectOffers(productIds: string[]): Promise<ProductOffer[]> {
  if (productIds.length === 0) return [];

  const { data, error } = await supabase
    .from("product_offers")
    .select(`*, partner:partners (id, name, slug, partner_type, country, city, logo_url)`)
    .in("product_id", productIds)
    .eq("is_active", true);

  if (error) throw error;
  return (data ?? []) as unknown as ProductOffer[];
}

// ── Build partner coverage map ──
// How many distinct project products each partner covers

function buildPartnerCoverage(
  allOffers: ProductOffer[],
  projectProductIds: string[]
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const offer of allOffers) {
    if (!projectProductIds.includes(offer.product_id)) continue;
    if (!map.has(offer.partner_id)) map.set(offer.partner_id, new Set());
    map.get(offer.partner_id)!.add(offer.product_id);
  }
  return map;
}

// ── Scoring functions ──

function scoreConsistency(
  partnerId: string,
  coverage: Map<string, Set<string>>,
  totalProducts: number
): number {
  const covered = coverage.get(partnerId)?.size ?? 0;
  if (totalProducts <= 1) return covered > 0 ? 50 : 0;
  // Ratio of project products this partner covers
  return Math.round((covered / totalProducts) * 100);
}

function scoreAvailability(offer: ProductOffer): number {
  const status = offer.stock_status?.toLowerCase() || "available";
  const qty = offer.stock_quantity;

  if (status === "available" || status === "in_stock") {
    if (qty !== null && qty > 50) return 100;
    if (qty !== null && qty > 20) return 85;
    if (qty !== null && qty > 0) return 60;
    return 80; // available but no qty info
  }
  if (status === "low_stock") return 50;
  if (status === "production" || status === "on_order") return 30;
  if (status === "out_of_stock") return 10;
  return 40;
}

function scoreLeadTime(offer: ProductOffer, allOffers: ProductOffer[]): number {
  const days = offer.delivery_delay_days;
  if (days === null || days === undefined) return 30; // unknown = low score

  // Find the range among all offers for same product
  const sameProduct = allOffers.filter((o) => o.product_id === offer.product_id && o.delivery_delay_days != null);
  if (sameProduct.length <= 1) return days <= 7 ? 100 : days <= 21 ? 70 : days <= 42 ? 50 : 30;

  const minDays = Math.min(...sameProduct.map((o) => o.delivery_delay_days!));
  const maxDays = Math.max(...sameProduct.map((o) => o.delivery_delay_days!));

  if (maxDays === minDays) return 80;
  // Inverted linear: fastest = 100, slowest = 20
  return Math.round(100 - ((days - minDays) / (maxDays - minDays)) * 80);
}

function scorePrice(offer: ProductOffer, allOffers: ProductOffer[]): number {
  if (offer.price === null) return 30;

  const sameProduct = allOffers.filter((o) => o.product_id === offer.product_id && o.price != null);
  if (sameProduct.length <= 1) return 70;

  const minPrice = Math.min(...sameProduct.map((o) => o.price!));
  const maxPrice = Math.max(...sameProduct.map((o) => o.price!));

  if (maxPrice === minPrice) return 80;
  // Cheapest = 100, most expensive = 20
  return Math.round(100 - ((offer.price - minPrice) / (maxPrice - minPrice)) * 80);
}

// ── Assign badges ──

function assignBadges(scoredOffers: ScoredOffer[]): void {
  if (scoredOffers.length === 0) return;

  // Best stock
  const bestAvail = scoredOffers.reduce((a, b) => a.scores.availability > b.scores.availability ? a : b);
  if (bestAvail.scores.availability >= 60) bestAvail.badges.push("best_stock");

  // Fastest
  const bestLead = scoredOffers.reduce((a, b) => a.scores.leadTime > b.scores.leadTime ? a : b);
  if (bestLead.scores.leadTime >= 60) bestLead.badges.push("fastest");

  // Best project fit
  const bestFit = scoredOffers.reduce((a, b) => a.scores.consistency > b.scores.consistency ? a : b);
  if (bestFit.scores.consistency >= 40) bestFit.badges.push("best_project_fit");

  // Recommended = highest total
  const best = scoredOffers.reduce((a, b) => a.scores.total > b.scores.total ? a : b);
  best.badges.push("recommended");
  best.isRecommended = true;
  best.recommendationReason = buildRecommendationReason(best, scoredOffers.length);
}

function buildRecommendationReason(offer: ScoredOffer, totalOffers: number): string {
  const reasons: string[] = [];
  if (offer.scores.consistency >= 60) {
    reasons.push("this supplier already matches multiple selected items");
  }
  if (offer.scores.availability >= 80) {
    reasons.push("stock is immediately available");
  }
  if (offer.scores.leadTime >= 80) {
    reasons.push("offers the fastest delivery");
  }
  if (reasons.length === 0) {
    reasons.push("best overall balance of availability, lead time and project consistency");
  }
  return `Recommended for this project because ${reasons.join(" and ")}, helping consolidate sourcing and logistics.`;
}

// ── Main scoring function ──

export async function scoreSupplierOffers(
  targetProductId: string,
  projectProductIds: string[],
  isUrgent: boolean = false
): Promise<ScoredOffer[]> {
  // Fetch all offers across the project
  const uniqueIds = [...new Set([...projectProductIds, targetProductId])];
  const allOffers = await fetchAllProjectOffers(uniqueIds);

  // Offers for the target product only
  const targetOffers = allOffers.filter((o) => o.product_id === targetProductId);
  if (targetOffers.length === 0) return [];

  const coverage = buildPartnerCoverage(allOffers, uniqueIds);
  const weights = isUrgent ? URGENT_WEIGHTS : NORMAL_WEIGHTS;

  const scored: ScoredOffer[] = targetOffers.map((offer) => {
    const consistency = scoreConsistency(offer.partner_id, coverage, uniqueIds.length);
    const availability = scoreAvailability(offer);
    const leadTime = scoreLeadTime(offer, allOffers);
    const price = scorePrice(offer, allOffers);

    const total = Math.round(
      consistency * weights.consistency +
      availability * weights.availability +
      leadTime * weights.leadTime +
      price * weights.price
    );

    return {
      ...offer,
      scores: { consistency, availability, leadTime, price, total },
      badges: [],
      isRecommended: false,
    };
  });

  // Sort by total descending
  scored.sort((a, b) => b.scores.total - a.scores.total);

  // Assign badges
  assignBadges(scored);

  return scored;
}
