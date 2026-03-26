import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { FolderOpen, User, Menu, X, ChevronDown, LogOut, Settings, Plus } from "lucide-react";
import { useProjectCart } from "@/contexts/ProjectCartContext";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import NotificationBell from "@/components/NotificationBell";

const LANGS = [
  { code: "en", flag: "🇬🇧" },
  { code: "fr", flag: "🇫🇷" },
  { code: "es", flag: "🇪🇸" },
  { code: "it", flag: "🇮🇹" },
];

const CATEGORIES = [
  {
    labelKey: "categories.chairs",
    href: "/products?category=chairs",
    subcategories: [
      { labelKey: "categories.sub.bistrot", href: "/products?category=chairs&sub=bistrot" },
      { labelKey: "categories.sub.stackableChairs", href: "/products?category=chairs&sub=stackable" },
      { labelKey: "categories.sub.fourLegChairs", href: "/products?category=chairs&sub=4-leg" },
      { labelKey: "categories.sub.foldingChairs", href: "/products?category=chairs&sub=folding" },
    ],
  },
  {
    labelKey: "categories.armchairs",
    href: "/products?category=armchairs",
    subcategories: [
      { labelKey: "categories.sub.ropeArmchairs", href: "/products?category=armchairs&sub=rope" },
      { labelKey: "categories.sub.teakArmchairs", href: "/products?category=armchairs&sub=teak" },
      { labelKey: "categories.sub.loungeArmchairs", href: "/products?category=armchairs&sub=lounge" },
    ],
  },
  {
    labelKey: "categories.tables",
    href: "/products?category=tables",
    subcategories: [
      { labelKey: "categories.sub.diningTables", href: "/products?category=tables&sub=dining" },
      { labelKey: "categories.sub.coffeeTables", href: "/products?category=tables&sub=coffee" },
      { labelKey: "categories.sub.highTables", href: "/products?category=tables&sub=high" },
      { labelKey: "categories.sub.foldingTables", href: "/products?category=tables&sub=folding" },
      { labelKey: "categories.sub.tableBases", href: "/products?category=tables&sub=base" },
    ],
  },
  {
    labelKey: "categories.parasols",
    href: "/products?category=parasols",
    subcategories: [
      { labelKey: "categories.sub.centrePole", href: "/products?category=parasols&sub=centre-pole" },
      { labelKey: "categories.sub.cantilever", href: "/products?category=parasols&sub=cantilever" },
      { labelKey: "categories.sub.wallMounted", href: "/products?category=parasols&sub=wall" },
      { labelKey: "categories.sub.giantParasols", href: "/products?category=parasols&sub=giant" },
    ],
  },
  {
    labelKey: "categories.sunLoungers",
    href: "/products?category=sun-loungers",
    subcategories: [
      { labelKey: "categories.sub.poolLoungers", href: "/products?category=sun-loungers&sub=pool" },
      { labelKey: "categories.sub.beachLoungers", href: "/products?category=sun-loungers&sub=beach" },
      { labelKey: "categories.sub.daybeds", href: "/products?category=sun-loungers&sub=daybed" },
    ],
  },
  {
    labelKey: "categories.sofas",
    href: "/products?category=sofas",
    subcategories: [
      { labelKey: "categories.sub.twoSeaterSofas", href: "/products?category=sofas&sub=2-seater" },
      { labelKey: "categories.sub.threeSeaterSofas", href: "/products?category=sofas&sub=3-seater" },
      { labelKey: "categories.sub.modularSofas", href: "/products?category=sofas&sub=modular" },
    ],
  },
  {
    labelKey: "categories.barStools",
    href: "/products?category=bar-stools",
    subcategories: [
      { labelKey: "categories.sub.withFootrest", href: "/products?category=bar-stools&sub=footrest" },
      { labelKey: "categories.sub.adjustableHeight", href: "/products?category=bar-stools&sub=adjustable" },
      { labelKey: "categories.sub.stackableStools", href: "/products?category=bar-stools&sub=stackable" },
    ],
  },
  {
    labelKey: "categories.accessories",
    href: "/products?category=accessories",
    subcategories: [
      { labelKey: "categories.sub.cushions", href: "/products?category=accessories&sub=cushions" },
      { labelKey: "categories.sub.planters", href: "/products?category=accessories&sub=planters" },
      { labelKey: "categories.sub.coversProtection", href: "/products?category=accessories&sub=covers" },
      { labelKey: "categories.sub.parasolBases", href: "/products?category=accessories&sub=bases" },
    ],
  },
];

