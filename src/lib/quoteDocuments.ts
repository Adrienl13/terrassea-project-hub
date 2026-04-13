import { supabase } from "@/integrations/supabase/client";
// pdf-lib is heavy — import dynamically only when actually generating a cover page
import type { CoverPageData } from "./pdfCoverPage";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface QuoteDocument {
  id: string;
  created_at: string;
  quote_request_id: string;
  uploaded_by: string;
  uploader_type: "partner" | "admin" | "client";
  file_path: string;
  file_name: string;
  file_size: number | null;
  doc_type: "quote_pdf" | "signed_pdf" | "invoice" | "delivery_note" | "other";
  signed_at: string | null;
  signed_by: string | null;
  signature_provider: string | null;
  signature_reference: string | null;
}

// ── Upload a quote PDF ─────────────────────────────────────────────────────────

export async function uploadQuotePdf({
  file,
  quoteRequestId,
  uploaderId,
  uploaderType,
  docType = "quote_pdf",
  coverPageData,
}: {
  file: File;
  quoteRequestId: string;
  uploaderId: string;
  uploaderType: "partner" | "admin" | "client";
  docType?: QuoteDocument["doc_type"];
  coverPageData?: CoverPageData;
}): Promise<{ document: QuoteDocument | null; error: string | null }> {
  // Validate file
  if (file.type !== "application/pdf") {
    return { document: null, error: "Seuls les fichiers PDF sont acceptés." };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { document: null, error: "Le fichier ne doit pas dépasser 10 Mo." };
  }

  // Generate unique file path
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

  // Prepare the PDF: add cover page if data provided (for quote_pdf type)
  let pdfToUpload: Blob | File = file;
  let finalFileName = file.name;

  if (coverPageData && docType === "quote_pdf") {
    try {
      const originalBytes = await file.arrayBuffer();
      const { addCoverPageToPdf } = await import("./pdfCoverPage");
      const mergedBytes = await addCoverPageToPdf(originalBytes, coverPageData);
      pdfToUpload = new Blob([mergedBytes], { type: "application/pdf" });
      finalFileName = `TRS_${coverPageData.referenceNumber}_${safeName}`;
    } catch (err) {
      console.error("Cover page generation failed, uploading original:", err);
      // Fall back to original file if cover page generation fails
    }
  }

  // Also store the original (unmodified) PDF for internal records
  const filePath = `${quoteRequestId}/${timestamp}_${finalFileName}`;
  const originalPath = coverPageData
    ? `${quoteRequestId}/${timestamp}_original_${safeName}`
    : null;

  // Upload the merged PDF (with cover page)
  const { error: uploadError } = await supabase.storage
    .from("quote-documents")
    .upload(filePath, pdfToUpload, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    return { document: null, error: uploadError.message };
  }

  // Also upload the original for internal audit (partner's raw PDF)
  if (originalPath) {
    await supabase.storage
      .from("quote-documents")
      .upload(originalPath, file, {
        contentType: "application/pdf",
        upsert: false,
      });
  }

  // Insert document reference
  const { data, error: insertError } = await supabase
    .from("quote_documents")
    .insert({
      quote_request_id: quoteRequestId,
      uploaded_by: uploaderId,
      uploader_type: uploaderType,
      file_path: filePath,
      file_name: finalFileName,
      file_size: (pdfToUpload as Blob).size || file.size,
      doc_type: docType,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Insert error:", insertError);
    // Cleanup uploaded files
    await supabase.storage.from("quote-documents").remove([filePath]);
    if (originalPath) await supabase.storage.from("quote-documents").remove([originalPath]);
    return { document: null, error: insertError.message };
  }

  // Update quote_requests with latest PDF path
  if (docType === "quote_pdf") {
    const { error: updateError } = await supabase
      .from("quote_requests")
      .update({ latest_pdf_path: filePath })
      .eq("id", quoteRequestId);
    if (updateError) {
      console.error("Failed to update quote_requests latest_pdf_path:", updateError.message);
    }
  }

  return { document: data as QuoteDocument, error: null };
}

// ── Get download URL for a document ────────────────────────────────────────────

export async function getDocumentUrl(filePath: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from("quote-documents")
    .createSignedUrl(filePath, 3600); // 1h expiry

  return data?.signedUrl ?? null;
}

// ── List documents for a quote ─────────────────────────────────────────────────

export async function listQuoteDocuments(
  quoteRequestId: string
): Promise<QuoteDocument[]> {
  const { data, error } = await supabase
    .from("quote_documents")
    .select("*")
    .eq("quote_request_id", quoteRequestId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("List documents error:", error);
    return [];
  }
  return (data ?? []) as QuoteDocument[];
}

// ── Mark a document as signed ──────────────────────────────────────────────────

export async function signDocument({
  documentId,
  signedBy,
  provider = "platform",
  reference,
}: {
  documentId: string;
  signedBy: string;
  provider?: string;
  reference?: string;
}): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from("quote_documents")
    .update({
      signed_at: new Date().toISOString(),
      signed_by: signedBy,
      signature_provider: provider,
      signature_reference: reference || null,
    })
    .eq("id", documentId);

  if (error) {
    console.error("Sign error:", error);
    return { success: false, error: error.message };
  }

  // Also update the quote_request
  const { data: doc } = await supabase
    .from("quote_documents")
    .select("quote_request_id, file_path")
    .eq("id", documentId)
    .single();

  if (doc) {
    const { error: updateError } = await supabase
      .from("quote_requests")
      .update({
        signed_pdf_path: doc.file_path,
        signed_at: new Date().toISOString(),
        signed_by: signedBy,
        status: "signed",
      })
      .eq("id", doc.quote_request_id);
    if (updateError) {
      console.error("Failed to update quote_request after signing:", updateError.message);
    }
  }

  return { success: true, error: null };
}

