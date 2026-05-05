// ============================================================================
// referentialSchema — pure types + zod schemas for ReferentialCRUD
// ÉTAPE 8b (2026-05-05).
//
// Extracted from the React component file to keep
// react-refresh/only-export-components happy.
// ============================================================================

import { z } from "zod";

export interface I18nText {
  en?: string;
  fr?: string;
  it?: string;
  es?: string;
}

export interface ReferentialRow {
  id: string;
  slug: string;
  name: string;
  category: string;
  description_i18n: I18nText | null;
  logo_url: string | null;
  official_website: string | null;
  created_at: string;
  updated_at: string;
  [extraField: string]: unknown;
}

export interface FKReference {
  /** Foreign table that references this referential (e.g. 'product_variants'). */
  table: string;
  /** Column on the foreign table holding the FK (e.g. 'material_brand_id'). */
  column: string;
  /** Human-readable label for blocking message (e.g. 'variants'). */
  label: string;
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateSlugFormat(slug: string): boolean {
  return SLUG_REGEX.test(slug);
}

export const baseReferentialSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug requis")
    .regex(SLUG_REGEX, "Slug : minuscules, chiffres, tirets seulement"),
  name: z.string().min(1, "Nom requis"),
  category: z.string().min(1, "Catégorie requise"),
  description_i18n: z
    .object({
      en: z.string().optional(),
      fr: z.string().optional(),
      it: z.string().optional(),
      es: z.string().optional(),
    })
    .nullable()
    .optional(),
  logo_url: z
    .string()
    .regex(/^https?:\/\//, "URL doit commencer par http:// ou https://")
    .nullable()
    .optional()
    .or(z.literal("")),
  official_website: z
    .string()
    .regex(/^https?:\/\//, "URL doit commencer par http:// ou https://")
    .nullable()
    .optional()
    .or(z.literal("")),
});
