import { Link } from "react-router-dom";
import { MapPin, Award, ArrowRight, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFavouritePartners } from "@/hooks/useFavouritesDB";
import { useAuth } from "@/contexts/AuthContext";

interface Partner {
  id: string;
  slug: string;
  name: string;
  partner_type: string;
  logo_url: string | null;
  country: string | null;
  country_code?: string | null;
  description: string | null;
  specialties: string[] | null;
  certifications: string[] | null;
  is_featured: boolean | null;
}

function countryFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(
    ...code.toUpperCase().split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

export default function PartnerCard({ partner }: { partner: Partner }) {
  const { user } = useAuth();
  const { isFavourite, toggle } = useFavouritePartners();
  const isFav = isFavourite(partner.id);

  const typeLabels: Record<string, string> = {
    brand: "Brand",
    manufacturer: "Manufacturer",
    reseller: "Reseller",
    designer: "Designer",
  };

  const flag = countryFlag(partner.country_code);

  return (
    <div className="group relative rounded-xl border border-border bg-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      {/* Favourite button */}
      {user && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(partner.id); }}
          className={`absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            isFav
              ? "bg-[#D4603A]/10 text-[#D4603A]"
              : "bg-background/80 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-[#D4603A]"
          }`}
        >
          <Heart className={`h-4 w-4 ${isFav ? "fill-[#D4603A]" : ""}`} />
        </button>
      )}

      <Link
        to={`/partners/${partner.slug}`}
        className="block p-6"
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
                {flag || partner.name.charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-display font-semibold text-foreground group-hover:text-foreground/80 transition-colors">
                  {partner.name}
                </h3>
                {flag && <span className="text-base">{flag}</span>}
              </div>
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
            {flag && <span>{flag}</span>} {partner.country}
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
    </div>
  );
}