// ── Sign a quote request (finds latest document or updates request directly) ──

export async function signQuoteRequest({
  quoteRequestId,
  signedBy,
  provider = "platform",
  reference,
}: {
  quoteRequestId: string;
  signedBy: string;
  provider?: string;
  reference?: string;
}): Promise<{ success: boolean; error: string | null }> {
  const now = new Date().toISOString();

  // Try to find the latest document for this quote request
  const { data: docs } = await supabase
    .from("quote_documents")
    .select("id, file_path")
    .eq("quote_request_id", quoteRequestId)
    .eq("doc_type", "quote_pdf")
    .order("created_at", { ascending: false })
    .limit(1);

  // Sign the document if one exists
  if (docs && docs.length > 0) {
    const doc = docs[0];
    await supabase
      .from("quote_documents")
      .update({
        signed_at: now,
        signed_by: signedBy,
        signature_provider: provider,
        signature_reference: reference || null,
      })
      .eq("id", doc.id);

    // Update quote_request with signed PDF path
    const { error: updateError } = await supabase
      .from("quote_requests")
      .update({
        signed_pdf_path: doc.file_path,
        signed_at: now,
        signed_by: signedBy,
        status: "signed",
      })
      .eq("id", quoteRequestId);

    if (updateError) {
      console.error("Failed to update quote_request after signing:", updateError.message);
      return { success: false, error: updateError.message };
    }
  } else {
    // No document yet — just update the quote request status
    const { error: updateError } = await supabase
      .from("quote_requests")
      .update({
        signed_at: now,
        signed_by: signedBy,
        status: "signed",
      })
      .eq("id", quoteRequestId);

    if (updateError) {
      console.error("Failed to sign quote_request:", updateError.message);
      return { success: false, error: updateError.message };
    }
  }

  return { success: true, error: null };
}

// ── Delete a document ──────────────────────────────────────────────────────────

export async function deleteQuoteDocument(
  documentId: string,
  filePath: string
): Promise<{ success: boolean; error: string | null }> {
  // Get the quote_request_id before deleting
  const { data: doc } = await supabase
    .from("quote_documents")
    .select("quote_request_id")
    .eq("id", documentId)
    .single();

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from("quote-documents")
    .remove([filePath]);

  if (storageError) {
    console.error("Storage delete error:", storageError);
    return { success: false, error: storageError.message };
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from("quote_documents")
    .delete()
    .eq("id", documentId);

  if (dbError) {
    console.error("DB delete error:", dbError);
    return { success: false, error: dbError.message };
  }

  // Clear latest_pdf_path on the quote_request if it pointed to this file
  if (doc?.quote_request_id) {
    await supabase
      .from("quote_requests")
      .update({ latest_pdf_path: null })
      .eq("id", doc.quote_request_id)
      .eq("latest_pdf_path", filePath);
  }

  return { success: true, error: null };
}

// ── PDF access gate (client-side check) ────────────────────────────────────────

export type PdfAccessReason = "not_signed" | "deposit_pending" | "accessible";

export async function canClientAccessPdf(quoteRequestId: string): Promise<{
  canAccess: boolean;
  reason: PdfAccessReason;
}> {
  const { data: qr } = await supabase
    .from("quote_requests")
    .select("signed_at")
    .eq("id", quoteRequestId)
    .single();

  if (!qr?.signed_at) return { canAccess: false, reason: "not_signed" };

  const { data: order } = await supabase
    .from("orders")
    .select("deposit_paid_at")
    .eq("quote_request_id", quoteRequestId)
    .maybeSingle();

  if (!order?.deposit_paid_at) return { canAccess: false, reason: "deposit_pending" };

  return { canAccess: true, reason: "accessible" };
}
