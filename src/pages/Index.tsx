import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Compass, Layers, Send, Sparkles, Search } from "lucide-react";
import SmartSearch from "@/components/SmartSearch";
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
  { name: "Hotels",      image: spaceHotel,      description: "Lobbies, pool decks & garden lounges" },
  { name: "Rooftops",    image: spaceRooftop,    description: "Sky bars & urban terraces" },
  { name: "Beach Clubs", image: spaceBeachclub,  description: "Beachfront lounges & daybeds" },
  { name: "Campings",    image: spaceCamping,    description: "Glamping & outdoor communal areas" },
];

const stats = [
  { value: "500+", label: "Curated products" },
  { value: "10+",  label: "Partner suppliers" },
  { value: "5",   label: "European countries" },
  { value: "5",    label: "Space categories" },
];

const steps = [
  { icon: Sparkles, title: "Describe",  text: "Your space, style and requirements" },
  { icon: Compass,  title: "Refine",    text: "A few questions to shape your brief" },
  { icon: Layers,   title: "Select",    text: "3 curated concepts with products" },
  { icon: Send,     title: "Submit",    text: "Your project goes to sourcing" },
];

type FlowPhase = "idle" | "product_search" | "discovery" | "results";

const Index = () => {
  const navigate = useNavigate();
  const heroRef  = useRef<HTMLDivElement>(null);
  const { data: products = [], isLoading: productsLoading } = useProducts();

  const [phase,             setPhase]             = useState<FlowPhase>("idle");
  const [searchQuery,       setSearchQuery]        = useState("");
  const [productSearchData, setProductSearchData]  = useState<{
    recommended: DBProduct[]; similar: DBProduct[]; compatible: DBProduct[];
  } | null>(null);
  const [searchResults, setSearchResults] = useState<{
    parameters: ProjectParameters; concepts: ProjectConcept[]; query: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const discoveryRef     = useRef<HTMLDivElement>(null);
  const resultsRef       = useRef<HTMLDivElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);

  const heroOpacity = 1;
  const heroY = 0;

  const handleSearch = (query: string) => {
    if (products.length === 0) return;
    setSearchQuery(query);
    const intent = detectIntent(query);
    if (intent === "product_search") {
      const results = searchProducts(query, products);
      setProductSearchData(results);
      setPhase("product_search");
      setSearchResults(null);
      setTimeout(() => searchResultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } else {
      setProductSearchData(null);
      setPhase("discovery");
      setSearchResults(null);
      setTimeout(() => discoveryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  };

  const handleCreateProjectFromProduct = (product: DBProduct) => {
    const seedQuery = `${product.category} ${product.style_tags.join(" ")} ${product.main_color || ""}`.trim();
    setSearchQuery(seedQuery);
    setProductSearchData(null);
    setPhase("discovery");
    setTimeout(() => discoveryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  const handleDiscoveryComplete = (params: ProjectParameters) => {
    if (products.length === 0) return;
    setIsGenerating(true);
    setTimeout(() => {
      const { parameters, concepts } = generateProjectConcepts(searchQuery, products, params);
      setSearchResults({ parameters, concepts, query: searchQuery });
      setPhase("results");
      setIsGenerating(false);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
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

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20 overflow-hidden">

        {/* Atmospheric background */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Radial glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-accent/20 rounded-full blur-[120px]" />
          {/* Secondary glow */}
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-muted/30 rounded-full blur-[100px]" />
          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }} />
          {/* Floating dots */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div animate={{ y: [-20, 20, -20] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[15%] left-[10%] w-1 h-1 rounded-full bg-foreground/10" />
            <motion.div animate={{ y: [15, -15, 15] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[30%] right-[15%] w-1.5 h-1.5 rounded-full bg-foreground/8" />
            <motion.div animate={{ y: [-10, 25, -10] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-[35%] left-[20%] w-1 h-1 rounded-full bg-foreground/6" />
            <motion.div animate={{ y: [20, -20, 20] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[50%] right-[25%] w-0.5 h-0.5 rounded-full bg-foreground/10" />
          </div>
        </div>

        <motion.div style={{ opacity: heroOpacity, y: heroY }} className="relative z-10 text-center max-w-3xl mx-auto">
          {/* Eyebrow */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex items-center justify-center gap-2 mb-8">
            <div className="w-8 h-px bg-border" />
            <span className="text-[10px] font-body uppercase tracking-[0.3em] text-muted-foreground">
              Outdoor furniture sourcing — B2B
            </span>
            <div className="w-8 h-px bg-border" />
          </motion.div>

          {/* Headline */}
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-foreground tracking-tight leading-[1.05]">
            Your clients' outdoor
            <br />
            <span className="relative inline-block">
              space starts
              <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.8 }} className="absolute -bottom-1 left-0 right-0 h-[3px] bg-foreground origin-left" />
            </span>
            <br />
            here.
          </motion.h1>

          {/* Subline */}
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.3 }} className="text-muted-foreground font-body text-base md:text-lg mt-8 max-w-xl mx-auto leading-relaxed">
            Search a product or describe your project — we connect hospitality professionals with the best suppliers across Europe.
          </motion.p>

          {/* Search */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }} className="mt-10">
            <SmartSearch onSearch={handleSearch} isLoading={isGenerating || productsLoading} />
          </motion.div>

          {/* Quick actions */}
          {phase === "idle" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="flex flex-wrap justify-center gap-3 mt-6">
              <button
                onClick={() => navigate("/projects/new")}
                className="flex items-center gap-1.5 text-xs font-body text-muted-foreground border border-border rounded-full px-4 py-2 hover:border-foreground hover:text-foreground transition-all"
              >
                <Sparkles className="h-3 w-3" /> Start a guided project
              </button>
              <button
                onClick={() => navigate("/products")}
                className="flex items-center gap-1.5 text-xs font-body text-muted-foreground border border-border rounded-full px-4 py-2 hover:border-foreground hover:text-foreground transition-all"
              >
                <Search className="h-3 w-3" /> Browse catalogue
              </button>
              <button
                onClick={() => navigate("/inspirations")}
                className="flex items-center gap-1.5 text-xs font-body text-muted-foreground border border-border rounded-full px-4 py-2 hover:border-foreground hover:text-foreground transition-all"
              >
                <Compass className="h-3 w-3" /> Get inspired
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-[10px] font-body uppercase tracking-[0.2em] text-muted-foreground">
            Scroll
          </span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 2, repeat: Infinity }} className="w-px h-8 bg-gradient-to-b from-foreground/40 to-transparent" />
        </motion.div>
      </section>

      {/* ── SEARCH RESULTS ──────────────────────────────────────────── */}
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

      {/* ── DISCOVERY ───────────────────────────────────────────────── */}
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

      {isGenerating && (
        <section className="py-16 px-6">
          <div className="container mx-auto text-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-body text-muted-foreground">
                Generating your project concepts...
              </p>
            </motion.div>
          </div>
        </section>
      )}

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

      {/* ── STATS BAND ──────────────────────────────────────────────── */}
      <section className="py-12 px-6 border-y border-border">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
                <p className="font-display text-2xl md:text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs font-body text-muted-foreground mt-1 uppercase tracking-wider">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── EXPLORE SPACES ──────────────────────────────────────────── */}
      <section id="explore-spaces" className="py-24 px-6">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="flex items-end justify-between mb-12">
            <div>
              <span className="text-[10px] font-body uppercase tracking-[0.2em] text-muted-foreground">
                By establishment
              </span>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mt-1">
                Explore spaces
              </h2>
            </div>
            <button
              onClick={() => navigate("/inspirations")}
              className="hidden md:flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground transition-colors group"
            >
              All inspirations
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {spaces.map((space, i) => (
              <SpaceCard key={space.name} {...space} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-card">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="grid md:grid-cols-[1fr_2fr] gap-16 items-start">
            <div>
              <span className="text-[10px] font-body uppercase tracking-[0.2em] text-muted-foreground">
                How it works
              </span>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mt-2">
                From idea to project in minutes
              </h2>
              <button
                onClick={() => navigate("/projects/new")}
                className="mt-6 flex items-center gap-2 text-sm font-display font-semibold text-foreground border border-foreground rounded-full px-5 py-2.5 hover:bg-foreground hover:text-primary-foreground transition-all group"
              >
                Get started <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {steps.map((step, i) => (
                <motion.div key={step.title} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center">
                      <step.icon className="h-4 w-4 text-foreground" />
                    </div>
                    <span className="text-[10px] font-body text-muted-foreground tracking-wider">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="font-display font-semibold text-sm text-foreground">{step.title}</h3>
                  <p className="text-xs text-muted-foreground font-body leading-relaxed">{step.text}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── POPULAR PRODUCTS ────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="flex items-end justify-between mb-12">
            <div>
              <span className="text-[10px] font-body uppercase tracking-[0.2em] text-muted-foreground">
                Catalogue
              </span>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mt-1">
                Popular products
              </h2>
            </div>
            <button
              onClick={() => navigate("/products")}
              className="hidden md:flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground transition-colors group"
            >
              View all <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </motion.div>

          {productsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square bg-muted rounded-sm mb-4" />
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
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

          <div className="flex justify-center mt-12 md:hidden">
            <button
              onClick={() => navigate("/products")}
              className="flex items-center gap-2 text-sm font-body text-muted-foreground border border-border rounded-full px-5 py-2.5 hover:border-foreground hover:text-foreground transition-all"
            >
              View all products <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── VALUE PROP ──────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-card">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="grid md:grid-cols-3 gap-12">
            {[
              {
                icon: "○",
                title: "Simplified sourcing",
                text: "Compare offers from multiple suppliers on a single product. Price, stock, delivery — all at a glance.",
              },
              {
                icon: "◇",
                title: "Tailored projects",
                text: "Our engine generates curated selections adapted to your establishment, style and budget.",
              },
              {
                icon: "△",
                title: "Verified partners",
                text: "Every supplier is selected for CHR quality, delivery reliability and professional service.",
              },
            ].map((item, i) => (
              <motion.div key={item.title} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="space-y-4">
                <span className="text-2xl text-foreground/30">{item.icon}</span>
                <h3 className="font-display font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">{item.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA FINAL ───────────────────────────────────────────────── */}
      <section className="relative py-32 px-6 overflow-hidden">
        {/* Atmospheric bg */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/3 w-[600px] h-[400px] bg-accent/15 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/3 w-[500px] h-[300px] bg-muted/20 rounded-full blur-[100px]" />
        </div>

        <div className="container mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-2xl mx-auto">
            <motion.span initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-[10px] font-body uppercase tracking-[0.3em] text-muted-foreground">
              Ready to start?
            </motion.span>

            <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mt-4 leading-tight">
              Design your outdoor space<br />in just a few clicks.
            </h2>

            <p className="text-muted-foreground font-body mt-6 max-w-lg mx-auto leading-relaxed">
              Join the hospitality professionals who trust Terrassea to source their outdoor furniture across Europe.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
              <button
                onClick={() => navigate("/projects/new")}
                className="px-8 py-4 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
              >
                Launch my project →
              </button>
              <button
                onClick={() => navigate("/products")}
                className="px-8 py-4 font-display font-semibold text-sm border border-border text-muted-foreground rounded-full hover:border-foreground hover:text-foreground transition-all"
              >
                Browse catalogue
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
