import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Landmark, Copy, Check, Printer } from "lucide-react";

interface Props {
  reference: string;
  amount: number;
  beneficiary: string;
  iban: string;
  bic: string;
  bankName: string;
  dueDate: string;
  status: "pending" | "paid";
}

function CopyButton({ text }: { text: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-[10px] font-display font-semibold text-muted-foreground hover:text-foreground transition-colors"
      title={copied ? t("payment.copied") : "Copy"}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-green-600" />
          <span className="text-green-600">{t("payment.copied")}</span>
        </>
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}

export default function PaymentInstructions({
  reference,
  amount,
  beneficiary,
  iban,
  bic,
  bankName,
  dueDate,
  status,
}: Props) {
  const { t } = useTranslation();

  const dueDateObj = new Date(dueDate);
  const now = new Date();
  const diffMs = dueDateObj.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isOverdue = daysRemaining < 0;

  return (
    <div className="border-2 border-blue-200/60 rounded-xl p-5 space-y-5 bg-gradient-to-br from-blue-50/30 to-emerald-50/20">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
          <Landmark className="h-4.5 w-4.5 text-blue-700" />
        </div>
        <h3 className="font-display font-bold text-base text-foreground">
          {t("payment.instructions")}
        </h3>
      </div>

      {/* Paid banner */}
      {status === "paid" && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 border border-green-200">
          <Check className="h-5 w-5 text-green-600" />
          <span className="text-sm font-display font-bold text-green-700">
            {t("payment.paymentReceived")}
          </span>
        </div>
      )}

      {/* Bank details grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="border border-border rounded-lg p-3">
          <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
            {t("payment.beneficiary")}
          </p>
          <p className="text-sm font-display font-bold text-foreground mt-0.5">
            {beneficiary}
          </p>
        </div>
        <div className="border border-border rounded-lg p-3">
          <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
            {t("payment.bank")}
          </p>
          <p className="text-sm font-display font-bold text-foreground mt-0.5">
            {bankName}
          </p>
        </div>
        <div className="border border-border rounded-lg p-3">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
              {t("payment.iban")}
            </p>
            <CopyButton text={iban.replace(/\s/g, "")} />
          </div>
          <p className="text-sm font-mono font-semibold text-foreground mt-0.5 tracking-wide">
            {iban}
          </p>
        </div>
        <div className="border border-border rounded-lg p-3">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
              {t("payment.bic")}
            </p>
            <CopyButton text={bic} />
          </div>
          <p className="text-sm font-mono font-semibold text-foreground mt-0.5 tracking-wide">
            {bic}
          </p>
        </div>
      </div>

      {/* Amount */}
      <div className="border-2 border-emerald-200 rounded-lg p-4 bg-emerald-50/50 text-center">
        <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-emerald-700">
          {t("payment.amount")}
        </p>
        <p className="text-2xl font-display font-bold text-emerald-800 mt-1">
          {amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
        </p>
      </div>

      {/* Reference */}
      <div className="border-2 border-amber-300 rounded-lg p-4 bg-amber-50">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-amber-800">
            {t("payment.reference")}
          </p>
          <CopyButton text={reference} />
        </div>
        <p className="text-lg font-mono font-bold text-amber-900 mt-1">
          {reference}
        </p>
        <p className="text-[10px] font-display font-semibold text-amber-700 mt-1.5">
          {t("payment.referenceWarning")}
        </p>
      </div>

      {/* Due date */}
      {status !== "paid" && (
        <div className="flex items-center justify-between border border-border rounded-lg p-3">
          <div>
            <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
              {t("payment.dueDate")}
            </p>
            <p className="text-sm font-display font-bold text-foreground mt-0.5">
              {dueDateObj.toLocaleDateString()}
            </p>
          </div>
          <span
            className={`text-[10px] font-display font-semibold px-2.5 py-1 rounded-full ${
              isOverdue
                ? "bg-red-50 text-red-700"
                : daysRemaining <= 3
                  ? "bg-amber-50 text-amber-700"
                  : "bg-blue-50 text-blue-700"
            }`}
          >
            {isOverdue
              ? t("payment.overdue")
              : `${daysRemaining} ${t("payment.daysRemaining")}`}
          </span>
        </div>
      )}

      {/* Print button */}
      <button
        onClick={() => window.print()}
        className="flex items-center gap-1.5 text-[10px] font-display font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <Printer className="h-3.5 w-3.5" />
        {t("payment.print", "Print")}
      </button>
    </div>
  );
}
