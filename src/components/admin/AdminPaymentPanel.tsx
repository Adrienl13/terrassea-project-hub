import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CreditCard, CheckCircle2, Clock, AlertTriangle, Loader2,
} from "lucide-react";
import { usePaymentFlow } from "@/hooks/usePaymentFlow";

interface Props {
  orderId: string;
  order: any;
}

function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  isLoading,
  title,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  title: string;
}) {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-background border border-border rounded-xl p-5 shadow-xl max-w-sm w-full mx-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-display font-bold text-foreground">{title}</p>
            <p className="text-xs font-body text-muted-foreground mt-1">
              {t("payment.confirmDialog")}
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-xs font-display font-semibold px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("payment.cancel", "Cancel")}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs font-display font-semibold px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t("payment.confirm", "Confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPaymentPanel({ orderId, order }: Props) {
  const { t } = useTranslation();
  const {
    confirmDeposit,
    confirmBalance,
    isConfirmingDeposit,
    isConfirmingBalance,
  } = usePaymentFlow();

  const [showDepositConfirm, setShowDepositConfirm] = useState(false);
  const [showBalanceConfirm, setShowBalanceConfirm] = useState(false);
  const [paymentNote, setPaymentNote] = useState("");

  const depositPaid = !!order.deposit_paid_at;
  const balancePaid = !!order.balance_paid_at;

  // Timeline steps
  const timelineSteps = [
    {
      label: t("payment.depositPending"),
      done: true,
      date: order.created_at,
    },
    {
      label: t("payment.depositConfirmed"),
      done: depositPaid,
      date: order.deposit_paid_at,
    },
    {
      label: t("payment.balanceConfirmed"),
      done: balancePaid,
      date: order.balance_paid_at,
    },
  ];

  return (
    <div className="border border-border rounded-xl p-4 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-emerald-600" />
        <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
          {t("payment.instructions")}
        </p>
      </div>

      {/* Payment status overview */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`border rounded-lg p-3 ${depositPaid ? "border-green-200 bg-green-50/50" : "border-amber-200 bg-amber-50/50"}`}>
          <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
            {t("payment.depositStatus", "Deposit")}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            {depositPaid ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <Clock className="h-4 w-4 text-amber-600" />
            )}
            <span className={`text-xs font-display font-bold ${depositPaid ? "text-green-700" : "text-amber-700"}`}>
              {depositPaid ? t("payment.depositConfirmed") : t("payment.depositPending")}
            </span>
          </div>
          {order.deposit_amount != null && (
            <p className="text-sm font-display font-bold text-foreground mt-1">
              {Number(order.deposit_amount).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
            </p>
          )}
        </div>

        <div className={`border rounded-lg p-3 ${balancePaid ? "border-green-200 bg-green-50/50" : "border-border"}`}>
          <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
            {t("payment.balanceStatus", "Balance")}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            {balancePaid ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <Clock className="h-4 w-4 text-muted-foreground" />
            )}
            <span className={`text-xs font-display font-bold ${balancePaid ? "text-green-700" : "text-muted-foreground"}`}>
              {balancePaid ? t("payment.balanceConfirmed") : t("payment.balancePending")}
            </span>
          </div>
          {order.balance_amount != null && (
            <p className="text-sm font-display font-bold text-foreground mt-1">
              {Number(order.balance_amount).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
            </p>
          )}
        </div>
      </div>

      {/* Payment reference */}
      {order.payment_reference && (
        <div className="border border-border rounded-lg p-3">
          <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
            {t("payment.reference")}
          </p>
          <p className="text-sm font-mono font-bold text-foreground mt-0.5">
            {order.payment_reference}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        {!depositPaid && (
          <button
            onClick={() => setShowDepositConfirm(true)}
            className="flex items-center gap-1.5 text-[10px] font-display font-semibold px-4 py-2.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t("payment.confirmDeposit")}
          </button>
        )}
        {depositPaid && !balancePaid && (
          <button
            onClick={() => setShowBalanceConfirm(true)}
            className="flex items-center gap-1.5 text-[10px] font-display font-semibold px-4 py-2.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t("payment.confirmBalance")}
          </button>
        )}
      </div>

      {/* Payment timeline */}
      <div>
        <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {t("payment.timeline", "Payment timeline")}
        </p>
        <div className="relative pl-6">
          <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />
          <div className="space-y-3">
            {timelineSteps.map((step, idx) => (
              <div key={idx} className="relative flex items-start gap-3">
                <div
                  className={`absolute -left-6 w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 ${
                    step.done
                      ? "bg-green-50 border-green-300 text-green-600"
                      : "bg-background border-border text-muted-foreground"
                  }`}
                >
                  {step.done ? (
                    <CheckCircle2 className="h-2.5 w-2.5" />
                  ) : (
                    <Clock className="h-2.5 w-2.5" />
                  )}
                </div>
                <div>
                  <p className={`text-xs font-body ${step.done ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                    {step.label}
                  </p>
                  {step.done && step.date && (
                    <p className="text-[10px] font-body text-muted-foreground">
                      {new Date(step.date).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Note input */}
      <div>
        <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          {t("payment.noteLabel", "Payment notes")}
        </p>
        <textarea
          value={paymentNote}
          onChange={(e) => setPaymentNote(e.target.value)}
          rows={2}
          placeholder={t("payment.notePlaceholder", "Add a note about this payment...")}
          className="w-full px-3 py-2 border border-border rounded-lg text-xs font-body focus:outline-none focus:border-foreground/40 resize-none"
        />
      </div>

      {/* Confirmation dialogs */}
      <ConfirmDialog
        open={showDepositConfirm}
        onClose={() => setShowDepositConfirm(false)}
        onConfirm={() => {
          confirmDeposit(orderId);
          setShowDepositConfirm(false);
        }}
        isLoading={isConfirmingDeposit}
        title={t("payment.confirmDeposit")}
      />
      <ConfirmDialog
        open={showBalanceConfirm}
        onClose={() => setShowBalanceConfirm(false)}
        onConfirm={() => {
          confirmBalance(orderId);
          setShowBalanceConfirm(false);
        }}
        isLoading={isConfirmingBalance}
        title={t("payment.confirmBalance")}
      />
    </div>
  );
}