const NAV_LINKS = [
  { labelKey: "nav.explore", href: "/" },
  { labelKey: "nav.products", href: "/products" },
  { labelKey: "nav.inspirations", href: "/inspirations" },
  { labelKey: "nav.collections", href: "/collections" },
  { labelKey: "nav.guide", href: "/resources" },
  { labelKey: "nav.partners", href: "/partners" },
  { labelKey: "nav.proService", href: "/pro-service" },
];

const Header = () => {
  const { t, i18n } = useTranslation();
  const { itemCount } = useProjectCart();
  const { user, signOut } = useAuth();
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ left: 0, top: 0 });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileAccordion, setMobileAccordion] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const closeMobile = () => {
    setMobileOpen(false);
    setMobileAccordion(null);
  };

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md"
      >
        <div className="container mx-auto flex items-center justify-between py-5 px-6">
          <Link to="/" className="font-display text-xl font-bold tracking-tight text-foreground">
            TERRASSEA <span className="text-terracotta">HUB</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.labelKey}
                to={link.href}
                className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors"
              >
                {t(link.labelKey)}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {/* Language selector — dropdown */}
            <div className="hidden md:block relative">
              <select
                value={i18n.language.split("-")[0]}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className="appearance-none text-[11px] font-display font-semibold bg-transparent border border-border rounded-full pl-3 pr-7 py-1.5 text-foreground cursor-pointer hover:border-foreground/40 transition-colors focus:outline-none"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}
              >
                {LANGS.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.code.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <NotificationBell />

            {/* User menu — combines Mon projet, Mon compte, Lancer un projet */}
            <div className="hidden sm:block relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="relative flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground transition-colors"
              >
                <User className="h-5 w-5" />
                {itemCount > 0 ? (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-[#D4603A] text-white text-[9px] flex items-center justify-center font-display font-bold">
                    {itemCount}
                  </span>
                ) : null}
              </button>

              <AnimatePresence>
                {userMenuOpen ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-background border border-border rounded-xl shadow-lg overflow-hidden z-50"
                  >
                    <div className="py-1.5">
                      <Link
                        to="/project-cart"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-body text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        {t("nav.myProject")}
                        {itemCount > 0 ? (
                          <span className="ml-auto text-[10px] font-display font-bold bg-[#D4603A] text-white rounded-full px-1.5 py-0.5">
                            {itemCount}
                          </span>
                        ) : null}
                      </Link>
                      <Link
                        to="/account"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-body text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        {t("nav.myAccount")}
                      </Link>
                      <div className="border-t border-border my-1" />
                      <Link
                        to="/projects/new"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-display font-semibold text-[#D4603A] hover:bg-muted/50 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        {t("nav.launchProject")}
                      </Link>
                      {user ? (
                        <>
                          <div className="border-t border-border my-1" />
                          <button
                            onClick={() => { setUserMenuOpen(false); signOut(); }}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm font-body text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors w-full text-left"
                          >
                            <LogOut className="h-4 w-4" />
                            {t("nav.signOut", "Se d\u00e9connecter")}
                          </button>
                        </>
                      ) : null}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            {/* Mobile: simple icon for project cart */}
            <Link
              to="/project-cart"
              className="sm:hidden relative flex items-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <FolderOpen className="h-5 w-5" />
              {itemCount > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-[#D4603A] text-white text-[9px] flex items-center justify-center font-display font-bold">
                  {itemCount}
                </span>
              ) : null}
            </Link>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-1.5 text-foreground"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Desktop category nav bar */}
        <div className="hidden md:block bg-[#2C2C2A] border-t border-white/5 relative z-40">
          <div className="container mx-auto px-6 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-7 py-2.5 min-w-max">
              <Link
                to="/products"
                className="text-[11px] font-display font-semibold text-white/60 hover:text-white transition-colors whitespace-nowrap"
                onMouseEnter={() => setOpenCat(null)}
              >
                {t("categories.all")}
              </Link>

              {CATEGORIES.map((cat) => {
                const label = t(cat.labelKey);
                return (
                  <div
                    key={cat.labelKey}
                    className="relative"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setDropdownPos({ left: rect.left, top: rect.bottom });
                      setOpenCat(cat.labelKey);
                    }}
                    onMouseLeave={() => setOpenCat(null)}
                  >
                    <Link
                      to={cat.href}
                      className={`text-[11px] font-display font-semibold whitespace-nowrap py-2.5 border-b-2 transition-all block ${
                        openCat === cat.labelKey
                          ? "text-white border-terracotta"
                          : "text-white/60 hover:text-white border-transparent hover:border-terracotta"
                      }`}
                    >
                      {label}
                    </Link>
                  </div>
                );
              })}

              <div className="w-px h-4 bg-white/10 mx-1" />
              <span className="text-[11px] font-display font-semibold text-white/25 cursor-default whitespace-nowrap">
                {t("categories.indoorSoon")}
              </span>
            </div>
          </div>
        </div>

        {/* Desktop dropdown */}
        {openCat && (
          <div
            className="hidden md:block fixed bg-[#2C2C2A] border border-white/10 rounded-xl shadow-lg py-3 min-w-[200px] z-[45]"
            style={{ left: dropdownPos.left, top: dropdownPos.top }}
            onMouseEnter={() => setOpenCat(openCat)}
            onMouseLeave={() => setOpenCat(null)}
          >
            <p className="text-[9px] font-display font-bold uppercase tracking-widest text-white/40 px-4 mb-2">
              {t(openCat)}
            </p>
            {CATEGORIES.find((c) => c.labelKey === openCat)?.subcategories.map((sub) => (
              <Link
                key={sub.labelKey}
                to={sub.href}
                onClick={() => setOpenCat(null)}
                className="block px-4 py-2 text-sm font-body text-white/60 hover:bg-white/5 hover:text-terracotta transition-colors"
              >
                {t(sub.labelKey)}
              </Link>
            ))}
            <Link
              to={CATEGORIES.find((c) => c.labelKey === openCat)?.href || "/products"}
              onClick={() => setOpenCat(null)}
              className="block px-4 py-2 text-sm font-body text-white/60 hover:bg-white/5 hover:text-terracotta transition-colors"
            >
              {t("common.seeAll")}
            </Link>
          </div>
        )}
      </motion.header>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 md:hidden"
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40" onClick={closeMobile} />

            {/* Panel */}
            <motion.nav
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="absolute right-0 top-0 bottom-0 w-[85%] max-w-sm bg-background shadow-xl overflow-y-auto"
            >
              {/* Close header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                <span className="font-display text-lg font-bold text-foreground">Menu</span>
                <button onClick={closeMobile} className="p-1 text-muted-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Language selector mobile */}
              <div className="flex items-center gap-1 px-6 py-3 border-b border-border">
                {LANGS.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => i18n.changeLanguage(lang.code)}
                    className={`text-sm px-2 py-1 rounded-full transition-all ${
                      i18n.language.startsWith(lang.code)
                        ? "bg-foreground text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {lang.flag}
                  </button>
                ))}
              </div>

              {/* Nav links */}
              <div className="px-6 py-4 space-y-1 border-b border-border">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.labelKey}
                    to={link.href}
                    onClick={closeMobile}
                    className="block py-2.5 text-sm font-body text-foreground hover:text-terracotta transition-colors"
                  >
                    {t(link.labelKey)}
                  </Link>
                ))}
              </div>

              {/* Categories with accordion */}
              <div className="px-6 py-4">
                <p className="text-[9px] font-display font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  {t("nav.products")}
                </p>

                <Link
                  to="/products"
                  onClick={closeMobile}
                  className="block py-2.5 text-sm font-body text-foreground hover:text-terracotta transition-colors"
                >
                  {t("categories.all")}
                </Link>

                {CATEGORIES.map((cat) => {
                  const label = t(cat.labelKey);
                  return (
                    <div key={cat.labelKey} className="border-b border-border/50 last:border-0">
                      <button
                        onClick={() =>
                          setMobileAccordion(mobileAccordion === cat.labelKey ? null : cat.labelKey)
                        }
                        className="flex items-center justify-between w-full py-2.5 text-sm font-body text-foreground hover:text-terracotta transition-colors"
                      >
                        {label}
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                            mobileAccordion === cat.labelKey ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      <AnimatePresence>
                        {mobileAccordion === cat.labelKey && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="pl-4 pb-2 space-y-0.5">
                              {cat.subcategories.map((sub) => (
                                <Link
                                  key={sub.labelKey}
                                  to={sub.href}
                                  onClick={closeMobile}
                                  className="block py-2 text-xs font-body text-muted-foreground hover:text-terracotta transition-colors"
                                >
                                  {t(sub.labelKey)}
                                </Link>
                              ))}
                              <Link
                                to={cat.href}
                                onClick={closeMobile}
                                className="block py-2 text-xs font-body text-muted-foreground hover:text-terracotta transition-colors"
                              >
                                {t("common.seeAll")}
                              </Link>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Bottom actions */}
              <div className="px-6 py-4 border-t border-border space-y-3">
                <Link
                  to="/account"
                  onClick={closeMobile}
                  className="flex items-center gap-2 py-2 text-sm font-body text-foreground"
                >
                  <User className="h-4 w-4" />
                  {t("nav.myAccount")}
                </Link>
                <Link
                  to="/projects/new"
                  onClick={closeMobile}
                  className="block w-full text-center px-5 py-3 text-sm font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
                >
                  {t("nav.launchProject")}
                </Link>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
