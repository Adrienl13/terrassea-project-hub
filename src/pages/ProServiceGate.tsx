import { lazy } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Lock, Briefcase, ArrowRight, CheckCircle2, Star, Globe, Zap, Loader2,
} from "lucide-react";

const ProService = lazy(() => import("./ProService"));

export default function ProServiceGate() {
  const { profile, user } = useAuth();
  const { t } = useTranslation();

  // Resolve the logged-in partner by user_id (robust — contact_email match was
  // fragile). Pro Service is open to Founding Partners (development policy) and
  // to validated brands.
  const { data: partnerAccess, isLoading: partnerLoading } = useQuery({
    queryKey: ["pro-service-access", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("partners")
        .select("partner_type, profile_completed, profile_status, is_founding")
        .eq("user_id", user!.id)
        .is("deleted_at", null)
        .maybeSingle();
      if (!data) return { allowed: false };
      const isFounding = data.is_founding === true;
      const isValidatedBrand =
        data.partner_type === "brand" &&
        data.profile_completed &&
        data.profile_status === "approved";
      return { allowed: isFounding || isValidatedBrand };
    },
    enabled: !!user?.id && profile?.user_type === "partner",
  });

  // Admins and validated brands get the real ProService page
  if (profile?.user_type === "admin" || partnerAccess?.allowed) {
    return <ProService />;
  }

  // Loading state for partner check
  if (profile?.user_type === "partner" && partnerLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  // Everyone else sees the upgrade/teaser page
  return (
    <>
      <SEO title="Pro Service" noindex />
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-3xl mx-auto px-4 py-20">
          {/* Hero */}
          <div className="text-center space-y-6 mb-12">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
              <Lock className="h-9 w-9 text-amber-600" />
            </div>
            <div className="space-y-3">
              <h1 className="font-display text-3xl font-bold text-foreground">
                {t("proServiceGate.title", "Pro Service")}
              </h1>
              <p className="text-base font-body text-muted-foreground max-w-lg mx-auto leading-relaxed">
                {t("proServiceGate.description", "Access qualified project leads from hotels, restaurants, and beach clubs across Europe. Get matched with the right projects for your catalogue.")}
              </p>
            </div>
          </div>

          {/* Features grid */}
          <div className="grid md:grid-cols-2 gap-4 mb-10">
            {[
              { icon: Briefcase, titleKey: "proServiceGate.feature1Title", titleDefault: "Qualified leads", descKey: "proServiceGate.feature1Desc", descDefault: "Receive project briefs matched to your product catalogue and expertise.", color: "#D97706" },
              { icon: Star, titleKey: "proServiceGate.feature2Title", titleDefault: "Priority access", descKey: "proServiceGate.feature2Desc", descDefault: "Elite partners receive leads 48 hours before other suppliers.", color: "#7C3AED" },
              { icon: Globe, titleKey: "proServiceGate.feature3Title", titleDefault: "European coverage", descKey: "proServiceGate.feature3Desc", descDefault: "Projects from France, Spain, Italy, Greece, Portugal and more.", color: "#059669" },
              { icon: Zap, titleKey: "proServiceGate.feature4Title", titleDefault: "Direct connection", descKey: "proServiceGate.feature4Desc", descDefault: "Connect directly with project owners and submit proposals.", color: "#2563EB" },
            ].map((feat, i) => (
              <div key={i} className="border border-border rounded-2xl p-5 bg-white hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${feat.color}12` }}>
                  <feat.icon className="h-5 w-5" style={{ color: feat.color }} />
                </div>
                <h3 className="font-display text-sm font-bold text-foreground mb-1">
                  {t(feat.titleKey, feat.titleDefault)}
                </h3>
                <p className="text-xs font-body text-muted-foreground leading-relaxed">
                  {t(feat.descKey, feat.descDefault)}
                </p>
              </div>
            ))}
          </div>

          {/* Plan requirement */}
          <div className="border-2 border-dashed border-amber-300 rounded-2xl p-8 text-center bg-amber-50/50 space-y-4">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-amber-600" />
              <p className="font-display text-sm font-bold text-amber-900">
                {t("proServiceGate.requirement", "Available with the Elite plan")}
              </p>
            </div>
            <p className="text-xs font-body text-amber-700 max-w-md mx-auto">
              {t("proServiceGate.requirementDesc", "Upgrade to the Elite plan to access Pro Service leads, featured product placements, and priority visibility in search results.")}
            </p>
            <Link
              to="/become-partner"
              className="inline-flex items-center gap-2 text-sm font-display font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-full px-6 py-3 hover:opacity-90 transition-opacity"
            >
              {t("proServiceGate.cta", "View plans & upgrade")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
