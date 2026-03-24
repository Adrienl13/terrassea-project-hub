import { useState } from "react";
import { Landmark } from "lucide-react";
import FinancingRequestModal from "./FinancingRequestModal";

interface Props {
  totalBudget: number;
  threshold?: number;
  prefillName?: string;
  prefillEmail?: string;
  prefillPhone?: string;
  prefillSiren?: string;
  prefillCompany?: string;
  projectRequestId?: string;
}

export default function FinancingCTA({
  totalBudget, threshold = 2000,
  prefillName, prefillEmail, prefillPhone, prefillSiren, prefillCompany,
  projectRequestId,
}: Props) {
  const [showModal, setShowModal] = useState(false);

  if (totalBudget < threshold) return null;

  return (
    <>
      <div className="border border-emerald-200 bg-gradient-to-r from-emerald-50/80 to-emerald-50/30 rounded-sm p-4 mt-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
            <Landmark className="h-4.5 w-4.5 text-emerald-700" />
          </div>
          <div className="flex-1">
            <p className="font-display font-bold text-xs text-foreground">
              Financez votre terrasse
            </p>
            <p className="text-[10px] font-body text-muted-foreground mt-0.5">
              Étalez votre investissement sur 12 à 60 mois avec notre partenaire financier. Sans impact sur votre commande.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-2.5 inline-flex items-center gap-1.5 px-4 py-2 text-[10px] font-display font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-full hover:bg-emerald-200 transition-colors"
            >
              <Landmark className="h-3 w-3" />
              Demander un financement
            </button>
          </div>
        </div>
      </div>

      <FinancingRequestModal
        open={showModal}
        onClose={() => setShowModal(false)}
        prefillAmount={totalBudget}
        prefillName={prefillName}
        prefillEmail={prefillEmail}
        prefillPhone={prefillPhone}
        prefillSiren={prefillSiren}
        prefillCompany={prefillCompany}
        projectRequestId={projectRequestId}
      />
    </>
  );
}
