/**
 * Sanitize user input before interpolating into PostgREST .or() filter strings.
 * Strips characters that have special meaning in PostgREST filter syntax:
 * - , (separates filter conditions)
 * - ( ) (group conditions)
 * - ' (string delimiters)
 * - \ (escape character)
 */
export function sanitizePostgrest(input: string): string {
  return input.replace(/[,()'\\]/g, "");
}
