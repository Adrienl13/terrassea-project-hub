import { Link } from "react-router-dom";
import { MapPin, Award, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Partner {
  id: string;
  slug: string;
  name: string;
  partner_type: string;
  logo_url: string | null;
  country: string | null;
  description: string | null;
  specialties: string[] | null;
  certifications: string[] | null;
  is_featured: boolean | null;
}

export default function PartnerCard({ partner }: { partner: Partner }) {
  const typeLabels: Record<string, string> = {
    brand: "Brand",
    manufacturer: "Manufacturer",
    reseller: "Reseller",
    designer: "Designer",
  };

  return (
    <Link
      to={`/partners/${partner.slug}`}
      className="group block rounded-xl border border-border bg-card p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {partner.logo_url ? (
            <img
              src={partner.logo_url}
              alt={partner.name}
              className="h-12 w-12 rounded-lg object-contain bg-muted p-1"
            />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center font-display font-bold text-lg text-muted-foreground">
              {partner.name.charAt(0)}
            </div>
          )}
          <div>
            <h3 className="font-display font-semibold text-foreground group-hover:text-foreground/80 transition-colors">
              {partner.name}
            </h3>
            <Badge variant="secondary" className="mt-1 text-xs font-body">
              {typeLabels[partner.partner_type] || partner.partner_type}
            </Badge>
          </div>
        </div>
        {partner.is_featured && (
          <Badge className="bg-accent text-accent-foreground text-xs font-display">
            Featured
          </Badge>
        )}
      </div>

      {partner.country && (
        <div className="flex items-center gap-1.5 mt-4 text-sm text-muted-foreground font-body">
          <MapPin className="h-3.5 w-3.5" />
          {partner.country}
        </div>
      )}

      {partner.description && (
        <p className="mt-3 text-sm font-body text-muted-foreground line-clamp-2">
          {partner.description}
        </p>
      )}

      {partner.specialties && partner.specialties.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4">
          {partner.specialties.slice(0, 3).map((s) => (
            <span
              key={s}
              className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-body"
            >
              {s}
            </span>
          ))}
          {partner.specialties.length > 3 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-body">
              +{partner.specialties.length - 3}
            </span>
          )}
        </div>
      )}

      {partner.certifications && partner.certifications.length > 0 && (
        <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground font-body">
          <Award className="h-3.5 w-3.5" />
          {partner.certifications.slice(0, 2).join(", ")}
        </div>
      )}

      <div className="flex items-center gap-1 mt-4 text-sm font-display font-medium text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
        View Profile <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}
