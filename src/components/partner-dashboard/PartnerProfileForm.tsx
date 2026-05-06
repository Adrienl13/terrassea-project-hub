import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Building2, Globe, MapPin, FileText, Upload, Save, CheckCircle2, Loader2,
  Crown, Plus, X, Image as ImageIcon,
} from "lucide-react";

import { PARTNER_TYPES } from "@/lib/partnerConstants";
import { validateImageUpload } from "@/lib/validateUpload";
import { SUPPORTED_COUNTRIES } from "@/lib/countries";

// Single source of truth for countries (Dette 38 DRY, 2026-05-06). The form
// uses French labels (UI is FR-first per CLAUDE.md), aliased here for backward
// compat with existing code referencing { code, name }.
const COUNTRIES = SUPPORTED_COUNTRIES.map((c) => ({ code: c.code, name: c.name_fr }));

// Lowercase-kebab convention (Dette 37, 2026-05-06). Labels rendered via
// prettyCategory() helper since not all entries have an i18n key.
const PRODUCT_CATEGORIES = [
  "chairs", "tables", "parasols", "loungers", "sofas", "stools",
  "accessories", "lighting", "planters", "screens",
];

/** lowercase-kebab → human label (e.g., "bar-stools" → "Bar Stools"). */
const prettyCategory = (cat: string) =>
  cat
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const BRAND_SPECIALTIES = [
  "Aluminium", "Teck", "Résine tressée", "Acier", "Tissu technique", "Pierre",
  "Céramique", "Bois massif", "Rotin", "Inox", "Fibre synthétique", "HPL",
  "Corde nautique", "Béton fibré", "Verre trempé",
];

const BRAND_CERTIFICATIONS = [
  "FSC", "PEFC", "ISO 9001", "ISO 14001", "OEKO-TEX", "GreenGuard",
  "Made in France", "Made in Italy", "Made in Spain", "BIFMA", "EN 581",
];

const DELIVERY_COUNTRIES = COUNTRIES.map((c) => c.name);

interface PartnerProfileFormProps {
  partnerId: string;
  onCompleted: () => void;
  reviewNotes?: string | null;
}

interface FormData {
  name: string;
  partner_type: string;
  country: string;
  country_code: string;
  city: string;
  siren: string;
  vat_number: string;
  website: string;
  product_categories: string[];
  description: string;
  logo_url: string;
  delivery_countries: string[];
  // Brand showcase fields
  hero_image_url: string;
  cover_photo_url: string;
  founded_year: number | null;
  specialties: string[];
  certifications: string[];
  gallery_urls: string[];
  video_url: string;
  showroom_address: string;
  contact_name_display: string;
  contact_email_display: string;
  contact_phone_display: string;
}

