// Partner-side CGV upload + current state display.
// Phase 3 CGV MVP — 3-field form (title, effective_date, PDF file).
// Le PDF est la source of truth (décision founder Q1 Phase 3, 2026-05-14).

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { computeFileSha256 } from "@/utils/crypto";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileText, Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

const MAX_BYTES = 25 * 1024 * 1024;

type CurrentCGV = {
  id: string;
  version: number;
  title: string;
  storage_path: string;
  status: string;
  effective_date: string;
  byte_size: number;
  created_at: string;
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export default function PartnerCGVSection({ partnerId }: { partnerId: string }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState("");
  const [effectiveDate, setEffectiveDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: currentCGV, isLoading: loadingCurrent } = useQuery({
    queryKey: ["partner-cgv-current", partnerId],
    queryFn: async (): Promise<CurrentCGV | null> => {
      const { data, error } = await supabase
        .from("partner_cgv")
        .select("id, version, title, storage_path, status, effective_date, byte_size, created_at")
        .eq("partner_id", partnerId)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data as CurrentCGV | null;
    },
    enabled: !!partnerId,
  });

  const { data: history } = useQuery({
    queryKey: ["partner-cgv-history", partnerId],
    queryFn: async (): Promise<Array<Pick<CurrentCGV, "version" | "title" | "status" | "effective_date" | "created_at">>> => {
      const { data, error } = await supabase
        .from("partner_cgv")
        .select("version, title, status, effective_date, created_at")
        .eq("partner_id", partnerId)
        .order("version", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<Pick<CurrentCGV, "version" | "title" | "status" | "effective_date" | "created_at">>;
    },
    enabled: !!partnerId,
  });

  const nextVersion = useMemo(() => {
    if (!history || history.length === 0) return 1;
    return Math.max(...history.map((h) => h.version)) + 1;
  }, [history]);

  // Reset le formulaire après un succès
  useEffect(() => {
    if (!uploading && file === null && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [uploading, file]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    if (!picked) {
      setFile(null);
      return;
    }
    if (picked.type !== "application/pdf") {
      toast.error("Seuls les fichiers PDF sont acceptés (Dette 100 — DOCX différé).");
      e.target.value = "";
      setFile(null);
      return;
    }
    if (picked.size > MAX_BYTES) {
      toast.error(`Le fichier dépasse 25 MB (taille ${formatBytes(picked.size)}).`);
      e.target.value = "";
      setFile(null);
      return;
    }
    setFile(picked);
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error("Sélectionne un fichier PDF.");
      return;
    }
    if (!title.trim()) {
      toast.error("Renseigne un titre.");
      return;
    }
    if (!effectiveDate) {
      toast.error("Renseigne une date d'entrée en vigueur.");
      return;
    }

    setUploading(true);
    try {
      const sha256 = await computeFileSha256(file);
      const version = nextVersion;
      const storagePath = `${partnerId}/v${version}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from("partner-cgv")
        .upload(storagePath, file, {
          contentType: "application/pdf",
          upsert: false,
        });
      if (uploadError) {
        console.error("[partner_cgv storage upload]", uploadError);
        toast.error("Échec upload PDF : " + (uploadError.message || "inconnu"));
        return;
      }

      // Si une CGV active existe déjà, on l'archive d'abord (contrainte unique partielle "un seul active par partner")
      if (currentCGV) {
        const { error: archiveError } = await supabase
          .from("partner_cgv")
          .update({
            status: "archived",
            archived_at: new Date().toISOString(),
            archive_reason: `Remplacée par v${version}`,
          })
          .eq("id", currentCGV.id);
        if (archiveError) {
          console.error("[partner_cgv archive]", archiveError);
          // Cleanup : supprimer le fichier uploaded pour éviter orphan
          await supabase.storage.from("partner-cgv").remove([storagePath]);
          toast.error("Échec archivage version précédente : " + (archiveError.message || "inconnu"));
          return;
        }
      }

      const { error: insertError } = await supabase.from("partner_cgv").insert({
        partner_id: partnerId,
        version,
        title: title.trim(),
        storage_path: storagePath,
        sha256,
        byte_size: file.size,
        status: "active",
        effective_date: effectiveDate,
      } as never);
      if (insertError) {
        console.error("[partner_cgv insert]", insertError);
        await supabase.storage.from("partner-cgv").remove([storagePath]);
        toast.error("Échec enregistrement CGV : " + (insertError.message || "inconnu"));
        return;
      }

      toast.success(`CGV v${version} enregistrée.`);
      setTitle("");
      setFile(null);
      // Le trigger sync_partner_cgv_metadata maintient automatiquement partner_cgv_metadata.
      void queryClient.invalidateQueries({ queryKey: ["partner-cgv-current", partnerId] });
      void queryClient.invalidateQueries({ queryKey: ["partner-cgv-history", partnerId] });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Conditions Générales de Vente</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Téléversez votre document CGV en PDF. La version active sera visible des acheteurs avant tout achat.
        </p>
      </div>

      {loadingCurrent ? (
        <Card><CardContent className="py-6 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</CardContent></Card>
      ) : currentCGV ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              CGV active — v{currentCGV.version}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <div><span className="text-muted-foreground">Titre :</span> {currentCGV.title}</div>
              <div><span className="text-muted-foreground">Effective le :</span> {currentCGV.effective_date}</div>
              <div><span className="text-muted-foreground">Taille :</span> {formatBytes(currentCGV.byte_size)}</div>
            </div>
            <Badge variant="secondary" className="mt-2">{currentCGV.status}</Badge>
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Aucune CGV active</AlertTitle>
          <AlertDescription>
            Vous devez téléverser un document CGV en PDF avant de pouvoir vendre sur Terrassea Vague 2.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {currentCGV ? `Téléverser une nouvelle version (v${nextVersion})` : "Téléverser votre CGV (v1)"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cgv-title">Titre du document</Label>
            <Input
              id="cgv-title"
              type="text"
              placeholder="Ex. Conditions Générales de Vente Acme — v2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={uploading}
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cgv-effective-date">Date d'entrée en vigueur</Label>
            <Input
              id="cgv-effective-date"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              disabled={uploading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cgv-file">Fichier PDF (25 MB max)</Label>
            <Input
              id="cgv-file"
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              disabled={uploading}
            />
            {file ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3" /> {file.name} — {formatBytes(file.size)}
              </p>
            ) : null}
          </div>
          <Button onClick={handleSubmit} disabled={uploading || !file || !title.trim() || !effectiveDate}>
            {uploading ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" /> Envoi…</>) : (<><Upload className="h-4 w-4 mr-2" /> Téléverser CGV v{nextVersion}</>)}
          </Button>
        </CardContent>
      </Card>

      {history && history.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Historique des versions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {history.map((h) => (
                <li key={h.version} className="py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="font-medium">v{h.version}</span>
                  <span className="text-muted-foreground">{h.title}</span>
                  <span className="text-muted-foreground">effective {h.effective_date}</span>
                  <Badge variant={h.status === "active" ? "default" : "secondary"} className="ml-auto">{h.status}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
