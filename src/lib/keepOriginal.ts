// ============================================================================
// Cold-archive the untouched original image — SIGNATURE maisons only.
//
// The display copy is compressed at upload (imageCompress). For signature-tier
// partners we additionally archive the raw original in the private
// `partner-originals` bucket (print / deep-zoom insurance). Manufactures don't
// archive (the 2560px display copy is enough). Best-effort: never blocks or
// fails the main upload. The partner's tier is cached per id so a bulk import
// triggers a single tier lookup, not one per photo.
// ============================================================================

import { supabase } from "@/integrations/supabase/client";

const tierCache = new Map<string, boolean>(); // partnerId → isSignature

async function isSignature(partnerId: string): Promise<boolean> {
  if (tierCache.has(partnerId)) return tierCache.get(partnerId)!;
  try {
    const { data } = await supabase
      .from("partners")
      .select("showcase_tier")
      .eq("id", partnerId)
      .maybeSingle();
    const sig = (data as { showcase_tier?: string } | null)?.showcase_tier === "signature";
    tierCache.set(partnerId, sig);
    return sig;
  } catch {
    return false;
  }
}

/**
 * Archives `file` (the untouched original) for signature-tier partners only.
 * Fire-and-forget friendly — swallows all errors.
 */
export async function keepOriginalForSignature(
  file: File,
  partnerId: string | null | undefined,
  hint = "img",
): Promise<void> {
  if (!partnerId || !file?.type?.startsWith("image/")) return;
  try {
    if (!(await isSignature(partnerId))) return;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${partnerId}/${hint}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    await supabase.storage.from("partner-originals").upload(path, file, { contentType: file.type });
  } catch {
    /* best-effort archive — never blocks the main upload */
  }
}
