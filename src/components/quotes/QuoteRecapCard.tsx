import { useTranslation } from "react-i18next";
import {
  Package, Truck, CreditCard, Clock, Shield, FileText,
  CheckCircle2, Lock, AlertTriangle, Star,
} from "lucide-react";

interface QuoteRecapProps {
  productName: string;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
  tvaRate: number | null;
  deliveryDelayDays: number | null;
  deliveryConditions: string | null;
  paymentConditions: string | null;
  validityDays: number | null;
  validityExpiresAt: string | null;
  partnerConditions: string | null;
  supplierAlias: string;
  supplierCountryCode: string | null;
  status: string;
}

function countryFlag(code: string | null): string {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(...code.toUpperCase().split("").map(c => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export default function QuoteRecapCard({ quote }: { quote: QuoteRecapProps }) {
  const { t } = useTranslation();
  const totalHT = Number(quote.totalPrice || 0);
  const tvaRate = quote.tvaRate ?? 20;
  const tvaAmount = totalHT * tvaRate / 100;
  const totalTTC = totalHT + tvaAmount;
  const flag = countryFlag(quote.supplierCountryCode);

  const isExpired = quote.validityExpiresAt && new Date(quote.validityExpiresAt) < new Date();
  const daysLeft = quote.validityExpiresAt
    ? Math.max(0, Math.ceil((new Date(quote.validityExpiresAt).getTime() - Date.now()) / 86400000))
    : null;

  const delayLabel = quote.deliveryDelayDays
    ? quote.deliveryDelayDays <= 7 ? `${quote.deliveryDelayDays} jours`
    : quote.deliveryDelayDays <= 30 ? `${Math.round(quote.deliveryDelayDays / 7)} semaines`
    : `${Math.round(quote.deliveryDelayDays / 30)} mois`
    : null;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-card border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#D4603A]" />
            <h3 className="text-sm font-display font-bold text-foreground">Récapitulatif du devis</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-display font-semibold text-muted-foreground">{quote.supplierAlias}</span>
            {flag && <span className="text-sm">{flag}</span>}
            <Shield className="h-3 w-3 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Product line */}
      <div className="px-5 py-3 border-b border-border/50">
        <div className="flex items-center justify-between text-xs font-body">
          <div className="flex items-center gap-2">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-display font-semibold text-foreground">{quote.productName}</span>
            <span className="text-muted-foreground">× {quote.quantity} pcs</span>
          </div>
          {quote.unitPrice && (
            <span className="text-muted-foreground">€{Number(quote.unitPrice).toLocaleString()} /u</span>
          )}
        </div>
      </div>

      {/* Financial breakdown */}
      <div className="px-5 py-3 space-y-1.5 border-b border-border/50">
        <div className="flex justify-between text-xs font-body">
          <span className="text-muted-foreground">Total HT</span>
          <span className="font-display font-semibold text-foreground">€{totalHT.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-xs font-body">
          <span className="text-muted-foreground">TVA ({tvaRate}%)</span>
          <span className="text-foreground">€{tvaAmount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm font-display font-bold pt-1.5 border-t border-border/30">
          <span className="text-foreground">Total TTC</span>
          <span className="text-[#D4603A]">€{totalTTC.toLocaleString()}</span>
        </div>
      </div>

      {/* Details grid */}
      <div className="px-5 py-3 grid grid-cols-2 gap-3">
        {delayLabel && (
          <div className="flex items-start gap-2">
            <Truck className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-[9px] font-display font-semibold uppercase text-muted-foreground">Livraison</p>
              <p className="text-xs font-body text-foreground">{delayLabel}</p>
              {quote.deliveryConditions && <p className="text-[10px] font-body text-muted-foreground">{quote.deliveryConditions}</p>}
            </div>
          </div>
        )}
        {quote.paymentConditions && (
          <div className="flex items-start gap-2">
            <CreditCard className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-[9px] font-display font-semibold uppercase text-muted-foreground">Paiement</p>
              <p className="text-xs font-body text-foreground">{quote.paymentConditions}</p>
            </div>
          </div>
        )}
        {daysLeft !== null && (
          <div className="flex items-start gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-[9px] font-display font-semibold uppercase text-muted-foreground">Validité</p>
              {isExpired ? (
                <p className="text-xs font-body text-red-600 font-semibold">Expiré</p>
              ) : (
                <p className="text-xs font-body text-foreground">{daysLeft} jours restants</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Partner conditions / message */}
      {quote.partnerConditions && (
        <div className="px-5 py-3 border-t border-border/50">
          <p className="text-[9px] font-display font-semibold uppercase text-muted-foreground mb-1">Conditions du fournisseur</p>
          <p className="text-xs font-body text-muted-foreground italic">"{quote.partnerConditions}"</p>
        </div>
      )}

      {/* Legal footer */}
      <div className="px-5 py-3 bg-gray-50/50 border-t border-border">
        <p className="text-[8px] font-body text-muted-foreground/70 leading-relaxed">
          Récapitulatif transmis via Terrassea, mandataire de paiement au sens de l'article L.521-3 du Code monétaire et financier.
          Le devis est émis par le fournisseur identifié. L'identité complète et le document PDF sont accessibles après signature et paiement de l'acompte.
        </p>
      </div>
    </div>
  );
}
