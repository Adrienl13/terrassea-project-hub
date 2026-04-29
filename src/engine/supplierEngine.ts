import { supabase } from "@/integrations/supabase/client";
import type { ProductOffer } from "@/lib/productOffers";
import type { ProductArrival } from "@/hooks/useArrivals";

// ── Types ──

export interface ScoredOffer extends ProductOffer {
  scores: {
    consistency: number;   // 0-100
    availability: number;  // 0-100
    leadTime: number;      // 0-100
    price: number;         // 0-100
    reputation: number;    // 0-100 (from partner ratings)
    total: number;         // weighted composite
  };
  badges: SupplierBadge[];
  isRecommended: boolean;
  recommendationReason?: string;
  moqWarning?: MoqWarning;
}

/**
 * Minimum order quantity diagnostic. Exposed to the UI so buyers see why a
 * supplier is penalised (e.g. needs to buy extra units they don't need).
 */
export interface MoqWarning {
  minimumOrder: number;
  requestedQuantity: number;
  excessUnits: number;
  excessRatio: number; // excessUnits / requestedQuantity
}

export type SupplierBadge = "best_stock" | "fastest" | "best_project_fit" | "recommended" | "top_rated" | "moq_mismatch";

interface ScoringWeights {
  consistency: number;
  availability: number;
  leadTime: number;
  price: number;
  reputation: number;
}

const NORMAL_WEIGHTS: ScoringWeights = {
  consistency: 0.30,
  availability: 0.25,
  leadTime: 0.15,
  price: 0.10,
  reputation: 0.20,
};

