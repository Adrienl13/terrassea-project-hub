// ── Single source of truth for partner types, modes, and plans ─────────────

/**
 * partner_type — What the partner IS.
 * Stored as TEXT in DB (partners.partner_type column).
 */
export const PARTNER_TYPES = [
  "manufacturer",
  "brand",
  "reseller",
  "distributor",
  "designer",
] as const;

export type PartnerType = (typeof PARTNER_TYPES)[number];

/** Types eligible as distributors in a brand network */
export const DISTRIBUTOR_ELIGIBLE_TYPES: PartnerType[] = [
  "reseller",
  "distributor",
  "manufacturer",
];

/**
 * partner_mode — Service level for brand partners.
 * Only meaningful when partner_type = "brand".
 */
export const PARTNER_MODES = ["standard", "brand_member", "brand_network"] as const;
export type PartnerMode = (typeof PARTNER_MODES)[number];

/** Modes that require partner_type = "brand" */
export const BRAND_ONLY_MODES: PartnerMode[] = ["brand_member", "brand_network"];

/**
 * plan — Subscription plan determining commission and limits.
 */
export const PARTNER_PLANS = ["starter", "growth", "elite", "brand_member", "brand_network"] as const;
export type PartnerPlan = (typeof PARTNER_PLANS)[number];

/** Commission rates by plan (%) */
export const COMMISSION_BY_PLAN: Record<PartnerPlan, number> = {
  starter: 8,
  growth: 5,
  elite: 3.5,
  brand_member: 0,
  brand_network: 0,
};

/** Product limits by plan */
export const MAX_PRODUCTS_BY_PLAN: Record<PartnerPlan, number> = {
  starter: 30,
  growth: 50,
  elite: 150,
  brand_member: 999,
  brand_network: 999,
};

/**
 * Display labels for partner types (used in admin forms, selects).
 * For client-facing i18n labels, use t(`partners.type${capitalize(type)}`).
 */
export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  manufacturer: "Fabricant",
  brand: "Marque",
  reseller: "Revendeur / Distributeur",
  distributor: "Distributeur",
  designer: "Designer / Architecte",
};

/** Normalize legacy or variant type names to canonical PartnerType */
export function normalizePartnerType(raw: string | null | undefined): PartnerType {
  if (!raw) return "manufacturer";
  const lower = raw.trim().toLowerCase();
  if (lower === "wholesaler" || lower === "retailer") return "reseller";
  if (PARTNER_TYPES.includes(lower as PartnerType)) return lower as PartnerType;
  return "manufacturer";
}
