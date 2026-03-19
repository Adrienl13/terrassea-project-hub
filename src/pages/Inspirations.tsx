import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Layers, Sparkles, X } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SpaceType {
  id: string;
  label: string;
  count: number;
  gradient: string;
  emoji: string;
}

interface Material {
  color: string;
  label: string;
  pro?: string;
}

interface Moodboard {
  id: string;
  name: string;
  tagline: string;
  spaces: string[];
  style: string;
  palette: string[];
  colorNames: string[];
  materials: Material[];
  productCount: number;
  keywords: string[];
  gradient: string;
  accentColor: string;
}

// ─── Data ──────────────────────────────────────────────────────────────────────

const SPACES: SpaceType[] = [
  { id: "all",        label: "Tous",       count: 0,  gradient: "", emoji: "✦" },
  { id: "restaurant", label: "Restaurant", count: 42, gradient: "from-[#D4603A]/20 via-[#C4956A]/10 to-transparent", emoji: "🍽" },
  { id: "hotel",      label: "Hôtel",      count: 28, gradient: "from-[#4A90A4]/20 via-[#8AAFBF]/10 to-transparent", emoji: "🏨" },
  { id: "rooftop",    label: "Rooftop",    count: 19, gradient: "from-[#2D2D2D]/20 via-[#C4956A]/10 to-transparent", emoji: "🌆" },
  { id: "beachclub",  label: "Beach Club", count: 15, gradient: "from-[#2BBCD4]/20 via-[#F2C14E]/10 to-transparent", emoji: "🏖" },
  { id: "camping",    label: "Camping",    count: 11, gradient: "from-[#6B7B5E]/20 via-[#8B7355]/10 to-transparent", emoji: "⛺" },
];

const STYLE_FILTERS = ["Tous les styles","Bistro","Méditerranéen","Beach Club","Urbain","Lounge","Nordique","Naturel"];

