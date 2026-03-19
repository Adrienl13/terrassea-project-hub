import { useState } from "react";
import { Link } from "react-router-dom";
import { FolderOpen, User } from "lucide-react";
import { useProjectCart } from "@/contexts/ProjectCartContext";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORIES = [
  {
    label: "Chairs",
    href: "/products?category=chairs",
    subcategories: [
      { label: "Bistrot chairs", href: "/products?category=chairs&sub=bistrot" },
      { label: "Stackable chairs", href: "/products?category=chairs&sub=stackable" },
      { label: "4-leg chairs", href: "/products?category=chairs&sub=4-leg" },
      { label: "Folding chairs", href: "/products?category=chairs&sub=folding" },
      { label: "See all chairs →", href: "/products?category=chairs" },
    ],
  },
  {
    label: "Armchairs",
    href: "/products?category=armchairs",
    subcategories: [
      { label: "Rope armchairs", href: "/products?category=armchairs&sub=rope" },
      { label: "Teak armchairs", href: "/products?category=armchairs&sub=teak" },
      { label: "Lounge armchairs", href: "/products?category=armchairs&sub=lounge" },
      { label: "See all →", href: "/products?category=armchairs" },
    ],
  },
  {
    label: "Tables",
    href: "/products?category=tables",
    subcategories: [
      { label: "Dining tables", href: "/products?category=tables&sub=dining" },
      { label: "Coffee tables", href: "/products?category=tables&sub=coffee" },
      { label: "High tables", href: "/products?category=tables&sub=high" },
      { label: "Folding tables", href: "/products?category=tables&sub=folding" },
      { label: "Table bases", href: "/products?category=tables&sub=base" },
      { label: "See all →", href: "/products?category=tables" },
    ],
  },
  {
    label: "Parasols",
    href: "/products?category=parasols",
    subcategories: [
      { label: "Centre-pole", href: "/products?category=parasols&sub=centre-pole" },
      { label: "Cantilever", href: "/products?category=parasols&sub=cantilever" },
      { label: "Wall-mounted", href: "/products?category=parasols&sub=wall" },
      { label: "Giant parasols", href: "/products?category=parasols&sub=giant" },
      { label: "See all →", href: "/products?category=parasols" },
    ],
  },
  {
    label: "Sun Loungers",
    href: "/products?category=sun-loungers",
    subcategories: [
      { label: "Pool loungers", href: "/products?category=sun-loungers&sub=pool" },
      { label: "Beach loungers", href: "/products?category=sun-loungers&sub=beach" },
      { label: "Daybeds", href: "/products?category=sun-loungers&sub=daybed" },
      { label: "See all →", href: "/products?category=sun-loungers" },
    ],
  },
  {
    label: "Sofas",
    href: "/products?category=sofas",
    subcategories: [
      { label: "2-seater sofas", href: "/products?category=sofas&sub=2-seater" },
      { label: "3-seater sofas", href: "/products?category=sofas&sub=3-seater" },
      { label: "Modular sofas", href: "/products?category=sofas&sub=modular" },
      { label: "See all →", href: "/products?category=sofas" },
    ],
  },
  {
    label: "Bar Stools",
    href: "/products?category=bar-stools",
    subcategories: [
      { label: "With footrest", href: "/products?category=bar-stools&sub=footrest" },
      { label: "Adjustable height", href: "/products?category=bar-stools&sub=adjustable" },
      { label: "Stackable stools", href: "/products?category=bar-stools&sub=stackable" },
      { label: "See all →", href: "/products?category=bar-stools" },
    ],
  },
  {
    label: "Accessories",
    href: "/products?category=accessories",
    subcategories: [
      { label: "Cushions", href: "/products?category=accessories&sub=cushions" },
      { label: "Planters", href: "/products?category=accessories&sub=planters" },
      { label: "Covers & protection", href: "/products?category=accessories&sub=covers" },
      { label: "Parasol bases", href: "/products?category=accessories&sub=bases" },
      { label: "See all →", href: "/products?category=accessories" },
    ],
  },
];

const Header = () => {
  const { itemCount } = useProjectCart();
  const [openCat, setOpenCat] = useState<string | null>(null);

  return (
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
          <Link to="/" className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors">
            Explore
          </Link>
          <Link to="/products" className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors">
            Products
          </Link>
          <Link to="/inspirations" className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors">
            Inspirations
          </Link>
          <Link to="/resources" className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors">
            Guide
          </Link>
          <Link to="/partners" className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors">
            Partners
          </Link>
          <Link to="/pro-service" className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors">
            Pro Service
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            to="/project-cart"
            className="relative flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground transition-colors"
          >
            <FolderOpen className="h-5 w-5" />
            <span className="hidden sm:inline">My Project</span>
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 sm:-right-6 h-5 w-5 rounded-full bg-foreground text-primary-foreground text-xs flex items-center justify-center font-display font-bold">
                {itemCount}
              </span>
            )}
          </Link>
          <Link
            to="/account"
            className="flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground transition-colors"
          >
            <User className="h-5 w-5" />
            <span className="hidden sm:inline">My Account</span>
          </Link>
          <Link
            to="/projects/new"
            className="hidden sm:inline-flex px-5 py-2.5 text-sm font-display font-semibold bg-foreground text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
          >
            Launch my project
          </Link>
        </div>
      </div>

      {/* Category nav bar */}
      <div
        className="bg-[#2C2C2A] border-t border-white/5 relative"
        onMouseLeave={() => setOpenCat(null)}
      >
        <div className="container mx-auto px-6 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-7 py-2.5 min-w-max">
            <Link
              to="/products"
              className="text-[11px] font-display font-semibold text-white/60 hover:text-white transition-colors whitespace-nowrap py-0.5 border-b-2 border-transparent hover:border-terracotta"
              onMouseEnter={() => setOpenCat(null)}
            >
              All
            </Link>

            {CATEGORIES.map((cat) => (
              <div
                key={cat.label}
                className="relative"
                onMouseEnter={() => setOpenCat(cat.label)}
              >
                <Link
                  to={cat.href}
                  className={`text-[11px] font-display font-semibold transition-colors whitespace-nowrap py-0.5 border-b-2 ${
                    openCat === cat.label
                      ? "text-white border-terracotta"
                      : "text-white/60 border-transparent hover:text-white hover:border-terracotta"
                  }`}
                >
                  {cat.label}
                </Link>
              </div>
            ))}

            <div className="w-px h-4 bg-white/10 mx-1" />
            <span className="text-[11px] font-display font-semibold text-white/25 whitespace-nowrap cursor-default">
              Indoor — soon ✦
            </span>
          </div>
        </div>

        {/* Dropdown */}
        <AnimatePresence>
          {openCat && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 bg-[#2C2C2A] border-t border-white/5 shadow-lg z-50"
            >
              <div className="container mx-auto px-6 py-4">
                <div className="flex flex-wrap gap-x-8 gap-y-2">
                  {CATEGORIES.find((c) => c.label === openCat)?.subcategories.map((sub) => (
                    <Link
                      key={sub.label}
                      to={sub.href}
                      onClick={() => setOpenCat(null)}
                      className="text-xs font-body text-white/50 hover:text-white transition-colors whitespace-nowrap py-1"
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
};

export default Header;
