import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Building2, Search, Eye, ArrowLeft, Globe, MapPin,
  Award, Package, Truck, Plus, Pencil, Trash2, Save,
  X, Star, Shield, Crown, Check, CheckCircle2, AlertTriangle, XCircle, Clock,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type Partner = {
  id: string;
  slug: string;
  name: string;
  partner_type: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  city: string | null;
  country: string | null;
  country_code: string | null;
  plan: string | null;
  visibility_level: string | null;
  is_public: boolean;
  is_active: boolean;
  priority_order: number | null;
  specialty_tags: string[] | null;
  delivery_countries: string[] | null;
  product_categories: string[] | null;
  contact_email: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  vat_number: string | null;
  profile_completed: boolean;
  profile_submitted: boolean;
  profile_status: string | null;
  profile_submitted_at: string | null;
  profile_review_notes: string | null;
  created_at: string;
};

type PartnerForm = {
  name: string;
  partner_type: string;
  description: string;
  logo_url: string;
  website: string;
  city: string;
  country: string;
  country_code: string;
  plan: string;
  contact_email: string;
  contact_name: string;
  contact_phone: string;
  vat_number: string;
  specialty_tags: string;
  delivery_countries: string;
  product_categories: string;
  is_public: boolean;
  is_active: boolean;
};

const EMPTY_FORM: PartnerForm = {
  name: "", partner_type: "manufacturer", description: "", logo_url: "",
  website: "", city: "", country: "", country_code: "", plan: "starter",
  contact_email: "", contact_name: "", contact_phone: "", vat_number: "",
  specialty_tags: "", delivery_countries: "", product_categories: "",
  is_public: true, is_active: true,
};

const PLANS = [
  { id: "starter", label: "Starter", icon: Shield, color: "#9CA3AF", commission: "8%" },
  { id: "growth", label: "Growth", icon: Star, color: "#2563EB", commission: "5%" },
  { id: "elite", label: "Elite", icon: Crown, color: "#D4603A", commission: "3%" },
];

import { PARTNER_TYPES } from "@/lib/partnerConstants";
import PartnerCertifications from "@/components/partner-dashboard/PartnerCertifications";

const COUNTRIES = [
  { code: "FR", name: "France" }, { code: "IT", name: "Italie" }, { code: "ES", name: "Espagne" },
  { code: "DE", name: "Allemagne" }, { code: "PT", name: "Portugal" }, { code: "NL", name: "Pays-Bas" },
  { code: "BE", name: "Belgique" }, { code: "DK", name: "Danemark" }, { code: "SE", name: "Suède" },
  { code: "GR", name: "Grèce" }, { code: "GB", name: "Royaume-Uni" }, { code: "CH", name: "Suisse" },
  { code: "AT", name: "Autriche" }, { code: "PL", name: "Pologne" }, { code: "TR", name: "Turquie" },
];

type EmailLocale = "fr" | "en" | "es" | "it";

// Infers the partner's email locale from their country_code so the approval
// email is sent in their language regardless of the admin's UI locale.
function inferPartnerLocale(countryCode: string | null | undefined): EmailLocale {
  const cc = (countryCode || "").toUpperCase();
  if (cc === "FR" || cc === "BE" || cc === "CH" || cc === "LU" || cc === "MC") return "fr";
  if (cc === "IT") return "it";
  if (cc === "ES") return "es";
  return "en";
}