export default function PartnerProfileForm({ partnerId, onCompleted, reviewNotes }: PartnerProfileFormProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [customSpecialty, setCustomSpecialty] = useState("");
  const [customCertification, setCustomCertification] = useState("");
  const [form, setForm] = useState<FormData>({
    name: "",
    partner_type: "manufacturer",
    country: "",
    country_code: "",
    city: "",
    siren: "",
    vat_number: "",
    website: "",
    product_categories: [],
    description: "",
    logo_url: "",
    delivery_countries: [],
    hero_image_url: "",
    cover_photo_url: "",
    founded_year: null,
    specialties: [],
    certifications: [],
    gallery_urls: [],
    video_url: "",
    showroom_address: "",
    contact_name_display: "",
    contact_email_display: "",
    contact_phone_display: "",
  });

  // Load existing partner data
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("partners")
        .select("*")
        .eq("id", partnerId)
        .single();

      if (data) {
        setForm({
          name: data.name || profile?.company || "",
          partner_type: data.partner_type || "manufacturer",
          country: data.country || "",
          country_code: (data.country_code || "").trim(),
          city: data.city || "",
          siren: (data as Record<string, unknown>).siren as string || "",
          vat_number: data.vat_number || "",
          website: data.website || "",
          product_categories: data.product_categories || [],
          description: data.description || "",
          logo_url: data.logo_url || "",
          delivery_countries: data.delivery_countries || [],
          hero_image_url: (data as any).hero_image_url || "",
          cover_photo_url: (data as any).cover_photo_url || "",
          founded_year: (data as any).founded_year || null,
          specialties: (data as any).specialties || [],
          certifications: (data as any).certifications || [],
          gallery_urls: (data as any).gallery_urls || [],
          video_url: (data as any).video_url || "",
          showroom_address: (data as any).showroom_address || "",
          contact_name_display: data.contact_name || "",
          contact_email_display: data.contact_email || "",
          contact_phone_display: data.contact_phone || "",
        });
      }
    };
    load();
  }, [partnerId, profile]);

  // Count completed fields for progress
  const completedFields = [
    form.name.trim().length > 0,
    form.partner_type.length > 0,
    form.country.length > 0,
    form.city.trim().length > 0,
    form.siren.trim().length > 0 || form.vat_number.trim().length > 0,
    form.website.trim().length > 0,
    form.product_categories.length > 0,
    form.description.trim().length >= 50,
    form.delivery_countries.length > 0,
  ].filter(Boolean).length;
  const totalFields = 9;
  const progressPercent = Math.round((completedFields / totalFields) * 100);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const vErr = validateImageUpload(file, { maxSizeMB: 2, allowSvg: true });
    if (vErr) { toast.error(vErr); return; }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `partner-logos/${partnerId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("partner-assets")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      // If bucket doesn't exist, just store a placeholder
      toast.error(t("partnerProfile.uploadError", "Upload failed. You can add the logo later."));
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("partner-assets").getPublicUrl(path);
    setForm((prev) => ({ ...prev, logo_url: urlData.publicUrl }));
    setUploading(false);
    toast.success(t("partnerProfile.logoUploaded", "Logo uploaded"));
  };

  const handleImageUpload = async (
    file: File,
    pathPrefix: string,
    setLoading: (v: boolean) => void,
    field: "hero_image_url" | "cover_photo_url",
  ) => {
    const vErr = validateImageUpload(file, { maxSizeMB: 5 });
    if (vErr) { toast.error(vErr); return; }
    setLoading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${pathPrefix}/${partnerId}.${ext}`;
    const { error } = await supabase.storage.from("partner-assets").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed"); setLoading(false); return; }
    const { data: urlData } = supabase.storage.from("partner-assets").getPublicUrl(path);
    setForm((prev) => ({ ...prev, [field]: urlData.publicUrl }));
    setLoading(false);
    toast.success("Image uploadée");
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = 6 - form.gallery_urls.length;
    if (remaining <= 0) { toast.error("Maximum 6 photos"); return; }
    setUploadingGallery(true);
    const newUrls: string[] = [];
    for (const file of files.slice(0, remaining)) {
      const vErr = validateImageUpload(file, { maxSizeMB: 5 });
      if (vErr) { toast.error(vErr); continue; }
      const ext = file.name.split(".").pop() || "jpg";
      const path = `brand-gallery/${partnerId}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const { error } = await supabase.storage.from("partner-assets").upload(path, file, { contentType: file.type });
      if (!error) {
        const { data: urlData } = supabase.storage.from("partner-assets").getPublicUrl(path);
        newUrls.push(urlData.publicUrl);
      }
    }
    setForm((prev) => ({ ...prev, gallery_urls: [...prev.gallery_urls, ...newUrls] }));
    setUploadingGallery(false);
    if (newUrls.length > 0) toast.success(`${newUrls.length} photo(s) ajoutée(s)`);
    e.target.value = "";
  };

  const toggleSpecialty = (s: string) =>
    setForm((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(s) ? prev.specialties.filter((x) => x !== s) : [...prev.specialties, s],
    }));

  const toggleCertification = (c: string) =>
    setForm((prev) => ({
      ...prev,
      certifications: prev.certifications.includes(c) ? prev.certifications.filter((x) => x !== c) : [...prev.certifications, c],
    }));

  const handleSubmit = async () => {
    if (form.name.trim().length === 0) {
      toast.error(t("partnerProfile.nameRequired", "Company name is required"));
      return;
    }
    if (form.description.trim().length < 50) {
      toast.error(t("partnerProfile.descriptionTooShort", "Description must be at least 50 characters"));
      return;
    }

    setSaving(true);

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      partner_type: form.partner_type,
      country: form.country,
      country_code: form.country_code,
      city: form.city.trim(),
      siren: form.siren.trim() || null,
      vat_number: form.vat_number.trim() || null,
      website: form.website.trim() || null,
      product_categories: form.product_categories,
      description: form.description.trim(),
      logo_url: form.logo_url || null,
      delivery_countries: form.delivery_countries,
      hero_image_url: form.hero_image_url || null,
      cover_photo_url: form.cover_photo_url || null,
      founded_year: form.founded_year || null,
      specialties: form.specialties.length > 0 ? form.specialties : null,
      certifications: form.certifications.length > 0 ? form.certifications : null,
      gallery_urls: form.gallery_urls.length > 0 ? form.gallery_urls : null,
      video_url: form.video_url.trim() || null,
      showroom_address: form.showroom_address.trim() || null,
      contact_name: form.contact_name_display.trim() || null,
      contact_email: form.contact_email_display.trim() || null,
      contact_phone: form.contact_phone_display.trim() || null,
      profile_completed: false,
      profile_submitted: true,
      profile_submitted_at: new Date().toISOString(),
      profile_status: "pending_review",
    };

    const { error } = await supabase
      .from("partners")
      .update(payload)
      .eq("id", partnerId);

    setSaving(false);

    if (error) {
      toast.error(t("partnerProfile.saveError", "Error saving profile: ") + error.message);
      return;
    }

    // Notify all admins
    const { data: admins } = await supabase.from("user_profiles").select("id").eq("user_type", "admin");
    for (const admin of admins || []) {
      await supabase.from("notifications").insert({
        user_id: admin.id,
        title: "Nouvelle fiche partenaire à valider",
        body: `${form.name} (${form.partner_type}) a soumis sa fiche partenaire pour validation.`,
        type: "info",
        link: "/admin?tab=partners",
      });
    }

    toast.success(t("partnerProfile.submitted", "Votre fiche a été soumise pour validation. Vous recevrez une notification dès qu'elle sera approuvée."));
    queryClient.invalidateQueries({ queryKey: ["partner-data-for-user"] });
    queryClient.invalidateQueries({ queryKey: ["partner-profile-status"] });
  };

  const toggleCategory = (cat: string) => {
    setForm((prev) => ({
      ...prev,
      product_categories: prev.product_categories.includes(cat)
        ? prev.product_categories.filter((c) => c !== cat)
        : [...prev.product_categories, cat],
    }));
  };

  const toggleDeliveryCountry = (country: string) => {
    setForm((prev) => ({
      ...prev,
      delivery_countries: prev.delivery_countries.includes(country)
        ? prev.delivery_countries.filter((c) => c !== country)
        : [...prev.delivery_countries, country],
    }));
  };

  const inputClass =
    "w-full text-sm font-body bg-white border border-border rounded-lg px-3 py-2.5 focus:outline-none focus:border-foreground/40 transition-colors";
  const labelClass =
    "text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Admin review notes banner */}
      {reviewNotes && (
        <div className="border border-amber-300 bg-amber-50 rounded-xl p-4">
          <p className="text-sm font-display font-bold text-amber-800 mb-1">
            {t("partnerProfile.changesRequested", "L'admin a demandé des modifications :")}
          </p>
          <p className="text-sm font-body text-amber-700">{reviewNotes}</p>
        </div>
      )}

      {/* Header */}
      <div className="text-center">
        <Building2 className="h-8 w-8 mx-auto text-foreground mb-3" />
        <h2 className="font-display text-xl font-bold text-foreground">
          {t("partnerProfile.title", "Complete your partner profile")}
        </h2>
        <p className="text-sm font-body text-muted-foreground mt-1">
          {t("partnerProfile.subtitle", "Complete your profile to start adding products to the catalog.")}
        </p>
      </div>

      {/* Progress bar */}
      <div className="border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-display font-semibold text-foreground">
            {t("partnerProfile.progress", "{{completed}}/{{total}} fields completed", {
              completed: completedFields,
              total: totalFields,
            })}
          </span>
          <span className="text-xs font-body text-muted-foreground">{progressPercent}%</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPercent}%`,
              background: progressPercent >= 100 ? "#16a34a" : progressPercent >= 60 ? "#d97706" : "#ef4444",
            }}
          />
        </div>
      </div>

      {/* Identity section */}
      <div className="border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-display font-bold text-sm flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          {t("partnerProfile.identity", "Company identity")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>{t("partnerProfile.companyName", "Company name")} *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t("partnerProfile.partnerType", "Partner type")} *</label>
            <select
              value={form.partner_type}
              onChange={(e) => setForm((prev) => ({ ...prev, partner_type: e.target.value }))}
              className={inputClass}
            >
              {PARTNER_TYPES.map((pt) => (
                <option key={pt} value={pt}>
                  {t(`partnerProfile.type.${pt}`, pt)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{t("partnerProfile.siren", "SIREN / Company number")}</label>
            <input
              type="text"
              value={form.siren}
              onChange={(e) => setForm((prev) => ({ ...prev, siren: e.target.value }))}
              className={inputClass}
              placeholder="123 456 789"
            />
          </div>
          <div>
            <label className={labelClass}>{t("partnerProfile.vat", "TVA number")}</label>
            <input
              type="text"
              value={form.vat_number}
              onChange={(e) => setForm((prev) => ({ ...prev, vat_number: e.target.value }))}
              className={inputClass}
              placeholder="FR12345678901"
            />
          </div>
        </div>
      </div>

      {/* Location section */}
      <div className="border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-display font-bold text-sm flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          {t("partnerProfile.location", "Location")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>{t("partnerProfile.country", "Country")} *</label>
            <select
              value={form.country_code}
              onChange={(e) => {
                const c = COUNTRIES.find((co) => co.code === e.target.value);
                setForm((prev) => ({
                  ...prev,
                  country_code: e.target.value,
                  country: c?.name || "",
                }));
              }}
              className={inputClass}
            >
              <option value="">{t("partnerProfile.selectCountry", "-- Select --")}</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{t("partnerProfile.city", "City")} *</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t("partnerProfile.website", "Website")}</label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
              className={inputClass}
              placeholder="https://..."
            />
          </div>
        </div>
      </div>

      {/* Product categories */}
      <div className="border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-display font-bold text-sm">
          {t("partnerProfile.productCategories", "Product categories")}
        </h3>
        <div className="flex flex-wrap gap-2">
          {PRODUCT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCategory(cat)}
              className={`px-3 py-1.5 text-xs font-display font-semibold rounded-full border transition-all ${
                form.product_categories.includes(cat)
                  ? "bg-foreground text-primary-foreground border-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/30"
              }`}
            >
              {form.product_categories.includes(cat) && (
                <CheckCircle2 className="h-3 w-3 inline mr-1" />
              )}
              {prettyCategory(cat)}
            </button>
          ))}
        </div>
      </div>

      {/* Delivery countries */}
      <div className="border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-display font-bold text-sm">
          {t("partnerProfile.deliveryCountries", "Delivery countries")}
        </h3>
        <div className="flex flex-wrap gap-2">
          {DELIVERY_COUNTRIES.map((country) => (
            <button
              key={country}
              type="button"
              onClick={() => toggleDeliveryCountry(country)}
              className={`px-3 py-1.5 text-xs font-display font-semibold rounded-full border transition-all ${
                form.delivery_countries.includes(country)
                  ? "bg-foreground text-primary-foreground border-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/30"
              }`}
            >
              {form.delivery_countries.includes(country) && (
                <CheckCircle2 className="h-3 w-3 inline mr-1" />
              )}
              {country}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-display font-bold text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {t("partnerProfile.descriptionTitle", "Company description")}
        </h3>
        <div>
          <textarea
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            rows={4}
            className={`${inputClass} resize-none`}
            placeholder={t(
              "partnerProfile.descriptionPlaceholder",
              "Describe your company, your expertise, products you manufacture or distribute... (minimum 50 characters)"
            )}
          />
          <p className={`text-[10px] font-body mt-1 ${form.description.length >= 50 ? "text-green-600" : "text-muted-foreground"}`}>
            {form.description.length}/50 {t("partnerProfile.minChars", "minimum characters")}
          </p>
        </div>
      </div>

      {/* Logo */}
      <div className="border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-display font-bold text-sm flex items-center gap-2">
          <Upload className="h-4 w-4" />
          {t("partnerProfile.logo", "Company logo")}
        </h3>
        <div className="flex items-center gap-4">
          {form.logo_url ? (
            <img
              src={form.logo_url}
              alt="Logo"
              className="w-16 h-16 rounded-xl border border-border object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl border border-dashed border-border flex items-center justify-center bg-muted">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div>
            <label className="flex items-center gap-2 px-4 py-2 text-xs font-display font-semibold border border-border rounded-full cursor-pointer hover:border-foreground/30 transition-colors">
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {uploading
                ? t("partnerProfile.uploading", "Uploading...")
                : t("partnerProfile.chooseLogo", "Choose a file")}
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
            <p className="text-[10px] font-body text-muted-foreground mt-1">
              PNG, JPG, SVG — max 2 MB
            </p>
          </div>
        </div>
      </div>

      {/* Brand Showcase (brands only) */}
      {form.partner_type === "brand" && (
        <div className="border-2 border-purple-200 bg-purple-50/30 rounded-xl p-5 space-y-6">
          <div>
            <h3 className="font-display font-bold text-sm flex items-center gap-2 text-purple-700">
              <Crown className="h-4 w-4" /> Vitrine Marque
            </h3>
            <p className="text-[10px] font-body text-muted-foreground mt-1">
              Ces informations sont affichées sur votre page marque publique. Plus votre fiche est complète, plus elle est attractive.
            </p>
          </div>

          {/* Hero image */}
          <div>
            <label className={labelClass}>Image principale (header de votre page marque)</label>
            {form.hero_image_url ? (
              <div className="relative rounded-xl overflow-hidden">
                <img src={form.hero_image_url} alt="" className="w-full h-44 object-cover" />
                <button onClick={() => setForm((p) => ({ ...p, hero_image_url: "" }))} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-purple-300 rounded-xl cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-all">
                {uploadingHero ? <Loader2 className="h-5 w-5 animate-spin text-purple-400" /> : <Upload className="h-5 w-5 text-purple-400 mb-1" />}
                <span className="text-[10px] font-body text-muted-foreground">Format 16:9 recommandé, min 1600px</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, "brand-hero", setUploadingHero, "hero_image_url"); }} />
              </label>
            )}
          </div>

          {/* Cover photo */}
          <div>
            <label className={labelClass}>Photo de couverture (pour les listings)</label>
            {form.cover_photo_url ? (
              <div className="relative w-48 rounded-xl overflow-hidden">
                <img src={form.cover_photo_url} alt="" className="w-full h-32 object-cover" />
                <button onClick={() => setForm((p) => ({ ...p, cover_photo_url: "" }))} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-48 h-32 border-2 border-dashed border-purple-300 rounded-xl cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-all">
                {uploadingCover ? <Loader2 className="h-4 w-4 animate-spin text-purple-400" /> : <Upload className="h-4 w-4 text-purple-400 mb-1" />}
                <span className="text-[9px] font-body text-muted-foreground">Format 4:3</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, "brand-cover", setUploadingCover, "cover_photo_url"); }} />
              </label>
            )}
          </div>

          {/* Founded year */}
          <div className="max-w-xs">
            <label className={labelClass}>Année de fondation</label>
            <input
              type="number"
              min={1800}
              max={new Date().getFullYear()}
              value={form.founded_year ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, founded_year: e.target.value ? Number(e.target.value) : null }))}
              className={inputClass}
              placeholder="ex: 1985"
            />
          </div>

          {/* Specialties */}
          <div>
            <label className={labelClass}>Spécialités & matériaux</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {BRAND_SPECIALTIES.map((s) => (
                <button key={s} type="button" onClick={() => toggleSpecialty(s)} className={`px-3 py-1.5 text-xs font-display font-semibold rounded-full border transition-all ${form.specialties.includes(s) ? "bg-purple-600 text-white border-purple-600" : "border-purple-200 text-purple-600 hover:border-purple-400"}`}>
                  {form.specialties.includes(s) && <CheckCircle2 className="h-3 w-3 inline mr-1" />}{s}
                </button>
              ))}
              {form.specialties.filter((s) => !BRAND_SPECIALTIES.includes(s)).map((s) => (
                <span key={s} className="px-3 py-1.5 text-xs font-display font-semibold rounded-full bg-purple-600 text-white border border-purple-600 flex items-center gap-1">
                  {s} <button type="button" onClick={() => toggleSpecialty(s)}><X className="h-2.5 w-2.5" /></button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input value={customSpecialty} onChange={(e) => setCustomSpecialty(e.target.value)} placeholder="Ajouter une spécialité..." className="text-xs font-body border border-purple-200 rounded-full px-3 py-1.5 focus:outline-none focus:border-purple-500 w-48" onKeyDown={(e) => { if (e.key === "Enter" && customSpecialty.trim()) { e.preventDefault(); toggleSpecialty(customSpecialty.trim()); setCustomSpecialty(""); } }} />
              <button type="button" onClick={() => { if (customSpecialty.trim()) { toggleSpecialty(customSpecialty.trim()); setCustomSpecialty(""); } }} className="text-[10px] font-display font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-0.5"><Plus className="h-3 w-3" /> Ajouter</button>
            </div>
          </div>

          {/* Certifications */}
          <div>
            <label className={labelClass}>Certifications & labels</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {BRAND_CERTIFICATIONS.map((c) => (
                <button key={c} type="button" onClick={() => toggleCertification(c)} className={`px-3 py-1.5 text-xs font-display font-semibold rounded-full border transition-all ${form.certifications.includes(c) ? "bg-emerald-600 text-white border-emerald-600" : "border-emerald-200 text-emerald-700 hover:border-emerald-400"}`}>
                  {form.certifications.includes(c) && <CheckCircle2 className="h-3 w-3 inline mr-1" />}{c}
                </button>
              ))}
              {form.certifications.filter((c) => !BRAND_CERTIFICATIONS.includes(c)).map((c) => (
                <span key={c} className="px-3 py-1.5 text-xs font-display font-semibold rounded-full bg-emerald-600 text-white border border-emerald-600 flex items-center gap-1">
                  {c} <button type="button" onClick={() => toggleCertification(c)}><X className="h-2.5 w-2.5" /></button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input value={customCertification} onChange={(e) => setCustomCertification(e.target.value)} placeholder="Ajouter une certification..." className="text-xs font-body border border-emerald-200 rounded-full px-3 py-1.5 focus:outline-none focus:border-emerald-500 w-48" onKeyDown={(e) => { if (e.key === "Enter" && customCertification.trim()) { e.preventDefault(); toggleCertification(customCertification.trim()); setCustomCertification(""); } }} />
              <button type="button" onClick={() => { if (customCertification.trim()) { toggleCertification(customCertification.trim()); setCustomCertification(""); } }} className="text-[10px] font-display font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-0.5"><Plus className="h-3 w-3" /> Ajouter</button>
            </div>
          </div>

          {/* Gallery */}
          <div>
            <label className={labelClass}>Galerie — Atelier, showroom, savoir-faire (max 6)</label>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {form.gallery_urls.map((url, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden aspect-[4/3]">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setForm((p) => ({ ...p, gallery_urls: p.gallery_urls.filter((_, idx) => idx !== i) }))} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {form.gallery_urls.length < 6 && (
                <label className="flex flex-col items-center justify-center aspect-[4/3] border-2 border-dashed border-purple-300 rounded-xl cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-all">
                  {uploadingGallery ? <Loader2 className="h-4 w-4 animate-spin text-purple-400" /> : <><ImageIcon className="h-5 w-5 text-purple-300 mb-1" /><span className="text-[9px] font-body text-muted-foreground">Ajouter</span></>}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />
                </label>
              )}
            </div>
          </div>

          {/* Video URL */}
          <div>
            <label className={labelClass}>Vidéo de présentation (YouTube ou Vimeo)</label>
            <input
              type="url"
              value={form.video_url}
              onChange={(e) => setForm((p) => ({ ...p, video_url: e.target.value }))}
              className={inputClass}
              placeholder="https://www.youtube.com/watch?v=... ou https://vimeo.com/..."
            />
            <p className="text-[9px] font-body text-muted-foreground mt-1">Collez le lien de votre vidéo de présentation</p>
          </div>

          {/* Showroom address */}
          <div>
            <label className={labelClass}>Adresse du showroom (optionnel)</label>
            <textarea
              value={form.showroom_address}
              onChange={(e) => setForm((p) => ({ ...p, showroom_address: e.target.value }))}
              className={`${inputClass} resize-none`}
              rows={2}
              placeholder="ex: 12 rue de la Paix, 75002 Paris"
            />
          </div>

          {/* Contact info */}
          <div>
            <label className={labelClass}>Informations de contact (affichées sur votre page marque)</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                value={form.contact_name_display}
                onChange={(e) => setForm((p) => ({ ...p, contact_name_display: e.target.value }))}
                className={inputClass}
                placeholder="Nom du contact"
              />
              <input
                type="email"
                value={form.contact_email_display}
                onChange={(e) => setForm((p) => ({ ...p, contact_email_display: e.target.value }))}
                className={inputClass}
                placeholder="Email"
              />
              <input
                type="tel"
                value={form.contact_phone_display}
                onChange={(e) => setForm((p) => ({ ...p, contact_phone_display: e.target.value }))}
                className={inputClass}
                placeholder="Téléphone"
              />
            </div>
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-center pt-2 pb-8">
        <button
          onClick={handleSubmit}
          disabled={saving || completedFields < 5}
          className="flex items-center gap-2 px-8 py-3 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {reviewNotes
            ? t("partnerProfile.resubmit", "Soumettre à nouveau")
            : t("partnerProfile.submit", "Soumettre ma fiche")}
        </button>
      </div>
    </div>
  );
}
