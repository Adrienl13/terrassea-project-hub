// Reusable CGV acceptance checkbox + integrated viewer link.
//
// Phase 3 final — Dette 104 résiduel résolu.
//
// Usage (Vague 2 buyer flows : quote signature, order placement) :
//
//   <CGVAcceptanceCheckbox
//     partnerCgvId={partner.current_cgv_id}
//     partnerName={partner.name}
//     context="quote_signature"
//     contextReferenceId={quoteId}
//     onAcceptedChange={setAccepted}
//   />
//   <Button disabled={!accepted} onClick={submitQuote}>Sign quote</Button>
//
// Comportement :
//   - Bouton "Voir CGV" → modal PDFViewer via Edge Function get-signed-cgv-url.
//   - Au moment où l'user coche : appel RPC `record_cgv_acceptance` qui capte
//     IP + UA côté serveur (anti-spoof client). Si succès → checked + callback.
//     Si échec → revert checkbox + toast erreur.
//   - Décocher = toggle UI uniquement. L'acceptance enregistrée reste valide
//     (preuve immuable). Re-cocher = nouveau record_cgv_acceptance.
//
// Le composant ne décide PAS d'enable/disable du bouton submit du parent ;
// il expose `accepted` via `onAcceptedChange`. Le parent gère son submit.

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import PDFViewerModal from "@/components/common/PDFViewerModal";
import { Eye, Loader2 } from "lucide-react";

type AcceptanceContext = "signup" | "quote_signature" | "order_placement" | "partner_onboarding" | "manual";

interface CGVAcceptanceCheckboxProps {
  partnerCgvId: string;
  partnerName: string;
  context: AcceptanceContext;
  contextReferenceId?: string;
  onAcceptedChange?: (accepted: boolean) => void;
  disabled?: boolean;
  /** Custom label override. Defaults to "J'accepte les CGV de {partnerName}". */
  label?: string;
}

export default function CGVAcceptanceCheckbox({
  partnerCgvId,
  partnerName,
  context,
  contextReferenceId,
  onAcceptedChange,
  disabled = false,
  label,
}: CGVAcceptanceCheckboxProps) {
  const [accepted, setAccepted] = useState(false);
  const [recording, setRecording] = useState(false);

  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerLoading, setViewerLoading] = useState(false);

  const handleView = async () => {
    setViewerLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-signed-cgv-url", {
        body: { partner_cgv_id: partnerCgvId },
      });
      if (error || !data?.url) {
        console.error("[CGVAcceptanceCheckbox view]", error);
        toast.error("Impossible d'afficher les CGV.");
        return;
      }
      setViewerUrl(data.url as string);
      setViewerOpen(true);
    } finally {
      setViewerLoading(false);
    }
  };

  const handleChange = async (next: boolean) => {
    if (recording) return;
    if (!next) {
      setAccepted(false);
      onAcceptedChange?.(false);
      return;
    }
    setRecording(true);
    try {
      const { error } = await supabase.rpc("record_cgv_acceptance", {
        p_acceptance_type: "partner_cgv",
        p_context: context,
        p_partner_cgv_id: partnerCgvId,
        p_context_reference_id: contextReferenceId ?? undefined,
      });
      if (error) {
        console.error("[CGVAcceptanceCheckbox record]", error);
        toast.error("Échec de l'enregistrement de l'acceptation.");
        setAccepted(false);
        onAcceptedChange?.(false);
        return;
      }
      setAccepted(true);
      onAcceptedChange?.(true);
    } finally {
      setRecording(false);
    }
  };

  const finalLabel = label ?? `J'accepte les CGV de ${partnerName}`;
  const checkboxId = `cgv-accept-${partnerCgvId}`;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border p-3">
      <div className="flex items-center gap-2">
        <Checkbox
          id={checkboxId}
          checked={accepted}
          onCheckedChange={(v) => void handleChange(v === true)}
          disabled={disabled || recording}
        />
        <Label htmlFor={checkboxId} className="text-sm font-normal cursor-pointer">
          {recording ? (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Enregistrement…
            </span>
          ) : (
            finalLabel
          )}
        </Label>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="ml-auto"
        onClick={handleView}
        disabled={viewerLoading}
      >
        {viewerLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
        Voir CGV
      </Button>

      <PDFViewerModal
        open={viewerOpen}
        url={viewerUrl}
        onOpenChange={(o) => {
          setViewerOpen(o);
          if (!o) setViewerUrl(null);
        }}
        title={`CGV — ${partnerName}`}
      />
    </div>
  );
}
