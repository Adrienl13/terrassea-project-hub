// ============================================================================
// PartnerCertificationForm — Sheet drawer for create/edit a brand-level cert
// ÉTAPE 8e-1 (2026-05-05).
//
// Handles : combobox certification picker (scope='brand'), text fields,
// PDF upload (validated 10MB + application/pdf via bucket constraints),
// upsert into partner_certifications.
// ============================================================================

import { useState, useEffect } from "react";
import { ChevronsUpDown, FileText, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCertifications, type PartnerCertificationWithDetails } from "@/lib/referentials";
import { partnerCertificationSchema } from "@/lib/referentials/partnerCertificationSchema";
import { slugify } from "@/lib/slug";

interface Props {
  partnerId: string;
  certification: PartnerCertificationWithDetails | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function PartnerCertificationForm({
  partnerId,
  certification,
  onClose,
  onSaved,
}: Props) {
  const isEdit = !!certification;
  const { data: brandCertifications = [] } = useCertifications({ scope: "brand" });

  // ── Form state ──
  const [certificationId, setCertificationId] = useState<string>("");
  const [certificateNumber, setCertificateNumber] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [existingPdfPath, setExistingPdfPath] = useState<string | null>(null);
  const [comboOpen, setComboOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Hydrate form on open / row change
  useEffect(() => {
    if (certification) {
      setCertificationId(certification.certification_id);
      setCertificateNumber(certification.certificate_number ?? "");
      setIssuedAt(certification.issued_at ?? "");
      setValidUntil(certification.valid_until ?? "");
      setNotes(certification.notes ?? "");
      setExistingPdfPath(certification.certificate_url);
      setPdfFile(null);
    } else {
      setCertificationId("");
      setCertificateNumber("");
      setIssuedAt("");
      setValidUntil("");
      setNotes("");
      setExistingPdfPath(null);
      setPdfFile(null);
    }
    setErrors({});
  }, [certification]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Seuls les fichiers PDF sont acceptés");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 10 MB)");
      return;
    }
    setPdfFile(file);
  }

  async function handleSave() {
    // Validation Zod
    const parse = partnerCertificationSchema.safeParse({
      partner_id: partnerId,
      certification_id: certificationId,
      certificate_number: certificateNumber || null,
      issued_at: issuedAt || null,
      valid_until: validUntil || null,
      certificate_url: existingPdfPath || "",
      notes: notes || null,
    });
    if (!parse.success) {
      const errs: Record<string, string> = {};
      for (const issue of parse.error.issues) {
        errs[issue.path.join(".")] = issue.message;
      }
      setErrors(errs);
      toast.error("Validation échouée");
      return;
    }

    setSaving(true);
    let finalPdfPath: string | null = existingPdfPath;

    // Upload PDF if a new file is selected
    if (pdfFile) {
      const selectedCert = brandCertifications.find((c) => c.id === certificationId);
      const certSlug = selectedCert ? slugify(selectedCert.slug) : "cert";
      const path = `${partnerId}/brand/${certSlug}_${Date.now()}.pdf`;
      const { error: uploadErr } = await supabase
        .storage
        .from("partner-certificates")
        .upload(path, pdfFile, { contentType: "application/pdf", upsert: false });
      if (uploadErr) {
        toast.error("Erreur upload PDF : " + uploadErr.message);
        setSaving(false);
        return;
      }
      // Delete the old file if replacing
      if (existingPdfPath) {
        await supabase
          .storage
          .from("partner-certificates")
          .remove([existingPdfPath])
          .catch(() => {/* non-blocking */});
      }
      finalPdfPath = path;
    }

    // Build payload (matches partner_certifications table shape)
    const payload = {
      partner_id: partnerId,
      certification_id: certificationId,
      certificate_number: certificateNumber || null,
      issued_at: issuedAt || null,
      valid_until: validUntil || null,
      certificate_url: finalPdfPath,
      notes: notes || null,
    };

    const { error } = isEdit
      ? await supabase
          .from("partner_certifications")
          .update(payload)
          .eq("id", certification!.id)
      : await supabase.from("partner_certifications").insert(payload);

    setSaving(false);
    if (error) {
      toast.error("Erreur enregistrement : " + error.message);
      return;
    }
    toast.success(isEdit ? "Certification mise à jour" : "Certification ajoutée");
    onSaved();
    onClose();
  }

