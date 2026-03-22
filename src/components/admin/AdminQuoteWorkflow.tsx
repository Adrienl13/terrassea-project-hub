import { useState, lazy, Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePaymentFlow } from "@/hooks/usePaymentFlow";
import {
  Search, Eye, ArrowLeft, FileText, Clock, CheckCircle2,
  XCircle, Package, MapPin, Building2, PenTool, Download,
  Send, ChevronRight, ChevronDown, AlertTriangle, User,
  Truck, CreditCard, ShoppingCart,
} from "lucide-react";

const QuotePdfViewer = lazy(() => import("@/components/quotes/QuotePdfViewer"));

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending:  { label: "En attente",     color: "#D97706", bg: "#FFFBEB", icon: Clock },
  replied:  { label: "Devis reçu",     color: "#2563EB", bg: "#EFF6FF", icon: FileText },
  accepted: { label: "Accepté",        color: "#059669", bg: "#ECFDF5", icon: CheckCircle2 },
  signed:   { label: "Signé",          color: "#059669", bg: "#ECFDF5", icon: PenTool },
  expired:  { label: "Expiré",         color: "#6B7280", bg: "#F3F4F6", icon: XCircle },
  cancelled:{ label: "Annulé",         color: "#DC2626", bg: "#FEF2F2", icon: XCircle },
};

