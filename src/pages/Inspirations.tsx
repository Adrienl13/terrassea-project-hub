import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Layers, Sparkles, X } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Material {
  color: string;
  labelKey: string;
  proKey: string;
}

interface MoodboardDef {
  id: string;
  nameKey: string;
  taglineKey: string;
  spaces: string[];
  styleKey: string;
  palette: string[];
  colorNames: string[];
  materials: Material[];
  productCount: number;
  keywordKeys: string[];
  gradient: string;
  accentColor: string;
}

// ─── Static data (translation-key based) ───────────────────────────────────────

const SPACE_IDS = ["all", "restaurant", "hotel", "rooftop", "beachclub", "camping"] as const;
const SPACE_META: Record<string, { gradient: string; emoji: string; count: number }> = {
  all:        { gradient: "", emoji: "✦", count: 0 },
  restaurant: { gradient: "from-[#D4603A]/20 via-[#C4956A]/10 to-transparent", emoji: "🍽", count: 42 },
  hotel:      { gradient: "from-[#4A90A4]/20 via-[#8AAFBF]/10 to-transparent", emoji: "🏨", count: 28 },
  rooftop:    { gradient: "from-[#2D2D2D]/20 via-[#C4956A]/10 to-transparent", emoji: "🌆", count: 19 },
  beachclub:  { gradient: "from-[#2BBCD4]/20 via-[#F2C14E]/10 to-transparent", emoji: "🏖", count: 15 },
  camping:    { gradient: "from-[#6B7B5E]/20 via-[#8B7355]/10 to-transparent", emoji: "⛺", count: 11 },
};

const STYLE_KEYS = ["allStyles", "bistro", "mediterranean", "beachClub", "urban", "lounge", "nordic", "natural"] as const;

