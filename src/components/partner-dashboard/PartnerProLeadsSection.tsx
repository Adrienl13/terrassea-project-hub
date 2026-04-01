import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePartnerLeads } from "@/hooks/usePartnerLeads";
import { toast } from "sonner";
import {
  Briefcase, MapPin, Calendar, Building2, EyeOff, Handshake,
  Target, ThumbsUp, ThumbsDown, Clock, AlertTriangle, Send,
} from "lucide-react";
import { type PartnerPlan, PLAN_CONFIG, PlanBadge } from "./PartnerSections";

const PROJECT_TYPE_LABELS: Record<string, string> = {
  hotel: "H\u00f4tel", restaurant: "Restaurant", bar: "Bar", "beach-club": "Beach Club",
  rooftop: "Rooftop", cafe: "Caf\u00e9", lounge: "Lounge", other: "Autre",
};

const TIMELINE_LABELS: Record<string, string> = {
  urgent: "Urgent", "1-month": "1 mois", "2-3-months": "2-3 mois",
  "6-months": "6 mois", flexible: "Flexible",
};

type ProLead = {
  id: string; project_title: string; project_type: string;
  project_city: string; project_country: string;
  categories_needed: string[]; style_preferences: string[];
  budget_range: string; quantity_estimate: number; timeline: string;
  description: string; match_score: number; match_status: string;
  created_at: string;
};

