// ============================================================================
// materialBrandSchema — pure schema + types for material_brands extra fields
// ÉTAPE 8b (2026-05-05).
// ============================================================================

import { z } from "zod";

export const MATERIAL_BRAND_CATEGORIES = [
  "composite",
  "fabric",
  "metal",
  "other",
  "wood",
] as const;

export const materialBrandExtraSchema = z.object({
  is_premium: z.boolean().default(false),
  is_proprietary: z.boolean().default(false),
  parent_company: z.string().nullable().optional(),
  parent_brand_id: z.string().uuid().nullable().optional(),
});

export type MaterialBrandExtra = z.infer<typeof materialBrandExtraSchema>;
