// ============================================================================
// partnerCertificationSchema — zod schema for brand-level certifications
// ÉTAPE 8d-5 (2026-05-05).
//
// Validates a partner_certifications form payload. Used by the future
// partner-dashboard certifications form (Phase 8e) and admin overrides.
// ============================================================================

import { z } from "zod";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const partnerCertificationSchema = z.object({
  partner_id: z.string().uuid(),
  certification_id: z.string().uuid(),
  certificate_number: z.string().max(200).nullable().optional(),
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
  certificate_url: z
    .string()
    .url("URL valide requise (https://...)")
    .nullable()
    .optional()
    .or(z.literal("")),
  notes: z.string().max(2000).nullable().optional(),
});

export type PartnerCertificationInput = z.infer<typeof partnerCertificationSchema>;
