// ============================================================================
// ProductCertificationBadges — compact certifications row for product detail.
// ÉTAPE 8f-fix UX (2026-05-05).
//
// Sits in the product info column right after price/stock/sellers, before the
// description. Combines brand-level + product-level certifications, filters
// expired ones out, shows up to 4 visible badges with "+N autres" overflow.
//
// Click on any badge (or overflow / "voir tout" link) scrolls smoothly to the
// detailed `#certifications-section` below the product grid. Honors
// prefers-reduced-motion.
// ============================================================================

import { useMemo } from "react";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  usePartnerCertifications,
  useProductCertifications,
  type PartnerCertificationWithDetails,
  type ProductCertificationWithDetails,
} from "@/lib/referentials";

interface Props {
  productId: string;
  partnerId: string;
}

const MAX_VISIBLE = 4;
const SHORT_NAME_THRESHOLD = 14;

type Source = "brand" | "product_unit";

type Item = {
  key: string;
  source: Source;
  name: string;
  shortLabel: string;
  certNumber?: string | null;
  pvNumber?: string | null;
  labName?: string | null;
  validUntil: string | null;
};

function isExpired(validUntil: string | null): boolean {
  if (!validUntil) return false;
  return new Date(validUntil) < new Date();
}

function shortenName(name: string): string {
  if (name.length <= SHORT_NAME_THRESHOLD) return name;
  return `${name.slice(0, SHORT_NAME_THRESHOLD - 1)}…`;
}

function scrollToCertifications() {
  if (typeof document === "undefined") return;
  const el = document.getElementById("certifications-section");
  if (!el) return;
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

export default function ProductCertificationBadges({
  productId,
  partnerId,
}: Props) {
  const { data: brandCerts = [] } = usePartnerCertifications(partnerId);
  const { data: productCerts = [] } = useProductCertifications(productId);

  const items: Item[] = useMemo(() => {
    const fromProduct = (productCerts as ProductCertificationWithDetails[])
      .filter((c) => !isExpired(c.valid_until))
      .map<Item>((c) => ({
        key: `p-${c.id}`,
        source: "product_unit",
        name: c.certification.name,
        shortLabel: shortenName(c.certification.name),
        pvNumber: c.pv_number,
        labName: c.lab_name,
        validUntil: c.valid_until,
      }));
    const fromBrand = (brandCerts as PartnerCertificationWithDetails[])
      .filter((c) => !isExpired(c.valid_until))
      .map<Item>((c) => ({
        key: `b-${c.id}`,
        source: "brand",
        name: c.certification.name,
        shortLabel: shortenName(c.certification.name),
        certNumber: c.certificate_number,
        validUntil: c.valid_until,
      }));
    // Product-unit first: more specific to the SKU than brand-level.
    return [...fromProduct, ...fromBrand];
  }, [brandCerts, productCerts]);

  if (items.length === 0) return null;

  const visible = items.slice(0, MAX_VISIBLE);
  const overflow = items.length - visible.length;

  return (
    <div
      className="mt-2 flex items-center gap-2 flex-wrap"
      data-testid="product-cert-badges"
    >
      {visible.map((item) => (
        <Tooltip key={item.key} delayDuration={150}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={scrollToCertifications}
              aria-label={`${item.name} — voir détails`}
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            >
              <Badge
                variant={item.source === "brand" ? "secondary" : "outline"}
                className={
                  item.source === "brand"
                    ? "gap-1 border-transparent bg-blue-50 text-blue-800 hover:bg-blue-100"
                    : "gap-1 border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                }
              >
                <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                {item.shortLabel}
              </Badge>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <div className="font-semibold">{item.name}</div>
            {item.pvNumber && (
              <div className="opacity-80">PV n° {item.pvNumber}</div>
            )}
            {item.labName && (
              <div className="opacity-80">Labo : {item.labName}</div>
            )}
            {item.certNumber && (
              <div className="opacity-80">N° {item.certNumber}</div>
            )}
            {item.validUntil && (
              <div className="mt-0.5 opacity-70">
                Valide jusqu'au{" "}
                {new Date(item.validUntil).toLocaleDateString("fr-FR")}
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      ))}
      {overflow > 0 && (
        <button
          type="button"
          onClick={scrollToCertifications}
          className="text-[11px] font-body text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          +{overflow} {overflow > 1 ? "autres" : "autre"}
        </button>
      )}
      <button
        type="button"
        onClick={scrollToCertifications}
        className="ml-auto text-[11px] font-body text-muted-foreground hover:text-foreground"
      >
        → Voir les {items.length} certification{items.length > 1 ? "s" : ""}
      </button>
    </div>
  );
}
