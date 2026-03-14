import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Compass, Layers, Send, Sparkles } from "lucide-react";
import SmartSearch from "@/components/SmartSearch";
import QuickAccessCards from "@/components/QuickAccessCards";
import SpaceCard from "@/components/SpaceCard";
import ProductCard from "@/components/ProductCard";
import ProductSearchResults from "@/components/ProductSearchResults";
import ProjectResults from "@/components/ProjectResults";
import ProjectDiscovery from "@/components/ProjectDiscovery";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useProducts } from "@/hooks/useProducts";
import { generateProjectConcepts } from "@/engine/projectEngine";
import { detectIntent, searchProducts } from "@/engine/intentDetector";
import { ProjectParameters, ProjectConcept } from "@/engine/types";
import type { DBProduct } from "@/lib/products";

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
  { icon: Compass, title: "Discover", text: "Answer a few questions to refine your brief" },
  { icon: Layers, title: "Select", text: "Explore 3 curated concepts and pick products" },
  { icon: Send, title: "Submit", text: "Send your project for sourcing" },
];

type FlowPhase = "idle" | "product_search" | "discovery" | "results";

const Index = () => {
  const navigate = useNavigate();
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const [phase, setPhase] = useState<FlowPhase>("idle");
  const [searchQuery, setSearchQuery] = useState("");
  const [productSearchData, setProductSearchData] = useState<{
    recommended: DBProduct[];
    similar: DBProduct[];
    compatible: DBProduct[];
  } | null>(null);
  const [searchResults, setSearchResults] = useState<{
    parameters: ProjectParameters;
    concepts: ProjectConcept[];
    query: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const discoveryRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);

  const handleSearch = (query: string) => {
    if (products.length === 0) return;
    setSearchQuery(query);

    const intent = detectIntent(query);

    if (intent === "product_search") {
      const results = searchProducts(query, products);
      setProductSearchData(results);
      setPhase("product_search");
      setSearchResults(null);
      setTimeout(() => {
        searchResultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } else {
      setProductSearchData(null);
      setPhase("discovery");
      setSearchResults(null);
      setTimeout(() => {
        discoveryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  const handleCreateProjectFromProduct = (product: DBProduct) => {
    // Build a query from the product to seed the project engine
    const seedQuery = `${product.category} ${product.style_tags.join(" ")} ${product.main_color || ""}`.trim();
    setSearchQuery(seedQuery);
    setProductSearchData(null);
    setPhase("discovery");
    setTimeout(() => {
      discoveryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleQuickCreateProject = () => {
    setSearchQuery("restaurant terrace project");
    setProductSearchData(null);
    setPhase("discovery");
    setTimeout(() => {
      discoveryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleQuickExploreProducts = () => {
    if (products.length === 0) return;
    const results = searchProducts("chair table", products);
    setProductSearchData(results);
    setSearchQuery("chair table");
    setPhase("product_search");
    setTimeout(() => {
      searchResultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleDiscoveryComplete = (params: ProjectParameters) => {
    if (products.length === 0) return;
    setIsGenerating(true);

    setTimeout(() => {
      const { parameters, concepts } = generateProjectConcepts(searchQuery, products, params);
      setSearchResults({ parameters, concepts, query: searchQuery });
      setPhase("results");
      setIsGenerating(false);

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }, 800);
  };

  const handleReset = () => {
    setPhase("idle");
    setSearchQuery("");
    setSearchResults(null);
    setProductSearchData(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
            What are you looking for
            <br />
            for your establishment?
          </h1>
          <p className="text-muted-foreground font-body text-base md:text-lg mt-6 max-w-lg mx-auto">
            Search a product or describe your project — we adapt to your needs
          </p>
        </motion.div>
        <SmartSearch onSearch={handleSearch} isLoading={isGenerating || productsLoading} />
        {phase === "idle" && (
          <QuickAccessCards
            onCreateProject={handleQuickCreateProject}
            onExploreProducts={handleQuickExploreProducts}
            onDiscover={() => {
              const spacesSection = document.getElementById("explore-spaces");
              spacesSection?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        )}
      </section>

      {/* Product Search Results */}
      {phase === "product_search" && productSearchData && (
        <div ref={searchResultsRef}>
          <ProductSearchResults
            recommended={productSearchData.recommended}
            similar={productSearchData.similar}
            compatible={productSearchData.compatible}
            query={searchQuery}
            allProducts={products}
            onCreateProjectFromProduct={handleCreateProjectFromProduct}
          />
        </div>
      )}

      {/* Discovery Phase */}
      {phase === "discovery" && (
        <section ref={discoveryRef} className="py-16 px-6">
          <div className="container mx-auto flex justify-center">
            <ProjectDiscovery
              query={searchQuery}
              onComplete={handleDiscoveryComplete}
              onReset={handleReset}
            />
          </div>
        </section>
      )}

      {/* Generating indicator */}
      {isGenerating && (
        <section className="py-16 px-6">
          <div className="container mx-auto text-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-body text-muted-foreground">
                Generating your project concepts...
              </p>
            </motion.div>
          </div>
        </section>
      )}

      {/* Project Results */}
      {searchResults && phase === "results" && (
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
      <section id="explore-spaces" className="py-24 px-6 bg-surface">
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
            <button
              onClick={handleQuickCreateProject}
              className="mt-8 px-8 py-3.5 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
            >
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
