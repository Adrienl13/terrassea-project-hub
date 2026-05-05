// ============================================================================
// PartnerCertifications — brand-level certification CRUD for a partner
// ÉTAPE 8e-1 (2026-05-05).
//
// Renders the table list + "Add" button + Sheet form. Uses
// usePartnerCertifications(partnerId) for the list and the form sub-component
// for create/edit. Delete confirms via AlertDialog and removes both the row
// and the associated PDF in storage.
// ============================================================================

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, FileText, Pencil, Trash2, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  usePartnerCertifications,
  type PartnerCertificationWithDetails,
} from "@/lib/referentials";
import PartnerCertificationForm from "./PartnerCertificationForm";

interface Props {
  partnerId: string;
}

export default function PartnerCertifications({ partnerId }: Props) {
  const queryClient = useQueryClient();
  const { data: certifications = [], isLoading } = usePartnerCertifications(partnerId);

  const [editing, setEditing] = useState<PartnerCertificationWithDetails | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(certId: string) {
    const cert = certifications.find((c) => c.id === certId);
    if (!cert) {
      setDeletingId(null);
      return;
    }
    // Step 1 : delete the PDF from storage if any
    if (cert.certificate_url) {
      const { error: storageErr } = await supabase
        .storage
        .from("partner-certificates")
        .remove([cert.certificate_url]);
      if (storageErr) {
        // Log but do not block — orphan file is preferable to inconsistent DB
        console.warn("Could not delete certificate PDF:", storageErr.message);
      }
    }
    // Step 2 : delete the row
    const { error } = await supabase
      .from("partner_certifications")
      .delete()
      .eq("id", certId);
    if (error) {
      toast.error("Erreur suppression : " + error.message);
      setDeletingId(null);
      return;
    }
    toast.success("Certification supprimée");
    setDeletingId(null);
    queryClient.invalidateQueries({ queryKey: ["referentials", "partner_certifications", partnerId] });
  }

  async function handleDownload(cert: PartnerCertificationWithDetails) {
    if (!cert.certificate_url) {
      toast.error("Aucun document associé");
      return;
    }
    const { data, error } = await supabase
      .storage
      .from("partner-certificates")
      .download(cert.certificate_url);
    if (error || !data) {
      toast.error("Erreur téléchargement : " + (error?.message ?? "fichier introuvable"));
      return;
    }
    // Trigger download via blob URL
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cert.certification.slug}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("fr-FR");
    } catch {
      return iso;
    }
  };

  const isExpired = (validUntil: string | null) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Certifications de marque
          </h2>
          <p className="text-xs font-body text-muted-foreground mt-1 max-w-2xl">
            Déclarez ici les certifications de votre marque (ISO, FSC, REACH, Made in…).
            Elles seront héritées automatiquement par tous vos produits et visibles
            par les acheteurs sur la fiche produit.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Ajouter
        </Button>
      </div>

      {/* Loading */}
      {isLoading && <p className="text-muted-foreground text-sm">Chargement…</p>}

      {/* Empty state */}
      {!isLoading && certifications.length === 0 && (
        <div className="border border-dashed border-border rounded-xl p-8 text-center">
          <ShieldCheck className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-body text-muted-foreground">
            Aucune certification déclarée. Cliquez sur <strong>Ajouter</strong> pour commencer.
          </p>
        </div>
      )}

      {/* List */}
      {!isLoading && certifications.length > 0 && (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="divide-y divide-border">
            {certifications.map((cert) => (
              <div
                key={cert.id}
                className="px-5 py-4 flex items-center gap-4 hover:bg-muted/20 transition-colors"
              >
                <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                  {cert.certification.logo_url ? (
                    <img
                      src={cert.certification.logo_url}
                      alt={cert.certification.name}
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-semibold text-sm">
                      {cert.certification.name}
                    </span>
                    {cert.certification.category && (
                      <Badge variant="outline" className="text-[10px]">
                        {cert.certification.category}
                      </Badge>
                    )}
                    {isExpired(cert.valid_until) && (
                      <Badge className="text-[10px] bg-red-500/10 text-red-700 border-red-500/20">
                        Expirée
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                    {cert.certificate_number && (
                      <span>N° {cert.certificate_number}</span>
                    )}
                    <span>Valide jusqu'au : {formatDate(cert.valid_until)}</span>
                    {cert.certificate_url && (
                      <button
                        onClick={() => handleDownload(cert)}
                        className="inline-flex items-center gap-1 text-foreground hover:underline"
                      >
                        <FileText className="h-3 w-3" /> PDF
                      </button>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(cert)}
                  title="Modifier"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeletingId(cert.id)}
                  className="text-destructive hover:text-destructive"
                  title="Supprimer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create / Edit form */}
      {(createOpen || editing) && (
        <PartnerCertificationForm
          partnerId={partnerId}
          certification={editing}
          onClose={() => {
            setCreateOpen(false);
            setEditing(null);
          }}
          onSaved={() => {
            queryClient.invalidateQueries({
              queryKey: ["referentials", "partner_certifications", partnerId],
            });
          }}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={deletingId !== null} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Confirmer la suppression
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette certification sera retirée de votre marque et son document PDF (s'il existe)
              sera supprimé. Action irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && handleDelete(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
