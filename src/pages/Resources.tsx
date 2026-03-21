import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ArrowRight, Armchair, Layers, Sun, Ruler, Scale } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { TOPIC_ILLUSTRATIONS, SIDEBAR_ILLUSTRATIONS } from "@/components/resources/ResourceIllustrations";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FAQItem {
  qKey: string;
  aKey: string;
  tipKey?: string;
  tagKeys?: string[];
}

interface Topic {
  id: string;
  icon: React.ElementType;
  labelKey: string;
  subtitleKey: string;
  color: string;
  photo: string;          // hero card photo URL
  photoAlt: string;
  sidebarProducts: SidebarProduct[];
  guide: { titleKey: string; bodyKey: string };
  expertKey: string;
  faqs: FAQItem[];
  cta: { labelKey: string; href: string };
}

interface SidebarProduct {
  id: string;       // stable key for illustration lookup
  nameKey: string;
  categoryKey: string;
  image: string;
  tagKey: string;   // short highlight tag
  href: string;
}

// ── Sidebar product data per topic ────────────────────────────────────────────
// Images: curated Unsplash photos matching each product category

const SIDEBAR_SEATING: SidebarProduct[] = [
  {
    id: "Bistrot Stackable Chair",
    nameKey: "resources.sidebarBistrotChair",
    categoryKey: "resources.catChairs",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80",
    tagKey: "resources.tagCHRHeavyUse",
    href: "/products?category=chairs",
  },
  {
    id: "Rope Armchair",
    nameKey: "resources.sidebarRopeArmchair",
    categoryKey: "resources.catArmchairs",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80",
    tagKey: "resources.tagPremiumComfort",
    href: "/products?category=armchairs",
  },
  {
    id: "Teak Bar Stool",
    nameKey: "resources.sidebarTeakBarStool",
    categoryKey: "resources.catBarStools",
    image: "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=400&q=80",
    tagKey: "resources.tagWithFootrest",
    href: "/products?category=bar-stools",
  },
];

const SIDEBAR_MATERIALS: SidebarProduct[] = [
  {
    id: "Marine-grade Aluminium",
    nameKey: "resources.sidebarMarineAluminium",
    categoryKey: "resources.catChairs",
    image: "https://images.unsplash.com/photo-1567016432779-094069958ea5?w=400&q=80",
    tagKey: "resources.tagCoastalCertified",
    href: "/products?material=aluminium",
  },
  {
    id: "FSC Teak Collection",
    nameKey: "resources.sidebarFSCTeak",
    categoryKey: "resources.catTables",
    image: "https://images.unsplash.com/photo-1449247709967-d4461a6a6103?w=400&q=80",
    tagKey: "resources.tagGradeAFSC",
    href: "/products?material=teak",
  },
  {
    id: "Rope-woven Armchair",
    nameKey: "resources.sidebarRopeWovenArmchair",
    categoryKey: "resources.catArmchairs",
    image: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=400&q=80",
    tagKey: "resources.tagWeatherResistant",
    href: "/products?material=rope",
  },
];

const SIDEBAR_SHADE: SidebarProduct[] = [
  {
    id: "Cantilever Parasol 3m",
    nameKey: "resources.sidebarCantileverParasol",
    categoryKey: "resources.catParasols",
    image: "https://images.unsplash.com/photo-1601628828688-632f38a5a7d0?w=400&q=80",
    tagKey: "resources.tagBeaufort6",
    href: "/products?category=parasols",
  },
  {
    id: "Pool Sun Lounger",
    nameKey: "resources.sidebarPoolLounger",
    categoryKey: "resources.catSunLoungers",
    image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&q=80",
    tagKey: "resources.tagQuickDryCushion",
    href: "/products?category=sun-loungers",
  },
  {
    id: "Centre-pole Parasol 4m",
    nameKey: "resources.sidebarCentrePoleParasol",
    categoryKey: "resources.catParasols",
    image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=80",
    tagKey: "resources.tagUPF50",
    href: "/products?category=parasols",
  },
];

const SIDEBAR_LAYOUT: SidebarProduct[] = [
  {
    id: "HPL Dining Table 70×70",
    nameKey: "resources.sidebarHPLTable",
    categoryKey: "resources.catTables",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80",
    tagKey: "resources.tag2CoverStandard",
    href: "/products?category=tables",
  },
  {
    id: "Teak Table 120×70",
    nameKey: "resources.sidebarTeakTable",
    categoryKey: "resources.catTables",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80",
    tagKey: "resources.tag4CoverDining",
    href: "/products?category=tables",
  },
  {
    id: "High Table 80×80 Bar",
    nameKey: "resources.sidebarHighTable",
    categoryKey: "resources.catHighTables",
    image: "https://images.unsplash.com/photo-1574096079513-d8259312b785?w=400&q=80",
    tagKey: "resources.tagHeight110cm",
    href: "/products?category=tables",
  },
];

