import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Compass, Layers, Send, Sparkles, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import SEO from "@/components/SEO";
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

// spaces and stats/steps are now translated inline via t()



type FlowPhase = "idle" | "product_search" | "discovery" | "results";

const Index = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const { data: products = [], isLoading: productsLoading } = useProducts();

  const [phase, setPhase] = useState<FlowPhase>("idle");
  const [searchQuery, setSearchQuery] = useState("");
  const [productSearchData, setProductSearchData] = useState<{
    recommended: DBProduct[];similar: DBProduct[];compatible: DBProduct[];
  } | null>(null);
  const [searchResults, setSearchResults] = useState<{
    parameters: ProjectParameters;concepts: ProjectConcept[];query: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const discoveryRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
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

  const handleRegenerate = (updatedParams: ProjectParameters) => {
    if (products.length === 0) return;
    setIsGenerating(true);
    setTimeout(() => {
      const query = [
        updatedParams.establishmentType,
        ...updatedParams.style,
        updatedParams.seatingCapacity ? `${updatedParams.seatingCapacity} seats` : "",
        updatedParams.budgetLevel,
      ].filter(Boolean).join(" ");
      const { parameters, concepts } = generateProjectConcepts(query, products, updatedParams);
      setSearchResults({ parameters, concepts, query });
      setSearchQuery(query);
      setIsGenerating(false);
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
      <SEO
        title="B2B Outdoor Furniture for Hotels, Restaurants & Beach Clubs"
        description="Source premium outdoor furniture for hotels, restaurants, and beach clubs. Compare verified suppliers, request quotes, and manage your hospitality projects on Terrassea."
      />
      <Header />

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20 overflow-hidden">

        {/* Atmospheric background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-[#F5E6D3]/70 via-[#E8D5B0]/20 to-background" />
          <div className="absolute top-1/4 left-1/6 w-[500px] h-[500px] rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, #D4A574 0%, transparent 65%)" }} />
          <div className="absolute bottom-1/4 right-1/6 w-80 h-80 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #4A90A4 0%, transparent 65%)" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full opacity-10"
          style={{ background: "radial-gradient(ellipse, #C4956A 0%, transparent 70%)" }} />
          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "60px 60px"
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
              {t('home.badge')}
            </span>
            <div className="w-8 h-px bg-border" />
          </motion.div>

          {/* Headline */}
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-foreground tracking-tight leading-[1.05]">
            {t('home.headline1')}
            <br />
            <span className="relative inline-block">
              {t('home.headline2')}
              <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.8 }} className="absolute -bottom-1 left-0 right-0 h-[3px] origin-left bg-[#d4613a]" />
            </span>
            <br />
            {t('home.headline3')}
          </motion.h1>

          {/* Subline */}
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.3 }} className="text-muted-foreground font-body text-base md:text-lg mt-8 max-w-xl mx-auto leading-relaxed">
            {t('home.subtitle')}
          </motion.p>

          {/* Search */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }} className="mt-10">
            <SmartSearch onSearch={handleSearch} isLoading={isGenerating || productsLoading} />
          </motion.div>

          {/* Quick actions */}
          {phase === "idle" &&
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="flex flex-wrap justify-center gap-3 mt-6">
              <button
              onClick={() => navigate("/projects/new")}
              className="flex items-center gap-1.5 text-xs font-body text-muted-foreground border border-border rounded-full px-4 py-2 hover:border-foreground hover:text-foreground transition-all">
              
                <Sparkles className="h-3 w-3" /> {t('home.startGuided')}
              </button>
              <button
              onClick={() => navigate("/products")}
              className="flex items-center gap-1.5 text-xs font-body text-muted-foreground border border-border rounded-full px-4 py-2 hover:border-foreground hover:text-foreground transition-all">
              
                <Search className="h-3 w-3" /> {t('home.browseCatalogue')}
              </button>
              <button
              onClick={() => navigate("/inspirations")}
              className="flex items-center gap-1.5 text-xs font-body text-muted-foreground border border-border rounded-full px-4 py-2 hover:border-foreground hover:text-foreground transition-all">
              
                <Compass className="h-3 w-3" /> {t('home.getInspired')}
              </button>
            </motion.div>
          }
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="absolute bottom-6 right-8 flex items-center gap-2">
          
          <motion.div
            animate={{ y: [0, 4, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="w-px h-6 bg-gradient-to-b from-muted-foreground/30 to-transparent" />
          
          <span className="text-[9px] font-display font-semibold uppercase tracking-[0.2em] text-muted-foreground/35 -rotate-90 origin-left translate-y-3">
            {t('home.scroll')}
          </span>
        </motion.div>
      </section>

      {/* ── SEARCH RESULTS ──────────────────────────────────────────── */}
      {phase === "product_search" && productSearchData &&
      <div ref={searchResultsRef}>
          <ProductSearchResults
          recommended={productSearchData.recommended}
          similar={productSearchData.similar}
          compatible={productSearchData.compatible}
          query={searchQuery}
          allProducts={products}
          onCreateProjectFromProduct={handleCreateProjectFromProduct} />
        
        </div>
      }

      {/* ── DISCOVERY ───────────────────────────────────────────────── */}
      {phase === "discovery" &&
      <section ref={discoveryRef} className="py-16 px-6">
          <div className="container mx-auto flex justify-center">
            <ProjectDiscovery
            query={searchQuery}
            onComplete={handleDiscoveryComplete}
            onReset={handleReset} />
          
          </div>
        </section>
      }

      {isGenerating &&
      <section className="py-16 px-6">
          <div className="container mx-auto text-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-body text-muted-foreground">
                {t('home.generating', 'Generating your project concepts...')}
              </p>
            </motion.div>
          </div>
        </section>
      }

      {searchResults && phase === "results" &&
      <div ref={resultsRef}>
          <ProjectResults
          parameters={searchResults.parameters}
          concepts={searchResults.concepts}
          query={searchResults.query}
          products={products}
          onRegenerate={handleRegenerate}
          isRegenerating={isGenerating} />
        
        </div>
      }

      {/* ── STATS BAND ──────────────────────────────────────────────── */}
      <section className="py-12 px-6 border-y border-border">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "500+", labelKey: "stats.curatedProducts" },
              { value: "10+", labelKey: "stats.partnerSuppliers" },
              { value: "5", labelKey: "stats.europeanCountries" },
              { value: "5", labelKey: "stats.spaceCategories" },
            ].map((stat, i) =>
            <motion.div key={stat.labelKey} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
                <p className="font-display text-2xl md:text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs font-body text-muted-foreground mt-1 uppercase tracking-wider">{t(stat.labelKey)}</p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── EXPLORE SPACES ──────────────────────────────────────────── */}
      <section id="explore-spaces" className="py-24 px-6">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="flex items-end justify-between mb-12">
            <div>
              <span className="text-[10px] font-body uppercase tracking-[0.2em] text-muted-foreground">
                {t('spaces.byEstablishment')}
              </span>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mt-1">
                {t('spaces.exploreSpaces')}
              </h2>
            </div>
            <button
              onClick={() => navigate("/inspirations")}
              className="hidden md:flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground transition-colors group">
              
              {t('spaces.allInspirations')}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { name: t('spaces.restaurants'), image: spaceRestaurant, description: t('spaces.restaurantsDesc') },
              { name: t('spaces.hotels'), image: spaceHotel, description: t('spaces.hotelsDesc') },
              { name: t('spaces.rooftops'), image: spaceRooftop, description: t('spaces.rooftopsDesc') },
              { name: t('spaces.beachClubs'), image: spaceBeachclub, description: t('spaces.beachClubsDesc') },
              { name: t('spaces.campings'), image: spaceCamping, description: t('spaces.campingsDesc') },
            ].map((space, i) =>
            <SpaceCard key={space.name} {...space} index={i} />
            )}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-card">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="grid md:grid-cols-[1fr_2fr] gap-16 items-start">
            <div>
              <span className="text-[10px] font-body uppercase tracking-[0.2em] text-muted-foreground">
                {t('howItWorks.label')}
              </span>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mt-2">
                {t('howItWorks.title')}
              </h2>
              <button
                onClick={() => navigate("/projects/new")}
                className="mt-6 flex items-center gap-2 text-sm font-display font-semibold text-foreground border border-foreground rounded-full px-5 py-2.5 hover:bg-foreground hover:text-primary-foreground transition-all group">
                
                {t('howItWorks.getStarted')} <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {[
                { icon: Sparkles, titleKey: "howItWorks.step1Title", textKey: "howItWorks.step1Text" },
                { icon: Compass, titleKey: "howItWorks.step2Title", textKey: "howItWorks.step2Text" },
                { icon: Layers, titleKey: "howItWorks.step3Title", textKey: "howItWorks.step3Text" },
                { icon: Send, titleKey: "howItWorks.step4Title", textKey: "howItWorks.step4Text" },
              ].map((step, i) =>
              <motion.div key={step.titleKey} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center">
                      <step.icon className="h-4 w-4 text-foreground" />
                    </div>
                    <span className="text-[10px] font-body text-muted-foreground tracking-wider">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="font-display font-semibold text-sm text-foreground">{t(step.titleKey)}</h3>
                  <p className="text-xs text-muted-foreground font-body leading-relaxed">{t(step.textKey)}</p>
                </motion.div>
              )}
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
                {t('popularProducts.label')}
              </span>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mt-1">
                {t('popularProducts.title')}
              </h2>
            </div>
            <button
              onClick={() => navigate("/products")}
              className="hidden md:flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground transition-colors group">
              
              {t('popularProducts.viewAll')} <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </motion.div>

          {productsLoading ?
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {[...Array(8)].map((_, i) =>
            <div key={i} className="animate-pulse">
                  <div className="aspect-square bg-muted rounded-sm mb-4" />
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
            )}
            </div> :

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {products.slice(0, 8).map((product) =>
            <ProductCard key={product.id} product={product} />
            )}
            </div>
          }

          <div className="flex justify-center mt-12 md:hidden">
            <button
              onClick={() => navigate("/products")}
              className="flex items-center gap-2 text-sm font-body text-muted-foreground border border-border rounded-full px-5 py-2.5 hover:border-foreground hover:text-foreground transition-all">
              
              {t('popularProducts.viewAllProducts')} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── VALUE PROP ──────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-card border-t border-border">
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
            <div>
              <p className="text-[10px] font-display font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">
                {t('valueProp.label')}
              </p>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                {t('valueProp.title')}
              </h2>
            </div>
            <p className="text-sm font-body text-muted-foreground max-w-xs leading-relaxed">
              {t('valueProp.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
            {
              number: "01",
              title: t('valueProp.card1Title'),
              text: t('valueProp.card1Text'),
              accent: "#D4603A",
              tag: t('valueProp.card1Tag')
            },
            {
              number: "02",
              title: t('valueProp.card2Title'),
              text: t('valueProp.card2Text'),
              accent: "#4A90A4",
              tag: t('valueProp.card2Tag')
            },
            {
              number: "03",
              title: t('valueProp.card3Title'),
              text: t('valueProp.card3Text'),
              accent: "#6B7B5E",
              tag: t('valueProp.card3Tag')
            }].
            map((item, i) =>
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative p-6 rounded-sm border border-border bg-background overflow-hidden group hover:border-foreground/30 transition-colors">
              
                {/* Accent top border */}
                <div
                className="absolute top-0 left-0 right-0 h-0.5"
                style={{ background: item.accent }} />
              
                {/* Number + tag */}
                <div className="flex items-center justify-between mb-6">
                  <span className="text-[10px] font-display font-semibold uppercase tracking-[0.15em] text-muted-foreground/40">
                    {item.number}
                  </span>
                  <span
                  className="text-[9px] font-display font-semibold uppercase tracking-[0.12em] px-2 py-1 rounded-full"
                  style={{
                    background: `${item.accent}15`,
                    color: item.accent
                  }}>
                  
                    {item.tag}
                  </span>
                </div>
                {/* Content */}
                <h3 className="font-display font-bold text-base text-foreground mb-3">
                  {item.title}
                </h3>
                <p className="text-xs font-body text-muted-foreground leading-relaxed">
                  {item.text}
                </p>
                {/* Decorative corner accent */}
                <div
                className="absolute bottom-0 right-0 w-16 h-16 rounded-full opacity-[0.07] -mb-6 -mr-6"
                style={{ background: item.accent }} />
              
              </motion.div>
            )}
          </div>
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
              {t('cta.label')}
            </motion.span>

            <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mt-4 leading-tight">
              {t('cta.title1')}<br />{t('cta.title2')}
            </h2>

            <p className="text-muted-foreground font-body mt-6 max-w-lg mx-auto leading-relaxed">
              {t('cta.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
              <button
                onClick={() => navigate("/projects/new")}
                className="px-8 py-4 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity">
                
                {t('cta.launchProject')}
              </button>
              <button
                onClick={() => navigate("/products")}
                className="px-8 py-4 font-display font-semibold text-sm border border-border text-muted-foreground rounded-full hover:border-foreground hover:text-foreground transition-all">
                
                {t('cta.browseCatalogue')}
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>);

};

export default Index;