export function PartnerProLeadsSection({ plan }: { plan: PartnerPlan }) {
  const { t } = useTranslation();
  const config = PLAN_CONFIG[plan];
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "new" | "interested" | "connected">("all");

  const { leads: rawLeads, isLoading, expressInterest, declineLead, submitResponse, isSubmittingResponse } = usePartnerLeads();
  const [respondingLead, setRespondingLead] = useState<string | null>(null);
  const [responseForm, setResponseForm] = useState({ message: "", estimatedAmount: "", deliveryWeeks: "" });

  // Map DB leads to ProLead shape expected by the UI
  const leads: ProLead[] = rawLeads.map(l => ({
    id: l.id,
    project_title: l.project_title,
    project_type: l.project_type,
    project_city: l.project_city,
    project_country: l.project_country,
    categories_needed: l.categories_needed,
    style_preferences: l.style_preferences,
    budget_range: l.budget_range || "",
    quantity_estimate: l.quantity_estimate || 0,
    timeline: l.timeline || "",
    description: l.description || "",
    match_score: l.match_score,
    match_status: l.match_status,
    created_at: l.created_at,
  }));

  const filtered = filter === "all" ? leads
    : filter === "new" ? leads.filter(l => l.match_status === "sent_to_partner")
    : filter === "interested" ? leads.filter(l => l.match_status === "partner_interested")
    : leads.filter(l => l.match_status === "client_connected");

  const handleInterest = (id: string) => {
    expressInterest(id, {
      onSuccess: () => toast.success(t('pd.leads.interestToast'), { description: t('pd.leads.interestToastDesc') }),
      onError: () => toast.error("Failed to express interest"),
    });
  };

  const handleDecline = (id: string) => {
    declineLead(id, {
      onSuccess: () => toast(t('pd.leads.declinedToast')),
      onError: () => toast.error("Failed to decline lead"),
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display font-bold text-sm text-foreground flex items-center gap-2">
            <Briefcase className="h-4 w-4" /> Leads Pro Service
          </p>
          <p className="text-[10px] font-body text-muted-foreground mt-0.5">
            Demandes de projets match\u00e9es \u00e0 votre catalogue — donn\u00e9es client anonymis\u00e9es
          </p>
        </div>
        <PlanBadge plan={plan} />
      </div>

      {/* How it works */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: Target, label: "Match", desc: "L'algorithme vous sugg\u00e8re des leads" },
          { icon: EyeOff, label: "Anonyme", desc: "Donn\u00e9es client masqu\u00e9es" },
          { icon: ThumbsUp, label: "Int\u00e9r\u00eat", desc: "Vous exprimez votre int\u00e9r\u00eat" },
          { icon: Handshake, label: "Connexion", desc: "L'admin valide la relation" },
        ].map((s, i) => (
          <div key={i} className="border border-border rounded-sm p-2.5 text-center">
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center mx-auto mb-1.5">
              <s.icon className="h-3 w-3 text-muted-foreground" />
            </div>
            <p className="text-[9px] font-display font-bold text-foreground">{s.label}</p>
            <p className="text-[8px] font-body text-muted-foreground mt-0.5">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 bg-card border border-border rounded-sm p-0.5">
        {([
          { id: "all" as const, label: "Tous", count: leads.length },
          { id: "new" as const, label: "Nouveaux", count: leads.filter(l => l.match_status === "sent_to_partner").length },
          { id: "interested" as const, label: "Int\u00e9ress\u00e9", count: leads.filter(l => l.match_status === "partner_interested").length },
          { id: "connected" as const, label: "Connect\u00e9", count: leads.filter(l => l.match_status === "client_connected").length },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 text-[10px] font-display font-semibold rounded-sm transition-colors ${
              filter === tab.id ? "bg-foreground text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full ${
              filter === tab.id ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"
            }`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Leads list */}
      {isLoading ? (
        <div className="border border-border rounded-sm px-4 py-8 text-center">
          <Clock className="h-6 w-6 text-muted-foreground/20 mx-auto mb-2 animate-pulse" />
          <p className="text-xs font-body text-muted-foreground">Chargement des leads...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="border border-border rounded-sm px-4 py-8 text-center">
          <Briefcase className="h-6 w-6 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs font-body text-muted-foreground">No leads available yet. Your matching profile will be used to find relevant projects.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-border rounded-sm px-4 py-8 text-center">
          <Briefcase className="h-6 w-6 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs font-body text-muted-foreground">Aucun lead avec ce filtre</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(lead => {
            const open = expandedLead === lead.id;
            const isNew = lead.match_status === "sent_to_partner";
            const isConnected = lead.match_status === "client_connected";
            const isInterested = lead.match_status === "partner_interested";

            return (
              <div key={lead.id} className={`border rounded-sm overflow-hidden transition-colors ${
                isNew ? "border-blue-200 bg-blue-50/30" : isConnected ? "border-green-200 bg-green-50/30" : "border-border"
              }`}>
                {/* Header */}
                <div onClick={() => setExpandedLead(open ? null : lead.id)} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-card/50 transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-xs font-display font-bold ${
                    lead.match_score >= 90 ? "bg-green-100 text-green-700" : lead.match_score >= 70 ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {lead.match_score}%
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-display font-semibold text-foreground truncate">{lead.project_title}</p>
                      {isNew && <span className="text-[8px] font-display font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full shrink-0">NOUVEAU</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[9px] font-body text-muted-foreground">
                      <span className="flex items-center gap-1"><Building2 className="h-2.5 w-2.5" /> {t('pd.projectTypes.' + lead.project_type, { defaultValue: lead.project_type })}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5" /> {lead.project_city}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-2.5 w-2.5" /> {t('pd.timelines.' + lead.timeline, { defaultValue: lead.timeline })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-display font-semibold text-foreground">{lead.budget_range}\u20ac</span>
                    <span className={`text-[9px] font-display font-semibold px-2 py-0.5 rounded-full ${
                      isConnected ? "bg-green-100 text-green-700" : isInterested ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {isConnected ? "Connect\u00e9" : isInterested ? "Int\u00e9ress\u00e9" : "Nouveau"}
                    </span>
                  </div>
                </div>

                {/* Expanded */}
                {open && (
                  <div className="px-4 pb-4 space-y-4 border-t border-border/50">
                    {/* Anonymization notice */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-sm mt-3">
                      <EyeOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <p className="text-[9px] font-body text-muted-foreground">
                        <strong>Donn\u00e9es anonymis\u00e9es</strong> — Les coordonn\u00e9es du client sont masqu\u00e9es. La mise en relation est valid\u00e9e par l'administrateur Terrassea.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">Cat\u00e9gories</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {lead.categories_needed.map(c => <span key={c} className="text-[9px] font-display font-semibold bg-muted text-foreground px-2 py-0.5 rounded-full">{c}</span>)}
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">Style</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {lead.style_preferences.map(s => <span key={s} className="text-[9px] font-display font-semibold bg-muted text-foreground px-2 py-0.5 rounded-full">{s}</span>)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="border border-border rounded-sm p-2.5 text-center">
                        <p className="text-xs font-display font-bold text-foreground">{lead.budget_range}\u20ac</p>
                        <p className="text-[9px] font-body text-muted-foreground">Budget</p>
                      </div>
                      <div className="border border-border rounded-sm p-2.5 text-center">
                        <p className="text-xs font-display font-bold text-foreground">~{lead.quantity_estimate}</p>
                        <p className="text-[9px] font-body text-muted-foreground">Pi\u00e8ces</p>
                      </div>
                      <div className="border border-border rounded-sm p-2.5 text-center">
                        <p className="text-xs font-display font-bold text-foreground">{t('pd.timelines.' + lead.timeline, { defaultValue: lead.timeline })}</p>
                        <p className="text-[9px] font-body text-muted-foreground">D\u00e9lai</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-1">Descriptif du besoin</p>
                      <p className="text-[11px] font-body text-foreground leading-relaxed bg-card border border-border rounded-sm px-3 py-2.5">{lead.description}</p>
                    </div>

                    <div className="flex items-center gap-3 px-3 py-2 rounded-sm border text-[10px] font-body" style={{ background: config.bg, borderColor: config.border, color: config.color }}>
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      Commission {config.label} : <strong>{config.commission}%</strong> sur la commande finale si mise en relation valid\u00e9e.
                    </div>

                    {/* Actions */}
                    {!isConnected && (
                      <div className="space-y-3 pt-1">
                        {!isInterested ? (
                          respondingLead === lead.id ? (
                            <div className="space-y-2 border border-border rounded-sm p-3">
                              <p className="text-[10px] font-display font-semibold text-foreground uppercase tracking-wider">Votre proposition</p>
                              <textarea
                                value={responseForm.message}
                                onChange={(e) => setResponseForm(f => ({ ...f, message: e.target.value }))}
                                placeholder="Message pour le client (votre expertise, disponibilit\u00e9...)"
                                rows={2}
                                className="w-full text-[11px] font-body bg-background border border-border rounded-sm px-3 py-2 focus:outline-none focus:border-foreground resize-none"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[9px] font-display font-semibold text-muted-foreground uppercase">Montant estim\u00e9 (EUR)</label>
                                  <input
                                    type="number"
                                    value={responseForm.estimatedAmount}
                                    onChange={(e) => setResponseForm(f => ({ ...f, estimatedAmount: e.target.value }))}
                                    placeholder="5000"
                                    className="w-full text-[11px] font-body bg-background border border-border rounded-sm px-3 py-1.5 focus:outline-none focus:border-foreground mt-0.5"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-display font-semibold text-muted-foreground uppercase">D\u00e9lai (semaines)</label>
                                  <input
                                    type="number"
                                    value={responseForm.deliveryWeeks}
                                    onChange={(e) => setResponseForm(f => ({ ...f, deliveryWeeks: e.target.value }))}
                                    placeholder="4"
                                    className="w-full text-[11px] font-body bg-background border border-border rounded-sm px-3 py-1.5 focus:outline-none focus:border-foreground mt-0.5"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  disabled={isSubmittingResponse || !responseForm.message || !responseForm.estimatedAmount || !responseForm.deliveryWeeks}
                                  onClick={() => {
                                    submitResponse(
                                      { requestId: lead.id, data: { message: responseForm.message, estimatedAmount: Number(responseForm.estimatedAmount), deliveryWeeks: Number(responseForm.deliveryWeeks) } },
                                      {
                                        onSuccess: () => {
                                          handleInterest(lead.id);
                                          setRespondingLead(null);
                                          setResponseForm({ message: "", estimatedAmount: "", deliveryWeeks: "" });
                                          toast.success("Proposition envoy\u00e9e");
                                        },
                                        onError: () => toast.error("Erreur lors de l'envoi"),
                                      }
                                    );
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 text-[10px] font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity disabled:opacity-40"
                                >
                                  <Send className="h-3 w-3" /> {isSubmittingResponse ? "Envoi..." : "Envoyer ma proposition"}
                                </button>
                                <button
                                  onClick={() => { setRespondingLead(null); setResponseForm({ message: "", estimatedAmount: "", deliveryWeeks: "" }); }}
                                  className="text-[10px] font-display font-semibold text-muted-foreground hover:text-foreground"
                                >
                                  Annuler
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button onClick={() => setRespondingLead(lead.id)} className="flex items-center gap-2 px-4 py-2 text-[10px] font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity">
                                <ThumbsUp className="h-3 w-3" /> Je suis int\u00e9ress\u00e9
                              </button>
                              <button onClick={() => handleDecline(lead.id)} className="flex items-center gap-2 px-4 py-2 text-[10px] font-display font-semibold border border-border rounded-full hover:border-foreground transition-colors">
                                <ThumbsDown className="h-3 w-3" /> Pas pour moi
                              </button>
                            </div>
                          )
                        ) : (
                          <div className="flex items-center gap-2 text-[10px] font-body text-amber-600">
                            <Clock className="h-3 w-3" /> En attente de validation par l'administrateur Terrassea
                          </div>
                        )}
                      </div>
                    )}

                    {isConnected && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-sm">
                        <Handshake className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="text-[10px] font-display font-semibold text-green-700">Mise en relation valid\u00e9e</p>
                          <p className="text-[9px] font-body text-green-600">L'administrateur a connect\u00e9 les deux parties. Consultez vos messages.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Matching explanation */}
      <div className="flex items-start gap-2 px-4 py-3 bg-card border border-border rounded-sm">
        <Target className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[10px] font-body text-muted-foreground leading-relaxed">
          Le <strong>score de match</strong> est calcul\u00e9 sur votre catalogue (cat\u00e9gories, styles, mat\u00e9riaux),
          zone de livraison, capacit\u00e9 et plan. La mise en relation est <strong>toujours valid\u00e9e par un administrateur Terrassea</strong>.
        </p>
      </div>
    </div>
  );
}
