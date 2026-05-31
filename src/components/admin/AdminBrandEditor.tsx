import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, User, Layers, BookOpen, Package, Crown, Mail, CheckCircle2, Trash2 } from "lucide-react";
import type { PartnerPlan } from "@/lib/partnerConstants";
import PartnerProfileForm from "@/components/partner-dashboard/PartnerProfileForm";
import BrandCollectionManager from "@/components/partner-dashboard/BrandCollectionManager";
import BrandReferencesManager from "@/components/partner-dashboard/BrandReferencesManager";
import { PartnerCatalogueSection } from "@/components/partner-dashboard/PartnerCatalogueSection";
import FoundingBadge from "@/components/common/FoundingBadge";
import type { FoundingTier } from "@/hooks/useFoundingScore";

type EditorTab = "profile" | "collections" | "references" | "catalogue";

export default function AdminBrandEditor() {
  const { partnerId } = useParams<{ partnerId: string }>();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<EditorTab>("profile");
  const [inviting, setInviting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: partner, isLoading } = useQuery({
    queryKey: ["admin-brand-edit", partnerId],
    queryFn: async () => {
      if (!partnerId) return null;
      const { data, error } = await supabase
        .from("partners")
        .select("id, name, slug, logo_url, plan, partner_mode, partner_type, profile_completed, contact_email, user_id, is_founding, founding_tier, founding_joined_at, founding_total_points")
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
        `Envoyer l'email de bienvenue à ${partner.contact_email} ? La marque recevra un lien pour définir son mot de passe et accéder à son espace.`,
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

  const handleDelete = async () => {
    if (!partnerId || !partner) return;
    const confirmed = window.confirm(
      t(
        "adminBrandEditor.deleteConfirm",
        `Supprimer la marque « ${partner.name} » ?\n\nElle sera retirée des listes et masquée côté public. Ses produits, commandes et CGV sont conservés en base (délié) pour l'intégrité de l'audit. Action gérée par delete_partner_cascade.`,
      ),
    );
    if (!confirmed) return;
    setDeleting(true);
    const { data, error } = await supabase.rpc("delete_partner_cascade", { p_partner_id: partnerId });
    setDeleting(false);
    if (error) {
      toast.error(t("adminBrandEditor.deleteError", "Échec de la suppression :") + " " + (error.message || ""));
      return;
    }
    const payload = (data ?? {}) as { partner_name?: string };
    toast.success(
      t("adminBrandEditor.deleteSuccess", "Marque supprimée :") + " " + (payload.partner_name ?? partner.name),
    );
    queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
    queryClient.invalidateQueries({ queryKey: ["admin-brand-edit", partnerId] });
    navigate("/admin");
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

        <div className="flex items-center gap-2 flex-wrap">
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

          {/* Delete (soft-delete via delete_partner_cascade) */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            title={t("adminBrandEditor.deleteHint", "Supprimer cette marque (archivage avec préservation de l'audit)")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-body font-semibold text-red-600 border border-red-200 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {deleting
              ? t("adminBrandEditor.deleting", "Suppression…")
              : t("adminBrandEditor.deleteBrand", "Supprimer")}
          </button>
        </div>
      </div>

      {/* Founding partner banner — visible only if the brand is in the founding cohort.
          Tier defaults to 'founder' (rank 1, 0+ points) when the cache column is NULL,
          since semantically every is_founding=true partner is at least a founder. */}
      {partner.is_founding && (
        <div className="rounded-xl border border-violet-300 bg-gradient-to-r from-violet-50 to-purple-50 px-4 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            <FoundingBadge
              tier={(partner.founding_tier as FoundingTier | null) ?? "founder"}
              size="md"
            />
            <div className="text-[11px] font-body text-violet-900 flex items-center gap-2 flex-wrap">
              <span className="font-semibold">
                {t("adminBrandEditor.foundingBannerLabel", "Founding Partner")}
              </span>
              {partner.founding_joined_at && (
                <span className="text-violet-700/80">
                  ·{" "}
                  {t("adminBrandEditor.foundingSince", "depuis")}{" "}
                  {new Date(partner.founding_joined_at).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              )}
              <span className="text-violet-700/80">
                · {partner.founding_total_points ?? 0}{" "}
                {t("adminBrandEditor.foundingPoints", "pts")}
              </span>
            </div>
          </div>
        </div>
      )}

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
