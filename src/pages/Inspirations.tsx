import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Layers, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Data ─────────────────────────────────────────────────────────────────────

const SPACES: SpaceType[] = [
  { id: "all",        label: "Tous",        count: 0,  gradient: "", emoji: "✦" },
  { id: "restaurant", label: "Restaurant",  count: 42, gradient: "from-[#D4603A]/20 via-[#C4956A]/10 to-transparent", emoji: "🍽" },
  { id: "hotel",      label: "Hôtel",       count: 28, gradient: "from-[#4A90A4]/20 via-[#8AAFBF]/10 to-transparent", emoji: "🏨" },
  { id: "rooftop",    label: "Rooftop",     count: 19, gradient: "from-[#2D2D2D]/20 via-[#C4956A]/10 to-transparent", emoji: "🌆" },
  { id: "beachclub",  label: "Beach Club",  count: 15, gradient: "from-[#2BBCD4]/20 via-[#F2C14E]/10 to-transparent", emoji: "🏖" },
  { id: "camping",    label: "Camping",     count: 11, gradient: "from-[#6B7B5E]/20 via-[#8B7355]/10 to-transparent", emoji: "⛺" },
];

const STYLE_FILTERS = ["Tous les styles", "Bistro", "Méditerranéen", "Beach Club", "Urbain", "Lounge", "Nordique", "Naturel"];

