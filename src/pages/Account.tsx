import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, FolderOpen, MessageSquare, Heart,
  Package, BarChart3, Settings, LogOut, Plus,
  TrendingUp, Star, ChevronRight, Percent, Inbox,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFavourites } from "@/contexts/FavouritesContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// ── Types ─────────────────────────────────────────────────────────────────────

type Section =
  | "overview"
  | "projects"
  | "quotes"
  | "favourites"
  | "catalogue"
  | "performance"
  | "settings";

// ── Nav config per profile ────────────────────────────────────────────────────

const NAV_CLIENT = [
  { id: "overview",   icon: LayoutDashboard, labelKey: "account.overview" },
  { id: "projects",   icon: FolderOpen,      labelKey: "account.myProjects" },
  { id: "quotes",     icon: MessageSquare,   labelKey: "account.quoteRequests" },
  { id: "favourites", icon: Heart,           labelKey: "account.favourites" },
  { id: "settings",   icon: Settings,        labelKey: "account.profileSettings" },
];

const NAV_PARTNER = [
  { id: "overview",     icon: LayoutDashboard, labelKey: "account.overview" },
  { id: "quotes",       icon: Inbox,           labelKey: "account.quoteRequests" },
  { id: "catalogue",    icon: Package,         labelKey: "account.catalogue" },
  { id: "performance",  icon: BarChart3,       labelKey: "account.performance" },
  { id: "settings",     icon: Settings,        labelKey: "account.profileSettings" },
];

const NAV_ARCHITECT = [
  { id: "overview",   icon: LayoutDashboard, labelKey: "account.overview" },
  { id: "projects",   icon: FolderOpen,      labelKey: "account.clientProjects" },
  { id: "quotes",     icon: MessageSquare,   labelKey: "account.multiQuotes" },
  { id: "favourites", icon: Heart,           labelKey: "account.favourites" },
  { id: "pro",        icon: Percent,         labelKey: "account.proPricing" },
  { id: "settings",   icon: Settings,        labelKey: "account.profileSettings" },
];

// ── Profile colors ────────────────────────────────────────────────────────────

const PROFILE_CONFIG = {
  client: {
    color: "#D4603A",
    bg: "rgba(212,96,58,0.08)",
    badge: { bg: "#E1F5EE", color: "#085041", label: "Client" },
    emoji: "🍽",
    nav: NAV_CLIENT,
  },
  partner: {
    color: "#1A2456",
    bg: "rgba(26,36,86,0.08)",
    badge: { bg: "#E6F1FB", color: "#185FA5", label: "Partner" },
    emoji: "🏭",
    nav: NAV_PARTNER,
  },
  architect: {
    color: "#6B7B5E",
    bg: "rgba(107,123,94,0.08)",
    badge: { bg: "#F0F4EE", color: "#3A4D35", label: "Architect" },
    emoji: "📐",
    nav: NAV_ARCHITECT,
  },
  admin: {
    color: "#1A1A1A",
    bg: "rgba(0,0,0,0.06)",
    badge: { bg: "#1A1A1A", color: "#FFFFFF", label: "Admin" },
    emoji: "⚙️",
    nav: NAV_CLIENT,
  },
};

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  value, label, trend, trendColor = "var(--muted-foreground)",
}: {
  value: string; label: string; trend?: string; trendColor?: string;
}) {
  return (
    <div className="border border-border rounded-sm p-4">
      <p className="font-display font-bold text-lg text-foreground">{value}</p>
      <p className="text-[10px] font-body text-muted-foreground mt-0.5">{label}</p>
      {trend && (
        <p className="text-[9px] font-body mt-1 flex items-center gap-1" style={{ color: trendColor }}>
          <TrendingUp className="h-3 w-3" />{trend}
        </p>
      )}
    </div>
  );
}

// ── Project row ───────────────────────────────────────────────────────────────

function ProjectRow({
  title, meta, badge, badgeStyle,
}: {
  title: string; meta: string;
  badge: string; badgeStyle: string;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 border border-border rounded-sm hover:border-foreground/20 transition-colors cursor-pointer">
      <div>
        <p className="text-xs font-display font-semibold text-foreground">{title}</p>
        <p className="text-[10px] font-body text-muted-foreground">{meta}</p>
      </div>
      <span className={`text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeStyle}`}>
        {badge}
      </span>
    </div>
  );
}

// ── Favourite mini card ───────────────────────────────────────────────────────