const MOODBOARDS: Moodboard[] = [
  {
    id: "cafe-parisien",
    name: "Café Parisien",
    tagline: "L'âme des terrasses parisiennes",
    spaces: ["restaurant","all"],
    style: "Bistro",
    palette: ["#C0392B","#7D2935","#1A1A1A","#6B4C1E","#F5E6D3","#9B9B9B"],
    colorNames: ["Rouge vif","Bordeaux","Noir forgé","Bois foncé","Crème","Zinc"],
    materials: [
      { color: "#6B4C1E", label: "Rotin canné tressé main", pro: "Signature bistrot" },
      { color: "#1A1A1A", label: "Fer forgé / métal laqué", pro: "Très résistant" },
      { color: "#9B9B9B", label: "Zinc (plateaux guéridons)", pro: "Authentique" },
      { color: "#C0C0C0", label: "Aluminium laqué empilable", pro: "Facile à ranger" },
    ],
    productCount: 12,
    keywords: ["convivial","authentique","fort trafic"],
    gradient: "from-[#C0392B] via-[#7D2935] to-[#1A1A1A]",
    accentColor: "#C0392B",
  },
  {
    id: "riviera-med",
    name: "Riviera Méditerranée",
    tagline: "Chaleur du Sud, matériaux nobles",
    spaces: ["restaurant","hotel","camping","all"],
    style: "Méditerranéen",
    palette: ["#D4603A","#C4956A","#E8D5B0","#4A90A4","#6B7B5E","#FFFFFF"],
    colorNames: ["Terracotta","Ocre chaud","Sable","Azur","Olive","Blanc"],
    materials: [
      { color: "#8B7355", label: "Teck massif", pro: "Résistant au sel" },
      { color: "#D4C5A9", label: "Corde / rotin synthétique", pro: "UV résistant" },
      { color: "#C0C0C0", label: "Aluminium thermolaqué", pro: "Anti-corrosion" },
      { color: "#D4603A", label: "Céramique / grès", pro: "Plateaux premium" },
    ],
    productCount: 18,
    keywords: ["chaleureux","al fresco","usage intensif"],
    gradient: "from-[#D4603A] via-[#C4956A] to-[#4A90A4]",
    accentColor: "#D4603A",
  },
  {
    id: "beach-club",
    name: "Beach Club",
    tagline: "L'esprit Ibiza, le confort 5 étoiles",
    spaces: ["beachclub","hotel","all"],
    style: "Beach Club",
    palette: ["#FFFFFF","#F5E6D3","#2BBCD4","#8B7355","#F2C14E","#D4C5A9"],
    colorNames: ["Blanc pur","Sable naturel","Turquoise mer","Teck","Jaune soleil","Dune"],
    materials: [
      { color: "#8B7355", label: "Teck grade A", pro: "Anti-sel certifié" },
      { color: "#D4C5A9", label: "Rotin synthétique UV+", pro: "Résistance marine" },
      { color: "#F5E6D3", label: "Textilène / Batyline®", pro: "Séchage rapide" },
      { color: "#C0C0C0", label: "Alu inox", pro: "Résistance marine" },
    ],
    productCount: 14,
    keywords: ["détendu","ibiza style","résistance marine"],
    gradient: "from-[#2BBCD4] via-[#F2C14E] to-[#F5E6D3]",
    accentColor: "#2BBCD4",
  },
  {
    id: "rooftop-urban",
    name: "Rooftop Urban",
    tagline: "Sophistication au-dessus des toits",
    spaces: ["rooftop","hotel","all"],
    style: "Urbain",
    palette: ["#1A1A1A","#2D2D2D","#C4956A","#5D3A1A","#C0C0C0","#F5F0EB"],
    colorNames: ["Noir profond","Anthracite","Bronze","Bois fumé","Acier brossé","Blanc cassé"],
    materials: [
      { color: "#C0C0C0", label: "Acier thermolaqué mat", pro: "Résistance vent" },
      { color: "#C4956A", label: "Laiton brossé (détails)", pro: "Premium" },
      { color: "#5D3A1A", label: "Bois traité fumé / HPL", pro: "Intempéries" },
      { color: "#888888", label: "Béton ciré (plateaux)", pro: "Design signature" },
    ],
    productCount: 10,
    keywords: ["contemporain","soirée","résistance vent"],
    gradient: "from-[#1A1A1A] via-[#2D2D2D] to-[#C4956A]",
    accentColor: "#C4956A",
  },
  {
    id: "lounge-luxe",
    name: "Lounge Luxe",
    tagline: "Le grand confort outdoor redéfini",
    spaces: ["hotel","rooftop","all"],
    style: "Lounge",
    palette: ["#1B4D3E","#1A2456","#722F37","#C4956A","#F5E6D3","#1A1A1A"],
    colorNames: ["Émeraude","Bleu nuit","Bordeaux","Or / Laiton","Crème ivoire","Noir"],
    materials: [
      { color: "#F5E6D3", label: "Tissu outdoor Sunbrella®", pro: "Référence luxe" },
      { color: "#C4956A", label: "Laiton / acier doré", pro: "Finition haute gamme" },
      { color: "#888888", label: "Marbre / pierre naturelle", pro: "Plateau signature" },
      { color: "#8B7355", label: "Teck huilé premium", pro: "Longévité garantie" },
    ],
    productCount: 9,
    keywords: ["raffiné","soirée","haut de gamme"],
    gradient: "from-[#1B4D3E] via-[#1A2456] to-[#722F37]",
    accentColor: "#C4956A",
  },
  {
    id: "nordic-calm",
    name: "Nordic Calm",
    tagline: "Épure scandinave, confort 4 saisons",
    spaces: ["restaurant","hotel","all"],
    style: "Nordique",
    palette: ["#F9F7F4","#D4C9B8","#B4B2A9","#8B7355","#6B7B5E","#E8E3DA"],
    colorNames: ["Blanc neige","Bouleau clair","Gris pierre","Chêne","Mousse","Brume"],
    materials: [
      { color: "#D4C9B8", label: "Bois clair (chêne / bouleau)", pro: "4 saisons" },
      { color: "#C0C0C0", label: "Aluminium poudré blanc", pro: "Léger & durable" },
      { color: "#F5E6D3", label: "Toile lin / coton outdoor", pro: "Naturel" },
      { color: "#6B7B5E", label: "Polypropylène recyclé", pro: "Éco-responsable" },
    ],
    productCount: 11,
    keywords: ["épuré","fonctionnel","4 saisons"],
    gradient: "from-[#D4C9B8] via-[#B4B2A9] to-[#8B7355]",
    accentColor: "#8B7355",
  },
  {
    id: "naturel-organique",
    name: "Naturel & Organique",
    tagline: "La nature comme fil conducteur",
    spaces: ["camping","restaurant","all"],
    style: "Naturel",
    palette: ["#8B7355","#E8DDD3","#6B7B5E","#D4C9B8","#A0856E","#C8B89A"],
    colorNames: ["Teck naturel","Lin brut","Sauge","Dune","Argile","Chanvre"],
    materials: [
      { color: "#8B7355", label: "Teck / acacia FSC", pro: "Certifié durable" },
      { color: "#D4C5A9", label: "Rotin naturel / bambou", pro: "Bio-sourcé" },
      { color: "#F5E6D3", label: "Corde naturelle / chanvre", pro: "Authentique" },
      { color: "#6B7B5E", label: "PP recyclé éco-conçu", pro: "Recyclable" },
    ],
    productCount: 13,
    keywords: ["authentique","durable","éco-responsable"],
    gradient: "from-[#8B7355] via-[#6B7B5E] to-[#D4C9B8]",
    accentColor: "#8B7355",
  },
];

