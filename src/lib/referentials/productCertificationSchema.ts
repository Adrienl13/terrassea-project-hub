// ============================================================================
// productCertificationSchema — zod schema for product-level certifications
// ÉTAPE 8d-5 (2026-05-05).
//
// Validates a product_certifications form payload. Used by the future
// partner-dashboard product form (Phase 8e) and admin overrides.
// PV (procès-verbal) metadata fields : pv_number + lab_name + pv_document_url.
// ============================================================================

import { z } from "zod";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const productCertificationSchema = z.object({
  product_id: z.string().uuid(),
  certification_id: z.string().uuid(),
  pv_number: z.string().max(200).nullable().optional(),
  lab_name: z.string().max(200).nullable().optional(),
  issued_at: z
    .string()
    .regex(ISO_DATE, "Date format YYYY-MM-DD attendu")
    .nullable()
    .optional(),
  valid_until: z
    .string()
    .regex(ISO_DATE, "Date format YYYY-MM-DD attendu")
    .nullable()
    .optional(),
  pv_document_url: z
    .string()
    .url("URL valide requise (https://...)")
    .nullable()
    .optional()
    .or(z.literal("")),
  notes: z.string().max(2000).nullable().optional(),
});

export type ProductCertificationInput = z.infer<typeof productCertificationSchema>;
