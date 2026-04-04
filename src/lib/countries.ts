/** ISO 2-letter codes for countries supported on the platform. */
export const SUPPORTED_COUNTRIES = [
  { code: "FR", name: "France" },
  { code: "BE", name: "Belgium" },
  { code: "CH", name: "Switzerland" },
  { code: "LU", name: "Luxembourg" },
  { code: "MC", name: "Monaco" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "PT", name: "Portugal" },
  { code: "DE", name: "Germany" },
  { code: "NL", name: "Netherlands" },
  { code: "GB", name: "United Kingdom" },
  { code: "DK", name: "Denmark" },
  { code: "SE", name: "Sweden" },
  { code: "GR", name: "Greece" },
  { code: "AT", name: "Austria" },
  { code: "PL", name: "Poland" },
] as const;

export type CountryCode = (typeof SUPPORTED_COUNTRIES)[number]["code"];

const CODE_TO_NAME = new Map(SUPPORTED_COUNTRIES.map((c) => [c.code, c.name]));
const NAME_TO_CODE = new Map(SUPPORTED_COUNTRIES.map((c) => [c.name, c.code]));

/** "FR" → "France" */
export function countryName(code: string): string | undefined {
  return CODE_TO_NAME.get(code);
}

/** "France" ��� "FR" */
export function countryCode(name: string): string | undefined {
  return NAME_TO_CODE.get(name);
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
