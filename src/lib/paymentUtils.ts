import { supabase } from "@/integrations/supabase/client";

// ── Payment Reference & Invoice Generators ──────────────────────────────────

/** Generate unique sequential payment reference via DB sequence: TRS-2026-000001 */
export async function generatePaymentReference(): Promise<string> {
  const { data, error } = await supabase.rpc("next_payment_reference" as any);
  if (!error && data) return String(data);
  // Fallback: client-side generation (should not happen in production)
  console.warn("DB sequence unavailable for payment reference, using fallback");
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TRS-${year}-${random}`;
}

/** Generate unique sequential invoice number via DB sequence: INV-202603-00001 */
export async function generateInvoiceNumber(): Promise<string> {
  const { data, error } = await supabase.rpc("next_invoice_number" as any);
  if (!error && data) return String(data);
  // Fallback: client-side generation (should not happen in production)
  console.warn("DB sequence unavailable for invoice number, using fallback");
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${year}${month}-${random}`;
}