// ─── Visual gradient card ──────────────────────────────────────────────────────

function GradientVisual({ gradient, style }: { gradient: string; style: string }) {
  return (
    <div className="relative w-full aspect-[16/9] overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.08),transparent_60%)]" />
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.8'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
      <div className="absolute bottom-3 right-3 w-8 h-8 border border-white/20 rounded-full" />
      <div className="absolute top-3 left-3">
        <span className="text-[10px] font-display font-semibold text-white/70 uppercase tracking-[0.15em]">
          {style}
        </span>
      </div>
    </div>
  );
}

// ─── Uniform MoodCard — NO materials ──────────────────────────────────────────

function MoodCard({ board, isSelected, onSelect }: {
  board: Moodboard;
  isSelected: boolean;
  onSelect: (b: Moodboard) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={() => onSelect(board)}
      className={`group cursor-pointer border rounded-sm overflow-hidden bg-background transition-all ${
        isSelected
          ? "border-foreground"
          : "border-border hover:border-foreground/40"
      }`}
    >
      <GradientVisual gradient={board.gradient} style={board.style} />
      <div className="p-4 space-y-3">
        {/* Title */}
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-display font-semibold text-foreground">{board.name}</h3>
            <span className="text-[10px] text-muted-foreground font-body">
              {board.productCount} produits
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-body mt-0.5">{board.tagline}</p>
        </div>

        {/* Palette */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider">Palette</p>
          <div className="flex gap-1">
            {board.palette.map((color, i) => (
              <div
                key={i}
                className="h-4 flex-1 rounded-[2px] first:rounded-l last:rounded-r"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">{board.colorNames.slice(0, 3).join(" · ")}</p>
        </div>

        {/* Keywords */}
        <div className="flex flex-wrap gap-1">
          {board.keywords.map((k) => (
            <span key={k} className="text-[10px] font-body text-muted-foreground border border-border rounded-full px-2 py-0.5">{k}</span>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center justify-between text-[11px] font-display font-semibold text-foreground group-hover:text-foreground transition-colors pt-1 border-t border-border">
          {isSelected ? "Masquer les détails" : "Voir les matériaux →"}
          <ArrowRight className={`w-3 h-3 transition-transform ${isSelected ? "rotate-90" : "group-hover:translate-x-0.5"}`} />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Detail panel with materials ──────────────────────────────────────────────

function DetailPanel({ board, onClose }: { board: Moodboard; onClose: () => void }) {
  const navigate = useNavigate();
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
            <p className="text-[10px] font-display font-semibold text-white/60 uppercase tracking-[0.15em] mb-1">{board.style}</p>
            <h2 className="text-2xl font-display font-bold text-white">{board.name}</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xs font-display transition-colors flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Fermer
          </button>
        </div>
      </div>

      {/* 3-column content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">

        {/* Col 1 — Palette */}
        <div>
          <h3 className="text-xs font-display font-semibold text-foreground mb-3 uppercase tracking-wider">Palette couleurs</h3>
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

        {/* Col 2 — Matériaux */}
        <div>
          <h3 className="text-xs font-display font-semibold text-foreground mb-3 uppercase tracking-wider">Matériaux recommandés</h3>
          <div className="space-y-3">
            {board.materials.map((m, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full border border-border flex-shrink-0 mt-0.5" style={{ backgroundColor: m.color }} />
                <div>
                  <p className="text-xs font-display font-medium text-foreground">{m.label}</p>
                  {m.pro && <p className="text-[10px] text-muted-foreground">✓ {m.pro}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Col 3 — Actions */}
        <div className="flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-display font-semibold text-foreground mb-2 uppercase tracking-wider">Mots-clés</h3>
              <div className="flex flex-wrap gap-1.5">
                {board.keywords.map((k) => (
                  <span key={k} className="text-[10px] font-body text-muted-foreground border border-border rounded-full px-2.5 py-0.5">{k}</span>
                ))}
              </div>
            </div>
            <div className="p-3 bg-muted/30 rounded-sm border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider">
                  Produits disponibles
                </span>
              </div>
              <p className="text-2xl font-display font-bold text-foreground">{board.productCount}</p>
              <p className="text-[10px] text-muted-foreground">
                produits correspondant à ce style
              </p>
            </div>
          </div>
          <div className="space-y-2 mt-4">
            <button
              onClick={() => navigate(`/products?style=${board.style.toLowerCase()}`)}
              className="w-full py-3 text-sm font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
            >
              Explorer les produits →
            </button>
            <button
              onClick={() => navigate("/projects/new")}
              className="w-full py-3 text-sm font-display font-semibold border border-border text-muted-foreground rounded-full hover:border-foreground hover:text-foreground transition-all"
            >
              Créer mon projet avec ce style
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
  const [activeStyle,    setActiveStyle]    = useState("Tous les styles");
  const [selectedBoard,  setSelectedBoard]  = useState<Moodboard | null>(null);

  const filtered = useMemo(() =>
    MOODBOARDS.filter((b) => {
      const spaceOk = activeSpace === "all" || b.spaces.includes(activeSpace);
      const styleOk = activeStyle === "Tous les styles" || b.style === activeStyle;
      return spaceOk && styleOk;
    }),
    [activeSpace, activeStyle]
  );

  const handleSelect = (board: Moodboard) => {
    const next = selectedBoard?.id === board.id ? null : board;
    setSelectedBoard(next);
    if (next) {
      setTimeout(() => {
        document.getElementById("inspi-detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">

        {/* Hero — compact, side-by-side layout */}
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
              {SPACES.map((space, i) => (
                <button
                  key={space.id}
                  onClick={() => { setActiveSpace(space.id); setSelectedBoard(null); }}
                  className={`relative overflow-hidden rounded-sm border transition-all text-left p-3 ${
                    activeSpace === space.id
                      ? "border-foreground bg-card"
                      : "border-border hover:border-foreground/30 bg-background"
                  }`}
                >
                  {space.id !== "all" && (
                    <div className={`absolute inset-0 bg-gradient-to-br ${space.gradient} pointer-events-none`} />
                  )}
                  <div className="relative">
                    <p className="text-base mb-0.5">{space.emoji}</p>
                    <p className="text-xs font-display font-semibold text-foreground">{space.label}</p>
                    {space.count > 0 && (
                      <p className="text-[10px] text-muted-foreground">{space.count} inspi.</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Style filters */}
        <section className="border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-display font-semibold text-foreground">
                  Moodboards
                  {activeSpace !== "all" && (
                    <span className="text-muted-foreground font-normal">
                      {" — "}{SPACES.find(s => s.id === activeSpace)?.label}
                    </span>
                  )}
                </h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {filtered.length} sélection{filtered.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STYLE_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => { setActiveStyle(f); setSelectedBoard(null); }}
                  className={`text-xs font-body px-3 py-1.5 rounded-full border transition-all ${
                    activeStyle === f
                      ? "bg-foreground text-primary-foreground border-transparent"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  }`}
                >
                  {f}
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
                    <MoodCard key={board.id} board={board} isSelected={selectedBoard?.id === board.id} onSelect={handleSelect} />
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </section>

        {/* Detail panel — full width below grid */}
        <section id="inspi-detail" className="pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <AnimatePresence mode="wait">
              {selectedBoard && (
                <DetailPanel board={selectedBoard} onClose={() => setSelectedBoard(null)} />
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
