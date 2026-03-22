import { useTranslation } from "react-i18next";
import { Lock, CheckCircle2, Loader2 } from "lucide-react";
import { useStripePayment } from "@/hooks/useStripePayment";

interface PayNowButtonProps {
  orderId: string;
  amount: number;
  customerEmail: string;
  description: string;
  label: string; // "Pay deposit" or "Pay balance"
  isPaid: boolean;
  paidAt?: string | null;
}

export default function PayNowButton({
  orderId,
  amount,
  customerEmail,
  description,
  label,
  isPaid,
  paidAt,
}: PayNowButtonProps) {
  const { t } = useTranslation();
  const { initiatePayment, isLoading, error } = useStripePayment();

  if (isPaid) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-50 border border-green-200">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <span className="text-sm font-display font-semibold text-green-700">
          {t("stripe.paid")}
        </span>
        {paidAt && (
          <span className="text-[10px] font-body text-green-600 ml-1">
            {t("stripe.paidOn")} {new Date(paidAt).toLocaleDateString()}
          </span>
        )}
      </div>
    );
  }

  const formattedAmount = amount.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

  const handleClick = async () => {
    try {
      await initiatePayment({ orderId, amount, customerEmail, description });
    } catch {
      // error is already set in the hook
    }
  };

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="inline-flex items-center gap-2.5 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-display font-semibold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Lock className="h-4 w-4" />
        )}
        {isLoading ? t("stripe.processing") : `${label} — ${formattedAmount}`}
      </button>
      <div className="flex items-center gap-1.5 pl-1">
        <svg viewBox="0 0 28 28" className="h-3.5 w-3.5" aria-hidden="true">
          <path
            d="M14 0C6.268 0 0 6.268 0 14s6.268 14 14 14 14-6.268 14-14S21.732 0 14 0zm6.5 10.5h-2.1c-.25-1-.65-1.9-1.2-2.7l1.5-1.5c.9 1.2 1.5 2.6 1.8 4.2zm-6.5-5c.85.6 1.55 1.4 2.05 2.3.15.25.3.55.4.85h-4.9c.1-.3.25-.6.4-.85.5-.9 1.2-1.7 2.05-2.3zM5.5 15.75c-.15-.55-.25-1.15-.25-1.75s.1-1.2.25-1.75h2.4c-.05.55-.1 1.15-.1 1.75s.05 1.2.1 1.75h-2.4zm1 3.5h2.1c.25 1 .65 1.9 1.2 2.7l-1.5 1.5c-.9-1.2-1.5-2.6-1.8-4.2zm2.1-10.5H6.5c.3-1.6.9-3 1.8-4.2l1.5 1.5c-.55.8-.95 1.7-1.2 2.7zm5.4 13.75c-.85-.6-1.55-1.4-2.05-2.3-.15-.25-.3-.55-.4-.85h4.9c-.1.3-.25.6-.4.85-.5.9-1.2 1.7-2.05 2.3zm2.65-5.75H11.35c-.05-.55-.1-1.15-.1-1.75s.05-1.2.1-1.75h5.3c.05.55.1 1.15.1 1.75s-.05 1.2-.1 1.75zm.15 5.2c.55-.8.95-1.7 1.2-2.7h2.1c-.3 1.6-.9 3-1.8 4.2l-1.5-1.5zm1.6-6.2c.05-.55.1-1.15.1-1.75s-.05-1.2-.1-1.75h2.4c.15.55.25 1.15.25 1.75s-.1 1.2-.25 1.75h-2.4z"
            fill="#6772E5"
          />
        </svg>
        <span className="text-[10px] font-body text-muted-foreground">
          {t("stripe.securedByStripe")}
        </span>
      </div>
      {error && (
        <p className="text-[11px] font-body text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}
