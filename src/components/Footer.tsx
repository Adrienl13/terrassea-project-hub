import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-foreground text-primary-foreground py-16">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-2">
            <h3 className="font-display text-xl font-bold tracking-tight">
              TERRASSEA<span className="font-light ml-1 opacity-50">HUB</span>
            </h3>
            <p className="text-sm font-body opacity-60 mt-4 max-w-sm leading-relaxed">
              The European hospitality project platform. Design your outdoor space, discover premium furniture solutions, and connect with sourcing partners.
            </p>
          </div>
          <div>
            <h4 className="font-display font-semibold text-sm mb-4">Platform</h4>
            <div className="flex flex-col gap-3">
              <Link to="/" className="text-sm font-body opacity-60 hover:opacity-100 transition-opacity">Explore Spaces</Link>
              <Link to="/" className="text-sm font-body opacity-60 hover:opacity-100 transition-opacity">Products</Link>
              <Link to="/inspirations" className="text-sm font-body opacity-60 hover:opacity-100 transition-opacity">Inspirations</Link>
              <Link to="/" className="text-sm font-body opacity-60 hover:opacity-100 transition-opacity">Launch a Project</Link>
            </div>
          </div>
          <div>
            <h4 className="font-display font-semibold text-sm mb-4">Company</h4>
            <div className="flex flex-col gap-3">
              <Link to="/" className="text-sm font-body opacity-60 hover:opacity-100 transition-opacity">About Terrassea</Link>
              <Link to="/become-partner" className="text-sm font-body opacity-60 hover:opacity-100 transition-opacity">Become a Partner</Link>
              <Link to="/" className="text-sm font-body opacity-60 hover:opacity-100 transition-opacity">Contact</Link>
              <Link to="/" className="text-sm font-body opacity-60 hover:opacity-100 transition-opacity">Privacy Policy</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-primary-foreground/10 mt-12 pt-8 text-xs font-body opacity-40">
          © 2026 Terrassea HUB. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