  const selectedCert = brandCertifications.find((c) => c.id === certificationId);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? `Modifier ${certification?.certification.name}` : "Nouvelle certification"}
          </SheetTitle>
          <SheetDescription className="text-[11px]">
            Certification de marque (scope brand). Héritée par tous vos produits.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* Combobox certification */}
          <div>
            <Label>Certification *</Label>
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={isEdit}
                  className={cn(
                    "flex w-full items-center justify-between gap-1 rounded-sm border border-border bg-card px-2 py-1.5 text-left text-xs",
                    "hover:border-foreground/40 focus:ring-1 focus:ring-foreground",
                    !selectedCert && "text-muted-foreground",
                    isEdit && "opacity-60 cursor-not-allowed",
                  )}
                >
                  <span className="truncate">
                    {selectedCert ? selectedCert.name : "— sélectionner —"}
                  </span>
                  <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Rechercher…" className="h-8 text-xs" />
                  <CommandList>
                    <CommandEmpty>Aucune certification</CommandEmpty>
                    <CommandGroup>
                      {brandCertifications.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={c.name}
                          onSelect={() => {
                            setCertificationId(c.id);
                            setComboOpen(false);
                          }}
                        >
                          {c.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {errors.certification_id && (
              <p className="text-[10px] text-destructive mt-0.5">{errors.certification_id}</p>
            )}
            {isEdit && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Pour changer la certification, supprimez et recréez l'entrée.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="cert-number">Numéro de certificat</Label>
            <Input
              id="cert-number"
              value={certificateNumber}
              onChange={(e) => setCertificateNumber(e.target.value)}
              placeholder="ex: FSC-C123456"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="issued-at">Date d'émission</Label>
              <Input
                id="issued-at"
                type="date"
                value={issuedAt}
                onChange={(e) => setIssuedAt(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="valid-until">Valide jusqu'au</Label>
              <Input
                id="valid-until"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </div>

          {/* PDF upload */}
          <div>
            <Label>Document PDF (optionnel, max 10 MB)</Label>
            {existingPdfPath && !pdfFile && (
              <div className="flex items-center gap-2 mt-1 px-3 py-2 rounded-sm border border-border bg-muted/20 text-xs">
                <FileText className="h-3.5 w-3.5" />
                <span className="flex-1 truncate">{existingPdfPath.split("/").pop()}</span>
                <button
                  type="button"
                  onClick={() => setExistingPdfPath(null)}
                  className="text-destructive hover:text-destructive/80"
                  title="Retirer le PDF"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {pdfFile && (
              <div className="flex items-center gap-2 mt-1 px-3 py-2 rounded-sm border border-foreground/40 bg-foreground/5 text-xs">
                <Upload className="h-3.5 w-3.5" />
                <span className="flex-1 truncate">{pdfFile.name}</span>
                <button
                  type="button"
                  onClick={() => setPdfFile(null)}
                  className="text-destructive hover:text-destructive/80"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {!existingPdfPath && !pdfFile && (
              <Input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="mt-1"
              />
            )}
            {(existingPdfPath || pdfFile) && (
              <Input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="mt-1"
              />
            )}
          </div>

          <div>
            <Label htmlFor="cert-notes">Notes</Label>
            <Textarea
              id="cert-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Audit annuel à prévoir, etc."
            />
          </div>
        </div>

        <SheetFooter className="mt-6 flex flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving || !certificationId} className="flex-1">
            {saving ? "Enregistrement…" : isEdit ? "Mettre à jour" : "Ajouter"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
