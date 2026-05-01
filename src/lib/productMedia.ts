// ============================================================================
// Product media — domain types, zod schemas, defaults, helpers
// Created during chantier Modèle B variants — ÉTAPE 3 (2026-05-01).
//
// Companion DB table: public.product_media (migration
// 20260501122940_create_product_media). Each row carries a media file
// (image / video / 3D model / document) attached to either a MODEL
// (product_id) or a VARIANT (variant_id), exclusively.
// ============================================================================

import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

// ── Re-exports of supabase types under semantic names ───────────────────────

export type DBProductMedia = Database["public"]["Tables"]["product_media"]["Row"];
export type DBProductMediaInsert = Database["public"]["Tables"]["product_media"]["Insert"];
export type DBProductMediaUpdate = Database["public"]["Tables"]["product_media"]["Update"];

// ── Kind enum (mirrors DB CHECK constraint) ──────────────────────────────────

export const PRODUCT_MEDIA_KINDS = ["image", "video", "model-3d", "document"] as const;
export type ProductMediaKind = (typeof PRODUCT_MEDIA_KINDS)[number];

// ── Draft schema (client-side validation) ────────────────────────────────────
//
// Enforces the XOR constraint client-side (mirrors the DB CHECK):
// exactly one of product_id / variant_id must be non-null.

export const productMediaDraftSchema = z
  .object({
    product_id: z.string().uuid().nullable().optional(),
    variant_id: z.string().uuid().nullable().optional(),
    kind: z.enum(PRODUCT_MEDIA_KINDS),
    url: z.string().url(),
    alt_text_i18n: z.record(z.string()).nullable().optional(),
    width_px: z.number().int().positive().nullable().optional(),
    height_px: z.number().int().positive().nullable().optional(),
    bytes: z.number().int().nonnegative().nullable().optional(),
    display_order: z.number().int().optional(),
    is_primary: z.boolean().optional(),
  })
  .refine(
    (m) => {
      const hasProduct = m.product_id != null;
      const hasVariant = m.variant_id != null;
      return (hasProduct && !hasVariant) || (!hasProduct && hasVariant);
    },
    {
      path: ["product_id"],
      message: "media_must_have_exactly_one_of_product_id_or_variant_id",
    },
  );

export type ProductMediaDraft = z.infer<typeof productMediaDraftSchema>;

// ── Defaults ─────────────────────────────────────────────────────────────────

export function defaultProductMediaDraft(
  owner: { product_id: string } | { variant_id: string },
  kind: ProductMediaKind = "image",
): ProductMediaDraft {
  const base = {
    kind,
    url: "",
    alt_text_i18n: null,
    width_px: null,
    height_px: null,
    bytes: null,
    display_order: 100,
    is_primary: false,
  };
  if ("product_id" in owner) {
    return { ...base, product_id: owner.product_id, variant_id: null };
  }
  return { ...base, variant_id: owner.variant_id, product_id: null };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the primary media of a list, or the first sorted by display_order. */
export function primaryMediaOf<T extends Pick<DBProductMedia, "is_primary" | "display_order">>(
  media: readonly T[],
): T | null {
  if (media.length === 0) return null;
  const flagged = media.find((m) => m.is_primary);
  if (flagged) return flagged;
  return [...media].sort((a, b) => (a.display_order ?? 100) - (b.display_order ?? 100))[0];
}

/** Filters media by kind. Stable ordering by display_order. */
export function mediaByKind<T extends Pick<DBProductMedia, "kind" | "display_order">>(
  media: readonly T[],
  kind: ProductMediaKind,
): T[] {
  return [...media]
    .filter((m) => m.kind === kind)
    .sort((a, b) => (a.display_order ?? 100) - (b.display_order ?? 100));
}

/** Returns true when this media row is attached to a variant (not a model). */
export function isVariantMedia(m: Pick<DBProductMedia, "variant_id">): boolean {
  return m.variant_id != null;
}
