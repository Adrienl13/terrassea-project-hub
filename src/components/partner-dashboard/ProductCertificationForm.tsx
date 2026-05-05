// ============================================================================
// ProductCertificationForm — Sheet drawer for create/edit a product-level cert
// ÉTAPE 8e-2 (2026-05-05).
//
// Fields specific to product_unit certifications: pv_number (REQUIRED),
// lab_name, dates, pv_document_url upload. Bucket path:
// {partnerId}/products/{productId}/{certifSlug}_{timestamp}.pdf
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
import {
  useCertifications,
  type ProductCertificationWithDetails,
} from "@/lib/referentials";
import { productCertificationSchema } from "@/lib/referentials/productCertificationSchema";
import { slugify } from "@/lib/slug";

interface Props {
  productId: string;
  partnerId: string;
  certification: ProductCertificationWithDetails | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ProductCertificationForm({
  productId,
  partnerId,
  certification,
  onClose,
  onSaved,
}: Props) {
  const isEdit = !!certification;
  const { data: productCertifications = [] } = useCertifications({ scope: "product_unit" });

  const [certificationId, setCertificationId] = useState<string>("");
  const [pvNumber, setPvNumber] = useState("");
  const [labName, setLabName] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [existingPdfPath, setExistingPdfPath] = useState<string | null>(null);
  const [comboOpen, setComboOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (certification) {
      setCertificationId(certification.certification_id);
      setPvNumber(certification.pv_number ?? "");
      setLabName(certification.lab_name ?? "");
      setIssuedAt(certification.issued_at ?? "");
      setValidUntil(certification.valid_until ?? "");
      setNotes(certification.notes ?? "");
      setExistingPdfPath(certification.pv_document_url);
      setPdfFile(null);
    } else {
      setCertificationId("");
      setPvNumber("");
      setLabName("");
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
    // Custom guard : pv_number recommandé pour product_unit
    if (!pvNumber.trim()) {
      setErrors({ pv_number: "Numéro PV requis pour une certification produit" });
      toast.error("Numéro PV requis");
      return;
    }

    const parse = productCertificationSchema.safeParse({
      product_id: productId,
      certification_id: certificationId,
      pv_number: pvNumber || null,
      lab_name: labName || null,
      issued_at: issuedAt || null,
      valid_until: validUntil || null,
      pv_document_url: existingPdfPath || "",
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

    if (pdfFile) {
      const selectedCert = productCertifications.find((c) => c.id === certificationId);
      const certSlug = selectedCert ? slugify(selectedCert.slug) : "cert";
      const path = `${partnerId}/products/${productId}/${certSlug}_${Date.now()}.pdf`;
      const { error: uploadErr } = await supabase
        .storage
        .from("partner-certificates")
        .upload(path, pdfFile, { contentType: "application/pdf", upsert: false });
      if (uploadErr) {
        toast.error("Erreur upload PV : " + uploadErr.message);
        setSaving(false);
        return;
      }
      if (existingPdfPath) {
        await supabase
          .storage
          .from("partner-certificates")
          .remove([existingPdfPath])
          .catch(() => {/* non-blocking */});
      }
      finalPdfPath = path;
    }

    const payload = {
      product_id: productId,
      certification_id: certificationId,
      pv_number: pvNumber || null,
      lab_name: labName || null,
      issued_at: issuedAt || null,
      valid_until: validUntil || null,
      pv_document_url: finalPdfPath,
      notes: notes || null,
    };

    const { error } = isEdit
      ? await supabase
          .from("product_certifications")
          .update(payload)
          .eq("id", certification!.id)
      : await supabase.from("product_certifications").insert(payload);

    setSaving(false);
    if (error) {
      toast.error("Erreur enregistrement : " + error.message);
      return;
    }
    toast.success(isEdit ? "Certification produit mise à jour" : "Certification produit ajoutée");
    onSaved();
    onClose();
  }

  const selectedCert = productCertifications.find((c) => c.id === certificationId);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? `Modifier ${certification?.certification.name}` : "Nouvelle certification produit"}
          </SheetTitle>
          <SheetDescription className="text-[11px]">
            Certification produit (scope product_unit) avec PV individuel.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-4">
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
                      {productCertifications.map((c) => (
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
          </div>

          <div>
            <Label htmlFor="pv-number">Numéro PV *</Label>
            <Input
              id="pv-number"
              value={pvNumber}
              onChange={(e) => setPvNumber(e.target.value)}
              placeholder="ex: LNE-2025-1234"
            />
            {errors.pv_number && (
              <p className="text-[10px] text-destructive mt-0.5">{errors.pv_number}</p>
            )}
          </div>

          <div>
            <Label htmlFor="lab-name">Laboratoire</Label>
            <Input
              id="lab-name"
              value={labName}
              onChange={(e) => setLabName(e.target.value)}
              placeholder="ex: LNE, FCBA, CSTB"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pv-issued">Date d'émission</Label>
              <Input
                id="pv-issued"
                type="date"
                value={issuedAt}
                onChange={(e) => setIssuedAt(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="pv-valid">Valide jusqu'au</Label>
              <Input
                id="pv-valid"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Document PV (optionnel, max 10 MB)</Label>
            {existingPdfPath && !pdfFile && (
              <div className="flex items-center gap-2 mt-1 px-3 py-2 rounded-sm border border-border bg-muted/20 text-xs">
                <FileText className="h-3.5 w-3.5" />
                <span className="flex-1 truncate">{existingPdfPath.split("/").pop()}</span>
                <button
                  type="button"
                  onClick={() => setExistingPdfPath(null)}
                  className="text-destructive hover:text-destructive/80"
                  title="Retirer le PV"
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
            <Input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="pv-notes">Notes</Label>
            <Textarea
              id="pv-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Test selon NF EN 1335-2, etc."
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
