import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, User, Layers, BookOpen, Package, Crown, Mail, CheckCircle2 } from "lucide-react";
import type { PartnerPlan } from "@/lib/partnerConstants";
import PartnerProfileForm from "@/components/partner-dashboard/PartnerProfileForm";
import BrandCollectionManager from "@/components/partner-dashboard/BrandCollectionManager";
import BrandReferencesManager from "@/components/partner-dashboard/BrandReferencesManager";
import { PartnerCatalogueSection } from "@/components/partner-dashboard/PartnerCatalogueSection";

type EditorTab = "profile" | "collections" | "references" | "catalogue";

export default function AdminBrandEditor() {
  const { partnerId } = useParams<{ partnerId: string }>();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<EditorTab>("profile");
  const [inviting, setInviting] = useState(false);

  const { data: partner, isLoading } = useQuery({
    queryKey: ["admin-brand-edit", partnerId],
    queryFn: async () => {
      if (!partnerId) return null;
      const { data, error } = await supabase
        .from("partners")
        .select("id, name, slug, logo_url, plan, partner_mode, partner_type, profile_completed, contact_email, user_id")
        .eq("id", partnerId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!partnerId,
  });

  const handleInvite = async () => {
    if (!partnerId || !partner) return;
    if (partner.user_id) {
      toast.info(t("adminBrandEditor.alreadyInvitedToast", "Cette marque a déjà un compte lié."));
      return;
    }
    if (!partner.contact_email) {
      toast.error(t("adminBrandEditor.missingEmailToast", "Renseigne d'abord l'email de contact dans l'onglet Profil."));
      setActiveTab("profile");
      return;
    }
    const confirmed = window.confirm(
      t(
        "adminBrandEditor.inviteConfirm",
        `Envoyer un email d'invitation à ${partner.contact_email} ? La marque recevra un lien magique pour activer son compte.`,
      ),
    );
    if (!confirmed) return;
    setInviting(true);
    const { data, error } = await supabase.functions.invoke("invite-brand-partner", {
      body: { partner_id: partnerId },
    });
    setInviting(false);
    if (error) {
      toast.error(t("adminBrandEditor.inviteError", "Échec de l'invitation :") + " " + (error.message || ""));
      return;
    }
    if (data?.already_invited) {
      toast.info(t("adminBrandEditor.alreadyInvitedToast", "Cette marque a déjà un compte lié."));
    } else if (data?.ok) {
      toast.success(t("adminBrandEditor.inviteSuccess", "Invitation envoyée ✉️"));
    } else if (data?.error) {
      toast.error(data.error);
    }
    queryClient.invalidateQueries({ queryKey: ["admin-brand-edit", partnerId] });
    queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
  };

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
      <div className="flex items-center gap-3 flex-wrap justify-between">
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

        {/* Invite button — visible only when partner has no user_id yet */}
        {partner.user_id ? (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-body font-semibold text-emerald-700 bg-emerald-50 rounded-lg"
            title={t("adminBrandEditor.alreadyInvitedTitle", "Compte utilisateur déjà créé pour cette marque")}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t("adminBrandEditor.alreadyInvited", "Marque invitée")}
          </span>
        ) : (
          <button
            type="button"
            onClick={handleInvite}
            disabled={inviting || !partner.contact_email}
            title={
              !partner.contact_email
                ? t("adminBrandEditor.inviteNeedsEmail", "Renseigne d'abord l'email de contact dans l'onglet Profil")
                : t("adminBrandEditor.inviteHint", "Envoie un email d'invitation avec un lien magique")
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-body font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-all whitespace-nowrap shadow-sm"
          >
            <Mail className="h-3.5 w-3.5" />
            {inviting
              ? t("adminBrandEditor.inviting", "Envoi…")
              : t("adminBrandEditor.inviteBrand", "Inviter cette marque")}
          </button>
        )}
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
          <PartnerProfileForm
            partnerId={partnerId}
            onCompleted={() => {
              queryClient.invalidateQueries({ queryKey: ["admin-brand-edit", partnerId] });
              queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
            }}
          />
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
