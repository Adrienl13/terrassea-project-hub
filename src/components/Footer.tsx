import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-foreground text-primary-foreground py-16">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-2">
            <h3 className="font-display text-xl font-bold tracking-tight">
              TERRASSEA <span className="text-terracotta">HUB</span>
            </h3>
            <p className="text-sm font-body opacity-60 mt-4 max-w-sm leading-relaxed">
              {t('footer.description')}
            </p>
          </div>
          <div>
            <h4 className="font-display font-semibold text-sm mb-4">{t('footer.platform')}</h4>
            <div className="flex flex-col gap-3">
              <Link to="/" className="text-sm font-body opacity-60 hover:opacity-100 transition-opacity">{t('footer.exploreSpaces')}</Link>
              <Link to="/" className="text-sm font-body opacity-60 hover:opacity-100 transition-opacity">{t('footer.products')}</Link>
              <Link to="/inspirations" className="text-sm font-body opacity-60 hover:opacity-100 transition-opacity">{t('footer.inspirations')}</Link>
              <Link to="/" className="text-sm font-body opacity-60 hover:opacity-100 transition-opacity">{t('footer.launchProject')}</Link>
            </div>
          </div>
          <div>
            <h4 className="font-display font-semibold text-sm mb-4">{t('footer.company')}</h4>
            <div className="flex flex-col gap-3">
              <Link to="/" className="text-sm font-body opacity-60 hover:opacity-100 transition-opacity">{t('footer.about')}</Link>
              <Link to="/become-partner" className="text-sm font-body opacity-60 hover:opacity-100 transition-opacity">{t('footer.becomePartner')}</Link>
              <Link to="/" className="text-sm font-body opacity-60 hover:opacity-100 transition-opacity">{t('footer.contact')}</Link>
              <Link to="/" className="text-sm font-body opacity-60 hover:opacity-100 transition-opacity">{t('footer.privacy')}</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-primary-foreground/10 mt-12 pt-8 text-xs font-body opacity-40">
          {t('footer.copyright')}
        </div>
      </div>
    </footer>
  );
};

export default Footer;