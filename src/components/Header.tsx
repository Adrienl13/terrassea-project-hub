import { useState } from "react";
import { Link } from "react-router-dom";
import { FolderOpen, User, Menu, X, ChevronDown } from "lucide-react";
import { useProjectCart } from "@/contexts/ProjectCartContext";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

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
      { label: "Bistrot chairs", href: "/products?category=chairs&sub=bistrot" },
      { label: "Stackable chairs", href: "/products?category=chairs&sub=stackable" },
      { label: "4-leg chairs", href: "/products?category=chairs&sub=4-leg" },
      { label: "Folding chairs", href: "/products?category=chairs&sub=folding" },
    ],
  },
  {
    labelKey: "categories.armchairs",
    href: "/products?category=armchairs",
    subcategories: [
      { label: "Rope armchairs", href: "/products?category=armchairs&sub=rope" },
      { label: "Teak armchairs", href: "/products?category=armchairs&sub=teak" },
      { label: "Lounge armchairs", href: "/products?category=armchairs&sub=lounge" },
    ],
  },
  {
    labelKey: "categories.tables",
    href: "/products?category=tables",
    subcategories: [
      { label: "Dining tables", href: "/products?category=tables&sub=dining" },
      { label: "Coffee tables", href: "/products?category=tables&sub=coffee" },
      { label: "High tables", href: "/products?category=tables&sub=high" },
      { label: "Folding tables", href: "/products?category=tables&sub=folding" },
      { label: "Table bases", href: "/products?category=tables&sub=base" },
    ],
  },
  {
    labelKey: "categories.parasols",
    href: "/products?category=parasols",
    subcategories: [
      { label: "Centre-pole", href: "/products?category=parasols&sub=centre-pole" },
      { label: "Cantilever", href: "/products?category=parasols&sub=cantilever" },
      { label: "Wall-mounted", href: "/products?category=parasols&sub=wall" },
      { label: "Giant parasols", href: "/products?category=parasols&sub=giant" },
    ],
  },
  {
    labelKey: "categories.sunLoungers",
    href: "/products?category=sun-loungers",
    subcategories: [
      { label: "Pool loungers", href: "/products?category=sun-loungers&sub=pool" },
      { label: "Beach loungers", href: "/products?category=sun-loungers&sub=beach" },
      { label: "Daybeds", href: "/products?category=sun-loungers&sub=daybed" },
    ],
  },
  {
    labelKey: "categories.sofas",
    href: "/products?category=sofas",
    subcategories: [
      { label: "2-seater sofas", href: "/products?category=sofas&sub=2-seater" },
      { label: "3-seater sofas", href: "/products?category=sofas&sub=3-seater" },
      { label: "Modular sofas", href: "/products?category=sofas&sub=modular" },
    ],
  },
  {
    labelKey: "categories.barStools",
    href: "/products?category=bar-stools",
    subcategories: [
      { label: "With footrest", href: "/products?category=bar-stools&sub=footrest" },
      { label: "Adjustable height", href: "/products?category=bar-stools&sub=adjustable" },
      { label: "Stackable stools", href: "/products?category=bar-stools&sub=stackable" },
    ],
  },
  {
    labelKey: "categories.accessories",
    href: "/products?category=accessories",
    subcategories: [
      { label: "Cushions", href: "/products?category=accessories&sub=cushions" },
      { label: "Planters", href: "/products?category=accessories&sub=planters" },
      { label: "Covers & protection", href: "/products?category=accessories&sub=covers" },
      { label: "Parasol bases", href: "/products?category=accessories&sub=bases" },
    ],
  },
];

const NAV_LINKS = [
  { labelKey: "nav.explore", href: "/" },
  { labelKey: "nav.products", href: "/products" },
  { labelKey: "nav.inspirations", href: "/inspirations" },
  { labelKey: "nav.guide", href: "/resources" },
  { labelKey: "nav.partners", href: "/partners" },
  { labelKey: "nav.proService", href: "/pro-service" },
];

const Header = () => {
  const { t, i18n } = useTranslation();
  const { itemCount } = useProjectCart();
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ left: 0, top: 0 });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileAccordion, setMobileAccordion] = useState<string | null>(null);

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
        className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md"
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
            {/* Language selector */}
            <div className="hidden md:flex items-center gap-1 border border-border rounded-full px-2 py-1">
              {LANGS.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => i18n.changeLanguage(lang.code)}
                  className={`text-[10px] font-display font-bold px-1.5 py-0.5 rounded-full transition-all ${
                    i18n.language.startsWith(lang.code)
                      ? "bg-foreground text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {lang.flag}
                </button>
              ))}
            </div>

            <Link
              to="/project-cart"
              className="relative flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground transition-colors"
            >
              <FolderOpen className="h-5 w-5" />
              <span className="hidden sm:inline">{t("nav.myProject")}</span>
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 sm:-right-6 h-5 w-5 rounded-full bg-foreground text-primary-foreground text-xs flex items-center justify-center font-display font-bold">
                  {itemCount}
                </span>
              )}
            </Link>
            <Link
              to="/account"
              className="hidden sm:flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground transition-colors"
            >
              <User className="h-5 w-5" />
              <span className="hidden sm:inline">{t("nav.myAccount")}</span>
            </Link>
            <Link
              to="/projects/new"
              className="hidden sm:inline-flex px-5 py-2.5 text-sm font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
            >
              {t("nav.launchProject")}
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
        <div className="hidden md:block bg-[#2C2C2A] border-t border-white/5 relative z-50">
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
            className="hidden md:block fixed bg-[#2C2C2A] border border-white/10 rounded-xl shadow-lg py-3 min-w-[200px] z-[60]"
            style={{ left: dropdownPos.left, top: dropdownPos.top }}
            onMouseEnter={() => setOpenCat(openCat)}
            onMouseLeave={() => setOpenCat(null)}
          >
            <p className="text-[9px] font-display font-bold uppercase tracking-widest text-white/40 px-4 mb-2">
              {t(openCat)}
            </p>
            {CATEGORIES.find((c) => c.labelKey === openCat)?.subcategories.map((sub) => (
              <Link
                key={sub.label}
                to={sub.href}
                onClick={() => setOpenCat(null)}
                className="block px-4 py-2 text-sm font-body text-white/60 hover:bg-white/5 hover:text-terracotta transition-colors"
              >
                {sub.label}
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
                                  key={sub.label}
                                  to={sub.href}
                                  onClick={closeMobile}
                                  className="block py-2 text-xs font-body text-muted-foreground hover:text-terracotta transition-colors"
                                >
                                  {sub.label}
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
