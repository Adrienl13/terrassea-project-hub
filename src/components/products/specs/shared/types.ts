import { z } from "zod";
import { FABRIC_BRAND_SLUGS } from "@/engine/dictionaries/fabricBrands";

// ============================================================================
// Shared types and zod schemas for category-specific product specs
// Created during chantier vocab 2026 — see docs/chantiers/2026-05/PLAN_VOCAB_FIELDS.md
//
// Each specs section corresponds to a category; the schema enforces
// cross-field validation (e.g. umbrella_hole_diameter required when
// built_in_umbrella_hole is true).
// ============================================================================

// ── Tables ──────────────────────────────────────────────────────────────────

export const tableSpecsSchema = z
  .object({
    built_in_umbrella_hole: z.boolean(),
    umbrella_hole_diameter_mm: z.number().int().min(20).max(80).nullable(),
    top_thickness_cm: z.number().min(0.5).max(15).nullable(),
    is_tippable: z.boolean(),
    extension_capability: z.boolean(),
    extension_max_length_cm: z.number().int().min(80).max(400).nullable(),
    outdoor_anchor_compatible: z.boolean(),
  })
  .refine(
    (s) => !s.built_in_umbrella_hole || s.umbrella_hole_diameter_mm !== null,
    { path: ["umbrella_hole_diameter_mm"], message: "diameter_required" },
  )
  .refine(
    (s) => !s.extension_capability || s.extension_max_length_cm !== null,
    { path: ["extension_max_length_cm"], message: "extension_max_required" },
  );

export type TableSpecs = z.infer<typeof tableSpecsSchema>;

export const defaultTableSpecs: TableSpecs = {
  built_in_umbrella_hole: false,
  umbrella_hole_diameter_mm: null,
  top_thickness_cm: null,
  is_tippable: false,
  extension_capability: false,
  extension_max_length_cm: null,
  outdoor_anchor_compatible: false,
};

// ── Parasols ────────────────────────────────────────────────────────────────

export const parasolSpecsSchema = z.object({
  fabric_g_m2: z.number().int().min(150).max(450).nullable(),
  fabric_certification: z.enum(FABRIC_BRAND_SLUGS),
  min_base_weight_kg: z.number().int().min(15).max(150).nullable(),
  pole_diameter_mm: z.number().int().min(30).max(80).nullable(),
  heating_compatible: z.boolean(),
  wind_beaufort_max: z.number().int().min(0).max(12).nullable(),
});

export type ParasolSpecs = z.infer<typeof parasolSpecsSchema>;

export const defaultParasolSpecs: ParasolSpecs = {
  fabric_g_m2: null,
  fabric_certification: "Unknown",
  min_base_weight_kg: null,
  pole_diameter_mm: null,
  heating_compatible: false,
  wind_beaufort_max: null,
};

// ── Sun Loungers ────────────────────────────────────────────────────────────

export const sunLoungerSpecsSchema = z.object({
  cushion_quick_dry: z.boolean(),
  salt_water_resistance: z.boolean(),
  chlorine_resistance: z.boolean(),
  sand_drainage: z.boolean(),
  nesting_capacity: z.number().int().min(1).max(50).nullable(),
});

export type SunLoungerSpecs = z.infer<typeof sunLoungerSpecsSchema>;

export const defaultSunLoungerSpecs: SunLoungerSpecs = {
  cushion_quick_dry: false,
  salt_water_resistance: false,
  chlorine_resistance: false,
  sand_drainage: false,
  nesting_capacity: null,
};

// ── Sofas / Lounge Seating ──────────────────────────────────────────────────

/**
 * Strict union of sofa module types. Used inside the `available_modules`
 * jsonb column to constrain the array elements (validation enforced by zod
 * front-side — see PLAN_VOCAB_FIELDS §3.4 D3).
 */
export const SOFA_MODULES = [
  "corner",
  "central-1seat",
  "central-2seat",
  "chaise-left",
  "chaise-right",
  "ottoman",
  "pouf",
] as const;

export type SofaModule = (typeof SOFA_MODULES)[number];
export type AvailableModules = SofaModule[];

export const sofaSpecsSchema = z.object({
  available_modules: z.array(z.enum(SOFA_MODULES)),
  seat_depth_cm: z.number().min(30).max(120).nullable(),
  cushion_replacement_available: z.boolean(),
  acoustic_nrc: z.number().min(0).max(1).nullable(),
});

export type SofaSpecs = z.infer<typeof sofaSpecsSchema>;

export const defaultSofaSpecs: SofaSpecs = {
  available_modules: [],
  seat_depth_cm: null,
  cushion_replacement_available: false,
  acoustic_nrc: null,
};

// ── Bar Stools & High Tables — shared subdivision ──────────────────────────

/**
 * Strict union of subdivisions for bar stools and high tables.
 * Counter ≈ 65cm seat / 95cm top, bar ≈ 75cm / 105cm, tall ≈ 85cm / 115cm.
 */
export const SUBDIVISION_OPTIONS = ["counter", "bar", "tall", "unknown"] as const;
export type SubdivisionOption = (typeof SUBDIVISION_OPTIONS)[number];

/**
 * Recommended seat heights per subdivision (used for soft UI hints,
 * not enforced in the schema).
 */
export const SUBDIVISION_SEAT_HEIGHT_HINTS: Record<SubdivisionOption, number | null> = {
  counter: 65,
  bar: 75,
  tall: 85,
  unknown: null,
};

/** Tolerance (cm) before showing a soft mismatch warning. */
export const SUBDIVISION_HINT_TOLERANCE_CM = 5;

// ── Bar Stools ──────────────────────────────────────────────────────────────

export const barStoolSpecsSchema = z.object({
  seat_height_cm: z.number().min(40).max(95).nullable(),
  subdivision: z.enum(SUBDIVISION_OPTIONS),
  footrest: z.boolean(),
  swivel: z.boolean(),
});

export type BarStoolSpecs = z.infer<typeof barStoolSpecsSchema>;

export const defaultBarStoolSpecs: BarStoolSpecs = {
  seat_height_cm: null,
  subdivision: "unknown",
  footrest: false,
  swivel: false,
};

// ── High Tables ─────────────────────────────────────────────────────────────

export const highTableSpecsSchema = z.object({
  table_top_height_cm: z.number().min(60).max(130).nullable(),
  subdivision: z.enum(SUBDIVISION_OPTIONS),
});

export type HighTableSpecs = z.infer<typeof highTableSpecsSchema>;

export const defaultHighTableSpecs: HighTableSpecs = {
  table_top_height_cm: null,
  subdivision: "unknown",
};

// ── Generic props ───────────────────────────────────────────────────────────

export type SpecsSectionProps<T> = {
  value: T;
  onChange: (next: T) => void;
  errors?: Partial<Record<keyof T, string>>;
  disabled?: boolean;
};
