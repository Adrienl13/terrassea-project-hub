import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Building2, Globe, MapPin, FileText, Upload, Save, CheckCircle2, Loader2,
} from "lucide-react";

const PARTNER_TYPES = ["manufacturer", "brand", "reseller", "distributor"];

const COUNTRIES = [
  { code: "FR", name: "France" }, { code: "IT", name: "Italie" }, { code: "ES", name: "Espagne" },
  { code: "DE", name: "Allemagne" }, { code: "PT", name: "Portugal" }, { code: "NL", name: "Pays-Bas" },
  { code: "BE", name: "Belgique" }, { code: "DK", name: "Danemark" }, { code: "SE", name: "Suède" },
  { code: "GR", name: "Grèce" }, { code: "GB", name: "Royaume-Uni" }, { code: "CH", name: "Suisse" },
  { code: "AT", name: "Autriche" }, { code: "PL", name: "Pologne" },
];

const PRODUCT_CATEGORIES = [
  "Chairs", "Tables", "Parasols", "Loungers", "Sofas", "Stools",
  "Accessories", "Lighting", "Planters", "Screens",
];

const DELIVERY_COUNTRIES = COUNTRIES.map((c) => c.name);

interface PartnerProfileFormProps {
  partnerId: string;
  onCompleted: () => void;
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
}

export default function PartnerProfileForm({ partnerId, onCompleted }: PartnerProfileFormProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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
      profile_completed: true,
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

    toast.success(t("partnerProfile.saved", "Profile completed successfully!"));
    queryClient.invalidateQueries({ queryKey: ["partner-data-for-user"] });
    queryClient.invalidateQueries({ queryKey: ["partner-profile-status"] });
    onCompleted();
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
              {cat}
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
          {t("partnerProfile.submit", "Complete my profile")}
        </button>
      </div>
    </div>
  );
}
