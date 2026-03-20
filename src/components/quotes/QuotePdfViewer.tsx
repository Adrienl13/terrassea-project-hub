import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Download, CheckCircle2, Clock, Loader2, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  listQuoteDocuments,
  getDocumentUrl,
  type QuoteDocument,
} from "@/lib/quoteDocuments";

/**
 * QuotePdfViewer — used by clients to view and download quote PDFs.
 * Shows document status (uploaded, signed, etc.)
 */
export default function QuotePdfViewer({
  quoteRequestId,
}: {
  quoteRequestId: string;
}) {
  const { t } = useTranslation();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["quote-documents", quoteRequestId],
    queryFn: () => listQuoteDocuments(quoteRequestId),
  });

  const handleDownload = async (doc: QuoteDocument) => {
    setDownloadingId(doc.id);
    try {
      const url = await getDocumentUrl(doc.file_path);
      if (url) {
        window.open(url, "_blank");
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  const docTypeLabels: Record<string, string> = {
    quote_pdf: t("qpdf.typeQuote"),
    signed_pdf: t("qpdf.typeSigned"),
    invoice: t("qpdf.typeInvoice"),
    delivery_note: t("qpdf.typeDelivery"),
    other: t("qpdf.typeOther"),
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-[11px] font-body text-muted-foreground">{t("qpdf.loading")}</span>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-gray-50 border border-border">
        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
        <div>
          <p className="text-[11px] font-display font-semibold text-foreground">{t("qpdf.noPdf")}</p>
          <p className="text-[10px] font-body text-muted-foreground">{t("qpdf.noPdfHint")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between px-4 py-3 border border-border rounded-xl hover:border-foreground/15 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              doc.signed_at ? "bg-emerald-50" : "bg-red-50"
            }`}>
              {doc.signed_at ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <FileText className="h-5 w-5 text-red-600" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-display font-semibold text-foreground truncate">{doc.file_name}</p>
                <span className="text-[8px] font-display font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 shrink-0">
                  {docTypeLabels[doc.doc_type] || doc.doc_type}
                </span>
              </div>
              <p className="text-[10px] font-body text-muted-foreground">
                {formatSize(doc.file_size)}
                {doc.file_size ? " · " : ""}
                {new Date(doc.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                {doc.signed_at && (
                  <span className="text-emerald-600 font-semibold ml-1.5">
                    · {t("qpdf.signedOn")} {new Date(doc.signed_at).toLocaleDateString("fr-FR")}
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={() => handleDownload(doc)}
            disabled={downloadingId === doc.id}
            className="flex items-center gap-1.5 text-[11px] font-display font-semibold text-[#D4603A] hover:underline shrink-0 ml-3"
          >
            {downloadingId === doc.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {t("qpdf.view")}
          </button>
        </div>
      ))}
    </div>
  );
}