const STATUSES = ["pending", "replied", "accepted", "signed", "expired", "cancelled"];

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function AdminQuoteWorkflow() {
  const queryClient = useQueryClient();
  const { createOrderFromQuote, isCreatingOrder } = usePaymentFlow();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Fetch all quote_requests with partner info
  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["admin-quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_requests")
        .select("*, project:project_request_id(project_name, city, venue_type)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all partners for assignment dropdown
  const { data: partners = [] } = useQuery({
    queryKey: ["admin_partners_list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, name, slug, country_code, plan")
        .eq("is_active", true)
        .order("name");
      if (error) {
        console.error("Failed to fetch partners list:", error.message);
        return [];
      }
      return data || [];
    },
  });

  // Check if an order already exists for the selected quote
  const { data: existingOrder } = useQuery({
    queryKey: ["admin-quote-order", selectedId],
    queryFn: async () => {
      if (!selectedId) return null;
      const { data } = await supabase
        .from("orders")
        .select("id")
        .eq("quote_request_id", selectedId)
        .maybeSingle();
      return data;
    },
    enabled: !!selectedId,
  });

  const filtered = quotes.filter((q: any) => {
    const matchStatus = filter === "all" || q.status === filter;
    const matchSearch = !search ||
      (q.product_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (q.partner_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (q.first_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (q.email || "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts: Record<string, number> = { all: quotes.length };
  STATUSES.forEach(s => { counts[s] = quotes.filter((q: any) => q.status === s).length; });

  const selected = selectedId ? quotes.find((q: any) => q.id === selectedId) : null;

  const notifyUser = async (email: string, title: string, body: string, link: string) => {
    const { data: profile } = await supabase.from("user_profiles").select("id").eq("email", email).maybeSingle();
    if (profile) {
      await supabase.from("notifications").insert({ user_id: profile.id, title, body, type: "info", link });
    }
  };

  const updateQuoteStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("quote_requests")
      .update({ status })
      .eq("id", id);
    if (error) { toast.error("Erreur : " + error.message); return; }
    toast.success(`Statut mis à jour : ${STATUS_CONFIG[status]?.label || status}`);
    queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });

    // Notify client of quote status change
    const quote = quotes.find((q: any) => q.id === id);
    if (quote?.email) {
      const notifMap: Record<string, string> = {
        replied: "Un fournisseur a répondu à votre demande de devis",
        expired: "Votre devis a expiré",
        cancelled: "Votre devis a été annulé",
      };
      const message = notifMap[status];
      if (message) {
        await notifyUser(quote.email, "Mise à jour devis", message, "/account?tab=quotes");
      }
    }
  };

  const assignPartner = async (quoteId: string, partnerId: string, partnerName: string) => {
    const { error } = await supabase
      .from("quote_requests")
      .update({ partner_id: partnerId, partner_name: partnerName })
      .eq("id", quoteId);
    if (error) { toast.error("Erreur : " + error.message); return; }
    toast.success(`Partenaire assigné : ${partnerName}`);
    queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });

    // Non-blocking: notify the partner
    try {
      // Find the partner's contact_email, then look up their user profile
      const { data: partner } = await supabase
        .from("partners")
        .select("contact_email")
        .eq("id", partnerId)
        .single();

      if (partner?.contact_email) {
        // Find the user_profile by email
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("email", partner.contact_email)
          .maybeSingle();

        // Insert in-app notification
        if (profile?.id) {
          await supabase.from("notifications").insert({
            user_id: profile.id,
            title: "Nouveau devis assigné",
            body: "Un nouveau devis vous a été assigné",
            type: "quote_assigned",
            link: "/partner/quotes",
          } as Record<string, unknown>);
        }

        // Send email notification
        await supabase.functions.invoke("send-notification-email", {
          body: {
            to: partner.contact_email,
            subject: "Terrassea — Un nouveau devis vous a été assigné",
            body_html: `<p>Bonjour ${partnerName},</p><p>Un nouveau devis vous a été assigné sur Terrassea. Connectez-vous à votre espace partenaire pour le consulter.</p><p>Cordialement,<br/>L'équipe Terrassea</p>`,
            body_text: `Bonjour ${partnerName}, un nouveau devis vous a été assigné sur Terrassea. Connectez-vous à votre espace partenaire pour le consulter.`,
          },
        });
      }
    } catch (err) {
      console.warn("Failed to notify partner about quote assignment:", err);
    }
  };

  // ── Detail view ──
  if (selected) {
    const sc = STATUS_CONFIG[selected.status] || STATUS_CONFIG.pending;
    const project = selected.project;
    return (
      <div className="space-y-5">
        <button onClick={() => setSelectedId(null)}
          className="flex items-center gap-1.5 text-xs font-body text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour aux devis
        </button>

        {/* Header */}
        <div className="border border-border rounded-xl p-5 bg-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display font-bold text-lg">{selected.product_name || "—"}</h2>
              <p className="text-xs font-body text-muted-foreground mt-0.5">
                {project?.project_name || "Pas de projet lié"} · {selected.quantity || 0} pcs
              </p>
            </div>
            <span className="text-[10px] font-display font-semibold uppercase px-3 py-1.5 rounded-full" style={{ background: sc.bg, color: sc.color }}>
              <sc.icon className="h-3 w-3 inline mr-1" /> {sc.label}
            </span>
          </div>
        </div>

        {/* Quick status change */}
        <div>
          <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-2">Changer le statut</p>
          <div className="flex gap-2 flex-wrap">
            {STATUSES.map(s => {
              const cfg = STATUS_CONFIG[s];
              const isActive = selected.status === s;
              return (
                <button
                  key={s}
                  onClick={() => !isActive && updateQuoteStatus(selected.id, s)}
                  className={`text-[10px] font-display font-semibold px-3 py-1.5 rounded-full border-2 transition-all ${
                    isActive ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/20"
                  }`}
                  style={isActive ? { borderColor: cfg.color, color: cfg.color } : undefined}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Client & partner info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Client */}
          <div className="border border-border rounded-xl p-4">
            <h3 className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> Client
            </h3>
            <div className="space-y-2 text-xs font-body">
              <div><span className="text-muted-foreground">Nom :</span> <span className="text-foreground font-semibold">{selected.first_name} {selected.last_name}</span></div>
              <div><span className="text-muted-foreground">Email :</span> <span className="text-foreground">{selected.email}</span></div>
              <div><span className="text-muted-foreground">Société :</span> <span className="text-foreground">{selected.company || "—"}</span></div>
              <div><span className="text-muted-foreground">SIREN :</span> <span className="text-foreground">{selected.siren || "—"}</span></div>
              {selected.client_city && <div><span className="text-muted-foreground">Ville livraison :</span> <span className="text-foreground">{selected.client_city}</span></div>}
              {selected.message && <div className="pt-2 border-t border-border"><span className="text-muted-foreground">Message :</span><p className="text-foreground mt-0.5 italic">"{selected.message}"</p></div>}
            </div>
          </div>

          {/* Partner assignment */}
          <div className="border border-border rounded-xl p-4">
            <h3 className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Fournisseur assigné
            </h3>
            {selected.partner_name ? (
              <div className="space-y-2 text-xs font-body">
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-semibold">{selected.partner_name}</span>
                  {selected.supplier_country_code && (
                    <span className="text-sm">{countryFlag(selected.supplier_country_code)}</span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs font-body text-muted-foreground mb-2">Aucun fournisseur assigné</p>
            )}
            <div className="mt-3">
              <label className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                {selected.partner_name ? "Réassigner" : "Assigner un fournisseur"}
              </label>
              <select
                value={selected.partner_id || ""}
                onChange={(e) => {
                  const p = partners.find((p: any) => p.id === e.target.value);
                  if (p) assignPartner(selected.id, p.id, p.name);
                }}
                className="w-full text-sm font-body bg-white border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-foreground/40"
              >
                <option value="">— Sélectionner —</option>
                {partners.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.plan})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Quote details */}
        <div className="border border-border rounded-xl p-4">
          <h3 className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5" /> Détails financiers
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="border border-border rounded-lg p-3">
              <p className="text-[9px] font-display font-semibold uppercase text-muted-foreground">Quantité</p>
              <p className="text-sm font-display font-bold mt-0.5">{selected.quantity || "—"} pcs</p>
            </div>
            <div className="border border-border rounded-lg p-3">
              <p className="text-[9px] font-display font-semibold uppercase text-muted-foreground">Prix unitaire</p>
              <p className="text-sm font-display font-bold mt-0.5">{selected.unit_price ? `€${selected.unit_price}` : "—"}</p>
            </div>
            <div className="border border-border rounded-lg p-3">
              <p className="text-[9px] font-display font-semibold uppercase text-muted-foreground">Total</p>
              <p className="text-sm font-display font-bold text-[#D4603A] mt-0.5">{selected.total_price ? `€${Number(selected.total_price).toLocaleString()}` : "—"}</p>
            </div>
            <div className="border border-border rounded-lg p-3">
              <p className="text-[9px] font-display font-semibold uppercase text-muted-foreground">Signé le</p>
              <p className="text-sm font-display font-bold mt-0.5">{selected.signed_at ? new Date(selected.signed_at).toLocaleDateString("fr-FR") : "—"}</p>
            </div>
          </div>
        </div>

        {/* Create order button — only for accepted/signed quotes without an existing order */}
        {(selected.status === "accepted" || selected.status === "signed") && !existingOrder && (
          <div className="border border-border rounded-xl p-4">
            <button
              onClick={() => {
                createOrderFromQuote(selected.id, {
                  onSuccess: () => {
                    toast.success("Commande créée avec succès");
                    queryClient.invalidateQueries({ queryKey: ["admin-quote-order", selected.id] });
                    queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
                  },
                  onError: (err: Error) => {
                    toast.error("Erreur : " + err.message);
                  },
                });
              }}
              disabled={isCreatingOrder}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-xs font-display font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ShoppingCart className="h-4 w-4" />
              {isCreatingOrder ? "Création en cours…" : "Créer la commande"}
            </button>
            <p className="text-[10px] font-body text-muted-foreground mt-2">
              Génère une commande avec appel de fonds (acompte + solde) et envoie les instructions de paiement au client.
            </p>
          </div>
        )}
        {(selected.status === "accepted" || selected.status === "signed") && existingOrder && (
          <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-4">
            <p className="text-xs font-display font-semibold text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Commande déjà créée
            </p>
            <p className="text-[10px] font-body text-emerald-600 mt-1">
              ID : {existingOrder.id.slice(0, 8)}…
            </p>
          </div>
        )}

        {/* Documents PDF */}
        <div className="border border-border rounded-xl p-4">
          <h3 className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Documents
          </h3>
          <Suspense fallback={<div className="h-12 animate-pulse bg-card rounded-lg" />}>
            <QuotePdfViewer quoteRequestId={selected.id} />
          </Suspense>
        </div>

        {/* Project link */}
        {project && (
          <div className="border border-border rounded-xl p-4">
            <h3 className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" /> Projet lié
            </h3>
            <div className="text-xs font-body">
              <p className="font-display font-semibold text-foreground">{project.project_name}</p>
              <p className="text-muted-foreground">{project.city || "—"} · {project.venue_type || "—"}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── List view ──
  if (isLoading) return <p className="text-muted-foreground font-body text-sm">Chargement...</p>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-bold text-lg">Workflow devis</h2>
        <p className="text-xs font-body text-muted-foreground mt-0.5">
          Gérez toutes les demandes de devis : assignez des fournisseurs, changez les statuts, consultez les PDFs.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {STATUSES.map(s => {
          const cfg = STATUS_CONFIG[s];
          return (
            <div key={s} className="text-center px-3 py-2.5 rounded-lg border border-border" style={{ background: cfg.bg }}>
              <p className="font-display font-bold text-lg" style={{ color: cfg.color }}>{counts[s] || 0}</p>
              <p className="text-[9px] font-display font-semibold" style={{ color: cfg.color }}>{cfg.label}</p>
            </div>
          );
        })}
      </div>

      {/* Search + Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par produit, client, fournisseur…"
            className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-xs font-body focus:outline-none focus:border-foreground/40" />
        </div>
      </div>

      <div className="flex gap-1 flex-wrap">
        {[{ id: "all", label: "Tous" }, ...STATUSES.map(s => ({ id: s, label: STATUS_CONFIG[s].label }))].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`text-[10px] font-display font-semibold px-3 py-1.5 rounded-full transition-all ${
              filter === f.id ? "bg-foreground text-primary-foreground" : "border border-border text-muted-foreground hover:border-foreground/20"
            }`}>
            {f.label} ({counts[f.id] || 0})
          </button>
        ))}
      </div>

      {/* Quote list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-body text-muted-foreground">Aucun devis avec ce filtre.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((q: any) => {
            const sc = STATUS_CONFIG[q.status] || STATUS_CONFIG.pending;
            return (
              <div
                key={q.id}
                onClick={() => setSelectedId(q.id)}
                className="flex items-center gap-3 px-4 py-3 border border-border rounded-xl hover:border-foreground/15 transition-colors cursor-pointer group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-display font-bold text-foreground group-hover:text-[#D4603A] truncate">{q.product_name || "—"}</p>
                    <span className="text-[9px] font-display font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: sc.bg, color: sc.color }}>
                      {sc.label}
                    </span>
                    {q.latest_pdf_path && <FileText className="h-3 w-3 text-red-500 shrink-0" />}
                    {q.signed_at && <PenTool className="h-3 w-3 text-emerald-500 shrink-0" />}
                  </div>
                  <p className="text-[10px] font-body text-muted-foreground mt-0.5">
                    {q.first_name} {q.last_name} · {q.email}
                    {q.partner_name && <span className="ml-1.5">→ {q.partner_name}</span>}
                    {q.supplier_country_code && <span className="ml-1"> {countryFlag(q.supplier_country_code)}</span>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-display font-bold">{q.total_price ? `€${Number(q.total_price).toLocaleString()}` : "—"}</p>
                  <p className="text-[9px] font-body text-muted-foreground">{q.quantity || 0} pcs</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Helper ──────────────────────────────────────────────────────────────────────

function countryFlag(code: string | null): string {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(
    ...code.toUpperCase().split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}
