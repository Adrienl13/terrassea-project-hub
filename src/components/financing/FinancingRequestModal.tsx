import { useState } from "react";
import { X, Landmark, Send, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const REQUIRED_DOCUMENTS = [
  "Kbis de moins de 3 mois",
  "2 derniers bilans comptables",
  "RIB professionnel",
  "3 derniers mois de relevés de compte bancaire",
  "Justificatif de domicile personnel",
  "Contrat de location-gérance",
];

const DURATION_OPTIONS = [
  { value: 12, label: "12 mois" },
  { value: 24, label: "24 mois" },
  { value: 36, label: "36 mois" },
  { value: 48, label: "48 mois" },
  { value: 60, label: "60 mois" },
];

const FINANCING_EMAIL = "financement@terrassea.com";

interface Props {
  open: boolean;
  onClose: () => void;
  prefillAmount?: number;
  prefillName?: string;
  prefillEmail?: string;
  prefillPhone?: string;
  prefillSiren?: string;
  prefillCompany?: string;
  projectRequestId?: string;
}

export default function FinancingRequestModal({
  open, onClose,
  prefillAmount, prefillName, prefillEmail, prefillPhone, prefillSiren, prefillCompany,
  projectRequestId,
}: Props) {
  const { user, profile } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: prefillName || profile?.first_name ? `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() : "",
    email: prefillEmail || profile?.email || "",
    phone: prefillPhone || profile?.phone || "",
    company: prefillCompany || profile?.company || "",
    siren: prefillSiren || profile?.siren || "",
    amount: prefillAmount ? String(Math.round(prefillAmount)) : "",
    duration: 36,
    description: "",
  });

  if (!open) return null;

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.siren) {
      toast.error("Veuillez remplir les champs obligatoires (nom, email, SIREN)");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("financing_requests").insert({
        user_id: user?.id || null,
        contact_name: form.name,
        contact_email: form.email,
        contact_phone: form.phone || null,
        company: form.company || null,
        siren: form.siren,
        estimated_amount: form.amount ? Number(form.amount) : null,
        desired_duration_months: form.duration,
        project_description: form.description || null,
        project_request_id: projectRequestId || null,
        status: "nouvelle",
      });
      if (error) throw error;

      // Notify admins (non-blocking)
      try {
        const { data: admins } = await supabase.from("user_profiles").select("id").eq("user_type", "admin");
        for (const admin of admins || []) {
          await supabase.from("notifications").insert({
            user_id: admin.id,
            title: "Nouvelle demande de financement",
            body: `${form.name} (${form.company || "—"}) demande un financement de ${form.amount ? `€${Number(form.amount).toLocaleString("fr-FR")}` : "montant non précisé"}`,
            type: "info",
            link: "/admin?tab=financing",
          });
        }
      } catch { /* non-blocking */ }

      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi de la demande");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full text-sm font-body bg-background border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-foreground transition-colors";
  const labelClass = "text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5";

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-lg p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-7 w-7 text-green-600" />
          </div>
          <h3 className="font-display font-bold text-lg text-foreground mb-2">Demande envoyée</h3>
          <p className="text-sm font-body text-muted-foreground mb-4">
            Notre équipe analyse votre éligibilité et reviendra vers vous sous 48h.
          </p>

          <div className="border border-border rounded-xl p-4 bg-card/50 text-left mb-6">
            <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Documents à préparer
            </p>
            <p className="text-xs font-body text-muted-foreground mb-3">
              Pour finaliser votre demande, merci de nous transmettre les documents suivants par email à{" "}
              <a href={`mailto:${FINANCING_EMAIL}`} className="text-foreground font-semibold underline">{FINANCING_EMAIL}</a> :
            </p>
            <ul className="space-y-1.5">
              {REQUIRED_DOCUMENTS.map((doc, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-foreground/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[8px] font-display font-bold text-foreground">{i + 1}</span>
                  </span>
                  <span className="text-xs font-body text-foreground">{doc}</span>
                </li>
              ))}
            </ul>
          </div>

          <a
            href={`mailto:${FINANCING_EMAIL}?subject=Documents financement — ${form.company || form.name}&body=Bonjour,%0A%0AVeuillez trouver ci-joints les documents pour ma demande de financement.%0A%0ACordialement,%0A${form.name}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-primary-foreground font-display font-semibold text-sm rounded-full hover:opacity-90 transition-opacity mb-3"
          >
            <Send className="h-4 w-4" />
            Envoyer mes documents par email
          </a>

          <div>
            <button onClick={() => { setSubmitted(false); onClose(); }}
              className="text-xs font-body text-muted-foreground hover:text-foreground transition-colors mt-2">
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Landmark className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-foreground">Demande de financement</h2>
              <p className="text-[10px] font-body text-muted-foreground">Financez votre projet terrasse — réponse sous 48h</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Info banner */}
          <div className="flex items-start gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <Landmark className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-display font-semibold text-emerald-800">Option de financement</p>
              <p className="text-[10px] font-body text-emerald-700 mt-0.5">
                Cette demande est indépendante de votre commande. Elle n'est pas bloquante pour votre achat.
              </p>
            </div>
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Nom complet *</label>
              <input type="text" value={form.name} onChange={set("name")} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email *</label>
              <input type="email" value={form.email} onChange={set("email")} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Téléphone</label>
              <input type="tel" value={form.phone} onChange={set("phone")} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Entreprise</label>
              <input type="text" value={form.company} onChange={set("company")} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>SIREN *</label>
            <input type="text" value={form.siren} onChange={set("siren")} maxLength={9} className={inputClass} placeholder="9 chiffres" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Montant estimé (€)</label>
              <input type="number" value={form.amount} onChange={set("amount")} className={inputClass} placeholder="ex. 15000" />
            </div>
            <div>
              <label className={labelClass}>Durée souhaitée</label>
              <select value={form.duration} onChange={e => setForm(prev => ({ ...prev, duration: Number(e.target.value) }))} className={inputClass}>
                {DURATION_OPTIONS.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Description du projet (optionnel)</label>
            <textarea value={form.description} onChange={set("description")} rows={2}
              className={`${inputClass} resize-none rounded-xl`}
              placeholder="Type de terrasse, nombre de couverts, ouverture prévue..." />
          </div>

          {/* Documents reminder */}
          <div className="border border-border rounded-xl p-3 bg-card/50">
            <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Documents requis (à envoyer par email après la demande)
            </p>
            <div className="grid grid-cols-2 gap-1">
              {REQUIRED_DOCUMENTS.map((doc, i) => (
                <p key={i} className="text-[10px] font-body text-muted-foreground flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-muted-foreground shrink-0" />
                  {doc}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-border">
          <button onClick={onClose}
            className="px-5 py-2.5 text-xs font-display font-semibold border border-border rounded-full hover:border-foreground/30 transition-colors">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-display font-bold bg-foreground text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-40 transition-all">
            <Send className="h-3.5 w-3.5" />
            {submitting ? "Envoi en cours..." : "Envoyer ma demande"}
          </button>
        </div>
      </div>
    </div>
  );
}