const SIDEBAR_REGULATIONS: SidebarProduct[] = [
  {
    id: "EN 12727 Certified Chair",
    nameKey: "resources.sidebarCertifiedChair",
    categoryKey: "resources.catChairs",
    image: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&q=80",
    tagKey: "resources.tagLevel4Certified",
    href: "/products",
  },
  {
    id: "Fire-retardant Cushion",
    nameKey: "resources.sidebarFireRetardant",
    categoryKey: "resources.catAccessories",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80",
    tagKey: "resources.tagNFP92507",
    href: "/products",
  },
  {
    id: "CHR Contract Armchair",
    nameKey: "resources.sidebarContractArmchair",
    categoryKey: "resources.catArmchairs",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80",
    tagKey: "resources.tag3YearWarranty",
    href: "/products",
  },
];

// ── Topic data ────────────────────────────────────────────────────────────────

const TOPICS: Topic[] = [
  {
    id: "seating",
    icon: Armchair,
    labelKey: "resources.seating",
    subtitleKey: "resources.seatingDesc",
    color: "#D4603A",
    photo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&q=80",
    photoAlt: "Restaurant terrace with chairs",
    sidebarProducts: SIDEBAR_SEATING,
    guide: {
      titleKey: "resources.guideSeatingTitle",
      bodyKey: "resources.seatingGuide",
    },
    expertKey: "resources.seatingExpert",
    faqs: [
      {
        qKey: "resources.seatingQ1",
        aKey: "resources.seatingA1",
        tipKey: "resources.seatingTip1",
        tagKeys: ["resources.tag_seatingType", "resources.tag_chrStandard"],
      },
      {
        qKey: "resources.seatingQ2",
        aKey: "resources.seatingA2",
        tipKey: "resources.seatingTip2",
        tagKeys: ["resources.tag_layout", "resources.tag_chrNorm"],
      },
      {
        qKey: "resources.seatingQ3",
        aKey: "resources.seatingA3",
        tagKeys: ["resources.tag_dimensions", "resources.tag_ergonomics"],
      },
      {
        qKey: "resources.seatingQ4",
        aKey: "resources.seatingA4",
        tipKey: "resources.seatingTip4",
        tagKeys: ["resources.tag_logistics", "resources.tag_seasonal"],
      },
      {
        qKey: "resources.seatingQ5",
        aKey: "resources.seatingA5",
        tagKeys: ["resources.tag_roi", "resources.tag_premium"],
      },
    ],
    cta: { labelKey: "resources.browseSeating", href: "/products?category=chairs" },
  },
  {
    id: "materials",
    icon: Layers,
    labelKey: "resources.materials",
    subtitleKey: "resources.materialsDesc",
    color: "#8B7355",
    photo: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=900&q=80",
    photoAlt: "Hotel pool terrace with premium furniture",
    sidebarProducts: SIDEBAR_MATERIALS,
    guide: {
      titleKey: "resources.guideMaterialsTitle",
      bodyKey: "resources.materialsGuide",
    },
    expertKey: "resources.materialsExpert",
    faqs: [
      {
        qKey: "resources.materialsQ1",
        aKey: "resources.materialsA1",
        tipKey: "resources.materialsTip1",
        tagKeys: ["resources.tag_coastal", "resources.tag_marineGrade", "resources.tag_durability"],
      },
      {
        qKey: "resources.materialsQ2",
        aKey: "resources.materialsA2",
        tipKey: "resources.materialsTip2",
        tagKeys: ["resources.tag_teak", "resources.tag_premium", "resources.tag_maintenance"],
      },
      {
        qKey: "resources.materialsQ3",
        aKey: "resources.materialsA3",
        tagKeys: ["resources.tag_polypropylene", "resources.tag_technicalSpecs", "resources.tag_structural"],
      },
      {
        qKey: "resources.materialsQ4",
        aKey: "resources.materialsA4",
        tipKey: "resources.materialsTip4",
        tagKeys: ["resources.tag_maintenance", "resources.tag_cleaning", "resources.tag_longevity"],
      },
      {
        qKey: "resources.materialsQ5",
        aKey: "resources.materialsA5",
        tagKeys: ["resources.tag_sustainability", "resources.tag_fsc", "resources.tag_certification"],
      },
    ],
    cta: { labelKey: "resources.filterByMaterial", href: "/products?filter=material" },
  },
  {
    id: "shade",
    icon: Sun,
    labelKey: "resources.shade",
    subtitleKey: "resources.shadeDesc",
    color: "#4A90A4",
    photo: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=900&q=80",
    photoAlt: "Beach club with parasols and sun loungers",
    sidebarProducts: SIDEBAR_SHADE,
    guide: {
      titleKey: "resources.guideShadeTitle",
      bodyKey: "resources.shadeGuide",
    },
    expertKey: "resources.shadeExpert",
    faqs: [
      {
        qKey: "resources.shadeQ1",
        aKey: "resources.shadeA1",
        tipKey: "resources.shadeTip1",
        tagKeys: ["resources.tag_sizing", "resources.tag_sunProtection"],
      },
      {
        qKey: "resources.shadeQ2",
        aKey: "resources.shadeA2",
        tagKeys: ["resources.tag_parasolType", "resources.tag_configuration"],
      },
      {
        qKey: "resources.shadeQ3",
        aKey: "resources.shadeA3",
        tagKeys: ["resources.tag_loungers", "resources.tag_poolDeck", "resources.tag_hotelStandard"],
      },
      {
        qKey: "resources.shadeQ4",
        aKey: "resources.shadeA4",
        tagKeys: ["resources.tag_planning", "resources.tag_calculation"],
      },
    ],
    cta: { labelKey: "resources.browseParasolsLoungers", href: "/products?category=parasols" },
  },
  {
    id: "layout",
    icon: Ruler,
    labelKey: "resources.layout",
    subtitleKey: "resources.layoutDesc",
    color: "#6B7B5E",
    photo: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&q=80",
    photoAlt: "Restaurant terrace layout overhead view",
    sidebarProducts: SIDEBAR_LAYOUT,
    guide: {
      titleKey: "resources.guideLayoutTitle",
      bodyKey: "resources.layoutGuide",
    },
    expertKey: "resources.layoutExpert",
    faqs: [
      {
        qKey: "resources.layoutQ1",
        aKey: "resources.layoutA1",
        tipKey: "resources.layoutTip1",
        tagKeys: ["resources.tag_norms", "resources.tag_density", "resources.tag_chrStandard"],
      },
      {
        qKey: "resources.layoutQ2",
        aKey: "resources.layoutA2",
        tagKeys: ["resources.tag_tableMix", "resources.tag_revenue", "resources.tag_planning"],
      },
      {
        qKey: "resources.layoutQ3",
        aKey: "resources.layoutA3",
        tagKeys: ["resources.tag_tableType", "resources.tag_layout"],
      },
      {
        qKey: "resources.layoutQ4",
        aKey: "resources.layoutA4",
        tagKeys: ["resources.tag_logistics", "resources.tag_installation", "resources.tag_planning"],
      },
    ],
    cta: { labelKey: "resources.launchProjectBuilder", href: "/projects/new" },
  },
  {
    id: "regulations",
    icon: Scale,
    labelKey: "resources.regulations",
    subtitleKey: "resources.regulationsDesc",
    color: "#1A2456",
    photo: "https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=900&q=80",
    photoAlt: "Hotel rooftop terrace at sunset",
    sidebarProducts: SIDEBAR_REGULATIONS,
    guide: {
      titleKey: "resources.guideRegulationsTitle",
      bodyKey: "resources.regulationsGuide",
    },
    expertKey: "resources.regulationsExpert",
    faqs: [
      {
        qKey: "resources.regulationsQ1",
        aKey: "resources.regulationsA1",
        tipKey: "resources.regulationsTip1",
        tagKeys: ["resources.tag_certification", "resources.tag_en12727", "resources.tag_france", "resources.tag_erp"],
      },
      {
        qKey: "resources.regulationsQ2",
        aKey: "resources.regulationsA2",
        tagKeys: ["resources.tag_leadTime", "resources.tag_logistics", "resources.tag_planning"],
      },
      {
        qKey: "resources.regulationsQ3",
        aKey: "resources.regulationsA3",
        tipKey: "resources.regulationsTip3",
        tagKeys: ["resources.tag_supplierEvaluation", "resources.tag_dueDiligence"],
      },
      {
        qKey: "resources.regulationsQ4",
        aKey: "resources.regulationsA4",
        tagKeys: ["resources.tag_multiSupplier", "resources.tag_projectManagement"],
      },
      {
        qKey: "resources.regulationsQ5",
        aKey: "resources.regulationsA5",
        tipKey: "resources.regulationsTip5",
        tagKeys: ["resources.tag_budget", "resources.tag_perCover", "resources.tag_planning"],
      },
    ],
    cta: { labelKey: "resources.requestProQuote", href: "/pro-service" },
  },
];

