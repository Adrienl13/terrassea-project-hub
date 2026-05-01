// ============================================================================
// Product variants — domain types, zod schemas, defaults, helpers
// Created during chantier Modèle B variants — ÉTAPE 3 (2026-05-01).
//
// Companion DB table: public.product_variants (migration
// 20260501123138_create_product_variants).
//
// Used by:
//   - Partner-dashboard variant grid editor (ÉTAPE 7)
//   - Admin product review variant tab (ÉTAPE 8)
//   - Public product detail variant selector (ÉTAPE 9)
//   - Variant migration backfill (ÉTAPE 4)
//
// Pattern aligned with src/components/products/specs/shared/types.ts.
// ============================================================================

import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

// ── Re-exports of supabase types under semantic names ───────────────────────

export type DBProductVariant = Database["public"]["Tables"]["product_variants"]["Row"];
export type DBProductVariantInsert = Database["public"]["Tables"]["product_variants"]["Insert"];
export type DBProductVariantUpdate = Database["public"]["Tables"]["product_variants"]["Update"];

// ── Shape enums (mirror DB CHECK constraints) ────────────────────────────────

export const VARIANT_SHAPES = [
  "round",
  "square",
  "rectangle",
  "oval",
  "asymmetric",
  "modular",
] as const;
export type VariantShape = (typeof VARIANT_SHAPES)[number];

export const VARIANT_SUBDIVISIONS = ["counter", "bar", "tall", "unknown"] as const;
export type VariantSubdivision = (typeof VARIANT_SUBDIVISIONS)[number];

export const VARIANT_SOURCE_TYPES = [
  "pim",
  "pdf-extraction",
  "web-scraping",
  "csv-import",
  "manual",
] as const;
export type VariantSourceType = (typeof VARIANT_SOURCE_TYPES)[number];

// ── Draft schema (client-side validation) ────────────────────────────────────
//
// Looser than the DB constraints (which catch the rest at INSERT). Captures
// the structural shape and the bounds we want surfaced to the user as form
// errors. Uses .nullable().optional() for fields that the form may leave
// untouched on a fresh draft.

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export const productVariantDraftSchema = z
  .object({
    product_id: z.string().uuid(),

    // Identifiants commerciaux
    sku: z.string().max(100).nullable().optional(),
    variant_name: z.string().max(200).nullable().optional(),

    // Dimensions (numeric(6,1) → max 99999.9)
    width_cm: z.number().min(0).max(99999.9).nullable().optional(),
    depth_cm: z.number().min(0).max(99999.9).nullable().optional(),
    height_cm: z.number().min(0).max(99999.9).nullable().optional(),
    diameter_cm: z.number().min(0).max(99999.9).nullable().optional(),
    shape: z.enum(VARIANT_SHAPES).nullable().optional(),
    weight_kg: z.number().min(0).max(9999.99).nullable().optional(),

    // Tissu / matériau
    material_brand_id: z.string().uuid().nullable().optional(),
    fabric_color_slug: z.string().nullable().optional(),
    fabric_color_hex: z.string().regex(HEX_COLOR).nullable().optional(),

    // Structure
    frame_finish_slug: z.string().nullable().optional(),

    // Configuration spécifique
    configuration_module: z.string().nullable().optional(),
    subdivision: z.enum(VARIANT_SUBDIVISIONS).nullable().optional(),

    // Options
    has_armrests: z.boolean().nullable().optional(),
    has_wheels: z.boolean().optional(),
    has_cushion: z.boolean().optional(),
    is_stackable: z.boolean().optional(),

    // Pricing
    price_eur: z.number().min(0).nullable().optional(),
    price_currency: z.string().length(3).optional(),
    in_stock: z.boolean().optional(),
    stock_quantity: z.number().int().min(0).nullable().optional(),
    delivery_weeks_min: z.number().int().min(0).nullable().optional(),
    delivery_weeks_max: z.number().int().min(0).nullable().optional(),
    is_made_to_order: z.boolean().optional(),

    // Disponibilité géographique
    available_in_markets: z.array(z.string().min(2).max(3)).nullable().optional(),

    // Méta
    is_published: z.boolean().optional(),
    is_default: z.boolean().optional(),
    primary_media_id: z.string().uuid().nullable().optional(),

    // Source IA (optionnel Phase 1)
    source_type: z.enum(VARIANT_SOURCE_TYPES).nullable().optional(),
    source_url: z.string().url().nullable().optional(),
    confidence_score: z.number().min(0).max(1).nullable().optional(),
  })
  .refine(
    (v) =>
      v.delivery_weeks_min == null ||
      v.delivery_weeks_max == null ||
      v.delivery_weeks_max >= v.delivery_weeks_min,
    { path: ["delivery_weeks_max"], message: "delivery_max_below_min" },
  );

export type ProductVariantDraft = z.infer<typeof productVariantDraftSchema>;

// ── Defaults ─────────────────────────────────────────────────────────────────

/**
 * Defaults for a brand-new variant draft about to be inserted.
 * Caller MUST provide product_id (no sensible default).
 */
export function defaultProductVariantDraft(productId: string): ProductVariantDraft {
  return {
    product_id: productId,
    sku: null,
    variant_name: null,
    width_cm: null,
    depth_cm: null,
    height_cm: null,
    diameter_cm: null,
    shape: null,
    weight_kg: null,
    material_brand_id: null,
    fabric_color_slug: null,
    fabric_color_hex: null,
    frame_finish_slug: null,
    configuration_module: null,
    subdivision: null,
    has_armrests: null,
    has_wheels: false,
    has_cushion: false,
    is_stackable: false,
    price_eur: null,
    price_currency: "EUR",
    in_stock: false,
    stock_quantity: null,
    delivery_weeks_min: null,
    delivery_weeks_max: null,
    is_made_to_order: false,
    available_in_markets: null,
    is_published: false,
    is_default: false,
    primary_media_id: null,
    source_type: "manual",
    source_url: null,
    confidence_score: null,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the default variant of a list, or the first one if none flagged. */
export function defaultVariantOf<T extends Pick<DBProductVariant, "is_default">>(
  variants: readonly T[],
): T | null {
  if (variants.length === 0) return null;
  return variants.find((v) => v.is_default) ?? variants[0];
}

/** Variant is publicly visible if it's published and not discontinued. */
export function isVariantPublished(v: Pick<DBProductVariant, "is_published" | "discontinued_at">): boolean {
  return v.is_published === true && v.discontinued_at == null;
}

/**
 * Variant is "available" if in stock OR explicitly made-to-order.
 * Used by stock badges and engine availability filters.
 */
export function isVariantAvailable(
  v: Pick<DBProductVariant, "in_stock" | "is_made_to_order" | "discontinued_at">,
): boolean {
  if (v.discontinued_at != null) return false;
  return v.in_stock === true || v.is_made_to_order === true;
}

/**
 * Best-effort dimension label for a variant (used in variant pickers).
 * Returns null when no dimensions are set.
 */
export function variantDimensionLabel(
  v: Pick<DBProductVariant, "width_cm" | "depth_cm" | "height_cm" | "diameter_cm">,
): string | null {
  if (v.diameter_cm != null) return `Ø ${v.diameter_cm} cm`;
  const dims: string[] = [];
  if (v.width_cm != null) dims.push(`${v.width_cm}`);
  if (v.depth_cm != null) dims.push(`${v.depth_cm}`);
  if (v.height_cm != null) dims.push(`${v.height_cm}`);
  return dims.length > 0 ? `${dims.join(" × ")} cm` : null;
}
