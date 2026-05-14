// ============================================================================
// ProductCertificationsPublic — public-facing certifications section
// ÉTAPE 8f (2026-05-05).
//
// Renders 2 sub-sections on the public product detail page:
//   A) Brand-level certifications (inherited from partner_certifications)
//   B) Product-specific certifications (from product_certifications, with PV)
//
// PDF download authenticated-only (B2B freemium model — protects partner
// data from scraping, captures qualified leads).
// ============================================================================

import { useNavigate, useLocation } from "react-router-dom";
import { ShieldCheck, FileText, Lock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  usePartnerCertifications,
  useProductCertifications,
  type Certification,
  type PartnerCertificationWithDetails,
  type ProductCertificationWithDetails,
} from "@/lib/referentials";

interface Props {
  productId: string;
  partnerId: string;
  partnerName?: string | null;
}

const formatDate = (iso: string | null) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("fr-FR");
  } catch {
    return iso;
  }
};
const isExpired = (validUntil: string | null) => {
  if (!validUntil) return false;
  return new Date(validUntil) < new Date();
};

interface CardProps {
  certification: Certification;
  validUntil: string | null;
  certNumber: string | null;
  pvNumber?: string | null;
  labName?: string | null;
  documentPath: string | null;
  isAuthenticated: boolean;
  isProduct?: boolean;
  onLoginRedirect: () => void;
}

function CertificationCard({
  certification,
  validUntil,
  certNumber,
  pvNumber,
  labName,
  documentPath,
  isAuthenticated,
  isProduct,
  onLoginRedirect,
}: CardProps) {
  const expired = isExpired(validUntil);
  const validityStr = formatDate(validUntil);

  async function handleDownload() {
    if (!documentPath) {
      toast.error("Document non disponible");
      return;
    }
    if (!isAuthenticated) {
      onLoginRedirect();
      return;
    }
    const { data, error } = await supabase
      .storage
      .from("partner-certificates")
      .download(documentPath);
    if (error || !data) {
      toast.error("Téléchargement impossible : " + (error?.message ?? "fichier introuvable"));
      return;
    }
    const url = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${isProduct ? "PV_" : ""}${certification.slug}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Mobile UX V2 — stack vertical mobile (icon+title row, details below,
  // CTA full-width below) ; layout horizontal préservé desktop.
  return (
    <div className="border border-border rounded-md p-4 hover:border-foreground/40 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
          {certification.logo_url ? (
            <img
              src={certification.logo_url}
              alt={certification.name}
              className="w-full h-full object-contain p-1"
            />
          ) : (
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-semibold text-sm text-foreground break-words">
              {certification.name}
            </span>
            {expired && (
              <Badge className="text-[9px] bg-red-500/10 text-red-700 border-red-500/20">
                Expiré
              </Badge>
            )}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 text-[11px] text-muted-foreground mt-1 gap-y-0.5 sm:flex-wrap">
            {pvNumber && <span>PV n° {pvNumber}</span>}
            {labName && <span>Labo : {labName}</span>}
            {certNumber && <span>N° {certNumber}</span>}
            {validityStr && <span>Valide jusqu'au {validityStr}</span>}
          </div>
        </div>
        {documentPath && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="flex-shrink-0 hidden sm:inline-flex"
          >
            {isAuthenticated ? (
              <><FileText className="h-3.5 w-3.5 mr-1" /> {isProduct ? "PV" : "Certificat"}</>
            ) : (
              <><Lock className="h-3.5 w-3.5 mr-1" /> Connexion</>
            )}
          </Button>
        )}
      </div>
      {documentPath && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          className="mt-3 w-full sm:hidden"
        >
          {isAuthenticated ? (
            <><FileText className="h-3.5 w-3.5 mr-1" /> {isProduct ? "Télécharger le PV" : "Télécharger le certificat"}</>
          ) : (
            <><Lock className="h-3.5 w-3.5 mr-1" /> Se connecter pour télécharger</>
          )}
        </Button>
      )}
    </div>
  );
}

export default function ProductCertificationsPublic({
  productId,
  partnerId,
  partnerName,
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = !!user;

  const { data: brandCerts = [] } = usePartnerCertifications(partnerId);
  const { data: productCerts = [] } = useProductCertifications(productId);

  const onLoginRedirect = () => {
    navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
  };

  // Don't render anything if no certifications at all
  if (brandCerts.length === 0 && productCerts.length === 0) {
    return null;
  }

  return (
    <section className="px-6 mt-6 md:mt-12">
      <div className="container mx-auto">
        <h2 className="font-display text-sm font-bold text-foreground uppercase tracking-wider mb-1 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          Certifications
        </h2>
        {!isAuthenticated && (
          <p className="text-[11px] font-body text-muted-foreground mb-6">
            <Lock className="h-3 w-3 inline mr-1" />
            Connectez-vous pour télécharger les certificats et procès-verbaux.
          </p>
        )}

        {/* A) Brand-level */}
        {brandCerts.length > 0 && (
          <div className="mb-8">
            <h3 className="font-display text-xs font-semibold text-foreground mb-1">
              {partnerName ? `Certifications de ${partnerName}` : "Certifications de marque"}
            </h3>
            <p className="text-[11px] font-body text-muted-foreground mb-3">
              Ces certifications s'appliquent à tous les produits de la marque.
            </p>
            <div className="space-y-2">
              {brandCerts.map((cert: PartnerCertificationWithDetails) => (
                <CertificationCard
                  key={cert.id}
                  certification={cert.certification}
                  validUntil={cert.valid_until}
                  certNumber={cert.certificate_number}
                  documentPath={cert.certificate_url}
                  isAuthenticated={isAuthenticated}
                  onLoginRedirect={onLoginRedirect}
                />
              ))}
            </div>
          </div>
        )}

        {/* B) Product-specific */}
        {productCerts.length > 0 && (
          <div>
            <h3 className="font-display text-xs font-semibold text-foreground mb-1">
              Certifications testées en laboratoire
            </h3>
            <p className="text-[11px] font-body text-muted-foreground mb-3">
              Ces certifications sont issues de tests individuels sur ce produit avec PV unique.
            </p>
            <div className="space-y-2">
              {productCerts.map((cert: ProductCertificationWithDetails) => (
                <CertificationCard
                  key={cert.id}
                  certification={cert.certification}
                  validUntil={cert.valid_until}
                  certNumber={null}
                  pvNumber={cert.pv_number}
                  labName={cert.lab_name}
                  documentPath={cert.pv_document_url}
                  isAuthenticated={isAuthenticated}
                  isProduct
                  onLoginRedirect={onLoginRedirect}
                />
              ))}
            </div>
          </div>
        )}

        {/* Soft warning if any expired cert (anonymous + authenticated) */}
        {[...brandCerts, ...productCerts].some((c) => isExpired(c.valid_until)) && (
          <p className="text-[10px] font-body text-amber-700 mt-4 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Certaines certifications sont expirées — contactez la marque pour vérification.
          </p>
        )}
      </div>
    </section>
  );
}
