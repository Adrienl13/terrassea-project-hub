import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Download, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { extractCatalogs, type CatalogDoc } from "@/lib/catalogDocs";

function triggerDownload(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

interface CatalogDownloadProps {
  partnerId: string;
  partnerName: string;
  documents: unknown;
  /** Visual variant: "section" (full block) or "card" (compact). */
  className?: string;
}

export default function CatalogDownload({ partnerId, partnerName, documents, className }: CatalogDownloadProps) {
  const { t, i18n } = useTranslation();
  const catalogs = extractCatalogs(documents);

  const [active, setActive] = useState<CatalogDoc | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (catalogs.length === 0) return null;

  const reset = () => { setName(""); setEmail(""); setCompany(""); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error(t("catalog.invalidEmail", "Veuillez saisir un email valide."));
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("catalog-download", {
        body: {
          partner_id: partnerId,
          catalog_id: active.id,
          name: name.trim() || null,
          email: email.trim(),
          company: company.trim() || null,
          locale: i18n.language?.slice(0, 2),
        },
      });
      if (error || !data?.url) {
        throw new Error(error?.message || "no url");
      }
      triggerDownload(data.url);
      toast.success(t("catalog.downloadStarted", "Téléchargement lancé. Merci de votre intérêt !"));
      setActive(null);
      reset();
    } catch {
      toast.error(t("catalog.downloadError", "Le téléchargement a échoué. Réessayez dans un instant."));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full text-base font-body bg-white border border-border rounded-lg px-3 py-2.5 focus:outline-none focus:border-foreground/40 transition-colors";
  const labelClass =
    "text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1";

  return (
    <div className={className}>
      <h2 className="font-display font-semibold text-lg text-foreground mb-1 flex items-center gap-2">
        <FileText className="h-5 w-5 text-[#D4603A]" />
        {t("catalog.sectionTitle", "Catalogues produits")}
      </h2>
      <p className="text-sm font-body text-muted-foreground mb-4">
        {t("catalog.sectionSubtitle", "Téléchargez le catalogue PDF qui vous intéresse.")}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {catalogs.map((c) => (
          <button
            key={c.id}
            onClick={() => { setActive(c); }}
            className="group flex items-center gap-3 text-left border border-border rounded-xl p-4 hover:border-foreground/30 hover:bg-muted/30 transition-colors"
          >
            <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#D4603A]/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-[#D4603A]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display font-semibold text-sm text-foreground truncate">{c.title}</span>
              <span className="block text-xs font-body text-muted-foreground">
                PDF{typeof c.size === "number" ? ` · ${(c.size / 1024 / 1024).toFixed(1)} Mo` : ""}
              </span>
            </span>
            <Download className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
          </button>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => { if (!o) { setActive(null); reset(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {t("catalog.dialogTitle", "Télécharger le catalogue")}
            </DialogTitle>
            <DialogDescription className="font-body">
              {active?.title} — {partnerName}.{" "}
              {t("catalog.dialogDesc", "Laissez-nous vos coordonnées pour accéder au PDF.")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div>
              <label className={labelClass}>{t("catalog.fieldName", "Nom")}</label>
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div>
              <label className={labelClass}>{t("catalog.fieldEmail", "Email")} *</label>
              <input
                type="email"
                required
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <label className={labelClass}>{t("catalog.fieldCompany", "Société")}</label>
              <input
                className={inputClass}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                autoComplete="organization"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-foreground text-background font-display font-semibold text-sm rounded-full px-6 py-3 hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {submitting
                ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("catalog.preparing", "Préparation…")}</>
                : <><Download className="h-4 w-4" /> {t("catalog.downloadCta", "Télécharger le PDF")}</>}
            </button>
            <p className="text-[10px] font-body text-muted-foreground text-center leading-relaxed">
              {t("catalog.privacyNote", "Vos coordonnées sont transmises à la marque pour le suivi de votre demande.")}
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