const MOODBOARD_DEFS: MoodboardDef[] = [
  {
    id: "cafe-parisien",
    nameKey: "moodboardNames.cafeParisien",
    taglineKey: "moodboardTaglines.cafeParisien",
    spaces: ["restaurant", "all"],
    styleKey: "bistro",
    palette: ["#C0392B", "#7D2935", "#1A1A1A", "#6B4C1E", "#F5E6D3", "#9B9B9B"],
    colorNames: ["Rouge vif", "Bordeaux", "Noir forgé", "Bois foncé", "Crème", "Zinc"],
    materials: [
      { color: "#6B4C1E", labelKey: "materials.cafeParisien.0.label", proKey: "materials.cafeParisien.0.pro" },
      { color: "#1A1A1A", labelKey: "materials.cafeParisien.1.label", proKey: "materials.cafeParisien.1.pro" },
      { color: "#9B9B9B", labelKey: "materials.cafeParisien.2.label", proKey: "materials.cafeParisien.2.pro" },
      { color: "#C0C0C0", labelKey: "materials.cafeParisien.3.label", proKey: "materials.cafeParisien.3.pro" },
    ],
    productCount: 12,
    keywordKeys: ["moods.convivial", "moods.authentic", "moods.highTraffic"],
    gradient: "from-[#C0392B] via-[#7D2935] to-[#1A1A1A]",
    accentColor: "#C0392B",
  },
  {
    id: "riviera-med",
    nameKey: "moodboardNames.rivieraMed",
    taglineKey: "moodboardTaglines.rivieraMed",
    spaces: ["restaurant", "hotel", "camping", "all"],
    styleKey: "mediterranean",
    palette: ["#D4603A", "#C4956A", "#E8D5B0", "#4A90A4", "#6B7B5E", "#FFFFFF"],
    colorNames: ["Terracotta", "Ocre chaud", "Sable", "Azur", "Olive", "Blanc"],
    materials: [
      { color: "#8B7355", labelKey: "materials.rivieraMed.0.label", proKey: "materials.rivieraMed.0.pro" },
      { color: "#D4C5A9", labelKey: "materials.rivieraMed.1.label", proKey: "materials.rivieraMed.1.pro" },
      { color: "#C0C0C0", labelKey: "materials.rivieraMed.2.label", proKey: "materials.rivieraMed.2.pro" },
      { color: "#D4603A", labelKey: "materials.rivieraMed.3.label", proKey: "materials.rivieraMed.3.pro" },
    ],
    productCount: 18,
    keywordKeys: ["moods.warm", "moods.mediterranean", "moods.heavyUse"],
    gradient: "from-[#D4603A] via-[#C4956A] to-[#4A90A4]",
    accentColor: "#D4603A",
  },
  {
    id: "beach-club",
    nameKey: "moodboardNames.beachClub",
    taglineKey: "moodboardTaglines.beachClub",
    spaces: ["beachclub", "hotel", "all"],
    styleKey: "beachClub",
    palette: ["#FFFFFF", "#F5E6D3", "#2BBCD4", "#8B7355", "#F2C14E", "#D4C5A9"],
    colorNames: ["Blanc pur", "Sable naturel", "Turquoise mer", "Teck", "Jaune soleil", "Dune"],
    materials: [
      { color: "#8B7355", labelKey: "materials.beachClub.0.label", proKey: "materials.beachClub.0.pro" },
      { color: "#D4C5A9", labelKey: "materials.beachClub.1.label", proKey: "materials.beachClub.1.pro" },
      { color: "#F5E6D3", labelKey: "materials.beachClub.2.label", proKey: "materials.beachClub.2.pro" },
      { color: "#C0C0C0", labelKey: "materials.beachClub.3.label", proKey: "materials.beachClub.3.pro" },
    ],
    productCount: 14,
    keywordKeys: ["moods.relaxed", "moods.ibizaStyle", "moods.marineResistance"],
    gradient: "from-[#2BBCD4] via-[#F2C14E] to-[#F5E6D3]",
    accentColor: "#2BBCD4",
  },
  {
    id: "rooftop-urban",
    nameKey: "moodboardNames.rooftopUrban",
    taglineKey: "moodboardTaglines.rooftopUrban",
    spaces: ["rooftop", "hotel", "all"],
    styleKey: "urban",
    palette: ["#1A1A1A", "#2D2D2D", "#C4956A", "#5D3A1A", "#C0C0C0", "#F5F0EB"],
    colorNames: ["Noir profond", "Anthracite", "Bronze", "Bois fumé", "Acier brossé", "Blanc cassé"],
    materials: [
      { color: "#C0C0C0", labelKey: "materials.rooftopUrban.0.label", proKey: "materials.rooftopUrban.0.pro" },
      { color: "#C4956A", labelKey: "materials.rooftopUrban.1.label", proKey: "materials.rooftopUrban.1.pro" },
      { color: "#5D3A1A", labelKey: "materials.rooftopUrban.2.label", proKey: "materials.rooftopUrban.2.pro" },
      { color: "#888888", labelKey: "materials.rooftopUrban.3.label", proKey: "materials.rooftopUrban.3.pro" },
    ],
    productCount: 10,
    keywordKeys: ["moods.contemporary", "moods.evening", "moods.windResistance"],
    gradient: "from-[#1A1A1A] via-[#2D2D2D] to-[#C4956A]",
    accentColor: "#C4956A",
  },
  {
    id: "lounge-luxe",
    nameKey: "moodboardNames.loungeLuxe",
    taglineKey: "moodboardTaglines.loungeLuxe",
    spaces: ["hotel", "rooftop", "all"],
    styleKey: "lounge",
    palette: ["#1B4D3E", "#1A2456", "#722F37", "#C4956A", "#F5E6D3", "#1A1A1A"],
    colorNames: ["Émeraude", "Bleu nuit", "Bordeaux", "Or / Laiton", "Crème ivoire", "Noir"],
    materials: [
      { color: "#F5E6D3", labelKey: "materials.loungeLuxe.0.label", proKey: "materials.loungeLuxe.0.pro" },
      { color: "#C4956A", labelKey: "materials.loungeLuxe.1.label", proKey: "materials.loungeLuxe.1.pro" },
      { color: "#888888", labelKey: "materials.loungeLuxe.2.label", proKey: "materials.loungeLuxe.2.pro" },
      { color: "#8B7355", labelKey: "materials.loungeLuxe.3.label", proKey: "materials.loungeLuxe.3.pro" },
    ],
    productCount: 9,
    keywordKeys: ["moods.refined", "moods.evening", "moods.highEnd"],
    gradient: "from-[#1B4D3E] via-[#1A2456] to-[#722F37]",
    accentColor: "#C4956A",
  },
  {
    id: "nordic-calm",
    nameKey: "moodboardNames.nordicCalm",
    taglineKey: "moodboardTaglines.nordicCalm",
    spaces: ["restaurant", "hotel", "all"],
    styleKey: "nordic",
    palette: ["#F9F7F4", "#D4C9B8", "#B4B2A9", "#8B7355", "#6B7B5E", "#E8E3DA"],
    colorNames: ["Blanc neige", "Bouleau clair", "Gris pierre", "Chêne", "Mousse", "Brume"],
    materials: [
      { color: "#D4C9B8", labelKey: "materials.nordicCalm.0.label", proKey: "materials.nordicCalm.0.pro" },
      { color: "#C0C0C0", labelKey: "materials.nordicCalm.1.label", proKey: "materials.nordicCalm.1.pro" },
      { color: "#F5E6D3", labelKey: "materials.nordicCalm.2.label", proKey: "materials.nordicCalm.2.pro" },
      { color: "#6B7B5E", labelKey: "materials.nordicCalm.3.label", proKey: "materials.nordicCalm.3.pro" },
    ],
    productCount: 11,
    keywordKeys: ["moods.pure", "moods.functional", "moods.fourSeasons"],
    gradient: "from-[#D4C9B8] via-[#B4B2A9] to-[#8B7355]",
    accentColor: "#8B7355",
  },
  {
    id: "naturel-organique",
    nameKey: "moodboardNames.naturalOrganic",
    taglineKey: "moodboardTaglines.naturalOrganic",
    spaces: ["camping", "restaurant", "all"],
    styleKey: "natural",
    palette: ["#8B7355", "#E8DDD3", "#6B7B5E", "#D4C9B8", "#A0856E", "#C8B89A"],
    colorNames: ["Teck naturel", "Lin brut", "Sauge", "Dune", "Argile", "Chanvre"],
    materials: [
      { color: "#8B7355", labelKey: "materials.naturalOrganic.0.label", proKey: "materials.naturalOrganic.0.pro" },
      { color: "#D4C5A9", labelKey: "materials.naturalOrganic.1.label", proKey: "materials.naturalOrganic.1.pro" },
      { color: "#F5E6D3", labelKey: "materials.naturalOrganic.2.label", proKey: "materials.naturalOrganic.2.pro" },
      { color: "#6B7B5E", labelKey: "materials.naturalOrganic.3.label", proKey: "materials.naturalOrganic.3.pro" },
    ],
    productCount: 13,
    keywordKeys: ["moods.authentic", "moods.durable", "moods.ecoFriendly"],
    gradient: "from-[#8B7355] via-[#6B7B5E] to-[#D4C9B8]",
    accentColor: "#8B7355",
  },
];

