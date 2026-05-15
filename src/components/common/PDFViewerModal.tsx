// Reusable PDF viewer modal (iframe-based).
// Utilisé par PartnerCGVSection + AdminCGVOverview pour afficher une CGV
// via signed URL générée par l'Edge Function get-signed-cgv-url.

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface PDFViewerModalProps {
  open: boolean;
  url: string | null;
  onOpenChange: (open: boolean) => void;
  title?: string;
}

export default function PDFViewerModal({ open, url, onOpenChange, title }: PDFViewerModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 sm:p-0">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle>{title ?? "Aperçu PDF"}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 px-6 pb-6 min-h-0">
          {url ? (
            <iframe
              src={url}
              className="w-full h-full border-0 rounded-md bg-muted"
              title={title ?? "PDF Viewer"}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
              URL indisponible
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