const MOODBOARDS: Moodboard[] = [
  {
    id: "cafe-parisien",
    name: "Café Parisien",
    tagline: "L'âme des terrasses parisiennes",
    spaces: ["restaurant", "all"],
    style: "Bistro",
    palette: ["#C0392B", "#7D2935", "#1A1A1A", "#6B4C1E", "#F5E6D3", "#9B9B9B"],
    colorNames: ["Rouge vif", "Bordeaux", "Noir forgé", "Bois foncé", "Crème", "Zinc"],
    materials: [
      { color: "#6B4C1E", label: "Rotin canné tressé main", pro: "Signature bistrot" },
      { color: "#1A1A1A", label: "Fer forgé / métal laqué", pro: "Très résistant" },
      { color: "#9B9B9B", label: "Zinc (plateaux guéridons)", pro: "Authentique" },
      { color: "#C0C0C0", label: "Aluminium laqué empilable", pro: "Facile à ranger" },
    ],
    productCount: 12,
    keywords: ["convivial", "authentique", "fort trafic"],
    gradient: "from-[#C0392B] via-[#7D2935] to-[#1A1A1A]",
    accentColor: "#C0392B",
  },
  {
    id: "riviera-med",
    name: "Riviera Méditerranée",
    tagline: "Chaleur du Sud, matériaux nobles",
    spaces: ["restaurant", "hotel", "camping", "all"],
    style: "Méditerranéen",
    palette: ["#D4603A", "#C4956A", "#E8D5B0", "#4A90A4", "#6B7B5E", "#FFFFFF"],
    colorNames: ["Terracotta", "Ocre chaud", "Sable", "Azur", "Olive", "Blanc"],
    materials: [
      { color: "#8B7355", label: "Teck massif", pro: "Résistant au sel" },
      { color: "#D4C5A9", label: "Corde / rotin synthétique", pro: "UV résistant" },
      { color: "#C0C0C0", label: "Aluminium thermolaqué", pro: "Anti-corrosion" },
      { color: "#D4603A", label: "Céramique / grès", pro: "Plateaux premium" },
    ],
    productCount: 18,
    keywords: ["chaleureux", "al fresco", "usage intensif"],
    gradient: "from-[#D4603A] via-[#C4956A] to-[#4A90A4]",
    accentColor: "#D4603A",
  },
  {
    id: "beach-club",
    name: "Beach Club",
    tagline: "L'esprit Ibiza, le confort 5 étoiles",
    spaces: ["beachclub", "hotel", "all"],
    style: "Beach Club",
    palette: ["#FFFFFF", "#F5E6D3", "#2BBCD4", "#8B7355", "#F2C14E", "#D4C5A9"],
    colorNames: ["Blanc pur", "Sable naturel", "Turquoise mer", "Teck", "Jaune soleil", "Dune"],
    materials: [
      { color: "#8B7355", label: "Teck grade A", pro: "Anti-sel certifié" },
      { color: "#D4C5A9", label: "Rotin synthétique UV+", pro: "Résistance marine" },
      { color: "#F5E6D3", label: "Textilène / Batyline®", pro: "Séchage rapide" },
      { color: "#C0C0C0", label: "Alu inox", pro: "Résistance marine" },
    ],
    productCount: 14,
    keywords: ["détendu", "ibiza style", "résistance marine"],
    gradient: "from-[#2BBCD4] via-[#F2C14E] to-[#F5E6D3]",
    accentColor: "#2BBCD4",
  },
  {
    id: "rooftop-urban",
    name: "Rooftop Urban",
    tagline: "Sophistication au-dessus des toits",
    spaces: ["rooftop", "hotel", "all"],
    style: "Urbain",
    palette: ["#1A1A1A", "#2D2D2D", "#C4956A", "#5D3A1A", "#C0C0C0", "#F5F0EB"],
    colorNames: ["Noir profond", "Anthracite", "Bronze", "Bois fumé", "Acier brossé", "Blanc cassé"],
    materials: [
      { color: "#C0C0C0", label: "Acier thermolaqué mat", pro: "Résistance vent" },
      { color: "#C4956A", label: "Laiton brossé (détails)", pro: "Premium" },
      { color: "#5D3A1A", label: "Bois traité fumé / HPL", pro: "Intempéries" },
      { color: "#888888", label: "Béton ciré (plateaux)", pro: "Design signature" },
    ],
    productCount: 10,
    keywords: ["contemporain", "soirée", "résistance vent"],
    gradient: "from-[#1A1A1A] via-[#2D2D2D] to-[#C4956A]",
    accentColor: "#C4956A",
  },
  {
    id: "lounge-luxe",
    name: "Lounge Luxe",
    tagline: "Le grand confort outdoor redéfini",
    spaces: ["hotel", "rooftop", "all"],
    style: "Lounge",
    palette: ["#1B4D3E", "#1A2456", "#722F37", "#C4956A", "#F5E6D3", "#1A1A1A"],
    colorNames: ["Émeraude", "Bleu nuit", "Bordeaux", "Or / Laiton", "Crème ivoire", "Noir"],
    materials: [
      { color: "#F5E6D3", label: "Tissu outdoor Sunbrella®", pro: "Référence luxe" },
      { color: "#C4956A", label: "Laiton / acier doré", pro: "Finition haute gamme" },
      { color: "#888888", label: "Marbre / pierre naturelle", pro: "Plateau signature" },
      { color: "#8B7355", label: "Teck huilé premium", pro: "Longévité garantie" },
    ],
    productCount: 9,
    keywords: ["raffiné", "soirée", "haut de gamme"],
    gradient: "from-[#1B4D3E] via-[#1A2456] to-[#722F37]",
    accentColor: "#C4956A",
  },
  {
    id: "nordic-calm",
    name: "Nordic Calm",
    tagline: "Épure scandinave, confort 4 saisons",
    spaces: ["restaurant", "hotel", "all"],
    style: "Nordique",
    palette: ["#F9F7F4", "#D4C9B8", "#B4B2A9", "#8B7355", "#6B7B5E", "#E8E3DA"],
    colorNames: ["Blanc neige", "Bouleau clair", "Gris pierre", "Chêne", "Mousse", "Brume"],
    materials: [
      { color: "#D4C9B8", label: "Bois clair (chêne / bouleau)", pro: "4 saisons" },
      { color: "#C0C0C0", label: "Aluminium poudré blanc", pro: "Léger & durable" },
      { color: "#F5E6D3", label: "Toile lin / coton outdoor", pro: "Naturel" },
      { color: "#6B7B5E", label: "Polypropylène recyclé", pro: "Éco-responsable" },
    ],
    productCount: 11,
    keywords: ["épuré", "fonctionnel", "4 saisons"],
    gradient: "from-[#D4C9B8] via-[#B4B2A9] to-[#8B7355]",
    accentColor: "#8B7355",
  },
  {
    id: "naturel-organique",
    name: "Naturel & Organique",
    tagline: "La nature comme fil conducteur",
    spaces: ["camping", "restaurant", "all"],
    style: "Naturel",
    palette: ["#8B7355", "#E8DDD3", "#6B7B5E", "#D4C9B8", "#A0856E", "#C8B89A"],
    colorNames: ["Teck naturel", "Lin brut", "Sauge", "Dune", "Argile", "Chanvre"],
    materials: [
      { color: "#8B7355", label: "Teck / acacia FSC", pro: "Certifié durable" },
      { color: "#D4C5A9", label: "Rotin naturel / bambou", pro: "Bio-sourcé" },
      { color: "#F5E6D3", label: "Corde naturelle / chanvre", pro: "Authentique" },
      { color: "#6B7B5E", label: "PP recyclé éco-conçu", pro: "Recyclable" },
    ],
    productCount: 13,
    keywords: ["authentique", "durable", "éco-responsable"],
    gradient: "from-[#8B7355] via-[#6B7B5E] to-[#D4C9B8]",
    accentColor: "#8B7355",
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function GradientVisual({ gradient, name, large = false }: { gradient: string; name: string; large?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-sm ${large ? "aspect-[16/9]" : "aspect-[4/3]"}`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      {/* Grain texture overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")" }} />
      {/* Geometric accent */}
      <div className="absolute bottom-0 right-0 w-1/3 h-1/3 border-t border-l border-white/10 rounded-tl-[40%]" />
      <div className="absolute top-3 left-3">
        <span className="text-white/60 text-[10px] font-display font-medium tracking-widest uppercase">{name}</span>
      </div>
    </div>
  );
}

function ColorSwatches({ palette, colorNames }: { palette: string[]; colorNames: string[] }) {
  return (
    <div className="flex gap-1">
      {palette.map((color, i) => (
        <div
          key={i}
          className="w-5 h-5 rounded-full border border-border/50 cursor-default"
          style={{ backgroundColor: color }}
          title={colorNames[i]}
        />
      ))}
    </div>
  );
}

function MaterialChips({ materials }: { materials: Material[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {materials.map((m, i) => (
        <div key={i} className="flex items-center gap-1.5 text-[10px] font-body text-muted-foreground bg-card rounded-full px-2 py-1 border border-border/50">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
          {m.label}
          {m.pro && (
            <span className="text-[9px] text-foreground/60 font-medium">· {m.pro}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function MoodCard({ board, featured = false, onExplore }: {
  board: Moodboard;
  featured?: boolean;
  onExplore: (board: Moodboard) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="group cursor-pointer bg-background border border-border rounded-sm overflow-hidden hover:border-foreground/30 transition-all"
      onClick={() => onExplore(board)}
    >
      <GradientVisual gradient={board.gradient} name={board.style} />

      <div className="p-4 space-y-3">
        {/* Header */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display font-semibold text-sm text-foreground leading-tight">
              {board.name}
            </h3>
            <span className="text-[10px] text-muted-foreground font-body whitespace-nowrap">
              {board.productCount} produits
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-body mt-0.5">{board.tagline}</p>
        </div>

        {/* Color palette */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-display font-medium text-muted-foreground uppercase tracking-wider">
            Palette
          </span>
          <ColorSwatches palette={board.palette} colorNames={board.colorNames} />
          <p className="text-[10px] text-muted-foreground font-body">
            {board.colorNames.slice(0, 3).join(" · ")}
          </p>
        </div>

        {/* Materials — only on featured */}
        {featured && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-display font-medium text-muted-foreground uppercase tracking-wider">
              Matériaux
            </span>
            <MaterialChips materials={board.materials} />
          </div>
        )}

        {/* Keywords */}
        <div className="flex flex-wrap gap-1">
          {board.keywords.map((k) => (
            <span key={k} className="text-[10px] font-body px-2 py-0.5 rounded-full bg-card text-muted-foreground border border-border/50">
              {k}
            </span>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={(e) => { e.stopPropagation(); onExplore(board); }}
          className="w-full flex items-center justify-between text-[11px] font-display font-semibold text-foreground group-hover:text-foreground transition-colors pt-1 border-t border-border"
        >
          Voir les produits
          <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>
    </motion.div>
  );
}

// Material detail card (shown when a moodboard is selected)
function MoodDetailPanel({ board, onClose }: { board: Moodboard; onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <div id="detail-panel" className="border border-border rounded-sm overflow-hidden bg-background">
      {/* Hero gradient */}
      <div className="relative h-48 md:h-64 overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${board.gradient}`} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")" }} />
        <div className="absolute inset-0 flex items-end justify-between p-6">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-white">{board.name}</h2>
            <p className="text-white/70 font-body text-sm mt-1">{board.tagline}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-xs font-display font-medium border border-white/20 rounded-full px-4 py-1.5 hover:border-white/40 transition-all"
          >
            Fermer
          </button>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8">
        {/* Palette */}
        <div>
          <h3 className="font-display font-semibold text-sm text-foreground mb-4 uppercase tracking-wider">
            Palette couleurs
          </h3>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {board.palette.map((color, i) => (
              <div key={i} className="text-center">
                <div className="w-full aspect-square rounded-sm border border-border/50 mb-1.5" style={{ backgroundColor: color }} />
                <span className="text-[10px] font-display font-medium text-foreground block">{board.colorNames[i]}</span>
                <span className="text-[9px] text-muted-foreground font-body">{color}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Materials */}
        <div>
          <h3 className="font-display font-semibold text-sm text-foreground mb-4 uppercase tracking-wider">
            Matériaux recommandés
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {board.materials.map((m, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-sm border border-border bg-card">
                <div className="w-10 h-10 rounded-full flex-shrink-0 border border-border/50" style={{ backgroundColor: m.color }} />
                <div>
                  <p className="text-xs font-display font-semibold text-foreground">{m.label}</p>
                  {m.pro && <p className="text-[10px] text-muted-foreground font-body">✓ {m.pro}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <h3 className="font-display font-semibold text-sm text-foreground uppercase tracking-wider">
              Mots-clés
            </h3>
            <div className="flex flex-wrap gap-2">
              {board.keywords.map((k) => (
                <span key={k} className="text-xs font-body px-3 py-1 rounded-full bg-card text-muted-foreground border border-border">
                  {k}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Layers className="h-4 w-4" />
                <span className="text-xs font-display font-medium">
                  Produits disponibles
                </span>
              </div>
              <p className="text-2xl font-display font-bold text-foreground">{board.productCount}</p>
              <p className="text-xs text-muted-foreground font-body">
                produits correspondant à ce style
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:w-64">
            <button
              onClick={() => navigate(`/products?style=${board.style.toLowerCase()}`)}
              className="w-full py-3 text-sm font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
            >
              Explorer les produits →
            </button>
            <button
              onClick={() => navigate("/projects/new")}
              className="w-full py-3 text-sm font-display font-semibold border border-foreground text-foreground rounded-full hover:bg-foreground hover:text-primary-foreground transition-all"
            >
              Créer mon projet avec ce style
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const Inspirations = () => {
  const navigate = useNavigate();
  const [activeSpace, setActiveSpace] = useState("all");
  const [activeStyle, setActiveStyle] = useState("Tous les styles");
  const [selectedBoard, setSelectedBoard] = useState<Moodboard | null>(null);

  const filtered = useMemo(() => {
    return MOODBOARDS.filter((b) => {
      const spaceMatch = activeSpace === "all" || b.spaces.includes(activeSpace);
      const styleMatch = activeStyle === "Tous les styles" || b.style === activeStyle;
      return spaceMatch && styleMatch;
    });
  }, [activeSpace, activeStyle]);

  const handleExplore = (board: Moodboard) => {
    setSelectedBoard(prev => prev?.id === board.id ? null : board);
    setTimeout(() => {
      document.getElementById("detail-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const activeSpaceData = SPACES.find(s => s.id === activeSpace);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-20">
        {/* ── Hero ──────────────────────────────────────────── */}
        <section className="py-16 md:py-24 px-6">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-2xl"
            >
              <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground tracking-tight leading-tight">
                Inspirations
              </h1>
              <p className="text-muted-foreground font-body text-base md:text-lg mt-4">
                Trouvez le style de votre espace
              </p>
              <p className="text-muted-foreground/70 font-body text-sm mt-2 max-w-lg">
                Chaque moodboard est une sélection cohérente de produits, couleurs et matériaux — directement lié à notre catalogue.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Space selector ────────────────────────────────── */}
        <section className="px-6 pb-8">
          <div className="container mx-auto">
            <h2 className="text-[10px] font-display font-medium text-muted-foreground uppercase tracking-widest mb-4">
              Par type d'établissement
            </h2>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {SPACES.map((space) => (
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
                    <div className={`absolute inset-0 bg-gradient-to-br ${space.gradient}`} />
                  )}
                  <div className="relative">
                    <p className="text-lg">{space.emoji}</p>
                    <p className="text-xs font-display font-semibold text-foreground mt-1">{space.label}</p>
                    {space.count > 0 && (
                      <p className="text-[10px] text-muted-foreground font-body">{space.count} inspi.</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Style filters ─────────────────────────────────── */}
        <section className="px-6 pb-8">
          <div className="container mx-auto">
            <div className="flex items-end justify-between mb-4">
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">
                  Moodboards
                  {activeSpaceData && activeSpaceData.id !== "all" && (
                    <span className="text-muted-foreground font-normal"> — {activeSpaceData.label}</span>
                  )}
                </h2>
                <p className="text-xs text-muted-foreground font-body mt-0.5">
                  {filtered.length} sélection{filtered.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
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

        {/* ── Detail panel (selected board) ─────────────────── */}
        <section className="px-6 pb-8">
          <div className="container mx-auto">
            <AnimatePresence mode="wait">
              {selectedBoard && (
                <motion.div
                  key={selectedBoard.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <MoodDetailPanel board={selectedBoard} onClose={() => setSelectedBoard(null)} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* ── Moodboard grid ────────────────────────────────── */}
        <section className="px-6 pb-16">
          <div className="container mx-auto">
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-sm text-muted-foreground font-body">
                  Aucun moodboard pour cette combinaison. Essayez un autre filtre.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {filtered.map((board, i) => (
                  <MoodCard key={board.id} board={board} featured={i === 0} onExplore={handleExplore} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── CTA Banner ────────────────────────────────────── */}
        <section className="px-6 pb-24">
          <div className="container mx-auto">
            <div className="relative overflow-hidden rounded-sm border border-border bg-card">
              {/* Decorative gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-accent/30 via-transparent to-transparent" />
              <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-foreground" />
                    <span className="text-[10px] font-display font-medium text-muted-foreground uppercase tracking-widest">
                      Moteur de projet
                    </span>
                  </div>
                  <h3 className="font-display text-xl md:text-2xl font-bold text-foreground">
                    Vous ne trouvez pas votre style ?
                  </h3>
                  <p className="text-sm text-muted-foreground font-body max-w-md">
                    Décrivez votre espace en quelques mots — notre moteur génère 3 concepts sur mesure avec les produits adaptés.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => navigate("/projects/new")}
                    className="px-8 py-3.5 text-sm font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    Lancer mon projet →
                  </button>
                  <button
                    onClick={() => navigate("/products")}
                    className="px-8 py-3.5 text-sm font-display font-semibold border border-border text-muted-foreground rounded-full hover:border-foreground hover:text-foreground transition-all whitespace-nowrap text-center"
                  >
                    Explorer le catalogue
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
