// ============================================================================
// AdminApplications — partner application review (extracted from Admin.tsx)
// Dette 30 (2026-05-06).
//
// Pattern : table + drawer detail view inline. Uses canonical admin
// design language (cf. docs/design/ADMIN_DESIGN_LANGUAGE.md) :
//   - Card sections : border-border rounded-xl p-5 space-y-4
//   - Section headers : font-display text-sm font-bold
//   - Eyebrow labels : text-[10px] uppercase tracking-wider
//
// Note : refactor mechanical (no UI rewrite). HTML-native inputs preserved
// inline for now ; conversion to shadcn primitives deferred to Session 3
// (Dette 24 ProductForm refonte) per design language guideline §4.1
// (touch-when-touched migration).
// ============================================================================

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ClipboardList,
  Eye,
} from "lucide-react";

const APP_STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string; bg: string }> = {
  pending:        { label: "En attente",           icon: Clock,           color: "#BA7517", bg: "#FAEEDA" },
  info_requested: { label: "Infos demandées",      icon: AlertTriangle,   color: "#B45309", bg: "#FEF3C7" },
  approved:       { label: "Approuvée",            icon: CheckCircle2,    color: "#085041", bg: "#E1F5EE" },
  rejected:       { label: "Rejetée",              icon: XCircle,         color: "#791F1F", bg: "#FCF0F0" },
  suspended:      { label: "Suspendue",            icon: XCircle,         color: "#791F1F", bg: "#FCF0F0" },
};

const VOLUME_LABELS: Record<string, string> = {
  under_50k:   "Moins de 50 000 €",
  "50k_200k":  "50k – 200k €",
  "200k_500k": "200k – 500k €",
  over_500k:   "Plus de 500 000 €",
};

