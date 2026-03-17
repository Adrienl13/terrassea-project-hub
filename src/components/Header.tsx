import { Link } from "react-router-dom";
import { FolderOpen, User } from "lucide-react";
import { useProjectCart } from "@/contexts/ProjectCartContext";
import { motion } from "framer-motion";

const Header = () => {
  const { itemCount } = useProjectCart();

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md"
    >
      <div className="container mx-auto flex items-center justify-between py-5 px-6">
        <Link to="/" className="font-display text-xl font-bold tracking-tight text-foreground">
          TERRASSEA<span className="font-light ml-1 text-muted-foreground">HUB</span>
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
          <Link to="/partners" className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors">
            Partners
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
    </motion.header>
  );
};

export default Header;
