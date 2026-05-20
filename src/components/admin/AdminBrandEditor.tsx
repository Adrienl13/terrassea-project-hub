import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, User, Layers, BookOpen, Package, Crown } from "lucide-react";
import type { PartnerPlan } from "@/lib/partnerConstants";
import PartnerProfileForm from "@/components/partner-dashboard/PartnerProfileForm";
import BrandCollectionManager from "@/components/partner-dashboard/BrandCollectionManager";
import BrandReferencesManager from "@/components/partner-dashboard/BrandReferencesManager";
import { PartnerCatalogueSection } from "@/components/partner-dashboard/PartnerCatalogueSection";

type EditorTab = "profile" | "collections" | "references" | "catalogue";

export default function AdminBrandEditor() {
  const { partnerId } = useParams<{ partnerId: string }>();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<EditorTab>("profile");

  const { data: partner, isLoading } = useQuery({
    queryKey: ["admin-brand-edit", partnerId],
    queryFn: async () => {
      if (!partnerId) return null;
      const { data, error } = await supabase
        .from("partners")
        .select("id, name, slug, logo_url, plan, partner_mode, partner_type, profile_completed")
        .eq("id", partnerId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!partnerId,
  });

  if (!partnerId) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-sm text-muted-foreground">
        {t("adminBrandEditor.missingId", "Identifiant de marque manquant dans l'URL.")}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-sm text-muted-foreground">
        {t("adminBrandEditor.loading", "Chargement…")}
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-4">
        <Link to="/admin" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="h-4 w-4" /> Admin
        </Link>
        <p className="text-sm text-muted-foreground">
          {t("adminBrandEditor.notFound", "Marque introuvable.")}
        </p>
      </div>
    );
  }

  const tabs: { id: EditorTab; label: string; icon: typeof User }[] = [
    { id: "profile",     label: t("adminBrandEditor.tabProfile",     "Profil"),      icon: User },
    { id: "collections", label: t("adminBrandEditor.tabCollections", "Collections"), icon: Layers },
    { id: "references",  label: t("adminBrandEditor.tabReferences",  "Références"),  icon: BookOpen },
    { id: "catalogue",   label: t("adminBrandEditor.tabCatalogue",   "Catalogue"),   icon: Package },
  ];

  const planForUI = (partner.plan ?? "brand_member") as PartnerPlan;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Breadcrumb + header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link
          to="/admin"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm font-body"
        >
          <ArrowLeft className="h-4 w-4" /> {t("adminBrandEditor.backToAdmin", "Admin")}
        </Link>
        <span className="text-muted-foreground">/</span>
        {partner.logo_url ? (
          <img loading="lazy" src={partner.logo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
            <Crown className="h-4 w-4 text-purple-500" />
          </div>
        )}
        <h1 className="text-lg font-display font-semibold">{partner.name}</h1>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
          partner.plan === "brand_network" ? "bg-violet-100 text-violet-700" : "bg-purple-100 text-purple-700"
        }`}>
          {partner.plan === "brand_network" ? "Network" : "Member"}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-body font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "border-purple-600 text-purple-700"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "profile" && (
          <PartnerProfileForm partnerId={partnerId} />
        )}
        {activeTab === "collections" && (
          <BrandCollectionManager partnerId={partnerId} plan={planForUI} />
        )}
        {activeTab === "references" && (
          <BrandReferencesManager partnerId={partnerId} />
        )}
        {activeTab === "catalogue" && (
          <PartnerCatalogueSection
            plan={planForUI}
            partnerId={partnerId}
            profileCompleted={partner.profile_completed ?? true}
          />
        )}
      </div>
    </div>
  );
}
