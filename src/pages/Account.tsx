import { useState, useEffect } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, FolderOpen, MessageSquare, Heart,
  Package, BarChart3, Settings, LogOut, Plus,
  TrendingUp, Star, ChevronRight, Percent, Inbox,
  AlertTriangle, Rocket, Briefcase, Award, Megaphone,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFavourites } from "@/contexts/FavouritesContext";
import { useConversations } from "@/hooks/useConversations";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  PlanBadge, PLAN_CONFIG,
  PartnerOverview as PartnerOverviewNew,
  PartnerQuotesSection,
  PartnerCatalogueSection,
  PartnerPerformanceSection,
  PartnerMessagesSection,
  PartnerFeaturedSection,
  PartnerProLeadsSection,
  type PartnerPlan,
  type PartnerSectionSetter,
} from "@/components/partner-dashboard/PartnerSections";
import {
  TierBadge, TIER_CONFIG,
  ArchitectOverview,
  ArchitectProjectsSection,
  ArchitectProjectDetail,
  ArchitectCreateProject,
  ArchitectQuotesSection,
  ArchitectCallsSection,
  ArchitectMessagesSection,
  ArchitectRewardsSection,
  type ArchitectTier,
  type ArchitectSectionSetter,
} from "@/components/architect-dashboard/ArchitectSections";
import {
  ClientOverview as ClientOverviewNew,
  ClientProjectsSection,
  ClientProjectDetail,
  ClientQuotesSection,
  ClientMessagesSection,
  ClientFavouritesSection,
  ClientSettingsSection,
  type ClientSectionSetter,
} from "@/components/client-dashboard/ClientSections";

// ── Types ─────────────────────────────────────────────────────────────────────

type Section =
  | "overview"
  | "projects"
  | "quotes"
  | "messages"
  | "favourites"
  | "catalogue"
  | "featured"
  | "proleads"
  | "performance"
  | "rewards"
  | "calls"
  | "settings"
  | (string & {}); // allows dynamic sections like "project-detail:id"

// ── Nav config per profile ────────────────────────────────────────────────────

const NAV_CLIENT = [
  { id: "overview",   icon: LayoutDashboard, labelKey: "account.overview" },
  { id: "projects",   icon: FolderOpen,      labelKey: "account.myProjects" },
  { id: "quotes",     icon: Inbox,           labelKey: "account.quoteRequests" },
  { id: "messages",   icon: MessageSquare,   labelKey: "account.messages" },
  { id: "favourites", icon: Heart,           labelKey: "account.favourites" },
  { id: "settings",   icon: Settings,        labelKey: "account.profileSettings" },
];

const NAV_PARTNER_BASE = [
  { id: "overview",     icon: LayoutDashboard, labelKey: "account.overview" },
  { id: "quotes",       icon: Inbox,           labelKey: "account.quoteRequests" },
  { id: "messages",     icon: MessageSquare,   labelKey: "account.messages" },
  { id: "catalogue",    icon: Package,         labelKey: "account.catalogue" },
  { id: "featured",     icon: Rocket,          labelKey: "account.featuredProducts", eliteOnly: false },
  { id: "proleads",     icon: Briefcase,       labelKey: "account.proLeads", eliteOnly: true },
  { id: "performance",  icon: BarChart3,       labelKey: "account.performance" },
  { id: "settings",     icon: Settings,        labelKey: "account.profileSettings" },
];

const getPartnerNav = (plan: PartnerPlan) =>
  NAV_PARTNER_BASE.filter(item => !item.eliteOnly || plan === "elite");

