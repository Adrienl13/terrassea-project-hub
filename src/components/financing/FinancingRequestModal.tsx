import { useState } from "react";
import { X, Landmark, Send, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const DOCUMENT_KEYS = ["doc1", "doc2", "doc3", "doc4", "doc5", "doc6"] as const;
const DURATION_VALUES = [12, 24, 36, 48, 60] as const;

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
  const { t } = useTranslation();
  const requiredDocuments = DOCUMENT_KEYS.map((key) => t(`financingModal.${key}`));
  const durationOptions = DURATION_VALUES.map((v) => ({ value: v, label: t(`financingModal.duration${v}`) }));
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
      toast.error(t("financingModal.fillRequired"));
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
            title: t("financingModal.notifTitle"),
            body: form.amount
              ? t("financingModal.notifBody", { name: form.name, company: form.company || "—", amount: `€${Number(form.amount).toLocaleString()}` })
              : t("financingModal.notifBodyNoAmount", { name: form.name, company: form.company || "—" }),
            type: "info",
            link: "/admin?tab=financing",
          });
        }
      } catch { /* non-blocking */ }

      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || t("financingModal.errorGeneric"));
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
          <h3 className="font-display font-bold text-lg text-foreground mb-2">{t("financingModal.successTitle")}</h3>
          <p className="text-sm font-body text-muted-foreground mb-4">
            {t("financingModal.successBody")}
          </p>

          <div className="border border-border rounded-xl p-4 bg-card/50 text-left mb-6">
            <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {t("financingModal.docsPrepareTitle")}
            </p>
            <p className="text-xs font-body text-muted-foreground mb-3">
              {t("financingModal.docsPrepareBody")}{" "}
              <a href={`mailto:${FINANCING_EMAIL}`} className="text-foreground font-semibold underline">{FINANCING_EMAIL}</a> :
            </p>
            <ul className="space-y-1.5">
              {requiredDocuments.map((doc, i) => (
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
            href={`mailto:${FINANCING_EMAIL}?subject=${encodeURIComponent(t("financingModal.emailSubject", { name: form.company || form.name }))}&body=${encodeURIComponent(t("financingModal.emailBody", { name: form.name }))}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-primary-foreground font-display font-semibold text-sm rounded-full hover:opacity-90 transition-opacity mb-3"
          >
            <Send className="h-4 w-4" />
            {t("financingModal.sendDocsEmail")}
          </a>

          <div>
            <button onClick={() => { setSubmitted(false); onClose(); }}
              className="text-xs font-body text-muted-foreground hover:text-foreground transition-colors mt-2">
              {t("financingModal.closeBtn")}
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
              <h2 className="font-display font-bold text-base text-foreground">{t("financingModal.title")}</h2>
              <p className="text-[10px] font-body text-muted-foreground">{t("financingModal.subtitle")}</p>
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
              <p className="text-xs font-display font-semibold text-emerald-800">{t("financingModal.infoBannerTitle")}</p>
              <p className="text-[10px] font-body text-emerald-700 mt-0.5">
                {t("financingModal.infoBannerBody")}
              </p>
            </div>
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>{t("financingModal.fullName")}</label>
              <input type="text" value={form.name} onChange={set("name")} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t("financingModal.emailLabel")}</label>
              <input type="email" value={form.email} onChange={set("email")} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>{t("financingModal.phoneLabel")}</label>
              <input type="tel" value={form.phone} onChange={set("phone")} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t("financingModal.companyLabel")}</label>
              <input type="text" value={form.company} onChange={set("company")} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>{t("financingModal.sirenLabel")}</label>
            <input type="text" value={form.siren} onChange={set("siren")} maxLength={9} className={inputClass} placeholder={t("financingModal.sirenPlaceholder")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>{t("financingModal.amountLabel")}</label>
              <input type="number" value={form.amount} onChange={set("amount")} className={inputClass} placeholder={t("financingModal.amountPlaceholder")} />
            </div>
            <div>
              <label className={labelClass}>{t("financingModal.durationLabel")}</label>
              <select value={form.duration} onChange={e => setForm(prev => ({ ...prev, duration: Number(e.target.value) }))} className={inputClass}>
                {durationOptions.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>{t("financingModal.descriptionLabel")}</label>
            <textarea value={form.description} onChange={set("description")} rows={2}
              className={`${inputClass} resize-none rounded-xl`}
              placeholder={t("financingModal.descriptionPlaceholder")} />
          </div>

          {/* Documents reminder */}
          <div className="border border-border rounded-xl p-3 bg-card/50">
            <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {t("financingModal.docsReminderTitle")}
            </p>
            <div className="grid grid-cols-2 gap-1">
              {requiredDocuments.map((doc, i) => (
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
            {t("financingModal.cancel")}
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-display font-bold bg-foreground text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-40 transition-all">
            <Send className="h-3.5 w-3.5" />
            {submitting ? t("financingModal.submitting") : t("financingModal.submit")}
          </button>
        </div>
      </div>
    </div>
  );
}