export default function AdminApplications() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<any>(null);
  const [filter, setFilter] = useState("all");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [processing, setProcessing] = useState(false);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["partner_applications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("partner_applications").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = filter === "all" ? applications : applications.filter((a: any) => a.status === filter);
  const counts = {
    all: applications.length,
    pending: applications.filter((a: any) => a.status === "pending").length,
    info_requested: applications.filter((a: any) => a.status === "info_requested").length,
    approved: applications.filter((a: any) => a.status === "approved").length,
    rejected: applications.filter((a: any) => a.status === "rejected").length,
  };

  const [infoRequestMessage, setInfoRequestMessage] = useState("");
  const [showInfoForm, setShowInfoForm] = useState(false);

  const updateStatus = async (id: string, status: string, reason?: string) => {
    setProcessing(true);
    try {
      const updates: any = { status, reviewed_at: new Date().toISOString() };
      if (reason) updates.rejection_reason = reason;
      const { error } = await supabase.from("partner_applications").update(updates).eq("id", id);
      if (error) throw error;

      // Auto-create partner record on approval
      if (status === "approved") {
        const app = applications.find((a: any) => a.id === id);
        if (app) {
          const slug = app.company_name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
          const { data: newPartner, error: partnerError } = await supabase
            .from("partners")
            .insert({
              name: app.company_name,
              slug: slug,
              partner_type: app.partner_type || "manufacturer",
              partner_mode: app.partner_mode || "standard",
              plan: app.selected_plan || "starter",
              country: app.country,
              contact_email: app.email,
              contact_name: app.contact_name,
              is_active: true,
            })
            .select("id")
            .single();
          if (partnerError) {
            toast.error("Erreur lors de la création du partenaire : " + partnerError.message);
          } else if (newPartner) {
            await supabase
              .from("partner_applications")
              .update({ created_partner_id: newPartner.id })
              .eq("id", id);
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["partner_applications"] });
      queryClient.invalidateQueries({ queryKey: ["partner_applications_pending"] });
      queryClient.invalidateQueries({ queryKey: ["admin_partners"] });
      if (status === "approved") toast.success("Candidature approuvée — le profil partenaire a été créé automatiquement.");
      else if (status === "rejected") toast.success("Candidature rejetée.");
      else if (status === "info_requested") toast.success("Demande d'informations envoyée.");
      setSelected((prev: any) => prev ? { ...prev, status, rejection_reason: reason } : null);
      setShowRejectForm(false);
      setShowInfoForm(false);
      setRejectionReason("");
      setInfoRequestMessage("");
    } catch { toast.error("Erreur lors de la mise à jour."); }
    finally { setProcessing(false); }
  };

  const sendInfoRequest = async (appId: string, message: string) => {
    setProcessing(true);
    try {
      // Single RPC handles UPDATE + email send atomically (Dette 59 Lot C).
      // Server-side via SECURITY DEFINER + is_admin() guard + pg_net to
      // send-notification-email with X-Trigger-Secret. Replaces the
      // 401-silent supabase.functions.invoke pattern.
      const { error } = await supabase.rpc("request_partner_application_info" as any, {
        p_application_id: appId,
        p_admin_message: message,
      });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["partner_applications"] });
      toast.success("Demande d'informations envoyée par email.");
      setSelected((prev: any) => prev ? { ...prev, status: "info_requested", admin_notes: message } : null);
      setShowInfoForm(false);
      setInfoRequestMessage("");
    } catch { toast.error("Erreur lors de l'envoi."); }
    finally { setProcessing(false); }
  };

  if (isLoading) return <p className="text-muted-foreground font-body text-sm">Chargement...</p>;

  if (selected) {
    const cfg = APP_STATUS_CONFIG[selected.status] || APP_STATUS_CONFIG.pending;
    const StatusIcon = cfg.icon;
    return (
      <div>
        <button onClick={() => { setSelected(null); setShowRejectForm(false); }}
          className="flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-3 w-3" /> Retour
        </button>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6" style={{ background: cfg.bg }}>
          <StatusIcon className="h-4 w-4" style={{ color: cfg.color }} />
          <span className="font-display font-semibold text-sm" style={{ color: cfg.color }}>{cfg.label}</span>
          {selected.reviewed_at && (
            <span className="text-[10px] font-body ml-auto" style={{ color: cfg.color }}>
              {new Date(selected.reviewed_at).toLocaleDateString("fr-FR")}
            </span>
          )}
        </div>
        <div className="space-y-5">
          <div className="border border-border rounded-xl p-5">
            <h3 className="font-display font-semibold text-sm text-foreground mb-4">Entreprise</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Entreprise", value: selected.company_name },
                { label: "Contact",    value: selected.contact_name },
                { label: "Email",      value: selected.contact_email },
                { label: "Telephone",  value: selected.phone },
                { label: "Site web",   value: selected.website },
                { label: "TVA",        value: selected.vat_number },
                { label: "Pays",       value: selected.country },
                { label: "Type",       value: selected.partner_type },
                { label: "Volume",     value: VOLUME_LABELS[selected.estimated_annual_volume] || selected.estimated_annual_volume },
              ].filter(({ value }) => value).map(({ label, value }) => (
                <div key={label}>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-body">{label}</span>
                  <p className="text-sm font-body text-foreground">{value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {selected.product_categories?.length > 0 && (
              <div className="border border-border rounded-xl p-4">
                <h3 className="font-display font-semibold text-xs text-foreground mb-2">Categories</h3>

                <div className="flex flex-wrap gap-1">
                  {selected.product_categories.map((c: string) => (
                    <span key={c} className="text-[10px] bg-card border border-border text-muted-foreground px-2 py-0.5 rounded-full">{c}</span>
                  ))}
                </div>
              </div>
            )}
            {selected.delivery_countries?.length > 0 && (
              <div className="border border-border rounded-xl p-4">
                <h3 className="font-display font-semibold text-xs text-foreground mb-2">Pays de livraison</h3>
                <div className="flex flex-wrap gap-1">
                  {selected.delivery_countries.map((c: string) => (
                    <span key={c} className="text-[10px] bg-card border border-border text-muted-foreground px-2 py-0.5 rounded-full">{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          {selected.message && (
            <div className="border border-border rounded-xl p-5">
              <h3 className="font-display font-semibold text-sm text-foreground mb-2">Message</h3>
              <p className="text-sm font-body text-muted-foreground">{selected.message}</p>
            </div>
          )}
          {selected.admin_notes && selected.status === "info_requested" && (
            <div className="border border-amber-200 bg-amber-50 rounded-xl p-4">
              <h3 className="font-display font-semibold text-xs text-amber-800 mb-1">Informations demandées</h3>
              <p className="text-sm font-body text-amber-700">{selected.admin_notes}</p>
            </div>
          )}
          {selected.rejection_reason && (
            <div className="border border-red-200 bg-red-50 rounded-xl p-4">
              <h3 className="font-display font-semibold text-xs text-red-700 mb-1">Motif du rejet</h3>
              <p className="text-sm font-body text-red-600">{selected.rejection_reason}</p>
            </div>
          )}
        </div>
        {(selected.status === "pending" || selected.status === "info_requested") && (
          <div className="space-y-4 mt-6">
            <div className="flex gap-3 flex-wrap">
              <button onClick={() => updateStatus(selected.id, "approved")} disabled={processing}
                className="flex items-center gap-2 px-6 py-2.5 font-display font-semibold text-sm bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50">
                <CheckCircle2 className="h-4 w-4" /> {processing ? "Traitement..." : "Approuver"}
              </button>
              <button onClick={() => { setShowInfoForm(!showInfoForm); setShowRejectForm(false); }} disabled={processing}
                className="flex items-center gap-2 px-6 py-2.5 font-display font-semibold text-sm border border-amber-200 text-amber-700 rounded-full hover:bg-amber-50">
                <AlertTriangle className="h-4 w-4" /> Demander des informations
              </button>
              <button onClick={() => { setShowRejectForm(!showRejectForm); setShowInfoForm(false); }} disabled={processing}
                className="flex items-center gap-2 px-6 py-2.5 font-display font-semibold text-sm border border-red-200 text-red-600 rounded-full hover:bg-red-50">
                <XCircle className="h-4 w-4" /> Rejeter
              </button>
            </div>
            {showInfoForm && (
              <div className="space-y-3 border border-amber-200 bg-amber-50/30 rounded-xl p-4">
                <label className="text-xs font-display font-semibold text-amber-800">Quelles informations souhaitez-vous ?</label>
                <textarea value={infoRequestMessage} onChange={e => setInfoRequestMessage(e.target.value)}
                  rows={3} placeholder="Ex: Pourriez-vous nous fournir votre catalogue produit et vos conditions de livraison ?"
                  className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-sm font-body outline-none focus:border-amber-400 resize-none" />
                <div className="flex gap-2">
                  <button onClick={() => sendInfoRequest(selected.id, infoRequestMessage)} disabled={processing || !infoRequestMessage.trim()}
                    className="px-5 py-2 font-display font-semibold text-xs bg-amber-600 text-white rounded-full hover:bg-amber-700 disabled:opacity-50">
                    Envoyer la demande
                  </button>
                  <button onClick={() => setShowInfoForm(false)}
                    className="px-5 py-2 font-display font-semibold text-xs border border-border text-muted-foreground rounded-full">
                    Annuler
                  </button>
                </div>
              </div>
            )}
            {showRejectForm && (
              <div className="space-y-3 border border-border rounded-xl p-4">
                <label className="text-xs font-body text-muted-foreground">Motif du rejet (optionnel)</label>
                <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                  rows={3} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-body outline-none focus:border-foreground resize-none" />
                <div className="flex gap-2">
                  <button onClick={() => updateStatus(selected.id, "rejected", rejectionReason)} disabled={processing}
                    className="px-5 py-2 font-display font-semibold text-xs bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50">
                    Confirmer le rejet
                  </button>
                  <button onClick={() => setShowRejectForm(false)}
                    className="px-5 py-2 font-display font-semibold text-xs border border-border text-muted-foreground rounded-full">
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {selected.status === "approved" && (
          <button onClick={() => updateStatus(selected.id, "suspended")} disabled={processing}
            className="flex items-center gap-2 px-5 py-2.5 font-display font-semibold text-sm border border-red-200 text-red-600 rounded-full hover:bg-red-50 mt-6">
            Suspendre le partenaire
          </button>
        )}
        {selected.status === "suspended" && (
          <button onClick={() => updateStatus(selected.id, "approved")} disabled={processing}
            className="flex items-center gap-2 px-5 py-2.5 font-display font-semibold text-sm bg-green-600 text-white rounded-full mt-6">
            Reactiver
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-1 mb-6">
        {[
          { id: "all", label: "Toutes" },
          { id: "pending", label: "En attente" },
          { id: "approved", label: "Approuvees" },
          { id: "rejected", label: "Rejetees" },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-display font-semibold rounded-full transition-all ${
              filter === f.id ? "bg-foreground text-primary-foreground" : "border border-border text-muted-foreground hover:border-foreground"
            }`}>
            {f.label}
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${filter === f.id ? "bg-white/20" : "bg-card"}`}>
              {counts[f.id as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-body text-muted-foreground">
            {filter === "all" ? "Aucune candidature." : `Aucune candidature ${filter}.`}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-border">
                {["Date","Entreprise","Contact","Pays","Type","Volume","Statut",""].map(h => (
                  <th key={h} className={`py-3 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-normal ${h === "" ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((app: any) => {
                const c = APP_STATUS_CONFIG[app.status] || APP_STATUS_CONFIG.pending;
                return (
                  <tr key={app.id} className="border-b border-border/50 hover:bg-card/50 transition-colors">
                    <td className="py-3 px-2 text-[10px] text-muted-foreground">{new Date(app.created_at).toLocaleDateString("fr-FR")}</td>
                    <td className="py-3 px-2 font-display font-semibold text-xs text-foreground">{app.company_name}</td>
                    <td className="py-3 px-2 text-xs text-muted-foreground">{app.contact_name}</td>
                    <td className="py-3 px-2 text-xs text-muted-foreground">{app.country}</td>
                    <td className="py-3 px-2">
                      <span className="text-[10px] bg-card border border-border rounded px-1.5 py-0.5 capitalize text-muted-foreground">{app.partner_type}</span>
                    </td>
                    <td className="py-3 px-2 text-[10px] text-muted-foreground">{VOLUME_LABELS[app.estimated_annual_volume] || "—"}</td>
                    <td className="py-3 px-2">
                      <span className="text-[9px] font-display font-semibold px-2 py-1 rounded-full capitalize"
                        style={{ background: c.bg, color: c.color }}>{app.status}</span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button onClick={() => setSelected(app)} className="text-muted-foreground hover:text-foreground">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
