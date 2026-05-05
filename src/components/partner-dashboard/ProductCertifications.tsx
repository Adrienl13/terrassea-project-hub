// ============================================================================
// ProductCertifications — product-level certification CRUD (PV individuel)
// ÉTAPE 8e-2 (2026-05-05).
//
// Renders the cards list + "Add" button + Sheet form. Uses
// useProductCertifications(productId) for the list. Fetches the parent
// product's owner_brand_id internally to compute the storage bucket path
// {owner_brand_id}/products/{productId}/...
// ============================================================================

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  useProductCertifications,
  type ProductCertificationWithDetails,
} from "@/lib/referentials";
import ProductCertificationForm from "./ProductCertificationForm";

interface Props {
  productId: string;
}

export default function ProductCertifications({ productId }: Props) {
  const queryClient = useQueryClient();

  // Fetch parent product's owner_brand_id (needed for bucket path)
  const { data: product } = useQuery({
    queryKey: ["product-owner-brand", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("owner_brand_id, partner_id")
        .eq("id", productId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });
  const partnerId = product?.owner_brand_id ?? product?.partner_id ?? null;

  const { data: certifications = [], isLoading } = useProductCertifications(productId);

  const [editing, setEditing] = useState<ProductCertificationWithDetails | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(certId: string) {
    const cert = certifications.find((c) => c.id === certId);
    if (!cert) {
      setDeletingId(null);
      return;
    }
    if (cert.pv_document_url) {
      const { error: storageErr } = await supabase
        .storage
        .from("partner-certificates")
        .remove([cert.pv_document_url]);
      if (storageErr) {
        console.warn("Could not delete PV PDF:", storageErr.message);
      }
    }
    const { error } = await supabase
      .from("product_certifications")
      .delete()
      .eq("id", certId);
    if (error) {
      toast.error("Erreur suppression : " + error.message);
      setDeletingId(null);
      return;
    }
    toast.success("Certification produit supprimée");
    setDeletingId(null);
    queryClient.invalidateQueries({ queryKey: ["referentials", "product_certifications", productId] });
  }

  async function handleDownload(cert: ProductCertificationWithDetails) {
    if (!cert.pv_document_url) {
      toast.error("Aucun PV associé");
      return;
    }
    const { data, error } = await supabase
      .storage
      .from("partner-certificates")
      .download(cert.pv_document_url);
    if (error || !data) {
      toast.error("Erreur téléchargement : " + (error?.message ?? "fichier introuvable"));
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PV_${cert.certification.slug}_${cert.pv_number ?? cert.id.slice(0, 8)}.pdf`;
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
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-bold text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Certifications spécifiques de ce produit
          </h3>
          <p className="text-[11px] font-body text-muted-foreground mt-1 max-w-2xl">
            Certifications testées par laboratoire pour ce produit (numéro PV individuel).
            Visible aux acheteurs sur la fiche produit.
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          size="sm"
          disabled={!partnerId}
          title={!partnerId ? "Produit sans partenaire (impossible d'ajouter)" : undefined}
        >
          <Plus className="h-4 w-4 mr-1" /> Ajouter
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground text-xs">Chargement…</p>}

      {!isLoading && certifications.length === 0 && (
        <div className="border border-dashed border-border rounded-md p-6 text-center">
          <ShieldCheck className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-xs font-body text-muted-foreground">
            Aucune certification produit déclarée. Cliquez sur <strong>Ajouter</strong> pour commencer.
          </p>
        </div>
      )}

      {!isLoading && certifications.length > 0 && (
        <div className="space-y-2">
          {certifications.map((cert) => (
            <div
              key={cert.id}
              className="border border-border rounded-md p-3 flex items-start gap-3 hover:bg-muted/20 transition-colors"
            >
              <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                {cert.certification.logo_url ? (
                  <img
                    src={cert.certification.logo_url}
                    alt={cert.certification.name}
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display font-semibold text-xs">
                    {cert.certification.name}
                  </span>
                  {isExpired(cert.valid_until) && (
                    <Badge className="text-[9px] bg-red-500/10 text-red-700 border-red-500/20">
                      Expiré
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1 flex-wrap">
                  {cert.pv_number && <span>PV n° {cert.pv_number}</span>}
                  {cert.lab_name && <span>Labo : {cert.lab_name}</span>}
                  <span>Valide jusqu'au : {formatDate(cert.valid_until)}</span>
                  {cert.pv_document_url && (
                    <button
                      onClick={() => handleDownload(cert)}
                      className="inline-flex items-center gap-1 text-foreground hover:underline"
                    >
                      <FileText className="h-3 w-3" /> PDF
                    </button>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditing(cert)} title="Modifier">
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeletingId(cert.id)}
                className="text-destructive hover:text-destructive"
                title="Supprimer"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {(createOpen || editing) && partnerId && (
        <ProductCertificationForm
          productId={productId}
          partnerId={partnerId}
          certification={editing}
          onClose={() => {
            setCreateOpen(false);
            setEditing(null);
          }}
          onSaved={() => {
            queryClient.invalidateQueries({
              queryKey: ["referentials", "product_certifications", productId],
            });
          }}
        />
      )}

      <AlertDialog open={deletingId !== null} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Confirmer la suppression
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette certification produit sera retirée et son PV (s'il existe) sera supprimé.
              Action irréversible.
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
