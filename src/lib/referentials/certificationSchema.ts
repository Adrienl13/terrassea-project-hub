// ============================================================================
// certificationSchema — pure schema for certifications referential
// ÉTAPE 8c (2026-05-05).
//
// Certifications have no extra fields beyond the common ReferentialRow shape
// (no is_premium, no parent_company, no self-FK). Schema is a marker empty
// object kept for symmetry with materialBrandSchema and future extension.
// ============================================================================

import { z } from "zod";

export const CERTIFICATION_CATEGORIES = [
  "environmental",
  "origin",
  "quality",
  "safety",
] as const;

export const certificationExtraSchema = z.object({}).passthrough();

export type CertificationExtra = Record<string, never>;