// ── FAQ Accordion ─────────────────────────────────────────────────────────────

function FAQAccordion({ faqs }: { faqs: FAQItem[] }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
      {faqs.map((faq, i) => (
        <div key={i}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left hover:bg-card transition-colors"
          >
            <span className="font-display font-semibold text-sm text-foreground leading-snug">
              {t(faq.qKey)}
            </span>
            <ChevronDown className={`h-4 w-4 shrink-0 mt-1 text-muted-foreground transition-transform duration-200 ${open === i ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence>
            {open === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{t(faq.aKey)}</p>
                  {faq.tipKey && (
                    <div className="bg-accent/50 border border-accent rounded-lg p-4">
                      <span className="text-[11px] font-display font-bold uppercase tracking-wider text-foreground/60">{t('resources.expertTip')}</span>
                      <p className="text-sm text-foreground/80 mt-1 leading-relaxed">{t(faq.tipKey)}</p>
                    </div>
                  )}
                  {faq.tagKeys && (
                    <div className="flex flex-wrap gap-1.5">
                      {faq.tagKeys.map(tagKey => (
                        <span key={tagKey} className="text-[10px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                          {t(tagKey)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

// ── Product sidebar card ──────────────────────────────────────────────────────

function SidebarProductCard({ product, color }: { product: SidebarProduct; color: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(product.href)}
      className="group w-full text-left border border-border rounded-sm overflow-hidden hover:border-foreground/30 transition-all"
    >
      <div className="aspect-[4/3] overflow-hidden bg-card group-hover:scale-[1.02] transition-transform duration-500">
        {SIDEBAR_ILLUSTRATIONS[product.id] ? (
          (() => { const Illust = SIDEBAR_ILLUSTRATIONS[product.id]; return <Illust />; })()
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="font-display font-semibold text-xs text-foreground leading-snug">{t(product.nameKey)}</p>
          <span
            className="text-[9px] font-display font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0"
            style={{ background: color + "18", color }}
          >
            {t(product.tagKey)}
          </span>
        </div>
        <p className="text-[10px] font-body text-muted-foreground">{t(product.categoryKey)}</p>
      </div>
    </button>
  );
}

// ── Topic photo card ──────────────────────────────────────────────────────────

function TopicPhotoCard({ topic, isActive, onClick }: { topic: Topic; isActive: boolean; onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-sm transition-all duration-300 ${
        isActive ? "ring-2 ring-foreground ring-offset-2" : "hover:opacity-90"
      }`}
    >
      {/* Illustration */}
      <div className="aspect-[3/4] md:aspect-[4/5] overflow-hidden group-hover:scale-[1.03] transition-transform duration-500">
        {TOPIC_ILLUSTRATIONS[topic.id] ? (
          (() => { const Illust = TOPIC_ILLUSTRATIONS[topic.id]; return <Illust />; })()
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
      </div>

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-white" />
      )}

      {/* Icon + label */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center mb-2"
          style={{ backgroundColor: topic.color }}
        >
          <topic.icon className="h-3.5 w-3.5 text-white" />
        </div>
        <p className="font-display font-bold text-sm text-white leading-tight">{t(topic.labelKey)}</p>
        <p className="text-[10px] text-white/60 mt-0.5 leading-tight hidden md:block">{t(topic.subtitleKey)}</p>
      </div>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const Resources = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTopic, setActiveTopic] = useState("seating");
  const topic = TOPICS.find(tp => tp.id === activeTopic)!;

  const handleTopicChange = (id: string) => {
    setActiveTopic(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* ── Hero with photo cards ── */}
      <section className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-0">

          {/* Header text */}
          <div className="max-w-2xl mb-10">
            <p className="text-[11px] font-display font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">
              {t('resources.title')}
            </p>
            <h1 className="font-display text-3xl md:text-5xl font-bold leading-[1.1] tracking-tight text-foreground mb-4">
              {t('resources.heroTitle')}
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              {t('resources.subtitle')}
            </p>
          </div>

          {/* Photo card grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {TOPICS.map(tp => (
              <TopicPhotoCard
                key={tp.id}
                topic={tp}
                isActive={activeTopic === tp.id}
                onClick={() => handleTopicChange(tp.id)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Topic content — 2-column layout ── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={topic.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12"
          >
            {/* ── Main content column ── */}
            <div>
              {/* Topic header */}
              <div className="flex items-center gap-4 mb-10">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: topic.color + "18", color: topic.color }}
                >
                  <topic.icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground">{t(topic.labelKey)}</h2>
                  <p className="text-sm text-muted-foreground">{t(topic.subtitleKey)}</p>
                </div>
              </div>

              {/* Guide body */}
              <div className="mb-12">
                <h3 className="font-display text-lg font-bold text-foreground mb-4">{t(topic.guide.titleKey)}</h3>
                <div className="space-y-4">
                  {t(topic.guide.bodyKey).trim().split("\n\n").map((para, i) => (
                    <p key={i} className="text-sm text-muted-foreground leading-relaxed">{para}</p>
                  ))}
                </div>
              </div>

              {/* Expert insight */}
              <div className="bg-foreground text-primary-foreground rounded-lg p-6 mb-12">
                <p className="text-[11px] font-display font-bold uppercase tracking-[0.2em] text-primary-foreground/50 mb-3">
                  {t('resources.expertInsight')}
                </p>
                <p className="text-sm leading-relaxed text-primary-foreground/80 italic">
                  "{t(topic.expertKey)}"
                </p>
              </div>

              {/* FAQ */}
              <div className="mb-12">
                <h3 className="font-display text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                  <ChevronDown className="h-4 w-4" />
                  {t('resources.faqTitle')}
                </h3>
                <FAQAccordion faqs={topic.faqs} />
              </div>

              {/* CTA */}
              <div className="bg-foreground rounded-lg p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <h3 className="font-display text-lg font-bold text-primary-foreground mb-1">
                    {t('resources.readyTitle')}
                  </h3>
                  <p className="text-sm text-primary-foreground/60">
                    {t('resources.readyDesc')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => navigate("/projects/new")}
                    className="flex items-center gap-2 px-5 py-2.5 font-display font-semibold text-sm bg-primary-foreground text-foreground rounded-full hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    {t('resources.startMyProject')} <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => navigate(topic.cta.href)}
                    className="flex items-center gap-2 px-5 py-2.5 font-display font-semibold text-sm border border-primary-foreground/30 text-primary-foreground/70 rounded-full hover:border-primary-foreground hover:text-primary-foreground transition-all whitespace-nowrap"
                  >
                    {t(topic.cta.labelKey)}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Sidebar ── */}
            <aside className="hidden lg:block">
              <div className="sticky top-28 space-y-6">

                {/* Sidebar header */}
                <div>
                  <p className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">
                    {t('resources.relatedProducts')}
                  </p>
                  <div className="space-y-3">
                    {topic.sidebarProducts.map((product, i) => (
                      <SidebarProductCard key={i} product={product} color={topic.color} />
                    ))}
                  </div>
                </div>

                {/* Sidebar CTA */}
                <div
                  className="rounded-sm p-4 border"
                  style={{ borderColor: topic.color + "30", background: topic.color + "08" }}
                >
                  <p className="font-display font-bold text-sm text-foreground mb-1">
                    {t('resources.notSure')}
                  </p>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                    {t('resources.notSureDesc')}
                  </p>
                  <button
                    onClick={() => navigate("/projects/new")}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 font-display font-semibold text-xs text-white rounded-full transition-opacity hover:opacity-90"
                    style={{ backgroundColor: topic.color }}
                  >
                    {t('resources.launchMyProject')} <ArrowRight className="h-3 w-3" />
                  </button>
                </div>

                {/* Topic switcher in sidebar */}
                <div>
                  <p className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">
                    {t('resources.otherTopics')}
                  </p>
                  <div className="space-y-1">
                    {TOPICS.filter(tp => tp.id !== activeTopic).map(tp => (
                      <button
                        key={tp.id}
                        onClick={() => handleTopicChange(tp.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-sm text-left hover:bg-card transition-colors"
                      >
                        <tp.icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <div>
                          <p className="text-xs font-display font-semibold text-foreground">{t(tp.labelKey)}</p>
                          <p className="text-[10px] text-muted-foreground">{tp.faqs.length} {t('resources.questions')}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* ── Mobile: bottom topic switcher ── */}
      <section className="lg:hidden border-t border-border bg-muted/20">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <p className="text-[11px] font-display font-bold uppercase tracking-[0.2em] text-muted-foreground mb-5">
            {t('resources.continueReading')}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {TOPICS.map(tp => (
              <button
                key={tp.id}
                onClick={() => handleTopicChange(tp.id)}
                className={`flex flex-col items-start gap-2 p-3 rounded-sm border text-left transition-all ${
                  activeTopic === tp.id ? "border-foreground bg-background" : "border-border hover:border-foreground/30"
                }`}
              >
                <tp.icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-display font-semibold text-foreground">{t(tp.labelKey)}</p>
                  <p className="text-[10px] text-muted-foreground">{tp.faqs.length} {t('resources.questions')}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Resources;
