import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Landmark, Clock, CheckCircle2, XCircle, Send,
  ChevronDown, ChevronUp, AlertTriangle, FileText,
} from "lucide-react";

interface FinancingRequest {
  id: string;
  user_id: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  company: string | null;
  siren: string | null;
  estimated_amount: number | null;
  desired_duration_months: number | null;
  project_description: string | null;
  project_request_id: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  nouvelle:          { label: "Nouvelle",          color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",    icon: Clock },
  en_cours:          { label: "En cours d'analyse",color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",  icon: Clock },
  documents_requis:  { label: "Documents requis",  color: "text-orange-700", bg: "bg-orange-50 border-orange-200", icon: FileText },
  documents_soumis:  { label: "Documents reçus",   color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: FileText },
  transmise:         { label: "Transmise",         color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",    icon: Send },
  acceptee:          { label: "Acceptée",          color: "text-green-700",  bg: "bg-green-50 border-green-200",  icon: CheckCircle2 },
  refusee:           { label: "Refusée",           color: "text-red-700",    bg: "bg-red-50 border-red-200",      icon: XCircle },
};

const ALL_STATUSES = ["nouvelle", "en_cours", "documents_requis", "documents_soumis", "transmise", "acceptee", "refusee"];

export default function AdminFinancing() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState<Record<string, string>>({});

  const { data: requests = [], isLoading } = useQuery<FinancingRequest[]>({
    queryKey: ["financing-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financing_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FinancingRequest[];
    },
  });

  const filtered = statusFilter === "all"
    ? requests
    : requests.filter(r => r.status === statusFilter);

  const statusCounts = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = requests.filter(r => r.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const updates: Record<string, unknown> = { status: newStatus };
      const notes = editNotes[id];
      if (notes !== undefined) updates.admin_notes = notes;

      const { error } = await supabase
        .from("financing_requests")
        .update(updates)
        .eq("id", id);
      if (error) throw error;

      // Notify client
      const req = requests.find(r => r.id === id);
      if (req?.user_id) {
        const cfg = STATUS_CONFIG[newStatus];
        await supabase.from("notifications").insert({
          user_id: req.user_id,
          title: "Financement — " + (cfg?.label || newStatus),
          body: newStatus === "documents_requis"
            ? "Merci d'envoyer vos documents par email pour finaliser votre demande."
            : newStatus === "acceptee"
            ? "Votre demande de financement a été acceptée !"
            : newStatus === "refusee"
            ? "Votre demande de financement n'a pas été retenue."
            : `Votre demande de financement est passée au statut : ${cfg?.label || newStatus}`,
          type: newStatus === "acceptee" ? "success" : newStatus === "refusee" ? "warning" : "info",
        }).catch(() => {});
      }

      queryClient.invalidateQueries({ queryKey: ["financing-requests"] });
      toast.success(`Statut mis à jour : ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setUpdatingId(null);
    }
  };

  const saveNotes = async (id: string) => {
    const notes = editNotes[id];
    if (notes === undefined) return;
    try {
      const { error } = await supabase
        .from("financing_requests")
        .update({ admin_notes: notes })
        .eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["financing-requests"] });
      toast.success("Notes enregistrées");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
          <Landmark className="h-5 w-5" />
          Demandes de financement
        </h2>
        <p className="text-xs font-body text-muted-foreground mt-0.5">
          {requests.length} demande{requests.length > 1 ? "s" : ""} au total
        </p>
      </div>

      {/* Status filter */}
      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => setStatusFilter("all")}
          className={`px-3 py-1.5 text-[10px] font-display font-semibold rounded-lg border transition-colors ${
            statusFilter === "all" ? "bg-foreground text-primary-foreground border-foreground" : "border-border text-muted-foreground hover:text-foreground"
          }`}>
          Toutes ({requests.length})
        </button>
        {ALL_STATUSES.map(s => {
          const cfg = STATUS_CONFIG[s];
          const count = statusCounts[s] || 0;
          if (count === 0 && !["nouvelle", "en_cours", "acceptee", "refusee"].includes(s)) return null;
          return (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-[10px] font-display font-semibold rounded-lg border transition-colors ${
                statusFilter === s ? `${cfg.bg} ${cfg.color}` : "border-border text-muted-foreground hover:text-foreground"
              }`}>
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 mx-auto rounded-full bg-foreground/5 flex items-center justify-center mb-3">
            <Landmark className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-body text-muted-foreground">Aucune demande de financement.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.nouvelle;
            const StatusIcon = cfg.icon;
            const isExpanded = expandedId === req.id;
            const date = new Date(req.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

            return (
              <div key={req.id} className="border border-border rounded-xl bg-card overflow-hidden">
                {/* Summary row */}
                <button onClick={() => setExpandedId(isExpanded ? null : req.id)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-foreground/[0.02] transition-colors">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${cfg.bg}`}>
                    <StatusIcon className={`h-4 w-4 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-display font-semibold text-sm text-foreground truncate">{req.contact_name}</p>
                      <span className={`text-[9px] font-display font-bold px-2 py-0.5 rounded-md border ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-[10px] font-body text-muted-foreground mt-0.5">
                      {req.company || "—"} · {req.siren || "—"} · {date}
                      {req.estimated_amount != null && ` · €${req.estimated_amount.toLocaleString("fr-FR")}`}
                      {req.desired_duration_months && ` · ${req.desired_duration_months} mois`}
                    </p>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border p-4 space-y-4 bg-card/50">
                    {/* Contact info */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <p className="text-[9px] font-display text-muted-foreground uppercase">Email</p>
                        <a href={`mailto:${req.contact_email}`} className="text-xs font-body text-foreground hover:underline">{req.contact_email}</a>
                      </div>
                      <div>
                        <p className="text-[9px] font-display text-muted-foreground uppercase">Téléphone</p>
                        <p className="text-xs font-body text-foreground">{req.contact_phone || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-display text-muted-foreground uppercase">SIREN</p>
                        <p className="text-xs font-body text-foreground">{req.siren || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-display text-muted-foreground uppercase">Entreprise</p>
                        <p className="text-xs font-body text-foreground">{req.company || "—"}</p>
                      </div>
                    </div>

                    {/* Financing details */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[9px] font-display text-muted-foreground uppercase">Montant estimé</p>
                        <p className="text-sm font-display font-bold text-foreground">
                          {req.estimated_amount != null ? `€${req.estimated_amount.toLocaleString("fr-FR")}` : "Non précisé"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-display text-muted-foreground uppercase">Durée souhaitée</p>
                        <p className="text-sm font-display font-bold text-foreground">
                          {req.desired_duration_months ? `${req.desired_duration_months} mois` : "Non précisé"}
                        </p>
                      </div>
                    </div>

                    {req.project_description && (
                      <div>
                        <p className="text-[9px] font-display text-muted-foreground uppercase mb-1">Description du projet</p>
                        <p className="text-xs font-body text-foreground bg-foreground/5 rounded-lg p-3">{req.project_description}</p>
                      </div>
                    )}

                    {/* Admin notes */}
                    <div>
                      <p className="text-[9px] font-display text-muted-foreground uppercase mb-1">Notes internes</p>
                      <div className="flex gap-2">
                        <textarea
                          value={editNotes[req.id] ?? req.admin_notes ?? ""}
                          onChange={e => setEditNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                          rows={2}
                          placeholder="Notes visibles uniquement par l'admin..."
                          className="flex-1 text-xs font-body bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-foreground resize-none" />
                        <button onClick={() => saveNotes(req.id)}
                          className="self-end px-3 py-2 text-[10px] font-display font-semibold border border-border rounded-lg hover:border-foreground/30 transition-colors shrink-0">
                          Sauver
                        </button>
                      </div>
                    </div>

                    {/* Status actions */}
                    <div>
                      <p className="text-[9px] font-display text-muted-foreground uppercase mb-2">Changer le statut</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ALL_STATUSES.filter(s => s !== req.status).map(s => {
                          const sc = STATUS_CONFIG[s];
                          return (
                            <button key={s} onClick={() => updateStatus(req.id, s)}
                              disabled={updatingId === req.id}
                              className={`flex items-center gap-1 px-3 py-1.5 text-[10px] font-display font-bold rounded-lg border transition-colors disabled:opacity-40 ${sc.bg} ${sc.color}`}>
                              <sc.icon className="h-3 w-3" />
                              {sc.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
