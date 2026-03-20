import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Upload, FileText, Trash2, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  uploadQuotePdf,
  listQuoteDocuments,
  deleteQuoteDocument,
  type QuoteDocument,
} from "@/lib/quoteDocuments";
import { generateQuoteReference, type CoverPageData } from "@/lib/pdfCoverPage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * QuotePdfUploader — used by partners to upload a quote PDF for a specific quote request.
 * Automatically adds a Terrassea cover page with masked supplier info.
 */
export default function QuotePdfUploader({
  quoteRequestId,
  projectName = "",
  productName = "",
  quantity = 0,
  supplierAlias = "Partenaire vérifié",
  totalAmount = "",
  validUntil = "",
}: {
  quoteRequestId: string;
  projectName?: string;
  productName?: string;
  quantity?: number;
  supplierAlias?: string;
  totalAmount?: string;
  validUntil?: string;
}) {
  const { t } = useTranslation();
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // Fetch existing documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["quote-documents", quoteRequestId],
    queryFn: () => listQuoteDocuments(quoteRequestId),
  });

  // Upload mutation — automatically adds Terrassea cover page
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Not authenticated");

      // Build cover page data
      const coverPageData: CoverPageData = {
        referenceNumber: generateQuoteReference(),
        projectName: projectName || "—",
        productName: productName || "—",
        quantity,
        supplierAlias,
        date: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
        validUntil: validUntil || new Date(Date.now() + 30 * 86400000).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
        totalAmount: totalAmount || "Sur devis",
      };

      const result = await uploadQuotePdf({
        file,
        quoteRequestId,
        uploaderId: user.id,
        uploaderType: (profile?.user_type as "partner" | "admin") || "partner",
        docType: "quote_pdf",
        coverPageData,
      });
      if (result.error) throw new Error(result.error);
      return result.document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quote-documents", quoteRequestId] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (doc: QuoteDocument) => {
      const result = await deleteQuoteDocument(doc.id, doc.file_path);
      if (result.error) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quote-documents", quoteRequestId] });
    },
  });

  const handleFile = (file: File) => {
    if (file.type !== "application/pdf") return;
    uploadMutation.mutate(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-display font-semibold text-foreground">
        {t("qpdf.title")}
      </p>

      {/* Existing documents */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between px-3 py-2.5 border border-border rounded-lg"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded bg-red-50 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-red-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-display font-semibold text-foreground truncate">{doc.file_name}</p>
                  <p className="text-[9px] font-body text-muted-foreground">
                    {formatSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString("fr-FR")}
                    {doc.signed_at && (
                      <span className="ml-1.5 text-emerald-600 font-semibold">
                        <CheckCircle2 className="h-2.5 w-2.5 inline mr-0.5" />{t("qpdf.signed")}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {!doc.signed_at && (
                <button
                  onClick={() => deleteMutation.mutate(doc)}
                  disabled={deleteMutation.isPending}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-[#D4603A] bg-[#D4603A]/5"
            : "border-border hover:border-foreground/20 hover:bg-card"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />

        {uploadMutation.isPending ? (
          <div className="flex flex-col items-center">
            <Loader2 className="h-6 w-6 text-[#D4603A] animate-spin mb-2" />
            <p className="text-[11px] font-body text-muted-foreground">{t("qpdf.uploading")}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className="h-6 w-6 text-muted-foreground/40 mb-2" />
            <p className="text-[11px] font-display font-semibold text-foreground">{t("qpdf.dropHere")}</p>
            <p className="text-[9px] font-body text-muted-foreground mt-0.5">{t("qpdf.pdfOnly")}</p>
          </div>
        )}
      </div>

      {/* Error */}
      {uploadMutation.isError && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
          <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
          <p className="text-[10px] font-body text-red-700">{(uploadMutation.error as Error).message}</p>
        </div>
      )}

      {/* Success */}
      {uploadMutation.isSuccess && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <p className="text-[10px] font-body text-emerald-700">{t("qpdf.uploadSuccess")}</p>
        </div>
      )}
    </div>
  );
}
