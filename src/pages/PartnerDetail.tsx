import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PartnerContactDialog from "@/components/partners/PartnerContactDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Award, Globe, Factory, Layers } from "lucide-react";

export default function PartnerDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [showContact, setShowContact] = useState(false);

  const { data: partner, isLoading } = useQuery({
    queryKey: ["partner", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .eq("slug", slug!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const typeLabels: Record<string, string> = {
    brand: "Brand",
    manufacturer: "Manufacturer",
    reseller: "Reseller",
    designer: "Designer",
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-32 container mx-auto px-6">
          <div className="h-8 w-48 bg-muted rounded animate-pulse mb-4" />
          <div className="h-64 bg-muted rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-32 container mx-auto px-6 text-center">
          <h1 className="font-display text-2xl font-bold">Partner not found</h1>
          <Link to="/partners" className="text-sm text-muted-foreground hover:text-foreground mt-4 inline-block">
            ← Back to Partners
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="pt-28 pb-24 px-6">
        <div className="container mx-auto max-w-4xl">
          <Link
            to="/partners"
            className="inline-flex items-center gap-1.5 text-sm font-body text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Partners
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center gap-6 mb-10">
              {partner.logo_url ? (
                <img
                  src={partner.logo_url}
                  alt={partner.name}
                  className="h-20 w-20 rounded-xl object-contain bg-muted p-2"
                />
              ) : (
                <div className="h-20 w-20 rounded-xl bg-muted flex items-center justify-center font-display font-bold text-3xl text-muted-foreground">
                  {partner.name.charAt(0)}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="font-display text-3xl font-bold text-foreground">
                    {partner.name}
                  </h1>
                  <Badge variant="secondary" className="font-display">
                    {typeLabels[partner.partner_type] || partner.partner_type}
                  </Badge>
                </div>
                {partner.country && (
                  <div className="flex items-center gap-1.5 mt-2 text-muted-foreground font-body">
                    <MapPin className="h-4 w-4" />
                    {partner.city ? `${partner.city}, ` : ""}{partner.country}
                  </div>
                )}
              </div>
              <Button
                onClick={() => setShowContact(true)}
                className="rounded-full px-8 font-display font-semibold self-start"
              >
                Contact via Terrassea
              </Button>
            </div>

            {/* Description */}
            {partner.description && (
              <div className="mb-8">
                <h2 className="font-display font-semibold text-lg text-foreground mb-2">About</h2>
                <p className="font-body text-muted-foreground leading-relaxed">
                  {partner.description}
                </p>
              </div>
            )}

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {partner.specialties && partner.specialties.length > 0 && (
                <InfoBlock
                  icon={<Layers className="h-4 w-4" />}
                  title="Specialties"
                  items={partner.specialties}
                />
              )}
              {partner.certifications && partner.certifications.length > 0 && (
                <InfoBlock
                  icon={<Award className="h-4 w-4" />}
                  title="Certifications"
                  items={partner.certifications}
                />
              )}
              {partner.materials && partner.materials.length > 0 && (
                <InfoBlock
                  icon={<Factory className="h-4 w-4" />}
                  title="Materials"
                  items={partner.materials}
                />
              )}
              {partner.project_types && partner.project_types.length > 0 && (
                <InfoBlock
                  icon={<Globe className="h-4 w-4" />}
                  title="Project Types"
                  items={partner.project_types}
                />
              )}
            </div>

            {/* Additional info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {partner.production_capacity && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <span className="text-xs font-display font-medium text-muted-foreground uppercase tracking-wider">Production Capacity</span>
                  <p className="mt-1 font-body text-foreground">{partner.production_capacity}</p>
                </div>
              )}
              {partner.coverage_zone && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <span className="text-xs font-display font-medium text-muted-foreground uppercase tracking-wider">Coverage Zone</span>
                  <p className="mt-1 font-body text-foreground">{partner.coverage_zone}</p>
                </div>
              )}
              {partner.partner_subtype && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <span className="text-xs font-display font-medium text-muted-foreground uppercase tracking-wider">Partner Type</span>
                  <p className="mt-1 font-body text-foreground">{partner.partner_subtype}</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <PartnerContactDialog
        open={showContact}
        onOpenChange={setShowContact}
        partnerId={partner.id}
        partnerName={partner.name}
      />
      <Footer />
    </div>
  );
}

function InfoBlock({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="font-display font-semibold text-sm text-foreground">{title}</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-body"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
