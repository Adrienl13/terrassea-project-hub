import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Compass, Layers, Send, Sparkles } from "lucide-react";
import HeroSearch from "@/components/HeroSearch";
import SpaceCard from "@/components/SpaceCard";
import ProductCard from "@/components/ProductCard";
import ProjectResults from "@/components/ProjectResults";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useProducts } from "@/hooks/useProducts";
import { generateProjectConcepts } from "@/engine/projectEngine";
import { ProjectParameters, ProjectConcept } from "@/engine/types";

import spaceRestaurant from "@/assets/space-restaurant.jpg";
import spaceHotel from "@/assets/space-hotel.jpg";
import spaceRooftop from "@/assets/space-rooftop.jpg";
import spaceBeachclub from "@/assets/space-beachclub.jpg";
import spaceCamping from "@/assets/space-camping.jpg";

const spaces = [
  { name: "Restaurants", image: spaceRestaurant, description: "Terraces, patios & outdoor dining" },
  { name: "Hotels", image: spaceHotel, description: "Lobbies, pool decks & garden lounges" },
  { name: "Rooftops", image: spaceRooftop, description: "Sky bars & urban terraces" },
  { name: "Beach Clubs", image: spaceBeachclub, description: "Beachfront lounges & daybeds" },
  { name: "Campings", image: spaceCamping, description: "Glamping & outdoor communal areas" },
];

const steps = [
  { icon: Sparkles, title: "Describe", text: "Tell us about your space, style and needs" },
  { icon: Compass, title: "Discover", text: "Explore curated products and inspirations" },
  { icon: Layers, title: "Select", text: "Build your project selection" },
  { icon: Send, title: "Submit", text: "Send your project for sourcing" },
];

const Index = () => {
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const [searchResults, setSearchResults] = useState<{
    parameters: ProjectParameters;
    concepts: ProjectConcept[];
    query: string;
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleSearch = (query: string) => {
    if (products.length === 0) return;
    setIsSearching(true);

    setTimeout(() => {
      const { parameters, concepts } = generateProjectConcepts(query, products);
      setSearchResults({ parameters, concepts, query });
      setIsSearching(false);

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground tracking-tight leading-tight">
            Design your outdoor
            <br />
            hospitality space
          </h1>
          <p className="text-muted-foreground font-body text-base md:text-lg mt-6 max-w-lg mx-auto">
            The European project platform for restaurants, hotels and hospitality professionals
          </p>
        </motion.div>
        <HeroSearch onSearch={handleSearch} isLoading={isSearching || productsLoading} />
      </section>

      {/* Project Results */}
      {searchResults && (
        <div ref={resultsRef}>
          <ProjectResults
            parameters={searchResults.parameters}
            concepts={searchResults.concepts}
            query={searchResults.query}
            products={products}
          />
        </div>
      )}

      {/* How it Works */}
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="font-display text-2xl md:text-3xl font-bold text-foreground text-center mb-16"
          >
            How it works
          </motion.h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center mx-auto mb-4">
                  <step.icon className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="font-display font-semibold text-sm text-foreground">{step.title}</h3>
                <p className="text-xs text-muted-foreground font-body mt-2">{step.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Explore Spaces */}
      <section className="py-24 px-6 bg-surface">
        <div className="container mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                Explore spaces
              </h2>
              <p className="text-sm text-muted-foreground font-body mt-2">
                Find inspiration for your type of hospitality project
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {spaces.map((space, i) => (
              <SpaceCard key={space.name} {...space} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Popular Products */}
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                Popular products
              </h2>
              <p className="text-sm text-muted-foreground font-body mt-2">
                Curated outdoor furniture for hospitality professionals
              </p>
            </div>
            <button className="hidden md:flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground transition-colors">
              View all <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          {productsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square bg-card rounded-sm mb-4" />
                  <div className="h-4 bg-card rounded w-3/4 mb-2" />
                  <div className="h-3 bg-card rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {products.slice(0, 8).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-24 px-6 bg-accent">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-accent-foreground">
              Ready to design your space?
            </h2>
            <p className="text-muted-foreground font-body mt-4 max-w-md mx-auto">
              Start your project and let our team connect you with the best sourcing solutions in Europe.
            </p>
            <button className="mt-8 px-8 py-3.5 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity">
              Launch my project
            </button>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
