import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogOut, FileText, Package, Layers, Settings, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Account = () => {
  const { profile, isLoading, signOut } = useAuth();
  const navigate = useNavigate();

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!profile) { navigate("/login"); return null; }

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const DASHBOARDS: Record<string, { icon: typeof FileText; title: string; desc: string; href: string }[]> = {
    client: [
      { icon: FileText, title: "My quote requests",  desc: "Track your pending and confirmed quotes", href: "/project-cart" },
      { icon: Layers,   title: "My projects",        desc: "Saved project selections", href: "/project-cart" },
      { icon: Package,  title: "My favourites",      desc: "Products you selected", href: "/products" },
    ],
    partner: [
      { icon: FileText, title: "Received quotes",    desc: "Client quote requests to process", href: "#" },
      { icon: Package,  title: "My catalogue",       desc: "Manage your products and offers", href: "#" },
      { icon: Layers,   title: "Active orders",      desc: "Track your ongoing orders", href: "#" },
    ],
    architect: [
      { icon: Layers,   title: "Client projects",    desc: "Manage your clients' projects", href: "#" },
      { icon: FileText, title: "Multi-project quotes", desc: "Centralise your quote requests", href: "#" },
      { icon: Package,  title: "Pro pricing",        desc: "Access negotiated rates", href: "#" },
    ],
    admin: [
      { icon: Settings, title: "Admin panel",        desc: "Manage products, partners and orders", href: "/admin" },
      { icon: FileText, title: "All quote requests", desc: "View and manage all quotes", href: "/admin" },
    ],
  };

  const SPACE_LABELS: Record<string, string> = {
    client:    "Client space",
    partner:   "Partner space",
    architect: "Architect space",
    admin:     "Admin space",
  };

  const items = DASHBOARDS[profile.user_type] ?? DASHBOARDS.client;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="pt-28 pb-16 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="container mx-auto max-w-3xl"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-10">
            <div>
              <p className="text-[9px] font-display font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-2">
                {SPACE_LABELS[profile.user_type]}
              </p>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                Hello, {profile.first_name || profile.email}
              </h1>
              {profile.company && (
                <p className="text-sm font-body text-muted-foreground mt-1">{profile.company}</p>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-xs font-body text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>

          {/* Dashboard cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
            {items.map(({ icon: Icon, title, desc, href }) => (
              <div
                key={title}
                onClick={() => href !== "#" && navigate(href)}
                className={`flex flex-col items-start gap-3 border border-border rounded-sm p-5 text-left transition-colors group ${
                  href !== "#"
                    ? "hover:border-foreground cursor-pointer"
                    : "opacity-60 cursor-not-allowed"
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center">
                  <Icon className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <p className="font-display font-bold text-sm text-foreground">{title}</p>
                  <p className="text-[11px] font-body text-muted-foreground mt-0.5">{desc}</p>
                  {href === "#" && (
                    <p className="text-[9px] font-body text-muted-foreground/50 mt-1">Coming soon</p>
                  )}
                </div>
                {href !== "#" && (
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors mt-auto" />
                )}
              </div>
            ))}
          </div>

          {/* Profile info */}
          <div className="border border-border rounded-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <p className="font-display font-bold text-sm text-foreground">My profile</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: "Email",   value: profile.email },
                { label: "Company", value: profile.company },
                { label: "SIREN",   value: profile.siren },
                { label: "Phone",   value: profile.phone },
                { label: "Country", value: profile.country },
                { label: "Account type", value: profile.user_type },
              ].filter(({ value }) => value).map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                  <p className="text-sm font-body text-foreground mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default Account;
