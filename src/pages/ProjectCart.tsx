import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Minus, Plus, Trash2, ArrowLeft, Layers, Ruler, Truck, X, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { useProjectCart } from "@/contexts/ProjectCartContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import ProductDetailDrawer from "@/components/project/ProductDetailDrawer";
import AvailabilityBadge from "@/components/project/AvailabilityBadge";
import SourcingSummary from "@/components/project/SourcingSummary";
import SourcingAlerts from "@/components/project/SourcingAlerts";
import type { DBProduct } from "@/lib/products";
import type { CartItem } from "@/contexts/ProjectCartContext";

// ── Progress steps ────────────────────────────────────────────────────────────

const STEP_KEYS = ["selection", "suppliers", "details", "submit"] as const;


function getCurrentStep(items: CartItem[]): number {
  if (items.length === 0) return 1;
  const allHaveSupplier = items.every((i) => i.selectedSupplier);
  if (!allHaveSupplier) return 2;
  return 3;
}

function ProgressSteps({ current }: {current: number;}) {
  return (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map((step, i) => {
        const isDone = current > step.id;
        const isActive = current === step.id;
        const isLast = i === STEPS.length - 1;
        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-display font-bold transition-colors ${
                isDone || isActive ?
                "bg-foreground text-primary-foreground" :
                "bg-muted text-muted-foreground"}`
                }>
                
                {isDone ? "✓" : step.id}
              </div>
              <span
                className={`hidden md:block text-[10px] font-display uppercase tracking-wider mt-1 ${
                isDone || isActive ? "text-foreground font-semibold" : "text-muted-foreground"}`
                }>
                
                {step.label}
              </span>
            </div>
            {!isLast &&
            <div
              className={`flex-1 h-px mx-2 ${isDone ? "bg-foreground" : "bg-border"}`} />

            }
          </div>);

      })}
    </div>);

}

// ── SIREN lookup ──────────────────────────────────────────────────────────────

interface SirenResult {
  companyName: string;
  address: string;
}

async function lookupSiren(siren: string): Promise<SirenResult | null> {
  try {
    const res = await fetch(
      `https://api.insee.fr/entreprises/sirene/V3.11/siren/${siren}`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const unite = data?.uniteLegale;
    const name =
    unite?.denominationUniteLegale ||
    `${unite?.prenom1UniteLegale || ""} ${unite?.nomUniteLegale || ""}`.trim();
    const adresse = unite?.adresseEtablissementSiege;
    const address = adresse ?
    `${adresse.numeroVoieEtablissement || ""} ${adresse.typeVoieEtablissement || ""} ${adresse.libelleVoieEtablissement || ""}, ${adresse.codePostalEtablissement || ""} ${adresse.libelleCommuneEtablissement || ""}`.trim() :
    "";
    return { companyName: name, address };
  } catch {
    return null;
  }
}

// ── Main component ────────────────────────────────────────────────────────────

const ProjectCart = () => {
  const { t } = useTranslation();
  const { items, removeItem, updateQuantity, clearSupplier, notes, setNotes, quotationStatus } =
  useProjectCart();

  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", siren: "",
    company: "", city: "", country: "", budget: "", timeline: "", notes: ""
  });
  const [sirenResult, setSirenResult] = useState<SirenResult | null>(null);
  const [sirenChecking, setSirenChecking] = useState(false);
  const [sirenError, setSirenError] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<DBProduct | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ── localStorage persistence ────────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem("terrassea_cart_form");
      if (saved) setFormData(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("terrassea_cart_form", JSON.stringify(formData));
    } catch {}
  }, [formData]);

  // ── SIREN auto-lookup ────────────────────────────────────────────────────────
  useEffect(() => {
    if (formData.siren.length !== 9) {
      setSirenResult(null);
      setSirenError(false);
      return;
    }
    setSirenChecking(true);
    setSirenError(false);
    lookupSiren(formData.siren).then((result) => {
      setSirenChecking(false);
      if (result) {
        setSirenResult(result);
        if (result.companyName && !formData.company) {
          setFormData((p) => ({ ...p, company: result.companyName }));
        }
      } else {
        setSirenError(true);
        setSirenResult(null);
      }
    });
  }, [formData.siren]);

  // ── Grouping ─────────────────────────────────────────────────────────────────
  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    const key = item.conceptName || "My selection";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  // ── Indicative budget ────────────────────────────────────────────────────────
  const totalBudget = items.reduce((sum, item) => {
    const price = item.selectedSupplier?.price ?? (item.product as any).price_min ?? null;
    return price !== null ? sum + price * item.quantity : sum;
  }, 0);
  const hasBudget = items.some(
    (i) => i.selectedSupplier?.price != null || (i.product as any).price_min != null
  );

  const currentStep = getCurrentStep(items);

  const handle = (field: string) =>
  (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
  setFormData((p) => ({ ...p, [field]: e.target.value }));

  const handleSave = () => {
    toast.success("Project saved locally — you can continue later.");
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.phone || !formData.siren) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (formData.siren.length !== 9) {
      toast.error("SIREN must be 9 digits.");
      return;
    }
    if (items.length === 0) {
      toast.error("Add at least one product to your project.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: pr, error: prError } = await supabase.
      from("project_requests").
      insert({
        project_name: `${formData.company || formData.name} — Project`,
        contact_name: formData.name,
        contact_company: formData.company || sirenResult?.companyName || "",
        contact_email: formData.email,
        contact_phone: formData.phone,
        city: formData.city || sirenResult?.address || "",
        country: formData.country || "France",
        budget_range: formData.budget,
        timeline: formData.timeline,
        free_text_request: notes || formData.notes,
        detected_attributes: {
          siren: formData.siren,
          delivery_address: sirenResult?.address || ""
        }
      }).
      select("id").
      single();
      if (prError) throw prError;

      const cartItems = items.map((item) => ({
        project_request_id: pr.id,
        product_id: item.product.id,
        quantity: item.quantity,
        concept_name: item.conceptName || null,
        notes: null
      }));
      const { error: ciError } = await supabase.
      from("project_cart_items").
      insert(cartItems);
      if (ciError) throw ciError;

      localStorage.removeItem("terrassea_cart_form");
      setSubmitted(true);
      toast.success("Project submitted! Our team will contact you within 48h.");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDims = (p: DBProduct) => {
    if (p.dimensions_length_cm && p.dimensions_width_cm)
    return `${p.dimensions_length_cm}×${p.dimensions_width_cm}${p.dimensions_height_cm ? `×${p.dimensions_height_cm}` : ""} cm`;
    return null;
  };

  // ── Submitted state ───────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-32 pb-24 px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-700 flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
              ✓
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground">Project submitted</h1>
            <p className="text-muted-foreground font-body mt-4 max-w-md mx-auto">
              Thank you! Our sourcing team will review your project and send precise quotes from each supplier within 48 hours.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 mt-8 px-6 py-3 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full">
              
              Back to homepage
            </Link>
          </motion.div>
        </div>
      </div>);

  }

  const inputClass =
  "w-full text-sm font-body bg-card border border-border rounded-full px-4 py-2.5 focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/50";
  const labelClass =
  "text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-28 pb-24 px-6">
        <div className="container mx-auto">
          {/* Back */}
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>

          {/* Title */}
          <div className="mb-6">
            <h1 className="font-display text-3xl font-bold text-foreground">My Project</h1>
            <p className="text-sm text-muted-foreground font-body mt-1">
              Review your selection, confirm suppliers and submit for sourcing
            </p>
          </div>

          {/* Progress */}
          {items.length > 0 && <ProgressSteps current={currentStep} />}

          {/* Sourcing summary + alerts */}
          {items.length > 0 &&
          <>
              <SourcingSummary items={items} quotationStatus={quotationStatus} />
              <SourcingAlerts items={items} />
            </>
          }

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            {/* ── LEFT — Product list ───────────────────────────────────── */}
            <div className="lg:col-span-3">
              {items.length === 0 ?
              <div className="bg-card rounded-sm p-12 text-center">
                  <p className="text-muted-foreground font-body">No products in your project yet.</p>
                  <Link to="/" className="text-sm font-display font-semibold text-foreground mt-4 inline-block hover:underline">
                    Start designing →
                  </Link>
                </div> :

              <>
                  {Object.entries(grouped).map(([conceptName, conceptItems]) =>
                <div key={conceptName} className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[10px] font-body uppercase tracking-[0.2em] text-muted-foreground">
                          {conceptName}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {conceptItems.map(({ product, quantity, layoutRequirementLabel, selectedSupplier }) => {
                      return (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="grid items-center gap-3 px-3 py-2 bg-card rounded-sm border border-border group"
                          style={{ gridTemplateColumns: "36px 1fr 100px 80px 20px" }}>
                          
                              {/* Image */}
                              <button onClick={() => {setSelectedProduct(product);setDrawerOpen(true);}} className="focus:outline-none">
                                <img
                              src={product.image_url || "/placeholder.svg"}
                              alt={product.name}
                              className="w-9 h-9 object-cover rounded-sm hover:opacity-80 transition-opacity" />
                            
                              </button>

                              {/* Info */}
                              <div className="min-w-0">
                                <button onClick={() => {setSelectedProduct(product);setDrawerOpen(true);}} className="text-left focus:outline-none w-full">
                                  <p className="font-display font-semibold text-xs text-foreground hover:underline truncate">{product.name}</p>
                                  <p className="text-[10px] text-muted-foreground font-body truncate">
                                    {product.category}{product.main_color ? ` · ${product.main_color}` : ""}
                                  </p>
                                </button>
                                {selectedSupplier ?
                            <div className="inline-flex items-center gap-1.5 mt-0.5 px-1.5 py-0.5 rounded-full bg-card border border-border text-[10px] font-body text-muted-foreground">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                                    {selectedSupplier.partnerName} · €{selectedSupplier.price?.toFixed(2)}/u
                                    {selectedSupplier.deliveryDelayDays != null && ` · ${selectedSupplier.deliveryDelayDays}d`}
                                    <button onClick={() => clearSupplier(product.id)} className="hover:text-destructive ml-0.5">
                                      <X className="h-2.5 w-2.5" />
                                    </button>
                                  </div> :

                            <div className="inline-flex items-center gap-1.5 mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-body" style={{ background: "rgba(186,117,23,.08)", color: "#854F0B", border: "0.5px solid rgba(186,117,23,.2)" }}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                                    No supplier
                                  </div>
                            }
                              </div>

                              {/* Quantity */}
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => updateQuantity(product.id, quantity - 1)} className="w-5 h-5 rounded-full border border-border flex items-center justify-center hover:border-foreground transition-colors">
                                  <Minus className="h-2.5 w-2.5" />
                                </button>
                                <input
                              type="number"
                              min={1}
                              value={quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val > 0) updateQuantity(product.id, val);
                              }}
                              className="w-10 text-center text-xs font-display font-medium text-foreground bg-transparent border border-border rounded-sm py-0.5 focus:outline-none focus:border-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                            
                                <button onClick={() => updateQuantity(product.id, quantity + 1)} className="w-5 h-5 rounded-full border border-border flex items-center justify-center hover:border-foreground transition-colors">
                                  <Plus className="h-2.5 w-2.5" />
                                </button>
                              </div>

                              {/* Price */}
                              <div className="text-right">
                                {selectedSupplier?.price ?? (product as any).price_min ?
                            <>
                                    <p className="text-[10px] text-muted-foreground font-body">×€{(selectedSupplier?.price ?? (product as any).price_min)?.toFixed(2)}</p>
                                    <p className="font-display font-semibold text-foreground text-base">~€{((selectedSupplier?.price ?? (product as any).price_min) * quantity).toLocaleString("fr-FR")}</p>
                                  </> :

                            <p className="text-[10px] text-muted-foreground font-body">On request</p>
                            }
                              </div>

                              {/* Delete */}
                              <button onClick={() => removeItem(product.id)} className="text-muted-foreground hover:text-foreground transition-colors opacity-40 group-hover:opacity-100 justify-self-center">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </motion.div>);

                    })}
                      </div>
                    </div>
                )}

                  {/* Stats row */}
                  <div className="flex items-center justify-around p-4 bg-card rounded-sm mt-6">
                    <div className="text-center">
                      <span className="font-display font-bold text-lg text-foreground block">{items.length}</span>
                      <span className="text-[10px] font-body uppercase tracking-wider text-muted-foreground">Products</span>
                    </div>
                    <div className="text-center">
                      <span className="font-display font-bold text-lg text-foreground block">
                        {items.reduce((s, i) => s + i.quantity, 0)}
                      </span>
                      <span className="text-[10px] font-body uppercase tracking-wider text-muted-foreground">Units</span>
                    </div>
                    <div className="text-center">
                      <span className="font-display font-bold text-lg text-foreground block">
                        {hasBudget ? `~€${totalBudget.toLocaleString("fr-FR")}` : "—"}
                      </span>
                      <span className="text-[10px] font-body uppercase tracking-wider text-muted-foreground">Indicative</span>
                    </div>
                  </div>

                  {hasBudget &&
                <p className="text-[10px] text-muted-foreground font-body mt-2 text-center">
                      Indicative total · excl. delivery & VAT · final quotes may vary by volume and supplier conditions
                    </p>
                }

                  {/* Notes */}
                  <div className="mt-6">
                    <label className="font-display font-semibold text-sm text-foreground block mb-2">
                      Project notes
                    </label>
                    <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Describe your requirements, deadline, specific finishes..."
                    rows={3}
                    className="w-full bg-card rounded-sm border border-border p-4 text-sm font-body text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-foreground resize-none" />
                  
                  </div>

                  {/* Auto-save notice */}
                  <div className="flex items-center gap-2 text-[10px] font-body text-muted-foreground mt-2">
                    <Save className="h-3 w-3" />
                    <span>Your project details are saved locally</span>
                  </div>
                </>
              }
            </div>

            {/* ── RIGHT — Form ──────────────────────────────────────────── */}
            <div className="lg:col-span-2">
              <div className="lg:sticky lg:top-28 space-y-4">
                <h2 className="font-display font-bold text-base text-foreground">Contact & delivery</h2>

                {/* Required fields */}
                <div className="space-y-3">
                  <div>
                    <label className={labelClass}>Full name *</label>
                    <input type="text" value={formData.name} onChange={handle("name")} placeholder="Jean Dupont" className={inputClass} />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelClass}>Email *</label>
                      <input type="email" value={formData.email} onChange={handle("email")} placeholder="jean@restaurant.fr" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Phone *</label>
                      <input type="tel" value={formData.phone} onChange={handle("phone")} placeholder="+33 6 12 34 56 78" className={inputClass} />
                    </div>
                  </div>

                  {/* SIREN */}
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <label className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">SIREN *</label>
                      {sirenChecking &&
                      <span className="text-[10px] text-muted-foreground animate-pulse">Checking...</span>
                      }
                      {sirenResult && !sirenChecking &&
                      <span className="text-[10px] text-green-600 font-semibold">
                          ✓ {sirenResult.companyName}
                        </span>
                      }
                      {sirenError && !sirenChecking &&
                      <span className="text-[10px] text-destructive">Not found</span>
                      }
                    </div>
                    <input
                      type="text"
                      value={formData.siren}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 9);
                        setFormData((p) => ({ ...p, siren: val }));
                      }}
                      placeholder="123456789"
                      className={`${inputClass} ${sirenResult ? "border-green-500" : sirenError ? "border-destructive" : ""}`} />
                    

                    {/* Auto-filled address */}
                    <AnimatePresence>
                      {sirenResult?.address &&
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                        
                          <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-green-700">
                            Delivery address — auto-filled
                          </p>
                          <p className="text-sm font-body text-foreground mt-1">
                            {sirenResult.address}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-body mt-1">
                            Delivery costs will be calculated per supplier based on this address
                          </p>
                        </motion.div>
                      }
                    </AnimatePresence>
                  </div>
                </div>

                {/* Optional fields toggle */}
                <button
                  onClick={() => setShowOptional(!showOptional)}
                  className="w-full text-xs font-body text-muted-foreground hover:text-foreground transition-colors text-left flex items-center justify-between py-1">
                  
                  <span>{showOptional ? "Hide" : "+"} optional details (budget, timeline...)</span>
                  <span>{showOptional ? "−" : "+"}</span>
                </button>

                <AnimatePresence>
                  {showOptional &&
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3">
                    
                      <div>
                        <label className={labelClass}>Budget range</label>
                        <input type="text" value={formData.budget} onChange={handle("budget")} placeholder="€5,000 – €15,000" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Timeline</label>
                        <input type="text" value={formData.timeline} onChange={handle("timeline")} placeholder="June 2026" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Additional notes</label>
                        <textarea
                        value={formData.notes}
                        onChange={handle("notes")}
                        placeholder="Any specific requirements..."
                        rows={3}
                        className="w-full text-sm font-body bg-card border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/50 resize-none" />
                      
                      </div>
                    </motion.div>
                  }
                </AnimatePresence>

                {/* CTAs */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || items.length === 0}
                    className="w-full py-3.5 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity disabled:opacity-40">
                    
                    {submitting ? "Submitting..." : "Submit for sourcing →"}
                  </button>
                  <button
                    onClick={handleSave}
                    className="w-full py-3 font-display font-semibold text-sm border border-border text-muted-foreground rounded-full hover:border-foreground hover:text-foreground transition-all flex items-center justify-center gap-2">
                    
                    <Save className="h-3.5 w-3.5" /> Save for later
                  </button>
                </div>

                <p className="text-[10px] text-muted-foreground font-body text-center leading-relaxed">
                  Precise quotes from each supplier within 48h · No commitment required
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      <ProductDetailDrawer
        product={selectedProduct}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        quantity={selectedProduct ? items.find((i) => i.product.id === selectedProduct.id)?.quantity : undefined}
        showSuppliers
        onAddToQuotation={() => {
          toast.success(`${selectedProduct?.name} confirmed`);
          setDrawerOpen(false);
        }} />
      
    </div>);

};

export default ProjectCart;