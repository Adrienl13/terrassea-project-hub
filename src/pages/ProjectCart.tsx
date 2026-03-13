import { useState } from "react";
import { Minus, Plus, Trash2, ArrowLeft, Layers } from "lucide-react";
import { Link } from "react-router-dom";
import { useProjectCart } from "@/contexts/ProjectCartContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { motion } from "framer-motion";

const ProjectCart = () => {
  const { items, removeItem, updateQuantity, notes, setNotes } = useProjectCart();
  const [formData, setFormData] = useState({
    name: "", company: "", email: "", phone: "", city: "", country: "",
    projectSize: "", budget: "", timeline: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Group items by concept
  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    const key = item.conceptName || "Other selections";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Add at least one product to your project");
      return;
    }

    setSubmitting(true);
    try {
      const { data: projectRequest, error: prError } = await supabase
        .from("project_requests")
        .insert({
          project_name: `${formData.company} - Project`,
          contact_name: formData.name,
          contact_company: formData.company,
          contact_email: formData.email,
          contact_phone: formData.phone,
          city: formData.city,
          country: formData.country,
          budget_range: formData.budget,
          timeline: formData.timeline,
          free_text_request: notes,
          detected_attributes: { projectSize: formData.projectSize },
        })
        .select("id")
        .single();

      if (prError) throw prError;

      const cartItems = items.map((item) => ({
        project_request_id: projectRequest.id,
        product_id: item.product.id,
        quantity: item.quantity,
        concept_name: item.conceptName || null,
        notes: null,
      }));

      const { error: ciError } = await supabase
        .from("project_cart_items")
        .insert(cartItems);

      if (ciError) throw ciError;

      setSubmitted(true);
      toast.success("Project submitted! Our team will contact you shortly.");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-32 pb-24 px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-display text-3xl font-bold text-foreground">Project submitted</h1>
            <p className="text-muted-foreground font-body mt-4 max-w-md mx-auto">
              Thank you! Our sourcing team will review your project and get back to you within 48 hours.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 mt-8 px-6 py-3 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full"
            >
              Back to homepage
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-28 pb-24 px-6">
        <div className="container mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="h-4 w-4" /> Back to explore
          </Link>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">My Project</h1>
          <p className="text-sm text-muted-foreground font-body mb-12">
            Review your design selection and submit your project for sourcing
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            <div className="lg:col-span-3">
              {items.length === 0 ? (
                <div className="bg-card rounded-sm p-12 text-center">
                  <p className="text-muted-foreground font-body">No products in your project yet.</p>
                  <Link to="/" className="text-sm font-display font-semibold text-foreground mt-4 inline-block hover:underline">
                    Start designing →
                  </Link>
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(grouped).map(([conceptName, conceptItems]) => (
                    <div key={conceptName}>
                      <div className="flex items-center gap-2 mb-3">
                        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[10px] font-body uppercase tracking-[0.2em] text-muted-foreground">
                          {conceptName}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {conceptItems.map(({ product, quantity }) => (
                          <motion.div
                            key={product.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex gap-4 p-4 bg-card rounded-sm"
                          >
                            <img src={product.image_url || "/placeholder.svg"} alt={product.name} className="w-20 h-20 object-cover rounded-sm flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-display font-semibold text-sm text-foreground">{product.name}</h3>
                              <p className="text-xs text-muted-foreground font-body mt-0.5">
                                {product.category} · {product.indicative_price}
                              </p>
                              <div className="flex items-center gap-3 mt-3">
                                <button onClick={() => updateQuantity(product.id, quantity - 1)} className="h-7 w-7 rounded-full border border-border flex items-center justify-center hover:border-foreground transition-colors">
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="text-sm font-display font-medium w-6 text-center">{quantity}</span>
                                <button onClick={() => updateQuantity(product.id, quantity + 1)} className="h-7 w-7 rounded-full border border-border flex items-center justify-center hover:border-foreground transition-colors">
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            <button onClick={() => removeItem(product.id)} className="text-muted-foreground hover:text-foreground transition-colors self-start">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Project Summary */}
              {items.length > 0 && (
                <div className="mt-6 p-5 bg-card rounded-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <span className="font-display font-bold text-lg text-foreground block">{items.length}</span>
                      <span className="text-[10px] font-body uppercase tracking-wider text-muted-foreground">
                        distinct product{items.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="w-px h-8 bg-border" />
                    <div className="text-center">
                      <span className="font-display font-bold text-lg text-foreground block">
                        {items.reduce((s, i) => s + i.quantity, 0)}
                      </span>
                      <span className="text-[10px] font-body uppercase tracking-wider text-muted-foreground">
                        total units
                      </span>
                    </div>
                    <div className="w-px h-8 bg-border" />
                    <div className="text-center">
                      <span className="font-display font-bold text-lg text-foreground block">
                        {Object.keys(grouped).length}
                      </span>
                      <span className="text-[10px] font-body uppercase tracking-wider text-muted-foreground">
                        concept{Object.keys(grouped).length > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-8">
                <label className="font-display font-semibold text-sm text-foreground block mb-2">
                  Project notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe your project requirements, preferences, timeline..."
                  rows={4}
                  className="w-full bg-card rounded-sm border-0 p-4 text-sm font-body text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-foreground resize-none"
                />
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="lg:sticky lg:top-28">
                <h2 className="font-display font-bold text-lg text-foreground mb-6">Submit your project</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {[
                    { key: "name", label: "Full name", type: "text" },
                    { key: "company", label: "Company", type: "text" },
                    { key: "email", label: "Email", type: "email" },
                    { key: "phone", label: "Phone", type: "tel" },
                    { key: "city", label: "City", type: "text" },
                    { key: "country", label: "Country", type: "text" },
                    { key: "projectSize", label: "Project size (seats or m²)", type: "text" },
                    { key: "budget", label: "Budget range", type: "text" },
                    { key: "timeline", label: "Timeline", type: "text" },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="text-xs font-body text-muted-foreground block mb-1">{field.label}</label>
                      <input
                        type={field.type}
                        required
                        value={formData[field.key as keyof typeof formData]}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        className="w-full bg-card rounded-sm px-4 py-2.5 text-sm font-body text-foreground outline-none focus:ring-1 focus:ring-foreground"
                      />
                    </div>
                  ))}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full mt-4 px-6 py-3.5 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit project for sourcing"}
                  </button>
                  <p className="text-xs text-muted-foreground font-body text-center mt-3">
                    Our team will review and contact you within 48h
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ProjectCart;
