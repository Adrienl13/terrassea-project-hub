import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PartnerCard from "@/components/partners/PartnerCard";
import BecomePartnerDialog from "@/components/partners/BecomePartnerDialog";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Building2, Factory, Store, Palette, Handshake } from "lucide-react";

const CATEGORIES = [
  { key: "all", label: "All Partners", icon: Handshake },
  { key: "brand", label: "Brands", icon: Building2 },
  { key: "manufacturer", label: "Manufacturers", icon: Factory },
  { key: "reseller", label: "Resellers", icon: Store },
  { key: "designer", label: "Designers", icon: Palette },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

export default function Partners() {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("all");
  const [showBecomePartner, setShowBecomePartner] = useState(false);

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ["partners", activeCategory],
    queryFn: async () => {
      let query = supabase
        .from("partners")
        .select("*")
        .eq("is_public", true)
        .order("priority_order", { ascending: false });

      if (activeCategory !== "all") {
        query = query.eq("partner_type", activeCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-4xl md:text-5xl font-bold tracking-tight text-foreground"
          >
            Partner Network
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-lg font-body text-muted-foreground max-w-2xl mx-auto"
          >
            A curated ecosystem of brands, manufacturers, resellers and designers 
            powering the European hospitality industry.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8"
          >
            <Button
              onClick={() => setShowBecomePartner(true)}
              className="rounded-full px-8 py-3 font-display font-semibold"
            >
              Become a Partner
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Category Tabs */}
      <section className="sticky top-[73px] z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6">
          <div className="flex items-center gap-1 overflow-x-auto py-3 no-scrollbar">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-display font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-foreground text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Category Description */}
      {activeCategory !== "all" && (
        <section className="py-10 px-6">
          <div className="container mx-auto max-w-4xl">
            <CategoryDescription category={activeCategory} />
          </div>
        </section>
      )}

      {/* Partners Grid */}
      <section className="py-8 pb-24 px-6">
        <div className="container mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : partners.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground font-body">
                No partners in this category yet. Be the first to join!
              </p>
              <Button
                variant="outline"
                className="mt-4 rounded-full font-display"
                onClick={() => setShowBecomePartner(true)}
              >
                Apply Now
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {partners.map((partner, i) => (
                <motion.div
                  key={partner.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <PartnerCard partner={partner} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <BecomePartnerDialog open={showBecomePartner} onOpenChange={setShowBecomePartner} />
      <Footer />
    </div>
  );
}

function CategoryDescription({ category }: { category: string }) {
  const descriptions: Record<string, { title: string; text: string }> = {
    brand: {
      title: "Brands & Marques",
      text: "Discover the premium brands selected by Terrassea for their quality, design innovation, and commitment to the hospitality industry.",
    },
    manufacturer: {
      title: "Manufacturing Partners",
      text: "Professional manufacturers with proven expertise in hospitality-grade furniture production. Contact via Terrassea for sourcing inquiries.",
    },
    reseller: {
      title: "Distribution Network",
      text: "Our European network of resellers, showrooms, and distributors bringing Terrassea-curated collections to your region.",
    },
    designer: {
      title: "Design & Architecture",
      text: "Architects and design studios specializing in hospitality spaces — from terraces to rooftops, hotels to beach clubs.",
    },
  };

  const desc = descriptions[category];
  if (!desc) return null;

  return (
    <div className="bg-muted/50 rounded-xl p-8">
      <h2 className="font-display text-2xl font-bold text-foreground">{desc.title}</h2>
      <p className="mt-2 font-body text-muted-foreground">{desc.text}</p>
    </div>
  );
}
