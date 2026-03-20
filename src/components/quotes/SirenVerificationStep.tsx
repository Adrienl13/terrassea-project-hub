import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ShieldCheck, AlertTriangle, Loader2, CheckCircle2, XCircle, Building2,
} from "lucide-react";
import { verifySirenMatchesCompany, type SirenResult } from "@/lib/sirenVerification";

interface SirenVerificationStepProps {
  siren: string;
  companyName: string;
  onVerified: (result: { verified: boolean; officialName: string | null }) => void;
}

/**
 * SirenVerificationStep — verifies SIREN against French government API
 * before allowing signature. Shows company match status.
 */
export default function SirenVerificationStep({
  siren,
  companyName,
  onVerified,
}: SirenVerificationStepProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"idle" | "checking" | "valid" | "mismatch" | "invalid" | "error">("idle");
  const [officialName, setOfficialName] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [manualSiren, setManualSiren] = useState(siren || "");

  const runVerification = async (sirenToCheck: string) => {
    if (!sirenToCheck || sirenToCheck.replace(/\s/g, "").length < 9) {
      setStatus("idle");
      return;
    }

    setStatus("checking");
    try {
      const result = await verifySirenMatchesCompany(sirenToCheck, companyName);
      setOfficialName(result.officialName);
      setMessage(result.message);

      if (result.matches) {
        setStatus("valid");
        onVerified({ verified: true, officialName: result.officialName });
      } else if (result.officialName) {
        setStatus("mismatch");
        onVerified({ verified: false, officialName: result.officialName });
      } else {
        setStatus("invalid");
        onVerified({ verified: false, officialName: null });
      }
    } catch {
      setStatus("error");
      setMessage(t("siren.errorGeneric"));
      onVerified({ verified: false, officialName: null });
    }
  };

  // Auto-verify on mount if SIREN is provided
  useEffect(() => {
    if (siren && siren.replace(/\s/g, "").length >= 9) {
      runVerification(siren);
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Building2 className="h-4 w-4 text-[#D4603A]" />
        <p className="text-xs font-display font-bold text-foreground">{t("siren.title")}</p>
      </div>

      <p className="text-[11px] font-body text-muted-foreground">{t("siren.subtitle")}</p>

      {/* SIREN input */}
      <div>
        <label className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider">
          {t("siren.label")}
        </label>
        <div className="flex gap-2 mt-1">
          <input
            type="text"
            value={manualSiren}
            onChange={(e) => {
              const val = e.target.value.replace(/[^\d\s]/g, "");
              setManualSiren(val);
              setStatus("idle");
            }}
            placeholder="123 456 789"
            maxLength={14}
            className="flex-1 px-3 py-2 border border-border rounded-lg text-sm font-body focus:outline-none focus:border-foreground/40 transition-colors"
          />
          <button
            onClick={() => runVerification(manualSiren)}
            disabled={status === "checking" || manualSiren.replace(/\s/g, "").length < 9}
            className="px-4 py-2 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {status === "checking" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t("siren.verify")
            )}
          </button>
        </div>
      </div>

      {/* Result */}
      {status === "checking" && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-50/50 border border-blue-100">
          <Loader2 className="h-4 w-4 text-blue-500 animate-spin shrink-0" />
          <p className="text-[11px] font-body text-blue-700">{t("siren.checking")}</p>
        </div>
      )}

      {status === "valid" && (
        <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <p className="text-[11px] font-display font-bold text-emerald-800">{t("siren.verified")}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 ml-6">
            <div>
              <p className="text-[9px] font-display font-semibold text-emerald-600 uppercase">{t("siren.officialName")}</p>
              <p className="text-[11px] font-body text-emerald-800">{officialName}</p>
            </div>
            <div>
              <p className="text-[9px] font-display font-semibold text-emerald-600 uppercase">SIREN</p>
              <p className="text-[11px] font-body text-emerald-800">{manualSiren}</p>
            </div>
          </div>
        </div>
      )}

      {status === "mismatch" && (
        <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-[11px] font-display font-bold text-amber-800">{t("siren.mismatch")}</p>
          </div>
          <p className="text-[10px] font-body text-amber-700 ml-6">{message}</p>
          <p className="text-[10px] font-body text-amber-600 ml-6">{t("siren.mismatchHint")}</p>
        </div>
      )}

      {status === "invalid" && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 space-y-1">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-600 shrink-0" />
            <p className="text-[11px] font-display font-bold text-red-800">{t("siren.invalid")}</p>
          </div>
          <p className="text-[10px] font-body text-red-700 ml-6">{message}</p>
        </div>
      )}

      {status === "error" && (
        <div className="px-4 py-3 rounded-xl bg-gray-50 border border-border space-y-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-[11px] font-display font-bold text-foreground">{t("siren.errorTitle")}</p>
          </div>
          <p className="text-[10px] font-body text-muted-foreground ml-6">{message}</p>
        </div>
      )}
    </div>
  );
}
