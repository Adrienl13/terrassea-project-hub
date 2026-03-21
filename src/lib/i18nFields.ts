import i18n from "i18next";

/**
 * Multilingual field helper.
 *
 * Convention: the base column (e.g. `description`) holds English content.
 * Translated columns are suffixed: `description_fr`, `description_es`, `description_it`.
 *
 * Usage:
 *   const desc = ml(partner, "description");
 *   const name = ml(product, "name");
 */

type SupportedLang = "fr" | "es" | "it";
const SUFFIX_LANGS: SupportedLang[] = ["fr", "es", "it"];

/**
 * Returns the localised value of a field with automatic fallback to English.
 *
 * @param row  - A database row object (partner, product, etc.)
 * @param field - The base field name in English (e.g. "description", "name")
 * @returns The translated value if available, otherwise the English fallback
 */
export function ml<T extends Record<string, unknown>>(
  row: T,
  field: string,
): string {
  const lang = i18n.language?.slice(0, 2) as string;

  // Try localised column first (if not English)
  if (lang !== "en" && SUFFIX_LANGS.includes(lang as SupportedLang)) {
    const localisedKey = `${field}_${lang}`;
    const localised = row[localisedKey];
    if (typeof localised === "string" && localised.trim().length > 0) {
      return localised;
    }
  }

  // Fallback to base (English) column
  const base = row[field];
  return typeof base === "string" ? base : "";
}
