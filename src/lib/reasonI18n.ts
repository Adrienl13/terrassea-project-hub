import i18n from "i18next";

/**
 * Parse and translate a structured reason string from the engine.
 *
 * Format: "reason:key|param1:value1|param2:value2"
 * Falls back to the raw string if it doesn't match the format.
 *
 * Usage:
 *   const text = translateReason(product.reason);
 */
export function translateReason(reason: string): string {
  if (!reason.startsWith("reason:")) return reason;

  const parts = reason.split("|");
  const key = parts[0].replace("reason:", "");

  const params: Record<string, string> = {};
  for (let i = 1; i < parts.length; i++) {
    const [k, v] = parts[i].split(":");
    if (k && v) params[k] = v;
  }

  const translated = i18n.t(`reasons.${key}`, params);
  // If i18next returns the key itself (missing translation), use English fallback
  if (translated === `reasons.${key}`) {
    return reason.split("|").map(p => p.split(":")[1]).filter(Boolean).join(" · ");
  }
  return translated;
}