const URGENT_WEIGHTS: ScoringWeights = {
  consistency: 0.15,
  availability: 0.30,
  leadTime: 0.35,
  price: 0.05,
  reputation: 0.15,
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

function scoreAvailability(offer: ProductOffer, offerArrivals: ProductArrival[] = []): number {
  const status = offer.stock_status?.toLowerCase() || "available";
  const qty = offer.stock_quantity;

  let base: number;
  if (status === "available" || status === "in_stock") {
    if (qty !== null && qty > 50) base = 100;
    else if (qty !== null && qty > 20) base = 85;
    else if (qty !== null && qty > 0) base = 60;
    else base = 80; // available but no qty info
  } else if (status === "low_stock") {
    base = 50;
  } else if (status === "production" || status === "on_order") {
    base = 30;
  } else if (status === "out_of_stock") {
    base = 10;
  } else {
    base = 40;
  }

  // Arrival-awareness bonus
  if (offerArrivals.length > 0) {
    const now = new Date();
    const soonest = offerArrivals[0]; // already sorted by date
    const diffDays = Math.ceil(
      (new Date(soonest.expectedDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays <= 14) base += 20;
    else if (diffDays <= 42) base += 10;

    if (soonest.preorderEnabled) base += 5;
  }

  return Math.min(base, 100);
}

function scoreLeadTime(offer: ProductOffer, allOffers: ProductOffer[]): number {
  const days = offer.delivery_delay_days;
  if (days === null || days === undefined) return 15; // unknown = penalized — prefer confirmed lead times

  // Find the range among all offers for same product
  const sameProduct = allOffers.filter((o) => o.product_id === offer.product_id && o.delivery_delay_days != null);
  if (sameProduct.length <= 1) return days <= 7 ? 100 : days <= 21 ? 70 : days <= 42 ? 50 : 30;

  const dayValues = sameProduct.map((o) => o.delivery_delay_days).filter((d): d is number => d != null);
  if (dayValues.length === 0) return 30;
  const minDays = Math.min(...dayValues);
  const maxDays = Math.max(...dayValues);

  if (maxDays === minDays) return 80;
  // Inverted linear: fastest = 100, slowest = 20
  return Math.round(100 - ((days - minDays) / (maxDays - minDays)) * 80);
}

function scorePrice(offer: ProductOffer, allOffers: ProductOffer[]): number {
  if (offer.price === null) return 30;

  const sameProduct = allOffers.filter((o) => o.product_id === offer.product_id && o.price != null);
  if (sameProduct.length <= 1) return 70;

  const priceValues = sameProduct.map((o) => o.price).filter((p): p is number => p != null);
  if (priceValues.length === 0) return 30;
  const minPrice = Math.min(...priceValues);
  const maxPrice = Math.max(...priceValues);

  if (maxPrice === minPrice) return 80;
  // Cheapest = 100, most expensive = 20
  return Math.round(100 - ((offer.price - minPrice) / (maxPrice - minPrice)) * 80);
}

// ── Reputation scoring from partner ratings ──

async function fetchPartnerReputations(partnerIds: string[]): Promise<Record<string, number>> {
  if (partnerIds.length === 0) return {};
  const { data } = await supabase
    .from("partner_ratings")
    .select("partner_id, rating")
    .in("partner_id", partnerIds);

  const reputations: Record<string, { sum: number; count: number }> = {};
  for (const row of data || []) {
    if (!reputations[row.partner_id]) reputations[row.partner_id] = { sum: 0, count: 0 };
    reputations[row.partner_id].sum += row.rating;
    reputations[row.partner_id].count += 1;
  }

  const result: Record<string, number> = {};
  for (const [partnerId, { sum, count }] of Object.entries(reputations)) {
    if (count === 0) continue;
    const avg = sum / count; // 1-5 scale
    // Convert to 0-100: 1→0, 3→50, 5→100
    result[partnerId] = Math.max(0, Math.min(100, Math.round(((avg - 1) / 4) * 100)));
  }
  return result;
}

function scoreReputation(partnerId: string, reputations: Record<string, number>): number {
  // If no ratings exist, return neutral score (not penalized)
  return reputations[partnerId] ?? 60;
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

  // Top rated
  const bestRated = scoredOffers.reduce((a, b) => a.scores.reputation > b.scores.reputation ? a : b);
  if (bestRated.scores.reputation >= 75) bestRated.badges.push("top_rated");

  // MOQ mismatch — flag offers where the buyer would be forced to overbuy
  for (const offer of scoredOffers) {
    if (offer.moqWarning && offer.moqWarning.excessRatio > 0.25) {
      offer.badges.push("moq_mismatch");
    }
  }

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
  if (offer.scores.reputation >= 80) {
    reasons.push("highly rated by other buyers");
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
  isUrgent: boolean = false,
  arrivals: ProductArrival[] = [],
  selectedDimension?: string | null,
  requestedQuantity?: number
): Promise<ScoredOffer[]> {
  // Fetch all offers across the project
  const uniqueIds = [...new Set([...projectProductIds, targetProductId])];
  const allOffers = await fetchAllProjectOffers(uniqueIds);

  // Offers for the target product only
  const targetOffers = allOffers.filter((o) => o.product_id === targetProductId);
  if (targetOffers.length === 0) return [];

  // When a dimension is selected, compare prices only among same-dimension offers
  const sameDimOffers = selectedDimension
    ? targetOffers.filter(o => o.dimension_tag?.toLowerCase() === selectedDimension.toLowerCase())
    : [];
  const priceComparisonPool = sameDimOffers.length > 0 ? sameDimOffers : targetOffers;

  const coverage = buildPartnerCoverage(allOffers, uniqueIds);
  const weights = isUrgent ? URGENT_WEIGHTS : NORMAL_WEIGHTS;

  // Fetch partner reputations
  const partnerIds = [...new Set(targetOffers.map(o => o.partner_id))];
  const reputations = await fetchPartnerReputations(partnerIds);

  const scored: ScoredOffer[] = targetOffers.map((offer) => {
    const offerArrivals = arrivals.filter((a) => a.partnerId === offer.partner_id);
    const consistency = scoreConsistency(offer.partner_id, coverage, uniqueIds.length);
    const availability = scoreAvailability(offer, offerArrivals);
    const leadTime = scoreLeadTime(offer, allOffers);
    // Compare prices within same-dimension pool when dimension is selected
    const price = scorePrice(offer, priceComparisonPool);
    const reputation = scoreReputation(offer.partner_id, reputations);

    let total = Math.round(
      consistency * weights.consistency +
      availability * weights.availability +
      leadTime * weights.leadTime +
      price * weights.price +
      reputation * weights.reputation
    );

    // Dimension match bonus: boost offers matching the selected dimension
    if (selectedDimension && offer.dimension_tag?.toLowerCase() === selectedDimension.toLowerCase()) {
      total += 15;
    }

    // ── MOQ scoring (Chantier 3) ──
    // Real-world hospitality sourcing: outdoor furniture suppliers often impose
    // minimum order quantities. If the requested quantity is below MOQ, the
    // buyer must buy extras — so we penalise these offers proportionally.
    //
    // Data-quality note (audit 2026-04-20): 21% of active offers have
    // `minimum_order` set and 0% have a realistic MOQ (>1). Today the platform
    // is reseller-dominated; brand-direct offers (when onboarded) will start
    // carrying real MOQs and this scoring block will gain signal. Keep
    // forward-looking — no behaviour change needed when the field is null.
    let moqWarning: MoqWarning | undefined;
    const moq = offer.minimum_order ?? 0;
    if (requestedQuantity && requestedQuantity > 0 && moq > requestedQuantity) {
      const excessUnits = moq - requestedQuantity;
      const excessRatio = excessUnits / requestedQuantity;
      moqWarning = {
        minimumOrder: moq,
        requestedQuantity,
        excessUnits,
        excessRatio,
      };
      // Scale penalty with excess ratio, cap at -25 to avoid eliminating
      // the offer outright (MOQ is negotiable on many contracts).
      const penalty = Math.min(25, Math.round(excessRatio * 20));
      total -= penalty;
    }

    return {
      ...offer,
      scores: { consistency, availability, leadTime, price, reputation, total },
      badges: [],
      isRecommended: false,
      moqWarning,
    };
  });

  // Sort by total descending
  scored.sort((a, b) => b.scores.total - a.scores.total);

  // Assign badges
  assignBadges(scored);

  return scored;
}