type PartnerTypeKey = "manufacturer" | "brand" | "reseller" | "distributor" | "designer";
const KNOWN_PARTNER_TYPES: PartnerTypeKey[] = ["manufacturer", "brand", "reseller", "distributor", "designer"];

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminPartners() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  /** Invalidate every cache that holds partner data (admin + public + dashboard) */
  const invalidatePartnerCaches = useCallback(() => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === "string" && (key.includes("partner") || key.includes("distributor"));
      },
    });
  }, [queryClient]);

  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [view, setView] = useState<"list" | "detail" | "form">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PartnerForm>(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewAction, setReviewAction] = useState(false);

  const { data: partners = [], isLoading } = useQuery<Partner[]>({
    queryKey: ["admin_partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data || []) as Partner[];
    },
  });

  const { data: productCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ["admin_partner_product_counts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("partner_id, partners!inner(slug)")
        .not("partner_id", "is", null)
        .eq("publish_status", "published");
      const counts: Record<string, number> = {};
      (data || []).forEach((p: any) => {
        const slug = p.partners?.slug;
        if (slug) counts[slug] = (counts[slug] || 0) + 1;
      });
      return counts;
    },
  });

  const selected = selectedId ? partners.find(p => p.id === selectedId) : null;
  const types = [...new Set(partners.map(p => p.partner_type).filter(Boolean))];
  const filtered = partners.filter(p => {
    const matchText = !filter || p.name.toLowerCase().includes(filter.toLowerCase()) || (p.city || "").toLowerCase().includes(filter.toLowerCase());
    const matchType = typeFilter === "all" || p.partner_type === typeFilter;
    return matchText && matchType;
  });

  const generateSlug = (name: string) =>
    name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const partnerToForm = (p: Partner): PartnerForm => ({
    name: p.name, partner_type: p.partner_type, description: p.description || "",
    logo_url: p.logo_url || "", website: p.website || "", city: p.city || "",
    country: p.country || "", country_code: p.country_code || "", plan: p.plan || "starter",
    contact_email: p.contact_email || "", contact_name: p.contact_name || "",
    contact_phone: p.contact_phone || "", vat_number: p.vat_number || "",
    specialty_tags: (p.specialty_tags || []).join(", "),
    delivery_countries: (p.delivery_countries || []).join(", "),
    product_categories: (p.product_categories || []).join(", "),
    is_public: p.is_public ?? true, is_active: p.is_active ?? true,
  });

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.error(t("adminPartners.nameRequired")); return; }
    setSaving(true);
    const slug = generateSlug(formData.name);
    const payload = {
      name: formData.name.trim(),
      slug: isEditing ? undefined : slug,
      partner_type: formData.partner_type,
      description: formData.description || null,
      logo_url: formData.logo_url || null,
      website: formData.website || null,
      city: formData.city || null,
      country: formData.country || null,
      country_code: formData.country_code || null,
      plan: formData.plan,
      visibility_level: formData.plan === "elite" ? "featured" : formData.plan === "growth" ? "standard" : "anonymous",
      contact_email: formData.contact_email || null,
      contact_name: formData.contact_name || null,
      contact_phone: formData.contact_phone || null,
      vat_number: formData.vat_number || null,
      specialty_tags: formData.specialty_tags ? formData.specialty_tags.split(",").map(s => s.trim()).filter(Boolean) : [],
      delivery_countries: formData.delivery_countries ? formData.delivery_countries.split(",").map(s => s.trim()).filter(Boolean) : [],
      product_categories: formData.product_categories ? formData.product_categories.split(",").map(s => s.trim()).filter(Boolean) : [],
      is_public: formData.is_public,
      is_active: formData.is_active,
    };

    // Remove undefined slug for updates
    const cleanPayload = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined));

    let error;
    if (isEditing && selectedId) {
      ({ error } = await supabase.from("partners").update(cleanPayload as any).eq("id", selectedId));
    } else {
      ({ error } = await supabase.from("partners").insert({ ...cleanPayload, slug } as any));
    }

    setSaving(false);
    if (error) {
      toast.error(t("adminPartners.errorPrefix") + error.message);
    } else {
      toast.success(isEditing ? t("adminPartners.partnerUpdated") : t("adminPartners.partnerCreated"));
      invalidatePartnerCaches();
      setView("list");
      setIsEditing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer définitivement ce partenaire et toutes ses données associées ? Cette action est irréversible.")) return;
    try {
      // Clean up NO ACTION FK references before deleting
      await supabase.from("brand_distributors").delete().or(`brand_id.eq.${id},distributor_id.eq.${id}`);
      await supabase.from("products").update({ partner_id: null } as any).eq("partner_id", id);
      await supabase.from("orders").update({ partner_id: null } as any).eq("partner_id", id);
      await supabase.from("partner_applications").update({ created_partner_id: null } as any).eq("created_partner_id", id);
      await supabase.from("project_briefs").update({ brand_partner_id: null } as any).eq("brand_partner_id", id);
      await supabase.from("project_briefs").update({ routed_to_partner_id: null } as any).eq("routed_to_partner_id", id);
      await supabase.from("project_cart_items").update({ selected_partner_id: null } as any).eq("selected_partner_id", id);
      await supabase.from("project_zone_products").update({ supplier_id: null } as any).eq("supplier_id", id);
      // Now delete the partner (CASCADE handles the rest)
      const { error } = await supabase.from("partners").delete().eq("id", id);
      if (error) throw error;
      toast.success("Partenaire supprimé définitivement");
      invalidatePartnerCaches();
      setView("list");
    } catch (err: any) {
      toast.error("Erreur lors de la suppression : " + (err.message || ""));
    }
  };

  // Shared helper: notify a partner by looking up their user profile from contact_email
  const notifyPartner = async (contactEmail: string | null, title: string, body: string) => {
    if (!contactEmail) return;
    const { data: partnerUser } = await supabase.from("user_profiles").select("id").eq("email", contactEmail).maybeSingle();
    if (partnerUser) {
      await supabase.rpc("create_admin_notification", {
        p_user_id: partnerUser.id,
        p_type: "info",
        p_title: title,
        p_body: body,
        p_link: "/account",
      });
    }
  };

  const handleApprove = async (partner: Partner) => {
    setReviewAction(true);
    const partnerName = partner.name || partner.contact_name || "";
    const lng = inferPartnerLocale(partner.country_code);
    const typeKey: PartnerTypeKey = KNOWN_PARTNER_TYPES.includes(partner.partner_type as PartnerTypeKey)
      ? (partner.partner_type as PartnerTypeKey)
      : "manufacturer";
    const { error } = await supabase.rpc("verify_partner_as_admin", {
      p_partner_id: partner.id,
      p_action: "approve",
      p_email_subject: t("adminPartners.emailApprovedSubject", { lng }),
      p_email_html: t(`adminPartners.emailApprovedHtml.${typeKey}`, { lng, name: partnerName }),
      p_email_text: t(`adminPartners.emailApprovedText.${typeKey}`, { lng, name: partnerName }),
    });

    if (error) { toast.error(t("adminPartners.errorPrefix") + error.message); setReviewAction(false); return; }

    await notifyPartner(partner.contact_email, t("adminPartners.notifApprovedTitle"), t("adminPartners.notifApprovedBody"));
    toast.success(t("adminPartners.partnerApproved"));
    invalidatePartnerCaches();
    setReviewAction(false);
  };

  const handleRequestChanges = async (partner: Partner) => {
    if (!reviewComment.trim()) { toast.error(t("adminPartners.addCommentRequired")); return; }
    setReviewAction(true);
    const { error } = await supabase.rpc("verify_partner_as_admin", {
      p_partner_id: partner.id,
      p_action: "request_changes",
      p_review_notes: reviewComment.trim(),
    });

    if (error) { toast.error(t("adminPartners.errorPrefix") + error.message); setReviewAction(false); return; }

    await notifyPartner(partner.contact_email, t("adminPartners.notifChangesTitle"), t("adminPartners.notifChangesBody", { comment: reviewComment.trim() }));
    toast.success(t("adminPartners.changesRequestSent"));
    setReviewComment("");
    invalidatePartnerCaches();
    setReviewAction(false);
  };

  const handleReject = async (partner: Partner) => {
    if (!reviewComment.trim()) { toast.error(t("adminPartners.addReasonRequired")); return; }
    setReviewAction(true);
    const { error } = await supabase.rpc("verify_partner_as_admin", {
      p_partner_id: partner.id,
      p_action: "reject",
      p_review_notes: reviewComment.trim(),
    });

    if (error) { toast.error(t("adminPartners.errorPrefix") + error.message); setReviewAction(false); return; }

    await notifyPartner(partner.contact_email, t("adminPartners.notifRejectedTitle"), t("adminPartners.notifRejectedBody", { comment: reviewComment.trim() }));
    toast.success(t("adminPartners.partnerRejected"));
    setReviewComment("");
    invalidatePartnerCaches();
    setReviewAction(false);
  };

  const set = (field: keyof PartnerForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setFormData(prev => ({ ...prev, [field]: e.target.value }));

  const inputClass = "w-full text-sm font-body bg-white border border-border rounded-lg px-3 py-2.5 focus:outline-none focus:border-foreground/40 transition-colors";
  const labelClass = "text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1";

  // ── Form view ──
  if (view === "form") {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <button onClick={() => { setView("list"); setIsEditing(false); }}
            className="flex items-center gap-1.5 text-xs font-body text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> {t("adminPartners.back")}
          </button>
          <h2 className="font-display font-bold text-lg">{isEditing ? t("adminPartners.editPartner") : t("adminPartners.newPartner")}</h2>
        </div>

        <div className="space-y-5">
          {/* Identity */}
          <div className="border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-display font-bold text-sm">{t("adminPartners.identitySection")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelClass}>{t("adminPartners.companyName")}</label><input type="text" value={formData.name} onChange={set("name")} className={inputClass} /></div>
              <div>
                <label className={labelClass}>{t("adminPartners.typeLabel")}</label>
                <select value={formData.partner_type} onChange={set("partner_type")} className={inputClass}>
                  {PARTNER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><label className={labelClass}>{t("adminPartners.contactEmail")}</label><input type="email" value={formData.contact_email} onChange={set("contact_email")} className={inputClass} /></div>
              <div><label className={labelClass}>{t("adminPartners.contactName")}</label><input type="text" value={formData.contact_name} onChange={set("contact_name")} className={inputClass} /></div>
              <div><label className={labelClass}>{t("adminPartners.phone")}</label><input type="tel" value={formData.contact_phone} onChange={set("contact_phone")} className={inputClass} /></div>
              <div><label className={labelClass}>{t("adminPartners.vatSiren")}</label><input type="text" value={formData.vat_number} onChange={set("vat_number")} className={inputClass} /></div>
            </div>
          </div>

          {/* Location */}
          <div className="border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-display font-bold text-sm">{t("adminPartners.locationSection")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>{t("adminPartners.countryLabel")}</label>
                <select value={formData.country_code} onChange={(e) => {
                  const c = COUNTRIES.find(c => c.code === e.target.value);
                  setFormData(prev => ({ ...prev, country_code: e.target.value, country: c?.name || "" }));
                }} className={inputClass}>
                  <option value="">{t("adminPartners.selectOption")}</option>
                  {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
              <div><label className={labelClass}>{t("adminPartners.cityLabel")}</label><input type="text" value={formData.city} onChange={set("city")} className={inputClass} /></div>
              <div><label className={labelClass}>{t("adminPartners.websiteLabel")}</label><input type="url" value={formData.website} onChange={set("website")} placeholder="https://..." className={inputClass} /></div>
            </div>
            <div><label className={labelClass}>{t("adminPartners.deliveryCountries")}</label><input type="text" value={formData.delivery_countries} onChange={set("delivery_countries")} placeholder={t("adminPartners.deliveryPlaceholder")} className={inputClass} /></div>
          </div>

          {/* Plan */}
          <div className="border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-display font-bold text-sm">{t("adminPartners.planSubscription")}</h3>
            <div className="grid grid-cols-3 gap-3">
              {PLANS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, plan: p.id }))}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    formData.plan === p.id ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/20"
                  }`}
                >
                  <p.icon className="h-5 w-5" style={{ color: p.color }} />
                  <span className="text-xs font-display font-bold">{p.label}</span>
                  <span className="text-[9px] font-body text-muted-foreground">{t("adminPartners.commissionLabel")} {p.commission}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-display font-bold text-sm">{t("adminPartners.detailsSection")}</h3>
            <div><label className={labelClass}>{t("adminPartners.descriptionLabel")}</label><textarea value={formData.description} onChange={set("description")} rows={3} className={`${inputClass} resize-none`} /></div>
            <div><label className={labelClass}>{t("adminPartners.logoUrl")}</label><input type="url" value={formData.logo_url} onChange={set("logo_url")} placeholder="https://..." className={inputClass} /></div>
            <div><label className={labelClass}>{t("adminPartners.specialties")}</label><input type="text" value={formData.specialty_tags} onChange={set("specialty_tags")} placeholder={t("adminPartners.specialtiesPlaceholder")} className={inputClass} /></div>
            <div><label className={labelClass}>{t("adminPartners.productCategories")}</label><input type="text" value={formData.product_categories} onChange={set("product_categories")} placeholder={t("adminPartners.categoriesPlaceholder")} className={inputClass} /></div>
          </div>

          {/* Visibility */}
          <div className="border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-display font-bold text-sm">{t("adminPartners.visibilitySection")}</h3>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))} className="rounded" />
                <span className="text-xs font-body">{t("adminPartners.activeLabel")}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.is_public} onChange={(e) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))} className="rounded" />
                <span className="text-xs font-body">{t("adminPartners.publicLabel")}</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-3 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-40">
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="h-4 w-4" />}
              {isEditing ? t("adminPartners.save") : t("adminPartners.createPartner")}
            </button>
            <button onClick={() => { setView("list"); setIsEditing(false); }}
              className="px-6 py-3 font-display font-semibold text-sm text-muted-foreground border border-border rounded-full hover:text-foreground">
              {t("adminPartners.cancel")}
            </button>
            {isEditing && selectedId && (
              <button onClick={() => handleDelete(selectedId)}
                className="ml-auto px-4 py-3 text-xs font-display font-semibold text-red-600 border border-red-200 rounded-full hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Detail view ──
  if (view === "detail" && selected) {
    const planCfg = PLANS.find(p => p.id === selected.plan) || PLANS[0];
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <button onClick={() => setView("list")} className="flex items-center gap-1.5 text-xs font-body text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> {t("adminPartners.back")}
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => { setFormData(partnerToForm(selected)); setIsEditing(true); setView("form"); }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90">
              <Pencil className="h-3.5 w-3.5" /> {t("adminPartners.edit")}
            </button>
            <button onClick={() => handleDelete(selected.id)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-display font-semibold text-red-600 border border-red-200 rounded-full hover:bg-red-50 transition-colors">
              <Trash2 className="h-3.5 w-3.5" /> Supprimer
            </button>
          </div>
        </div>

        <div className="flex items-start gap-4 p-5 border border-border rounded-xl bg-card">
          <div className="w-14 h-14 rounded-xl bg-muted border border-border flex items-center justify-center overflow-hidden">
            {selected.logo_url ? <img src={selected.logo_url} alt={selected.name} className="w-full h-full object-cover" /> : <Building2 className="h-6 w-6 text-muted-foreground" />}
          </div>
          <div className="flex-1">
            <h2 className="font-display text-lg font-bold text-foreground">{selected.name}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[10px] font-display font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 capitalize">{selected.partner_type}</span>
              <span className="text-[10px] font-display font-semibold px-2 py-0.5 rounded-full" style={{ background: `${planCfg.color}15`, color: planCfg.color }}>
                {planCfg.label} ({planCfg.commission})
              </span>
              <span className={`text-[10px] font-display font-semibold px-2 py-0.5 rounded-full ${selected.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {selected.is_active ? t("adminPartners.activeLabel") : t("adminBrands.inactive")}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t("adminPartners.detailEmail"), value: selected.contact_email },
            { label: t("adminPartners.detailContact"), value: selected.contact_name },
            { label: t("adminPartners.detailPhone"), value: selected.contact_phone },
            { label: t("adminPartners.detailVat"), value: selected.vat_number },
            { label: t("adminPartners.detailCity"), value: selected.city },
            { label: t("adminPartners.detailCountry"), value: selected.country },
            { label: t("adminPartners.detailWebsite"), value: selected.website },
            { label: t("adminPartners.detailProducts"), value: String(productCounts[selected.slug] || 0) },
          ].filter(({ value }) => value).map(({ label, value }) => (
            <div key={label} className="border border-border rounded-lg p-3">
              <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
              <p className="text-xs font-body text-foreground mt-0.5 truncate">{value}</p>
            </div>
          ))}
        </div>

        {selected.description && (
          <div className="border border-border rounded-lg p-4">
            <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t("adminPartners.descriptionLabel")}</p>
            <p className="text-sm font-body text-muted-foreground">{selected.description}</p>
          </div>
        )}

        {/* Profile validation section */}
        {(selected as Record<string, unknown>).profile_status === "pending_review" && (
          <div className="border-2 border-amber-300 bg-amber-50 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-amber-700" />
              <h3 className="font-display font-bold text-sm text-amber-800">{t("adminPartners.profileToValidate")}</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs font-body">
              <div><span className="text-muted-foreground">{t("adminPartners.nameFieldLabel")}</span> <span className="font-semibold">{selected.name}</span></div>
              <div><span className="text-muted-foreground">{t("adminPartners.typeFieldLabel")}</span> <span className="font-semibold capitalize">{selected.partner_type}</span></div>
              <div><span className="text-muted-foreground">{t("adminPartners.countryFieldLabel")}</span> <span className="font-semibold">{[selected.country, selected.city].filter(Boolean).join(", ") || "—"}</span></div>
              <div><span className="text-muted-foreground">{t("adminPartners.vatFieldLabel")}</span> <span className="font-semibold">{selected.vat_number || "—"}</span></div>
              <div className="col-span-2"><span className="text-muted-foreground">{t("adminPartners.categoriesFieldLabel")}</span> <span className="font-semibold">{(selected.product_categories || []).join(", ") || "—"}</span></div>
            </div>
            {selected.description && (
              <div className="text-xs font-body text-muted-foreground italic">"{selected.description}"</div>
            )}
            {selected.logo_url && (
              <div>
                <span className="text-[10px] font-display font-semibold text-muted-foreground">{t("adminPartners.logoFieldLabel")}</span>
                <img src={selected.logo_url} alt="Logo" className="w-12 h-12 rounded-lg border border-border mt-1 object-cover" />
              </div>
            )}

            <div>
              <label className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                {t("adminPartners.reviewCommentLabel")}
              </label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={2}
                className="w-full text-sm font-body bg-white border border-border rounded-lg px-3 py-2.5 focus:outline-none focus:border-foreground/40 resize-none"
                placeholder={t("adminPartners.reviewCommentPlaceholder")}
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleApprove(selected)}
                disabled={reviewAction}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-display font-semibold bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-40"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> {t("adminPartners.approve")}
              </button>
              <button
                onClick={() => handleRequestChanges(selected)}
                disabled={reviewAction}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-display font-semibold bg-amber-500 text-white rounded-full hover:bg-amber-600 disabled:opacity-40"
              >
                <AlertTriangle className="h-3.5 w-3.5" /> {t("adminPartners.requestChanges")}
              </button>
              <button
                onClick={() => handleReject(selected)}
                disabled={reviewAction}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-display font-semibold bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-40"
              >
                <XCircle className="h-3.5 w-3.5" /> {t("adminPartners.reject")}
              </button>
            </div>
          </div>
        )}

        {(selected.specialty_tags?.length || 0) > 0 && (
          <div>
            <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t("adminPartners.specialtiesLabel")}</p>
            <div className="flex flex-wrap gap-1.5">
              {selected.specialty_tags!.map(s => <span key={s} className="text-[10px] bg-card border border-border px-2 py-0.5 rounded-full">{s}</span>)}
            </div>
          </div>
        )}

        {/* Dette 25 — Certifications partenaire (modération admin) */}
        <div className="border border-border rounded-xl p-5 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-display font-semibold">
            Certifications partenaire
          </p>
          <PartnerCertifications partnerId={selected.id} />
        </div>
      </div>
    );
  }

  // ── List view ──
  if (isLoading) return <p className="text-muted-foreground font-body text-sm">{t("adminPartners.loading")}</p>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input type="text" value={filter} onChange={e => setFilter(e.target.value)}
            placeholder={t("adminPartners.searchSupplier")}
            className="w-full bg-card border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm font-body outline-none focus:border-foreground/40" />
        </div>
        <button onClick={() => { setFormData(EMPTY_FORM); setIsEditing(false); setView("form"); }}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90">
          <Plus className="h-3.5 w-3.5" /> {t("adminPartners.newPartnerBtn")}
        </button>
      </div>

      <div className="flex gap-1 mb-5 flex-wrap">
        <button onClick={() => setTypeFilter("all")}
          className={`px-3 py-1.5 text-xs font-display font-semibold rounded-full transition-all ${typeFilter === "all" ? "bg-foreground text-primary-foreground" : "border border-border text-muted-foreground"}`}>
          {t("adminPartners.allFilter")} ({partners.length})
        </button>
        {types.map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 text-xs font-display font-semibold rounded-full capitalize transition-all ${typeFilter === t ? "bg-foreground text-primary-foreground" : "border border-border text-muted-foreground"}`}>
            {t} ({partners.filter(p => p.partner_type === t).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-body text-muted-foreground">{t("adminPartners.noSupplierFound")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(partner => {
            const planCfg = PLANS.find(p => p.id === partner.plan) || PLANS[0];
            return (
              <div key={partner.id}
                onClick={() => { setSelectedId(partner.id); setView("detail"); }}
                className="flex items-center gap-3 px-4 py-3 border border-border rounded-xl hover:border-foreground/15 transition-colors cursor-pointer group">
                <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center overflow-hidden shrink-0">
                  {partner.logo_url ? <img src={partner.logo_url} alt={partner.name} className="w-full h-full object-cover" /> : <Building2 className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-display font-bold text-foreground group-hover:text-[#D4603A] truncate">{partner.name}</p>
                    <span className="text-[9px] font-display font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 capitalize shrink-0">{partner.partner_type}</span>
                    <span className="text-[9px] font-display font-semibold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: `${planCfg.color}12`, color: planCfg.color }}>{planCfg.label}</span>
                    <span className={`text-[9px] font-display font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                      partner.profile_completed ? "bg-green-50 text-green-700"
                        : (partner as Record<string, unknown>).profile_status === "pending_review" ? "bg-amber-50 text-amber-700"
                        : (partner as Record<string, unknown>).profile_status === "changes_requested" ? "bg-orange-50 text-orange-700"
                        : (partner as Record<string, unknown>).profile_status === "rejected" ? "bg-red-50 text-red-700"
                        : "bg-gray-50 text-gray-700"
                    }`}>
                      {partner.profile_completed ? t("adminPartners.profileApproved")
                        : (partner as Record<string, unknown>).profile_status === "pending_review" ? t("adminPartners.profilePendingReview")
                        : (partner as Record<string, unknown>).profile_status === "changes_requested" ? t("adminPartners.profileChangesRequested")
                        : (partner as Record<string, unknown>).profile_status === "rejected" ? t("adminPartners.profileRejected")
                        : t("adminPartners.profileIncomplete")}
                    </span>
                  </div>
                  <p className="text-[10px] font-body text-muted-foreground">
                    {[partner.city, partner.country].filter(Boolean).join(", ") || "—"}
                    {partner.contact_email && ` · ${partner.contact_email}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`w-2 h-2 rounded-full ${partner.is_active ? "bg-emerald-500" : "bg-red-400"}`} />
                  <span className="text-[10px] font-body text-muted-foreground">{productCounts[partner.slug] || 0} {t("adminPartners.prod")}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
