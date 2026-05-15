// Admin-side overview of partner CGV status.
// Phase 3 CGV MVP — liste des partners approuvés + badges (Configuré / En
// attente / Manquant) selon la décision founder Q2 Phase 3 (2026-05-14).

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PDFViewerModal from "@/components/common/PDFViewerModal";
import { ShieldCheck, ShieldAlert, ShieldX, Search, Loader2, Eye, Trash2 } from "lucide-react";

const PENDING_DAYS = 7;

type PartnerRow = {
  id: string;
  name: string;
  slug: string | null;
  profile_status: string | null;
  profile_reviewed_at: string | null;
  current_cgv_id: string | null;
  current_version: number | null;
  metadata_last_updated_at: string | null;
};

type CGVStatus = "configured" | "pending" | "missing";

function classifyCGVStatus(row: PartnerRow): CGVStatus {
  if (row.current_cgv_id) return "configured";
  if (row.profile_reviewed_at) {
    const reviewed = new Date(row.profile_reviewed_at).getTime();
    const daysSince = (Date.now() - reviewed) / (1000 * 60 * 60 * 24);
    if (daysSince < PENDING_DAYS) return "pending";
  }
  return "missing";
}

function StatusBadge({ status }: { status: CGVStatus }) {
  if (status === "configured") {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 gap-1">
        <ShieldCheck className="h-3 w-3" /> Configuré
      </Badge>
    );
  }
  if (status === "pending") {
    return (
      <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 gap-1">
        <ShieldAlert className="h-3 w-3" /> En attente
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-100 text-red-800 hover:bg-red-100 gap-1">
      <ShieldX className="h-3 w-3" /> Manquant
    </Badge>
  );
}