const NAV_ARCHITECT = [
  { id: "overview",   icon: LayoutDashboard, labelKey: "account.overview" },
  { id: "projects",   icon: FolderOpen,      labelKey: "account.clientProjects" },
  { id: "quotes",     icon: MessageSquare,   labelKey: "account.multiQuotes" },
  { id: "calls",      icon: Megaphone,       labelKey: "account.supplierCalls" },
  { id: "messages",   icon: MessageSquare,   labelKey: "account.messages" },
  { id: "rewards",    icon: Award,           labelKey: "account.rewards" },
  { id: "favourites", icon: Heart,           labelKey: "account.favourites" },
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
    nav: NAV_PARTNER_BASE, // overridden dynamically in component
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

// PartnerOverview is now imported from PartnerSections

// ArchitectOverview moved to @/components/architect-dashboard/ArchitectSections

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
  const { totalUnread } = useConversations();
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>("overview");

  // Partner plan — default to "elite" for demo (would come from partner_subscriptions)
  const partnerPlan: PartnerPlan = "elite";
  // Architect tier — default to "atelier" for demo (would come from architect_rewards)
  const architectTier: ArchitectTier = "atelier";
  // Architect created projects (local state — would come from Supabase in prod)
  const [createdProjects, setCreatedProjects] = useState<any[]>([]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/auth" replace />;
  }

  const userType = profile.user_type as keyof typeof PROFILE_CONFIG;
  const config = PROFILE_CONFIG[userType] ?? PROFILE_CONFIG.client;
  const nav = userType === "partner" ? getPartnerNav(partnerPlan) : config.nav;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const renderSection = () => {
    // Partner-specific sections
    const handlePartnerNav: PartnerSectionSetter = (s) => setSection(s as Section);
    if (userType === "partner") {
      if (section === "settings") return <SettingsSection profile={profile} />;
      if (section === "favourites") return <FavouritesSection favourites={favourites} onToggle={toggleFavourite} />;
      switch (section) {
        case "overview":    return <PartnerOverviewNew plan={partnerPlan} onNavigate={handlePartnerNav} />;
        case "quotes":      return <PartnerQuotesSection plan={partnerPlan} />;
        case "messages":    return <PartnerMessagesSection />;
        case "catalogue":   return <PartnerCatalogueSection plan={partnerPlan} />;
        case "featured":    return <PartnerFeaturedSection plan={partnerPlan} />;
        case "proleads":    return <PartnerProLeadsSection plan={partnerPlan} />;
        case "performance": return <PartnerPerformanceSection plan={partnerPlan} />;
        default:            return <PartnerOverviewNew plan={partnerPlan} onNavigate={handlePartnerNav} />;
      }
    }

    // Architect-specific sections
    if (userType === "architect") {
      if (section === "settings") return <SettingsSection profile={profile} />;
      if (section === "favourites") return <FavouritesSection favourites={favourites} onToggle={toggleFavourite} />;
      const handleArchitectNav: ArchitectSectionSetter = (s) => setSection(s as Section);

      // Handle project-detail:id pattern from overview clicks
      if (section.startsWith("project-detail:")) {
        const projectId = (section as string).replace("project-detail:", "");
        return <ArchitectProjectDetail projectId={projectId} onBack={() => setSection("projects")} extraProjects={createdProjects} />;
      }

      // Handle create project
      if (section === "create-project") {
        return <ArchitectCreateProject onBack={() => setSection("projects")} onCreated={(project) => {
          setCreatedProjects(prev => [project, ...prev]);
          setSection("projects");
        }} />;
      }

      switch (section) {
        case "overview":   return <ArchitectOverview tier={architectTier} onNavigate={handleArchitectNav} favourites={favourites} onToggleFavourite={toggleFavourite} />;
        case "projects":   return <ArchitectProjectsSection tier={architectTier} onNavigate={handleArchitectNav} extraProjects={createdProjects} />;
        case "quotes":     return <ArchitectQuotesSection tier={architectTier} />;
        case "calls":      return <ArchitectCallsSection tier={architectTier} />;
        case "messages":   return <ArchitectMessagesSection />;
        case "rewards":    return <ArchitectRewardsSection tier={architectTier} />;
        default:           return <ArchitectOverview tier={architectTier} onNavigate={handleArchitectNav} favourites={favourites} onToggleFavourite={toggleFavourite} />;
      }
    }

    // Client-specific sections (default)
    const handleClientNav: ClientSectionSetter = (s) => setSection(s as Section);

    // Handle project-detail:id pattern
    if (section.startsWith("project-detail:")) {
      const projectId = (section as string).replace("project-detail:", "");
      return <ClientProjectDetail projectId={projectId} onBack={() => setSection("projects")} />;
    }

    switch (section) {
      case "overview":    return <ClientOverviewNew onNavigate={handleClientNav} favourites={favourites} onToggleFavourite={toggleFavourite} />;
      case "projects":    return <ClientProjectsSection onNavigate={handleClientNav} />;
      case "quotes":      return <ClientQuotesSection onNavigate={handleClientNav} />;
      case "messages":    return <ClientMessagesSection />;
      case "favourites":  return <ClientFavouritesSection favourites={favourites} onToggle={toggleFavourite} />;
      case "settings":    return <ClientSettingsSection profile={profile} />;
      default:            return <ClientOverviewNew onNavigate={handleClientNav} favourites={favourites} onToggleFavourite={toggleFavourite} />;
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
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span
                      className="inline-block text-[9px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ background: config.badge.bg, color: config.badge.color }}
                    >
                      {config.badge.label}
                    </span>
                    {userType === "partner" && (
                      <PlanBadge plan={partnerPlan} />
                    )}
                    {userType === "architect" && (
                      <TierBadge tier={architectTier} />
                    )}
                  </div>
                  {/* Commission reminder for partners */}
                  {userType === "partner" && (
                    <div
                      className="flex items-center gap-1.5 mt-2.5 px-2.5 py-1.5 rounded-sm border text-[9px] font-body"
                      style={{
                        background: PLAN_CONFIG[partnerPlan].bg,
                        borderColor: PLAN_CONFIG[partnerPlan].border,
                        color: PLAN_CONFIG[partnerPlan].color,
                      }}
                    >
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      <span>Commission : <strong>{PLAN_CONFIG[partnerPlan].commission}%</strong></span>
                    </div>
                  )}
                  {/* Discount reminder for architects */}
                  {userType === "architect" && (
                    <div
                      className="flex items-center gap-1.5 mt-2.5 px-2.5 py-1.5 rounded-sm border text-[9px] font-body cursor-pointer"
                      style={{
                        background: TIER_CONFIG[architectTier].bg,
                        borderColor: TIER_CONFIG[architectTier].border,
                        color: TIER_CONFIG[architectTier].color,
                      }}
                      onClick={() => setSection("rewards")}
                    >
                      <Award className="h-3 w-3 shrink-0" />
                      <span>2 350 pts · <strong>{TIER_CONFIG[architectTier].label}</strong></span>
                    </div>
                  )}
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
                      {item.id === "messages" && totalUnread > 0 && (
                        <span className="ml-auto text-[9px] font-display font-bold bg-foreground text-primary-foreground px-1.5 py-0.5 rounded-full">
                          {totalUnread}
                        </span>
                      )}
                      {item.id === "proleads" && (
                        <span className="ml-auto text-[9px] font-display font-semibold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full">New</span>
                      )}
                      {item.id === "featured" && (
                        <span className="ml-auto text-[9px] font-display font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                          {partnerPlan === "elite" ? "10" : partnerPlan === "growth" ? "2" : "0"}
                        </span>
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
                {userType === "architect" ? (
                  <>
                    <button
                      onClick={() => setSection("create-project" as Section)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
                    >
                      <Plus className="h-3.5 w-3.5" /> {t('account.newProject')}
                    </button>
                    <button
                      onClick={() => setSection("calls")}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-body text-muted-foreground border border-border rounded-full hover:border-foreground hover:text-foreground transition-all"
                    >
                      <Megaphone className="h-3.5 w-3.5" /> {t('account.newSupplierCall')}
                    </button>
                    <button
                      onClick={() => navigate("/products")}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-body text-muted-foreground border border-border rounded-full hover:border-foreground hover:text-foreground transition-all"
                    >
                      {t('account.browseCatalogue')}
                    </button>
                  </>
                ) : userType === "partner" ? (
                  <>
                    <button
                      onClick={() => setSection("catalogue")}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
                    >
                      <Plus className="h-3.5 w-3.5" /> {t('pd.catalogue.add')}
                    </button>
                    <button
                      onClick={() => setSection("messages")}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-body text-muted-foreground border border-border rounded-full hover:border-foreground hover:text-foreground transition-all"
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> {t('pd.msg.title')}
                      {totalUnread > 0 && (
                        <span className="text-[9px] font-display font-bold bg-foreground text-primary-foreground px-1.5 py-0.5 rounded-full">
                          {totalUnread}
                        </span>
                      )}
                    </button>
                    {partnerPlan !== "elite" && (
                      <button
                        onClick={() => navigate("/become-partner")}
                        className="w-full text-center py-2 text-[9px] font-display font-semibold rounded-full border hover:opacity-80 transition-opacity"
                        style={{
                          background: PLAN_CONFIG[partnerPlan === "starter" ? "growth" : "elite"].bg,
                          color: PLAN_CONFIG[partnerPlan === "starter" ? "growth" : "elite"].color,
                          borderColor: PLAN_CONFIG[partnerPlan === "starter" ? "growth" : "elite"].border,
                        }}
                      >
                        Passer au plan {partnerPlan === "starter" ? "Growth" : "Elite"} →
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => navigate("/projects/new")}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
                    >
                      <Plus className="h-3.5 w-3.5" /> {t('account.newProject')}
                    </button>
                    <button
                      onClick={() => navigate("/products")}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-body text-muted-foreground border border-border rounded-full hover:border-foreground hover:text-foreground transition-all"
                    >
                      {t('account.browseCatalogue')}
                    </button>
                    <button
                      onClick={() => navigate("/pro-service")}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-body text-muted-foreground border border-border rounded-full hover:border-foreground hover:text-foreground transition-all"
                    >
                      {t('cd.quickActions.talkExpert')}
                    </button>
                  </>
                )}
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
