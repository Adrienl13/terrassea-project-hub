import { useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePartnerQuotes } from "@/hooks/usePartnerQuotes";
import { toast } from "sonner";
import {
  FileText, ChevronRight, Send, CheckCircle2, XCircle,
  AlertTriangle, MessageSquare, Shield,
} from "lucide-react";
import { type PartnerPlan, PLAN_CONFIG, CommissionReminder } from "./PartnerSections";

const QuotePdfUploader = lazy(() => import("@/components/quotes/QuotePdfUploader"));

export function PartnerQuotesSection({ plan }: { plan: PartnerPlan }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>("all");
  const [expandedQuote, setExpandedQuote] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [proposedPrice, setProposedPrice] = useState<Record<string, string>>({});
  const [proposedDelay, setProposedDelay] = useState<Record<string, string>>({});
  const [proposedTva, setProposedTva] = useState<Record<string, string>>({});
  const [proposedValidity, setProposedValidity] = useState<Record<string, string>>({});
  const [proposedPaymentCond, setProposedPaymentCond] = useState<Record<string, string>>({});
  const [proposedDeliveryCond, setProposedDeliveryCond] = useState<Record<string, string>>({});
  const config = PLAN_CONFIG[plan];

  // Real data from Supabase
  const { quotes: realQuotes, isLoading: quotesLoading, partnerId, updateStatus } = usePartnerQuotes();

  // Map real data to display format
  const STATUS_MAP: Record<string, { label: string; style: string }> = {
    pending:  { label: "Nouveau",  style: "bg-blue-50 text-blue-700" },
    replied:  { label: "Répondu",  style: "bg-amber-50 text-amber-700" },
    accepted: { label: "Accepté",  style: "bg-green-50 text-green-700" },
    signed:   { label: "Signé",    style: "bg-emerald-50 text-emerald-700" },
    expired:  { label: "Expiré",   style: "bg-gray-100 text-gray-500" },
    cancelled:{ label: "Annulé",   style: "bg-red-50 text-red-600" },
  };

  const displayQuotes = realQuotes.map(q => ({
    id: q.id,
    title: `${q.quantity}× ${q.product_name}`,
    client: `${q.client_first_name || "Client"}, ${q.client_city || "—"}`,
    clientRef: q.client_anonymous_id || "—",
    amount: q.total_price ? `€${Number(q.total_price).toLocaleString()}` : "Sur demande",
    totalHT: Number(q.total_price || 0),
    date: timeAgo(q.created_at),
    status: STATUS_MAP[q.status]?.label || q.status,
    statusKey: q.status,
    statusStyle: STATUS_MAP[q.status]?.style || "bg-gray-100 text-gray-600",
    products: [{ name: q.product_name, qty: q.quantity, unitPrice: Number(q.unit_price || 0), color: null as string | null }],
    projectName: q.project_name,
    projectType: q.project_venue_type,
    city: q.client_city,
    timeline: null as string | null,
    budget: null as number | null,
    message: q.message,
    hasPdf: !!q.latest_pdf_path,
    isSigned: !!q.signed_at,
    raw: q,
  }));

  const filtered = filter === "all" ? displayQuotes : displayQuotes.filter(q => q.statusKey === filter);

  const handleSendProposal = (id: string) => {
    const price = proposedPrice[id];
    if (!price) { toast.error("Ajoutez un prix proposé."); return; }
    const qty = realQuotes.find(q => q.id === id)?.quantity || 1;
    updateStatus({
      quoteId: id,
      status: "replied",
      unitPrice: Number(price) / qty,
      totalPrice: Number(price),
      tvaRate: Number(proposedTva[id] || 20),
      deliveryDelayDays: proposedDelay[id] ? Number(proposedDelay[id]) : undefined,
      deliveryConditions: proposedDeliveryCond[id] || undefined,
      paymentConditions: proposedPaymentCond[id] || undefined,
      validityDays: Number(proposedValidity[id] || 30),
      partnerConditions: replyText[id] || undefined,
    });
    toast.success("Proposition envoyée au client !");
    setExpandedQuote(null);
  };

  const handleDecline = (id: string) => {
    updateStatus({ quoteId: id, status: "cancelled" });
    toast("Demande déclinée", { description: "Le client sera notifié." });
  };

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return "à l'instant";
    if (hours < 24) return `il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `il y a ${days}j`;
    return `il y a ${Math.floor(days / 7)}sem`;
  }

  return (
    <div className="space-y-5">
      <CommissionReminder plan={plan} onUpgrade={() => navigate("/become-partner")} />

      {/* Filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 flex-wrap">
          {[
            { id: "all", label: t('pd.quotes.all'), count: displayQuotes.length },
            { id: "pending", label: t('pd.quotes.new'), count: displayQuotes.filter(q => q.statusKey === "pending").length },
            { id: "replied", label: "Répondu", count: displayQuotes.filter(q => q.statusKey === "replied").length },
            { id: "signed", label: "Signé", count: displayQuotes.filter(q => q.statusKey === "signed").length },
          ].map(f => (
            <button key={f.id} onClick={() => { setFilter(f.id); setExpandedQuote(null); }}
              className={`text-[10px] font-display font-semibold px-3 py-1.5 rounded-full transition-all ${
                filter === f.id ? "bg-foreground text-primary-foreground" : "border border-border text-muted-foreground"
              }`}>
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>

      {/* Quote list */}
      {quotesLoading ? (
        <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl px-4 py-10 text-center">
          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
            <FileText className="h-6 w-6 text-muted-foreground/40" />
          </div>
          <p className="text-xs font-display font-semibold text-foreground mb-1">{t('pd.quotes.noResults')}</p>
          <p className="text-[10px] font-body text-muted-foreground mb-3 max-w-xs mx-auto">
            {t('pd.quotes.noResultsHint', 'Les demandes de devis de vos clients apparaîtront ici. Assurez-vous que vos produits et prix sont bien renseignés.')}
          </p>
          <button onClick={() => setFilter("all")} className="text-[10px] font-display font-semibold text-foreground underline">{t('pd.quotes.seeAll')}</button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(q => {
            const isOpen = expandedQuote === q.id;
            const isActionable = q.statusKey === "pending" || q.statusKey === "replied";
            const totalHT = q.totalHT;
            const commAmount = totalHT * config.commission / 100;

            return (
              <div key={q.id} className={`border rounded-sm transition-colors ${isOpen ? "border-foreground/30 shadow-sm" : "border-border hover:border-foreground/20"}`}>
                {/* Header — clickable */}
                <div onClick={() => setExpandedQuote(isOpen ? null : q.id)}
                  className="flex items-center justify-between px-4 py-3 cursor-pointer">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-display font-semibold text-foreground truncate">{q.title}</p>
                    <p className="text-[10px] font-body text-muted-foreground">{q.client} · {q.date}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-display font-semibold text-foreground">{q.amount}</p>
                      <p className="text-[9px] font-body text-amber-600">{t('pd.quotes.commLabel', { percent: config.commission })}</p>
                    </div>
                    <span className={`text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap ${q.statusStyle}`}>{q.status}</span>
                    <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  </div>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-border">
                    {/* Product breakdown */}
                    <div className="px-4 py-3 bg-card/50">
                      <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('pd.quotes.productDetail', { defaultValue: "Détail produits" })}</p>
                      <div className="border border-border rounded-sm overflow-hidden">
                        <table className="w-full text-[10px] font-body">
                          <thead className="bg-card">
                            <tr className="border-b border-border">
                              <th className="text-left px-3 py-1.5 font-display font-semibold text-muted-foreground">{t('pd.quotes.product', { defaultValue: "Produit" })}</th>
                              <th className="text-center px-3 py-1.5 font-display font-semibold text-muted-foreground">{t('pd.quotes.color', { defaultValue: "Couleur" })}</th>
                              <th className="text-center px-3 py-1.5 font-display font-semibold text-muted-foreground">{t('pd.quotes.qty', { defaultValue: "Qté" })}</th>
                              <th className="text-right px-3 py-1.5 font-display font-semibold text-muted-foreground">{t('pd.quotes.unitPrice', { defaultValue: "Prix unit. HT" })}</th>
                              <th className="text-right px-3 py-1.5 font-display font-semibold text-muted-foreground">{t('pd.quotes.subtotal', { defaultValue: "Sous-total" })}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {q.products.map((p, i) => (
                              <tr key={i} className="border-b border-border last:border-0">
                                <td className="px-3 py-2 font-semibold text-foreground">{p.name}</td>
                                <td className="px-3 py-2 text-center text-muted-foreground">{p.color || "—"}</td>
                                <td className="px-3 py-2 text-center text-foreground">{p.qty}</td>
                                <td className="px-3 py-2 text-right text-foreground">€{p.unitPrice.toFixed(0)}</td>
                                <td className="px-3 py-2 text-right font-semibold text-foreground">€{(p.qty * p.unitPrice).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {/* Totals */}
                      <div className="flex justify-end mt-2 space-x-6 text-[10px] font-body">
                        <div className="text-right">
                          <p className="text-muted-foreground">{t('pd.quotes.totalHT', { defaultValue: "Total HT" })}</p>
                          <p className="font-display font-bold text-foreground">€{totalHT.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-amber-600">{t('pd.quotes.commLabel', { percent: config.commission })}</p>
                          <p className="font-display font-semibold text-amber-600">€{commAmount.toFixed(0)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground">{t('pd.quotes.yourNet', { defaultValue: "Votre net" })}</p>
                          <p className="font-display font-bold text-foreground">€{(totalHT - commAmount).toFixed(0)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Client request details */}
                    {(q.projectName || q.message) && (
                      <div className="px-4 py-3 space-y-3">
                        {q.projectName && (
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('pd.quotes.project', { defaultValue: "Projet" })}</p>
                              <p className="text-[11px] font-body text-foreground mt-0.5">{q.projectName}</p>
                            </div>
                            {q.projectType && (
                              <div>
                                <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('pd.quotes.establishment', { defaultValue: "Établissement" })}</p>
                                <p className="text-[11px] font-body text-foreground mt-0.5">{t('pd.projectTypes.' + q.projectType, { defaultValue: q.projectType })}</p>
                              </div>
                            )}
                            {q.city && (
                              <div>
                                <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('pd.quotes.location', { defaultValue: "Localisation" })}</p>
                                <p className="text-[11px] font-body text-foreground mt-0.5">{q.city}</p>
                              </div>
                            )}
                          </div>
                        )}
                        {(q.timeline || q.budget) && (
                          <div className="grid grid-cols-2 gap-3">
                            {q.timeline && (
                              <div>
                                <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('pd.leads.timeline')}</p>
                                <p className="text-[11px] font-body text-foreground mt-0.5">{t('pd.timelines.' + q.timeline, { defaultValue: q.timeline })}</p>
                              </div>
                            )}
                            {q.budget && (
                              <div>
                                <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('pd.leads.budget')}</p>
                                <p className="text-[11px] font-body text-foreground mt-0.5">€{q.budget}</p>
                              </div>
                            )}
                          </div>
                        )}
                        {q.message && (
                          <div>
                            <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('pd.quotes.clientMessage', { defaultValue: "Message du client" })}</p>
                            <p className="text-[11px] font-body text-foreground leading-relaxed mt-1 bg-card border border-border rounded-sm px-3 py-2.5">{q.message}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Response form for actionable quotes */}
                    {isActionable && (
                      <div className="px-4 py-3 border-t border-border bg-card/30 space-y-3">
                        <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{t('pd.quotes.yourResponse', { defaultValue: "Votre réponse" })}</p>

                        {/* Row 1: Prix + TVA */}
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-[9px] font-display font-semibold text-muted-foreground block mb-1">Prix total HT *</label>
                            <input type="number" value={proposedPrice[q.id] || ""} onChange={e => setProposedPrice(prev => ({ ...prev, [q.id]: e.target.value }))}
                              placeholder={`€${totalHT}`} className="w-full bg-background border border-border rounded-sm px-3 py-1.5 text-sm font-body outline-none focus:ring-1 focus:ring-foreground" />
                            {proposedPrice[q.id] && (
                              <p className="text-[9px] font-body text-amber-600 mt-0.5">
                                Commission {config.commission}% ≈ €{(Number(proposedPrice[q.id]) * config.commission / 100).toFixed(0)}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="text-[9px] font-display font-semibold text-muted-foreground block mb-1">Taux TVA</label>
                            <select value={proposedTva[q.id] || "20"} onChange={e => setProposedTva(prev => ({ ...prev, [q.id]: e.target.value }))}
                              className="w-full bg-background border border-border rounded-sm px-3 py-1.5 text-sm font-body outline-none focus:ring-1 focus:ring-foreground">
                              <option value="0">0% (Export)</option>
                              <option value="5.5">5,5%</option>
                              <option value="10">10%</option>
                              <option value="20">20%</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] font-display font-semibold text-muted-foreground block mb-1">Validité du devis</label>
                            <select value={proposedValidity[q.id] || "30"} onChange={e => setProposedValidity(prev => ({ ...prev, [q.id]: e.target.value }))}
                              className="w-full bg-background border border-border rounded-sm px-3 py-1.5 text-sm font-body outline-none focus:ring-1 focus:ring-foreground">
                              <option value="15">15 jours</option>
                              <option value="30">30 jours</option>
                              <option value="45">45 jours</option>
                              <option value="60">60 jours</option>
                              <option value="90">90 jours</option>
                            </select>
                          </div>
                        </div>

                        {/* Row 2: Délai + Conditions livraison */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] font-display font-semibold text-muted-foreground block mb-1">Délai de livraison</label>
                            <select value={proposedDelay[q.id] || ""} onChange={e => setProposedDelay(prev => ({ ...prev, [q.id]: e.target.value }))}
                              className="w-full bg-background border border-border rounded-sm px-3 py-1.5 text-sm font-body outline-none focus:ring-1 focus:ring-foreground">
                              <option value="">—</option>
                              <option value="3">3 jours</option>
                              <option value="7">1 semaine</option>
                              <option value="14">2 semaines</option>
                              <option value="21">3 semaines</option>
                              <option value="30">1 mois</option>
                              <option value="60">2 mois</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] font-display font-semibold text-muted-foreground block mb-1">Conditions de livraison</label>
                            <input type="text" value={proposedDeliveryCond[q.id] || ""} onChange={e => setProposedDeliveryCond(prev => ({ ...prev, [q.id]: e.target.value }))}
                              placeholder="Franco de port, EXW, DDP…" className="w-full bg-background border border-border rounded-sm px-3 py-1.5 text-sm font-body outline-none focus:ring-1 focus:ring-foreground" />
                          </div>
                        </div>

                        {/* Row 3: Conditions de paiement */}
                        <div>
                          <label className="text-[9px] font-display font-semibold text-muted-foreground block mb-1">Conditions de paiement</label>
                          <select value={proposedPaymentCond[q.id] || ""} onChange={e => setProposedPaymentCond(prev => ({ ...prev, [q.id]: e.target.value }))}
                            className="w-full bg-background border border-border rounded-sm px-3 py-1.5 text-sm font-body outline-none focus:ring-1 focus:ring-foreground">
                            <option value="">—</option>
                            <option value="30% acompte, solde à livraison">30% acompte, solde à livraison</option>
                            <option value="50% acompte, 50% à livraison">50% acompte, 50% à livraison</option>
                            <option value="100% à la commande">100% à la commande</option>
                            <option value="30 jours fin de mois">30 jours fin de mois</option>
                          </select>
                        </div>

                        {/* Legal disclaimer */}
                        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-blue-50/50 border border-blue-100">
                          <Shield className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                          <p className="text-[9px] font-body text-blue-700">
                            En soumettant ce devis, vous confirmez que votre PDF contient vos mentions légales obligatoires (SIREN, n° TVA, CGV). Terrassea transmet ce devis en qualité de mandataire de paiement.
                          </p>
                        </div>

                        <div>
                          <label className="text-[9px] font-display font-semibold text-muted-foreground block mb-1">{t('pd.quotes.responseMessage', { defaultValue: "Message" })}</label>
                          <textarea
                            value={replyText[q.id] || ""}
                            onChange={e => setReplyText(prev => ({ ...prev, [q.id]: e.target.value }))}
                            rows={3}
                            placeholder={t('pd.quotes.responsePlaceholder', { defaultValue: "Conditions, disponibilité, alternatives, remise..." })}
                            className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground resize-none"
                          />
                        </div>

                        {/* PDF Upload */}
                        <Suspense fallback={<div className="h-20 animate-pulse bg-card rounded-xl" />}>
                          <QuotePdfUploader
                            quoteRequestId={q.id}
                            projectName={q.projectName || ""}
                            productName={q.products[0]?.name || ""}
                            quantity={q.products[0]?.qty || 0}
                            supplierAlias={q.clientRef}
                            totalAmount={proposedPrice[q.id] || q.amount}
                          />
                        </Suspense>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button onClick={() => handleSendProposal(q.id)}
                            className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity">
                            <Send className="h-3 w-3" /> {t('pd.quotes.sendProposal', { defaultValue: "Envoyer la proposition" })}
                          </button>
                          <button onClick={() => {
                            const raw = realQuotes.find(r => r.id === q.id);
                            const existingTotal = raw?.total_price ? Number(raw.total_price) : null;
                            const existingUnit = raw?.unit_price ? Number(raw.unit_price) : null;
                            updateStatus({
                              quoteId: q.id,
                              status: "replied",
                              ...(existingUnit != null ? { unitPrice: existingUnit } : {}),
                              ...(existingTotal != null ? { totalPrice: existingTotal } : {}),
                              tvaRate: 20,
                              validityDays: 30,
                            });
                            toast.success("Demande acceptée");
                            setExpandedQuote(null);
                          }}
                            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-display font-semibold border border-green-200 text-green-700 rounded-full hover:bg-green-50 transition-colors">
                            <CheckCircle2 className="h-3 w-3" /> {t('pd.quotes.acceptDirect', { defaultValue: "Accepter tel quel" })}
                          </button>
                          <button onClick={() => navigate("/messages")}
                            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-display font-semibold border border-border rounded-full hover:border-foreground transition-colors">
                            <MessageSquare className="h-3 w-3" /> Message
                          </button>
                          <div className="flex-1" />
                          <button onClick={() => handleDecline(q.id)}
                            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-display font-semibold text-red-600 border border-red-200 rounded-full hover:bg-red-50 transition-colors">
                            <XCircle className="h-3 w-3" /> {t('pd.quotes.decline')}
                          </button>
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

      {/* Info text */}
      <div className="flex items-start gap-2 px-4 py-3 bg-card border border-border rounded-sm">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-[10px] font-body text-muted-foreground leading-relaxed">
          {t('pd.quotes.reminder', { percent: config.commission, plan: config.label })}
        </p>
      </div>
    </div>
  );
}