export default function AdminCGVOverview() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<"all" | CGVStatus>("all");
  const [search, setSearch] = useState("");

  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState("");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerLoadingId, setViewerLoadingId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ cgvId: string; partnerName: string; version: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-cgv-overview"],
    queryFn: async (): Promise<PartnerRow[]> => {
      // Récupère les partners approuvés actifs
      const { data: partners, error: pErr } = await supabase
        .from("partners")
        .select("id, name, slug, profile_status, profile_reviewed_at")
        .eq("profile_status", "approved")
        .is("deleted_at", null);
      if (pErr) throw pErr;
      const partnerRows = (partners ?? []) as Array<Pick<PartnerRow, "id" | "name" | "slug" | "profile_status" | "profile_reviewed_at">>;
      if (partnerRows.length === 0) return [];

      // Récupère les metadata CGV (1 par partner ou aucune)
      const ids = partnerRows.map((p) => p.id);
      const { data: meta, error: mErr } = await supabase
        .from("partner_cgv_metadata")
        .select("partner_id, current_cgv_id, current_version, last_updated_at")
        .in("partner_id", ids);
      if (mErr) throw mErr;
      type MetaRow = { partner_id: string; current_cgv_id: string | null; current_version: number | null; last_updated_at: string | null };
      const metaList = (meta ?? []) as MetaRow[];
      const metaMap = new Map<string, MetaRow>(metaList.map((m) => [m.partner_id, m]));

      return partnerRows.map((p) => {
        const m = metaMap.get(p.id);
        return {
          id: p.id,
          name: p.name,
          slug: p.slug ?? null,
          profile_status: p.profile_status ?? null,
          profile_reviewed_at: p.profile_reviewed_at ?? null,
          current_cgv_id: m?.current_cgv_id ?? null,
          current_version: m?.current_version ?? null,
          metadata_last_updated_at: m?.last_updated_at ?? null,
        };
      });
    },
  });

  const enriched = useMemo(
    () => (data ?? []).map((r) => ({ ...r, status: classifyCGVStatus(r) })),
    [data]
  );

  const counts = useMemo(() => {
    const c = { all: enriched.length, configured: 0, pending: 0, missing: 0 };
    for (const r of enriched) c[r.status]++;
    return c;
  }, [enriched]);

  const filtered = useMemo(() => {
    let rows = enriched;
    if (filterStatus !== "all") rows = rows.filter((r) => r.status === filterStatus);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) => r.name.toLowerCase().includes(q) || (r.slug ?? "").toLowerCase().includes(q));
    }
    return rows;
  }, [enriched, filterStatus, search]);

  const handleView = async (cgvId: string, label: string) => {
    setViewerLoadingId(cgvId);
    try {
      const { data, error } = await supabase.functions.invoke("get-signed-cgv-url", {
        body: { partner_cgv_id: cgvId },
      });
      if (error || !data?.url) {
        console.error("[admin CGV view]", error);
        toast.error("Impossible d'afficher le PDF (" + (error?.message ?? "inconnu") + ").");
        return;
      }
      setViewerTitle(label);
      setViewerUrl(data.url as string);
      setViewerOpen(true);
    } finally {
      setViewerLoadingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.rpc("delete_partner_cgv", { p_cgv_id: deleteTarget.cgvId });
      if (error) {
        console.error("[admin CGV delete]", error);
        toast.error("Échec de la suppression : " + (error.message || "inconnu"));
        return;
      }
      const payload = (data ?? {}) as { action?: string; storage_path?: string; acceptances_count?: number };
      if (payload.action === "deleted" && payload.storage_path) {
        const { error: storageErr } = await supabase.storage.from("partner-cgv").remove([payload.storage_path]);
        if (storageErr) console.warn("[admin CGV storage cleanup]", storageErr);
      }
      if (payload.action === "archived") {
        toast.success(`CGV archivée (preuves d'acceptation préservées : ${payload.acceptances_count ?? 0}).`);
      } else {
        toast.success("CGV supprimée.");
      }
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-cgv-overview"] });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Suivi CGV partenaires</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vue d'ensemble des CGV des marques approuvées. Un partenaire avec badge « Manquant » bloque la vente Vague 2.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(["all", "configured", "pending", "missing"] as const).map((s) => (
              <Button
                key={s}
                variant={filterStatus === s ? "default" : "outline"}
                onClick={() => setFilterStatus(s)}
                className="justify-between"
              >
                <span className="capitalize">
                  {s === "all" ? "Tous" : s === "configured" ? "Configuré" : s === "pending" ? "En attente" : "Manquant"}
                </span>
                <Badge variant="secondary">{counts[s]}</Badge>
              </Button>
            ))}
          </div>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Rechercher par nom ou slug…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Partenaires ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-6"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">Aucun partenaire ne correspond aux filtres.</p>
          ) : (
            <ul className="divide-y">
              {filtered.map((r) => (
                <li key={r.id} className="py-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <div className="min-w-[200px]">
                    <div className="font-medium">{r.name}</div>
                    {r.slug ? <div className="text-xs text-muted-foreground">{r.slug}</div> : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {r.current_version ? <span>CGV v{r.current_version}</span> : <span>Aucune CGV</span>}
                    {r.metadata_last_updated_at ? (
                      <span>· MAJ {new Date(r.metadata_last_updated_at).toLocaleDateString()}</span>
                    ) : null}
                    {r.profile_reviewed_at && !r.current_cgv_id ? (
                      <span>· approuvé {new Date(r.profile_reviewed_at).toLocaleDateString()}</span>
                    ) : null}
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <StatusBadge status={r.status} />
                    {r.current_cgv_id ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleView(r.current_cgv_id!, `${r.name} — CGV v${r.current_version}`)}
                          disabled={viewerLoadingId === r.current_cgv_id}
                        >
                          {viewerLoadingId === r.current_cgv_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget({ cgvId: r.current_cgv_id!, partnerName: r.name, version: r.current_version ?? 0 })}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Bouton « Relancer marque » via email — Dette 106 capturée (Edge Function send-cgv-reminder-email à venir, ne bloque pas le MVP Phase 3).
      </p>

      <PDFViewerModal
        open={viewerOpen}
        url={viewerUrl}
        onOpenChange={(o) => {
          setViewerOpen(o);
          if (!o) setViewerUrl(null);
        }}
        title={viewerTitle}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette CGV ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? (
                <>
                  Vous êtes sur le point de supprimer la <strong>CGV v{deleteTarget.version}</strong> de <strong>{deleteTarget.partnerName}</strong>.
                  <br /><br />
                  Si elle n'a pas encore été acceptée par un client, elle sera <strong>définitivement supprimée</strong>.
                  Sinon, elle sera <strong>archivée</strong> pour préserver les preuves d'acceptation (obligation légale).
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); void handleConfirmDelete(); }}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmer la suppression
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
