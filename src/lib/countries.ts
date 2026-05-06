// ============================================================================
// countries — single source of truth for country dropdowns across the app.
//
// Provides ISO 3166-1 alpha-2 codes + English & French display names
// (extended Dette 38, 2026-05-06 to support partner + client profile forms).
// ============================================================================

interface SupportedCountry {
  /** ISO 3166-1 alpha-2 code (FR, IT, ES, …). */
  code: string;
  /** English display name. */
  name: string;
  /** French display name (for FR-first UI per CLAUDE.md). */
  name_fr: string;
}

/** ISO 2-letter codes for countries supported on the platform. */
export const SUPPORTED_COUNTRIES: readonly SupportedCountry[] = [
  { code: "FR", name: "France",         name_fr: "France" },
  { code: "BE", name: "Belgium",        name_fr: "Belgique" },
  { code: "CH", name: "Switzerland",    name_fr: "Suisse" },
  { code: "LU", name: "Luxembourg",     name_fr: "Luxembourg" },
  { code: "MC", name: "Monaco",         name_fr: "Monaco" },
  { code: "IT", name: "Italy",          name_fr: "Italie" },
  { code: "ES", name: "Spain",          name_fr: "Espagne" },
  { code: "PT", name: "Portugal",       name_fr: "Portugal" },
  { code: "DE", name: "Germany",        name_fr: "Allemagne" },
  { code: "NL", name: "Netherlands",    name_fr: "Pays-Bas" },
  { code: "GB", name: "United Kingdom", name_fr: "Royaume-Uni" },
  { code: "DK", name: "Denmark",        name_fr: "Danemark" },
  { code: "SE", name: "Sweden",         name_fr: "Suède" },
  { code: "GR", name: "Greece",         name_fr: "Grèce" },
  { code: "AT", name: "Austria",        name_fr: "Autriche" },
  { code: "PL", name: "Poland",         name_fr: "Pologne" },
  { code: "TR", name: "Turkey",         name_fr: "Turquie" },
] as const;

export type CountryCode = (typeof SUPPORTED_COUNTRIES)[number]["code"];

const CODE_TO_NAME = new Map(SUPPORTED_COUNTRIES.map((c) => [c.code, c.name]));
const CODE_TO_NAME_FR = new Map(SUPPORTED_COUNTRIES.map((c) => [c.code, c.name_fr]));
const NAME_TO_CODE = new Map(SUPPORTED_COUNTRIES.map((c) => [c.name, c.code]));
const NAME_FR_TO_CODE = new Map(SUPPORTED_COUNTRIES.map((c) => [c.name_fr, c.code]));

/** "FR" → "France" (English label) */
export function countryName(code: string): string | undefined {
  return CODE_TO_NAME.get(code);
}

/** "FR" → "France" (French label, for FR-first UI). */
export function countryNameFr(code: string): string | undefined {
  return CODE_TO_NAME_FR.get(code);
}

/** "France" → "FR" (matches both English and French names). */
export function countryCode(name: string): string | undefined {
  return NAME_TO_CODE.get(name) ?? NAME_FR_TO_CODE.get(name);
}

/** Map navigator.language prefix to ISO country code (best guess). */
const LANG_TO_COUNTRY: Record<string, string> = {
  fr: "FR", it: "IT", es: "ES", de: "DE", pt: "PT",
  nl: "NL", da: "DK", sv: "SE", el: "GR", pl: "PL",
};

export function langToCountry(lang: string): string | null {
  const prefix = lang.split("-")[0].toLowerCase();
  return LANG_TO_COUNTRY[prefix] ?? null;
}