function FavMiniCard({ product, onRemove }: { product: any; onRemove: () => void }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/products/${product.id}`)}
      className="group cursor-pointer"
    >
      <div className="relative aspect-square rounded-sm overflow-hidden border border-border mb-1.5">
        <img
          src={product.image_url || "/placeholder.svg"}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        >
          ×
        </button>
      </div>
      <div>
        <p className="text-[11px] font-display font-semibold text-foreground truncate">{product.name}</p>
        <p className="text-[10px] font-body text-muted-foreground">
          {product.price_min ? `from €${product.price_min}` : "On request"}
        </p>
      </div>
    </div>
  );
}

// ── Section content ───────────────────────────────────────────────────────────

function ClientOverview({ favourites, onToggleFavourite }: { favourites: any[]; onToggleFavourite: (p: any) => void }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard value="2" label="Active projects" />
        <StatCard value="5" label="Quote requests" trend="+2 this month" trendColor="#085041" />
        <StatCard value="€12,400" label="Total estimated" />
        <StatCard value={String(favourites.length)} label="Favourites" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="font-display font-bold text-sm text-foreground">Recent projects</p>
          <button className="text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            View all <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div className="space-y-2">
          <ProjectRow title="Rooftop Bar — Paris 11" meta="24 products · Updated 2d ago" badge="In progress" badgeStyle="bg-amber-50 text-amber-700" />
          <ProjectRow title="Hotel Lobby — Lyon" meta="12 products · Updated 1w ago" badge="Quoted" badgeStyle="bg-green-50 text-green-700" />
          <ProjectRow title="Beach Club — Marseille" meta="36 products · Updated 3w ago" badge="Draft" badgeStyle="bg-muted text-muted-foreground" />
        </div>
      </div>

      {favourites.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="font-display font-bold text-sm text-foreground">Favourites</p>
            <span className="text-[10px] font-body text-muted-foreground">{favourites.length} saved</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {favourites.slice(0, 6).map((p) => (
              <FavMiniCard key={p.id} product={p} onRemove={() => onToggleFavourite(p)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PartnerOverview() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard value="7" label="Pending requests" trend="+3 this week" trendColor="#185FA5" />
        <StatCard value="23" label="Products listed" />
        <StatCard value="€8,200" label="Revenue this month" trend="+12%" trendColor="#085041" />
        <StatCard value="4.8" label="Avg. rating" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="font-display font-bold text-sm text-foreground flex items-center gap-2">
            <Inbox className="h-4 w-4 text-muted-foreground" />
            Incoming requests
          </p>
          <span className="text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
            7 pending
          </span>
        </div>
        <div className="space-y-2">
          <ProjectRow title="Quote — 40× Riviera Chair" meta="Hotel Le Grand, Paris · 2h ago" badge="New" badgeStyle="bg-blue-50 text-blue-700" />
          <ProjectRow title="Quote — 12× Parasol XL" meta="Beach Club Cala, Nice · 1d ago" badge="New" badgeStyle="bg-blue-50 text-blue-700" />
          <ProjectRow title="Quote — 8× Table ronde 80cm" meta="Brasserie du Port, Marseille · 3d ago" badge="Pending" badgeStyle="bg-amber-50 text-amber-700" />
        </div>
      </div>

      <div>
        <p className="font-display font-bold text-sm text-foreground mb-3">Top products this month</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between px-3 py-2 border border-border rounded-sm">
            <div className="flex items-center gap-2">
              <Star className="h-3.5 w-3.5 text-amber-500" />
              <p className="text-xs font-display font-semibold text-foreground">Riviera Chair</p>
            </div>
            <p className="text-[10px] font-body text-muted-foreground">142 views · 12 quotes</p>
          </div>
          <div className="flex items-center justify-between px-3 py-2 border border-border rounded-sm">
            <div className="flex items-center gap-2">
              <Star className="h-3.5 w-3.5 text-amber-500" />
              <p className="text-xs font-display font-semibold text-foreground">Parasol XL</p>
            </div>
            <p className="text-[10px] font-body text-muted-foreground">98 views · 8 quotes</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArchitectOverview({ favourites, onToggleFavourite }: { favourites: any[]; onToggleFavourite: (p: any) => void }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard value="6" label="Client projects" />
        <StatCard value="14" label="Multi-quotes sent" trend="+4 this month" trendColor="#3A4D35" />
        <StatCard value="€45,200" label="Total sourced" />
        <StatCard value={String(favourites.length)} label="Favourites" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="font-display font-bold text-sm text-foreground">Client projects</p>
          <button className="text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <Plus className="h-3 w-3" /> New project
          </button>
        </div>
        <div className="space-y-2">
          <ProjectRow title="Restaurant Le Comptoir — Paris" meta="3 zones · 48 products" badge="Active" badgeStyle="bg-green-50 text-green-700" />
          <ProjectRow title="Boutique Hotel — Bordeaux" meta="2 zones · 24 products" badge="Quoting" badgeStyle="bg-amber-50 text-amber-700" />
          <ProjectRow title="Rooftop Lounge — Lyon" meta="1 zone · 16 products" badge="Draft" badgeStyle="bg-muted text-muted-foreground" />
        </div>
      </div>

      {favourites.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="font-display font-bold text-sm text-foreground">Favourites</p>
            <span className="text-[10px] font-body text-muted-foreground">{favourites.length} saved · Pro pricing applies</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {favourites.slice(0, 6).map((p) => (
              <FavMiniCard key={p.id} product={p} onRemove={() => onToggleFavourite(p)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FavouritesSection({ favourites, onToggle }: { favourites: any[]; onToggle: (p: any) => void }) {
  const navigate = useNavigate();
  if (favourites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Heart className="h-8 w-8 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-body text-muted-foreground mb-2">No favourites yet.</p>
        <button
          onClick={() => navigate("/products")}
          className="text-sm font-display font-semibold text-foreground hover:underline"
        >
          Browse catalogue →
        </button>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="font-display font-bold text-sm text-foreground">
          Favourites — {favourites.length} products
        </p>
        <button
          onClick={() => navigate("/products")}
          className="text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          Add more <Plus className="h-3 w-3" />
        </button>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {favourites.map((p) => (
          <FavMiniCard key={p.id} product={p} onRemove={() => onToggle(p)} />
        ))}
      </div>
    </div>
  );
}

function SettingsSection({ profile }: { profile: any }) {
  return (
    <div>
      <p className="font-display font-bold text-sm text-foreground mb-4">Profile information</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Email",        value: profile.email },
          { label: "First name",   value: profile.first_name },
          { label: "Last name",    value: profile.last_name },
          { label: "Company",      value: profile.company },
          { label: "SIREN",        value: profile.siren },
          { label: "Phone",        value: profile.phone },
          { label: "Country",      value: profile.country },
          { label: "Account type", value: profile.user_type },
        ].filter(({ value }) => value).map(({ label, value }) => (
          <div key={label}>
            <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="text-sm font-body text-foreground mt-0.5">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Account component ────────────────────────────────────────────────────

const Account = () => {
  const { t } = useTranslation();
  const { profile, isLoading, signOut } = useAuth();
  const { favourites, toggleFavourite } = useFavourites();
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>("overview");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    navigate("/auth");
    return null;
  }

  const userType = profile.user_type as keyof typeof PROFILE_CONFIG;
  const config = PROFILE_CONFIG[userType] ?? PROFILE_CONFIG.client;
  const nav = config.nav;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const renderSection = () => {
    if (section === "settings") return <SettingsSection profile={profile} />;
    if (section === "favourites") return <FavouritesSection favourites={favourites} onToggle={toggleFavourite} />;

    switch (userType) {
      case "partner":
        return <PartnerOverview />;
      case "architect":
        return <ArchitectOverview favourites={favourites} onToggleFavourite={toggleFavourite} />;
      default:
        return <ClientOverview favourites={favourites} onToggleFavourite={toggleFavourite} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="pt-24 pb-16 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="flex gap-8">
            {/* ── Sidebar ────────────────────────────────────────────── */}
            <div className="hidden md:flex flex-col w-56 flex-shrink-0">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="sticky top-28"
              >
                {/* Profile header */}
                <div className="mb-6">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg mb-2"
                    style={{ background: config.bg }}
                  >
                    {config.emoji}
                  </div>
                  <p className="font-display font-bold text-sm text-foreground">
                    {profile.first_name
                      ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name[0]}.` : ""}`
                      : profile.email}
                  </p>
                  {profile.company && (
                    <p className="text-[10px] font-body text-muted-foreground">{profile.company}</p>
                  )}
                  <span
                    className="inline-block text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1.5"
                    style={{ background: config.badge.bg, color: config.badge.color }}
                  >
                    {config.badge.label}
                  </span>
                </div>

                {/* Nav items */}
                <nav className="space-y-0.5 mb-4">
                  {nav.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSection(item.id as Section)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-sm text-left text-xs font-body transition-colors ${
                        section === item.id
                          ? "bg-card text-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-card"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {t(item.labelKey)}
                      {item.id === "favourites" && favourites.length > 0 && (
                        <span className="ml-auto text-[9px] font-display font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                          {favourites.length}
                        </span>
                      )}
                      {item.id === "quotes" && userType === "partner" && (
                        <span className="ml-auto text-[9px] font-display font-semibold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full">7</span>
                      )}
                    </button>
                  ))}
                </nav>

                {/* Divider + sign out */}
                <div className="border-t border-border pt-3">
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 text-xs font-body text-muted-foreground hover:text-foreground transition-colors px-3"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    {t('account.signOut')}
                  </button>
                </div>
              </motion.div>

              {/* Quick actions */}
              <div className="mt-6 space-y-2">
                <button
                  onClick={() => navigate("/projects/new")}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
                >
                  <Plus className="h-3.5 w-3.5" /> New project
                </button>
                <button
                  onClick={() => navigate("/products")}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-body text-muted-foreground border border-border rounded-full hover:border-foreground hover:text-foreground transition-all"
                >
                  Browse catalogue
                </button>
              </div>
            </div>

            {/* ── Main content ────────────────────────────────────────── */}
            <div className="flex-1 min-w-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={section}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderSection()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Account;
