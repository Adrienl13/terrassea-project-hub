import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DBProduct } from "@/lib/products";
import type { ProductOffer } from "@/lib/productOffers";

interface QuoteRequestModalProps {
  open: boolean;
  onClose: () => void;
  product: DBProduct;
  offers?: ProductOffer[];
  defaultQuantity?: number;
}

// ── SIREN lookup ──────────────────────────────────────────────────────────────

interface SirenResult { companyName: string; address: string; }

async function lookupSiren(siren: string): Promise<SirenResult | null> {
  try {
    const res = await fetch(
      `https://api.insee.fr/entreprises/sirene/V3.11/siren/${siren}`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const unite = data?.uniteLegale;
    const name = unite?.denominationUniteLegale ||
      `${unite?.prenom1UniteLegale || ""} ${unite?.nomUniteLegale || ""}`.trim();
    const adresse = unite?.adresseEtablissementSiege;
    const address = adresse
      ? `${adresse.numeroVoieEtablissement || ""} ${adresse.typeVoieEtablissement || ""} ${adresse.libelleVoieEtablissement || ""}, ${adresse.codePostalEtablissement || ""} ${adresse.libelleCommuneEtablissement || ""}`.trim()
      : "";
    return { companyName: name, address };
  } catch {
    return null;
  }
}

// ── Main modal ────────────────────────────────────────────────────────────────

const QuoteRequestModal = ({
  open, onClose, product, offers = [], defaultQuantity = 1,
}: QuoteRequestModalProps) => {
  const [step, setStep] = useState<"form" | "success">("form");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    company: "", siren: "", message: "", quantity: defaultQuantity,
  });

  const [sirenResult, setSirenResult] = useState<SirenResult | null>(null);
  const [sirenChecking, setSirenChecking] = useState(false);
  const [sirenError, setSirenError] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep("form");
      setForm((p) => ({ ...p, quantity: defaultQuantity, message: "" }));
      setSirenResult(null);
      setSirenError(false);
    }
  }, [open, defaultQuantity]);

  // SIREN lookup
  useEffect(() => {
    if (form.siren.length !== 9) {
      setSirenResult(null);
      setSirenError(false);
      return;
    }
    setSirenChecking(true);
    lookupSiren(form.siren).then((result) => {
      setSirenChecking(false);
      if (result) {
        setSirenResult(result);
        if (result.companyName && !form.company) {
          setForm((p) => ({ ...p, company: result.companyName }));
        }
      } else {
        setSirenResult(null);
        setSirenError(true);
      }
    });
  }, [form.siren]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handle = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.firstName || !form.email || !form.siren) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (form.siren.length !== 9) {
      toast.error("SIREN must be 9 digits.");
      return;
    }

    setSubmitting(true);
    try {
      const bestOffer = offers.find((o) => o.price !== null) || offers[0] || null;

      await supabase.from("quote_requests").insert({
        product_id: product.id,
        product_name: product.name,
        offer_id: bestOffer?.id || null,
        partner_id: bestOffer?.partner_id || null,
        partner_name: bestOffer?.partner?.name || null,
        quantity: form.quantity,
        first_name: form.firstName,
        last_name: form.lastName || null,
        email: form.email,
        company: form.company || sirenResult?.companyName || null,
        siren: form.siren,
        message: form.message || null,
        unit_price: bestOffer?.price || null,
        total_price: bestOffer?.price ? bestOffer.price * form.quantity : null,
        status: "pending",
      });

      setStep("success");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full text-sm font-body bg-background border border-border rounded-full px-4 py-2.5 focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/50";
  const labelClass = "text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto pointer-events-auto">
              {step === "success" ? (
                /* ── Success state ── */
                <div className="p-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="h-7 w-7 text-green-600" />
                  </div>

                  <h2 className="font-display text-xl font-bold text-foreground mb-2">
                    Quote request sent
                  </h2>

                  <p className="text-sm font-body text-muted-foreground leading-relaxed mb-6">
                    Our sourcing team will review your request for{" "}
                    <span className="font-semibold text-foreground">{product.name}</span> and get back
                    to you within 48 hours with pricing and availability details.
                  </p>

                  <button
                    onClick={onClose}
                    className="px-8 py-3 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
                  >
                    Close
                  </button>
                </div>
              ) : (
                /* ── Form state ── */
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <h2 className="font-display text-lg font-bold text-foreground">
                        Request a quote
                      </h2>
                      <p className="text-xs font-body text-muted-foreground mt-0.5">
                        {product.name}
                        {offers.length > 0 && ` · ${offers.length} supplier${offers.length > 1 ? "s" : ""}`}
                      </p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Product summary pill */}
                  <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3 mb-5">
                    {product.image_url && (
                      <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded-lg object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-display font-bold text-foreground truncate">{product.name}</p>
                      <p className="text-[10px] font-body text-muted-foreground">
                        {product.category}
                        {product.main_color ? ` · ${product.main_color}` : ""}
                      </p>
                    </div>
                    {/* Quantity inline */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setForm((p) => ({ ...p, quantity: Math.max(1, p.quantity - 1) }))}
                        className="w-6 h-6 rounded-full border border-border flex items-center justify-center hover:border-foreground transition-colors text-sm"
                      >−</button>
                      <input
                        type="number"
                        value={form.quantity}
                        onChange={(e) => setForm((p) => ({ ...p, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                        className="w-10 text-center text-sm font-display font-bold bg-transparent border border-border rounded-sm py-0.5 focus:outline-none focus:border-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onClick={() => setForm((p) => ({ ...p, quantity: p.quantity + 1 }))}
                        className="w-6 h-6 rounded-full border border-border flex items-center justify-center hover:border-foreground transition-colors text-sm"
                      >+</button>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className={labelClass}>First name *</span>
                        <input value={form.firstName} onChange={handle("firstName")} className={inputClass} />
                      </div>
                      <div>
                        <span className={labelClass}>Last name</span>
                        <input value={form.lastName} onChange={handle("lastName")} className={inputClass} />
                      </div>
                    </div>

                    <div>
                      <span className={labelClass}>Email *</span>
                      <input value={form.email} onChange={handle("email")} type="email" placeholder="hello@restaurant.fr" className={inputClass} />
                    </div>

                    <div>
                      <span className={labelClass}>Phone</span>
                      <input value={form.phone} onChange={handle("phone")} className={inputClass} />
                    </div>

                    {/* SIREN */}
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={labelClass + " mb-0"}>SIREN *</span>
                        {sirenChecking && <span className="text-[9px] text-muted-foreground">Checking...</span>}
                        {sirenResult && !sirenChecking && (
                          <span className="text-[9px] text-green-600 flex items-center gap-0.5">
                            ✓ {sirenResult.companyName}
                          </span>
                        )}
                        {sirenError && !sirenChecking && (
                          <span className="text-[9px] text-destructive">Not found</span>
                        )}
                      </div>
                      <input
                        value={form.siren}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 9);
                          setForm((p) => ({ ...p, siren: val }));
                        }}
                        placeholder="123456789"
                        className={`${inputClass} ${
                          sirenResult ? "border-green-500" :
                          sirenError ? "border-destructive" : ""
                        }`}
                      />
                      {/* Auto-filled address */}
                      <AnimatePresence>
                        {sirenResult?.address && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mt-2 mb-0.5">
                              Delivery address
                            </p>
                            <p className="text-xs font-body text-foreground bg-card border border-border rounded-lg px-3 py-2">
                              {sirenResult.address}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div>
                      <span className={labelClass}>Message (optional)</span>
                      <textarea
                        value={form.message}
                        onChange={handle("message")}
                        rows={2}
                        placeholder="Any specific requirements, timeline, customization..."
                        className="w-full text-sm font-body bg-background border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/50 resize-none"
                      />
                    </div>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full mt-5 py-3 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    {submitting ? "Sending..." : "Send quote request →"}
                  </button>

                  {/* Privacy note */}
                  <div className="flex items-center gap-2 mt-3">
                    <Shield className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <p className="text-[10px] font-body text-muted-foreground leading-relaxed">
                      Your request is handled by our sourcing team. Supplier identity revealed after confirmation. Response within 48h.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default QuoteRequestModal;
