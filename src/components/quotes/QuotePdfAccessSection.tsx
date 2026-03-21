import { useState, useEffect, lazy, Suspense } from "react";
import { Lock, FileText, Clock, CheckCircle2, Download } from "lucide-react";
import { canClientAccessPdf, type PdfAccessReason } from "@/lib/quoteDocuments";

const QuotePdfViewer = lazy(() => import("./QuotePdfViewer"));

export default function QuotePdfAccessSection({
  quoteRequestId,
  status,
}: {
  quoteRequestId: string;
  status: string;
}) {
  const [access, setAccess] = useState<{ canAccess: boolean; reason: PdfAccessReason } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    canClientAccessPdf(quoteRequestId).then(result => {
      if (!cancelled) {
        setAccess(result);
        setLoading(false);
      }
    }).catch((err) => {
      console.error("Failed to check PDF access:", err);
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [quoteRequestId, status]);

  if (loading) {
    return <div className="h-16 animate-pulse bg-card rounded-xl border border-border" />;
  }

  // Not signed yet
  if (!access?.canAccess && access?.reason === "not_signed") {
    return (
      <div className="flex items-center gap-3 px-4 py-4 rounded-xl bg-gray-50 border border-border">
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
          <Lock className="h-5 w-5 text-gray-400" />
        </div>
        <div>
          <p className="text-xs font-display font-semibold text-foreground">Devis PDF verrouillé</p>
          <p className="text-[10px] font-body text-muted-foreground">
            Signez le devis pour débloquer le document PDF du fournisseur.
          </p>
        </div>
      </div>
    );
  }

  // Signed but deposit not paid
  if (!access?.canAccess && access?.reason === "deposit_pending") {
    return (
      <div className="flex items-center gap-3 px-4 py-4 rounded-xl bg-amber-50/50 border border-amber-100">
        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
          <Clock className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <p className="text-xs font-display font-semibold text-amber-800">Acompte en attente</p>
          <p className="text-[10px] font-body text-amber-700">
            Le devis PDF sera accessible dès réception de votre acompte. Terrassea vous notifiera.
          </p>
        </div>
      </div>
    );
  }

  // Accessible
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
        <div>
          <p className="text-xs font-display font-semibold text-emerald-800">Document déverrouillé</p>
          <p className="text-[10px] font-body text-emerald-700">
            Le devis PDF officiel du fournisseur est maintenant disponible.
          </p>
        </div>
      </div>
      <Suspense fallback={<div className="h-16 animate-pulse bg-card rounded-xl" />}>
        <QuotePdfViewer quoteRequestId={quoteRequestId} />
      </Suspense>
    </div>
  );
}