// Style key → URL slug mapping
const STYLE_URL_MAP: Record<string, string> = {
  bistro: "bistro",
  mediterranean: "méditerranéen",
  beachClub: "beach club",
  urban: "urbain",
  lounge: "lounge",
  nordic: "nordique",
  natural: "naturel",
};

// ─── Visual gradient card ──────────────────────────────────────────────────────

function GradientVisual({ gradient, styleLabel }: { gradient: string; styleLabel: string }) {
  return (
    <div className="relative w-full aspect-[16/9] overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.08),transparent_60%)]" />
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.8'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
      <div className="absolute bottom-3 right-3 w-8 h-8 border border-white/20 rounded-full" />
      <div className="absolute top-3 left-3">
        <span className="text-[10px] font-display font-semibold text-white/70 uppercase tracking-[0.15em]">
          {styleLabel}
        </span>
      </div>
    </div>
  );
}

// ─── MoodCard ─────────────────────────────────────────────────────────────────

function MoodCard({ board, isSelected, onSelect, t }: {
  board: MoodboardDef;
  isSelected: boolean;
  onSelect: (b: MoodboardDef) => void;
  t: (key: string) => string;
}) {
  const name = t(`inspirations.${board.nameKey}`);
  const tagline = t(`inspirations.${board.taglineKey}`);
  const styleLabel = board.styleKey === "allStyles" ? t('inspirations.allStyles') : t(`inspirations.styles.${board.styleKey}`);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={() => onSelect(board)}
      className={`group cursor-pointer border rounded-sm overflow-hidden bg-background transition-all ${
        isSelected ? "border-foreground" : "border-border hover:border-foreground/40"
      }`}
    >
      <GradientVisual gradient={board.gradient} styleLabel={styleLabel} />
      <div className="p-4 space-y-3">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-display font-semibold text-foreground">{name}</h3>
            <span className="text-[10px] text-muted-foreground font-body">
              {board.productCount} {t('inspirations.products')}
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-body mt-0.5">{tagline}</p>
        </div>

        {/* Palette */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider">{t('inspirations.palette')}</p>
          <div className="flex gap-1">
            {board.palette.map((color, i) => (
              <div key={i} className="h-4 flex-1 rounded-[2px] first:rounded-l last:rounded-r" style={{ backgroundColor: color }} />
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">{board.colorNames.slice(0, 3).join(" · ")}</p>
        </div>

        {/* Keywords */}
        <div className="flex flex-wrap gap-1">
          {board.keywordKeys.map((k) => (
            <span key={k} className="text-[10px] font-body text-muted-foreground border border-border rounded-full px-2 py-0.5">
              {t(`inspirations.${k}`)}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center justify-between text-[11px] font-display font-semibold text-foreground group-hover:text-foreground transition-colors pt-1 border-t border-border">
          {isSelected ? t('inspirations.hideDetails') : t('inspirations.viewMaterials')}
          <ArrowRight className={`w-3 h-3 transition-transform ${isSelected ? "rotate-90" : "group-hover:translate-x-0.5"}`} />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function DetailPanel({ board, onClose, t }: { board: MoodboardDef; onClose: () => void; t: (key: string) => string }) {
  const navigate = useNavigate();
  const name = t(`inspirations.${board.nameKey}`);
  const styleLabel = t(`inspirations.styles.${board.styleKey}`);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="border border-foreground rounded-sm overflow-hidden bg-background"
    >
      {/* Gradient banner */}
      <div className={`relative h-32 bg-gradient-to-r ${board.gradient}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.8'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
        <div className="absolute inset-0 flex items-end justify-between p-6">
          <div>
            <p className="text-[10px] font-display font-semibold text-white/60 uppercase tracking-[0.15em] mb-1">{styleLabel}</p>
            <h2 className="text-2xl font-display font-bold text-white">{name}</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xs font-display transition-colors flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> {t('inspirations.close')}
          </button>
        </div>
      </div>

      {/* 3-column content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
        {/* Col 1 — Palette */}
        <div>
          <h3 className="text-xs font-display font-semibold text-foreground mb-3 uppercase tracking-wider">{t('inspirations.colors')}</h3>
          <div className="space-y-2">
            {board.palette.map((color, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm border border-border flex-shrink-0" style={{ backgroundColor: color }} />
                <div>
                  <p className="text-xs font-display font-medium text-foreground">{board.colorNames[i]}</p>
                  <span className="text-[10px] text-muted-foreground font-mono">{color}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Col 2 — Materials */}
        <div>
          <h3 className="text-xs font-display font-semibold text-foreground mb-3 uppercase tracking-wider">{t('inspirations.materials')}</h3>
          <div className="space-y-3">
            {board.materials.map((m, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full border border-border flex-shrink-0 mt-0.5" style={{ backgroundColor: m.color }} />
                <div>
                  <p className="text-xs font-display font-medium text-foreground">{t(`inspirations.${m.labelKey}`)}</p>
                  <p className="text-[10px] text-muted-foreground">✓ {t(`inspirations.${m.proKey}`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Col 3 — Actions */}
        <div className="flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-display font-semibold text-foreground mb-2 uppercase tracking-wider">{t('inspirations.keywords')}</h3>
              <div className="flex flex-wrap gap-1.5">
                {board.keywordKeys.map((k) => (
                  <span key={k} className="text-[10px] font-body text-muted-foreground border border-border rounded-full px-2.5 py-0.5">
                    {t(`inspirations.${k}`)}
                  </span>
                ))}
              </div>
            </div>
            <div className="p-3 bg-muted/30 rounded-sm border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('inspirations.available')}
                </span>
              </div>
              <p className="text-2xl font-display font-bold text-foreground">{board.productCount}</p>
              <p className="text-[10px] text-muted-foreground">
                {t('inspirations.matchingStyle')}
              </p>
            </div>
          </div>
          <div className="space-y-2 mt-4">
            <button
              onClick={() => navigate(`/products?style=${(STYLE_URL_MAP[board.styleKey] || board.styleKey).toLowerCase()}`)}
              className="w-full py-3 text-sm font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
            >
              {t('inspirations.exploreProducts')}
            </button>
            <button
              onClick={() => navigate("/projects/new")}
              className="w-full py-3 text-sm font-display font-semibold border border-border text-muted-foreground rounded-full hover:border-foreground hover:text-foreground transition-all"
            >
              {t('inspirations.createProject')}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

const Inspirations = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [activeSpace, setActiveSpace] = useState(searchParams.get("space") || "all");
  const [activeStyleKey, setActiveStyleKey] = useState("allStyles");
  const [selectedBoard, setSelectedBoard] = useState<MoodboardDef | null>(null);

  const filtered = useMemo(() =>
    MOODBOARD_DEFS.filter((b) => {
      const spaceOk = activeSpace === "all" || b.spaces.includes(activeSpace);
      const styleOk = activeStyleKey === "allStyles" || b.styleKey === activeStyleKey;
      return spaceOk && styleOk;
    }),
    [activeSpace, activeStyleKey]
  );

  const handleSelect = (board: MoodboardDef) => {
    const next = selectedBoard?.id === board.id ? null : board;
    setSelectedBoard(next);
    if (next) {
      setTimeout(() => {
        document.getElementById("inspi-detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    }
  };

  const getSpaceLabel = (id: string) => {
    if (id === "all") return t('inspirations.all');
    return t(`inspirations.venues.${id}`);
  };

  const getStyleLabel = (key: string) => {
    if (key === "allStyles") return t('inspirations.allStyles');
    return t(`inspirations.styles.${key}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">

        {/* Hero */}
        <section className="border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <div className="max-w-2xl">
              <div className="space-y-3">
                <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-[0.2em]">
                  {t('inspirations.badge')}
                </p>
                <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground leading-[1.1]">
                  {t('inspirations.headline')}
                </h1>
              </div>
              <p className="text-sm text-muted-foreground font-body mt-4 max-w-lg leading-relaxed">
                {t('inspirations.subtitle')}
              </p>
            </div>
          </div>
        </section>

        {/* Space selector */}
        <section className="border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-3">
              {t('inspirations.byEstablishment')}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {SPACE_IDS.map((id) => {
                const meta = SPACE_META[id];
                return (
                  <button
                    key={id}
                    onClick={() => { setActiveSpace(id); setSelectedBoard(null); }}
                    className={`relative overflow-hidden rounded-sm border transition-all text-left p-3 ${
                      activeSpace === id
                        ? "border-foreground bg-card"
                        : "border-border hover:border-foreground/30 bg-background"
                    }`}
                  >
                    {id !== "all" && (
                      <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient} pointer-events-none`} />
                    )}
                    <div className="relative">
                      <p className="text-base mb-0.5">{meta.emoji}</p>
                      <p className="text-xs font-display font-semibold text-foreground">{getSpaceLabel(id)}</p>
                      {meta.count > 0 && (
                        <p className="text-[10px] text-muted-foreground">{meta.count} {t('inspirations.inspi')}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Style filters */}
        <section className="border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-display font-semibold text-foreground">
                  {t('inspirations.moodboards')}
                  {activeSpace !== "all" && (
                    <span className="text-muted-foreground font-normal">
                      {" — "}{getSpaceLabel(activeSpace)}
                    </span>
                  )}
                </h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {filtered.length} {filtered.length > 1 ? t('inspirations.selectionsPlural') : t('inspirations.selections')}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STYLE_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => { setActiveStyleKey(key); setSelectedBoard(null); }}
                  className={`text-xs font-body px-3 py-1.5 rounded-full border transition-all ${
                    activeStyleKey === key
                      ? "bg-foreground text-primary-foreground border-transparent"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  }`}
                >
                  {getStyleLabel(key)}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Grid */}
        <section className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-sm text-muted-foreground">{t('inspirations.noMoodboards')}</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((board) => (
                    <MoodCard key={board.id} board={board} isSelected={selectedBoard?.id === board.id} onSelect={handleSelect} t={t} />
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </section>

        {/* Detail panel */}
        <section id="inspi-detail" className="pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <AnimatePresence mode="wait">
              {selectedBoard && (
                <DetailPanel board={selectedBoard} onClose={() => setSelectedBoard(null)} t={t} />
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="relative border border-border rounded-sm overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-muted/50 via-transparent to-muted/30 pointer-events-none" />
              <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 p-8">
                <div className="max-w-md">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-muted-foreground" />
                    <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-[0.15em]">{t('inspirations.ctaBadge')}</p>
                  </div>
                  <h3 className="text-lg font-display font-bold text-foreground mb-1">
                    {t('inspirations.ctaTitle')}
                  </h3>
                  <p className="text-xs text-muted-foreground font-body leading-relaxed">
                    {t('inspirations.ctaDesc')}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => navigate("/projects/new")}
                    className="px-8 py-3.5 text-sm font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    {t('inspirations.ctaLaunch')}
                  </button>
                  <button
                    onClick={() => navigate("/products")}
                    className="px-8 py-3.5 text-sm font-display font-semibold border border-border text-muted-foreground rounded-full hover:border-foreground hover:text-foreground transition-all whitespace-nowrap text-center"
                  >
                    {t('inspirations.ctaCatalogue')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
};

export default Inspirations;
