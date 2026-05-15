// SHA-256 helper for client-side file hashing.
// Used by CGV upload flow to fingerprint partner GCS PDFs before sending
// to Supabase Storage. Server-side check is not strictly required for v1
// (the DB CHECK on length 64 is just a sanity guard) — the sha256 value
// is a snapshot fingerprint for later integrity verification.

export async function computeFileSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
